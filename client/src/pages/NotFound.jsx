import { Link } from "react-router-dom";

// shown for any url that isn't a page
export default function NotFound() {
  return (
    <div className="not-found">
      <h1>Page not found</h1>
      <p className="muted">That page doesn’t exist, or the link is out of date.</p>
      <Link to="/" className="pill">
        Back to playlists
      </Link>
    </div>
  );
}
