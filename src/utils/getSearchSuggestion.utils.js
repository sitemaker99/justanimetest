/**
 * getSearchSuggestion.utils.js — AnimePahe adapter
 * API: GET /search?q=<keyword>
 * Returns first 8 results formatted for the suggestion dropdown.
 */
import axios from "axios";

const getSearchSuggestion = async (keyword) => {
  const api_url = import.meta.env.VITE_API_URL;
  try {
    const res = await axios.get(`${api_url}/search?q=${encodeURIComponent(keyword)}`);
    const results = Array.isArray(res.data) ? res.data : [];
    return results.slice(0, 8).map(a => ({
      id: a.session,
      title: a.title,
      poster: a.poster || "",
      type: a.type || "TV",
    }));
  } catch (err) {
    console.error("getSearchSuggestion error:", err);
    return [];
  }
};

export default getSearchSuggestion;
