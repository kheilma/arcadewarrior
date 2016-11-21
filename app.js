/*eslint-env node*/

//------------------------------------------------------------------------------
// node.js starter application for Bluemix
//------------------------------------------------------------------------------

/*
Old file
// This application uses express as its web server
// for more info, see: http://expressjs.com
var express = require('express');

// cfenv provides access to your Cloud Foundry environment
// for more info, see: https://www.npmjs.com/package/cfenv
var cfenv = require('cfenv');

// create a new express server
var app = express();
var server = require('http').Server(app);

// serve the files out of ./public as our main files
app.use(express.static(__dirname + '/public'));

// get the app environment from Cloud Foundry
var appEnv = cfenv.getAppEnv();

// start server on the specified port and binding host
/*app.listen(appEnv.port, '0.0.0.0', function() {
  // print a message when the server starts listening
  console.log("server starting on " + appEnv.url);
});*/
/*
server.listen(appEnv.port, '0.0.0.0');
console.log("Server started on " + appEnv.url );

// Lists to hold sockets and players
var SOCKET_LIST = {};
var PLAYER_LIST = {};

var Player = function(id){
  // Basically a constructor
  var self = {
    x:250,
    y:250,
    id:id,
    number:"" + Math.floor(10 * Math.random()),
    pressingRight:false,
    pressingLeft:false,
    pressingUp:false,
    pressingDown:false,
    maxSpeed:10,
  }

  // On certain inputs, increases or decreases position
  self.updatePos = function(){
    if(self.pressingRight){
      self.x += self.maxSpeed;
    }
    if(self.pressingLeft){
      self.x -= self.maxSpeed;
    }
    if(self.pressingUp){
      self.y -= self.maxSpeed;
    } 
    if(self.pressingDown){
      self.y += self.maxSpeed;
    }
  }

  return self;
}

var io = require('socket.io')(server, {});
// When a client connects, set id to random number, set x and y to 0, give unique number
// And update the socket list
io.sockets.on('connection', function(socket){
  socket.id = Math.random();
  SOCKET_LIST[socket.id] = socket;

  var player = Player(socket.id);
  PLAYER_LIST[socket.id]=player;

  console.log('Socket connection.');

  // When a player disconnects, remove them from the socket list
  socket.on('disconnect', function(){
    delete SOCKET_LIST[socket.id];
    delete PLAYER_LIST[socket.id];
  });

  // Listens for client 'keyPress'
  // Updates the player position on server
  socket.on('keyPress', function(data){
    if(data.inputId === 'left'){
      player.pressingLeft = data.state;
    } else if(data.inputId === 'right'){
      player.pressingRight = data.state;
    } else if(data.inputId === 'up'){
      player.pressingUp = data.state;
    } else if(data.inputId === 'down'){
      player.pressingDown = data.state;
    }

  });

});

// Do stuff in function, every x amount of time
setInterval(function(){
  var dataPackage = [];
// For every client in the SOCKET_LIST
// Increment position, add the new data to package
// Adds their: x,y position, and their unique number
  for(var i in PLAYER_LIST){
    var player = PLAYER_LIST[i];
    player.updatePos();
    dataPackage.push({
      x:player.x,
      y:player.y,
      number:player.number
    });
  }

// After the data package has been updated, send it to the client
  for(var i in SOCKET_LIST){
    var socket = SOCKET_LIST[i];
    socket.emit('newPosition', dataPackage);
  }

}, 1000/25);*/
