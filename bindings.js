/**
 * bindings.js - Sistema de bindings refactorizado
 * Maneja eventos de UI de forma centralizada y robusta
 */

import { login, logout, register } from './auth.service.js';
import { startStudySession, submitAnswer, pauseStudySession, resumeStudySession } from './study.service.js';
import { createDeck, createFlashcard } from './create.service.js';
import { deleteDeck, editDeck, exportDeck } from './manage.service.js';
import { showNotification, validateRequiredFields } from './utils/helpers.js';
import { validateLoginCredentials, validateDeckData, validateFlashcardData } from './utils/validation.js';

// Configuración del sistema de bindings
const BINDINGS_CONFIG = {
  debounceDelay: 300,
  confirmationActions: ['delete-deck', 'delete-flashcard', 'logout', 'clear-data'],
  loadingActions: ['login', 'register', 'create-deck', 'start-study', 'submit-answer'],
  preventDoubleClick: true,
  logActions: window.APP_CONFIG?.features?.debugging || false
};

// Estado del sistema de bindings
const bindingsState = {
  activeActions: new Set(),
  lastActionTime: new Map(),
  confirmationPending: new Map()
};

/**
 * Manejador principal de eventos de click
 */
document.addEventListener('click', async (e) => {
  const el = e.target.closest('[data-action]');
  if (!el) {return;}

  const action = el.dataset.action;
  
  try {
    // Prevenir doble click si está configurado
    if (BINDINGS_CONFIG.preventDoubleClick && isActionInProgress(action)) {
      console.log(`⏳ Acción ${action} ya en progreso, ignorando...`);
      return;
    }

    // Log de acción si está habilitado
    if (BINDINGS_CONFIG.logActions) {
      console.log(`🎯 Ejecutando acción: ${action}`, el.dataset);
    }

    // Marcar acción como activa
    markActionAsActive(action);

    // Manejar confirmación si es necesaria
    if (BINDINGS_CONFIG.confirmationActions.includes(action)) {
      const confirmed = await handleConfirmation(action, el);
      if (!confirmed) {
        markActionAsInactive(action);
        return;
      }
    }

    // Mostrar loading si es necesario
    if (BINDINGS_CONFIG.loadingActions.includes(action)) {
      showActionLoading(el, true);
    }

    // Ejecutar acción
    await executeAction(action, el, e);

  } catch (error) {
    console.error(`❌ Error ejecutando acción ${action}:`, error);
    showNotification(`Error: ${error.message}`, 'error', 5000);
  } finally {
    // Limpiar estado
    markActionAsInactive(action);
    
    if (BINDINGS_CONFIG.loadingActions.includes(action)) {
      showActionLoading(el, false);
    }
  }
});

/**
 * Ejecuta una acción específica
 * @param {string} action - Acción a ejecutar
 * @param {HTMLElement} el - Elemento que disparó la acción
 * @param {Event} event - Evento original
 */
async function executeAction(action, el, event) {
  switch (action) {
    // AUTENTICACIÓN
    case 'login':
      await handleLogin(el);
      break;
      
    case 'register':
      await handleRegister(el);
      break;
      
    case 'logout':
      await handleLogout(el);
      break;

    // ESTUDIO
    case 'start-study':
      await handleStartStudy(el);
      break;
      
    case 'pause-study':
      await handlePauseStudy(el);
      break;
      
    case 'resume-study':
      await handleResumeStudy(el);
      break;
      
    case 'submit-answer':
      await handleSubmitAnswer(el);
      break;

    // CREACIÓN
    case 'create-deck':
      await handleCreateDeck(el);
      break;
      
    case 'create-flashcard':
      await handleCreateFlashcard(el);
      break;

    // GESTIÓN
    case 'edit-deck':
      await handleEditDeck(el);
      break;
      
    case 'delete-deck':
      await handleDeleteDeck(el);
      break;
      
    case 'export-deck':
      await handleExportDeck(el);
      break;

    // NAVEGACIÓN
    case 'navigate':
      await handleNavigate(el);
      break;

    // CONFIGURACIÓN
    case 'toggle-theme':
      await handleToggleTheme(el);
      break;
      
    case 'save-settings':
      await handleSaveSettings(el);
      break;

    // UTILIDADES
    case 'copy-to-clipboard':
      await handleCopyToClipboard(el);
      break;
      
    case 'download-file':
      await handleDownloadFile(el);
      break;

    default:
      console.warn(`⚠️ Acción no reconocida: ${action}`);
      showNotification(`Acción "${action}" no implementada`, 'warning', 3000);
  }
}

