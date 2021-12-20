require('dotenv-flow').config();
const appName = require('./package.json').name;
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
const accountRouter = require('./routes/account');
const transactionRouter = require('./routes/transaction');
const authRouter = require('./routes/auth');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

/**
 * Flash messages
 */
const flash = require('connect-flash');
app.use(flash());

/**
 * Sessions
 */
const session = require('express-session');
const MongoStore = require('connect-mongo');
const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/models/config.json')[env];

const sessionConfig = {
  name: appName,
  secret: 'remember to set this to something configurable',
  resave: false,
  cookie: {
    maxAge: 1000 * 60 * 60,
  },
  saveUninitialized: true,
  store: MongoStore.create({ mongoUrl: 'mongodb://' + config.host + ':27017/' + config.database })
};

/**
 * 2021-10-6
 *
 * This may not be relevant. The `httpOnly` in particular seems to mess up
 * the client Javascript calls.
 */
//if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging') {
//  sessionConfig.cookie.httpOnly = false;
//  sessionConfig.cookie.sameSite = 'none';
//  sessionConfig.cookie.secure = true;
//}

app.use(session(sessionConfig));

/**
 * Check for existing session and attach `req.account` if it exists
 */
const models = require('./models');
app.use((req, res, next) => {
  if (!req.session.account_id) {
    return next();
  }
  models.Account.findById(req.session.account_id).then(account => {
    req.account = account;
    next();
  }).catch(err => {
    next(err);
  });
});

/**
 * For PUT/PATCH/DELETE
 */
const methodOverride = require('method-override');
app.use(methodOverride('_method'))

/**
 * Routes
 */
app.use('/', indexRouter);
app.use('/auth', authRouter);
app.use('/account', accountRouter);
app.use('/transaction', transactionRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

/**
 * 2021-10-6
 *
 * Note to self: this is different from how I normally do things. Synpress
 * falls apart if the server is running on anything but port 3000. Normally
 * I would set 3000 to production and use 3001 for testing. It is opposite
 * here.
 */
let port = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'tor' ? 3001 : 3000;
app.listen(port, '0.0.0.0', () => {
  console.log('nami-offering-collector listening on ' + port + '!');
});

module.exports = app;
