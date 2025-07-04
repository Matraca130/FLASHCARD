// simple-navigation.js - Sistema de navegación simplificado
console.log('Loading simple navigation system...');

// Función simple para mostrar secciones
function showSection(sectionName) {
  console.log('Showing section:', sectionName);
  
  // Ocultar todas las secciones
  const sections = document.querySelectorAll('.section');
  sections.forEach(section => {
    section.style.display = 'none';
    section.classList.remove('active');
  });
  
  // Mostrar la sección seleccionada
  const targetSection = document.getElementById(sectionName);
  if (targetSection) {
    targetSection.style.display = 'block';
    targetSection.classList.add('active');
    console.log('Section shown successfully:', sectionName);
  } else {
    console.error('Section not found:', sectionName);
  }
  
  // Actualizar navegación
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    link.classList.remove('active');
  });
  
  const activeLink = document.querySelector(`[data-section="${sectionName}"]`);
  if (activeLink) {
    activeLink.classList.add('active');
  }
  
  // Cargar contenido específico de la sección (simplificado)
  loadSectionContent(sectionName);
}

// Función simplificada para cargar contenido
function loadSectionContent(sectionName) {
  console.log('Loading content for section:', sectionName);
  
  switch (sectionName) {
    case 'dashboard':
      console.log('Dashboard content loaded');
      break;
    case 'estudiar':
      console.log('Study content loaded');
      // Mostrar mensaje simple
      const studySection = document.getElementById('estudiar');
      if (studySection && !studySection.querySelector('.simple-message')) {
        const message = document.createElement('div');
        message.className = 'simple-message';
        message.innerHTML = '<p>✅ Sección de Estudiar cargada correctamente</p>';
        studySection.appendChild(message);
      }
      break;
    case 'crear':
      console.log('Create content loaded');
      // Mostrar mensaje simple
      const createSection = document.getElementById('crear');
      if (createSection && !createSection.querySelector('.simple-message')) {
        const message = document.createElement('div');
        message.className = 'simple-message';
        message.innerHTML = '<p>✅ Sección de Crear cargada correctamente</p>';
        createSection.appendChild(message);
      }
      break;
    case 'gestionar':
      console.log('Manage content loaded');
      // Mostrar mensaje simple
      const manageSection = document.getElementById('gestionar');
      if (manageSection && !manageSection.querySelector('.simple-message')) {
        const message = document.createElement('div');
        message.className = 'simple-message';
        message.innerHTML = '<p>✅ Sección de Gestionar cargada correctamente</p>';
        manageSection.appendChild(message);
      }
      break;
    case 'ranking':
      console.log('Ranking content loaded');
      break;
    default:
      console.log('Unknown section:', sectionName);
  }
}

// Inicializar navegación simple
function initSimpleNavigation() {
  console.log('Initializing simple navigation...');
  
  // Agregar event listeners a los enlaces de navegación
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const section = this.getAttribute('data-section');
      console.log('Nav link clicked:', section);
      showSection(section);
    });
  });
  
  // Mostrar dashboard por defecto
  showSection('dashboard');
  
  console.log('Simple navigation initialized successfully');
}

// Hacer las funciones globales
window.showSection = showSection;
window.initSimpleNavigation = initSimpleNavigation;

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSimpleNavigation);
} else {
  initSimpleNavigation();
}

console.log('Simple navigation script loaded');

