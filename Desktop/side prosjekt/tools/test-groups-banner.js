#!/usr/bin/env node
/**
 * test-groups-banner.js — verifiserer banner-opplasting til grupper (js/groups.js)
 * FØR deploy.
 *
 * Dekker:
 *   1) pickCreateBanner() + createGroup(): banner valgt i opprett-skjemaet
 *      lagres på gruppa (banner-feltet i Gun-objektet).
 *   2) cardHtml (via renderAllGroups): banner vises på gruppekortet — synlig for
 *      ALLE som blar i grupper.
 *   3) detailHtml: banner-hero vises inne i gruppa.
 *   4) setGroupBanner(): eier-gated, put({banner}) på gruppa.
 *   5) removeGroupBanner(): eier-gated, nuller banner.
 *   6) Ikke-eier kan verken sette eller fjerne banner.
 */
'use strict';
const fs   = require('fs');
const vm   = require('vm');
const path = require('path');
const assert = require('assert');

const ROOT = path.join(__dirname, '..');
let passed = 0;
function ok(name) { passed++; console.log(`  \x1b[32m✓\x1b[0m ${name}`); }
process.on('unhandledRejection', () => {});

// ── Testtilstand ────────────────────────────────────────────────────────────
let currentUser = { username: 'alice', displayName: 'Alice' };
const usersById = { alice: { username: 'alice', displayName: 'Alice' } };
let toasts = [];
let gunSets = [];   // {ns, obj}
let gunPuts = [];   // {key, patch}
let cloudUploads = [];
let cloudUrl = 'https://cloud.example/banner-1.jpg';

// ── Falskt Gun-tre ──────────────────────────────────────────────────────────
function makeNode(ns) {
  const node = {
    get() { return node; },
    set(obj) { gunSets.push({ ns, obj }); return node; },
    put(patch) { gunPuts.push({ patch }); return node; },
    on() { return node; },
    map() { return { on() {} }; },
  };
  return node;
}
const fakeGun = { get(ns) { return makeNode(ns); } };

// ── Falskt DOM ──────────────────────────────────────────────────────────────
const elValues = {
  'grp-name': 'Psytrance Norge', 'grp-desc': 'Kort om', 'grp-rules': '', 'grp-privacy': 'open',
};
const captures = {};   // id → siste innerHTML
function makeEl(id) {
  let html = '';
  const el = {
    id, style: {}, dataset: {}, files: [],
    get value() { return elValues[id] || ''; }, set value(v) { elValues[id] = v; },
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    addEventListener() {}, removeEventListener() {}, appendChild() {}, removeChild() {},
    setAttribute() {}, getAttribute() { return null; }, querySelector() { return null; },
    querySelectorAll() { return []; }, focus() {}, click() {}, remove() {}, setSelectionRange() {},
    getContext() { return { drawImage() {} }; },
    get textContent() { return this._tc || ''; }, set textContent(v) { this._tc = v; },
  };
  Object.defineProperty(el, 'innerHTML', { get() { return html; }, set(v) { html = v; captures[id] = v; } });
  return el;
}
const elCache = {};
function getEl(id) { return (id in elCache) ? elCache[id] : (elCache[id] = makeEl(id)); }
// Elementa som render-funksjonane skriv til / les frå.
['groups-root', 'tab-alle-grupper', 'grp-banner-preview', 'grp-banner-hint',
 'grp-banner-input', 'grp-name', 'grp-desc', 'grp-rules', 'grp-privacy', 'groups-results'].forEach(getEl);

