/**
 * AppInitializer - Serviço de Inicialização da Aplicação
 * =====================================================
 * 
 * Centraliza funções de inicialização global e compatibilidade com código legacy.
 */

import { showNotification } from "../utils/helpers.js";

/**
 * Inicializa partículas com configuração melhorada
 */
export function initializeParticles(config = {}) {
  const defaultConfig = {
    particles: {
      number: { value: 50, density: { enable: true, value_area: 800 } },
      color: { value: '#ffffff' },
      shape: { type: 'circle' },
      opacity: { value: 0.1, random: true },
      size: { value: 3, random: true },
      line_linked: {
        enable: true,
        distance: 150,
        color: '#ffffff',
        opacity: 0.1,
        width: 1,
      },
      move: {
        enable: true,
        speed: 1,
        direction: 'none',
        random: false,
        straight: false,
        out_mode: 'out',
        bounce: false,
      },
    },
    interactivity: {
      detect_on: 'canvas',
      events: {
        onhover: { enable: true, mode: 'repulse' },
        onclick: { enable: true, mode: 'push' },
        resize: true,
      },
      modes: {
        grab: { distance: 400, line_linked: { opacity: 1 } },
        bubble: { distance: 400, size: 40, duration: 2, opacity: 8, speed: 3 },
        repulse: { distance: 200, duration: 0.4 },
        push: { particles_nb: 4 },
        remove: { particles_nb: 2 },
      },
    },
    retina_detect: true,
  };

  // Combinar configuração por padrão com a personalizada
  const finalConfig = { ...defaultConfig, ...config };

  if (typeof particlesJS !== 'undefined') {
    try {
      particlesJS('particles-js', finalConfig);
      console.log('✅ Partículas inicializadas exitosamente');
      return true;
    } catch (error) {
      console.error('❌ Erro inicializando partículas:', error);
      return false;
    }
  } else {
    console.log('⚠️ particlesJS não disponível');
    return false;
  }
}

/**
 * Inicialização automática de partículas com detecção inteligente
 */
export function autoInitParticles() {
  const container = document.getElementById('particles-js');

  if (!container) {
    console.log('📄 Contenedor de partículas não encontrado');
    return false;
  }

  // Detectar se o dispositivo é de baixo desempenho
  const isLowPerformance =
    navigator.hardwareConcurrency < 4 ||
    navigator.deviceMemory < 4 ||
    /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );

  // Configuração adaptativa segundo o desempenho
  const adaptiveConfig = isLowPerformance
    ? {
        particles: {
          number: { value: 25 },
          line_linked: { enable: false },
          move: { speed: 0.5 },
        },
        interactivity: {
          events: {
            onhover: { enable: false },
            onclick: { enable: false },
          },
        },
      }
    : {};

  return initializeParticles(adaptiveConfig);
}

/**
 * Função de compatibilidade para mostrar seções
 * (delegada ao sistema de navegação)
 */
export function showSection(sectionId, options = {}) {
  // Verificar se o sistema de navegação está disponível
  if (window.showSection && typeof window.showSection === 'function') {
    return window.showSection(sectionId, options);
  }

  // Fallback básico se o sistema de navegação não está disponível
  console.warn(
    '⚠️ Sistema de navegação não disponível, usando fallback básico'
  );

  const section = document.querySelector(
    `[data-section="${sectionId}"], #${sectionId}`
  );
  if (section) {
    // Ocultar todas as seções
    document.querySelectorAll('[data-section], .section').forEach((s) => {
      s.style.display = 'none';
      s.classList.remove('active');
    });

    // Mostrar a seção solicitada
    section.style.display = 'block';
    section.classList.add('active');

    showNotification(`Seção ${sectionId} mostrada`, 'info', 2000);
    return true;
  }

  showNotification(`Seção ${sectionId} não encontrada`, 'error', 3000);
  return false;
}

/**
 * Função de utilidade para lidar com erros globais
 */
export function handleGlobalError(error, context = 'Unknown') {
  console.error(`[${context}] Erro global:`, error);

  // Mostrar notificação ao usuário
  showNotification(
    `Erro em ${context}: ${error.message || 'Erro desconhecido'}`,
    'error',
    5000
  );

  // Enviar erro para serviço de logging se estiver disponível
  if (window.logError && typeof window.logError === 'function') {
    window.logError(error, context);
  }
}

/**
 * Função de utilidade para verificar conectividade
 */
export async function checkConnectivity() {
  try {
    const response = await fetch('/health', {
      method: 'HEAD',
      cache: 'no-cache',
      timeout: 5000,
    });
    return response.ok;
  } catch {
    console.log('🔌 Sem conectividade com o servidor');
    return false;
  }
}

/**
 * Função de utilidade para detectar características do dispositivo
 */
export function getDeviceInfo() {
  return {
    isMobile: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    ),
    isTablet: /iPad|Android(?!.*Mobile)/i.test(navigator.userAgent),
    isDesktop: !/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    ),
    hasTouch: 'ontouchstart' in window,
    cores: navigator.hardwareConcurrency || 1,
    memory: navigator.deviceMemory || 1,
    connection: navigator.connection?.effectiveType || 'unknown',
    online: navigator.onLine,
  };
}

/**
 * INICIALIZAÇÃO AUTOMÁTICA
 * =========================
 */

// Auto-inicializar partículas quando o DOM estiver pronto
export const tryInitParticles = () => {
  if (document.getElementById('particles-js')) {
    autoInitParticles();
  }
};

export function setupGlobalListeners() {
  if (document.readyState !== 'loading') {
    tryInitParticles();
  } else {
    document.addEventListener('DOMContentLoaded', tryInitParticles);
  }

  // Configurar tratamento de erros globais
  window.addEventListener('error', (event) => {
    handleGlobalError(event.error, 'JavaScript');
  });

  window.addEventListener('unhandledrejection', (event) => {
    handleGlobalError(event.reason, 'Promise');
  });

  // Monitorar mudanças de conectividade
  window.addEventListener('online', () => {
    showNotification('Conexão restaurada', 'success', 3000);
  });

  window.addEventListener('offline', () => {
    showNotification('Sem conexão à internet', 'warning', 5000);
  });

  console.log(
    '🔧 Funções de inicialização global configuradas.'
  );
}

// Expor funções globalmente para compatibilidade
window.initializeParticles = initializeParticles;
window.autoInitParticles = autoInitParticles;
window.showSection = showSection;
window.handleGlobalError = handleGlobalError;
window.checkConnectivity = checkConnectivity;
window.getDeviceInfo = getDeviceInfo;
window.tryInitParticles = tryInitParticles;
window.setupGlobalListeners = setupGlobalListeners;



