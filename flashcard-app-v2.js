/**
 * FLASHCARD APP V2 - Versión definitiva funcional
 * Archivo nuevo para evitar caché de GitHub Pages
 */

console.log('🚀 === FLASHCARD APP V2 INICIANDO ===');

// ===== ESTADO GLOBAL =====
let appState = {
  decks: [],
  flashcards: [],
  userStats: {
    totalFlashcards: 0,
    studiedToday: 0,
    accuracy: 0,
    studyTime: 0
  }
};

// ===== FUNCIONES DE ALMACENAMIENTO =====
function saveState() {
  try {
    localStorage.setItem('flashcard_app_v2', JSON.stringify(appState));
    console.log('💾 Estado guardado');
  } catch (error) {
    console.error('Error guardando:', error);
  }
}

function loadState() {
  try {
    const saved = localStorage.getItem('flashcard_app_v2');
    if (saved) {
      appState = { ...appState, ...JSON.parse(saved) };
      console.log('📂 Estado cargado:', appState);
    }
  } catch (error) {
    console.error('Error cargando:', error);
  }
}

// ===== ALGORITMO SM-2 SIMPLIFICADO =====
function calculateNextReview(flashcard, quality) {
  const repetitions = flashcard.repetitions || 0;
  const interval = flashcard.interval || 1;
  const easeFactor = flashcard.easeFactor || 2.5;

  let newRepetitions = repetitions;
  let newInterval = interval;
  let newEaseFactor = easeFactor;

  if (quality >= 3) {
    newRepetitions = repetitions + 1;
    if (newRepetitions === 1) {
      newInterval = 1;
    } else if (newRepetitions === 2) {
      newInterval = 6;
    } else {
      newInterval = Math.round(interval * easeFactor);
    }
    newEaseFactor = Math.max(1.3, easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
  } else {
    newRepetitions = 0;
    newInterval = 1;
  }

  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);

  return {
    repetitions: newRepetitions,
    interval: newInterval,
    easeFactor: newEaseFactor,
    nextReview: nextReviewDate.toISOString()
  };
}

// ===== FUNCIONES PRINCIPALES =====

/**
 * Crear nuevo deck
 */
function createDeck() {
  console.log('🎯 createDeck() llamada');
  
  const nameInput = document.querySelector('input[placeholder*="Vocabulario"]') || 
                   document.querySelector('input[placeholder*="Inglés"]') ||
                   document.querySelector('input[type="text"]');
  
  const descriptionInput = document.querySelector('textarea');
  const publicCheckbox = document.querySelector('input[type="checkbox"]');

  console.log('📝 Inputs encontrados:', {
    name: nameInput?.value,
    description: descriptionInput?.value,
    public: publicCheckbox?.checked
  });

  if (!nameInput || !nameInput.value.trim()) {
    alert('Por favor ingresa un nombre para el deck');
    return;
  }

  const newDeck = {
    id: 'deck_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
    name: nameInput.value.trim(),
    description: descriptionInput ? descriptionInput.value.trim() : '',
    isPublic: publicCheckbox ? publicCheckbox.checked : false,
    flashcardCount: 0,
    createdAt: new Date().toISOString()
  };

  appState.decks.push(newDeck);
  saveState();
  
  // Limpiar formulario
  nameInput.value = '';
  if (descriptionInput) descriptionInput.value = '';
  if (publicCheckbox) publicCheckbox.checked = false;

  // Actualizar interfaz
  updateDashboard();
  updateDeckSelectors();
  
  alert(`¡Deck "${newDeck.name}" creado exitosamente!`);
  console.log('✅ Deck creado:', newDeck);
}

/**
 * Agregar flashcard
 */
