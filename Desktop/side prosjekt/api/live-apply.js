// POST /api/live-apply — søknad om å spele live. Har du KJØPT noko (aktivt Pro-abonnement eller ekstra opplastingstimer),
// blir forespørselen godkjent automatisk — ingen manuell godkjenning frå eigar. Alle andre blir ståande som «pending».
// Autorisering: sesjonstoken (api/auth.js) → brukarnamnet kjem frå tokenet, aldri frå klienten. Kjøpsstatus blir sjekka på serveren.
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const { verify } = require('./_hmac');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return res.status(503).json({ error: 'Not configured' });

  const b = req.body || {};
  const claim = verify(b.sessionToken);
  if (!claim || claim.purpose !== 'session' || !claim.username) return res.status(401).json({ error: 'Invalid or expired session' });
  const username = claim.username;

  let start = null;
  if (b.requestedStart) { const t = Date.parse(b.requestedStart); if (!isNaN(t)) start = new Date(t).toISOString(); }
  const hours = Math.max(1, Math.min(12, parseInt(b.requestedHours, 10) || 1));

  try {
    const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const { data: acc } = await db.from('accounts').select('email, display_name').eq('username', username).maybeSingle();

    // Har brukaren kjøpt? (Pro: aktivt abonnement i subscriptions. Timar: rad i live_access.) Manglande tabell = ikkje kjøpt.
    let paid = false;
    try { const { data } = await db.from('subscriptions').select('stripe_subscription_id').eq('username', username).eq('status', 'active').limit(1); paid = !!(data && data.length); } catch (_) {}
    if (!paid) { try { const { data } = await db.from('live_access').select('id').eq('username', username).limit(1); paid = !!(data && data.length); } catch (_) {} }

    if (paid && !start) return res.status(400).json({ error: 'schedule_required', message: 'Pick a specific broadcast time.' });

    const id = 'req_' + Date.now().toString(36) + crypto.randomBytes(4).toString('hex');
    const { error } = await db.rpc('submit_broadcast_request', {
      p_id: id, p_username: username, p_email: (acc && acc.email) || '', p_display_name: String(b.displayName || (acc && acc.display_name) || username).slice(0, 120),
      p_message: String(b.message || '').slice(0, 1000), p_requested_start: start, p_requested_hours: hours,
    });
    if (error) throw error;

    if (paid) {
      const { error: e2 } = await db.from('live_broadcasts').update({ status: 'approved', reviewed_by: 'auto (purchase)', reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', id).eq('status', 'pending');
      if (e2) throw e2;
    }
    return res.status(200).json({ id, autoApproved: paid });
  } catch (e) {
    console.error('live-apply error:', e.message || e);
    return res.status(500).json({ error: 'Could not send the request' });
  }
};
