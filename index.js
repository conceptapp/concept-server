// index.js

require('./database')

// app.js
var express    = require('express');
var app        = express();
var cors       = require('cors');
var bodyParser = require('body-parser');
var port       = process.env.PORT || 5000; 

// Attaching socket.io
var server = require('http').createServer(app);
var io     = require('socket.io')(server);

/* Connect the database */
let ClientsModel = require('./models/clients')
let GamesModel = require('./models/game_rooms')
let BoardsModel = require('./models/boards')

function game_update(data, increaseOrDecrease) {
  if (increaseOrDecrease === 'increase') {
    var increase = 1
  } else {
    var increase = -1
  }
  GamesModel
    .findOneAndUpdate(
      {
        name: data.game   // search query
      },
      {
        $inc: { count: increase } // field: increase of decrease counter
      },
      {
        new: true               // return updated document
      })
    .then(doc => {
      // if no more users in the room, delete game room
      if (doc.count < 1) {
        // delete game room document
        console.log('game room has no more players')
        doc.remove(function (err) {
            // if no error, doc is removed
            console.log(err)
            send_updated_game_rooms({})
        })
      } else {
        if (increaseOrDecrease === 'increase') {
          console.log('player joined: ', data.player)
          send_updated_game_rooms({ 'playerJoined': data.player, 'game': data.game} )
        } else {
          console.log('player left: ', data.player)
          send_updated_game_rooms({ 'playerLeft': data.player, 'game': data.game} )
        }
      }
      return doc
    })
    .catch(err => {
      console.error(err)
      return null
    })  
}

function create_game (socket, data) {
  // find the game room if exists or else create it (upsert = true)
  // initiate counter to 1
  GamesModel
    .findOneAndUpdate(
      {
        name: data.currentGameRoom    // query
      },
      {
        name: data.currentGameRoom,
        guess_cards: data.guessCards,
        mode: data.gameMode,
        $inc: {count: 1}    // field update
      },
      {
        upsert: true,
        new: true 
      })
    .then(doc => {
      console.log('game created successfully: ', doc)
      // update the client database with the room
      join_game(socket, data)
      send_updated_game_rooms({ }) // 'playerJoined': data.player
    })
    .catch(err => {
      console.error(err)
    })
}

function join_game (socket, data, increaseCount) {
  console.log('joining game: ', data, increaseCount)
  ClientsModel
    .findOneAndUpdate(
      {
        socket_id: socket.id       // query
      },
      {
        socket_id: socket.id,
        game_room_name: data.game,       // field update
        player_name: data.player
      },
      {
        upsert: true,
        new: true
      })
      .then(doc => {
        console.log('current client on the right game room: ', doc)
      })
      .catch(err => {
        console.error(err)
      })
  // add the client to the socket to get cards updates
  socket.join(data.game)
  // one more player in the room ?
  var increase = increaseCount ? 1 : 0
  GamesModel
    .findOneAndUpdate(
      {
        name: data.game    // query
      },
      {
        // name: data,
        $inc: {count: increase}    // field update
      },
      {
        new: true           // return updated document
      })
    .then(doc => { 
      send_updated_game_rooms({ 'playerJoined': data.player, 'game': data.game })
      // update current cards to all the connected clients
      var data2 = {
        currentGameRoom: doc.name,
        guessCards: doc.guess_cards
      }
      update_cards_from_server(socket, data2)
    })
    .catch(err => { console.error(err) })
}

function leave_game (socket, data) {
  // current client (socket) is leaving the game room
  ClientsModel
    .findOneAndUpdate(
      {
        socket_id: socket.id    // search query
      },
      {
        game_room_name: ''      // field: values to update

      },
      {
        new: true               // return updated document
      })
    .then(doc => {
      console.log('leave game ok: ', doc)
    })
    .catch(err => {
      console.error(err)
    })
  // current client (socket) is leaving the game room
  socket.leave(data.game)
  // remove a player from the room and delete room if no more players
  game_update(data, 'decrease')
}

