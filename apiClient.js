import { showNotification } from './utils/helpers.js';

/**
 * Cliente API refactorizado para StudyingFlash
 * Maneja autenticación, requests y manejo de errores centralizado
 */

// Configuración de la API
const API_CONFIG = {
  baseUrl: window.location.hostname === 'localhost' 
    ? 'http://localhost:5000' 
    : 'https://flashcard-u10n.onrender.com',
  timeout: 30000, // 30 segundos
  retryAttempts: 3,
  retryDelay: 1000, // 1 segundo
  authTokenKey: 'studyingflash_auth_token',
  refreshTokenKey: 'studyingflash_refresh_token'
};

// Estado del cliente
let isRefreshingToken = false;
let failedQueue = [];

/**
 * Clase principal del cliente API
 */
export class ApiClient {
  
  // MÉTODOS DE AUTENTICACIÓN
  
  /**
   * Obtiene el token de autenticación
   * @returns {string|null} - Token de autenticación
   */
  static getAuthToken() {
    return localStorage.getItem(API_CONFIG.authTokenKey);
  }

  /**
   * Establece el token de autenticación
   * @param {string} token - Token de autenticación
   * @param {string} refreshToken - Token de renovación (opcional)
   */
  static setAuthToken(token, refreshToken = null) {
    if (token) {
      localStorage.setItem(API_CONFIG.authTokenKey, token);
    }
    if (refreshToken) {
      localStorage.setItem(API_CONFIG.refreshTokenKey, refreshToken);
    }
  }

  /**
   * Elimina los tokens de autenticación
   */
  static removeAuthToken() {
    localStorage.removeItem(API_CONFIG.authTokenKey);
    localStorage.removeItem(API_CONFIG.refreshTokenKey);
  }

  /**
   * Verifica si el usuario está autenticado
   * @returns {boolean} - Estado de autenticación
   */
  static isAuthenticated() {
    const token = this.getAuthToken();
    if (!token) {return false;}
    
    try {
      // Verificar si el token no ha expirado (básico)
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Date.now() / 1000;
      return payload.exp > now;
    } catch (error) {
      console.warn('Error verificando token:', error);
      return false;
    }
  }

  /**
   * Obtiene headers de autenticación
   * @param {Object} additionalHeaders - Headers adicionales
   * @returns {Object} - Headers completos
   */
  static getAuthHeaders(additionalHeaders = {}) {
    const token = this.getAuthToken();
    const baseHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...additionalHeaders
    };

    if (token) {
      baseHeaders.Authorization = `Bearer ${token}`;
    }

