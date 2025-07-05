import { api } from './apiClient.js';
import { store } from './store/store.js';
import { localStorageService } from './storage.service.js';
import { validateDeckData, validateFlashcardData } from './utils/validation.js';
import { apiWithFallback, performCrudOperation, FALLBACK_DATA } from './utils/apiHelpers.js';
import { showNotification, clearForm, getVisibleElement } from './utils/helpers.js';

/**
 * Carga los decks disponibles en el dropdown
 * @returns {Promise<Array>} - Array de decks disponibles
 */
export async function loadDecksForCreation() {
  try {
    const decks = await apiWithFallback(
      '/api/decks',
      localStorageService?.getDecks() || FALLBACK_DATA.decks
    );
    
    const deckSelect = document.getElementById('flashcard-deck');
    if (deckSelect && Array.isArray(decks)) {
      deckSelect.innerHTML = '<option value="">Selecciona un deck...</option>' +
        decks.map(deck => `<option value="${deck.id}">${deck.name}</option>`).join('');
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
 * Crea un nuevo deck
 * @param {Object} deckData - Datos del deck a crear
 * @param {string} deckData.name - Nombre del deck
 * @param {string} deckData.description - Descripción del deck
 * @param {boolean} deckData.isPublic - Si el deck es público
 * @returns {Promise<Object>} - Deck creado
 */
export async function createDeck(deckData = {}) {
  const nameInput = document.getElementById("deck-name");
  const descriptionInput = document.getElementById("deck-description");
  const publicInput = document.getElementById("deck-public");

  const name = deckData.name || nameInput?.value?.trim() || '';
  const description = deckData.description || descriptionInput?.value?.trim() || '';
  const isPublic = deckData.isPublic !== undefined ? deckData.isPublic : (publicInput?.checked || false);
  
  // Validar datos del deck usando utilidad común
  if (!validateDeckData(name, description)) {
    return;
  }
  
  const data = {
    name: name,
    description: description,
    is_public: isPublic
  };
  
  try {
    const deck = await performCrudOperation(
      async () => {
        try {
          // Intentar crear en API primero
          return await api("/api/decks", {
            method: "POST",
            body: JSON.stringify(data)
          });
        } catch (error) {
          console.log("API no disponible, usando almacenamiento local");
          return localStorageService?.createDeck(data) || { ...data, id: Date.now() };
        }
      },
      "Deck creado con éxito 🎉",
      "Error al crear deck"
    );
    
    // Limpiar formulario usando utilidad común
    if (nameInput || descriptionInput || publicInput) {
      clearForm('#deck-form');
    }
    
    // Recargar decks en el dropdown
    await loadDecksForCreation();
    
    // Refresh dashboard decks if user is there
    if (window.loadDashboardData) {
      window.loadDashboardData();
    }
    
    return deck;
    
  } catch (error) {
    console.error("Error creando deck:", error);
    // El error ya fue manejado por performCrudOperation
  }
}

/**
 * Crea una nueva flashcard
 * @returns {Promise<Object>} - Flashcard creada
 */
export async function createFlashcard() {
  const deckSelect = document.getElementById('flashcard-deck');
  const frontInput = document.getElementById('flashcard-front');
  const backInput = document.getElementById('flashcard-back');
  
  if (!deckSelect || !frontInput || !backInput) {
    showNotification('Formulario no encontrado', 'error');
    return;
  }
  
  const deckId = deckSelect.value;
  const front = frontInput.value.trim();
  const back = backInput.value.trim();
  
  // Validar datos usando utilidad común
  if (!validateFlashcardData(deckId, front, back)) {
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
              deck_id: deckId,
              front: front,
              back: back
            })
          });
        } catch (error) {
          console.log('API no disponible, usando almacenamiento local');
          return localStorageService?.createFlashcard({
            deck_id: deckId,
            front: front,
            back: back
          }) || { deck_id: deckId, front, back, id: Date.now() };
        }
      },
      'Flashcard creada exitosamente 🎉',
      'Error al crear la flashcard'
    );
    
    // Limpiar formulario usando utilidad común
    clearForm('#flashcard-form');
    
    // Recargar datos si estamos en la sección de gestión
    if (window.loadManageData) {
      window.loadManageData();
    }
    
    return flashcard;
    
  } catch (error) {
    console.error('Error creating flashcard:', error);
    // El error ya fue manejado por performCrudOperation
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
      () => api('/api/flashcards/bulk', {
        method: 'POST',
        body: JSON.stringify({
          deck_id: deckId,
          flashcards: flashcardsData
        })
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
      () => fetch(`${api.baseURL}/api/decks/import`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: formData
      }).then(res => res.json()),
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
    createDeckBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      console.log("Click en 'Crear Deck' detectado.");
      
      const name = document.getElementById("deck-name")?.value?.trim() || '';
      const description = document.getElementById("deck-description")?.value?.trim() || '';
      const isPublic = document.getElementById("deck-public")?.checked || false;
      
      console.log("Datos del deck:", { name, description, isPublic });
      await createDeck({ name, description, isPublic });
    });
  } else {
    console.error("Error: Botón 'Crear Deck' no encontrado en el DOM.");
  }
  
  // Event listener para crear flashcard
  const createFlashcardBtn = document.getElementById('create-flashcard-btn');
  if (createFlashcardBtn) {
    createFlashcardBtn.addEventListener("click", createFlashcard);
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

