require('dotenv').config();
const plugins = require('@synthetixio/synpress/plugins/');
const db = require('./database');
const ethers = require('ethers');

module.exports = (on, config) => {

  // Execute synpress plugins
  const config = plugins(on, config);

  on('task', {
    dropDatabase () {
      return db.mongoose.connection.db.dropDatabase();
    },
    async getBalance (address) {
      const provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545');
      if (address === 'CONFIGURED') {
        address = process.env.PUBLIC_ADDRESS;
      }
      let balance = await provider.getBalance(address);
      return ethers.utils.formatEther(balance);
    },
    getServerAddress () {
      return new Promise((resolve, reject) => {
        resolve(process.env.PUBLIC_ADDRESS)
      })
    },
    async getGasPrice () {
      const provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:8545');
      const price = await provider.getGasPrice();
      return ethers.utils.formatEther(price);
    },
  });

  config.env = {...config.env, ...process.env};

  return config;
}
