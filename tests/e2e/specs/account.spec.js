context('account managment', () => {

  afterEach(() => {
    cy.task('dropDatabase');
  });

  beforeEach(() => {
    cy.task('dropDatabase');
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
    cy.get('form#account-details button#update-account-button[type="submit"]').should('not.be.disabled');
  });

  describe('Donate form', () => {

    let address, balance, serverAddress;
    beforeEach(() => {

      cy.fetchMetamaskWalletAddress().then(async result => {
        address = result;
        cy.task('getBalance', address).then(result => {
          balance = result;
          cy.task('getServerAddress').then(result => {
            serverAddress = result;
          });
        });
      });
    });

    context('balance > 0', () => {

      it.only('provides a donation form', () => {
        cy.get('form#send-eth').should('not.be.disabled');
        cy.get('form#send-eth').should('not.have.attr', 'action');
        cy.get('form#send-eth').should('not.have.attr', 'method');
        cy.get('form#send-eth input[type="text"][name="from"]').should('have.value', address.toLowerCase());
        cy.get('form#send-eth input[type="text"][name="from"]').should('be.disabled');
        cy.get('form#send-eth input[type="text"][name="to"]').should('have.value', serverAddress);
        cy.get('form#send-eth input[type="text"][name="to"]').should('be.disabled');
        cy.get('form#send-eth input#eth-value-input[type="text"][name="value"]').should('have.value', '');
        cy.get('form#send-eth #send-eth-button[type="submit"]').should('exist');
      });


      it('displays the account\'s current balance', () => {

      });

      it('only allows numerical content in the "amount" text field', () => {

      });
    });

    context('zero balance', () => {
      it('disables the donation form', () => {
        cy.get('form#account-details').should('be.disabled');
        cy.get('form#account-details header').contains('You have 0 ETH in your account');
        cy.get('form#account-details').should('not.have.attr', 'action');
        cy.get('form#account-details').should('not.have.attr', 'method');
        cy.get('form#send-eth input[type="text"][name="from"]').should('have.value', address);
        cy.get('form#send-eth input[type="text"][name="to"]').should('have.value', process.env.PUBLIC_ADDRESS);
        cy.get('form#send-eth input#eth-value-input[type="text"][name="value"]').should('have.value', '');
        cy.get('form#send-eth input#send-eth-button[type="submit"]').should('exist');
      });

      it('displays the account\'s current balance', () => {
//        cy.get('input[type="range"][name="value"]').should('have.attr', 'min', '0');
//        cy.get('input[type="range"][name="value"]').should('have.attr', 'max', '0');

      });
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

export {}
