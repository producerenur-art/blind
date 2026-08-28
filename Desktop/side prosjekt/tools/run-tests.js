#!/usr/bin/env node
/**
 * run-tests.js — køyrer heile testsettet og rapporterer ALT.
 *
 * Kjør:  npm test
 *
 * Kvifor dette finst: `npm test` kjeda tidlegare testfilene med `&&`. Ei einaste
 * raud fil stoppa då resten — i praksis stod suiten raud på test-magazine.js, og
 * dei ti filene etter henne vart aldri køyrde i det heile. Ein regresjon i
 * t.d. test-auth-server.js kunne difor liggje uoppdaga.
 *
 * Her køyrer kvar fil for seg, og oppsummeringa til slutt viser kva som feila.
 * Exit-koden er framleis 1 dersom noko feilar, så CI/deploy-vaner held.
 *
 * Legg til nye testar i TESTS-lista under.
 */
'use strict';
const { spawnSync } = require('child_process');
const path = require('path');

// Ende-til-ende-testar mot live (test-live-site.js, test-loggedin-e2e.js) står
// bevisst UTANFOR: dei krev nett, Chrome, og den siste lagar ein ekte konto.
const TESTS = [
  'test-activation.js',
  'test-activation-e2e.js',
  'test-magazine.js',
  'test-linkpreview.js',
  'test-avatar.js',
  'test-banner.js',
  'test-groups-banner.js',
  'test-delete-track.js',
  'test-profilesync.js',
  'test-editor-tabs.js',
  'test-auth-server.js',
  'test-unsubscribe.js',
  'test-live-reminder.js',
];

const results = [];
for (const file of TESTS) {
  const r = spawnSync(process.execPath, [path.join(__dirname, file)], { stdio: 'inherit' });
  results.push({ file, ok: r.status === 0, code: r.status });
}

const failed = results.filter(r => !r.ok);
console.log('\n\x1b[1m── Testsett ──\x1b[0m');
console.log(`  ${results.length} filer · \x1b[32m${results.length - failed.length} grøne\x1b[0m · ${
  failed.length ? `\x1b[31m${failed.length} raude\x1b[0m` : '0 raude'}`);
for (const f of failed) console.log(`  \x1b[31m✗\x1b[0m ${f.file}  (exit ${f.code})`);
console.log('');

process.exit(failed.length ? 1 : 0);
