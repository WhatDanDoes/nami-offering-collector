const express = require('express');
const router = express.Router();
const ethers = require('ethers');
const models = require('../models');
const ensureAuthorized = require('../lib/ensureAuthorized');

/**
 * GET /transaction
 */
router.get('/', ensureAuthorized, (req, res, next) => {
  let searchOptions = { account: req.account };
  let selectOptions = { "_id": 0, "__v": 0, "account": 0 };

  if (req.account.isSuper()) {
    searchOptions = {};
    selectOptions = { "_id": 0, "hash": 1, "value": 1, "createdAt": 1 };
  }
  models.Transaction.find(searchOptions).populate('account', '-_id publicAddress name').select(selectOptions).sort({ createdAt: -1 }).then(txs => {
    if (req.headers['accept'] === 'application/json') {
      return res.status(200).json(txs);
    }
    res.render('transaction', { messages: req.flash(), account: req.account, transactions: txs });
  }).catch(err => {
    if (req.headers['accept'] === 'application/json') {
      return res.status(400).json({ message: err.errors[Object.keys(err.errors)[0]].message });
    }
    req.flash('error', err.errors[Object.keys(err.errors)[0]].message);
    res.status(400).render('transaction', { messages: req.flash(), account: req.account, transactions: [] });
  });
});

/**
 * POST /transaction
 */
router.post('/', ensureAuthorized, (req, res, next) =>  {

  if (req.account.isSuper()) {
    const msg = 'You didn\'t seriously send ADA to yourself, did you?';
    if (req.headers['accept'] === 'application/json') {
      return res.status(400).json({ message: msg });
    }
    req.flash('error', msg);
    return res.status(400).render('transaction', { messages: req.flash(), account: req.account, errors: {}, transactions: [] });
  }

  if (!req.body.value) {
    if (req.headers['accept'] === 'application/json') {
      return res.status(400).json({ message: 'Value is required' });
    }
    req.flash('error', 'Value is required');
    return res.status(400).render('account', { messages: req.flash(), account: req.account, errors: {}, superView: req.account.isSuper() });
  }

  models.Transaction.create({ hash: req.body.hash, value: ethers.BigNumber.from(req.body.value), account: req.account }).then(tx => {
    // Update updatedAt on the account so that root can see recent account activity
    models.Account.findOneAndUpdate({ publicAddress: req.account.publicAddress }, { updatedAt: Date.now() }, { runValidators: true }).then(obj => {
      const msg = 'Transaction recorded. Update your account details to receive a tax receipt.'
      if (req.headers['accept'] === 'application/json') {
        return res.status(201).json({ message: msg });
      }
      req.flash('success', msg);
      res.redirect('/transaction');
    }).catch(err => {
      if (req.headers['accept'] === 'application/json') {
        return res.status(400).json({ message: err.errors[Object.keys(err.errors)[0]].message });
      }
      req.flash('error', err.errors[Object.keys(err.errors)[0]].message);
      res.status(400).render('account', { messages: req.flash(), account: req.account, errors: {}, superView: req.account.isSuper() });
    });
  }).catch(err => {
    if (req.headers['accept'] === 'application/json') {
      return res.status(400).json({ message: err.errors[Object.keys(err.errors)[0]].message });
    }
    req.flash('error', err.errors[Object.keys(err.errors)[0]].message);
    res.status(400).render('account', { messages: req.flash(), account: req.account, errors: {}, superView: req.account.isSuper() });
  });
});


module.exports = router;
