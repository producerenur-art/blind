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
let cloudOn = false;               // SC_Storage.isConfigured()
let cloudUploads = [];             // SC_Storage.upload(file, opts)
function resetSpies() { captures = []; storeCalls = []; deleteCalls = []; updateCalls = []; toasts = []; cloudUploads = []; }

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
  // Sky-lagring (Supabase). Av som standard → testene treffer lokal-fallbacken;
  // skrus på i den dedikerte sky-testen via cloudOn = true.
  SC_Storage: {
    isConfigured: () => cloudOn,
    upload: async (file, opts) => {
      cloudUploads.push({ file, opts });
      return { url: 'https://cloud.example/banner/abc.jpg', path: (opts && opts.prefix || 'banner') + '/abc.jpg' };
    },
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
assert.strictEqual(typeof Profile.uploadBanner, 'function', 'uploadBanner eksponert');

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

// ── 1) renderView: banner-knappene på forsidebildet (hero) ──────────────────
async function testRender() {
  console.log('\nrenderView (js/profile.js) — opplast/bytt/slett bakgrunn på forsidebildet (hero)');

  // Eier UTEN banner → «Last opp banner» på hero, ingen slett
  {
    const html = await renderHtml({ username: 'dj_test' }, baseUser({ bannerMediaId: null }));
    const hero = heroOf(html);
    assert.ok(hero.includes('profile-hero-banner-actions'), 'uten banner: hero har banner-handlingsfelt');
    assert.ok(hero.includes('id="profile-banner-input"'), 'uten banner: skjult fil-input på hero');
    assert.ok(hero.includes("Profile.setBannerFromProfile(this,'dj_test')"), 'uten banner: opplasting kaller setBannerFromProfile');
    assert.ok(hero.includes('Last opp banner'), 'uten banner: «Last opp banner» vises');
    assert.ok(!hero.includes('Slett bakgrunn'), 'uten banner: ingen slett-knapp');
    // Hele banneren er klikkbar (Facebook-stil) for eier, med synlig hint når tom
    assert.ok(hero.includes('profile-hero-overlay--editable'), 'uten banner: hele banneren er klikkbar');
    assert.ok(hero.includes('Last opp forsidebilde'), 'uten banner: klikk-hint vises på banneren');
    ok('eier uten banner → «Last opp banner» på forsidebildet');
  }

  // Eier MED banner → «Bytt bakgrunn» + «Slett bakgrunn» på hero
  {
    const html = await renderHtml({ username: 'dj_test' }, baseUser({ bannerMediaId: 'bn_existing' }));
    const hero = heroOf(html);
    assert.ok(hero.includes('profile-hero-banner-actions'), 'med banner: hero har banner-handlingsfelt');
    assert.ok(hero.includes('Bytt bakgrunn'), 'med banner: «Bytt bakgrunn» på hero');
    assert.ok(hero.includes('Slett bakgrunn'), 'med banner: «Slett bakgrunn» på hero');
    assert.ok(hero.includes("Profile.setBannerFromProfile(this,'dj_test')"), 'med banner: bytt kaller setBannerFromProfile');
    assert.ok(hero.includes("Profile.deleteBanner('dj_test')"), 'med banner: slett kaller deleteBanner');
    assert.ok(hero.includes('profile-hero-overlay--editable'), 'med banner: hele banneren er klikkbar for bytte');
    ok('eier med banner → «Bytt/Slett bakgrunn» på forsidebildet');
  }

  // Eier med SKY-banner (bannerUrl, ingen lokal blob) → bildet vises for ALLE
  {
    const html = await renderHtml({ username: 'dj_test' }, baseUser({ bannerUrl: 'https://cloud.example/banner/abc.jpg' }));
    const hero = heroOf(html);
    assert.ok(hero.includes('https://cloud.example/banner/abc.jpg'), 'sky-banner: hero bruker den delbare URL-en');
    assert.ok(hero.includes('Bytt bakgrunn') && hero.includes('Slett bakgrunn'), 'sky-banner: bytt/slett vises');
    ok('eier med sky-banner → forsidebildet bruker delbar URL (synlig for alle)');
  }

  // Ikke-eier → ingen banner-knapper
  let html = await renderHtml({ username: 'someone_else' }, baseUser({ bannerMediaId: 'bn_existing' }));
  assert.ok(!html.includes('profile-banner-input') && !html.includes('setBannerFromProfile') && !html.includes('deleteBanner'), 'ingen banner-markører for fremmed');
  assert.ok(!html.includes('Bytt bakgrunn') && !html.includes('Slett bakgrunn') && !html.includes('Last opp banner'), 'fremmed ser ikke bakgrunns-knappene');
  assert.ok(!html.includes('profile-hero-overlay--editable'), 'fremmed: banneren er IKKE klikkbar');
  ok('ikke-eier → ingen bakgrunns-knapper (kun eier kan endre)');

  // Utlogget → ingen banner-knapper
  html = await renderHtml(null, baseUser({ bannerMediaId: 'bn_existing' }));
  assert.ok(!html.includes('setBannerFromProfile') && !html.includes('deleteBanner'), 'utlogget ser ikke bakgrunns-knappene');
  ok('utlogget → ingen bakgrunns-knapper');
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

  // Sky konfigurert → lastes opp til Supabase, bannerUrl settes, INGEN lokal blob
  resetSpies();
  cloudOn = true;
  currentUser = { username: 'dj_test' };
  usersById.dj_test = baseUser({ bannerMediaId: 'bn_old' });
  await Profile.setBannerFromProfile({ files: [{ name: 'b.jpg', type: 'image/jpeg' }] }, 'dj_test');
  assert.strictEqual(cloudUploads.length, 1, 'sky: nøyaktig én opplasting til SC_Storage');
  assert.strictEqual(cloudUploads[0].opts.prefix, 'banner', 'sky: lastes opp under banner/-prefiks');
  assert.strictEqual(storeCalls.length, 0, 'sky: ingen lokal blob lagres');
  const cu = updateCalls.find(c => 'bannerUrl' in c.patch);
  assert.ok(cu && /^https:\/\//.test(cu.patch.bannerUrl), 'sky: bannerUrl settes til offentlig URL');
  assert.strictEqual(cu.patch.bannerMediaId, null, 'sky: lokal bannerMediaId nulles');
  assert.ok(deleteCalls.some(d => d.id === 'bn_old'), 'sky: gammel lokal blob ryddes');
  ok('sky konfigurert: opplasting til Supabase, bannerUrl satt, ingen lokal blob');
  cloudOn = false;
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

// ── 4) uploadBanner (edit-profil-sonen deler nå samme kjerne) ───────────────
async function testUploadBanner() {
  console.log('\nProfile.uploadBanner() — opplasting fra «Rediger profil» (samkjørt med forsidebildet)');

  // Lokal lagring: ny blob + NULLER gammel sky-URL (selve bug-fiksen) + rydder gammel blob.
  resetSpies();
  cloudOn = false;
  currentUser = { username: 'dj_test' };
  usersById.dj_test = baseUser({ bannerMediaId: 'bn_old', bannerUrl: 'https://old.example/x.jpg', bannerPath: 'banner/x.jpg' });
  await Profile.uploadBanner({ files: [{ name: 'ny.jpg', type: 'image/jpeg' }] });
  assert.strictEqual(storeCalls.length, 1, 'lagrer nøyaktig én fil lokalt');
  assert.ok(/^bn_/.test(storeCalls[0].id), 'ny blob får bn_-prefiks');
  const upd = updateCalls.find(c => 'bannerMediaId' in c.patch);
  assert.ok(upd && upd.patch.bannerMediaId === storeCalls[0].id, 'bannerMediaId peker på den nye blobben');
  assert.strictEqual(upd.patch.bannerUrl, null, 'BUG-FIKS: gammel bannerUrl nulles så det nye bildet faktisk vises');
  assert.strictEqual(upd.patch.bannerPath, null, 'gammel bannerPath nulles også');
  assert.ok(deleteCalls.some(d => d.store === 'media' && d.id === 'bn_old'), 'gammel blob ryddes (delt kjerne)');
  ok('rediger-profil: nuller gammel sky-URL + rydder gammel blob (bug-fiks)');

  // Sky konfigurert → nøyaktig samme sky-vei som forsidebildet bruker.
  resetSpies();
  cloudOn = true;
  currentUser = { username: 'dj_test' };
  usersById.dj_test = baseUser({});
  await Profile.uploadBanner({ files: [{ name: 'sky.jpg', type: 'image/jpeg' }] });
  assert.strictEqual(cloudUploads.length, 1, 'sky: bruker SC_Storage akkurat som profilen');
  assert.strictEqual(cloudUploads[0].opts.prefix, 'banner', 'sky: samme banner/-prefiks');
  assert.strictEqual(storeCalls.length, 0, 'sky: ingen lokal blob');
  const cu = updateCalls.find(c => 'bannerUrl' in c.patch);
  assert.ok(cu && /^https:\/\//.test(cu.patch.bannerUrl), 'sky: bannerUrl settes til delbar URL');
  assert.strictEqual(cu.patch.bannerMediaId, null, 'sky: lokal bannerMediaId nulles');
  ok('rediger-profil bruker SAMME sky-kjerne som forsidebildet (samkjørt)');
  cloudOn = false;

  // Feil filtype → avvist med toast, ingen lagring.
  resetSpies();
  currentUser = { username: 'dj_test' };
  usersById.dj_test = baseUser({});
  await Profile.uploadBanner({ files: [{ name: 'ondt.pdf', type: 'application/pdf' }] });
  assert.strictEqual(storeCalls.length, 0, 'feil filtype: ingenting lagres');
  assert.ok(toasts.some(t => t.type === 'error'), 'feil filtype: gir feil-toast');
  ok('rediger-profil: ikke-bilde avvises (delt validering)');

  // Utlogget → no-op (ingen krasj på current.username slik den gamle koden ville gjort).
  resetSpies();
  currentUser = null;
  await Profile.uploadBanner({ files: [{ name: 'x.jpg', type: 'image/jpeg' }] });
  assert.strictEqual(storeCalls.length, 0, 'utlogget: ingenting lagres');
  assert.strictEqual(updateCalls.length, 0, 'utlogget: ingen oppdatering');
  ok('utlogget: uploadBanner er en trygg no-op (krasjer ikke)');
}

(async () => {
  try {
    await testRender();
    await testSetBanner();
    await testDeleteBanner();
    await testUploadBanner();
    console.log(`\n\x1b[32mAlle ${passed} sjekkene passerte ✅\x1b[0m  — bilde-knappene i profilen er trygge.\n`);
    process.exit(0);
  } catch (e) {
    console.error(`\n\x1b[31m✗ TEST FEILET:\x1b[0m ${e.message}\n`);
    console.error(e.stack);
    process.exit(1);
  }
})();
