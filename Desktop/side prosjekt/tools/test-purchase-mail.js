#!/usr/bin/env node
/**
 * test-purchase-mail.js — e-post etter kjøp: webhook (timar + sang), Pro hoppar over, mix-uploaded (DJ-namn + songliste).
 * Alt er mocka (Stripe, Supabase, Resend) — ingen ekte betaling, ingen ekte e-post.
 */
'use strict';
process.env.RESEND_API_KEY = 'x'; process.env.STRIPE_WEBHOOK_SECRET = 'w'; process.env.STRIPE_SECRET_KEY = 'sk_test_x';
process.env.SUPABASE_URL = 'http://x'; process.env.SUPABASE_SERVICE_ROLE_KEY = 'k'; process.env.MARKETPLACE_TOKEN_SECRET = 'testsecret';
const assert = require('assert'); const Module = require('module');
const sent = []; let failSend = false; let currentEvent = null;
const accounts = { anna: { email: 'anna@example.com', display_name: 'DJ Anna' } };
const products = { p1: { title: 'Deep Song', artist: 'Anna' } };
const orig = Module._load;
Module._load = function (r, ...a) {
  if (r === 'stripe') return () => ({ webhooks: { constructEvent: () => currentEvent } });
  if (r === 'resend') return { Resend: class { constructor() { this.emails = { send: async (p, o) => { if (failSend) return { error: { message: 'boom' } }; sent.push({ ...p, opts: o }); return { data: { id: 'id1' } }; } }; } } };
  if (r === '@supabase/supabase-js') return { createClient: () => ({ from: t => ({
    select: () => ({ eq: (c, v) => ({ maybeSingle: async () => ({ data: t === 'accounts' ? accounts[v] : (t === 'products' ? products[v] : null) }) }) }),
    update: () => ({ eq: async () => ({}) }) }) }) };
  return orig.call(this, r, ...a);
};
const hook = require('../api/stripe-webhook.js'); const mixUp = require('../api/mix-uploaded.js'); const { sign } = require('../api/_hmac.js');
const ev = (session) => ({ type: 'checkout.session.completed', data: { object: { payment_status: 'paid', id: 'cs_live_ABCDEFGHIJ123', amount_total: 18000, ...session } } });
const post = async (h, body, raw) => { let out = {}; const res = { setHeader() {}, status(c) { out.c = c; return this; }, json(j) { out.j = j; return this; }, end() { return this; }, send(t) { out.t = t; return this; } };
  const req = { method: 'POST', body, headers: { 'stripe-signature': 's' }, on(e, f) { if (e === 'data') f(Buffer.from('{}')); if (e === 'end') f(); } }; await h(req, res); return out; };
