# 🚀 Kanboard Custom Card - Quick Start

## Installation (3 Steps)

### 1. Copy the Card
```bash
cp cards/kanboard-card.js ../../www/kanboard-card.js
```

### 2. Add Resource in Home Assistant UI
1. Go to **Settings** → **Dashboards** → **⋮** → **Resources**
2. Click **Add Resource**
3. URL: `/local/kanboard-card.js`
4. Type: **JavaScript Module**
5. Click **Create**

### 3. Add to Dashboard

Create a new view with panel type:

```yaml
views:
  - title: Kanban
    path: kanban
    type: panel
    icon: mdi:view-column
    cards:
      - type: custom:kanboard-card
        entity: sensor.kanboard_project_1  # Change to your sensor
```

Or via UI:
1. Dashboard → Add View
2. View Type: **Panel**
3. Add Card → Manual
4. Copy the YAML above

---

## Basic Usage

### Minimal Configuration
```yaml
type: custom:kanboard-card
entity: sensor.kanboard_project_house
```

That's it! Columns auto-detected!

### With Custom Columns
```yaml
type: custom:kanboard-card
entity: sensor.kanboard_project_work
columns:
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

---

## Features

### ✅ What You Get

- **Drag & Drop** - Move tasks between columns
- **Create Tasks** - Click + button for dialog
- **Auto-detect Columns** - No config needed
- **User Assignment** - Select from Kanboard users
- **Visual Feedback** - Smooth animations
- **Theme Support** - Matches your HA theme
- **Full-Screen** - Perfect for panel mode

### 🖱️ How to Use

**Move a Task:**
1. Drag task card
2. Drop on target column
3. Done! (notification shown)

**Create a Task:**
1. Click **+ Create Task** button
2. Fill in title (required)
3. Select column (required)
4. Add description (optional)
5. Assign to user (optional)
6. Click **Create Task**

---

## Examples

### Example 1: Single Project Full-Screen
```yaml
title: Kanban
views:
  - title: House Projects
    type: panel
    cards:
      - type: custom:kanboard-card
        entity: sensor.kanboard_project_house
```

### Example 2: Multiple Projects with Tabs
```yaml
views:
  - title: All Projects
    type: panel
    cards:
      - type: vertical-stack
        cards:
          # Project selector buttons
          - type: horizontal-stack
            cards:
              - type: button
                name: House
                tap_action:
                  action: navigate
                  navigation_path: /kanban/house
              - type: button
                name: Work
                tap_action:
                  action: navigate
                  navigation_path: /kanban/work
  
  - title: House
    path: house
    type: panel
    cards:
      - type: custom:kanboard-card
        entity: sensor.kanboard_project_house
  
  - title: Work
    path: work
    type: panel
    cards:
      - type: custom:kanboard-card
        entity: sensor.kanboard_project_work
```

### Example 3: Hide Create Button
```yaml
type: custom:kanboard-card
entity: sensor.kanboard_project_readonly
show_create_button: false
```

---

## Troubleshooting

### Card Not Appearing?

**Check 1:** Resource loaded?
- Settings → Dashboards → ⋮ → Resources
- Look for `/local/kanboard-card.js`

**Check 2:** File exists?
```bash
ls /Users/nx75kh/Developer/ha-dev/config/www/kanboard-card.js
```

**Check 3:** Browser console?
- Press F12
- Look for errors in Console tab

### "Entity not found"?

- Check entity ID exists: Developer Tools → States
- Search for your sensor (e.g., `sensor.kanboard_project_1`)
- Update the `entity:` field to match

### Columns empty?

- Verify sensor has `tasks` attribute
- Check tasks have `column_id` field
- Try adding manual `columns:` config

### Can't drag tasks?

- Use modern browser (Chrome/Firefox/Edge)
- Check sensor has `project_id` attribute
- Verify `kanboard_sync.move_task` service exists

---

## Tips

### 💡 Full-Screen Best Practices

1. **Use panel mode:**
   ```yaml
   type: panel
   ```

2. **Hide sidebar for more space:**
   ```yaml
   views:
     - type: panel
       sidebar:
         hidden: true
   ```

3. **Add as default view:**
   - Settings → Dashboards
   - Set Kanban as default

### 💡 Mobile Optimization

- **Swipe** horizontally to see all columns
- **Long-press** to start drag
- **Tap** + button to create task
- Works great on tablets!

### 💡 Performance

- Card is lightweight and fast
- Handles 100+ tasks smoothly
- Auto-refreshes with sensor updates
- No polling overhead

---

## Next Steps

1. ✅ Install the card (steps above)
2. ✅ Add to a panel view
3. ✅ Try drag & drop
4. ✅ Create a task with + button
5. ✅ Customize columns (optional)
6. ✅ Share your feedback!

---

## Full Documentation

See `README.md` in this directory for:
- Complete configuration options
- All features explained
- Advanced examples
- Integration with automations
- Performance tips

---

## 🎉 That's It!

You now have a beautiful, full-featured Kanban board in Home Assistant!

**Dashboard URL:**
`http://homeassistant.local:8123/kanban/home`

Enjoy! 🚀

