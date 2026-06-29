#!/usr/bin/env node
/**
 * test-magazine.js — verifiserer at hver sjanger-fane i Magasinet har sin
 * EGEN, delbare URL, og at innholdet (inkl. de AI-hentede «Fersk fra nettet»-
 * sakene) styres av den URL-en.
 *
 * Kjør:  npm test   (eller: node tools/test-magazine.js)
 *
 * Dekker:
 *   1) Sjanger-chipsene er <a>-lenker med egne URL-er:
 *        Alle      → #/magazine
 *        <sjanger> → #/magazine/sjanger/<key>
 *   2) genreHref() bygger riktig URL (inkl. fallback for «alle»/tom).
 *   3) renderGenre('<sjanger>') filtrerer seksjonene til kun den sjangeren
 *      og markerer riktig fane som aktiv.
 *   4) Ukjent sjanger faller trygt tilbake til «Alle».
 *   5) filterGenre() navigerer til sjangerens egen URL (driver AI-lastingen
 *      per fane via ruteren).
 *   6) Ruteren (js/app.js) registrerer /magazine/sjanger/:genre → renderGenre,
 *      og den ligger før den generiske /magazine/:id.
 */
'use strict';
const fs   = require('fs');
const vm   = require('vm');
const path = require('path');
const assert = require('assert');

const ROOT = path.join(__dirname, '..');
let passed = 0;
function ok(name) { passed++; console.log(`  \x1b[32m✓\x1b[0m ${name}`); }

// ── Last js/magazine.js i en sandbox med stubbede nettleser-globaler ────────
function loadMagazine() {
  const code = fs.readFileSync(path.join(ROOT, 'js', 'magazine.js'), 'utf8');

  function makeEl() {
    let html = '';
    return {
      style: {},
      get innerHTML() { return html; },
      set innerHTML(v) { html = String(v); },
      querySelectorAll() { return []; },
    };
  }
  const app = makeEl();
  // Bare #app finnes → _loadLive() finner ikke #mag-live og bailer ut, så
  // testen slipper å vente på et (stubbet) nettverkskall.
  const document = { getElementById: (id) => (id === 'app' ? app : null), querySelectorAll: () => [] };

  let hash = '#/magazine';
  const window = {
    scrollTo() {},
    get location() { return location; },
  };
  const location = { get hash() { return hash; }, set hash(v) { hash = String(v); } };

  const sandbox = {
    console, document, window, location,
    Icon: () => '',
    fetch: async () => ({ json: async () => ({ articles: [] }) }),
    encodeURIComponent,
  };
  vm.createContext(sandbox);
  vm.runInContext(code + '\nglobalThis.__Magazine = Magazine;', sandbox);
  return { Magazine: sandbox.__Magazine, app, getHash: () => hash };
}

