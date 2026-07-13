const sequelize = require("../db");
const Playlist = require("./Playlist");
const Song = require("./Song");

// playlist has many songs, song belongs to one playlist
// cascade so deleting a playlist also deletes its songs
Playlist.hasMany(Song, {
  onDelete: "CASCADE",
  hooks: true,
});
Song.belongsTo(Playlist);

module.exports = { sequelize, Playlist, Song };
