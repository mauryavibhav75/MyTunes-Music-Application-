/* ==========================================
   MYTUNE PLAYLIST MANAGEMENT
========================================== */

class MyTunePlaylist {
    constructor() {
        this.mainContent = document.getElementById("mainContent");
        this.currentPlaylist = null;

        this.init();
    }

    init() {
        this.attachGlobalListeners();
    }

    /* ========================================
       UTILITIES
    ======================================== */

    showMessage(message, type = "success") {
        alert(message); // Replace with toast later
    }

    showError(message) {
        alert("Error: " + message);
    }

    /* ========================================
       CREATE PLAYLIST
    ======================================== */

    openCreateModal() {
        const modal = document.createElement("div");
        modal.className = "playlist-modal";
        modal.innerHTML = `
            <div class="modal-content">
                <h2>Create Playlist</h2>
                <input type="text" id="playlistName" placeholder="Playlist Name" required>
                <textarea id="playlistDesc" placeholder="Description"></textarea>

                <select id="playlistPrivacy">
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                </select>

                <input type="file" id="playlistCover" accept="image/*">

                <button id="createPlaylistBtn">Create</button>
                <button id="closeModalBtn">Cancel</button>
            </div>
        `;

        document.body.appendChild(modal);

        document.getElementById("closeModalBtn").onclick = () => modal.remove();

        document.getElementById("createPlaylistBtn").onclick =
            () => this.createPlaylist(modal);
    }

    async createPlaylist(modal) {
        const name = document.getElementById("playlistName").value.trim();
        const description = document.getElementById("playlistDesc").value.trim();
        const privacy = document.getElementById("playlistPrivacy").value;
        const cover = document.getElementById("playlistCover").files[0];

        if (!name) return this.showError("Playlist name required");

        const formData = new FormData();
        formData.append("name", name);
        formData.append("description", description);
        formData.append("privacy", privacy);
        if (cover) formData.append("cover", cover);

        try {
            const res = await fetch("/api/playlists", {
                method: "POST",
                body: formData
            });

            if (!res.ok) throw new Error("Failed to create playlist");

            this.showMessage("Playlist created successfully");
            modal.remove();
            this.loadUserPlaylists();

        } catch (err) {
            this.showError(err.message);
        }
    }

    /* ========================================
       EDIT PLAYLIST
    ======================================== */

