// DmSync — speiler venne-DM (js/friendchat.js) via api/dm.js, same rolle som
// ChatSync/CommentSync har for radio-chat/kommentarar. Gun (SC.NS.dm/group) er
// framleis sanntids-forsøket, men leverer IKKJE pålitelig mellom to ULIKE
// nettlesarar (sjå minne soundcore-gun-relay-browser-sync) — polling herifrå
// er den faktisk pålitelige transporten.
//
// I MOTSETNING til ChatSync/CommentSync (opent innhald, ingen eigarskaps-
// sjekk) er DM PRIVAT: kvart kall sender med sessionToken (sett på brukaren
// ved innlogging, sjå js/auth.js adoptServerUser) som api/dm.js verifiserer
// server-side FØR nokon melding vert lest/skrive — sjå api/dm.js og
// supabase/migrations/0016_direct_messages.sql for kvifor dette IKKJE går
// direkte mot Supabase slik dei opne synk-laga gjer.
//
// Degraderer pent: manglar Auth/sessionToken (ikkje innlogga enno, eller
// innlogga før denne funksjonen fanst — må logge inn på nytt éin gong for å
// få eit token) er ALT her no-ops, og DM fungerer som før (kun Gun/lokalt).
const DmSync = (() => {
  function _token() {
    const me = (typeof Auth !== 'undefined') ? Auth.current() : null;
    return me && me.sessionToken ? me.sessionToken : null;
  }

  // 'ok' | 'no-token' (aldri fekk token) | 'expired' (server avviste tokenet).
  // Utan dette feila DM TAUST: ingen meldingar vist, ingen varsel, ingen feilmelding.
  let _expired = false;
  function status() {
    if (!_token()) return 'no-token';
    return _expired ? 'expired' : 'ok';
  }

  // Server sender eit fornya token når det er halvvegs mot utløp — lagre det
  // slik at brukaren aldri må logge inn på nytt for å få DM tilbake.
  function _adoptFresh(tok) {
    const me = (typeof Auth !== 'undefined') ? Auth.current() : null;
    if (!tok || !me || tok === me.sessionToken) return;
    try { Auth.adoptServerUser({ username: me.username, sessionToken: tok }); } catch (_) {}
  }

  async function _call(action, payload) {
    const sessionToken = _token();
    if (!sessionToken) return null;
    try {
      const res = await fetch('/api/dm', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action, sessionToken, ...payload }),
      });
      if (res.status === 404 || res.status === 503) return null; // ikkje sett opp / lokal utvikling
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) { _expired = true; console.warn('[DmSync]', action, 'sesjon utløpt'); return null; }
      if (!res.ok) { console.warn('[DmSync]', action, data.error || res.status); return null; }
      _expired = false;
      if (data.sessionToken) _adoptFresh(data.sessionToken);
      return data;
    } catch (e) { console.warn('[DmSync]', action, e.message || e); return null; }
  }

  // Send éi melding. Fire-and-forget: feil logges, kaster aldri.
  async function push(channel, msg) {
    if (!channel || !msg || !msg.text) return false;
    const data = await _call('send', {
      channel, id: msg.id, from: msg.from, fromDisplay: msg.fromDisplay,
      to: msg.to, text: msg.text, ts: msg.ts, kind: msg.kind,
    });
    return !!(data && data.success);
  }

  // Hent siste meldingar i ein kanal. Tom liste ved feil/ikkje pålogga.
  // Returnerer arrayet direkte (bakoverkompatibelt med eksisterande kallarar);
  // arrayet har òg ein ._otherRead-eigenskap (ts, 0 om ukjend/'group') for
  // «Read»/«Sent»-statusen, sjå listWithMeta() for full tilgang.
  async function list(channel, limit = 200) {
    if (!channel) return [];
    const data = await _call('list', { channel, limit });
    const msgs = (data && Array.isArray(data.messages)) ? data.messages : [];
    try { msgs._otherRead = (data && data.otherRead) || 0; } catch (_) {}
    return msgs;
  }

  // Rediger/slett EIGEN melding (server sjekkar from_user === deg sjølv).
  async function edit(channel, id, text) {
    const data = await _call('edit', { channel, id, text });
    return !!(data && data.success);
  }
  async function remove(channel, id) {
    const data = await _call('delete', { channel, id });
    return !!(data && data.success);
  }

  // Toggle éin brukar sin reaksjon (👍 ❤️ 😂 😮 😢 🔥) på ei melding. Returnerer
  // den oppdaterte reactions-mapen frå serveren (kjelda me stolar på), eller
  // null om kallet feila (klienten har alt oppdatert optimistisk lokalt).
  async function react(channel, id, emoji) {
    const data = await _call('react', { channel, id, emoji });
    return (data && data.success) ? (data.reactions || {}) : null;
  }

  // Marker kanalen som lest AV MEG t.o.m. no — driv motparten sin «Read»-status.
  // Kall KUN når ein samtale faktisk er open/vist, aldri frå bakgrunnspolling.
  async function markRead(channel) {
    const data = await _call('markRead', { channel, ts: Date.now() });
    return !!(data && data.success);
  }

  return { push, list, edit, remove, react, markRead, status, _enabled: () => !!_token() };
})();

if (typeof window !== 'undefined') window.DmSync = DmSync;
