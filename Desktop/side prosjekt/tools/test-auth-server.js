#!/usr/bin/env node
/**
 * test-auth-server.js — verifiserer den nye server-side kontolagringen FØR deploy.
 *
 * Kjør:  npm test   (eller: node tools/test-auth-server.js)
 *
 * Dekker (uten å røre den ekte Supabase-databasen — bruker en in-memory mock):
 *   1) Passord-hashing (scrypt): roundtrip, feil passord avvises, tukling avvises.
 *   2) Validering speiler reglene i js/auth.js (brukernavn/passord/e-post).
 *   3) publicUser lekker ALDRI password_hash eller tokens til klienten.
 *   4) register: global unik e-post + unikt brukernavn håndheves; ny konto er
 *      uaktivert; aktiverings-e-post sendes server-side; e-postfeil rapporteres ærlig.
 *   5) login: feil passord avvises, uaktivert konto blokkeres, aktivert logger inn.
 *   6) activate: token aktiverer kontoen og kan ikke gjenbrukes.
 *   7) forgot: svarer generisk (ingen kontooppramsing) og setter reset-token.
 *   8) reset: utløpt/ugyldig token avvises; gyldig token bytter passord.
 *   9) Klient-kabling: accountServer.js, app.js, index.html og email.js er korrekt wiret.
 */
'use strict';
const fs   = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT = path.join(__dirname, '..');
let passed = 0;
function ok(name) { passed++; console.log(`  \x1b[32m✓\x1b[0m ${name}`); }

// ── Mock «resend» FØR vi krever inn api/auth.js (som krever send-email.js → resend) ──
let mockEmailResult = { data: { id: 'test_id' }, error: null };
const sentEmails = [];
const resendPath = require.resolve('resend');
require.cache[resendPath] = {
  id: resendPath, filename: resendPath, loaded: true,
  exports: { Resend: class { constructor() { this.emails = { send: async (opts) => { sentEmails.push(opts); return mockEmailResult; } }; } } },
};
process.env.RESEND_API_KEY = 'test_key_for_local_test';

const { _helpers } = require('../api/auth.js');
const { validateRegister, validatePassword, hashPassword, verifyPassword, publicUser, ACTIONS } = _helpers;

// ── In-memory Supabase-mock (chainable query builder + thenable) ────────────
function makeDb(store) {
  return {
    from(table) {
      return {
        table, op: 'select', filters: [], _insert: null, _patch: null, _single: false, _maybe: false,
        select() { if (this.op === 'select') this.op = 'select'; return this; },
        insert(row) { this.op = 'insert'; this._insert = row; return this; },
        update(patch) { this.op = 'update'; this._patch = patch; return this; },
        eq(col, val) { this.filters.push({ col, val, ci: false }); return this; },
        ilike(col, val) { this.filters.push({ col, val: String(val).toLowerCase(), ci: true }); return this; },
        maybeSingle() { this._maybe = true; return Promise.resolve(this._run()); },
        single() { this._single = true; return Promise.resolve(this._run()); },
        then(onF, onR) { return Promise.resolve(this._run()).then(onF, onR); },
        _match(r) {
          return this.filters.every(f => {
            const v = f.ci ? String(r[f.col] ?? '').toLowerCase() : r[f.col];
            return v === f.val;
          });
        },
        _run() {
          const rows = store[this.table] || (store[this.table] = []);
          if (this.op === 'insert') {
            const row = this._insert;
            if (rows.some(r => r.username === row.username))
              return { data: null, error: { code: '23505', message: 'duplicate username' } };
            if (rows.some(r => String(r.email).toLowerCase() === String(row.email).toLowerCase()))
              return { data: null, error: { code: '23505', message: 'duplicate email' } };
            rows.push({ ...row });
            return { data: { ...row }, error: null };
          }
          if (this.op === 'update') {
            const matched = rows.filter(r => this._match(r));
            matched.forEach(r => Object.assign(r, this._patch));
            if (this._single) return { data: matched[0] ? { ...matched[0] } : null, error: matched[0] ? null : { message: 'no row' } };
            return { data: matched.map(r => ({ ...r })), error: null };
          }
          const matched = rows.filter(r => this._match(r));
          if (this._single) return { data: matched[0] ? { ...matched[0] } : null, error: matched[0] ? null : { message: 'no row' } };
          if (this._maybe)  return { data: matched[0] ? { ...matched[0] } : null, error: null };
          return { data: matched.map(r => ({ ...r })), error: null };
        },
      };
    },
  };
}

