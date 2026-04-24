/**
 * getCategoryInfo.utils.js — AnimePahe adapter
 *
 * AnimePahe has no category/genre browsing endpoint.
 * We treat the category path as a search keyword as a best-effort fallback.
 */

import axios from "axios";

const getCategoryInfo = async (path, page = 1) => {
  const api_url = import.meta.env.VITE_API_URL;
  // Convert path like "action" or "top-airing" to a search term
  const keyword = path.replace(/-/g, " ");
  try {
    const response = await axios.get(`${api_url}/search?q=${encodeURIComponent(keyword)}`);
    const results = response.data || [];

    const animes = results.map(a => ({
      id: a.session,
      data_id: a.session,
      title: a.title,
      japanese_title: a.title,
      poster: a.poster,
      type: a.type || "TV",
      episodes: { sub: null, dub: null },
    }));

    const perPage = 20;
    const start = (page - 1) * perPage;

    return {
      animes: animes.slice(start, start + perPage),
      currentPage: page,
      totalPages: Math.ceil(animes.length / perPage),
      hasNextPage: start + perPage < animes.length,
      category: keyword,
    };
  } catch (err) {
    console.error("Error fetching category info:", err);
    return { animes: [], currentPage: 1, totalPages: 1, hasNextPage: false };
  }
};

export default getCategoryInfo;
