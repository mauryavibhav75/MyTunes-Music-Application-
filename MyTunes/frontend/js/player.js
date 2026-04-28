/* ============================================================
   MYTUNE CORE PLAYER  –  Full-featured HTML5 audio player
============================================================ */

class MyTunePlayer {

  constructor() {
    this.audio        = new Audio();
    this.audio.preload = "metadata";

    // State
    this.queue        = JSON.parse(localStorage.getItem("mt_queue")) || [];
    this.currentIndex = parseInt(localStorage.getItem("mt_index")) || 0;
    this.isShuffled   = false;
    this.repeatMode   = "off"; // off | all | one
    this.likedSongs   = new Set(JSON.parse(localStorage.getItem("mt_liked")) || []);
    this.currentSong  = null;

    // Volume
    this.volume = parseFloat(localStorage.getItem("mt_volume") ?? "1");
    this.audio.volume = this.volume;

    // DOM refs – safe (elements might not exist on auth page)
    this.$play     = () => document.getElementById("playPauseBtn");
    this.$prev     = () => document.getElementById("prevBtn");
    this.$next     = () => document.getElementById("nextBtn");
    this.$shuffle  = () => document.getElementById("shuffleBtn");
    this.$repeat   = () => document.getElementById("repeatBtn");
    this.$progress = () => document.getElementById("progressBar");
    this.$volume   = () => document.getElementById("volumeSlider");
    this.$curTime  = () => document.getElementById("currentTime");
    this.$totTime  = () => document.getElementById("totalTime");
    this.$cover    = () => document.getElementById("currentCover");
    this.$title    = () => document.getElementById("currentSong");
    this.$artist   = () => document.getElementById("currentArtist");
    this.$heart    = () => document.getElementById("playerHeartBtn");
    this.$volIcon  = () => document.getElementById("volumeIcon");

    this._bindEvents();
    this._restoreState();
  }

  /* ----------------------------------------------------------
     LOAD & PLAY
  ---------------------------------------------------------- */

  /**
   * song = { id, title, artist, url, cover }
   * url can be a Deezer preview URL or /api/songs/:id/stream
   */
  playSong(song, addToQueue = true) {
    if (!song?.url) return;

    this.currentSong = song;

    // Add to queue if not already the current track
    if (addToQueue) {
      const exists = this.queue.findIndex(s => s.id === song.id);
      if (exists !== -1) {
        this.currentIndex = exists;
      } else {
        this.queue.splice(this.currentIndex + 1, 0, song);
        this.currentIndex = this.currentIndex + 1;
      }
      this._saveQueue();
    }

    this.audio.src = song.url;
    this._updateNowPlayingUI(song);
    this.audio.play().then(() => {
      this._setPlayIcon(true);
    }).catch(err => {
      console.error("Play error:", err);
      showToast("Cannot play this song", "error");
    });

    // Log play event
    if (song.id && typeof API !== "undefined") {
      API.songs.logPlay(song.id, { source: "dashboard" }).catch(() => {});
    }

    // Update queue panel
    this._renderQueue();

    // Highlight active song rows
    document.querySelectorAll(".song-row").forEach(r => {
      r.classList.toggle("playing", r.dataset.songId === String(song.id));
    });
  }

  playFromQueue(index) {
    if (!this.queue[index]) return;
    this.currentIndex = index;
    const song = this.queue[index];
    this.playSong(song, false);
  }

  setQueue(songs, startIndex = 0) {
    this.queue = [...songs];
    this.currentIndex = startIndex;
    this._saveQueue();
    this.playFromQueue(startIndex);
  }

  play()  { this.audio.play().then(() => this._setPlayIcon(true)).catch(()=>{}); }
  pause() { this.audio.pause(); this._setPlayIcon(false); }
  togglePlay() { this.audio.paused ? this.play() : this.pause(); }