// ───────────────────────────────────────────────────────────────────────────
function testHelpers() {
  console.log('\n1–3) Hjelpere: hashing, validering, publicUser');

  const h = hashPassword('Hemmelig!23');
  assert.ok(h.includes(':') && h.length > 40, 'hash har salt:hash-form');
  assert.ok(verifyPassword('Hemmelig!23', h), 'riktig passord verifiseres');
  assert.ok(!verifyPassword('feil passord', h), 'feil passord avvises');
  assert.ok(!verifyPassword('Hemmelig!23', h.replace(/.$/, '0')), 'tuklet hash avvises');
  assert.notStrictEqual(hashPassword('x!1aaa'), hashPassword('x!1aaa'), 'salt gir ulike hasher');
  ok('scrypt: roundtrip + feil/tukling avvist + unik salt');

  assert.strictEqual(validateRegister({ username: 'ab', password: 'Aa!111', email: 'a@b.no' }), 'Brukernavn må være minst 3 tegn');
  assert.strictEqual(validateRegister({ username: 'bad name', password: 'Aa!111', email: 'a@b.no' }), 'Brukernavn kan bare ha bokstaver, tall og _');
  assert.strictEqual(validateRegister({ username: 'goodname', password: 'short', email: 'a@b.no' }), 'Passord må være minst 6 tegn');
  assert.strictEqual(validateRegister({ username: 'goodname', password: 'nospecial1', email: 'a@b.no' }), 'Passord må inneholde minst ett spesialtegn (f.eks. !@#$%)');
  assert.strictEqual(validateRegister({ username: 'goodname', password: 'Good!23', email: 'bad' }), 'Ugyldig e-postadresse');
  assert.strictEqual(validateRegister({ username: 'goodname', password: 'Good!23', email: 'a@b.no' }), null);
  assert.strictEqual(validatePassword('Good!23'), null);
  assert.ok(validatePassword('short'));
  ok('validering speiler js/auth.js-reglene');

  const pub = publicUser({ username: 'kari', email: 'kari@x.no', password_hash: 'salt:secret', display_name: 'Kari', role: 'dj', activated: true, activation_token: 'tok', reset_token: 'rtok', created_at: 123 });
  assert.deepStrictEqual(Object.keys(pub).sort(), ['activated', 'createdAt', 'displayName', 'email', 'role', 'username']);
  assert.ok(!('password_hash' in pub) && !('activation_token' in pub) && !('reset_token' in pub), 'ingen hemmeligheter lekker');
  ok('publicUser lekker aldri passord/tokens');
}

