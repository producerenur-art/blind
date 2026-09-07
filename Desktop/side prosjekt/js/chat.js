// Chat — Gun.js real-time P2P chat (kun chat: radio- og YouTube-panelet er fjerna)
const Chat = (() => {

  // ── Gun.js setup ──────────────────────────────────────────────────────
  // Verifiserte oppe 2026-06-28 (funksjonell relay-test). Døde legacy-peers
  // (gun-manhattan.herokuapp.com, peer.wallie.io) fjerna — laga konsollstøy.
  const GUN_PEERS = [
    'https://relay.peer.ooo/gun',              // ✓ browser-verifisert oppe
    'https://gun.defucc.me/gun',               // ✓ browser-verifisert oppe
  ];
  const CHAT_KEY  = 'profilverse_radio_chat_v1';
  const MAX_MSGS  = 120;
  const EMOJIS    = ['😄','😂','🔥','❤️','👏','🎵','🎶','🌀','💫','⚡','🌊','🚀','✨','🎉','💜','👾'];

  let gun         = null;
  let messagesRef = null;
  let myNick      = localStorage.getItem('pv_chat_nick') || '';
  let myColor     = localStorage.getItem('pv_chat_color') || randomColor();
  let connected   = false;
  let lastSent    = 0;

  // ── Floating window state ─────────────────────────────────────────────
  let floatAbort = null;
  let _inputListenersAttached = false;
  let _msgSubscribed = false;

  // Kun chat-panelet igjen → smalare standardvindu. Nøkkelen er bumpa til _v2
  // slik at gamle (breie) posisjonar frå radio/YouTube-tida ikkje blir arva.
  const FLOAT_KEY = 'pv_chat_float_v2';

  function defaultFloatState() {
    const w = Math.min(420, window.innerWidth - 32);
    const h = Math.min(560, window.innerHeight - 120);
    return { x: Math.max(0, window.innerWidth - w - 16), y: 76, w, h, minimized: false };
  }

  let floatState = JSON.parse(localStorage.getItem(FLOAT_KEY) || 'null') || defaultFloatState();
  let chatMinimized = floatState.minimized || false;

  function saveFloatState() {
    localStorage.setItem(FLOAT_KEY, JSON.stringify(floatState));
  }

  function applyFloatState(win) {
    win.style.left   = floatState.x + 'px';
    win.style.top    = floatState.y + 'px';
    win.style.width  = floatState.w + 'px';
    win.style.height = floatState.h + 'px';
    if (floatState.minimized) {
      win.classList.add('minimized');
      chatMinimized = true;
      const btn = document.getElementById('chat-minimize-btn');
      if (btn) { btn.textContent = '+'; btn.title = 'Expand'; }
    }
  }

  function toggleMinimize() {
    const win = document.getElementById('chat-float-window');
    const btn = document.getElementById('chat-minimize-btn');
    if (!win) return;
    chatMinimized = !chatMinimized;
    win.classList.toggle('minimized', chatMinimized);
    if (btn) { btn.textContent = chatMinimized ? '+' : '—'; btn.title = chatMinimized ? 'Expand' : 'Minimize'; }
    floatState.minimized = chatMinimized;
    saveFloatState();
  }

  // Lukk chat-vinduet – tilgjengelig for alle (gjester og innloggede).
  // Radioen spilles av det globale <audio id="audio-engine"> som ligger utenfor
  // dette vinduet, så musikken fortsetter uendret når chatten lukkes.
  function closeFloat() {
    const win = document.getElementById('chat-float-window');
    if (win) win.remove();
    if (floatAbort) { floatAbort.abort(); floatAbort = null; }
    _inputListenersAttached = false;   // slik at Enter-lyttere kobles på igjen ved reåpning
    const btn = document.getElementById('nav-chat-bubble');
    if (btn) btn.classList.remove('active');
    // Var vi på chat-siden er #app tomt nå – send brukeren til forsiden.
    if (location.hash.startsWith('#/chat')) location.hash = '#/';
  }

  function randomColor() {
    const colors = ['#86efac','#60a5fa','#34d399','#f472b6','#fb923c','#38bdf8','#c084fc','#4ade80'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  function randomNick() {
    const adj  = ['Cosmic','Electric','Neon','Solar','Deep','Astral','Quantum','Dark'];
    const noun = ['Traveler','Wave','Pulse','Vibe','Echo','Drift','Mind','Soul'];
    return adj[Math.floor(Math.random() * adj.length)] + noun[Math.floor(Math.random() * noun.length)] + Math.floor(Math.random() * 99);
  }

  // ── Init Gun ──────────────────────────────────────────────────────────
  function initGun() {
    if (gun) return;
    if (typeof Gun === 'undefined') { console.warn('Gun.js not loaded'); return; }
    gun = Gun({ peers: GUN_PEERS, localStorage: false });
    messagesRef = gun.get(CHAT_KEY).get('messages');
    connected = true;
  }

  // ── Persistent float: lift window out of #app so it survives navigation ──
  function liftToBody() {
    const win = document.getElementById('chat-float-window');
    if (!win || win.parentElement === document.body) return;
    applyFloatState(win);
    document.body.appendChild(win);
  }

  function toggleFloat() {
    const win = document.getElementById('chat-float-window');
    if (!win) {
      // If we're on the chat page, let normal render handle it
      const onChatPage = document.getElementById('app') &&
                         document.getElementById('app').querySelector('.chat-float-window');
      if (onChatPage) { render(); return; }
      renderFloat();
      return;
    }
    const hidden = win.style.display === 'none';
    win.style.display = hidden ? '' : 'none';
    const btn = document.getElementById('nav-chat-bubble');
    if (btn) btn.classList.toggle('active', !hidden);
  }

  function renderFloat() {
    const nickChosen = !!localStorage.getItem('pv_chat_nick');
    if (!myNick) myNick = randomNick();

    const tmp = document.createElement('div');
    tmp.innerHTML = `<div id="chat-float-window" class="chat-float-window">
      <div id="chat-float-drag-bar" class="chat-float-drag-bar">
        <span class="chat-float-grip" aria-hidden="true">${Icon('grip')}</span>
        <span class="chat-float-title">${Icon('radio')} SiriusFM — Live Chat</span>
        <button class="chat-float-btn" id="chat-minimize-btn" onclick="Chat.toggleMinimize()" title="Minimize">—</button>
        <button class="chat-float-btn chat-float-close" id="chat-close-btn" onclick="Chat.closeFloat()" title="Lukk chat" aria-label="Lukk chat">×</button>
      </div>
      <div class="chat-page">
        <div class="chat-panel">
          <div class="chat-header">
            <h2>${Icon('message')} Chat</h2>
            <div class="online-count"><span class="online-dot"></span><span id="online-count">Live</span></div>
            <button class="btn-icon" title="Clear chat" onclick="Chat.clearMessages()">${Icon('trash')}</button>
          </div>
          <div class="nick-bar" id="nick-bar">
            <label>Nick:</label>
            <div class="nick-display ${nickChosen ? '' : 'hidden'}" id="nick-display" onclick="Chat.showNickEdit()">
              <span style="color:${myColor}">●</span>
              <span>${myNick}</span>
              <span style="font-size:0.75rem;color:var(--text3)">${Icon('edit')}</span>
            </div>
            <div class="nick-edit-form ${!nickChosen ? '' : 'hidden'}" id="nick-edit-form">
              <input class="form-input" id="nick-input" value="${myNick}" maxlength="24" placeholder="Your nick" style="font-size:0.82rem">
              <div class="nick-color-wrap">
                <input type="color" id="nick-color" value="${myColor}" style="width:32px;height:32px;border:none;border-radius:50%;cursor:pointer;padding:2px;background:none">
              </div>
              <button class="btn btn-primary btn-sm" onclick="Chat.saveNick()">OK</button>
            </div>
          </div>
          <div id="chat-messages"><div class="chat-system-msg">Kobler til chat… ${Icon('link')}</div></div>
          <div class="chat-input-area">
            <div class="emoji-bar">
              ${EMOJIS.map(e => `<button class="emoji-pill" onclick="Chat.insertEmoji('${e}')">${e}</button>`).join('')}
            </div>
            <div class="chat-input-row">
              <label class="chat-color-swatch" style="background:${myColor}" title="Choose text color">
                <input type="color" id="quick-color-picker" value="${myColor}"
                       oninput="Chat.quickColor(this.value)" onchange="Chat.quickColor(this.value)">
              </label>
              <input id="chat-text" placeholder="Write a message… (Enter)" maxlength="400" autocomplete="off">
              <button id="chat-send" onclick="Chat.sendMessage()">${Icon('send')}</button>
            </div>
            <div class="chat-status" id="chat-status">${connected ? '🟢 Connected' : '🟡 Connecting…'}</div>
          </div>
        </div>
      </div>
      <div class="cfr n" data-resize="n"></div>
      <div class="cfr s" data-resize="s"></div>
      <div class="cfr e" data-resize="e"></div>
      <div class="cfr w" data-resize="w"></div>
      <div class="cfr ne" data-resize="ne"></div>
      <div class="cfr nw" data-resize="nw"></div>
      <div class="cfr se" data-resize="se"></div>
      <div class="cfr sw" data-resize="sw"></div>
    </div>`;

    const win = tmp.firstElementChild;
    applyFloatState(win);
    document.body.appendChild(win);

    if (!_inputListenersAttached) {
      _inputListenersAttached = true;
      const inp = document.getElementById('chat-text');
      if (inp) inp.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); Chat.sendMessage(); } });
      const nickInp = document.getElementById('nick-input');
      if (nickInp) nickInp.addEventListener('keydown', e => { if (e.key === 'Enter') Chat.saveNick(); });
    }

    initGun();
    if (gun) { subscribeMessages(); updateStatus('🟢 Connected via P2P'); } else { useFallback(); }
    initDragResize();

    const btn = document.getElementById('nav-chat-bubble');
    if (btn) btn.classList.add('active');
  }

  // ── Render ────────────────────────────────────────────────────────────
  function render() {
    // If float window already lives on body, just show it
    const existing = document.getElementById('chat-float-window');
    if (existing && existing.parentElement === document.body) {
      existing.style.display = '';
      if (chatMinimized) toggleMinimize();
      const btn = document.getElementById('nav-chat-bubble');
      if (btn) btn.classList.add('active');
      return;
    }
    const app = document.getElementById('app');
    const nickChosen = !!localStorage.getItem('pv_chat_nick');
    if (!myNick) myNick = randomNick();

    app.innerHTML = `
      <div id="chat-float-window" class="chat-float-window">
        <div id="chat-float-drag-bar" class="chat-float-drag-bar">
          <span class="chat-float-grip" aria-hidden="true">${Icon('grip')}</span>
          <span class="chat-float-title">${Icon('radio')} SiriusFM — Live Chat</span>
          <button class="chat-float-btn" id="chat-minimize-btn" onclick="Chat.toggleMinimize()" title="Minimer">—</button>
          <button class="chat-float-btn chat-float-close" id="chat-close-btn" onclick="Chat.closeFloat()" title="Lukk chat" aria-label="Lukk chat">×</button>
        </div>

        <div class="chat-page">

        <!-- ── Chat ── -->
        <div class="chat-panel">
          <div class="chat-header">
            <h2>${Icon('message')} Chat</h2>
            <div class="online-count">
              <span class="online-dot"></span>
              <span id="online-count">Live</span>
            </div>
            <button class="btn-icon" title="Clear chat" onclick="Chat.clearMessages()">${Icon('trash')}</button>
          </div>

          <!-- Nick + color bar -->
          <div class="nick-bar" id="nick-bar">
            <label>Nick:</label>
            <div class="nick-display ${nickChosen ? '' : 'hidden'}" id="nick-display" onclick="Chat.showNickEdit()">
              <span style="color:${myColor}">●</span>
              <span>${myNick}</span>
              <span style="font-size:0.75rem;color:var(--text3)">${Icon('edit')}</span>
            </div>
            <div class="nick-edit-form ${!nickChosen ? '' : 'hidden'}" id="nick-edit-form">
              <input class="form-input" id="nick-input" value="${myNick}" maxlength="24" placeholder="Your nick" style="font-size:0.82rem">
              <div class="nick-color-wrap" title="Choose nick and text color">
                <input type="color" id="nick-color" value="${myColor}"
                       style="width:32px;height:32px;border:none;border-radius:50%;cursor:pointer;padding:2px;background:none">
              </div>
              <button class="btn btn-primary btn-sm" onclick="Chat.saveNick()">OK</button>
            </div>
          </div>

          <!-- Messages -->
          <div id="chat-messages">
            <div class="chat-system-msg">Connecting to chat… ${Icon('link')}</div>
          </div>

          <!-- Input -->
          <div class="chat-input-area">
            <div class="emoji-bar">
              ${EMOJIS.map(e => `<button class="emoji-pill" onclick="Chat.insertEmoji('${e}')">${e}</button>`).join('')}
            </div>
            <div class="chat-input-row">
              <label class="chat-color-swatch" style="background:${myColor}" title="Choose text color (click)">
                <input type="color" id="quick-color-picker" value="${myColor}"
                       oninput="Chat.quickColor(this.value)" onchange="Chat.quickColor(this.value)">
              </label>
              <input id="chat-text" placeholder="Write a message… (Enter to send)" maxlength="400" autocomplete="off">
              <button id="chat-send" onclick="Chat.sendMessage()">${Icon('send')}</button>
            </div>
            <div class="chat-status" id="chat-status">
              ${connected ? '🟢 Connected' : '🟡 Connecting…'}
            </div>
          </div>
        </div>
        </div>

        <!-- Resize handles: 4 edges + 4 corners -->
        <div class="cfr n"  data-resize="n"></div>
        <div class="cfr s"  data-resize="s"></div>
        <div class="cfr e"  data-resize="e"></div>
        <div class="cfr w"  data-resize="w"></div>
        <div class="cfr ne" data-resize="ne"></div>
        <div class="cfr nw" data-resize="nw"></div>
        <div class="cfr se" data-resize="se"></div>
        <div class="cfr sw" data-resize="sw"></div>
      </div>`;

    // Enter key for chat
    if (!_inputListenersAttached) {
      _inputListenersAttached = true;
      const inp = document.getElementById('chat-text');
      if (inp) inp.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); Chat.sendMessage(); }
      });
      const nickInp = document.getElementById('nick-input');
      if (nickInp) nickInp.addEventListener('keydown', e => { if (e.key === 'Enter') Chat.saveNick(); });
    }

    initGun();
    if (gun) {
      subscribeMessages();
      updateStatus('🟢 Connected via P2P');
    } else {
      useFallback();
    }

    initDragResize();
    liftToBody();
    // Mark chat bubble as active
    const chatBtn = document.getElementById('nav-chat-bubble');
    if (chatBtn) chatBtn.classList.add('active');
  }

  // ── Floating window drag & resize ─────────────────────────────────────
  function initDragResize() {
    const win    = document.getElementById('chat-float-window');
    const dragBar = document.getElementById('chat-float-drag-bar');
    if (!win || !dragBar) return;

    if (floatAbort) floatAbort.abort();
    floatAbort = new AbortController();
    const sig = floatAbort.signal;

    applyFloatState(win);

    const MIN_W = 420, MIN_H = 300;
    const NAV_H = 60;
    let action = null; // 'drag' | resize direction string
    let startX, startY, startLeft, startTop, startW, startH;

    function beginDrag(cx, cy) {
      action = 'drag';
      startX = cx; startY = cy;
      startLeft = floatState.x; startTop = floatState.y;
      document.body.style.userSelect = 'none';
    }

    function beginResize(cx, cy, dir) {
      action = dir;
      startX = cx; startY = cy;
      startLeft = floatState.x; startTop = floatState.y;
      startW = floatState.w; startH = floatState.h;
      document.body.style.userSelect = 'none';
    }

    function applyMove(cx, cy) {
      if (!action) return;
      const dx = cx - startX, dy = cy - startY;

      if (action === 'drag') {
        floatState.x = Math.max(0, Math.min(window.innerWidth - 100, startLeft + dx));
        floatState.y = Math.max(NAV_H, Math.min(window.innerHeight - 60, startTop + dy));
        win.style.left = floatState.x + 'px';
        win.style.top  = floatState.y + 'px';
      } else {
        let nx = startLeft, ny = startTop, nw = startW, nh = startH;

        if (action.includes('e')) nw = Math.max(MIN_W, startW + dx);
        if (action.includes('w')) { nw = Math.max(MIN_W, startW - dx); nx = startLeft + startW - nw; }
        if (action.includes('s')) nh = Math.max(MIN_H, startH + dy);
        if (action.includes('n')) { nh = Math.max(MIN_H, startH - dy); ny = Math.max(NAV_H, startTop + startH - nh); }

        floatState.x = nx; floatState.y = ny;
        floatState.w = nw; floatState.h = nh;
        win.style.left   = nx + 'px';
        win.style.top    = ny + 'px';
        win.style.width  = nw + 'px';
        win.style.height = nh + 'px';
      }
    }

    function endAction() {
      if (action) saveFloatState();
      action = null;
      document.body.style.userSelect = '';
    }

    // Pointer Events unify mouse + touch + pen so drag/resize works on mobile too
    // (the drag bar and .cfr handles get touch-action:none in CSS to avoid scroll).
    dragBar.addEventListener('pointerdown', e => {
      if (e.button !== 0 || e.target.closest('button')) return;
      e.preventDefault();
      beginDrag(e.clientX, e.clientY);
    }, { signal: sig });

    win.querySelectorAll('.cfr').forEach(handle => {
      handle.addEventListener('pointerdown', e => {
        if (e.button !== 0) return;
        e.preventDefault(); e.stopPropagation();
        beginResize(e.clientX, e.clientY, handle.dataset.resize);
      }, { signal: sig });
    });

    document.addEventListener('pointermove', e => applyMove(e.clientX, e.clientY), { signal: sig });
    document.addEventListener('pointerup', endAction, { signal: sig });
    document.addEventListener('pointercancel', endAction, { signal: sig });
  }

  // ── Quick color picker (in input row) ────────────────────────────────
  function quickColor(color) {
    myColor = color;
    localStorage.setItem('pv_chat_color', color);
    // Update swatch
    const swatch = document.querySelector('.chat-color-swatch');
    if (swatch) swatch.style.background = color;
    // Keep nick color picker in sync
    const nickColorEl = document.getElementById('nick-color');
    if (nickColorEl) nickColorEl.value = color;
    // Update nick display dot
    const nickDot = document.querySelector('#nick-display span:first-child');
    if (nickDot) nickDot.style.color = color;
  }

  // ── Gun message subscription ──────────────────────────────────────────
  // Gun (messagesRef) er sanntids-forsøket, men dei offentlege releane leverer
  // IKKJE pålitelig meldingar mellom to ULIKE nettlesarar (verifisert
  // 2026-06-28, sjå minne soundcore-gun-relay-browser-sync). ChatSync
  // (Supabase-spegling, migrasjon 0015) er difor den faktisk pålitelige
  // transporten på tvers av brukarar — henta éin gong + polla vidare.
  // Dedup på msg.id (sett i sendMessage) der det finst, elles Gun-nøkkelen.
  const _renderedIds = new Set();
  function subscribeMessages() {
    if (!messagesRef || _msgSubscribed) return;
    _msgSubscribed = true;
    const msgs = document.getElementById('chat-messages');
    if (!msgs) return;
    msgs.innerHTML = '';
    messagesRef.map().on((msg, key) => {
      if (!msg || !msg.text) return;
      const dedupKey = msg.id || key;
      if (_renderedIds.has(dedupKey)) return;
      _renderedIds.add(dedupKey);
      appendMessage(msg);
    });

    if (typeof ChatSync !== 'undefined' && ChatSync._enabled()) {
      const pull = async () => {
        const rows = await ChatSync.list(MAX_MSGS);
        for (const msg of rows.slice().reverse()) {
          const dedupKey = msg.id;
          if (!dedupKey || _renderedIds.has(dedupKey)) continue;
          _renderedIds.add(dedupKey);
          appendMessage(msg);
        }
      };
      pull();
      setInterval(pull, 6000);
    }
  }

  function appendMessage(msg) {
    const container = document.getElementById('chat-messages');
    if (!container) return;
    const isSystem = msg.type === 'system';
    const isSelf   = msg.nick === myNick;
    const time     = new Date(msg.ts || Date.now()).toLocaleTimeString('no', { hour:'2-digit', minute:'2-digit' });

    if (isSystem) {
      const el = document.createElement('div');
      el.className = 'chat-system-msg';
      el.textContent = msg.text;
      container.appendChild(el);
    } else {
      const el = document.createElement('div');
      el.className = 'chat-msg';
      const textColor = msg.color || 'var(--text)';
      el.innerHTML = `
        <span class="chat-msg-time">${time}</span>
        <span class="chat-msg-nick ${isSelf ? 'is-self' : ''}" style="color:${msg.color || '#22c55e'}">${escHtml(msg.nick)}:</span>
        <span class="chat-msg-text" style="color:${textColor}">${formatText(msg.text)}</span>`;
      container.appendChild(el);
    }

    container.scrollTop = container.scrollHeight;
    const children = container.children;
    while (children.length > MAX_MSGS) container.removeChild(children[0]);
  }

  function formatText(text) {
    let safe = escHtml(text);
    safe = safe.replace(/(https?:\/\/[^\s<>"]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
    return safe;
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ── Send ──────────────────────────────────────────────────────────────
  function sendMessage() {
    const inp  = document.getElementById('chat-text');
    const text = inp?.value?.trim();
    if (!text) return;
    if (!myNick) { showNickEdit(); App.toast('Set a nick first', 'info'); return; }
    const now = Date.now();
    if (now - lastSent < 800) { App.toast('Not so fast! ⚡', 'info'); return; }
    lastSent = now;
    const id  = `${myNick}_${now}_${Math.random().toString(36).slice(2, 7)}`;
    const msg = { id, nick: myNick, color: myColor, text, ts: now, type: 'msg' };
    if (gun && messagesRef) {
      messagesRef.set(msg);
    } else {
      appendMessage(msg);
      saveFallbackMsg(msg);
    }
    // Egen melding er alt rendra lokalt (Gun .set() over, eller fallback) —
    // merk han som sett FØR sky-spegling, elles kan polling om nokre sekund
    // rendre han ein gong til når han kjem tilbake frå Supabase.
    _renderedIds.add(id);
    if (typeof ChatSync !== 'undefined') ChatSync.push(msg).catch(() => {});
    if (inp) inp.value = '';
  }

  function insertEmoji(emoji) {
    const inp = document.getElementById('chat-text');
    if (inp) { inp.value += emoji; inp.focus(); }
  }

  // ── Nick ──────────────────────────────────────────────────────────────
  function showNickEdit() {
    document.getElementById('nick-display')?.classList.add('hidden');
    document.getElementById('nick-edit-form')?.classList.remove('hidden');
    document.getElementById('nick-input')?.focus();
  }

  function saveNick() {
    const inp      = document.getElementById('nick-input');
    const colorEl  = document.getElementById('nick-color');
    const newNick  = inp?.value?.trim();
    const newColor = colorEl?.value || myColor;
    if (!newNick || newNick.length < 2) { App.toast('Nick must be at least 2 characters', 'error'); return; }
    const oldNick = myNick;
    myNick  = newNick;
    myColor = newColor;
    localStorage.setItem('pv_chat_nick',  myNick);
    localStorage.setItem('pv_chat_color', myColor);

    const display = document.getElementById('nick-display');
    if (display) {
      display.innerHTML = `<span style="color:${myColor}">●</span><span>${myNick}</span><span style="font-size:0.75rem;color:var(--text3)">${Icon('edit')}</span>`;
      display.classList.remove('hidden');
    }
    document.getElementById('nick-edit-form')?.classList.add('hidden');

    // Sync quick color swatch
    const swatch = document.querySelector('.chat-color-swatch');
    if (swatch) swatch.style.background = myColor;
    const quickPicker = document.getElementById('quick-color-picker');
    if (quickPicker) quickPicker.value = myColor;

    if (oldNick && oldNick !== myNick) {
      const sysMsg = { type:'system', text:`${oldNick} is now ${myNick}`, ts: Date.now() };
      if (gun && messagesRef) messagesRef.set(sysMsg);
      else appendMessage(sysMsg);
    }
    App.toast(`Nick set to ${myNick} ${Icon('palette')}`, 'success');
  }

  function clearMessages() {
    const container = document.getElementById('chat-messages');
    if (container) container.innerHTML = '<div class="chat-system-msg">Chat cleared locally</div>';
  }

  // ── Status + Fallback ─────────────────────────────────────────────────
  function updateStatus(text) {
    const el = document.getElementById('chat-status');
    if (el) el.textContent = text;
  }

  const FALLBACK_KEY = 'pv_chat_fallback';

  function useFallback() {
    updateStatus('🟡 Offline mode (local only)');
    const msgs = JSON.parse(localStorage.getItem(FALLBACK_KEY) || '[]');
    const container = document.getElementById('chat-messages');
    if (container) {
      container.innerHTML = '<div class="chat-system-msg">Offline mode — messages are saved locally</div>';
      msgs.forEach(m => appendMessage(m));
    }
  }

  function saveFallbackMsg(msg) {
    const msgs = JSON.parse(localStorage.getItem(FALLBACK_KEY) || '[]');
    msgs.push(msg);
    if (msgs.length > MAX_MSGS) msgs.splice(0, msgs.length - MAX_MSGS);
    localStorage.setItem(FALLBACK_KEY, JSON.stringify(msgs));
  }

  return {
    render, sendMessage, insertEmoji,
    showNickEdit, saveNick, clearMessages,
    quickColor, toggleMinimize, toggleFloat, closeFloat,
  };
})();
