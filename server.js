
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
//var PLAYER_LIST = {};

// List of rooms 
var ROOM_LIST = ["room1"];

// Queue for matchmaking
var queue = [];

//Number of connections
var numOfConnections = 0;

var Minigame = function(){
  var self = {
        type:"none",
        time:30,
        winner:"none",
    }

    self.startGame = function(){
        // Default minigame has no definition to start
    }

    self.finish = function(){

    }

    return self;
}

var BoxKick = function(p1, p2){
  var self = Minigame();
  self.player1 = p1;
  self.player2 = p2;
  self.type = "BoxKick";
  self.time = 30;

  self.startGame = function(){
    // Turn players into sockets for emitting
    var p1Socket = SOCKET_LIST[self.player1.id];
    var p2Socket = SOCKET_LIST[self.player2.id];

    // Init player positions
    self.player1.x = 100;
    self.player1.y = 500;

    self.player2.x = 700;
    self.player2.y = 500;

    // Tell client what game type to draw
    p1Socket.emit('gameType', {type:self.type});
    p2Socket.emit('gameType', {type:self.type});
  }

  self.finish = function(nextGame){
    //Update score here....

    // Start next game
    nextGame.startGame();
  }

  return self;
}

// General entity super class.
var entity = function(){
    var self = {
      x:Math.floor(Math.random() * 250) + 30,
      y:Math.floor(Math.random() * 250) + 30,
      spdX:0,
      spdY:0,
      id:"",
    }

    // Updates position: x and y coords
    self.updatePosition = function(){
      self.x += self.spdX;
      self.y += self.spdY;
    }

    // General update method that is called from outside. Can put other important things in here
    // ex: collision update
    self.update = function(){
      self.updatePosition();
    }

    return self;
}

var Player = function(id){
  var self = entity();
  self.y
  self.id = id;
  self.number = "" + Math.floor(10 * Math.random());
  self.pressingRight = false;
  self.pressingLeft = false;
  self.pressingUp = false;
  self.pressingDown = false;
  self.maxSpeed = 10;

  self.room = "no room";
  self.ready = false;
  self.uniqueId = -1;

  self.gameList = [];
  self.game = "none";
  self.startedGame = false;

  self.jumping = false;
  self.kicking = false;

  // overwrite super update by including updateSpd
  var super_update = self.update;
  self.update = function(){
    self.updateSpd();
    super_update();
  }
  
  // Handle keyboard inputs
  self.updateSpd = function(){
     // If not playing BoxKick
    if(self.game!="BoxKick"){
      // right and left
      if(self.pressingRight){
        self.spdX = self.maxSpeed;
      } else if(self.pressingLeft){
        self.spdX = -self.maxSpeed;
      } else {
        self.spdX = 0;
      }
    // up and down
      if(self.pressingUp){
        self.spdY = -self.maxSpeed;
      } else if(self.pressingDown){
        self.spdY = self.maxSpeed;
      } else {
        self.spdY = 0;
      }
    // If playing BoxKick
    } else if(self.game=="BoxKick"){
      
      // NEED TO DO SOMETHING ABOUT GRAVITY
      var grav = 1.2;

    // up and down
      if(self.pressingUp && self.jumping == false){
        self.spdY = -25;
        self.jumping = true;
        self.kicking = false;
      } else if(self.pressingDown && self.jumping == true){
        self.spdY = 15;
        self.spdX = 15;
        self.jumping = false;
        self.kicking = true;
      }

      // stop players from falling through the floor
      if((self.y + self.spdY >= 500)){
        self.y = 500;
        self.spdY=0;
        self.x+=self.spdX;
        self.spdX=0;
      }

      // Primitive way of gravity

      // If above the boundary, and they are not kicking, apply gravity
      // And stop them from being able to jump
      if(self.y < 500 && self.kicking == false){
        self.spdY+=grav;
        self.jumping = true;
      // If they are above the boundary, and are kicking, don't apply gravity
      } else if(self.y < 500 && self.kicking == true){
        self.jumping = true;
      } else if(self.y==500){
        self.jumping = false;
      }

    }

  }

  Player.list[id] = self;
  return self;
}

// Static list of players
Player.list = {};

// Handles player specific stuff
Player.onConnect = function(socket){
  var player = Player.list[socket.id];
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

  socket.on('ready', function(){
    player.ready = true;
  });
}

// Static onDisconnect function for all Players
Player.onDisconnect = function(socket){
  delete Player.list[socket.id];
}

// Static update function for all Players
Player.update = function(players){
  var dataPackage = [];
  // Loop through each player in given player array
  for(var i in players){
    var player = players[i];
    if(player != undefined){
      player.update();
      dataPackage.push({
        x:player.x,
        y:player.y,
        number:player.number,
        uniqueId:player.uniqueId,
      });
    }
  }

  return dataPackage;
}

