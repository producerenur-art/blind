// FriendChat — flytande venne-chat (1:1 per venn + felles gruppe-lounge)
// Dukkar opp nede i høgre hjørne for innlogga brukarar med ≥1 venn.
// Sanntid via SC (Gun.js). Lydvarsel ved innkomande melding (SC.playDing).
const FriendChat = (() => {

  const READ_KEY = 'sc_fc_read';   // { channel: lastReadTs }
  const MIN_KEY  = 'sc_fc_min';    // '1' = minimert
  const MAX_MSGS = 200;

  const store  = {};               // channel → [msg]  (msg._k = Gun-nøkkel)
  const subbed = new Set();        // kanalar vi alt abonnerer på
  let   _active = { type: 'list' };// 'list' | { type:'group' } | { type:'dm', friend }
  let   _min    = localStorage.getItem(MIN_KEY) === '1';
  let   _mounted = false;
  let   _lastSent = 0;
  const _sessionStart = Date.now();

  const esc = (s) => (window.SC ? SC.esc(s) : String(s || ''));
  const reads = () => { try { return JSON.parse(localStorage.getItem(READ_KEY) || '{}'); } catch { return {}; } };
  const saveReads = (r) => localStorage.setItem(READ_KEY, JSON.stringify(r));

  function eligible() {
    const me = (typeof Auth !== 'undefined') ? Auth.current() : null;
    return !!(me && (Auth.getFriends(me.username) || []).length > 0);
  }

  // ── Gun-referansar ────────────────────────────────────────────────────
  function chanRef(chan) {
    const g = window.SC && SC.gun(); if (!g) return null;
    return chan === 'group'
      ? g.get(SC.NS.group).get('messages')
      : g.get(SC.NS.dm).get(chan);
  }
  function activeChannel() {
    const me = Auth.current(); if (!me) return null;
    if (_active.type === 'group') return 'group';
    if (_active.type === 'dm')    return SC.channelKey(me.username, _active.friend);
    return null;
  }

  // ── Abonnement ────────────────────────────────────────────────────────
  function ensureSub(chan) {
    if (subbed.has(chan) || !window.SC) return;
    subbed.add(chan);
    store[chan] = store[chan] || [];
    SC.sub(chanRef(chan), (msg, key) => onIncoming(chan, msg, key));
  }
  function subscribeAll() {
    const me = Auth.current(); if (!me) return;
    ensureSub('group');
    (Auth.getFriends(me.username) || []).forEach(f =>
      ensureSub(SC.channelKey(me.username, f.username)));
  }

  function onIncoming(chan, msg, key) {
    if (!msg || !msg.text || typeof msg.ts !== 'number') return;
    const me = Auth.current(); if (!me) return;
    const arr = store[chan] || (store[chan] = []);
    if (arr.some(m => m._k === key)) return;
    msg._k = key;
    arr.push(msg);
    arr.sort((a, b) => a.ts - b.ts);
    while (arr.length > MAX_MSGS) arr.shift();

    const isMine     = msg.from === me.username;
    const activeChan = activeChannel();
    const viewing    = chan === activeChan && !_min && !document.hidden;

    if (chan === activeChan && document.getElementById('fc-messages')) appendMsgEl(msg);

    if (!isMine) {
      if (viewing) markRead(chan);
      else if (msg.ts > _sessionStart - 4000) SC.playDing('message');
    }
    updateBadges();
  }

  // ── Uleste ────────────────────────────────────────────────────────────
  function unread(chan) {
    const me = Auth.current(); if (!me) return 0;
    const last = reads()[chan] || 0;
    return (store[chan] || []).filter(m => m.from !== me.username && m.ts > last).length;
  }
  function totalUnread() {
    return Object.keys(store).reduce((n, c) => n + unread(c), 0);
  }
  function markRead(chan) {
    const r = reads(); r[chan] = Date.now(); saveReads(r);
    updateBadges();
  }

  // ── Mount / render ────────────────────────────────────────────────────
  function mount() {
    if (_mounted || document.getElementById('fc-dock')) { _mounted = true; return; }
    const el = document.createElement('div');
    el.id = 'fc-dock';
    el.className = 'fc-dock' + (_min ? ' minimized' : '');
    el.innerHTML = `<div class="fc-bar" id="fc-bar"></div><div class="fc-body" id="fc-body"></div>`;
    document.body.appendChild(el);
    _mounted = true;
    renderBar();
    renderBody();
  }
  function unmount() {
    const el = document.getElementById('fc-dock');
    if (el) el.remove();
    _mounted = false;
  }

  function renderBar() {
    const bar = document.getElementById('fc-bar'); if (!bar) return;
    const total = totalUnread();
    const badge = total > 0 ? `<span class="fc-badge">${total > 99 ? '99+' : total}</span>` : '';
    const left = (_active.type === 'list')
      ? `<span class="fc-bar-title">${Icon('users')} Venner ${badge}</span>`
      : `<button class="fc-bar-back" onclick="FriendChat.back()" title="Tilbake">${Icon('chevron-left') || '‹'}</button>
         <span class="fc-bar-title">${_active.type === 'group' ? `${Icon('users')} Gruppe-lounge` : esc(_active.name || _active.friend)}</span>`;
    const sndOn = window.SC ? SC.soundOn() : true;
    bar.innerHTML = `
      <div class="fc-bar-left">${left}</div>
      <div class="fc-bar-right">
        <button class="fc-bar-btn" onclick="FriendChat.toggleSound(this)" title="Lyd av/på">${sndOn ? Icon('volume') : (Icon('volume-x') || '🔇')}</button>
        <button class="fc-bar-btn" id="fc-min-btn" onclick="FriendChat.toggleMin()" title="${_min ? 'Utvid' : 'Minimer'}">${_min ? '+' : '—'}</button>
      </div>`;
  }

  function renderBody() {
    const body = document.getElementById('fc-body'); if (!body) return;
    if (_active.type === 'list') { renderList(body); return; }
    renderConversation(body);
  }

  function renderList(body) {
    const me = Auth.current(); if (!me) return;
    const friends = Auth.getFriends(me.username) || [];
    const gUnread = unread('group');
    const rows = friends.map(f => {
      const ck = SC.channelKey(me.username, f.username);
      const u  = unread(ck);
      const on = window.SC && SC.isOnline(f.username);
      const initial = (f.displayName || f.username || '?').charAt(0).toUpperCase();
      return `
        <button class="fc-friend" onclick="FriendChat.openConv('${esc(f.username)}','${esc(f.displayName || f.username)}')">
          <span class="fc-friend-av">${esc(initial)}<span class="fc-dot ${on ? 'on' : ''}"></span></span>
          <span class="fc-friend-name">${esc(f.displayName || f.username)}</span>
          ${u > 0 ? `<span class="fc-badge">${u > 99 ? '99+' : u}</span>` : ''}
        </button>`;
    }).join('');
    body.innerHTML = `
      <button class="fc-friend fc-group-row" onclick="FriendChat.openGroup()">
        <span class="fc-friend-av fc-group-av">${Icon('users')}</span>
        <span class="fc-friend-name">Gruppe-lounge <span class="fc-friend-sub">alle venner</span></span>
        ${gUnread > 0 ? `<span class="fc-badge">${gUnread > 99 ? '99+' : gUnread}</span>` : ''}
      </button>
      <div class="fc-list-divider">Vener (${friends.length})</div>
      ${rows || '<div class="fc-empty">Ingen vener enno.</div>'}`;
  }

  function renderConversation(body) {
    const chan = activeChannel();
    body.innerHTML = `
      <div class="fc-messages" id="fc-messages"></div>
      <div class="fc-input-row">
        <input id="fc-input" class="fc-input" placeholder="Skriv ei melding…" maxlength="600" autocomplete="off">
        <button class="fc-send" onclick="FriendChat.send()" title="Send">${Icon('send')}</button>
      </div>`;
    const msgs = document.getElementById('fc-messages');
    (store[chan] || []).forEach(appendMsgEl);
    if (msgs) msgs.scrollTop = msgs.scrollHeight;
    const inp = document.getElementById('fc-input');
    if (inp) {
      inp.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
      inp.focus();
    }
    markRead(chan);
  }

  function appendMsgEl(msg) {
    const cont = document.getElementById('fc-messages'); if (!cont) return;
    const me = Auth.current();
    const isMine = me && msg.from === me.username;
    const time = new Date(msg.ts || Date.now()).toLocaleTimeString('no', { hour: '2-digit', minute: '2-digit' });
    const el = document.createElement('div');
    el.className = 'fc-msg' + (isMine ? ' mine' : '');
    el.innerHTML = `
      ${!isMine ? `<a class="fc-msg-from" href="#/u/${esc(msg.from)}">${esc(msg.fromDisplay || msg.from)}</a>` : ''}
      <span class="fc-msg-text">${esc(msg.text)}</span>
      <span class="fc-msg-time">${time}</span>`;
    cont.appendChild(el);
    cont.scrollTop = cont.scrollHeight;
  }

  function updateBadges() {
    if (!_mounted) return;
    renderBar();
    if (_active.type === 'list' && document.getElementById('fc-body')) renderList(document.getElementById('fc-body'));
    if (typeof App !== 'undefined' && App.updateNavBadge) App.updateNavBadge();
  }

  // ── Handlingar ────────────────────────────────────────────────────────
  function send() {
    const inp = document.getElementById('fc-input');
    const text = inp && inp.value.trim();
    const me = Auth.current();
    if (!text || !me || !window.SC) return;
    const now = Date.now();
    if (now - _lastSent < 400) return;
    _lastSent = now;
    const ref = chanRef(activeChannel()); if (!ref) return;
    const payload = { from: me.username, fromDisplay: me.displayName, text, ts: now };
    if (_active.type === 'dm') payload.to = _active.friend;
    try { ref.set(payload); } catch (e) { console.warn('[FriendChat] send feila', e); }
    if (inp) { inp.value = ''; inp.focus(); }
  }

  function openConv(username, displayName) {
    _active = { type: 'dm', friend: username, name: displayName };
    if (_min) { _min = false; localStorage.setItem(MIN_KEY, '0'); document.getElementById('fc-dock')?.classList.remove('minimized'); }
    renderBar(); renderBody();
  }
  function openGroup() {
    _active = { type: 'group' };
    if (_min) { _min = false; localStorage.setItem(MIN_KEY, '0'); document.getElementById('fc-dock')?.classList.remove('minimized'); }
    renderBar(); renderBody();
  }
  function back() { _active = { type: 'list' }; renderBar(); renderBody(); }

  function toggleMin() {
    _min = !_min;
    localStorage.setItem(MIN_KEY, _min ? '1' : '0');
    document.getElementById('fc-dock')?.classList.toggle('minimized', _min);
    renderBar();
  }

  function toggle() {
    if (!eligible()) { if (typeof App !== 'undefined') App.toast('Legg til ein venn for å bruke vennechatten', 'info'); return; }
    if (!_mounted) { mount(); subscribeAll(); _min = false; localStorage.setItem(MIN_KEY, '0'); document.getElementById('fc-dock')?.classList.remove('minimized'); renderBar(); return; }
    toggleMin();
  }

  function toggleSound(btn) {
    if (!window.SC) return;
    const on = SC.toggleSound();
    if (btn) btn.innerHTML = on ? Icon('volume') : (Icon('volume-x') || '🔇');
    if (typeof App !== 'undefined') App.toast(on ? '🔔 Lyd på' : '🔕 Lyd av', 'info', 1500);
  }

  // ── Livssyklus ────────────────────────────────────────────────────────
  function refresh() {
    if (!eligible()) { unmount(); return; }
    mount();
    subscribeAll();
    if (_active.type === 'list') renderList(document.getElementById('fc-body'));
    renderBar();
  }
  function init() { refresh(); }

  return { init, refresh, toggle, toggleMin, toggleSound, openConv, openGroup, back, send };
})();
window.FriendChat = FriendChat;
