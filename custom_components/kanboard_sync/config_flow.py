import voluptuous as vol
from homeassistant import config_entries
from homeassistant.core import callback
from .const import DOMAIN

class KanboardConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a configuration UI flow for Kanboard Tasks Sync."""
    VERSION = 1

    async def async_step_user(self, user_input=None):
        """Handle the initial setup step when clicked in the UI."""
        errors = {}

        if user_input is not None:
            # This creates the integration instance using the user data input fields
            return self.async_create_entry(
                title=f"Kanboard ({user_input['url']})", 
                data=user_input
            )

        # Define the exact text fields shown to the user in the popup
        DATA_SCHEMA = vol.Schema({
            vol.Required("url", default="https://your-kanboard-url.com"): str,
            vol.Required("api_token"): str,
        })

        return self.async_show_form(
            step_id="user", 
            data_schema=DATA_SCHEMA, 
            errors=errors
        )
