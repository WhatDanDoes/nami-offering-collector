const fs = require('fs');
const express = require('express');
const router = express.Router();
const models = require('../models');

const SignedData = require('../lib/SignedData');
const { Address } = require('@emurgo/cardano-serialization-lib-nodejs');


/**
 * Ensures the message stays the same on signature verification
 */
function getSigningMessage(nonce, done) {
  fs.readFile('./message.txt', 'utf8', (err, text) => {
    if (err) return done(err);

    done(null, {
      domain: {
        // Defining the chain aka Rinkeby testnet or Ethereum Main Net
        //chainId: 1337,
        // Give a user friendly name to the specific contract you are signing for.
        //name: 'Nami Offering Collector',
        // If name isn't enough add verifying contract to make sure you are establishing contracts with the proper entity
        //verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC',
        // Just let's you know the latest version. Definitely make sure the field name is correct.
        //version: '1',
      },
      message: {
        message: text,
        nonce: nonce
      },
      primaryType: 'Message',
      types: {
        EIP712Domain: [
          //{ name: 'name', type: 'string' },
          //{ name: 'version', type: 'string' },
          //{ name: 'chainId', type: 'uint256' },
          //{ name: 'verifyingContract', type: 'address' },
        ],
        Message: [
          { name: 'message', type: 'string' },
          { name: 'nonce', type: 'string' },
        ],
      },
    });
  });
};

/**
 * The account has introduced himself, create and return nonce message for signing
 */
router.post('/introduce', (req, res) => {
  /**
   * `req.body.publicAddress` comes in hex format. Server-side, this is all
   * converted to Bech32 for readability, mostly.
   */
  let publicAddress;
  try {
    publicAddress = Address.from_bytes(Buffer.from(req.body.publicAddress, 'hex')).to_bech32();
  }
  catch (err) {
    console.error(err.message);
    if (req.headers['accept'] === 'application/json') {
      return res.status(400).json({ message: 'Invalid public address' });
    }
    req.flash('error', 'Invalid public address');
    return res.redirect('/');
  }

  models.Account.findOne({ publicAddress: publicAddress }).then(account => {

    if (account) {
      const nonce = Math.floor(Math.random() * 1000000).toString();
      account.nonce = nonce;
      account.save({ validateBeforeSave: false }).then(account => {

        getSigningMessage(nonce, (err, message) => {
          if (err) return res.status(500).json({ message: err.message });

          if (req.headers['accept'] === 'application/json') {
            return res.status(201).json({ typedData: message, publicAddress: account.publicAddress });
          }

          let typedData = Buffer.from(`${message.message.message} ${nonce}`, 'utf8');

          res.status(201).render('sign', {
            publicAddress: req.body.publicAddress, // Nami likes hex
            typedData: typedData.toString('hex'),
            messages: req.flash(),
            messageText: message.message.message,
            nonce: message.message.nonce,
          });
        });
      }).catch(err => {
        res.status(500).json(err);
      });
    }
    else {
      models.Account.create({ publicAddress: publicAddress }).then(account => {
        getSigningMessage(account.nonce, (err, message) => {
          if (err) return res.status(500).json({ message: err.message });

          let typedData = Buffer.from(`${message.message.message} ${account.nonce}`, 'utf8');

          if (req.headers['accept'] === 'application/json') {
            return res.status(201).json({ typedData: message, publicAddress: account.publicAddress });
          }
          res.status(201).render('sign', {
            publicAddress: req.body.publicAddress, // Nami likes hex
            typedData: typedData.toString('hex'),
            messages: req.flash(),
            messageText: message.message.message,
            nonce: message.message.nonce,
          });
        });
      }).catch(err => {
        if (req.headers['accept'] === 'application/json') {
          if (err.errors['publicAddress']) {
            res.status(400).json({ message: err.errors['publicAddress'].message });
          }
          else {
            res.status(400).json({ message: err.message });
          }
        }
        else {
          if (err.errors['publicAddress']) {
            req.flash('error', 'I don\'t think you have Nami installed');
          }
          else {
            req.flash('error', err.message);
          }
          res.redirect('/');
        }
      });
    }
  }).catch(err => {
    res.status(500).json(err);
  });
});

/**
 * Takes signed message and verifies signatures
 *
 */
router.post('/prove', (req, res) => {

  /**
   * `req.body.publicAddress` comes in hex format. Server-side, this is all
   * converted to Bech32 for readability, mostly.
   */
  let publicAddress;
  try {
    publicAddress = Address.from_bytes(Buffer.from(req.body.publicAddress, 'hex'));
  }
  catch (err) {
    return res.status(500).json({ message: err.message });
  }

  models.Account.findOne({ publicAddress: publicAddress.to_bech32() }).then(account => {
    getSigningMessage(account.nonce, (err, message) => {
      if (err) return res.status(500).json({ message: err.message });

      let typedData = Buffer.from(`${message.message.message} ${message.message.nonce}`, 'utf8');
      let signedData = new SignedData(req.body.signature);

      try {
        if (signedData.verify(req.body.publicAddress, `${message.message.message} ${message.message.nonce}`)) {
          req.session.account_id = account._id;
          req.session.save(err => {
            if (err) return res.status(500).json({ message: 'Could not establish session' });

            if (req.headers['accept'] === 'application/json') {
              return res.status(201).json({ message: 'Welcome!' });
            }

            if (account.isSuper()) {
              req.flash('success', 'Welcome, root!');
              return res.redirect('/transaction');
            }

            req.flash('success', 'Welcome!');
            res.redirect('/');
          });
        }
      }
      catch(err) {
        if (req.headers['accept'] === 'application/json') {
          return res.status(401).json({ message: 'Signature verification failed' });
        }

        req.flash('error', 'Signature verification failed');
        res.redirect('/');
      }
    });
  }).catch(err => {
    res.status(500).json(err);
  });
});

/**
 * Logout
 */
router.get('/disconnect', (req, res) => {
  for (let cookie in req.cookies) {
    res.cookie(cookie, '', {expires: new Date(0)});
  }

  // Tests suggest this doesn't do anything even with `unset: 'destroy'`.
  // I.e., the client still has a cookie (see above)
  req.session.destroy(err => {
    if (err) console.error(err);

    res.redirect('/');
  });
});

module.exports = router;
