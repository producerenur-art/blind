#!/usr/bin/env node
/**
 * test-banner.js — verifiserer hero-bilde-knappene (banner) i brukerprofilene
 * FØR deploy.
 *
 * Kjør:  npm test   (eller: node tools/test-banner.js)
 *
 * Dekker:
 *   1) js/profile.js renderView(): hero-overlayet får
 *        - «Legg til bilde» når brukeren ikke har banner,
 *        - «Endre bilde» + «Slett bilde» når banner finnes,
 *      og INGEN av knappene vises for en som ikke eier profilen.
 *   2) Profile.setBannerFromProfile(): eier-gated, lagrer ny bn_-blob i 'media',
 *      setter bannerMediaId, og rydder opp den gamle blobben.
 *   3) Profile.deleteBanner(): eier-gated, krever bekreftelse, sletter blobben
 *      og nuller bannerMediaId.
 */
'use strict';
const fs     = require('fs');
const vm     = require('vm');
const path   = require('path');
const assert = require('assert');

const ROOT = path.join(__dirname, '..');
let passed = 0;
function ok(name) { passed++; console.log(`  \x1b[32m✓\x1b[0m ${name}`); }

// Floats fra renderView (renderMusicPlayer m.fl. kjøres uten await) skal ikke
// velte testen — HTML-en er allerede fanget når de evt. feiler.
process.on('unhandledRejection', () => {});

// ── Mutérbar testtilstand som stubbene leser ────────────────────────────────
let currentUser = null;            // Auth.current()
const usersById = {};              // Auth.getUser()
let confirmReturn = true;          // confirm()
let captures = [];                 // alle app.innerHTML-tilordninger
let storeCalls = [];               // DB.storeFile(store, id, file)
let deleteCalls = [];              // DB.delete(store, id)
let updateCalls = [];              // Auth.updateUser(username, patch)
let toasts = [];                   // App.toast(msg, type)
function resetSpies() { captures = []; storeCalls = []; deleteCalls = []; updateCalls = []; toasts = []; }

// ── Falskt DOM-element (nok til at renderView kjører til innerHTML-tilordning) ─
const elCache = {};
function makeEl(id) {
  let html = '';
  const el = {
    id, style: {}, dataset: {}, value: '', files: [],
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    addEventListener() {}, removeEventListener() {},
    appendChild() {}, removeChild() {}, setAttribute() {}, getAttribute() { return null; },
    querySelector() { return null; }, querySelectorAll() { return []; },
    getContext() { return { fillRect() {}, drawImage() {}, putImageData() {}, getImageData() { return { data: [] }; }, clearRect() {} }; },
    focus() {}, click() {}, remove() {},
  };
  Object.defineProperty(el, 'innerHTML', {
    get() { return html; },
    set(v) { html = v; if (id === 'app') captures.push(v); },
  });
  return el;
}
function getEl(id) { return (elCache[id] ||= makeEl(id)); }

// ── Sandkasse-stubber ───────────────────────────────────────────────────────
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
  Radio: { playUrl() {} },
  App: { toast: (msg, type) => toasts.push({ msg, type }) },
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
    getBlobUrl: async () => 'blob:fake-url',
    get: async () => null,
    storeFile: async (store, id, file) => { storeCalls.push({ store, id, file }); },
    delete: async (store, id) => { deleteCalls.push({ store, id }); },
    invalidateBlobCache() {},
  },
};
sandbox.window = sandbox;           // klassisk script: window === global
vm.createContext(sandbox);

// Last modulen; `const Profile` blir ikke en window-property, så vi henter den
// ut via en ekstra setning i SAMME script-scope.
const code = fs.readFileSync(path.join(ROOT, 'js', 'profile.js'), 'utf8');
vm.runInContext(code + '\n;window.__Profile = Profile;', sandbox);
const Profile = sandbox.__Profile;
assert.ok(Profile, 'Profile skal lastes fra js/profile.js');
assert.strictEqual(typeof Profile.setBannerFromProfile, 'function', 'setBannerFromProfile eksponert');
assert.strictEqual(typeof Profile.deleteBanner, 'function', 'deleteBanner eksponert');

