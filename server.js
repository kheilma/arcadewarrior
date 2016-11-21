
var express  = require('express');
var app      = express();
var cfenv = require('cfenv');
var port     = process.env.PORT || 8080;
var mongoose = require('mongoose');
var passport = require('passport');
var flash    = require('connect-flash');
var server = require('http').Server(app);
var configDB = require('./config/database.js');



mongoose.connect('mongodb://80a9509e-caf7-4e6e-b44f-1e9ef40e21d0:ec588a90-de18-47ca-8d99-72c37d7e21b1@50.23.230.137:10329/db');



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

}, 1000/25);