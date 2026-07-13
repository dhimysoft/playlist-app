const express = require("express");
const cors = require("cors");

const sequelize = require("./db");
const playlistRoutes = require("./routes/playlists");
const songRoutes = require("./routes/songs");
const previewRoutes = require("./routes/preview");

const app = express();

app.use(cors());
app.use(express.json());

// health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/playlists", playlistRoutes);
app.use("/api/songs", songRoutes);
app.use("/api/preview", previewRoutes);

// nothing matched
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

// connect to the db then start the server
async function startApp() {
  try {
    await sequelize.authenticate();
    await sequelize.sync();

    console.log("Database connection established");

    app.listen(3000, () => {
      console.log("Server running on http://localhost:3000");
    });
  } catch (err) {
    console.error("Unable to start server:", err);
  }
}

startApp();
