/**
 * Utilitários melhorados para StudyingFlash
 * Versão 2.0 - Funções auxiliares com melhor tratamento de erros e compatibilidade
 */

// Configuração de notificações
const NOTIFICATION_CONFIG = {
  duration: 4000,
  position: 'top-right',
  maxNotifications: 3,
  animations: true
};

// Cache para notificações recentes para evitar duplicatas
const recentNotifications = [];

/**
 * Mostra uma notificação na interface
 * @param {string} message - Mensagem a ser exibida
 * @param {string} type - Tipo de notificação ('success', 'error', 'warning', 'info')
 * @param {number} duration - Duração em ms (opcional)
 */
export function showNotification(message, type = 'info', duration = NOTIFICATION_CONFIG.duration) {
  // Verificar se é uma mensagem duplicada recente
  const isDuplicate = recentNotifications.some(n => 
    n.message === message && n.type === type && 
    (Date.now() - n.timestamp) < 5000
  );
  
  if (isDuplicate) {
    console.log('🔔 Notificação duplicada ignorada:', message);
    return;
  }
  
  // Registrar notificação recente
  recentNotifications.push({
    message,
    type,
    timestamp: Date.now()
  });
  
  // Limitar tamanho do array de notificações recentes
  if (recentNotifications.length > 10) {
    recentNotifications.shift();
  }
  
  // Verificar se já existe um container de notificações
  let notificationContainer = document.getElementById('notification-container');
  
  if (!notificationContainer) {
    // Criar container de notificações
    notificationContainer = document.createElement('div');
    notificationContainer.id = 'notification-container';
    notificationContainer.className = 'notification-container';
    document.body.appendChild(notificationContainer);
    
    // Adicionar estilos se não existirem
    if (!document.getElementById('notification-styles'){ ) {
      const styleElement = document.createElement('style'); }
      styleElement.id = 'notification-styles';
      styleElement.textContent = `
        .notification-container {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-width: 350px;
        }
        
        .notification {
          padding: 12px 16px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          line-height: 1.5;
          color: white;
          opacity: 0;
          transform: translateX(30px);
          transition: all 0.3s ease;
        }
        
        .notification.show {
          opacity: 1;
          transform: translateX(0);
        }
        
        .notification.hide {
          opacity: 0;
          transform: translateX(30px);
        }
        
        .notification-success {
          background: linear-gradient(135deg, #10b981, #059669);
        }
        
        .notification-error {
          background: linear-gradient(135deg, #ef4444, #dc2626);
        }
        
        .notification-warning {
          background: linear-gradient(135deg, #f59e0b, #d97706);
        }
        
        .notification-info {
          background: linear-gradient(135deg, #3b82f6, #2563eb);
        }
        
        .notification-content {
          flex: 1;
          margin-right: 10px;
        }
        
        .notification-close {
          background: none;
          border: none;
          color: white;
          font-size: 18px;
          cursor: pointer;
          opacity: 0.7;
          transition: opacity 0.2s;
          padding: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .notification-close:hover {
          opacity: 1;
        }
        
        @media (max-width: 768px) {
          .notification-container {
            top: auto;
            bottom: 20px;
            left: 20px;
            right: 20px;
            max-width: none;
          }
          
          .notification {
            width: 100%;
          }
        }
      `;
      document.head.appendChild(styleElement);
    }
  }
  
  // Limitar número de notificações visíveis
  const visibleNotifications = notificationContainer.querySelectorAll('.notification');
  if (visibleNotifications.length >= NOTIFICATION_CONFIG.maxNotifications) {
    // Remover a notificação mais antiga
    const oldestNotification = visibleNotifications[0];
    oldestNotification.classList.add('hide');
    setTimeout(() => {
      if (oldestNotification.parentNode === notificationContainer) {
        notificationContainer.removeChild(oldestNotification);
      }
    }, 300);
  }
  
  // Criar elemento de notificação
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  
  // Conteúdo da notificação
  notification.innerHTML = `
    <div class="notification-content">${message}</div>
    <button class="notification-close">&times;</button>
  `;
  
  // Adicionar ao container
  notificationContainer.appendChild(notification);
  
  // Animar entrada
  if (NOTIFICATION_CONFIG.animations) {
    setTimeout(() => {
      notification.classList.add('show');
    }, 10);
  } else {
    notification.classList.add('show');
  }
  
  // Configurar botão de fechar
  const closeButton = notification.querySelector('.notification-close');
  closeButton.addEventListener('click', () => {
    closeNotification(notification);
  });
  
  // Auto-fechar após duração
  const timeoutId = setTimeout(() => {
    closeNotification(notification);
  }, duration);
  
  // Pausar timeout ao passar o mouse
  notification.addEventListener('mouseenter', () => {
    clearTimeout(timeoutId);
  });
  
  // Retomar timeout ao remover o mouse
  notification.addEventListener('mouseleave', () => {
    const newTimeoutId = setTimeout(() => {
      closeNotification(notification);
    }, duration / 2);
    notification._timeoutId = newTimeoutId;
  });
  
  // Armazenar timeout ID para cancelamento
  notification._timeoutId = timeoutId;
  
  return notification;
}

