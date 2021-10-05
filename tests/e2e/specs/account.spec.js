context('account managment', () => {

  afterEach(() => {
    cy.task('dropDatabase');
  });

  beforeEach(() => {
    cy.visit('/');
    cy.contains('Confirm your identity with Metamask').click();
    cy.confirmMetamaskSignatureRequest();
  });

  it('presents a form to edit account details', () => {
    cy.get('form#account-details input#agent-name-field[type="text"]').should('have.attr', 'action', '/agent?_method=PUT');
    cy.get('form#account-details input#agent-name-field[type="text"]').should('have.attr', 'method', 'post');
    cy.get('form#account-details input#agent-name-field[type="text"]').should('not.be.disabled');
    cy.get('form#account-details button#update-account-details[type="submit"]').should('not.be.disabled');
  });
});

export {}
