// api/groups.js — server-autorisert Facebook-lignende grupper (kryss-nettlesar
// -spegling for js/groups.js). Sjå supabase/migrations/0019_groups.sql for
// kvifor dette går via ein server-endepunkt: grupper kan vere 'closed'
// (private), så vanleg "anon-nøkkel kan lese"-mønster passar ikkje. Kvart
// kall som treng identitet viser fram eit sessionToken (utstedt ved
// innlogging i api/auth.js) — same modell som api/dm.js/api/notify.js.
const { createClient } = require('@supabase/supabase-js');
const { verify } = require('./_hmac');

function supa() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
}

function meFrom(body) {
  const claim = verify(body.sessionToken);
  return (claim && claim.purpose === 'session' && claim.username) ? claim.username : null;
}
function canSee(g, me) {
  return g.privacy !== 'closed' || (!!me && Array.isArray(g.members) && g.members.includes(me));
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
  const me = meFrom(body); // kan vere null — gjester kan sjå opne grupper
  const db = supa();

  try {
    // ── Grupper ────────────────────────────────────────────────────────
    if (body.action === 'list') {
      const { data, error } = await db.from('groups').select('*').order('ts', { ascending: false });
      if (error) throw error;
      return res.status(200).json({ groups: (data || []).filter(g => canSee(g, me)) });
    }

    if (body.action === 'upsert_group') {
      if (!me) return res.status(401).json({ error: 'Login required' });
      const g = body.group || {};
      const id = String(g.id || '');
      if (!id || !g.name) return res.status(400).json({ error: 'Missing id/name' });
      const { data: existing } = await db.from('groups').select('owner, members').eq('id', id).maybeSingle();
      if (existing && existing.owner !== me) return res.status(403).json({ error: 'Only the owner can edit this group' });
      const row = {
        id, name: String(g.name).slice(0, 120),
        description: g.description ? String(g.description).slice(0, 500) : null,
        rules: g.rules ? String(g.rules).slice(0, 2000) : null,
        privacy: g.privacy === 'closed' ? 'closed' : 'open',
        owner: existing ? existing.owner : me,
        owner_display: existing ? undefined : String(g.ownerDisplay || me).slice(0, 80),
        // `members` er ein jsonb-kolonne: send ein EKTE JS-array, ikkje ein
        // JSON-strengja tekst — elles lagrar Postgres han som eit jsonb-
        // strengskalar, ikkje eit array, og canSee()/Array.isArray() under
        // ville feila stille for nyoppretta grupper.
        members: existing ? existing.members : [me],
        banner: g.banner != null ? String(g.banner).slice(0, 2000) : (existing ? undefined : ''),
        ts: Number(g.ts) || Date.now(),
      };
      Object.keys(row).forEach(k => row[k] === undefined && delete row[k]);
      const { error } = await db.from('groups').upsert(row, { onConflict: 'id' });
      if (error) throw error;
      return res.status(200).json({ success: true, id });
    }

    if (body.action === 'update_members') {
      if (!me) return res.status(401).json({ error: 'Login required' });
      const groupId = String(body.groupId || '');
      const op = body.op; // 'join' | 'leave' | 'invite'
      const { data: g, error: gErr } = await db.from('groups').select('*').eq('id', groupId).maybeSingle();
      if (gErr) throw gErr;
      if (!g) return res.status(404).json({ error: 'Group not found' });
      let members = Array.isArray(g.members) ? g.members.slice() : [];

      if (op === 'join') {
        if (g.privacy === 'closed' && !members.includes(me)) return res.status(403).json({ error: 'This group is closed' });
        if (!members.includes(me)) members.push(me);
      } else if (op === 'leave') {
        if (g.owner === me) return res.status(400).json({ error: 'Owner cannot leave' });
        members = members.filter(u => u !== me);
      } else if (op === 'invite') {
        const target = String(body.target || '');
        if (!target) return res.status(400).json({ error: 'Missing target' });
        if (!members.includes(me)) return res.status(403).json({ error: 'You must be a member to invite' });
        if (!members.includes(target)) members.push(target);
      } else {
        return res.status(400).json({ error: 'Unknown op' });
      }

      // Ekte array til jsonb-kolonnen — sjå kommentaren i upsert_group over.
      const { error } = await db.from('groups').update({ members }).eq('id', groupId);
      if (error) throw error;
      return res.status(200).json({ success: true, members });
    }

    if (body.action === 'delete_group') {
      if (!me) return res.status(401).json({ error: 'Login required' });
      const groupId = String(body.groupId || '');
      const { data: g } = await db.from('groups').select('owner').eq('id', groupId).maybeSingle();
      if (!g) return res.status(200).json({ success: true }); // alt borte
      if (g.owner !== me) return res.status(403).json({ error: 'Only the owner can delete this group' });
      await db.from('group_posts').delete().eq('group_id', groupId);
      const { error } = await db.from('groups').delete().eq('id', groupId);
      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    // ── Gruppeinnlegg ──────────────────────────────────────────────────
    if (body.action === 'posts_list') {
      const groupId = String(body.groupId || '');
      const { data: g } = await db.from('groups').select('privacy, members').eq('id', groupId).maybeSingle();
      if (!g || !canSee(g, me)) return res.status(200).json({ posts: [] }); // ukjend/skjult → tom, ikkje feil
      const { data, error } = await db.from('group_posts')
        .select('id, group_id, author, author_display, text, ts')
        .eq('group_id', groupId).order('ts', { ascending: false }).limit(300);
      if (error) throw error;
      return res.status(200).json({ posts: data || [] });
    }

    if (body.action === 'post_create') {
      if (!me) return res.status(401).json({ error: 'Login required' });
      const groupId = String(body.groupId || '');
      const text = String(body.text || '').slice(0, 2000).trim();
      if (!text) return res.status(400).json({ error: 'Missing text' });
      const { data: g } = await db.from('groups').select('members').eq('id', groupId).maybeSingle();
      if (!g || !Array.isArray(g.members) || !g.members.includes(me))
        return res.status(403).json({ error: 'You must be a member of the group' });
      const id = String(body.id || `gp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
      const row = {
        id, group_id: groupId, author: me,
        author_display: String(body.authorDisplay || me).slice(0, 80),
        text, ts: Number(body.ts) || Date.now(),
      };
      const { error } = await db.from('group_posts').upsert(row, { onConflict: 'id' });
      if (error) throw error;
      return res.status(200).json({ success: true, id });
    }

    if (body.action === 'post_delete') {
      if (!me) return res.status(401).json({ error: 'Login required' });
      const id = String(body.id || '');
      const { data: p } = await db.from('group_posts').select('author, group_id').eq('id', id).maybeSingle();
      if (!p) return res.status(200).json({ success: true });
      let allowed = p.author === me;
      if (!allowed) {
        const { data: g } = await db.from('groups').select('owner').eq('id', p.group_id).maybeSingle();
        allowed = !!g && g.owner === me;
      }
      if (!allowed) return res.status(403).json({ error: 'Not allowed' });
      const { error } = await db.from('group_posts').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'Unknown action' });
  } catch (e) {
    console.error('groups error:', e && e.message ? e.message : e);
    return res.status(500).json({ error: 'Server error' });
  }
};
