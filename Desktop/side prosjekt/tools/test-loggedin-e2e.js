#!/usr/bin/env node
/**
 * test-loggedin-e2e.js — heile brukarreisa i ein ekte nettlesar mot LIVE.
 *
 * Køyr:
 *   node tools/test-loggedin-e2e.js                      # gjest + registrer + innlogga
 *   node tools/test-loggedin-e2e.js --email d@u.no       # bruk denne adressa (ekte e-post går ut)
 *   node tools/test-loggedin-e2e.js --headful            # sjå nettlesaren
 *   node tools/test-loggedin-e2e.js --base http://…      # anna miljø
 *
 * Fasar:
 *   1) GJEST      — alle ruter, JS-feil pr. rute, innhaldssjekk, at låste ruter låser
 *   2) REGISTRER  — fyller skjemaet, fangar /api/auth + /api/send-email, les kva sida seier
 *   3) AKTIVER    — hentar aktiveringstoken og går aktiveringslenka slik e-posten gjer
 *   4) LOGG INN   — logg ut, logg inn igjen, sjekk at økta held
 *   5) INNLOGGA   — alle ruter på nytt + varselbjelle, profil, editor, innboks,
 *                   innstillingar, studio, community, venner
 *   6) OPPDATERING— kva «nytt i shows/magasin/underground/world» faktisk viser
 *
 * NB — skriptet lagar EIN ekte konto. Sjølve innlogginga bur berre i localStorage,
 * men ProfileSync publiserer den offentlege profilen til den DELTE Supabase-
 * tabellen `profiles`, så testbrukaren blir synleg i feeden og i Discover på live.
 * Skriptet ryddar difor opp til slutt via RPC-en `delete_profile` — den krev at
 * SQL-en i scratchpad/rydd-testprofilar.sql er køyrd i Supabase. Er han ikkje det,
 * seier skriptet frå, og profilen må fjernast manuelt.
 */
'use strict';
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const BASE = (arg('--base', 'https://www.siriusfm.no')).replace(/\/$/, '');
const HEADFUL = argv.includes('--headful');
const SHOTS = arg('--shots', path.join(__dirname, '_shots', 'loggedin'));

// Testbrukaren. Unik pr. køyring så vi aldri kolliderer med ein eksisterande konto.
const STAMP = Math.random().toString(36).slice(2, 7);
const USER = {
  username: `testbruker_${STAMP}`,
  display:  `Test Bruker ${STAMP}`,
  email:    arg('--email', `sirius.e2e.${STAMP}@example.com`),
  pass:     'Test!passord9',
};

// Støy vi ikkje reknar som våre bugs.
const IGNORE = [
  /Failed to load resource/i, /net::ERR_/i, /responded with a status of/i,
  /Google Translate/i, /translate\.google/i, /gstatic/i, /youtube\.com/i,
  /favicon/i, /Content Security Policy/i, /cookie/i, /Tracking Prevention/i,
];
const noise = (t) => IGNORE.some(re => re.test(t));

const results = [];          // {phase, name, ok, info}
const netlog  = [];          // {url, status, reqBody, resBody}
let page, browser;

