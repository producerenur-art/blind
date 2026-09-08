// Discover — music & people discovery
const Discover = (() => {

  // Roterer innhald kvar 7. dag, deterministisk ut frå ukenummer (epoch-veker).
  // Same veke = same val for alle besøkande; byter automatisk når ei ny veke startar.
  // Brukast for dei roterande Discover-kategoriane — IKKJE Ambient Mann.
  // VIKTIG: kvar kategori sin pool må halde seg innanfor kategorien sine eigne sjangre.
  const weeklyIndex = () => Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
  const weeklyPick = (arr) => arr[weeklyIndex() % arr.length];

  // Ambient Mann radio-miks — PERMANENT. Skal IKKJE rotere (unntaket frå 7-dagars-rotasjonen).
  const AMBIENT_MANN_MIX = 'iLjKF9-iC1k';  // "Ambient Mann Dark Ambient and Drone mix"

  // Roterande radio-miksar per Discover-kategori — på-sjanger YouTube-video-ID-ar.
  // weeklyPick byter til neste i lista kvar 7. dag. Legg til/byt ut ID-ar fritt (hald deg på-sjanger).
  const CATEGORY_MIXES = {
    'psybient':        ['IAZIzaqxaZk', '3LQYUBw_Icc', 'V6zgkhAYhEQ'],  // psybient / psychill
    'altar-records':   ['X2WV1RnCPlw', 'Y91C2yTq8BQ', 'pu-IVYOLsDc'],  // progressive psytrance
    'hadra':           ['2crX23JpCrI', 'ifwKC8r0C5w', 'KavG_9PgRHs'],  // psytrance festival-sett
    'dacru':           ['ie82s2wXlY4', 'fiFiArs1kDw', 'Q25Uwy2UBTg'],  // psytrance-label
    'tip-raja':        ['pqLKL9nIHC0', 't4KAxWh9fGs', 'fl40hDwEnOs'],  // goa / psytrance (Raja Ram / TIP)
    'astral':          ['jDpvkePMsw0', 'R_4RaHzQo0U', 'yMwdMMMggpc'],  // goa trance
    'shpongle':        ['ZYowY7tvBbY', 'u5Y1SzkoPOI', 'XwtT4ZBa3CE'],  // psybient / psydub
    'younger-brother': ['rkMt4GudJzg', 'sEdUddGvoac', 'MBtgRZMaAYg'],  // psykedelisk elektronika
    'shunyata':        ['wiow3vELLYw', 'MhaE4T6yO1g', 'MR5Sva5ljbI'],  // psytrance — Mariochainsaw (ekte Shunyata Records) + 2 on-sjanger
    'kukan-dub':       ['Knq6rBP8Afk', 'iRgtYUfUjiE', 'oU3Be14rrwU'],  // dub / psydub
    'cosmic-leaf':     ['nUW7oEiwVqY', 'hKMzD6sclAY', 'grWRSyptTnk'],  // psychill / progressive / downtempo
    'gagarin-project': ['fhcc1E9RoPE', 'h6BKzBLOgIU', 'deT8-XC7Rqw'],  // psybient / psychill / downtempo
  };

  // Genererer ein "Radio-miks"-seksjon som byter YouTube-video kvar 7. dag for ein kategori.
  function renderWeeklyMix(catKey) {
    const pool = CATEGORY_MIXES[catKey];
    if (!pool || !pool.length) return '';
    const ytId = weeklyPick(pool);
    return `
      <div class="disc-psy-section">
        <div class="disc-psy-section-hdr">
          <span class="disc-psy-section-icon">${Icon('radio')}</span>
          <span class="disc-psy-section-title">Radio mix</span>
          <span class="disc-psy-section-badge">YouTube · changes weekly</span>
        </div>
        <iframe class="hr-yt-embed" src="https://www.youtube.com/embed/${ytId}?list=RD${ytId}" allow="autoplay; encrypted-media" allowfullscreen></iframe>
      </div>`;
  }

  const GENRES = [
    { tag: 'all',          label: 'All',          emoji: '🎵' },
    { tag: 'ambient',      label: 'Ambient',       emoji: '🌌' },
    { tag: 'electronic',   label: 'Electronic',    emoji: '⚡' },
    { tag: 'psytrance',    label: 'Psytrance',     emoji: '🌀' },
    { tag: 'techno',       label: 'Techno',        emoji: '🔊' },
    { tag: 'house',        label: 'House',         emoji: '🏠' },
    { tag: 'chill',        label: 'Chill',         emoji: '🌿' },
    { tag: 'experimental', label: 'Experimental',  emoji: '🧪' },
    { tag: 'drone',        label: 'Drone',         emoji: '🔁' },
  ];

  const MAIN_CATEGORIES = [
    { tag: '',           label: 'Choose later via profile',  emoji: '⏭️', labels: [] },
    { tag: 'electronic', label: 'Electronic / Dance',        emoji: '⚡', labels: [
      { name: 'Kompakt Records',       email: 'demo@kompakt.fm' },
      { name: 'Ghostly International', email: 'info@ghostly.com' },
      { name: 'Warp Records',          email: 'demo@warp.net' },
      { name: 'Ninja Tune',            email: 'demos@ninjatune.net' },
    ]},
    { tag: 'hiphop',     label: 'Hip-Hop / R&B',            emoji: '🎤', labels: [
      { name: 'Stones Throw Records', email: 'demos@stonesthrow.com' },
      { name: 'Rhymesayers',          email: 'demos@rhymesayers.com' },
      { name: 'Def Jam (demo)',        email: 'unsigned@defjam.com' },
    ]},
    { tag: 'pop',        label: 'Pop / Indie',               emoji: '🎶', labels: [
      { name: 'Warner Music Norway', email: 'demos@warnermusic.no' },
      { name: 'Sony Music Norway',   email: 'demos@sonymusic.no' },
      { name: 'Universal Music',     email: 'demos@umusic.no' },
    ]},
    { tag: 'rock',       label: 'Rock / Metal',              emoji: '🎸', labels: [
      { name: 'Nuclear Blast',   email: 'bands@nuclearblast.de' },
      { name: 'Relapse Records', email: 'demos@relapse.com' },
      { name: 'Sub Pop Records', email: 'demos@subpop.com' },
    ]},
    { tag: 'jazz',       label: 'Jazz / Blues',              emoji: '🎷', labels: [
      { name: 'ECM Records', email: 'info@ecmrecords.com' },
      { name: 'Blue Note',   email: 'info@bluenote.com' },
      { name: 'ACT Music',   email: 'demos@actmusic.com' },
    ]},
    { tag: 'ambient',    label: 'Experimental / Ambient',  emoji: '🌌', labels: [
      { name: 'Kranky Records', email: 'info@kranky.net' },
      { name: 'Touch Music',    email: 'demos@touchmusic.org.uk' },
      { name: '12k',            email: 'demos@12k.com' },
    ]},
  ];

  const ROLES = [
    { tag: 'all',          label: 'All',          emoji: '👥' },
    { tag: 'lytter',       label: 'Listeners',    emoji: '🎧' },
    { tag: 'dj',           label: 'DJs',          emoji: '🎛️' },
    { tag: 'produsent',    label: 'Producers',    emoji: '🎹' },
    { tag: 'plateselskap', label: 'Labels',       emoji: '🏷️' },
  ];

  const ROLE_LABEL = { lytter:'🎧 Listener', dj:'🎛️ DJ', produsent:'🎹 Producer', plateselskap:'🏷️ Label' };

  // Maps genre tags to Radio station categories for the radio-favoritt tab
  // NB: verdiane må vere kategorinamn som faktisk finst i Radio.stations (`cat`).
  // Fleire av dei gamle ('Techno / Minimal', 'EDM / House', 'Psytrance / Progressive')
  // fanst ikkje lenger, så sjangrane gav tom radioliste.
  const GENRE_RADIO_CATS = {
    all:          null,
    ambient:      ['Ambient / Space', 'Stellar'],
    electronic:   ['Lo-Fi / IDM', 'EDM / House / Techno', 'Stellar'],
    psytrance:    ['Psytrance / Goa', 'Progressive Psy / Trance', 'Psybient / Psychill', 'radiOzora'],
    techno:       ['EDM / House / Techno', 'Lo-Fi / IDM'],
    house:        ['EDM / House / Techno'],
    chill:        ['Chill Out / Downtempo', 'Psybient / Psychill', 'Dub / Reggae'],
    experimental: ['Lo-Fi / IDM', 'Ambient / Space', 'Radio Q37'],
    drone:        ['Drone / Dark Drone', 'Ambient / Space'],
  };

  // «Live activity» viste tidligere FAKE_ACTIVITY — oppdiktede brukernavn,
  // spor og tidsstempler som aldri fantes. Fjernet 07.09.2026 og erstattet
  // med ekte, ferske opplastinger fra allTracks (reell Gun.js-data: ekte
  // username + uploadedAt). Ingen nedlastings-/wishlist-hendelser spores
  // noe sted i appen, så «downloaded»/«wishlisted» kan ikke gjenskapes ekte
  // — «uploaded» er den eneste sporede hendelsen vi faktisk kan vise sant.
  function timeAgo(ts) {
    const n = Number(ts);
    if (!Number.isFinite(n) || n <= 0) return 'recently';
    const s = Math.floor((Date.now() - n) / 1000);
    if (s < 60)    return 'just now';
    if (s < 3600)  return Math.floor(s / 60) + ' min ago';
    if (s < 86400) return Math.floor(s / 3600) + ' h ago';
    return Math.floor(s / 86400) + ' d ago';
  }

  let activeGenre   = 'all';
  let activeRole    = 'all';
  let activeTab     = 'music';
  let activeSubTab  = 'tracks'; // 'tracks' | 'upload' | 'radio'
  let allTracks     = [];
  let allUsers      = [];
  let activityTimer = null;
  let discGenreRadios = {}; // genre tag → Radio station id
  let droneZoneOpen = false;

  // ── Nedlastings-betalingssystem ───────────────────────────────────────
  // Modell: musikk under 60 min er gratis for alle innloggede brukere.
  // Innhold på 60 min eller mer (lange mikser / DJ-sett) koster MIX_PRICE_NOK.
  const FREE_MAX_SECONDS = 60 * 60; // grense: under 60 min = gratis, 60 min+ = betalt
  const MIX_PRICE_NOK   = 150;
  let pendingDownloadId = null;

  // ── Dark Drone artist & label data ───────────────────────────────────
  const DRONE_ARTISTS = [
    {
      name: 'Kammarheit',
      country: '🇸🇪 Sweden',
      bio: 'Pär Boström\'s dark ambient project — since the early 2000s one of the most important voices in dark drone. Dense, slow, and achingly beautiful. "The Starwheel" is regarded as one of the best dark ambient albums ever made.',
      albums: ['Asleep and Well Hidden (2003)', 'The Starwheel (2005)', 'The Nest (2015)', 'Thronal (2020)'],
      label: 'Cyclic Law',
      bandcamp: 'https://kammarheit.bandcamp.com',
      youtube: 'https://www.youtube.com/channel/UCrIhFRfU627QkVjdlr6baag',
      facebook: 'https://www.facebook.com/kammarheitofficial',
      website: 'https://www.kammarheit.com',
    },
    {
      name: 'Atrium Carceri',
      country: '🇸🇪 Sweden / 🇺🇸 USA',
      bio: 'Simon Heath\'s flagship project and founder of Cryo Chamber. Dystopian, cinematic dark ambient that tells dark science-fiction stories through sound — post-apocalyptic sound art of the highest order.',
      albums: ['Cellblock (2004)', 'Ptahil (2008)', 'Codex (2013)', 'The Untold (2016)', 'Forgotten Gods (2022)'],
      label: 'Cryo Chamber',
      bandcamp: 'https://cryochamber.bandcamp.com',
      youtube: 'https://www.youtube.com/@cryochamberlabel',
      facebook: 'https://www.facebook.com/p/Atrium-Carceri-100063521439906',
    },
    {
      name: 'Sabled Sun',
      country: '🇸🇪 Sweden / 🇺🇸 USA',
      bio: 'Simon Heath\'s sci-fi dark ambient alias. A devastatingly pure drone-based journey through bleak future landscapes — the entire post-apocalyptic future in a single soundscape.',
      albums: ['2145 (2012)', '2146 (2012)', '2147 (2013)', 'Signals I (2013)', 'Signals II (2014)'],
      label: 'Cryo Chamber',
      bandcamp: 'https://cryochamber.bandcamp.com',
      youtube: 'https://www.youtube.com/@cryochamberlabel',
    },
    {
      name: 'Dronny Darko',
      country: '🇺🇦 Ukraine',
      bio: 'Oleg Puzan from Kyiv makes massive, towering dark ambient and drone. One of the most prolific artists on Cryo Chamber — deep, cosmic and boundless.',
      albums: ['Our Darkest Days (2015)', 'Desolate Lighthouse (2016)', 'Architect of Shadows (2019)'],
      label: 'Cryo Chamber / Petroglyph Music',
      bandcamp: 'https://dronnydarko.bandcamp.com',
      youtube: 'https://www.youtube.com/channel/UCWIeF6dIcewYGRRq1tANydw',
      facebook: 'https://www.facebook.com/dronnydarko',
    },
    {
      name: 'Alphaxone',
      country: '🇮🇷 Iran',
      bio: 'Mehdi Saleh from Tehran makes cinematic, atmospheric dark ambient and space drone. Deep spatial textures with a unique blend of oriental and cosmic aesthetics.',
      albums: ['The Forgotten (2013)', 'Edge of Abyss (2015)', 'Membrane (2019)', 'Solitary Retreat (2022)'],
      label: 'Cryo Chamber',
      bandcamp: 'https://alphaxone.bandcamp.com',
      facebook: 'https://www.facebook.com/alphaxone',
    },
    {
      name: 'Northumbria',
      country: '🇨🇦 Canada',
      bio: 'Jim Field and Dorian Williamson from Toronto build massive, improvised walls of drone with guitar and bass. Unsettling and physically overwhelming — music you feel more than you hear.',
      albums: ['Helluland (2016)', 'Markland (2016)', 'Vinland (2017)', 'Isolering (2019)'],
      label: 'Cryo Chamber',
      bandcamp: 'https://northumbria.bandcamp.com',
      facebook: 'https://www.facebook.com/NorthumbriaDrone',
    },
    {
      name: 'Council of Nine',
      country: '🇺🇸 USA',
      bio: 'Maximillian Olivier from California makes mystical ritual dark ambient. Deep cosmic drone with occult undertones — like listening to an ancient ceremony from inside the dark.',
      albums: ['Dakhma (2017)', 'Diagnosis (2018)', 'Trinity (2019)', 'Exit Earth (2020)', 'Davidian (2021)'],
      label: 'Cryo Chamber',
      bandcamp: 'https://cryochamber.bandcamp.com',
      youtube: 'https://www.youtube.com/results?search_query=council+of+nine+dark+ambient',
    },
    {
      name: 'Ugasanie',
      country: '🇧🇾 Belarus',
      bio: 'Evgeny Kuznetsov makes icy, vast dark ambient inspired by arctic landscapes and Siberian nature. Every album is a journey through tundra and permafrost.',
      albums: ['Altai (2014)', 'Tundra (2016)', 'Polar Silence (2018)', 'Taiga (2020)'],
      label: 'Cryo Chamber',
      bandcamp: 'https://ugasanie.bandcamp.com',
      youtube: 'https://www.youtube.com/results?search_query=ugasanie+dark+ambient',
    },
    {
      name: 'Cities Last Broadcast',
      country: '🇸🇪 Sweden',
      bio: 'The side project of Pär Boström (Kammarheit). Terrifying dark ambient inspired by empty cities and crumbling structures — post-apocalyptic moodscapes turned into sound.',
      albums: ['The Humming Tapes (2012)', 'The Cancelled Earth (2013)'],
      label: 'Cyclic Law',
      bandcamp: 'https://citieslastbroadcast.bandcamp.com',
      youtube: 'https://www.youtube.com/results?search_query=cities+last+broadcast+dark+ambient',
    },
    {
      name: 'Trepaneringsritualen',
      country: '🇸🇪 Sweden',
      bio: 'T.M.R.\'s uncompromising ritual industrial / drone project. Dark, brutal and meditative all at once — one of the most distinctive voices in underground drone.',
      albums: ['Perfection & Permanence (2012)', 'Deathward, To The Womb (2015)', 'TA∞ (2018)'],
      label: 'Cyclic Law / Malignant Records',
      bandcamp: 'https://trepaneringsritualen.bandcamp.com',
      youtube: 'https://www.youtube.com/results?search_query=trepaneringsritualen',
    },
  ];

  const DRONE_LABELS = [
    {
      name: 'Cryo Chamber',
      flag: '🇺🇸',
      country: 'USA (founded by a Swede)',
      founded: '2011',
      desc: 'The world\'s leading dark ambient label, run by Simon Heath (Atrium Carceri). Releases digitally and physically with a focus on dark, cinematic ambient and drone. Over 500 releases.',
      artists: 'Kammarheit, Atrium Carceri, Sabled Sun, Dronny Darko, Alphaxone, Northumbria, Council of Nine, Ugasanie',
      website: 'https://www.cryochamberlabel.com',
      bandcamp: 'https://cryochamber.bandcamp.com',
      facebook: 'https://www.facebook.com/CryoChamber',
      youtube: 'https://www.youtube.com/@cryochamberlabel',
      demoContact: 'cryochamber@hotmail.com',
      demoNote: 'Send a finished album or EP as a link. Include a biography and background. Simon Heath replies personally — be specific and professional. High demand.',
    },
    {
      name: 'Cyclic Law',
      flag: '🇨🇦',
      country: 'Canada (now France)',
      founded: '2002',
      desc: 'Canadian label run by Frédéric Arbour, now based in the French Pyrenees. Specialized in ritual dark ambient, drone and experimental electronica. 140+ releases since 2002.',
      artists: 'Kammarheit, Cities Last Broadcast, Trepaneringsritualen, Lustmord, Halgrath, Phelios',
      website: 'https://www.cycliclaw.com',
      bandcamp: 'https://cycliclaw.bandcamp.com',
      facebook: 'https://www.facebook.com/cycliclaw',
      youtube: 'https://www.youtube.com/@cycliclaw',
      demoContact: 'Contact form at cycliclaw.com/contact',
      demoNote: 'No public demo email — use the contact form on the website. Send a finished EP/album as a link + a short bio. Focus on quality and concept over quantity.',
    },
    {
      name: 'Malignant Records',
      flag: '🇺🇸',
      country: 'USA (Maryland)',
      founded: '1994',
      desc: 'Veteran dark ambient, power electronics and industrial label from the USA. Over 30 years of uncompromising releases in the darkest corners of experimental music.',
      artists: 'Gnawed, Trepaneringsritualen, Theologian, Karmacipher, Atrax Morgue (reissues)',
      website: 'https://www.malignantrecords.com',
      bandcamp: 'https://malignantrecs.bandcamp.com',
      facebook: 'https://www.facebook.com/malignantrecords',
      demoContact: 'malignant@malignantrecords.com',
      demoNote: '⚠️ Not accepting demos at the moment — check the website malignantrecords.com for updated status. Focus on dark ambient, noise, industrial and ritual music.',
    },
    {
      name: 'Tesco Organisation',
      flag: '🇩🇪',
      country: 'Germany',
      founded: '1987',
      desc: 'One of Europe\'s longest-running underground industrial operations. Started as mail order in 1987, now an active record label. Deeply underground-oriented — no PR, just music.',
      artists: 'Various power electronics, industrial, neofolk and dark ambient artists',
      website: 'https://tesco-germany.com/en',
      bandcamp: 'https://tescogermany.bandcamp.com',
      facebook: 'https://www.facebook.com/TescoGermany',
      demoContact: 'tesco-germany@t-online.de',
      demoNote: 'Send an email with a link to your music. No formal requirements — but be genuinely underground. Focus on industrial, power electronics, neofolk and dark experimental music.',
    },
    {
      name: 'Consouling Sounds',
      flag: '🇧🇪',
      country: 'Belgium',
      founded: '2008',
      desc: 'Belgian non-profit label for post-metal, doom, sludge and dark experimental music — including drone and dark ambient. Strong European profile and artistic integrity.',
      artists: 'Oathbreaker, A+, various drone/doom/post-metal',
      website: 'https://consouling.be',
      bandcamp: 'https://consouling.bandcamp.com',
      facebook: 'https://www.facebook.com/ConsoulingSounds',
      demoContact: 'support@consouling.be',
      demoNote: 'Send a demo by email with a link to your music (Bandcamp/SoundCloud) + a press photo and bio. Belgian/European-focused. Non-profit with a strong artistic profile.',
    },
    {
      name: 'Ultimae Records',
      flag: '🇫🇷',
      country: 'France (Lyon)',
      founded: '2002',
      desc: 'French boutique label founded by Aes Dana (Vincent Villuis). Specialized in ambient, psybient and downtempo — known for high sound quality and consistent releases in the psychedelic underground scene.',
      artists: 'Aes Dana, Solar Fields, Carbon Based Lifeforms, Shulman, Circular, Asura, Sync24',
      website: 'https://ultimae.com',
      bandcamp: 'https://ultimae.bandcamp.com',
      facebook: 'https://www.facebook.com/ultimaerecords',
      demoContact: 'Contact form at ultimae.com',
      demoNote: 'Use the contact form at ultimae.com. Focus on high-quality ambient, psybient and downtempo. A label with a strong artistic profile — send finished material with a bio and link.',
    },
    {
      name: 'Cosmic Leaf',
      flag: '🇬🇷',
      country: 'Greece',
      founded: '2002',
      desc: 'Greek boutique label specialized in psybient, psychedelic ambient, space and progressive electronic music. One of the leading independent labels in the global psychedelic underground scene.',
      artists: 'Globular, Distant System, Solar Fields, Amanita, Mystical Sun, Ultimae artists',
      website: 'https://cosmicleaf.gr',
      bandcamp: 'https://cosmicleaf.bandcamp.com',
      demoContact: 'Contact form at cosmicleaf.gr',
      demoNote: 'Use the contact form at cosmicleaf.gr. Focus on high-quality psybient, ambient and psychedelic electronica.',
    },
  ];

  // ── Utils ─────────────────────────────────────────────────────────────
  function escHtml(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ── YouTube-søk ────────────────────────────────────────────────────────
  // Lèt folk søke opp ein låt/artist direkte på YouTube frå kvar YouTube-lenkje.
  function openYt(query) {
    const q = String(query || '').trim();
    if (!q) return;
    window.open('https://www.youtube.com/results?search_query=' + encodeURIComponent(q), '_blank', 'noopener');
  }
  // onsubmit-handler for søkjefelta.
  function ytSearch(ev) {
    if (ev && ev.preventDefault) ev.preventDefault();
    const input = ev && ev.target ? ev.target.querySelector('.yt-search-input') : null;
    openYt(input ? input.value : '');
    return false;
  }
  // ── Ambient Mann: in-page YouTube-søk ─────────────────────────────────
  // Søkjer på YouTube via api/youtube (Data API), viser treff som klikkbare
  // kort og spelar valt låt i embed-en — alt blir på SiriusFM, inga ny fane.
  async function ambientYtSearch(ev) {
    if (ev && ev.preventDefault) ev.preventDefault();
    const input   = document.getElementById('disc-am-yt-q');
    const results = document.getElementById('disc-am-yt-results');
    const q = (input ? input.value : '').trim();
    if (!results) return false;
    if (!q) { results.innerHTML = ''; return false; }
    results.innerHTML = `<div class="disc-am-yt-status">${Icon('search')} Searching for «${escHtml(q)}»…</div>`;
    try {
      const r = await fetch('/api/youtube?q=' + encodeURIComponent(q));
      const data = await r.json();
      if (!r.ok) throw new Error(data && data.error ? data.error : 'Search failed');
      const items = data.items || [];
      if (!items.length) {
        results.innerHTML = `<div class="disc-am-yt-status">No results for «${escHtml(q)}»</div>`;
        return false;
      }
      results.innerHTML = items.map(it => `
        <div class="disc-psy-mix-card" role="button" tabindex="0" style="cursor:pointer"
             onclick="Discover.ambientYtPlay('${escHtml(it.id)}','${escHtml(it.title).replace(/'/g,'&#39;')}')"
             onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();Discover.ambientYtPlay('${escHtml(it.id)}','${escHtml(it.title).replace(/'/g,'&#39;')}')}">
          <div class="disc-psy-mix-thumb"${it.thumb ? ` style="background-image:url('${escHtml(it.thumb)}');background-size:cover;background-position:center"` : ' style="background:linear-gradient(135deg,#c00,#ff3d3d)"'}>${it.thumb ? '' : Icon('play')}</div>
          <div class="disc-psy-mix-info">
            <div class="disc-psy-mix-title">${escHtml(it.title)}</div>
            <div class="disc-psy-mix-artist">${escHtml(it.channel)}</div>
          </div>
          <span class="disc-psy-mix-arrow">${Icon('play')}</span>
        </div>`).join('');
    } catch (e) {
      results.innerHTML = `<div class="disc-am-yt-status">${escHtml(e && e.message ? e.message : 'Search failed')}</div>`;
    }
    return false;
  }

  // Spelar valt søkjetreff i Ambient Mann-embed-en (autoplay, blir på SiriusFM).
  function ambientYtPlay(id, title) {
    const player = document.getElementById('disc-am-yt-player');
    if (!player || !id || !/^[a-zA-Z0-9_-]{11}$/.test(id)) return;
    player.innerHTML = `<iframe class="hr-yt-embed" title="${escHtml(title || 'YouTube')}" src="https://www.youtube.com/embed/${id}?autoplay=1" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
    player.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // Liten søkjelinje folk kan bruke for å finne ein låt på YouTube.
  function ytSearchBar(placeholder) {
    const ph = escHtml(placeholder || 'Search for a track on YouTube…');
    return `<form class="yt-search" onsubmit="return Discover.ytSearch(event)">
        <span class="yt-search-icon">${Icon('search')}</span>
        <input type="search" class="yt-search-input" placeholder="${ph}" aria-label="Search on YouTube">
        <button class="yt-search-btn" type="submit" title="Search on YouTube">${Icon('arrow-right')}</button>
      </form>`;
  }
  // YouTube-lenkjekort med innebygd søkjefelt under.
  function ytFindCard(url, desc) {
    return `<div class="yt-find">
        <a class="disc-psy-label-card" href="${escHtml(url)}" target="_blank" rel="noopener noreferrer">
          <div class="disc-psy-label-icon">${Icon('play')}</div>
          <div>
            <div class="disc-psy-label-name">YouTube</div>
            <div class="disc-psy-label-desc">${escHtml(desc)}</div>
          </div>
        </a>
        ${ytSearchBar()}
      </div>`;
  }
  // Brukt i LINKS.map: vanleg plattform-kort, men YouTube får søkjefelt.
  function psyLinkCard(l) {
    if (/youtube\.com|youtu\.be/i.test(l.url)) return ytFindCard(l.url, l.desc);
    return `<a class="disc-psy-label-card" href="${escHtml(l.url)}" target="_blank" rel="noopener noreferrer">
        <div class="disc-psy-label-icon">${iconForEmoji(l.emoji)}</div>
        <div>
          <div class="disc-psy-label-name">${escHtml(l.name)}</div>
          <div class="disc-psy-label-desc">${escHtml(l.desc)}</div>
        </div>
      </a>`;
  }

  // ── Genre radio storage ───────────────────────────────────────────────
  function genreRadioKey() {
    const u = Auth.current();
    return u ? `pv_disc_radios_${u.username}` : 'pv_disc_radios_guest';
  }

  function loadGenreRadios() {
    try { discGenreRadios = JSON.parse(localStorage.getItem(genreRadioKey()) || '{}'); }
    catch { discGenreRadios = {}; }
  }

  function saveGenreRadio(genre, stationId) {
    discGenreRadios[genre] = stationId;
    localStorage.setItem(genreRadioKey(), JSON.stringify(discGenreRadios));
  }

  function genreRadioStations() {
    const cats = GENRE_RADIO_CATS[activeGenre];
    if (!cats) return Radio.stations;
    return Radio.stations.filter(s => cats.includes(s.cat));
  }

  function isArtistUerfaren(track) {
    return track.artistSubscription !== 'pro';
  }

  function trackNeedsPayment(track) {
    if ((track.duration || 0) < FREE_MAX_SECONDS) return false; // under 60 min → gratis for alle
    if (!isArtistUerfaren(track)) return false;                 // Pro-artist → alltid gratis
    return true;                                                // 60 min+ → betalt
  }

  function dlPrice() {
    return MIX_PRICE_NOK; // betaling gjelder kun innhold på 60 min+
  }

  function getPaidDownloads() {
    const key = `sr_dl_paid_${Auth.current()?.username || 'guest'}`;
    try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
  }

  function markAsPaid(trackId) {
    const key     = `sr_dl_paid_${Auth.current()?.username || 'guest'}`;
    const paid    = getPaidDownloads();
    if (!paid.includes(trackId)) {
      paid.push(trackId);
      localStorage.setItem(key, JSON.stringify(paid));
    }
  }

  // ── Track loading ─────────────────────────────────────────────────────
  async function loadAllTracks() {
    const users = Auth.getAllPublicUsers();
    const results = [];
    for (const user of users) {
      if (!user.musicIds || !user.musicIds.length) continue;
      for (const mid of user.musicIds) {
        try {
          const rec = await DB.get('music', mid);
          if (!rec) continue;
          // Respekter per-spor offentlig/privat: privatmerkede spor skal IKKE
          // vises i den offentlige Discover-fanen, kun på eierens egen profil.
          if (rec.visibility === 'private') continue;
          let coverUrl = rec.coverUrl || null;
          const coverBlobId = rec.coverMediaId || rec.coverId;
          if (!coverUrl && coverBlobId) {
            coverUrl = await DB.getBlobUrl('media', coverBlobId).catch(() => null);
          }
          results.push({
            id:        mid,
            title:     rec.name     || rec.title || 'Untitled',
            artist:    rec.artist   || user.displayName,
            username:  user.username,
            genre:     (rec.genre   || 'electronic').toLowerCase(),
            duration:  rec.duration || 0,
            coverUrl,
            audioUrl:  rec.audioUrl || null,
            uploadedAt:         rec.uploadedAt || user.createdAt || Date.now(),
            isMix:              rec.isMix || false,
            artistSubscription: user.subscription || null,
          });
        } catch { /* skip */ }
      }
    }
    return results.sort((a, b) => b.uploadedAt - a.uploadedAt);
  }

  function fmtDuration(secs) {
    if (!secs) return '';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  // ── Innbakt cover-kunst (ID3 / FLAC / MP4) ────────────────────────────
  // Spor uten eige cover-bilde får forhåndsvisning frå kunsten som ligg
  // innbakt i sjølve lydfila — henta frå den opprinnelege URL-en (eller
  // den lokale blobben). Resultatet caches per spor for økta.
  const embedArtCache = new Map();

  function _beUint(u8, o, n) { let v = 0; for (let i = 0; i < n; i++) v = (v * 256) + u8[o + i]; return v; }
  function _synchsafe(u8, o) {
    return (u8[o] & 0x7f) * 0x200000 + (u8[o + 1] & 0x7f) * 0x4000
         + (u8[o + 2] & 0x7f) * 0x80 + (u8[o + 3] & 0x7f);
  }
  function _latin1(u8, o, n) { let s = ''; for (let i = 0; i < n; i++) s += String.fromCharCode(u8[o + i]); return s; }

  // ID3v2 APIC (v2.3/2.4) / PIC (v2.2)
  function _parseID3(u8) {
    const ver = u8[3], flags = u8[5];
    const size = _synchsafe(u8, 6);
    const end = Math.min(10 + size, u8.length);
    let pos = 10;
    if (flags & 0x40) { // hopp over utvida header
      if (ver === 4) pos += _synchsafe(u8, pos);
      else pos += 4 + _beUint(u8, pos, 4);
    }
    const v22 = ver === 2;
    const hdr = v22 ? 6 : 10;
    while (pos + hdr <= end) {
      let id, frameSize;
      if (v22) { id = _latin1(u8, pos, 3); frameSize = _beUint(u8, pos + 3, 3); }
      else     { id = _latin1(u8, pos, 4); frameSize = ver === 4 ? _synchsafe(u8, pos + 4) : _beUint(u8, pos + 4, 4); }
      if (!id.trim() || frameSize <= 0) break;
      const bodyStart = pos + hdr, bodyEnd = bodyStart + frameSize;
      if (bodyEnd > u8.length) break;
      if ((v22 && id === 'PIC') || (!v22 && id === 'APIC')) {
        const pic = v22 ? _parsePicV22(u8, bodyStart, bodyEnd) : _parseApic(u8, bodyStart, bodyEnd);
        if (pic) return pic;
      }
      pos = bodyEnd;
    }
    return null;
  }
  function _skipDesc(u8, p, e, enc) {
    if (enc === 1 || enc === 2) { while (p + 1 < e && !(u8[p] === 0 && u8[p + 1] === 0)) p += 2; return p + 2; }
    while (p < e && u8[p] !== 0) p++; return p + 1;
  }
  function _parseApic(u8, s, e) {
    let p = s; const enc = u8[p++];
    const mimeStart = p; while (p < e && u8[p] !== 0) p++;
    const mime = _latin1(u8, mimeStart, p - mimeStart) || 'image/jpeg';
    p++; p++; // null + picture type
    p = _skipDesc(u8, p, e, enc);
    return p < e ? { mime, bytes: u8.subarray(p, e) } : null;
  }
  function _parsePicV22(u8, s, e) {
    let p = s; const enc = u8[p++];
    const fmt = _latin1(u8, p, 3); p += 3; p++; // format + picture type
    p = _skipDesc(u8, p, e, enc);
    const mime = fmt.toUpperCase().indexOf('PNG') >= 0 ? 'image/png' : 'image/jpeg';
    return p < e ? { mime, bytes: u8.subarray(p, e) } : null;
  }

  // FLAC PICTURE metadata-blokk (type 6)
  function _parseFlac(u8) {
    let pos = 4;
    while (pos + 4 <= u8.length) {
      const header = u8[pos], last = (header & 0x80) !== 0, type = header & 0x7f;
      const len = _beUint(u8, pos + 1, 3), body = pos + 4;
      if (type === 6) {
        let p = body + 4;                       // hopp over picture type
        const mimeLen = _beUint(u8, p, 4); p += 4;
        const mime = _latin1(u8, p, mimeLen); p += mimeLen;
        const descLen = _beUint(u8, p, 4); p += 4 + descLen;
        p += 16;                                 // width/height/depth/colors
        const dataLen = _beUint(u8, p, 4); p += 4;
        return p + dataLen <= u8.length ? { mime: mime || 'image/jpeg', bytes: u8.subarray(p, p + dataLen) } : null;
      }
      if (last) break;
      pos = body + len;
    }
    return null;
  }

  // MP4/M4A 'covr' atom (inne i moov>udta>meta>ilst)
  function _parseMp4(u8) {
    const CONTAINERS = { moov: 1, udta: 1, ilst: 1, trak: 1, mdia: 1 };
    function walk(start, end) {
      let p = start;
      while (p + 8 <= end) {
        let size = _beUint(u8, p, 4); const type = _latin1(u8, p + 4, 4); let hl = 8;
        if (size === 1) { size = _beUint(u8, p + 12, 4); hl = 16; }
        else if (size === 0) size = end - p;
        const boxEnd = p + size;
        if (size < 8 || boxEnd > end) break;
        if (type === 'covr') {
          let q = p + hl;
          while (q + 8 <= boxEnd) {
            const dsize = _beUint(u8, q, 4), dtype = _latin1(u8, q + 4, 4);
            if (dtype === 'data' && dsize >= 16) {
              const dflags = _beUint(u8, q + 8, 4);
              const imgEnd = q + dsize;
              if (imgEnd <= boxEnd) {
                const mime = (dflags & 0xff) === 14 ? 'image/png' : 'image/jpeg';
                return { mime, bytes: u8.subarray(q + 16, imgEnd) };
              }
            }
            if (dsize < 8) break;
            q += dsize;
          }
        }
        if (CONTAINERS[type]) { const r = walk(p + hl, boxEnd); if (r) return r; }
        else if (type === 'meta') { const r = walk(p + hl + 4, boxEnd); if (r) return r; }
        p = boxEnd;
      }
      return null;
    }
    return walk(0, u8.length);
  }

  // Finn og parse 'moov'-boksen sjølv om den ligg midt i (eller bakerst i) ei
  // vilkårleg byte-mengde — t.d. hale-bytene av ei M4A-fil der 'moov' (med
  // 'covr'-coveret) er lagt heilt til slutt i staden for framst.
  function _findMoovAndParse(u8) {
    for (let i = 4; i + 4 <= u8.length; i++) {
      if (u8[i] === 0x6d && u8[i + 1] === 0x6f && u8[i + 2] === 0x6f && u8[i + 3] === 0x76) { // 'moov'
        const boxStart = i - 4;
        const size = _beUint(u8, boxStart, 4);
        if (size >= 8 && boxStart + size <= u8.length) {
          const r = _parseMp4(u8.subarray(boxStart));
          if (r) return r;
        }
      }
    }
    return null;
  }

  function _parseEmbeddedPicture(u8) {
    if (!u8 || u8.length < 16) return null;
    if (u8[0] === 0x49 && u8[1] === 0x44 && u8[2] === 0x33) return _parseID3(u8);   // 'ID3'
    if (u8[0] === 0x66 && u8[1] === 0x4c && u8[2] === 0x61 && u8[3] === 0x43) return _parseFlac(u8); // 'fLaC'
    if (u8[4] === 0x66 && u8[5] === 0x74 && u8[6] === 0x79 && u8[7] === 0x70) return _parseMp4(u8);  // 'ftyp'
    return null;
  }

  async function _getAudioBytes(track, maxBytes) {
    // Lokal post med rå bytes?
    try {
      const rec = await DB.get('music', track.id);
      const d = rec && rec.data;
      if (d) {
        let u8 = null;
        if (d instanceof Uint8Array) u8 = d;
        else if (d instanceof ArrayBuffer) u8 = new Uint8Array(d);
        else if (d instanceof Blob) u8 = new Uint8Array(await d.arrayBuffer());
        else if (ArrayBuffer.isView(d)) u8 = new Uint8Array(d.buffer, d.byteOffset, d.byteLength);
        if (u8) return u8; // lokalt: alle bytes er alt i minnet (maxBytes gjeld berre nettverk)
      }
    } catch { /* fall through */ }
    // Elles: hent eit avgrensa område frå den opprinnelege URL-en.
    if (!track.audioUrl) return null;
    try {
      const res = await fetch(track.audioUrl, maxBytes ? { headers: { Range: `bytes=0-${maxBytes - 1}` } } : {});
      if (!res.ok && res.status !== 206) return null;
      return new Uint8Array(await res.arrayBuffer());
    } catch { return null; }
  }

  // Hent HALE-bytene frå den opprinnelege URL-en (suffiks-range). Brukt når
  // fronten ikkje gav noko cover — typisk M4A/MP4 med 'moov' bakerst.
  async function _getAudioTailBytes(track, maxBytes) {
    if (!track.audioUrl) return null;
    try {
      const res = await fetch(track.audioUrl, { headers: { Range: `bytes=-${maxBytes}` } });
      if (!res.ok && res.status !== 206) return null;
      return new Uint8Array(await res.arrayBuffer());
    } catch { return null; }
  }

  async function extractEmbeddedArt(track) {
    if (embedArtCache.has(track.id)) return embedArtCache.get(track.id);
    let url = null;
    try {
      const bytes = await _getAudioBytes(track, 4 * 1024 * 1024);
      let pic = _parseEmbeddedPicture(bytes);
      // M4A/MP4: 'moov'-atomet (med coveret) ligg ofte heilt bakerst i fila og
      // er difor utanfor dei første 4 MB. Hent hale-bytene og let etter det.
      const isMp4Front = bytes && bytes.length >= 8 &&
        bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70; // 'ftyp'
      if ((!pic || !pic.bytes || !pic.bytes.length) && isMp4Front && track.audioUrl) {
        const tail = await _getAudioTailBytes(track, 4 * 1024 * 1024);
        if (tail) pic = _findMoovAndParse(tail) || pic;
      }
      if (pic && pic.bytes && pic.bytes.length) {
        const blob = new Blob([pic.bytes], { type: pic.mime || 'image/jpeg' });
        url = URL.createObjectURL(blob);
        persistExtractedArt(track, blob).catch(() => {}); // lagre for neste gong (brann-og-gløym)
      }
    } catch { /* ingen innbakt kunst */ }
    embedArtCache.set(track.id, url);
    return url;
  }

  // Lagre den utpakka kunsten på sjølve spor-posten, så den er umiddelbar neste
  // gong og slepp å hentast/parsast på nytt. Eigaren (med skylagring) får ein
  // varig, delbar URL; elles ein lokal blob-cache i denne nettlesaren.
  async function persistExtractedArt(track, blob) {
    let rec;
    try { rec = await DB.get('music', track.id); } catch { return; }
    if (!rec) return;                                              // ingen lokal post
    if (rec.coverUrl || rec.coverId || rec.coverMediaId) return;   // alt lagra
    const patch = {};
    const me = Auth.current();
    const isOwner = me && track.username === me.username;
    const ext = (blob.type || 'image/jpeg').indexOf('png') >= 0 ? 'png' : 'jpg';
    // Eigar + skylagring → varig, delbar URL som overlever på tvers av einingar.
    if (isOwner && typeof SC_Storage !== 'undefined' && SC_Storage.isConfigured()) {
      try {
        const file = new File([blob], `cover_${track.id}.${ext}`, { type: blob.type || 'image/jpeg' });
        const cr = await SC_Storage.upload(file, { prefix: 'covers' });
        if (cr && cr.url) { patch.coverUrl = cr.url; track.coverUrl = cr.url; }
      } catch { /* fall tilbake til lokal cache */ }
    }
    // Lokal blob-cache når vi ikkje fekk (eller ikkje skulle laste opp) ein sky-URL.
    if (!patch.coverUrl) {
      const coverId = 'cover_' + track.id;
      try { await DB.storeFile('media', coverId, blob); patch.coverId = coverId; }
      catch { return; }
    }
    try { await DB.put('music', { ...rec, ...patch }); } catch { /* stille */ }
  }

  // Fyll cover-boksane til spor utan eige bilde, med maks 4 samstundes henтingar.
  function hydrateEmbeddedArt() {
    const els = Array.from(document.querySelectorAll('.disc-track-art[data-embed-art="1"]:not([data-embed-done])'));
    if (!els.length) return;
    els.forEach(el => el.setAttribute('data-embed-done', '1'));
    let i = 0;
    const next = () => {
      if (i >= els.length) return;
      const el = els[i++];
      const track = allTracks.find(t => t.id === el.getAttribute('data-track-id'));
      const done = () => next();
      if (!track) return done();
      extractEmbeddedArt(track).then(url => {
        if (url) {
          el.style.background = 'none';
          el.style.backgroundImage = `url('${url}')`;
          el.style.backgroundSize = 'cover';
          el.style.backgroundPosition = 'center';
        }
      }).catch(() => {}).finally(done);
    };
    for (let k = 0; k < Math.min(4, els.length); k++) next();
  }

  function filteredTracks() {
    if (activeGenre === 'all') return allTracks;
    return allTracks.filter(t => t.genre.includes(activeGenre));
  }

  function filteredUsers() {
    if (activeRole === 'all') return allUsers;
    return allUsers.filter(u => (u.role || 'lytter') === activeRole);
  }

  // ── Sub-tab rendering ─────────────────────────────────────────────────
  function renderSubTabs() {
    const tabs = [
      { id: 'upload', icon: '🔼', label: 'Upload' },
      { id: 'radio',  icon: '📻', label: 'Radio favorite' },
    ];
    return `<div class="disc-sub-tab-bar" id="disc-sub-tab-bar">
      ${tabs.map(t => `
        <button class="disc-sub-tab ${activeSubTab === t.id ? 'active' : ''}"
          onclick="Discover.switchSubTab('${t.id}')">
          ${iconForEmoji(t.icon)} ${t.label}
        </button>`).join('')}
    </div>`;
  }

  function renderUploadTab() {
    const user = Auth.current();
    if (!user) return `
      <div class="disc-empty">
        <div style="font-size:3rem;margin-bottom:0.75rem">${Icon('lock')}</div>
        <p>You must <a href="#/login" style="color:#38bdf8">log in</a> to upload music.</p>
      </div>`;

    const genreOptions = GENRES.filter(g => g.tag !== 'all').map(g =>
      `<option value="${g.tag}" ${activeGenre !== 'all' && activeGenre === g.tag ? 'selected' : ''}>${iconForEmoji(g.emoji)} ${g.label}</option>`
    ).join('');

    return `
      <div class="disc-upload-panel">
        <div class="disc-upload-header">
          <div style="font-size:2.5rem;margin-bottom:0.5rem">${Icon('music')}</div>
          <h3 style="margin:0 0 0.25rem;font-size:1.15rem;font-weight:700">Upload music</h3>
          <p style="color:var(--text2);font-size:0.85rem;margin:0">Share your music with the community</p>
        </div>
        <div class="disc-upload-form" id="disc-upload-form">
          <div class="disc-upload-dropzone" id="disc-upload-dropzone"
               onclick="document.getElementById('disc-up-file').click()">
            <div class="disc-upload-dropzone-icon" id="disc-up-drop-icon">${Icon('music')}</div>
            <div class="disc-upload-dropzone-text">Click to choose an audio file</div>
            <div class="disc-upload-dropzone-sub">MP3 · WAV · FLAC · AAC · OGG · AIFF · M4A · WMA · OPUS · and all other audio formats</div>
            <span id="disc-up-filename" class="disc-upload-filename"></span>
          </div>
          <input type="file" id="disc-up-file" accept="audio/*" style="display:none"
            onchange="Discover.onUploadFileChange(this)">

          <div class="disc-up-cover-row">
            <div class="disc-up-cover-drop" id="disc-up-cover-drop"
                 onclick="document.getElementById('disc-up-cover').click()" title="Choose cover image">
              <img id="disc-up-cover-preview" class="disc-up-cover-preview" alt="" style="display:none">
              <span class="disc-up-cover-placeholder" id="disc-up-cover-placeholder">${Icon('image')}</span>
            </div>
            <div class="disc-up-cover-info">
              <div class="disc-up-cover-label">Cover image <span class="disc-up-cover-opt">(optional)</span></div>
              <div class="disc-up-cover-sub">Click to choose an image shown on the track (JPG · PNG · WEBP)</div>
            </div>
          </div>
          <input type="file" id="disc-up-cover" accept="image/*" style="display:none"
            onchange="Discover.onCoverFileChange(this)">

          <div class="disc-upload-fields">
            <div class="form-group">
              <label class="form-label">Title</label>
              <input class="form-input" id="disc-up-title" placeholder="Track name">
            </div>
            <div class="form-group">
              <label class="form-label">Artist</label>
              <input class="form-input" id="disc-up-artist"
                placeholder="${escHtml(user.displayName)}" value="${escHtml(user.displayName)}">
            </div>
            <div class="form-group">
              <label class="form-label">Genre</label>
              <select class="form-input" id="disc-up-genre">${genreOptions}</select>
            </div>
            <div class="form-group">
              <label class="form-label">Description</label>
              <textarea class="form-input" id="disc-up-desc" rows="3"
                placeholder="Describe your music — mood, inspiration, production details…"
                style="resize:vertical;min-height:72px;font-family:inherit"></textarea>
            </div>
            <div class="form-group">
              <label class="form-label">Main category <span style="color:var(--text3);font-weight:400;font-size:0.8rem">(for record-label contact)</span></label>
              <select class="form-input" id="disc-up-category" onchange="Discover.onCategoryChange(this)">
                ${MAIN_CATEGORIES.map(c => `<option value="${c.tag}">${iconForEmoji(c.emoji)} ${c.label}</option>`).join('')}
              </select>
              <div id="disc-up-cat-hint" style="font-size:0.78rem;color:var(--text2);margin-top:0.35rem;line-height:1.4">
                You can always choose a category later from your profile
              </div>
            </div>
          </div>

          <div class="disc-upload-ismix-row">
            <input type="checkbox" id="disc-up-ismix" class="disc-ismix-check">
            <label for="disc-up-ismix" class="disc-ismix-label">
              <span class="disc-ismix-icon">${Icon('sliders')}</span>
              This is a mix / DJ set
              <span class="disc-ismix-hint">— under 60 min is free to download; 60 min or more costs ${MIX_PRICE_NOK} kr</span>
            </label>
          </div>

          <button class="btn btn-primary disc-upload-submit" id="disc-up-btn"
            onclick="Discover.uploadDiscTrack()">
            ${Icon('chevron-up')} Upload
          </button>
        </div>
      </div>`;
  }

  function renderRadioFavTab() {
    const stations   = genreRadioStations();
    const savedId    = discGenreRadios[activeGenre];
    const saved      = Radio.stations.find(s => s.id === savedId);
    const genreLabel = GENRES.find(g => g.tag === activeGenre)?.label || 'All genres';
    const pickPos    = (window.PicksDrag && PicksDrag.positions()) || {};

    return `
      <div class="disc-radio-fav-wrap">
        ${saved ? `
          <div class="disc-radio-fav-current">
            <div class="disc-radio-fav-label">${Icon('star')} Your favorite station for ${escHtml(genreLabel)}</div>
            <div class="disc-radio-fav-card" style="--fav-color:${saved.color}">
              <div class="disc-radio-fav-emoji">${iconForEmoji(saved.emoji)}</div>
              <div class="disc-radio-fav-info">
                <div class="disc-radio-fav-name">${escHtml(saved.name)}</div>
                <div class="disc-radio-fav-desc">${escHtml(saved.desc)}</div>
              </div>
              <div class="disc-radio-fav-actions">
                <button class="btn btn-primary btn-sm"
                  onclick="Radio.playStation('${saved.id}')">${Icon('play')} Play</button>
                <button class="btn btn-ghost btn-sm"
                  onclick="Discover.clearGenreRadio('${activeGenre}')">${Icon('x')}</button>
              </div>
            </div>
          </div>` : `
          <div class="disc-radio-fav-empty">
            <div style="font-size:2rem;margin-bottom:0.4rem">${Icon('radio')}</div>
            <p style="color:var(--text2);font-size:0.85rem;margin:0">
              No favorite station chosen for <strong>${escHtml(genreLabel)}</strong> yet.
            </p>
          </div>`}

        <div class="disc-radio-pick-header">
          <span>${saved ? 'Switch station' : 'Choose favorite station'}</span>
          <span class="disc-section-count">${stations.length} stations</span>
        </div>

        <div class="disc-radio-pick-list">
          ${stations.map(s => {
            const pp  = pickPos[s.id];
            const ptf = pp ? `transform:translate(${pp.x}px,${pp.y}px);` : '';
            return `
            <div class="disc-radio-pick-item ${savedId === s.id ? 'active' : ''}${pp ? ' moved' : ''}"
                 data-pick-id="${s.id}"
                 style="--pick-color:${s.color};${ptf}">
              <button class="disc-radio-pick-grip" type="button" title="Drag to move (double-click = reset)"
                aria-label="Move the card" onclick="event.stopPropagation()">${Icon('grip')}</button>
              <div class="disc-radio-pick-emoji">${iconForEmoji(s.emoji)}</div>
              <div class="disc-radio-pick-info">
                <div class="disc-radio-pick-name">${escHtml(s.name)}</div>
                <div class="disc-radio-pick-desc">${escHtml(s.desc)}</div>
              </div>
              <div class="disc-radio-pick-acts">
                <button class="disc-radio-play-btn" title="Play"
                  onclick="Radio.playStation('${s.id}');event.stopPropagation()">${Icon('play')}</button>
                <button class="disc-radio-star-btn ${savedId === s.id ? 'set' : ''}"
                  title="${savedId === s.id ? 'Your favorite' : 'Set as favorite'}"
                  onclick="Discover.setDiscGenreRadio('${activeGenre}','${s.id}');event.stopPropagation()">
                  ${savedId === s.id ? '⭐' : '☆'}
                </button>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>`;
  }

  // ── Tab-katalog (én kilde til sannhet for nedtrekksmenyen) ─────────────
  // Rekkefølge = rekkefølge i menyen. `notranslate` for merkevarenavn som ikke
  // skal oversettes av Google Translate.
  const TABS = [
    { id:'music',           icon:'music',     label:'Music' },
    { id:'ultimae',         icon:'disc',      label:'Ultimae Records' },
    { id:'people',          icon:'users',     label:'Find people' },
    { id:'ambient-mann',    icon:'waves',     label:'Ambient Mann', notranslate:true },
    { id:'psybient',        icon:'leaf',      label:'Psybient Events' },
    { id:'altar-records',   icon:'home',      label:'Altar Records' },
    { id:'hadra',           icon:'star',      label:'Hadra Festival' },
    { id:'dacru',           icon:'wind',      label:'DaCru Records' },
    { id:'tip-raja',        icon:'wind',      label:'Raja Ram / T.I.P.' },
    { id:'astral',          icon:'star',      label:'Astral Projection' },
    { id:'shpongle',        icon:'sparkles',  label:'Shpongle' },
    { id:'younger-brother', icon:'atom',      label:'Younger Brother' },
    { id:'shunyata',        icon:'sparkles',  label:'Shunyata Records' },
    { id:'kukan-dub',       icon:'cloud',     label:'Kukan Dub Lagan' },
    { id:'cosmic-leaf',     icon:'leaf',      label:'Cosmic Leaf' },
    { id:'cryo-chamber',    icon:'snowflake', label:'Cryo Chamber' },
    { id:'mikelabella',     icon:'disc',      label:'MikelaBella Records' },
    { id:'gagarin-project', icon:'rocket',    label:'Gagarin Project' },
    { id:'leftfield',       icon:'moon',      label:'Leftfield Records' },
  ];
  const _tabLabel = t => t.notranslate
    ? `<span class="notranslate" translate="no">${t.label}</span>`
    : t.label;

  // ── Tab-velger: nedtrekksboks med åpne/lukke-knapp ────────────────────
  // Erstatter den gamle sidescrollande fane-stripa (folk skjønte ikke at den
  // kunne dras). Knappen viser valgt kategori; boksen lister alle vertikalt.
  function renderTabBar() {
    const cur = TABS.find(t => t.id === activeTab) || TABS[0];
    const items = TABS.map(t => `
        <button class="disc-tab-btn ${t.id === activeTab ? 'active' : ''}" type="button"
          role="menuitem" data-tab="${t.id}" onclick="Discover.switchTab('${t.id}')">
          ${Icon(t.icon)} ${_tabLabel(t)}</button>`).join('');
    return `
      <div class="disc-tab-dropdown" id="disc-tab-dropdown">
        <button class="disc-tab-toggle" id="disc-tab-toggle" type="button"
          aria-haspopup="true" aria-expanded="false" aria-label="Choose category"
          onclick="Discover.toggleTabMenu(event)">
          <span class="disc-tab-toggle-current" id="disc-tab-toggle-label">${Icon(cur.icon)} ${_tabLabel(cur)}</span>
          <span class="disc-tab-toggle-chev">${Icon('chevron-down')}</span>
        </button>
        <div class="disc-tab-menu" id="disc-tab-menu" role="menu" aria-label="Categories">
          ${items}
        </div>
      </div>`;
  }

  function getGenreCounts() {
    const counts = {};
    for (const t of allTracks) {
      const g = (t.genre || 'electronic').toLowerCase();
      counts[g] = (counts[g] || 0) + 1;
    }
    return counts;
  }

  function renderGenreTags() {
    const counts = getGenreCounts();
    return GENRES.map(g => {
      const count = g.tag === 'all' ? allTracks.length : (counts[g.tag] || 0);
      return `
        <button class="disc-genre-btn ${activeGenre === g.tag ? 'active' : ''}" data-genre="${g.tag}"
          onclick="Discover.setGenre('${g.tag}')">${iconForEmoji(g.emoji)} ${g.label}${count > 0 ? `<span class="disc-genre-count">${count}</span>` : ''}</button>
      `;
    }).join('');
  }

  // Sjanger-knappane filtrerer sporgriden, men den finst berre for innlogga brukarar
  // (og forsvinn heilt når Drone Zone er open) — så for gjester såg klikket daudt ut.
  // Denne panelet blir alltid teikna og viser radiokanalane som passar sjangeren.
  function renderGenreResult() {
    const hasGrid = !!document.getElementById('disc-track-grid');
    const tracks  = filteredTracks();
    if (hasGrid && tracks.length) return '';   // griden viser resultatet sjølv

    const label    = GENRES.find(g => g.tag === activeGenre)?.label || 'All genres';
    const emoji    = GENRES.find(g => g.tag === activeGenre)?.emoji || '🎵';
    const stations = genreRadioStations().slice(0, 6);

    return `
      <div class="disc-genre-panel">
        <div class="disc-section-header">
          <h2 class="disc-section-title">${iconForEmoji(emoji)} ${escHtml(label)} on SiriusFM</h2>
          <span class="disc-section-count">${stations.length} stations</span>
        </div>
        <p class="disc-genre-panel-sub">
          ${tracks.length
            ? `${tracks.length} community track${tracks.length === 1 ? '' : 's'} — <a href="#/login">log in</a> to listen. Meanwhile: radio that fits ${escHtml(label)}.`
            : `No community tracks in this genre yet — here is radio that fits ${escHtml(label)}.`}
        </p>
        ${stations.length ? `
          <div class="disc-genre-panel-list">
            ${stations.map(s => `
              <div class="disc-radio-widget-item" onclick="Radio.playStation('${s.id}')">
                <div class="disc-radio-widget-emoji">${iconForEmoji(s.emoji)}</div>
                <div class="disc-radio-widget-info">
                  <div class="disc-radio-widget-name">${escHtml(s.name)}</div>
                  <div class="disc-radio-widget-desc">${escHtml(s.desc)}</div>
                </div>
                <button class="disc-radio-widget-play" title="Play"
                  onclick="Radio.playStation('${s.id}');event.stopPropagation()">${Icon('play')}</button>
              </div>`).join('')}
          </div>` : ''}
        <div class="disc-genre-panel-acts">
          ${activeGenre === 'drone'
            ? `<button class="btn btn-primary btn-sm" onclick="Discover.openDroneZone()">${Icon('radio')} Open Drone Zone</button>` : ''}
        </div>
      </div>`;
  }

  function renderGenreRadioWidget() {
    const cats    = GENRE_RADIO_CATS[activeGenre];
    const stations = cats
      ? Radio.stations.filter(s => cats.includes(s.cat)).slice(0, 3)
      : Radio.stations.filter(s => s.featured).concat(Radio.stations.slice(0, 2)).slice(0, 3);
    if (!stations.length) return '';
    const genreLabel = GENRES.find(g => g.tag === activeGenre)?.label || 'All genres';
    return `
      <div class="disc-sidebar-title">${Icon('radio')} Radio — ${escHtml(genreLabel)}</div>
      ${stations.map(s => `
        <div class="disc-radio-widget-item" onclick="Radio.playStation('${s.id}')">
          <div class="disc-radio-widget-emoji">${iconForEmoji(s.emoji)}</div>
          <div class="disc-radio-widget-info">
            <div class="disc-radio-widget-name">${escHtml(s.name)}</div>
            <div class="disc-radio-widget-desc">${escHtml(s.desc)}</div>
          </div>
          <button class="disc-radio-widget-play" title="Play" onclick="Radio.playStation('${s.id}');event.stopPropagation()">${Icon('play')}</button>
        </div>
      `).join('')}
      <a class="disc-radio-more-link" onclick="Router.go('/radio');event.preventDefault()">See all stations ${Icon('arrow-right')}</a>
    `;
  }

  function renderRoleTags() {
    return ROLES.map(r => `
      <button class="disc-genre-btn ${activeRole === r.tag ? 'active' : ''}"
        onclick="Discover.setRole('${r.tag}')">${iconForEmoji(r.emoji)} ${r.label}</button>
    `).join('');
  }

  // ── Track & people grids ──────────────────────────────────────────────
  function renderTrackGrid(tracks) {
    if (!tracks.length) {
      return `<div class="disc-empty">
        <div style="font-size:3rem;margin-bottom:0.75rem">${Icon('music')}</div>
        <p>No tracks found in this genre yet.<br>
        Go to the <strong>Upload</strong> tab to post music.</p>
      </div>`;
    }
    return tracks.map(t => {
      const uerfaren  = isArtistUerfaren(t);
      const isPaid    = getPaidDownloads().includes(t.id);
      const needsPay  = !isPaid && trackNeedsPayment(t);
      const priceBadge = uerfaren && !isPaid
        ? `<span class="disc-price-badge ${needsPay ? 'disc-price-badge--locked' : 'disc-price-badge--free'}">
             ${needsPay ? `${Icon('lock')} ${dlPrice(t)} kr` : `${Icon('check')} Free`}
           </span>`
        : `<span class="disc-price-badge disc-price-badge--pro">${Icon('star')} Pro</span>`;
      return `
        <div class="disc-track-card" onclick="Discover.playTrack('${escHtml(t.id)}')">
          <div class="disc-track-art" ${t.coverUrl
            ? `style="background-image:url('${t.coverUrl}');background-size:cover;background-position:center"`
            : `style="background:linear-gradient(135deg,#22c55e,#16a34a)" data-embed-art="1" data-track-id="${escHtml(t.id)}"`}>
            <button class="disc-play-btn"
              onclick="Discover.playTrack('${escHtml(t.id)}');event.stopPropagation()">${Icon('play')}</button>
            ${t.duration ? `<span class="disc-track-dur">${fmtDuration(t.duration)}</span>` : ''}
            ${t.isMix ? '<span class="disc-mix-badge">MIX</span>' : ''}
          </div>
          <div class="disc-track-body">
            <div class="disc-track-title">${escHtml(t.title)}</div>
            <a class="disc-track-artist" href="#/u/${escHtml(t.username)}"
              onclick="event.stopPropagation()">${escHtml(t.artist)}</a>
            <div class="disc-track-meta">
              <div style="display:flex;flex-direction:column;gap:0.2rem">
                <span class="disc-genre-tag">${escHtml(t.genre)}</span>
                ${priceBadge}
              </div>
              <div style="display:flex;gap:0.25rem;align-items:center">
                <button class="disc-download-btn" title="Download"
                  onclick="Discover.downloadTrack('${escHtml(t.id)}');event.stopPropagation()">${Icon('download')}</button>
                <button class="disc-wishlist-btn" title="Wishlist"
                  onclick="Discover.wishlist('${escHtml(t.id)}');event.stopPropagation()">${Icon('heart')}</button>
              </div>
            </div>
          </div>
        </div>`;
    }).join('');
  }

  function renderPeopleGrid(users) {
    if (!users.length) {
      return `<div class="disc-empty">
        <div style="font-size:3rem;margin-bottom:0.75rem">${Icon('users')}</div>
        <p>No users in this category yet.</p>
      </div>`;
    }
    return `<div class="disc-people-grid" id="disc-people-grid">
      ${users.map(u => {
        const t  = u.theme || {};
        const bg = t.bgType === 'gradient'
          ? (t.bgGradient || 'linear-gradient(135deg,#22c55e,#16a34a)')
          : `linear-gradient(135deg,${t.primaryColor || '#22c55e'},${t.secondaryColor || '#2563eb'})`;
        const roleLabel = ROLE_LABEL[u.role || 'lytter'] || '🎧 Listener';
        return `
          <a class="disc-people-card hover-lift" href="#/u/${escHtml(u.username)}">
            <div class="disc-people-banner" style="background:${bg}" data-banner-user="${escHtml(u.username)}">
              <div class="disc-people-avatar" style="background:${bg}" id="disc-pav-${escHtml(u.username)}" data-av-user="${escHtml(u.username)}">
                ${escHtml(u.displayName.charAt(0).toUpperCase())}
              </div>
            </div>
            <div class="disc-people-body">
              <div class="disc-people-name">${escHtml(u.displayName)}</div>
              <div class="disc-people-username">@${escHtml(u.username)}</div>
              <span class="disc-people-role-badge">${roleLabel}</span>
              ${u.bio ? `<div class="disc-people-bio">${escHtml(u.bio.slice(0,80))}${u.bio.length>80?'…':''}</div>` : ''}
              ${window.Social ? `<div class="disc-people-friend">${Social.friendBtn(u.username)}</div>` : ''}
            </div>
          </a>`;
      }).join('')}
    </div>`;
  }

  function renderActivity(tracks) {
    const recent = (tracks || []).slice(0, 8);
    if (!recent.length) {
      return `<div class="disc-activity-empty">No uploads yet — be the first ${Icon('music')}</div>`;
    }
    return recent.map(t => `
      <div class="disc-activity-item">
        <div class="disc-activity-avatar">${escHtml((t.username || '?').charAt(0).toUpperCase())}</div>
        <div class="disc-activity-text">
          <span class="disc-activity-user">@${escHtml(t.username)}</span>
          uploaded
          <span class="disc-activity-track">${escHtml(t.title)}</span>
        </div>
        <div class="disc-activity-ago">${timeAgo(t.uploadedAt)}</div>
      </div>
    `).join('');
  }

  // ── Main render ───────────────────────────────────────────────────────
  async function render() {
    const app = document.getElementById('app');
    app.innerHTML = `<div class="disc-page"><div class="page-loading"><div class="spinner"></div></div></div>`;

    loadGenreRadios();
    allTracks = await loadAllTracks();
    allUsers  = Auth.getAllPublicUsers().sort((a, b) => b.createdAt - a.createdAt);

    const isAuthed       = !!Auth.current();  // gjester ser ikke innloggings-låste seksjoner

    app.innerHTML = `
      <div class="disc-page" id="disc-page">

        <!-- HERO -->
        <div class="disc-hero">
          <div class="disc-hero-glow"></div>
          <div class="disc-hero-content">
            <div class="disc-hero-badge">${Icon('music')} Discovery</div>
            <h1 class="disc-hero-title">Discover</h1>
            <p class="disc-hero-sub">Explore music and connect across the community.</p>
          </div>
        </div>

        <!-- TAB BAR (Musikk | Finn folk) -->
        ${renderTabBar()}

        <!-- MUSIC TAB -->
        <div id="disc-music-tab">
          <!-- GENRE TAGS -->
          <div class="disc-genre-bar" id="disc-genre-bar">
            ${renderGenreTags()}
          </div>

          <!-- SUB-TABS (Spor | Last opp | Radio-favoritt) -->
          ${renderSubTabs()}

          <div class="disc-layout">
            <div class="disc-main">

              <!-- SPOR sub-tab -->
              <div id="disc-tracks-content" ${activeSubTab !== 'tracks' ? 'class="hidden"' : ''}>
                ${isAuthed ? `
                <div class="disc-section-header">
                  <h2 class="disc-section-title">New releases</h2>
                  <span class="disc-section-count" id="disc-count">${filteredTracks().length} tracks</span>
                </div>
                <div class="disc-track-grid" id="disc-track-grid">
                  ${renderTrackGrid(filteredTracks())}
                </div>` : ''}
                <div id="disc-genre-result">${isAuthed && filteredTracks().length ? '' : renderGenreResult()}</div>
                ${!allTracks.length ? `
                <div class="disc-editorial">
                  <div class="disc-section-header" style="margin-top:2rem">
                    <h2 class="disc-section-title">Featured from SiriusFM</h2>
                  </div>
                  <div class="disc-editorial-grid">${editorialCards()}</div>
                </div>` : ''}
              </div>

              <!-- LAST OPP sub-tab -->
              <div id="disc-upload-content" ${activeSubTab !== 'upload' ? 'class="hidden"' : ''}>
                ${activeSubTab === 'upload' ? renderUploadTab() : ''}
              </div>

              <!-- RADIO-FAVORITT sub-tab -->
              <div id="disc-radio-content" ${activeSubTab !== 'radio' ? 'class="hidden"' : ''}>
                ${activeSubTab === 'radio' ? renderRadioFavTab() : ''}
              </div>

            </div>

            <div class="disc-sidebar">
              <div class="disc-sidebar-card">
                <div class="disc-sidebar-title">
                  <span class="disc-live-dot"></span> Live activity
                </div>
                <div class="disc-activity-feed" id="disc-activity-feed">
                  ${renderActivity(allTracks)}
                </div>
              </div>

              <div class="disc-sidebar-card" id="disc-genre-radio-wrap">
                ${renderGenreRadioWidget()}
              </div>

              <div class="disc-sidebar-card">
                <div class="disc-sidebar-title">${Icon('tag')} Genres</div>
                <div class="disc-tag-cloud">
                  ${GENRES.filter(g => g.tag !== 'all').map(g => {
                    const counts = getGenreCounts();
                    const count = counts[g.tag] || 0;
                    return `<button class="disc-tag-pill ${activeGenre === g.tag ? 'active' : ''}" data-genre="${g.tag}"
                      onclick="Discover.setGenre('${g.tag}')">${iconForEmoji(g.emoji)} ${g.label}${count > 0 ? `<span class="disc-genre-count">${count}</span>` : ''}</button>`;
                  }).join('')}
                </div>
              </div>

              ${isAuthed ? `
              <div class="disc-sidebar-card">
                <div class="disc-sidebar-title">${Icon('link')} Useful links</div>
                <div class="disc-useful-links">
                  <a class="disc-useful-link" href="https://feedfreq.com/" target="_blank" rel="noopener noreferrer">feedfreq.com</a>
                  <a class="disc-useful-link" href="https://bigfreq.com/" target="_blank" rel="noopener noreferrer">bigfreq.com</a>
                  <a class="disc-useful-link" href="https://pulseticketing.com/" target="_blank" rel="noopener noreferrer">pulseticketing.com</a>
                  <a class="disc-useful-link" href="https://electreelife.com/" target="_blank" rel="noopener noreferrer">electreelife.com</a>
                  <a class="disc-useful-link" href="https://cyblinks.com/" target="_blank" rel="noopener noreferrer">cyblinks.com</a>
                  <a class="disc-useful-link" href="https://triniq.com/" target="_blank" rel="noopener noreferrer">triniq.com</a>
                  <a class="disc-useful-link" href="https://trancentral.tv/" target="_blank" rel="noopener noreferrer">trancentral.tv</a>
                  <a class="disc-useful-link" href="https://www.psybient.org/" target="_blank" rel="noopener noreferrer">psybient.org</a>
                  <a class="disc-useful-link" href="https://cosmicleaf.gr/" target="_blank" rel="noopener noreferrer">cosmicleaf.gr</a>
                </div>
              </div>` : ''}
            </div>
          </div>
        </div>

        <!-- PEOPLE TAB (hidden by default) -->
        <div id="disc-people-tab" class="hidden">
          <div class="disc-genre-bar" id="disc-role-bar">
            ${renderRoleTags()}
          </div>
          <div class="disc-layout">
            <div class="disc-main" style="grid-column:1/-1">
              <div class="disc-section-header">
                <h2 class="disc-section-title">Find people in the music community</h2>
                <span class="disc-section-count" id="disc-people-count">${filteredUsers().length} users</span>
              </div>
              <div id="disc-people-wrap">
                ${renderPeopleGrid(filteredUsers())}
              </div>
            </div>
          </div>
        </div>

        <!-- AMBIENT MANN TAB (hidden by default) -->
        <div id="disc-ambient-mann-tab" class="hidden">
          ${renderAmbientMannTab()}
        </div>

        <!-- PSYBIENT EVENTS TAB (hidden by default) -->
        <div id="disc-psybient-tab" class="hidden">
          ${renderPsybientTab()}
          ${renderWeeklyMix('psybient')}
        </div>

        <!-- ALTAR RECORDS TAB (hidden by default) -->
        <div id="disc-altar-records-tab" class="hidden">
          ${renderAltarRecordsTab()}
          ${renderWeeklyMix('altar-records')}
        </div>

        <!-- HADRA FESTIVAL TAB (hidden by default) -->
        <div id="disc-hadra-tab" class="hidden">
          ${renderHadraTab()}
          ${renderWeeklyMix('hadra')}
        </div>

        <!-- DACRU RECORDS TAB (hidden by default) -->
        <div id="disc-dacru-tab" class="hidden">
          ${renderDacruTab()}
          ${renderWeeklyMix('dacru')}
        </div>

        <!-- RAJA RAM / TIP RECORDS TAB (hidden by default) -->
        <div id="disc-tip-raja-tab" class="hidden">
          ${renderTipRajaTab()}
          ${renderWeeklyMix('tip-raja')}
        </div>

        <!-- ASTRAL PROJECTION TAB (hidden by default) -->
        <div id="disc-astral-tab" class="hidden">
          ${renderAstralTab()}
          ${renderWeeklyMix('astral')}
        </div>

        <!-- SHPONGLE TAB (hidden by default) -->
        <div id="disc-shpongle-tab" class="hidden">
          ${renderShpongleTab()}
          ${renderWeeklyMix('shpongle')}
        </div>

        <!-- YOUNGER BROTHER TAB (hidden by default) -->
        <div id="disc-younger-brother-tab" class="hidden">
          ${renderYoungerBrotherTab()}
          ${renderWeeklyMix('younger-brother')}
        </div>

        <!-- SHUNYATA RECORDS TAB (hidden by default) -->
        <div id="disc-shunyata-tab" class="hidden">
          ${renderShunyataTab()}
          ${renderWeeklyMix('shunyata')}
        </div>

        <!-- KUKAN DUB LAGAN TAB (hidden by default) -->
        <div id="disc-kukan-dub-tab" class="hidden">
          ${renderKukanDubTab()}
          ${renderWeeklyMix('kukan-dub')}
        </div>

        <!-- COSMIC LEAF TAB (hidden by default) -->
        <div id="disc-cosmic-leaf-tab" class="hidden">
          ${renderCosmicLeafTab()}
          ${renderWeeklyMix('cosmic-leaf')}
        </div>

        <!-- CRYO CHAMBER TAB (hidden by default) -->
        <div id="disc-cryo-chamber-tab" class="hidden">
          ${renderCryoChamberTab()}
        </div>

        <!-- ULTIMAE RECORDS TAB (hidden by default) -->
        <div id="disc-ultimae-tab" class="hidden">
          ${renderUltimaeTab()}
        </div>

        <!-- MIKELABELLA RECORDS TAB (hidden by default) -->
        <div id="disc-mikelabella-tab" class="hidden">
          ${renderMikelaBellaTab()}
        </div>

        <!-- GAGARIN PROJECT TAB (hidden by default) -->
        <div id="disc-gagarin-project-tab" class="hidden">
          ${renderGagarinProjectTab()}
          ${renderWeeklyMix('gagarin-project')}
        </div>

        <!-- LEFTFIELD RECORDS TAB (hidden by default) -->
        <div id="disc-leftfield-tab" class="hidden">
          ${renderLeftfieldTab()}
        </div>

      </div>`;

    startActivityScroll();
    loadPeopleAvatars(allUsers);
    hydrateEmbeddedArt();
  }

  // ── Tab-velger: åpne/lukke nedtrekksboksen ────────────────────────────
  function toggleTabMenu(e) {
    if (e) e.stopPropagation();
    const dd = document.getElementById('disc-tab-dropdown');
    if (!dd) return;
    dd.classList.contains('open') ? closeTabMenu() : openTabMenu();
  }
  function openTabMenu() {
    const dd = document.getElementById('disc-tab-dropdown');
    if (!dd) return;
    dd.classList.add('open');
    document.getElementById('disc-tab-toggle')?.setAttribute('aria-expanded', 'true');
    // Bind etter denne klikk-runden så åpnings-klikket ikke straks lukker igjen.
    setTimeout(() => {
      document.addEventListener('click', _tabMenuOutside, true);
      document.addEventListener('keydown', _tabMenuKey);
    }, 0);
  }
  function closeTabMenu() {
    const dd = document.getElementById('disc-tab-dropdown');
    if (dd) dd.classList.remove('open');
    document.getElementById('disc-tab-toggle')?.setAttribute('aria-expanded', 'false');
    document.removeEventListener('click', _tabMenuOutside, true);
    document.removeEventListener('keydown', _tabMenuKey);
  }
  function _tabMenuOutside(e) {
    const dd = document.getElementById('disc-tab-dropdown');
    if (dd && !dd.contains(e.target)) closeTabMenu();
  }
  function _tabMenuKey(e) { if (e.key === 'Escape') closeTabMenu(); }

  function renderAmbientMannTab() {
    const TAGS = [
      { label: 'Psychill',      emoji: '🧠' },
      { label: 'Downtempo',     emoji: '🌊' },
      { label: 'Experimental',  emoji: '🧪' },
    ];
    const ytId = AMBIENT_MANN_MIX;
    return `
      <div class="disc-psy-banner" style="background:linear-gradient(135deg,#0f2027,#203a43,#2c5364)">
        <div class="disc-psy-banner-emoji">${Icon('waves')}</div>
        <div>
          <div class="disc-psy-banner-title"><span class="notranslate" translate="no">Ambient Mann</span></div>
          <div class="disc-psy-banner-sub">Psychill · Downtempo · Experimental — atmospheric electronica from the underground</div>
        </div>
      </div>

      <div class="disc-psy-section">
        <div class="disc-psy-section-hdr">
          <span class="disc-psy-section-icon">${Icon('music')}</span>
          <span class="disc-psy-section-title">The podcast</span>
          <span class="disc-psy-section-badge">www.ambientmann.com</span>
        </div>
        <div class="disc-psy-label-grid" style="grid-template-columns:1fr">
          <a class="disc-psy-label-card" href="https://www.ambientmann.com/" target="_blank" rel="noopener noreferrer"
             style="gap:1.2rem;align-items:flex-start">
            <div class="disc-psy-label-icon" style="font-size:2.5rem">${Icon('waves')}</div>
            <div style="flex:1">
              <div class="disc-psy-label-name" style="font-size:1.1rem;margin-bottom:0.35rem"><span class="notranslate" translate="no">Ambient Mann</span></div>
              <div class="disc-psy-label-desc" style="line-height:1.6">
                Deep, droning and atmospheric electronica at the intersection of psychill,
                downtempo and experimental electronica. Explore the full Podcast Series at www.ambientmann.com.
              </div>
              <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:0.75rem">
                ${TAGS.map(t => `<span class="disc-psy-section-badge">${iconForEmoji(t.emoji)} ${t.label}</span>`).join('')}
              </div>
            </div>
            <span class="disc-psy-mix-arrow" style="align-self:center">${Icon('arrow-right')}</span>
          </a>
        </div>
      </div>

      <div class="disc-psy-section">
        <div class="disc-psy-section-hdr">
          <span class="disc-psy-section-icon">${Icon('radio')}</span>
          <span class="disc-psy-section-title">Radio Podcast &amp; search</span>
          <span class="disc-psy-section-badge">YouTube</span>
        </div>
        <form class="yt-search disc-am-yt-form" onsubmit="return Discover.ambientYtSearch(event)">
          <span class="yt-search-icon">${Icon('search')}</span>
          <input type="search" class="yt-search-input" id="disc-am-yt-q"
                 placeholder="Search and switch track — plays here on SiriusFM…" aria-label="Search on YouTube">
          <button class="yt-search-btn" type="submit" title="Search on YouTube">${Icon('arrow-right')}</button>
        </form>
        <div id="disc-am-yt-player" data-mix="${ytId}">
          <iframe class="hr-yt-embed" src="https://www.youtube.com/embed/${ytId}?list=RD${ytId}" allow="autoplay; encrypted-media" allowfullscreen></iframe>
        </div>
        <div id="disc-am-yt-results" class="disc-psy-mix-grid"></div>
      </div>

      <div class="disc-psy-section">
        <div class="disc-psy-section-hdr">
          <span class="disc-psy-section-icon">${Icon('tag')}</span>
          <span class="disc-psy-section-title">Genres</span>
        </div>
        <div class="disc-psy-label-grid">
          <a class="disc-psy-label-card" href="https://bandcamp.com/tag/psychill" target="_blank" rel="noopener noreferrer">
            <div class="disc-psy-label-icon">${Icon('lightbulb')}</div>
            <div>
              <div class="disc-psy-label-name">Psychill / Bandcamp</div>
              <div class="disc-psy-label-desc">All releases tagged psychill</div>
            </div>
          </a>
          <a class="disc-psy-label-card" href="https://bandcamp.com/tag/downtempo" target="_blank" rel="noopener noreferrer">
            <div class="disc-psy-label-icon">${Icon('waves')}</div>
            <div>
              <div class="disc-psy-label-name">Downtempo / Bandcamp</div>
              <div class="disc-psy-label-desc">Slow, hypnotic electronica</div>
            </div>
          </a>
          <a class="disc-psy-label-card" href="https://bandcamp.com/tag/experimental" target="_blank" rel="noopener noreferrer">
            <div class="disc-psy-label-icon">${Icon('flask')}</div>
            <div>
              <div class="disc-psy-label-name">Experimental / Bandcamp</div>
              <div class="disc-psy-label-desc">Boundary-pushing experimental electronica</div>
            </div>
          </a>
        </div>
      </div>
    `;
  }

  function renderPsybientTab() {
    const EVENTS = [
      {
        day: 'Jul',
        month: '2026',
        name: 'ZNA Gathering',
        loc: 'Portugal 🇵🇹',
        tags: ['Psybient', 'Chillout', 'Peninsula Stage'],
        url: 'https://www.psybient.org/love/zna-portugal/',
        website: 'https://znagathering.com/',
      },
      {
        day: 'Summer',
        month: '2026',
        name: 'Gaia Beats',
        loc: 'Thailand 🇹🇭',
        tags: ['Psybient', 'Downtempo', 'Psytrance'],
        url: 'https://www.psybient.org/love/trance-festivals-list-calendar/',
        website: null,
      },
      {
        day: 'Jul',
        month: '2026',
        name: 'S.U.N. Festival',
        loc: 'Hungary 🇭🇺',
        tags: ['Psytrance', 'Ambient', 'Community'],
        url: 'https://www.psybient.org/love/trance-festivals-list-calendar/',
        website: 'https://sunfestival.org/',
      },
      {
        day: 'Jun 25',
        month: '2025',
        name: '7Chakras Festival',
        loc: 'Tuscania (VT), Italy 🇮🇹',
        tags: ['Psytrance', 'Psybient', 'Healing'],
        url: 'https://www.psybient.org/love/7chakras-festival-italy/',
        website: null,
      },
      {
        day: 'Jun',
        month: '2025',
        name: 'Psy-Fi Festival',
        loc: 'Netherlands 🇳🇱',
        tags: ['Psytrance', 'Workshops', 'Art'],
        url: 'https://www.psybient.org/love/psy-fi-2025-netherlands/',
        website: 'https://www.psy-fi.nl/',
      },
      {
        day: 'Summer',
        month: '2025',
        name: 'Psychedelicious',
        loc: 'Czech Republic 🇨🇿',
        tags: ['Psytrance', 'Psychedelic', 'Community'],
        url: 'https://www.psybient.org/love/psychedelicious/',
        website: null,
      },
      {
        day: 'New Year',
        month: '2025/26',
        name: 'Sola Luna Festival',
        loc: 'Thailand 🇹🇭 — beach',
        tags: ['Beach Psy', 'Ambient', 'New Year'],
        url: 'https://www.psybient.org/love/sola-luna-festival-thailand/',
        website: null,
      },
    ];

    const RESOURCES = [
      { emoji: '📅', name: 'Psybient Festival Calendar', desc: 'Full list of 500+ festivals since 2011', url: 'https://www.psybient.org/love/trance-festivals-list-calendar/' },
      { emoji: '🌿', name: 'Psybient Calendar', desc: 'Chill & transformational festivals globally', url: 'https://www.psybient.org/love/psybient-calendar/' },
      { emoji: '🎵', name: 'Events category', desc: 'Articles and reviews of upcoming events', url: 'https://www.psybient.org/love/category/events/' },
      { emoji: '🌐', name: 'Goabase', desc: 'Search for psytrance and psybient events', url: 'https://www.goabase.net/' },
      { emoji: '📍', name: 'iT Athens', desc: 'Goa/Psytrance club in Athens 🇬🇷 — events & nightlife', url: 'https://www.facebook.com/itathensofficialpage' },
    ];

    return `
      <div class="disc-psy-banner" style="background:linear-gradient(135deg,#0a1628,#1a3a2a,#0d2b1e)">
        <div class="disc-psy-banner-emoji">${Icon('leaf')}</div>
        <div>
          <div class="disc-psy-banner-title">Psybient.org Events</div>
          <div class="disc-psy-banner-sub">Festivals and gatherings from the psybient, psytrance and transformational scene — curated by <a href="https://www.psybient.org/" target="_blank" rel="noopener noreferrer" style="color:inherit;opacity:0.8">psybient.org</a></div>
        </div>
      </div>

      <div class="disc-psy-section">
        <div class="disc-psy-section-hdr">
          <span class="disc-psy-section-icon">${Icon('star')}</span>
          <span class="disc-psy-section-title">Upcoming festivals 2025–2026</span>
          <span class="disc-psy-section-badge">psybient.org</span>
        </div>
        <div class="disc-psy-festival-list">
          ${EVENTS.map(f => `
            <a class="disc-psy-festival-card" href="${escHtml(f.url)}" target="_blank" rel="noopener noreferrer">
              <div class="disc-psy-festival-date">
                <div class="disc-psy-festival-date-day">${escHtml(f.day)}</div>
                <div class="disc-psy-festival-date-mon">${escHtml(f.month)}</div>
              </div>
              <div class="disc-psy-festival-body">
                <div class="disc-psy-festival-name">${escHtml(f.name)}</div>
                <div class="disc-psy-festival-loc">${f.loc}</div>
                <div class="disc-psy-festival-tags">
                  <span class="disc-psy-festival-tag disc-psy-festival-upcoming">Upcoming</span>
                  ${f.tags.map(t => `<span class="disc-psy-festival-tag">${escHtml(t)}</span>`).join('')}
                </div>
              </div>
              <span class="disc-psy-festival-arrow">${Icon('arrow-right')}</span>
            </a>
          `).join('')}
        </div>
        <a class="disc-psy-cal-link" href="https://www.psybient.org/love/trance-festivals-list-calendar/" target="_blank" rel="noopener noreferrer">
          See the full festival calendar at psybient.org ${Icon('arrow-right')}
        </a>
      </div>

      <div class="disc-psy-section">
        <div class="disc-psy-section-hdr">
          <span class="disc-psy-section-icon">${Icon('link')}</span>
          <span class="disc-psy-section-title">Resources from psybient.org</span>
          <span class="disc-psy-section-badge">Calendar & more</span>
        </div>
        <div class="disc-psy-label-grid">
          ${RESOURCES.map(r => `
            <a class="disc-psy-label-card" href="${escHtml(r.url)}" target="_blank" rel="noopener noreferrer">
              <div class="disc-psy-label-icon">${iconForEmoji(r.emoji)}</div>
              <div>
                <div class="disc-psy-label-name">${escHtml(r.name)}</div>
                <div class="disc-psy-label-desc">${escHtml(r.desc)}</div>
              </div>
            </a>
          `).join('')}
        </div>
      </div>
    `;
  }

  function renderAltarRecordsTab() {
    const ARTISTS = [
      { icon: '🌊', name: 'Astral Waves',      genres: 'Psychill · Ambient · Trance · Cinematic' },
      { icon: '🧘', name: 'Asura',              genres: 'Psychill · Ambient · Trance' },
      { icon: '✨', name: 'E-Mantra',           genres: 'Psychill · Ambient · Goachill' },
      { icon: '🌿', name: 'Suduaya',            genres: 'Psychill · Ambient · Progressive' },
      { icon: '🔵', name: 'Androcell',          genres: 'Psychill · Ambient · Dub' },
      { icon: '🚀', name: 'Astropilot',         genres: 'Psychill · Ambient · Cinematic' },
      { icon: '🌲', name: 'Alwoods',            genres: 'Psychill · Downtempo' },
      { icon: '☁️', name: "Lab's Cloud",        genres: 'Downtempo · Ambient' },
      { icon: '🌀', name: 'Dimension 5',        genres: 'Goatrance' },
      { icon: '🌙', name: 'Cabeiri',            genres: 'Psychill · Downtempo' },
      { icon: '🎵', name: 'Argus',              genres: 'Psychill · Ambient · Trance' },
      { icon: '🌕', name: 'Moon Tripper',       genres: 'Psytrance · Downtempo · Psychill' },
      { icon: '🥁', name: 'Dhamika',            genres: 'Psychill' },
      { icon: '🌸', name: 'Dreaming Cooper',    genres: 'Psychill · Ambient · Trance' },
      { icon: '🎶', name: 'Elea',               genres: 'Psychill · Ambient · Trance' },
      { icon: '🌊', name: 'Hoova',              genres: 'Psychill · Ambient · Downtempo' },
      { icon: '🎼', name: 'I.M.D',              genres: 'Psychill · Ambient · Trance' },
      { icon: '🌺', name: 'Lydia',              genres: 'Psychill · Ambient · Downtempo' },
      { icon: '🌍', name: 'Ra',                 genres: 'Goachill · Ambient · Downtempo' },
      { icon: '🌟', name: 'Profondita',         genres: 'Progressive Chill' },
      { icon: '🎛️', name: 'DJ Zen',             genres: 'Techno · Label Manager · DJ' },
      { icon: '🔮', name: 'Akshan',             genres: 'Progressive Chill · Downtempo' },
      { icon: '🌑', name: 'Mobitex',            genres: 'Psychill · Progressive Chill' },
      { icon: '🎷', name: 'Red Sun Rising',     genres: 'Psychill · Ambient · Trance' },
      { icon: '🌀', name: 'Zymosis',            genres: 'Psychill · Ambient · Breaks' },
      { icon: '💫', name: 'prah-ladji',         genres: 'Chill-Out · Downtempo · Ecstatic Dance' },
    ];

    const SUBLABELS = [
      { emoji: '🍁', name: 'Altar Records Canada',          desc: 'Downtempo Electronica · Psychill — Canadian branch' },
      { emoji: '🇪🇺', name: 'Altar Records Europe',         desc: 'Downtempo Electronica · Psychill — European division' },
      { emoji: '🥁', name: 'Altar Organic — Tribal/Shamanic', desc: 'Ritual Beats · organic and shamanic rhythms' },
      { emoji: '🌀', name: 'Altar Progressive',             desc: 'Progressive Trance · Psytrance — energetic and evolving' },
      { emoji: '⚡', name: 'Altar Techno',                  desc: 'Techno · Electro · Tech-Trance' },
      { emoji: '🧘', name: 'Altar Relax',                   desc: 'Meditative · Yoga · Chill-Out — music for the soul' },
      { emoji: '📖', name: 'Altar Relax Lo-Fi',             desc: 'Lo-Fi · Lounge — music for study and concentration' },
      { emoji: '🌌', name: 'Dark Ambient / Space Electronica', desc: 'Cinematic music — coming soon', comingSoon: true },
    ];

    const LINKS = [
      { emoji: '🌐', name: 'altar-records.com',  desc: 'Official website — artists, releases, samples and mastering', url: 'https://www.altar-records.com/' },
      { emoji: '🎵', name: 'Bandcamp',            desc: 'Support the artists directly — buy and stream',                         url: 'https://altar.bandcamp.com/' },
      { emoji: '🎧', name: 'Spotify',             desc: 'Playlists and albums on Spotify',                                  url: 'https://open.spotify.com/user/altarrecords' },
      { emoji: '▶',  name: 'YouTube',             desc: 'Videos, sets and music videos',                                   url: 'https://www.youtube.com/c/AltarRecords' },
      { emoji: 'f',  name: 'Facebook',            desc: 'News and releases',                                           url: 'https://www.facebook.com/AltarRecords' },
      { emoji: '📸', name: 'Instagram',           desc: 'Photos, artwork and updates',                                url: 'https://www.instagram.com/altar_records/' },
    ];

    return `
      <div class="disc-psy-banner" style="background:linear-gradient(135deg,#0d1f17,#1a3a2a,#102518)">
        <div class="disc-psy-banner-emoji">${Icon('home')}</div>
        <div>
          <div class="disc-psy-banner-title">Altar Records</div>
          <div class="disc-psy-banner-sub">Psychill · Downtempo · Ambient — the purest frequencies of Zen, Trance and Spirit</div>
        </div>
      </div>

      <div class="disc-psy-section">
        <div class="disc-psy-section-hdr">
          <span class="disc-psy-section-icon">${Icon('tag')}</span>
          <span class="disc-psy-section-title">About the label</span>
          <span class="disc-psy-section-badge">altar-records.com</span>
        </div>
        <div class="disc-psy-label-grid" style="grid-template-columns:1fr">
          <a class="disc-psy-label-card" href="https://www.altar-records.com/" target="_blank" rel="noopener noreferrer"
             style="gap:1.2rem;align-items:flex-start">
            <div class="disc-psy-label-icon" style="font-size:2.5rem">${Icon('home')}</div>
            <div style="flex:1">
              <div class="disc-psy-label-name" style="font-size:1.1rem;margin-bottom:0.35rem">Altar Records</div>
              <div class="disc-psy-label-desc" style="line-height:1.6">
                An independent label dedicated to "the purest frequencies of Zen, Trance and Spirit."
                With one of the most diverse psychill rosters in the world — over 26 artists
                from all over the globe — and several sub-categories under one roof, Altar Records is
                an anchor point in the global psychill and downtempo underground.
              </div>
              <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:0.75rem">
                <span class="disc-psy-section-badge">${Icon('leaf')} Psychill</span>
                <span class="disc-psy-section-badge">${Icon('waves')} Downtempo</span>
                <span class="disc-psy-section-badge">${Icon('sparkles')} Ambient</span>
                <span class="disc-psy-section-badge">${Icon('user')} Meditative</span>
                <span class="disc-psy-section-badge">${Icon('wind')} Goatrance</span>
              </div>
            </div>
            <span class="disc-psy-mix-arrow" style="align-self:center">${Icon('arrow-right')}</span>
          </a>
        </div>
      </div>

      <div class="disc-psy-section">
        <div class="disc-psy-section-hdr">
          <span class="disc-psy-section-icon">${Icon('mic')}</span>
          <span class="disc-psy-section-title">Artists</span>
          <span class="disc-psy-section-badge">${ARTISTS.length} artists</span>
        </div>
        <div class="disc-psy-label-grid">
          ${ARTISTS.map(a => `
            <div class="disc-psy-label-card">
              <div class="disc-psy-label-icon">${iconForEmoji(a.icon)}</div>
              <div>
                <div class="disc-psy-label-name">${escHtml(a.name)}</div>
                <div class="disc-psy-label-desc">${escHtml(a.genres)}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="disc-psy-section">
        <div class="disc-psy-section-hdr">
          <span class="disc-psy-section-icon">${Icon('folder')}</span>
          <span class="disc-psy-section-title">Sub-labels & Categories</span>
          <span class="disc-psy-section-badge">${SUBLABELS.length} categories</span>
        </div>
        <div class="disc-psy-label-grid">
          ${SUBLABELS.map(s => `
            <a class="disc-psy-label-card" href="https://www.altar-records.com/" target="_blank" rel="noopener noreferrer">
              <div class="disc-psy-label-icon">${iconForEmoji(s.emoji)}</div>
              <div>
                <div class="disc-psy-label-name">${escHtml(s.name)}${s.comingSoon ? ' <span style="font-size:0.73rem;opacity:0.55">(coming soon)</span>' : ''}</div>
                <div class="disc-psy-label-desc">${escHtml(s.desc)}</div>
              </div>
            </a>
          `).join('')}
        </div>
      </div>

      <div class="disc-psy-section">
        <div class="disc-psy-section-hdr">
          <span class="disc-psy-section-icon">${Icon('link')}</span>
          <span class="disc-psy-section-title">Find Altar Records</span>
        </div>
        <div class="disc-psy-label-grid">
          ${LINKS.map(psyLinkCard).join('')}
        </div>
      </div>
    `;
  }

  function renderUltimaeTab() {
    const ARTISTS = [
      { icon: '🌌', name: 'Aes Dana',            genres: 'Ambient · Downtempo · Psybient' },
      { icon: '☀️', name: 'Solar Fields',        genres: 'Ambient · Downtempo · Cinematic' },
      { icon: '🧬', name: 'Cell',                genres: 'Ambient · Downtempo · Chillout' },
      { icon: '🌐', name: 'H.U.V.A. Network',    genres: 'Ambient · Downtempo' },
      { icon: '🕉', name: 'Asura',               genres: 'Psychill · Ambient · Goa' },
      { icon: '🌊', name: 'Sync24',              genres: 'Ambient · Downtempo · Chillout' },
      { icon: '🌀', name: 'Miktek',              genres: 'Ambient · IDM · Downtempo' },
      { icon: '🌍', name: 'Hol Baumann',         genres: 'Ambient · Downtempo · World' },
      { icon: '🔵', name: 'Connect.Ohm',         genres: 'Ambient · IDM' },
      { icon: '🌙', name: 'Martin Nonstatic',    genres: 'Ambient · Deep Techno · Dub' },
      { icon: '🌱', name: 'I Awake',             genres: 'Psybient · Downtempo' },
      { icon: '❄️', name: 'James Murray',        genres: 'Ambient · Deep Listening' },
      { icon: '🪶', name: 'Lauge',               genres: 'Ambient · Neoclassical · Drone · Psybient' },
      { icon: '🎹', name: 'Lars Leonhard',       genres: 'Ambient · IDM' },
      { icon: '🔮', name: 'Master Margherita',   genres: 'Downtempo · Psychill' },
      { icon: '🌑', name: 'Scann-Tec',           genres: 'Ambient · IDM · Sound Design' },
      { icon: '💫', name: 'Circular',            genres: 'Ambient · Downtempo' },
      { icon: '🌫', name: 'Fingers In The Noise',genres: 'Downtempo · IDM' },
      { icon: '🪐', name: 'Cygna',               genres: 'Ambient · Downtempo' },
      { icon: '🌒', name: 'Opale',               genres: 'Ambient · Downtempo' },
      { icon: '✨', name: 'Eskostatic',          genres: 'Ambient · Downtempo' },
      { icon: '🌿', name: 'Francis M Gri',       genres: 'Ambient · Neoclassical' },
      { icon: '🔷', name: 'Hybrid Leisureland',  genres: 'Ambient · Downtempo' },
      { icon: '🌬', name: 'Erot',                genres: 'Downtempo · Electronica' },
      { icon: '🌟', name: 'Max Million',         genres: 'Ambient · Electronica' },
      { icon: '🎛️', name: 'Ambientium',          genres: 'Ambient · Downtempo' },
    ];

    const SERIES = [
      { emoji: '🌡', name: 'Fahrenheit Project', desc: 'The label\'s defining chillout/ambient compilation series' },
      { emoji: '🍃', name: 'Oxycanta',           desc: 'Organic downtempo and atmospheric electronica — compilation series' },
      { emoji: '💿', name: 'Fonal / Catalogue',  desc: 'CD, vinyl, cassette and digital — 16- and 24-bit releases' },
      { emoji: '🎚️', name: 'Ultimae Studio',     desc: 'Mastering, sound design and multichannel mixing (5.1 / DTS-HD)' },
    ];

    const LINKS = [
      { emoji: '🌐', name: 'ultimae.com',  desc: 'Official website — artists, releases and news', url: 'https://ultimae.com/' },
      { emoji: '🛒', name: 'Online store', desc: 'Buy CD, vinyl, cassette and digital directly from the label', url: 'https://ultimae.com/shop/' },
      { emoji: '🎤', name: 'Artists',      desc: 'The full roster of composers and DJs',                    url: 'https://ultimae.com/artists/' },
      { emoji: '🎵', name: 'Bandcamp',     desc: 'Stream and support the artists directly',                 url: 'https://ultimae.bandcamp.com/' },
      { emoji: '📰', name: 'News',         desc: 'Latest releases and announcements',                       url: 'https://ultimae.com/news/' },
      { emoji: '✉️', name: 'Newsletter',   desc: 'Get updates straight to your inbox',                      url: 'https://ultimae.com/ultimae-newsletter/' },
    ];

    return `
      <div class="disc-psy-banner" style="background:linear-gradient(135deg,#0a0f1f,#13203a,#0d1830)">
        <div class="disc-psy-banner-emoji">${Icon('disc')}</div>
        <div>
          <div class="disc-psy-banner-title">Ultimae Records</div>
          <div class="disc-psy-banner-sub">Ambient · Downtempo · Psybient · Chillout — atmospheric electronics from Lyon, France</div>
        </div>
      </div>

      <div class="disc-psy-section">
        <div class="disc-psy-section-hdr">
          <span class="disc-psy-section-icon">${Icon('tag')}</span>
          <span class="disc-psy-section-title">About the label</span>
          <span class="disc-psy-section-badge">ultimae.com</span>
        </div>
        <div class="disc-psy-label-grid" style="grid-template-columns:1fr">
          <a class="disc-psy-label-card" href="https://ultimae.com/" target="_blank" rel="noopener noreferrer"
             style="gap:1.2rem;align-items:flex-start">
            <div class="disc-psy-label-icon" style="font-size:2.5rem">${Icon('disc')}</div>
            <div style="flex:1">
              <div class="disc-psy-label-name" style="font-size:1.1rem;margin-bottom:0.35rem">Ultimae Records</div>
              <div class="disc-psy-label-desc" style="line-height:1.6">
                An independent French label and studio founded in 2000 in Lyon by Sandrine Gryson and
                Vincent Villuis (Aes Dana). One of the most influential names in ambient,
                downtempo and psybient — known for deep, cinematic soundscapes and high
                production quality. The roster includes Solar Fields, Cell, Asura and Aes Dana himself,
                and the iconic <em>Fahrenheit Project</em> and <em>Oxycanta</em> compilations.
              </div>
              <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:0.75rem">
                <span class="disc-psy-section-badge">${Icon('sparkles')} Ambient</span>
                <span class="disc-psy-section-badge">${Icon('waves')} Downtempo</span>
                <span class="disc-psy-section-badge">${Icon('leaf')} Psybient</span>
                <span class="disc-psy-section-badge">${Icon('moon')} Chillout</span>
                <span class="disc-psy-section-badge">${Icon('globe')} Lyon 🇫🇷</span>
              </div>
            </div>
            <span class="disc-psy-mix-arrow" style="align-self:center">${Icon('arrow-right')}</span>
          </a>
        </div>
      </div>

      <div class="disc-psy-section">
        <div class="disc-psy-section-hdr">
          <span class="disc-psy-section-icon">${Icon('mic')}</span>
          <span class="disc-psy-section-title">Artists</span>
          <span class="disc-psy-section-badge">${ARTISTS.length}+ artists</span>
        </div>
        <div class="disc-psy-label-grid">
          ${ARTISTS.map(a => `
            <div class="disc-psy-label-card">
              <div class="disc-psy-label-icon">${iconForEmoji(a.icon)}</div>
              <div>
                <div class="disc-psy-label-name">${escHtml(a.name)}</div>
                <div class="disc-psy-label-desc">${escHtml(a.genres)}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="disc-psy-section">
        <div class="disc-psy-section-hdr">
          <span class="disc-psy-section-icon">${Icon('folder')}</span>
          <span class="disc-psy-section-title">Series & Studio</span>
          <span class="disc-psy-section-badge">${SERIES.length} categories</span>
        </div>
        <div class="disc-psy-label-grid">
          ${SERIES.map(s => `
            <a class="disc-psy-label-card" href="https://ultimae.com/shop/" target="_blank" rel="noopener noreferrer">
              <div class="disc-psy-label-icon">${iconForEmoji(s.emoji)}</div>
              <div>
                <div class="disc-psy-label-name">${escHtml(s.name)}</div>
                <div class="disc-psy-label-desc">${escHtml(s.desc)}</div>
              </div>
            </a>
          `).join('')}
        </div>
      </div>

      <div class="disc-psy-section">
        <div class="disc-psy-section-hdr">
          <span class="disc-psy-section-icon">${Icon('link')}</span>
          <span class="disc-psy-section-title">Find Ultimae Records</span>
        </div>
        <div class="disc-psy-label-grid">
          ${LINKS.map(psyLinkCard).join('')}
        </div>
      </div>
    `;
  }

  function renderHadraTab() {
    const MAIN_STAGE = [
      '5F.U','Agop VS BlackDrop','Ajja','AlvinTep','Antidot','Audiofools','Aynix.x',
      'Back to Mars','Bakubaï','Beardy','Cubic Spline VS Alderaan','Delirium Tremens',
      'Digital Hippie','DJ Dhira','Dr Fractal','Earthling','Ebony Willis',
      'Eco Jafar VS Wataru VS Senskrypt','EMIRI','Fagin\'s Reject','FutureMoon',
      'G-Alien VS Elyxir','Gina','Kadum','Khromata','Kokmok','Lampé','Lapsykay',
      'Lou-K VS Clitorock','Magenta','Miss TeKiX to Arkeya','Modus','Mr Frisson',
      'Ne Yam','Need One','Past','Paula','Pyron','Shotu & Manu','Sleeck','Sourone',
      'Transient Disorder','Tsubi','Varanoïd','Zeridium',
    ];
    const PARADOXE = [
      'Actress M','Adil Smaâli','Ayim','Balaphonik Sound System','Bamby','Capon',
      'Captain Pastek','Chichiga','DIGMA','DNA','Esteban Desigual','Gabzh B2B Ecla',
      'Ginette Prod','Krimska','Krumelur','Mad\'J & Rajah T','Mel-uu','Mescud',
      'Neon Vapor','New Funk Order','Pyrokine','Smooth Criminal','TILDA','Tor.Ma in Dub',
      'TRUDGE','Vent des Forêts','Viking','Visages','Willy The Kick',
    ];
    const LE_COCON = [
      'Aora Paradox','Compost Collaps','Echosmos','Electro Ma Non Troppo','Elle Danse',
      'Encore & Encor','Fáni Bácsi','Fran de Lobster ft. Captain Frictus','Heimya',
      'Jan Loup','L-Xir','La Forasteria','Leya Touch','LUNR','Manteyis','Mars O10C',
      'Mavvi & Antonia','Meremix','Nhacada feat. Leïla Zitouni','Planet Zyha',
      'Run!Rabbit Run!','Saalyx','sòn du maquís','Tales & Ahlam','Toneside',
    ];
    const LA_BULLE = ['Gagarin Project Beats','Lo.Renzo','Saalyx'];

    function stageGrid(artists) {
      return `<div class="hadra-artist-grid">${artists.map(a =>
        `<span class="hadra-artist-pill">${escHtml(a)}</span>`
      ).join('')}</div>`;
    }

    return `
      <div class="disc-psy-banner" style="background:linear-gradient(135deg,#1a0a2e,#16213e,#0f3460)">
        <div class="disc-psy-banner-emoji">${Icon('star')}</div>
        <div>
          <div class="disc-psy-banner-title">Hadra Trance Festival 2026</div>
          <div class="disc-psy-banner-sub">Solar Punk Chronicles: The Seed — 27–30 August 2026 · Vieure, Allier, France</div>
        </div>
      </div>

      <div class="disc-psy-section">
        <div class="disc-psy-section-hdr">
          <span class="disc-psy-section-icon">${Icon('map-pin')}</span>
          <span class="disc-psy-section-title">Festival info</span>
          <span class="disc-psy-section-badge">hadratrancefestival.net</span>
        </div>
        <div class="disc-psy-label-grid" style="grid-template-columns:1fr">
          <a class="disc-psy-label-card" href="https://hadratrancefestival.net/en/home/" target="_blank" rel="noopener noreferrer"
             style="gap:1.2rem;align-items:flex-start">
            <div class="disc-psy-label-icon" style="font-size:2.5rem">${Icon('star')}</div>
            <div style="flex:1">
              <div class="disc-psy-label-name" style="font-size:1.1rem;margin-bottom:0.35rem">Hadra Trance Festival 2026</div>
              <div class="disc-psy-label-desc" style="line-height:1.6">
                One of France's most important psytrance festivals — 4 stages, 90 hours of music,
                68 artists and 24 performances. Theme: <em>Solar Punk Chronicles: The Seed.</em>
                Psytrance, techno, drum &amp; bass, electroacoustic, ambient and downtempo.
                With a craft market, workshops, circus arts and camping.
              </div>
              <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:0.75rem">
                <span class="disc-psy-section-badge">${Icon('calendar')} 27–30 Aug 2026</span>
                <span class="disc-psy-section-badge">${Icon('map-pin')} Vieure, France 🇫🇷</span>
                <span class="disc-psy-section-badge">${Icon('star')} 4 stages</span>
                <span class="disc-psy-section-badge">${Icon('music')} 68 artists</span>
              </div>
            </div>
            <span class="disc-psy-mix-arrow" style="align-self:center">${Icon('arrow-right')}</span>
          </a>
        </div>
      </div>

      <div class="disc-psy-section">
        <div class="disc-psy-section-hdr">
          <span class="disc-psy-section-icon">${Icon('wind')}</span>
          <span class="disc-psy-section-title">La Main — Psytrance Main Stage</span>
          <span class="disc-psy-section-badge">${MAIN_STAGE.length} artists · Progressive · Dark-Prog · Full-On · Forest</span>
        </div>
        ${stageGrid(MAIN_STAGE)}
      </div>

      <div class="disc-psy-section">
        <div class="disc-psy-section-hdr">
          <span class="disc-psy-section-icon">${Icon('zap')}</span>
          <span class="disc-psy-section-title">Paradoxe — Alternative Stage</span>
          <span class="disc-psy-section-badge">${PARADOXE.length} artists · Techno · DnB · Hi-Tech · Dub · World music</span>
        </div>
        ${stageGrid(PARADOXE)}
      </div>

      <div class="disc-psy-section">
        <div class="disc-psy-section-hdr">
          <span class="disc-psy-section-icon">${Icon('music')}</span>
          <span class="disc-psy-section-title">Le Cocon — Live & Experimental Stage</span>
          <span class="disc-psy-section-badge">${LE_COCON.length} artists · Electroacoustic · Experimental</span>
        </div>
        ${stageGrid(LE_COCON)}
      </div>

      <div class="disc-psy-section">
        <div class="disc-psy-section-hdr">
          <span class="disc-psy-section-icon">${Icon('leaf')}</span>
          <span class="disc-psy-section-title">La Bulle — Chill-Out Zone</span>
          <span class="disc-psy-section-badge">${LA_BULLE.length} artists · Downtempo · Ambient · Psybass · Psychill</span>
        </div>
        ${stageGrid(LA_BULLE)}
      </div>

      <div class="disc-psy-section">
        <div class="disc-psy-section-hdr">
          <span class="disc-psy-section-icon">${Icon('link')}</span>
          <span class="disc-psy-section-title">Tickets & Social media</span>
        </div>
        <div class="disc-psy-label-grid">
          <a class="disc-psy-label-card" href="https://hadratrancefestival.net/en/tickets/" target="_blank" rel="noopener noreferrer">
            <div class="disc-psy-label-icon">${Icon('ticket')}</div>
            <div>
              <div class="disc-psy-label-name">Buy tickets</div>
              <div class="disc-psy-label-desc">Official ticket page — 27–30 August 2026</div>
            </div>
          </a>
          <a class="disc-psy-label-card" href="https://www.facebook.com/hadratrancefestival/" target="_blank" rel="noopener noreferrer">
            <div class="disc-psy-label-icon">f</div>
            <div>
              <div class="disc-psy-label-name">Facebook</div>
              <div class="disc-psy-label-desc">News, announcements and updates</div>
            </div>
          </a>
          <a class="disc-psy-label-card" href="https://www.instagram.com/hadratrancefestival/" target="_blank" rel="noopener noreferrer">
            <div class="disc-psy-label-icon">${Icon('camera')}</div>
            <div>
              <div class="disc-psy-label-name">Instagram</div>
              <div class="disc-psy-label-desc">Photos and artwork from the festival</div>
            </div>
          </a>
          ${ytFindCard('https://www.youtube.com/user/hadrarecords', 'Sets and videos from previous years')}
        </div>
      </div>
    `;
  }

  function renderDacruTab() {
    const ARTISTS = [
      { icon: '🌀', name: 'DigiCult',           genres: 'Psychedelic Trance · Full-On' },
      { icon: '⚡', name: 'Talamasca',           genres: 'Psychedelic Trance · Goa' },
      { icon: '🌊', name: 'E-Mov',              genres: 'Progressive Psytrance' },
      { icon: '🌿', name: 'Spirit Architect',   genres: 'Psychedelic Trance' },
      { icon: '🏖', name: 'Tropical Bleyage',   genres: 'Full-On · Psychedelic Trance' },
      { icon: '🌀', name: 'U‑Recken',           genres: 'Psychedelic Trance · Full-On' },
      { icon: '💡', name: 'Ephedrix',           genres: 'Psychedelic Trance' },
      { icon: '🔢', name: 'Bitkit',             genres: 'Psychedelic Trance · Progressive' },
      { icon: '⏱', name: 'Chronos',            genres: 'Psychedelic Trance' },
      { icon: '🦅', name: 'Aquila',             genres: 'Psychedelic Trance · Full-On' },
      { icon: '🔄', name: 'Alternative Control', genres: 'Psychedelic Trance' },
      { icon: '🌙', name: 'Morsei',             genres: 'Psychedelic Trance · Collaboration (ARCANA)' },
    ];
    const TRACKS = [
      'Talamasca – Day Dreaming',
      'E-Mov – Cenote',
      'Spirit Architect – Vertigo',
      'Tropical Bleyage – Deep Motion',
      'U-Recken – Stop Time',
      'DigiCult – Star Travel',
      'Ephedrix – Astral Ignition',
      'Bitkit – Logical',
      'Chronos – Between Elements',
      'Aquila – Down Under',
      'Alternative Control – Anaxadora',
    ];
    return `
      <div class="disc-psy-banner" style="background:linear-gradient(135deg,#0e0d1f,#1b1040,#0d0a2e)">
        <div class="disc-psy-banner-emoji">${Icon('wind')}</div>
        <div>
          <div class="disc-psy-banner-title">DaCru Records</div>
          <div class="disc-psy-banner-sub">Psychedelic Trance Label & Events — dacru.be</div>
        </div>
      </div>

      <div class="disc-psy-section">
        <div class="disc-psy-section-hdr">
          <span class="disc-psy-section-icon">${Icon('tag')}</span>
          <span class="disc-psy-section-title">About the label</span>
          <span class="disc-psy-section-badge">dacru.be</span>
        </div>
        <div class="disc-psy-label-grid" style="grid-template-columns:1fr">
          <a class="disc-psy-label-card" href="https://www.dacru.be/" target="_blank" rel="noopener noreferrer"
             style="gap:1.2rem;align-items:flex-start">
            <div class="disc-psy-label-icon" style="font-size:2.5rem">${Icon('wind')}</div>
            <div style="flex:1">
              <div class="disc-psy-label-name" style="font-size:1.1rem;margin-bottom:0.35rem">DaCru Records</div>
              <div class="disc-psy-label-desc" style="line-height:1.6">
                Belgian psychedelic trance label and event organizer. Home to some of the
                most important psytrance artists in the world — Talamasca, DigiCult, U-Recken and more.
                Organizes the Solomonari festival in Transylvania and other major psytrance events.
                Known for high quality and a strong artist profile.
              </div>
              <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:0.75rem">
                <span class="disc-psy-section-badge">${Icon('wind')} Psychedelic Trance</span>
                <span class="disc-psy-section-badge">${Icon('zap')} Full-On</span>
                <span class="disc-psy-section-badge">🇧🇪 Belgium</span>
                <span class="disc-psy-section-badge">${Icon('star')} Events</span>
              </div>
            </div>
            <span class="disc-psy-mix-arrow" style="align-self:center">${Icon('arrow-right')}</span>
          </a>
        </div>
      </div>

      <div class="disc-psy-section">
        <div class="disc-psy-section-hdr">
          <span class="disc-psy-section-icon">${Icon('mic')}</span>
          <span class="disc-psy-section-title">Artists</span>
          <span class="disc-psy-section-badge">${ARTISTS.length} artists</span>
        </div>
        <div class="disc-psy-label-grid">
          ${ARTISTS.map(a => `
            <div class="disc-psy-label-card">
              <div class="disc-psy-label-icon">${iconForEmoji(a.icon)}</div>
              <div>
                <div class="disc-psy-label-name">${escHtml(a.name)}</div>
                <div class="disc-psy-label-desc">${escHtml(a.genres)}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="disc-psy-section">
        <div class="disc-psy-section-hdr">
          <span class="disc-psy-section-icon">${Icon('music')}</span>
          <span class="disc-psy-section-title">Featured tracks</span>
          <span class="disc-psy-section-badge">From the DaCru catalogue</span>
        </div>
        <div class="disc-psy-mix-grid">
          ${TRACKS.map(t => `
            <div class="disc-psy-mix-card yt-clickable" role="button" tabindex="0" title="Search on YouTube"
                 onclick="Discover.openYt('${escHtml(t).replace(/'/g,'&#39;')}')"
                 onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();Discover.openYt('${escHtml(t).replace(/'/g,'&#39;')}')}">
              <div class="disc-psy-mix-thumb" style="background:linear-gradient(135deg,#1b1040,#0d0a2e);font-size:1.2rem">${Icon('wind')}</div>
              <div class="disc-psy-mix-info">
                <div class="disc-psy-mix-title">${escHtml(t.split(' – ')[1] || t)}</div>
                <div class="disc-psy-mix-artist">${escHtml(t.split(' – ')[0] || '')}</div>
              </div>
              <span class="yt-clickable-go">${Icon('search')}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="disc-psy-section">
        <div class="disc-psy-section-hdr">
          <span class="disc-psy-section-icon">${Icon('star')}</span>
          <span class="disc-psy-section-title">Solomonari Festival 2026</span>
          <span class="disc-psy-section-badge">Transylvania, Romania</span>
        </div>
        <div class="disc-psy-label-grid" style="grid-template-columns:1fr">
          <a class="disc-psy-label-card" href="https://www.dacru.be/" target="_blank" rel="noopener noreferrer"
             style="gap:1.2rem;align-items:flex-start">
            <div class="disc-psy-label-icon" style="font-size:2.2rem">${Icon('mountain')}</div>
            <div style="flex:1">
              <div class="disc-psy-label-name">Solomonari Festival 2026</div>
              <div class="disc-psy-label-desc" style="line-height:1.6">
                June 18–21, 2026 · Transylvania, Romania 🇷🇴<br>
                The Transylvanian gathering is back — an intimate psytrance festival in scenic surroundings
                in the heart of Romania. Organized by DaCru Records.
              </div>
            </div>
            <span class="disc-psy-mix-arrow" style="align-self:center">${Icon('arrow-right')}</span>
          </a>
        </div>
      </div>

      <div class="disc-psy-section">
        <div class="disc-psy-section-hdr">
          <span class="disc-psy-section-icon">${Icon('link')}</span>
          <span class="disc-psy-section-title">Find DaCru Records</span>
        </div>
        <div class="disc-psy-label-grid">
          <a class="disc-psy-label-card" href="https://www.dacru.be/" target="_blank" rel="noopener noreferrer">
            <div class="disc-psy-label-icon">${Icon('globe')}</div>
            <div><div class="disc-psy-label-name">dacru.be</div><div class="disc-psy-label-desc">Official website — artists, releases and events</div></div>
          </a>
          <a class="disc-psy-label-card" href="https://www.facebook.com/dacrurecords" target="_blank" rel="noopener noreferrer">
            <div class="disc-psy-label-icon">f</div>
            <div><div class="disc-psy-label-name">Facebook</div><div class="disc-psy-label-desc">News and releases</div></div>
          </a>
          <a class="disc-psy-label-card" href="https://www.instagram.com/dacru_records" target="_blank" rel="noopener noreferrer">
            <div class="disc-psy-label-icon">${Icon('camera')}</div>
            <div><div class="disc-psy-label-name">Instagram</div><div class="disc-psy-label-desc">Artwork and updates</div></div>
          </a>
          ${ytFindCard('https://www.youtube.com/user/dacru', 'Sets, videos and live recordings')}
        </div>
      </div>
    `;
  }

  function renderTipRajaTab() {
    const TIP_ARTISTS = [
      { icon: '👑', name: 'Raja Ram',            genres: 'Goa Trance · Psytrance · Godfather of the Scene' },
      { icon: '🎛️', name: '1200 Micrograms',     genres: 'Psychedelic Trance · Full-On' },
      { icon: '🌌', name: 'Astral-Projection',   genres: 'Goa Trance · Psytrance' },
      { icon: '🎷', name: 'Lucas / SuperModule', genres: 'Psychedelic Trance' },
      { icon: '🔢', name: 'Mandelbrot',          genres: 'Psychedelic Trance · Progressive' },
      { icon: '🎵', name: 'DJ CHICAGO',          genres: 'Psychedelic Trance' },
      { icon: '🚀', name: 'Outsiders',           genres: 'Psychedelic Trance · Progressive' },
      { icon: '🌟', name: 'IRIDIAN',             genres: 'Psychedelic Trance' },
      { icon: '💡', name: 'Logic Bomb',          genres: 'Psychedelic Trance · Full-On' },
      { icon: '⚡', name: 'The Zap!',            genres: 'Psychedelic Trance · Collaborative' },
      { icon: '🌐', name: 'BRAHMA',              genres: 'Psychedelic Trance' },
    ];
    const RAJA_PROJECTS = [
      { icon: '🎵', name: 'The Quintessence',     desc: 'Psych rock / early spiritual music — Island Records (1969–1972)' },
      { icon: '∞', name: 'The Infinity Project', desc: 'Klassisk Goa Trance-duo — Mystical Experiences (1995), Feeling Weird (1995)' },
      { icon: '🔮', name: 'Shpongle',            desc: 'Med Simon Posford — verdas mest kjende psybient-prosjekt. Are You Shpongled? (1998)' },
      { icon: '💊', name: '1200 Micrograms',     desc: 'Full-On psytrance supergroup — self-titled album (2002) and Heroes of Imagination (2003)' },
      { icon: '⚡', name: 'The Zap!',            desc: 'Dark psychedelic trance — Big Bang (2008)' },
    ];
    const MIXES = [
      'Spaceships Of The Imagination (2000)',
      "Raja Ram's Stash Bag (2002)",
      "Raja Ram's Stash Bag Vol. 2 (2003)",
      "Raja Ram's Stash Bag Vol. 3 — Smokers Jokers (2004)",
      "Raja Ram's Stash Bag Vol. 4 (2006)",
      'The Anthology (2007)',
    ];
    return `
      <div class="disc-psy-banner" style="background:linear-gradient(135deg,#1a0d2e,#2d1060,#1a0d2e)">
        <div class="disc-psy-banner-emoji">${Icon('crown')}</div>
        <div>
          <div class="disc-psy-banner-title">Raja Ram & T.I.P. Records</div>
          <div class="disc-psy-banner-sub">Godfather of the Psychedelic Global Underground — sidan 1994</div>
        </div>
      </div>

      <div class="disc-psy-section">
        <div class="disc-psy-section-hdr">
          <span class="disc-psy-section-icon">${Icon('crown')}</span>
          <span class="disc-psy-section-title">Raja Ram</span>
          <span class="disc-psy-section-badge">tiprecords.com</span>
        </div>
        <div class="disc-psy-label-grid" style="grid-template-columns:1fr">
          <a class="disc-psy-label-card" href="https://www.tiprecords.com/artists/raja-ram/" target="_blank" rel="noopener noreferrer"
             style="gap:1.2rem;align-items:flex-start">
            <div class="disc-psy-label-icon" style="font-size:2.5rem">${Icon('crown')}</div>
            <div style="flex:1">
              <div class="disc-psy-label-name" style="font-size:1.1rem;margin-bottom:0.35rem">Raja Ram — The Godfather</div>
              <div class="disc-psy-label-desc" style="line-height:1.6">
                Raja Ram is the "ringmaster" and "godfather" of the psychedelic global underground.
                He has inspired artists and captivated audiences worldwide for 40 years.
                The projects and collaborations are numerous: The Quintessence, The Infinity Project,
                The Zap!, Shpongle and 1200 Micrograms. Founder of T.I.P. Records.
              </div>
              <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:0.75rem">
                <span class="disc-psy-section-badge">${Icon('wind')} Goa Trance</span>
                <span class="disc-psy-section-badge">${Icon('sparkles')} Shpongle</span>
                <span class="disc-psy-section-badge">${Icon('pill')} 1200 Mics</span>
                <span class="disc-psy-section-badge">🇮🇱 Israel</span>
              </div>
            </div>
            <span class="disc-psy-mix-arrow" style="align-self:center">${Icon('arrow-right')}</span>
          </a>
        </div>
      </div>

      <div class="disc-psy-section">
        <div class="disc-psy-section-hdr">
          <span class="disc-psy-section-icon">${Icon('music')}</span>
          <span class="disc-psy-section-title">Raja Rams prosjektar</span>
        </div>
        <div class="disc-psy-label-grid">
          ${RAJA_PROJECTS.map(p => `
            <div class="disc-psy-label-card">
              <div class="disc-psy-label-icon">${iconForEmoji(p.icon)}</div>
              <div>
                <div class="disc-psy-label-name">${escHtml(p.name)}</div>
                <div class="disc-psy-label-desc">${escHtml(p.desc)}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="disc-psy-section">
        <div class="disc-psy-section-hdr">
          <span class="disc-psy-section-icon">${Icon('music')}</span>
          <span class="disc-psy-section-title">Raja Ram — DJ-miksesett</span>
        </div>
        <div class="disc-psy-mix-grid">
          ${MIXES.map(m => `
            <div class="disc-psy-mix-card yt-clickable" role="button" tabindex="0" title="Search on YouTube"
                 onclick="Discover.openYt('${escHtml(m + ' Raja Ram').replace(/'/g,'&#39;')}')"
                 onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();Discover.openYt('${escHtml(m + ' Raja Ram').replace(/'/g,'&#39;')}')}">
              <div class="disc-psy-mix-thumb" style="background:linear-gradient(135deg,#2d1060,#1a0d2e);font-size:1.2rem">${Icon('crown')}</div>
              <div class="disc-psy-mix-info">
                <div class="disc-psy-mix-title">${escHtml(m)}</div>
                <div class="disc-psy-mix-artist">Raja Ram · T.I.P. Records</div>
              </div>
              <span class="yt-clickable-go">${Icon('search')}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="disc-psy-section">
        <div class="disc-psy-section-hdr">
          <span class="disc-psy-section-icon">${Icon('tag')}</span>
          <span class="disc-psy-section-title">T.I.P. Records — Artists</span>
          <span class="disc-psy-section-badge">Since 1994</span>
        </div>
        <div class="disc-psy-label-grid">
          ${TIP_ARTISTS.map(a => `
            <div class="disc-psy-label-card">
              <div class="disc-psy-label-icon">${iconForEmoji(a.icon)}</div>
              <div>
                <div class="disc-psy-label-name">${escHtml(a.name)}</div>
                <div class="disc-psy-label-desc">${escHtml(a.genres)}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="disc-psy-section">
        <div class="disc-psy-section-hdr">
          <span class="disc-psy-section-icon">${Icon('link')}</span>
          <span class="disc-psy-section-title">Find T.I.P. Records</span>
        </div>
        <div class="disc-psy-label-grid">
          <a class="disc-psy-label-card" href="https://www.tiprecords.com/" target="_blank" rel="noopener noreferrer">
            <div class="disc-psy-label-icon">${Icon('globe')}</div>
            <div><div class="disc-psy-label-name">tiprecords.com</div><div class="disc-psy-label-desc">Official website — artists and releases</div></div>
          </a>
          <a class="disc-psy-label-card" href="https://www.instagram.com/raja_rams_tip_records/" target="_blank" rel="noopener noreferrer">
            <div class="disc-psy-label-icon">${Icon('camera')}</div>
            <div><div class="disc-psy-label-name">Instagram</div><div class="disc-psy-label-desc">@raja_rams_tip_records</div></div>
          </a>
          <a class="disc-psy-label-card" href="https://www.facebook.com/profile.php?id=100064907913247" target="_blank" rel="noopener noreferrer">
            <div class="disc-psy-label-icon">f</div>
            <div><div class="disc-psy-label-name">Facebook</div><div class="disc-psy-label-desc">News and releases</div></div>
          </a>
          <a class="disc-psy-label-card" href="https://soundcloud.com/tiprecords" target="_blank" rel="noopener noreferrer">
            <div class="disc-psy-label-icon">${Icon('cloud')}</div>
            <div><div class="disc-psy-label-name">SoundCloud</div><div class="disc-psy-label-desc">Stream T.I.P. music for free</div></div>
          </a>
          ${ytFindCard('https://www.youtube.com/user/TipWorldRecords', 'Music videos and live sets')}
        </div>
      </div>
    `;
  }

  function renderCosmicLeafTab() {
    const LINKS = [
      { emoji: '🌐', name: 'cosmicleaf.gr',   desc: 'Official website — artists, releases and news',    url: 'https://cosmicleaf.gr/' },
      { emoji: '🎵', name: 'Bandcamp',         desc: 'Stream and buy the entire catalogue',                         url: 'https://cosmicleaf.bandcamp.com/' },
      { emoji: '☁️', name: 'SoundCloud',       desc: 'Mixes and curated playlists',                        url: 'https://soundcloud.com/cosmic-leaf' },
      { emoji: '▶',  name: 'YouTube',          desc: 'Music videos, live sets and mixes',                        url: 'https://www.youtube.com/@CosmicLeafRecords' },
    ];
    return `
      <div class="disc-psy-banner" style="background:linear-gradient(135deg,#041a08,#0a2e10,#041a08)">
        <div class="disc-psy-banner-emoji">${Icon('leaf')}</div>
        <div>
          <div class="disc-psy-banner-title">Cosmic Leaf Records</div>
          <div class="disc-psy-banner-sub">Psybient · Psychill · Downtempo · Chill — from Greece to the world</div>
        </div>
      </div>

      <div class="disc-psy-section">
        <div class="disc-psy-section-hdr">
          <span class="disc-psy-section-icon">${Icon('leaf')}</span>
          <span class="disc-psy-section-title">About Cosmic Leaf</span>
          <span class="disc-psy-section-badge">cosmicleaf.gr</span>
        </div>
        <div class="disc-psy-label-grid" style="grid-template-columns:1fr">
          <a class="disc-psy-label-card" href="https://cosmicleaf.gr/" target="_blank" rel="noopener noreferrer"
             style="gap:1.2rem;align-items:flex-start;border-color:rgba(60,160,80,0.35);background:rgba(4,20,8,0.5)">
            <div class="disc-psy-label-icon" style="font-size:2.5rem">${Icon('leaf')}</div>
            <div style="flex:1">
              <div class="disc-psy-label-name" style="font-size:1.1rem;margin-bottom:0.35rem">Cosmic Leaf Records</div>
              <div class="disc-psy-label-desc" style="line-height:1.6">
                Cosmic Leaf is a Greek record label specializing in psybient, psychill, downtempo
                and chill electronica. Since the start, they have built up a rich catalogue of soft,
                organic and meditative music from artists all over the world — always with a focus on
                quality, nature and inner calm. A must for all fans of calm and atmospheric electronica.
              </div>
              <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:0.75rem">
                <span class="disc-psy-section-badge">${Icon('leaf')} Chill</span>
                <span class="disc-psy-section-badge">${Icon('sparkles')} Psybient</span>
                <span class="disc-psy-section-badge">${Icon('waves')} Psychill</span>
                <span class="disc-psy-section-badge">🇬🇷 Greece</span>
              </div>
            </div>
            <span class="disc-psy-mix-arrow" style="align-self:center">${Icon('arrow-right')}</span>
          </a>
        </div>
      </div>

      <div class="disc-psy-section">
        <div class="disc-psy-section-hdr">
          <span class="disc-psy-section-icon">${Icon('link')}</span>
          <span class="disc-psy-section-title">Find Cosmic Leaf</span>
        </div>
        <div class="disc-psy-label-grid">
          ${LINKS.map(psyLinkCard).join('')}
        </div>
      </div>
    `;
  }

  function renderCryoChamberTab() {
    // Fast, permanent radio-mix-video (rotere IKKJE) — vis med video og lyd.
    const ytId = 'eTEmknjKFPk';
    const LINKS = [
      { emoji: '🎵', name: 'Bandcamp',  desc: 'Stream and buy the entire catalogue directly from the label', url: 'https://cryochamber.bandcamp.com/' },
      { emoji: '▶',  name: 'YouTube',   desc: 'Full-length dark ambient mixes and albums',             url: 'https://www.youtube.com/@CryoChamber' },
    ];
    return `
      <div class="disc-psy-banner" style="background:linear-gradient(135deg,#05080f,#0b1828,#102a3a)">
        <div class="disc-psy-banner-emoji">${Icon('snowflake')}</div>
        <div>
          <div class="disc-psy-banner-title">Cryo Chamber</div>
          <div class="disc-psy-banner-sub">Dark Ambient · Cinematic · Drone — atmospheric darkness from the depths</div>
        </div>
      </div>

      <div class="disc-psy-section">
        <div class="disc-psy-section-hdr">
          <span class="disc-psy-section-icon">${Icon('snowflake')}</span>
          <span class="disc-psy-section-title">About Cryo Chamber</span>
          <span class="disc-psy-section-badge">cryochamber.bandcamp.com</span>
        </div>
        <div class="disc-psy-label-grid" style="grid-template-columns:1fr">
          <a class="disc-psy-label-card" href="https://cryochamber.bandcamp.com/" target="_blank" rel="noopener noreferrer"
             style="gap:1.2rem;align-items:flex-start;border-color:rgba(60,120,200,0.35);background:rgba(5,8,15,0.6)">
            <div class="disc-psy-label-icon" style="font-size:2.5rem">${Icon('snowflake')}</div>
            <div style="flex:1">
              <div class="disc-psy-label-name" style="font-size:1.1rem;margin-bottom:0.35rem">Cryo Chamber</div>
              <div class="disc-psy-label-desc" style="line-height:1.6">
                Cryo Chamber is a leading dark ambient record label founded by Simon Heath
                (Atrium Carceri). The label is known for deep, cinematic and droning atmospheric
                music — from spacious soundscapes to dark, almost terrifying soundscapes. A
                gathering point for the genre's foremost artists and major collaboration albums.
              </div>
              <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:0.75rem">
                <span class="disc-psy-section-badge">${Icon('snowflake')} Dark Ambient</span>
                <span class="disc-psy-section-badge">${Icon('moon')} Cinematic</span>
                <span class="disc-psy-section-badge">${Icon('waves')} Drone</span>
              </div>
            </div>
            <span class="disc-psy-mix-arrow" style="align-self:center">${Icon('arrow-right')}</span>
          </a>
        </div>
      </div>

      <div class="disc-psy-section">
        <div class="disc-psy-section-hdr">
          <span class="disc-psy-section-icon">${Icon('radio')}</span>
          <span class="disc-psy-section-title">Radio-miks</span>
          <span class="disc-psy-section-badge">YouTube · video & audio</span>
        </div>
        <iframe class="hr-yt-embed" src="https://www.youtube.com/embed/${ytId}?list=RD${ytId}"
          allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe>
      </div>

      <div class="disc-psy-section">
        <div class="disc-psy-section-hdr">
          <span class="disc-psy-section-icon">${Icon('link')}</span>
          <span class="disc-psy-section-title">Find Cryo Chamber</span>
        </div>
        <div class="disc-psy-label-grid">
          ${LINKS.map(psyLinkCard).join('')}
        </div>
      </div>
    `;
  }

  function renderMikelaBellaTab() {
    const LINKS = [
      { emoji: '🎵', name: 'Bandcamp',        desc: 'Stream and buy the entire catalogue directly from the label', url: 'https://mikelabellarecords.bandcamp.com/' },
      { emoji: '💿', name: 'Discography',       desc: 'All releases — albums, EPs and compilations',     url: 'https://mikelabellarecords.bandcamp.com/music' },
    ];
    const RELEASES = [
      { emoji: '🌫', name: 'Searching For A Fogbow',            artist: 'Kukan Dub Lagan' },
      { emoji: '📦', name: 'Out Of The Box',                    artist: 'Sorian' },
      { emoji: '🎚', name: 'Elastic Life EP',                   artist: 'Gumi' },
      { emoji: '☀', name: 'Sunshine Music For Smiling People',  artist: 'Kukan Dub Lagan' },
      { emoji: '🌑', name: 'Dark Side Of The Mood',             artist: 'Kukan Dub Lagan' },
      { emoji: '🌍', name: 'VA — Planet Blue',                  artist: 'Compiled by Johnny Blue' },
    ];
    return `
      <div class="disc-psy-banner" style="background:linear-gradient(135deg,#06121f,#0a2440,#123a5e)">
        <div class="disc-psy-banner-emoji">${Icon('disc')}</div>
        <div>
          <div class="disc-psy-banner-title">MikelaBella Records</div>
          <div class="disc-psy-banner-sub">Dub · House · Downtempo — independent electronica from Barcelona</div>
        </div>
      </div>

      <div class="disc-psy-section">
        <div class="disc-psy-section-hdr">
          <span class="disc-psy-section-icon">${Icon('disc')}</span>
          <span class="disc-psy-section-title">About MikelaBella</span>
          <span class="disc-psy-section-badge">Barcelona, Spain</span>
        </div>
        <div class="disc-psy-label-grid" style="grid-template-columns:1fr">
          <a class="disc-psy-label-card" href="https://mikelabellarecords.bandcamp.com/" target="_blank" rel="noopener noreferrer"
             style="gap:1.2rem;align-items:flex-start;border-color:rgba(60,120,200,0.35);background:rgba(6,18,31,0.5)">
            <div class="disc-psy-label-icon" style="font-size:2.5rem">${Icon('disc')}</div>
            <div style="flex:1">
              <div class="disc-psy-label-name" style="font-size:1.1rem;margin-bottom:0.35rem">MikelaBella Records</div>
              <div class="disc-psy-label-desc" style="line-height:1.6">
                MikelaBella Records is an independent record label from Barcelona that cultivates new and
                original sounds from both established and emerging artists. The catalogue spans
                dub, house and atmospheric downtempo, with a roster of producers who are also experienced
                DJs. Home to, among others, Kukan Dub Lagan, Sorian and Gumi.
              </div>
              <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:0.75rem">
                <span class="disc-psy-section-badge">${iconForEmoji('🌊')} Dub</span>
                <span class="disc-psy-section-badge">${iconForEmoji('🏠')} House</span>
                <span class="disc-psy-section-badge">${iconForEmoji('🌙')} Downtempo</span>
                <span class="disc-psy-section-badge">🇪🇸 Spain</span>
              </div>
            </div>
            <span class="disc-psy-mix-arrow" style="align-self:center">${Icon('arrow-right')}</span>
          </a>
        </div>
      </div>

      <div class="disc-psy-section">
        <div class="disc-psy-section-hdr">
          <span class="disc-psy-section-icon">${Icon('music')}</span>
          <span class="disc-psy-section-title">Featured releases</span>
          <span class="disc-psy-section-badge">Bandcamp</span>
        </div>
        <div class="disc-psy-label-grid">
          ${RELEASES.map(r => `
            <a class="disc-psy-label-card" href="https://mikelabellarecords.bandcamp.com/music" target="_blank" rel="noopener noreferrer">
              <div class="disc-psy-label-icon">${iconForEmoji(r.emoji)}</div>
              <div>
                <div class="disc-psy-label-name">${escHtml(r.name)}</div>
                <div class="disc-psy-label-desc">${escHtml(r.artist)}</div>
              </div>
            </a>`).join('')}
        </div>
      </div>

      <div class="disc-psy-section">
        <div class="disc-psy-section-hdr">
          <span class="disc-psy-section-icon">${Icon('link')}</span>
          <span class="disc-psy-section-title">Find MikelaBella</span>
        </div>
        <div class="disc-psy-label-grid">
          ${LINKS.map(psyLinkCard).join('')}
        </div>
      </div>
    `;
  }

  function renderGagarinProjectTab() {
    const LINKS = [
      { emoji: '🎵', name: 'Bandcamp',     desc: 'Stream and buy the entire catalogue directly from the artist', url: 'https://gagarinproject.bandcamp.com/' },
      { emoji: '☁️', name: 'SoundCloud',   desc: 'Psychill, psybient and psydub mixes',                url: 'https://soundcloud.com/gagarinproject' },
      { emoji: '💛', name: 'Patreon',      desc: 'Support the project directly — #LiveLoveCreate',          url: 'https://www.patreon.com/gagarinproject' },
      { emoji: '📘', name: 'Facebook',     desc: 'News, livestreams and community',                  url: 'https://www.facebook.com/gagarinproject' },
    ];
    const RELEASES = [
      { emoji: '🐦', name: 'Birds in Psy Forest',                          artist: 'Gagarin Project' },
      { emoji: '🍄', name: 'Albert Hofmann Wonderful Experience (2022 Edit)', artist: 'Gagarin Project' },
      { emoji: '🧘', name: 'Higher States of Consciousness',               artist: 'feat. Alan Watts' },
      { emoji: '🙏', name: 'Prayer for Love (healing meditation mix)',     artist: 'Gagarin Project' },
      { emoji: '✨', name: 'Wonderful Experience',                          artist: 'feat. Albert Hofmann' },
    ];
    return `
      <div class="disc-psy-banner" style="background:linear-gradient(135deg,#0a0420,#1a0a3e,#2c1060)">
        <div class="disc-psy-banner-emoji">${Icon('rocket')}</div>
        <div>
          <div class="disc-psy-banner-title">Gagarin Project</div>
          <div class="disc-psy-banner-sub">Psybient · Psychill · Downtempo — meditative cosmic electronica from Ukraine</div>
        </div>
      </div>

      <div class="disc-psy-section">
        <div class="disc-psy-section-hdr">
          <span class="disc-psy-section-icon">${Icon('rocket')}</span>
          <span class="disc-psy-section-title">About Gagarin Project</span>
          <span class="disc-psy-section-badge">#LiveLoveCreate</span>
        </div>
        <div class="disc-psy-label-grid" style="grid-template-columns:1fr">
          <a class="disc-psy-label-card" href="https://gagarinproject.bandcamp.com/" target="_blank" rel="noopener noreferrer"
             style="gap:1.2rem;align-items:flex-start;border-color:rgba(120,80,200,0.35);background:rgba(10,4,32,0.5)">
            <div class="disc-psy-label-icon" style="font-size:2.5rem">${Icon('rocket')}</div>
            <div style="flex:1">
              <div class="disc-psy-label-name" style="font-size:1.1rem;margin-bottom:0.35rem">Gagarin Project</div>
              <div class="disc-psy-label-desc" style="line-height:1.6">
                Gagarin Project is a Ukrainian psybient project that makes deep, meditative and
                consciousness-expanding electronica at the intersection of psychill, psybient and
                downtempo. Soft soundscapes, organic textures and spiritual/philosophical themes —
                with the motto «live love create». Known from the psybient.org mixes and a rich catalogue
                of calm, cosmic music.
              </div>
              <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:0.75rem">
                <span class="disc-psy-section-badge">${Icon('sparkles')} Psybient</span>
                <span class="disc-psy-section-badge">${Icon('waves')} Psychill</span>
                <span class="disc-psy-section-badge">${iconForEmoji('🌙')} Downtempo</span>
                <span class="disc-psy-section-badge">🇺🇦 Ukraine</span>
              </div>
            </div>
            <span class="disc-psy-mix-arrow" style="align-self:center">${Icon('arrow-right')}</span>
          </a>
        </div>
      </div>

      <div class="disc-psy-section">
        <div class="disc-psy-section-hdr">
          <span class="disc-psy-section-icon">${Icon('music')}</span>
          <span class="disc-psy-section-title">Featured releases</span>
          <span class="disc-psy-section-badge">Bandcamp</span>
        </div>
        <div class="disc-psy-label-grid">
          ${RELEASES.map(r => `
            <a class="disc-psy-label-card" href="https://gagarinproject.bandcamp.com/music" target="_blank" rel="noopener noreferrer">
              <div class="disc-psy-label-icon">${iconForEmoji(r.emoji)}</div>
              <div>
                <div class="disc-psy-label-name">${escHtml(r.name)}</div>
                <div class="disc-psy-label-desc">${escHtml(r.artist)}</div>
              </div>
            </a>`).join('')}
        </div>
      </div>

      <div class="disc-psy-section">
        <div class="disc-psy-section-hdr">
          <span class="disc-psy-section-icon">${Icon('link')}</span>
          <span class="disc-psy-section-title">Find Gagarin Project</span>
        </div>
        <div class="disc-psy-label-grid">
          ${LINKS.map(psyLinkCard).join('')}
        </div>
      </div>
    `;
  }

  function renderLeftfieldTab() {
    const LINKS = [
      { emoji: '🌐', name: 'lftfld.se',   desc: 'Official website — releases, artists and info', url: 'https://www.lftfld.se/' },
      { emoji: '📘', name: 'Facebook',    desc: 'News and updates from the label',              url: 'https://www.facebook.com/lftfld/' },
      { emoji: '💿', name: 'Discogs',      desc: 'Full discography — CD, vinyl and digital',           url: 'https://www.discogs.com/label/467138-Leftfield-Records' },
    ];
    const PROJECTS = [
      { emoji: '🌿', name: 'Carbon Based Lifeforms', artist: 'Ambient downtempo with Johannes Hedberg — one of the biggest ambient groups in the world (10M+ plays)' },
      { emoji: '🌀', name: 'Sync24',                 artist: 'The solo project of the label founder — related to CBL, but with its own flavour' },
      { emoji: '🔬', name: 'T.S.R.',                 artist: 'Experimental project with Johannes Hedberg and Magnus Birgersson (Solar Fields)' },
    ];
    return `
      <div class="disc-psy-banner" style="background:linear-gradient(135deg,#05081a,#0c1233,#161f52)">
        <div class="disc-psy-banner-emoji">${Icon('moon')}</div>
        <div>
          <div class="disc-psy-banner-title">Leftfield Records</div>
          <div class="disc-psy-banner-sub">Ambient · Downtempo · Electronica — svensk label av Sync24</div>
        </div>
      </div>

      <div class="disc-psy-section">
        <div class="disc-psy-section-hdr">
          <span class="disc-psy-section-icon">${Icon('moon')}</span>
          <span class="disc-psy-section-title">About Leftfield Records</span>
          <span class="disc-psy-section-badge">lftfld.se</span>
        </div>
        <div class="disc-psy-label-grid" style="grid-template-columns:1fr">
          <a class="disc-psy-label-card" href="https://www.lftfld.se/" target="_blank" rel="noopener noreferrer"
             style="gap:1.2rem;align-items:flex-start;border-color:rgba(80,100,200,0.35);background:rgba(5,8,26,0.5)">
            <div class="disc-psy-label-icon" style="font-size:2.5rem">${Icon('moon')}</div>
            <div style="flex:1">
              <div class="disc-psy-label-name" style="font-size:1.1rem;margin-bottom:0.35rem">Leftfield Records</div>
              <div class="disc-psy-label-desc" style="line-height:1.6">
                Leftfield Records is a Swedish record label started by Daniel Vadestrid (aka Sync24),
                focused on the projects the founder himself is involved in — first and foremost Carbon Based
                Lifeforms, Sync24 and T.S.R. Deep, atmospheric ambient and downtempo electronica.
                It started as a purely digital label, but expanded in 2018 to also release on CD and vinyl.
              </div>
              <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:0.75rem">
                <span class="disc-psy-section-badge">${iconForEmoji('🌙')} Ambient</span>
                <span class="disc-psy-section-badge">${Icon('waves')} Downtempo</span>
                <span class="disc-psy-section-badge">${Icon('atom')} Electronica</span>
                <span class="disc-psy-section-badge">🇸🇪 Sweden</span>
              </div>
            </div>
            <span class="disc-psy-mix-arrow" style="align-self:center">${Icon('arrow-right')}</span>
          </a>
        </div>
      </div>

      <div class="disc-psy-section">
        <div class="disc-psy-section-hdr">
          <span class="disc-psy-section-icon">${Icon('users')}</span>
          <span class="disc-psy-section-title">Prosjekt &amp; artists</span>
          <span class="disc-psy-section-badge">lftfld.se</span>
        </div>
        <div class="disc-psy-label-grid">
          ${PROJECTS.map(r => `
            <a class="disc-psy-label-card" href="https://www.lftfld.se/" target="_blank" rel="noopener noreferrer">
              <div class="disc-psy-label-icon">${iconForEmoji(r.emoji)}</div>
              <div>
                <div class="disc-psy-label-name">${escHtml(r.name)}</div>
                <div class="disc-psy-label-desc">${escHtml(r.artist)}</div>
              </div>
            </a>`).join('')}
        </div>
      </div>

      <div class="disc-psy-section">
        <div class="disc-psy-section-hdr">
          <span class="disc-psy-section-icon">${Icon('link')}</span>
          <span class="disc-psy-section-title">Find Leftfield</span>
        </div>
        <div class="disc-psy-label-grid">
          ${LINKS.map(psyLinkCard).join('')}
        </div>
      </div>
    `;
  }

  function renderKukanDubTab() {
    const LINKS = [
      { emoji: '🎵', name: 'Searching for a Fogbow — Bandcamp', desc: 'Stream and buy the album on Bandcamp',              url: 'https://kukan-dub-lagan.bandcamp.com/album/searching-for-a-fogbow' },
      { emoji: '🌐', name: 'Kukan Dub Lagan / Bandcamp',        desc: 'The full discography — all albums and singles',       url: 'https://kukan-dub-lagan.bandcamp.com/' },
    ];
    return `
      <div class="disc-psy-banner" style="background:linear-gradient(135deg,#071a0f,#0d2b1a,#071a0f)">
        <div class="disc-psy-banner-emoji">${Icon('cloud')}</div>
        <div>
          <div class="disc-psy-banner-title">Kukan Dub Lagan</div>
          <div class="disc-psy-banner-sub">Atmospheric dub, chill and experimental electronica</div>
        </div>
      </div>

      <div class="disc-psy-section">
        <div class="disc-psy-section-hdr">
          <span class="disc-psy-section-icon">${Icon('cloud')}</span>
          <span class="disc-psy-section-title">About Kukan Dub Lagan</span>
          <span class="disc-psy-section-badge">Bandcamp</span>
        </div>
        <div class="disc-psy-label-grid" style="grid-template-columns:1fr">
          <a class="disc-psy-label-card" href="https://kukan-dub-lagan.bandcamp.com/album/searching-for-a-fogbow"
             target="_blank" rel="noopener noreferrer"
             style="gap:1.2rem;align-items:flex-start;border-color:rgba(60,160,80,0.3);background:rgba(5,20,10,0.5)">
            <div class="disc-psy-label-icon" style="font-size:2.5rem">${Icon('cloud')}</div>
            <div style="flex:1">
              <div class="disc-psy-label-name" style="font-size:1.1rem;margin-bottom:0.35rem">Searching for a Fogbow</div>
              <div class="disc-psy-label-desc" style="line-height:1.6">
                Kukan Dub Lagan makes atmospheric and deep electronica at the intersection of
                dub, chill and experimental music. «Searching for a Fogbow» is a beautiful
                and poetic album that takes you on a calm inner journey — perfect for the quiet
                hours where the music melts together with your thoughts.
              </div>
              <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:0.75rem">
                <span class="disc-psy-section-badge">${Icon('leaf')} Chill</span>
                <span class="disc-psy-section-badge">${Icon('sliders')} Dub</span>
                <span class="disc-psy-section-badge">${Icon('cloud')} Atmospheric</span>
                <span class="disc-psy-section-badge">${Icon('flask')} Experimental</span>
              </div>
            </div>
            <span class="disc-psy-mix-arrow" style="align-self:center">${Icon('arrow-right')}</span>
          </a>
        </div>
      </div>

      <div class="disc-psy-section">
        <div class="disc-psy-section-hdr">
          <span class="disc-psy-section-icon">${Icon('link')}</span>
          <span class="disc-psy-section-title">Find Kukan Dub Lagan</span>
        </div>
        <div class="disc-psy-label-grid">
          ${LINKS.map(psyLinkCard).join('')}
        </div>
      </div>
    `;
  }

  function renderShunyataTab() {
    const RELEASES = [
      { emoji: '🕊', title: 'VA — Active Meditation in the Memory of Goa Gil', desc: 'Tribute compilation in memory of Goa Gil — deep ritual Goa Trance from around the world', url: 'https://shunyatarecords.bandcamp.com/album/va-active-meditation-in-the-memory-of-goa-gil' },
      { emoji: '🌌', title: 'The entire catalogue', desc: 'All releases from Shunyata Records on Bandcamp — stream and download', url: 'https://shunyatarecords.bandcamp.com/' },
    ];
    return `
      <div class="disc-psy-banner" style="background:linear-gradient(135deg,#050510,#0d0d2e,#150d3a)">
        <div class="disc-psy-banner-emoji">${Icon('sparkles')}</div>
        <div>
          <div class="disc-psy-banner-title">Shunyata Records</div>
          <div class="disc-psy-banner-sub">Deep, ritual and meditative Goa Trance — from the underground to the world</div>
        </div>
      </div>

      <div class="disc-psy-section">
        <div class="disc-psy-section-hdr">
          <span class="disc-psy-section-icon">${Icon('sparkles')}</span>
          <span class="disc-psy-section-title">About Shunyata Records</span>
          <span class="disc-psy-section-badge">shunyatarecords.bandcamp.com</span>
        </div>
        <div class="disc-psy-label-grid" style="grid-template-columns:1fr">
          <a class="disc-psy-label-card" href="https://shunyatarecords.bandcamp.com/" target="_blank" rel="noopener noreferrer"
             style="gap:1.2rem;align-items:flex-start;border-color:rgba(80,60,160,0.4);background:rgba(10,5,30,0.5)">
            <div class="disc-psy-label-icon" style="font-size:2.5rem">${Icon('sparkles')}</div>
            <div style="flex:1">
              <div class="disc-psy-label-name" style="font-size:1.1rem;margin-bottom:0.35rem">Shunyata Records</div>
              <div class="disc-psy-label-desc" style="line-height:1.6">
                Shunyata Records is a record label dedicated to deep, ritual and meditative psychedelic
                music in the Goa Trance tradition. The name «Shunyata» comes from Sanskrit and means emptiness
                or openness — the open, conscious state the music invites you into.
                Check the entire catalogue and the latest releases on Bandcamp.
              </div>
              <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:0.75rem">
                <span class="disc-psy-section-badge">${Icon('sparkles')} Goa Trance</span>
                <span class="disc-psy-section-badge">${Icon('user')} Meditation</span>
                <span class="disc-psy-section-badge">${Icon('drum')} Ritual</span>
                <span class="disc-psy-section-badge">${Icon('feather')} Goa Gil</span>
              </div>
            </div>
            <span class="disc-psy-mix-arrow" style="align-self:center">${Icon('arrow-right')}</span>
          </a>
        </div>
      </div>

      <div class="disc-psy-section">
        <div class="disc-psy-section-hdr">
          <span class="disc-psy-section-icon">${Icon('disc')}</span>
          <span class="disc-psy-section-title">Releases</span>
        </div>
        <div class="disc-psy-label-grid">
          ${RELEASES.map(r => `
            <a class="disc-psy-label-card" href="${escHtml(r.url)}" target="_blank" rel="noopener noreferrer">
              <div class="disc-psy-label-icon">${iconForEmoji(r.emoji)}</div>
              <div>
                <div class="disc-psy-label-name">${escHtml(r.title)}</div>
                <div class="disc-psy-label-desc">${escHtml(r.desc)}</div>
              </div>
            </a>
          `).join('')}
        </div>
      </div>

      <div class="disc-psy-section">
        <div class="disc-psy-section-hdr">
          <span class="disc-psy-section-icon">${Icon('star')}</span>
          <span class="disc-psy-section-title">Upcoming shows / events</span>
        </div>
        <div class="disc-psy-label-grid" style="grid-template-columns:1fr">
          <div class="disc-psy-label-card" style="cursor:default;border-color:rgba(80,60,160,0.3)">
            <div class="disc-psy-label-icon">${Icon('globe')}</div>
            <div>
              <div class="disc-psy-label-name">Follow Shunyata Records for upcoming shows</div>
              <div class="disc-psy-label-desc">Check Bandcamp for the latest news on releases and events</div>
            </div>
          </div>
        </div>
        <a class="disc-psy-cal-link" href="https://shunyatarecords.bandcamp.com/" target="_blank" rel="noopener noreferrer">
          Go to Shunyata Records on Bandcamp ${Icon('arrow-right')}
        </a>
      </div>
    `;
  }

  function renderYoungerBrotherTab() {
    const ALBUMS = [
      { year: '2003', title: 'A Flock of Bleeps',          desc: 'Debut — surrealism and psychedelic electronica. «The Fruiting Body», «Vaccine»' },
      { year: '2007', title: 'The Last Days of Gravity',   desc: 'Darker and more rock-inspired. «Sleepy Steeple», «Ribbon on a Branch»' },
      { year: '2011', title: 'FFWD>>',                     desc: 'Energetic and psychedelic rave. «Shine», «Train», «Psychic Gibbon»' },
      { year: '2015', title: 'Vaccine',                    desc: 'Mature and beautiful — electronica, ambient, psybient. «Step Into the Light»' },
    ];
    const SHOWS = [
      { date: 'TBA 2026', name: 'Ozora Festival', loc: 'Hungary 🇭🇺', url: 'https://ozorafestival.eu/' },
      { date: 'TBA 2026', name: 'Boom Festival',  loc: 'Portugal 🇵🇹', url: 'https://www.boomfestival.org/' },
    ];
    const LINKS = [
      { emoji: '🎵', name: 'Bandcamp',   desc: 'Stream and buy the entire discography',              url: 'https://youngerbrothermusic.bandcamp.com/music' },
      { emoji: '🌐', name: 'Website',   desc: 'Official website — news and tour',           url: 'https://www.youngerbrothermusic.com/' },
      { emoji: '☁️', name: 'SoundCloud', desc: 'Mixes and tracks for free',                         url: 'https://soundcloud.com/younger-brother-music' },
      { emoji: '▶',  name: 'YouTube',    desc: 'Music videos and live recordings',                   url: 'https://www.youtube.com/@YoungerBrotherMusic' },
    ];
    return `
      <div class="disc-psy-banner" style="background:linear-gradient(135deg,#0a1a2e,#122840,#1a3a5c)">
        <div class="disc-psy-banner-emoji">${Icon('atom')}</div>
        <div>
          <div class="disc-psy-banner-title">Younger Brother</div>
          <div class="disc-psy-banner-sub">Simon Posford + Benji Vaughan — psychedelic electronica and rave since 2001</div>
        </div>
      </div>

      <div class="disc-psy-section">
        <div class="disc-psy-section-hdr">
          <span class="disc-psy-section-icon">${Icon('atom')}</span>
          <span class="disc-psy-section-title">About Younger Brother</span>
          <span class="disc-psy-section-badge">Bandcamp</span>
        </div>
        <div class="disc-psy-label-grid" style="grid-template-columns:1fr">
          <a class="disc-psy-label-card" href="https://youngerbrothermusic.bandcamp.com/music" target="_blank" rel="noopener noreferrer"
             style="gap:1.2rem;align-items:flex-start">
            <div class="disc-psy-label-icon" style="font-size:2.5rem">${Icon('atom')}</div>
            <div style="flex:1">
              <div class="disc-psy-label-name" style="font-size:1.1rem;margin-bottom:0.35rem">Younger Brother — A Flock of Bleeps</div>
              <div class="disc-psy-label-desc" style="line-height:1.6">
                Younger Brother is a psychedelic electronica project by Simon Posford (Hallucinogen, Shpongle)
                and Benji Vaughan. Their music spans from surrealism and experimental electronica
                to deep ambient and rave — always with a distinct psychedelic and humorous edge.
                Explore the entire discography on Bandcamp.
              </div>
              <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:0.75rem">
                <span class="disc-psy-section-badge">${Icon('atom')} Psychedelic</span>
                <span class="disc-psy-section-badge">${Icon('sliders')} Electronica</span>
                <span class="disc-psy-section-badge">${Icon('zap')} Rave</span>
                <span class="disc-psy-section-badge">${Icon('sliders')} Simon Posford</span>
              </div>
            </div>
            <span class="disc-psy-mix-arrow" style="align-self:center">${Icon('arrow-right')}</span>
          </a>
        </div>
      </div>

      <div class="disc-psy-section">
        <div class="disc-psy-section-hdr">
          <span class="disc-psy-section-icon">${Icon('disc')}</span>
          <span class="disc-psy-section-title">Discography</span>
          <span class="disc-psy-section-badge">2003–2015</span>
        </div>
        <div class="disc-psy-mix-grid">
          ${ALBUMS.map(a => `
            <div class="disc-psy-mix-card yt-clickable" role="button" tabindex="0" title="Search on YouTube"
                 onclick="Discover.openYt('${escHtml(a.title + ' Younger Brother').replace(/'/g,'&#39;')}')"
                 onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();Discover.openYt('${escHtml(a.title + ' Younger Brother').replace(/'/g,'&#39;')}')}">
              <div class="disc-psy-mix-thumb" style="background:linear-gradient(135deg,#122840,#1a3a5c);font-size:1.2rem">${Icon('atom')}</div>
              <div class="disc-psy-mix-info">
                <div class="disc-psy-mix-title">${escHtml(a.title)} <span style="opacity:0.6;font-size:0.8em">(${escHtml(a.year)})</span></div>
                <div class="disc-psy-mix-artist">${escHtml(a.desc)}</div>
              </div>
              <span class="yt-clickable-go">${Icon('search')}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="disc-psy-section">
        <div class="disc-psy-section-hdr">
          <span class="disc-psy-section-icon">${Icon('star')}</span>
          <span class="disc-psy-section-title">Upcoming shows 2026</span>
        </div>
        <div class="disc-psy-festival-list">
          ${SHOWS.map(s => `
            <a class="disc-psy-festival-card" href="${escHtml(s.url)}" target="_blank" rel="noopener noreferrer">
              <div class="disc-psy-festival-date">
                <div class="disc-psy-festival-date-day">TBA</div>
                <div class="disc-psy-festival-date-mon">2026</div>
              </div>
              <div class="disc-psy-festival-body">
                <div class="disc-psy-festival-name">${escHtml(s.name)}</div>
                <div class="disc-psy-festival-loc">${s.loc}</div>
                <div class="disc-psy-festival-tags">
                  <span class="disc-psy-festival-tag disc-psy-festival-upcoming">Upcoming</span>
                  <span class="disc-psy-festival-tag">${Icon('atom')} Younger Brother</span>
                </div>
              </div>
              <span class="disc-psy-festival-arrow">${Icon('arrow-right')}</span>
            </a>
          `).join('')}
        </div>
      </div>

      <div class="disc-psy-section">
        <div class="disc-psy-section-hdr">
          <span class="disc-psy-section-icon">${Icon('link')}</span>
          <span class="disc-psy-section-title">Find Younger Brother</span>
        </div>
        <div class="disc-psy-label-grid">
          ${LINKS.map(psyLinkCard).join('')}
        </div>
      </div>
    `;
  }

  function renderShpongleTab() {
    const ALBUMS = [
      { year: '1998', title: 'Are You Shpongled?',                   desc: 'The debut album — founded the psybient genre. «Divine Moments of Truth», «Shpongle Falls»' },
      { year: '2001', title: 'Tales of the Inexpressible',           desc: 'Deeper and more organic — «Shpongle Falls» and «My Head Feels Like a Frisbee»' },
      { year: '2005', title: 'Nothing Lasts... But Nothing Is Lost', desc: 'An ambitious double album — 22 tracks, 73 min. A journey through consciousness and transformation' },
      { year: '2009', title: 'Ineffable Mysteries from Shpongleland', desc: 'Live-inspired studio — «Ineffable Mysteries», «The Stamen of the Shaman»' },
      { year: '2013', title: 'Museum of Consciousness',              desc: 'Mature and cinematic. «How the Jellyfish Jumped Up the Mountain», «Further Adventures in Shpongleland»' },
      { year: '2017', title: 'Codex VI',                             desc: 'The last studio album — hypnotic and deep psybient. «Juggling Molecules», «Qualia»' },
    ];
    const LINKS = [
      { emoji: '🌐', name: 'shponglemusic.com',    desc: 'Official website — music, news and tour',    url: 'https://www.shponglemusic.com/' },
      { emoji: '📀', name: 'Bandcamp',             desc: 'Stream and buy the entire discography',                 url: 'https://shpongle.bandcamp.com/' },
      { emoji: '☁️', name: 'SoundCloud',           desc: 'Mixes and tracks for free',                           url: 'https://soundcloud.com/shpongle' },
      { emoji: '▶',  name: 'YouTube',              desc: 'Official channel — live sets and music videos',        url: 'https://www.youtube.com/@ShpongleOfficial' },
    ];
    return `
      <div class="disc-psy-banner" style="background:linear-gradient(135deg,#0d0829,#1a0b3d,#2a0d5e,#0d0829)">
        <div class="disc-psy-banner-emoji">${Icon('sparkles')}</div>
        <div>
          <div class="disc-psy-banner-title">Shpongle</div>
          <div class="disc-psy-banner-sub">Raja Ram + Simon Posford — verdas mest kjende psybient-prosjekt sidan 1998</div>
        </div>
      </div>

      <div class="disc-psy-section">
        <div class="disc-psy-section-hdr">
          <span class="disc-psy-section-icon">${Icon('sparkles')}</span>
          <span class="disc-psy-section-title">About Shpongle</span>
          <span class="disc-psy-section-badge">shponglemusic.com</span>
        </div>
        <div class="disc-psy-label-grid" style="grid-template-columns:1fr">
          <a class="disc-psy-label-card" href="https://www.shponglemusic.com/" target="_blank" rel="noopener noreferrer"
             style="gap:1.2rem;align-items:flex-start">
            <div class="disc-psy-label-icon" style="font-size:2.5rem">${Icon('sparkles')}</div>
            <div style="flex:1">
              <div class="disc-psy-label-name" style="font-size:1.1rem;margin-bottom:0.35rem">Shpongle — Are You Shpongled?</div>
              <div class="disc-psy-label-desc" style="line-height:1.6">
                Shpongle is a psybient project by Raja Ram and Simon Posford (Hallucinogen),
                founded in 1996. With their unique fusion of world music, psychedelic trance,
                ambient and organic instruments, they have defined and shaped the entire psybient genre.
                From the iconic debut «Are You Shpongled?» (1998) to «Codex VI» (2017) —
                a journey through consciousness and the impossible to put into words.
              </div>
              <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:0.75rem">
                <span class="disc-psy-section-badge">${Icon('sparkles')} Psybient</span>
                <span class="disc-psy-section-badge">${Icon('waves')} Psychill</span>
                <span class="disc-psy-section-badge">${Icon('globe')} World music</span>
                <span class="disc-psy-section-badge">${Icon('crown')} Raja Ram</span>
                <span class="disc-psy-section-badge">${Icon('sliders')} Simon Posford</span>
              </div>
            </div>
            <span class="disc-psy-mix-arrow" style="align-self:center">${Icon('arrow-right')}</span>
          </a>
        </div>
      </div>

      <div class="disc-psy-section">
        <div class="disc-psy-section-hdr">
          <span class="disc-psy-section-icon">${Icon('disc')}</span>
          <span class="disc-psy-section-title">Discography</span>
          <span class="disc-psy-section-badge">1998–2017</span>
        </div>
        <div class="disc-psy-mix-grid">
          ${ALBUMS.map(a => `
            <div class="disc-psy-mix-card yt-clickable" role="button" tabindex="0" title="Search on YouTube"
                 onclick="Discover.openYt('${escHtml(a.title + ' Shpongle').replace(/'/g,'&#39;')}')"
                 onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();Discover.openYt('${escHtml(a.title + ' Shpongle').replace(/'/g,'&#39;')}')}">
              <div class="disc-psy-mix-thumb" style="background:linear-gradient(135deg,#1a0b3d,#2a0d5e);font-size:1.2rem">${Icon('sparkles')}</div>
              <div class="disc-psy-mix-info">
                <div class="disc-psy-mix-title">${escHtml(a.title)} <span style="opacity:0.6;font-size:0.8em">(${escHtml(a.year)})</span></div>
                <div class="disc-psy-mix-artist">${escHtml(a.desc)}</div>
              </div>
              <span class="yt-clickable-go">${Icon('search')}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="disc-psy-section">
        <div class="disc-psy-section-hdr">
          <span class="disc-psy-section-icon">${Icon('link')}</span>
          <span class="disc-psy-section-title">Find Shpongle</span>
        </div>
        <div class="disc-psy-label-grid">
          ${LINKS.map(psyLinkCard).join('')}
        </div>
      </div>
    `;
  }

  function renderAstralTab() {
    const ALBUMS = [
      { year: '1993', title: 'Trust in Trance',   desc: 'The debut album — iconic Goa trance, Trust in Trance Records' },
      { year: '1997', title: 'Another World',      desc: 'Classic psytrance — "People Can Fly", "Mahadeva"' },
      { year: '1997', title: 'Dancing Galaxy',     desc: 'One of the most influential psytrance albums ever' },
      { year: '1998', title: 'People Can Fly',     desc: 'A summary of early hits — euphoric and dreamy Goa' },
      { year: '1999', title: 'Amen',               desc: 'Darker and more progressive direction' },
      { year: '2001', title: 'A Way of Life',      desc: 'A clear melodic style, strong radio psytrance' },
      { year: '2010', title: 'Ten',                desc: 'A comeback album — modern production, classic Astral spirit' },
      { year: '2016', title: 'Quantum',            desc: 'The last studio album — a blend of Goa heritage and new psytrance' },
    ];
    const CLASSICS = [
      'Mahadeva', 'People Can Fly', 'Dancing Galaxy', 'Enlightened Evolution',
      'Kabalah', 'Life on Mars', 'Trust in Trance', 'Flying into a Star',
      'Run from the City', 'Liquid Sun', 'The Sun', 'Nilaya',
    ];
    return `
      <div class="disc-psy-banner" style="background:linear-gradient(135deg,#0a1628,#0e2244,#0a1628)">
        <div class="disc-psy-banner-emoji">${Icon('star')}</div>
        <div>
          <div class="disc-psy-banner-title">Astral Projection</div>
          <div class="disc-psy-banner-sub">Goa Trance · Psytrance — Avi Nissim & Lior Perlmutter · Trust in Trance Records</div>
        </div>
      </div>

      <div class="disc-psy-section">
        <div class="disc-psy-section-hdr">
          <span class="disc-psy-section-icon">${Icon('star')}</span>
          <span class="disc-psy-section-title">About Astral Projection</span>
          <span class="disc-psy-section-badge">astral-projection.com</span>
        </div>
        <div class="disc-psy-label-grid" style="grid-template-columns:1fr">
          <a class="disc-psy-label-card" href="https://www.astral-projection.com/" target="_blank" rel="noopener noreferrer"
             style="gap:1.2rem;align-items:flex-start">
            <div class="disc-psy-label-icon" style="font-size:2.5rem">${Icon('star')}</div>
            <div style="flex:1">
              <div class="disc-psy-label-name" style="font-size:1.1rem;margin-bottom:0.35rem">Astral Projection — Avi Nissim & Lior Perlmutter</div>
              <div class="disc-psy-label-desc" style="line-height:1.6">
                One of the most iconic and influential Goa Trance and psytrance bands ever.
                Israeli duo Avi Nissim and Lior Perlmutter have shaped the Goa scene since the early 1990s.
                Their classic albums "Dancing Galaxy", "Another World" and "People Can Fly" are
                reference points for the entire psytrance universe. Their own label: Trust in Trance Records.
              </div>
              <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:0.75rem">
                <span class="disc-psy-section-badge">${Icon('star')} Goa Trance</span>
                <span class="disc-psy-section-badge">${Icon('wind')} Psytrance</span>
                <span class="disc-psy-section-badge">🇮🇱 Israel</span>
                <span class="disc-psy-section-badge">${Icon('music')} Since 1991</span>
              </div>
            </div>
            <span class="disc-psy-mix-arrow" style="align-self:center">${Icon('arrow-right')}</span>
          </a>
        </div>
      </div>

      <div class="disc-psy-section">
        <div class="disc-psy-section-hdr">
          <span class="disc-psy-section-icon">${Icon('disc')}</span>
          <span class="disc-psy-section-title">Discography</span>
          <span class="disc-psy-section-badge">${ALBUMS.length} studio albums</span>
        </div>
        <div class="disc-psy-label-grid">
          ${ALBUMS.map(a => `
            <div class="disc-psy-label-card">
              <div class="disc-psy-label-icon" style="font-size:0.9rem;font-weight:700;min-width:2.5rem;text-align:center;color:#38bdf8">${a.year}</div>
              <div>
                <div class="disc-psy-label-name">${escHtml(a.title)}</div>
                <div class="disc-psy-label-desc">${escHtml(a.desc)}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="disc-psy-section">
        <div class="disc-psy-section-hdr">
          <span class="disc-psy-section-icon">${Icon('music')}</span>
          <span class="disc-psy-section-title">Classic tracks</span>
        </div>
        <div class="hadra-artist-grid">
          ${CLASSICS.map(t => `<span class="hadra-artist-pill">${Icon('star')} ${escHtml(t)}</span>`).join('')}
        </div>
      </div>

      <div class="disc-psy-section">
        <div class="disc-psy-section-hdr">
          <span class="disc-psy-section-icon">${Icon('link')}</span>
          <span class="disc-psy-section-title">Find Astral Projection</span>
        </div>
        <div class="disc-psy-label-grid">
          <a class="disc-psy-label-card" href="https://www.astral-projection.com/" target="_blank" rel="noopener noreferrer">
            <div class="disc-psy-label-icon">${Icon('globe')}</div>
            <div><div class="disc-psy-label-name">astral-projection.com</div><div class="disc-psy-label-desc">Official website — media, events and music</div></div>
          </a>
          <a class="disc-psy-label-card" href="https://www.facebook.com/astralprojectionofficial" target="_blank" rel="noopener noreferrer">
            <div class="disc-psy-label-icon">f</div>
            <div><div class="disc-psy-label-name">Facebook</div><div class="disc-psy-label-desc">News and live updates</div></div>
          </a>
          <a class="disc-psy-label-card" href="https://www.instagram.com/astralprojection/" target="_blank" rel="noopener noreferrer">
            <div class="disc-psy-label-icon">${Icon('camera')}</div>
            <div><div class="disc-psy-label-name">Instagram</div><div class="disc-psy-label-desc">Photos, artwork and updates</div></div>
          </a>
          ${ytFindCard('https://www.youtube.com/user/astralprojection1', 'Music videos and live sets')}
        </div>
      </div>
    `;
  }

  function editorialCards() {
    const cards = [
      { emoji:'🌌', title:'Drone Zone Essentials', desc:'Artists, labels and demo contacts',          action: () => `Discover.openDroneZone()`, highlight: true, droneStyle: true },
      { emoji:'⚡', title:'Techno Underground',    desc:'Artists, events and demos — England & Ibiza',      action: () => `Router.go('/underground')`, highlight: true },
      { emoji:'🌿', title:'Chill Afternoon',       desc:'Downtempo & lounge for everyday',                 action: () => `Discover.openChillRadio()`, highlight: true },
    ];
    return cards.map(c => `
      <div class="disc-editorial-card${c.highlight ? (c.droneStyle ? ' disc-editorial-card--drone' : c.psyStyle ? ' disc-editorial-card--psy' : ' disc-editorial-card--ug') : ''}" onclick="${c.action()}">
        <div class="disc-editorial-art">${iconForEmoji(c.emoji)}</div>
        <div class="disc-editorial-title">${c.title}</div>
        <div class="disc-editorial-desc">${c.desc}</div>
        ${c.highlight ? `<div class="disc-editorial-cta">Explore ${Icon('arrow-right')}</div>` : ''}
      </div>
    `).join('');
  }

  // ── Drone Zone ────────────────────────────────────────────────────────
  function renderDroneZone() {
    function linkBtn(href, icon, label, cls) {
      return `<a class="dz-link-btn dz-link-btn--${cls}" href="${escHtml(href)}" target="_blank" rel="noopener">${icon} ${escHtml(label)}</a>`;
    }

    const artistsHtml = DRONE_ARTISTS.map(a => `
      <div class="dz-artist-card">
        <div class="dz-artist-header">
          <span class="dz-artist-name">${escHtml(a.name)}</span>
          <span class="dz-artist-badge">${escHtml(a.country)}</span>
          <span class="dz-artist-badge dz-artist-badge--label">${escHtml(a.label)}</span>
        </div>
        <p class="dz-artist-bio">${escHtml(a.bio)}</p>
        <div class="dz-artist-albums">
          ${a.albums.map(al => `<span class="dz-album-pill">${escHtml(al)}</span>`).join('')}
        </div>
        <div class="dz-artist-links">
          ${a.bandcamp ? linkBtn(a.bandcamp, Icon('music'), 'Bandcamp', 'bc') : ''}
          ${a.youtube  ? linkBtn(a.youtube,  Icon('play'), 'YouTube',  'yt') : ''}
          ${a.facebook ? linkBtn(a.facebook, 'f', 'Facebook', 'fb') : ''}
          ${a.website  ? linkBtn(a.website,  Icon('globe'), 'Website', 'web') : ''}
        </div>
        ${a.youtube ? ytSearchBar('Search ' + a.name + ' on YouTube…') : ''}
      </div>
    `).join('');

    const labelsHtml = DRONE_LABELS.map(l => `
      <div class="dz-label-card">
        <div class="dz-label-header">
          <span class="dz-label-flag">${l.flag}</span>
          <span class="dz-label-name">${escHtml(l.name)}</span>
          <span class="dz-label-meta">${escHtml(l.country)} · est. ${escHtml(l.founded)}</span>
        </div>
        <p class="dz-label-desc">${escHtml(l.desc)}</p>
        <p class="dz-label-artists">${Icon('mic')} ${escHtml(l.artists)}</p>
        <div class="dz-label-links">
          ${l.website  ? linkBtn(l.website,  '🌐', 'Website', 'web') : ''}
          ${l.bandcamp ? linkBtn(l.bandcamp, '🎵', 'Bandcamp', 'bc') : ''}
          ${l.facebook ? linkBtn(l.facebook, 'f', 'Facebook', 'fb') : ''}
          ${l.youtube  ? linkBtn(l.youtube,  '▶', 'YouTube',  'yt') : ''}
        </div>
        ${l.youtube ? ytSearchBar('Search ' + l.name + ' on YouTube…') : ''}
        <div class="dz-demo-box">
          <div class="dz-demo-title">${Icon('mail')} Send demo</div>
          <div class="dz-demo-contact">${escHtml(l.demoContact)}</div>
          <div class="dz-demo-note">${escHtml(l.demoNote)}</div>
        </div>
      </div>
    `).join('');

    return `
      <div class="dz-wrap">
        <div class="dz-hero">
          <button class="dz-back-btn" onclick="Discover.closeDroneZone()">${Icon('arrow-left')} Back</button>
          <div class="dz-hero-title">${Icon('sparkles')} Drone Zone Essentials</div>
          <div class="dz-hero-sub">Dark Ambient · Ritual Drone · Atmospheric</div>
          <div class="dz-hero-tags">
            <span class="dz-hero-tag">Cryo Chamber</span>
            <span class="dz-hero-tag">Cyclic Law</span>
            <span class="dz-hero-tag">Bandcamp</span>
            <span class="dz-hero-tag">Demo contacts</span>
          </div>
        </div>

        <div class="dz-section">
          <div class="dz-section-header">
            <h2 class="dz-section-title">${Icon('mic')} Artists</h2>
            <span class="dz-section-count">${DRONE_ARTISTS.length} artists</span>
          </div>
          <div class="dz-artists-grid">${artistsHtml}</div>
        </div>

        <div class="dz-section">
          <div class="dz-section-header">
            <h2 class="dz-section-title">${Icon('music')} Labels</h2>
            <span class="dz-section-count">${DRONE_LABELS.length} labels</span>
          </div>
          <div class="dz-artists-grid">${labelsHtml}</div>
        </div>

        <div id="disc-drone-fresh"></div>
      </div>
    `;
  }

  // «Chill Afternoon»-kortet: dei andre editorial-korta navigerer ein stad, men dette
  // kalla berre setGenre('chill'). Korta viser seg berre når det ikkje finst spor, og då
  // finst heller ikkje #disc-track-grid — så klikket gjorde ingenting synleg. Send brukaren
  // til radiosida sin Chill Out / Downtempo-bolk i staden.
  function openChillRadio() {
    if (window.Router) Router.go('/radio');
    setTimeout(() => { try { Radio.focusCategory('Chill Out / Downtempo'); } catch (e) {} }, 80);
  }

  let _droneSavedHTML = null;
  function openDroneZone() {
    droneZoneOpen = true;
    // Switch to tracks sub-tab so the content area is visible
    if (activeSubTab !== 'tracks') switchSubTab('tracks');
    const content = document.getElementById('disc-tracks-content');
    if (content) {
      // Ta vare på det opphavlege spor-innhaldet (grid + editorial) så «Tilbake»
      // kan gjenopprette det — renderDroneZone() slettar #disc-track-grid heilt.
      if (_droneSavedHTML == null) _droneSavedHTML = content.innerHTML;
      content.innerHTML = renderDroneZone();
      // Discover hadde ingen AI-rotasjon i det heile teke — dette er det første
      // «Fresh from the web»-innslaget her, same kjelde/mønster som Magazine/World.
      if (typeof AIFresh !== 'undefined') {
        AIFresh.reset();
        AIFresh.mount({ id: 'disc-drone-fresh', genre: 'dark-drone',
          title: 'Fresh from the web', emoji: '🌑', limit: 3 });
      }
    }
  }

  // Gjenopprettar spor-innhaldet (grid + editorial + sjangerpanel) etter Drone Zone.
  function restoreTracksContent() {
    const content = document.getElementById('disc-tracks-content');
    if (content && _droneSavedHTML != null) {
      content.innerHTML = _droneSavedHTML;
      _droneSavedHTML = null;
    }
  }

  function closeDroneZone() {
    droneZoneOpen = false;
    restoreTracksContent();
    setGenre('drone');
  }

  // Ren visuell rotasjon (flash + flytt første nederst) på de ekte
  // oppføringene som allerede står i feeden — henter ikke inn nytt innhold,
  // bare gir følelsen av bevegelse mellom faktiske sideoppdateringer.
  function startActivityScroll() {
    clearInterval(activityTimer);
    activityTimer = setInterval(() => {
      const feed = document.getElementById('disc-activity-feed');
      if (!feed) { clearInterval(activityTimer); return; }
      const items = feed.querySelectorAll('.disc-activity-item');
      if (items.length < 2) return;
      const item = items[0];
      item.style.transition = 'background 0.4s';
      item.style.background = 'rgba(34,197,94,0.12)';
      setTimeout(() => { item.style.background = ''; }, 700);
      const clone = item.cloneNode(true);
      feed.appendChild(clone);
      feed.removeChild(item);
    }, 6000);
  }

  async function loadPeopleAvatars(users) {
    // Fyll inn hver brukers opplastede banner-/forsidebilde på kortene
    // (kjører parallelt med avatar-lastingen under).
    if (window.Profile && Profile.hydrateBanners) Profile.hydrateBanners();
    // Avatarer via hydrateAvatars (data-av-user) så vi får SKY-tilbakefallet:
    // den gamle lokale lesningen (u.avatarUrl || u.avatarMediaId) viste bare
    // profilbilder som lå i DENNE nettleseren, så andres avatarer manglet på mobil.
    if (window.Profile && Profile.hydrateAvatars) Profile.hydrateAvatars();
  }

  // ── Tab / sub-tab switching ───────────────────────────────────────────
  function switchTab(tab) {
    activeTab = tab;
    // Marker aktiv knapp i menyen via data-tab (robust mot oversatt tekst).
    document.querySelectorAll('.disc-tab-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.tab === tab);
    });
    // Oppdater knappe-etiketten + lukk nedtrekket.
    const cur = TABS.find(t => t.id === tab);
    const lbl = document.getElementById('disc-tab-toggle-label');
    if (cur && lbl) lbl.innerHTML = `${Icon(cur.icon)} ${_tabLabel(cur)}`;
    closeTabMenu();
    document.getElementById('disc-music-tab')?.classList.toggle('hidden', tab !== 'music');
    document.getElementById('disc-people-tab')?.classList.toggle('hidden', tab !== 'people');
    document.getElementById('disc-ambient-mann-tab')?.classList.toggle('hidden', tab !== 'ambient-mann');
    document.getElementById('disc-psybient-tab')?.classList.toggle('hidden', tab !== 'psybient');
    document.getElementById('disc-altar-records-tab')?.classList.toggle('hidden', tab !== 'altar-records');
    document.getElementById('disc-hadra-tab')?.classList.toggle('hidden', tab !== 'hadra');
    document.getElementById('disc-dacru-tab')?.classList.toggle('hidden', tab !== 'dacru');
    document.getElementById('disc-tip-raja-tab')?.classList.toggle('hidden', tab !== 'tip-raja');
    document.getElementById('disc-astral-tab')?.classList.toggle('hidden', tab !== 'astral');
    document.getElementById('disc-shpongle-tab')?.classList.toggle('hidden', tab !== 'shpongle');
    document.getElementById('disc-younger-brother-tab')?.classList.toggle('hidden', tab !== 'younger-brother');
    document.getElementById('disc-shunyata-tab')?.classList.toggle('hidden', tab !== 'shunyata');
    document.getElementById('disc-kukan-dub-tab')?.classList.toggle('hidden', tab !== 'kukan-dub');
    document.getElementById('disc-cosmic-leaf-tab')?.classList.toggle('hidden', tab !== 'cosmic-leaf');
    document.getElementById('disc-cryo-chamber-tab')?.classList.toggle('hidden', tab !== 'cryo-chamber');
    document.getElementById('disc-ultimae-tab')?.classList.toggle('hidden', tab !== 'ultimae');
    document.getElementById('disc-mikelabella-tab')?.classList.toggle('hidden', tab !== 'mikelabella');
    document.getElementById('disc-gagarin-project-tab')?.classList.toggle('hidden', tab !== 'gagarin-project');
    document.getElementById('disc-leftfield-tab')?.classList.toggle('hidden', tab !== 'leftfield');
  }

  function switchSubTab(tab) {
    activeSubTab = tab;
    document.querySelectorAll('.disc-sub-tab').forEach(b => {
      b.classList.toggle('active',
        (tab === 'tracks' && b.textContent.includes('Tracks')) ||
        (tab === 'upload' && b.textContent.includes('Upload')) ||
        (tab === 'radio'  && b.textContent.includes('Radio'))
      );
    });
    const tracksEl = document.getElementById('disc-tracks-content');
    const uploadEl = document.getElementById('disc-upload-content');
    const radioEl  = document.getElementById('disc-radio-content');

    if (tracksEl) tracksEl.classList.toggle('hidden', tab !== 'tracks');
    if (uploadEl) {
      uploadEl.classList.toggle('hidden', tab !== 'upload');
      if (tab === 'upload') uploadEl.innerHTML = renderUploadTab();
    }
    if (radioEl) {
      radioEl.classList.toggle('hidden', tab !== 'radio');
      if (tab === 'radio') radioEl.innerHTML = renderRadioFavTab();
    }
  }

  // ── Genre / role filters ──────────────────────────────────────────────
  function setGenre(tag) {
    activeGenre = tag;

    // Drone Zone erstattar heile spor-innhaldet (og dermed #disc-track-grid),
    // så det må leggjast tilbake før vi teiknar sjangeren.
    if (droneZoneOpen) restoreTracksContent();
    droneZoneOpen = false;

    // Sporet er data-genre, ikkje tekstinnhald — rolle-knappane deler CSS-klasse
    // med sjanger-knappane, og fleire etikettar er delstrengar av kvarandre.
    document.querySelectorAll('.disc-genre-btn[data-genre], .disc-tag-pill[data-genre]').forEach(b => {
      b.classList.toggle('active', b.dataset.genre === tag);
    });

    const tracks = filteredTracks();
    const grid  = document.getElementById('disc-track-grid');
    const count = document.getElementById('disc-count');
    if (grid)  grid.innerHTML  = renderTrackGrid(tracks);
    if (grid)  hydrateEmbeddedArt();
    if (count) count.textContent = `${tracks.length} tracks`;

    // Alltid synleg tilbakemelding, òg for gjester som ikkje har nokon sporgrid.
    const result = document.getElementById('disc-genre-result');
    if (result) result.innerHTML = renderGenreResult();

    // Refresh active sub-tab if it depends on genre
    if (activeSubTab === 'radio') {
      const radioEl = document.getElementById('disc-radio-content');
      if (radioEl) radioEl.innerHTML = renderRadioFavTab();
    }
    if (activeSubTab === 'upload') {
      const sel = document.getElementById('disc-up-genre');
      if (sel && tag !== 'all') sel.value = tag;
    }

    // Update genre radio widget in sidebar
    const radioWrap = document.getElementById('disc-genre-radio-wrap');
    if (radioWrap) radioWrap.innerHTML = renderGenreRadioWidget();

    // Refresh genre tag cloud counts
    const tagCloud = document.querySelector('.disc-tag-cloud');
    if (tagCloud) {
      const cnts = getGenreCounts();
      tagCloud.innerHTML = GENRES.filter(g => g.tag !== 'all').map(g => {
        const cnt = cnts[g.tag] || 0;
        return `<button class="disc-tag-pill ${activeGenre === g.tag ? 'active' : ''}" data-genre="${g.tag}"
          onclick="Discover.setGenre('${g.tag}')">${iconForEmoji(g.emoji)} ${g.label}${cnt > 0 ? `<span class="disc-genre-count">${cnt}</span>` : ''}</button>`;
      }).join('');
    }
  }

  function setRole(tag) {
    activeRole = tag;
    document.querySelectorAll('#disc-role-bar .disc-genre-btn').forEach(b => {
      const role = ROLES.find(r => b.textContent.trim().includes(r.label));
      if (role) b.classList.toggle('active', role.tag === tag);
    });
    const wrap  = document.getElementById('disc-people-wrap');
    const count = document.getElementById('disc-people-count');
    const users = filteredUsers();
    if (wrap)  wrap.innerHTML  = renderPeopleGrid(users);
    if (count) count.textContent = `${users.length} users`;
    loadPeopleAvatars(users);
  }

  // ── Playback ──────────────────────────────────────────────────────────
  async function playTrack(id) {
    try {
      await Player.setQueue([id], 0);
    } catch {
      App.toast('Could not play the track', 'error');
    }
  }

  function wishlist(id) {
    const track = allTracks.find(t => t.id === id);
    if (!track) return;
    App.toast(`"${track.title}" added to wishlist ${Icon('heart')}`, 'info');
    const btn = document.querySelector(`.disc-wishlist-btn[onclick*="${id}"]`);
    if (btn) { btn.textContent = '♥'; btn.style.color = '#ec4899'; }
  }

  // ── Nedlasting ────────────────────────────────────────────────────────
  async function downloadTrack(id) {
    const track = allTracks.find(t => t.id === id);
    if (!track) return;

    if (getPaidDownloads().includes(id)) {
      await doDownload(id, track);
      return;
    }

    if (trackNeedsPayment(track)) {
      pendingDownloadId = id;
      showDownloadModal(track);
      return;
    }

    await doDownload(id, track);
    refreshTrackGrid();
  }

  async function doDownload(id, track) {
    try {
      const rec = await DB.get('music', id);
      if (!rec) { App.toast('File not found', 'error'); return; }
      // Sky-delte spor lagrast utan lokale bytes (berre audioUrl) — hent blob-en frå
      // nettet i staden for å byggje ein øydelagd «undefined»-fil av rec.data.
      let blob;
      if (rec.data) {
        blob = new Blob([rec.data], { type: rec.type || 'audio/mpeg' });
      } else {
        const src = rec.audioUrl || track.audioUrl;
        if (!src) { App.toast('No audio file found to download', 'error'); return; }
        const resp = await fetch(src);
        if (!resp.ok) throw new Error('nedlasting feilet');
        blob = await resp.blob();
      }
      const url  = URL.createObjectURL(blob);
      const ext  = (blob.type || rec.type || 'audio/mpeg').split('/')[1] || 'mp3';
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `${track.artist} - ${track.title}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      App.toast(`"${track.title}" is downloading ${Icon('download')}`, 'success');
    } catch {
      App.toast('Download failed', 'error');
    }
  }

  function showDownloadModal(track) {
    const price = dlPrice(track);
    const mins  = Math.round((track.duration || 0) / 60);

    const existing = document.getElementById('dl-payment-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id    = 'dl-payment-modal';
    modal.className = 'modal-overlay';
    modal.onclick = e => { if (e.target === modal) closeDownloadModal(); };
    modal.innerHTML = `
      <div class="modal-box dl-payment-box">
        <button class="dl-modal-close" onclick="Discover.closeDownloadModal()">${Icon('x')}</button>
        <div class="dl-modal-header">
          <div class="dl-modal-icon">${Icon('lock')}</div>
          <h3 class="dl-modal-title">Download long recording</h3>
          <div class="dl-modal-track-info">
            <strong>${escHtml(track.title)}</strong>
            <span>by ${escHtml(track.artist)}</span>
          </div>
        </div>
        <div class="dl-modal-quota-box">
          <p class="dl-modal-quota-text">
            This recording is <strong>${mins} min</strong> long. Content of
            <strong>60 minutes or more</strong> costs ${price} kr to download.
          </p>
        </div>
        <div class="dl-modal-price-row">
          <div class="dl-modal-price">${price} <span class="dl-modal-currency">kr</span></div>
          <div class="dl-modal-price-sub">one-time payment</div>
        </div>
        <div class="dl-modal-actions">
          <button class="btn btn-primary dl-pay-btn" onclick="Discover.confirmDownloadPayment()">
            ${Icon('credit-card')} Pay ${price} kr and download
          </button>
          <button class="btn btn-ghost" onclick="Discover.closeDownloadModal()">Cancel</button>
        </div>
        <p class="dl-modal-note">
          All music under 60 minutes is free for everyone. Pro artists are always free.
        </p>
      </div>`;
    document.body.appendChild(modal);
  }

  function closeDownloadModal() {
    const m = document.getElementById('dl-payment-modal');
    if (m) m.remove();
    pendingDownloadId = null;
  }

  async function confirmDownloadPayment() {
    const id = pendingDownloadId;
    if (!id) return;
    const track = allTracks.find(t => t.id === id);
    closeDownloadModal();
    if (!track) return;
    markAsPaid(id);
    await doDownload(id, track);
    refreshTrackGrid();
  }

  function refreshTrackGrid() {
    const grid  = document.getElementById('disc-track-grid');
    const count = document.getElementById('disc-count');
    if (grid)  grid.innerHTML  = renderTrackGrid(filteredTracks());
    if (grid)  hydrateEmbeddedArt();
    if (count) count.textContent = `${filteredTracks().length} tracks`;
  }

  // ── Upload ────────────────────────────────────────────────────────────
  function onCategoryChange(sel) {
    const cat  = MAIN_CATEGORIES.find(c => c.tag === sel.value);
    const hint = document.getElementById('disc-up-cat-hint');
    if (!hint) return;
    if (cat && cat.tag && cat.labels.length) {
      hint.textContent = `${cat.labels.length} labels available — you can send a demo after uploading`;
      hint.style.color = 'var(--accent)';
    } else {
      hint.textContent = 'You can always choose a category later from your profile';
      hint.style.color = 'var(--text2)';
    }
  }

  function renderUploadSuccess(title, categoryTag) {
    const cat    = MAIN_CATEGORIES.find(c => c.tag === categoryTag);
    const hasCat = cat && cat.tag && cat.labels.length;
    const user   = Auth.current();
    return `
      <div class="disc-upload-success">
        <div class="disc-up-success-icon">${Icon('check-circle')}</div>
        <h3 class="disc-up-success-title">"${escHtml(title)}" has been added to your profile!</h3>
        <p class="disc-up-success-sub">The track is now visible on your profile and in Discover.</p>

        ${hasCat ? `
        <div class="disc-up-labels-box">
          <div class="disc-up-labels-heading">${Icon('mail')} Send demo to label — ${iconForEmoji(cat.emoji)} ${escHtml(cat.label)}</div>
          <div class="disc-up-labels-list">
            ${cat.labels.map(l => `
              <a class="disc-up-label-btn"
                 href="mailto:${escHtml(l.email)}?subject=${encodeURIComponent('Demo: ' + title)}&body=${encodeURIComponent('Hi,\n\nI would like to send you a demo of the track «' + title + '».\n\nBest regards')}">
                ${escHtml(l.name)}
              </a>
            `).join('')}
          </div>
          <p class="disc-up-labels-note">Opens your email client with a prefilled subject and message</p>
        </div>` : `
        <div class="disc-up-nocat-box">
          <p>No main category selected — go to your profile to choose a category and contact labels.</p>
          <a href="#/edit" class="btn btn-ghost btn-sm" style="margin-top:0.5rem">Go to profile editor ${Icon('arrow-right')}</a>
        </div>`}

        <div class="disc-up-success-actions">
          <a href="#/u/${escHtml(user?.username || '')}" class="btn btn-primary btn-sm">${Icon('user')} My profile</a>
          <button class="btn btn-ghost btn-sm" onclick="Discover.switchSubTab('upload')">${Icon('chevron-up')} Upload more</button>
          <button class="btn btn-ghost btn-sm" onclick="Discover.switchSubTab('tracks')">${Icon('music')} See all tracks</button>
        </div>
      </div>`;
  }

  function onUploadFileChange(input) {
    const file = input.files[0];
    if (!file) return;
    const label = document.getElementById('disc-up-filename');
    const icon  = document.getElementById('disc-up-drop-icon');
    if (label) label.textContent = file.name;
    if (icon)  icon.textContent = '✅';
    const titleInput = document.getElementById('disc-up-title');
    if (titleInput && !titleInput.value) {
      titleInput.value = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
    }
  }

  // Cover-bilde — vis forhåndsvisning straks brukaren vel ein fil.
  function onCoverFileChange(input) {
    const file = input.files[0];
    if (!file) return;
    const img = document.getElementById('disc-up-cover-preview');
    const ph  = document.getElementById('disc-up-cover-placeholder');
    const url = URL.createObjectURL(file);
    if (img) { img.src = url; img.style.display = 'block'; }
    if (ph)  ph.style.display = 'none';
  }

  function getAudioDuration(file) {
    return new Promise(resolve => {
      const url = URL.createObjectURL(file);
      const a = new Audio();
      a.addEventListener('loadedmetadata', () => { URL.revokeObjectURL(url); resolve(Math.round(a.duration)); });
      a.addEventListener('error', () => { URL.revokeObjectURL(url); resolve(0); });
      a.src = url;
    });
  }

  async function uploadDiscTrack() {
    const user = Auth.current();
    if (!user) { App.toast('Log in to upload', 'error'); return; }

    const fileInput = document.getElementById('disc-up-file');
    const file = fileInput?.files[0];
    if (!file) { App.toast('Choose an audio file first', 'error'); return; }

    const coverFile = document.getElementById('disc-up-cover')?.files[0] || null;

    const title    = document.getElementById('disc-up-title')?.value.trim()
                      || file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
    const artist   = document.getElementById('disc-up-artist')?.value.trim() || user.displayName;
    const genre    = document.getElementById('disc-up-genre')?.value
                      || (activeGenre !== 'all' ? activeGenre : 'electronic');
    const desc     = document.getElementById('disc-up-desc')?.value.trim() || '';
    const category = document.getElementById('disc-up-category')?.value || '';
    const isMix    = document.getElementById('disc-up-ismix')?.checked || false;

    const btn = document.getElementById('disc-up-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Uploading…'; }

    try {
      const duration = await getAudioDuration(file);
      const id = 'music_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);

      // Cover-bilde (valgfritt): del til Supabase når konfigurert, elles lokalt.
      let coverUrl = null, coverId = null;
      if (coverFile) {
        if ((typeof SC_Storage !== 'undefined') && SC_Storage.isConfigured()) {
          try { const cr = await SC_Storage.upload(coverFile, { prefix: 'covers' }); coverUrl = cr.url; }
          catch (e) { if (e && e.message !== 'not-configured') console.warn('Cover-skylagring feilet:', e.message); }
        }
        if (!coverUrl) {
          coverId = 'cover_' + id;
          try { await DB.storeFile('media', coverId, coverFile); }
          catch (e) { console.warn('Cover lokal lagring feilet:', e); coverId = null; }
        }
      }

      const meta = {
        name: title, title, artist, genre,
        description: desc, mainCategory: category,
        duration, uploadedAt: Date.now(), isMix,
        visibility: 'public', audioUrl: null, storagePath: null,
        coverUrl, coverId,
      };

      // Del store filer til Supabase når konfigurert, så alle kan høyre dei. Elles lokalt.
      let shared = false;
      if ((typeof SC_Storage !== 'undefined') && SC_Storage.isConfigured()) {
        try {
          const res = await SC_Storage.upload(file, { prefix: 'audio' });
          meta.audioUrl = res.url; meta.storagePath = res.path;
          await DB.put('music', { id, ...meta });
          shared = true;
        } catch (e) { if (e && e.message !== 'not-configured') console.warn('Skylagring feilet, lagrer lokalt:', e.message); }
      }
      if (!shared) await DB.storeFile('music', id, file, meta);

      const musicIds = [...(user.musicIds || []), id];
      Auth.updateUser(user.username, { musicIds });

      App.toast(`"${title}" has been uploaded!${shared ? ' 🌐' : ''} ${Icon('music')}`, 'success');
      if (window.Notify) Notify.notifyFriends(user, { type: 'upload', text: 'uploaded a new track', link: `#/u/${user.username}` });
      // Auto-del til Community-veggen (offentleg + delt → spelbar for alle).
      if (shared && window.Community && Community.autoShareOn()) {
        Community.shareMedia({ kind: 'audio', name: title, url: meta.audioUrl, sourceId: id, audience: 'public' });
      }
      allTracks = await loadAllTracks();

      const uploadEl = document.getElementById('disc-upload-content');
      if (uploadEl) uploadEl.innerHTML = renderUploadSuccess(title, category);

      const grid  = document.getElementById('disc-track-grid');
      const count = document.getElementById('disc-count');
      if (grid)  grid.innerHTML  = renderTrackGrid(filteredTracks());
      if (grid)  hydrateEmbeddedArt();
      if (count) count.textContent = `${filteredTracks().length} tracks`;

    } catch (err) {
      console.error(err);
      App.toast('Upload error', 'error');
      if (btn) { btn.disabled = false; btn.innerHTML = Icon('arrow-up') + ' Upload'; }
    }
  }

  // ── Genre radio favorites ─────────────────────────────────────────────
  function setDiscGenreRadio(genre, stationId) {
    saveGenreRadio(genre, stationId);
    const radioEl = document.getElementById('disc-radio-content');
    if (radioEl) radioEl.innerHTML = renderRadioFavTab();
    const station = Radio.stations.find(s => s.id === stationId);
    const gLabel  = GENRES.find(g => g.tag === genre)?.label || genre;
    if (station) App.toast(`"${station.name}" is your favorite for ${gLabel} ${Icon('star')}`, 'success');
  }

  function clearGenreRadio(genre) {
    delete discGenreRadios[genre];
    localStorage.setItem(genreRadioKey(), JSON.stringify(discGenreRadios));
    const radioEl = document.getElementById('disc-radio-content');
    if (radioEl) radioEl.innerHTML = renderRadioFavTab();
  }

  return {
    render, setGenre, setRole, switchTab, switchSubTab,
    playTrack, wishlist, uploadDiscTrack, onUploadFileChange, onCoverFileChange,
    loadAllTracks,
    onCategoryChange, setDiscGenreRadio, clearGenreRadio,
    downloadTrack, closeDownloadModal, confirmDownloadPayment,
    openDroneZone, closeDroneZone, openChillRadio,
    ytSearch, openYt, ambientYtSearch, ambientYtPlay,
    toggleTabMenu,
  };
})();
