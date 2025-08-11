// Global variables
let currentUser = null;
let tasks = [];
let currentEditId = null;
let currentFilter = 'all';
let isLoading = false;

// Check if running in Electron
const isElectron = window.electronAPI && window.electronAPI.isElectron;

// Storage functions - use different storage based on environment
function saveToStorage(key, data) {
  if (isElectron) {
    // In Electron, we don't persist to localStorage since data is in MongoDB
    // We just keep it in memory during the session
    return;
  } else {
    localStorage.setItem(key, JSON.stringify(data));
  }
}

function getFromStorage(key) {
  if (isElectron) {
    return null; // Data comes from MongoDB
  } else {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }
}

function removeFromStorage(key) {
  if (isElectron) {
    return;
  } else {
    localStorage.removeItem(key);
  }
}

// Window control functions (Electron only)
async function minimizeWindow() {
  if (isElectron) {
    await window.electronAPI.minimizeWindow();
  }
}

async function maximizeWindow() {
  if (isElectron) {
    await window.electronAPI.maximizeWindow();
  }
}

async function closeWindow() {
  if (isElectron) {
    await window.electronAPI.closeWindow();
  }
}

// Initialize App
document.addEventListener('DOMContentLoaded', function () {
  setupEventListeners();
  checkAuthStatus();
});

function checkAuthStatus() {
  // In Electron, we don't persist auth state - user needs to login each time
  // This is more secure for a desktop app
  if (!isElectron) {
    const savedUser = getFromStorage('currentUser');
    if (savedUser && savedUser.id) {
      currentUser = savedUser;
      showApp();
      loadTasks();
      return;
    }
  }
  
  showAuth();
}

function showAuth() {
  document.getElementById('authScreen').classList.remove('hidden');
  document.getElementById('appScreen').classList.add('hidden');
}

function showApp() {
  document.getElementById('authScreen').classList.add('hidden');
  document.getElementById('appScreen').classList.remove('hidden');
  updateUserInfo();
}

function updateUserInfo() {
  if (!currentUser) return;
  
  document.getElementById('userName').textContent = currentUser.name || 'User';
  document.getElementById('userEmail').textContent = currentUser.email || '';
  const avatar = document.getElementById('userAvatar');
  avatar.textContent = (currentUser.name || 'U').charAt(0).toUpperCase();
}

// Authentication Functions
function switchTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`[onclick="switchTab('${tab}')"]`).classList.add('active');

  if (tab === 'login') {
    document.getElementById('loginForm').classList.remove('hidden');
    document.getElementById('registerForm').classList.add('hidden');
  } else {
    document.body.style.overflow = 'hidden';
    document.getElementById('loginForm').classList.add('hidden');
    document.getElementById('registerForm').classList.remove('hidden');
  }
}

async function login(email, password) {
  try {
    showLoading(true, 'loginBtn', 'Đang đăng nhập...');

    let result;
    if (isElectron) {
      result = await window.electronAPI.login(email, password);
    } else {
      // Web version would use HTTP API
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      result = await response.json();
    }

    if (!result.success) {
      throw new Error(result.error || 'Đăng nhập thất bại');
    }

    currentUser = result.user;
    
    if (!isElectron) {
      saveToStorage('currentUser', currentUser);
    }

    showSuccess('Đăng nhập thành công!');
    showApp();
    await loadTasks();
    
  } catch (error) {
    console.error('Login error:', error);
    showError(error.message);
  } finally {
    showLoading(false, 'loginBtn', 'Đăng nhập');
  }
}

async function register(name, email, password) {
  try {
    showLoading(true, 'registerBtn', 'Đang tạo tài khoản...');

    let result;
    if (isElectron) {
      result = await window.electronAPI.register(name, email, password);
    } else {
      // Web version would use HTTP API  
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      result = await response.json();
    }

    if (!result.success) {
      throw new Error(result.error || 'Đăng ký thất bại');
    }

    showSuccess('Đăng ký thành công! Vui lòng đăng nhập.');
    switchTab('login');
    document.getElementById('loginEmail').value = email;
    
  } catch (error) {
    console.error('Register error:', error);
    showError(error.message);
  } finally {
    showLoading(false, 'registerBtn', 'Đăng ký');
  }
}

function logout() {
  currentUser = null;
  tasks = [];
  removeFromStorage('currentUser');
  showAuth();
  showSuccess('Đã đăng xuất thành công!');
}