// MANEJADORES DE AUTENTICACIÓN

/**
 * Maneja el login de usuario
 */
async function handleLogin(el) {
  const form = getFormFromElement(el, 'login-form');
  if (!form) {return;}

  const email = form.querySelector('input[name="email"]')?.value?.trim();
  const password = form.querySelector('input[name="password"]')?.value?.trim();

  // Validar campos
  if (!validateLoginCredentials(email, password)) {
    return;
  }

  // Ejecutar login
  const result = await login(email, password);
  
  if (result && !result.error) {
    showNotification('Sesión iniciada exitosamente', 'success', 3000);
    
    // Limpiar formulario
    form.reset();
    
    // Redirigir si hay URL de retorno
    const returnUrl = new URLSearchParams(window.location.search).get('return');
    if (returnUrl) {
      window.navigate(returnUrl);
    }
  }
}

/**
 * Maneja el registro de usuario
 */
async function handleRegister(el) {
  const form = getFormFromElement(el, 'register-form');
  if (!form) {return;}

  const email = form.querySelector('input[name="email"]')?.value?.trim();
  const password = form.querySelector('input[name="password"]')?.value?.trim();
  const confirmPassword = form.querySelector('input[name="confirm-password"]')?.value?.trim();
  const name = form.querySelector('input[name="name"]')?.value?.trim();

  // Validar campos
  if (!validateRequiredFields({ email, password, confirmPassword, name })) {
    return;
  }

  if (password !== confirmPassword) {
    showNotification('Las contraseñas no coinciden', 'error', 4000);
    return;
  }

  // Ejecutar registro
  const result = await register(email, password, name);
  
  if (result && !result.error) {
    showNotification('Cuenta creada exitosamente', 'success', 4000);
    form.reset();
  }
}

/**
 * Maneja el logout de usuario
 */
async function handleLogout(el) {
  await logout();
  showNotification('Sesión cerrada', 'info', 3000);
}

// MANEJADORES DE ESTUDIO

/**
 * Maneja el inicio de sesión de estudio
 */
async function handleStartStudy(el) {
  const deckId = el.dataset.id || el.dataset.deckId;
  
  if (!deckId) {
    showNotification('ID de deck no especificado', 'error', 3000);
    return;
  }

  const result = await startStudySession(deckId);
  
  if (result && !result.error) {
    showNotification('Sesión de estudio iniciada', 'success', 3000);
  }
}

/**
 * Maneja la pausa de sesión de estudio
 */
async function handlePauseStudy(el) {
  const result = await pauseStudySession();
  
  if (result && !result.error) {
    showNotification('Sesión pausada', 'info', 2000);
  }
}

/**
 * Maneja la reanudación de sesión de estudio
 */
async function handleResumeStudy(el) {
  const result = await resumeStudySession();
  
  if (result && !result.error) {
    showNotification('Sesión reanudada', 'success', 2000);
  }
}

/**
 * Maneja el envío de respuesta
 */
async function handleSubmitAnswer(el) {
  const isCorrect = el.dataset.correct === 'true';
  const difficulty = el.dataset.difficulty || 'normal';
  
  const result = await submitAnswer(isCorrect, difficulty);
  
  if (result && !result.error) {
    const message = isCorrect ? '¡Correcto!' : 'Incorrecto';
    const type = isCorrect ? 'success' : 'error';
    showNotification(message, type, 2000);
  }
}

// MANEJADORES DE CREACIÓN

/**
 * Maneja la creación de deck
 */
async function handleCreateDeck(el) {
  const form = getFormFromElement(el, 'create-deck-form');
  if (!form) {return;}

  const name = form.querySelector('#deck-name')?.value?.trim();
  const description = form.querySelector('#deck-description')?.value?.trim();
  const isPublic = form.querySelector('#deck-public')?.checked || false;
  const category = form.querySelector('#deck-category')?.value?.trim();

  // Validar datos
  if (!validateDeckData(name, description)) {
    return;
  }

  // Ejecutar creación
  const result = await createDeck({ name, description, isPublic, category });
  
  if (result && !result.error) {
    showNotification('Deck creado exitosamente', 'success', 4000);
    form.reset();
  }
}

/**
 * Maneja la creación de flashcard
 */
