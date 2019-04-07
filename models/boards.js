let mongoose = require('mongoose')
let boardsSchema = new mongoose.Schema({
  creator: String,	// player who created the board
  word: String, // main word to guess
  word_variants: [String],  // acceptable words
  guess_cards: Object,
  difficulty: String,
  // created_date: Date,
  players: [{ // player who played the board >> [playerName, boolean if found the right word, time spent already, last time played]
    playerName: String,
    playerEmail: String,
    found: Boolean,
    gaveUp: Boolean,
    timeSpent: Number, // in milliseconds
    lastPlayed: Date
  }]  
},
{
  timestamps: true  // automagically, createdAt and UpdatedAt are now part of the model
})
module.exports = mongoose.model('Boards', boardsSchema)