const express = require("express");
const router = express.Router();

const { sequelize, Playlist, Song } = require("../models");
const { enqueue } = require("../lib/artwork");
const { extractVideoId } = require("../lib/youtube");

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

      // look up its cover in the background
      enqueue(song.id, { first: true });

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

// add many songs at once: body is { songs: [{ title, artist, duration }, ...] }
// all or nothing, so one bad row doesn't leave a half imported list
const MAX_BULK_SONGS = 500;

router.post("/:id/songs/bulk", async (req, res, next) => {
  try {
    const playlist = await Playlist.findByPk(req.params.id);

    if (!playlist) {
      return res.status(404).json({
        error: "Playlist not found",
      });
    }

    const { songs } = req.body;

    if (!Array.isArray(songs) || songs.length === 0) {
      return res.status(400).json({
        error: "songs must be a non-empty array",
      });
    }

    if (songs.length > MAX_BULK_SONGS) {
      return res.status(400).json({
        error: `You can add at most ${MAX_BULK_SONGS} songs at once`,
      });
    }

    // check every row first and report which ones are wrong (row numbers start at 1)
    const rows = [];
    const problems = [];

    songs.forEach((item, index) => {
      const title = typeof item?.title === "string" ? item.title.trim() : "";
      const artist = typeof item?.artist === "string" ? item.artist.trim() : "";
      const seconds = Number(item?.duration);

      if (!title) {
        problems.push(`Song ${index + 1}: title is required`);
      } else if (!artist) {
        problems.push(`Song ${index + 1}: artist is required`);
      } else if (!Number.isInteger(seconds) || seconds < 1) {
        problems.push(`Song ${index + 1}: duration must be a positive number of seconds`);
      } else {
        rows.push({ title, artist, duration: seconds, PlaylistId: playlist.id });
      }
    });

    if (problems.length > 0) {
      return res.status(400).json({
        error: problems.slice(0, 5).join("; "),
        problems,
      });
    }

    // one transaction, created one by one so they keep their order (createdAt)
    const created = await sequelize.transaction(async (transaction) => {
      const made = [];

      for (const row of rows) {
        made.push(await Song.create(row, { transaction }));
      }

      return made;
    });

    // look up their covers in the background
    created.forEach((song) => enqueue(song.id));

    res.status(201).json(created);
  } catch (err) {
    if (err.name === "SequelizeValidationError") {
      return res.status(400).json({
        error: err.errors[0].message,
      });
    }

    next(err);
  }
});

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

    // YouTube link/id: "" clears it so the next play looks it up again
    if (req.body.youtubeId !== undefined) {
      const raw = String(req.body.youtubeId || "").trim();

      if (raw === "") {
        updates.youtubeId = null;
      } else {
        const videoId = extractVideoId(raw);

        if (!videoId) {
          return res.status(400).json({
            error: "That doesn't look like a YouTube link",
          });
        }

        updates.youtubeId = videoId;
      }
    }

    // a different title/artist means a different cover (and a different video)
    const changed =
      (updates.title && updates.title !== song.title) ||
      (updates.artist && updates.artist !== song.artist);
    if (changed) {
      updates.artworkUrl = null;
      if (req.body.youtubeId === undefined) updates.youtubeId = null;
    }

    await song.update(updates);
    if (changed) enqueue(song.id, { first: true });

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
