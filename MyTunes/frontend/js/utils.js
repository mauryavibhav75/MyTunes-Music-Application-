/* ==========================================
   MYTUNE GLOBAL UTILITIES
========================================== */

const MyTuneUtils = (() => {

    /* ========================================
       TIME FORMATTING
    ======================================== */

    const formatTime = (seconds = 0) => {
        seconds = Math.floor(seconds);

        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hrs > 0) {
            return `${hrs}:${mins.toString().padStart(2, "0")}:${secs
                .toString()
                .padStart(2, "0")}`;
        }

        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    const formatDuration = (seconds = 0) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);

        let result = "";
        if (hrs > 0) result += `${hrs} hr${hrs > 1 ? "s" : ""} `;
        if (mins > 0) result += `${mins} min${mins > 1 ? "s" : ""}`;

        return result.trim();
    };

    /* ========================================
       API HELPERS
    ======================================== */

    const fetchWithAuth = async (url, options = {}) => {
        const token =
            localStorage.getItem("token") ||
            sessionStorage.getItem("token");

        const headers = {
            "Content-Type": "application/json",
            ...options.headers
        };

        if (token) headers["Authorization"] = `Bearer ${token}`;

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || "API Error");
            }

            return await response.json();

        } catch (error) {
            handleApiError(error);
            throw error;
        }
    };

    const handleApiError = (error) => {
        console.error("API Error:", error);
        showToast(error.message || "Something went wrong", "error");
    };

    const showToast = (message, type = "info") => {
        const toast = document.createElement("div");
        toast.className = `toast toast-${type}`;
        toast.textContent = message;

        document.body.appendChild(toast);

        setTimeout(() => toast.classList.add("show"), 100);

        setTimeout(() => {
            toast.classList.remove("show");
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    };

    /* ========================================
       VALIDATION
    ======================================== */

    const validateEmail = (email) =>
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    const validatePassword = (password) => {
        return {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            number: /[0-9]/.test(password),
            special: /[^A-Za-z0-9]/.test(password)
        };
    };

    const validateUsername = (username) =>
        /^[a-zA-Z0-9_]{3,20}$/.test(username);

    /* ========================================
       DEBOUNCE
    ======================================== */

    const debounce = (func, delay = 300) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), delay);
        };
    };

    /* ========================================
       LOCAL STORAGE HELPERS
    ======================================== */

    const setItem = (key, value) => {
        localStorage.setItem(key, JSON.stringify(value));
    };

    const getItem = (key) => {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
    };

    const removeItem = (key) => {
        localStorage.removeItem(key);
    };

    /* ========================================
       DOM HELPERS
    ======================================== */

    const createElement = (tag, classes = [], attributes = {}) => {
        const el = document.createElement(tag);

        if (classes.length) el.classList.add(...classes);

        Object.entries(attributes).forEach(([key, value]) =>
            el.setAttribute(key, value)
        );

        return el;
    };

    const createSongCard = (song) => {
        const card = createElement("div", ["card"]);

        card.innerHTML = `
            <img src="${song.cover || 'assets/images/default-cover.png'}">
            <h4>${song.title}</h4>
            <p>${song.artist}</p>
        `;

        return card;
    };

    const createPlaylistCard = (playlist) => {
        const card = createElement("div", ["card"]);

        card.innerHTML = `
            <img src="${playlist.cover || 'assets/images/default-cover.png'}">
            <h4>${playlist.name}</h4>
            <p>${playlist.description || ""}</p>
        `;

        return card;
    };

    const createUserCard = (user) => {
        const card = createElement("div", ["card"]);

        card.innerHTML = `
            <img src="${user.avatar || 'assets/images/default-avatar.png'}">
            <h4>${user.username}</h4>
            <p>${user.mutualFriends || 0} mutual friends</p>
        `;

        return card;
    };

    /* ========================================
       DATE FORMATTING
    ======================================== */

    const formatDate = (date) => {
        const d = new Date(date);
        return d.toLocaleDateString();
    };

    const timeAgo = (date) => {
        const seconds = Math.floor(
            (new Date() - new Date(date)) / 1000
        );

        const intervals = {
            year: 31536000,
            month: 2592000,
            day: 86400,
            hour: 3600,
            minute: 60
        };

        for (let key in intervals) {
            const interval = Math.floor(seconds / intervals[key]);
            if (interval >= 1) {
                return `${interval} ${key}${interval > 1 ? "s" : ""} ago`;
            }
        }

        return "Just now";
    };

    /* ========================================
       PUBLIC API
    ======================================== */

    return {
        formatTime,
        formatDuration,
        fetchWithAuth,
        handleApiError,
        showToast,
        validateEmail,
        validatePassword,
        validateUsername,
        debounce,
        setItem,
        getItem,
        removeItem,
        createElement,
        createSongCard,
        createPlaylistCard,
        createUserCard,
        formatDate,
        timeAgo
    };

})();
