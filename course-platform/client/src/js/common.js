function getLang() {
  const params = new URLSearchParams(window.location.search);
  return params.get("lang") || localStorage.getItem("site_lang") || "vi";
}

function setLang(lang) {
  localStorage.setItem("site_lang", lang);
  const url = new URL(window.location.href);
  url.searchParams.set("lang", lang);
  window.history.replaceState({}, "", url);
}

async function apiFetch(url, options = {}) {
  const response = await fetch(url, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }
  return data;
}

function showToast(message, variant = "success") {
  const container = document.getElementById("toastContainer");
  if (!container || !window.bootstrap) return;
  const toastEl = document.createElement("div");
  toastEl.className = `toast align-items-center text-bg-${variant} border-0`;
  toastEl.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${message}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>
  `;
  container.appendChild(toastEl);
  const toast = new window.bootstrap.Toast(toastEl, { delay: 3200 });
  toast.show();
  toastEl.addEventListener("hidden.bs.toast", () => toastEl.remove());
}

function initZaloBubble() {
  if (document.querySelector(".floating-zalo")) return;
  const link = document.createElement("a");
  link.href = "https://zalo.me/0900000000";
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.className = "floating-zalo";
  link.setAttribute("aria-label", "Chat Zalo");
  link.innerHTML = '<i class="fa-solid fa-comments"></i>';
  document.body.appendChild(link);
}

function initAOS() {
  if (window.AOS) {
    window.AOS.init({
      duration: 800,
      once: true,
      offset: 60
    });
  }
}

async function trackVisit() {
  try {
    await apiFetch("/api/tracking/visit", {
      method: "POST",
      body: JSON.stringify({
        page: window.location.pathname,
        lang: getLang()
      })
    });
  } catch (error) {
    console.warn("Visit tracking failed", error.message);
  }
}

async function getCurrentUser() {
  try {
    const response = await apiFetch("/api/auth/me");
    return response.data;
  } catch {
    return null;
  }
}

function redirectWithLang(path) {
  const url = new URL(path, window.location.origin);
  url.searchParams.set("lang", getLang());
  window.location.href = url.toString();
}

function withLangUrl(path) {
  const url = new URL(path, window.location.origin);
  url.searchParams.set("lang", getLang());
  return `${url.pathname}${url.search}`;
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

async function logoutAndRedirect() {
  try {
    await apiFetch("/api/auth/logout", { method: "POST" });
  } catch (error) {
    console.warn("Logout failed", error.message);
  }
  redirectWithLang("/login.html");
}

window.DriveSchoolCommon = {
  getLang,
  setLang,
  apiFetch,
  showToast,
  initZaloBubble,
  initAOS,
  trackVisit,
  getCurrentUser,
  redirectWithLang,
  withLangUrl,
  escapeHtml,
  formatDateTime,
  logoutAndRedirect
};