async function handleCreateFlashcard(el) {
  const form = getFormFromElement(el, 'create-flashcard-form');
  if (!form) {return;}

  const deckId = form.querySelector('#flashcard-deck-id')?.value;
  const front = form.querySelector('#flashcard-front')?.value?.trim();
  const back = form.querySelector('#flashcard-back')?.value?.trim();
  const difficulty = form.querySelector('#flashcard-difficulty')?.value || 'normal';

  // Validar datos
  if (!validateFlashcardData(deckId, front, back)) {
    return;
  }

  // Ejecutar creación
  const result = await createFlashcard({ deckId, front, back, difficulty });
  
  if (result && !result.error) {
    showNotification('Flashcard creada exitosamente', 'success', 3000);
    
    // Limpiar solo los campos de contenido
    form.querySelector('#flashcard-front').value = '';
    form.querySelector('#flashcard-back').value = '';
  }
}

// MANEJADORES DE GESTIÓN

/**
 * Maneja la edición de deck
 */
async function handleEditDeck(el) {
  const deckId = el.dataset.id || el.dataset.deckId;
  
  if (!deckId) {
    showNotification('ID de deck no especificado', 'error', 3000);
    return;
  }

  // Obtener datos del formulario de edición
  const form = document.querySelector(`#edit-deck-form-${deckId}`);
  if (!form) {
    showNotification('Formulario de edición no encontrado', 'error', 3000);
    return;
  }

  const name = form.querySelector('[name="name"]')?.value?.trim();
  const description = form.querySelector('[name="description"]')?.value?.trim();
  const isPublic = form.querySelector('[name="isPublic"]')?.checked || false;

  // Validar datos
  if (!validateDeckData(name, description)) {
    return;
  }

  // Ejecutar edición
  const result = await editDeck(deckId, { name, description, isPublic });
  
  if (result && !result.error) {
    showNotification('Deck actualizado exitosamente', 'success', 3000);
  }
}

/**
 * Maneja la eliminación de deck
 */
async function handleDeleteDeck(el) {
  const deckId = el.dataset.id || el.dataset.deckId;
  
  if (!deckId) {
    showNotification('ID de deck no especificado', 'error', 3000);
    return;
  }

  // Ejecutar eliminación
  const result = await deleteDeck(deckId);
  
  if (result && !result.error) {
    showNotification('Deck eliminado exitosamente', 'success', 3000);
  }
}

/**
 * Maneja la exportación de deck
 */
async function handleExportDeck(el) {
  const deckId = el.dataset.id || el.dataset.deckId;
  const format = el.dataset.format || 'json';
  
  if (!deckId) {
    showNotification('ID de deck no especificado', 'error', 3000);
    return;
  }

  // Ejecutar exportación
  const result = await exportDeck(deckId, format);
  
  if (result && !result.error) {
    showNotification(`Deck exportado en formato ${format.toUpperCase()}`, 'success', 3000);
  }
}

// MANEJADORES DE NAVEGACIÓN

/**
 * Maneja la navegación
 */
async function handleNavigate(el) {
  const target = el.dataset.target || el.dataset.section;
  
  if (!target) {
    console.warn('⚠️ Target de navegación no especificado');
    return;
  }

  // Usar el router global
  if (window.navigate) {
    window.navigate(target);
  } else {
    console.error('❌ Router no disponible');
  }
}

// MANEJADORES DE CONFIGURACIÓN

/**
 * Maneja el cambio de tema
 */
async function handleToggleTheme(el) {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  
  showNotification(`Tema ${newTheme === 'dark' ? 'oscuro' : 'claro'} activado`, 'info', 2000);
  
  // Actualizar gráficas si están disponibles
  if (window.updateChartsTheme) {
    window.updateChartsTheme(newTheme);
  }
}

/**
 * Maneja el guardado de configuración
 */
async function handleSaveSettings(el) {
  const form = getFormFromElement(el, 'settings-form');
  if (!form) {return;}

  const formData = new FormData(form);
  const settings = Object.fromEntries(formData.entries());
  
  // Guardar en localStorage
  localStorage.setItem('userSettings', JSON.stringify(settings));
  
  showNotification('Configuración guardada', 'success', 3000);
}

// MANEJADORES DE UTILIDADES

/**
 * Maneja copiar al portapapeles
 */
async function handleCopyToClipboard(el) {
  const text = el.dataset.text || el.textContent;
  
  try {
    await navigator.clipboard.writeText(text);
    showNotification('Copiado al portapapeles', 'success', 2000);
  } catch (error) {
    console.error('Error copiando al portapapeles:', error);
    showNotification('Error copiando al portapapeles', 'error', 3000);
  }
}

