import { Match, Player } from "../types";
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function getIPLMatches(): Promise<Match[]> {
  try {
    // Try backend API first to save Gemini quota
    // The backend now handles scraping and fallbacks to mock data internally
    const response = await fetch("/api/matches");
    if (response.ok) {
      const data = await response.json();
      if (data && data.length > 0) {
        return data;
      }
    }
    return [];
  } catch (e) {
    console.error("Failed to fetch matches", e);
    return [];
  }
}

export async function getIPLPlayers(matchId: string, team1: string, team2: string, isLiveOrCompleted = false): Promise<Player[]> {
  const CACHE_KEY = `ipl_players_${matchId}_v3`;
  const CACHE_DURATION = isLiveOrCompleted ? 2 * 60 * 1000 : 48 * 60 * 60 * 1000; // 2 mins for live, 48 hours for upcoming

  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DURATION) {
        return data;
      }
    }

    // Try backend API first as it now handles points merging
    try {
      const response = await fetch(`/api/players/${matchId}`);
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
          return data;
        }
      }
    } catch (apiError) {
      console.warn("API player fetch failed", apiError);
    }

    // Fallback to Gemini if API fails
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Find and extract the full player rosters for ${team1} and ${team2} from Cricbuzz for match ID ${matchId}. For each player, include their name, role (WK, BAT, BOWL, or AR), team name, and a fantasy credit value (between 7.0 and 12.0).`,
        config: {
          tools: [{ googleSearch: {} }, { urlContext: {} }],
          toolConfig: { includeServerSideToolInvocations: true },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                name: { type: Type.STRING },
                role: { type: Type.STRING, enum: ["WK", "BAT", "BOWL", "AR"] },
                team: { type: Type.STRING },
                credits: { type: Type.NUMBER },
                status: { type: Type.STRING, enum: ["playing", "substitute", "unavailable"] },
                points: { type: Type.NUMBER }
              },
              required: ["id", "name", "role", "team", "credits"]
            }
          }
        }
      });

      const players = JSON.parse(response.text || "[]");
      if (players.length > 0) {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ data: players, timestamp: Date.now() }));
        return players;
      }
    } catch (geminiError) {
      console.warn("Gemini player fetch failed", geminiError);
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
    console.error("Failed to fetch players", e);
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { data } = JSON.parse(cached);
      return data;
    }
    return [];
  }
}

export async function getLiveUpdate(match: Match): Promise<Partial<Match>> {
  const CACHE_KEY = `live_update_${match.id}_v2`;
  const CACHE_DURATION = 60 * 1000; // 1 minute for live updates (to minimize Gemini)

  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DURATION) {
        return data;
      }
    }

    // For live updates, we can try API first as it's faster and uses no Gemini quota
    try {
      const response = await fetch(`/api/live/${match.id}`);
      if (response.ok) {
        const data = await response.json();
        if (data && data.score) {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
          return data;
        }
      }
    } catch (apiError) {
      console.warn("API live update failed", apiError);
    }

    // Only use Gemini if API fails or returns no score
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Get the latest live score and match status for ${match.team1} vs ${match.team2} from Cricbuzz for match ID ${match.id}. Include current score, status, result, current batter, and current bowler.`,
        config: {
          tools: [{ googleSearch: {} }, { urlContext: {} }],
          toolConfig: { includeServerSideToolInvocations: true },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.STRING },
              status: { type: Type.STRING, enum: ["upcoming", "live", "completed"] },
              result: { type: Type.STRING },
              toss: { type: Type.STRING },
              currentBatter: { type: Type.STRING },
              currentBowler: { type: Type.STRING }
            }
          }
        }
      });

      const data = JSON.parse(response.text || "{}");
      localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
      return data;
    } catch (geminiError) {
      console.warn("Gemini live update failed", geminiError);
    }
    
    if (cached) {
      const { data } = JSON.parse(cached);
      return data;
    }
    return {};
  } catch (e) {
    console.error("Failed to fetch live update", e);
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { data } = JSON.parse(cached);
      return data;
    }
    return {};
  }
}
