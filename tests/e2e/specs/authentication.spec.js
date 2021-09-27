context('authentication', function() {

  before(function() {
  });

  afterEach(() => {
    cy.task('dropDatabase');
  });

  describe('browser behaviour', () => {

    it('sets a cookie on first visit', () => {
      cy.clearCookies();
      cy.getCookies().should('have.length', 0);

      cy.visit('/');

      cy.getCookies().should('have.length', 1).then(cookies => {
        // This doesn't reflect production cookie expectations
        expect(cookies[0]).to.have.property('name', 'metamask-offering-collector');
        expect(cookies[0]).to.have.property('value');
        expect(cookies[0]).to.have.property('domain');
        expect(cookies[0]).to.have.property('httpOnly', true);
        expect(cookies[0]).to.have.property('path', '/');
        expect(cookies[0]).to.have.property('secure', false); // false because tests are HTTP
      });
    });
  });

  describe('not logged in', () => {
    beforeEach(() => {
      cy.visit('/');
    });

    context('first visit', () => {
      it('shows the home page', () => {
        cy.get('main h1').contains('Metamask Offering Collector');
      });

      /**
       * If I can find the public address, that means I can connect Metamask
       */
      it('displays the confirm-identity button', () => {
        cy.get('#connect-metamask').contains('Confirm your identity with Metamask');
      });

      it('does not display the logout button', () => {
        cy.get('#logout-button').should('not.exist');
      });
    });
  });

  describe('connect to metamask', () => {

    it('disables the connect button when identifying', () => {
      cy.visit('/');
      cy.get('#connect-metamask-button').should('not.be.disabled');
      cy.contains('Confirm your identity with Metamask').click();
      cy.get('#connect-metamask-button').should('be.disabled');
    });
  });

  describe('logged in', () => {
    beforeEach(() => {
      cy.visit('/');
      cy.contains('Confirm your identity with Metamask').click();
      cy.wait(300);
    });

    it('lands in the right place', () => {
      cy.url().should('match', /\//);
    });

    it('does not display the login link', () => {
      cy.get('#connect-metamask').contains('Disconnect Metamask');
    });

  });
});

export {}
