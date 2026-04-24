/**
 * getHomeInfo.utils.js — AnimePahe adapter
 *
 * AnimePahe has no home-page endpoint, so we synthesise one by fetching
 * several popular titles in parallel. Results are cached for 2 hours.
 *
 * API: GET /search?q=<query>  → [{ id, title, url, year, poster, type, session }]
 */
import axios from "axios";

const CACHE_KEY = "homeInfoCache_pahe";
const CACHE_DURATION = 2 * 60 * 60 * 1000; // 2 hours

const FEATURED_TITLES = [
  "One Piece", "Jujutsu Kaisen", "Demon Slayer", "Attack on Titan",
  "Naruto Shippuden", "Dragon Ball Super", "Bleach", "My Hero Academia",
];

function mapAnime(a, idx) {
  return {
    id: a.session,
    data_id: a.session,
    title: a.title,
    japanese_title: a.title,
    poster: a.poster || "",
    type: a.type || "TV",
    duration: "24m",
    rating: "PG-13",
    episodes: { sub: null, dub: null },
    rank: idx + 1,
  };
}

export default async function getHomeInfo() {
  const api_url = import.meta.env.VITE_API_URL;
  const currentTime = Date.now();

  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
    if (cached && currentTime - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }
  } catch { /* ignore parse errors */ }

  try {
    // Fetch 4 titles concurrently
    const searches = await Promise.allSettled(
      FEATURED_TITLES.slice(0, 4).map(t =>
        axios.get(`${api_url}/search?q=${encodeURIComponent(t)}`).then(r =>
          Array.isArray(r.data) ? r.data : []
        )
      )
    );

    // Merge and deduplicate by session
    const seen = new Set();
    const all = searches
      .filter(r => r.status === "fulfilled")
      .flatMap(r => r.value)
      .filter(a => {
        if (!a.session || seen.has(a.session)) return false;
        seen.add(a.session);
        return true;
      });

    const spotlights = all.slice(0, 5).map((a, i) => ({
      ...mapAnime(a, i),
      description: `Watch ${a.title} on AnimePahe`,
      banner: a.poster || "",
    }));

    const trending     = all.slice(0, 10).map(mapAnime);
    const latest_ep    = all.slice(5, 20).map(mapAnime);
    const top_airing   = all.slice(0, 8).map(mapAnime);
    const most_popular = all.slice(0, 8).map(mapAnime);

    const data = {
      spotlights,
      trending,
      topten: { today: trending, week: trending, month: trending },
      todaySchedule: [],
      top_airing,
      most_popular,
      most_favorite: most_popular,
      latest_completed: [],
      latest_episode: latest_ep,
      top_upcoming: [],
      recently_added: latest_ep,
      genres: [
        "Action","Adventure","Comedy","Drama","Fantasy",
        "Horror","Mystery","Romance","Sci-Fi","Slice of Life",
        "Sports","Supernatural","Thriller",
      ],
    };

    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: currentTime }));
    return data;
  } catch (error) {
    console.error("getHomeInfo error:", error);
    return null;
  }
}
