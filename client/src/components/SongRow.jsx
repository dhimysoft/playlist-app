import { useState } from "react";
import { Link } from "react-router-dom";
import { formatDuration } from "../api";
import { parseDuration } from "../importParser";
import { usePlayer } from "../PlayerContext";
import Cover from "./Cover";

// one song: cover with play button, title, artist, length, and edit/delete.
// queue = the list this row is in (so next/previous follow what's on screen).
// Pass onSave/onDelete to allow editing; pass playlist to show which playlist it's in.
export default function SongRow({ song, queue, playlist, onSave, onDelete }) {
  const { playSong, current, isPlaying, loadingId } = usePlayer();

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ title: "", artist: "", duration: "", youtube: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const isCurrent = current?.id === song.id;
  const isLoading = loadingId === song.id;

  function startEdit() {
    setDraft({
      title: song.title,
      artist: song.artist,
      duration: formatDuration(song.duration),
      youtube: song.youtubeId ? `https://youtu.be/${song.youtubeId}` : "",
    });
    setError(null);
    setEditing(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    const seconds = parseDuration(draft.duration);
    if (!draft.title.trim() || !draft.artist.trim() || !seconds) {
      setError("Enter a title, artist, and a valid duration (e.g. 3:45).");
      return;
    }

    // only send what changed, so an untouched song keeps its cover
    const changes = {};
    if (draft.title.trim() !== song.title) changes.title = draft.title.trim();
    if (draft.artist.trim() !== song.artist) changes.artist = draft.artist.trim();
    if (seconds !== song.duration) changes.duration = seconds;

    // the server checks the link and clears it when this is empty
    const oldLink = song.youtubeId ? `https://youtu.be/${song.youtubeId}` : "";
    if (draft.youtube.trim() !== oldLink) changes.youtubeId = draft.youtube.trim();

    if (Object.keys(changes).length === 0) {
      setEditing(false);
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await onSave(song, changes);
      setEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    try {
      setError(null);
      await onDelete(song);
    } catch (err) {
      setError(err.message);
    }
  }

  const cover = (
    <div className="song-cover">
      <Cover
        src={song.artworkUrl}
        label={song.title}
        seed={song.artist}
        className="song-art"
      />
      <button
        type="button"
        className={`play-btn${isCurrent ? " active" : ""}`}
        onClick={() => playSong(song, queue)}
        aria-label={`${isCurrent && isPlaying ? "Pause" : "Play"} ${song.title}`}
        title="Play a 30-second preview"
      >
        {isLoading ? "…" : isCurrent && isPlaying ? "❚❚" : "▶"}
      </button>
    </div>
  );

  if (editing) {
    return (
      <form
        onSubmit={handleSave}
        className={`song-row editing${isCurrent ? " playing" : ""}`}
      >
        {cover}
        <input
          value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          placeholder="Title"
          aria-label="Title"
          autoFocus
        />
        <input
          value={draft.artist}
          onChange={(e) => setDraft({ ...draft, artist: e.target.value })}
          placeholder="Artist"
          aria-label="Artist"
        />
        <input
          className="song-dur-input"
          value={draft.duration}
          onChange={(e) => setDraft({ ...draft, duration: e.target.value })}
          placeholder="m:ss"
          aria-label="Duration"
        />
        <input
          className="song-link-input"
          value={draft.youtube}
          onChange={(e) => setDraft({ ...draft, youtube: e.target.value })}
          placeholder="YouTube link for full-song playback (optional)"
          aria-label="YouTube link"
        />
        <div className="song-actions">
          <button type="submit" className="pill sm" disabled={saving}>
            {saving ? "…" : "Save"}
          </button>
          <button
            type="button"
            className="pill ghost sm"
            onClick={() => setEditing(false)}
            disabled={saving}
          >
            Cancel
          </button>
        </div>
        {error && <p className="error song-error">{error}</p>}
      </form>
    );
  }

  return (
    <div className={`song-row${isCurrent ? " playing" : ""}`}>
      {cover}
      <span className="song-title">{song.title}</span>
      <span className="song-artist muted">{song.artist}</span>
      <span className="song-dur muted">{formatDuration(song.duration)}</span>
      <div className="song-actions">
        {playlist && (
          <Link to={`/playlists/${playlist.id}`} className="song-playlist" title="Open playlist">
            {playlist.name}
          </Link>
        )}
        {onSave && (
          <button type="button" className="pill ghost sm" onClick={startEdit}>
            Edit
          </button>
        )}
        {onDelete && (
          <button type="button" className="pill ghost sm" onClick={handleDelete}>
            Delete
          </button>
        )}
      </div>
      {error && <p className="error song-error">{error}</p>}
    </div>
  );
}
