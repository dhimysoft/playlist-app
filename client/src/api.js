// all the api calls in one place
const BASE_URL = "/api";

// wrapper around fetch, throws the server's error message if the request fails
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
      // no json body
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

// playlists

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

// songs

export function addSong(playlistId, data) {
  return request(`${BASE_URL}/playlists/${playlistId}/songs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
}

// needs both the playlist id and the song id
export function deleteSong(playlistId, songId) {
  return request(
    `${BASE_URL}/playlists/${playlistId}/songs/${songId}`,
    {
      method: "DELETE",
    }
  );
}

// preview

export function getPreview(artist, title) {
  const query = new URLSearchParams({
    artist,
    title,
  });

  return request(`${BASE_URL}/preview?${query.toString()}`);
}

// 225 -> "3:45"
export function formatDuration(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}
