/**
 * getQtip.utils.js — AnimePahe adapter
 * Quick-info tooltip on hover. We use the search result metadata.
 */

import axios from "axios";

const getQtip = async (id) => {
  const api_url = import.meta.env.VITE_API_URL;
  try {
    const res = await axios.get(`${api_url}/search?q=${encodeURIComponent(id.replace(/-/g, " "))}`);
    const results = res.data || [];
    const meta = results.find(r => r.session === id) || results[0];
    if (!meta) return null;
    return {
      id: meta.session,
      title: meta.title,
      poster: meta.poster,
      type: meta.type || "TV",
      episodes: { sub: null, dub: null },
      rating: "PG-13",
      duration: "24m",
      description: `Watch ${meta.title} on AnimePahe`,
      genres: [],
    };
  } catch (err) {
    console.error("Qtip error:", err);
    return null;
  }
};

export default getQtip;