function baseUser(extra) {
  return Object.assign({
    username: 'dj_test', displayName: 'DJ Test', role: 'dj',
    profileVisibility: 'public', theme: null,
    platforms: [], sites: [], mySites: [], festivals: [], events: [],
    friends: [], friendRequests: [], links: [], musicIds: [], mixIds: [], mediaIds: [],
  }, extra || {});
}
async function renderHtml(viewer, profileUser) {
  resetSpies();
  currentUser = viewer;
  usersById[profileUser.username] = profileUser;
  try { await Profile.renderView(profileUser.username); } catch (_) { /* post-render floats OK */ }
  return captures.find(h => h.includes('profile-hero')) || '';
}
// Hero-delen ligger FØR .profile-body. Avatar-knappene har identisk tekst, men
// bor i profile-body, så vi isolerer hero-delen for å teste banner-knappene rent.
function heroOf(html) { return html.split('profile-body')[0]; }

// ── 1) renderView: bilde-knappene i hero-overlayet ──────────────────────────
async function testRender() {
  console.log('\nrenderView (js/profile.js) — bilde-knapper i hero');

  // Eier → alle tre knappene alltid synlige (uavhengig av om banner finnes)
  for (const [label, banner] of [['uten banner', null], ['med banner', 'bn_existing']]) {
    const hero = heroOf(await renderHtml({ username: 'dj_test' }, baseUser({ bannerMediaId: banner })));
    assert.ok(hero.includes('profile-hero-banner-actions'), `[${label}] eier får banner-handlingsfelt`);
    assert.ok(hero.includes('Legg til bilde'), `[${label}] «Legg til bilde» synlig`);
    assert.ok(hero.includes('Endre bilde'), `[${label}] «Endre bilde» synlig`);
    assert.ok(hero.includes('Slett bilde'), `[${label}] «Slett bilde» synlig`);
    assert.ok(hero.includes('id="profile-banner-input"'), `[${label}] skjult fil-input finnes`);
    assert.ok(hero.includes("Profile.setBannerFromProfile(this,'dj_test')"), `[${label}] add/endre kaller setBannerFromProfile`);
    assert.ok(hero.includes("Profile.deleteBanner('dj_test')"), `[${label}] slett kaller deleteBanner`);
    ok(`eier ${label} → alle tre knappene + fil-input + riktige onclick`);
  }

  // Ikke-eier → ingen banner-knapper
  let hero = heroOf(await renderHtml({ username: 'someone_else' }, baseUser({ bannerMediaId: 'bn_existing' })));
  assert.ok(!hero.includes('profile-hero-banner-actions'), 'fremmed ser ikke banner-handlingsfeltet');
  assert.ok(!hero.includes('profile-banner-input') && !hero.includes('setBannerFromProfile') && !hero.includes('deleteBanner'), 'ingen banner-markører for fremmed');
  ok('ikke-eier → ingen bilde-knapper (kun eier kan endre)');

  // Utlogget → ingen banner-knapper
  hero = heroOf(await renderHtml(null, baseUser({ bannerMediaId: 'bn_existing' })));
  assert.ok(!hero.includes('profile-hero-banner-actions'), 'utlogget ser ikke banner-handlingsfeltet');
  ok('utlogget → ingen bilde-knapper');
}

