import { api } from './apiClient.js';
import { store } from './store/store.js';
import { validateDeckData } from './utils/validation.js';
import {
  apiWithFallback,
  performCrudOperation,
  FALLBACK_DATA,
} from './utils/apiHelpers.js';
import {
  showNotification,
  formatDate,
  formatRelativeDate,
  renderEmptyDecksState,
} from './utils/helpers.js';

/**
 * Carga los decks del usuario para gestión y los renderiza
 * @returns {Promise<Array>} - Array de decks cargados
 */
export async function loadManageDecks() {
  try {
    const decks = await apiWithFallback('/api/decks', FALLBACK_DATA.decks);
    renderManageDecks(decks);
    return decks;
  } catch (error) {
    console.error('Error cargando decks:', error);
    showNotification('Error al cargar decks', 'error');
    return [];
  }
}

/**
 * Renderiza los decks en la interfaz de gestión
 * @param {Array} decks - Array de decks a renderizar
 */
function renderManageDecks(decks) {
  const container = document.getElementById('manage-decks');
  if (!container) {
    return;
  }

  if (!Array.isArray(decks) || decks.length === 0) {
    renderEmptyDecksState(container);
    return;
  }

  const decksHTML = decks
    .map(
      (deck) => `
    <div class="deck-manage-card" data-deck-id="${deck.id}">
      <div class="deck-header">
        <h4 class="deck-name">${deck.name || 'Sin nombre'}</h4>
        <div class="deck-stats">
          <span class="card-count">${deck.card_count || 0} tarjetas</span>
          <span class="last-studied">Último: ${formatRelativeDate(deck.last_studied)}</span>
        </div>
      </div>
      
      <div class="deck-description">
        <p>${deck.description || 'Sin descripción'}</p>
      </div>
      
      <div class="deck-actions">
        <button class="btn btn-sm btn-primary" onclick="editDeck(${deck.id})">
          Editar
        </button>
        <button class="btn btn-sm btn-secondary" onclick="loadDeckFlashcards(${deck.id})">
          Ver Tarjetas
        </button>
        <button class="btn btn-sm btn-warning" onclick="exportDeck(${deck.id})">
          Exportar
        </button>
        <button class="btn btn-sm btn-danger" onclick="deleteDeck(${deck.id})">
          Eliminar
        </button>
      </div>
    </div>
  `
    )
    .join('');

  container.innerHTML = decksHTML;
}

/**
 * Elimina un deck después de confirmación
 * @param {number} id - ID del deck a eliminar
 */
export async function deleteDeck(id) {
  if (
    !confirm(
      '¿Seguro que quieres eliminar este deck? Esta acción no se puede deshacer.'
    )
  ) {
    return;
  }

  try {
    await performCrudOperation(
      () => api(`/api/decks/${id}`, { method: 'DELETE' }),
      'Deck eliminado exitosamente',
      'Error al eliminar deck'
    );

    // Recargar datos
    await loadManageDecks();

    // Actualizar dashboard si está disponible
    if (window.loadDashboardData) {
      window.loadDashboardData();
    }
  } catch (error) {
    console.error('Error eliminando deck:', error);
    // El error ya fue manejado por performCrudOperation
  }
}

/**
 * Edita un deck existente
 * @param {number} deckId - ID del deck a editar
 */
export async function editDeck(deckId) {
  try {
    const deck = await apiWithFallback(
      `/api/decks/${deckId}`,
      FALLBACK_DATA.decks.find((d) => d.id === deckId) || {}
    );

    // Mostrar modal de edición o formulario inline
    showEditDeckForm(deck);
  } catch (error) {
    console.error('Error cargando deck para edición:', error);
    showNotification('Error al cargar deck', 'error');
  }
}

/**
 * Muestra el formulario de edición de deck
 * @param {Object} deck - Datos del deck a editar
 */
function showEditDeckForm(deck) {
  const modal = document.getElementById('edit-deck-modal');
  if (!modal) {
    // Crear modal dinámicamente si no existe
    createEditDeckModal(deck);
    return;
  }

  // Llenar formulario con datos del deck
  const nameInput = document.getElementById('edit-deck-name');
  const descriptionInput = document.getElementById('edit-deck-description');
  const publicInput = document.getElementById('edit-deck-public');

  if (nameInput) {
    nameInput.value = deck.name || '';
  }
  if (descriptionInput) {
    descriptionInput.value = deck.description || '';
  }
  if (publicInput) {
    publicInput.checked = deck.is_public || false;
  }

  // Configurar botón de guardar
  const saveBtn = document.getElementById('save-deck-btn');
  if (saveBtn) {
    saveBtn.onclick = () => updateDeck(deck.id);
  }

  // Mostrar modal
  modal.style.display = 'block';
}

/**
 * Crea el modal de edición dinámicamente
 * @param {Object} deck - Datos del deck
 */
