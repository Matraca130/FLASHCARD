/**
 * CacheManager - Sistema empresarial de cache multi-nivel
 * =======================================================
 * 
 * Sistema de cache avanzado con múltiples niveles de almacenamiento
 * Implementa patrones: Singleton, Strategy, Observer, LRU
 */

class CacheManager {
  constructor() {
    if (CacheManager.instance) {
      return CacheManager.instance;
    }

    this.memoryCache = new Map();
    this.config = {
      maxMemorySize: 50, // MB
      maxMemoryItems: 1000,
      defaultTTL: 5 * 60 * 1000, // 5 minutos
      enableLocalStorage: true,
      enableSessionStorage: true,
      enableIndexedDB: false,
      compressionThreshold: 1024, // bytes
      enableMetrics: true
    };

    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0
    };

    this.strategies = new Map();
    this.observers = [];

    CacheManager.instance = this;
    this.init();
  }

  /**
   * Inicialización del sistema
   */
  init() {
    this.setupStrategies();
    this.setupCleanupInterval();
    console.log('💾 CacheManager empresarial inicializado');
  }

  /**
   * Configurar estrategias de cache
   */
  setupStrategies() {
    // Estrategia LRU para memoria
    this.strategies.set('memory', {
      get: (key) => this.getFromMemory(key),
      set: (key, value, ttl) => this.setToMemory(key, value, ttl),
      delete: (key) => this.deleteFromMemory(key),
      clear: () => this.clearMemory()
    });

    // Estrategia para localStorage
    this.strategies.set('localStorage', {
      get: (key) => this.getFromLocalStorage(key),
      set: (key, value, ttl) => this.setToLocalStorage(key, value, ttl),
      delete: (key) => this.deleteFromLocalStorage(key),
      clear: () => this.clearLocalStorage()
    });

    // Estrategia para sessionStorage
    this.strategies.set('sessionStorage', {
      get: (key) => this.getFromSessionStorage(key),
      set: (key, value, ttl) => this.setToSessionStorage(key, value, ttl),
      delete: (key) => this.deleteFromSessionStorage(key),
      clear: () => this.clearSessionStorage()
    });
  }

  /**
   * Configurar limpieza automática
   */
  setupCleanupInterval() {
    // Limpiar elementos expirados cada 5 minutos
    setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Obtener valor del cache (multi-nivel)
   * @param {string} key - Clave del cache
   * @param {Object} options - Opciones de búsqueda
   * @returns {*} Valor cacheado o null
   */
  async get(key, options = {}) {
    const { levels = ['memory', 'localStorage', 'sessionStorage'] } = options;

    for (const level of levels) {
      const strategy = this.strategies.get(level);
      if (strategy) {
        const value = await strategy.get(key);
        if (value !== null && value !== undefined) {
          this.metrics.hits++;
          
          // Promover a niveles superiores
          if (level !== 'memory' && levels.includes('memory')) {
            await this.set(key, value, { level: 'memory' });
          }
          
          this.notifyObservers('hit', { key, level, value });
          return value;
        }
      }
    }

    this.metrics.misses++;
    this.notifyObservers('miss', { key });
    return null;
  }

  /**
   * Establecer valor en cache
   * @param {string} key - Clave del cache
   * @param {*} value - Valor a cachear
   * @param {Object} options - Opciones de almacenamiento
   */
  async set(key, value, options = {}) {
    const {
      ttl = this.config.defaultTTL,
      level = 'memory',
      compress = false
    } = options;

    const strategy = this.strategies.get(level);
    if (strategy) {
      let processedValue = value;
      
      // Comprimir si es necesario
      if (compress && this.shouldCompress(value)) {
        processedValue = await this.compress(value);
      }

      await strategy.set(key, processedValue, ttl);
      this.metrics.sets++;
      this.notifyObservers('set', { key, level, value, ttl });
    }
  }

  /**
   * Eliminar del cache
   * @param {string} key - Clave a eliminar
   * @param {Object} options - Opciones de eliminación
   */
  async delete(key, options = {}) {
    const { levels = ['memory', 'localStorage', 'sessionStorage'] } = options;

    for (const level of levels) {
      const strategy = this.strategies.get(level);
      if (strategy) {
        await strategy.delete(key);
      }
    }

    this.metrics.deletes++;
    this.notifyObservers('delete', { key });
  }

  /**
   * Limpiar cache
   * @param {Object} options - Opciones de limpieza
   */
  async clear(options = {}) {
    const { levels = ['memory', 'localStorage', 'sessionStorage'] } = options;

    for (const level of levels) {
      const strategy = this.strategies.get(level);
      if (strategy) {
        await strategy.clear();
      }
    }

    this.notifyObservers('clear', { levels });
  }

  /**
   * Obtener o establecer con función fetcher
   * @param {string} key - Clave del cache
   * @param {Function} fetcher - Función para obtener datos
   * @param {Object} options - Opciones
   * @returns {*} Valor cacheado o fetched
   */
  async getOrSet(key, fetcher, options = {}) {
    let value = await this.get(key, options);
    
    if (value === null || value === undefined) {
      try {
        value = await fetcher();
        if (value !== null && value !== undefined) {
          await this.set(key, value, options);
        }
      } catch (error) {
        console.error('Error en fetcher de cache:', error);
        throw error;
      }
    }
    
    return value;
  }

  // ==================== IMPLEMENTACIONES DE ESTRATEGIAS ====================

  /**
   * Obtener de memoria
   */
  getFromMemory(key) {
    const item = this.memoryCache.get(key);
    if (item) {
      if (item.expires && Date.now() > item.expires) {
        this.memoryCache.delete(key);
        return null;
      }
      
      // Actualizar acceso para LRU
      item.lastAccess = Date.now();
      return item.value;
    }
    return null;
  }

  /**
   * Establecer en memoria
   */
  setToMemory(key, value, ttl) {
    // Verificar límites
    if (this.memoryCache.size >= this.config.maxMemoryItems) {
      this.evictLRU();
    }

    const expires = ttl ? Date.now() + ttl : null;
    this.memoryCache.set(key, {
      value,
      expires,
      lastAccess: Date.now(),
      size: this.calculateSize(value)
    });
  }

  /**
   * Eliminar de memoria
   */
  deleteFromMemory(key) {
    return this.memoryCache.delete(key);
  }

  /**
   * Limpiar memoria
   */
  clearMemory() {
    this.memoryCache.clear();
  }

  /**
   * Obtener de localStorage
   */
  getFromLocalStorage(key) {
    if (!this.config.enableLocalStorage) return null;
    
    try {
      const item = localStorage.getItem(`cache_${key}`);
      if (item) {
        const parsed = JSON.parse(item);
        if (parsed.expires && Date.now() > parsed.expires) {
          localStorage.removeItem(`cache_${key}`);
          return null;
        }
        return parsed.value;
      }
    } catch (error) {
      console.warn('Error leyendo de localStorage:', error);
    }
    return null;
  }

  /**
   * Establecer en localStorage
   */
  setToLocalStorage(key, value, ttl) {
    if (!this.config.enableLocalStorage) return;
    
    try {
      const expires = ttl ? Date.now() + ttl : null;
      const item = { value, expires };
      localStorage.setItem(`cache_${key}`, JSON.stringify(item));
    } catch (error) {
      console.warn('Error escribiendo a localStorage:', error);
    }
  }

  /**
   * Eliminar de localStorage
   */
  deleteFromLocalStorage(key) {
    if (!this.config.enableLocalStorage) return;
    localStorage.removeItem(`cache_${key}`);
  }

  /**
   * Limpiar localStorage
   */
  clearLocalStorage() {
    if (!this.config.enableLocalStorage) return;
    
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('cache_')) {
        localStorage.removeItem(key);
      }
    });
  }

  /**
   * Obtener de sessionStorage
   */
  getFromSessionStorage(key) {
    if (!this.config.enableSessionStorage) return null;
    
    try {
      const item = sessionStorage.getItem(`cache_${key}`);
      if (item) {
        const parsed = JSON.parse(item);
        if (parsed.expires && Date.now() > parsed.expires) {
          sessionStorage.removeItem(`cache_${key}`);
          return null;
        }
        return parsed.value;
      }
    } catch (error) {
      console.warn('Error leyendo de sessionStorage:', error);
    }
    return null;
  }

  /**
   * Establecer en sessionStorage
   */
  setToSessionStorage(key, value, ttl) {
    if (!this.config.enableSessionStorage) return;
    
    try {
      const expires = ttl ? Date.now() + ttl : null;
      const item = { value, expires };
      sessionStorage.setItem(`cache_${key}`, JSON.stringify(item));
    } catch (error) {
      console.warn('Error escribiendo a sessionStorage:', error);
    }
  }

  /**
   * Eliminar de sessionStorage
   */
  deleteFromSessionStorage(key) {
    if (!this.config.enableSessionStorage) return;
    sessionStorage.removeItem(`cache_${key}`);
  }

  /**
   * Limpiar sessionStorage
   */
  clearSessionStorage() {
    if (!this.config.enableSessionStorage) return;
    
    const keys = Object.keys(sessionStorage);
    keys.forEach(key => {
      if (key.startsWith('cache_')) {
        sessionStorage.removeItem(key);
      }
    });
  }

  // ==================== UTILIDADES ====================

  /**
   * Evicción LRU
   */
  evictLRU() {
    let oldestKey = null;
    let oldestTime = Date.now();

    for (const [key, item] of this.memoryCache) {
      if (item.lastAccess < oldestTime) {
        oldestTime = item.lastAccess;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.memoryCache.delete(oldestKey);
      this.metrics.evictions++;
    }
  }

  /**
   * Calcular tamaño aproximado
   */
  calculateSize(value) {
    return JSON.stringify(value).length * 2; // Aproximación en bytes
  }

  /**
   * Determinar si debe comprimir
   */
  shouldCompress(value) {
    return this.calculateSize(value) > this.config.compressionThreshold;
  }

  /**
   * Comprimir valor (simulado)
   */
  async compress(value) {
    // Implementación simplificada
    return { compressed: true, data: JSON.stringify(value) };
  }

  /**
   * Limpiar elementos expirados
   */
  cleanup() {
    // Limpiar memoria
    for (const [key, item] of this.memoryCache) {
      if (item.expires && Date.now() > item.expires) {
        this.memoryCache.delete(key);
      }
    }

    // Limpiar localStorage
    if (this.config.enableLocalStorage) {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('cache_')) {
          try {
            const item = JSON.parse(localStorage.getItem(key));
            if (item.expires && Date.now() > item.expires) {
              localStorage.removeItem(key);
            }
          } catch (error) {
            // Eliminar elementos corruptos
            localStorage.removeItem(key);
          }
        }
      });
    }
  }

  /**
   * Agregar observer
   */
  addObserver(observer) {
    this.observers.push(observer);
  }

  /**
   * Notificar observers
   */
  notifyObservers(event, data) {
    this.observers.forEach(observer => {
      try {
        observer(event, data);
      } catch (error) {
        console.error('Error en observer de cache:', error);
      }
    });
  }

  /**
   * Obtener métricas
   */
  getMetrics() {
    const hitRate = this.metrics.hits / (this.metrics.hits + this.metrics.misses) || 0;
    
    return {
      ...this.metrics,
      hitRate: Math.round(hitRate * 100) / 100,
      memorySize: this.memoryCache.size,
      memoryUsage: Array.from(this.memoryCache.values())
        .reduce((total, item) => total + item.size, 0)
    };
  }

  /**
   * Configurar el sistema
   */
  configure(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }
}

// Crear instancia singleton
const cacheManager = new CacheManager();

// Exportar funciones de conveniencia
export const getCache = (key, options) => cacheManager.get(key, options);
export const setCache = (key, value, options) => cacheManager.set(key, value, options);
export const deleteCache = (key, options) => cacheManager.delete(key, options);
export const clearCache = (options) => cacheManager.clear(options);
export const getOrSetCache = (key, fetcher, options) => cacheManager.getOrSet(key, fetcher, options);
export const getCacheMetrics = () => cacheManager.getMetrics();
export const configureCacheManager = (config) => cacheManager.configure(config);

// Exportar instancia completa
export default cacheManager;

