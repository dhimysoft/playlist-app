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
});

module.exports = Song;
