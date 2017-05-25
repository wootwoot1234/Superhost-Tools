var passport = require('passport');
var Account = require('./models/account');
var querystring = require('querystring');
var https = require('https');
var moment = require('moment-timezone');

var mailer = require('./email/email');

var nodemailer = require('nodemailer');

// Generic error handler used by all endpoints.
function handleError(res, reason, message, code) {
    console.log("ERROR: " + reason);
    console.log(message);
    return res.status(code || 500).json({"error": message});
}

module.exports = function (app) {

    app.get('/', function (req, res) {
            res.render('index', { user : req.user });
    });

    app.get('/admin', function (req, res) {
        if(!req.user) {
            res.redirect('/#!/login');
        } else {
            res.render('admin', { user : req.user });
        }
    });

    app.post('/register', function(req, res) {
        console.log("/register");
        Account.register(new Account({ username : req.body.username }), req.body.password, function(error, doc) {
            if (error) {
                return handleError(res, "That email already exists. Try logging in instead.", {error_code: 400, error_message: "That email already exists. Try logging in instead."}, 400);
            } else {
                passport.authenticate('local')(req, res, function () {
                    var to = req.user.username;
                    var subject = "Welcome to Superhost Tools";
                    var text = "Thanks for joining Superhost Tools.  If you haven't already, the next step is to login and link your Airbnb account and begin automatically sending messages to your guests."
                    sendEmail(to, subject, text);
                    return res.redirect('/admin/#/');
                });
            }
        });
    });

    app.post('/login', function(req, res, next) {
        console.log("/login");
        /* look at the 2nd parameter to the below call */
        passport.authenticate('local', function(error, user, info) {
            if (error) {
                return next(error);
            }
            if (!user) {
                return handleError(res, "That email and password combination is invalid.  Try something else.", {error_code: 400, error_message: "That email and password combination is invalid.  Try something else."}, 400);
            }
            req.logIn(user, function(error) {
                if (error) {
                    return next(error);
                }
                return res.redirect('/admin/#/');
            });
        })(req, res, next);
    });

    app.get('/logout', function(req, res) {
        console.log("/logout");
        req.logout();
        res.redirect('/');
    });

    app.get("/getAccounts", function(req, res) {
        console.log("/getAccounts");
        if(!req.user) {
            handleError(res, "User not logged in", "/getAccounts User not logged in", 403);
        } else {
            res.status(200).json(req.user.accounts);
        }
    });

    app.post('/addAccount', function(req, res) {
        console.log("/addAccount");
        if(!req.user) {
            handleError(res, "User not logged in", "/addAccount User not logged in", 403);
        } else {
            var airbnbUsername = req.body.airbnbUsername;
            var airbnbPassword = req.body.airbnbPassword;
            if(airbnbUsername && airbnbPassword) {
                var account = req.user.accounts.filter(function(account) {
                    if(account.airbnbUsername == airbnbUsername) {
                        return account;
                    }
                });
                if(account.length === 0) {
                    Account.update(
                        // query
                        {
                            "username" : req.user.username
                        },
                        // update
                        {
                            $push: {
                                "accounts" : {
                                    "airbnbPassword": airbnbPassword,
                                    "airbnbUsername": airbnbUsername
                                }
                            }
                        },
                        function(error, doc) {
                            if (error) {
                                handleError(res, error.message, "/addAccount Failed add Airbnb username and password");
                            } else {
                                initAirbnbAccount(req, res, airbnbUsername);
                            }
                        }
                    );
                } else {
                    Account.update(
                        // query
                        {
                            "username" : req.user.username,
                            "accounts.airbnbUsername" : airbnbUsername
                        },
                        // update
                        {
                            $set: {"accounts.$.airbnbPassword": airbnbPassword}
                        },
                        function(error, doc) {
                            if (error) {
                                handleError(res, error.message, "/addAccount Failed update Airbnb password");
                            } else {
                                initAirbnbAccount(req, res, airbnbUsername);
                            }
                        }
                    );
                }
            } else {
                handleError(res, "airbnbUsername and/or airbnbPassword not supplied", {error_code: 400, error_message: "airbnbUsername and/or airbnbPassword not supplied"}, 400);
            }
        }
    });

    app.post('/deleteAccount', function(req, res){
        console.log("/deleteAccount");
        if(!req.user) {
            handleError(res, "User not logged in", "/deleteAccount User not logged in", 403);
        } else {
            var airbnbUsername = req.body.airbnbUsername;
            if(airbnbUsername) {
                Account.findOne(
                    // query
                    {
                        "username" : req.user.username,
                        "accounts.airbnbUsername" : airbnbUsername
                    },
                    function(error, doc) {
                        if (error) {
                            handleError(res, error.message, "/deleteAccount Failed to find Airbnb username");
                        } else {
                            doc.accounts.forEach(function(account, accountIndex) {
                                if(account.airbnbUsername == airbnbUsername) {
                                    doc.accounts.splice(accountIndex, 1);
                                }
                            });
                            doc.save(function(error, updatedDoc){
                                res.status(200).json("success");
                            });
                        }
                    }
                );
            } else {
                handleError(res, "airbnbUsername not supplied", "/deleteAccount airbnbUsername not supplied", 400);
            }
        }
    });

    function initAirbnbAccount(req, res, airbnbUsername) {
        console.log("initAirbnbAccount()");
        Account.findOne(
            // query
            {
                "username" : req.user.username,
                "accounts.airbnbUsername" : airbnbUsername
            },
            function(error, doc) {
                doc.accounts.forEach(async function(account, accountIndex) {
                    if(account.airbnbUsername == airbnbUsername) {
                        var airbnbUserID;
                        try {
                            airbnbUserID = await downloadAirbnbUserID(account);
                        } catch(error) {
                            handleError(res, error.message, "initAirbnbAccount(): downloadAirbnbUserID()", 400);
                        }
                        Account.update(
                            // query
                            {
                                "username" : req.user.username,
                                "accounts.airbnbUsername" : airbnbUsername
                            },
                            // update
                            {
                                $set: {"accounts.$.airbnbUserID": airbnbUserID}
                            },
                            async function(error, doc) {
                                console.log("updated airbnb user id: " + airbnbUserID);
                                if (error) {
                                    handleError(res, error.message, "Failed update Airbnb user ID");
                                } else {
                                    try {
                                        await downloadAirbnbListings(req.user, airbnbUsername);
                                    } catch (error) {
                                        handleError(res, error.message, "initAirbnbAccount(): downloadAirbnbListings()", 400);
                                    }
                                    try {
                                        await getNewReservations(req.user, account, true);
                                    } catch (error) {
                                        handleError(res, error.message, "initAirbnbAccount(): getNewReservations()", 400);
                                    }
                                }
                            }
                        );
                    }
                });
            }
        );
    }

    app.post('/addMessageRule', function(req, res){
        console.log("/addMessageRule");
        if(!req.user) {
            handleError(res, "User not logged in", "User not logged in", 403);
        } else {
            var days = req.body.days;
            var time = req.body.time;
            var event = req.body.event;
            var minNights = req.body.minNights;
            var title = req.body.title;
            var message = req.body.message;
            var lastMinuteMessage = req.body.lastMinuteMessage;
            var lastMinuteMessageEnabled = req.body.lastMinuteMessageEnabled;
            var reviewEnabled = req.body.reviewEnabled;
            var reviewMessage = req.body.reviewMessage;
            var sendMessageAfterLeavingReview = req.body.sendMessageAfterLeavingReview;
            var airbnbListingID = req.body.airbnbListingID;
            var _id = req.body._id;
            Account.findOne(
                // query
                {
                    "username" : req.user.username,
                    "accounts.listings.airbnbListingID" : airbnbListingID
                },
                function(error, doc) {
                    if (error) {
                        handleError(res, error.message, "Failed to find Airbnb listing");
                    } else {
                        doc.accounts.forEach(function(account, accountIndex) {
                            account.listings.forEach(function(listing, listingIndex) {
                                if(listing.airbnbListingID ==  airbnbListingID) {
                                    // Check if it's a new rule or we're updating a rule
                                    if(_id) {
                                        listing.rules.messages.forEach(function(messageRule, messageRuleIndex) {
                                            if(_id == messageRule._id) {
                                                doc.accounts[accountIndex].listings[listingIndex].rules.messages[messageRuleIndex] = {
                                                    _id,
                                                    title,
                                                    days,
                                                    time,
                                                    event,
                                                    message,
                                                    minNights,
                                                    lastMinuteMessageEnabled,
                                                    lastMinuteMessage,
                                                    reviewEnabled,
                                                    reviewMessage,
                                                    sendMessageAfterLeavingReview,
                                                };
                                            }
                                        });
                                    } else {
                                        doc.accounts[accountIndex].listings[listingIndex].rules.messages.push({
                                            title,
                                            days,
                                            time,
                                            event,
                                            message,
                                            minNights,
                                            lastMinuteMessageEnabled,
                                            lastMinuteMessage,
                                            reviewEnabled,
                                            reviewMessage,
                                            sendMessageAfterLeavingReview,
                                        });
                                    }
                                }
                            });
                        });
                        doc.save(function(error, updatedDoc){
                            res.status(200).json("success");
                        });
                    }
                }
            );
        }
    });

    app.post('/deleteMessageRule', function(req, res){
        console.log("/deleteMessageRule");
        if(!req.user) {
            handleError(res, "User not logged in", "User not logged in", 403);
        } else {
            var _id = req.body._id;
            Account.findOne(
                // query
                {
                    "username" : req.user.username,
                    "accounts.listings.rules.messages._id" : _id
                },
                function(error, doc) {
                    if (error) {
                        handleError(res, error.message, "Failed to find Airbnb listing");
                    } else {
                        doc.accounts.forEach(function(account, accountIndex) {
                            account.listings.forEach(function(listing, listingIndex) {
                                listing.rules.messages.forEach(function(message, messageIndex) {
                                    if(message._id ==  _id) {
                                        doc.accounts[accountIndex].listings[listingIndex].rules.messages.splice(messageIndex, 1 );
                                    }
                                });
                            });
                        });
                        doc.save(function(error, updatedDoc){
                            //console.log("updatedDoc", updatedDoc);
                            res.status(200).json("success");
                        });
                    }
                }
            );
        }
    });

    app.post('/editListingSettings', function(req, res){
        console.log("/editListingSettings");
        if(!req.user) {
            handleError(res, "User not logged in", "User not logged in", 403);
        } else {
            var airbnbListingID = req.body.airbnbListingID;
            var nickname = req.body.nickname;
            var minPrice = req.body.minPrice;
            if(typeof minPrice != 'number') {
                minPrice = 0;
            } else {
                minPrice = parseInt(minPrice);
            }
            Account.findOne(
                // query
                {
                    "username" : req.user.username,
                    "accounts.listings.airbnbListingID" : airbnbListingID
                },
                function(error, doc) {
                    if (error) {
                        handleError(res, error.message, "Failed to find Airbnb listing");
                    } else {
                        doc.accounts.forEach(function(account, accountIndex) {
                            account.listings.forEach(function(listing, listingIndex) {
                                if(listing.airbnbListingID ==  airbnbListingID) {
                                    doc.accounts[accountIndex].listings[listingIndex].nickname = nickname;
                                    doc.accounts[accountIndex].listings[listingIndex].minPrice = minPrice;
                                }
                            });
                        });
                        doc.save(function(error, updatedDoc){
                            res.status(200).json("success");
                        });
                    }
                }
            );
        }
    });

    app.post('/disableMessage', function(req, res){
        console.log("/disableMessage");
        if(!req.user) {
            handleError(res, "User not logged in", "User not logged in", 403);
        } else {
            var disable = req.body.disable;
            var airbnbListingID = req.body.airbnbListingID;
            var airbnbConfirmationCode = req.body.airbnbConfirmationCode;
            var messageRuleID = req.body.messageRuleID;
            Account.findOne(
                // query
                {
                    "username" : req.user.username,
                    "accounts.listings.airbnbListingID" : airbnbListingID
                },
                function(error, doc) {
                    if (error) {
                        handleError(res, error.message, "Failed to find Airbnb listing");
                    } else {
                        doc.accounts.forEach(function(account, accountIndex) {
                            account.listings.forEach(function(listing, listingIndex) {
                                if(listing.airbnbListingID ==  airbnbListingID) {
                                    var foundMessageInDB = false;
                                    listing.messages.forEach(function(message, messageIndex) {
                                        if(message.messageRuleID == messageRuleID && message.airbnbConfirmationCode == airbnbConfirmationCode) {
                                            doc.accounts[accountIndex].listings[listingIndex].messages[messageIndex].disable = disable;
                                            foundMessageInDB = true;
                                        }
                                    });
                                    if(!foundMessageInDB) {
                                        var newMessage = {
                                            messageRuleID: messageRuleID,
                                            disable: disable,
                                            airbnbConfirmationCode: airbnbConfirmationCode

                                        };
                                        doc.accounts[accountIndex].listings[listingIndex].messages.push(newMessage);
                                    }
                                }
                            });
                        });
                        doc.save(function(error, updatedDoc){
                            res.status(200).json("success");
                        });
                    }
                }
            );
        }
    });

    //
    //
    // Airbnb actions
    //
    function downloadAirbnbUserID(account) {
        console.log("downloadAirbnbUserID()");
        return new Promise(async function(resolve, reject) {
            try {
                var data = await getUserInfo(account);
                var airbnbUserID = data.user.user.id;
                resolve(airbnbUserID)
            } catch (error) {
                reject(error);
            }
        });
    }

    function downloadAirbnbListings(user, airbnbUsername) {
        console.log("downloadAirbnbListings()");
        return new Promise(function(resolve, reject) {
            Account.findOne(
                // query
                {
                    "username" : user.username,
                    "accounts.airbnbUsername" : airbnbUsername,
                },
                function(error, doc) {
                    if (error) {
                        reject(error);
                    } else {
                        doc.accounts.forEach(async function(account, accountIndex) {
                            if(account.airbnbUsername == airbnbUsername) {
                                var downloadedListings = [];
                                try {
                                    downloadedListings = await getUsersListings(account.airbnbUserID);
                                } catch(error) {
                                    reject(error);
                                }
                                downloadedListings.forEach(function(downloadedListing) {
                                    var airbnbCheckInTime = downloadedListing.check_in_time;
                                    var airbnbCheckOutTime = downloadedListing.check_out_time;
                                    var airbnbName = downloadedListing.name;
                                    var airbnbListingID = downloadedListing.id;
                                    var airbnbTimeZone = downloadedListing.time_zone_name;
                                    var isNewListing = true;
                                    account.listings.forEach(function(listing, listingIndex) {
                                        if(listing.airbnbListingID == airbnbListingID) {
                                            isNewListing = false;
                                            doc.accounts[accountIndex].listings[listingIndex].airbnbCheckInTime = airbnbCheckInTime;
                                            doc.accounts[accountIndex].listings[listingIndex].airbnbCheckOutTime = airbnbCheckOutTime;
                                            doc.accounts[accountIndex].listings[listingIndex].airbnbName = airbnbName;
                                            doc.accounts[accountIndex].listings[listingIndex].airbnbListingID = airbnbListingID;
                                            doc.accounts[accountIndex].listings[listingIndex].airbnbTimeZone = airbnbTimeZone;
                                        }
                                    });
                                    if(isNewListing) {
                                        doc.accounts[accountIndex].listings.push({
                                            airbnbCheckInTime,
                                            airbnbCheckOutTime,
                                            airbnbName,
                                            airbnbListingID,
                                            airbnbTimeZone,
                                        });
                                    }
                                });
                                doc.save(function(error, updatedDoc){
                                    resolve();
                                });
                            }
                        });
                    }
                }
            );
        });
    }

    function getNewReservations(user, account, addNewReservationsToDB = false) {
        console.log("getNewReservations()");
        return new Promise(function(resolve, reject) {
            var airbnbUsername = account.airbnbUsername;
            Account.findOne(
                // query
                {
                    "username" : user.username,
                    "accounts.airbnbUsername" : airbnbUsername,
                },
                function(error, doc) {
                    if (error) {
                        reject(error);
                    } else {
                        doc.accounts.forEach(async function(account, accountIndex) {
                            if(account.airbnbUsername == airbnbUsername) {
                                var downloadedReservations = [];
                                try {
                                    downloadedReservations = await getReservations(account);
                                } catch(error) {
                                    reject(error);
                                }
                                var newReservations = [];
                                downloadedReservations.forEach(function(downloadedReservation) {
                                    // Check if reservation already exists.  If it does update the values that can change
                                    // It's possible to already have reservations if the Airbnb credentials or access token were updated
                                    var isNewReservation = true;
                                    account.reservations.forEach(function(reservation, reservationIndex) {
                                        if(downloadedReservation.confirmation_code == reservation.airbnbConfirmationCode) {
                                            isNewReservation = false;
                                            doc.accounts[accountIndex].reservations[reservationIndex].airbnbStartDate = downloadedReservation.start_date;
                                            doc.accounts[accountIndex].reservations[reservationIndex].airbnbNights = downloadedReservation.nights;
                                            doc.accounts[accountIndex].reservations[reservationIndex].airbnbFirstName = downloadedReservation.guest.first_name;
                                            doc.accounts[accountIndex].reservations[reservationIndex].airbnbStatus = downloadedReservation.status;
                                            doc.accounts[accountIndex].reservations[reservationIndex].airbnbThumbnailUrl = downloadedReservation.guest.thumbnail_url;
                                        }
                                    });
                                    if(isNewReservation) {
                                        var newReservation = {
                                            airbnbThreadID: downloadedReservation.thread_id,
                                            airbnbConfirmationCode: downloadedReservation.confirmation_code,
                                            airbnbListingID: downloadedReservation.listing.id,
                                            airbnbStartDate: downloadedReservation.start_date,
                                            airbnbNights: downloadedReservation.nights,
                                            airbnbFirstName: downloadedReservation.guest.first_name,
                                            airbnbStatus: downloadedReservation.status,
                                            airbnbThumbnailUrl: downloadedReservation.guest.thumbnail_url,
                                        };
                                        if(addNewReservationsToDB) {
                                            doc.accounts[accountIndex].reservations.push(newReservation);
                                        }
                                        newReservations.push(newReservation);
                                    }
                                });
                                doc.save(function(error, updatedDoc){
                                    resolve(newReservations);
                                });
                            }
                        });
                    }
                }
            );
        });
    }
    //
    //
    // Airbnb helper functions
    //
    function performAirbnbRequest(account, endpoint, method, headers, body, URLParams) {
        //console.log("performAirbnbRequest() " + method + " " + endpoint);
        return new Promise(async function(resolve, reject) {
            var host = 'api.airbnb.com';
            if(!account) {
                //console.log("NO ACCOUNT SUPPLIED, NO ACCESS_TOKEN NEEDED");
                try {
                    var data = await performRequest(host, endpoint, method, headers, body, URLParams);
                    resolve(data);
                } catch(error) {
                    reject(error);
                }
            } else if(account.airbnbAccessToken) {
                //console.log("HAS ACCESS_TOKEN");
                try {
                    var data = await performRequest(host, endpoint, method, headers, body, URLParams);
                    resolve(data);
                } catch(error) {
                    console.log("performAirbnbRequest() ACCESS_TOKEN DIDN'T WORK");
                    try {
                        var airbnbAccessToken = await loginAirbnb(account);
                        console.log("performAirbnbRequest() LOGIN SUCCESS");
                    } catch (error) {
                        console.log("performAirbnbRequest() LOGIN FAILED");
                        reject(error);
                    }
                    try {
                        account.airbnbAccessToken = airbnbAccessToken;
                        headers = {'X-Airbnb-OAuth-Token': airbnbAccessToken};
                        var data = await performAirbnbRequest(account, endpoint, method, headers, body, URLParams);
                        resolve(data);
                    } catch (error) {
                        reject(error);
                    }
                }
            } else {
                console.log("performAirbnbRequest() DOES NOT HAVE ACCESS_TOKEN");
                try {
                    var airbnbAccessToken = await loginAirbnb(account);
                    console.log("performAirbnbRequest() LOGIN SUCCESS");
                } catch (error) {
                    console.log("performAirbnbRequest() LOGIN FAILED");
                    reject(error);
                }
                try {
                    account.airbnbAccessToken = airbnbAccessToken;
                    headers = {'X-Airbnb-OAuth-Token': airbnbAccessToken};
                    var data = await performAirbnbRequest(account, endpoint, method, headers, body, URLParams);
                    resolve(data);
                } catch (error) {
                    reject(error);
                }
            }
        });
    }

    function performRequest(host, endpoint, method, headers, body, URLParams) {
        //console.log("performRequest()");
        return new Promise(function(resolve, reject) {
            var URLParamsString = JSON.stringify(URLParams);
            var bodyString = JSON.stringify(body);
            headers['user-agent'] = 'Mozilla/5.0';
            if (method == 'POST' || method == 'PUT') {
                headers['Content-Type'] = 'application/json; charset=UTF-8';
                headers['Content-Length'] =  bodyString.length;
            }
            endpoint += '?' + querystring.stringify(URLParams);
            var options = {
                host: host,
                path: endpoint,
                method: method,
                headers: headers
            };
            var req = https.request(options, function(res) {
                res.setEncoding('utf-8');
                var responseString = '';
                res.on('data', function(data) {
                    responseString += data;
                });
                res.on('end', function() {
                    var data = JSON.parse(responseString);
                    if(data.error) {
                        console.log("ERROR: ", data);
                        reject(data);
                    } else {
                        resolve(data);
                    }
                });
                res.on('error', function (error) {
                    console.log(error);
                    reject(error);
                });
            });
            if (method == 'POST' || method == 'PUT') {
                req.write(bodyString);
            } else if (method == 'GET') {
                req.write(URLParamsString);
            }
            req.end();
            req.on('error', function(e) {
                console.error(e);
            });
        });
    }

    function loginAirbnb(account) {
        console.log("loginAirbnb()");
        console.log("LOGGING INTO AIRBNB @ " + account.airbnbUsername + ":" + account.airbnbPassword);
        return new Promise(async function(resolve, reject) {
            var endpoint = '/v1/authorize';
            var method = 'POST';
            var headers = {};
            var body = {};
            var URLParams = {
                client_id: "3092nxybyb0otqw18e8nh5nty",
                locale: "en-US",
                currency: "USD",
                grant_type: "password",
                username: account.airbnbUsername,
                password: account.airbnbPassword,
            };
            var host = 'api.airbnb.com';
            try {
                var data = await performRequest(host, endpoint, method, headers, body, URLParams);
                if(data.access_token) {
                    console.log("LOGGED INTO AIRBNB, ACCESS_TOKEN: ", data.access_token);
                    Account.findOne(
                        // query
                        {
                            "accounts.airbnbUsername" : account.airbnbUsername,
                            "accounts.airbnbPassword" : account.airbnbPassword
                        },
                        function(error, doc) {
                            if (error) {
                                handleError(res, error.message, "Failed to find Airbnb account");
                            } else {
                                doc.accounts.forEach(function(dbAccount, dbAccountIndex) {
                                    if(account.airbnbUsername == dbAccount.airbnbUsername && account.airbnbPassword == dbAccount.airbnbPassword) {
                                        doc.accounts[dbAccountIndex].airbnbAccessToken = data.access_token;
                                        doc.accounts[dbAccountIndex].lastLoginAttemptSuccessful = true;
                                    }
                                });
                                doc.save(function(error, updatedDoc){
                                    resolve(data.access_token);
                                });
                            }
                        }
                    );
                } else {
                    console.log("FAILED TO LOG INTO AIRBNB: ", data);
                }
            } catch (error) {
                Account.findOne(
                    // query
                    {
                        "accounts.airbnbUsername" : account.airbnbUsername,
                        "accounts.airbnbPassword" : account.airbnbPassword
                    },
                    function(error, doc) {
                        if (error) {
                            handleError(res, error.message, "Failed to find Airbnb account");
                            reject(error);
                        } else {
                            doc.accounts.forEach(function(dbAccount, dbAccountIndex) {
                                if(account.airbnbUsername == dbAccount.airbnbUsername && account.airbnbPassword == dbAccount.airbnbPassword) {
                                    // Check if the last Login Attempt was Successful, and if it was send the user a message.
                                    if(doc.accounts[dbAccountIndex].lastLoginAttemptSuccessful) {
                                        sendEmail(doc.username, "Airbnb Login Failed", "There was a problem logging into your Airbnb account.  Please update your credentials as soon as possible to avoid any interruptions in your service.\n\nError:\n" + JSON.stringify(error));
                                    }
                                    doc.accounts[dbAccountIndex].lastLoginAttemptSuccessful = false;
                                }
                            });
                            doc.save(function(error, updatedDoc) {
                                reject(error);
                            });
                        }
                    }
                );
            }
        });
    }

    function getUserInfo(account) {
        console.log("getUserInfo()");
        return new Promise(async function(resolve, reject) {
            var endpoint = '/v1/account/active';
            var method = 'GET';
            var headers = {'X-Airbnb-OAuth-Token': account.airbnbAccessToken};
            var body = {};
            var URLParams = {
                client_id: "3092nxybyb0otqw18e8nh5nty",
                locale: "en-US",
                currency: "USD",
                items_per_page: 10,
                _offset: 0,
                role: "host",
                alert_types: "reservation_request",
            };
            try {
                var data = await performAirbnbRequest(account, endpoint, method, headers, body, URLParams);
                resolve(data);
            } catch (error) {
                reject(error);
            }
        });
    }

    function getUsersListings(airbnbUserID) {
        console.log("getUsersListings()");
        return new Promise(async function(resolve, reject) {
            var endpoint = '/v2/listings';
            var method = 'GET';
            var headers = {};
            var body = {};
            var URLParams = {
                client_id: "3092nxybyb0otqw18e8nh5nty",
                locale: "en-US",
                currency: "USD",
                _format: "v1_legacy_long",
                _limit: 10,
                _offset: 0,
                has_availability: false,
                user_id: airbnbUserID,
            };
            try {
                var data = await performAirbnbRequest(false, endpoint, method, headers, body, URLParams);
                resolve(data);
            } catch (error) {
                reject(error);
            }
        });
    }

    app.get("/checkRules", function(req, res) {
        console.log("/checkRules");
        Account.find({}, async function(error, doc) {
            if (error) {
                handleError(res, error.message, "Failed FIND");
            } else {
                res.status(200).send("Checking Rules For All Listings.");
                for(var j = 0; j < doc.length; j++) {
                    var user = doc[j];
                    for(var k = 0; k < user.accounts.length; k++) {
                        var account = user.accounts[k];
                        for(var i = 0; i < account.listings.length; i++) {
                            var listing = account.listings[i];
                            try {
                                var newReservations = await getNewReservations(user, account, true);
                                await checkBookingBasedRulesForListing(user, account, listing, newReservations);
                                await checkTimeBasedRulesForListing(user, account, listing);
                            } catch (error) {
                                handleError(res, error.message, "getNewReservations(), checkBookingBasedRulesForListing(), checkTimeBasedRulesForListing()");
                            }
                        }
                    }
                }
            }
        });
    });

    function checkTimeBasedRulesForListing(user, account, listing) {
        console.log("checkTimeBasedRulesForListing()");
        return new Promise(async function(resolve, reject) {
            var airbnbListingID = listing.airbnbListingID;
            var airbnbTimeZone = listing.airbnbTimeZone;
            var nowTime = moment().tz(airbnbTimeZone).format("H");
            var startDate = moment().tz(airbnbTimeZone).add(-6, 'day').format('YYYY-MM-DD');
            var endDate = moment().tz(airbnbTimeZone).add(6, 'day').format('YYYY-MM-DD');
            var messageRules = [];
            console.log("Looking for check-in/check-out rules that match the current time in " + airbnbTimeZone + " - current time: " + nowTime);
            listing.rules.messages.forEach(function(messageRule){
                if(messageRule.time.toString() == nowTime) {
                    var newMessageRule = JSON.parse(JSON.stringify(messageRule)); // This took for ever to figure out.  Not sure why but I guess can't modify the messageRule object in foreach loops?
                    // save the back calculated checkin or check out.
                    // the backCalculatedCheckin/backCalculatedCheckout are calculated using todays date so if they
                    // match the checkin/checkout on the reservation then a message should be sent.
                    if(messageRule.event == "checkin") {
                        newMessageRule.backCalculatedCheckin = moment().tz(airbnbTimeZone).subtract(messageRule.days, "day").format('YYYY-MM-DD');
                        messageRules.push(newMessageRule);
                    } else if (messageRule.event == "checkout") {
                        newMessageRule.backCalculatedCheckout = moment().tz(airbnbTimeZone).subtract(messageRule.days, "day").format('YYYY-MM-DD');
                        messageRules.push(newMessageRule);
                    }
                }
            });
            console.log("Found " + messageRules.length + " rules that match the current time");
            if(messageRules.length > 0) {
                console.log("CYCLING THROUGH RESERVATIONS");
                for(var k = 0; k < account.reservations.length; k++) {
                    var reservation = account.reservations[k];
                    var daysTillCheckin = moment().tz(listing.airbnbTimeZone).startOf('day').diff(moment.tz(reservation.airbnbStartDate, 'YYYY-MM-DD', listing.airbnbTimeZone).startOf('day'), 'days');
                    var daysTillCheckout = daysTillCheckin - reservation.airbnbNights;
                    // Ignore any reservations that have checkout that are older than a week
                    if(daysTillCheckout <= 7) {
                        if(reservation.airbnbListingID == listing.airbnbListingID) {
                            if(reservation.airbnbStatus && reservation.airbnbStatus == "accepted") {
                                var airbnbConfirmationCode = reservation.airbnbConfirmationCode;
                                var airbnbThreadID = reservation.airbnbThreadID;
                                var checkout = moment(reservation.airbnbStartDate, 'YYYY-MM-DD').add(reservation.airbnbNights, "day").format('YYYY-MM-DD');
                                for(var i = 0; i < messageRules.length; i++) {
                                    var messageRule = messageRules[i];
                                    console.log("       Checking Message Rule - title: " + messageRule.title);
                                    console.log("           event: " + messageRule.event + " days: " + messageRule.days + " time: " + messageRule.time + " minNights: " + messageRule.minNights);
                                    console.log("       Reservation info - confirmation : " + airbnbConfirmationCode + " name: " + reservation.airbnbFirstName);
                                    console.log("           start_date : " + reservation.airbnbStartDate + " nights: " + reservation.airbnbNights);
                                    if(messageRule.event == "checkin") {
                                        console.log("       The back calculated check-in is: " + messageRule.backCalculatedCheckin + " reservation check-in: " + reservation.airbnbStartDate + " reservation nights: " + reservation.airbnbNights);
                                    } else if (messageRule.event == "checkout") {
                                        console.log("       The back calculated check-out is: " + messageRule.backCalculatedCheckout + " reservation check-in: " + reservation.airbnbStartDate + " reservation nights: " + reservation.airbnbNights);
                                    }
                                    var isLastMinuteMessage = false;
                                    try {
                                        if(messageRule.event == "checkin" && messageRule.backCalculatedCheckin == reservation.airbnbStartDate && messageRule.minNights <= reservation.airbnbNights) {
                                            console.log("       Check-in rule criteria met");
                                            await buildMessage(user, account, airbnbListingID, messageRule, airbnbConfirmationCode, isLastMinuteMessage);
                                        } else if (messageRule.event == "checkout" && messageRule.backCalculatedCheckout == checkout && messageRule.minNights <= reservation.airbnbNights) {
                                            console.log("       Check-out rule criteria met");
                                            if(messageRule.reviewEnabled) {
                                                await leaveReview(user, account, airbnbListingID, messageRule, airbnbConfirmationCode, airbnbThreadID);
                                                if(messageRule.sendMessageAfterLeavingReview) {
                                                    await buildMessage(user, account, airbnbListingID, messageRule, airbnbConfirmationCode, isLastMinuteMessage);
                                                }
                                            } else {
                                                await buildMessage(user, account, airbnbListingID, messageRule, airbnbConfirmationCode, isLastMinuteMessage);
                                            }
                                        }
                                    } catch (error) {
                                        reject(error);
                                    }
                                }
                            }
                        }
                    }
                }
                resolve();
            } else {
                resolve();
            }
        });
    }

    function checkBookingBasedRulesForListing(user, account, listing, newReservations) {
        console.log("checkBookingBasedRulesForListing()");
        return new Promise(function(resolve, reject) {
            var airbnbUsername = account.airbnbUsername;
            Account.findOne(
                {
                    "username" : user.username
                },
                async function(err, doc) {
                    if(newReservations.length) {
                        for(var i = 0; i < newReservations.length; i++) {
                            var newReservation = newReservations[i];
                            console.log("CHECKING IF THERE ARE ANY BOOKING OR LAST MINUTE MESSAGES");
                            console.log("    Reservation info - confirmation : " + newReservation.airbnbConfirmationCode);
                            var nowTime = moment().tz(listing.airbnbTimeZone).format("H");
                            var daysTillCheckin = moment().tz(listing.airbnbTimeZone).startOf('day').diff(moment.tz(newReservation.airbnbStartDate, 'YYYY-MM-DD', listing.airbnbTimeZone).startOf('day'), 'days');
                            // Make sure the new reservation's check-in is today or later not already passed.
                            // We don't want old messages accidentally being sent to guests.
                            console.log("nowTime", nowTime);
                            console.log("daysTillCheckin", daysTillCheckin);
                            if(daysTillCheckin >= 0) {
                                for(var k = 0; k < listing.rules.messages.length; k++) {
                                    var messageRule = listing.rules.messages[k];
                                    var shouldSendMessage = false;
                                    var isLastMinuteMessage = false;
                                    if(messageRule.event == "booking") {
                                        console.log("    FOUND A BOOKING MESSAGE, WILL SEND MESSAGE");
                                        shouldSendMessage = true;
                                    } else if(messageRule.event == "checkin" && messageRule.lastMinuteMessageEnabled) {
                                        console.log("    FOUND A LAST MINUTE MESSAGE");
                                        var isLastMinuteMessage = true;
                                        console.log("       Rules set to fire at " + messageRule.time + " hour and " + messageRule.days + " days before checkin");
                                        console.log("       Calculated that the new reservation has " + daysTillCheckin + " days before checkin and the current hour at the listing is " + nowTime);
                                        if(messageRule.days < daysTillCheckin || (messageRule.days == daysTillCheckin && messageRule.time < nowTime)) {
                                            console.log("       WILL SEND MESSAGE");
                                            shouldSendMessage = true;
                                        } else {
                                            console.log("       WILL NOT SEND MESSAGE");
                                        }
                                    }
                                    if(shouldSendMessage) {
                                        await buildMessage(user, account, newReservation.airbnbListingID, messageRule, newReservation.airbnbConfirmationCode, isLastMinuteMessage);
                                    }
                                }
                            }
                        }
                        resolve();
                    } else {
                        resolve();
                    }
                }
            );
        });
    }

    function leaveReview(user, account, airbnbListingID, messageRule, airbnbConfirmationCode, airbnbThreadID) {
        console.log("leaveReview()");
        console.log("   leaveReview() user.username", user.username);
        console.log("   leaveReview() account.airbnbUsername", account.airbnbUsername);
        console.log("   leaveReview() airbnbListingID", airbnbListingID);
        console.log("   leaveReview() airbnbConfirmationCode", airbnbConfirmationCode);
        console.log("   leaveReview() airbnbThreadID", airbnbThreadID);
        return new Promise(function(resolve, reject) {
            Account.findOne(
                {
                    "username" : user.username,
                    "accounts.airbnbUsername": account.airbnbUsername,
                    "accounts.listings.airbnbListingID": airbnbListingID,
                },
                function(err, doc) {
                    if(doc) {
                        var airbnbUsername = account.airbnbUsername;
                        doc.accounts.forEach(function(account, accountIndex) {
                            // Make sure it's the right account
                            if(account.airbnbUsername == airbnbUsername) {
                                account.listings.forEach(async function(listing, listingIndex) {
                                    // Make sure it's the right listing
                                    if(listing.airbnbListingID == airbnbListingID) {
                                        var reviewAlreadySentOrIsDisabled = false;
                                        listing.messages.forEach(function(message) {
                                            if(message.messageRuleID == messageRule._id && message.airbnbConfirmationCode == airbnbConfirmationCode && ((message.sentDate && message.review) || message.disable)) {
                                                reviewAlreadySentOrIsDisabled = true;
                                            }
                                        });
                                        if(reviewAlreadySentOrIsDisabled) {
                                            console.log("    leaveReview() REVIEW ALREADY SENT OR IS DISABLED");
                                        } else {
                                            // Now we need to find the right thread to add the message to
                                            // Get all the reservations then find the reservation that matched the confirmation_code and reply to it with the check in message
                                            account.reservations.forEach(async function(reservation) {
                                                if(reservation.airbnbConfirmationCode == airbnbConfirmationCode && reservation.airbnbStatus == "accepted") {
                                                    console.log("    leaveReview() FOUND THE RESERVATION");
                                                    var airbnbThreadID = reservation.airbnbThreadID;
                                                    var airbnbFirstName = reservation.airbnbFirstName;
                                                    var airbnbCheckInTime =  moment(listing.airbnbCheckInTime, ["H"]).format("hA");
                                                    var airbnbCheckOutTime = moment(listing.airbnbCheckOutTime, ["H"]).format("hA");
                                                    var todayMoment = moment().tz(listing.airbnbTimeZone).startOf('day');
                                                    var checkinMoment = moment.tz(reservation.airbnbStartDate, 'YYYY-MM-DD', listing.airbnbTimeZone).startOf('day');
                                                    var daysTillCheckin = checkinMoment.diff(todayMoment, 'days');
                                                    var checkInDateFormat = 'ddd, MMMM Do';
                                                    var checkOutDateFormat = 'ddd, MMMM Do';
                                                    if(daysTillCheckin == 0) {
                                                        console.log("    leaveReview() CHECK-IN IS TODAY!!!!!!!!!");
                                                        checkInDateFormat = '[today,] MMMM Do';
                                                    } else if(daysTillCheckin == 1) {
                                                        console.log("    leaveReview() CHECK-IN IS TOMORROW!!!!!!!!!");
                                                        checkInDateFormat = '[tomorrow,] MMMM Do';
                                                    }
                                                    var daysTillCheckout = daysTillCheckin + reservation.airbnbNights;
                                                    if(daysTillCheckout == 1) {
                                                        console.log("    leaveReview() CHECK-OUT IS TOMORROW!!!!!!!!!");
                                                        checkOutDateFormat = '[tomorrow,] MMMM Do';
                                                    }
                                                    var checkinDate = moment(reservation.airbnbStartDate, 'YYYY-MM-DD').format(checkInDateFormat);
                                                    var checkoutDate = moment(reservation.airbnbStartDate, 'YYYY-MM-DD').add(reservation.airbnbNights, "day").format(checkOutDateFormat);

                                                    var reviewMessage = messageRule.reviewMessage;
                                                    reviewMessage = reviewMessage.replace(/{{Guest Name}}/g, airbnbFirstName);
                                                    reviewMessage = reviewMessage.replace(/{{Check-In Date}}/g, checkinDate);
                                                    reviewMessage = reviewMessage.replace(/{{Check-In Time}}/g, airbnbCheckInTime);
                                                    reviewMessage = reviewMessage.replace(/{{Check-Out Date}}/g, checkoutDate);
                                                    reviewMessage = reviewMessage.replace(/{{Check-Out Time}}/g, airbnbCheckOutTime);
                                                    try {
                                                        var thread = await getThread(account, airbnbThreadID);
                                                        await putReview(account, thread.review_id, reviewMessage);
                                                        console.log("GUEST WAS REVIEWED!, LISTING ID: " + listing.airbnbListingID);
                                                        var newEntry = {
                                                            messageRuleID: messageRule._id,
                                                            airbnbConfirmationCode: airbnbConfirmationCode,
                                                            review: reviewMessage,
                                                            sentEvent: messageRule.event,
                                                            sentDate: moment().toDate(),
                                                            sentDateFormated: moment().tz(listing.airbnbTimeZone).format('ddd, MMMM Do'),
                                                            sentTimeFormated: moment().tz(listing.airbnbTimeZone).format("hA"),
                                                        };
                                                        var foundExistingMessage = false;
                                                        listing.messages.forEach(function(message, messageIndex) {
                                                            if(message.messageRuleID == messageRule._id && message.airbnbConfirmationCode == airbnbConfirmationCode) {
                                                                foundExistingMessage = true;
                                                                Object.assign(doc.accounts[accountIndex].listings[listingIndex].messages[messageIndex], newEntry);
                                                            }
                                                        });
                                                        if(!foundExistingMessage) {
                                                            doc.accounts[accountIndex].listings[listingIndex].messages.push(newEntry);
                                                        }
                                                        doc.save(function(err, updatedDoc){
                                                            //console.log("updatedDoc", updatedDoc);
                                                        });
                                                        var listingName = listing.airbnbName;
                                                        if(listing.nickname) {
                                                            listingName = listing.nickname;
                                                        }
                                                        sendEmail(user.username, "5 Start Review for " + airbnbFirstName + " @ " + listingName, reviewMessage);
                                                        resolve();
                                                    } catch(error) {
                                                        reject(error);
                                                    }
                                                }
                                            });
                                        }
                                    }
                                });
                            }
                        });
                    }
                }
            );
        });
    }

    function buildMessage(user, account, airbnbListingID, messageRule, airbnbConfirmationCode, isLastMinuteMessage) {
        console.log("buildMessage()");
        console.log("   buildMessage() user.username", user.username);
        console.log("   buildMessage() account.airbnbUsername", account.airbnbUsername);
        console.log("   buildMessage() airbnbListingID", airbnbListingID);
        console.log("   buildMessage() airbnbConfirmationCode", airbnbConfirmationCode);
        console.log("   buildMessage() messageRule._id", messageRule._id);
        return new Promise(function(resolve, reject) {
            Account.findOne(
                {
                    "username" : user.username,
                    "accounts.airbnbUsername": account.airbnbUsername,
                    "accounts.listings.airbnbListingID": airbnbListingID,
                },
                function(err, doc) {
                    if(doc) {
                        var airbnbUsername = account.airbnbUsername;
                        doc.accounts.forEach(function(account, accountIndex) {
                            // Make sure it's the right account
                            if(account.airbnbUsername == airbnbUsername) {
                                account.listings.forEach(async function(listing, listingIndex) {
                                    // Make sure it's the right listing
                                    if(listing.airbnbListingID == airbnbListingID) {
                                        var messageAlreadySentOrIsDisabled = false;
                                        listing.messages.forEach(function(message) {
                                            if(message.messageRuleID == messageRule._id && message.airbnbConfirmationCode == airbnbConfirmationCode && ((message.sentDate && message.message) || message.disable)) {
                                                messageAlreadySentOrIsDisabled = true;
                                            }
                                        });
                                        if(messageAlreadySentOrIsDisabled) {
                                            console.log("    buildMessage() MESSAGE ALREADY SENT OR IS DISABLED");
                                         } else {
                                            // Now we need to find the right thread to add the message to
                                            // Get all the reservations then find the reservation that matched the confirmation_code and reply to it with the check in message
                                            account.reservations.forEach(async function(reservation) {
                                                if(reservation.airbnbConfirmationCode == airbnbConfirmationCode && reservation.airbnbStatus == "accepted") {
                                                    console.log("    buildMessage() FOUND THE RESERVATION");
                                                    var airbnbThreadID = reservation.airbnbThreadID;
                                                    var airbnbFirstName = reservation.airbnbFirstName;
                                                    var airbnbCheckInTime =  moment(listing.airbnbCheckInTime, ["H"]).format("hA");
                                                    var airbnbCheckOutTime = moment(listing.airbnbCheckOutTime, ["H"]).format("hA");
                                                    var todayMoment = moment().tz(listing.airbnbTimeZone).startOf('day');
                                                    var checkinMoment = moment.tz(reservation.airbnbStartDate, 'YYYY-MM-DD', listing.airbnbTimeZone).startOf('day');
                                                    var daysTillCheckin = checkinMoment.diff(todayMoment, 'days');
                                                    var checkInDateFormat = 'ddd, MMMM Do';
                                                    var checkOutDateFormat = 'ddd, MMMM Do';
                                                    if(daysTillCheckin == 0) {
                                                        console.log("    buildMessage() CHECK-IN IS TODAY!!!!!!!!!");
                                                        checkInDateFormat = '[today,] MMMM Do';
                                                    } else if(daysTillCheckin == 1) {
                                                        console.log("    buildMessage() CHECK-IN IS TOMORROW!!!!!!!!!");
                                                        checkInDateFormat = '[tomorrow,] MMMM Do';
                                                    }
                                                    var daysTillCheckout = daysTillCheckin + reservation.airbnbNights;
                                                    if(daysTillCheckout == 1) {
                                                        console.log("    buildMessage() CHECK-OUT IS TOMORROW!!!!!!!!!");
                                                        checkOutDateFormat = '[tomorrow,] MMMM Do';
                                                    }
                                                    var checkinDate = moment(reservation.airbnbStartDate, 'YYYY-MM-DD').format(checkInDateFormat);
                                                    var checkoutDate = moment(reservation.airbnbStartDate, 'YYYY-MM-DD').add(reservation.airbnbNights, "day").format(checkOutDateFormat);

                                                    var messageText = messageRule.message;
                                                    if(isLastMinuteMessage) {
                                                        var messageText = messageRule.lastMinuteMessage;
                                                    }
                                                    messageText = messageText.replace(/{{Guest Name}}/g, airbnbFirstName);
                                                    messageText = messageText.replace(/{{Check-In Date}}/g, checkinDate);
                                                    messageText = messageText.replace(/{{Check-In Time}}/g, airbnbCheckInTime);
                                                    messageText = messageText.replace(/{{Check-Out Date}}/g, checkoutDate);
                                                    messageText = messageText.replace(/{{Check-Out Time}}/g, airbnbCheckOutTime);
                                                    try {
                                                        await sendMessage(user, account, airbnbThreadID, messageText);
                                                        console.log("MESSAGE SENT!, LISTING ID: " + listing.airbnbListingID);
                                                        //console.log("MESSAGE TEXT: " + messageText);
                                                        var newEntry = {
                                                            messageRuleID: messageRule._id,
                                                            airbnbConfirmationCode: airbnbConfirmationCode,
                                                            message: messageText,
                                                            sentEvent: messageRule.event,
                                                            sentDate: moment().toDate(),
                                                            sentDateFormated: moment().tz(listing.airbnbTimeZone).format('ddd, MMMM Do'),
                                                            sentTimeFormated: moment().tz(listing.airbnbTimeZone).format("hA"),
                                                        };
                                                        var foundExistingMessage = false;
                                                        listing.messages.forEach(function(message, messageIndex) {
                                                            if(message.messageRuleID == messageRule._id && message.airbnbConfirmationCode == airbnbConfirmationCode) {
                                                                foundExistingMessage = true;
                                                                Object.assign(doc.accounts[accountIndex].listings[listingIndex].messages[messageIndex], newEntry);
                                                            }
                                                        });
                                                        if(!foundExistingMessage) {
                                                            doc.accounts[accountIndex].listings[listingIndex].messages.push(newEntry);
                                                        }
                                                        doc.save(function(err, updatedDoc){
                                                            //console.log("updatedDoc", updatedDoc);
                                                        });
                                                        newEntry.listing = listing;
                                                        var listingName = listing.airbnbName;
                                                        if(listing.nickname) {
                                                            listingName = listing.nickname;
                                                        }
                                                        sendEmail(user.username, "Message for " + airbnbFirstName + " @ " + listingName, messageText);
                                                        resolve();
                                                    } catch(error) {
                                                        reject(error);
                                                    }
                                                }
                                            });
                                        }
                                    }
                                });
                            }
                        });
                    }
                }
            );
        });
    }

    function getReservations(account) {
        console.log("getReservations()");
        return new Promise(async function(resolve, reject) {
            var endpoint = '/v2/reservations';
            var method = 'GET';
            var headers = {'X-Airbnb-OAuth-Token': account.airbnbAccessToken};
            var body = {};
            var URLParams = {
                include_shared_itinerary: true,
                _limit: 30,
                _offset:0,
                _format: "for_mobile_list",
                role: "host",
                host_id: account.airbnbUserID
            };
            try {
                var data = await performAirbnbRequest(account, endpoint, method, headers, body, URLParams);
                resolve(data.reservations);
            } catch (error) {
                reject(error);
            }
        });
    }

    function getCalendar(account, airbnbListingID, startDate, endDate) {
        console.log("getCalendar()");
        return new Promise(async function(resolve, reject) {
            var endpoint = '/v2/batch';
            var method = 'POST';
            var headers = {'X-Airbnb-OAuth-Token': account.airbnbAccessToken};
            var body = {
                "operations": [
                    {
                        "method": "GET",
                        "path": "/calendar_days",
                        "query": {
                            "start_date": startDate,
                            "listing_id": airbnbListingID,
                            "_format": "host_calendar",
                            "end_date": endDate
                        }
                    },{
                        "method": "GET",
                        "path": "/dynamic_pricing_controls/" + airbnbListingID,
                        "query": {}
                    }
                ],
                "_transaction": false
            };
            var URLParams = {
                client_id: "3092nxybyb0otqw18e8nh5nty",
                locale: "en-US",
                currency: "USD",
            };
            try {
                var data = await performAirbnbRequest(account, endpoint, method, headers, body, URLParams);
                resolve(data.operations[0].response.calendar_days);
            } catch (error) {
                reject(error);
            }
        });
    }

    function getMessages(account) {
        console.log("getMessages()");
        return new Promise(async function(resolve, reject) {
            var threads = [];
            var limit = 50;
            var endpoint = '/v2/threads';
            var method = 'GET';
            var headers = {'X-Airbnb-OAuth-Token': account.airbnbAccessToken};
            var body = {};
            var URLParams = {
                client_id: "3092nxybyb0otqw18e8nh5nty",
                locale: "en-US",
                currency: "USD",
                _format: "for_mobile_inbox",
                _limit: limit,
                role: "host",
            };
            for(var i = 0; i < 4; i++) {
                URLParams._offset = limit * i;
                try {
                    var data = await performAirbnbRequest(account, endpoint, method, headers, body, URLParams);
                    threads = threads.concat(data.threads);
                } catch (error) {
                    reject(error);
                }
            }
            resolve(threads);
        });
    }

    function sendMessage(user, account, airbnbThreadID, messageText) {
        console.log("sendMessage()");
        return new Promise(async function(resolve, reject) {
            var endpoint = '/v2/messages';
            var method = 'POST';
            var headers = {'X-Airbnb-OAuth-Token': account.airbnbAccessToken};
            var body = {
                thread_id: airbnbThreadID,
                message: messageText,
            };
            var URLParams = {
                client_id: "3092nxybyb0otqw18e8nh5nty",
                locale: "en-US",
                currency: "USD"
            };
            if(process.env.NODE_ENV == "production") {
                try {
                    var data = await performAirbnbRequest(account, endpoint, method, headers, body, URLParams);
                    resolve(data);
                } catch (err) {
                    reject(err);
                }
            } else {
                console.log("MESSAGE INTENTIONALLY DIDN'T SEND BECAUSE APP ISN'T IN PRODUCTION MODE");
                resolve();
            }
        });
    };

    app.get("/getMessages", async function(req, res) {
        console.log("/getMessages");
        if(!req.user) {
            handleError(res, "User not logged in", "User not logged in", 403);
        } else {
            var allMessages = [];
            for(var l = 0; l < req.user.accounts.length; l++) {
                var account = req.user.accounts[l];
                var listingByAirbnbistingID = {};
                account.listings.forEach(function(listing, listingIndex) {
                    listingByAirbnbistingID[listing.airbnbListingID] = listing;
                });
                // Get the latest reservations for this account.
                // This is important because we want to make sure the user has the latest reservations
                var newReservations = [];
                try {
                    newReservations = await getNewReservations(req.user, account);
                } catch(error) {
                    handleError(res, error.message, "getNewReservations()");
                }
                var reservations = newReservations.concat(account.reservations);
                // Now cycle through all the reservations.
                // Find any matching
                for(var k = 0; k < reservations.length; k++) {
                    var reservation = reservations[k];
                    // It's possible that an account is added as a co-host and then has new reservations for listings not added to db
                    // Let's just check if the listing exists in the listingByAribnbListingID object and if it doesn't just ignore it.
                    // In the future we might want to prompt the user that a reservation for a listing we don't recognize was added
                    if(!listingByAirbnbistingID[reservation.airbnbListingID + ""]) {
                        continue;
                    }
                    // Don't show messages for reservations that are more than a week old
                    var today = moment().startOf('day');
                    var checkout = moment(reservation.airbnbStartDate, 'YYYY-MM-DD').add(reservation.airbnbNights, "day").startOf('day');
                    var daysPastCheckout = today.diff(checkout, "days");
                    if(daysPastCheckout >= 7) {
                        continue;
                    }
                    var reservationsPastMessages = [];
                    var reservationsFutureMessages = [];

                    var messageRules = listingByAirbnbistingID[reservation.airbnbListingID + ""].rules.messages;
                    for(var i = 0; i < messageRules.length; i++) {
                        var messageRule = messageRules[i];
                        var messageFromRuleAlreadyExists = false;
                        var messages = listingByAirbnbistingID[reservation.airbnbListingID + ""].messages;
                        // Lets see if this a message for this rule and this reservation has been sent, if not we'll add a future message
                        for(var j = 0; messages.length > j; j++) {
                            var pastMessage = JSON.parse(JSON.stringify(messages[j]));
                            // Check to make sure the message rule id and reservation confirmation code match the message's
                            if(pastMessage.messageRuleID == messageRule._id && pastMessage.airbnbConfirmationCode == reservation.airbnbConfirmationCode) {
                                messageFromRuleAlreadyExists = true;
                                var eventDate = moment.tz(reservation.airbnbStartDate + " " + messageRule.time, 'YYYY-MM-DD H', listingByAirbnbistingID[reservation.airbnbListingID + ""].airbnbTimeZone);
                                if (messageRule.event == "checkout") {
                                    eventDate = eventDate.add(reservation.airbnbNights, "day");
                                }
                                if(listingByAirbnbistingID[reservation.airbnbListingID + ""].nickname) {
                                    pastMessage.listingName = listingByAirbnbistingID[reservation.airbnbListingID + ""].nickname;
                                } else {
                                    pastMessage.listingName = listingByAirbnbistingID[reservation.airbnbListingID + ""].airbnbName;
                                }
                                pastMessage.sendDate = eventDate.add(messageRule.days, "day").toDate();
                                pastMessage.sendDateHasPassed = eventDate.isBefore();
                                pastMessage.sendDateFormated = eventDate.format('ddd, MMMM Do');
                                pastMessage.sendTimeFormated = moment(messageRule.time, ["H"]).format("hA");
                                pastMessage.sendEvent = messageRule.event;
                                pastMessage.hasMatchingMessageRule = true;
                                pastMessage.messageRuleID = messageRule._id;
                                pastMessage.messageRuleTitle = messageRule.title;
                                // check to make sure the past message is a real past message and not a disabled/re-enabled message.
                                // if not a real past message set the reviewEnabled to the message rule value
                                if(typeof pastMessage.reviewEnabled != "boolean") {
                                    pastMessage.reviewEnabled = messageRule.reviewEnabled;
                                }
                                var airbnbFirstName = reservation.airbnbFirstName;
                                var airbnbCheckInTime =  moment(listingByAirbnbistingID[reservation.airbnbListingID + ""].airbnbCheckInTime, ["H"]).format("hA");
                                var airbnbCheckOutTime = moment(listingByAirbnbistingID[reservation.airbnbListingID + ""].airbnbCheckOutTime, ["H"]).format("hA");
                                var checkinDate = moment(reservation.airbnbStartDate, 'YYYY-MM-DD').format('ddd, MMMM Do');
                                var checkoutDate = moment(reservation.airbnbStartDate, 'YYYY-MM-DD').add(reservation.airbnbNights, "day").format('ddd, MMMM Do');
                                // If review is enabled, check if there is also a message...
                                if(!messageRule.reviewEnabled || (messageRule.reviewEnabled && messageRule.sendMessageAfterLeavingReview)) {
                                    var messageText = messageRule.message;
                                    messageText = messageText.replace(/{{Guest Name}}/g, airbnbFirstName);
                                    messageText = messageText.replace(/{{Check-In Date}}/g, checkinDate);
                                    messageText = messageText.replace(/{{Check-In Time}}/g, airbnbCheckInTime);
                                    messageText = messageText.replace(/{{Check-Out Date}}/g, checkoutDate);
                                    messageText = messageText.replace(/{{Check-Out Time}}/g, airbnbCheckOutTime);
                                    pastMessage.sendMessage = messageText;
                                }
                                if(messageRule.reviewEnabled) {
                                    var reviewMessage = messageRule.reviewMessage;
                                    reviewMessage = reviewMessage.replace(/{{Guest Name}}/g, airbnbFirstName);
                                    reviewMessage = reviewMessage.replace(/{{Check-In Date}}/g, checkinDate);
                                    reviewMessage = reviewMessage.replace(/{{Check-In Time}}/g, airbnbCheckInTime);
                                    reviewMessage = reviewMessage.replace(/{{Check-Out Date}}/g, checkoutDate);
                                    reviewMessage = reviewMessage.replace(/{{Check-Out Time}}/g, airbnbCheckOutTime);
                                    pastMessage.sendReview = reviewMessage;
                                }
                                pastMessage.reservation = reservation;
                                //pastMessage.listing = listingByAirbnbistingID[reservation.airbnbListingID + ""];
                                reservationsPastMessages.push(pastMessage);
                                break;
                            }
                        }
                        if(!messageFromRuleAlreadyExists) {
                            // Message for this rule has not been sent or disabled
                            // Now we need to make sure this message rule applies to this reservation
                            // if the reservation is a "booking" type then it won't show up in timeline because we don't know when someone would book
                            // if reservation is longer than the min number of nights, don't add it
                            if(messageRule.event != "booking" && reservation.airbnbNights >= messageRule.minNights) {
                                var futureMessage = {};
                                var eventDate = moment.tz(reservation.airbnbStartDate + " " + messageRule.time, 'YYYY-MM-DD H', listingByAirbnbistingID[reservation.airbnbListingID + ""].airbnbTimeZone);
                                if (messageRule.event == "checkout") {
                                    eventDate = eventDate.add(reservation.airbnbNights, "day");
                                }
                                if(listingByAirbnbistingID[reservation.airbnbListingID + ""].nickname) {
                                    futureMessage.listingName = listingByAirbnbistingID[reservation.airbnbListingID + ""].nickname;
                                } else {
                                    futureMessage.listingName = listingByAirbnbistingID[reservation.airbnbListingID + ""].airbnbName;
                                }
                                futureMessage.sendDate = eventDate.add(messageRule.days, "day").toDate();
                                futureMessage.sendDateHasPassed = eventDate.isBefore();
                                futureMessage.sendDateFormated = eventDate.format('ddd, MMMM Do');
                                futureMessage.sendTimeFormated = moment(messageRule.time, ["H"]).format("hA");
                                futureMessage.sendEvent = messageRule.event;
                                futureMessage.hasMatchingMessageRule = true;
                                futureMessage.messageRuleID = messageRule._id;
                                futureMessage.messageRuleTitle = messageRule.title;
                                futureMessage.reviewEnabled = messageRule.reviewEnabled;
                                futureMessage.airbnbConfirmationCode = reservation.airbnbConfirmationCode;
                                var airbnbFirstName = reservation.airbnbFirstName;
                                var airbnbCheckInTime =  moment(listingByAirbnbistingID[reservation.airbnbListingID + ""].airbnbCheckInTime, ["H"]).format("hA");
                                var airbnbCheckOutTime = moment(listingByAirbnbistingID[reservation.airbnbListingID + ""].airbnbCheckOutTime, ["H"]).format("hA");
                                var checkinDate = moment(reservation.airbnbStartDate, 'YYYY-MM-DD').format('ddd, MMMM Do');
                                var checkoutDate = moment(reservation.airbnbStartDate, 'YYYY-MM-DD').add(reservation.airbnbNights, "day").format('ddd, MMMM Do');
                                // If review is enabled, check if there is also a message...
                                if(!messageRule.reviewEnabled || (messageRule.reviewEnabled && messageRule.sendMessageAfterLeavingReview)) {
                                    var messageText = messageRule.message;
                                    messageText = messageText.replace(/{{Guest Name}}/g, airbnbFirstName);
                                    messageText = messageText.replace(/{{Check-In Date}}/g, checkinDate);
                                    messageText = messageText.replace(/{{Check-In Time}}/g, airbnbCheckInTime);
                                    messageText = messageText.replace(/{{Check-Out Date}}/g, checkoutDate);
                                    messageText = messageText.replace(/{{Check-Out Time}}/g, airbnbCheckOutTime);
                                    futureMessage.sendMessage = messageText;
                                }
                                if(messageRule.reviewEnabled) {
                                    var reviewMessage = messageRule.reviewMessage;
                                    reviewMessage = reviewMessage.replace(/{{Guest Name}}/g, airbnbFirstName);
                                    reviewMessage = reviewMessage.replace(/{{Check-In Date}}/g, checkinDate);
                                    reviewMessage = reviewMessage.replace(/{{Check-In Time}}/g, airbnbCheckInTime);
                                    reviewMessage = reviewMessage.replace(/{{Check-Out Date}}/g, checkoutDate);
                                    reviewMessage = reviewMessage.replace(/{{Check-Out Time}}/g, airbnbCheckOutTime);
                                    futureMessage.sendReview = reviewMessage;
                                }
                                futureMessage.reservation = reservation;
                                //futureMessage.listing = listingByAirbnbistingID[reservation.airbnbListingID + ""];
                                reservationsFutureMessages.push(futureMessage);

                            }
                        }
                    }
                    allMessages = allMessages.concat(reservationsFutureMessages, reservationsPastMessages);
                }
            }
            allMessages.sort(function(left, right) {
                if(left.sentDate && right.sentDate) {
                    return moment(left.sentDate).diff(moment(right.sentDate));
                } else if(left.sentDate) {
                    return moment(left.sentDate).diff(moment(right.sendDate));
                } else if(right.sentDate) {
                    return moment(left.sendDate).diff(moment(right.sentDate));
                } else if(left.reviewEnabled && !right.reviewEnabled && moment(left.sendDate).diff(moment(right.sendDate)) == 0) {
                    return -1;
                } else if(!left.reviewEnabled && right.reviewEnabled && moment(left.sendDate).diff(moment(right.sendDate)) == 0) {
                    return 1;
                } else {
                    return moment(left.sendDate).diff(moment(right.sendDate));
                }
            });
            res.status(200).json(allMessages);
        }
    });

    function sendEmail(to, subject, text) {
        console.log("sendEmail()");
        var locals = {
            email: to,
            subject: subject,
            messageText: text
        };
        mailer.sendOne('register', locals, function (error, responseStatus, html, text) {
            console.log("sendEmail() error", error);
            console.log("sendEmail() responseStatus", responseStatus);
            //console.log("html", html);
            // console.log("text", text);
        });
    };

    function getCalculatedPrices(listing) {
        console.log("getCalculatedPrices()");
        var calculatedPrices = JSON.parse(JSON.stringify(listing.prices));
        var pricingRules = listing.rules.pricing;
        pricingRules.forEach(function(rule) {
            switch(rule.event) {
                case "floatingPeriod":
                    var today = moment().tz(listing.airbnbTimeZone).startOf('day');
                    calculatedPrices.forEach(function(price, priceIndex) {
                        var priceDate = moment.tz(price.airbnbDate, "YYYY-MM-DD", listing.airbnbTimeZone).startOf('day');
                        var daysFromPriceDateTillToday = priceDate.diff(today, "days");
                        if(daysFromPriceDateTillToday >= rule.floatingPeriodStartDay && daysFromPriceDateTillToday < (rule.floatingPeriodStartDay + rule.floatingPeriodLength)) {
                            var ruleLength = rule.floatingPeriodLength;
                            var dayCount = rule.floatingPeriodStartDay + rule.floatingPeriodLength - daysFromPriceDateTillToday;
                            calculatedPrices[priceIndex] = calculatePrice(rule, price, ruleLength, dayCount);
                        }
                    });
                break;
                case "orphanPeriod":
                    var availablilityStreak = 0;
                    for(var k = 0; k < calculatedPrices.length; k++) {
                        while(calculatedPrices[k].airbnbAvailable && k < calculatedPrices.length) {
                            availablilityStreak++;
                            k++;
                        }
                        if(availablilityStreak <= rule.orphanPeriodLength) {
                            var ruleLength = availablilityStreak;
                            for(var i = 0; i < ruleLength; i++) {
                                var dayCount = ruleLength - i;
                                var price = calculatedPrices[k - i - 1];
                                calculatedPrices[k - i - 1] = calculatePrice(rule, price, ruleLength, dayCount);
                            }
                        }
                        availablilityStreak = 0;
                    }
                break;
                case "weekends":
                    calculatedPrices.forEach(function(price, priceIndex) {
                        var priceWeekdayNumber = moment(price.airbnbDate).isoWeekday();
                        if(priceWeekdayNumber > 4 && priceWeekdayNumber < 7) {
                            var ruleLength = 2;
                            var dayCount = priceWeekdayNumber - 5;
                            calculatedPrices[priceIndex] = calculatePrice(rule, price, ruleLength, dayCount);
                        }
                    });
                break;
                case "weekdays":
                    calculatedPrices.forEach(function(price, priceIndex) {
                        var priceWeekdayNumber = moment(price.airbnbDate).isoWeekday();
                        if(priceWeekdayNumber < 5 || priceWeekdayNumber > 6) {
                            var ruleLength = 5;
                            var dayCount = priceWeekdayNumber;
                            calculatedPrices[priceIndex] = calculatePrice(rule, price, ruleLength, dayCount);
                        }
                    });
                break;
                case "specificDates":
                    var startDate = moment(rule.specificDatesStartDate).startOf('day');
                    var endDate = moment(rule.specificDatesEndDate).startOf('day');
                    var daysInDateRange = endDate.diff(startDate, "days");
                    calculatedPrices.forEach(function(price, priceIndex) {
                        var priceDate = moment(price.airbnbDate).startOf('day');
                        if(priceDate.isBetween(startDate, endDate) || priceDate.isSame(startDate) || priceDate.isSame(endDate)) {
                            var ruleLength = daysInDateRange;
                            var dayCount = priceDate.diff(startDate, "days");
                            calculatedPrices[priceIndex] = calculatePrice(rule, price, ruleLength, dayCount);
                        }
                    });
                break;
            }
        });
        // Check min price
        calculatedPrices.forEach(function(price, priceIndex) {
            if(listing.minPrice && price.adjustedPrice < listing.minPrice) {
                var rule = {
                    title: "Minimum Listing Price",
                    scale: "fixedPrice",
                    amount: listing.minPrice,
                }
                var ruleLength;
                var dayCount;
                calculatedPrices[priceIndex] = calculatePrice(rule, price, ruleLength, dayCount);
            }
        });
        return calculatedPrices;
    }

    function calculatePrice(rule, price, ruleLength, dayCount) {
        //console.log("calculatePrice()");
        // default to price set on airbnb
        var adjustedPrice = price.airbnbNativePrice;
        if(price.adjustedPrice) {
            // if the price has already been adjusted use the adjusted price, this lets us put pricing rules on top of each other.
            adjustedPrice = price.adjustedPrice;
        } else if(price.airbnbNativeSuggestedPriceLevels) {
            // if there is no adjusted price but there is a smart price use the lowest smart price.
            adjustedPrice = price.airbnbNativeSuggestedPriceLevels[0];
        }
        var newAdjustedPrice;
        var equation;
        switch(rule.scale) {
            case "fixedPrice":
                newAdjustedPrice = parseInt(rule.amount);
                equation = "\\(\\mathsf{\\$" + newAdjustedPrice + " = \\$" + rule.amount + "}\\)";
            break;
            case "fixedPercentage":
                newAdjustedPrice = parseInt((rule.amount/100) * adjustedPrice + adjustedPrice);
                equation = "\\(\\mathsf{\\$" + newAdjustedPrice + " = " + rule.amount + "\\% \\times \\$" + adjustedPrice + " + \\$" + adjustedPrice + "}\\)";
            break;
            case "gradualPrice":
                newAdjustedPrice = parseInt((rule.amount/ruleLength) * dayCount + adjustedPrice);
                equation = "\\(\\mathsf{\\$" + newAdjustedPrice + " = \\frac{\\$" + rule.amount + "}{" + ruleLength + "\\text{ days}} \\times " + dayCount + "\\text{ days} \\times \\$" + adjustedPrice + "}\\)";
            break;
            case "gradualPercentage":
                newAdjustedPrice = parseInt(((rule.amount/100)/ruleLength) * dayCount * adjustedPrice + adjustedPrice);
                equation = "\\(\\mathsf{\\$" + newAdjustedPrice + " = \\frac{" + rule.amount + "\\%}{" + ruleLength + "\\text{ days}} \\times " + dayCount + "\\text{ days} \\times \\$" + adjustedPrice + " + \\$" + adjustedPrice + "}\\)";
            break;
        }
        var appliedRule = JSON.parse(JSON.stringify(rule));
        appliedRule.ruleLength = ruleLength;
        appliedRule.dayCount = dayCount;
        appliedRule.adjustedPrice = newAdjustedPrice;
        appliedRule.equation = equation;
        price.adjustedPrice = newAdjustedPrice;
        if(price.appliedRules) {
            price.appliedRules.push(appliedRule);
        } else {
            price.appliedRules = [appliedRule];
        }
        return price;
    }

    async function updateListingPricing(user, account, listing, interval = 6) {
        console.log("updateListingPricing()");
        return new Promise(async function(resolve, reject) {
            var now = moment();
            if(listing.pricesUpdatedLast) {
                console.log("PRICING LAST SYNCED WITH AIRBNB " + now.diff(moment(listing.pricesUpdatedLast), "hour") + " HOUR(S) AGO");
            } else {
                console.log("PRICING HAS NEVER BEEN SYNCED WITH AIRBNB");
            }
            // Only update pricing when enabled
            // Only update pricing once per hour/day.
            if(listing.pricingEnabled && (!listing.pricesUpdatedLast || now.diff(moment(listing.pricesUpdatedLast), "hour") >= interval)) {
                Account.findOne(
                    // query
                    {
                        "username" : user.username,
                        "accounts.listings.airbnbListingID" : listing.airbnbListingID
                    },
                    async function(err, doc) {
                        if (err) {
                            handleError(res, err.message, "Failed to find Airbnb listing");
                        } else {
                            for(var k = 0; doc.accounts.length > k; k++) {
                                if(doc.accounts[k].airbnbUsername == account.airbnbUsername) {
                                    for(var n = 0; doc.accounts[k].listings.length > n; n++) {
                                        if(doc.accounts[k].listings[n].airbnbListingID == listing.airbnbListingID) {
                                            try {
                                                var calculatedPrices = getCalculatedPrices(listing);
                                                // Set new calculated prices on Airbnb
                                                for(var i = 0; i < calculatedPrices.length; i++) {
                                                    if(calculatedPrices[i].airbnbAvailable) {
                                                        var calculatedPrice = calculatedPrices[i];
                                                        var startDate = calculatedPrice.airbnbDate;
                                                        var endDate = calculatedPrice.airbnbDate;
                                                        var price = calculatedPrice.adjustedPrice;
                                                        await updatePricing(account, listing, startDate, endDate, price);
                                                        // Now set the stored nativePrice to the new calculated price we just set on Airbnb
                                                        doc.accounts[k].listings[n].prices.forEach(function(price, priceIndex) {
                                                            if(price.airbnbDate == calculatedPrice.airbnbDate) {
                                                                doc.accounts[k].listings[n].prices[priceIndex].airbnbNativePrice = calculatedPrice.adjustedPrice;
                                                            }
                                                        });
                                                    }
                                                }
                                                doc.accounts[k].listings[n].pricesUpdatedLast = moment().toDate();
                                            } catch (error) {
                                                console.log("error", error);
                                                reject(error);
                                            }
                                        }
                                    }
                                }
                            }
                            doc.save(function(error, updatedDoc){
                                resolve();
                            });
                        }
                    }
                );
            }
            resolve();
        });
    }

    function downloadSmartPricing(user, account, listing) {
        console.log("downloadSmartPricing()");
        return new Promise(async function(resolve, reject) {
            var airbnbUsername = account.airbnbUsername;
            var airbnbListingID = listing.airbnbListingID;
            var calendar = [];
            try {
                var startDate = moment().format("YYYY-MM-DD");
                var endDate = moment().add(365, 'd').format("YYYY-MM-DD");
                calendar = await getCalendar(account, airbnbListingID, startDate, endDate);
            } catch(error) {
                reject(error);
            }

            var prices = [];
            calendar.forEach(function(day) {
                var airbnbDate = day.date;
                var airbnbNativeSuggestedPriceLevels = day.price.native_suggested_price_levels;
                var airbnbNativeSuggestedPrice = day.price.native_suggested_price;
                var airbnbNativeSuggestedPricePercentage = parseInt(100 * airbnbNativeSuggestedPriceLevels[0] / airbnbNativeSuggestedPrice);
                var airbnbNativePrice = day.price.native_price;
                var airbnbAvailable = day.available;
                var newEntry = {
                    airbnbDate,
                    airbnbNativeSuggestedPrice,
                    airbnbNativeSuggestedPriceLevels,
                    airbnbNativeSuggestedPricePercentage,
                    airbnbNativePrice,
                    airbnbAvailable,
                };
                prices.push(newEntry);
            });

            Account.findOne(
                {
                    "username" : user.username,
                    "accounts.airbnbUsername" : account.airbnbUsername
                },
                function(error, doc) {
                    if (error) {
                        reject(error);
                    } else {
                        doc.accounts.forEach(function(account, accountIndex) {
                            if(account.airbnbUsername == airbnbUsername) {
                                console.log("Found matching airbnb username: " + account.airbnbUsername);
                                account.listings.forEach(function(listing, listingIndex) {
                                    if(listing.airbnbListingID == airbnbListingID) {
                                        console.log("Found matching airbnb listing: ", listing.airbnbListingID);
                                        doc.accounts[accountIndex].listings[listingIndex].prices = prices;
                                    }
                                });
                            }
                        });
                        doc.save(function(error, updatedDoc){
                            resolve();
                        });
                    }
                }
            );
        });
    };

    function updatePricing(account, listing, startDate, endDate, price) {
        //console.log("updatePricing()");
        return new Promise(async function(resolve, reject) {
            var airbnbListingID = listing.airbnbListingID;
            var endpoint = '/v2/calendars/' + airbnbListingID + '/' + startDate + '/' + endDate;
            var method = 'PUT';
            var headers = {'X-Airbnb-OAuth-Token': account.airbnbAccessToken};
            var body = {
                availability: "available",
                daily_price: price,
                demand_based_pricing_overridden: true,
            };

            var URLParams = {
                client_id: "9nwld6we4td9vkwj160teb49a",
                locale: "en-US",
                currency: "USD",
                _format: "host_calendar",
            };

            if(process.env.NODE_ENV == "production") {
                try {
                    var data = await performAirbnbRequest(account, endpoint, method, headers, body, URLParams);
                    resolve(data);
                } catch (err) {
                    reject(err);
                }
            } else {
                console.log("PRICING INTENTIONALLY DIDN'T UPDATE BECAUSE APP ISN'T IN PRODUCTION MODE");
                resolve();
            }
        });
    };

    app.get("/getReservations", function(req, res) {
        console.log("/getReservations");
        if(!req.user) {
            handleError(res, "User not logged in", "User not logged in", 403);
        } else {
            var allReservations = {};
            req.user.accounts.forEach(function(account, accountIndex) {
                account.reservations.forEach(function(reservation, reservationIndex) {
                    if(allReservations[reservation.airbnbListingID]) {
                        allReservations[reservation.airbnbListingID].push(reservation);
                    } else {
                        allReservations[reservation.airbnbListingID] = [reservation];
                    }
                });
            });
            res.status(200).json(allReservations);
        }
    });

    app.get("/getPrices", function(req, res) {
        console.log("/getPrices");
        if(!req.user) {
            handleError(res, "User not logged in", "User not logged in", 403);
        } else {
            var calculatedPrices = {};
            req.user.accounts.forEach(function(account, accountIndex) {
                account.listings.forEach(function(listing, listingIndex) {
                    calculatedPrices[listing.airbnbListingID] = getCalculatedPrices(listing);
                });
            });
            res.status(200).json(calculatedPrices);
        }
    });

    app.get("/updatePricing", function(req, res) {
        console.log("/updatePrices");
        Account.find({}, async function(err, doc) {
            if (err) {
                handleError(res, err.message, "Failed FIND");
            } else {
                res.status(200).json("All rules checked!");
                for(var j = 0; j < doc.length; j++) {
                    var user = doc[j];
                    for(var k = 0; k < user.accounts.length; k++) {
                        var account = user.accounts[k];
                        for(var i = 0; i < account.listings.length; i++) {
                            var listing = account.listings[i];
                            try {
                                await downloadSmartPricing(user, account, listing);
                                await updateListingPricing(user, account, listing);
                            } catch (error) {
                                handleError(res, err.message, "Error downloadSmartPricing(), updateListingPricing()");
                            }
                        }
                    }
                }
            }
        });
    });

    app.post("/forceUpdatePricing", async function(req, res) {
        console.log("/forceUpdatePricing");
        var airbnbListingID = req.body.airbnbListingID;
        if(!req.user) {
            handleError(res, "User not logged in", "User not logged in", 403);
        } else {
            for(var k = 0; k < req.user.accounts.length; k++) {
                var account = req.user.accounts[k];
                for(var i = 0; i < account.listings.length; i++) {
                    var listing = account.listings[i];
                    if(listing.airbnbListingID == airbnbListingID) {
                        try {
                            await downloadSmartPricing(req.user, account, listing);
                            await updateListingPricing(req.user, account, listing, 1);
                        } catch (error) {
                            handleError(res, error.message, "downloadSmartPricing(), updateListingPricing()");
                        }
                    }
                }
            }
            res.status(200).json("success");
        }
    });

    app.post('/addPricingRule', function(req, res){
        console.log("/addPricingRule");
        if(!req.user) {
            handleError(res, "User not logged in", "User not logged in", 403);
        } else {
            var airbnbListingID = req.body.airbnbListingID;
            var _id = req.body._id;
            var title = req.body.title;
            var event = req.body.event;
            var amount = req.body.amount;
            var scale = req.body.scale;
            var floatingPeriodStartDay = req.body.floatingPeriodStartDay;
            var floatingPeriodLength = req.body.floatingPeriodLength;
            var orphanPeriodLength = req.body.orphanPeriodLength;
            var specificDatesStartDate = req.body.specificDatesStartDate;
            var specificDatesEndDate = req.body.specificDatesEndDate;

            Account.findOne(
                // query
                {
                    "username" : req.user.username,
                    "accounts.listings.airbnbListingID" : airbnbListingID
                },
                function(err, doc) {
                    if (err) {
                        handleError(res, err.message, "Failed to find Airbnb listing");
                    } else {
                        doc.accounts.forEach(function(account, accountIndex) {
                            account.listings.forEach(function(listing, listingIndex) {
                                if(listing.airbnbListingID ==  airbnbListingID) {
                                    console.log("airbnbListingID", airbnbListingID);
                                    // Check if it's a new rule or we're updating a rule
                                    if(_id) {
                                        listing.rules.pricing.forEach(function(priceRule, priceRuleIndex) {
                                            if(_id == priceRule._id) {
                                                doc.accounts[accountIndex].listings[listingIndex].rules.pricing[priceRuleIndex] = {
                                                    _id,
                                                    title,
                                                    event,
                                                    amount,
                                                    scale,
                                                    floatingPeriodStartDay,
                                                    floatingPeriodLength,
                                                    orphanPeriodLength,
                                                    specificDatesStartDate,
                                                    specificDatesEndDate,
                                                };
                                            }
                                        });
                                    } else {
                                        doc.accounts[accountIndex].listings[listingIndex].rules.pricing.push({
                                            title,
                                            event,
                                            amount,
                                            scale,
                                            floatingPeriodStartDay,
                                            floatingPeriodLength,
                                            orphanPeriodLength,
                                            specificDatesStartDate,
                                            specificDatesEndDate,
                                        });
                                    }
                                }
                            });
                        });
                        doc.save(function(err, updatedDoc){
                            res.status(200).json("success");
                        });
                    }
                }
            );
        }
    });

    app.post('/deletePricingRule', function(req, res){
        console.log("/deletePricingRule");
        if(!req.user) {
            handleError(res, "User not logged in", "User not logged in", 403);
        } else {
            var _id = req.body._id;
            Account.findOne(
                // query
                {
                    "username" : req.user.username,
                    "accounts.listings.rules.pricing._id" : _id
                },
                function(err, doc) {
                    if (err) {
                        handleError(res, err.message, "Failed to find Airbnb listing");
                    } else {
                        doc.accounts.forEach(function(account, accountIndex) {
                            account.listings.forEach(function(listing, listingIndex) {
                                listing.rules.pricing.forEach(function(price, priceIndex) {
                                    if(price._id ==  _id) {
                                        doc.accounts[accountIndex].listings[listingIndex].rules.pricing.splice(priceIndex, 1);
                                    }
                                });
                            });
                        });
                        doc.save(function(err, updatedDoc){
                            //console.log("updatedDoc", updatedDoc);
                            res.status(200).json("success");
                        });
                    }
                }
            );
        }
    });

    app.post('/enablePricing', function(req, res){
        console.log("/enablePricing");
        if(!req.user) {
            handleError(res, "User not logged in", "User not logged in", 403);
        } else {
            var pricingEnabled = req.body.pricingEnabled;
            var airbnbListingID = req.body.airbnbListingID;
            Account.findOne(
                // query
                {
                    "username" : req.user.username,
                    "accounts.listings.airbnbListingID" : airbnbListingID
                },
                function(err, doc) {
                    if (err) {
                        handleError(res, err.message, "Failed to find Airbnb listing");
                    } else {
                        doc.accounts.forEach(function(account, accountIndex) {
                            account.listings.forEach(function(listing, listingIndex) {
                                if(listing.airbnbListingID == airbnbListingID) {
                                    doc.accounts[accountIndex].listings[listingIndex].pricingEnabled = pricingEnabled;
                                }
                            });
                        });
                        doc.save(function(err, updatedDoc){
                            //console.log("updatedDoc", updatedDoc);
                            res.status(200).json("success");
                        });
                    }
                }
            );
        }
    });



    app.get("/test", async function(req, res) {
        console.log("/test");
        var airbnbListingID = "871044";
        if(!req.user) {
            handleError(res, "User not logged in", "User not logged in", 403);
        } else {
            for(var k = 0; k < req.user.accounts.length; k++) {
                var account = req.user.accounts[k];
                var airbnbThreadID = 334397422; // Thread ID Ranie
                var airbnbReviewID = 149970088; // Review ID Ranie
                //var data = await getMessages(account);
                try {
                    //var data = await getThread(account, airbnbThreadID);//334397422); // Use this to get review ID using the threadID
                    //var data = await getReview(account, airbnbReviewID); // Use this to view the review.  Check review.as_submitted true/false
                    //var data = await putReview(account, airbnbReviewID, "Raina was a great guest.  Would be happy to host her again anytime."); // leave review
                    var data = await dashBoardAlerts(account);

                } catch (error) {
                    handleError(res, error.message, "/test dashBoardAlerts()");
                }


            }
            res.status(200).json(data);
        }
    });


    function dashBoardAlerts(account) {
        console.log("dashBoardAlerts()");
        return new Promise(async function(resolve, reject) {
            var endpoint = '/v2/dashboard_alerts';
            var method = 'GET';
            var headers = {'X-Airbnb-OAuth-Token': account.airbnbAccessToken};
            var body = {};
            var URLParams = {
                client_id: "3092nxybyb0otqw18e8nh5nty",
                locale: "en-US",
                currency: "USD",
                scope: "host_home",
                // role: "host",
                // reviewable_type: "hosting",
                // reviewable_id: "334397422",
            };
            try {
                var data = await performAirbnbRequest(account, endpoint, method, headers, body, URLParams);
                resolve(data);
            } catch (error) {
                reject(error);
            }
        });
    }

    function getThread(account, airbnbThreadID) {
        console.log("getThread()");
        return new Promise(async function(resolve, reject) {
            var endpoint = '/v2/threads/' + airbnbThreadID;
            var method = 'GET';
            var headers = {'X-Airbnb-OAuth-Token': account.airbnbAccessToken};
            var body = {};
            var URLParams = {
                client_id: "3092nxybyb0otqw18e8nh5nty",
                locale: "en-US",
                currency: "USD",
                _format: "for_messaging_sync_with_posts",
                selected_inbox_type: "host",
            };
            try {
                var data = await performAirbnbRequest(account, endpoint, method, headers, body, URLParams);
                resolve(data.thread);
            } catch (error) {
                reject(error);
            }
        });
    }

    function getReview(account, airbnbReviewID) {
        console.log("getReview()");
        return new Promise(async function(resolve, reject) {
            var endpoint = '/v2/reviews/' + airbnbReviewID;
            var method = 'GET';
            var headers = {'X-Airbnb-OAuth-Token': account.airbnbAccessToken};
            var body = {};
            var URLParams = {
                client_id: "3092nxybyb0otqw18e8nh5nty",
                locale: "en-US",
                currency: "USD",
                _format: "as_author",
            };
            try {
                var data = await performAirbnbRequest(account, endpoint, method, headers, body, URLParams);
                resolve(data);
            } catch (error) {
                reject(error);
            }
        });
    }

    function putReview(account, airbnbReviewID, comments) {
        console.log("putReview()");
        return new Promise(async function(resolve, reject) {
            var endpoint = '/v2/reviews/' + airbnbReviewID;
            var method = 'PUT';
            var headers = {'X-Airbnb-OAuth-Token': account.airbnbAccessToken};
            var body = {
                recommend: 1,
                private_feedback: "",
                comments: comments,//"Great guest. They left the apartment very clean. We would love to have them back anytime. ",
                cleanliness: 5,
                rating: 5,
                respect_house_rules: 5,
                communication: 5,
            };
            var URLParams = {
                client_id: "3092nxybyb0otqw18e8nh5nty",
                locale: "en-US",
                currency: "USD",
                _format: "as_author",
            };

            if(process.env.NODE_ENV == "production") {
                try {
                    var data = await performAirbnbRequest(account, endpoint, method, headers, body, URLParams);
                    console.log("putReview() data", data);
                    resolve(data);
                } catch (error) {
                    reject(error);
                }
            } else {
                console.log("REVIEW INTENTIONALLY WAS NOT SUBMITTED BECAUSE APP ISN'T IN PRODUCTION MODE");
                resolve();
            }
        });
    }
};
