/**
 * Module dependencies.
 */
const express = require('express');
const http = require('http');
const _ = require('lodash');
const session = require('express-session');
const bodyParser = require('body-parser');
const logger = require('morgan');
const chalk = require('chalk');
const errorHandler = require('errorhandler');
const lusca = require('lusca');
const dotenv = require('dotenv');
const MongoStore = require('connect-mongo')(session);
const flash = require('express-flash');
const path = require('path');
const mongoose = require('mongoose');
const passport = require('passport');
const expressValidator = require('express-validator');
const schedule = require('node-schedule');
const multer = require('multer');
const { chatSocket } = require('./controllers/chat');

/** Routers */
const { accountRouter } = require('./routes/account');
const homeRouter = require('./routes/home');
const newsfeedRouter = require('./routes/newsfeed');
const commentNudgeRouter = require('./routes/commentNudge');
const postRouter = require('./routes/post');
const resetRouter = require('./routes/reset');
const userRouter = require('./routes/user');

const m_options = multer.diskStorage({
  destination: path.join(__dirname, 'uploads'),
  filename(req, file, cb) {
    const prefix = req.user.id + Math.random().toString(36).slice(2, 10);
    cb(null, prefix + file.originalname.replace(/[^A-Z0-9]+/gi, '_'));
  },
});

/**
 * Load environment variables from .env file, where API keys and passwords are configured.
 */
dotenv.config({ path: '.env' });

/**
 * Controllers (route handlers).
 */
const userController = require('./controllers/user');

/**
 * Create Express server.
 */
const app = express();
server = http.createServer(app);

/**
 * Connect to MongoDB.
 */
mongoose.Promise = global.Promise;

mongoose.connect(process.env.MONGODB_URI || process.env.MONGOLAB_URI, {
  useNewUrlParser: true,
});

mongoose.connection.on('error', (err) => {
  console.error(err);
  console.log(
    '%s MongoDB connection error. Please make sure MongoDB is running.'
  );
  process.exit();
});

/*
 ** CRON JOBS
 ** Mailing Users
 */
const rule = new schedule.RecurrenceRule();
rule.hour = 4;
rule.minute = 55;

var j = schedule.scheduleJob(rule, () => {
  console.log('@@@@@@######@@@@@@@@#########@@@@@@@@@@@@########');
  console.log('@@@@@@######@@@@@@@@Sending Mail to All ACTIVE USERS!!!!!');
  console.log('@@@@@@######@@@@@@@@#########@@@@@@@@@@@@########');
  userController.mailAllActiveUsers();
});

/** **
 **CRON JOBS
 **Check if users are still active 12 and 20
 */
const rule1 = new schedule.RecurrenceRule();
rule1.hour = 4;
rule1.minute = 30;

var j = schedule.scheduleJob(rule1, () => {
  console.log('@@@@@@######@@@@@@@@#########@@@@@@@@@@@@########');
  console.log('@@@@@@######@@@@@@@@Checking if Users are active!!!!!');
  console.log('@@@@@@######@@@@@@@@#########@@@@@@@@@@@@########');
  userController.stillActive();
});

/** **
 **CRON JOBS
 **Check if users are still active 12 and 20
 */
const rule2 = new schedule.RecurrenceRule();
rule2.hour = 12;
rule2.minute = 30;

const j2 = schedule.scheduleJob(rule2, () => {
  console.log('@@@@@@######@@@@@@@@#########@@@@@@@@@@@@########');
  console.log(
    '@@@@@@######@@@@@@@@2222 Checking if Users are active 2222!!!!!'
  );
  console.log('@@@@@@######@@@@@@@@#########@@@@@@@@@@@@########');
  userController.stillActive();
});

/** **
 **CRON JOBS
 **Check if users are still active 12 and 20
 */
const rule3 = new schedule.RecurrenceRule();
rule3.hour = 20;
rule3.minute = 30;

const j3 = schedule.scheduleJob(rule3, () => {
  console.log('@@@@@@######@@@@@@@@#########@@@@@@@@@@@@########');
  console.log(
    '@@@@@@######@@@@@@@@3333 Checking if Users are active 3333!!!!!'
  );
  console.log('@@@@@@######@@@@@@@@#########@@@@@@@@@@@@########');
  userController.stillActive();
});

/**
 * Express configuration.
 */
const PORT = 3000 || process.env.PORT;
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(expressValidator());
app.use(
  session({
    resave: true,
    saveUninitialized: true,
    rolling: false,
    cookie: {
      path: '/',
      httpOnly: true,
      secure: false,
      maxAge: 7200000,
    },
    secret: process.env.SESSION_SECRET,
    store: new MongoStore({
      url: process.env.MONGODB_URI || process.env.MONGOLAB_URI,
      autoReconnect: true,
      clear_interval: 3600,
    }),
  })
);
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

app.use((req, res, next) => {
  if (
    req.path === '/api/upload'
    || req.path === '/post/new'
    || req.path === '/account/profile'
    || req.path === '/account/signup_info_post'
  ) {
    console.log('Not checking CSRF - out path now');
    next();
  } else {
    lusca.csrf()(req, res, next);
  }
});

app.use(lusca.xssProtection(true));

app.use((req, res, next) => {
  res.locals.user = req.user;
  next();
});

app.use((req, res, next) => {
  // After successful login, redirect back to the intended page
  if (
    !req.user
    && req.path !== '/login'
    && req.path !== '/signup'
    && req.path !== '/bell'
    && !req.path.match(/^\/auth/)
    && !req.path.match(/\./)
  ) {
    console.log('@@@@@path is now');
    console.log(req.path);
    req.session.returnTo = req.path;
  } else if (req.user && req.path == '/account') {
    console.log('!!!!!!!path is now');
    console.log(req.path);
    req.session.returnTo = req.path;
  }
  next();
});

app.use(
  '/public',
  express.static(path.join(__dirname, 'public'), { maxAge: 31557600000 })
);
app.use(
  '/semantic',
  express.static(path.join(__dirname, 'semantic'), { maxAge: 31557600000 })
);
app.use(
  express.static(path.join(__dirname, 'uploads'), { maxAge: 31557600000 })
);
app.use(
  '/post_pictures',
  express.static(path.join(__dirname, 'post_pictures'), { maxAge: 31557600000 })
);
app.use(
  '/profile_pictures',
  express.static(path.join(__dirname, 'profile_pictures'), {
    maxAge: 31557600000,
  })
);


/**
 * Error Handler.
 */
app.use(errorHandler());


/**
 * Primary app routes.
 */
app.use('/', homeRouter);
app.use('/newsfeed', newsfeedRouter);
app.use('/account', accountRouter);
app.use('/commentNudge', commentNudgeRouter);
app.use('/post', postRouter);
app.use('/reset', resetRouter);
app.use('/user', userRouter);

// catch 404 and forward to error handler
app.use((req, res, next) => {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use((err, req, res, next) => {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

/**
 * Socket.io Implementation
 */
console.log('CHAT SERVER ACTIVATED', server);
chatSocket(server);

/**
 * Start Express server.
 */

server.listen(PORT, () => {
  console.log(
    '%s App is running at http://localhost:%d in %s mode',
    chalk.green("✓"),
    PORT,
    app.get('env')
  );
  console.log('  Press CTRL-C to stop\n');
});
