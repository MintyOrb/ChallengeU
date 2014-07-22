'use strict';

// Declare app level module which depends on filters, and services

var myApp = angular.module('myApp', ['ui.bootstrap', 'ngRoute','myApp.controllers']).
  config(['$routeProvider', '$locationProvider', function($routeProvider, $locationProvider) {
    $routeProvider.when('/home', {templateUrl: 'partials/leaderBoard', controller: 'leaderBoardCtrl'})
    .when('/about', {templateUrl: 'partials/about'})
    .when('/profile', {templateUrl: 'partials/profile', controller: 'profileCtrl'})
    .when('/settings', {templateUrl: 'partials/settings'})
    .when('/theList', {templateUrl: 'partials/theList', controller: 'challengeList'})
    .when('/signup', {templateUrl: 'partials/signup', controller: 'signUpCtrl'})
    .otherwise({redirectTo: '/home'});
    $locationProvider.html5Mode(true);
  }]);


