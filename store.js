/**
 * STORE - SISTEMA DE GESTIÓN DE ESTADO REFACTORIZADO
 * ==================================================
 *
 * Sistema de gestión de estado centralizado que combina pub-sub pattern
 * con métodos específicos para eliminar duplicación y mejorar mantenibilidad
 */

import { generateId } from './utils/helpers.js';
import { validateRequiredFields } from './utils/validation.js';

/**
 * Clase principal del Store
 */
class StudyingFlashStore {
  constructor() {
    this.state = {
      // Usuario y autenticación
      user: null,
      isAuthenticated: false,
      authToken: null,

      // Decks y flashcards
      decks: [],
      currentDeck: null,
      flashcards: [],

      // Sesión de estudio
      studySession: {
        deck: null,
        cards: [],
        currentIndex: 0,
        correct: 0,
        incorrect: 0,
        startTime: null,
        endTime: null,
        algorithm: 'sm2',
        isActive: false,
      },

      // Estadísticas y progreso
      stats: {
        totalStudyTime: 0,
        totalCards: 0,
        totalDecks: 0,
        accuracy: 0,
        streak: 0,
        level: 1,
        points: 0,
        achievements: [],
      },

      // Configuración y preferencias
      settings: {
        theme: 'dark',
        language: 'es',
        notifications: true,
        autoSave: true,
        studyReminders: true,
        algorithm: 'sm2',
        dailyGoal: 20,
      },

      // Estado de la aplicación
      app: {
        isLoading: false,
        isOnline: navigator.onLine,
        currentSection: 'dashboard',
        lastSync: null,
        errors: [],
        notifications: [],
      },
    };

    // Suscriptores del store
    this.subscribers = new Map();
    this.middlewares = [];
    this.history = [];
    this.maxHistorySize = 50;

    // Configuración de debugging
    this.debugMode = window.APP_CONFIG?.features?.debugging || false;

    this.log('🏪 StudyingFlashStore inicializado');
    this.setupAutoSave();
    this.setupConnectivityMonitoring();
  }

  /**
   * MÉTODOS PRINCIPALES DEL STORE
   * =============================
   */

