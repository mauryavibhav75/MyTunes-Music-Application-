/* ============================================================
   MYTUNE AUTH – Login / Register
============================================================ */

/* ---- Toast (inline since player.js not loaded on auth page) ---- */
function showToast(message, type = "info") {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.style.cssText = "position:fixed;bottom:24px;right:20px;display:flex;flex-direction:column;gap:8px;z-index:9999;";
    document.body.appendChild(container);
  }

  const icons = { success: "✔", error: "✖", info: "ℹ", warning: "⚠" };
  const colors = {
    success: "background:#1a5c35;border-left:4px solid #1DB954;",
    error:   "background:#5a1a1a;border-left:4px solid #e53e3e;",
    info:    "background:#1a2f5a;border-left:4px solid #2E75B6;",
    warning: "background:#5a3a00;border-left:4px solid #f6ad55;"
  };

  const t = document.createElement("div");
  t.style.cssText = `${colors[type]||colors.info}color:#fff;padding:12px 18px;border-radius:8px;font-size:0.88rem;font-weight:500;min-width:260px;max-width:360px;box-shadow:0 4px 16px rgba(0,0,0,.4);display:flex;align-items:center;gap:10px;animation:toastIn 0.3s ease;`;
  t.textContent = `${icons[type] || icons.info} ${message}`;
  container.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

/* ---- Inject keyframe if not already in stylesheet ---- */
if (!document.querySelector("#authToastStyle")) {
  const s = document.createElement("style");
  s.id = "authToastStyle";
  s.textContent = `@keyframes toastIn{from{opacity:0;transform:translateX(100%)}to{opacity:1;transform:translateX(0)}}`;
  document.head.appendChild(s);
}

/* ============================================================
   DOM READY
============================================================ */

document.addEventListener("DOMContentLoaded", () => {

  // Redirect if already logged in
  if (localStorage.getItem("token")) {
    window.location.href = "dashboard.html";
    return;
  }

  const loginForm    = document.getElementById("loginForm");
  const registerForm = document.getElementById("registerForm");
  const loginToggle  = document.getElementById("loginToggle");
  const registerToggle = document.getElementById("registerToggle");

  /* ---- Form toggle ---- */
  loginToggle?.addEventListener("click", () => {
    loginForm.classList.add("active-form");
    registerForm.classList.remove("active-form");
    loginToggle.classList.add("active");
    registerToggle.classList.remove("active");
  });

  registerToggle?.addEventListener("click", () => {
    registerForm.classList.add("active-form");
    loginForm.classList.remove("active-form");
    registerToggle.classList.add("active");
    loginToggle.classList.remove("active");
  });

  /* ---- Password show/hide ---- */
  document.querySelectorAll(".toggle-password").forEach(icon => {
    icon.addEventListener("click", () => {
      const input = icon.closest(".password-field").querySelector("input");
      if (!input) return;
      input.type = input.type === "password" ? "text" : "password";
      icon.classList.toggle("fa-eye");
      icon.classList.toggle("fa-eye-slash");
    });
  });

  /* ---- Helper: set button loading state ---- */
  function setLoading(btn, loading) {
    btn.disabled = loading;
    btn.style.opacity = loading ? "0.7" : "1";
    btn.textContent   = loading ? "Please wait…" : btn.dataset.label;
  }

  /* ---- Store original button labels ---- */
  document.querySelectorAll(".primary-btn").forEach(btn => {
    btn.dataset.label = btn.textContent;
  });

  /* ============================================================
     REGISTER
  ============================================================ */

  registerForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("registerName")?.value.trim().replace(/\s+/g, "_");
    const email    = document.getElementById("registerEmail")?.value.trim();
    const password = document.getElementById("registerPassword")?.value;
    const confirm  = document.getElementById("confirmPassword")?.value;
    const btn      = registerForm.querySelector(".primary-btn");

    if (!username || !email || !password || !confirm) {
      showToast("All fields are required", "warning"); return;
    }
    if (password.length < 8) {
      showToast("Password must be at least 8 characters", "warning"); return;
    }
    if (!/[A-Z]/.test(password)) {
      showToast("Password must contain at least one uppercase letter", "warning"); return;
    }
    if (!/[0-9]/.test(password)) {
      showToast("Password must contain at least one number", "warning"); return;
    }
    if (password !== confirm) {
      showToast("Passwords do not match", "error"); return;
    }

    setLoading(btn, true);
    try {
      const res = await fetch("http://localhost:5000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        const errMsg = data.errors?.length
          ? data.errors.map(e => e.message).join(", ")
          : data.message || "Registration failed";
        throw new Error(errMsg);
      }

      showToast("Account created! Please log in.", "success");
      registerForm.reset();
      setTimeout(() => loginToggle?.click(), 1000);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(btn, false);
    }
  });

  /* ============================================================
     LOGIN
  ============================================================ */

  loginForm?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email    = document.getElementById("loginEmail")?.value.trim();
    const password = document.getElementById("loginPassword")?.value;
    const btn      = loginForm.querySelector(".primary-btn");

    if (!email || !password) {
      showToast("Email and password are required", "warning"); return;
    }

    setLoading(btn, true);
    try {
      const res = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        const errMsg = data.errors?.length
          ? data.errors.map(e => e.message).join(", ")
          : data.message || "Login failed";
        throw new Error(errMsg);
      }

      const token = data.data?.accessToken || data.accessToken || data.token;
      if (!token) throw new Error("Login succeeded but no token received");

      const remember = document.getElementById("rememberMe")?.checked;
      localStorage.setItem("token", token);
      const userData = data.data?.user || data.user;
      if (remember && userData) {
        localStorage.setItem("mt_user", JSON.stringify(userData));
      }

      showToast("Welcome back! Redirecting…", "success");
      setTimeout(() => { window.location.href = "dashboard.html"; }, 800);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(btn, false);
    }
  });

});
