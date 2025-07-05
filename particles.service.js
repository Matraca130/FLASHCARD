import { showNotification } from './utils/helpers.js';

/**
 * Servicio de efectos de partículas refactorizado
 * Maneja efectos visuales de fondo y animaciones
 */

// Configuración de partículas
const PARTICLES_CONFIG = {
  default: {
    particles: {
      number: {
        value: 50,
        density: {
          enable: true,
          value_area: 800,
        },
      },
      color: {
        value: '#ffffff',
      },
      shape: {
        type: 'circle',
        stroke: {
          width: 0,
          color: '#000000',
        },
      },
      opacity: {
        value: 0.1,
        random: true,
        anim: {
          enable: true,
          speed: 1,
          opacity_min: 0.05,
          sync: false,
        },
      },
      size: {
        value: 3,
        random: true,
        anim: {
          enable: true,
          speed: 2,
          size_min: 0.5,
          sync: false,
        },
      },
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
        attract: {
          enable: false,
          rotateX: 600,
          rotateY: 1200,
        },
      },
    },
    interactivity: {
      detect_on: 'canvas',
      events: {
        onhover: {
          enable: true,
          mode: 'repulse',
        },
        onclick: {
          enable: true,
          mode: 'push',
        },
        resize: true,
      },
      modes: {
        grab: {
          distance: 140,
          line_linked: {
            opacity: 1,
          },
        },
        bubble: {
          distance: 400,
          size: 40,
          duration: 2,
          opacity: 8,
          speed: 3,
        },
        repulse: {
          distance: 100,
          duration: 0.4,
        },
        push: {
          particles_nb: 4,
        },
        remove: {
          particles_nb: 2,
        },
      },
    },
    retina_detect: true,
  },

  minimal: {
    particles: {
      number: {
        value: 20,
        density: {
          enable: true,
          value_area: 1000,
        },
      },
      color: {
        value: '#ffffff',
      },
      shape: {
        type: 'circle',
      },
      opacity: {
        value: 0.05,
        random: true,
      },
      size: {
        value: 2,
        random: true,
      },
      line_linked: {
        enable: false,
      },
      move: {
        enable: true,
        speed: 0.5,
        direction: 'none',
        random: true,
        straight: false,
        out_mode: 'out',
        bounce: false,
      },
    },
    interactivity: {
      detect_on: 'canvas',
      events: {
        onhover: {
          enable: false,
        },
        onclick: {
          enable: false,
        },
        resize: true,
      },
    },
    retina_detect: true,
  },

  intense: {
    particles: {
      number: {
        value: 100,
        density: {
          enable: true,
          value_area: 600,
        },
      },
      color: {
        value: ['#ffffff', '#f0f0f0', '#e0e0e0'],
      },
      shape: {
        type: ['circle', 'triangle'],
        stroke: {
          width: 0,
          color: '#000000',
        },
      },
      opacity: {
        value: 0.15,
        random: true,
        anim: {
          enable: true,
          speed: 2,
          opacity_min: 0.05,
          sync: false,
        },
      },
      size: {
        value: 4,
        random: true,
        anim: {
          enable: true,
          speed: 3,
          size_min: 1,
          sync: false,
        },
      },
      line_linked: {
        enable: true,
        distance: 120,
        color: '#ffffff',
        opacity: 0.15,
        width: 1.5,
      },
      move: {
        enable: true,
        speed: 2,
        direction: 'none',
        random: true,
        straight: false,
        out_mode: 'out',
        bounce: true,
        attract: {
          enable: true,
          rotateX: 600,
          rotateY: 600,
        },
      },
    },
    interactivity: {
      detect_on: 'canvas',
      events: {
        onhover: {
          enable: true,
          mode: ['grab', 'bubble'],
        },
        onclick: {
          enable: true,
          mode: 'push',
        },
        resize: true,
      },
      modes: {
        grab: {
          distance: 200,
          line_linked: {
            opacity: 0.3,
          },
        },
        bubble: {
          distance: 300,
          size: 8,
          duration: 2,
          opacity: 0.8,
          speed: 3,
        },
        repulse: {
          distance: 150,
          duration: 0.4,
        },
        push: {
          particles_nb: 6,
        },
        remove: {
          particles_nb: 3,
        },
      },
    },
    retina_detect: true,
  },
};

