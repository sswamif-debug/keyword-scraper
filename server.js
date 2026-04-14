const express = require('express');
const { chromium } = require('playwright');

const app = express();
const PORT = process.env.PORT || 3000;

// ═══ IN-MEMORY STORAGE (persists while server is running) ═══
let allResults = [];
let searchedSeeds = new Set();
let currentIndex = 0;
let isRunning = false;
let lastRun = null;
let stats = { ok: 0, noResults: 0, fails: 0 };

// ═══ SEED KEYWORDS TO SEARCH ═══
const SEEDS = [
  "car payment calculator", "auto loan calculator", "car insurance calculator",
  "tax calculator", "income tax calculator", "sales tax calculator", "tax bracket calculator",
  "tax refund calculator", "1099 tax calculator", "self employment tax calculator",
  "retirement calculator", "401k calculator", "ira calculator", "pension calculator",
  "social security calculator", "roth ira calculator", "annuity calculator",
  "investment calculator", "stock calculator", "roi calculator", "dividend calculator",
  "compound interest calculator", "mutual fund calculator", "bond yield calculator",
  "inflation calculator", "cpi calculator", "purchasing power calculator",
  "calorie calculator", "bmi calculator", "tdee calculator", "macro calculator",
  "body fat calculator", "protein calculator",
  "insurance cost calculator", "life insurance calculator", "health insurance calculator",
  "home insurance calculator", "renters insurance calculator",
  "savings calculator", "cd calculator", "high yield savings calculator",
  "debt payoff calculator", "credit card calculator", "debt consolidation calculator",
  "rent vs buy calculator", "rental property calculator", "real estate roi calculator",
  "personal injury calculator", "settlement calculator", "workers comp calculator",
  "car depreciation calculator", "gas mileage calculator", "auto refinance calculator",
  "net worth calculator", "budget calculator", "cost of living calculator",
  "business loan calculator", "sba loan calculator", "commercial loan calculator",
  "solar panel calculator", "electricity cost calculator", "energy savings calculator",
  "gpa calculator", "student loan calculator", "college cost calculator",
  "wedding cost calculator", "pregnancy due date calculator", "baby cost calculator",
  "shipping cost calculator", "import duty calculator", "customs calculator",
  "property tax calculator", "capital gains calculator", "estate tax calculator",
  "forex calculator", "crypto tax calculator", "bitcoin profit calculator",
  "tip calculator", "percentage calculator", "discount calculator",
  "age calculator", "date calculator", "time zone calculator",
  "square footage calculator", "paint calculator", "flooring calculator",
  "pool cost calculator", "fence calculator", "roofing calculator",
  "moving cost calculator", "storage unit calculator", "home renovation calculator"
];

// ═══ USER AGENTS & VIEWPORTS ═══
const UAS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36'
];

