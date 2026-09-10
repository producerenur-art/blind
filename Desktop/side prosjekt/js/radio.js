// Radio — Electronic music streams + Web Audio API visualizer
const Radio = (() => {

  // ── External player embeds (iframe) ──────────────────────────────────
  const EXTERNAL_PLAYERS = [
    {
      id: 'dice-radio',
      name: 'Dice Radio',
      emoji: '🎲',
      color: '#1d4ed8',
      desc: 'Greek electronic & underground radio',
      url: 'https://www.diceradio.gr/',
      live: true,
    },
  ];

  // ── Station catalogue ─────────────────────────────────────────────────
  // Energy order: Psytrance (high) → Dark Drone (deep/low)
  // ✓ = 100 % free, no account needed
  const STATIONS = [

    // ════════════════════════════════════════════
    // radiOzora — OZORA Festival Radio (Airtime · live now-playing)
    // ════════════════════════════════════════════
    {
      id: 'radiozora-trance', cat: 'radiOzora',
      name: 'radiOzora Trance',
      url:   'https://trance.out.airtime.pro/trance_a',
      npApi: 'https://trance.airtime.pro/api/live-info-v2',
      emoji: '🔥', color: '#f97316',
      desc: 'OZORA Festival radio — psytrance 24/7 · Budapest 🇭🇺',
      featured: true,
    },
    {
      // Verifisert 07.09.2026: chill.out.airtime.pro/chill_a svarer 200, og
      // chill.airtime.pro/api/live-info-v2 gir ekte live-info — same mønster
      // som radiOzora Trance over (radiOzora har kun disse to kanalene).
      id: 'radiozora-chill', cat: 'radiOzora',
      name: 'radiOzora Chill',
      url:   'https://chill.out.airtime.pro/chill_a',
      npApi: 'https://chill.airtime.pro/api/live-info-v2',
      emoji: '🌿', color: '#22c55e',
      desc: 'OZORA Festival radio — chill & downtempo 24/7 · Budapest 🇭🇺',
    },

    // ════════════════════════════════════════════
    // PSYTRANCE / GOA  ▲ høyest energi
    // ════════════════════════════════════════════
    {
      id: 'dmtfm', cat: 'Psytrance / Goa',
      name: 'DMT FM — Psytrance 24/7',
      url:  'https://dc1.serverse.com/proxy/ywycfrxn/stream',
      emoji: '🍄', color: '#22c55e',
      desc: 'Psytrance · Goa · Psychedelic trance — Tenerife ✓',
    },
    {
      id: 'psyndora', cat: 'Psytrance / Goa',
      name: 'Psyndora Psytrance',
      // Port 9111 har utgått TLS-sertifikat → nettlesaren blokkerte strøymen.
      // /sc/-stien på same vert har gyldig sertifikat og same lyd.
      url:  'https://cast.magicstreams.gr/sc/psyndora/stream',
      emoji: '🧿', color: '#06b6d4',
      desc: 'Psytrance · Progressive · Goa · Fullon ✓',
    },
    {
      id: 'babaganousha', cat: 'Psytrance / Goa',
      name: 'Babaganousha Radio',
      url:  'https://babaganousha.net:8443/stream/1/',
      emoji: '🌌', color: '#4ade80',
      desc: 'Psychedelic · Goa · Psytrance ✓',
    },
    {
      id: 'babaganousha-labs', cat: 'Psytrance / Goa',
      name: 'Babaganousha Labs',
      url:  'https://babaganousha.net:9443/stream/1/',
      emoji: '🧪', color: '#4ade80',
      desc: 'Psychedelic · Goa · Psytrance ✓',
    },

    // ════════════════════════════════════════════
    // PROGRESSIVE PSY / TRANCE
    // ════════════════════════════════════════════
    {
      id: 'trancearound', cat: 'Progressive Psy / Trance',
      name: 'TranceAround.FM',
      url:  'https://strm112.1.fm/trance_mobile_mp3',
      emoji: '🌀', color: '#9333ea',
      desc: '1.FM — trance around the clock',
    },
    {
      id: 'atr', cat: 'Progressive Psy / Trance',
      name: 'Amsterdam Trance Radio',
      url:  'https://strm112.1.fm/atr_mobile_mp3',
      emoji: '🎚️', color: '#22c55e',
      desc: '1.FM — uplifting & progressive trance',
    },
    {
      id: 'rr-progressive', cat: 'Progressive Psy / Trance',
      name: 'Radio Record — Progressive House',
      url:  'https://radiorecord.hostingradio.ru/progr96.aacp',
      emoji: '🎛️', color: '#2563eb',
      desc: 'Progressive house, non-stop',
    },

    // ════════════════════════════════════════════
    // PSYBIENT / PSYCHILL
    // ════════════════════════════════════════════
    {
      id: 'ambientpsy-1fm', cat: 'Psybient / Psychill',
      name: 'Ambient Psychill (1.FM)',
      url:  'https://strm112.1.fm/ambientpsy_mobile_mp3',
      emoji: '🌫️', color: '#8854d0',
      desc: '1.FM — ambient psychill 24/7',
    },
    {
      id: 'multihuman', cat: 'Psybient / Psychill',
      name: 'MultiHuman EntheoMusic',
      url:   'https://libretime.multihuman.com.br:8443/main',
      npApi: 'https://libretime.multihuman.com.br:8443/status-json.xsl',
      npType:'icecast',
      emoji: '🌿', color: '#10b981',
      desc: 'Entheogenic psychill & world — Brazil 🇧🇷',
    },

    // ════════════════════════════════════════════
    // CHILL OUT / DOWNTEMPO
    // ════════════════════════════════════════════
    {
      id: '1fm-chillout', cat: 'Chill Out / Downtempo',
      name: '1.FM Chillout Lounge',
      url:  'https://strm112.1.fm/chilloutlounge_mobile_mp3',
      emoji: '🛋️', color: '#0ea5e9',
      desc: '1.FM — electronic chill lounge 24/7',
    },
    {
      id: 'smoothchill', cat: 'Chill Out / Downtempo',
      name: 'Smooth Chill',
      url:  'https://media-ssl.musicradio.com/SmoothChillMP3',
      emoji: '🫧', color: '#0ea5e9',
      desc: 'Relaxing chill & soul — UK 🇬🇧',
    },
  ];

  // Group by category
  const CATEGORIES = [...new Set(STATIONS.map(s => s.cat))];

  // Stabil DOM-id per kategori, så andre sider kan lenke rett til ein sjanger-bolk
  // (t.d. Discover-kortet «Chill Afternoon» → «Chill Out / Downtempo»).
  const catId = cat => 'radio-cat-' + String(cat).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  // State
  let currentStation = null;
  let isPlaying = false;
  let volume = 0.8;
  let muted = false;
  let preMuteVolume = 0.8;
  let npPollTimer = null;   // live now-playing poll (radiOzora / Airtime stations)
  let audioCtx = null;
  let analyser = null;
  let sourceNode = null;
  let visFrame = null;
  let visMode = 'video'; // standard: lydløs 4K Kosmos-video | 'fractal' | 'wormhole' | ... | 'video8' | 'bars' | 'circle' | 'wave' | 'particles'
  // WebGL-visualiseringer (selv-animerende, lydfrie — kjører på tid alene)
  let fxCanvas = null, fxGl = null, fxFrame = null, fxBuf = null;
  let fxClock = 0, fxLastTs = 0, fxProgs = {}; // fxProgs[mode] = {prog, uni}
  let visSize = localStorage.getItem('pv_vis_size') || 'medium'; // 'small'|'medium'|'large'|'full'
  // Egen farge (felles for ALLE modusene): null = regnbue/auto, ellers en fast hue 0..359.
  let visHue = localStorage.getItem('pv_vis_hue');
  visHue = (visHue === null || visHue === '') ? null : (parseInt(visHue, 10) || 0);
  // Fart: skalerer tids-/bevegelses-tempoet i alle modusene (0.15× sakte → 3× rask).
  let visSpeed = parseFloat(localStorage.getItem('pv_vis_speed')) || 1;
  let canvas = null, visCtx = null;
  let customStreams = JSON.parse(localStorage.getItem('pv_custom_streams') || '[]');
  let searchTimer = null;
  let searchResults = [];
  let searchSeq = 0;        // guards against a slow earlier search overwriting a newer one
  let aiHistory = [];
  let aiOpen = false;
  let embedAbort = null; // AbortController for the resizable embed-pane drag listeners

  // ── Electronic lock ───────────────────────────────────────────────────
  // The whole site is locked to electronic music, so the radio search is too.
  // A web result only passes if it carries one of these genre tags (exact tag
  // token) or its name hints at electronic — everything else is filtered out.
  // Verten blir vald av StreamFix.api (med mirror-fallback), så her berre spørjinga.
  const QOPTS = 'limit=40&order=votes&reverse=true&hidebroken=true';
  const ELECTRONIC_TAGS = new Set([
    'electronic','electronica','edm','dance','psytrance','goa','trance','progressive',
    'progressive trance','progressive house','house','deep house','tech house','techno',
    'minimal','minimal techno','melodic techno','acid','acid house','ambient','psybient',
    'psychill','chillout','chill out','chill','downtempo','dub','dub techno','dubstep',
    'drum and bass','drum n bass','dnb','jungle','breakbeat','breaks','idm','drone',
    'dark ambient','synthwave','synthpop','electro','electro house','trip-hop','trip hop',
    'lounge','nu disco','disco','club','rave','hardstyle','hardcore','gabber','future bass',
    'garage','uk garage','big room','organic house','glitch','bass','dancehall electronic',
  ]);
  const ELECTRONIC_NAME_HINTS = [
    'psy','trance','goa','techno','house','electro','ambient','edm','dnb','dub','chill',
    'downtempo','progressive','rave','synth','electronic','dance','club','beats','deep',
  ];

  function normStr(str) {
    return String(str || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }
  function isElectronicStation(s) {
    const tags = (s.tags || '').toLowerCase().split(',').map(t => t.trim()).filter(Boolean);
    if (tags.some(t => ELECTRONIC_TAGS.has(t))) return true;
    const name = (s.name || '').toLowerCase();
    return ELECTRONIC_NAME_HINTS.some(t => name.includes(t));
  }

  // Curated on-site stations matching the query ("alt som er på siden fra før").
  function matchLocalStations(query) {
    const q = normStr(query);
    if (q.length < 2) return [];
    return STATIONS.filter(s => normStr(`${s.name} ${s.desc} ${s.cat}`).includes(q));
  }

  function toLocalResult(s) {
    return { rk: 'local', id: s.id, name: s.name, url: s.url, emoji: s.emoji, color: s.color, meta: s.cat };
  }
  function toWebResult(s) {
    const meta = [s.country, (s.tags || '').split(',').slice(0, 2).map(t => t.trim()).filter(Boolean).join(', ')]
      .filter(Boolean).join(' · ') || 'Web radio';
    return { rk: 'web', uuid: s.stationuuid, name: s.name, url: s.url_resolved, meta };
  }

  // Search the whole web of radio (Radio Browser) but LOCKED to electronic.
  // Queries both name + tag in parallel so "psy" finds psytrance-tagged stations
  // too, then keeps only electronic ones.
  async function fetchElectronic(term) {
    const q = encodeURIComponent(term);
    const [byTag, byName] = await Promise.all([
      StreamFix.api(`/json/stations/search?tag=${q}&${QOPTS}`),
      StreamFix.api(`/json/stations/search?name=${q}&${QOPTS}`),
    ]);
    if (byTag === null && byName === null) throw new Error('Radio Browser unreachable');
    const seen = new Set(), seenUrl = new Set(), out = [];
    for (const s of [...(byTag || []), ...(byName || [])]) {
      if (!s.url_resolved || seen.has(s.stationuuid) || !isElectronicStation(s)) continue;
      // Same strøym ligg ofte inne under mange oppføringar (skrivefeil, duplikat) —
      // dedupliser på sjølve URL-en, ikkje berre uuid.
      const url = StreamFix.normalize(s.url_resolved);
      if (seenUrl.has(url) || !StreamFix.playable(url)) continue;
      seen.add(s.stationuuid); seenUrl.add(url);
      out.push({ ...s, url_resolved: url });
    }
    out.sort((a, b) => (b.votes || 0) - (a.votes || 0));
    return out.slice(0, 30);
  }

  // ── Live search (debounced typing) — electronic only + on-site stations ──
  async function searchRadio(query) {
    const el   = document.getElementById('radio-search-results');
    const note = document.getElementById('radio-search-ai-note');
    query = (query || '').trim();
    if (query.length < 2) {
      searchResults = [];
      if (el) { el.classList.add('hidden'); el.innerHTML = ''; }
      if (note) note.classList.add('hidden');
      return;
    }
    if (note) note.classList.add('hidden');  // plain typing → no AI note
    const mySeq = ++searchSeq;
    if (el) { el.classList.remove('hidden'); el.innerHTML = '<div class="radio-search-loading">Searching electronic stations…</div>'; }
    const local = matchLocalStations(query).map(toLocalResult);
    try {
      const web = (await fetchElectronic(query)).map(toWebResult);
      if (mySeq !== searchSeq) return;
      searchResults = [...local, ...web];
      renderSearchResults(searchResults);
    } catch (e) {
      if (mySeq !== searchSeq) return;
      searchResults = local;
      if (local.length) renderSearchResults(searchResults);
      else if (el) el.innerHTML = '<div class="radio-search-empty">Could not fetch results</div>';
    }
  }

  // ── AI-powered search (Enter / ✨-knapp) ─────────────────────────────────
  // The AI reads the free-text request in any language, turns it into electronic
  // genre terms, then we search the whole web locked to electronic + on-site.
  async function aiSearch() {
    const input = document.getElementById('radio-search-input');
    const query = (input?.value || '').trim();
    if (query.length < 2) return;
    const el   = document.getElementById('radio-search-results');
    const note = document.getElementById('radio-search-ai-note');
    if (el) { el.classList.remove('hidden'); el.innerHTML = '<div class="radio-search-loading">Searching electronic web radios…</div>'; }
    if (note) { note.classList.remove('hidden'); note.innerHTML = `${Icon('sparkles')} <span>Interpreting your search with AI…</span>`; }

    let terms = [query], msg = '';
    try {
      const r = await AI.radioSearch(query);
      if (r) { if (r.terms && r.terms.length) terms = r.terms; msg = r.note || ''; }
    } catch (e) { /* no key / no credits → fall back to plain electronic search */ }

    const mySeq = ++searchSeq;
    try {
      const local = matchLocalStations(query).map(toLocalResult);
      const lists = await Promise.all(terms.slice(0, 3).map(t => fetchElectronic(t)));
      if (mySeq !== searchSeq) return;
      const seen = new Set(); const web = [];
      for (const list of lists) for (const s of list) {
        if (seen.has(s.stationuuid)) continue;
        seen.add(s.stationuuid); web.push(toWebResult(s));
      }
      searchResults = [...local, ...web];
      if (note) {
        if (msg) { note.classList.remove('hidden'); note.innerHTML = `${Icon('sparkles')} <span>${escHtml(msg)}</span>`; }
        else note.classList.add('hidden');
      }
      renderSearchResults(searchResults);
    } catch (e) {
      if (mySeq !== searchSeq) return;
      if (el) el.innerHTML = '<div class="radio-search-empty">Could not fetch results</div>';
    }
  }

  function onSearchKey(e) {
    if (e.key === 'Enter') { clearTimeout(searchTimer); aiSearch(); }
  }

  function renderSearchResults(results) {
    const el = document.getElementById('radio-search-results');
    if (!el) return;
    if (!results.length) {
      el.innerHTML = '<div class="radio-search-empty">No electronic stations found</div>';
      return;
    }
    el.innerHTML = `<div class="radio-search-count">${results.length} stations</div>` + results.map((s, i) => {
      const active  = (s.rk === 'local' && currentStation?.id === s.id) ||
                      (s.rk === 'web'   && currentStation?.id === 'search_' + s.uuid);
      const playing = active && isPlaying;
      const off     = StreamFix.isDead(s.url);
      return `
      <div class="radio-search-item ${active ? 'active' : ''}${off ? ' rsx-item--offline' : ''}" onclick="Radio.playSearchResult(${i})">
        <span class="radio-search-item-emoji">${s.rk === 'local' ? iconForEmoji(s.emoji) : '📡'}</span>
        <div class="radio-search-item-info">
          <div class="radio-search-item-name">${escHtml(s.name)}${s.rk === 'local' ? ' <span class="radio-search-onsite">on site</span>' : ''}${off ? ' <span class="rsx-offline-tag">offline</span>' : ''}</div>
          <div class="radio-search-item-meta">${escHtml(s.meta || 'Web radio')}</div>
        </div>
        <div class="radio-search-item-actions">
          <button class="station-play-btn" title="Play / Stop" onclick="event.stopPropagation();Radio.playSearchResult(${i})">${playing ? '⏸' : '▶'}</button>
          <button class="station-vol-btn" title="Mute / Unmute" onclick="event.stopPropagation();Radio.toggleMute()">${muted ? '🔇' : '🔊'}</button>
          ${s.rk === 'web' ? `<button class="radio-search-save-btn" title="Save to your streams" onclick="event.stopPropagation();Radio.saveSearchResult(${i}, event)">＋</button>` : ''}
        </div>
      </div>`;
    }).join('');
  }

  function escHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function playSearchResult(i) {
    const s = searchResults[i];
    if (!s) return;
    if (s.rk === 'local') { playStation(s.id); return; }   // on-site station → normal flow
    if (!s.url) { App.toast('No valid stream URL', 'error'); return; }
    const station = {
      id: 'search_' + s.uuid, name: s.name, url: StreamFix.normalize(s.url),
      emoji: '📡', color: '#22c55e', desc: s.meta || 'Web radio',
      // Marker treffet som offline i lista når strøymen ikkje svarar, slik at
      // brukaren ikkje klikkar på same daude stasjon om att.
      onFail: (why) => {
        App.toast(`${s.name} is offline (${why})`, 'error');
        renderSearchResults(searchResults);
      },
    };
    currentStation = station;
    _playUrl(station.url, station);
    updateSidebarActiveState(station.id);
    updateNowPlaying(station);
    renderSearchResults(searchResults);   // refresh play/pause state in the list
  }

  function saveSearchResult(i, e) {
    e?.stopPropagation();
    const s = searchResults[i];
    if (!s || !s.url) { App.toast('No valid stream URL', 'error'); return; }
    if (customStreams.some(c => c.url === s.url)) { App.toast('Already saved', 'info'); return; }
    customStreams.push({ name: s.name, url: s.url });
    localStorage.setItem('pv_custom_streams', JSON.stringify(customStreams));
    App.toast(`"${s.name}" saved to Your streams`, 'success');
    // keep search results visible — don't re-render the whole page
  }

  function onSearchInput(val) {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => searchRadio(val.trim()), 350);
  }

  // ── AI Radio Assistant ────────────────────────────────────────────────
  function toggleAiChat() {
    aiOpen = !aiOpen;
    const chat    = document.getElementById('radio-ai-chat');
    const chevron = document.getElementById('radio-ai-chevron');
    if (chat)    chat.style.display = aiOpen ? 'flex' : 'none';
    if (chevron) chevron.textContent = aiOpen ? '▲' : '▼';
    if (aiOpen) document.getElementById('radio-ai-input')?.focus();
  }

  function onAiKeydown(e) {
    if (e.key === 'Enter') sendAiMessage();
  }

  function formatAiReply(text) {
    let html = escHtml(text);
    STATIONS.forEach(s => {
      const safe = escHtml(s.name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      html = html.replace(new RegExp(safe, 'gi'),
        `<button class="radio-ai-station-link" onclick="Radio.playStation('${s.id}')">${escHtml(s.name)}</button>`);
    });
    return html;
  }

  function appendAiMsg(role, text, loading = false) {
    const msgs = document.getElementById('radio-ai-messages');
    if (!msgs) return null;
    const div = document.createElement('div');
    div.className = `radio-ai-msg radio-ai-msg-${role}`;
    div.innerHTML = loading ? '<span class="radio-ai-typing"><span></span><span></span><span></span></span>' : formatAiReply(text);
    msgs.appendChild(div);
    msgs.scrollTop = msgs.scrollHeight;
    return div;
  }

  async function sendAiMessage() {
    const input = document.getElementById('radio-ai-input');
    const text  = input?.value?.trim();
    if (!text) return;
    input.value = '';

    appendAiMsg('user', text);
    aiHistory.push({ role: 'user', content: text });

    if (!AI.hasKey()) {
      const el = appendAiMsg('assistant', '');
      el.innerHTML = 'You need a Claude API key. Go to <a href="#/settings" style="color:#38bdf8">⚙️ Settings</a>.';
      return;
    }

    const loadEl = appendAiMsg('assistant', '', true);
    try {
      const reply = await AI.radioChat(aiHistory, STATIONS);
      aiHistory.push({ role: 'assistant', content: reply });
      loadEl.innerHTML = formatAiReply(reply);
      document.getElementById('radio-ai-messages').scrollTop = 9999;
    } catch (e) {
      loadEl.textContent = 'Sorry, something went wrong. Try again.';
    }
  }

  // ── Render page ───────────────────────────────────────────────────────
  function render() {
    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="radio-page" id="radio-page">
        <!-- SIDEBAR -->
        <div class="radio-sidebar">
          <div class="radio-sidebar-header">
            <img src="assets/logo-mark.svg?v=20260816-sfm" alt="" class="radio-sidebar-logo">
            <span class="radio-sidebar-title">Radio stations</span>
          </div>

          <!-- Search — AI-drevet, låst til elektronisk + kanalene på siden -->
          <div class="radio-search-wrap">
            <div class="radio-search-box">
              <span class="radio-search-icon">${Icon('search')}</span>
              <input
                type="text"
                id="radio-search-input"
                class="radio-search-input"
                placeholder="Search electronic radio – or ask AI…"
                autocomplete="off"
                oninput="Radio.onSearchInput(this.value)"
                onkeydown="Radio.onSearchKey(event)"
              >
              <button class="radio-ai-search-btn" title="AI search (ask in any language)" onclick="Radio.aiSearch()">${Icon('sparkles')}</button>
            </div>
            <div id="radio-search-ai-note" class="radio-search-ai-note hidden"></div>
            <div id="radio-search-results" class="radio-search-results hidden"></div>
          </div>
          ${(() => {
            const featured = STATIONS.find(s => s.featured);
            const featuredHtml = featured ? `
              <div class="stellar-featured-card" id="rbtn-${featured.id}" onclick="Radio.playStation('${featured.id}')">
                <div class="stellar-featured-glow" style="background:${featured.color}"></div>
                <div class="stellar-featured-inner">
                  <div class="stellar-featured-emoji">${iconForEmoji(featured.emoji)}</div>
                  <div class="stellar-featured-info">
                    <div class="stellar-featured-label">${Icon('star')} SiriusFM Main station</div>
                    <div class="stellar-featured-name">${featured.name}</div>
                    <div class="stellar-featured-desc">${featured.desc}</div>
                  </div>
                  <button class="stellar-featured-play" onclick="event.stopPropagation();Radio.playStation('${featured.id}')">
                    ${currentStation?.id === featured.id && isPlaying ? '⏸' : '▶'}
                  </button>
                </div>
                ${currentStation?.id === featured.id && isPlaying ? '<div class="stellar-live-bar"><span></span><span></span><span></span><span></span><span></span></div>' : ''}
              </div>` : '';
            const rest = CATEGORIES.filter(c => c !== 'Stellar').map(cat => `
              <div class="radio-category" id="${catId(cat)}">${cat}</div>
              ${STATIONS.filter(s => s.cat === cat).map(s => `
                <div
                  class="radio-station-btn ${currentStation?.id === s.id ? 'active' : ''}"
                  id="rbtn-${s.id}"
                  style="--station-color:${s.color}"
                  onclick="Radio.playStation('${s.id}')"
                >
                  <span class="station-emoji">${iconForEmoji(s.emoji)}</span>
                  <span class="station-info">
                    <span class="station-name">${s.name}</span>
                    <span class="station-desc">${s.desc}</span>
                  </span>
                  <div class="station-actions">
                    <button class="station-play-btn" title="Play / Stop" onclick="event.stopPropagation();Radio.playStation('${s.id}')">
                      ${currentStation?.id === s.id && isPlaying ? '⏸' : '▶'}
                    </button>
                    <button class="station-vol-btn" title="Mute / Unmute" onclick="event.stopPropagation();Radio.toggleMute()">
                      ${muted ? '🔇' : '🔊'}
                    </button>
                  </div>
                </div>
              `).join('')}
            `).join('');
            return featuredHtml + rest;
          })()}
          ${customStreams.length ? `
            <div class="radio-category">Your streams</div>
            ${customStreams.map((s, i) => `
              <div class="radio-station-btn ${currentStation?.id === 'custom_'+i ? 'active' : ''}" id="rbtn-custom_${i}" style="--station-color:#22c55e" onclick="Radio.playCustom(${i})">
                <span class="station-emoji">${Icon('rss')}</span>
                <span class="station-info">
                  <span class="station-name">${s.name || 'Custom'}</span>
                  <span class="station-desc">${s.url.slice(0,40)}…</span>
                </span>
                <div class="station-actions">
                  <button class="station-play-btn" title="Play / Stop" onclick="event.stopPropagation();Radio.playCustom(${i})">
                    ${currentStation?.id === 'custom_'+i && isPlaying ? '⏸' : '▶'}
                  </button>
                  <button class="station-vol-btn" title="Mute / Unmute" onclick="event.stopPropagation();Radio.toggleMute()">${muted ? '🔇' : '🔊'}</button>
                  <button class="station-vol-btn" title="Remove" onclick="Radio.removeCustom(${i},event)" style="color:var(--text3)">${Icon('x')}</button>
                </div>
              </div>
            `).join('')}
          ` : ''}
          <!-- External embedded players -->
          <div class="radio-category">${Icon('globe')} External players</div>
          ${EXTERNAL_PLAYERS.map(p => `
            <div
              class="radio-station-btn ext-player-btn"
              id="rbtn-ext-${p.id}"
              style="--station-color:${p.color}"
              onclick="Radio.openEmbed('${p.id}')"
            >
              <span class="station-emoji">${iconForEmoji(p.emoji)}</span>
              <span class="station-info">
                <span class="station-name">${p.name}</span>
                <span class="station-desc">${p.desc}</span>
              </span>
              <div class="station-actions">
                ${p.live ? '<span class="ext-player-badge">LIVE</span>' : ''}
                <button class="station-play-btn" title="Play" onclick="event.stopPropagation();Radio.openEmbed('${p.id}')">▶</button>
                <button class="station-vol-btn" title="Mute / Unmute" onclick="event.stopPropagation();Radio.toggleMute()">${muted ? '🔇' : '🔊'}</button>
              </div>
            </div>
          `).join('')}

          <!-- AI Assistant -->
          <div class="radio-ai-wrap">
            <button class="radio-ai-toggle" onclick="Radio.toggleAiChat()">
              ${Icon('bot')} AI assistant <span id="radio-ai-chevron">${Icon('chevron-down')}</span>
            </button>
            <div class="radio-ai-chat" id="radio-ai-chat" style="display:none">
              <div class="radio-ai-messages" id="radio-ai-messages">
                <div class="radio-ai-welcome">Hi! ${Icon('smile')} Ask me about radio stations — in any language.</div>
                <div class="radio-ai-suggestions">
                  <button onclick="document.getElementById('radio-ai-input').value='Find something calm and atmospheric';Radio.sendAiMessage()">Calm & atmospheric</button>
                  <button onclick="document.getElementById('radio-ai-input').value='I need something energetic';Radio.sendAiMessage()">Something energetic</button>
                  <button onclick="document.getElementById('radio-ai-input').value='¿Qué canal es mejor para concentrarse?';Radio.sendAiMessage()">Para concentrarse</button>
                </div>
              </div>
              <div class="radio-ai-input-row">
                <input
                  class="radio-ai-input" id="radio-ai-input"
                  placeholder="Ask in any language…"
                  onkeydown="Radio.onAiKeydown(event)"
                  autocomplete="off"
                >
                <button class="radio-ai-send" onclick="Radio.sendAiMessage()">${Icon('arrow-up')}</button>
              </div>
            </div>
          </div>
        </div>

        <!-- MAIN -->
        <div class="radio-main">
          <!-- Hero welcome -->
          <div class="radio-welcome-hero">
            <div class="radio-welcome-title">Welcome to SiriusFM</div>
            <div class="radio-welcome-sub">Electronic music streams · Psychedelic · Ambient · Trance</div>
          </div>
          <!-- Now playing -->
          <div class="radio-now-playing" id="radio-np">
            <div class="radio-station-art" id="np-art" style="background:linear-gradient(135deg,var(--accent),var(--accent2))">
              <span id="np-emoji">${Icon('radio')}</span>
            </div>
            <div class="radio-np-info">
              <div class="radio-np-badge"><span class="dot"></span> <span id="np-status">Stopped</span></div>
              <div class="radio-np-name" id="np-name">Choose a station on the left</div>
              <div class="radio-np-desc" id="np-desc">Electronic music from psychedelic trance to chill out</div>
              <button class="radio-set-fav-btn" id="radio-set-fav-btn" onclick="Radio.setAsFavorite()" style="display:none">
                ${Icon('star')} Set as my favorite
              </button>
            </div>
            <div class="radio-np-controls">
              <div class="radio-vol-wrap">
                <button class="radio-mute-btn" id="radio-mute-btn" onclick="Radio.toggleMute()" title="Mute / Unmute">${muted ? '🔇' : '🔊'}</button>
                <input type="range" id="radio-vol" min="0" max="100" value="${Math.round(volume*100)}" oninput="Radio.setVolume(this.value/100)">
              </div>
              <div class="radio-main-btns">
                <button class="radio-stop-btn" id="radio-stop-btn" onclick="Radio.stopRadio()" title="Stop">${Icon('square')}</button>
                <button class="radio-play-btn" id="radio-play-btn" onclick="Radio.togglePlay()">${isPlaying ? '⏸' : '▶'}</button>
              </div>
            </div>
          </div>

          <!-- Visualizer -->
          <div class="radio-visualizer-wrap" id="radio-vis-wrap">
            <!-- Avslutt fullskjerm — vises kun i full-modus (via CSS) -->
            <button class="vis-exit-full" id="vis-exit-full" onclick="Radio.exitVisFull()" title="Exit fullscreen (Esc)">⤢ Exit fullscreen</button>
            <canvas id="radio-fractal"></canvas>
            <canvas id="radio-canvas"></canvas>
            <!-- Video-visualisering: lydløs, loopet 4K-kosmos fra YouTube.
                 Lyden kommer alltid fra radioen — denne iframen er kun visuell. -->
            <iframe id="radio-vis-video" title="Cosmos video (muted)" allow="autoplay; encrypted-media" frameborder="0"></iframe>
            <div class="radio-vis-credit" id="radio-vis-credit" hidden></div>
            <div class="radio-vis-overlay" id="radio-idle">
              <div class="radio-idle-text">
                <div style="font-size:3rem;margin-bottom:0.5rem">${Icon('radio')}</div>
                <div>Choose a radio station and click ${Icon('play')} to start</div>
              </div>
            </div>
            <!-- Modus-knapper: motor-rad + AI-visual-rad stables loddrett (én
                 flex-kolonne) så de aldri legger seg oppå hverandre. -->
            <div class="vis-mode-stack">
            <!-- Motor-modusene (canvas/WebGL) — faste, reagerer på lyden. -->
            <div class="vis-style-row">
              <button class="vis-btn active" onclick="Radio.setVisMode('fractal',this)">🌌 Fractal</button>
              <button class="vis-btn" onclick="Radio.setVisMode('bars',this)">Bars</button>
              <button class="vis-btn" onclick="Radio.setVisMode('circle',this)">Circle</button>
              <button class="vis-btn" onclick="Radio.setVisMode('wave',this)">Wave</button>
              <button class="vis-btn" onclick="Radio.setVisMode('particles',this)">Particles</button>
            </div>
            <!-- Video-visuals: ALLE knappene her rullerer nå (før var bare den nederste
                 «AI-fersk»-raden dynamisk). AI henter lydløse 4K/HDR-looper fra YouTube
                 i de samme sjangrene som før — psykedelisk, kalejdoskop/mandala, fraktal,
                 AI/deforum, surrealistisk, flyt/neon — PLUSS ekte romfilm (NASA/ISS/
                 teleskop), blandet sammen i én rad. Bygges av js/radio.js →
                 loadAiVisuals ← /api/visuals-fresh. Alltid mute=1. -->
            <div class="vis-style-row vis-ai-row" id="vis-ai-row">
              <span class="vis-ai-label" title="AI picks fresh muted 4K visuals from YouTube — psychedelic, fractal, AI art and real space footage. New selection every hour." style="display:inline-flex;align-items:center;padding:0.32rem 0.55rem;font-size:0.72rem;font-weight:700;letter-spacing:0.02em;color:#c4a6ff;opacity:0.9;white-space:nowrap">✨ AI visuals</span>
            </div>
            </div><!-- /.vis-mode-stack -->
            <div class="vis-size-row">
              ${[['small','Small'],['medium','Medium'],['large','Large'],['full','⛶ Full']].map(([s,l]) =>
                `<button class="vis-btn vis-size-btn ${visSize===s?'active':''}" data-size="${s}" onclick="Radio.setVisSize('${s}',this)">${l}</button>`).join('')}
            </div>
            <!-- Stil-fane: velg egen farge + fart for ALLE visualiserings-modusene -->
            <div class="vis-tune-row">
              <button class="vis-btn vis-tune-toggle" id="vis-tune-toggle" onclick="Radio.toggleVisTune(this)" title="Color & speed">🎨 Style</button>
              <div class="vis-tune-panel" id="vis-tune-panel" hidden>
                <div class="vis-tune-group">
                  <label>🎨 Custom color</label>
                  <div class="vis-tune-color">
                    <input type="color" id="vis-hue-input" value="${hslHueToHex(visHue == null ? 268 : visHue)}" oninput="Radio.setVisColor(this.value)" title="Choose color">
                    <button class="vis-btn vis-hue-auto ${visHue == null ? 'active' : ''}" id="vis-hue-auto" onclick="Radio.setVisColorAuto(this)" title="Rainbow / auto">🌈 Auto</button>
                  </div>
                </div>
                <div class="vis-tune-group">
                  <label>⚡ Speed <span id="vis-speed-val">${visSpeed.toFixed(2)}×</span></label>
                  <div class="vis-tune-speed">
                    <span class="vis-tune-end" title="Slow">🐢</span>
                    <input type="range" id="vis-speed-input" min="0.15" max="3" step="0.05" value="${visSpeed}" oninput="Radio.setVisSpeed(this.value)">
                    <span class="vis-tune-end" title="Fast">🐇</span>
                  </div>
                </div>
              </div>
            </div>
            <!-- Zoom-knapper: gjør visualizeren større/mindre -->
            <div class="vis-zoom-row">
              <button class="vis-btn vis-zoom-btn" onclick="Radio.visZoomOut()" title="Smaller">−</button>
              <button class="vis-btn vis-zoom-btn" onclick="Radio.visZoomIn()" title="Larger">+</button>
            </div>
            <!-- Frie drag-håndtak — dra et hjørne/kant for å endre størrelse.
                 Dobbeltklikk et håndtak for å gå tilbake til standardstørrelsen. -->
            <div class="vrr n"  data-resize="n"  title="Drag to resize"></div>
            <div class="vrr s"  data-resize="s"  title="Drag to resize"></div>
            <div class="vrr e"  data-resize="e"  title="Drag to resize"></div>
            <div class="vrr w"  data-resize="w"  title="Drag to resize"></div>
            <div class="vrr ne" data-resize="ne" title="Drag to resize"></div>
            <div class="vrr nw" data-resize="nw" title="Drag to resize"></div>
            <div class="vrr se" data-resize="se" title="Drag to resize"></div>
            <div class="vrr sw" data-resize="sw" title="Drag to resize"></div>
            <!-- Live størrelses-indikator (vises mens man drar/zoomer) -->
            <div class="vis-size-badge" id="vis-size-badge" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);padding:0.42rem 0.75rem;background:rgba(10,8,24,0.82);border:1px solid rgba(196,166,255,0.5);border-radius:10px;color:#fff;font-size:0.82rem;font-weight:700;white-space:nowrap;pointer-events:none;opacity:0;transition:opacity 0.15s ease;z-index:5"></div>
          </div>

          <!-- External embed area (hidden by default) -->
          <div class="radio-embed-wrap hidden" id="radio-embed-wrap">
            <div class="radio-embed-header">
              <div class="radio-embed-info">
                <span id="embed-emoji">${Icon('rss')}</span>
                <div>
                  <div id="embed-name" style="font-weight:700"></div>
                  <div id="embed-desc" style="font-size:0.75rem;color:var(--text3)"></div>
                </div>
              </div>
              <button class="btn btn-ghost btn-sm" onclick="Radio.closeEmbed()">${Icon('x')} Close</button>
            </div>
            <iframe
              id="radio-embed-frame"
              class="radio-embed-frame"
              src=""
              allow="autoplay; encrypted-media"
              allowfullscreen
              loading="lazy"
            ></iframe>
            <!-- Resize handles — drag any edge/corner to grow/shrink the pane.
                 Double-click a handle to reset to the default fill size. -->
            <div class="rer n"  data-resize="n"  title="Drag to resize"></div>
            <div class="rer s"  data-resize="s"  title="Drag to resize"></div>
            <div class="rer e"  data-resize="e"  title="Drag to resize"></div>
            <div class="rer w"  data-resize="w"  title="Drag to resize"></div>
            <div class="rer ne" data-resize="ne" title="Drag to resize"></div>
            <div class="rer nw" data-resize="nw" title="Drag to resize"></div>
            <div class="rer se" data-resize="se" title="Drag to resize"></div>
            <div class="rer sw" data-resize="sw" title="Drag to resize"></div>
          </div>
        </div>
      </div>`;

    canvas = document.getElementById('radio-canvas');
    // Siden hele malen bygges på nytt her, er en evt. gammel WebGL-kontekst
    // knyttet til en fjernet canvas. Nullstill så fraktalen re-initialiseres
    // mot den ferske #radio-fractal-canvasen.
    stopFractal();
    fxGl = null; fxCanvas = null; fxBuf = null; fxProgs = {};
    // Iframen er også ny og tom nå. Uten denne nullstillingen tror showVisVideo
    // at videoen alt er lastet (visVideoLoaded fra forrige render) og setter
    // aldri src → tom visualizer når man går ut av radio-siden og inn igjen.
    visVideoLoaded = null;
    applyVisSize();              // setter lagret størrelse + kaller resizeCanvas
    restoreVisFree();            // gjenopprett evt. lagret fri størrelse (overstyrer preset)
    initVisResize();             // koble på hjørne/kant-håndtakene
    window.removeEventListener('resize', resizeCanvas);
    window.addEventListener('resize', resizeCanvas);
    // Marker riktig modus-knapp som aktiv (visMode kan avvike fra standard 'fractal').
    document.querySelectorAll('.vis-style-row .vis-btn').forEach(b =>
      b.classList.toggle('active', (b.getAttribute('onclick') || '').includes(`setVisMode('${visMode}'`)));
    if (currentStation && isPlaying) startVisualizer();
    else if (isVideoMode(visMode)) showVisVideo(visMode);   // video spiller uavhengig av radioen
    loadAiVisuals();             // hent + bygg «AI-fersk»-knappene (ikke-blokkerende)
  }

  function resizeCanvas() {
    if (!canvas) return;
    const wrap = document.getElementById('radio-vis-wrap');
    if (!wrap) return;
    // Tegn i enhets-piksler (Retina-skarpt), maks 2× for ytelse. Alle tegne-
    // funksjonene bruker canvas.width/height, så de skalerer skarpt automatisk.
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width  = Math.round(wrap.clientWidth  * dpr);
    canvas.height = Math.round(wrap.clientHeight * dpr);
    visCtx = canvas.getContext('2d');
    fxResize();       // hold WebGL-fraktalen i takt med størrelsen
    sizeVisVideo();   // hold video-visualiseringen dekkende ved endret størrelse
  }

  // ── Audio ─────────────────────────────────────────────────────────────
  function getAudio() { return document.getElementById('audio-engine'); }

  function initAudioContext() {
    // Prefer shared context created by Player
    if (window._radioAnalyser) {
      audioCtx = window._radioCtx;
      analyser = window._radioAnalyser;
      return;
    }
    if (audioCtx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    try {
      audioCtx  = new Ctx();
      analyser  = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.8;
      const audio = getAudio();
      if (!window._radioSource) {
        window._radioSource = audioCtx.createMediaElementSource(audio);
        window._radioSource.connect(analyser);
        analyser.connect(audioCtx.destination);
        window._radioCtx      = audioCtx;
        window._radioAnalyser = analyser;
      }
    } catch (e) {
      console.warn('Web Audio API not available:', e);
    }
  }

  function playStation(id) {
    const station = STATIONS.find(s => s.id === id);
    if (!station) return;
    if (currentStation?.id === id) { togglePlay(); return; }
    currentStation = { ...station };
    _playUrl(station.url, station);
    updateSidebarActiveState(id);
    updateNowPlaying(station);
  }

  // Scroll til ein sjanger-bolk og blink overskrifta. Blir kalla frå andre sider rett
  // etter Router.go('/radio'), så vi ventar til radiosida faktisk er teikna.
  function focusCategory(cat, tries = 0) {
    const el = document.getElementById(catId(cat));
    if (!el) {
      if (tries < 25) setTimeout(() => focusCategory(cat, tries + 1), 100);
      return;
    }
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    el.classList.add('radio-category--flash');
    setTimeout(() => el.classList.remove('radio-category--flash'), 2000);
  }

  function playCustom(idx) {
    const s = customStreams[idx];
    if (!s) return;
    const id = 'custom_' + idx;
    currentStation = { id, ...s };
    _playUrl(s.url, { name: s.name, emoji: '📡', color: '#22c55e', desc: s.url });
    updateSidebarActiveState(id);
  }

  function _playUrl(url, info) {
    const audio = getAudio();
    // Mark player as radio mode
    window._radioMode = true;
    stopNowPlayingPoll();   // clear any previous channel's live poll

    // Tredjeparts-strøymar: oppgrader http → https (elles blokkerer nettlesaren
    // lyden stille på HTTPS-sida) og stopp format <audio> umogleg kan spele.
    url = StreamFix.normalize(url);
    if (currentStation && currentStation.url) currentStation.url = url;
    if (!StreamFix.playable(url)) {
      StreamFix.markDead(url);
      const why = /\.m3u8/i.test(url)
        ? 'This station uses HLS, which only plays in Safari'
        : 'This station only offers a playlist file, not a direct stream';
      if (info.onFail) info.onFail(why);
      else App.toast(why, 'error');
      updatePlayBtn(false);
      return;
    }

    // Update player bar for radio
    const title = document.getElementById('player-title');
    const artist = document.getElementById('player-artist');
    const art    = document.getElementById('player-artwork');
    if (title)  title.textContent  = info.name || 'Radio';
    if (artist) artist.innerHTML   = `<span class="radio-live-badge"><span class="live-dot-sm"></span> LIVE</span> ${escHtml(info.desc || 'Live stream')}`;
    if (art)    { art.style.backgroundImage = ''; art.querySelector('.artwork-note').innerHTML = iconForEmoji(info.emoji, 'radio'); art.querySelector('.artwork-note').style.display = ''; }

    const bar = document.getElementById('player-bar');
    if (bar) bar.classList.add('radio-mode');
    bar?.classList.remove('hidden', 'idle');

    // Show + refresh the floating radio dock for the selected channel
    window.RadioDock?.sync();

    // Clicking station info navigates to radio page
    const playerLeft = document.getElementById('player-left');
    if (playerLeft) {
      playerLeft._radioClickHandler = () => Router.go('/radio');
      playerLeft.removeEventListener('click', playerLeft._radioClickHandler);
      playerLeft.addEventListener('click', playerLeft._radioClickHandler);
    }

    audio.src  = url;
    audio.load();
    audio.volume = volume;

    // Vaktbikkje: eit avvist play()-løfte er ikkje nok. Ein blokkert eller daud
    // strøym kan «lukkast» og så berre vere stille, så vi ventar på ei verkeleg
    // 'playing'-hending før vi seier at det spelar.
    // Både 'error'-hendinga og eit avvist play()-løfte kan melde same feil. Utan
    // denne sperra blei onFail kalla to gonger, og to auto-hopp starta samtidig.
    let settled = false;
    const onStarted = () => {
      if (settled) return;
      settled = true;
      isPlaying = true;
      updatePlayBtn(true);
      document.getElementById('radio-idle')?.classList.add('hidden');
      initAudioContext();
      if (audioCtx?.state === 'suspended') audioCtx.resume();
      startVisualizer();
      updateNowPlayingStatus(true);
      updateSidebarActiveState(currentStation?.id);
      window.RadioDock?.sync();
      if (info.npApi) startNowPlayingPoll(info);   // live track/show updates
      info.onPlay?.();
    };
    const onFailed = (why) => {
      if (settled) return;
      settled = true;
      console.warn('Stream error:', url, why);
      StreamFix.markDead(url);
      isPlaying = false;
      updatePlayBtn(false);
      updateNowPlayingStatus(false);
      if (info.onFail) info.onFail(why);
      else App.toast(`${info.name || 'Station'}: ${why}`, 'error');
    };

    const watcher = StreamFix.watch(audio, { onPlay: onStarted, onFail: onFailed });
    audio.play()?.catch(err => {
      watcher.cancel();   // vi avgjer utfallet her, så vakta skal ikkje melde i tillegg
      // Autoplay-sperre og «avbrote av ny load()» er ikkje daude strøymar.
      if (err?.name === 'NotAllowedError') {
        updatePlayBtn(false);
        App.toast('Tap play to start the stream', 'info');
        return;
      }
      if (err?.name === 'AbortError') return;   // brukaren bytta stasjon midt i
      onFailed(StreamFix.errorText(audio));
    });
  }

  function togglePlay() {
    const audio = getAudio();
    if (!currentStation) {
      App.toast('Choose a radio station first', 'info');
      return;
    }
    if (isPlaying) {
      audio.pause();
      isPlaying = false;
      stopVisualizer();
      stopNowPlayingPoll();
      updatePlayBtn(false);
      updateNowPlayingStatus(false);
      updateSidebarActiveState(currentStation.id);
      window.RadioDock?.sync();
      // Keep _radioMode = true so ctrl-play in player bar resumes radio correctly
    } else {
      // Always reconnect the stream (live streams can't reliably resume from pause)
      _playUrl(currentStation.url, currentStation);
    }
  }

  // Called by Player when a music track loads, so radio yields control
  function stopForMusicPlayer() {
    if (isPlaying) {
      isPlaying = false;
      stopVisualizer();
      updateNowPlayingStatus(false);
      if (currentStation) updateSidebarActiveState(currentStation.id);
    }
    window._radioMode = false;
    document.getElementById('player-bar')?.classList.remove('radio-mode');
    const playerLeft = document.getElementById('player-left');
    if (playerLeft?._radioClickHandler) {
      playerLeft.removeEventListener('click', playerLeft._radioClickHandler);
      playerLeft._radioClickHandler = null;
    }
  }

  function setVolume(v) {
    volume = v;
    if (!muted) {
      const audio = getAudio();
      if (audio) audio.volume = v;
    }
    const volBar = document.getElementById('volume-bar');
    if (volBar) volBar.value = Math.round(v * 100);
    const volFill = document.getElementById('vol-fill');
    if (volFill) volFill.style.width = Math.round(v * 100) + '%';
    const radioVol = document.getElementById('radio-vol');
    if (radioVol) radioVol.value = Math.round(v * 100);
    window.RadioDock?.syncVol();
  }

  // Step volume up/down (used by the floating radio dock's +/− buttons)
  function volumeUp()   { if (muted) toggleMute(); setVolume(Math.min(1, +(volume + 0.1).toFixed(2))); }
  function volumeDown() { if (muted) toggleMute(); setVolume(Math.max(0, +(volume - 0.1).toFixed(2))); }

  function stopRadio() {
    const audio = getAudio();
    if (!audio) return;
    audio.pause();
    audio.src = '';
    isPlaying = false;
    currentStation = null;
    window._radioMode = false;
    stopVisualizer();
    stopNowPlayingPoll();
    updateNowPlayingStatus(false);
    updatePlayBtn(false);
    // Spelaren blir verande nede på alle ruter — vi nullstiller han i staden for å skjule.
    const pbar = document.getElementById('player-bar');
    pbar?.classList.remove('radio-mode', 'playing', 'hidden');
    pbar?.classList.add('idle');
    const pTitle = document.getElementById('player-title');
    if (pTitle) pTitle.textContent = 'No track selected';
    const pArtist = document.getElementById('player-artist');
    if (pArtist) pArtist.textContent = '—';
    const pArt = document.getElementById('player-artwork');
    if (pArt) {
      pArt.style.backgroundImage = '';
      const note = pArt.querySelector('.artwork-note');
      if (note) { note.style.display = ''; note.innerHTML = window.Icon ? Icon('music') : ''; }
    }
    document.getElementById('radio-idle')?.classList.remove('hidden');
    document.querySelectorAll('.radio-station-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.station-live-dot').forEach(d => d.remove());
    const np = document.getElementById('np-name');
    if (np) np.textContent = 'Choose a station on the left';
    const desc = document.getElementById('np-desc');
    if (desc) desc.textContent = 'Electronic music from psychedelic trance to chill out';
    const playerLeft = document.getElementById('player-left');
    if (playerLeft?._radioClickHandler) {
      playerLeft.removeEventListener('click', playerLeft._radioClickHandler);
      playerLeft._radioClickHandler = null;
    }
    window.RadioDock?.sync();
  }

  function toggleMute() {
    const audio = getAudio();
    if (!audio) return;
    if (muted) {
      muted = false;
      audio.volume = preMuteVolume;
      volume = preMuteVolume;
    } else {
      preMuteVolume = volume || 0.8;
      muted = true;
      audio.volume = 0;
    }
    const icon = muted ? '🔇' : '🔊';
    document.querySelectorAll('.station-vol-btn').forEach(b => {
      if (b.title === 'Mute / Unmute') b.textContent = icon;
    });
    const muteBtn = document.getElementById('radio-mute-btn');
    if (muteBtn) muteBtn.textContent = icon;
    const volBar = document.getElementById('radio-vol');
    if (volBar) volBar.value = muted ? 0 : Math.round(volume * 100);
    const playerVolBar = document.getElementById('volume-bar');
    if (playerVolBar) playerVolBar.value = muted ? 0 : Math.round(volume * 100);
    const volFill = document.getElementById('vol-fill');
    if (volFill) volFill.style.width = (muted ? 0 : Math.round(volume * 100)) + '%';
    window.RadioDock?.syncVol();
  }

  // ── UI updates ────────────────────────────────────────────────────────
  function updatePlayBtn(playing) {
    const btn = document.getElementById('radio-play-btn');
    if (btn) btn.textContent = playing ? '⏸' : '▶';
    const ctrlPlay = document.getElementById('ctrl-play');
    if (ctrlPlay) ctrlPlay.textContent = playing ? '⏸' : '▶';
  }

  // ── Live now-playing (radiOzora / Airtime live-info-v2) ───────────────
  // For stations that expose an `npApi`, poll the current track + show so
  // the AI-driven radio page follows the live schedule automatically.
  function decodeEntities(str) {
    if (!str) return '';
    const t = document.createElement('textarea');
    t.innerHTML = str;
    return t.value.trim();
  }

  // Pull the current-track line out of one of several now-playing providers.
  // npType selects the shape; default is Airtime/LibreTime live-info-v2.
  //   'airtime'  → data.tracks.current.name / data.shows.current.name  (radiOzora)
  //   'icecast'  → data.icestats.source[].title                         (MultiHuman)
  //   'radioco'  → data.current_track.title                             (SinCity.FM)
  function extractNowPlaying(station, data) {
    if (station.npType === 'radioco') {
      let t = decodeEntities(data?.current_track?.title);
      // radio.co prefixes the station slug ("sincityfm - Track") — strip it.
      t = t.replace(/^\s*sin\s*city\s*fm\s*[-–—:]\s*/i, '').trim();
      return t || station.desc;
    }
    if (station.npType === 'icecast') {
      let src = data?.icestats?.source;
      if (Array.isArray(src)) src = src.find(s => s?.title) || src[0];
      const t = decodeEntities(src?.title);
      // Icecast reports "<Station> - OFFLINE" between shows — fall back to desc.
      if (!t || /offline/i.test(t)) return station.desc;
      return t;
    }
    // Airtime / LibreTime live-info-v2 (default)
    const track = decodeEntities(data?.tracks?.current?.name);
    const show  = decodeEntities(data?.shows?.current?.name);
    // Airtime often repeats the same string as both track and show — only
    // combine them when they're genuinely different, else show the fuller one.
    const norm  = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '');
    const overlap = track && show && (norm(track).includes(norm(show)) || norm(show).includes(norm(track)));
    return track && show && !overlap ? `${track} · ${show}`
         : (track.length >= show.length ? track : show) || station.desc;
  }

  async function fetchNowPlaying(station) {
    if (!station?.npApi) return;
    try {
      const res = await fetch(station.npApi, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      // Ignore if the user switched channel while the request was in flight
      if (!currentStation || currentStation.id !== station.id) return;

      const line = extractNowPlaying(station, data);

      const descEl = document.getElementById('np-desc');
      if (descEl) descEl.textContent = line;

      const artistEl = document.getElementById('player-artist');
      if (artistEl) {
        artistEl.innerHTML = `<span class="radio-live-badge"><span class="live-dot-sm"></span> LIVE</span> ${escHtml(line)}`;
      }
    } catch { /* offline / CORS hiccup — keep last known text */ }
  }

  function startNowPlayingPoll(station) {
    stopNowPlayingPoll();
    if (!station?.npApi) return;
    fetchNowPlaying(station);
    npPollTimer = setInterval(() => fetchNowPlaying(station), 20000);
  }

  function stopNowPlayingPoll() {
    if (npPollTimer) { clearInterval(npPollTimer); npPollTimer = null; }
  }

  function updateNowPlaying(station) {
    const name = document.getElementById('np-name');
    const desc = document.getElementById('np-desc');
    const art  = document.getElementById('np-art');
    const emoji= document.getElementById('np-emoji');
    if (name)  name.textContent  = station.name;
    if (desc)  desc.textContent  = station.desc;
    if (emoji) emoji.innerHTML = iconForEmoji(station.emoji);
    if (art)   art.style.background = `linear-gradient(135deg,${station.color},${station.color}88)`;

    // Show "set as favorite" button if logged in
    const favBtn = document.getElementById('radio-set-fav-btn');
    if (favBtn) {
      const user = typeof Auth !== 'undefined' ? Auth.current() : null;
      favBtn.style.display = user ? 'inline-flex' : 'none';
      const isFav = user?.favoriteRadio?.url === station.url;
      favBtn.textContent = isFav ? '⭐ Your favorite' : '⭐ Set as my favorite';
      favBtn.disabled = isFav;
    }
  }

  // ── External player embed ─────────────────────────────────────────────
  function openEmbed(id) {
    const p = EXTERNAL_PLAYERS.find(e => e.id === id);
    if (!p) return;

    // Pause any running stream
    const audio = getAudio();
    if (isPlaying) { audio.pause(); isPlaying = false; stopVisualizer(); updatePlayBtn(false); }

    // Mark sidebar active
    document.querySelectorAll('.radio-station-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`rbtn-ext-${id}`)?.classList.add('active');

    // Fill embed info
    const nameEl = document.getElementById('embed-name');
    const descEl = document.getElementById('embed-desc');
    const emojEl = document.getElementById('embed-emoji');
    const frame  = document.getElementById('radio-embed-frame');
    if (nameEl)  nameEl.textContent  = p.name;
    if (descEl)  descEl.textContent  = p.desc;
    if (emojEl)  emojEl.innerHTML  = iconForEmoji(p.emoji);
    if (frame)   frame.src           = p.url;

    // Show embed, hide visualizer
    document.getElementById('radio-vis-wrap')?.classList.add('hidden');
    const wrap = document.getElementById('radio-embed-wrap');
    wrap?.classList.remove('hidden');

    // Restore the last chosen size and wire up edge/corner drag-resize
    if (wrap) { applyEmbedSize(wrap); initEmbedResize(); }

    // Update now-playing panel
    updateNowPlaying({ name: p.name, desc: p.desc, emoji: p.emoji, color: p.color, url: p.url });
    const st = document.getElementById('np-status');
    if (st) st.textContent = p.live ? 'LIVE' : 'Album';
  }

  function closeEmbed() {
    const frame = document.getElementById('radio-embed-frame');
    if (frame) frame.src = '';
    if (embedAbort) { embedAbort.abort(); embedAbort = null; }
    document.getElementById('radio-embed-wrap')?.classList.add('hidden');
    document.getElementById('radio-vis-wrap')?.classList.remove('hidden');
    document.querySelectorAll('.radio-station-btn').forEach(b => b.classList.remove('active'));
    const st = document.getElementById('np-status');
    if (st) st.textContent = 'Stopped';
  }

  // ── Resizable embed pane ──────────────────────────────────────────────
  // The pane normally fills .radio-main (flex:1). Dragging an edge/corner
  // switches it to an absolutely-positioned, explicitly-sized box anchored
  // inside .radio-main so it can grow taller over the hero/now-playing strip.
  // Mirrors the chat float window's resize (chat.js initDragResize).
  const EMBED_SIZE_KEY = 'pv_radio_embed_size';
  const EMBED_MIN_W = 320, EMBED_MIN_H = 300;

  function loadEmbedSize() {
    try { return JSON.parse(localStorage.getItem(EMBED_SIZE_KEY) || 'null'); }
    catch { return null; }
  }

  function saveEmbedSize(wrap) {
    if (!wrap.classList.contains('resized')) return;
    try {
      localStorage.setItem(EMBED_SIZE_KEY, JSON.stringify({
        left: wrap.offsetLeft, top: wrap.offsetTop,
        width: wrap.offsetWidth, height: wrap.offsetHeight,
      }));
    } catch {}
  }

  // Apply a previously saved size, clamped to the current container so a size
  // saved on a larger screen never overflows. No saved size → default fill.
  function applyEmbedSize(wrap) {
    const cont = wrap.parentElement;
    const saved = loadEmbedSize();
    if (!saved || !cont) {
      wrap.classList.remove('resized');
      wrap.style.left = wrap.style.top = wrap.style.width = wrap.style.height = '';
      return;
    }
    const maxW = cont.clientWidth, maxH = cont.clientHeight;
    const w = Math.max(EMBED_MIN_W, Math.min(saved.width,  maxW));
    const h = Math.max(EMBED_MIN_H, Math.min(saved.height, maxH));
    const l = Math.max(0, Math.min(saved.left, maxW - w));
    const t = Math.max(0, Math.min(saved.top,  maxH - h));
    wrap.classList.add('resized');
    wrap.style.left = l + 'px'; wrap.style.top = t + 'px';
    wrap.style.width = w + 'px'; wrap.style.height = h + 'px';
  }

  function resetEmbedSize(wrap) {
    wrap.classList.remove('resized');
    wrap.style.left = wrap.style.top = wrap.style.width = wrap.style.height = '';
    try { localStorage.removeItem(EMBED_SIZE_KEY); } catch {}
  }

  // Freeze the current in-flow geometry as explicit inline size before the
  // first drag, so the pane doesn't jump when it becomes position:absolute.
  function ensureResized(wrap) {
    if (wrap.classList.contains('resized')) return;
    const l = wrap.offsetLeft, t = wrap.offsetTop, w = wrap.offsetWidth, h = wrap.offsetHeight;
    wrap.classList.add('resized');
    wrap.style.left = l + 'px'; wrap.style.top = t + 'px';
    wrap.style.width = w + 'px'; wrap.style.height = h + 'px';
  }

  function initEmbedResize() {
    const wrap  = document.getElementById('radio-embed-wrap');
    const frame = document.getElementById('radio-embed-frame');
    if (!wrap) return;

    if (embedAbort) embedAbort.abort();
    embedAbort = new AbortController();
    const sig = embedAbort.signal;

    let action = null; // resize direction string: n|s|e|w|ne|nw|se|sw
    let startX, startY, startLeft, startTop, startW, startH;

    function beginResize(cx, cy, dir) {
      ensureResized(wrap);
      action = dir;
      startX = cx; startY = cy;
      startLeft = wrap.offsetLeft; startTop = wrap.offsetTop;
      startW = wrap.offsetWidth; startH = wrap.offsetHeight;
      document.body.style.userSelect = 'none';
      // While dragging, let pointer events pass THROUGH the iframe — otherwise
      // it captures the pointer and pointermove stops firing mid-drag.
      if (frame) frame.style.pointerEvents = 'none';
    }

    function applyMove(cx, cy) {
      if (!action) return;
      const cont = wrap.parentElement;
      const maxW = cont.clientWidth, maxH = cont.clientHeight;
      const dx = cx - startX, dy = cy - startY;
      let nx = startLeft, ny = startTop, nw = startW, nh = startH;

      if (action.includes('e')) nw = Math.max(EMBED_MIN_W, Math.min(startW + dx, maxW - startLeft));
      if (action.includes('w')) {
        nw = Math.max(EMBED_MIN_W, Math.min(startW - dx, startLeft + startW));
        nx = startLeft + startW - nw;
      }
      if (action.includes('s')) nh = Math.max(EMBED_MIN_H, Math.min(startH + dy, maxH - startTop));
      if (action.includes('n')) {
        nh = Math.max(EMBED_MIN_H, Math.min(startH - dy, startTop + startH));
        ny = startTop + startH - nh;
      }

      wrap.style.left = nx + 'px'; wrap.style.top = ny + 'px';
      wrap.style.width = nw + 'px'; wrap.style.height = nh + 'px';
    }

    function endAction() {
      if (action) saveEmbedSize(wrap);
      action = null;
      document.body.style.userSelect = '';
      if (frame) frame.style.pointerEvents = '';
    }

    wrap.querySelectorAll('.rer').forEach(handle => {
      handle.addEventListener('pointerdown', e => {
        if (e.button !== 0) return;
        e.preventDefault(); e.stopPropagation();
        beginResize(e.clientX, e.clientY, handle.dataset.resize);
      }, { signal: sig });
      // Double-click a handle to reset to the default fill size.
      handle.addEventListener('dblclick', e => {
        e.preventDefault(); e.stopPropagation();
        resetEmbedSize(wrap);
      }, { signal: sig });
    });

    document.addEventListener('pointermove', e => applyMove(e.clientX, e.clientY), { signal: sig });
    document.addEventListener('pointerup', endAction, { signal: sig });
    document.addEventListener('pointercancel', endAction, { signal: sig });
  }

  function setAsFavorite() {
    if (!currentStation) return;
    const user = typeof Auth !== 'undefined' ? Auth.current() : null;
    if (!user) { App.toast('Log in to save a favorite station', 'error'); return; }
    const favoriteRadio = {
      name:  currentStation.name,
      url:   currentStation.url,
      emoji: currentStation.emoji || '📻',
    };
    Auth.updateUser(user.username, { favoriteRadio });
    user.favoriteRadio = favoriteRadio;
    App.toast(`"${favoriteRadio.name}" saved as your favorite station! It now appears on your profile. ${Icon('star')}`, 'success');
    updateNowPlaying(currentStation);
  }

  function updateNowPlayingStatus(live) {
    const st = document.getElementById('np-status');
    if (st) st.textContent = live ? 'LIVE' : 'Stopped';
  }

  function updateSidebarActiveState(activeId) {
    document.querySelectorAll('.radio-station-btn').forEach(btn => {
      btn.classList.remove('active');
      btn.querySelector('.station-live-dot')?.remove();
      const playIcon = btn.querySelector('.station-play-btn');
      if (playIcon) playIcon.textContent = '▶';
    });
    const active = document.getElementById(`rbtn-${activeId}`);
    if (active) {
      active.classList.add('active');
      const playIcon = active.querySelector('.station-play-btn');
      if (isPlaying) {
        if (playIcon) playIcon.textContent = '⏸';
      } else {
        if (playIcon) playIcon.textContent = '▶';
      }
    }
    // Update featured card play button and live bar
    const featured = STATIONS.find(s => s.featured);
    if (featured) {
      const card = document.getElementById(`rbtn-${featured.id}`);
      if (!card) return;
      const featuredPlay = card.querySelector('.stellar-featured-play');
      const existingBar  = card.querySelector('.stellar-live-bar');
      if (activeId === featured.id && isPlaying) {
        if (featuredPlay) featuredPlay.textContent = '⏸';
        if (!existingBar) {
          const bar = document.createElement('div');
          bar.className = 'stellar-live-bar';
          bar.innerHTML = '<span></span><span></span><span></span><span></span><span></span>';
          card.appendChild(bar);
        }
      } else {
        if (featuredPlay) featuredPlay.textContent = '▶';
        existingBar?.remove();
      }
    }
  }

  // ── Visualizer ────────────────────────────────────────────────────────
  let particles = [];
  // Fart-styrt klokke: akkumulerer skalert tid slik at fartsendring ikke gir
  // hopp, og animasjonen fortsetter jevnt på tvers av modus-bytter.
  let visClock = 0, visLastTs = 0;
  function visT() { return visClock / 1000; }

  // Egen-farge: mapper en «auto-regnbue»-hue (0..360) til brukerens valgte palett.
  // visHue == null → opprinnelig full-spektrum-oppførsel. Ellers presses
  // variasjonen inn i et smalt bånd rundt den valgte fargen, så ALLE modusene
  // følger fargevalget men fortsatt lever litt.
  function visHueOf(autoHue) {
    if (visHue == null) return autoHue;
    const band = 60;
    const frac = ((((autoHue % 360) + 360) % 360)) / 360; // 0..1
    return (visHue - band / 2 + frac * band + 360) % 360;
  }
  // Dominant hue for de rolige glød-/kjerne-elementene (default merkevare-lilla).
  function visBaseHue() { return visHue == null ? 268 : visHue; }

  // ── WebGL-visualiseringer ──────────────────────────────────────────────
  // Selv-animerende, lydfrie shadere som kjører kun på tid — de lever alltid,
  // også når strømmen ikke gir frekvensdata. Følger Stil-fanen (egen farge +
  // fart). Faller pent tilbake til 2D-«Søyler» hvis WebGL ikke er tilgjengelig.
  //  · fractal → «mind-melting» kaleidoskop-fraktaltunnel (raymarchet)
  const FX_VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p,0.0,1.0); }`;
  const FX_FRAG = `
    precision highp float;
    uniform vec2  u_res;
    uniform float u_time;
    uniform float u_hue;     // < 0 = regnbue/auto, ellers 0..1 fast farge
    uniform float u_energy;  // 0..1 valgfri lyd-puls
    mat2 rot(float a){ float c=cos(a), s=sin(a); return mat2(c,s,-s,c); }
    vec3 palette(float d){ return mix(vec3(0.20,0.70,0.95), vec3(1.0,0.10,0.95), d); }
    vec3 hueShift(vec3 col, float a){
      const vec3 k = vec3(0.57735026);
      float c = cos(a), s = sin(a);
      return col*c + cross(k,col)*s + k*dot(k,col)*(1.0-c);
    }
    float map(vec3 p, float t){
      for(int i=0;i<8;i++){
        p.xz = rot(t)      * p.xz;
        p.xy = rot(t*1.89) * p.xy;
        p.xz = abs(p.xz);
        p.xz -= 0.5;
      }
      return dot(sign(p), p) / 5.0;
    }
    vec4 march(vec3 ro, vec3 rd, float t){
      float dist = 0.0; vec3 col = vec3(0.0); float d = 1.0;
      for(int i=0;i<72;i++){
        vec3 p = ro + rd*dist;
        d = map(p, t) * 0.5;
        if(d < 0.02) break;
        if(dist > 100.0) break;
        col += palette(length(p)*0.1) / (400.0*d);
        dist += d;
      }
      return vec4(col, 1.0/(d*100.0));
    }
    void main(){
      vec2 uv = (gl_FragCoord.xy - 0.5*u_res) / u_res.y;
      float t = u_time;
      vec3 ro = vec3(0.0, 0.0, -50.0);
      ro.xz = rot(t) * ro.xz;
      vec3 cf = normalize(-ro);
      vec3 cs = normalize(cross(cf, vec3(0.0,1.0,0.0)));
      vec3 cu = normalize(cross(cf, cs));
      vec3 tgt = ro + cf*3.0 + uv.x*cs + uv.y*cu;
      vec3 rd  = normalize(tgt - ro);
      vec3 c = march(ro, rd, t*0.2).rgb;
      c *= 0.85 + u_energy*0.7;                 // rolig puls om lyd finnes
      if(u_hue < 0.0) c = hueShift(c, t*0.06);  // sakte regnbue-drift
      else            c = hueShift(c, (u_hue - 0.83)*6.2831853);
      c = pow(c, vec3(0.85));                    // litt løft i mørke partier
      gl_FragColor = vec4(c, 1.0);
    }`;

  // Nebula-ormehull: glødende filament-tråder i en virvlende tunnel mot et
  // mørkt sentrum (fly-inn-følelse) + tett stjernefelt. Log-polar ridged fbm.
  const FX_FRAG_WORM = `
    precision highp float;
    uniform vec2 u_res; uniform float u_time; uniform float u_hue; uniform float u_energy;
    mat2 rot(float a){ float c=cos(a), s=sin(a); return mat2(c,s,-s,c); }
    float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
    float noise(vec2 p){ vec2 i=floor(p), f=fract(p);
      float a=hash(i), b=hash(i+vec2(1.0,0.0)), c=hash(i+vec2(0.0,1.0)), d=hash(i+vec2(1.0,1.0));
      vec2 u=f*f*(3.0-2.0*f); return mix(mix(a,b,u.x),mix(c,d,u.x),u.y); }
    float fbm(vec2 p){ float v=0.0, a=0.55; for(int i=0;i<5;i++){ v+=a*noise(p); p=rot(0.6)*p*2.0; a*=0.5; } return v; }
    float ridged(vec2 p){ float v=0.0, a=0.5, amp=0.0;
      for(int i=0;i<6;i++){ float n=1.0-abs(2.0*noise(p)-1.0); n*=n; v+=a*n; amp+=a; p=p*2.02+1.3; a*=0.5; }
      return v/amp; }
    vec3 hueShift(vec3 col, float a){ const vec3 k=vec3(0.57735026); float c=cos(a), s=sin(a);
      return col*c+cross(k,col)*s+k*dot(k,col)*(1.0-c); }
    void main(){
      vec2 uv=(gl_FragCoord.xy-0.5*u_res)/u_res.y;
      float t=u_time*0.1;
      float r=length(uv)+1e-3;
      float a=atan(uv.y, uv.x);
      a += 0.7/r + t*0.25;
      vec2 tp=vec2(a/3.14159*3.0, 1.0/r*1.3 + t*1.6);
      float fil=ridged(tp*2.4);
      float glow=pow(fil,3.0);
      vec3 neb=mix(vec3(0.05,0.32,0.95), vec3(0.10,0.80,0.75), fbm(tp*0.5+t*0.2));
      neb=mix(neb, vec3(0.65,0.85,0.30), smoothstep(0.55,1.0,fbm(tp*0.7+5.0))*0.6);
      neb=mix(neb, vec3(0.55,0.25,0.85), smoothstep(0.60,1.0,fbm(tp*0.9-3.0))*0.35);
      vec3 col=neb*glow*2.3;
      col*=0.5+0.9*fil;
      col*=smoothstep(0.02,0.34,r);
      col+=vec3(0.2,0.55,1.0)*exp(-r*7.0)*0.5;
      col*=1.0-smoothstep(0.7,1.25,r)*0.6;
      vec2 sc=uv*100.0; vec2 gid=floor(sc); vec2 gp=fract(sc)-0.5;
      float h0=hash(gid); float br=step(0.93,h0); float pt=smoothstep(0.42,0.0,length(gp));
      col+=vec3(0.9,0.95,1.0)*br*pt*pt*(0.4+0.6*sin(t*30.0+h0*90.0));
      col=pow(col, vec3(0.85));
      col*=0.9+u_energy*0.5;
      if(u_hue>=0.0) col=hueShift(col,(u_hue-0.60)*6.2831853);
      gl_FragColor=vec4(col,1.0);
    }`;

  const FX_SHADERS = {
    fractal: FX_FRAG, wormhole: FX_FRAG_WORM,
  };

  function fxCompile(gl, type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.warn('Fraktal-shader feilet:', gl.getShaderInfoLog(sh));
      gl.deleteShader(sh); return null;
    }
    return sh;
  }

  function fxInit() {
    if (fxGl) return true;
    fxCanvas = document.getElementById('radio-fractal');
    if (!fxCanvas) return false;
    const gl = fxCanvas.getContext('webgl') || fxCanvas.getContext('experimental-webgl');
    if (!gl) return false;
    fxBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, fxBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
    fxGl = gl;
    return true;
  }

  // Kompiler + cache et program for en gitt WebGL-modus. → {prog, uni} el. null.
  function fxProgram(mode) {
    if (fxProgs[mode]) return fxProgs[mode];
    const gl = fxGl;
    const vs = fxCompile(gl, gl.VERTEX_SHADER, FX_VERT);
    const fs = fxCompile(gl, gl.FRAGMENT_SHADER, FX_SHADERS[mode] || FX_FRAG);
    if (!vs || !fs) return null;
    const prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn('WebGL-program feilet:', gl.getProgramInfoLog(prog));
      return null;
    }
    fxProgs[mode] = {
      prog,
      uni: {
        res:    gl.getUniformLocation(prog, 'u_res'),
        time:   gl.getUniformLocation(prog, 'u_time'),
        hue:    gl.getUniformLocation(prog, 'u_hue'),
        energy: gl.getUniformLocation(prog, 'u_energy'),
      },
    };
    return fxProgs[mode];
  }

  function fxResize() {
    if (!fxGl || !fxCanvas) return;
    const wrap = document.getElementById('radio-vis-wrap');
    if (!wrap) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5); // fraktalen er tung nok
    const w = Math.max(1, Math.round(wrap.clientWidth  * dpr));
    const h = Math.max(1, Math.round(wrap.clientHeight * dpr));
    if (fxCanvas.width !== w || fxCanvas.height !== h) {
      fxCanvas.width = w; fxCanvas.height = h;
    }
    fxGl.viewport(0, 0, w, h);
  }

  function startGL() {
    if (!fxInit()) { visMode = 'bars'; startVisualizer(); return; } // fallback
    const entry = fxProgram(visMode);
    if (!entry) { visMode = 'bars'; startVisualizer(); return; }
    const gl = fxGl, uni = entry.uni;
    gl.useProgram(entry.prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, fxBuf);
    const loc = gl.getAttribLocation(entry.prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    fxCanvas.classList.add('active');
    fxResize();
    fxLastTs = 0;
    function loop() {
      fxFrame = requestAnimationFrame(loop);
      if (!fxGl) return;
      const now = performance.now();
      if (!fxLastTs) fxLastTs = now;
      fxClock += (now - fxLastTs) * visSpeed;
      fxLastTs = now;
      // Valgfri lyd-puls: bruk analyseren om den gir data, ellers rolig 0.
      let energy = 0;
      if (analyser) {
        const n = Math.min(24, analyser.frequencyBinCount);
        const d = new Uint8Array(n);
        analyser.getByteFrequencyData(d);
        let s = 0; for (let i = 0; i < n; i++) s += d[i];
        energy = Math.min(1, (s / (n * 255)) * 1.6);
      }
      gl.uniform2f(uni.res, fxCanvas.width, fxCanvas.height);
      gl.uniform1f(uni.time, fxClock / 1000);
      gl.uniform1f(uni.hue, visHue == null ? -1 : (((visHue % 360) + 360) % 360) / 360);
      gl.uniform1f(uni.energy, energy);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    loop();
  }

  function stopFractal() {
    if (fxFrame) { cancelAnimationFrame(fxFrame); fxFrame = null; }
    fxCanvas?.classList.remove('active');
  }

  function startVisualizer() {
    stopVisualizer();
    if (!canvas) return;
    // Video-modus: ingen canvas/WebGL — bare den lydløse loopede iframen.
    if (isVideoMode(visMode)) { showVisVideo(visMode); return; }
    // WebGL-modusene er lydfrie (kjører på tid) — trenger ikke analyser.
    if (FX_SHADERS[visMode]) { startGL(); return; }
    if (!analyser) return;
    visCtx = canvas.getContext('2d');
    particles = [];
    visLastTs = 0;

    function draw() {
      visFrame = requestAnimationFrame(draw);
      if (!visCtx || !canvas.width) return;
      // Oppdater fart-klokka før vi tegner.
      const now = performance.now();
      if (!visLastTs) visLastTs = now;
      visClock += (now - visLastTs) * visSpeed;
      visLastTs = now;
      const bufLen = analyser.frequencyBinCount;
      const dataFreq = new Uint8Array(bufLen);
      const dataTime = new Uint8Array(bufLen);
      analyser.getByteFrequencyData(dataFreq);
      analyser.getByteTimeDomainData(dataTime);

      visCtx.clearRect(0, 0, canvas.width, canvas.height);

      if      (visMode === 'bars')        drawBars(dataFreq, bufLen);
      else if (visMode === 'circle')      drawCircle(dataFreq, bufLen);
      else if (visMode === 'wave')        drawWave(dataTime, bufLen);
      else if (visMode === 'particles')   drawParticles(dataFreq, bufLen);
    }
    draw();
  }

  function stopVisualizer() {
    stopFractal();
    if (visFrame) { cancelAnimationFrame(visFrame); visFrame = null; }
    if (visCtx && canvas) visCtx.clearRect(0, 0, canvas.width, canvas.height);
  }

  // Avrundet rektangel-sti (faller tilbake til arcTo om ctx.roundRect mangler).
  function visRoundRect(x, y, w, h, r) {
    if (h < 0) { y += h; h = -h; }
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    visCtx.beginPath();
    if (visCtx.roundRect) { visCtx.roundRect(x, y, w, h, r); return; }
    visCtx.moveTo(x + r, y);
    visCtx.arcTo(x + w, y,     x + w, y + h, r);
    visCtx.arcTo(x + w, y + h, x,     y + h, r);
    visCtx.arcTo(x,     y + h, x,     y,     r);
    visCtx.arcTo(x,     y,     x + w, y,     r);
    visCtx.closePath();
  }

  function drawBars(data, bufLen) {
    const W = canvas.width, H = canvas.height;
    visCtx.fillStyle = 'rgba(8,6,20,0.22)';
    visCtx.fillRect(0, 0, W, H);
    const baseline = H * 0.80;
    const count = Math.min(bufLen, 80);           // færre, breiere søyler = renere look
    const stepI = Math.floor(bufLen / count) || 1;
    const slot  = W / count;
    const barW  = slot * 0.7;
    let avg = 0;
    for (let c = 0; c < count; c++) {
      const v = data[c * stepI] / 255;
      avg += v;
      const h = v * baseline * 0.95;
      const x = c * slot + (slot - barW) / 2;
      const hue = visHueOf(250 + (c / count) * 110); // lilla → rosa (el. egen farge)
      // Glød
      visCtx.shadowBlur  = 16 * v;
      visCtx.shadowColor = `hsla(${hue},90%,60%,${0.7 * v})`;
      const grad = visCtx.createLinearGradient(0, baseline - h, 0, baseline);
      grad.addColorStop(0, `hsla(${hue},95%,72%,1)`);
      grad.addColorStop(1, `hsla(${hue},85%,46%,0.85)`);
      visCtx.fillStyle = grad;
      visRoundRect(x, baseline - h, barW, h, Math.min(barW / 2, 6));
      visCtx.fill();
      // Refleksjon under grunnlinjen
      visCtx.shadowBlur = 0;
      const refl = visCtx.createLinearGradient(0, baseline, 0, baseline + h * 0.5);
      refl.addColorStop(0, `hsla(${hue},85%,58%,0.30)`);
      refl.addColorStop(1, 'hsla(0,0%,0%,0)');
      visCtx.fillStyle = refl;
      visRoundRect(x, baseline, barW, h * 0.5, Math.min(barW / 2, 6));
      visCtx.fill();
    }
    visCtx.shadowBlur = 0;
    // Glødende grunnlinje
    avg /= count;
    const bbh = visBaseHue();
    const base = visCtx.createLinearGradient(0, 0, W, 0);
    base.addColorStop(0,   `hsla(${bbh},85%,76%,0)`);
    base.addColorStop(0.5, `hsla(${bbh},90%,80%,${0.45 + avg * 0.4})`);
    base.addColorStop(1,   `hsla(${bbh},85%,76%,0)`);
    visCtx.fillStyle = base;
    visCtx.fillRect(0, baseline - 1.5, W, 3);
  }

  function drawCircle(data, bufLen) {
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H / 2;
    const baseR = Math.min(W, H) * 0.20;
    const t = visT();
    visCtx.fillStyle = 'rgba(8,6,20,0.28)';
    visCtx.fillRect(0, 0, W, H);
    const count = Math.min(bufLen, 120);
    const stepI = Math.floor(bufLen / count) || 1;
    const segW  = Math.max(1.5, (Math.PI * 2 * baseR / count) * 0.6);
    let bass = 0;
    visCtx.lineCap = 'round';
    for (let c = 0; c < count; c++) {
      const v = data[c * stepI] / 255;
      if (c < 10) bass += v / 10;
      const ang = (c / count) * Math.PI * 2 + t * 0.15;   // sakte rotasjon
      const amp = v * baseR * 1.7;
      const ca = Math.cos(ang), sa = Math.sin(ang);
      const hue = visHueOf((c / count) * 300 + 220);
      visCtx.strokeStyle = `hsla(${hue},95%,${52 + v * 18}%,0.92)`;
      visCtx.lineWidth   = segW;
      visCtx.shadowBlur  = 14 * v;
      visCtx.shadowColor = `hsla(${hue},95%,60%,0.9)`;
      visCtx.beginPath();
      visCtx.moveTo(cx + ca * baseR, cy + sa * baseR);
      visCtx.lineTo(cx + ca * (baseR + amp), cy + sa * (baseR + amp));
      visCtx.stroke();
    }
    visCtx.shadowBlur = 0;
    // Pulserende kjerne (bass-drevet)
    const cbh = visBaseHue();
    const coreR = baseR * (0.7 + bass * 0.5);
    const core  = visCtx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
    core.addColorStop(0,   `hsla(${cbh},90%,78%,${0.45 + bass * 0.4})`);
    core.addColorStop(0.6, `hsla(${cbh},83%,58%,${0.16 + bass * 0.2})`);
    core.addColorStop(1,   `hsla(${cbh},83%,58%,0)`);
    visCtx.fillStyle = core;
    visCtx.beginPath();
    visCtx.arc(cx, cy, coreR, 0, Math.PI * 2);
    visCtx.fill();
    // Indre ring
    visCtx.strokeStyle = `hsla(${cbh},80%,81%,${0.3 + bass * 0.3})`;
    visCtx.lineWidth   = 1.5;
    visCtx.beginPath();
    visCtx.arc(cx, cy, baseR, 0, Math.PI * 2);
    visCtx.stroke();
  }

  function drawWave(data, bufLen) {
    const W = canvas.width, H = canvas.height;
    const mid = H / 2;
    visCtx.fillStyle = 'rgba(8,6,20,0.30)';
    visCtx.fillRect(0, 0, W, H);
    const sliceW = W / bufLen;
    visCtx.lineCap  = 'round';
    visCtx.lineJoin = 'round';
    // Fylt glød-område under hovedbølgen
    visCtx.beginPath();
    let x = 0;
    for (let i = 0; i < bufLen; i++) {
      const y = (data[i] / 128 - 1) * (H * 0.42) + mid;
      i === 0 ? visCtx.moveTo(x, y) : visCtx.lineTo(x, y);
      x += sliceW;
    }
    visCtx.lineTo(W, H); visCtx.lineTo(0, H); visCtx.closePath();
    const wbh = visBaseHue();
    const fill = visCtx.createLinearGradient(0, 0, 0, H);
    fill.addColorStop(0,   `hsla(${wbh},83%,57%,0)`);
    fill.addColorStop(0.5, `hsla(${wbh},90%,67%,0.22)`);
    fill.addColorStop(1,   `hsla(${wbh},78%,43%,0.04)`);
    visCtx.fillStyle = fill;
    visCtx.fill();
    // Flerlags glødende linjer (bakerst lag først)
    for (let layer = 2; layer >= 0; layer--) {
      const hue = visHueOf(250 + layer * 35);
      const amp = (H * 0.42) * (1 - layer * 0.22);
      visCtx.beginPath();
      x = 0;
      for (let i = 0; i < bufLen; i++) {
        const y = (data[i] / 128 - 1) * amp + mid;
        i === 0 ? visCtx.moveTo(x, y) : visCtx.lineTo(x, y);
        x += sliceW;
      }
      visCtx.strokeStyle = `hsla(${hue},95%,70%,${0.9 - layer * 0.22})`;
      visCtx.lineWidth   = (2 - layer) + 1.5;
      visCtx.shadowBlur  = layer === 0 ? 16 : 6;
      visCtx.shadowColor = `hsla(${hue},95%,65%,0.8)`;
      visCtx.stroke();
    }
    visCtx.shadowBlur = 0;
  }

  function drawParticles(data, bufLen) {
    const W = canvas.width, H = canvas.height;
    visCtx.fillStyle = 'rgba(8,6,20,0.16)';
    visCtx.fillRect(0, 0, W, H);
    // Bass energy
    let bass = 0;
    for (let i = 0; i < 16; i++) bass += data[i];
    bass /= (16 * 255);

    // Spawn particles on bass hit (radielt utbrudd)
    if (bass > 0.45 && particles.length < 260) {
      const n = Math.floor(bass * 10);
      for (let i = 0; i < n; i++) {
        const a  = Math.random() * Math.PI * 2;
        const sp = bass * (4 + Math.random() * 10);
        particles.push({
          x: W / 2, y: H / 2,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - bass * 2,
          r:  1.5 + Math.random() * 4 * bass,
          hue: visHueOf(230 + Math.random() * 130),
          life: 1,
        });
      }
    }
    // Additiv glød for et lysende, proft uttrykk
    visCtx.globalCompositeOperation = 'lighter';
    particles = particles.filter(p => p.life > 0.02);
    const spd = visSpeed;                     // fart styrer hvor raskt de flyr/dør
    particles.forEach(p => {
      p.x += p.vx * spd; p.y += p.vy * spd; p.vy += 0.06 * spd;
      p.vx *= 0.99; p.vy *= 0.99;
      p.life -= 0.012 * spd; p.r *= 0.995;
      const rr = p.r * 3;
      const g = visCtx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rr);
      g.addColorStop(0, `hsla(${p.hue},95%,72%,${p.life})`);
      g.addColorStop(1, `hsla(${p.hue},95%,60%,0)`);
      visCtx.fillStyle = g;
      visCtx.beginPath();
      visCtx.arc(p.x, p.y, rr, 0, Math.PI * 2);
      visCtx.fill();
    });
    // Sentral beat-glød
    const pbh = visBaseHue();
    const beatR = Math.min(W, H) * (0.06 + bass * 0.18);
    const bg = visCtx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, beatR);
    bg.addColorStop(0, `hsla(${pbh},90%,73%,${0.5 * bass})`);
    bg.addColorStop(1, `hsla(${pbh},83%,58%,0)`);
    visCtx.fillStyle = bg;
    visCtx.beginPath();
    visCtx.arc(W / 2, H / 2, beatR, 0, Math.PI * 2);
    visCtx.fill();
    visCtx.globalCompositeOperation = 'source-over';
  }

  function setVisMode(mode, btn) {
    visMode = mode;
    // Bare visualiser-stil-knappene, ikke størrelse-knappene
    document.querySelectorAll('.vis-style-row .vis-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    particles = [];
    if (isVideoMode(mode)) {
      // Video-modus: lydløs, loopet bakgrunn. Uavhengig av om radioen spiller.
      stopVisualizer();          // stopp evt. canvas/WebGL-motor
      showVisVideo(mode);
      return;
    }
    hideVisVideo();              // forlot video-modus → stopp iframen
    // Bytt motor live om noe spilles (2D-canvas ↔ WebGL-fraktal).
    if (currentStation && isPlaying) startVisualizer();
    else stopFractal();
  }

  // ── Video-visualisering (lydløs, loopet YouTube-bakgrunn) ───────────────
  // Kun visuelt — lyden kommer alltid fra radiostrømmen. Autoplay krever mute=1.
  // Hver video-modus peker på en YouTube-ID; legg til flere ved behov.
  // Klassikerne: de samme visualene som lå fast her før AI-rotasjonen. Alle er
  // verifisert innbyggbare, og de har STABILE modus-navn (video, video3, …) så
  // ingenting peker i tomme luften. De brukes nå til to ting:
  //   a) hele raden når /api/visuals-fresh ikke svarer (nøkkel/kvote/nett), og
  //   b) noen faste plasser i den roterende raden, så gamle favoritter som
  //      Mandala, Alex Grey og Portal aldri forsvinner helt.
  // `group` gjør at et roterende utsnitt alltid får en sjanger-miks.
  const VIS_CLASSICS = [
    { mode: 'video',   id: 'dfj1EmDLrto', emoji: '🎥', label: '4K Cosmos',    group: 'space'   }, // Deep Space Ambient — 4K HDR
    { mode: 'video3',  id: 'hOgVAYpHPCc', emoji: '🌊', label: 'Flow',         group: 'flow'    }, // Abstract Liquid — 4K UHD
    { mode: 'video4',  id: 'iDiUP7CFqh8', emoji: '🎆', label: 'Aurora',       group: 'surreal' },
    { mode: 'video5',  id: 'MPfYkRVAdGo', emoji: '🔮', label: 'Prism',        group: 'psy'     },
    { mode: 'video6',  id: '82D2IzOcmO0', emoji: '🪼', label: 'Jellyfish',    group: 'flow'    }, // maneter i 4K UHD
    { mode: 'video7',  id: 'S5vIFoBC-30', emoji: '🌄', label: 'Surreal',      group: 'surreal' },
    { mode: 'video8',  id: '8pToLdB-POU', emoji: '🌌', label: 'Dream',        group: 'surreal' },
    { mode: 'video9',  id: 'L1vrPpM4eyM', emoji: '🧘', label: 'Healing',      group: 'ai'      }, // 4K AI-grafikk
    { mode: 'video10', id: '5p2YlnHHmUU', emoji: '🟣', label: 'Neon tunnel',  group: 'flow'    }, // 8K VJ-loop
    { mode: 'video11', id: 'UoVYRqFdCdY', emoji: '👁️', label: 'Cosmic eye',   group: 'psy'     },
    { mode: 'video12', id: 'PfXd4pUWgOE', emoji: '🎨', label: 'AI art',       group: 'ai'      },
    { mode: 'video13', id: 'R3T3Z2BJYlc', emoji: '🍄', label: 'Psydub',       group: 'psy'     },
    { mode: 'video14', id: 'QsxVa1Z8Fz4', emoji: '🌈', label: 'Psychedelia',  group: 'psy'     },
    { mode: 'video15', id: '_HC6WIN4ssU', emoji: '🦋', label: 'Butterfly',    group: 'kaleido' },
    { mode: 'video16', id: 'XtfcYUE2Rj4', emoji: '🔷', label: 'Mandala',      group: 'kaleido' },
    { mode: 'video17', id: 'uWTZNYhF2uU', emoji: '🧬', label: 'Alex Grey',    group: 'psy'     },
    { mode: 'video18', id: 'vOEEVlxugqk', emoji: '🏯', label: 'Tang',         group: 'ai'      }, // deforum-animasjon
    { mode: 'video19', id: 'CPu8pZPClww', emoji: '🌀', label: 'Portal',       group: 'kaleido' },
    { mode: 'video20', id: 'HtOUVYG9lw8', emoji: '🌌', label: 'Visual 20',    group: 'fractal' },
    { mode: 'video21', id: 'RZu_n0osOEo', emoji: '✨', label: 'Visual 21',    group: 'psy'     },
    { mode: 'video22', id: 'HPtmuJRrAao', emoji: '💫', label: 'Visual 22',    group: 'fractal' },
    // Tidligere «AI-fersk»-reservepool — også verifiserte, lydløse looper.
    { mode: 'video23', id: 'Mol7VhZQn6s', emoji: '🌀', label: 'Psytrance',    group: 'psy'     },
    { mode: 'video24', id: '7F3YaKFaC8A', emoji: '🌈', label: 'Trance vis',   group: 'psy'     },
    { mode: 'video25', id: '-rocTj5Zr9I', emoji: '🍄', label: 'Trippy',       group: 'psy'     },
    { mode: 'video26', id: 'QsSIBvcKEk4', emoji: '🔮', label: 'Fractal',      group: 'fractal' },
    { mode: 'video27', id: 'bbTgNS7_BVc', emoji: '👁️', label: 'Third eye',    group: 'psy'     },
    { mode: 'video28', id: 'xGsDRoDwYDw', emoji: '✨', label: 'Deforum',      group: 'ai'      },
    { mode: 'video29', id: 'lKygub953UQ', emoji: '🌌', label: 'Cosmos',       group: 'space'   },
    { mode: 'video30', id: 'IsnIhcE9HOs', emoji: '💫', label: 'Kaleidoscope', group: 'kaleido' },
  ];
  const VIS_VIDEOS = {};
  VIS_CLASSICS.forEach(v => { VIS_VIDEOS[v.mode] = v.id; });

  // ── Roterende utvalg ────────────────────────────────────────────────────
  // AI-modusene får navn etter video-id-en («ai_<id>»), ikke plassnummer, så en
  // valgt visual peker på SAMME video selv om raden blir bygget på nytt med et
  // annet utsnitt.
  const AI_VIDEOS = {};        // ai_<id> → YouTube-id (bygges ved render)
  let aiPool = null;           // rå pool fra /api/visuals-fresh
  let visualsShown = null;     // lista som vises nå: [{mode?,id,emoji,label,group}]
  let visualsFetched = false;  // har vi kalt /api/visuals-fresh i denne økten?
  const visMeta = {};          // id → {emoji,label} (husk navn på tvers av render)
  const VIS_SHOW = 20;         // antall video-knapper vi viser samtidig
  const VIS_CLASSIC_SLOTS = 5; // hvor mange av plassene klassikerne beholder
  const aiModeOf = id => 'ai_' + id;
  // Fast «AI visual 5»: en bruker-valgt video som ALLTID ligger på plass 5 (indeks 4),
  // lydløst som resten. Resten av plassene roterer.
  const AI_VISUAL_PIN = { index: 4, id: 'OikOgyDeOQw', emoji: '🌀', label: 'AI visual 5' };
  function applyAiVisualPin(list) {
    const pin = { id: AI_VISUAL_PIN.id, emoji: AI_VISUAL_PIN.emoji, label: AI_VISUAL_PIN.label, group: 'pin' };
    // Ikke la den samme videoen også dukke opp på en av de roterende plassene.
    const arr = (Array.isArray(list) ? list : []).filter(it => it && it.id !== pin.id);
    if (arr.length > AI_VISUAL_PIN.index) arr[AI_VISUAL_PIN.index] = pin;  // bytt ut plass 5
    else arr.push(pin);                                                    // ellers legg sist
    return arr;
  }
  // Ny miks hver time — poolen fra serveren byttes bare 1×/døgn, så denne
  // rotasjonen er det som gjør at knappene skifter oftere (uten API-kostnad).
  function visSlot() { return Math.floor(Date.now() / 3600000); }
  // Flett gruppene inn i hverandre (psy, kaleido, space, psy, kaleido, space …)
  // slik at ETHVERT sammenhengende utsnitt får en sjanger-miks — ellers kunne
  // et timesvindu bestå av bare romfilm eller bare fraktaler.
  function interleaveByGroup(list) {
    const buckets = new Map();
    (list || []).forEach(it => {
      if (!it || !it.id) return;
      const k = it.group || 'other';
      if (!buckets.has(k)) buckets.set(k, []);
      buckets.get(k).push(it);
    });
    const rows = [...buckets.values()];
    const out = [];
    for (let i = 0; out.length < (list || []).length && i < 100; i++)
      rows.forEach(r => { if (r[i]) out.push(r[i]); });
    return out;
  }
  // Ta n elementer fra lista, med start som flytter seg per time (sirkulært).
  function rotateWindow(list, n, slot) {
    if (n <= 0 || !list.length) return [];
    if (list.length <= n) return list.slice();
    const off = ((slot % list.length) + list.length) % list.length;
    return Array.from({ length: n }, (_, i) => list[(off + i) % list.length]);
  }
  // Spre `extra` jevnt utover `base` (klassikerne mellom AI-valgene).
  function spreadInto(base, extra) {
    if (!extra.length) return base.slice();
    if (!base.length) return extra.slice();
    const out = [];
    const every = Math.max(1, Math.round(base.length / extra.length));
    let e = 0;
    base.forEach((it, i) => {
      out.push(it);
      if (e < extra.length && (i + 1) % every === 0) out.push(extra[e++]);
    });
    while (e < extra.length) out.push(extra[e++]);
    return out;
  }
  // Modus → visning-oppføring. Brukes for å holde det som spilles NÅ i raden,
  // også når rotasjonen har flyttet den ut av utvalget (ellers står ingen knapp
  // markert, og brukeren mister veien tilbake til videoen som kjører).
  function visualItemForMode(mode) {
    const classic = VIS_CLASSICS.find(v => v.mode === mode);
    if (classic) return classic;
    if (typeof mode === 'string' && mode.startsWith('ai_')) {
      const id = mode.slice(3);
      const meta = visMeta[id] || {};
      return { id, emoji: meta.emoji || '✨', label: meta.label || 'Playing', channel: meta.channel || null };
    }
    return null;
  }
  // Bygg lista som vises: AI-valg + noen klassikere, sjanger-flettet og
  // times-rotert, uten duplikate video-id-er, med den pinnede på plass 5.
  function buildVisualList(items) {
    const slot = visSlot();
    const ai = rotateWindow(interleaveByGroup(items), Math.max(0, VIS_SHOW - VIS_CLASSIC_SLOTS), slot);
    // Ingen AI-data → fyll hele raden med klassikere.
    const classics = rotateWindow(interleaveByGroup(VIS_CLASSICS), ai.length ? VIS_CLASSIC_SLOTS : VIS_SHOW, slot);
    const seen = new Set();
    const merged = spreadInto(ai, classics).filter(it => {
      if (!it || !it.id || seen.has(it.id)) return false;
      seen.add(it.id);
      return true;
    });
    // Videoen som spilles nå skal alltid ha sin egen knapp, først i raden.
    const cur = isVideoMode(visMode) ? visualItemForMode(visMode) : null;
    if (cur && !seen.has(cur.id)) merged.unshift(cur);
    return applyAiVisualPin(merged);
  }
  const isVideoMode = m =>
    Object.prototype.hasOwnProperty.call(VIS_VIDEOS, m) ||
    Object.prototype.hasOwnProperty.call(AI_VIDEOS, m);
  function visVideoSrc(id) {
    return `https://www.youtube-nocookie.com/embed/${id}`
      + `?autoplay=1&mute=1&loop=1&playlist=${id}`
      + `&controls=0&modestbranding=1&rel=0&playsinline=1&disablekb=1&fs=0&iv_load_policy=3`;
  }
  // Hvilken video-ID iframen viser nå (for å unngå unødig reload ved re-vis).
  let visVideoLoaded = null;
  function showVisVideo(mode) {
    const frame = document.getElementById('radio-vis-video');
    if (!frame) return;
    const id = VIS_VIDEOS[mode] || AI_VIDEOS[mode]
      || VIS_VIDEOS[isVideoMode(visMode) ? visMode : 'video'] || AI_VIDEOS[visMode];
    if (visVideoLoaded !== id) { frame.src = visVideoSrc(id); visVideoLoaded = id; }
    frame.classList.add('active');
    sizeVisVideo();
    forceVisRepaint(frame);   // mal den nye videoen med en gang (ikke først ved muse-hover)
    document.getElementById('radio-idle')?.classList.add('hidden');
    updateVisCredit(mode);
  }
  // Liten kreditering nederst i videoen: hvilken YouTube-kanal klippet er fra.
  // Kun AI-hentede visuals har kanalnavn (fra /api/visuals-fresh) — klassikerne
  // (VIS_CLASSICS) mangler dette feltet, så kreditten skjules pent for dem.
  function updateVisCredit(mode) {
    const el = document.getElementById('radio-vis-credit');
    if (!el) return;
    const item = visualItemForMode(mode);
    const channel = item && item.channel;
    if (channel) {
      el.textContent = '🎬 ' + channel;
      el.hidden = false;
    } else {
      el.hidden = true;
    }
  }
  // Chrome/Safari maler av og til ikke den nye iframen før noe endrer stilen
  // (f.eks. muse-hover på en knapp). Tving en repaint ved å nudge transformen
  // over et par frames slik at videoen dukker opp umiddelbart ved bytte.
  function forceVisRepaint(frame) {
    if (!frame) return;
    const base = 'translate(-50%, -50%) translateZ(0)';
    frame.style.transform = base + ' scale(1.0001)';
    requestAnimationFrame(() => {
      frame.style.transform = base;
    });
  }
  function hideVisVideo() {
    const frame = document.getElementById('radio-vis-video');
    if (!frame) return;
    frame.classList.remove('active');
    frame.src = '';   // stopp avspilling helt (frigjør ressurser)
    visVideoLoaded = null;
    const credit = document.getElementById('radio-vis-credit');
    if (credit) credit.hidden = true;
    // Vis idle-teksten igjen om ingenting spiller
    if (!(currentStation && isPlaying)) document.getElementById('radio-idle')?.classList.remove('hidden');
  }
  // Skalér iframen så 16:9-videoen dekker hele visualizeren (cover, sentrert),
  // uten svarte kanter og uten å forvrenge bildet.
  function sizeVisVideo() {
    const wrap  = document.getElementById('radio-vis-wrap');
    const frame = document.getElementById('radio-vis-video');
    if (!wrap || !frame || !frame.classList.contains('active')) return;
    const cw = wrap.clientWidth, ch = wrap.clientHeight, ar = 16 / 9;
    let w, h;
    if (cw / ch > ar) { w = cw; h = cw / ar; }   // beholder bredde → overflow i høyden
    else              { h = ch; w = ch * ar; }   // beholder høyde → overflow i bredden
    frame.style.width  = Math.ceil(w) + 'px';
    frame.style.height = Math.ceil(h) + 'px';
  }

  // ── AI-roterte visuals (lydløse 4K-looper AI henter fra YouTube) ─────────
  // Bygger ALLE video-knappene i #vis-ai-row. AI-modusene heter ai_<videoId> og
  // legges i AI_VIDEOS, klassikerne beholder sine faste modus-navn — begge
  // behandles som video-modus av setVisMode/showVisVideo (mute=1 → lydløst).
  // Feiler /api/visuals-fresh fylles raden med klassikerne i stedet.
  function renderAiVisualButtons() {
    const row = document.getElementById('vis-ai-row');
    if (!row) return;
    // Tøm evt. gamle knapper (behold etikett-chippen).
    row.querySelectorAll('.vis-btn').forEach(b => b.remove());
    for (const k of Object.keys(AI_VIDEOS)) delete AI_VIDEOS[k];
    const items = Array.isArray(visualsShown) ? visualsShown : [];
    if (!items.length) { row.style.display = 'none'; return; }
    items.forEach(it => {
      const mode = it.mode || aiModeOf(it.id);
      if (!it.mode) AI_VIDEOS[mode] = it.id;
      visMeta[it.id] = { emoji: it.emoji, label: it.label, channel: it.channel || null };
      const btn = document.createElement('button');
      btn.className = 'vis-btn' + (visMode === mode ? ' active' : '');
      btn.textContent = `${it.emoji || '🌀'} ${it.label || 'AI visual'}`;
      btn.setAttribute('onclick', `Radio.setVisMode('${mode}',this)`);
      row.appendChild(btn);
    });
    row.style.display = '';
  }
  // Kalles hver gang radio-visningen bygges: vis raden med en gang (klassikere
  // eller poolen vi alt har), og hent poolen fra serveren én gang per økt.
  function loadAiVisuals() {
    visualsShown = buildVisualList(aiPool || []);
    renderAiVisualButtons();
    if (visualsFetched) return;
    visualsFetched = true;
    fetch('/api/visuals-fresh')
      .then(r => r.json())
      .then(data => {
        const items = (data && Array.isArray(data.items)) ? data.items : [];
        // Behold kun gyldige oppføringer med en YouTube-id.
        const valid = items.filter(it => it && typeof it.id === 'string' && it.id.length >= 6);
        if (!valid.length) return;              // tomt svar → behold klassikerne
        aiPool = valid;
        visualsShown = buildVisualList(aiPool);
        renderAiVisualButtons();
      })
      .catch(() => { /* nett/API nede → klassikerne står som de er */ });
  }

  // ── Egen farge + fart («Stil»-fanen) ───────────────────────────────────
  // Konverter en full-mettet hue (0..360) → hex, for å forhåndsutfylle fargevelgeren.
  function hslHueToHex(h, s = 100, l = 60) {
    s /= 100; l /= 100;
    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
    const to = x => Math.round(x * 255).toString(16).padStart(2, '0');
    return `#${to(f(0))}${to(f(8))}${to(f(4))}`;
  }
  // Konverter en valgt hex-farge → hue (0..359).
  function hexToHue(hex) {
    const m = String(hex).replace('#', '');
    const r = parseInt(m.slice(0, 2), 16) / 255;
    const g = parseInt(m.slice(2, 4), 16) / 255;
    const b = parseInt(m.slice(4, 6), 16) / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    let h = 0;
    if (d !== 0) {
      if      (mx === r) h = ((g - b) / d) % 6;
      else if (mx === g) h = (b - r) / d + 2;
      else               h = (r - g) / d + 4;
      h = h * 60; if (h < 0) h += 360;
    }
    return Math.round(h);
  }

  function setVisColor(hex) {
    visHue = hexToHue(hex);
    localStorage.setItem('pv_vis_hue', String(visHue));
    document.getElementById('vis-hue-auto')?.classList.remove('active');
  }
  function setVisColorAuto(btn) {
    visHue = null;
    localStorage.removeItem('pv_vis_hue');
    document.getElementById('vis-hue-auto')?.classList.add('active');
    if (btn) btn.classList.add('active');
  }
  function setVisSpeed(v) {
    visSpeed = parseFloat(v) || 1;
    localStorage.setItem('pv_vis_speed', String(visSpeed));
    const lab = document.getElementById('vis-speed-val');
    if (lab) lab.textContent = visSpeed.toFixed(2) + '×';
  }
  function toggleVisTune(btn) {
    const panel = document.getElementById('vis-tune-panel');
    if (!panel) return;
    const show = panel.hidden;
    panel.hidden = !show;
    btn.classList.toggle('active', show);
  }

  // ── Visualizer-størrelse (Liten · Middels · Stor · Fullskjerm) ─────────
  function setVisSize(size, btn) {
    visSize = size;
    localStorage.setItem('pv_vis_size', size);
    clearVisFree();           // en preset overstyrer fri (drag/zoom) størrelse
    applyVisSize();
    document.querySelectorAll('.vis-size-btn').forEach(b => b.classList.toggle('active', b.dataset.size === size));
  }

  function applyVisSize() {
    const wrap = document.getElementById('radio-vis-wrap');
    if (!wrap) return;
    wrap.classList.remove('vis-size-small', 'vis-size-medium', 'vis-size-large', 'vis-size-full');
    wrap.classList.add('vis-size-' + visSize);
    // Esc avslutter fullskjerm + auto-skjul av kontroller (kun i full-modus)
    if (visSize === 'full') { document.addEventListener('keydown', _visEsc); startVisAutoHide(); }
    else                    { document.removeEventListener('keydown', _visEsc); stopVisAutoHide(); }
    resizeCanvas();
  }

  function _visEsc(e) {
    if (e.key === 'Escape') exitVisFull();
  }

  // ── Full-modus: auto-skjul kontrollradene som en videospiller ──────────
  // Radene ligger skjult (via CSS) til musa beveges; da vises de, og gjemmes
  // igjen etter ~3 s ro. CSS styrer selve visningen — JS setter bare klassen.
  let _visIdleTimer = null;
  function _showVisControls() {
    const wrap = document.getElementById('radio-vis-wrap');
    if (!wrap) return;
    wrap.classList.add('vis-controls-shown');
    clearTimeout(_visIdleTimer);
    _visIdleTimer = setTimeout(() => wrap.classList.remove('vis-controls-shown'), 3000);
  }
  function startVisAutoHide() {
    const wrap = document.getElementById('radio-vis-wrap');
    if (!wrap) return;
    // Lytt på heile dokumentet (ikkje berre wrap) slik at rørsle over den
    // flytande venne-docken òg vekkjer kontrollane + docken att.
    document.addEventListener('mousemove', _showVisControls);
    document.addEventListener('touchstart', _showVisControls, { passive: true });
    _showVisControls();   // vis straks ved bytte til full, skjul etter timeout
  }
  function stopVisAutoHide() {
    clearTimeout(_visIdleTimer);
    document.removeEventListener('mousemove', _showVisControls);
    document.removeEventListener('touchstart', _showVisControls);
    const wrap = document.getElementById('radio-vis-wrap');
    if (!wrap) return;
    wrap.classList.remove('vis-controls-shown');
  }

  // Avslutt fullskjerm → tilbake til «Middels»
  function exitVisFull() {
    setVisSize('medium', document.querySelector('.vis-size-btn[data-size="medium"]'));
  }

  // ── Fri størrelse: zoom-knapper + hjørne/kant-drag ─────────────────────
  // Gjenbruker mekanikken fra initEmbedResize(), men #radio-vis-wrap ligger i
  // flyt (ikke position:absolute), så boksen forankres øverst-venstre og alle
  // håndtak endrer bare width/height.
  const VIS_MIN_W = 200, VIS_MIN_H = 120;
  let _visResizeAbort = null;

  function enterVisFree(wrap) {
    if (wrap.classList.contains('vis-size-free')) return;
    const w = wrap.offsetWidth, h = wrap.offsetHeight;
    wrap.classList.add('vis-size-free');
    wrap.style.width  = w + 'px';
    wrap.style.height = h + 'px';
  }

  function clearVisFree() {
    const wrap = document.getElementById('radio-vis-wrap');
    localStorage.removeItem('pv_vis_free');
    if (!wrap) return;
    wrap.classList.remove('vis-size-free');
    wrap.style.width = '';
    wrap.style.height = '';
  }

  function saveVisFree(wrap) {
    localStorage.setItem('pv_vis_free', JSON.stringify({ w: wrap.offsetWidth, h: wrap.offsetHeight }));
  }

  // Live størrelses-indikator midt på canvasen mens man drar/zoomer.
  let _visBadgeTimer = null;
  function showVisBadge(wrap) {
    const b = document.getElementById('vis-size-badge');
    if (!b) return;
    b.textContent = `${Math.round(wrap.offsetWidth)} × ${Math.round(wrap.offsetHeight)} px`;
    b.style.opacity = '1';
    clearTimeout(_visBadgeTimer);
    _visBadgeTimer = setTimeout(() => { b.style.opacity = '0'; }, 800);
  }

  function restoreVisFree() {
    const wrap = document.getElementById('radio-vis-wrap');
    if (!wrap) return;
    let saved; try { saved = JSON.parse(localStorage.getItem('pv_vis_free') || 'null'); } catch { saved = null; }
    if (!saved || !saved.w || !saved.h) return;
    const maxW = (wrap.parentElement?.clientWidth || saved.w);
    wrap.classList.add('vis-size-free');
    wrap.style.width  = Math.max(VIS_MIN_W, Math.min(saved.w, maxW)) + 'px';
    wrap.style.height = Math.max(VIS_MIN_H, saved.h) + 'px';
    resizeCanvas();
  }

  function visZoom(factor) {
    const wrap = document.getElementById('radio-vis-wrap');
    if (!wrap) return;
    if (visSize === 'full') return;       // ingen zoom i fullskjerm
    enterVisFree(wrap);
    const maxW = wrap.parentElement?.clientWidth || wrap.offsetWidth;
    const nw = Math.max(VIS_MIN_W, Math.min(wrap.offsetWidth  * factor, maxW));
    const nh = Math.max(VIS_MIN_H, wrap.offsetHeight * factor);
    wrap.style.width  = nw + 'px';
    wrap.style.height = nh + 'px';
    saveVisFree(wrap);
    resizeCanvas();
    showVisBadge(wrap);
  }
  function visZoomIn()  { visZoom(1.15); }
  function visZoomOut() { visZoom(1 / 1.15); }

  function initVisResize() {
    const wrap = document.getElementById('radio-vis-wrap');
    if (!wrap) return;
    if (_visResizeAbort) _visResizeAbort.abort();
    _visResizeAbort = new AbortController();
    const sig = _visResizeAbort.signal;

    let action = null;            // n|s|e|w|ne|nw|se|sw
    let startX, startY, startW, startH;

    function begin(cx, cy, dir) {
      if (visSize === 'full') return;
      enterVisFree(wrap);
      action = dir;
      startX = cx; startY = cy;
      startW = wrap.offsetWidth; startH = wrap.offsetHeight;
      document.body.style.userSelect = 'none';
    }

    function move(cx, cy) {
      if (!action) return;
      const maxW = wrap.parentElement?.clientWidth || startW;
      const dx = cx - startX, dy = cy - startY;
      // Forankret øverst-venstre: e/s vokser med dra-retning, w/n inverteres.
      if (action.includes('e')) wrap.style.width  = Math.max(VIS_MIN_W, Math.min(startW + dx, maxW)) + 'px';
      if (action.includes('w')) wrap.style.width  = Math.max(VIS_MIN_W, Math.min(startW - dx, maxW)) + 'px';
      if (action.includes('s')) wrap.style.height = Math.max(VIS_MIN_H, startH + dy) + 'px';
      if (action.includes('n')) wrap.style.height = Math.max(VIS_MIN_H, startH - dy) + 'px';
      resizeCanvas();
      showVisBadge(wrap);
    }

    function end() {
      if (action) saveVisFree(wrap);
      action = null;
      document.body.style.userSelect = '';
    }

    wrap.querySelectorAll('.vrr').forEach(handle => {
      handle.addEventListener('pointerdown', e => {
        if (e.button !== 0) return;
        e.preventDefault(); e.stopPropagation();
        begin(e.clientX, e.clientY, handle.dataset.resize);
      }, { signal: sig });
      // Dobbeltklikk = tilbake til valgt preset-størrelse.
      handle.addEventListener('dblclick', e => {
        e.preventDefault(); e.stopPropagation();
        clearVisFree();
        applyVisSize();
      }, { signal: sig });
    });

    document.addEventListener('pointermove', e => move(e.clientX, e.clientY), { signal: sig });
    document.addEventListener('pointerup', end, { signal: sig });
    document.addEventListener('pointercancel', end, { signal: sig });
  }

  // ── Custom streams ────────────────────────────────────────────────────
  function addCustomStream() {
    const url  = document.getElementById('custom-url')?.value?.trim();
    const name = document.getElementById('custom-name')?.value?.trim() || 'Custom';
    if (!url) { App.toast('Enter a stream URL', 'error'); return; }
    customStreams.push({ url, name });
    localStorage.setItem('pv_custom_streams', JSON.stringify(customStreams));
    render(); // re-render with new stream
    App.toast(`"${name}" added`, 'success');
  }

  function removeCustom(idx, e) {
    e.stopPropagation();
    customStreams.splice(idx, 1);
    localStorage.setItem('pv_custom_streams', JSON.stringify(customStreams));
    render();
  }

  function playUrl(url, nameOrInfo, emoji, color, desc) {
    let station;
    if (typeof nameOrInfo === 'object' && nameOrInfo !== null) {
      station = { id: 'ext_' + Math.random().toString(36).slice(2,9), url, ...nameOrInfo };
    } else {
      station = {
        id: 'ext_' + Math.random().toString(36).slice(2,9),
        name: nameOrInfo || 'Radio',
        url, emoji: emoji || '📻',
        color: color || '#22c55e',
        desc: desc || 'Live stream',
      };
    }
    currentStation = station;
    _playUrl(url, station);
    updateNowPlaying(station);
  }

  // Clean data-only station search — no DOM side effects, usable from chat page
  async function fetchStations(query) {
    if (!query || query.length < 2) return [];
    const list = await StreamFix.api(
      `/json/stations/search?name=${encodeURIComponent(query)}&limit=12&order=votes&reverse=true&hidebroken=true`
    );
    if (!list) return [];
    // Berre stasjonar nettlesaren faktisk kan spele, med https-oppgradert URL.
    return list
      .filter(s => s.url_resolved && StreamFix.playable(StreamFix.normalize(s.url_resolved)))
      .map(s => ({ ...s, url_resolved: StreamFix.normalize(s.url_resolved) }));
  }

  return {
    render, playStation, playCustom, togglePlay, stopRadio, playUrl, fetchStations, focusCategory,
    setVolume, volumeUp, volumeDown, toggleMute, setVisMode, setVisSize, exitVisFull, visZoomIn, visZoomOut, addCustomStream, removeCustom,
    setVisColor, setVisColorAuto, setVisSpeed, toggleVisTune,
    playSearchResult, saveSearchResult, onSearchInput, onSearchKey, aiSearch,
    toggleAiChat, sendAiMessage, onAiKeydown,
    setAsFavorite, openEmbed, closeEmbed, stopForMusicPlayer,
    get isPlaying() { return isPlaying; },
    get currentStation() { return currentStation; },
    get volume() { return volume; },
    get muted() { return muted; },
    get stations() { return STATIONS; },
  };
})();
// Eksporter til window — RadioDock (og andre moduler) leser `window.Radio?.…`.
// Radio er eit leksikalsk const, så utan denne er window.Radio undefined og heile
// den flytande radio-docken blir daude no-ops. Sjå window-global-gotcha.
window.Radio = Radio;
