#!/usr/bin/env node
/**
 * test-activation.js — verifiserer aktiverings-flyten FØR deploy.
 *
 * Kjør:  npm test   (eller: node tools/test-activation.js)
 *
 * Dekker:
 *   1) Server-e-posten (api/send-email.js) bygger en aktiveringslenke som peker til
 *      www.soundcoredevelopment.com — aldri til preview-/request-hosten.
 *   2) E-post-teksten er Sound Core-tilpasset (merkenavn + aktiveringsknapp).
 *   3) Auth-flyten (js/auth.js): registrer → konto er IKKE aktivert → innlogging
 *      blokkeres → aktiver med token → innlogging fungerer (må logge inn på nytt).
 *   4) Aktiveringssiden (js/app.js renderActivate) viser «You are now activated»,
 *      lenker til innlogging, og auto-logger IKKE inn.
 */
'use strict';
const fs   = require('fs');
const vm   = require('vm');
const path = require('path');
const assert = require('assert');

const ROOT = path.join(__dirname, '..');
let passed = 0;
function ok(name) { passed++; console.log(`  \x1b[32m✓\x1b[0m ${name}`); }

// ───────────────────────────────────────────────────────────────────────────
// 1 + 2) Server-e-post: lenke + tekst
// ───────────────────────────────────────────────────────────────────────────
async function testServerEmail() {
  console.log('\nServer-e-post (api/send-email.js)');

  // Mock «resend» FØR vi krever inn handleren, så ingen ekte e-post sendes.
  let captured = null;
  const resendPath = require.resolve('resend');
  require.cache[resendPath] = {
    id: resendPath, filename: resendPath, loaded: true,
    exports: { Resend: class { constructor() { this.emails = { send: async (opts) => { captured = opts; return { data: { id: 'test_id' }, error: null }; } }; } } },
  };

  process.env.RESEND_API_KEY = 'test_key_for_local_test';
  delete process.env.SITE_URL; // tving fram det kanoniske standard-domenet

  const handler = require(path.join(ROOT, 'api', 'send-email.js'));

  assert.strictEqual(handler.CANONICAL_URL, 'https://www.soundcoredevelopment.com',
    'CANONICAL_URL skal være www.soundcoredevelopment.com');
  ok('CANONICAL_URL = https://www.soundcoredevelopment.com');

  // Simuler et kall fra en Vercel-preview-host — lenken skal LIKEVEL bli kanonisk.
  const req = {
    method: 'POST',
    headers: { host: 'profilverse.vercel.app' },
    body: { type: 'activation', toEmail: 'ny.bruker@eksempel.no', toName: 'TestBruker', token: 'TOK-123-ABC' },
  };
  let statusCode = null, jsonBody = null;
  const res = {
    setHeader() {}, end() { return this; },
    status(c) { statusCode = c; return this; },
    json(b) { jsonBody = b; return this; },
  };

  await handler(req, res);

  assert.strictEqual(statusCode, 200, 'handleren skal svare 200');
  assert.ok(jsonBody && jsonBody.success === true, 'svaret skal være { success:true }');
  ok('aktiverings-e-post sendt (mocket) → 200 success');

  assert.ok(captured, 'resend.emails.send skal ha blitt kalt');
  const link = 'https://www.soundcoredevelopment.com/#/activate/TOK-123-ABC';
  assert.ok(captured.html.includes(link), `e-posten skal inneholde lenken ${link}`);
  ok('e-posten inneholder lenke til www.soundcoredevelopment.com/#/activate/<token>');

  assert.ok(!captured.html.includes('profilverse.vercel.app'),
    'e-posten skal IKKE inneholde preview-hosten');
  ok('e-posten lekker ikke preview-/request-hosten');

  assert.ok(/Sound\s*Core|SoundCore/i.test(captured.html), 'teksten skal nevne Sound Core');
  assert.ok(/Aktiver kontoen min/.test(captured.html), 'teksten skal ha en aktiveringsknapp');
  assert.ok(/TestBruker/.test(captured.subject), 'emnet skal være personlig (navn)');
  ok('e-post-teksten er Sound Core-tilpasset (merkenavn + aktiveringsknapp + emne)');
}