function addFlashcard() {
  console.log('🎯 addFlashcard() llamada');
  
  const deckSelect = document.querySelector('select');
  const frontInput = document.querySelector('input[placeholder*="pregunta"]') ||
                    document.querySelector('input[placeholder*="frente"]');
  const backInput = document.querySelector('input[placeholder*="respuesta"]') ||
                   document.querySelector('input[placeholder*="reverso"]');

  if (!deckSelect || !deckSelect.value) {
    alert('Por favor selecciona un deck');
    return;
  }

  if (!frontInput || !frontInput.value.trim()) {
    alert('Por favor ingresa la pregunta');
    return;
  }

  if (!backInput || !backInput.value.trim()) {
    alert('Por favor ingresa la respuesta');
    return;
  }

  const newFlashcard = {
    id: 'card_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
    deckId: deckSelect.value,
    front: frontInput.value.trim(),
    back: backInput.value.trim(),
    createdAt: new Date().toISOString(),
    repetitions: 0,
    interval: 1,
    easeFactor: 2.5,
    nextReview: new Date().toISOString()
  };

  appState.flashcards.push(newFlashcard);
  
  // Actualizar contador en deck
  const deck = appState.decks.find(d => d.id === deckSelect.value);
  if (deck) {
    deck.flashcardCount = appState.flashcards.filter(f => f.deckId === deck.id).length;
  }
  
  appState.userStats.totalFlashcards = appState.flashcards.length;
  saveState();
  
  // Limpiar formulario
  frontInput.value = '';
  backInput.value = '';

  // Actualizar interfaz
  updateDashboard();
  updateDeckSelectors();
  
  alert(`¡Flashcard agregada al deck "${deck.name}"!`);
  console.log('✅ Flashcard agregada:', newFlashcard);
}

/**
 * Iniciar sesión de estudio
 */
function startStudySession(deckId) {
  console.log('🎯 startStudySession() llamada para deck:', deckId);
  
  const deck = appState.decks.find(d => d.id === deckId);
  if (!deck) {
    alert('Deck no encontrado');
    return;
  }

  const deckFlashcards = appState.flashcards.filter(f => f.deckId === deckId);
  if (deckFlashcards.length === 0) {
    alert('Este deck no tiene flashcards. ¡Agrega algunas primero!');
    return;
  }

  // Sesión de estudio simplificada
  let studied = 0;
  let correct = 0;
  
  for (let flashcard of deckFlashcards.slice(0, 3)) { // Solo 3 para demo
    const userAnswer = prompt(`PREGUNTA: ${flashcard.front}\n\n¿Cuál es tu respuesta?`);
    
    if (userAnswer === null) break; // Usuario canceló
    
    const isCorrect = userAnswer.toLowerCase().trim() === flashcard.back.toLowerCase().trim();
    const quality = isCorrect ? 4 : 2;
    
    // Actualizar flashcard con algoritmo
    const updates = calculateNextReview(flashcard, quality);
    Object.assign(flashcard, updates);
    
    studied++;
    if (isCorrect) correct++;
    
    alert(isCorrect ? '✅ ¡Correcto!' : `❌ Incorrecto. La respuesta era: ${flashcard.back}`);
  }

  // Actualizar estadísticas
  appState.userStats.studiedToday += studied;
  appState.userStats.accuracy = studied > 0 ? Math.round((correct / studied) * 100) : 0;
  saveState();

  alert(`¡Sesión completada!\n\nEstudiadas: ${studied}\nCorrectas: ${correct}\nPrecisión: ${Math.round((correct / studied) * 100)}%`);
  
  updateDashboard();
  console.log('🏁 Sesión de estudio completada');
}

/**
 * Actualizar dashboard
 */
function updateDashboard() {
  console.log('📊 Actualizando dashboard...');
  
  // Actualizar estadísticas
  const statNumbers = document.querySelectorAll('.stat-number');
  if (statNumbers.length >= 4) {
    statNumbers[0].textContent = appState.userStats.totalFlashcards || 0;
    statNumbers[1].textContent = appState.userStats.studiedToday || 0;
    statNumbers[2].textContent = `${appState.userStats.accuracy || 0}%`;
    statNumbers[3].textContent = `${appState.userStats.studyTime || 0}m`;
  }

  // Actualizar sección de decks
  updateDecksDisplay();
  
  console.log('✅ Dashboard actualizado');
}

/**
 * Actualizar selectores de deck
 */
