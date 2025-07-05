/**
 * CORE NAVIGATION SYSTEM - SOLUCIÓN ESTRUCTURAL ROBUSTA
 * =====================================================
 * 
 * Este sistema está diseñado para ser:
 * 1. A prueba de errores futuros
 * 2. Independiente de otros scripts
 * 3. Auto-diagnóstico y auto-reparación
 * 4. Completamente documentado
 * 5. Resistente a cambios en el código
 */

class NavigationSystem {
  constructor() {
    this.isInitialized = false;
    this.sections = new Map();
    this.navLinks = new Map();
    this.currentSection = null;
    this.debugMode = true;
    
    this.log('🚀 NavigationSystem constructor called');
    this.init();
  }

  /**
   * Inicialización del sistema
   */
  init() {
    this.log('🔧 Initializing NavigationSystem...');
    
    try {
      // Esperar a que el DOM esté completamente cargado
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.setup());
      } else {
        this.setup();
      }
    } catch (error) {
      this.error('❌ Error in init:', error);
    }
  }

  /**
   * Configuración principal del sistema
   */
  setup() {
    this.log('⚙️ Setting up navigation system...');
    
    try {
      // 1. Descubrir y mapear todas las secciones
      this.discoverSections();
      
      // 2. Descubrir y mapear todos los enlaces de navegación
      this.discoverNavLinks();
      
      // 3. Validar la integridad del sistema
      this.validateSystem();
      
      // 4. Configurar event listeners
      this.setupEventListeners();
      
      // 5. Configurar navegación por URL hash
      this.setupHashNavigation();
      
      // 6. Mostrar sección inicial
      this.showInitialSection();
      
      // 7. Marcar como inicializado
      this.isInitialized = true;
      
      this.log('✅ NavigationSystem setup completed successfully');
      this.logSystemStatus();
      
    } catch (error) {
      this.error('❌ Error in setup:', error);
      this.attemptRecovery();
    }
  }

  /**
   * Descubrir todas las secciones disponibles
   */
  discoverSections() {
    this.log('🔍 Discovering sections...');
    
    const sectionElements = document.querySelectorAll('.section[id]');
    this.sections.clear();
    
    sectionElements.forEach(section => {
      const id = section.id;
      this.sections.set(id, {
        element: section,
        id: id,
        title: this.extractSectionTitle(section),
        isVisible: !section.style.display || section.style.display !== 'none'
      });
      
      this.log(`📄 Found section: ${id}`);
    });
    
    this.log(`📊 Total sections discovered: ${this.sections.size}`);
  }

  /**
   * Descubrir todos los enlaces de navegación
   */
  discoverNavLinks() {
    this.log('🔗 Discovering navigation links...');
    
    const linkElements = document.querySelectorAll('.nav-link[data-section]');
    this.navLinks.clear();
    
    linkElements.forEach(link => {
      const sectionId = link.getAttribute('data-section');
      this.navLinks.set(sectionId, {
        element: link,
        sectionId: sectionId,
        text: link.textContent.trim()
      });
      
      this.log(`🔗 Found nav link: ${sectionId} -> "${link.textContent.trim()}"`);
    });
    
    this.log(`📊 Total nav links discovered: ${this.navLinks.size}`);
  }

  /**
   * Validar la integridad del sistema
   */
  validateSystem() {
    this.log('🔍 Validating system integrity...');
    
    const issues = [];
    
    // Verificar que cada enlace tenga su sección correspondiente
    for (const [sectionId, linkData] of this.navLinks) {
      if (!this.sections.has(sectionId)) {
        issues.push(`Missing section for nav link: ${sectionId}`);
      }
    }
    
    // Verificar que cada sección tenga su enlace correspondiente
    for (const [sectionId, sectionData] of this.sections) {
      if (!this.navLinks.has(sectionId)) {
        this.log(`⚠️ Warning: Section ${sectionId} has no navigation link`);
      }
    }
    
    if (issues.length > 0) {
      this.error('❌ System validation failed:', issues);
      throw new Error(`Navigation system validation failed: ${issues.join(', ')}`);
    }
    
    this.log('✅ System validation passed');
  }

  /**
   * Configurar event listeners
   */
  setupEventListeners() {
    this.log('🎯 Setting up event listeners...');
    
    for (const [sectionId, linkData] of this.navLinks) {
      const link = linkData.element;
      
      // Remover listeners existentes
      link.removeEventListener('click', this.handleNavClick.bind(this));
      
      // Agregar nuevo listener
      link.addEventListener('click', (event) => this.handleNavClick(event, sectionId));
      
      // Marcar como configurado
      link.setAttribute('data-nav-configured', 'true');
      
      this.log(`🎯 Event listener configured for: ${sectionId}`);
    }
  }

  /**
   * Configurar navegación por URL hash
   */
  setupHashNavigation() {
    this.log('🔗 Setting up hash navigation...');
    
    window.addEventListener('hashchange', () => {
      const hash = window.location.hash.substring(1);
      if (hash && this.sections.has(hash)) {
        this.showSection(hash);
      }
    });
  }

  /**
   * Manejador de clicks en navegación
   */
  handleNavClick(event, sectionId) {
    event.preventDefault();
    
    this.log(`🖱️ Navigation clicked: ${sectionId}`);
    
    try {
      this.showSection(sectionId);
      
      // Actualizar URL hash
      if (history.pushState) {
        history.pushState(null, null, `#${sectionId}`);
      } else {
        window.location.hash = sectionId;
      }
      
    } catch (error) {
      this.error('❌ Error handling nav click:', error);
    }
  }

  /**
   * Mostrar una sección específica
   */
  showSection(sectionId) {
    this.log(`📍 Showing section: ${sectionId}`);
    
    try {
      // Verificar que la sección existe
      if (!this.sections.has(sectionId)) {
        throw new Error(`Section not found: ${sectionId}`);
      }
      
      // Ocultar todas las secciones
      this.hideAllSections();
      
      // Mostrar la sección seleccionada
      const sectionData = this.sections.get(sectionId);
      const sectionElement = sectionData.element;
      
      sectionElement.style.display = 'block';
      sectionElement.classList.add('active');
      
      // Actualizar navegación activa
      this.updateActiveNavigation(sectionId);
      
      // Actualizar estado interno
      this.currentSection = sectionId;
      
      // Cargar contenido específico de la sección
      this.loadSectionContent(sectionId);
      
      this.log(`✅ Section ${sectionId} shown successfully`);
      
    } catch (error) {
      this.error('❌ Error showing section:', error);
      this.attemptRecovery();
    }
  }

  /**
   * Ocultar todas las secciones
   */
  hideAllSections() {
    for (const [sectionId, sectionData] of this.sections) {
      const element = sectionData.element;
      element.style.display = 'none';
      element.classList.remove('active');
    }
  }

  /**
   * Actualizar navegación activa
   */
  updateActiveNavigation(activeSectionId) {
    // Remover clase active de todos los enlaces
    for (const [sectionId, linkData] of this.navLinks) {
      linkData.element.classList.remove('active');
    }
    
    // Agregar clase active al enlace correspondiente
    if (this.navLinks.has(activeSectionId)) {
      this.navLinks.get(activeSectionId).element.classList.add('active');
    }
  }

  /**
   * Cargar contenido específico de cada sección
   */
  loadSectionContent(sectionId) {
    this.log(`📦 Loading content for section: ${sectionId}`);
    
    try {
      // Agregar mensaje de confirmación visual
      this.addSectionStatusMessage(sectionId);
      
      // Aquí se pueden agregar cargas específicas por sección
      switch (sectionId) {
        case 'dashboard':
          this.log('📊 Dashboard content ready');
          break;
        case 'estudiar':
          this.log('📚 Study section ready');
          break;
        case 'crear':
          this.log('✏️ Create section ready');
          break;
        case 'gestionar':
          this.log('⚙️ Manage section ready');
          break;
        case 'ranking':
          this.log('🏆 Ranking section ready');
          break;
        default:
          this.log(`❓ Unknown section: ${sectionId}`);
      }
      
    } catch (error) {
      this.error('❌ Error loading section content:', error);
    }
  }

  /**
   * Agregar mensaje de estado a una sección
   */
  addSectionStatusMessage(sectionId) {
    const sectionData = this.sections.get(sectionId);
    if (!sectionData) return;
    
    const section = sectionData.element;
    const existingMessage = section.querySelector('.nav-status-message');
    
    if (!existingMessage) {
      const messageDiv = document.createElement('div');
      messageDiv.className = 'nav-status-message';
      messageDiv.style.cssText = `
        background: linear-gradient(135deg, #27ae60, #2ecc71);
        color: white;
        padding: 0.75rem 1.5rem;
        margin: 1rem 0;
        border-radius: 8px;
        font-weight: 500;
        text-align: center;
        box-shadow: 0 2px 10px rgba(39, 174, 96, 0.3);
        animation: slideInFromTop 0.5s ease-out;
      `;
      
      messageDiv.innerHTML = `
        <span style="margin-right: 0.5rem;">✅</span>
        Sección "${sectionData.title || sectionId}" cargada correctamente
      `;
      
      // Insertar al principio de la sección
      section.insertBefore(messageDiv, section.firstChild);
      
      // Remover el mensaje después de 3 segundos
      setTimeout(() => {
        if (messageDiv.parentNode) {
          messageDiv.style.animation = 'fadeOut 0.5s ease-out';
          setTimeout(() => messageDiv.remove(), 500);
        }
      }, 3000);
    }
  }

  /**
   * Mostrar sección inicial
   */
  showInitialSection() {
    this.log('🏠 Showing initial section...');
    
    // Verificar si hay hash en la URL
    const hash = window.location.hash.substring(1);
    if (hash && this.sections.has(hash)) {
      this.showSection(hash);
      return;
    }
    
    // Mostrar dashboard por defecto
    if (this.sections.has('dashboard')) {
      this.showSection('dashboard');
    } else {
      // Mostrar la primera sección disponible
      const firstSection = this.sections.keys().next().value;
      if (firstSection) {
        this.showSection(firstSection);
      }
    }
  }

  /**
   * Extraer título de una sección
   */
  extractSectionTitle(sectionElement) {
    const titleElement = sectionElement.querySelector('h1, h2, h3, .section-title, .hero-title');
    return titleElement ? titleElement.textContent.trim() : sectionElement.id;
  }

  /**
   * Intentar recuperación del sistema
   */
  attemptRecovery() {
    this.log('🔄 Attempting system recovery...');
    
    try {
      // Reinicializar después de un breve delay
      setTimeout(() => {
        this.setup();
      }, 1000);
      
    } catch (error) {
      this.error('❌ Recovery failed:', error);
    }
  }

  /**
   * Logging del estado del sistema
   */
  logSystemStatus() {
    this.log('📊 SYSTEM STATUS:');
    this.log(`   - Sections: ${this.sections.size}`);
    this.log(`   - Nav Links: ${this.navLinks.size}`);
    this.log(`   - Current Section: ${this.currentSection}`);
    this.log(`   - Initialized: ${this.isInitialized}`);
  }

  /**
   * Método de logging
   */
  log(message) {
    if (this.debugMode) {
      console.log(`[NavigationSystem] ${message}`);
    }
  }

  /**
   * Método de logging de errores
   */
  error(message, error = null) {
    console.error(`[NavigationSystem] ${message}`, error);
  }

  /**
   * API pública para debugging
   */
  getStatus() {
    return {
      isInitialized: this.isInitialized,
      sectionsCount: this.sections.size,
      navLinksCount: this.navLinks.size,
      currentSection: this.currentSection,
      sections: Array.from(this.sections.keys()),
      navLinks: Array.from(this.navLinks.keys())
    };
  }

  /**
   * Forzar navegación (para debugging)
   */
  forceShowSection(sectionId) {
    this.log(`🔧 Force showing section: ${sectionId}`);
    this.showSection(sectionId);
  }
}

// Agregar estilos CSS para animaciones
const style = document.createElement('style');
style.textContent = `
  @keyframes slideInFromTop {
    from {
      opacity: 0;
      transform: translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes fadeOut {
    from {
      opacity: 1;
    }
    to {
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

// Inicializar el sistema de navegación
const navigationSystem = new NavigationSystem();

// Hacer disponible globalmente para debugging
window.NavigationSystem = NavigationSystem;
window.navigationSystem = navigationSystem;

console.log('✅ Core Navigation System loaded successfully');

