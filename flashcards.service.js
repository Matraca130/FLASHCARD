import { api } from './apiClient.js';
import { store } from './store/store.js';
import { showNotification } from './utils/helpers.js';

// Variable para el ID de flashcard en edición
let editingFlashcardId = null;

/**
 * Crea una nueva flashcard
 */
export async function createFlashcard() {
  const deckId = document.getElementById('flashcard-deck')?.value;
  const front = document.getElementById('flashcard-front')?.value?.trim();
  const back = document.getElementById('flashcard-back')?.value?.trim();
  
  if (!deckId || !front || !back) {
    showNotification('Por favor, completa todos los campos', 'error');
    return;
  }
  
  try {
    const response = await api('/api/flashcards', {
      method: 'POST',
      body: JSON.stringify({
        deck_id: deckId,
        front: front,
        back: back
      })
    });
    
    if (response.id) {
      showNotification('Flashcard creada exitosamente', 'success');
      
      // Limpiar formulario
      document.getElementById('flashcard-front').value = '';
      document.getElementById('flashcard-back').value = '';
      
      // Recargar datos si estamos en la sección de gestión
      if (window.loadManageData) {
        window.loadManageData();
      }
    }
    
  } catch (error) {
    console.error('Error creating flashcard:', error);
    showNotification('Error al crear la flashcard', 'error');
  }
}

/**
 * Edita una flashcard existente
 */
export async function editFlashcard(flashcardId) {
  try {
    const response = await api(`/api/flashcards/${flashcardId}`);
    const flashcard = response;
    
    editingFlashcardId = flashcardId;
    
    // Llenar formulario de edición
    const frontInput = document.getElementById('edit-flashcard-front');
    const backInput = document.getElementById('edit-flashcard-back');
    
    if (frontInput) frontInput.value = flashcard.front || '';
    if (backInput) backInput.value = flashcard.back || '';
    
    // Cargar decks para selección
    try {
      const decks = await api('/api/decks');
      const deckSelect = document.getElementById('edit-flashcard-deck');
      
      if (deckSelect && Array.isArray(decks)) {
        deckSelect.innerHTML = decks.map(deck => 
          `<option value="${deck.id}" ${deck.id === flashcard.deck_id ? 'selected' : ''}>${deck.name}</option>`
        ).join('');
      }
    } catch (error) {
      console.error('Error loading decks:', error);
    }
    
    // Mostrar modal de edición
    showEditFlashcardModal();
    
  } catch (error) {
    console.error('Error loading flashcard:', error);
    showNotification('Error al cargar la flashcard', 'error');
  }
}

/**
 * Actualiza una flashcard
 */
export async function updateFlashcard() {
  if (!editingFlashcardId) {
    showNotification('No hay flashcard seleccionada para editar', 'error');
    return;
  }
  
  const deckId = document.getElementById('edit-flashcard-deck')?.value;
  const front = document.getElementById('edit-flashcard-front')?.value?.trim();
  const back = document.getElementById('edit-flashcard-back')?.value?.trim();
  
  if (!deckId || !front || !back) {
    showNotification('Por favor, completa todos los campos', 'error');
    return;
  }
  
  try {
    const response = await api(`/api/flashcards/${editingFlashcardId}`, {
      method: 'PUT',
      body: JSON.stringify({
        deck_id: deckId,
        front: front,
        back: back
      })
    });
    
    showNotification('Flashcard actualizada exitosamente', 'success');
    hideEditFlashcardModal();
    
    // Recargar datos
    if (window.loadManageData) {
      window.loadManageData();
    }
    
  } catch (error) {
    console.error('Error updating flashcard:', error);
    showNotification('Error al actualizar la flashcard', 'error');
  }
}

/**
 * Elimina una flashcard
 */
export function deleteFlashcard(flashcardId) {
  if (window.showConfirmation) {
    window.showConfirmation(
      'Eliminar Flashcard',
      '¿Estás seguro de que quieres eliminar esta flashcard? Esta acción no se puede deshacer.',
      () => confirmDeleteFlashcard(flashcardId)
    );
  } else {
    // Fallback si no hay modal de confirmación
    if (confirm('¿Estás seguro de que quieres eliminar esta flashcard?')) {
      confirmDeleteFlashcard(flashcardId);
    }
  }
}

/**
 * Confirma la eliminación de una flashcard
 */
export async function confirmDeleteFlashcard(flashcardId) {
  try {
    await api(`/api/flashcards/${flashcardId}`, {
      method: 'DELETE'
    });
    
    showNotification('Flashcard eliminada exitosamente', 'success');
    
    // Recargar datos
    if (window.loadManageData) {
      window.loadManageData();
    }
    
  } catch (error) {
    console.error('Error deleting flashcard:', error);
    showNotification('Error al eliminar la flashcard', 'error');
  }
}

