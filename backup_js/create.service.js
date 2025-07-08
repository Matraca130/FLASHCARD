import { api } from './apiClient.js';
import { store } from '../store/store.js';
import storageService from './storage.service.js';
import { validateDeckData, validateFlashcardData } from './utils/validation.js';
import {
  apiWithFallback,
  performCrudOperation,
  FALLBACK_DATA,
} from './utils/apiHelpers.js';
import {
  showNotification,
  clearForm,
  getVisibleElement,
} from './utils/helpers.js';
import {
  showButtonLoading,
  showFieldValidation,
  withLoadingFeedback,
} from './utils/loading.js';
// Importar utilidades unificadas para eliminar duplicación
import { FlashcardFormUtils, DeckFormUtils } from './utils/formValidation.js';
import { FlashcardNotifications, DeckNotifications } from './utils/notifications.js';

/**
 * Carga los decks disponibles en el dropdown
 * @returns {Promise<Array>} - Array de decks disponibles
 */
export async function loadDecksForCreation() {
  try {
    const decks = await apiWithFallback(
      '/api/decks',
      storageService?.getDecks() || FALLBACK_DATA.decks
    );

    const deckSelect = document.getElementById('flashcard-deck');
    if (deckSelect && Array.isArray(decks)) {
      deckSelect.innerHTML =
        '<option value="">Selecciona un deck...</option>' +
        decks
          .map((deck) => `<option value="${deck.id}">${deck.name}</option>`)
          .join('');
    }

    return decks;
  } catch (error) {
    console.error('Error loading decks:', error);
    showNotification('Error al cargar decks', 'error');
    return [];
  }
}

/**
 * Abre el modal de creación de deck
 */
export function openCreateDeckModal() {
  if (window.showCreateDeckModal) {
    window.showCreateDeckModal();
  }
}

/**
 * Crea un nuevo deck con feedback visual mejorado
 * @param {Object} deckData - Datos del deck a crear
 * @param {string} deckData.name - Nombre del deck
 * @param {string} deckData.description - Descripción del deck
 * @param {boolean} deckData.isPublic - Si el deck es público
 * @returns {Promise<Object>} - Deck creado
 */
