// app.js
var express    = require('express');
var app        = express();
var cors = require('cors');
var bodyParser = require('body-parser');
var port       = process.env.PORT || 5000; 

// Attaching socket.io
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var clients = [];
var game_rooms = [];

function join_game (socket, data) {
  console.log('joining game: ', data)
  // current client (socket) is joining the game room
  clients[socket.id]['game_room'] = data.game_room
  socket.join(data.game_room)
  // one more player in the room
  game_rooms[data.game_room]++
  io.sockets.emit('game_rooms', game_rooms)
}

io.on('connection', (socket) => {
	console.log("client connected")
	console.log(socket.id)
	clients[socket.id] = { }

	socket.on('create_game', (data) => {
		console.log(data)
    // append the game_room to the array if doesn't exist yet
    if (data.game_room in game_rooms) {
      join_game(socket, data)
    } else {
      // initiate the counter of clients to 1
      game_rooms[data.game_room] = 1
      clients[socket.id]['game_room'] = data.game_room
      socket.join(data.game_room)
    }
		io.sockets.emit('game_rooms', game_rooms)
	})

  socket.on('join_game', (data) => {
    console.log('called socket joined game: ', data)
    join_game(data)
  })

  socket.on('leave_game', (data) => {
    console.log('called socket leave game: ', data)
    // current client (socket) is leaving the game room
    socket.leave(clients[socket.id]['game_room'])
    clients[socket.id]['game_room'] = ''
    // remove a player from the room and delete room if no more players
    game_rooms[data.game_room]--
    if (game_rooms[data.game_room] < 1) {
      delete game_rooms[data.game_room]
    }
    io.sockets.emit('game_rooms', game_rooms)
  })

	// cards have been updated on one client
	socket.on('update_cards_from_client', (data) => {
		console.log('update_cards from client: ', data)
    io.to(data.game_room).emit('update_cards_from_server', data)
	})

	socket.on('disconnect', () => { 
		console.log("client disconnected") 
	})
})

app.set('socketio', io); 
app.set('server', server);
var whitelist = ['https://concept-35ade.firebaseapp.com', 'localhost:8080'];
var corsOptions = {
 origin: function(origin, callback){
   var originIsWhitelisted = whitelist.indexOf(origin) !== -1;
   callback(null, originIsWhitelisted);
 }
};

app.use(cors(corsOptions));

// configure body parser
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get('server').listen(port);