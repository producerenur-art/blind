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

  // Kort nettverksglipp (WebRTC/Realtime-fall) → is_live tikkar false så true
  // att i løpet av sekund/minutt, same rom. Utan denne vernet spelte
  // intro-jingelen + namneannonsen av på nytt for ALLE lyttarar kvar gong —
  // høyrest ut som ei ny, uventa stemme midt i sendinga (rapportert
  // 2026-09-18). Kjem statusen tilbake INNAN cooldown-vindauget og romnamnet
  // er uendra, koblar vi berre stille til att, ingen ny annonsering.
  const RECONNECT_COOLDOWN_MS = 120000; // 2 min — juster her ved behov
  let _lastRoom = null;
  let _lastDisconnectAt = 0;

  // Hjarteslag-vern: js/livemix.js sin bcGo() re-publiserer is_live=true kvar
  // 45. sekund mens ei sending faktisk pågår (oppdaterer updated_at-kolonna).
  // Krasjar/lukkast avsendarens fane utan at bcStop() rekk å køyre, sluttar
  // hjarteslaget — og is_live=true ELLES sete fast for alltid i databasen
  // (ingen server-side utløp). Er updated_at eldre enn dette vindauget,
  // reknar vi statusen som FORELDA og behandlar det som ikkje-live, same kva
  // is_live-kolonna faktisk seier. Rapportert 2026-09-19: is_live stod fast
  // frå kvelden før, blokkerte normal radio for ALLE i 13+ timar (sjå
  // js/radio.js sitt live-vern i _playUrl). Krev migrasjon 0028 (updated_at
  // eksponert via get_live_broadcast_status()) — degraderer trygt til
  // "alltid fersk" viss RPC-en enno ikkje returnerer feltet.
  const STALE_MS = 150000; // 2,5 min — litt over heartbeat-intervallet i livemix.js
  function _isStale(status) {
    if (!status || !status.updated_at) return false; // gammal RPC utan feltet — ikkje bryt noko
    const age = Date.now() - new Date(status.updated_at).getTime();
    return age > STALE_MS;
  }

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

  // Ei ANNAN fane i same nettlesar sender live (js/livemix.js sett flagget). Denne fana skal då ikkje ta over
  // lyden heller: ho speler til same utgang (BlackHole) og ville lekka jingelar/radio inn i sendinga → ekko.
  function _djOnOtherTab() {
    try {
      const ts = Number(localStorage.getItem('sfm_dj_live'));
      return !!ts && (Date.now() - ts) < 120000 && !_isBroadcastingHere();
    } catch (e) { return false; }
  }

  function _apply(status) {
    const isLive  = !!(status && status.is_live) && !_isStale(status);
    const wasLive = !!(_known && _known.is_live);
    const prevRoom = _known && _known.room;
    _known = status || { is_live: false };

    if (_isBroadcastingHere() || _djOnOtherTab()) {
      // Sjølv-ekko-vernet under betyr denne fana ALDRI kallar enterLiveTakeover
      // (den ville kobla vår eigen innkomande straum attende i høgtalarane) —
      // men utan noko anna steg pausar aldri fana sin EIGEN radio, og han
      // spelar vidare gjennom heile sendinga, usynkronisert med det som
      // faktisk går live (rapportert 2026-09-21). Pausar berre det som alt
      // spelte i det NØYAKTIGE augeblikket sendinga startar (eller ved
      // sideoppfriskning midt i ei alt pågåande sending — isLive er då sann
      // frå fyrste poll, wasLive framleis usann).
      if (isLive && !wasLive) { try { window.Radio?.pauseForOwnBroadcast?.(); } catch (e) {} }
      return;   // følg med, men ikkje koble oss til vår eigen sending
    }

    // «24-Hour Cycle»-kortet (js/radio247.js) sin «Now:»-linje skal vise
    // presentatøren mens live pågår, sjangeren elles — oppdater med det same
    // ved kvar av/på-overgang i staden for å vente på neste naturlege
    // ompteikning.
    if (isLive !== wasLive) { try { window.Radio247?.refresh?.(); } catch (e) {} }

    if (isLive && !wasLive) {
      const quickReconnect = !!_lastRoom && _lastRoom === _known.room
        && (Date.now() - _lastDisconnectAt) < RECONNECT_COOLDOWN_MS;
      _connect(_known, quickReconnect);
    } else if (isLive && wasLive && _known.room !== prevRoom) {
      // Romnamnet endra seg midt i ei sending (bør ikkje skje i praksis) — koble om.
      _disconnect();
      _connect(_known);
    } else if (isLive && wasLive) {
      window.Radio?.setLivePresenterName?.(_known.presenter_name);
      window.Radio?.setLiveTrackTitle?.(_known.track_title || '');
      window.Radio?.setLiveLinkUrl?.(_known.link_url || '');
    } else if (!isLive && wasLive) {
      _disconnect();
    }
  }

  function _connect(status, skipAnnouncement) {
    if (!window.Radio || !window.LiveBroadcast || !status || !status.room) return;
    // Rydd opp ei eventuell hengande gammal lytter-tilkobling FØR ei ny
    // opprettast — elles kunne to WebRTC-lytterar til same rom (og dermed to
    // parallelle lydspor inn) byggje seg opp stille over fleire hendingar.
    if (_listener) { try { _listener.leave(); } catch (e) {} _listener = null; }
    _lastRoom = status.room;
    Radio.enterLiveTakeover(status.presenter_name || '', !!skipAnnouncement);
    Radio.setLiveTrackTitle?.(status.track_title || '');
    Radio.setLiveLinkUrl?.(status.link_url || '');
    _spawnListener(status.room);
  }

  // Vern mot dobbel gjenoppkobling om onState skulle fyre fleire gonger på rad.
  let _reconnecting = false;

  function _spawnListener(room) {
    try {
      _listener = LiveBroadcast.listener(room, {
        onTrack: stream => { window.Radio?.attachLiveStream?.(stream); },
        // Lyttarens EIGEN WebRTC-tilkobling kan døy av eit kort nettverksglipp
        // på DENNE eininga (ikkje DJ-en sin feil) — DJ-sida (js/livebroadcast.js
        // sin broadcaster()) lukker og gløymer den peer-tilkoblinga med det
        // same den ser 'disconnected'/'failed'/'closed', og kjem aldri av seg
        // sjølv attende. Utan denne gjenoppkoblinga sat lyttaren att med stille
        // lyd resten av sendinga, sjølv om DJ/artist framleis sender (is_live
        // framleis true) — opplevd som at sendinga "stoppa uanmeldt" (rapportert
        // 2026-09-20). Er statusen framleis fersk og live, byggjer vi berre ein
        // heilt ny lytter (sender 'hello' på nytt) — stille, ingen ny annonsering.
        onState: s => {
          if (!['failed', 'disconnected', 'closed'].includes(s)) return;
          if (_reconnecting || !_known || !_known.is_live || _isStale(_known)) return;
          _reconnecting = true;
          if (_listener) { try { _listener.leave(); } catch (e) {} _listener = null; }
          setTimeout(() => {
            _reconnecting = false;
            if (_known && _known.is_live && !_isStale(_known)) _spawnListener(room);
          }, 1500);
        },
        onLog: () => {},
      });
    } catch (e) {
      console.warn('[LiveGlobal] kunne ikke koble til direktesendingen:', e.message || e);
    }
  }

  function _disconnect() {
    if (_listener) { try { _listener.leave(); } catch (e) {} _listener = null; }
    if (window.Radio?.isLiveTakeoverActive?.()) Radio.exitLiveTakeover();
    _lastDisconnectAt = Date.now();
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

  let _initDone = false; // vern mot at init() ved eit uhell køyrer meir enn éin gong
                          // i same fane (ville gitt DOBLE realtime-abonnement → same
                          // status-hending trigga _apply() to gongar → jingelen kunne
                          // startast på nytt oppå seg sjølv, verre for kvar gong).
  async function init() {
    if (_initDone) return;
    if (!_enabled()) return;
    _initDone = true;
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
