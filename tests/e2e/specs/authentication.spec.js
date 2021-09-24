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
});

export {}
