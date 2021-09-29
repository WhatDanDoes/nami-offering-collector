module.exports = function(mongoose) {
  const {Types: {Long}} = mongoose;

  const ethereum_address = require('ethereum-address');
  const Schema = mongoose.Schema;

  const AgentSchema = new Schema({
    publicAddress: {
      type: String,
      trim: true,
      required: [true, 'Public address required'],
      empty: [false, 'Public address required'],
      validate: [
        {
          validator: function(val) {
            return ethereum_address.isAddress(val);
          },
          message: 'Invalid public address'
        },
        {
          validator: async function(val) {
            const agentExists = await this.model('Agent').findOne({ where: { publicAddress: val } });
            return !agentExists;
          },
          message: 'That public address is already registered'
        }
      ],
    },
    name: {
      type: String,
      trim: true,
      maxLength: [255, 'Name too long']
    },
    nonce: {
      type: String,
      default: Math.floor(Math.random() * 1000000).toString(),
      validate: {
        validator: function(val) {
          try {
            return BigInt(val);
          }
          catch (err) {
            return false;
          }
        },
        message: 'Invalid nonce. Must be BigInt parsable'
      }
    }
  }, {
    timestamps: true,
  });

  return AgentSchema;
}
