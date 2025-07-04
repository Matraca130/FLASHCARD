// store/store.js - Gestión de estado global
class Store {
  constructor() {
    this.state = {
      user: null,
      decks: [],
      currentDeck: null,
      studySession: null,
      stats: {},
      settings: {}
    };
    this.listeners = [];
  }

  getState() {
    return { ...this.state };
  }

  setState(newState) {
    this.state = { ...this.state, ...newState };
    this.notifyListeners();
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notifyListeners() {
    this.listeners.forEach(listener => listener(this.state));
  }

  // Métodos específicos
  setUser(user) {
    this.setState({ user });
  }

  setDecks(decks) {
    this.setState({ decks });
  }

  addDeck(deck) {
    this.setState({ decks: [...this.state.decks, deck] });
  }

  updateDeck(deckId, updates) {
    const decks = this.state.decks.map(deck => 
      deck.id === deckId ? { ...deck, ...updates } : deck
    );
    this.setState({ decks });
  }

  deleteDeck(deckId) {
    const decks = this.state.decks.filter(deck => deck.id !== deckId);
    this.setState({ decks });
  }
}

export const store = new Store();
export default store;