// Estado del servicio
let particlesInstance = null;
let currentConfig = 'default';
let isInitialized = false;
let performanceMode = false;

/**
 * Inicializa el sistema de partículas
 * @param {Object} options - Opciones de inicialización
 * @returns {Promise<boolean>} - Éxito de la inicialización
 */
export async function initializeParticles(options = {}) {
  const {
    containerId = 'particles-js',
    config = 'default',
    autoDetectPerformance = true,
    fallbackOnError = true,
  } = options;

  try {
    // Verificar si particles.js está disponible
    if (typeof particlesJS === 'undefined') {
      console.warn('particles.js no está cargado');

      if (fallbackOnError) {
        await loadParticlesLibrary();
      } else {
        return false;
      }
    }

    // Verificar contenedor
    const container = document.getElementById(containerId);
    if (!container) {
      console.warn(`Contenedor ${containerId} no encontrado`);
      return false;
    }

    // Detectar rendimiento automáticamente
    if (autoDetectPerformance) {
      performanceMode = detectPerformanceMode();
    }

    // Seleccionar configuración
    const selectedConfig = performanceMode ? 'minimal' : config;
    const particlesConfig = getParticlesConfig(selectedConfig);

    // Inicializar partículas
    particlesJS(containerId, particlesConfig);

    // Guardar estado
    particlesInstance = window.pJSDom[0];
    currentConfig = selectedConfig;
    isInitialized = true;

    console.log(
      `✅ Partículas inicializadas con configuración: ${selectedConfig}`
    );

    // Configurar eventos de rendimiento
    setupPerformanceMonitoring();

    return true;
  } catch (error) {
    console.error('Error inicializando partículas:', error);

    if (fallbackOnError) {
      createFallbackEffect(containerId);
    }

    return false;
  }
}

/**
 * Carga la librería particles.js dinámicamente
 * @returns {Promise<void>}
 */
async function loadParticlesLibrary() {
  return new Promise((resolve, reject) => {
    if (typeof particlesJS !== 'undefined') {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/particles.js/2.0.0/particles.min.js';
    script.onload = () => {
      console.log('particles.js cargado dinámicamente');
      resolve();
    };
    script.onerror = () => {
      console.error('Error cargando particles.js');
      reject(new Error('Failed to load particles.js'));
    };

    document.head.appendChild(script);
  });
}

/**
 * Detecta el modo de rendimiento basado en el dispositivo
 * @returns {boolean} - True si debe usar modo de bajo rendimiento
 */
function detectPerformanceMode() {
  // Detectar dispositivos móviles
  const isMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );

  // Detectar conexión lenta
  const isSlowConnection =
    navigator.connection &&
    (navigator.connection.effectiveType === 'slow-2g' ||
      navigator.connection.effectiveType === '2g');

  // Detectar hardware limitado
  const isLowEndDevice =
    navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2;

  // Detectar memoria limitada
  const isLowMemory = navigator.deviceMemory && navigator.deviceMemory <= 2;

  const shouldUsePerformanceMode =
    isMobile || isSlowConnection || isLowEndDevice || isLowMemory;

  if (shouldUsePerformanceMode) {
    console.log('🔧 Modo de rendimiento activado');
  }

  return shouldUsePerformanceMode;
}

/**
 * Obtiene la configuración de partículas
 * @param {string} configName - Nombre de la configuración
 * @returns {Object} - Configuración de partículas
 */
function getParticlesConfig(configName) {
  const baseConfig = PARTICLES_CONFIG[configName] || PARTICLES_CONFIG.default;

  // Aplicar tema actual
  const theme = getCurrentTheme();
  const themedConfig = applyThemeToConfig(baseConfig, theme);

  return themedConfig;
}

/**
 * Aplica el tema actual a la configuración
 * @param {Object} config - Configuración base
 * @param {string} theme - Tema actual
 * @returns {Object} - Configuración con tema aplicado
 */
