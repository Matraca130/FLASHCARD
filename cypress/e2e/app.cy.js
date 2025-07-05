describe('StudyingFlash App', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should load the main page', () => {
    cy.contains('StudyingFlash');
    cy.contains('Tu plataforma de aprendizaje inteligente con repetición espaciada');
  });

  it('should have navigation menu', () => {
    cy.get('nav').should('exist');
    cy.contains('Dashboard').should('be.visible');
    cy.contains('Estudiar').should('be.visible');
    cy.contains('Crear').should('be.visible');
    cy.contains('Gestionar').should('be.visible');
    cy.contains('Ranking').should('be.visible');
  });

  it('should show dashboard by default', () => {
    cy.get('[data-section="dashboard"]').should('be.visible');
    cy.contains('Progreso Semanal').should('be.visible');
  });

  it('should navigate between sections', () => {
    // Click on Estudiar
    cy.contains('Estudiar').click();
    cy.get('[data-section="study"]').should('be.visible');

    // Click on Crear
    cy.contains('Crear').click();
    cy.get('[data-section="create"]').should('be.visible');

    // Click back to Dashboard
    cy.contains('Dashboard').click();
    cy.get('[data-section="dashboard"]').should('be.visible');
  });

  it('should handle responsive design', () => {
    // Test mobile viewport
    cy.viewport(375, 667);
    cy.get('nav').should('exist');
    cy.contains('StudyingFlash').should('be.visible');

    // Test tablet viewport
    cy.viewport(768, 1024);
    cy.get('nav').should('exist');
    cy.contains('StudyingFlash').should('be.visible');

    // Test desktop viewport
    cy.viewport(1920, 1080);
    cy.get('nav').should('exist');
    cy.contains('StudyingFlash').should('be.visible');
  });
});

