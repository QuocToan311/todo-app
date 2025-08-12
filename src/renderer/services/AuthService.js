import { isElectronEnv } from '../utils/env.js';

export class AuthService {
  constructor() {
    this.isElectron = isElectronEnv();
  }

  async login(email, password) {
    if (this.isElectron) {
      return await window.electronAPI.login(email, password);
    }

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    return await response.json();
  }

  async register(name, email, password) {
    if (this.isElectron) {
      return await window.electronAPI.register(name, email, password);
    }

    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    return await response.json();
  }
}