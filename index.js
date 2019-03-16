// index.js

require('./database')

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
let ClientsModel = require('./models/clients')
let GamesModel = require('./models/game_rooms')

// let client = new ClientsModel({
//   socket_id: 'test socket_id',
//   game_roome_name: 'la Partie de Mongo DB'
// })
// console.log("midddle")
// client.save()
//   .then(doc => {
//     console.log("Success")
//     console.log(doc)
//   })
//   .catch(err => {
//     console.error(err)
//  })

// ClientsModel
// 	.find({
//     game_roome_name: 'la Partie de Mongo DB'   // search query
// 	})
// 	.then(doc => {
//     console.log(doc)
// 	})
// 	.catch(err => {
// 	  console.error(err)
// 	})

/* Concept server real logic */
// var clients = [];
// var game_rooms = {};

function game_update(game_room_name, increaseOrDecrease) {
  if (increaseOrDecrease == 'increase') {
    var increase = 1
  } else {
    var increase = -1
  }
  GamesModel
    .findOneAndUpdate(
      {
        name: game_room_name   // search query
      },
      {
        $inc: {count: increase }      // field: increase of decrease counter
      },
      {
        new: true               // return updated document
      })
    .then(doc => {
      console.log('game update: ', doc)
      // if no more users in the room, delete game room
      if (doc.count < 1) {
        // TODO delete game_room
        // delete game_rooms[data]
        console.log('game room has no more players')
        doc.remove(function (err) {
            // if no error, doc is removed
            console.log(err)
            send_updated_game_rooms()
        });
      } else {
        send_updated_game_rooms()
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
        name: data    // query
      },
      {
        // name: data,
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

      // check if doc.updatedExisting is true ?

      // append the game_room to the array if doesn't exist yet
      // if (data == game_room[name]) {
      //   join_game(socket, data)
      // } else {
      //   // clients[socket.id]['game_room'] = data
      // }
      // console.log('game rooms: ', game_rooms)
      send_updated_game_rooms()
    })
    .catch(err => {
      console.error(err)
    })
}

function join_game (socket, data, increaseCount) {
  console.log('joining game: ', data, increaseCount)
  // current client (socket) is joining the game room
  // clients[socket.id]['game_room'] = data
  // let client = new ClientsModel({
  //   socket_id: socket.id,
  //   game_roome_name: data
  // })
  // client.save()
  ClientsModel
    .findOneAndUpdate(
      {
        socket_id: socket.id       // query
      },
      {
        socket_id: socket.id,
        game_roome_name: data       // field update
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
  socket.join(data)
  // one more player in the room
  if (increaseCount) {
    // game_rooms[data]++
      GamesModel
        .findOneAndUpdate(
          {
            name: data    // query
          },
          {
            // name: data,
            $inc: {count: 1}    // field update
          },
          {
            new: true           // return updated document
          })
        .then(doc => { 
          console.log('increase count ok: ', doc) 
          send_updated_game_rooms()
        })
        .catch(err => { console.error(err) })
  }
}

function leave_game (socket, data) {
  // current client (socket) is leaving the game room
  // clients[socket.id]['game_room'] = ''
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
  socket.leave(data)
  // remove a player from the room and delete room if no more players
  game_update(data, 'decrease')
}

function send_updated_game_rooms (socketId) {
  GamesModel
    .find()
    .then(doc => {
      var game_rooms = {}
      doc.forEach( function(el, i) {
        game_rooms[el.name] = el.count
      })
      // if socketId is not defined, broadcast to all the connected clients
      if (socketId == undefined) {
          io.sockets.emit('update_game_rooms', game_rooms)
        } else {
          // console.log(game_rooms)
          io.to(socketId).emit('update_game_rooms', game_rooms)
        }
      })
    .catch(err => {
      console.error(err)
    })
}

io.on('connection', (socket) => {
  console.log('client connected: ', socket.id)
  // clients[socket.id] = { }
  send_updated_game_rooms(socket.id)

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
    // io.to(data.game_room).emit('update_cards_from_server', data)
    send_updated_game_rooms()
  })

  socket.on('disconnect', () => { 
    console.log("client disconnected")
    // remove client from Client database and decrease counter in game_room
    ClientsModel
      .findOneAndDelete({
        socket_id: socket.id    // search query
      })
      .then(doc => {
        console.log('client removed sucessfully: ', doc)
        // TODO Add decrease
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