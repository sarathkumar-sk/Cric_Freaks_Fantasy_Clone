import express from "express";
import path from "path";
import * as cheerio from "cheerio";

const app = express();
const PORT = 3000;

// Mock Player Data for different teams
const TEAM_PLAYERS: Record<string, any[]> = {
  "LSG": [
    { id: "lsg1", name: "KL Rahul", role: "WK", team: "LSG", credits: 10.5, status: "playing", points: 0 },
    { id: "lsg2", name: "Quinton de Kock", role: "BAT", team: "LSG", credits: 9.5, status: "playing", points: 0 },
    { id: "lsg3", name: "Marcus Stoinis", role: "AR", team: "LSG", credits: 9.0, status: "playing", points: 0 },
    { id: "lsg4", name: "Nicholas Pooran", role: "BAT", team: "LSG", credits: 9.0, status: "playing", points: 0 },
    { id: "lsg5", name: "Ravi Bishnoi", role: "BOWL", team: "LSG", credits: 8.5, status: "playing", points: 0 },
    { id: "lsg6", name: "Krunal Pandya", role: "AR", team: "LSG", credits: 8.5, status: "playing", points: 0 },
    { id: "lsg7", name: "Avesh Khan", role: "BOWL", team: "LSG", credits: 8.5, status: "playing", points: 0 },
    { id: "lsg8", name: "Ayush Badoni", role: "BAT", team: "LSG", credits: 8.0, status: "playing", points: 0 },
    { id: "lsg9", name: "Deepak Hooda", role: "BAT", team: "LSG", credits: 8.5, status: "playing", points: 0 },
    { id: "lsg10", name: "Mark Wood", role: "BOWL", team: "LSG", credits: 9.0, status: "playing", points: 0 },
    { id: "lsg11", name: "Mohsin Khan", role: "BOWL", team: "LSG", credits: 8.0, status: "playing", points: 0 }
  ],
  "DC": [
    { id: "dc1", name: "Rishabh Pant", role: "WK", team: "DC", credits: 10.0, status: "playing", points: 0 },
    { id: "dc2", name: "David Warner", role: "BAT", team: "DC", credits: 9.5, status: "playing", points: 0 },
    { id: "dc3", name: "Axar Patel", role: "AR", team: "DC", credits: 9.0, status: "playing", points: 0 },
    { id: "dc4", name: "Kuldeep Yadav", role: "BOWL", team: "DC", credits: 8.5, status: "playing", points: 0 },
    { id: "dc5", name: "Prithvi Shaw", role: "BAT", team: "DC", credits: 8.5, status: "playing", points: 0 },
    { id: "dc6", name: "Mitchell Marsh", role: "AR", team: "DC", credits: 9.0, status: "playing", points: 0 },
    { id: "dc7", name: "Anrich Nortje", role: "BOWL", team: "DC", credits: 9.0, status: "playing", points: 0 },
    { id: "dc8", name: "Ishant Sharma", role: "BOWL", team: "DC", credits: 8.0, status: "playing", points: 0 },
    { id: "dc9", name: "Khaleel Ahmed", role: "BOWL", team: "DC", credits: 8.5, status: "playing", points: 0 },
    { id: "dc10", name: "Lalit Yadav", role: "AR", team: "DC", credits: 8.0, status: "playing", points: 0 },
    { id: "dc11", name: "Mukesh Kumar", role: "BOWL", team: "DC", credits: 8.0, status: "playing", points: 0 }
  ],
  "RCB": [
    { id: "rcb1", name: "Virat Kohli", role: "BAT", team: "RCB", credits: 11.0, status: "playing", points: 0 },
    { id: "rcb2", name: "Faf du Plessis", role: "BAT", team: "RCB", credits: 10.0, status: "playing", points: 0 },
    { id: "rcb3", name: "Glenn Maxwell", role: "AR", team: "RCB", credits: 10.0, status: "playing", points: 0 },
    { id: "rcb4", name: "Mohammed Siraj", role: "BOWL", team: "RCB", credits: 9.0, status: "playing", points: 0 },
    { id: "rcb5", name: "Dinesh Karthik", role: "WK", team: "RCB", credits: 8.5, status: "playing", points: 0 },
    { id: "rcb6", name: "Cameron Green", role: "AR", team: "RCB", credits: 9.5, status: "playing", points: 0 },
    { id: "rcb7", name: "Rajat Patidar", role: "BAT", team: "RCB", credits: 8.5, status: "playing", points: 0 },
    { id: "rcb8", name: "Reece Topley", role: "BOWL", team: "RCB", credits: 8.5, status: "playing", points: 0 },
    { id: "rcb9", name: "Akash Deep", role: "BOWL", team: "RCB", credits: 8.0, status: "playing", points: 0 },
    { id: "rcb10", name: "Mahipal Lomror", role: "BAT", team: "RCB", credits: 8.0, status: "playing", points: 0 },
    { id: "rcb11", name: "Karn Sharma", role: "BOWL", team: "RCB", credits: 8.0, status: "playing", points: 0 }
  ],
  "MI": [
    { id: "mi1", name: "Rohit Sharma", role: "BAT", team: "MI", credits: 10.5, status: "playing", points: 0 },
    { id: "mi2", name: "Hardik Pandya", role: "AR", team: "MI", credits: 10.0, status: "playing", points: 0 },
    { id: "mi3", name: "Suryakumar Yadav", role: "BAT", team: "MI", credits: 10.5, status: "playing", points: 0 },
    { id: "mi4", name: "Jasprit Bumrah", role: "BOWL", team: "MI", credits: 10.5, status: "playing", points: 0 },
    { id: "mi5", name: "Ishan Kishan", role: "WK", team: "MI", credits: 9.5, status: "playing", points: 0 },
    { id: "mi6", name: "Tilak Varma", role: "BAT", team: "MI", credits: 9.0, status: "playing", points: 0 },
    { id: "mi7", name: "Tim David", role: "BAT", team: "MI", credits: 8.5, status: "playing", points: 0 },
    { id: "mi8", name: "Gerald Coetzee", role: "BOWL", team: "MI", credits: 8.5, status: "playing", points: 0 },
    { id: "mi9", name: "Piyush Chawla", role: "BOWL", team: "MI", credits: 8.5, status: "playing", points: 0 },
    { id: "mi10", name: "Romario Shepherd", role: "AR", team: "MI", credits: 8.0, status: "playing", points: 0 },
    { id: "mi11", name: "Akash Madhwal", role: "BOWL", team: "MI", credits: 8.0, status: "playing", points: 0 }
  ],
  "CSK": [
    { id: "csk1", name: "MS Dhoni", role: "WK", team: "CSK", credits: 9.0, status: "playing", points: 0 },
    { id: "csk2", name: "Ruturaj Gaikwad", role: "BAT", team: "CSK", credits: 10.0, status: "playing", points: 0 },
    { id: "csk3", name: "Ravindra Jadeja", role: "AR", team: "CSK", credits: 10.0, status: "playing", points: 0 },
    { id: "csk4", name: "Matheesha Pathirana", role: "BOWL", team: "CSK", credits: 9.0, status: "playing", points: 0 },
    { id: "csk5", name: "Shivam Dube", role: "BAT", team: "CSK", credits: 9.5, status: "playing", points: 0 },
    { id: "csk6", name: "Daryl Mitchell", role: "AR", team: "CSK", credits: 9.0, status: "playing", points: 0 },
    { id: "csk7", name: "Rachin Ravindra", role: "AR", team: "CSK", credits: 9.0, status: "playing", points: 0 },
    { id: "csk8", name: "Deepak Chahar", role: "BOWL", team: "CSK", credits: 8.5, status: "playing", points: 0 },
    { id: "csk9", name: "Tushar Deshpande", role: "BOWL", team: "CSK", credits: 8.5, status: "playing", points: 0 },
    { id: "csk10", name: "Ajinkya Rahane", role: "BAT", team: "CSK", credits: 8.5, status: "playing", points: 0 },
    { id: "csk11", name: "Mustafizur Rahman", role: "BOWL", team: "CSK", credits: 8.5, status: "playing", points: 0 }
  ],
  "GT": [
    { id: "gt1", name: "Shubman Gill", role: "BAT", team: "GT", credits: 10.5, status: "playing", points: 0 },
    { id: "gt2", name: "Rashid Khan", role: "BOWL", team: "GT", credits: 10.0, status: "playing", points: 0 },
    { id: "gt3", name: "Sai Sudharsan", role: "BAT", team: "GT", credits: 9.0, status: "playing", points: 0 },
    { id: "gt4", name: "David Miller", role: "BAT", team: "GT", credits: 9.0, status: "playing", points: 0 },
    { id: "gt5", name: "Mohit Sharma", role: "BOWL", team: "GT", credits: 9.0, status: "playing", points: 0 },
    { id: "gt6", name: "Rahul Tewatia", role: "AR", team: "GT", credits: 8.5, status: "playing", points: 0 },
    { id: "gt7", name: "Umesh Yadav", role: "BOWL", team: "GT", credits: 8.5, status: "playing", points: 0 },
    { id: "gt8", name: "Azmatullah Omarzai", role: "AR", team: "GT", credits: 8.5, status: "playing", points: 0 },
    { id: "gt9", name: "Shahrukh Khan", role: "BAT", team: "GT", credits: 8.0, status: "playing", points: 0 },
    { id: "gt10", name: "Noor Ahmad", role: "BOWL", team: "GT", credits: 8.5, status: "playing", points: 0 },
    { id: "gt11", name: "Wriddhiman Saha", role: "WK", team: "GT", credits: 8.5, status: "playing", points: 0 }
  ]
};

