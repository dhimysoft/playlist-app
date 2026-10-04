import { useEffect, useRef } from "react";

// cover art is filled in by the server in the background, so while some songs
// still have no result yet (artworkUrl === null) ask again every few seconds
export function useArtworkRefresh(waiting, refresh) {
  const latest = useRef(refresh);
  latest.current = refresh;

  useEffect(() => {
    if (!waiting) return;
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (tries > 120) clearInterval(timer); // give up after ~10 minutes
      else latest.current();
    }, 5000);
    return () => clearInterval(timer);
  }, [waiting]);
}
