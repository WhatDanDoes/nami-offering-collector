/**
 * 2021-12-17
 *
 * I followed the message signing example provided here:
 *
 *   https://github.com/Emurgo/message-signing/
 *
 * These are primitive behavioural tests that were discerned on the fly.
 * I have no idea how any of this actually works.
 */
const dataSigner = require('../../lib/dataSigner');
const SignedData = require('../../lib/SignedData');
const setupWallet = require('../support/setupWallet');

describe('dataSigner', () => {

  let secret, publicHex, signingMessage, publicBech32;
  beforeAll(() => {
    ({ secret, publicHex, signingMessage, publicBech32 } = setupWallet());
  });

  let signedMessage;
  beforeEach(() => {
    signedMessage = dataSigner(signingMessage, secret, publicHex);
  });

  describe('exploratory smoke testing', () => {

    it('doesn\'t bomb', () => {
      expect(signedMessage).toBeDefined();
    });
  });

  describe('signature', () => {

    let signedData;
    beforeEach(() => {
      signedData = new SignedData(signedMessage);
    });

    // The public address param comes hex-encoded from the Nami wallet
    it('can be validated', () => {
      expect(signedData.verify(publicHex, signingMessage)).toBe(true);
    });
  });
});

