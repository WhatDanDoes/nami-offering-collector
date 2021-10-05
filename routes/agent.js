const express = require('express');
const router = express.Router();
const ensureAuthorized = require('../lib/ensureAuthorized');
const models = require('../models');

/**
 * PUT /agent
 */
router.put('/', ensureAuthorized, (req, res, next) =>  {

  // Make sure no one tries modifying forbidden properties
  for (let prop in req.body) {
    if (['publicAddress', 'nonce'].includes(prop)) {
      if (req.headers['accept'] === 'application/json') {
        return res.status(403).json({ message: 'Forbidden' });
      }
      return res.status(403).render('app', { messages: { error: 'Unauthorized' }, agent: req.agent });
    }
    req.agent[prop] = req.body[prop];
  }

  req.agent.save({ validateBeforeSave: false }).then(agent => {
    if (req.headers['accept'] === 'application/json') {
      return res.status(201).json({ message: 'Info updated' });
    }
    req.flash({ success: 'Info updated' });
    res.redirect('/');
  }).catch(err => {
    res.status(500).json(err);
  });
});

module.exports = router;