export async function createDeck(deckData = {}) {
  console.log('🎯 CREANDO DECK - Iniciando proceso...');
  
  const nameInput = document.getElementById('deck-name');
  const descriptionInput = document.getElementById('deck-description');
  const publicInput = document.getElementById('deck-public');

  const name = deckData.name || nameInput?.value?.trim() || '';
  const description =
    deckData.description || descriptionInput?.value?.trim() || '';
  const isPublic =
    deckData.isPublic !== undefined
      ? deckData.isPublic
      : publicInput?.checked || false;

  console.log('📝 Datos del deck:', { name, description, isPublic });

  // Validación con feedback visual
  const isNameValid = name.length >= 3 && name.length <= 50;
  const isDescriptionValid = !description || description.length <= 500;

  if (nameInput) {
    showFieldValidation(
      nameInput,
      isNameValid,
      isNameValid
        ? 'Nombre válido'
        : 'El nombre debe tener entre 3 y 50 caracteres'
    );
  }

  if (descriptionInput && description) {
    showFieldValidation(
      descriptionInput,
      isDescriptionValid,
      isDescriptionValid
        ? 'Descripción válida'
        : 'La descripción no puede exceder 500 caracteres'
    );
  }

  // Validar datos del deck
  if (!isNameValid || !isDescriptionValid) {
    showNotification('Por favor corrige los errores en el formulario', 'error');
    return;
  }

  try {
    console.log('💾 Guardando deck en state manager...');
    
    // Crear deck usando el state manager
    const newDeck = store.addDeck({
      name,
      description,
      isPublic
    });

    console.log('✅ Deck creado exitosamente:', newDeck);

    // Mostrar notificación de éxito
    showNotification(`🎉 Deck "${name}" creado exitosamente`, 'success');

    // Limpiar formulario
    if (nameInput) nameInput.value = '';
    if (descriptionInput) descriptionInput.value = '';
    if (publicInput) publicInput.checked = false;

    // Limpiar validaciones visuales
    [nameInput, descriptionInput].forEach(input => {
      if (input) {
        input.classList.remove('valid', 'invalid');
        const feedback = input.parentNode?.querySelector('.field-feedback');
        if (feedback) feedback.remove();
      }
    });

    console.log('🔄 Notificando actualización a otros componentes...');
    
    // El state manager ya notificó automáticamente a todos los componentes suscritos
    // Dashboard, estudiar, ranking, etc. se actualizarán automáticamente

    return newDeck;

  } catch (error) {
    console.error('❌ Error creando deck:', error);
    showNotification('Error al crear el deck: ' + error.message, 'error');
    throw error;
  }

/**
 * Carga los decks disponibles en el dropdown para flashcards
 */
export async function loadDecksForCreation() {
  try {
    // Usar state manager para obtener decks
    const decks = store.getState().decks;

    const deckSelect = document.getElementById('flashcard-deck');
    if (deckSelect && Array.isArray(decks)) {
      deckSelect.innerHTML =
        '<option value="">Selecciona un deck...</option>' +
        decks
          .map((deck) => `<option value="${deck.id}">${deck.name}</option>`)
          .join('');
    }

    return decks;
  } catch (error) {
    console.error('Error loading decks:', error);
    showNotification('Error al cargar decks', 'error');
    return [];
  }
}

/**
 * Crea una nueva flashcard
 */
export async function createFlashcard() {
  const deckSelect = document.getElementById('flashcard-deck');
  const frontInput = document.getElementById('flashcard-front');
  const backInput = document.getElementById('flashcard-back');

  const deckId = deckSelect?.value?.trim() || '';
  const front = frontInput?.value?.trim() || '';
  const back = backInput?.value?.trim() || '';

  // Validación
  if (!deckId) {
    showNotification('Por favor selecciona un deck', 'error');
    return;
  }

  if (!front || !back) {
    showNotification('Por favor completa ambos lados de la flashcard', 'error');
    return;
  }

  try {
    console.log('💾 Guardando flashcard en state manager...');
    
    // Crear flashcard usando el state manager
    const newFlashcard = store.addFlashcard({
      deckId,
      front,
      back
    });

    console.log('✅ Flashcard creada exitosamente:', newFlashcard);

    // Mostrar notificación de éxito
    showNotification('🎉 Flashcard creada exitosamente', 'success');

    // Limpiar formulario
    if (frontInput) frontInput.value = '';
    if (backInput) backInput.value = '';
    if (deckSelect) deckSelect.value = '';

    return newFlashcard;

  } catch (error) {
    console.error('❌ Error creando flashcard:', error);
    showNotification('Error al crear la flashcard: ' + error.message, 'error');
    throw error;
  }
}

/**
 * Crea múltiples flashcards en lote
 * @param {Array} flashcardsData - Array de datos de flashcards
 * @param {number} deckId - ID del deck
 * @returns {Promise<Array>} - Array de flashcards creadas
 */
export async function createBulkFlashcards(flashcardsData, deckId) {
  if (!Array.isArray(flashcardsData) || flashcardsData.length === 0) {
    showNotification('No hay flashcards para crear', 'warning');
    return [];
  }

  if (!deckId) {
    showNotification('Debe seleccionar un deck', 'error');
    return [];
  }

  try {
    const result = await performCrudOperation(
      () =>
        api('/api/flashcards/bulk', {
          method: 'POST',
          body: JSON.stringify({
            deck_id: deckId,
            flashcards: flashcardsData,
          }),
        }),
      `${flashcardsData.length} flashcards creadas exitosamente`,
      'Error al crear flashcards en lote'
    );

    // Recargar datos
    if (window.loadManageData) {
      window.loadManageData();
    }

    return result;
  } catch (error) {
    console.error('Error creating bulk flashcards:', error);
    // El error ya fue manejado por performCrudOperation
    return [];
  }
}

/**
 * Importa flashcards desde un archivo CSV o JSON
 * @param {File} file - Archivo a importar
 * @param {number} deckId - ID del deck destino
 * @returns {Promise<Array>} - Array de flashcards importadas
 */
export async function importFlashcards(file, deckId) {
  if (!file) {
    showNotification('Debe seleccionar un archivo', 'error');
    return [];
  }

  if (!deckId) {
    showNotification('Debe seleccionar un deck', 'error');
    return [];
  }

  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('deck_id', deckId);

    const result = await performCrudOperation(
      () =>
        fetch(`${api.baseURL}/api/decks/import`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('authToken')}`,
          },
          body: formData,
        }).then((res) => res.json()),
      'Flashcards importadas exitosamente',
      'Error al importar flashcards'
    );

    // Recargar datos
    if (window.loadManageData) {
      window.loadManageData();
    }

    return result;
  } catch (error) {
    console.error('Error importing flashcards:', error);
    // El error ya fue manejado por performCrudOperation
    return [];
  }
}

/**
 * Inicializa los event listeners para la sección de creación
 */
export function initializeCreateEvents() {
  // Event listener para crear deck
  const createDeckBtn = document.getElementById('create-deck-btn');
  if (createDeckBtn) {
    console.log("Botón 'Crear Deck' encontrado. Adjuntando event listener.");
    createDeckBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      console.log("Click en 'Crear Deck' detectado.");

      const name = document.getElementById('deck-name')?.value?.trim() || '';
      const description =
        document.getElementById('deck-description')?.value?.trim() || '';
      const isPublic = document.getElementById('deck-public')?.checked || false;

      console.log('Datos del deck:', { name, description, isPublic });
      await createDeck({ name, description, isPublic });
    });
  } else {
    console.error("Error: Botón 'Crear Deck' no encontrado en el DOM.");
  }

  // Event listener para crear flashcard
  const createFlashcardBtn = document.getElementById('create-flashcard-btn');
  if (createFlashcardBtn) {
    createFlashcardBtn.addEventListener('click', createFlashcard);
  }

  // Event listener para importar flashcards
  const importBtn = document.getElementById('import-flashcards-btn');
  if (importBtn) {
    importBtn.addEventListener('click', () => {
      const fileInput = document.getElementById('import-file');
      const deckSelect = document.getElementById('import-deck');

      if (fileInput?.files[0] && deckSelect?.value) {
        importFlashcards(fileInput.files[0], deckSelect.value);
      }
    });
  }

  // Cargar decks al inicializar
  loadDecksForCreation();
}

// Exponer funciones globalmente para compatibilidad
window.createDeck = createDeck;
window.createFlashcard = createFlashcard;
window.loadDecksForCreation = loadDecksForCreation;
