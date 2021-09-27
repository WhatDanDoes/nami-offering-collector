const request = require('supertest-session');
const app = require('../../app');
const models = require('../../models');

describe('/identify', () => {

  jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;

  const _publicAddress = '0xc5425573eE45B1fF67aAf1fB0982E64e772769A7';

  describe('POST', () => {

    beforeEach(async () => {
//      browser = await puppeteer.launch();
//      page = await browser.newPage();
//      await page.goto(URL);
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

        it('returns a nonce for signing', done => {
          request(app)
            .post('/identify')
            .send({ publicAddress: _publicAddress })
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(201)
            .end((err, res) => {
              if (err) return done.fail(err);
              expect(typeof BigInt(res.body.nonce)).toEqual('bigint');
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

                  expect(typeof BigInt(res.body.nonce)).toEqual('bigint');
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

        it('returns a nonce for signing', done => {
          request(app)
            .post('/identify')
            .send({ publicAddress: _publicAddress })
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(201)
            .end((err, res) => {
              if (err) return done.fail(err);
              expect(typeof BigInt(res.body.nonce)).toEqual('bigint');
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


//      it('displays the configured app title', async () => {
//        expect(process.env.TITLE).toBeDefined();
//        const el = await page.$('title');
//        const title = await el.evaluate(e => e.textContent);
//        expect(title).toEqual(process.env.TITLE);
//      });
//
//      it('displays a warning in the navbar', async () => {
//        const el = await page.$('header nav ul li#connect-metamask');
//
//        const warning = await el.evaluate(e => e.textContent);
//        expect(warning).toEqual('Click here to install the Metamask browser plugin');
//      });
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

  describe('DELETE', () => {
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
        .delete('/identify')
        .expect(302)
        .end(function(err, res) {
          if (err) return done.fail(err);
          expect(session.cookies.length).toEqual(0);
          done();
        });
    });
  });
});