    return baseHeaders;
  }

  // MÉTODOS HTTP PRINCIPALES

  /**
   * Realiza una petición GET
   * @param {string} endpoint - Endpoint de la API
   * @param {Object} options - Opciones adicionales
   * @returns {Promise<Object>} - Respuesta de la API
   */
  static async get(endpoint, options = {}) {
    return this.request(endpoint, {
      method: 'GET',
      ...options
    });
  }

  /**
   * Realiza una petición POST
   * @param {string} endpoint - Endpoint de la API
   * @param {Object} data - Datos a enviar
   * @param {Object} options - Opciones adicionales
   * @returns {Promise<Object>} - Respuesta de la API
   */
  static async post(endpoint, data = null, options = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : null,
      ...options
    });
  }

  /**
   * Realiza una petición PUT
   * @param {string} endpoint - Endpoint de la API
   * @param {Object} data - Datos a enviar
   * @param {Object} options - Opciones adicionales
   * @returns {Promise<Object>} - Respuesta de la API
   */
  static async put(endpoint, data = null, options = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : null,
      ...options
    });
  }

  /**
   * Realiza una petición PATCH
   * @param {string} endpoint - Endpoint de la API
   * @param {Object} data - Datos a enviar
   * @param {Object} options - Opciones adicionales
   * @returns {Promise<Object>} - Respuesta de la API
   */
  static async patch(endpoint, data = null, options = {}) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : null,
      ...options
    });
  }

  /**
   * Realiza una petición DELETE
   * @param {string} endpoint - Endpoint de la API
   * @param {Object} options - Opciones adicionales
   * @returns {Promise<Object>} - Respuesta de la API
   */
  static async delete(endpoint, options = {}) {
    return this.request(endpoint, {
      method: 'DELETE',
      ...options
    });
  }

  // MÉTODO PRINCIPAL DE REQUEST

  /**
   * Método principal para realizar peticiones HTTP
   * @param {string} endpoint - Endpoint de la API
   * @param {Object} options - Opciones de la petición
   * @returns {Promise<Object>} - Respuesta de la API
   */
  static async request(endpoint, options = {}) {
    const {
      method = 'GET',
      body = null,
      headers = {},
      timeout = API_CONFIG.timeout,
      retries = API_CONFIG.retryAttempts,
      showNotifications = true,
      ...fetchOptions
    } = options;

    const url = `${API_CONFIG.baseUrl}${endpoint}`;
    const requestHeaders = this.getAuthHeaders(headers);

    const requestOptions = {
      method,
      headers: requestHeaders,
      body,
      ...fetchOptions
    };

    // Implementar timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    requestOptions.signal = controller.signal;

    try {
      const response = await this.executeRequestWithRetry(url, requestOptions, retries);
      clearTimeout(timeoutId);

      // Manejar respuestas según status
      return await this.handleResponse(response, endpoint, showNotifications);

    } catch (error) {
      clearTimeout(timeoutId);
      return this.handleError(error, endpoint, showNotifications);
    }
  }

  /**
   * Ejecuta una petición con reintentos automáticos
   * @param {string} url - URL completa
   * @param {Object} options - Opciones de fetch
   * @param {number} retries - Número de reintentos
   * @returns {Promise<Response>} - Respuesta de fetch
   */
  static async executeRequestWithRetry(url, options, retries) {
    let lastError;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, options);
        
        // Si la respuesta es exitosa o es un error del cliente (4xx), no reintentar
        if (response.ok || (response.status >= 400 && response.status < 500)) {
          return response;
        }
        
        // Error del servidor (5xx), reintentar
        throw new Error(`Server error: ${response.status}`);

      } catch (error) {
        lastError = error;
        
        // Si es el último intento, lanzar error
        if (attempt === retries) {
          throw error;
        }
        
        // Esperar antes del siguiente intento
        await this.delay(API_CONFIG.retryDelay * (attempt + 1));
        console.log(`Reintentando petición (${attempt + 1}/${retries}):`, url);
      }
    }

    throw lastError;
  }

  /**
   * Maneja la respuesta de la API
   * @param {Response} response - Respuesta de fetch
   * @param {string} endpoint - Endpoint original
   * @param {boolean} showNotifications - Mostrar notificaciones
   * @returns {Promise<Object>} - Datos procesados
   */
  static async handleResponse(response, endpoint, showNotifications) {
    // Manejar autenticación
    if (response.status === 401) {
      return this.handleUnauthorized(endpoint);
    }

    // Manejar errores del cliente
    if (response.status >= 400 && response.status < 500) {
      const errorData = await this.safeJsonParse(response);
      const errorMessage = errorData.message || `Error ${response.status}`;
      
      if (showNotifications) {
        showNotification(errorMessage, 'error');
      }
      
      return { 
        error: true, 
        status: response.status,
        message: errorMessage,
        data: errorData 
      };
    }

    // Manejar errores del servidor
    if (response.status >= 500) {
      const errorMessage = `Error del servidor (${response.status})`;
      
      if (showNotifications) {
        showNotification(errorMessage, 'error');
      }
      
      return { 
        error: true, 
        status: response.status,
        message: errorMessage 
      };
    }

    // Respuesta exitosa
    const data = await this.safeJsonParse(response);
    return { 
      error: false, 
      status: response.status,
      data: data 
    };
  }

  /**
   * Maneja errores de red y otros errores
   * @param {Error} error - Error capturado
   * @param {string} endpoint - Endpoint original
   * @param {boolean} showNotifications - Mostrar notificaciones
   * @returns {Object} - Objeto de error
   */
  static handleError(error, endpoint, showNotifications) {
    let errorMessage = 'Error de conexión';
    
    if (error.name === 'AbortError') {
      errorMessage = 'Tiempo de espera agotado';
    } else if (error.message.includes('Failed to fetch')) {
      errorMessage = 'Sin conexión a internet';
    } else {
      errorMessage = error.message || 'Error desconocido';
    }

    console.error(`API Error [${endpoint}]:`, error);
    
    if (showNotifications) {
      showNotification(errorMessage, 'error');
    }

    return { 
      error: true, 
      message: errorMessage,
      networkError: true 
    };
  }

  /**
   * Maneja respuestas no autorizadas (401)
   * @param {string} endpoint - Endpoint original
   * @returns {Promise<Object>} - Resultado del manejo
   */
  static async handleUnauthorized(endpoint) {
    // Si ya estamos renovando el token, agregar a la cola
    if (isRefreshingToken) {
      return new Promise((resolve) => {
        failedQueue.push({ resolve, endpoint });
      });
    }

    const refreshToken = localStorage.getItem(API_CONFIG.refreshTokenKey);
    
    if (!refreshToken) {
      this.logout();
      return { error: true, message: 'Sesión expirada', unauthorized: true };
    }

    // Intentar renovar el token
    isRefreshingToken = true;
    
    try {
      const refreshResponse = await fetch(`${API_CONFIG.baseUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken })
      });

      if (refreshResponse.ok) {
        const { access_token, refresh_token } = await refreshResponse.json();
        this.setAuthToken(access_token, refresh_token);
        
        // Procesar cola de peticiones fallidas
        failedQueue.forEach(({ resolve, endpoint: queuedEndpoint }) => {
          resolve(this.request(queuedEndpoint));
        });
        failedQueue = [];
        
        // Reintentar petición original
        return this.request(endpoint);
      } else {
        throw new Error('Token refresh failed');
      }
      
    } catch (error) {
      console.error('Error renovando token:', error);
      this.logout();
      return { error: true, message: 'Sesión expirada', unauthorized: true };
    } finally {
      isRefreshingToken = false;
    }
  }

  /**
   * Cierra sesión del usuario
   */
  static logout() {
    this.removeAuthToken();
    
    // Limpiar cola de peticiones fallidas
    failedQueue = [];
    
    // Notificar al usuario
    showNotification('Sesión expirada. Por favor, inicia sesión nuevamente.', 'warning');
    
    // Redirigir al login si no estamos ya ahí
    if (!window.location.pathname.includes('login')) {
      setTimeout(() => {
        window.location.href = '/login.html';
      }, 2000);
    }
  }

  // MÉTODOS DE UTILIDAD

  /**
   * Parsea JSON de forma segura
   * @param {Response} response - Respuesta de fetch
   * @returns {Promise<Object>} - Datos parseados
   */
  static async safeJsonParse(response) {
    try {
      const text = await response.text();
      return text ? JSON.parse(text) : {};
    } catch (error) {
      console.warn('Error parsing JSON:', error);
      return {};
    }
  }

  /**
   * Crea un delay asíncrono
   * @param {number} ms - Milisegundos a esperar
   * @returns {Promise<void>}
   */
  static delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Verifica el estado de la conexión con la API
   * @returns {Promise<boolean>} - Estado de la conexión
   */
  static async checkConnection() {
    try {
      const response = await this.get('/health', { 
        timeout: 5000, 
        showNotifications: false 
      });
      return !response.error;
    } catch (_error) {
      return false;
    }
  }

  /**
   * Obtiene información de la API
   * @returns {Promise<Object>} - Información de la API
   */
  static async getApiInfo() {
    return this.get('/', { showNotifications: false });
  }

  /**
   * Configura la URL base de la API
   * @param {string} baseUrl - Nueva URL base
   */
  static setBaseUrl(baseUrl) {
    API_CONFIG.baseUrl = baseUrl;
  }

  /**
   * Obtiene la configuración actual
   * @returns {Object} - Configuración actual
   */
  static getConfig() {
    return { ...API_CONFIG };
  }
}

// Función de conveniencia para compatibilidad con código existente
export async function api(endpoint, options = {}) {
  const method = options.method || 'GET';
  
  switch (method.toUpperCase()) {
    case 'GET':
      return ApiClient.get(endpoint, options);
    case 'POST':
      return ApiClient.post(endpoint, options.body ? JSON.parse(options.body) : null, options);
    case 'PUT':
      return ApiClient.put(endpoint, options.body ? JSON.parse(options.body) : null, options);
    case 'PATCH':
      return ApiClient.patch(endpoint, options.body ? JSON.parse(options.body) : null, options);
    case 'DELETE':
      return ApiClient.delete(endpoint, options);
    default:
      return ApiClient.request(endpoint, options);
  }
}

// Exportar instancia por defecto
export default ApiClient;

// Exponer globalmente para compatibilidad
window.ApiClient = ApiClient;
window.api = api;

