import { validateDeckData, validateFlashcardData } from './utils/validation.js';
import { showNotification, generateId, formatDate } from './utils/helpers.js';

/**
 * Servicio generador de datos para testing y desarrollo
 * Refactorizado para usar utilidades comunes y eliminar duplicación
 */

// Configuración del generador
const GENERATOR_CONFIG = {
  maxDecks: 50,
  maxFlashcardsPerDeck: 100,
  categories: ['idiomas', 'matematicas', 'historia', 'ciencias', 'geografia', 'literatura'],
  difficulties: ['facil', 'medio', 'dificil'],
  languages: ['es', 'en', 'fr', 'de', 'it']
};

// Templates de datos realistas
const DATA_TEMPLATES = {
  deckTemplates: [
    {
      nombre: 'Vocabulario Inglés Básico',
      descripcion: 'Palabras esenciales en inglés para principiantes',
      categoria: 'idiomas',
      dificultad: 'facil',
      tags: ['inglés', 'vocabulario', 'básico']
    },
    {
      nombre: 'Matemáticas Fundamentales',
      descripcion: 'Conceptos básicos de aritmética y álgebra',
      categoria: 'matematicas',
      dificultad: 'medio',
      tags: ['matemáticas', 'aritmética', 'álgebra']
    },
    {
      nombre: 'Historia Universal',
      descripcion: 'Eventos importantes de la historia mundial',
      categoria: 'historia',
      dificultad: 'dificil',
      tags: ['historia', 'mundial', 'eventos']
    },
    {
      nombre: 'Biología Celular',
      descripcion: 'Estructura y función de las células',
      categoria: 'ciencias',
      dificultad: 'medio',
      tags: ['biología', 'células', 'ciencia']
    },
    {
      nombre: 'Geografía Mundial',
      descripcion: 'Países, capitales y características geográficas',
      categoria: 'geografia',
      dificultad: 'medio',
      tags: ['geografía', 'países', 'capitales']
    },
    {
      nombre: 'Literatura Clásica',
      descripcion: 'Obras y autores de la literatura universal',
      categoria: 'literatura',
      dificultad: 'dificil',
      tags: ['literatura', 'clásicos', 'autores']
    }
  ],

  flashcardTemplates: {
    idiomas: [
      { frente: 'Hello', reverso: 'Hola', dificultad: 'facil' },
      { frente: 'Goodbye', reverso: 'Adiós', dificultad: 'facil' },
      { frente: 'Thank you', reverso: 'Gracias', dificultad: 'facil' },
      { frente: 'Please', reverso: 'Por favor', dificultad: 'facil' },
      { frente: 'Water', reverso: 'Agua', dificultad: 'facil' },
      { frente: 'Beautiful', reverso: 'Hermoso/a', dificultad: 'medio' },
      { frente: 'Understand', reverso: 'Entender', dificultad: 'medio' },
      { frente: 'Responsibility', reverso: 'Responsabilidad', dificultad: 'dificil' },
      { frente: 'Serendipity', reverso: 'Casualidad afortunada', dificultad: 'dificil' }
    ],
    
    matematicas: [
      { frente: '2 + 2 = ?', reverso: '4', dificultad: 'facil' },
      { frente: '5 × 3 = ?', reverso: '15', dificultad: 'facil' },
      { frente: '10 ÷ 2 = ?', reverso: '5', dificultad: 'facil' },
      { frente: '√16 = ?', reverso: '4', dificultad: 'medio' },
      { frente: '3² = ?', reverso: '9', dificultad: 'medio' },
      { frente: 'Derivada de x²', reverso: '2x', dificultad: 'dificil' },
      { frente: 'Integral de 2x', reverso: 'x² + C', dificultad: 'dificil' }
    ],
    
    historia: [
      { frente: '¿En qué año comenzó la Segunda Guerra Mundial?', reverso: '1939', dificultad: 'medio' },
      { frente: '¿Quién descubrió América?', reverso: 'Cristóbal Colón', dificultad: 'facil' },
      { frente: '¿En qué año cayó el Muro de Berlín?', reverso: '1989', dificultad: 'medio' },
      { frente: '¿Cuál fue la primera civilización?', reverso: 'Mesopotamia', dificultad: 'dificil' },
      { frente: '¿En qué año llegó el hombre a la Luna?', reverso: '1969', dificultad: 'medio' }
    ],
    
    ciencias: [
      { frente: '¿Cuál es la fórmula del agua?', reverso: 'H₂O', dificultad: 'facil' },
      { frente: '¿Qué organelo produce energía en la célula?', reverso: 'Mitocondria', dificultad: 'medio' },
      { frente: '¿Cuál es la velocidad de la luz?', reverso: '299,792,458 m/s', dificultad: 'dificil' },
      { frente: '¿Qué gas respiramos?', reverso: 'Oxígeno', dificultad: 'facil' }
    ],
    
    geografia: [
      { frente: '¿Cuál es la capital de Francia?', reverso: 'París', dificultad: 'facil' },
      { frente: '¿Cuál es el río más largo del mundo?', reverso: 'Nilo', dificultad: 'medio' },
      { frente: '¿En qué continente está Mongolia?', reverso: 'Asia', dificultad: 'medio' },
      { frente: '¿Cuál es el país más pequeño del mundo?', reverso: 'Vaticano', dificultad: 'dificil' }
    ],
    
    literatura: [
      { frente: '¿Quién escribió "Don Quijote"?', reverso: 'Miguel de Cervantes', dificultad: 'medio' },
      { frente: '¿Cuál es la primera línea de "Cien años de soledad"?', reverso: 'Muchos años después...', dificultad: 'dificil' },
      { frente: '¿Quién escribió "Romeo y Julieta"?', reverso: 'William Shakespeare', dificultad: 'facil' }
    ]
  },

  userTemplates: [
    { nombre: 'Ana García', email: 'ana.garcia@email.com', nivel: 'principiante' },
    { nombre: 'Carlos López', email: 'carlos.lopez@email.com', nivel: 'intermedio' },
    { nombre: 'María Rodríguez', email: 'maria.rodriguez@email.com', nivel: 'avanzado' },
    { nombre: 'Juan Martínez', email: 'juan.martinez@email.com', nivel: 'experto' }
  ]
};