function createEditDeckModal(deck) {
  const modalHTML = `
    <div id="edit-deck-modal" class="modal" style="display: block;">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Editar Deck</h3>
          <span class="close" onclick="closeEditDeckModal()">&times;</span>
        </div>
        <div class="modal-body">
          <form id="edit-deck-form">
            <div class="form-group">
              <label for="edit-deck-name">Nombre del Deck:</label>
              <input type="text" id="edit-deck-name" value="${deck.name || ''}" required>
            </div>
            <div class="form-group">
              <label for="edit-deck-description">Descripción:</label>
              <textarea id="edit-deck-description">${deck.description || ''}</textarea>
            </div>
            <div class="form-group">
              <label>
                <input type="checkbox" id="edit-deck-public" ${deck.is_public ? 'checked' : ''}>
                Deck público
              </label>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="closeEditDeckModal()">Cancelar</button>
          <button class="btn btn-primary" id="save-deck-btn" onclick="updateDeck(${deck.id})">Guardar</button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);
}

/**
 * Actualiza un deck existente
 * @param {number} deckId - ID del deck a actualizar
 */
export async function updateDeck(deckId) {
  const name = document.getElementById('edit-deck-name')?.value?.trim();
  const description = document
    .getElementById('edit-deck-description')
    ?.value?.trim();
  const isPublic = document.getElementById('edit-deck-public')?.checked;

  // Validar datos usando utilidad común
  if (!validateDeckData(name, description)) {
    return;
  }

  try {
    await performCrudOperation(
      () =>
        api(`/api/decks/${deckId}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: name,
            description: description,
            is_public: isPublic,
          }),
        }),
      'Deck actualizado exitosamente',
      'Error al actualizar deck'
    );

    // Cerrar modal
    closeEditDeckModal();

    // Recargar datos
    await loadManageDecks();

    // Actualizar dashboard
    if (window.loadDashboardData) {
      window.loadDashboardData();
    }
  } catch (error) {
    console.error('Error actualizando deck:', error);
    // El error ya fue manejado por performCrudOperation
  }
}

/**
 * Cierra el modal de edición
 */
export function closeEditDeckModal() {
  const modal = document.getElementById('edit-deck-modal');
  if (modal) {
    modal.remove();
  }
}

/**
 * Carga las flashcards de un deck específico
 * @param {number} deckId - ID del deck
 */
export async function loadDeckFlashcards(deckId) {
  try {
    const flashcards = await apiWithFallback(
      `/api/flashcards/deck/${deckId}`,
      FALLBACK_DATA.flashcards.filter((f) => f.deck_id === deckId)
    );

    renderDeckFlashcards(flashcards, deckId);
  } catch (error) {
    console.error('Error cargando flashcards:', error);
    showNotification('Error al cargar flashcards', 'error');
  }
}

/**
 * Renderiza las flashcards de un deck
 * @param {Array} flashcards - Array de flashcards
 * @param {number} deckId - ID del deck
 */
function renderDeckFlashcards(flashcards, deckId) {
  const container =
    document.getElementById('deck-flashcards') ||
    document.getElementById('manage-decks');

  if (!container) {
    return;
  }

  if (!Array.isArray(flashcards) || flashcards.length === 0) {
    container.innerHTML = `
      <div class="flashcards-section">
        <div class="section-header">
          <h3>Flashcards del Deck</h3>
          <button class="btn btn-secondary" onclick="loadManageDecks()">Volver</button>
        </div>
        <p class="text-muted">Este deck no tiene flashcards.</p>
        <button onclick="window.showSection('crear')" class="btn btn-primary">
          Agregar Flashcards
        </button>
      </div>
    `;
    return;
  }

  const flashcardsHTML = `
    <div class="flashcards-section">
      <div class="section-header">
        <h3>Flashcards del Deck (${flashcards.length})</h3>
        <button class="btn btn-secondary" onclick="loadManageDecks()">Volver</button>
      </div>
      <div class="flashcards-grid">
        ${flashcards
          .map(
            (card) => `
          <div class="flashcard-manage-item" data-card-id="${card.id}">
            <div class="flashcard-content">
              <div class="flashcard-front">
                <strong>Frente:</strong> ${card.front || 'Sin contenido'}
              </div>
              <div class="flashcard-back">
                <strong>Reverso:</strong> ${card.back || 'Sin contenido'}
              </div>
            </div>
            <div class="flashcard-actions">
              <button class="btn btn-sm btn-primary" onclick="editFlashcard(${card.id})">
                Editar
              </button>
              <button class="btn btn-sm btn-danger" onclick="deleteFlashcard(${card.id})">
                Eliminar
              </button>
            </div>
          </div>
        `
          )
          .join('')}
      </div>
    </div>
  `;

  container.innerHTML = flashcardsHTML;
}

/**
 * Exporta un deck a formato JSON
 * @param {number} deckId - ID del deck a exportar
 */
export async function exportDeck(deckId) {
  try {
    const [deck, flashcards] = await Promise.all([
      apiWithFallback(`/api/decks/${deckId}`, {}),
      apiWithFallback(`/api/flashcards/deck/${deckId}`, []),
    ]);

    const exportData = {
      deck: deck,
      flashcards: flashcards,
      exportDate: new Date().toISOString(),
      version: '1.0',
    };

    // Crear y descargar archivo
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deck_${deck.name || 'export'}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showNotification('Deck exportado exitosamente', 'success');
  } catch (error) {
    console.error('Error exportando deck:', error);
    showNotification('Error al exportar deck', 'error');
  }
}

/**
 * Carga todos los datos de gestión
 */
export async function loadManageData() {
  await loadManageDecks();
}

// Exponer funciones globalmente para compatibilidad
window.loadManageDecks = loadManageDecks;
window.loadManageData = loadManageData;
window.deleteDeck = deleteDeck;
window.editDeck = editDeck;
window.updateDeck = updateDeck;
window.closeEditDeckModal = closeEditDeckModal;
window.loadDeckFlashcards = loadDeckFlashcards;
window.exportDeck = exportDeck;