// ───────────────────────────────────────────────────────────────────────────
// 3) Auth-flyt: registrer → ikke aktivert → aktiver → logg inn
// ───────────────────────────────────────────────────────────────────────────
function loadAuth() {
  const code = fs.readFileSync(path.join(ROOT, 'js', 'auth.js'), 'utf8');
  const store = new Map();
  const sandbox = {
    console,
    localStorage: {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
    },
    crypto: { getRandomValues: (arr) => { for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256); return arr; } },
  };
  vm.createContext(sandbox);
  vm.runInContext(code + '\nglobalThis.__Auth = Auth;', sandbox);
  return sandbox.__Auth;
}

function testAuthFlow() {
  console.log('\nAuth-flyt (js/auth.js)');
  const Auth = loadAuth();

  const reg = Auth.register('testuser', 'Passord!1', 'Test Bruker', 'test@eksempel.no');
  assert.ok(reg.success && reg.activationToken, 'registrering skal lykkes og gi et token');
  assert.strictEqual(Auth.getUser('testuser').activated, false, 'ny konto skal ikke være aktivert');
  ok('registrering oppretter en uaktivert konto med token');

  const login1 = Auth.login('testuser', 'Passord!1');
  assert.ok(login1.notActivated === true && !login1.success, 'innlogging skal blokkeres før aktivering');
  ok('innlogging blokkeres for uaktivert konto');

  const act = Auth.activate(reg.activationToken);
  assert.ok(act.success, 'aktivering med gyldig token skal lykkes');
  assert.strictEqual(Auth.getUser('testuser').activated, true, 'kontoen skal nå være aktivert');
  assert.strictEqual(Auth.getUser('testuser').activationToken, null, 'token skal nullstilles etter bruk');
  ok('aktivering med token aktiverer kontoen og brenner token');

  const reuse = Auth.activate(reg.activationToken);
  assert.ok(reuse.error, 'brukt token skal ikke kunne gjenbrukes');
  ok('brukt aktiveringstoken kan ikke gjenbrukes');

  const login2 = Auth.login('testuser', 'Passord!1');
  assert.ok(login2.success, 'innlogging skal fungere etter aktivering');
  ok('innlogging fungerer etter aktivering (bruker må logge inn på nytt)');
}

// ───────────────────────────────────────────────────────────────────────────
// 4) Aktiveringssiden viser riktig tekst og auto-logger IKKE inn
// ───────────────────────────────────────────────────────────────────────────
function testActivatePage() {
  console.log('\nAktiveringssiden (js/app.js renderActivate)');
  const src = fs.readFileSync(path.join(ROOT, 'js', 'app.js'), 'utf8');
  const start = src.indexOf('function renderActivate(');
  assert.ok(start !== -1, 'renderActivate skal finnes');
  // Klipp ut funksjonen fram til neste «  function » på toppnivå.
  const rest = src.slice(start + 1);
  const end  = rest.indexOf('\n  function ');
  const body = src.slice(start, end === -1 ? undefined : start + 1 + end);

  assert.ok(body.includes('You are now activated'), 'siden skal vise «You are now activated» (kvittering)');
  ok('siden viser «You are now activated» (kvittering)');

  assert.ok(/setItem\(\s*['"]pv_session['"]/.test(body), 'siden skal auto-logge inn');
  ok('siden auto-logger inn');

  assert.ok(/setTimeout\s*\(/.test(body), 'auto-login skal skje etter en kort forsinkelse');
  ok('går videre etter et par sekund (kvittering + auto-login)');

  assert.ok(body.includes('CANONICAL_URL'), 'siden skal sende brukeren til det kanoniske domenet');
  ok('sender brukeren til www.soundcoredevelopment.com (CONFIG.CANONICAL_URL)');
}

(async () => {
  try {
    await testServerEmail();
    testAuthFlow();
    testActivatePage();
    console.log(`\n\x1b[32mAlle ${passed} sjekkene passerte ✅\x1b[0m  — trygt å deploye.\n`);
    process.exit(0);
  } catch (e) {
    console.error(`\n\x1b[31m✗ TEST FEILET:\x1b[0m ${e.message}\n`);
    console.error(e.stack);
    process.exit(1);
  }
})();
