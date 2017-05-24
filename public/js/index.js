angular.module("indexApp", ['ngRoute', 'mgcrea.ngStrap'])
.config(function($routeProvider, $affixProvider, $scrollspyProvider) {
    $routeProvider
        .when("/", {
            templateUrl: "pages/login.html",
            controller: "loginController",
        })
        .when("/login", {
            templateUrl: "pages/login.html",
            controller: "loginController",
        })
        .when("/register", {
            templateUrl: "pages/register.html",
            controller: "registerController",
        })
        .otherwise({
            redirectTo: "/",
        });
})
.controller("indexController", function() {
    console.log("indexController");
})
.controller("loginController", function($scope, $timeout, $http, $window) {
    console.log("loginController");
    $scope.loginData = {};
    $scope.submitLoginForm = function(isValid) {
        console.log("submitLoginForm()");
        // check to make sure the form is completely valid
        if (isValid) {
            // Posting data to server
            $http.post('/login', $scope.loginData, {})
            .then(function(data) {
                if (data.errors) {
                    console.log(data.errors);
                    $scope.loginError = "There was an issue logging into your account, please try again.";
                } else {
                    $scope.loginError = "";
                    $window.location.href = '/admin/#/';
                }
            },
            function(error) {
                console.log(error);
                $scope.loginError = "That email and password combination are incorrect, please try again.";
            });
        }
    };
})
.controller("registerController", function($scope, $http, $window) {
    console.log("registerController");
    $scope.registerData = {};
    $scope.submitRegisterForm = function(isValid) {
        console.log("submitRegisterForm()");
        // check to make sure the form is completely valid
        if (isValid) {
            // Posting data to server
            $http.post('/register', $scope.registerData, {})
            .then(function(data) {
                if (data.errors) {
                    console.log(data.errors);
                    $scope.registerError = "There was an issue registering your account, please try again.";
                } else {
                    $scope.registerError = "";
                    $window.location.href = '/admin/#/';
                }
            },
            function(error) {
                console.log(error);
                $scope.registerError = "That email already exists. Try logging in instead.";
            });
        }
    };
});

