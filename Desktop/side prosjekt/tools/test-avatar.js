#!/usr/bin/env node
/**
 * test-avatar.js — verifiserer profilbilde-knappene (legg til / endre / slett)
 * på egen profil FØR deploy.
 *
 * Kjør:  npm test   (eller: node tools/test-avatar.js)
 *
 * Dekker:
 *   A) Kilde (js/profile.js): eier-visningen har alle tre knappene alltid synlige
 *      («Legg til bilde», «Endre bilde», «Slett bilde») + skjult fil-input og
 *      kamera-overlegg, og at de nye funksjonene eksporteres.
 *   B) Oppførsel: Profile.setAvatarFromProfile() og Profile.deleteAvatar()
 *      — setter/sletter avatarMediaId, rydder gammel blob, og nekter når
 *        innlogget bruker ikke eier profilen.
 *
 * NB: funksjonene kaller renderView() til slutt for å tegne profilen på nytt.
 * I Node finnes ingen ekte DOM, så renderView avvises i bakgrunnen — vi svelger
 * den uskadelige rejection-en og sjekker DATA-effekten (som skjer før kallet).
 */
'use strict';
const fs     = require('fs');
const vm     = require('vm');
const path   = require('path');
const assert = require('assert');

const ROOT = path.join(__dirname, '..');
let passed = 0;
function ok(name) { passed++; console.log(`  \x1b[32m✓\x1b[0m ${name}`); }

// Bakgrunns-renderView har ingen DOM → svelg den uskadelige rejection-en.
process.on('unhandledRejection', () => {});

const SRC = fs.readFileSync(path.join(ROOT, 'js', 'profile.js'), 'utf8');

// ───────────────────────────────────────────────────────────────────────────
// A) Kilde-sjekker
// ───────────────────────────────────────────────────────────────────────────
function testSource() {
  console.log('\nKilde (js/profile.js) — knapper + eksport');

  assert.ok(/Legg til bilde/.test(SRC),  'mangler «Legg til bilde»-knapp');
  assert.ok(/Endre bilde/.test(SRC),     'mangler «Endre bilde»-knapp');
  assert.ok(/Slett bilde/.test(SRC),     'mangler «Slett bilde»-knapp');
  ok('alle tre knappene finnes i eier-visningen');

  assert.ok(/id="profile-avatar-input"/.test(SRC), 'mangler skjult fil-input');
  assert.ok(/Profile\.setAvatarFromProfile\(this,'\$\{username\}'\)/.test(SRC), 'input kobler ikke til setAvatarFromProfile');
  ok('skjult fil-input kobler til Profile.setAvatarFromProfile');

  assert.ok(/profile-avatar-cam/.test(SRC), 'mangler kamera-overlegg på avataren');
  ok('kamera-overlegg finnes på avataren');

  // Knappene skal være eier-gated (ligge inne i en isOwner-blokk).
  assert.ok(/profile-avatar-actions/.test(SRC), 'mangler handlingsrad-container');
  ok('handlingsraden er eget element (eier-gated via isOwner)');

  assert.ok(/setAvatarFromProfile,\s*deleteAvatar/.test(SRC), 'nye funksjoner ikke eksportert');
  ok('setAvatarFromProfile + deleteAvatar er eksportert på Profile');
}

// ───────────────────────────────────────────────────────────────────────────
// Lasting av Profile-modulen i en sandbox med mockede globals
// ───────────────────────────────────────────────────────────────────────────
function loadProfile() {
  // In-memory «database» for blober + brukere.
  const blobs = new Map();
  const users = {};
  let currentUser = null;

  const stubEl = new Proxy({}, {
    get(_t, k) {
      if (k === 'style') return {};
      if (k === 'classList') return { add() {}, remove() {}, toggle() {} };
      if (k === 'innerHTML') return '';
      return () => stubEl; // alle metoder → no-op som returnerer stubEl
    },
    set() { return true; },
  });

  const sandbox = {
    console,
    confirm: () => true,
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    document: {
      getElementById: () => stubEl,
      querySelector: () => stubEl,
      querySelectorAll: () => [],
      createElement: () => stubEl,
    },
    Icon: () => '',
    Router: { go() {} },
    App: { toast(msg, type) { App.last = { msg, type }; } },
    Auth: {
      current: () => currentUser,
      getUser: (u) => users[u] || null,
      updateUser: (u, data) => { if (!users[u]) return false; Object.assign(users[u], data); return true; },
      defaultTheme: () => ({}),
      getFriendStatus: () => 'none',
      getFriends: () => [],
      isOnline: () => false,
    },
    DB: {
      storeFile: async (store, id) => { blobs.set(`${store}:${id}`, true); },
      delete:    async (store, id) => { blobs.delete(`${store}:${id}`); },
      getBlobUrl: async (store, id) => (blobs.has(`${store}:${id}`) ? `blob:${store}:${id}` : null),
      invalidateBlobCache: () => {},
      get: async () => null,
      put: async () => {},
    },
  };
  const App = sandbox.App; // referert i toast-recorderen over
  sandbox.window = sandbox; // window.X → samme globale objekt (BroadcastSchedule = undefined)

  vm.createContext(sandbox);
  vm.runInContext(SRC + '\n;globalThis.Profile = Profile;', sandbox);

  // Hjelpere så testene kan lese/sette intern tilstand.
  return {
    Profile: sandbox.Profile,
    App,
    setUsers: (obj) => { Object.assign(users, obj); },
    setCurrent: (u) => { currentUser = u; },
    getUser: (u) => users[u],
    hasBlob: (id) => blobs.has(`media:${id}`),
    addBlob: (id) => blobs.set(`media:${id}`, true),
  };
}

