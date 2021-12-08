const sigUtil = require('eth-sig-util');
const ethUtil = require('ethereumjs-util');
const ethers = require('ethers');
const cheerio = require('cheerio');
const request = require('supertest-session');
const app = require('../../app');
const models = require('../../models');

describe('account management', () => {

  jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;

  // These were provided by ganache-cli
  const _publicAddress = '0x034F8c5c8381Bf45511d071875333Eba143Bd10e';
  const _privateAddress = '0xb30b64470fe770bbe8e9ff6478e550ce99e7f38d8e07ec2dbe27e8ff45742cf6';

  afterEach(done => {
    models.mongoose.connection.db.dropDatabase().then((err, result) => {
      done();
    }).catch(err => {
      done.fail(err);
    });
  });

  describe('GET /account', () => {

    describe('authorized', () => {

      let session, account;

      beforeEach(done => {
        session = request(app);
        session
          .post('/auth/introduce')
          .send({ publicAddress: _publicAddress })
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(201)
          .end((err, res) => {
            if (err) return done.fail(err);
            ({ publicAddress, typedData } = res.body);

            const signed = sigUtil.signTypedData(ethUtil.toBuffer(_privateAddress), {privateKey: _privateAddress, data: typedData, version: 'V3' });

            session
              .post('/auth/prove')
              .send({ publicAddress: _publicAddress, signature: signed })
              .set('Content-Type', 'application/json')
              .set('Accept', 'application/json')
              .expect('Content-Type', /json/)
              .expect(201)
              .end((err, res) => {
                if (err) return done.fail(err);

                expect(res.body.message).toEqual('Welcome!');

                models.Account.findOne({ where: { publicAddress: _publicAddress } }).then(result => {
                  account = result;

                  done();
                }).catch(err => {
                  done.fail(err);
                });
              });
          });
      });

      describe('api', () => {

        it('returns successfully', done => {
          session
           .get('/account')
           .set('Accept', 'application/json')
           .expect('Content-Type', /json/)
           .expect(200)
           .end((err, res) => {
             if (err) return done.fail(err);
             expect(res.body.publicAddress).toEqual(account.publicAddress);
             done();
           });
        });
      });

      describe('browser', () => {

        it('returns successfully', done => {
          session
            .get('/account')
            .expect('Content-Type', /text/)
            .expect(200)
            .end((err, res) => {
              if (err) return done.fail(err);

              const $ = cheerio.load(res.text);

              // Link to transactions
              expect($('header a[href="/transaction"] #transaction-button').text().trim()).toEqual('Transactions');
              // Link to donate
              expect($('header a[href="/"] #donate-button').text().trim()).toEqual('Donate');

              done();
            });
        });
      });
    });

    describe('unauthorized', () => {

      describe('api', () => {

        it('returns 401 with a friendly message', done => {
          request(app)
           .get('/account')
           .set('Accept', 'application/json')
           .expect('Content-Type', /json/)
           .expect(401)
           .end((err, res) => {
             if (err) return done.fail(err);
             expect(res.body.message).toEqual('Unauthorized');
             done();
           });
        });
      });

      describe('browser', () => {

        it('redirects', done => {
          request(app)
           .get('/account')
           .expect('Content-Type', /text/)
           .expect(302)
           .end((err, res) => {
             if (err) return done.fail(err);

             expect(res.headers['location']).toEqual('/');
             done();
           });
        });
      });
    });
  });

  describe('GET /account/:id', () => {

    describe('authorized', () => {

      let session, account;

      beforeEach(done => {
        session = request(app);
        session
          .post('/auth/introduce')
          .send({ publicAddress: _publicAddress })
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(201)
          .end((err, res) => {
            if (err) return done.fail(err);
            ({ publicAddress, typedData } = res.body);

            const signed = sigUtil.signTypedData(ethUtil.toBuffer(_privateAddress), {privateKey: _privateAddress, data: typedData, version: 'V3' });

            session
              .post('/auth/prove')
              .send({ publicAddress: _publicAddress, signature: signed })
              .set('Content-Type', 'application/json')
              .set('Accept', 'application/json')
              .expect('Content-Type', /json/)
              .expect(201)
              .end((err, res) => {
                if (err) return done.fail(err);

                expect(res.body.message).toEqual('Welcome!');

                models.Account.findOne({ where: { publicAddress: _publicAddress } }).then(result => {
                  account = result;

                  done();
                }).catch(err => {
                  done.fail(err);
                });
              });
          });
      });

      describe('api', () => {

        it('returns successfully', done => {
          session
           .get(`/account/${_publicAddress}`)
           .set('Accept', 'application/json')
           .expect('Content-Type', /json/)
           .expect(200)
           .end((err, res) => {
             if (err) return done.fail(err);
             expect(res.body.publicAddress).toEqual(account.publicAddress);
             done();
           });
        });
      });

      describe('browser', () => {

        it('returns successfully', done => {
          session
           .get(`/account/${_publicAddress}`)
           .expect('Content-Type', /text/)
           .expect(200)
           .end((err, res) => {
             if (err) return done.fail(err);
             done();
           });
        });
      });
    });

    describe('unauthorized', () => {

      describe('api', () => {

        it('returns 401 with a friendly message', done => {
          request(app)
           .get('/account/some-other-public-address')
           .set('Accept', 'application/json')
           .expect('Content-Type', /json/)
           .expect(401)
           .end((err, res) => {
             if (err) return done.fail(err);
             expect(res.body.message).toEqual('Unauthorized');
             done();
           });
        });
      });

      describe('browser', () => {

        it('redirects', done => {
          request(app)
           .get('/account/some-other-public-address')
           .expect('Content-Type', /text/)
           .expect(302)
           .end((err, res) => {
             if (err) return done.fail(err);

             expect(res.headers['location']).toEqual('/');
             done();
           });
        });
      });
    });
  });

  describe('PUT /account', () => {

    describe('authorized', () => {

      let session, account;

      beforeEach(done => {
        session = request(app);
        session
          .post('/auth/introduce')
          .send({ publicAddress: _publicAddress })
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(201)
          .end((err, res) => {
            if (err) return done.fail(err);
            ({ publicAddress, typedData } = res.body);

            const signed = sigUtil.signTypedData(ethUtil.toBuffer(_privateAddress), {privateKey: _privateAddress, data: typedData, version: 'V3' });

            session
              .post('/auth/prove')
              .send({ publicAddress: _publicAddress, signature: signed })
              .set('Content-Type', 'application/json')
              .set('Accept', 'application/json')
              .expect('Content-Type', /json/)
              .expect(201)
              .end((err, res) => {
                if (err) return done.fail(err);

                expect(res.body.message).toEqual('Welcome!');

                models.Account.findOne({ where: { publicAddress: _publicAddress } }).then(result => {
                  account = result;

                  done();
                }).catch(err => {
                  done.fail(err);
                });
              });
          });
      });

      describe('api', () => {

        describe('success', () => {

          it('returns 201 with a friendly message', done => {
             session
              .put('/account')
              .send({ name: 'Some Guy' })
              .set('Accept', 'application/json')
              .expect('Content-Type', /json/)
              .expect(201)
              .end((err, res) => {
                if (err) return done.fail(err);

                expect(res.body.message).toEqual('Info updated');
                done();
              });
          });

          it('updates the database', done => {
            expect(account.name).toBeUndefined();
            session
              .put('/account')
              .send({ name: 'Some Guy' })
              .set('Accept', 'application/json')
              .expect('Content-Type', /json/)
              .expect(201)
              .end((err, res) => {
                if (err) return done.fail(err);

                models.Account.find({}).then(accounts => {
                  expect(accounts.length).toEqual(1);
                  expect(accounts[0].name).toEqual('Some Guy');
                  expect(accounts[0].publicAddress).toEqual(_publicAddress);

                  done();
                }).catch(err => {
                  done.fail(err);
                });
              });
          });
        });

        describe('failure', () => {

          it('does not allow modifying publicAddress', done => {
            expect(account.publicAddress).toEqual(_publicAddress);
            session
              .put('/account')
              .send({ publicAddress: '0x4D8B94b1358DB655aCAdcCF43768b9AbA00b2e74' })
              .set('Accept', 'application/json')
              .expect('Content-Type', /json/)
              .expect(403)
              .end((err, res) => {
                if (err) return done.fail(err);

                expect(res.body.message).toEqual('Forbidden');

                models.Account.find({}).then(accounts => {
                  expect(accounts.length).toEqual(1);
                  expect(accounts[0].publicAddress).toEqual(_publicAddress);

                  done();
                }).catch(err => {
                  done.fail(err);
                });
              });
          });

          it('does not allow modifying nonce', done => {
            const currentNonce = account.nonce;
            const newNonce = Math.floor(Math.random() * 1000000).toString();
            expect(currentNonce).not.toEqual(newNonce);
            session
              .put('/account')
              .send({ nonce: newNonce })
              .set('Accept', 'application/json')
              .expect('Content-Type', /json/)
              .expect(403)
              .end((err, res) => {
                if (err) return done.fail(err);

                expect(res.body.message).toEqual('Forbidden');

                models.Account.find({}).then(accounts => {
                  expect(accounts.length).toEqual(1);
                  expect(accounts[0].nonce).toEqual(currentNonce);

                  done();
                }).catch(err => {
                  done.fail(err);
                });
              });
          });
        });
      });

      describe('browser', () => {

        describe('success', () => {

          it('redirects', done => {
            session
              .put('/account')
              .send({ name: 'Some Guy' })
              .expect('Content-Type', /text/)
              .expect(302)
              .end((err, res) => {
                if (err) return done.fail(err);

                expect(res.headers['location']).toEqual('/account');
                done();
              });
          });

          it('updates the database', done => {
            expect(account.name).toBeUndefined();
            session
              .put('/account')
              .send({ name: 'Some Guy' })
              .expect('Content-Type', /text/)
              .expect(302)
              .end((err, res) => {
                if (err) return done.fail(err);

                models.Account.find({}).then(accounts => {
                  expect(accounts.length).toEqual(1);
                  expect(accounts[0].name).toEqual('Some Guy');
                  expect(accounts[0].publicAddress).toEqual(_publicAddress);

                  done();
                }).catch(err => {
                  done.fail(err);
                });
              });
          });
        });

        describe('failure', () => {

          it('does not allow modifying publicAddress', done => {
            expect(account.publicAddress).toEqual(_publicAddress);
            session
              .put('/account')
              .send({ publicAddress: '0x4D8B94b1358DB655aCAdcCF43768b9AbA00b2e74' })
              .expect('Content-Type', /text/)
              .expect(403)
              .end((err, res) => {
                if (err) return done.fail(err);

                models.Account.find({}).then(accounts => {
                  expect(accounts.length).toEqual(1);
                  expect(accounts[0].publicAddress).toEqual(_publicAddress);

                  done();
                }).catch(err => {
                  done.fail(err);
                });
              });
          });

          it('does not allow modifying nonce', done => {
            const currentNonce = account.nonce;
            const newNonce = Math.floor(Math.random() * 1000000).toString();
            expect(currentNonce).not.toEqual(newNonce);
            session
              .put('/account')
              .send({ nonce: newNonce })
              .expect('Content-Type', /html/)
              .expect(403)
              .end((err, res) => {
                if (err) return done.fail(err);

                models.Account.find({}).then(accounts => {
                  expect(accounts.length).toEqual(1);
                  expect(accounts[0].nonce).toEqual(currentNonce);

                  done();
                }).catch(err => {
                  done.fail(err);
                });
              });
          });
        });
      });
    });

    describe('unauthorized', () => {

      describe('api', () => {

        it('returns 401 with a friendly message', done => {
          request(app)
            .put('/account')
            .send({ name: 'Some Guy' })
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(401)
            .end((err, res) => {
              if (err) return done.fail(err);

              expect(res.body.message).toEqual('Unauthorized');
              done();
            });
        });

        it('does not modify the database', done => {
          models.Account.find({}).then(accounts => {
            expect(accounts.length).toEqual(0);

            request(app)
              .put('/account')
              .send({ name: 'Some Guy' })
              .set('Accept', 'application/json')
              .expect('Content-Type', /json/)
              .expect(401)
              .end((err, res) => {
                if (err) return done.fail(err);

                models.Account.find({}).then(accounts => {
                  expect(accounts.length).toEqual(0);

                  done();
                }).catch(err => {
                  done.fail(err);
                });
              });

          }).catch(err => {
            done.fail(err);
          });
        });
      });

      describe('browser', () => {

        it('redirects', done => {
          request(app)
            .put('/account')
            .send({ name: 'Some Guy' })
            .expect('Content-Type', /text/)
            .expect(302)
            .end((err, res) => {
              if (err) return done.fail(err);

              expect(res.headers['location']).toEqual('/');
              done();
            });
        });

        it('does not modify the database', done => {
          models.Account.find({}).then(accounts => {
            expect(accounts.length).toEqual(0);

            request(app)
              .put('/account')
              .send({ name: 'Some Guy' })
              .expect('Content-Type', /text/)
              .expect(302)
              .end((err, res) => {
                if (err) return done.fail(err);

                models.Account.find({}).then(accounts => {
                  expect(accounts.length).toEqual(0);

                  done();
                }).catch(err => {
                  done.fail(err);
                });
              });
          }).catch(err => {
            done.fail(err);
          });
        });
      });
    });
  });

  describe('PUT /account/:publicAddress', () => {

    let session, account;

    beforeEach(done => {
      session = request(app);
      session
        .post('/auth/introduce')
        .send({ publicAddress: _publicAddress })
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err, res) => {
          if (err) return done.fail(err);
          ({ publicAddress, typedData } = res.body);

          const signed = sigUtil.signTypedData(ethUtil.toBuffer(_privateAddress), {privateKey: _privateAddress, data: typedData, version: 'V3' });

          session
            .post('/auth/prove')
            .send({ publicAddress: _publicAddress, signature: signed })
            .set('Content-Type', 'application/json')
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(201)
            .end((err, res) => {
              if (err) return done.fail(err);

              expect(res.body.message).toEqual('Welcome!');

              models.Account.findOne({ where: { publicAddress: _publicAddress } }).then(result => {
                account = result;

                done();
              }).catch(err => {
                done.fail(err);
              });
            });
        });
    });

    describe('authorized', () => {

      describe('api', () => {

        describe('success', () => {

          it('returns 201 with a friendly message', done => {
             session
              .put(`/account/${account.publicAddress}`)
              .send({ name: 'Some Guy' })
              .set('Accept', 'application/json')
              .expect('Content-Type', /json/)
              .expect(201)
              .end((err, res) => {
                if (err) return done.fail(err);

                expect(res.body.message).toEqual('Info updated');
                done();
              });
          });

          it('updates the database', done => {
            expect(account.name).toBeUndefined();
            session
              .put(`/account/${account.publicAddress}`)
              .send({ name: 'Some Guy' })
              .set('Accept', 'application/json')
              .expect('Content-Type', /json/)
              .expect(201)
              .end((err, res) => {
                if (err) return done.fail(err);

                models.Account.find({}).then(accounts => {
                  expect(accounts.length).toEqual(1);
                  expect(accounts[0].name).toEqual('Some Guy');
                  expect(accounts[0].publicAddress).toEqual(_publicAddress);

                  done();
                }).catch(err => {
                  done.fail(err);
                });
              });
          });
        });

        describe('failure', () => {

          it('does not allow modifying publicAddress', done => {
            expect(account.publicAddress).toEqual(_publicAddress);
            session
              .put(`/account/${account.publicAddress}`)
              .send({ publicAddress: '0x4D8B94b1358DB655aCAdcCF43768b9AbA00b2e74' })
              .set('Accept', 'application/json')
              .expect('Content-Type', /json/)
              .expect(403)
              .end((err, res) => {
                if (err) return done.fail(err);

                expect(res.body.message).toEqual('Forbidden');

                models.Account.find({}).then(accounts => {
                  expect(accounts.length).toEqual(1);
                  expect(accounts[0].publicAddress).toEqual(_publicAddress);

                  done();
                }).catch(err => {
                  done.fail(err);
                });
              });
          });

          it('does not allow modifying nonce', done => {
            const currentNonce = account.nonce;
            const newNonce = Math.floor(Math.random() * 1000000).toString();
            expect(currentNonce).not.toEqual(newNonce);
            session
              .put(`/account/${account.publicAddress}`)
              .send({ nonce: newNonce })
              .set('Accept', 'application/json')
              .expect('Content-Type', /json/)
              .expect(403)
              .end((err, res) => {
                if (err) return done.fail(err);

                expect(res.body.message).toEqual('Forbidden');

                models.Account.find({}).then(accounts => {
                  expect(accounts.length).toEqual(1);
                  expect(accounts[0].nonce).toEqual(currentNonce);

                  done();
                }).catch(err => {
                  done.fail(err);
                });
              });
          });
        });
      });

      describe('browser', () => {

        describe('success', () => {

          it('redirects', done => {
            session
              .put(`/account/${account.publicAddress}`)
              .send({ name: 'Some Guy' })
              .expect('Content-Type', /text/)
              .expect(302)
              .end((err, res) => {
                if (err) return done.fail(err);

                expect(res.headers['location']).toEqual(`/account/${account.publicAddress}`);
                done();
              });
          });

          it('updates the database', done => {
            expect(account.name).toBeUndefined();
            session
              .put(`/account/${account.publicAddress}`)
              .send({ name: 'Some Guy' })
              .expect('Content-Type', /text/)
              .expect(302)
              .end((err, res) => {
                if (err) return done.fail(err);

                models.Account.find({}).then(accounts => {
                  expect(accounts.length).toEqual(1);
                  expect(accounts[0].name).toEqual('Some Guy');
                  expect(accounts[0].publicAddress).toEqual(_publicAddress);

                  done();
                }).catch(err => {
                  done.fail(err);
                });
              });
          });
        });

        describe('failure', () => {

          it('does not allow modifying publicAddress', done => {
            expect(account.publicAddress).toEqual(_publicAddress);
            session
              .put(`/account/${account.publicAddress}`)
              .send({ publicAddress: '0x4D8B94b1358DB655aCAdcCF43768b9AbA00b2e74' })
              .expect('Content-Type', /text/)
              .expect(403)
              .end((err, res) => {
                if (err) return done.fail(err);

                models.Account.find({}).then(accounts => {
                  expect(accounts.length).toEqual(1);
                  expect(accounts[0].publicAddress).toEqual(_publicAddress);

                  done();
                }).catch(err => {
                  done.fail(err);
                });
              });
          });

          it('does not allow modifying nonce', done => {
            const currentNonce = account.nonce;
            const newNonce = Math.floor(Math.random() * 1000000).toString();
            expect(currentNonce).not.toEqual(newNonce);
            session
              .put(`/account/${account.publicAddress}`)
              .send({ nonce: newNonce })
              .expect('Content-Type', /html/)
              .expect(403)
              .end((err, res) => {
                if (err) return done.fail(err);

                models.Account.find({}).then(accounts => {
                  expect(accounts.length).toEqual(1);
                  expect(accounts[0].nonce).toEqual(currentNonce);

                  done();
                }).catch(err => {
                  done.fail(err);
                });
              });
          });
        });
      });
    });

    describe('unauthorized', () => {

      let anotherAccount;
      beforeEach(done => {
        models.Account.create({ publicAddress: '0xE40153f2428846Ce1FFB7B4169ce08c9374b1187' }).then(result => {
          anotherAccount = result;
          done();
        }).catch(err => {
          done.fail(err);
        });
      });

      describe('api', () => {

        it('returns 401 with a friendly message', done => {
          session
            .put(`/account/${anotherAccount.publicAddress}`)
            .send({ name: 'Some Guy' })
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(403)
            .end((err, res) => {
              if (err) return done.fail(err);

              expect(res.body.message).toEqual('Forbidden');
              done();
            });
        });

        it('does not modify the database', done => {
          expect(anotherAccount.name).toBeUndefined();
          session
            .put(`/account/${anotherAccount.publicAddress}`)
            .send({ name: 'Some Guy' })
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(403)
            .end((err, res) => {
              if (err) return done.fail(err);

              models.Account.findOne({ publicAddress: anotherAccount.publicAddress }).then(account => {
                expect(account.name).toBeUndefined();

                done();
              }).catch(err => {
                done.fail(err);
              });
            });
        });
      });

      describe('browser', () => {

        it('redirects', done => {
          session
            .put(`/account/${anotherAccount.publicAddress}`)
            .send({ name: 'Some Guy' })
            .expect('Content-Type', /text/)
            .expect(302)
            .end((err, res) => {
              if (err) return done.fail(err);

              expect(res.headers['location']).toEqual('/account');
              done();
            });
        });

        it('does not modify the database', done => {
          models.Account.findOne({ publicAddress: anotherAccount.publicAddress }).then(account => {
            expect(account.name).toBeUndefined();

            session
              .put(`/account/${anotherAccount.publicAddress}`)
              .send({ name: 'Some Guy' })
              .expect('Content-Type', /text/)
              .expect(302)
              .end((err, res) => {
                if (err) return done.fail(err);

                models.Account.findOne({ publicAddress: anotherAccount.publicAddress }).then(account => {
                  expect(account.name).toBeUndefined();

                  done();
                }).catch(err => {
                  done.fail(err);
                });
              });
          }).catch(err => {
            done.fail(err);
          });
        });
      });
    });
  });
});