function applyThemeToConfig(config, theme) {
  const themedConfig = JSON.parse(JSON.stringify(config)); // Deep clone

  switch (theme) {
    case 'dark':
      themedConfig.particles.color.value = '#ffffff';
      themedConfig.particles.line_linked.color = '#ffffff';
      themedConfig.particles.opacity.value = 0.1;
      break;

    case 'light':
      themedConfig.particles.color.value = '#000000';
      themedConfig.particles.line_linked.color = '#000000';
      themedConfig.particles.opacity.value = 0.05;
      break;

    case 'blue':
      themedConfig.particles.color.value = '#4a90e2';
      themedConfig.particles.line_linked.color = '#4a90e2';
      themedConfig.particles.opacity.value = 0.12;
      break;

    default:
      // Mantener configuración por defecto
      break;
  }

  return themedConfig;
}

/**
 * Obtiene el tema actual
 * @returns {string} - Tema actual
 */
function getCurrentTheme() {
  // Intentar obtener tema del localStorage o CSS
  const savedTheme = localStorage.getItem('studyingflash_theme');
  if (savedTheme) {
    return savedTheme;
  }

  // Detectar tema del sistema
  if (
    window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  ) {
    return 'dark';
  }

  return 'light';
}

/**
 * Cambia la configuración de partículas
 * @param {string} configName - Nombre de la nueva configuración
 * @param {string} containerId - ID del contenedor
 * @returns {boolean} - Éxito del cambio
 */
export function changeParticlesConfig(
  configName,
  containerId = 'particles-js'
) {
  if (!isInitialized) {
    console.warn('Partículas no inicializadas');
    return false;
  }

  try {
    // Destruir instancia actual
    if (particlesInstance && particlesInstance.pJS) {
      particlesInstance.pJS.fn.vendors.destroypJS();
    }

    // Reinicializar con nueva configuración
    const newConfig = getParticlesConfig(configName);
    particlesJS(containerId, newConfig);

    // Actualizar estado
    particlesInstance = window.pJSDom[0];
    currentConfig = configName;

    console.log(`🔄 Configuración cambiada a: ${configName}`);
    return true;
  } catch (error) {
    console.error('Error cambiando configuración:', error);
    return false;
  }
}

/**
 * Pausa las partículas
 */
export function pauseParticles() {
  if (particlesInstance && particlesInstance.pJS) {
    particlesInstance.pJS.fn.vendors.pause();
    console.log('⏸️ Partículas pausadas');
  }
}

/**
 * Reanuda las partículas
 */
export function resumeParticles() {
  if (particlesInstance && particlesInstance.pJS) {
    particlesInstance.pJS.fn.vendors.play();
    console.log('▶️ Partículas reanudadas');
  }
}

/**
 * Detiene y destruye las partículas
 */
export function destroyParticles() {
  if (particlesInstance && particlesInstance.pJS) {
    particlesInstance.pJS.fn.vendors.destroypJS();
    particlesInstance = null;
    isInitialized = false;
    console.log('🗑️ Partículas destruidas');
  }
}

/**
 * Agrega partículas dinámicamente
 * @param {number} count - Número de partículas a agregar
 */
export function addParticles(count = 10) {
  if (particlesInstance && particlesInstance.pJS) {
    for (let i = 0; i < count; i++) {
      particlesInstance.pJS.fn.modes.pushParticles(1, {
        pos_x: Math.random() * particlesInstance.pJS.canvas.w,
        pos_y: Math.random() * particlesInstance.pJS.canvas.h,
      });
    }
    console.log(`➕ ${count} partículas agregadas`);
  }
}

/**
 * Remueve partículas dinámicamente
 * @param {number} count - Número de partículas a remover
 */
export function removeParticles(count = 10) {
  if (particlesInstance && particlesInstance.pJS) {
    particlesInstance.pJS.fn.modes.removeParticles(count);
    console.log(`➖ ${count} partículas removidas`);
  }
}

/**
 * Configura monitoreo de rendimiento
 */