// ── 2) setBannerFromProfile ─────────────────────────────────────────────────
async function testSetBanner() {
  console.log('\nProfile.setBannerFromProfile() — last opp / endre banner');

  // Eier laster opp nytt banner (hadde et fra før → gammelt skal ryddes)
  resetSpies();
  currentUser = { username: 'dj_test' };
  usersById.dj_test = baseUser({ bannerMediaId: 'bn_old' });
  const input = { files: [{ name: 'cover.jpg' }] };
  await Profile.setBannerFromProfile(input, 'dj_test');

  assert.strictEqual(storeCalls.length, 1, 'lagrer nøyaktig én fil');
  assert.strictEqual(storeCalls[0].store, 'media', 'lagres i media-store');
  assert.ok(/^bn_/.test(storeCalls[0].id), 'ny blob får bn_-prefiks');
  const upd = updateCalls.find(c => 'bannerMediaId' in c.patch);
  assert.ok(upd && upd.patch.bannerMediaId === storeCalls[0].id, 'bannerMediaId peker på den nye blobben');
  assert.ok(deleteCalls.some(d => d.store === 'media' && d.id === 'bn_old'), 'den gamle banner-blobben ryddes bort');
  assert.ok(toasts.some(t => t.type === 'success'), 'gir suksess-toast');
  ok('eier: ny bn_-blob i media, bannerMediaId oppdatert, gammel blob ryddet');

  // Feil bruker (ikke eier) → ingen endring
  resetSpies();
  currentUser = { username: 'intruder' };
  usersById.dj_test = baseUser({ bannerMediaId: 'bn_old' });
  await Profile.setBannerFromProfile({ files: [{ name: 'x.jpg' }] }, 'dj_test');
  assert.strictEqual(storeCalls.length, 0, 'ingen fil lagres for fremmed');
  assert.strictEqual(updateCalls.length, 0, 'ingen bruker-oppdatering for fremmed');
  ok('ikke-eier: setBannerFromProfile er en no-op');

  // Ingen fil valgt → no-op
  resetSpies();
  currentUser = { username: 'dj_test' };
  await Profile.setBannerFromProfile({ files: [] }, 'dj_test');
  assert.strictEqual(storeCalls.length, 0, 'ingen fil → ingenting lagres');
  ok('uten valgt fil: no-op');
}

// ── 3) deleteBanner ─────────────────────────────────────────────────────────
async function testDeleteBanner() {
  console.log('\nProfile.deleteBanner() — fjern banner');

  // Eier bekrefter → blob slettes + bannerMediaId nulles
  resetSpies();
  confirmReturn = true;
  currentUser = { username: 'dj_test' };
  usersById.dj_test = baseUser({ bannerMediaId: 'bn_live' });
  await Profile.deleteBanner('dj_test');
  assert.ok(deleteCalls.some(d => d.store === 'media' && d.id === 'bn_live'), 'banner-blobben slettes');
  const cleared = updateCalls.find(c => 'bannerMediaId' in c.patch);
  assert.ok(cleared && cleared.patch.bannerMediaId === null, 'bannerMediaId settes til null');
  assert.ok(toasts.some(t => t.type === 'success'), 'gir suksess-toast');
  ok('eier + bekreftet: blob slettet og bannerMediaId = null');

  // Avbryter bekreftelsen → ingen endring
  resetSpies();
  confirmReturn = false;
  currentUser = { username: 'dj_test' };
  usersById.dj_test = baseUser({ bannerMediaId: 'bn_live' });
  await Profile.deleteBanner('dj_test');
  assert.strictEqual(deleteCalls.length, 0, 'avbrutt → ingen sletting');
  assert.strictEqual(updateCalls.length, 0, 'avbrutt → ingen oppdatering');
  ok('avbrutt bekreftelse: ingenting skjer');

  // Ikke-eier → no-op
  resetSpies();
  confirmReturn = true;
  currentUser = { username: 'intruder' };
  usersById.dj_test = baseUser({ bannerMediaId: 'bn_live' });
  await Profile.deleteBanner('dj_test');
  assert.strictEqual(deleteCalls.length, 0, 'fremmed kan ikke slette');
  assert.strictEqual(updateCalls.length, 0, 'fremmed kan ikke oppdatere');
  ok('ikke-eier: deleteBanner er en no-op');
}

(async () => {
  try {
    await testRender();
    await testSetBanner();
    await testDeleteBanner();
    console.log(`\n\x1b[32mAlle ${passed} sjekkene passerte ✅\x1b[0m  — bilde-knappene i profilen er trygge.\n`);
    process.exit(0);
  } catch (e) {
    console.error(`\n\x1b[31m✗ TEST FEILET:\x1b[0m ${e.message}\n`);
    console.error(e.stack);
    process.exit(1);
  }
})();
