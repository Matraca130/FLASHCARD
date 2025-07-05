import { api } from './apiClient.js';
import { store } from './store/store.js';
import { apiWithFallback, performCrudOperation } from './utils/apiHelpers.js';
import { showNotification, formatDate, generateId } from './utils/helpers.js';
import { validateRequiredFields } from './utils/validation.js';

/**
 * Servicio de estudio refactorizado
 * Maneja sesiones de estudio, algoritmos de repetición espaciada y estadísticas
 */

// Configuración del servicio de estudio
const STUDY_CONFIG = {
  maxCardsPerSession: 50,
  defaultSessionDuration: 30, // minutos
  algorithms: {
    sm2: 'SM-2 Clásico',
    ultra_sm2: 'Ultra SM-2',
    anki: 'Algoritmo Anki',
    fsrs: 'FSRS v4',
  },
  difficultyLevels: {
    again: 1, // Muy difícil
    hard: 2, // Difícil
    good: 3, // Bien
    easy: 4, // Fácil
  },
};

// Estado de la sesión actual
let currentSession = null;
let sessionTimer = null;
let sessionStartTime = null;

/**
 * Carga los decks disponibles para estudiar
 * @param {Object} options - Opciones de carga
 * @returns {Promise<void>}
 */
export async function loadStudyDecks(options = {}) {
  const {
    containerId = 'deck-selection',
    showStats = true,
    filterDue = false,
  } = options;

  const container = document.getElementById(containerId);
  if (!container) {
    console.warn(`Container ${containerId} not found`);
    return;
  }

  try {
    // Cargar decks con fallback
    const decks = await apiWithFallback('/api/decks', []);

    if (!decks || decks.length === 0) {
      renderEmptyDecksMessage(container);
      return;
    }

    // Cargar estadísticas de cada deck si está habilitado
    let decksWithStats = decks;
    if (showStats) {
      decksWithStats = await loadDecksWithStats(decks);
    }

    // Filtrar decks con cartas pendientes si está habilitado
    if (filterDue) {
      decksWithStats = decksWithStats.filter((deck) => deck.due_cards > 0);
    }

    // Renderizar decks
    renderStudyDecks(container, decksWithStats, { showStats });
  } catch (error) {
    console.error('Error loading study decks:', error);
    showNotification('Error al cargar decks para estudiar', 'error');
    container.innerHTML =
      '<div class="error-message">Error al cargar decks</div>';
  }
}

/**
 * Carga estadísticas para cada deck
 * @param {Array} decks - Array de decks
 * @returns {Promise<Array>} - Decks con estadísticas
 */
async function loadDecksWithStats(decks) {
  const statsPromises = decks.map(async (deck) => {
    try {
      const stats = await apiWithFallback(`/api/decks/${deck.id}/stats`, {
        due_cards: 0,
        new_cards: 0,
        learning_cards: 0,
        review_cards: 0,
        last_studied: null,
      });

      return { ...deck, ...stats };
    } catch (error) {
      console.error(`Error loading stats for deck ${deck.id}:`, error);
      return deck;
    }
  });

  return Promise.all(statsPromises);
}

/**
 * Renderiza mensaje cuando no hay decks
 * @param {HTMLElement} container - Contenedor
 */
