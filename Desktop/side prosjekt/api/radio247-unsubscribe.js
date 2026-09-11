// Ett-klikks avmelding for "🌘 24-Hour Cycle"-e-posten — GET så lenka virker
// direkte fra e-postklienten uten SPA-innlasting. Bevisst frittstående, IKKE
// koblet til den generelle #/unsubscribe-sida (js/unsubscribe.js), som styrer
// et annet, atskilt abonnement (newsletter_subscribers).
const { createClient } = require('@supabase/supabase-js');

function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c])); }

function page(title, body) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)} — SiriusFM</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>body{font-family:system-ui,sans-serif;background:#0a0a14;color:#e2e8f0;display:flex;
    align-items:center;justify-content:center;min-height:100vh;margin:0;padding:2rem;text-align:center}
    .card{max-width:420px}h1{font-size:1.4rem;margin-bottom:0.75rem}
    a{color:#a855f7;text-decoration:none;font-weight:600}p{color:#94a3b8;line-height:1.6}</style>
  </head><body><div class="card">${body}<p style="margin-top:1.5rem"><a href="/">← Back to SiriusFM</a></p></div></body></html>`;
}

module.exports = async (req, res) => {
  const email = String((req.query && req.query.email) || '').toLowerCase().trim();
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  if (!email || !email.includes('@')) {
    return res.status(400).send(page('Unsubscribe', '<h1>Missing email address</h1><p>This link is missing the email parameter.</p>'));
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return res.status(503).send(page('Unsubscribe', '<h1>Not available right now</h1><p>Please try again later.</p>'));
  }

  try {
    const db = createClient(url, key, { auth: { persistSession: false } });
    await db.from('radio247_subscribers')
      .update({ unsubscribed_at: new Date().toISOString() })
      .ilike('email', email);
  } catch (e) {
    console.error('radio247-unsubscribe error:', e && e.message ? e.message : e);
  }

  return res.status(200).send(page('Unsubscribed',
    `<h1>You're unsubscribed 👋</h1><p><strong>${esc(email)}</strong> will no longer receive the daily 24-Hour Cycle schedule.</p>`));
};
