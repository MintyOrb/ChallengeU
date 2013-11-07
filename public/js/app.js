'use strict';

// Declare app level module which depends on filters, and services

var myApp = angular.module('myApp', ['myApp.filters', 'myApp.services', 'myApp.directives', 'myApp.controllers']).
  config(['$routeProvider', '$locationProvider', function($routeProvider, $locationProvider) {
    $routeProvider.when('/home', {templateUrl: 'views/partials/home.html', controller: 'MyCtrl1'})
    .when('/about', {templateUrl: 'views/partials/about.html', controller: 'MyCtrl2'})
    .when('/profile', {templateUrl: 'views/partials/profile.html', controller: 'MyCtrl3'})
    .when('/settings', {templateUrl: 'views/partials/settings.html', controller: 'MyCtrl4'})
    .when('/theList', {templateUrl: 'views/partials/theList.html', controller: 'MyCtrl4'})
    .otherwise({redirectTo: '/home'});
    $locationProvider.html5Mode(true);
  }]);


