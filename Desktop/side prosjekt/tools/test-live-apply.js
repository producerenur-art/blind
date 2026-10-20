#!/usr/bin/env node
/** test-live-apply.js — kjøpar blir godkjende automatisk (Pro eller timar); andre blir pending. Alt mocka. */
'use strict';
process.env.SUPABASE_URL = 'http://x'; process.env.SUPABASE_SERVICE_ROLE_KEY = 'k'; process.env.MARKETPLACE_TOKEN_SECRET = 'testsecret';
const assert = require('assert'); const Module = require('module');
const db = { subs: ['pro_anna'], access: ['timar_bo'], rpc: [], upd: [] };
const orig = Module._load;
Module._load = function (r, ...a) {
  if (r === '@supabase/supabase-js') return { createClient: () => ({
    from: t => { const q = { t, f: {} }; const api = {
      select() { return api; }, eq(c, v) { q.f[c] = v; return api; }, limit: async () => ({ data: t === 'subscriptions' ? (db.subs.includes(q.f.username) ? [{ stripe_subscription_id: 's' }] : []) : (t === 'live_access' ? (db.access.includes(q.f.username) ? [{ id: 1 }] : []) : []) }),
      maybeSingle: async () => ({ data: { email: q.f.username + '@example.com', display_name: q.f.username } }),
      update(v) { q.v = v; return { eq(c, val) { q.f[c] = val; return { eq: async (c2, v2) => { db.upd.push({ ...q.f, [c2]: v2, ...q.v }); return {}; } }; } }; } }; return api; },
    rpc: async (n, args) => { db.rpc.push({ n, args }); return {}; } }) };
  return orig.call(this, r, ...a);
};
const h = require('../api/live-apply.js'); const { sign } = require('../api/_hmac.js');
const post = async body => { let o = {}; const res = { setHeader() {}, status(c) { o.c = c; return this; }, json(j) { o.j = j; return this; }, end() { return this; } }; await h({ method: 'POST', body }, res); return o; };
const ok = m => console.log('  \x1b[32m✓\x1b[0m ' + m);
(async () => {
  console.log('\nLive-søknad: auto-godkjenning etter kjøp');
  const tok = u => sign({ purpose: 'session', username: u }, 60); const slot = new Date(Date.now() + 86400000).toISOString();
  assert.strictEqual((await post({ requestedStart: slot })).c, 401); ok('utan innlogging: avvist (401)');
  let r = await post({ sessionToken: tok('pro_anna'), requestedStart: slot });
  assert.strictEqual(r.c, 200); assert.strictEqual(r.j.autoApproved, true); assert.ok(db.upd.some(u => u.id === r.j.id && u.status === 'approved' && /purchase/.test(u.reviewed_by))); ok('Pro-abonnent: godkjent automatisk');
  r = await post({ sessionToken: tok('timar_bo'), requestedStart: slot }); assert.strictEqual(r.j.autoApproved, true); ok('kjøpt ekstra timar: godkjent automatisk');
  db.upd.length = 0; r = await post({ sessionToken: tok('gratis_cy'), requestedStart: slot });
  assert.strictEqual(r.c, 200); assert.strictEqual(r.j.autoApproved, false); assert.strictEqual(db.upd.length, 0); ok('utan kjøp: blir pending (ikkje godkjent)');
  r = await post({ sessionToken: tok('pro_anna') }); assert.strictEqual(r.c, 400); assert.strictEqual(r.j.error, 'schedule_required'); ok('kjøpar utan tidspunkt: må velje tidspunkt');
  r = await post({ sessionToken: tok('gratis_cy'), requestedStart: slot, username: 'pro_anna' });
  assert.strictEqual(db.rpc[db.rpc.length - 1].args.p_username, 'gratis_cy'); ok('brukarnamn kjem frå tokenet — klienten kan ikkje låne andre sitt namn');
  console.log('\n\x1b[32m✓ Alle sjekkene passerte.\x1b[0m\n');
})().catch(e => { console.error('\x1b[31m✗ TEST FEILET:\x1b[0m', e.message); process.exit(1); });
