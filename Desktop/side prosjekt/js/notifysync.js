// NotifySync — speiler varsler (js/notify.js) via api/notify.js, same rolle
// som DmSync har for privatmeldingar. Gun (SC.NS.notif) er framleis
// sanntids-forsøket, men leverer IKKJE pålitelig mellom to ULIKE nettlesarar
// (sjå minne soundcore-gun-relay-browser-sync) — polling herifrå er den
// faktisk pålitelige transporten. Sjå api/notify.js og
// supabase/migrations/0018_notifications.sql for autorisasjonsmodellen
// (skriving: berre bevis på KVEN du er; lesing: berre din eigen innboks).
//
// Degraderer pent: manglar Auth/sessionToken er ALT her no-ops, og varsling
// fungerer som før (kun Gun/lokalt).
const NotifySync = (() => {
  function _token() {
    const me = (typeof Auth !== 'undefined') ? Auth.current() : null;
    return me && me.sessionToken ? me.sessionToken : null;
  }

  async function _call(action, payload) {
    const sessionToken = _token();
    if (!sessionToken) return null;
    try {
      const res = await fetch('/api/notify', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action, sessionToken, ...payload }),
      });
      if (res.status === 404 || res.status === 503) return null;
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { console.warn('[NotifySync]', action, data.error || res.status); return null; }
      return data;
    } catch (e) { console.warn('[NotifySync]', action, e.message || e); return null; }
  }

  // Send eit varsel til éin ELLER fleire mottakarar (to: string | string[]) i
  // eitt samla kall — viktig for notifyAll/notifyFriends, som elles ville gjort
  // eitt HTTP-kall per mottakar. Fire-and-forget: feil logges, kaster aldri.
  async function push(to, payload) {
    if (!to || !payload || !payload.text) return false;
    const data = await _call('send', {
      to, id: payload.id, from: payload.from, fromDisplay: payload.fromDisplay,
      type: payload.type, text: payload.text, link: payload.link, ts: payload.ts,
    });
    return !!(data && data.success);
  }

  // Hent siste varsler i EIGEN innboks. Tom liste ved feil/ikkje pålogga.
  async function list(limit = 60) {
    const data = await _call('list', { limit });
    return (data && Array.isArray(data.notifications)) ? data.notifications : [];
  }

  return { push, list, _enabled: () => !!_token() };
})();

if (typeof window !== 'undefined') window.NotifySync = NotifySync;
