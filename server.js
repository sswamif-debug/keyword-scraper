const express = require('express');
const { chromium } = require('playwright');

const app = express();
const PORT = process.env.PORT || 3000;

// ═══════════════════════════════════════════════
//  STORAGE
// ═══════════════════════════════════════════════
let allResults = [];
let searchedKeys = new Set();
let isRunning = false;
let lastRun = null;
let totalSearches = 0;
let consecutiveFails = 0;
let stats = { ok: 0, noResults: 0, fails: 0, skipped: 0 };
let currentCountryIdx = 0;
let currentSeedIdx = 0;
let startTime = Date.now();

// ═══════════════════════════════════════════════
//  TOP 5 CPC COUNTRIES + COUNTRY-SPECIFIC SEEDS
//  Each country has different high-value niches
// ═══════════════════════════════════════════════
const COUNTRIES = [
  {
    code: 'US', name: 'United States', label: 'United States',
    seeds: [
      // 🔥 LEGAL ($200-600 CPC) - USA #1 CPC niche
      "car accident lawyer","truck accident lawyer","personal injury lawyer","wrongful death attorney",
      "slip and fall lawyer","dog bite lawyer","motorcycle accident lawyer","medical malpractice lawyer",
      "mesothelioma lawyer","work injury lawyer","premises liability lawyer","birth injury lawyer",
      "brain injury lawyer","spinal cord injury lawyer","burn injury lawyer","class action lawsuit",
      "workers compensation lawyer","disability lawyer","nursing home abuse lawyer","toxic tort lawyer",
      "product liability lawyer","construction accident lawyer","pedestrian accident lawyer",
      "bicycle accident lawyer","boating accident lawyer","aviation accident lawyer",
      "uber accident lawyer","drunk driving accident lawyer","hit and run lawyer",
      "whiplash injury lawyer","soft tissue injury lawyer","back injury lawyer",
      
      // 🛡️ INSURANCE ($50-200 CPC)
      "auto insurance quote","car insurance quote","home insurance quote","life insurance quote",
      "health insurance quote","motorcycle insurance quote","renters insurance quote",
      "business insurance quote","commercial insurance quote","dental insurance cost",
      "pet insurance cost","travel insurance cost","umbrella insurance cost",
      "liability insurance cost","term life insurance rates","disability insurance cost",
      "long term care insurance","medicare supplement insurance","flood insurance cost",
      "earthquake insurance cost","boat insurance cost","rv insurance cost",
      "mobile home insurance","condo insurance cost","landlord insurance cost",
      "professional liability insurance","cyber insurance cost","wedding insurance cost",
      "title insurance cost","gap insurance cost","sr22 insurance cost",
      
      // 💰 FINANCE HIGH CPC ($10-50)
      "loan comparison calculator","debt consolidation calculator","credit card payoff calculator",
      "student loan refinance calculator","business loan calculator","sba loan calculator",
      "commercial loan calculator","hard money loan calculator","bridge loan calculator",
      "merchant cash advance calculator","equipment financing calculator","factoring calculator",
      "line of credit calculator","heloc calculator","home equity loan calculator",
      "fha loan calculator","va loan calculator","jumbo loan calculator",
      "construction loan calculator","land loan calculator",
      
      // 📋 TAX ($8-20 CPC)
      "payroll tax calculator","salary calculator","tax estimator","federal tax calculator",
      "1099 tax calculator","self employment tax calculator","capital gains tax calculator",
      "estate tax calculator","gift tax calculator","property tax calculator",
      "sales tax calculator","tax bracket calculator","tax deduction calculator",
      "tax refund calculator","inheritance tax calculator","w2 calculator",
      "tax withholding calculator","income tax calculator","quarterly tax calculator",
      "depreciation calculator","amortization schedule calculator","bonus tax calculator",
      "stock option tax calculator","crypto tax calculator","rental income tax calculator",
      
      // 📊 INVESTMENT ($2-10 CPC)
      "investment calculator","stock calculator","roi calculator","dividend calculator",
      "bond yield calculator","mutual fund calculator","cd calculator","annuity calculator",
      "present value calculator","future value calculator","stock return calculator",
      "options profit calculator","forex calculator","etf calculator",
      "dollar cost averaging calculator","portfolio rebalancing calculator",
      "margin calculator","short selling calculator","penny stock calculator",
      
      // 🏖️ RETIREMENT ($3-13 CPC)
      "retirement calculator","401k calculator","roth ira calculator","pension calculator",
      "social security calculator","ira calculator","retirement savings calculator",
      "early retirement calculator","rmd calculator","sep ira calculator",
      "simple ira calculator","403b calculator","457b calculator",
      "fire calculator","coast fire calculator","retirement income calculator",
      
      // 🚗 AUTO ($1-10 CPC)
      "car payment calculator","auto loan calculator","car lease calculator",
      "car depreciation calculator","auto refinance calculator","gas mileage calculator",
      "car insurance calculator","vehicle trade in value calculator",
      "car affordability calculator","electric vehicle cost calculator",
      "car maintenance cost calculator","tire size calculator",
      
      // 📈 SAVINGS ($1-6 CPC)
      "compound interest calculator","savings calculator","inflation calculator",
      "high yield savings calculator","savings goal calculator","emergency fund calculator",
      "money market calculator","certificate of deposit calculator",
      
      // 💪 HEALTH ($1-5 CPC)
      "calorie calculator","bmi calculator","tdee calculator","macro calculator",
      "body fat calculator","protein calculator","pregnancy due date calculator",
      "ideal weight calculator","water intake calculator","sleep calculator",
      "alcohol calculator","blood alcohol calculator","ovulation calculator",
      
      // 🏘️ REAL ESTATE ($2-35 CPC)
      "rental property calculator","airbnb calculator","rent vs buy calculator",
      "real estate roi calculator","flip calculator","cash on cash return calculator",
      "mortgage affordability calculator","closing cost calculator",
      "home value calculator","property management fee calculator",
      "cap rate calculator","gross rent multiplier calculator",
      
      // 💳 DEBT ($2-8 CPC)
      "debt payoff calculator","credit card interest calculator","balance transfer calculator",
      "debt avalanche calculator","debt snowball calculator","net worth calculator",
      "credit score calculator","loan to value calculator",
      
      // 🔧 HOME & UTILITY
      "solar panel calculator","electricity cost calculator","pool cost calculator",
      "roofing calculator","fence calculator","flooring calculator","paint calculator",
      "square footage calculator","concrete calculator","gravel calculator",
      "mulch calculator","drywall calculator","siding calculator",
      "deck cost calculator","bathroom remodel calculator","kitchen remodel calculator",
      
      // 📦 MISC
      "tip calculator","percentage calculator","discount calculator",
      "shipping cost calculator","import duty calculator","cost of living calculator",
      "moving cost calculator","wedding cost calculator","college cost calculator",
      "child support calculator","alimony calculator","workers comp settlement calculator"
    ]
  },
  {
    code: 'UK', name: 'United Kingdom', label: 'United Kingdom',
    seeds: [
      // UK LEGAL (£100-300 — different terms!)
      "personal injury claim calculator","car accident claim","road traffic accident solicitor",
      "whiplash claim calculator","workplace injury claim","slip trip fall compensation",
      "medical negligence solicitor","industrial disease claim","asbestos claim solicitor",
      "motorcycle accident claim uk","pedestrian accident claim","hit and run claim uk",
      "criminal injury compensation","housing disrepair claim","flight delay compensation",
      
      // UK INSURANCE (£30-100)
      "car insurance comparison","home insurance comparison","life insurance uk",
      "health insurance uk","pet insurance comparison","travel insurance comparison",
      "van insurance quote","motorbike insurance uk","landlord insurance uk",
      "business insurance uk","public liability insurance","employers liability insurance",
      "income protection insurance","critical illness cover","buildings insurance cost",
      
      // UK FINANCE (£10-40)
      "mortgage calculator uk","stamp duty calculator","inheritance tax calculator uk",
      "pension calculator uk","salary calculator uk","tax calculator uk",
      "student loan calculator uk","isa calculator","help to buy calculator",
      "buy to let calculator","bridging loan calculator","equity release calculator",
      "capital gains tax calculator uk","vat calculator","self assessment calculator",
      "paye calculator","national insurance calculator","dividend tax calculator uk",
      "council tax calculator","benefit calculator uk",
      
      // UK SAVINGS & INVEST
      "compound interest calculator uk","savings calculator uk","inflation calculator uk",
      "investment calculator uk","stocks and shares isa calculator",
      "premium bonds calculator","pension drawdown calculator",
      "annuity calculator uk","retirement calculator uk","fire calculator uk",
      
      // UK PROPERTY
      "rental yield calculator","stamp duty calculator uk","property investment calculator",
      "buy to let mortgage calculator","house price calculator",
      "affordable housing calculator","shared ownership calculator",
      
      // UK HEALTH & LIFESTYLE
      "bmi calculator uk","calorie calculator uk","pregnancy due date calculator",
      "ovulation calculator","alcohol unit calculator","nhs bmi calculator",
      
      // UK HOME
      "solar panel calculator uk","energy cost calculator","boiler cost calculator",
      "loft conversion cost","extension cost calculator","double glazing cost calculator"
    ]
  },
  {
    code: 'CA', name: 'Canada', label: 'Canada',
    seeds: [
      // CA LEGAL (CAD $150-400)
      "personal injury lawyer canada","car accident lawyer toronto","slip and fall lawyer ontario",
      "medical malpractice lawyer canada","wrongful dismissal lawyer","disability lawyer canada",
      "workers compensation lawyer canada","motorcycle accident lawyer canada",
      
      // CA INSURANCE (CAD $30-100)
      "car insurance ontario","home insurance canada","life insurance canada",
      "health insurance canada","travel insurance canada","business insurance canada",
      "motorcycle insurance ontario","tenant insurance canada","condo insurance canada",
      
      // CA FINANCE
      "mortgage calculator canada","rrsp calculator","tfsa calculator",
      "income tax calculator canada","gst hst calculator","cpp calculator",
      "student loan calculator canada","car loan calculator canada",
      "payroll calculator canada","salary calculator canada",
      "capital gains tax calculator canada","land transfer tax calculator",
      "ei calculator","maternity leave calculator canada",
      
      // CA PROPERTY & LIVING
      "rental yield calculator canada","property tax calculator ontario",
      "cost of living calculator canada","mortgage affordability calculator canada",
      "first time home buyer calculator canada","cmhc insurance calculator",
      
      // CA HEALTH & HOME
      "bmi calculator","calorie calculator","solar panel calculator canada",
      "hydro cost calculator","home renovation calculator","deck cost calculator canada"
    ]
  },
  {
    code: 'AU', name: 'Australia', label: 'Australia',
    seeds: [
      // AU LEGAL (AUD $100-300)
      "personal injury lawyer australia","car accident lawyer sydney","workers compensation lawyer nsw",
      "medical negligence lawyer australia","slip and fall claim australia",
      "motorcycle accident lawyer melbourne","tpd claim calculator",
      
      // AU INSURANCE (AUD $30-80)
      "car insurance comparison australia","home insurance australia","life insurance australia",
      "health insurance comparison australia","income protection insurance australia",
      "business insurance australia","landlord insurance australia","pet insurance australia",
      "travel insurance australia","motorcycle insurance australia",
      
      // AU FINANCE
      "mortgage calculator australia","income tax calculator australia",
      "stamp duty calculator nsw","stamp duty calculator victoria",
      "superannuation calculator","hecs help calculator",
      "salary calculator australia","gst calculator australia",
      "capital gains tax calculator australia","pay calculator australia",
      "car loan calculator australia","personal loan calculator australia",
      "investment property calculator","negative gearing calculator",
      
      // AU PROPERTY & LIVING
      "rental yield calculator australia","property investment calculator australia",
      "cost of living calculator australia","lmi calculator",
      "first home buyer calculator","home loan affordability calculator",
      
      // AU HEALTH & HOME
      "bmi calculator","calorie calculator","solar panel calculator australia",
      "electricity cost calculator","renovation cost calculator australia"
    ]
  },
  {
    code: 'DE', name: 'Germany', label: 'Germany',
    seeds: [
      // DE - English search terms (international users)
      "tax calculator germany","income tax germany","salary calculator germany",
      "health insurance germany","car insurance germany","life insurance germany",
      "mortgage calculator germany","rent calculator germany",
      "pension calculator germany","investment calculator germany",
      "cost of living germany","expat tax calculator germany",
      "freelance tax germany","vat calculator germany",
      "property tax germany","capital gains tax germany",
      "car loan calculator germany","energy cost calculator germany",
      "solar panel calculator germany","retirement calculator germany"
    ]
  }
];