/**
 * Busca flashcards
 */
export async function searchFlashcards(query, deckId = null) {
  try {
    const params = new URLSearchParams();
    if (query) params.append('q', query);
    if (deckId) params.append('deck_id', deckId);
    
    const response = await api(`/api/flashcards/search?${params.toString()}`);
    return response;
    
  } catch (error) {
    console.error('Error searching flashcards:', error);
    return [];
  }
}

/**
 * Muestra los resultados de búsqueda
 */
export function displaySearchResults(results) {
  const container = document.getElementById('search-results');
  if (!container) return;
  
  if (!results || results.length === 0) {
    container.innerHTML = '<p class="text-muted">No se encontraron flashcards.</p>';
    return;
  }
  
  container.innerHTML = results.map(flashcard => `
    <div class="flashcard-result">
      <div class="flashcard-content">
        <div class="flashcard-front">
          <strong>Frente:</strong> ${flashcard.front}
        </div>
        <div class="flashcard-back">
          <strong>Reverso:</strong> ${flashcard.back}
        </div>
        <div class="flashcard-deck">
          <small>Deck: ${flashcard.deck_name || 'Sin nombre'}</small>
        </div>
      </div>
      <div class="flashcard-actions">
        <button class="btn btn-sm btn-primary" onclick="editFlashcard(${flashcard.id})">
          Editar
        </button>
        <button class="btn btn-sm btn-danger" onclick="deleteFlashcard(${flashcard.id})">
          Eliminar
        </button>
      </div>
    </div>
  `).join('');
}

/**
 * Muestra el modal de edición de flashcard
 */
export function showEditFlashcardModal() {
  const modal = document.getElementById('edit-flashcard-modal');
  if (modal) {
    modal.style.display = 'flex';
  }
}

/**
 * Oculta el modal de edición de flashcard
 */
export function hideEditFlashcardModal() {
  const modal = document.getElementById('edit-flashcard-modal');
  if (modal) {
    modal.style.display = 'none';
  }
  editingFlashcardId = null;
}

/**
 * Carga las flashcards de un deck específico
 */
export async function loadFlashcardsByDeck(deckId) {
  try {
    const response = await api(`/api/decks/${deckId}/flashcards`);
    return response;
    
  } catch (error) {
    console.error('Error loading flashcards:', error);
    return [];
  }
}

/**
 * Obtiene estadísticas de flashcards
 */
export async function getFlashcardStats(deckId = null) {
  try {
    const params = deckId ? `?deck_id=${deckId}` : '';
    const response = await api(`/api/flashcards/stats${params}`);
    return response;
    
  } catch (error) {
    console.error('Error getting flashcard stats:', error);
    return null;
  }
}

/**
 * Inicializa los event listeners para flashcards
 */
export function initializeFlashcardEvents() {
  // Event listener para crear flashcard
  const createBtn = document.getElementById('create-flashcard-btn');
  if (createBtn) {
    createBtn.addEventListener('click', createFlashcard);
  }
  
  // Event listener para actualizar flashcard
  const updateBtn = document.getElementById('update-flashcard-btn');
  if (updateBtn) {
    updateBtn.addEventListener('click', updateFlashcard);
  }
  
  // Event listener para cerrar modal de edición
  const closeBtn = document.querySelector('#edit-flashcard-modal .close-modal');
  if (closeBtn) {
    closeBtn.addEventListener('click', hideEditFlashcardModal);
  }
  
  // Event listener para búsqueda
  const searchInput = document.getElementById('flashcard-search');
  if (searchInput) {
    searchInput.addEventListener('input', window.debounce(async (e) => {
      const query = e.target.value.trim();
      if (query.length >= 2) {
        const results = await searchFlashcards(query);
        displaySearchResults(results);
      } else if (query.length === 0) {
        // Limpiar resultados
        const container = document.getElementById('search-results');
        if (container) container.innerHTML = '';
      }
    }, 300));
  }
}

// Exponer funciones globalmente para compatibilidad
window.createFlashcard = createFlashcard;
window.editFlashcard = editFlashcard;
window.updateFlashcard = updateFlashcard;
window.deleteFlashcard = deleteFlashcard;
window.confirmDeleteFlashcard = confirmDeleteFlashcard;
window.searchFlashcards = searchFlashcards;
window.displaySearchResults = displaySearchResults;
window.showEditFlashcardModal = showEditFlashcardModal;
window.hideEditFlashcardModal = hideEditFlashcardModal;

