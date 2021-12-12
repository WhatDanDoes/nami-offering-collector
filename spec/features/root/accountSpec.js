const ethers = require('ethers');
const cheerio = require('cheerio');
const request = require('supertest-session');
const app = require('../../../app');
const models = require('../../../models');
const cardanoUtils = require('cardano-crypto.js');
const setupWallet = require('../../support/setupWallet');
const { Seed } = require('cardano-wallet-js');
const cardanoMnemonic =  require('cardano-mnemonic');

const randomHex = () => {
  const S = 'abcdefABCDEF0123456789';
  const N = 41;
  return Array.from(Array(N))
    .map(() => S[Math.floor(Math.random() * S.length)])
    .join('');
};

describe('root account management', () => {

  jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;


  /**
   * Swap out existing public address in `.env`.
   *
   * `root` is whoever is configured there.
   */
  let _PUBLIC_ADDRESS;
  let parentWalletSecret, parentWalletPublicExt, parentWalletPublic, signingMessage;

  beforeAll(async () => {
    ({ parentWalletSecret, parentWalletPublic, parentWalletPublicExt, signingMessage } = await setupWallet());
    _PUBLIC_ADDRESS = process.env.PUBLIC_ADDRESS;
    process.env.PUBLIC_ADDRESS = parentWalletPublic;
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

  describe('GET /account', () => {

    describe('authorized', () => {

      let session, root, transactions;

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

            const typedDataStr = typedData.message.nonce;
            let signature = cardanoUtils.sign(Buffer.from(typedDataStr, 'utf8'), parentWalletSecret);
            const signed = cardanoUtils.sign(Buffer.from(typedDataStr, 'utf8'), parentWalletSecret).toString('hex');

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

                models.Account.findOne({ where: { publicAddress: parentWalletPublic } }).then(async result => {
                  root = result;

                  let wallet0 = await setupWallet(cardanoMnemonic.entropyToMnemonic(randomHex()));
                  let wallet1 = await setupWallet(cardanoMnemonic.entropyToMnemonic(randomHex()));
                  let wallet2 = await setupWallet(cardanoMnemonic.entropyToMnemonic(randomHex()));

                  const regularAccounts = [
                    { publicAddress: wallet0.parentWalletPublic },
                    { publicAddress: wallet1.parentWalletPublic, name: 'Some Guy' },
                    { publicAddress: wallet2.parentWalletPublic },
                  ];

                  // Doing this one-at-a-time (as opposed to `insertMany`) so that `updatedAt` is different for each
                  models.Account.create(regularAccounts[0]).then(result => {

                    models.Account.create(regularAccounts[1]).then(result => {

                      models.Account.create(regularAccounts[2]).then(result => {

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
              });
          });
      });

      describe('authorized', () => {

        let accounts;
        beforeEach(done => {
          models.Account.find().sort({ updatedAt: -1 }).then(results => {
            accounts = results.filter(a => a.publicAddress !== parentWalletPublic);

            done();
          }).catch(err => {
            done.fail(err);
          });
        });

        describe('api', () => {

          it('returns successfully with all accounts except the root', done => {
            session
              .get('/account')
              .set('Accept', 'application/json')
              .expect('Content-Type', /json/)
              .expect(200)
              .end((err, res) => {
                if (err) return done.fail(err);

                expect(res.body.length).toEqual(accounts.length);

                for (let account of res.body) {
                  expect(account.publicAddress).not.toEqual(root.publicAddress);
                }

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
                expect($('header a[href="/transaction"] #transaction-button').text()).toEqual('Transactions');

                // Ordered by updatedAt
                expect($('#account-table tbody tr').length).toEqual(3);

                // Row 1
                expect($('#account-table tbody tr:first-child td:first-child').text()).toEqual('');
                expect($('#account-table tbody tr:first-child td:nth-child(2)').text())
                  .toEqual(accounts[0].updatedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
                expect($(`#account-table tbody tr:first-child td:nth-child(3) a[href="/account/${accounts[0].publicAddress}"]`).text().trim())
                  .toEqual(`${accounts[0].publicAddress.slice(0, 4)}...${accounts[0].publicAddress.slice(-3)}`);

                // Row 2
                expect($('#account-table tbody tr:nth-child(2) td:first-child').text()).toEqual('Some Guy');
                expect($('#account-table tbody tr:nth-child(2) td:nth-child(2)').text())
                  .toEqual(accounts[1].updatedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
                expect($(`#account-table tbody tr:nth-child(2) td:nth-child(3) a[href="/account/${accounts[1].publicAddress}"]`).text().trim())
                  .toEqual(`${accounts[1].publicAddress.slice(0, 4)}...${accounts[1].publicAddress.slice(-3)}`);

                // Row 3
                expect($('#account-table tbody tr:nth-child(3) td:first-child').text()).toEqual('');
                expect($('#account-table tbody tr:nth-child(3) td:nth-child(2)').text())
                  .toEqual(accounts[2].updatedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
                expect($(`#account-table tbody tr:nth-child(3) td:nth-child(3) a[href="/account/${accounts[2].publicAddress}"]`).text().trim())
                  .toEqual(`${accounts[2].publicAddress.slice(0, 4)}...${accounts[2].publicAddress.slice(-3)}`);

                done();
             });
          });
        });
      });
    });
  });

  describe('GET /account/:id', () => {

    describe('authorized', () => {

      let session, root, transactions, regularAccounts;

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

            let signature = cardanoUtils.sign(Buffer.from(typedData.message.nonce, 'utf8'), parentWalletSecret);
            const signed = cardanoUtils.sign(Buffer.from(typedData.message.nonce, 'utf8'), parentWalletSecret).toString('hex');

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

                models.Account.findOne({ where: { publicAddress: parentWalletPublic } }).then(async result => {
                  root = result;

                  let wallet0 = await setupWallet(cardanoMnemonic.entropyToMnemonic(randomHex()));
                  let wallet1 = await setupWallet(cardanoMnemonic.entropyToMnemonic(randomHex()));
                  let wallet2 = await setupWallet(cardanoMnemonic.entropyToMnemonic(randomHex()));
                  regularAccounts = [
                    { publicAddress: wallet0.parentWalletPublic },
                    { publicAddress: wallet1.parentWalletPublic, name: 'Some Guy' },
                    { publicAddress: wallet2.parentWalletPublic },
                  ];

                  models.Account.insertMany(regularAccounts).then(accounts => {
                    const txs = [
                      { hash: '0x5f77236022ded48a79ad2f98e646141aedc239db377a2b9a2376eb8a7b0a1014', value: ethers.utils.parseEther('1'), account: accounts[0] },
                      { hash: '0x8df25a1b626d2aea8c337ed087493c91d1ee2c0c9c9470e5b87060170c256631', value: ethers.utils.parseEther('1'), account: accounts[1] },
                      { hash: '0x204248c1800cfbdf303923a824e53a31c5cdc9678c13c4433dbac1f5576dc9a7', value: ethers.utils.parseEther('1'), account: accounts[1] },
                      { hash: '0xe3bca4e0a8f2168d82b4bc9a6a6c4d2beb359df425a7b2d11837688af044f962', value: ethers.utils.parseEther('1'), account: accounts[2] },
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

        it('returns successfully with root\'s own info', done => {
          session
           .get(`/account/${parentWalletPublic}`)
           .set('Accept', 'application/json')
           .expect('Content-Type', /json/)
           .expect(200)
           .end((err, res) => {
             if (err) return done.fail(err);
             expect(res.body.publicAddress).toEqual(root.publicAddress);
             done();
           });
        });

        it('returns successfully with any account info', done => {
          expect(regularAccounts[1].name).toEqual('Some Guy');
          session
           .get(`/account/${regularAccounts[1].publicAddress}`)
           .set('Accept', 'application/json')
           .expect('Content-Type', /json/)
           .expect(200)
           .end((err, res) => {
             if (err) return done.fail(err);
             expect(res.body.publicAddress).toEqual(regularAccounts[1].publicAddress);
             expect(res.body.name).toEqual(regularAccounts[1].name);

             done();
           });
        });
      });

      describe('browser', () => {

        it('returns successfully with root\'s own info', done => {
          session
           .get(`/account/${parentWalletPublic}`)
           .expect('Content-Type', /text/)
           .expect(200)
           .end((err, res) => {
             if (err) return done.fail(err);

             const $ = cheerio.load(res.text);
             expect($('header a[href="/"] #donate-button').length).toEqual(0);
             expect($('header a[href="/account"] #account-button').length).toEqual(1);
             expect($(`form#account-details[action="/account/${parentWalletPublic}?_method=PUT"]`).length).toEqual(1);

             done();
           });
        });

        it('returns successfully with any account info superview', done => {
          session
           .get(`/account/${regularAccounts[1].publicAddress}`)
           .expect('Content-Type', /text/)
           .expect(200)
           .end((err, res) => {
             if (err) return done.fail(err);

             const $ = cheerio.load(res.text);
             expect($('header a[href="/"] #donate-button').length).toEqual(0);
             expect($('header a[href="/account"] #account-button').length).toEqual(1);
             expect($(`form#account-details[action="/account/${regularAccounts[1].publicAddress}?_method=PUT"]`).length).toEqual(1);

             done();
           });
        });
      });
    });
  });

  describe('PUT /account', () => {

    describe('authorized', () => {

      let session, root, transactions, regularAccounts;

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

            let signature = cardanoUtils.sign(Buffer.from(typedData.message.nonce, 'utf8'), parentWalletSecret);
            const signed = cardanoUtils.sign(Buffer.from(typedData.message.nonce, 'utf8'), parentWalletSecret).toString('hex');

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

                models.Account.findOne({ where: { publicAddress: parentWalletPublic } }).then(async result => {
                  root = result;

                  let wallet0 = await setupWallet(cardanoMnemonic.entropyToMnemonic(randomHex()));
                  let wallet1 = await setupWallet(cardanoMnemonic.entropyToMnemonic(randomHex()));
                  let wallet2 = await setupWallet(cardanoMnemonic.entropyToMnemonic(randomHex()));
                  regularAccounts = [
                    { publicAddress: wallet0.parentWalletPublic },
                    { publicAddress: wallet1.parentWalletPublic, name: 'Some Guy' },
                    { publicAddress: wallet2.parentWalletPublic },
                  ];

                  models.Account.insertMany(regularAccounts).then(accounts => {
                    const txs = [
                      { hash: '0x5f77236022ded48a79ad2f98e646141aedc239db377a2b9a2376eb8a7b0a1014', value: ethers.utils.parseEther('1'), account: accounts[0] },
                      { hash: '0x8df25a1b626d2aea8c337ed087493c91d1ee2c0c9c9470e5b87060170c256631', value: ethers.utils.parseEther('1'), account: accounts[1] },
                      { hash: '0x204248c1800cfbdf303923a824e53a31c5cdc9678c13c4433dbac1f5576dc9a7', value: ethers.utils.parseEther('1'), account: accounts[1] },
                      { hash: '0xe3bca4e0a8f2168d82b4bc9a6a6c4d2beb359df425a7b2d11837688af044f962', value: ethers.utils.parseEther('1'), account: accounts[2] },
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

        describe('success', () => {

          describe('root\'s own data', () => {

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
              expect(root.name).toBeUndefined();
              session
                .put('/account')
                .send({ name: 'Some Guy' })
                .set('Accept', 'application/json')
                .expect('Content-Type', /json/)
                .expect(201)
                .end((err, res) => {
                  if (err) return done.fail(err);

                  models.Account.findOne({ publicAddress: root.publicAddress }).then(account => {
                    expect(account.name).toEqual('Some Guy');
                    expect(account.publicAddress).toEqual(root.publicAddress);

                    done();
                  }).catch(err => {
                    done.fail(err);
                  });
                });
            });
          });

          describe('non-root account data', () => {

            let regularAccount;

            beforeEach(done => {
              models.Account.findOne({ publicAddress: regularAccounts[0].publicAddress }).then(result => {
                regularAccount = result;
                done();
              }).catch(err => {
                done.fail(err);
              });
            });

            it('returns 201 with a friendly message', done => {
               session
                .put(`/account/${regularAccount.publicAddress}`)
                .send({ name: 'Some Other Guy' })
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
              expect(regularAccount.name).toBeUndefined();
              session
                .put(`/account/${regularAccount.publicAddress}`)
                .send({ name: 'Some Other Guy' })
                .set('Accept', 'application/json')
                .expect('Content-Type', /json/)
                .expect(201)
                .end((err, res) => {
                  if (err) return done.fail(err);

                  models.Account.findOne({ publicAddress: regularAccount.publicAddress }).then(account => {
                    expect(account.name).toEqual('Some Other Guy');
                    expect(account.publicAddress).toEqual(regularAccount.publicAddress);

                    done();
                  }).catch(err => {
                    done.fail(err);
                  });
                });
            });
          });
        });

        describe('failure', () => {

          describe('root\'s own data', () => {

            it('does not allow modifying publicAddress', done => {
              expect(root.publicAddress).toEqual(parentWalletPublic);
              session
                .put('/account')
                .send({ publicAddress: '0x4D8B94b1358DB655aCAdcCF43768b9AbA00b2e74' })
                .set('Accept', 'application/json')
                .expect('Content-Type', /json/)
                .expect(403)
                .end((err, res) => {
                  if (err) return done.fail(err);

                  expect(res.body.message).toEqual('Forbidden');

                  models.Account.findOne({ publicAddress: root.publicAddress }).then(account => {
                    expect(account.publicAddress).toEqual(root.publicAddress);

                    done();
                  }).catch(err => {
                    done.fail(err);
                  });
                });
            });

            it('does not allow modifying nonce', done => {
              const currentNonce = root.nonce;
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

                  models.Account.findOne({ publicAddress: root.publicAddress }).then(account => {
                    expect(account.nonce).toEqual(currentNonce);

                    done();
                  }).catch(err => {
                    done.fail(err);
                  });
                });
            });
          });

          describe('non-root account data', () => {

            let regularAccount;

            beforeEach(done => {
              models.Account.findOne({ publicAddress: regularAccounts[0].publicAddress }).then(result => {
                regularAccount = result;
                done();
              }).catch(err => {
                done.fail(err);
              });
            });

            it('does not allow modifying publicAddress', done => {
              expect(regularAccount.publicAddress).not.toEqual('0x4D8B94b1358DB655aCAdcCF43768b9AbA00b2e74');
              session
                .put(`/account/${regularAccount.publicAddress}`)
                .send({ publicAddress: '0x4D8B94b1358DB655aCAdcCF43768b9AbA00b2e74' })
                .set('Accept', 'application/json')
                .expect('Content-Type', /json/)
                .expect(403)
                .end((err, res) => {
                  if (err) return done.fail(err);

                  expect(res.body.message).toEqual('Forbidden');

                  models.Account.findOne({ publicAddress: regularAccount.publicAddress }).then(account => {
                    expect(account.publicAddress).toEqual(regularAccount.publicAddress);

                    done();
                  }).catch(err => {
                    done.fail(err);
                  });
                });
            });

            it('does not allow modifying nonce', done => {
              const currentNonce = root.nonce;
              const newNonce = Math.floor(Math.random() * 1000000).toString();
              expect(currentNonce).not.toEqual(newNonce);
              session
                .put(`/account/${regularAccount.publicAddress}`)
                .send({ nonce: newNonce })
                .set('Accept', 'application/json')
                .expect('Content-Type', /json/)
                .expect(403)
                .end((err, res) => {
                  if (err) return done.fail(err);

                  expect(res.body.message).toEqual('Forbidden');

                  models.Account.findOne({ publicAddress: regularAccount.publicAddress }).then(account => {
                    expect(account.nonce).toEqual(currentNonce);

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

        describe('success', () => {

          describe('root\'s own data', () => {

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
              expect(root.name).toBeUndefined();
              session
                .put('/account')
                .send({ name: 'Super Root' })
                .expect('Content-Type', /text/)
                .expect(302)
                .end((err, res) => {
                  if (err) return done.fail(err);

                  models.Account.findOne({ publicAddress: root.publicAddress }).then(account => {
                    expect(account.name).toEqual('Super Root');
                    expect(account.publicAddress).toEqual(root.publicAddress);

                    done();
                  }).catch(err => {
                    done.fail(err);
                  });
                });
            });
          });

          describe('non-root account data', () => {

            let regularAccount;

            beforeEach(done => {
              models.Account.findOne({ publicAddress: regularAccounts[0].publicAddress }).then(result => {
                regularAccount = result;
                done();
              }).catch(err => {
                done.fail(err);
              });
            });

            it('redirects', done => {
              session
                .put(`/account/${regularAccount.publicAddress}`)
                .send({ name: 'Some Guy' })
                .expect('Content-Type', /text/)
                .expect(302)
                .end((err, res) => {
                  if (err) return done.fail(err);

                  expect(res.headers['location']).toEqual(`/account/${regularAccount.publicAddress}`);
                  done();
                });
            });

            it('updates the database', done => {
              expect(regularAccount.name).toBeUndefined();
              session
                .put(`/account/${regularAccount.publicAddress}`)
                .send({ name: 'Some Regular Guy' })
                .expect('Content-Type', /text/)
                .expect(302)
                .end((err, res) => {
                  if (err) return done.fail(err);

                  models.Account.findOne({ publicAddress: regularAccount.publicAddress }).then(account => {
                    expect(account.name).toEqual('Some Regular Guy');
                    expect(account.publicAddress).toEqual(regularAccount.publicAddress);

                    done();
                  }).catch(err => {
                    done.fail(err);
                  });
                });
            });
          });
        });

        describe('failure', () => {

          describe('root\'s own data', () => {

            it('does not allow modifying publicAddress', done => {
              expect(root.publicAddress).toEqual(parentWalletPublic);
              session
                .put('/account')
                .send({ publicAddress: '0x4D8B94b1358DB655aCAdcCF43768b9AbA00b2e74' })
                .expect('Content-Type', /text/)
                .expect(403)
                .end((err, res) => {
                  if (err) return done.fail(err);

                  models.Account.findOne({ publicAddress: root.publicAddress }).then(account => {
                    expect(account.publicAddress).toEqual(root.publicAddress);

                    done();
                  }).catch(err => {
                    done.fail(err);
                  });
                });
            });

            it('does not allow modifying nonce', done => {
              const currentNonce = root.nonce;
              const newNonce = Math.floor(Math.random() * 1000000).toString();
              expect(currentNonce).not.toEqual(newNonce);
              session
                .put('/account')
                .send({ nonce: newNonce })
                .expect('Content-Type', /html/)
                .expect(403)
                .end((err, res) => {
                  if (err) return done.fail(err);

                  models.Account.findOne({ publicAddress: root.publicAddress }).then(account => {
                    expect(account.nonce).toEqual(currentNonce);

                    done();
                  }).catch(err => {
                    done.fail(err);
                  });
                });
            });
          });

          describe('non-root account data', () => {

            let regularAccount;

            beforeEach(done => {
              models.Account.findOne({ publicAddress: regularAccounts[0].publicAddress }).then(result => {
                regularAccount = result;
                done();
              }).catch(err => {
                done.fail(err);
              });
            });

            it('does not allow modifying publicAddress', done => {
              expect(regularAccount.publicAddress).not.toEqual('0x4D8B94b1358DB655aCAdcCF43768b9AbA00b2e74');
              session
                .put(`/account/${regularAccount.publicAddress}`)
                .send({ publicAddress: '0x4D8B94b1358DB655aCAdcCF43768b9AbA00b2e74' })
                .expect('Content-Type', /text/)
                .expect(403)
                .end((err, res) => {
                  if (err) return done.fail(err);

                  models.Account.findOne({ publicAddress: regularAccount.publicAddress }).then(account => {
                    expect(account.publicAddress).toEqual(regularAccount.publicAddress);

                    done();
                  }).catch(err => {
                    done.fail(err);
                  });
                });
            });

            it('does not allow modifying nonce', done => {
              const currentNonce = regularAccount.nonce;
              const newNonce = Math.floor(Math.random() * 1000000).toString();
              expect(currentNonce).not.toEqual(newNonce);
              session
                .put(`/account/${regularAccount.publicAddress}`)
                .send({ nonce: newNonce })
                .expect('Content-Type', /html/)
                .expect(403)
                .end((err, res) => {
                  if (err) return done.fail(err);

                  models.Account.findOne({ publicAddress: regularAccount.publicAddress }).then(account => {
                    expect(account.nonce).toEqual(currentNonce);

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
  });
});