  next() {
    if (this.repeatMode === "one") { this.audio.currentTime = 0; this.play(); return; }
    let idx = this.isShuffled
      ? Math.floor(Math.random() * this.queue.length)
      : this.currentIndex + 1;
    if (idx >= this.queue.length) {
      if (this.repeatMode === "all") idx = 0;
      else { this.pause(); return; }
    }
    this.currentIndex = idx;
    this.playFromQueue(idx);
  }

  previous() {
    if (this.audio.currentTime > 3) { this.audio.currentTime = 0; return; }
    this.currentIndex = Math.max(0, this.currentIndex - 1);
    this.playFromQueue(this.currentIndex);
  }

  /* ----------------------------------------------------------
     QUEUE
  ---------------------------------------------------------- */

  addToQueue(song) {
    this.queue.push(song);
    this._saveQueue();
    this._renderQueue();
    showToast(`Added "${song.title}" to queue`, "info");
  }

  _saveQueue() {
    localStorage.setItem("mt_queue", JSON.stringify(this.queue));
    localStorage.setItem("mt_index", this.currentIndex);
  }

  _renderQueue() {
    const nowEl  = document.getElementById("queueNowPlaying");
    const listEl = document.getElementById("queueList");
    if (!nowEl || !listEl) return;

    const cur = this.queue[this.currentIndex];
    if (cur) {
      nowEl.innerHTML = this._queueItemHTML(cur, this.currentIndex, true);
    }

    listEl.innerHTML = this.queue
      .slice(this.currentIndex + 1, this.currentIndex + 21)
      .map((s, i) => this._queueItemHTML(s, this.currentIndex + 1 + i, false))
      .join("") || "<p style='color:var(--text-sub);font-size:0.85rem;padding:8px 0;'>Queue is empty</p>";

    listEl.querySelectorAll(".queue-item").forEach(el => {
      el.addEventListener("click", () => this.playFromQueue(parseInt(el.dataset.idx)));
    });
  }

  _queueItemHTML(song, idx, isCurrent) {
    return `
      <div class="queue-item ${isCurrent ? "current" : ""}" data-idx="${idx}" style="cursor:pointer;">
        <img src="${song.cover || this._defaultCover()}" alt="">
        <div style="min-width:0;">
          <div class="queue-item-title">${this._esc(song.title)}</div>
          <div class="queue-item-artist">${this._esc(song.artist)}</div>
        </div>
      </div>`;
  }

  /* ----------------------------------------------------------
     SHUFFLE / REPEAT
  ---------------------------------------------------------- */

  toggleShuffle() {
    this.isShuffled = !this.isShuffled;
    const btn = this.$shuffle();
    if (btn) btn.classList.toggle("active", this.isShuffled);
    showToast(this.isShuffled ? "Shuffle on" : "Shuffle off", "info");
  }

  cycleRepeat() {
    const modes = ["off", "all", "one"];
    this.repeatMode = modes[(modes.indexOf(this.repeatMode) + 1) % modes.length];
    const btn = this.$repeat();
    if (btn) {
      btn.classList.toggle("active", this.repeatMode !== "off");
      const icon = btn.querySelector("i");
      if (icon) {
        icon.className = this.repeatMode === "one" ? "fa fa-redo" : "fa fa-redo";
        btn.title = this.repeatMode === "one" ? "Repeat: One" : this.repeatMode === "all" ? "Repeat: All" : "Repeat: Off";
      }
      if (this.repeatMode === "one") {
        btn.innerHTML = '<i class="fa fa-redo"></i><span style="font-size:0.6rem;position:absolute;top:1px;right:1px;">1</span>';
        btn.style.position = "relative";
      } else {
        btn.innerHTML = '<i class="fa fa-redo"></i>';
        btn.style.position = "";
      }
    }
    showToast(`Repeat: ${this.repeatMode}`, "info");
  }

  /* ----------------------------------------------------------
     SEEK & VOLUME
  ---------------------------------------------------------- */

