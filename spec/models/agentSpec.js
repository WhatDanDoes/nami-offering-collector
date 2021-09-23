const db = require('../../models');
const Agent = db.Agent;

describe('Agent', () => {

  const _profile = {
    publicAddress: '0x0eDB511d9434452D24a3Eeb47E3d02Fda903A73a',
  };

  let agent;
  beforeEach(() => {
    agent = new Agent(_profile);
  });

  afterEach(done => {
    db.mongoose.connection.db.dropDatabase().then(result => {
      done();
    }).catch(err => {
      done.fail(err);
    });
  });

  describe('basic validation', () => {

    it('sets the createdAt and updatedAt fields', done => {
      expect(agent.createdAt).toBe(undefined);
      expect(agent.updatedAt).toBe(undefined);
      agent.save().then(obj => {
        expect(agent.createdAt instanceof Date).toBe(true);
        expect(agent.updatedAt instanceof Date).toBe(true);
        done();
      }).catch(err => {
        done.fail(err);
      });
    });

    describe('publicAddress', () => {

      it('is required', done => {
        Agent.create({..._profile, publicAddress: undefined }).then(obj => {
          done.fail('This should not have saved');
        }).catch(error => {
          expect(Object.keys(error.errors).length).toEqual(1);
          expect(error.errors['publicAddress'].message).toEqual('Public address required');
          done();
        });
      });

      it('cannot be null', done => {
        Agent.create({..._profile, publicAddress: null }).then(obj => {
          done.fail('This should not have saved');
        }).catch(error => {
          expect(Object.keys(error.errors).length).toEqual(1);
          expect(error.errors['publicAddress'].message).toEqual('Public address required');
          done();
        });
      });

      it('is unique', done => {
        agent.save().then(obj => {
          Agent.create(_profile).then(obj => {
            done.fail('This should not have saved');
          }).catch(error => {
            expect(Object.keys(error.errors).length).toEqual(1);
            expect(error.errors['publicAddress'].message).toEqual('That public address is already registered');
            done();
          });
        }).catch(error => {
          done.fail(error);
        });
      });

      it('is valid', done => {
        Agent.create({..._profile, publicAddress: 'this is not valid' }).then(obj => {
          done.fail('This should not have saved');
        }).catch(error => {
          expect(Object.keys(error.errors).length).toEqual(1);
          expect(error.errors['publicAddress'].message).toEqual('Invalid public address');
          done();
        });
      });
    });
  });
});

