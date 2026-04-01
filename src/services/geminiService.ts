import { Match, Player } from "../types";
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function getIPLMatches(): Promise<Match[]> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Extract the latest IPL 2026 match fixtures (upcoming, live, or completed) from https://www.cricbuzz.com/cricket-match/live-scores and https://www.cricbuzz.com/cricket-series/9426/indian-premier-league-2026/matches. Include team names, start time (ISO 8601 format), status, and current score/result if available.",
      config: {
        tools: [{ urlContext: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              team1: { type: Type.STRING },
              team2: { type: Type.STRING },
              startTime: { type: Type.STRING, description: "ISO 8601 format" },
              status: { 
                type: Type.STRING, 
                enum: ["upcoming", "live", "completed"] 
              },
              score: { type: Type.STRING },
              result: { type: Type.STRING }
            },
            required: ["id", "team1", "team2", "startTime", "status"]
          }
        }
      }
    });

    const matches = JSON.parse(response.text || "[]");
    if (matches.length > 0) {
      localStorage.setItem('ipl_matches_cache', JSON.stringify({ data: matches, timestamp: Date.now() }));
      return matches;
    }
    
    // Fallback if Gemini fails
    const cached = localStorage.getItem('ipl_matches_cache');
    if (cached) {
      const { data } = JSON.parse(cached);
      return data;
    }
    return [];
  } catch (e) {
    console.error("Failed to fetch matches with Gemini", e);
    // Fallback to backend if Gemini fails
    try {
      const response = await fetch("/api/matches");
      if (!response.ok) throw new Error("Failed to fetch matches from API");
      return await response.json();
    } catch (apiError) {
      console.error("Failed to fetch matches from API", apiError);
      const cached = localStorage.getItem('ipl_matches_cache');
      if (cached) {
        const { data } = JSON.parse(cached);
        return data;
      }
      return [];
    }
  }
}

export async function getIPLPlayers(matchId: string, team1: string, team2: string): Promise<Player[]> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Extract the full player rosters for ${team1} and ${team2} from https://www.cricbuzz.com/cricket-match-squads/${matchId}. For each player, include their name, role (WK, BAT, BOWL, or AR), team name, and a fantasy credit value (between 7.0 and 12.0).`,
      config: {
        tools: [{ urlContext: {} }],
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
      localStorage.setItem(`ipl_players_${matchId}`, JSON.stringify({ data: players, timestamp: Date.now() }));
      return players;
    }

    const cached = localStorage.getItem(`ipl_players_${matchId}`);
    if (cached) {
      const { data } = JSON.parse(cached);
      return data;
    }
    return [];
  } catch (e) {
    console.error("Failed to fetch players with Gemini", e);
    try {
      const response = await fetch(`/api/players/${matchId}`);
      if (!response.ok) throw new Error("Failed to fetch players from API");
      return await response.json();
    } catch (apiError) {
      console.error("Failed to fetch players from API", apiError);
      const cached = localStorage.getItem(`ipl_players_${matchId}`);
      if (cached) {
        const { data } = JSON.parse(cached);
        return data;
      }
      return [];
    }
  }
}

export async function getLiveUpdate(match: Match): Promise<Partial<Match>> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Get the latest live score and match status for ${match.team1} vs ${match.team2} from https://www.cricbuzz.com/live-cricket-scores/${match.id}. Include current score, status, result, current batter, and current bowler.`,
      config: {
        tools: [{ urlContext: {} }],
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

    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("Failed to fetch live update with Gemini", e);
    try {
      const response = await fetch(`/api/live/${match.id}`);
      if (!response.ok) throw new Error("Failed to fetch live update from API");
      return await response.json();
    } catch (apiError) {
      console.error("Failed to fetch live update from API", apiError);
      return {};
    }
  }
}
