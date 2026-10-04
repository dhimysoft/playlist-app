import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { getPreview, getSongVideo } from "./api";

// global music player, one audio element shared across pages.
// Two ways to play a song:
//   preview: a 30-second clip from iTunes in an <audio> element (always available)
//   full:    the whole song through YouTube's embedded player, when the song has a video
const PlayerContext = createContext(null);

// so components can just call usePlayer()
// eslint-disable-next-line react-refresh/only-export-components
export const usePlayer = () => useContext(PlayerContext);

// load YouTube's player script once, only when someone plays a full song
let youTubeApi = null;
function loadYouTubeApi() {
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
  if (!youTubeApi) {
    youTubeApi = new Promise((resolve, reject) => {
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (previous) previous();
        resolve(window.YT);
      };
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      tag.onerror = () => {
        youTubeApi = null;
        reject(new Error("Couldn’t load YouTube"));
      };
      document.head.appendChild(tag);
    });
  }
  return youTubeApi;
}

// what to tell the user when a song can't be played in full
function videoNotice(err) {
  if (err.code === "not_configured") {
    return "Full songs need a YouTube link: use Edit on the song to add one. Playing the 30-second preview.";
  }
  if (err.code === "no_match") {
    return "No YouTube video found for this song. Use Edit to add a link. Playing the 30-second preview.";
  }
  if (err.code === "quota") {
    return "YouTube search limit reached for today. Playing the 30-second preview.";
  }
  return "Couldn’t get the full song. Playing the 30-second preview.";
}

