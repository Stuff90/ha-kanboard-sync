# Kanboard Full-Screen Custom Card

A powerful, full-featured Kanban board custom card for Home Assistant with drag-and-drop functionality and task creation dialog.

## ✨ Features

- **🎯 Configurable Sensor** - Choose any Kanboard project sensor (e.g., `sensor.kanboard_project_house`)
- **📋 Dynamic Columns** - Automatically detects columns from your Kanboard data, or use custom configuration
- **🖱️ Drag & Drop** - Drag tasks between columns with visual feedback
- **➕ Create Tasks** - Built-in dialog for creating new tasks with full form
- **👥 User Assignment** - Select assignees from your Kanboard users
- **📱 Full-Screen Optimized** - Beautiful layout designed for full-screen dashboards
- **🎨 Theme Support** - Automatically adapts to your Home Assistant theme
- **⚡ Real-time Updates** - Works seamlessly with Home Assistant's state management

## 🚀 Installation

### Step 1: Copy the Card

```bash
# From the integration directory
cd /Users/nx75kh/Developer/ha-dev/config/custom_components/kanboard_sync

# Copy to www directory
cp cards/kanboard-card.js ../../www/kanboard-card.js
```

### Step 2: Register the Resource

#### Option A: Via UI (Easiest)
1. Go to **Settings** → **Dashboards**
2. Click the **⋮** menu (top right)
3. Click **Resources**
4. Click **Add Resource**
5. Enter:
   - **URL:** `/local/kanboard-card.js`
   - **Type:** JavaScript Module
6. Click **Create**

#### Option B: Via configuration.yaml
```yaml
lovelace:
  mode: yaml
  resources:
    - url: /local/kanboard-card.js
      type: module
```

### Step 3: Add to Dashboard

#### Full-Screen Panel (Recommended)
```yaml
views:
  - title: Kanban
    path: kanban
    type: panel  # Full-screen mode
    icon: mdi:view-column
    cards:
      - type: custom:kanboard-card
        entity: sensor.kanboard_project_house
```

#### Regular Card
```yaml
views:
  - title: Home
    cards:
      - type: custom:kanboard-card
        entity: sensor.kanboard_project_house
```

## ⚙️ Configuration Options

### Basic Configuration

```yaml
type: custom:kanboard-card
entity: sensor.kanboard_project_house  # Required
```

### Full Configuration

```yaml
type: custom:kanboard-card
entity: sensor.kanboard_project_house  # Required: Your Kanboard project sensor
show_create_button: true                # Optional: Show the + Create button (default: true)
columns:                                # Optional: Custom column config (auto-detected if omitted)
  - id: 1
    name: "📋 Backlog"
    color: "#9E9E9E"
  - id: 2
    name: "🎯 Ready"
    color: "#2196F3"
  - id: 3
    name: "⚡ In Progress"
    color: "#FF9800"
  - id: 4
    name: "✅ Done"
    color: "#4CAF50"
  - id: 5
    name: "🧪 Testing"
    color: "#9C27B0"
```

### Configuration Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `entity` | string | Yes | - | Kanboard project sensor entity ID |
| `show_create_button` | boolean | No | `true` | Show/hide the create task button |
| `columns` | array | No | Auto-detected | Custom column configuration |
| `columns[].id` | string/number | No | - | Column ID from Kanboard |
| `columns[].name` | string | No | - | Display name for the column |
| `columns[].color` | string | No | - | Header color (hex code) |

## 📖 Usage Examples

### Example 1: House Project

```yaml
type: custom:kanboard-card
entity: sensor.kanboard_project_house
```

Auto-detects columns from the sensor data!

### Example 2: Work Project with Custom Columns

```yaml
type: custom:kanboard-card
entity: sensor.kanboard_project_work
columns:
  - id: 1
    name: "Inbox"
    color: "#607D8B"
  - id: 2
    name: "This Week"
    color: "#2196F3"
  - id: 3
    name: "In Progress"
    color: "#FF9800"
  - id: 4
    name: "Review"
    color: "#9C27B0"
  - id: 5
    name: "Done"
    color: "#4CAF50"
```

### Example 3: Simple View Without Create Button

```yaml
type: custom:kanboard-card
entity: sensor.kanboard_project_simple
show_create_button: false
```

### Example 4: Multiple Projects in Tabs

```yaml
views:
  - title: Projects
    path: projects
    type: panel
    subview: false
    cards:
      - type: custom:tabbed-card
        tabs:
          - label: House
            card:
              type: custom:kanboard-card
              entity: sensor.kanboard_project_house
          
          - label: Work
            card:
              type: custom:kanboard-card
              entity: sensor.kanboard_project_work
          
          - label: Personal
            card:
              type: custom:kanboard-card
              entity: sensor.kanboard_project_personal
```

## 🎨 Features in Detail

### 1. Dynamic Column Detection

If you don't specify columns in the config, the card automatically:
- Detects all columns from your Kanboard tasks
- Orders them by column ID
- Assigns colors automatically
- Uses column names from Kanboard

### 2. Drag and Drop

To move a task:
1. Click and hold on any task card
2. Drag it to the target column
3. Release to drop
4. The task is instantly moved in Kanboard
5. A notification confirms the move

**Visual Feedback:**
- Task scales up and rotates slightly while dragging
- Target column highlights when you hover over it
- Smooth animations throughout

### 3. Create Task Dialog

Click the **+ Create Task** button to open a beautiful dialog:

**Fields:**
- **Title** (required) - Task name
- **Description** (optional) - Detailed task description
- **Column** (required) - Which column to create in
- **Assign To** (optional) - Select from available users

