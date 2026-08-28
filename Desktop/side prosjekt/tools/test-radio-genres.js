// Klikkar gjennom alle 12 sjanger-knappane i radiosøket og sjekkar at kvar sjanger
// faktisk gjev lyd. Køyrer mot den lokale koden, men over https (sjølvsignert), fordi
// heile poenget er mixed-content-oppførselen ei http-side ikkje kan vise.
//
//   node tools/test-radio-genres.js            (alle sjangrar)
//   node tools/test-radio-genres.js Psytrance  (éin sjanger)
const puppeteer = require('puppeteer-core');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const ROOT = path.join(__dirname, '..');
const PORT = 8443;
// Sida må køyre under sitt verkelege vertsnamn: SomaFM (og andre) har hotlink-vern
// som svarar 403 når Referer er «localhost». Chrome får domenet peika mot oss med
// --host-resolver-rules, så testen ser det brukarane ser.
const HOST = 'www.siriusfm.no';
const GENRES = ['Psytrance','Goa','EDM','House','Progressive','Chillgressive',
                'Chill Out','Psychill','Downtempo','Ambient','Drone','Dark Drone'];

const MIME = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css',
               '.json':'application/json', '.svg':'image/svg+xml', '.png':'image/png',
               '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.webp':'image/webp', '.ico':'image/x-icon' };

// Sjølvsignert sertifikat for localhost (Chrome startar med --ignore-certificate-errors).
function cert() {
  const dir = fs.mkdtempSync('/tmp/sfm-cert-');
  const key = path.join(dir, 'k.pem'), crt = path.join(dir, 'c.pem');
  execFileSync('openssl', ['req','-x509','-newkey','rsa:2048','-nodes','-keyout',key,
    '-out',crt,'-days','1','-subj',`/CN=${HOST}`], { stdio: 'ignore' });
  return { key: fs.readFileSync(key), cert: fs.readFileSync(crt) };
}

function serve() {
  return new Promise(res => {
    const srv = https.createServer(cert(), (req, rq) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p === '/' || p.endsWith('/')) p += 'index.html';
      const file = path.join(ROOT, p);
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        rq.writeHead(404); rq.end('nope'); return;
      }
      rq.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(rq);
    });
    srv.listen(PORT, () => res(srv));
  });
}

