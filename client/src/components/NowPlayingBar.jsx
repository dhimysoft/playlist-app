import { usePlayer } from "../PlayerContext";
import { formatDuration } from "../api";

// the bar at the bottom showing what's playing
export default function NowPlayingBar() {
  const {
    current,
    isPlaying,
    togglePlay,
    next,
    previous,
    seek,
    stop,
    error,
    notice,
    progress,
    hasNext,
    hasPrevious,
  } = usePlayer();

  // nothing playing and no error, show nothing
  if (!current && !error) return null;

  const fraction = progress.duration ? progress.time / progress.duration : 0;

  return (
    <div className="now-playing">
      {current ? (
        <>
          <div className="np-top">
            {current.artworkUrl && (
              <img src={current.artworkUrl} alt="" className="np-art" />
            )}
            <div className="np-meta">
              <span className="np-title">{current.title}</span>
              <span className="np-artist">
                {current.artist}
                <span className={`np-tag${current.source === "youtube" ? " full" : ""}`}>
                  {current.source === "youtube" ? "Full song" : "Preview"}
                </span>
              </span>
            </div>
            <button
              className="np-skip"
              onClick={previous}
              disabled={!hasPrevious && progress.time <= 3}
              aria-label="Previous song"
            >
              ⏮
            </button>
            <button
              className="np-btn"
              onClick={togglePlay}
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? "❚❚" : "▶"}
            </button>
            <button
              className="np-skip"
              onClick={next}
              disabled={!hasNext}
              aria-label="Next song"
            >
              ⏭
            </button>
            <button className="np-close" onClick={stop} aria-label="Stop">
              ✕
            </button>
          </div>
          <div className="np-progress">
            <span className="np-time">{formatDuration(Math.floor(progress.time))}</span>
            <input
              type="range"
              min="0"
              max="1000"
              value={Math.round(fraction * 1000)}
              onChange={(e) => seek(Number(e.target.value) / 1000)}
              aria-label="Seek"
            />
            <span className="np-time">
              {formatDuration(Math.floor(progress.duration || 0))}
            </span>
          </div>
          {notice && <p className="np-notice">{notice}</p>}
        </>
      ) : (
        <span className="np-error">{error}</span>
      )}
    </div>
  );
}
