/**
 * PWA Installer y Service Worker Registration
 * StudyingFlash - Manejo de instalación y cache
 */

class PWAInstaller {
  constructor() {
    this.deferredPrompt = null;
    this.isInstalled = false;
    this.swRegistration = null;
    
    this.init();
  }
  
  /**
   * Inicializar PWA
   */
  async init() {
    // Verificar soporte de Service Worker
    if ('serviceWorker' in navigator) {
      await this.registerServiceWorker();
    } else {
      console.warn('[PWA] Service Worker no soportado');
    }
    
    // Configurar eventos de instalación
    this.setupInstallPrompt();
    
    // Verificar si ya está instalado
    this.checkIfInstalled();
    
    // Mostrar UI de instalación si corresponde
    this.setupInstallUI();
  }
  
  /**
   * Registrar Service Worker
   */
  async registerServiceWorker() {
    try {
      console.log('[PWA] Registrando Service Worker...');
      
      this.swRegistration = await navigator.serviceWorker.register('./sw.js', {
        scope: './'
      });
      
      console.log('[PWA] Service Worker registrado:', this.swRegistration.scope);
      
      // Manejar actualizaciones
      this.swRegistration.addEventListener('updatefound', () => {
        this.handleServiceWorkerUpdate();
      });
      
      // Verificar si hay actualizaciones
      this.swRegistration.update();
      
    } catch (error) {
      console.error('[PWA] Error registrando Service Worker:', error);
    }
  }
  