async function testRegisterLoginFlow() {
  console.log('\n4–6) register → login → activate (mot mock-DB)');
  const store = { accounts: [] };
  const db = makeDb(store);
  sentEmails.length = 0;
  mockEmailResult = { data: { id: 'test_id' }, error: null };

  // register
  let r = await ACTIONS.register(db, { username: 'kari', displayName: 'Kari', email: 'Kari@Eksempel.no', password: 'Hemmelig!23', role: 'dj' });
  assert.strictEqual(r.status, 201, 'register 201');
  assert.ok(r.body.success && r.body.needsActivation, 'krever aktivering');
  assert.strictEqual(r.body.user.activated, false, 'ny konto uaktivert');
  assert.ok(!('password_hash' in r.body.user), 'svaret lekker ikke hash');
  assert.ok(!('activationToken' in r.body) && !r.body.token, 'token returneres ALDRI til klient');
  assert.strictEqual(sentEmails.length, 1, 'aktiverings-e-post sendt server-side');
  assert.ok(r.body.emailSent, 'emailSent=true');
  ok('register: konto opprettet, uaktivert, e-post sendt, token skjult');

  // duplikat e-post (annet casing) avvises
  let dup = await ACTIONS.register(db, { username: 'kari2', displayName: 'K2', email: 'kari@eksempel.no', password: 'Hemmelig!23' });
  assert.strictEqual(dup.status, 409, 'duplikat e-post → 409');
  assert.strictEqual(dup.body.error, 'E-postadressen er allerede i bruk');
  ok('register: global unik e-post håndheves (case-insensitivt)');

  // duplikat brukernavn avvises
  let dupU = await ACTIONS.register(db, { username: 'kari', displayName: 'K', email: 'annen@eksempel.no', password: 'Hemmelig!23' });
  assert.strictEqual(dupU.status, 409, 'duplikat brukernavn → 409');
  assert.strictEqual(dupU.body.error, 'Brukernavn er tatt');
  ok('register: unikt brukernavn håndheves');

  // e-postfeil rapporteres ærlig (konto opprettes likevel)
  mockEmailResult = { data: null, error: { message: 'Resend avviste mottakeren' } };
  let ef = await ACTIONS.register(db, { username: 'pal', displayName: 'Pål', email: 'pal@eksempel.no', password: 'Hemmelig!23' });
  assert.strictEqual(ef.status, 201, 'konto opprettes selv om e-post feiler');
  assert.ok(!ef.body.emailSent && ef.body.emailError === 'Resend avviste mottakeren', 'emailError rapporteres');
  ok('register: e-postfeil rapporteres ærlig (ingen stille suksess)');
  mockEmailResult = { data: { id: 'test_id' }, error: null };

  // login før aktivering → blokkert
  let l0 = await ACTIONS.login(db, { usernameOrEmail: 'kari', password: 'Hemmelig!23' });
  assert.strictEqual(l0.status, 403, 'uaktivert login → 403');
  assert.ok(l0.body.notActivated, 'notActivated-flagg satt');
  ok('login: uaktivert konto blokkeres');

  // feil passord
  let lbad = await ACTIONS.login(db, { usernameOrEmail: 'kari', password: 'feil!99' });
  assert.strictEqual(lbad.status, 401, 'feil passord → 401');
  ok('login: feil passord avvises');

  // aktiver
  const tok = store.accounts.find(a => a.username === 'kari').activation_token;
  assert.ok(tok, 'token finnes i DB');
  let act = await ACTIONS.activate(db, { token: tok });
  assert.strictEqual(act.status, 200, 'activate 200');
  assert.ok(act.body.user.activated, 'kontoen er nå aktivert');
  assert.strictEqual(store.accounts.find(a => a.username === 'kari').activation_token, null, 'token nullstilt');
  ok('activate: token aktiverer kontoen');

  // token kan ikke gjenbrukes
  let actAgain = await ACTIONS.activate(db, { token: tok });
  assert.strictEqual(actAgain.status, 400, 'gjenbrukt token → 400');
  ok('activate: token kan ikke gjenbrukes');

  // login etter aktivering — på brukernavn OG på e-post
  let l1 = await ACTIONS.login(db, { usernameOrEmail: 'kari', password: 'Hemmelig!23' });
  assert.strictEqual(l1.status, 200, 'aktivert login (brukernavn) → 200');
  let l2 = await ACTIONS.login(db, { usernameOrEmail: 'KARI@eksempel.no', password: 'Hemmelig!23' });
  assert.strictEqual(l2.status, 200, 'aktivert login (e-post, annet casing) → 200');
  ok('login: aktivert konto logger inn (brukernavn + e-post)');
}