// ═══ SCRAPE ONE KEYWORD ═══
async function scrapeKeyword(keyword) {
  let browser = null;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--single-process']
    });
    
    const ua = UAS[Math.floor(Math.random() * UAS.length)];
    const ctx = await browser.newContext({
      userAgent: ua,
      viewport: { width: 1280, height: 720 },
      locale: 'en-US'
    });
    
    const page = await ctx.newPage();
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      window.chrome = { runtime: {} };
    });

    // Go to Wordstream
    await page.goto('https://www.wordstream.com/keywords', { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(3000 + Math.random() * 2000);

    // Dismiss popups
    for (const sel of ['button:has-text("Accept")', '[aria-label="close"]', '.modal-close', 'button:has-text("×")']) {
      try { await page.click(sel, { timeout: 1500 }); } catch(e) {}
    }

    // Type keyword
    const input = page.locator('input[type="text"]').first();
    await input.click();
    await input.fill('');
    await page.waitForTimeout(500);
    
    for (const ch of keyword) {
      await input.type(ch, { delay: 50 + Math.random() * 80 });
    }
    await page.waitForTimeout(1000);

    // Click search
    await page.click('button:has-text("Search"), input[type="submit"]', { timeout: 5000 });
    await page.waitForTimeout(5000);

    // Handle refine page
    try {
      const refineBtn = page.locator('button:has-text("Get Keywords"), button:has-text("Continue")');
      if (await refineBtn.isVisible({ timeout: 3000 })) {
        await refineBtn.click();
        await page.waitForTimeout(5000);
      }
    } catch(e) {}

    // Wait for results
    await page.waitForTimeout(5000 + Math.random() * 3000);

    // Check for "No Results"
    try {
      const noResults = await page.locator('text=No Results').isVisible({ timeout: 2000 });
      if (noResults) {
        return { status: 'no_results', keyword, data: [] };
      }
    } catch(e) {}

    // Extract data using page.evaluate
    const data = await page.evaluate(() => {
      const rows = document.querySelectorAll('table tbody tr');
      const results = [];
      rows.forEach(row => {
        const th = row.querySelector('th[scope="row"]');
        const tds = row.querySelectorAll('td');
        if (th && tds.length >= 4) {
          results.push({
            keyword: th.textContent.trim(),
            volume: tds[0]?.textContent?.trim() || '-',
            bidLow: tds[1]?.textContent?.trim() || '-',
            bidHigh: tds[2]?.textContent?.trim() || '-',
            competition: tds[3]?.textContent?.trim() || '-'
          });
        }
      });
      return results;
    });

    return { status: data.length > 0 ? 'ok' : 'empty', keyword, data };

  } catch(err) {
    return { status: 'error', keyword, data: [], error: err.message };
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

// ═══ SCRAPE NEXT KEYWORD ═══
async function scrapeNext() {
  if (isRunning) return { msg: 'Already running' };
  if (currentIndex >= SEEDS.length) return { msg: 'All seeds done!', total: allResults.length };
  
  isRunning = true;
  const keyword = SEEDS[currentIndex];
  
  // Skip if already searched
  if (searchedSeeds.has(keyword.toLowerCase())) {
    currentIndex++;
    isRunning = false;
    return { msg: `Skipped (already done): ${keyword}` };
  }
  
  console.log(`[${currentIndex + 1}/${SEEDS.length}] Scraping: "${keyword}"`);
  
  const result = await scrapeKeyword(keyword);
  lastRun = new Date().toISOString();
  
  if (result.status === 'ok') {
    result.data.forEach(d => { d.searchedFor = keyword; });
    allResults.push(...result.data);
    searchedSeeds.add(keyword.toLowerCase());
    stats.ok++;
    console.log(`  ✅ ${result.data.length} keywords extracted`);
  } else if (result.status === 'no_results') {
    searchedSeeds.add(keyword.toLowerCase());
    stats.noResults++;
    console.log(`  📭 No Results for "${keyword}"`);
  } else {
    stats.fails++;
    console.log(`  ⚠️ Failed: ${result.error || 'empty'}`);
  }
  
  currentIndex++;
  isRunning = false;
  
  return {
    keyword,
    status: result.status,
    extracted: result.data.length,
    progress: `${currentIndex}/${SEEDS.length}`,
    totalKeywords: allResults.length
  };
}

// ═══ SELF-PING TO STAY ALIVE ═══
setInterval(() => {
  fetch(`http://localhost:${PORT}/ping`).catch(() => {});
}, 4 * 60 * 1000); // Every 4 minutes

// ═══ AUTO-SCRAPE: Run one keyword every 5 minutes ═══
setInterval(async () => {
  if (currentIndex < SEEDS.length && !isRunning) {
    console.log(`\n⏰ Auto-scrape triggered...`);
    await scrapeNext();
  }
}, 5 * 60 * 1000); // Every 5 minutes

// ═══ ROUTES ═══

// Health check / dashboard
app.get('/', (req, res) => {
  res.json({
    status: 'running',
    progress: `${currentIndex}/${SEEDS.length}`,
    totalKeywords: allResults.length,
    seedsDone: searchedSeeds.size,
    stats,
    isRunning,
    lastRun,
    nextKeyword: currentIndex < SEEDS.length ? SEEDS[currentIndex] : 'ALL DONE'
  });
});

// Keep alive ping
app.get('/ping', (req, res) => res.send('pong'));

// Trigger scrape of next keyword
app.get('/scrape', async (req, res) => {
  const result = await scrapeNext();
  res.json(result);
});

// Get all results
app.get('/results', (req, res) => {
  res.json({
    total: allResults.length,
    seedsDone: searchedSeeds.size,
    keywords: allResults
  });
});

// Get results as CSV
app.get('/csv', (req, res) => {
  let csv = 'Keyword,Volume,CPC Low,CPC High,Competition,Seed\n';
  allResults.forEach(r => {
    csv += `"${r.keyword}","${r.volume}","${r.bidLow}","${r.bidHigh}","${r.competition}","${r.searchedFor}"\n`;
  });
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=keywords.csv');
  res.send(csv);
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Keyword Scraper Server running on port ${PORT}`);
  console.log(`📊 ${SEEDS.length} seeds to process`);
  console.log(`⏰ Auto-scraping 1 keyword every 5 minutes`);
  console.log(`🌐 Dashboard: http://localhost:${PORT}/`);
  console.log(`🔄 Manual trigger: http://localhost:${PORT}/scrape`);
  console.log(`📥 Download: http://localhost:${PORT}/csv\n`);
  
  // Start first scrape after 30 seconds
  setTimeout(() => scrapeNext(), 30000);
});
