/*eslint-env node*/

var express = require('express');
var Cloudant = require('cloudant');
var cfenv = require('cfenv');
var bodyParser = require('body-parser')
require('dotenv').config({ silent: true });

var TRAVELS_DB_NAME = "travels"
// get the app environment from Cloud Foundry
var appEnv = cfenv.getAppEnv();

var cloudantCredentials = appEnv.getService('cloudantNoSQLDB');

var cloudant_user = process.env.cloudant_user || cloudantCredentials.credentials.username ;
var cloudant_password = process.env.cloudant_password || cloudantCredentials.credentials.password ;

// Initialize cloudant
var cloudant = Cloudant({account:cloudant_user, password:cloudant_password});

console.log("init db " + TRAVELS_DB_NAME);
cloudant.db.get(TRAVELS_DB_NAME, function(err, body) {
  if (!err) {
    console.log("Database " + TRAVELS_DB_NAME + " found");
  }
  else{
    //db do not exists - create it
    cloudant.db.create(TRAVELS_DB_NAME, function(err, body) {
      if (err) {
        console.error("Failed to create " + TRAVELS_DB_NAME + " database");
        console.error(err);
        process.exit(1);
      }
      else{
        console.log("Database " + TRAVELS_DB_NAME + " created successfuly");
      }
    });
  }
});


// create a new express server
var app = express();

// parse application/json
app.use(bodyParser.json())

// serve the files out of ./public as our main files
app.use(express.static(__dirname + '/public'));



// start server on the specified port and binding host
app.listen(appEnv.port, '0.0.0.0', function() {
  // print a message when the server starts listening
  console.log("server starting on " + appEnv.url);
});

//api routes
//get list of all travels
app.get('/api/travel', function(req, res, next) {
  console.log('GET api/travel');
  var travelsDB = cloudant.db.use(TRAVELS_DB_NAME);
  travelsDB.list({include_docs:true}, function(err, body) {
    if(err) {
      console.error('[error on travel list]');
      console.error(err);
      return res.sendStatus(500);
    }

    console.log('Travel doc inserted');
    console.log(body);
    return res.json(body);

  });
});

//get one specific travel
app.get('/api/travel/:travel_id', function(req, res, next) {
  console.log('GET /api/travel/' + req.params.travel_id);
  var travel_id = req.params.travel_id;
  var travelsDB = cloudant.db.use(TRAVELS_DB_NAME);
  travelsDB.get(travel_id, function(err, body) {
    if (err){
      console.log('[get travel - travel not found]');
      console.log(err);
      if (err.statusCode){
        return res.sendStatus(err.statusCode);
      } else {
        return res.sendStatus(500);
      }

    }
    console.log('Travel doc retrieved ' + travel_id);
    console.log(body);
    return res.json(body);
  });
});

//post a new travel or update an existing one
app.post('/api/travel', function(req, res, next) {
  console.log('POST /api/travel')
  console.log(req.body);
  if (!req.body) {
    return res.sendStatus(400)
  }
  var travelsDB = cloudant.db.use(TRAVELS_DB_NAME);

  travelsDB.insert(req.body, function(err, body, header) {
      if (err) {
        console.error('[error on travel insert]');
        console.error(err);
        return res.sendStatus(500);
      }

      console.log('Travel doc inserted');
      console.log(body);
      return res.json(body);
    });
});

app.delete('/api/travel/:travel_id', function(req, res, next) {
  console.log('DELETE /api/travel/' + req.params.travel_id);
  var travel_id = req.params.travel_id;
  var travelsDB = cloudant.db.use(TRAVELS_DB_NAME);

  travelsDB.head(travel_id,function(err,body,head){
    if(err){
      console.log('travel_id not found ' + travel_id);
      console.log(err);
      if (err.statusCode){
        return res.sendStatus(err.statusCode);
      } else {
        return res.sendStatus(500);
      }
    }
    travelsDB.destroy(travel_id, head.etag.replace(/"/g,''),function(err,body){
      if (err) {
        console.error('[error on travel delete] ' + travel_id);
        console.error(err);
        return res.sendStatus(500);
      }
      console.log('travel deleted ' + travel_id)
      console.log(body);
      return res.json(body);
    });
  })
});
