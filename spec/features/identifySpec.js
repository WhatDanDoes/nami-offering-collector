const fs = require('fs');
const request = require('supertest-session');
const app = require('../../app');
const models = require('../../models');

describe('/identify', () => {

  jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;

  const _publicAddress = '0xc5425573eE45B1fF67aAf1fB0982E64e772769A7';

  describe('POST', () => {

    let signingMessage;
    beforeEach(async () => {
      signingMessage = fs.readFileSync('./message.txt', 'utf8');
    });

    afterEach(done => {
      models.mongoose.connection.db.dropDatabase().then((err, result) => {
        done();
      }).catch(function(err) {
        done.fail(err);
      });
    });

    describe('success', () => {

      describe('first onboarding', () => {

        it('returns a public address and message with nonce for signing', done => {
          request(app)
            .post('/identify')
            .send({ publicAddress: _publicAddress })
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(201)
            .end((err, res) => {
              if (err) return done.fail(err);

              expect(res.body.message.length).toEqual(2);
              expect(res.body.message[0].name).toEqual('Message');
              expect(res.body.message[0].value).toEqual(signingMessage);
              expect(res.body.message[1].name).toEqual('nonce');
              expect(typeof BigInt(res.body.message[1].value)).toEqual('bigint');
              expect(res.body.publicAddress).toEqual(_publicAddress);

              done();
            });
        });

        it('creates a new Agent record', done => {
          models.Agent.find({}).then(agents => {
            expect(agents.length).toEqual(0);

            request(app)
              .post('/identify')
              .send({ publicAddress: _publicAddress })
              .set('Accept', 'application/json')
              .expect('Content-Type', /json/)
              .expect(201)
              .end((err, res) => {
                if (err) return done.fail(err);

                models.Agent.find({}).then(agents => {
                  expect(agents.length).toEqual(1);
                  expect(agents[0].publicAddress).toEqual(_publicAddress);

                  expect(typeof BigInt(agents[0].nonce)).toEqual('bigint');
                  expect(agents[0].nonce).toEqual(res.body.message[1].value);
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

      describe('subsequent onboardings', () => {

        beforeEach(done => {
          request(app)
            .post('/identify')
            .send({ publicAddress: _publicAddress })
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(201)
            .end((err, res) => {
              if (err) return done.fail(err);
              done();
            });
        });

        it('returns a public address and message with nonce for signing', done => {
          request(app)
            .post('/identify')
            .send({ publicAddress: _publicAddress })
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(201)
            .end((err, res) => {
              if (err) return done.fail(err);

              expect(res.body.message.length).toEqual(2);
              expect(res.body.message[0].name).toEqual('Message');
              expect(res.body.message[0].value).toEqual(signingMessage);
              expect(res.body.message[1].name).toEqual('nonce');
              expect(typeof BigInt(res.body.message[1].value)).toEqual('bigint');
              expect(res.body.publicAddress).toEqual(_publicAddress);

              done();
            });
        });

        it('sets a new nonce in existing Agent record', done => {
          models.Agent.find({}).then(agents => {
            expect(agents.length).toEqual(1);
            expect(agents[0].publicAddress).toEqual(_publicAddress);
            const nonce = agents[0].nonce;

            request(app)
              .post('/identify')
              .send({ publicAddress: _publicAddress })
              .set('Accept', 'application/json')
              .expect('Content-Type', /json/)
              .expect(201)
              .end((err, res) => {
                if (err) return done.fail(err);

                models.Agent.find({}).then(agents => {
                  expect(agents.length).toEqual(1);
                  expect(agents[0].publicAddress).toEqual(_publicAddress);
                  expect(typeof BigInt(agents[0].nonce)).toEqual('bigint');
                  expect(agents[0].nonce).not.toEqual(nonce);
                  expect(agents[0].nonce).toEqual(res.body.message[1].value);

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

    describe('failure', () => {

      describe('invalid ethereum address', () => {

        it('returns an error', done => {
          request(app)
            .post('/identify')
            .send({ publicAddress: 'invalid ethereum address' })
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(400)
            .end((err, res) => {
              if (err) return done.fail(err);
              expect(res.body.message).toEqual('Invalid public address');
              done();
            });
        });

        it('does not create a new Agent record', done => {
          models.Agent.find({}).then(agents => {
            expect(agents.length).toEqual(0);

            request(app)
              .post('/identify')
              .send({ publicAddress: 'invalid ethereum address' })
              .set('Accept', 'application/json')
              .expect('Content-Type', /json/)
              .expect(400)
              .end((err, res) => {
                if (err) return done.fail(err);

                models.Agent.find({}).then(agents => {
                  expect(agents.length).toEqual(0);

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

  describe('GET /disconnect', () => {
    let session;

    beforeEach(done => {
      session = request(app);
      session.post('/identify')
        .send({ publicAddress: _publicAddress })
        .set('Accept', 'application/json')
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err, res) => {
          if (err) return done.fail(err);
          done();
        });
    });

    it('redirects home and clears the session', done => {
      expect(session.cookies.length).toEqual(1);
      session
        .get('/disconnect')
        .expect(302)
        .end(function(err, res) {
          if (err) return done.fail(err);
          expect(session.cookies.length).toEqual(0);
          done();
        });
    });
  });
});


