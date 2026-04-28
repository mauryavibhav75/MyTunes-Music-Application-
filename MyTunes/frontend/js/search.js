/* ==========================================
   MYTUNE SEARCH & BROWSE SYSTEM
========================================== */

class MyTuneSearch {
    constructor() {
        this.searchInput = document.getElementById("searchInput");
        this.mainContent = document.getElementById("mainContent");

        this.currentPage = 1;
        this.limit = 12;
        this.currentView = "grid"; // grid | list
        this.currentSort = "name";

        this.debounceTimer = null;

        this.init();
    }

    /* ========================================
       INITIALIZE
    ======================================== */

    init() {
        this.attachSearchListener();
        this.loadSongs();
    }

    /* ========================================
       SEARCH FUNCTIONALITY
    ======================================== */

    attachSearchListener() {
        if (!this.searchInput) return;

        this.searchInput.addEventListener("input", (e) => {
            const query = e.target.value.trim();

            clearTimeout(this.debounceTimer);

            this.debounceTimer = setTimeout(() => {
                if (query.length === 0) {
                    this.loadSongs();
                } else {
                    this.performSearch(query);
                }
            }, 300);
        });
    }

    async performSearch(query) {
        this.showLoading();

        try {
            const res = await fetch(`/api/songs/search?q=${encodeURIComponent(query)}`);
            if (!res.ok) throw new Error("Search failed");

            const data = await res.json();

            this.renderSearchResults(data);

        } catch (error) {
            this.showError(error.message);
        }
    }

    renderSearchResults(data) {
        this.mainContent.innerHTML = "";

        const sections = [
            { title: "Songs", items: data.songs, type: "song" },
            { title: "Artists", items: data.artists, type: "artist" },
            { title: "Playlists", items: data.playlists, type: "playlist" },
            { title: "Users", items: data.users, type: "user" }
        ];

        sections.forEach(section => {
            if (!section.items || section.items.length === 0) return;

            const container = document.createElement("div");
            container.innerHTML = `
                <div class="section-header">
                    <h2>${section.title}</h2>
                </div>
                <div class="song-grid"></div>
            `;

            const grid = container.querySelector(".song-grid");

            section.items.forEach(item => {
                if (section.type === "song") {
                    grid.appendChild(this.createSongCard(item));
                } else {
                    grid.appendChild(this.createGenericCard(item, section.type));
                }
            });

            this.mainContent.appendChild(container);
        });

        if (!this.mainContent.innerHTML) {
            this.showEmpty("No results found.");
        }
    }

    /* ========================================
       BROWSE SONGS
    ======================================== */

    async loadSongs(reset = true) {
        if (reset) {
            this.currentPage = 1;
            this.mainContent.innerHTML = "";
        }

        this.showLoading();

        try {
            const res = await fetch(
                `/api/songs?page=${this.currentPage}&limit=${this.limit}&sort=${this.currentSort}`
            );

            if (!res.ok) throw new Error("Failed to load songs");

            const data = await res.json();

            this.renderSongList(data.songs, reset);

        } catch (error) {
            this.showError(error.message);
        }
    }

    renderSongList(songs, reset) {
        if (reset) {
            this.mainContent.innerHTML = `
                <div class="section-header">
                    <h2>Browse Songs</h2>
                    ${this.createControls()}
                </div>
                <div class="song-grid" id="browseGrid"></div>
            `;
        }

        const grid = document.getElementById("browseGrid");

        songs.forEach(song => {
            grid.appendChild(this.createSongCard(song));
        });

        this.setupInfiniteScroll();
    }

    /* ========================================
       PLAYLISTS
    ======================================== */

    async loadPlaylists() {
        this.showLoading();

        try {
            const res = await fetch("/api/playlists");
            if (!res.ok) throw new Error("Failed to load playlists");

            const data = await res.json();

            this.mainContent.innerHTML = `
                <div class="section-header">
                    <h2>Playlists</h2>
                </div>
                <div class="playlist-grid"></div>
            `;

            const grid = this.mainContent.querySelector(".playlist-grid");

            data.playlists.forEach(pl => {
                grid.appendChild(this.createPlaylistCard(pl));
            });

        } catch (error) {
            this.showError(error.message);
        }
    }

    /* ========================================
       CARD CREATION
    ======================================== */

    createSongCard(song) {
        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
            <img src="${song.cover || 'assets/images/default-cover.png'}">
            <h4>${song.title}</h4>
            <p>${song.artist}</p>
        `;

        card.addEventListener("click", () => {
            if (window.myTunePlayer) {
                window.myTunePlayer.addToQueue(song);
                window.myTunePlayer.loadSong(
                    window.myTunePlayer.queue.length - 1
                );
                window.myTunePlayer.play();
            }
        });

        return card;
    }

    createPlaylistCard(playlist) {
        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
            <img src="${playlist.cover || 'assets/images/default-cover.png'}">
            <h4>${playlist.name}</h4>
            <p>${playlist.description || ""}</p>
        `;

        return card;
    }

    createGenericCard(item, type) {
        const card = document.createElement("div");
        card.className = "card";
        card.innerHTML = `
            <h4>${item.name || item.title}</h4>
        `;
        return card;
    }

    /* ========================================
       CONTROLS (SORT & VIEW)
    ======================================== */

    createControls() {
        return `
            <div>
                <select id="sortSelect">
                    <option value="name">Name</option>
                    <option value="date">Date</option>
                    <option value="popularity">Popularity</option>
                </select>

                <button id="gridViewBtn">Grid</button>
                <button id="listViewBtn">List</button>
            </div>
        `;
    }

    setupControls() {
        const sortSelect = document.getElementById("sortSelect");

        sortSelect?.addEventListener("change", (e) => {
            this.currentSort = e.target.value;
            this.loadSongs();
        });

        document.getElementById("gridViewBtn")?.addEventListener("click", () => {
            this.currentView = "grid";
            document.getElementById("browseGrid").className = "song-grid";
        });

        document.getElementById("listViewBtn")?.addEventListener("click", () => {
            this.currentView = "list";
            document.getElementById("browseGrid").className = "song-list";
        });
    }

    /* ========================================
       INFINITE SCROLL
    ======================================== */

    setupInfiniteScroll() {
        window.onscroll = () => {
            if (
                window.innerHeight + window.scrollY >=
                document.body.offsetHeight - 200
            ) {
                this.currentPage++;
                this.loadSongs(false);
            }
        };
    }

    /* ========================================
       UI STATES
    ======================================== */

    showLoading() {
        this.mainContent.innerHTML = "<p>Loading...</p>";
    }

    showError(message) {
        this.mainContent.innerHTML = `<p style="color:#F44336;">${message}</p>`;
    }

    showEmpty(message) {
        this.mainContent.innerHTML = `<p>${message}</p>`;
    }
}

/* ==========================================
   INITIALIZE SEARCH
========================================== */

document.addEventListener("DOMContentLoaded", () => {
    window.myTuneSearch = new MyTuneSearch();
});
