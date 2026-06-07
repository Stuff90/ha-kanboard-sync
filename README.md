# Kanboard Integration for Home Assistant

A custom integration that connects Home Assistant with Kanboard, providing real-time task tracking and a beautiful full-screen Kanban board.

## 🎯 Features

### Integration
- ✅ **Project Sensors** - Real-time task tracking per project
- ✅ **User Sensor** - All Kanboard users available
- ✅ **Column Detection** - Automatic column discovery from Kanboard
- ✅ **Task Actions** - Create and move tasks via services
- ✅ **Auto-refresh** - Updates every 30 seconds

### Custom Kanban Card
- 🎨 **Full-screen Optimized** - Beautiful panel-mode dashboard
- 🖱️ **Drag & Drop** - Move tasks between columns
- ➕ **Create Tasks** - Dialog with form validation
- 👥 **User Assignment** - Select assignees from Kanboard
- 🔄 **Auto-columns** - No configuration needed
- 📱 **Mobile Friendly** - Works on all devices

## 📦 Installation

### Via HACS (recommended)

1. Open **HACS** → **Integrations**
2. Click the **⋮** menu (top right) → **Custom repositories**
3. Add `https://github.com/Stuff90/ha-kanboard-sync` — category **Integration**
4. Search for "Kanboard" and click **Install**
5. **Restart Home Assistant**
6. Go to **Settings** → **Devices & Services** → **+ Add Integration**
7. Search for "**Kanboard Tasks Sync**" and follow the setup wizard

The custom Kanban card will be **automatically available** after installation!

### Manual Installation

If you prefer manual installation:

1. Copy the integration to `config/custom_components/kanboard_sync/`
2. Restart Home Assistant
3. Go to **Settings** → **Devices & Services** → **+ Add Integration**
4. Search for "Kanboard Tasks Sync" and configure

## 🎮 Usage

### Available Sensors

After setup, you'll have:
- `sensor.kanboard_project_<id>` - One per project
- `sensor.kanboard_users` - All users

Each project sensor includes:
- **State**: Number of active tasks
- **Attributes**:
  - `project_id` - Kanboard project ID
  - `name` - Project name
  - `description` - Project description
  - `columns` - All project columns (id, title, position)
  - `tasks` - All active tasks

### Available Services

#### `kanboard_sync.create_task`

Create a new task in Kanboard.

```yaml
service: kanboard_sync.create_task
data:
  title: "Task title"
  project_id: 1
  column_id: 2
  description: "Optional description"
  username: "john.doe"  # or owner_id: 5
```

#### `kanboard_sync.move_task`

Move a task to a different column.

```yaml
service: kanboard_sync.move_task
data:
  task_id: 42
  project_id: 1
  column_id: 3
```

### Custom Card Configuration

The custom Kanban card is **automatically registered** after installation. Simply add it to your dashboard!

**Minimal (auto-detects everything):**
```yaml
type: custom:kanboard-card
entity: sensor.kanboard_project_house
```

**With options:**
```yaml
type: custom:kanboard-card
entity: sensor.kanboard_project_work
show_create_button: true  # default
columns:  # optional, overrides sensor columns
  - id: 1
    name: "📋 Backlog"
    color: "#9E9E9E"
  - id: 2
    name: "🎯 Ready"
    color: "#2196F3"
  - id: 3
    name: "⚡ Doing"
    color: "#FF9800"
  - id: 4
    name: "✅ Done"
    color: "#4CAF50"
```

## 📚 Documentation

- **[Custom Card README](cards/README.md)** - Complete card documentation
- **[Custom Card Quick Start](cards/QUICK_START.md)** - Installation guide
- **[Usage Examples](USAGE_EXAMPLES.md)** - Integration examples
- **[Changelog](CHANGELOG.md)** - Version history
- **[Columns Implementation](COLUMNS_IMPLEMENTED.md)** - Column detection details

## 🔧 Configuration Options

### Integration Config

Configured via UI:
- **URL** - Your Kanboard instance URL
- **API Token** - Kanboard API token (from user settings)

### Card Config

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `entity` | string | **required** | Kanboard project sensor |
| `show_create_button` | boolean | `true` | Show/hide + button |
| `columns` | array | Auto-detect | Custom column config |

## 🎨 Features in Detail

### Automatic Column Detection

The integration fetches columns from Kanboard API:
1. Columns stored in sensor attributes
2. Card reads from sensor (no config needed!)
3. Falls back to manual config if specified
4. Fall back to task-based detection if needed

**Column priority:**
1. Sensor columns (from Kanboard)
2. Manual config (from card YAML)
3. Auto-detect (from tasks)

### Drag & Drop

- **Click and drag** any task card
- **Drop** on target column
- **Instant update** in Kanboard
- **Visual feedback** during drag
- **Notifications** on success/error

### Create Tasks

- **Click + button** to open dialog
- **Fill form**: title, description, column, assignee
- **Validation**: Required fields enforced
- **User dropdown**: Populated from `sensor.kanboard_users`
- **Success notification** after creation

## 🚀 Automations

### Create Task from Automation

```yaml
automation:
  - alias: "Create task on door left open"
    trigger:
      - platform: state
        entity_id: binary_sensor.door
        to: "on"
        for: "00:30:00"
    action:
      - service: kanboard_sync.create_task
        data:
          title: "Close the door"
          project_id: 1
          column_id: 1
```

### Move Task Based on Condition

```yaml
automation:
  - alias: "Move task when complete"
    trigger:
      - platform: state
        entity_id: input_boolean.task_done
        to: "on"
    action:
      - service: kanboard_sync.move_task
        data:
          task_id: "{{ states('input_number.current_task') | int }}"
          project_id: 1
          column_id: 4
```

## 🐛 Troubleshooting

### Integration Not Loading

1. Check Kanboard URL is accessible
2. Verify API token is correct
3. Check logs: Settings → System → Logs
4. Look for "kanboard_sync" entries

### Columns Not Showing

1. Restart Home Assistant after setup
2. Check sensor attributes have `columns` array
3. Verify Kanboard API version (needs v1.0.29+)
4. Check browser console for card errors

### Card Not Appearing

1. Verify resource is registered
2. Check `/local/kanboard-card.js` exists in www/
3. Hard refresh browser (Ctrl+F5 or Cmd+Shift+R)
4. Check browser console (F12) for errors

### Tasks Not Updating

- Integration polls every 30 seconds
- Manual refresh: Developer Tools → Actions → `homeassistant.update_entity`
- Check Kanboard API is accessible

## 📋 Requirements

- Home Assistant 2023.x or newer
- Kanboard v1.0.29 or newer
- Modern browser (for custom card)
- Network access to Kanboard instance

## 🔒 Security

- API token stored encrypted in HA config
- No credentials in frontend
- HTTPS recommended for Kanboard
- API token needs minimal permissions:
  - Read projects
  - Read/write tasks
  - Read columns
  - Read users

## 🎯 Roadmap

Future enhancements:
- [ ] Task editing
- [ ] Task filtering
- [ ] Search functionality
- [ ] Bulk operations
- [ ] Task comments
- [ ] Subtasks support
- [ ] Time tracking

## 🤝 Contributing

This is a custom integration. Feel free to fork and modify!

## 📄 License

MIT License

## 🙏 Acknowledgments

- Built for Home Assistant
- Integrates with Kanboard
- Uses Home Assistant's beautiful UI components

---

**Enjoy your Kanban board in Home Assistant!** 🎉

For detailed card documentation, see [cards/README.md](cards/README.md)

