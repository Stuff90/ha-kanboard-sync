/**
 * Kanboard Custom Card - Ultra-minimal version
 * Works with Home Assistant Lovelace cards
 */

class KanboardCard extends HTMLElement {
  setConfig(config) {
    if (!config.entity) {
      throw new Error('entity is required');
    }
    this.config = config;
  }

  set hass(hass) {
    this._hass = hass;
    const stateObj = hass.states[this.config.entity];

    if (!stateObj) {
      this.innerHTML = `<ha-card><div style="padding:16px">Entity ${this.config.entity} not found</div></ha-card>`;
      return;
    }

    const attrs = stateObj.attributes;
    const tasks = attrs.tasks || [];
    const columns = attrs.columns || [];
    const projectName = attrs.name || 'Kanboard';

    let html = `<ha-card><div style="padding:16px">`;
    html += `<h2 style="margin:0 0 16px 0">${projectName}</h2>`;

    if (columns.length === 0) {
      html += `<div style="color:#666">No columns</div>`;
    } else {
      html += `<div style="display:flex; gap:8px; overflow-x:auto">`;

      columns.forEach(col => {
        const colTasks = tasks.filter(t => parseInt(t.column_id) === parseInt(col.id));
        html += `<div style="flex-shrink:0; width:250px; background:#f0f0f0; border-radius:4px; padding:8px">`;
        html += `<h3 style="margin:0 0 8px 0; color:${col.color || '#333'}">${col.title || col.name}</h3>`;

        if (colTasks.length === 0) {
          html += `<div style="color:#999; font-size:0.9em">No tasks</div>`;
        } else {
          colTasks.forEach(task => {
            html += `<div style="background:#fff; padding:8px; margin:4px 0; border-radius:2px; font-size:0.9em">`;
            html += `<strong>#${task.id}</strong> ${task.title}`;
            html += `</div>`;
          });
        }

        html += `</div>`;
      });

      html += `</div>`;
    }

    html += `</div></ha-card>`;
    this.innerHTML = html;
  }

  getCardSize() {
    return 5;
  }
}

window.customElements.define('kanboard-card', KanboardCard);