var io = require('socket.io')(server, {});
// When a client connects, set id to random number, set x and y to 0, give unique number
// And update the socket list
io.sockets.on('connection', function(socket){
  numOfConnections++;
  socket.id = Math.random();
  SOCKET_LIST[socket.id] = socket;
  
  var player = Player(socket.id);

  socket.on('id', function(data){

    player.uniqueId = data.id;

  });

  socket.on('debug', function(message){

    console.log("From client: " + message);

  });

  queue.push(player);
  console.log("Queue size after connection: " + queue.length);
  socket.emit('queue');

  // Take two players out of the queue, add them to a room
  if(queue.length>=2){
    handleRoom(queue);
  }

  Player.onConnect(socket);

  // When a player disconnects, remove them from the socket list
  socket.on('disconnect', function(){
    // Get room that the socket was connected to
    var temp = Player.list[socket.id];
    var room = temp.room;

    // Remove the socket from the server and player list
    delete SOCKET_LIST[socket.id];
    Player.onDisconnect(socket);

    // Force socket to leave the room it was connected to
    socket.leave(room);
    socket.emit('clearScreen');

    // Remove it from the queue if it was in it
    var index = queue.indexOf(socket.id);
    if(index >=0 ){
      queue.splice(index,1);
    }
    
    numOfConnections--;
  });

  

});

var startGame = false;

// Do stuff in function, every x amount of time
setInterval(function(){
  // Loop through all rooms

  for(var i in ROOM_LIST){
    
    // Create empty data package
    var dataPackage = [];

    //Get all clients in a room
    room = ROOM_LIST[i];
    //console.log(room);
    // If the room does not exist, stop
    if(io.sockets.adapter.rooms[room] == undefined){
      break;
    }

    // Get all clients inside the room
    var socketIDs = [];
    for (var socketId in io.sockets.adapter.rooms[room].sockets) {
      socketIDs.push(socketId);
    }
    
    // Create list of players based off of the socket IDS
    

    //If there are people actually in the room
    if(socketIDs.length==2){
      
    var players = [];
    var player1 = Player.list[socketIDs[0]];
    var player2 = Player.list[socketIDs[1]];

      players.push(player1);
      players.push(player2);

      // If both players are ready
      if(player1.ready == true && player2.ready == true){
        // Get updated data from the players
        if(player1.startedGame == false || player2.startedGame == false){
          player1.gameList[0].startGame();
          player2.gameList[0].startGame();
          player1.startedGame = true;
          player2.startedGame = true;
        }
        dataPackage = Player.update(players);
        handleCollisions(player1,player2);
      
        // Send the data to the respective players
        for(var i in players){
          if(players[i] != undefined){
            var socket = SOCKET_LIST[players[i].id];
              socket.emit('newPosition', dataPackage);
          }
        }
      } else {

        // Not ready.
        //console.log(room + " has players that are not ready.");

      }

      // Closes socketIDs if statement
    } else {
      var p1Socket = SOCKET_LIST[socketIDs[0]];
      var p2Socket = SOCKET_LIST[socketIDs[1]];
      // If there are not 2 people in the room, AKA someone left. Tell remaining client
      // That the other person left and stop the game

      // If player1 undefined, send player2 the message that player1 left
      if(p1Socket == undefined){
        p2Socket.emit('playerLeft');
      // Vice versa
      } else {
        p1Socket.emit('playerLeft');
      }

    }

  }
}, 1000/50);

handleCollisions = function(player1, player2){

  if(player1.game == "BoxKick" || player2.game == "BoxKick"){
      if(hitDetect(player1,player2)){

        if(player1.y<player2.y){
          // player1 wins
          console.log("Player1 wins!!!!");
        } else {
          // player2 wins
          console.log("Player1 wins!!!!");
        }

      }
  }

}

hitDetect = function(player1, player2){

  // Set x and y to the center of each box
  var p1x = player1.x+32;
  var p1y = player1.y+32;
  var p2x = player2.x+32;
  var p2y = player2.y+32;

  if(p1x+32 >= p2x-32 && p1x-32 <= p2x+32 && p1y+32 >= p2y-32 && p1y-32 <= p2y+32){
    return true;
  }
  
  return false;

}

generateGameList = function(p1, p2){

  var tempList = [];

  // FOR NOW ONLY ONE GAME, THEREFORE, ONE GAME IN List
  var g1 = BoxKick(p1, p2);
  tempList.push(g1);

  p1.gameList = tempList;
  p2.gameList = tempList;
  p1.game = p1.gameList[0].type;
  p2.game = p1.gameList[0].type;

  console.log("Starting game!!!!");

  return;
}

// Handles room separation and queue stuff
handleRoom = function(queue){
    var player1 = queue.shift();
    var player2 = queue.shift();

    // Convert player socketid into a socket
    p1Socket = SOCKET_LIST[player1.id];
    p2Socket = SOCKET_LIST[player2.id];

    // If a socket randomly drops for some reason.
    // Ex: refreshing while in queue
    if(p1Socket === undefined){
      queue.push(player2);
      return;
    } else if(p2Socket === undefined){
      queue.push(player1);
      return;
    }

    var roomToJoin;
    // Check to see if rooms are open here (todo)
    for(var i in ROOM_LIST){
      // If there are no people in the game
      // You have found a room to join
      if(io.sockets.adapter.rooms[ROOM_LIST[i]] != undefined){
        var numClients = io.sockets.adapter.rooms[ROOM_LIST[i]].length;

        if(numClients>=1){
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

    player1.room = roomToJoin;
    player2.room = roomToJoin;

    generateGameList(player1, player2);

    p1Socket.join(roomToJoin);
    p2Socket.join(roomToJoin);

    console.log("Joined room: " + roomToJoin);
}