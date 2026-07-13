const express = require("express");

const router = express.Router();

// get a 30 sec preview for a song from the itunes api
// done on the server so the browser doesn't get a cors error
router.get("/", async (req, res, next) => {
  try {
    const artist = (req.query.artist || "").trim();
    const title = (req.query.title || "").trim();
    const term = `${artist} ${title}`.trim();
    if (!term) {
      return res.status(400).json({ error: "artist or title is required" });
    }

    const url =
      "https://itunes.apple.com/search?" +
      new URLSearchParams({
        term,
        media: "music",
        entity: "song",
        limit: "1",
      });

    const response = await fetch(url);
    if (!response.ok) {
      return res.status(502).json({ error: "Music lookup failed" });
    }

    const data = await response.json();
    const hit = data.results && data.results[0];
    if (!hit || !hit.previewUrl) {
      return res.status(404).json({ error: "No preview found for this song" });
    }

    // only send back what the player needs
    res.status(200).json({
      previewUrl: hit.previewUrl,
      artworkUrl: hit.artworkUrl100 || null,
      trackName: hit.trackName,
      artistName: hit.artistName,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
