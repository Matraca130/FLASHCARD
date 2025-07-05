/**
 * CONEXIONES SIMPLES - JUNTAR LAS PIEZAS
 * =====================================
 * 
 * Conectar botones/enlaces con funciones que ya existen
 * Sin sistemas complejos - solo cableado directo
 */

// Esperar a que el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
  console.log('🔌 Conectando piezas existentes...');
  
  // CONEXIÓN 1: Todos los elementos con data-section
  const elementosNavegacion = document.querySelectorAll('[data-section]');
  
  elementosNavegacion.forEach(elemento => {
    const seccionDestino = elemento.getAttribute('data-section');
    
    // Conectar click con showSection
    elemento.addEventListener('click', function(e) {
      e.preventDefault();
      console.log(`🎯 Click en: ${seccionDestino}`);
      
      // Llamar a la función que ya existe
      if (typeof showSection === 'function') {
        showSection(seccionDestino);
      } else if (typeof window.showSection === 'function') {
        window.showSection(seccionDestino);
      } else {
        console.error('❌ Función showSection no encontrada');
      }
    });
    
    console.log(`✅ Conectado: ${elemento.tagName} → showSection('${seccionDestino}')`);
  });
  
  // CONEXIÓN 2: Botones con onclick que contienen showSection
  const botonesOnclick = document.querySelectorAll('[onclick*="showSection"]');
  
  botonesOnclick.forEach(boton => {
    // Extraer el nombre de la sección del onclick
    const onclick = boton.getAttribute('onclick');
    const match = onclick.match(/showSection\(['"]([^'"]+)['"]\)/);
    
    if (match) {
      const seccionDestino = match[1];
      
      // Remover onclick y agregar event listener
      boton.removeAttribute('onclick');
      boton.addEventListener('click', function(e) {
        e.preventDefault();
        console.log(`🎯 Click en botón: ${seccionDestino}`);
        
        if (typeof showSection === 'function') {
          showSection(seccionDestino);
        } else if (typeof window.showSection === 'function') {
          window.showSection(seccionDestino);
        }
      });
      
      console.log(`✅ Reconectado botón onclick: ${seccionDestino}`);
    }
  });
  
  // CONEXIÓN 3: Enlaces con href="#seccion"
  const enlacesHash = document.querySelectorAll('a[href^="#"]');
  
  enlacesHash.forEach(enlace => {
    const hash = enlace.getAttribute('href').substring(1);
    
    // Solo si la sección existe
    if (document.getElementById(hash)) {
      enlace.addEventListener('click', function(e) {
        e.preventDefault();
        console.log(`🎯 Click en enlace hash: ${hash}`);
        
        if (typeof showSection === 'function') {
          showSection(hash);
        } else if (typeof window.showSection === 'function') {
          window.showSection(hash);
        }
      });
      
      console.log(`✅ Conectado enlace hash: #${hash}`);
    }
  });
  
  // CONEXIÓN 4: Verificar que showSection existe
  setTimeout(() => {
    if (typeof showSection === 'function') {
      console.log('✅ Función showSection disponible');
    } else if (typeof window.showSection === 'function') {
      console.log('✅ Función window.showSection disponible');
    } else {
      console.error('❌ Función showSection NO encontrada - verificar core-navigation.js');
    }
  }, 1000);
  
  console.log('🎉 Todas las conexiones completadas');
});

// FUNCIÓN DE EMERGENCIA: Si showSection no existe, crearla
window.addEventListener('load', function() {
  if (typeof showSection !== 'function' && typeof window.showSection !== 'function') {
    console.log('🚨 Creando función showSection de emergencia...');
    
    window.showSection = function(sectionId) {
      console.log(`🔧 showSection emergencia: ${sectionId}`);
      
      // Ocultar todas las secciones
      document.querySelectorAll('.section').forEach(section => {
        section.style.display = 'none';
        section.classList.remove('active');
      });
      
      // Mostrar sección objetivo
      const targetSection = document.getElementById(sectionId);
      if (targetSection) {
        targetSection.style.display = 'block';
        targetSection.classList.add('active');
        console.log(`✅ Sección mostrada: ${sectionId}`);
      } else {
        console.error(`❌ Sección no encontrada: ${sectionId}`);
      }
    };
    
    console.log('✅ Función showSection de emergencia creada');
  }
});

