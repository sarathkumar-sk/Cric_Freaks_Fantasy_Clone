import { Match, Player } from "../types";

export async function getIPLMatches(): Promise<Match[]> {
  const CACHE_KEY = 'ipl_matches_cache';
  const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DURATION) {
        return data;
      }
    }

    const response = await fetch("/api/matches");
    if (!response.ok) throw new Error("Failed to fetch matches from API");
    const data = await response.json();
    
    if (data && data.length > 0) {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
      return data;
    }
    
    if (cached) {
      const { data } = JSON.parse(cached);
      return data;
    }
    return [];
  } catch (e) {
    console.error("Failed to fetch matches from API", e);
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { data } = JSON.parse(cached);
      return data;
    }
    return [];
  }
}

export async function getIPLPlayers(matchId: string, team1: string, team2: string): Promise<Player[]> {
  const CACHE_KEY = `ipl_players_${matchId}`;
  const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DURATION) {
        return data;
      }
    }

    const response = await fetch(`/api/players/${matchId}`);
    if (!response.ok) throw new Error("Failed to fetch players from API");
    const data = await response.json();
    
    if (data && data.length > 0) {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
      return data;
    }

    if (cached) {
      const { data } = JSON.parse(cached);
      return data;
    }
    return [];
  } catch (e) {
    console.error("Failed to fetch players from API", e);
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { data } = JSON.parse(cached);
      return data;
    }
    return [];
  }
}

export async function getLiveUpdate(match: Match): Promise<Partial<Match>> {
  const CACHE_KEY = `live_update_${match.id}`;
  const CACHE_DURATION = 30 * 1000; // 30 seconds

  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DURATION) {
        return data;
      }
    }

    const response = await fetch(`/api/live/${match.id}`);
    if (!response.ok) throw new Error("Failed to fetch live update from API");
    const data = await response.json();
    
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
    return data;
  } catch (e) {
    console.error("Failed to fetch live update from API", e);
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { data } = JSON.parse(cached);
      return data;
    }
    return {};
  }
}