**Features:**
- Auto-populated with all your Kanboard users
- Form validation (title and column required)
- Cancel or Create buttons
- Close by clicking outside or the X button
- Success notification after creation

### 4. Task Display

Each task card shows:
- **Task ID** - Small badge with #number
- **Title** - Bold, prominent text
- **Assignee** - User icon + name (if assigned)
- **Due Date** - Calendar icon + date (if set)

### 5. Full-Screen Optimization

When used in panel mode:
- Takes full width and height of the viewport
- Columns are scrollable horizontally
- Task lists scroll vertically within each column
- Perfect for dedicated Kanban dashboard displays

## 🎨 Customization

### Custom Colors

Choose your own column colors:

```yaml
columns:
  - id: 1
    name: "Todo"
    color: "#E91E63"  # Pink
  - id: 2
    name: "Doing"
    color: "#00BCD4"  # Cyan
  - id: 3
    name: "Done"
    color: "#8BC34A"  # Light Green
```

### Column Names with Emojis

```yaml
columns:
  - id: 1
    name: "📥 Inbox"
    color: "#9E9E9E"
  - id: 2
    name: "🚀 Sprint"
    color: "#2196F3"
  - id: 3
    name: "⚡ Doing"
    color: "#FF9800"
  - id: 4
    name: "✅ Done"
    color: "#4CAF50"
```

## 🐛 Troubleshooting

### Card Not Showing

1. **Check resource is loaded:**
   - Developer Tools → ⋮ → Resources
   - Verify `/local/kanboard-card.js` is listed

2. **Check file exists:**
   ```bash
   ls /Users/nx75kh/Developer/ha-dev/config/www/kanboard-card.js
   ```

3. **Check console for errors:**
   - Press F12 in your browser
   - Look for JavaScript errors

### "Entity not found"

- Verify the entity ID is correct
- Check in Developer Tools → States
- Make sure the integration is running

### Columns Not Showing

- Check that your sensor has `tasks` attribute
- Verify tasks have `column_id` and `column_name` fields
- Try specifying columns manually in config

### Drag & Drop Not Working

- Make sure you're using a modern browser (Chrome, Firefox, Safari, Edge)
- Check that the sensor has `project_id` attribute
- Verify the `kanboard_sync.move_task` service exists

### Create Button Not Working

- Verify `sensor.kanboard_users` entity exists
- Check that the `kanboard_sync.create_task` service exists
- Check browser console for JavaScript errors

### Tasks Not Updating

The card refreshes when Home Assistant updates the sensor:
1. Integration polls every 30 seconds by default
2. After creating/moving, it triggers an immediate refresh
3. You can manually refresh from Developer Tools → Actions

## 💡 Tips & Best Practices

### 1. Use Panel Mode

For the best experience, use `type: panel`:
```yaml
views:
  - type: panel
    cards:
      - type: custom:kanboard-card
        entity: sensor.kanboard_project_house
```

### 2. Hide Sidebar

For even more space:
```yaml
views:
  - type: panel
    sidebar:
      hidden: true
    cards:
      - type: custom:kanboard-card
        entity: sensor.kanboard_project_house
```

### 3. Dedicated Dashboard

Create a dedicated Kanban dashboard:
```yaml
# dashboards/kanban.yaml
title: Kanban
views:
  - title: Projects
    path: home
    type: panel
    cards:
      - type: custom:kanboard-card
        entity: sensor.kanboard_project_house
```

### 4. Mobile Optimization

The card works great on mobile:
- Swipe to scroll columns horizontally
- Tap to select column in create dialog
- Long-press and drag to move tasks

### 5. Multiple Instances

You can have multiple cards on different days/views:
```yaml
views:
  - title: House
    cards:
      - type: custom:kanboard-card
        entity: sensor.kanboard_project_house
  
  - title: Work
    cards:
      - type: custom:kanboard-card
        entity: sensor.kanboard_project_work
```

## 🔗 Integration with Automations

### Create Task from Automation

```yaml
automation:
  - alias: "Create task when door left open"
    trigger:
      - platform: state
        entity_id: binary_sensor.front_door
        to: "on"
        for: "00:30:00"
    action:
      - service: kanboard_sync.create_task
        data:
          title: "Close front door"
          project_id: 1
          column_id: 1
          description: "Door has been open for 30 minutes"
```

### Move Task Based on Condition

```yaml
automation:
  - alias: "Move task on completion"
    trigger:
      - platform: state
        entity_id: input_boolean.task_complete
        to: "on"
    action:
      - service: kanboard_sync.move_task
        data:
          task_id: "{{ states('input_number.current_task_id') | int }}"
          project_id: 1
          column_id: 4
```

## 📊 Performance

- **Lightweight** - Pure JavaScript, no heavy dependencies
- **Fast** - Efficient DOM updates
- **Responsive** - Smooth drag-and-drop animations
- **Scalable** - Handles hundreds of tasks without lag

## 🆕 Future Enhancements

Potential features for future versions:
- [ ] Task editing dialog
- [ ] Filtering by assignee
- [ ] Search functionality
- [ ] Task details popup
- [ ] Bulk operations
- [ ] Export to CSV
- [ ] Keyboard shortcuts
- [ ] Task templates

## 📄 License

Part of the Kanboard Home Assistant integration.

---

## 🎉 Enjoy Your Kanban Board!

You now have a powerful, full-featured Kanban board right in Home Assistant!

For issues or questions, check the main integration documentation in the parent directory.

