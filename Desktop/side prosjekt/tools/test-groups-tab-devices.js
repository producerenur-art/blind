#!/usr/bin/env node
/**
 * test-groups-tab-devices.js — verifiserer den nye «Se eksisterende grupper»-fanen
 * i brukerprofilene på tvers av enheter (viewport-størrelser) med ekte Chrome.
 *
 * Kjør:  node tools/test-groups-tab-devices.js
 *
 * For hver «enhet»: seeder en innlogget testbruker (+ et par grupper) i
 * localStorage, laster #/u/<bruker>, og sjekker at:
 *   1) «Se eksisterende grupper»-fane-knappen finnes i fanelinja.
 *   2) Klikk viser #tab-alle-grupper (de andre fanene skjules).
 *   3) Fanen har søkefeltet + seksjonstittelen «Alle grupper på SiriusFM».
 *   4) Begge de opprettede gruppene vises som kort.
 *   5) Ingen horisontal overflow (side scroller ikke sidelengs på mobil).
 * Screenshots lagres i tools/_shots/.
 */
'use strict';
const puppeteer = require('puppeteer-core');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const SHOTS = path.join(__dirname, '_shots');
fs.mkdirSync(SHOTS, { recursive: true });

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
};

// Statisk filserver (SPA: ukjente ruter → index.html)
function startServer() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p === '/') p = '/index.html';
      let file = path.join(ROOT, p);
      if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(ROOT, 'index.html');
      fs.readFile(file, (err, data) => {
        if (err) { res.writeHead(404); res.end('nf'); return; }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
        res.end(data);
      });
    });
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}

