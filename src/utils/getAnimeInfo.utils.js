/**
 * getAnimeInfo.utils.js — AnimePahe adapter
 *
 * "id" is an AnimePahe session slug like "naruto-0bc43e".
 *
 * We combine:
 *   /search?q=<slug>        → poster, title, type, year
 *   /ids?session=<slug>     → anilist / mal IDs
 *   /episodes?session=<slug>→ episode count
 */

import axios from "axios";

export default async function fetchAnimeInfo(id, random = false) {
  const api_url = import.meta.env.VITE_API_URL;

  try {
    let session = id;

    if (random) {
      const titles = ["One Piece", "Naruto", "Demon Slayer", "Jujutsu Kaisen", "Bleach"];
      const q = titles[Math.floor(Math.random() * titles.length)];
      const res = await axios.get(`${api_url}/search?q=${encodeURIComponent(q)}`);
      const results = Array.isArray(res.data) ? res.data : [];
      if (!results.length) throw new Error("No results for random anime");
      session = results[0].session;
    }

    // Fetch metadata, IDs, and episodes in parallel
    const searchQuery = session.replace(/-/g, " ");
    const [searchRes, idsRes, episodesRes] = await Promise.allSettled([
      axios.get(`${api_url}/search?q=${encodeURIComponent(searchQuery)}`),
      axios.get(`${api_url}/ids?session=${encodeURIComponent(session)}`),
      axios.get(`${api_url}/episodes?session=${encodeURIComponent(session)}`),
    ]);

    // /search results: [{ id, title, url, year, poster, type, session }]
    const searchResults = searchRes.status === "fulfilled"
      ? (Array.isArray(searchRes.value.data) ? searchRes.value.data : [])
      : [];
    const meta = searchResults.find(r => r.session === session) || searchResults[0] || {};

    // /ids result: { anilist, myanimelist }
    const ids = idsRes.status === "fulfilled" ? (idsRes.value.data || {}) : {};

    // /episodes result: [{ id, number, title, snapshot, session }]
    const epRaw = episodesRes.status === "fulfilled"
      ? (Array.isArray(episodesRes.value.data) ? episodesRes.value.data : [])
      : [];
    const totalEpisodes = epRaw.length;

    const title = meta.title
      || session.replace(/-[a-f0-9]+$/, "").replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());

    const animeData = {
      id: session,
      data_id: session,
      title,
      japanese_title: title,
      poster: meta.poster || "",
      type: meta.type || "TV",
      adultContent: false,
      animeInfo: {
        Overview: `Watch ${title} on AnimePahe. ${totalEpisodes} episode${totalEpisodes !== 1 ? "s" : ""} available.`,
        tvInfo: {
          rating: "PG-13",
          quality: "HD",
          sub: totalEpisodes || null,
          dub: null,
        },
        Genres: [],
        Status: "Airing",
        Studios: [],
        Duration: "24 min",
        Premiered: meta.year ? String(meta.year) : "",
        Synonyms: [],
        Japanese: title,
        Aired: meta.year ? String(meta.year) : "",
        Producers: [],
        MAL_ID: ids.myanimelist || null,
        AL_ID: ids.anilist || null,
      },
      related_data: [],
      recommended_data: [],
    };

    return { data: animeData, seasons: [] };
  } catch (error) {
    console.error("getAnimeInfo error:", error);
    return null;
  }
}
