// particles.service.js - Particle background effects

/**
 * Initializes particle background effects using particles.js
 */
export function initializeParticles() {
  // Check if particles.js is loaded
  if (typeof particlesJS === 'undefined') {
    console.warn('particles.js not loaded, skipping particle initialization');
    return;
  }
  
  const particlesContainer = document.getElementById('particles-js');
  if (!particlesContainer) {
    console.warn('particles-js container not found');
    return;
  }
  
  // Initialize particles with configuration
  particlesJS('particles-js', {
    particles: {
      number: {
        value: 50,
        density: {
          enable: true,
          value_area: 800
        }
      },
      color: {
        value: '#ffffff'
      },
      shape: {
        type: 'circle'
      },
      opacity: {
        value: 0.1,
        random: true
      },
      size: {
        value: 3,
        random: true
      },
      line_linked: {
        enable: true,
        distance: 150,
        color: '#ffffff',
        opacity: 0.1,
        width: 1
      },
      move: {
        enable: true,
        speed: 1,
        direction: 'none',
        random: false,
        straight: false,
        out_mode: 'out',
        bounce: false
      }
    },
    interactivity: {
      detect_on: 'canvas',
      events: {
        onhover: {
          enable: true,
          mode: 'repulse'
        },
        onclick: {
          enable: true,
          mode: 'push'
        },
        resize: true
      },
      modes: {
        grab: {
          distance: 400,
          line_linked: {
            opacity: 1
          }
        },
        bubble: {
          distance: 400,
          size: 40,
          duration: 2,
          opacity: 8,
          speed: 3
        },
        repulse: {
          distance: 200,
          duration: 0.4
        },
        push: {
          particles_nb: 4
        },
        remove: {
          particles_nb: 2
        }
      }
    },
    retina_detect: true
  });
  
  console.log('Particles initialized successfully');
}

/**
 * Updates particle configuration for different themes
 * @param {string} theme - Theme name ('default', 'study', 'success', etc.)
 */
export function updateParticleTheme(theme = 'default') {
  if (typeof pJSDom === 'undefined' || !pJSDom[0]) {
    console.warn('Particles not initialized');
    return;
  }
  
  const particleSystem = pJSDom[0].pJS;
  
  switch (theme) {
    case 'study':
      // More focused particles during study
      particleSystem.particles.number.value = 30;
      particleSystem.particles.opacity.value = 0.05;
      break;
      
    case 'success':
      // Celebratory particles
      particleSystem.particles.number.value = 80;
      particleSystem.particles.color.value = '#10b981';
      particleSystem.particles.opacity.value = 0.2;
      break;
      
    case 'minimal':
      // Minimal particles for better performance
      particleSystem.particles.number.value = 20;
      particleSystem.particles.opacity.value = 0.05;
      break;
      
    default:
      // Default theme
      particleSystem.particles.number.value = 50;
      particleSystem.particles.color.value = '#ffffff';
      particleSystem.particles.opacity.value = 0.1;
  }
  
  // Refresh particles
  particleSystem.fn.particlesRefresh();
}

/**
 * Temporarily disables particles (for performance during intensive operations)
 */
export function pauseParticles() {
  if (typeof pJSDom !== 'undefined' && pJSDom[0]) {
    pJSDom[0].pJS.fn.vendors.destroypJS();
  }
}

/**
 * Re-enables particles
 */
export function resumeParticles() {
  initializeParticles();
}

/**
 * Initialize particles when DOM is ready
 */
export function initializeParticlesOnReady() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeParticles);
  } else {
    // DOM is already ready
    initializeParticles();
  }
}

// Expose to global scope for compatibility
window.initializeParticles = initializeParticles;
window.updateParticleTheme = updateParticleTheme;

