import { api } from './apiClient.js';
import { store } from './store/store.js';
import { loadDashboardData } from './dashboard.service.js';
import { validateLoginCredentials, validateRegistrationData } from './utils/validation.js';
import { performCrudOperation } from './utils/apiHelpers.js';
import { showNotification } from './utils/helpers.js';

/**
 * Verifica el estado de autenticación del usuario
 */
export async function checkAuthStatus() {
  const token = localStorage.getItem('authToken');
  if (!token) {return;}
  
  try {
    const data = await api('/api/auth/verify');
    if (data && data.user) {
      store.setState({ currentUser: data.user });
      if (window.updateAuthUI) {window.updateAuthUI();}
      await loadDashboardData();
    } else {
      clearAuthData();
    }
  } catch (error) {
    console.error('Auth verification failed:', error);
    clearAuthData();
  }
}

/**
 * Inicia sesión de usuario
 * @param {string} email - Email del usuario
 * @param {string} password - Contraseña del usuario
 */
export async function login(email, password) {
  // Validar credenciales usando utilidad común
  if (!validateLoginCredentials(email, password)) {
    return;
  }
  
  try {
    const result = await performCrudOperation(
      () => api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      }),
      'Sesión iniciada exitosamente',
      'Error al iniciar sesión'
    );
    
    // Guardar token y datos de usuario
    localStorage.setItem('authToken', result.token);
    store.setState({ currentUser: result.user });
    
    // Actualizar UI
    if (window.updateAuthUI) {window.updateAuthUI();}
    if (window.hideLoginModal) {window.hideLoginModal();}
    
    // Cargar datos del dashboard
    await loadDashboardData();
    
  } catch (error) {
    console.error('Login failed:', error);
    // El error ya fue manejado por performCrudOperation
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
  // Validar datos de registro usando utilidad común
  if (!validateRegistrationData(email, password, confirmPassword)) {
    return;
  }
  
  try {
    const result = await performCrudOperation(
      () => api('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, name })
      }),
      'Cuenta creada exitosamente',
      'Error al crear la cuenta'
    );
    
    // Auto-login después del registro
    await login(email, password);
    
  } catch (error) {
    console.error('Registration failed:', error);
    // El error ya fue manejado por performCrudOperation
  }
}

/**
 * Cierra la sesión del usuario
 */
export function logout() {
  clearAuthData();
  
  // Actualizar UI
  if (window.updateAuthUI) {window.updateAuthUI();}
  if (window.showSection) {window.showSection('inicio');}
  
  showNotification('Sesión cerrada', 'info');
}

/**
 * Limpia todos los datos de autenticación
 */
function clearAuthData() {
  localStorage.removeItem('authToken');
  store.setState({ currentUser: null });
}

/**
 * Obtiene el token de autenticación actual
 * @returns {string|null} - Token de autenticación o null
 */
export function getAuthToken() {
  return localStorage.getItem('authToken');
}

/**
 * Verifica si el usuario está autenticado
 * @returns {boolean} - true si está autenticado
 */
export function isAuthenticated() {
  return !!getAuthToken() && !!store.getState().currentUser;
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

