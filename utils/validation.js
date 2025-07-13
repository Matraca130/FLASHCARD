/**
 * Validación genérica de campos requeridos
 * @param {Object} data - Objeto con datos a validar
 * @param {string[]} fields - Campos requeridos
 * @returns {{isValid:boolean, errors:string[]}}
 */
export function validateRequiredFields(data, fields) {
  const errors = [];
  for (const field of fields) {
    const value = data[field];
    if (value === undefined || value === null || (typeof value === 'string' && !value.trim())) {
      errors.push(`El campo ${field} es requerido`);
    }
  }
  return { isValid: errors.length === 0, errors };
}

/**
 * Valida datos de una flashcard
 * @param {Object} data - Datos de la flashcard
 * @param {boolean} [isUpdate=false] - Si es una actualización
 * @param {Object} [config={}] - Configuración de validación
 * @returns {{isValid:boolean, errors:string[]}}
 */
export function validateFlashcardData(data, isUpdate = false, config = {}) {
  const {
    maxTextLength = 5000,
    supportedAlgorithms = ['fsrs', 'sm2', 'ultra_sm2', 'anki'],
  } = config;

  const errors = [];

  if (!isUpdate && !data.deck_id) {
    errors.push('deck_id es requerido');
  }

  const frontContent = data.front_content || {
    text: data.front || data.front_text,
    image_url: data.front_image_url,
    audio_url: data.front_audio_url,
  };

  if (!frontContent.text && !frontContent.image_url && !frontContent.audio_url) {
    errors.push('El contenido frontal debe tener al menos texto, imagen o audio');
  }

  const backContent = data.back_content || {
    text: data.back || data.back_text,
    image_url: data.back_image_url,
    audio_url: data.back_audio_url,
  };

  if (!backContent.text && !backContent.image_url && !backContent.audio_url) {
    errors.push('El contenido posterior debe tener al menos texto, imagen o audio');
  }

  if (frontContent.text && frontContent.text.length > maxTextLength) {
    errors.push(`Texto frontal demasiado largo (máximo ${maxTextLength} caracteres)`);
  }
  if (backContent.text && backContent.text.length > maxTextLength) {
    errors.push(`Texto posterior demasiado largo (máximo ${maxTextLength} caracteres)`);
  }

  if (data.difficulty && !['easy', 'normal', 'hard'].includes(data.difficulty)) {
    errors.push('Dificultad debe ser: easy, normal o hard');
  }

  if (data.algorithm_type && !supportedAlgorithms.includes(data.algorithm_type)) {
    errors.push(`Algoritmo no soportado. Opciones: ${supportedAlgorithms.join(', ')}`);
  }

  return { isValid: errors.length === 0, errors };
}
