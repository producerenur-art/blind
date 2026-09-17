// Serverless: send «Live now»-påminninga — DAGLIG cron no (migrasjon 0027),
// ikkje berre fredagar lenger:
//   • Kontoar (public.accounts) får framleis berre påminninga på FREDAGAR —
//     uendra oppførsel, dei har ingen dagveljar.
//   • Gjeste-abonnentar (public.newsletter_subscribers) får ho på SIN EIGEN
//     valde vekedag (digest_day-kolonnen, sett via "Updates"-widgeten i
//     #dock/js/newsletter.js) — spreidd over veka i staden for at alle får
//     same fredag.
// Innhaldet — kva som spelar no, nye festivalar og nye intervju — blir bygd av
// api/send-email.js (type: 'live_now'), som les magasin-cachen server-side.
// `day` blir sendt med i kroppen slik at showsForDay() der viser HEILE den
// dagens program i staden for berre dei neste 4 på tvers av veka.
//
// SAMME køyring sjekkar òg om det har dukka opp NYE festivalar i FESTIVALS
// (js/world.js) sidan sist (festival_notify_state, migrasjon 0027), og sender
// i så fall ein eigen kort «festival_added»-e-post til ALLE abonnentar (både
// kontoar og gjestar, uavhengig av digest_day — dette er ikkje ein del av den
// ukentlige rytmen).
//
// Køyring:
//   • Cron (sjå crons i vercel.json) — Vercel sender då x-vercel-cron-headeren.
//   • Manuelt: POST /api/live-reminder med header  x-cron-secret: <CRON_SECRET>
//   • Tørrkøyring (sender ingenting, berre tel):  ?dry=1
//
// Sikring: utan CRON_SECRET satt, og utan at kallet kjem frå Vercel-cron, blir
// kallet avvist. Elles kunne kven som helst utløyse ei masseutsending.
const { createClient } = require('@supabase/supabase-js');
const { osloClock } = require('./send-email.js');
const { FESTIVALS } = require('../js/world.js');

// Resend sin gratis-/startplan toler ikkje ubegrensa fart. Vi sender i små
// puljer med pause mellom, så vi ikkje blir rate-limita midt i utsendinga.
const BATCH_SIZE  = 8;
const BATCH_PAUSE = 1100;   // ms mellom puljer

const sleep = ms => new Promise(r => setTimeout(r, ms));

