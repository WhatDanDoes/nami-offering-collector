const db = require('../../models');
const Account = db.Account;
const setupWallet = require('../support/setupWallet');

fdescribe('Account', () => {

  const _profile = {};

  let parentWalletSecret, parentWalletPublicExt, parentWalletPublic, signingMessage;
  beforeAll(async () => {
    ({ parentWalletSecret, parentWalletPublic, parentWalletPublicExt, signingMessage } = await setupWallet());
    _profile.publicAddress = parentWalletPublic;
  });

  let account;
  beforeEach(() => {
    account = new Account(_profile);
  });

  afterEach(done => {
    db.mongoose.connection.db.dropDatabase().then(result => {
      done();
    }).catch(err => {
      done.fail(err);
    });
  });

  describe('basic validation', () => {

    it('sets the createdAt and updatedAt fields', done => {
      expect(account.createdAt).toBe(undefined);
      expect(account.updatedAt).toBe(undefined);
      account.save().then(obj => {
        expect(account.createdAt instanceof Date).toBe(true);
        expect(account.updatedAt instanceof Date).toBe(true);
        done();
      }).catch(err => {
        done.fail(err);
      });
    });

    describe('publicAddress', () => {

      it('is required', done => {
        Account.create({..._profile, publicAddress: undefined }).then(obj => {
          done.fail('This should not have saved');
        }).catch(error => {
          expect(Object.keys(error.errors).length).toEqual(1);
          expect(error.errors['publicAddress'].message).toEqual('Public address required');
          done();
        });
      });

      it('cannot be null', done => {
        Account.create({..._profile, publicAddress: null }).then(obj => {
          done.fail('This should not have saved');
        }).catch(error => {
          expect(Object.keys(error.errors).length).toEqual(1);
          expect(error.errors['publicAddress'].message).toEqual('Public address required');
          done();
        });
      });

      it('is unique', done => {
        account.save().then(obj => {
          Account.create(_profile).then(obj => {
            done.fail('This should not have saved');
          }).catch(error => {
            expect(Object.keys(error.errors).length).toEqual(1);
            expect(error.errors['publicAddress'].message).toEqual('That public address is already registered');
            done();
          });
        }).catch(error => {
          done.fail(error);
        });
      });

      it('is valid', done => {
        Account.create({..._profile, publicAddress: 'this is not valid' }).then(obj => {
          done.fail('This should not have saved');
        }).catch(error => {
          expect(Object.keys(error.errors).length).toEqual(1);
          expect(error.errors['publicAddress'].message).toEqual('Invalid public address');
          done();
        });
      });

      it('cannot be blank', done => {
        Account.create({..._profile, publicAddress: '' }).then(obj => {
          done.fail('This should not have saved');
        }).catch(error => {
          expect(Object.keys(error.errors).length).toEqual(1);
          expect(error.errors['publicAddress'].message).toEqual('Public address required');
          done();
        });
      });

      it('trims whitespace', done => {
        Account.create({..._profile, publicAddress: `   ${_profile.publicAddress}   ` }).then(obj => {
          expect(obj.publicAddress).toEqual(_profile.publicAddress);
          done();
        }).catch(error => {
          done.fail(error);
        });
      });
    });

    describe('nonce', () => {

      it('is required and automatically set', done => {
        Account.create({..._profile, nonce: undefined }).then(obj => {
          expect(obj.nonce).toBeDefined();
          done();
        }).catch(error => {
          done.fail(error);
        });
      });

      it('does not accept non-parsable bigint strings', done => {
        Account.create({..._profile, nonce: 'this is not a bigint string' }).then(obj => {
          done.fail('This should not have saved');
        }).catch(error => {
          expect(Object.keys(error.errors).length).toEqual(1);
          expect(error.errors['nonce'].message).toEqual('Invalid nonce. Must be BigInt parsable');
          done();
        });
      });

      it('is a bigint parsable string', done => {
        expect(_profile.nonce).toBeUndefined();
        account.save().then(obj => {
          expect(typeof obj.nonce).toEqual('string');
          expect(typeof BigInt(obj.nonce)).toEqual('bigint');
          done();
        }).catch(error => {
          done.fail(error);
        });
      });

      it('is manually set-able', done => {
        Account.create({..._profile, nonce: BigInt(9007199254740991) }).then(obj => {
          expect(obj.nonce).toEqual('9007199254740991');
          done();
        }).catch(error => {
          done.fail(error);
        });
      });
    });

    describe('contact components', () => {

      describe('name', () => {

        it('is optional', done => {
          expect(_profile.name).toBeUndefined();
          Account.create({..._profile, name: 'Wallet or account name' }).then(obj => {
            expect(obj.name).toEqual('Wallet or account name');

            Account.findOneAndUpdate({ publicAddress: obj.publicAddress }, { name: '' }, { new: true, runValidators: true }).then(obj => {
              expect(obj.name).toEqual('');

              done();
            }).catch(error => {
              done.fail(error);
            });
          }).catch(error => {
            done.fail(error);
          });
        });

         it('has 255 characters max', done => {
          Account.create({..._profile, name: 'a'.repeat(256) }).then(obj => {
            done.fail('This should not have saved');
          }).catch(error => {
            expect(Object.keys(error.errors).length).toEqual(1);
            expect(error.errors['name'].message).toEqual('Name too long');
            done();
          });
        });
      });

      describe('email', () => {

        it('is optional', done => {
          expect(_profile.email).toBeUndefined();
          Account.create({..._profile, email: 'someguy@example.com' }).then(obj => {
            expect(obj.email).toEqual('someguy@example.com');

            Account.findOneAndUpdate({ publicAddress: obj.publicAddress }, { email: '' }, { new: true, runValidators: true }).then(obj => {
              expect(obj.email).toEqual('');

              done();
            }).catch(error => {
              done.fail(error);
            });
          }).catch(error => {
            done.fail(error);
          });
        });

        it('is valid', done => {
          Account.create({..._profile, email: 'this is not an email' }).then(obj => {
            done.fail('This should not have saved');
          }).catch(error => {
            expect(Object.keys(error.errors).length).toEqual(1);
            expect(error.errors['email'].message).toEqual('Invalid email');
            done();
          });
        });
      });

      describe('streetAddress', () => {

        it('is optional', done => {
          expect(_profile.streetAddress).toBeUndefined();
          Account.create({..._profile, streetAddress: '123 Fake Street' }).then(obj => {
            expect(obj.streetAddress).toEqual('123 Fake Street');

            Account.findOneAndUpdate({ publicAddress: obj.publicAddress }, { streetAddress: '' }, { new: true, runValidators: true }).then(obj => {
              expect(obj.streetAddress).toEqual('');

              done();
            }).catch(error => {
              done.fail(error);
            });
          }).catch(error => {
            done.fail(error);
          });
        });

        it('has 255 characters max', done => {
          Account.create({..._profile, streetAddress: 'a'.repeat(256) }).then(obj => {
            done.fail('This should not have saved');
          }).catch(error => {
            expect(Object.keys(error.errors).length).toEqual(1);
            expect(error.errors['streetAddress'].message).toEqual('Street address too long');
            done();
          });
        });
      });

      describe('city', () => {

        it('is optional', done => {
          expect(_profile.city).toBeUndefined();
          Account.create({..._profile, city: 'The C-Spot' }).then(obj => {
            expect(obj.city).toEqual('The C-Spot');

            Account.findOneAndUpdate({ publicAddress: obj.publicAddress }, { city: '' }, { new: true, runValidators: true }).then(obj => {
              expect(obj.city).toEqual('');

              done();
            }).catch(error => {
              done.fail(error);
            });
          }).catch(error => {
            done.fail(error);
          });
        });

        it('has 255 characters max', done => {
          Account.create({..._profile, city: 'a'.repeat(256) }).then(obj => {
            done.fail('This should not have saved');
          }).catch(error => {
            expect(Object.keys(error.errors).length).toEqual(1);
            expect(error.errors['city'].message).toEqual('City name too long');
            done();
          });
        });
      });

      describe('province', () => {

        it('is optional', done => {
          expect(_profile.province).toBeUndefined();
          Account.create({..._profile, province: 'Alberta' }).then(obj => {
            expect(obj.province).toEqual('Alberta');

            Account.findOneAndUpdate({ publicAddress: obj.publicAddress }, { province: '' }, { new: true, runValidators: true }).then(obj => {
              expect(obj.province).toEqual('');

              done();
            }).catch(error => {
              done.fail(error);
            });
          }).catch(error => {
            done.fail(error);
          });
        });

         it('has 255 characters max', done => {
          Account.create({..._profile, province: 'a'.repeat(256) }).then(obj => {
            done.fail('This should not have saved');
          }).catch(error => {
            expect(Object.keys(error.errors).length).toEqual(1);
            expect(error.errors['province'].message).toEqual('Province name too long');
            done();
          });
        });
      });

      describe('postalCode', () => {

        it('is optional', done => {
          expect(_profile.name).toBeUndefined();
          Account.create({..._profile, postalCode: 'T0X0X0' }).then(obj => {
            expect(obj.postalCode).toEqual('T0X0X0');

            Account.findOneAndUpdate({ publicAddress: obj.publicAddress }, { postalCode: '' }, { new: true, runValidators: true }).then(obj => {
              expect(obj.postalCode).toEqual('');

              done();
            }).catch(error => {
              done.fail(error);
            });
          }).catch(error => {
            done.fail(error);
          });
        });

         it('has 255 characters max', done => {
          Account.create({..._profile, postalCode: 'a'.repeat(256) }).then(obj => {
            done.fail('This should not have saved');
          }).catch(error => {
            expect(Object.keys(error.errors).length).toEqual(1);
            expect(error.errors['postalCode'].message).toEqual('Postal code name too long');
            done();
          });
        });
      });

      describe('country', () => {

        it('is optional', done => {
          expect(_profile.country).toBeUndefined();
          Account.create({..._profile, country: 'Canada' }).then(obj => {
            expect(obj.country).toEqual('Canada');

            Account.findOneAndUpdate({ publicAddress: obj.publicAddress }, { country: '' }, { new: true, runValidators: true }).then(obj => {
              expect(obj.country).toEqual('');

              done();
            }).catch(error => {
              done.fail(error);
            });
          }).catch(error => {
            done.fail(error);
          });
        });

         it('has 255 characters max', done => {
          Account.create({..._profile, country: 'a'.repeat(256) }).then(obj => {
            done.fail('This should not have saved');
          }).catch(error => {
            expect(Object.keys(error.errors).length).toEqual(1);
            expect(error.errors['country'].message).toEqual('Country name too long');
            done();
          });
        });
      });

      describe('phone', () => {

        it('is optional', done => {
          expect(_profile.phone).toBeUndefined();
          Account.create({..._profile, phone: '403-266-1234' }).then(obj => {
            expect(obj.phone).toEqual('403-266-1234');

            Account.findOneAndUpdate({ publicAddress: obj.publicAddress }, { phone: '' }, { new: true, runValidators: true }).then(obj => {
              expect(obj.phone).toEqual('');

              done();
            }).catch(error => {
              done.fail(error);
            });
          }).catch(error => {
            done.fail(error);
          });
        });

        it('validates most common number formats', done => {
          Account.create({..._profile, phone: 'this is not a phone number' }).then(obj => {
            done.fail('This should not have saved');
          }).catch(error => {
            expect(Object.keys(error.errors).length).toEqual(1);
            expect(error.errors['phone'].message).toEqual('That doesn\'t look like a phone number');
            done();
          });
        });
      });
    });
  });

  describe('#isSuper', () => {

    it('returns false if account publicAddress does not match that configured in `.env`', done => {
      expect(_profile.publicAddress).not.toEqual(process.env.PUBLIC_ADDRESS);
      Account.create(_profile).then(obj => {

        expect(obj.isSuper()).toBe(false);
        done();
      }).catch(error => {
        done.fail(error);
      });
    });

    it('returns true if the account publicAddress is the same as that configured in `.env`', done => {
      Account.create({ publicAddress: process.env.PUBLIC_ADDRESS }).then(obj => {

        expect(obj.isSuper()).toBe(true);
        done();
      }).catch(error => {
        done.fail(error);
      });
    });
  });
});

