// db connection, everything imports this
const { Sequelize } = require("sequelize");

const sequelize = new Sequelize(
  process.env.DATABASE_URL || "postgres://localhost:5432/playlist_db",
  {
    logging: false,
  }
);

module.exports = sequelize;
