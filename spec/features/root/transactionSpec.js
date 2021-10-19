const sigUtil = require('eth-sig-util');
const ethUtil = require('ethereumjs-util');
const ethers = require('ethers');
const request = require('supertest-session');
const app = require('../../../app');
const models = require('../../../models');

describe('root transactions', () => {

  jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;

  // These were provided by ganache-cli
  const _publicAddress = '0x034F8c5c8381Bf45511d071875333Eba143Bd10e';
  const _privateAddress = '0xb30b64470fe770bbe8e9ff6478e550ce99e7f38d8e07ec2dbe27e8ff45742cf6';


  /**
   * Swap out existing public address in `.env`.
   *
   * `root` is whoever is configured there.
   */
  let _PUBLIC_ADDRESS;
  beforeAll(() => {
    _PUBLIC_ADDRESS = process.env.PUBLIC_ADDRESS;
    process.env.PUBLIC_ADDRESS = _publicAddress;
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

  describe('GET /transaction', () => {

    describe('authorized', () => {

      let session, root, transactions;

      beforeEach(done => {
console.log("HEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEERE");
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

                models.Agent.findOne({ where: { publicAddress: _publicAddress } }).then(result => {
                  root = result;

                  const regularAgents = [
                    { publicAddress: '0x07D740737b08BB0B041C15E94C5f87BC689909d5' },
                    { publicAddress: '0xE40153f2428846Ce1FFB7B4169ce08c9374b1187', name: 'Some Guy' },
                    { publicAddress: '0x07D740737b08BB0B041C15E94C5f87BC689909d5' },
                  ];

                  models.Agent.insertMany(regularAgents).then(agents => {
                    const txs = [
                      { hash: '0x5f77236022ded48a79ad2f98e646141aedc239db377a2b9a2376eb8a7b0a1014', value: ethers.utils.parseEther('1'), account: agents[0] },
                      { hash: '0x8df25a1b626d2aea8c337ed087493c91d1ee2c0c9c9470e5b87060170c256631', value: ethers.utils.parseEther('1'), account: agents[1] },
                      { hash: '0x204248c1800cfbdf303923a824e53a31c5cdc9678c13c4433dbac1f5576dc9a7', value: ethers.utils.parseEther('1'), account: agents[1] },
                      { hash: '0xe3bca4e0a8f2168d82b4bc9a6a6c4d2beb359df425a7b2d11837688af044f962', value: ethers.utils.parseEther('1'), account: agents[2] },
                    ];

                    models.Transaction.insertMany(txs).then(result => {
                      transactions = result;

                      done();
                    }).catch(err => {
                      done.fail(err);
                    });
                  }).catch(err => {
                    done.fail(err);
                  });
                }).catch(err => {
                  done.fail(err);
                });
              });
          });
      });

      describe('api', () => {

        it('returns successfully with sanitized data', done => {
          session
           .get('/transaction')
           .set('Accept', 'application/json')
           .expect('Content-Type', /json/)
           .expect(200)
           .end((err, res) => {
             if (err) return done.fail(err);

             expect(res.body.length).toEqual(transactions.length);

             expect(res.body[0]._id).toBeUndefined();
             expect(res.body[0].hash).toEqual(transactions[0].hash);
             expect(ethers.utils.formatEther(ethers.BigNumber.from(res.body[0].value))).toEqual(transactions[0].value);
             expect(res.body[0].account._id).toBeUndefined();
             expect(res.body[0].account.publicAddress).toEqual(transactions[0].account.publicAddress);
             expect(res.body[0].account.name).toEqual(transactions[0].account.name);
             expect(res.body[0].__v).toBeUndefined();
             expect(new Date(res.body[0].createdAt)).toEqual(transactions[0].createdAt);

             expect(res.body[1]._id).toBeUndefined();
             expect(res.body[1].hash).toEqual(transactions[1].hash);
             expect(ethers.utils.formatEther(ethers.BigNumber.from(res.body[1].value))).toEqual(transactions[1].value);
             expect(res.body[1].account._id).toBeUndefined();
             expect(res.body[1].account.publicAddress).toEqual(transactions[1].account.publicAddress);
             expect(res.body[1].account.name).toEqual(transactions[1].account.name);
             expect(res.body[1].__v).toBeUndefined();
             expect(new Date(res.body[1].createdAt)).toEqual(transactions[1].createdAt);

             expect(res.body[2]._id).toBeUndefined();
             expect(res.body[2].hash).toEqual(transactions[2].hash);
             expect(ethers.utils.formatEther(ethers.BigNumber.from(res.body[2].value))).toEqual(transactions[2].value);
             expect(res.body[2].account._id).toBeUndefined();
             expect(res.body[2].account.publicAddress).toEqual(transactions[2].account.publicAddress);
             expect(res.body[2].account.name).toEqual(transactions[2].account.name);
             expect(res.body[2].__v).toBeUndefined();
             expect(new Date(res.body[2].createdAt)).toEqual(transactions[2].createdAt);

             expect(res.body[3]._id).toBeUndefined();
             expect(res.body[3].hash).toEqual(transactions[3].hash);
             expect(ethers.utils.formatEther(ethers.BigNumber.from(res.body[3].value))).toEqual(transactions[3].value);
             expect(res.body[3].account._id).toBeUndefined();
             expect(res.body[3].account.publicAddress).toEqual(transactions[3].account.publicAddress);
             expect(res.body[3].account.name).toEqual(transactions[3].account.name);
             expect(res.body[3].__v).toBeUndefined();
             expect(new Date(res.body[3].createdAt)).toEqual(transactions[3].createdAt);

             done();
           });
        });
      });

      describe('browser', () => {

        it('returns successfully', done => {
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

  describe('POST /transaction', () => {

    describe('authorized', () => {

      let session, agent;

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

                models.Agent.findOne({ where: { publicAddress: _publicAddress } }).then(result => {
                  agent = result;

                  done();
                }).catch(err => {
                  done.fail(err);
                });
              });
          });
      });

      describe('api', () => {

        it('returns 400 with a friendly message', done => {
           session
            .post('/transaction')
            .send({
              hash: '0x81a0a82dfbb7f818e9bbaf1050194bcaf8dd91d2ebf07e72cabe58a7b4174df7',
              value: ethers.utils.parseEther('100')
            })
            .set('Accept', 'application/json')
            .expect('Content-Type', /json/)
            .expect(400)
            .end((err, res) => {
              if (err) return done.fail(err);

              expect(res.body.message).toEqual('You didn\'t seriously send ETH to yourself, did you?');
              done();
            });
        });

        it('does not touch the database', done => {
          models.Transaction.find({}).then(transactions => {
            expect(transactions.length).toEqual(0);

            session
              .post('/transaction')
              .send({
                hash: '0x81a0a82dfbb7f818e9bbaf1050194bcaf8dd91d2ebf07e72cabe58a7b4174df7',
                value: ethers.utils.parseEther('100')
              })
              .set('Accept', 'application/json')
              .expect('Content-Type', /json/)
              .expect(400)
              .end((err, res) => {
                if (err) return done.fail(err);

                models.Transaction.find({}).then(transactions => {
                  expect(transactions.length).toEqual(0);

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

        it('returns an error', done => {
          session
            .post('/transaction')
            .send({
              hash: '0x81a0a82dfbb7f818e9bbaf1050194bcaf8dd91d2ebf07e72cabe58a7b4174df7',
              value: ethers.utils.parseEther('100')
            })
            .expect('Content-Type', /text/)
            .expect(400)
            .end((err, res) => {
              if (err) return done.fail(err);

              done();
            });
        });

        it('does not touch the database', done => {
          models.Transaction.find({}).then(transactions => {
            expect(transactions.length).toEqual(0);

            session
              .post('/transaction')
              .send({
                hash: '0x81a0a82dfbb7f818e9bbaf1050194bcaf8dd91d2ebf07e72cabe58a7b4174df7',
                value: ethers.utils.parseEther('100')
              })
              .expect('Content-Type', /text/)
              .expect(400)
              .end((err, res) => {
                if (err) return done.fail(err);

                models.Transaction.find({}).then(transactions => {
                  expect(transactions.length).toEqual(0);

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
