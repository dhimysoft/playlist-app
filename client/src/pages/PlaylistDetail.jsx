import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  getPlaylist,
  addSong,
  addSongs,
  deleteSong,
  updateSong,
  updatePlaylist,
  deletePlaylist,
  formatTotalDuration,
} from "../api";
import ImportSongsModal from "../components/ImportSongsModal";
import PlaylistCover from "../components/PlaylistCover";
import SongRow from "../components/SongRow";
import { useArtworkRefresh } from "../useArtworkRefresh";

// one playlist: its songs, add song form, edit/delete, play buttons
export default function PlaylistDetail() {
  const { id } = useParams(); // playlist id from the url
  const navigate = useNavigate();

  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [duration, setDuration] = useState("");
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [importing, setImporting] = useState(false);
  const [actionError, setActionError] = useState(null); // delete/save playlist problems

  const [query, setQuery] = useState(""); // search box
  const [sort, setSort] = useState("added");

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await getPlaylist(id);
        setPlaylist(data);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  // covers get filled in by the server in the background, so keep checking
  // while any song has no result yet. Only the covers are copied over so
  // nothing else on the page (like deleted songs) gets overwritten.
  const waitingForArt = !!playlist?.Songs.some((s) => s.artworkUrl === null);

  useArtworkRefresh(waitingForArt, async () => {
    try {
      const fresh = await getPlaylist(id);
      const covers = new Map(fresh.Songs.map((s) => [s.id, s.artworkUrl]));
      setPlaylist((prev) =>
        prev && {
          ...prev,
          Songs: prev.Songs.map((s) =>
            covers.has(s.id) ? { ...s, artworkUrl: covers.get(s.id) } : s
          ),
        }
      );
    } catch {
      // try again on the next tick
    }
  });

  // what's shown: filtered by the search box, then sorted. This is also the play queue.
  const visibleSongs = useMemo(() => {
    const songs = playlist?.Songs ?? [];
    const q = query.trim().toLowerCase();
    const filtered = q
      ? songs.filter(
          (s) =>
            s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q)
        )
      : songs;

    const compare = {
      title: (a, b) => a.title.localeCompare(b.title),
      artist: (a, b) => a.artist.localeCompare(b.artist) || a.title.localeCompare(b.title),
      duration: (a, b) => a.duration - b.duration,
    }[sort];

    return compare ? [...filtered].sort(compare) : filtered;
  }, [playlist, query, sort]);

  // "3:45" or plain seconds -> seconds, or null if it's bad
  function parseDuration(input) {
    const trimmed = input.trim();
    if (/^\d+:\d{1,2}$/.test(trimmed)) {
      const [m, s] = trimmed.split(":").map(Number);
      if (s >= 60) return null;
      return m * 60 + s;
    }
    if (/^\d+$/.test(trimmed)) return Number(trimmed);
    return null;
  }

  async function handleAddSong(e) {
    e.preventDefault();
    const seconds = parseDuration(duration);
    if (!title.trim() || !artist.trim() || seconds === null || seconds < 1) {
      setFormError("Enter a title, artist, and a valid duration (e.g. 3:45).");
      return;
    }
    try {
      setSubmitting(true);
      setFormError(null);
      const song = await addSong(id, { title, artist, duration: seconds });
      // add it to the list after it saved
      setPlaylist((prev) => ({ ...prev, Songs: [...prev.Songs, song] }));
      setTitle("");
      setArtist("");
      setDuration("");
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // the row shows the error if these throw
  async function handleDeleteSong(song) {
    await deleteSong(song.id);
    setPlaylist((prev) => ({
      ...prev,
      Songs: prev.Songs.filter((s) => s.id !== song.id),
    }));
  }

  async function handleSaveSong(song, changes) {
    const updated = await updateSong(song.id, changes);
    // the server clears the cover when the title/artist changed, so it gets looked up again
    setPlaylist((prev) => ({
      ...prev,
      Songs: prev.Songs.map((s) => (s.id === song.id ? { ...s, ...updated } : s)),
    }));
  }

  // add a whole list at once (from the import popup)
  async function handleImport(songs) {
    const created = await addSongs(id, songs);
    setPlaylist((prev) => ({ ...prev, Songs: [...prev.Songs, ...created] }));
  }

  function startEdit() {
    setActionError(null);
    setEditName(playlist.name);
    setEditDesc(playlist.description || "");
    setEditing(true);
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    try {
      setActionError(null);
      const updated = await updatePlaylist(id, {
        name: editName,
        description: editDesc,
      });
      setPlaylist((prev) => ({ ...prev, ...updated }));
      setEditing(false);
    } catch (err) {
      setActionError(err.message);
    }
  }

  async function handleDeletePlaylist() {
    if (!confirm("Delete this playlist and all its songs?")) return;
    try {
      setActionError(null);
      await deletePlaylist(id);
      navigate("/");
    } catch (err) {
      setActionError(err.message);
    }
  }

  if (loading) return <p className="muted">Loading playlist…</p>;
  if (error)
    return (
      <>
        <p className="error">Couldn’t load playlist: {error}</p>
        <Link to="/" className="back-link">
          ← Back to playlists
        </Link>
      </>
    );
  if (!playlist) return null;

  // total time of all the songs
  const totalSeconds = playlist.Songs.reduce((sum, s) => sum + s.duration, 0);

  return (
    <>
      <Link to="/" className="back-link">
        ← Back to playlists
      </Link>

      {editing ? (
        <form onSubmit={handleSaveEdit} className="stack edit-form">
          <input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
          />
          <input
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
          />
          <div className="row">
            <button type="submit" className="pill">
              Save
            </button>
            <button
              type="button"
              className="pill ghost"
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="detail-header">
          <PlaylistCover playlist={playlist} className="detail-cover" />
          <div className="detail-title">
            <span className="detail-kind">Playlist</span>
            <div className="detail-title-row">
              <h1>{playlist.name}</h1>
              <div className="detail-actions">
                <button className="link-btn" onClick={startEdit}>
                  Edit
                </button>
                <button
                  className="link-btn danger"
                  onClick={handleDeletePlaylist}
                >
                  Delete
                </button>
              </div>
            </div>
            <p className="muted">{playlist.description || "No description"}</p>
            <p className="muted detail-stats">
              {playlist.Songs.length} song{playlist.Songs.length === 1 ? "" : "s"}
              {playlist.Songs.length > 0 && ` · ${formatTotalDuration(totalSeconds)}`}
            </p>
          </div>
        </div>
      )}

      {actionError && <p className="error">{actionError}</p>}

      <div className="add-head">
        <h3 className="section-label">Add a Song</h3>
        <button className="pill ghost sm" onClick={() => setImporting(true)}>
          Import a list
        </button>
      </div>
      <form onSubmit={handleAddSong} className="song-form">
        <input
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          placeholder="Artist"
          value={artist}
          onChange={(e) => setArtist(e.target.value)}
        />
        <input
          className="dur-input"
          placeholder="Duration"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
        />
        <button type="submit" className="pill" disabled={submitting}>
          {submitting ? "…" : "Add"}
        </button>
      </form>
      {formError && <p className="error">{formError}</p>}

      <div className="songs-head">
        <h3 className="section-label">
          Songs
          {playlist.Songs.length > 0 && (
            <span className="muted total"> · {formatTotalDuration(totalSeconds)}</span>
          )}
        </h3>
        {playlist.Songs.length > 1 && (
          <div className="songs-tools">
            <input
              type="search"
              placeholder="Search songs"
              aria-label="Search songs"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              aria-label="Sort songs"
            >
              <option value="added">In order added</option>
              <option value="title">Title A–Z</option>
              <option value="artist">Artist A–Z</option>
              <option value="duration">Shortest first</option>
            </select>
          </div>
        )}
      </div>

      <div className="song-list">
        {playlist.Songs.length === 0 && (
          <p className="muted">No songs yet. Add one above, or import a list.</p>
        )}
        {playlist.Songs.length > 0 && visibleSongs.length === 0 && (
          <p className="muted">No songs match “{query}”.</p>
        )}
        {visibleSongs.map((song) => (
          <SongRow
            key={song.id}
            song={song}
            queue={visibleSongs}
            onSave={handleSaveSong}
            onDelete={handleDeleteSong}
          />
        ))}
      </div>

      {importing && (
        <ImportSongsModal
          existingSongs={playlist.Songs}
          onImport={handleImport}
          onClose={() => setImporting(false)}
        />
      )}
    </>
  );
}
