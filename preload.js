const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimizeWindow: () => ipcRenderer.invoke('window-minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window-maximize'),
  closeWindow: () => ipcRenderer.invoke('window-close'),
  
  // Authentication
  login: (email, password) => ipcRenderer.invoke('auth-login', { email, password }),
  register: (name, email, password) => ipcRenderer.invoke('auth-register', { name, email, password }),
  
  // Task management
  getTasks: (userId) => ipcRenderer.invoke('tasks-get', userId),
  addTask: (text, priority, category, userId) => ipcRenderer.invoke('tasks-add', { text, priority, category, userId }),
  updateTask: (taskId, updates, userId) => ipcRenderer.invoke('tasks-update', { taskId, updates, userId }),
  deleteTask: (taskId, userId) => ipcRenderer.invoke('tasks-delete', { taskId, userId }),
  
  // Utility
  isElectron: true
});