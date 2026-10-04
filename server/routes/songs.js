const express = require("express");
const { Song } = require("../models");
const { enqueue } = require("../lib/artwork");
const { extractVideoId, findVideo } = require("../lib/youtube");

const router = express.Router();

// update a song
router.patch("/:id", async (req, res, next) => {
  try {
    const song = await Song.findByPk(req.params.id);

    if (!song) {
      return res.status(404).json({ error: "Song not found" });
    }

    const { title, artist, duration } = req.body;
    const updates = {};

    if (title !== undefined) {
      if (!title || !title.trim()) {
        return res.status(400).json({
          error: "title cannot be empty",
        });
      }

      updates.title = title.trim();
    }

    if (artist !== undefined) {
      if (!artist || !artist.trim()) {
        return res.status(400).json({
          error: "artist cannot be empty",
        });
      }

      updates.artist = artist.trim();
    }

    if (duration !== undefined) {
      const seconds = Number(duration);

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

    res.status(200).json(song);
  } catch (err) {
    if (err.name === "SequelizeValidationError") {
      return res.status(400).json({
        error: err.errors[0].message,
      });
    }

    next(err);
  }
});

// the YouTube video for a song, looked up the first time and then saved on the song
router.get("/:id/video", async (req, res, next) => {
  try {
    const song = await Song.findByPk(req.params.id);

    if (!song) {
      return res.status(404).json({ error: "Song not found" });
    }

    if (song.youtubeId) {
      return res.json({ youtubeId: song.youtubeId });
    }

    // "" means we already searched and found nothing, don't spend quota again
    if (song.youtubeId === null) {
      let videoId;

      try {
        videoId = await findVideo(song.artist, song.title);
      } catch (err) {
        const status = { not_configured: 503, quota: 429 }[err.code] || 502;
        return res.status(status).json({ error: err.message, code: err.code || "failed" });
      }

      await song.update({ youtubeId: videoId });
      if (videoId) return res.json({ youtubeId: videoId });
    }

    res.status(404).json({
      error: "No YouTube video found for this song",
      code: "no_match",
    });
  } catch (err) {
    next(err);
  }
});

// delete a song
router.delete("/:id", async (req, res, next) => {
  try {
    const song = await Song.findByPk(req.params.id);

    if (!song) {
      return res.status(404).json({ error: "Song not found" });
    }

    await song.destroy();

    res.sendStatus(204);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
