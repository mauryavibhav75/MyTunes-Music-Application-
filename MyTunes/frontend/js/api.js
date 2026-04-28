/* ============================================================
   MYTUNE API CLIENT – Centralized, token-aware API wrapper
============================================================ */

const API = (() => {

  const BASE = "http://localhost:5000/api";

  /* ---- Auth helpers ---- */
  const getToken = () => localStorage.getItem("token");

  const authHeaders = () => ({
    "Content-Type": "application/json",
    ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {})
  });

  /* ---- Core request ---- */
  async function request(method, path, body = null) {
    const opts = { method, headers: authHeaders() };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(`${BASE}${path}`, opts);

    // Token expired → redirect to login
    if (res.status === 401) {
      localStorage.clear();
      window.location.href = "index.html";
      return;
    }

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.message || `Request failed (${res.status})`);
    }

    return data;
  }

  const get  = (path)        => request("GET",    path);
  const post = (path, body)  => request("POST",   path, body);
  const put  = (path, body)  => request("PUT",    path, body);
  const del  = (path)        => request("DELETE", path);

  /* ============================================================
     AUTH
  ============================================================ */

  const auth = {
    login:    (email, password)           => post("/auth/login",    { email, password }),
    register: (username, email, password) => post("/auth/register", { username, email, password }),
    me:       ()                          => get("/auth/me"),
    logout:   ()                          => { localStorage.clear(); window.location.href = "index.html"; }
  };

  /* ============================================================
     SONGS / MUSIC
  ============================================================ */

  const songs = {
    trending:  ()          => get("/songs/trending"),
    search:    (q)         => get(`/songs/search?q=${encodeURIComponent(q)}`),
    getById:   (id)        => get(`/songs/${id}`),
    byGenre:   (genre)     => get(`/songs/genre/${genre}`),
    stream:    (id)        => `${BASE}/songs/${id}/stream`,
    logPlay:   (id, data)  => post(`/songs/${id}/play`, data),
  };

  /* ============================================================
     PLAYLISTS
  ============================================================ */

  const playlists = {
    all:       ()              => get("/playlists"),
    mine:      ()              => get("/playlists/my"),
    getById:   (id)            => get(`/playlists/${id}`),
    create:    (data)          => post("/playlists", data),
    update:    (id, data)      => put(`/playlists/${id}`, data),
    delete:    (id)            => del(`/playlists/${id}`),
    addSong:   (id, songId)    => post(`/playlists/${id}/songs`, { songIds: [songId] }),
    removeSong:(id, songId)    => del(`/playlists/${id}/songs/${songId}`),
  };

  /* ============================================================
     USERS / PROFILE
  ============================================================ */

  const users = {
    me:        ()        => get("/users/me"),
    getById:   (id)      => get(`/users/${id}`),
    update:    (data)    => put("/users/me", data),
    liked:     ()        => get("/users/me/liked"),
    likeSong:  (songId, song) => post(`/users/me/liked/${songId}`, { song }),
    unlikeSong:(songId)  => del(`/users/me/liked/${songId}`),
  };

  /* ============================================================
     FRIENDS
  ============================================================ */

  const friends = {
    list:    ()              => get("/friends"),
    pending: ()              => get("/friends/pending"),
    search:  (q)             => get(`/friends/search?q=${encodeURIComponent(q)}`),
    send:    (userId)        => post("/friends/request", { userId }),
    accept:  (friendshipId)  => put(`/friends/${friendshipId}/accept`, {}),
    decline: (friendshipId)  => del(`/friends/${friendshipId}`),
    remove:  (friendshipId)  => del(`/friends/${friendshipId}`),
  };

  /* ============================================================
     SESSIONS (Listen Together)
  ============================================================ */

  const sessions = {
    active:  ()      => get("/sessions/active"),
    create:  (data)  => post("/sessions", data),
    join:    (code)  => post("/sessions/join", { code }),
    leave:   (id)    => del(`/sessions/${id}/leave`),
    getById: (id)    => get(`/sessions/${id}`),
  };

  /* ============================================================
     MOODS
  ============================================================ */

  const moods = {
    get: (mood) => get(`/moods/${mood}`),
  };

  /* ============================================================
     PUBLIC INTERFACE
  ============================================================ */

  return { auth, songs, playlists, users, friends, sessions, moods, getToken };

})();
