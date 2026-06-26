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
      color: '#7c3aed',
      desc: 'Den ukentlige turen ut i psykedelisk dub og trance-universet.',
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
      desc: 'Start uken rolig — dyp atmosfærisk drone for meditasjon og fokus.',
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
      desc: 'Hypnotisk techno og minimale grooves fra undergrunnens dypeste haller.',
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
      desc: 'Sensuelt og sakte bevegelige grooves for midt-uken.',
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
      desc: 'Intergalaktisk reise gjennom elektronisk rommusikk og spaceambient.',
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
      color: '#a855f7',
      desc: 'Vinneren av helgestart — nu-jazz, IDM og sanselig trip-hop.',
      stream: 'sonicuniverse',
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
      desc: 'Lørdag natt i dypt elektronisk ambient-landskap.',
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
      desc: 'Søndagsettermiddagen med ambientrommusikk og stille reiser.',
      stream: 'missioncontrol',
    },
  ];

  const DAYS_NO = ['Søndag','Mandag','Tirsdag','Onsdag','Torsdag','Fredag','Lørdag'];
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
          <div class="show-emoji">${show.emoji}</div>
        </div>
        <div class="show-card-body">
          ${highlight ? '<div class="show-on-air"><span class="show-on-air-dot"></span> ON AIR</div>' : ''}
          <div class="show-card-name">${escHtml(show.name)}</div>
          <div class="show-card-host">med ${escHtml(show.host)}</div>
          <div class="show-card-genre">${escHtml(show.genre)}</div>
          <div class="show-card-desc">${escHtml(show.desc)}</div>
          <div class="show-card-time">${DAYS_NO[show.day]} ${fmtHour(show.startHour)} – ${fmtHour(show.endHour)}</div>
        </div>
        <div class="show-card-actions">
          <button class="show-listen-btn" onclick="Shows.tuneIn('${show.stream}')">
            ${highlight ? '▶ Lyt nå' : '▶ Lytt'}
          </button>
          <button class="show-share-btn" title="Del" onclick="Shows.shareShow('${show.id}')">↗</button>
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
            ${day === today ? '<span class="sched-today-badge">I dag</span>' : ''}
          </div>
          <div class="sched-day-shows">
            ${dayShows.length ? dayShows.map(s => `
              <div class="sched-show-slot" style="--show-color:${s.color}" onclick="Shows.tuneIn('${s.stream}')">
                <span class="sched-show-emoji">${s.emoji}</span>
                <div class="sched-show-info">
                  <div class="sched-show-name">${escHtml(s.name)}</div>
                  <div class="sched-show-time">${fmtHour(s.startHour)} – ${fmtHour(s.endHour)}</div>
                </div>
              </div>`).join('') : `<div class="sched-empty">Ingen show</div>`}
          </div>
        </div>`;
    }).join('');
  }

  function archiveCards() {
    const archive = [
      { name:'Deep Frequencies Vol.4', host:'Ambient Collective', date:'18. jun 2026', emoji:'🌌', duration:'2t 14m' },
      { name:'Psydub Underground',      host:'Stellar Collective', date:'15. jun 2026', emoji:'🌠', duration:'3t 02m' },
      { name:'Groove Sessions 21',      host:'Nu-Jazz Collective', date:'13. jun 2026', emoji:'🎷', duration:'2t 48m' },
      { name:'Techno Brutalism',        host:'DJ Digitalis',       date:'10. jun 2026', emoji:'💊', duration:'3t 15m' },
      { name:'Space Odyssey #11',       host:'Cosmic Station',     date:'7. jun 2026',  emoji:'🛸', duration:'4t 00m' },
      { name:'Chill Afternoon 33',      host:'Lush Sessions',      date:'4. jun 2026',  emoji:'🌿', duration:'2t 30m' },
    ];
    return archive.map(a => `
      <div class="archive-card">
        <div class="archive-card-emoji">${a.emoji}</div>
        <div class="archive-card-body">
          <div class="archive-card-name">${escHtml(a.name)}</div>
          <div class="archive-card-meta">${escHtml(a.host)} · ${a.date}</div>
          <div class="archive-card-dur">⏱ ${a.duration}</div>
        </div>
        <button class="archive-play-btn">▶</button>
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
            <div class="shows-hero-badge">📻 Sendeskjema</div>
            <h1 class="shows-hero-title">Radio Shows</h1>
            <p class="shows-hero-sub">Utforsk ukentlige livesendinger fra Sound Core — psytrance, ambient, techno, jazz og mer.</p>
          </div>
          <div class="shows-hero-live">
            ${live ? `
              <div class="shows-live-pill">
                <span class="shows-live-dot"></span> ON AIR NÅ
              </div>
              <div class="shows-live-name">${escHtml(live.name)}</div>
              <div class="shows-live-host">med ${escHtml(live.host)}</div>
              <button class="shows-live-btn" onclick="Shows.tuneIn('${live.stream}')">▶ Lyt nå</button>
            ` : next ? `
              <div class="shows-live-pill shows-live-pill--soon">
                Neste show
              </div>
              <div class="shows-live-name">${escHtml(next.show.name)}</div>
              <div class="shows-live-host">${DAYS_NO[next.show.day]} ${fmtHour(next.show.startHour)}</div>
              <button class="shows-live-btn" onclick="Router.go('/radio')">📻 Radio</button>
            ` : ''}
          </div>
        </div>

        <!-- ON AIR -->
        ${live ? `
        <div class="section" style="max-width:900px">
          <div class="section-header">
            <div class="section-title"><span class="show-on-air-dot"></span> Sendes nå</div>
          </div>
          ${showCard(live, true)}
        </div>` : ''}

        <!-- WEEKLY SCHEDULE -->
        <div class="section" style="max-width:1100px">
          <div class="section-header">
            <div class="section-title">📅 Ukentlig sendeskjema</div>
          </div>
          <div class="sched-grid">
            ${scheduleGrid()}
          </div>
        </div>

        <!-- ALL SHOWS -->
        <div class="section" style="max-width:900px">
          <div class="section-header">
            <div class="section-title">🎙 Alle programmer</div>
          </div>
          <div class="shows-list">
            ${SHOWS.map(s => showCard(s, s === live)).join('')}
          </div>
        </div>

        <!-- ARCHIVE -->
        <div class="section" style="max-width:900px">
          <div class="section-header">
            <div class="section-title">🗂 Arkiv</div>
            <span class="text-muted text-sm">Tidligere sendinger</span>
          </div>
          <div class="archive-list">
            ${archiveCards()}
          </div>
        </div>

        <!-- FESTIVALS -->
        <div class="section" style="max-width:900px">
          <div class="section-header">
            <div class="section-title">🎪 Kommende festivalar</div>
          </div>
          <a class="shows-festival-card" href="https://hadratrancefestival.net/en/home/" target="_blank" rel="noopener noreferrer">
            <div class="shows-festival-banner" style="background:linear-gradient(135deg,#1a0a2e,#16213e,#0f3460)">
              <div class="shows-festival-emoji">🎪</div>
              <div class="shows-festival-dates">27–30 aug 2026</div>
            </div>
            <div class="shows-festival-body">
              <div class="shows-festival-name">Hadra Trance Festival 2026</div>
              <div class="shows-festival-loc">📍 Vieure, Allier, Frankrike 🇫🇷</div>
              <div class="shows-festival-theme">Solar Punk Chronicles: The Seed</div>
              <div class="shows-festival-tags">
                <span class="shows-festival-tag">🌀 Psytrance</span>
                <span class="shows-festival-tag">⚡ Techno</span>
                <span class="shows-festival-tag">🌿 Downtempo</span>
                <span class="shows-festival-tag">🎼 Live</span>
                <span class="shows-festival-tag">4 scener</span>
                <span class="shows-festival-tag">68 artistar</span>
                <span class="shows-festival-tag">90t musikk</span>
              </div>
              <div class="shows-festival-cta">Sjå program & billettar →</div>
            </div>
          </a>
        </div>

        <!-- SUBSCRIBE BANNER -->
        <div class="section" style="max-width:900px">
          <div class="shows-subscribe-banner">
            <div class="shows-subscribe-icon">📬</div>
            <div class="shows-subscribe-text">
              <div class="shows-subscribe-title">Aldri gå glipp av et show</div>
              <p>Registrer deg for å få varsler om kommende programmer og nye utgivelser.</p>
            </div>
            ${Auth.current()
              ? `<button class="btn btn-primary" onclick="App.toast('Du er allerede abonnert! ✓','success')">✓ Abonnert</button>`
              : `<a href="#/register" class="btn btn-primary">Registrer deg gratis</a>`
            }
          </div>
        </div>

      </div>`;
  }

  function tuneIn(stationId) {
    Router.go('/radio');
    // Give the radio page a tick to render, then play
    setTimeout(() => {
      if (typeof Radio !== 'undefined') Radio.playStation(stationId);
    }, 300);
  }

  function shareShow(id) {
    const show = SHOWS.find(s => s.id === id);
    if (!show) return;
    const text = `${show.emoji} ${show.name} på Sound Core — ${DAYS_NO[show.day]} ${fmtHour(show.startHour)}`;
    if (navigator.share) {
      navigator.share({ title: show.name, text, url: location.href });
    } else {
      navigator.clipboard.writeText(text).then(() => App.toast('Kopiert til utklippstavlen!', 'success'));
    }
  }

  return { render, tuneIn, shareShow };
})();
