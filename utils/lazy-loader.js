/**
 * Lazy Loader Utility
 * Implementa lazy loading para imágenes, módulos y componentes
 */

class LazyLoader {
  constructor() {
    this.imageObserver = null;
    this.moduleCache = new Map();
    this.loadedModules = new Set();
    
    this.init();
  }
  
  /**
   * Inicializar lazy loader
   */
  init() {
    // Configurar Intersection Observer para imágenes
    if ('IntersectionObserver' in window) {
      this.setupImageObserver();
    } else {
      // Fallback para navegadores sin soporte
      this.loadAllImages();
    }
    
    // Configurar lazy loading de módulos
    this.setupModuleLazyLoading();
  }
  
  /**
   * Configurar observer para imágenes
   */
  setupImageObserver() {
    const options = {
      root: null,
      rootMargin: '50px', // Cargar 50px antes de que sea visible
      threshold: 0.1
    };
    
    this.imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.loadImage(entry.target);
          this.imageObserver.unobserve(entry.target);
        }
      });
    }, options);
    
    // Observar todas las imágenes lazy
    this.observeImages();
  }
  
  /**
   * Observar imágenes para lazy loading
   */
  observeImages() {
    const lazyImages = document.querySelectorAll('img[data-src], img[loading="lazy"]');
    
    lazyImages.forEach(img => {
      this.imageObserver.observe(img);
    });
  }
  
  /**
   * Cargar imagen individual
   */
  loadImage(img) {
    return new Promise((resolve, reject) => {
      const imageLoader = new Image();
      
      imageLoader.onload = () => {
        // Aplicar la imagen cargada
        if (img.dataset.src) {
          img.src = img.dataset.src;
          img.removeAttribute('data-src');
        }
        
        // Agregar clase de cargado para animaciones
        img.classList.add('loaded');
        
        // Remover placeholder si existe
        const placeholder = img.previousElementSibling;
        if (placeholder && placeholder.classList.contains('image-placeholder')) {
          placeholder.style.opacity = '0';
          setTimeout(() => placeholder.remove(), 300);
        }
        
        resolve(img);
      };
      
      imageLoader.onerror = () => {
        // Mostrar imagen de error o placeholder
        img.src = this.getErrorImageSrc();
        img.classList.add('error');
        reject(new Error(`Failed to load image: ${img.dataset.src || img.src}`));
      };
      
      // Iniciar carga
      imageLoader.src = img.dataset.src || img.src;
    });
  }
  
  /**
   * Cargar todas las imágenes (fallback)
   */
  loadAllImages() {
    const lazyImages = document.querySelectorAll('img[data-src]');
    
    lazyImages.forEach(img => {
      this.loadImage(img);
    });
  }
  
  /**
   * Obtener imagen de error por defecto
   */
  getErrorImageSrc() {
    return 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMDAgNzBMMTMwIDEzMEg3MEwxMDAgNzBaIiBmaWxsPSIjOUI5QkEwIi8+CjxjaXJjbGUgY3g9IjEwMCIgY3k9IjEwMCIgcj0iNDAiIHN0cm9rZT0iIzlCOUJBMCIgc3Ryb2tlLXdpZHRoPSIyIiBmaWxsPSJub25lIi8+Cjwvc3ZnPgo=';
  }
  
  /**
   * Configurar lazy loading de módulos
   */
  setupModuleLazyLoading() {
    // Precargar módulos críticos
    this.preloadCriticalModules();
    
    // Configurar carga bajo demanda
    this.setupOnDemandLoading();
  }
  
  /**
   * Precargar módulos críticos
   */
  async preloadCriticalModules() {
    const criticalModules = [
      './utils/helpers.js',
      './utils/validation.js'
    ];
    
    for (const modulePath of criticalModules) {
      try {
        await this.loadModule(modulePath);
      } catch (error) {
        console.warn(`Failed to preload critical module: ${modulePath}`, error);
      }
    }
  }
  
  /**
   * Configurar carga de módulos bajo demanda
   */
  setupOnDemandLoading() {
    // Configurar triggers para diferentes secciones
    const triggers = {
      '#study-section': './study.service.js',
      '#create-section': './create.service.js',
      '#dashboard-section': './dashboard.service.js',
      '#stats-section': './stats.service.js'
    };
    
    Object.entries(triggers).forEach(([selector, modulePath]) => {
      this.setupSectionTrigger(selector, modulePath);
    });
  }
  
  /**
   * Configurar trigger para sección específica
   */
  setupSectionTrigger(selector, modulePath) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.loadModule(modulePath);
          observer.unobserve(entry.target);
        }
      });
    }, {
      rootMargin: '100px' // Cargar 100px antes de que sea visible
    });
    
    // Observar cuando el elemento aparezca en DOM
    const checkElement = () => {
      const element = document.querySelector(selector);
      if (element) {
        observer.observe(element);
      } else {
        // Reintentar después de un tiempo si el elemento no existe
        setTimeout(checkElement, 1000);
      }
    };
    
    checkElement();
  }
  
  /**
   * Cargar módulo dinámicamente
   */
  async loadModule(modulePath) {
    // Verificar si ya está cargado
    if (this.loadedModules.has(modulePath)) {
      return this.moduleCache.get(modulePath);
    }
    
    try {
      console.log(`[LazyLoader] Loading module: ${modulePath}`);
      
      const module = await import(modulePath);
      
      // Cachear el módulo
      this.moduleCache.set(modulePath, module);
      this.loadedModules.add(modulePath);
      
      console.log(`[LazyLoader] Module loaded successfully: ${modulePath}`);
      
      return module;
      
    } catch (error) {
      console.error(`[LazyLoader] Failed to load module: ${modulePath}`, error);
      throw error;
    }
  }
  
  /**
   * Cargar componente bajo demanda
   */
  async loadComponent(componentName, containerSelector) {
    try {
      const modulePath = `./components/${componentName}.js`;
      const module = await this.loadModule(modulePath);
      
      // Verificar que el módulo tenga la función de inicialización esperada
      if (module.default && typeof module.default === 'function') {
        const container = document.querySelector(containerSelector);
        if (container) {
          await module.default(container);
        }
      }
      
      return module;
      
    } catch (error) {
      console.error(`[LazyLoader] Failed to load component: ${componentName}`, error);
      throw error;
    }
  }
  
  /**
   * Precargar recursos para la siguiente navegación
   */
  preloadForNavigation(targetSection) {
    const preloadMap = {
      'study': ['./study.service.js', './utils/algorithms.js'],
      'create': ['./create.service.js', './utils/validation.js'],
      'dashboard': ['./dashboard.service.js', './utils/charts.js'],
      'stats': ['./stats.service.js', './utils/analytics.js']
    };
    
    const modules = preloadMap[targetSection];
    if (modules) {
      modules.forEach(modulePath => {
        this.loadModule(modulePath).catch(error => {
          console.warn(`Failed to preload for navigation: ${modulePath}`, error);
        });
      });
    }
  }
  
  /**
   * Crear placeholder para imagen
   */
  createImagePlaceholder(width, height, text = 'Cargando...') {
    const placeholder = document.createElement('div');
    placeholder.className = 'image-placeholder';
    placeholder.style.cssText = `
      width: ${width}px;
      height: ${height}px;
      background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
      background-size: 200% 100%;
      animation: loading 1.5s infinite;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #999;
      font-size: 14px;
      border-radius: 4px;
    `;
    placeholder.textContent = text;
    
    return placeholder;
  }
  
  /**
   * Agregar imagen lazy con placeholder
   */
  addLazyImage(container, src, alt, width, height) {
    // Crear placeholder
    const placeholder = this.createImagePlaceholder(width, height);
    container.appendChild(placeholder);
    
    // Crear imagen lazy
    const img = document.createElement('img');
    img.dataset.src = src;
    img.alt = alt;
    img.style.cssText = `
      width: ${width}px;
      height: ${height}px;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;
    
    img.addEventListener('load', () => {
      img.style.opacity = '1';
    });
    
    container.appendChild(img);
    
    // Observar para lazy loading
    if (this.imageObserver) {
      this.imageObserver.observe(img);
    } else {
      this.loadImage(img);
    }
    
    return img;
  }
  
  /**
   * Obtener estadísticas de carga
   */
  getStats() {
    return {
      loadedModules: this.loadedModules.size,
      cachedModules: this.moduleCache.size,
      moduleList: Array.from(this.loadedModules)
    };
  }
}

// Agregar estilos CSS para animaciones
const lazyStyles = document.createElement('style');
lazyStyles.textContent = `
  @keyframes loading {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }
  
  img.loaded {
    opacity: 1 !important;
  }
  
  img.error {
    opacity: 0.5;
    filter: grayscale(100%);
  }
  
  .image-placeholder {
    transition: opacity 0.3s ease;
  }
`;

document.head.appendChild(lazyStyles);

// Crear instancia global
const lazyLoader = new LazyLoader();

// Exportar para uso en otros módulos
export default lazyLoader;

