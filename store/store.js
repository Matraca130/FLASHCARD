/**
 * STORE/STORE.JS - COMPATIBILIDAD Y RE-EXPORTACIÓN
 * ================================================
 *
 * Este archivo mantiene compatibilidad con imports que usan 'sto'
 * mientras redirige al sistema de store refactorizado principal
 */

// Importar el store refactorizado principal
import store, { StudyingFlashStore, simpleStore } from '';

/**
 * CLASE DE COMPATIBILIDAD
 * =======================
 *
 * Mantiene la interfaz original para código legacy
 */
class LegacyStore {
  constructor() {
    // Usar el store refactorizado como backend
    this.store = store;

    this.state = this.store.getState();
    this.listeners = [];

    // Suscribirse a cambios del store principal
    this.store.subscribe((newState) => {
      this.state = newState;
      this.notifyListeners();
    });

    );
  }

  /**
   * Métodos de compatibilidad con la interfaz original
   */
  getState() {
    return this.store.getState();
  }

  setState(newState) {
    return this.store.setState(newState, { source: 'legacy' });
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  notifyListeners() {
    this.listeners.forEach((listener) => {
      try {
        listener(this.state);
      } catch (error) {
        console.error('[LegacyStore] Error en listener:', error);
      }
    });
  }

  /**
   * Métodos específicos de compatibilidad
   */
  setUser(user) {
    return this.store.setUser(user);
  }

  setDecks(decks) {
    return this.store.setDecks(decks);
  }

  addDeck(deck) {
    return this.store.addDeck(deck);
  }

  updateDeck(deckId, updates) {
    return this.store.updateDeck(deckId, updates);
  }

  deleteDeck(deckId) {
    return this.store.deleteDeck(deckId);
  }
}

/**
 * EXPORTACIONES
 * =============
 */

// Crear instancia de compatibilidad
const legacyStore = new LegacyStore();

// Exportar como default para compatibilidad
export default legacyStore;

// Exportar también como named export
export { legacyStore as store };

// Re-exportar el store principal para casos que lo necesiten
/**
 * MENSAJE DE MIGRACIÓN
 * ====================
 */
console.log(`
🔄 AVISO DE MIGRACIÓN:
  import store from '
  
El store refactorizado ofrece:
✅ Mejor rendimiento
✅ Más funcionalidades
✅ Mejor debugging
✅ Persistencia automática
✅ Validación de estado
`);
