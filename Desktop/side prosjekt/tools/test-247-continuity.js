#!/usr/bin/env node
/**
 * test-247-continuity.js — sjekker at SiriusFM 24/7 Cycle IKKE hakkar/stoppar
 * når du bytter rute (URL) på sida, mot LIVE siriusfm.no. Køyrer to modus:
 *   - GJEST:     start 24/7, gå gjennom alle ruter, sjekk lyden aldri stoppar.
 *   - INNLOGGA:  same, men med ein seeda innlogga session (som testar dei
 *                ekstra modulane som slår seg på ved innlogging — presence/sync).
 * I tillegg: éin eigen test av ein FAKTISK hard refresh (page.reload) midt i
 * avspeling — dette STOPPER alltid lyden (nettlesaren nullstiller heile JS-
 * minnet), det er forventa og kan ikkje fiksast. Det testen sjekkar er at
 * tilstanden etterpå er REIN — ingen hengande "spiller"-indikator, ingen
 * JS-feil, ingen "hakkete" auto-reconnect-loop.
 *
 * Køyr: node tools/test-247-continuity.js
 */
'use strict';
const puppeteer = require('puppeteer-core');

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = 'https://www.siriusfm.no';
const wait = (ms) => new Promise(r => setTimeout(r, ms));

const ROUTES = [
  '#/', '#/radio', '#/discover', '#/magazine', '#/shows', '#/underground',
  '#/world', '#/community', '#/a1', '#/chat', '#/friends', '#/grupper',
  '#/share', '#/shop', '#/inbox', '#/settings', '#/edit', '#/studio',
  '#/minside', '#/unsubscribe',
];

const results = [];
function rec(name, ok, info = '') {
  results.push({ name, ok, info });
  console.log(`  ${ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${name}${info ? `  \x1b[2m${info}\x1b[0m` : ''}`);
}

async function newPage(browser, { loggedIn }) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  const ua = (await browser.userAgent()).replace('HeadlessChrome', 'Chrome');
  await page.setUserAgent(ua);

  if (loggedIn) {
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

  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + String(e && e.message || e)));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  page.on('response', (res) => {
    if (res.status() >= 400) errs.push(`http ${res.status()}: ${res.url()}`);
  });
  page._errs = errs;
  return page;
}

