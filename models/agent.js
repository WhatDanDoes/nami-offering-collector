module.exports = function(mongoose) {
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
            const count = await this.model('Agent').count({ publicAddress: val });
            return !count;
          },
          message: 'That public address is already registered'
        }
      ]
    },
  }, {
    timestamps: true,
  });

  return AgentSchema;
}
