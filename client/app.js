const API = "http://localhost:3000/api";

// ── Auth guard — runs before anything else ────────────────────────────────────
const token = localStorage.getItem("mm_token");
const user  = JSON.parse(localStorage.getItem("mm_user") || "null");
if (!token || !user) {
  window.location.replace("auth.html");
  throw new Error("Redirecting to login");
}

document.getElementById("username-display").textContent = `User: ${user.username}`;

document.getElementById("logout-btn").addEventListener("click", () => {
  localStorage.removeItem("mm_token");
  localStorage.removeItem("mm_user");
  window.location.replace("auth.html");
});

// ── Authenticated fetch ───────────────────────────────────────────────────────
async function authFetch(url, opts = {}) {
  return fetch(url, {
    ...opts,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...opts.headers },
  });
}

// ── Controls ──────────────────────────────────────────────────────────────────
const optionEl    = document.getElementById("option");
const moodSelect  = document.getElementById("mood-select");
const searchInput = document.getElementById("search-input");
const timeSelect  = document.getElementById("time-select");
const resultsEl   = document.getElementById("results");

optionEl.addEventListener("change", () => {
  const val = optionEl.value;
  moodSelect.classList.toggle("hidden",  val !== "mood");
  searchInput.classList.toggle("hidden", val !== "search");
  timeSelect.classList.toggle("hidden",  val !== "time");
});

document.getElementById("go-btn").addEventListener("click", async () => {
  const type   = document.getElementById("type").value;
  const option = optionEl.value;

  if (option === "mood" && !moodSelect.value) {
    resultsEl.innerHTML = "<p>Please select a mood first.</p>";
    return;
  }
  if (option === "time" && !timeSelect.value) {
    resultsEl.innerHTML = "<p>Please select a time of day first.</p>";
    return;
  }
  if (option === "search" && !searchInput.value.trim()) {
    resultsEl.innerHTML = "<p>Please enter a search term first.</p>";
    return;
  }

  let url;
  if (option === "trending")       url = `${API}/trending/${type}`;
  else if (option === "top-rated") url = `${API}/top-rated/${type}`;
  else if (option === "mood")      url = `${API}/mood/${type}/${moodSelect.value}`;
  else if (option === "search")    url = `${API}/search/${type}?q=${encodeURIComponent(searchInput.value)}`;
  else if (option === "time")      url = `${API}/time/${type}/${timeSelect.value}`;

  resultsEl.innerHTML = "<p>Loading...</p>";
  const res = await authFetch(url);
  if (res.status === 401) { window.location.replace("auth.html"); return; }
  const data = await res.json();
  renderCards(data, type);
});

// ── Cards ─────────────────────────────────────────────────────────────────────
function renderCards(items, mediaType) {
  resultsEl.innerHTML = "";
  if (!items || items.length === 0) {
    resultsEl.innerHTML = "<p>No results found.</p>";
    return;
  }
  items.forEach(item => {
    const title  = item.title || item.name;
    const date   = item.release_date || item.first_air_date || "N/A";
    const rating = item.vote_average?.toFixed(1) || "N/A";
    const poster = item.poster_path
      ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
      : "https://via.placeholder.com/500x750?text=No+Image";

    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <img src="${poster}" alt="${title}" />
      <div class="card-info">
        <h3>${title}</h3>
        <p>⭐ ${rating} &nbsp;|&nbsp; ${date}</p>
        <button class="wl-btn"
          data-id="${item.id}"
          data-type="${mediaType}"
          data-title="${title.replace(/"/g, '&quot;')}"
          data-poster="${item.poster_path || ''}"
          data-rating="${rating}">＋ Watchlist</button>
      </div>`;
    resultsEl.appendChild(card);
  });

  resultsEl.querySelectorAll(".wl-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      console.log("Test");
      const { id, type: mt, title, poster, rating } = btn.dataset;
      btn.textContent = "Adding...";
      btn.disabled = true;
      const res = await authFetch(`${API}/watchlist`, {
        method: "POST",
        body: JSON.stringify({
          tmdb_id: id,
          media_type: mt,
          title,
          poster: poster ? `https://image.tmdb.org/t/p/w500${poster}` : "",
          rating: parseFloat(rating) || null,
        }),
      });
      if (res.ok) {
        btn.textContent = "✓ Added";
      } else {
        btn.textContent = "＋ Watchlist";
        btn.disabled = false;
      }
    });
  });
}

// ── Watchlist Panel ───────────────────────────────────────────────────────────
const panel   = document.getElementById("watchlist-panel");
const wlItems = document.getElementById("watchlist-items");

document.getElementById("watchlist-btn").addEventListener("click", async () => {
  panel.classList.remove("hidden");
  wlItems.innerHTML = "<p>Loading...</p>";
  await renderWatchlist();
});

async function renderWatchlist() {
  const res  = await authFetch(`${API}/watchlist`);
  const data = await res.json();
  wlItems.innerHTML = "";
  if (!data.length) {
    wlItems.innerHTML = "<p>Your watchlist is empty.</p>";
    return;
  }
  data.forEach(item => {
    const el = document.createElement("div");
    el.className = "wl-item";
    el.innerHTML = `
      ${item.poster ? `<img src="${item.poster}" alt="${item.title}" />` : ""}
      <div class="wl-info">
        <strong>${item.title}</strong>
        <span>${item.media_type === "movie" ? "🎬" : "📺"}${item.rating ? " ⭐ " + item.rating : ""}</span>
      </div>
      <button class="wl-remove">✕</button>`;
    wlItems.appendChild(el);

    el.querySelector(".wl-remove").addEventListener("click", async () => {
      await authFetch(`${API}/watchlist/${item.tmdb_id}`, { method: "DELETE" });
      el.remove();
      if (!wlItems.children.length)
        wlItems.innerHTML = "<p>Your watchlist is empty.</p>";
    });
  });
}

document.getElementById("close-watchlist").addEventListener("click", () => {
  panel.classList.add("hidden");
});