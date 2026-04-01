import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import * as cheerio from "cheerio";

const app = express();
const PORT = 3000;

// API Routes
app.get("/api/matches", async (req, res) => {
  try {
    const [fixturesRes, resultsRes] = await Promise.all([
      fetch("https://www.iplt20.com/fixtures"),
      fetch("https://www.iplt20.com/matches/results")
    ]);
    
    const fixturesHtml = await fixturesRes.text();
    const resultsHtml = await resultsRes.text();
    
    const $f = cheerio.load(fixturesHtml);
    const $r = cheerio.load(resultsHtml);
    
    const matches: any[] = [];
    
    // Scrape Results
    $r(".fixture-card-wrapper").each((i, el) => {
      const matchId = $r(el).attr("data-match-id") || `r_${i}`;
      const team1 = $r(el).find(".fixture-card__team-name").first().text().trim();
      const team2 = $r(el).find(".fixture-card__team-name").last().text().trim();
      const score1 = $r(el).find(".fixture-card__score").first().text().trim();
      const score2 = $r(el).find(".fixture-card__score").last().text().trim();
      const result = $r(el).find(".fixture-card__result").text().trim();
      
      matches.push({
        id: matchId,
        team1: team1 || "TBD",
        team2: team2 || "TBD",
        startTime: new Date(Date.now() - 86400000).toISOString(), // Yesterday
        status: "completed",
        score: `${score1} vs ${score2}`,
        result: result
      });
    });

    // Scrape Fixtures
    $f(".fixture-card-wrapper").each((i, el) => {
      const matchId = $f(el).attr("data-match-id") || `f_${i}`;
      const team1 = $f(el).find(".fixture-card__team-name").first().text().trim();
      const team2 = $f(el).find(".fixture-card__team-name").last().text().trim();
      const status = $f(el).find(".fixture-card__status").text().trim().toLowerCase();
      
      if (status.includes("live")) {
        matches.push({
          id: matchId,
          team1: team1 || "TBD",
          team2: team2 || "TBD",
          startTime: new Date().toISOString(),
          status: "live",
          score: "Fetching..."
        });
      } else {
        matches.push({
          id: matchId,
          team1: team1 || "TBD",
          team2: team2 || "TBD",
          startTime: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
          status: "upcoming"
        });
      }
    });

    // If scraping fails or returns empty, use updated mock data for April 1, 2026
    if (matches.length === 0) {
      matches.push(
        { 
          id: "2421", 
          team1: "LSG", 
          team2: "DC", 
          startTime: "2026-04-01T14:30:00Z", 
          status: "completed", 
          score: "141 (18.4) vs 145/4 (17.1)",
          result: "Delhi Capitals won by 6 wickets"
        },
        { id: "2422", team1: "RCB", team2: "MI", startTime: "2026-04-02T14:30:00Z", status: "upcoming" },
        { id: "2423", team1: "CSK", team2: "GT", startTime: "2026-04-03T14:30:00Z", status: "upcoming" }
      );
    }

    res.json(matches);
  } catch (error) {
    console.error("Scraping error:", error);
    res.status(500).json({ error: "Failed to fetch matches" });
  }
});