/**
 * Maneja la descarga de archivos
 */
async function handleDownloadFile(el) {
  const url = el.dataset.url;
  const filename = el.dataset.filename || 'download';
  
  if (!url) {
    showNotification('URL de descarga no especificada', 'error', 3000);
    return;
  }

  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    
    showNotification('Descarga iniciada', 'success', 2000);
  } catch (error) {
    console.error('Error iniciando descarga:', error);
    showNotification('Error iniciando descarga', 'error', 3000);
  }
}

// FUNCIONES DE UTILIDAD

/**
 * Obtiene el formulario asociado a un elemento
 */
function getFormFromElement(el, defaultFormId) {
  // Buscar formulario padre
  let form = el.closest('form');
  
  // Si no hay formulario padre, buscar por ID
  if (!form && defaultFormId) {
    form = document.getElementById(defaultFormId);
  }
  
  // Si aún no hay formulario, buscar por data-form
  if (!form && el.dataset.form) {
    form = document.getElementById(el.dataset.form);
  }
  
  if (!form) {
    console.warn('⚠️ Formulario no encontrado para elemento:', el);
    showNotification('Formulario no encontrado', 'error', 3000);
  }
  
  return form;
}

/**
 * Verifica si una acción está en progreso
 */
function isActionInProgress(action) {
  return bindingsState.activeActions.has(action);
}

/**
 * Marca una acción como activa
 */
function markActionAsActive(action) {
  bindingsState.activeActions.add(action);
  bindingsState.lastActionTime.set(action, Date.now());
}

/**
 * Marca una acción como inactiva
 */
function markActionAsInactive(action) {
  bindingsState.activeActions.delete(action);
}

/**
 * Maneja confirmación de acciones peligrosas
 */
async function handleConfirmation(action, el) {
  const confirmationKey = `${action}-${el.dataset.id || Date.now()}`;
  
  // Si ya hay confirmación pendiente, ejecutar
  if (bindingsState.confirmationPending.has(confirmationKey)) {
    bindingsState.confirmationPending.delete(confirmationKey);
    return true;
  }
  
  // Solicitar confirmación
  const confirmMessage = getConfirmationMessage(action);
  const confirmed = confirm(confirmMessage);
  
  if (confirmed) {
    // Marcar confirmación como pendiente por un breve momento
    bindingsState.confirmationPending.set(confirmationKey, true);
    setTimeout(() => {
      bindingsState.confirmationPending.delete(confirmationKey);
    }, 1000);
  }
  
  return confirmed;
}

/**
 * Obtiene mensaje de confirmación para una acción
 */
function getConfirmationMessage(action) {
  const messages = {
    'delete-deck': '¿Estás seguro de que quieres eliminar este deck? Esta acción no se puede deshacer.',
    'delete-flashcard': '¿Estás seguro de que quieres eliminar esta flashcard?',
    'logout': '¿Estás seguro de que quieres cerrar sesión?',
    'clear-data': '¿Estás seguro de que quieres borrar todos los datos? Esta acción no se puede deshacer.'
  };
  
  return messages[action] || '¿Estás seguro de que quieres realizar esta acción?';
}

/**
 * Muestra/oculta indicador de loading en un elemento
 */
function showActionLoading(el, show) {
  if (show) {
    el.classList.add('loading');
    el.disabled = true;
    
    // Guardar texto original
    if (!el.dataset.originalText) {
      el.dataset.originalText = el.textContent;
    }
    
    el.textContent = 'Cargando...';
  } else {
    el.classList.remove('loading');
    el.disabled = false;
    
    // Restaurar texto original
    if (el.dataset.originalText) {
      el.textContent = el.dataset.originalText;
    }
  }
}

/**
 * Obtiene el estado actual del sistema de bindings
 */
export function getBindingsState() {
  return {
    ...bindingsState,
    config: BINDINGS_CONFIG
  };
}

/**
 * Configura el sistema de bindings
 */
export function configureBindings(config = {}) {
  Object.assign(BINDINGS_CONFIG, config);
  console.log('⚙️ Bindings reconfigurados:', BINDINGS_CONFIG);
}

// Exponer para depuración
if (window.APP_CONFIG?.features?.debugging) {
  window.Bindings = {
    getBindingsState,
    configureBindings,
    state: bindingsState,
    config: BINDINGS_CONFIG
  };
}

console.log('🔗 Sistema de bindings inicializado');

