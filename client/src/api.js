// All API calls in one place

const API_HOST = import.meta.env.VITE_API_URL || "http://localhost:3000";

const BASE_URL = `${API_HOST}/api`;

// Wrapper around fetch.
// Throws the server's error message if the request fails.
async function request(url, options = {}) {
  const response = await fetch(url, options);

  if (!response.ok) {
    let message = `Request failed (${response.status})`;

    try {
      const body = await response.json();

      if (body.error) {
        message = body.error;
      }
    } catch {
      // The response did not contain JSON.
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

// Playlists

export function getPlaylists() {
  return request(`${BASE_URL}/playlists`);
}

export function getPlaylist(id) {
  return request(`${BASE_URL}/playlists/${id}`);
}

export function createPlaylist(data) {
  return request(`${BASE_URL}/playlists`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
}

export function updatePlaylist(id, data) {
  return request(`${BASE_URL}/playlists/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
}

export function deletePlaylist(id) {
  return request(`${BASE_URL}/playlists/${id}`, {
    method: "DELETE",
  });
}

// Songs

export function addSong(playlistId, data) {
  return request(`${BASE_URL}/playlists/${playlistId}/songs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
}

export function deleteSong(songId) {
  return request(`${BASE_URL}/songs/${songId}`, {
    method: "DELETE",
  });
}

// Preview

export function getPreview(artist, title) {
  const query = new URLSearchParams({
    artist,
    title,
  });

  return request(`${BASE_URL}/preview?${query.toString()}`);
}

// 225 becomes "3:45"

export function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

// add a whole list of songs in one request: [{ title, artist, duration }]
export function addSongs(playlistId, songs) {
  return request(`${BASE_URL}/playlists/${playlistId}/songs/bulk`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ songs }),
  });
}

// change a song's title, artist or duration (only send the fields that changed)
export function updateSong(songId, data) {
  return request(`${BASE_URL}/songs/${songId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
}

// total time of a list: 2970 -> "49 min", 5400 -> "1 hr 30 min"
export function formatTotalDuration(seconds) {
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${totalMinutes} min`;
  return minutes === 0 ? `${hours} hr` : `${hours} hr ${minutes} min`;
}
