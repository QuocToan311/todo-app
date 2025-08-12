import { isElectronEnv } from '../utils/env.js';
import { StorageService } from '../services/StorageService.js';
import { AuthService } from '../services/AuthService.js';
import { TaskService } from '../services/TaskService.js';
import { NotificationService } from '../ui/NotificationService.js';
import { TaskListView } from '../ui/TaskListView.js';
import { ModalView } from '../ui/ModalView.js';

export class AppController {
  constructor() {
    this.isElectron = isElectronEnv();
    this.storage = new StorageService();
    this.authService = new AuthService();
    this.taskService = new TaskService(this.storage);
    this.notifications = new NotificationService();
    this.taskListView = new TaskListView({
      onToggleTask: (id) => this.toggleTask(id),
      onEditTask: (id) => this.editTask(id),
      onDeleteTask: (id) => this.deleteTask(id)
    });
    this.modalView = new ModalView();

    this.currentUser = null;
    this.tasks = [];
    this.currentEditId = null;
    this.currentFilter = 'all';
    this.isLoading = false;
  }

  initialize() {
    document.addEventListener('DOMContentLoaded', () => {
      this._setupEventListeners();
      this.checkAuthStatus();
      this._showShortcutsHintWithDelay();
    });
  }

  async checkAuthStatus() {
    if (!this.isElectron) {
      const savedUser = this.storage.get('currentUser');
      if (savedUser && savedUser.id) {
        this.currentUser = savedUser;
        this._showApp();
        await this.loadTasks();
        return;
      }
    }
    this._showAuth();
  }

  async login(email, password) {
    try {
      this.notifications.showLoading(true, 'loginBtn', 'Đang đăng nhập...');
      const result = await this.authService.login(email, password);
      if (!result.success) throw new Error(result.error || 'Đăng nhập thất bại');
      this.currentUser = result.user;
      if (!this.isElectron) this.storage.save('currentUser', this.currentUser);
      this.notifications.showSuccess('Đăng nhập thành công!');
      this._showApp();
      await this.loadTasks();
    } catch (error) {
      console.error('Login error:', error);
      this.notifications.showError(error.message);
    } finally {
      this.notifications.showLoading(false, 'loginBtn', 'Đăng nhập');
    }
  }

  async register(name, email, password) {
    try {
      this.notifications.showLoading(true, 'registerBtn', 'Đang tạo tài khoản...');
      const result = await this.authService.register(name, email, password);
      if (!result.success) throw new Error(result.error || 'Đăng ký thất bại');
      this.notifications.showSuccess('Đăng ký thành công! Vui lòng đăng nhập.');
      this.switchTab('login');
      document.getElementById('loginEmail').value = email;
    } catch (error) {
      console.error('Register error:', error);
      this.notifications.showError(error.message);
    } finally {
      this.notifications.showLoading(false, 'registerBtn', 'Đăng ký');
    }
  }

  logout() {
    this.currentUser = null;
    this.tasks = [];
    this.storage.remove('currentUser');
    this._showAuth();
    this.notifications.showSuccess('Đã đăng xuất thành công!');
  }

  async loadTasks() {
    if (!this.currentUser || !this.currentUser.id) return;
    try {
      this.notifications.showLoading(true);
      const result = await this.taskService.getTasks(this.currentUser.id);
      if (!result.success) throw new Error(result.error || 'Không thể tải dữ liệu');
      this.tasks = result.tasks || [];
      this._render();
    } catch (error) {
      console.error('Load tasks error:', error);
      this.notifications.showError(error.message);
    } finally {
      this.notifications.showLoading(false);
    }
  }

  async addTask() {
    if (!this.currentUser) return;
    const input = document.getElementById('taskInput');
    const text = input.value.trim();
    const priority = document.getElementById('prioritySelect').value;
    const category = document.getElementById('categorySelect').value;
    if (!text) {
      this.notifications.showError('Vui lòng nhập nội dung công việc!');
      return;
    }
    try {
      this.notifications.showLoading(true);
      const result = await this.taskService.addTask(text, priority, category, this.currentUser.id);
      if (!result.success) throw new Error(result.error || 'Không thể thêm công việc');
      this.tasks.unshift(result.task);
      input.value = '';
      document.getElementById('prioritySelect').value = 'medium';
      document.getElementById('categorySelect').value = 'personal';
      this._render();
      this.notifications.showSuccess('Đã thêm công việc mới!');
      setTimeout(() => {
        const firstTask = document.querySelector('.task-item');
        if (firstTask) firstTask.style.animation = 'slideIn 0.5s ease';
      }, 100);
    } catch (error) {
      console.error('Add task error:', error);
      this.notifications.showError(error.message);
    } finally {
      this.notifications.showLoading(false);
    }
  }

  async toggleTask(id) {
    if (!this.currentUser) return;
    const task = this.tasks.find(t => this._getId(t) === id);
    if (!task) return;
    try {
      this.notifications.showLoading(true);
      const updates = { completed: !task.completed };
      const result = await this.taskService.updateTask(id, updates, this.currentUser.id);
      if (!result.success) throw new Error(result.error || 'Không thể cập nhật trạng thái');
      const index = this.tasks.findIndex(t => this._getId(t) === id);
      if (index !== -1) {
        this.tasks[index] = result.task;
        this._render();
      }
    } catch (error) {
      console.error('Toggle task error:', error);
      this.notifications.showError(error.message);
    } finally {
      this.notifications.showLoading(false);
    }
  }

