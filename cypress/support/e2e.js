// Cypress E2E support file

// Import commands.js using ES2015 syntax:
import './commands';

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Hide fetch/XHR requests from command log
Cypress.on('window:before:load', (win) => {
  const originalFetch = win.fetch;
  win.fetch = function (...args) {
    return originalFetch.apply(this, args);
  };
});

// Handle uncaught exceptions
Cypress.on('uncaught:exception', (err, runnable) => {
  // Returning false here prevents Cypress from failing the test
  // for certain expected errors
  if (err.message.includes('ResizeObserver loop limit exceeded')) {
    return false;
  }
  if (err.message.includes('Non-Error promise rejection captured')) {
    return false;
  }
  return true;
});

// Custom commands for common actions
Cypress.Commands.add(
  'login',
  (email = 'test@example.com', password = 'password123') => {
    cy.window().then((win) => {
      win.localStorage.setItem('authToken', 'fake-token-for-testing');
      win.localStorage.setItem(
        'currentUser',
        JSON.stringify({
          id: 1,
          email: email,
          name: 'Test User',
        })
      );
    });
  }
);

Cypress.Commands.add('logout', () => {
  cy.window().then((win) => {
    win.localStorage.removeItem('authToken');
    win.localStorage.removeItem('currentUser');
  });
});

Cypress.Commands.add('waitForApp', () => {
  cy.get('[data-testid="app-loaded"]', { timeout: 10000 }).should('exist');
});
