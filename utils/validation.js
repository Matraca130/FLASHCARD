/**
 * Utilidades de Validación Comunes
 * Elimina duplicación de validaciones en toda la aplicación
 */

import { showNotification } from './helpers.js';

/**
 * Valida que todos los campos requeridos estén completos
 * @param {Object} fields - Objeto con los campos a validar
 * @param {string} customMessage - Mensaje personalizado (opcional)
 * @returns {boolean} - true si todos los campos son válidos
 */
export function validateRequiredFields(fields, customMessage = 'Por favor, completa todos los campos') {
  const emptyFields = Object.entries(fields).filter(([key, value]) => {
    return !value || (typeof value === 'string' && value.trim() === '');
  });

  if (emptyFields.length > 0) {
    showNotification(customMessage, 'error');
    return false;
  }
  
  return true;
}

/**
 * Valida credenciales de login
 * @param {string} email - Email del usuario
 * @param {string} password - Contraseña del usuario
 * @returns {boolean} - true si las credenciales son válidas
 */
export function validateLoginCredentials(email, password) {
  return validateRequiredFields(
    { email, password },
    'Por favor, ingresa email y contraseña'
  );
}

/**
 * Valida datos de flashcard
 * @param {string} deckId - ID del deck
 * @param {string} front - Texto del frente
 * @param {string} back - Texto del reverso
 * @returns {boolean} - true si los datos son válidos
 */
export function validateFlashcardData(deckId, front, back) {
  return validateRequiredFields(
    { deckId, front, back },
    'Por favor, completa todos los campos de la flashcard'
  );
}

/**
 * Valida datos de deck
 * @param {string} name - Nombre del deck
 * @param {string} description - Descripción del deck (opcional)
 * @returns {boolean} - true si los datos son válidos
 */
export function validateDeckData(name, description = '') {
  if (!name || name.trim() === '') {
    showNotification('El nombre del deck es requerido', 'error');
    return false;
  }
  
  if (name.length < 3) {
    showNotification('El nombre del deck debe tener al menos 3 caracteres', 'error');
    return false;
  }
  
  if (name.length > 50) {
    showNotification('El nombre del deck no puede exceder 50 caracteres', 'error');
    return false;
  }
  
  return true;
}

/**
 * Valida formato de email
 * @param {string} email - Email a validar
 * @returns {boolean} - true si el email es válido
 */
export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!email || !emailRegex.test(email)) {
    showNotification('Por favor, ingresa un email válido', 'error');
    return false;
  }
  
  return true;
}

/**
 * Valida fortaleza de contraseña
 * @param {string} password - Contraseña a validar
 * @returns {boolean} - true si la contraseña es válida
 */
export function validatePassword(password) {
  if (!password || password.length < 6) {
    showNotification('La contraseña debe tener al menos 6 caracteres', 'error');
    return false;
  }
  
  return true;
}

/**
 * Valida datos de registro
 * @param {string} email - Email del usuario
 * @param {string} password - Contraseña del usuario
 * @param {string} confirmPassword - Confirmación de contraseña
 * @returns {boolean} - true si todos los datos son válidos
 */
export function validateRegistrationData(email, password, confirmPassword) {
  if (!validateRequiredFields({ email, password, confirmPassword })) {
    return false;
  }
  
  if (!validateEmail(email)) {
    return false;
  }
  
  if (!validatePassword(password)) {
    return false;
  }
  
  if (password !== confirmPassword) {
    showNotification('Las contraseñas no coinciden', 'error');
    return false;
  }
  
  return true;
}

