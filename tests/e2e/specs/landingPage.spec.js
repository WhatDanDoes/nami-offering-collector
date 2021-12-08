require('dotenv-flow').config();

describe('landing page', () => {

  const URL = 'http://localhost:3000';

  context('metamask installed', () => {

    let address;
    beforeEach(() => {
      cy.visit('/');

      cy.fetchNamiWalletAddress().then(async result => {
        address = result;
      });
    });

    afterEach(() => {
      cy.task('dropDatabase');
    });

    it('authenticates with the top introduction buttom', () => {
      cy.get('form#introduction-form-top').contains('Confirm your identity with Nami').click();
      cy.confirmNamiSignatureRequest();
      cy.contains('Welcome!');
    });

    it('authenticates with the bottom introduction buttom', () => {
      cy.get('form#introduction-form-bottom').contains('Confirm your identity').click();
      cy.confirmNamiSignatureRequest();
      cy.contains('Welcome!');
    });
  });
});
