const express = require('express');
const router = express.Router();

/**
 * Landing page
 */
router.get('/', (req, res, next) => {
  if (req.agent) {
    res.render('app', { messages: req.flash(), agent: req.agent });
  }
  else {
    res.render('landing', { messages: req.flash() });
  }
});

module.exports = router;
