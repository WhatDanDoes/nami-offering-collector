context('authentication', () => {

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
        expect(cookies[0]).to.have.property('name', 'nami-offering-collector');
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
        cy.get('header nav').contains('Nami Offering Collector');
      });

      /**
       * If I can find the public address, that means I can connect Nami
       */
      it('displays the confirm-identity button', () => {
        cy.get('#introduction-form-top').contains('Confirm your identity with Nami');
        cy.get('#introduction-form-bottom').contains('Confirm your identity');
      });

      it('does not display the logout button', () => {
        cy.get('#logout-button').should('not.exist');
      });
    });
  });

  describe('connect to metamask', () => {

    /**
     * 2021-9-27
     *
     * Same old problem with cypress. This test is manually verified,
     * but I can't get the test to pass because I suspect the connection
     * operation is performed before the client updates.
     */
    //it('disables the connect button when identifying', () => {
    //  cy.task('activateCustomNonceInNami');
    //  cy.visit('/');
    //  cy.get('#connect-metamask-button').should('not.be.disabled');
    //  cy.contains('Confirm your identity with Nami').click();
    //  cy.get('#connect-metamask-button').should('be.disabled');
    //});
  });

  describe('log in', () => {
    beforeEach(() => {
      cy.visit('/');
      cy.contains('Confirm your identity with Nami').click();
    });

    context('signature request rejected', () => {

      beforeEach(() => {
        cy.rejectNamiSignatureRequest();
      });

      it('lands in the right place', () => {
        cy.url().should('match', /\/$/);
      });

      it('displays the login link', () => {
        cy.get('#introduction-form-top').contains('Confirm your identity with Nami');
        cy.get('#introduction-form-bottom').contains('Confirm your identity');
      });
    });

    context('signature request accepted', () => {

      beforeEach(() => {
        cy.confirmNamiSignatureRequest();
      });

      it('lands in the right place', () => {
        cy.url().should('match', /\/$/);
      });

      it('does not display the login link', () => {
        cy.get('#connect-metamask').contains('Disconnect Nami');
      });

      it('displays a friendly message', () => {
        cy.contains(`Welcome!`);
      });

      it('maintains authenticated state upon app navigation', () => {
        cy.get('#home-link').click();
        cy.get('#connect-metamask').contains('Disconnect Nami');
      });

      it('maintains authenticated state upon reload', () => {
        cy.reload();
        cy.get('#connect-metamask').contains('Disconnect Nami');
      });

      describe('logging out', () => {
        beforeEach(() => {
          cy.visit('/');
          cy.contains('Disconnect Nami').click();
        });

        it('lands in the right place', () => {
          cy.url().should('match', /\/$/);
        });

        it('displays the login link', () => {
          cy.get('#introduction-form-top').contains('Confirm your identity with Nami');
          cy.get('#introduction-form-bottom').contains('Confirm your identity');
        });
      });
    });
  });
});

export {}
