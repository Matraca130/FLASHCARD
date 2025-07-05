// Simple pub-sub store (lightweight replacement for Redux/Pinia)
export const store = {
  _state: {
    currentUser: null,
    studySession: {
      deck: null,
      cards: [],
      index: 0,
      correct: 0,
      incorrect: 0
    }
  },
  _subs: [],
  getState() {
    return this._state;
  },
  setState(patch) {
    this._state = {
      ...this._state,
      ...patch
    };
    // Notify subscribers
    this._subs.forEach(fn => fn(this._state));
  },
  subscribe(fn) {
    this._subs.push(fn);
    return () => {
      this._subs = this._subs.filter(f => f !== fn);
    };
  }
};
