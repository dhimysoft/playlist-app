import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  getPlaylist,
  addSong,
  addSongs,
  deleteSong,
  updatePlaylist,
  deletePlaylist,
  formatDuration,
} from "../api";
import { usePlayer } from "../PlayerContext";
import Cover from "../components/Cover";
import ImportSongsModal from "../components/ImportSongsModal";
import PlaylistCover from "../components/PlaylistCover";
import { useArtworkRefresh } from "../useArtworkRefresh";

// one playlist: its songs, add song form, edit/delete, play buttons
export default function PlaylistDetail() {
  const { id } = useParams(); // playlist id from the url
  const navigate = useNavigate();
  const { playSong, current, isPlaying, loadingId } = usePlayer();

  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [duration, setDuration] = useState("");
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [importing, setImporting] = useState(false);

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

  async function handleDeleteSong(songId) {
    try {
      await deleteSong(songId);
      setPlaylist((prev) => ({
        ...prev,
        Songs: prev.Songs.filter((s) => s.id !== songId),
      }));
    } catch (err) {
      alert(err.message);
    }
  }

  // add a whole list at once (from the import popup)
  async function handleImport(songs) {
    const created = await addSongs(id, songs);
    setPlaylist((prev) => ({ ...prev, Songs: [...prev.Songs, ...created] }));
  }

  function startEdit() {
    setEditName(playlist.name);
    setEditDesc(playlist.description || "");
    setEditing(true);
  }

  async function handleSaveEdit(e) {
    e.preventDefault();
    try {
      const updated = await updatePlaylist(id, {
        name: editName,
        description: editDesc,
      });
      setPlaylist((prev) => ({ ...prev, ...updated }));
      setEditing(false);
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleDeletePlaylist() {
    if (!confirm("Delete this playlist and all its songs?")) return;
    try {
      await deletePlaylist(id);
      navigate("/");
    } catch (err) {
      alert(err.message);
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
              {playlist.Songs.length > 0 && ` · ${formatDuration(totalSeconds)}`}
            </p>
          </div>
        </div>
      )}

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

      <h3 className="section-label">
        Songs
        {playlist.Songs.length > 0 && (
          <span className="muted total"> · {formatDuration(totalSeconds)}</span>
        )}
      </h3>

      <div className="song-list">
        {playlist.Songs.length === 0 && (
          <p className="muted">No songs yet. Add one above.</p>
        )}
        {playlist.Songs.map((song) => {
          const isCurrent = current?.id === song.id;
          const isLoading = loadingId === song.id;
          return (
            <div key={song.id} className={`song-row${isCurrent ? " playing" : ""}`}>
              <div className="song-cover">
                <Cover
                  src={song.artworkUrl}
                  label={song.title}
                  seed={song.artist}
                  className="song-art"
                />
                <button
                  className={`play-btn${isCurrent ? " active" : ""}`}
                  onClick={() => playSong(song)}
                  aria-label={isCurrent && isPlaying ? "Pause" : "Play"}
                  title="Play a 30-second preview"
                >
                  {isLoading ? "…" : isCurrent && isPlaying ? "❚❚" : "▶"}
                </button>
              </div>
              <span className="song-title">{song.title}</span>
              <span className="song-artist muted">{song.artist}</span>
              <span className="song-dur muted">{formatDuration(song.duration)}</span>
              <button
                className="pill ghost sm"
                onClick={() => handleDeleteSong(song.id)}
              >
                Delete
              </button>
            </div>
          );
        })}
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
