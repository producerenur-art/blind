// api/notify.js — server-autorisert varslingssenter (kryss-nettlesar-spegling
// for js/notify.js). Sjå supabase/migrations/0018_notifications.sql for kvifor
// — kort: Gun-only levering var truleg roten til at venneforespurnadar aldri
// nådde mottakaren på tvers av nettlesarar.
//
// Autorisering: 'send' krev berre eit gyldig sessionToken (bevis for KVEN
// avsendaren er) — ikkje ein mottakar-spesifikk sjekk, akkurat som den gamle
// Gun-åtferda der kven som helst kunne varsle kven som helst. 'list' er derimot
// strengt avgrensa: ein brukar kan BERRE lese SIN EIGEN innboks (to_user må
// vere tokenets brukarnamn) — handheva her, ikkje via RLS/policyer.
const { createClient } = require('@supabase/supabase-js');
const { verify } = require('./_hmac');

function supa() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
}

// notifyAll() kan i teorien treffe svært mange mottakarar — hardt tak så eitt
// API-kall aldri kan skrive eit ubegrensa tal rader.
const MAX_RECIPIENTS = 5000;

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

  const db = supa();
  try {
    if (body.action === 'send') {
      const from = String(body.from || me);
      if (from !== me) return res.status(403).json({ error: 'from must match your session' });
      const text = String(body.text || '').slice(0, 500).trim();
      if (!text) return res.status(400).json({ error: 'Missing text' });

      let toList = Array.isArray(body.to) ? body.to : [body.to];
      toList = [...new Set(toList.map(u => String(u || '').trim()).filter(u => u && u !== from))].slice(0, MAX_RECIPIENTS);
      if (!toList.length) return res.status(400).json({ error: 'Missing recipient(s)' });

      const ts   = Number(body.ts) || Date.now();
      const type = String(body.type || 'message').slice(0, 32);
      const fromDisplay = String(body.fromDisplay || from).slice(0, 80);
      const link = body.link ? String(body.link).slice(0, 300) : null;
      // Delt id på tvers av mottakarar ville kollidert (primary key) — bruk
      // klientens id (om éin mottakar) berre som prefiks, elles generer per rad.
      const baseId = String(body.id || `n_${ts}_${Math.random().toString(36).slice(2, 7)}`);
      const rows = toList.map((to, i) => ({
        id: toList.length > 1 ? `${baseId}_${i}` : baseId,
        to_user: to, from_user: from, from_display: fromDisplay,
        type, text, link, ts,
      }));
      const { error } = await db.from('notifications').upsert(rows, { onConflict: 'id' });
      if (error) throw error;
      return res.status(200).json({ success: true, count: rows.length });
    }

    if (body.action === 'list') {
      const limit = Math.max(1, Math.min(parseInt(body.limit, 10) || 60, 200));
      const { data, error } = await db.from('notifications')
        .select('id, from_user, from_display, type, text, link, ts')
        .eq('to_user', me)
        .order('ts', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return res.status(200).json({ notifications: data || [] });
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (e) {
    console.error('notify error:', e && e.message ? e.message : e);
    return res.status(500).json({ error: 'Server error' });
  }
};
