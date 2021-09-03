/**
 * 2021-9-3
 *
 * This script is enabled my first successful transaction on the Ropsten
 * test network:
 *
 * txHash: 0xd62cb708e651ec27bcaa14a8929f5502862075e0239c93fc574429abdc2ae20c
 */
require('dotenv').config()

// From what I understand so far, `web3` enables interfacing with the chain
// while `@ethereumjs/tx` implements functions related to transactions
const Web3 = require('web3');
const Tx = require('@ethereumjs/tx');
const Common = require('@ethereumjs/common');


// Common allows specifying the chain and harfork to be used when transacting
const common = new Common.default({ chain: 'ropsten', hardfork: 'london' });

// Create Web3 connection to chain API access point (I signed up for a dev
// account at Alchemy
const web3 = new Web3(process.env.BLOCKCHAIN_API);

// Best set as dotenv vars
const account1 = process.env.ACCOUNT_PUBLIC;
const private1 = Buffer.from(process.env.ACCOUNT_PRIVATE, 'hex');// Why does this one need to be buffered?
const account2 = process.env.DESTINATION_ACCOUNT;

// These `getBalance` calls are mostly just for comforting feedback
web3.eth.getBalance(account1, (err, bal) => {
  console.log('account1 balance:', web3.utils.fromWei(bal, 'ether'));

  web3.eth.getBalance(account2, (err, bal) => {
    console.log('account2 balance:', web3.utils.fromWei(bal, 'ether'));

    // Used in creating a _nonce_
    web3.eth.getTransactionCount(account1, (err, txCount) => {
      console.log('txCount', txCount, web3.utils.toHex(txCount));

      /**
       * Build the transaction
       */

      // 2021-9-3 Calculations and values from:
      // https://www.blocknative.com/blog/eip-1559-fees
      const baseFee = 21000;
      const tip = 2;
      const maxFee = (2 * baseFee) + tip;

      // Commented appear to be optional or have defaults
      const txObject = {
        //data: "0x1a8451e600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
        nonce: web3.utils.toHex(txCount),
        to: account2,
        value: web3.utils.toHex(web3.utils.toWei('1', 'ether')),
        gasLimit: web3.utils.toHex(baseFee),
        maxPriorityFeePerGas: web3.utils.toHex(tip),
        maxFeePerGas: web3.utils.toHex(web3.utils.toWei(`${maxFee}`, 'gwei')),
        //chainId: "0x01",
        //accessList: [],
        //type: "0x02"
      };

      // Sign the transaction
      const tx = Tx.FeeMarketEIP1559Transaction.fromTxData(txObject, {common});
      const signedTx = tx.sign(private1);

      // Serialize and convert transaction object to hex
      const serializedTransaction = signedTx.serialize();
      const raw = '0x' + serializedTransaction.toString('hex');

      // Broadcast the transaction
      web3.eth.sendSignedTransaction(raw, (err, txHash) => {
        if (err) {
          console.error(err);
        }

        // If the transaction was successful, the txHash will be defined
        console.log('txHash', txHash);
      });
    });
  });
});
