const { DataTypes } = require("sequelize");
const sequelize = require("../db");

const Playlist = sequelize.define("Playlist", {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: { notEmpty: true },
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
    defaultValue: "",
  },
});

module.exports = Playlist;
