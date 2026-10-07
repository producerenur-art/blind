// MusicSync — speiler DELTE musikkspor til en Supabase-tabell, slik at ALLE
// besøkende (ikke bare nettleseren som lastet opp) ser sporet i Discover.
//
// Hvorfor: "music"-postene bor i IndexedDB (js/db.js), og user.musicIds (som
// Discover bruker for å slå opp sporene) er en localStorage-liste som
// js/profilesync.js eksplisitt IKKE synker («lokale IndexedDB-blob-id-er som
// er ubrukelige hos andre»). Uten dette laget har INGEN andre besøkende
// noensinne sett et opplastet spor i Discover-griden, uansett cover/sjanger.
//
// Sikkerhet: samme mønster som ProfileSync — en PER-SPOR hemmelighet (delt med
// den eksisterende PER-BRUKER hemmeligheten i sc_profile_secrets, siden det er
// samme eier) sjekkes av en SECURITY DEFINER-RPC. Den offentlige anon-nøkkelen
// kan ikke røre tabellen direkte (se supabase/migrations/0036_music_tracks.sql).
//
// Degraderer pent: når Supabase ikke er konfigurert er alt her no-ops.
const MusicSync = (() => {
  const SECRETS_KEY = 'sc_profile_secrets';   // samme nøkkel som js/profilesync.js bruker

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

  // audioUrl/coverUrl må være ekte offentlige https-URL-er (satt av
  // SC_Storage-opplasting) — blob:/data:-URL-er er lokale og ubrukelige hos andre.
  function _httpUrl(u) { return (typeof u === 'string' && /^https:\/\//i.test(u)) ? u : null; }

  // Kun offentlige, cross-user-nyttige felt.
  function _publicData(username, track) {
    return {
      id:         track.id,
      username,
      title:      track.name || track.title || 'Untitled',
      artist:     track.artist || '',
      genre:      track.genre || 'electronic',
      duration:   track.duration || track.durationSec || 0,
      audioUrl:   _httpUrl(track.audioUrl),
      coverUrl:   _httpUrl(track.coverUrl),
      isMix:      !!track.isMix,
      uploadedAt: track.uploadedAt || track.createdAt || Date.now(),
      description: String(track.description || '').slice(0, 500),
      updatedAt:  track.updatedAt || track.uploadedAt || track.createdAt || Date.now(),
      // Profilbilde som reserve-forhåndsvisning (api/share.js) når sporet ikke har eget cover.
      avatarUrl:  _httpUrl((typeof Auth !== 'undefined' && Auth.getUser && (Auth.getUser(username) || {}).avatarUrl) || null),
    };
  }

  // Push (opprett/oppdater) ett delt spor. Fire-and-forget: feil logges, kaster aldri.
  async function push(username, track) {
    if (!_enabled() || !username || !track || !track.id) return;
    const data = _publicData(username, track);
    if (!data.audioUrl) return;   // ikke delt til sky ennå — ingenting andre kan bruke
    try {
      const { error } = await _client().rpc('upsert_music_track', {
        p_id: track.id, p_username: username, p_secret: _secretFor(username), p_data: data,
      });
      if (error) console.warn('[MusicSync] push feilet:', error.message);
    } catch (e) { console.warn('[MusicSync] push feilet:', e.message); }
  }

  async function remove(username, id) {
    if (!_enabled() || !username || !id) return;
    try {
      const { error } = await _client().rpc('delete_music_track', { p_id: id, p_secret: _secretFor(username) });
      if (error) console.warn('[MusicSync] delete feilet:', error.message);
    } catch (e) { console.warn('[MusicSync] delete feilet:', e.message); }
  }

  // Hent ALLE delte spor (for Discover). Returnerer [] stille ved feil/ikke konfigurert.
  async function pullAll() {
    if (!_enabled()) return [];
    try {
      const { data, error } = await _client().rpc('list_music_tracks');
      if (error || !Array.isArray(data)) return [];
      return data;
    } catch (e) { return []; }
  }

  return { push, remove, pullAll, _enabled };
})();

if (typeof window !== 'undefined') window.MusicSync = MusicSync;
