/* ==========================================
   OFFLINE DOWNLOAD SYSTEM
========================================== */

class OfflineManager {
    constructor() {
        this.dbName = "MyTuneOfflineDB";
        this.storeName = "songs";
        this.initDB();
    }

    /* ===============================
       IndexedDB Setup
    =============================== */
    initDB() {
        const request = indexedDB.open(this.dbName, 1);

        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            db.createObjectStore(this.storeName, { keyPath: "id" });
        };

        request.onsuccess = (e) => {
            this.db = e.target.result;
            console.log("Offline DB Ready");
        };

        request.onerror = () => {
            console.error("IndexedDB Error");
        };
    }

    /* ===============================
       Download Song
    =============================== */
    async downloadSong(songId) {
        try {
            const tokenRes = await fetch(`/api/download/token/${songId}`, {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`
                }
            });

            const { downloadUrl } = await tokenRes.json();

            const response = await fetch(downloadUrl);
            const reader = response.body.getReader();
            const contentLength = +response.headers.get("Content-Length");

            let receivedLength = 0;
            let chunks = [];

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                chunks.push(value);
                receivedLength += value.length;

                const progress = Math.round((receivedLength / contentLength) * 100);
                this.updateProgressUI(songId, progress);
            }

            const blob = new Blob(chunks);
            this.saveSong(songId, blob);

        } catch (err) {
            console.error("Download error:", err);
        }
    }

    /* ===============================
       Save to IndexedDB
    =============================== */
    saveSong(id, blob) {
        const transaction = this.db.transaction(this.storeName, "readwrite");
        const store = transaction.objectStore(this.storeName);

        store.put({ id, blob });

        transaction.oncomplete = () => {
            console.log("Song saved offline");
        };
    }

    /* ===============================
       Get Offline Song
    =============================== */
    getOfflineSong(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(this.storeName, "readonly");
            const store = transaction.objectStore(this.storeName);
            const request = store.get(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject("Not found");
        });
    }

    /* ===============================
       Progress UI
    =============================== */
    updateProgressUI(songId, percent) {
        const el = document.getElementById(`download-${songId}`);
        if (el) el.innerText = `Downloading ${percent}%`;
    }

    /* ===============================
       Storage Info
    =============================== */
    async getStorageUsage() {
        if (navigator.storage && navigator.storage.estimate) {
            const estimate = await navigator.storage.estimate();
            console.log("Storage used:", estimate.usage);
        }
    }
}

const offlineManager = new OfflineManager();