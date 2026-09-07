// SC — delt sanntidslag (Gun.js) + lydvarsel + nærvær (presence)
// Eitt felles Gun-objekt som venne-chat, varslingar og community-vegg byggjer på.
// Same relay-peers som radio-chatten (js/chat.js).
const SC = (() => {

  // ── Gun.js (delt instans) ─────────────────────────────────────────────
  // Verifiserte oppe 2026-06-28 (funksjonell relay-test). Døde legacy-peers
  // (gun-manhattan.herokuapp.com, peer.wallie.io) fjerna — laga konsollstøy.
  const GUN_PEERS = [
    'https://relay.peer.ooo/gun',              // ✓ browser-verifisert oppe
    'https://gun.defucc.me/gun',               // ✓ browser-verifisert oppe
  ];

  // Namespace-nøklar (v1). Alt P2P — ingen serverless-funksjon.
  const NS = {
    dm:        'sc_dm_v1',        // 1:1 vennechat    → .get(channelKey(a,b))
    group:     'sc_group_v1',     // felles lounge    → .get('messages')
    posts:     'sc_posts_v1',     // status/community → .get('posts')
    notif:     'sc_notif_v1',     // per-mottakar     → .get(username)
    presence:  'sc_presence_v1',  // online-heartbeat → .get(username)
    comments:  'sc_comments_v1',  // kommentarar      → .get(targetKey) (post:<id> | profile:<user>)
    reactions: 'sc_reactions_v1', // 👍/👎            → .get(targetKey).get(username) = {val,ts}
    groups:    'sc_groups_v1',    // grupper (metadata) → .get('groups')
    gposts:    'sc_gposts_v1',    // gruppe-innlegg     → .get('gposts') (bærer groupId)
  };

  let _gun = null;
  function gun() {
    if (_gun) return _gun;
    if (typeof Gun === 'undefined') { console.warn('[SC] Gun.js ikke lastet'); return null; }
    try { _gun = Gun({ peers: GUN_PEERS, localStorage: false }); }
    catch (e) { console.warn('[SC] Gun-init feila', e); _gun = null; }
    return _gun;
  }

  // Sorter to brukarnamn → stabil kanal-nøkkel for 1:1 (som dj.js pmChannelKey)
  function channelKey(a, b) { return [String(a), String(b)].sort().join('__'); }

  // Abonner på ei Gun-liste via .map().on() med de-dup per Gun-nøkkel.
  function sub(ref, cb) {
    if (!ref || typeof ref.map !== 'function') return;
    const seen = new Set();
    ref.map().on((data, key) => {
      if (!data || seen.has(key)) return;
      seen.add(key);
      cb(data, key);
    });
  }

  // ── Lydvarsel (WebAudio-oscillator — ingen lydfil) ────────────────────
  let _actx = null;
  function audioCtx() {
    if (_actx) return _actx;
    try { _actx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch { _actx = null; }
    return _actx;
  }
  function soundOn()      { return localStorage.getItem('pv_sound_on') !== '0'; }
  function setSound(on)   { localStorage.setItem('pv_sound_on', on ? '1' : '0'); }
  function toggleSound()  { const v = !soundOn(); setSound(v); return v; }

  // kind: 'message' (lågare to-tone) | 'notif' (lysare to-tone)
  function playDing(kind) {
    if (!soundOn()) return;
    const ctx = audioCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    const now   = ctx.currentTime;
    const freqs = kind === 'message' ? [587.33, 880] : [880, 1174.66];
    freqs.forEach((f, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = f;
      const t = now + i * 0.11;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.22, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.26);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(t); osc.stop(t + 0.3);
    });
  }

  // AudioContext må låsast opp av ein brukargest (autoplay-policy).
  function _unlock() {
    const ctx = audioCtx();
    if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    window.removeEventListener('pointerdown', _unlock);
    window.removeEventListener('keydown', _unlock);
  }
  window.addEventListener('pointerdown', _unlock);
  window.addEventListener('keydown', _unlock);

  // ── Nærvær (presence) — lett heartbeat over Gun ───────────────────────
  const _presence = {};            // username → ts (siste heartbeat)
  const _status   = {};            // username → valt status ('online'|'away'|'sleeping'|'offline')
  let _meUser = null;              // innlogga brukar (for eiga status-lagring)
  let _presenceStarted = false;
  let _presenceSubbed  = false;
  let _beatTimer = null;
  const _presenceCbs = [];         // lyttarar som blir varsla når online-lista endrar seg
  const PRESENCE_TTL = 70000;      // ein brukar er «online» i 70s etter siste heartbeat

  // Gyldige status-val. Brukaren kan sjølv velje kva profilen viser — óg «online»
  // sjølv om nettlesaren skulle vere i bakgrunnen. «offline» = usynleg / frakobla.
  const STATUS_VALID = ['online', 'away', 'sleeping', 'offline'];

  // Kva status har eg valt (per eining, localStorage). Standard = 'online'.
  function myStatus() {
    if (!_meUser) return 'online';
    const s = localStorage.getItem('pv_status_' + _meUser);
    return STATUS_VALID.includes(s) ? s : 'online';
  }
  // Sett mi eiga status → lagra lokalt + kringkast med ein gong via heartbeat.
  function setStatus(status) {
    if (!STATUS_VALID.includes(status)) return;
    if (!_meUser) { const u = (window.Auth && Auth.current && Auth.current()); _meUser = u ? u.username : _meUser; }
    if (!_meUser) return;
    localStorage.setItem('pv_status_' + _meUser, status);
    _status[_meUser] = status;
    const g = gun();
    if (g) { try { g.get(NS.presence).get(_meUser).put({ ts: Date.now(), status }); } catch {} }
    _presence[_meUser] = Date.now();
    _emitPresence();
  }
  // Kva status skal VISAST for ein brukar. Ingen ferske heartbeats → 'offline'.
  function statusOf(username) {
    if (!isOnline(username)) return 'offline';
    const s = _status[username];
    return STATUS_VALID.includes(s) ? s : 'online';
  }

  function _emitPresence() {
    const list = onlineList();
    _presenceCbs.forEach(fn => { try { fn(list); } catch {} });
  }

  // Abonner (read-only) på online-heartbeats. Trengst for å VISE talet — óg for
  // utlogga vitjande som ikkje sjølv sender heartbeat. Idempotent.
  function subscribePresence() {
    const g = gun();
    if (g && !_presenceSubbed) {
      _presenceSubbed = true;
      g.get(NS.presence).map().on((d, k) => {
        if (d && d.ts) {
          _presence[k] = d.ts;
          if (d.status && STATUS_VALID.includes(d.status)) _status[k] = d.status;
          _emitPresence();
        }
      });
    }
    _startSupabasePresencePoll();
  }

  // Gun sine offentlege relear leverer IKKJE pålitelig mellom to ULIKE
  // nettlesarar (sjå minne soundcore-gun-relay-browser-sync) — den offentlege
  // "kven er online"-lista (js/onlineWidget.js) synte difor truleg feil/
  // ufullstendig liste for besøkande på tvers av nettlesarar heile tida.
  // Denne pollen gjenbruker LivePresence sin allereie pålitelige heartbeat
  // (js/livePresence.js → presence_ping, no med valfritt brukarnamn — sjå
  // migrasjon 0017) som ei ANDRE, faktisk pålitelig kjelde ved sida av Gun-
  // forsøket — same mønster som ChatSync/DmSync. Fyller berre inn _presence/
  // _emitPresence, ingen endring av offentleg API, så OnlineWidget treng
  // ingen kodeendring.
  let _sbPresencePolling = false;
  function _startSupabasePresencePoll() {
    if (_sbPresencePolling) return;
    if (typeof SC_Storage === 'undefined' || !SC_Storage.isConfigured || !SC_Storage.isConfigured()) return;
    _sbPresencePolling = true;
    const poll = async () => {
      try {
        const { data, error } = await SC_Storage.client().rpc('presence_online_usernames');
        if (!error && Array.isArray(data)) {
          const now = Date.now();
          data.forEach(u => { if (u) _presence[u] = now; });
          _emitPresence();
        }
      } catch (_) { /* fire-and-forget: degraderer til Gun-forsøket åleine */ }
    };
    poll();
    setInterval(poll, 15000);
  }

  function startPresence(username) {
    const g = gun();
    if (!g) return;
    if (username) _meUser = username;
    subscribePresence();
    if (username && !_presenceStarted) {
      _presenceStarted = true;
      const beat = () => {
        try {
          const st = myStatus();
          g.get(NS.presence).get(username).put({ ts: Date.now(), status: st });
          _presence[username] = Date.now();
          _status[username]   = st;
          _emitPresence();
        } catch {}
      };
      beat();
      _beatTimer = setInterval(beat, 25000);
      document.addEventListener('visibilitychange', () => { if (!document.hidden) beat(); });
    }
  }
  function isOnline(username) {
    const ts = _presence[username] || 0;
    return ts > 0 && (Date.now() - ts) < PRESENCE_TTL;
  }
  // Sortert liste over brukarnamn som er online no (ferske heartbeats).
  function onlineList() {
    const now = Date.now();
    return Object.keys(_presence)
      .filter(u => _presence[u] && (now - _presence[u]) < PRESENCE_TTL)
      .filter(u => _status[u] !== 'offline')   // brukarar som valde «frakobla» = usynlege
      .sort((a, b) => a.localeCompare(b));
  }
  function onlineCount() { return onlineList().length; }
  // Registrer ein lyttar som får (list) kvar gong nærveret endrar seg.
  // Returnerer ein av-abonner-funksjon.
  function onPresenceChange(cb) {
    if (typeof cb !== 'function') return () => {};
    _presenceCbs.push(cb);
    return () => { const i = _presenceCbs.indexOf(cb); if (i >= 0) _presenceCbs.splice(i, 1); };
  }

  // Enkel HTML-escape — delt av dei nye sosial-modulane.
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  return { gun, NS, channelKey, sub, playDing, soundOn, setSound, toggleSound,
           startPresence, subscribePresence, isOnline, onlineList, onlineCount,
           onPresenceChange, esc,
           STATUS_VALID, myStatus, setStatus, statusOf };
})();
window.SC = SC;
