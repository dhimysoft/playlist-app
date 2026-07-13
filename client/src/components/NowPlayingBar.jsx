import { usePlayer } from "../PlayerContext";

// the bar at the bottom showing what's playing
export default function NowPlayingBar() {
  const { current, isPlaying, togglePlay, stop, error } = usePlayer();

  // nothing playing and no error, show nothing
  if (!current && !error) return null;

  return (
    <div className="now-playing">
      {current ? (
        <>
          {current.artworkUrl && (
            <img src={current.artworkUrl} alt="" className="np-art" />
          )}
          <div className="np-meta">
            <span className="np-title">{current.title}</span>
            <span className="np-artist">{current.artist}</span>
          </div>
          <button
            className="np-btn"
            onClick={togglePlay}
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? "❚❚" : "▶"}
          </button>
          <button className="np-close" onClick={stop} aria-label="Stop">
            ✕
          </button>
        </>
      ) : (
        <span className="np-error">{error}</span>
      )}
    </div>
  );
}
