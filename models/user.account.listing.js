var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var Listing = new Schema({
    accountID: {type: mongoose.Schema.Types.ObjectId, ref: 'account', required: true},
    airbnbName: String,
    airbnbCheckInTime: Number,
    airbnbCheckOutTime: Number,
    airbnbListingID: String,
    airbnbTimeZone: String,
    nickname: String,
    pricesUpdatedLast: Date,
    pricingEnabled: {type: Boolean, default: false},
    minPrice: Number,
});

module.exports = mongoose.model('Listing', Listing);
