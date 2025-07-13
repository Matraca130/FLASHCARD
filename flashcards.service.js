/**
 * Servicio de Flashcards actualizado con nomenclatura unificada y soporte multimedia
 * Mantiene compatibilidad con formato legacy durante la transición
 */

import { api } from './apiClient.js';
import { store } from './store.js';
import { apiWithFallback, performCrudOperation } from './utils/apiHelpers.js';
import { showNotification, generateId } from './utils/helpers.js';
import { validateFlashcardData as validateFlashcardDataUtil } from './utils/validation.js';

/**
 * Configuración del servicio de flashcards
 */
const FLASHCARD_CONFIG = {
  // Formato de datos preferido
  preferredFormat: 'unified', // 'unified' | 'legacy'
  
  // Límites de contenido
  maxTextLength: 5000,
  maxImageSize: 5 * 1024 * 1024, // 5MB
  
  // Tipos de contenido soportados
  supportedImageTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  supportedAudioTypes: ['audio/mp3', 'audio/wav', 'audio/ogg'],
  
  // URLs de CDN para multimedia
  cdnBaseUrl: 'https://cdn.studyingflash.com',
  
  // Configuración de algoritmos
  defaultAlgorithm: 'fsrs',
  supportedAlgorithms: ['fsrs', 'sm2', 'ultra_sm2', 'anki']
};

/**
 * Clase principal del servicio de flashcards
 */
class FlashcardService {
  constructor() {
    this.currentFormat = FLASHCARD_CONFIG.preferredFormat;
    this.cache = new Map();
    this.uploadQueue = [];
  }

  // ========== MÉTODOS DE CREACIÓN ==========