function testGenreUrls() {
  console.log('\nMagasin: sjanger-faner med egne URL-er (js/magazine.js)');
  const { Magazine, app } = loadMagazine();

  // 2) genreHref bygger riktige URL-er
  assert.strictEqual(Magazine.genreHref('alle'), '#/magazine', 'Alle → #/magazine');
  assert.strictEqual(Magazine.genreHref(), '#/magazine', 'tom → #/magazine');
  assert.strictEqual(Magazine.genreHref('psytrance'), '#/magazine/sjanger/psytrance',
    'psytrance → #/magazine/sjanger/psytrance');
  ok('genreHref() bygger riktig URL per fane (inkl. fallback)');

  // 1) Chipsene er <a>-lenker med egne URL-er, ikke onclick-knapper
  Magazine.renderGenre('alle');
  const html = app.innerHTML;
  assert.ok(html.includes('<a class="mag-chip'), 'chipsene skal være <a>-lenker');
  assert.ok(!/onclick=.*filterGenre/.test(html), 'chipsene skal ikke lenger bruke onclick');
  for (const key of ['psybient', 'psytrance', 'goa', 'house', 'trance', 'dub', 'downtempo']) {
    assert.ok(html.includes(`href="#/magazine/sjanger/${key}"`),
      `fanen «${key}» skal ha sin egen URL`);
  }
  assert.ok(html.includes('href="#/magazine"'), 'Alle-fanen skal peke på #/magazine');
  // Antall faner = 12 sjangre + «Alle» = 13 (<a>-chips, ikke .mag-chips-containeren)
  assert.strictEqual((html.match(/<a class="mag-chip/g) || []).length, 13, 'det skal være 13 faner');
  ok('alle 13 faner er <a>-lenker med hver sin URL');
}

function testFiltering() {
  console.log('\nMagasin: URL-en bestemmer innholdet');
  const { Magazine, app } = loadMagazine();

  // 3) renderGenre filtrerer til kun valgt sjanger og markerer aktiv fane
  Magazine.renderGenre('psytrance');
  let html = app.innerHTML;
  assert.ok(html.includes('mag-chip active" data-g="psytrance"'), 'psytrance-fanen skal være aktiv');
  assert.ok(html.includes('Psybient-arven'), 'en psytrance-sak skal vises');
  assert.ok(!html.includes('Anjunadeep 16'), 'en ikke-psytrance-sak skal IKKE vises');
  ok('renderGenre(«psytrance») viser kun psytrance-innhold + aktiv fane');

  // 4) Ukjent sjanger → fallback til «Alle» (viser alt igjen)
  Magazine.renderGenre('finnes-ikke');
  html = app.innerHTML;
  assert.ok(html.includes('mag-chip active" data-g="alle"'), 'ukjent sjanger skal aktivere «Alle»');
  assert.ok(html.includes('Anjunadeep 16') && html.includes('Psybient-arven'),
    'fallback skal vise alle saker');
  ok('ukjent sjanger faller trygt tilbake til «Alle»');
}

function testNavigation() {
  console.log('\nMagasin: filterGenre() navigerer til fanens URL');
  const { Magazine, getHash } = loadMagazine();

  Magazine.filterGenre('goa');
  assert.strictEqual(getHash(), '#/magazine/sjanger/goa', 'filterGenre(«goa») → sjangerens URL');
  Magazine.filterGenre('alle');
  assert.strictEqual(getHash(), '#/magazine', 'filterGenre(«alle») → #/magazine');
  ok('filterGenre() oppdaterer URL-en (lar ruteren laste AI-innholdet per fane)');
}

function testRoute() {
  console.log('\nMagasin: ruten er registrert (js/app.js)');
  const src = fs.readFileSync(path.join(ROOT, 'js', 'app.js'), 'utf8');

  assert.ok(src.includes("'/magazine/sjanger/:genre'"), 'ruten /magazine/sjanger/:genre skal finnes');
  assert.ok(/\/magazine\/sjanger\/:genre'.*Magazine\.renderGenre/.test(src),
    'ruten skal kalle Magazine.renderGenre');
  assert.ok(/'\/magazine'[^\n]*Magazine\.renderGenre\('alle'\)/.test(src),
    '/magazine skal vise «Alle» via renderGenre');
  // Den spesifikke sjanger-ruten må komme før den generiske /magazine/:id
  const iGenre = src.indexOf("'/magazine/sjanger/:genre'");
  const iId    = src.indexOf("'/magazine/:id'");
  assert.ok(iGenre !== -1 && iId !== -1 && iGenre < iId,
    '/magazine/sjanger/:genre skal defineres før /magazine/:id');
  ok('ruten /magazine/sjanger/:genre → renderGenre, definert før /magazine/:id');
}

(async () => {
  try {
    testGenreUrls();
    testFiltering();
    testNavigation();
    testRoute();
    console.log(`\n\x1b[32mAlle ${passed} sjekkene passerte ✅\x1b[0m  — hver magasin-fane har sin egen URL.\n`);
    process.exit(0);
  } catch (e) {
    console.error(`\n\x1b[31m✗ TEST FEILET:\x1b[0m ${e.message}\n`);
    console.error(e.stack);
    process.exit(1);
  }
})();
