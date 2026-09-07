// Messenger — innebygd meldingsfane på «Min side» (#/minside → fane «Messenger»).
// Viser private 1:1-meldinger fra ALLE brukere (ikkje berre vener), med ei
// undernavigasjon: samtaleliste → open samtale (per brukar), pluss ei
// «Varsler»-underfane. Tilgjengeleg for alle innlogga — med og utan abonnement.
//
// Sanntid går over SAME Gun-lag som den flytande vennechatten (SC.NS.dm +
// SC.channelKey), så ei melding sendt her dukkar òg opp i FriendChat-docken og
// omvendt. Lesestatus deler vi med FriendChat («sc_fc_read») slik at ulesne-
// teljinga er konsistent på tvers av dei to visningane.
//
// Gun held berre meldingane i minnet (P2P) og repopulerer trégt ved reload, så
// vi cachar kvar kanal sin historikk i localStorage («sr_msgr_hist_<kanal>»).
const Messenger = (() => {

  const READ_KEY     = 'sc_fc_read';                    // delt med FriendChat: { kanal: sisteLestTs }
  const HIST_KEY     = (chan) => 'sr_msgr_hist_' + chan; // cache av meldingar per kanal
  const PARTNERS_KEY = (me)   => 'sr_msgr_partners_' + me; // [username] eg har opna/skrive med
  const NOTIF_KEY    = (me)   => 'sc_notif_local_' + me; // Notify si lokale liste
  const MAX_MSGS     = 300;

  const store   = {};        // kanal → [msg]   (msg._k = Gun-nøkkel for de-dup)
  const subbed  = new Set(); // kanalar vi alt abonnerer på (Gun)
  const _dmPolled = new Set(); // kanalar vi alt poller DmSync for
  let   _rootId = null;      // container-id inne i Min side-panelet
  let   _view   = 'list';    // 'list' | 'conv' | 'notif' | 'new'
  let   _active = null;      // username for open samtale
  let   _lastSent = 0;
  const _sessionStart = Date.now();

  const esc = (s) => (window.SC ? SC.esc(s) : String(s == null ? '' : s));
  const me  = () => (typeof Auth !== 'undefined' ? Auth.current() : null);

  // ── Lese-/historikk-persistens ────────────────────────────────────────
  const reads     = () => { try { return JSON.parse(localStorage.getItem(READ_KEY) || '{}'); } catch { return {}; } };
  const saveReads = (r) => localStorage.setItem(READ_KEY, JSON.stringify(r));
  function markRead(chan) { const r = reads(); r[chan] = Date.now(); saveReads(r); }

  function loadHist(chan) {
    try { return JSON.parse(localStorage.getItem(HIST_KEY(chan)) || '[]'); } catch { return []; }
  }
  function saveHist(chan) {
    try { localStorage.setItem(HIST_KEY(chan), JSON.stringify((store[chan] || []).slice(-MAX_MSGS))); } catch {}
  }

  function partners() {
    const u = me(); if (!u) return [];
    try { return JSON.parse(localStorage.getItem(PARTNERS_KEY(u.username)) || '[]'); } catch { return []; }
  }
  function addPartner(username) {
    const u = me(); if (!u || username === u.username) return;
    const list = partners();
    if (!list.includes(username)) { list.push(username); localStorage.setItem(PARTNERS_KEY(u.username), JSON.stringify(list)); }
  }

  // ── Gun-referansar ────────────────────────────────────────────────────
  function chanRef(chan) {
    const g = window.SC && SC.gun(); if (!g) return null;
    return g.get(SC.NS.dm).get(chan);
  }
  function channelWith(username) {
    const u = me(); if (!u) return null;
    return SC.channelKey(u.username, username);
  }

  // ── Abonnement ────────────────────────────────────────────────────────
  // Gun (chanRef/SC.sub) leverer IKKJE pålitelig mellom to ULIKE nettlesarar
  // (sjå minne soundcore-gun-relay-browser-sync) — DmSync (server-autorisert,
  // api/dm.js, delt med FriendChat/DJ-inbox) er difor den faktisk pålitelige
  // transporten, polla ved sida av Gun-forsøket.
  function ensureSub(chan) {
    if (!chan) return;
    store[chan] = store[chan] || loadHist(chan);
    if (!subbed.has(chan) && window.SC) {
      subbed.add(chan);
      SC.sub(chanRef(chan), (msg, key) => onIncoming(chan, msg, key));
    }
    if (!_dmPolled.has(chan) && typeof DmSync !== 'undefined' && DmSync._enabled()) {
      _dmPolled.add(chan);
      const pull = async () => {
        const rows = await DmSync.list(chan, MAX_MSGS);
        for (const row of rows) onIncoming(chan, row, row.id);
      };
      pull();
      setInterval(pull, 6000);
    }
  }

  // Abonner på alle kjende samtalar: vener + tidlegare partnarar.
  function subscribeKnown() {
    const u = me(); if (!u || !window.SC) return;
    const users = new Set(partners());
    (Auth.getFriends(u.username) || []).forEach(f => users.add(f.username));
    users.forEach(other => { if (other !== u.username) ensureSub(SC.channelKey(u.username, other)); });
  }

  function onIncoming(chan, msg, key) {
    if (!msg || !msg.text || typeof msg.ts !== 'number') return;
    const u = me(); if (!u) return;
    const arr = store[chan] || (store[chan] = []);
    // De-dup på id (delt mellom Gun- og DmSync-kjelda, sett i send()/sendTo())
    // der det finst, elles Gun-nøkkel OG innhald (frå+ts+tekst): sistnemnde
    // fangar både lokalt echo av eiga sending og Gun-replay av allereie
    // cacha meldingar ved reload (då har cacha meldingar andre _k enn
    // Gun-nøklane som kjem inn).
    if (arr.some(m => (msg.id && m.id === msg.id) || m._k === key || (m.from === msg.from && m.ts === msg.ts && m.text === msg.text))) return;
    msg._k = key;
    arr.push(msg);
    arr.sort((a, b) => a.ts - b.ts);
    while (arr.length > MAX_MSGS) arr.shift();
    saveHist(chan);

    const isMine  = msg.from === u.username;
    const other   = msg.from === u.username ? msg.to : msg.from;
    if (other) addPartner(other);
    const viewing = _view === 'conv' && _active && channelWith(_active) === chan;

    if (!isMine) {
      if (viewing && !document.hidden) markRead(chan);
      else if (msg.ts > _sessionStart - 4000 && window.SC) SC.playDing('message');
    }

    // Berre teikn på nytt om Min side-panelet framleis er montert.
    if (document.getElementById(_rootId)) {
      if (viewing) { appendMsgEl(msg); if (!document.hidden) markRead(chan); }
      updateBadges();
    }
  }

  // ── Ulesne ────────────────────────────────────────────────────────────
  function unread(chan) {
    const u = me(); if (!u) return 0;
    const last = reads()[chan] || 0;
    return (store[chan] || []).filter(m => m.from !== u.username && m.ts > last).length;
  }
  function totalUnread() {
    return Object.keys(store).reduce((n, c) => n + unread(c), 0);
  }
  function notifUnread() {
    return (window.Notify && Notify.unreadCount) ? Notify.unreadCount() : 0;
  }

  // ── Samtaleliste ──────────────────────────────────────────────────────
  // Bygg lista over samtalar: alle kanalar med historikk + vener/partnarar.
  function conversations() {
    const u = me(); if (!u) return [];
    const map = new Map();   // username → { username, displayName, last, unread }
    const consider = new Set(partners());
    (Auth.getFriends(u.username) || []).forEach(f => consider.add(f.username));
    // Ta òg med alle kanalar vi har i minnet (t.d. nokon skreiv til oss først).
    Object.keys(store).forEach(chan => {
      const parts = chan.split('__');
      const other = parts[0] === u.username ? parts[1] : parts[0];
      if (other && other !== u.username) consider.add(other);
    });

    consider.forEach(other => {
      const chan = SC.channelKey(u.username, other);
      const msgs = store[chan] && store[chan].length ? store[chan] : loadHist(chan);
      const info = Auth.getUser(other);
      const last = msgs.length ? msgs[msgs.length - 1] : null;
      map.set(other, {
        username: other,
        displayName: (info && info.displayName) || other,
        last,
        unread: unread(chan),
      });
    });

    return [...map.values()].sort((a, b) => {
      const ta = a.last ? a.last.ts : 0, tb = b.last ? b.last.ts : 0;
      return tb - ta;
    });
  }

  // ── Mount / render ────────────────────────────────────────────────────
  // Kalla frå renderMinSide() etter at panelet er lagt i DOM.
  function mount(rootId) {
    _rootId = rootId || 'ms-messenger-root';
    const u = me(); if (!u) return;
    subscribeKnown();
    if (window.SC && SC.startPresence) SC.startPresence(u.username);
    _view = 'list';
    _active = null;
    render();
  }

  function root() { return document.getElementById(_rootId); }

  function render() {
    const el = root(); if (!el) return;
    if (_view === 'conv') return renderConversation(el);
    if (_view === 'notif') return renderNotifs(el);
    if (_view === 'new')  return renderNew(el);
    renderList(el);
  }

  function subTabs(active) {
    const t = totalUnread(), n = notifUnread();
    const badge = (c) => c > 0 ? `<span style="background:#ef4444;color:#fff;border-radius:999px;font-size:0.65rem;font-weight:700;min-width:16px;height:16px;display:inline-flex;align-items:center;justify-content:center;padding:0 4px;margin-left:0.35rem">${c > 99 ? '99+' : c}</span>` : '';
    return `
      <div class="inbox-tabs" style="margin-bottom:1rem">
        <button class="inbox-tab-btn${active === 'samtaler' ? ' active' : ''}" onclick="Messenger.show('list')">${Icon('message')} Conversations${badge(t)}</button>
        <button class="inbox-tab-btn${active === 'varsler' ? ' active' : ''}" onclick="Messenger.show('notif')">${Icon('bell')} Notifications${badge(n)}</button>
        <button class="inbox-tab-btn" onclick="Messenger.show('new')">${Icon('plus')} New message</button>
      </div>`;
  }

  function renderList(el) {
    const convs = conversations();
    const rows = convs.length ? convs.map(c => {
      const chan = channelWith(c.username);
      const last = c.last;
      const preview = last ? `${last.from === me().username ? 'You: ' : ''}${esc(last.text)}` : 'No messages yet';
      const timeStr = last ? timeAgo(last.ts) : '';
      const online  = window.SC && SC.isOnline(c.username);
      return `
        <div class="settings-row" onclick="Messenger.openConv('${esc(c.username)}')" style="cursor:pointer${c.unread > 0 ? ';background:rgba(34,197,94,0.06)' : ''}">
          <div style="display:flex;align-items:center;gap:0.75rem;flex:1;min-width:0">
            <div style="position:relative;flex-shrink:0">
              <div data-av-user="${esc(c.username)}" style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#22c55e,#16a34a);display:flex;align-items:center;justify-content:center;font-weight:700;overflow:hidden">${esc(c.displayName.charAt(0).toUpperCase())}</div>
              ${online ? '<span style="position:absolute;bottom:0;right:0;width:11px;height:11px;border-radius:50%;background:#22c55e;border:2px solid var(--surface,#12121f)"></span>' : ''}
              ${c.unread > 0 ? `<span style="position:absolute;top:-3px;right:-3px;background:#ef4444;color:#fff;border-radius:999px;font-size:0.65rem;font-weight:700;min-width:16px;height:16px;display:flex;align-items:center;justify-content:center;padding:0 3px">${c.unread}</span>` : ''}
            </div>
            <div style="min-width:0;flex:1">
              <div style="font-weight:${c.unread > 0 ? '700' : '600'}">${esc(c.displayName)} <span style="font-size:0.75rem;color:var(--text3)">@${esc(c.username)}</span></div>
              <div style="font-size:0.82rem;color:${c.unread > 0 ? 'var(--text)' : 'var(--text2)'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:${c.unread > 0 ? '600' : '400'}">${preview}</div>
            </div>
          </div>
          <div style="font-size:0.75rem;color:var(--text3);white-space:nowrap;margin-left:0.75rem">${timeStr}</div>
        </div>`;
    }).join('') : '<p style="color:var(--text3);font-size:0.85rem;padding:1rem 0">No conversations yet. Tap <strong>New message</strong> to write to someone.</p>';

    el.innerHTML = `
      ${subTabs('samtaler')}
      <div class="settings-section">
        <div class="settings-section-header">${Icon('message')} Conversations</div>
        <div class="settings-section-body">${rows}</div>
      </div>`;
    if (window.Profile && Profile.hydrateAvatars) Profile.hydrateAvatars(el);
  }

  function renderNew(el) {
    const u = me(); if (!u) return;
    let others = [];
    try { others = (Auth.getAllPublicUsers() || []).filter(x => x.username !== u.username); } catch {}
    el.innerHTML = `
      ${subTabs('')}
      <div class="settings-section">
        <div class="settings-section-header">${Icon('plus')} New message</div>
        <div class="settings-section-body">
          <p style="color:var(--text2);font-size:0.88rem;margin:0 0 1rem">Choose who you want to write to.</p>
          <div style="display:flex;gap:0.6rem;max-width:460px;flex-wrap:wrap">
            <select id="msgr-new-user" style="flex:1;min-width:200px;background:var(--surface,#1a1a2e);border:1px solid var(--border,rgba(255,255,255,0.12));border-radius:8px;padding:0.6rem 0.75rem;color:var(--text,#fff);font-size:0.9rem">
              <option value="">— Choose user —</option>
              ${others.map(x => `<option value="${esc(x.username)}">${esc(x.displayName)} (@${esc(x.username)})</option>`).join('')}
            </select>
            <button class="btn btn-primary" onclick="Messenger.startNew()">${Icon('message')} Start</button>
          </div>
          ${others.length ? '' : '<p style="color:var(--text3);font-size:0.85rem;margin-top:0.75rem">No other users yet.</p>'}
        </div>
      </div>`;
  }

  function renderConversation(el) {
    const u = me(); if (!u || !_active) { _view = 'list'; return renderList(el); }
    const target = Auth.getUser(_active);
    const chan   = channelWith(_active);
    ensureSub(chan);
    const online = window.SC && SC.isOnline(_active);
    el.innerHTML = `
      ${subTabs('samtaler')}
      <div class="settings-section">
        <div class="settings-section-header" style="display:flex;align-items:center;gap:0.6rem">
          <button class="btn btn-ghost btn-sm" onclick="Messenger.show('list')">${Icon('arrow-left')} Back</button>
          <a href="#/u/${esc(_active)}" style="display:flex;align-items:center;gap:0.5rem;text-decoration:none;color:inherit">
            <div data-av-user="${esc(_active)}" style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#22c55e,#16a34a);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.85rem;overflow:hidden">${esc(((target && target.displayName) || _active).charAt(0).toUpperCase())}</div>
            <span>${esc((target && target.displayName) || _active)}${online ? ' <span style="font-size:0.72rem;color:#38bdf8">● online</span>' : ''}</span>
          </a>
        </div>
        <div class="settings-section-body" style="padding:0">
          <div id="msgr-messages" style="max-height:min(52vh,440px);overflow-y:auto;padding:1rem;display:flex;flex-direction:column;gap:0.5rem"></div>
          <div style="display:flex;gap:0.5rem;padding:0.75rem 1rem;border-top:1px solid var(--border,rgba(255,255,255,0.08))">
            <input class="form-input" id="msgr-input" placeholder="Write a message…" autocomplete="off" style="flex:1"
                   onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();Messenger.send()}">
            <button class="btn btn-primary" onclick="Messenger.send()">${Icon('send')} Send</button>
          </div>
        </div>
      </div>`;
    const box = document.getElementById('msgr-messages');
    const msgs = store[chan] || loadHist(chan);
    store[chan] = msgs;
    box.innerHTML = msgs.length ? '' : '<p style="color:var(--text3);font-size:0.85rem;text-align:center;margin:1rem 0">No messages yet — say hi! 👋</p>';
    msgs.forEach(m => appendMsgEl(m, box));
    box.scrollTop = box.scrollHeight;
    markRead(chan);
    updateBadges();
    // Bytt initial-plassholdaren i samtale-headeren ut med det ekte profilbildet.
    if (window.Profile && Profile.hydrateAvatars) Profile.hydrateAvatars(el);
    document.getElementById('msgr-input')?.focus();
  }

  function appendMsgEl(msg, box) {
    box = box || document.getElementById('msgr-messages');
    if (!box) return;
    const u = me();
    const isMine = u && msg.from === u.username;
    const empty = box.querySelector('p'); if (empty) empty.remove();
    const time = new Date(msg.ts || Date.now()).toLocaleTimeString('no', { hour: '2-digit', minute: '2-digit' });
    const wrap = document.createElement('div');
    wrap.style.cssText = `max-width:78%;align-self:${isMine ? 'flex-end' : 'flex-start'}`;
    wrap.innerHTML = `
      <div style="background:${isMine ? 'linear-gradient(135deg,#22c55e,#16a34a)' : 'var(--surface2,rgba(255,255,255,0.06))'};color:${isMine ? '#062012' : 'var(--text)'};padding:0.5rem 0.75rem;border-radius:14px;font-size:0.9rem;word-break:break-word">${esc(msg.text)}</div>
      <div style="font-size:0.68rem;color:var(--text3);margin-top:0.15rem;text-align:${isMine ? 'right' : 'left'}">${time}</div>`;
    box.appendChild(wrap);
    box.scrollTop = box.scrollHeight;
  }

  function renderNotifs(el) {
    const u = me(); if (!u) return;
    let items = [];
    try { items = JSON.parse(localStorage.getItem(NOTIF_KEY(u.username)) || '[]'); } catch {}
    items.sort((a, b) => b.ts - a.ts);
    const rows = items.length ? items.map(n => `
      <a class="settings-row" href="${esc(n.link || '#')}" style="text-decoration:none;color:inherit;display:flex;align-items:center;gap:0.75rem">
        <span style="width:36px;height:36px;border-radius:50%;background:var(--surface2,rgba(255,255,255,0.06));display:flex;align-items:center;justify-content:center;flex-shrink:0">${Icon(({upload:'music',comment:'message',wall:'message',friend_request:'users',friend_accept:'party',post:'edit',message:'mail'})[n.type] || 'bell')}</span>
        <span style="flex:1;min-width:0">
          <span style="display:block;font-size:0.88rem"><b>${esc(n.fromDisplay || n.from)}</b> ${esc(n.text)}</span>
          <span style="display:block;font-size:0.72rem;color:var(--text3)">${timeAgo(n.ts)}</span>
        </span>
      </a>`).join('') : '<p style="color:var(--text3);font-size:0.85rem;padding:1rem 0">No notifications yet.</p>';
    el.innerHTML = `
      ${subTabs('varsler')}
      <div class="settings-section">
        <div class="settings-section-header">${Icon('bell')} Notifications</div>
        <div class="settings-section-body">${rows}</div>
      </div>`;
    // Marker som sett (nullstill bjelle-teljinga) når fana vert opna.
    if (window.Notify && Notify.openPanel) { /* bjella har eiga markering */ }
    try {
      if (u) localStorage.setItem('sc_notif_seen_' + u.username, Date.now().toString());
      if (window.Notify && Notify.updateBell) Notify.updateBell();
    } catch {}
    updateBadges();
  }

  // ── Handlingar ────────────────────────────────────────────────────────
  function show(view) {
    _view = view === 'notif' ? 'notif' : (view === 'new' ? 'new' : 'list');
    if (_view === 'list') _active = null;
    render();
  }

  function openConv(username) {
    if (!username) return;
    _active = username;
    _view = 'conv';
    addPartner(username);
    ensureSub(channelWith(username));
    render();
  }

  function startNew() {
    const sel = document.getElementById('msgr-new-user');
    if (!sel || !sel.value) { if (window.App) App.toast('Choose a user', 'error'); return; }
    openConv(sel.value);
  }

  function send() {
    const u = me(); if (!u || !_active || !window.SC) return;
    const inp = document.getElementById('msgr-input');
    const text = inp && inp.value.trim();
    if (!text) return;
    const now = Date.now();
    if (now - _lastSent < 400) return;
    _lastSent = now;
    const chan = channelWith(_active);
    const ref = chanRef(chan); if (!ref) return;
    const id = `${u.username}_${now}_${Math.random().toString(36).slice(2, 7)}`;
    const payload = { id, from: u.username, fromDisplay: u.displayName, text, ts: now, to: _active };
    try { ref.set(payload); } catch (e) { console.warn('[Messenger] send feila', e); }
    if (typeof DmSync !== 'undefined') DmSync.push(chan, payload).catch(() => {});
    // Lokalt: legg til med ein gong (Gun-echoet de-dupar på _k seinare).
    payload._k = 'local_' + now;
    (store[chan] = store[chan] || []).push(payload);
    saveHist(chan);
    appendMsgEl(payload);
    if (window.SC) SC.playDing('message');
    markRead(chan);
    addPartner(_active);
    // Varsle mottakaren (dukkar opp i bjella + som toast hos dei).
    if (window.Notify && Notify.emit) {
      Notify.emit(_active, { type: 'message', from: u.username, fromDisplay: u.displayName,
        text: 'sent you a message', link: '#/minside' });
    }
    // E-postvarsel om mottakaren har e-post registrert.
    const target = Auth.getUser(_active);
    if (target && target.email && typeof Email !== 'undefined' && Email.sendMessageNotification) {
      Email.sendMessageNotification(target.email, target.displayName, u.displayName, u.username, text);
    }
    if (inp) { inp.value = ''; inp.focus(); }
    updateBadges();
  }

  // Send ei melding til ein brukar utan open samtale (t.d. frå Community-
  // composeren sin «Send til venn»). Same Gun-lag + varsling som send(), utan DOM.
  function sendTo(username, text) {
    const u = me();
    if (!u || !username || !window.SC) return false;
    text = String(text || '').trim();
    if (!text) return false;
    const now = Date.now();
    const chan = channelWith(username);
    const ref = chanRef(chan); if (!ref) return false;
    const id = `${u.username}_${now}_${Math.random().toString(36).slice(2, 7)}`;
    const payload = { id, from: u.username, fromDisplay: u.displayName, text, ts: now, to: username };
    try { ref.set(payload); } catch (e) { console.warn('[Messenger] sendTo feila', e); return false; }
    if (typeof DmSync !== 'undefined') DmSync.push(chan, payload).catch(() => {});
    payload._k = 'local_' + now;
    (store[chan] = store[chan] || loadHist(chan)).push(payload);
    saveHist(chan);
    if (_active === username) appendMsgEl(payload);   // om samtalen tilfeldigvis er open
    if (window.SC) SC.playDing('message');
    addPartner(username);
    if (window.Notify && Notify.emit) {
      Notify.emit(username, { type: 'message', from: u.username, fromDisplay: u.displayName,
        text: 'sent you a message', link: '#/minside' });
    }
    const target = Auth.getUser(username);
    if (target && target.email && typeof Email !== 'undefined' && Email.sendMessageNotification) {
      Email.sendMessageNotification(target.email, target.displayName, u.displayName, u.username, text);
    }
    updateBadges();
    return true;
  }

  // ── Merke/badge ───────────────────────────────────────────────────────
  function updateBadges() {
    // Fane-badge på sjølve «Messenger»-knappen i Min side.
    const el = document.getElementById('ms-messenger-tabbadge');
    if (el) {
      const t = totalUnread() + notifUnread();
      el.textContent = t > 99 ? '99+' : String(t);
      el.style.display = t > 0 ? 'inline-flex' : 'none';
    }
    // Oppdater undertab-teljingane om vi er i lista/varsler.
    if ((_view === 'list' || _view === 'notif') && root()) {
      const bar = root().querySelector('.inbox-tabs');
      if (bar) {
        // Lettvekts: berre teikn undertab-baren på nytt.
        const active = _view === 'notif' ? 'varsler' : 'samtaler';
        bar.outerHTML = subTabs(active);
      }
    }
    if (window.App && App.updateNavBadge) App.updateNavBadge();
  }

  // ── Hjelparar ─────────────────────────────────────────────────────────
  function timeAgo(ts) {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60)    return 'Just now';
    if (s < 3600)  return Math.floor(s / 60) + ' min ago';
    if (s < 86400) return Math.floor(s / 3600) + ' h ago';
    if (s < 604800) return Math.floor(s / 86400) + ' d ago';
    return new Date(ts).toLocaleDateString('no-NO');
  }

  // ── Init ──────────────────────────────────────────────────────────────
  // Kalla ved oppstart/innlogging. Abonnerer på kjende kanalar slik at ulesne-
  // badgen er rett sjølv før brukaren opnar fana.
  function init() {
    const u = me(); if (!u) return;
    subscribeKnown();
  }

  return { init, mount, render, show, openConv, startNew, send, sendTo, totalUnread, updateBadges };
})();
window.Messenger = Messenger;
