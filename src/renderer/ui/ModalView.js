export class ModalView {
  constructor() {
    this.modal = document.getElementById('editModal');
    this.input = document.getElementById('editTaskInput');
    this.prioritySelect = document.getElementById('editPrioritySelect');
    this.categorySelect = document.getElementById('editCategorySelect');
  }

  open(task) {
    this.input.value = task.text;
    this.prioritySelect.value = task.priority;
    this.categorySelect.value = task.category || 'personal';
    this.modal.style.display = 'block';
  }

  close() {
    this.modal.style.display = 'none';
  }

  getUpdatedData() {
    return {
      text: this.input.value.trim(),
      priority: this.prioritySelect.value,
      category: this.categorySelect.value
    };
  }
}