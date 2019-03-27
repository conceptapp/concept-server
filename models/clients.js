let mongoose = require('mongoose')
let clientsSchema = new mongoose.Schema({
  socket_id: {
  	type:  String,
  	unique: true
  },
  player_name: String,
  game_room_name: String,
  game_room_id: mongoose.Schema.Types.ObjectId
})
module.exports = mongoose.model('Clients', clientsSchema)


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