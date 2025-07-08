import { validateDeckData, validateFlashcardData } from './utils/validation.js';
import { showNotification, generateId } from './utils/helpers.js';

/**
 * Servicio de almacenamiento refactorizado
 * Maneja persistencia local con validación y sincronización
 */

// Configuración del almacenamiento
const STORAGE_CONFIG = {
  prefix: 'studyingflash_',
  version: '1.0',
  maxStorageSize: 50 * 1024 * 1024, // 50MB
  compressionEnabled: true,
  encryptionEnabled: false, // Para futuras implementaciones
  syncEnabled: true,
};

// Cache en memoria para optimización
const memoryCache = new Map();
const cacheExpiry = new Map();

/**
 * Clase principal del servicio de almacenamiento
 */
class StorageService {
  constructor() {
    this.prefix = STORAGE_CONFIG.prefix;
    this.isAvailable = this.checkStorageAvailability();
    this.initializeStorage();
  }

  /**
   * Verifica si localStorage está disponible
   * @returns {boolean} - Disponibilidad del almacenamiento
   */
  checkStorageAvailability() {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (error) {
      console.warn('localStorage no disponible:', error);
      return false;
    }
  }

  /**
   * Inicializa el almacenamiento
   */
  initializeStorage() {
    if (!this.isAvailable) {
      showNotification('Almacenamiento local no disponible', 'warning');
      return;
    }

    // Verificar versión y migrar si es necesario
    const currentVersion = this.load('version');
    if (!currentVersion || currentVersion !== STORAGE_CONFIG.version) {
      this.migrateStorage(currentVersion);
    }

    // Limpiar datos expirados
    this.cleanExpiredData();
  }

  /**
   * Migra datos de versiones anteriores
   * @param {string} oldVersion - Versión anterior
   */
  migrateStorage(oldVersion) {
    console.log(
      `Migrando almacenamiento de ${oldVersion || 'unknown'} a ${STORAGE_CONFIG.version}`
    );

    try {
      // Aquí se implementarían las migraciones específicas
      // Por ahora, solo actualizamos la versión
      this.save('version', STORAGE_CONFIG.version);

      showNotification('Almacenamiento actualizado', 'info');
    } catch (error) {
      console.error('Error en migración:', error);
      showNotification('Error al actualizar almacenamiento', 'error');
    }
  }