function authorised(req) {
  // Vercel-cron kallar med denne headeren og kan ikkje forfalskast utanfrå.
  if (req.headers['x-vercel-cron']) return true;
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  // Når CRON_SECRET er sett, legg Vercel automatisk på denne som Bearer-token
  // på sine eigne cron-kall (Vercel sin offisielle mekanisme). Lagt til 15.09
  // etter at fredagens cron (ekte vercel-cron/1.0 user-agent) likevel fekk 401
  // på x-vercel-cron-headeren åleine — Bearer-sjekket er den robuste vegen.
  if (req.headers['authorization'] === `Bearer ${secret}`) return true;
  const given = req.headers['x-cron-secret'] || (req.query && req.query.secret);
  return given === secret;
}

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!authorised(req)) return res.status(401).json({ error: 'Unauthorized' });

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return res.status(503).json({ error: 'Account storage is not configured on the server' });
  if (!process.env.RESEND_API_KEY) return res.status(503).json({ error: 'Email is not configured on the server' });

  const siteUrl = (process.env.SITE_URL || 'https://www.siriusfm.no').replace(/\/$/, '');
  const dry = !!(req.query && req.query.dry);

  try {
    const db = createClient(url, key, { auth: { persistSession: false } });
    const today = osloClock(new Date()).day;   // 0=søndag..6=laurdag, norsk tid

    // Berre aktiverte kontoar (dvs. dei som faktisk har bekrefta e-posten og kan
    // logge inn). Avmelde blir filtrert her OG ein gong til i send-email.js.
    //
    // VIKTIG: PostgREST kappar svaret ved max-rows (1000 på Vercel/Supabase sitt
    // standardoppsett). Utan paginering ville konto nr. 1001 og oppover ALDRI fått
    // påminninga, heilt stille. Difor les vi i sider til vi har alle.
    //
    // .order('username') er ikkje pynt: utan ei fast sortering er rekkjefølgja
    // mellom sidene udefinert, og ein konto kan bli hoppa over (eller telt to
    // gonger) mellom to kall.
    const PAGE = 500;
    const rows = [];
    let error = null;
    let withOptOut = true;

    const page = (cols, from) => db.from('accounts')
      .select(cols).eq('activated', true)
      .order('username', { ascending: true })
      .range(from, from + PAGE - 1);

    for (let from = 0; ; from += PAGE) {
      let { data, error: err } = await page(
        withOptOut ? 'username, display_name, email, activated, marketing_opt_out'
                   : 'username, display_name, email, activated', from);

      // Eldre databasar manglar marketing_opt_out — prøv same sida utan kolonnen.
      if (err && withOptOut) {
        withOptOut = false;
        ({ data, error: err } = await page('username, display_name, email, activated', from));
      }
      if (err) { error = err; break; }
      rows.push(...(data || []));
      if (!data || data.length < PAGE) break;
    }
    if (error) return res.status(500).json({ error: error.message });

    // Dedupliser på e-post: same adresse skal aldri få to påminningar, uansett
    // om databasen skulle innehalde to kontoar med same adresse.
    const seen = new Set();
    const accountRecipients = rows
      .filter(r => r.email && !r.marketing_opt_out)
      .map(r => ({ email: String(r.email).trim(), name: r.display_name || r.username || 'there' }))
      .filter(r => {
        const k = r.email.toLowerCase();
        if (!k || seen.has(k)) return false;
        seen.add(k);
        return true;
      });

    // Gjeste-abonnentar (inga konto) — meldt på via "Updates"-widgeten i #dock,
    // sjå supabase/migrations/0021_newsletter_subscribers.sql. digest_day
    // (migrasjon 0027) er kva vekedag DENNE abonnenten valde å få nyhetsbrevet
    // på — manglar kolonnen enno (eldre database), fell alle tilbake til 5
    // (fredag), altså akkurat den gamle oppførselen. Same de-duplisering (mot
    // `seen`, som alt inneheld konto-e-postane) som over, slik at nokon som er
    // BÅDE konto-innehavar OG gjeste-abonnent aldri får to e-postar. Feiler
    // stille (tabellen finst kanskje ikkje enno) — kontoane skal framleis få
    // påminninga sjølv om denne biten ikkje er provisjonert.
    const subscriberRows = [];
    let withDigestDay = true;
    for (let from = 0; ; from += PAGE) {
      let { data, error: subErr } = await db.from('newsletter_subscribers')
        .select(withDigestDay ? 'email, digest_day' : 'email')
        .is('unsubscribed_at', null)
        .order('email', { ascending: true })
        .range(from, from + PAGE - 1);
      if (subErr && withDigestDay) {
        withDigestDay = false;
        ({ data, error: subErr } = await db.from('newsletter_subscribers')
          .select('email')
          .is('unsubscribed_at', null)
          .order('email', { ascending: true })
          .range(from, from + PAGE - 1));
      }
      if (subErr) break;   // tabell manglar e.l. → berre hopp over gjeste-lista
      subscriberRows.push(...(data || []));
      if (!data || data.length < PAGE) break;
    }
    const allSubscribers = subscriberRows.map(row => {
      const email = String(row.email || '').toLowerCase().trim();
      const digestDay = Number.isInteger(row.digest_day) ? row.digest_day : 5;
      return { email, name: 'there', digestDay };
    }).filter(r => r.email);

    // Den ukentlige e-posten: kontoar berre på fredagar (uendra), gjestar berre
    // på SIN valde dag.
    const digestRecipients = today === 5 ? [...accountRecipients] : [];
    for (const r of allSubscribers) {
      if (r.digestDay !== today || seen.has(r.email)) continue;
      seen.add(r.email);
      digestRecipients.push({ email: r.email, name: r.name });
    }

    // ── Nye festivalar sidan sist? (uavhengig av digest_day — går til ALLE) ──
    let freshFestivals = [];
    {
      const { data: stateRow } = await db.from('festival_notify_state').select('notified_names').eq('id', 1).maybeSingle();
      if (stateRow) {
        const known = new Set(stateRow.notified_names || []);
        const currentNames = FESTIVALS.filter(f => f.name).map(f => f.name);
        if (known.size === 0) {
          // Fyrste køyring etter at denne funksjonen vart lagt til (migrasjon
          // 0027) — set berre grunnlinja, ikkje send "ny festival"-e-post for
          // KVAR festival som alt fanst frå før.
          if (!dry) {
            await db.from('festival_notify_state')
              .update({ notified_names: currentNames, updated_at: new Date().toISOString() })
              .eq('id', 1);
          }
        } else {
          freshFestivals = FESTIVALS.filter(f => f.name && !known.has(f.name));
          if (freshFestivals.length && !dry) {
            await db.from('festival_notify_state')
              .update({ notified_names: [...known, ...freshFestivals.map(f => f.name)], updated_at: new Date().toISOString() })
              .eq('id', 1);
          }
        }
      }
    }
    // Same flate form som EVENT_CALENDAR i api/send-email.js — festivalAddedHtml
    // der ventar f.url, ikkje FESTIVALS sin links[]-struktur.
    const freshFestivalsForEmail = freshFestivals.map(f => ({
      emoji: f.emoji, name: f.name, loc: f.loc, dates: f.dates,
      url: (f.links && f.links[0] && f.links[0].url) || '',
    }));

    let festivalRecipients = [];
    if (freshFestivals.length) {
      const festSeen = new Set();
      for (const r of [...accountRecipients, ...allSubscribers]) {
        if (festSeen.has(r.email)) continue;
        festSeen.add(r.email);
        festivalRecipients.push({ email: r.email, name: r.name });
      }
    }

    if (dry) {
      return res.status(200).json({
        ok: true, dryRun: true, today, wouldSendDigest: digestRecipients.length,
        freshFestivals: freshFestivals.map(f => f.name), wouldSendFestivalNotice: festivalRecipients.length,
      });
    }

    let sent = 0, skipped = 0, failed = 0;
    for (let i = 0; i < digestRecipients.length; i += BATCH_SIZE) {
      const batch = digestRecipients.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(batch.map(async r => {
        try {
          const resp = await fetch(`${siteUrl}/api/send-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'live_now', toEmail: r.email, toName: r.name, day: today }),
          });
          const body = await resp.json().catch(() => ({}));
          if (!resp.ok) return 'failed';
          return body.skipped ? 'skipped' : 'sent';
        } catch {
          return 'failed';
        }
      }));
      for (const x of results) {
        if (x === 'sent') sent++; else if (x === 'skipped') skipped++; else failed++;
      }
      if (i + BATCH_SIZE < digestRecipients.length) await sleep(BATCH_PAUSE);
    }

    let festivalsSent = 0, festivalsSkipped = 0, festivalsFailed = 0;
    for (let i = 0; i < festivalRecipients.length; i += BATCH_SIZE) {
      const batch = festivalRecipients.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(batch.map(async r => {
        try {
          const resp = await fetch(`${siteUrl}/api/send-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'festival_added', toEmail: r.email, toName: r.name, festivals: freshFestivalsForEmail }),
          });
          const body = await resp.json().catch(() => ({}));
          if (!resp.ok) return 'failed';
          return body.skipped ? 'skipped' : 'sent';
        } catch {
          return 'failed';
        }
      }));
      for (const x of results) {
        if (x === 'sent') festivalsSent++; else if (x === 'skipped') festivalsSkipped++; else festivalsFailed++;
      }
      if (i + BATCH_SIZE < festivalRecipients.length) await sleep(BATCH_PAUSE);
    }

    return res.status(200).json({
      ok: true, today,
      digest: { total: digestRecipients.length, sent, skipped, failed },
      festival: { freshFestivals: freshFestivals.map(f => f.name), total: festivalRecipients.length, sent: festivalsSent, skipped: festivalsSkipped, failed: festivalsFailed },
    });
  } catch (e) {
    console.error('live-reminder error:', e && e.message ? e.message : e);
    return res.status(500).json({ error: 'Could not send the reminders' });
  }
};
