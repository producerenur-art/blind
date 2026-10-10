// FriendChat — flytande venne-chat (1:1 per venn + felles gruppe-lounge)
// Dukkar opp nede i høgre hjørne for innlogga brukarar med ≥1 venn.
// Sanntid via SC (Gun.js). Lydvarsel ved innkomande melding (SC.playDing).
const FriendChat = (() => {

  const READ_KEY = 'sc_fc_read';   // { channel: lastReadTs }
  const MIN_KEY  = 'sc_fc_min';    // '1' = minimert
  const CLOSED_KEY = 'sc_fc_closed'; // '1' = lukka (liten 💬-knapp att)
  const POS_KEY  = 'sc_fc_pos';    // { left, top } etter flytting
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
  // Gun (chanRef/SC.sub) er sanntids-forsøket, men leverer IKKJE pålitelig
  // mellom to ULIKE nettlesarar (sjå minne soundcore-gun-relay-browser-sync).
  // DmSync (server-autorisert, api/dm.js) er difor den faktisk pålitelige
  // transporten på tvers av brukarar — henta éin gong + polla vidare.
  function ensureSub(chan) {
    if (subbed.has(chan) || !window.SC) return;
    subbed.add(chan);
    store[chan] = store[chan] || [];
    SC.sub(chanRef(chan), (msg, key) => onIncoming(chan, msg, key));

    if (typeof DmSync !== 'undefined' && DmSync._enabled()) {
      const pull = async () => {
        const rows = await DmSync.list(chan, MAX_MSGS);
        const newOtherRead = (rows && rows._otherRead) || 0;
        const readChanged = otherRead[chan] !== newOtherRead;
        otherRead[chan] = newOtherRead;
        const stNow = DmSync.status();
        const stChanged = _lastStatus !== stNow;
        _lastStatus = stNow;
        _reconcile(chan, rows);
        if ((readChanged || stChanged) && chan === activeChannel() && document.getElementById('fc-messages')) renderMessages();
      };
      pull();
      setInterval(pull, 6000);
    }
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
    // Dedup på msg.id (sett ved sending, delt mellom Gun- og DmSync-kjelda)
    // der det finst, elles Gun-nøkkelen — same mønster som js/chat.js.
    const dedupKey = msg.id || key;
    if (arr.some(m => (m.id || m._k) === dedupKey)) return;
    msg._k = key;
    arr.push(msg);
    arr.sort((a, b) => a.ts - b.ts);
    while (arr.length > MAX_MSGS) arr.shift();

    const isMine     = msg.from === me.username;
    const activeChan = activeChannel();
    const viewing    = chan === activeChan && !_min && !document.hidden;

    if (chan === activeChan && document.getElementById('fc-messages')) { appendMsgEl(msg); _updateReadStatusUI(chan); }

    if (!isMine) {
      if (viewing) markRead(chan);
      else if (msg.ts > _sessionStart - 4000) SC.playDing('message');
    }
    updateBadges();
  }

  // DmSync er den EINASTE kjelda som veit om rediger/slett (Gun-meldingar er
  // fire-and-forget, ingen node-referanse å oppdatere seinare) — same mønster
  // som DJ._reconcileFromServer for #/messages/:username. Oppdaterer tekst på
  // id-treff (rediger), fjernar lokale rader med ein id som ikkje lenger er i
  // serverlista (sletta). Rører ALDRI rader utan id.
  function _reconcile(chan, rows) {
    let arr = store[chan] || (store[chan] = []);
    const serverIds = new Set(rows.map(r => r.id));
    let changed = false;

    for (const row of rows) {
      const idx = arr.findIndex(m => m.id === row.id);
      const reactions = row.reactions && typeof row.reactions === 'object' ? row.reactions : {};
      if (idx === -1) {
        arr.push({ id: row.id, from: row.from_user, fromDisplay: row.from_display || row.from_user,
          text: row.text, ts: row.ts, kind: row.kind || 'text', edited: !!row.edited, reactions });
        changed = true;
      } else if (arr[idx].text !== row.text || !!arr[idx].edited !== !!row.edited || (arr[idx].kind || 'text') !== (row.kind || 'text') || JSON.stringify(arr[idx].reactions || {}) !== JSON.stringify(reactions)) {
        arr[idx] = { ...arr[idx], text: row.text, kind: row.kind || arr[idx].kind, edited: !!row.edited, reactions };
        changed = true;
      }
    }
    const pruned = arr.filter(m => !m.id || serverIds.has(m.id));
    if (pruned.length !== arr.length) { arr = store[chan] = pruned; changed = true; }
    if (!changed) return;

    arr.sort((a, b) => a.ts - b.ts);
    while (arr.length > MAX_MSGS) arr.shift();
    if (chan === activeChannel() && document.getElementById('fc-messages')) {
      renderMessages();
      if (!_min && !document.hidden && rows.some(r => r.from_user !== (Auth.current() || {}).username)) markRead(chan);
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
  // Lokal (eiga uleste-teljing) OG server (driv MOTPARTEN sin «Read»-status
  // under MINE meldingar, sjå otherRead/_updateReadStatusUI) — for ALLE
  // brukarar, ikkje admin-gata.
  function markRead(chan) {
    const r = reads(); r[chan] = Date.now(); saveReads(r);
    updateBadges();
    if (typeof DmSync !== 'undefined') DmSync.markRead(chan).catch(() => {});
  }
  let _lastStatus = 'ok';
  const otherRead = {}; // kanal → ts motparten har lese t.o.m. (frå server, poll)

  // Brukarønske 2026-09-26: «Group lounge» skal ikkje visast på radiosida (#/radio).
  function _onRadio() { return /^#\/radio(\/|$|\?)/.test(location.hash || ''); }

  // ── Mount / render ────────────────────────────────────────────────────
  function mount() {
    if (_mounted || document.getElementById('fc-dock')) { _mounted = true; return; }
    const el = document.createElement('div');
    el.id = 'fc-dock';
    el.className = 'fc-dock' + (_min ? ' minimized' : '');
    el.innerHTML = `<div class="fc-bar" id="fc-bar"></div><div class="fc-body" id="fc-body"></div>`;
    document.body.appendChild(el);
    _mounted = true;
    _applyPos(el);
    _enableDrag(el);
    if (localStorage.getItem(CLOSED_KEY) === '1') { el.style.display = 'none'; _showLauncher(); }
    renderBar();
    renderBody();
  }

  // ── Flytting (dra i topplinja) + lukking ──────────────────────────────
  function _clampPos(el, left, top) {
    const w = el.offsetWidth || 300, h = el.offsetHeight || 60;
    return { left: Math.min(Math.max(0, left), Math.max(0, window.innerWidth - w)),
             top:  Math.min(Math.max(0, top),  Math.max(0, window.innerHeight - h)) };
  }
  function _setPos(el, left, top) {
    const c = _clampPos(el, left, top);
    el.style.left = c.left + 'px'; el.style.top = c.top + 'px';
    el.style.right = 'auto'; el.style.bottom = 'auto';
  }
  function _applyPos(el) {
    try {
      const p = JSON.parse(localStorage.getItem(POS_KEY) || 'null');
      if (p && typeof p.left === 'number') _setPos(el, p.left, p.top);
    } catch (_) {}
  }
  function _enableDrag(el) {
    let sx, sy, ox, oy, dragging = false;
    el.addEventListener('pointerdown', (e) => {
      const bar = e.target.closest && e.target.closest('#fc-bar');
      if (!bar || e.target.closest('button')) return;      // ikkje når ein trykkjer på knappar
      const r = el.getBoundingClientRect();
      sx = e.clientX; sy = e.clientY; ox = r.left; oy = r.top; dragging = true;
      try { bar.setPointerCapture(e.pointerId); } catch (_) {}
      e.preventDefault();
    });
    el.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      _setPos(el, ox + e.clientX - sx, oy + e.clientY - sy);
    });
    const end = () => {
      if (!dragging) return; dragging = false;
      const r = el.getBoundingClientRect();
      try { localStorage.setItem(POS_KEY, JSON.stringify({ left: r.left, top: r.top })); } catch (_) {}
    };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
    window.addEventListener('resize', () => {
      const d = document.getElementById('fc-dock'); if (!d || d.style.left === '') return;
      const r = d.getBoundingClientRect(); _setPos(d, r.left, r.top);
    });
  }
  function _showLauncher() {
    if (document.getElementById('fc-launch')) return;
    const b = document.createElement('button');
    b.id = 'fc-launch'; b.type = 'button'; b.title = 'Open chat'; b.textContent = '💬';
    b.style.cssText = 'position:fixed;right:16px;bottom:16px;width:46px;height:46px;border-radius:50%;border:1px solid var(--border2);background:var(--bg2);font-size:1.3rem;cursor:pointer;z-index:var(--z-dock);box-shadow:0 8px 24px rgba(0,0,0,.5)';
    b.onclick = openDock;
    document.body.appendChild(b);
  }
  function closeDock() {
    try { localStorage.setItem(CLOSED_KEY, '1'); } catch (_) {}
    const el = document.getElementById('fc-dock'); if (el) el.style.display = 'none';
    _showLauncher();
  }
  function openDock() {
    try { localStorage.setItem(CLOSED_KEY, '0'); } catch (_) {}
    const el = document.getElementById('fc-dock'); if (el) el.style.display = '';
    document.getElementById('fc-launch')?.remove();
  }
  function unmount() {
    const el = document.getElementById('fc-dock');
    if (el) el.remove();
    document.getElementById('fc-launch')?.remove();
    _mounted = false;
  }

  function renderBar() {
    const bar = document.getElementById('fc-bar'); if (!bar) return;
    const total = totalUnread();
    const badge = total > 0 ? `<span class="fc-badge">${total > 99 ? '99+' : total}</span>` : '';
    const left = (_active.type === 'list')
      ? `<span class="fc-bar-title">${Icon('users')} Friends ${badge}</span>`
      : `<button class="fc-bar-back" onclick="FriendChat.back()" title="Back">${Icon('chevron-left') || '‹'}</button>
         <span class="fc-bar-title">${_active.type === 'group' ? `${Icon('users')} Group lounge` : esc(_active.name || _active.friend)}</span>`;
    const sndOn = window.SC ? SC.soundOn() : true;
    bar.innerHTML = `
      <div class="fc-bar-left">${left}</div>
      <div class="fc-bar-right">
        <button class="fc-bar-btn" onclick="FriendChat.toggleSound(this)" title="Sound on/off">${sndOn ? Icon('volume') : (Icon('volume-x') || '🔇')}</button>
        <button class="fc-bar-btn" id="fc-min-btn" onclick="FriendChat.toggleMin()" title="${_min ? 'Expand' : 'Minimize'}">${_min ? '+' : '—'}</button>
        <button class="fc-bar-btn" onclick="FriendChat.closeDock()" title="Close">✕</button>
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
      ${_onRadio() ? '' : `<button class="fc-friend fc-group-row" onclick="FriendChat.openGroup()">
        <span class="fc-friend-av fc-group-av">${Icon('users')}</span>
        <span class="fc-friend-name">Group lounge <span class="fc-friend-sub">all friends</span></span>
        ${gUnread > 0 ? `<span class="fc-badge">${gUnread > 99 ? '99+' : gUnread}</span>` : ''}
      </button>`}
      <div class="fc-list-divider">Friends (${friends.length})</div>
      ${rows || '<div class="fc-empty">No friends yet.</div>'}`;
  }

  const FC_EMOJIS = ['😀','😂','😍','🥳','😎','🤔','👍','👎','❤️','🔥','🎉','🙏','😢','😮','💯','✨'];
  function _emojiPickerHtml() {
    return `<div class="fc-emoji-pop hidden" id="fc-emoji-pop">
      ${FC_EMOJIS.map(e => `<button type="button" onclick="FriendChat.insertEmoji('${e}')">${e}</button>`).join('')}
    </div>`;
  }

  function renderConversation(body) {
    const chan = activeChannel();
    body.innerHTML = `
      <div class="fc-messages" id="fc-messages"></div>
      <div class="fc-input-row" style="position:relative">
        ${_emojiPickerHtml()}
        <button class="fc-icon-btn" type="button" onclick="FriendChat.toggleEmojiPicker()" title="Emoji">😊</button>
        <button class="fc-icon-btn" type="button" onclick="FriendChat.pickGif()" title="Add a GIF">${Icon('image')}</button>
        <input id="fc-input" class="fc-input" placeholder="Write a message…" maxlength="600" autocomplete="off">
        <button class="fc-send" onclick="FriendChat.send()" title="Send">${Icon('send')}</button>
      </div>`;
    renderMessages();
    const inp = document.getElementById('fc-input');
    if (inp) {
      inp.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } });
      inp.focus();
    }
    markRead(chan);
  }

  // Full re-rendering av meldingslista frå store[chan] — trengst for at
  // rediger/slett (som endrar/fjernar rader midt i lista via _reconcile) skal
  // vises, ikkje berre reine nye meldingar (som appendMsgEl åleine dekte før).
  function renderMessages() {
    const cont = document.getElementById('fc-messages'); if (!cont) return;
    const chan = activeChannel();
    cont.innerHTML = '';
    // Synleg feilstatus i staden for TAUS svikt: utan gyldig sesjon går ingen
    // meldingar ut/inn mellom ulike nettlesarar (kun lokal Gun), og brukaren såg
    // berre ei tom rute.
    const st = (typeof DmSync !== 'undefined') ? DmSync.status() : 'ok';
    if (st !== 'ok') {
      const b = document.createElement('div');
      b.className = 'fc-sync-warn';
      b.innerHTML = `<span>⚠ Chat sync is off — your login ${st === 'expired' ? 'has expired' : 'is missing a session'}, so messages can't be sent or received.</span>
        <button type="button" onclick="FriendChat.relogin()">Log in again</button>`;
      cont.appendChild(b);
    }
    (store[chan] || []).forEach(appendMsgEl);
    cont.scrollTop = cont.scrollHeight;
    _updateReadStatusUI(chan);
  }

  // «Read»/«Sent» under MI SISTE melding i tråden (Facebook-liknande), for
  // ALLE brukarar — basert på otherRead[chan] frå api/dm.js (motparten sin
  // last_read_ts). Kun for 1:1-DM (ikkje 'group', fleire lesarar).
  function _updateReadStatusUI(chan) {
    const cont = document.getElementById('fc-messages'); if (!cont || chan === 'group') return;
    cont.querySelectorAll('.msgr-read-status').forEach(n => n.remove());
    const msgs = store[chan] || []; if (!msgs.length) return;
    const last = msgs[msgs.length - 1];
    const me = Auth.current(); if (!me || last.from !== me.username) return;
    let wrap = null;
    if (last.id) wrap = Array.from(cont.querySelectorAll('.fc-msg')).find(w => w.dataset.mid === last.id);
    if (!wrap) wrap = cont.lastElementChild;
    if (!wrap) return;
    const seen = (otherRead[chan] || 0) >= (last.ts || 0);
    const div = document.createElement('div');
    div.className = 'msgr-read-status' + (seen ? ' seen' : '');
    div.textContent = seen ? 'Read' : 'Sent';
    wrap.appendChild(div);
  }

  // Facebook-liknande kjapp-reaksjonar — same liste som api/dm.js sin whitelist.
  const FC_REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];
  function _reactionsHtml(id, reactions) {
    const meU = Auth.current(); const mine = meU && meU.username;
    const pills = Object.keys(reactions || {}).filter(e => (reactions[e] || []).length).map(e => {
      const users = reactions[e]; const active = mine && users.includes(mine);
      return `<button type="button" class="msgr-react-pill${active ? ' active' : ''}" title="${users.map(esc).join(', ')}" onclick="FriendChat.toggleReaction('${esc(id)}','${e}')">${e} ${users.length}</button>`;
    }).join('');
    return `<div class="msgr-react-row">
      ${pills}
      <span style="position:relative;display:inline-block">
        <button type="button" class="fc-msg-act" title="React" onclick="FriendChat.toggleReactPicker('${esc(id)}')">${Icon('smile')}</button>
        <div class="fc-emoji-pop hidden" id="fc-react-pop-${esc(id)}" style="grid-template-columns:repeat(6,1fr)">
          ${FC_REACTION_EMOJIS.map(e => `<button type="button" onclick="FriendChat.toggleReaction('${esc(id)}','${e}')">${e}</button>`).join('')}
        </div>
      </span>
    </div>`;
  }
  function appendMsgEl(msg) {
    const cont = document.getElementById('fc-messages'); if (!cont) return;
    const me = Auth.current();
    const isMine = me && msg.from === me.username;
    const time = new Date(msg.ts || Date.now()).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const body = msg.kind === 'gif'
      ? `<img class="fc-msg-gif" src="${esc(msg.text)}" alt="GIF" loading="lazy">`
      : (DmMedia.audioHtml(msg) || `<span class="fc-msg-text">${esc(msg.text)}</span>`);
    const editedTag = msg.edited ? '<span class="fc-msg-edited"> (edited)</span>' : '';
    const actions = (isMine && msg.id) ? `
      <span class="fc-msg-actions">
        ${msg.kind !== 'gif' ? `<button class="fc-msg-act" onclick="FriendChat.editMsg('${esc(msg.id)}')" title="Edit">${Icon('edit')}</button>` : ''}
        <button class="fc-msg-act" onclick="FriendChat.deleteMsg('${esc(msg.id)}')" title="Delete">${Icon('trash')}</button>
      </span>` : '';
    const el = document.createElement('div');
    el.className = 'fc-msg' + (isMine ? ' mine' : '');
    el.style.position = 'relative';
    if (msg.id) el.dataset.mid = msg.id;
    el.innerHTML = `
      ${!isMine ? `<a class="fc-msg-from" href="#/u/${esc(msg.from)}">${esc(msg.fromDisplay || msg.from)}</a>` : ''}
      ${body}${editedTag}
      <span class="fc-msg-time">${time}</span>${actions}
      ${msg.id ? _reactionsHtml(msg.id, msg.reactions) : ''}`;
    cont.appendChild(el);
    cont.scrollTop = cont.scrollHeight;
  }

  function updateBadges() {
    if (!_mounted) return;
    const l = document.getElementById('fc-launch');
    if (l) {
      const n = totalUnread();
      l.textContent = n > 0 ? `💬 ${n > 99 ? '99+' : n}` : '💬';
      l.style.width = n > 0 ? 'auto'  : '46px';
      l.style.padding = n > 0 ? '0 0.8rem' : '';
    }
    renderBar();
    if (_active.type === 'list' && document.getElementById('fc-body')) renderList(document.getElementById('fc-body'));
    if (typeof App !== 'undefined' && App.updateNavBadge) App.updateNavBadge();
  }

  // ── Handlingar ────────────────────────────────────────────────────────
  function _doSend(text, kind) {
    const me = Auth.current();
    if (!text || !me || !window.SC) return;
    const now = Date.now();
    if (now - _lastSent < 400) return;
    _lastSent = now;
    const chan = activeChannel();
    const ref  = chanRef(chan); if (!ref) return;
    const id = `${me.username}_${now}_${Math.random().toString(36).slice(2, 7)}`;
    const payload = { id, from: me.username, fromDisplay: me.displayName, text, ts: now, kind: kind || 'text' };
    if (_active.type === 'dm') payload.to = _active.friend;
    try { ref.set(payload); } catch (e) { console.warn('[FriendChat] send feila', e); }
    if (typeof DmSync !== 'undefined') DmSync.push(chan, payload).catch(() => {});
  }

  function send() {
    const inp = document.getElementById('fc-input');
    const text = inp && inp.value.trim();
    if (!text) return;
    _doSend(text, 'text');
    if (inp) { inp.value = ''; inp.focus(); }
  }

  function pickGif() {
    GifPicker.open(url => _doSend(url, GifPicker.isImageLike(url) ? 'gif' : 'text'), { title: 'Add a GIF, image or link', anyLink: true });
  }

  // Rediger/slett EIGEN melding — server (api/dm.js) sjekkar from_user === deg
  // sjølv uansett, dette er berre UI-tilgangen. Same mønster som DJ.editPM.
  function editMsg(id) {
    const chan = activeChannel(); if (!chan) return;
    const arr = store[chan] || [];
    const m = arr.find(x => x.id === id);
    if (!m || !Auth.current() || m.from !== Auth.current().username || m.kind === 'gif') return;
    const next = prompt('Edit message:', m.text);
    if (next === null) return;
    const trimmed = next.trim(); if (!trimmed) return;
    m.text = trimmed; m.edited = true;
    renderMessages();
    if (typeof DmSync !== 'undefined') DmSync.edit(chan, id, trimmed).catch(() => {});
  }
  function deleteMsg(id) {
    const chan = activeChannel(); if (!chan) return;
    const arr = store[chan] || [];
    const m = arr.find(x => x.id === id);
    if (!m || !Auth.current() || m.from !== Auth.current().username) return;
    if (!confirm('Delete this message?')) return;
    store[chan] = arr.filter(x => x.id !== id);
    renderMessages();
    if (typeof DmSync !== 'undefined') DmSync.remove(chan, id).catch(() => {});
  }

  function toggleEmojiPicker() {
    const pop = document.getElementById('fc-emoji-pop');
    if (pop) pop.classList.toggle('hidden');
  }
  function insertEmoji(e) {
    const inp = document.getElementById('fc-input');
    if (inp) { inp.value += e; inp.focus(); }
    const pop = document.getElementById('fc-emoji-pop');
    if (pop) pop.classList.add('hidden');
  }
  function toggleReactPicker(id) {
    const pop = document.getElementById('fc-react-pop-' + id);
    if (!pop) return;
    const wasHidden = pop.classList.contains('hidden');
    document.querySelectorAll('.msgr-react-row .fc-emoji-pop').forEach(p => p.classList.add('hidden'));
    if (wasHidden) pop.classList.remove('hidden');
  }
  // Toggle éin reaksjon: oppdaterer lokalt med ein gong (optimistisk), sender
  // så til serveren — fungerer for ANDRE sine meldingar òg (Facebook-liknande),
  // ikkje berre eigne, i motsetning til editMsg/deleteMsg.
  function toggleReaction(id, emoji) {
    const me = Auth.current(); if (!me) return;
    const chan = activeChannel(); if (!chan) return;
    const arr = store[chan] || []; const m = arr.find(x => x.id === id); if (!m) return;
    const reactions = { ...(m.reactions || {}) };
    const users = (reactions[emoji] || []).slice();
    const at = users.indexOf(me.username);
    if (at === -1) users.push(me.username); else users.splice(at, 1);
    if (users.length) reactions[emoji] = users; else delete reactions[emoji];
    m.reactions = reactions;
    renderMessages();
    if (typeof DmSync !== 'undefined') {
      DmSync.react(chan, id, emoji).then(serverReactions => {
        if (serverReactions && arr.includes(m)) { m.reactions = serverReactions; renderMessages(); }
      }).catch(() => {});
    }
  }

  function openConv(username, displayName) {
    _active = { type: 'dm', friend: username, name: displayName };
    if (_min) { _min = false; localStorage.setItem(MIN_KEY, '0'); document.getElementById('fc-dock')?.classList.remove('minimized'); }
    renderBar(); renderBody();
  }
  function openGroup() {
    if (_onRadio()) return;
    _active = { type: 'group' };
    if (_min) { _min = false; localStorage.setItem(MIN_KEY, '0'); document.getElementById('fc-dock')?.classList.remove('minimized'); }
    renderBar(); renderBody();
  }
  // Sesjonstokenet er utløpt/manglar og kan ikkje fornyast utan passord:
  // logg ut så innloggingsskjermen kjem opp, og DM synkar att etter innlogging.
  function relogin() {
    try { if (typeof App !== 'undefined' && App.logout) { App.logout(); return; } Auth.logout(); location.hash = '#/'; location.reload(); } catch (_) { location.reload(); }
  }
  function back() { _active = { type: 'list' }; renderBar(); renderBody(); }

  function toggleMin() {
    _min = !_min;
    localStorage.setItem(MIN_KEY, _min ? '1' : '0');
    document.getElementById('fc-dock')?.classList.toggle('minimized', _min);
    renderBar();
  }

  function toggle() {
    if (localStorage.getItem(CLOSED_KEY) === '1') { openDock(); return; }
    if (!eligible()) { if (typeof App !== 'undefined') App.toast('Add a friend to use the friend chat', 'info'); return; }
    if (!_mounted) { mount(); subscribeAll(); _min = false; localStorage.setItem(MIN_KEY, '0'); document.getElementById('fc-dock')?.classList.remove('minimized'); renderBar(); return; }
    toggleMin();
  }

  function toggleSound(btn) {
    if (!window.SC) return;
    const on = SC.toggleSound();
    if (btn) btn.innerHTML = on ? Icon('volume') : (Icon('volume-x') || '🔇');
    if (typeof App !== 'undefined') App.toast(on ? '🔔 Sound on' : '🔕 Sound off', 'info', 1500);
  }

  // ── Livssyklus ────────────────────────────────────────────────────────
  function refresh() {
    if (!eligible()) { unmount(); return; }
    // Er Group lounge open når ein kjem inn på #/radio: gå attende til lista.
    if (_onRadio() && _active.type === 'group') { _active = { type: 'list' }; if (_mounted) renderBody(); }
    mount();
    subscribeAll();
    if (_active.type === 'list') renderList(document.getElementById('fc-body'));
    renderBar();
  }
  function init() { refresh(); }
  // Lytt alltid på rutebytte (init() blir ikkje kalla frå noko), så Group lounge forsvinn/kjem attende med sida.
  window.addEventListener('hashchange', () => { try { refresh(); } catch (_) {} });

  return { init, refresh, closeDock, openDock, toggle, toggleMin, toggleSound, openConv, openGroup, back, send, relogin,
    pickGif, editMsg, deleteMsg, toggleEmojiPicker, insertEmoji, toggleReactPicker, toggleReaction };
})();
window.FriendChat = FriendChat;
