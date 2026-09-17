// Serverless: øyeblikkelig "SiriusFM er live NO"-varsel. Kalla frå js/livemix.js
// sin bcGo() (_notifyLiveStart()), rett etter at _publishLiveStatus(true) har
// publisert den globale eigar-live-statusen (supabase/migrations/0022_live_broadcast.sql).
// Sender IKKJE den ukentlige oppsummeringa (api/live-reminder.js) — berre ein
// kort "det skjer no, kom inn"-e-post (api/send-email.js, type 'live_started')
// til alle aktiverte kontoar + gjeste-abonnentar (newsletter_subscribers),
// uavhengig av deira digest_day (dette er ikkje del av den ukentlige rytmen).
//
// Autorisering: same delte eigar-hemmelegheit som 0022-migrasjonen sin
// set_live_broadcast_status()-RPC (CONFIG.LIVE_BROADCAST_SECRET i js/config.js)
// — klienten sender han med, akkurat som han alt gjer mot Supabase RPC-en for
// å publisere sjølve "live no"-statusen. IKKJE ein ny hemmelegheit å halda styr
// på. MÅ vere nøyaktig lik dei to andre kopiane (js/config.js + migrasjon 0022).
const LIVE_BROADCAST_SECRET = '4e41fb896708c20de1bd6be1cef21b52ca0f43ea534d0d5e';

// Flappy "gå live"/stopp/gå live igjen på kort tid skal IKKJE bombardere
// abonnentane med fleire e-postar — minst så lang pause mellom to varsel.
const COOLDOWN_MS = 20 * 60 * 1000;

const { createClient } = require('@supabase/supabase-js');

const BATCH_SIZE  = 8;
const BATCH_PAUSE = 1100;
const sleep = ms => new Promise(r => setTimeout(r, ms));

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = req.body || {};
  if (String(body.secret || '') !== LIVE_BROADCAST_SECRET) {
    return res.status(401).json({ error: 'Invalid secret' });
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return res.status(503).json({ error: 'Account storage is not configured on the server' });
  if (!process.env.RESEND_API_KEY) return res.status(503).json({ error: 'Email is not configured on the server' });

  const siteUrl = (process.env.SITE_URL || 'https://www.siriusfm.no').replace(/\/$/, '');
  const presenterName = String(body.presenterName || '').slice(0, 80);

  try {
    const db = createClient(url, key, { auth: { persistSession: false } });

    // Cooldown-vakt (migrasjon 0027: live_broadcast_status.last_notified_at).
    // Manglar kolonnen enno (migrasjon ikkje kjørt) → fail-open, send som før.
    const { data: statusRow } = await db.from('live_broadcast_status').select('last_notified_at').eq('id', 1).maybeSingle();
    if (statusRow && statusRow.last_notified_at) {
      const since = Date.now() - new Date(statusRow.last_notified_at).getTime();
      if (since < COOLDOWN_MS) {
        return res.status(200).json({ ok: true, skipped: 'cooldown', retryAfterMs: COOLDOWN_MS - since });
      }
    }
    // Krev denne FØR sendinga (ikkje etter) — reduserer sjansen for at to
    // nesten-samtidige kall (t.d. to faner) begge slepp gjennom cooldown-sjekken.
    await db.from('live_broadcast_status').update({ last_notified_at: new Date().toISOString() }).eq('id', 1);

    // Same to kjelder som api/live-reminder.js: aktiverte kontoar (ikkje reklame-
    // avmelde) + gjeste-abonnentar (ikkje avmelde) — her UTAN digest_day-filter,
    // sidan eit live-no-varsel ikkje er del av den ukentlige rytmen.
    const PAGE = 500;
    const seen = new Set();
    const recipients = [];

    for (let from = 0; ; from += PAGE) {
      const { data, error } = await db.from('accounts')
        .select('username, display_name, email, activated, marketing_opt_out')
        .eq('activated', true)
        .order('username', { ascending: true })
        .range(from, from + PAGE - 1);
      if (error) break;
      for (const r of (data || [])) {
        if (!r.email || r.marketing_opt_out) continue;
        const k = String(r.email).toLowerCase().trim();
        if (!k || seen.has(k)) continue;
        seen.add(k);
        recipients.push({ email: k, name: r.display_name || r.username || 'there' });
      }
      if (!data || data.length < PAGE) break;
    }

    for (let from = 0; ; from += PAGE) {
      const { data, error } = await db.from('newsletter_subscribers')
        .select('email')
        .is('unsubscribed_at', null)
        .order('email', { ascending: true })
        .range(from, from + PAGE - 1);
      if (error) break;
      for (const row of (data || [])) {
        const k = String(row.email || '').toLowerCase().trim();
        if (!k || seen.has(k)) continue;
        seen.add(k);
        recipients.push({ email: k, name: 'there' });
      }
      if (!data || data.length < PAGE) break;
    }

    if (body.dry) return res.status(200).json({ ok: true, dryRun: true, wouldSend: recipients.length });

    let sent = 0, skipped = 0, failed = 0;
    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(batch.map(async r => {
        try {
          const resp = await fetch(`${siteUrl}/api/send-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'live_started', toEmail: r.email, toName: r.name, presenterName }),
          });
          const respBody = await resp.json().catch(() => ({}));
          if (!resp.ok) return 'failed';
          return respBody.skipped ? 'skipped' : 'sent';
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
    console.error('live-start-notify error:', e && e.message ? e.message : e);
    return res.status(500).json({ error: 'Could not send the live notice' });
  }
};
