const API = "http://localhost:3000/api";

// Film reel background
const strip = document.getElementById("reel-strip");
for (let i = 0; i < 140; i++) {
  const f = document.createElement("div");
  f.className = "reel-frame";
  strip.appendChild(f);
}

// Redirect if already logged in
if (localStorage.getItem("mm_token")) window.location.replace("app.html");

// Login
document.getElementById("login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const errEl = document.getElementById("login-error");
  const btn   = e.target.querySelector(".submit-btn");
  errEl.textContent = "";
  btn.disabled = true;
  btn.querySelector(".btn-text").classList.add("hidden");
  btn.querySelector(".btn-loader").classList.remove("hidden");

  try {
    const res  = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: document.getElementById("login-username").value,
        password: document.getElementById("login-password").value,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    localStorage.setItem("mm_token", data.token);
    localStorage.setItem("mm_user",  JSON.stringify(data.user));
    window.location.replace("app.html");
  } catch (err) {
    errEl.textContent = err.message;
    btn.disabled = false;
    btn.querySelector(".btn-text").classList.remove("hidden");
    btn.querySelector(".btn-loader").classList.add("hidden");
  }
});