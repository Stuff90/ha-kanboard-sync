import logging
from homeassistant.components.sensor import SensorEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.update_coordinator import CoordinatorEntity
from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)

async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry, async_add_entities):
    """Set up Kanboard tracking sensors based on a active config entry."""
    coordinator = hass.data[DOMAIN][entry.entry_id]
    
    # If the coordinator failed to fetch data, skip creating entities for now
    if not coordinator.data:
        _LOGGER.warning("No data found from Kanboard to set up sensors")
        return

    entities = []

    # Create a users sensor
    entities.append(KanboardUsersSensor(coordinator))

    # Create a unique, individual state tracking sensor for each board project found
    projects = coordinator.data.get("projects", {})
    for project_id in projects.keys():
        entities.append(KanboardProjectSensor(coordinator, project_id))
        
    async_add_entities(entities, update_before_add=True)

class KanboardProjectSensor(CoordinatorEntity, SensorEntity):
    """Representation of a individual tracking Kanboard Project Sensor."""

    def __init__(self, coordinator, project_id):
        """Initialize the sensor."""
        super().__init__(coordinator)
        self.project_id = project_id
        self._attr_icon = "mdi:kanban"

    @property
    def name(self):
        """Return the friendly name of the sensor."""
        projects = self.coordinator.data.get("projects", {})
        project_name = projects.get(self.project_id, {}).get("name", "Unknown")
        return f"Kanboard Project {project_name}"

    @property
    def unique_id(self):
        """Return a unique identifier for database synchronization maps."""
        return f"kanboard_project_{self.project_id}"

    @property
    def native_value(self):
        """Return the state of the entity (Total number of active open tasks)."""
        projects = self.coordinator.data.get("projects", {})
        tasks = projects.get(self.project_id, {}).get("tasks", [])
        return len(tasks)

    @property
    def extra_state_attributes(self):
        """Pass the rich JSON payload down to your dashboard ui layer."""
        projects = self.coordinator.data.get("projects", {})
        project_data = projects.get(self.project_id, {})
        return {
            "project_id": self.project_id,
            "name": project_data.get("name"),
            "description": project_data.get("description"),
            "columns": project_data.get("columns", []),
            "tasks": project_data.get("tasks", [])
        }

class KanboardUsersSensor(CoordinatorEntity, SensorEntity):
    """Representation of Kanboard users sensor."""

    def __init__(self, coordinator):
        """Initialize the sensor."""
        super().__init__(coordinator)
        self._attr_icon = "mdi:account-multiple"

    @property
    def name(self):
        """Return the friendly name of the sensor."""
        return "Kanboard Users"

    @property
    def unique_id(self):
        """Return a unique identifier for database synchronization maps."""
        return "kanboard_users"

    @property
    def native_value(self):
        """Return the state of the entity (Total number of users)."""
        users = self.coordinator.data.get("users", [])
        return len(users)

    @property
    def extra_state_attributes(self):
        """Pass the users list as attributes."""
        users = self.coordinator.data.get("users", [])
        return {
            "users": users,
            "user_options": [
                {"label": f"{user.get('name', user.get('username', 'Unknown'))}", "value": int(user["id"])}
                for user in users
            ]
        }