/**
 * Genera un deck de prueba con datos realistas
 * @param {Object} options - Opciones de generación
 * @returns {Object} - Deck generado
 */
export function generateMockDeck(options = {}) {
  const {
    categoria = getRandomElement(GENERATOR_CONFIG.categories),
    numFlashcards = getRandomNumber(5, 20),
    dificultad = getRandomElement(GENERATOR_CONFIG.difficulties),
    includeMetadata = true
  } = options;

  // Seleccionar template base
  const template = DATA_TEMPLATES.deckTemplates.find(t => t.categoria === categoria) ||
                  getRandomElement(DATA_TEMPLATES.deckTemplates);

  // Generar datos del deck
  const deckData = {
    id: generateId(),
    name: template.nombre + (includeMetadata ? ` (${dificultad})` : ''),
    description: template.descripcion,
    categoria: template.categoria,
    dificultad: dificultad,
    tags: template.tags || [],
    is_public: Math.random() > 0.7, // 30% público
    created_at: generateRandomDate(),
    updated_at: new Date().toISOString(),
    card_count: numFlashcards,
    study_count: getRandomNumber(0, 100),
    last_studied: generateRandomDate(30) // Últimos 30 días
  };

  // Validar datos del deck
  if (!validateDeckData(deckData.name, deckData.description)) {
    throw new Error('Datos de deck generados inválidos');
  }

  return deckData;
}

/**
 * Genera flashcards de prueba para una categoría específica
 * @param {string} categoria - Categoría de las flashcards
 * @param {number} cantidad - Cantidad de flashcards a generar
 * @param {number} deckId - ID del deck al que pertenecen
 * @returns {Array} - Array de flashcards generadas
 */