  /**
   * Crear nueva flashcard con formato unificado
   * @param {Object} flashcardData - Datos de la flashcard
   * @returns {Promise<Object>} - Flashcard creada
   */
  async createFlashcard(flashcardData) {
    try {
      // Validar datos de entrada
      const validationResult = validateFlashcardDataUtil(
        flashcardData,
        false,
        FLASHCARD_CONFIG
      );
      if (!validationResult.isValid) {
        throw new Error(validationResult.errors.join(', '));
      }

      // Convertir a formato unificado si es necesario
      const unifiedData = this.convertToUnifiedFormat(flashcardData);

      // Procesar archivos multimedia si existen
      const processedData = await this.processMultimediaContent(unifiedData);

      // Crear flashcard en el backend
      const response = await api('/api/flashcards', {
        method: 'POST',
        body: processedData
      });

      if (response.success) {
        // Actualizar cache local
        this.updateCache(response.data);
        
        // Actualizar store
        store.dispatch('flashcard/add', response.data);
        
        // Notificar éxito
        showNotification('Flashcard creada exitosamente', 'success');
        
        return response.data;
      } else {
        throw new Error(response.error || 'Error al crear flashcard');
      }

    } catch (error) {
      console.error('Error creating flashcard:', error);
      showNotification(`Error al crear flashcard: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Crear flashcard desde formato legacy (compatibilidad)
   * @param {Object} legacyData - Datos en formato legacy
   * @returns {Promise<Object>} - Flashcard creada
   */
  async createFlashcardLegacy(legacyData) {
    const unifiedData = this.convertLegacyToUnified(legacyData);
    return this.createFlashcard(unifiedData);
  }

  // ========== MÉTODOS DE LECTURA ==========

  /**
   * Obtener flashcard por ID
   * @param {number} flashcardId - ID de la flashcard
   * @param {Object} options - Opciones de formato
   * @returns {Promise<Object>} - Datos de la flashcard
   */
  async getFlashcard(flashcardId, options = {}) {
    try {
      const {
        format = this.currentFormat,
        includeContent = true,
        useCache = true
      } = options;

      // Verificar cache primero
      if (useCache && this.cache.has(flashcardId)) {
        const cached = this.cache.get(flashcardId);
        if (Date.now() - cached.timestamp < 300000) { // 5 minutos
          return this.formatFlashcardData(cached.data, format);
        }
      }

      // Obtener del backend
      const response = await api(`/api/flashcards/${flashcardId}`, {
        method: 'GET',
        params: {
          format: 'unified', // Siempre pedimos formato unificado
          include_content: includeContent
        }
      });

      if (response.success) {
        // Actualizar cache
        this.updateCache(response.data);
        
        // Retornar en el formato solicitado
        return this.formatFlashcardData(response.data, format);
      } else {
        throw new Error(response.error || 'Flashcard no encontrada');
      }

    } catch (error) {
      console.error(`Error getting flashcard ${flashcardId}:`, error);
      throw error;
    }
  }

  /**
   * Obtener flashcards que necesitan revisión
   * @param {Object} options - Opciones de filtrado
   * @returns {Promise<Array>} - Lista de flashcards
   */
  async getDueFlashcards(options = {}) {
    try {
      const {
        deckId = null,
        limit = 20,
        format = this.currentFormat
      } = options;

      const response = await api('/api/flashcards/due', {
        method: 'GET',
        params: {
          deck_id: deckId,
          limit: limit,
          format: 'unified'
        }
      });

      if (response.success) {
        const flashcards = response.data.map(card => 
          this.formatFlashcardData(card, format)
        );
        
        // Actualizar cache para cada flashcard
        flashcards.forEach(card => this.updateCache(card));
        
        return {
          flashcards,
          total: response.total,
          limit: response.limit
        };
      } else {
        throw new Error(response.error || 'Error al obtener flashcards');
      }

    } catch (error) {
      console.error('Error getting due flashcards:', error);
      return { flashcards: [], total: 0, limit: 0 };
    }
  }

  // ========== MÉTODOS DE ACTUALIZACIÓN ==========

  /**
   * Actualizar flashcard existente
   * @param {number} flashcardId - ID de la flashcard
   * @param {Object} updateData - Datos a actualizar
   * @returns {Promise<Object>} - Flashcard actualizada
   */
  async updateFlashcard(flashcardId, updateData) {
    try {
      // Validar datos de actualización
      const validationResult = validateFlashcardDataUtil(
        updateData,
        true,
        FLASHCARD_CONFIG
      );
      if (!validationResult.isValid) {
        throw new Error(validationResult.errors.join(', '));
      }

      // Convertir a formato unificado
      const unifiedData = this.convertToUnifiedFormat(updateData);

      // Procesar multimedia si hay cambios
      const processedData = await this.processMultimediaContent(unifiedData);

      // Actualizar en el backend
      const response = await api(`/api/flashcards/${flashcardId}`, {
        method: 'PUT',
        body: processedData
      });

      if (response.success) {
        // Actualizar cache
        this.updateCache(response.data);
        
        // Actualizar store
        store.dispatch('flashcard/update', response.data);
        
        showNotification('Flashcard actualizada exitosamente', 'success');
        return response.data;
      } else {
        throw new Error(response.error || 'Error al actualizar flashcard');
      }

    } catch (error) {
      console.error(`Error updating flashcard ${flashcardId}:`, error);
      showNotification(`Error al actualizar flashcard: ${error.message}`, 'error');
      throw error;
    }
  }

  /**
   * Procesar revisión de flashcard
   * @param {number} flashcardId - ID de la flashcard
   * @param {Object} reviewData - Datos de la revisión
   * @returns {Promise<Object>} - Resultado de la revisión
   */
  async reviewFlashcard(flashcardId, reviewData) {
    try {
      const {
        rating,
        responseTime = null,
        algorithmType = null,
        sessionId = null
      } = reviewData;

      // Validar rating
      if (!rating || rating < 1 || rating > 4) {
        throw new Error('Rating debe estar entre 1 y 4');
      }

      const response = await api(`/api/flashcards/${flashcardId}/review`, {
        method: 'POST',
        body: {
          rating,
          response_time: responseTime,
          algorithm_type: algorithmType,
          session_id: sessionId
        }
      });

      if (response.success) {
        const { flashcard, review, algorithm_used, next_review } = response.data;
        
        // Actualizar cache con nueva información
        this.updateCache(flashcard);
        
        // Actualizar store
        store.dispatch('flashcard/update', flashcard);
        store.dispatch('review/add', review);
        
        // Actualizar estadísticas de sesión si existe
        if (sessionId) {
          store.dispatch('studySession/updateProgress', {
            cardReviewed: true,
            rating,
            nextReview: next_review
          });
        }

        return {
          flashcard: this.formatFlashcardData(flashcard, this.currentFormat),
          review,
          algorithmUsed: algorithm_used,
          nextReview: next_review
        };
      } else {
        throw new Error(response.error || 'Error al procesar revisión');
      }

    } catch (error) {
      console.error(`Error reviewing flashcard ${flashcardId}:`, error);
      showNotification(`Error al procesar revisión: ${error.message}`, 'error');
      throw error;
    }
  }

  // ========== MÉTODOS DE BÚSQUEDA ==========

  /**
   * Buscar flashcards
   * @param {Object} searchOptions - Opciones de búsqueda
   * @returns {Promise<Array>} - Resultados de búsqueda
   */
  async searchFlashcards(searchOptions = {}) {
    try {
      const {
        query = '',
        deckId = null,
        hasImages = null,
        difficulty = null,
        format = this.currentFormat
      } = searchOptions;

      const response = await api('/api/flashcards/search', {
        method: 'GET',
        params: {
          q: query,
          deck_id: deckId,
          has_images: hasImages,
          difficulty: difficulty,
          format: 'unified'
        }
      });

      if (response.success) {
        const flashcards = response.data.map(card => 
          this.formatFlashcardData(card, format)
        );
        
        return {
          flashcards,
          total: response.total,
          query: response.query
        };
      } else {
        throw new Error(response.error || 'Error en búsqueda');
      }

    } catch (error) {
      console.error('Error searching flashcards:', error);
      return { flashcards: [], total: 0, query: '' };
    }
  }

  // ========== MÉTODOS DE CONVERSIÓN DE FORMATO ==========

  /**
   * Convertir datos a formato unificado
   * @param {Object} data - Datos en cualquier formato
   * @returns {Object} - Datos en formato unificado
   */
  convertToUnifiedFormat(data) {
    // Si ya está en formato unificado, retornar tal como está
    if (data.front_content || data.back_content) {
      return data;
    }

    // Convertir desde formato legacy
    return this.convertLegacyToUnified(data);
  }

  /**
   * Convertir desde formato legacy a unificado
   * @param {Object} legacyData - Datos en formato legacy
   * @returns {Object} - Datos en formato unificado
   */
  convertLegacyToUnified(legacyData) {
    const unifiedData = {
      deck_id: legacyData.deck_id || legacyData.deckId,
      difficulty: legacyData.difficulty || 'normal',
      tags: legacyData.tags || [],
      notes: legacyData.notes || null
    };

    // Convertir contenido frontal
    unifiedData.front_content = {
      text: legacyData.front || legacyData.front_text || null,
      image_url: legacyData.front_image_url || legacyData.frontImage || null,
      audio_url: legacyData.front_audio_url || legacyData.frontAudio || null,
      video_url: legacyData.front_video_url || legacyData.frontVideo || null
    };

    // Convertir contenido posterior
    unifiedData.back_content = {
      text: legacyData.back || legacyData.back_text || null,
      image_url: legacyData.back_image_url || legacyData.backImage || null,
      audio_url: legacyData.back_audio_url || legacyData.backAudio || null,
      video_url: legacyData.back_video_url || legacyData.backVideo || null
    };

    // Convertir datos de algoritmo si existen
    if (legacyData.ease_factor || legacyData.interval || legacyData.stability) {
      unifiedData.algorithm_data = {
        algorithm_type: legacyData.algorithm_type || FLASHCARD_CONFIG.defaultAlgorithm,
        ease_factor: legacyData.ease_factor || legacyData.easeFactor || 2.5,
        interval: legacyData.interval || legacyData.interval_days || 1,
        repetitions: legacyData.repetitions || 0,
        stability: legacyData.stability || 1.0,
        difficulty: legacyData.difficulty_fsrs || 5.0,
        next_review: legacyData.next_review || legacyData.nextReview || null,
        last_review: legacyData.last_reviewed || legacyData.lastReview || null
      };
    }

    return unifiedData;
  }

  /**
   * Formatear datos de flashcard según el formato solicitado
   * @param {Object} unifiedData - Datos en formato unificado
   * @param {string} targetFormat - Formato objetivo ('unified' | 'legacy')
   * @returns {Object} - Datos formateados
   */
  formatFlashcardData(unifiedData, targetFormat = 'unified') {
    if (targetFormat === 'unified') {
      return unifiedData;
    }

    // Convertir a formato legacy
    const legacyData = {
      id: unifiedData.id,
      deck_id: unifiedData.deck_id,
      difficulty: unifiedData.difficulty,
      tags: unifiedData.tags,
      notes: unifiedData.notes,
      total_reviews: unifiedData.total_reviews,
      correct_reviews: unifiedData.correct_reviews,
      accuracy_rate: unifiedData.accuracy_rate,
      is_due: unifiedData.is_due,
      has_multimedia: unifiedData.has_multimedia,
      created_at: unifiedData.created_at,
      updated_at: unifiedData.updated_at
    };

    // Mapear contenido
    if (unifiedData.front_content) {
      legacyData.front = unifiedData.front_content.text;
      legacyData.front_text = unifiedData.front_content.text;
      legacyData.front_image_url = unifiedData.front_content.image_url;
      legacyData.front_audio_url = unifiedData.front_content.audio_url;
      legacyData.front_video_url = unifiedData.front_content.video_url;
    }

    if (unifiedData.back_content) {
      legacyData.back = unifiedData.back_content.text;
      legacyData.back_text = unifiedData.back_content.text;
      legacyData.back_image_url = unifiedData.back_content.image_url;
      legacyData.back_audio_url = unifiedData.back_content.audio_url;
      legacyData.back_video_url = unifiedData.back_content.video_url;
    }

    // Mapear datos de algoritmo
    if (unifiedData.algorithm_data) {
      const algData = unifiedData.algorithm_data;
      legacyData.algorithm_type = algData.algorithm_type;
      legacyData.ease_factor = algData.ease_factor;
      legacyData.easeFactor = algData.ease_factor; // Alias
      legacyData.interval = algData.interval;
      legacyData.interval_days = algData.interval;
      legacyData.repetitions = algData.repetitions;
      legacyData.stability = algData.stability;
      legacyData.difficulty_fsrs = algData.difficulty;
      legacyData.next_review = algData.next_review;
      legacyData.nextReview = algData.next_review; // Alias
      legacyData.last_reviewed = algData.last_review;
      legacyData.lastReview = algData.last_review; // Alias
    }

    return legacyData;
  }

  // ========== MÉTODOS DE MULTIMEDIA ==========

  /**
   * Procesar contenido multimedia
   * @param {Object} flashcardData - Datos de la flashcard
   * @returns {Promise<Object>} - Datos con URLs de multimedia procesadas
   */
  async processMultimediaContent(flashcardData) {
    const processedData = { ...flashcardData };

    // Procesar contenido frontal
    if (processedData.front_content) {
      processedData.front_content = await this.processContentMedia(
        processedData.front_content
      );
    }

    // Procesar contenido posterior
    if (processedData.back_content) {
      processedData.back_content = await this.processContentMedia(
        processedData.back_content
      );
    }

    return processedData;
  }

  /**
   * Procesar media de un contenido específico
   * @param {Object} content - Contenido a procesar
   * @returns {Promise<Object>} - Contenido con media procesada
   */
  async processContentMedia(content) {
    const processedContent = { ...content };

    // Procesar imagen si es un archivo
    if (content.image_file) {
      try {
        const imageUrl = await this.uploadImage(content.image_file);
        processedContent.image_url = imageUrl;
        delete processedContent.image_file;
      } catch (error) {
        console.error('Error uploading image:', error);
        showNotification('Error al subir imagen', 'error');
      }
    }

    // Procesar audio si es un archivo
    if (content.audio_file) {
      try {
        const audioUrl = await this.uploadAudio(content.audio_file);
        processedContent.audio_url = audioUrl;
        delete processedContent.audio_file;
      } catch (error) {
        console.error('Error uploading audio:', error);
        showNotification('Error al subir audio', 'error');
      }
    }

    return processedContent;
  }

  /**
   * Subir imagen al CDN
   * @param {File} imageFile - Archivo de imagen
   * @returns {Promise<string>} - URL de la imagen subida
   */
  async uploadImage(imageFile) {
    // Validar tipo de archivo
    if (!FLASHCARD_CONFIG.supportedImageTypes.includes(imageFile.type)) {
      throw new Error('Tipo de imagen no soportado');
    }

    // Validar tamaño
    if (imageFile.size > FLASHCARD_CONFIG.maxImageSize) {
      throw new Error('Imagen demasiado grande (máximo 5MB)');
    }

    // Crear FormData para upload
    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('type', 'flashcard');

    // Subir al backend
    const response = await api('/api/upload/image', {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    if (response.success) {
      return response.data.url;
    } else {
      throw new Error(response.error || 'Error al subir imagen');
    }
  }

  /**
   * Subir audio al CDN
   * @param {File} audioFile - Archivo de audio
   * @returns {Promise<string>} - URL del audio subido
   */
  async uploadAudio(audioFile) {
    // Validar tipo de archivo
    if (!FLASHCARD_CONFIG.supportedAudioTypes.includes(audioFile.type)) {
      throw new Error('Tipo de audio no soportado');
    }

    // Crear FormData para upload
    const formData = new FormData();
    formData.append('audio', audioFile);
    formData.append('type', 'flashcard');

    // Subir al backend
    const response = await api('/api/upload/audio', {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    if (response.success) {
      return response.data.url;
    } else {
      throw new Error(response.error || 'Error al subir audio');
    }
  }

  // ========== MÉTODOS DE VALIDACIÓN ==========

  /**
   * Validar datos de flashcard
   * @param {Object} data - Datos a validar
   * @param {boolean} isUpdate - Si es una actualización
   * @returns {Object} - Resultado de validación
   */
  validateFlashcardData(data, isUpdate = false) {
    return validateFlashcardDataUtil(data, isUpdate, FLASHCARD_CONFIG);
  }

  // ========== MÉTODOS DE CACHE ==========

  /**
   * Actualizar cache local
   * @param {Object} flashcardData - Datos de la flashcard
   */
  updateCache(flashcardData) {
    if (flashcardData && flashcardData.id) {
      this.cache.set(flashcardData.id, {
        data: flashcardData,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Limpiar cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Obtener estadísticas del cache
   * @returns {Object} - Estadísticas del cache
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys())
    };
  }
}

// Crear instancia singleton
const flashcardService = new FlashcardService();

// Exportar métodos principales para compatibilidad
export const {
  createFlashcard,
  createFlashcardLegacy,
  getFlashcard,
  getDueFlashcards,
  updateFlashcard,
  reviewFlashcard,
  searchFlashcards,
  convertToUnifiedFormat,
  convertLegacyToUnified,
  formatFlashcardData,
  validateFlashcardData,
  clearCache,
  getCacheStats
} = flashcardService;

// Exportar servicio completo
export default flashcardService;

// Exportar configuración para otros módulos
export { FLASHCARD_CONFIG };

