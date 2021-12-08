context('transfer eth', () => {

  afterEach(() => {
    cy.task('dropDatabase');
  });

  beforeEach(() => {
    cy.task('dropDatabase');
    cy.visit('/');
    cy.contains('Confirm your identity with Nami').click();
    cy.confirmNamiSignatureRequest();
  });

  it('displays the connected wallet', () => {
    cy.fetchNamiWalletAddress().then(address => {
      cy.get('body header h1').contains('You are connected with:');
      cy.get('body header h4 a[href="/account"]').contains(address.toLowerCase());
    });
  });

  it('displays links to account and transaction pages', () => {
    cy.get('header p a[href="/transaction"] i').contains('History');
    cy.get('header p a[href="/account"] i').contains('Account');
  });

  describe('Donate form', () => {

    let address, balance, serverAddress;
    beforeEach(() => {

      cy.fetchNamiWalletAddress().then(async result => {
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

      describe('donation form', () => {

        it('is correctly formatted', () => {
          cy.get('form#send-eth').should('not.be.disabled');
          cy.get('form#send-eth').should('not.have.attr', 'action');
          cy.get('form#send-eth').should('not.have.attr', 'method');
          cy.get('form#send-eth input[type="text"][name="from"]').should('have.value', address.toLowerCase());
          cy.get('form#send-eth input[type="text"][name="from"]').should('be.disabled');
          cy.get('form#send-eth input[type="text"][name="to"]').should('have.value', serverAddress);
          cy.get('form#send-eth input[type="text"][name="to"]').should('be.disabled');
          cy.get('form#send-eth input#eth-value-input[type="text"][name="value"]').should('have.value', '');
          cy.get('form#send-eth #send-eth-button[type="submit"]').should('be.disabled');
        });

        it('displays the account\'s current balance', () => {
          cy.get('#wallet-balance').contains(`Max: ${balance}`)
          cy.get('#wallet-balance').should('not.contain', 'Max: 0.0')
        });

        describe('amount text field', () => {

          it('allows numerical content in the "amount" text field', () => {
            cy.get('#eth-value-input').type('-a1b2.c.3d4');
            cy.get('#eth-value-input').should('have.value', '12.34');
          });

          it('allows up to nine decimal places in the "amount" field', () => {
            cy.get('#eth-value-input').type('123.01234567890123456789');
            cy.get('#eth-value-input').should('have.value', '123.012345678');
          });

          it('prefixes a zero to the "amount" value when provided a leading decimal', () => {
            cy.get('form#send-eth input[type="text"][name="to"]').should('be.disabled');
            cy.get('#eth-value-input').type('.');
            cy.get('#eth-value-input').should('have.value', '0.');
          });

          it('reveals an estimated gas fee', () => {
            cy.task('getGasPrice').then(price => {
              cy.get('#estimated-gas-price').should('be.empty');
              cy.get('#eth-value-input').type('.');
              cy.get('#estimated-gas-price').should('be.empty');
              cy.get('#eth-value-input').type('.1');
              cy.get('#estimated-gas-price').contains(`Estimated gas fee: ${price * 21000}`);
              cy.get('#eth-value-input').clear();
              cy.get('#estimated-gas-price').should('be.empty');
            });
          });
        });

        describe('Send button', () => {

          it('disables if "amount" value greater than what is available in the account (including gas)', () => {
            cy.task('getGasPrice').then(price => {
              cy.get('#eth-value-input').type('99.99999999');
              cy.get('form#send-eth #send-eth-button[type="submit"]').should('be.disabled');
              cy.get('form#send-eth #send-eth-button[type="submit"]').contains('Insufficient funds');
              cy.get('#estimated-gas-price').contains(`Estimated gas fee: ${price * 21000}`);
              cy.get('#eth-value-input').clear();
              cy.get('form#send-eth #send-eth-button[type="submit"]').should('be.disabled');
              cy.get('form#send-eth #send-eth-button[type="submit"]').contains('Send');
              cy.get('#estimated-gas-price').should('be.empty');
            });
          });

          it('disables if amount is 0', () => {
            cy.get('form#send-eth #send-eth-button[type="submit"]').should('be.disabled');
            cy.get('#eth-value-input').type('.');
            cy.get('form#send-eth #send-eth-button[type="submit"]').should('be.disabled');
            cy.get('#eth-value-input').clear();
            cy.get('#eth-value-input').type('0');
            cy.get('form#send-eth #send-eth-button[type="submit"]').should('be.disabled');
            cy.get('#eth-value-input').clear();
            cy.get('#eth-value-input').type('.0');
            cy.get('form#send-eth #send-eth-button[type="submit"]').should('be.disabled');
            cy.get('#eth-value-input').clear();
            cy.get('#eth-value-input').type('.01');
            cy.get('form#send-eth #send-eth-button[type="submit"]').should('not.be.disabled');
            cy.get('#eth-value-input').clear();
            cy.get('form#send-eth #send-eth-button[type="submit"]').should('be.disabled');
          });

          /**
           * 2021-10-14
           *
           * `ganache` doesn't really let you reset the state of the chain
           * on every test. Even if it did, `synpress` does not reset the
           * that state of the Nami wallet (though there is a task that
           * does this). In any case, this test is designed so that there
           * can be a bunch of runs before the relevant accounts are depleted
           * of eth.
           */
          it('transfers eth to the configured address', () => {
            cy.task('getBalance', 'CONFIGURED').then(result => {
              balance = result;
              // Wouldn't this be nice?
              //expect(balance).to.equal('0.0');
              cy.get('#eth-value-input').type('1');
              cy.get('form#send-eth #send-eth-button[type="submit"]').click();
              cy.confirmNamiTransaction();
              cy.task('getBalance', 'CONFIGURED').then(result => {
                // As above...
                //expect(balance).to.equal('1.0');
                expect(parseFloat(result)).to.equal(parseFloat(balance) + 1);
              });
            });
          });

          it('displays a friendly message', () => {
            cy.get('#eth-value-input').type('1');
            cy.get('form#send-eth #send-eth-button[type="submit"]').click();
            cy.confirmNamiTransaction();
            cy.get('.alert.alert-success').contains('Transaction recorded. Update your account details to receive a tax receipt.');
          });

          it('lands in the right place', () => {
            cy.get('#eth-value-input').type('1');
            cy.get('form#send-eth #send-eth-button[type="submit"]').click();
            cy.confirmNamiTransaction();
            cy.url().should('include', '/transaction');
          });
        });
      });
    });

    // How do I empty a wallet for this purpose? Default test wallets have 100 ETH
//    context('zero balance', () => {
//
//      it('disables the send eth button even after change', () => {
//        cy.get('form#send-eth').should('not.be.disabled');
//        cy.get('form#send-eth').should('not.have.attr', 'action');
//        cy.get('form#send-eth').should('not.have.attr', 'method');
//        cy.get('form#send-eth input[type="text"][name="from"]').should('have.value', address.toLowerCase());
//        cy.get('form#send-eth input[type="text"][name="to"]').should('have.value', serverAddress);
//        cy.get('form#send-eth input#eth-value-input[type="text"][name="value"]').should('have.value', '');
//        cy.get('form#send-eth input#eth-value-input[type="text"][name="value"]').should('not.be.disabled');
//
//        cy.get('form#send-eth #send-eth-button[type="submit"]').should('be.disabled');
//        cy.get('#eth-value-input').type('0.1');
//        cy.get('form#send-eth #send-eth-button[type="submit"]').contains('Insufficient funds');
//        cy.get('form#send-eth #send-eth-button[type="submit"]').should('be.disabled');
//        cy.get('#eth-value-input').clear();
//        cy.get('form#send-eth #send-eth-button[type="submit"]').contains('Send');
//        cy.get('form#send-eth #send-eth-button[type="submit"]').should('be.disabled');
//      });
//
//      it('says you have 0 eth', () => {
//        cy.get('#wallet-balance').contains('You have 0 ETH in your account')
//      });
//    });
  });
});

export {}
