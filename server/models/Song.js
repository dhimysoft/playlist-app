const { DataTypes } = require("sequelize");
const sequelize = require("../db");

const Song = sequelize.define("Song", {
  title: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: { notEmpty: true },
  },
  artist: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: { notEmpty: true },
  },
  // store seconds, show as 3:45 on the frontend
  duration: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 1 },
  },
  // cover image url. null = not looked up yet, "" = looked up but none found
  artworkUrl: {
    type: DataTypes.STRING(1024),
    allowNull: true,
    defaultValue: null,
  },
  // YouTube video id for full-song playback. null = not looked up yet, "" = no match found
  youtubeId: {
    type: DataTypes.STRING(20),
    allowNull: true,
    defaultValue: null,
  },
});

module.exports = Song;
