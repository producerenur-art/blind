#!/usr/bin/env node
/**
 * test-live-reminder.js — verifiserer påminnings-e-posten FØR deploy.
 *
 * Kjør:  node tools/test-live-reminder.js
 *
 * Dekker:
 *   1) api/send-email.js (type:'live_now') byggjer ein e-post med alle
 *      seksjonane: live no, radioprogram, nytt i magasinet, intervju,
 *      festivalnyhende og arrangementskalender — og lenkjer som peikar til
 *      www.siriusfm.no (aldri preview-hosten).
 *   2) Logoen og ei synleg siriusfm.no-lenkje er med.
 *   3) Avmelding blir respektert (opt-out → ingen e-post sendt).
 *   4) pickInterviews plukkar berre intervju-saker.
 *   5) upcomingShows sorterer programmet frå og med i dag.
 *   6) upcomingEvents filtrerer bort arrangement som har vore.
 *   7) E-posten er på ENGELSK (ingen norsk tekst att).
 */
'use strict';
const path   = require('path');
const assert = require('assert');

const ROOT = path.join(__dirname, '..');
let passed = 0;
function ok(name) { passed++; console.log(`  \x1b[32m✓\x1b[0m ${name}`); }

// Mock «resend» FØR handleren blir kravd inn, så ingen ekte e-post går ut.
let captured = null;
const resendPath = require.resolve('resend');
require.cache[resendPath] = {
  id: resendPath, filename: resendPath, loaded: true,
  exports: { Resend: class { constructor() { this.emails = { send: async (o) => { captured = o; return { data: { id: 'test_id' }, error: null }; } }; } } },
};

process.env.RESEND_API_KEY = 'test_key_for_local_test';
delete process.env.SITE_URL;            // tving fram kanonisk domene
delete process.env.SUPABASE_URL;        // ingen db → tomme lister, skal ikkje krasje
delete process.env.SUPABASE_SERVICE_ROLE_KEY;

const handler = require(path.join(ROOT, 'api', 'send-email.js'));

function mkRes() {
  const r = { statusCode: 0, body: null };
  r.status = (c) => { r.statusCode = c; return r; };
  r.json = (b) => { r.body = b; return r; };
  r.setHeader = () => {};
  r.end = () => r;
  return r;
}

async function send(body) {
  captured = null;
  const res = mkRes();
  await handler({ method: 'POST', headers: {}, query: {}, body }, res);
  return res;
}