async function start247(page) {
  await page.goto(`${BASE}/#/radio`, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.waitForSelector('#rbtn-sirius247', { timeout: 20000 });
  await page.evaluate(() => Radio247.toggle());
  const started = await page.waitForFunction(() => {
    const a = document.getElementById('audio-engine');
    return !!a && !a.paused && a.readyState >= 3 && a.currentTime > 0;
  }, { timeout: 45000 }).then(() => true).catch(() => false);
  return started;
}

async function audioState(page) {
  return page.evaluate(() => {
    const a = document.getElementById('audio-engine');
    return {
      src: a ? a.src : null,
      paused: a ? a.paused : null,
      t: a ? a.currentTime : null,
      r247active: (typeof Radio247 !== 'undefined') ? Radio247.isActive() : null,
    };
  });
}

async function walkWhilePlaying(page, label) {
  const before = await audioState(page);
  if (before.paused || !before.src) { rec(`${label}: 24/7 spiller før rutegjennomgang`, false, JSON.stringify(before)); return; }
  rec(`${label}: 24/7 spiller før rutegjennomgang`, true, `t=${before.t.toFixed(1)}s`);

  let brokeAt = null;
  let lastT = before.t;
  const srcBefore = before.src;

  const allErrs = [];

  // Lyd-kontinuiteten er hovudsaka — loopen stoppar IKKJE ved urelaterte
  // nettverks-/websocket-feil (Gun.js-relay osv.), berre om lyden sjølv
  // faktisk stoppar/byter kjelde. Alle feil vert likevel samla og rapportert
  // separat under, så dei ikkje druknar ei ekte lyd-kontinuitetsfeil.
  for (const hash of ROUTES) {
    page._errs.length = 0;
    await page.evaluate((h) => { location.hash = h; }, hash);
    await wait(1400);
    const s = await audioState(page);
    allErrs.push(...page._errs.slice().map(e => `${hash}: ${e}`));
    const stillSameSrc = s.src === srcBefore;
    const stillPlaying = s.paused === false;
    if ((!stillSameSrc || !stillPlaying) && !brokeAt) brokeAt = { hash, s };
    lastT = s.t;
  }

  if (brokeAt) {
    rec(`${label}: 24/7 held fram uavbrote gjennom alle ${ROUTES.length} rutene`, false,
        `brakk på ${brokeAt.hash} — ${JSON.stringify(brokeAt.s)}`);
  } else {
    const after = await audioState(page);
    rec(`${label}: 24/7 held fram uavbrote gjennom alle ${ROUTES.length} rutene`, true,
        `t: ${before.t.toFixed(1)}s → ${after.t.toFixed(1)}s, same src, aldri pauset`);
  }
  const uniqErrs = [...new Set(allErrs)];
  if (uniqErrs.length) {
    rec(`${label}: andre feil undervegs (ikkje lyd-relatert — rapportert eige)`, false,
        `${uniqErrs.length} stk — ${uniqErrs.slice(0, 5).join(' | ').slice(0, 400)}`);
  }
}

async function testLoginTransition(browser) {
  const page = await newPage(browser, { loggedIn: false });
  const started = await start247(page);
  rec('gjest→innlogga: 24/7 starta som gjest', started);
  if (!started) { await page.close(); return; }

  const before = await audioState(page);
  // Simuler ekte innlogging midt i avspeling: seed session + kjør SAMME
  // etterlogg-steg som App.doLogin() (renderNav + Router.go('/')) — utan å
  // faktisk poste passord, sidan me berre skal teste at UI-overgangen ikkje
  // rører spelaren.
  await page.evaluate(() => {
    const u = {
      username: 'testlyttar2', displayName: 'Test Lyttar 2', email: 'test2@siriusfm.no',
      createdAt: Date.now(), activated: true, bio: '', links: [], mediaIds: [], musicIds: [],
      followers: [], following: [], events: [], friends: [], friendRequests: [], sentRequests: [],
      mixIds: [], subscription: 'free', role: 'lytter', profileVisibility: 'public',
    };
    const users = JSON.parse(localStorage.getItem('pv_users') || '{}');
    users.testlyttar2 = u;
    localStorage.setItem('pv_users', JSON.stringify(users));
    localStorage.setItem('pv_session', JSON.stringify({ username: 'testlyttar2', ts: Date.now() }));
    Router.go('/');
  });
  await wait(1500);
  const after = await audioState(page);
  const who = await page.evaluate(() => (typeof Auth !== 'undefined' && Auth.current()?.username) || null);
  const ok = who === 'testlyttar2' && after.paused === false && after.src === before.src && after.t >= before.t - 0.25;
  rec('gjest→innlogga: 24/7 held fram uavbrote gjennom sjølve innloggingsovergangen', ok,
      `innlogga som ${who}, t: ${before.t.toFixed(1)}s → ${after.t.toFixed(1)}s`);
  await page.close();
}

async function testHardRefresh(browser) {
  const page = await newPage(browser, { loggedIn: true });
  const started = await start247(page);
  rec('hard refresh: 24/7 starta før refresh', started);
  if (!started) { await page.close(); return; }

  page._errs.length = 0;
  await page.reload({ waitUntil: 'networkidle2', timeout: 60000 });
  await wait(2500);
  const errs = page._errs.slice();

  const clean = await page.evaluate(() => {
    const a = document.getElementById('audio-engine');
    return {
      paused: a ? a.paused : null,
      t: a ? a.currentTime : null,
      r247active: (typeof Radio247 !== 'undefined') ? Radio247.isActive() : null,
      // Sjekk at ingen del av UI framleis PÅSTÅR at det spiller (ville vore
      // ein "spøkelses"-bug — ekte lyd er stoppa av nettlesaren, men UI lyg).
      claimsLive: !!document.querySelector('.radio-live-badge, .hr-dot-live'),
    };
  });
  const asExpected = clean.paused === true && clean.r247active === false && !clean.claimsLive;
  rec('hard refresh: lyden stoppar reint (forventa, ikkje ein bug) — ingen spøkelses-"LIVE"-tilstand', asExpected,
      JSON.stringify(clean));
  rec('hard refresh: ingen JS-feil under/etter reload', errs.length === 0,
      errs.length ? errs[0].slice(0, 160) : '');
  await page.close();
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio', '--no-sandbox'],
  });

  console.log(`\n\x1b[1mSiriusFM 24/7 Cycle — kontinuitet\x1b[0m  ${BASE}\n`);

  console.log('1) GJEST — 24/7 gjennom alle ruter');
  const pGjest = await newPage(browser, { loggedIn: false });
  if (await start247(pGjest)) await walkWhilePlaying(pGjest, 'gjest');
  else rec('gjest: 24/7 starta i det heile', false);
  await pGjest.close();

  console.log('\n2) INNLOGGA — 24/7 gjennom alle ruter');
  const pIn = await newPage(browser, { loggedIn: true });
  if (await start247(pIn)) await walkWhilePlaying(pIn, 'innlogga');
  else rec('innlogga: 24/7 starta i det heile', false);
  await pIn.close();

  console.log('\n3) GJEST → INNLOGGA midt i avspeling');
  await testLoginTransition(browser);

  console.log('\n4) HARD REFRESH midt i avspeling');
  await testHardRefresh(browser);

  await browser.close();

  console.log('\n\x1b[1mOppsummering\x1b[0m');
  const failed = results.filter(r => !r.ok);
  console.log(`  ${results.length - failed.length}/${results.length} ok`);
  if (failed.length) {
    console.log(`\n\x1b[31mFeil:\x1b[0m`);
    failed.forEach(f => console.log(`  ✗ ${f.name} — ${f.info}`));
  }
  process.exit(failed.length ? 1 : 0);
})().catch(e => { console.error('\n\x1b[31mFATAL\x1b[0m', e && e.stack || e); process.exit(2); });
