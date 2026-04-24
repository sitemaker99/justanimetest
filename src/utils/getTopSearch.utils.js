/**
 * getTopSearch.utils.js — AnimePahe adapter
 */

import axios from "axios";

const getTopSearch = async () => {
  const api_url = import.meta.env.VITE_API_URL;
  try {
    const res = await axios.get(`${api_url}/search?q=one+piece`);
    return (res.data || []).slice(0, 10).map(a => ({
      id: a.session,
      title: a.title,
      poster: a.poster,
    }));
  } catch (err) {
    console.error("Error fetching top search:", err);
    return [];
  }
};

export default getTopSearch;
