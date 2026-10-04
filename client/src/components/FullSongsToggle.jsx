import { usePlayer } from "../PlayerContext";

// switch in the top bar: play whole songs through YouTube instead of 30-second previews
export default function FullSongsToggle() {
  const { fullSongs, setFullSongs } = usePlayer();

  return (
    <label
      className="full-toggle"
      title="Play full songs from YouTube when a video is available"
    >
      <input
        type="checkbox"
        role="switch"
        checked={fullSongs}
        onChange={(e) => setFullSongs(e.target.checked)}
      />
      <span className="full-toggle-track" aria-hidden="true" />
      <span className="full-toggle-label">Full songs</span>
    </label>
  );
}