// Task Management Functions
async function loadTasks() {
  if (!currentUser || !currentUser.id) return;
  
  try {
    showLoading(true);
    
    let result;
    if (isElectron) {
      result = await window.electronAPI.getTasks(currentUser.id);
    } else {
      // Web version would use HTTP API
      const response = await fetch('/api/tasks', {
        headers: { 'Authorization': `Bearer ${getFromStorage('token')}` }
      });
      result = await response.json();
    }

    if (!result.success) {
      throw new Error(result.error || 'Không thể tải dữ liệu');
    }

    tasks = result.tasks || [];
    renderTasks();
    
  } catch (error) {
    console.error('Load tasks error:', error);
    showError(error.message);
  } finally {
    showLoading(false);
  }
}

async function addTask() {
  if (!currentUser) return;
  
  const input = document.getElementById('taskInput');
  const priority = document.getElementById('prioritySelect').value;
  const category = document.getElementById('categorySelect').value;
  const text = input.value.trim();

  if (!text) {
    showError('Vui lòng nhập nội dung công việc!');
    return;
  }

  try {
    showLoading(true);
    
    let result;
    if (isElectron) {
      result = await window.electronAPI.addTask(text, priority, category, currentUser.id);
    } else {
      // Web version would use HTTP API
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getFromStorage('token')}`
        },
        body: JSON.stringify({ text, priority, category })
      });
      result = await response.json();
    }

    if (!result.success) {
      throw new Error(result.error || 'Không thể thêm công việc');
    }

    // Add to local tasks array
    tasks.unshift(result.task);
    
    // Reset form
    input.value = '';
    document.getElementById('prioritySelect').value = 'medium';
    document.getElementById('categorySelect').value = 'personal';
    
    renderTasks();
    showSuccess('Đã thêm công việc mới!');

    // Animation effect
    setTimeout(() => {
      const firstTask = document.querySelector('.task-item');
      if (firstTask) {
        firstTask.style.animation = 'slideIn 0.5s ease';
      }
    }, 100);
    
  } catch (error) {
    console.error('Add task error:', error);
    showError(error.message);
  } finally {
    showLoading(false);
  }
}

async function toggleTask(id) {
  if (!currentUser) return;
  
  const task = tasks.find(t => getId(t) === id);
  if (!task) return;

  try {
    showLoading(true);
    
    const updates = { completed: !task.completed };
    
    let result;
    if (isElectron) {
      result = await window.electronAPI.updateTask(id, updates, currentUser.id);
    } else {
      // Web version would use HTTP API
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getFromStorage('token')}`
        },
        body: JSON.stringify(updates)
      });
      result = await response.json();
    }

    if (!result.success) {
      throw new Error(result.error || 'Không thể cập nhật trạng thái');
    }

    // Update local task
    const taskIndex = tasks.findIndex(t => getId(t) === id);
    if (taskIndex !== -1) {
      tasks[taskIndex] = result.task;
      renderTasks();
    }
    
  } catch (error) {
    console.error('Toggle task error:', error);
    showError(error.message);
  } finally {
    showLoading(false);
  }
}