function updateDeckSelectors() {
  console.log('🔄 Actualizando selectores...');
  
  const selects = document.querySelectorAll('select');
  
  selects.forEach(select => {
    const currentValue = select.value;
    select.innerHTML = '<option value="">Selecciona un deck...</option>';
    
    appState.decks.forEach(deck => {
      const flashcardCount = appState.flashcards.filter(f => f.deckId === deck.id).length;
      const option = document.createElement('option');
      option.value = deck.id;
      option.textContent = `${deck.name} (${flashcardCount} flashcards)`;
      select.appendChild(option);
    });
    
    if (currentValue && appState.decks.find(d => d.id === currentValue)) {
      select.value = currentValue;
    }
  });
  
  console.log('✅ Selectores actualizados');
}

/**
 * Actualizar visualización de decks
 */
function updateDecksDisplay() {
  const decks = appState.decks;
  
  if (decks.length > 0) {
    console.log('📚 Mostrando', decks.length, 'decks');
    
    // Buscar contenedor de decks
    const containers = [
      document.querySelector('.deck-grid'),
      document.querySelector('[class*="deck"]'),
      document.querySelector('.grid'),
      document.querySelector('#deck-container')
    ];
    
    const decksContainer = containers.find(c => c !== null);
    
    if (decksContainer) {
      const decksHTML = decks.map(deck => {
        const flashcardCount = appState.flashcards.filter(f => f.deckId === deck.id).length;
        
        return `
          <div class="deck-card" style="border: 1px solid #333; padding: 15px; margin: 10px; border-radius: 8px; background: #2a2a2a;">
            <h3 style="color: #fff; margin: 0 0 10px 0;">${deck.name}</h3>
            <p style="color: #ccc; margin: 0 0 10px 0;">${deck.description}</p>
            <div style="color: #888; font-size: 14px;">
              📚 ${flashcardCount} flashcards
            </div>
            <button onclick="startStudySession('${deck.id}')" style="margin-top: 10px; padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
              Estudiar
            </button>
          </div>
        `;
      }).join('');
      
      decksContainer.innerHTML = decksHTML;
    }
  }
}

// ===== INICIALIZACIÓN =====

/**
 * Configurar event listeners
 */
function setupEventListeners() {
  console.log('🔗 Configurando event listeners...');
  
  // Buscar botón crear deck
  const buttons = document.querySelectorAll('button');
  let createDeckBtn = null;
  
  for (let btn of buttons) {
    if (btn.textContent.includes('Crear Deck') || btn.textContent.includes('Crear')) {
      createDeckBtn = btn;
      break;
    }
  }
  
  if (createDeckBtn) {
    createDeckBtn.onclick = null; // Limpiar eventos anteriores
    createDeckBtn.addEventListener('click', function(e) {
      e.preventDefault();
      console.log('🎯 Botón crear deck clickeado');
      createDeck();
    });
    console.log('✅ Event listener configurado para crear deck');
  } else {
    console.log('⚠️ No se encontró botón crear deck');
  }

  // Configurar botón agregar flashcard si existe
  const addFlashcardBtns = document.querySelectorAll('button');
  for (let btn of addFlashcardBtns) {
    if (btn.textContent.includes('Agregar') || btn.textContent.includes('Añadir')) {
      btn.onclick = null;
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        addFlashcard();
      });
      console.log('✅ Event listener configurado para agregar flashcard');
      break;
    }
  }
}

/**
 * Inicializar aplicación
 */
function initializeApp() {
  console.log('🚀 Inicializando FLASHCARD APP V2...');
  
  // Cargar estado
  loadState();
  
  // Configurar eventos
  setupEventListeners();
  
  // Actualizar interfaz
  updateDashboard();
  updateDeckSelectors();
  
  // Exponer funciones globalmente
  window.createDeck = createDeck;
  window.addFlashcard = addFlashcard;
  window.startStudySession = startStudySession;
  window.appState = appState;
  
  console.log('✅ FLASHCARD APP V2 inicializada correctamente');
  console.log('🎯 Estado actual:', appState);
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

console.log('📱 FLASHCARD APP V2 CARGADA - Todas las funcionalidades disponibles');

