import { isElectronEnv } from '../utils/env.js';

export class TaskService {
  constructor(storageService) {
    this.isElectron = isElectronEnv();
    this.storage = storageService;
  }

  async getTasks(userId) {
    if (this.isElectron) {
      return await window.electronAPI.getTasks(userId);
    }
    const response = await fetch('/api/tasks', {
      headers: { 'Authorization': `Bearer ${this.storage.get('token')}` }
    });
    return await response.json();
  }

  async addTask(text, priority, category, userId) {
    if (this.isElectron) {
      return await window.electronAPI.addTask(text, priority, category, userId);
    }
    const response = await fetch('/api/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.storage.get('token')}`
      },
      body: JSON.stringify({ text, priority, category })
    });
    return await response.json();
  }

  async updateTask(taskId, updates, userId) {
    if (this.isElectron) {
      return await window.electronAPI.updateTask(taskId, updates, userId);
    }
    const response = await fetch(`/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.storage.get('token')}`
      },
      body: JSON.stringify(updates)
    });
    return await response.json();
  }

  async deleteTask(taskId, userId) {
    if (this.isElectron) {
      return await window.electronAPI.deleteTask(taskId, userId);
    }
    const response = await fetch(`/api/tasks/${taskId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${this.storage.get('token')}` }
    });
    return await response.json();
  }
}