export function PlayerProvider({ children }) {
  const audioRef = useRef(null); // audio element, ref so changing it doesn't re-render
  const requestRef = useRef(0); // which play click is the latest, so an older slow one gets dropped
  const queueRef = useRef([]); // the songs playing next/previous, in order
  const nextRef = useRef(() => {}); // always the latest next(), for the "ended" listeners

  const sourceRef = useRef("preview"); // what is playing right now: "preview" or "youtube"
  const youTubeRef = useRef(null); // the YouTube player, once it exists
  const videoHostRef = useRef(null); // the box the YouTube player is drawn in
  const waitRef = useRef(null); // someone waiting for the video to actually start
  const ytEventsRef = useRef({}); // latest handlers, so the player never calls a stale one

  const [current, setCurrent] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loadingId, setLoadingId] = useState(null);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null); // e.g. "no video, playing the preview"
  const [progress, setProgress] = useState({ time: 0, duration: 0 });
  const [videoOpen, setVideoOpen] = useState(false);

  // full-song mode is remembered between visits
  const [fullSongs, setFullSongsState] = useState(() => {
    try {
      return localStorage.getItem("fullSongs") === "1";
    } catch {
      return false;
    }
  });
  const fullSongsRef = useRef(fullSongs);
  fullSongsRef.current = fullSongs;

  // make one audio element and keep isPlaying / progress in sync with it
  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;
    const onPlay = () => {
      if (sourceRef.current === "preview") setIsPlaying(true);
    };
    const onPause = () => {
      if (sourceRef.current === "preview") setIsPlaying(false);
    };
    const onEnded = () => {
      if (sourceRef.current !== "preview") return;
      setIsPlaying(false);
      nextRef.current(); // keep going with the next song in the list
    };
    const onTime = () => {
      if (sourceRef.current !== "preview") return;
      setProgress({
        time: audio.currentTime,
        duration: Number.isFinite(audio.duration) ? audio.duration : 0,
      });
    };
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onTime);

    // YouTube has no progress event, so ask it twice a second while it plays
    const timer = setInterval(() => {
      const player = youTubeRef.current;
      if (sourceRef.current !== "youtube" || !player) return;
      if (player.getPlayerState() !== 1) return;
      setProgress({
        time: player.getCurrentTime(),
        duration: player.getDuration() || 0,
      });
    }, 500);

    return () => {
      clearInterval(timer);
      audio.pause();
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onTime);
      if (youTubeRef.current) {
        youTubeRef.current.destroy();
        youTubeRef.current = null;
      }
    };
  }, []);

  // ---- YouTube ----

  ytEventsRef.current = {
    state(event) {
      if (sourceRef.current !== "youtube") return;
      if (event.data === 1) {
        // playing
        setIsPlaying(true);
        if (waitRef.current) waitRef.current.resolve();
      } else if (event.data === 2) {
        setIsPlaying(false);
      } else if (event.data === 0) {
        setIsPlaying(false);
        nextRef.current();
      }
    },
    error() {
      // video removed, private, or its owner blocked embedding
      if (waitRef.current) waitRef.current.reject(new Error("video unavailable"));
    },
  };

  async function ensureYouTube() {
    if (youTubeRef.current) return youTubeRef.current;
    const YT = await loadYouTubeApi();
    if (youTubeRef.current) return youTubeRef.current;

    return new Promise((resolve) => {
      const mount = document.createElement("div");
      videoHostRef.current.appendChild(mount);
      const player = new YT.Player(mount, {
        width: "100%",
        height: "100%",
        playerVars: { playsinline: 1, rel: 0, origin: window.location.origin },
        events: {
          onReady: () => {
            youTubeRef.current = player;
            resolve(player);
          },
          onStateChange: (e) => ytEventsRef.current.state(e),
          onError: (e) => ytEventsRef.current.error(e),
        },
      });
    });
  }

  // start a video and wait until it really is playing (or fails)
  async function playYouTube(videoId) {
    const player = await ensureYouTube();
    if (waitRef.current) waitRef.current.reject(new Error("superseded"));

    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        waitRef.current = null;
        reject(new Error("timed out"));
      }, 12000);
      waitRef.current = {
        resolve: () => {
          clearTimeout(timer);
          waitRef.current = null;
          resolve();
        },
        reject: (err) => {
          clearTimeout(timer);
          waitRef.current = null;
          reject(err);
        },
      };
      sourceRef.current = "youtube";
      audioRef.current.pause();
      player.loadVideoById(videoId);
    });
  }

  function stopYouTube() {
    sourceRef.current = "preview";
    if (waitRef.current) waitRef.current.reject(new Error("stopped"));
    try {
      if (youTubeRef.current) youTubeRef.current.stopVideo();
    } catch {
      // the player isn't ready, nothing to stop
    }
    setVideoOpen(false);
  }

  // the video id for a song, or null (with a notice saying why)
  async function tryYouTube(song, request) {
    let videoId = song.youtubeId;

    if (videoId === undefined || videoId === null) {
      try {
        videoId = (await getSongVideo(song.id)).youtubeId;
      } catch (err) {
        if (request === requestRef.current) setNotice(videoNotice(err));
        return null;
      }
    }

    if (request !== requestRef.current) return null;
    if (!videoId) {
      setNotice(videoNotice({ code: "no_match" }));
      return null;
    }

    setVideoOpen(true);
    try {
      await playYouTube(videoId);
    } catch {
      if (request === requestRef.current) {
        setVideoOpen(false);
        setNotice("Couldn’t play that YouTube video. Playing the 30-second preview.");
      }
      return null;
    }
    return videoId;
  }

  // ---- playing ----

  // the song before/after this one in the queue (step is -1 or 1)
  function sibling(song, step) {
    const queue = queueRef.current;
    const index = queue.findIndex((s) => s.id === song.id);
    return index === -1 ? null : queue[index + step] || null;
  }

  // start a song: the full YouTube version if that mode is on and a video exists,
  // otherwise the 30-second preview. auto = we moved on by ourselves (next/prev/ended),
  // so if nothing plays, skip to the one after it instead of stopping
  async function load(song, step = 1, auto = false) {
    const request = ++requestRef.current;
    try {
      setError(null);
      setNotice(null);
      setLoadingId(song.id);

      if (fullSongsRef.current) {
        const videoId = await tryYouTube(song, request);
        if (request !== requestRef.current) return;
        if (videoId) {
          setCurrent({
            id: song.id,
            title: song.title,
            artist: song.artist,
            artworkUrl:
              song.artworkUrl || `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
            source: "youtube",
          });
          return;
        }
      }

      // preview path
      stopYouTube();
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
        source: "preview",
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
      // playing the preview but a full version is now possible (the switch was turned on
      // or a link was added): restart as the full song instead of just resuming
      const upgrade = current.source === "preview" && fullSongsRef.current && song.youtubeId;
      if (!upgrade) {
        togglePlay();
        return;
      }
    }
    queueRef.current = queue || [song];
    await load(song);
  }

  function next() {
    const target = current && sibling(current, 1);
    if (target) load(target, 1, true);
  }

  function currentTime() {
    if (sourceRef.current === "youtube" && youTubeRef.current) {
      return youTubeRef.current.getCurrentTime();
    }
    return audioRef.current ? audioRef.current.currentTime : 0;
  }

  function previous() {
    // more than a few seconds in: restart the song, like most players
    if (currentTime() > 3) {
      seek(0);
      return;
    }
    const target = current && sibling(current, -1);
    if (target) load(target, -1, true);
    else seek(0);
  }

  nextRef.current = next;

  function togglePlay() {
    if (sourceRef.current === "youtube") {
      const player = youTubeRef.current;
      if (!player) return;
      if (player.getPlayerState() === 1) player.pauseVideo();
      else player.playVideo();
      return;
    }
    const audio = audioRef.current;
    if (!audio || !audio.src) return;
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  }

  // fraction is 0..1 along the song
  function seek(fraction) {
    if (sourceRef.current === "youtube") {
      const player = youTubeRef.current;
      if (player && player.getDuration()) {
        player.seekTo(fraction * player.getDuration(), true);
      }
      return;
    }
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(audio.duration)) return;
    audio.currentTime = fraction * audio.duration;
  }

  function stop() {
    requestRef.current++; // cancel a song that is still loading
    setLoadingId(null);
    stopYouTube();
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setCurrent(null);
    setNotice(null);
    setIsPlaying(false);
    setProgress({ time: 0, duration: 0 });
  }

  // turn full songs on/off. Turning it off while a video plays stops it.
  function setFullSongs(on) {
    setFullSongsState(on);
    try {
      localStorage.setItem("fullSongs", on ? "1" : "0");
    } catch {
      // storage blocked, it just won't be remembered
    }
    if (!on && sourceRef.current === "youtube") stop();
  }

  const value = {
    current,
    isPlaying,
    loadingId,
    error,
    notice,
    progress,
    fullSongs,
    hasNext: !!(current && sibling(current, 1)),
    hasPrevious: !!(current && sibling(current, -1)),
    setFullSongs,
    playSong,
    togglePlay,
    next,
    previous,
    seek,
    stop,
  };

  return (
    <PlayerContext.Provider value={value}>
      {children}
      {/* YouTube's player has to stay visible while it plays, so it gets its own panel */}
      <div className={`yt-panel${videoOpen ? " open" : ""}`} ref={videoHostRef} />
    </PlayerContext.Provider>
  );
}
