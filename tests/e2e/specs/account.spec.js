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

    it('displays all the expected contact form components', () => {
      cy.fetchMetamaskWalletAddress().then(address => {
        // Form action
        cy.get('form#account-details').should('have.attr', 'action', '/account?_method=PUT');
        cy.get('form#account-details').should('have.attr', 'method', 'post');

        // Wallet address
        cy.get('form#account-details input#address-dummy[type="text"]').should('be.disabled');
        cy.get('form#account-details input#address-dummy[type="text"]').should('have.value', address.toLowerCase());

        // Name
        cy.get('form#account-details input[type="text"][name="name"]').should('not.be.disabled');

        // Street address
        cy.get('form#account-details input[type="text"][name="streetAddress"]').should('not.be.disabled');
        cy.get('form#account-details input[type="text"][name="streetAddress"]').should('have.value', '');

        // City
        cy.get('form#account-details input[type="text"][name="city"]').should('not.be.disabled');
        cy.get('form#account-details input[type="text"][name="city"]').should('have.value', '');

        // Province
        cy.get('form#account-details input[type="text"][name="province"]').should('not.be.disabled');
        cy.get('form#account-details input[type="text"][name="province"]').should('have.value', '');

        // Country
        cy.get('form#account-details input[type="text"][name="country"]').should('not.be.disabled');
        cy.get('form#account-details input[type="text"][name="country"]').should('have.value', '');

        // Phone
        cy.get('form#account-details input[type="text"][name="phone"]').should('not.be.disabled');
        cy.get('form#account-details input[type="text"][name="phone"]').should('have.value', '');

        // Email
        cy.get('form#account-details input[type="email"][name="email"]').should('not.be.disabled');
        cy.get('form#account-details input[type="email"][name="email"]').should('have.value', '');

        // Submit
        cy.get('form#account-details button#update-account-button[type="submit"]').should('not.be.disabled');
      });
    });

    describe('Update button', () => {

      it('allows you to set all the fields', () => {
        cy.get('input[type="text"][name="name"]').should('have.value', '');
        cy.get('input[type="text"][name="name"]').type('Some Guy');
        cy.get('input[type="text"][name="streetAddress"]').type('123 Fake Street');
        cy.get('input[type="text"][name="city"]').type('The C-Spot');
        cy.get('input[type="text"][name="province"]').type('Alberta');
        cy.get('input[type="text"][name="country"]').type('Canada');
        cy.get('input[type="text"][name="phone"]').type('4032661234');
        cy.get('input[type="email"][name="email"]').type('someguy@example.com');
        cy.get('#update-account-button').click();
        cy.get('input[type="text"][name="name"]').should('have.value', 'Some Guy');
        cy.get('input[type="text"][name="streetAddress"]').should('have.value', '123 Fake Street');
        cy.get('input[type="text"][name="city"]').should('have.value', 'The C-Spot');
        cy.get('input[type="text"][name="province"]').should('have.value', 'Alberta');
        cy.get('input[type="text"][name="country"]').should('have.value', 'Canada');
        cy.get('input[type="text"][name="phone"]').should('have.value', '4032661234');
        cy.get('input[type="email"][name="email"]').should('have.value', 'someguy@example.com');
      });

      it('allows you to unset all the fields', () => {
        cy.get('input[type="text"][name="name"]').should('have.value', '');
        cy.get('input[type="text"][name="name"]').type('Some Guy');
        cy.get('input[type="text"][name="streetAddress"]').type('123 Fake Street');
        cy.get('input[type="text"][name="city"]').type('The C-Spot');
        cy.get('input[type="text"][name="province"]').type('Alberta');
        cy.get('input[type="text"][name="country"]').type('Canada');
        cy.get('input[type="text"][name="phone"]').type('4032661234');
        cy.get('input[type="email"][name="email"]').type('someguy@example.com');
        cy.get('#update-account-button').click();
        cy.get('input[type="text"][name="name"]').should('have.value', 'Some Guy');
        cy.get('input[type="text"][name="name"]').clear();
        cy.get('input[type="text"][name="streetAddress"]').should('have.value', '123 Fake Street');
        cy.get('input[type="text"][name="streetAddress"]').clear();
        cy.get('input[type="text"][name="city"]').should('have.value', 'The C-Spot');
        cy.get('input[type="text"][name="city"]').clear();
        cy.get('input[type="text"][name="province"]').should('have.value', 'Alberta');
        cy.get('input[type="text"][name="province"]').clear();
        cy.get('input[type="text"][name="country"]').should('have.value', 'Canada');
        cy.get('input[type="text"][name="country"]').clear();
        cy.get('input[type="text"][name="phone"]').should('have.value', '4032661234');
        cy.get('input[type="text"][name="phone"]').clear();
        cy.get('input[type="email"][name="email"]').should('have.value', 'someguy@example.com');
        cy.get('input[type="email"][name="email"]').clear();
        cy.get('#update-account-button').click();
        cy.get('form#account-details input[type="text"][name="name"]').should('have.value', '');
        cy.get('form#account-details input[type="text"][name="streetAddress"]').should('have.value', '');
        cy.get('form#account-details input[type="text"][name="city"]').should('have.value', '');
        cy.get('form#account-details input[type="text"][name="province"]').should('have.value', '');
        cy.get('form#account-details input[type="text"][name="country"]').should('have.value', '');
        cy.get('form#account-details input[type="text"][name="phone"]').should('have.value', '');
        cy.get('form#account-details input[type="email"][name="email"]').should('have.value', '');
      });

      it('shows a friendly message on success', () => {
        cy.get('input[type="text"][name="name"]').should('have.value', '');
        cy.get('input[type="text"][name="name"]').type('Some Guy');
        cy.get('#update-account-button').click();
        cy.get('input[type="text"][name="name"]').should('have.value', 'Some Guy');
        cy.get('.alert.alert-success').contains('Info updated');
      });

      it('shows an error on malformed input', () => {
        // Name
        cy.get('form#account-details label[for="name"] .form-error').should('not.exist');
        cy.get('form#account-details input[type="text"][name="name"]').type('a'.repeat(256));
        // Street address
        cy.get('form#account-details label[for="streetAddress"] .form-error').should('not.exist');
        cy.get('form#account-details input[type="text"][name="streetAddress"]').type('a'.repeat(256));
        // City
        cy.get('form#account-details label[for="city"] .form-error').should('not.exist');
        cy.get('form#account-details input[type="text"][name="city"]').type('a'.repeat(256));
        // Province
        cy.get('form#account-details label[for="province"] .form-error').should('not.exist');
        cy.get('form#account-details input[type="text"][name="province"]').type('a'.repeat(256));
        // Country
        cy.get('form#account-details label[for="country"] .form-error').should('not.exist');
        cy.get('form#account-details input[type="text"][name="country"]').type('a'.repeat(256));
        // Phone
        cy.get('form#account-details label[for="phone"] .form-error').should('not.exist');
        cy.get('form#account-details input[type="text"][name="phone"]').type('123');
        // Email
        cy.get('form#account-details label[for="email"] .form-error').should('not.exist');
        cy.get('form#account-details input[type="email"][name="email"]').type('not@ an email');

        cy.get('#update-account-button').click();

        // Name
        cy.get('form#account-details label[for="name"] .form-error').contains('Name too long');
        cy.get('form#account-details input[type="text"][name="name"]').should('have.value', 'a'.repeat(256));
        // Street address
        cy.get('form#account-details label[for="streetAddress"] .form-error').contains('Street address too long');
        cy.get('form#account-details input[type="text"][name="streetAddress"]').should('have.value', 'a'.repeat(256));
        // City
        cy.get('form#account-details label[for="city"] .form-error').contains('City name too long');
        cy.get('form#account-details input[type="text"][name="city"]').should('have.value', 'a'.repeat(256));
        // Province
        cy.get('form#account-details label[for="province"] .form-error').contains('Province name too long');
        cy.get('form#account-details input[type="text"][name="province"]').should('have.value', 'a'.repeat(256));
        // Country
        cy.get('form#account-details label[for="country"] .form-error').contains('Country name too long');
        cy.get('form#account-details input[type="text"][name="country"]').should('have.value', 'a'.repeat(256));
        // Phone
        cy.get('form#account-details label[for="phone"] .form-error').contains('That doesn\'t look like a phone number');
        cy.get('form#account-details input[type="text"][name="phone"]').should('have.value', '123');
        // Email
        cy.get('form#account-details label[for="email"] .form-error').contains('Invalid email');
        cy.get('form#account-details input[type="email"][name="email"]').should('have.value', 'not@anemail');
      });
    });
  });
});

export {}