(async () => {
  // Sjangrane skal spele likt for gjestar og innlogga. --logged-in seedar ein
  // session i localStorage før sida lastar, så vi testar den greina òg (innlogging
  // slår på presence/sync-modular som kan velte sida utan at ein gjest merkar noko).
  const argv    = process.argv.slice(2);
  const asUser  = argv.includes('--logged-in');
  // Radio Browser er blokkert/uråd å nå frå ein del nett. Då skal sida framleis
  // spele alle 12 sjangrane på våre eigne seeda stasjonar — det testar dette flagget.
  const noCat   = argv.includes('--no-catalogue');
  const only    = argv.find(a => !a.startsWith('--'));
  const list = only ? GENRES.filter(g => g.toLowerCase() === only.toLowerCase()) : GENRES;
  if (!list.length) { console.error('Unknown genre:', only); process.exit(1); }
  console.log(`Kjører som ${asUser ? 'INNLOGGA brukar' : 'GJEST'}${noCat ? ' · Radio Browser BLOKKERT' : ''}\n`);

  const srv = await serve();
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--ignore-certificate-errors', '--autoplay-policy=no-user-gesture-required',
           '--mute-audio', '--no-sandbox',
           `--host-resolver-rules=MAP ${HOST} 127.0.0.1:${PORT}`],
  });
  const page = await browser.newPage();
  // SomaFM (og fleire andre) svarar 403 på «HeadlessChrome» i User-Agent, så testen
  // ville rapportert daude stasjonar som i røynda spelar fint for brukarar.
  await page.setUserAgent((await browser.userAgent()).replace('HeadlessChrome', 'Chrome'));

  if (asUser) {
    // Auth ligg i localStorage (js/auth.js: pv_users + pv_session), så ein seeda
    // session er ekte innlogging for all koden på sida.
    await page.evaluateOnNewDocument(() => {
      const u = {
        username: 'testlyttar', displayName: 'Test Lyttar', email: 'test@siriusfm.no',
        password: 'x', createdAt: 1, activated: true, activationToken: null,
        resetToken: null, resetExpiry: null, bio: '', links: [], mediaIds: [], musicIds: [],
        avatarMediaId: null, bannerMediaId: null, followers: [], following: [], events: [],
        friends: [], friendRequests: [], sentRequests: [], mixIds: [],
        subscription: 'free', role: 'lytter', labelName: '', buyUrl: '',
        profileVisibility: 'public',
      };
      localStorage.setItem('pv_users', JSON.stringify({ testlyttar: u }));
      localStorage.setItem('pv_session', JSON.stringify({ username: 'testlyttar', ts: 1 }));
    });
  }

  if (noCat) {
    await page.setRequestInterception(true);
    page.on('request', r => r.url().includes('radio-browser.info') ? r.abort() : r.continue());
  }

  const blocked = [];
  const errors  = [];
  page.on('console', m => { if (/Mixed Content|was blocked/i.test(m.text())) blocked.push(m.text()); });
  // Ein JS-feil som berre oppstår innlogga ville elles gå upåakta hen.
  page.on('pageerror', e => errors.push(String(e.message || e)));

  let fails = 0;
  try {
    await page.goto(`https://${HOST}/#/shows`, { waitUntil: 'networkidle2', timeout: 60000 });
    await page.waitForSelector('.rsx-genre', { timeout: 20000 });

    // Stadfest at sida verkeleg ser oss som innlogga — elles testar vi gjest på nytt.
    const who = await page.evaluate(() => (typeof Auth !== 'undefined' && Auth.current()?.username) || null);
    if (asUser && !who) { console.error('✗ Seeda session slo ikkje inn — Auth.current() er null'); process.exit(1); }
    console.log(`Auth.current() = ${who || 'null (gjest)'}\n`);

    for (const label of list) {
      // Klikk sjanger-knappen og vent på resultatlista.
      await page.evaluate(l => {
        [...document.querySelectorAll('.rsx-genre')].find(b => b.textContent.includes(l))?.click();
      }, label);
      await page.waitForFunction(() => document.querySelectorAll('.rsx-item').length > 0,
        { timeout: 30000 }).catch(() => {});

      const rows = await page.$$eval('.rsx-item', els => els.map(e => ({
        name: e.querySelector('.rsx-item-name')?.textContent.trim(),
        onSite: e.classList.contains('rsx-item--onsite'),
      })));
      if (!rows.length) { console.log(`✗ ${label.padEnd(14)} no results at all`); fails++; continue; }

      // Klikk øvste treff og sjå om lyden verkeleg kjem i gang (auto-hopp inkludert).
      await page.evaluate(() => document.querySelector('.rsx-item')?.click());
      const played = await page.waitForFunction(() => {
        const a = document.getElementById('audio-engine');
        return !!a && !a.paused && a.readyState >= 3 && a.currentTime > 0;
      }, { timeout: 45000 }).then(() => true).catch(() => false);

      const now = await page.evaluate(() => ({
        title: document.getElementById('player-title')?.textContent,
        t: document.getElementById('audio-engine')?.currentTime || 0,
      }));
      const offline = await page.$$eval('.rsx-item--offline', e => e.length);
      const mark = played ? '✓' : '✗';
      if (!played) fails++;
      console.log(`${mark} ${label.padEnd(14)} rows=${String(rows.length).padStart(2)} onSite=${rows.filter(r=>r.onSite).length}` +
                  `  playing="${(now.title||'').slice(0,32)}" t=${now.t.toFixed(1)}s  skipped=${offline}`);

      await page.evaluate(() => { const a = document.getElementById('audio-engine'); if (a) { a.pause(); a.src=''; } });
    }
  } finally {
    await browser.close();
    srv.close();
  }

  if (blocked.length) {
    console.log(`\n⚠ ${blocked.length} mixed-content block(s) — a stream URL slipped through as http:`);
    blocked.slice(0, 5).forEach(b => console.log('   ' + b.slice(0, 160)));
  }
  if (errors.length) {
    console.log(`\n⚠ ${errors.length} JS-feil på sida:`);
    [...new Set(errors)].slice(0, 5).forEach(e => console.log('   ' + e.slice(0, 160)));
  }
  console.log(`\n${list.length - fails}/${list.length} genres played (${asUser ? 'innlogga' : 'gjest'})`);
  process.exit(fails ? 1 : 0);
})();
