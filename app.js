// dependencies
var path = require('path');
var express = require('express');
var http = require('http');
var mongoose = require('mongoose');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var bodyParser = require('body-parser');
var MongoStore = require('connect-mongo')(express);
var timeout = express.timeout;

// main config
var app = express();
app.set('port', process.env.PORT || 1337);
app.set('views', __dirname + '/views');
//app.set('view engine', 'jade');
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');
//app.set('view options', { layout: false });
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing       application/x-www-form-urlencoded
app.use(express.logger());
//app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.cookieParser('your secret here'));
//app.use(express.session());
app.use(express.session({
    secret: 'thisisalongstring',
    maxAge: new Date(Date.now() + 3600000),
    store: new MongoStore({mongooseConnection:mongoose.connection})
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

app.configure('development', function(){
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
    app.use(express.errorHandler());
});

// passport config
var User = require('./models/user');
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// mongoose
var uristring = process.env.MONGODB_URI || 'mongodb://localhost/passport_local_mongoose';
mongoose.connect(uristring);


// routes
require('./routes')(app);

app.listen(app.get('port'), function(){
    console.log(("Express server listening on port " + app.get('port')));
    if(process.env.NODE_ENV != "production") {
        console.log("NOT RUNNING IN PRODUCTION MODE, APP WILL NOT SEND MESSAGES OR SET PRICES");
    }
});
