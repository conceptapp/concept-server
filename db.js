// db.js

/* Database model
game_rooms = { 
	name: varchar(40)
	count of players: int
	}

CREATE TABLE game_rooms (  id serial PRIMARY KEY,  name VARCHAR (40),  count INTEGER);

clients = {
	id (socket_id): text	
	game_room_name: either an id of game_room or Name (varchar(40))
	game_room_id: foreign key of game_rooms
	}

CREATE TABLE clients (  id serial PRIMARY KEY,  socket_id TEXT, game_room_name VARCHAR (40),  game_room_id TEXT);

INSERT INTO clients (socket_id, game_room_name, game_room_id) VALUES  ( 'socket_id_02980973',  'La partie de Max',  'game_room_id_09898798' );

*/


const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

pool.on('connect', () => {
  console.log('connected to the db');
});

/**
 * Create Tables
 */
const createTables = () => {
  const queryText =
    `CREATE TABLE IF NOT EXISTS
      clients(
        id UUID PRIMARY KEY,
        success VARCHAR(128) NOT NULL,
        low_point VARCHAR(128) NOT NULL,
        take_away VARCHAR(128) NOT NULL,
        created_date TIMESTAMP,
        modified_date TIMESTAMP
      )`;

  pool.query(queryText)
    .then((res) => {
      console.log(res);
      pool.end();
    })
    .catch((err) => {
      console.log(err);
      pool.end();
    });
}

/**
 * Drop Tables
 */
const dropTables = () => {
  const queryText = 'DROP TABLE IF EXISTS reflections';
  pool.query(queryText)
    .then((res) => {
      console.log(res);
      pool.end();
    })
    .catch((err) => {
      console.log(err);
      pool.end();
    });
}

pool.on('remove', () => {
  console.log('client removed');
  process.exit(0);
});

module.exports = {
  createTables,
  dropTables
};

require('make-runnable');