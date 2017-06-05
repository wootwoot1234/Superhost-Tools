var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var PriceRule = new Schema({
    listingID: {type: mongoose.Schema.Types.ObjectId, ref: 'listing'},    title: String,
    scale: String, //(Fixed Value, Gradual Value, Fixed Percentage, Gradual Percentage)
    amount: Number,
    event: String, // floatingPeriod, orphanPeriod, specificDates, weekends, weekdays
    floatingPeriodStartDay: Number,
    floatingPeriodLength: Number,
    orphanPeriodLength: Number,
    specificDatesStartDate: Date,
    specificDatesEndDate: Date,
});

module.exports = mongoose.model('PriceRule', PriceRule);
