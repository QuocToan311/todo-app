export class NotificationService {
  constructor() {
    this.injectStyles();
  }

  showLoading(show, buttonId = null, loadingText = 'Đang xử lý...') {
    const button = buttonId ? document.getElementById(buttonId) : null;
    if (button) {
      button.disabled = show;
      if (!button.dataset.originalText) {
        button.dataset.originalText = button.textContent;
      }
      button.textContent = show ? loadingText : button.dataset.originalText;
    }

    const addButton = document.querySelector('.add-btn');
    if (addButton && !buttonId) {
      addButton.disabled = show;
      addButton.textContent = show ? 'Đang xử lý...' : 'Thêm';
    }
  }

  showSuccess(message) {
    this.showNotification(message, 'success');
  }

  showError(message) {
    this.showNotification(message, 'error');
  }

  showNotification(message, type) {
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();

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
        if (notification.parentNode) notification.remove();
      }, 300);
    }, 4000);
  }

  injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn { from { transform: translateX(-100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      @keyframes slideOutRight { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
      .add-btn:disabled, .auth-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none !important; }
      .task-item { position: relative; overflow: hidden; }
      .task-item::after { content: ''; position: absolute; top: 0; left: -100%; width: 100%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent); transition: left 0.5s; }
      .task-item:hover::after { left: 100%; }
      .task-list::-webkit-scrollbar { width: 8px; }
      .task-list::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 10px; }
      .task-list::-webkit-scrollbar-thumb { background: linear-gradient(45deg, #667eea, #764ba2); border-radius: 10px; }
      .task-list::-webkit-scrollbar-thumb:hover { background: #5a67d8; }
    `;
    document.head.appendChild(style);
  }
}