#!/usr/bin/env node
/**
 * test-livemix.js — verifiserer Live Mix-tid-kjøpet FØR deploy.
 *
 * Kjør:  npm test   (eller: node tools/test-livemix.js)
 *
 * Dekker:
 *   1) api/create-checkout.js: product:'livemix' lager en ENGANGS-betaling
 *      (mode:'payment'), 150 kr/time (15000 øre) × timer, nok, og legger
 *      product/hours/slot i metadata. Klienten kan ikke sette beløpet selv.
 *   2) api/verify-session.js returnerer product/hours/slot fra metadata, så
 *      kvitteringen kan bygges etter Stripe-redirect.
 *   3) js/livemix.js: prismatten (priceFor) og bookingobjektet (_makeBooking)
 *      er riktige og speiler serverprisen (RATE_ORE === LIVEMIX_RATE_ORE).
 */
'use strict';
const fs     = require('fs');
const vm     = require('vm');
const path   = require('path');
const assert = require('assert');

const ROOT = path.join(__dirname, '..');
let passed = 0;
function ok(name) { passed++; console.log(`  \x1b[32m✓\x1b[0m ${name}`); }

// Mock «stripe» FØR vi krever inn handlerne, så ingen ekte API-kall skjer.
// Begge handlerne gjør `require('stripe')(KEY)` på toppnivå → samme fabrikk.
let captured = null;                 // opts sendt til sessions.create
let retrieveResult = null;           // det sessions.retrieve skal returnere
function installStripeMock() {
  const stripePath = require.resolve('stripe');
  const factory = () => ({
    checkout: {
      sessions: {
        create: async (opts) => { captured = opts; return { id: 'cs_test_123', url: 'https://stripe.test/checkout/cs_test_123' }; },
        retrieve: async (_id) => retrieveResult,
      },
    },
  });
  require.cache[stripePath] = { id: stripePath, filename: stripePath, loaded: true, exports: factory };
}

async function callHandler(handler, req) {
  let statusCode = null, jsonBody = null;
  const res = {
    setHeader() {}, end() { return this; },
    status(c) { statusCode = c; return this; },
    json(b) { jsonBody = b; return this; },
  };
  await handler(req, res);
  return { statusCode, jsonBody };
}

// ───────────────────────────────────────────────────────────────────────────
// 1) create-checkout: engangsbetaling for Live Mix
// ───────────────────────────────────────────────────────────────────────────
async function testCheckout() {
  console.log('\ncreate-checkout (api/create-checkout.js) — Live Mix engangsbetaling');
  process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
  process.env.SITE_URL = 'https://www.soundcoredevelopment.com';
  const handler = require(path.join(ROOT, 'api', 'create-checkout.js'));

  captured = null;
  const { statusCode, jsonBody } = await callHandler(handler, {
    method: 'POST', headers: { host: 'profilverse.vercel.app' },
    body: { username: 'dj_test', product: 'livemix', hours: 3, slot: '2026-07-01T20:00' },
  });

  assert.strictEqual(statusCode, 200, 'skal svare 200');
  assert.ok(jsonBody && jsonBody.url, 'skal returnere checkout-URL');
  ok('livemix-checkout → 200 med checkout-URL');

  assert.strictEqual(captured.mode, 'payment', 'skal være engangsbetaling (mode:payment), ikke abonnement');
  ok('mode = payment (ingen abonnement, ingen binding)');

  const li = captured.line_items[0];
  assert.strictEqual(li.price_data.currency, 'nok', 'valuta = nok');
  assert.strictEqual(li.price_data.unit_amount, 15000, 'pris = 15000 øre (150 kr) per time');
  assert.strictEqual(li.quantity, 3, 'kvantitet = antall timer');
  assert.ok(!li.price_data.recurring, 'skal IKKE være recurring');
  ok('150 kr/time × 3 timer = 450 kr, én gang (unit_amount 15000 × quantity 3)');

  assert.strictEqual(captured.metadata.product, 'livemix', 'metadata.product = livemix');
  assert.strictEqual(captured.metadata.hours, '3', 'metadata.hours = 3');
  assert.strictEqual(captured.metadata.slot, '2026-07-01T20:00', 'metadata.slot tatt vare på');
  assert.strictEqual(captured.metadata.username, 'dj_test', 'metadata.username tatt vare på');
  ok('metadata bærer username + product + hours + slot videre til verify/webhook');

  // Klienten kan ALDRI overstyre beløpet: send et falskt beløp + for mange timer.
  captured = null;
  await callHandler(handler, {
    method: 'POST', headers: { host: 'x' },
    body: { username: 'dj_test', product: 'livemix', hours: 999, amount: 1, unit_amount: 1 },
  });
  assert.strictEqual(captured.line_items[0].price_data.unit_amount, 15000, 'serveren holder på 15000 øre uansett');
  assert.strictEqual(captured.line_items[0].quantity, 8, 'timer begrenses til maks 8');
  ok('klienten kan ikke sette pris/beløp selv (server-autoritativ, maks 8 t)');
}