// ═══════════════════════════════════════════════
//  USER AGENTS (rotate for each browser launch)
// ═══════════════════════════════════════════════
const UAS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:124.0) Gecko/20100101 Firefox/124.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
];

const TZS = ['America/New_York','America/Chicago','America/Denver','America/Los_Angeles',
             'Europe/London','Europe/Berlin','Australia/Sydney','America/Toronto'];

// ═══════════════════════════════════════════════
//  ALREADY SEARCHED SEEDS (from existing 5500+ data)
// ═══════════════════════════════════════════════
const ALREADY_DONE_US = new Set([
  "car accident lawyer","truck accident lawyer","personal injury lawyer","wrongful death attorney",
  "slip and fall lawyer","dog bite lawyer","work injury lawyer","premises liability lawyer",
  "burn injury lawyer","motorcycle accident lawyer","medical malpractice lawyer","mesothelioma lawyer",
  "auto insurance quote","car insurance quote","home insurance quote","life insurance quote",
  "health insurance quote","motorcycle insurance quote","liability insurance cost",
  "term life insurance rates","dental insurance cost","insurance comparison",
  "payroll tax calculator","salary calculator","tax estimator","federal tax calculator",
  "1099 tax calculator","self employment tax calculator","capital gains tax calculator",
  "estate tax calculator","gift tax calculator","property tax calculator","sales tax calculator",
  "tax bracket calculator","tax deduction calculator","tax refund calculator",
  "inheritance tax calculator","w2 calculator","income tax calculator",
  "home office deduction calculator","mileage deduction calculator","charitable donation calculator",
  "import duty calculator","customs duty calculator","minimum wage calculator",
  "living wage calculator","raise calculator",
  "investment calculator","stock calculator","roi calculator","dividend calculator",
  "compound interest calculator","cd calculator","present value calculator","stock return calculator",
  "retirement calculator","401k calculator","roth ira calculator","pension calculator",
  "social security calculator","ira calculator","retirement savings calculator",
  "car payment calculator","auto loan calculator","car lease calculator",
  "car depreciation calculator","auto refinance calculator","gas mileage calculator",
  "savings calculator","inflation calculator","high yield savings calculator",
  "calorie calculator","bmi calculator","tdee calculator","macro calculator",
  "body fat calculator","protein calculator","pregnancy due date calculator",
  "debt payoff calculator","credit card payoff calculator","balance transfer calculator",
  "tip calculator","percentage calculator","discount calculator","cost of living calculator",
  "solar panel calculator","concrete calculator","square footage calculator",
  "shipping cost calculator","rental property calculator","mortgage affordability calculator",
  "loan comparison calculator","hard money loan calculator","student loan refinance calculator",
  "extra payment mortgage calculator","first time home buyer calculator",
  "solo 401k calculator","backdoor roth ira calculator",
  "mobile home insurance","nursing home abuse lawyer","brain injury lawyer",
  "spinal cord injury lawyer","toxic tort lawyer"
]);

