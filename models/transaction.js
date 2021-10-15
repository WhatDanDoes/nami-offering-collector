module.exports = function(mongoose) {

  const ethers = require('ethers');

  const Schema = mongoose.Schema;

  const TransactionSchema = new Schema({
    hash: {
      type: String,
      trim: true,
      required: [true, 'Transaction hash required'],
      empty: [false, 'Transaction hash required'],
      validate: [
        {
          validator: function(val) {
            return /^0x([A-Fa-f0-9]{64})$/.test(val);
          },
          message: 'Invalid transaction hash'
        },
        {
          validator: async function(val) {
            const transactionExists = await this.model('Transaction').findOne({ hash: new RegExp(val, 'i') });
            return !transactionExists;
          },
          message: 'That transaction hash is already registered'
        }
      ],
    },
    value: {
      type: Object,
      required: [true, 'Value is required'],
      empty: [false, 'Value is required'],
      validate: {
        validator: val => ethers.BigNumber.isBigNumber(val),
        message: 'Value must be a BigNumber'
      },
      get: value => {
        try {
          return ethers.utils.formatEther(value)
        }
        catch (err) {
          // The try-catch is necessary in the case where
          // `value` is `undefined`. The getter is called
          // into play on validation for some reason.
        }
      }
    },
    account: {
      type: Schema.Types.ObjectId,
      ref: 'Agent',
      required: [true, 'To what account does this transaction belong?'],
    },
  }, {
    timestamps: { createdAt: true, updatedAt: false },
    collation: { locale: 'en', strength: 1 }
  });

  return TransactionSchema;
}
