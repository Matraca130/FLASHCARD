import { ApiClient } from './apiClient.js';
import { store } from './store/store.js';
import { loadDashboardData } from './dashboard.service.js';
import {
  validateLoginCredentials,
  validateRegistrationData,
} from './utils/validation.js';
import { performCrudOperation } from './utils/apiHelpers.js';
import { showNotification } from './utils/helpers.js';

/**
 * Verifica el estado de autenticación del usuario
 */
export async function checkAuthStatus() {
  const token = ApiClient.getAuthToken();
  if (!token) {
    return;
  }

  try {
    const data = await ApiClient.get('/api/auth/verify');
    if (data && data.user) {
      store.setState({ currentUser: data.user });
      if (window.updateAuthUI) {
        window.updateAuthUI();
      }
      await loadDashboardData();
    } else {
      ApiClient.removeAuthToken();
      store.setState({ currentUser: null });
    }
  } catch (error) {
    console.error('Auth verification failed:', error);
    ApiClient.removeAuthToken();
    store.setState({ currentUser: null });
  }
}

/**
 * Inicia sesión de usuario
 * @param {string} email - Email del usuario
 * @param {string} password - Contraseña del usuario
 */
export async function login(email, password) {
  if (!validateLoginCredentials(email, password)) {
    return;
  }

  try {
    const result = await performCrudOperation(
      () =>
        ApiClient.post('/api/auth/login', { email, password }),
      'Sesión iniciada exitosamente',
      'Error al iniciar sesión'
    );

    ApiClient.setAuthToken(result.token, result.refresh_token);
    store.setState({ currentUser: result.user });

    if (window.updateAuthUI) {
      window.updateAuthUI();
    }
    if (window.hideLoginModal) {
      window.hideLoginModal();
    }

    await loadDashboardData();
  } catch (error) {
    console.error('Login failed:', error);
  }
}

/**
 * Registra un nuevo usuario
 * @param {string} email - Email del usuario
 * @param {string} password - Contraseña del usuario
 * @param {string} confirmPassword - Confirmación de contraseña
 * @param {string} name - Nombre del usuario (opcional)
 */
export async function register(email, password, confirmPassword, name = '') {
  if (!validateRegistrationData(email, password, confirmPassword)) {
    return;
  }

  try {
    const result = await performCrudOperation(
      () =>
        ApiClient.post('/api/auth/register', { email, password, name }),
      'Cuenta creada exitosamente',
      'Error al crear la cuenta'
    );

    await login(email, password);
  } catch (error) {
    console.error('Registration failed:', error);
  }
}

/**
 * Cierra la sesión del usuario
 */
export function logout() {
  ApiClient.removeAuthToken();
  store.setState({ currentUser: null });

  if (window.updateAuthUI) {
    window.updateAuthUI();
  }
  if (window.showSection) {
    window.showSection('inicio');
  }

  showNotification('Sesión cerrada', 'info');
}

/**
 * Obtiene el token de autenticación actual
 * @returns {string|null} - Token de autenticación o null
 */
export function getAuthToken() {
  return ApiClient.getAuthToken();
}

/**
 * Verifica si el usuario está autenticado
 * @returns {boolean} - true si está autenticado
 */
export function isAuthenticated() {
  return ApiClient.isAuthenticated() && !!store.getState().currentUser;
}

/**
 * Obtiene el usuario actual
 * @returns {Object|null} - Datos del usuario actual o null
 */
export function getCurrentUser() {
  return store.getState().currentUser;
}

// Mantener compatibilidad con código existente
window.checkAuthStatus = checkAuthStatus;


