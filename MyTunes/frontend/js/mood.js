/* ==========================================
   MOOD PLAYLIST FRONTEND
========================================== */

class MoodFeature {

  constructor() {
    this.apiBase = "http://localhost:5000/api/moods";
    this.moodContainer = document.getElementById("moodContainer");
    this.init();
  }

  init() {
    this.createMoodSelector();
  }

  createMoodSelector() {
    const moods = [
      "Happy",
      "Sad",
      "Energetic",
      "Calm",
      "Romantic",
      "Angry",
      "Motivated"
    ];

    moods.forEach(mood => {
      const btn = document.createElement("button");
      btn.className = "mood-btn";
      btn.textContent = mood;
      btn.onclick = () => this.loadMoodPlaylist(mood);
      this.moodContainer.appendChild(btn);
    });
  }

  async loadMoodPlaylist(mood) {
    try {
      const res = await fetch(`${this.apiBase}/${mood}`);
      const data = await res.json();

      this.displaySongs(data.data);
    } catch (error) {
      console.error("Mood load error:", error);
    }
  }

  displaySongs(songs) {
    const list = document.getElementById("moodSongs");
    list.innerHTML = "";

    songs.forEach(song => {
      const div = document.createElement("div");
      div.className = "song-card";
      div.innerHTML = `
        <h4>${song.title}</h4>
        <p>${song.artist}</p>
      `;
      div.onclick = () => window.player.loadSong(song);
      list.appendChild(div);
    });
  }

}

document.addEventListener("DOMContentLoaded", () => {
  new MoodFeature();
});