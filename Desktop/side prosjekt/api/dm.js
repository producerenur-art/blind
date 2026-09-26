// api/dm.js — server-autorisert venne-DM (kryss-nettlesar-spegling for
// js/friendchat.js). Sjå supabase/migrations/0016_direct_messages.sql for
// kvifor dette går via ein server-endepunkt i staden for RPC-ar direkte frå
// klienten: DM er privat, og appens innlogging er klient-side (Gun/localStorage),
// så vanleg RLS/anon-tilgang kan ikkje skilje "eigen DM" frå "andre sin DM".
//
// Autorisering: kvart kall må vise fram eit sessionToken (HMAC, utstedt ved
// innlogging/aktivering i api/auth.js — sjå issueSessionToken der). Tokenet
// bevisar KVEN brukaren er; vi sjekkar SEPARAT at akkurat den brukaren faktisk
// er ein av dei to partane i kanalen (eller at kanalen er den opne fellesroma
// 'group') FØR nokon spørring mot databasen køyrer.
const { createClient } = require('@supabase/supabase-js');
const { verify } = require('./_hmac');

function supa() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
}

// 'group' er ei open, felles lounge for alle innlogga med minst éin venn —
// ikkje privat, difor ingen deltakar-sjekk. Ein DM-kanal er 'a__b' (sortert),
// jf. SC.channelKey i js/realtime.js — brukaren må vere ein av dei to.
function isParticipant(channel, username) {
  if (channel === 'group') return true;
  return String(channel).split('__').includes(username);
}

const { Resend } = require('resend');
const EMAIL_THROTTLE_MS = 15 * 60 * 1000;   // maks éin e-post per avsendar/samtale per 15 min

