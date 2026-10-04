// finding the YouTube video for a song, so the app can play the full track
// through YouTube's own embedded player (the only legal way to stream full songs for free)

// accepts a full link (watch, youtu.be, music.youtube.com, shorts, embed) or a bare
// 11 character video id. Returns the id, or null if it isn't a YouTube video.
function extractVideoId(input) {
  const text = String(input || "").trim();
  if (/^[\w-]{11}$/.test(text)) return text;

  try {
    const url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
    const host = url.hostname.replace(/^(www|m|music)\./, "");
    let id = null;

    if (host === "youtu.be") {
      id = url.pathname.slice(1).split("/")[0];
    } else if (host === "youtube.com") {
      if (url.pathname === "/watch") {
        id = url.searchParams.get("v");
      } else {
        const match = url.pathname.match(/^\/(embed|shorts|live|v)\/([\w-]{11})/);
        if (match) id = match[2];
      }
    }

    return id && /^[\w-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

function lookupError(message, code) {
  const err = new Error(message);
  err.code = code;
  return err;
}

// search YouTube for a song. Costs 100 of the 10,000 free daily quota units,
// which is why the result gets saved on the song and only looked up once.
// returns a video id, "" if nothing embeddable was found, or throws with err.code:
// not_configured (no key), quota (daily limit hit), failed (anything else)
async function findVideo(artist, title) {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) throw lookupError("YOUTUBE_API_KEY is not set", "not_configured");

  const url =
    "https://www.googleapis.com/youtube/v3/search?" +
    new URLSearchParams({
      part: "snippet",
      type: "video",
      videoEmbeddable: "true",
      videoSyndicated: "true",
      videoCategoryId: "10", // Music
      maxResults: "1",
      q: `${artist} ${title} official audio`,
      key,
    });

  const response = await fetch(url);

  if (!response.ok) {
    let reason = "";
    try {
      const body = await response.json();
      reason = body.error?.errors?.[0]?.reason || "";
    } catch {
      // not json
    }

    if (reason === "quotaExceeded" || reason === "rateLimitExceeded") {
      throw lookupError("YouTube search limit reached for today", "quota");
    }
    throw lookupError(`YouTube search failed (${response.status})`, "failed");
  }

  const data = await response.json();
  return data.items?.[0]?.id?.videoId || "";
}

module.exports = { extractVideoId, findVideo };
