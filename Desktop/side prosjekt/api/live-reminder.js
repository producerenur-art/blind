// Serverless: send «Live now»-påminninga til alle innlogga (aktiverte) kontoar.
// Innhaldet — kva som spelar no, nye festivalar og nye intervju — blir bygd av
// api/send-email.js (type: 'live_now'), som les magasin-cachen server-side.
//
// Køyring:
//   • Cron (sjå crons i vercel.json) — Vercel sender då x-vercel-cron-headeren.
//   • Manuelt: POST /api/live-reminder med header  x-cron-secret: <CRON_SECRET>
//   • Tørrkøyring (sender ingenting, berre tel):  ?dry=1
//
// Sikring: utan CRON_SECRET satt, og utan at kallet kjem frå Vercel-cron, blir
// kallet avvist. Elles kunne kven som helst utløyse ei masseutsending.
const { createClient } = require('@supabase/supabase-js');

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
    const recipients = rows
      .filter(r => r.email && !r.marketing_opt_out)
      .map(r => ({ email: String(r.email).trim(), name: r.display_name || r.username || 'there' }))
      .filter(r => {
        const k = r.email.toLowerCase();
        if (!k || seen.has(k)) return false;
        seen.add(k);
        return true;
      });

    // Gjeste-abonnentar (inga konto) — meldt på via "Updates"-widgeten i #dock,
    // sjå supabase/migrations/0021_newsletter_subscribers.sql. Same sideinnlesing
    // og de-duplisering (mot `seen`, som alt inneheld konto-e-postane) som over,
    // slik at nokon som er BÅDE konto-innehavar OG gjeste-abonnent aldri får to
    // e-postar. Feiler stille (tabellen finst kanskje ikkje enno) — kontoane skal
    // framleis få påminninga sjølv om denne biten ikkje er provisjonert.
    for (let from = 0; ; from += PAGE) {
      const { data, error: subErr } = await db.from('newsletter_subscribers')
        .select('email')
        .is('unsubscribed_at', null)
        .order('email', { ascending: true })
        .range(from, from + PAGE - 1);
      if (subErr) break;   // tabell manglar e.l. → berre hopp over gjeste-lista
      for (const row of (data || [])) {
        const k = String(row.email || '').toLowerCase().trim();
        if (!k || seen.has(k)) continue;
        seen.add(k);
        recipients.push({ email: k, name: 'there' });
      }
      if (!data || data.length < PAGE) break;
    }

    if (dry) return res.status(200).json({ ok: true, dryRun: true, wouldSend: recipients.length });

    let sent = 0, skipped = 0, failed = 0;
    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(batch.map(async r => {
        try {
          const resp = await fetch(`${siteUrl}/api/send-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'live_now', toEmail: r.email, toName: r.name }),
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
      if (i + BATCH_SIZE < recipients.length) await sleep(BATCH_PAUSE);
    }

    return res.status(200).json({ ok: true, total: recipients.length, sent, skipped, failed });
  } catch (e) {
    console.error('live-reminder error:', e && e.message ? e.message : e);
    return res.status(500).json({ error: 'Could not send the reminders' });
  }
};
