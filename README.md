# 🎧 Playlist — a simplified Spotify (PERN stack)

Create playlists, add songs to them, and play a 30-second preview of each song.
Built with **PostgreSQL · Express · React (Vite) · Node · Sequelize**.

🔗 **Live demo:** https://playlist-app-zeta.vercel.app

---

## ✨ Features

- Playlists: create, rename, delete, with a cover collage built from the songs' album art
- Songs: add one at a time, **import a whole list** from Excel/CSV/pasted text, edit, delete
- **Library** page: every song across all playlists, searchable and sortable
- Search and sort inside a playlist
- 30-second previews with a now-playing bar: play/pause, next/previous, seek, and
  auto-advance to the next song
- **Full songs** (top-bar switch): plays the whole track through YouTube's embedded player

## 📚 Documentation in this project

| File | What it's for |
|------|---------------|
| **README.md** (this file) | How to run the app + a quick reference. Start here. |
| **deployment.md** | Step-by-step guide to deploying (Neon database, Render API, Vercel frontend). |
| **PROJECT_SOURCES.md** | Maps every file to the official documentation it was built from. |

---

## The data model (the heart of the project)

```
Playlist  ──< has many >──  Song
   1                          many
```

A song **belongs to exactly one** playlist. Deleting a playlist **cascades** to its
songs, so a song is never left orphaned. Duration is stored as a **number of seconds**
(e.g. `225`) and formatted as `3:45` on the frontend.

---

## Prerequisites

- **Node.js**
- **PostgreSQL** running locally with a database, e.g. `createdb playlist_db`

---

## Run it (two terminals)

**1. API server** — http://localhost:3000

```bash
cd server
npm install
cp .env.example .env   # then set DATABASE_URL to your database
npm run seed           # optional: creates tables + sample data (drops existing data!)
npm run dev            # nodemon, or: npm start
```

You should see: `Database connection established` and `Playlist API running on port 3000`.
The server needs `DATABASE_URL` and stops with a clear error if it's missing. `PORT` is optional.

**2. React client** — open the local URL printed by Vite (usually http://localhost:5173)

```bash
cd client
npm install
npm run dev
```

Start the **API first**, then the client. The client calls `http://localhost:3000` by default;
set `VITE_API_URL` to point it at a deployed API. Allowed browser origins are listed in
`server/app.js` (add yours with the `FRONTEND_URL` variable).

---

## API

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/playlists` | all playlists (with songs) |
| GET | `/api/playlists/:id` | one playlist, songs included |
| POST | `/api/playlists` | create a playlist |
| PATCH | `/api/playlists/:id` | partially update a playlist |
| DELETE | `/api/playlists/:id` | delete a playlist (cascades to songs) |
| GET | `/api/playlists/:id/songs` | songs in one playlist |
| GET | `/api/playlists/:id/songs/:songId` | one song in one playlist |
| POST | `/api/playlists/:id/songs` | add a song to a playlist |
| POST | `/api/playlists/:id/songs/bulk` | add many songs at once (`{ songs: [...] }`, all or nothing, max 500) |
| PATCH | `/api/playlists/:id/songs/:songId` | partially update a song |
| DELETE | `/api/playlists/:id/songs/:songId` | delete a song |
| PATCH | `/api/songs/:id` | update a song by its own id |
| DELETE | `/api/songs/:id` | delete a song by its own id |
| GET | `/api/preview?artist=&title=` | 30-second preview MP3 for a song (via iTunes) |
| GET | `/api/songs/:id/video` | YouTube video id for a song (searched once, then saved) |

Status codes: `200` read/updated · `201` created · `204` deleted · `400` bad input ·
`404` not found · `500` server error.

---

## Project layout

```
server/
  db.js            one Sequelize connection (from DATABASE_URL)
  models/          Playlist.js, Song.js, index.js (the association)
  routes/          playlists.js, songs.js, preview.js
  lib/artwork.js   looks up cover art (iTunes) in a slow background queue
  app.js           express app: cors, json, routes, error handler, sync
  seed.js          npm run seed — sample playlists & songs
client/
  vite.config.js   dev server + /api proxy
  vercel.json      sends every url to index.html so refreshing /library works on Vercel
  src/
    main.jsx           router (/, /playlists/:id, /library, 404)
    api.js             all fetch logic + formatDuration()
    PlayerContext.jsx  the global music player
    components/        Layout.jsx, NowPlayingBar.jsx, SongRow.jsx, Cover.jsx,
                       PlaylistCover.jsx, ImportSongsModal.jsx
    importParser.js    turns spreadsheet rows / pasted text into songs
    pages/             PlaylistList.jsx, PlaylistDetail.jsx, Library.jsx, NotFound.jsx
    index.css          dark Spotify-ish theme
```

---

## The request flow (the pattern every feature follows)

```text
user action → named frontend function → fetch request → Express route
→ Sequelize → PostgreSQL → JSON response → React state update → re-render
```

The methods and paths in the backend, in `client/src/api.js`, in Postman, and in this
README should always match.

---

## The music feature

TheAudioDB only returns metadata, so playback uses Apple's free **iTunes Search API**,
which returns a real 30-second preview MP3 by song name. The Express server looks it up
(`server/routes/preview.js`) and the browser plays it in an `<audio>` element
(`client/src/PlayerContext.jsx`). Previews are 30 seconds and need an internet connection.

---

## Cover art

Every song row, playlist card and playlist header shows cover art. The URL is stored on
the song (`Song.artworkUrl`): `null` = not looked up yet, `""` = iTunes had no match.
When the server starts it looks up every missing cover in the background (one request
every ~3 seconds, because iTunes limits searches to about 20 a minute), and new or
renamed songs are queued right away. The pages re-check every few seconds while covers
are still missing, so they appear without a reload. A song with no cover shows a colored
placeholder with its first letter. The server uses `sequelize.sync({ alter: true })` so
the new column is added to an existing database automatically.

---

## Importing a whole list

On a playlist page, **Import a list** opens a popup where you can:

- **upload or drop** an `.xlsx` or `.csv` file (columns `Title`, `Artist`, `Duration`; a `Track #`
  column and the header row are detected automatically), or
