
var express  = require('express');
var app      = express();
var cfenv = require('cfenv');
var port     = process.env.PORT || 8080;
var mongoose = require('mongoose');
var passport = require('passport');
var flash    = require('connect-flash');
var server = require('http').Server(app);
var configDB = require('./config/database.js');



//mongoose.connect('mongodb://80a9509e-caf7-4e6e-b44f-1e9ef40e21d0:ec588a90-de18-47ca-8d99-72c37d7e21b1@50.23.230.137:10329/db');



require('./config/passport')(passport); 

app.configure(function() {


	app.use(express.logger('dev')); 
	app.use(express.cookieParser()); 
	app.use(express.bodyParser()); 

	app.set('view engine', 'ejs'); 

	// required for passport
	app.use(express.session({ secret: 'ilovescotchscotchyscotchscotch' }));
	app.use(passport.initialize());
	app.use(passport.session()); 
	app.use(flash()); 

});


require('./app/routes.js')(app, passport); 

server.listen(port);
console.log('The magic happens on port ' + port);

app.use(express.static(__dirname + '/public'));

var appEnv = cfenv.getAppEnv();

var SOCKET_LIST = {};
var PLAYER_LIST = {};

var SOCKET_LIST = {};
var PLAYER_LIST = {};

// List of rooms 
var ROOM_LIST = ["room1"];

// Queue for matchmaking
var queue = [];

//Number of connections
var numOfConnections = 0;

var Player = function(id){
  // Basically a constructor
  var self = {
    x:Math.floor(Math.random() * 250) + 30,
    y:Math.floor(Math.random() * 250) + 30,
    id:id,
    room:"no room",
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
          // If at the end of all possible rooms, possibly add new room
          if(i == ROOM_LIST.length){
            var newRoomName = 'room' + (ROOM_LIST.length+1);
            // If the new room to be made is already in the list, don't create it\
            if(ROOM_LIST.indexOf(newRoomName) < 0){
              ROOM_LIST.push(newRoomName);
            }
            roomToJoin = newRoomName;
          } else {
            roomToJoin = ROOM_LIST[i];
          }
          break;
        }

      } else {
        // If at the end of all possible rooms, possibly add new room
        if(i == ROOM_LIST.length){
            var newRoomName = 'room' + (ROOM_LIST.length+1);
            // If the new room to be made is already in the list, don't create it\
            if(ROOM_LIST.indexOf(newRoomName) < 0){
              ROOM_LIST.push(newRoomName);
            }
            roomToJoin = newRoomName;
          } else {
            roomToJoin = ROOM_LIST[i];
        }
        break;
      }
    }

    // If no rooms are suitable, join room1
    if(roomToJoin==undefined){
      var newRoomName = 'room' + (ROOM_LIST.length+1);
      if(ROOM_LIST.indexOf(newRoomName) < 0){
        ROOM_LIST.push(newRoomName);
      }
      roomToJoin = newRoomName;
    }

    // Convert player socketid into a socket
    p1Socket = SOCKET_LIST[player1.id];
    p2Socket = SOCKET_LIST[player2.id];

    player1.room = roomToJoin;
    player2.room = roomToJoin;

    p1Socket.join(roomToJoin);
    p2Socket.join(roomToJoin);
    console.log("Joined room: " + roomToJoin);
  }

  // When a player disconnects, remove them from the socket list
  socket.on('disconnect', function(){
    var temp = PLAYER_LIST[socket.id];
    var room = temp.room;

    delete SOCKET_LIST[socket.id];
    delete PLAYER_LIST[socket.id];
    socket.leave(room);
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
  for(var i in ROOM_LIST){

    var dataPackage = [];

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
          if(player != undefined){
            player.updatePos();
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