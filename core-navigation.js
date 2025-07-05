/**
 * CORE NAVIGATION SYSTEM - REFACTORIZADO
 * =====================================
 * 
 * Sistema de navegación robusto y refactorizado que utiliza
 * las utilidades comunes para eliminar duplicación de código
 */

import { showNotification, formatDate } from './utils/helpers.js';
import { validateRequiredFields } from './utils/validation.js';

class NavigationSystem {
  constructor() {
    this.isInitialized = false;
    this.sections = new Map();
    this.navLinks = new Map();
    this.currentSection = null;
    this.debugMode = window.APP_CONFIG?.features?.debugging || false;
    this.animations = {
      enabled: true,
      duration: 300,
      easing: 'ease-in-out'
    };
    
    this.log('🚀 NavigationSystem refactorizado inicializado');
    this.init();
  }

  /**
   * Inicialización del sistema
   */
  init() {
    this.log('🔧 Inicializando NavigationSystem refactorizado...');
    
    try {
      // Esperar a que el DOM esté completamente cargado
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.setup());
      } else {
        this.setup();
      }
    } catch (error) {
      this.error('❌ Error en init:', error);
    }
  }

  /**
   * Configuración principal del sistema
   */
  setup() {
    this.log('⚙️ Configurando sistema de navegación...');
    
    try {
      // 1. Descubrir y mapear todas las secciones
      this.discoverSections();
      
      // 2. Descubrir y configurar enlaces de navegación
      this.discoverNavLinks();
      
      // 3. Configurar eventos
      this.setupEvents();
      
      // 4. Configurar observadores de mutación
      this.setupMutationObserver();
      
      // 5. Marcar como inicializado
      this.isInitialized = true;
      
      this.log('✅ NavigationSystem configurado exitosamente');
      this.log(`📊 Secciones encontradas: ${this.sections.size}`);
      this.log(`🔗 Enlaces encontrados: ${this.navLinks.size}`);
      
      // Mostrar notificación si está en modo debug
      if (this.debugMode) {
        showNotification(`Navigation: ${this.sections.size} secciones, ${this.navLinks.size} enlaces`, 'info', 2000);
      }
      
    } catch (error) {
      this.error('❌ Error en setup:', error);
      showNotification('Error configurando navegación', 'error', 3000);
    }
  }

  /**
   * Descubre todas las secciones disponibles
   */
  discoverSections() {
    this.log('🔍 Descubriendo secciones...');
    
    // Selectores para encontrar secciones
    const sectionSelectors = [
      '[data-section]',
      '.section',
      '.page-section',
      '.content-section',
      'section[id]'
    ];
    
    let sectionsFound = 0;
    
    sectionSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      
      elements.forEach(element => {
        const sectionId = this.getSectionId(element);
        
        if (sectionId && !this.sections.has(sectionId)) {
          this.sections.set(sectionId, {
            element: element,
            id: sectionId,
            title: this.getSectionTitle(element),
            visible: !element.hidden && element.style.display !== 'none',
            lastShown: null,
            showCount: 0
          });
          
          sectionsFound++;
          this.log(`  📄 Sección encontrada: ${sectionId}`);
        }
      });
    });
    
    this.log(`✅ ${sectionsFound} secciones descubiertas`);
  }

  /**
   * Descubre todos los enlaces de navegación
   */
  discoverNavLinks() {
    this.log('🔍 Descubriendo enlaces de navegación...');
    
    // Selectores para encontrar enlaces de navegación
    const linkSelectors = [
      '[data-section]',
      '[data-target]',
      '.nav-link',
      '.navigation-link',
      'a[href^="#"]'
    ];
    
    let linksFound = 0;
    
    linkSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      
      elements.forEach(element => {
        const targetSection = this.getLinkTarget(element);
        
        if (targetSection && !this.navLinks.has(element)) {
          this.navLinks.set(element, {
            element: element,
            target: targetSection,
            clickCount: 0,
            lastClicked: null
          });
          
          // Configurar evento de click
          element.addEventListener('click', (e) => this.handleNavClick(e, element));
          
          linksFound++;
          this.log(`  🔗 Enlace encontrado: ${element.tagName} → ${targetSection}`);
        }
      });
    });
    
    this.log(`✅ ${linksFound} enlaces configurados`);
  }

  /**
   * Configura eventos del sistema
   */
  setupEvents() {
    this.log('⚙️ Configurando eventos...');
    
    // Evento personalizado para mostrar secciones
    document.addEventListener('showSection', (e) => {
      this.showSection(e.detail.section, e.detail.options);
    });
    
    // Evento de cambio de hash
    window.addEventListener('hashchange', () => {
      const section = window.location.hash.slice(1);
      if (section) {
        this.showSection(section);
      }
    });
    
    // Eventos de teclado para navegación
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case '1':
          case '2':
          case '3':
          case '4':
          case '5':
            e.preventDefault();
            const sectionIndex = parseInt(e.key) - 1;
            const sections = Array.from(this.sections.keys());
            if (sections[sectionIndex]) {
              this.showSection(sections[sectionIndex]);
            }
            break;
        }
      }
    });
    
    this.log('✅ Eventos configurados');
  }

  /**
   * Configura observador de mutaciones para detectar cambios en el DOM
   */
  setupMutationObserver() {
    if (!window.MutationObserver) {
      this.log('⚠️ MutationObserver no disponible');
      return;
    }
    
    const observer = new MutationObserver((mutations) => {
      let shouldRediscover = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Verificar si se agregaron nuevas secciones o enlaces
              if (node.matches('[data-section], .section, .nav-link') ||
                  node.querySelector('[data-section], .section, .nav-link')) {
                shouldRediscover = true;
              }
            }
          });
        }
      });
      
      if (shouldRediscover) {
        this.log('🔄 Cambios detectados en DOM, redescubriendo...');
        this.discoverSections();
        this.discoverNavLinks();
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    this.log('✅ MutationObserver configurado');
  }

  /**
   * Muestra una sección específica
   */
  showSection(sectionId, options = {}) {
    try {
      this.log(`🎯 Mostrando sección: ${sectionId}`);
      
      // Validar parámetros
      if (!validateRequiredFields({ sectionId })) {
        return false;
      }
      
      // Verificar si la sección existe
      if (!this.sections.has(sectionId)) {
        this.log(`⚠️ Sección no encontrada: ${sectionId}`);
        
        // Intentar redescubrir secciones
        this.discoverSections();
        
        if (!this.sections.has(sectionId)) {
          showNotification(`Sección "${sectionId}" no encontrada`, 'error', 3000);
          return false;
        }
      }
      
      // Obtener información de la sección
      const sectionInfo = this.sections.get(sectionId);
      const sectionElement = sectionInfo.element;
      
      // Ocultar sección actual si existe
      if (this.currentSection && this.currentSection !== sectionId) {
        this.hideSection(this.currentSection);
      }
      
      // Mostrar nueva sección
      this.displaySection(sectionElement, options);
      
      // Actualizar estado
      this.currentSection = sectionId;
      sectionInfo.lastShown = Date.now();
      sectionInfo.showCount++;
      sectionInfo.visible = true;
      
      // Actualizar enlaces activos
      this.updateActiveLinks(sectionId);
      
      // Disparar evento personalizado
      this.dispatchSectionEvent('sectionShown', sectionId, options);
      
      this.log(`✅ Sección mostrada: ${sectionId}`);
      return true;
      
    } catch (error) {
      this.error(`❌ Error mostrando sección ${sectionId}:`, error);
      showNotification(`Error mostrando sección ${sectionId}`, 'error', 3000);
      return false;
    }
  }

  /**
   * Oculta una sección específica
   */
  hideSection(sectionId) {
    try {
      if (!this.sections.has(sectionId)) {
        return false;
      }
      
      const sectionInfo = this.sections.get(sectionId);
      const sectionElement = sectionInfo.element;
      
      // Aplicar animación de salida si está habilitada
      if (this.animations.enabled) {
        sectionElement.style.transition = `opacity ${this.animations.duration}ms ${this.animations.easing}`;
        sectionElement.style.opacity = '0';
        
        setTimeout(() => {
          sectionElement.style.display = 'none';
          sectionElement.classList.remove('active', 'visible');
        }, this.animations.duration);
      } else {
        sectionElement.style.display = 'none';
        sectionElement.classList.remove('active', 'visible');
      }
      
      // Actualizar estado
      sectionInfo.visible = false;
      
      // Disparar evento
      this.dispatchSectionEvent('sectionHidden', sectionId);
      
      this.log(`👁️ Sección oculta: ${sectionId}`);
      return true;
      
    } catch (error) {
      this.error(`❌ Error ocultando sección ${sectionId}:`, error);
      return false;
    }
  }

  /**
   * Muestra físicamente una sección en el DOM
   */
  displaySection(sectionElement, options = {}) {
    const { animated = this.animations.enabled, data = null } = options;
    
    // Configurar estilos iniciales
    sectionElement.style.display = 'block';
    sectionElement.classList.add('active', 'visible');
    
    // Aplicar animación de entrada si está habilitada
    if (animated) {
      sectionElement.style.opacity = '0';
      sectionElement.style.transition = `opacity ${this.animations.duration}ms ${this.animations.easing}`;
      
      // Forzar reflow
      sectionElement.offsetHeight;
      
      // Animar entrada
      sectionElement.style.opacity = '1';
    } else {
      sectionElement.style.opacity = '1';
    }
    
    // Scroll al inicio de la sección
    if (options.scroll !== false) {
      sectionElement.scrollIntoView({ 
        behavior: animated ? 'smooth' : 'auto',
        block: 'start'
      });
    }
    
    // Pasar datos si están disponibles
    if (data && typeof sectionElement.setData === 'function') {
      sectionElement.setData(data);
    }
  }

  /**
   * Actualiza enlaces activos
   */
  updateActiveLinks(activeSectionId) {
    this.navLinks.forEach((linkInfo, linkElement) => {
      if (linkInfo.target === activeSectionId) {
        linkElement.classList.add('active', 'current');
      } else {
        linkElement.classList.remove('active', 'current');
      }
    });
  }

  /**
   * Maneja clicks en enlaces de navegación
   */
  handleNavClick(event, linkElement) {
    try {
      event.preventDefault();
      
      const linkInfo = this.navLinks.get(linkElement);
      if (!linkInfo) {
        this.log('⚠️ Información de enlace no encontrada');
        return;
      }
      
      const targetSection = linkInfo.target;
      
      // Actualizar estadísticas del enlace
      linkInfo.clickCount++;
      linkInfo.lastClicked = Date.now();
      
      // Mostrar sección
      const success = this.showSection(targetSection);
      
      if (success) {
        this.log(`🔗 Navegación exitosa: ${linkElement.tagName} → ${targetSection}`);
      }
      
    } catch (error) {
      this.error('❌ Error en handleNavClick:', error);
      showNotification('Error en navegación', 'error', 2000);
    }
  }

  /**
   * Obtiene el ID de una sección
   */
  getSectionId(element) {
    return element.dataset.section || 
           element.id || 
           element.getAttribute('data-section') ||
           element.className.match(/section-(\w+)/)?.[1];
  }

  /**
   * Obtiene el título de una sección
   */
  getSectionTitle(element) {
    return element.dataset.title ||
           element.getAttribute('title') ||
           element.querySelector('h1, h2, h3')?.textContent ||
           this.getSectionId(element);
  }

  /**
   * Obtiene el target de un enlace
   */
  getLinkTarget(element) {
    return element.dataset.section ||
           element.dataset.target ||
           element.getAttribute('href')?.slice(1) ||
           element.getAttribute('data-section');
  }

  /**
   * Dispara evento personalizado de sección
   */
  dispatchSectionEvent(eventType, sectionId, data = null) {
    const event = new CustomEvent(eventType, {
      detail: {
        sectionId,
        timestamp: Date.now(),
        data
      }
    });
    
    document.dispatchEvent(event);
  }

  /**
   * Obtiene estadísticas del sistema
   */
  getStats() {
    const stats = {
      sectionsTotal: this.sections.size,
      linksTotal: this.navLinks.size,
      currentSection: this.currentSection,
      isInitialized: this.isInitialized,
      sections: {},
      links: {}
    };
    
    // Estadísticas de secciones
    this.sections.forEach((info, id) => {
      stats.sections[id] = {
        showCount: info.showCount,
        lastShown: info.lastShown ? formatDate(new Date(info.lastShown)) : null,
        visible: info.visible,
        title: info.title
      };
    });
    
    // Estadísticas de enlaces
    this.navLinks.forEach((info, element) => {
      const key = `${element.tagName}-${info.target}`;
      stats.links[key] = {
        target: info.target,
        clickCount: info.clickCount,
        lastClicked: info.lastClicked ? formatDate(new Date(info.lastClicked)) : null
      };
    });
    
    return stats;
  }

  /**
   * Reinicia el sistema
   */
  reset() {
    this.log('🔄 Reiniciando NavigationSystem...');
    
    // Limpiar mapas
    this.sections.clear();
    this.navLinks.clear();
    
    // Resetear estado
    this.currentSection = null;
    this.isInitialized = false;
    
    // Reinicializar
    this.setup();
    
    this.log('✅ NavigationSystem reiniciado');
  }

  /**
   * Configura el sistema
   */
  configure(options = {}) {
    Object.assign(this.animations, options.animations || {});
    this.debugMode = options.debugMode !== undefined ? options.debugMode : this.debugMode;
    
    this.log('⚙️ NavigationSystem reconfigurado:', options);
  }

  /**
   * Log de depuración
   */
  log(message, ...args) {
    if (this.debugMode) {
      console.log(`[NavigationSystem] ${message}`, ...args);
    }
  }

  /**
   * Log de errores
   */
  error(message, ...args) {
    console.error(`[NavigationSystem] ${message}`, ...args);
  }
}