- **paste** text: tab-separated rows copied from a table or sheet, `Title, Artist, 3:45` lines,
  or just `Song name - Artist`.

A preview shows every row so you can fix titles, artists and durations before adding. Rows
already in the playlist are unticked as duplicates, and rows with no duration can be filled in
automatically from iTunes (**Fill missing durations**, about 3 seconds per song). Everything
ticked is added in one request. Spreadsheets are read in the browser (`read-excel-file`), so
the server only ever receives plain JSON.

**Import as a new playlist:** on the home page, the **Import** button (or the link inside
**New Playlist**) does the same thing but creates the playlist for you. The name is taken from
the file (`Midnight_Vibes_Playlist.xlsx` becomes "Midnight Vibes") and can be changed before
you create it. If adding the songs fails, the empty playlist is removed again.

---

## Full songs (YouTube)

Flip the **Full songs** switch in the top bar and songs play in full through YouTube's embedded
player (a small video panel appears above the player bar). Music licensing makes this the only
free way to stream whole tracks. If a song has no video, or the video can't be embedded, the
app tells you why and plays the 30-second preview instead.

Whenever only the preview is playing, the player bar also shows **Hear the full song** links
(YouTube, Spotify, Apple Music). They are plain searches (or the saved YouTube video), so they
need no keys.

There are two ways a song gets its video:

1. **Paste a link (no setup).** Click **Edit** on a song and paste any YouTube link
   (`youtube.com/watch?v=…`, `youtu.be/…`, `music.youtube.com/…`) into *YouTube link*.
2. **Automatic search (needs a free API key).** The server searches YouTube for
   `artist + title` the first time you play a song in full mode, then saves the video on the song
   so it is never searched twice.

   1. Go to the [Google Cloud console](https://console.cloud.google.com/), create a project, and
      enable **YouTube Data API v3**.
   2. Create an **API key** (Credentials → Create credentials → API key). Restrict it to the
      YouTube Data API.
   3. Put it in `server/.env` as `YOUTUBE_API_KEY=…` (on Render: Environment → add the variable).

   The free quota is 10,000 units a day and one search costs 100, so about 100 new songs a day.
   Saved results don't count again. Editing a song's title or artist clears its saved video so it
   is searched again; to keep a hand-picked link, change the link in the same save.
