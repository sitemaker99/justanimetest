/**
 * getServers.utils.js — AnimePahe adapter
 *
 * API: GET /sources?anime_session=<animeSession>&episode_session=<epSession>
 * Returns: [{ url, quality, fansub, audio }]
 *
 * Each source becomes a "server" in the UI.
 * We cache each source's Kwik URL in sessionStorage so getStreamInfo can use it.
 *
 * animeId  = AnimePahe anime session slug  (e.g. "naruto-0bc43e")
 * episodeId = episode number string         (e.g. "1")
 *
 * Episode sessions are cached by getEpisodes → useWatch into sessionStorage.
 */

import axios from "axios";

export default async function getServers(animeId, episodeId) {
  const api_url = import.meta.env.VITE_API_URL;
  try {
    // Get the AnimePahe episode session (stored by useWatch after fetching episodes)
    let epSession = sessionStorage.getItem(`pahe_ep_session_${animeId}_${episodeId}`);

    if (!epSession) {
      // Fallback: re-fetch episodes to find the session for this number
      const epRes = await axios.get(`${api_url}/episodes?session=${animeId}`);
      const eps = Array.isArray(epRes.data) ? epRes.data : [];
      const ep = eps.find(e => String(e.number) === String(episodeId));
      if (!ep?.session) throw new Error(`Episode ${episodeId} session not found`);
      epSession = ep.session;
      sessionStorage.setItem(`pahe_ep_session_${animeId}_${episodeId}`, epSession);
    }

    const res = await axios.get(
      `${api_url}/sources?anime_session=${encodeURIComponent(animeId)}&episode_session=${encodeURIComponent(epSession)}`
    );
    const sources = Array.isArray(res.data) ? res.data : [];

    if (sources.length === 0) return [];

    // Map each quality source to a server object the UI understands
    return sources.map((src, idx) => {
      const label = src.quality
        ? `${src.quality}${src.fansub ? ` [${src.fansub}]` : ""}`
        : `Source ${idx + 1}`;

      // Cache Kwik URL for getStreamInfo to look up
      sessionStorage.setItem(`pahe_kwik_${animeId}_${episodeId}_${label}`, src.url);

      return {
        serverName: label,
        data_id: idx,
        // AnimePahe audio field: "jpn" = sub, "eng" = dub, null = assume sub
        type: src.audio === "eng" ? "dub" : "sub",
        _kwikUrl: src.url,
      };
    });
  } catch (error) {
    console.error("getServers error:", error);
    return [];
  }
}
