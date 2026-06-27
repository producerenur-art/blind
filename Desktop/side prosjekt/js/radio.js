// Radio — Electronic music streams + Web Audio API visualizer
const Radio = (() => {

  // ── External player embeds (iframe) ──────────────────────────────────
  const EXTERNAL_PLAYERS = [
    {
      id: 'q37',
      name: 'Radio Q37',
      emoji: '📡',
      color: '#e11d48',
      desc: 'Radio for the mind travellers',
      url: 'https://radioq37.com/player/', // ← bytt til din faktiske player-URL
    },
    {
      id: 'u-recken',
      name: 'U-Recken',
      emoji: '🌀',
      color: '#7c3aed',
      desc: 'Psytrance to chill out',
      url: 'https://u-recken.com/',
    },
    {
      id: 'dice-radio',
      name: 'Dice Radio',
      emoji: '🎲',
      color: '#1d4ed8',
      desc: 'Greek electronic & underground radio',
      url: 'https://www.diceradio.gr/',
    },
  ];

  // ── Station catalogue ─────────────────────────────────────────────────
  // Energy order: Psytrance (high) → Dark Drone (deep/low)
  // ✓ = 100 % free, no account needed
  const STATIONS = [

    // ════════════════════════════════════════════
    // FEATURED
    // ════════════════════════════════════════════
    {
      id: 'stellar-psy', cat: 'Stellar',
      name: 'Stellar PSY',
      url:  'https://ice2.somafm.com/spacestation-128-mp3',
      emoji: '🌠', color: '#7c3aed',
      desc: 'Psychedelic Dub · Sound Core sin hovedkanal',
      featured: true,
    },

    // ════════════════════════════════════════════
    // RADIO Q37
    // ════════════════════════════════════════════
    {
      id: 'radioq37', cat: 'Radio Q37',
      name: 'Radio Q37',
      url:  'https://radioq.radioca.st/stream',
      emoji: '🔮', color: '#e11d48',
      desc: 'Radio for the mind travellers — Psychill · Ambient Dub · Deep Trance',
    },

    // ════════════════════════════════════════════
    // PSYTRANCE / GOA  ▲ høyest energi
    // ════════════════════════════════════════════
    {
      id: 'suburbsofgoa', cat: 'Psytrance / Goa',
      name: 'Suburbs of Goa',
      url:  'https://ice2.somafm.com/suburbsofgoa-128-mp3',
      emoji: '🕉️', color: '#f59e0b',
      desc: 'Indian electronica & psytrance ✓',
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

    // ════════════════════════════════════════════
    // EDM / HOUSE / TECHNO
    // ════════════════════════════════════════════
    {
      id: 'digitalis', cat: 'EDM / House / Techno',
      name: 'Digitalis',
      url:  'https://ice2.somafm.com/digitalis-256-mp3',
      emoji: '💊', color: '#ef4444',
      desc: 'Hypnotic techno & minimal ✓',
    },
    {
      id: 'defcon', cat: 'EDM / House / Techno',
      name: 'DEF CON Radio',
      url:  'https://ice2.somafm.com/defcon-128-mp3',
      emoji: '🔐', color: '#64748b',
      desc: 'Underground techno & hacker electronica ✓',
    },
    {
      id: 'specials', cat: 'EDM / House / Techno',
      name: 'SomaFM Specials',
      url:  'https://ice2.somafm.com/specials-128-mp3',
      emoji: '⭐', color: '#0891b2',
      desc: 'Eclectic electronic block party & dance ✓',
    },


    // ════════════════════════════════════════════
    // LO-FI / IDM
    // ════════════════════════════════════════════
    {
      id: 'cliqhop', cat: 'Lo-Fi / IDM',
      name: 'Cliqhop IDM',
      url:  'https://ice2.somafm.com/cliqhop-256-mp3',
      emoji: '🔮', color: '#8b5cf6',
      desc: 'Clicks, cuts & beeping IDM ✓',
    },
    {
      id: 'poptron', cat: 'Lo-Fi / IDM',
      name: 'PopTron',
      url:  'https://ice2.somafm.com/poptron-128-mp3',
      emoji: '🤖', color: '#06b6d4',
      desc: 'Electropop & hypnotic synth grooves ✓',
    },

    // ════════════════════════════════════════════
    // PSYBIENT / PSYCHILL
    // ════════════════════════════════════════════
    {
      id: 'thetrip', cat: 'Psybient / Psychill',
      name: 'The Trip',
      url:  'https://ice2.somafm.com/thetrip-128-mp3',
      emoji: '🌀', color: '#7c3aed',
      desc: 'Progressive trip-hop & psychedelic electronica ✓',
    },
    {
      id: 'fluid', cat: 'Psybient / Psychill',
      name: 'Fluid',
      url:  'https://ice2.somafm.com/fluid-128-mp3',
      emoji: '💧', color: '#06b6d4',
      desc: 'Psychedelic, electronic, experimental ✓',
    },

    // ════════════════════════════════════════════
    // CHILL OUT / DOWNTEMPO
    // ════════════════════════════════════════════
    {
      id: 'groovesalad', cat: 'Chill Out / Downtempo',
      name: 'Groove Salad',
      url:  'https://ice2.somafm.com/groovesalad-256-mp3',
      emoji: '🥗', color: '#10b981',
      desc: 'IDM, trip-hop & electronic downtempo ✓',
    },
    {
      id: 'gsclassic', cat: 'Chill Out / Downtempo',
      name: 'Groove Salad Classic',
      url:  'https://ice2.somafm.com/gsclassic-128-mp3',
      emoji: '🎐', color: '#14b8a6',
      desc: 'Classic chillout grooves from the early 2000s ✓',
    },
    {
      id: 'lush', cat: 'Chill Out / Downtempo',
      name: 'Lush',
      url:  'https://ice2.somafm.com/lush-128-mp3',
      emoji: '🌿', color: '#16a34a',
      desc: 'Sensuous, slow-moving electronic grooves ✓',
    },
    {
      id: 'beatblender', cat: 'Chill Out / Downtempo',
      name: 'Beat Blender',
      url:  'https://ice2.somafm.com/beatblender-128-mp3',
      emoji: '🎚️', color: '#ec4899',
      desc: 'Deep electronic beats & downtempo ✓',
    },
    {
      id: '1fm-chillout', cat: 'Chill Out / Downtempo',
      name: '1.FM Chillout Lounge',
      url:  'https://strm112.1.fm/chilloutlounge_mobile_mp3',
      emoji: '🛋️', color: '#0ea5e9',
      desc: '1.FM — electronic chill lounge 24/7',
    },


    // ════════════════════════════════════════════
    // AMBIENT / SPACE
    // ════════════════════════════════════════════
    {
      id: 'spacestation', cat: 'Ambient / Space',
      name: 'Space Station',
      url:  'https://ice2.somafm.com/spacestation-128-mp3',
      emoji: '🛸', color: '#0ea5e9',
      desc: 'Spacemusic & ambient electronica ✓',
    },
    {
      id: 'deepspaceone', cat: 'Ambient / Space',
      name: 'Deep Space One',
      url:  'https://ice2.somafm.com/deepspaceone-128-mp3',
      emoji: '🌑', color: '#1e40af',
      desc: 'Deep electronic ambient ✓',
    },
    {
      id: 'missioncontrol', cat: 'Ambient / Space',
      name: 'Mission Control',
      url:  'https://ice2.somafm.com/missioncontrol-128-mp3',
      emoji: '🚀', color: '#f97316',
      desc: 'Ambient space music ✓',
    },

    // ════════════════════════════════════════════
    // DRONE / DARK DRONE  ▼ dypest energi
    // ════════════════════════════════════════════
    {
      id: 'dronezone', cat: 'Drone / Dark Drone',
      name: 'Drone Zone',
      url:  'https://ice2.somafm.com/dronezone-256-mp3',
      emoji: '🌌', color: '#4f46e5',
      desc: 'Atmospheric ambient & dronescape ✓',
    },
    {
      id: 'doomed', cat: 'Drone / Dark Drone',
      name: 'Doomed — Dark Drone',
      url:  'https://ice2.somafm.com/doomed-256-mp3',
      emoji: '💀', color: '#7f1d1d',
      desc: 'Dark ambient & dark drone electronics ✓',
    },
    {
      id: 'darkzone', cat: 'Drone / Dark Drone',
      name: 'Dark Zone',
      url:  'https://ice2.somafm.com/darkzone-256-mp3',
      emoji: '🌑', color: '#0d0d1a',
      desc: 'The darker side of deep ambient — music for staring into the Abyss ✓',
    },
  ];

  // Group by category
  const CATEGORIES = [...new Set(STATIONS.map(s => s.cat))];

  // State
  let currentStation = null;
  let isPlaying = false;
  let volume = 0.8;
  let muted = false;
  let preMuteVolume = 0.8;
  let audioCtx = null;
  let analyser = null;
  let sourceNode = null;
  let visFrame = null;
  let visMode = 'bars'; // 'bars' | 'circle' | 'wave'
  let canvas = null, visCtx = null;
  let customStreams = JSON.parse(localStorage.getItem('pv_custom_streams') || '[]');
  let searchTimer = null;
  let searchResults = [];
  let aiHistory = [];
  let aiOpen = false;

  // ── Radio Browser API search ──────────────────────────────────────────
  async function searchRadio(query) {
    const el = document.getElementById('radio-search-results');
    if (!query || query.length < 2) {
      searchResults = [];
      if (el) el.classList.add('hidden');
      return;
    }
    if (el) { el.classList.remove('hidden'); el.innerHTML = '<div class="radio-search-loading">Søker…</div>'; }
    try {
      const res = await fetch(
        `https://de1.api.radio-browser.info/json/stations/search?name=${encodeURIComponent(query)}&limit=20&order=votes&reverse=true&hidebroken=true`,
        { headers: { 'User-Agent': 'ProfilVerse/1.0' } }
      );
      if (!res.ok) throw new Error('API feil');
      searchResults = await res.json();
      renderSearchResults(searchResults);
    } catch (e) {
      const el2 = document.getElementById('radio-search-results');
      if (el2) el2.innerHTML = '<div class="radio-search-empty">Kunne ikke hente resultater</div>';
    }
  }

  function renderSearchResults(results) {
    const el = document.getElementById('radio-search-results');
    if (!el) return;
    if (!results.length) {
      el.innerHTML = '<div class="radio-search-empty">Ingen kanaler funnet</div>';
      return;
    }
    el.innerHTML = results.map((s, i) => `
      <div class="radio-search-item" onclick="Radio.playSearchResult(${i})">
        <div class="radio-search-item-info">
          <div class="radio-search-item-name">${escHtml(s.name)}</div>
          <div class="radio-search-item-meta">${escHtml(s.country || '')}${s.tags ? ' · ' + escHtml(s.tags.split(',').slice(0,3).join(', ')) : ''}</div>
        </div>
        <button class="radio-search-save-btn" title="Lagre til egne strømmer" onclick="Radio.saveSearchResult(${i}, event)">＋</button>
      </div>
    `).join('');
  }

  function escHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function playSearchResult(i) {
    const s = searchResults[i];
    if (!s || !s.url_resolved) { App.toast('Ingen gyldig stream-URL', 'error'); return; }
    const station = {
      id: 'search_' + s.stationuuid,
      name: s.name,
      url: s.url_resolved,
      emoji: '📡',
      color: '#7c3aed',
      desc: [s.country, s.tags?.split(',')[0]].filter(Boolean).join(' · ') || 'Nettradio',
    };
    currentStation = station;
    _playUrl(station.url, station);
    updateSidebarActiveState(station.id);
    updateNowPlaying(station);
  }

  function saveSearchResult(i, e) {
    e.stopPropagation();
    const s = searchResults[i];
    if (!s || !s.url_resolved) { App.toast('Ingen gyldig stream-URL', 'error'); return; }
    const already = customStreams.some(c => c.url === s.url_resolved);
    if (already) { App.toast('Allerede lagret', 'info'); return; }
    customStreams.push({ name: s.name, url: s.url_resolved });
    localStorage.setItem('pv_custom_streams', JSON.stringify(customStreams));
    App.toast(`"${s.name}" lagret`, 'success');
    render();
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
      el.innerHTML = 'Du trenger en Claude API-nøkkel. Gå til <a href="#/settings" style="color:var(--accent)">⚙️ Innstillinger</a>.';
      return;
    }

    const loadEl = appendAiMsg('assistant', '', true);
    try {
      const reply = await AI.radioChat(aiHistory, STATIONS);
      aiHistory.push({ role: 'assistant', content: reply });
      loadEl.innerHTML = formatAiReply(reply);
      document.getElementById('radio-ai-messages').scrollTop = 9999;
    } catch (e) {
      loadEl.textContent = 'Beklager, noe gikk galt. Prøv igjen.';
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
            ${Icon('radio')} Radiokanaler
          </div>

          <!-- Search -->
          <div class="radio-search-wrap">
            <div class="radio-search-box">
              <span class="radio-search-icon">${Icon('search')}</span>
              <input
                type="text"
                id="radio-search-input"
                class="radio-search-input"
                placeholder="Søk etter radiokanal…"
                autocomplete="off"
                oninput="Radio.onSearchInput(this.value)"
              >
            </div>
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
                    <div class="stellar-featured-label">${Icon('star')} Sound Core Hovedkanal</div>
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
              <div class="radio-category">${cat}</div>
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
                    <button class="station-play-btn" title="Spill av / Stopp" onclick="event.stopPropagation();Radio.playStation('${s.id}')">
                      ${currentStation?.id === s.id && isPlaying ? '⏸' : '▶'}
                    </button>
                    <button class="station-vol-btn" title="Lyd av/på" onclick="event.stopPropagation();Radio.toggleMute()">
                      ${muted ? '🔇' : '🔊'}
                    </button>
                  </div>
                </div>
              `).join('')}
            `).join('');
            return featuredHtml + rest;
          })()}
          ${customStreams.length ? `
            <div class="radio-category">Egne strømmer</div>
            ${customStreams.map((s, i) => `
              <div class="radio-station-btn ${currentStation?.id === 'custom_'+i ? 'active' : ''}" id="rbtn-custom_${i}" style="--station-color:#7c3aed" onclick="Radio.playCustom(${i})">
                <span class="station-emoji">${Icon('rss')}</span>
                <span class="station-info">
                  <span class="station-name">${s.name || 'Egendefinert'}</span>
                  <span class="station-desc">${s.url.slice(0,40)}…</span>
                </span>
                <div class="station-actions">
                  <button class="station-play-btn" title="Spill av / Stopp" onclick="event.stopPropagation();Radio.playCustom(${i})">
                    ${currentStation?.id === 'custom_'+i && isPlaying ? '⏸' : '▶'}
                  </button>
                  <button class="station-vol-btn" title="Lyd av/på" onclick="event.stopPropagation();Radio.toggleMute()">${muted ? '🔇' : '🔊'}</button>
                  <button class="station-vol-btn" title="Fjern" onclick="Radio.removeCustom(${i},event)" style="color:var(--text3)">${Icon('x')}</button>
                </div>
              </div>
            `).join('')}
          ` : ''}
          <!-- Custom stream -->
          <div class="radio-custom-stream">
            <input class="form-input" id="custom-url" placeholder="Stream URL (mp3/aac/ogg)" style="font-size:0.78rem">
            <input class="form-input" id="custom-name" placeholder="Navn" style="width:90px;font-size:0.78rem">
            <button class="btn btn-primary btn-sm" onclick="Radio.addCustomStream()">+</button>
          </div>

          <!-- External embedded players -->
          <div class="radio-category">${Icon('globe')} Eksterne spillere</div>
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
                <span class="ext-player-badge">LIVE</span>
                <button class="station-vol-btn" title="Lyd av/på" onclick="event.stopPropagation();Radio.toggleMute()">${muted ? '🔇' : '🔊'}</button>
              </div>
            </div>
          `).join('')}

          <!-- AI Assistant -->
          <div class="radio-ai-wrap">
            <button class="radio-ai-toggle" onclick="Radio.toggleAiChat()">
              ${Icon('bot')} AI-assistent <span id="radio-ai-chevron">${Icon('chevron-down')}</span>
            </button>
            <div class="radio-ai-chat" id="radio-ai-chat" style="display:none">
              <div class="radio-ai-messages" id="radio-ai-messages">
                <div class="radio-ai-welcome">Hei! ${Icon('smile')} Spør meg om radiokanaler — på hvilket som helst språk.</div>
                <div class="radio-ai-suggestions">
                  <button onclick="document.getElementById('radio-ai-input').value='Finn noe rolig og atmosfærisk';Radio.sendAiMessage()">Rolig & atmosfærisk</button>
                  <button onclick="document.getElementById('radio-ai-input').value='I need something energetic';Radio.sendAiMessage()">Something energetic</button>
                  <button onclick="document.getElementById('radio-ai-input').value='¿Qué canal es mejor para concentrarse?';Radio.sendAiMessage()">Para concentrarse</button>
                </div>
              </div>
              <div class="radio-ai-input-row">
                <input
                  class="radio-ai-input" id="radio-ai-input"
                  placeholder="Spør på hvilket som helst språk…"
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
            <div class="radio-welcome-title">Welcome to SoundCore</div>
            <div class="radio-welcome-sub">Electronic music streams · Psychedelic · Ambient · Trance</div>
          </div>
          <!-- Now playing -->
          <div class="radio-now-playing" id="radio-np">
            <div class="radio-station-art" id="np-art" style="background:linear-gradient(135deg,var(--accent),var(--accent2))">
              <span id="np-emoji">${Icon('radio')}</span>
            </div>
            <div class="radio-np-info">
              <div class="radio-np-badge"><span class="dot"></span> <span id="np-status">Stoppet</span></div>
              <div class="radio-np-name" id="np-name">Velg en kanal til venstre</div>
              <div class="radio-np-desc" id="np-desc">Elektronisk musikk fra psychedelic trance til chill out</div>
              <button class="radio-set-fav-btn" id="radio-set-fav-btn" onclick="Radio.setAsFavorite()" style="display:none">
                ${Icon('star')} Sett som min favoritt
              </button>
            </div>
            <div class="radio-np-controls">
              <div class="radio-vol-wrap">
                <button class="radio-mute-btn" id="radio-mute-btn" onclick="Radio.toggleMute()" title="Lyd av/på">${muted ? '🔇' : '🔊'}</button>
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
            <canvas id="radio-canvas"></canvas>
            <div class="radio-vis-overlay" id="radio-idle">
              <div class="radio-idle-text">
                <div style="font-size:3rem;margin-bottom:0.5rem">${Icon('radio')}</div>
                <div>Velg en radiokanal og klikk ${Icon('play')} for å starte</div>
              </div>
            </div>
            <div class="vis-style-row">
              <button class="vis-btn active" onclick="Radio.setVisMode('bars',this)">Søyler</button>
              <button class="vis-btn" onclick="Radio.setVisMode('circle',this)">Sirkel</button>
              <button class="vis-btn" onclick="Radio.setVisMode('wave',this)">Bølge</button>
              <button class="vis-btn" onclick="Radio.setVisMode('particles',this)">Partikler</button>
            </div>
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
              <button class="btn btn-ghost btn-sm" onclick="Radio.closeEmbed()">${Icon('x')} Lukk</button>
            </div>
            <iframe
              id="radio-embed-frame"
              class="radio-embed-frame"
              src=""
              allow="autoplay; encrypted-media"
              allowfullscreen
              loading="lazy"
            ></iframe>
          </div>
        </div>
      </div>`;

    canvas = document.getElementById('radio-canvas');
    resizeCanvas();
    window.removeEventListener('resize', resizeCanvas);
    window.addEventListener('resize', resizeCanvas);
    if (currentStation && isPlaying) startVisualizer();
  }

  function resizeCanvas() {
    if (!canvas) return;
    const wrap = document.getElementById('radio-vis-wrap');
    if (!wrap) return;
    canvas.width  = wrap.clientWidth;
    canvas.height = wrap.clientHeight;
    visCtx = canvas.getContext('2d');
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

  function playCustom(idx) {
    const s = customStreams[idx];
    if (!s) return;
    const id = 'custom_' + idx;
    currentStation = { id, ...s };
    _playUrl(s.url, { name: s.name, emoji: '📡', color: '#7c3aed', desc: s.url });
    updateSidebarActiveState(id);
  }

  function _playUrl(url, info) {
    const audio = getAudio();
    // Mark player as radio mode
    window._radioMode = true;

    // Update player bar for radio
    const title = document.getElementById('player-title');
    const artist = document.getElementById('player-artist');
    const art    = document.getElementById('player-artwork');
    if (title)  title.textContent  = info.name || 'Radio';
    if (artist) artist.innerHTML   = `<span class="radio-live-badge"><span class="live-dot-sm"></span> LIVE</span> ${escHtml(info.desc || 'Live stream')}`;
    if (art)    { art.style.backgroundImage = ''; art.querySelector('.artwork-note').innerHTML = iconForEmoji(info.emoji, 'radio'); art.querySelector('.artwork-note').style.display = ''; }

    const bar = document.getElementById('player-bar');
    if (bar) bar.classList.add('radio-mode');
    bar?.classList.remove('hidden');

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
    const playPromise = audio.play();
    if (playPromise) {
      playPromise.then(() => {
        isPlaying = true;
        updatePlayBtn(true);
        document.getElementById('radio-idle')?.classList.add('hidden');
        initAudioContext();
        if (audioCtx?.state === 'suspended') audioCtx.resume();
        startVisualizer();
        updateNowPlayingStatus(true);
        updateSidebarActiveState(currentStation.id);
      }).catch(err => {
        console.warn('Stream error:', err);
        App.toast(`Kunne ikke koble til strøm. Prøv en annen kanal.`, 'error');
        updatePlayBtn(false);
      });
    }
  }

  function togglePlay() {
    const audio = getAudio();
    if (!currentStation) {
      App.toast('Velg en radiokanal først', 'info');
      return;
    }
    if (isPlaying) {
      audio.pause();
      isPlaying = false;
      stopVisualizer();
      updatePlayBtn(false);
      updateNowPlayingStatus(false);
      updateSidebarActiveState(currentStation.id);
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
  }

  function stopRadio() {
    const audio = getAudio();
    if (!audio) return;
    audio.pause();
    audio.src = '';
    isPlaying = false;
    currentStation = null;
    window._radioMode = false;
    stopVisualizer();
    updateNowPlayingStatus(false);
    updatePlayBtn(false);
    document.getElementById('player-bar')?.classList.add('hidden');
    document.getElementById('player-bar')?.classList.remove('radio-mode');
    document.getElementById('radio-idle')?.classList.remove('hidden');
    document.querySelectorAll('.radio-station-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.station-live-dot').forEach(d => d.remove());
    const np = document.getElementById('np-name');
    if (np) np.textContent = 'Velg en kanal til venstre';
    const desc = document.getElementById('np-desc');
    if (desc) desc.textContent = 'Elektronisk musikk fra psychedelic trance til chill out';
    const playerLeft = document.getElementById('player-left');
    if (playerLeft?._radioClickHandler) {
      playerLeft.removeEventListener('click', playerLeft._radioClickHandler);
      playerLeft._radioClickHandler = null;
    }
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
      if (b.title === 'Lyd av/på') b.textContent = icon;
    });
    const muteBtn = document.getElementById('radio-mute-btn');
    if (muteBtn) muteBtn.textContent = icon;
    const volBar = document.getElementById('radio-vol');
    if (volBar) volBar.value = muted ? 0 : Math.round(volume * 100);
    const playerVolBar = document.getElementById('volume-bar');
    if (playerVolBar) playerVolBar.value = muted ? 0 : Math.round(volume * 100);
    const volFill = document.getElementById('vol-fill');
    if (volFill) volFill.style.width = (muted ? 0 : Math.round(volume * 100)) + '%';
  }

  // ── UI updates ────────────────────────────────────────────────────────
  function updatePlayBtn(playing) {
    const btn = document.getElementById('radio-play-btn');
    if (btn) btn.textContent = playing ? '⏸' : '▶';
    const ctrlPlay = document.getElementById('ctrl-play');
    if (ctrlPlay) ctrlPlay.textContent = playing ? '⏸' : '▶';
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
      favBtn.textContent = isFav ? '⭐ Din favoritt' : '⭐ Sett som min favoritt';
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
    document.getElementById('radio-embed-wrap')?.classList.remove('hidden');

    // Update now-playing panel
    updateNowPlaying({ name: p.name, desc: p.desc, emoji: p.emoji, color: p.color, url: p.url });
    const st = document.getElementById('np-status');
    if (st) st.textContent = 'LIVE';
  }

  function closeEmbed() {
    const frame = document.getElementById('radio-embed-frame');
    if (frame) frame.src = '';
    document.getElementById('radio-embed-wrap')?.classList.add('hidden');
    document.getElementById('radio-vis-wrap')?.classList.remove('hidden');
    document.querySelectorAll('.radio-station-btn').forEach(b => b.classList.remove('active'));
    const st = document.getElementById('np-status');
    if (st) st.textContent = 'Stoppet';
  }

  function setAsFavorite() {
    if (!currentStation) return;
    const user = typeof Auth !== 'undefined' ? Auth.current() : null;
    if (!user) { App.toast('Logg inn for å lagre favorittkanal', 'error'); return; }
    const favoriteRadio = {
      name:  currentStation.name,
      url:   currentStation.url,
      emoji: currentStation.emoji || '📻',
    };
    Auth.updateUser(user.username, { favoriteRadio });
    user.favoriteRadio = favoriteRadio;
    App.toast(`"${favoriteRadio.name}" lagret som din favorittkanal! Den vises nå på profilen din. ${Icon('star')}`, 'success');
    updateNowPlaying(currentStation);
  }

  function updateNowPlayingStatus(live) {
    const st = document.getElementById('np-status');
    if (st) st.textContent = live ? 'LIVE' : 'Stoppet';
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

  function startVisualizer() {
    stopVisualizer();
    if (!canvas || !analyser) return;
    visCtx = canvas.getContext('2d');
    particles = [];

    function draw() {
      visFrame = requestAnimationFrame(draw);
      if (!visCtx || !canvas.width) return;
      const bufLen = analyser.frequencyBinCount;
      const dataFreq = new Uint8Array(bufLen);
      const dataTime = new Uint8Array(bufLen);
      analyser.getByteFrequencyData(dataFreq);
      analyser.getByteTimeDomainData(dataTime);

      visCtx.clearRect(0, 0, canvas.width, canvas.height);

      if      (visMode === 'bars')      drawBars(dataFreq, bufLen);
      else if (visMode === 'circle')    drawCircle(dataFreq, bufLen);
      else if (visMode === 'wave')      drawWave(dataTime, bufLen);
      else if (visMode === 'particles') drawParticles(dataFreq, bufLen);
    }
    draw();
  }

  function stopVisualizer() {
    if (visFrame) { cancelAnimationFrame(visFrame); visFrame = null; }
    if (visCtx && canvas) visCtx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function drawBars(data, bufLen) {
    const W = canvas.width, H = canvas.height;
    visCtx.fillStyle = 'rgba(0,0,0,0.15)';
    visCtx.fillRect(0, 0, W, H);
    const barW = (W / bufLen) * 2.8;
    let x = 0;
    for (let i = 0; i < bufLen; i++) {
      const h = (data[i] / 255) * H * 0.9;
      const hue = (i / bufLen) * 280 + 200; // blue → purple → pink
      const grad = visCtx.createLinearGradient(0, H - h, 0, H);
      grad.addColorStop(0, `hsla(${hue},90%,70%,0.9)`);
      grad.addColorStop(1, `hsla(${hue},70%,40%,0.4)`);
      visCtx.fillStyle = grad;
      visCtx.fillRect(x, H - h, barW - 1, h);
      // Mirror
      const hMirror = h * 0.4;
      visCtx.globalAlpha = 0.25;
      visCtx.fillRect(x, 0, barW - 1, hMirror);
      visCtx.globalAlpha = 1;
      x += barW;
    }
  }

  function drawCircle(data, bufLen) {
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H / 2;
    const r  = Math.min(W, H) * 0.25;
    visCtx.fillStyle = 'rgba(0,0,0,0.2)';
    visCtx.fillRect(0, 0, W, H);
    for (let i = 0; i < bufLen; i++) {
      const angle = (i / bufLen) * Math.PI * 2 - Math.PI / 2;
      const amp   = (data[i] / 255) * r * 1.5;
      const x1 = cx + Math.cos(angle) * r;
      const y1 = cy + Math.sin(angle) * r;
      const x2 = cx + Math.cos(angle) * (r + amp);
      const y2 = cy + Math.sin(angle) * (r + amp);
      const hue = (i / bufLen) * 360;
      visCtx.strokeStyle = `hsla(${hue},90%,65%,0.9)`;
      visCtx.lineWidth   = 2;
      visCtx.beginPath();
      visCtx.moveTo(x1, y1);
      visCtx.lineTo(x2, y2);
      visCtx.stroke();
    }
    // Inner circle
    visCtx.strokeStyle = 'rgba(124,58,237,0.3)';
    visCtx.lineWidth   = 1;
    visCtx.beginPath();
    visCtx.arc(cx, cy, r, 0, Math.PI * 2);
    visCtx.stroke();
  }

  function drawWave(data, bufLen) {
    const W = canvas.width, H = canvas.height;
    visCtx.fillStyle = 'rgba(0,0,0,0.25)';
    visCtx.fillRect(0, 0, W, H);
    const sliceW = W / bufLen;
    let x = 0;
    visCtx.lineWidth   = 3;
    // Multi-layer wave
    for (let layer = 0; layer < 3; layer++) {
      visCtx.beginPath();
      visCtx.strokeStyle = `hsla(${200 + layer * 60},90%,65%,${0.9 - layer * 0.25})`;
      x = 0;
      for (let i = 0; i < bufLen; i++) {
        const v  = data[i] / 128.0;
        const y  = (v * H / 2) + (H * 0.1 * layer);
        if (i === 0) visCtx.moveTo(x, y);
        else         visCtx.lineTo(x, y);
        x += sliceW;
      }
      visCtx.stroke();
    }
  }

  function drawParticles(data, bufLen) {
    const W = canvas.width, H = canvas.height;
    visCtx.fillStyle = 'rgba(0,0,0,0.12)';
    visCtx.fillRect(0, 0, W, H);
    // Bass energy
    let bass = 0;
    for (let i = 0; i < 16; i++) bass += data[i];
    bass /= (16 * 255);

    // Spawn particles on bass hit
    if (bass > 0.5 && particles.length < 200) {
      for (let i = 0; i < Math.floor(bass * 8); i++) {
        particles.push({
          x: W / 2 + (Math.random() - 0.5) * 60,
          y: H / 2 + (Math.random() - 0.5) * 60,
          vx: (Math.random() - 0.5) * bass * 12,
          vy: (Math.random() - 0.5) * bass * 12 - bass * 4,
          r:  2 + Math.random() * 4 * bass,
          hue: 220 + Math.random() * 140,
          life: 1,
        });
      }
    }
    // Update + draw particles
    particles = particles.filter(p => p.life > 0.02);
    particles.forEach(p => {
      p.x    += p.vx;
      p.y    += p.vy;
      p.vy   += 0.1;
      p.life -= 0.015;
      p.r    *= 0.99;
      visCtx.beginPath();
      visCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      visCtx.fillStyle = `hsla(${p.hue},90%,70%,${p.life})`;
      visCtx.fill();
    });
    // Central beat circle
    const beatR = 40 + bass * 60;
    const g = visCtx.createRadialGradient(W/2, H/2, 0, W/2, H/2, beatR);
    g.addColorStop(0, `rgba(124,58,237,${0.3 * bass})`);
    g.addColorStop(1, 'transparent');
    visCtx.fillStyle = g;
    visCtx.beginPath();
    visCtx.arc(W/2, H/2, beatR, 0, Math.PI * 2);
    visCtx.fill();
  }

  function setVisMode(mode, btn) {
    visMode = mode;
    document.querySelectorAll('.vis-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    particles = [];
  }

  // ── Custom streams ────────────────────────────────────────────────────
  function addCustomStream() {
    const url  = document.getElementById('custom-url')?.value?.trim();
    const name = document.getElementById('custom-name')?.value?.trim() || 'Egendefinert';
    if (!url) { App.toast('Skriv inn en stream-URL', 'error'); return; }
    customStreams.push({ url, name });
    localStorage.setItem('pv_custom_streams', JSON.stringify(customStreams));
    render(); // re-render with new stream
    App.toast(`"${name}" lagt til`, 'success');
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
        color: color || '#7c3aed',
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
    try {
      const res = await fetch(
        `https://de1.api.radio-browser.info/json/stations/search?name=${encodeURIComponent(query)}&limit=12&order=votes&reverse=true&hidebroken=true`,
        { headers: { 'User-Agent': 'SoundCore/1.0' } }
      );
      if (!res.ok) return [];
      return await res.json();
    } catch { return []; }
  }

  return {
    render, playStation, playCustom, togglePlay, stopRadio, playUrl, fetchStations,
    setVolume, toggleMute, setVisMode, addCustomStream, removeCustom,
    playSearchResult, saveSearchResult, onSearchInput,
    toggleAiChat, sendAiMessage, onAiKeydown,
    setAsFavorite, openEmbed, closeEmbed, stopForMusicPlayer,
    get isPlaying() { return isPlaying; },
    get currentStation() { return currentStation; },
    get stations() { return STATIONS; },
  };
})();
