
const fs = require('fs');
const cardanoUtils = require('cardano-crypto.js');

async function setupWallet(mnemonic = 'logic easily waste eager injury oval sentence wine bomb embrace gossip supreme') {
  const parentWalletSecret = await cardanoUtils.mnemonicToRootKeypair(mnemonic, 1)
  const parentWalletPublicExt = cardanoUtils.bech32.encode('addr_test', parentWalletSecret.slice(64, 128));
  const parentWalletPublic = cardanoUtils.bech32.encode('addr_test', parentWalletSecret.slice(64, 96));
  const signingMessage = fs.readFileSync('./message.txt', 'utf8');

  return { parentWalletSecret, parentWalletPublic, signingMessage, parentWalletPublicExt };
};

module.exports = setupWallet;
