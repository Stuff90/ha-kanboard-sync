import logging
import base64
import aiohttp
import async_timeout

_LOGGER = logging.getLogger(__name__)

class KanboardApiClient:
    """API client replicating the exact working Home Assistant REST platform layout."""

    def __init__(self, url: str, token: str):
        """Initialize the client wrapper."""
        self.url = f"{url.rstrip('/')}/jsonrpc.php"
        
        # Strip away any hidden spaces, linebreaks, or carriage returns from the UI input string
        clean_token = token.strip().replace("\n", "").replace("\r", "")
        
        _LOGGER.info("Initializing client. Token input length: %s characters", len(clean_token))
        
        # Build the exact verification string
        auth_raw_string = f"jsonrpc:{clean_token}"
        auth_bytes = auth_raw_string.encode("utf-8")
        auth_base64 = base64.b64encode(auth_bytes).decode("utf-8")
        
        # Explicitly configure headers as standard strings to bypass automatic dual-encoding layers
        self.headers = {
            "Authorization": str(f"Basic {auth_base64}"),
            "Content-Type": "application/json"
        }

    async def fetch_projects_with_tasks(self) -> dict:
        """Fetch all projects along with their tasks matching the verified parameters map."""
        async with aiohttp.ClientSession() as session:
            try:
                async with async_timeout.timeout(10):
                    payload = {
                        "jsonrpc": "2.0",
                        "method": "getAllProjects",
                        "id": 1
                    }
                    
                    async with session.post(self.url, json=payload, headers=self.headers) as response:
                        if response.status == 401:
                            _LOGGER.error("Kanboard server rejected connection with 401 Unauthorized.")
                            return {}
                        if response.status != 200:
                            _LOGGER.error("Kanboard server connection error status code: %s", response.status)
                            return {}
                        
                        res_json = await response.json()
                        projects = res_json.get("result") or []
                    
                    data_matrix = {}
                    for project in projects:
                        proj_id = int(project["id"])
                        
                        # Fetch tasks
                        tasks_payload = {
                            "jsonrpc": "2.0",
                            "method": "getAllTasks",
                            "id": 1,
                            "params": {
                                "project_id": proj_id,
                                "status_id": 1
                            }
                        }
                        
                        async with session.post(self.url, json=tasks_payload, headers=self.headers) as t_resp:
                            if t_resp.status == 200:
                                t_json = await t_resp.json()
                                project["tasks"] = t_json.get("result") or []
                            else:
                                project["tasks"] = []
                        
                        # Fetch columns
                        columns_payload = {
                            "jsonrpc": "2.0",
                            "method": "getColumns",
                            "id": 1,
                            "params": {
                                "project_id": proj_id
                            }
                        }

                        async with session.post(self.url, json=columns_payload, headers=self.headers) as c_resp:
                            if c_resp.status == 200:
                                c_json = await c_resp.json()
                                project["columns"] = c_json.get("result") or []
                            else:
                                project["columns"] = []

                        data_matrix[str(proj_id)] = project
                        
                    return data_matrix

            except Exception as err:
                _LOGGER.error("Failed to map data tracking layout matrix: %s", err)
                return {}

    async def fetch_columns(self, project_id: int) -> list:
        """Fetch columns for a specific project."""
        async with aiohttp.ClientSession() as session:
            try:
                async with async_timeout.timeout(10):
                    payload = {
                        "jsonrpc": "2.0",
                        "method": "getColumns",
                        "id": 1,
                        "params": {
                            "project_id": project_id
                        }
                    }

                    async with session.post(self.url, json=payload, headers=self.headers) as response:
                        if response.status == 200:
                            res_json = await response.json()
                            columns = res_json.get("result") or []
                            _LOGGER.debug("Fetched %s columns for project %s", len(columns), project_id)
                            return columns

                        _LOGGER.error("Failed to fetch columns for project %s, status: %s", project_id, response.status)
                        return []
            except Exception as err:
                _LOGGER.error("Failed to fetch columns for project %s: %s", project_id, err)
                return []

    async def fetch_all_users(self) -> list[dict]:
        """Fetch all users from Kanboard."""
        async with aiohttp.ClientSession() as session:
            try:
                async with async_timeout.timeout(10):
                    payload = {
                        "jsonrpc": "2.0",
                        "method": "getAllUsers",
                        "id": 3
                    }

                    async with session.post(self.url, json=payload, headers=self.headers) as response:
                        if response.status == 200:
                            res_json = await response.json()
                            users = res_json.get("result") or []
                            _LOGGER.info("Fetched %s users from Kanboard", len(users))
                            return users

                        _LOGGER.error("Failed to fetch users, status code: %s", response.status)
                        return []
            except Exception as err:
                _LOGGER.error("Failed to fetch users from Kanboard: %s", err)
                return []

    async def create_task(
        self, title: str, project_id: int, column_id: int,
        description: str | None = None, owner_id: int | None = None
    ) -> int | None:
        """Create a new task in Kanboard and return the task ID."""
        async with aiohttp.ClientSession() as session:
            try:
                async with async_timeout.timeout(10):
                    params = {
                        "title": title,
                        "project_id": int(project_id),
                        "column_id": int(column_id),
                    }

                    if description:
                        params["description"] = description

                    if owner_id is not None:
                        params["owner_id"] = int(owner_id)

                    payload = {
                        "jsonrpc": "2.0",
                        "method": "createTask",
                        "id": 2,
                        "params": params
                    }
                    _LOGGER.info("Sending create task payload: %s", payload)

                    async with session.post(self.url, json=payload, headers=self.headers) as response:
                        if response.status == 200:
                            res_json = await response.json()
                            _LOGGER.info("Kanboard API create task raw response: %s", res_json)
                            task_id = res_json.get("result")
                            if task_id:
                                return int(task_id)
                            if res_json.get("error"):
                                _LOGGER.error("Kanboard createTask error: %s", res_json["error"])
                            return None

                        _LOGGER.error("Kanboard create task failed HTTP code: %s", response.status)
                        return None
            except Exception as err:
                _LOGGER.error("Failed to execute createTask on Kanboard: %s", err)
                return None

    async def set_task_owner(
        self,
        task_id: int,
        owner_id: int,
        title: str | None = None,
        description: str | None = None,
        project_id: int | None = None,
        column_id: int | None = None,
    ) -> bool:
        """Assign or unassign a task owner.

        Uses assignUser for regular assignment and falls back to updateTask(owner_id).
        Uses updateTask(owner_id=0) for unassign.
        """
        async with aiohttp.ClientSession() as session:
            try:
                async with async_timeout.timeout(10):
                    # Unassign case.
                    if owner_id == 0:
                        payload = {
                            "jsonrpc": "2.0",
                            "method": "updateTask",
                            "id": 7,
                            "params": {"id": int(task_id), "owner_id": 0},
                        }
                        async with session.post(self.url, json=payload, headers=self.headers) as response:
                            if response.status == 200:
                                res_json = await response.json()
                                if res_json.get("result") is True:
                                    return True
                                _LOGGER.error("Kanboard unassign error: %s", res_json.get("error"))
                            return False

                    # Build richer fallback payloads for instances that validate strict fields.
                    fallback_params = {"id": int(task_id), "owner_id": int(owner_id)}
                    if title is not None:
                        fallback_params["title"] = title
                    if description is not None:
                        fallback_params["description"] = description
                    if project_id is not None:
                        fallback_params["project_id"] = int(project_id)
                    if column_id is not None:
                        fallback_params["column_id"] = int(column_id)

                    attempts: list[tuple[str, dict | list]] = [
                        ("updateTask", {"id": int(task_id), "owner_id": int(owner_id)}),
                        ("changeTaskOwner", {"task_id": int(task_id), "owner_id": int(owner_id)}),
                        ("changeTaskOwner", {"task_id": int(task_id), "user_id": int(owner_id)}),
                        ("changeTaskOwner", [int(task_id), int(owner_id)]),
                        ("assignUser", {"task_id": int(task_id), "user_id": int(owner_id)}),
                        ("assignUser", [int(task_id), int(owner_id)]),
                        ("updateTask", {"id": int(task_id), "owner_id": int(owner_id)}),
                        ("updateTask", {"id": int(task_id), "_assignee": int(owner_id)}),
                        ("updateTask", {"id": int(task_id), "assignee_id": int(owner_id)}),
                        ("updateTask", {"id": int(task_id), "assigned_user_id": int(owner_id)}),
                        ("updateTask", {"task_id": int(task_id), "owner_id": int(owner_id)}),
                        ("updateTask", fallback_params),
                        ("updateTask", {**fallback_params, "owner_id": str(owner_id)}),
                        ("updateTask", {**{k: v for k, v in fallback_params.items() if k != "owner_id"}, "_assignee": int(owner_id)}),
                        ("updateTask", {**{k: v for k, v in fallback_params.items() if k != "owner_id"}, "assignee_id": int(owner_id)}),
                    ]

                    if project_id is not None:
                        attempts.append(
                            (
                                "assignUser",
                                {
                                    "project_id": int(project_id),
                                    "task_id": int(task_id),
                                    "user_id": int(owner_id),
                                },
                            )
                        )
                        attempts.append(("assignUser", [int(project_id), int(task_id), int(owner_id)]))

                    if project_id is not None and column_id is not None:
                        attempts.append(
                            (
                                "updateTask",
                                {
                                    "id": int(task_id),
                                    "_assignee": int(owner_id),
                                    "project_id": int(project_id),
                                    "column_id": int(column_id),
                                },
                            )
                        )
                        attempts.append(
                            (
                                "updateTask",
                                {
                                    "id": int(task_id),
                                    "assignee_id": int(owner_id),
                                    "project_id": int(project_id),
                                    "column_id": int(column_id),
                                },
                            )
                        )

                    if project_id is not None and column_id is not None:
                        attempts.append(
                            (
                                "updateTask",
                                {
                                    "id": int(task_id),
                                    "owner_id": int(owner_id),
                                    "title": title or " ",
                                    "project_id": int(project_id),
                                    "column_id": int(column_id),
                                },
                            )
                        )

                    last_response = None
                    request_id = 11

                    _LOGGER.debug(
                        "Attempting to assign owner to task=%s with owner_id=%s (type: %s). "
                        "Trying %s assignment methods.",
                        task_id,
                        owner_id,
                        type(owner_id).__name__,
                        len(attempts),
                    )

                    for method, params in attempts:
                        _LOGGER.debug(
                            "Attempt: method=%s, params=%s",
                            method,
                            params,
                        )
                        payload = {
                            "jsonrpc": "2.0",
                            "method": method,
                            "id": request_id,
                            "params": params,
                        }
                        request_id += 1

                        async with session.post(self.url, json=payload, headers=self.headers) as response:
                            if response.status != 200:
                                last_response = {"http_status": response.status, "method": method, "params": params}
                                continue

                            res_json = await response.json()
                            last_response = {"method": method, "params": params, "response": res_json}
                            if res_json.get("result") is True:
                                _LOGGER.info("Task %s owner set via %s", task_id, method)
                                return True
                            else:
                                _LOGGER.debug(
                                    "Method %s returned False. Response: %s",
                                    method,
                                    res_json,
                                )

                    _LOGGER.error(
                        "Kanboard set owner failed after %s attempts for task=%s owner=%s. Last response: %s",
                        len(attempts),
                        task_id,
                        owner_id,
                        last_response,
                    )
                    return False
            except Exception as err:
                _LOGGER.error("Failed to set task owner for task %s: %s", task_id, err)
                return False

    async def update_task(
        self, task_id: int, title: str | None = None,
        description: str | None = None, owner_id: int | None = None
    ) -> bool:
        """Update a task in Kanboard."""
        async with aiohttp.ClientSession() as session:
            try:
                async with async_timeout.timeout(10):
                    params = {"id": int(task_id)}

                    if title is not None:
                        params["title"] = title

                    if description is not None:
                        params["description"] = description

                    if owner_id is not None:
                        params["owner_id"] = int(owner_id)

                    payload = {
                        "jsonrpc": "2.0",
                        "method": "updateTask",
                        "id": 4,
                        "params": params
                    }
                    _LOGGER.info("Sending update task payload: %s", payload)

                    async with session.post(self.url, json=payload, headers=self.headers) as response:
                        if response.status == 200:
                            res_json = await response.json()
                            _LOGGER.info("Kanboard API update task raw response: %s", res_json)
                            if res_json.get("result") is True:
                                return True
                            if res_json.get("error"):
                                _LOGGER.error("Kanboard updateTask error: %s", res_json["error"])
                            return False

                        _LOGGER.error("Kanboard update task failed HTTP code: %s", response.status)
                        return False
            except Exception as err:
                _LOGGER.error("Failed to execute updateTask on Kanboard: %s", err)
                return False

    async def delete_task(self, task_id: int) -> bool:
        """Delete a task in Kanboard."""
        async with aiohttp.ClientSession() as session:
            try:
                async with async_timeout.timeout(10):
                    payload = {
                        "jsonrpc": "2.0",
                        "method": "removeTask",
                        "id": 6,
                        "params": {
                            "task_id": int(task_id)
                        }
                    }
                    _LOGGER.info("Sending delete task payload: %s", payload)

                    async with session.post(self.url, json=payload, headers=self.headers) as response:
                        if response.status == 200:
                            res_json = await response.json()
                            _LOGGER.info("Kanboard API delete task raw response: %s", res_json)
                            return res_json.get("result") is True

                        _LOGGER.error("Kanboard delete task failed HTTP code: %s", response.status)
                        return False
            except Exception as err:
                _LOGGER.error("Failed to execute removeTask on Kanboard: %s", err)
                return False

    async def move_task_column(self, task_id: int, column_id: int, project_id: int) -> bool:
        """Pushes a task transition update back to Kanboard using sequential array formatting."""
        async with aiohttp.ClientSession() as session:
            try:
                async with async_timeout.timeout(10):
                    # Strict positional parameter list layout:
                    # [project_id, task_id, column_id, position, swimlane_id]
                    # Passing 1 for position sets it at the top; 0 or omitting optional fields can cause a silent fail.
                    payload = {
                        "jsonrpc": "2.0",
                        "method": "moveTaskPosition",
                        "id": 5,
                        "params": [
                            int(project_id),
                            int(task_id),
                            int(column_id),
                            1, # position (top)
                            0  # default swimlane_id
                        ]
                    }
                    _LOGGER.info("Sending move payload: %s", payload)
                    
                    async with session.post(self.url, json=payload, headers=self.headers) as response:
                        if response.status == 200:
                            res_json = await response.json()
                            _LOGGER.info("Kanboard API move task raw response: %s", res_json)
                            # Return True if 'result' is present and true
                            return res_json.get("result") is True
                        
                        _LOGGER.error("Kanboard move action failed HTTP code: %s", response.status)
                        return False
            except Exception as err:
                _LOGGER.error("Failed to execute moveTaskPosition on Kanboard: %s", err)
                return False
