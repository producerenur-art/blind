#!/usr/bin/env node
/**
 * test-profilesync.js — verifiserer js/profilesync.js FØR deploy.
 *
 * Kjør:  npm test   (eller: node tools/test-profilesync.js)
 *
 * Dekker:
 *   1) _enabled() følger SC_Storage.isConfigured().
 *   2) push(): kaller upsert_profile-RPC med brukernavn, en stabil hemmelighet,
 *      og KUN offentlige felt (aldri password/email/tokens/avatarMediaId).
 *   3) Hemmeligheten er stabil (samme p_secret på tvers av flere push) og lagres
 *      i localStorage (sc_profile_secrets).
 *   4) Av når Supabase ikke er konfigurert → push/fetch/pull er no-ops.
 *   5) pull()/pullAll(): henter via RPC og fletter inn via Auth.cacheRemoteProfile.
 *   6) RPC-feil → push returnerer false, kaster ikke.
 */
'use strict';
const fs     = require('fs');
const vm     = require('vm');
const path   = require('path');
const assert = require('assert');

const ROOT = path.join(__dirname, '..');
let passed = 0;
function ok(name) { passed++; console.log(`  \x1b[32m✓\x1b[0m ${name}`); }

// ── Mutérbar testtilstand ────────────────────────────────────────────────────
let cfgOn = true;                 // SC_Storage.isConfigured()
let rpcCalls = [];                // { name, params }
let cacheCalls = [];              // Auth.cacheRemoteProfile(username, data)
let remoteRows = {};              // det "databasen" returnerer
let rpcError = null;              // tving fram en RPC-feil når satt
function resetSpies() { rpcCalls = []; cacheCalls = []; rpcError = null; }

const store = {};                 // falskt localStorage
const localStorageStub = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
};

const fakeClient = {
  rpc: async (name, params) => {
    rpcCalls.push({ name, params });
    if (rpcError) return { data: null, error: { message: rpcError } };
    if (name === 'get_profile')   return { data: remoteRows[params.p_username] || null, error: null };
    if (name === 'list_profiles') return { data: Object.values(remoteRows), error: null };
    return { data: null, error: null };   // upsert_profile
  },
};

let uuidN = 0;
const sandbox = {
  console,
  JSON, Math, Date, Promise, Object, Array, String, Number,
  localStorage: localStorageStub,
  crypto: { randomUUID: () => `uuid-${++uuidN}-aaaa-bbbb-cccc-dddddddddddd` },
  SC_Storage: { isConfigured: () => cfgOn, client: () => fakeClient },
  Auth: { cacheRemoteProfile: (username, data) => { cacheCalls.push({ username, data }); return true; } },
};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'profilesync.js'), 'utf8'), sandbox);
const ProfileSync = sandbox.ProfileSync;
assert.ok(ProfileSync, 'ProfileSync skal lastes fra js/profilesync.js');

function fullUser(extra) {
  return Object.assign({
    username: 'dj_test', displayName: 'DJ Test', role: 'dj', bio: 'hei',
    bannerUrl: 'https://cloud.example/banner/x.jpg', bannerPath: 'banner/x.jpg',
    // sensitive / lokale felt som ALDRI skal synces:
    password: 'deadbeef', email: 'dj@test.no', activationToken: 'tok123',
    resetToken: 'r', avatarMediaId: 'av_1', musicIds: ['m_1'],
  }, extra || {});
}

