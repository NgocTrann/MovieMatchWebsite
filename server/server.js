require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fetch = (...args) =>
  import("node-fetch").then(({ default: f }) => f(...args));

const app = express();
app.use(cors());
app.use(express.json());

const API_KEY = process.env.TMDB_API_KEY;
const BASE_URL = "https://api.themoviedb.org/3";

const moodToGenre = {
  happy: 35, sad: 18, scared: 27,
  romantic: 10749, excited: 28,
  relaxed: 35, thoughtful: 99, intense: 80,
};

const timeToGenre = {
  day: 35, night: 27, dawn: 10749, dusk: 28,
};

app.get("/api/trending/:type", async (req, res) => {
  const { type } = req.params;
  const r = await fetch(`${BASE_URL}/trending/${type}/week?api_key=${API_KEY}`);
  const data = await r.json();
  res.json(data.results);
});

app.get("/api/top-rated/:type", async (req, res) => {
  const { type } = req.params;
  const r = await fetch(`${BASE_URL}/${type}/top_rated?api_key=${API_KEY}`);
  const data = await r.json();
  res.json(data.results);
});

app.get("/api/mood/:type/:mood", async (req, res) => {
  const { type, mood } = req.params;
  const genreID = moodToGenre[mood];
  if (!genreID) return res.status(400).json({ error: "Invalid mood" });
  const r = await fetch(`${BASE_URL}/discover/${type}?api_key=${API_KEY}&with_genres=${genreID}`);
  const data = await r.json();
  res.json(data.results);
});

app.get("/api/search/:type", async (req, res) => {
  const { type } = req.params;
  const { q } = req.query;
  const r = await fetch(`${BASE_URL}/search/${type}?api_key=${API_KEY}&query=${encodeURIComponent(q)}`);
  const data = await r.json();
  res.json(data.results);
});

app.get("/api/time/:type/:time", async (req, res) => {
  const { type, time } = req.params;
  const genreID = timeToGenre[time];
  if (!genreID) return res.status(400).json({ error: "Invalid time" });
  const r = await fetch(`${BASE_URL}/discover/${type}?api_key=${API_KEY}&with_genres=${genreID}`);
  const data = await r.json();
  res.json(data.results);
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));