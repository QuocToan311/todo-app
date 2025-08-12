import { AppController } from './controllers/AppController.js';
import { isElectronEnv } from './utils/env.js';

const appController = new AppController();
appController.initialize();

// Expose functions used by inline HTML attributes for backward compatibility
window.switchTab = (tab) => appController.switchTab(tab);
window.addTask = () => appController.addTask();
window.editTask = (id) => appController.editTask(id);
window.saveEditTask = () => appController.saveEditTask();
window.closeEditModal = () => appController.closeEditModal();
window.toggleTask = (id) => appController.toggleTask(id);
window.deleteTask = (id) => appController.deleteTask(id);
window.logout = () => appController.logout();

// Window controls (Electron only)
window.minimizeWindow = async () => {
  if (isElectronEnv()) {
    await window.electronAPI.minimizeWindow();
  }
};

window.maximizeWindow = async () => {
  if (isElectronEnv()) {
    await window.electronAPI.maximizeWindow();
  }
};

window.closeWindow = async () => {
  if (isElectronEnv()) {
    await window.electronAPI.closeWindow();
  }
};