import logging
import voluptuous as vol
from datetime import timedelta

from homeassistant.core import HomeAssistant
from homeassistant.config_entries import ConfigEntry
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator

from .api import KanboardApiClient

_LOGGER = logging.getLogger(__name__)

# Core Service Constants
DOMAIN = "kanboard_sync"
SERVICE_MOVE_TASK = "move_task"
SERVICE_CREATE_TASK = "create_task"
SERVICE_UPDATE_TASK = "update_task"
SERVICE_DELETE_TASK = "delete_task"
ATTR_TASK_ID = "task_id"
ATTR_COLUMN_ID = "column_id"
ATTR_PROJECT_ID = "project_id"
ATTR_TITLE = "title"
ATTR_DESCRIPTION = "description"
ATTR_OWNER_ID = "owner_id"
ATTR_USERNAME = "username"

async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Kanboard Tasks Sync from a config entry flow setup."""
    kanboard_url = entry.data.get("url")
    kanboard_token = entry.data.get("api_token")
    
    # 1. Initialize the custom API engine wrapper
    client = KanboardApiClient(kanboard_url, kanboard_token)
    
    # 2. Build the central coordinator data fetching loop architecture
    async def fetch_data():
        """Fetch both projects and users."""
        projects = await client.fetch_projects_with_tasks()
        users = await client.fetch_all_users()
        return {"projects": projects, "users": users}

    coordinator = DataUpdateCoordinator(
        hass,
        _LOGGER,
        name=DOMAIN,
        update_interval=timedelta(seconds=30),
        update_method=fetch_data,
    )
    
    # Fetch initial data baseline before completing setup
    await coordinator.async_config_entry_first_refresh()
    
    # 3. Initialize and store the coordinator inside secure runtime memory
    hass.data.setdefault(DOMAIN, {})
    hass.data[DOMAIN][entry.entry_id] = coordinator
    
    # 4. Forward initialization down to our entity generator sensor file
    await hass.config_entries.async_forward_entry_setups(entry, ["sensor"])
    
    # 5. Register the custom move task service that your Javascript card will invoke
    async def handle_move_task(call):
        task_id = call.data.get(ATTR_TASK_ID)
        column_id = call.data.get(ATTR_COLUMN_ID)
        project_id = call.data.get(ATTR_PROJECT_ID)
        
        _LOGGER.info("Moving task %s to column %s", task_id, column_id)
        
        success = await client.move_task_column(task_id, column_id, project_id)
        if success:
            await coordinator.async_refresh()

    hass.services.async_register(
        DOMAIN,
        SERVICE_MOVE_TASK,
        handle_move_task,
        schema=vol.Schema({
            vol.Required(ATTR_TASK_ID): cv.positive_int,
            vol.Required(ATTR_COLUMN_ID): cv.positive_int,
            vol.Required(ATTR_PROJECT_ID): cv.positive_int,
        }),
    )

    # 6. Register the create task service
    async def handle_create_task(call):
        title = call.data[ATTR_TITLE]
        project_id = call.data[ATTR_PROJECT_ID]
        column_id = call.data[ATTR_COLUMN_ID]
        description = call.data.get(ATTR_DESCRIPTION)
        owner_id = call.data.get(ATTR_OWNER_ID)
        username = call.data.get(ATTR_USERNAME)

        _LOGGER.debug(
            "create_task: title=%s, project_id=%s, column_id=%s, owner_id=%s (type=%s), username=%s",
            title,
            project_id,
            column_id,
            owner_id,
            type(owner_id).__name__ if owner_id else "None",
            username,
        )

        # If username is provided instead of owner_id, look up the user ID
        if username and not owner_id:
            users = coordinator.data.get("users", [])
            for user in users:
                if user.get("username") == username or user.get("name") == username:
                    owner_id = int(user["id"])
                    _LOGGER.info("Resolved username '%s' to user ID %s", username, owner_id)
                    break

            if not owner_id:
                _LOGGER.error("Could not find user with username: %s", username)

        _LOGGER.info("Creating task '%s' in project %s, column %s", title, project_id, column_id)

        # Some Kanboard setups reject createTask when owner_id is included.
        # Create first, then assign owner in a second call.
        task_id = await client.create_task(title, project_id, column_id, description, None)
        if task_id:
            if owner_id is not None:
                owner_ok = await client.set_task_owner(
                    task_id,
                    int(owner_id),
                    title=title,
                    project_id=project_id,
                    column_id=column_id,
                )
                if not owner_ok:
                    _LOGGER.warning(
                        "Task %s created successfully, but owner assignment not supported by this Kanboard. "
                        "Task created anyway (owner_id=%s)",
                        task_id,
                        owner_id,
                    )

                # Verify the owner_id is valid
                users = coordinator.data.get("users", [])
                valid_user = None
                for user in users:
                    if int(user.get("id", 0)) == int(owner_id):
                        valid_user = user
                        break
                if valid_user:
                    _LOGGER.info("Verified owner_id=%s is valid user: %s", owner_id, valid_user.get("name"))
                else:
                    _LOGGER.warning(
                        "owner_id=%s NOT FOUND in valid users. Available users: %s",
                        owner_id,
                        [f"id={u.get('id')}:{u.get('name')}" for u in users],
                    )
            _LOGGER.info("Successfully created task with ID: %s", task_id)
            await coordinator.async_refresh()
        else:
            _LOGGER.error("Failed to create task")

    hass.services.async_register(
        DOMAIN,
        SERVICE_CREATE_TASK,
        handle_create_task,
        schema=vol.Schema({
            vol.Required(ATTR_TITLE): cv.string,
            vol.Required(ATTR_PROJECT_ID): cv.positive_int,
            vol.Required(ATTR_COLUMN_ID): cv.positive_int,
            vol.Optional(ATTR_DESCRIPTION): cv.string,
            vol.Optional(ATTR_OWNER_ID): cv.positive_int,
            vol.Optional(ATTR_USERNAME): cv.string,
        }),
    )

    # 7. Register the update task service
    async def handle_update_task(call):
        task_id = call.data[ATTR_TASK_ID]
        title = call.data.get(ATTR_TITLE)
        description = call.data.get(ATTR_DESCRIPTION)
        owner_id = call.data.get(ATTR_OWNER_ID)
        username = call.data.get(ATTR_USERNAME)

        _LOGGER.debug(
            "update_task: task_id=%s, title=%s, owner_id=%s (type=%s), username=%s",
            task_id,
            title,
            owner_id,
            type(owner_id).__name__ if owner_id else "None",
            username,
        )

        task_project_id: int | None = None
        task_column_id: int | None = None
        task_title: str | None = title
        task_description: str | None = description

        projects = coordinator.data.get("projects", {})
        for project_key, project_data in projects.items():
            for task in project_data.get("tasks", []):
                if int(task.get("id", 0)) == int(task_id):
                    task_project_id = int(project_key)
                    task_column_id = int(task.get("column_id", 0)) if task.get("column_id") else None
                    if task_title is None:
                        task_title = task.get("title")
                    if task_description is None:
                        task_description = task.get("description")
                    break
            if task_project_id is not None:
                break

        # If username is provided instead of owner_id, look up the user ID
        if username and not owner_id:
            users = coordinator.data.get("users", [])
            for user in users:
                if user.get("username") == username or user.get("name") == username:
                    owner_id = int(user["id"])
                    _LOGGER.info("Resolved username '%s' to user ID %s", username, owner_id)
                    break

        _LOGGER.info("Updating task %s", task_id)

        # Update title/description first, then assign owner separately for compatibility.
        success = await client.update_task(
            task_id, title if title is not None else task_title, description, None
        )
        if success:
            if owner_id is not None:

                # Verify the owner_id is valid
                users = coordinator.data.get("users", [])
                valid_user = None
                for user in users:
                    if int(user.get("id", 0)) == int(owner_id):
                        valid_user = user
                        break
                if valid_user:
                    _LOGGER.info("Verified owner_id=%s is valid user: %s", owner_id, valid_user.get("name"))
                else:
                    _LOGGER.warning(
                        "owner_id=%s NOT FOUND in valid users. Available users: %s",
                        owner_id,
                        [f"id={u.get('id')}:{u.get('name')}" for u in users],
                    )

                owner_ok = await client.set_task_owner(
                    task_id,
                    int(owner_id),
                    title=task_title,
                    description=task_description,
                    project_id=task_project_id,
                    column_id=task_column_id,
                )
                if not owner_ok:
                    _LOGGER.warning(
                        "Task %s updated successfully, but owner assignment not supported by this Kanboard. "
                        "Task updated anyway (owner_id=%s)",
                        task_id,
                        owner_id,
                    )
        else:
            _LOGGER.error("Failed to update task %s", task_id)

        if success:
            _LOGGER.info("Successfully updated task %s", task_id)
            await coordinator.async_refresh()
        else:
            _LOGGER.error("Failed to update task %s", task_id)

    hass.services.async_register(
        DOMAIN,
        SERVICE_UPDATE_TASK,
        handle_update_task,
        schema=vol.Schema({
            vol.Required(ATTR_TASK_ID): cv.positive_int,
            vol.Optional(ATTR_TITLE): cv.string,
            vol.Optional(ATTR_DESCRIPTION): cv.string,
            vol.Optional(ATTR_OWNER_ID): vol.All(vol.Coerce(int), vol.Range(min=0)),
            vol.Optional(ATTR_USERNAME): cv.string,
        }),
    )

    # 8. Register the delete task service
    async def handle_delete_task(call):
        task_id = call.data[ATTR_TASK_ID]

        _LOGGER.info("Deleting task %s", task_id)

        success = await client.delete_task(task_id)
        if success:
            _LOGGER.info("Successfully deleted task %s", task_id)
            await coordinator.async_refresh()
        else:
            _LOGGER.error("Failed to delete task %s", task_id)

    hass.services.async_register(
        DOMAIN,
        SERVICE_DELETE_TASK,
        handle_delete_task,
        schema=vol.Schema({
            vol.Required(ATTR_TASK_ID): cv.positive_int,
        }),
    )

    return True

async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload a config entry if the user deletes the integration."""
    await hass.config_entries.async_unload_platforms(entry, ["sensor"])
    hass.data[DOMAIN].pop(entry.entry_id)

    # Unregister services if this is the last config entry
    if not hass.data[DOMAIN]:
        hass.services.async_remove(DOMAIN, SERVICE_MOVE_TASK)
        hass.services.async_remove(DOMAIN, SERVICE_CREATE_TASK)
        hass.services.async_remove(DOMAIN, SERVICE_UPDATE_TASK)
        hass.services.async_remove(DOMAIN, SERVICE_DELETE_TASK)

    return True
