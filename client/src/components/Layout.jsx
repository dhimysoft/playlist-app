import { Outlet } from "react-router-dom";
import { PlayerProvider } from "../PlayerContext";
import NowPlayingBar from "./NowPlayingBar";

// top bar + container that wraps every page, plus the now playing bar
export default function Layout() {
  return (
    <PlayerProvider>
      <div className="app">
        <div className="container">
          <header className="topbar">
            <span className="logo-dot" />
            <span className="logo-text">Playlist</span>
          </header>
          <main className="content">
            <Outlet />
          </main>
        </div>
      </div>
      <NowPlayingBar />
    </PlayerProvider>
  );
}
