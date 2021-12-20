const fs = require('fs');
const cheerio = require('cheerio');
const request = require('supertest-session');
const app = require('../../../app');
const models = require('../../../models');
const setupWallet = require('../../support/setupWallet');
const dataSigner = require('../../../lib/dataSigner');

describe('root auth', () => {

  /**
   * Swap out existing public address in `.env`.
   *
   * `root` is whoever is configured there.
   */
  let _PUBLIC_ADDRESS;
  let secret, publicHex, signingMessage, publicBech32;
  beforeAll(() => {
    ({ secret, publicHex, signingMessage, publicBech32 } = setupWallet());
    _PUBLIC_ADDRESS = process.env.PUBLIC_ADDRESS;
    process.env.PUBLIC_ADDRESS = publicBech32;
  });

  afterAll(() => {
    process.env.PUBLIC_ADDRESS = _PUBLIC_ADDRESS;
  });

  afterEach(done => {
    models.mongoose.connection.db.dropDatabase().then((err, result) => {
      done();
    }).catch(err => {
      done.fail(err);
    });
  });

  describe('authorized', () => {

    let session, root, response, $;

    describe('browser', () => {

      beforeEach(done => {
        session = request(app);
        session
          .post('/auth/introduce')
          .send({ publicAddress: publicHex })
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .end((err, res) => {
            if (err) return done.fail(err);
            ({ publicAddress, typedData } = res.body);

            let signed = dataSigner(`${typedData.message.message} ${typedData.message.nonce}`, secret, publicHex);

            session
              .post('/auth/prove')
              .send({ publicAddress: publicHex, signature: signed })
              .expect('Content-Type', /text/)
              .expect(302)
              .end((err, res) => {
                if (err) return done.fail(err);

                response = res;

                models.Account.findOne({ where: { publicAddress: publicBech32 } }).then(result => {
                  root = result;

                  done();
                }).catch(err => {
                  done.fail(err);
                });
              });
          });
      });

      it('lands in the right place', () => {
        expect(response.headers['location']).toEqual('/transaction');
      });

      it('displays a friendly message', done => {
        session
          .get(response.headers['location'])
          .expect('Content-Type', /text/)
          .expect(200)
          .end((err, res) => {
            if (err) return done.fail(err);

            $ = cheerio.load(res.text);

            expect($('.alert.alert-success').text().trim()).toEqual('Welcome, root!');

            done();
          });
      });

      it('does not allow visiting the transfer app page', done => {
        session
          .get('/')
          .expect('Content-Type', /text/)
          .expect(302)
          .end((err, res) => {
            if (err) return done.fail(err);

            expect(res.headers['location']).toEqual('/transaction');

            session
              .get(res.headers['location'])
              .expect('Content-Type', /text/)
              .expect(200)
              .end((err, res) => {
                if (err) return done.fail(err);

                $ = cheerio.load(res.text);

                expect($('.alert.alert-info').text().trim()).toEqual('I cannot allow you to send ETH to your own wallet, Dave');

                done();
              });
          });
      });

      it('allows visiting the account listing page', done => {
        session
          .get('/account')
          .expect('Content-Type', /text/)
          .expect(200)
          .end((err, res) => {
            if (err) return done.fail(err);
            done();
          });
      });

      it('allows visiting the transaction listing page', done => {
        session
          .get('/transaction')
          .expect('Content-Type', /text/)
          .expect(200)
          .end((err, res) => {
            if (err) return done.fail(err);
            done();
          });
      });
    });
  });
});
