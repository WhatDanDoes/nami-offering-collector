const express = require('express');
const router = express.Router();
const ethers = require('ethers');
const models = require('../models');
const ensureAuthorized = require('../lib/ensureAuthorized');

/**
 * GET /transaction
 */
router.get('/', ensureAuthorized, (req, res, next) => {
  models.Transaction.find({ account: req.agent }).select({ "_id": 0, "__v": 0, "account": 0 }).then(txs => {
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
  if (!req.body.value) {
    if (req.headers['accept'] === 'application/json') {
      return res.status(400).json({ message: 'Value is required' });
    }
    req.flash('error', 'Value is required');
    return res.status(400).render('account', { messages: req.flash(), agent: req.agent, errors: {} });
  }
  models.Transaction.create({ hash: req.body.hash, value: ethers.BigNumber.from(req.body.value), account: req.agent }).then(tx => {
    if (req.headers['accept'] === 'application/json') {
      return res.status(201).json({ message: 'Transaction recorded' });
    }
    req.flash('success', 'Transaction recorded');
    res.redirect('/account');
  }).catch(err => {
    if (req.headers['accept'] === 'application/json') {
      return res.status(400).json({ message: err.errors[Object.keys(err.errors)[0]].message });
    }
    req.flash('error', err.errors[Object.keys(err.errors)[0]].message);
    res.status(400).render('account', { messages: req.flash(), agent: req.agent, errors: {} });
  });
});


module.exports = router;
