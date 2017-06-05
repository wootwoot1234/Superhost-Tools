var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var Account = new Schema({
    userID: {type: mongoose.Schema.Types.ObjectId, ref: 'user'},
    type: {type: String, default: "Airbnb"}, // Airbnb, VRBO....
    airbnbUsername: String,
    airbnbPassword: String,
    airbnbUserID: String,
    airbnbAccessToken: String,
    lastLoginAttemptSuccessful: Boolean,
});

module.exports = mongoose.model('Account', Account);
