// CommunitySync — speiler Community-innlegg til Supabase, slik at ALLE som kjem
// inn (ikkje berre eininga som laga innlegget) ser veggen. Gun (SC.NS.posts) blir
// verande for sanntid/pling; dette laget er den varige, delte kjelda.
//
// Same tryggleiksmodell som ProfileSync (0002): innlogging er klientside, så
// skriving er sikra med ein PER-FORFATTAR hemmelegheit lagra lokalt hos forfattaren,
// sjekka av SECURITY DEFINER-RPCane i supabase/migrations/0005_community_posts.sql.
//
// Degraderer pent: er ikkje Supabase konfigurert (SC_Storage.isConfigured()===false)
// er ALT her no-ops, og Community fungerer som før (kun Gun/lokalt).
const CommunitySync = (() => {
  // Gjenbrukar ProfileSync sin per-brukar-hemmelegheit → ein brukar har ÉN secret.
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

  // Publiser/oppdater eit innlegg. Fire-and-forget: feil logges, kaster aldri.
  async function push(post) {
    if (!_enabled() || !post || !post.id || !post.author) return false;
    try {
      // Ikkje lagra tunge/lokale felt i sky: Gun-nøkkel er einings-lokal.
      const { _k, ...clean } = post;
      const { error } = await _client().rpc('upsert_post', {
        p_id:     post.id,
        p_author: post.author,
        p_secret: _secretFor(post.author),
        p_data:   clean,
        p_ts:     Number(post.ts) || Date.now(),
      });
      if (error) { console.warn('[CommunitySync] push:', error.message); return false; }
      return true;
    } catch (e) { console.warn('[CommunitySync] push:', e.message || e); return false; }
  }

  // Rediger BERRE tekst + forhåndsvisning (open for alle innlogga — krev ikkje
  // forfattaren si hemmelegheit). Brukast når ein annan enn forfattaren endrar
  // teksten. Krev migrasjon 0007; returnerer false om RPC-en ikkje finst enno.
  async function editText(post) {
    if (!_enabled() || !post || !post.id) return false;
    try {
      const { error } = await _client().rpc('edit_post_text', {
        p_id:          post.id,
        p_text:        post.text || '',
        p_preview_url: post.previewUrl || '',
        p_preview_off: !!post.previewOff,
        p_editor:      post.editedBy || '',
        p_edited_ts:   Number(post.editedTs) || Date.now(),
      });
      if (error) { console.warn('[CommunitySync] editText:', error.message); return false; }
      return true;
    } catch (e) { console.warn('[CommunitySync] editText:', e.message || e); return false; }
  }

  // Hent siste innlegg frå sky (objekt-array). Tom liste ved feil/ikkje-konfigurert.
  async function list(limit = 300) {
    if (!_enabled()) return [];
    try {
      const { data, error } = await _client().rpc('list_posts', { p_limit: limit });
      if (error || !Array.isArray(data)) return [];
      return data;
    } catch (e) { return []; }
  }

  // Slett eit innlegg. Forfattaren skal alltid kunna slette sitt EIGE innlegg —
  // frå kva eining/nettlesar som helst. Den gamle hemmelegheit-baserte slettinga
  // (delete_post) feila på tvers av einingar fordi hemmelegheita er einings-lokal,
  // så rada vart verande i sky → alle ANDRE brukarar såg innlegget framleis. Vi
  // brukar difor delete_post_owned (slettar på id + forfattar; klienten gatar alt
  // sletting til forfattaren). Fallback til den gamle RPC-en om 0009 enno ikkje er køyrt.
  async function remove(id, author) {
    if (!_enabled() || !id || !author) return false;
    try {
      const { error } = await _client().rpc('delete_post_owned', { p_id: id, p_author: author });
      if (!error) return true;
      // 0009 ikkje køyrt enno (funksjonen finst ikkje) → fall tilbake til hemmelegheit-varianten.
      const notFound = /function|does not exist|schema cache|PGRST202|404/i.test(String(error.message || '') + (error.code || ''));
      if (notFound) {
        const { error: e2 } = await _client().rpc('delete_post', { p_id: id, p_secret: _secretFor(author) });
        if (e2) { console.warn('[CommunitySync] remove(fallback):', e2.message); return false; }
        return true;
      }
      console.warn('[CommunitySync] remove:', error.message);
      return false;
    } catch (e) { console.warn('[CommunitySync] remove:', e.message || e); return false; }
  }

  return { push, editText, list, remove, _enabled };
})();

if (typeof window !== 'undefined') window.CommunitySync = CommunitySync;
