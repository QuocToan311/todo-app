import { isElectronEnv } from '../utils/env.js';

export class StorageService {
  constructor() {
    this.isElectron = isElectronEnv();
  }

  save(key, value) {
    if (this.isElectron) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Storage save error:', error);
    }
  }

  get(key) {
    if (this.isElectron) return null;
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Storage get error:', error);
      return null;
    }
  }

  remove(key) {
    if (this.isElectron) return;
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Storage remove error:', error);
    }
  }
}