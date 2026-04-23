const API = "http://localhost:3000/api";

const optionEl      = document.getElementById("option");
const moodSelect    = document.getElementById("mood-select");
const searchInput   = document.getElementById("search-input");
const timeSelect    = document.getElementById("time-select");
const resultsEl     = document.getElementById("results");

optionEl.addEventListener("change", () => {
  const val = optionEl.value;
  moodSelect.classList.toggle("hidden", val !== "mood");
  searchInput.classList.toggle("hidden", val !== "search");
  timeSelect.classList.toggle("hidden", val !== "time");
});

document.getElementById("go-btn").addEventListener("click", async () => {
  const type   = document.getElementById("type").value;
  const option = optionEl.value;

  let url;
  if (option === "trending")  url = `${API}/trending/${type}`;
  else if (option === "top-rated") url = `${API}/top-rated/${type}`;
  else if (option === "mood")   url = `${API}/mood/${type}/${moodSelect.value}`;
  else if (option === "search") url = `${API}/search/${type}?q=${encodeURIComponent(searchInput.value)}`;
  else if (option === "time")   url = `${API}/time/${type}/${timeSelect.value}`;

  resultsEl.innerHTML = "<p>Loading...</p>";
  const res  = await fetch(url);
  const data = await res.json();
  renderCards(data);
});

function renderCards(items) {
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

    resultsEl.innerHTML += `
      <div class="card">
        <img src="${poster}" alt="${title}" />
        <div class="card-info">
          <h3>${title}</h3>
          <p>⭐ ${rating} &nbsp;|&nbsp; ${date}</p>
        </div>
      </div>`;
  });
}