// API Routes
app.get("/api/matches", async (req, res) => {
  try {
    const matches: any[] = [];
    
    try {
      const [fixturesRes, resultsRes] = await Promise.all([
        fetch("https://www.iplt20.com/fixtures", { signal: AbortSignal.timeout(5000) }),
        fetch("https://www.iplt20.com/matches/results", { signal: AbortSignal.timeout(5000) })
      ]);
      
      if (fixturesRes.ok && resultsRes.ok) {
        const fixturesHtml = await fixturesRes.text();
        const resultsHtml = await resultsRes.text();
        
        const $f = cheerio.load(fixturesHtml);
        const $r = cheerio.load(resultsHtml);
        
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
            startTime: new Date(Date.now() - 86400000).toISOString(),
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
              startTime: new Date(Date.now() + 86400000).toISOString(),
              status: "upcoming"
            });
          }
        });
      }
    } catch (scrapeError) {
      console.warn("Scraping failed, using mock data:", scrapeError);
    }

    // Always ensure we have our core mock matches for the demo
    const mockMatches = [
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
    ];

    // Merge mock matches if they aren't already there
    mockMatches.forEach(mock => {
      if (!matches.find(m => m.id === mock.id)) {
        matches.push(mock);
      }
    });

    res.json(matches);
  } catch (error) {
    console.error("API error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/api/players/:matchId", async (req, res) => {
  const { matchId } = req.params;
  try {
    // In a real app, we'd fetch the match details to get the teams
    // For the demo, we'll use the matchId to determine teams
    let team1 = "LSG";
    let team2 = "DC";

    if (matchId === "2422") { team1 = "RCB"; team2 = "MI"; }
    if (matchId === "2423") { team1 = "CSK"; team2 = "GT"; }

    const p1 = TEAM_PLAYERS[team1] || TEAM_PLAYERS["LSG"];
    const p2 = TEAM_PLAYERS[team2] || TEAM_PLAYERS["DC"];

    res.json([...p1, ...p2]);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch players" });
  }
});

app.get("/api/live/:matchId", async (req, res) => {
  const { matchId } = req.params;
  try {
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

    res.json({
      score: "0/0 (0.0)",
      status: "upcoming",
      toss: "Toss at 7:00 PM IST",
      currentBatter: "-",
      currentBowler: "-"
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch live update" });
  }
});

// Vite middleware for local development only
if (process.env.NODE_ENV !== "production") {
  const { createServer: createViteServer } = await import("vite");
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
