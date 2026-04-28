/* ==========================================
   MYTUNE FRIEND CONNECTION SYSTEM
========================================== */

class MyTuneFriends {
    constructor() {
        this.mainContent = document.getElementById("mainContent");
        this.state = {
            friends: [],
            requests: [],
            suggestions: []
        };

        this.init();
    }

    /* ========================================
       INITIALIZATION
    ======================================== */

    init() {
        this.attachGlobalEvents();
        this.loadFriends();
        this.loadFriendRequests();
        this.loadSuggestions();
    }

    showError(message) {
        alert("Error: " + message);
    }

    showSuccess(message) {
        alert(message);
    }

    /* ========================================
       USER SEARCH
    ======================================== */

    attachGlobalEvents() {
        document.addEventListener("input", (e) => {
            if (e.target.id === "friendSearchInput") {
                this.searchUsers(e.target.value);
            }

            if (e.target.id === "filterFriendsInput") {
                this.filterFriends(e.target.value);
            }
        });
    }

    async searchUsers(query) {
        if (query.length < 2) return;

        try {
            const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
            if (!res.ok) throw new Error("Search failed");

            const data = await res.json();
            this.renderUserSearchResults(data.users);

        } catch (err) {
            this.showError(err.message);
        }
    }

    renderUserSearchResults(users) {
        const container = document.getElementById("userSearchResults");
        if (!container) return;

        container.innerHTML = "";

        users.forEach(user => {
            const card = document.createElement("div");
            card.className = "card user-card";

            card.innerHTML = `
                <img src="${user.avatar || 'assets/images/default-avatar.png'}">
                <div>
                    <h4>${user.username}</h4>
                    <p>${user.mutualFriends || 0} mutual friends</p>
                </div>
                <button class="addFriendBtn">Add Friend</button>
            `;

            card.querySelector(".addFriendBtn")
                .addEventListener("click", () => this.sendFriendRequest(user._id));

            container.appendChild(card);
        });
    }

    /* ========================================
       SEND FRIEND REQUEST
    ======================================== */

    async sendFriendRequest(userId) {
        const message = prompt("Optional message:");

        try {
            const res = await fetch("/api/friends/request", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, message })
            });

            if (!res.ok) throw new Error("Request failed");

            this.showSuccess("Friend request sent");
            this.loadSuggestions();

        } catch (err) {
            this.showError(err.message);
        }
    }

    /* ========================================
       LOAD FRIEND REQUESTS
    ======================================== */

    async loadFriendRequests() {
        try {
            const res = await fetch("/api/friends/requests");
            if (!res.ok) throw new Error("Failed to load requests");

            const data = await res.json();
            this.state.requests = data.requests;

            this.renderFriendRequests();

        } catch (err) {
            this.showError(err.message);
        }
    }

    renderFriendRequests() {
        const container = document.getElementById("friendRequests");
        if (!container) return;

        container.innerHTML = "";

        this.state.requests.forEach(req => {
            const div = document.createElement("div");
            div.className = "card";

            div.innerHTML = `
                <h4>${req.sender.username}</h4>
                <p>${req.message || ""}</p>
                <button class="acceptBtn">Accept</button>
                <button class="declineBtn">Decline</button>
            `;

            div.querySelector(".acceptBtn")
                .addEventListener("click", () => this.acceptRequest(req._id));

            div.querySelector(".declineBtn")
                .addEventListener("click", () => this.declineRequest(req._id));

            container.appendChild(div);
        });
    }

    async acceptRequest(requestId) {
        try {
            const res = await fetch(`/api/friends/request/${requestId}/accept`, {
                method: "PUT"
            });

            if (!res.ok) throw new Error("Accept failed");

            this.showSuccess("Friend added");
            this.loadFriendRequests();
            this.loadFriends();

        } catch (err) {
            this.showError(err.message);
        }
    }

    async declineRequest(requestId) {
        try {
            const res = await fetch(`/api/friends/request/${requestId}/decline`, {
                method: "PUT"
            });

            if (!res.ok) throw new Error("Decline failed");

            this.loadFriendRequests();

        } catch (err) {
            this.showError(err.message);
        }
    }

    /* ========================================
       FRIENDS LIST
    ======================================== */

    async loadFriends() {
        try {
            const res = await fetch("/api/friends");
            if (!res.ok) throw new Error("Failed to load friends");

            const data = await res.json();
            this.state.friends = data.friends;

            this.renderFriends();

        } catch (err) {
            this.showError(err.message);
        }
    }

    renderFriends() {
        const container = document.getElementById("friendsList");
        if (!container) return;

        container.innerHTML = "";

        this.state.friends.forEach(friend => {
            const div = document.createElement("div");
            div.className = "card friend-card";

            const statusColor =
                friend.status === "online"
                    ? "green"
                    : friend.status === "away"
                    ? "yellow"
                    : "gray";

            div.innerHTML = `
                <img src="${friend.avatar || 'assets/images/default-avatar.png'}">
                <span class="status-dot" style="background:${statusColor}"></span>
                <h4>${friend.username}</h4>
                <button class="messageBtn">Message</button>
                <button class="viewBtn">Profile</button>
                <button class="unfriendBtn">Unfriend</button>
            `;

            div.querySelector(".unfriendBtn")
                .addEventListener("click", () => this.unfriend(friend._id));

            container.appendChild(div);
        });
    }

    filterFriends(query) {
        const filtered = this.state.friends.filter(f =>
            f.username.toLowerCase().includes(query.toLowerCase())
        );

        this.renderFilteredFriends(filtered);
    }

    renderFilteredFriends(friends) {
        const container = document.getElementById("friendsList");
        container.innerHTML = "";

        friends.forEach(friend => {
            const div = document.createElement("div");
            div.className = "card";
            div.innerHTML = `<h4>${friend.username}</h4>`;
            container.appendChild(div);
        });
    }

    /* ========================================
       SUGGESTIONS
    ======================================== */

    async loadSuggestions() {
        try {
            const res = await fetch("/api/friends/suggestions");
            if (!res.ok) throw new Error("Failed to load suggestions");

            const data = await res.json();
            this.state.suggestions = data.suggestions;

            this.renderSuggestions();

        } catch (err) {
            this.showError(err.message);
        }
    }

    renderSuggestions() {
        const container = document.getElementById("friendSuggestions");
        if (!container) return;

        container.innerHTML = "";

        this.state.suggestions.forEach(user => {
            const div = document.createElement("div");
            div.className = "card";

            div.innerHTML = `
                <h4>${user.username}</h4>
                <p>${user.mutualFriends} mutual friends</p>
                <button>Add Friend</button>
            `;

            div.querySelector("button")
                .addEventListener("click", () => this.sendFriendRequest(user._id));

            container.appendChild(div);
        });
    }

    /* ========================================
       UNFRIEND
    ======================================== */

    async unfriend(friendId) {
        if (!confirm("Are you sure you want to unfriend?")) return;

        try {
            const res = await fetch(`/api/friends/${friendId}`, {
                method: "DELETE"
            });

            if (!res.ok) throw new Error("Failed to unfriend");

            this.showSuccess("Unfriended");
            this.loadFriends();

        } catch (err) {
            this.showError(err.message);
        }
    }
}

/* ==========================================
   INITIALIZE
========================================== */

document.addEventListener("DOMContentLoaded", () => {
    window.myTuneFriends = new MyTuneFriends();
});
