// Serverless: send den daglige "🌘 24-Hour Cycle"-e-posten til alle som har
// meldt seg på via radio247subscribe (public.radio247_subscribers, migrasjon
// 0023) — en EGEN liste, atskilt fra den ukentlige newsletter_subscribers-lista
// (api/live-reminder.js). Selve tidsplanen leses fra js/radio247.js (samme
// mønster som SHOWS/FESTIVALS — én kilde til sannhet, ikke en håndoppdatert kopi).
//
// Køyring:
//   • Cron (sjå crons i vercel.json) — Vercel sender då x-vercel-cron-headeren.
//   • Manuelt: POST /api/radio247-digest med header  x-cron-secret: <CRON_SECRET>
//   • Tørrkøyring (sender ingenting, berre tel):  ?dry=1
const { createClient } = require('@supabase/supabase-js');
const { SCHEDULE } = require('../js/radio247.js');

const BATCH_SIZE  = 8;
const BATCH_PAUSE = 1100;
const sleep = ms => new Promise(r => setTimeout(r, ms));

function authorised(req) {
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

    const PAGE = 500;
    const recipients = [];
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await db.from('radio247_subscribers')
        .select('email')
        .is('unsubscribed_at', null)
        .order('email', { ascending: true })
        .range(from, from + PAGE - 1);
      if (error) {
        // Tabellen finst kanskje ikkje enno (migrasjon 0023 ikkje kjørt) — ikkje
        // ein feil, berre ingen abonnentar å sende til.
        break;
      }
      for (const row of (data || [])) {
        const k = String(row.email || '').trim().toLowerCase();
        if (k) recipients.push(k);
      }
      if (!data || data.length < PAGE) break;
    }

    if (dry) return res.status(200).json({ ok: true, dryRun: true, wouldSend: recipients.length, blocks: SCHEDULE.length });

    let sent = 0, skipped = 0, failed = 0;
    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(batch.map(async email => {
        try {
          const resp = await fetch(`${siteUrl}/api/send-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'radio247_digest', toEmail: email, toName: 'there' }),
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
    console.error('radio247-digest error:', e && e.message ? e.message : e);
    return res.status(500).json({ error: 'Could not send the digest' });
  }
};
