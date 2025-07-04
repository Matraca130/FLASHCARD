import { api } from '../apiClient.js';
import { store } from '../store/store.js';
import { loadDashboardData } from './dashboard.service.js';

export async function checkAuthStatus() {
  const token = localStorage.getItem('authToken');
  if (!token) return;
  try {
    const data = await api('/api/auth/verify');
    if (data && data.user) {
      store.setState({ currentUser: data.user });
      if (window.updateAuthUI) window.updateAuthUI();
      await loadDashboardData();
    } else {
      localStorage.removeItem('authToken');
    }
  } catch (error) {
    console.error('Auth verification failed:', error);
    localStorage.removeItem('authToken');
  }
}

export async function login(email, password) {
  if (!email || !password) {
    if (window.showNotification) window.showNotification('Por favor, completa todos los campos', 'error');
    return;
  }
  try {
    const data = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    localStorage.setItem('authToken', data.token);
    store.setState({ currentUser: data.user });
    if (window.updateAuthUI) window.updateAuthUI();
    if (window.hideLoginModal) window.hideLoginModal();
    await loadDashboardData();
  } catch (error) {
    console.error('Login failed:', error);
    if (window.showNotification) {
      const msg = (error && error.message) || 'Error al iniciar sesión';
      window.showNotification(msg, 'error');
    }
  }
}

export function logout() {
  localStorage.removeItem('authToken');
  store.setState({ currentUser: null });
  if (window.updateAuthUI) window.updateAuthUI();
  if (window.showSection) window.showSection('inicio');
}window.checkAuthStatus = checkAuthStatus;