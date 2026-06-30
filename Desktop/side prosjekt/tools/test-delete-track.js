#!/usr/bin/env node
/**
 * test-delete-track.js — verifiserer slett-knappen på opplastet musikk i
 * brukerprofilene FØR deploy.
 *
 * Kjør:  npm test   (eller: node tools/test-delete-track.js)
 *
 * Dekker:
 *   1) musicItem (via renderMusicPlayer i renderView): hver opplastet sang får en
 *      «Slett denne sangen»-knapp (.music-delete-btn → Profile.deleteTrack) KUN for
 *      eieren; en fremmed ser den ikke.
 *   2) Profile.deleteTrack(): eier-gated, krever bekreftelse, sletter cover-blobben
 *      + selve sang-posten, fjerner id-en fra user.musicIds og oppdaterer brukeren.
 */
'use strict';
const fs     = require('fs');
const vm     = require('vm');
const path   = require('path');
const assert = require('assert');

const ROOT = path.join(__dirname, '..');
let passed = 0;
function ok(name) { passed++; console.log(`  \x1b[32m✓\x1b[0m ${name}`); }

// Post-render-floats (renderMusicPlayer m.fl. uten await) skal ikke velte testen.
process.on('unhandledRejection', () => {});

// ── Mutérbar testtilstand ───────────────────────────────────────────────────
let currentUser = null;            // Auth.current()
const usersById = {};              // Auth.getUser()
let confirmReturn = true;          // confirm()
let captures = [];                 // ALLE innerHTML-tilordninger
let deleteCalls = [];              // DB.delete(store, id)
let updateCalls = [];              // Auth.updateUser(username, patch)
let toasts = [];                   // App.toast(msg, type)
let musicRecs = {};                // DB.get/getAllByIds('music', …)
function resetSpies() { captures = []; deleteCalls = []; updateCalls = []; toasts = []; }

// ── Falskt DOM-element ──────────────────────────────────────────────────────
const elCache = {};
function makeEl(id) {
  let html = '';
  const el = {
    id, style: { setProperty() {}, removeProperty() {} }, dataset: {}, value: '', files: [],
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    addEventListener() {}, removeEventListener() {},
    appendChild() {}, removeChild() {}, setAttribute() {}, getAttribute() { return null; },
    querySelector() { return null; }, querySelectorAll() { return []; },
    getContext() { return { fillRect() {}, drawImage() {}, clearRect() {} }; },
    focus() {}, click() {}, remove() {},
  };
  Object.defineProperty(el, 'innerHTML', {
    get() { return html; },
    set(v) { html = v; captures.push(v); },   // fang ALT (også #tab-music-player)
  });
  return el;
}
function getEl(id) { return (elCache[id] ||= makeEl(id)); }

const documentStub = {
  getElementById: (id) => getEl(id),
  createElement: () => makeEl('_created'),
  querySelector: () => null, querySelectorAll: () => [],
  addEventListener() {}, body: makeEl('body'), head: makeEl('head'),
};

const sandbox = {
  console,
  setTimeout, clearTimeout, setInterval, clearInterval,
  requestAnimationFrame: (cb) => setTimeout(cb, 0), cancelAnimationFrame() {},
  JSON, Math, Date, Promise, Object, Array, String, Number, RegExp, parseInt, parseFloat, isNaN,
  document: documentStub,
  confirm: () => confirmReturn,
  alert() {},
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  Icon: (name) => `[icon:${name}]`,
  Router: { go() {} },
  App: { toast: (msg, type) => toasts.push({ msg, type }), closeModal() {}, openModal() {} },
  Auth: {
    current: () => currentUser,
    getUser: (u) => usersById[u] || null,
    updateUser: (u, patch) => { updateCalls.push({ u, patch }); Object.assign(usersById[u] || (usersById[u] = {}), patch); },
    defaultTheme: () => ({ bgColor: '#0f0f1a', textColor: '#fff', primaryColor: '#7c3aed', fontFamily: 'Inter' }),
    isOnline: () => false,
    getFriendStatus: () => 'none',
    getFriends: () => [],
  },
  DB: {
    getBlobUrl: async () => null,
    get: async (store, id) => (store === 'music' ? (musicRecs[id] || null) : null),
    getAllByIds: async (store, ids) => (store === 'music' ? ids.map(i => musicRecs[i]).filter(Boolean) : []),
    delete: async (store, id) => { deleteCalls.push({ store, id }); },
    storeFile: async () => {},
    invalidateBlobCache() {},
  },
  Community: { subscribe() {} },
};
sandbox.window = sandbox;
vm.createContext(sandbox);

const code = fs.readFileSync(path.join(ROOT, 'js', 'profile.js'), 'utf8');
vm.runInContext(code + '\n;window.__Profile = Profile;', sandbox);
const Profile = sandbox.__Profile;
assert.ok(Profile, 'Profile skal lastes fra js/profile.js');
assert.strictEqual(typeof Profile.deleteTrack, 'function', 'deleteTrack eksponert');

function baseUser(extra) {
  return Object.assign({
    username: 'dj_test', displayName: 'DJ Test', role: 'dj',
    profileVisibility: 'public', theme: null,
    platforms: [], sites: [], mySites: [], festivals: [], events: [],
    friends: [], friendRequests: [], links: [], musicIds: [], mixIds: [], mediaIds: [],
  }, extra || {});
}

const tick = () => new Promise(r => setTimeout(r, 25));

