/**
 * NavigationService - Servicio empresarial de navegación
 * =====================================================
 * 
 * Servicio centralizado para manejar toda la navegación de la aplicación
 * Implementa patrones empresariales: Singleton, Observer, Command
 */

class NavigationService {
  constructor() {
    if (NavigationService.instance) {
      return NavigationService.instance;
    }

    this.isInitialized = false;
    this.currentSection = null;
    this.navigationHistory = [];
    this.listeners = new Map();
    this.pendingNavigations = [];
    
    NavigationService.instance = this;
    this.init();
  }

  /**
   * Inicialización del servicio
   */
  init() {
    this.waitForNavigationSystem();
  }

  /**
   * Espera a que el sistema de navegación esté disponible
   */
  waitForNavigationSystem() {
    const checkNavigation = () => {
      if (window.showSection && typeof window.showSection === 'function') {
        this.isInitialized = true;
        this.processPendingNavigations();
        this.emit('navigationReady');
      } else {
        // Reintentar en el próximo tick
        setTimeout(checkNavigation, 10);
      }
    };
    
    checkNavigation();
  }

  /**
   * Navegar a una sección
   * @param {string} sectionId - ID de la sección
   * @param {Object} options - Opciones de navegación
   */
  navigateTo(sectionId, options = {}) {
    if (!this.isInitialized) {
      // Agregar a cola de navegaciones pendientes
      this.pendingNavigations.push({ sectionId, options });
      return Promise.resolve(false);
    }

    try {
      // Validar sección
      if (!sectionId || typeof sectionId !== 'string') {
        throw new Error('ID de sección inválido');
      }

      // Agregar a historial
      if (this.currentSection) {
        this.navigationHistory.push(this.currentSection);
      }

      // Ejecutar navegación
      const result = window.showSection(sectionId, options);
      
      if (result !== false) {
        this.currentSection = sectionId;
        this.emit('navigationChanged', { from: this.navigationHistory.slice(-1)[0], to: sectionId });
      }

      return Promise.resolve(result);
    } catch (error) {
      console.error('NavigationService: Error en navegación:', error);
      this.emit('navigationError', { sectionId, error });
      return Promise.resolve(false);
    }
  }

  /**
   * Procesar navegaciones pendientes
   */
  processPendingNavigations() {
    while (this.pendingNavigations.length > 0) {
      const { sectionId, options } = this.pendingNavigations.shift();
      this.navigateTo(sectionId, options);
    }
  }

  /**
   * Obtener sección actual
   */
  getCurrentSection() {
    return this.currentSection || (window.getCurrentSection ? window.getCurrentSection() : null);
  }

  /**
   * Navegar hacia atrás
   */
  goBack() {
    if (this.navigationHistory.length > 0) {
      const previousSection = this.navigationHistory.pop();
      return this.navigateTo(previousSection);
    }
    return Promise.resolve(false);
  }

  /**
   * Limpiar historial
   */
  clearHistory() {
    this.navigationHistory = [];
  }

  /**
   * Suscribirse a eventos de navegación
   * @param {string} event - Nombre del evento
   * @param {Function} callback - Función callback
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  /**
   * Desuscribirse de eventos
   * @param {string} event - Nombre del evento
   * @param {Function} callback - Función callback
   */
  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Emitir evento
   * @param {string} event - Nombre del evento
   * @param {*} data - Datos del evento
   */
  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`NavigationService: Error en listener de ${event}:`, error);
        }
      });
    }
  }

  /**
   * Verificar si el servicio está listo
   */
  isReady() {
    return this.isInitialized;
  }

  /**
   * Obtener estadísticas de navegación
   */
  getStats() {
    return {
      currentSection: this.currentSection,
      historyLength: this.navigationHistory.length,
      pendingNavigations: this.pendingNavigations.length,
      isInitialized: this.isInitialized
    };
  }
}

// Crear instancia singleton
const navigationService = new NavigationService();

// Exportar funciones de conveniencia
export const navigateTo = (sectionId, options) => navigationService.navigateTo(sectionId, options);
export const getCurrentSection = () => navigationService.getCurrentSection();
export const goBack = () => navigationService.goBack();
export const onNavigationChange = (callback) => navigationService.on('navigationChanged', callback);
export const onNavigationReady = (callback) => navigationService.on('navigationReady', callback);

// Exportar servicio completo
export default navigationService;