function rec(phase, name, ok, info = '') {
  results.push({ phase, name, ok, info });
  console.log(`  ${ok ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m'} ${name}${info ? `  \x1b[2m${info}\x1b[0m` : ''}`);
}
const head = (t) => console.log(`\n\x1b[1m${t}\x1b[0m`);
const wait = (ms) => new Promise(r => setTimeout(r, ms));

let bag = [];
const errsSince = () => { const b = bag.slice(); bag = []; return b; };

async function shot(name) {
  try {
    fs.mkdirSync(SHOTS, { recursive: true });
    await page.screenshot({ path: path.join(SHOTS, `${name}.png`) });
  } catch (_) {}
}

/** Gå til ei hash-rute og la SPA-en rendre ferdig.
 *  Å setje location.hash utløyser sjølv ein hashchange i nettlesaren. Dispatch då
 *  IKKJE ein syntetisk i tillegg — ruta ville køyrt to gonger, og eingongs-ruter
 *  (#/activate/:token) ville brent tokenet i første køyring og vist «Invalid link»
 *  i den andre. Syntetisk event berre når hashen allereie står rett. */
async function go(hash, settle = 2200) {
  bag = [];
  await page.evaluate((h) => {
    if (location.hash !== h) location.hash = h;
    else window.dispatchEvent(new HashChangeEvent('hashchange'));
  }, hash);
  await wait(settle);
}

/** Info om gjeldande rute: tekstmengd, faktisk hash, synlege overskrifter.
 *  NB: js/auth.js eksporterer IKKJE window.Auth — `Auth` er ei global leksikalsk
 *  binding (top-level const). Difor `typeof Auth`, ikkje `window.Auth`. */
const probe = () => page.evaluate(() => ({
  hash: location.hash,
  text: (document.getElementById('app')?.innerText || document.body.innerText || '').trim(),
  loggedIn: (typeof Auth !== 'undefined') && !!Auth.current(),
  bell: !!document.getElementById('nav-bell'),
}));

// ── Fase 1 + 5: rutegjennomgang ───────────────────────────────────────────
// [rute, minste rimelege tekstlengd, ord som MÅ finnast (valfritt)]
const ROUTES = [
  ['#/',            300,  null],
  ['#/radio',       400,  null],
  ['#/discover',    300,  null],
  ['#/magazine',    600,  null],
  ['#/shows',       400,  null],
  ['#/underground', 400,  null],
  ['#/world',       600,  null],
  ['#/community',   150,  null],
  ['#/a1',          200,  null],
  ['#/chat',        100,  null],
  // Låste ruter viser ei kort «logg inn»-melding for gjest — difor låg terskel.
  ['#/friends',     25,   null],
  ['#/grupper',     100,  null],
  ['#/share',       60,   null],
  ['#/shop',        200,  null],
  ['#/inbox',       50,   null],
  ['#/settings',    100,  null],
  ['#/edit',        100,  null],
  ['#/studio',      100,  null],
  ['#/minside',     50,   null],
  ['#/unsubscribe', 80,   null],
];

async function walkRoutes(phase) {
  for (const [hash, minLen, must] of ROUTES) {
    await go(hash);
    const p = await probe();
    const errs = errsSince();
    const short = p.text.length < minLen;
    const missing = must && !new RegExp(must, 'i').test(p.text);
    const ok = !errs.length && !short && !missing;
    const info = [
      `${p.text.length}b`,
      p.hash !== hash ? `→ ${p.hash}` : '',
      short ? `TYNN: «${p.text.replace(/\s+/g, ' ').slice(0, 90)}»` : '',
      missing ? `manglar «${must}»` : '',
      errs.length ? errs[0].slice(0, 120) : '',
    ].filter(Boolean).join(' · ');
    rec(phase, hash, ok, info);
  }
}

// ── Hovudløp ──────────────────────────────────────────────────────────────
(async () => {
  browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: HEADFUL ? false : 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1400,1000'],
  });
  page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 1000 });

  page.on('console', m => { if (m.type() === 'error' && !noise(m.text())) bag.push('console: ' + m.text()); });
  page.on('pageerror', e => { const s = String(e && e.message || e); if (!noise(s)) bag.push('pageerror: ' + s); });

  // Logg alle kall til våre eigne API-ar, med kropp inn og ut.
  page.on('response', async (res) => {
    const url = res.url();
    if (!/\/api\//.test(url)) return;
    let resBody = '';
    try { resBody = (await res.text()).slice(0, 400); } catch (_) {}
    let reqBody = '';
    try { reqBody = (res.request().postData() || '').slice(0, 400); } catch (_) {}
    netlog.push({ url: url.replace(BASE, ''), status: res.status(), reqBody, resBody });
  });

  console.log(`\n\x1b[1mSiriusFM ende-til-ende\x1b[0m  ${BASE}`);
  console.log(`Testbrukar: ${USER.username} <${USER.email}>\n`);

  await page.goto(BASE + '/', { waitUntil: 'networkidle2', timeout: 60000 });
  await wait(2500);

  // ── 1) GJEST ────────────────────────────────────────────────────────────
  head('1) GJEST — alle ruter utan innlogging');
  await walkRoutes('gjest');
  await shot('01-gjest-forside');

  // ── 2) REGISTRER ────────────────────────────────────────────────────────
  head('2) REGISTRER — nytt medlem');
  const netBefore = netlog.length;
  await go('#/register', 1500);
  const hasForm = await page.evaluate(() => !!document.getElementById('reg-username'));
  rec('registrer', 'registreringsskjemaet rendrar', hasForm);
  if (!hasForm) { await finish(); return; }

  await page.evaluate((u) => {
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
    set('reg-username', u.username);
    set('reg-displayname', u.display);
    set('reg-email', u.email);
    set('reg-pass', u.pass);
    set('reg-pass2', u.pass);
  }, USER);
  await shot('02-registrer-utfylt');

  await page.evaluate(() => App.doRegister());
  await wait(6000);
  await shot('03-registrer-resultat');

  const afterReg = await probe();
  const regCalls = netlog.slice(netBefore);
  const authCall  = regCalls.find(c => /\/api\/auth/.test(c.url));
  const mailCall  = regCalls.find(c => /\/api\/send-email/.test(c.url));

  rec('registrer', '/api/auth?action=register vart kalla', !!authCall,
      authCall ? `${authCall.status} ${authCall.resBody.slice(0, 90)}` : 'ikkje kalla');
  rec('registrer', 'server lagra kontoen (ikkje 503-fallback)',
      !!authCall && authCall.status !== 503,
      authCall && authCall.status === 503 ? 'FALLBACK til localStorage — kontoen finst berre i denne nettlesaren' : '');
  rec('registrer', 'aktiverings-e-post vart bedd om via /api/send-email', !!mailCall,
      mailCall ? `${mailCall.status} ${mailCall.resBody.slice(0, 90)}` : 'ikkje kalla');
  rec('registrer', 'e-posten gjekk faktisk ut (200 frå Resend)',
      !!mailCall && mailCall.status === 200,
      mailCall && mailCall.status !== 200 ? mailCall.resBody.slice(0, 140) : '');

  const saysCheck = /check your email/i.test(afterReg.text);
  const saysFailed = /couldn't send|could not send/i.test(afterReg.text);
  rec('registrer', 'sida gir ærleg tilbakemelding', saysCheck || saysFailed,
      saysCheck ? '«Check your email!»' : saysFailed ? '«kunne ikkje sende»' : afterReg.text.slice(0, 100));

  // Kontoen skal IKKJE vere innlogga før aktivering.
  rec('registrer', 'ikkje innlogga før aktivering', !afterReg.loggedIn);

  // ── 3) AKTIVER ──────────────────────────────────────────────────────────
  head('3) AKTIVER — går aktiveringslenka slik e-posten gjer');
  const acct = await page.evaluate((u) => {
    const users = JSON.parse(localStorage.getItem('pv_users') || '{}');
    const a = users[u];
    return a ? { activated: a.activated, token: a.activationToken, email: a.email } : null;
  }, USER.username);

  rec('aktiver', 'kontoen finst lokalt med aktiveringstoken', !!(acct && acct.token),
      acct ? `aktivert:${acct.activated}` : 'fann ikkje kontoen');

  // Slik ein EKTE brukar gjer det: opnar lenka frå e-posten på ei anna eining /
  // ein annan nettlesar enn den han registrerte seg i. Fungerer berre dersom
  // kontoen ligg på serveren — ikkje i localStorage til den eine nettlesaren.
  if (acct && acct.token) {
    const ctx = await browser.createBrowserContext();
    const p2 = await ctx.newPage();
    try {
      await p2.goto(`${BASE}/#/activate/${acct.token}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await wait(6000);
      const t2 = await p2.evaluate(() => (document.getElementById('app')?.innerText || '').trim());
      const worked = /activated|welcome/i.test(t2) && !/invalid/i.test(t2);
      rec('aktiver', 'aktiveringslenka verkar i ein ANNAN nettlesar (som frå e-posten)', worked,
          worked ? '' : t2.replace(/\s+/g, ' ').slice(0, 110));
    } catch (e) {
      rec('aktiver', 'aktiveringslenka verkar i ein ANNAN nettlesar (som frå e-posten)', false, e.message);
    }
    await ctx.close().catch(() => {});
  }

  if (acct && acct.token) {
    // Aktiveringssida viser kvittering og sender brukaren vidare etter eit par
    // sekund — les difor tidleg, elles fangar vi berre forsida etterpå.
    await go(`#/activate/${acct.token}`, 900);
    const act = await probe();
    await shot('04-aktivert');
    rec('aktiver', 'aktiveringssida stadfestar', /activated|welcome|aktivert/i.test(act.text), act.text.slice(0, 90));
    await wait(3500);   // la den automatiske vidaresendinga fullføre
    const now = await page.evaluate((u) => (JSON.parse(localStorage.getItem('pv_users') || '{}')[u] || {}), USER.username);
    rec('aktiver', 'kontoen er aktivert', now.activated === true);
    rec('aktiver', 'token er brend (kan ikkje brukast om att)', !now.activationToken);
  }

  // ── 4) LOGG INN ─────────────────────────────────────────────────────────
  head('4) LOGG INN — logg ut og inn igjen');
  await page.evaluate(() => { try { App.logout(); } catch (_) { localStorage.removeItem('pv_session'); } });
  await wait(1500);
  rec('innlogging', 'utlogging fjernar økta', !(await probe()).loggedIn);

  await go('#/login', 1500);
  await page.evaluate((u) => {
    document.getElementById('login-user').value = u.username;
    document.getElementById('login-pass').value = u.pass;
  }, USER);
  await page.evaluate(() => App.doLogin());
  await wait(4000);
  const li = await probe();
  rec('innlogging', 'innlogging med brukarnamn fungerer', li.loggedIn, li.hash);
  await shot('05-innlogga');

  if (!li.loggedIn) {
    const err = await page.evaluate(() => document.getElementById('login-error')?.textContent || '');
    rec('innlogging', 'feilmelding ved innlogging', false, err);
  }

  // Innlogging med e-post i staden for brukarnamn
  await page.evaluate(() => { try { App.logout(); } catch (_) {} });
  await wait(1200);
  await go('#/login', 1200);
  await page.evaluate((u) => {
    document.getElementById('login-user').value = u.email;
    document.getElementById('login-pass').value = u.pass;
  }, USER);
  await page.evaluate(() => App.doLogin());
  await wait(3500);
  rec('innlogging', 'innlogging med e-postadresse fungerer', (await probe()).loggedIn);

  // ── 5) INNLOGGA ─────────────────────────────────────────────────────────
  head('5) INNLOGGA — alle ruter på nytt');
  await walkRoutes('innlogga');

  head('5b) INNLOGGA — funksjonar');
  // Varsel: bjelle i nav (badge-verten) vs. oppføringa i «Mer»-menyen.
  await go('#/', 1500);
  const bell = await page.evaluate(() => !!document.getElementById('nav-bell'));
  rec('funksjon', 'varselbjelle med ulest-merke i nav (#nav-bell)', bell,
      bell ? '' : 'Notify.updateBell() finn ingen vert → ulest-merket kan aldri visast');

  const inMore = await page.evaluate(() => {
    const b = document.getElementById('nav-more-btn');
    if (!b) return { menu: false };
    b.click();
    const panel = document.getElementById('nav-more-panel');
    const hit = panel && [...panel.querySelectorAll('.nav-more-item')]
      .some(el => /notification/i.test(el.innerText));
    return { menu: !!panel, hit: !!hit };
  });
  rec('funksjon', '«Notifications» finst i Mer-menyen', !!inMore.hit,
      inMore.menu ? '' : 'fann ikkje Mer-menyen');
  await shot('06a-mer-meny');

  await page.evaluate(() => { App.closeMoreMenu?.(); Notify.openPanel(); });
  await wait(900);
  const panel = await page.evaluate(() => {
    const p = document.getElementById('sc-notif-panel');
    return p ? { open: true, text: p.innerText.trim().slice(0, 120) } : { open: false };
  });
  rec('funksjon', 'varselpanelet opnar', panel.open, panel.text || '');
  await shot('06b-varselpanel');
  await page.evaluate(() => Notify.closePanel());

  // Eigen profil
  await go(`#/u/${USER.username}`, 3000);
  const prof = await probe();
  rec('funksjon', 'eigen profil rendrar', prof.text.length > 100 && new RegExp(USER.display.split(' ')[0], 'i').test(prof.text),
      `${prof.text.length}b`);
  await shot('07-profil');

  // Profil-editor
  await go('#/edit', 3000);
  const ed = await probe();
  rec('funksjon', 'profil-editoren opnar for innlogga', ed.hash === '#/edit' && ed.text.length > 200, `${ed.text.length}b`);
  await shot('08-editor');

  // Studio (låst for gjest, open for innlogga)
  await go('#/studio', 3500);
  const st = await probe();
  rec('funksjon', 'Studio opnar for innlogga (ikkje redirect til login)', st.hash === '#/studio', st.hash);

  // Community — kan innlogga skrive?
  await go('#/community', 3500);
  const comm = await page.evaluate(() => {
    const t = document.getElementById('app')?.innerText || '';
    const box = document.querySelector('textarea, [contenteditable="true"], input[placeholder*="post" i], input[placeholder*="share" i]');
    return { len: t.length, hasComposer: !!box, txt: t.slice(0, 140) };
  });
  rec('funksjon', 'Community lastar for innlogga', comm.len > 150, `${comm.len}b`);
  rec('funksjon', 'Community har skrivefelt for innlogga', comm.hasComposer, comm.hasComposer ? '' : comm.txt);
  await shot('09-community');

  // Innstillingar — alle faner (berre den aktive er synleg, så les innerHTML)
  await go('#/settings', 2500);
  const setg = await page.evaluate(() => {
    const app = document.getElementById('app');
    const tabs = [...app.querySelectorAll('.settings-tab-btn')].map(b => b.innerText.trim());
    const html = app.innerHTML;
    return {
      tabs,
      len: html.length,
      // Kan brukaren styre e-postutsendinga (den vekentlege «kva er nytt»-e-posten)?
      emailPref: /unsubscribe|marketing|newsletter|email notif/i.test(html),
    };
  });
  rec('funksjon', 'innstillingar rendrar med faner', setg.tabs.length >= 4, setg.tabs.join(' · '));
  rec('funksjon', 'innstillingar lar deg styre e-post-utsending', setg.emailPref,
      setg.emailPref ? '' : 'ingen avmelding/e-postval i Innstillingar — berre via #/unsubscribe-lenka i e-posten');
  await shot('10-innstillingar');

  // ── 6) OPPDATERINGAR ────────────────────────────────────────────────────
  head('6) NYTT INNHALD — shows · magasin · underground · world');
  for (const [hash, label] of [['#/shows', 'Shows'], ['#/magazine', 'Magasin'], ['#/underground', 'Underground'], ['#/world', 'World']]) {
    await go(hash, 3500);
    const d = await page.evaluate(() => {
      const app = document.getElementById('app');
      const t = app?.innerText || '';
      // Berre ei EKTE tomtilstand tel — ordet må stå åleine på ei linje, ikkje
      // vere ein tilfeldig delstreng i brødteksten («no shows» inni ei setning).
      const emptyLine = t.split('\n').map(s => s.trim()).find(s =>
        /^(no [a-z ]+ (yet|found|here)|nothing here yet|coming soon|ingen .* enno)\.?$/i.test(s));
      return {
        len: t.length,
        cards: app ? app.querySelectorAll('article, .card, [class*="card"], [class*="item"]').length : 0,
        empty: emptyLine || '',
        head: t.split('\n').filter(Boolean).slice(0, 4).join(' · ').slice(0, 130),
      };
    });
    rec('innhald', `${label} har innhald`, d.len > 400 && d.cards > 0 && !d.empty,
        `${d.len}b · ${d.cards} kort${d.empty ? ` · TOM: «${d.empty}»` : ''} · ${d.head}`);
    await shot(`11-${label.toLowerCase()}`);
  }

  // ── 7) RYDD OPP ─────────────────────────────────────────────────────────
  // Fjern den publiserte testprofilen igjen, så han ikkje blir liggjande i
  // feeden/Discover på live. Vi held per-profil-hemmelegheita frå localStorage.
  head('7) RYDD OPP — fjern testprofilen frå den delte databasen');
  const cleaned = await page.evaluate(async (u) => {
    const secret = (JSON.parse(localStorage.getItem('sc_profile_secrets') || '{}'))[u];
    if (!secret) return { ok: false, why: 'fann ikkje sync-hemmelegheita lokalt' };
    try {
      const r = await fetch(`${CONFIG.SUPABASE_URL}/rest/v1/rpc/delete_profile`, {
        method: 'POST',
        headers: {
          apikey: CONFIG.SUPABASE_ANON_KEY,
          Authorization: 'Bearer ' + CONFIG.SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ p_username: u, p_secret: secret }),
      });
      if (r.ok) return { ok: true };
      const body = await r.text();
      return { ok: false, why: `${r.status} ${body.slice(0, 120)}` };
    } catch (e) { return { ok: false, why: e.message }; }
  }, USER.username);
  rec('opprydding', 'testprofilen fjerna frå delt database', cleaned.ok,
      cleaned.ok ? '' : `${cleaned.why} — fjern «${USER.username}» manuelt (sjå rydd-testprofilar.sql)`);

  await finish();
})().catch(async (e) => {
  console.error('\n\x1b[31mFATAL\x1b[0m', e && e.stack || e);
  try { await shot('99-fatal'); await browser.close(); } catch (_) {}
  process.exit(2);
});

