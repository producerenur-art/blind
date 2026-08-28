// Live røyktest mot siriusfm.no med system-Chrome (puppeteer-core).
// Laster forsiden + hver hovedfane + urio-profilen og fanger JS-feil pr. rute.
const puppeteer = require('puppeteer-core');

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = 'https://www.siriusfm.no';

const ROUTES = [
  ['Forside',      '/#/'],
  ['Radio',        '/#/radio'],
  ['Discover',     '/#/discover'],
  ['Community',    '/#/community'],
  ['Magasin',      '/#/magazine'],
  ['World',        '/#/world'],
  ['Shows',        '/#/shows'],
  ['Underground',  '/#/underground'],
  ['A1',           '/#/a1'],
  ['Friends',      '/#/friends'],
  ['Del musikk',   '/#/share'],
  ['Butikk',       '/#/shop'],
  ['Studio',       '/#/studio'],
  ['Profil urio',  '/#/u/urio'],
];

// Støy vi ignorerer (tredjeparts/eksterne, ikke våre bugs).
const IGNORE = [
  /Failed to load resource/i,
  /net::ERR_/i,
  /the server responded with a status of/i,
  /Google Translate/i,
  /translate\.google/i,
  /gstatic/i,
  /youtube\.com/i,
  /favicon/i,
  /Content Security Policy/i,
  /A cookie associated/i,
  /third-party cookie/i,
];
const ignore = (t) => IGNORE.some((re) => re.test(t));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1280,1000'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1000 });

  let bag = [];
  page.on('console', (m) => { if (m.type() === 'error' && !ignore(m.text())) bag.push('console: ' + m.text()); });
  page.on('pageerror', (e) => { if (!ignore(String(e))) bag.push('pageerror: ' + (e && e.message ? e.message : e)); });

  const results = [];
  for (const [name, path] of ROUTES) {
    bag = [];
    let extra = '';
    try {
      await page.goto(BASE + path, { waitUntil: 'networkidle2', timeout: 45000 });
      await new Promise((r) => setTimeout(r, 2500)); // la SPA + async-render fullføre
      // hash kan bli nullstilt av router → tving ruta og re-render
      await page.evaluate((h) => { if (location.hash !== h) { location.hash = h; window.dispatchEvent(new HashChangeEvent('hashchange')); } }, path.replace('/', ''));
      await new Promise((r) => setTimeout(r, 1200));
      const info = await page.evaluate(() => ({
        title: document.title,
        bodyLen: document.body ? document.body.innerText.length : 0,
        hash: location.hash,
      }));
      extra = `dom:${info.bodyLen}b hash:${info.hash}`;
    } catch (e) {
      bag.push('navigation: ' + e.message);
    }
    const errs = bag.slice();
    results.push({ name, path, errs, extra });
    const tag = errs.length ? '❌' : '✅';
    console.log(`${tag} ${name.padEnd(13)} ${path.padEnd(16)} ${extra}`);
    errs.forEach((e) => console.log(`     ↳ ${e}`));
  }

  const totalErrs = results.reduce((n, r) => n + r.errs.length, 0);
  console.log(`\n── Oppsummering ──\nRuter testet: ${results.length}\nRuter med JS-feil: ${results.filter(r => r.errs.length).length}\nTotale JS-feil: ${totalErrs}`);

  await browser.close();
  process.exit(totalErrs > 0 ? 1 : 0);
})().catch((e) => { console.error('FATAL', e); process.exit(2); });