function setupPerformanceMonitoring() {
  if (!particlesInstance || !particlesInstance.pJS) {
    return;
  }

  let frameCount = 0;
  let lastTime = performance.now();

  const monitorPerformance = () => {
    frameCount++;
    const currentTime = performance.now();

    // Calcular FPS cada segundo
    if (currentTime - lastTime >= 1000) {
      const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));

      // Si el FPS es muy bajo, cambiar a modo de rendimiento
      if (fps < 30 && !performanceMode) {
        console.warn(
          `⚠️ FPS bajo detectado (${fps}), cambiando a modo de rendimiento`
        );
        performanceMode = true;
        changeParticlesConfig('minimal');
        showNotification(
          'Efectos reducidos para mejor rendimiento',
          'info',
          3000
        );
      }

      frameCount = 0;
      lastTime = currentTime;
    }

    if (isInitialized) {
      requestAnimationFrame(monitorPerformance);
    }
  };

  requestAnimationFrame(monitorPerformance);
}

/**
 * Crea un efecto de fallback cuando particles.js no está disponible
 * @param {string} containerId - ID del contenedor
 */
function createFallbackEffect(containerId) {
  const container = document.getElementById(containerId);
  if (!container) {
    return;
  }

  container.innerHTML = `
    <div class="fallback-particles">
      <div class="particle"></div>
      <div class="particle"></div>
      <div class="particle"></div>
      <div class="particle"></div>
      <div class="particle"></div>
    </div>
  `;

  // Agregar estilos CSS para el fallback
  const style = document.createElement('style');
  style.textContent = `
    .fallback-particles {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      pointer-events: none;
    }
    
    .fallback-particles .particle {
      position: absolute;
      width: 4px;
      height: 4px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 50%;
      animation: float 20s infinite linear;
    }
    
    .fallback-particles .particle:nth-child(1) {
      left: 10%;
      animation-delay: 0s;
      animation-duration: 15s;
    }
    
    .fallback-particles .particle:nth-child(2) {
      left: 30%;
      animation-delay: 5s;
      animation-duration: 25s;
    }
    
    .fallback-particles .particle:nth-child(3) {
      left: 50%;
      animation-delay: 10s;
      animation-duration: 20s;
    }
    
    .fallback-particles .particle:nth-child(4) {
      left: 70%;
      animation-delay: 15s;
      animation-duration: 18s;
    }
    
    .fallback-particles .particle:nth-child(5) {
      left: 90%;
      animation-delay: 20s;
      animation-duration: 22s;
    }
    
    @keyframes float {
      0% {
        transform: translateY(100vh) rotate(0deg);
        opacity: 0;
      }
      10% {
        opacity: 1;
      }
      90% {
        opacity: 1;
      }
      100% {
        transform: translateY(-100px) rotate(360deg);
        opacity: 0;
      }
    }
  `;

  document.head.appendChild(style);

  console.log('🎨 Efecto de fallback activado');
}

/**
 * Obtiene información del estado actual
 * @returns {Object} - Información del estado
 */
export function getParticlesInfo() {
  return {
    isInitialized: isInitialized,
    currentConfig: currentConfig,
    performanceMode: performanceMode,
    particleCount:
      particlesInstance && particlesInstance.pJS
        ? particlesInstance.pJS.particles.array.length
        : 0,
    isPlaying:
      particlesInstance && particlesInstance.pJS
        ? !particlesInstance.pJS.fn.vendors.checkBeforeDraw()
        : false,
  };
}

/**
 * Actualiza el tema de las partículas
 * @param {string} newTheme - Nuevo tema
 */
export function updateParticlesTheme(newTheme) {
  if (!isInitialized) {
    return;
  }

  // Guardar tema
  localStorage.setItem('studyingflash_theme', newTheme);

  // Reinicializar con nuevo tema
  changeParticlesConfig(currentConfig);

  console.log(`🎨 Tema de partículas actualizado: ${newTheme}`);
}

// Exponer funciones globalmente para compatibilidad
window.initializeParticles = initializeParticles;
window.changeParticlesConfig = changeParticlesConfig;
window.pauseParticles = pauseParticles;
window.resumeParticles = resumeParticles;
window.destroyParticles = destroyParticles;
window.addParticles = addParticles;
window.removeParticles = removeParticles;
window.getParticlesInfo = getParticlesInfo;
window.updateParticlesTheme = updateParticlesTheme;
