# 🎧 Playlist — a simplified Spotify (PERN stack)

Create playlists, add songs to them, and play a 30-second preview of each song.
Built with **PostgreSQL · Express · React (Vite) · Node · Sequelize**.

---

## 📚 Documentation in this project (read this first)

There are three docs, each with a different job:

| File | What it's for |
|------|---------------|
| **README.md** (this file) | How to run the app + a quick reference. Start here. |
| **PROJECT_GUIDE.md** | A plain-English study/presentation guide — explains every folder and how the app works, with a Q&A section for class. |
| **PROJECT_SOURCES.docx** | Maps every file to the official documentation it was built from (Sequelize, Express, React, etc.). |

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
- **PostgreSQL** running locally with a database named `playlist_db`.
  This project connects on **port 5431** (the Postgres.app "PostgreSQL 18" server):

  ```bash
  createdb -p 5431 playlist_db
  ```

  > Using the default Postgres on port 5432 instead? Change the port in
  > `server/db.js`, or set `DATABASE_URL` (see below).

---

## Run it (two terminals)

**1. API server** — http://localhost:3000

```bash
cd server
npm install
npm run seed   # creates tables + sample data (drops existing data!)
npm run dev    # nodemon, or: npm start
```

You should see: `Database connection established` and `Server running on http://localhost:3000`.

**2. React client** — open the local URL printed by Vite (usually http://localhost:5173)

```bash
cd client
npm install
npm run dev
```

Start the **API first**, then the client. The Vite dev server proxies `/api` →
`http://localhost:3000` (see `client/vite.config.js`), and the server also enables
`cors`, so either wiring works.

> Override the database with `DATABASE_URL`, or the API port with `PORT`.

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
| PATCH | `/api/playlists/:id/songs/:songId` | partially update a song |
| DELETE | `/api/playlists/:id/songs/:songId` | delete a song |
| PATCH | `/api/songs/:id` | update a song by its own id |
| DELETE | `/api/songs/:id` | delete a song by its own id |
| GET | `/api/preview?artist=&title=` | 30-second preview MP3 for a song (via iTunes) |

Status codes: `200` read/updated · `201` created · `204` deleted · `400` bad input ·
`404` not found · `500` server error.

---

## Project layout

```
server/
  db.js            one Sequelize connection (port 5431)
  models/          Playlist.js, Song.js, index.js (the association)
  routes/          playlists.js, songs.js, preview.js
  app.js           express app: cors, json, routes, error handler, sync
  seed.js          npm run seed — sample playlists & songs
client/
  vite.config.js   dev server + /api proxy
  src/
    main.jsx           router (/, /playlists/:id)
    api.js             all fetch logic + formatDuration()
    PlayerContext.jsx  the global music player
    components/        Layout.jsx, NowPlayingBar.jsx
    pages/             PlaylistList.jsx, PlaylistDetail.jsx
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
