/**
 * SISTEMA DE NAVEGACIÓN ROBUSTO ANTI-FALLOS
 * ==========================================
 * 
 * Sistema que garantiza que la navegación SIEMPRE funcione
 * con múltiples fallbacks y auto-reparación
 */

class RobustNavigationSystem {
  constructor() {
    this.sections = new Map();
    this.currentSection = 'dashboard'; // Sección por defecto
    this.debugMode = true; // Activar logging detallado
    this.failsafeAttempts = 0;
    this.maxFailsafeAttempts = 3;
    
    // Configuración robusta
    this.config = {
      forceDisplay: true,        // Forzar display con !important
      validateVisibility: true,  // Verificar que la sección sea visible
      autoRepair: true,          // Auto-reparar problemas
      fallbackCSS: true,         // Usar CSS de emergencia
      retryOnFailure: true       // Reintentar si falla
    };
    
    this.log('🛡️ Sistema de Navegación Robusto inicializado');
    this.init();
  }

  /**
   * Inicialización con múltiples intentos
   */
  async init() {
    try {
      await this.waitForDOM();
      await this.setupRobustSystem();
      this.log('✅ Sistema robusto configurado exitosamente');
    } catch (error) {
      this.error('❌ Error en inicialización, activando modo de emergencia:', error);
      this.activateEmergencyMode();
    }
  }

  /**
   * Esperar a que el DOM esté completamente listo
   */
  waitForDOM() {
    return new Promise((resolve) => {
      if (document.readyState === 'complete') {
        resolve();
      } else {
        window.addEventListener('load', resolve);
      }
    });
  }

  /**
   * Configuración del sistema robusto
   */
  async setupRobustSystem() {
    // 1. Descubrir y validar secciones
    this.discoverSections();
    
    // 2. Inyectar CSS de emergencia
    this.injectEmergencyCSS();
    
    // 3. Configurar navegación robusta
    this.setupRobustNavigation();
    
    // 4. Configurar auto-reparación
    this.setupAutoRepair();
    
    // 5. Validar estado inicial
    this.validateInitialState();
    
    // 6. Configurar monitoreo continuo
    this.setupContinuousMonitoring();
  }

