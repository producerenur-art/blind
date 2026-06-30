#!/usr/bin/env node
/**
 * test-activation-e2e.js — kjører HELE bruker-flyten ekte (ikke streng-matching):
 * registrer → aktiverings-e-post → aktiver → logg inn → logg ut → logg inn igjen.
 *
 * Kjør:  node tools/test-activation-e2e.js   (eller via npm test)
 *
 * Til forskjell fra test-activation.js (som sjekker auth.js + e-post-tekst + leser
 * renderActivate som tekst) laster denne config.js + auth.js + email.js + app.js
 * inn i ÉN delt sandkasse og kaller de EKTE App-funksjonene (App.doRegister,
 * App.doLogin, App.logout) med en DOM-/nettverks-mock. Da fanger vi feil i selve
 * koblingen mellom skjema → Auth → Email → innlogging.
 *
 * Dekker:
 *   A) Produksjon: e-posten sendes OK → «Sjekk e-posten din», konto IKKE aktivert,
 *      token i behold, ingen økt. Så aktiver med token (slik aktiveringslenka gjør)
 *      → konto aktivert + token brent → logg inn → økt satt + sendt til forsiden.
 *   B) Innlogging med e-post (ikke bare brukernavn) fungerer for aktivert konto.
 *   C) Feil passord og uaktivert konto blir avvist i App.doLogin (med «send på nytt»).
 *   D) Returnerende bruker: logg ut → logg inn igjen → økt gjenopprettes.
 *   E) Dev/offline: hvis e-post-API + EmailJS feiler, auto-aktiveres + auto-innlogges
 *      brukeren (devMode), og sendes til egen profil.
 */
'use strict';
const fs   = require('fs');
const vm   = require('vm');
const path = require('path');
const assert = require('assert');

const ROOT = path.join(__dirname, '..');
let passed = 0;
function ok(name) { passed++; console.log(`  \x1b[32m✓\x1b[0m ${name}`); }

