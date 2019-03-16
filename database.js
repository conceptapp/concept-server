// database.js

let mongoose = require('mongoose');

// local connection
const server = '127.0.0.1:27017'; // REPLACE WITH YOUR DB SERVER
const database = 'conceptdb';      // REPLACE WITH YOUR DB NAME
// const url = `mongodb://${server}/${database}`
// heroku server
const url = `mongodb+srv://dbUser:dbUserPassword@cluster0-pulfz.mongodb.net/${database}?retryWrites=true`
// mongodb+srv://dbUser:dbUserPassword@cluster0-pulfz.mongodb.net/test?retryWrites=true
// mongodb+srv://dbUser:<password>@cluster0-pulfz.mongodb.net/test?retryWrites=true


class Database {
  constructor() {
    this._connect()
  }
_connect() {
     mongoose.connect(url)
       .then(() => {
         console.log('Database connection successful')
       })
       .catch(err => {
         console.error('Database connection error')
       })
  }
}
module.exports = new Database()