import { GoogleGenAI } from "@google/genai";
import { Match, Player } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const CACHE_TTL = 15 * 60 * 1000; // 15 minutes for matches

async function fetchWithRetry(fn: () => Promise<any>, retries = 2, delay = 2000): Promise<any> {
  try {
    return await fn();
  } catch (e: any) {
    if (retries > 0 && (e.message?.includes('429') || e.status === 'RESOURCE_EXHAUSTED')) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(fn, retries - 1, delay * 2);
    }
    throw e;
  }
}

export async function getIPLMatches(): Promise<Match[]> {
  const cacheKey = 'ipl_matches_cache';
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    try {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_TTL) return data;
    } catch (e) {
      localStorage.removeItem(cacheKey);
    }
  }

  try {
    const response = await fetchWithRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Fetch the latest IPL 2026 match fixtures starting from April 1, 2026 from https://www.iplt20.com/fixtures. 
      Return ONLY a JSON array of objects. Each object MUST have:
      - id: string (the match ID from the URL, e.g., '2421')
      - team1: string (short name, e.g., 'LSG')
      - team2: string (short name, e.g., 'DC')
      - startTime: string (ISO 8601 format)
      - status: string ('upcoming', 'live', or 'completed')
      - score: string (if live or completed, e.g., '145/3 (16.2)')
      
      Current time is Wednesday, April 1, 2026, 14:55 UTC.`,
      config: {
        responseMimeType: "application/json",
        tools: [{ googleSearch: {} }]
      }
    }));

    const text = response.text.trim();
    const jsonStart = text.indexOf('[');
    const jsonEnd = text.lastIndexOf(']') + 1;
    if (jsonStart === -1 || jsonEnd === 0) throw new Error("No JSON array found in response");
    
    const jsonStr = text.substring(jsonStart, jsonEnd);
    const matches: Match[] = JSON.parse(jsonStr);
    
    localStorage.setItem(cacheKey, JSON.stringify({ data: matches, timestamp: Date.now() }));
    return matches;
  } catch (e) {
    console.error("Failed to fetch matches", e);
    // If we have stale cache, return it as fallback
    if (cached) {
      const { data } = JSON.parse(cached);
      return data;
    }
    return [];
  }
}

export async function getIPLPlayers(matchId: string, team1: string, team2: string): Promise<Player[]> {
  const cacheKey = `ipl_players_${matchId}`;
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < CACHE_TTL * 2) return data; // Players cache longer (10 mins)
  }

  try {
    const response = await fetchWithRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Fetch official player rosters for ${team1} and ${team2} from https://www.iplt20.com/match/2026/${matchId}. 
      Return ONLY a JSON array of 30 objects. Each object MUST have:
      - id: string (unique)
      - name: string (full name)
      - role: string ('BAT', 'BOWL', 'AR', or 'WK')
      - team: string (short name, e.g., '${team1}')
      - credits: number (between 8.0 and 10.5)
      - status: string ('playing', 'substitute', or 'unavailable')`,
      config: {
        responseMimeType: "application/json",
        tools: [{ urlContext: {} }]
      }
    }));

    const text = response.text.trim();
    const jsonStart = text.indexOf('[');
    const jsonEnd = text.lastIndexOf(']') + 1;
    if (jsonStart === -1 || jsonEnd === 0) throw new Error("No JSON array found in response");
    
    const jsonStr = text.substring(jsonStart, jsonEnd);
    const players: Player[] = JSON.parse(jsonStr);
    const result = players.map(p => ({ ...p, points: p.points || 0 }));
    
    localStorage.setItem(cacheKey, JSON.stringify({ data: result, timestamp: Date.now() }));
    return result;
  } catch (e) {
    console.error("Failed to fetch players", e);
    return [];
  }
}

export async function getLiveUpdate(match: Match): Promise<Partial<Match>> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Fetch the live score for https://www.iplt20.com/match/2026/${match.id}. 
      Return ONLY a JSON object with:
      - score: string (e.g., '145/3 (16.2)')
      - status: string ('live' or 'completed')
      - toss: string (e.g., '${match.team1} won the toss and chose to bat')
      - currentBatter: string (name of batter on strike)
      - currentBowler: string (name of bowler currently bowling)`,
      config: {
        responseMimeType: "application/json",
        tools: [{ urlContext: {} }]
      }
    });

    const text = response.text.trim();
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}') + 1;
    if (jsonStart === -1 || jsonEnd === 0) throw new Error("No JSON found in response");
    
    const jsonStr = text.substring(jsonStart, jsonEnd);
    const update: Partial<Match> = JSON.parse(jsonStr);
    return update;
  } catch (e) {
    console.error("Failed to fetch live update", e);
    return {};
  }
}
