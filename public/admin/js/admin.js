angular.module("adminApp", ['ngRoute', 'mgcrea.ngStrap', 'mwl.calendar', 'angularMoment', 'dndLists'])
    .config(function($routeProvider) {
        $routeProvider
            .when("/", {
                templateUrl: "pages/dashboard.html",
                controller: "DashboardController",
                resolve: {
                    accounts: function(Data) {
                        return Data.getAccounts();
                    },
                    messages: function(Data) {
                        return Data.getMessages();
                    },
                }
            })
            .when("/messageRules/:airbnbListingID", {
                templateUrl: "pages/messageRules.html",
                controller: "MessageRulesController",
                resolve: {
                    accounts: function(Data) {
                        return Data.getAccounts();
                    },
                }
            })
            .when("/calendar/:airbnbListingID", {
                templateUrl: "pages/calendar.html",
                controller: "CalendarController",
                resolve: {
                    accounts: function(Data) {
                        return Data.getAccounts();
                    },
                    prices: function(Data) {
                        return Data.getPrices();
                    },
                    reservations: function(Data) {
                        return Data.getReservations();
                    },
                }
            })
            .otherwise({
                redirectTo: "/"
            });
    })
    .config(['calendarConfig', function(calendarConfig) {

        // View all available config
        console.log(calendarConfig);

        // This will display all events on a month view even if they're not in the current month. Default false.
        calendarConfig.displayAllMonthEvents = true;

    }])
    .service("Data", function($http) {
        this.getAccounts = function() {
            return $http.get("/getAccounts")
                .then(function(response) {
                    return response.data;
                }, function(response) {
                    if(response && response.error && response.error.error_code == 403) {
                        window.location.reload();
                    } else {
                        return response.data;
                    }
                });
        };
        this.getMessages = function() {
            return $http.get("/getMessages")
                .then(function(response) {
                    return response.data;
                }, function(response) {
                    if(response && response.error && response.error.error_code == 403) {
                        window.location.reload();
                    } else {
                        return response.data;
                    }
                });
        };
        this.getPrices = function() {
            return $http.get("/getPrices")
                .then(function(response) {
                    return response.data;
                }, function(response) {
                    if(response && response.error && response.error.error_code == 403) {
                        window.location.reload();
                    } else {
                        return response.data;
                    }
                });
        };
        this.getReservations = function() {
            return $http.get("/getReservations")
                .then(function(response) {
                    return response.data;
                }, function(response) {
                    if(response && response.error && response.error.error_code == 403) {
                        window.location.reload();
                    } else {
                        return response.data;
                    }
                });
        };
    })
    .controller("MainController", function($scope, $modal, $http, $route) {
        console.log("MainController");

        // CHECK THIS
        $(".nav").on('click', function(){
            $(".navbar-toggle").click();
        });

        $scope.accounts = [];
        $scope.listings = [];

        var addAccountModal = $modal({
            scope: $scope,
            templateUrl: 'pages/addAccountModal.html',
            show: false,
            backdrop: 'static',
            keyboard: false
        });

        $scope.resetAddAccountForm = function() {
            console.log("resetAddAccountForm()");
            $scope.addAccountData = {
                airbnbUsername: "",
                password: "",
            };
            $scope.addAccountProcessing = false;
        };
        $scope.showAddAccount = function(airbnbUsername) {
            console.log("showAddAccount()");
            $scope.addAccountData.airbnbUsername = airbnbUsername;
            addAccountModal.$promise.then(addAccountModal.show);
        };
        $scope.hideAddAccount = function() {
            console.log("hideAddAccount()");
            addAccountModal.$promise.then(addAccountModal.hide);
            $scope.resetAddAccountForm();
        };

        // create a blank object to handle form data.
        $scope.addAccountData = {};
        $scope.addAccountProcessing = false;
          // function to submit the form after all validation has occurred
        $scope.submitAddAccountForm = function(isValid) {
            console.log("submitAddAccountForm()");
            // check to make sure the form is completely valid
            if (isValid) {
                $scope.addAccountProcessing = true;
                // Posting data to server
                $http.post('../addAccount', $scope.addAccountData)
                .success(function(data) {
                    $scope.addAccountProcessing = false;
                    if (data.errors) {
                        console.log(data.errors);
                        $scope.addAccountError = "There was an issue logging into your account, please try again.";
                        // $location.path('/admin/#/');
                    } else {
                        $scope.addAccountError = "";
                        $route.reload();
                        $scope.hideAddAccount();
                    }
                })
                .error(function (error) {
                    console.log(error);
                    $scope.addAccountProcessing = false;
                    $scope.addAccountError = "The Airbnb username and/or password supplied are incorrect.  Please try again.";
                });
            }
        };

        $scope.getOption = function(array, value) {
            for (var i = 0; array.length > i; i++) {
                if(array[i].value == value) {
                    return array[i];
                }
            }
        };

        var listingSettingsModal = $modal({
            scope: $scope,
            templateUrl: 'pages/listingSettingsModal.html',
            show: false,
            backdrop: 'static',
            keyboard: false
        });

        $scope.resetListingSettingsForm = function() {
            console.log("resetListingSettingsForm()");
            $scope.listingSettings = {
                nickname: "",
                minPrice: "",
            };
        };
        $scope.resetListingSettingsForm();

        $scope.showListingSettings = function(listing) {
            console.log("showListingSettings()");
            $scope.listingSettings.airbnbListingID = listing.airbnbListingID;
            $scope.listingSettings.airbnbName = listing.airbnbName;
            $scope.listingSettings.nickname = listing.nickname;
            $scope.listingSettings.minPrice = listing.minPrice;
            listingSettingsModal.$promise.then(listingSettingsModal.show);
        };
        $scope.hideListingSettings = function() {
            console.log("hideListingSettings()");
            listingSettingsModal.$promise.then(listingSettingsModal.hide);
            $scope.resetListingSettingsForm();
        };
        // function to submit the form after all validation has occurred
        $scope.submitEditListingSettingsForm = function(isValid) {
            console.log("submitEditListingSettingsForm()");
            // check to make sure the form is completely valid
            if (isValid) {
                var data = {
                    airbnbListingID: $scope.listingSettings.airbnbListingID,
                    nickname: $scope.listingSettings.nickname,
                    minPrice: $scope.listingSettings.minPrice,
                };
                // Posting data to server
                $http.post('../editListingSettings', data)
                .success(function(data) {
                    if (data.errors) {
                        console.log(data.errors);
                        $location.path('/admin/#/');
                    } else if(data == "success") {
                        $scope.hideListingSettings();
                        $route.reload();
                    }
                })
                .error(function (error) {
                    console.log(error);
                    if(error.error.error_code == 403) {
                        $location.path('/admin/#/');
                    }
                });
            }
        };
    })
    .controller("DashboardController", function($scope, $modal, $http, $route, accounts, messages, Data, $location) {
        console.log("DashboardController");
        $scope.showPastMessages = false;
        function init(messages, accounts) {
            console.log("init()");
            if(messages && messages.error && messages.error.error_code) {
                $scope.error = messages;
                $scope.messages = [];
            } else if(messages && messages.length) {
                $scope.messages = messages;
            } else {
                $scope.messages = [];
            }
            if(accounts && accounts.error && accounts.error.error_code) {
                $scope.error = accounts;
                accounts = [];
            }
            $scope.accounts = [];
            $scope.listings = [];
            $scope.$parent.accounts = [];
            $scope.$parent.listings = [];
            $scope.messageRules = [];
            $scope.badAccounts = [];
            accounts.forEach(function(account) {
                if(account.lastLoginAttemptSuccessful) {
                    $scope.accounts.push(account);
                    $scope.$parent.accounts.push(account);
                    account.listings.forEach(function(listing) {
                        $scope.listings.push(listing);
                        $scope.$parent.listings.push(listing);
                        $scope.messageRules = $scope.messageRules.concat(listing.rules.messages);
                    });
                } else {
                    $scope.badAccounts.push(account);
                }
            });
        }

        init(messages, accounts);

        $scope.disableMessage = function(message) {
            console.log("disableMessage()");
            var data = {
                airbnbListingID: message.reservation.airbnbListingID,
                disable: !message.disable,
                airbnbConfirmationCode: message.airbnbConfirmationCode,
                messageRuleID: message.messageRuleID,
            };
            // Posting data to server
            $http.post('../disableMessage', data)
            .success(function(data) {
                if (data.errors) {
                    console.log(data.errors);
                    $location.path('/admin/#/');
                } else if(data == "success") {
                    Data.getMessages().then(function(messages){
                        Data.getAccounts().then(function(accounts){
                            init(messages, accounts);
                        });
                    });
                }
            })
            .error(function (error) {
                console.log(error);
                if(error.error.error_code == 403) {
                    $location.path('/admin/#/');
                }
            });
        };

        $scope.disableReview = function(message) {
            console.log("disableReview()");
            var data = {
                airbnbListingID: message.reservation.airbnbListingID,
                disable: !message.disable,
                airbnbConfirmationCode: message.airbnbConfirmationCode,
                messageRuleID: message.messageRuleID,
            };
            // Posting data to server
            $http.post('../disableReview', data)
            .success(function(data) {
                if (data.errors) {
                    console.log(data.errors);
                    $location.path('/admin/#/');
                } else if(data == "success") {
                    Data.getMessages().then(function(messages){
                        Data.getAccounts().then(function(accounts){
                            init(messages, accounts);
                        });
                    });
                }
            })
            .error(function (error) {
                console.log(error);
                if(error.error.error_code == 403) {
                    $location.path('/admin/#/');
                }
            });
        };

        var confirmModal = $modal({
            scope: $scope,
            templateUrl: 'pages/confirmModal.html',
            show: false,
            backdrop: 'static',
            keyboard: false
        });

        $scope.showConfirm = function(airbnbUsername) {
            console.log("showConfirm()");
            $scope.deleteAccountData = {airbnbUsername: airbnbUsername};
            $scope.confirmTitle = "Delete Account?";
            $scope.confirmMessage = "Are you sure you would like to delete this account?";
            $scope.confirmButtonText = "Delete";
            confirmModal.$promise.then(confirmModal.show);
        };
        $scope.hideConfirm = function(isDelete) {
            console.log("hideConfirm()");
            confirmModal.$promise.then(confirmModal.hide);
            if(isDelete) {
                // Posting data to server
                $http.post('../deleteAccount', $scope.deleteAccountData)
                .success(function(data) {
                    $route.reload();
                })
                .error(function (error) {
                    $route.reload();
                });
            }
        };
    })
    .controller("MessageRulesController", function($scope, $routeParams, $location, $window, accounts, TextInsert, $http, $route, $modal, $route) {
        console.log("MessageRulesController");
        var airbnbListingID = $routeParams.airbnbListingID;
        if(!airbnbListingID || !accounts) {
            window.location.reload();
        }
        if(accounts && accounts.error && accounts.error.error_code) {
            $scope.error = accounts;
            accounts = [];
        }
        $scope.$parent.listings = [];
        accounts.forEach(function(account) {
            account.listings.forEach(function(listing) {
                $scope.$parent.listings.push(listing);
                if(listing.airbnbListingID == airbnbListingID) {
                    $scope.listing = listing;
                    $scope.messageRules = listing.rules.messages;
                }
            });
        });
        if(!$scope.listing) {
            console.log("No listing matching the listing ID was found");
            $location.path('/admin/#/');
        }

        $scope.templates = [{
                value: "booking",
                text: "Booking Confirmation Message Template"
            },{
                value: "checkin",
                text: "Check-in Message Template"
            },{
                value: "checkup",
                text: "Check-up Message Template"
            },{
                value: "checkout",
                text: "Check-out Message Template"
            },{
                value: "review",
                text: "Review Guest Template"
            },{
                value: "custom",
                text: "Custom Message"
            }
        ];
        $scope.days = [{
                value: "-5",
                text: "5 Days Before"
            },{
                value: "-4",
                text: "4 Days Before"
            },{
                value: "-3",
                text: "3 Days Before"
            },{
                value: "-2",
                text: "2 Days Before"
            },{
                value: "-1",
                text: "1 Day Before"
            },{
                value: "0",
                text: "On the Day of"
            },{
                value: "1",
                text: "1 Day After"
            },{
                value: "2",
                text: "2 Days After"
            },{
                value: "3",
                text: "3 Days After"
            },{
                value: "4",
                text: "4 Days After"
            },{
                value: "5",
                text: "5 Days After"
            }
        ];
        $scope.time = [];
        var i = 0;
        while(i < 24) {
            var period = "AM";
            if(i > 11) {
                period = "PM";
            }
            var timeNumber = i;
            if(i === 0) {
                timeNumber = 12;
            } else if(i > 12) {
                timeNumber = i - 12;
            }
            $scope.time.push({
                value: i,
                text: timeNumber + period,
            });
            i++;
        }
        $scope.events = [{
            value: "checkin",
            text: "Check-in"
        }, {
            value: "checkout",
            text: "Check-out"
        }, {
            value: "booking",
            text: "Booking Confirmation"
        }];
        $scope.minNights = [{
                value: 1,
                text: "No Minimum"
            },{
                value: 2,
                text: "At Least 2 Nights"
            },{
                value: 3,
                text: "At Least 3 Nights"
            },{
                value: 4,
                text: "At Least 4 Nights"
            },{
                value: 5,
                text: "At Least 5 Nights"
            }
        ];

        $scope.isBooking = false;
        $scope.onEventChange = function() {
            console.log("onEventChange()");
            $scope.newRule.template = $scope.getOption($scope.templates, "custom");
            if($scope.newRule.event.value == "booking") {
                $scope.isBooking = true;
                $scope.time.push({
                    value: "-1",
                    text: "Instantly"
                });
                $scope.newRule.time = $scope.time[$scope.time.length - 1];
                $scope.newRule.days = $scope.days[5];
                $scope.newRule.minNights = $scope.minNights[0];
            } else {
                if($scope.isBooking) {
                    $scope.isBooking = false;
                    $scope.time.pop();
                    $scope.newRule.time = $scope.time[17];
                }
            }
        };

        $scope.onTemplateChange = function() {
            console.log("onTemplateChange()");
            $scope.resetMessageRuleForm($scope.newRule.template.value);
        };

        $scope.resetMessageRuleForm = function(template) {
            console.log("resetMessageRuleForm()");
            $scope.isBooking = false;
            switch(template) {
                case "booking":
                    // This one is tricky.  Have to set the event, title and message, then trigger the onEventChange and then set the template
                    $scope.newRule = {
                        _id: $scope.newRule._id,
                        title: "Booking Confirmation Rule",
                        message: "Hi {{Guest Name}},\n\n" +

                            "Thanks for booking our place.  I'll send you more details including check-in instructions soon but " +
                            "in the meantime, if you have any questions please don't hesitate to ask.",
                        event: $scope.getOption($scope.events, "booking"),
                        lastMinuteMessageEnabled: false,
                        lastMinuteMessageIsTheSame : false,
                        lastMinuteMessage: "",
                        reviewEnabled: false,
                        reviewMessage: "",
                        sendMessageAfterLeavingReview: true,
                        airbnbListingID: $scope.listing.airbnbListingID,
                    };
                    $scope.newRule.event = $scope.getOption($scope.events, "booking");
                    $scope.onEventChange();
                    $scope.newRule.template = $scope.getOption($scope.templates, "booking");
                break;
                case "checkin":
                    $scope.newRule = {
                        _id: $scope.newRule._id,
                        template: $scope.getOption($scope.templates, template),
                        title: "Check-in Rule",
                        time: $scope.time[17],
                        days: $scope.getOption($scope.days, "-2"),
                        event: $scope.getOption($scope.events, "checkin"),
                        minNights: $scope.getOption($scope.minNights, 1),
                        message: "Hi {{Guest Name}},\n\n" +

                            "Just wanted to touch base and give you some more information about your stay.  You are welcome " +
                            "to check-in anytime after {{Check-In Time}} {{Check-In Date}}.  Your checkout time " +
                            "is {{Check-Out Time}} {{Check-Out Date}}.\n\n" +

                            "LOCATION:\n" +
                            "1234 Main St, City, State Zip\n\n" +

                            "KEY:\n" +
                            "The key will be in a small lock box (aka. key safe) near the front door. The code " +
                            "is 1234.  Please don't forget to return the key to the lock box when you leave :)\n\n" +

                            "PARKING:\n" +
                            "You're welcome to park in the drive way and there is also always plenty of free street parking.\n\n" +

                            "WIFI:\n" +
                            "The wifi network is \"WIFINETWORKSSID\" and the password is \"PASSWORD\".\n\n" +

                            "More information about the apartment and neighborhood can be found in the 'House Manual' on airbnb.com.\n\n" +

                            "Please let us know if you have any questions and I hope you enjoy your stay.",
                        lastMinuteMessageEnabled: true,
                        lastMinuteMessageIsTheSame : false,
                        lastMinuteMessage: "Hi {{Guest Name}},\n\n" +

                            "Thanks for booking our place.  You are welcome " +
                            "to check-in anytime after {{Check-In Time}} {{Check-In Date}}.  Your checkout time " +
                            "is {{Check-Out Time}} {{Check-Out Date}}.\n\n" +

                            "LOCATION:\n" +
                            "1234 Main St, City, State Zip\n\n" +

                            "KEY:\n" +
                            "The key will be in a small lock box (aka. key safe) near the front door. The code " +
                            "is 1234.  Please don't forget to return the key to the lock box when you leave :)\n\n" +

                            "PARKING:\n" +
                            "You're welcome to park in the drive way and there is also always plenty of free street parking.\n\n" +

                            "WIFI:\n" +
                            "The wifi network is \"WIFINETWORKSSID\" and the password is \"PASSWORD\".\n\n" +

                            "More information about the apartment and neighborhood can be found in the 'House Manual' on airbnb.com.\n\n" +

                            "Please let us know if you have any questions and I hope you enjoy your stay.",
                        reviewEnabled: false,
                        reviewMessage: "",
                        sendMessageAfterLeavingReview: true,
                        airbnbListingID: $scope.listing.airbnbListingID,
                    };
                break;
                case "checkup":
                    $scope.newRule = {
                        _id: $scope.newRule._id,
                        template: $scope.getOption($scope.templates, template),
                        title: "Check-up Rule",
                        time: $scope.time[10],
                        days: $scope.getOption($scope.days, "1"),
                        event: $scope.getOption($scope.events, "checkin"),
                        minNights: $scope.getOption($scope.minNights, 2),
                        message: "Hi {{Guest Name}},\n\n" +

                            "Just wanted to check in and make sure you have everything you need?\n\n" +

                            "Hope you're enjoying your stay!",
                        lastMinuteMessageEnabled: false,
                        lastMinuteMessageIsTheSame : false,
                        lastMinuteMessage: "",
                        reviewEnabled: false,
                        reviewMessage: "",
                        sendMessageAfterLeavingReview: true,
                        airbnbListingID: $scope.listing.airbnbListingID,
                    };
                break;
                case "checkout":
                    $scope.newRule = {
                        _id: $scope.newRule._id,
                        template: $scope.getOption($scope.templates, template),
                        title: "Check-out Rule",
                        time: $scope.time[17],
                        days: $scope.getOption($scope.days, "-1"),
                        event: $scope.getOption($scope.events, "checkout"),
                        minNights: $scope.getOption($scope.minNights, 2),
                        message: "Hi {{Guest Name}},\n\n" +
                            "Just a reminder that your check-out is tomorrow at {{Check-Out Time}}.  " +
                            "When you are ready to leave, please lock the door and put the keys back in the lock box.  " +
                            "Once you have left, would you please message me so I can let the cleaners know?\n\n" +

                            "Hope you had a great time.\n\n" +

                            "Happy travels!",
                        lastMinuteMessageEnabled: false,
                        lastMinuteMessageIsTheSame : false,
                        lastMinuteMessage: "",
                        reviewEnabled: false,
                        reviewMessage: "",
                        sendMessageAfterLeavingReview: true,
                        airbnbListingID: $scope.listing.airbnbListingID,
                    };
                break;
                case "review":
                    $scope.newRule = {
                        _id: $scope.newRule._id,
                        template: $scope.getOption($scope.templates, template),
                        title: "Review Guest Rule",
                        time: $scope.time[16],
                        days: $scope.getOption($scope.days, "0"),
                        event: $scope.getOption($scope.events, "checkout"),
                        minNights: $scope.getOption($scope.minNights, 1),
                        message: "Hi {{Guest Name}},\n\n" +

                            "Thanks for being such a great guest and leaving the place so clean.  " +
                            "We left you a 5 star review and if you enjoyed your stay it would be great if you left us a review as well.  " +
                            "If there is anything that could have made your stay better please send us a message.  " +
                            "Thanks again for booking our place.\n\n" +

                            "Hope to see you next time you're in town!",
                        lastMinuteMessageEnabled: false,
                        lastMinuteMessageIsTheSame : false,
                        lastMinuteMessage: "",
                        reviewEnabled: true,
                        reviewMessage: "What a great guest!  Would be happy to host {{Guest Name}} again anytime!",
                        sendMessageAfterLeavingReview: true,
                        airbnbListingID: $scope.listing.airbnbListingID,
                    };
                break;
                case "custom":
                break;
                default:
                    $scope.newRule = {
                        template: $scope.getOption($scope.templates, "custom"),
                        title: "",
                        time: $scope.time[17],
                        days: $scope.getOption($scope.days, "-2"),
                        event: $scope.getOption($scope.events, "checkout"),
                        minNights: $scope.getOption($scope.minNights, 1),
                        message: "",
                        lastMinuteMessageEnabled: false,
                        lastMinuteMessageIsTheSame : false,
                        lastMinuteMessage: "",
                        reviewEnabled: false,
                        reviewMessage: "",
                        sendMessageAfterLeavingReview: true,
                        airbnbListingID: $scope.listing.airbnbListingID,
                        _id: false,
                    };
                break;
            }
        };
        $scope.resetMessageRuleForm();

        $scope.editMessageRule = function(messageRule) {
            console.log("editMessageRule()");
            $scope.newRule = {
                template: $scope.getOption($scope.templates, "custom"),
                title: messageRule.title,
                time: $scope.getOption($scope.time, messageRule.time),
                days: $scope.getOption($scope.days, messageRule.days),
                event: $scope.getOption($scope.events, messageRule.event),
                minNights: $scope.getOption($scope.minNights, messageRule.minNights),
                message: messageRule.message,
                lastMinuteMessageEnabled: messageRule.lastMinuteMessageEnabled,
                lastMinuteMessageIsTheSame : messageRule.message == messageRule.lastMinuteMessage,
                lastMinuteMessage: messageRule.lastMinuteMessage,
                reviewEnabled: messageRule.reviewEnabled,
                reviewMessage: messageRule.reviewMessage,
                sendMessageAfterLeavingReview: messageRule.sendMessageAfterLeavingReview,
                airbnbListingID: $scope.listing.airbnbListingID,
                _id: messageRule._id,
            };
            $scope.onEventChange();
            $scope.showEditMessageRulesModal();
        };

        // Pre-fetch an external template populated with a custom scope
        var editMessageRulesModal = $modal({
            scope: $scope,
            templateUrl: 'pages/editMessageRulesModal.html',
            show: false,
            backdrop: 'static',
            keyboard: false
        });
        $scope.showEditMessageRulesModal = function() {
            editMessageRulesModal.$promise.then(editMessageRulesModal.show);
        };
        $scope.hideEditMessageRulesModal = function() {
            editMessageRulesModal.$promise.then(editMessageRulesModal.hide);
            $scope.resetMessageRuleForm();
        };

        $scope.deleteMessageRule = function(messageRule) {
            console.log("deleteMessageRule()");
            var data = {
                _id: messageRule._id
            };
            // Posting data to server
            $http.post('../deleteMessageRule', data)
            .success(function(data) {
                if (data.errors) {
                    console.log(data.errors);
                    $location.path('/admin/#/');
                } else if(data == "success") {
                    $route.reload();
                }
            })
            .error(function (error) {
                console.log(error);
                if(error.error.error_code == 403) {
                    $location.path('/admin/#/');
                }
            });
        };
        // function to submit the form after all validation has occurred
        $scope.submitAddMessageRuleForm = function(isValid) {
            console.log("submitAddMessageRuleForm()");
            // check to make sure the form is completely valid
            if (isValid) {
                var lastMinuteMessage = "";
                var lastMinuteMessageEnabled = $scope.newRule.lastMinuteMessageEnabled === true; // Without this, unchecked will return undefined
                var reviewEnabled = false;
                var sendMessageAfterLeavingReview = false;
                if(lastMinuteMessageEnabled) {
                    lastMinuteMessage = $scope.newRule.lastMinuteMessage;
                } else {
                    reviewEnabled = $scope.newRule.reviewEnabled === true; // Without this, unchecked will return undefined
                    sendMessageAfterLeavingReview = $scope.newRule.sendMessageAfterLeavingReview === true; // Without this, unchecked will return undefined
                }
                var data = {
                    time: $scope.newRule.time.value,
                    days: $scope.newRule.days.value,
                    event: $scope.newRule.event.value,
                    minNights: $scope.newRule.minNights.value,
                    airbnbListingID: $scope.newRule.airbnbListingID,
                    message: $scope.newRule.message,
                    lastMinuteMessage: lastMinuteMessage,
                    lastMinuteMessageEnabled: lastMinuteMessageEnabled,
                    reviewEnabled: reviewEnabled,
                    reviewMessage: $scope.newRule.reviewMessage,
                    sendMessageAfterLeavingReview: sendMessageAfterLeavingReview,
                    title: $scope.newRule.title,
                    _id: $scope.newRule._id,
                };
                // Posting data to server
                $http.post('../addMessageRule', data)
                .success(function(data) {
                    if (data.errors) {
                        console.log(data.errors);
                        $location.path('/admin/#/');
                    } else if(data == "success") {
                        $scope.hideEditMessageRulesModal();
                        $route.reload();
                    }
                })
                .error(function (error) {
                    console.log(error);
                    if(error.error.error_code == 403) {
                        $location.path('/admin/#/');
                    }
                });
            }
        };
        $scope.textInsert = function(id, text) {
            TextInsert.insert(angular.element('#' + id)[0], text);
        };

        var confirmModal = $modal({
            scope: $scope,
            templateUrl: 'pages/confirmModal.html',
            show: false,
            backdrop: 'static',
            keyboard: false
        });

        $scope.showConfirm = function(messageRule) {
            console.log("showConfirm()");
            $scope.messageRuleToDelete = messageRule;
            $scope.confirmTitle = "Delete Message Rule?";
            $scope.confirmMessage = "Are you sure you would like to delete this message rule?";
            $scope.confirmButtonText = "Delete";
            confirmModal.$promise.then(confirmModal.show);
        };
        $scope.hideConfirm = function(isDelete) {
            console.log("hideConfirm()");
            confirmModal.$promise.then(confirmModal.hide);
            if(isDelete) {
                $scope.deleteMessageRule($scope.messageRuleToDelete);
            }
        };
    })
    .controller("CalendarController", function($scope, $routeParams, $location, accounts, moment, prices, reservations, $modal, $http, $route, $rootScope, $timeout) {
        console.log("CalendarController");
        var airbnbListingID = $routeParams.airbnbListingID;
        if(!airbnbListingID || !accounts) {
            window.location.reload();
        }

        $rootScope.$watch(function(){
            MathJax.Hub.Queue(["Typeset", MathJax.Hub]);
            return true;
        });

        if(accounts && accounts.error && accounts.error.error_code) {
            $scope.error = accounts;
            accounts = [];
        }

        $scope.$parent.listings = [];
        accounts.forEach(function(account) {
            account.listings.forEach(function(listing) {
                $scope.$parent.listings.push(listing);
                if(listing.airbnbListingID == airbnbListingID) {
                    $scope.listing = listing;
                    $scope.pricingRules = listing.rules.pricing;
                }
            });
        });
        if(!$scope.listing) {
            console.log("No listing matching the listing ID was found");
            $location.path('/admin/#/');
        }
        $scope.calendarEvents = [];
        prices[airbnbListingID].forEach(function(day) {
            var newEvent = {
                type: "price",
                startsAt: moment(day.airbnbDate).toDate(),
                endsAt: moment(day.airbnbDate).toDate(),
            };
            Object.assign(newEvent, day);
            $scope.calendarEvents.push(newEvent);
        });
        var listingReservations = reservations[airbnbListingID];
        listingReservations.forEach(function(reservation) {
            $scope.calendarEvents.push({
                type: "reservation",
                title: reservation.airbnbConfirmationCode,
                startsAt: moment(reservation.airbnbStartDate).toDate(),
                endsAt: moment(reservation.airbnbStartDate).add(reservation.airbnbNights, 'd').toDate(),
            });
        });
        // $scope.pricingRules.forEach(function(pricingRule) {
        //     var event = {
        //         type: "rule",
        //         startsAt: moment().toDate(),
        //         endsAt: moment().add(12, 'd').toDate(),
        //     };
        //     Object.assign(event, pricingRule);
        //     $scope.calendarEvents.push(event);
        // });
        $scope.calendarView = 'month';
        $scope.viewDate = moment().startOf('month').toDate();

        $scope.events = [{
                value: "floatingPeriod",
                text: "A Period of Days, a Number of Days in the Future"
            },{
                value: "orphanPeriod",
                text: "Orphan Periods Between Booking"
            },{
                value: "weekends",
                text: "Weekends"
            },{
                value: "weekdays",
                text: "Weekdays"
            },{
                value: "specificDates",
                text: "Specific Dates"
            }
        ];

        $scope.onEventChange = function() {
            console.log("onEventsChange()");
        };

        $scope.days = [{
                value: "all",
                text: "Every Day"
            }
        ];
        for(var i = 1; i <= 31; i++) {
            var text = i + " Day";
            if(i > 1) {
                text += "s";
            }
            $scope.days.push({
                value: i,
                text: text,
            })
        }

        $scope.scales = [{
                value: "fixedPrice",
                text: "Fixed Price"
            },{
                value: "fixedPercentage",
                text: "Fixed Percentage"
            },{
                value: "gradualPrice",
                text: "Gradual Price"
            },{
                value: "gradualPercentage",
                text: "Gradual Percentage"
            },{
                value: "minPrice",
                text: "Minimum Price"
            },{
                value: "maxPrice",
                text: "Maximum Price"
            }
        ];

        $scope.onScaleChange = function() {
            console.log("onScaleChange()");
            if($scope.newRule.scale.value == "fixedPrice" || $scope.newRule.scale.value == "gradualPrice" || $scope.newRule.scale.value == "minPrice" || $scope.newRule.scale.value == "maxPrice") {
                $scope.amountIsDollars = true;
            } else {
                $scope.amountIsDollars = false;
            }
        };

        $scope.resetPricingRuleForm = function(rule) {
            console.log("resetPricingRuleForm()");
            $scope.amountIsDollars = true;
            $scope.newRule = {
                title: "",
                event: $scope.getOption($scope.events, "floatingPeriod"),
                amount: 0,
                scale: $scope.getOption($scope.scales, "fixedPrice"),
                floatingPeriodStartDay: 0,
                floatingPeriodLength: 14,
                orphanPeriodLength: 2,
                specificDatesStartDate: moment().startOf('day').toDate(),
                specificDatesEndDate: moment().add(7, 'd').startOf('day').toDate()
            };
            if(rule) {
                Object.assign($scope.newRule, rule);
                $scope.newRule.event = $scope.getOption($scope.events, rule.event);
                $scope.newRule.scale = $scope.getOption($scope.scales, rule.scale);
            }
            $scope.onScaleChange();
            $scope.onEventChange();
        };
        $scope.resetPricingRuleForm();

        $scope.editPricingRule = function(pricingRule) {
            console.log("editPricingRule()");
            $scope.resetPricingRuleForm(pricingRule);
            $scope.showEditPricingRulesModal();
        };
        $scope.addSpecificDatePricingRule = function(event) {
            console.log("addSpecificDatePricingRule()");
            var newPricingRule = {
                title: moment(event.airbnbDate).format('ddd, MMMM Do YYYY'),
                event: "specificDates",
                scale: "fixedPrice",
                specificDatesStartDate: moment(event.airbnbDate).startOf('day').toDate(),
                specificDatesEndDate: moment(event.airbnbDate).startOf('day').toDate()
            };
            $scope.resetPricingRuleForm(newPricingRule);
            $scope.showEditPricingRulesModal();
        };

        var editPricingRulesModal = $modal({
            scope: $scope,
            templateUrl: 'pages/editPricingRulesModal.html',
            show: false,
            backdrop: 'static',
            keyboard: false
        });
        $scope.showEditPricingRulesModal = function() {
            editPricingRulesModal.$promise.then(editPricingRulesModal.show);
        };
        $scope.hideEditPricingRulesModal = function() {
            editPricingRulesModal.$promise.then(editPricingRulesModal.hide);
            $scope.resetPricingRuleForm();
        };

        $scope.deletePricingRule = function(pricingRule) {
            console.log("deletePricingRule()");
            var data = {
                _id: pricingRule._id
            };
            // Posting data to server
            $http.post('../deletePricingRule', data)
            .success(function(data) {
                if (data.errors) {
                    console.log(data.errors);
                    $location.path('/admin/#/');
                } else if(data == "success") {
                    $route.reload();
                }
            })
            .error(function (error) {
                console.log(error);
                if(error.error.error_code == 403) {
                    $location.path('/admin/#/');
                }
            });
        };
        // function to submit the form after all validation has occurred
        $scope.submitAddPricingRuleForm = function(isValid) {
            console.log("submitAddPricingRuleForm()");
            // check to make sure the form is completely valid
            if (isValid) {
                var data = {
                    airbnbListingID: $scope.listing.airbnbListingID,
                    title: $scope.newRule.title,
                    event: $scope.newRule.event.value,
                    amount: $scope.newRule.amount,
                    scale: $scope.newRule.scale.value,
                    _id: $scope.newRule._id,
                };
                switch($scope.newRule.event.value) {
                    default:
                    case "floatingPeriod":
                        data.floatingPeriodStartDay = $scope.newRule.floatingPeriodStartDay;
                        data.floatingPeriodLength = $scope.newRule.floatingPeriodLength;
                    break;
                    case "orphanPeriod":
                        data.orphanPeriodLength = $scope.newRule.orphanPeriodLength;
                    break;
                    case "weekends":
                    case "weekdays":
                    break;
                    case "specificDates":
                        data.specificDatesStartDate = $scope.newRule.specificDatesStartDate;
                        data.specificDatesEndDate = $scope.newRule.specificDatesEndDate;
                    break;
                }
                // Posting data to server
                $http.post('../addPricingRule', data)
                .success(function(data) {
                    if (data.errors) {
                        console.log(data.errors);
                        $location.path('/admin/#/');
                    } else if(data == "success") {
                        $scope.hideEditPricingRulesModal();
                        $route.reload();
                    }
                })
                .error(function (error) {
                    console.log(error);
                    if(error.error.error_code == 403) {
                        $location.path('/admin/#/');
                    }
                });
            }
        };

        var confirmModal = $modal({
            scope: $scope,
            templateUrl: 'pages/confirmModal.html',
            show: false,
            backdrop: 'static',
            keyboard: false
        });

        $scope.showConfirm = function(PricingRule) {
            console.log("showConfirm()");
            $scope.PricingRuleToDelete = PricingRule;
            $scope.confirmTitle = "Delete Pricing Rule?";
            $scope.confirmPricing = "Are you sure you would like to delete this pricing rule?";
            $scope.confirmButtonText = "Delete";
            confirmModal.$promise.then(confirmModal.show);
        };
        $scope.hideConfirm = function(isDelete) {
            console.log("hideConfirm()");
            confirmModal.$promise.then(confirmModal.hide);
            if(isDelete) {
                $scope.deletepricingRule($scope.pricingRuleToDelete);
            }
        };

        $scope.forceUpdatePricing = function() {
            console.log("forceUpdatePricing()");
            var data = {
                airbnbListingID: $scope.listing.airbnbListingID
            };
            $scope.updatingPricing = true;
            // Posting data to server
            $http.post('../forceUpdatePricing', data)
            .success(function(data) {
                $scope.updatingPricing = false;
                if (data.errors) {
                    console.log(data.errors);
                    $location.path('/admin/#/');
                } else if(data == "success") {
                    $route.reload();
                }
            })
            .error(function (error) {
                $scope.updatingPricing = false;
                console.log(error);
                if(error.error.error_code == 403) {
                    $location.path('/admin/#/');
                }
            });
        };

        $scope.togglePricing = function() {
            console.log("togglePricing()");
            var data = {
                pricingEnabled: !$scope.listing.pricingEnabled,
                airbnbListingID: $scope.listing.airbnbListingID
            };
            // Posting data to server
            $http.post('../enablePricing', data)
            .success(function(data) {
                if (data.errors) {
                    console.log(data.errors);
                    $location.path('/admin/#/');
                } else if(data == "success") {
                    $route.reload();
                }
            })
            .error(function (error) {
                console.log(error);
                if(error.error.error_code == 403) {
                    $location.path('/admin/#/');
                }
            });
        };
        $scope.templateData = {
            addSpecificDatePricingRule: $scope.addSpecificDatePricingRule,
        }

        // Model to JSON for demo purpose
        var initializing = true;
        $scope.$watch('pricingRules', function(newPricingOrder, oldPricingOrder) {
            if (initializing) {
                $timeout(function() {initializing = false;});
            } else {
                $timeout.cancel($scope.orderTimer);
                $scope.orderTimer = $timeout(function() {
                    var pricingOrder = [];
                    newPricingOrder.forEach(function(rule, ruleIndex) {
                        pricingOrder.push(rule._id);
                    });
                    var data = {
                        pricingOrder: pricingOrder,
                        airbnbListingID: $scope.listing.airbnbListingID
                    };
                    // Posting data to server
                    $http.post('../reorderPricing', data)
                    .success(function(data) {
                        if (data.errors) {
                            console.log(data.errors);
                            $location.path('/admin/#/');
                        } else if(data == "success") {
                            $route.reload();
                        }
                    })
                    .error(function (error) {
                        console.log(error);
                        if(error.error.error_code == 403) {
                            $location.path('/admin/#/');
                        }
                    });
                }, 50);
            }
        }, true);

    })
    .service('TextInsert', function() {
        return {
            insert: function(input, text) {
                var back, browser, front, pos, range, scrollPos;
                if (!input) {
                    return;
                }
                scrollPos = input.scrollTop;
                pos = 0;
                browser = input.selectionStart || input.selectionStart === '0' ? 'ff' : (document.selection ? 'ie' : false);
                if (browser === 'ie') {
                    input.focus();
                    range = document.selection.createRange();
                    range.moveStart('character', -input.value.length);
                    pos = range.text.length;
                } else if (browser === 'ff') {
                    pos = input.selectionStart;
                }
                front = input.value.substring(0, pos);
                back = input.value.substring(pos, input.value.length);
                input.value = front + text + back;
                pos = pos + text.length;
                if (browser === 'ie') {
                    input.focus();
                    range = document.selection.createRange();
                    range.moveStart('character', -input.value.length);
                    range.moveStart('character', pos);
                    range.moveEnd('character', 0);
                    range.select();
                } else if (browser === 'ff') {
                    input.selectionStart = pos;
                    input.selectionEnd = pos;
                    input.focus();
                }
                input.scrollTop = scrollPos;
                angular.element(input).trigger('input');
                return '';
            }
        };
    })
    .directive('autoScrollTo', function () {
        return function(scope, element, attrs) {
            scope.$watch(attrs.autoScrollTo, function(value) {
                if (value) {
                    var pos = $("#message-" + value).position().top - 50;// + $(element).parent().scrollTop();
                    $(element).animate({
                        scrollTop : pos
                    }, 1000);
                }

            });
        };
    });
