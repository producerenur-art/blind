// Shows — Radio Zora-style radio programme schedule
const Shows = (() => {

  // Static show catalogue
  const SHOWS = [
    {
      id: 'stellar-psy-night',
      name: 'Stellar PSY Night',
      host: 'Stellar Collective',
      day: 0, // Sunday
      startHour: 22, endHour: 2,
      genre: 'Psytrance · Psychedelic',
      emoji: '🌠',
      color: '#22c55e',
      desc: 'The weekly trip out into the psychedelic dub and trance universe.',
      stream: 'stellar-psy',
    },
    {
      id: 'drone-morning',
      name: 'Drone Morning',
      host: 'Ambient Collective',
      day: 1, // Monday
      startHour: 7, endHour: 10,
      genre: 'Ambient · Drone',
      emoji: '🌌',
      color: '#4f46e5',
      desc: 'Start the week calmly — deep atmospheric drone for meditation and focus.',
      stream: 'dronezone',
    },
    {
      id: 'techno-underground',
      name: 'Techno Underground',
      host: 'DJ Digitalis',
      day: 2, // Tuesday
      startHour: 21, endHour: 24,
      genre: 'Techno · Minimal',
      emoji: '💊',
      color: '#ef4444',
      desc: 'Hypnotic techno and minimal grooves from the underground’s deepest halls.',
      stream: 'digitalis',
    },
    {
      id: 'chill-wednesday',
      name: 'Chill Wednesday',
      host: 'Lush Sessions',
      day: 3, // Wednesday
      startHour: 18, endHour: 21,
      genre: 'Chill · Downtempo',
      emoji: '🌿',
      color: '#16a34a',
      desc: 'Sensual, slow-moving grooves for midweek.',
      stream: 'lush',
    },
    {
      id: 'space-travel',
      name: 'Space Travel',
      host: 'Cosmic Station',
      day: 4, // Thursday
      startHour: 23, endHour: 3,
      genre: 'Space Music · Ambient',
      emoji: '🛸',
      color: '#0ea5e9',
      desc: 'An intergalactic journey through electronic space music and space ambient.',
      stream: 'spacestation',
    },
    {
      id: 'groove-friday',
      name: 'Groove Friday',
      host: 'Nu-Jazz Collective',
      day: 5, // Friday
      startHour: 20, endHour: 23,
      genre: 'Nu-Jazz · Trip-Hop',
      emoji: '🎷',
      color: '#4ade80',
      desc: 'The winner of the weekend kickoff — nu-jazz, IDM and sensual trip-hop.',
      stream: 'beatblender', // var 'sonicuniverse' — fantes ikke i STATIONS, Listen-knappen gjorde ingenting
    },
    {
      id: 'deep-space-saturday',
      name: 'Deep Space Saturday',
      host: 'Deep Space One',
      day: 6, // Saturday
      startHour: 0, endHour: 4,
      genre: 'Deep Ambient · Electronic',
      emoji: '🌑',
      color: '#1e40af',
      desc: 'Saturday night in a deep electronic ambient landscape.',
      stream: 'deepspaceone',
    },
    {
      id: 'mission-sunday',
      name: 'Mission Control Sunday',
      host: 'Space Command',
      day: 0, // Sunday
      startHour: 14, endHour: 18,
      genre: 'Ambient Space Music',
      emoji: '🚀',
      color: '#f97316',
      desc: 'Sunday afternoon with ambient space music and quiet journeys.',
      stream: 'missioncontrol',
    },
    {
      id: 'psychill-afternoon',
      name: 'Psychill Afternoon',
      host: 'MultiHuman EntheoMusic',
      day: 1, // Monday
      startHour: 12, endHour: 15,
      genre: 'Psychill · Psybient',
      emoji: '🌿',
      color: '#10b981',
      desc: 'Entheogenic psychill and world sounds for the slow middle of the day.',
      stream: 'multihuman',
    },
    {
      id: 'dark-drone-ritual',
      name: 'Dark Drone Ritual',
      host: 'The Void Wanderer',
      day: 5, // Friday
      startHour: 3, endHour: 6,
      genre: 'Dark Ambient · Drone',
      emoji: '💀',
      color: '#7f1d1d',
      desc: 'The darker side of deep ambient — ritual drone for the small hours before the weekend.',
      stream: 'doomed',
    },
    {
      id: 'chillout-lounge',
      name: 'Chillout Lounge',
      host: 'Lounge Sessions',
      day: 4, // Thursday
      startHour: 18, endHour: 21,
      genre: 'Chill Out · Lounge',
      emoji: '🛋️',
      color: '#0ea5e9',
      desc: 'Electronic chill lounge to ease into the evening.',
      stream: '1fm-chillout',
    },
    {
      id: 'goa-sunrise',
      name: 'Goa Sunrise',
      host: 'Suburbs of Goa',
      day: 2, // Tuesday
      startHour: 7, endHour: 10,
      genre: 'Psytrance · Goa',
      emoji: '🌅',
      color: '#f59e0b',
      desc: 'Indian electronica and classic goa to open the day with a trip.',
      stream: 'suburbsofgoa',
    },
    {
      id: 'progressive-psy-session',
      name: 'Progressive Psy Session',
      host: 'Trance Around',
      day: 6, // Saturday
      startHour: 18, endHour: 21,
      genre: 'Progressive Psy · Trance',
      emoji: '🌀',
      color: '#8b5cf6',
      desc: 'Melodic, driving progressive psytrance for the run-up to Saturday night.',
      stream: 'trancearound',
    },
    {
      id: 'fluid-chillroom',
      name: 'Fluid Chillroom',
      host: 'Fluid Collective',
      day: 3, // Wednesday
      startHour: 21, endHour: 24,
      genre: 'Psychill · Experimental',
      emoji: '💧',
      color: '#06b6d4',
      desc: 'Psychedelic, experimental electronica for late Wednesday nights.',
      stream: 'fluid',
    },
    {
      id: 'groove-salad-sessions',
      name: 'Groove Salad Sessions',
      host: 'Groove Salad',
      day: 6, // Saturday
      startHour: 12, endHour: 15,
      genre: 'Downtempo · IDM',
      emoji: '🥗',
      color: '#10b981',
      desc: 'IDM, trip-hop and downtempo electronica for a Saturday afternoon.',
      stream: 'groovesalad',
    },
    {
      id: 'dark-zone-transmission',
      name: 'Dark Zone Transmission',
      host: 'Dark Zone',
      day: 0, // Sunday
      startHour: 4, endHour: 7,
      genre: 'Dark Ambient · Drone',
      emoji: '🌑',
      color: '#0d0d1a',
      desc: 'The darker side of deep ambient — music for staring into the abyss before dawn.',
      stream: 'darkzone',
    },
    {
      id: 'dmt-fm-sessions',
      name: 'DMT FM Sessions',
      host: 'DMT FM',
      day: 3, // Wednesday
      startHour: 0, endHour: 3,
      genre: 'Psytrance · Goa',
      emoji: '🍄',
      color: '#a855f7',
      desc: 'Psychedelic trance around the clock — deep into Wednesday night.',
      stream: 'dmtfm',
    },
    {
      id: 'babaganousha-radio',
      name: 'Babaganousha Radio',
      host: 'Babaganousha',
      day: 0, // Sunday
      startHour: 7, endHour: 10,
      genre: 'Psytrance · Goa',
      emoji: '🌙',
      color: '#f59e0b',
      desc: 'Psychedelic goa and psytrance to open a Sunday morning.',
      stream: 'babaganousha',
    },
    {
      id: 'astral-trance-radio',
      name: 'Astral Trance Radio',
      host: 'ATR',
      day: 4, // Thursday
      startHour: 21, endHour: 23,
      genre: 'Progressive Psy · Trance',
      emoji: '🌌',
      color: '#6366f1',
      desc: 'Progressive psytrance and trance for the gap between chill and space.',
      stream: 'atr',
    },
    {
      id: 'the-trip-sessions',
      name: 'The Trip Sessions',
      host: 'The Trip',
      day: 5, // Friday
      startHour: 15, endHour: 18,
      genre: 'Psychill · Trip-Hop',
      emoji: '🌀',
      color: '#22c55e',
      desc: 'Progressive trip-hop and psychedelic electronica for a Friday afternoon.',
      stream: 'thetrip',
    },
    {
      id: 'n5md-nightscapes',
      name: 'n5MD Nightscapes',
      host: 'n5MD Radio',
      day: 1, // Monday
      startHour: 15, endHour: 18,
      genre: 'Downtempo · Ambient',
      emoji: '🎧',
      color: '#6366f1',
      desc: 'Emotional downtempo and ambient electronica to close the afternoon.',
      stream: 'n5md',
    },
    {
      id: 'dice-radio-athens',
      name: 'Dice Radio Athens',
      host: 'Dice Radio',
      day: 6, // Saturday
      startHour: 21, endHour: 24,
      genre: 'Underground · Greek Electronic',
      emoji: '🎲',
      color: '#1d4ed8',
      desc: "Greek electronic and underground radio, live from Athens.",
      stream: 'dice-radio',
    },
    {
      id: 'psyndora-radio',
      name: 'Psyndora Radio',
      host: 'Psyndora',
      day: 2, // Tuesday
      startHour: 10, endHour: 13,
      genre: 'Psytrance · Goa',
      emoji: '🧿',
      color: '#a855f7',
      desc: 'Psytrance and ambient to carry the morning into midday.',
      stream: 'psyndora',
    },
    {
      id: 'babaganousha-labs',
      name: 'Babaganousha Labs',
      host: 'Babaganousha Labs',
      day: 3, // Wednesday
      startHour: 3, endHour: 6,
      genre: 'Psytrance · Goa',
      emoji: '🍄',
      color: '#f59e0b',
      desc: 'The Babaganousha sister channel — psytrance and goa deep in the night.',
      stream: 'babaganousha-labs',
    },
    {
      id: 'rr-progressive',
      name: 'RR Progressive',
      host: 'RR Progressive',
      day: 4, // Thursday
      startHour: 0, endHour: 3,
      genre: 'Progressive Psy · Trance',
      emoji: '🌀',
      color: '#6366f1',
      desc: 'Progressive psytrance to open a Thursday night.',
      stream: 'rr-progressive',
    },
    {
      id: 'ambient-psychill-1fm',
      name: 'Ambient Psychill',
      host: '1.FM',
      day: 6, // Saturday
      startHour: 8, endHour: 11,
      genre: 'Psychill · Ambient',
      emoji: '🌫️',
      color: '#8854d0',
      desc: '1.FM — ambient psychill 24/7, a slow Saturday morning.',
      stream: 'ambientpsy-1fm',
    },
    {
      id: 'groove-salad-classic',
      name: 'Groove Salad Classic',
      host: 'Groove Salad Classic',
      day: 1, // Monday
      startHour: 18, endHour: 21,
      genre: 'Downtempo · Chillout',
      emoji: '🎐',
      color: '#14b8a6',
      desc: 'Classic chillout grooves from the early 2000s to close Monday.',
      stream: 'gsclassic',
    },
    {
      id: 'smooth-chill',
      name: 'Smooth Chill',
      host: 'Smooth Chill',
      day: 1, // Monday
      startHour: 21, endHour: 24,
      genre: 'Downtempo · Chillout',
      emoji: '🫧',
      color: '#0ea5e9',
      desc: 'Smooth downtempo chillout to carry Monday into Tuesday.',
      stream: 'smoothchill',
    },
    {
      id: 'defcon-techno',
      name: 'Defcon Techno',
      host: 'Defcon',
      day: 2, // Tuesday
      startHour: 0, endHour: 3,
      genre: 'Techno Underground · EDM',
      emoji: '💊',
      color: '#ef4444',
      desc: 'Late-night techno and EDM to open Tuesday.',
      stream: 'defcon',
    },
    {
      id: 'radiozora-trance-hour',
      name: 'radiOzora Trance Hour',
      host: 'radiOzora',
      day: 4, // Thursday
      startHour: 15, endHour: 18,
      genre: 'Psytrance · Psychedelic',
      emoji: '🔥',
      color: '#f97316',
      desc: 'OZORA Festival radio — psytrance live from Budapest.',
      stream: 'radiozora-trance',
    },
    {
      id: 'radiozora-chill-hour',
      name: 'radiOzora Chill Hour',
      host: 'radiOzora',
      day: 0, // Sunday
      startHour: 10, endHour: 14,
      genre: 'Psychill · Downtempo',
      emoji: '🌿',
      color: '#22c55e',
      desc: 'OZORA Festival radio — chill & downtempo live from Budapest.',
      stream: 'radiozora-chill',
    },
    {
      id: 'radio-q37-sessions',
      name: 'Radio Q37 Sessions',
      host: 'Radio Q37',
      day: 5, // Friday
      startHour: 6, endHour: 9,
      genre: 'Psytrance · Ambient Dub',
      emoji: '🔮',
      color: '#e11d48',
      desc: 'Radio for the mind travellers — psychill, ambient dub and deep trance to open Friday.',
      stream: 'radioq37',
    },
  ];

  // Gjer SHOWS lesbar frå Node (api/send-email.js sin ukentlige e-post) uten å
  // duplisere sendeplanen. `module` finst ikke i nettleseren, så denne linja er
  // et no-op der — kun require('../js/shows.js') fra serveren treffer den.
  if (typeof module !== 'undefined' && module.exports) module.exports = { SHOWS };

  const DAYS_NO = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const DAYS_EN = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  function escHtml(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function fmtHour(h) {
    return `${(h % 24).toString().padStart(2,'0')}:00`;
  }

  function getCurrentShow() {
    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();
    return SHOWS.find(s => {
      if (s.day !== day) return false;
      if (s.endHour > s.startHour) return hour >= s.startHour && hour < s.endHour;
      // Overnight show
      return hour >= s.startHour || hour < s.endHour;
    }) || null;
  }

  function getNextShow() {
    const now   = new Date();
    const day   = now.getDay();
    const hour  = now.getHours();
    // Find next upcoming show
    for (let offset = 0; offset < 7; offset++) {
      const checkDay = (day + offset) % 7;
      const candidates = SHOWS
        .filter(s => s.day === checkDay)
        .filter(s => offset > 0 || s.startHour > hour)
        .sort((a, b) => a.startHour - b.startHour);
      if (candidates.length) return { show: candidates[0], offset };
    }
    return null;
  }

  function showCard(show, highlight = false) {
    return `
      <div class="show-card ${highlight ? 'show-card--live' : ''}" style="--show-color:${show.color}">
        <div class="show-card-left">
          <div class="show-emoji">${iconForEmoji(show.emoji)}</div>
        </div>
        <div class="show-card-body">
          ${highlight ? '<div class="show-on-air"><span class="show-on-air-dot"></span> ON AIR</div>' : ''}
          <div class="show-card-name">${escHtml(show.name)}</div>
          <div class="show-card-host">with ${escHtml(show.host)}</div>
          <div class="show-card-genre">${escHtml(show.genre)}</div>
          <div class="show-card-desc">${escHtml(show.desc)}</div>
          <div class="show-card-time">${DAYS_NO[show.day]} ${fmtHour(show.startHour)} – ${fmtHour(show.endHour)}</div>
        </div>
        <div class="show-card-actions">
          <button class="show-listen-btn" onclick="Shows.tuneIn('${show.stream}')">
            ${highlight ? '▶ Listen now' : '▶ Listen'}
          </button>
          <button class="show-share-btn" title="Share" onclick="Shows.shareShow('${show.id}')">${Icon('arrow-up-right')}</button>
        </div>
      </div>`;
  }

  function scheduleGrid() {
    const today = new Date().getDay();
    // Reorder days so today is first
    const orderedDays = Array.from({ length: 7 }, (_, i) => (today + i) % 7);

    return orderedDays.map(day => {
      const dayShows = SHOWS.filter(s => s.day === day).sort((a, b) => a.startHour - b.startHour);
      return `
        <div class="sched-day ${day === today ? 'sched-day--today' : ''}">
          <div class="sched-day-header">
            <span class="sched-day-name">${DAYS_NO[day]}</span>
            ${day === today ? '<span class="sched-today-badge">Today</span>' : ''}
          </div>
          <div class="sched-day-shows">
            ${dayShows.length ? dayShows.map(s => `
              <div class="sched-show-slot" style="--show-color:${s.color}" onclick="Shows.tuneIn('${s.stream}')">
                <span class="sched-show-emoji">${iconForEmoji(s.emoji)}</span>
                <div class="sched-show-info">
                  <div class="sched-show-name">${escHtml(s.name)}</div>
                  <div class="sched-show-time">${fmtHour(s.startHour)} – ${fmtHour(s.endHour)}</div>
                </div>
              </div>`).join('') : `<div class="sched-empty">No shows</div>`}
          </div>
        </div>`;
    }).join('');
  }

  function archiveCards() {
    const archive = [
      { name:'Deep Frequencies Vol.4', host:'Ambient Collective', date:'Jun 18, 2026', emoji:'🌌', duration:'2h 14m' },
      { name:'Psydub Underground',      host:'Stellar Collective', date:'Jun 15, 2026', emoji:'🌠', duration:'3h 02m' },
      { name:'Groove Sessions 21',      host:'Nu-Jazz Collective', date:'Jun 13, 2026', emoji:'🎷', duration:'2h 48m' },
      { name:'Techno Brutalism',        host:'DJ Digitalis',       date:'Jun 10, 2026', emoji:'💊', duration:'3h 15m' },
      { name:'Space Odyssey #11',       host:'Cosmic Station',     date:'Jun 7, 2026',  emoji:'🛸', duration:'4h 00m' },
      { name:'Chill Afternoon 33',      host:'Lush Sessions',      date:'Jun 4, 2026',  emoji:'🌿', duration:'2h 30m' },
    ];
    return archive.map(a => `
      <div class="archive-card">
        <div class="archive-card-emoji">${iconForEmoji(a.emoji)}</div>
        <div class="archive-card-body">
          <div class="archive-card-name">${escHtml(a.name)}</div>
          <div class="archive-card-meta">${escHtml(a.host)} · ${a.date}</div>
          <div class="archive-card-dur">${Icon('clock')} ${a.duration}</div>
        </div>
        <button class="archive-play-btn">${Icon('play')}</button>
      </div>
    `).join('');
  }

  function render() {
    const app = document.getElementById('app');
    const live = getCurrentShow();
    const next = getNextShow();

    app.innerHTML = `
      <div class="shows-page" id="shows-page">

        <!-- HERO -->
        <div class="shows-hero">
          <div class="shows-hero-glow"></div>
          <div class="shows-hero-inner">
            <div class="shows-hero-badge">${Icon('radio')} Schedule</div>
            <h1 class="shows-hero-title">Radio Shows</h1>
            <p class="shows-hero-sub">Explore weekly live broadcasts from SiriusFM — psytrance, ambient, techno, and more.</p>
          </div>
          <div class="shows-hero-live">
            ${live ? `
              <div class="shows-live-pill">
                <span class="shows-live-dot"></span> ON AIR NOW
              </div>
              <div class="shows-live-name">${escHtml(live.name)}</div>
              <div class="shows-live-host">with ${escHtml(live.host)}</div>
              <button class="shows-live-btn" onclick="Shows.tuneIn('${live.stream}')">${Icon('play')} Listen now</button>
            ` : next ? `
              <div class="shows-live-pill shows-live-pill--soon">
                Next show
              </div>
              <div class="shows-live-name">${escHtml(next.show.name)}</div>
              <div class="shows-live-host">${DAYS_NO[next.show.day]} ${fmtHour(next.show.startHour)}</div>
              <button class="shows-live-btn" onclick="Router.go('/radio')">${Icon('radio')} Radio</button>
            ` : ''}
          </div>
        </div>

        <!-- ON AIR -->
        ${live ? `
        <div class="section" style="max-width:900px">
          <div class="section-header">
            <div class="section-title"><span class="show-on-air-dot"></span> On air now</div>
          </div>
          ${showCard(live, true)}
        </div>` : ''}

        <!-- RADIO SEARCH — every web radio on the planet -->
        <div class="section rsx-section" style="max-width:900px">
          <div class="section-header">
            <div class="section-title">${Icon('search')} Search every web radio in the world</div>
            <span class="text-muted text-sm">Psytrance · EDM · House · Chillout · Psychill · Progressive · Downtempo · Ambient · Dark Drone — and everything else</span>
          </div>
          ${RadioSearch.widget()}
        </div>

        <!-- WEEKLY SCHEDULE -->
        <div class="section" style="max-width:1100px">
          <div class="section-header">
            <div class="section-title">${Icon('calendar')} Weekly schedule</div>
          </div>
          <div class="sched-grid">
            ${scheduleGrid()}
          </div>
        </div>

        <!-- ALL SHOWS -->
        <div class="section" style="max-width:900px">
          <div class="section-header">
            <div class="section-title">${Icon('mic')} All shows</div>
          </div>
          <div class="shows-list">
            ${SHOWS.map(s => showCard(s, s === live)).join('')}
          </div>
        </div>

        <!-- ARCHIVE -->
        <div class="section" style="max-width:900px">
          <div class="section-header">
            <div class="section-title">${Icon('folder')} Archive</div>
            <span class="text-muted text-sm">Past broadcasts</span>
          </div>
          <div class="archive-list">
            ${archiveCards()}
          </div>
        </div>

        <!-- FESTIVALS -->
        <div class="section" style="max-width:900px">
          <div class="section-header">
            <div class="section-title">${Icon('star')} Upcoming festivals</div>
            <span class="text-muted text-sm">AI-fresh from the whole world + our own picks</span>
          </div>
          <div id="shows-fresh-events"></div>
          <a class="shows-festival-card" href="https://www.dacru.be/" target="_blank" rel="noopener noreferrer"
             style="margin-bottom:1rem">
            <div class="shows-festival-banner" style="background:linear-gradient(135deg,#0e0d1f,#1b1040,#0d0a2e)">
              <div class="shows-festival-emoji">${Icon('mountain')}</div>
              <div class="shows-festival-dates">Jun 18–21, 2026</div>
            </div>
            <div class="shows-festival-body">
              <div class="shows-festival-name">Solomonari Festival 2026</div>
              <div class="shows-festival-loc">${Icon('map-pin')} Transylvania, Romania 🇷🇴</div>
              <div class="shows-festival-theme">The Transylvanian Gathering — by DaCru Records</div>
              <div class="shows-festival-tags">
                <span class="shows-festival-tag">${Icon('wind')} Psychedelic Trance</span>
                <span class="shows-festival-tag">${Icon('zap')} Full-On</span>
                <span class="shows-festival-tag">🇧🇪 DaCru Records</span>
              </div>
              <div class="shows-festival-cta">More info at dacru.be ${Icon('arrow-right')}</div>
            </div>
          </a>
          <a class="shows-festival-card" href="https://shunyatarecords.bandcamp.com/" target="_blank" rel="noopener noreferrer"
             style="margin-bottom:1rem">
            <div class="shows-festival-banner" style="background:linear-gradient(135deg,#050510,#0d0d2e,#150d3a)">
              <div class="shows-festival-emoji">${Icon('sparkles')}</div>
              <div class="shows-festival-dates">Bandcamp</div>
            </div>
            <div class="shows-festival-body">
              <div class="shows-festival-name">Shunyata Records</div>
              <div class="shows-festival-loc">${Icon('globe')} Deep, ritual and meditative Goa Trance</div>
              <div class="shows-festival-theme">VA — Active Meditation in the Memory of Goa Gil</div>
              <div class="shows-festival-tags">
                <span class="shows-festival-tag">${Icon('sparkles')} Goa Trance</span>
                <span class="shows-festival-tag">${Icon('user')} Meditation</span>
                <span class="shows-festival-tag">${Icon('feather')} Goa Gil Tribute</span>
              </div>
              <div class="shows-festival-cta">Explore on Bandcamp ${Icon('arrow-right')}</div>
            </div>
          </a>
          <a class="shows-festival-card" href="https://youngerbrothermusic.bandcamp.com/music" target="_blank" rel="noopener noreferrer"
             style="margin-bottom:1rem">
            <div class="shows-festival-banner" style="background:linear-gradient(135deg,#0a1a2e,#122840,#1a3a5c)">
              <div class="shows-festival-emoji">${Icon('atom')}</div>
              <div class="shows-festival-dates">Upcoming 2026</div>
            </div>
            <div class="shows-festival-body">
              <div class="shows-festival-name">Younger Brother</div>
              <div class="shows-festival-loc">${Icon('globe')} Simon Posford + Benji Vaughan · Psychedelic electronica</div>
              <div class="shows-festival-theme">A Flock of Bleeps · FFWD>> · Vaccine</div>
              <div class="shows-festival-tags">
                <span class="shows-festival-tag">${Icon('atom')} Electronica</span>
                <span class="shows-festival-tag">${Icon('zap')} Psychedelic</span>
                <span class="shows-festival-tag">${Icon('sliders')} Simon Posford</span>
                <span class="shows-festival-tag">Bandcamp</span>
              </div>
              <div class="shows-festival-cta">Explore the music on Bandcamp ${Icon('arrow-right')}</div>
            </div>
          </a>
          <a class="shows-festival-card" href="https://www.shponglemusic.com/" target="_blank" rel="noopener noreferrer"
             style="margin-bottom:1rem">
            <div class="shows-festival-banner" style="background:linear-gradient(135deg,#0d0829,#1a0b3d,#2a0d5e)">
              <div class="shows-festival-emoji">${Icon('sparkles')}</div>
              <div class="shows-festival-dates">shponglemusic.com</div>
            </div>
            <div class="shows-festival-body">
              <div class="shows-festival-name">Shpongle</div>
              <div class="shows-festival-loc">${Icon('globe')} Raja Ram + Simon Posford · Psybient since 1998</div>
              <div class="shows-festival-theme">Are You Shpongled? — Codex VI</div>
              <div class="shows-festival-tags">
                <span class="shows-festival-tag">${Icon('sparkles')} Psybient</span>
                <span class="shows-festival-tag">${Icon('waves')} Psychill</span>
                <span class="shows-festival-tag">${Icon('globe')} World music</span>
                <span class="shows-festival-tag">${Icon('crown')} T.I.P. Records</span>
              </div>
              <div class="shows-festival-cta">Official website ${Icon('arrow-right')}</div>
            </div>
          </a>
          <a class="shows-festival-card" href="https://hadratrancefestival.net/en/home/" target="_blank" rel="noopener noreferrer">
            <div class="shows-festival-banner" style="background:linear-gradient(135deg,#1a0a2e,#16213e,#0f3460)">
              <div class="shows-festival-emoji">${Icon('star')}</div>
              <div class="shows-festival-dates">Aug 27–30, 2026</div>
            </div>
            <div class="shows-festival-body">
              <div class="shows-festival-name">Hadra Trance Festival 2026</div>
              <div class="shows-festival-loc">${Icon('map-pin')} Vieure, Allier, France 🇫🇷</div>
              <div class="shows-festival-theme">Solar Punk Chronicles: The Seed</div>
              <div class="shows-festival-tags">
                <span class="shows-festival-tag">${Icon('wind')} Psytrance</span>
                <span class="shows-festival-tag">${Icon('zap')} Techno</span>
                <span class="shows-festival-tag">${Icon('leaf')} Downtempo</span>
                <span class="shows-festival-tag">${Icon('music')} Live</span>
                <span class="shows-festival-tag">4 stages</span>
                <span class="shows-festival-tag">68 artists</span>
                <span class="shows-festival-tag">90h of music</span>
              </div>
              <div class="shows-festival-cta">See programme & tickets ${Icon('arrow-right')}</div>
            </div>
          </a>
        </div>

        <!-- SUBSCRIBE BANNER -->
        <div class="section" style="max-width:900px">
          <div class="shows-subscribe-banner">
            <div class="shows-subscribe-icon">${Icon('mail')}</div>
            <div class="shows-subscribe-text">
              <div class="shows-subscribe-title">Never miss a show</div>
              <p>Sign up to get notified about upcoming shows and news.</p>
            </div>
            ${Auth.current()
              ? `<button class="btn btn-primary" onclick="App.toast('You are already subscribed!','success')">${Icon('check')} Subscribed</button>`
              : `<a href="#/register" class="btn btn-primary">Sign up for free</a>`
            }
          </div>
        </div>

      </div>`;

    // Festivaler & arrangementer i hele verden — live AI-nettsøk, rotert hver
    // halvtime (samme kilde som magasinet og verden-siden, se js/aifresh.js).
    if (typeof AIFresh !== 'undefined') {
      AIFresh.reset();
      AIFresh.mount({ id: 'shows-fresh-events', genre: 'festivals',
        title: 'Festivals & events worldwide', emoji: '🎪', limit: 4 });
    }
  }

  function tuneIn(stationId) {
    Router.go('/radio');
    // Give the radio page a tick to render, then play. A show's `stream` can point
    // at either a normal STATIONS entry (native audio) or an EXTERNAL_PLAYERS entry
    // (iframe embed, e.g. Dice Radio) — playStation() only searches STATIONS and
    // silently no-ops on a miss, so fall back to openEmbed() for the iframe case.
    setTimeout(() => {
      if (typeof Radio === 'undefined') return;
      const isNativeStation = (Radio.stations || []).some(s => s.id === stationId);
      if (isNativeStation) Radio.playStation(stationId);
      else Radio.openEmbed(stationId);
    }, 300);
  }

  function shareShow(id) {
    const show = SHOWS.find(s => s.id === id);
    if (!show) return;
    const text = `${iconForEmoji(show.emoji)} ${show.name} on SiriusFM — ${DAYS_NO[show.day]} ${fmtHour(show.startHour)}`;
    if (navigator.share) {
      navigator.share({ title: show.name, text, url: location.href });
    } else {
      navigator.clipboard.writeText(text).then(() => App.toast('Copied to clipboard!', 'success'));
    }
  }

  return { render, tuneIn, shareShow };
})();