  /**
   * Obtiene el estado completo o una parte específica
   */
  getState(path = null) {
    if (!path) {
      return { ...this.state };
    }

    // Navegación por path (ej: 'user.name', 'studySession.correct')
    const keys = path.split('.');
    let value = this.state;

    for (const key of keys) {
      if (value && typeof value === 'object' && key in value) {
        value = value[key];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Actualiza el estado con validación y notificación a suscriptores
   */
  setState(updates, options = {}) {
    const {
      silent = false,
      validate = true,
      addToHistory = true,
      source = 'unknown',
    } = options;

    try {
      // Validar actualizaciones si está habilitado
      if (validate && !this.validateStateUpdate(updates)) {
        throw new Error('Actualización de estado inválida');
      }

      // Guardar estado anterior para historial
      const previousState = addToHistory ? { ...this.state } : null;

      // Aplicar middlewares
      let processedUpdates = updates;
      for (const middleware of this.middlewares) {
        processedUpdates = middleware(processedUpdates, this.state);
      }

      // Actualizar estado
      this.state = this.deepMerge(this.state, processedUpdates);

      // Agregar al historial
      if (addToHistory) {
        this.addToHistory(previousState, updates, source);
      }

      // Notificar suscriptores
      if (!silent) {
        this.notifySubscribers(updates);
      }

      // Auto-guardar si está habilitado
      if (this.state.settings.autoSave) {
        this.saveToLocalStorage();
      }

      this.log('📝 Estado actualizado:', updates);
      return true;
    } catch (error) {
      this.error('❌ Error actualizando estado:', error);
      this.addError('store_update_error', error.message);
      return false;
    }
  }

  /**
   * Suscribirse a cambios del estado
   */
  subscribe(callback, filter = null) {
    if (typeof callback !== 'function') {
      throw new Error('Callback debe ser una función');
    }

    const id = generateId();
    this.subscribers.set(id, { callback, filter });

    this.log(`📡 Nuevo suscriptor: ${id}`);

    // Retornar función para cancelar suscripción
    return () => {
      this.subscribers.delete(id);
      this.log(`📡 Suscriptor cancelado: ${id}`);
    };
  }

  /**
   * Notifica a todos los suscriptores
   */
  notifySubscribers(updates) {
    this.subscribers.forEach(({ callback, filter }, id) => {
      try {
        // Aplicar filtro si existe
        if (filter && !this.matchesFilter(updates, filter)) {
          return;
        }

        callback(this.state, updates);
      } catch (error) {
        this.error(`❌ Error en suscriptor ${id}:`, error);
      }
    });
  }

  /**
   * MÉTODOS ESPECÍFICOS PARA USUARIO
   * ================================
   */

  setUser(user) {
    return this.setState(
      {
        user,
        isAuthenticated: !!user,
        authToken: user?.token || null,
      },
      { source: 'auth' }
    );
  }

  logout() {
    return this.setState(
      {
        user: null,
        isAuthenticated: false,
        authToken: null,
        studySession: {
          deck: null,
          cards: [],
          currentIndex: 0,
          correct: 0,
          incorrect: 0,
          startTime: null,
          endTime: null,
          algorithm: 'sm2',
          isActive: false,
        },
      },
      { source: 'auth' }
    );
  }

  /**
   * MÉTODOS ESPECÍFICOS PARA DECKS
   * ==============================
   */

  setDecks(decks) {
    if (!Array.isArray(decks)) {
      this.error('❌ Decks debe ser un array');
      return false;
    }

    return this.setState(
      {
        decks,
        stats: {
          ...this.state.stats,
          totalDecks: decks.length,
        },
      },
      { source: 'decks' }
    );
  }

  addDeck(deck) {
    if (!validateRequiredFields(deck, ['id', 'name'])) {
      return false;
    }

    const newDeck = {
      ...deck,
      createdAt: deck.createdAt || Date.now(),
      updatedAt: Date.now(),
    };

    return this.setState(
      {
        decks: [...this.state.decks, newDeck],
        stats: {
          ...this.state.stats,
          totalDecks: this.state.decks.length + 1,
        },
      },
      { source: 'decks' }
    );
  }

  updateDeck(deckId, updates) {
    const decks = this.state.decks.map((deck) =>
      deck.id === deckId ? { ...deck, ...updates, updatedAt: Date.now() } : deck
    );

    return this.setState({ decks }, { source: 'decks' });
  }

  deleteDeck(deckId) {
    const decks = this.state.decks.filter((deck) => deck.id !== deckId);

    // Si el deck eliminado era el actual, limpiar
    const currentDeck =
      this.state.currentDeck?.id === deckId ? null : this.state.currentDeck;

    return this.setState(
      {
        decks,
        currentDeck,
        stats: {
          ...this.state.stats,
          totalDecks: decks.length,
        },
      },
      { source: 'decks' }
    );
  }

  setCurrentDeck(deck) {
    return this.setState({ currentDeck: deck }, { source: 'decks' });
  }

  /**
   * MÉTODOS ESPECÍFICOS PARA SESIÓN DE ESTUDIO
   * ==========================================
   */

  startStudySession(deck, cards, algorithm = 'sm2') {
    if (!deck || !Array.isArray(cards) || cards.length === 0) {
      this.addError(
        'study_session_error',
        'Deck o cards inválidos para iniciar sesión'
      );
      return false;
    }

    return this.setState(
      {
        studySession: {
          deck,
          cards: [...cards],
          currentIndex: 0,
          correct: 0,
          incorrect: 0,
          startTime: Date.now(),
          endTime: null,
          algorithm,
          isActive: true,
        },
      },
      { source: 'study' }
    );
  }

  updateStudyProgress(correct) {
    const session = this.state.studySession;

    if (!session.isActive) {
      return false;
    }

    const updates = {
      studySession: {
        ...session,
        correct: correct ? session.correct + 1 : session.correct,
        incorrect: correct ? session.incorrect : session.incorrect + 1,
        currentIndex: Math.min(session.currentIndex + 1, session.cards.length),
      },
    };

    // Si es la última carta, finalizar sesión
    if (updates.studySession.currentIndex >= session.cards.length) {
      updates.studySession.isActive = false;
      updates.studySession.endTime = Date.now();

      // Actualizar estadísticas globales
      const accuracy =
        (updates.studySession.correct / session.cards.length) * 100;
      const studyTime = updates.studySession.endTime - session.startTime;

      updates.stats = {
        ...this.state.stats,
        totalStudyTime: this.state.stats.totalStudyTime + studyTime,
        totalCards: this.state.stats.totalCards + session.cards.length,
        accuracy: Math.round((this.state.stats.accuracy + accuracy) / 2),
      };
    }

    return this.setState(updates, { source: 'study' });
  }

  endStudySession() {
    const session = this.state.studySession;

    if (!session.isActive) {
      return false;
    }

    const endTime = Date.now();
    const studyTime = endTime - session.startTime;
    const accuracy =
      session.cards.length > 0
        ? (session.correct / session.cards.length) * 100
        : 0;

    return this.setState(
      {
        studySession: {
          ...session,
          isActive: false,
          endTime,
        },
        stats: {
          ...this.state.stats,
          totalStudyTime: this.state.stats.totalStudyTime + studyTime,
          totalCards: this.state.stats.totalCards + session.cards.length,
          accuracy: Math.round((this.state.stats.accuracy + accuracy) / 2),
        },
      },
      { source: 'study' }
    );
  }

  /**
   * MÉTODOS ESPECÍFICOS PARA CONFIGURACIÓN
   * ======================================
   */

  updateSettings(newSettings) {
    return this.setState(
      {
        settings: { ...this.state.settings, ...newSettings },
      },
      { source: 'settings' }
    );
  }

  /**
   * MÉTODOS ESPECÍFICOS PARA ESTADO DE LA APP
   * =========================================
   */

  setLoading(isLoading) {
    return this.setState(
      {
        app: { ...this.state.app, isLoading },
      },
      { source: 'app', silent: true }
    );
  }

  setCurrentSection(section) {
    return this.setState(
      {
        app: { ...this.state.app, currentSection: section },
      },
      { source: 'navigation' }
    );
  }

  addError(type, message) {
    const error = {
      id: generateId(),
      type,
      message,
      timestamp: Date.now(),
    };

    return this.setState(
      {
        app: {
          ...this.state.app,
          errors: [...this.state.app.errors, error],
        },
      },
      { source: 'error' }
    );
  }

  removeError(errorId) {
    return this.setState(
      {
        app: {
          ...this.state.app,
          errors: this.state.app.errors.filter((error) => error.id !== errorId),
        },
      },
      { source: 'error' }
    );
  }

  addNotification(message, type = 'info') {
    const notification = {
      id: generateId(),
      message,
      type,
      timestamp: Date.now(),
    };

    return this.setState(
      {
        app: {
          ...this.state.app,
          notifications: [...this.state.app.notifications, notification],
        },
      },
      { source: 'notification' }
    );
  }

  /**
   * MÉTODOS DE UTILIDAD
   * ===================
   */

  validateStateUpdate(updates) {
    // Validaciones básicas del estado
    if (typeof updates !== 'object' || updates === null) {
      return false;
    }

    // Validar estructura de studySession si se actualiza
    if (updates.studySession) {
      const session = updates.studySession;
      if (session.cards && !Array.isArray(session.cards)) {
        return false;
      }
      if (session.currentIndex && typeof session.currentIndex !== 'number') {
        return false;
      }
    }

    return true;
  }

  matchesFilter(updates, filter) {
    if (typeof filter === 'string') {
      return Object.prototype.hasOwnProperty.call(updates, filter);
    }

    if (Array.isArray(filter)) {
      return filter.some((key) =>
        Object.prototype.hasOwnProperty.call(updates, key)
      );
    }

    if (typeof filter === 'function') {
      return filter(updates, this.state);
    }

    return true;
  }

  deepMerge(target, source) {
    const result = { ...target };

    for (const key in source) {
      if (
        source[key] &&
        typeof source[key] === 'object' &&
        !Array.isArray(source[key])
      ) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }

  addToHistory(previousState, updates, source) {
    this.history.push({
      timestamp: Date.now(),
      previousState,
      updates,
      source,
    });

    // Mantener tamaño del historial
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
  }

  /**
   * PERSISTENCIA
   * ============
   */

  saveToLocalStorage() {
    try {
      const stateToSave = {
        ...this.state,
        app: {
          ...this.state.app,
          lastSync: Date.now(),
        },
      };

      localStorage.setItem('studyingflash_state', JSON.stringify(stateToSave));
      this.log('💾 Estado guardado en localStorage');
      return true;
    } catch (error) {
      this.error('❌ Error guardando en localStorage:', error);
      return false;
    }
  }

  loadFromLocalStorage() {
    try {
      const saved = localStorage.getItem('studyingflash_state');
      if (saved) {
        const parsedState = JSON.parse(saved);
        this.state = this.deepMerge(this.state, parsedState);
        this.log('📂 Estado cargado desde localStorage');
        return true;
      }
    } catch (error) {
      this.error('❌ Error cargando desde localStorage:', error);
    }
    return false;
  }

  clearLocalStorage() {
    try {
      localStorage.removeItem('studyingflash_state');
      this.log('🗑️ localStorage limpiado');
      return true;
    } catch (error) {
      this.error('❌ Error limpiando localStorage:', error);
      return false;
    }
  }

  /**
   * CONFIGURACIÓN AUTOMÁTICA
   * ========================
   */

  setupAutoSave() {
    // Auto-guardar cada 30 segundos si hay cambios
    setInterval(() => {
      if (this.state.settings.autoSave) {
        this.saveToLocalStorage();
      }
    }, 30000);
  }

  setupConnectivityMonitoring() {
    window.addEventListener('online', () => {
      this.setState(
        {
          app: { ...this.state.app, isOnline: true },
        },
        { source: 'connectivity', silent: true }
      );
    });

    window.addEventListener('offline', () => {
      this.setState(
        {
          app: { ...this.state.app, isOnline: false },
        },
        { source: 'connectivity', silent: true }
      );
    });
  }

  /**
   * DEBUGGING Y LOGGING
   * ===================
   */

  log(message, ...args) {
    if (this.debugMode) {
      console.log(`[Store] ${message}`, ...args);
    }
  }

  error(message, ...args) {
    console.error(`[Store] ${message}`, ...args);
  }

  getDebugInfo() {
    return {
      stateSize: JSON.stringify(this.state).length,
      subscribersCount: this.subscribers.size,
      historySize: this.history.length,
      middlewaresCount: this.middlewares.length,
      lastUpdate: this.history[this.history.length - 1]?.timestamp,
      memoryUsage: performance.memory
        ? {
          used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
          total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
          limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024),
        }
        : 'No disponible',
    };
  }
}

/**
 * INSTANCIA GLOBAL DEL STORE
 * ==========================
 */

// Crear instancia única del store
const store = new StudyingFlashStore();

// Cargar estado desde localStorage al inicializar
store.loadFromLocalStorage();

/**
 * FUNCIONES DE COMPATIBILIDAD
 * ===========================
 */

// Función simple de compatibilidad con el store anterior
export function createSimpleStore() {
  return {
    _state: store.getState(),
    _subs: [],

    getState() {
      return store.getState();
    },

    setState(patch) {
      store.setState(patch);
      this._subs.forEach((fn) => fn(store.getState()));
    },

    subscribe(fn) {
      const unsubscribe = store.subscribe(fn);
      this._subs.push(fn);
      return () => {
        const index = this._subs.indexOf(fn);
        if (index > -1) {
          this._subs.splice(index, 1);
        }
        unsubscribe();
      };
    },
  };
}

/**
 * EXPORTACIONES
 * =============
 */

// Exportar instancia principal
export { store };
export default store;

// Exportar clase para casos especiales
export { StudyingFlashStore };

// Exportar store simple para compatibilidad
export const simpleStore = createSimpleStore();

// Exponer globalmente para debugging
if (window.APP_CONFIG?.features?.debugging) {
  window.StudyingFlashStore = store;
  window.getStoreDebugInfo = () => store.getDebugInfo();
}

console.log(
  '🏪 Store refactorizado inicializado - Sistema de estado centralizado activo'
);
