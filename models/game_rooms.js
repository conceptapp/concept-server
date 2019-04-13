let mongoose = require('mongoose')

let game_rooms = new mongoose.Schema({
  name: {
  	type: String,
  	unique: true
  },
  // count: {
  // 	type: Number,
  // 	default: 0
  // },
  creator: String,
  creator_email: String,
  guess_cards: Object,
  mode: String,
  players: [{
    socketId: String,
    name: String,
    avatarUrl: String,
    isGod: Boolean
  }],
  chat: [{  // array of message objects
    author: String,
    messageData: Object,
    messageType: String
  }]
})
module.exports = mongoose.model('Game_rooms', game_rooms)



// CREATE TABLE game_rooms (  id serial PRIMARY KEY,  name VARCHAR (40),  count INTEGER);

// clients = {
// 	id (socket_id): text	
// 	game_room_name: either an id of game_room or Name (varchar(40))
// 	game_room_id: foreign key of game_rooms
// 	}

// CREATE TABLE clients (  id serial PRIMARY KEY,  socket_id TEXT, game_room_name VARCHAR (40),  game_room_id TEXT);

// INSERT INTO clients (socket_id, game_room_name, game_room_id) VALUES  ( 'socket_id_02980973',  'La partie de Max',  'game_room_id_09898798' );


// Array
// Boolean
// Buffer
// Date
// Mixed (A generic / flexible data type)
// Number
// ObjectId
// String