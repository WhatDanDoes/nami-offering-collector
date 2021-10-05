context('account managment', () => {

  afterEach(() => {
    cy.task('dropDatabase');
  });

  beforeEach(() => {
    cy.visit('/');
    cy.contains('Confirm your identity with Metamask').click();
    cy.confirmMetamaskSignatureRequest();
  });

  it('displays the connected wallet', () => {
    cy.fetchMetamaskWalletAddress().then(address => {
      cy.get('body header h1').contains('You are connected with:');
      cy.get('body header h3').contains(address.toLowerCase());
    });
  });

  it('presents a form to edit account details', () => {
    cy.get('form#account-details').should('have.attr', 'action', '/agent?_method=PUT');
    cy.get('form#account-details').should('have.attr', 'method', 'post');
    cy.get('form#account-details input[type="text"][name="name"]').should('not.be.disabled');
    cy.get('form#account-details button[type="submit"]').should('not.be.disabled');
  });
});

export {}
