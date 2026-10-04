import Cover from "./Cover";

// cover for a playlist: a 2x2 collage of its songs' art
// (one big image if there are fewer than 4 different covers)
export default function PlaylistCover({ playlist, className = "" }) {
  // songs from the same album share a cover, so only keep different ones
  const covers = [];
  for (const song of playlist.Songs || []) {
    if (song.artworkUrl && !covers.includes(song.artworkUrl)) {
      covers.push(song.artworkUrl);
    }
  }

  if (covers.length < 4) {
    return (
      <Cover
        src={covers[0]}
        label={playlist.name}
        seed={playlist.id}
        className={className}
      />
    );
  }

  return (
    <div className={`cover collage ${className}`}>
      {covers.slice(0, 4).map((url) => (
        <Cover key={url} src={url} label={playlist.name} seed={playlist.id} />
      ))}
    </div>
  );
}