/**
 * Fecha uma notificação com animação
 * @param {HTMLElement} notification - Elemento de notificação
 */
function closeNotification(notification) {
  // Limpar timeout se existir
  if (notification._timeoutId) {
    clearTimeout(notification._timeoutId);
  }
  
  // Animar saída
  notification.classList.remove('show');
  notification.classList.add('hide');
  
  // Remover do DOM após animação
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 300);
}

/**
 * Formata uma data relativa (ex: "há 2 dias")
 * @param {string|Date} date - Data a ser formatada
 * @returns {string} - Data formatada
 */
export function formatRelativeDate(date) {
  if (!date) { return 'Nunca'; }
  
  try {
    const inputDate = date instanceof Date ? date : new Date(date);
    
    // Verificar se a data é válida
    if (isNaN(inputDate.getTime(){ )) {
      return 'Data inválida'; }
    }
    
    const now = new Date();
    const diffTime = Math.abs(now - inputDate);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    
    // Detectar idioma do navegador
    const language = navigator.language || 'pt-BR';
    const isPortuguese = language.startsWith('pt');
    const isSpanish = language.startsWith('es');
    
    // Formatação baseada no idioma
    if (diffMinutes < 1) {
      return isPortuguese ? 'Agora mesmo' : isSpanish ? 'Ahora mismo' : 'Just now';
    }
    
    if (diffMinutes < 60) {
      return isPortuguese ? `Há ${diffMinutes} minuto${diffMinutes !== 1 ? 's' : ''}` :
        isSpanish ? `Hace ${diffMinutes} minuto${diffMinutes !== 1 ? 's' : ''}` :
        `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
    }
    
    if (diffHours < 24) {
      return isPortuguese ? `Há ${diffHours} hora${diffHours !== 1 ? 's' : ''}` :
        isSpanish ? `Hace ${diffHours} hora${diffHours !== 1 ? 's' : ''}` :
        `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    }
    
    if (diffDays === 0) {
      return isPortuguese ? 'Hoje' : isSpanish ? 'Hoy' : 'Today';
    }
    
    if (diffDays === 1) {
      return isPortuguese ? 'Ontem' : isSpanish ? 'Ayer' : 'Yesterday';
    }
    
    if (diffDays < 7) {
      return isPortuguese ? `Há ${diffDays} dia${diffDays !== 1 ? 's' : ''}` :
        isSpanish ? `Hace ${diffDays} día${diffDays !== 1 ? 's' : ''}` :
        `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    }
    
    if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return isPortuguese ? `Há ${weeks} semana${weeks !== 1 ? 's' : ''}` :
        isSpanish ? `Hace ${weeks} semana${weeks !== 1 ? 's' : ''}` :
        `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
    }
    
    if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return isPortuguese ? `Há ${months} mês${months !== 1 ? 'es' : ''}` :
        isSpanish ? `Hace ${months} mes${months !== 1 ? 'es' : ''}` :
        `${months} month${months !== 1 ? 's' : ''} ago`;
    }
    
    // Para datas mais antigas, usar formato local
    return inputDate.toLocaleDateString(language);
  } catch (error) {
    console.warn('Erro ao formatar data relativa:', error);
    return 'Data inválida';
  }
}

