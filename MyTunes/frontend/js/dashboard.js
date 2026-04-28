/* ============================================================
   MYTUNE DASHBOARD CONTROLLER
   Handles navigation, data loading, UI interactions
============================================================ */

const Dashboard = (() => {

  /* ============================================================
     STATE
  ============================================================ */

  let currentUser    = null;
  let allPlaylists   = [];
  let currentSongs   = [];   // songs currently visible (for context menu)
  let contextSong    = null;
  let currentPlaylistId = null;

  const MOODS = [
    { id: "happy",     label: "Happy",     emoji: "😊", cls: "happy"    },
    { id: "sad",       label: "Sad",       emoji: "😢", cls: "sad"      },
    { id: "energetic", label: "Energy",    emoji: "⚡", cls: "energy"   },
    { id: "calm",      label: "Calm",      emoji: "🌿", cls: "calm"     },
    { id: "romantic",  label: "Romantic",  emoji: "❤️", cls: "romantic" },
    { id: "angry",     label: "Angry",     emoji: "😤", cls: "angry"    },
    { id: "motivated", label: "Motivated", emoji: "💪", cls: "motivated"},
  ];

  /* ============================================================
     INIT
  ============================================================ */

  async function init() {
    // Guard – require login
    if (!API.getToken()) { window.location.href = "index.html"; return; }

    try {
      const data = await API.users.me();
      currentUser = data.user || data.data || data;
    } catch {
      window.location.href = "index.html";
      return;
    }

    _setGreeting();
    _renderUserInfo();
    _bindNav();
    _bindSearch();
    _bindPanelTabs();
    _bindModals();
    _bindContextMenu();
    _bindPlayerHeart();
    _bindQueueToggle();

    await Promise.all([
      loadTrending(),
      loadPlaylists(),
      loadLikedSongs(),
    ]);

    _renderMoods();
    navigateTo("home");
  }

  /* ============================================================
     GREETING
  ============================================================ */

  function _setGreeting() {
    const h = new Date().getHours();
    const greet = h < 12 ? "Good Morning" : h < 18 ? "Good Afternoon" : "Good Evening";
    const el = document.getElementById("greetingText");
    if (el) el.textContent = `${greet}, ${currentUser?.username || ""}`;
  }

  /* ============================================================
     USER INFO IN TOPBAR
  ============================================================ */

  function _renderUserInfo() {
    if (!currentUser) return;
    const name   = document.getElementById("userNameTop");
    const avatar = document.getElementById("userAvatarTop");
    if (name)   name.textContent   = currentUser.username || "User";
    if (avatar) avatar.textContent = (currentUser.username || "U")[0].toUpperCase();
  }

  /* ============================================================
     NAVIGATION
  ============================================================ */

  function _bindNav() {
    document.querySelectorAll(".nav-item[data-page]").forEach(item => {
      item.addEventListener("click", () => navigateTo(item.dataset.page));
    });

    document.querySelectorAll("[data-page]").forEach(el => {
      if (el.tagName === "A") {
        el.addEventListener("click", e => { e.preventDefault(); navigateTo(el.dataset.page); });
      }
    });

    document.getElementById("logoutBtn")?.addEventListener("click", () => {
      localStorage.clear();
      window.location.href = "index.html";
    });

    // Profile dropdown toggle
    document.getElementById("userMenuBtn")?.addEventListener("click", e => {
      e.stopPropagation();
      document.getElementById("profileDropdown")?.classList.toggle("open");
    });
    document.addEventListener("click", () => {
      document.getElementById("profileDropdown")?.classList.remove("open");
    });
  }

  function navigateTo(page) {
    // Hide all pages
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));

    const pageEl = document.getElementById(`page-${page}`);
    if (pageEl) pageEl.classList.add("active");

    const navItem = document.querySelector(`.nav-item[data-page="${page}"]`);
    if (navItem) navItem.classList.add("active");

    // Page-specific loaders
    if (page === "friends")       loadFriends();
    if (page === "listen-together") loadSessions();
    if (page === "library")       renderLibrary();
    if (page === "profile")       renderProfile();
    if (page === "liked")         loadLikedSongs().then(renderLikedSongs);
    if (page === "search")        document.getElementById("searchInput")?.focus();
  }

  /* ============================================================
     SEARCH
  ============================================================ */

  function _bindSearch() {
    const input = document.getElementById("searchInput");
    if (!input) return;

    let timer;
    input.addEventListener("input", e => {
      clearTimeout(timer);
      const q = e.target.value.trim();
      if (q.length < 2) {
        _showSearchEmpty(true);
        return;
      }
      timer = setTimeout(() => searchSongs(q), 400);
      navigateTo("search");
    });
  }

  async function searchSongs(q) {
    const grid  = document.getElementById("searchResultsGrid");
    const empty = document.getElementById("searchEmptyState");
    if (!grid) return;

    grid.style.display = "none";
    empty.style.display = "block";
    empty.innerHTML = '<div class="spinner"></div>';

    try {
      const data = await API.songs.search(q);
      const songs = data.songs || [];
      currentSongs = songs;

      if (songs.length === 0) {
        empty.innerHTML = `
          <i class="fa fa-search" style="font-size:2rem;display:block;margin-bottom:12px;opacity:0.4;"></i>
          <h3>No results for "${_esc(q)}"</h3>
          <p>Try different keywords</p>`;
        return;
      }

      empty.style.display = "none";
      grid.style.display  = "grid";
      grid.innerHTML = songs.map(s => _songCard(s)).join("");
      _attachCardEvents(grid);
    } catch (err) {
      empty.innerHTML = `<i class="fa fa-times-circle"></i><h3>Search failed</h3><p>${err.message}</p>`;
    }
  }

  function _showSearchEmpty(reset) {
    const empty = document.getElementById("searchEmptyState");
    const grid  = document.getElementById("searchResultsGrid");
    if (grid) grid.style.display = "none";
    if (empty) {
      empty.style.display = "block";
      if (reset) empty.innerHTML = `
        <i class="fa fa-search" style="font-size:2rem;display:block;margin-bottom:12px;opacity:0.4;"></i>
        <h3>Start typing to search</h3>
        <p>Search for songs, artists or albums</p>`;
    }
  }

  /* ============================================================
     TRENDING SONGS
  ============================================================ */

  async function loadTrending() {
    const grid = document.getElementById("trendingGrid");
    if (!grid) return;

    try {
      const data = await API.songs.trending();
      const songs = data.songs || [];
      currentSongs = songs;

      if (songs.length === 0) {
        grid.innerHTML = '<div class="empty-state"><i class="fa fa-music"></i><h3>No songs available</h3></div>';
        return;
      }

      grid.innerHTML = songs.map(s => _songCard(s)).join("");
      _attachCardEvents(grid);
    } catch (err) {
      grid.innerHTML = `<div class="empty-state"><i class="fa fa-exclamation-circle"></i><h3>Failed to load songs</h3><p>${err.message}</p></div>`;
    }
  }

  /* ============================================================
     MOODS
  ============================================================ */

  function _renderMoods() {
    const grid = document.getElementById("moodGrid");
    if (!grid) return;
    grid.innerHTML = MOODS.map(m => `
      <div class="mood-card ${m.cls}" data-mood="${m.id}">
        ${m.emoji} ${m.label}
      </div>`).join("");

    grid.querySelectorAll(".mood-card").forEach(card => {
      card.addEventListener("click", () => loadMoodSongs(card.dataset.mood));
    });
  }

  async function loadMoodSongs(mood) {
    const moodInfo = MOODS.find(m => m.id === mood);
    showToast(`Loading ${mood} songs…`, "info");
    try {
      const data = await API.moods.get(mood);
      const songs = data.data || data.songs || [];

      // Populate mood songs page
      const coverEl  = document.getElementById("moodSongsCover");
      const titleEl  = document.getElementById("moodSongsTitle");
      const metaEl   = document.getElementById("moodSongsMeta");
      const bodyEl   = document.getElementById("moodSongsBody");
      const emptyEl  = document.getElementById("moodSongsEmpty");

      if (coverEl) coverEl.textContent = moodInfo?.emoji || "🎵";
      if (titleEl) titleEl.textContent = moodInfo?.label || _capitalize(mood);
      if (metaEl)  metaEl.textContent  = `${songs.length} songs`;

      if (songs.length === 0) {
        if (bodyEl)  bodyEl.innerHTML = "";
        emptyEl?.classList.remove("hidden");
      } else {
        emptyEl?.classList.add("hidden");
        currentSongs = songs;
        if (bodyEl) {
          bodyEl.innerHTML = songs.map((s, i) => _songRow(s, i)).join("");
          _attachRowEvents(bodyEl, songs);
        }
      }

      // Wire play / shuffle buttons
      const playBtn    = document.getElementById("playMoodBtn");
      const shuffleBtn = document.getElementById("shuffleMoodBtn");
      if (playBtn) {
        playBtn.onclick = () => {
          if (songs.length === 0) return;
          player.isShuffled = false;
          player.setQueue(songs.map(_toPlayerSong), 0);
        };
      }
      if (shuffleBtn) {
        shuffleBtn.onclick = () => {
          if (songs.length === 0) return;
          player.isShuffled = true;
          player.setQueue(songs.map(_toPlayerSong), 0);
        };
      }

      navigateTo("mood-songs");
    } catch {
      showToast("Failed to load mood songs", "error");
    }
  }

  /* ============================================================
     PLAYLISTS
  ============================================================ */

  async function loadPlaylists() {
    try {
      const data = await API.playlists.mine();
      allPlaylists = data.playlists || data.data || [];
      _renderSidebarPlaylists();
      _renderPlaylistsGrid("playlistsGrid");
      _renderPlaylistsGrid("libraryPlaylistsGrid");
    } catch { /* not logged in or no playlists */ }
  }

  function _renderSidebarPlaylists() {
    const ul = document.getElementById("sidebarPlaylists");
    if (!ul) return;
    if (allPlaylists.length === 0) {
      ul.innerHTML = `<li style="color:var(--text-faint);font-size:0.82rem;padding:8px 14px;">No playlists yet</li>`;
      return;
    }
    ul.innerHTML = allPlaylists.map(p => `
      <li class="playlist-item" data-playlist-id="${p._id}">
        <img src="${p.coverImage || _defaultPlaylistCover()}" alt="">
        <div class="playlist-info">
          <div class="playlist-name">${_esc(p.name)}</div>
          <div class="playlist-meta">Playlist · ${p.songs?.length || 0} songs</div>
        </div>
      </li>`).join("");

    ul.querySelectorAll(".playlist-item").forEach(el => {
      el.addEventListener("click", () => openPlaylist(el.dataset.playlistId));
    });
  }

  function _renderPlaylistsGrid(gridId) {
    const grid = document.getElementById(gridId);
    if (!grid) return;
    if (allPlaylists.length === 0) {
      grid.innerHTML = `<div class="empty-state"><i class="fa fa-list"></i><h3>No playlists yet</h3></div>`;
      return;
    }
    grid.innerHTML = allPlaylists.map(p => `
      <div class="card" data-playlist-id="${p._id}">
        <div class="card-img-wrap">
          <img src="${p.coverImage || _defaultPlaylistCover()}" alt="">
          <button class="card-play-btn" data-playlist-id="${p._id}"><i class="fa fa-play"></i></button>
        </div>
        <div class="card-title">${_esc(p.name)}</div>
        <div class="card-sub">${p.songs?.length || 0} songs</div>
      </div>`).join("");

    grid.querySelectorAll(".card").forEach(card => {
      card.addEventListener("click", e => {
        if (!e.target.closest(".card-play-btn")) openPlaylist(card.dataset.playlistId);
      });
    });
    grid.querySelectorAll(".card-play-btn").forEach(btn => {
      btn.addEventListener("click", e => { e.stopPropagation(); playPlaylist(btn.dataset.playlistId); });
    });
  }

  async function openPlaylist(id) {
    currentPlaylistId = id;
    try {
      const data = await API.playlists.getById(id);
      const pl = data.playlist || data.data || data;
      _renderPlaylistDetail(pl);
      navigateTo("playlist-detail");
    } catch (err) {
      showToast("Failed to load playlist", "error");
    }
  }

  function _renderPlaylistDetail(pl) {
    const nameEl  = document.getElementById("playlistDetailName");
    const metaEl  = document.getElementById("playlistDetailMeta");
    const bodyEl  = document.getElementById("playlistSongsBody");
    const emptyEl = document.getElementById("playlistEmptyState");
    const coverEl = document.getElementById("playlistCoverLg");

    if (nameEl) nameEl.textContent = pl.name;
    if (metaEl) metaEl.textContent = `${pl.songs?.length || 0} songs`;
    if (coverEl) {
      if (pl.coverImage) {
        coverEl.innerHTML = `<img src="${pl.coverImage}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:var(--radius);">`;
      } else {
        coverEl.textContent = "🎵";
      }
    }

    const songs = pl.songs || [];
    if (!bodyEl) return;

    if (songs.length === 0) {
      bodyEl.innerHTML = "";
      emptyEl?.classList.remove("hidden");
      return;
    }

    emptyEl?.classList.add("hidden");
    bodyEl.innerHTML = songs.map((s, i) => _songRow(s, i)).join("");
    _attachRowEvents(bodyEl, songs);

    // Play playlist button
    document.getElementById("playPlaylistBtn")?.addEventListener("click", () => playPlaylist(pl._id));
    document.getElementById("shufflePlaylistBtn")?.addEventListener("click", () => {
      player.isShuffled = true;
      playPlaylist(pl._id);
    });
    document.getElementById("deletePlaylistBtn")?.addEventListener("click", () => deletePlaylist(pl._id));
  }

  async function playPlaylist(id) {
    try {
      const data = await API.playlists.getById(id);
      const pl = data.playlist || data.data || data;
      const songs = pl.songs || [];
      if (songs.length === 0) { showToast("Playlist is empty", "warning"); return; }
      player.setQueue(songs.map(_toPlayerSong), 0);
    } catch {
      showToast("Failed to play playlist", "error");
    }
  }

  async function deletePlaylist(id) {
    if (!confirm("Delete this playlist?")) return;
    try {
      await API.playlists.delete(id);
      showToast("Playlist deleted", "success");
      allPlaylists = allPlaylists.filter(p => p._id !== id);
      _renderSidebarPlaylists();
      _renderPlaylistsGrid("playlistsGrid");
      navigateTo("home");
    } catch {
      showToast("Failed to delete playlist", "error");
    }
  }

  /* ============================================================
     LIKED SONGS
  ============================================================ */

  let likedSongsList = [];

  async function loadLikedSongs() {
    try {
      const data = await API.users.liked();
      likedSongsList = data.liked || data.data || [];
      const ids = likedSongsList.map(s => String(s._id || s));
      player.likedSongs = new Set(ids);
      player._saveLiked();
    } catch { /* ignore */ }
  }

  function renderLikedSongs() {
    const body    = document.getElementById("likedSongsBody");
    const empty   = document.getElementById("likedEmptyState");
    const countEl = document.getElementById("likedCountText");
    if (!body) return;

    if (countEl) countEl.textContent = `${likedSongsList.length} songs`;

    if (likedSongsList.length === 0) {
      body.innerHTML = "";
      empty?.classList.remove("hidden");
      document.querySelector("#page-liked table")?.classList.add("hidden");
      return;
    }

    empty?.classList.add("hidden");
    document.querySelector("#page-liked table")?.classList.remove("hidden");
    body.innerHTML = likedSongsList.map((s, i) => _songRow(s, i)).join("");
    _attachRowEvents(body, likedSongsList);
  }

  /* ============================================================
     LIBRARY
  ============================================================ */

  function renderLibrary() {
    _renderPlaylistsGrid("libraryPlaylistsGrid");
    const recentGrid = document.getElementById("recentlyPlayedGrid");
    if (recentGrid && player.queue.length > 0) {
      const recent = [...player.queue].reverse().slice(0, 10);
      recentGrid.innerHTML = recent.map(s => _songCard(s)).join("");
      _attachCardEvents(recentGrid);
    }
  }

  /* ============================================================
     PROFILE
  ============================================================ */

  function renderProfile() {
    if (!currentUser) return;
    const avatar = document.getElementById("profileAvatarLg");
    const name   = document.getElementById("profileDisplayName");
    const plays  = document.getElementById("profilePlaysCount");
    const plCount= document.getElementById("profilePlaylistsCount");
    const frCount= document.getElementById("profileFriendsCount");

    if (avatar) avatar.textContent = (currentUser.username || "U")[0].toUpperCase();
    if (name)   name.textContent   = currentUser.username || "User";
    if (plays)  plays.textContent  = currentUser.stats?.totalPlays || 0;
    if (plCount) plCount.textContent = allPlaylists.length;
    if (frCount) frCount.textContent = currentUser.friends?.length || 0;

    // Public playlists
    const grid = document.getElementById("profilePlaylists");
    if (grid) {
      const pub = allPlaylists.filter(p => p.visibility === "public");
      grid.innerHTML = pub.length
        ? pub.map(p => `<div class="card" data-playlist-id="${p._id}">
            <div class="card-img-wrap"><img src="${p.coverImage || _defaultPlaylistCover()}" alt=""></div>
            <div class="card-title">${_esc(p.name)}</div>
            <div class="card-sub">${p.songs?.length || 0} songs</div>
          </div>`).join("")
        : '<div class="empty-state" style="padding:20px 0;"><i class="fa fa-list"></i><p>No public playlists</p></div>';

      grid.querySelectorAll(".card").forEach(c => {
        c.addEventListener("click", () => openPlaylist(c.dataset.playlistId));
      });
    }
  }

  /* ============================================================
     FRIENDS
  ============================================================ */

  async function loadFriends() {
    try {
      const [friendsData, pendingData] = await Promise.all([
        API.friends.list().catch(() => ({ friends: [] })),
        API.friends.pending().catch(() => ({ pending: [] })),
      ]);

      _renderFriendsList(friendsData.friends || []);
      _renderPendingRequests(pendingData.pending || []);
    } catch { /* ignore */ }
  }

  function _renderFriendsList(friends) {
    const el = document.getElementById("friendsList");
    if (!el) return;
    if (friends.length === 0) {
      el.innerHTML = `<div class="empty-state" style="padding:20px 0;"><i class="fa fa-user-friends"></i><h3>No friends yet</h3><p>Search for people to add</p></div>`;
      return;
    }
    el.innerHTML = friends.map(f => `
      <div class="friend-card">
        <div class="friend-card-avatar">${(f.username || "U")[0].toUpperCase()}</div>
        <div class="friend-card-info">
          <div class="friend-card-name">${_esc(f.username)}</div>
          <div class="friend-card-status">Friend</div>
        </div>
      </div>`).join("");
  }

  function _renderPendingRequests(pending) {
    const el = document.getElementById("pendingList");
    const sec = document.getElementById("pendingSection");
    if (!el) return;
    if (pending.length === 0) { if (sec) sec.style.display = "none"; return; }
    if (sec) sec.style.display = "block";
    el.innerHTML = pending.map(p => `
      <div class="friend-card" data-friendship-id="${p._id}">
        <div class="friend-card-avatar">${(p.requester?.username || "U")[0].toUpperCase()}</div>
        <div class="friend-card-info">
          <div class="friend-card-name">${_esc(p.requester?.username || "Unknown")}</div>
          <div class="friend-card-status">Wants to be friends</div>
        </div>
        <div class="friend-card-actions">
          <button class="btn-sm accept" data-id="${p._id}">Accept</button>
          <button class="btn-sm decline" data-id="${p._id}">Decline</button>
        </div>
      </div>`).join("");

    el.querySelectorAll(".btn-sm.accept").forEach(btn => {
      btn.addEventListener("click", async () => {
        try { await API.friends.accept(btn.dataset.id); showToast("Friend request accepted!", "success"); loadFriends(); }
        catch { showToast("Failed", "error"); }
      });
    });
    el.querySelectorAll(".btn-sm.decline").forEach(btn => {
      btn.addEventListener("click", async () => {
        try { await API.friends.decline(btn.dataset.id); showToast("Request declined", "info"); loadFriends(); }
        catch { showToast("Failed", "error"); }
      });
    });
  }

  // Friend search
  document.getElementById("searchFriendBtn")?.addEventListener("click", async () => {
    const q = document.getElementById("friendSearchInput")?.value.trim();
    if (!q) return;
    const res = document.getElementById("friendSearchResults");
    if (!res) return;
    res.innerHTML = '<div class="spinner"></div>';
    try {
      const data = await API.friends.search(q);
      const users = data.users || [];
      if (users.length === 0) { res.innerHTML = "<p style='color:var(--text-sub);'>No users found</p>"; return; }
      res.innerHTML = users.map(u => `
        <div class="friend-card">
          <div class="friend-card-avatar">${(u.username || "U")[0].toUpperCase()}</div>
          <div class="friend-card-info">
            <div class="friend-card-name">${_esc(u.username)}</div>
          </div>
          <div class="friend-card-actions">
            <button class="btn-sm add" data-user-id="${u._id}">+ Add</button>
          </div>
        </div>`).join("");

      res.querySelectorAll(".btn-sm.add").forEach(btn => {
        btn.addEventListener("click", async () => {
          try { await API.friends.send(btn.dataset.userId); showToast("Friend request sent!", "success"); btn.textContent = "Sent"; btn.disabled = true; }
          catch (e) { showToast(e.message, "error"); }
        });
      });
    } catch { res.innerHTML = "<p style='color:var(--text-sub);'>Search failed</p>"; }
  });

  /* ============================================================
     LISTEN TOGETHER SESSIONS
  ============================================================ */

  async function loadSessions() {
    const list = document.getElementById("activeSessionsList");
    const emptyEl = document.getElementById("noSessionsState");
    if (!list) return;
    try {
      const data = await API.sessions.active();
      const sessions = data.sessions || [];
      if (sessions.length === 0) {
        list.innerHTML = "";
        list.appendChild(emptyEl || document.createElement("div"));
        return;
      }
      list.innerHTML = sessions.map(s => `
        <div class="session-card" data-session-id="${s._id}" data-session-code="${s.sessionCode}">
          <div class="session-icon"><i class="fa fa-headphones"></i></div>
          <div class="session-info">
            <h4>${_esc(s.name)}</h4>
            <p><i class="fa fa-users"></i> ${s.members?.length || 1} listening · ${s.mode}</p>
          </div>
          <div class="session-badge">LIVE</div>
        </div>`).join("");

      list.querySelectorAll(".session-card").forEach(card => {
        card.addEventListener("click", () => {
          if (typeof Sync !== "undefined") Sync.joinSession(card.dataset.sessionCode);
        });
      });
    } catch { /* ignore */ }
  }

  /* ============================================================
     MODALS
  ============================================================ */

  function _bindModals() {
    // Create playlist
    const openCreate  = () => document.getElementById("createPlaylistModal")?.classList.remove("hidden");
    const closeCreate = () => document.getElementById("createPlaylistModal")?.classList.add("hidden");

    document.getElementById("createPlaylistSidebarBtn")?.addEventListener("click", openCreate);
    document.getElementById("createPlaylistBtn")?.addEventListener("click", openCreate);
    document.getElementById("createPlaylistLink")?.addEventListener("click", openCreate);
    document.getElementById("closeCreatePlaylist")?.addEventListener("click", closeCreate);
    document.getElementById("cancelCreatePlaylist")?.addEventListener("click", closeCreate);
    document.getElementById("confirmCreatePlaylist")?.addEventListener("click", createPlaylist);

    // Create session
    document.getElementById("createSessionBtn")?.addEventListener("click", () => {
      document.getElementById("createSessionModal")?.classList.remove("hidden");
    });
    document.getElementById("closeCreateSession")?.addEventListener("click", () => {
      document.getElementById("createSessionModal")?.classList.add("hidden");
    });
    document.getElementById("cancelCreateSession")?.addEventListener("click", () => {
      document.getElementById("createSessionModal")?.classList.add("hidden");
    });
    document.getElementById("confirmCreateSession")?.addEventListener("click", createSession);

    // Add to playlist modal close
    document.getElementById("closeAddToPlaylist")?.addEventListener("click", () => {
      document.getElementById("addToPlaylistModal")?.classList.add("hidden");
    });

    // Close modals on overlay click
    document.querySelectorAll(".modal-overlay").forEach(overlay => {
      overlay.addEventListener("click", e => {
        if (e.target === overlay) overlay.classList.add("hidden");
      });
    });
  }

  async function createPlaylist() {
    const name    = document.getElementById("newPlaylistName")?.value.trim();
    const desc    = document.getElementById("newPlaylistDesc")?.value.trim();
    const visible = document.getElementById("newPlaylistVisibility")?.value;
    if (!name) { showToast("Enter a playlist name", "warning"); return; }

    const btn = document.getElementById("confirmCreatePlaylist");
    btn.disabled = true;
    try {
      await API.playlists.create({ name, description: desc, visibility: visible });
      showToast(`Playlist "${name}" created!`, "success");
      document.getElementById("createPlaylistModal")?.classList.add("hidden");
      document.getElementById("newPlaylistName").value = "";
      document.getElementById("newPlaylistDesc").value = "";
      await loadPlaylists();
    } catch (e) {
      showToast(e.message, "error");
    } finally {
      btn.disabled = false;
    }
  }

  async function createSession() {
    const name = document.getElementById("newSessionName")?.value.trim();
    const mode = document.getElementById("newSessionMode")?.value;
    if (!name) { showToast("Enter a session name", "warning"); return; }
    try {
      const data = await API.sessions.create({ name, mode });
      const session = data.session || data.data;
      showToast(`Session "${name}" created!`, "success");
      document.getElementById("createSessionModal")?.classList.add("hidden");
      if (typeof Sync !== "undefined") Sync.joinSession(session.sessionCode);
      loadSessions();
    } catch (e) {
      showToast(e.message, "error");
    }
  }

  // Add to playlist modal
  function openAddToPlaylistModal(song) {
    const modal = document.getElementById("addToPlaylistModal");
    const list  = document.getElementById("addToPlaylistList");
    if (!modal || !list) return;

    modal.classList.remove("hidden");
    if (allPlaylists.length === 0) {
      list.innerHTML = "<p style='color:var(--text-sub);padding:16px 0;'>No playlists. Create one first.</p>";
      return;
    }
    list.innerHTML = allPlaylists.map(p => `
      <div class="playlist-item" data-playlist-id="${p._id}" style="cursor:pointer;margin-bottom:4px;">
        <img src="${p.coverImage || _defaultPlaylistCover()}" alt="">
        <div class="playlist-info">
          <div class="playlist-name">${_esc(p.name)}</div>
          <div class="playlist-meta">${p.songs?.length || 0} songs</div>
        </div>
      </div>`).join("");

    list.querySelectorAll(".playlist-item").forEach(el => {
      el.addEventListener("click", async () => {
        try {
          await API.playlists.addSong(el.dataset.playlistId, song.id || song._id);
          showToast(`Added to "${allPlaylists.find(p=>p._id===el.dataset.playlistId)?.name}"`, "success");
          modal.classList.add("hidden");
          await loadPlaylists();
        } catch (e) {
          showToast(e.message, "error");
        }
      });
    });
  }

  /* ============================================================
     CONTEXT MENU
  ============================================================ */

  function _bindContextMenu() {
    const menu = document.getElementById("contextMenu");
    if (!menu) return;

    document.addEventListener("contextmenu", e => {
      const row  = e.target.closest(".song-row, .card");
      if (!row) { menu.classList.remove("open"); return; }
      e.preventDefault();

      const id = row.dataset.songId;
      contextSong = currentSongs.find(s => String(s.id || s._id) === String(id)) || null;
      if (!contextSong) return;

      menu.style.top  = `${Math.min(e.clientY, window.innerHeight - 200)}px`;
      menu.style.left = `${Math.min(e.clientX, window.innerWidth  - 200)}px`;
      menu.classList.add("open");

      // Update like label
      const likeBtn = document.getElementById("ctxLike");
      if (likeBtn) likeBtn.innerHTML = player.isLiked(contextSong.id)
        ? '<i class="fas fa-heart"></i> Unlike'
        : '<i class="far fa-heart"></i> Like';
    });

    document.addEventListener("click", () => menu.classList.remove("open"));

    document.getElementById("ctxPlay")?.addEventListener("click", () => {
      if (contextSong) player.playSong(_toPlayerSong(contextSong));
    });
    document.getElementById("ctxLike")?.addEventListener("click", () => {
      if (contextSong) player.toggleLike(contextSong.id || contextSong._id);
    });
    document.getElementById("ctxAddToPlaylist")?.addEventListener("click", () => {
      if (contextSong) openAddToPlaylistModal(contextSong);
    });
    document.getElementById("ctxAddToQueue")?.addEventListener("click", () => {
      if (contextSong) player.addToQueue(_toPlayerSong(contextSong));
    });
    document.getElementById("ctxShare")?.addEventListener("click", () => {
      if (contextSong) {
        navigator.clipboard?.writeText(contextSong.title + " – " + contextSong.artist).then(() => {
          showToast("Copied to clipboard", "info");
        });
      }
    });
  }

  /* ============================================================
     PANEL TABS (Queue / Friends)
  ============================================================ */

  function _bindPanelTabs() {
    document.querySelectorAll(".panel-tab").forEach(tab => {
      tab.addEventListener("click", () => {
        document.querySelectorAll(".panel-tab").forEach(t => t.classList.remove("active"));
        document.querySelectorAll(".panel-section").forEach(s => s.classList.remove("active"));
        tab.classList.add("active");
        const panel = document.getElementById(`panel${_capitalize(tab.dataset.panel.replace("-",""))}`);
        panel?.classList.add("active");
      });
    });
  }

  function _bindQueueToggle() {
    const qBtn = document.getElementById("queueToggleBtn");
    const fBtn = document.getElementById("friendsPanelBtn");
    const shell = document.getElementById("appShell");
    const panel = document.getElementById("rightPanel");

    const toggle = (tab) => {
      if (!panel || !shell) return;
      const isOpen = !panel.style.display || panel.style.display === "none";
      if (isOpen) {
        panel.style.display = "flex";
        shell.classList.add("panel-open");
        // Switch to correct tab
        document.querySelectorAll(".panel-tab").forEach(t => t.classList.remove("active"));
        document.querySelectorAll(".panel-section").forEach(s => s.classList.remove("active"));
        const tabEl = document.querySelector(`.panel-tab[data-panel="${tab}"]`);
        const secId = tab === "queue" ? "panelQueue" : "panelFriendsActivity";
        tabEl?.classList.add("active");
        document.getElementById(secId)?.classList.add("active");
      } else {
        panel.style.display = "none";
        shell.classList.remove("panel-open");
      }
    };

    qBtn?.addEventListener("click", () => toggle("queue"));
    fBtn?.addEventListener("click", () => toggle("friends-activity"));
  }

  function _bindPlayerHeart() {
    // Handled by player.js – just ensure like state sync
    const btn = document.getElementById("playerHeartBtn");
    if (btn) {
      btn.addEventListener("click", () => {
        if (player.currentSong) player.toggleLike(player.currentSong.id);
      });
    }
  }

  /* ============================================================
     SONG CARD & ROW HELPERS
  ============================================================ */

  function _songCard(song) {
    const id = song.id || song._id;
    return `
      <div class="card" data-song-id="${id}">
        <div class="card-img-wrap">
          <img src="${song.cover || song.coverUrl || _defaultCover()}" alt="" loading="lazy" onerror="this.src='${_defaultCover()}'">
          <button class="card-play-btn" data-song-id="${id}"><i class="fa fa-play"></i></button>
        </div>
        <div class="card-title">${_esc(song.title)}</div>
        <div class="card-sub">${_esc(song.artist?.name || song.artist || "Unknown")}</div>
      </div>`;
  }

  function _songRow(song, index) {
    const id = song.id || song._id;
    const liked = player.isLiked(id);
    return `
      <tr class="song-row" data-song-id="${id}">
        <td class="song-num">${index + 1}</td>
        <td>
          <div class="song-info-cell">
            <img class="song-thumb" src="${song.cover || song.coverUrl || _defaultCover()}" alt="" onerror="this.src='${_defaultCover()}'">
            <div>
              <div class="song-title-cell">${_esc(song.title)}</div>
              <div class="song-artist-cell">${_esc(song.artist?.name || song.artist || "Unknown")}</div>
            </div>
          </div>
        </td>
        <td class="song-artist-cell">${_esc(song.artist?.name || song.artist || "–")}</td>
        <td class="song-duration">${_fmtDuration(song.duration)}</td>
        <td>
          <button class="like-btn ${liked ? "liked" : ""}" data-song-id="${id}">
            <i class="${liked ? "fas" : "far"} fa-heart"></i>
          </button>
        </td>
      </tr>`;
  }

  function _attachCardEvents(container) {
    container.querySelectorAll(".card-play-btn").forEach(btn => {
      btn.addEventListener("click", e => {
        e.stopPropagation();
        const id = btn.dataset.songId;
        const song = currentSongs.find(s => String(s.id || s._id) === String(id));
        if (song) {
          player.setQueue(currentSongs.map(_toPlayerSong), currentSongs.indexOf(song));
        }
      });
    });
    container.querySelectorAll(".card").forEach(card => {
      card.addEventListener("click", e => {
        if (e.target.closest(".card-play-btn")) return;
        const id = card.dataset.songId;
        if (!id) return;
        const song = currentSongs.find(s => String(s.id || s._id) === String(id));
        if (song) player.setQueue(currentSongs.map(_toPlayerSong), currentSongs.indexOf(song));
      });
    });
  }

  function _attachRowEvents(container, songs) {
    container.querySelectorAll(".song-row").forEach(row => {
      row.addEventListener("click", e => {
        if (e.target.closest(".like-btn")) return;
        const id = row.dataset.songId;
        const song = songs.find(s => String(s.id || s._id) === String(id));
        if (song) {
          currentSongs = songs;
          player.setQueue(songs.map(_toPlayerSong), songs.indexOf(song));
        }
      });
    });
    container.querySelectorAll(".like-btn").forEach(btn => {
      btn.addEventListener("click", e => {
        e.stopPropagation();
        player.toggleLike(btn.dataset.songId);
        const liked = player.isLiked(btn.dataset.songId);
        btn.classList.toggle("liked", liked);
        btn.innerHTML = `<i class="${liked ? "fas" : "far"} fa-heart"></i>`;
      });
    });
  }

  /* ============================================================
     HELPERS
  ============================================================ */

  function _toPlayerSong(s) {
    return {
      id:     s.id || s._id,
      title:  s.title,
      artist: s.artist?.name || s.artist || "Unknown",
      url:    s.preview || s.audioFileUrl || s.url || "",
      cover:  s.cover || s.coverUrl || s.album?.cover_medium || _defaultCover(),
    };
  }

  function _defaultCover() {
    return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect width='200' height='200' fill='%23282828'/%3E%3Ctext x='100' y='120' text-anchor='middle' font-size='60' fill='%23555'%3E%E2%99%AA%3C/text%3E%3C/svg%3E";
  }

  function _defaultPlaylistCover() {
    return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Crect width='200' height='200' fill='%231e3a5f'/%3E%3Ctext x='100' y='120' text-anchor='middle' font-size='60' fill='%232E75B6'%3E%F0%9F%8E5%3C/text%3E%3C/svg%3E";
  }

  function _fmtDuration(s) {
    if (!s) return "–";
    const m = Math.floor(s / 60), sec = Math.floor(s % 60);
    return `${m}:${sec < 10 ? "0" : ""}${sec}`;
  }

  function _esc(str) {
    return String(str || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  }

  function _capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /* ============================================================
     PUBLIC
  ============================================================ */

  function addLikedSong(song) {
    if (song && !likedSongsList.find(s => String(s._id || s.id) === String(song._id || song.id))) {
      likedSongsList.push(song);
    }
  }

  function removeLikedSong(songId) {
    likedSongsList = likedSongsList.filter(s => String(s._id || s.id) !== String(songId));
  }

  return { init, navigateTo, renderLikedSongs, addLikedSong, removeLikedSong, openPlaylist, openAddToPlaylistModal };

})();

/* ============================================================
   BOOT
============================================================ */

document.addEventListener("DOMContentLoaded", () => Dashboard.init());
window.Dashboard = Dashboard;
