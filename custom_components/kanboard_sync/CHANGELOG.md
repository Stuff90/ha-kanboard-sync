# Kanboard Integration Changelog

## User Management Features

### New Features

#### 1. Users Sensor (`sensor.kanboard_users`)
- **State**: Total count of users in Kanboard
- **Attributes**:
  - `users`: Complete list of all Kanboard users with full details (id, username, name, email, is_active)
  - `user_options`: Formatted array for easy dropdown creation with `label` and `value` fields
- **Icon**: `mdi:account-multiple`
- **Update Frequency**: Updates every 30 seconds with the coordinator

#### 2. Enhanced Task Creation Service

The `kanboard_sync.create_task` service now supports flexible user assignment:

**New Parameters**:
- `username` (optional): Assign task by username instead of ID
  - Automatically looks up the user ID from the username
  - Matches against both `username` and `name` fields
  - Error logging if username not found

**Existing Parameters**:
- `owner_id` (optional): Assign task by user ID (still supported)

**Priority**: If both `owner_id` and `username` are provided, `owner_id` takes precedence.

### Technical Changes

#### API Client (`api.py`)
- Added `fetch_all_users()` method
  - Calls Kanboard's `getAllUsers` JSON-RPC method
  - Returns list of user dictionaries
  - Includes error handling and logging

#### Coordinator (`__init__.py`)
- Updated coordinator to fetch both projects and users
- New data structure:
  ```python
  {
    "projects": {
      "1": { ... project data ... },
      "2": { ... project data ... }
    },
    "users": [
      { "id": "1", "username": "admin", ... },
      { "id": "2", "username": "john", ... }
    ]
  }
  ```
- Added username-to-ID resolution logic in `handle_create_task`
- Both services are properly cleaned up on unload

#### Sensors (`sensor.py`)
- Updated `KanboardProjectSensor` to work with new data structure
- Added new `KanboardUsersSensor` class
- Both sensor types properly handle coordinator data

#### Service Definition (`services.yaml`)
- Added `username` field with text selector
- Updated `owner_id` description to reference the users sensor
- Added helpful examples and references

### Migration Notes

**Breaking Changes**: None - the changes are backward compatible.

**Data Structure Change**: The coordinator data structure has changed from:
```python
coordinator.data = {
  "1": { project_data },
  "2": { project_data }
}
```

To:
```python
coordinator.data = {
  "projects": { "1": { project_data }, ... },
  "users": [ { user_data }, ... ]
}
```

Existing project sensors will continue to work as they now access `coordinator.data["projects"]`.

### Benefits

1. **Better UX**: Users can now assign tasks using readable usernames instead of numeric IDs
2. **Transparency**: All available users are exposed through a sensor for easy reference
3. **Automation-Friendly**: Users can be accessed in templates and automations
4. **UI Integration**: User list can be used to create dynamic dropdowns in custom cards
5. **Flexible**: Supports both ID-based and name-based assignment

### Example Usage

See `USAGE_EXAMPLES.md` for detailed examples including:
- Accessing users from the sensor
- Creating tasks with username or user ID
- Using in automations
- Integrating with custom cards
- Creating input_select helpers

