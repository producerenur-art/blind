// POST /api/mix-uploaded — bekreftelsesmail når ein innlogga brukar har lasta opp eit sett OVER 3 timar
// (det krev eit kjøp: ekstra opplastingstimer eller Pro). Mailen nemner DJ-namnet og (valfri) songliste.
// Autorisering: sesjonstoken frå api/auth.js, så mottakaren alltid er kontoen sin eigen e-post (aldri klient-oppgitt).
const { createClient } = require('@supabase/supabase-js');
const { verify } = require('./_hmac');
const mail = require('./_purchase-mail');

const FREE_MAX_SEC = 3 * 3600;
const clock = sec => { const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60); return h ? `${h} h ${m} min` : `${m} min`; };

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.RESEND_API_KEY)
    return res.status(503).json({ error: 'Not configured' });

  const body = req.body || {};
  const claim = verify(body.sessionToken);
  if (!claim || claim.purpose !== 'session' || !claim.username) return res.status(401).json({ error: 'Invalid or expired session' });

  const durationSec = Math.round(Number(body.durationSec) || 0);
  if (durationSec <= FREE_MAX_SEC) return res.status(200).json({ skipped: 'under-free-limit' });   // gratis-sett gir ingen mail

  const title = String(body.title || '').slice(0, 160);
  const tracklist = (Array.isArray(body.tracklist) ? body.tracklist : []).map(x => String(x).slice(0, 160)).slice(0, 80);
  try {
    const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const { data: acc } = await db.from('accounts').select('email, display_name').eq('username', claim.username).maybeSingle();
    if (!acc || !acc.email) return res.status(200).json({ skipped: 'no-email' });
    const name = acc.display_name || claim.username;
    const siteUrl = (process.env.SITE_URL || 'https://www.siriusfm.no').replace(/\/$/, '');
    // Éi mail per (brukar, tittel, lengd): ein dobbel-klikk eller ny innlasting av sida sender ikkje om att.
    const key = `mixup-${claim.username}-${durationSec}-${title}`.replace(/[^a-zA-Z0-9_-]/g, '_');
    await mail.send({
      to: acc.email, subject: `Your set is uploaded — ${title || 'DJ mix'} 🎛️`,
      html: mail.mixUploadedHtml({ name, djName: name, title, durationText: clock(durationSec), tracklist, siteUrl }),
      idempotencyKey: key,
    });
    return res.status(200).json({ success: true });
  } catch (e) {
    console.error('mix-uploaded error:', e.message);
    return res.status(200).json({ error: 'email-failed' });   // opplastinga er alt vellykka; mailen er berre ekstra
  }
};
