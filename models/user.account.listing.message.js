var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var Message = new Schema({
    listingID: {type: mongoose.Schema.Types.ObjectId, ref: 'listing'},
    messageRuleID: {type: mongoose.Schema.Types.ObjectId, ref: 'MessageRule'},
    airbnbConfirmationCode: String,
    disable: {type: Boolean, default:false},
    message: String,
    sentDate: Date,
    sentEvent: String,
    sentDateFormated: String,
    sentTimeFormated: String,
    review: String,
});

module.exports = mongoose.model('Message', Message);