  async deleteTask(id) {
    if (!this.currentUser) return;
    if (!confirm('Bạn có chắc chắn muốn xóa công việc này?')) return;
    try {
      this.notifications.showLoading(true);
      const result = await this.taskService.deleteTask(id, this.currentUser.id);
      if (!result.success) throw new Error(result.error || 'Không thể xóa công việc');
      this.tasks = this.tasks.filter(t => this._getId(t) !== id);
      this._render();
      this.notifications.showSuccess('Đã xóa công việc!');
    } catch (error) {
      console.error('Delete task error:', error);
      this.notifications.showError(error.message);
    } finally {
      this.notifications.showLoading(false);
    }
  }

  editTask(id) {
    const task = this.tasks.find(t => this._getId(t) === id);
    if (!task) return;
    this.currentEditId = id;
    this.modalView.open(task);
  }

  async saveEditTask() {
    if (!this.currentEditId || !this.currentUser) return;
    const updatedData = this.modalView.getUpdatedData();
    if (!updatedData.text) {
      this.notifications.showError('Vui lòng nhập tên công việc!');
      return;
    }
    try {
      this.notifications.showLoading(true);
      const result = await this.taskService.updateTask(this.currentEditId, updatedData, this.currentUser.id);
      if (!result.success) throw new Error(result.error || 'Không thể cập nhật công việc');
      const index = this.tasks.findIndex(t => this._getId(t) === this.currentEditId);
      if (index !== -1) {
        this.tasks[index] = result.task;
        this._render();
        this.notifications.showSuccess('Đã cập nhật công việc!');
      }
      this.closeEditModal();
    } catch (error) {
      console.error('Save edit task error:', error);
      this.notifications.showError(error.message);
    } finally {
      this.notifications.showLoading(false);
    }
  }

  closeEditModal() {
    this.modalView.close();
    this.currentEditId = null;
  }

  switchTab(tab) {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    const tabButton = document.querySelector(`[onclick="switchTab('${tab}')"]`);
    if (tabButton) tabButton.classList.add('active');
    if (tab === 'login') {
      document.getElementById('loginForm').classList.remove('hidden');
      document.getElementById('registerForm').classList.add('hidden');
    } else {
      document.body.style.overflow = 'hidden';
      document.getElementById('loginForm').classList.add('hidden');
      document.getElementById('registerForm').classList.remove('hidden');
    }
  }

  setFilter(filter) {
    this.currentFilter = filter;
    this._render();
  }

  _render() {
    const searchTerm = document.getElementById('searchInput').value;
    this.taskListView.renderTasks(this.tasks, this.currentFilter, searchTerm);
    this.taskListView.updateStats(this.tasks);
  }

  _setupEventListeners() {
    // Auth forms
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('loginEmail').value.trim();
      const password = document.getElementById('loginPassword').value;
      if (!email || !password) {
        this.notifications.showError('Vui lòng nhập đầy đủ thông tin!');
        return;
      }
      await this.login(email, password);
    });

    document.getElementById('registerForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('registerName').value.trim();
      const email = document.getElementById('registerEmail').value.trim();
      const password = document.getElementById('registerPassword').value;
      const confirmPassword = document.getElementById('confirmPassword').value;
      if (!name || !email || !password || !confirmPassword) {
        this.notifications.showError('Vui lòng nhập đầy đủ thông tin!');
        return;
      }
      if (password !== confirmPassword) {
        this.notifications.showError('Mật khẩu xác nhận không khớp!');
        return;
      }
      if (password.length < 6) {
        this.notifications.showError('Mật khẩu phải có ít nhất 6 ký tự!');
        return;
      }
      await this.register(name, email, password);
    });

    // Task input enter key
    document.getElementById('taskInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.addTask();
    });

    // Search
    document.getElementById('searchInput').addEventListener('input', () => this._render());

    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.setFilter(btn.dataset.filter);
      });
    });

    // Close modal on outside click
    document.getElementById('editModal').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) this.closeEditModal();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'n':
            e.preventDefault();
            document.getElementById('taskInput').focus();
            break;
          case 'f':
            e.preventDefault();
            document.getElementById('searchInput').focus();
            break;
          case 'r':
            e.preventDefault();
            if (this.currentUser) this.loadTasks();
            break;
        }
      }
      if (e.key === 'Escape') this.closeEditModal();
    });

    // Add button click (inline handler also exists)
    const addButton = document.querySelector('.add-btn');
    if (addButton) {
      addButton.addEventListener('click', () => this.addTask());
    }

    // Save button in modal
    const saveButtons = document.querySelectorAll('#editModal .auth-btn');
    saveButtons.forEach(btn => btn.addEventListener('click', () => this.saveEditTask()));
  }

  _showAuth() {
    document.getElementById('authScreen').classList.remove('hidden');
    document.getElementById('appScreen').classList.add('hidden');
  }

  _showApp() {
    document.getElementById('authScreen').classList.add('hidden');
    document.getElementById('appScreen').classList.remove('hidden');
    this._updateUserInfo();
  }

  _updateUserInfo() {
    if (!this.currentUser) return;
    document.getElementById('userName').textContent = this.currentUser.name || 'User';
    document.getElementById('userEmail').textContent = this.currentUser.email || '';
    const avatar = document.getElementById('userAvatar');
    avatar.textContent = (this.currentUser.name || 'U').charAt(0).toUpperCase();
  }

  _getId(task) {
    return task._id || task.id;
  }

  _showShortcutsHintWithDelay() {
    setTimeout(() => {
      if (this.currentUser) {
        this.notifications.showNotification('Shortcuts: Ctrl+N (Thêm), Ctrl+F (Tìm), Ctrl+R (Làm mới)', 'success');
      }
    }, 3000);
  }
}