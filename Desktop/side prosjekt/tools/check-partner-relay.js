#!/usr/bin/env node
/**
 * check-partner-relay.js — vaktpost for Babaganousha-relayet i 24-Hour Cycle.
 * Bakgrunn 11.10.2026: slottane sto berre i js/shows.js (visning), hjulet i
 * js/radio247.js spelte ikkje stasjonen. Sjekkar mot LIVE siriusfm.no:
 *   1. live radio247.js gir riktig stasjon i begge slottar (sommar- og vintertid)
 *      og IKKJE Baba utanfor slottane,
 *   2. stasjonane finst i live js/radio.js,
 *   3. stream-URL-ane svarar 200 med Access-Control-Allow-Origin.
 * Køyr: node tools/check-partner-relay.js   (exit 1 ved feil)
 */
'use strict';
const https = require('https');
const vm = require('vm');

const BASE = 'https://www.siriusfm.no';
const cb = Date.now();

function get(url, { headOnly = false } = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { Origin: 'https://siriusfm.no' }, timeout: 15000 }, res => {
      if (headOnly) { res.destroy(); return resolve({ status: res.statusCode, headers: res.headers }); }
      let body = '';
      res.setEncoding('utf8');
      res.on('data', d => { body += d; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
  });
}

function stationAt(src, iso) {
  const RealDate = Date;
  class D extends RealDate {
    constructor(...a) { if (a.length) super(...a); else super(iso); }
    static now() { return new RealDate(iso).getTime(); }
  }
  const ctx = { Intl, Date: D, console, setInterval() {}, clearInterval() {} };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(src + '\n;globalThis.R=Radio247;', ctx);
  return ctx.R.pickStationId(ctx.R.currentBlock());
}

// [tid UTC, forventa stasjon (null = IKKJE Baba), forklaring]
const CASES = [
  ['2026-10-18T05:30:00Z', 'babaganousha',      'søn 07:30 CEST'],
  ['2026-11-01T06:30:00Z', 'babaganousha',      'søn 07:30 CET'],
  ['2026-10-14T01:30:00Z', 'babaganousha-labs', 'ons 03:30 CEST'],
  ['2026-11-04T02:30:00Z', 'babaganousha-labs', 'ons 03:30 CET'],
  ['2026-10-18T08:30:00Z', null,                'søn 10:30 CEST (etter slot)'],
  ['2026-10-14T04:30:00Z', null,                'ons 06:30 CEST (etter slot)'],
  ['2026-10-12T05:30:00Z', null,                'man 07:30 CEST (ingen slot)'],
];

let failed = 0;
const rec = (ok, msg) => { if (!ok) failed++; console.log(`${ok ? '✓' : '✗'} ${msg}`); };

(async () => {
  const r247 = await get(`${BASE}/js/radio247.js?cb=${cb}`);
  rec(r247.status === 200, `live radio247.js HTTP ${r247.status}`);
  if (r247.status === 200) {
    for (const [iso, want, label] of CASES) {
      let got;
      try { got = stationAt(r247.body, iso); } catch (e) { got = 'FEIL: ' + e.message; }
      const ok = want ? got === want : !/^babaganousha/.test(String(got));
      rec(ok, `${label}: ${got}${want ? ` (forventa ${want})` : ' (skal ikkje vere Baba)'}`);
    }
  }

  const rjs = await get(`${BASE}/js/radio.js?cb=${cb}`);
  rec(rjs.status === 200, `live radio.js HTTP ${rjs.status}`);
  for (const id of ['babaganousha', 'babaganousha-labs']) {
    const m = rjs.body && rjs.body.match(new RegExp(`id:\\s*'${id}'[\\s\\S]{0,400}?url:\\s*'([^']+)'`));
    rec(!!m, `stasjon ${id} finst i radio.js`);
    if (m) {
      try {
        const s = await get(m[1], { headOnly: true });
        const cors = s.headers['access-control-allow-origin'];
        rec(s.status === 200 && !!cors, `${id} stream HTTP ${s.status}, CORS ${cors || 'MANGLAR'}`);
      } catch (e) {
        rec(false, `${id} stream: ${e.message}`);
      }
    }
  }

  console.log(failed ? `\n${failed} feil` : '\nAlt OK');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