async function finish() {
  head('API-kall i løpet av testen');
  const seen = new Map();
  for (const c of netlog) {
    const k = c.url.split('?')[0] + ' ' + c.status;
    if (!seen.has(k)) seen.set(k, c);
  }
  for (const [k, c] of seen) console.log(`  ${c.status === 200 ? '\x1b[32m' : '\x1b[31m'}${k}\x1b[0m  ${c.resBody.slice(0, 110).replace(/\s+/g, ' ')}`);

  head('Oppsummering');
  const byPhase = {};
  for (const r of results) {
    byPhase[r.phase] = byPhase[r.phase] || { ok: 0, bad: 0 };
    r.ok ? byPhase[r.phase].ok++ : byPhase[r.phase].bad++;
  }
  for (const [p, n] of Object.entries(byPhase)) console.log(`  ${p.padEnd(12)} ${n.ok} ok · ${n.bad} feil`);
  const failed = results.filter(r => !r.ok);
  if (failed.length) {
    console.log(`\n\x1b[31mFeil (${failed.length}):\x1b[0m`);
    failed.forEach(f => console.log(`  ✗ [${f.phase}] ${f.name} — ${f.info}`));
  }
  console.log(`\nSkjermbilete: ${SHOTS}`);
  console.log(`Testkonto: ${USER.username} / ${USER.email}\n`);
  try { await browser.close(); } catch (_) {}
  process.exit(failed.length ? 1 : 0);
}
