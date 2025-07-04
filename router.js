// router.js - simple hash-based router
import { showSection } from './navigation.js';

export function navigate(section) {
  if (window.location.hash.replace('#','') !== section) {
    window.location.hash = section;
  } else {
    showSection(section);
  }
}

function handleRoute() {
  const section = window.location.hash ? window.location.hash.slice(1) : 'inicio';
  showSection(section);
}

window.addEventListener('hashchange', handleRoute);
document.addEventListener('DOMContentLoaded', handleRoute);

// Temporary global exposure for legacy code
window.navigate = navigate;
