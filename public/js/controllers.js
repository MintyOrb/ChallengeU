'use strict';

/* Controllers */

angular.module('myApp.controllers', []).
  controller('AppCtrl', function ($scope, $http, $rootScope, $location, $route) {


    $scope.newUser = false;
    $rootScope.isLoggedin = false;

    $rootScope.currentUser = {};
    $scope.loginUser = {};

    $scope.logOut = function (){
      $rootScope.isLoggedin = false;
      $rootScope.currentUser = {};
      $scope.loginUser = {};
      $location.path("/home");
    }

    $scope.viewProf = function (){
      if(!$rootScope.isLoggedin){
        alert("You must be logged in to view your profile!");
        $location.path("/signup");
      } else {
        $location.path("/profile");
      }
    }

    $scope.getUser = function (){
      console.log("new User function!");
      console.log($scope.loginUser);
      $http({method: 'GET', params: {name:$scope.loginUser.name, password: $scope.loginUser.password} , url: '/api/user'}).
        success(function(data, status, headers, config) {
         
          console.log("got validity");
         
          console.log(data);

          if(data === "bad name"){
            $scope.loginUser.name="";
            alert("Entered Bad Username.");
          } else if (data === "bad password"){
            $scope.loginUser.password="";
            alert("Entered Bad Password.");
          } else {
            $location.path("/profile");
            $rootScope.currentUser = data;
            $scope.signinbutton = false;
            $rootScope.isLoggedin = true;
          }
        }).
        error(function(data, status, headers, config) {
          console.log("didn't go through...");
        });
      };
  }).
  controller('challengeList', function ($scope, $http, $location, $rootScope) {
  
      $scope.challenges = {};
      $scope.sortBy = 'difficulty';
      console.log("list ctrl");

      $http({method: 'GET', url: '/api/challenge'}).
        success(function(data, status, headers, config) {
          console.log("got challenges");
          $scope.challenges = data;
        }).
        error(function(data, status, headers, config) {
          console.log("didn't get challenges");
        });

        $scope.completeChallenge = function (challengeName, difficulty, id, userName){

          $http({method: 'PUT', data: {challengeName: challengeName, difficulty: difficulty, userID: id, userName: userName}, url: '/api/user/completedChallenge'}).
            success(function(data, status, headers, config) {
               console.log("added completed challenge");
               console.log(data);
              $rootScope.currentUser = data;
              $location.path("/profile");
            }).
            error(function(data, status, headers, config) {
              console.log("submission didn't go through");
            });

      };

}).
   controller('profileCtrl', function ($scope, $http, $rootScope) {

    $scope.editing = false;
    console.log("navigated to profile, rootscope.currentUser looks like:\n"+ $rootScope.currentUser.name);
    $scope.saveChanges = function (data){

      $scope.editing = false;

        $http({method: 'PUT', data: data, url: '/api/user/update'}).
            success(function(data, status, headers, config) {
              $rootScope.currentUser = data;
              console.log("got data:\n" + data)
              console.log($rootScope.currentUser) 
          }).
          error(function(data, status, headers, config) {
            console.log("submission didn't go through");
          });
    }
}).
  controller('newChallenge', function ($scope, $http, $route) {
    
    $scope.isCollapsed = true;

    $scope.challenge = {};

    $scope.submit=function(name){

      $scope.challenge.dateCreated = new Date();
      $scope.challenge.userName = name;
      console.log($scope.challenge);

      $http({method: 'POST', data: $scope.challenge, url: '/api/challenge'}).
        success(function(data, status, headers, config) {
         //redirect to challenge list or specific challenge page... if we make one
          $route.reload();
        }).
        error(function(data, status, headers, config) {
          console.log("didn't create challenge");
      });
    };
}).
  controller('signUpCtrl', function ($scope, $http, $location, $rootScope) {

    $scope.user = {};
    $scope.password1 = "";

    $scope.signUp=function(){
  
      $scope.user.dateJoined = new Date();
      $scope.user.institution = "";
      $scope.user.graduationYear = 0;
      $scope.user.major = "";
      $scope.user.totalScore = 0;
      $scope.user.picURL = "";

      console.log($scope.user);

      $http({method: 'POST', data: $scope.user, url: '/api/user'}).
        success(function(data, status, headers, config) {
          $rootScope.currentUser = data;
          $location.path("/profile");
          $rootScope.isLoggedin = true;
          console.log("created user");
          console.log(data);
        }).
        error(function(data, status, headers, config) {
          console.log("didn't create user");
      });
    };
}).
  controller('leaderBoardCtrl', function ($scope, $rootScope, $http) {

    $scope.isCollapsed = true;
    $scope.stories = {};
    $scope.sortBy = "dateCreated";
    $scope.reverse  = true;
    console.log("leaderBoardCtrl")
    $scope.showNewUsers = true;
    $scope.showNewChallenges = true;
    $scope.showCompletedChallenges = true;


    $http({method: 'GET', url: '/api/story'}).
        success(function(data, status, headers, config) {
          $scope.stories = data;
          console.log(data);
        }).
        error(function(data, status, headers, config) {
          console.log("didn't get stories! :(");
      });

     $scope.addComment=function(story, comment){
        comment.user = $rootScope.currentUser.name;
        story.comments.push(comment);
        $scope.isCollapsed = true;

      $http({method: 'POST', data: {comment:comment, storyID:story._id}, url: '/api/story'}).
        success(function(data, status, headers, config) {
        
        }).
        error(function(data, status, headers, config) {
          console.log("didn't save comment");
      });
    };

});
