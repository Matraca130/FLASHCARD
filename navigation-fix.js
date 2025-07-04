// navigation-fix.js - Solución definitiva para la navegación
console.log('🔧 Loading navigation fix...');

// Función principal para mostrar secciones
function showSection(sectionName) {
  console.log('📍 Showing section:', sectionName);
  
  try {
    // Ocultar todas las secciones
    const allSections = document.querySelectorAll('.section');
    console.log('📋 Found sections:', allSections.length);
    
    allSections.forEach(section => {
      section.style.display = 'none';
      section.classList.remove('active');
      console.log('🔒 Hidden section:', section.id);
    });
    
    // Mostrar la sección seleccionada
    const targetSection = document.getElementById(sectionName);
    if (targetSection) {
      targetSection.style.display = 'block';
      targetSection.classList.add('active');
      console.log('✅ Section shown successfully:', sectionName);
      
      // Actualizar navegación activa
      updateActiveNavigation(sectionName);
      
      // Cargar contenido específico si es necesario
      loadSectionContent(sectionName);
      
    } else {
      console.error('❌ Section not found:', sectionName);
      console.log('Available sections:', Array.from(document.querySelectorAll('.section')).map(s => s.id));
    }
    
  } catch (error) {
    console.error('❌ Error in showSection:', error);
  }
}

// Actualizar navegación activa
function updateActiveNavigation(sectionName) {
  try {
    // Remover clase active de todos los enlaces
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      link.classList.remove('active');
    });
    
    // Agregar clase active al enlace correspondiente
    const activeLink = document.querySelector(`[data-section="${sectionName}"]`);
    if (activeLink) {
      activeLink.classList.add('active');
      console.log('🎯 Updated active navigation for:', sectionName);
    }
  } catch (error) {
    console.error('❌ Error updating navigation:', error);
  }
}

// Cargar contenido específico de cada sección
function loadSectionContent(sectionName) {
  console.log('📦 Loading content for section:', sectionName);
  
  try {
    switch (sectionName) {
      case 'dashboard':
        console.log('📊 Dashboard content ready');
        break;
        
      case 'estudiar':
        console.log('📚 Study section ready');
        // Agregar mensaje de confirmación
        addSectionMessage('estudiar', '✅ Sección de Estudiar cargada correctamente', 'success');
        break;
        
      case 'crear':
        console.log('✏️ Create section ready');
        // Agregar mensaje de confirmación
        addSectionMessage('crear', '✅ Sección de Crear cargada correctamente', 'success');
        break;
        
      case 'gestionar':
        console.log('⚙️ Manage section ready');
        // Agregar mensaje de confirmación
        addSectionMessage('gestionar', '✅ Sección de Gestionar cargada correctamente', 'success');
        break;
        
      case 'ranking':
        console.log('🏆 Ranking section ready');
        break;
        
      default:
        console.log('❓ Unknown section:', sectionName);
    }
  } catch (error) {
    console.error('❌ Error loading section content:', error);
  }
}

// Agregar mensaje de confirmación a una sección
function addSectionMessage(sectionId, message, type = 'info') {
  try {
    const section = document.getElementById(sectionId);
    if (section && !section.querySelector('.section-message')) {
      const messageDiv = document.createElement('div');
      messageDiv.className = `section-message ${type}`;
      messageDiv.style.cssText = `
        background: rgba(46, 204, 113, 0.1);
        border: 1px solid rgba(46, 204, 113, 0.3);
        border-radius: 8px;
        padding: 1rem;
        margin: 1rem 0;
        color: #27ae60;
        font-weight: 500;
        text-align: center;
      `;
      messageDiv.innerHTML = `<p style="margin: 0;">${message}</p>`;
      
      // Insertar al principio de la sección
      const firstChild = section.querySelector('.section-header') || section.firstElementChild;
      if (firstChild) {
        firstChild.after(messageDiv);
      } else {
        section.appendChild(messageDiv);
      }
    }
  } catch (error) {
    console.error('❌ Error adding section message:', error);
  }
}

// Inicializar navegación
function initNavigation() {
  console.log('🚀 Initializing navigation system...');
  
  try {
    // Buscar todos los enlaces de navegación
    const navLinks = document.querySelectorAll('.nav-link[data-section]');
    console.log('🔗 Found navigation links:', navLinks.length);
    
    // Agregar event listeners
    navLinks.forEach((link, index) => {
      const section = link.getAttribute('data-section');
      console.log(`🔗 Setting up link ${index + 1}: ${section}`);
      
      // Remover listeners existentes
      link.removeEventListener('click', handleNavClick);
      
      // Agregar nuevo listener
      link.addEventListener('click', handleNavClick);
      
      // Agregar atributo para debugging
      link.setAttribute('data-nav-setup', 'true');
    });
    
    // Mostrar dashboard por defecto
    showSection('dashboard');
    
    console.log('✅ Navigation system initialized successfully');
    
    // Test de funcionalidad
    setTimeout(() => {
      console.log('🧪 Running navigation test...');
      const testLinks = document.querySelectorAll('.nav-link[data-nav-setup="true"]');
      console.log('🧪 Test found', testLinks.length, 'properly configured links');
    }, 1000);
    
  } catch (error) {
    console.error('❌ Error initializing navigation:', error);
  }
}

// Manejador de clicks en navegación
function handleNavClick(event) {
  event.preventDefault();
  
  const section = this.getAttribute('data-section');
  console.log('🖱️ Navigation clicked:', section);
  
  if (section) {
    showSection(section);
    
    // Actualizar URL hash (opcional)
    if (history.pushState) {
      history.pushState(null, null, `#${section}`);
    } else {
      window.location.hash = section;
    }
  } else {
    console.error('❌ No section data found for clicked link');
  }
}

// Hacer funciones globales para debugging
window.showSection = showSection;
window.initNavigation = initNavigation;
window.navigationDebug = {
  showSection,
  updateActiveNavigation,
  loadSectionContent,
  addSectionMessage
};

// Inicializar cuando el DOM esté listo
function startNavigation() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNavigation);
    console.log('⏳ Waiting for DOM to load...');
  } else {
    initNavigation();
  }
}

// Iniciar inmediatamente
startNavigation();

console.log('✅ Navigation fix script loaded successfully');

