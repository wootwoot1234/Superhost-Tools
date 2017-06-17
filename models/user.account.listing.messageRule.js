var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var MessageRule = new Schema({
    listingID: {type: mongoose.Schema.Types.ObjectId, ref: 'listing', required: true},
    message: String,
    title: String,
    event: String,
    days: Number,
    time: Number,
    minNights: {type: Number, default: 1},
    lastMinuteMessage: {type: String, default: ""},
    lastMinuteMessageEnabled: {type: Boolean, default: false},
    reviewEnabled: {type: Boolean, default: false},
    reviewMessage: String,
    sendMessageAfterLeavingReview: Boolean,
});

module.exports = mongoose.model('MessageRule', MessageRule);