// Crear instancia global
const navigationSystem = new NavigationSystem();

// Función de compatibilidad para código legacy
export function showSection(sectionId, options = {}) {
  return navigationSystem.showSection(sectionId, options);
}

// Exportar funciones adicionales
export function hideSection(sectionId) {
  return navigationSystem.hideSection(sectionId);
}

export function getCurrentSection() {
  return navigationSystem.currentSection;
}

export function getNavigationStats() {
  return navigationSystem.getStats();
}

export function resetNavigation() {
  return navigationSystem.reset();
}

export function configureNavigation(options) {
  return navigationSystem.configure(options);
}

// Exponer globalmente para compatibilidad
window.showSection = showSection;
window.hideSection = hideSection;
window.getCurrentSection = getCurrentSection;

// Exponer para depuración
if (window.APP_CONFIG?.features?.debugging) {
  window.NavigationSystem = navigationSystem;
}

console.log('🧭 Core Navigation System refactorizado inicializado');


// ===== NAVEGACIÓN MÓVIL HAMBURGUESA =====

/**
 * Inicializar menú hamburguesa para móvil
 */
function initMobileMenu() {
  const hamburgerBtn = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  
  if (!hamburgerBtn || !mobileMenu) {
    console.warn('🍔 Elementos del menú móvil no encontrados');
    return;
  }
  
  // Toggle del menú móvil
  hamburgerBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const isActive = hamburgerBtn.classList.contains('active');
    
    if (isActive) {
      closeMobileMenu();
    } else {
      openMobileMenu();
    }
  });
  
  // Cerrar menú al hacer click en un enlace
  mobileMenu.addEventListener('click', (e) => {
    if (e.target.classList.contains('nav-link')) {
      closeMobileMenu();
    }
  });
  
  // Cerrar menú al hacer click fuera
  document.addEventListener('click', (e) => {
    if (!hamburgerBtn.contains(e.target) && !mobileMenu.contains(e.target)) {
      closeMobileMenu();
    }
  });
  
  // Cerrar menú con tecla Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeMobileMenu();
    }
  });
  
  // Cerrar menú al cambiar a desktop
  window.addEventListener('resize', () => {
    if (window.innerWidth >= 768) {
      closeMobileMenu();
    }
  });
  
  console.log('🍔 Menú hamburguesa inicializado');
}