function _h(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function _preview(row) {
  if (row.kind === 'gif') return 'sent you an image';
  if (String(row.text).startsWith('sc:audio|')) return 'shared a track with you';
  const t = String(row.text);
  return t.length > 160 ? t.slice(0, 157) + '…' : t;
}

// Send e-post til mottakaren av ein privat DM. Mottakaren finn vi på serveren
// (klienten oppgir aldri adressa). Respekterer avmelding (accounts.marketing_opt_out /
// newsletter_subscribers) og strupar så ein samtale ikkje fyller innboksen.
async function notifyByEmail(db, row) {
  if (!process.env.RESEND_API_KEY || row.channel === 'group' || !row.to_user) return false;
  const ch = String(row.channel).split('__');
  if (ch.length !== 2 || !ch.includes(row.to_user) || !ch.includes(row.from_user) || row.to_user === row.from_user) return false;

  const { data: acc } = await db.from('accounts')
    .select('email, display_name, marketing_opt_out').eq('username', row.to_user).maybeSingle();
  if (!acc || !acc.email || acc.marketing_opt_out) return false;
  try {
    const { data: sub } = await db.from('newsletter_subscribers').select('unsubscribed_at').ilike('email', acc.email).maybeSingle();
    if (sub && sub.unsubscribed_at) return false;
  } catch (_) {}

  const since = row.ts - EMAIL_THROTTLE_MS;
  const { count } = await db.from('direct_messages').select('id', { count: 'exact', head: true })
    .eq('channel', row.channel).eq('from_user', row.from_user).gt('ts', since).lt('ts', row.ts);
  if (count > 0) return false;

  const site = (process.env.SITE_URL || 'https://siriusfm.no').replace(/\/$/, '');
  const link = `${site}/#/messages/${encodeURIComponent(row.from_user)}`;
  const toName = acc.display_name || row.to_user;
  const fromName = row.from_display || row.from_user;
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0f0f1a;font-family:Arial,sans-serif">
  <div style="max-width:560px;margin:2rem auto;background:#1a1a2e;border-radius:16px;overflow:hidden;border:1px solid rgba(124,58,237,0.3)">
    <div style="background:linear-gradient(135deg,#7c3aed,#2563eb);padding:1.5rem;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:1.6rem">Sirius<span style="color:#f59e0b">FM</span></h1>
    </div>
    <div style="padding:2rem;color:#e2e8f0">
      <h2 style="color:#fff;margin:0 0 1rem;font-size:1.2rem;text-align:center">New private message</h2>
      <p style="color:#94a3b8;margin:0 0 .5rem">Hi, ${_h(toName)}!</p>
      <p style="color:#94a3b8;line-height:1.6;margin:0 0 1rem"><strong style="color:#c4b5fd">${_h(fromName)}</strong> (@${_h(row.from_user)}) wrote to you:</p>
      <div style="background:rgba(255,255,255,.06);border-radius:10px;padding:.9rem 1rem;color:#e2e8f0;margin-bottom:1.5rem">${_h(_preview(row))}</div>
      <div style="text-align:center"><a href="${_h(link)}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#2563eb);color:#fff;text-decoration:none;padding:.8rem 1.8rem;border-radius:8px;font-weight:700">Open the conversation</a></div>
    </div>
    <div style="padding:1rem 2rem;border-top:1px solid rgba(255,255,255,0.08);text-align:center;color:#64748b;font-size:.75rem">
      You get at most one email per 15 minutes from each conversation. Manage or turn off emails in your account settings.
    </div>
  </div></body></html>`;
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || 'SiriusFM <onboarding@resend.dev>',
    to: acc.email, subject: `${fromName} sent you a message on SiriusFM`, html,
  });
  if (error) { console.warn('dm email rejected:', error.message); return false; }
  return true;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY)
    return res.status(503).json({ error: 'Not configured' });

  const body = req.body || {};
  const claim = verify(body.sessionToken);
  if (!claim || claim.purpose !== 'session' || !claim.username)
    return res.status(401).json({ error: 'Invalid or expired session' });
  const me = claim.username;

  const channel = String(body.channel || '').trim();
  if (!channel) return res.status(400).json({ error: 'Missing channel' });
  if (!isParticipant(channel, me)) return res.status(403).json({ error: 'Not a participant in this channel' });

  const db = supa();
  try {
    if (body.action === 'list') {
      const limit = Math.max(1, Math.min(parseInt(body.limit, 10) || 200, 500));
      const { data, error } = await db.from('direct_messages')
        .select('id, channel, from_user, from_display, to_user, text, ts, edited, kind')
        .eq('channel', channel)
        .order('ts', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return res.status(200).json({ messages: (data || []).reverse() });
    }

    if (body.action === 'send') {
      const from = String(body.from || '');
      if (from !== me) return res.status(403).json({ error: 'from must match your session' });
      const text = String(body.text || '').slice(0, 2000).trim();
      if (!text) return res.status(400).json({ error: 'Missing text' });
      const id = String(body.id || `${from}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
      const row = {
        id, channel,
        from_user:    from,
        from_display: String(body.fromDisplay || from).slice(0, 80),
        to_user:      body.to ? String(body.to) : null,
        text,
        kind: body.kind === 'gif' ? 'gif' : 'text',
        ts: Number(body.ts) || Date.now(),
      };
      const { error } = await db.from('direct_messages').upsert(row, { onConflict: 'id' });
      if (error) throw error;
      // E-postvarsel til mottakaren (privat DM). Feil her skal aldri velte sendinga.
      let emailed = false;
      try { emailed = await notifyByEmail(db, row); } catch (e) { console.warn('dm email:', e && e.message); }
      return res.status(200).json({ success: true, id, emailed });
    }

    // Kun eigen melding kan redigerast/slettast — sjekka mot from_user, ikkje
    // berre kanal-deltakinga over (som gjeld begge partar i samtalen).
    if (body.action === 'edit') {
      const id = String(body.id || '');
      const text = String(body.text || '').slice(0, 2000).trim();
      if (!id || !text) return res.status(400).json({ error: 'Missing id/text' });
      const { data: row } = await db.from('direct_messages').select('from_user').eq('id', id).maybeSingle();
      if (!row) return res.status(200).json({ success: true }); // alt borte
      if (row.from_user !== me) return res.status(403).json({ error: 'Not your message' });
      const { error } = await db.from('direct_messages').update({ text, edited: true }).eq('id', id);
      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    if (body.action === 'delete') {
      const id = String(body.id || '');
      if (!id) return res.status(400).json({ error: 'Missing id' });
      const { data: row } = await db.from('direct_messages').select('from_user').eq('id', id).maybeSingle();
      if (!row) return res.status(200).json({ success: true });
      if (row.from_user !== me) return res.status(403).json({ error: 'Not your message' });
      const { error } = await db.from('direct_messages').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (e) {
    console.error('dm error:', e && e.message ? e.message : e);
    return res.status(500).json({ error: 'Server error' });
  }
};