  /**
   * Descubrir todas las secciones con validación
   */
  discoverSections() {
    this.log('🔍 Descubriendo secciones con validación...');
    
    const sectionSelectors = [
      'section[id]',
      '[data-section]',
      '.section'
    ];
    
    sectionSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(element => {
        const sectionId = element.id || element.dataset.section;
        
        if (sectionId && !this.sections.has(sectionId)) {
          this.sections.set(sectionId, {
            element: element,
            id: sectionId,
            visible: element.classList.contains('active'),
            validated: false,
            lastShown: null,
            failCount: 0
          });
          
          this.log(`  📄 Sección registrada: ${sectionId}`);
        }
      });
    });
    
    this.log(`✅ ${this.sections.size} secciones descubiertas`);
  }

  /**
   * Inyectar CSS de emergencia que SIEMPRE funciona
   */
  injectEmergencyCSS() {
    if (!this.config.fallbackCSS) return;
    
    const emergencyCSS = `
      <style id="emergency-navigation-css">
        /* CSS DE EMERGENCIA - NAVEGACIÓN ROBUSTA */
        
        /* Forzar visibilidad de secciones activas */
        .section.active,
        .section.force-visible {
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
          position: relative !important;
          z-index: 1 !important;
        }
        
        /* Ocultar secciones inactivas */
        .section:not(.active):not(.force-visible) {
          display: none !important;
        }
        
        /* Fallback para móvil */
        @media (max-width: 768px) {
          .section.mobile-active {
            display: block !important;
            visibility: visible !important;
          }
        }
        
        /* Indicador de debugging */
        .section.debug-active::before {
          content: "🔍 SECCIÓN ACTIVA: " attr(id);
          position: fixed;
          top: 10px;
          right: 10px;
          background: #007AFF;
          color: white;
          padding: 5px 10px;
          border-radius: 5px;
          font-size: 12px;
          z-index: 9999;
          display: ${this.debugMode ? 'block' : 'none'};
        }
      </style>
    `;
    
    document.head.insertAdjacentHTML('beforeend', emergencyCSS);
    this.log('🚨 CSS de emergencia inyectado');
  }

  /**
   * Configurar navegación robusta con múltiples métodos
   */
  setupRobustNavigation() {
    this.log('⚙️ Configurando navegación robusta...');
    
    // Método 1: Event delegation en document
    document.addEventListener('click', (e) => {
      const target = e.target.closest('[data-section], .nav-link, [onclick*="showSection"]');
      
      if (target) {
        e.preventDefault();
        e.stopPropagation();
        
        const sectionId = this.extractSectionId(target);
        if (sectionId) {
          this.showSectionRobust(sectionId);
        }
      }
    });
    
    // Método 2: Interceptar función showSection global
    window.showSection = (sectionId) => {
      this.showSectionRobust(sectionId);
    };
    
    // Método 3: Hash change listener
    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.replace('#', '');
      if (hash && this.sections.has(hash)) {
        this.showSectionRobust(hash);
      }
    });
    
    this.log('✅ Navegación robusta configurada');
  }

  /**
   * Extraer ID de sección de un elemento
   */
  extractSectionId(element) {
    // Método 1: data-section
    if (element.dataset.section) {
      return element.dataset.section;
    }
    
    // Método 2: onclick con showSection
    const onclick = element.getAttribute('onclick');
    if (onclick) {
      const match = onclick.match(/showSection\(['"]([^'"]+)['"]\)/);
      if (match) return match[1];
    }
    
    // Método 3: href con hash
    const href = element.getAttribute('href');
    if (href && href.startsWith('#')) {
      return href.substring(1);
    }
    
    return null;
  }

  /**
   * Mostrar sección con múltiples fallbacks
   */
  async showSectionRobust(sectionId) {
    this.log(`🎯 Mostrando sección robusta: ${sectionId}`);
    
    try {
      // Validar que la sección existe
      if (!this.sections.has(sectionId)) {
        this.error(`❌ Sección no encontrada: ${sectionId}`);
        return false;
      }
      
      const sectionInfo = this.sections.get(sectionId);
      const sectionElement = sectionInfo.element;
      
      // Paso 1: Ocultar sección actual
      await this.hideCurrentSection();
      
      // Paso 2: Mostrar nueva sección con múltiples métodos
      const success = await this.showSectionMultiMethod(sectionElement, sectionId);
      
      if (success) {
        // Paso 3: Validar que la sección es visible
        const isVisible = await this.validateSectionVisibility(sectionElement);
        
        if (isVisible) {
          // Paso 4: Actualizar estado
          this.currentSection = sectionId;
          sectionInfo.visible = true;
          sectionInfo.lastShown = Date.now();
          sectionInfo.failCount = 0;
          
          // Paso 5: Actualizar navegación activa
          this.updateActiveNavigation(sectionId);
          
          this.log(`✅ Sección mostrada exitosamente: ${sectionId}`);
          return true;
        } else {
          throw new Error('Sección no es visible después de mostrar');
        }
      } else {
        throw new Error('Falló mostrar sección con todos los métodos');
      }
      
    } catch (error) {
      this.error(`❌ Error mostrando sección ${sectionId}:`, error);
      
      // Activar modo de emergencia
      return this.emergencyShowSection(sectionId);
    }
  }

  /**
   * Mostrar sección con múltiples métodos
   */
  async showSectionMultiMethod(sectionElement, sectionId) {
    const methods = [
      () => this.methodClassList(sectionElement),
      () => this.methodInlineStyle(sectionElement),
      () => this.methodForceVisible(sectionElement),
      () => this.methodEmergencyCSS(sectionElement, sectionId)
    ];
    
    for (let i = 0; i < methods.length; i++) {
      try {
        this.log(`  🔧 Intentando método ${i + 1}...`);
        await methods[i]();
        
        // Verificar si funcionó
        if (this.isElementVisible(sectionElement)) {
          this.log(`  ✅ Método ${i + 1} exitoso`);
          return true;
        }
      } catch (error) {
        this.log(`  ❌ Método ${i + 1} falló:`, error);
      }
    }
    
    return false;
  }

  /**
   * Método 1: Usar classList (método estándar)
   */
  methodClassList(sectionElement) {
    sectionElement.style.display = 'block';
    sectionElement.classList.add('active', 'visible');
    
    if (this.debugMode) {
      sectionElement.classList.add('debug-active');
    }
  }

  /**
   * Método 2: Usar estilos inline (forzado)
   */
  methodInlineStyle(sectionElement) {
    sectionElement.style.cssText = `
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
      position: relative !important;
      z-index: 1 !important;
    `;
    sectionElement.classList.add('active');
  }

  /**
   * Método 3: Usar clase force-visible
   */
  methodForceVisible(sectionElement) {
    sectionElement.classList.add('force-visible', 'active');
    sectionElement.removeAttribute('hidden');
  }

  /**
   * Método 4: CSS de emergencia específico
   */
  methodEmergencyCSS(sectionElement, sectionId) {
    const emergencyRule = `
      #${sectionId} {
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
      }
    `;
    
    let emergencyStyle = document.getElementById('emergency-section-css');
    if (!emergencyStyle) {
      emergencyStyle = document.createElement('style');
      emergencyStyle.id = 'emergency-section-css';
      document.head.appendChild(emergencyStyle);
    }
    
    emergencyStyle.textContent += emergencyRule;
    sectionElement.classList.add('active');
  }

  /**
   * Ocultar sección actual
   */
  async hideCurrentSection() {
    if (!this.currentSection) return;
    
    const currentInfo = this.sections.get(this.currentSection);
    if (currentInfo && currentInfo.visible) {
      const element = currentInfo.element;
      
      // Remover clases y estilos
      element.classList.remove('active', 'visible', 'force-visible', 'debug-active');
      element.style.display = 'none';
      
      currentInfo.visible = false;
    }
  }

  /**
   * Validar que una sección es realmente visible
   */
  async validateSectionVisibility(sectionElement) {
    // Esperar un frame para que se apliquen los estilos
    await new Promise(resolve => requestAnimationFrame(resolve));
    
    const rect = sectionElement.getBoundingClientRect();
    const computedStyle = window.getComputedStyle(sectionElement);
    
    const isVisible = (
      computedStyle.display !== 'none' &&
      computedStyle.visibility !== 'hidden' &&
      computedStyle.opacity !== '0' &&
      rect.width > 0 &&
      rect.height > 0
    );
    
    this.log(`🔍 Validación visibilidad: ${isVisible ? '✅ VISIBLE' : '❌ OCULTA'}`);
    return isVisible;
  }

  /**
   * Verificar si un elemento es visible
   */
  isElementVisible(element) {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      rect.width > 0 &&
      rect.height > 0
    );
  }

  /**
   * Actualizar navegación activa
   */
  updateActiveNavigation(activeSectionId) {
    // Remover active de todos los enlaces
    document.querySelectorAll('[data-section], .nav-link').forEach(link => {
      link.classList.remove('active', 'current');
    });
    
    // Agregar active a enlaces correspondientes
    document.querySelectorAll(`[data-section="${activeSectionId}"]`).forEach(link => {
      link.classList.add('active', 'current');
    });
  }

  /**
   * Modo de emergencia - último recurso
   */
  emergencyShowSection(sectionId) {
    this.log(`🚨 MODO DE EMERGENCIA para sección: ${sectionId}`);
    
    try {
      // Ocultar todas las secciones
      document.querySelectorAll('.section').forEach(section => {
        section.style.display = 'none';
        section.classList.remove('active');
      });
      
      // Mostrar sección objetivo con fuerza bruta
      const targetSection = document.getElementById(sectionId);
      if (targetSection) {
        targetSection.style.cssText = `
          display: block !important;
          visibility: visible !important;
          opacity: 1 !important;
          position: relative !important;
          z-index: 999 !important;
        `;
        targetSection.classList.add('active', 'force-visible');
        
        this.currentSection = sectionId;
        this.log(`🚨 Emergencia exitosa: ${sectionId}`);
        return true;
      }
    } catch (error) {
      this.error('❌ Modo de emergencia falló:', error);
    }
    
    return false;
  }

  /**
   * Configurar auto-reparación
   */
  setupAutoRepair() {
    // Verificar cada 5 segundos si la navegación funciona
    setInterval(() => {
      this.performHealthCheck();
    }, 5000);
  }

  /**
   * Verificación de salud del sistema
   */
  performHealthCheck() {
    if (!this.currentSection) return;
    
    const currentInfo = this.sections.get(this.currentSection);
    if (currentInfo) {
      const isVisible = this.isElementVisible(currentInfo.element);
      
      if (!isVisible && currentInfo.visible) {
        this.log('🔧 Auto-reparación: Sección actual no visible, reparando...');
        this.showSectionRobust(this.currentSection);
      }
    }
  }

  /**
   * Validar estado inicial
   */
  validateInitialState() {
    // Asegurar que dashboard esté visible por defecto
    const dashboard = document.getElementById('dashboard');
    if (dashboard) {
      dashboard.classList.add('active');
      dashboard.style.display = 'block';
    }
    
    // Ocultar otras secciones
    this.sections.forEach((info, sectionId) => {
      if (sectionId !== 'dashboard') {
        info.element.classList.remove('active');
        info.element.style.display = 'none';
      }
    });
  }

  /**
   * Configurar monitoreo continuo
   */
  setupContinuousMonitoring() {
    // Observer para cambios en el DOM
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' || mutation.type === 'attributes') {
          // Re-descubrir secciones si hay cambios
          this.discoverSections();
        }
      });
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'id']
    });
  }

  /**
   * Logging robusto
   */
  log(message, ...args) {
    if (this.debugMode) {
      console.log(`🛡️ [RobustNav] ${message}`, ...args);
    }
  }

  error(message, ...args) {
    console.error(`🚨 [RobustNav] ${message}`, ...args);
  }
}

// Inicializar sistema robusto
const robustNavigation = new RobustNavigationSystem();

// Exportar para compatibilidad
window.robustNavigation = robustNavigation;
window.showSection = (sectionId) => robustNavigation.showSectionRobust(sectionId);

export { robustNavigation };

