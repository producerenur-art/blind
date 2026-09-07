// SiriusFM — sanntid besøkstelling (LivePresence)
//
// Server-side heartbeat mot Supabase: HVER besøkende (også anonyme/utloggede)
// pinger presence_ping() ~hvert 25s. presence_count() gir antall aktive siste 45s.
// Se supabase/migrations/0011_live_presence.sql.
//
// Skiller seg fra OnlineWidget (js/onlineWidget.js): den er Gun/P2P og teller KUN
// innloggede — dette fanger også gjester og er pålitelig (ingen relay-avhengighet).
//
// Tallet vises KUN for admin (brukernavn i CONFIG.ADMIN_USERS). Alle bidrar til
// heartbeaten, men bare admin ser pillen. Degraderer pent: er ikke Supabase
// konfigurert, er alt her no-ops.
const LivePresence = (() => {
  const PING_MS = 25000;          // heartbeat-intervall (må matche 45s-vindu i SQL)
  const POLL_MS = 20000;          // hvor ofte admin-visningen oppdateres
  const IDKEY   = 'sc_visitor_id';

  let _id = null, _pingTimer = null, _pollTimer = null, _pill = null;

  function _enabled() {
    return (typeof SC_Storage !== 'undefined')
      && SC_Storage.isConfigured()
      && typeof SC_Storage.client === 'function';
  }
  function _client() { return SC_Storage.client(); }

  // Én åpen økt/fane = én besøkende. sessionStorage → ny fane teller separat,
  // men refresh av samme fane beholder id-en (unngår oppblåst tall).
  function _visitorId() {
    if (_id) return _id;
    try {
      let v = sessionStorage.getItem(IDKEY);
      if (!v) {
        v = (typeof crypto !== 'undefined' && crypto.randomUUID)
          ? crypto.randomUUID().replace(/-/g, '')
          : `${Date.now()}${Math.random().toString(36).slice(2)}`;
        sessionStorage.setItem(IDKEY, v);
      }
      _id = v;
    } catch {
      _id = `${Date.now()}${Math.random().toString(36).slice(2)}`;
    }
    return _id;
  }

  async function _ping() {
    if (!_enabled() || document.hidden) return;   // ikke tell bakgrunnsfaner
    // Brukarnamn (om innlogga) sendast no òg med — brukt av
    // presence_online_usernames() (0017) til den offentlege "hvem er
    // online"-lista i js/realtime.js, som elles berre hadde upåliteleg
    // Gun-presence å gå etter (sjå minne soundcore-gun-relay-browser-sync).
    const me = (window.Auth && Auth.current && Auth.current()) ? Auth.current() : null;
    try { await _client().rpc('presence_ping', { p_id: _visitorId(), p_username: me ? me.username : null }); }
    catch { /* fire-and-forget: heartbeat feiler stille */ }
  }

  async function _count() {
    if (!_enabled()) return null;
    try {
      const { data, error } = await _client().rpc('presence_count');
      if (error) return null;
      return typeof data === 'number' ? data : null;
    } catch { return null; }
  }

  // ── Admin-visning ───────────────────────────────────────────────────────
  function _isAdmin() {
    const me = (window.Auth && Auth.current && Auth.current()) ? Auth.current() : null;
    if (!me) return false;
    const admins = (window.CONFIG && Array.isArray(CONFIG.ADMIN_USERS)) ? CONFIG.ADMIN_USERS : [];
    return admins.some(u => String(u).toLowerCase() === String(me.username).toLowerCase());
  }

  function _mountPill() {
    if (_pill || !_isAdmin()) return;
    _pill = document.createElement('button');
    _pill.id = 'visitors-pill';
    _pill.className = 'online-pill visitors-pill';
    _pill.type = 'button';
    _pill.title = 'Besøkende på siden akkurat nå, inkl. gjester — kun synlig for admin';
    _pill.setAttribute('aria-label', 'Besøkende på siden akkurat nå');
    _pill.innerHTML =
      '<span class="visitors-eye" aria-hidden="true">👁</span>' +
      '<span class="online-pill-num visitors-num">–</span>' +
      '<span class="online-pill-label">on site</span>';
    // Monter som SØSKEN av #nav-links (samme mønster som OnlineWidget) → knappen
    // overlever renderNav som bygger #nav-links på nytt.
    const nav   = document.getElementById('main-nav');
    const links = document.getElementById('nav-links');
    if (nav && links) nav.insertBefore(_pill, links);
    else if (nav)     nav.appendChild(_pill);
    else              document.body.appendChild(_pill);
  }

  function _removePill() {
    if (_pill) { _pill.remove(); _pill = null; }
  }

  async function _refreshPill() {
    if (!_isAdmin()) { _removePill(); return; }   // logget ut / ikke admin → skjul
    _mountPill();
    const n = await _count();
    if (_pill) {
      const num = _pill.querySelector('.visitors-num');
      if (num) num.textContent = (n == null ? '–' : String(n));
    }
  }

  function init() {
    if (!_enabled()) return;
    _ping();
    _pingTimer = setInterval(_ping, PING_MS);
    // Ping straks en skjult fane blir synlig igjen (intervallet kan ha stått i ro).
    document.addEventListener('visibilitychange', () => { if (!document.hidden) _ping(); });

    // Admin-visning: bygg + poll. Innlogging/utlogging fanges av hashchange (rutebytte)
    // og av den periodiske pollen.
    _refreshPill();
    _pollTimer = setInterval(_refreshPill, POLL_MS);
    window.addEventListener('hashchange', _refreshPill);
  }

  return { init, count: _count };
})();
window.LivePresence = LivePresence;

if (document.readyState === 'loading')
  document.addEventListener('DOMContentLoaded', () => LivePresence.init());
else
  LivePresence.init();