/**
 * Abrir menú móvil
 */
function openMobileMenu() {
  const hamburgerBtn = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  
  if (hamburgerBtn && mobileMenu) {
    hamburgerBtn.classList.add('active');
    mobileMenu.classList.add('active');
    hamburgerBtn.setAttribute('aria-expanded', 'true');
    
    // Enfocar primer enlace para accesibilidad
    const firstLink = mobileMenu.querySelector('.nav-link');
    if (firstLink) {
      setTimeout(() => firstLink.focus(), 100);
    }
  }
}

/**
 * Cerrar menú móvil
 */
function closeMobileMenu() {
  const hamburgerBtn = document.getElementById('mobile-menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  
  if (hamburgerBtn && mobileMenu) {
    hamburgerBtn.classList.remove('active');
    mobileMenu.classList.remove('active');
    hamburgerBtn.setAttribute('aria-expanded', 'false');
  }
}

/**
 * Verificar si el menú móvil está abierto
 */
function isMobileMenuOpen() {
  const hamburgerBtn = document.getElementById('mobile-menu-btn');
  return hamburgerBtn?.classList.contains('active') || false;
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMobileMenu);
} else {
  initMobileMenu();
}

// Exportar funciones para uso externo
export { initMobileMenu, openMobileMenu, closeMobileMenu, isMobileMenuOpen };

console.log('🍔 Módulo de navegación móvil cargado');