function send_updated_game_rooms (args) {
  console.log('send_updated_game_rooms: ', args)
  GamesModel
    .find()
    .then(doc => {
      var game_rooms = {}
      doc.forEach( function(el, i) {
        game_rooms[el.name] = {
          count: el.count,
          mode: el.mode
        }
      })
      // append game_rooms to args to keep if player joined or left
      args['game_rooms'] = game_rooms
      // if socketId is not defined, broadcast to all the connected clients
      if ('socketId' in args) {
          io.to(args['socketId']).emit('update_game_rooms', args)
        } else {
          io.sockets.emit('update_game_rooms', args)
        }
      })
    .catch(err => {
      console.error(err)
    })
}

function update_cards_from_server(socket, data) {
  // update Game room with the cards and push the info to the clients
  console.log('update cards from server: ', data)
  GamesModel
    .findOneAndUpdate(
      {
        name: data.currentGameRoom    // query
      },
      {
        guess_cards: data.guessCards
      },
      {
        new: true 
      })
    .then(doc => {
      console.log('game updated successfully: ', doc)
      // update the client database with the room
      io.to(doc.name).emit('update_cards_from_server', data)
    })
    .catch(err => {
      console.error(err)
    })
}

function upsert_board (socket, data) {
  // create a new board or update if same player with same words (upsert true to create if doesn't exist)
 BoardsModel
    .findOneAndUpdate(
      {
        creator: data.creator,    // query
        word: data.word
      },
      {
        creator: data.creator,
        word: data.word,
        word_variants: data.word_variants,
        guess_cards: data.guess_cards,
        difficulty: data.difficulty,
      },
      {
        upsert: true,
        new: true 
      })
    .then(doc => {
      console.log('board created successfully: ', doc)
      // TODO split message back to client depending on if update or insert ?
      // send back info that it worked
      io.to(socket.id).emit('board_created')
    })
    .catch(err => {
      console.error(err)
    })
}

function get_boards (socket, data) {
  // create a new board or update if same player with same words (upsert true to create if doesn't exist)
 BoardsModel
  .find()
  .then(doc => {
      // send back info that it worked
      console.log('found boards', doc)
      io.to(socket.id).emit('boards_info', doc)
    })
    .catch(err => {
      console.error(err)
    })
}

io.on('connection', (socket) => {
  console.log('client connected?: ', socket.id)
  // clients[socket.id] = { }
  send_updated_game_rooms({ 'socketId':socket.id })

  // calling create game websocket
  socket.on('create_game', (data) => {
    console.log('creating game: ', data)
    create_game(socket, data)
  })

  // calling join game websocket
  socket.on('join_game', (data) => {
    console.log('called socket joined game: ', data)
    join_game(socket, data, true)
  })

  // calling leave game websocket
  socket.on('leave_game', (data) => {
    console.log('called socket leave game: ', data)
    leave_game(socket, data)
  })

  // cards have been updated on one client
  socket.on('update_cards_from_client', (data) => {
    console.log('update_cards from client: ', data)
    // store current guess cards and update connected clients
    update_cards_from_server(socket, data)
  })

  // player wants to create a new board or update one
  socket.on('upsert_board', (data) => {
    console.log('upsert board: ', data)
    // store current guess cards and update connected clients
    upsert_board(socket, data)
  })

  // send boards to the requesting client
  socket.on('get_boards', (data) => {
    console.log('getting boards', data)
    get_boards(socket, data)
  })

  socket.on('disconnect', () => { 
    console.log("client disconnected: ", socket.id)
    // remove client from Client database and decrease counter in game_room
    ClientsModel
      .findOneAndDelete({
        socket_id: socket.id    // search query
      })
      .then(doc => {
        console.log('client removed sucessfully: ', doc)
        // remove a player from the room and delete room if no more players
        game_update({
          'game': doc.game_room_name,
          'playerLeft': doc.player
          }, 'decrease')
      })
      .catch(err => {
        console.error(err)
      })
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

app.get('server').listen(port);