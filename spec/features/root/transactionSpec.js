const ethers = require('ethers');
const request = require('supertest-session');
const cheerio = require('cheerio');
const app = require('../../../app');
const models = require('../../../models');
const setupWallet = require('../../support/setupWallet');
const cardanoMnemonic =  require('cardano-mnemonic');
const randomHex = require('../../support/randomHex');
const dataSigner = require('../../../lib/dataSigner');

describe('root transactions', () => {

  /**
   * Swap out existing public address in `.env`.
   *
   * `root` is whoever is configured there.
   */
  let secret, publicHex, signingMessage, publicBech32;

  beforeAll(async () => {
    ({ secret, publicHex, signingMessage, publicBech32 } = await setupWallet());
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

  describe('GET /transaction', () => {

    describe('authorized', () => {

      let session, root, transactions;

      beforeEach(done => {
        session = request(app);
        session
          .post('/auth/introduce')
          .send({ publicAddress: publicHex })
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(201)
          .end((err, res) => {
            if (err) return done.fail(err);
            ({ publicAddress, typedData } = res.body);

            let signed = dataSigner(`${typedData.message.message} ${typedData.message.nonce}`, secret, publicHex);

            session
              .post('/auth/prove')
              .send({ publicAddress: publicHex, signature: signed })
              .set('Content-Type', 'application/json')
              .set('Accept', 'application/json')
              .expect('Content-Type', /json/)
              .expect(201)
              .end((err, res) => {
                if (err) return done.fail(err);

                expect(res.body.message).toEqual('Welcome!');

                models.Account.findOne({ where: { publicAddress: publicBech32 } }).then(result => {
                  root = result;

                  done();
                }).catch(err => {
                  done.fail(err);
                });
              });
          });
      });

      describe('no transactions', () => {

        describe('api', () => {

          it('returns successfully with empty array', done => {
            session
             .get('/transaction')
             .set('Accept', 'application/json')
             .expect('Content-Type', /json/)
             .expect(200)
             .end((err, res) => {
               if (err) return done.fail(err);

               expect(res.body.length).toEqual(0);

               done();
             });
          });
        });

        describe('browser', () => {

          it('returns successfully with message', done => {
            session
              .get('/transaction')
              .expect('Content-Type', /text/)
              .expect(200)
              .end((err, res) => {
                if (err) return done.fail(err);
                const $ = cheerio.load(res.text);


                expect($('header h4').text().trim()).toEqual('No transactions');
                expect($('#transaction-table tbody tr').length).toEqual(0);

                done();
              });
          });
        });
      });

      describe('transactions exist', () => {

        let regularAccounts;

        beforeAll(async () => {
            let wallet0 = await setupWallet(cardanoMnemonic.entropyToMnemonic(randomHex()));
            let wallet1 = await setupWallet(cardanoMnemonic.entropyToMnemonic(randomHex()));
            let wallet2 = await setupWallet(cardanoMnemonic.entropyToMnemonic(randomHex()));

            regularAccounts = [
              { publicAddress: wallet0.publicBech32 },
              { publicAddress: wallet1.publicBech32, name: 'Some Guy' },
              { publicAddress: wallet2.publicBech32 },
            ];
        });

        beforeEach(done => {
          models.Account.findOne({ where: { publicAddress: publicBech32 } }).then(result => {
            root = result;

            models.Account.insertMany(regularAccounts).then(accounts => {
              const txs = [
                { hash: '0x5f77236022ded48a79ad2f98e646141aedc239db377a2b9a2376eb8a7b0a1014', value: ethers.utils.parseEther('1'), account: accounts[0] },
                { hash: '0x8df25a1b626d2aea8c337ed087493c91d1ee2c0c9c9470e5b87060170c256631', value: ethers.utils.parseEther('1'), account: accounts[1] },
                { hash: '0x204248c1800cfbdf303923a824e53a31c5cdc9678c13c4433dbac1f5576dc9a7', value: ethers.utils.parseEther('1'), account: accounts[1] },
                { hash: '0xe3bca4e0a8f2168d82b4bc9a6a6c4d2beb359df425a7b2d11837688af044f962', value: ethers.utils.parseEther('1'), account: accounts[2] },
              ];

              // Doing this one-at-a-time (as opposed to `insertMany`) so that `createdAt` is different for each
              models.Transaction.create(txs[0]).then(result => {

                models.Transaction.create(txs[1]).then(result => {

                  models.Transaction.create(txs[2]).then(result => {

                    models.Transaction.create(txs[3]).then(result => {

                      // Retrieve transactions just created
                      models.Transaction.find().populate('account', '-_id publicAddress name').sort({ createdAt: -1 }).then(result => {
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
                }).catch(err => {
                  done.fail(err);
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
                const $ = cheerio.load(res.text);

                // Link to transactions
                expect($('header a[href="/account"] #account-button').text()).toEqual('Accounts');
                expect($('header a[href="/"] #donate-button').length).toEqual(0);

                // Ordered by createdAt
                expect($('#transaction-table tbody tr').length).toEqual(4);

                // Row 1
                expect($('#transaction-table tbody tr:first-child td:first-child').text())
                  .toEqual(transactions[0].createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
                expect($('#transaction-table tbody tr:first-child td:nth-child(2)').text()).toEqual('1.0');
                expect($(`#transaction-table tbody tr:first-child td:nth-child(3) a[href="/account/${transactions[0].account.publicAddress}"]`).text().trim())
                  .toEqual(`${transactions[0].account.publicAddress.slice(0, 4)}...${transactions[0].account.publicAddress.slice(-3)}`);
                expect($(`#transaction-table tbody tr:first-child td:last-child a[href="https://etherscan.io/tx/${transactions[0].hash}"]`).text().trim())
                  .toEqual(`${transactions[0].hash.slice(0, 4)}...${transactions[0].hash.slice(-3)}`);

                // Row 2
                expect($('#transaction-table tbody tr:nth-child(2) td:first-child').text())
                  .toEqual(transactions[1].createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
                expect($('#transaction-table tbody tr:nth-child(2) td:nth-child(2)').text()).toEqual('1.0');
                expect($(`#transaction-table tbody tr:nth-child(2) td:nth-child(3) a[href="/account/${transactions[1].account.publicAddress}"]`).text().trim())
                  .toEqual(`${transactions[1].account.publicAddress.slice(0, 4)}...${transactions[1].account.publicAddress.slice(-3)}`);
                expect($(`#transaction-table tbody tr:nth-child(2) td:last-child a[href="https://etherscan.io/tx/${transactions[1].hash}"]`).text().trim())
                  .toEqual(`${transactions[1].hash.slice(0, 4)}...${transactions[1].hash.slice(-3)}`);

                // Row 3
                expect($('#transaction-table tbody tr:nth-child(3) td:first-child').text())
                  .toEqual(transactions[2].createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
                expect($('#transaction-table tbody tr:nth-child(3) td:nth-child(2)').text()).toEqual('1.0');
                expect($(`#transaction-table tbody tr:nth-child(3) td:nth-child(3) a[href="/account/${transactions[2].account.publicAddress}"]`).text().trim())
                  .toEqual(`${transactions[2].account.publicAddress.slice(0, 4)}...${transactions[2].account.publicAddress.slice(-3)}`);
                expect($(`#transaction-table tbody tr:nth-child(3) td:last-child a[href="https://etherscan.io/tx/${transactions[2].hash}"]`).text().trim())
                  .toEqual(`${transactions[2].hash.slice(0, 4)}...${transactions[2].hash.slice(-3)}`);

                // Row 4
                expect($('#transaction-table tbody tr:nth-child(4) td:first-child').text())
                  .toEqual(transactions[3].createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
                expect($('#transaction-table tbody tr:nth-child(4) td:nth-child(2)').text()).toEqual('1.0');
                expect($(`#transaction-table tbody tr:nth-child(4) td:nth-child(3) a[href="/account/${transactions[3].account.publicAddress}"]`).text().trim())
                  .toEqual(`${transactions[3].account.publicAddress.slice(0, 4)}...${transactions[3].account.publicAddress.slice(-3)}`);
                expect($(`#transaction-table tbody tr:nth-child(4) td:last-child a[href="https://etherscan.io/tx/${transactions[3].hash}"]`).text().trim())
                  .toEqual(`${transactions[3].hash.slice(0, 4)}...${transactions[3].hash.slice(-3)}`);

                done();
              });
          });
        });
      });
    });
  });

  describe('POST /transaction', () => {

    describe('authorized', () => {

      let session, account;

      beforeEach(done => {
        session = request(app);
        session
          .post('/auth/introduce')
          .send({ publicAddress: publicHex })
          .set('Accept', 'application/json')
          .expect('Content-Type', /json/)
          .expect(201)
          .end((err, res) => {
            if (err) return done.fail(err);
            ({ publicAddress, typedData } = res.body);

            let signed = dataSigner(`${typedData.message.message} ${typedData.message.nonce}`, secret, publicHex);

            session
              .post('/auth/prove')
              .send({ publicAddress: publicHex, signature: signed })
              .set('Content-Type', 'application/json')
              .set('Accept', 'application/json')
              .expect('Content-Type', /json/)
              .expect(201)
              .end((err, res) => {
                if (err) return done.fail(err);

                expect(res.body.message).toEqual('Welcome!');

                models.Account.findOne({ where: { publicAddress: publicBech32 } }).then(result => {
                  account = result;

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

              expect(res.body.message).toEqual('You didn\'t seriously send ADA to yourself, did you?');
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
