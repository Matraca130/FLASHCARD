/**
 * ConfigManager - Sistema empresarial de configuración
 * ===================================================
 * 
 * Gestión centralizada de configuraciones con soporte para:
 * - Múltiples entornos (dev, staging, prod)
 * - Configuración dinámica
 * - Validación de esquemas
 * - Hot reloading
 */

class ConfigManager {
  constructor() {
    if (ConfigManager.instance) {
      return ConfigManager.instance;
    }

    this.config = {};
    this.schema = {};
    this.environment = this.detectEnvironment();
    this.listeners = [];
    this.validators = new Map();
    
    ConfigManager.instance = this;
    this.init();
  }

  /**
   * Inicialización del sistema
   */
  init() {
    this.loadDefaultConfig();
    this.loadEnvironmentConfig();
    this.setupValidators();
    console.log(`⚙️ ConfigManager inicializado para entorno: ${this.environment}`);
  }

  /**
   * Detectar entorno actual
   */
  detectEnvironment() {
    // Detectar basado en URL
    const hostname = window.location.hostname;
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'development';
    }
    
    if (hostname.includes('staging') || hostname.includes('test')) {
      return 'staging';
    }
    
    if (hostname.includes('github.io') || hostname.includes('netlify') || hostname.includes('vercel')) {
      return 'production';
    }
    
