const express = require('express');
const router = express.Router();
const ethers = require('ethers');
const models = require('../models');
const ensureAuthorized = require('../lib/ensureAuthorized');

/**
 * GET /account
 */
router.get('/', ensureAuthorized, (req, res, next) => {
  if (req.headers['accept'] === 'application/json') {
    return res.status(200).json(req.agent);
  }
  res.render('account', { messages: req.flash(), agent: req.agent, errors: {} });
});

/**
 * PUT /account
 */
router.put('/', ensureAuthorized, (req, res, next) =>  {
  // Make sure no one tries modifying forbidden properties
  const updates = {};
  for (let prop in req.body) {
    if (['publicAddress', 'nonce'].includes(prop)) {
      if (req.headers['accept'] === 'application/json') {
        return res.status(403).json({ message: 'Forbidden' });
      }
      return res.status(403).render('account', { messages: { error: 'Unauthorized' }, agent: req.agent, errors: {} });
    }
    updates[prop] = req.body[prop];
  }

  models.Agent.findOneAndUpdate({ publicAddress: req.agent.publicAddress }, updates, { runValidators: true }).then(obj => {
    if (req.headers['accept'] === 'application/json') {
      return res.status(201).json({ message: 'Info updated' });
    }
    req.flash('success', 'Info updated');
    res.redirect('/account');
  }).catch(err => {
    if (req.headers['accept'] === 'application/json') {
      return res.status(400).json({ message: err.errors[Object.keys(err.errors)[0]].message });
    }
    req.flash('error', 'Submission failed. Check your form.');
    res.status(400).render('account', { messages: req.flash(), errors: err.errors, agent: { ...updates, publicAddress: req.agent.publicAddress } });
  });
});

module.exports = router;
