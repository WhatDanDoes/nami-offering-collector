const fs = require('fs');
const express = require('express');
const router = express.Router();
const models = require('../models');

const sigUtil = require('eth-sig-util');
const ethUtil = require('ethereumjs-util');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: process.env.TITLE });
});

/**
 * This is where the nonce gets created and sent
 */
router.post('/introduce', (req, res) => {
  models.Agent.findOne({ where: { publicAddress: req.body.publicAddress } }).then(agent => {

    fs.readFile('./message.txt', 'utf8', (err, text) => {
      if (err) return res.status(500).json({ message: err.message });

      const signingMessage = [
        {
          type: 'string',
          name: 'Message',
          value: text
        }
      ];

      if (agent) {
        const nonce = Math.floor(Math.random() * 1000000).toString();
        agent.nonce = nonce;
        agent.save({ validateBeforeSave: false }).then(agent => {

          signingMessage.push({
            type: 'string',
            name: 'nonce',
            value: agent.nonce
          });

          res.status(201).json({ message: signingMessage, publicAddress: agent.publicAddress });
        }).catch(err => {
          res.status(500).json(err);
        });
      }
      else {
        models.Agent.create({ publicAddress: req.body.publicAddress }).then(agent => {

          signingMessage.push({
            type: 'string',
            name: 'nonce',
            value: agent.nonce
          });

          res.status(201).json({ message: signingMessage, publicAddress: agent.publicAddress });
        }).catch(err => {
          if (err.errors['publicAddress']) {
            res.status(400).json({ message: err.errors['publicAddress'].message });
          }
          else {
            res.status(400).json({ message: err.message });
          }
        });
      }
    });
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

    fs.readFile('./message.txt', 'utf8', (err, text) => {
      if (err) return res.status(500).json({ message: err.message });

      const message = [
        {
          type: 'string',
          name: 'Message',
          value: text
        },
        {
          type: 'string',
          name: 'nonce',
          value: agent.nonce
        }
      ];

      //
      // 2021-9-28 https://www.toptal.com/ethereum/one-click-login-flows-a-metamask-tutorial
      //
      // We now are in possession of message, publicAddress and signature. We
      // can perform an elliptic curve signature verification with ecrecover
      //
      const msgBuffer = ethUtil.toBuffer(JSON.stringify(message));
      const msgHash = ethUtil.hashPersonalMessage(msgBuffer);
      const signatureBuffer = ethUtil.toBuffer(req.body.signature);
      const signatureParams = ethUtil.fromRpcSig(signatureBuffer);
      const publicKey = ethUtil.ecrecover(
        msgHash,
        signatureParams.v,
        signatureParams.r,
        signatureParams.s
      );
      const addressBuffer = ethUtil.publicToAddress(publicKey);
      const address = ethUtil.bufferToHex(addressBuffer);

      if (address.toLowerCase() === agent.publicAddress.toLowerCase()) {
        req.session.agent_id = agent._id;
        req.session.save(err => {
          if (err) return res.status(500).json({ message: 'Could not establish session' });

          res.status(201).json({ message: 'Welcome!' });
        });
      }
      else {
        return res.status(401).json({ message: 'Signature verification failed' });
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