    async editPlaylist(id, updatedData) {
        try {
            const res = await fetch(`/api/playlists/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updatedData)
            });

            if (!res.ok) throw new Error("Failed to update playlist");

            this.showMessage("Playlist updated");
            this.loadPlaylist(id);

        } catch (err) {
            this.showError(err.message);
        }
    }

    /* ========================================
       DELETE PLAYLIST
    ======================================== */

    async deletePlaylist(id) {
        if (!confirm("Are you sure you want to delete this playlist?")) return;

        try {
            const res = await fetch(`/api/playlists/${id}`, {
                method: "DELETE"
            });

            if (!res.ok) throw new Error("Failed to delete playlist");

            this.showMessage("Playlist deleted");
            this.mainContent.innerHTML = "<h2>Playlist deleted</h2>";

        } catch (err) {
            this.showError(err.message);
        }
    }

    /* ========================================
       LOAD PLAYLIST DETAILS
    ======================================== */

    async loadPlaylist(id) {
        try {
            const res = await fetch(`/api/playlists/${id}`);
            if (!res.ok) throw new Error("Failed to load playlist");

            const data = await res.json();
            this.currentPlaylist = data.playlist;

            this.renderPlaylist(data.playlist);

        } catch (err) {
            this.showError(err.message);
        }
    }

    renderPlaylist(playlist) {
        const totalDuration = playlist.songs.reduce(
            (acc, s) => acc + (s.duration || 0),
            0
        );

        this.mainContent.innerHTML = `
            <div class="playlist-header">
                <img src="${playlist.cover || 'assets/images/default-cover.png'}">
                <div>
                    <h2>${playlist.name}</h2>
                    <p>${playlist.description || ""}</p>
                    <p>${playlist.songs.length} songs • ${this.formatTime(totalDuration)}</p>
                    <button id="playPlaylistBtn">Play All</button>
                </div>
            </div>

            <ul id="playlistSongs" class="playlist-songs"></ul>
        `;

        const list = document.getElementById("playlistSongs");

        playlist.songs.forEach((song, index) => {
            const li = document.createElement("li");
            li.draggable = true;
            li.dataset.index = index;

            li.innerHTML = `
                <span>${song.title} - ${song.artist}</span>
                <button class="removeSongBtn">🗑</button>
            `;

            li.querySelector(".removeSongBtn")
                .addEventListener("click", () =>
                    this.removeSongFromPlaylist(playlist._id, song._id)
                );

            this.attachDragEvents(li);
            list.appendChild(li);
        });

        document.getElementById("playPlaylistBtn")
            .addEventListener("click", () => this.playEntirePlaylist());
    }

    /* ========================================
       ADD SONG TO PLAYLIST
    ======================================== */

    async addSongToPlaylist(playlistId, songId) {
        try {
            const res = await fetch(`/api/playlists/${playlistId}/songs`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ songId })
            });

            if (!res.ok) throw new Error("Failed to add song");

            this.showMessage("Song added to playlist");
            this.loadPlaylist(playlistId);

        } catch (err) {
            this.showError(err.message);
        }
    }

    /* ========================================
       REMOVE SONG
    ======================================== */

    async removeSongFromPlaylist(playlistId, songId) {
        if (!confirm("Remove this song?")) return;

        try {
            const res = await fetch(
                `/api/playlists/${playlistId}/songs/${songId}`,
                { method: "DELETE" }
            );

            if (!res.ok) throw new Error("Failed to remove song");

            this.showMessage("Song removed");
            this.loadPlaylist(playlistId);

        } catch (err) {
            this.showError(err.message);
        }
    }

    /* ========================================
       DRAG & DROP REORDER
    ======================================== */

    attachDragEvents(element) {
        element.addEventListener("dragstart", (e) => {
            e.dataTransfer.setData("text/plain", element.dataset.index);
            element.classList.add("dragging");
        });

        element.addEventListener("dragover", (e) => e.preventDefault());

        element.addEventListener("drop", async (e) => {
            e.preventDefault();
            const fromIndex = e.dataTransfer.getData("text/plain");
            const toIndex = element.dataset.index;

            await this.reorderSongs(fromIndex, toIndex);
        });

        element.addEventListener("dragend", () => {
            element.classList.remove("dragging");
        });
    }

    async reorderSongs(from, to) {
        try {
            const res = await fetch(
                `/api/playlists/${this.currentPlaylist._id}/reorder`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ from, to })
                }
            );

            if (!res.ok) throw new Error("Failed to reorder");

            this.loadPlaylist(this.currentPlaylist._id);

        } catch (err) {
            this.showError(err.message);
        }
    }

    /* ========================================
       PLAY ENTIRE PLAYLIST
    ======================================== */

    playEntirePlaylist() {
        if (!window.myTunePlayer) return;

        window.myTunePlayer.queue = [...this.currentPlaylist.songs];
        window.myTunePlayer.currentIndex = 0;
        window.myTunePlayer.loadSong(0);
        window.myTunePlayer.play();
    }

    /* ========================================
       LOAD USER PLAYLISTS
    ======================================== */

    async loadUserPlaylists() {
        try {
            const res = await fetch("/api/playlists");
            if (!res.ok) throw new Error("Failed to load playlists");

            const data = await res.json();
            console.log(data.playlists);

        } catch (err) {
            this.showError(err.message);
        }
    }

    /* ========================================
       FORMAT TIME
    ======================================== */

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
    }

    /* ========================================
       GLOBAL LISTENERS
    ======================================== */

    attachGlobalListeners() {
        document.addEventListener("click", (e) => {
            if (e.target.matches("#createPlaylistGlobalBtn")) {
                this.openCreateModal();
            }
        });
    }
}

/* ==========================================
   INITIALIZE
========================================== */

document.addEventListener("DOMContentLoaded", () => {
    window.myTunePlaylist = new MyTunePlaylist();
});
