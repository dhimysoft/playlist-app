import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { getPreview } from "./api";

// global music player, one audio element shared across pages
const PlayerContext = createContext(null);

// so components can just call usePlayer()
// eslint-disable-next-line react-refresh/only-export-components
export const usePlayer = () => useContext(PlayerContext);

export function PlayerProvider({ children }) {
  const audioRef = useRef(null); // audio element, ref so changing it doesn't re-render
  const requestRef = useRef(0); // which play click is the latest, so an older slow one gets dropped
  const queueRef = useRef([]); // the songs playing next/previous, in order
  const nextRef = useRef(() => {}); // always the latest next(), for the "ended" listener

  const [current, setCurrent] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loadingId, setLoadingId] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState({ time: 0, duration: 0 });

  // make one audio element and keep isPlaying / progress in sync with it
  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      setIsPlaying(false);
      nextRef.current(); // keep going with the next song in the list
    };
    const onTime = () =>
      setProgress({
        time: audio.currentTime,
        duration: Number.isFinite(audio.duration) ? audio.duration : 0,
      });
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onTime);
    return () => {
      audio.pause();
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onTime);
    };
  }, []);

  // the song before/after this one in the queue (step is -1 or 1)
  function sibling(song, step) {
    const queue = queueRef.current;
    const index = queue.findIndex((s) => s.id === song.id);
    return index === -1 ? null : queue[index + step] || null;
  }

  // look up the preview and start it. auto = we moved on by ourselves (next/prev/ended),
  // so if a song has no preview, skip to the one after it instead of stopping
  async function load(song, step = 1, auto = false) {
    const request = ++requestRef.current;
    try {
      setError(null);
      setLoadingId(song.id);
      const info = await getPreview(song.artist, song.title);
      if (request !== requestRef.current) return; // clicked something else meanwhile
      audioRef.current.src = info.previewUrl;
      await audioRef.current.play();
      if (request !== requestRef.current) return;
      setCurrent({
        id: song.id,
        title: song.title,
        artist: song.artist,
        // prefer the cover saved for the song, the preview's one is the fallback
        artworkUrl: song.artworkUrl || info.artworkUrl,
      });
    } catch {
      if (request !== requestRef.current) return;
      const skipTo = auto ? sibling(song, step) : null;
      if (skipTo) return load(skipTo, step, true);
      // no preview for this one
      audioRef.current.pause();
      setError(`No preview available for “${song.title}”`);
      setCurrent(null);
      setIsPlaying(false);
    } finally {
      if (request === requestRef.current) setLoadingId(null);
    }
  }

  // play a song, or just toggle if it's already the current one.
  // queue = the list it came from, so next/previous and auto-advance work
  async function playSong(song, queue) {
    if (current && current.id === song.id) {
      togglePlay();
      return;
    }
    queueRef.current = queue || [song];
    await load(song);
  }

  function next() {
    const target = current && sibling(current, 1);
    if (target) load(target, 1, true);
  }

  function previous() {
    const audio = audioRef.current;
    // more than a few seconds in: restart the song, like most players
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      return;
    }
    const target = current && sibling(current, -1);
    if (target) load(target, -1, true);
    else if (audio) audio.currentTime = 0;
  }

  nextRef.current = next;

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio || !audio.src) return;
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  }

  // fraction is 0..1 along the song
  function seek(fraction) {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(audio.duration)) return;
    audio.currentTime = fraction * audio.duration;
  }

  function stop() {
    requestRef.current++; // cancel a preview that is still loading
    setLoadingId(null);
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setCurrent(null);
    setIsPlaying(false);
    setProgress({ time: 0, duration: 0 });
  }

  const value = {
    current,
    isPlaying,
    loadingId,
    error,
    progress,
    hasNext: !!(current && sibling(current, 1)),
    hasPrevious: !!(current && sibling(current, -1)),
    playSong,
    togglePlay,
    next,
    previous,
    seek,
    stop,
  };

  return (
    <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
  );
}
