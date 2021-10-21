const express = require('express');
const router = express.Router();
const ethers = require('ethers');
const models = require('../models');
const ensureAuthorized = require('../lib/ensureAuthorized');

/**
 * GET /transaction
 */
router.get('/', ensureAuthorized, (req, res, next) => {
  let searchOptions = { account: req.agent };
  let selectOptions = { "_id": 0, "__v": 0, "account": 0 };

  if (req.agent.isSuper()) {
    searchOptions = {};
    selectOptions = { "_id": 0, "hash": 1, "value": 1, "createdAt": 1 };
  }
  models.Transaction.find(searchOptions).populate('account', '-_id publicAddress name').select(selectOptions).sort({ createdAt: -1 }).then(txs => {
    if (req.headers['accept'] === 'application/json') {
      return res.status(200).json(txs);
    }
    res.render('transaction', { messages: req.flash(), agent: req.agent, transactions: txs });
  }).catch(err => {
    if (req.headers['accept'] === 'application/json') {
      return res.status(400).json({ message: err.errors[Object.keys(err.errors)[0]].message });
    }
    req.flash('error', err.errors[Object.keys(err.errors)[0]].message);
    res.status(400).render('transaction', { messages: req.flash(), agent: req.agent, transactions: [] });
  });
});

/**
 * POST /transaction
 */
router.post('/', ensureAuthorized, (req, res, next) =>  {

  if (req.agent.isSuper()) {
    const msg = 'You didn\'t seriously send ETH to yourself, did you?';
    if (req.headers['accept'] === 'application/json') {
      return res.status(400).json({ message: msg });
    }
    req.flash('error', msg);
    return res.status(400).render('transaction', { messages: req.flash(), agent: req.agent, errors: {}, transactions: [] });
  }

  if (!req.body.value) {
    if (req.headers['accept'] === 'application/json') {
      return res.status(400).json({ message: 'Value is required' });
    }
    req.flash('error', 'Value is required');
    return res.status(400).render('account', { messages: req.flash(), agent: req.agent, errors: {} });
  }

  models.Transaction.create({ hash: req.body.hash, value: ethers.BigNumber.from(req.body.value), account: req.agent }).then(tx => {
    // Update updatedAt on the account so that root can see recent account activity
    models.Agent.findOneAndUpdate({ publicAddress: req.agent.publicAddress }, { updatedAt: Date.now() }, { runValidators: true }).then(obj => {
      if (req.headers['accept'] === 'application/json') {
        return res.status(201).json({ message: 'Transaction recorded' });
      }
      req.flash('success', 'Transaction recorded');
      res.redirect('/transaction');
    }).catch(err => {
      if (req.headers['accept'] === 'application/json') {
        return res.status(400).json({ message: err.errors[Object.keys(err.errors)[0]].message });
      }
      req.flash('error', err.errors[Object.keys(err.errors)[0]].message);
      res.status(400).render('account', { messages: req.flash(), agent: req.agent, errors: {} });
    });
  }).catch(err => {
    if (req.headers['accept'] === 'application/json') {
      return res.status(400).json({ message: err.errors[Object.keys(err.errors)[0]].message });
    }
    req.flash('error', err.errors[Object.keys(err.errors)[0]].message);
    res.status(400).render('account', { messages: req.flash(), agent: req.agent, errors: {} });
  });
});


module.exports = router;