const ok = m => console.log('  \x1b[32m✓\x1b[0m ' + m);
(async () => {
  console.log('\nE-post etter kjøp');
  // 1) Ekstra opplastingstimer
  currentEvent = ev({ metadata: { username: 'anna', product: 'upload-hours', hours: '3' } });
  let r = await post(hook); assert.strictEqual(r.c, 200);
  assert.strictEqual(sent.length, 1, 'éin mail for timar-kjøp'); let m = sent[0];
  assert.strictEqual(m.to, 'anna@example.com', 'går til kontoen sin e-post');
  assert.ok(/3 extra upload hours/.test(m.subject), 'emne: ' + m.subject);
  assert.ok(m.html.includes('DJ Anna'), 'DJ-namnet står i mailen');
  assert.ok(m.html.includes('6 hours'), 'viser ny makslengd (3 + 3 timar)');
  assert.ok(/tracklist/i.test(m.html) && /one song per line/i.test(m.html) && /Optional/.test(m.html), 'songnamn er valfritt og forklart');
  assert.ok(/Upload DJ Mix/.test(m.html) && /My page/.test(m.html), 'steg for kva ein gjer etter kjøpet');
  assert.ok(!/undefined|NaN|\[object/.test(m.html), 'ingen «undefined» i mailen');
  assert.ok(/180 kr/.test(m.html), 'beløp: 180 kr');
  assert.strictEqual(m.opts.idempotencyKey, 'purchase-cs_live_ABCDEFGHIJ123', 'idempotens-nøkkel mot dobbeltsending');
  assert.ok(m.html.includes('/live-setup-guide.html') && /Want to play live/.test(m.html), 'oppskrift for live (Mac/PC/DJ-utstyr) er lenka');
  ok('timar-kjøp: mail til kjøpar med DJ-namn, kreditt, steg og valfri songliste + live-oppskrift');
  // 2) Sang i marknadsplassen
  sent.length = 0; currentEvent = ev({ metadata: { buyerUsername: 'anna', productId: 'p1', purchaseId: '9' } });
  r = await post(hook); assert.strictEqual(r.c, 200); assert.strictEqual(sent.length, 1);
  assert.ok(sent[0].html.includes('Deep Song') && /My purchases/.test(sent[0].html) && /Download/.test(sent[0].html), 'sang + kvar ein lastar ned');
  ok('sang-kjøp: mail med tittel og nedlastingssteg');
  // 3) Pro-abonnement får IKKJE ei ekstra mail herfrå (har eigen kvittering)
  sent.length = 0; currentEvent = ev({ mode: 'subscription', metadata: { username: 'anna', plan: 'monthly' } });
  r = await post(hook); assert.strictEqual(r.c, 200); assert.strictEqual(sent.length, 0);
  ok('Pro-abonnement: ingen dobbel kvittering frå webhooken');
  // 4) Ubetalt sesjon → ingen mail
  currentEvent = ev({ payment_status: 'unpaid', metadata: { username: 'anna', product: 'upload-hours', hours: '1' } });
  r = await post(hook); assert.strictEqual(sent.length, 0); ok('ubetalt sesjon: ingen mail');
  // 5) Resend feilar → webhooken svarer likevel 200 (Stripe skal ikkje prøve på nytt i evigheit)
  failSend = true; currentEvent = ev({ metadata: { username: 'anna', product: 'upload-hours', hours: '1' } });
  r = await post(hook); assert.strictEqual(r.c, 200); failSend = false; ok('e-postfeil gir ikkje 5xx frå webhooken');
  // 6) Ukjend konto: fall tilbake til e-posten Stripe samla inn
  sent.length = 0; currentEvent = ev({ customer_details: { email: 'guest@example.com' }, metadata: { username: 'ukjend', product: 'upload-hours', hours: '1' } });
  await post(hook); assert.strictEqual(sent[0].to, 'guest@example.com'); ok('fallback til Stripe-e-post når konto manglar');

  console.log('\nSett over 3 timar (api/mix-uploaded)');
  const tok = sign({ purpose: 'session', username: 'anna' }, 60);
  sent.length = 0;
  assert.strictEqual((await post(mixUp, { durationSec: 20000 })).c, 401); ok('utan innlogging: avvist (401)');
  assert.strictEqual((await post(mixUp, { sessionToken: tok, durationSec: 7200 })).j.skipped, 'under-free-limit'); assert.strictEqual(sent.length, 0); ok('sett under 3 t: ingen mail');
  r = await post(mixUp, { sessionToken: tok, durationSec: 4 * 3600 + 600, title: 'Dark Tunnel', tracklist: ['Song A - Artist', 'Song B'] });
  assert.strictEqual(r.j.success, true); m = sent[0];
  assert.ok(m.html.includes('DJ Anna') && m.html.includes('Dark Tunnel') && m.html.includes('4 h 10 min'), 'DJ-namn, tittel og lengd');
  assert.ok(m.html.includes('Song A - Artist') && m.html.includes('Song B'), 'songlista er med når ho er fylt ut');
  ok('sett over 3 t med songliste: mail med DJ-namn og sanger');
  sent.length = 0; await post(mixUp, { sessionToken: tok, durationSec: 5 * 3600, title: 'No list' });
  assert.ok(/optional/i.test(sent[0].html) && !/<ol[^>]*>\s*<li>Song/.test(sent[0].html)); ok('uten songliste: forklarer at det er valfritt');
  sent.length = 0; await post(mixUp, { sessionToken: tok, durationSec: 5 * 3600, title: '<script>x</script>' });
  assert.ok(!sent[0].html.includes('<script>x'), 'HTML blir escapa'); ok('tittel med HTML blir escapa');
  console.log('\n\x1b[32m✓ Alle sjekkene passerte.\x1b[0m\n');
})().catch(e => { console.error('\x1b[31m✗ TEST FEILET:\x1b[0m', e.message); process.exit(1); });
