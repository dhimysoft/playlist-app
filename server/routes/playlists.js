const express = require("express");
const router = express.Router();

const { Playlist, Song } = require("../models");

// check the playlist has a name before creating
function requirePlaylistName(req, res, next) {
  if (!req.body.name || !req.body.name.trim()) {
    return res.status(400).json({
      error: "name is required",
    });
  }

  next();
}

// check the song fields before creating
function requireSongFields(req, res, next) {
  const { title, artist, duration } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({
      error: "title is required",
    });
  }

  if (!artist || !artist.trim()) {
    return res.status(400).json({
      error: "artist is required",
    });
  }

  const seconds = Number(duration);

  if (!Number.isInteger(seconds) || seconds < 1) {
    return res.status(400).json({
      error: "duration must be a positive number of seconds",
    });
  }

  next();
}

// get all playlists (with their songs)
router.get("/", async (req, res, next) => {
  try {
    const playlists = await Playlist.findAll({
      include: Song,
      order: [["createdAt", "ASC"]],
    });

    res.json(playlists);
  } catch (err) {
    next(err);
  }
});

// get one playlist + its songs
router.get("/:id", async (req, res, next) => {
  try {
    const playlist = await Playlist.findByPk(req.params.id, {
      include: Song,
      order: [[Song, "createdAt", "ASC"]],
    });

    if (!playlist) {
      return res.status(404).json({
        error: "Playlist not found",
      });
    }

    res.json(playlist);
  } catch (err) {
    next(err);
  }
});

// create a playlist
router.post("/", requirePlaylistName, async (req, res, next) => {
  try {
    const playlist = await Playlist.create({
      name: req.body.name.trim(),
      description: (req.body.description || "").trim(),
    });

    res.status(201).json(playlist);
  } catch (err) {
    if (err.name === "SequelizeValidationError") {
      return res.status(400).json({
        error: err.errors[0].message,
      });
    }

    next(err);
  }
});

// update a playlist
router.patch("/:id", async (req, res, next) => {
  try {
    const playlist = await Playlist.findByPk(req.params.id);

    if (!playlist) {
      return res.status(404).json({
        error: "Playlist not found",
      });
    }

    if (
      req.body.name !== undefined &&
      (!req.body.name || !req.body.name.trim())
    ) {
      return res.status(400).json({
        error: "name cannot be empty",
      });
    }

    const updates = {};

    if (req.body.name !== undefined) {
      updates.name = req.body.name.trim();
    }

    if (req.body.description !== undefined) {
      updates.description = req.body.description.trim();
    }

    await playlist.update(updates);

    res.json(playlist);
  } catch (err) {
    if (err.name === "SequelizeValidationError") {
      return res.status(400).json({
        error: err.errors[0].message,
      });
    }

    next(err);
  }
});

// delete a playlist (also deletes its songs)
router.delete("/:id", async (req, res, next) => {
  try {
    const playlist = await Playlist.findByPk(req.params.id);

    if (!playlist) {
      return res.status(404).json({
        error: "Playlist not found",
      });
    }

    await playlist.destroy();

    res.sendStatus(204);
  } catch (err) {
    next(err);
  }
});

// songs nested under a playlist (:id = playlist, :songId = song)

// get all songs in a playlist
router.get("/:id/songs", async (req, res, next) => {
  try {
    const playlist = await Playlist.findByPk(req.params.id);

    if (!playlist) {
      return res.status(404).json({
        error: "Playlist not found",
      });
    }

    const songs = await Song.findAll({
      where: {
        PlaylistId: playlist.id,
      },
      order: [["createdAt", "ASC"]],
    });

    res.json(songs);
  } catch (err) {
    next(err);
  }
});

// get one song in a playlist
router.get("/:id/songs/:songId", async (req, res, next) => {
  try {
    const playlist = await Playlist.findByPk(req.params.id);

    if (!playlist) {
      return res.status(404).json({
        error: "Playlist not found",
      });
    }

    const song = await Song.findOne({
      where: {
        id: req.params.songId,
        PlaylistId: playlist.id,
      },
    });

    if (!song) {
      return res.status(404).json({
        error: "Song not found in this playlist",
      });
    }

    res.json(song);
  } catch (err) {
    next(err);
  }
});

// add a song to a playlist
router.post(
  "/:id/songs",
  requireSongFields,
  async (req, res, next) => {
    try {
      const playlist = await Playlist.findByPk(req.params.id);

      if (!playlist) {
        return res.status(404).json({
          error: "Playlist not found",
        });
      }

      const song = await Song.create({
        title: req.body.title.trim(),
        artist: req.body.artist.trim(),
        duration: Number(req.body.duration),
        PlaylistId: playlist.id,
      });

      res.status(201).json(song);
    } catch (err) {
      if (err.name === "SequelizeValidationError") {
        return res.status(400).json({
          error: err.errors[0].message,
        });
      }

      next(err);
    }
  }
);

// update a song
router.patch("/:id/songs/:songId", async (req, res, next) => {
  try {
    const song = await Song.findOne({
      where: {
        id: req.params.songId,
        PlaylistId: req.params.id,
      },
    });

    if (!song) {
      return res.status(404).json({
        error: "Song not found in this playlist",
      });
    }

    const updates = {};

    if (req.body.title !== undefined) {
      if (!req.body.title || !req.body.title.trim()) {
        return res.status(400).json({
          error: "title cannot be empty",
        });
      }

      updates.title = req.body.title.trim();
    }

    if (req.body.artist !== undefined) {
      if (!req.body.artist || !req.body.artist.trim()) {
        return res.status(400).json({
          error: "artist cannot be empty",
        });
      }

      updates.artist = req.body.artist.trim();
    }

    if (req.body.duration !== undefined) {
      const seconds = Number(req.body.duration);

      if (!Number.isInteger(seconds) || seconds < 1) {
        return res.status(400).json({
          error: "duration must be a positive number of seconds",
        });
      }

      updates.duration = seconds;
    }

    await song.update(updates);

    res.json(song);
  } catch (err) {
    if (err.name === "SequelizeValidationError") {
      return res.status(400).json({
        error: err.errors[0].message,
      });
    }

    next(err);
  }
});

// delete a song
router.delete("/:id/songs/:songId", async (req, res, next) => {
  try {
    const song = await Song.findOne({
      where: {
        id: req.params.songId,
        PlaylistId: req.params.id,
      },
    });

    if (!song) {
      return res.status(404).json({
        error: "Song not found in this playlist",
      });
    }

    await song.destroy();

    res.sendStatus(204);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
