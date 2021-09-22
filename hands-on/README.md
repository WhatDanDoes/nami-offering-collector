Being new to this technology, I've documented what I've learned so far in the  `hands-on/` directory. The form and purpose of this document will also change as I gain a better understanding of blockchain development practices.

Set some values in `.env`:

```
ACCOUNT_PUBLIC='set-wallet-public-key-here'
ACCOUNT_PRIVATE='set-wallet-private-key-here'
DESTINATION_ACCOUNT='set-receiving-wallet-public-key-here'
BLOCKCHAIN_API='https://eth-ropsten.alchemyapi.io/v2/some-client-key'
```
You'll need an ETH address and a blockchain API access point at a minimum (I'm using [alchemy](https://www.alchemy.com/) for the moment). The var names should be self explanatory.

# Basic localhost test chain operations

Start the local blockchain:

```
npx ganache-cli
```

Open `node` CLI:

```
node
```

Using `dotenv` to remind myself not to commit keys:

```
> require('dotenv').config()
```

Query an address:

```
> const Web3 = require('web3');
> const web3 = new Web3('http://localhost:8545');
> web3.eth.getAccounts(console.log);
> web3.eth.getBalance('0x2dAAD1BaCf6559E6f7a9445eb432Ba667700AbE8', (err, wei) => { balance = web3.utils.fromWei(wei, 'ether') });
> web3.eth.getBalance('0x2dAAD1BaCf6559E6f7a9445eb432Ba667700AbE8').then(wei => { balance = web3.utils.fromWei(wei, 'ether') });
```

## Interacting with a contract:

From `node` CLI:

```
> require('dotenv').config()
> const Web3 = require('web3');
> const web3 = new Web3('https://eth-ropsten.alchemyapi.io/v2/v12Pa_ijIr_j1idLmm_93kQ-24lQ5jnZ');
```

The address comes from Alchemy.

Need to create an instance of the smart contract. This info pertains to Uniswap and was found at etherscan.io/tokens. Click on contract address and view code under _Contract_ tab. Copy and save the Conract ABI in a variable. Save the contract address as well.

```
var contract = new web3.eth.Contract(abi, contractAddress);
contract.methods.name().call().then(console.log)
```

Get balance of token holder (also obtained from etherscan.io):

```
contract.methods.balanceOf('0x47173b170c64d16393a52e6c480b3ad8c302ba1e').call().then(console.log)
```

# Send transaction over ganache

```
web3.eth.sendTransaction({ from: address1, to: address2, value: web3.utils.toWei('1', 'ether') });
web3.eth.getBalance(address1, (err, result) => { console.log(result) });
```

# Hands on

My first Ropsten testnet transaction:

```
node hands-on/sendEth.js
```

This assumes wallet and API are configured in `.env`
