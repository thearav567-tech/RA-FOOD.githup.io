const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');

const app = express();

// ==================== CORS ====================
app.use(
  cors({
    origin: [
      'https://myserver.infinityfree.me',
      'http://localhost:3000',
      'http://127.0.0.1:5500',
    ],
  }),
);

app.use(express.json());
app.use(express.static('public'));

// ==================== GLOBAL DATA ====================
let latestMatches = [];
let lastUpdated = null;
let sseClients = [];

// ==================== SSE BROADCAST ====================
function broadcast(data) {
  const payload = `data: ${JSON.stringify(data)}\n\n`;

  sseClients = sseClients.filter((client) => {
    try {
      client.write(payload);
      return true;
    } catch (err) {
      return false;
    }
  });
}

// ==================== SCRAPER ====================
async function startScraper() {
  console.log('Starting scraper...');

  const browser = await puppeteer.launch({
    headless: 'new',

    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--single-process',
      '--no-zygote',
    ],
  });

  const page = await browser.newPage();

  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  );

  await page.goto('https://uniscore.com/km/football?qFilter=live', {
    waitUntil: 'networkidle2',
    timeout: 60000,
  });

  console.log('Connected to Uniscore');

  async function scrapeLiveMatches() {
    try {
      const matches = await page.evaluate(() => {
        const data = [];

        const cards = document.querySelectorAll(
          '.border-gradient-match-live',
        );

        cards.forEach((card) => {
          const text = card.innerText
            .split('\n')
            .map((t) => t.trim())
            .filter(Boolean);

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
            homeScore: text[2] || '',
            awayScore: text[3] || '',
            awayTeam: text[4] || '',
            league: leagueText || 'Unknown League',
          });
        });

        return data;
      });

      latestMatches = matches;
      lastUpdated = new Date().toISOString();

      console.log(
        `[${new Date().toLocaleTimeString()}] ${matches.length} matches updated`,
      );

      broadcast({
        matches: latestMatches,
        lastUpdated,
      });
    } catch (err) {
      console.error('Scrape error:', err.message);
    }
  }

  // Initial scrape
  await scrapeLiveMatches();

  // Refresh every 10 seconds
  setInterval(async () => {
    try {
      await page.waitForSelector('.border-gradient-match-live', {
        timeout: 10000,
      });

      await scrapeLiveMatches();
    } catch (err) {
      console.log('Reloading page...');

      try {
        await page.reload({
          waitUntil: 'networkidle2',
        });

        await scrapeLiveMatches();
      } catch (reloadErr) {
        console.error('Reload failed:', reloadErr.message);
      }
    }
  }, 10000);
}

// ==================== ROUTES ====================

// Home
app.get('/', (req, res) => {
  res.json({
    status: 'running',
    message: 'Football Live API',
  });
});

// Matches API
app.get('/matches', (req, res) => {
  res.json({
    matches: latestMatches,
    lastUpdated,
  });
});

// SSE Stream
app.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  res.flushHeaders();

  // Send initial data
  res.write(
    `data: ${JSON.stringify({
      matches: latestMatches,
      lastUpdated,
    })}\n\n`,
  );

  sseClients.push(res);

  console.log(`SSE client connected: ${sseClients.length}`);

  req.on('close', () => {
    sseClients = sseClients.filter((client) => client !== res);

    console.log(`SSE client disconnected: ${sseClients.length}`);
  });
});

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    matches: latestMatches.length,
    clients: sseClients.length,
    lastUpdated,
    uptime: process.uptime(),
  });
});

// ==================== START SERVER ====================
const PORT = process.env.PORT || 3001;

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);

  try {
    await startScraper();
  } catch (err) {
    console.error('Failed to start scraper:', err.message);
  }
});
