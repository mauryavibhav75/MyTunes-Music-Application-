/* ==========================================
   MYTUNE LISTEN TOGETHER SYSTEM
========================================== */

class MyTuneListenTogether {
    constructor() {
        this.socket = null;
        this.sessionId = null;
        this.isHost = false;
        this.participants = [];
        this.syncTolerance = 0.5; // 500ms

        this.init();
    }

    /* ========================================
       INITIALIZE SOCKET CONNECTION
    ======================================== */

    init() {
        this.connectSocket();
        this.attachUIEvents();
    }

    connectSocket() {
        this.socket = io("/", {
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 2000
        });

        this.socket.on("connect", () => {
            console.log("Connected to ListenTogether server");
        });

        this.socket.on("disconnect", () => {
            console.warn("Disconnected. Attempting reconnect...");
        });

        /* Session Events */
        this.socket.on("session:updateParticipants", (data) =>
            this.updateParticipants(data)
        );

        this.socket.on("session:play", (data) =>
            this.syncPlay(data)
        );

        this.socket.on("session:pause", (data) =>
            this.syncPause(data)
        );

        this.socket.on("session:seek", (data) =>
            this.syncSeek(data)
        );

        this.socket.on("session:changeSong", (data) =>
            this.syncSong(data)
        );

        this.socket.on("session:chat", (msg) =>
            this.displayChatMessage(msg)
        );

        this.socket.on("session:hostTransferred", (data) => {
            this.isHost = data.newHostId === this.socket.id;
        });

        this.socket.on("session:end", () => {
            alert("Session ended");
            this.leaveSession();
        });
    }

    /* ========================================
       CREATE SESSION
    ======================================== */

    async createSession({ name, privacy }) {
        try {
            const res = await fetch("/api/sessions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, privacy })
            });

            if (!res.ok) throw new Error("Failed to create session");

            const data = await res.json();

            this.sessionId = data.session._id;
            this.isHost = true;

            this.socket.emit("session:join", this.sessionId);

        } catch (err) {
            alert(err.message);
        }
    }

    /* ========================================
       JOIN SESSION
    ======================================== */

    async joinSession(sessionId) {
        try {
            const res = await fetch(`/api/sessions/${sessionId}/join`, {
                method: "POST"
            });

            if (!res.ok) throw new Error("Failed to join session");

            this.sessionId = sessionId;
            this.isHost = false;

            this.socket.emit("session:join", sessionId);

        } catch (err) {
            alert(err.message);
        }
    }

    leaveSession() {
        this.socket.emit("session:leave", this.sessionId);
        this.sessionId = null;
        this.isHost = false;
        this.participants = [];
    }

    /* ========================================
       SYNCHRONIZATION LOGIC
    ======================================== */

    broadcastPlayback(event, payload = {}) {
        if (!this.isHost) return;

        this.socket.emit("session:broadcast", {
            sessionId: this.sessionId,
            event,
            payload
        });
    }

    syncPlay({ time }) {
        if (this.isHost) return;

        const player = window.myTunePlayer;
        const drift = Math.abs(player.audio.currentTime - time);

        if (drift > this.syncTolerance) {
            player.audio.currentTime = time;
        }

        player.play();
    }

    syncPause({ time }) {
        if (this.isHost) return;

        const player = window.myTunePlayer;
        player.audio.currentTime = time;
        player.pause();
    }

    syncSeek({ time }) {
        if (this.isHost) return;

        window.myTunePlayer.audio.currentTime = time;
    }

    syncSong({ index, time }) {
        if (this.isHost) return;

        const player = window.myTunePlayer;
        player.loadSong(index);
        player.audio.currentTime = time;
        player.play();
    }

    /* ========================================
       HOST CONTROLS
    ======================================== */

    attachHostControls() {
        const player = window.myTunePlayer;

        player.audio.addEventListener("play", () => {
            this.broadcastPlayback("play", {
                time: player.audio.currentTime
            });
        });

        player.audio.addEventListener("pause", () => {
            this.broadcastPlayback("pause", {
                time: player.audio.currentTime
            });
        });

        player.audio.addEventListener("seeked", () => {
            this.broadcastPlayback("seek", {
                time: player.audio.currentTime
            });
        });
    }

    /* ========================================
       PARTICIPANTS
    ======================================== */

    updateParticipants(list) {
        this.participants = list;
        this.renderParticipants();
    }

    renderParticipants() {
        const container = document.getElementById("sessionParticipants");
        if (!container) return;

        container.innerHTML = "";

        this.participants.forEach(user => {
            const div = document.createElement("div");
            div.className = "participant";

            div.innerHTML = `
                <span>${user.username}</span>
                <span>${user.synced ? "🟢 Synced" : "🟡 Buffering"}</span>
            `;

            container.appendChild(div);
        });
    }

    /* ========================================
       CHAT SYSTEM
    ======================================== */

    sendChatMessage(text) {
        if (!this.sessionId) return;

        const message = {
            sessionId: this.sessionId,
            text,
            timestamp: new Date()
        };

        this.socket.emit("session:chat", message);
    }

    displayChatMessage(msg) {
        const container = document.getElementById("sessionChat");
        if (!container) return;

        const div = document.createElement("div");

        div.innerHTML = `
            <strong>${msg.username}</strong>:
            ${msg.text}
            <small>${new Date(msg.timestamp).toLocaleTimeString()}</small>
        `;

        container.appendChild(div);
    }

    /* ========================================
       HANDLE DISCONNECTIONS
    ======================================== */

    handleDisconnect() {
        this.socket.on("reconnect", () => {
            if (this.sessionId) {
                this.socket.emit("session:rejoin", this.sessionId);
            }
        });

        this.socket.on("session:hostDisconnected", () => {
            alert("Host disconnected. Transferring host...");
        });
    }

    /* ========================================
       UI EVENTS
    ======================================== */

    attachUIEvents() {
        document.addEventListener("click", (e) => {
            if (e.target.id === "createSessionBtn") {
                const name = prompt("Session Name:");
                const privacy = "public";
                this.createSession({ name, privacy });
            }

            if (e.target.id === "sendSessionChatBtn") {
                const input = document.getElementById("sessionChatInput");
                this.sendChatMessage(input.value);
                input.value = "";
            }
        });
    }
}

/* ==========================================
   INITIALIZE
========================================== */

document.addEventListener("DOMContentLoaded", () => {
    window.myTuneListenTogether = new MyTuneListenTogether();
});
