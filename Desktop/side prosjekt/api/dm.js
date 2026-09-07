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
        .select('id, channel, from_user, from_display, to_user, text, ts')
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
        ts: Number(body.ts) || Date.now(),
      };
      const { error } = await db.from('direct_messages').upsert(row, { onConflict: 'id' });
      if (error) throw error;
      return res.status(200).json({ success: true, id });
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (e) {
    console.error('dm error:', e && e.message ? e.message : e);
    return res.status(500).json({ error: 'Server error' });
  }
};
