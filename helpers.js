// Helper utilities extracted from inline script

function debounce(func, wait) {
      let timeout;
      return function executedFunction(...args) {
        const later = () => {
          clearTimeout(timeout);
          func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
      };
    }

function showNotification(message, type = 'info') {
      // Create notification element
      const notification = document.createElement('div');
      notification.className = `notification notification-${type}`;
      notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        z-index: 10000;
        padding: 1rem 1.5rem;
        border-radius: 0.5rem;
        color: white;
        font-weight: 500;
        max-width: 300px;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      `;
      
      // Set background color based on type
      switch (type) {
        case 'success':
          notification.style.background = 'linear-gradient(135deg, #10b981, #059669)';
          break;
        case 'error':
          notification.style.background = 'linear-gradient(135deg, #ef4444, #dc2626)';
          break;
        case 'warning':
          notification.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
          break;
        default:
          notification.style.background = 'linear-gradient(135deg, #3b82f6, #2563eb)';
      }
      
      notification.textContent = message;
      document.body.appendChild(notification);
      
      // Animate in
      setTimeout(() => {
        notification.style.transform = 'translateX(0)';
      }, 100);
      
      // Animate out and remove
      setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
          if (document.body.contains(notification)) {
            document.body.removeChild(notification);
          }
        }, 300);
      }, 3000);
    }

function initializeParticles() {
      if (typeof particlesJS !== 'undefined') {
        particlesJS('particles-js', {
          particles: {
            number: { value: 50, density: { enable: true, value_area: 800 } },
            color: { value: '#ffffff' },
            shape: { type: 'circle' },
            opacity: { value: 0.1, random: true },
            size: { value: 3, random: true },
            line_linked: { enable: true, distance: 150, color: '#ffffff', opacity: 0.1, width: 1 },
            move: { enable: true, speed: 1, direction: 'none', random: false, straight: false, out_mode: 'out', bounce: false }
          },
          interactivity: {
            detect_on: 'canvas',
            events: { onhover: { enable: true, mode: 'repulse' }, onclick: { enable: true, mode: 'push' }, resize: true },
            modes: { grab: { distance: 400, line_linked: { opacity: 1 } }, bubble: { distance: 400, size: 40, duration: 2, opacity: 8, speed: 3 }, repulse: { distance: 200, duration: 0.4 }, push: { particles_nb: 4 }, remove: { particles_nb: 2 } }
          },
          retina_detect: true
        });
      }
    }


// Export helpers
export { debounce, showNotification, initializeParticles };
// Global bridges
window.debounce = debounce;
window.showNotification = showNotification;
window.initializeParticles = initializeParticles;

// Auto-init particles if container exists
const tryInitParticles = () => {
  if (document.getElementById('particles-js')) {
    initializeParticles();
  }
};
if (document.readyState !== 'loading') {
  tryInitParticles();
} else {
  document.addEventListener('DOMContentLoaded', tryInitParticles);
}
