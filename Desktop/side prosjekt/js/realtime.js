// SC — delt sanntidslag (Gun.js) + lydvarsel + nærvær (presence)
// Eitt felles Gun-objekt som venne-chat, varslingar og community-vegg byggjer på.
// Same relay-peers som radio-chatten (js/chat.js).
const SC = (() => {

  // ── Gun.js (delt instans) ─────────────────────────────────────────────
  // Verifiserte oppe 2026-06-28 (funksjonell relay-test). Legacy heroku/wallie
  // er sovna (Heroku free-tier borte) — haldne som fallback om dei vaknar.
  const GUN_PEERS = [
    'https://relay.peer.ooo/gun',              // ✓ browser-verifisert oppe
    'https://gun.defucc.me/gun',               // ✓ browser-verifisert oppe
    'https://gun-manhattan.herokuapp.com/gun', // legacy fallback (kan vakne)
    'https://peer.wallie.io/gun',              // legacy fallback (kan vakne)
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
  };

  let _gun = null;
  function gun() {
    if (_gun) return _gun;
    if (typeof Gun === 'undefined') { console.warn('[SC] Gun.js ikkje lasta'); return null; }
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
  let _presenceStarted = false;
  let _presenceSubbed  = false;
  let _beatTimer = null;

  function startPresence(username) {
    const g = gun();
    if (!g) return;
    if (!_presenceSubbed) {
      _presenceSubbed = true;
      g.get(NS.presence).map().on((d, k) => { if (d && d.ts) _presence[k] = d.ts; });
    }
    if (username && !_presenceStarted) {
      _presenceStarted = true;
      const beat = () => { try { g.get(NS.presence).get(username).put({ ts: Date.now() }); } catch {} };
      beat();
      _beatTimer = setInterval(beat, 25000);
      document.addEventListener('visibilitychange', () => { if (!document.hidden) beat(); });
    }
  }
  function isOnline(username) {
    const ts = _presence[username] || 0;
    return ts > 0 && (Date.now() - ts) < 70000;
  }

  // Enkel HTML-escape — delt av dei nye sosial-modulane.
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  return { gun, NS, channelKey, sub, playDing, soundOn, setSound, toggleSound,
           startPresence, isOnline, esc };
})();
window.SC = SC;
