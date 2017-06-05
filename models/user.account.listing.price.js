var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var Price = new Schema({
    listingID: {type: mongoose.Schema.Types.ObjectId, ref: 'listing'},
    //priceRuleID: {type: mongoose.Schema.Types.ObjectId, ref: 'PriceRule'},
    created: {type: Date, default:Date.now},
    airbnbDate: String,
    airbnbNativePrice: Number,
    airbnbNativeSuggestedPrice: Number,
    airbnbNativeSuggestedPricePercentage: Number,
    airbnbNativeSuggestedPriceLevels: [{type: Number}],
    airbnbAvailable: Boolean,
});

module.exports = mongoose.model('Price', Price);
