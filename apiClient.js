/**
 * Cliente API melhorado para StudyingFlash
 * Versión 2.1 - Corregido para CORS y problemas de cache
 */

// Importar utilitários
import { showNotification } from './utils/helpers.js';

// Configuração da API
const API_CONFIG = {
  baseUrl: window.location.hostname === 'localhost'
    ? 'http://localhost:5000'
    : 'https://flashcard-u10n.onrender.com',
  timeout: 10000, // 10 segundos
  retryAttempts: 2,
  retryDelay: 1000, // 1 segundo
  authTokenKey: 'studyingflash_auth_token',
  refreshTokenKey: 'studyingflash_refresh_token',
  cacheEnabled: true,
  cachePrefix: 'sf_cache_',
  cacheTTL: 5 * 60 * 1000, // 5 minutos
  offlineMode: true
};

// Estado do cliente
let isRefreshingToken = false;
let failedQueue = [];
let isOfflineMode = false;
let connectionStatus = 'unknown'; // 'online', 'offline', 'unknown'

/**
 * Classe principal do cliente API melhorado
 */
export class ApiClient {
  // MÉTODOS DE AUTENTICAÇÃO

  /**
   * Obtém o token de autenticação
   * @returns {string|null} - Token de autenticação
   */
  static getAuthToken() {
    return localStorage.getItem(API_CONFIG.authTokenKey);
  /**
   * Estabelece o token de autenticação
   * @param {string} token - Token de autenticação
   * @param {string} refreshToken - Token de renovação (opcional)
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
   * Elimina os tokens de autenticação
   */
  static removeAuthToken() {
    localStorage.removeItem(API_CONFIG.authTokenKey);
    localStorage.removeItem(API_CONFIG.refreshTokenKey);
  /**
   * Verifica se o usuário está autenticado
   * @returns {boolean} - Estado de autenticação
   */
  static isAuthenticated() {
    const token = this.getAuthToken();
    if (!token) {
      return false;
    try {
      // Verificar se o token não expirou
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Date.now() / 1000;
      return payload.exp > now;
    } catch (error) {
      console.warn('Error verificando token:', error);
      return false;

  /**
   * Obtém headers de autenticação
   * @param {Object} additionalHeaders - Headers adicionais
   * @returns {Object} - Headers completos
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
    return baseHeaders;
  // MÉTODOS HTTP PRINCIPAIS

  /**
   * Realiza uma petição GET
   * @param {string} endpoint - Endpoint da API
   * @param {Object} options - Opções adicionais
   * @returns {Promise<Object>} - Resposta da API
   */
  static async get(endpoint, options = {}) {
    // Verificar cache se habilitado e não estiver explicitamente desabilitado para esta chamada
    if (API_CONFIG.cacheEnabled && options.useCache !== false && !options.forceRefresh) {
      const cachedData = this.getFromCache(endpoint);
      if (cachedData) {
        console.log(`📦 Usando dados em cache para ${endpoint}`);
        return cachedData;

    const response = await this.request(endpoint, {
      method: 'GET',
      ...options,
    });

    // Armazenar em cache se a resposta for bem-sucedida e o cache estiver habilitado
    if (API_CONFIG.cacheEnabled && !response.error && options.useCache !== false) {
      this.saveToCache(endpoint, response);
    return response;
  /**
   * Realiza uma petição POST
   * @param {string} endpoint - Endpoint da API
   * @param {Object} data - Dados a enviar
   * @param {Object} options - Opções adicionais
   * @returns {Promise<Object>} - Resposta da API
   */
  static async post(endpoint, data = null, options = {}) {
    // Invalidar cache relacionado se necessário
    if (API_CONFIG.cacheEnabled && options.invalidateCache) {
      this.invalidateRelatedCache(endpoint, options.invalidateCache);
    return this.request(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : null,
      ...options,
    });
  /**
   * Realiza uma petição PUT
   * @param {string} endpoint - Endpoint da API
   * @param {Object} data - Dados a enviar
   * @param {Object} options - Opções adicionais
   * @returns {Promise<Object>} - Resposta da API
   */
  static async put(endpoint, data = null, options = {}) {
    // Invalidar cache relacionado se necessário
    if (API_CONFIG.cacheEnabled && options.invalidateCache) {
      this.invalidateRelatedCache(endpoint, options.invalidateCache);
    return this.request(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : null,
      ...options,
    });
  /**
   * Realiza uma petição PATCH
   * @param {string} endpoint - Endpoint da API
   * @param {Object} data - Dados a enviar
   * @param {Object} options - Opções adicionais
   * @returns {Promise<Object>} - Resposta da API
   */
  static async patch(endpoint, data = null, options = {}) {
    // Invalidar cache relacionado se necessário
    if (API_CONFIG.cacheEnabled && options.invalidateCache) {
      this.invalidateRelatedCache(endpoint, options.invalidateCache);
    return this.request(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : null,
      ...options,
    });
  /**
   * Realiza uma petição DELETE
   * @param {string} endpoint - Endpoint da API
   * @param {Object} options - Opções adicionais
   * @returns {Promise<Object>} - Resposta da API
   */
  static async delete(endpoint, options = {}) {
    // Invalidar cache relacionado se necessário
    if (API_CONFIG.cacheEnabled && options.invalidateCache) {
      this.invalidateRelatedCache(endpoint, options.invalidateCache);
    return this.request(endpoint, {
      method: 'DELETE',
      ...options,
    });
  // MÉTODO PRINCIPAL DE REQUEST

  /**
   * Método principal para realizar petições HTTP
   * @param {string} endpoint - Endpoint da API
   * @param {Object} options - Opções da petição
   * @returns {Promise<Object>} - Resposta da API
   */
  static async request(endpoint, options = {}) {
    // Se estamos en modo offline y no es una verificación de conectividad
    if (isOfflineMode && !endpoint.includes('/health') && API_CONFIG.offlineMode) {
      console.log(`🔌 Modo offline: usando datos en cache para ${endpoint}`);
      
      // Tentar obter do cache
      const cachedData = this.getFromCache(endpoint);
      if (cachedData) {
        return cachedData;
      // Se não há cache, retornar erro de conectividade
      return {
        error: true,
        message: 'Sem conexão com a internet',
        networkError: true,
        offlineMode: true
      };
    const {
      method = 'GET',
      body = null,
      headers = {},
      timeout = API_CONFIG.timeout,
      retries = API_CONFIG.retryAttempts,
      showNotifications = true,
      mode = 'cors',
      ...fetchOptions
    } = options;

    // Remover opções que não são válidas para fetch
    const { useCache, forceRefresh, invalidateCache, ...validFetchOptions } = fetchOptions;

    const url = `${API_CONFIG.baseUrl}${endpoint}`;
    const requestHeaders = this.getAuthHeaders(headers);

    const requestOptions = {
      method,
      headers: requestHeaders,
      body,
      mode,
      ...validFetchOptions,
    };

    // Implementar timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    requestOptions.signal = controller.signal;

    try {
      const response = await this.executeRequestWithRetry(
        url,
        requestOptions,
        retries
      );
      clearTimeout(timeoutId);

      // Atualizar estado de conectividade
      if (connectionStatus !== 'online') {
        connectionStatus = 'online';
        isOfflineMode = false;
        
        // Notificar reconexão se estava offline antes
        if (showNotifications && connectionStatus === 'offline') {
          showNotification('Conexão restaurada', 'success', 3000);
        // Disparar evento de reconexão
        window.dispatchEvent(new CustomEvent('api:reconnected'));
      // Manejar respuestas según status
      return await this.handleResponse(response, endpoint, showNotifications);
    } catch (error) {
      clearTimeout(timeoutId);
      
      // Verificar se é um erro de conectividade
      const isConnectivityError = 
        error.name === 'AbortError' || 
        error.message.includes('Failed to fetch') ||
        error.message.includes('Network Error');
      
      // Atualizar estado de conectividade
      if (isConnectivityError && connectionStatus !== 'offline') {
        connectionStatus = 'offline';
        isOfflineMode = true;
        
        // Disparar evento de desconexão
        window.dispatchEvent(new CustomEvent('api:disconnected'));
      return this.handleError(error, endpoint, showNotifications);

  /**
   * Executa uma petição com reintentos automáticos
   * @param {string} url - URL completa
   * @param {Object} options - Opções de fetch
   * @param {number} retries - Número de reintentos
   * @returns {Promise<Response>} - Resposta de fetch
   */
  static async executeRequestWithRetry(url, options, retries) {
    let lastError;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, options);

        // Se a resposta é exitosa ou é um erro do cliente (4xx), não reintentar
        if (response.ok || (response.status >= 400 && response.status < 500)) {
          return response;
        // Error del servidor (5xx), reintentar
        throw new Error(`Server error: ${response.status}`);
      } catch (error) {
        lastError = error;

        // Se é o último intento, lançar erro
        if (attempt === retries) {
          throw error;
        // Esperar antes do próximo intento
        await this.delay(API_CONFIG.retryDelay * (attempt + 1));
        console.log(`Reintentando petição (${attempt + 1}/${retries}):`, url);

    throw lastError;
  /**
   * Maneja a resposta da API
   * @param {Response} response - Resposta de fetch
   * @param {string} endpoint - Endpoint original
   * @param {boolean} showNotifications - Mostrar notificações
   * @returns {Promise<Object>} - Dados processados
   */
  static async handleResponse(response, endpoint, showNotifications) {
    // Manejar autenticação
    if (response.status === 401) {
      return this.handleUnauthorized(endpoint);
    // Manejar errores del cliente
    if (response.status >= 400 && response.status < 500) {
      const errorData = await this.safeJsonParse(response);
      const errorMessage = errorData.message || `Error ${response.status}`;

      if (showNotifications) {
        showNotification(errorMessage, 'error');
      return {
        error: true,
        status: response.status,
        message: errorMessage,
        data: errorData,
      };
    // Manejar errores del servidor
    if (response.status >= 500) {
      const errorMessage = `Error del servidor (${response.status})`;

      if (showNotifications) {
        showNotification(errorMessage, 'error');
      return {
        error: true,
        status: response.status,
        message: errorMessage,
      };
    // Respuesta exitosa
    const data = await this.safeJsonParse(response);
    return {
      error: false,
      status: response.status,
      data: data,
      timestamp: Date.now()
    };
  /**
   * Maneja errores de red y otros errores
   * @param {Error} error - Error capturado
   * @param {string} endpoint - Endpoint original
   * @param {boolean} showNotifications - Mostrar notificações
   * @returns {Object} - Objeto de error
   */
  static handleError(error, endpoint, showNotifications) {
    let errorMessage = 'Error de conexión';

    if (error.name === 'AbortError') {
      errorMessage = 'Tiempo de espera agotado';
    } else if (error.message.includes('Failed to fetch')) {
      errorMessage = 'Sin conexión a internet';
      
      // Ativar modo offline
      if (API_CONFIG.offlineMode && !isOfflineMode) {
        isOfflineMode = true;
        connectionStatus = 'offline';
        
        if (showNotifications) {
          showNotification('Modo offline ativado', 'warning', 5000);
    } else {
      errorMessage = error.message || 'Error desconocido';
    console.error(`API Error [${endpoint}]:`, error);

    if (showNotifications) {
      showNotification(errorMessage, 'error');
    return {
      error: true,
      message: errorMessage,
      networkError: true,
    };
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
    const refreshToken = localStorage.getItem(API_CONFIG.refreshTokenKey);

    if (!refreshToken) {
      this.logout();
      return { error: true, message: 'Sesión expirada', unauthorized: true };
    // Intentar renovar el token
    isRefreshingToken = true;

    try {
      const refreshResponse = await fetch(
        `${API_CONFIG.baseUrl}/api/auth/refresh`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken }),
        }
      );

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
    } catch (error) {
      console.error('Error renovando token:', error);
      this.logout();
      return { error: true, message: 'Sesión expirada', unauthorized: true };
    } finally {
      isRefreshingToken = false;

  /**
   * Cierra sesión del usuario
   */
  static logout() {
    this.removeAuthToken();

    // Limpiar cola de peticiones fallidas
    failedQueue = [];

    // Notificar al usuario
    showNotification(
      'Sesión expirada. Por favor, inicia sesión nuevamente.',
      'warning'
    );

    // Redirigir al login si no estamos ya ahí
    if (!window.location.pathname.includes('login')) {
      setTimeout(() => {
        window.location.href = '/login.html';
      }, 2000);

  // MÉTODOS DE CACHE

  /**
   * Obtém dados do cache
   * @param {string} endpoint - Endpoint da API
   * @returns {Object|null} - Dados em cache ou null
   */
  static getFromCache(endpoint) {
    if (!API_CONFIG.cacheEnabled) { return null;
    try {
      const cacheKey = `${API_CONFIG.cachePrefix}${endpoint}`;
      const cachedItem = localStorage.getItem(cacheKey);
      
      if (!cachedItem) { return null;
      const { data, timestamp, ttl = API_CONFIG.cacheTTL } = JSON.parse(cachedItem);
      
      // Verificar se o cache expirou
      if (Date.now() - timestamp > ttl) {
        localStorage.removeItem(cacheKey);
        return null;
      return {
        error: false,
        data,
        fromCache: true,
        timestamp
      };
    } catch (error) {
      console.warn('Erro ao ler cache:', error);
      return null;
  
  /**
   * Salva dados no cache
   * @param {string} endpoint - Endpoint da API
   * @param {Object} response - Resposta da API
   * @param {number} ttl - Tempo de vida do cache em ms (opcional)
   */
  static saveToCache(endpoint, response, ttl = API_CONFIG.cacheTTL) {
    if (!API_CONFIG.cacheEnabled || response.error) { return;
    try {
      const cacheKey = `${API_CONFIG.cachePrefix}${endpoint}`;
      const cacheData = {
        data: response.data,
        timestamp: Date.now(),
        ttl
      };
      
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    } catch (error) {
      console.warn('Erro ao salvar cache:', error);
  
  /**
   * Invalida cache relacionado a um endpoint
   * @param {string} endpoint - Endpoint atual
   * @param {string|Array} patterns - Padrões de endpoints a invalidar
   */
  static invalidateRelatedCache(endpoint, patterns) {
    if (!API_CONFIG.cacheEnabled) { return;
    try {
      const patternsArray = Array.isArray(patterns) ? patterns : [patterns];
      
      // Se não há padrões específicos, usar heurística baseada no endpoint atual
      if (patternsArray.length === 0) {
        // Exemplo: POST /api/decks deve invalidar GET /api/decks
        const basePath = endpoint.split('/').slice(0, -1).join('/');
        patternsArray.push(basePath);
      // Buscar todas as chaves de cache
      const cacheKeys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(API_CONFIG.cachePrefix)) {
          cacheKeys.push(key);
      
      // Invalidar chaves que correspondem aos padrões
      let invalidatedCount = 0;
      cacheKeys.forEach(key => {
        const endpointPath = key.replace(API_CONFIG.cachePrefix, '');
        
        const shouldInvalidate = patternsArray.some(pattern => {
          if (typeof pattern === 'string') {
            return endpointPath.includes(pattern);
          } else if (pattern instanceof RegExp) {
            return pattern.test(endpointPath);
          return false;
        });
        
        if (shouldInvalidate) {
          localStorage.removeItem(key);
          invalidatedCount++;
      });
      
      if (invalidatedCount > 0) {
        console.log(`🧹 Invalidados ${invalidatedCount} itens de cache relacionados a ${endpoint}`);
    } catch (error) {
      console.warn('Erro ao invalidar cache:', error);
  
  /**
   * Limpa todo o cache
   */
  static clearCache() {
    if (!API_CONFIG.cacheEnabled) { return;
    try {
      const cacheKeys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(API_CONFIG.cachePrefix) {
          cacheKeys.push(key);
      }
      
      cacheKeys.forEach(key => localStorage.removeItem(key));
      console.log(`🧹 Cache limpo: ${cacheKeys.length} itens removidos`);
    } catch (error) {
      console.warn('Erro ao limpar cache:', error);

  // MÉTODOS DE UTILIDADE

  /**
   * Parsea JSON de forma segura
   * @param {Response} response - Resposta de fetch
   * @returns {Promise<Object>} - Dados parseados
   */
  static async safeJsonParse(response) {
    try {
      const text = await response.text();
      return text ? JSON.parse(text) : {};
    } catch (error) {
      console.warn('Error parsing JSON:', error);
      return {};

  /**
   * Crea un delay asíncrono
   * @param {number} ms - Milisegundos a esperar
   * @returns {Promise<void>}
   */
  static delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  /**
   * Verifica el estado de la conexión con la API
   * @returns {Promise<boolean>} - Estado de la conexión
   */
  static async checkConnection() {
    try {
      // Usar no-cors para evitar problemas de CORS
      const response = await this.request('/health', {
        timeout: 5000,
        showNotifications: false,
        mode: 'no-cors'
      });
      
      // Como no-cors retorna opaque response, não podemos verificar o status
      // Vamos considerar que se não houve erro de rede, a API está disponível
      const isConnected = !response.networkError;
      
      // Atualizar estado de conectividade
      connectionStatus = isConnected ? 'online' : 'offline';
      isOfflineMode = !isConnected && API_CONFIG.offlineMode;
      
      return isConnected;
    } catch (error) {
      console.error('Erro ao verificar conexão:', error);
      connectionStatus = 'offline';
      isOfflineMode = API_CONFIG.offlineMode;
      return false;

  /**
   * Obtiene información de la API
   * @returns {Promise<Object>} - Información de la API
   */
  static async getApiInfo() {
    return this.get('/', { 
      showNotifications: false,
      useCache: true,
      ttl: 24 * 60 * 60 * 1000 // 24 horas
    });
  /**
   * Configura la URL base de la API
   * @param {string} baseUrl - Nueva URL base
   */
  static setBaseUrl(baseUrl) {
    API_CONFIG.baseUrl = baseUrl;
    this.clearCache(); // Limpar cache ao mudar a URL base
  }

  /**
   * Obtiene la configuración actual
   * @returns {Object} - Configuración actual
   */
  static getConfig() {
    return { ...API_CONFIG };
  /**
   * Ativa ou desativa o modo offline
   * @param {boolean} enabled - Se o modo offline deve ser ativado
   */
  static setOfflineMode(enabled) {
    API_CONFIG.offlineMode = enabled;
    
    if (!enabled) {
      isOfflineMode = false;
      this.checkConnection(); // Verificar conexão ao desativar modo offline
    }
    
    console.log(`🔌 Modo offline ${enabled ? 'ativado' : 'desativado'}`);
  /**
   * Obtém o estado atual de conectividade
   * @returns {Object} - Estado de conectividade
   */
  static getConnectionStatus() {
    return {
      status: connectionStatus,
      offlineMode: isOfflineMode,
      offlineModeEnabled: API_CONFIG.offlineMode
    };

// Função de conveniência para compatibilidade com código existente
export async function api(endpoint, options = {}) {
  const method = options.method || 'GET';

  switch (method.toUpperCase()) {
    case 'GET':
      return ApiClient.get(endpoint, options);
    case 'POST':
      return ApiClient.post(
        endpoint,
        options.body ? JSON.parse(options.body) : null,
        options
      );
    case 'PUT':
      return ApiClient.put(
        endpoint,
        options.body ? JSON.parse(options.body) : null,
        options
      );
    case 'PATCH':
      return ApiClient.patch(
        endpoint,
        options.body ? JSON.parse(options.body) : null,
        options
      );
    case 'DELETE':
      return ApiClient.delete(endpoint, options);
    default:
      return ApiClient.request(endpoint, options);

// Configurar eventos de conectividade
window.addEventListener('online', () => {
  console.log('🌐 Navegador detectou conexão online');
  ApiClient.checkConnection();
});

window.addEventListener('offline', () => {
  console.log('📴 Navegador detectou conexão offline');
  connectionStatus = 'offline';
  isOfflineMode = API_CONFIG.offlineMode;
  
  // Disparar evento de desconexão
  window.dispatchEvent(new CustomEvent('api:disconnected'));
  
  if (API_CONFIG.offlineMode) {
    showNotification('Modo offline ativado', 'warning', 5000);
  } else {
    showNotification('Sem conexão a internet', 'error', 5000);
});

// Verificar conexão inicial
setTimeout(() => {
  ApiClient.checkConnection();
}, 1000);

// Exportar instância por defecto
export default ApiClient;

// Expor globalmente para compatibilidade
window.ApiClient = ApiClient;
window.api = api;