async function testForgotReset() {
  console.log('\n7–8) forgot → reset (mot mock-DB)');
  const store = { accounts: [] };
  const db = makeDb(store);
  sentEmails.length = 0;
  mockEmailResult = { data: { id: 'test_id' }, error: null };

  await ACTIONS.register(db, { username: 'ola', displayName: 'Ola', email: 'ola@eksempel.no', password: 'Start!23' });
  const row = store.accounts.find(a => a.username === 'ola');
  row.activated = true;

  // forgot for ukjent e-post → generisk success, ingen e-post
  sentEmails.length = 0;
  let f0 = await ACTIONS.forgot(db, { email: 'finnesikke@eksempel.no' });
  assert.strictEqual(f0.status, 200, 'forgot (ukjent) → 200 generisk');
  assert.ok(f0.body.success && !f0.body.error, 'avslører ikke at kontoen mangler');
  assert.strictEqual(sentEmails.length, 0, 'ingen e-post for ukjent adresse');
  ok('forgot: generisk svar (ingen kontooppramsing)');

  // forgot for kjent e-post → setter token + sender e-post
  let f1 = await ACTIONS.forgot(db, { email: 'ola@eksempel.no' });
  assert.strictEqual(f1.status, 200, 'forgot (kjent) → 200');
  assert.ok(!f1.body.token, 'reset-token returneres ALDRI til klient');
  const rtok = store.accounts.find(a => a.username === 'ola').reset_token;
  assert.ok(rtok, 'reset-token satt i DB');
  assert.strictEqual(sentEmails.length, 1, 'reset-e-post sendt');
  ok('forgot: kjent e-post setter token + sender e-post (token skjult)');

  // reset med utløpt token avvises
  store.accounts.find(a => a.username === 'ola').reset_expiry = Date.now() - 1000;
  let rExp = await ACTIONS.reset(db, { token: rtok, password: 'NyttPass!9' });
  assert.strictEqual(rExp.status, 400, 'utløpt token → 400');
  ok('reset: utløpt token avvises');

  // reset med gyldig token bytter passord
  store.accounts.find(a => a.username === 'ola').reset_expiry = Date.now() + 60000;
  let rOk = await ACTIONS.reset(db, { token: rtok, password: 'NyttPass!9' });
  assert.strictEqual(rOk.status, 200, 'gyldig reset → 200');
  assert.strictEqual(store.accounts.find(a => a.username === 'ola').reset_token, null, 'token nullstilt etter reset');
  let lNew = await ACTIONS.login(db, { usernameOrEmail: 'ola', password: 'NyttPass!9' });
  assert.strictEqual(lNew.status, 200, 'login med nytt passord virker');
  let lOldGone = await ACTIONS.login(db, { usernameOrEmail: 'ola', password: 'Start!23' });
  assert.strictEqual(lOldGone.status, 401, 'gammelt passord virker ikke lenger');
  ok('reset: gyldig token bytter passord (gammelt slutter å virke)');
}