async function run() {
  // 1) _enabled følger isConfigured
  console.log('\n_enabled() — følger SC_Storage');
  cfgOn = true;  assert.strictEqual(ProfileSync._enabled(), true,  'på når konfigurert');
  cfgOn = false; assert.strictEqual(ProfileSync._enabled(), false, 'av når ikke konfigurert');
  cfgOn = true;
  ok('_enabled() speiler SC_Storage.isConfigured()');

  // 2) _publicData filtrerer bort sensitive felt
  console.log('\n_publicData() — kun offentlige felt');
  const pub = ProfileSync._publicData(fullUser());
  for (const bad of ['password', 'email', 'activationToken', 'resetToken', 'avatarMediaId', 'musicIds']) {
    assert.ok(!(bad in pub), `${bad} skal IKKE synces`);
  }
  for (const good of ['username', 'displayName', 'role', 'bio', 'bannerUrl', 'bannerPath']) {
    assert.ok(good in pub, `${good} skal synces`);
  }
  ok('_publicData() tar med offentlige felt og dropper passord/e-post/tokens/lokale blob-id-er');

  // 3) push() kaller upsert_profile med stabil hemmelighet
  console.log('\npush() — upsert_profile + stabil hemmelighet');
  resetSpies();
  const okPush = await ProfileSync.push(fullUser());
  assert.strictEqual(okPush, true, 'push lykkes');
  assert.strictEqual(rpcCalls.length, 1, 'nøyaktig én RPC');
  assert.strictEqual(rpcCalls[0].name, 'upsert_profile', 'kaller upsert_profile');
  assert.strictEqual(rpcCalls[0].params.p_username, 'dj_test', 'sender brukernavn');
  assert.ok(typeof rpcCalls[0].params.p_secret === 'string' && rpcCalls[0].params.p_secret.length > 8, 'sender en hemmelighet');
  assert.ok(!('password' in rpcCalls[0].params.p_data), 'p_data lekker ikke passord');
  const secret1 = rpcCalls[0].params.p_secret;

  await ProfileSync.push(fullUser());
  const secret2 = rpcCalls[1].params.p_secret;
  assert.strictEqual(secret1, secret2, 'samme hemmelighet på neste push (stabil)');
  assert.ok(store['sc_profile_secrets'] && store['sc_profile_secrets'].includes('dj_test'), 'hemmelighet lagret i localStorage');
  ok('push() → upsert_profile med stabil, lagret hemmelighet; ingen passord-lekkasje');

  // 4) av når ikke konfigurert
  console.log('\npush()/fetch()/pull() — no-op uten Supabase');
  resetSpies(); cfgOn = false;
  assert.strictEqual(await ProfileSync.push(fullUser()), false, 'push no-op');
  assert.strictEqual(await ProfileSync.fetch('dj_test'), null, 'fetch no-op');
  assert.strictEqual(await ProfileSync.pull('dj_test'), null, 'pull no-op');
  assert.strictEqual(rpcCalls.length, 0, 'ingen RPC når av');
  cfgOn = true;
  ok('uten Supabase: push/fetch/pull er no-ops uten RPC');

  // 5) pull() henter + fletter inn
  console.log('\npull()/pullAll() — henter og fletter inn via Auth');
  resetSpies();
  remoteRows = { dj_test: { username: 'dj_test', displayName: 'DJ Test', bannerUrl: 'https://cloud.example/b.jpg' } };
  const pulled = await ProfileSync.pull('dj_test');
  assert.ok(pulled && pulled.bannerUrl === 'https://cloud.example/b.jpg', 'pull returnerer rad-data');
  assert.strictEqual(rpcCalls[0].name, 'get_profile', 'pull bruker get_profile');
  assert.strictEqual(cacheCalls.length, 1, 'pull fletter inn én profil');
  assert.strictEqual(cacheCalls[0].username, 'dj_test', 'fletter inn riktig bruker');

  resetSpies();
  remoteRows = { a: { username: 'a' }, b: { username: 'b' } };
  const all = await ProfileSync.pullAll();
  assert.strictEqual(all.length, 2, 'pullAll returnerer alle');
  assert.strictEqual(rpcCalls[0].name, 'list_profiles', 'pullAll bruker list_profiles');
  assert.strictEqual(cacheCalls.length, 2, 'pullAll fletter inn alle');
  ok('pull()/pullAll() henter via RPC og fletter inn via Auth.cacheRemoteProfile');

  // 6) RPC-feil → push false, kaster ikke
  console.log('\npush() — RPC-feil håndteres pent');
  resetSpies(); rpcError = 'profile_secret_mismatch';
  const failed = await ProfileSync.push(fullUser());
  assert.strictEqual(failed, false, 'push returnerer false ved RPC-feil');
  ok('RPC-feil → push returnerer false, kaster ikke');

  console.log(`\n\x1b[32mAlle ${passed} sjekkene passerte ✅\x1b[0m  — profil-sync (Supabase) er trygg.\n`);
}

run().catch((e) => { console.error('\x1b[31m✗ test-profilesync feilet:\x1b[0m', e); process.exit(1); });