async function renderHtml(viewer, profileUser) {
  resetSpies();
  currentUser = viewer;
  usersById[profileUser.username] = profileUser;
  try { await Profile.renderView(profileUser.username); } catch (_) { /* floats OK */ }
  await tick();                       // la renderMusicPlayer (uten await) fullføre
  return captures.find(h => h.includes('music-item')) || '';
}

// ── 1) Slett-knappen i musikk-listen ────────────────────────────────────────
async function testRender() {
  console.log('\nrenderMusicPlayer (js/profile.js) — slett-knapp på opplastet musikk');

  musicRecs = { m1: { id: 'm1', name: 'Spor Én', artist: 'A', visibility: 'public' } };

  // Eier ser slett-knappen, koblet til deleteTrack med riktige argumenter
  {
    const html = await renderHtml({ username: 'dj_test' }, baseUser({ musicIds: ['m1'] }));
    assert.ok(html.includes('music-delete-btn'), 'eier: slett-knappen rendres');
    assert.ok(html.includes("Profile.deleteTrack('m1','dj_test')"), 'eier: knappen kaller deleteTrack med id + brukernavn');
    assert.ok(html.includes('Slett denne sangen'), 'eier: knappen har slett-tittel');
    ok('eier → «Slett denne sangen»-knapp på hvert spor');
  }

  // Fremmed ser IKKE slett-knappen
  {
    const html = await renderHtml({ username: 'someone_else' }, baseUser({ musicIds: ['m1'] }));
    assert.ok(!html.includes('music-delete-btn'), 'fremmed: ingen slett-knapp');
    assert.ok(!html.includes('Profile.deleteTrack'), 'fremmed: ingen deleteTrack-kall');
    ok('ikke-eier → ingen slett-knapp');
  }
}

// ── 2) Profile.deleteTrack() ────────────────────────────────────────────────
async function testDeleteTrack() {
  console.log('\nProfile.deleteTrack() — fjern opplastet sang');

  // Eier bekrefter → cover-blob + sang-post slettes, musicIds oppdateres
  resetSpies();
  confirmReturn = true;
  currentUser = baseUser({ musicIds: ['m1', 'm2'] });
  usersById.dj_test = currentUser;
  musicRecs = { m1: { id: 'm1', coverMediaId: 'cov_1' }, m2: { id: 'm2' } };
  await Profile.deleteTrack('m1', 'dj_test');
  assert.ok(deleteCalls.some(d => d.store === 'media' && d.id === 'cov_1'), 'cover-blobben slettes');
  assert.ok(deleteCalls.some(d => d.store === 'music' && d.id === 'm1'), 'selve sang-posten slettes');
  const upd = updateCalls.find(c => 'musicIds' in c.patch);
  assert.ok(upd, 'brukeren oppdateres med ny musicIds');
  assert.deepStrictEqual(upd.patch.musicIds, ['m2'], 'm1 fjernet, m2 beholdt');
  assert.ok(toasts.some(t => /slettet/i.test(t.msg)), 'gir «slettet»-toast');
  ok('eier + bekreftet: cover + sang slettet, musicIds = [m2]');

  // Sang uten cover → kun sang-posten slettes (ingen media-delete)
  resetSpies();
  currentUser = baseUser({ musicIds: ['m2'] });
  usersById.dj_test = currentUser;
  musicRecs = { m2: { id: 'm2' } };
  await Profile.deleteTrack('m2', 'dj_test');
  assert.ok(!deleteCalls.some(d => d.store === 'media'), 'uten cover: ingen media-sletting');
  assert.ok(deleteCalls.some(d => d.store === 'music' && d.id === 'm2'), 'uten cover: sang-posten slettes likevel');
  ok('sang uten cover: kun sang-posten slettes');

  // Avbryter bekreftelsen → ingenting skjer
  resetSpies();
  confirmReturn = false;
  currentUser = baseUser({ musicIds: ['m1'] });
  usersById.dj_test = currentUser;
  musicRecs = { m1: { id: 'm1', coverMediaId: 'cov_1' } };
  await Profile.deleteTrack('m1', 'dj_test');
  assert.strictEqual(deleteCalls.length, 0, 'avbrutt → ingen sletting');
  assert.strictEqual(updateCalls.length, 0, 'avbrutt → ingen oppdatering');
  ok('avbrutt bekreftelse: ingenting skjer');

  // Ikke-eier → no-op (selv med bekreftelse på)
  resetSpies();
  confirmReturn = true;
  currentUser = { username: 'intruder' };
  usersById.dj_test = baseUser({ musicIds: ['m1'] });
  musicRecs = { m1: { id: 'm1', coverMediaId: 'cov_1' } };
  await Profile.deleteTrack('m1', 'dj_test');
  assert.strictEqual(deleteCalls.length, 0, 'fremmed kan ikke slette');
  assert.strictEqual(updateCalls.length, 0, 'fremmed kan ikke oppdatere');
  ok('ikke-eier: deleteTrack er en no-op');
}

(async () => {
  try {
    await testRender();
    await testDeleteTrack();
    console.log(`\n\x1b[32mAlle ${passed} sjekkene passerte ✅\x1b[0m  — slett-knappen på opplastet musikk er trygg.\n`);
    process.exit(0);
  } catch (e) {
    console.error(`\n\x1b[31m✗ TEST FEILET:\x1b[0m ${e.message}\n`);
    console.error(e.stack);
    process.exit(1);
  }
})();
