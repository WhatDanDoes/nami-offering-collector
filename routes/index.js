const express = require('express');
const router = express.Router();
const models = require('../models');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: process.env.TITLE });
});

/**
 * This is where the nonce gets sent
 *
 */
router.post('/identify', (req, res) => {
  const nonce = Math.floor(Math.random() * 1000000).toString();
  models.Agent.findOneAndUpdate({ publicAddress: req.body.publicAddress }, { nonce: nonce }, { upsert: true, new: true, runValidators: true }).then(agent => {
    res.status(201).json({ nonce: agent.nonce });
  }).catch(err => {
    res.status(500).json(err);
  });
});

module.exports = router;
