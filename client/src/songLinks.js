// links to hear a whole song somewhere else. They are just searches or a direct video link,
// so they need no keys and work for every song.
export function fullSongLinks({ artist, title, youtubeId }) {
  const query = encodeURIComponent(`${artist} ${title}`);

  return [
    {
      name: "YouTube",
      url: youtubeId
        ? `https://www.youtube.com/watch?v=${youtubeId}`
        : `https://www.youtube.com/results?search_query=${query}`,
    },
    { name: "Spotify", url: `https://open.spotify.com/search/${query}` },
    { name: "Apple Music", url: `https://music.apple.com/search?term=${query}` },
  ];
}
