const express = require('express');
const router = express.Router();
const models = require('../models');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: process.env.TITLE });
});

/**
 * This is where the nonce gets created and sent
 */
router.post('/identify', (req, res) => {
  models.Agent.findOne({ where: { publicAddress: req.body.publicAddress } }).then(agent => {

    if (agent) {
      const nonce = Math.floor(Math.random() * 1000000).toString();
      agent.nonce = nonce;
      agent.save({ validateBeforeSave: false }).then(agent => {
        res.status(201).json({ nonce: agent.nonce, publicAddress: agent.publicAddress });
      }).catch(err => {
        res.status(500).json(err);
      });
    }
    else {
      models.Agent.create({ publicAddress: req.body.publicAddress }).then(agent => {
        res.status(201).json({ nonce: agent.nonce, publicAddress: agent.publicAddress });
      }).catch(err => {
        if (err.errors['publicAddress']) {
          res.status(400).json({ message: err.errors['publicAddress'].message });
        }
        else {
          res.status(400).json({ message: err.message });
        }
      });
    }
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

  // Tests suggest this doesn't do anything.
  // I.e., the client still has a cookie (see above)
  req.session.destroy(err => {
    if (err) console.error(err);
    res.redirect('/');
  });
});

module.exports = router;
