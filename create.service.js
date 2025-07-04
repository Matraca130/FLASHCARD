import { api } from './apiClient.js';
import { store } from './store/store.js';
import { localStorageService } from './storage.service.js';
import { showNotification } from './utils/helpers.js';

/**
 * Carga los decks disponibles en el dropdown
 */
export async function loadDecksForCreation() {
  try {
    // Intentar cargar desde API primero, fallback a localStorage
    let decks;
    try {
      decks = await api('/api/decks');
    } catch (error) {
      console.log('API no disponible, usando almacenamiento local');
      decks = localStorageService.getDecks();
    }
    
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
 * Abre el modal de creación (UI inline existente) y resetea formularios.
 */
export function openCreateDeckModal() {
  if (window.showCreateDeckModal) window.showCreateDeckModal();
}

/**
 * Envía los datos del formulario y crea un nuevo deck.
 */
export async function createDeck() {
  const nameInput = document.getElementById('deck-name');
  const descriptionInput = document.getElementById('deck-description');
  const publicInput = document.getElementById('deck-public');
  
  if (!nameInput || !descriptionInput) {
    showNotification('Formulario no encontrado', 'error');
    return;
  }
  
  const data = {
    name: nameInput.value.trim(),
    description: descriptionInput.value.trim(),
    public: publicInput ? publicInput.checked : false
  };
  
  if (!data.name) {
    showNotification('El nombre es obligatorio', 'warning');
    return;
  }
  
  try {
    let deck;
    try {
      // Intentar crear en API primero
      deck = await api('/api/decks', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    } catch (error) {
      console.log('API no disponible, usando almacenamiento local');
      deck = localStorageService.createDeck(data);
    }
    
    showNotification('Deck creado con éxito 🎉', 'success');
    
    // Limpiar formulario
    nameInput.value = '';
    descriptionInput.value = '';
    if (publicInput) publicInput.checked = false;
    
    // Recargar decks en el dropdown
    await loadDecksForCreation();
    
    // Refresh dashboard decks if user is there
    if (window.loadDashboardData) window.loadDashboardData();
    
    return deck;
  } catch (error) {
    console.error('Error creando deck:', error);
    showNotification('Error al crear deck', 'error');
  }
}

/**
 * Crea una nueva flashcard
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
  
  if (!deckId || !front || !back) {
    showNotification('Por favor, completa todos los campos', 'warning');
    return;
  }
  
  try {
    let flashcard;
    try {
      // Intentar crear en API primero
      flashcard = await api('/api/flashcards', {
        method: 'POST',
        body: JSON.stringify({
          deck_id: deckId,
          front: front,
          back: back
        })
      });
    } catch (error) {
      console.log('API no disponible, usando almacenamiento local');
      flashcard = localStorageService.createFlashcard({
        deck_id: deckId,
        front: front,
        back: back
      });
    }
    
    showNotification('Flashcard creada exitosamente 🎉', 'success');
    
    // Limpiar formulario
    frontInput.value = '';
    backInput.value = '';
    
    // Recargar datos si estamos en la sección de gestión
    if (window.loadManageData) {
      window.loadManageData();
    }
    
    return flashcard;
  } catch (error) {
    console.error('Error creating flashcard:', error);
    showNotification('Error al crear la flashcard', 'error');
  }
}

/**
 * Inicializa los event listeners para la sección de creación
 */
export function initializeCreateEvents() {
  // Event listener para crear deck
  const createDeckBtn = document.getElementById('create-deck-btn');
  if (createDeckBtn) {
    // createDeckBtn.addEventListener("click", createDeck);
  }
  
  // Event listener para crear flashcard
  const createFlashcardBtn = document.getElementById('create-flashcard-btn');
  if (createFlashcardBtn) {
    // createFlashcardBtn.addEventListener("click", createFlashcard);
  }
  
  // Cargar decks al inicializar
  loadDecksForCreation();
}

// Exponer funciones globalmente para compatibilidad
window.createDeck = createDeck;
window.createFlashcard = createFlashcard;
window.loadDecksForCreation = loadDecksForCreation;