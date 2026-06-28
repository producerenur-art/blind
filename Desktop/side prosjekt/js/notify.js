// Notify — Facebook-aktig varslingssenter (bjelle + dropdown + toast + lyd)
// Per-mottakar Gun-innboks (SC.NS.notif). Andre modular kallar Notify.emit(...)
// når noko skjer (opplasting, kommentar, gjestebok, venneforespurnad, innlegg).
const Notify = (() => {

  const MAX_ITEMS = 60;
  const localKey = (u) => `sc_notif_local_${u}`;
  const seenKey  = (u) => `sc_notif_seen_${u}`;

  let _user        = null;     // username vi er initialisert for
  let _items       = [];       // [{id,type,from,fromDisplay,text,link,ts}]
  let _subbed      = false;
  let _panelOpen   = false;
  const _sessionStart = Date.now();

  const esc = (s) => (window.SC ? SC.esc(s) : String(s || ''));

  const ICON = {
    upload: 'music', comment: 'message', wall: 'message',
    friend_request: 'users', friend_accept: 'party', post: 'edit', message: 'mail',
  };

  function timeAgo(ts) {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60)    return 'nå nettopp';
    if (s < 3600)  return Math.floor(s / 60) + ' min siden';
    if (s < 86400) return Math.floor(s / 3600) + ' t siden';
    return Math.floor(s / 86400) + ' d siden';
  }

  // ── Persistens ────────────────────────────────────────────────────────
  function loadLocal(u) {
    try { return JSON.parse(localStorage.getItem(localKey(u)) || '[]'); } catch { return []; }
  }
  function saveLocal() {
    if (_user) localStorage.setItem(localKey(_user), JSON.stringify(_items.slice(0, MAX_ITEMS)));
  }
  function seen()      { return parseInt(localStorage.getItem(seenKey(_user)) || '0', 10); }
  function markSeen()  { if (_user) localStorage.setItem(seenKey(_user), Date.now().toString()); updateBell(); }
  function unreadCount() { const s = seen(); return _items.filter(n => n.ts > s).length; }

  // ── Init / abonnement ─────────────────────────────────────────────────
  function init() {
    const me = (typeof Auth !== 'undefined') ? Auth.current() : null;
    if (!me) { _user = null; updateBell(); return; }
    if (_user !== me.username) {
      _user = me.username;
      _items = loadLocal(_user);
      _items.sort((a, b) => b.ts - a.ts);
      _subbed = false;
    }
    if (!_subbed && window.SC) {
      _subbed = true;
      SC.sub(SC.gun().get(SC.NS.notif).get(_user), (n, key) => onIncoming(n, key));
    }
    updateBell();
  }

  function onIncoming(n, key) {
    if (!n || !n.text || typeof n.ts !== 'number') return;
    const id = n.id || key;
    if (_items.some(x => x.id === id)) return;
    const me = Auth.current();
    if (me && n.from === me.username) return;          // ikkje vis eigne handlingar
    _items.unshift({ id, type: n.type || 'message', from: n.from, fromDisplay: n.fromDisplay, text: n.text, link: n.link || '', ts: n.ts });
    _items.sort((a, b) => b.ts - a.ts);
    _items = _items.slice(0, MAX_ITEMS);
    saveLocal();
    if (n.ts > _sessionStart - 4000) {
      if (window.SC) SC.playDing('notif');
      if (typeof App !== 'undefined') App.toast(`${n.fromDisplay || n.from} ${n.text}`, 'info', 4000);
    }
    if (_panelOpen) renderPanel();
    updateBell();
  }

  // ── Emit ──────────────────────────────────────────────────────────────
  function emit(toUsername, payload) {
    if (!toUsername || !window.SC) return;
    const from = (typeof Auth !== 'undefined' && Auth.current()) ? Auth.current().username : (payload.from || '');
    if (toUsername === from) return;                   // ikkje varsle deg sjølv
    const notif = {
      id: 'n_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      type: payload.type || 'message',
      from: payload.from || from,
      fromDisplay: payload.fromDisplay || from,
      text: payload.text || '',
      link: payload.link || '',
      ts: Date.now(),
    };
    try { SC.gun().get(SC.NS.notif).get(toUsername).set(notif); }
    catch (e) { console.warn('[Notify] emit feila', e); }
  }

  // Varsle alle vener til ein brukar (brukar-objekt) — opplasting / nytt innlegg.
  function notifyFriends(meUser, payload) {
    if (!meUser) return;
    (Auth.getFriends(meUser.username) || []).forEach(f => emit(f.username, { ...payload, from: meUser.username, fromDisplay: meUser.displayName }));
  }

  // ── Bjelle + panel ────────────────────────────────────────────────────
  function updateBell() {
    const bell = document.getElementById('nav-bell');
    if (!bell) return;
    const n = unreadCount();
    let b = bell.querySelector('.nav-bell-badge');
    if (n > 0) {
      if (!b) { b = document.createElement('span'); b.className = 'nav-bell-badge'; bell.appendChild(b); }
      b.textContent = n > 99 ? '99+' : n;
    } else if (b) { b.remove(); }
  }

  function renderPanel() {
    const panel = document.getElementById('sc-notif-panel'); if (!panel) return;
    const rows = _items.length ? _items.map(n => `
      <a class="sc-notif-item" href="${esc(n.link || '#')}" onclick="Notify.closePanel()">
        <span class="sc-notif-ic">${Icon(ICON[n.type] || 'bell')}</span>
        <span class="sc-notif-body">
          <span class="sc-notif-text"><b>${esc(n.fromDisplay || n.from)}</b> ${esc(n.text)}</span>
          <span class="sc-notif-time">${timeAgo(n.ts)}</span>
        </span>
      </a>`).join('') : '<div class="sc-notif-empty">Ingen varsler enno.</div>';
    panel.innerHTML = `
      <div class="sc-notif-head">
        <span>${Icon('bell')} Varsler</span>
        <button class="sc-notif-close" onclick="Notify.closePanel()" title="Lukk">${Icon('x')}</button>
      </div>
      <div class="sc-notif-list">${rows}</div>`;
  }

  function openPanel() {
    let panel = document.getElementById('sc-notif-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'sc-notif-panel';
      panel.className = 'sc-notif-panel';
      document.body.appendChild(panel);
      setTimeout(() => document.addEventListener('pointerdown', _outside), 0);
    }
    _panelOpen = true;
    renderPanel();
    markSeen();
  }
  function closePanel() {
    _panelOpen = false;
    document.getElementById('sc-notif-panel')?.remove();
    document.removeEventListener('pointerdown', _outside);
  }
  function togglePanel() { _panelOpen ? closePanel() : openPanel(); }
  function _outside(e) {
    if (e.target.closest && (e.target.closest('#sc-notif-panel') || e.target.closest('#nav-bell'))) return;
    closePanel();
  }

  return { init, emit, notifyFriends, unreadCount, updateBell, togglePanel, openPanel, closePanel };
})();
window.Notify = Notify;
