var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    passportLocalMongoose = require('passport-local-mongoose'),
    bcrypt = require('bcrypt-nodejs');

var User = new Schema({
    username: String,
    password: String,
    created: {type: Date, default:Date.now},
});


User.plugin(passportLocalMongoose);

module.exports = mongoose.model('User', User);
