import axios from "axios";
import * as cheerio from "cheerio";

const CRICBUZZ_URL = "https://www.cricbuzz.com";

const testScrape = async () => {
  try {
    const URL = `${CRICBUZZ_URL}/cricket-match/live-scores`;
    console.log(`Fetching ${URL}...`);
    const response = await axios.get(URL, { timeout: 10000 });
    const $ = cheerio.load(response.data);
    
    console.log("Page Title:", $("title").text());
    
    // Test international tab
    const intlMatches = $(`.cb-plyr-tbody[ng-show="active_match_type == 'international-tab'"] .cb-col-100.cb-col`);
    console.log("International Matches Found:", intlMatches.length);
    
    // Test league tab
    const leagueMatches = $(`.cb-plyr-tbody[ng-show="active_match_type == 'league-tab'"] .cb-col-100.cb-col`);
    console.log("League Matches Found:", leagueMatches.length);
    
    // If none found, let's see what's there
    if (intlMatches.length === 0 && leagueMatches.length === 0) {
      console.log("No matches found with current selectors. Inspecting structure...");
      
      // Print all classes of all div elements to see what's available
      const classes = new Set();
      $("div").each((i, el) => {
        const cls = $(el).attr("class");
        if (cls) cls.split(" ").forEach(c => classes.add(c));
      });
      console.log("Available classes:", Array.from(classes).slice(0, 50).join(", "));
      
      const html = response.data;
    // Try raw string search for matchInfo
    console.log("Searching for 'matchInfo' in raw HTML...");
    const index = html.indexOf("matchInfo");
    if (index !== -1) {
      console.log("Raw HTML snippet around 'matchInfo':", html.substring(index, index + 1000));
    } else {
      console.log("'matchInfo' not found in raw HTML.");
    }
    }
  } catch (e) {
    console.error("Scrape failed:", e.message);
  }
};

testScrape();
