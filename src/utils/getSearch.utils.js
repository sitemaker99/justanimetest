/**
 * getSearch.utils.js — AnimePahe adapter
 * API: GET /search?q=<keyword>
 * Returns: [{ id, title, url, year, poster, type, session }]
 */
import axios from "axios";

const getSearch = async (keyword, page = 1) => {
  const api_url = import.meta.env.VITE_API_URL;
  try {
    const res = await axios.get(`${api_url}/search?q=${encodeURIComponent(keyword)}`);
    const results = Array.isArray(res.data) ? res.data : [];

    const animes = results.map(a => ({
      id: a.session,
      data_id: a.session,
      title: a.title,
      japanese_title: a.title,
      poster: a.poster || "",
      type: a.type || "TV",
      episodes: { sub: null, dub: null },
      rating: "PG-13",
      duration: "24m",
    }));

    // Client-side pagination (API returns all at once)
    const perPage = 20;
    const start = (page - 1) * perPage;

    return {
      animes: animes.slice(start, start + perPage),
      currentPage: page,
      totalPages: Math.ceil(animes.length / perPage) || 1,
      hasNextPage: start + perPage < animes.length,
    };
  } catch (err) {
    console.error("getSearch error:", err);
    return { animes: [], currentPage: 1, totalPages: 1, hasNextPage: false };
  }
};

export default getSearch;
