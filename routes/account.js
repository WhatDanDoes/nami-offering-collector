const express = require('express');
const router = express.Router();
const ethers = require('ethers');
const models = require('../models');
const ensureAuthorized = require('../lib/ensureAuthorized');

/**
 * GET /account
 */
router.get('/:publicAddress?', ensureAuthorized, (req, res, next) => {

  if (req.params.publicAddress) {

    if (!req.account.isSuper() && req.params.publicAddress !== req.account.publicAddress) {

      if (req.headers['accept'] === 'application/json') {
        return res.status(403).json({ message: 'Forbidden' });
      }
      req.flash('error', 'Forbidden');
      return res.render('account', { messages: req.flash(), account: req.account, errors: {}, superView: req.account.isSuper() });
    }

    models.Account.findOne({ publicAddress: req.params.publicAddress }).then(account => {
      if (req.headers['accept'] === 'application/json') {
        return res.status(200).json(account);
      }
      res.render('account', { messages: req.flash(), account: account, errors: {}, superView: req.account.isSuper() });
    }).catch(err => {
      if (req.headers['accept'] === 'application/json') {
        return res.status(400).json({ message: err.errors[Object.keys(err.errors)[0]].message });
      }
      req.flash('error', 'Submission failed. Check your form.');
      res.status(400).render('account', { messages: req.flash(), errors: err.errors, account: { ...updates, publicAddress: req.params.publicAddress }, superView: req.account.isSuper() });
    });
  }
  else {
    if (req.account.isSuper()) {
      models.Account.find().sort({ updatedAt: -1 }).then(results => {
        accounts = results.filter(a => a.publicAddress !== req.account.publicAddress);
        if (req.headers['accept'] === 'application/json') {
          return res.status(200).json(accounts);
        }
        res.render('accountListing', { messages: req.flash(), accounts: accounts, errors: {} });
      }).catch(err => {
        if (req.headers['accept'] === 'application/json') {
          return res.status(400).json({ message: err.errors[Object.keys(err.errors)[0]].message });
        }
        req.flash('error', 'Submission failed. Check your form.');
        res.status(400).render('account', { messages: req.flash(), errors: err.errors, account: { ...updates, publicAddress: req.account.publicAddress }, superView: req.account.isSuper() });
      });
    }
    else {
      if (req.headers['accept'] === 'application/json') {
        return res.status(200).json(req.account);
      }
      res.render('account', { messages: req.flash(), account: req.account, errors: {}, superView: req.account.isSuper() });
    }
  }
});

/**
 * PUT /account
 */
router.put('/:publicAddress?', ensureAuthorized, (req, res, next) =>  {
  // Make sure no one tries modifying forbidden properties
  const updates = {};
  for (let prop in req.body) {
    if (['publicAddress', 'nonce'].includes(prop)) {
      if (req.headers['accept'] === 'application/json') {
        return res.status(403).json({ message: 'Forbidden' });
      }
      return res.status(403).render('account', { messages: { error: 'Unauthorized' }, account: req.account, errors: {}, superView: req.account.isSuper() });
    }
    updates[prop] = req.body[prop];
  }


  if (req.params.publicAddress) {

    if (!req.account.isSuper() && req.params.publicAddress !== req.account.publicAddress) {

      if (req.headers['accept'] === 'application/json') {
        return res.status(403).json({ message: 'Forbidden' });
      }
      req.flash('error', 'Forbidden');
      return res.redirect('/account');
    }

    models.Account.findOneAndUpdate({ publicAddress: req.params.publicAddress }, updates, { runValidators: true }).then(obj => {
      if (req.headers['accept'] === 'application/json') {
        return res.status(201).json({ message: 'Info updated' });
      }
      req.flash('success', 'Info updated');
      res.redirect(`/account/${req.params.publicAddress}`);
    }).catch(err => {
      if (req.headers['accept'] === 'application/json') {
        return res.status(400).json({ message: err.errors[Object.keys(err.errors)[0]].message });
      }
      req.flash('error', 'Submission failed. Check your form.');
      res.status(400).render('account', { messages: req.flash(), errors: err.errors, account: { ...updates, publicAddress: req.params.publicAddress }, superView: req.account.isSuper() });
    });
  }
  else {
    models.Account.findOneAndUpdate({ publicAddress: req.account.publicAddress }, updates, { runValidators: true }).then(obj => {
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
      res.status(400).render('account', { messages: req.flash(), errors: err.errors, account: { ...updates, publicAddress: req.account.publicAddress }, superView: req.account.isSuper() });
    });
  }
});

module.exports = router;
