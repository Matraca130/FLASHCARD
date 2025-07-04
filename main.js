// main.js - Punto de entrada principal de la aplicación
import './router.js';
import './navigation.js';
import './events/bindings.js';
import { loadGamificationData } from './services/gamification.service.js';
import { initializeAlgorithmModal } from './services/algorithms.service.js';
import { initializeFlashcardEvents } from './services/flashcards.service.js';
import { initializeImportExportEvents } from './services/import-export.service.js';
import { initializeCreateEvents } from './services/create.service.js';
import { initializeActivityHeatmap } from './services/activity-heatmap.service.js';
import { initializeParticlesOnReady } from './services/particles.service.js';
import { initializeCharts } from './charts.js';

// Inicialización de la aplicación
document.addEventListener('DOMContentLoaded', () => {
  console.log('FlashCards App initialized');
  
  // Inicializar efectos visuales
  initializeParticlesOnReady();
  
  // Inicializar servicios modulares
  loadGamificationData();
  initializeAlgorithmModal();
  initializeFlashcardEvents();
  initializeImportExportEvents();
  initializeCreateEvents();
  
  // Inicializar componentes de dashboard
  initializeActivityHeatmap();
  
  // Inicializar gráficos después de un breve delay para asegurar que el DOM esté listo
  setTimeout(() => {
    initializeCharts();
  }, 100);
  
  // Registrar Service Worker para PWA
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('SW registered: ', registration);
      })
      .catch(registrationError => {
        console.log('SW registration failed: ', registrationError);
      });
  }
});

// Inicializar funciones cuando el DOM esté listo
const initializeOnReady = () => {
  // Verificar si el contenedor de partículas existe
  const particlesContainer = document.getElementById('particles-js');
  if (particlesContainer) {
    initializeParticlesOnReady();
  }
  
  // Inicializar heatmap si el contenedor existe
  const heatmapContainer = document.getElementById('activity-heatmap');
  if (heatmapContainer) {
    initializeActivityHeatmap();
  }
};

// Ejecutar inicialización
if (document.readyState !== 'loading') {
  initializeOnReady();
} else {
  document.addEventListener('DOMContentLoaded', initializeOnReady);
}

