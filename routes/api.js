/*
 * Serve JSON to our AngularJS client
 */
var mongoose = require('mongoose'),
    passport = require('passport'),
    LocalStrategy = require('passport-local').Strategy;


//initialize database connection
mongoose.connect('mongodb://admin:password@ds053438.mongolab.com:53438/challenge_u_tester');
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));

//create and compile schemas
var userSchema = mongoose.Schema({
name: String,
password: String,
gender: String,
institution: String,
graduationYear: Number,
picURL: String,
major: String,
totalScore: Number,
completedChallenges: [{name: String, dateCompleted: Date }],
comments: [{body: String, date: Date }],
dateJoined: Date
});

userSchema.methods.validPassword = function (password) {
    if (password === this.password) {
        return true;
    }else{
        return false;
    };
};
var User = mongoose.model('User', userSchema);


var storySchema = mongoose.Schema({
userName: String, 
challengeName: String,
type: String, //newUser or newChallenge or completedChallenge
numberOfComments: Number,
comments: [{user: String, body: String, date: Date }],
dateCreated: Date
});
var Story = mongoose.model('Story', storySchema);

var challengeSchema = mongoose.Schema({
name: String,
description: String,
difficulty: Number,
numberOfTimesCompleted: Number,
comments: [{user: String, body: String, date: Date }],
dateCreated: Date
});
var Challenge = mongoose.model('Challenge', challengeSchema);

console.log("schemas initialization");


//database manipulation functions
exports.createChallenge = function (req, res){

	//console.log("create Challenge");
    console.log(req.body);

    var data = req.body;

    var newChallenge = new Challenge({
        description: data.description,
        name: data.challengeName,
        difficulty: data.difficulty,
        numberOfTimesCompleted: 0,
        dateCreated: data.dateCreated
    });

    newChallenge.save(function (err, newChallenge) {
        if (!err){
            console.log("saved challenge");
            res.send("good work guys");
        }
    })
    var date = new Date();
    var newStory = new Story({
        'userName': data.userName,
        'challengeName': data.challengeName,
        'type': 'newChallenge',
        'numberOfComments': 0,
        'comments': [],
        'dateCreated': date
    })

    newStory.save(function (err, newStory) {
        if (!err){
            console.log("saved new story");
        }
    })

};

exports.getChallenges = function (req, res){

    //console.log("get challenges");

    Challenge.find(function (err, challenges) {
        if (err){
            console.log("error getting challegnes")
        }
        res.json(challenges);
    });    
};

exports.createUser = function (req, res){

    //console.log("create user");

    //add profile pic
    var data = req.body
    if (data.gender === 'Male'){
        data.picURL = "/img/maleicon.png";
    } else if (data.gender==="Female"){
        data.picURL = "/img/femaleicon.png";
    } else {
        data.picURL = "/img/proficon.png";
    }

     //create instance of schema
    var newUser = new User(data);

    newUser.save(function (err, newUser) {
        if (!err){
            console.log("saved user");
            res.json(newUser);
        }
    })
    var date = new Date();
    var newStory = new Story({
        'userName': data.name, 
        'type': 'newUser',
        'numberOfComments': 0,
        'comments': [],
        'dateCreated': date
    })

    newStory.save(function (err, newStory) {
        if (!err){
            console.log("saved new story");
        }
    })

};
exports.getUser = function (req, res){

    var name = req.query.name;
    var password = req.query.password;

    console.log(req.query);


    User.findOne({ name: name }, function(err, users) {

        console.log(users);

        if(!users) {
            console.log("bad name");
            res.send("bad name");
        } else {
            if(!users.validPassword(password)){
                res.send("bad password");
                console.log("bad password");
            }
            else{
                res.json(users);
            }
        }
    })
};
exports.completedChallenge = function (req, res) {

    var info = req.body;
    console.log(info);

    var score = 0
    if(info.difficulty === 1){
            score = 25;
        } else if (info.difficulty === 2){
            score = 50;
        } else if (info.difficulty === 3) {
            score = 100;
        };

    User.findOne({ _id: info.userID }, function(err, user) {
        var date = new Date();
        user.completedChallenges.push({name: info.challengeName, dateCompleted: date});
        user.totalScore += score;
        console.log("pre addition\n" + user);
        user.save(function (err, user) {
            if (err){console.log("error updating")};
            userUpdate = user
            res.json(userUpdate);
        });
    })
    var date = new Date();
    var newStory = new Story({
        'userName': info.userName,
        'challengeName': info.challengeName,
        'type': 'completedChallenge',
        'numberOfComments': 0,
        'comments': [],
        'dateCreated': date
    })

    newStory.save(function (err, newStory) {
        if (!err){
            console.log("saved new story");
        }
    })

};
exports.updateUser = function (req, res){

    var update = req.body;
    console.log(update);
    User.findOne({ _id: update._id }, function(err, user) {
        
        user.gender = update.gender;
        user.graduationYear = update.graduationYear;
        user.institution = update.institution;
        user.major = update.major;

        user.save(function (err, user) {
            if (err){console.log("error updating")};
            res.json(user);
        });
    })

};

exports.getStories = function (req, res){

    Story.find(function (err, stories) {
        if (err){
            console.log("error getting stories")
        }
        console.log(stories);
        res.json(stories);
    });    

}

exports.addComment = function (req, res){

    var info = req.body;

    Story.findOne({ _id: info.storyID }, function(err, story) {
        story.comments.push({user: info.comment.user, body: info.comment.body, date: new Date() });
        story.numberOfComments += 1;
        
        story.save(function (err, story) {
            if (err){console.log("error updating")};
            res.send();
        });
    })

}