// ── DOM-/nettleser-sandkasse ────────────────────────────────────────────────
// Lett, men ekte nok: getElementById gir «spøkelse»-elementer som husker value
// og innerHTML, slik at vi kan fylle skjema før kall og lese #app etterpå.
function buildSandbox() {
  const store = new Map();                       // localStorage
  const els   = new Map();                       // id → element-spøkelse
  const recorded = { routes: [], toasts: [] };   // det vi vil verifisere
  let fetchImpl = async () => ({ ok: true, json: async () => ({ success: true }) });

  const makeEl = (id) => {
    const t = { id, _html: '', value: '', checked: false, href: '', src: '',
                textContent: '', className: '', style: {}, dataset: {} };
    const classList = { add() {}, remove() {}, toggle() {}, contains() { return false; } };
    return new Proxy(t, {
      get(o, k) {
        if (k === 'innerHTML')  return o._html;
        if (k === 'classList')  return classList;
        if (k in o)             return o[k];
        if (typeof k === 'symbol') return undefined;
        if (k === 'querySelector')         return () => makeEl('_q');
        if (k === 'querySelectorAll')      return () => [];
        if (k === 'getBoundingClientRect') return () => ({ top:0,right:0,bottom:0,left:0,width:0,height:0 });
        if (k === 'appendChild' || k === 'append' || k === 'prepend') return (x) => x;
        if (k === 'closest')    return () => null;
        if (k === 'contains')   return () => false;
        return () => {};                          // ukjent metode → no-op
      },
      set(o, k, v) { if (k === 'innerHTML') o._html = String(v); else o[k] = v; return true; },
    });
  };
  const getEl = (id) => { if (!els.has(id)) els.set(id, makeEl(id)); return els.get(id); };

  const location = { hostname: 'www.soundcoredevelopment.com', origin: 'https://www.soundcoredevelopment.com', pathname: '/', href: '' };

  const document = {
    getElementById: getEl,
    createElement:  (tag) => makeEl('new-' + tag),
    querySelector:  (sel) => { const e = makeEl('_qs'); if (/reg-role/.test(sel)) e.value = 'lytter'; return e; },
    querySelectorAll: () => [],
    addEventListener: () => {}, removeEventListener: () => {},
    get body() { return getEl('body'); },
    get head() { return getEl('head'); },
    get documentElement() { return getEl('html'); },
  };

  const window = {
    location, document, innerWidth: 1024,
    addEventListener: () => {}, removeEventListener: () => {},
    setTimeout, clearTimeout, console,
  };
  window.window = window;

  const localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  };

  // Ekte Router/console; alt annet ukjent → autostub (kjedbar no-op som blir til '').
  const Router = { go: (p) => recorded.routes.push(p), replace: (p) => recorded.routes.push(p), current: () => '/' };

  // Top-level `const`-er i et vm-script havner i scriptets leksikale scope, ikke på
  // global-objektet — og `globalThis.X = …` i en Proxy-kontekst skriver ikke til
  // dette target-objektet. Vi henter derfor ut modulene via en capture-funksjon
  // som scriptet KALLER (target-funksjoner er kallbare fra konteksten).
  const captured = {};
  const target = {
    window, document, location, localStorage, console,
    setTimeout, clearTimeout, setInterval: () => 0, clearInterval: () => {},
    crypto: { getRandomValues: (a) => { for (let i = 0; i < a.length; i++) a[i] = Math.floor(Math.random() * 256); return a; } },
    fetch: (...a) => fetchImpl(...a),
    Router,
    __expose: (o) => Object.assign(captured, o),
    JSON, Object, Array, Date, Math, String, Number, Boolean, RegExp, Error,
    Promise, parseInt, parseFloat, isNaN, encodeURIComponent, decodeURIComponent,
    // Standard innebygde objekter koden bruker (token-gen, lenkebygging m.m.)
    Uint8Array, Uint16Array, Uint32Array, Int8Array, Float32Array, Float64Array,
    ArrayBuffer, DataView, Map, Set, WeakMap, WeakSet, Symbol, BigInt,
    URL, URLSearchParams, TextEncoder, TextDecoder, structuredClone, Intl,
  };

  const autostub = new Proxy(function () {}, {
    get(t, k) { if (k === Symbol.toPrimitive) return () => ''; if (k === 'then') return undefined; return autostub; },
    apply() { return autostub; },
    construct() { return autostub; },
  });

  const ctx = new Proxy(target, {
    has() { return true; },                                   // ingen ReferenceError på frie navn
    get(o, k) { if (k in o) return o[k]; if (k === Symbol.unscopables) return undefined; return autostub; },
  });
  vm.createContext(ctx);

  return {
    ctx, recorded, captured,
    setHostname(h) { location.hostname = h; location.origin = h === '' ? '' : 'https://' + h; },
    setFetch(fn)   { fetchImpl = fn; },
    el: getEl,
    getStore: () => store,
  };
}

function loadApp() {
  const sb = buildSandbox();
  const files = ['js/config.js', 'js/auth.js', 'js/email.js', 'js/app.js']
    .map((f) => fs.readFileSync(path.join(ROOT, f), 'utf8'))
    .join('\n;\n');
  const footer = '\n;__expose({ App, Auth, Email, CONFIG });';
  vm.runInContext(files + footer, sb.ctx, { filename: 'soundcore-bundle.js' });
  sb.App   = sb.captured.App;
  sb.Auth  = sb.captured.Auth;
  sb.Email = sb.captured.Email;
  if (typeof sb.App?.doRegister !== 'function') throw new Error('App.doRegister mangler — bundling/lasting feilet');
  return sb;
}

const PASS = 'Hemmelig!1';

