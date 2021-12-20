/**
 * 2021-12-16
 *
 * From: https://github.com/Emurgo/cardano-serialization-lib/blob/master/doc/getting-started/generating-keys.md
 */
const fs = require('fs');
const cardanoUtils = require('cardano-crypto.js');

const cardano = require('@emurgo/cardano-serialization-lib-nodejs');
const bip39 = require('bip39');

function harden(num) {
  return 0x80000000 + num;
}

function setupWallet(mnemonic = 'logic easily waste eager injury oval sentence wine bomb embrace gossip supreme') {

  const entropy = bip39.mnemonicToEntropy(mnemonic)
  const rootKey = cardano.Bip32PrivateKey.from_bip39_entropy(
    Buffer.from(entropy, 'hex'),
    Buffer.from(''),
  );

  const accountKey = rootKey
    .derive(harden(1852)) // purpose
    .derive(harden(1815)) // coin type
    .derive(harden(0)); // account #0

  const utxoPubKey = accountKey
    .derive(0) // external
    .derive(0)
    .to_public();

  const stakeKey = accountKey
    .derive(2) // chimeric
    .derive(0)
    .to_public();

  const baseAddr = cardano.BaseAddress.new(
    cardano.NetworkInfo.mainnet().network_id(),
    cardano.StakeCredential.from_keyhash(utxoPubKey.to_raw_key().hash()),
    cardano.StakeCredential.from_keyhash(stakeKey.to_raw_key().hash()),
  );

  const secret = rootKey.to_bech32();

  const publicBech32 = baseAddr.to_address().to_bech32();
  const publicHex = Buffer.from(baseAddr.to_address().to_bytes()).toString('hex');
  const signingMessage = fs.readFileSync('./message.txt', 'utf8');

  return {
    secret,
    publicHex,
    publicBech32,
    signingMessage,
  };
};

module.exports = setupWallet;
