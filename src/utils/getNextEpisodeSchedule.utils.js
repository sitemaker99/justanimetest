/**
 * getNextEpisodeSchedule.utils.js — AnimePahe adapter
 * AnimePahe has no next-episode schedule endpoint — return null.
 */

export default async function getNextEpisodeSchedule(animeId) {
  return { nextEpisodeSchedule: null };
}
