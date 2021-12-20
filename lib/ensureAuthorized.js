module.exports = function(req, res, next) {
  if (!req.account) {
    if (req.headers['accept'] === 'application/json') {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    req.flash({ error: 'Unauthorized' });
    return res.redirect('/');
  }
  next();
};
