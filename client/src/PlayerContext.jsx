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
export const usePlayer = () => useContext(PlayerContext);

export function PlayerProvider({ children }) {
  const audioRef = useRef(null); // audio element, ref so changing it doesn't re-render
  const requestRef = useRef(0); // which play click is the latest, so an older slow one gets dropped

  const [current, setCurrent] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loadingId, setLoadingId] = useState(null);
  const [error, setError] = useState(null);

  // make one audio element and keep isPlaying in sync with it
  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => setIsPlaying(false);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.pause();
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  // play a song, or just toggle if it's already the current one
  async function playSong(song) {
    if (current && current.id === song.id) {
      togglePlay();
      return;
    }
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
      // no preview for this one
      audioRef.current.pause();
      setError(`No preview available for “${song.title}”`);
      setCurrent(null);
      setIsPlaying(false);
    } finally {
      if (request === requestRef.current) setLoadingId(null);
    }
  }

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio || !audio.src) return;
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
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
  }

  const value = {
    current,
    isPlaying,
    loadingId,
    error,
    playSong,
    togglePlay,
    stop,
  };

  return (
    <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
  );
}
