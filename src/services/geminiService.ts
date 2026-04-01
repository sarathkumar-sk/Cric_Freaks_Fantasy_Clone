import { Match, Player } from "../types";

export async function getIPLMatches(): Promise<Match[]> {
  try {
    const response = await fetch("/api/matches");
    if (!response.ok) throw new Error("Failed to fetch matches");
    return await response.json();
  } catch (e) {
    console.error("Failed to fetch matches", e);
    // Fallback to local storage if available
    const cached = localStorage.getItem('ipl_matches_cache');
    if (cached) {
      const { data } = JSON.parse(cached);
      return data;
    }
    return [];
  }
}

export async function getIPLPlayers(matchId: string, team1: string, team2: string): Promise<Player[]> {
  try {
    const response = await fetch(`/api/players/${matchId}`);
    if (!response.ok) throw new Error("Failed to fetch players");
    return await response.json();
  } catch (e) {
    console.error("Failed to fetch players", e);
    const cached = localStorage.getItem(`ipl_players_${matchId}`);
    if (cached) {
      const { data } = JSON.parse(cached);
      return data;
    }
    return [];
  }
}

export async function getLiveUpdate(match: Match): Promise<Partial<Match>> {
  try {
    const response = await fetch(`/api/live/${match.id}`);
    if (!response.ok) throw new Error("Failed to fetch live update");
    return await response.json();
  } catch (e) {
    console.error("Failed to fetch live update", e);
    return {};
  }
}
