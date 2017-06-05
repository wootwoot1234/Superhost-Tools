var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var Reservation = new Schema({
    accountID: {type: mongoose.Schema.Types.ObjectId, ref: 'account'},
    airbnbThreadID: String,
    airbnbConfirmationCode: String,
    airbnbListingID: String,
    airbnbStartDate: String,
    airbnbNights: Number,
    airbnbFirstName: String,
    airbnbStatus: String,
    airbnbThumbnailUrl: String,
});

module.exports = mongoose.model('Reservation', Reservation);