// ── A) Produksjon: registrer → e-post sendt → aktiver → logg inn ─────────────
async function testProdFlow() {
  console.log('\nA) Produksjon: registrer → aktiveringslenke → logg inn');
  const sb = loadApp();
  const { App, Auth } = sb;
  let apiCall = null;
  sb.setFetch(async (url, opts) => { apiCall = { url, body: JSON.parse(opts.body) }; return { ok: true, json: async () => ({ success: true }) }; });

  sb.el('reg-username').value    = 'langbruker';
  sb.el('reg-displayname').value = 'Lang Bruker';
  sb.el('reg-email').value       = 'lang.bruker@eksempel.no';
  sb.el('reg-pass').value        = PASS;
  sb.el('reg-pass2').value       = PASS;

  await App.doRegister();

  assert.ok(apiCall && apiCall.url === '/api/send-email', 'doRegister skal kalle /api/send-email');
  assert.strictEqual(apiCall.body.type, 'activation', 'API-kallet skal være type=activation');
  assert.strictEqual(apiCall.body.toEmail, 'lang.bruker@eksempel.no', 'e-posten skal gå til oppgitt adresse');
  ok('doRegister sender aktiverings-e-post til riktig adresse via /api/send-email');

  const u = Auth.getUser('langbruker');
  assert.ok(u, 'brukeren skal være opprettet');
  assert.strictEqual(u.activated, false, 'kontoen skal IKKE være aktivert før lenka klikkes');
  assert.ok(u.activationToken, 'kontoen skal ha et aktiveringstoken');
  assert.strictEqual(sb.getStore().get('pv_session'), undefined, 'ingen økt skal finnes ennå');
  ok('konto opprettet uaktivert, med token, uten innlogging');

  assert.ok(sb.el('app').innerHTML.includes('Sjekk e-posten din'), '#app skal vise «Sjekk e-posten din»');
  assert.ok(sb.el('app').innerHTML.includes('lang.bruker@eksempel.no'), 'bekreftelsessiden skal vise e-postadressen');
  ok('bekreftelsessiden ber brukeren sjekke e-posten (ærlig — e-posten gikk ut)');

  // Brukeren klikker aktiveringslenka → akkurat det renderActivate gjør:
  const tok = u.activationToken;
  const act = Auth.activate(tok);
  assert.ok(act.success && Auth.getUser('langbruker').activated === true, 'aktivering skal lykkes');
  assert.strictEqual(Auth.getUser('langbruker').activationToken, null, 'token skal brennes etter bruk');
  ok('aktiveringslenka aktiverer kontoen og brenner token');

  // Logg inn (App.doLogin, ekte) med brukernavn
  sb.el('login-user').value = 'langbruker';
  sb.el('login-pass').value = PASS;
  await App.doLogin();
  const sess = JSON.parse(sb.getStore().get('pv_session') || 'null');
  assert.ok(sess && sess.username === 'langbruker', 'økt skal settes ved innlogging');
  assert.ok(sb.recorded.routes.includes('/'), 'innlogging skal sende brukeren til forsiden');
  ok('App.doLogin logger inn aktivert bruker og sender til forsiden');
}

