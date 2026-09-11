// LiveGlobal — automatisk global "eier går live"-overtaking. Kvar besøkende
// (innlogga ELLER anonym gjest), UANSETT kva 24/7-radiostasjon dei akkurat no
// høyrer på, skal automatisk høyre eigaren sin direktesending når han/ho går
// live (js/livemix.js sitt "Gå live"-panel), og automatisk tilbake til
// stasjonen sin igjen når sendingen stoppar. Ingen "trykk for å høre"-modal —
// dette er PÅKREVD åtferd, valt eksplisitt over ei opt-in-løysing.
//
// Overtek DET DELTE #audio-engine-elementet via js/radio.js sine
// enterLiveTakeover/attachLiveStream/exitLiveTakeover — ALDRI eit eige
// <audio>-element (det er nettopp det som ga den kjende dobbel-lyd-feilen i
// den manuelle "Hør live"-modalen, js/livemix.js sin tuneIn()/#ln-audio).
// #player-bar er eit søsken av <main id="app">, ikkje eit barn (index.html) —
// denne modulen (og radio.js) blir aldri fjerna av ruteren, så overtakinga
// overlever SPA-navigasjon automatisk, akkurat som vanlege stasjonar alt gjer.
//
// Sikkerheitsmodell: lesing er open for alle (også anonyme), skriving er RPC-
// gata bak ein delt eigar-hemmelegheit — sjå header i
// supabase/migrations/0022_live_broadcast.sql. Same "klientside-innlogging,
// ingen ekte Supabase Auth-sesjon"-modell som resten av appen.
//
// Degraderer heilt stille om Supabase ikkje er konfigurert, om
// livebroadcast.js/radio.js mangler, eller om RPC-en ikkje finst enno
// (migrasjonen ikkje køyrt) — appen fungerer akkurat som før då.
const LiveGlobal = (() => {
  // Rask nok til å føles som ei ekte overtaking, men same polling-idé som
  // resten av appen (LivePresence: 25s, SC sin Supabase-presence-poll: 15s).
  // Realtime-abonnementet under (om det får kontakt) gjer i praksis overtakinga
  // umiddelbar; denne pollen er berre sikkerheitsnettet.
  const POLL_MS = 6000;

  let _known    = null;   // siste kjente rad frå get_live_broadcast_status()
  let _listener = null;   // aktivt LiveBroadcast.listener()-handtak (om vi høyrer på no)
  let _pollTimer = null;

  function _enabled() {
    return (typeof SC_Storage !== 'undefined')
      && SC_Storage.isConfigured()
      && typeof SC_Storage.client === 'function'
      && typeof window.LiveBroadcast !== 'undefined'
      && typeof window.Radio !== 'undefined';
  }
  function _client() { return SC_Storage.client(); }

  async function _fetchStatus() {
    if (!_enabled()) return null;
    try {
      const { data, error } = await _client().rpc('get_live_broadcast_status');
      if (error || data == null) return null;
      // PostgREST returnerer eit array med éi rad for ein `returns table(...)`-RPC.
      const row = Array.isArray(data) ? data[0] : data;
      return row || null;
    } catch (e) { return null; }
  }

  // Eigaren si eiga sendande fane skal ALDRI sjølv koble seg til som lyttar på
  // sin eigen straum — det ville berre gitt ekko/dobbel lyd oppå DJ-konsollen.
  function _isBroadcastingHere() {
    return !!(window.LiveMix && typeof LiveMix.isBroadcastingHere === 'function' && LiveMix.isBroadcastingHere());
  }

  function _apply(status) {
    const isLive  = !!(status && status.is_live);
    const wasLive = !!(_known && _known.is_live);
    const prevRoom = _known && _known.room;
    _known = status || { is_live: false };

    if (_isBroadcastingHere()) return;   // følg med, men ikkje koble oss til vår eigen sending

    if (isLive && !wasLive) {
      _connect(_known);
    } else if (isLive && wasLive && _known.room !== prevRoom) {
      // Romnamnet endra seg midt i ei sending (bør ikkje skje i praksis) — koble om.
      _disconnect();
      _connect(_known);
    } else if (isLive && wasLive) {
      window.Radio?.setLivePresenterName?.(_known.presenter_name);
    } else if (!isLive && wasLive) {
      _disconnect();
    }
  }

  function _connect(status) {
    if (!window.Radio || !window.LiveBroadcast || !status || !status.room) return;
    Radio.enterLiveTakeover(status.presenter_name || '');
    try {
      _listener = LiveBroadcast.listener(status.room, {
        onTrack: stream => { window.Radio?.attachLiveStream?.(stream); },
        onState: () => { /* spelaren viser alt LIVE-merket — ingen eigen UI trengst her */ },
        onLog:   () => {},
      });
    } catch (e) {
      console.warn('[LiveGlobal] kunne ikke koble til direktesendingen:', e.message || e);
    }
  }

  function _disconnect() {
    if (_listener) { try { _listener.leave(); } catch (e) {} _listener = null; }
    if (window.Radio?.isLiveTakeoverActive?.()) Radio.exitLiveTakeover();
  }

  async function _poll() {
    const status = await _fetchStatus();
    if (status) _apply(status);
  }

  // Beste innsats: umiddelbar push via Supabase Realtime. Krev at
  // live_broadcast_status er lagt til i publikasjonen (0022-migrasjonen gjør
  // dette) — feiler det stille, degraderer vi rett og slett til polling åleine
  // (POLL_MS over), som uansett er den garanterte veien.
  function _subscribeRealtime() {
    try {
      _client()
        .channel('live_broadcast_status_rt')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'live_broadcast_status' },
          payload => { if (payload && payload.new) _apply(payload.new); })
        .subscribe();
    } catch (e) { /* degraderer stille til polling åleine */ }
  }

  async function init() {
    if (!_enabled()) return;
    await _poll();             // dekk besøkende som opnar sida mens det alt er live
    _subscribeRealtime();
    _pollTimer = setInterval(_poll, POLL_MS);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) _poll(); });
  }

  return { init };
})();
window.LiveGlobal = LiveGlobal;

if (document.readyState === 'loading')
  document.addEventListener('DOMContentLoaded', () => LiveGlobal.init());
else
  LiveGlobal.init();