  /**
   * Manejar actualizaciones del Service Worker
   */
  handleServiceWorkerUpdate() {
    const newWorker = this.swRegistration.installing;
    
    newWorker.addEventListener('statechange', () => {
      if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
        // Hay una nueva versión disponible
        this.showUpdateAvailable();
      }
    });
  }
  
  /**
   * Mostrar notificación de actualización disponible
   */
  showUpdateAvailable() {
    const updateBanner = document.createElement('div');
    updateBanner.className = 'update-banner';
    updateBanner.innerHTML = `
      <div class="update-content">
        <span>📱 Nueva versión disponible</span>
        <button class="update-btn" onclick="pwaInstaller.applyUpdate()">
          Actualizar
        </button>
        <button class="dismiss-btn" onclick="this.parentElement.parentElement.remove()">
          ✕
        </button>
      </div>
    `;
    
    // Agregar estilos
    updateBanner.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      background: #2563eb;
      color: white;
      padding: 12px;
      z-index: 10000;
      text-align: center;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    `;
    
    document.body.appendChild(updateBanner);
  }
  
  /**
   * Aplicar actualización del Service Worker
   */
  async applyUpdate() {
    if (this.swRegistration && this.swRegistration.waiting) {
      // Enviar mensaje al SW para que se active
      this.swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      
      // Recargar página cuando el nuevo SW tome control
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    }
  }
  
  /**
   * Configurar prompt de instalación
   */
  setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('[PWA] Install prompt disponible');
      
      // Prevenir el prompt automático
      e.preventDefault();
      
      // Guardar el evento para uso posterior
      this.deferredPrompt = e;
      
      // Mostrar botón de instalación personalizado
      this.showInstallButton();
    });
    
    // Detectar cuando se instala
    window.addEventListener('appinstalled', () => {
      console.log('[PWA] App instalada exitosamente');
      this.isInstalled = true;
      this.hideInstallButton();
      this.showInstalledMessage();
    });
  }
  
  /**
   * Verificar si la app ya está instalada
   */
  checkIfInstalled() {
    // Verificar si se ejecuta en modo standalone
    if (window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true) {
      this.isInstalled = true;
      console.log('[PWA] App ejecutándose en modo instalado');
    }
  }
  
  /**
   * Configurar UI de instalación
   */
  setupInstallUI() {
    // Crear botón de instalación si no está instalado
    if (!this.isInstalled) {
      this.createInstallButton();
    }
    
    // Crear indicador de estado offline/online
    this.createConnectionIndicator();
  }
  
  /**
   * Crear botón de instalación
   */
  createInstallButton() {
    const installBtn = document.createElement('button');
    installBtn.id = 'pwa-install-btn';
    installBtn.className = 'pwa-install-btn hidden';
    installBtn.innerHTML = `
      <span class="install-icon">📱</span>
      <span class="install-text">Instalar App</span>
    `;
    
    installBtn.addEventListener('click', () => this.promptInstall());
    
    // Estilos del botón
    installBtn.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #2563eb;
      color: white;
      border: none;
      border-radius: 50px;
      padding: 12px 20px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
      transition: all 0.3s ease;
      z-index: 1000;
      display: flex;
      align-items: center;
      gap: 8px;
    `;
    
    document.body.appendChild(installBtn);
  }
  
  /**
   * Mostrar botón de instalación
   */
  showInstallButton() {
    const btn = document.getElementById('pwa-install-btn');
    if (btn) {
      btn.classList.remove('hidden');
      btn.style.transform = 'translateY(0)';
      btn.style.opacity = '1';
    }
  }
  
  /**
   * Ocultar botón de instalación
   */
  hideInstallButton() {
    const btn = document.getElementById('pwa-install-btn');
    if (btn) {
      btn.style.transform = 'translateY(100px)';
      btn.style.opacity = '0';
      setTimeout(() => btn.remove(), 300);
    }
  }
  
  /**
   * Mostrar prompt de instalación
   */
  async promptInstall() {
    if (!this.deferredPrompt) {
      console.log('[PWA] Install prompt no disponible');
      return;
    }
    
    try {
      // Mostrar el prompt
      this.deferredPrompt.prompt();
      
      // Esperar la respuesta del usuario
      const { outcome } = await this.deferredPrompt.userChoice;
      
      console.log('[PWA] Install prompt result:', outcome);
      
      if (outcome === 'accepted') {
        console.log('[PWA] Usuario aceptó instalar');
      } else {
        console.log('[PWA] Usuario rechazó instalar');
      }
      
      // Limpiar el prompt
      this.deferredPrompt = null;
      this.hideInstallButton();
      
    } catch (error) {
      console.error('[PWA] Error en install prompt:', error);
    }
  }
  
  /**
   * Mostrar mensaje de instalación exitosa
   */
  showInstalledMessage() {
    const message = document.createElement('div');
    message.className = 'install-success';
    message.innerHTML = `
      <div class="success-content">
        <span class="success-icon">✅</span>
        <span>¡App instalada exitosamente!</span>
      </div>
    `;
    
    message.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #10b981;
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
      z-index: 10000;
      animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(message);
    
    // Remover después de 3 segundos
    setTimeout(() => {
      message.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => message.remove(), 300);
    }, 3000);
  }
  
  /**
   * Crear indicador de conexión
   */
  createConnectionIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'connection-indicator';
    indicator.className = 'connection-indicator';
    
    indicator.style.cssText = `
      position: fixed;
      top: 10px;
      left: 10px;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 500;
      z-index: 1000;
      transition: all 0.3s ease;
      opacity: 0;
      transform: translateY(-20px);
    `;
    
    document.body.appendChild(indicator);
    
    // Configurar eventos de conexión
    this.setupConnectionEvents();
  }
  
  /**
   * Configurar eventos de conexión
   */
  setupConnectionEvents() {
    const updateConnectionStatus = () => {
      const indicator = document.getElementById('connection-indicator');
      if (!indicator) return;
      
      if (navigator.onLine) {
        indicator.textContent = '🟢 Online';
        indicator.style.background = '#10b981';
        indicator.style.color = 'white';
        
        // Ocultar después de 2 segundos si está online
        setTimeout(() => {
          indicator.style.opacity = '0';
          indicator.style.transform = 'translateY(-20px)';
        }, 2000);
      } else {
        indicator.textContent = '🔴 Offline';
        indicator.style.background = '#ef4444';
        indicator.style.color = 'white';
        indicator.style.opacity = '1';
        indicator.style.transform = 'translateY(0)';
      }
    };
    
    // Eventos de conexión
    window.addEventListener('online', updateConnectionStatus);
    window.addEventListener('offline', updateConnectionStatus);
    
    // Estado inicial
    updateConnectionStatus();
  }
  
  /**
   * Obtener estado del cache
   */
  async getCacheStatus() {
    if (!this.swRegistration) return null;
    
    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        if (event.data.type === 'CACHE_STATUS') {
          resolve(event.data.payload);
        }
      };
      
      this.swRegistration.active.postMessage(
        { type: 'GET_CACHE_STATUS' },
        [messageChannel.port2]
      );
    });
  }
  
  /**
   * Limpiar cache
   */
  async clearCache() {
    if (!this.swRegistration) return;
    
    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();
      
      messageChannel.port1.onmessage = (event) => {
        if (event.data.type === 'CACHE_CLEARED') {
          resolve();
        }
      };
      
      this.swRegistration.active.postMessage(
        { type: 'CLEAR_CACHE' },
        [messageChannel.port2]
      );
    });
  }
}

// Agregar estilos CSS para animaciones
const pwaStyles = document.createElement('style');
pwaStyles.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }
  
  .pwa-install-btn.hidden {
    transform: translateY(100px);
    opacity: 0;
  }
  
  .pwa-install-btn:hover {
    background: #1d4ed8 !important;
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(37, 99, 235, 0.4) !important;
  }
  
  .update-content {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
  }
  
  .update-btn {
    background: white;
    color: #2563eb;
    border: none;
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 500;
  }
  
  .dismiss-btn {
    background: none;
    border: none;
    color: white;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
  }
  
  .success-content {
    display: flex;
    align-items: center;
    gap: 8px;
  }
`;

document.head.appendChild(pwaStyles);

// Inicializar PWA cuando el DOM esté listo
let pwaInstaller;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    pwaInstaller = new PWAInstaller();
  });
} else {
  pwaInstaller = new PWAInstaller();
}

// Exportar para uso global
window.pwaInstaller = pwaInstaller;

