// ProfileSync — speiler OFFENTLIGE profildata til en Supabase-tabell, slik at ALLE
// besøkende (ikke bare nettleseren som lagde profilen) ser en profil, inkl. banner.
//
// Hvorfor: Auth lagrer brukere kun i localStorage (pv_users). Uten dette laget ser
// ingen andre profilen din. Her publiserer eieren sin egen profil til sky, og
// besøkende henter den ned før profilen vises.
//
// Sikkerhet: appens innlogging er ren klientside, så databasen kan ikke vite hvem
// som skriver. Skriving er derfor sikret med en PER-PROFIL hemmelighet (lagret
// lokalt hos eieren) som sjekkes av en SECURITY DEFINER-RPC. Den offentlige
// anon-nøkkelen kan ikke røre tabellen direkte — kun via RPC-ene
// (se supabase/migrations/0002_profiles.sql).
//
// Degraderer pent: når Supabase ikke er konfigurert (SC_Storage.isConfigured()
// === false) er ALT her no-ops og appen virker akkurat som før (kun lokalt).
const ProfileSync = (() => {
  const SECRETS_KEY = 'sc_profile_secrets';   // { username: secret } i localStorage

  // Kun presentasjons-/offentlige felt synces. Bevisst UTELATT: password, email,
  // activationToken/resetToken (hemmelig), avatarMediaId/musicIds/mixIds/mediaIds
  // (lokale IndexedDB-blob-id-er som er ubrukelige hos andre), friendRequests.
  const PUBLIC_FIELDS = [
    'username', 'displayName', 'bio', 'role', 'theme',
    'bannerUrl', 'bannerPath', 'links', 'favoriteRadio',
    'platforms', 'sites', 'mySites', 'festivals', 'events', 'broadcasts',
    'profileVisibility', 'createdAt',
  ];

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
  // Stabil per-profil hemmelighet: laget ÉN gang, gjenbrukt for alle senere skriv.
  function _secretFor(username) {
    const s = _secrets();
    if (!s[username]) { s[username] = _rand(); localStorage.setItem(SECRETS_KEY, JSON.stringify(s)); }
    return s[username];
  }

  function _publicData(user) {
    const o = {};
    for (const k of PUBLIC_FIELDS) {
      if (user[k] !== undefined && user[k] !== null) o[k] = user[k];
    }
    o.username = user.username;   // alltid med (primærnøkkel)
    return o;
  }

  // Publiser eierens egen profil. Fire-and-forget: feil logges, kaster aldri.
  async function push(user) {
    if (!_enabled() || !user || !user.username) return false;
    try {
      const { error } = await _client().rpc('upsert_profile', {
        p_username: user.username,
        p_secret:   _secretFor(user.username),
        p_data:     _publicData(user),
      });
      if (error) { console.warn('[ProfileSync] push:', error.message); return false; }
      return true;
    } catch (e) { console.warn('[ProfileSync] push:', e.message || e); return false; }
  }

  // Hent én offentlig profil fra sky. Returnerer datasettet (objekt) eller null.
  async function fetch(username) {
    if (!_enabled() || !username) return null;
    try {
      const { data, error } = await _client().rpc('get_profile', { p_username: username });
      if (error || !data) return null;
      return data;
    } catch (e) { return null; }
  }

  // Hent + flett en profil inn i den lokale brukerlista, så Auth.getUser /
  // renderView ser ANDRE brukeres profiler. Returnerer datasettet eller null.
  async function pull(username) {
    const data = await fetch(username);
    if (!data) return null;
    if (typeof Auth !== 'undefined' && Auth.cacheRemoteProfile) Auth.cacheRemoteProfile(username, data);
    return data;
  }

  // Hent ALLE offentlige profiler (for Discover/utforsk) og flett dem inn lokalt.
  async function pullAll() {
    if (!_enabled()) return [];
    try {
      const { data, error } = await _client().rpc('list_profiles');
      if (error || !Array.isArray(data)) return [];
      if (typeof Auth !== 'undefined' && Auth.cacheRemoteProfile) {
        for (const p of data) if (p && p.username) Auth.cacheRemoteProfile(p.username, p);
      }
      return data;
    } catch (e) { return []; }
  }

  return { push, fetch, pull, pullAll, _enabled, _publicData };
})();

if (typeof window !== 'undefined') window.ProfileSync = ProfileSync;
