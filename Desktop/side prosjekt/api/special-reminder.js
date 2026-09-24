// Serverless cron: send e-postvarsel om planlagte spesialprogram (js/specialShows.js,
// t.d. Lemonchill-miksen) til abonnentane på 24-Hour Cycle
// (public.radio247_subscribers). Brukarønske 2026-09-24:
//   • 3 varsel FØR den fyrste sendinga (sjå reminderOffsetsHours i specialShows.js)
//   • ALDRI etter at fyrste sending har starta — då er det stopp for e-postvarsla.
// Kvar påminning blir logga i public.special_reminder_log (migrasjon 0034) og sendt
// berre éin gong. Ein køyring sender maks ÉN påminning (den eldste ikkje-sendte som
// er forfalt), så ein missa cron aldri gir to e-postar på rad.
//
// Køyring: Vercel-cron (dagleg 09:00Z), eller manuelt med  x-cron-secret: <CRON_SECRET>.
// Tørrkøyring (sender ingenting): ?dry=1
const { createClient } = require('@supabase/supabase-js');
const SpecialShows = require('../js/specialShows.js');

const BATCH_SIZE = 8, BATCH_PAUSE = 1100;
const sleep = ms => new Promise(r => setTimeout(r, ms));

function authorised(req) {
  if (req.headers['x-vercel-cron']) return true;
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  if (req.headers['authorization'] === `Bearer ${secret}`) return true;
  return (req.headers['x-cron-secret'] || (req.query && req.query.secret)) === secret;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST' && req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  if (!authorised(req)) return res.status(401).json({ error: 'Unauthorized' });

  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return res.status(503).json({ error: 'Storage is not configured on the server' });
  if (!process.env.RESEND_API_KEY) return res.status(503).json({ error: 'Email is not configured on the server' });

  const siteUrl = (process.env.SITE_URL || 'https://www.siriusfm.no').replace(/\/$/, '');
  const dry = !!(req.query && req.query.dry);
  const now = (req.query && req.query.now) ? Date.parse(req.query.now) : Date.now();   // ?now= kun for test (dry)

  try {
    const db = createClient(url, key, { auth: { persistSession: false } });
    // Finn éi påminning som er forfalt, ikkje sendt, og der fyrste sending ikkje har starta.
    let due = null;
    for (const show of SpecialShows.SHOWS) {
      const first = Date.parse(show.slots[0]);
      if (now >= first) continue;                                   // STOPP: fyrste sending har starta/er over
      const { data: logged, error: logErr } = await db.from('special_reminder_log').select('kind').eq('show_id', show.id);
      if (logErr) return res.status(503).json({ error: 'special_reminder_log missing — run migration 0034', detail: logErr.message });
      const done = new Set((logged || []).map(r => r.kind));
      for (let k = 0; k < show.reminderOffsetsHours.length; k++) {
        const dueAt = first - show.reminderOffsetsHours[k] * 3600 * 1000;
        if (now >= dueAt && !done.has(k)) { due = { show, kind: k, first }; break; }
      }
      if (due) break;
    }
    if (!due) return res.status(200).json({ ok: true, sent: 0, reason: 'nothing due (or first broadcast already started)' });

    const recipients = [];
    for (let from = 0; ; from += 500) {
      const { data, error } = await db.from('radio247_subscribers').select('email').is('unsubscribed_at', null)
        .order('email', { ascending: true }).range(from, from + 499);
      if (error) break;
      for (const r of (data || [])) { const e = String(r.email || '').trim().toLowerCase(); if (e) recipients.push(e); }
      if (!data || data.length < 500) break;
    }
    if (dry) return res.status(200).json({ ok: true, dryRun: true, show: due.show.id, reminder: due.kind + 1, of: due.show.reminderOffsetsHours.length, wouldSend: recipients.length });

    // Logg FØRST (unngår dobbelutsending om to køyringar overlappar), oppdater tal etterpå.
    const ins = await db.from('special_reminder_log').insert({ show_id: due.show.id, kind: due.kind, sent: 0 });
    if (ins.error) return res.status(200).json({ ok: true, sent: 0, reason: 'already logged' });

    let sent = 0, skipped = 0, failed = 0;
    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(batch.map(async email => {
        try {
          const resp = await fetch(`${siteUrl}/api/send-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.CRON_SECRET}` },
            body: JSON.stringify({ type: 'special_show_reminder', toEmail: email, toName: 'there', showId: due.show.id, kind: due.kind }),
          });
          const body = await resp.json().catch(() => ({}));
          if (!resp.ok) return 'failed';
          return body.skipped ? 'skipped' : 'sent';
        } catch { return 'failed'; }
      }));
      for (const x of results) { if (x === 'sent') sent++; else if (x === 'skipped') skipped++; else failed++; }
      if (i + BATCH_SIZE < recipients.length) await sleep(BATCH_PAUSE);
    }
    await db.from('special_reminder_log').update({ sent }).eq('show_id', due.show.id).eq('kind', due.kind);
    return res.status(200).json({ ok: true, show: due.show.id, reminder: due.kind + 1, total: recipients.length, sent, skipped, failed });
  } catch (e) {
    console.error('special-reminder error:', e && e.message ? e.message : e);
    return res.status(500).json({ error: 'Could not send the reminders' });
  }
};
