const _appName = require('../../package.json').name;
const fs = require('fs');
const cheerio = require('cheerio');
const request = require('supertest-session');
const app = require('../../app');
const models = require('../../models');
const cardanoUtils = require('cardano-crypto.js');
const setupWallet = require('../support/setupWallet');



fdescribe('auth', () => {

  let parentWalletSecret, parentWalletPublic, signingMessage;

  beforeAll(async () => {
    ({ parentWalletSecret, parentWalletPublic, signingMessage } = await setupWallet());
  });

  afterEach(done => {
    models.mongoose.connection.db.dropDatabase().then((err, result) => {
      done();
    }).catch(err => {
      done.fail(err);
    });
  });

  describe('POST /introduce', () => {

    it('starts a session on API access', done => {
      const session = request(app);
      expect(session.cookies.length).toEqual(0);
      session
        .post('/auth/introduce')
        .send({ publicAddress: parentWalletPublic })
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err, res) => {
          if (err) return done.fail(err);
          expect(session.cookies.length).toEqual(1);
          expect(session.cookies[0].name).toEqual(_appName);
          expect(session.cookies[0].value).toBeDefined();
          expect(typeof session.cookies[0].expiration_date).toEqual('number');
          expect(session.cookies[0].expiration_date).not.toEqual(Infinity);
          expect(session.cookies[0].path).toEqual('/');
          expect(session.cookies[0].explicit_path).toBe(true);
          expect(session.cookies[0].domain).toBeUndefined();
          expect(session.cookies[0].explicit_domain).toBe(false);
          expect(session.cookies[0].noscript).toBe(true);

          //
          // 2020-10-19
          //
          // The bulk of the above are defaults. These require manual
          // testing, because in order for such a cookie to be put into the
          // cookie jar, it would have to be HTTPS
          //
          // expect(session.cookies[0].secure).toBe(true);
          // expect(session.cookies[0].sameSite).toEqual('none');
          //
          // These are test expectations. Production expetations are commented above
          expect(session.cookies[0].secure).toBe(false);
          expect(session.cookies[0].sameSite).toBeUndefined();

          done();
        });
    });

    it('starts a session on browser access', done => {
      const session = request(app);
      expect(session.cookies.length).toEqual(0);
      session
        .post('/auth/introduce')
        .send({ publicAddress: parentWalletPublic })
        .set('Accept', 'text/html')
        .expect('Content-Type', /html/)
        .expect(201)
        .end((err, res) => {
          if (err) return done.fail(err);
          expect(session.cookies.length).toEqual(1);
          expect(session.cookies[0].name).toEqual(_appName);
          expect(session.cookies[0].value).toBeDefined();
          expect(typeof session.cookies[0].expiration_date).toEqual('number');
          expect(session.cookies[0].expiration_date).not.toEqual(Infinity);
          expect(session.cookies[0].path).toEqual('/');
          expect(session.cookies[0].explicit_path).toBe(true);
          expect(session.cookies[0].domain).toBeUndefined();
          expect(session.cookies[0].explicit_domain).toBe(false);
          expect(session.cookies[0].noscript).toBe(true);

          //
          // 2020-10-19
          //
          // The bulk of the above are defaults. These require manual
          // testing, because in order for such a cookie to be put into the
          // cookie jar, it would have to be HTTPS
          //
          // expect(session.cookies[0].secure).toBe(true);
          // expect(session.cookies[0].sameSite).toEqual('none');
          //
          // These are test expectations. Production expetations are commented above
          expect(session.cookies[0].secure).toBe(false);
          expect(session.cookies[0].sameSite).toBeUndefined();

          done();
        });
    });


    it('sets maximum cookie age to one hour', done => {
      const session = request(app);
      session
        .post('/auth/introduce')
        .send({ publicAddress: parentWalletPublic })
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err, res) => {
          if (err) return done.fail(err);
          expect(session.cookies.length).toEqual(1);
          expect(session.cookies[0].expiration_date <= Date.now() + 1000 * 60 * 60).toBe(true);
          done();
        });
    });

    describe('success', () => {

      describe('first onboarding', () => {

        describe('api', () => {

          it('returns a public address and message with nonce for signing', done => {
            request(app)
              .post('/auth/introduce')
              .send({ publicAddress: parentWalletPublic })
              .set('Accept', 'application/json')
              .expect('Content-Type', /json/)
              .expect(201)
              .end((err, res) => {
                if (err) return done.fail(err);
                expect(Object.keys(res.body.typedData.message).length).toEqual(2);
                expect(res.body.typedData.message.message).toEqual(signingMessage.toString('utf8'));
                expect(typeof BigInt(res.body.typedData.message.nonce)).toEqual('bigint');
                expect(res.body.publicAddress).toEqual(parentWalletPublic);

                done();
              });
          });

          it('creates a new Account record', done => {
            models.Account.find({}).then(accounts => {
              expect(accounts.length).toEqual(0);

              request(app)
                .post('/auth/introduce')
                .send({ publicAddress: parentWalletPublic })
                .set('Accept', 'application/json')
                .expect('Content-Type', /json/)
                .expect(201)
                .end((err, res) => {
                  if (err) return done.fail(err);

                  models.Account.find({}).then(accounts => {
                    expect(accounts.length).toEqual(1);
                    expect(accounts[0].publicAddress).toEqual(parentWalletPublic);

                    expect(typeof BigInt(accounts[0].nonce)).toEqual('bigint');
                    expect(accounts[0].nonce).toEqual(res.body.typedData.message.nonce);
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

          it('renders an instruction page with form-embedded public address', done => {
            request(app)
              .post('/auth/introduce')
              .send({ publicAddress: parentWalletPublic })
              .expect('Content-Type', /html/)
              .expect(201)
              .end((err, res) => {
                if (err) return done.fail(err);

                const $ = cheerio.load(res.text);
                expect($('#signed-message-form input[name="publicAddress"]').attr('value')).toContain(parentWalletPublic);
                expect($('#signed-message-form input[name="signature"]').attr('value')).toBeUndefined();

                done();
              });
          });

          it('creates a new Account record', done => {
            models.Account.find({}).then(accounts => {
              expect(accounts.length).toEqual(0);

              request(app)
                .post('/auth/introduce')
                .send({ publicAddress: parentWalletPublic })
                .expect('Content-Type', /html/)
                .expect(201)
                .end((err, res) => {
                  if (err) return done.fail(err);

                  models.Account.find({}).then(accounts => {
                    expect(accounts.length).toEqual(1);
                    expect(accounts[0].publicAddress).toEqual(parentWalletPublic);

                    expect(typeof BigInt(accounts[0].nonce)).toEqual('bigint');
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

      describe('subsequent onboardings', () => {

        beforeEach(done => {
          request(app)
            .post('/auth/introduce')
            .send({ publicAddress: parentWalletPublic })
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(201)
            .end((err, res) => {
              if (err) return done.fail(err);
              done();
            });
        });

        describe('api', () => {

          it('returns a public address and message with nonce for signing', done => {
            request(app)
              .post('/auth/introduce')
              .send({ publicAddress: parentWalletPublic })
              .set('Accept', 'application/json')
              .expect('Content-Type', /json/)
              .expect(201)
              .end((err, res) => {
                if (err) return done.fail(err);

                expect(Object.keys(res.body.typedData.message).length).toEqual(2);
                expect(res.body.typedData.message.message).toEqual(signingMessage.toString('utf8'));
                expect(typeof BigInt(res.body.typedData.message.nonce)).toEqual('bigint');
                expect(res.body.publicAddress).toEqual(parentWalletPublic);

                done();
              });
          });

          it('sets a new nonce in existing Account record', done => {
            models.Account.find({}).then(accounts => {
              expect(accounts.length).toEqual(1);
              expect(accounts[0].publicAddress).toEqual(parentWalletPublic);
              const nonce = accounts[0].nonce;

              request(app)
                .post('/auth/introduce')
                .send({ publicAddress: parentWalletPublic })
                .set('Accept', 'application/json')
                .expect('Content-Type', /json/)
                .expect(201)
                .end((err, res) => {
                  if (err) return done.fail(err);

                  models.Account.find({}).then(accounts => {
                    expect(accounts.length).toEqual(1);
                    expect(accounts[0].publicAddress).toEqual(parentWalletPublic);
                    expect(typeof BigInt(accounts[0].nonce)).toEqual('bigint');
                    expect(accounts[0].nonce).not.toEqual(nonce);
                    expect(accounts[0].nonce).toEqual(res.body.typedData.message.nonce);

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

          it('renders an instruction page with form-embedded public address', done => {
            request(app)
              .post('/auth/introduce')
              .send({ publicAddress: parentWalletPublic })
              .expect('Content-Type', /html/)
              .expect(201)
              .end((err, res) => {
                if (err) return done.fail(err);

                const $ = cheerio.load(res.text);
                expect($('#signed-message-form input[name="publicAddress"]').attr('value')).toContain(parentWalletPublic);
                expect($('#signed-message-form input[name="signature"]').attr('value')).toBeUndefined();

                done();
              });
          });

          it('sets a new nonce in existing Account record', done => {
            models.Account.find({}).then(accounts => {
              expect(accounts.length).toEqual(1);
              expect(accounts[0].publicAddress).toEqual(parentWalletPublic);
              const nonce = accounts[0].nonce;

              request(app)
                .post('/auth/introduce')
                .send({ publicAddress: parentWalletPublic })
                .expect('Content-Type', /html/)
                .expect(201)
                .end((err, res) => {
                  if (err) return done.fail(err);

                  models.Account.find({}).then(accounts => {
                    expect(accounts.length).toEqual(1);
                    expect(accounts[0].publicAddress).toEqual(parentWalletPublic);
                    expect(typeof BigInt(accounts[0].nonce)).toEqual('bigint');
                    expect(accounts[0].nonce).not.toEqual(nonce);
                    //expect(accounts[0].nonce).toEqual(res.body.typedData.message.nonce);

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

      describe('POST /prove', () => {

        let publicAddress, typedData, session;

        beforeEach(done => {
          session = request(app);
          session
            .post('/auth/introduce')
            .send({ publicAddress: parentWalletPublic })
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(201)
            .end((err, res) => {
              if (err) return done.fail(err);
              ({ publicAddress, typedData } = res.body);

              done();
            });
        });

        describe('success', () => {

          let signed;
          beforeEach(async () => {
            const typedDataStr =  typedData.message.nonce;
            let signature = cardanoUtils.sign(Buffer.from(typedDataStr, 'utf8'), parentWalletSecret);
            signed = cardanoUtils.sign(Buffer.from(typedDataStr, 'utf8'), parentWalletSecret).toString('hex');
          });

          describe('api', () => {

            it('returns 201 status with message', done => {
              session
                .post('/auth/prove')
                .send({ publicAddress: parentWalletPublic, signature: signed })
                .set('Content-Type', 'application/json')
                .set('Accept', 'application/json')
                .expect('Content-Type', /json/)
                .expect(201)
                .end((err, res) => {
                  if (err) return done.fail(err);
                  expect(res.body.message).toEqual('Welcome!');
                  done();
                });

            });

            it('attaches account_id to the session', done => {
              models.mongoose.connection.db.collection('sessions').find({}).toArray((err, sessions) => {
                if (err) return done.fail(err);

                expect(sessions.length).toEqual(1);
                expect(JSON.parse(sessions[0].session).account_id).toBeUndefined();

                session
                  .post('/auth/prove')
                  .send({ publicAddress: parentWalletPublic, signature: signed })
                  .set('Accept', 'application/json')
                  .set('Content-Type', 'application/json')
                  .expect('Content-Type', /json/)
                  .expect(201)
                  .end((err, res) => {
                    if (err) return done.fail(err);

                    models.mongoose.connection.db.collection('sessions').find({}).toArray((err, sessions) => {
                      if (err) return done.fail(err);

                      expect(sessions.length).toEqual(1);
                      expect(JSON.parse(sessions[0].session).account_id).toBeDefined();

                      models.Account.find({}).then(accounts => {
                        expect(accounts.length).toEqual(1);
                        expect(accounts[0].publicAddress).toEqual(parentWalletPublic);

                        expect(JSON.parse(sessions[0].session).account_id).toEqual(accounts[0]._id.toString());

                        done();
                      }).catch(err => {
                        done.fail(err);
                      });
                    });
                  });
              });
            });
          });

          describe('browser', () => {

            it('returns a redirect to home with message', done => {
              session
                .post('/auth/prove')
                .set('Content-Type', 'application/json')
                .send({ publicAddress: parentWalletPublic, signature: signed })
                .expect(302)
                .expect('Location', /\/$/)
                .end((err, res) => {
                  if (err) return done.fail(err);

                  // Follow redirect
                  session
                    .get(res.header['location'])
                    .expect(200)
                    .end((err, res) => {

                      const $ = cheerio.load(res.text);
                      expect($('#messages .alert.alert-success').text()).toContain('Welcome!');
                      done();
                    });
                });
            });

            it('attaches account_id to the session', done => {
              models.mongoose.connection.db.collection('sessions').find({}).toArray((err, sessions) => {
                if (err) return done.fail(err);

                expect(sessions.length).toEqual(1);
                expect(JSON.parse(sessions[0].session).account_id).toBeUndefined();

                session
                  .post('/auth/prove')
                  .set('Accept', 'text/html')
                  .send({ publicAddress: parentWalletPublic, signature: signed })
                  .expect(302)
                  .expect('Location', /\/$/)
                  .end((err, res) => {
                    if (err) return done.fail(err);

                    models.mongoose.connection.db.collection('sessions').find({}).toArray((err, sessions) => {
                      if (err) return done.fail(err);

                      expect(sessions.length).toEqual(1);
                      expect(JSON.parse(sessions[0].session).account_id).toBeDefined();

                      models.Account.find({}).then(accounts => {
                        expect(accounts.length).toEqual(1);
                        expect(accounts[0].publicAddress).toEqual(parentWalletPublic);

                        expect(JSON.parse(sessions[0].session).account_id).toEqual(accounts[0]._id.toString());

                        done();
                      }).catch(err => {
                        done.fail(err);
                      });
                    });
                  });
              });
            });
          });
        });

        describe('failure', () => {

          describe('bad private key', () => {

            let signed;

            beforeEach(async () => {
              const mnemonic = 'crowd captain hungry tray powder motor coast oppose month shed parent mystery torch resemble index';
              let someOtherSecret = await cardanoUtils.mnemonicToRootKeypair(mnemonic, 1)

              const typedDataStr =  typedData.message.nonce;
              const signature = cardanoUtils.sign(Buffer.from(typedDataStr, 'utf8'), someOtherSecret);
              signed = cardanoUtils.sign(Buffer.from(typedDataStr, 'utf8'), someOtherSecret).toString('hex');
            });

            describe('api', () => {

              it('returns 401 status with message', done => {
                request(app)
                  .post('/auth/prove')
                  .send({ publicAddress: parentWalletPublic, signature: signed })
                  .set('Content-Type', 'application/json')
                  .set('Accept', 'application/json')
                  .expect('Content-Type', /json/)
                  .expect(401)
                  .end((err, res) => {
                    if (err) return done.fail(err);

                    expect(res.body.message).toEqual('Signature verification failed');
                    done();
                  });
              });
            });

            describe('browser', () => {

              it('returns 302 status with message', done => {
                session = request(app);
                session
                  .post('/auth/prove')
                  .send({ publicAddress: parentWalletPublic, signature: signed })
                  .expect(302)
                  .end((err, res) => {
                    if (err) return done.fail(err);

                    // Follow redirect
                    session
                      .get(res.header['location'])
                      .expect(200)
                      .end((err, res) => {

                        const $ = cheerio.load(res.text);
                        expect($('#messages .alert.alert-error').text()).toContain('Signature verification failed');
                        done();
                      });
                  });
              });
            });
          });

          describe('incorrect nonce', () => {

            describe('api', () => {

              it('returns 401 status with message', done => {
                const typedDataStr = Math.floor(Math.random() * 1000000).toString();
                const signature = cardanoUtils.sign(Buffer.from(typedDataStr, 'utf8'), parentWalletSecret);
                signed = cardanoUtils.sign(Buffer.from(typedDataStr, 'utf8'), parentWalletSecret).toString('hex');

                request(app)
                  .post('/auth/prove')
                  //.send({ publicAddress: parentWalletPublic, signature: signed })
                  .send({ publicAddress: parentWalletPublic, signature: signed })
                  .set('Content-Type', 'application/json')
                  .set('Accept', 'application/json')
                  .expect('Content-Type', /json/)
                  .expect(401)
                  .end((err, res) => {
                    if (err) return done.fail(err);
                    expect(res.body.message).toEqual('Signature verification failed');
                    done();
                  });
              });
            });

            describe('browser', () => {

              it('returns 302 status with message', done => {
                const typedDataStr = Math.floor(Math.random() * 1000000).toString();
                const signature = cardanoUtils.sign(Buffer.from(typedDataStr, 'utf8'), parentWalletSecret);
                signed = cardanoUtils.sign(Buffer.from(typedDataStr, 'utf8'), parentWalletSecret).toString('hex');

                session = request(app)
                session
                  .post('/auth/prove')
                  .send({ publicAddress: parentWalletPublic, signature: signed })
                  .expect(302)
                  .end((err, res) => {
                    if (err) return done.fail(err);

                    // Follow redirect
                    session
                      .get(res.header['location'])
                      .expect(200)
                      .end((err, res) => {

                        const $ = cheerio.load(res.text);
                        expect($('#messages .alert.alert-error').text()).toContain('Signature verification failed');
                        done();
                      });
                  });
              });
            });
          });
        });
      });
    });

    describe('failure', () => {

      describe('invalid ethereum address', () => {

        describe('api', () => {

          it('returns an error', done => {
            request(app)
              .post('/auth/introduce')
              .send({ publicAddress: 'invalid ethereum address' })
              .set('Content-Type', 'application/json')
              .set('Accept', 'application/json')
              .expect('Content-Type', /json/)
              .expect(400)
              .end((err, res) => {
                if (err) return done.fail(err);
                expect(res.body.message).toEqual('Invalid public address');
                done();
              });
          });

          it('does not create a new Account record', done => {
            models.Account.find({}).then(accounts => {
              expect(accounts.length).toEqual(0);

              request(app)
                .post('/auth/introduce')
                .send({ publicAddress: 'invalid ethereum address' })
                .set('Content-Type', 'application/json')
                .set('Accept', 'application/json')
                .expect('Content-Type', /json/)
                .expect(400)
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

        // 2021-10-1 This is kind of weird. My original plan was to implement
        // the auth flow with client-side fetches. If that's the only way, then
        // these tests don't make sense. If there is another way, then that
        // would be the better option for session-managed authentication, as it
        // is implemented here.
        describe('browser', () => {

          it('redirects', done => {
            session = request(app)
            session
              .post('/auth/introduce')
              .send({ publicAddress: 'invalid ethereum address' })
              .expect(302)
              .end((err, res) => {
                if (err) return done.fail(err);

                // Follow redirect
                session
                  .get(res.header['location'])
                  .expect(200)
                  .end((err, res) => {

                    const $ = cheerio.load(res.text);
                    expect($('#messages .alert.alert-error').text()).toContain('I don\'t think you have Nami installed');
                    done();
                  });
              });
          });

          it('does not create a new Account record', done => {
            models.Account.find({}).then(accounts => {
              expect(accounts.length).toEqual(0);

              request(app)
                .post('/auth/introduce')
                .send({ publicAddress: 'invalid ethereum address' })
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
  });

  describe('GET /disconnect', () => {
    let session;

    beforeEach(done => {
      session = request(app);
      session
        .post('/auth/introduce')
        .send({ publicAddress: parentWalletPublic })
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err, res) => {
          if (err) return done.fail(err);
          done();
        });
    });

    it('redirects home without a message', done => {
      expect(session.cookies.length).toEqual(1);
      session
        .get('/auth/disconnect')
        .expect(302)
        .end((err, res) => {
          if (err) return done.fail(err);

          // Follow redirect
          session
            .get(res.header['location'])
            .expect(200)
            .end((err, res) => {

              // 2021-10-1 https://github.com/cheeriojs/cheerio/issues/798#issuecomment-171882953
              const $ = cheerio.load(res.text);
              expect($('#messages strong').length).toEqual(0);
              done();
            });
        });
    });

    it('clears the session', done => {
      expect(session.cookies.length).toEqual(1);
      session
        .get('/auth/disconnect')
        .expect(302)
        .end((err, res) => {
          if (err) return done.fail(err);
          expect(session.cookies.length).toEqual(0);
          done();
        });
    });
  });
});
