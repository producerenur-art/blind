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
      if (!res.ok) { console.warn('[DmSync]', action, data.error || res.status); return null; }
      return data;
    } catch (e) { console.warn('[DmSync]', action, e.message || e); return null; }
  }

  // Send éi melding. Fire-and-forget: feil logges, kaster aldri.
  async function push(channel, msg) {
    if (!channel || !msg || !msg.text) return false;
    const data = await _call('send', {
      channel, id: msg.id, from: msg.from, fromDisplay: msg.fromDisplay,
      to: msg.to, text: msg.text, ts: msg.ts,
    });
    return !!(data && data.success);
  }

  // Hent siste meldingar i ein kanal. Tom liste ved feil/ikkje pålogga.
  async function list(channel, limit = 200) {
    if (!channel) return [];
    const data = await _call('list', { channel, limit });
    return (data && Array.isArray(data.messages)) ? data.messages : [];
  }

  return { push, list, _enabled: () => !!_token() };
})();

if (typeof window !== 'undefined') window.DmSync = DmSync;
