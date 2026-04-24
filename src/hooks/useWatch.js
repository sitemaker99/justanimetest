/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
/**
 * useWatch.js — AnimePahe-aware version
 *
 * Key differences from the original HiAnime version:
 * 1. Episode IDs are "animeSession?ep=<number>" — we extract the number.
 * 2. After loading episodes we cache each episode's AnimePahe session in
 *    sessionStorage so getServers / getStreamInfo can retrieve it.
 * 3. "Servers" are quality variants (1080p, 720p…).  Each server object
 *    carries a _kwikUrl.  We cache those in sessionStorage so getStreamInfo
 *    can look them up by (animeId, episodeId, serverName).
 * 4. Stream info is built from the /m3u8 endpoint + VITE_PROXY_URL.
 */

import { useState, useEffect, useRef } from "react";
import getAnimeInfo from "@/src/utils/getAnimeInfo.utils";
import getEpisodes from "@/src/utils/getEpisodes.utils";
import getNextEpisodeSchedule from "../utils/getNextEpisodeSchedule.utils";
import getServers from "../utils/getServers.utils";
import getStreamInfo from "../utils/getStreamInfo.utils";

export const useWatch = (animeId, initialEpisodeId) => {
  const [error, setError] = useState(null);
  const [buffering, setBuffering] = useState(true);
  const [streamInfo, setStreamInfo] = useState(null);
  const [animeInfo, setAnimeInfo] = useState(null);
  const [episodes, setEpisodes] = useState(null);
  const [animeInfoLoading, setAnimeInfoLoading] = useState(false);
  const [totalEpisodes, setTotalEpisodes] = useState(null);
  const [seasons, setSeasons] = useState(null);
  const [servers, setServers] = useState(null);
  const [streamUrl, setStreamUrl] = useState(null);
  const [isFullOverview, setIsFullOverview] = useState(false);
  const [subtitles, setSubtitles] = useState([]);
  const [thumbnail, setThumbnail] = useState(null);
  const [intro, setIntro] = useState(null);
  const [outro, setOutro] = useState(null);
  const [episodeId, setEpisodeId] = useState(null);
  const [activeEpisodeNum, setActiveEpisodeNum] = useState(null);
  const [activeServerId, setActiveServerId] = useState(null);
  const [activeServerType, setActiveServerType] = useState(null);
  const [activeServerName, setActiveServerName] = useState(null);
  const [serverLoading, setServerLoading] = useState(true);
  const [nextEpisodeSchedule, setNextEpisodeSchedule] = useState(null);
  const isServerFetchInProgress = useRef(false);
  const isStreamFetchInProgress = useRef(false);

  // ── Reset on anime change ──────────────────────────────────────────────────
  useEffect(() => {
    setEpisodes(null);
    setEpisodeId(null);
    setActiveEpisodeNum(null);
    setServers(null);
    setActiveServerId(null);
    setStreamInfo(null);
    setStreamUrl(null);
    setSubtitles([]);
    setThumbnail(null);
    setIntro(null);
    setOutro(null);
    setBuffering(true);
    setServerLoading(true);
    setError(null);
    setAnimeInfo(null);
    setSeasons(null);
    setTotalEpisodes(null);
    setAnimeInfoLoading(true);
    isServerFetchInProgress.current = false;
    isStreamFetchInProgress.current = false;
  }, [animeId]);

  // ── Fetch anime info + episodes ────────────────────────────────────────────
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setAnimeInfoLoading(true);
        const [animeData, episodesData] = await Promise.all([
          getAnimeInfo(animeId, false),
          getEpisodes(animeId),
        ]);

        setAnimeInfo(animeData?.data);
        setSeasons(animeData?.seasons);

        const eps = episodesData?.episodes || [];
        setEpisodes(eps);
        setTotalEpisodes(episodesData?.totalEpisodes || 0);

        // Cache each episode's AnimePahe session so getServers can use it
        eps.forEach(ep => {
          const num = ep.id.match(/ep=(\d+)/)?.[1];
          if (num && ep._paheSession) {
            sessionStorage.setItem(`pahe_ep_session_${animeId}_${num}`, ep._paheSession);
          }
        });

        const newEpisodeId =
          initialEpisodeId ||
          (eps.length > 0 ? eps[0].id.match(/ep=(\d+)/)?.[1] : null);
        setEpisodeId(newEpisodeId);
      } catch (err) {
        console.error("Error fetching initial data:", err);
        setError(err.message || "An error occurred.");
      } finally {
        setAnimeInfoLoading(false);
      }
    };
    fetchInitialData();
  }, [animeId]);

  // ── Next episode schedule (stub for AnimePahe) ─────────────────────────────
  useEffect(() => {
    const fetchNextEpisodeSchedule = async () => {
      try {
        const data = await getNextEpisodeSchedule(animeId);
        setNextEpisodeSchedule(data);
      } catch (err) {
        console.error("Error fetching next episode schedule:", err);
      }
    };
    fetchNextEpisodeSchedule();
  }, [animeId]);

  // ── Sync active episode number ─────────────────────────────────────────────
  useEffect(() => {
    if (!episodes || !episodeId) { setActiveEpisodeNum(null); return; }
    const activeEp = episodes.find(ep => ep.id.match(/ep=(\d+)/)?.[1] === episodeId);
    const num = activeEp?.episode_no ?? null;
    if (activeEpisodeNum !== num) setActiveEpisodeNum(num);
  }, [episodeId, episodes]);

  // ── Fetch servers (quality variants) ──────────────────────────────────────
  useEffect(() => {
    if (!episodeId || !episodes || isServerFetchInProgress.current) return;

    let mounted = true;
    isServerFetchInProgress.current = true;
    setServerLoading(true);

    const fetchServers = async () => {
      try {
        const serversList = await getServers(animeId, episodeId);

        if (!mounted) return;

        // Cache kwik URLs by serverName so getStreamInfo can look them up
        serversList.forEach(s => {
          if (s._kwikUrl) {
            sessionStorage.setItem(
              `pahe_kwik_${animeId}_${episodeId}_${s.serverName}`,
              s._kwikUrl
            );
          }
        });

        // Prefer highest quality (first in the sorted list from API)
        const initialServer = serversList[0] || null;

        setServers(serversList);
        setActiveServerType(initialServer?.type || null);
        setActiveServerName(initialServer?.serverName || null);
        setActiveServerId(initialServer?.data_id ?? null);
      } catch (err) {
        console.error("Error fetching servers:", err);
        if (mounted) setError(err.message || "An error occurred.");
      } finally {
        if (mounted) {
          setServerLoading(false);
          isServerFetchInProgress.current = false;
        }
      }
    };

    fetchServers();

    return () => {
      mounted = false;
      isServerFetchInProgress.current = false;
    };
  }, [episodeId, episodes]);

  // ── Sync serverName when serverId changes ──────────────────────────────────
  useEffect(() => {
    if (!servers || activeServerId == null) return;
    const activeServer = servers.find(s => s.data_id === activeServerId);
    if (activeServer) {
      setActiveServerName(activeServer.serverName);
      setActiveServerType(activeServer.type);
    }
  }, [activeServerId, servers]);

  // ── Fetch stream info ──────────────────────────────────────────────────────
  useEffect(() => {
    if (
      !episodeId ||
      activeServerId == null ||
      !servers ||
      isServerFetchInProgress.current ||
      isStreamFetchInProgress.current
    ) return;

    const fetchStreamInfo = async () => {
      isStreamFetchInProgress.current = true;
      setBuffering(true);
      try {
        const server = servers.find(s => s.data_id === activeServerId);
        if (!server) throw new Error("No matching server found.");

        const data = await getStreamInfo(
          animeId,
          episodeId,
          server.serverName,
          server.type
        );

        setStreamInfo(data);
        setStreamUrl(data?.streamingLink?.[0]?.link || null);
        setIntro(data?.intro || null);
        setOutro(data?.outro || null);
        setSubtitles(
          (data?.tracks || [])
            .filter(t => t.kind === "captions")
            .map(({ file, label, default: isDefault }) => ({ file, label, default: isDefault }))
        );
        const thumbTrack = (data?.tracks || []).find(t => t.kind === "thumbnails" && t.file);
        if (thumbTrack) setThumbnail(thumbTrack.file);
      } catch (err) {
        console.error("Error fetching stream info:", err);
        setError(err.message || "An error occurred.");
        setStreamUrl(null);
        setStreamInfo(null);
      } finally {
        setBuffering(false);
        isStreamFetchInProgress.current = false;
      }
    };

    fetchStreamInfo();
  }, [episodeId, activeServerId, servers]);

  return {
    error,
    buffering,
    serverLoading,
    streamInfo,
    animeInfo,
    episodes,
    nextEpisodeSchedule,
    animeInfoLoading,
    totalEpisodes,
    seasons,
    servers,
    streamUrl,
    isFullOverview,
    setIsFullOverview,
    subtitles,
    thumbnail,
    intro,
    outro,
    episodeId,
    setEpisodeId,
    activeEpisodeNum,
    setActiveEpisodeNum,
    activeServerId,
    setActiveServerId,
    activeServerType,
    setActiveServerType,
    activeServerName,
    setActiveServerName,
  };
};
