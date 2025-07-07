import { api } from './apiClient.js';
import { store } from './store/store.js';
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

  // Validar datos del deck usando utilidad común
  if (!validateDeckData(name, description)) {
    return;
  }

  const data = {
    name: name,
    description: description,
    is_public: isPublic,
  };

  try {
    const deck = await withLoadingFeedback(
      async () => {
        try {
          // Intentar crear en API primero
          const response = await api('/api/decks', {
            method: 'POST',
            body: JSON.stringify(data),
          });

          if (response.error) {
            throw new Error(response.message || 'Error al crear deck');
          }

          return response.data;
        } catch (error) {
          console.log('API no disponible, usando almacenamiento local');
          return (
            storageService?.createDeck(data) || { ...data, id: Date.now() }
          );
        }
      },
      {
        buttonSelector: '#create-deck-btn',
        loadingText: 'Creando deck...',
        successMessage: '🎉 Deck creado exitosamente',
        errorMessage: 'Error al crear el deck',
      }
    );

    // Limpiar formulario y validaciones
    if (nameInput || descriptionInput || publicInput) {
      clearForm('#deck-form');

      // Limpiar validaciones visuales
      if (nameInput) {
        nameInput.classList.remove('field-valid', 'field-invalid');
        const validationMsg = nameInput.parentNode.querySelector(
          '.validation-message'
        );
        if (validationMsg) {
          validationMsg.remove();
        }
      }

      if (descriptionInput) {
        descriptionInput.classList.remove('field-valid', 'field-invalid');
        const validationMsg = descriptionInput.parentNode.querySelector(
          '.validation-message'
        );
        if (validationMsg) {
          validationMsg.remove();
        }
      }
    }
    
    // Recargar decks en el dropdown
    await loadDecksForCreation();
    
    // Recargar la gestión de decks
    try {
      const { loadManageDecks } = await import('./manage.service.js');
      if (typeof loadManageDecks === 'function') {
        await loadManageDecks();
      }
    } catch (error) {
      console.log('No se pudo recargar la gestión de decks:', error);
    }
    
    // Refresh dashboard decks if user is there
    try {
      const { loadDashboardData } = await import('./dashboard.service.js');
      if (typeof loadDashboardData === 'function') {
        await loadDashboardData();
      }
    } catch (error) {
      console.log('No se pudo recargar el dashboard:', error);
    }
    
    return deck;
  } catch (error) {
    console.error('Error creando deck:', error);

    // Mostrar error específico si está disponible
    const errorMessage = error.message || 'Error desconocido al crear deck';
    showNotification(errorMessage, 'error', 5000, {
      title: 'Error al crear deck',
      actionText: 'Reintentar',
      actionCallback: () => createDeck(deckData),
    });
  }
}

/**
 * Crea una nueva flashcard usando utilidades unificadas
 * REFACTORIZADO: Elimina duplicación con flashcards.service.js
 * Mantiene funcionalidad offline específica de este módulo
 */
export async function createFlashcard() {
  // Usar utilidades unificadas para validación y obtención de datos
  const validation = FlashcardFormUtils.validateAndGetData();
  
  if (!validation.isValid) {
    FlashcardNotifications.validationError();
    return;
  }

  try {
    const flashcard = await performCrudOperation(
      async () => {
        try {
          // Intentar crear en API primero
          return await api('/api/flashcards', {
            method: 'POST',
            body: JSON.stringify({
              deck_id: validation.data.deckId,
              front: validation.data.front,
              back: validation.data.back,
            }),
          });
        } catch (error) {
          console.log('API no disponible, usando almacenamiento local');
          return (
            storageService?.createFlashcard({
              deck_id: validation.data.deckId,
              front: validation.data.front,
              back: validation.data.back,
            }) || { 
              deck_id: validation.data.deckId, 
              front: validation.data.front, 
              back: validation.data.back, 
              id: Date.now() 
            }
          );
        }
      },
      null, // Usar notificación unificada
      null  // Usar notificación unificada
    );
    
    // Usar notificación unificada
    FlashcardNotifications.created();
    
    // Limpiar formulario usando utilidad unificada
    FlashcardFormUtils.clearCreateForm();
    
    // Recargar datos si estamos en la sección de gestión
    try {
      // Intentar recargar la gestión de decks
      const { loadManageDecks } = await import('./manage.service.js');
      if (typeof loadManageDecks === 'function') {
        await loadManageDecks();
      }
    } catch (error) {
      console.log('No se pudo recargar la gestión de decks:', error);
    }
    
    // También recargar el dropdown de decks
    await loadDecksForCreation();
    
    return flashcard;
  } catch (error) {
    console.error('Error creating flashcard:', error);
    FlashcardNotifications.createError();
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
