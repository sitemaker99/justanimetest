/**
 * getStreamInfo.utils.js — AnimePahe adapter
 *
 * Flow:
 *  1. Look up the Kwik URL stored in sessionStorage by getServers
 *  2. Call POST /m3u8?url=<kwikUrl> to resolve Kwik → m3u8 + headers
 *  3. Build a proxied URL via VITE_PROXY_URL/m3u8-proxy
 *  4. Return a streamInfo-compatible object
 */

import axios from "axios";

export default async function getStreamInfo(animeId, episodeId, serverName, type) {
  const api_url = import.meta.env.VITE_API_URL;
  const proxy_base = (import.meta.env.VITE_PROXY_URL || "").replace(/\/$/, "");

  try {
    // Retrieve the Kwik URL cached by getServers
    const kwikUrl = sessionStorage.getItem(`pahe_kwik_${animeId}_${episodeId}_${serverName}`);
    if (!kwikUrl) {
      throw new Error(`No source URL found for "${serverName}". Try re-selecting the server.`);
    }

    // Resolve Kwik page → real m3u8 URL + required headers
    const res = await axios.get(`${api_url}/m3u8?url=${encodeURIComponent(kwikUrl)}`);
    const { m3u8, referer, headers: srcHeaders, proxy_url: serverProxyUrl } = res.data;

    if (!m3u8) throw new Error("API returned no m3u8 URL");

    // Build proxy URL using the frontend-configured VITE_PROXY_URL (preferred)
    // Falls back to the server-provided proxy_url if VITE_PROXY_URL is not set
    const headersJson = JSON.stringify(srcHeaders || { Referer: referer });
    const proxyUrl = proxy_base
      ? `${proxy_base}/m3u8-proxy?url=${encodeURIComponent(m3u8)}&headers=${encodeURIComponent(headersJson)}`
      : (serverProxyUrl || m3u8);

    return {
      streamingLink: [{ link: proxyUrl, iframe: null }],
      tracks: [],   // AnimePahe has no subtitle tracks
      intro: null,
      outro: null,
    };
  } catch (error) {
    console.error("getStreamInfo error:", error);
    return null;
  }
}
