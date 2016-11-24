/*eslint-env node*/

//------------------------------------------------------------------------------
// node.js starter application for Bluemix
//------------------------------------------------------------------------------



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

server.listen(appEnv.port, '0.0.0.0');
console.log("Server started on " + appEnv.url );

// Lists to hold sockets and players
var SOCKET_LIST = {};
var PLAYER_LIST = {};

// List of rooms 
var ROOM_LIST = ["room1", "room2", "room3"];

// Queue for matchmaking
var queue = [];

//Number of connections
var numOfConnections = 0;

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
  numOfConnections++;
  socket.id = Math.random();
  SOCKET_LIST[socket.id] = socket;

  var player = Player(socket.id);
  PLAYER_LIST[socket.id]=player;

  queue.push(player);
  console.log("Queue size after connection: " + queue.length);

  // Take two players out of the queue, add them to a room
  if(queue.length>=2){

    var player1 = queue.shift();
    var player2 = queue.shift();

    var roomToJoin;
    // Check to see if rooms are open here (todo)
    for(var i in ROOM_LIST){
      // If there are no people in the game
      // You have found a room to join
      if(io.sockets.adapter.rooms[ROOM_LIST[i]] != undefined){
        var numClients = io.sockets.adapter.rooms[ROOM_LIST[i]].length;

        if(numClients>=2){
          // do nothing
        } else {
          roomToJoin = ROOM_LIST[i];
          break;
        }

      } else {
        roomToJoin = ROOM_LIST[i];
          break;
      }
    }

    // If no rooms are suitable, join room1
    if(roomToJoin==undefined){
      roomToJoin = 'room1';
    }

    // Convert player socketid into a socket
    p1Socket = SOCKET_LIST[player1.id];
    p2Socket = SOCKET_LIST[player2.id];

    p1Socket.join(roomToJoin);
    p2Socket.join(roomToJoin);
    console.log("Joined room: " + roomToJoin);
  }

  // When a player disconnects, remove them from the socket list
  socket.on('disconnect', function(){
    delete SOCKET_LIST[socket.id];
    delete PLAYER_LIST[socket.id];
    var index = queue.indexOf(socket.id);
    queue.splice(index,1);
    numOfConnections--;
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

  for(var i in ROOM_LIST){
    //Get all clients in a room
    room = ROOM_LIST[i];

    if(io.sockets.adapter.rooms[room] == undefined){
      break;
    }

    var socketIDs = [];
    for (var socketId in io.sockets.adapter.rooms[room].sockets) {
      socketIDs.push(socketId);
    }

    //If there are people actually in the room
    if(socketIDs.length>0){

      // Create list of players based off of the socket IDS
      var players = [];
      players.push(PLAYER_LIST[socketIDs[0]]);
      players.push(PLAYER_LIST[socketIDs[1]]);

      // Loop through each client
      for(var i in players){
        var player = players[i];
        player.updatePos();
        if(player != undefined){
          dataPackage.push({
          x:player.x,
          y:player.y,
          number:player.number
        });
        }
      }

      for(var i in players){
        if(players[i] != undefined){
          var socket = SOCKET_LIST[players[i].id];
          socket.emit('newPosition', dataPackage);
        }
      }
  }

  }
}, 1000/25);