export function generateMockFlashcards(categoria, cantidad = 10, deckId = null) {
  const templates = DATA_TEMPLATES.flashcardTemplates[categoria] || 
                   DATA_TEMPLATES.flashcardTemplates.idiomas;
  
  const flashcards = [];
  
  for (let i = 0; i < cantidad; i++) {
    const template = getRandomElement(templates);
    
    const flashcard = {
      id: generateId(),
      deck_id: deckId,
      front: template.frente,
      back: template.reverso,
      difficulty: template.dificultad || 'medio',
      created_at: generateRandomDate(),
      updated_at: new Date().toISOString(),
      
      // Datos de estudio simulados
      interval: getRandomNumber(1, 30),
      ease_factor: getRandomFloat(1.3, 3.0),
      repetitions: getRandomNumber(0, 10),
      next_review: generateFutureDate(),
      last_reviewed: generateRandomDate(7),
      
      // Estadísticas simuladas
      times_studied: getRandomNumber(0, 20),
      times_correct: getRandomNumber(0, 15),
      times_incorrect: getRandomNumber(0, 5),
      average_response_time: getRandomNumber(2000, 8000) // ms
    };

    // Validar datos de la flashcard
    if (!validateFlashcardData(deckId, flashcard.front, flashcard.back)) {
      console.warn('Flashcard generada inválida, saltando...');
      continue;
    }

    flashcards.push(flashcard);
  }
  
  return flashcards;
}

/**
 * Genera un dataset completo de prueba
 * @param {Object} options - Opciones de generación
 * @returns {Object} - Dataset completo
 */
export function generateMockDataset(options = {}) {
  const {
    numDecks = 5,
    numUsers = 3,
    includeStats = true,
    includeStudySessions = true
  } = options;

  showNotification('Generando dataset de prueba...', 'info');

  const dataset = {
    decks: [],
    flashcards: [],
    users: [],
    studySessions: [],
    stats: {},
    generatedAt: new Date().toISOString(),
    version: '1.0'
  };

  // Generar decks y flashcards
  for (let i = 0; i < numDecks; i++) {
    const deck = generateMockDeck();
    dataset.decks.push(deck);

    const flashcards = generateMockFlashcards(
      deck.categoria,
      getRandomNumber(8, 25),
      deck.id
    );
    dataset.flashcards.push(...flashcards);
  }

  // Generar usuarios
  for (let i = 0; i < numUsers; i++) {
    const user = generateMockUser();
    dataset.users.push(user);
  }

  // Generar sesiones de estudio
  if (includeStudySessions) {
    dataset.studySessions = generateMockStudySessions(dataset.users, dataset.decks);
  }

  // Generar estadísticas
  if (includeStats) {
    dataset.stats = generateMockStats(dataset);
  }

  showNotification(`Dataset generado: ${dataset.decks.length} decks, ${dataset.flashcards.length} flashcards`, 'success');

  return dataset;
}

/**
 * Genera un usuario de prueba
 * @returns {Object} - Usuario generado
 */
function generateMockUser() {
  const template = getRandomElement(DATA_TEMPLATES.userTemplates);
  
  return {
    id: generateId(),
    name: template.nombre,
    email: template.email,
    level: template.nivel,
    created_at: generateRandomDate(365), // Último año
    last_login: generateRandomDate(7), // Última semana
    
    // Estadísticas del usuario
    total_decks: getRandomNumber(1, 10),
    total_cards: getRandomNumber(50, 500),
    total_study_time: getRandomNumber(3600, 36000), // segundos
    streak_days: getRandomNumber(0, 30),
    
    // Configuración
    preferences: {
      algorithm: getRandomElement(['sm2', 'ultra_sm2', 'anki', 'fsrs']),
      daily_goal: getRandomNumber(10, 50),
      notifications: Math.random() > 0.5,
      theme: getRandomElement(['light', 'dark', 'auto'])
    }
  };
}

/**
 * Genera sesiones de estudio de prueba
 * @param {Array} users - Array de usuarios
 * @param {Array} decks - Array de decks
 * @returns {Array} - Array de sesiones de estudio
 */
