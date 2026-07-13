const express = require("express");
const cors = require("cors");

const sequelize = require("./db");
const playlistRoutes = require("./routes/playlists");
const songRoutes = require("./routes/songs");
const previewRoutes = require("./routes/preview");

const app = express();

const PORT = process.env.PORT || 3000;


// part 4
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "https://playlist-app-zeta.vercel.app",
  process.env.FRONTEND_URL,
].filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    // Allow requests without an Origin header,
    // such as Postman, curl, and direct browser navigation.
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.warn(`CORS blocked request from: ${origin}`);

    return callback(new Error("This origin is not allowed by CORS."));
  },
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "playlist-api",
  });
});

// API routes
app.use("/api/playlists", playlistRoutes);
app.use("/api/songs", songRoutes);
app.use("/api/preview", previewRoutes);

// Nothing matched
app.use((req, res) => {
  res.status(404).json({
    error: "Route not found",
    method: req.method,
    path: req.originalUrl,
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);

  if (err.message === "This origin is not allowed by CORS.") {
    return res.status(403).json({
      error: "CORS request blocked",
    });
  }

  res.status(500).json({
    error: "Internal server error",
  });
});

async function startApp() {
  try {
    await sequelize.authenticate();
    console.log("Database connection established.");

    await sequelize.sync();
    console.log("Database tables synchronized.");

    app.listen(PORT, () => {
      console.log(`Playlist API running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Unable to start server:", err);
    process.exit(1);
  }
}

async function shutdown(signal) {
  console.log(`${signal} received. Closing database connection.`);

  try {
    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error("Error while closing the database connection:", err);
    process.exit(1);
  }
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

startApp();