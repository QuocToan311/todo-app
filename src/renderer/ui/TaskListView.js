export class TaskListView {
  constructor({ onToggleTask, onEditTask, onDeleteTask }) {
    this.onToggleTask = onToggleTask;
    this.onEditTask = onEditTask;
    this.onDeleteTask = onDeleteTask;
    this.taskListElement = document.getElementById('taskList');

    this.taskListElement.addEventListener('change', (event) => {
      if (event.target && event.target.matches('input.task-checkbox')) {
        const taskId = event.target.dataset.taskId;
        if (taskId) this.onToggleTask(taskId);
      }
    });

    this.taskListElement.addEventListener('click', (event) => {
      const editButton = event.target.closest('button.edit-btn');
      const deleteButton = event.target.closest('button.delete-btn');
      if (editButton) {
        const taskId = editButton.dataset.taskId;
        if (taskId) this.onEditTask(taskId);
      } else if (deleteButton) {
        const taskId = deleteButton.dataset.taskId;
        if (taskId) this.onDeleteTask(taskId);
      }
    });
  }

  renderTasks(tasks, filter, searchTerm) {
    const filtered = this._filterTasks(tasks, filter, searchTerm);

    if (filtered.length === 0) {
      this.taskListElement.innerHTML = `
        <div class="empty-state">
          <h3>${tasks.length === 0 ? 'Chưa có công việc nào' : 'Không tìm thấy công việc nào'}</h3>
          <p>${tasks.length === 0 ? 'Hãy thêm công việc đầu tiên của bạn!' : 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm!'}</p>
        </div>
      `;
      return;
    }

    this.taskListElement.innerHTML = filtered.map(task => `
      <div class="task-item ${task.completed ? 'completed' : ''} priority-${task.priority}">
        <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} data-task-id="${this._getId(task)}">
        <div class="task-content">
          <div class="task-text ${task.completed ? 'completed' : ''}">${this._escapeHtml(task.text)}</div>
          <div class="task-meta">
            <span class="priority-badge priority-${task.priority}">${this._getPriorityText(task.priority)}</span>
            <span class="category-badge">${this._getCategoryText(task.category)}</span>
            <span>&#xF293; ${this._formatDate(task.createdAt)}</span>
          </div>
        </div>
        <div class="task-actions">
          <button class="action-btn edit-btn" data-task-id="${this._getId(task)}" title="Chỉnh sửa">&#xF4CA;</button>
          <button class="action-btn delete-btn" data-task-id="${this._getId(task)}" title="Xóa">&#xF78A;</button>
        </div>
      </div>
    `).join('');
  }

  updateStats(tasks) {
    const today = new Date().toDateString();
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const pending = total - completed;
    const todayTasks = tasks.filter(t => new Date(t.createdAt).toDateString() === today).length;
    const progress = total > 0 ? (completed / total) * 100 : 0;

    document.getElementById('totalTasks').textContent = total;
    document.getElementById('completedTasks').textContent = completed;
    document.getElementById('pendingTasks').textContent = pending;
    document.getElementById('todayTasks').textContent = todayTasks;
    document.getElementById('progress').style.width = progress + '%';
  }

  _filterTasks(tasks, filter, searchTerm) {
    const normalizedTerm = (searchTerm || '').toLowerCase();
    const today = new Date().toDateString();

    return tasks.filter(task => {
      const matchesSearch = task.text.toLowerCase().includes(normalizedTerm);
      const matchesFilter =
        filter === 'all' ||
        (filter === 'completed' && task.completed) ||
        (filter === 'pending' && !task.completed) ||
        (filter === 'today' && new Date(task.createdAt).toDateString() === today) ||
        (filter === task.priority) ||
        (filter === task.category);

      return matchesSearch && matchesFilter;
    });
  }

  _getId(task) {
    return task._id || task.id;
  }

  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  _getPriorityText(priority) {
    const priorities = { high: '&#xF5E3; Cao', medium: '&#xF582; TB', low: '&#xF287; Thấp' };
    return priorities[priority] || '&#xF582; TB';
  }

  _getCategoryText(category) {
    const categories = {
      personal: '&#xF4D7; Cá nhân',
      work: '&#xF172; Công việc',
      health: '&#xF415; Sức khỏe',
      study: '&#xF43D; Học tập',
      other: '&#xF4EA; Khác'
    };
    return categories[category] || '&#xF4EA; Khác';
  }

  _formatDate(date) {
    if (!date) return 'Không rõ';
    const now = new Date();
    const taskDate = new Date(date);
    const diffTime = Math.abs(now - taskDate);
    const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
    if (diffHours < 1) return 'Vừa tạo';
    if (diffHours < 24) return `${diffHours} giờ trước`;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return `${diffDays} ngày trước`;
  }
}