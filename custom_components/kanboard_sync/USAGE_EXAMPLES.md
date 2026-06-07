# Kanboard Integration - Usage Examples

## Accessing Users from the Sensor

The integration now provides a `sensor.kanboard_users` entity that contains all Kanboard users.

### View Users in Developer Tools

1. Go to Developer Tools → States
2. Find `sensor.kanboard_users`
3. The state shows the total number of users
4. The attributes contain:
   - `users`: Full list of user objects
   - `user_options`: Formatted list with labels and values for easy use in dropdowns

### Example User Data Structure

```yaml
users:
  - id: "1"
    username: "admin"
    name: "Administrator"
    email: "admin@example.com"
    is_active: "1"
  - id: "2"
    username: "john.doe"
    name: "John Doe"
    email: "john@example.com"
    is_active: "1"

user_options:
  - label: "Administrator"
    value: 1
  - label: "John Doe"
    value: 2
```

## Creating Tasks with Assignee

### Method 1: Using User ID (owner_id)

```yaml
service: kanboard_sync.create_task
data:
  title: "Fix critical bug"
  project_id: 1
  column_id: 2
  description: "This needs immediate attention"
  owner_id: 5  # User ID from sensor.kanboard_users
```

### Method 2: Using Username

```yaml
service: kanboard_sync.create_task
data:
  title: "Fix critical bug"
  project_id: 1
  column_id: 2
  description: "This needs immediate attention"
  username: "john.doe"  # Username from sensor.kanboard_users
```

## Using in Automations

### Example: Create task and assign to specific user

```yaml
automation:
  - alias: "Create Kanboard Task on Button Press"
    trigger:
      - platform: state
        entity_id: input_button.create_task
    action:
      - service: kanboard_sync.create_task
        data:
          title: "New Task from Automation"
          project_id: 1
          column_id: 1
          description: "Automatically created task"
          username: "admin"
```

### Example: Assign task based on input_select

```yaml
automation:
  - alias: "Create Task with Selected User"
    trigger:
      - platform: state
        entity_id: input_button.create_task
    action:
      - service: kanboard_sync.create_task
        data:
          title: "{{ states('input_text.task_title') }}"
          project_id: 1
          column_id: 1
          username: "{{ states('input_select.assignee') }}"
```

## Using in Custom Cards (JavaScript)

### Get users from the sensor

```javascript
// In your custom card JavaScript
const usersSensor = this.hass.states['sensor.kanboard_users'];
const users = usersSensor.attributes.users;
const userOptions = usersSensor.attributes.user_options;

// Create a dropdown
const select = document.createElement('select');
userOptions.forEach(option => {
  const opt = document.createElement('option');
  opt.value = option.value;
  opt.textContent = option.label;
  select.appendChild(opt);
});

// Create task with selected user
const selectedUserId = select.value;
this.hass.callService('kanboard_sync', 'create_task', {
  title: 'New Task',
  project_id: 1,
  column_id: 2,
  owner_id: parseInt(selectedUserId)
});
```

### Alternative: Use username directly

```javascript
const selectedUsername = 'john.doe';
this.hass.callService('kanboard_sync', 'create_task', {
  title: 'New Task',
  project_id: 1,
  column_id: 2,
  username: selectedUsername
});
```

## Template Sensors

### Create a helper sensor to list all active users

```yaml
template:
  - sensor:
      - name: "Active Kanboard Users"
        state: "{{ state_attr('sensor.kanboard_users', 'users') | selectattr('is_active', 'eq', '1') | list | count }}"
        attributes:
          active_users: >
            {% set users = state_attr('sensor.kanboard_users', 'users') %}
            {% if users %}
              {{ users | selectattr('is_active', 'eq', '1') | map(attribute='username') | list }}
            {% else %}
              []
            {% endif %}
```

## Input Select Helper

### Create an input_select with all Kanboard users

```yaml
# Add to configuration.yaml or input_select.yaml
input_select:
  kanboard_assignee:
    name: "Assign Task To"
    options:
      - "Unassigned"
    icon: mdi:account
```

### Automation to update input_select when users change

```yaml
automation:
  - alias: "Update Kanboard Assignee Options"
    trigger:
      - platform: state
        entity_id: sensor.kanboard_users
    action:
      - service: input_select.set_options
        target:
          entity_id: input_select.kanboard_assignee
        data:
          options: >
            {% set users = state_attr('sensor.kanboard_users', 'user_options') %}
            {% if users %}
              {{ ['Unassigned'] + users | map(attribute='label') | list }}
            {% else %}
              ['Unassigned']
            {% endif %}
```

Now you can use `input_select.kanboard_assignee` in your UI and reference it in automations!

