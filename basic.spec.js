describe('Flashcards App smoke test', () => {
  it('loads dashboard after login', () => {
    cy.visit('/');
    // replace with real credentials or mock API
    cy.get('[data-action="login"]').click();
    // Example placeholder: should assert something visible
    cy.contains('Dashboard').should('exist');
  });
});
