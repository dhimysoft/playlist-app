import { useCallback, useEffect, useMemo, useState } from "react";
import { getPlaylists, formatTotalDuration } from "../api";
import SongRow from "../components/SongRow";
import { useArtworkRefresh } from "../useArtworkRefresh";

// every song from every playlist in one searchable list
export default function Library() {
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("title");

  const load = useCallback(async () => {
    try {
      setPlaylists(await getPlaylists());
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // each song remembers which playlist it came from
  const songs = useMemo(
    () =>
      playlists.flatMap((p) =>
        (p.Songs || []).map((s) => ({ ...s, playlist: { id: p.id, name: p.name } }))
      ),
    [playlists]
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? songs.filter(
          (s) =>
            s.title.toLowerCase().includes(q) ||
            s.artist.toLowerCase().includes(q) ||
            s.playlist.name.toLowerCase().includes(q)
        )
      : songs;

    const compare = {
      title: (a, b) => a.title.localeCompare(b.title),
      artist: (a, b) => a.artist.localeCompare(b.artist) || a.title.localeCompare(b.title),
      playlist: (a, b) => a.playlist.name.localeCompare(b.playlist.name),
      duration: (a, b) => a.duration - b.duration,
    }[sort];

    return [...filtered].sort(compare);
  }, [songs, query, sort]);

  useArtworkRefresh(songs.some((s) => s.artworkUrl === null), load);

  const totalSeconds = songs.reduce((sum, s) => sum + s.duration, 0);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Library</h1>
          {!loading && !error && (
            <p className="muted library-stats">
              {songs.length} song{songs.length === 1 ? "" : "s"} · {playlists.length}{" "}
              playlist{playlists.length === 1 ? "" : "s"}
              {songs.length > 0 && ` · ${formatTotalDuration(totalSeconds)}`}
            </p>
          )}
        </div>
      </div>

      {loading && <p className="muted">Loading your library…</p>}
      {error && <p className="error">Couldn’t load your library: {error}</p>}

      {!loading && !error && songs.length === 0 && (
        <p className="muted">Nothing here yet. Add songs to a playlist and they show up here.</p>
      )}

      {songs.length > 0 && (
        <>
          <div className="songs-tools library-tools">
            <input
              type="search"
              placeholder="Search by song, artist or playlist"
              aria-label="Search library"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              aria-label="Sort library"
            >
              <option value="title">Title A–Z</option>
              <option value="artist">Artist A–Z</option>
              <option value="playlist">Playlist</option>
              <option value="duration">Shortest first</option>
            </select>
          </div>

          <div className="song-list">
            {visible.length === 0 && <p className="muted">No songs match “{query}”.</p>}
            {visible.map((song) => (
              <SongRow
                key={song.id}
                song={song}
                queue={visible}
                playlist={song.playlist}
              />
            ))}
          </div>
        </>
      )}
    </>
  );
}
