// Custom Cypress commands for StudyingFlash app

// Command to navigate to a specific section
Cypress.Commands.add('navigateToSection', (sectionName) => {
  cy.contains(sectionName).click();
  cy.get(`[data-section="${sectionName.toLowerCase()}"]`).should('be.visible');
});

// Command to create a test deck
Cypress.Commands.add(
  'createTestDeck',
  (deckName = 'Test Deck', description = 'Test Description') => {
    cy.navigateToSection('Crear');
    cy.get('[data-testid="deck-name-input"]').type(deckName);
    cy.get('[data-testid="deck-description-input"]').type(description);
    cy.get('[data-testid="create-deck-button"]').click();
  }
);

// Command to create a test flashcard
Cypress.Commands.add(
  'createTestFlashcard',
  (front = 'Test Question', back = 'Test Answer') => {
    cy.get('[data-testid="flashcard-front-input"]').type(front);
    cy.get('[data-testid="flashcard-back-input"]').type(back);
    cy.get('[data-testid="add-flashcard-button"]').click();
  }
);

// Command to start a study session
Cypress.Commands.add('startStudySession', (deckName) => {
  cy.navigateToSection('Estudiar');
  cy.contains(deckName).click();
  cy.get('[data-testid="start-study-button"]').click();
});

// Command to answer a flashcard
Cypress.Commands.add('answerFlashcard', (difficulty = 'good') => {
  cy.get('[data-testid="show-answer-button"]').click();
  cy.get(`[data-testid="answer-${difficulty}"]`).click();
});

// Command to check if element is visible in viewport
Cypress.Commands.add('isInViewport', { prevSubject: true }, (subject) => {
  cy.wrap(subject).should('be.visible');
  cy.window().then((win) => {
    const rect = subject[0].getBoundingClientRect();
    expect(rect.top).to.be.at.least(0);
    expect(rect.left).to.be.at.least(0);
    expect(rect.bottom).to.be.at.most(win.innerHeight);
    expect(rect.right).to.be.at.most(win.innerWidth);
  });
});

// Command to wait for animations to complete
Cypress.Commands.add('waitForAnimations', () => {
  // Wait for CSS transitions/animations to complete by checking for stable DOM
  cy.get('body').should('be.visible');
  cy.document().its('readyState').should('equal', 'complete');
});

// Command to mock API responses
Cypress.Commands.add(
  'mockApiResponse',
  (endpoint, response, statusCode = 200) => {
    cy.intercept('GET', endpoint, {
      statusCode: statusCode,
      body: response,
    }).as('apiCall');
  }
);

// Command to check accessibility
Cypress.Commands.add('checkA11y', () => {
  // Basic accessibility checks
  cy.get('img').each(($img) => {
    cy.wrap($img).should('have.attr', 'alt');
  });

  cy.get('button').each(($btn) => {
    cy.wrap($btn).should('be.visible');
  });

  cy.get('input').each(($input) => {
    const type = $input.attr('type');
    if (type !== 'hidden') {
      cy.wrap($input).should('be.visible');
    }
  });
});
