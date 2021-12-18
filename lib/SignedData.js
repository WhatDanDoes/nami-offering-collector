/**
 * 2021-12-16
 *
 * This was jacked from these two excellent sources:
 *
 * - https://cardano.stackexchange.com/questions/2498/how-to-verify-data-signed-with-nami-wallet-in-a-node-backend
 * - https://cardano.stackexchange.com/questions/4793/limitations-of-wallet-login-for-application-with-off-chain-user-data
 */
const {COSESign1, Label} = require('../message_signing/rust/pkg/emurgo_message_signing');
const {Address, Ed25519Signature, PublicKey, BaseAddress, StakeCredential, RewardAddress} = require('@emurgo/cardano-serialization-lib-nodejs');
const {Buffer} = require('buffer');

class SignedData {

  constructor(signed) {
    let message = COSESign1.from_bytes(Buffer.from(signed, 'hex'));
    let headermap = message.headers().protected().deserialized_headers();
    this.headers = {
      //algorithmId: headermap.algorithm_id().as_int().as_i32(),
      address: Address.from_bytes(headermap.header(Label.new_text('address')).as_bytes()),
      publicKey: PublicKey.from_bytes(headermap.key_id())
    };
    this.payload = message.payload();
    this.signature = Ed25519Signature.from_bytes(message.signature());
    this.data = message.signed_data().to_bytes();
  }

  /**
   * Verify signature
   *
   * @param address - hex string
   * @param address - string
   */
  verify(address, payload) {
    if (!this.verifyPayload(payload)) {
      throw new Error('Payload does not match');
    }
    if (!this.verifyAddress(address)) {
      throw new Error('Could not verify because of address mismatch');
    }
    return this.headers.publicKey.verify(this.data, this.signature);
  };

  verifyPayload(payload) {
    return Buffer.from(this.payload, 'hex').compare(Buffer.from(payload, 'hex'));
  }

  verifyAddress(address) {
    const checkAddress = Address.from_bytes(Buffer.from(address, 'hex'));
    return this.headers.address.to_bech32() === checkAddress.to_bech32();
  };
}

module.exports = SignedData;
