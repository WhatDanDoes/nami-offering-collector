context('account managment', () => {

  afterEach(() => {
    cy.task('dropDatabase');
  });

  beforeEach(() => {
    cy.task('dropDatabase');
    cy.visit('/');
    cy.contains('Confirm your identity with Metamask').click();
    cy.confirmMetamaskSignatureRequest();
    cy.get('a[href="/account"]:first-child').click();
  });

  it('displays a link back to the transfer page', () => {
    cy.get('a[href="/"] button#make-a-donation-button').should('exist');
  });

  describe('Account Details form', () => {

    it('presents a form to edit account details', () => {
      cy.fetchMetamaskWalletAddress().then(address => {
        cy.get('form#account-details').should('have.attr', 'action', '/account?_method=PUT');
        cy.get('form#account-details').should('have.attr', 'method', 'post');
        cy.get('form#account-details input#address-dummy[type="text"]').should('be.disabled');
        cy.get('form#account-details input#address-dummy[type="text"]').should('have.value', address.toLowerCase());
        cy.get('form#account-details input[type="text"][name="name"]').should('not.be.disabled');
        cy.get('form#account-details button#update-account-button[type="submit"]').should('not.be.disabled');
      });
    });

    describe('Update button', () => {

      it('allows you to set the name field', () => {
        cy.get('input[type="text"][name="name"]').should('have.value', '');
        cy.get('input[type="text"][name="name"]').type('Some Guy');
        cy.get('#update-account-button').click();
        cy.get('input[type="text"][name="name"]').should('have.value', 'Some Guy');
      });

      it('allows you to set an empty name field', () => {
        cy.get('input[type="text"][name="name"]').should('have.value', '');
        cy.get('input[type="text"][name="name"]').type('Some Guy');
        cy.get('#update-account-button').click();
        cy.get('input[type="text"][name="name"]').should('have.value', 'Some Guy');
        cy.get('input[type="text"][name="name"]').clear();
        cy.get('#update-account-button').click();
        cy.get('input[type="text"][name="name"]').should('have.value', '');
      });

      it('shows a friendly message on success', () => {
        cy.get('input[type="text"][name="name"]').should('have.value', '');
        cy.get('input[type="text"][name="name"]').type('Some Guy');
        cy.get('#update-account-button').click();
        cy.get('input[type="text"][name="name"]').should('have.value', 'Some Guy');
        cy.get('.alert.alert-success').contains('Info updated');
      });
    });
  });
});

export {}