/**
 * Formata uma data no formato local
 * @param {string|Date} date - Data a ser formatada
 * @param {Object} options - Opções de formatação
 * @returns {string} - Data formatada
 */
export function formatDate(date, options = {}) {
  if (!date) { return ''; }
  
  try {
    const inputDate = date instanceof Date ? date : new Date(date);
    
    // Verificar se a data é válida
    if (isNaN(inputDate.getTime(){ )) {
      return 'Data inválida'; }
    }
    
    // Opções padrão
    const defaultOptions = {
      dateStyle: 'medium',
      timeStyle: options.includeTime ? 'short' : undefined
    };
    
    // Mesclar opções
    const formatOptions = { ...defaultOptions, ...options };
    
    // Detectar idioma do navegador
    const language = navigator.language || 'pt-BR';
    
    return new Intl.DateTimeFormat(language, formatOptions).format(inputDate);
  } catch (error) {
    console.warn('Erro ao formatar data:', error);
    return 'Data inválida';
  }
}

/**
 * Renderiza um estado vazio para listas
 * @param {HTMLElement} container - Container onde renderizar
 * @param {Object} options - Opções de personalização
 */
export function renderEmptyState(container, options = {}) {
  if (!container) { return; }
  
  const {
    icon = '📋',
    title = 'Nenhum item encontrado',
    message = 'Não há itens para exibir no momento.',
    actionText = 'Criar Novo',
    actionFn = null,
    customClass = ''
  } = options;
  
  const emptyStateHTML = `
    <div class="empty-state ${customClass}">
      <div class="empty-icon">${icon}</div>
      <h3>${title}</h3>
      <p>${message}</p>
      ${actionFn ? `<button class="btn btn-primary empty-action">${actionText}</button>` : ''}
    </div>
  `;
  
  container.innerHTML = emptyStateHTML;
  
  // Adicionar evento ao botão se houver função
  if (actionFn) {
    const actionButton = container.querySelector('.empty-action');
    if (actionButton) {
      actionButton.addEventListener('click', actionFn);
    }
  }
}

/**
 * Renderiza um estado vazio específico para decks
 * @param {HTMLElement} container - Container onde renderizar
 */
export function renderEmptyDecksState(container) {
  renderEmptyState(container, {
    icon: '📚',
    title: 'Nenhum deck encontrado',
    message: 'Crie seu primeiro deck para começar a estudar!',
    actionText: 'Criar Primeiro Deck',
    actionFn: () => {
      // Verificar se a função global existe
      if (typeof showSection === 'function') {
        showSection('crear');
      } else {
        // Fallback: tentar navegar diretamente
        const crearLink = document.querySelector('a[data-section="crear"]');
        if (crearLink) {
          crearLink.click();
        }
      }
    }
  });
}

/**
 * Sanitiza HTML para prevenir XSS
 * @param {string} html - HTML a ser sanitizado
 * @returns {string} - HTML sanitizado
 */
export function sanitizeHTML(html) {
  if (!html) { return ''; }
  
  const element = document.createElement('div');
  element.textContent = html;
  return element.innerHTML;
}

/**
 * Copia texto para a área de transferência
 * @param {string} text - Texto a ser copiado
 * @returns {Promise<boolean>} - Se a cópia foi bem-sucedida
 */
