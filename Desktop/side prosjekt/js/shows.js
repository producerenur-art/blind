// Shows — Radio Zora-style radio programme schedule
const Shows = (() => {

  // Static show catalogue
  const SHOWS = [
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
    {
      id: 'slow-monday',
      name: 'Slow Monday',
      host: '1.FM',
      day: 1, // Monday
      startHour: 10, endHour: 12,
      genre: 'Psychill · Ambient',
      emoji: '🌫️',
      color: '#8854d0',
      desc: '1.FM ambient psychill to ease the late morning before noon.',
      stream: 'ambientpsy-1fm',
    },
    {
      id: 'psytrance-teatime',
      name: 'Psytrance Teatime',
      host: 'DMT FM',
      day: 2, // Tuesday
      startHour: 13, endHour: 17,
      genre: 'Psytrance · Goa',
      emoji: '🍄',
      color: '#a855f7',
      desc: 'Psychedelic trance around the clock — Tenerife energy for the afternoon.',
      stream: 'dmtfm',
    },
    {
      id: 'morning-trance-circuit',
      name: 'Morning Trance Circuit',
      host: 'TranceAround.FM',
      day: 3, // Wednesday
      startHour: 6, endHour: 10,
      genre: 'Progressive Psy · Trance',
      emoji: '🌀',
      color: '#8b5cf6',
      desc: 'Trance around the clock — a driving start to Wednesday.',
      stream: 'trancearound',
    },
    {
      id: 'psyndora-friday-session',
      name: 'Psyndora Friday Session',
      host: 'Psyndora',
      day: 5, // Friday
      startHour: 9, endHour: 12,
      genre: 'Psytrance · Progressive · Goa',
      emoji: '🧿',
      color: '#a855f7',
      desc: 'Psytrance, progressive and goa to open a Friday morning.',
      stream: 'psyndora',
    },

    // ════════════════════════════════════════════
    // Full-week refill etter SomaFM-fjerninga (09.09.2026) — dekker heile
    // 24t × 7d berre med dei 14 stasjonane som er igjen (ingen SomaFM).
    // Same straum kan gå igjen fleire gonger i veka under ulike sendenamn —
    // same mønster som resten av lista alt brukte.
    // ════════════════════════════════════════════
    {
      id: 'sunday-deep-transmission', name: 'Sunday Deep Transmission', host: 'Radio Q37',
      day: 0, startHour: 0, endHour: 3,
      genre: 'Psychill · Ambient Dub', emoji: '🔮', color: '#e11d48',
      desc: 'Deep trance and ambient dub to open Sunday in the small hours.',
      stream: 'radioq37',
    },
    {
      id: 'labs-sunday-sunrise', name: 'Labs Sunday Sunrise', host: 'Babaganousha Labs',
      day: 0, startHour: 3, endHour: 7,
      genre: 'Psytrance · Goa', emoji: '🍄', color: '#f59e0b',
      desc: 'The Babaganousha sister channel carries the night into Sunday sunrise.',
      stream: 'babaganousha-labs',
    },
    {
      id: 'amsterdam-sunday-session', name: 'Amsterdam Sunday Session', host: 'ATR',
      day: 0, startHour: 14, endHour: 18,
      genre: 'Progressive Psy · Trance', emoji: '🌌', color: '#6366f1',
      desc: 'Uplifting progressive trance for a Sunday afternoon.',
      stream: 'atr',
    },
    {
      id: 'sunday-chillout-winddown', name: 'Sunday Chillout Wind-down', host: 'Lounge Sessions',
      day: 0, startHour: 18, endHour: 21,
      genre: 'Chill Out · Lounge', emoji: '🛋️', color: '#0ea5e9',
      desc: 'Electronic chill lounge to ease into Sunday evening.',
      stream: '1fm-chillout',
    },
    {
      id: 'sunday-night-psychill', name: 'Sunday Night Psychill', host: 'MultiHuman EntheoMusic',
      day: 0, startHour: 21, endHour: 24,
      genre: 'Psychill · Psybient', emoji: '🌿', color: '#10b981',
      desc: 'Entheogenic psychill to close out the week.',
      stream: 'multihuman',
    },
    {
      id: 'monday-night-psytrance', name: 'Monday Night Psytrance', host: 'DMT FM',
      day: 1, startHour: 0, endHour: 3,
      genre: 'Psytrance · Goa', emoji: '🍄', color: '#a855f7',
      desc: 'Psychedelic trance around the clock to open the week.',
      stream: 'dmtfm',
    },
    {
      id: 'psyndora-predawn', name: 'Psyndora Predawn', host: 'Psyndora',
      day: 1, startHour: 3, endHour: 6,
      genre: 'Psytrance · Goa', emoji: '🧿', color: '#a855f7',
      desc: 'Progressive goa in the quiet hours before Monday dawn.',
      stream: 'psyndora',
    },
    {
      id: 'monday-trance-wakeup', name: 'Monday Trance Wake-up', host: 'TranceAround.FM',
      day: 1, startHour: 6, endHour: 10,
      genre: 'Progressive Psy · Trance', emoji: '🌀', color: '#8b5cf6',
      desc: 'Trance around the clock to start the working week.',
      stream: 'trancearound',
    },
    {
      id: 'progressive-monday-drive', name: 'Progressive Monday Drive', host: 'RR Progressive',
      day: 1, startHour: 15, endHour: 18,
      genre: 'Progressive Psy · Trance', emoji: '🌀', color: '#6366f1',
      desc: 'Progressive house to drive through Monday afternoon.',
      stream: 'rr-progressive',
    },
    {
      id: 'radiozora-monday-evening', name: 'radiOzora Monday Evening', host: 'radiOzora',
      day: 1, startHour: 18, endHour: 21,
      genre: 'Psytrance · Psychedelic', emoji: '🔥', color: '#f97316',
      desc: 'OZORA Festival radio live from Budapest into Monday evening.',
      stream: 'radiozora-trance',
    },
    {
      id: 'tuesday-chill-zero-hour', name: 'Tuesday Chill Zero Hour', host: 'Lounge Sessions',
      day: 2, startHour: 0, endHour: 3,
      genre: 'Chill Out · Lounge', emoji: '🛋️', color: '#0ea5e9',
      desc: 'Electronic chill lounge into the first hours of Tuesday.',
      stream: '1fm-chillout',
    },
    {
      id: 'babaganousha-before-dawn', name: 'Babaganousha Before Dawn', host: 'Babaganousha',
      day: 2, startHour: 3, endHour: 6,
      genre: 'Psytrance · Goa', emoji: '🌙', color: '#f59e0b',
      desc: 'Psychedelic goa and psytrance before Tuesday sunrise.',
      stream: 'babaganousha',
    },
    {
      id: 'tuesday-ambient-wakeup', name: 'Tuesday Ambient Wake-up', host: '1.FM',
      day: 2, startHour: 6, endHour: 10,
      genre: 'Psychill · Ambient', emoji: '🌫️', color: '#8854d0',
      desc: '1.FM ambient psychill to ease into Tuesday morning.',
      stream: 'ambientpsy-1fm',
    },
    {
      id: 'amsterdam-tuesday-session', name: 'Amsterdam Tuesday Session', host: 'ATR',
      day: 2, startHour: 17, endHour: 21,
      genre: 'Progressive Psy · Trance', emoji: '🌌', color: '#6366f1',
      desc: 'Uplifting progressive trance for Tuesday evening.',
      stream: 'atr',
    },
    {
      id: 'tuesday-late-transmission', name: 'Tuesday Late Transmission', host: 'Radio Q37',
      day: 2, startHour: 21, endHour: 24,
      genre: 'Psychill · Ambient Dub', emoji: '🔮', color: '#e11d48',
      desc: 'Deep trance and ambient dub to close out Tuesday.',
      stream: 'radioq37',
    },
    {
      id: 'midweek-progressive', name: 'Midweek Progressive', host: 'RR Progressive',
      day: 3, startHour: 10, endHour: 13,
      genre: 'Progressive Psy · Trance', emoji: '🌀', color: '#6366f1',
      desc: 'Progressive house through the middle of Wednesday.',
      stream: 'rr-progressive',
    },
    {
      id: 'wednesday-psychill-break', name: 'Wednesday Psychill Break', host: 'MultiHuman EntheoMusic',
      day: 3, startHour: 13, endHour: 16,
      genre: 'Psychill · Psybient', emoji: '🌿', color: '#10b981',
      desc: 'Entheogenic psychill for a Wednesday afternoon break.',
      stream: 'multihuman',
    },
    {
      id: 'radiozora-wednesday-chill', name: 'radiOzora Wednesday Chill', host: 'radiOzora',
      day: 3, startHour: 16, endHour: 19,
      genre: 'Psychill · Downtempo', emoji: '🌿', color: '#22c55e',
      desc: 'OZORA Festival radio — chill & downtempo into Wednesday evening.',
      stream: 'radiozora-chill',
    },
    {
      id: 'amsterdam-wednesday-session', name: 'Amsterdam Wednesday Session', host: 'ATR',
      day: 3, startHour: 19, endHour: 22,
      genre: 'Progressive Psy · Trance', emoji: '🌌', color: '#6366f1',
      desc: 'Uplifting progressive trance for Wednesday night.',
      stream: 'atr',
    },
    {
      id: 'wednesday-night-winddown', name: 'Wednesday Night Wind-down', host: 'Smooth Chill',
      day: 3, startHour: 22, endHour: 24,
      genre: 'Downtempo · Chillout', emoji: '🫧', color: '#0ea5e9',
      desc: 'Relaxing chill and soul to close out Wednesday.',
      stream: 'smoothchill',
    },
    {
      id: 'thursday-predawn-goa', name: 'Thursday Pre-dawn Goa', host: 'Babaganousha',
      day: 4, startHour: 3, endHour: 6,
      genre: 'Psytrance · Goa', emoji: '🌙', color: '#f59e0b',
      desc: 'Psychedelic goa and psytrance before Thursday sunrise.',
      stream: 'babaganousha',
    },
    {
      id: 'thursday-psytrance-wakeup', name: 'Thursday Psytrance Wake-up', host: 'DMT FM',
      day: 4, startHour: 6, endHour: 9,
      genre: 'Psytrance · Goa', emoji: '🍄', color: '#a855f7',
      desc: 'Psychedelic trance around the clock to start Thursday.',
      stream: 'dmtfm',
    },
    {
      id: 'psyndora-thursday-session', name: 'Psyndora Thursday Session', host: 'Psyndora',
      day: 4, startHour: 9, endHour: 12,
      genre: 'Psytrance · Goa', emoji: '🧿', color: '#a855f7',
      desc: 'Progressive goa to carry Thursday morning into midday.',
      stream: 'psyndora',
    },
    {
      id: 'thursday-deep-trance-midday', name: 'Thursday Deep Trance Midday', host: 'Radio Q37',
      day: 4, startHour: 12, endHour: 15,
      genre: 'Psychill · Ambient Dub', emoji: '🔮', color: '#e11d48',
      desc: 'Deep trance and ambient dub through Thursday midday.',
      stream: 'radioq37',
    },
    {
      id: 'thursday-night-psychill', name: 'Thursday Night Psychill', host: 'MultiHuman EntheoMusic',
      day: 4, startHour: 23, endHour: 24,
      genre: 'Psychill · Psybient', emoji: '🌿', color: '#10b981',
      desc: "Entheogenic psychill for Thursday's last hour.",
      stream: 'multihuman',
    },
    {
      id: 'friday-night-winddown', name: 'Friday Night Wind-down', host: 'Smooth Chill',
      day: 5, startHour: 0, endHour: 3,
      genre: 'Downtempo · Chillout', emoji: '🫧', color: '#0ea5e9',
      desc: 'Relaxing chill and soul into the first hours of Friday.',
      stream: 'smoothchill',
    },
    {
      id: 'labs-friday-predawn', name: 'Labs Friday Predawn', host: 'Babaganousha Labs',
      day: 5, startHour: 3, endHour: 6,
      genre: 'Psytrance · Goa', emoji: '🍄', color: '#f59e0b',
      desc: 'The Babaganousha sister channel deep in Friday predawn.',
      stream: 'babaganousha-labs',
    },
    {
      id: 'friday-trance-drive', name: 'Friday Trance Drive', host: 'TranceAround.FM',
      day: 5, startHour: 12, endHour: 15,
      genre: 'Progressive Psy · Trance', emoji: '🌀', color: '#8b5cf6',
      desc: 'Trance around the clock to drive through Friday afternoon.',
      stream: 'trancearound',
    },
    {
      id: 'friday-psychill-afternoon', name: 'Friday Psychill Afternoon', host: 'MultiHuman EntheoMusic',
      day: 5, startHour: 15, endHour: 18,
      genre: 'Psychill · Psybient', emoji: '🌿', color: '#10b981',
      desc: 'Entheogenic psychill to ease into Friday evening.',
      stream: 'multihuman',
    },
    {
      id: 'friday-psytrance-warmup', name: 'Friday Psytrance Warmup', host: 'DMT FM',
      day: 5, startHour: 18, endHour: 21,
      genre: 'Psytrance · Goa', emoji: '🍄', color: '#a855f7',
      desc: 'Psychedelic trance to warm up for Friday night.',
      stream: 'dmtfm',
    },
    {
      id: 'radiozora-friday-night', name: 'radiOzora Friday Night', host: 'radiOzora',
      day: 5, startHour: 21, endHour: 24,
      genre: 'Psytrance · Psychedelic', emoji: '🔥', color: '#f97316',
      desc: 'OZORA Festival radio live from Budapest into Friday night.',
      stream: 'radiozora-trance',
    },
    {
      id: 'saturday-deep-transmission', name: 'Saturday Deep Transmission', host: 'Radio Q37',
      day: 6, startHour: 0, endHour: 3,
      genre: 'Psychill · Ambient Dub', emoji: '🔮', color: '#e11d48',
      desc: 'Deep trance and ambient dub to open Saturday.',
      stream: 'radioq37',
    },
    {
      id: 'saturday-predawn-goa', name: 'Saturday Predawn Goa', host: 'Babaganousha',
      day: 6, startHour: 3, endHour: 6,
      genre: 'Psytrance · Goa', emoji: '🌙', color: '#f59e0b',
      desc: 'Psychedelic goa and psytrance before Saturday sunrise.',
      stream: 'babaganousha',
    },
    {
      id: 'saturday-sunrise-psytrance', name: 'Saturday Sunrise Psytrance', host: 'DMT FM',
      day: 6, startHour: 6, endHour: 8,
      genre: 'Psytrance · Goa', emoji: '🍄', color: '#a855f7',
      desc: 'Psychedelic trance to greet the Saturday sunrise.',
      stream: 'dmtfm',
    },
    {
      id: 'saturday-progressive-house', name: 'Saturday Progressive House', host: 'RR Progressive',
      day: 6, startHour: 11, endHour: 14,
      genre: 'Progressive Psy · Trance', emoji: '🌀', color: '#6366f1',
      desc: 'Progressive house through Saturday midday.',
      stream: 'rr-progressive',
    },
    {
      id: 'radiozora-saturday-chill', name: 'radiOzora Saturday Chill', host: 'radiOzora',
      day: 6, startHour: 14, endHour: 18,
      genre: 'Psychill · Downtempo', emoji: '🌿', color: '#22c55e',
      desc: 'OZORA Festival radio — chill & downtempo into Saturday afternoon.',
      stream: 'radiozora-chill',
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
