#!/usr/bin/env node
/**
 * test-editor-tabs.js — verifiserer at profil-editoren (#/edit) er ryddet opp:
 * de 11 flate fanene er nå gruppert i 4 kategorier (top-nivå) med under-faner.
 *
 * Kjør:  node tools/test-editor-tabs.js   (eller npm test)
 *
 * Dekker:
 *   1) renderEditor() lager den to-nivå-navigasjonen: 4 .group-tab-btn
 *      (utseende/innhold/aktivitet/nettverk) + én .editor-subtabs-rad per gruppe,
 *      og ALLE 11 fane-id-ene finnes nøyaktig én gang som data-tab.
 *   2) Bare første gruppe + første under-fane er aktiv ved oppstart; de andre
 *      under-fane-radene er .hidden.
 *   3) window.switchEditorGroup(): bytter aktiv gruppe, viser kun den gruppens
 *      under-faner, og åpner gruppens første fane (riktig #etab-panel synlig).
 *   4) window.switchEditorTab(): viser valgt panel og markerer valgt fane.
 */
'use strict';
const fs     = require('fs');
const vm     = require('vm');
const path   = require('path');
const assert = require('assert');

const ROOT = path.join(__dirname, '..');
let passed = 0;
function ok(name) { passed++; console.log(`  \x1b[32m✓\x1b[0m ${name}`); }
process.on('unhandledRejection', () => {});

// ── Liten DOM-simulering: nok til at switch-funksjonene kan testes på ekte vis ──
let captured = '';                 // siste app.innerHTML
const registry = [];               // alle opprettede element (for querySelectorAll)

function classListFor(el) {
  return {
    add: (c) => el._cls.add(c),
    remove: (c) => el._cls.delete(c),
    toggle: (c, force) => {
      const want = force === undefined ? !el._cls.has(c) : !!force;
      if (want) el._cls.add(c); else el._cls.delete(c);
      return want;
    },
    contains: (c) => el._cls.has(c),
  };
}
function makeEl(tag) {
  const el = {
    tag: tag || 'div', _cls: new Set(), style: {}, dataset: {},
    value: '', files: [], children: [],
    addEventListener() {}, removeEventListener() {}, setAttribute() {},
    getAttribute() { return null; }, appendChild() {}, removeChild() {},
    focus() {}, remove() {},
    getContext() { return { fillRect() {}, drawImage() {}, clearRect() {} }; },
    querySelector(sel) { return this._all(sel)[0] || null; },
    querySelectorAll(sel) { return this._all(sel); },
    _all() { return []; },
    click() { this._onclick && this._onclick(); },
    innerHTML: '',
  };
  el.classList = classListFor(el);
  registry.push(el);
  return el;
}