function renderEmptyDecksMessage(container) {
  container.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">📚</div>
      <h3>No tienes decks para estudiar</h3>
      <p class="text-muted mb-3">Crea tu primer deck para comenzar a estudiar</p>
      <button class="btn btn-primary" onclick="showSection('crear')">
        ➕ Crear Primer Deck
      </button>
    </div>
  `;
}

/**
 * Renderiza los decks de estudio
 * @param {HTMLElement} container - Contenedor
 * @param {Array} decks - Array de decks
 * @param {Object} options - Opciones de renderizado
 */
function renderStudyDecks(container, decks, options = {}) {
  const { showStats = true } = options;

  const decksHTML = decks
    .map((deck) => {
      const dueCards = deck.due_cards || 0;
      const newCards = deck.new_cards || 0;
      const lastStudied = deck.last_studied
        ? formatDate(new Date(deck.last_studied), 'DD/MM/YYYY')
        : 'Nunca';

      return `
      <div class="study-deck-card ${dueCards > 0 ? 'has-due-cards' : ''}" 
           onclick="startStudySession(${deck.id})">
        <div class="deck-header">
          <h3 class="deck-title">${deck.name}</h3>
          <span class="deck-category">${deck.category || 'General'}</span>
        </div>
        
        <div class="deck-description">
          <p>${deck.description || 'Sin descripción'}</p>
        </div>
        
        ${
  showStats
    ? `
          <div class="deck-stats">
            <div class="stat-item ${dueCards > 0 ? 'highlight' : ''}">
              <span class="stat-value">${dueCards}</span>
              <span class="stat-label">Pendientes</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">${newCards}</span>
              <span class="stat-label">Nuevas</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">${deck.card_count || 0}</span>
              <span class="stat-label">Total</span>
            </div>
          </div>
          
          <div class="deck-meta">
            <span class="last-studied">Último estudio: ${lastStudied}</span>
          </div>
        `
    : `
          <div class="deck-simple-stats">
            <span class="card-count">${deck.card_count || 0} cartas</span>
          </div>
        `
}
        
        <div class="deck-actions">
          <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); startStudySession(${deck.id})">
            🎯 Estudiar
          </button>
          <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); showDeckPreview(${deck.id})">
            👁️ Vista previa
          </button>
        </div>
      </div>
    `;
    })
    .join('');

  container.innerHTML = `
    <div class="study-decks-grid">
      ${decksHTML}
    </div>
  `;
}

/**
 * Inicia una sesión de estudio
 * @param {number} deckId - ID del deck
 * @param {Object} options - Opciones de la sesión
 * @returns {Promise<void>}
 */
export async function startStudySession(deckId, options = {}) {
  if (!validateRequiredFields({ deckId }, ['deckId'])) {
    showNotification('ID de deck requerido', 'error');
    return;
  }

  const {
    algorithm = 'sm2',
    maxCards = STUDY_CONFIG.maxCardsPerSession,
    reviewMode = false,
  } = options;

  try {
    showNotification('Iniciando sesión de estudio...', 'info');

    // Cargar información del deck
    const deck = await apiWithFallback(`/api/decks/${deckId}`, null);
    if (!deck) {
      showNotification('Deck no encontrado', 'error');
      return;
    }

    // Cargar cartas para estudiar
    const endpoint = reviewMode
      ? `/api/study/cards/review/${deckId}`
      : `/api/study/cards/due/${deckId}`;

    const cards = await apiWithFallback(endpoint, []);

    if (!cards || cards.length === 0) {
      showNotification('No hay cartas para estudiar en este deck', 'warning');
      showCompletionMessage(deck);
      return;
    }

    // Limitar número de cartas
    const studyCards = cards.slice(0, maxCards);

    // Crear sesión
    const session = await createStudySession(deck, studyCards, algorithm);

    // Inicializar estado de la sesión
    currentSession = session;
    sessionStartTime = Date.now();

    // Actualizar store
    store.setState({
      studySession: {
        ...session,
        currentCardIndex: 0,
        answeredCards: [],
        sessionStats: {
          correct: 0,
          incorrect: 0,
          totalTime: 0,
          averageTime: 0,
        },
      },
    });

    // Iniciar interfaz de estudio
    if (window.enterStudyMode) {
      window.enterStudyMode(studyCards[0], session);
    }

    // Iniciar timer de sesión
    startSessionTimer();

    showNotification(`Sesión iniciada: ${studyCards.length} cartas`, 'success');
  } catch (error) {
    console.error('Error starting study session:', error);
    showNotification('Error al iniciar sesión de estudio', 'error');
  }
}

/**
 * Crea una nueva sesión de estudio
 * @param {Object} deck - Información del deck
 * @param {Array} cards - Cartas para estudiar
 * @param {string} algorithm - Algoritmo a usar
 * @returns {Promise<Object>} - Sesión creada
 */
async function createStudySession(deck, cards, algorithm) {
  const sessionData = {
    deck_id: deck.id,
    algorithm: algorithm,
    cards_count: cards.length,
    started_at: new Date().toISOString(),
  };

  try {
    // Crear sesión en el servidor
    const session = await performCrudOperation(
      () =>
        api('/api/study/sessions', {
          method: 'POST',
          body: JSON.stringify(sessionData),
        }),
      null, // No mostrar notificación
      null
    );

    return {
      id: session.id || generateId(),
      deck: deck,
      cards: cards,
      algorithm: algorithm,
      startedAt: sessionData.started_at,
      ...session,
    };
  } catch (error) {
    console.error('Error creating session on server:', error);

    // Fallback: crear sesión local
    return {
      id: generateId(),
      deck: deck,
      cards: cards,
      algorithm: algorithm,
      startedAt: sessionData.started_at,
      isLocal: true,
    };
  }
}

/**
 * Procesa la respuesta a una carta
 * @param {number} difficulty - Nivel de dificultad (1-4)
 * @param {number} responseTime - Tiempo de respuesta en ms
 * @returns {Promise<void>}
 */
export async function submitAnswer(difficulty, responseTime = null) {
  if (!currentSession) {
    showNotification('No hay sesión activa', 'error');
    return;
  }

  const state = store.getState();
  const sessionState = state.studySession;

  if (
    !sessionState ||
    sessionState.currentCardIndex >= sessionState.cards.length
  ) {
    showNotification('Sesión completada', 'info');
    return;
  }

  const currentCard = sessionState.cards[sessionState.currentCardIndex];
  const actualResponseTime =
    responseTime || Date.now() - (currentCard.startTime || Date.now());

  try {
    // Procesar respuesta con algoritmo
    const result = await processCardAnswer(
      currentCard,
      difficulty,
      actualResponseTime
    );

    // Actualizar estadísticas de la sesión
    const isCorrect = difficulty >= STUDY_CONFIG.difficultyLevels.good;
    const newStats = {
      ...sessionState.sessionStats,
      correct: sessionState.sessionStats.correct + (isCorrect ? 1 : 0),
      incorrect: sessionState.sessionStats.incorrect + (isCorrect ? 0 : 1),
      totalTime: sessionState.sessionStats.totalTime + actualResponseTime,
    };
    newStats.averageTime =
      newStats.totalTime / (sessionState.currentCardIndex + 1);

    // Agregar carta respondida al historial
    const answeredCard = {
      ...currentCard,
      difficulty: difficulty,
      responseTime: actualResponseTime,
      isCorrect: isCorrect,
      answeredAt: new Date().toISOString(),
      ...result,
    };

    const nextIndex = sessionState.currentCardIndex + 1;

    // Actualizar estado
    store.setState({
      studySession: {
        ...sessionState,
        currentCardIndex: nextIndex,
        answeredCards: [...sessionState.answeredCards, answeredCard],
        sessionStats: newStats,
      },
    });

    // Verificar si la sesión ha terminado
    if (nextIndex >= sessionState.cards.length) {
      await endStudySession();
    } else {
      // Mostrar siguiente carta
      const nextCard = sessionState.cards[nextIndex];
      nextCard.startTime = Date.now();

      if (window.updateFlashcard) {
        window.updateFlashcard(nextCard, {
          progress: Math.round((nextIndex / sessionState.cards.length) * 100),
          remaining: sessionState.cards.length - nextIndex,
          stats: newStats,
        });
      }
    }
  } catch (error) {
    console.error('Error submitting answer:', error);
    showNotification('Error al procesar respuesta', 'error');
  }
}

/**
 * Procesa la respuesta de una carta con el algoritmo correspondiente
 * @param {Object} card - Carta respondida
 * @param {number} difficulty - Dificultad de la respuesta
 * @param {number} responseTime - Tiempo de respuesta
 * @returns {Promise<Object>} - Resultado del procesamiento
 */
async function processCardAnswer(card, difficulty, responseTime) {
  const algorithm = currentSession.algorithm;

  const answerData = {
    card_id: card.id,
    session_id: currentSession.id,
    difficulty: difficulty,
    response_time: responseTime,
    algorithm: algorithm,
  };

  try {
    // Enviar al servidor para procesamiento
    const result = await performCrudOperation(
      () =>
        api('/api/study/answer', {
          method: 'POST',
          body: JSON.stringify(answerData),
        }),
      null, // No mostrar notificación
      null
    );

    return result;
  } catch (error) {
    console.error('Error processing answer on server:', error);

    // Fallback: procesamiento local básico
    return processAnswerLocally(card, difficulty, responseTime, algorithm);
  }
}

/**
 * Procesa la respuesta localmente como fallback
 * @param {Object} card - Carta
 * @param {number} difficulty - Dificultad
 * @param {number} responseTime - Tiempo de respuesta
 * @param {string} algorithm - Algoritmo
 * @returns {Object} - Resultado del procesamiento
 */
function processAnswerLocally(card, difficulty, responseTime, algorithm) {
  // Implementación básica del algoritmo SM-2
  let interval = card.interval || 1;
  let easeFactor = card.ease_factor || 2.5;
  let repetitions = card.repetitions || 0;

  if (difficulty >= STUDY_CONFIG.difficultyLevels.good) {
    // Respuesta correcta
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    repetitions++;
  } else {
    // Respuesta incorrecta
    repetitions = 0;
    interval = 1;
  }

  // Ajustar factor de facilidad
  easeFactor = Math.max(
    1.3,
    easeFactor + (0.1 - (5 - difficulty) * (0.08 + (5 - difficulty) * 0.02))
  );

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + interval);

  return {
    interval: interval,
    ease_factor: easeFactor,
    repetitions: repetitions,
    next_review: nextReview.toISOString(),
    processed_locally: true,
  };
}

/**
 * Finaliza la sesión de estudio
 * @returns {Promise<void>}
 */
export async function endStudySession() {
  if (!currentSession) {
    showNotification('No hay sesión activa', 'warning');
    return;
  }

  try {
    const state = store.getState();
    const sessionState = state.studySession;
    const endTime = Date.now();
    const totalDuration = Math.round((endTime - sessionStartTime) / 1000); // segundos

    // Preparar datos de finalización
    const sessionEndData = {
      session_id: currentSession.id,
      ended_at: new Date().toISOString(),
      total_duration: totalDuration,
      cards_studied: sessionState.answeredCards.length,
      cards_correct: sessionState.sessionStats.correct,
      cards_incorrect: sessionState.sessionStats.incorrect,
      average_response_time: Math.round(sessionState.sessionStats.averageTime),
    };

    // Finalizar sesión en el servidor
    try {
      await performCrudOperation(
        () =>
          api(`/api/study/sessions/${currentSession.id}/end`, {
            method: 'POST',
            body: JSON.stringify(sessionEndData),
          }),
        null, // No mostrar notificación
        null
      );
    } catch (error) {
      console.error('Error ending session on server:', error);
      // Continuar con finalización local
    }

    // Detener timer
    if (sessionTimer) {
      clearInterval(sessionTimer);
      sessionTimer = null;
    }

    // Mostrar resultados
    showSessionResults(sessionState, sessionEndData);

    // Limpiar estado
    currentSession = null;
    sessionStartTime = null;

    store.setState({
      studySession: null,
    });

    // Volver a la vista de decks
    if (window.exitStudyMode) {
      window.exitStudyMode();
    }
  } catch (error) {
    console.error('Error ending study session:', error);
    showNotification('Error al finalizar sesión', 'error');
  }
}

/**
 * Muestra los resultados de la sesión
 * @param {Object} sessionState - Estado de la sesión
 * @param {Object} sessionData - Datos de finalización
 */
function showSessionResults(sessionState, sessionData) {
  const accuracy =
    sessionState.answeredCards.length > 0
      ? Math.round(
        (sessionState.sessionStats.correct /
            sessionState.answeredCards.length) *
            100
      )
      : 0;

  const avgTimeSeconds = Math.round(
    sessionState.sessionStats.averageTime / 1000
  );
  const totalMinutes = Math.round(sessionData.total_duration / 60);

  const message = `
    🎯 Sesión completada
    📊 ${sessionState.answeredCards.length} cartas estudiadas
    ✅ ${accuracy}% de precisión
    ⏱️ ${totalMinutes} minutos total
    🚀 ${avgTimeSeconds}s promedio por carta
  `;

  showNotification(message, 'success', 8000);

  // Actualizar estadísticas si hay función disponible
  if (window.updateUserStats) {
    window.updateUserStats({
      cardsStudied: sessionState.answeredCards.length,
      accuracy: accuracy,
      studyTime: sessionData.total_duration,
    });
  }
}

/**
 * Muestra mensaje de finalización cuando no hay cartas
 * @param {Object} deck - Información del deck
 */
function showCompletionMessage(deck) {
  const message = `
    🎉 ¡Excelente trabajo!
    
    Has completado todas las cartas pendientes del deck "${deck.name}".
    
    Las cartas aparecerán nuevamente según el algoritmo de repetición espaciada.
  `;

  showNotification(message, 'success', 6000);
}

/**
 * Inicia el timer de la sesión
 */
function startSessionTimer() {
  if (sessionTimer) {
    clearInterval(sessionTimer);
  }

  sessionTimer = setInterval(() => {
    if (currentSession && sessionStartTime) {
      const elapsed = Math.round((Date.now() - sessionStartTime) / 1000);

      // Actualizar UI del timer si existe
      if (window.updateSessionTimer) {
        window.updateSessionTimer(elapsed);
      }
    }
  }, 1000);
}

/**
 * Pausa la sesión actual
 */
export function pauseStudySession() {
  if (sessionTimer) {
    clearInterval(sessionTimer);
    sessionTimer = null;
  }

  showNotification('Sesión pausada', 'info');
}

/**
 * Reanuda la sesión pausada
 */
export function resumeStudySession() {
  if (currentSession && !sessionTimer) {
    startSessionTimer();
    showNotification('Sesión reanudada', 'info');
  }
}

/**
 * Obtiene estadísticas de la sesión actual
 * @returns {Object|null} - Estadísticas actuales
 */
export function getCurrentSessionStats() {
  if (!currentSession) {
    return null;
  }

  const state = store.getState();
  const sessionState = state.studySession;

  if (!sessionState) {
    return null;
  }

  const elapsed = sessionStartTime
    ? Math.round((Date.now() - sessionStartTime) / 1000)
    : 0;

  return {
    ...sessionState.sessionStats,
    cardsRemaining: sessionState.cards.length - sessionState.currentCardIndex,
    cardsTotal: sessionState.cards.length,
    progress: Math.round(
      (sessionState.currentCardIndex / sessionState.cards.length) * 100
    ),
    elapsedTime: elapsed,
    deck: currentSession.deck,
  };
}

// Exponer funciones globalmente para compatibilidad
window.loadStudyDecks = loadStudyDecks;
window.startStudySession = startStudySession;
window.submitAnswer = submitAnswer;
window.endStudySession = endStudySession;
window.pauseStudySession = pauseStudySession;
window.resumeStudySession = resumeStudySession;
window.getCurrentSessionStats = getCurrentSessionStats;
