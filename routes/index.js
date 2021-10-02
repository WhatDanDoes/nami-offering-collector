const fs = require('fs');
const express = require('express');
const router = express.Router();
const models = require('../models');

const sigUtil = require('eth-sig-util');
//const ethUtil = require('ethereumjs-util');

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
        //name: 'Metamask Offering Collector',
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

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: process.env.TITLE, messages: req.flash() });
});

/**
 * This is where the nonce gets created and sent
 */
router.post('/introduce', (req, res) => {
  models.Agent.findOne({ where: { publicAddress: req.body.publicAddress } }).then(agent => {

   if (agent) {
     const nonce = Math.floor(Math.random() * 1000000).toString();
     agent.nonce = nonce;
     agent.save({ validateBeforeSave: false }).then(agent => {

       getSigningMessage(nonce, (err, message) => {
         if (err) return res.status(500).json({ message: err.message });
         res.status(201).json({ typedData: message, publicAddress: agent.publicAddress });
       });
     }).catch(err => {
       res.status(500).json(err);
     });
   }
   else {
     models.Agent.create({ publicAddress: req.body.publicAddress }).then(agent => {
       getSigningMessage(agent.nonce, (err, message) => {
         if (err) return res.status(500).json({ message: err.message });
         res.status(201).json({ typedData: message, publicAddress: agent.publicAddress });
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
           req.flash('error', err.errors['publicAddress'].message);
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
  models.Agent.findOne({ where: { publicAddress: req.body.publicAddress } }).then(agent => {
    getSigningMessage(agent.nonce, (err, message) => {
      if (err) return res.status(500).json({ message: err.message });

      const address = sigUtil.recoverTypedSignature({ data: message, sig: req.body.signature, version: 'V1' });

      if (address.toLowerCase() === agent.publicAddress.toLowerCase()) {
        req.session.agent_id = agent._id;
        req.session.save(err => {
          if (err) return res.status(500).json({ message: 'Could not establish session' });

          if (req.headers['accept'] === 'application/json') {
            return res.status(201).json({ message: 'Welcome!' });
          }

          req.flash('success', 'Welcome!');
          res.redirect('/');
        });
      }
      else {
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
