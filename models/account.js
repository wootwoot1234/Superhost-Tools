var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    passportLocalMongoose = require('passport-local-mongoose'),
    bcrypt = require('bcrypt-nodejs');

var Account = new Schema({
    username: String,
    password: String,
    created: {type: Date, default:Date.now},
    accounts: [
        {
            type: {type: String, default: "Airbnb"}, // Airbnb, VRBO....
            airbnbUsername: String,
            airbnbPassword: String,
            airbnbUserID: String,
            airbnbAccessToken: String,
            lastLoginAttemptSuccessful: {type: Boolean, default: false},
            listings: [
                {
                    id: String,
                    airbnbName: String,
                    airbnbCheckInTime: Number,
                    airbnbCheckOutTime: Number,
                    airbnbListingID: String,
                    airbnbTimeZone: String,
                    nickname: String,
                    pricesUpdatedLast: Date,
                    pricingEnabled: {type: Boolean, default: false},
                    minPrice: Number,
                    rules: {
                        messages: [
                            {
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
                            }
                        ], // messages
                        pricing: [
                            {
                                title: String,
                                scale: String, //(Fixed Value, Gradual Value, Fixed Percentage, Gradual Percentage)
                                amount: Number,
                                event: String, // floatingPeriod, orphanPeriod, specificDates, weekends, weekdays
                                floatingPeriodStartDay: Number,
                                floatingPeriodLength: Number,
                                orphanPeriodLength: Number,
                                specificDatesStartDate: Date,
                                specificDatesEndDate: Date,
                            }
                        ] // pricing
                    }, // rules
                    messages: [
                        {
                            messageRuleID: String,
                            airbnbConfirmationCode: String,
                            disable: {type: Boolean, default:false},
                            message: String,
                            sentDate: Date,
                            sentEvent: String,
                            sentDateFormated: String,
                            sentTimeFormated: String,
                            review: String,
                        }
                    ], // messages
                    prices: [
                        {
                            created: {type: Date, default:Date.now},
                            airbnbDate: String,
                            airbnbNativePrice: Number,
                            airbnbNativeSuggestedPrice: Number,
                            airbnbNativeSuggestedPricePercentage: Number,
                            airbnbNativeSuggestedPriceLevels: [{type: Number}],
                            airbnbAvailable: Boolean,
                        }
                    ] // prices
                }
            ], // listings
            reservations: [
                {
                    airbnbThreadID: String,
                    airbnbConfirmationCode: String,
                    airbnbListingID: String,
                    airbnbStartDate: String,
                    airbnbNights: Number,
                    airbnbFirstName: String,
                    airbnbStatus: String,
                    airbnbThumbnailUrl: String,
                }
            ] // reservations
        } // accounts
    ]
});


Account.plugin(passportLocalMongoose);

module.exports = mongoose.model('Account', Account);