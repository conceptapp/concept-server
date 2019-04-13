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
// let ClientsModel = require('./models/clients')
let GamesModel = require('./models/game_rooms')
let BoardsModel = require('./models/boards')

function create_game (socket, data) {
  // find the game room if exists or else create it (upsert = true)
  // initiate counter to 1
  GamesModel
    .findOneAndUpdate(
      {
        name: data.currentGameRoom    // query
      },
      {
        name: data.currentGameRoom,  // field update
        creator: data.playerName,
        creator_email: data.playerEmail,
        guess_cards: data.guessCards,
        mode: data.gameMode
        // $inc: {count: 1}    
      },
      {
        upsert: true,
        new: true 
      })
    .then(doc => {
      console.log('game created successfully: ', doc)
      // update the client database with the room
      join_game(socket, data)
      // send_updated_game_rooms({ }) // 'playerJoined': data.player
    })
    .catch(err => {
      console.error(err)
    })
}

function join_game (socket, data) {
  console.log('joining game: ', data)
  // add the client to the socket to get cards updates
  socket.join(data.currentGameRoom)
  // define the player object to update the model
  var player = {
    socketId: socket.id,
    name: data.playerName,
    avatarUrl: '',
    isGod: true
  }
  console.log('player in join game', player)
  GamesModel
    .findOneAndUpdate(
      {
        name: data.currentGameRoom    // query
      },
      {
        // name: data,
        $push: { players: player }    // field update
      },
      {
        new: true           // return updated document
      })
    .then(doc => {
      console.log('game update in join game', doc, data)
      send_updated_game_rooms({ 'playerJoined': data.playerName, 'game': data.currentGameRoom })
      // update current cards to all the connected clients
      var new_data = {
        currentGameRoom: doc.name,
        guessCards: doc.guess_cards
      }
      update_cards_from_server(socket, new_data)
    })
    .catch(err => { console.error(err) })
}

function leave_game (socket) {
  // current client (socket) is leaving the game room
  // remove player from game room
  console.log('leaving game', socket.id)
  GamesModel
    .findOneAndUpdate(
      {
        'players.socketId': socket.id   // query
      },
      {
        $pull: { players: {socketId: socket.id} }   // field update
        // 'creator': 'Test Sublime'
      })
    .then(doc => { 
      console.log('player is leaving the game', doc)
      // current client (socket) is leaving the game room
      socket.leave(doc.name)
      // if no more players in the room (1 left because we get the document before update), delete the document
      if (doc.players.length <= 1) {
        doc.remove(function (err) {
          // if no error, doc is removed
          console.log(err)
          send_updated_game_rooms({})
        })
      } else {
        var player = doc.players.filter(item => item.socketId === socket.id)[0]
        // console.log('player found', player)
        send_updated_game_rooms({ 'playerLeft': player.name, 'game': doc.name })
      }
    })
    .catch(err => { console.error(err) })
}

function send_updated_game_rooms (args) {
  GamesModel
    .find()
    .then(doc => {
      var game_rooms = {}
      doc.forEach( function(el, i) {
        game_rooms[el.name] = {
          count: el.count,
          mode: el.mode,
          creator_email: el.creator_email,
          players: el.players
        }
      })
      // append game_rooms to args to keep if player joined or left
      args['game_rooms'] = game_rooms
      console.log('send_updated_game_rooms: ', args)
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

function chat_new_message(socket, data) {
  // append new message to the game room and send updates to all the connected players
  var message = {
    'author': socket.id,
    'authorEmail': data.message.authorEmail,
    'messageData': data.message.data,
    'messageType': data.message.type
  }
  // console.log('append new message', message, data.game_room)
  GamesModel
    .findOneAndUpdate(
      {
        name: data.game_room   // search query
      },
      {
        $push: { chat: message } // push new message to chat field
      },
      {
        new: true               // return updated document
      })
    .then(doc => {
      // console.log('new message append successfully', doc, message, data)
      // send back the new message to all the clients
      var returned_message = data
      returned_message['message']['author'] = socket.id
      io.to(doc.name).emit('chat_new_message_from_server', returned_message)
      return doc
    })
    .catch(err => {
      console.error(err)
      return null
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
        $push: { players: data.player }
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

function update_board_variants (socket, data) {
  // create a new board or update if same player with same words (upsert true to create if doesn't exist)
  BoardsModel
    .findOneAndUpdate(
      {
        creator: data.creator,    // query
        word: data.word
      },
      {
        word_variants: data.word_variants,
      },
      {
        new: true // return updated document
      })
    .then(doc => {
      console.log('board variants updated successfully: ', doc)
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
    join_game(socket, data)
  })

  // calling leave game websocket
  socket.on('leave_game', (data) => {
    console.log('called socket leave game: ', data)
    leave_game(socket)
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

  // player wants to create a new board or update one
  socket.on('update_board_variants', (data) => {
    console.log('update_board_variants: ', data)
    // store current guess cards and update connected clients
    update_board_variants(socket, data)
  })

  // send boards to the requesting client
  socket.on('get_boards', (data) => {
    console.log('getting boards', data)
    get_boards(socket, data)
  })

  // received a new chat message
  socket.on('chat_new_message_from_client', (data) => {
    console.log('chat_new_message_from_client', data)
    chat_new_message(socket, data)
  })

  socket.on('disconnect', () => { 
    console.log("client disconnected: ", socket.id)
    leave_game(socket)
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