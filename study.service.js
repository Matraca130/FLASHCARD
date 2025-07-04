import { api } from '../apiClient.js';
import { store } from '../store/store.js';

export async function loadStudyDecks() {
  try {
    const decks = await api('/api/decks');
    const deckSelection = document.getElementById('deck-selection');
    if (!deckSelection) return;
    if (!decks || decks.length === 0) {
      deckSelection.innerHTML = `
        <div class="card text-center">
          <h3>No tienes decks para estudiar</h3>
          <p class="text-muted mb-3">Crea tu primer deck para comenzar</p>
          <button class="btn btn-primary" onclick="showSection('crear')">
            ➕ Crear Deck
          </button>
        </div>`;
      return;
    }
    // Render deck cards (simplified)
    deckSelection.innerHTML = decks.map(deck => `
      <div class="deck-card" onclick="startStudySession(${deck.id})">
        <h3>${deck.name}</h3>
        <p>${deck.description || 'Sin descripción'}</p>
        <span>${deck.card_count || 0} cartas</span>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading decks:', error);
    if (window.showNotification) window.showNotification('Error al cargar decks para estudiar', 'error');
  }
}

export async function startStudySession(deckId) {
  try {
    const cards = await api(`/api/decks/${deckId}/flashcards`);
    if (!cards || cards.length === 0) {
      if (window.showNotification) window.showNotification('Este deck no tiene flashcards', 'warning');
      return;
    }
    store.setState({
      studySession: {
        deck: deckId,
        cards,
        index: 0,
        correct: 0,
        incorrect: 0
      }
    });
    if (window.enterStudyMode) window.enterStudyMode(cards[0]);
  } catch (error) {
    console.error('Error starting study session:', error);
    if (window.showNotification) window.showNotification('Error al iniciar sesión de estudio', 'error');
  }
}

export function submitAnswer(correct) {
  const state = store.getState();
  const session = state.studySession;
  if (!session.cards.length) return;
  const nextIndex = session.index + 1;
  store.setState({
    studySession: {
      ...session,
      index: nextIndex,
      correct: session.correct + (correct ? 1 : 0),
      incorrect: session.incorrect + (correct ? 0 : 1)
    }
  });
  if (nextIndex >= session.cards.length) {
    if (window.endStudySession) window.endStudySession();
  } else {
    if (window.updateFlashcard) window.updateFlashcard(session.cards[nextIndex]);
  }
}