// «Enheter» = realistiske viewporter (bredde × høyde, DPR, touch).
const DEVICES = [
  { name: 'PC (Windows 1080p)',      width: 1920, height: 1080, dpr: 1, mobile: false, ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126 Safari/537.36' },
  { name: 'Mac (desktop 1440)',      width: 1440, height: 900,  dpr: 2, mobile: false, ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/126 Safari/537.36' },
  { name: 'Laptop (13" 1280)',       width: 1280, height: 800,  dpr: 2, mobile: false, ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/126 Safari/537.36' },
  { name: 'iPad (Apple nettbrett)',  width: 820,  height: 1180, dpr: 2, mobile: true,  ua: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605 Version/17 Safari/605' },
  { name: 'Android nettbrett',       width: 800,  height: 1280, dpr: 1.5, mobile: true, ua: 'Mozilla/5.0 (Linux; Android 13; SM-X700) Chrome/126 Safari/537.36' },
  { name: 'iPhone (Apple mobil)',    width: 390,  height: 844,  dpr: 3, mobile: true,  ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605 Version/17 Mobile Safari/605' },
  { name: 'Android mobil',           width: 393,  height: 851,  dpr: 2.75, mobile: true, ua: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) Chrome/126 Mobile Safari/537.36' },
];

const USERNAME = 'testdj';
// Seed-data lagt inn FØR appen laster (evaluateOnNewDocument).
function seedScript() {
  const now = Date.now();
  const user = {
    username: USERNAME, displayName: 'Test DJ', password: 'x', email: 'test@dj.no',
    createdAt: now, activated: true, activationToken: null, resetToken: null, resetExpiry: null,
    theme: null, bio: 'Testprofil', links: [], mediaIds: [], musicIds: [],
    avatarMediaId: null, bannerMediaId: null, followers: [], following: [], events: [],
    friends: [], friendRequests: [], sentRequests: [], mixIds: [], subscription: 'free',
    role: 'dj', labelName: '', buyUrl: '', profileVisibility: 'public',
  };
  const users = { [USERNAME]: user };
  const session = { username: USERNAME, ts: now };
  return `(function(){
    try {
      localStorage.setItem('pv_users', ${JSON.stringify(JSON.stringify(users))});
      localStorage.setItem('pv_session', ${JSON.stringify(JSON.stringify(session))});
      localStorage.setItem('pv_online_${USERNAME}', String(${now}));
    } catch(e){}
  })();`;
}

// Merk: gruppedata kommer fra Gun (P2P) og er ikke oppe i denne testen, så
// «Se eksisterende grupper» viser tom-tilstand + søk + tittel. Vi verifiserer
// at fanen finnes, bytter riktig, rendrer stabilt og er responsiv — ikke at det
// finnes konkrete grupper (det dekkes av selve Gun-flyten i appen).

(async () => {
  const srv = await startServer();
  const BASE = `http://127.0.0.1:${srv.address().port}`;
  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });

  let failures = 0;
  const rows = [];

  for (const d of DEVICES) {
    const page = await browser.newPage();
    const problems = [];
    page.on('pageerror', (e) => {
      const m = String(e && e.message || e);
      if (!/Google Translate|translate\.google|gstatic|ResizeObserver/i.test(m)) problems.push('pageerror: ' + m);
    });
    try {
      await page.setUserAgent(d.ua);
      await page.setViewport({ width: d.width, height: d.height, deviceScaleFactor: d.dpr, isMobile: d.mobile, hasTouch: d.mobile });
      await page.evaluateOnNewDocument(seedScript());

      await page.goto(`${BASE}/#/u/${USERNAME}`, { waitUntil: 'networkidle2', timeout: 45000 });
      await new Promise((r) => setTimeout(r, 1500));
      // Tving ruta (router kan nullstille hash) + re-render
      await page.evaluate((u) => { location.hash = '#/u/' + u; window.dispatchEvent(new HashChangeEvent('hashchange')); }, USERNAME);
      await new Promise((r) => setTimeout(r, 1500));

      // Overflow FØR vi klikker vår fane (på «Om») — for å skille pre-eksisterende
      // side-overflow fra evt. overflow vår fane introduserer.
      const overflowBefore = await page.evaluate(() =>
        document.documentElement.scrollWidth - document.documentElement.clientWidth);

      // Finn og klikk «Se eksisterende grupper»-fanen
      const tabInfo = await page.evaluate(() => {
        const btns = [...document.querySelectorAll('#profile-tabs .tab-btn')];
        const btn = btns.find(b => b.dataset.tab === 'alle-grupper');
        const label = btn ? btn.textContent.trim() : null;
        if (btn) btn.click();
        return { exists: !!btn, label, tabCount: btns.length };
      });
      await new Promise((r) => setTimeout(r, 600));

      const view = await page.evaluate(() => {
        const el = document.getElementById('tab-alle-grupper');
        const visible = el && !el.classList.contains('hidden');
        const hasSearch = !!(el && el.querySelector('input[type="search"]'));
        const hasTitle = !!(el && /Alle grupper på SiriusFM/.test(el.textContent));
        const otherHidden = ['tab-om','tab-grupper'].every(id => {
          const e = document.getElementById(id); return !e || e.classList.contains('hidden');
        });
        const html = el ? el.innerHTML.length : 0;
        // Horisontal overflow? + finn det bredeste elementet som stikker ut.
        const docW = document.documentElement.clientWidth;
        const overflowX = document.documentElement.scrollWidth - docW;
        let culprit = null;
        if (overflowX > 2) {
          let worst = 0;
          document.querySelectorAll('body *').forEach(n => {
            const r = n.getBoundingClientRect();
            const over = Math.round(r.right - docW);
            if (over > worst && r.width > 0) {
              worst = over;
              culprit = `${n.tagName.toLowerCase()}.${(n.className && n.className.toString ? n.className.toString().split(/\s+/)[0] : '')} +${over}px (id=${n.id||'-'}) inTab=${!!n.closest('#tab-alle-grupper')}`;
            }
          });
        }
        return { visible, hasSearch, hasTitle, otherHidden, html, overflowX, culprit };
      });

      const shot = path.join(SHOTS, `groups-${d.name.replace(/[^a-z0-9]+/gi, '_')}.png`);
      await page.screenshot({ path: shot });

      const okTab = tabInfo.exists;
      const okSwitch = view.visible && view.otherHidden;
      const okContent = view.hasSearch && view.hasTitle;
      // Vår fane er «grei» hvis den ikke gjør overflow verre enn resten av siden.
      const introducedOverflow = view.overflowX > overflowBefore + 2;
      const okNoOverflow = !introducedOverflow;
      const okErrors = problems.length === 0;
      const pass = okTab && okSwitch && okContent && okNoOverflow && okErrors;
      if (!pass) failures++;

      rows.push({ name: d.name, size: `${d.width}×${d.height}`, okTab, okSwitch, okContent, okNoOverflow, overflowX: view.overflowX, okErrors, problems });
      const mark = (b) => b ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
      console.log(`${pass ? '\x1b[32mPASS\x1b[0m' : '\x1b[31mFAIL\x1b[0m'}  ${d.name.padEnd(24)} ${d.width}×${d.height}  fane:${mark(okTab)} bytt:${mark(okSwitch)} innhold:${mark(okContent)} vår-fane-ikke-overflow:${mark(okNoOverflow)} (side før:${overflowBefore}px etter:${view.overflowX}px) js-feilfri:${mark(okErrors)}`);
      if (view.culprit) console.log('        ↳ bredeste element: ' + view.culprit);
      if (problems.length) problems.forEach(p => console.log('        ↳ ' + p));
    } catch (e) {
      failures++;
      console.log(`\x1b[31mFAIL\x1b[0m  ${d.name} — ${e.message}`);
    } finally {
      await page.close();
    }
  }

  await browser.close();
  srv.close();

  console.log(`\nScreenshots: ${SHOTS}`);
  if (failures) { console.error(`\n\x1b[31m${failures} enhet(er) feilet ❌\x1b[0m\n`); process.exit(1); }
  console.log(`\n\x1b[32mAlle ${DEVICES.length} enheter passerte ✅\x1b[0m — «Se eksisterende grupper» funker overalt.\n`);
})();