  /**
   * Limpia datos expirados del almacenamiento
   */
  cleanExpiredData() {
    const now = Date.now();
    const keysToRemove = [];

    // Revisar todas las claves con expiración
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.prefix + 'exp_')) {
        const expiryKey = key;
        const dataKey = key.replace('exp_', '');
        const expiry = localStorage.getItem(expiryKey);

        if (expiry && parseInt(expiry) < now) {
          keysToRemove.push(dataKey);
          keysToRemove.push(expiryKey);
        }
      }
    }

    // Remover datos expirados
    keysToRemove.forEach((key) => {
      localStorage.removeItem(key);
      memoryCache.delete(key);
      cacheExpiry.delete(key);
    });

    if (keysToRemove.length > 0) {
      console.log(`Limpiados ${keysToRemove.length / 2} elementos expirados`);
    }
  }

  /**
   * Guarda datos en el almacenamiento
   * @param {string} key - Clave de almacenamiento
   * @param {*} data - Datos a guardar
   * @param {Object} options - Opciones de guardado
   * @returns {boolean} - Éxito de la operación
   */
  save(key, data, options = {}) {
    if (!this.isAvailable) {
      console.warn('Almacenamiento no disponible');
      return false;
    }

    const {
      expiry = null, // Tiempo de expiración en ms
      compress = STORAGE_CONFIG.compressionEnabled,
      validate = true,
    } = options;

    try {
      const fullKey = this.prefix + key;
      const serializedData = JSON.stringify(data);

      // Validar tamaño
      if (serializedData.length > STORAGE_CONFIG.maxStorageSize) {
        throw new Error('Datos demasiado grandes para almacenar');
      }

      // Comprimir si está habilitado (implementación básica)
      if (compress && serializedData.length > 1000) {
        // Aquí se implementaría compresión real
        console.log('Compresión habilitada para:', key);
      }

      // Guardar datos
      localStorage.setItem(fullKey, serializedData);

      // Guardar expiración si se especifica
      if (expiry) {
        const expiryTime = Date.now() + expiry;
        localStorage.setItem(this.prefix + 'exp_' + key, expiryTime.toString());
        cacheExpiry.set(key, expiryTime);
      }

      // Actualizar cache en memoria
      memoryCache.set(key, data);

      console.log('✅ Datos guardados:', key);
      return true;
    } catch (error) {
      console.error('❌ Error al guardar:', error);

      // Intentar liberar espacio si el error es por falta de espacio
      if (error.name === 'QuotaExceededError') {
        this.freeUpSpace();
        showNotification(
          'Almacenamiento lleno, liberando espacio...',
          'warning'
        );
      }

      return false;
    }
  }

  /**
   * Carga datos del almacenamiento
   * @param {string} key - Clave de almacenamiento
   * @param {*} defaultValue - Valor por defecto
   * @returns {*} - Datos cargados
   */
  load(key, defaultValue = null) {
    if (!this.isAvailable) {
      return defaultValue;
    }

    try {
      // Verificar cache en memoria primero
      if (memoryCache.has(key)) {
        const expiry = cacheExpiry.get(key);
        if (!expiry || Date.now() < expiry) {
          return memoryCache.get(key);
        } else {
          // Datos expirados
          this.remove(key);
          return defaultValue;
        }
      }

      const fullKey = this.prefix + key;
      const data = localStorage.getItem(fullKey);

      if (data === null) {
        return defaultValue;
      }

      const parsedData = JSON.parse(data);

      // Actualizar cache en memoria
      memoryCache.set(key, parsedData);

      return parsedData;
    } catch (error) {
      console.error('❌ Error al cargar:', error);
      return defaultValue;
    }
  }

  /**
   * Elimina datos del almacenamiento
   * @param {string} key - Clave a eliminar
   * @returns {boolean} - Éxito de la operación
   */
  remove(key) {
    if (!this.isAvailable) {
      return false;
    }

    try {
      const fullKey = this.prefix + key;
      const expiryKey = this.prefix + 'exp_' + key;

      localStorage.removeItem(fullKey);
      localStorage.removeItem(expiryKey);

      memoryCache.delete(key);
      cacheExpiry.delete(key);

      return true;
    } catch (error) {
      console.error('❌ Error al eliminar:', error);
      return false;
    }
  }

  /**
   * Libera espacio eliminando datos menos utilizados
   */
  freeUpSpace() {
    const keysToRemove = [];

    // Identificar datos temporales o menos importantes
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.prefix)) {
        const shortKey = key.replace(this.prefix, '');

        // Remover caches temporales primero
        if (shortKey.includes('cache_') || shortKey.includes('temp_')) {
          keysToRemove.push(shortKey);
        }
      }
    }

    // Remover datos identificados
    keysToRemove.forEach((key) => this.remove(key));

    console.log(`Liberado espacio: ${keysToRemove.length} elementos removidos`);
  }

  // MÉTODOS ESPECÍFICOS PARA DECKS

  /**
   * Obtiene todos los decks
   * @returns {Array} - Array de decks
   */
  getDecks() {
    const decks = this.load('decks', []);
    console.log('📚 Decks cargados:', decks.length);
    return decks;
  }

  /**
   * Obtiene un deck por ID
   * @param {number} deckId - ID del deck
   * @returns {Object|null} - Deck encontrado
   */
  getDeck(deckId) {
    const decks = this.getDecks();
    const deck = decks.find((d) => d.id === deckId);
    console.log('📖 Deck encontrado:', deck ? deck.name : 'No encontrado');
    return deck;
  }

  /**
   * Crea un nuevo deck
   * @param {Object} deckData - Datos del deck
   * @returns {Object|null} - Deck creado
   */
  createDeck(deckData) {
    if (!validateDeckData(deckData.name, deckData.description || '')) {
      return null;
    }

    const decks = this.getDecks();
    const newDeck = {
      id: generateId(),
      name: deckData.name,
      description: deckData.description || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      card_count: 0,
      is_public: deckData.is_public || false,
      category: deckData.category || 'General',
      tags: deckData.tags || [],
      ...deckData,
    };

    decks.push(newDeck);

    if (this.save('decks', decks)) {
      // Agregar a la lista de decks pendientes para sincronización
      this.addToPendingSync('deck', {
        tempId: newDeck.id,
        name: deckData.name,
        description: deckData.description || '',
        is_public: deckData.is_public || false,
        created_at: newDeck.created_at
      });

      console.log('✅ Deck creado:', newDeck.name);
      showNotification(`Deck "${newDeck.name}" creado exitosamente`, 'success');
      return newDeck;
    }

    return null;
  }

  /**
   * Actualiza un deck existente
   * @param {number} deckId - ID del deck
   * @param {Object} updateData - Datos a actualizar
   * @returns {Object|null} - Deck actualizado
   */
  updateDeck(deckId, updateData) {
    const decks = this.getDecks();
    const deckIndex = decks.findIndex((d) => d.id === deckId);

    if (deckIndex === -1) {
      showNotification('Deck no encontrado', 'error');
      return null;
    }

    // Validar datos si se está actualizando nombre o descripción
    if (updateData.name || updateData.description !== undefined) {
      const name = updateData.name || decks[deckIndex].name;
      const description =
        updateData.description !== undefined
          ? updateData.description
          : decks[deckIndex].description;

      if (!validateDeckData(name, description)) {
        return null;
      }
    }

    // Actualizar deck
    decks[deckIndex] = {
      ...decks[deckIndex],
      ...updateData,
      updated_at: new Date().toISOString(),
    };

    if (this.save('decks', decks)) {
      console.log('✅ Deck actualizado:', decks[deckIndex].name);
      showNotification('Deck actualizado exitosamente', 'success');
      return decks[deckIndex];
    }

    return null;
  }

  /**
   * Elimina un deck
   * @param {number} deckId - ID del deck
   * @returns {boolean} - Éxito de la operación
   */
  deleteDeck(deckId) {
    const decks = this.getDecks();
    const deckIndex = decks.findIndex((d) => d.id === deckId);

    if (deckIndex === -1) {
      showNotification('Deck no encontrado', 'error');
      return false;
    }

    const deckName = decks[deckIndex].name;
    decks.splice(deckIndex, 1);

    // También eliminar las flashcards del deck
    this.deleteFlashcardsByDeck(deckId);

    if (this.save('decks', decks)) {
      console.log('✅ Deck eliminado:', deckName);
      showNotification(`Deck "${deckName}" eliminado`, 'success');
      return true;
    }

    return false;
  }

  // MÉTODOS ESPECÍFICOS PARA FLASHCARDS

  /**
   * Obtiene todas las flashcards
   * @returns {Array} - Array de flashcards
   */
  getFlashcards() {
    return this.load('flashcards', []);
  }

  /**
   * Obtiene flashcards de un deck específico
   * @param {number} deckId - ID del deck
   * @returns {Array} - Array de flashcards
   */
  getFlashcardsByDeck(deckId) {
    const flashcards = this.getFlashcards();
    return flashcards.filter((card) => card.deck_id === deckId);
  }

  /**
   * Cria uma nova flashcard
   * @param {Object} cardData - Dados da flashcard
   * @returns {Object|null} - Flashcard criada
   */
  createFlashcard(cardData) {
    if (
      !validateFlashcardData(cardData.deck_id, cardData.front, cardData.back)
    ) {
      return null;
    }

    const flashcards = this.getFlashcards();
    const newCard = {
      id: generateId(),
      deck_id: cardData.deck_id,
      front: cardData.front,
      back: cardData.back,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),

      // Dados de repetição espaciada
      interval: 1,
      ease_factor: 2.5,
      repetitions: 0,
      next_review: new Date().toISOString(),
      last_reviewed: null,

      ...cardData,
    };

    flashcards.push(newCard);

    if (this.save('flashcards', flashcards)) {
      // Actualizar contador del deck
      this.updateDeckCardCount(cardData.deck_id);

      // Agregar a la lista de flashcards pendientes para sincronización
      this.addToPendingSync('flashcard', {
        tempId: newCard.id,
        deck_id: cardData.deck_id,
        front: cardData.front,
        back: cardData.back,
        created_at: newCard.created_at
      });

      console.log('✅ Flashcard creada');
      return newCard;
    }

    return null;
  }

  /**
   * Actualiza una flashcard existente
   * @param {number} cardId - ID de la flashcard
   * @param {Object} updateData - Datos a actualizar
   * @returns {Object|null} - Flashcard actualizada
   */
  updateFlashcard(cardId, updateData) {
    const flashcards = this.getFlashcards();
    const cardIndex = flashcards.findIndex((c) => c.id === cardId);

    if (cardIndex === -1) {
      showNotification('Flashcard no encontrada', 'error');
      return null;
    }

    // Validar datos si se está actualizando contenido
    if (updateData.front || updateData.back) {
      const front = updateData.front || flashcards[cardIndex].front;
      const back = updateData.back || flashcards[cardIndex].back;
      const deckId = flashcards[cardIndex].deck_id;

      if (!validateFlashcardData(deckId, front, back)) {
        return null;
      }
    }

    // Actualizar flashcard
    flashcards[cardIndex] = {
      ...flashcards[cardIndex],
      ...updateData,
      updated_at: new Date().toISOString(),
    };

    if (this.save('flashcards', flashcards)) {
      console.log('✅ Flashcard actualizada');
      return flashcards[cardIndex];
    }

    return null;
  }

  /**
   * Elimina una flashcard
   * @param {number} cardId - ID de la flashcard
   * @returns {boolean} - Éxito de la operación
   */
  deleteFlashcard(cardId) {
    const flashcards = this.getFlashcards();
    const cardIndex = flashcards.findIndex((c) => c.id === cardId);

    if (cardIndex === -1) {
      showNotification('Flashcard no encontrada', 'error');
      return false;
    }

    const deckId = flashcards[cardIndex].deck_id;
    flashcards.splice(cardIndex, 1);

    if (this.save('flashcards', flashcards)) {
      // Actualizar contador del deck
      this.updateDeckCardCount(deckId);

      console.log('✅ Flashcard eliminada');
      return true;
    }

    return false;
  }

  /**
   * Elimina todas las flashcards de un deck
   * @param {number} deckId - ID del deck
   * @returns {boolean} - Éxito de la operación
   */
  deleteFlashcardsByDeck(deckId) {
    const flashcards = this.getFlashcards();
    const filteredCards = flashcards.filter((card) => card.deck_id !== deckId);

    return this.save('flashcards', filteredCards);
  }

  /**
   * Actualiza el contador de cartas de un deck
   * @param {number} deckId - ID del deck
   */
  updateDeckCardCount(deckId) {
    const cardCount = this.getFlashcardsByDeck(deckId).length;
    this.updateDeck(deckId, { card_count: cardCount });
  }

  // MÉTODOS DE UTILIDAD

  /**
   * Exporta todos los datos
   * @returns {Object} - Datos exportados
   */
  exportAllData() {
    return {
      version: STORAGE_CONFIG.version,
      exported_at: new Date().toISOString(),
      decks: this.getDecks(),
      flashcards: this.getFlashcards(),
      settings: this.load('settings', {}),
      stats: this.load('stats', {}),
    };
  }

  /**
   * Importa datos
   * @param {Object} data - Datos a importar
   * @returns {boolean} - Éxito de la operación
   */
  importData(data) {
    try {
      if (data.decks) {
        this.save('decks', data.decks);
      }
      if (data.flashcards) {
        this.save('flashcards', data.flashcards);
      }
      if (data.settings) {
        this.save('settings', data.settings);
      }
      if (data.stats) {
        this.save('stats', data.stats);
      }

      showNotification('Datos importados exitosamente', 'success');
      return true;
    } catch (error) {
      console.error('Error importing data:', error);
      showNotification('Error al importar datos', 'error');
      return false;
    }
  }

  /**
   * Limpia todos los datos
   * @returns {boolean} - Éxito de la operación
   */
  clearAllData() {
    try {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.prefix)) {
          keys.push(key);
        }
      }

      keys.forEach((key) => localStorage.removeItem(key));
      memoryCache.clear();
      cacheExpiry.clear();

      showNotification('Todos los datos eliminados', 'info');
      return true;
    } catch (error) {
      console.error('Error clearing data:', error);
      return false;
    }
  }

  /**
   * Obtiene información de uso del almacenamiento
   * @returns {Object} - Información de uso
   */
  getStorageInfo() {
    if (!this.isAvailable) {
      return { available: false };
    }

    let totalSize = 0;
    let itemCount = 0;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.prefix)) {
        const value = localStorage.getItem(key);
        totalSize += key.length + (value ? value.length : 0);
        itemCount++;
      }
    }

    return {
      available: true,
      totalSize: totalSize,
      itemCount: itemCount,
      maxSize: STORAGE_CONFIG.maxStorageSize,
      usagePercentage: Math.round(
        (totalSize / STORAGE_CONFIG.maxStorageSize) * 100
      ),
      memoryCache: {
        size: memoryCache.size,
        keys: Array.from(memoryCache.keys()),
      },
    };
  }

  // MÉTODOS PARA SINCRONIZACIÓN OFFLINE

  /**
   * Agrega un elemento a la lista de sincronización pendiente
   * @param {string} type - Tipo de elemento ('deck' o 'flashcard')
   * @param {Object} data - Datos del elemento
   */
  addToPendingSync(type, data) {
    try {
      const key = type === 'deck' ? 'pending_decks' : 'pending_flashcards';
      const pendingItems = this.load(key, []);
      
      // Verificar si ya existe para evitar duplicados
      const exists = pendingItems.some(item => item.tempId === data.tempId);
      if (!exists) {
        pendingItems.push(data);
        this.save(key, pendingItems);
        console.log(`✅ ${type} agregado a sincronización pendiente:`, data.tempId);
      }
    } catch (error) {
      console.error(`❌ Error agregando ${type} a sincronización pendiente:`, error);
    }
  }

  /**
   * Obtiene elementos pendientes de sincronización
   * @param {string} type - Tipo de elemento ('deck' o 'flashcard')
   * @returns {Array} - Array de elementos pendientes
   */
  getPendingSync(type) {
    const key = type === 'deck' ? 'pending_decks' : 'pending_flashcards';
    return this.load(key, []);
  }

  /**
   * Remueve un elemento de la lista de sincronización pendiente
   * @param {string} type - Tipo de elemento ('deck' o 'flashcard')
   * @param {string} tempId - ID temporal del elemento
   */
  removeFromPendingSync(type, tempId) {
    try {
      const key = type === 'deck' ? 'pending_decks' : 'pending_flashcards';
      const pendingItems = this.load(key, []);
      const filteredItems = pendingItems.filter(item => item.tempId !== tempId);
      
      this.save(key, filteredItems);
      console.log(`✅ ${type} removido de sincronización pendiente:`, tempId);
    } catch (error) {
      console.error(`❌ Error removiendo ${type} de sincronización pendiente:`, error);
    }
  }

  /**
   * Limpia todos los elementos pendientes de sincronización
   * @param {string} type - Tipo de elemento ('deck' o 'flashcard') o 'all' para todos
   */
  clearPendingSync(type = 'all') {
    try {
      if (type === 'all' || type === 'deck') {
        this.remove('pending_decks');
      }
      if (type === 'all' || type === 'flashcard') {
        this.remove('pending_flashcards');
      }
      console.log(`✅ Sincronización pendiente limpiada: ${type}`);
    } catch (error) {
      console.error('❌ Error limpiando sincronización pendiente:', error);
    }
  }

  /**
   * Obtiene estadísticas de sincronización pendiente
   * @returns {Object} - Estadísticas de elementos pendientes
   */
  getPendingSyncStats() {
    return {
      pendingDecks: this.getPendingSync('deck').length,
      pendingFlashcards: this.getPendingSync('flashcard').length,
      totalPending: this.getPendingSync('deck').length + this.getPendingSync('flashcard').length
    };
  }
}

// Crear instancia singleton
const storageService = new StorageService();

/// Exportar métodos principais
export const {
  save,
  load,
  remove,
  getDecks,
  getDeck,
  createDeck,
  updateDeck,
  deleteDeck,
  getFlashcards,
  getFlashcardsByDeck,
  createFlashcard,
  updateFlashcard,
  deleteFlashcard,
  exportAllData,
  importData,
  clearAllData,
  getStorageInfo,
  addToPendingSync,
  getPendingSync,
  removeFromPendingSync,
  clearPendingSync,
  getPendingSyncStats,
} = storageService;

// Exportar la instancia completa
export default storageService;

// Exponer globalmente para compatibilidad
window.StorageService = storageService;
