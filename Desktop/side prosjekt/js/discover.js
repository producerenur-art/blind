// Discover — music & people discovery
const Discover = (() => {

  const GENRES = [
    { tag: 'all',          label: 'Alt',          emoji: '🎵' },
    { tag: 'ambient',      label: 'Ambient',       emoji: '🌌' },
    { tag: 'electronic',   label: 'Electronic',    emoji: '⚡' },
    { tag: 'psytrance',    label: 'Psytrance',     emoji: '🌀' },
    { tag: 'techno',       label: 'Techno',        emoji: '🔊' },
    { tag: 'house',        label: 'House',         emoji: '🏠' },
    { tag: 'chill',        label: 'Chill',         emoji: '🌿' },
    { tag: 'jazz',         label: 'Jazz',          emoji: '🎷' },
    { tag: 'experimental', label: 'Experimental',  emoji: '🧪' },
    { tag: 'drone',        label: 'Drone',         emoji: '🔁' },
  ];

  const MAIN_CATEGORIES = [
    { tag: '',           label: 'Velg seinere via profil',  emoji: '⏭️', labels: [] },
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
    { tag: 'ambient',    label: 'Eksperimentell / Ambient',  emoji: '🌌', labels: [
      { name: 'Kranky Records', email: 'info@kranky.net' },
      { name: 'Touch Music',    email: 'demos@touchmusic.org.uk' },
      { name: '12k',            email: 'demos@12k.com' },
    ]},
  ];

  const ROLES = [
    { tag: 'all',          label: 'Alle',         emoji: '👥' },
    { tag: 'lytter',       label: 'Lyttere',      emoji: '🎧' },
    { tag: 'dj',           label: 'DJer',         emoji: '🎛️' },
    { tag: 'produsent',    label: 'Produsenter',  emoji: '🎹' },
    { tag: 'plateselskap', label: 'Plateselskap', emoji: '🏷️' },
  ];

  const ROLE_LABEL = { lytter:'🎧 Lytter', dj:'🎛️ DJ', produsent:'🎹 Produsent', plateselskap:'🏷️ Plateselskap' };

  // Maps genre tags to Radio station categories for the radio-favoritt tab
  const GENRE_RADIO_CATS = {
    all:          null,
    ambient:      ['Ambient / Space'],
    electronic:   ['Lo-Fi / IDM', 'Stellar', 'EDM / House'],
    psytrance:    ['Psytrance / Progressive', 'Ambient / Space'],
    techno:       ['Techno / Minimal'],
    house:        ['EDM / House'],
    chill:        ['Chill Out / Downtempo'],
    jazz:         ['Jazz / Lounge'],
    experimental: ['Lo-Fi / IDM', 'Ambient / Space'],
    drone:        ['Ambient / Space'],
  };

  const FAKE_ACTIVITY = [
    { user: 'luna_drift',    action: 'downloaded', track: 'Hyperspace Suite', ago: '2 min siden' },
    { user: 'ozoresident',   action: 'wishlisted', track: 'Neon Garden EP',   ago: '5 min siden' },
    { user: 'stellarfan99',  action: 'downloaded', track: 'Deep Fold',        ago: '8 min siden' },
    { user: 'psy_pilgrim',   action: 'downloaded', track: 'Aurora Borealis',  ago: '12 min siden' },
    { user: 'xeno_flux',     action: 'wishlisted', track: 'Static Dreams',    ago: '15 min siden' },
    { user: 'nebula_echo',   action: 'downloaded', track: 'Voidspace',        ago: '22 min siden' },
    { user: 'freq_hunter',   action: 'downloaded', track: 'Modular Hearts',   ago: '31 min siden' },
    { user: 'drifter_k',     action: 'wishlisted', track: 'Infinite Loop',    ago: '44 min siden' },
  ];

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
  const FREE_SONG_LIMIT = 4;   // 4 av 10 sanger er gratis per uke
  const FREE_MIX_LIMIT  = 6;   // 6 av 10 mikser er gratis per uke
  const SONG_PRICE_NOK  = 7;
  const MIX_PRICE_NOK   = 150;
  let pendingDownloadId = null;

  // ── Dark Drone artist & label data ───────────────────────────────────
  const DRONE_ARTISTS = [
    {
      name: 'Kammarheit',
      country: '🇸🇪 Sverige',
      bio: 'Pär Boströms mørke ambient-prosjekt — sidan tidleg 2000-tal ein av dei viktigaste stemmene i dark drone. Tett, langsam, og kvalmande vakker. "The Starwheel" reknast som eit av dei beste dark ambient-albuma nokosinne.',
      albums: ['Asleep and Well Hidden (2003)', 'The Starwheel (2005)', 'The Nest (2015)', 'Thronal (2020)'],
      label: 'Cyclic Law',
      bandcamp: 'https://kammarheit.bandcamp.com',
      youtube: 'https://www.youtube.com/channel/UCrIhFRfU627QkVjdlr6baag',
      facebook: 'https://www.facebook.com/kammarheitofficial',
      website: 'https://www.kammarheit.com',
    },
    {
      name: 'Atrium Carceri',
      country: '🇸🇪 Sverige / 🇺🇸 USA',
      bio: 'Simon Heaths flaggskipprosjekt og gründar av Cryo Chamber. Dystopisk, kinematisk dark ambient som fortel mørke science-fiction-historier gjennom lyd — post-apokalyptisk lydkunst av høgaste klasse.',
      albums: ['Cellblock (2004)', 'Ptahil (2008)', 'Codex (2013)', 'The Untold (2016)', 'Forgotten Gods (2022)'],
      label: 'Cryo Chamber',
      bandcamp: 'https://cryochamber.bandcamp.com',
      youtube: 'https://www.youtube.com/@cryochamberlabel',
      facebook: 'https://www.facebook.com/p/Atrium-Carceri-100063521439906',
    },
    {
      name: 'Sabled Sun',
      country: '🇸🇪 Sverige / 🇺🇸 USA',
      bio: 'Simon Heaths sci-fi dark ambient-alias. Ein øydeleggjande rein dronebasert reise gjennom dystre framtidslandskap — heile den post-apokalyptiske framtida i eit lydbilete.',
      albums: ['2145 (2012)', '2146 (2012)', '2147 (2013)', 'Signals I (2013)', 'Signals II (2014)'],
      label: 'Cryo Chamber',
      bandcamp: 'https://cryochamber.bandcamp.com',
      youtube: 'https://www.youtube.com/@cryochamberlabel',
    },
    {
      name: 'Dronny Darko',
      country: '🇺🇦 Ukraina',
      bio: 'Oleg Puzan frå Kyiv lagar massivt, ruvande dark ambient og drone. Ein av dei mest produktive kunstnarane på Cryo Chamber — djup, kosmisk og grenselaus.',
      albums: ['Our Darkest Days (2015)', 'Desolate Lighthouse (2016)', 'Architect of Shadows (2019)'],
      label: 'Cryo Chamber / Petroglyph Music',
      bandcamp: 'https://dronnydarko.bandcamp.com',
      youtube: 'https://www.youtube.com/channel/UCWIeF6dIcewYGRRq1tANydw',
      facebook: 'https://www.facebook.com/dronnydarko',
    },
    {
      name: 'Alphaxone',
      country: '🇮🇷 Iran',
      bio: 'Mehdi Saleh frå Teheran lagar cinematic, atmosfærisk dark ambient og space drone. Djupe romteksturer med ein unik blanding av orientalsk og kosmisk estetikk.',
      albums: ['The Forgotten (2013)', 'Edge of Abyss (2015)', 'Membrane (2019)', 'Solitary Retreat (2022)'],
      label: 'Cryo Chamber',
      bandcamp: 'https://alphaxone.bandcamp.com',
      facebook: 'https://www.facebook.com/alphaxone',
    },
    {
      name: 'Northumbria',
      country: '🇨🇦 Canada',
      bio: 'Jim Field og Dorian Williamson frå Toronto lagar massive, improviserte drone-veggar med gitar og bass. Uropplevande og fysisk overveldande — musikk som kjennest meir enn du høyrer ho.',
      albums: ['Helluland (2016)', 'Markland (2016)', 'Vinland (2017)', 'Isolering (2019)'],
      label: 'Cryo Chamber',
      bandcamp: 'https://northumbria.bandcamp.com',
      facebook: 'https://www.facebook.com/NorthumbriaDrone',
    },
    {
      name: 'Council of Nine',
      country: '🇺🇸 USA',
      bio: 'Maximillian Olivier frå California lagar mystisk rituell dark ambient. Djup kosmisk drone med okkulte undertoner — som å lytte til ei eldgamal seremoni frå innsida av mørket.',
      albums: ['Dakhma (2017)', 'Diagnosis (2018)', 'Trinity (2019)', 'Exit Earth (2020)', 'Davidian (2021)'],
      label: 'Cryo Chamber',
      bandcamp: 'https://cryochamber.bandcamp.com',
      youtube: 'https://www.youtube.com/results?search_query=council+of+nine+dark+ambient',
    },
    {
      name: 'Ugasanie',
      country: '🇧🇾 Belarus',
      bio: 'Evgeny Kuznetsov lagar iseande, vidstrakt dark ambient inspirert av arktiske landskap og sibirsk natur. Kvart album er ei reise gjennom tundra og permafrost.',
      albums: ['Altai (2014)', 'Tundra (2016)', 'Polar Silence (2018)', 'Taiga (2020)'],
      label: 'Cryo Chamber',
      bandcamp: 'https://ugasanie.bandcamp.com',
      youtube: 'https://www.youtube.com/results?search_query=ugasanie+dark+ambient',
    },
    {
      name: 'Cities Last Broadcast',
      country: '🇸🇪 Sverige',
      bio: 'Sideprojektet til Pär Boström (Kammarheit). Fryktinngytande mørk ambient inspirert av tomme byar og falleferdige strukturar — post-apokalyptiske stemningsbilete gjort til lyd.',
      albums: ['The Humming Tapes (2012)', 'The Cancelled Earth (2013)'],
      label: 'Cyclic Law',
      bandcamp: 'https://citieslastbroadcast.bandcamp.com',
      youtube: 'https://www.youtube.com/results?search_query=cities+last+broadcast+dark+ambient',
    },
    {
      name: 'Trepaneringsritualen',
      country: '🇸🇪 Sverige',
      bio: 'T.M.R. sitt kompromisslause ritual industrial / drone-prosjekt. Mørkt, brutalt og meditativt samstundes — ein av dei mest særeigne stemmene i underground drone.',
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
      country: 'USA (grunnlagt av svensk)',
      founded: '2011',
      desc: 'Verdas leiande dark ambient-label, drive av Simon Heath (Atrium Carceri). Gjev ut digitalt og fysisk med fokus på mørk, kinematisk ambient og drone. Over 500 utgivingar.',
      artists: 'Kammarheit, Atrium Carceri, Sabled Sun, Dronny Darko, Alphaxone, Northumbria, Council of Nine, Ugasanie',
      website: 'https://www.cryochamberlabel.com',
      bandcamp: 'https://cryochamber.bandcamp.com',
      facebook: 'https://www.facebook.com/CryoChamber',
      youtube: 'https://www.youtube.com/@cryochamberlabel',
      demoContact: 'cryochamber@hotmail.com',
      demoNote: 'Send ferdig album eller EP som lenke. Inkluder biografi og bakgrunn. Simon Heath svarer sjølv — vær konkret og profesjonell. Stor pågang.',
    },
    {
      name: 'Cyclic Law',
      flag: '🇨🇦',
      country: 'Canada (no. Frankrike)',
      founded: '2002',
      desc: 'Canadisk label drive av Frédéric Arbour, no basert i dei franske Pyreneane. Spesialisert på rituell dark ambient, drone og eksperimentell elektronika. 140+ utgivingar sidan 2002.',
      artists: 'Kammarheit, Cities Last Broadcast, Trepaneringsritualen, Lustmord, Halgrath, Phelios',
      website: 'https://www.cycliclaw.com',
      bandcamp: 'https://cycliclaw.bandcamp.com',
      facebook: 'https://www.facebook.com/cycliclaw',
      youtube: 'https://www.youtube.com/@cycliclaw',
      demoContact: 'Kontaktskjema på cycliclaw.com/contact',
      demoNote: 'Ingen offentleg demo-epost — bruk kontaktskjema på nettstaden. Send ferdig EP/album som lenke + kort bio. Fokus på kvalitet og konsept framfor mengde.',
    },
    {
      name: 'Malignant Records',
      flag: '🇺🇸',
      country: 'USA (Maryland)',
      founded: '1994',
      desc: 'Veteran dark ambient, power electronics og industrial-label frå USA. Over 30 år med kompromisslause utgivingar i dei mørkaste hjørnene av eksperimentell musikk.',
      artists: 'Gnawed, Trepaneringsritualen, Theologian, Karmacipher, Atrax Morgue (reissues)',
      website: 'https://www.malignantrecords.com',
      bandcamp: 'https://malignantrecs.bandcamp.com',
      facebook: 'https://www.facebook.com/malignantrecords',
      demoContact: 'malignant@malignantrecords.com',
      demoNote: '⚠️ Tek ikkje i mot demoar for tida — sjekk nettstaden malignantrecords.com for oppdatert status. Fokus på dark ambient, noise, industrial og ritual music.',
    },
    {
      name: 'Tesco Organisation',
      flag: '🇩🇪',
      country: 'Tyskland',
      founded: '1987',
      desc: 'Ein av Europas lengst-levande underground industrial-operasjonar. Startar som postordre i 1987, no aktivt plateselskap. Svært underground-orientert — ingen PR, berre musikk.',
      artists: 'Diverse power electronics, industrial, neofolk og dark ambient-artistar',
      website: 'https://tesco-germany.com/en',
      bandcamp: 'https://tescogermany.bandcamp.com',
      facebook: 'https://www.facebook.com/TescoGermany',
      demoContact: 'tesco-germany@t-online.de',
      demoNote: 'Send e-post med lenke til musikk. Ingen formelle krav — men vera ekte underground. Fokus på industrial, power electronics, neofolk og mørk eksperimentell musikk.',
    },
    {
      name: 'Consouling Sounds',
      flag: '🇧🇪',
      country: 'Belgia',
      founded: '2008',
      desc: 'Belgisk non-profit label for post-metal, doom, sludge og mørk eksperimentell musikk — inkludert drone og dark ambient. Sterk europeisk profil og kunstnarisk integritet.',
      artists: 'Oathbreaker, A+, diverse drone/doom/post-metal',
      website: 'https://consouling.be',
      bandcamp: 'https://consouling.bandcamp.com',
      facebook: 'https://www.facebook.com/ConsoulingSounds',
      demoContact: 'support@consouling.be',
      demoNote: 'Send demo via e-post med lenke til musikk (Bandcamp/SoundCloud) + pressebilde og bio. Belgisk/europeisk-fokusert. Non-profit med sterk kunstnarleg profil.',
    },
  ];

  // ── Utils ─────────────────────────────────────────────────────────────
  function escHtml(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
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

  // ── Nedlastingskvote ─────────────────────────────────────────────────
  function dlQuotaKey() {
    const u = Auth.current();
    return `sr_dl_quota_${u ? u.username : 'guest'}`;
  }

  function getDownloadQuota() {
    try {
      const raw    = JSON.parse(localStorage.getItem(dlQuotaKey()) || '{}');
      const now    = Date.now();
      const weekMs = 7 * 24 * 60 * 60 * 1000;
      if (!raw.weekStart || now - raw.weekStart > weekMs) {
        return { songs: 0, mixes: 0, weekStart: now };
      }
      return raw;
    } catch { return { songs: 0, mixes: 0, weekStart: Date.now() }; }
  }

  function saveDownloadQuota(q) {
    localStorage.setItem(dlQuotaKey(), JSON.stringify(q));
  }

  function isArtistUerfaren(track) {
    return track.artistSubscription !== 'pro';
  }

  function trackNeedsPayment(track) {
    if (!isArtistUerfaren(track)) return false;
    const q = getDownloadQuota();
    return track.isMix ? q.mixes >= FREE_MIX_LIMIT : q.songs >= FREE_SONG_LIMIT;
  }

  function dlPrice(track) {
    return track.isMix ? MIX_PRICE_NOK : SONG_PRICE_NOK;
  }

  function nextFreeReset() {
    const q      = getDownloadQuota();
    const resetAt = (q.weekStart || Date.now()) + 7 * 24 * 60 * 60 * 1000;
    const diff    = Math.max(0, resetAt - Date.now());
    const days    = Math.floor(diff / (24 * 60 * 60 * 1000));
    const hours   = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    return days > 0 ? `${days}d ${hours}t` : `${hours}t`;
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
          let coverUrl = null;
          if (rec.coverId) {
            coverUrl = await DB.getBlobUrl('media', rec.coverId).catch(() => null);
          }
          results.push({
            id:        mid,
            title:     rec.name     || rec.title || 'Untitled',
            artist:    rec.artist   || user.displayName,
            username:  user.username,
            genre:     (rec.genre   || 'electronic').toLowerCase(),
            duration:  rec.duration || 0,
            coverUrl,
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
      { id: 'tracks', icon: '🎵', label: 'Spor' },
      { id: 'upload', icon: '🔼', label: 'Last opp' },
      { id: 'radio',  icon: '📻', label: 'Radio-favoritt' },
    ];
    return `<div class="disc-sub-tab-bar" id="disc-sub-tab-bar">
      ${tabs.map(t => `
        <button class="disc-sub-tab ${activeSubTab === t.id ? 'active' : ''}"
          onclick="Discover.switchSubTab('${t.id}')">
          ${t.icon} ${t.label}
        </button>`).join('')}
    </div>`;
  }

  function renderUploadTab() {
    const user = Auth.current();
    if (!user) return `
      <div class="disc-empty">
        <div style="font-size:3rem;margin-bottom:0.75rem">🔐</div>
        <p>Du må <a href="#/login" style="color:var(--accent)">logge inn</a> for å laste opp musikk.</p>
      </div>`;

    const genreOptions = GENRES.filter(g => g.tag !== 'all').map(g =>
      `<option value="${g.tag}" ${activeGenre !== 'all' && activeGenre === g.tag ? 'selected' : ''}>${g.emoji} ${g.label}</option>`
    ).join('');

    return `
      <div class="disc-upload-panel">
        <div class="disc-upload-header">
          <div style="font-size:2.5rem;margin-bottom:0.5rem">🎵</div>
          <h3 style="margin:0 0 0.25rem;font-size:1.15rem;font-weight:700">Last opp musikk</h3>
          <p style="color:var(--text2);font-size:0.85rem;margin:0">Del musikken din med miljøet</p>
        </div>
        <div class="disc-upload-form" id="disc-upload-form">
          <div class="disc-upload-dropzone" id="disc-upload-dropzone"
               onclick="document.getElementById('disc-up-file').click()">
            <div class="disc-upload-dropzone-icon" id="disc-up-drop-icon">🎵</div>
            <div class="disc-upload-dropzone-text">Klikk for å velge lydfil</div>
            <div class="disc-upload-dropzone-sub">MP3 · WAV · FLAC · AAC · OGG · AIFF · M4A · WMA · OPUS · og alle andre lydformater</div>
            <span id="disc-up-filename" class="disc-upload-filename"></span>
          </div>
          <input type="file" id="disc-up-file" accept="audio/*" style="display:none"
            onchange="Discover.onUploadFileChange(this)">

          <div class="disc-upload-fields">
            <div class="form-group">
              <label class="form-label">Tittel</label>
              <input class="form-input" id="disc-up-title" placeholder="Sporets navn">
            </div>
            <div class="form-group">
              <label class="form-label">Artist</label>
              <input class="form-input" id="disc-up-artist"
                placeholder="${escHtml(user.displayName)}" value="${escHtml(user.displayName)}">
            </div>
            <div class="form-group">
              <label class="form-label">Sjanger</label>
              <select class="form-input" id="disc-up-genre">${genreOptions}</select>
            </div>
            <div class="form-group">
              <label class="form-label">Beskrivelse</label>
              <textarea class="form-input" id="disc-up-desc" rows="3"
                placeholder="Beskriv musikken din — stemning, inspirasjon, produksjonsdetaljer…"
                style="resize:vertical;min-height:72px;font-family:inherit"></textarea>
            </div>
            <div class="form-group">
              <label class="form-label">Hoved kategori <span style="color:var(--text3);font-weight:400;font-size:0.8rem">(for plateselskap-kontakt)</span></label>
              <select class="form-input" id="disc-up-category" onchange="Discover.onCategoryChange(this)">
                ${MAIN_CATEGORIES.map(c => `<option value="${c.tag}">${c.emoji} ${c.label}</option>`).join('')}
              </select>
              <div id="disc-up-cat-hint" style="font-size:0.78rem;color:var(--text2);margin-top:0.35rem;line-height:1.4">
                Du kan alltid velge kategori seinere fra profilen din
              </div>
            </div>
          </div>

          <div class="disc-upload-ismix-row">
            <input type="checkbox" id="disc-up-ismix" class="disc-ismix-check">
            <label for="disc-up-ismix" class="disc-ismix-label">
              <span class="disc-ismix-icon">🎛️</span>
              Dette er en miks / DJ-sett
              <span class="disc-ismix-hint">— nedlasting koster ${MIX_PRICE_NOK} kr (sang = ${SONG_PRICE_NOK} kr)</span>
            </label>
          </div>

          <button class="btn btn-primary disc-upload-submit" id="disc-up-btn"
            onclick="Discover.uploadDiscTrack()">
            🔼 Last opp
          </button>
        </div>
      </div>`;
  }

  function renderRadioFavTab() {
    const stations   = genreRadioStations();
    const savedId    = discGenreRadios[activeGenre];
    const saved      = Radio.stations.find(s => s.id === savedId);
    const genreLabel = GENRES.find(g => g.tag === activeGenre)?.label || 'Alle sjangere';

    return `
      <div class="disc-radio-fav-wrap">
        ${saved ? `
          <div class="disc-radio-fav-current">
            <div class="disc-radio-fav-label">⭐ Din favorittkanal for ${escHtml(genreLabel)}</div>
            <div class="disc-radio-fav-card" style="--fav-color:${saved.color}">
              <div class="disc-radio-fav-emoji">${saved.emoji}</div>
              <div class="disc-radio-fav-info">
                <div class="disc-radio-fav-name">${escHtml(saved.name)}</div>
                <div class="disc-radio-fav-desc">${escHtml(saved.desc)}</div>
              </div>
              <div class="disc-radio-fav-actions">
                <button class="btn btn-primary btn-sm"
                  onclick="Radio.playStation('${saved.id}')">▶ Spill</button>
                <button class="btn btn-ghost btn-sm"
                  onclick="Discover.clearGenreRadio('${activeGenre}')">✕</button>
              </div>
            </div>
          </div>` : `
          <div class="disc-radio-fav-empty">
            <div style="font-size:2rem;margin-bottom:0.4rem">📻</div>
            <p style="color:var(--text2);font-size:0.85rem;margin:0">
              Ingen favorittkanal valgt for <strong>${escHtml(genreLabel)}</strong> ennå.
            </p>
          </div>`}

        <div class="disc-radio-pick-header">
          <span>${saved ? 'Bytt kanal' : 'Velg favorittkanal'}</span>
          <span class="disc-section-count">${stations.length} kanaler</span>
        </div>

        <div class="disc-radio-pick-list">
          ${stations.map(s => `
            <div class="disc-radio-pick-item ${savedId === s.id ? 'active' : ''}"
                 style="--pick-color:${s.color}">
              <div class="disc-radio-pick-emoji">${s.emoji}</div>
              <div class="disc-radio-pick-info">
                <div class="disc-radio-pick-name">${escHtml(s.name)}</div>
                <div class="disc-radio-pick-desc">${escHtml(s.desc)}</div>
              </div>
              <div class="disc-radio-pick-acts">
                <button class="disc-radio-play-btn" title="Spill av"
                  onclick="Radio.playStation('${s.id}');event.stopPropagation()">▶</button>
                <button class="disc-radio-star-btn ${savedId === s.id ? 'set' : ''}"
                  title="${savedId === s.id ? 'Din favoritt' : 'Sett som favoritt'}"
                  onclick="Discover.setDiscGenreRadio('${activeGenre}','${s.id}');event.stopPropagation()">
                  ${savedId === s.id ? '⭐' : '☆'}
                </button>
              </div>
            </div>`).join('')}
        </div>
      </div>`;
  }

  // ── Tab bar ───────────────────────────────────────────────────────────
  function renderTabBar() {
    return `
      <div class="disc-tab-bar">
        <button class="disc-tab-btn ${activeTab === 'music' ? 'active' : ''}"
          onclick="Discover.switchTab('music')">🎵 Musikk</button>
        <button class="disc-tab-btn ${activeTab === 'people' ? 'active' : ''}"
          onclick="Discover.switchTab('people')">👥 Finn folk</button>
        <button class="disc-tab-btn ${activeTab === 'psy-tour' ? 'active' : ''}"
          onclick="Discover.switchTab('psy-tour')">🌀 Psytrance Peak Tour</button>
        <button class="disc-tab-btn ${activeTab === 'ambient-mann' ? 'active' : ''}"
          onclick="Discover.switchTab('ambient-mann')">🌊 Ambient Mann</button>
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
      const isEmpty = count === 0 && g.tag !== 'all';
      return `
        <button class="disc-genre-btn ${activeGenre === g.tag ? 'active' : ''} ${isEmpty ? 'disc-genre-btn--empty' : ''}"
          onclick="Discover.setGenre('${g.tag}')">${g.emoji} ${g.label}${count > 0 ? `<span class="disc-genre-count">${count}</span>` : ''}</button>
      `;
    }).join('');
  }

  function renderGenreRadioWidget() {
    const cats    = GENRE_RADIO_CATS[activeGenre];
    const stations = cats
      ? Radio.stations.filter(s => cats.includes(s.cat)).slice(0, 3)
      : Radio.stations.filter(s => s.featured).concat(Radio.stations.slice(0, 2)).slice(0, 3);
    if (!stations.length) return '';
    const genreLabel = GENRES.find(g => g.tag === activeGenre)?.label || 'Alle sjangere';
    return `
      <div class="disc-sidebar-title">📻 Radio — ${escHtml(genreLabel)}</div>
      ${stations.map(s => `
        <div class="disc-radio-widget-item" onclick="Radio.playStation('${s.id}')">
          <div class="disc-radio-widget-emoji">${s.emoji}</div>
          <div class="disc-radio-widget-info">
            <div class="disc-radio-widget-name">${escHtml(s.name)}</div>
            <div class="disc-radio-widget-desc">${escHtml(s.desc)}</div>
          </div>
          <button class="disc-radio-widget-play" title="Spill" onclick="Radio.playStation('${s.id}');event.stopPropagation()">▶</button>
        </div>
      `).join('')}
      <a class="disc-radio-more-link" onclick="Router.go('/radio');event.preventDefault()">Se alle kanaler →</a>
    `;
  }

  function renderRoleTags() {
    return ROLES.map(r => `
      <button class="disc-genre-btn ${activeRole === r.tag ? 'active' : ''}"
        onclick="Discover.setRole('${r.tag}')">${r.emoji} ${r.label}</button>
    `).join('');
  }

  // ── Track & people grids ──────────────────────────────────────────────
  function renderTrackGrid(tracks) {
    if (!tracks.length) {
      return `<div class="disc-empty">
        <div style="font-size:3rem;margin-bottom:0.75rem">🎵</div>
        <p>Ingen spor funnet i denne sjangeren ennå.<br>
        Gå til <strong>Last opp</strong>-fanen for å legge ut musikk.</p>
      </div>`;
    }
    return tracks.map(t => {
      const uerfaren  = isArtistUerfaren(t);
      const isPaid    = getPaidDownloads().includes(t.id);
      const needsPay  = !isPaid && trackNeedsPayment(t);
      const priceBadge = uerfaren && !isPaid
        ? `<span class="disc-price-badge ${needsPay ? 'disc-price-badge--locked' : 'disc-price-badge--free'}">
             ${needsPay ? `🔒 ${dlPrice(t)} kr` : `✓ Gratis`}
           </span>`
        : `<span class="disc-price-badge disc-price-badge--pro">⭐ Pro</span>`;
      return `
        <div class="disc-track-card" onclick="Discover.playTrack('${escHtml(t.id)}')">
          <div class="disc-track-art" style="${t.coverUrl ? `background-image:url(${t.coverUrl});background-size:cover;background-position:center` : 'background:linear-gradient(135deg,#7c3aed,#2563eb)'}">
            <button class="disc-play-btn"
              onclick="Discover.playTrack('${escHtml(t.id)}');event.stopPropagation()">▶</button>
            ${t.duration ? `<span class="disc-track-dur">${fmtDuration(t.duration)}</span>` : ''}
            ${t.isMix ? '<span class="disc-mix-badge">MIKS</span>' : ''}
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
                <button class="disc-download-btn" title="Last ned"
                  onclick="Discover.downloadTrack('${escHtml(t.id)}');event.stopPropagation()">⬇</button>
                <button class="disc-wishlist-btn" title="Ønskeliste"
                  onclick="Discover.wishlist('${escHtml(t.id)}');event.stopPropagation()">♡</button>
              </div>
            </div>
          </div>
        </div>`;
    }).join('');
  }

  function renderPeopleGrid(users) {
    if (!users.length) {
      return `<div class="disc-empty">
        <div style="font-size:3rem;margin-bottom:0.75rem">👥</div>
        <p>Ingen brukere i denne kategorien ennå.</p>
      </div>`;
    }
    return `<div class="disc-people-grid" id="disc-people-grid">
      ${users.map(u => {
        const t  = u.theme || {};
        const bg = t.bgType === 'gradient'
          ? (t.bgGradient || 'linear-gradient(135deg,#7c3aed,#2563eb)')
          : `linear-gradient(135deg,${t.primaryColor || '#7c3aed'},${t.secondaryColor || '#2563eb'})`;
        const roleLabel = ROLE_LABEL[u.role || 'lytter'] || '🎧 Lytter';
        return `
          <a class="disc-people-card hover-lift" href="#/u/${escHtml(u.username)}">
            <div class="disc-people-banner" style="background:${bg}">
              <div class="disc-people-avatar" style="background:${bg}" id="disc-pav-${escHtml(u.username)}">
                ${escHtml(u.displayName.charAt(0).toUpperCase())}
              </div>
            </div>
            <div class="disc-people-body">
              <div class="disc-people-name">${escHtml(u.displayName)}</div>
              <div class="disc-people-username">@${escHtml(u.username)}</div>
              <span class="disc-people-role-badge">${roleLabel}</span>
              ${u.bio ? `<div class="disc-people-bio">${escHtml(u.bio.slice(0,80))}${u.bio.length>80?'…':''}</div>` : ''}
            </div>
          </a>`;
      }).join('')}
    </div>`;
  }

  function renderActivity() {
    return FAKE_ACTIVITY.map(a => `
      <div class="disc-activity-item">
        <div class="disc-activity-avatar">${a.user.charAt(0).toUpperCase()}</div>
        <div class="disc-activity-text">
          <span class="disc-activity-user">@${escHtml(a.user)}</span>
          ${a.action === 'downloaded' ? 'lastet ned' : 'ønsket seg'}
          <span class="disc-activity-track">${escHtml(a.track)}</span>
        </div>
        <div class="disc-activity-ago">${a.ago}</div>
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

    const totalDownloads = 4821 + Math.floor(Math.random() * 50);
    const totalArtists   = Math.max(allUsers.length, 12);

    app.innerHTML = `
      <div class="disc-page" id="disc-page">

        <!-- HERO -->
        <div class="disc-hero">
          <div class="disc-hero-glow"></div>
          <div class="disc-hero-content">
            <div class="disc-hero-badge">🎵 Oppdagelse</div>
            <h1 class="disc-hero-title">Discover</h1>
            <p class="disc-hero-sub">Utforsk musikk og koble med DJer, produsenter og lyttere fra hele miljøet.</p>
            <div class="disc-stats-row">
              <div class="disc-stat"><div class="disc-stat-val">${totalArtists}</div><div class="disc-stat-label">Brukere</div></div>
              <div class="disc-stat"><div class="disc-stat-val">${allTracks.length + 247}</div><div class="disc-stat-label">Spor</div></div>
              <div class="disc-stat"><div class="disc-stat-val">${totalDownloads.toLocaleString('no')}</div><div class="disc-stat-label">Nedlastninger</div></div>
            </div>
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
                <div class="disc-section-header">
                  <h2 class="disc-section-title">Nye utgivelser</h2>
                  <span class="disc-section-count" id="disc-count">${filteredTracks().length} spor</span>
                </div>
                <div class="disc-track-grid" id="disc-track-grid">
                  ${renderTrackGrid(filteredTracks())}
                </div>
                ${!allTracks.length ? `
                <div class="disc-editorial">
                  <div class="disc-section-header" style="margin-top:2rem">
                    <h2 class="disc-section-title">Utvalgt fra Stellar Radio</h2>
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
                  <span class="disc-live-dot"></span> Live aktivitet
                </div>
                <div class="disc-activity-feed" id="disc-activity-feed">
                  ${renderActivity()}
                </div>
              </div>

              <div class="disc-sidebar-card" id="disc-genre-radio-wrap">
                ${renderGenreRadioWidget()}
              </div>

              <div class="disc-sidebar-card">
                <div class="disc-sidebar-title">🏷 Sjangere</div>
                <div class="disc-tag-cloud">
                  ${GENRES.filter(g => g.tag !== 'all').map(g => {
                    const counts = getGenreCounts();
                    const count = counts[g.tag] || 0;
                    return `<button class="disc-tag-pill ${activeGenre === g.tag ? 'active' : ''} ${count === 0 ? 'disc-genre-btn--empty' : ''}"
                      onclick="Discover.setGenre('${g.tag}')">${g.emoji} ${g.label}${count > 0 ? `<span class="disc-genre-count">${count}</span>` : ''}</button>`;
                  }).join('')}
                </div>
              </div>

              <div class="disc-sidebar-card">
                <div class="disc-sidebar-title">🔗 Nyttige lenker</div>
                <div class="disc-useful-links">
                  <a class="disc-useful-link" href="https://feedfreq.com/" target="_blank" rel="noopener noreferrer">feedfreq.com</a>
                  <a class="disc-useful-link" href="https://bigfreq.com/" target="_blank" rel="noopener noreferrer">bigfreq.com</a>
                  <a class="disc-useful-link" href="https://pulseticketing.com/" target="_blank" rel="noopener noreferrer">pulseticketing.com</a>
                  <a class="disc-useful-link" href="https://electreelife.com/" target="_blank" rel="noopener noreferrer">electreelife.com</a>
                  <a class="disc-useful-link" href="https://cyblinks.com/" target="_blank" rel="noopener noreferrer">cyblinks.com</a>
                  <a class="disc-useful-link" href="https://triniq.com/" target="_blank" rel="noopener noreferrer">triniq.com</a>
                </div>
              </div>
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
                <h2 class="disc-section-title">Finn folk i musikkmiljøet</h2>
                <span class="disc-section-count" id="disc-people-count">${filteredUsers().length} brukere</span>
              </div>
              <div id="disc-people-wrap">
                ${renderPeopleGrid(filteredUsers())}
              </div>
            </div>
          </div>
        </div>

        <!-- PSY TOUR TAB (hidden by default) -->
        <div id="disc-psy-tour-tab" class="hidden">
          ${renderPsyTourTab()}
        </div>

        <!-- AMBIENT MANN TAB (hidden by default) -->
        <div id="disc-ambient-mann-tab" class="hidden">
          ${renderAmbientMannTab()}
        </div>

      </div>`;

    startActivityScroll();
    loadPeopleAvatars(allUsers);
  }

  function renderAmbientMannTab() {
    const TAGS = [
      { label: 'Psychill',      emoji: '🧠' },
      { label: 'Downtempo',     emoji: '🌊' },
      { label: 'Experimental',  emoji: '🧪' },
    ];
    return `
      <div class="disc-psy-banner" style="background:linear-gradient(135deg,#0f2027,#203a43,#2c5364)">
        <div class="disc-psy-banner-emoji">🌊</div>
        <div>
          <div class="disc-psy-banner-title">Ambient Mann</div>
          <div class="disc-psy-banner-sub">Psychill · Downtempo · Experimental — atmosfærisk elektronika frå undergrunnen</div>
        </div>
      </div>

      <div class="disc-psy-section">
        <div class="disc-psy-section-hdr">
          <span class="disc-psy-section-icon">🎵</span>
          <span class="disc-psy-section-title">Artisten</span>
          <span class="disc-psy-section-badge">radioq37.com</span>
        </div>
        <div class="disc-psy-label-grid" style="grid-template-columns:1fr">
          <a class="disc-psy-label-card" href="https://radioq37.com/artist/ambient-mann/" target="_blank" rel="noopener noreferrer"
             style="gap:1.2rem;align-items:flex-start">
            <div class="disc-psy-label-icon" style="font-size:2.5rem">🌊</div>
            <div style="flex:1">
              <div class="disc-psy-label-name" style="font-size:1.1rem;margin-bottom:0.35rem">Ambient Mann</div>
              <div class="disc-psy-label-desc" style="line-height:1.6">
                Djup, dronerande og atmosfærisk elektronika i skjæringspunktet mellom psychill,
                downtempo og eksperimentell elektronika. Utforsk heile artisten på radioq37.com.
              </div>
              <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:0.75rem">
                ${TAGS.map(t => `<span class="disc-psy-section-badge">${t.emoji} ${t.label}</span>`).join('')}
              </div>
            </div>
            <span class="disc-psy-mix-arrow" style="align-self:center">→</span>
          </a>
        </div>
      </div>

      <div class="disc-psy-section">
        <div class="disc-psy-section-hdr">
          <span class="disc-psy-section-icon">🏷</span>
          <span class="disc-psy-section-title">Sjangere</span>
        </div>
        <div class="disc-psy-label-grid">
          <a class="disc-psy-label-card" href="https://bandcamp.com/tag/psychill" target="_blank" rel="noopener noreferrer">
            <div class="disc-psy-label-icon">🧠</div>
            <div>
              <div class="disc-psy-label-name">Psychill / Bandcamp</div>
              <div class="disc-psy-label-desc">Alle utgivingar tagget psychill</div>
            </div>
          </a>
          <a class="disc-psy-label-card" href="https://bandcamp.com/tag/downtempo" target="_blank" rel="noopener noreferrer">
            <div class="disc-psy-label-icon">🌊</div>
            <div>
              <div class="disc-psy-label-name">Downtempo / Bandcamp</div>
              <div class="disc-psy-label-desc">Langsom, hypnotisk elektronika</div>
            </div>
          </a>
          <a class="disc-psy-label-card" href="https://bandcamp.com/tag/experimental" target="_blank" rel="noopener noreferrer">
            <div class="disc-psy-label-icon">🧪</div>
            <div>
              <div class="disc-psy-label-name">Experimental / Bandcamp</div>
              <div class="disc-psy-label-desc">Grensesprengande eksperimentell elektronika</div>
            </div>
          </a>
        </div>
      </div>
    `;
  }

  function renderPsyTourTab() {
    const SC_MIXES = [
      { title: 'Progressive Psytrance SET 2026', artist: 'STAYOS', url: 'https://soundcloud.com/stayos/progressive-psytrance-set-2026' },
      { title: 'Fantasia — Progressive Psytrance 2026', artist: 'DJ NightStar', url: 'https://soundcloud.com/djnightstar_official/fantasia-progressive-psytrance-mix-2026' },
      { title: 'Progressive Psytrance mix February 2026', artist: 'Electric Samurai', url: 'https://soundcloud.com/dj-electric-samurai/progressive-psytrance-mix-february-2026' },
      { title: 'Feelings — Psytrance Love Mix 2026', artist: 'DJ NightStar', url: 'https://soundcloud.com/djnightstar_official/dj-nightstar-feelings-progressive-psytrance-love-mix-2026' },
      { title: 'Another Dimension — Progressive Psy', artist: 'DJ SAIZ', url: 'https://soundcloud.com/djsaiz/progressive-psytrance-mix' },
      { title: 'Best of Progressive Psytrance (speleliste)', artist: 'Jilax', url: 'https://soundcloud.com/jilaxofficial/sets/bestofpsytrance' },
    ];
    const YT_MIXES = [
      { title: 'Psytrance Full-On — Psychedelic Trips 2026', artist: 'Speed Sound Records', url: 'https://www.youtube.com/watch?v=eVUyzYVhU3c' },
      { title: 'High Energy Progressive & Full-On 2026', artist: 'Psytrance Mix', url: 'https://www.youtube.com/watch?v=EHKus8WnZoc' },
      { title: 'Psytrance Festival Mix 2026 — Massive Drops', artist: 'Festival Vibes', url: 'https://www.youtube.com/watch?v=nuKCevMh7Rk' },
      { title: 'Melodic Full-On Journey 2026 (AI Visuals)', artist: 'Radioactive Project', url: 'https://www.youtube.com/watch?v=iRKh6NbFogY' },
      { title: 'Melodic Psytrance Mix 2026 — Emotional Journey', artist: 'DJ Nightstar', url: 'https://www.youtube.com/watch?v=Y9hZ0OFmM40' },
      { title: 'Psytrance Mix — Juni 2026', artist: 'Nytt sett', url: 'https://www.youtube.com/watch?v=1OgActV73I4' },
    ];
    const LABELS = [
      { emoji: '🏷', name: 'Psytrance på Bandcamp', desc: 'Alle utgivelser tagget psytrance', url: 'https://bandcamp.com/tag/psytrance' },
      { emoji: '🌀', name: 'Progressive Psytrance / Bandcamp', desc: 'Progressiv underkategori — deep & evolving', url: 'https://bandcamp.com/tag/progressive-psytrance' },
      { emoji: '⏱', name: 'Timelapse Records', desc: 'Trance / Psy label — grunnlagt av Timelock', url: 'https://timelapserec.bandcamp.com/' },
      { emoji: '🦏', name: 'Flying Rhino Records', desc: 'UK pionér — progressiv psytrance sidan 90-tallet', url: 'https://flyingrhino.bandcamp.com/' },
      { emoji: '🌐', name: 'Psytrance Guide', desc: 'Oversikt: artistar, labels, subsjangere', url: 'https://psytranceguide.com/' },
      { emoji: '📻', name: 'DMT-FM Psytrance Radio', desc: 'Gratis webradio 24/7 — full-on & progressive', url: 'https://dmt-fm.com/' },
    ];
    const FESTIVALS = [
      { day: '24 jul', month: 'aug 2026', name: 'O.Z.O.R.A. Festival', loc: 'Dádpuszta, Ungarn 🇭🇺', tags: ['Psytrance', 'Downtempo', 'Arts'], url: 'https://2026.ozorafestival.eu/' },
      { day: 'Aug', month: '2026', name: 'Free Earth Festival', loc: 'Hellas 🇬🇷 — strand & hav', tags: ['Beach Psy', 'Full-On'], url: 'https://freeearth-festival.com/' },
      { day: 'Jul', month: '2026', name: 'VooV Experience', loc: 'Putlitz, Tyskland 🇩🇪', tags: ['Progressive', 'Full-On', 'Forest'], url: 'https://voov.de/' },
      { day: 'Sommar', month: '2026', name: 'Psy-Fi Festival', loc: 'Nederland 🇳🇱 — innsjø', tags: ['Psy', 'Workshops', 'Art'], url: 'https://www.psy-fi.nl/' },
      { day: 'Sommar', month: '2026', name: 'Solar Light Festival', loc: 'Italia 🇮🇹', tags: ['Psy', 'Ritual', 'Community'], url: 'https://psymedia.co.za/event_continent/europe/' },
    ];

    return `
      <div class="disc-psy-banner">
        <div class="disc-psy-banner-emoji">🌀</div>
        <div>
          <div class="disc-psy-banner-title">Psytrance Peak Tour</div>
          <div class="disc-psy-banner-sub">Kuraterte miksesett, plateselskap og kommande festivalar frå det psykedeliske undergrunnsuniverset — SoundCloud, YouTube, Bandcamp og live events.</div>
        </div>
      </div>

      <div class="disc-psy-section">
        <div class="disc-psy-section-hdr">
          <span class="disc-psy-section-icon">☁️</span>
          <span class="disc-psy-section-title">SoundCloud — Miksesett</span>
          <span class="disc-psy-section-badge">SoundCloud</span>
        </div>
        <div class="disc-psy-mix-grid">
          ${SC_MIXES.map(m => `
            <a class="disc-psy-mix-card" href="${m.url}" target="_blank" rel="noopener noreferrer">
              <div class="disc-psy-mix-thumb disc-psy-mix-thumb--sc">☁</div>
              <div class="disc-psy-mix-info">
                <div class="disc-psy-mix-title">${escHtml(m.title)}</div>
                <div class="disc-psy-mix-artist">${escHtml(m.artist)}</div>
              </div>
              <span class="disc-psy-mix-arrow">→</span>
            </a>
          `).join('')}
        </div>
      </div>

      <div class="disc-psy-section">
        <div class="disc-psy-section-hdr">
          <span class="disc-psy-section-icon">▶️</span>
          <span class="disc-psy-section-title">YouTube — Fulle sett 2026</span>
          <span class="disc-psy-section-badge">YouTube</span>
        </div>
        <div class="disc-psy-mix-grid">
          ${YT_MIXES.map(m => `
            <a class="disc-psy-mix-card" href="${m.url}" target="_blank" rel="noopener noreferrer">
              <div class="disc-psy-mix-thumb disc-psy-mix-thumb--yt">▶</div>
              <div class="disc-psy-mix-info">
                <div class="disc-psy-mix-title">${escHtml(m.title)}</div>
                <div class="disc-psy-mix-artist">${escHtml(m.artist)}</div>
              </div>
              <span class="disc-psy-mix-arrow">→</span>
            </a>
          `).join('')}
        </div>
      </div>

      <div class="disc-psy-section">
        <div class="disc-psy-section-hdr">
          <span class="disc-psy-section-icon">🏷</span>
          <span class="disc-psy-section-title">Bandcamp & Plateselskap</span>
          <span class="disc-psy-section-badge">Bandcamp</span>
        </div>
        <div class="disc-psy-label-grid">
          ${LABELS.map(l => `
            <a class="disc-psy-label-card" href="${l.url}" target="_blank" rel="noopener noreferrer">
              <div class="disc-psy-label-icon">${l.emoji}</div>
              <div>
                <div class="disc-psy-label-name">${escHtml(l.name)}</div>
                <div class="disc-psy-label-desc">${escHtml(l.desc)}</div>
              </div>
            </a>
          `).join('')}
        </div>
      </div>

      <div class="disc-psy-section">
        <div class="disc-psy-section-hdr">
          <span class="disc-psy-section-icon">🎪</span>
          <span class="disc-psy-section-title">Kommande festivalar 2026</span>
          <span class="disc-psy-section-badge">Live events</span>
        </div>
        <div class="disc-psy-festival-list">
          ${FESTIVALS.map(f => `
            <a class="disc-psy-festival-card" href="${f.url}" target="_blank" rel="noopener noreferrer">
              <div class="disc-psy-festival-date">
                <div class="disc-psy-festival-date-day">${escHtml(f.day)}</div>
                <div class="disc-psy-festival-date-mon">${escHtml(f.month)}</div>
              </div>
              <div class="disc-psy-festival-body">
                <div class="disc-psy-festival-name">${escHtml(f.name)}</div>
                <div class="disc-psy-festival-loc">${f.loc}</div>
                <div class="disc-psy-festival-tags">
                  <span class="disc-psy-festival-tag disc-psy-festival-upcoming">Kommande</span>
                  ${f.tags.map(t => `<span class="disc-psy-festival-tag">${escHtml(t)}</span>`).join('')}
                </div>
              </div>
              <span class="disc-psy-festival-arrow">→</span>
            </a>
          `).join('')}
        </div>
        <a class="disc-psy-cal-link" href="https://www.psycalendar.com/psyfestivals" target="_blank" rel="noopener noreferrer">
          Sjå alle festivalar på PsyCalendar →
        </a>
      </div>
    `;
  }

  function editorialCards() {
    const cards = [
      { emoji:'🌌', title:'Drone Zone Essentials', desc:'Artistar, plateselskap og demo-kontaktar',          action: () => `Discover.openDroneZone()`, highlight: true, droneStyle: true },
      { emoji:'🌀', title:'Psytrance Peak Tour',   desc:'Miksesett, festivalar & plateselskap',              action: () => `Discover.switchTab('psy-tour')`, highlight: true, psyStyle: true },
      { emoji:'⚡', title:'Tekno Undergrunden',    desc:'Artister, events og demos — England & Ibiza',      action: () => `Router.go('/underground')`, highlight: true },
      { emoji:'🌿', title:'Chill Afternoon',       desc:'Downtempo & lounge for hverdagen',                 action: () => `Discover.setGenre('chill')` },
    ];
    return cards.map(c => `
      <div class="disc-editorial-card${c.highlight ? (c.droneStyle ? ' disc-editorial-card--drone' : c.psyStyle ? ' disc-editorial-card--psy' : ' disc-editorial-card--ug') : ''}" onclick="${c.action()}">
        <div class="disc-editorial-art">${c.emoji}</div>
        <div class="disc-editorial-title">${c.title}</div>
        <div class="disc-editorial-desc">${c.desc}</div>
        ${c.highlight ? `<div class="disc-editorial-cta">Utforsk →</div>` : ''}
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
          ${a.bandcamp ? linkBtn(a.bandcamp, '🎵', 'Bandcamp', 'bc') : ''}
          ${a.youtube  ? linkBtn(a.youtube,  '▶', 'YouTube',  'yt') : ''}
          ${a.facebook ? linkBtn(a.facebook, 'f', 'Facebook', 'fb') : ''}
          ${a.website  ? linkBtn(a.website,  '🌐', 'Nettstad', 'web') : ''}
        </div>
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
        <p class="dz-label-artists">🎤 ${escHtml(l.artists)}</p>
        <div class="dz-label-links">
          ${l.website  ? linkBtn(l.website,  '🌐', 'Nettstad', 'web') : ''}
          ${l.bandcamp ? linkBtn(l.bandcamp, '🎵', 'Bandcamp', 'bc') : ''}
          ${l.facebook ? linkBtn(l.facebook, 'f', 'Facebook', 'fb') : ''}
          ${l.youtube  ? linkBtn(l.youtube,  '▶', 'YouTube',  'yt') : ''}
        </div>
        <div class="dz-demo-box">
          <div class="dz-demo-title">📬 Send demo</div>
          <div class="dz-demo-contact">${escHtml(l.demoContact)}</div>
          <div class="dz-demo-note">${escHtml(l.demoNote)}</div>
        </div>
      </div>
    `).join('');

    return `
      <div class="dz-wrap">
        <div class="dz-hero">
          <button class="dz-back-btn" onclick="Discover.closeDroneZone()">← Tilbake</button>
          <div class="dz-hero-title">🌌 Drone Zone Essentials</div>
          <div class="dz-hero-sub">Dark Ambient · Ritual Drone · Atmosfærisk</div>
          <div class="dz-hero-tags">
            <span class="dz-hero-tag">Cryo Chamber</span>
            <span class="dz-hero-tag">Cyclic Law</span>
            <span class="dz-hero-tag">Bandcamp</span>
            <span class="dz-hero-tag">Demo-kontaktar</span>
          </div>
        </div>

        <div class="dz-section">
          <div class="dz-section-header">
            <h2 class="dz-section-title">🎙 Artistar</h2>
            <span class="dz-section-count">${DRONE_ARTISTS.length} artistar</span>
          </div>
          <div class="dz-artists-grid">${artistsHtml}</div>
        </div>

        <div class="dz-section">
          <div class="dz-section-header">
            <h2 class="dz-section-title">🏷 Plateselskap — Send Demo</h2>
            <span class="dz-section-count">${DRONE_LABELS.length} selskap</span>
          </div>
          <div class="dz-labels-grid">${labelsHtml}</div>
        </div>
      </div>
    `;
  }

  function openDroneZone() {
    droneZoneOpen = true;
    // Switch to tracks sub-tab so the content area is visible
    if (activeSubTab !== 'tracks') switchSubTab('tracks');
    const content = document.getElementById('disc-tracks-content');
    if (content) content.innerHTML = renderDroneZone();
  }

  function closeDroneZone() {
    droneZoneOpen = false;
    setGenre('drone');
  }

  function startActivityScroll() {
    let idx = 0;
    clearInterval(activityTimer);
    activityTimer = setInterval(() => {
      const feed = document.getElementById('disc-activity-feed');
      if (!feed) { clearInterval(activityTimer); return; }
      const items = feed.querySelectorAll('.disc-activity-item');
      if (!items.length) return;
      const item = feed.querySelector('.disc-activity-item');
      if (item) {
        item.style.transition = 'background 0.4s';
        item.style.background = 'rgba(124,58,237,0.12)';
        setTimeout(() => { if (item) item.style.background = ''; }, 700);
      }
      idx = (idx + 1) % FAKE_ACTIVITY.length;
      const clone = items[0].cloneNode(true);
      feed.appendChild(clone);
      feed.removeChild(items[0]);
    }, 6000);
  }

  async function loadPeopleAvatars(users) {
    for (const u of users) {
      if (!u.avatarMediaId) continue;
      const url = await DB.getBlobUrl('media', u.avatarMediaId).catch(() => null);
      if (!url) continue;
      const el = document.getElementById(`disc-pav-${u.username}`);
      if (el) el.innerHTML = `<img src="${url}" alt="${escHtml(u.displayName)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
    }
  }

  // ── Tab / sub-tab switching ───────────────────────────────────────────
  function switchTab(tab) {
    activeTab = tab;
    const TAB_LABELS = { music: 'Musikk', people: 'folk', 'psy-tour': 'Psytrance', 'ambient-mann': 'Ambient Mann' };
    document.querySelectorAll('.disc-tab-btn').forEach(b => {
      const matched = Object.entries(TAB_LABELS).find(([, label]) => b.textContent.includes(label));
      b.classList.toggle('active', matched ? matched[0] === tab : false);
    });
    document.getElementById('disc-music-tab')?.classList.toggle('hidden', tab !== 'music');
    document.getElementById('disc-people-tab')?.classList.toggle('hidden', tab !== 'people');
    document.getElementById('disc-psy-tour-tab')?.classList.toggle('hidden', tab !== 'psy-tour');
    document.getElementById('disc-ambient-mann-tab')?.classList.toggle('hidden', tab !== 'ambient-mann');
  }

  function switchSubTab(tab) {
    activeSubTab = tab;
    document.querySelectorAll('.disc-sub-tab').forEach(b => {
      b.classList.toggle('active',
        (tab === 'tracks' && b.textContent.includes('Spor')) ||
        (tab === 'upload' && b.textContent.includes('Last opp')) ||
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
    droneZoneOpen = false;
    activeGenre = tag;

    document.querySelectorAll('.disc-genre-btn').forEach(b => {
      const genre = GENRES.find(g => b.textContent.trim().includes(g.label));
      if (genre) b.classList.toggle('active', genre.tag === tag);
    });
    document.querySelectorAll('.disc-tag-pill').forEach(b => {
      const genre = GENRES.find(g => b.textContent.includes(g.label));
      if (genre) b.classList.toggle('active', genre.tag === tag);
    });

    const tracks = filteredTracks();
    const grid  = document.getElementById('disc-track-grid');
    const count = document.getElementById('disc-count');
    if (grid)  grid.innerHTML  = renderTrackGrid(tracks);
    if (count) count.textContent = `${tracks.length} spor`;

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
        return `<button class="disc-tag-pill ${activeGenre === g.tag ? 'active' : ''} ${cnt === 0 ? 'disc-genre-btn--empty' : ''}"
          onclick="Discover.setGenre('${g.tag}')">${g.emoji} ${g.label}${cnt > 0 ? `<span class="disc-genre-count">${cnt}</span>` : ''}</button>`;
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
    if (count) count.textContent = `${users.length} brukere`;
    loadPeopleAvatars(users);
  }

  // ── Playback ──────────────────────────────────────────────────────────
  async function playTrack(id) {
    try {
      await Player.setQueue([id], 0);
    } catch {
      App.toast('Kunne ikke spille av sporet', 'error');
    }
  }

  function wishlist(id) {
    const track = allTracks.find(t => t.id === id);
    if (!track) return;
    App.toast(`"${track.title}" lagt til ønskeliste ♡`, 'info');
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
    if (isArtistUerfaren(track)) {
      const q = getDownloadQuota();
      if (track.isMix) q.mixes++; else q.songs++;
      saveDownloadQuota(q);
    }
    refreshTrackGrid();
  }

  async function doDownload(id, track) {
    try {
      const rec = await DB.get('music', id);
      if (!rec) { App.toast('Filen ble ikke funnet', 'error'); return; }
      const blob = new Blob([rec.data], { type: rec.type || 'audio/mpeg' });
      const url  = URL.createObjectURL(blob);
      const ext  = (rec.type || 'audio/mpeg').split('/')[1] || 'mp3';
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `${track.artist} - ${track.title}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      App.toast(`"${track.title}" lastes ned ⬇️`, 'success');
    } catch {
      App.toast('Nedlasting feilet', 'error');
    }
  }

  function showDownloadModal(track) {
    const price = dlPrice(track);
    const type  = track.isMix ? 'miks' : 'sang';
    const limit = track.isMix ? FREE_MIX_LIMIT : FREE_SONG_LIMIT;
    const q     = getDownloadQuota();
    const used  = track.isMix ? q.mixes : q.songs;

    const existing = document.getElementById('dl-payment-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id    = 'dl-payment-modal';
    modal.className = 'modal-overlay';
    modal.onclick = e => { if (e.target === modal) closeDownloadModal(); };
    modal.innerHTML = `
      <div class="modal-box dl-payment-box">
        <button class="dl-modal-close" onclick="Discover.closeDownloadModal()">✕</button>
        <div class="dl-modal-header">
          <div class="dl-modal-icon">🔒</div>
          <h3 class="dl-modal-title">Last ned ${type}</h3>
          <div class="dl-modal-track-info">
            <strong>${escHtml(track.title)}</strong>
            <span>av ${escHtml(track.artist)}</span>
          </div>
        </div>
        <div class="dl-modal-quota-box">
          <div class="dl-modal-quota-bar">
            <div class="dl-modal-quota-fill" style="width:${Math.min(100, (used / limit) * 100)}%"></div>
          </div>
          <p class="dl-modal-quota-text">
            Du har brukt <strong>${used} av ${limit}</strong> gratis ${type}-nedlastinger denne uken.
            Nullstilles om <strong>${nextFreeReset()}</strong>.
          </p>
        </div>
        <div class="dl-modal-price-row">
          <div class="dl-modal-price">${price} <span class="dl-modal-currency">kr</span></div>
          <div class="dl-modal-price-sub">per ${type}-nedlasting</div>
        </div>
        <div class="dl-modal-actions">
          <button class="btn btn-primary dl-pay-btn" onclick="Discover.confirmDownloadPayment()">
            💳 Betal ${price} kr og last ned
          </button>
          <button class="btn btn-ghost" onclick="Discover.closeDownloadModal()">Avbryt</button>
        </div>
        <p class="dl-modal-note">
          Gratis kvote: ${FREE_SONG_LIMIT} sanger + ${FREE_MIX_LIMIT} mikser per uke. Pro-artister er alltid gratis.
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
    if (count) count.textContent = `${filteredTracks().length} spor`;
  }

  // ── Upload ────────────────────────────────────────────────────────────
  function onCategoryChange(sel) {
    const cat  = MAIN_CATEGORIES.find(c => c.tag === sel.value);
    const hint = document.getElementById('disc-up-cat-hint');
    if (!hint) return;
    if (cat && cat.tag && cat.labels.length) {
      hint.textContent = `${cat.labels.length} plateselskap tilgjengelig — du kan sende demo etter opplasting`;
      hint.style.color = 'var(--accent)';
    } else {
      hint.textContent = 'Du kan alltid velge kategori seinere fra profilen din';
      hint.style.color = 'var(--text2)';
    }
  }

  function renderUploadSuccess(title, categoryTag) {
    const cat    = MAIN_CATEGORIES.find(c => c.tag === categoryTag);
    const hasCat = cat && cat.tag && cat.labels.length;
    const user   = Auth.current();
    return `
      <div class="disc-upload-success">
        <div class="disc-up-success-icon">✅</div>
        <h3 class="disc-up-success-title">"${escHtml(title)}" er lagt til på din profil!</h3>
        <p class="disc-up-success-sub">Sporet er nå synlig på din profil og i Discover.</p>

        ${hasCat ? `
        <div class="disc-up-labels-box">
          <div class="disc-up-labels-heading">✉️ Send demo til plateselskap — ${escHtml(cat.emoji)} ${escHtml(cat.label)}</div>
          <div class="disc-up-labels-list">
            ${cat.labels.map(l => `
              <a class="disc-up-label-btn"
                 href="mailto:${escHtml(l.email)}?subject=${encodeURIComponent('Demo: ' + title)}&body=${encodeURIComponent('Hei,\n\nJeg ønsker å sende deg en demo av sporet «' + title + '».\n\nMed vennlig hilsen')}">
                ${escHtml(l.name)}
              </a>
            `).join('')}
          </div>
          <p class="disc-up-labels-note">Åpner din e-postklient med ferdig emnelinje og melding</p>
        </div>` : `
        <div class="disc-up-nocat-box">
          <p>Ingen hoved kategori valgt — gå til profilen din for å velge kategori og kontakte plateselskap.</p>
          <a href="#/edit" class="btn btn-ghost btn-sm" style="margin-top:0.5rem">Gå til profileditor →</a>
        </div>`}

        <div class="disc-up-success-actions">
          <a href="#/u/${escHtml(user?.username || '')}" class="btn btn-primary btn-sm">👤 Min profil</a>
          <button class="btn btn-ghost btn-sm" onclick="Discover.switchSubTab('upload')">🔼 Last opp mer</button>
          <button class="btn btn-ghost btn-sm" onclick="Discover.switchSubTab('tracks')">🎵 Se alle spor</button>
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
    if (!user) { App.toast('Logg inn for å laste opp', 'error'); return; }

    const fileInput = document.getElementById('disc-up-file');
    const file = fileInput?.files[0];
    if (!file) { App.toast('Velg en lydfil først', 'error'); return; }

    const title    = document.getElementById('disc-up-title')?.value.trim()
                      || file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
    const artist   = document.getElementById('disc-up-artist')?.value.trim() || user.displayName;
    const genre    = document.getElementById('disc-up-genre')?.value
                      || (activeGenre !== 'all' ? activeGenre : 'electronic');
    const desc     = document.getElementById('disc-up-desc')?.value.trim() || '';
    const category = document.getElementById('disc-up-category')?.value || '';
    const isMix    = document.getElementById('disc-up-ismix')?.checked || false;

    const btn = document.getElementById('disc-up-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Laster opp…'; }

    try {
      const duration = await getAudioDuration(file);
      const id = 'music_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);

      await DB.storeFile('music', id, file, {
        name: title, title, artist, genre,
        description: desc, mainCategory: category,
        duration, uploadedAt: Date.now(), isMix,
      });

      const musicIds = [...(user.musicIds || []), id];
      Auth.updateUser(user.username, { musicIds });

      App.toast(`"${title}" er lastet opp! 🎵`, 'success');
      allTracks = await loadAllTracks();

      const uploadEl = document.getElementById('disc-upload-content');
      if (uploadEl) uploadEl.innerHTML = renderUploadSuccess(title, category);

      const grid  = document.getElementById('disc-track-grid');
      const count = document.getElementById('disc-count');
      if (grid)  grid.innerHTML  = renderTrackGrid(filteredTracks());
      if (count) count.textContent = `${filteredTracks().length} spor`;

    } catch (err) {
      console.error(err);
      App.toast('Feil ved opplasting', 'error');
      if (btn) { btn.disabled = false; btn.textContent = '🔼 Last opp'; }
    }
  }

  // ── Genre radio favorites ─────────────────────────────────────────────
  function setDiscGenreRadio(genre, stationId) {
    saveGenreRadio(genre, stationId);
    const radioEl = document.getElementById('disc-radio-content');
    if (radioEl) radioEl.innerHTML = renderRadioFavTab();
    const station = Radio.stations.find(s => s.id === stationId);
    const gLabel  = GENRES.find(g => g.tag === genre)?.label || genre;
    if (station) App.toast(`"${station.name}" er din favoritt for ${gLabel} ⭐`, 'success');
  }

  function clearGenreRadio(genre) {
    delete discGenreRadios[genre];
    localStorage.setItem(genreRadioKey(), JSON.stringify(discGenreRadios));
    const radioEl = document.getElementById('disc-radio-content');
    if (radioEl) radioEl.innerHTML = renderRadioFavTab();
  }

  return {
    render, setGenre, setRole, switchTab, switchSubTab,
    playTrack, wishlist, uploadDiscTrack, onUploadFileChange,
    onCategoryChange, setDiscGenreRadio, clearGenreRadio,
    downloadTrack, closeDownloadModal, confirmDownloadPayment,
    openDroneZone, closeDroneZone,
  };
})();
