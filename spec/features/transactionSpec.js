const sigUtil = require('eth-sig-util');
const ethUtil = require('ethereumjs-util');
const ethers = require('ethers');
const request = require('supertest-session');
const app = require('../../app');
const models = require('../../models');

describe('transactions', () => {

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

  describe('GET /transaction', () => {

    describe('authorized', () => {

      let session, agent, transactions;

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

                  const txs = [
                    { hash: '0x5f77236022ded48a79ad2f98e646141aedc239db377a2b9a2376eb8a7b0a1014', value: ethers.utils.parseEther('1'), account: agent },
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
             expect(res.body[0].account).toBeUndefined();
             expect(res.body[0].__v).toBeUndefined();
             expect(new Date(res.body[0].createdAt)).toEqual(transactions[0].createdAt);

             done();
           });
        });

        it('returns transactions belonging to the authenticated account', done => {
          // Create hypothetical account
          models.Agent.create({ publicAddress: '0x3D2fA3e5C6e41d4D8b710f3C18c761AD3BB31da1'}).then(anotherAgent => {

            models.Transaction.create({
               hash: '0x29d184278c1bb10aed0ab4c56ac22c89009efe58e370c99951bca17f34ffd562',
               value: ethers.utils.parseEther('88'),
               account: anotherAgent,
            }).then(result => {

              models.Transaction.find().then(allTxs => {
                expect(allTxs.length).toEqual(2);

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
                   expect(res.body[0].account).toBeUndefined();
                   expect(res.body[0].__v).toBeUndefined();
                   expect(new Date(res.body[0].createdAt)).toEqual(transactions[0].createdAt);

                   done();
                 });
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

    describe('unauthorized', () => {

      describe('api', () => {

        it('returns 401 with a friendly message', done => {
          request(app)
           .get('/transaction')
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
           .get('/transaction')
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

        describe('success', () => {

          it('returns 201 with a friendly message', done => {
             session
              .post('/transaction')
              .send({
                hash: '0x81a0a82dfbb7f818e9bbaf1050194bcaf8dd91d2ebf07e72cabe58a7b4174df7',
                value: ethers.utils.parseEther('100')
              })
              .set('Accept', 'application/json')
              .expect('Content-Type', /json/)
              .expect(201)
              .end((err, res) => {
                if (err) return done.fail(err);

                expect(res.body.message).toEqual('Transaction recorded');
                done();
              });
          });

          it('updates the database', done => {
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
                .expect(201)
                .end((err, res) => {
                  if (err) return done.fail(err);

                  models.Transaction.find({}).then(transactions => {
                    expect(transactions.length).toEqual(1);
                    expect(transactions[0].account).toEqual(agent._id);
                    expect(transactions[0].value).toEqual('100.0');

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

        describe('failure', () => {

          it('requires a hash', done => {
            session
              .post('/transaction')
              .send({
                value: ethers.utils.parseEther('100')
              })
              .set('Accept', 'application/json')
              .expect('Content-Type', /json/)
              .expect(400)
              .end((err, res) => {
                if (err) return done.fail(err);
                expect(res.body.message).toEqual('Transaction hash required');

                models.Transaction.find({}).then(transactions => {
                  expect(transactions.length).toEqual(0);

                  done();
                }).catch(err => {
                  done.fail(err);
                });
              });
          });

          it('requires a value', done => {
            session
              .post('/transaction')
              .send({
                hash: '0x81a0a82dfbb7f818e9bbaf1050194bcaf8dd91d2ebf07e72cabe58a7b4174df7',
              })
              .set('Accept', 'application/json')
              .expect('Content-Type', /json/)
              .expect(400)
              .end((err, res) => {
                if (err) return done.fail(err);
                expect(res.body.message).toEqual('Value is required');

                models.Transaction.find({}).then(transactions => {
                  expect(transactions.length).toEqual(0);

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
              .post('/transaction')
              .send({
                hash: '0x81a0a82dfbb7f818e9bbaf1050194bcaf8dd91d2ebf07e72cabe58a7b4174df7',
                value: ethers.utils.parseEther('100')
              })
              .expect('Content-Type', /text/)
              .expect(302)
              .end((err, res) => {
                if (err) return done.fail(err);

                expect(res.headers['location']).toEqual('/transaction');
                done();
              });
          });

          it('updates the database', done => {
            models.Transaction.find({}).then(transactions => {
              expect(transactions.length).toEqual(0);

              session
                .post('/transaction')
                .send({
                  hash: '0x81a0a82dfbb7f818e9bbaf1050194bcaf8dd91d2ebf07e72cabe58a7b4174df7',
                  value: ethers.utils.parseEther('100')
                })
                .expect('Content-Type', /text/)
                .expect(302)
                .end((err, res) => {
                  if (err) return done.fail(err);

                  models.Transaction.find({}).then(transactions => {
                    expect(transactions.length).toEqual(1);
                    expect(transactions[0].account).toEqual(agent._id);
                    expect(transactions[0].value).toEqual('100.0');

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

        describe('failure', () => {

          it('requires a hash', done => {
            session
              .post('/transaction')
              .send({
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
          });

          it('requires a value', done => {
            session
              .post('/transaction')
              .send({
                hash: '0x81a0a82dfbb7f818e9bbaf1050194bcaf8dd91d2ebf07e72cabe58a7b4174df7',
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
          });
        });
      });
    });

    describe('unauthorized', () => {

      describe('api', () => {

        it('returns 401 with a friendly message', done => {
          request(app)
            .post('/transaction')
            .send({
              hash: '0x81a0a82dfbb7f818e9bbaf1050194bcaf8dd91d2ebf07e72cabe58a7b4174df7',
              value: ethers.utils.parseEther('100')
            })
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
          models.Transaction.find({}).then(transactions => {
            expect(transactions.length).toEqual(0);

            request(app)
              .post('/transaction')
              .send({
                hash: '0x81a0a82dfbb7f818e9bbaf1050194bcaf8dd91d2ebf07e72cabe58a7b4174df7',
                value: ethers.utils.parseEther('100')
              })
              .set('Accept', 'application/json')
              .expect('Content-Type', /json/)
              .expect(401)
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

        it('redirects', done => {
          request(app)
            .post('/transaction')
            .send({
              hash: '0x81a0a82dfbb7f818e9bbaf1050194bcaf8dd91d2ebf07e72cabe58a7b4174df7',
              value: ethers.utils.parseEther('100')
            })
            .expect('Content-Type', /text/)
            .expect(302)
            .end((err, res) => {
              if (err) return done.fail(err);

              expect(res.headers['location']).toEqual('/');
              done();
            });
        });

        it('does not modify the database', done => {
          models.Transaction.find({}).then(transactions => {
            expect(transactions.length).toEqual(0);

            request(app)
              .post('/transaction')
              .send({
                hash: '0x81a0a82dfbb7f818e9bbaf1050194bcaf8dd91d2ebf07e72cabe58a7b4174df7',
                value: ethers.utils.parseEther('100')
              })
              .expect('Content-Type', /text/)
              .expect(302)
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
