import { ApiClient } from './apiClient.js';
import { store } from './store/store.js';
import { validateFlashcardData } from './utils/validation.js';
import {
  performCrudOperation,
  apiWithFallback,
  FALLBACK_DATA,
} from './utils/apiHelpers.js';
import {
  showNotification,
  clearForm,
  getVisibleElement,
} from './utils/helpers.js';

// Variable para el ID de flashcard en edición
let editingFlashcardId = null;

/**
 * Crea una nueva flashcard
 */
export async function createFlashcard() {
  const deckId = document.getElementById('flashcard-deck')?.value;
  const front = document.getElementById('flashcard-front')?.value?.trim();
  const back = document.getElementById('flashcard-back')?.value?.trim();

  // Validar datos usando utilidad común
  if (!validateFlashcardData(deckId, front, back)) {
    return;
  }

  try {
    const result = await performCrudOperation(
      () =>
        ApiClient.post('/api/flashcards', {
          deck_id: deckId,
          front: front,
          back: back,
        }),
      'Flashcard creada exitosamente',
      'Error al crear la flashcard'
    );

    // Limpiar formulario usando utilidad común
    clearForm('#flashcard-form');

    // Recargar datos si estamos en la sección de gestión
    if (window.loadManageData) {
      window.loadManageData();
    }

    return result;
  } catch (error) {
    console.error('Error creating flashcard:', error);
    // El error ya fue manejado por performCrudOperation
  }
}

/**
 * Edita una flashcard existente
 * @param {number} flashcardId - ID de la flashcard a editar
 */
export async function editFlashcard(flashcardId) {
  try {
    const flashcard = await apiWithFallback(
      `/api/flashcards/${flashcardId}`,
      FALLBACK_DATA.flashcards.find((f) => f.id === flashcardId) || {},
      'GET'
    );

    editingFlashcardId = flashcardId;

    // Llenar formulario de edición
    const frontInput = document.getElementById('flashcard-front');
    const backInput = document.getElementById('flashcard-back');
    const deckSelect = document.getElementById('flashcard-deck');

    if (frontInput) {
      frontInput.value = flashcard.front || '';
    }
    if (backInput) {
      backInput.value = flashcard.back || '';
    }
    if (deckSelect) {
      deckSelect.value = flashcard.deck_id || '';
    }

    // Cambiar texto del botón
    const submitBtn = document.getElementById('create-flashcard-btn');
    if (submitBtn) {
      submitBtn.textContent = 'Actualizar Flashcard';
      submitBtn.onclick = () => updateFlashcard();
    }
  } catch (error) {
    console.error('Error loading flashcard for edit:', error);
    showNotification('Error al cargar la flashcard', 'error');
  }
}

/**
 * Actualiza una flashcard existente
 */
export async function updateFlashcard() {
  if (!editingFlashcardId) {
    showNotification('No hay flashcard en edición', 'error');
    return;
  }

  const deckId = document.getElementById('flashcard-deck')?.value;
  const front = document.getElementById('flashcard-front')?.value?.trim();
  const back = document.getElementById('flashcard-back')?.value?.trim();

  // Validar datos usando utilidad común
  if (!validateFlashcardData(deckId, front, back)) {
    return;
  }

  try {
    const result = await performCrudOperation(
      () =>
        ApiClient.put(`/api/flashcards/${editingFlashcardId}`, {
          deck_id: deckId,
          front: front,
          back: back,
        }),
      'Flashcard actualizada exitosamente',
      'Error al actualizar la flashcard'
    );

    // Resetear modo de edición
    resetEditMode();

    // Recargar datos
    if (window.loadManageData) {
      window.loadManageData();
    }

    return result;
  } catch (error) {
    console.error('Error updating flashcard:', error);
    // El error ya fue manejado por performCrudOperation
  }
}

/**
 * Elimina una flashcard
 * @param {number} flashcardId - ID de la flashcard a eliminar
 */
export async function deleteFlashcard(flashcardId) {
  if (!confirm('¿Estás seguro de que quieres eliminar esta flashcard?')) {
    return;
  }

  try {
    await performCrudOperation(
      () =>
        ApiClient.delete(`/api/flashcards/${flashcardId}`),
      'Flashcard eliminada exitosamente',
      'Error al eliminar la flashcard'
    );

    // Recargar datos
    if (window.loadManageData) {
      window.loadManageData();
    }
  } catch (error) {
    console.error('Error deleting flashcard:', error);
    // El error ya fue manejado por performCrudOperation
  }
}

/**
 * Carga flashcards de un deck específico
 * @param {number} deckId - ID del deck
 * @returns {Promise<Array>} - Array de flashcards
 */
export async function loadFlashcardsByDeck(deckId) {
  try {
    const flashcards = await apiWithFallback(
      `/api/flashcards/deck/${deckId}`,
      FALLBACK_DATA.flashcards.filter((f) => f.deck_id === deckId),
      'GET'
    );

    return flashcards || [];
  } catch (error) {
    console.error('Error loading flashcards:', error);
    return [];
  }
}

/**
 * Carga todas las flashcards del usuario
 * @returns {Promise<Array>} - Array de todas las flashcards
 */
export async function loadAllFlashcards() {
  try {
    const flashcards = await apiWithFallback(
      '/api/flashcards',
      FALLBACK_DATA.flashcards,
      'GET'
    );

    return flashcards || [];
  } catch (error) {
    console.error('Error loading all flashcards:', error);
    return [];
  }
}

/**
 * Resetea el modo de edición
 */
function resetEditMode() {
  editingFlashcardId = null;

  // Limpiar formulario
  clearForm('#flashcard-form');

  // Restaurar texto del botón
  const submitBtn = document.getElementById('create-flashcard-btn');
  if (submitBtn) {
    submitBtn.textContent = 'Crear Flashcard';
    submitBtn.onclick = () => createFlashcard();
  }
}

/**
 * Cancela el modo de edición
 */
export function cancelEdit() {
  resetEditMode();
  showNotification('Edición cancelada', 'info');
}

/**
 * Obtiene el ID de la flashcard en edición
 * @returns {number|null} - ID de la flashcard en edición o null
 */
export function getEditingFlashcardId() {
  return editingFlashcardId;
}


