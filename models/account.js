module.exports = function(mongoose) {
  const {Types: {Long}} = mongoose;

  const validator = require('validator')
  const ethereum_address = require('ethereum-address');
  const Schema = mongoose.Schema;

  const AccountSchema = new Schema({
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
            const accountExists = await this.model('Account').findOne({ publicAddress: new RegExp(val, 'i') });
            return !accountExists;
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
    },
    email: {
      type: String,
      required: false,
      trim: true,
      validate: [
        {
          validator: function(val) {
            if (!val) {
              return true;
            }
            return validator.isEmail(val);
          },
          message: 'Invalid email'
        },
      ]
    },
    streetAddress: {
      type: String,
      trim: true,
      maxLength: [255, 'Street address too long']
    },
    city: {
      type: String,
      trim: true,
      maxLength: [255, 'City name too long']
    },
    province: {
      type: String,
      trim: true,
      maxLength: [255, 'Province name too long']
    },
    postalCode: {
      type: String,
      trim: true,
      maxLength: [255, 'Postal code name too long']
    },
    country: {
      type: String,
      trim: true,
      maxLength: [255, 'Country name too long']
    },
    phone: {
      type: String,
      required: false,
      trim: true,
      validate: [
        {
          validator: function(val) {
            if (!val) {
              return true;
            }
            return validator.isMobilePhone(val);
          },
          message: 'That doesn\'t look like a phone number'
        },
      ]
    },
  }, {
    timestamps: true,
    collation: { locale: 'en', strength: 1 }
  });

  AccountSchema.methods.isSuper = function() {
    return process.env.PUBLIC_ADDRESS.toLowerCase() === this.publicAddress.toLowerCase();
  };

  return AccountSchema;
}
