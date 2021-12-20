/**
 * 2021-12-16
 *
 * Swiped from:
 *
 * https://github.com/Emurgo/message-signing/blob/7101fbf1bccb2a8373dabeba40f3d1025a99f667/examples/rust/src/main.rs
 */
const { HeaderMap, COSESign1Builder, ProtectedHeaderMap, Headers, Label, AlgorithmId, CBORValue } = require('../message_signing/rust/pkg/emurgo_message_signing');
const { PrivateKey, Bip32PrivateKey, Address, BaseAddress } = require('@emurgo/cardano-serialization-lib-nodejs');
const { Buffer } = require('buffer');

function dataSigner(payload, privateKey, baseAddress) {
  /**
   * Deconstruct key
   */
  const rootKey = Bip32PrivateKey.from_bech32(privateKey);
  const secretKey = rootKey.to_raw_key();
  const publicKey = secretKey.to_public();

  baseAddress = Address.from_bytes(Buffer.from(baseAddress, 'hex'));

  /**
   * Create message
   *
   * According to the example referenced above
   *
   * > protected headers are those that are actually signed
   */
  const protectedHeaders = HeaderMap.new();
  protectedHeaders.set_algorithm_id(
    Label.from_algorithm_id(AlgorithmId.EdDSA)
  );
  protectedHeaders.set_key_id(publicKey.as_bytes());

  protectedHeaders.set_header(
    Label.new_text('address'),
    CBORValue.new_bytes(baseAddress.to_bytes())
  );

  const protected_serialized = ProtectedHeaderMap.new(protectedHeaders);
  const unprotected = HeaderMap.new();
  const headers = Headers.new(protected_serialized, unprotected);

  /**
   * Somehow COSESign1Builder _simplifies_ this whole process.
   * Without this constructor, SigStructure must be manually
   * created.
   *
   * As paraphrased from the example:
   *
   * > Remember, we sign SigStructure, not the message/headers themselves.
   */
  const builder = COSESign1Builder.new(headers, CBORValue.new_bytes(Buffer.from(payload, 'utf8')).to_bytes(), false);
  const to_sign = builder.make_data_to_sign().to_bytes();

  /**
   * Signed with Ed25519 keys as per spec. Key cannot be in X25519 format
   */
  const signed_sig_struct = secretKey.sign(to_sign).to_bytes();

  /**
   * The final COSESign1 result to be shared
   */
  const cose_sign1 = builder.build(signed_sig_struct);

  // Everything seems to work best in hex
  return Buffer.from(cose_sign1.to_bytes()).toString('hex');
};

module.exports = dataSigner;
