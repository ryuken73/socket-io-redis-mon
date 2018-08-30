var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var os = require('os');

// determine listening port
global.port = process.argv[2] ? process.argv[2] : 3000;
global.hostname = process.argv[3] ? process.argv[3] : os.hostname();

var appconfig = require('./appconfig.json');
global.appconfig = appconfig;


// setup logging
const options = {
  notification : appconfig.notification,
  logLevel : appconfig.logLevel,
  logFile : appconfig.logFile
}
global.logger = require('./lib/logger')(options);

// router define
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');


// express security guide
var helmet = require('helmet');
var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

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

module.exports = app;
