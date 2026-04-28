/* ============================================================
   MYTUNE SYNC – Real-time Listen Together via Socket.IO
============================================================ */

const Sync = (() => {

  let socket         = null;
  let currentSession = null;
  let isHost         = false;
  let isSyncing      = false; // prevent feedback loops

  const BASE_URL = "http://localhost:5000";

  /* ============================================================
     CONNECT
  ============================================================ */

  function connect() {
    if (socket?.connected) return;

    socket = io(BASE_URL, {
      auth: { token: API.getToken() },
      transports: ["websocket"],
      reconnectionAttempts: 5,
    });

    socket.on("connect",            () => console.log("[Sync] Connected:", socket.id));
    socket.on("disconnect",         () => console.log("[Sync] Disconnected"));
    socket.on("connect_error",      err => console.warn("[Sync] Connection error:", err.message));

    // Session events
    socket.on("session:joined",     _onSessionJoined);
    socket.on("session:left",       _onSessionLeft);
    socket.on("session:members",    _onMembersUpdate);
    socket.on("session:error",      _onError);

    // Playback sync events
    socket.on("sync:play",          _onRemotePlay);
    socket.on("sync:pause",         _onRemotePause);
    socket.on("sync:seek",          _onRemoteSeek);
    socket.on("sync:song",          _onRemoteSong);

    // Chat
    socket.on("chat:message",       _onChatMessage);
  }

  /* ============================================================
     SESSION MANAGEMENT
  ============================================================ */

  async function createSession(name, mode = "public") {
    try {
      const data = await API.sessions.create({ name, mode });
      const session = data.session || data.data;
      currentSession = session;
      isHost = true;
      _joinSocketRoom(session.sessionCode);
      _showSessionPanel(session);
      showToast(`Session "${name}" created! Code: ${session.sessionCode}`, "success");
      return session;
    } catch (e) {
      showToast(e.message || "Failed to create session", "error");
    }
  }

  async function joinSession(code) {
    if (!code) return;
    code = code.toUpperCase().trim();

    // Connect socket if not already
    if (!socket?.connected) connect();

    try {
      const data = await API.sessions.join(code);
      const session = data.session || data.data;
      currentSession = session;
      isHost = false;
      _joinSocketRoom(code);
      _showSessionPanel(session);
      showToast(`Joined session "${session.name}"`, "success");
    } catch (e) {
      showToast(e.message || "Failed to join session", "error");
    }
  }

  async function leaveSession() {
    if (!currentSession) return;
    try {
      await API.sessions.leave(currentSession._id);
    } catch { /* ignore */ }

    if (socket?.connected) {
      socket.emit("session:leave", { sessionCode: currentSession.sessionCode });
    }

    currentSession = null;
    isHost = false;
    _hideSessionPanel();
    showToast("Left the session", "info");

    if (typeof Dashboard !== "undefined") Dashboard.navigateTo("listen-together");
  }

  function _joinSocketRoom(code) {
    if (!socket?.connected) connect();
    socket.emit("session:join", { sessionCode: code });
  }

  /* ============================================================
     BROADCAST PLAYBACK (host → everyone)
  ============================================================ */

  function broadcastPlay() {
    if (!isHost || !currentSession || isSyncing) return;
    socket.emit("sync:play", {
      sessionCode: currentSession.sessionCode,
      currentTime: player.audio.currentTime,
    });
  }

  function broadcastPause() {
    if (!isHost || !currentSession || isSyncing) return;
    socket.emit("sync:pause", {
      sessionCode: currentSession.sessionCode,
      currentTime: player.audio.currentTime,
    });
  }

  function broadcastSeek(time) {
    if (!isHost || !currentSession || isSyncing) return;
    socket.emit("sync:seek", {
      sessionCode: currentSession.sessionCode,
      currentTime: time,
    });
  }

  function broadcastSong(song) {
    if (!isHost || !currentSession) return;
    socket.emit("sync:song", {
      sessionCode: currentSession.sessionCode,
      song,
    });
  }

  /* ============================================================
     RECEIVE PLAYBACK (non-host ← host)
  ============================================================ */

  function _onRemotePlay(data) {
    if (isHost) return;
    isSyncing = true;
    if (Math.abs(player.audio.currentTime - data.currentTime) > 2) {
      player.audio.currentTime = data.currentTime;
    }
    player.play();
    setTimeout(() => { isSyncing = false; }, 300);
  }

  function _onRemotePause(data) {
    if (isHost) return;
    isSyncing = true;
    player.pause();
    if (data.currentTime) player.audio.currentTime = data.currentTime;
    setTimeout(() => { isSyncing = false; }, 300);
  }

  function _onRemoteSeek(data) {
    if (isHost) return;
    isSyncing = true;
    player.audio.currentTime = data.currentTime;
    setTimeout(() => { isSyncing = false; }, 300);
  }

  function _onRemoteSong(data) {
    if (isHost) return;
    if (data.song) {
      isSyncing = true;
      player.playSong(data.song, true);
      setTimeout(() => { isSyncing = false; }, 300);
    }
  }

  /* ============================================================
     SESSION SOCKET EVENTS
  ============================================================ */

  function _onSessionJoined(data) {
    console.log("[Sync] Session joined:", data);
    _updateMemberCount(data.members?.length || 0);
    _renderMembers(data.members || []);
  }

  function _onSessionLeft(data) {
    console.log("[Sync] Member left:", data);
    _updateMemberCount(data.members?.length || 0);
    _renderMembers(data.members || []);
  }

  function _onMembersUpdate(data) {
    _updateMemberCount(data.members?.length || 0);
    _renderMembers(data.members || []);
  }

  function _onError(data) {
    showToast(data.message || "Session error", "error");
  }

  /* ============================================================
     CHAT
  ============================================================ */

  function sendMessage(text) {
    if (!socket?.connected || !currentSession || !text.trim()) return;
    socket.emit("chat:send", {
      sessionCode: currentSession.sessionCode,
      text: text.trim(),
    });
  }

  function _onChatMessage(data) {
    // Append to session chat if open
    console.log("[Chat]", data.username, ":", data.text);
  }

  /* ============================================================
     UI HELPERS
  ============================================================ */

  function _showSessionPanel(session) {
    const panel  = document.getElementById("activeSessionPanel");
    const nameEl = document.getElementById("sessionName");
    const codeEl = document.getElementById("sessionCode");
    if (!panel) return;

    panel.classList.remove("hidden");
    if (nameEl) nameEl.textContent = session.name;
    if (codeEl) codeEl.textContent = session.sessionCode;

    document.getElementById("leaveSessionBtn")?.addEventListener("click", leaveSession);
  }

  function _hideSessionPanel() {
    document.getElementById("activeSessionPanel")?.classList.add("hidden");
  }

  function _updateMemberCount(count) {
    const el = document.getElementById("sessionMembersCount");
    if (el) el.textContent = count;
  }

  function _renderMembers(members) {
    const list = document.getElementById("sessionMembersList");
    if (!list) return;
    list.innerHTML = members.map(m => `
      <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);">
        <div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent2));display:flex;align-items:center;justify-content:center;font-size:0.8rem;font-weight:700;">
          ${(m.username || m.id || "?")[0].toUpperCase()}
        </div>
        <span style="font-size:0.88rem;">${m.username || m.id || "Member"}</span>
        ${m.isHost ? '<span style="color:var(--accent);font-size:0.75rem;font-weight:700;margin-left:auto;">HOST</span>' : ""}
      </div>`).join("");
  }

  /* ============================================================
     HOOK INTO PLAYER EVENTS (when in a session)
  ============================================================ */

  function _hookPlayer() {
    if (!player?.audio) return;

    player.audio.addEventListener("play",  () => { if (!isSyncing) broadcastPlay();  });
    player.audio.addEventListener("pause", () => { if (!isSyncing) broadcastPause(); });
    player.audio.addEventListener("seeked",() => { if (!isSyncing) broadcastSeek(player.audio.currentTime); });

    // Hook playSong to broadcast new song
    const origPlaySong = player.playSong.bind(player);
    player.playSong = function(song, ...args) {
      origPlaySong(song, ...args);
      if (currentSession && isHost && !isSyncing) broadcastSong(song);
    };
  }

  /* ============================================================
     PUBLIC
  ============================================================ */

  // Auto-connect if token exists
  document.addEventListener("DOMContentLoaded", () => {
    if (API.getToken()) {
      setTimeout(() => {
        connect();
        _hookPlayer();
      }, 500);
    }
  });

  return { connect, createSession, joinSession, leaveSession, sendMessage, broadcastSong };

})();

window.Sync = Sync;