async function deleteTask(id) {
  if (!currentUser) return;
  
  if (!confirm('Bạn có chắc chắn muốn xóa công việc này?')) {
    return;
  }

  try {
    showLoading(true);
    
    let result;
    if (isElectron) {
      result = await window.electronAPI.deleteTask(id, currentUser.id);
    } else {
      // Web version would use HTTP API
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getFromStorage('token')}` }
      });
      result = await response.json();
    }

    if (!result.success) {
      throw new Error(result.error || 'Không thể xóa công việc');
    }

    // Remove from local tasks array
    tasks = tasks.filter(t => getId(t) !== id);
    renderTasks();
    showSuccess('Đã xóa công việc!');
    
  } catch (error) {
    console.error('Delete task error:', error);
    showError(error.message);
  } finally {
    showLoading(false);
  }
}

function editTask(id) {
  const task = tasks.find(t => getId(t) === id);
  if (task) {
    currentEditId = id;
    document.getElementById('editTaskInput').value = task.text;
    document.getElementById('editPrioritySelect').value = task.priority;
    document.getElementById('editCategorySelect').value = task.category || 'personal';
    document.getElementById('editModal').style.display = 'block';
  }
}

async function saveEditTask() {
  if (!currentEditId || !currentUser) return;

  const updatedData = {
    text: document.getElementById('editTaskInput').value.trim(),
    priority: document.getElementById('editPrioritySelect').value,
    category: document.getElementById('editCategorySelect').value
  };

  if (!updatedData.text) {
    showError('Vui lòng nhập tên công việc!');
    return;
  }

  try {
    showLoading(true);
    
    let result;
    if (isElectron) {
      result = await window.electronAPI.updateTask(currentEditId, updatedData, currentUser.id);
    } else {
      // Web version would use HTTP API
      const response = await fetch(`/api/tasks/${currentEditId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getFromStorage('token')}`
        },
        body: JSON.stringify(updatedData)
      });
      result = await response.json();
    }

    if (!result.success) {
      throw new Error(result.error || 'Không thể cập nhật công việc');
    }

    // Update local task
    const taskIndex = tasks.findIndex(t => getId(t) === currentEditId);
    if (taskIndex !== -1) {
      tasks[taskIndex] = result.task;
      renderTasks();
      showSuccess('Đã cập nhật công việc!');
    }
    
    closeEditModal();
    
  } catch (error) {
    console.error('Save edit task error:', error);
    showError(error.message);
  } finally {
    showLoading(false);
  }
}

function closeEditModal() {
  document.getElementById('editModal').style.display = 'none';
  currentEditId = null;
}

// Event Listeners Setup
function setupEventListeners() {
  // Auth forms
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    if (!email || !password) {
      showError('Vui lòng nhập đầy đủ thông tin!');
      return;
    }
    
    await login(email, password);
  });

  document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (!name || !email || !password || !confirmPassword) {
      showError('Vui lòng nhập đầy đủ thông tin!');
      return;
    }

    if (password !== confirmPassword) {
      showError('Mật khẩu xác nhận không khớp!');
      return;
    }

    if (password.length < 6) {
      showError('Mật khẩu phải có ít nhất 6 ký tự!');
      return;
    }

    await register(name, email, password);
  });

  // Task input
  document.getElementById('taskInput').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
      addTask();
    }
  });

  // Search
  document.getElementById('searchInput').addEventListener('input', function () {
    renderTasks();
  });

  // Filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      currentFilter = this.dataset.filter;
      renderTasks();
    });
  });

  // Close modal when clicking outside
  document.getElementById('editModal').addEventListener('click', function (e) {
    if (e.target === this) {
      closeEditModal();
    }
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', function (e) {
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
          if (currentUser) {
            loadTasks();
          }
          break;
      }
    }

    if (e.key === 'Escape') {
      closeEditModal();
    }
  });
}

// Render and Filter Functions
function filterTasks() {
  const searchTerm = document.getElementById('searchInput').value.toLowerCase();
  const today = new Date().toDateString();

  return tasks.filter(task => {
    const matchesSearch = task.text.toLowerCase().includes(searchTerm);
    const matchesFilter =
      currentFilter === 'all' ||
      (currentFilter === 'completed' && task.completed) ||
      (currentFilter === 'pending' && !task.completed) ||
      (currentFilter === 'today' && new Date(task.createdAt).toDateString() === today) ||
      (currentFilter === task.priority) ||
      (currentFilter === task.category);

    return matchesSearch && matchesFilter;
  });
}

function renderTasks() {
  const filteredTasks = filterTasks();
  const taskList = document.getElementById('taskList');

  if (filteredTasks.length === 0) {
    taskList.innerHTML = `
      <div class="empty-state">
        <h3>${tasks.length === 0 ? 'Chưa có công việc nào' : 'Không tìm thấy công việc nào'}</h3>
        <p>${tasks.length === 0 ? 'Hãy thêm công việc đầu tiên của bạn!' : 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm!'}</p>
      </div>
    `;
  } else {
    taskList.innerHTML = filteredTasks.map(task => `
      <div class="task-item ${task.completed ? 'completed' : ''} priority-${task.priority}">
        <input type="checkbox" class="task-checkbox" 
               ${task.completed ? 'checked' : ''} 
               onchange="toggleTask('${getId(task)}')">
        <div class="task-content">
          <div class="task-text ${task.completed ? 'completed' : ''}">${escapeHtml(task.text)}</div>
          <div class="task-meta">
            <span class="priority-badge priority-${task.priority}">
              ${getPriorityText(task.priority)}
            </span>
            <span class="category-badge">
              ${getCategoryText(task.category)}
            </span>
            <span>&#xF293; ${formatDate(task.createdAt)}</span>
          </div>
        </div>
        <div class="task-actions">
          <button class="action-btn edit-btn" onclick="editTask('${getId(task)}')" title="Chỉnh sửa">&#xF4CA;</button>
          <button class="action-btn delete-btn" onclick="deleteTask('${getId(task)}')" title="Xóa">&#xF78A;</button>
        </div>
      </div>
    `).join('');
  }

  updateStats();
}

// Helper Functions
function getId(task) {
  return task._id || task.id;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getPriorityText(priority) {
  const priorities = {
    'high': '&#xF5E3; Cao',
    'medium': '&#xF582; TB',
    'low': '&#xF287; Thấp'
  };
  return priorities[priority] || '&#xF582; TB';
}

function getCategoryText(category) {
  const categories = {
    'personal': '&#xF4D7; Cá nhân',
    'work': '&#xF172; Công việc',
    'health': '&#xF415; Sức khỏe',
    'study': '&#xF43D; Học tập',
    'other': '&#xF4EA; Khác'
  };
  return categories[category] || '&#xF4EA; Khác';
}

function updateStats() {
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

function formatDate(date) {
  if (!date) return 'Không rõ';

  const now = new Date();
  const taskDate = new Date(date);
  const diffTime = Math.abs(now - taskDate);
  const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));

  if (diffHours < 1) {
    return 'Vừa tạo';
  } else if (diffHours < 24) {
    return `${diffHours} giờ trước`;
  } else {
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return `${diffDays} ngày trước`;
  }
}

// Notification Functions
function showLoading(show, buttonId = null, loadingText = 'Đang xử lý...') {
  isLoading = show;

  if (buttonId) {
    const button = document.getElementById(buttonId);
    if (button) {
      button.disabled = show;
      if (!button.dataset.originalText) {
        button.dataset.originalText = button.textContent;
      }
      button.textContent = show ? loadingText : button.dataset.originalText;
    }
  }

  const addBtn = document.querySelector('.add-btn');
  if (addBtn && !buttonId) {
    addBtn.disabled = show;
    addBtn.textContent = show ? 'Đang xử lý...' : 'Thêm';
  }
}

function showSuccess(message) {
  showNotification(message, 'success');
}

function showError(message) {
  showNotification(message, 'error');
}

function showNotification(message, type) {
  // Remove existing notifications
  const existing = document.querySelector('.notification');
  if (existing) {
    existing.remove();
  }

  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.style.cssText = `
    position: fixed;
    top: 60px;
    right: 20px;
    padding: 15px 20px;
    border-radius: 10px;
    color: white;
    font-weight: bold;
    z-index: 2001;
    animation: slideInRight 0.3s ease;
    max-width: 350px;
    word-wrap: break-word;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    ${type === 'success' ? 'background: linear-gradient(45deg, #27ae60, #2ecc71);' : 'background: linear-gradient(45deg, #e74c3c, #c0392b);'}
  `;
  notification.textContent = message;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'slideOutRight 0.3s ease';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 300);
  }, 4000);
}

// CSS Animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(-100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes slideInRight {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }

  @keyframes slideOutRight {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }

  .add-btn:disabled, .auth-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none !important;
  }

  .task-item {
    position: relative;
    overflow: hidden;
  }

  .task-item::after {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
    transition: left 0.5s;
  }

  .task-item:hover::after {
    left: 100%;
  }

  /* Custom scrollbar */
  .task-list::-webkit-scrollbar {
    width: 8px;
  }

  .task-list::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 10px;
  }

  .task-list::-webkit-scrollbar-thumb {
    background: linear-gradient(45deg, #667eea, #764ba2);
    border-radius: 10px;
  }

  .task-list::-webkit-scrollbar-thumb:hover {
    background: #5a67d8;
  }
`;
document.head.appendChild(style);

// Auto-refresh functionality (disabled in Electron for better performance)
if (!isElectron) {
  setInterval(() => {
    if (currentUser && !isLoading && document.visibilityState === 'visible') {
      loadTasks();
    }
  }, 300000); // Refresh every 5 minutes

  document.addEventListener('visibilitychange', () => {
    if (currentUser && document.visibilityState === 'visible' && !isLoading) {
      loadTasks();
    }
  });
}

// Show helpful shortcuts info
setTimeout(() => {
  if (currentUser) {
    showNotification('Shortcuts: Ctrl+N (Thêm), Ctrl+F (Tìm), Ctrl+R (Làm mới)', 'success');
  }
}, 3000);