  seek(val) { this.audio.currentTime = parseFloat(val); }

  setVolume(val) {
    const v = parseFloat(val) / 100;
    this.audio.volume = v;
    this.volume = v;
    localStorage.setItem("mt_volume", v);
    this._updateVolumeIcon(v);
  }

  toggleMute() {
    this.audio.muted = !this.audio.muted;
    this._updateVolumeIcon(this.audio.muted ? 0 : this.audio.volume);
  }

  _updateVolumeIcon(v) {
    const icon = this.$volIcon();
    if (!icon) return;
    if (v === 0 || this.audio.muted) icon.className = "fa fa-volume-mute";
    else if (v < 0.5) icon.className = "fa fa-volume-down";
    else icon.className = "fa fa-volume-up";
  }

  /* ----------------------------------------------------------
     LIKED SONGS
  ---------------------------------------------------------- */

  async toggleLike(songId, songObj) {
    if (!songId) return;
    const id = String(songId);
    if (this.likedSongs.has(id)) {
      this.likedSongs.delete(id);
      if (typeof API !== "undefined") API.users.unlikeSong(id).catch(() => {});
      if (typeof window.Dashboard !== "undefined") window.Dashboard.removeLikedSong?.(id);
      showToast("Removed from Liked Songs", "info");
    } else {
      this.likedSongs.add(id);
      if (typeof API !== "undefined") API.users.likeSong(id, songObj || this.currentSong).catch(() => {});
      const song = songObj || this.currentSong || null;
      if (typeof window.Dashboard !== "undefined") window.Dashboard.addLikedSong?.(song);
      showToast("Added to Liked Songs", "success");
    }
    this._saveLiked();
    this._updateHeartUI();
    if (typeof window.Dashboard !== "undefined") window.Dashboard.renderLikedSongs?.();
  }

  isLiked(songId) { return this.likedSongs.has(String(songId)); }

  _saveLiked() { localStorage.setItem("mt_liked", JSON.stringify([...this.likedSongs])); }

  _updateHeartUI() {
    const btn = this.$heart();
    if (!btn || !this.currentSong) return;
    const liked = this.isLiked(this.currentSong.id);
    btn.classList.toggle("liked", liked);
    btn.innerHTML = liked ? '<i class="fas fa-heart"></i>' : '<i class="far fa-heart"></i>';
  }

  /* ----------------------------------------------------------
     UI UPDATES
  ---------------------------------------------------------- */

  _updateNowPlayingUI(song) {
    const defaultCover = this._defaultCover();
    const cover  = this.$cover();
    const title  = this.$title();
    const artist = this.$artist();
    if (cover)  cover.src = song.cover || defaultCover;
    if (title)  title.textContent = song.title  || "Unknown";
    if (artist) artist.textContent = song.artist || "Unknown Artist";
    document.title = `${song.title} – MyTune`;
    this._updateHeartUI();
  }

  _setPlayIcon(playing) {
    const btn = this.$play();
    if (btn) btn.innerHTML = playing
      ? '<i class="fa fa-pause"></i>'
      : '<i class="fa fa-play"></i>';
  }

  _updateProgress() {
    if (!this.audio.duration || isNaN(this.audio.duration)) return;
    const bar = this.$progress();
    const cur = this.$curTime();
    const tot = this.$totTime();
    if (bar) { bar.max = this.audio.duration; bar.value = this.audio.currentTime; }
    if (cur) cur.textContent = this._fmt(this.audio.currentTime);
    if (tot) tot.textContent = this._fmt(this.audio.duration);
  }

