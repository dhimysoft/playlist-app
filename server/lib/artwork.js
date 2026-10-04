const { Song } = require("../models");

// cover art comes from the itunes search api (same source as the previews)
// itunes allows roughly 20 requests a minute, so lookups go through one slow queue
const GAP_MS = 3200;
const BACKOFF_MS = 65000;

// ask itunes for one song's cover
// returns a url, "" when itunes has no match, and throws if the lookup itself failed
async function findArtwork(artist, title) {
  const url =
    "https://itunes.apple.com/search?" +
    new URLSearchParams({
      term: `${artist} ${title}`.trim(),
      media: "music",
      entity: "song",
      limit: "1",
    });

  const response = await fetch(url);
  if (!response.ok) {
    const err = new Error(`iTunes responded ${response.status}`);
    err.status = response.status;
    throw err;
  }

  const data = await response.json();
  const hit = data.results && data.results[0];
  if (!hit || !hit.artworkUrl100) return "";

  // ask for a bigger image than the 100px default
  return hit.artworkUrl100.replace("100x100bb", "400x400bb");
}

const queue = [];
const queued = new Set();
let working = false;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function work() {
  if (working) return;
  working = true;

  while (queue.length > 0) {
    const id = queue.shift();
    queued.delete(id);

    try {
      const song = await Song.findByPk(id);
      // gone, or already has a result
      if (!song || song.artworkUrl !== null) continue;

      const artworkUrl = await findArtwork(song.artist, song.title);
      await song.update({ artworkUrl });
      await sleep(GAP_MS);
    } catch (err) {
      console.warn(`Artwork lookup failed for song ${id}: ${err.message}`);
      // put it back and slow down, probably rate limited
      queue.push(id);
      queued.add(id);
      await sleep(BACKOFF_MS);
    }
  }

  working = false;
}

function enqueue(id, { first = false } = {}) {
  if (queued.has(id)) return;
  queued.add(id);
  if (first) queue.unshift(id);
  else queue.push(id);
  work();
}

// queue every song that hasn't been looked up yet
// the first songs of each playlist go first because they make the playlist covers
async function enqueueMissing() {
  const songs = await Song.findAll({
    where: { artworkUrl: null },
    order: [
      ["PlaylistId", "ASC"],
      ["createdAt", "ASC"],
    ],
  });

  const seen = {};
  const ranked = songs.map((song) => {
    seen[song.PlaylistId] = (seen[song.PlaylistId] || 0) + 1;
    return { id: song.id, rank: seen[song.PlaylistId] };
  });
  ranked.sort((a, b) => a.rank - b.rank);

  ranked.forEach((item) => enqueue(item.id));
}

module.exports = { findArtwork, enqueue, enqueueMissing };
