// server.js

// app.js
var express    = require('express');
var app        = express();
var cors = require('cors');
var bodyParser = require('body-parser');
var port       = process.env.PORT || 5000; 

// Attaching socket.io
var server = require('http').createServer(app);
var io = require('socket.io')(server);

/* Connect the database */
// require('./database')
// let ClientsModel = require('./models/clients')
// let GamesModel = require('./models/game_rooms')

// let client = new ClientsModel({
//   socket_id: 'test socket_id',
//   game_roome_name: 'la Partie de Mongo DB'
// })
// client.save()
//   .then(doc => {
//     console.log("Success")
//     console.log(doc)
//   })
//   .catch(err => {
//     console.error(err)
//  })

// ClientsModel
//   .find({
//     game_roome_name: 'la Partie de Mongo DB'   // search query
//   })
//   .then(doc => {
//     console.log(doc)
//   })
//   .catch(err => {
//     console.error(err)
//   })

/* Concept server real logic */
var clients = [];
var game_rooms = {};

function join_game (socket, data) {
  console.log('joining game: ', data)
  // current client (socket) is joining the game room
  clients[socket.id]['game_room'] = data
  // let client = new ClientsModel({
  //   socket_id: socket.id,
  //   game_roome_name: data
  // })
  // client.save()
  //   .then(doc => {
  //     console.log(doc)
  //   })
  //   .catch(err => {
  //     console.error(err)
  //  })
  // add the client to the socket to get cards updates
  socket.join(data)
  // one more player in the room
  game_rooms[data]++
  io.sockets.emit('update_game_rooms', game_rooms)
}

function leave_game (socket, data) {
  // current client (socket) is leaving the game room
  socket.leave(clients[socket.id]['game_room'])
  clients[socket.id]['game_room'] = ''
  // remove a player from the room and delete room if no more players
  game_rooms[data]--
  if (game_rooms[data] < 1) {
    delete game_rooms[data]
  }
  io.sockets.emit('update_game_rooms', game_rooms)
}

io.on('connection', (socket) => {
  // console.log("client connected")
  console.log(socket.id)
  clients[socket.id] = { }
  // io.sockets.emit('update_game_rooms', game_rooms)
  io.to(socket.id).emit('update_game_rooms', game_rooms)

  socket.on('create_game', (data) => {
    console.log('creating game: ', data)
    // append the game_room to the array if doesn't exist yet
    if (data in game_rooms) {
      join_game(socket, data)
    } else {
      // initiate the counter of clients to 1
      game_rooms[data] = 1
      clients[socket.id]['game_room'] = data
      socket.join(data)
    }
    console.log('game rooms: ', game_rooms)
    io.sockets.emit('update_game_rooms', game_rooms)
  })

  socket.on('join_game', (data) => {
    console.log('called socket joined game: ', data)
    join_game(socket, data)
  })

  socket.on('leave_game', (data) => {
    console.log('called socket leave game: ', data)
    leave_game(socket, data)
  })

  // cards have been updated on one client
  socket.on('update_cards_from_client', (data) => {
    console.log('update_cards from client: ', data)
    io.to(data.game_room).emit('update_cards_from_server', data)
  })

  socket.on('disconnect', () => { 
    // console.log("client disconnected") 
  })
})


/* Websocket technical stuff */
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

// app.get('server').listen(port);