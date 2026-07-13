# Playlist Project — Sources & Documentation

*Where every part of the code comes from (PERN stack: PostgreSQL · Express · React · Node · Sequelize)*

The goal of this workshop was to build from a picture by using official documentation as the resource. This document maps every file in the project to the exact documentation page it is based on, so each part of the build can be justified.

## 1. The Resources This Project Was Built From

These are the reference links the workshop assigned. Every implementation choice traces back to one of these (plus the standard MDN web docs and Apple's iTunes Search API for the music feature).

- **Sequelize (Getting Started) —** [https://sequelize.org/docs/v6/getting-started/](https://sequelize.org/docs/v6/getting-started/)

- **Express (Basic Routing) —** [https://expressjs.com/en/5x/starter/basic-routing/](https://expressjs.com/en/5x/starter/basic-routing/)

- **React (Reference) —** [https://react.dev/reference/react](https://react.dev/reference/react)

- **React Router (Declarative Routing) —** [https://reactrouter.com/start/declarative/routing](https://reactrouter.com/start/declarative/routing)

- **TheAudioDB (Free Music API) —** [https://www.theaudiodb.com/free_music_api](https://www.theaudiodb.com/free_music_api)

## 2. How to Read This Document

- **Column 1** — the file (which part of the project).

- **Column 2** — what that file does and the concept it uses.

- **Column 3** — the official documentation page(s) that justify the code. The links are clickable.

## 3. Backend — the server/ folder (Node + Express + Sequelize)

Runs on Node (never in the browser). It is the API and the only thing that touches the database.

### `server/db.js`

Creates ONE Sequelize connection to the local Postgres database and exports it.
Concept: new Sequelize(connection).

- **Sequelize – Connecting to a database** — <https://sequelize.org/docs/v6/getting-started/#connecting-to-a-database>

### `server/models/Playlist.js / server/models/Song.js`

Define the Playlist & Song tables: columns, data types, and validation (required fields, duration as INTEGER).
Concept: sequelize.define, DataTypes, validations.

- **Model Basics – Using sequelize.define** — <https://sequelize.org/docs/v6/core-concepts/model-basics/#using-sequelizedefine>
- **Model Basics – Data Types** — <https://sequelize.org/docs/v6/core-concepts/model-basics/#data-types>
- **Validations & Constraints** — <https://sequelize.org/docs/v6/core-concepts/validations-and-constraints/>

### `server/models/index.js`

Declares the one-to-many relationship on BOTH sides and cascade-delete.
Concept: hasMany / belongsTo, onDelete: 'CASCADE'. (Sequelize defaults ON DELETE to SET NULL, so CASCADE is set explicitly.)

- **Associations – One-To-Many relationships** — <https://sequelize.org/docs/v6/core-concepts/assocs/#one-to-many-relationships>
- **Associations – Options (onDelete)** — <https://sequelize.org/docs/v6/core-concepts/assocs/#options>

### `server/routes/playlists.js`

Contains the final playlist and playlist-scoped song endpoints: get all, get one with songs, create, PATCH update, delete, get one/all songs, add, PATCH update, and delete a song.

Concept: Express Router, req.params/req.body, validation middleware, Sequelize finders/create/update/destroy, and eager loading.

- **Express – Basic routing (app.METHOD)** — <https://expressjs.com/en/5x/starter/basic-routing/>
- **Express – Router** — <https://expressjs.com/en/5x/api.html#router>
- **Express – req.params / req.body** — <https://expressjs.com/en/5x/api.html#req.params>
- **Sequelize – Finders (findAll, findByPk)** — <https://sequelize.org/docs/v6/core-concepts/model-querying-finders/>
- **Sequelize – Eager Loading (include)** — <https://sequelize.org/docs/v6/advanced-association-concepts/eager-loading/>

### `server/routes/songs.js`

Optional legacy split-router version for direct song operations. In the final consistent design, song update/delete are handled as playlist-scoped routes in routes/playlists.js, so this router should not be mounted.

- **Sequelize – Model Instances (update/destroy)** — <https://sequelize.org/docs/v6/core-concepts/model-instances/>
- **Express – Router** — <https://expressjs.com/en/5x/api.html#router>

### `server/routes/preview.js`

Looks up a 30-second song preview so the frontend can play audio.
Concept: call the iTunes Search API server-side using Node fetch + URLSearchParams.

- **Apple – iTunes Search API (Searching)** — <https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/Searching.html>
- **Apple – Understanding Search Results (previewUrl, artworkUrl)** — <https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/UnderstandingSearchResults.html>
- **MDN – fetch()** — <https://developer.mozilla.org/en-US/docs/Web/API/Window/fetch>
- **MDN – URLSearchParams** — <https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams>
- **Workshop-suggested option: TheAudioDB (metadata only)** — <https://www.theaudiodb.com/free_music_api>

### `server/app.js`

Follows the professor’s Express pattern: create the app, add middleware, mount routes, add error handling, verify/sync the database, then call app.listen(3000).

Concept: express(), express.json(), cors, error-handling middleware, authenticate(), sync(), and app.listen().

- **Express – Hello world (app + listen)** — <https://expressjs.com/en/5x/starter/hello-world.html>
- **Express – express.json() middleware** — <https://expressjs.com/en/5x/api.html#express.json>
- **Express – Error handling** — <https://expressjs.com/en/guide/error-handling.html>
- **cors npm package** — <https://www.npmjs.com/package/cors>
- **Sequelize – Testing the connection (authenticate)** — <https://sequelize.org/docs/v6/getting-started/#testing-the-connection>
- **Sequelize – Model synchronization (sync)** — <https://sequelize.org/docs/v6/core-concepts/model-basics/#model-synchronization>

### `server/seed.js`

Fills the database with sample playlists & songs so the app isn't empty.
Concept: Model.create + sync({ force: true }) (drops & recreates tables — seed only).

- **Sequelize – Model synchronization (force)** — <https://sequelize.org/docs/v6/core-concepts/model-basics/#model-synchronization>
- **Sequelize – Creating instances** — <https://sequelize.org/docs/v6/core-concepts/model-instances/#creating-an-instance>

## 4. Frontend — the client/ folder (React + Vite)

Runs in the browser. It asks the API for data and shows the UI.

### `client/ (whole app)`

The React project + dev server.
Concept: scaffolded with Vite (npm create vite).

- **Vite – Getting Started (scaffolding)** — <https://vite.dev/guide/#scaffolding-your-first-vite-project>

### `client/vite.config.js`

Dev-server config; proxies /api to the Express server (port 3000) to avoid CORS in development.
Concept: Vite server.proxy.

- **Vite – server.proxy option** — <https://vite.dev/config/server-options.html#server-proxy>

### `client/src/main.jsx`

Mounts React into the page and defines the routes (home + /playlists/:id) inside a shared Layout.
Concept: createRoot; React Router BrowserRouter / Routes / Route / nested (layout) routes.

- **React – createRoot** — <https://react.dev/reference/react-dom/client/createRoot>
- **React Router – Routing (Routes, Route, Layout Routes)** — <https://reactrouter.com/start/declarative/routing>

### `client/src/api.js`

Every request to the backend, as a named function (getPlaylists, addSong, getPreview…).
Concept: the browser Fetch API + JSON.

- **MDN – Using the Fetch API** — <https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch>

### `client/src/pages/PlaylistList.jsx`

Home page: fetch all playlists, loading/error/success, a create form in a modal.
Concept: useState, useEffect, rendering lists with keys, controlled inputs, <Link>.

- **React – useState** — <https://react.dev/reference/react/useState>
- **React – useEffect** — <https://react.dev/reference/react/useEffect>
- **React – Rendering Lists (keys)** — <https://react.dev/learn/rendering-lists>
- **React – <input> (controlled forms)** — <https://react.dev/reference/react-dom/components/input>
- **React Router – Link (Linking)** — <https://reactrouter.com/start/declarative/routing>

### `client/src/pages/PlaylistDetail.jsx`

One playlist + its songs; add-song form; edit/delete; play buttons.
Concept: useParams, useNavigate, controlled forms + preventDefault, immutable state updates.

- **React Router – Dynamic Segments (useParams)** — <https://reactrouter.com/start/declarative/routing>
- **React – Updating Arrays in State** — <https://react.dev/learn/updating-arrays-in-state>
- **React – Updating Objects in State** — <https://react.dev/learn/updating-objects-in-state>
- **React – Responding to Events (preventDefault)** — <https://react.dev/learn/responding-to-events>

### `client/src/PlayerContext.jsx`

The global music player: one <audio> element + shared play/pause state for the whole app.
Concept: createContext, useContext, useRef, useEffect; the HTML Audio element.

- **React – createContext** — <https://react.dev/reference/react/createContext>
- **React – useContext** — <https://react.dev/reference/react/useContext>
- **React – useRef** — <https://react.dev/reference/react/useRef>
- **MDN – Audio() / HTMLAudioElement** — <https://developer.mozilla.org/en-US/docs/Web/API/HTMLAudioElement/Audio>
- **MDN – HTMLMediaElement.play()** — <https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/play>

### `client/src/components/Layout.jsx / client/src/components/NowPlayingBar.jsx`

Shared shell (top bar + now-playing bar) rendered around every page.
Concept: React Router <Outlet> for layout routes; a component consuming Context.

- **React Router – Outlet / Layout Routes** — <https://reactrouter.com/start/declarative/routing>
- **React – useContext (consuming context)** — <https://react.dev/reference/react/useContext>

## 5. The Music Feature — special note

The workshop suggested TheAudioDB, but TheAudioDB only returns metadata (artist info, album art, YouTube links) — it does not stream playable audio. To actually play sound, the project uses Apple's free iTunes Search API, which returns a 30-second preview MP3 by song name (no API key required). The Express server calls that API (server/routes/preview.js) and the browser plays the returned MP3 URL in an HTML \<audio> element (client/src/PlayerContext.jsx).

- **iTunes Search API — Searching:** [https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/Searching.html](https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/Searching.html)

- **iTunes Search API — Understanding Search Results:** [https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/UnderstandingSearchResults.html](https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/UnderstandingSearchResults.html)

- **TheAudioDB (the suggested-but-not-used option):** [https://www.theaudiodb.com/free_music_api](https://www.theaudiodb.com/free_music_api)

## 6. Master List of All References

- [https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/Searching.html](https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/Searching.html)

- [https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/UnderstandingSearchResults.html](https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/UnderstandingSearchResults.html)

- [https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch)

- [https://developer.mozilla.org/en-US/docs/Web/API/HTMLAudioElement/Audio](https://developer.mozilla.org/en-US/docs/Web/API/HTMLAudioElement/Audio)

- [https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/play](https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/play)

- [https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams](https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams)

- [https://developer.mozilla.org/en-US/docs/Web/API/Window/fetch](https://developer.mozilla.org/en-US/docs/Web/API/Window/fetch)

- [https://expressjs.com/en/5x/api.html#express.json](https://expressjs.com/en/5x/api.html#express.json)

- [https://expressjs.com/en/5x/api.html#req.params](https://expressjs.com/en/5x/api.html#req.params)

- [https://expressjs.com/en/5x/api.html#router](https://expressjs.com/en/5x/api.html#router)

- [https://expressjs.com/en/5x/starter/basic-routing/](https://expressjs.com/en/5x/starter/basic-routing/)

- [https://expressjs.com/en/5x/starter/hello-world.html](https://expressjs.com/en/5x/starter/hello-world.html)

- [https://expressjs.com/en/guide/error-handling.html](https://expressjs.com/en/guide/error-handling.html)

- [https://react.dev/learn/rendering-lists](https://react.dev/learn/rendering-lists)

- [https://react.dev/learn/responding-to-events](https://react.dev/learn/responding-to-events)

- [https://react.dev/learn/updating-arrays-in-state](https://react.dev/learn/updating-arrays-in-state)

- [https://react.dev/learn/updating-objects-in-state](https://react.dev/learn/updating-objects-in-state)

- [https://react.dev/reference/react](https://react.dev/reference/react)

- [https://react.dev/reference/react-dom/client/createRoot](https://react.dev/reference/react-dom/client/createRoot)

- [https://react.dev/reference/react-dom/components/input](https://react.dev/reference/react-dom/components/input)

- [https://react.dev/reference/react/createContext](https://react.dev/reference/react/createContext)

- [https://react.dev/reference/react/useContext](https://react.dev/reference/react/useContext)

- [https://react.dev/reference/react/useEffect](https://react.dev/reference/react/useEffect)

- [https://react.dev/reference/react/useRef](https://react.dev/reference/react/useRef)

- [https://react.dev/reference/react/useState](https://react.dev/reference/react/useState)

- [https://reactrouter.com/start/declarative/routing](https://reactrouter.com/start/declarative/routing)

- [https://sequelize.org/docs/v6/advanced-association-concepts/eager-loading/](https://sequelize.org/docs/v6/advanced-association-concepts/eager-loading/)

- [https://sequelize.org/docs/v6/core-concepts/assocs/#one-to-many-relationships](https://sequelize.org/docs/v6/core-concepts/assocs/#one-to-many-relationships)

- [https://sequelize.org/docs/v6/core-concepts/assocs/#options](https://sequelize.org/docs/v6/core-concepts/assocs/#options)

- [https://sequelize.org/docs/v6/core-concepts/model-basics/#data-types](https://sequelize.org/docs/v6/core-concepts/model-basics/#data-types)

- [https://sequelize.org/docs/v6/core-concepts/model-basics/#model-synchronization](https://sequelize.org/docs/v6/core-concepts/model-basics/#model-synchronization)

- [https://sequelize.org/docs/v6/core-concepts/model-basics/#using-sequelizedefine](https://sequelize.org/docs/v6/core-concepts/model-basics/#using-sequelizedefine)

- [https://sequelize.org/docs/v6/core-concepts/model-instances/](https://sequelize.org/docs/v6/core-concepts/model-instances/)

- [https://sequelize.org/docs/v6/core-concepts/model-instances/#creating-an-instance](https://sequelize.org/docs/v6/core-concepts/model-instances/#creating-an-instance)

- [https://sequelize.org/docs/v6/core-concepts/model-querying-finders/](https://sequelize.org/docs/v6/core-concepts/model-querying-finders/)

- [https://sequelize.org/docs/v6/core-concepts/validations-and-constraints/](https://sequelize.org/docs/v6/core-concepts/validations-and-constraints/)

- [https://sequelize.org/docs/v6/getting-started/](https://sequelize.org/docs/v6/getting-started/)

- [https://sequelize.org/docs/v6/getting-started/#connecting-to-a-database](https://sequelize.org/docs/v6/getting-started/#connecting-to-a-database)

- [https://sequelize.org/docs/v6/getting-started/#testing-the-connection](https://sequelize.org/docs/v6/getting-started/#testing-the-connection)

- [https://vite.dev/config/server-options.html#server-proxy](https://vite.dev/config/server-options.html#server-proxy)

- [https://vite.dev/guide/#scaffolding-your-first-vite-project](https://vite.dev/guide/#scaffolding-your-first-vite-project)

- [https://www.npmjs.com/package/cors](https://www.npmjs.com/package/cors)

- [https://www.theaudiodb.com/free_music_api](https://www.theaudiodb.com/free_music_api)

## 7. Final Method and Route Consistency

**Final contract:** PATCH /api/playlists/:id; PATCH /api/playlists/:id/songs/:songId; DELETE /api/playlists/:id/songs/:songId. The backend, api.js, Postman, README, and study guide must use the same methods and paths. React state updates only after a successful server response.
