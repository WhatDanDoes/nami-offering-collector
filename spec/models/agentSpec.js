const db = require('../../models');
const Agent = db.Agent;

describe('Agent', () => {

  const _profile = {
    publicAddress: '0x0eDB511d9434452D24a3Eeb47E3d02Fda903A73a',
  };

  let agent;
  beforeEach(() => {
    agent = new Agent(_profile);
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
      expect(agent.createdAt).toBe(undefined);
      expect(agent.updatedAt).toBe(undefined);
      agent.save().then(obj => {
        expect(agent.createdAt instanceof Date).toBe(true);
        expect(agent.updatedAt instanceof Date).toBe(true);
        done();
      }).catch(err => {
        done.fail(err);
      });
    });

    describe('publicAddress', () => {

      it('is required', done => {
        Agent.create({..._profile, publicAddress: undefined }).then(obj => {
          done.fail('This should not have saved');
        }).catch(error => {
          expect(Object.keys(error.errors).length).toEqual(1);
          expect(error.errors['publicAddress'].message).toEqual('Public address required');
          done();
        });
      });

      it('cannot be null', done => {
        Agent.create({..._profile, publicAddress: null }).then(obj => {
          done.fail('This should not have saved');
        }).catch(error => {
          expect(Object.keys(error.errors).length).toEqual(1);
          expect(error.errors['publicAddress'].message).toEqual('Public address required');
          done();
        });
      });

      it('is unique', done => {
        agent.save().then(obj => {
          Agent.create(_profile).then(obj => {
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
        Agent.create({..._profile, publicAddress: 'this is not valid' }).then(obj => {
          done.fail('This should not have saved');
        }).catch(error => {
          expect(Object.keys(error.errors).length).toEqual(1);
          expect(error.errors['publicAddress'].message).toEqual('Invalid public address');
          done();
        });
      });

      it('cannot be blank', done => {
        Agent.create({..._profile, publicAddress: '' }).then(obj => {
          done.fail('This should not have saved');
        }).catch(error => {
          expect(Object.keys(error.errors).length).toEqual(1);
          expect(error.errors['publicAddress'].message).toEqual('Public address required');
          done();
        });
      });

      it('trims whitespace', done => {
        Agent.create({..._profile, publicAddress: `   ${_profile.publicAddress}   ` }).then(obj => {
          expect(obj.publicAddress).toEqual(_profile.publicAddress);
          done();
        }).catch(error => {
          done.fail(error);
        });
      });

      describe('case insensitivity', () => {

        it('won\'t save a lowercase duplicate', done => {
          agent.save().then(obj => {
            expect(obj.publicAddress).toEqual(_profile.publicAddress);

            // Create lowercase dup
            Agent.create({..._profile, publicAddress: _profile.publicAddress.toLowerCase() }).then(obj => {
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

        it('won\'t save an uppercase duplicate', done => {
          agent.save().then(obj => {
            expect(obj.publicAddress).toEqual(_profile.publicAddress);
            expect(obj.publicAddress).not.toEqual(_profile.publicAddress.toUpperCase().replace(/^0X/, '0x'));

            // Create uppercase dup
            Agent.create({..._profile, publicAddress: _profile.publicAddress.toUpperCase().replace(/^0X/, '0x') }).then(obj => {
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

        it('matches on a lowercase search', done => {
          agent.save().then(obj => {
            expect(obj.publicAddress).toEqual(_profile.publicAddress);
            expect(obj.publicAddress).not.toEqual(_profile.publicAddress.toLowerCase());

            Agent.findOne({ where: { publicAddress: _profile.publicAddress.toLowerCase() } }).then(agent => {
              expect(agent.publicAddress).toEqual(_profile.publicAddress);
              done();
            }).catch(error => {
              done.fail(error);
            });
          }).catch(error => {
            done.fail(error);
          });
        });

        it('matches on an uppercase search', done => {
          agent.save().then(obj => {
            expect(obj.publicAddress).toEqual(_profile.publicAddress);
            expect(obj.publicAddress).not.toEqual(_profile.publicAddress.toUpperCase().replace(/^0X/, '0x'));

            Agent.findOne({ where: { publicAddress: _profile.publicAddress.toUpperCase().replace(/^0X/, '0x') } }).then(agent => {
              expect(agent.publicAddress).toEqual(_profile.publicAddress);
              done();
            }).catch(error => {
              done.fail(error);
            });
          }).catch(error => {
            done.fail(error);
          });
        });
      });
    });

    describe('nonce', () => {

      it('is required and automatically set', done => {
        Agent.create({..._profile, nonce: undefined }).then(obj => {
          expect(obj.nonce).toBeDefined();
          done();
        }).catch(error => {
          done.fail(error);
        });
      });

      it('does not accept non-parsable bigint strings', done => {
        Agent.create({..._profile, nonce: 'this is not a bigint string' }).then(obj => {
          done.fail('This should not have saved');
        }).catch(error => {
          expect(Object.keys(error.errors).length).toEqual(1);
          expect(error.errors['nonce'].message).toEqual('Invalid nonce. Must be BigInt parsable');
          done();
        });
      });

      it('is a bigint parsable string', done => {
        expect(_profile.nonce).toBeUndefined();
        agent.save().then(obj => {
          expect(typeof obj.nonce).toEqual('string');
          expect(typeof BigInt(obj.nonce)).toEqual('bigint');
          done();
        }).catch(error => {
          done.fail(error);
        });
      });

      it('is manually set-able', done => {
        Agent.create({..._profile, nonce: BigInt(9007199254740991) }).then(obj => {
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
          Agent.create({..._profile, name: 'Wallet or agent name' }).then(obj => {
            expect(obj.name).toEqual('Wallet or agent name');
            done();
          }).catch(error => {
            done.fail(error);
          });
        });

         it('has 255 characters max', done => {
          Agent.create({..._profile, name: 'a'.repeat(256) }).then(obj => {
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
          Agent.create({..._profile, email: 'someguy@example.com' }).then(obj => {
            expect(obj.email).toEqual('someguy@example.com');
            done();
          }).catch(error => {
            done.fail(error);
          });
        });

        it('is valid', done => {
          Agent.create({..._profile, email: 'this is not an email' }).then(obj => {
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
          Agent.create({..._profile, streetAddress: '123 Fake Street' }).then(obj => {
            expect(obj.streetAddress).toEqual('123 Fake Street');
            done();
          }).catch(error => {
            done.fail(error);
          });
        });

         it('has 255 characters max', done => {
          Agent.create({..._profile, streetAddress: 'a'.repeat(256) }).then(obj => {
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
          Agent.create({..._profile, city: 'The C-Spot' }).then(obj => {
            expect(obj.city).toEqual('The C-Spot');
            done();
          }).catch(error => {
            done.fail(error);
          });
        });

         it('has 255 characters max', done => {
          Agent.create({..._profile, city: 'a'.repeat(256) }).then(obj => {
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
          Agent.create({..._profile, province: 'Alberta' }).then(obj => {
            expect(obj.province).toEqual('Alberta');
            done();
          }).catch(error => {
            done.fail(error);
          });
        });

         it('has 255 characters max', done => {
          Agent.create({..._profile, province: 'a'.repeat(256) }).then(obj => {
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
          Agent.create({..._profile, province: 'Alberta' }).then(obj => {
            expect(obj.province).toEqual('Alberta');
            done();
          }).catch(error => {
            done.fail(error);
          });
        });

         it('has 255 characters max', done => {
          Agent.create({..._profile, province: 'a'.repeat(256) }).then(obj => {
            done.fail('This should not have saved');
          }).catch(error => {
            expect(Object.keys(error.errors).length).toEqual(1);
            expect(error.errors['province'].message).toEqual('Province name too long');
            done();
          });
        });
      });

      describe('country', () => {

        it('is optional', done => {
          expect(_profile.country).toBeUndefined();
          Agent.create({..._profile, country: 'Canada' }).then(obj => {
            expect(obj.country).toEqual('Canada');
            done();
          }).catch(error => {
            done.fail(error);
          });
        });

         it('has 255 characters max', done => {
          Agent.create({..._profile, country: 'a'.repeat(256) }).then(obj => {
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
          Agent.create({..._profile, phone: '403-266-1234' }).then(obj => {
            expect(obj.phone).toEqual('403-266-1234');
            done();
          }).catch(error => {
            done.fail(error);
          });
        });

         it('validates most common number formats', done => {
          Agent.create({..._profile, phone: 'this is not a phone number' }).then(obj => {
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
});

