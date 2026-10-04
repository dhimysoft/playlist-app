import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getPlaylists, createPlaylist, addSongs, deletePlaylist } from "../api";
import ImportSongsModal from "../components/ImportSongsModal";
import PlaylistCover from "../components/PlaylistCover";
import { useArtworkRefresh } from "../useArtworkRefresh";

// home page: list of playlists + a modal to make a new one
export default function PlaylistList() {
  const navigate = useNavigate();
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showForm, setShowForm] = useState(false);
  const [importing, setImporting] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // load the playlists on page load (useEffect can't be async so inner function)
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await getPlaylists();
        setPlaylists(data);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // the covers use the first songs of each playlist, so wait on those
  const waitingForArt = playlists.some((p) =>
    (p.Songs || []).slice(0, 6).some((s) => s.artworkUrl === null)
  );

  useArtworkRefresh(waitingForArt, async () => {
    try {
      setPlaylists(await getPlaylists());
    } catch {
      // try again on the next tick
    }
  });

  async function handleCreate(e) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      setSubmitting(true);
      setFormError(null);
      const created = await createPlaylist({ name, description });
      // add it to the list after it saved
      setPlaylists((prev) => [...prev, { ...created, Songs: [] }]);
      setName("");
      setDescription("");
      setShowForm(false);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // make a playlist and add all the imported songs to it, then open it
  async function handleImport(songs, playlistName) {
    const created = await createPlaylist({ name: playlistName, description: "" });
    try {
      await addSongs(created.id, songs);
    } catch (err) {
      // don't leave an empty playlist behind if the songs didn't save
      await deletePlaylist(created.id).catch(() => {});
      throw err;
    }
    navigate(`/playlists/${created.id}`);
  }

  return (
    <>
      <div className="page-head">
        <h1>Dhimy’s Playlists</h1>
        <div className="row">
          <button className="pill ghost" onClick={() => setImporting(true)}>
            Import
          </button>
          <button className="pill" onClick={() => setShowForm(true)}>
            New Playlist
          </button>
        </div>
      </div>

      {loading && <p className="muted">Loading playlists…</p>}
      {error && <p className="error">Couldn’t load playlists: {error}</p>}
      {!loading && !error && playlists.length === 0 && (
        <p className="muted">No playlists yet. Create your first one.</p>
      )}

      <div className="card-grid">
        {playlists.map((p) => {
          const count = p.Songs?.length ?? 0;
          return (
            <Link key={p.id} to={`/playlists/${p.id}`} className="pl-card">
              <PlaylistCover playlist={p} className="pl-card-cover" />
              <span className="pl-card-name">{p.name}</span>
              <span className="pl-card-desc">
                {p.description || "No description"}
              </span>
              <span className="pl-card-count">
                {count} song{count === 1 ? "" : "s"}
              </span>
            </Link>
          );
        })}
      </div>

      {showForm && (
        <div className="modal-backdrop" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>New Playlist</h2>
            <form onSubmit={handleCreate} className="stack">
              <input
                placeholder="Playlist name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
              <input
                placeholder="Description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              {formError && <p className="error">{formError}</p>}
              <button
                type="button"
                className="link-btn import-link"
                onClick={() => {
                  setShowForm(false);
                  setImporting(true);
                }}
              >
                Or import a whole playlist from a file or list
              </button>
              <div className="modal-actions">
                <button
                  type="button"
                  className="pill ghost"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="pill"
                  disabled={submitting || !name.trim()}
                >
                  {submitting ? "Creating…" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {importing && (
        <ImportSongsModal
          withName
          onImport={handleImport}
          onClose={() => setImporting(false)}
        />
      )}
    </>
  );
}
