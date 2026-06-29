#!/usr/bin/env node
/**
 * test-linkpreview.js — verifiserer lenke-forhåndsvisningen for delte lenker:
 *   1) linkify() escaper teksten OG gjør URL-er om til klikkbare <a>-lenker,
 *      og plukker ut URL-ene (uten etterfølgende tegnsetting).
 *   2) cardHtml() lager et forhåndsvisnings-skall med URL + nøkkel.
 *   3) api/unfurl.buildEmbed() bygger riktig, trygg play-/embed-URL for
 *      SoundCloud, YouTube, Spotify og Bandcamp — og avviser ukjente verter.
 *
 * Kjør:  npm test   (eller: node tools/test-linkpreview.js)
 */
'use strict';
const path   = require('path');
const assert = require('assert');

const ROOT = path.join(__dirname, '..');
const LinkPreview = require(path.join(ROOT, 'js', 'linkpreview.js'));
const unfurl      = require(path.join(ROOT, 'api', 'unfurl.js'));

let passed = 0;
function ok(name) { passed++; console.log(`  \x1b[32m✓\x1b[0m ${name}`); }

function testLinkify() {
  console.log('\nLenke-forhåndsvisning: linkify() (js/linkpreview.js)');

  const r = LinkPreview.linkify('Sjekk denne https://ultimae.bandcamp.com/album/laniakea da!');
  assert.deepStrictEqual(r.urls, ['https://ultimae.bandcamp.com/album/laniakea'],
    'URL-en skal plukkes ut');
  assert.ok(r.html.includes('<a class="cp-link'), 'URL-en skal bli en <a>-lenke');
  assert.ok(r.html.includes('href="https://ultimae.bandcamp.com/album/laniakea"'),
    'lenka skal peke på URL-en');
  assert.ok(r.html.includes('target="_blank"') && r.html.includes('rel="noopener'),
    'lenka skal åpne trygt i ny fane');
  ok('gjør delt lenke klikkbar og plukker ut URL-en');

  // Etterfølgende tegnsetting skal ikke bli en del av lenka
  const p = LinkPreview.linkify('(se https://soundcloud.com/ott/hiraeth).');
  assert.strictEqual(p.urls[0], 'https://soundcloud.com/ott/hiraeth',
    'avsluttende «).» skal ikke være med i URL-en');
  ok('avsluttende tegnsetting skilles ut av lenka');

  // Escaping: ren tekst med <, > og & skal escapes (ingen HTML-injeksjon)
  const x = LinkPreview.linkify('<b>hei</b> & farvel');
  assert.ok(!x.html.includes('<b>') && x.html.includes('&lt;b&gt;') && x.html.includes('&amp;'),
    'HTML i teksten skal escapes');
  assert.deepStrictEqual(x.urls, [], 'ingen URL → ingen lenker');
  ok('escaper vanlig tekst (ingen HTML-injeksjon)');

  // Tom/manglende tekst
  assert.deepStrictEqual(LinkPreview.linkify('').urls, [], 'tom tekst gir ingen URL-er');
  ok('takler tom tekst');
}

function testCard() {
  console.log('\nLenke-forhåndsvisning: cardHtml()');
  const html = LinkPreview.cardHtml('https://ultimae.bandcamp.com/album/laniakea', 'p_123');
  assert.ok(html.includes('class="cp-prev"'), 'kortet skal ha cp-prev-skallet');
  assert.ok(html.includes('data-lp-idle'), 'kortet skal markeres for hydrering');
  assert.ok(html.includes('data-key="p_123"'), 'kortet skal bære innleggsnøkkelen');
  assert.ok(html.includes('data-url="https://ultimae.bandcamp.com/album/laniakea"'),
    'kortet skal bære URL-en');
  // Ikke-http(s) skal avvises (ingen javascript:-skjema e.l.)
  assert.strictEqual(LinkPreview.cardHtml('javascript:alert(1)', 'k'), '',
    'ikke-http(s)-URL skal avvises');
  ok('cardHtml() lager trygt forhåndsvisnings-skall (og avviser ikke-http)');
}

function testBuildEmbed() {
  console.log('\nLenke-forhåndsvisning: api/unfurl.buildEmbed()');
  const { buildEmbed } = unfurl;

  // SoundCloud — bygges direkte fra spor-URL-en
  const sc = buildEmbed('https://soundcloud.com/ott/hiraeth');
  assert.ok(sc.startsWith('https://w.soundcloud.com/player/?url='), 'SoundCloud → w.soundcloud.com-spiller');
  assert.ok(sc.includes(encodeURIComponent('https://soundcloud.com/ott/hiraeth')), 'spor-URL-en skal være med');
  ok('SoundCloud → innebygd spiller');

  // YouTube — både watch?v= og youtu.be
  assert.strictEqual(buildEmbed('https://www.youtube.com/watch?v=abc123XYZ_-'),
    'https://www.youtube.com/embed/abc123XYZ_-?autoplay=1&rel=0', 'YouTube watch → embed');
  assert.strictEqual(buildEmbed('https://youtu.be/abc123XYZ_-'),
    'https://www.youtube.com/embed/abc123XYZ_-?autoplay=1&rel=0', 'youtu.be → embed');
  ok('YouTube → embed-spiller (watch + youtu.be)');

  // Spotify
  assert.strictEqual(buildEmbed('https://open.spotify.com/album/4aXkAAAbbBBcc'),
    'https://open.spotify.com/embed/album/4aXkAAAbbBBcc', 'Spotify album → embed');
  ok('Spotify → embed-spiller');

  // Bandcamp — embed ligger i og:video (krever HTML), uten den: tom
  const bcOg = (prop) => (prop === 'og:video'
    ? 'https://bandcamp.com/EmbeddedPlayer/album=12345/size=large/' : '');
  assert.strictEqual(buildEmbed('https://ultimae.bandcamp.com/album/laniakea', bcOg),
    'https://bandcamp.com/EmbeddedPlayer/album=12345/size=large/', 'Bandcamp → EmbeddedPlayer fra og:video');
  assert.strictEqual(buildEmbed('https://ultimae.bandcamp.com/album/laniakea'), '',
    'Bandcamp uten og:video → ingen embed');
  ok('Bandcamp → EmbeddedPlayer fra og:video');

  // Sikkerhet: ukjent vert skal ikke gi en embed (heller ikke via og:video-spoof)
  const evilOg = () => 'https://evil.example.com/player';
  assert.strictEqual(buildEmbed('https://nyheter.example.com/sak', evilOg), '',
    'ukjent vert skal aldri gi en embed-iframe');
  ok('avviser embed fra ukjente/utrygge verter');
}

(async () => {
  try {
    testLinkify();
    testCard();
    testBuildEmbed();
    console.log(`\n\x1b[32mAlle ${passed} sjekkene passerte ✅\x1b[0m  — delte lenker blir klikkbare med cover + play.\n`);
    process.exit(0);
  } catch (e) {
    console.error(`\n\x1b[31m✗ TEST FEILET:\x1b[0m ${e.message}\n`);
    console.error(e.stack);
    process.exit(1);
  }
})();
