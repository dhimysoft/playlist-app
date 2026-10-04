import { NavLink, Outlet } from "react-router-dom";
import { PlayerProvider } from "../PlayerContext";
import FullSongsToggle from "./FullSongsToggle";
import NowPlayingBar from "./NowPlayingBar";

// top bar + container that wraps every page, plus the now playing bar
export default function Layout() {
  return (
    <PlayerProvider>
      <div className="app">
        <div className="container">
          <header className="topbar">
            <NavLink to="/" className="logo">
              <span className="logo-dot" />
              <span className="logo-text">Playlist</span>
            </NavLink>
            <nav className="topnav">
              <NavLink to="/" end>
                Playlists
              </NavLink>
              <NavLink to="/library">Library</NavLink>
            </nav>
            <FullSongsToggle />
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
