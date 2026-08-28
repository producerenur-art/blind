// ReactionSync — speiler smiley-reaksjonar til Supabase, slik at ALLE innlogga
// brukarar (iPhone, nettbrett, Android — kva som helst) ser reaksjonane på
// innlegg OG kommentarar, ikkje berre eininga som trykte. Gun
// (SC.NS.reactions) blir verande for sanntid/pling; dette laget er den varige,
// delte kjelda — same rolle som CommentSync gjer for kommentarane.
//
// Ein reaksjon er identifisert av (target_key, username): éin per bruker per
// mål. target_key er same nøkkel som elles i js/social.js:
//   'post:<id>' · 'profile:<user>' · 'c:<id>' (kommentar).
// val er reaksjonskoden: tal 1 / -1 (tommel opp/ned) eller streng
// ('angry'|'love'|'oops'|'wow'). val 0 = fjerna reaksjon → raden slettast.
//
// Same tryggleiksmodell som CommentSync/CommunitySync/ProfileSync: innlogging er
// klientside, så skriving er sikra med ein PER-BRUKAR hemmelegheit lagra lokalt,
// sjekka av SECURITY DEFINER-RPCane i
// supabase/migrations/0008_community_reactions.sql. Ein bruker kan berre skriva
// rada som er nøkla til sitt eige brukarnamn.
//
// Degraderer pent: er ikkje Supabase konfigurert (eller migrasjon 0008 ikkje
// køyrt) er ALT her no-ops, og reaksjonane fungerer som før (kun Gun/lokalt).
const ReactionSync = (() => {
  // Gjenbrukar same per-brukar-hemmelegheit som CommentSync/CommunitySync →
  // ein brukar har ÉN secret på tvers av innlegg, kommentarar OG reaksjonar.
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

  // Publiser/oppdater/fjern reaksjonen din. Fire-and-forget: feil logges, kaster
  // aldri. val 0 (eller falsy ikkje-streng) → be serveren om å fjerne rada.
  async function push(targetKey, username, val, ts) {
    if (!_enabled() || !targetKey || !username) return false;
    try {
      const { error } = await _client().rpc('upsert_reaction', {
        p_target:   targetKey,
        p_username: username,
        p_secret:   _secretFor(username),
        p_val:      (val === 0 || val == null) ? '' : String(val),
        p_ts:       Number(ts) || Date.now(),
      });
      if (error) { console.warn('[ReactionSync] push:', error.message); return false; }
      return true;
    } catch (e) { console.warn('[ReactionSync] push:', e.message || e); return false; }
  }

  // Hent siste reaksjonar frå sky (objekt-array, kvart med ._target, username,
  // val, ts). Tom liste ved feil/ikkje-konfigurert.
  async function list(limit = 2000) {
    if (!_enabled()) return [];
    try {
      const { data, error } = await _client().rpc('list_reactions', { p_limit: limit });
      if (error || !Array.isArray(data)) return [];
      return data;
    } catch (e) { return []; }
  }

  return { push, list, _enabled };
})();

if (typeof window !== 'undefined') window.ReactionSync = ReactionSync;
