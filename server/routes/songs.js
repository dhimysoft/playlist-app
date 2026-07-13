const express = require("express");
const { Song } = require("../models");

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

    await song.update(updates);

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