function generateMockStudySessions(users, decks) {
  const sessions = [];
  
  users.forEach(user => {
    const numSessions = getRandomNumber(5, 20);
    
    for (let i = 0; i < numSessions; i++) {
      const deck = getRandomElement(decks);
      const session = {
        id: generateId(),
        user_id: user.id,
        deck_id: deck.id,
        started_at: generateRandomDate(30),
        ended_at: null,
        cards_studied: getRandomNumber(5, 30),
        cards_correct: 0,
        cards_incorrect: 0,
        total_time: getRandomNumber(300, 1800), // 5-30 minutos
        accuracy: 0
      };
      
      // Calcular precisión
      session.cards_correct = Math.floor(session.cards_studied * getRandomFloat(0.6, 0.95));
      session.cards_incorrect = session.cards_studied - session.cards_correct;
      session.accuracy = Math.round((session.cards_correct / session.cards_studied) * 100);
      
      // Calcular tiempo de finalización
      session.ended_at = new Date(
        new Date(session.started_at).getTime() + session.total_time * 1000
      ).toISOString();
      
      sessions.push(session);
    }
  });
  
  return sessions;
}

/**
 * Genera estadísticas de prueba
 * @param {Object} dataset - Dataset base
 * @returns {Object} - Estadísticas generadas
 */
function generateMockStats(dataset) {
  const totalCards = dataset.flashcards.length;
  const totalSessions = dataset.studySessions.length;
  
  return {
    global: {
      total_users: dataset.users.length,
      total_decks: dataset.decks.length,
      total_cards: totalCards,
      total_sessions: totalSessions,
      average_accuracy: getRandomNumber(70, 85),
      total_study_time: dataset.studySessions.reduce((sum, s) => sum + s.total_time, 0)
    },
    
    weekly: {
      sessions_per_day: Array.from({ length: 7 }, () => getRandomNumber(5, 25)),
      accuracy_per_day: Array.from({ length: 7 }, () => getRandomNumber(70, 90)),
      study_time_per_day: Array.from({ length: 7 }, () => getRandomNumber(1800, 7200))
    },
    
    categories: GENERATOR_CONFIG.categories.map(cat => ({
      name: cat,
      total_decks: dataset.decks.filter(d => d.categoria === cat).length,
      total_cards: dataset.flashcards.filter(f => {
        const deck = dataset.decks.find(d => d.id === f.deck_id);
        return deck && deck.categoria === cat;
      }).length,
      average_difficulty: getRandomFloat(1, 5)
    }))
  };
}

/**
 * Exporta dataset a archivo JSON
 * @param {Object} dataset - Dataset a exportar
 * @param {string} filename - Nombre del archivo
 */
export function exportMockDataset(dataset, filename = null) {
  const defaultFilename = `mock_dataset_${formatDate(new Date(), 'YYYY-MM-DD')}.json`;
  const finalFilename = filename || defaultFilename;
  
  const content = JSON.stringify(dataset, null, 2);
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = finalFilename;
  a.style.display = 'none';
  
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  
  URL.revokeObjectURL(url);
  
  showNotification(`Dataset exportado como ${finalFilename}`, 'success');
}

/**
 * Carga dataset desde archivo
 * @param {File} file - Archivo a cargar
 * @returns {Promise<Object>} - Dataset cargado
 */
export async function loadMockDataset(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = function(e) {
      try {
        const dataset = JSON.parse(e.target.result);
        showNotification('Dataset cargado exitosamente', 'success');
        resolve(dataset);
      } catch (error) {
        showNotification('Error al parsear el dataset', 'error');
        reject(error);
      }
    };
    
    reader.onerror = function() {
      showNotification('Error al leer el archivo', 'error');
      reject(new Error('Error reading file'));
    };
    
    reader.readAsText(file);
  });
}

// Funciones auxiliares
function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getRandomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

function generateRandomDate(daysBack = 365) {
  const now = new Date();
  const pastDate = new Date(now.getTime() - (Math.random() * daysBack * 24 * 60 * 60 * 1000));
  return pastDate.toISOString();
}

function generateFutureDate(daysForward = 30) {
  const now = new Date();
  const futureDate = new Date(now.getTime() + (Math.random() * daysForward * 24 * 60 * 60 * 1000));
  return futureDate.toISOString();
}

// Exponer funciones globalmente para compatibilidad
window.generateMockDeck = generateMockDeck;
window.generateMockFlashcards = generateMockFlashcards;
window.generateMockDataset = generateMockDataset;
window.exportMockDataset = exportMockDataset;
window.loadMockDataset = loadMockDataset;