// ── B) Innlogging med e-post  +  C) avvisning  +  D) re-login ────────────────
async function testLoginVariants() {
  console.log('\nB–D) Logg inn med e-post · avvisning · returnerende bruker');
  const sb = loadApp();
  const { App, Auth } = sb;
  sb.setFetch(async () => ({ ok: true, json: async () => ({ success: true }) }));

  // Lag + aktiver en bruker via den ekte flyten
  sb.el('reg-username').value = 'dj_nova';
  sb.el('reg-displayname').value = 'DJ Nova';
  sb.el('reg-email').value = 'nova@eksempel.no';
  sb.el('reg-pass').value = PASS;
  sb.el('reg-pass2').value = PASS;
  await App.doRegister();
  Auth.activate(Auth.getUser('dj_nova').activationToken);

  // B) logg inn med E-POST
  sb.getStore().delete('pv_session');
  sb.el('login-user').value = 'nova@eksempel.no';
  sb.el('login-pass').value = PASS;
  await App.doLogin();
  assert.ok(JSON.parse(sb.getStore().get('pv_session') || 'null')?.username === 'dj_nova', 'innlogging med e-post skal fungere');
  ok('innlogging fungerer med e-postadresse (ikke bare brukernavn)');

  // C1) feil passord
  sb.getStore().delete('pv_session');
  sb.el('login-user').value = 'dj_nova';
  sb.el('login-pass').value = 'FeilPassord!9';
  await App.doLogin();
  assert.strictEqual(sb.getStore().get('pv_session'), undefined, 'feil passord skal ikke gi økt');
  const errPw = sb.el('login-error');
  assert.ok(/feil passord/i.test((errPw.innerHTML || '') + (errPw.textContent || '')), 'feilmelding skal vises ved feil passord');
  ok('feil passord avvises uten økt');

  // C2) uaktivert konto → notActivated + «send på nytt»-knapp
  sb.el('reg-username').value = 'ny_lytter';
  sb.el('reg-displayname').value = 'Ny Lytter';
  sb.el('reg-email').value = 'ny@eksempel.no';
  sb.el('reg-pass').value = PASS;
  sb.el('reg-pass2').value = PASS;
  await App.doRegister();                       // opprettet, IKKE aktivert
  sb.getStore().delete('pv_session');
  sb.el('login-user').value = 'ny_lytter';
  sb.el('login-pass').value = PASS;
  await App.doLogin();
  assert.strictEqual(sb.getStore().get('pv_session'), undefined, 'uaktivert konto skal ikke få økt');
  assert.ok(/aktiver/i.test(sb.el('login-error').innerHTML) && /resendActivationByEmail/.test(sb.el('login-error').innerHTML),
    'uaktivert innlogging skal tilby «send aktiveringslenke på nytt»');
  ok('uaktivert konto avvises og tilbyr ny aktiveringslenke');

  // D) returnerende bruker: logg ut → logg inn igjen
  sb.el('login-user').value = 'dj_nova';
  sb.el('login-pass').value = PASS;
  await App.doLogin();
  assert.ok(sb.getStore().get('pv_session'), 'innlogget før utlogging');
  App.logout();
  assert.strictEqual(sb.getStore().get('pv_session'), undefined, 'utlogging skal fjerne økta');
  ok('App.logout fjerner økta');
  sb.el('login-user').value = 'dj_nova';
  sb.el('login-pass').value = PASS;
  await App.doLogin();
  assert.ok(JSON.parse(sb.getStore().get('pv_session') || 'null')?.username === 'dj_nova', 'skal kunne logge inn igjen senere');
  ok('returnerende bruker kan logge inn igjen senere (samme nettleser)');
}

// ── E) Dev/offline: API + EmailJS feiler → auto-aktiver + auto-login ─────────
async function testDevAutoLogin() {
  console.log('\nE) Dev/offline: e-post-API nede → auto-aktiver + auto-login');
  const sb = loadApp();
  const { App, Auth } = sb;
  sb.setHostname('localhost');
  sb.setFetch(async () => { throw new Error('offline'); });   // tving fram dev-fallback

  sb.el('reg-username').value = 'devbruker';
  sb.el('reg-displayname').value = 'Dev Bruker';
  sb.el('reg-email').value = 'dev@eksempel.no';
  sb.el('reg-pass').value = PASS;
  sb.el('reg-pass2').value = PASS;
  await App.doRegister();

  assert.strictEqual(Auth.getUser('devbruker').activated, true, 'dev-modus skal auto-aktivere kontoen');
  assert.ok(JSON.parse(sb.getStore().get('pv_session') || 'null')?.username === 'devbruker', 'dev-modus skal auto-logge inn');
  assert.ok(sb.recorded.routes.includes('/u/devbruker'), 'dev-modus skal sende brukeren til egen profil');
  ok('uten e-post-server auto-aktiveres og auto-innlogges brukeren (dev)');
}

(async () => {
  try {
    await testProdFlow();
    await testLoginVariants();
    await testDevAutoLogin();
    console.log(`\n\x1b[32mAlle ${passed} ende-til-ende-sjekkene passerte ✅\x1b[0m\n`);
    process.exit(0);
  } catch (e) {
    console.error(`\n\x1b[31m✗ E2E-TEST FEILET:\x1b[0m ${e.message}\n`);
    console.error(e.stack);
    process.exit(1);
  }
})();
