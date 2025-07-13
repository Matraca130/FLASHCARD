/**
 * STORE/STORE.JS - COMPATIBILIDAD Y RE-EXPORTACIÓN
 * =================================================
 * Implementa un store sencillo y mantiene compatibilidad con la API previa.
 */

// Implementación básica de un store reactivo
export function createSimpleStore(initialState = {}) {
  let state = { ...initialState };
  const listeners = new Set();

  function getState() {
    return state;
  }

  function setState(partial) {
    state = { ...state, ...partial };
    listeners.forEach((l) => l(state));
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  return { getState, setState, subscribe };
}

export const simpleStore = createSimpleStore();

export class StudyingFlashStore {
  constructor(initialState = {}) {
    this.store = createSimpleStore(initialState);
  }
  getState() {
    return this.store.getState();
  }
  setState(state) {
    this.store.setState(state);
  }
  subscribe(listener) {
    return this.store.subscribe(listener);
  }
}

// Store principal de la aplicación
const store = createSimpleStore({
  user: null,
  decks: [],
  flashcards: [],
  studySession: {},
});

// Métodos de conveniencia
store.setUser = (user) => store.setState({ user });
store.setDecks = (decks) => store.setState({ decks });
store.addDeck = (deck) => store.setState({ decks: [...store.getState().decks, deck] });
store.updateDeck = (id, updates) => {
  const decks = store.getState().decks.map((d) => (d.id === id ? { ...d, ...updates } : d));
  store.setState({ decks });
};
store.deleteDeck = (id) => {
  const decks = store.getState().decks.filter((d) => d.id !== id);
  store.setState({ decks });
};
store.dispatch = (action, payload) => {
  switch (action) {
    case 'flashcard/add':
      store.setState({ flashcards: [...store.getState().flashcards, payload] });
      break;
    case 'flashcard/update':
      store.setState({
        flashcards: store.getState().flashcards.map((f) => (f.id === payload.id ? payload : f)),
      });
      break;
    case 'review/add':
      store.setState({ reviews: [...(store.getState().reviews || []), payload] });
      break;
    case 'studySession/updateProgress':
      store.setState({ studySession: { ...(store.getState().studySession || {}), ...payload } });
      break;
    default:
      store.setState(payload);
  }
};

// === Compatibilidad legacy ===
class LegacyStore {
  constructor() {
    this.store = store;
    this.state = this.store.getState();
    this.listeners = [];
    this.unsubscribe = this.store.subscribe((s) => {
      this.state = s;
      this.notifyListeners();
    });
  }

  getState() {
    return this.store.getState();
  }

  setState(newState) {
    this.store.setState(newState);
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  notifyListeners() {
    this.listeners.forEach((l) => {
      try {
        l(this.state);
      } catch (e) {
        console.error('[LegacyStore] Error en listener:', e);
      }
    });
  }

  setUser(user) {
    return store.setUser(user);
  }
  setDecks(decks) {
    return store.setDecks(decks);
  }
  addDeck(deck) {
    return store.addDeck(deck);
  }
  updateDeck(id, updates) {
    return store.updateDeck(id, updates);
  }
  deleteDeck(id) {
    return store.deleteDeck(id);
  }
}

const legacyStore = new LegacyStore();
export default legacyStore;
export { legacyStore as store, store as mainStore, StudyingFlashStore, simpleStore };

console.log(
  `ℹ️ Migración de store completada. Importa el nuevo store con:\n  import store from './store/store.js';`
);
