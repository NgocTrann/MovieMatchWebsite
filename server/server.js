require("dotenv").config();
const express    = require("express");
const cors       = require("cors");
const jwt        = require("jsonwebtoken");
const fetch      = (...args) => import("node-fetch").then(({ default: f }) => f(...args));
const initSqlJs  = require("sql.js");
const fs         = require("fs");
const path       = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// ─── Database Setup ───────────────────────────────────────────────────────────
const DB_PATH = path.join(__dirname, "moviematch.db");
let db;

async function initDB() {
  const SQL = await initSqlJs();

  // Delete old DB if it has the wrong schema
  if (fs.existsSync(DB_PATH)) {
    const temp = new SQL.Database(fs.readFileSync(DB_PATH));
    const hasUserIdCol = temp.exec("PRAGMA table_info(watchlist)")[0]?.values?.some(col => col[1] === "user_id");
    temp.close();
    if (hasUserIdCol) {
      fs.unlinkSync(DB_PATH);
      console.log("🗑️  Old database removed (schema updated)");
    }
  }

  db = fs.existsSync(DB_PATH)
    ? new SQL.Database(fs.readFileSync(DB_PATH))
    : new SQL.Database();

  db.run(`CREATE TABLE IF NOT EXISTS watchlist (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    tmdb_id    INTEGER NOT NULL UNIQUE,
    media_type TEXT NOT NULL,
    title      TEXT NOT NULL,
    poster     TEXT,
    rating     REAL,
    added_at   TEXT DEFAULT (datetime('now'))
  );`);

  saveDB();
  console.log("🗄️  Database ready");
}

function saveDB() {
  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
}

function dbAll(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

function dbGet(sql, params = []) {
  return dbAll(sql, params)[0] || null;
}

function dbRun(sql, params = []) {
  db.run(sql, params);
  saveDB();
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
const ADMIN      = { id: 1, username: "admin", password: "abc123" };
const JWT_SECRET = process.env.JWT_SECRET || "moviematch_secret";

function signToken() {
  return jwt.sign({ id: ADMIN.id, username: ADMIN.username }, JWT_SECRET, { expiresIn: "7d" });
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) return res.status(401).json({ error: "Unauthorized" });
  try {
    jwt.verify(header.slice(7), JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}

app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  if (username !== ADMIN.username || password !== ADMIN.password)
    return res.status(401).json({ error: "Invalid credentials" });
  res.json({ token: signToken(), user: { username: ADMIN.username } });
});

// ─── Watchlist Routes ─────────────────────────────────────────────────────────
app.get("/api/watchlist", requireAuth, (req, res) => {
  res.json(dbAll("SELECT * FROM watchlist ORDER BY added_at DESC"));
});

app.post("/api/watchlist", requireAuth, (req, res) => {
  const { tmdb_id, media_type, title, poster, rating } = req.body;
  if (dbGet("SELECT id FROM watchlist WHERE tmdb_id = ?", [tmdb_id]))
    return res.status(200).json({ message: "Already in watchlist" });
  dbRun(
    "INSERT INTO watchlist (tmdb_id, media_type, title, poster, rating) VALUES (?, ?, ?, ?, ?)",
    [tmdb_id, media_type, title, poster, rating]
  );
  res.status(201).json({ message: "Added to watchlist" });
});

app.delete("/api/watchlist/:tmdb_id", requireAuth, (req, res) => {
  dbRun("DELETE FROM watchlist WHERE tmdb_id = ?", [req.params.tmdb_id]);
  res.json({ message: "Removed" });
});

// ─── TMDB Routes ──────────────────────────────────────────────────────────────
const API_KEY  = process.env.TMDB_API_KEY;
const BASE_URL = "https://api.themoviedb.org/3";

const moodToGenre = { happy: 35, sad: 18, scared: 27, romantic: 10749, excited: 28, relaxed: 35, thoughtful: 99, intense: 80 };
const timeToGenre = { day: 35, night: 27, dawn: 10749, dusk: 28 };

app.get("/api/trending/:type", requireAuth, async (req, res) => {
  const r = await fetch(`${BASE_URL}/trending/${req.params.type}/week?api_key=${API_KEY}`);
  res.json((await r.json()).results);
});

app.get("/api/top-rated/:type", requireAuth, async (req, res) => {
  const r = await fetch(`${BASE_URL}/${req.params.type}/top_rated?api_key=${API_KEY}`);
  res.json((await r.json()).results);
});

app.get("/api/mood/:type/:mood", requireAuth, async (req, res) => {
  const genreID = moodToGenre[req.params.mood];
  if (!genreID) return res.status(400).json({ error: "Invalid mood" });
  const r = await fetch(`${BASE_URL}/discover/${req.params.type}?api_key=${API_KEY}&with_genres=${genreID}`);
  res.json((await r.json()).results);
});

app.get("/api/search/:type", requireAuth, async (req, res) => {
  const r = await fetch(`${BASE_URL}/search/${req.params.type}?api_key=${API_KEY}&query=${encodeURIComponent(req.query.q)}`);
  res.json((await r.json()).results);
});

app.get("/api/time/:type/:time", requireAuth, async (req, res) => {
  const genreID = timeToGenre[req.params.time];
  if (!genreID) return res.status(400).json({ error: "Invalid time" });
  const r = await fetch(`${BASE_URL}/discover/${req.params.type}?api_key=${API_KEY}&with_genres=${genreID}`);
  res.json((await r.json()).results);
});

// ─── Start ────────────────────────────────────────────────────────────────────
initDB().then(() => {
  app.listen(3000, () => console.log("🎬 MovieMatch running on http://localhost:3000"));
});