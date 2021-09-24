require('dotenv').config();
const plugins = require('@synthetixio/synpress/plugins/');
const db = require('./database');

module.exports = (on, config) => {

  // Execute synpress plugins
  const config = plugins(on, config);

  on('task', {
    dropDatabase () {
      return db.mongoose.connection.db.dropDatabase();
    },
  });

  config.env = {...config.env, ...process.env};

  return config;
}
