// Chat — Gun.js real-time P2P chat + inline Radio + YouTube embed
const Chat = (() => {

  // ── Gun.js setup ──────────────────────────────────────────────────────
  // Verifiserte oppe 2026-06-28 (funksjonell relay-test). Legacy heroku/wallie
  // er sovna (Heroku free-tier borte) — haldne som fallback om dei vaknar.
  const GUN_PEERS = [
    'https://relay.peer.ooo/gun',              // ✓ browser-verifisert oppe
    'https://gun.defucc.me/gun',               // ✓ browser-verifisert oppe
    'https://gun-manhattan.herokuapp.com/gun', // legacy fallback (kan vakne)
    'https://peer.wallie.io/gun',              // legacy fallback (kan vakne)
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
  let ytVideoId   = localStorage.getItem('pv_yt_stream') || '';
  let activeTab   = 'radio';
  let radioSearchResults = [];
  let radioSearchTimer   = null;

  // ── Floating window state ─────────────────────────────────────────────
  let floatAbort = null;
  let _inputListenersAttached = false;
  let _msgSubscribed = false;

  function defaultFloatState() {
    const w = Math.min(680, window.innerWidth - 32);
    const h = Math.min(520, window.innerHeight - 120);
    return { x: Math.max(0, window.innerWidth - w - 16), y: 76, w, h, minimized: false };
  }

  let floatState = JSON.parse(localStorage.getItem('pv_chat_float') || 'null') || defaultFloatState();
  let chatMinimized = floatState.minimized || false;

  function saveFloatState() {
    localStorage.setItem('pv_chat_float', JSON.stringify(floatState));
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
      if (btn) { btn.textContent = '+'; btn.title = 'Utvid'; }
    }
  }

  function toggleMinimize() {
    const win = document.getElementById('chat-float-window');
    const btn = document.getElementById('chat-minimize-btn');
    if (!win) return;
    chatMinimized = !chatMinimized;
    win.classList.toggle('minimized', chatMinimized);
    if (btn) { btn.textContent = chatMinimized ? '+' : '—'; btn.title = chatMinimized ? 'Utvid' : 'Minimer'; }
    floatState.minimized = chatMinimized;
    saveFloatState();
  }

  function randomColor() {
    const colors = ['#a78bfa','#60a5fa','#34d399','#f472b6','#fb923c','#38bdf8','#c084fc','#4ade80'];
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

  // ── YouTube helpers ───────────────────────────────────────────────────
  function extractYtId(input) {
    if (!input) return null;
    const patterns = [
      /(?:v=|\/v\/|youtu\.be\/|\/embed\/|\/live\/)([A-Za-z0-9_-]{11})/,
      /^([A-Za-z0-9_-]{11})$/,
    ];
    for (const p of patterns) {
      const m = input.match(p);
      if (m) return m[1];
    }
    return null;
  }

  function buildEmbedUrl(videoId) {
    return `https://www.youtube.com/embed/${videoId}?autoplay=0&modestbranding=1&rel=0&playsinline=1`;
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
    const stations    = (typeof Radio !== 'undefined' && Radio.stations) ? Radio.stations : [];
    const currentSt   = (typeof Radio !== 'undefined') ? Radio.currentStation : null;
    const radioPlaying = (typeof Radio !== 'undefined') ? Radio.isPlaying : false;

    const tmp = document.createElement('div');
    tmp.innerHTML = `<div id="chat-float-window" class="chat-float-window">
      <div id="chat-float-drag-bar" class="chat-float-drag-bar">
        <span class="chat-float-grip" aria-hidden="true">${Icon('grip')}</span>
        <span class="chat-float-title">${Icon('radio')} Sound Core — Live Chat</span>
        <button class="chat-float-btn" id="chat-minimize-btn" onclick="Chat.toggleMinimize()" title="Minimer">—</button>
      </div>
      <div class="chat-page">
        <div class="chat-stream-panel">
          <div class="chat-panel-tabs">
            <button class="chat-panel-tab ${activeTab === 'radio' ? 'active' : ''}" id="tab-radio" onclick="Chat.showTab('radio')">${Icon('radio')} Radio</button>
            <button class="chat-panel-tab ${activeTab === 'youtube' ? 'active' : ''}" id="tab-youtube" onclick="Chat.showTab('youtube')">${Icon('tv')} YouTube</button>
          </div>
          <div class="chat-radio-tab" id="chat-radio-tab" style="${activeTab !== 'radio' ? 'display:none' : ''}">
            <div class="chat-radio-search-wrap">
              <input class="chat-radio-search-input" id="chat-radio-search"
                     placeholder="Søk etter radiokanal…" autocomplete="off"
                     oninput="Chat.onRadioSearch(this.value)">
              <div class="chat-radio-search-results hidden" id="chat-radio-search-results"></div>
            </div>
            <div class="chat-radio-list" id="chat-radio-list">
              ${stations.length ? stations.map(s => `
                <button class="chat-radio-station ${currentSt?.id === s.id ? 'active' : ''}"
                        id="crbtn-${s.id}" style="--scolor:${s.color}"
                        onclick="Chat.playRadioStation('${s.id}')">
                  <span class="crs-emoji">${iconForEmoji(s.emoji)}</span>
                  <span class="crs-info">
                    <span class="crs-name">${s.name}</span>
                    <span class="crs-desc">${s.desc}</span>
                  </span>
                  ${currentSt?.id === s.id && radioPlaying ? '<span class="station-live-dot"></span>' : ''}
                </button>`).join('') : '<div class="crs-empty-hint">Søk etter en kanal ↑</div>'}
            </div>
            <div class="chat-radio-now-playing" id="chat-radio-np">
              <span id="chat-rnp-emoji">${iconForEmoji(currentSt && currentSt.emoji, 'radio')}</span>
              <span id="chat-rnp-name">${currentSt ? currentSt.name : 'Velg en stasjon ▲'}</span>
              <button class="chat-rnp-play-btn" id="chat-rnp-play" onclick="Chat.toggleRadioPlay()">
                ${currentSt && radioPlaying ? '⏸' : '▶'}
              </button>
            </div>
          </div>
          <div class="chat-yt-tab" id="chat-yt-tab" style="${activeTab !== 'youtube' ? 'display:none' : ''}">
            <div class="chat-stream-header">
              <span class="yt-live-badge">● LIVE</span>
              <input class="form-input stream-url-input" id="yt-url-input"
                placeholder="Lim inn YouTube Live URL…"
                value="${ytVideoId ? 'https://www.youtube.com/watch?v=' + ytVideoId : ''}"
                style="font-size:0.82rem">
              <button class="btn btn-primary btn-sm" onclick="Chat.loadYoutube()">Last inn</button>
              <button class="btn btn-ghost btn-sm" onclick="Chat.clearYoutube()" title="Fjern">${Icon('x')}</button>
            </div>
            <div id="yt-iframe-wrap">
              ${ytVideoId
                ? `<iframe src="${buildEmbedUrl(ytVideoId)}" allowfullscreen allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture;web-share"></iframe>`
                : `<div class="yt-placeholder"><div class="yt-icon">${Icon('play')}</div><p>Lim inn en YouTube Live-lenke ovenfor.</p></div>`}
            </div>
          </div>
        </div>
        <div class="chat-panel">
          <div class="chat-header">
            <h2>${Icon('message')} Chat</h2>
            <div class="online-count"><span class="online-dot"></span><span id="online-count">Live</span></div>
            <button class="btn-icon" title="Tøm chat" onclick="Chat.clearMessages()">${Icon('trash')}</button>
          </div>
          <div class="nick-bar" id="nick-bar">
            <label>Nick:</label>
            <div class="nick-display ${nickChosen ? '' : 'hidden'}" id="nick-display" onclick="Chat.showNickEdit()">
              <span style="color:${myColor}">●</span>
              <span>${myNick}</span>
              <span style="font-size:0.75rem;color:var(--text3)">${Icon('edit')}</span>
            </div>
            <div class="nick-edit-form ${!nickChosen ? '' : 'hidden'}" id="nick-edit-form">
              <input class="form-input" id="nick-input" value="${myNick}" maxlength="24" placeholder="Ditt nick" style="font-size:0.82rem">
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
              <label class="chat-color-swatch" style="background:${myColor}" title="Velg tekstfarge">
                <input type="color" id="quick-color-picker" value="${myColor}"
                       oninput="Chat.quickColor(this.value)" onchange="Chat.quickColor(this.value)">
              </label>
              <input id="chat-text" placeholder="Skriv en melding… (Enter)" maxlength="400" autocomplete="off">
              <button id="chat-send" onclick="Chat.sendMessage()">${Icon('send')}</button>
            </div>
            <div class="chat-status" id="chat-status">${connected ? '🟢 Tilkoblet' : '🟡 Kobler til…'}</div>
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
    if (gun) { subscribeMessages(); updateStatus('🟢 Tilkoblet via P2P'); } else { useFallback(); }
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

    const stations    = (typeof Radio !== 'undefined' && Radio.stations) ? Radio.stations : [];
    const currentSt   = (typeof Radio !== 'undefined') ? Radio.currentStation : null;
    const radioPlaying = (typeof Radio !== 'undefined') ? Radio.isPlaying : false;

    app.innerHTML = `
      <div id="chat-float-window" class="chat-float-window">
        <div id="chat-float-drag-bar" class="chat-float-drag-bar">
          <span class="chat-float-grip" aria-hidden="true">${Icon('grip')}</span>
          <span class="chat-float-title">${Icon('radio')} Sound Core — Live Chat</span>
          <button class="chat-float-btn" id="chat-minimize-btn" onclick="Chat.toggleMinimize()" title="Minimer">—</button>
        </div>

        <div class="chat-page">

        <!-- ── LEFT: Radio + YouTube tabs ── -->
        <div class="chat-stream-panel">

          <!-- Tab switcher -->
          <div class="chat-panel-tabs">
            <button class="chat-panel-tab ${activeTab === 'radio' ? 'active' : ''}" id="tab-radio" onclick="Chat.showTab('radio')">${Icon('radio')} Radio</button>
            <button class="chat-panel-tab ${activeTab === 'youtube' ? 'active' : ''}" id="tab-youtube" onclick="Chat.showTab('youtube')">${Icon('tv')} YouTube</button>
          </div>

          <!-- RADIO TAB -->
          <div class="chat-radio-tab" id="chat-radio-tab" style="${activeTab !== 'radio' ? 'display:none' : ''}">
            <div class="chat-radio-search-wrap">
              <input class="chat-radio-search-input" id="chat-radio-search"
                     placeholder="Søk etter radiokanal…" autocomplete="off"
                     oninput="Chat.onRadioSearch(this.value)">
              <div class="chat-radio-search-results hidden" id="chat-radio-search-results"></div>
            </div>

            <div class="chat-radio-list" id="chat-radio-list">
              ${stations.length ? stations.map(s => `
                <button class="chat-radio-station ${currentSt?.id === s.id ? 'active' : ''}"
                        id="crbtn-${s.id}"
                        style="--scolor:${s.color}"
                        onclick="Chat.playRadioStation('${s.id}')">
                  <span class="crs-emoji">${iconForEmoji(s.emoji)}</span>
                  <span class="crs-info">
                    <span class="crs-name">${s.name}</span>
                    <span class="crs-desc">${s.desc}</span>
                  </span>
                  ${currentSt?.id === s.id && radioPlaying ? '<span class="station-live-dot"></span>' : ''}
                </button>
              `).join('') : '<div class="crs-empty-hint">Søk etter en kanal ovenfor ↑</div>'}
            </div>

            <!-- Now-playing footer -->
            <div class="chat-radio-now-playing" id="chat-radio-np">
              <span id="chat-rnp-emoji">${iconForEmoji(currentSt && currentSt.emoji, 'radio')}</span>
              <span id="chat-rnp-name">${currentSt ? currentSt.name : 'Velg en stasjon ▲'}</span>
              <button class="chat-rnp-play-btn" id="chat-rnp-play" onclick="Chat.toggleRadioPlay()">
                ${currentSt && radioPlaying ? '⏸' : '▶'}
              </button>
            </div>
          </div>

          <!-- YOUTUBE TAB -->
          <div class="chat-yt-tab" id="chat-yt-tab" style="${activeTab !== 'youtube' ? 'display:none' : ''}">
            <div class="chat-stream-header">
              <span class="yt-live-badge">● LIVE</span>
              <input class="form-input stream-url-input" id="yt-url-input"
                placeholder="Lim inn YouTube Live URL…"
                value="${ytVideoId ? 'https://www.youtube.com/watch?v=' + ytVideoId : ''}"
                style="font-size:0.82rem">
              <button class="btn btn-primary btn-sm" onclick="Chat.loadYoutube()">Last inn</button>
              <button class="btn btn-ghost btn-sm" onclick="Chat.clearYoutube()" title="Fjern">${Icon('x')}</button>
            </div>
            <div id="yt-iframe-wrap">
              ${ytVideoId
                ? `<iframe src="${buildEmbedUrl(ytVideoId)}" allowfullscreen allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture;web-share"></iframe>`
                : `<div class="yt-placeholder">
                    <div class="yt-icon">${Icon('play')}</div>
                    <p>Lim inn en YouTube Live-lenke ovenfor og klikk <strong>Last inn</strong>.</p>
                    <div class="text-muted text-xs" style="margin-top:0.5rem">Eks: https://www.youtube.com/watch?v=XXXXXXXXXX</div>
                  </div>`}
            </div>
          </div>
        </div>

        <!-- ── RIGHT: Chat ── -->
        <div class="chat-panel">
          <div class="chat-header">
            <h2>${Icon('message')} Chat</h2>
            <div class="online-count">
              <span class="online-dot"></span>
              <span id="online-count">Live</span>
            </div>
            <button class="btn-icon" title="Tøm chat" onclick="Chat.clearMessages()">${Icon('trash')}</button>
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
              <input class="form-input" id="nick-input" value="${myNick}" maxlength="24" placeholder="Ditt nick" style="font-size:0.82rem">
              <div class="nick-color-wrap" title="Velg farge på nick og tekst">
                <input type="color" id="nick-color" value="${myColor}"
                       style="width:32px;height:32px;border:none;border-radius:50%;cursor:pointer;padding:2px;background:none">
              </div>
              <button class="btn btn-primary btn-sm" onclick="Chat.saveNick()">OK</button>
            </div>
          </div>

          <!-- Messages -->
          <div id="chat-messages">
            <div class="chat-system-msg">Kobler til chat… ${Icon('link')}</div>
          </div>

          <!-- Input -->
          <div class="chat-input-area">
            <div class="emoji-bar">
              ${EMOJIS.map(e => `<button class="emoji-pill" onclick="Chat.insertEmoji('${e}')">${e}</button>`).join('')}
            </div>
            <div class="chat-input-row">
              <label class="chat-color-swatch" style="background:${myColor}" title="Velg tekstfarge (klikk)">
                <input type="color" id="quick-color-picker" value="${myColor}"
                       oninput="Chat.quickColor(this.value)" onchange="Chat.quickColor(this.value)">
              </label>
              <input id="chat-text" placeholder="Skriv en melding… (Enter for å sende)" maxlength="400" autocomplete="off">
              <button id="chat-send" onclick="Chat.sendMessage()">${Icon('send')}</button>
            </div>
            <div class="chat-status" id="chat-status">
              ${connected ? '🟢 Tilkoblet' : '🟡 Kobler til…'}
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
      updateStatus('🟢 Tilkoblet via P2P');
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

  // ── Tab switching ─────────────────────────────────────────────────────
  function showTab(tab) {
    activeTab = tab;
    const radioEl   = document.getElementById('chat-radio-tab');
    const ytEl      = document.getElementById('chat-yt-tab');
    const radioBtn  = document.getElementById('tab-radio');
    const ytBtn     = document.getElementById('tab-youtube');
    if (tab === 'radio') {
      if (radioEl) radioEl.style.display = '';
      if (ytEl)    ytEl.style.display    = 'none';
      radioBtn?.classList.add('active');
      ytBtn?.classList.remove('active');
    } else {
      if (radioEl) radioEl.style.display = 'none';
      if (ytEl)    ytEl.style.display    = '';
      ytBtn?.classList.add('active');
      radioBtn?.classList.remove('active');
    }
  }

  // ── Radio integration ─────────────────────────────────────────────────
  function playRadioStation(id) {
    if (typeof Radio === 'undefined') return;
    Radio.playStation(id);
    setTimeout(updateChatRadioUI, 200);
  }

  function toggleRadioPlay() {
    if (typeof Radio === 'undefined') return;
    Radio.togglePlay();
    setTimeout(updateChatRadioUI, 200);
  }

  function updateChatRadioUI() {
    if (typeof Radio === 'undefined') return;
    const st = Radio.currentStation;
    // Update active station button
    document.querySelectorAll('.chat-radio-station').forEach(b => b.classList.remove('active'));
    if (st) {
      const activeBtn = document.getElementById('crbtn-' + st.id);
      if (activeBtn) activeBtn.classList.add('active');
    }
    // Update now-playing bar
    const emojiEl = document.getElementById('chat-rnp-emoji');
    const nameEl  = document.getElementById('chat-rnp-name');
    const playEl  = document.getElementById('chat-rnp-play');
    if (st) {
      if (emojiEl) emojiEl.innerHTML = iconForEmoji(st.emoji, 'radio');
      if (nameEl)  nameEl.textContent  = st.name  || 'Radio';
    }
    if (playEl) playEl.textContent = Radio.isPlaying ? '⏸' : '▶';
  }

  async function onRadioSearch(val) {
    clearTimeout(radioSearchTimer);
    const resultsEl = document.getElementById('chat-radio-search-results');
    if (!val || val.length < 2) {
      radioSearchResults = [];
      if (resultsEl) resultsEl.classList.add('hidden');
      return;
    }
    radioSearchTimer = setTimeout(async () => {
      if (resultsEl) {
        resultsEl.classList.remove('hidden');
        resultsEl.innerHTML = '<div class="crs-loading">Søker…</div>';
      }
      if (typeof Radio === 'undefined') { if (resultsEl) resultsEl.innerHTML = '<div class="crs-empty">Radio ikke tilgjengelig</div>'; return; }
      radioSearchResults = await Radio.fetchStations(val);
      if (!resultsEl) return;
      if (!radioSearchResults.length) {
        resultsEl.innerHTML = '<div class="crs-empty">Ingen kanaler funnet</div>';
        return;
      }
      resultsEl.innerHTML = radioSearchResults.map((s, i) => `
        <div class="crs-result" onclick="Chat.playSearchRadio(${i})">
          <div class="crs-result-name">${escHtml(s.name)}</div>
          <div class="crs-result-meta">${escHtml(s.country || '')}${s.tags ? ' · ' + s.tags.split(',').slice(0,2).join(', ') : ''}</div>
        </div>
      `).join('');
    }, 350);
  }

  function playSearchRadio(i) {
    const s = radioSearchResults[i];
    if (!s || !s.url_resolved) { App.toast('Ingen gyldig stream-URL', 'error'); return; }
    if (typeof Radio === 'undefined') return;
    const stInfo = {
      id:    'search_' + s.stationuuid,
      name:  s.name,
      emoji: '📡',
      color: '#7c3aed',
      desc:  [s.country, s.tags?.split(',')[0]].filter(Boolean).join(' · ') || 'Nettradio',
    };
    Radio.playUrl(s.url_resolved, stInfo);
    setTimeout(updateChatRadioUI, 200);
    const resultsEl = document.getElementById('chat-radio-search-results');
    if (resultsEl) resultsEl.classList.add('hidden');
    const searchEl = document.getElementById('chat-radio-search');
    if (searchEl) searchEl.value = '';
    App.toast(`Spiller: ${s.name}`, 'success');
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
  function subscribeMessages() {
    if (!messagesRef || _msgSubscribed) return;
    _msgSubscribed = true;
    const msgs = document.getElementById('chat-messages');
    if (!msgs) return;
    msgs.innerHTML = '';
    const rendered = new Set();
    messagesRef.map().on((msg, key) => {
      if (!msg || !msg.text || rendered.has(key)) return;
      rendered.add(key);
      appendMessage(msg);
    });
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
        <span class="chat-msg-nick ${isSelf ? 'is-self' : ''}" style="color:${msg.color || '#7c3aed'}">${escHtml(msg.nick)}:</span>
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
    if (!myNick) { showNickEdit(); App.toast('Sett et nick først', 'info'); return; }
    const now = Date.now();
    if (now - lastSent < 800) { App.toast('Ikke så fort! ⚡', 'info'); return; }
    lastSent = now;
    const msg = { nick: myNick, color: myColor, text, ts: now, type: 'msg' };
    if (gun && messagesRef) {
      messagesRef.set(msg);
    } else {
      appendMessage(msg);
      saveFallbackMsg(msg);
    }
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
    if (!newNick || newNick.length < 2) { App.toast('Nick må være minst 2 tegn', 'error'); return; }
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
      const sysMsg = { type:'system', text:`${oldNick} er nå ${myNick}`, ts: Date.now() };
      if (gun && messagesRef) messagesRef.set(sysMsg);
      else appendMessage(sysMsg);
    }
    App.toast(`Nick satt til ${myNick} ${Icon('palette')}`, 'success');
  }

  function clearMessages() {
    const container = document.getElementById('chat-messages');
    if (container) container.innerHTML = '<div class="chat-system-msg">Chat tømt lokalt</div>';
  }

  // ── YouTube ───────────────────────────────────────────────────────────
  function loadYoutube() {
    const input = document.getElementById('yt-url-input')?.value?.trim();
    const id    = extractYtId(input);
    if (!id) { App.toast('Ugyldig YouTube URL', 'error'); return; }
    ytVideoId = id;
    localStorage.setItem('pv_yt_stream', id);
    const wrap = document.getElementById('yt-iframe-wrap');
    if (wrap) wrap.innerHTML = `<iframe src="${buildEmbedUrl(id)}" allowfullscreen allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture;web-share"></iframe>`;
    App.toast('Stream lastet inn!', 'success');
  }

  function clearYoutube() {
    ytVideoId = '';
    localStorage.removeItem('pv_yt_stream');
    const wrap = document.getElementById('yt-iframe-wrap');
    if (wrap) wrap.innerHTML = `<div class="yt-placeholder"><div class="yt-icon">${Icon('play')}</div><p>Lim inn en YouTube Live-lenke ovenfor.</p></div>`;
    const urlInput = document.getElementById('yt-url-input');
    if (urlInput) urlInput.value = '';
  }

  // ── Status + Fallback ─────────────────────────────────────────────────
  function updateStatus(text) {
    const el = document.getElementById('chat-status');
    if (el) el.textContent = text;
  }

  const FALLBACK_KEY = 'pv_chat_fallback';

  function useFallback() {
    updateStatus('🟡 Offline-modus (kun lokal)');
    const msgs = JSON.parse(localStorage.getItem(FALLBACK_KEY) || '[]');
    const container = document.getElementById('chat-messages');
    if (container) {
      container.innerHTML = '<div class="chat-system-msg">Offline-modus — meldinger lagres lokalt</div>';
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
    loadYoutube, clearYoutube,
    showTab, playRadioStation, toggleRadioPlay, updateChatRadioUI,
    onRadioSearch, playSearchRadio, quickColor, toggleMinimize, toggleFloat,
  };
})();