// ───────────────────────────────────────────────────────────────────────────
// 2) verify-session returnerer livemix-metadata
// ───────────────────────────────────────────────────────────────────────────
async function testVerify() {
  console.log('\nverify-session (api/verify-session.js) — livemix-metadata');
  const handler = require(path.join(ROOT, 'api', 'verify-session.js'));

  retrieveResult = {
    id: 'cs_test_123', payment_status: 'paid', status: 'complete',
    amount_total: 45000,
    metadata: { username: 'dj_test', product: 'livemix', hours: '3', slot: '2026-07-01T20:00' },
    customer_details: { email: 'dj@test.no' },
  };

  const { statusCode, jsonBody } = await callHandler(handler, {
    method: 'GET', query: { session_id: 'cs_test_123' },
  });

  assert.strictEqual(statusCode, 200, 'skal svare 200 for betalt sesjon');
  assert.strictEqual(jsonBody.product, 'livemix', 'product = livemix');
  assert.strictEqual(jsonBody.hours, 3, 'hours parset til tall 3');
  assert.strictEqual(jsonBody.slot, '2026-07-01T20:00', 'slot tatt vare på');
  assert.strictEqual(jsonBody.amountTotal, 45000, 'amountTotal fra Stripe');
  ok('verify-session gir product/hours/slot/amountTotal til kvitteringen');
}

// ───────────────────────────────────────────────────────────────────────────
// 3) js/livemix.js — prismatte + bookingobjekt
// ───────────────────────────────────────────────────────────────────────────
function loadLiveMix() {
  const code = fs.readFileSync(path.join(ROOT, 'js', 'livemix.js'), 'utf8');
  const sandbox = { window: {}, console };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  return sandbox.window.LiveMix;
}

function testLiveMixModule() {
  console.log('\nLive Mix-modul (js/livemix.js)');
  const LiveMix = loadLiveMix();
  assert.ok(LiveMix, 'LiveMix skal eksponeres på window');

  // NB: priceFor-objektet er laget inne i vm-konteksten (annen prototype), så vi
  // sammenligner felt-for-felt i stedet for deepStrictEqual (kryss-realm).
  const eqPrice = (h, kr, ore) => {
    const p = LiveMix.priceFor(h);
    assert.strictEqual(p.hours, h);
    assert.strictEqual(p.kr, kr);
    assert.strictEqual(p.ore, ore);
  };
  eqPrice(1, 150, 15000);
  eqPrice(2, 300, 30000);
  eqPrice(3, 450, 45000);
  ok('priceFor: 1 t 150 kr · 2 t 300 kr · +150 kr/t videre');

  assert.strictEqual(LiveMix.priceFor(0).hours, 1, '0 timer begrenset opp til 1');
  assert.strictEqual(LiveMix.priceFor(99).hours, 8, '99 timer begrenset ned til maks 8');
  ok('priceFor begrenser til [1, 8] timer');

  const b = LiveMix._makeBooking({ username: 'dj_test' }, { hours: 2, slotISO: '2026-07-01T20:00', test: true });
  assert.strictEqual(b.product, 'livemix');
  assert.strictEqual(b.hours, 2);
  assert.strictEqual(b.kr, 300);
  assert.strictEqual(b.username, 'dj_test');
  assert.strictEqual(b.slot, '2026-07-01T20:00');
  assert.strictEqual(b.status, 'reservert');
  assert.strictEqual(b.test, true);
  assert.ok(/^TEST-/.test(b.ref), 'testkjøp får TEST-prefiks på ordre-ref');
  ok('_makeBooking bygger riktig booking (testkjøp → TEST-ref, status «reservert»)');

  const real = LiveMix._makeBooking({ username: 'dj_test' }, { hours: 1, test: false });
  assert.ok(/^LM-/.test(real.ref), 'ekte kjøp får LM-prefiks');
  assert.strictEqual(real.test, false);
  ok('_makeBooking skiller testkjøp (TEST-) fra ekte kjøp (LM-)');

  // Prismatten må speile serveren (api/create-checkout LIVEMIX_RATE_ORE).
  const serverSrc = fs.readFileSync(path.join(ROOT, 'api', 'create-checkout.js'), 'utf8');
  assert.ok(/LIVEMIX_RATE_ORE\s*=\s*15000/.test(serverSrc), 'serveren bruker 15000 øre');
  assert.strictEqual(LiveMix.RATE_ORE, 15000, 'klienten bruker 15000 øre');
  ok('pris speiler serveren (klient RATE_ORE === server LIVEMIX_RATE_ORE === 15000)');
}

(async () => {
  try {
    installStripeMock();
    await testCheckout();
    await testVerify();
    testLiveMixModule();
    console.log(`\n\x1b[32mAlle ${passed} sjekkene passerte ✅\x1b[0m  — Live Mix-kjøpet er trygt.\n`);
    process.exit(0);
  } catch (e) {
    console.error(`\n\x1b[31m✗ TEST FEILET:\x1b[0m ${e.message}\n`);
    console.error(e.stack);
    process.exit(1);
  }
})();
