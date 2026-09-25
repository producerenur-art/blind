// LiveSets — tar opp kvar live-sending (eigar + gjeste-DJ-ar), lastar opptaket
// opp til Supabase Storage etterpå og lagrar ei arkivrad (public.live_sets,
// migrasjon 0032) som vises offentleg i js/liveArchive.js. Brukarønske 2026-09-24.
// Opptaket stoppar ALDRI sendinga: MediaRecorder les ei kopi av utgåande lyd.
const LiveSets = (() => {
  let _cur = null; // { id, user, isOwner, startedAt, rec, chunks, mime }

  function _client() { return (typeof SC_Storage !== 'undefined' && SC_Storage.isConfigured && SC_Storage.isConfigured()) ? SC_Storage.client() : null; }
  function _secret() { return (typeof CONFIG !== 'undefined' && CONFIG.LIVE_BROADCAST_SECRET) || ''; }
  function _me() { return (typeof Auth !== 'undefined' && Auth.current) ? Auth.current() : null; }
  function _isAdmin(me) { return !!(me && typeof CONFIG !== 'undefined' && CONFIG.isAdminEmail && CONFIG.isAdminEmail(me)); }
  function _toast(m, t, ms) { if (typeof App !== 'undefined' && App.toast) App.toast(m, t || 'info', ms || 4000); }
  function _id() { return 'set_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }

  // ── Krasj-/refresh-sikker buffer (IndexedDB) ─────────────────────────────────
  // Kvart opptaks-bitt blir skrive til IndexedDB mens sendinga går. Blir fana
  // hardt oppfriska/lukka midt i settet, finn recover() bitane att ved neste
  // sidelasting, lastar dei opp og avsluttar arkivrada — settet blir aldri borte.
  function _db() {
    return new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') return reject(new Error('no idb'));
      const r = indexedDB.open('sirius-livesets', 1);
      r.onupgradeneeded = () => {
        const d = r.result;
        d.createObjectStore('meta', { keyPath: 'id' });
        d.createObjectStore('chunks', { autoIncrement: true }).createIndex('setId', 'setId');
      };
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  }
  function _tx(db, stores, mode, fn) {
    return new Promise((resolve, reject) => {
      const t = db.transaction(stores, mode); const out = fn(t);
      t.oncomplete = () => resolve(out && out.result !== undefined ? out.result : out);
      t.onerror = () => reject(t.error); t.onabort = () => reject(t.error);
    });
  }
  async function _saveChunk(cur, blob) {
    try {
      const db = await _db();
      await _tx(db, ['chunks', 'meta'], 'readwrite', t => {
        t.objectStore('chunks').add({ setId: cur.id, blob, at: Date.now() });
        t.objectStore('meta').put({ id: cur.id, user: cur.user, isOwner: cur.isOwner, startedAt: cur.startedAt, lastAt: Date.now(), mime: cur.mime });
      });
      db.close();
    } catch (e) { /* buffer er berre ekstra sikring */ }
  }
  async function _clearBuffer(id) {
    try {
      const db = await _db();
      await _tx(db, ['chunks', 'meta'], 'readwrite', t => {
        t.objectStore('meta').delete(id);
        const idx = t.objectStore('chunks').index('setId');
        idx.openKeyCursor(IDBKeyRange.only(id)).onsuccess = ev => { const c = ev.target.result; if (c) { t.objectStore('chunks').delete(c.primaryKey); c.continue(); } };
      });
      db.close();
    } catch (e) {}
  }

  // Gjenopprett sett som blei avbrote av hard refresh/krasj.
  async function recover() {
    let db;
    try { db = await _db(); } catch (e) { return; }
    try {
      const metas = await _tx(db, ['meta'], 'readonly', t => t.objectStore('meta').getAll());
      for (const m of metas || []) {
        if (_cur && _cur.id === m.id) continue;
        const chunks = await _tx(db, ['chunks'], 'readonly', t => t.objectStore('chunks').index('setId').getAll(IDBKeyRange.only(m.id)));
        db.close(); db = null;
        const blobs = (chunks || []).sort((a, b) => a.at - b.at).map(c => c.blob);
        const ok = !blobs.length || await _finalize({ id: m.id, user: m.user, isOwner: m.isOwner, startedAt: m.startedAt, mime: m.mime },
          new Blob(blobs, { type: m.mime || 'audio/webm' }), Math.round(((m.lastAt || Date.now()) - m.startedAt) / 1000), true);
        if (ok) await _clearBuffer(m.id);
        try { db = await _db(); } catch (e) { return; }
      }
    } catch (e) { console.warn('[LiveSets] recover feila:', e.message || e); }
    finally { try { db && db.close(); } catch (e) {} }
  }

  function _pickMime() {
    if (typeof MediaRecorder === 'undefined') return '';
    for (const m of ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4']) {
      try { if (MediaRecorder.isTypeSupported(m)) return m; } catch (e) {}
    }
    return '';
  }

  // Start rad + opptak. stream = utgåande MediaStream (med lydspor).
  async function begin({ stream, displayName, room, isOwner, trackTitle, linkUrl }) {
    if (_cur) return;
    const me = _me();
    const cur = { id: _id(), user: (me && me.username) || '', isOwner: !!isOwner, startedAt: Date.now(), rec: null, chunks: [], mime: '' };
    _cur = cur;
    const c = _client();
    if (c) {
      try {
        const { error } = await c.rpc('start_live_set', {
          p_id: cur.id, p_username: cur.user, p_display_name: displayName || '', p_room: room || '',
          p_is_owner: cur.isOwner, p_secret: cur.isOwner ? _secret() : null,
          p_track_title: trackTitle || '', p_link_url: linkUrl || '',
        });
        if (error) console.warn('[LiveSets] start feila:', error.message);
      } catch (e) { console.warn('[LiveSets] start feila:', e.message || e); }
    }
    try {
      const audioTracks = stream && stream.getAudioTracks ? stream.getAudioTracks() : [];
      const mime = _pickMime();
      if (audioTracks.length && typeof MediaRecorder !== 'undefined') {
        cur.mime = mime;
        cur.rec = new MediaRecorder(new MediaStream(audioTracks), mime ? { mimeType: mime, audioBitsPerSecond: 80000 } : undefined);
        cur.rec.ondataavailable = e => { if (e.data && e.data.size) { cur.chunks.push(e.data); _saveChunk(cur, e.data); } };
        cur.rec.start(5000);
      }
    } catch (e) { console.warn('[LiveSets] opptak kunne ikkje startast:', e.message || e); }
  }

  // Stopp opptak, last opp, avslutt rada. Kalla FØR lydsporet blir stoppa.
  async function end({ trackTitle, linkUrl } = {}) {
    const cur = _cur; _cur = null;
    if (!cur) return;
    const durationSec = Math.round((Date.now() - cur.startedAt) / 1000);
    const blob = await new Promise(resolve => {
      const done = () => resolve(cur.chunks.length ? new Blob(cur.chunks, { type: cur.mime || 'audio/webm' }) : null);
      if (!cur.rec || cur.rec.state === 'inactive') return done();
      cur.rec.onstop = done;
      try { cur.rec.stop(); } catch (e) { done(); }
    });
    // Buffer slettast BERRE når alt er lagra — feilar opplasting, ligg bitane att og recover() prøver på nytt.
    if (await _finalize(cur, blob, durationSec, false, { trackTitle, linkUrl })) await _clearBuffer(cur.id);
  }

  // Last opp opptaket og avslutt arkivrada (brukt både ved Stop og ved recover()).
  async function _finalize(cur, blob, durationSec, recovered, extra) {
    extra = extra || {};
    // Stille-sjekk: ekte 80 kbps-lyd er ~10 KB/s; nesten-stille opptak blir under ~3 KB/s.
    if (!recovered && durationSec >= 10 && (!blob || blob.size / durationSec < 3000)) {
      _toast('Warning: your recording looks silent — no audio reached the broadcast. Check that macOS output is "Flerutgangsenhet" (with BlackHole 2ch ticked) and that Sent (L)/(R) shows real dB before going live.', 'error', 12000);
    }
    let audioUrl = null;
    if (blob && blob.size > 2000 && typeof SC_Storage !== 'undefined' && SC_Storage.isConfigured()) {
      _toast(recovered ? 'Recovering your unfinished live set…' : 'Saving your set to the archive…', 'info', 5000);
      try {
        const ext = /mp4/.test(blob.type) ? 'm4a' : 'webm';
        const file = new File([blob], 'live-set.' + ext, { type: blob.type });
        audioUrl = (await SC_Storage.upload(file, { prefix: 'live-sets' })).url;
      } catch (e) { _toast('Recording upload failed: ' + (e.message || e), 'error', 6000); return false; }
    }
    const c = _client();
    if (!c) return false;
    try {
      const { error } = await c.rpc('finish_live_set', {
        p_id: cur.id, p_username: cur.user, p_secret: cur.isOwner ? _secret() : null,
        p_audio_url: audioUrl, p_duration_sec: durationSec,
      });
      if (error) { console.warn('[LiveSets] finish feila:', error.message); return false; }
      if (extra.trackTitle || extra.linkUrl) {
        await c.rpc('update_live_set', { p_id: cur.id, p_username: cur.user, p_secret: cur.isOwner ? _secret() : null,
          p_track_title: extra.trackTitle || null, p_link_url: extra.linkUrl || null });
      }
      _toast('Your set is in the Live Archive — open it there to add a preview image, text and link.', 'success', 7000);
      return true;
    } catch (e) { console.warn('[LiveSets] finish feila:', e.message || e); return false; }
  }

  async function list(limit) {
    const c = _client(); if (!c) return [];
    const { data, error } = await c.from('live_sets').select('*').not('ended_at', 'is', null)
      .order('ended_at', { ascending: false }).limit(limit || 60);
    return error ? [] : (data || []);
  }

  async function get(id) {
    const c = _client(); if (!c) return null;
    const { data, error } = await c.from('live_sets').select('*').eq('id', id).maybeSingle();
    return error ? null : data;
  }

  // Berre eigaren av settet (innlogga med same brukarnamn) og admin får redigere.
  function canEdit(set) {
    const me = _me();
    if (!me || !set) return false;
    if (_isAdmin(me)) return true;
    return !!set.owner_username && String(set.owner_username).toLowerCase() === String(me.username || '').toLowerCase();
  }

  async function update(id, fields) {
    const c = _client(); const me = _me();
    if (!c || !me) return false;
    const { error } = await c.rpc('update_live_set', {
      p_id: id, p_username: me.username || '', p_secret: _isAdmin(me) ? _secret() : null,
      p_display_name: fields.displayName ?? null, p_track_title: fields.trackTitle ?? null,
      p_link_url: fields.linkUrl ?? null, p_cover_url: fields.coverUrl ?? null, p_audio_url: fields.audioUrl ?? null,
    });
    if (error) console.warn('[LiveSets] update feila:', error.message);
    return !error;
  }

  // Gjenopprett avbrotne sett litt etter sidelasting (ikkje i vegen for oppstart).
  if (typeof window !== 'undefined') setTimeout(() => { try { recover(); } catch (e) {} }, 4000);

  // Slett eit sett (berre eigar/admin — sjekka i databasen, ikkje berre i knappen).
  async function remove(id) {
    const c = _client(); const me = _me();
    if (!c || !me) return false;
    const { error } = await c.rpc('delete_live_set', { p_id: id, p_username: me.username || '', p_secret: _isAdmin(me) ? _secret() : null });
    if (error) console.warn('[LiveSets] delete feila:', error.message);
    return !error;
  }

  return { begin, end, list, get, canEdit, update, remove, recover };
})();

if (typeof window !== 'undefined') window.LiveSets = LiveSets;
if (typeof module !== 'undefined' && module.exports) module.exports = LiveSets;
