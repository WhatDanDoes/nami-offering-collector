const db = require('../../models');
const Transaction = db.Transaction;
const ethers = require('ethers');

describe('Transaction', () => {

  const _tx = {
    // Swiped from `ganache`
    hash: '0x81a0a82dfbb7f818e9bbaf1050194bcaf8dd91d2ebf07e72cabe58a7b4174df7',
    value: ethers.utils.parseEther('100'),
  };

  const _account = {
    // Likewise
    publicAddress: '0x0eDB511d9434452D24a3Eeb47E3d02Fda903A73a',
  };


  let transaction;
  beforeEach(() => {
  });

  beforeEach(done => {
    db.Agent.create(_account).then(obj => {
      account = obj;

      transaction = new Transaction({ ..._tx, account: account });

      done();
    }).catch(err => {
      done.fail(err);
    });
  });

  afterEach(done => {
    db.mongoose.connection.db.dropDatabase().then(result => {
      done();
    }).catch(err => {
      done.fail(err);
    });
  });

  describe('basic validation', () => {

    it('sets only the createdAt field', done => {
      expect(transaction.createdAt).toBe(undefined);
      expect(transaction.updatedAt).toBe(undefined);
      transaction.save().then(obj => {
        expect(transaction.createdAt instanceof Date).toBe(true);
        expect(transaction.updatedAt).toBe(undefined);
        done();
      }).catch(err => {
        done.fail(err);
      });
    });

    it('requires an account', done => {
      transaction.account = undefined;
      expect(transaction.account).toBe(undefined);
      transaction.save().then(obj => {
        done.fail('This should not have saved');
      }).catch(error => {
        expect(Object.keys(error.errors).length).toEqual(1);
        expect(error.errors['account'].message).toEqual('To what account does this transaction belong?');
        done();
      });
    });

    describe('hash', () => {

      it('is required', done => {
        Transaction.create({..._tx, account: account, hash: undefined }).then(obj => {
          done.fail('This should not have saved');
        }).catch(error => {
          expect(Object.keys(error.errors).length).toEqual(1);
          expect(error.errors['hash'].message).toEqual('Transaction hash required');
          done();
        });
      });

      it('cannot be null', done => {
        Transaction.create({..._tx, account: account, hash: null }).then(obj => {
          done.fail('This should not have saved');
        }).catch(error => {
          expect(Object.keys(error.errors).length).toEqual(1);
          expect(error.errors['hash'].message).toEqual('Transaction hash required');
          done();
        });
      });

      it('is unique', done => {
        transaction.save().then(obj => {
          Transaction.create({..._tx, account: account}).then(obj => {
            done.fail('This should not have saved');
          }).catch(error => {
            expect(Object.keys(error.errors).length).toEqual(1);
            expect(error.errors['hash'].message).toEqual('That transaction hash is already registered');
            done();
          });
        }).catch(error => {
          done.fail(error);
        });
      });

      it('is valid', done => {
        Transaction.create({..._tx, account: account, hash: 'this is not valid' }).then(obj => {
          done.fail('This should not have saved');
        }).catch(error => {
          expect(Object.keys(error.errors).length).toEqual(1);
          expect(error.errors['hash'].message).toEqual('Invalid transaction hash');
          done();
        });
      });

      it('cannot be blank', done => {
        Transaction.create({..._tx, account: account, hash: '' }).then(obj => {
          done.fail('This should not have saved');
        }).catch(error => {
          expect(Object.keys(error.errors).length).toEqual(1);
          expect(error.errors['hash'].message).toEqual('Transaction hash required');
          done();
        });
      });

      it('trims whitespace', done => {
        Transaction.create({..._tx, account: account, hash: `   ${_tx.hash}   ` }).then(obj => {
          expect(obj.hash).toEqual(_tx.hash);
          done();
        }).catch(error => {
          done.fail(error);
        });
      });

      describe('case insensitivity', () => {

        it('won\'t save a lowercase duplicate', done => {
          transaction.save().then(obj => {
            expect(obj.hash).toEqual(_tx.hash);

            // Create lowercase dup
            Transaction.create({..._tx, account: account, hash: _tx.hash.toLowerCase() }).then(obj => {
              done.fail('This should not have saved');
            }).catch(error => {
              expect(Object.keys(error.errors).length).toEqual(1);
              expect(error.errors['hash'].message).toEqual('That transaction hash is already registered');
              done();
            });
          }).catch(error => {
            done.fail(error);
          });
        });

        it('won\'t save an uppercase duplicate', done => {
          transaction.save().then(obj => {
            expect(obj.hash).toEqual(_tx.hash);
            expect(obj.hash).not.toEqual(_tx.hash.toUpperCase().replace(/^0X/, '0x'));

            // Create uppercase dup
            Transaction.create({..._tx, account: account, hash: _tx.hash.toUpperCase().replace(/^0X/, '0x') }).then(obj => {
              done.fail('This should not have saved');
            }).catch(error => {
              expect(Object.keys(error.errors).length).toEqual(1);
              expect(error.errors['hash'].message).toEqual('That transaction hash is already registered');
              done();
            });
          }).catch(error => {
            done.fail(error);
          });
        });

        it('matches on a lowercase search', done => {
          transaction.hash = _tx.hash.toUpperCase().replace(/^0X/, '0x');
          transaction.save().then(obj => {
            expect(obj.hash).toEqual(_tx.hash.toUpperCase().replace(/^0X/, '0x'));
            expect(obj.hash).not.toEqual(_tx.hash.toLowerCase());

            Transaction.findOne({ hash: _tx.hash.toLowerCase() }).then(transaction => {
              expect(transaction.hash).toEqual(_tx.hash.toUpperCase().replace(/^0X/, '0x'));
              done();
            }).catch(error => {
              done.fail(error);
            });
          }).catch(error => {
            done.fail(error);
          });
        });

        it('matches on an uppercase search', done => {
          transaction.save().then(obj => {
            expect(obj.hash).toEqual(_tx.hash);
            expect(obj.hash).not.toEqual(_tx.hash.toUpperCase().replace(/^0X/, '0x'));

            Transaction.findOne({ hash: _tx.hash.toUpperCase().replace(/^0X/, '0x') }).then(transaction => {
              expect(transaction.hash).toEqual(_tx.hash);
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

    describe('value', () => {

      it('is required', done => {
        Transaction.create({..._tx, account: account, value: undefined }).then(obj => {
          done.fail('This should not have saved');
        }).catch(error => {
          expect(Object.keys(error.errors).length).toEqual(1);
          expect(error.errors['value'].message).toEqual('Value is required');
          done();
        });
      });

      it('is a BigNum', done => {
        Transaction.create({..._tx, account: account, value: 'Not a BigNumber' }).then(obj => {
          done.fail('This should not have saved');
        }).catch(error => {
          expect(Object.keys(error.errors).length).toEqual(1);
          expect(error.errors['value'].message).toEqual('Value must be a BigNumber');
          done();
        });
      });
    });
  });
});