    return 'production'; // Por defecto
  }

  /**
   * Cargar configuración por defecto
   */
  loadDefaultConfig() {
    this.config = {
      // Configuración de la aplicación
      app: {
        name: 'StudyingFlash',
        version: '2.0.0',
        description: 'Sistema avanzado de flashcards',
        author: 'Equipo de Desarrollo',
        supportEmail: 'support@studyingflash.com'
      },

      // Configuración de API
      api: {
        baseUrl: this.getApiBaseUrl(),
        timeout: 30000,
        retries: 3,
        retryDelay: 1000,
        enableCache: true,
        cacheTimeout: 5 * 60 * 1000, // 5 minutos
        enableOffline: true,
        enableMocking: false
      },

      // Configuración de UI
      ui: {
        theme: 'auto', // 'light', 'dark', 'auto'
        language: 'es',
        animations: {
          enabled: true,
          duration: 300,
          easing: 'ease-in-out'
        },
        notifications: {
          enabled: true,
          position: 'top-right',
          duration: 5000,
          maxVisible: 3
        },
        accessibility: {
          highContrast: false,
          reducedMotion: false,
          screenReader: false
        }
      },

      // Configuración de funcionalidades
      features: {
        debugging: this.environment === 'development',
        analytics: this.environment === 'production',
        errorReporting: true,
        performanceMonitoring: true,
        experimentalFeatures: this.environment !== 'production',
        offlineMode: true,
        pwaInstall: true,
        voiceRecognition: false,
        aiAssistant: false
      },

      // Configuración de rendimiento
      performance: {
        lazyLoading: true,
        imageOptimization: true,
        bundleSplitting: true,
        preloading: true,
        caching: {
          enabled: true,
          strategy: 'stale-while-revalidate',
          maxAge: 24 * 60 * 60 * 1000 // 24 horas
        },
        compression: {
          enabled: true,
          threshold: 1024 // bytes
        }
      },

      // Configuración de seguridad
      security: {
        enableCSP: true,
        enableHTTPS: this.environment === 'production',
        sessionTimeout: 30 * 60 * 1000, // 30 minutos
        maxLoginAttempts: 5,
        passwordPolicy: {
          minLength: 8,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSymbols: false
        },
        encryption: {
          algorithm: 'AES-256-GCM',
          keyDerivation: 'PBKDF2'
        }
      },

      // Configuración de almacenamiento
      storage: {
        enableLocalStorage: true,
        enableSessionStorage: true,
        enableIndexedDB: true,
        quotaWarningThreshold: 0.8, // 80%
        cleanupInterval: 24 * 60 * 60 * 1000, // 24 horas
        compression: true,
        encryption: false
      },

      // Configuración de logging
      logging: {
        level: this.environment === 'development' ? 'debug' : 'error',
        enableConsole: true,
        enableRemote: this.environment === 'production',
        enableLocalStorage: true,
        maxLogSize: 1000,
        categories: {
          api: true,
          navigation: true,
          storage: true,
          performance: true,
          errors: true
        }
      },

      // Configuración de monitoreo
      monitoring: {
        enablePerformanceAPI: true,
        enableUserTiming: true,
        enableResourceTiming: true,
        enableNavigationTiming: true,
        sampleRate: this.environment === 'production' ? 0.1 : 1.0,
        reportInterval: 60000 // 1 minuto
      }
    };
  }

  /**
   * Cargar configuración específica del entorno
   */
  loadEnvironmentConfig() {
    const envConfigs = {
      development: {
        api: {
          enableMocking: true,
          timeout: 10000
        },
        features: {
          debugging: true,
          analytics: false,
          experimentalFeatures: true
        },
        logging: {
          level: 'debug',
          enableRemote: false
        }
      },

      staging: {
        api: {
          enableMocking: false,
          timeout: 20000
        },
        features: {
          debugging: true,
          analytics: true,
          experimentalFeatures: true
        },
        logging: {
          level: 'info',
          enableRemote: true
        }
      },

      production: {
        api: {
          enableMocking: false,
          timeout: 30000
        },
        features: {
          debugging: false,
          analytics: true,
          experimentalFeatures: false
        },
        logging: {
          level: 'error',
          enableRemote: true
        },
        performance: {
          caching: {
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 días
          }
        }
      }
    };

    const envConfig = envConfigs[this.environment];
    if (envConfig) {
      this.config = this.deepMerge(this.config, envConfig);
    }
  }

  /**
   * Obtener URL base de API según entorno
   */
  getApiBaseUrl() {
    const urls = {
      development: 'http://localhost:5000/api',
      staging: 'https://api-staging.studyingflash.com',
      production: 'https://api.studyingflash.com'
    };

    return urls[this.environment] || urls.production;
  }

  /**
   * Configurar validadores
   */
  setupValidators() {
    // Validador para configuración de API
    this.validators.set('api.timeout', (value) => {
      return typeof value === 'number' && value > 0 && value <= 120000;
    });

    // Validador para tema
    this.validators.set('ui.theme', (value) => {
      return ['light', 'dark', 'auto'].includes(value);
    });

    // Validador para idioma
    this.validators.set('ui.language', (value) => {
      return ['es', 'en', 'fr', 'de'].includes(value);
    });

    // Validador para nivel de logging
    this.validators.set('logging.level', (value) => {
      return ['debug', 'info', 'warn', 'error'].includes(value);
    });
  }

  /**
   * Obtener valor de configuración
   * @param {string} path - Ruta de la configuración (ej: 'api.timeout')
   * @param {*} defaultValue - Valor por defecto
   * @returns {*} Valor de configuración
   */
  get(path, defaultValue = null) {
    const keys = path.split('.');
    let value = this.config;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return defaultValue;
      }
    }

    return value;
  }

  /**
   * Establecer valor de configuración
   * @param {string} path - Ruta de la configuración
   * @param {*} value - Nuevo valor
   * @param {boolean} validate - Si debe validar el valor
   */
  set(path, value, validate = true) {
    if (validate && !this.validate(path, value)) {
      throw new Error(`Valor inválido para configuración '${path}': ${value}`);
    }

    const keys = path.split('.');
    const lastKey = keys.pop();
    let target = this.config;

    // Navegar hasta el objeto padre
    for (const key of keys) {
      if (!(key in target) || typeof target[key] !== 'object') {
        target[key] = {};
      }
      target = target[key];
    }

    const oldValue = target[lastKey];
    target[lastKey] = value;

    // Notificar cambio
    this.notifyChange(path, value, oldValue);
  }

  /**
   * Validar valor de configuración
   * @param {string} path - Ruta de la configuración
   * @param {*} value - Valor a validar
   * @returns {boolean} True si es válido
   */
  validate(path, value) {
    const validator = this.validators.get(path);
    if (validator) {
      return validator(value);
    }
    return true; // Sin validador = válido
  }

  /**
   * Fusión profunda de objetos
   * @param {Object} target - Objeto destino
   * @param {Object} source - Objeto fuente
   * @returns {Object} Objeto fusionado
   */
  deepMerge(target, source) {
    const result = { ...target };

    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }

  /**
   * Suscribirse a cambios de configuración
   * @param {string} path - Ruta a observar (opcional)
   * @param {Function} callback - Función callback
   */
  onChange(path, callback) {
    if (typeof path === 'function') {
      // Si solo se pasa callback, observar todos los cambios
      callback = path;
      path = '*';
    }

    this.listeners.push({ path, callback });
  }

  /**
   * Notificar cambio de configuración
   * @param {string} path - Ruta que cambió
   * @param {*} newValue - Nuevo valor
   * @param {*} oldValue - Valor anterior
   */
  notifyChange(path, newValue, oldValue) {
    this.listeners.forEach(listener => {
      if (listener.path === '*' || path.startsWith(listener.path)) {
        try {
          listener.callback(path, newValue, oldValue);
        } catch (error) {
          console.error('Error en listener de configuración:', error);
        }
      }
    });
  }

  /**
   * Cargar configuración desde localStorage
   */
  loadFromStorage() {
    try {
      const stored = localStorage.getItem('app_config');
      if (stored) {
        const userConfig = JSON.parse(stored);
        this.config = this.deepMerge(this.config, userConfig);
      }
    } catch (error) {
      console.warn('Error cargando configuración desde localStorage:', error);
    }
  }

  /**
   * Guardar configuración en localStorage
   */
  saveToStorage() {
    try {
      // Solo guardar configuraciones modificables por el usuario
      const userConfig = {
        ui: this.config.ui,
        features: {
          offlineMode: this.config.features.offlineMode,
          pwaInstall: this.config.features.pwaInstall
        }
      };
      
      localStorage.setItem('app_config', JSON.stringify(userConfig));
    } catch (error) {
      console.warn('Error guardando configuración en localStorage:', error);
    }
  }

  /**
   * Resetear configuración a valores por defecto
   */
  reset() {
    this.loadDefaultConfig();
    this.loadEnvironmentConfig();
    localStorage.removeItem('app_config');
    this.notifyChange('*', this.config, {});
  }

  /**
   * Obtener toda la configuración
   */
  getAll() {
    return { ...this.config };
  }

  /**
   * Obtener información del entorno
   */
  getEnvironmentInfo() {
    return {
      environment: this.environment,
      hostname: window.location.hostname,
      protocol: window.location.protocol,
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform
    };
  }

  /**
   * Verificar si una funcionalidad está habilitada
   * @param {string} feature - Nombre de la funcionalidad
   * @returns {boolean} True si está habilitada
   */
  isFeatureEnabled(feature) {
    return this.get(`features.${feature}`, false);
  }

  /**
   * Habilitar/deshabilitar funcionalidad
   * @param {string} feature - Nombre de la funcionalidad
   * @param {boolean} enabled - Estado deseado
   */
  setFeature(feature, enabled) {
    this.set(`features.${feature}`, enabled);
    this.saveToStorage();
  }
}

// Crear instancia singleton
const configManager = new ConfigManager();

// Cargar configuración del usuario
configManager.loadFromStorage();

// Exportar funciones de conveniencia
export const getConfig = (path, defaultValue) => configManager.get(path, defaultValue);
export const setConfig = (path, value) => configManager.set(path, value);
export const isFeatureEnabled = (feature) => configManager.isFeatureEnabled(feature);
export const setFeature = (feature, enabled) => configManager.setFeature(feature, enabled);
export const onConfigChange = (path, callback) => configManager.onChange(path, callback);
export const getEnvironment = () => configManager.environment;
export const getEnvironmentInfo = () => configManager.getEnvironmentInfo();

// Exportar instancia completa
export default configManager;