// Bygg et ekte element-tre fra den fangede HTML-en for de delene switch-koden
// faktisk spør etter: .group-tab-btn, [data-group-tabs], .tab-btn, #etab-*.
function buildDomFromHtml(html) {
  registry.length = 0;
  const els = [];

  // group-tab-btn-er
  const groupBtns = [...html.matchAll(/<button class="group-tab-btn([^"]*)" data-group="([^"]+)"[^>]*onclick="switchEditorGroup\('([^']+)',this\)"/g)]
    .map(m => { const el = makeEl('button'); el._cls = new Set(['group-tab-btn', ...(m[1].trim() ? m[1].trim().split(/\s+/) : [])]); el.classList = classListFor(el); el.dataset.group = m[2]; el._group = m[3]; els.push(el); return el; });

  // under-fane-rader + deres tab-btn-er
  const rowRe = /<div class="editor-subtabs([^"]*)" data-group-tabs="([^"]+)">([\s\S]*?)<\/div>/g;
  const rows = [];
  let rm;
  while ((rm = rowRe.exec(html))) {
    const row = makeEl('div');
    row._cls = new Set(['editor-subtabs', ...(rm[1].trim() ? rm[1].trim().split(/\s+/) : [])]);
    row.classList = classListFor(row);
    row.dataset.groupTabs = rm[2];
    const tabBtns = [...rm[3].matchAll(/<button class="tab-btn([^"]*)" data-tab="([^"]+)"[^>]*onclick="switchEditorTab\('([^']+)',this\)"/g)]
      .map(t => {
        const b = makeEl('button');
        b._cls = new Set(['tab-btn', ...(t[1].trim() ? t[1].trim().split(/\s+/) : [])]);
        b.classList = classListFor(b);
        b.dataset.tab = t[2]; b._tab = t[3];
        b._onclick = () => sandbox.switchEditorTab(b._tab, b);
        els.push(b);
        return b;
      });
    row._tabBtns = tabBtns;
    row._onclick = null;
    row._all = (sel) => sel.includes('.tab-btn') ? tabBtns : [];
    rows.push(row);
    els.push(row);
  }
  groupBtns.forEach(b => { b._onclick = () => sandbox.switchEditorGroup(b._group, b); });

  // #etab-<id>-paneler
  const panels = {};
  [...html.matchAll(/id="etab-([a-z]+)"([^>]*)>/g)].forEach(m => {
    const p = makeEl('div'); if (/\bhidden\b/.test(m[2])) p._cls.add('hidden');
    p.classList = classListFor(p); p._etab = m[1]; panels['etab-' + m[1]] = p; els.push(p);
  });

  return { els, panels, rows, groupBtns };
}

let DOM = { els: [], panels: {}, rows: [], groupBtns: [] };
const documentStub = {
  getElementById: (id) => id === 'app' ? appEl : (DOM.panels[id] || makeEl('div')),
  createElement: (t) => makeEl(t),
  addEventListener() {},
  querySelector: (sel) => documentStub.querySelectorAll(sel)[0] || null,
  querySelectorAll: (sel) => {
    if (sel === '.group-tab-btn') return DOM.groupBtns;
    if (sel === '[data-group-tabs]') return DOM.rows;
    if (sel.startsWith('[data-group-tabs="')) {
      const g = sel.match(/\[data-group-tabs="([^"]+)"\]/)[1];
      const row = DOM.rows.find(r => r.dataset.groupTabs === g);
      if (sel.includes('.tab-btn')) return row ? row._tabBtns : [];
      return row ? [row] : [];
    }
    if (sel === '[id^="etab-"]') return Object.values(DOM.panels);
    if (sel === '.editor-panel-header .tab-btn') return DOM.rows.flatMap(r => r._tabBtns);
    return [];
  },
  body: makeEl('body'), head: makeEl('head'),
};
const appEl = (() => {
  const el = makeEl('div'); el.id = 'app';
  Object.defineProperty(el, 'innerHTML', { get() { return captured; }, set(v) { captured = v; } });
  return el;
})();

// ── Sandkasse ───────────────────────────────────────────────────────────────
const user = {
  username: 'dj_test', displayName: 'DJ Test', role: 'dj', bio: '',
  profileVisibility: 'public', theme: null, links: [],
  platforms: [], sites: [], mySites: [], festivals: [], events: [], labels: [],
  musicIds: [], mixIds: [], mediaIds: [], customPage: { blocks: [] },
};
const sandbox = {
  console, setTimeout, clearTimeout, setInterval, clearInterval,
  requestAnimationFrame: (cb) => setTimeout(cb, 0), cancelAnimationFrame() {},
  JSON, Math, Date, Promise, Object, Array, String, Number, RegExp, parseInt, parseFloat, isNaN,
  document: documentStub,
  confirm: () => true, alert() {}, prompt: () => null,
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  Icon: (n) => `[icon:${n}]`,
  iconForEmoji: (e) => `[emoji:${e}]`,
  Router: { go() {} },
  App: { toast() {} },
  AI: { hasKey: () => false, ambientImageQueries: [] },
  Auth: {
    current: () => user, getUser: () => user,
    defaultTheme: () => ({ bgColor: '#0f0f1a', textColor: '#fff', primaryColor: '#7c3aed', secondaryColor: '#2563eb', accentColor: '#22d3ee', fontFamily: 'Inter', bgType: 'color', layout: 'default', cardStyle: 'glass', bgImageFilters: {} }),
    updateUser() {},
  },
  DB: { getAllByIds: async () => [], getBlobUrl: async () => 'blob:x', get: async () => null, getAll: async () => [] },
  Community: { subscribe() {} },
  Marketplace: { isEnabled: () => false },
  VideoEditor: { open() {} },
};
sandbox.window = sandbox;
vm.createContext(sandbox);

const code = fs.readFileSync(path.join(ROOT, 'js', 'profile.js'), 'utf8');
vm.runInContext(code + '\n;window.__Profile = Profile;', sandbox);
const Profile = sandbox.__Profile;
assert.ok(Profile && typeof Profile.renderEditor === 'function', 'Profile.renderEditor eksponert');

const GROUPS = {
  utseende:  ['theme', 'avatar', 'mypage'],
  innhold:   ['media', 'music', 'mixes'],
  aktivitet: ['events', 'festivals'],
  nettverk:  ['labels', 'platforms', 'mysites'],
};
const ALL_TABS = Object.values(GROUPS).flat();

(async () => {
  try {
    // ── 1) renderEditor lager den grupperte to-nivå-navigasjonen ──────────────
    console.log('\nrenderEditor() — to-nivå fane-navigasjon (4 grupper)');
    await Profile.renderEditor();
    const html = captured;
    assert.ok(html.includes('editor-tabnav'), 'editor-tabnav-container finnes');

    const groupMatches = [...html.matchAll(/class="group-tab-btn[^"]*" data-group="([^"]+)"/g)].map(m => m[1]);
    assert.deepStrictEqual(groupMatches, ['utseende', 'innhold', 'aktivitet', 'nettverk'],
      'nøyaktig 4 grupper i rekkefølge: utseende, innhold, aktivitet, nettverk');
    ok('4 kategori-knapper (Utseende, Innhold, Aktivitet, Nettverk)');

    for (const [g, tabs] of Object.entries(GROUPS)) {
      const rowM = html.match(new RegExp(`<div class="editor-subtabs[^"]*" data-group-tabs="${g}">([\\s\\S]*?)</div>`));
      assert.ok(rowM, `under-fane-rad for gruppe «${g}» finnes`);
      const ids = [...rowM[1].matchAll(/data-tab="([^"]+)"/g)].map(m => m[1]);
      assert.deepStrictEqual(ids, tabs, `gruppe «${g}» har riktige under-faner: ${tabs.join(', ')}`);
    }
    ok('hver gruppe har riktige under-faner (3+3+2+3)');

    // Alle 11 fane-id-er finnes nøyaktig én gang som data-tab, og alle har et etab-panel
    const allDataTabs = [...html.matchAll(/data-tab="([^"]+)"/g)].map(m => m[1]);
    assert.strictEqual(allDataTabs.length, 11, 'totalt 11 under-faner');
    assert.deepStrictEqual([...allDataTabs].sort(), [...ALL_TABS].sort(), 'alle 11 fane-id-er er dekket, ingen duplikat');
    for (const tab of ALL_TABS) {
      assert.ok(new RegExp(`id="etab-${tab}"`).test(html), `panel #etab-${tab} finnes for fanen`);
    }
    ok('alle 11 faner finnes nøyaktig én gang og har hvert sitt #etab-panel');

    // ── 2) Riktig aktiv-tilstand ved oppstart ────────────────────────────────
    const firstGroupActive = /class="group-tab-btn active" data-group="utseende"/.test(html);
    assert.ok(firstGroupActive, 'første gruppe (utseende) er aktiv ved oppstart');
    // Bare første gruppes under-fane-rad er synlig
    for (const g of Object.keys(GROUPS)) {
      const rowM = html.match(new RegExp(`<div class="editor-subtabs([^"]*)" data-group-tabs="${g}">`));
      const isHidden = /\bhidden\b/.test(rowM[1]);
      if (g === 'utseende') assert.ok(!isHidden, 'utseende-raden er synlig'); else assert.ok(isHidden, `${g}-raden er skjult ved oppstart`);
    }
    // Første under-fane (theme) aktiv
    assert.ok(/<button class="tab-btn active" data-tab="theme"/.test(html), 'theme er aktiv under-fane ved oppstart');
    ok('oppstart: utseende-gruppen + Tema-fanen aktiv, øvrige rader skjult');

    // ── 3) switchEditorGroup() bytter gruppe + åpner gruppens første fane ─────
    console.log('\nwindow.switchEditorGroup() / switchEditorTab() — bytting');
    DOM = buildDomFromHtml(html);
    // Marker theme-panelet synlig som utgangspunkt (slik renderEditor gjør)
    assert.strictEqual(typeof sandbox.switchEditorGroup, 'function', 'switchEditorGroup definert av bindEditorEvents');
    assert.strictEqual(typeof sandbox.switchEditorTab, 'function', 'switchEditorTab definert');

    // Klikk «Aktivitet» → kun aktivitet-raden synlig, events-panel åpnet
    const aktBtn = DOM.groupBtns.find(b => b._group === 'aktivitet');
    aktBtn.click();
    assert.ok(aktBtn._cls.has('active'), 'aktivitet-knappen ble aktiv');
    assert.ok(!DOM.groupBtns.find(b => b._group === 'utseende')._cls.has('active'), 'utseende-knappen er ikke lenger aktiv');
    const aktRow = DOM.rows.find(r => r.dataset.groupTabs === 'aktivitet');
    const utsRow = DOM.rows.find(r => r.dataset.groupTabs === 'utseende');
    assert.ok(!aktRow._cls.has('hidden'), 'aktivitet-raden ble synlig');
    assert.ok(utsRow._cls.has('hidden'), 'utseende-raden ble skjult');
    assert.ok(!DOM.panels['etab-events']._cls.has('hidden'), 'events-panelet ble åpnet (gruppens første fane)');
    assert.ok(DOM.panels['etab-theme']._cls.has('hidden'), 'theme-panelet ble skjult');
    assert.ok(aktRow._tabBtns[0]._cls.has('active'), 'events-fanen er markert aktiv');
    ok('switchEditorGroup(«aktivitet») → kun aktivitet-rad synlig + events-panel åpnet');

    // ── 4) switchEditorTab() innen en gruppe ─────────────────────────────────
    const festBtn = aktRow._tabBtns.find(b => b._tab === 'festivals');
    festBtn.click();
    assert.ok(!DOM.panels['etab-festivals']._cls.has('hidden'), 'festivals-panelet vises');
    assert.ok(DOM.panels['etab-events']._cls.has('hidden'), 'events-panelet skjules igjen');
    assert.ok(festBtn._cls.has('active') && !aktRow._tabBtns[0]._cls.has('active'), 'festivals er nå eneste aktive fane');
    ok('switchEditorTab(«festivals») → riktig panel vises, riktig fane markert');

    console.log(`\n\x1b[32mAlle ${passed} sjekkene passerte ✅\x1b[0m  — profil-editoren er ryddet i 4 grupper.\n`);
    process.exit(0);
  } catch (e) {
    console.error(`\n\x1b[31m✗ TEST FEILET:\x1b[0m ${e.message}\n`);
    console.error(e.stack);
    process.exit(1);
  }
})();
