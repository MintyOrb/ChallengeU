
/**
 * Module dependencies.
 */

var express = require('express'),
    routes = require('./routes'),
    api = require('./routes/api'),
    mongoose = require('mongoose');  


var app = module.exports = express();


// Configuration
app.configure(function() {
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(express.static(__dirname + '/public'));
    app.use(app.router);
});

app.configure('development', function(){
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
    app.use(express.errorHandler());
});


// Routes
app.get('/', routes.index);
app.get('/partials/:name', routes.partials);

// JSON API
app.get('/api/name', api.name);

//authentication route
app.post('/login', api.passport);

//REST routes:
app.get('/api/challenge', api.getChallenges);
app.post('/api/challenge', api.createChallenge);

app.get('/api/user', api.getUser);
app.post('/api/user', api.createUser);
    //for completing challenges or editing profile
app.put('/api/user/completedChallenge', api.completedChallenge);
app.put('/api/user/update', api.updateUser);

    //for new challenge stories
app.get('/api/story', api.getStories);
app.post('/api/story', api.addComment);

// redirect all others to the index (HTML5 history)
app.get('*', routes.index);

// Start server
app.listen(3000, function(){
	console.log("Express server listening on port %d in %s mode", this.address().port, app.settings.env);
});