function testClientWiring() {
  console.log('\n9) Klient-kabling');
  const accountServer = fs.readFileSync(path.join(ROOT, 'js/accountServer.js'), 'utf8');
  const app   = fs.readFileSync(path.join(ROOT, 'js/app.js'), 'utf8');
  const email = fs.readFileSync(path.join(ROOT, 'js/email.js'), 'utf8');
  const auth  = fs.readFileSync(path.join(ROOT, 'js/auth.js'), 'utf8');
  const html  = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const mig   = fs.readFileSync(path.join(ROOT, 'supabase/migrations/0003_accounts.sql'), 'utf8');
  const sendEmail = fs.readFileSync(path.join(ROOT, 'api/send-email.js'), 'utf8');
  const unsub = fs.readFileSync(path.join(ROOT, 'js/unsubscribe.js'), 'utf8');
  const mig4  = fs.readFileSync(path.join(ROOT, 'supabase/migrations/0004_marketing_opt_out.sql'), 'utf8');

  for (const m of ['register', 'login', 'activate', 'forgot', 'reset', 'resend'])
    assert.ok(new RegExp(`async ${m}\\b|${m}\\(`).test(accountServer), `AccountServer.${m} finnes`);
  assert.ok(/window\.AccountServer/.test(accountServer), 'AccountServer eksponert på window');
  ok('accountServer.js definerer alle metoder + window-eksport');

  assert.ok(/AccountServer\.login\(/.test(app), 'doLogin bruker server');
  assert.ok(/AccountServer\.register\(/.test(app), 'doRegister bruker server');
  assert.ok(/AccountServer\.forgot\(/.test(app), 'doForgotPassword bruker server');
  assert.ok(/AccountServer\.reset\(/.test(app), 'doResetPassword bruker server');
  assert.ok(/AccountServer\.activate\(/.test(app), 'renderActivate bruker server');
  assert.ok(/AccountServer\.resend\(/.test(app), 'resend bruker server');
  ok('app.js kaller AccountServer på alle 6 stedene');

  assert.ok(/adoptServerUser/.test(auth), 'Auth.adoptServerUser finnes');
  assert.ok(/js\/accountServer\.js/.test(html), 'index.html laster accountServer.js');
  ok('auth.js + index.html er wiret');

  // email.js: ingen stille prod-auto-aktivering — dev-modus i sendActivation er localhost-gated.
  const sendAct = email.slice(email.indexOf('async function sendActivation'), email.indexOf('async function sendPasswordReset'));
  assert.ok(/if \(isLocalhost\(\)\)/.test(sendAct), 'sendActivation auto-aktiverer kun på localhost');
  assert.ok(/return \{ error:/.test(sendAct), 'sendActivation returnerer ærlig feil i prod');
  ok('email.js: ingen stille auto-aktivering i produksjon');

  assert.ok(/create table[\s\S]*accounts/.test(mig), 'migrasjon lager accounts-tabell');
  assert.ok(/unique index[\s\S]*lower\(email\)/.test(mig), 'global unik e-post (lower)');
  assert.ok(/enable row level security/.test(mig), 'RLS på (låst til service-role)');
  ok('migrasjon: accounts-tabell + unik e-post + RLS');

  // Reklame-avmelding wiret ende-til-ende (server-sjekk + klient-speiling + migrasjon).
  assert.ok(/async unsubscribe\b/.test(accountServer) && /async resubscribe\b/.test(accountServer), 'AccountServer.unsubscribe/resubscribe finnes');
  assert.ok(/async function isUnsubscribed/.test(sendEmail), 'send-email.js har isUnsubscribed-sjekk');
  assert.ok(/if \(await isUnsubscribed\(toEmail\)\)/.test(sendEmail), 'promo-grenen hopper over avmeldte mottakere');
  assert.ok(/_serverSync\('unsubscribe'/.test(unsub) && /_serverSync\('resubscribe'/.test(unsub), 'unsubscribe.js speiler opt-out/-in til serveren');
  assert.ok(/marketing_opt_out/.test(mig4) && /add column if not exists/i.test(mig4), 'migrasjon 0004 legger til marketing_opt_out (idempotent)');
  ok('reklame-avmelding wiret ende-til-ende (server + klient + migrasjon)');
}

async function testMarketingOptOut() {
  console.log('\n10) reklame-avmelding (unsubscribe / resubscribe)');
  const store = { accounts: [] };
  const db = makeDb(store);
  sentEmails.length = 0;
  mockEmailResult = { data: { id: 'test_id' }, error: null };

  await ACTIONS.register(db, { username: 'mia', displayName: 'Mia', email: 'Mia@Eksempel.no', password: 'Passord!9' });
  const row = () => store.accounts.find(a => a.username === 'mia');
  assert.ok(!row().marketing_opt_out, 'ny konto er IKKE avmeldt reklame');

  // ugyldig e-post → 400
  let bad = await ACTIONS.unsubscribe(db, { email: 'ikke-epost' });
  assert.strictEqual(bad.status, 400, 'ugyldig e-post → 400');
  ok('unsubscribe: ugyldig e-post avvises (400)');

  // unsubscribe (annet casing enn lagret) → setter flagget
  let u = await ACTIONS.unsubscribe(db, { email: 'mia@eksempel.no' });
  assert.strictEqual(u.status, 200, 'unsubscribe → 200');
  assert.ok(u.body.success, 'unsubscribe success');
  assert.strictEqual(row().marketing_opt_out, true, 'marketing_opt_out satt true (case-insensitivt)');
  ok('unsubscribe: setter marketing_opt_out=true på riktig konto');

  // resubscribe → nullstiller
  let r = await ACTIONS.resubscribe(db, { email: 'MIA@eksempel.no' });
  assert.strictEqual(r.status, 200, 'resubscribe → 200');
  assert.strictEqual(row().marketing_opt_out, false, 'marketing_opt_out satt false');
  ok('resubscribe: setter marketing_opt_out=false');

  // ukjent e-post → generisk success (avslører ikke eksistens)
  let unk = await ACTIONS.unsubscribe(db, { email: 'finnesikke@eksempel.no' });
  assert.strictEqual(unk.status, 200, 'ukjent e-post → 200 generisk');
  assert.ok(unk.body.success, 'generisk success for ukjent e-post');
  ok('unsubscribe: generisk success for ukjent e-post (ingen kontooppramsing)');
}

(async () => {
  console.log('test-auth-server.js — server-side kontoer');
  testHelpers();
  await testRegisterLoginFlow();
  await testForgotReset();
  testClientWiring();
  await testMarketingOptOut();
  console.log(`\n\x1b[32m✓ Alle ${passed} sjekkene passerte.\x1b[0m\n`);
})().catch(e => { console.error('\n\x1b[31m✗ Test feilet:\x1b[0m', e.message, '\n', e.stack); process.exit(1); });
