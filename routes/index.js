const express = require('express');
const router = express.Router();

/**
 * Landing page
 */
router.get('/', (req, res, next) => {
  if (req.account) {
    if (req.account.isSuper()) {
      req.flash('info', 'I cannot allow you to send ETH to your own wallet, Dave');
      return res.redirect('/transaction');
    }
    res.render('transfer', { messages: req.flash(), account: req.account });
  }
  else {
    res.render('landing', { messages: req.flash() });
  }
});

module.exports = router;
