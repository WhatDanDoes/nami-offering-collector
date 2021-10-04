require('dotenv-flow').config();
const appName = require('./package.json').name;
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
const agentRouter = require('./routes/agent');
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

if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging') {
  sessionConfig.cookie.httpOnly = false;
  sessionConfig.cookie.sameSite = 'none';
  sessionConfig.cookie.secure = true;
}

app.use(session(sessionConfig));

/**
 * Check for existing session and attach `req.agent` if it exists
 */
const models = require('./models');
app.use((req, res, next) => {
  if (!req.session.agent_id) {
    return next();
  }
  models.Agent.findById(req.session.agent_id).then(agent => {
    req.agent = agent;
    next();
  }).catch(err => {
    next(err);
  });
});

/**
 * Routes
 */
app.use('/', indexRouter);
app.use('/auth', authRouter);
app.use('/agent', agentRouter);

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

// How badly do I need this to run on port 3000 for testing? Normally it defaults to 3001 for testing
let port = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'tor' ? 3000 : 3000; //:3001;
app.listen(port, '0.0.0.0', () => {
  console.log('metamask-offering-collector listening on ' + port + '!');
});

module.exports = app;
