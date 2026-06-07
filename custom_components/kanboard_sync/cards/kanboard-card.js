/**
 * Kanboard Full-Screen Custom Card
 * A fully-featured Kanban board with drag-and-drop and task creation
 *
 * Features:
 * - Configurable sensor input (e.g., sensor.kanboard_project_house)
 * - Dynamic columns based on Kanboard data
 * - Drag-and-drop tasks between columns
 * - Dialog for creating new tasks with + button
 * - Full-screen optimized layout
 *
 * Installation:
 * 1. Copy to www/kanboard-card.js
 * 2. Add to configuration.yaml or via UI:
 *    lovelace:
 *      resources:
 *        - url: /local/kanboard-card.js
 *          type: module
 *
 * Usage:
 *    type: custom:kanboard-card
 *    entity: sensor.kanboard_project_house
 *    show_create_button: true  # optional, default: true
 *    columns:  # optional, auto-detected if not specified
 *      - id: 1
 *        name: "Backlog"
 *        color: "#9E9E9E"
 *      - id: 2
 *        name: "Ready"
 *        color: "#2196F3"
 */

class KanboardCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._draggedTask = null;
    this._draggedElement = null;
    this._showDialog = false;
    this._showEditDialog = false;
    this._editTask = null;
  }

  setConfig(config) {
    if (!config.entity) {
      throw new Error('You need to define an entity (e.g., sensor.kanboard_project_house)');
    }
    this.config = {
      entity: config.entity,
      show_create_button: config.show_create_button !== false,
      columns: config.columns || null,  // Auto-detect if not specified
      ...config
    };
  }

  set hass(hass) {
    this._hass = hass;
    this.render();
  }

  getCardSize() {
    return 10;
  }

  // Format columns from sensor attributes (Kanboard API format)
  _formatSensorColumns(sensorColumns) {
    const colors = ['#9E9E9E', '#2196F3', '#FF9800', '#4CAF50', '#9C27B0', '#F44336', '#00BCD4', '#8BC34A'];

    return sensorColumns
      .sort((a, b) => parseInt(a.position || a.id) - parseInt(b.position || b.id))
      .map((col, index) => ({
        id: col.id,
        name: col.title || col.name || `Column ${col.id}`,
        color: colors[index % colors.length]
      }));
  }

  // Auto-detect columns from tasks if not configured
  _detectColumns(tasks) {
    if (!tasks || tasks.length === 0) {
      return this._getDefaultColumns();
    }

    const columnIds = new Set();
    const columnNames = {};

    tasks.forEach(task => {
      if (task.column_id && task.column_name) {
        columnIds.add(task.column_id);
        columnNames[task.column_id] = task.column_name;
      }
    });

    // Sort column IDs and create column objects
    const sortedIds = Array.from(columnIds).sort((a, b) => parseInt(a) - parseInt(b));
    const colors = ['#9E9E9E', '#2196F3', '#FF9800', '#4CAF50', '#9C27B0', '#F44336'];

    return sortedIds.map((id, index) => ({
      id: id,
      name: columnNames[id] || `Column ${id}`,
      color: colors[index % colors.length]
    }));
  }

  _getDefaultColumns() {
    return [
      { id: '1', name: '📋 Backlog', color: '#9E9E9E' },
      { id: '2', name: '🎯 Ready', color: '#2196F3' },
      { id: '3', name: '⚡ In Progress', color: '#FF9800' },
      { id: '4', name: '✅ Done', color: '#4CAF50' }
    ];
  }

  _openCreateDialog() {
    this._showDialog = true;
    this.render();
  }

  _closeCreateDialog() {
    this._showDialog = false;
    this.render();
  }

  _handleCreateTask(e) {
    e.preventDefault();
    const form = this.shadowRoot.querySelector('#create-task-form');
    const formData = new FormData(form);

    const title = formData.get('title');
    const description = formData.get('description');
    const columnId = formData.get('column_id');
    const ownerId = formData.get('owner_id');

    if (!title || !columnId) {
      alert('Title and Column are required!');
      return;
    }

    const stateObj = this._hass.states[this.config.entity];
    const projectId = stateObj.attributes.project_id;

    const serviceData = {
      title: title,
      project_id: parseInt(projectId),
      column_id: parseInt(columnId)
    };

    if (description) {
      serviceData.description = description;
    }

    if (ownerId && ownerId !== 'unassigned') {
      serviceData.owner_id = parseInt(ownerId);
    }

    this._hass.callService('kanboard_sync', 'create_task', serviceData)
      .then(() => {
        this._closeCreateDialog();
        // Show success message
        this._hass.callService('persistent_notification', 'create', {
          title: 'Task Created',
          message: `Task "${title}" created successfully!`,
          notification_id: `kanboard_create_${Date.now()}`
        });
      })
      .catch(err => {
        alert(`Failed to create task: ${err.message}`);
      });
  }

  _openEditDialog(task) {
    this._editTask = task;
    this._showEditDialog = true;
    this.render();
  }

  _closeEditDialog() {
    this._showEditDialog = false;
    this._editTask = null;
    this.render();
  }

  _handleUpdateTask(e) {
    e.preventDefault();
    const form = this.shadowRoot.querySelector('#edit-task-form');
    const formData = new FormData(form);
    
    const title = formData.get('title');
    const description = formData.get('description');
    const ownerId = formData.get('owner_id');

    if (!title) {
      alert('Title is required!');
      return;
    }

    const serviceData = {
      task_id: parseInt(this._editTask.id)
    };

    if (title !== this._editTask.title) {
      serviceData.title = title;
    }

    if (description !== (this._editTask.description || '')) {
      serviceData.description = description;
    }

    const currentOwnerId = this._getTaskOwnerId(this._editTask);
    const selectedOwnerId = ownerId === 'unassigned' ? 0 : parseInt(ownerId);
    if (selectedOwnerId !== currentOwnerId) {
      serviceData.owner_id = selectedOwnerId;
    }

    this._hass.callService('kanboard_sync', 'update_task', serviceData)
      .then(() => {
        this._closeEditDialog();
        this._hass.callService('persistent_notification', 'create', {
          title: 'Task Updated',
          message: `Task "${title}" updated successfully!`,
          notification_id: `kanboard_update_${Date.now()}`
        });
      })
      .catch(err => {
        alert(`Failed to update task: ${err.message}`);
      });
  }

  _handleDeleteTask() {
    if (!confirm(`Are you sure you want to delete task #${this._editTask.id}: "${this._editTask.title}"?`)) {
      return;
    }

    this._hass.callService('kanboard_sync', 'delete_task', {
      task_id: parseInt(this._editTask.id)
    })
      .then(() => {
        this._closeEditDialog();
        this._hass.callService('persistent_notification', 'create', {
          title: 'Task Deleted',
          message: `Task #${this._editTask.id} deleted successfully!`,
          notification_id: `kanboard_delete_${Date.now()}`
        });
      })
      .catch(err => {
        alert(`Failed to delete task: ${err.message}`);
      });
  }

  _deleteAllTasksInColumn(columnId, columnName, taskCount) {
    if (taskCount === 0) {
      alert('No tasks in this column');
      return;
    }

    if (!confirm(`Are you sure you want to delete all ${taskCount} task(s) in "${columnName}"? This cannot be undone.`)) {
      return;
    }

    // Get all tasks in this column from current entity state
    const stateObj = this._hass.states[this.config.entity];
    const allTasks = stateObj.attributes.tasks || [];
    const colTasks = allTasks.filter(t => String(t.column_id) === String(columnId));

    if (colTasks.length === 0) {
      alert('No tasks found in this column');
      return;
    }

    // Delete all tasks sequentially
    let deleted = 0;
    let failed = 0;

    const deleteNext = (index) => {
      if (index >= colTasks.length) {
        // All done
        if (failed === 0) {
          this._hass.callService('persistent_notification', 'create', {
            title: 'All Tasks Deleted',
            message: `Successfully deleted ${deleted} task(s) from "${columnName}"`,
            notification_id: `kanboard_delete_all_${Date.now()}`
          });
        } else {
          this._hass.callService('persistent_notification', 'create', {
            title: 'Partial Deletion',
            message: `Deleted ${deleted} of ${colTasks.length} task(s). ${failed} failed.`,
            notification_id: `kanboard_delete_partial_${Date.now()}`
          });
        }
        return;
      }

      const task = colTasks[index];
      this._hass.callService('kanboard_sync', 'delete_task', {
        task_id: parseInt(task.id)
      })
        .then(() => {
          deleted++;
          deleteNext(index + 1);
        })
        .catch(() => {
          failed++;
          deleteNext(index + 1);
        });
    };

    deleteNext(0);
  }

  _getTaskOwnerId(task) {
    const ownerId = task.owner_id ?? task.ownerId ?? task.assignee_id ?? task.assigneeId ?? null;
    if (ownerId === null || ownerId === undefined || ownerId === '') {
      return 0;
    }
    const parsed = parseInt(ownerId);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  _getTaskAssigneeName(task, users) {
    if (task.assignee_name) {
      return task.assignee_name;
    }
    if (task.owner_name) {
      return task.owner_name;
    }
    if (task.owner_username) {
      return task.owner_username;
    }
    if (task.assignee_username) {
      return task.assignee_username;
    }

    const ownerId = this._getTaskOwnerId(task);
    if (!ownerId) {
      return '';
    }

    const user = users.find((item) => {
      const userId = item.id ?? item.user_id ?? item.userId;
      return parseInt(userId) === ownerId;
    });
    if (!user) {
      return `User #${ownerId}`;
    }
    return user.name || user.username || '';
  }

  _getUserId(user) {
    const raw = user.id ?? user.user_id ?? user.userId ?? null;
    if (raw === null || raw === undefined || raw === '') {
      return null;
    }
    const parsed = parseInt(raw);
    return Number.isNaN(parsed) ? null : parsed;
  }

  render() {
    if (!this._hass || !this.config) return;

    const entityId = this.config.entity;
    const stateObj = this._hass.states[entityId];

    if (!stateObj) {
      this.shadowRoot.innerHTML = `
        <ha-card>
          <div style="padding: 16px; color: var(--error-color);">
            <ha-icon icon="mdi:alert-circle"></ha-icon>
            Entity not found: ${entityId}
          </div>
        </ha-card>
      `;
      return;
    }

    const tasks = stateObj.attributes.tasks || [];
    const projectId = stateObj.attributes.project_id;
    const projectName = stateObj.attributes.name ||
                        (stateObj.name ? stateObj.name.replace(/Kanboard Project /g, '') : 'Kanboard Project');

    // Get columns (priority: sensor > config > auto-detect)
    let columns;
    if (stateObj.attributes.columns && stateObj.attributes.columns.length > 0) {
      // Use columns from sensor attributes
      columns = this._formatSensorColumns(stateObj.attributes.columns);
    } else if (this.config.columns) {
      // Use manually configured columns
      columns = this.config.columns;
    } else {
      // Fall back to auto-detection from tasks
      columns = this._detectColumns(tasks);
    }

    // Get users for the create dialog
    const usersEntity = this._hass.states['sensor.kanboard_users'];
    const users = usersEntity ? (usersEntity.attributes.users || []) : [];

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
          height: 100%;
        }
        ha-card {
          height: 100%;
          display: flex;
          flex-direction: column;
          padding: 0;
          overflow: hidden;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          flex-shrink: 0;
        }
        .header h2 {
          margin: 0;
          font-size: 1.8em;
          font-weight: 500;
        }
        .header .stats {
          font-size: 0.95em;
          opacity: 0.95;
          margin-top: 4px;
        }
        .header-actions {
          display: flex;
          gap: 12px;
        }
        .create-button {
          background: rgba(255, 255, 255, 0.2);
          border: 2px solid rgba(255, 255, 255, 0.5);
          color: white;
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 1em;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s ease;
        }
        .create-button:hover {
          background: rgba(255, 255, 255, 0.3);
          border-color: white;
          transform: translateY(-2px);
        }
        .create-button ha-icon {
          font-size: 1.2em;
        }
        .clear-button {
          background: rgba(255, 87, 87, 0.2);
          border: 2px solid rgba(255, 87, 87, 0.5);
          color: rgba(255, 87, 87, 1);
          padding: 6px 14px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.9em;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s ease;
        }
        .clear-button:hover {
          background: rgba(255, 87, 87, 0.3);
          border-color: rgba(255, 87, 87, 1);
          transform: translateY(-2px);
        }
        .clear-button ha-icon {
          font-size: 1em;
        }
        .board {
          display: flex;
          gap: 16px;
          padding: 20px;
          background: var(--secondary-background-color);
          overflow-x: auto;
          overflow-y: hidden;
          flex: 1;
          min-height: 0;
        }
        .column {
          flex: 1;
          min-width: 300px;
          max-width: 400px;
          background: var(--card-background-color);
          border-radius: 12px;
          padding: 0;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          display: flex;
          flex-direction: column;
          height: 100%;
        }
        .column.drag-over {
          background: var(--primary-color);
          opacity: 0.3;
          transform: scale(1.02);
        }
        .column-header {
          font-weight: 600;
          font-size: 1.15em;
          padding: 16px;
          border-radius: 12px 12px 0 0;
          color: white;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-shrink: 0;
        }
        .column-count {
          background: rgba(255,255,255,0.3);
          padding: 4px 14px;
          border-radius: 16px;
          font-size: 0.9em;
          font-weight: 700;
        }
        .cards-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 12px;
          overflow-y: auto;
          padding: 16px;
          min-height: 200px;
        }
        .cards-container::-webkit-scrollbar {
          width: 8px;
        }
        .cards-container::-webkit-scrollbar-track {
          background: transparent;
        }
        .cards-container::-webkit-scrollbar-thumb {
          background: var(--divider-color);
          border-radius: 4px;
        }
        .cards-container::-webkit-scrollbar-thumb:hover {
          background: var(--primary-color);
        }
        .task-card {
          background: var(--card-background-color);
          border: 2px solid var(--divider-color);
          border-radius: 10px;
          padding: 14px;
          cursor: grab;
          transition: all 0.2s ease;
          box-shadow: 0 2px 4px rgba(0,0,0,0.08);
        }
        .task-card:hover {
          box-shadow: 0 6px 16px rgba(0,0,0,0.15);
          transform: translateY(-3px);
          border-color: var(--primary-color);
        }
        .task-card:active {
          cursor: grabbing;
        }
        .task-card.dragging {
          opacity: 0.6;
          transform: rotate(3deg) scale(1.05);
          box-shadow: 0 8px 20px rgba(0,0,0,0.25);
        }
        .task-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 10px;
        }
        .task-id {
          font-size: 0.75em;
          color: var(--secondary-text-color);
          background: var(--secondary-background-color);
          padding: 4px 10px;
          border-radius: 6px;
          font-weight: 700;
        }
        .task-title {
          color: var(--primary-text-color);
          font-weight: 600;
          font-size: 1.05em;
          margin-bottom: 10px;
          line-height: 1.5;
        }
        .task-title.strike {
          text-decoration: line-through;
          opacity: 0.7;
        }
        .task-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          font-size: 0.85em;
          color: var(--secondary-text-color);
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px solid var(--divider-color);
        }
        .task-assignee, .task-due {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .task-assignee ha-icon, .task-due ha-icon {
          font-size: 1.1em;
        }
        .empty-state {
          text-align: center;
          padding: 48px 16px;
          color: var(--secondary-text-color);
          font-style: italic;
        }
        .empty-state ha-icon {
          font-size: 64px;
          opacity: 0.2;
          margin-bottom: 12px;
          display: block;
        }

        /* Dialog Styles */
        .dialog-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          backdrop-filter: blur(4px);
        }
        .dialog {
          background: var(--card-background-color);
          border-radius: 16px;
          padding: 0;
          width: 90%;
          max-width: 600px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 8px 32px rgba(0,0,0,0.3);
          animation: slideIn 0.3s ease;
        }
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-50px) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .dialog-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 24px;
          border-radius: 16px 16px 0 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .dialog-header h3 {
          margin: 0;
          font-size: 1.5em;
          font-weight: 600;
        }
        .dialog-close {
          background: rgba(255, 255, 255, 0.2);
          border: none;
          color: white;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 1.5em;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }
        .dialog-close:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: rotate(90deg);
        }
        .dialog-content {
          padding: 24px;
        }
        .form-group {
          margin-bottom: 20px;
        }
        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-weight: 600;
          color: var(--primary-text-color);
        }
        .form-group input,
        .form-group textarea,
        .form-group select {
          width: 100%;
          padding: 12px;
          border: 2px solid var(--divider-color);
          border-radius: 8px;
          font-size: 1em;
          background: var(--card-background-color);
          color: var(--primary-text-color);
          font-family: inherit;
          transition: border-color 0.2s ease;
        }
        .form-group input:focus,
        .form-group textarea:focus,
        .form-group select:focus {
          outline: none;
          border-color: var(--primary-color);
        }
        .form-group textarea {
          min-height: 100px;
          resize: vertical;
        }
        .dialog-actions {
          display: flex;
          gap: 12px;
          padding: 20px 24px;
          border-top: 1px solid var(--divider-color);
        }
        .dialog-actions button {
          flex: 1;
          padding: 14px 24px;
          border: none;
          border-radius: 8px;
          font-size: 1em;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .button-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        .button-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
        }
        .button-secondary {
          background: var(--secondary-background-color);
          color: var(--primary-text-color);
        }
        .button-secondary:hover {
          background: var(--divider-color);
        }
      </style>

      <ha-card>
        <div class="header">
          <div>
            <h2>${projectName}</h2>
            <div class="stats">📊 ${tasks.length} tasks • ${columns.length} columns</div>
          </div>
          ${this.config.show_create_button ? `
            <div class="header-actions">
              <button class="create-button" onclick="this.getRootNode().host._openCreateDialog()">
                <ha-icon icon="mdi:plus-circle"></ha-icon>
                Create Task
              </button>
            </div>
          ` : ''}
        </div>
        
        <div class="board">
          ${columns.map((col, colIndex) => {
            const isLastColumn = colIndex === columns.length - 1;
            const colTasks = tasks.filter(t => String(t.column_id) === String(col.id));
            return `
                <div class="column" data-column-id="${col.id}">
                <div class="column-header" style="background-color: ${col.color};">
                  <span>${col.name}</span>
                  <div style="display: flex; gap: 12px; align-items: center;">
                    ${isLastColumn ? `
                      <button class="clear-button" onclick="this.getRootNode().host._deleteAllTasksInColumn('${col.id}', '${col.name}', ${colTasks.length})">
                        <ha-icon icon="mdi:delete-sweep"></ha-icon>
                        Clear
                      </button>
                    ` : ''}
                    <span class="column-count">${colTasks.length}</span>
                  </div>
                </div>
                <div class="cards-container" data-column-id="${col.id}">
                  ${colTasks.length > 0 ? colTasks.map(task => {
                    const assigneeName = this._getTaskAssigneeName(task, users);
                    return `
                    <div class="task-card" 
                         draggable="true" 
                         data-task-id="${task.id}"
                         data-project-id="${projectId}"
                         ondblclick="this.getRootNode().host._openEditDialog(${JSON.stringify(task).replace(/"/g, '&quot;')})">
                      <div class="task-header">
                        <span class="task-id">#${task.id}${assigneeName ? ` • ${this._escapeHtml(assigneeName)}` : ''}</span>
                      </div>
                      <div class="task-title${isLastColumn ? ' strike' : ''}">${this._escapeHtml(task.title)}</div>
                      ${assigneeName || task.date_due ? `
                        <div class="task-meta">
                          ${assigneeName ? `
                            <div class="task-assignee">
                              <ha-icon icon="mdi:account"></ha-icon>
                              ${this._escapeHtml(assigneeName)}
                            </div>
                          ` : ''}
                          ${task.date_due ? `
                            <div class="task-due">
                              <ha-icon icon="mdi:calendar"></ha-icon>
                              ${task.date_due}
                            </div>
                          ` : ''}
                        </div>
                      ` : ''}
                    </div>
                  `}).join('') : `
                    <div class="empty-state">
                      <ha-icon icon="mdi:inbox"></ha-icon>
                      <div>No tasks</div>
                    </div>
                  `}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </ha-card>

      ${this._showDialog ? `
        <div class="dialog-overlay" onclick="if(event.target === this) this.getRootNode().host._closeCreateDialog()">
          <div class="dialog">
            <div class="dialog-header">
              <h3>Create New Task</h3>
              <button class="dialog-close" onclick="this.getRootNode().host._closeCreateDialog()">×</button>
            </div>
            <form id="create-task-form" onsubmit="event.preventDefault(); this.getRootNode().host._handleCreateTask(event);">
              <div class="dialog-content">
                <div class="form-group">
                  <label for="title">Title *</label>
                  <input type="text" id="title" name="title" required placeholder="Enter task title">
                </div>
                
                <div class="form-group">
                  <label for="description">Description</label>
                  <textarea id="description" name="description" placeholder="Add task description (optional)"></textarea>
                </div>
                
                <div class="form-group">
                  <label for="column_id">Column *</label>
                  <select id="column_id" name="column_id" required>
                    ${columns.map(col => `
                      <option value="${col.id}">${col.name}</option>
                    `).join('')}
                  </select>
                </div>
                
                <div class="form-group">
                  <label for="owner_id">Assign To</label>
                  <select id="owner_id" name="owner_id">
                    <option value="unassigned">Unassigned</option>
                    ${users
                      .map((user) => {
                        const userId = this._getUserId(user);
                        if (userId === null) {
                          return '';
                        }
                        return `<option value="${userId}">${user.name || user.username}</option>`;
                      })
                      .join('')}
                  </select>
                </div>
              </div>
              
              <div class="dialog-actions">
                <button type="button" class="button-secondary" onclick="this.getRootNode().host._closeCreateDialog()">
                  Cancel
                </button>
                <button type="submit" class="button-primary">
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      ` : ''}

      ${this._showEditDialog && this._editTask ? `
        <div class="dialog-overlay" onclick="if(event.target === this) this.getRootNode().host._closeEditDialog()">
          <div class="dialog">
            <div class="dialog-header">
              <h3>Edit Task #${this._editTask.id}</h3>
              <button class="dialog-close" onclick="this.getRootNode().host._closeEditDialog()">×</button>
            </div>
            <form id="edit-task-form" onsubmit="event.preventDefault(); this.getRootNode().host._handleUpdateTask(event);">
              <div class="dialog-content">
                <div class="form-group">
                  <label for="edit-title">Title</label>
                  <input type="text" id="edit-title" name="title" required placeholder="Task title" value="${this._escapeHtml(this._editTask.title)}">
                </div>
                
                <div class="form-group">
                  <label for="edit-description">Description</label>
                  <textarea id="edit-description" name="description" placeholder="Task description">${this._escapeHtml(this._editTask.description || '')}</textarea>
                </div>
                
                <div class="form-group">
                  <label for="edit-owner-id">Assign To</label>
                  <select id="edit-owner-id" name="owner_id">
                    <option value="unassigned">Unassigned</option>
                    ${users
                      .map((user) => {
                        const userId = this._getUserId(user);
                        if (userId === null) {
                          return '';
                        }
                        return `<option value="${userId}" ${this._getTaskOwnerId(this._editTask) === userId ? 'selected' : ''}>${user.name || user.username}</option>`;
                      })
                      .join('')}
                  </select>
                </div>
              </div>
              
              <div class="dialog-actions">
                <button type="button" class="button-secondary" onclick="this.getRootNode().host._handleDeleteTask()">
                  Delete Task
                </button>
                <button type="button" class="button-secondary" onclick="this.getRootNode().host._closeEditDialog()">
                  Cancel
                </button>
                <button type="submit" class="button-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      ` : ''}
    `;

    // Setup drag and drop handlers after rendering
    this._setupDragAndDrop();
  }

  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  _setupDragAndDrop() {
    const cards = this.shadowRoot.querySelectorAll('.task-card[draggable="true"]');
    const containers = this.shadowRoot.querySelectorAll('.cards-container');
    const columns = this.shadowRoot.querySelectorAll('.column');

    cards.forEach(card => {
      card.addEventListener('dragstart', this._handleDragStart.bind(this));
      card.addEventListener('dragend', this._handleDragEnd.bind(this));
    });

    containers.forEach(container => {
      container.addEventListener('dragover', this._handleDragOver.bind(this));
      container.addEventListener('drop', this._handleDrop.bind(this));
      container.addEventListener('dragleave', this._handleDragLeave.bind(this));
    });

    columns.forEach(column => {
      column.addEventListener('dragenter', this._handleDragEnter.bind(this));
      column.addEventListener('dragleave', this._handleDragLeave.bind(this));
    });
  }

  _handleDragStart(e) {
    this._draggedElement = e.currentTarget;
    this._draggedTask = {
      id: e.currentTarget.dataset.taskId,
      projectId: e.currentTarget.dataset.projectId
    };
    e.currentTarget.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.currentTarget.innerHTML);
  }

  _handleDragEnd(e) {
    e.currentTarget.classList.remove('dragging');
    // Remove drag-over styling from all columns
    const columns = this.shadowRoot.querySelectorAll('.column');
    columns.forEach(col => col.classList.remove('drag-over'));
  }

  _handleDragOver(e) {
    if (e.preventDefault) {
      e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    return false;
  }

  _handleDragEnter(e) {
    if (e.currentTarget.classList.contains('column')) {
      e.currentTarget.classList.add('drag-over');
    }
  }

  _handleDragLeave(e) {
    // Only remove if we're actually leaving the column
    if (e.currentTarget.classList.contains('column')) {
      const rect = e.currentTarget.getBoundingClientRect();
      if (e.clientX < rect.left || e.clientX >= rect.right ||
          e.clientY < rect.top || e.clientY >= rect.bottom) {
        e.currentTarget.classList.remove('drag-over');
      }
    }
  }

  _handleDrop(e) {
    if (e.stopPropagation) {
      e.stopPropagation();
    }
    e.preventDefault();

    // Remove drag-over styling
    const columns = this.shadowRoot.querySelectorAll('.column');
    columns.forEach(col => col.classList.remove('drag-over'));

    if (!this._draggedTask) return;

    const targetColumnId = e.currentTarget.dataset.columnId;
    // Save task info before nullifying
    const draggedTaskId = this._draggedTask.id;
    const draggedProjectId = this._draggedTask.projectId;

    // Call the move_task service
    this._hass.callService('kanboard_sync', 'move_task', {
      task_id: parseInt(draggedTaskId),
      column_id: parseInt(targetColumnId),
      project_id: parseInt(draggedProjectId)
    }).then(() => {
      // Show success notification
      this._hass.callService('persistent_notification', 'create', {
        title: 'Task Moved',
        message: `Task #${draggedTaskId} moved successfully!`,
        notification_id: `kanboard_move_${Date.now()}`
      });
    }).catch(err => {
      // Show error notification
      this._hass.callService('persistent_notification', 'create', {
        title: 'Move Failed',
        message: `Failed to move task: ${err.message}`,
        notification_id: `kanboard_error_${Date.now()}`
      });
    });

    this._draggedTask = null;
    this._draggedElement = null;

    return false;
  }
}

customElements.define('kanboard-card', KanboardCard);
