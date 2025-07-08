/**
 * Cliente API para comunicação com o backend
 * Versão simplificada e robusta
 */

// Configuração da API
const API_CONFIG = {
  baseURL: 'https://flashcard-u10n.onrender.com',
  fallbackURL: 'http://localhost:5000',
  timeout: 30000,
  retries: 3,
  authTokenKey: 'authToken',
  refreshTokenKey: 'refreshToken',
  cacheEnabled: true,
  cacheTTL: 300000 // 5 minutos
};

/**
 * Cliente API principal
 */
export class ApiClient {
  
  /**
   * Obtém o token de autenticação
   */
  static getAuthToken() {
    return localStorage.getItem(API_CONFIG.authTokenKey);
  }

  /**
   * Define o token de autenticação
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
   * Remove tokens de autenticação
   */
  static removeAuthToken() {
    localStorage.removeItem(API_CONFIG.authTokenKey);
    localStorage.removeItem(API_CONFIG.refreshTokenKey);
  }

  /**
   * Verifica se está autenticado
   */
  static isAuthenticated() {
    const token = this.getAuthToken();
    if (!token) return false;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Date.now() / 1000;
      return payload.exp > now;
    } catch (error) {
      return false;
    }
  }

  /**
   * Obtém headers de autenticação
   */
  static getAuthHeaders(additionalHeaders = {}) {
    const token = this.getAuthToken();
    const baseHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...additionalHeaders,
    };

    if (token) {
      baseHeaders.Authorization = `Bearer ${token}`;
    }
    return baseHeaders;
  }

  /**
   * Realiza requisição GET
   */
  static async get(endpoint, options = {}) {
    return this.request('GET', endpoint, null, options);
  }

  /**
   * Realiza requisição POST
   */
  static async post(endpoint, data = null, options = {}) {
    return this.request('POST', endpoint, data, options);
  }

  /**
   * Realiza requisição PUT
   */
  static async put(endpoint, data = null, options = {}) {
    return this.request('PUT', endpoint, data, options);
  }

  /**
   * Realiza requisição DELETE
   */
  static async delete(endpoint, options = {}) {
    return this.request('DELETE', endpoint, null, options);
  }

  /**
   * Método principal de requisição
   */
  static async request(method, endpoint, data = null, options = {}) {
    const url = `${API_CONFIG.baseURL}${endpoint}`;
    const headers = this.getAuthHeaders(options.headers || {});
    
    const config = {
      method,
      headers,
      ...options
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      config.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      
      return await response.text();
    } catch (error) {
      console.error(`API Error [${method} ${endpoint}]:`, error);
      throw error;
    }
  }
}

/**
 * Função de conveniência para requisições
 */
export async function api(endpoint, options = {}) {
  const method = options.method || 'GET';
  const data = options.data || options.body;
  
  try {
    return await ApiClient.request(method, endpoint, data, options);
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
}

/**
 * Função com fallback para localStorage
 */
export async function apiWithFallback(endpoint, options = {}) {
  try {
    return await api(endpoint, options);
  } catch (error) {
    console.warn('API failed, using localStorage fallback:', error);
    
    // Fallback básico para operações críticas
    if (options.method === 'POST' && endpoint.includes('/decks')) {
      const deckData = options.data || {};
      const deck = {
        id: Date.now(),
        name: deckData.name || 'Nuevo Deck',
        description: deckData.description || '',
        created_at: new Date().toISOString(),
        ...deckData
      };
      
      // Guardar en localStorage
      const decks = JSON.parse(localStorage.getItem('decks') || '[]');
      decks.push(deck);
      localStorage.setItem('decks', JSON.stringify(decks));
      
      return { success: true, data: deck };
    }
    
    throw error;
  }
}

// Exportar configuración
export { API_CONFIG };

// Exportar instancia por defecto
export default ApiClient;