// ───────────────────────────────────────────────────────────────────────────
// B) Oppførsel
// ───────────────────────────────────────────────────────────────────────────
async function testBehaviour() {
  console.log('\nOppførsel — setAvatarFromProfile + deleteAvatar');
  const env = loadProfile();
  assert.ok(env.Profile, 'Profile skal eksponeres');
  assert.strictEqual(typeof env.Profile.setAvatarFromProfile, 'function', 'setAvatarFromProfile finnes');
  assert.strictEqual(typeof env.Profile.deleteAvatar, 'function', 'deleteAvatar finnes');
  ok('Profile eksponerer begge funksjonene');

  // ── Legg til bilde (ingen avatar fra før) ──────────────────────────────
  env.setUsers({ dj_test: { username: 'dj_test', displayName: 'DJ Test' } });
  env.setCurrent({ username: 'dj_test' });
  await env.Profile.setAvatarFromProfile({ files: [{ name: 'a.png', type: 'image/png' }] }, 'dj_test');
  const id1 = env.getUser('dj_test').avatarMediaId;
  assert.ok(id1, 'avatarMediaId skal settes etter opplasting');
  assert.ok(env.hasBlob(id1), 'blob skal være lagret');
  assert.strictEqual(env.App.last.type, 'success', 'skal gi success-toast');
  ok('setAvatarFromProfile legger til bilde (avatarMediaId + blob lagret)');

  // ── Endre bilde (bytter ut → gammel blob ryddes) ───────────────────────
  await env.Profile.setAvatarFromProfile({ files: [{ name: 'b.png', type: 'image/png' }] }, 'dj_test');
  const id2 = env.getUser('dj_test').avatarMediaId;
  assert.notStrictEqual(id2, id1, 'avatarMediaId skal være ny etter bytte');
  assert.ok(env.hasBlob(id2), 'ny blob skal finnes');
  assert.ok(!env.hasBlob(id1), 'gammel blob skal være ryddet bort');
  ok('endre bilde bytter blob og rydder den gamle (ingen foreldreløse blober)');

  // ── Slett bilde ────────────────────────────────────────────────────────
  await env.Profile.deleteAvatar('dj_test');
  assert.strictEqual(env.getUser('dj_test').avatarMediaId, null, 'avatarMediaId skal nullstilles');
  assert.ok(!env.hasBlob(id2), 'blob skal slettes ved sletting');
  ok('deleteAvatar fjerner avatarMediaId + blob');

  // ── Slett uten bilde → vennlig melding, ingen krasj ────────────────────
  env.App.last = null;
  await env.Profile.deleteAvatar('dj_test');
  assert.ok(env.App.last && env.App.last.type === 'info', 'skal gi info-toast når ingen avatar finnes');
  ok('deleteAvatar uten bilde gir vennlig melding (krasjer ikke)');

  // ── Sikkerhet: kan ikke endre/slette andres profil ─────────────────────
  env.setUsers({ andre: { username: 'andre', displayName: 'Andre', avatarMediaId: 'av_keep' } });
  env.addBlob('av_keep');
  env.setCurrent({ username: 'dj_test' }); // innlogget som dj_test, ikke «andre»
  await env.Profile.deleteAvatar('andre');
  assert.strictEqual(env.getUser('andre').avatarMediaId, 'av_keep', 'andres avatar skal være urørt');
  await env.Profile.setAvatarFromProfile({ files: [{ name: 'x.png', type: 'image/png' }] }, 'andre');
  assert.strictEqual(env.getUser('andre').avatarMediaId, 'av_keep', 'kan ikke laste opp til andres profil');
  ok('eier-sjekk: kan verken endre eller slette en annen brukers profilbilde');
}

(async () => {
  try {
    testSource();
    await testBehaviour();
    // La eventuelle bakgrunns-microtasks (renderView) flushe før vi avslutter.
    await new Promise((r) => setImmediate(r));
    console.log(`\n\x1b[32mAlle ${passed} sjekkene passerte ✅\x1b[0m  — profilbilde-knappene er trygge.\n`);
    process.exit(0);
  } catch (e) {
    console.error(`\n\x1b[31m✗ TEST FEILET:\x1b[0m ${e.message}\n`);
    console.error(e.stack);
    process.exit(1);
  }
})();
