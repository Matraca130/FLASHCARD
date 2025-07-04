// navigation.js - extracted navigation logic
function showSection(sectionName) {
      // Hide all sections
      document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
      });
      
      // Show target section
      const targetSection = document.getElementById(sectionName);
      if (targetSection) {
        targetSection.classList.add('active');
      }
      
      // Update navigation
      document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
      });
      
      const activeLink = document.querySelector(`[data-section="${sectionName}"]`);
      if (activeLink) {
        activeLink.classList.add('active');
      }
      
      // Load section-specific data
      switch (sectionName) {
        case 'dashboard':
          loadDashboardData();
          import('./charts.js').then(m => m.initializeCharts && m.initializeCharts());
          break;
        case 'estudiar':
          import('./services/study.service.js').then(m => m.loadStudyDecks && m.loadStudyDecks());
          break;
        case 'crear':
          import('./services/create.service.js').then(m => m.openCreateDeckModal && m.openCreateDeckModal());
          break;
        case 'gestionar':
          import('./services/manage.service.js').then(m => m.loadManageDecks && m.loadManageDecks());
          break;
        case 'ranking':
          loadRankingData();
          break;
      }
    }

window.showSection = showSection;

// Attach click handlers once
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const section = this.getAttribute('data-section');
      window.location.hash = section;
    });
  });
});

export { showSection };