// ── Sandbox-globalar ────────────────────────────────────────────────────────
const sandbox = {
  console, setTimeout, clearTimeout, Date, Math, JSON, Promise, Set, Object, Array, String, Number, RegExp,
  window: { scrollTo() {} },
  document: { getElementById: (id) => getEl(id), querySelectorAll: () => [] },
  SC: {
    esc: (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])),
    gun: () => fakeGun, NS: { groups: 'groups', gposts: 'gposts' }, sub() {},
  },
  Auth: { current: () => currentUser, getUser: (u) => usersById[u], getUsers: () => usersById, updateUser() {} },
  App: { toast: (m, t) => toasts.push({ m, t }) },
  Icon: (n) => `<i data-icon="${n}"></i>`,
  SC_Storage: { isConfigured: () => true, upload: async (file, opts) => { cloudUploads.push(opts); return { url: cloudUrl, path: 'p/1' }; } },
  Router: { go() {} },
  Image: function () {}, URL: { createObjectURL: () => 'blob:x', revokeObjectURL() {} },
};
sandbox.window = sandbox.window || {};
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/groups.js'), 'utf8'), sandbox, { filename: 'groups.js' });
const Groups = sandbox.window.Groups;
assert(Groups, 'window.Groups skal være definert');

(async () => {
  // Opprett-skjemaet må vises for at picken skal ha eit preview-element.
  Groups.toggleCreate();

  // ── 1) pickCreateBanner + createGroup lagrer banner på gruppa ──────────────
  await Groups.pickCreateBanner({ files: [{ type: 'image/png', name: 'b.png' }] });
  assert.strictEqual(cloudUploads.length, 1, 'banner skal lastes opp til sky');
  assert.strictEqual(getEl('grp-banner-hint').textContent.includes('selected'), true, 'hint skal vise «selected»');

  gunSets = [];
  Groups.createGroup();
  const created = gunSets.find(s => s.ns === 'groups');
  assert(created, 'createGroup skal set-e gruppa i Gun');
  assert.strictEqual(created.obj.banner, cloudUrl, 'gruppa skal lagre banner-URL frå opplastinga');
  ok('pickCreateBanner + createGroup lagrer banner-URL på gruppa');

  const gid = created.obj.id;

  // ── 2) cardHtml viser banner (synlig for alle i grupperlista) ──────────────
  Groups.renderAllGroups('tab-alle-grupper');
  const listHtml = captures['tab-alle-grupper'] || '';
  assert(listHtml.includes('groups-card-banner'), 'gruppekort skal ha banner-element');
  assert(listHtml.includes(cloudUrl), 'gruppekort skal peke på banner-URL');
  ok('banner vises på gruppekortet (synlig for alle som blar i grupper)');

  // ── 3) detailHtml viser banner-hero inne i gruppa ──────────────────────────
  Groups.open(gid);
  const detail = captures['groups-root'] || '';
  assert(detail.includes('groups-detail-banner'), 'gruppedetalj skal ha banner-hero');
  assert(detail.includes(cloudUrl), 'banner-hero skal peke på banner-URL');
  ok('banner-hero vises inne i gruppa');

  // ── 4) setGroupBanner (eier) put-er nytt banner ────────────────────────────
  cloudUrl = 'https://cloud.example/banner-2.jpg';
  gunPuts = [];
  await Groups.setGroupBanner(gid, { files: [{ type: 'image/jpeg', name: 'c.jpg' }] });
  assert(gunPuts.some(p => p.patch && p.patch.banner === cloudUrl), 'setGroupBanner skal put-e nytt banner');
  ok('setGroupBanner (eier) oppdaterer banner');

  // ── 5) removeGroupBanner (eier) nuller banner ──────────────────────────────
  gunPuts = [];
  Groups.removeGroupBanner(gid);
  assert(gunPuts.some(p => p.patch && p.patch.banner === ''), 'removeGroupBanner skal nulle banner');
  ok('removeGroupBanner (eier) fjerner banner');

  // ── 6) Ikke-eier kan verken sette eller fjerne ─────────────────────────────
  currentUser = { username: 'mallory', displayName: 'Mallory' };
  gunPuts = [];
  await Groups.setGroupBanner(gid, { files: [{ type: 'image/png', name: 'x.png' }] });
  Groups.removeGroupBanner(gid);
  assert.strictEqual(gunPuts.length, 0, 'ikke-eier skal ikke kunne endre banner');
  ok('ikke-eier blir avvist (eier-gating)');

  console.log(`\n\x1b[32mBanner-grupper OK — ${passed} sjekker passerte.\x1b[0m`);
})().catch(e => { console.error('\x1b[31m✗ TEST FEILET:\x1b[0m', e.message); process.exit(1); });
