/**
 * ErrorHandler - Sistema empresarial de manejo de errores
 * ======================================================
 * 
 * Sistema centralizado para capturar, procesar y reportar errores
 * Implementa patrones: Singleton, Observer, Strategy
 */

class ErrorHandler {
  constructor() {
    if (ErrorHandler.instance) {
      return ErrorHandler.instance;
    }

    this.errorQueue = [];
    this.errorListeners = [];
    this.errorStrategies = new Map();
    this.config = {
      maxQueueSize: 100,
      enableConsoleLogging: true,
      enableUserNotification: true,
      enableRemoteLogging: false,
      logLevel: 'error' // 'debug', 'info', 'warn', 'error'
    };

    ErrorHandler.instance = this;
    this.init();
  }

  /**
   * Inicialización del sistema
   */
  init() {
    // Capturar errores globales
    this.setupGlobalErrorHandlers();
    
    // Configurar estrategias por defecto
    this.setupDefaultStrategies();
    
    console.log('🛡️ ErrorHandler empresarial inicializado');
  }

  /**
   * Configurar capturadores globales de errores
   */
  setupGlobalErrorHandlers() {
    // Errores JavaScript no capturados
    window.addEventListener('error', (event) => {
      this.handleError({
        type: 'javascript',
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error,
        timestamp: new Date().toISOString()
      });
    });

    // Promesas rechazadas no capturadas
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError({
        type: 'promise',
        message: event.reason?.message || 'Promise rejection',
        reason: event.reason,
        timestamp: new Date().toISOString()
      });
    });

    // Errores de recursos (imágenes, scripts, etc.)
    window.addEventListener('error', (event) => {
      if (event.target !== window) {
        this.handleError({
          type: 'resource',
          message: `Failed to load resource: ${event.target.src || event.target.href}`,
          element: event.target.tagName,
          source: event.target.src || event.target.href,
          timestamp: new Date().toISOString()
        });
      }
    }, true);
  }

  /**
   * Configurar estrategias por defecto
   */
  setupDefaultStrategies() {
    // Estrategia para errores de JavaScript
    this.addStrategy('javascript', (error) => {
      if (this.config.enableConsoleLogging) {
        console.error('🚨 JavaScript Error:', error);
      }
      
      if (this.config.enableUserNotification && this.isUserFacingError(error)) {
        this.showUserNotification('Ha ocurrido un error inesperado. Por favor, recarga la página.');
      }
    });

    // Estrategia para errores de promesas
    this.addStrategy('promise', (error) => {
      if (this.config.enableConsoleLogging) {
        console.error('🚨 Promise Error:', error);
      }
    });

    // Estrategia para errores de recursos
    this.addStrategy('resource', (error) => {
      if (this.config.enableConsoleLogging) {
        console.warn('⚠️ Resource Error:', error);
      }
    });

    // Estrategia para errores de API
    this.addStrategy('api', (error) => {
      if (this.config.enableConsoleLogging) {
        console.error('🌐 API Error:', error);
      }
      
      if (this.config.enableUserNotification) {
        this.showUserNotification('Error de conexión. Verifica tu conexión a internet.');
      }
    });

    // Estrategia para errores de navegación
    this.addStrategy('navigation', (error) => {
      if (this.config.enableConsoleLogging) {
        console.error('🧭 Navigation Error:', error);
      }
      
      if (this.config.enableUserNotification) {
        this.showUserNotification('Error de navegación. Intentando recuperar...');
      }
    });
  }

  /**
   * Manejar un error
   * @param {Object} error - Información del error
   */
  handleError(error) {
    // Enriquecer error con metadata
    const enrichedError = this.enrichError(error);
    
    // Agregar a cola
    this.addToQueue(enrichedError);
    
    // Ejecutar estrategia apropiada
    const strategy = this.errorStrategies.get(error.type) || this.errorStrategies.get('default');
    if (strategy) {
      try {
        strategy(enrichedError);
      } catch (strategyError) {
        console.error('Error en estrategia de manejo de errores:', strategyError);
      }
    }
    
    // Notificar a listeners
    this.notifyListeners(enrichedError);
  }

  /**
   * Enriquecer error con metadata adicional
   * @param {Object} error - Error original
   * @returns {Object} Error enriquecido
   */
  enrichError(error) {
    return {
      ...error,
      id: this.generateErrorId(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: error.timestamp || new Date().toISOString(),
      sessionId: this.getSessionId(),
      userId: this.getUserId()
    };
  }

  /**
   * Agregar error a la cola
   * @param {Object} error - Error a agregar
   */
  addToQueue(error) {
    this.errorQueue.push(error);
    
    // Mantener tamaño de cola
    if (this.errorQueue.length > this.config.maxQueueSize) {
      this.errorQueue.shift();
    }
  }

  /**
   * Agregar estrategia de manejo
   * @param {string} type - Tipo de error
   * @param {Function} strategy - Función de manejo
   */
  addStrategy(type, strategy) {
    this.errorStrategies.set(type, strategy);
  }

  /**
   * Agregar listener de errores
   * @param {Function} listener - Función listener
   */
  addListener(listener) {
    this.errorListeners.push(listener);
  }

  /**
   * Notificar a todos los listeners
   * @param {Object} error - Error a notificar
   */
  notifyListeners(error) {
    this.errorListeners.forEach(listener => {
      try {
        listener(error);
      } catch (listenerError) {
        console.error('Error en listener de errores:', listenerError);
      }
    });
  }

  /**
   * Mostrar notificación al usuario
   * @param {string} message - Mensaje a mostrar
   */
  async showUserNotification(message) {
    try {
      // Intentar usar el sistema de notificaciones existente
      const { showNotification } = await import('../utils/helpers.js');
      showNotification(message, 'error');
    } catch (error) {
      // Fallback a alert si no está disponible
      console.warn('Sistema de notificaciones no disponible, usando alert');
      alert(message);
    }
  }

  /**
   * Determinar si es un error que debe mostrarse al usuario
   * @param {Object} error - Error a evaluar
   * @returns {boolean} True si debe mostrarse al usuario
   */
  isUserFacingError(error) {
    // Filtrar errores de desarrollo o internos
    const internalErrors = [
      'Script error',
      'Non-Error promise rejection captured',
      'ResizeObserver loop limit exceeded'
    ];
    
    return !internalErrors.some(internal => 
      error.message && error.message.includes(internal)
    );
  }

  /**
   * Generar ID único para el error
   * @returns {string} ID único
   */
  generateErrorId() {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Obtener ID de sesión
   * @returns {string} ID de sesión
   */
  getSessionId() {
    if (!window.sessionStorage.getItem('sessionId')) {
      window.sessionStorage.setItem('sessionId', 
        `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      );
    }
    return window.sessionStorage.getItem('sessionId');
  }

  /**
   * Obtener ID de usuario
   * @returns {string|null} ID de usuario
   */
  getUserId() {
    // Implementar según el sistema de autenticación
    return window.localStorage.getItem('userId') || null;
  }

  /**
   * Obtener estadísticas de errores
   * @returns {Object} Estadísticas
   */
  getStats() {
    const errorsByType = {};
    this.errorQueue.forEach(error => {
      errorsByType[error.type] = (errorsByType[error.type] || 0) + 1;
    });

    return {
      totalErrors: this.errorQueue.length,
      errorsByType,
      queueSize: this.errorQueue.length,
      strategiesCount: this.errorStrategies.size,
      listenersCount: this.errorListeners.length
    };
  }

  /**
   * Limpiar cola de errores
   */
  clearQueue() {
    this.errorQueue = [];
  }

  /**
   * Configurar el sistema
   * @param {Object} newConfig - Nueva configuración
   */
  configure(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Reportar error manualmente
   * @param {Error|string} error - Error a reportar
   * @param {Object} context - Contexto adicional
   */
  reportError(error, context = {}) {
    const errorInfo = {
      type: context.type || 'manual',
      message: error.message || error.toString(),
      stack: error.stack,
      context,
      timestamp: new Date().toISOString()
    };

    this.handleError(errorInfo);
  }
}

// Crear instancia singleton
const errorHandler = new ErrorHandler();

// Exportar funciones de conveniencia
export const reportError = (error, context) => errorHandler.reportError(error, context);
export const addErrorStrategy = (type, strategy) => errorHandler.addStrategy(type, strategy);
export const addErrorListener = (listener) => errorHandler.addListener(listener);
export const getErrorStats = () => errorHandler.getStats();
export const configureErrorHandler = (config) => errorHandler.configure(config);

// Exportar instancia completa
export default errorHandler;