app.get("/api/players/:matchId", async (req, res) => {
  const { matchId } = req.params;
  try {
    // In a real app, we'd scrape the specific match page
    // For now, we'll return a robust list of players for the teams
    const players = [
      { id: "p1", name: "KL Rahul", role: "WK", team: "LSG", credits: 10.5, status: "playing", points: 0 },
      { id: "p2", name: "Rishabh Pant", role: "WK", team: "DC", credits: 10.0, status: "playing", points: 0 },
      { id: "p3", name: "Quinton de Kock", role: "BAT", team: "LSG", credits: 9.5, status: "playing", points: 0 },
      { id: "p4", name: "David Warner", role: "BAT", team: "DC", credits: 9.5, status: "playing", points: 0 },
      { id: "p5", name: "Marcus Stoinis", role: "AR", team: "LSG", credits: 9.0, status: "playing", points: 0 },
      { id: "p6", name: "Axar Patel", role: "AR", team: "DC", credits: 9.0, status: "playing", points: 0 },
      { id: "p7", name: "Ravi Bishnoi", role: "BOWL", team: "LSG", credits: 8.5, status: "playing", points: 0 },
      { id: "p8", name: "Kuldeep Yadav", role: "BOWL", team: "DC", credits: 8.5, status: "playing", points: 0 },
      { id: "p9", name: "Nicholas Pooran", role: "BAT", team: "LSG", credits: 9.0, status: "playing", points: 0 },
      { id: "p10", name: "Prithvi Shaw", role: "BAT", team: "DC", credits: 8.5, status: "playing", points: 0 },
      { id: "p11", name: "Krunal Pandya", role: "AR", team: "LSG", credits: 8.5, status: "playing", points: 0 },
      { id: "p12", name: "Mitchell Marsh", role: "AR", team: "DC", credits: 9.0, status: "playing", points: 0 },
      { id: "p13", name: "Avesh Khan", role: "BOWL", team: "LSG", credits: 8.5, status: "playing", points: 0 },
      { id: "p14", name: "Anrich Nortje", role: "BOWL", team: "DC", credits: 9.0, status: "playing", points: 0 },
      { id: "p15", name: "Ayush Badoni", role: "BAT", team: "LSG", credits: 8.0, status: "playing", points: 0 },
      { id: "p16", name: "Ishant Sharma", role: "BOWL", team: "DC", credits: 8.0, status: "playing", points: 0 },
      { id: "p17", name: "Deepak Hooda", role: "BAT", team: "LSG", credits: 8.5, status: "playing", points: 0 },
      { id: "p18", name: "Khaleel Ahmed", role: "BOWL", team: "DC", credits: 8.5, status: "playing", points: 0 },
      { id: "p19", name: "Mark Wood", role: "BOWL", team: "LSG", credits: 9.0, status: "playing", points: 0 },
      { id: "p20", name: "Lalit Yadav", role: "AR", team: "DC", credits: 8.0, status: "playing", points: 0 },
      { id: "p21", name: "Mohsin Khan", role: "BOWL", team: "LSG", credits: 8.0, status: "playing", points: 0 },
      { id: "p22", name: "Mukesh Kumar", role: "BOWL", team: "DC", credits: 8.0, status: "playing", points: 0 },
      { id: "p23", name: "Kyle Mayers", role: "AR", team: "LSG", credits: 8.5, status: "playing", points: 0 },
      { id: "p24", name: "Abishek Porel", role: "WK", team: "DC", credits: 7.5, status: "playing", points: 0 },
      { id: "p25", name: "Amit Mishra", role: "BOWL", team: "LSG", credits: 7.5, status: "playing", points: 0 },
      { id: "p26", name: "Yash Dhull", role: "BAT", team: "DC", credits: 7.5, status: "playing", points: 0 },
      { id: "p27", name: "Naveen-ul-Haq", role: "BOWL", team: "LSG", credits: 8.5, status: "playing", points: 0 },
      { id: "p28", name: "Jhye Richardson", role: "BOWL", team: "DC", credits: 8.5, status: "playing", points: 0 },
      { id: "p29", name: "Devdutt Padikkal", role: "BAT", team: "LSG", credits: 8.5, status: "playing", points: 0 },
      { id: "p30", name: "Shai Hope", role: "WK", team: "DC", credits: 8.5, status: "playing", points: 0 }
    ];
    res.json(players);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch players" });
  }
});

app.get("/api/live/:matchId", async (req, res) => {
  const { matchId } = req.params;
  try {
    // If it's our mock match ID for today
    if (matchId === "2421") {
      return res.json({
        score: "141 (18.4) vs 145/4 (17.1)",
        status: "completed",
        toss: "Delhi Capitals won the toss and chose to bowl",
        result: "Delhi Capitals won by 6 wickets",
        currentBatter: "Match Ended",
        currentBowler: "Match Ended"
      });
    }

    // Otherwise return a generic live update or scrape if possible
    res.json({
      score: "168/4 (18.4)",
      status: "live",
      toss: "Toss info fetching...",
      currentBatter: "Batter on strike",
      currentBowler: "Bowler currently bowling"
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch live update" });
  }
});

// Vite middleware for local development only
if (process.env.NODE_ENV !== "production") {
  async function startDevServer() {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
  startDevServer();
}

export default app;