  _fmt(s) {
    if (!s || isNaN(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec < 10 ? "0" : ""}${sec}`;
  }

  _defaultCover() {
    return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='54' height='54'%3E%3Crect width='54' height='54' fill='%23282828'/%3E%3Ctext x='27' y='36' text-anchor='middle' font-size='28' fill='%23555'%3E%E2%99%AA%3C/text%3E%3C/svg%3E";
  }

  _esc(str) {
    return String(str || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  }

  /* ----------------------------------------------------------
     EVENT BINDING
  ---------------------------------------------------------- */

  _bindEvents() {
    // Audio events
    this.audio.addEventListener("timeupdate", () => this._updateProgress());
    this.audio.addEventListener("ended",      () => this.next());
    this.audio.addEventListener("play",       () => this._setPlayIcon(true));
    this.audio.addEventListener("pause",      () => this._setPlayIcon(false));
    this.audio.addEventListener("error",      () => {
      showToast("Error loading audio", "error");
      this._setPlayIcon(false);
    });

    // Wait for DOM to be ready for buttons
    document.addEventListener("DOMContentLoaded", () => this._bindButtons());

    // Keyboard shortcuts
    document.addEventListener("keydown", e => {
      if (["INPUT","TEXTAREA"].includes(e.target.tagName)) return;
      switch (e.code) {
        case "Space":      e.preventDefault(); this.togglePlay(); break;
        case "ArrowRight": e.preventDefault(); this.audio.currentTime += 10; break;
        case "ArrowLeft":  e.preventDefault(); this.audio.currentTime -= 10; break;
        case "ArrowUp":    e.preventDefault(); this.setVolume(Math.min(100, (this.volume * 100) + 10)); break;
        case "ArrowDown":  e.preventDefault(); this.setVolume(Math.max(0,   (this.volume * 100) - 10)); break;
        case "KeyN":       this.next(); break;
        case "KeyP":       this.previous(); break;
        case "KeyM":       this.toggleMute(); break;
        case "KeyS":       this.toggleShuffle(); break;
      }
    });
  }

  _bindButtons() {
    this.$play()?.addEventListener("click",    () => this.togglePlay());
    this.$prev()?.addEventListener("click",    () => this.previous());
    this.$next()?.addEventListener("click",    () => this.next());
    this.$shuffle()?.addEventListener("click", () => this.toggleShuffle());
    this.$repeat()?.addEventListener("click",  () => this.cycleRepeat());
    this.$heart()?.addEventListener("click",   () => this.toggleLike(this.currentSong?.id));
    this.$volIcon()?.addEventListener("click", () => this.toggleMute());

    this.$progress()?.addEventListener("input", e => this.seek(e.target.value));
    this.$volume()?.addEventListener("input",   e => this.setVolume(e.target.value));

    // Set volume slider to saved value
    const volSlider = this.$volume();
    if (volSlider) { volSlider.value = Math.round(this.volume * 100); }
    this._updateVolumeIcon(this.volume);
  }

  /* ----------------------------------------------------------
     RESTORE STATE
  ---------------------------------------------------------- */

  _restoreState() {
    if (this.queue.length > 0 && this.queue[this.currentIndex]) {
      const song = this.queue[this.currentIndex];
      this.currentSong = song;
      // Just update UI, don't auto-play
      setTimeout(() => {
        this._updateNowPlayingUI(song);
        this._renderQueue();
        const pos = parseFloat(localStorage.getItem("mt_position"));
        if (!isNaN(pos)) this.audio.currentTime = pos;
      }, 100);
    }
  }

  // Call periodically to save position
  _savePosition() {
    localStorage.setItem("mt_position", this.audio.currentTime);
  }
}

/* ============================================================
   GLOBAL TOAST (available to all scripts)
============================================================ */

function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const t = document.createElement("div");
  t.className = `toast toast-${type}`;

  const icons = { success: "fa-check-circle", error: "fa-times-circle", info: "fa-info-circle", warning: "fa-exclamation-triangle" };
  t.innerHTML = `<i class="fa ${icons[type] || icons.info}"></i> ${message}`;

  container.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

/* ============================================================
   BOOT
============================================================ */

const player = new MyTunePlayer();
setInterval(() => player._savePosition(), 5000);
