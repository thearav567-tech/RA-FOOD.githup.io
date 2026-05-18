const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');

const app = express();

// Enable CORS for your production frontend domain
app.use(
  cors({
    origin: [
      'http://myserver.infinityfree.me',
      'http://localhost:3000',
      'http://127.0.0.1:5500',
    ],
  }),
);
app.use(express.static('public'));

let latestMatches = [];
let lastUpdated = null;
let sseClients = [];

// ==================== SSE BROADCAST ====================
function broadcast(data) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  sseClients = sseClients.filter((res) => {
    try {
      res.write(payload);
      return true;
    } catch {
      return false;
    }
  });
}

// ==================== SCRAPER ====================
async function startScraper() {
  const isProduction = process.env.NODE_ENV === 'production';

  const browser = await puppeteer.launch({
    // MUST be true in production cloud environments
    headless: true,
    defaultViewport: null,
    // Avoid using local paths like './tmp' directly if disk access is restricted
    userDataDir: isProduction ? '/tmp/puppeteer_user_data' : './tmp',
    executablePath:
      process.platform === 'linux' ? '/usr/bin/chromium-browser' : undefined,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage', // Prevents memory crashes in small cloud containers
      '--disable-gpu',
    ],
  });

  const page = await browser.newPage();

  // Set a realistic User-Agent so the target site doesn't immediately block your cloud server
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  );

  await page.goto('https://uniscore.com/km/football?qFilter=live', {
    waitUntil: 'networkidle2',
    timeout: 60000,
  });

  async function scrapeLiveMatches() {
    try {
      const matches = await page.evaluate(() => {
        const data = [];
        const cards = document.querySelectorAll('.border-gradient-match-live');

        cards.forEach((card) => {
          const text = card.innerText.split('\n').filter(Boolean);

          let leagueText = '';
          let el = card.parentElement;
          let depth = 0;

          while (el && depth < 8) {
            let sibling = el.previousElementSibling;
            while (sibling) {
              const hasMatchCard = sibling.querySelector(
                '.border-gradient-match-live',
              );
              if (!hasMatchCard) {
                const raw = sibling.innerText || '';
                const firstLine = raw.split('\n')[0].trim();
                if (
                  firstLine.length >= 3 &&
                  firstLine.length <= 60 &&
                  !/^\d+$/.test(firstLine)
                ) {
                  leagueText = firstLine;
                  break;
                }
              }
              sibling = sibling.previousElementSibling;
            }
            if (leagueText) break;
            el = el.parentElement;
            depth++;
          }

          data.push({
            time: text[0] || '',
            homeTeam: text[1] || '',
            awayTeam: text[4] || '',
            homeScore: text[2] || '',
            awayScore: text[3] || '',
            league: leagueText,
          });
        });

        return data;
      });

      latestMatches = matches;
      lastUpdated = new Date().toISOString();
      console.log(
        `[${new Date().toLocaleTimeString()}] Scraped ${matches.length} matches — broadcasting to ${sseClients.length} client(s)`,
      );

      broadcast({ matches, lastUpdated });
    } catch (err) {
      console.error('Scrape error:', err.message);
    }
  }

  await scrapeLiveMatches();

  setInterval(async () => {
    try {
      await page.waitForSelector('.border-gradient-match-live', {
        timeout: 8000,
      });
      await scrapeLiveMatches();
    } catch {
      try {
        await page.reload({ waitUntil: 'networkidle2' });
        await scrapeLiveMatches();
      } catch (reloadErr) {
        console.error('Page reload failed:', reloadErr.message);
      }
    }
  }, 10000);
}

// ==================== API ====================
app.get('/matches', (req, res) => {
  res.json({ matches: latestMatches, lastUpdated });
});

app.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  res.write(
    `data: ${JSON.stringify({ matches: latestMatches, lastUpdated })}\n\n`,
  );

  sseClients.push(res);
  console.log(`[SSE] Client connected — total: ${sseClients.length}`);

  req.on('close', () => {
    sseClients = sseClients.filter((c) => c !== res);
    console.log(`[SSE] Client disconnected — total: ${sseClients.length}`);
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    matchCount: latestMatches.length,
    lastUpdated,
    clients: sseClients.length,
  });
});

// Use environment port given by cloud platforms, default to 3001 locally
const PORT = process.env.PORT || 3001;
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await startScraper();
});
