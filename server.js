var path = require('path');
var url = require('url');
var express = require('express');
var config = require('./config.js');

var fs = require('fs');
var https = require('https');
var bodyParser = require('body-parser');

var app = express();
/*
 * Definition of global variables.
 */
var sessions = {};
var registrations = {};


/*
 * Server startup
 */
var asUrl = url.parse(config.as_uri);
var port = config.port;

console.log(`${config.as_uri}`)

app.use(express.static(path.join(__dirname, 'static')));
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(function (error, req, res, next) {
    console.log(error)
});

app.listen(port);