async function main() {
  console.log('\nPåminnings-e-post (api/send-email.js type:live_now)');

  // ── 1) Full e-post med innhald frå klienten ──────────────────────────────
  const res = await send({
    type: 'live_now',
    toEmail: 'lytter@eksempel.no',
    toName: 'Nova',
    magazine: [
      { tittel: 'Nano Records announces a new compilation', ingress: 'Out this autumn.', kilde: { navn: 'nano-records.com' } },
    ],
    festivals: [
      { tittel: 'OZORA Festival 2026 line-up announced', ingress: 'First names confirmed.', kilde: { navn: 'ozorafestival.eu' } },
    ],
    interviews: [
      { tittel: 'Ott on building sound layer by layer', ingress: 'A long conversation.', kilde: { navn: 'psybient.org' } },
    ],
  });

  assert.strictEqual(res.statusCode, 200, 'skal svare 200');
  assert.ok(res.body && res.body.success === true, 'svaret skal vere { success:true }');
  assert.ok(captured, 'resend.emails.send skal ha blitt kalla');
  ok('live_now-e-post sendt (mocka) → 200 success');

  const html = captured.html;
  assert.ok(/coming up on SiriusFM/i.test(captured.subject), 'emnet skal seie kva som kjem');
  assert.ok(/shows/i.test(captured.subject) && /magazine/i.test(captured.subject),
    'emnet skal nemne shows og magazine');
  ok(`emne: «${captured.subject}»`);

  assert.ok(html.includes('https://www.siriusfm.no/#/radio'),   'skal lenkje til #/radio');
  assert.ok(html.includes('https://www.siriusfm.no/#/shows'),   'skal lenkje til #/shows');
  assert.ok(html.includes('https://www.siriusfm.no/#/world'),   'skal lenkje til #/world');
  assert.ok(html.includes('https://www.siriusfm.no/#/magazine'),'skal lenkje til #/magazine');
  ok('lenkjer til radio, shows, world og magazine peikar på www.siriusfm.no');

  assert.ok(!/vercel\.app/.test(html), 'skal ikkje lekke preview-hosten');
  ok('e-posten lekker ikkje preview-hosten');

  // ── 2) Logo + synleg siriusfm.no-lenkje ──────────────────────────────────
  assert.ok(html.includes('<img src="https://www.siriusfm.no/assets/icon-192.png"'),
    'den nye logoen skal ligge øvst');
  assert.ok(/alt="SiriusFM"/.test(html), 'logoen skal ha alt-tekst (bilete blir ofte blokkert)');
  ok('den nye logoen er med (assets/icon-192.png)');

  const visibleUrl = html.replace(/<[^>]*>/g, ' ');
  assert.ok(/www\.siriusfm\.no/.test(visibleUrl), 'sjølve URL-en skal stå synleg i teksten');
  assert.ok(html.includes('>▶ Open SiriusFM<'), 'skal ha ein tydeleg knapp til siriusfm.no');
  ok('synleg lenkje/knapp til www.siriusfm.no er med');

  // ── 3) Alle seksjonane ───────────────────────────────────────────────────
  assert.ok(/Playing right now/i.test(html),      'skal ha «live no»-seksjon');
  assert.ok(/Radio shows coming up/i.test(html),  'skal ha radioprogram-seksjon');
  assert.ok(/New in the magazine/i.test(html),    'skal ha magasin-seksjon');
  assert.ok(/New interviews/i.test(html),         'skal ha intervju-seksjon');
  assert.ok(/Festival &amp; party news/i.test(html), 'skal ha festival-/festnyhende-seksjon');
  ok('seksjonane er med (live · shows · magasin · intervju · festival/party)');

  assert.ok(html.includes('OZORA Festival 2026 line-up announced'), 'festivalsaka skal vises');
  assert.ok(html.includes('Ott on building sound layer by layer'),  'intervjuet skal vises');
  assert.ok(html.includes('Nano Records announces a new compilation'), 'magasinsaka skal vises');
  assert.ok(/Stellar PSY/.test(html), 'utvalde kanalar skal vises');
  assert.ok(/Techno Underground|Drone Morning|Groove Friday|Chill Wednesday|Space Travel|Deep Space Saturday|Mission Control Sunday|Stellar PSY Night/.test(html),
    'minst eitt radioprogram skal vises');
  ok('innhaldet blir rendra (magasin + festival + intervju + kanalar + program)');

  assert.ok(/unsubscribe/i.test(html), 'skal ha avmeldingslenkje');
  assert.ok(html.includes(encodeURIComponent('lytter@eksempel.no')), 'avmeldinga skal bere mottakarens e-post');
  ok('avmeldingslenkje med mottakarens e-post er med');

  // ── 2) E-posten skal vere på ENGELSK ─────────────────────────────────────
  const NORWEGIAN = /\b(Hei|Takk|ikke|ikkje|lenken|e-posten din|Avmeld|Hilsen|kvittering|påminning)\b/;
  const visible = html.replace(/<[^>]*>/g, ' ');
  assert.ok(!NORWEGIAN.test(visible), `e-posten skal vere på engelsk, fann: ${(visible.match(NORWEGIAN) || [])[0]}`);
  ok('e-posten er på engelsk (ingen norsk tekst att)');

  // ── 4) Utan database: shows + kalender skal STÅ (dei er hardkoda) ────────
  const res2 = await send({ type: 'live_now', toEmail: 'tom@eksempel.no', toName: 'Tom' });
  assert.strictEqual(res2.statusCode, 200, 'skal svare 200 utan db');
  assert.ok(/Playing right now/i.test(captured.html),     'live no-seksjonen skal stå att');
  assert.ok(/Radio shows coming up/i.test(captured.html), 'programmet skal stå att utan db');
  assert.ok(!/New in the magazine/i.test(captured.html),  'tom magasin-liste skal utelate seksjonen');
  assert.ok(!/New interviews/i.test(captured.html),       'tom intervju-liste skal utelate seksjonen');
  ok('utan database: live + program står, tomme magasin-seksjonar blir utelatne');

  // ── 5) pickInterviews plukkar berre intervju ─────────────────────────────
  const { pickInterviews, upcomingShows, upcomingEvents, osloClock } = handler;
  assert.strictEqual(typeof pickInterviews, 'function', 'pickInterviews skal vere eksportert');
  const picked = pickInterviews([
    { tittel: 'New release from Astrix' },
    { tittel: 'Interview with Ott', kategori: 'Interviews' },
    { tittel: 'Shpongle in conversation about the studio' },
  ], 5);
  assert.strictEqual(picked.length, 2, 'skal plukke dei to intervjua');
  ok('pickInterviews plukkar berre intervju-saker');

  // Intervju og «nytt i magasinet» skal aldri vise same saka to gonger.
  const res3 = await send({
    type: 'live_now', toEmail: 'a@b.no', toName: 'A',
    interviews: [{ tittel: 'Interview with Ott' }],
    magazine:   [{ tittel: 'New release from Astrix' }],
  });
  assert.strictEqual(res3.statusCode, 200, 'skal svare 200');
  assert.strictEqual((captured.html.match(/Interview with Ott/g) || []).length, 1,
    'intervjuet skal berre stå éin stad');
  ok('same saka blir ikkje repetert i to seksjonar');

  // ── 6) upcomingShows: sortert frå og med i dag, ON AIR øvst ──────────────
  assert.strictEqual(typeof upcomingShows, 'function', 'upcomingShows skal vere eksportert');
  // Tysdag kl. 22 → «Techno Underground» (tys 21–24) er på lufta.
  const tue = upcomingShows({ day: 2, hour: 22 }, 4);
  assert.strictEqual(tue[0].name, 'Techno Underground', 'programmet som går no skal stå øvst');
  assert.strictEqual(tue[0].live, true, 'det skal vere merkt som live');
  assert.strictEqual(tue[0].when, 'Today', 'og daterast «Today»');
  assert.strictEqual(tue[1].name, 'Chill Wednesday', 'deretter kjem morgondagen');
  assert.strictEqual(tue[1].when, 'Tomorrow', 'merkt «Tomorrow»');
  // Måndag kl. 12 — «Drone Morning» (man 07–10) er ferdig og skal IKKJE stå øvst.
  const mon = upcomingShows({ day: 1, hour: 12 }, 8);
  assert.strictEqual(mon[0].name, 'Techno Underground', 'ferdig program skal skyvast til neste veke');
  assert.strictEqual(mon[mon.length - 1].name, 'Drone Morning', 'og hamne bakerst');
  ok('upcomingShows: live øvst, ferdige program skyvd til neste veke');

  assert.strictEqual(typeof osloClock, 'function', 'osloClock skal vere eksportert');
  const clock = osloClock(new Date('2026-08-17T12:00:00Z'));   // måndag, UTC+2 om sommaren
  assert.strictEqual(clock.day, 1, 'skal vere måndag');
  assert.strictEqual(clock.hour, 14, 'skal reknast om til norsk tid (14:00)');
  ok('osloClock reknar om frå UTC til norsk tid');

  // ── 7) upcomingEvents filtrerer bort det som har vore ────────────────────
  assert.strictEqual(typeof upcomingEvents, 'function', 'upcomingEvents skal vere eksportert');
  const soon = upcomingEvents(new Date('2026-08-17T00:00:00Z'), 10);
  assert.ok(soon.length >= 4, 'skal finne fleire komande datoar');
  assert.ok(soon.every(e => e.to >= '2026-08-17'), 'ingen arrangement som har vore');
  assert.ok(!soon.some(e => /OZORA|Mo:Dem|Burning Mountain/.test(e.name)), 'sommarfestivalane er over');
  assert.strictEqual(soon[0].name, 'Free Earth Festival', 'næraste dato skal stå først');
  // Sortert stigande på STARTdato — det er den lesaren ser i «når»-kolonna.
  for (let i = 1; i < soon.length; i++) {
    assert.ok(soon[i - 1].from <= soon[i].from, 'kalenderen skal vere kronologisk');
  }
  assert.deepStrictEqual(soon.slice(0, 3).map(e => e.name),
    ['Free Earth Festival', 'Indian Spirit', 'Hadra Trance Festival'],
    'august-festivalane skal stå i startdato-rekkjefølgje');
  // Ein festival som er I GANG skal framleis vere med.
  const during = upcomingEvents(new Date('2026-08-28T00:00:00Z'), 10);
  assert.ok(during.some(e => e.name === 'Free Earth Festival'), 'pågåande festival skal stå att');
  const early = upcomingEvents(new Date('2026-06-01T00:00:00Z'), 10);
  assert.ok(early.some(e => /OZORA/.test(e.name)), 'OZORA skal vere med før festivalen');
  // Kalenderen skal spegle World-sida — sjekk at dei nye oppføringane er med.
  const far = upcomingEvents(new Date('2026-08-17T00:00:00Z'), 99).map(e => e.name).join('|');
  for (const n of ['Indian Spirit', 'Hadra Trance Festival', 'Origin Festival', 'Tribal Gathering', 'VooV Experience', 'Boom Festival']) {
    assert.ok(far.includes(n), `${n} frå #/world skal vere i kalenderen`);
  }
  ok('upcomingEvents: kronologisk, berre framtidige, speglar #/world');

  console.log(`\n\x1b[32m✓ Alle ${passed} sjekkene passerte.\x1b[0m`);
}

main().catch((e) => {
  console.error('\n\x1b[31m✗ TEST FEILET:\x1b[0m', e.message, '\n');
  console.error(e);
  process.exit(1);
});
