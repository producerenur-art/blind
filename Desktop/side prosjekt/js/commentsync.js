// CommentSync — speiler kommentarar til Supabase, slik at ALLE som kjem inn
// (ikkje berre eininga/nettlesaren som skreiv kommentaren) ser dei. Gun
// (SC.NS.comments) blir verande for sanntid/pling; dette laget er den varige,
// delte kjelda — same rolle som CommunitySync gjer for innlegg.
//
// Same tryggleiksmodell som CommunitySync/ProfileSync: innlogging er klientside,
// så skriving er sikra med ein PER-FORFATTAR hemmelegheit lagra lokalt hos
// forfattaren, sjekka av SECURITY DEFINER-RPCane i
// supabase/migrations/0006_community_comments.sql.
//
// Degraderer pent: er ikkje Supabase konfigurert er ALT her no-ops, og
// kommentarane fungerer som før (kun Gun/lokalt).
const CommentSync = (() => {
  // Gjenbrukar same per-brukar-hemmelegheit som CommunitySync/ProfileSync →
  // ein brukar har ÉN secret på tvers av innlegg OG kommentarar.
  const SECRETS_KEY = 'sc_profile_secrets';

  function _enabled() {
    return (typeof SC_Storage !== 'undefined')
      && SC_Storage.isConfigured()
      && typeof SC_Storage.client === 'function';
  }
  function _client() { return SC_Storage.client(); }

  function _secrets() {
    try { return JSON.parse(localStorage.getItem(SECRETS_KEY) || '{}'); }
    catch { return {}; }
  }
  function _rand() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID().replace(/-/g, '');
    return `${Date.now()}${Math.random().toString(36).slice(2)}`;
  }
  function _secretFor(username) {
    const s = _secrets();
    if (!s[username]) { s[username] = _rand(); localStorage.setItem(SECRETS_KEY, JSON.stringify(s)); }
    return s[username];
  }

  // Publiser/oppdater ein kommentar. Fire-and-forget: feil logges, kaster aldri.
  async function push(targetKey, c) {
    if (!_enabled() || !targetKey || !c || !c.id || !c.author) return false;
    try {
      // Ikkje lagra eining-lokale felt i sky: Gun-nøkkelen (_k) er lokal.
      const { _k, ...clean } = c;
      const { error } = await _client().rpc('upsert_comment', {
        p_id:     c.id,
        p_target: targetKey,
        p_author: c.author,
        p_secret: _secretFor(c.author),
        p_data:   clean,
        p_ts:     Number(c.ts) || Date.now(),
      });
      if (error) { console.warn('[CommentSync] push:', error.message); return false; }
      return true;
    } catch (e) { console.warn('[CommentSync] push:', e.message || e); return false; }
  }

  // Rediger BERRE tekst + forhåndsvisning på ein kommentar (open for alle innlogga
  // — krev ikkje forfattaren si hemmelegheit). Brukast når ein annan enn forfattaren
  // endrar teksten. Krev migrasjon 0007; returnerer false om RPC-en ikkje finst.
  async function editText(c) {
    if (!_enabled() || !c || !c.id) return false;
    try {
      const { error } = await _client().rpc('edit_comment_text', {
        p_id:          c.id,
        p_text:        c.text || '',
        p_preview_url: c.previewUrl || '',
        p_preview_off: !!c.previewOff,
        p_editor:      c.editedBy || '',
        p_edited_ts:   Number(c.editedTs || c.ts) || Date.now(),
      });
      if (error) { console.warn('[CommentSync] editText:', error.message); return false; }
      return true;
    } catch (e) { console.warn('[CommentSync] editText:', e.message || e); return false; }
  }

  // Hent siste kommentarar frå sky (objekt-array, kvart med ._target = tråd).
  // Tom liste ved feil/ikkje-konfigurert.
  async function list(limit = 400) {
    if (!_enabled()) return [];
    try {
      const { data, error } = await _client().rpc('list_comments', { p_limit: limit });
      if (error || !Array.isArray(data)) return [];
      return data;
    } catch (e) { return []; }
  }

  // Slett ein kommentar. delete_comment (0006) krev PER-KOMMENTAR-hemmelegheita
  // som er einings-lokal → sletting frå ei ANNA eining feila, rada vart verande i
  // sky, og sky-polling la kommentaren inn att for alle. Vi brukar difor
  // delete_comment_owned (slettar på id + forfattar; klienten gatar alt sletting
  // til forfattaren eller vegg-eigaren). Fallback til hemmelegheit-varianten om
  // migrasjon 0010 enno ikkje er køyrt.
  async function remove(id, author) {
    if (!_enabled() || !id || !author) return false;
    try {
      const { error } = await _client().rpc('delete_comment_owned', { p_id: id, p_author: author });
      if (!error) return true;
      // 0010 ikkje køyrt enno (funksjonen finst ikkje) → fall tilbake til hemmelegheit-varianten.
      const notFound = /function|does not exist|schema cache|PGRST202|404/i.test(String(error.message || '') + (error.code || ''));
      if (notFound) {
        const { error: e2 } = await _client().rpc('delete_comment', { p_id: id, p_secret: _secretFor(author) });
        if (e2) { console.warn('[CommentSync] remove(fallback):', e2.message); return false; }
        return true;
      }
      console.warn('[CommentSync] remove:', error.message);
      return false;
    } catch (e) { console.warn('[CommentSync] remove:', e.message || e); return false; }
  }

  return { push, editText, list, remove, _enabled };
})();

if (typeof window !== 'undefined') window.CommentSync = CommentSync;