export async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      showNotification('Texto copiado para a área de transferência', 'success');
      return true;
    } else {
      // Fallback para navegadores mais antigos
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const success = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (success) {
        showNotification('Texto copiado para a área de transferência', 'success');
        return true;
      } else {
        showNotification('Não foi possível copiar o texto', 'error');
        return false;
      }
    }
  } catch (error) {
    console.error('Erro ao copiar para área de transferência:', error);
    showNotification('Erro ao copiar texto', 'error');
    return false;
  }
}

/**
 * Gera um ID único
 * @returns {string} - ID único
 */
export function generateUniqueId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

/**
 * Debounce para limitar a frequência de chamadas de função
 * @param {Function} fn - Função a ser executada
 * @param {number} delay - Atraso em ms
 * @returns {Function} - Função com debounce
 */
export function debounce(fn, delay = 300) {
  let timeoutId;
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}

/**
 * Throttle para limitar a frequência de chamadas de função
 * @param {Function} fn - Função a ser executada
 * @param {number} limit - Limite em ms
 * @returns {Function} - Função com throttle
 */
export function throttle(fn, limit = 300) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * Detecta o tema do sistema (claro/escuro)
 * @returns {string} - 'dark' ou 'light'
 */
export function detectSystemTheme() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

/**
 * Verifica se o dispositivo é móvel
 * @returns {boolean} - Se é dispositivo móvel
 */
export function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
    (window.innerWidth <= 768);
}

/**
 * Download de arquivo
 * @param {string} content - Conteúdo do arquivo
 * @param {string} filename - Nome do arquivo
 * @param {string} mimeType - Tipo MIME do arquivo
 */
export function downloadFile(content, filename, mimeType = 'text/plain') {
  try {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = sanitizeFilename(filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showNotification('Arquivo baixado com sucesso!', 'success');
  } catch (error) {
    console.error('Erro ao baixar arquivo:', error);
    showNotification('Erro ao baixar arquivo', 'error');
  }
}

/**
 * Sanitiza nome de arquivo removendo caracteres inválidos
 * @param {string} filename - Nome do arquivo
 * @returns {string} - Nome sanitizado
 */
export function sanitizeFilename(filename) {
  return filename.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_');
}

/**
 * Parse de CSV simples
 * @param {string} csvText - Texto CSV
 * @returns {Array} - Array de objetos
 */
export function parseCSV(csvText) {
  const lines = csvText.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim());
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim());
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = values[index] || '';
    });
    return obj;
  });
}

/**
 * Formata tamanho de arquivo
 * @param {number} bytes - Tamanho em bytes
 * @returns {string} - Tamanho formatado
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Valida email
 * @param {string} email - Email para validar
 * @returns {boolean} - Se é válido
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Valida senha
 * @param {string} password - Senha para validar
 * @returns {boolean} - Se é válida
 */
export function isValidPassword(password) {
  return password && password.length >= 6;
}

/**
 * Capitaliza primeira letra
 * @param {string} str - String para capitalizar
 * @returns {string} - String capitalizada
 */
export function capitalizeFirst(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Formata data no formato DD/MM/YYYY
 * @param {Date|string} date - Data para formatar
 * @returns {string} - Data formatada
 */
export function formatDateDDMMYYYY(date) {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  
  return `${day}/${month}/${year}`;
}

// Exportar todas as funções
export default {
  showNotification,
  formatRelativeDate,
  formatDate,
  renderEmptyState,
  renderEmptyDecksState,
  sanitizeHTML,
  copyToClipboard,
  generateUniqueId,
  debounce,
  throttle,
  detectSystemTheme,
  isMobileDevice,
  downloadFile,
  sanitizeFilename,
  parseCSV,
  formatFileSize,
  isValidEmail,
  isValidPassword,
  capitalizeFirst,
  formatDateDDMMYYYY
};

