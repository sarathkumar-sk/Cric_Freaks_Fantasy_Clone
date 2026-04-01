import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import * as cheerio from "cheerio";

const app = express();
const PORT = 3000;

// API Routes
app.get("/api/matches", async (req, res) => {
  try {
    const response = await fetch("https://www.iplt20.com/fixtures");
    const html = await response.text();
    const $ = cheerio.load(html);
    
    const matches: any[] = [];
    
    // Scrape logic for IPL fixtures
    // This is a simplified version, real scraping depends on current site structure
    $(".fixture-card-wrapper").each((i, el) => {
      const matchId = $(el).attr("data-match-id") || `m_${i}`;
      const team1 = $(el).find(".fixture-card__team-name").first().text().trim();
      const team2 = $(el).find(".fixture-card__team-name").last().text().trim();
      const startTime = $(el).find(".fixture-card__time").text().trim();
      const status = $(el).find(".fixture-card__status").text().trim().toLowerCase().includes("live") ? "live" : "upcoming";
      
      matches.push({
        id: matchId,
        team1: team1 || "TBD",
        team2: team2 || "TBD",
        startTime: new Date().toISOString(), // Fallback
        status: status,
        score: status === "live" ? "0/0 (0.0)" : ""
      });
    });

    // If scraping fails to find elements (site changed), return some default matches for 2026
    if (matches.length === 0) {
      matches.push(
        { id: "2421", team1: "LSG", team2: "DC", startTime: "2026-04-01T14:30:00Z", status: "live", score: "145/3 (16.2)" },
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
    // Mock live update for now, in real app we'd scrape the live scorecard
    res.json({
      score: "168/4 (18.4)",
      status: "live",
      toss: "LSG won the toss and chose to bat",
      currentBatter: "Nicholas Pooran",
      currentBowler: "Kuldeep Yadav"
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch live update" });
  }
});

// Vite middleware
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
