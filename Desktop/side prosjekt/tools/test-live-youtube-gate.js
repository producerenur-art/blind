// Ekte ende-til-ende-test på det DEPLOYEDE nettstedet: YouTube-live-veien (DJ som
// streamer Traktor→OBS→YouTube limer inn live-lenken) + betalings-gaten.
// Injiserer en «urio»-bruker i localStorage med en ekte live-YouTube-strøm og
// sjekker embed/gate i tre scenarier. Bruker system-Chrome via puppeteer-core.
const puppeteer = require('puppeteer-core');
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = 'https://www.soundcoredevelopment.com';
const LIVE_ID = 'jfKfPfyJRdk';            // Lofi Girl — alltid live, embeddbar (proxy for DJ-strøm)

const now = Date.now();
const liveBroadcast = {
  id: 'bc_test_1', slot: new Date(now - 5 * 60000).toISOString(), hours: 2,
  room: 'urio-room', title: 'Traktor live-sett', youtubeId: LIVE_ID, createdAt: now,
};
function urioUser(withBooking) {
  return {
    username: 'urio', displayName: 'Urio', email: 'urio@example.com', role: 'dj',
    broadcasts: [liveBroadcast],
    liveMixBookings: withBooking ? [{ product: 'livemix', slot: null, hours: 1, ts: now }] : [],
  };
}

async function scenario(page, label, { withBooking, asOwner }) {
  // Sett localStorage på riktig origin, så reload slik at SPA leser den.
  await page.goto(BASE + '/#/', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.evaluate((u, asOwner) => {
    localStorage.setItem('pv_users', JSON.stringify({ urio: u }));
    if (asOwner) localStorage.setItem('pv_session', JSON.stringify({ username: 'urio', ts: Date.now() }));
    else localStorage.removeItem('pv_session');
  }, urioUser(withBooking), asOwner);
  // En live YouTube-embed holder nettverket aktivt → networkidle2 settler aldri.
  await page.goto(BASE + '/#/u/urio', { waitUntil: 'domcontentloaded', timeout: 45000 });
  await new Promise((r) => setTimeout(r, 4500));
  const o = await page.evaluate((LIVE_ID) => {
    const txt = document.body ? document.body.innerText : '';
    const banner = document.querySelector('#bc-live-banner');
    const embed = document.querySelector(`#bc-live-banner iframe[src*="${LIVE_ID}"]`)
      || document.querySelector(`iframe[src*="${LIVE_ID}"]`);
    return {
      profileFound: !/Bruker ikke funnet/i.test(txt) && /urio/i.test(txt),
      bannerOwner: banner ? banner.getAttribute('data-owner') : null,
      hasEmbed: !!embed,
      embedSrc: embed ? embed.getAttribute('src') : null,
      hasLiveBadge: /LIVE\s*NÅ/i.test(txt),
      hasBookCta: /Book mikse-slot/i.test(txt),
    };
  }, LIVE_ID);
  console.log(`\n▶ ${label}`);
  console.log(`  profil funnet : ${o.profileFound}`);
  console.log(`  LIVE-merke    : ${o.hasLiveBadge}`);
  console.log(`  YouTube-embed : ${o.hasEmbed}${o.embedSrc ? '  ' + o.embedSrc.split('?')[0] : ''}`);
  console.log(`  Book-CTA      : ${o.hasBookCta}`);
  return o;
}

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1000 });

  const A = await scenario(page, 'A) BETALT slot, besøkende  → embed SKAL vises', { withBooking: true, asOwner: false });
  const B = await scenario(page, 'B) UBETALT, eier innlogget → ingen embed, Book-CTA', { withBooking: false, asOwner: true });
  const C = await scenario(page, 'C) UBETALT, besøkende      → tomt, ingen lekkasje', { withBooking: false, asOwner: false });

  const checks = [
    ['A: profil rendrer for besøkende', A.profileFound],
    ['A: ekte YouTube-live-embed vises (betalt)', A.hasEmbed],
    ['A: LIVE NÅ-merke vises', A.hasLiveBadge],
    ['B: INGEN embed for ubetalt eier (gate)', !B.hasEmbed],
    ['B: «Book mikse-slot»-oppfordring vises', B.hasBookCta],
    ['C: INGEN embed-lekkasje for ubetalt besøkende', !C.hasEmbed],
  ];
  console.log('\n── Gate-dom ──');
  let fail = 0;
  for (const [name, ok] of checks) { console.log(`  ${ok ? '✅' : '❌'} ${name}`); if (!ok) fail++; }
  console.log(`\n${fail === 0 ? '✅ ALLE ' + checks.length + ' gate-sjekkene bestått' : '❌ ' + fail + ' sjekk(er) feilet'}`);

  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error('FATAL', e); process.exit(2); });