// ═══════════════════════════════════════════════
//  CORE SCRAPER — ONE KEYWORD AT A TIME
// ═══════════════════════════════════════════════
async function scrapeKeyword(keyword, country) {
  let browser = null;
  const t0 = Date.now();
  
  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu',
             '--disable-blink-features=AutomationControlled']
    });
    
    const ua = UAS[Math.floor(Math.random() * UAS.length)];
    const tz = TZS[Math.floor(Math.random() * TZS.length)];
    const w = 1280 + Math.floor(Math.random() * 300);
    const h = 720 + Math.floor(Math.random() * 200);
    
    const ctx = await browser.newContext({
      userAgent: ua, viewport: { width: w, height: h },
      locale: 'en-US', timezoneId: tz
    });
    const page = await ctx.newPage();
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      window.chrome = { runtime: {} };
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    });

    // 1. Navigate
    await page.goto('https://www.wordstream.com/keywords', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000 + Math.random() * 2000);

    // 2. Dismiss popups
    for (const sel of ['#onetrust-accept-btn-handler', 'button:has-text("Accept")', '[aria-label="close"]']) {
      try { if (await page.locator(sel).isVisible({ timeout: 1500 })) { await page.locator(sel).click(); await page.waitForTimeout(800); } } catch(e) {}
    }

    // 3. Type keyword
    const input = page.locator('input[placeholder*="keyword"], input[placeholder*="Keyword"], input[type="text"]').first();
    await input.click();
    await input.fill('');
    await page.waitForTimeout(300);
    for (const ch of keyword) { await input.type(ch, { delay: 50 + Math.random() * 70 }); }
    await page.waitForTimeout(1000);

    // 4. Select country
    if (country.code !== 'US') {
      try {
        const sel = page.locator('select').last();
        await sel.selectOption({ label: country.label });
        await page.waitForTimeout(1000);
      } catch(e) { console.log(`  ⚠️ Country select failed`); }
    }

    // 5. Click search
    await page.locator('input[type="submit"], button:has-text("Search")').first().click();
    await page.waitForTimeout(5000);

    // 6. Handle Refine modal (THIS IS THE KEY FIX)
    try {
      const btn = page.locator('button:has-text("Continue"), button:has-text("Get Keywords"), button:has-text("Show Keywords")');
      if (await btn.first().isVisible({ timeout: 5000 })) {
        await btn.first().click();
        await page.waitForTimeout(8000 + Math.random() * 3000);
      }
    } catch(e) {}

    // 7. Wait for data
    await page.waitForTimeout(3000 + Math.random() * 2000);

    // 8. Check "No Results"
    let noRes = false;
    try { noRes = await page.locator('text=No Results').isVisible({ timeout: 2000 }); } catch(e) {}
    if (noRes) return { status: 'no_results', keyword, country: country.code, data: [], ms: Date.now() - t0 };

    // 9. Extract
    const data = await page.evaluate(() => {
      const rows = document.querySelectorAll('table tbody tr');
      return Array.from(rows).map(row => {
        const th = row.querySelector('th[scope="row"]');
        const tds = row.querySelectorAll('td');
        if (!th || tds.length < 4) return null;
        return {
          keyword: th.textContent.trim(),
          volume: tds[0]?.textContent?.trim() || '-',
          bidLow: tds[1]?.textContent?.trim() || '-',
          bidHigh: tds[2]?.textContent?.trim() || '-',
          competition: tds[3]?.textContent?.trim() || '-'
        };
      }).filter(Boolean);
    });

    return { status: data.length > 0 ? 'ok' : 'empty', keyword, country: country.code, data, ms: Date.now() - t0 };

  } catch(err) {
    return { status: 'error', keyword, country: country.code, data: [], error: err.message.substring(0, 80), ms: Date.now() - t0 };
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

// ═══════════════════════════════════════════════
//  SMART KEYWORD PICKER
// ═══════════════════════════════════════════════
function getNextKeyword() {
  while (currentCountryIdx < COUNTRIES.length) {
    const country = COUNTRIES[currentCountryIdx];
    
    while (currentSeedIdx < country.seeds.length) {
      const seed = country.seeds[currentSeedIdx];
      const key = `${seed.toLowerCase()}|${country.code}`;
      currentSeedIdx++;
      
      if (searchedKeys.has(key)) continue;
      
      // Skip US seeds already done locally
      if (country.code === 'US' && ALREADY_DONE_US.has(seed.toLowerCase())) {
        searchedKeys.add(key);
        stats.skipped++;
        continue;
      }
      
      return { keyword: seed, country };
    }
    
    currentCountryIdx++;
    currentSeedIdx = 0;
    if (currentCountryIdx < COUNTRIES.length) {
      console.log(`\n🌍 === SWITCHING TO ${COUNTRIES[currentCountryIdx].name.toUpperCase()} ===\n`);
    }
  }
  return null;
}

// ═══════════════════════════════════════════════
//  MAIN SCRAPE LOOP
// ═══════════════════════════════════════════════
async function scrapeNext() {
  if (isRunning) return { msg: 'Already running' };
  
  const next = getNextKeyword();
  if (!next) return { msg: '🏁 ALL COUNTRIES COMPLETE!', stats, totalKeywords: allResults.length };
  
  isRunning = true;
  const { keyword, country } = next;
  const key = `${keyword.toLowerCase()}|${country.code}`;
  totalSearches++;
  
  console.log(`[${totalSearches}] 🌍${country.code} "${keyword}"`);
  
  const result = await scrapeKeyword(keyword, country);
  lastRun = new Date().toISOString();
  
  if (result.status === 'ok') {
    result.data.forEach(d => { d.seed = keyword; d.country = country.code; });
    allResults.push(...result.data);
    searchedKeys.add(key);
    stats.ok++;
    consecutiveFails = 0;
    console.log(`  ✅ ${result.data.length} kw (${Math.round(result.ms/1000)}s) | Total: ${allResults.length}`);
  } else if (result.status === 'no_results') {
    searchedKeys.add(key);
    stats.noResults++;
    consecutiveFails = 0;
    console.log(`  📭 No Results (${Math.round(result.ms/1000)}s)`);
  } else {
    stats.fails++;
    consecutiveFails++;
    console.log(`  ⚠️ ${result.status} (${Math.round(result.ms/1000)}s)${result.error ? ': ' + result.error : ''}`);
  }
  
  isRunning = false;
  return {
    keyword, country: country.code, status: result.status,
    extracted: result.data.length, totalKeywords: allResults.length,
    search: totalSearches, consecutiveFails
  };
}

// ═══════════════════════════════════════════════
//  AUTO SCRAPE LOOP (the heart of the system)
// ═══════════════════════════════════════════════
let autoRunning = true;

async function autoScrapeLoop() {
  while (autoRunning) {
    if (!isRunning) {
      const result = await scrapeNext();
      
      if (result.msg && result.msg.includes('COMPLETE')) {
        console.log('\n🏁 ALL DONE! Stopping auto-scrape.\n');
        autoRunning = false;
        break;
      }
      
      // Smart delay based on consecutive fails
      let delay;
      if (consecutiveFails >= 5) {
        delay = 120000; // 2 min cooldown
        console.log(`  🔴 5+ fails — cooling 2min`);
      } else if (consecutiveFails >= 3) {
        delay = 60000; // 1 min cooldown
        console.log(`  🟡 3+ fails — cooling 1min`);
      } else {
        // Normal: 45-75 seconds between searches (looks human)
        delay = 45000 + Math.random() * 30000;
      }
      
      console.log(`  ⏳ Next in ${Math.round(delay/1000)}s`);
      await new Promise(r => setTimeout(r, delay));
    } else {
      await new Promise(r => setTimeout(r, 5000));
    }
  }
}

// ═══════════════════════════════════════════════
//  SELF-PING (keeps Render free tier alive)
// ═══════════════════════════════════════════════
setInterval(() => {
  const url = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
  fetch(`${url}/ping`).catch(() => {});
}, 4 * 60 * 1000);

// ═══════════════════════════════════════════════
//  API ROUTES
// ═══════════════════════════════════════════════

// Dashboard
app.get('/', (req, res) => {
  const country = COUNTRIES[currentCountryIdx] || { name: 'ALL DONE', code: 'X' };
  const totalSeeds = COUNTRIES.reduce((s, c) => s + c.seeds.length, 0);
  const uptime = Math.round((Date.now() - startTime) / 60000);
  
  res.json({
    status: autoRunning ? '🟢 AUTO-SCRAPING' : '🔴 STOPPED',
    uptime: `${uptime} minutes`,
    currentCountry: `${country.name} (${country.code})`,
    seedProgress: `${currentSeedIdx}/${country.seeds?.length || 0}`,
    countryProgress: `${currentCountryIdx + 1}/${COUNTRIES.length}`,
    totalSeeds,
    totalKeywords: allResults.length,
    totalSearches,
    stats, isRunning, lastRun, consecutiveFails,
    estimatedCompletion: `~${Math.round((totalSeeds - totalSearches - stats.skipped) * 65 / 3600)} hours`
  });
});

app.get('/ping', (req, res) => res.send('pong'));

// Manual trigger
app.get('/scrape', async (req, res) => {
  const result = await scrapeNext();
  res.json(result);
});

// Get results (optionally filter by country)
app.get('/results', (req, res) => {
  const c = req.query.country?.toUpperCase();
  const filtered = c ? allResults.filter(r => r.country === c) : allResults;
  res.json({ total: filtered.length, keywords: filtered });
});

// CSV download
app.get('/csv', (req, res) => {
  let csv = 'Keyword,Volume,CPC_Low,CPC_High,Competition,Seed,Country\n';
  allResults.forEach(r => {
    csv += `"${r.keyword}","${r.volume}","${r.bidLow}","${r.bidHigh}","${r.competition}","${r.seed}","${r.country}"\n`;
  });
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=keyword_data.csv');
  res.send(csv);
});

// Top keywords by CPC
app.get('/top', (req, res) => {
  const sorted = [...allResults]
    .map(r => ({ ...r, cpc: parseFloat((r.bidHigh || '0').replace(/[^0-9.]/g, '')) || 0 }))
    .filter(r => r.cpc > 0)
    .sort((a, b) => b.cpc - a.cpc)
    .slice(0, 100);
  res.json({ top100: sorted });
});

// Stats by country
app.get('/stats', (req, res) => {
  const byCountry = {};
  allResults.forEach(r => {
    if (!byCountry[r.country]) byCountry[r.country] = { count: 0, seeds: new Set() };
    byCountry[r.country].count++;
    byCountry[r.country].seeds.add(r.seed);
  });
  Object.keys(byCountry).forEach(k => { byCountry[k].seeds = byCountry[k].seeds.size; });
  res.json({ byCountry, total: allResults.length, totalSearches, stats });
});

// Pause/resume
app.get('/pause', (req, res) => { autoRunning = false; res.json({ msg: 'Paused' }); });
app.get('/resume', (req, res) => { 
  if (!autoRunning) { autoRunning = true; autoScrapeLoop(); }
  res.json({ msg: 'Resumed' }); 
});

// ═══════════════════════════════════════════════
//  START
// ═══════════════════════════════════════════════
const totalSeeds = COUNTRIES.reduce((s, c) => s + c.seeds.length, 0);
app.listen(PORT, () => {
  console.log(`\n${'═'.repeat(50)}`);
  console.log(`  🚀 KEYWORD SCRAPER v3 — MULTI-COUNTRY`);
  console.log(`${'═'.repeat(50)}`);
  console.log(`  Seeds: ${totalSeeds} across ${COUNTRIES.length} countries`);
  console.log(`  Countries: ${COUNTRIES.map(c => c.code).join(' → ')}`);
  console.log(`  Auto-scrape: 1 keyword every ~60s`);
  console.log(`  ETA: ~${Math.round(totalSeeds * 65 / 3600)} hours`);
  console.log(`${'═'.repeat(50)}`);
  console.log(`  Dashboard: http://localhost:${PORT}/`);
  console.log(`  Results:   http://localhost:${PORT}/results`);
  console.log(`  CSV:       http://localhost:${PORT}/csv`);
  console.log(`  Stats:     http://localhost:${PORT}/stats`);
  console.log(`  Top CPC:   http://localhost:${PORT}/top`);
  console.log(`${'═'.repeat(50)}\n`);
  
  // Start auto-scraping after 15 seconds
  setTimeout(() => {
    console.log('🟢 Auto-scrape starting...\n');
    autoScrapeLoop();
  }, 15000);
});
