/**
 * getEpisodes.utils.js — AnimePahe adapter
 *
 * API: GET /episodes?session=<animeSession>
 * Returns: [{ id, number, title, snapshot, session }]
 *
 * The UI expects episodes with:
 *   id         — string parseable by /ep=(\d+)/ regex
 *   episode_no — numeric episode number
 *   title      — episode title
 *   poster     — thumbnail image URL
 *
 * We also cache each episode's AnimePahe session in sessionStorage
 * so getServers can use it without re-fetching.
 */

import axios from "axios";

export default async function getEpisodes(animeSession) {
  const api_url = import.meta.env.VITE_API_URL;
  try {
    const res = await axios.get(`${api_url}/episodes?session=${encodeURIComponent(animeSession)}`);
    const raw = Array.isArray(res.data) ? res.data : [];

    const episodes = raw.map(ep => {
      // Cache episode session so getServers doesn't need to re-fetch
      if (ep.session) {
        sessionStorage.setItem(
          `pahe_ep_session_${animeSession}_${ep.number}`,
          ep.session
        );
      }

      return {
        // id must be parseable by /ep=(\d+)/ — used throughout the codebase
        id: `${animeSession}?ep=${ep.number}`,
        episode_no: ep.number,
        title: ep.title || `Episode ${ep.number}`,
        poster: ep.snapshot || null,
        _paheSession: ep.session,
      };
    });

    return { episodes, totalEpisodes: episodes.length };
  } catch (error) {
    console.error("getEpisodes error:", error);
    return { episodes: [], totalEpisodes: 0 };
  }
}
