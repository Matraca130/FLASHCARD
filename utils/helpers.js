// utils/helpers.js - Funciones de utilidad
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export function formatDate(date) {
  return new Date(date).toLocaleDateString('es-ES');
}

export function formatTime(date) {
  return new Date(date).toLocaleTimeString('es-ES');
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function sanitizeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export function showNotification(message, type = 'info') {
  console.log(`[${type.toUpperCase()}] ${message}`);
  // En una implementación real, esto mostraría una notificación visual
}

export default {
  debounce,
  formatDate,
  formatTime,
  generateId,
  sanitizeHtml,
  showNotification
};

