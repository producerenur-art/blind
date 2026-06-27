// Techno Underground — artists, events, music links, demo contact
const Underground = (() => {

  const ENGLAND_ARTISTS = [
    {
      name: 'Surgeon',
      city: 'Birmingham',
      desc: 'Birmingham-basert techno-pioner. Kjent for rå, industriell lyd og massiv tilstedeværelse bak boksen.',
      ra: 'https://ra.co/dj/surgeon',
      sc: 'https://soundcloud.com/surgeon-official',
      tag: 'Industrial Techno',
    },
    {
      name: 'Blawan',
      city: 'Yorkshire',
      desc: 'Avant-garde techno og breakbeats. En av Storbritannias mest nyskapende elektroniske artister.',
      ra: 'https://ra.co/dj/blawan',
      sc: 'https://soundcloud.com/blawan',
      tag: 'Industrial / Breaks',
    },
    {
      name: 'Perc',
      city: 'London',
      desc: 'Grunnlegger av Perc Trax. Rå, presisjonstekno med industrielle elementer og intens energi.',
      ra: 'https://ra.co/dj/perc',
      sc: 'https://soundcloud.com/perctrax',
      tag: 'Hard Techno',
    },
    {
      name: 'Andy Stott',
      city: 'Manchester',
      desc: 'Modern Love-artist fra Manchester. Atmosfærisk, tung og dyp techno som borer seg inn i sjelen.',
      ra: 'https://ra.co/dj/andystott',
      sc: 'https://soundcloud.com/andy-stott',
      tag: 'Dark Techno',
    },
    {
      name: 'Truss',
      city: 'London',
      desc: 'London-basert producer kjent for ren, kald og mekanisk techno. Grunnlegger av Modus-platelabelen.',
      ra: 'https://ra.co/dj/truss',
      sc: 'https://soundcloud.com/truss',
      tag: 'Minimal Techno',
    },
    {
      name: 'Dave Clarke',
      city: 'Brighton',
      desc: 'The Baron of Techno — ikonisk britisk DJ med røtter dypt plantet i Detroit-lyden.',
      ra: 'https://ra.co/dj/daveclarke',
      sc: 'https://soundcloud.com/dave-clarke',
      tag: 'Detroit Techno',
    },
  ];

  const IBIZA_ARTISTS = [
    {
      name: 'Carl Cox',
      city: 'Ibiza / Brighton',
      desc: 'Legendarisk resident på Space og Music Is Revolution. Kongen av Ibiza-techno gjennom tre tiår.',
      ra: 'https://ra.co/dj/carlcox',
      sc: 'https://soundcloud.com/carlcox-official',
      tag: 'Techno / Tech House',
    },
    {
      name: 'Ricardo Villalobos',
      city: 'Ibiza / Berlin',
      desc: 'Minimal techno-maestro. Lange, hypnotiske sets som er blitt legendariske på øya.',
      ra: 'https://ra.co/dj/ricardovillalobos',
      sc: null,
      tag: 'Minimal Techno',
    },
    {
      name: 'Loco Dice',
      city: 'Ibiza',
      desc: 'Grunnlegger av Desolat. Fast resident på Ibizas beste klubber med fengslende, groovy sett.',
      ra: 'https://ra.co/dj/locodice',
      sc: 'https://soundcloud.com/loco-dice',
      tag: 'Tech House / Techno',
    },
    {
      name: 'DJ Harvey',
      city: 'Ibiza',
      desc: 'Ibiza-ikon. Eklektiske, musikalske sett som beveger seg gjennom disco, house og techno.',
      ra: 'https://ra.co/dj/djharvey',
      sc: null,
      tag: 'Eclectic / House',
    },
    {
      name: 'Sven Väth',
      city: 'Ibiza / Frankfurt',
      desc: 'Grunnlegger av Cocoon og veteran-resident på Amnesia. En av technoens mest ikoniske skikkelser.',
      ra: 'https://ra.co/dj/svenvath',
      sc: 'https://soundcloud.com/svenvath',
      tag: 'Techno',
    },
    {
      name: 'Joseph Capriati',
      city: 'Ibiza / Napoli',
      desc: 'Eksplosiv techno og tech house. Fast resident på DC-10 og Amnesia sesong etter sesong.',
      ra: 'https://ra.co/dj/josephcapriati',
      sc: 'https://soundcloud.com/josephcapriati',
      tag: 'Techno / Tech House',
    },
  ];

  const VENUES_UK = [
    {
      name: 'fabric',
      city: 'London',
      desc: 'Londons fremste techno-institusjon siden 1999. Fredag = FabricLive, Lørdag = fabric.',
      url: 'https://www.fabriclondon.com',
      tag: 'Club',
      events: 'https://ra.co/clubs/uk/london/fabric',
    },
    {
      name: 'Printworks',
      city: 'London',
      desc: 'Ikonisk industriell venue i London Bridge-området med enestående lydsystem.',
      url: 'https://printworkslondon.co.uk',
      tag: 'Venue',
      events: 'https://ra.co/clubs/uk/london/printworks-london',
    },
    {
      name: 'Warehouse Project',
      city: 'Manchester',
      desc: 'Manchesters største techno-event. Holder til i historiske Aviva Studios fra september til desember.',
      url: 'https://www.thewarehouseproject.com',
      tag: 'Festival / Club',
      events: 'https://ra.co/promoters/uk/warehouseproject',
    },
    {
      name: 'Sub Club',
      city: 'Glasgow',
      desc: 'Et av Europas eldste og mest respekterte undergrunns-klubber — aktivt siden 1987.',
      url: 'https://subclub.co.uk',
      tag: 'Club',
      events: 'https://ra.co/clubs/uk/glasgow/sub-club',
    },
  ];

  const VENUES_IBIZA = [
    {
      name: 'DC-10',
      city: 'Ibiza',
      desc: 'Hjem til Circoloco. Ibizas råeste og mest autentiske undergrunnsklubb med åpen terrasse.',
      url: 'https://www.circoloco.com',
      tag: 'Club',
      events: 'https://ra.co/clubs/es/ibiza/dc10',
    },
    {
      name: 'Amnesia',
      city: 'Ibiza',
      desc: 'Et av verdens mest berømte klubber. Hjem til Sven Väths Cocoon og mange ikoniske residencies.',
      url: 'https://www.amnesia.es',
      tag: 'Club',
      events: 'https://ra.co/clubs/es/ibiza/amnesia',
    },
    {
      name: 'Hï Ibiza',
      city: 'Ibiza',
      desc: 'Moderne megaklubb kjent for banebrytende lydsystem og spektakulært lysshow.',
      url: 'https://www.hiibiza.com',
      tag: 'Club',
      events: 'https://ra.co/clubs/es/ibiza/hi-ibiza',
    },
    {
      name: 'Ushuaïa',
      city: 'Ibiza',
      desc: 'Åpen utescene med havutsikt. Sommers beste dag- og solnedgangs-events på øya.',
      url: 'https://www.ushuaiaibiza.com',
      tag: 'Open Air',
      events: 'https://ra.co/clubs/es/ibiza/ushuaia-ibiza-beach-hotel',
    },
  ];

  const MUSIC_LINKS = [
    { name: 'SoundCloud — Techno', desc: 'Tracks og miks fra artister over hele verden', url: 'https://soundcloud.com/tags/techno', color: '#ff5500', icon: '☁️' },
    { name: 'Boiler Room', desc: 'Live-sett fra verdens beste artister', url: 'https://www.youtube.com/@BoilerRoomTV', color: '#e00', icon: '▶' },
    { name: 'RA Podcasts', desc: 'Kuraterte miks fra Resident Advisor', url: 'https://ra.co/podcasts', color: '#7c3aed', icon: '🎙' },
    { name: 'Mixcloud — Techno', desc: 'Lange DJ-miks og radio-shows', url: 'https://www.mixcloud.com/tag/techno/', color: '#5000ff', icon: '🌀' },
    { name: 'Beatport Techno', desc: 'Kjøp og last ned profesjonell techno', url: 'https://www.beatport.com/genre/techno/6', color: '#01ff95', icon: '🎵' },
    { name: 'Bandcamp — Techno', desc: 'Støtt uavhengige artister direkte', url: 'https://bandcamp.com/tag/techno', color: '#1da0c3', icon: '🎸' },
  ];

  function escHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function artistCard(a) {
    const initials = a.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    return `
      <div class="ug-artist-card">
        <div class="ug-artist-avatar">${escHtml(initials)}</div>
        <div class="ug-artist-body">
          <div class="ug-artist-name">${escHtml(a.name)}</div>
          <div class="ug-artist-city">${Icon('map-pin')} ${escHtml(a.city)}</div>
          <span class="ug-artist-tag">${escHtml(a.tag)}</span>
          <p class="ug-artist-desc">${escHtml(a.desc)}</p>
          <div class="ug-artist-links">
            <a href="${escHtml(a.ra)}" target="_blank" rel="noopener" class="ug-link-btn ug-link-ra">Resident Advisor</a>
            ${a.sc ? `<button onclick="openMedia('${escHtml(a.sc)}','${escHtml(a.name)} på SoundCloud')" class="ug-link-btn ug-link-sc">SoundCloud</button>` : ''}
          </div>
        </div>
      </div>`;
  }

  function venueCard(v) {
    return `
      <div class="ug-venue-card">
        <div class="ug-venue-header">
          <span class="ug-venue-name">${escHtml(v.name)}</span>
          <span class="ug-venue-badge">${escHtml(v.tag)}</span>
        </div>
        <div class="ug-venue-city">${Icon('map-pin')} ${escHtml(v.city)}</div>
        <p class="ug-venue-desc">${escHtml(v.desc)}</p>
        <div class="ug-venue-actions">
          <a href="${escHtml(v.url)}" target="_blank" rel="noopener" class="ug-link-btn ug-link-web">Nettside ${Icon('arrow-right')}</a>
          <a href="${escHtml(v.events)}" target="_blank" rel="noopener" class="ug-link-btn ug-link-ra">Arrangementer</a>
        </div>
      </div>`;
  }

  function musicCard(m) {
    const embeddable = m.url.includes('soundcloud.com') || m.url.includes('mixcloud.com');
    if (embeddable) {
      return `
        <div class="ug-music-card" role="button" style="cursor:pointer" onclick="openMedia('${escHtml(m.url)}','${escHtml(m.name).replace(/'/g,'&#39;')}')">
          <div class="ug-music-icon" style="background:${escHtml(m.color)}">${iconForEmoji(m.icon)}</div>
          <div class="ug-music-name">${escHtml(m.name)}</div>
          <div class="ug-music-desc">${escHtml(m.desc)}</div>
        </div>`;
    }
    return `
      <a class="ug-music-card" href="${escHtml(m.url)}" target="_blank" rel="noopener">
        <div class="ug-music-icon" style="background:${escHtml(m.color)}">${iconForEmoji(m.icon)}</div>
        <div class="ug-music-name">${escHtml(m.name)}</div>
        <div class="ug-music-desc">${escHtml(m.desc)}</div>
      </a>`;
  }

  function render() {
    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="ug-page">

        <!-- HERO -->
        <div class="ug-hero">
          <div class="ug-hero-glow"></div>
          <button class="ug-back-btn" onclick="Router.go('/discover')">${Icon('arrow-left')} Tilbake til Discover</button>
          <div class="ug-hero-badge">${Icon('zap')} Underground</div>
          <h1 class="ug-hero-title">Tekno Undergrunden</h1>
          <p class="ug-hero-sub">De hypnotiske groovsene, de mørkeste beatene — fra Englands fabrikkloft til Ibizas natthimmel.</p>
        </div>

        <div class="ug-content">

          <!-- ENGLAND ARTISTS -->
          <section class="ug-section">
            <div class="ug-section-header">
              <div class="ug-section-flag">🇬🇧</div>
              <div>
                <h2 class="ug-section-title">England — Artister</h2>
                <p class="ug-section-sub">Fra Birminghams fabrikklyd til Londons underjordiske klubber</p>
              </div>
            </div>
            <div class="ug-artist-grid">
              ${ENGLAND_ARTISTS.map(a => artistCard(a)).join('')}
            </div>
          </section>

          <!-- IBIZA ARTISTS -->
          <section class="ug-section">
            <div class="ug-section-header">
              <div class="ug-section-flag">🇪🇸</div>
              <div>
                <h2 class="ug-section-title">Ibiza — Artister</h2>
                <p class="ug-section-sub">Øyas legendariske DJ-er og residenter</p>
              </div>
            </div>
            <div class="ug-artist-grid">
              ${IBIZA_ARTISTS.map(a => artistCard(a)).join('')}
            </div>
          </section>

          <!-- UK EVENTS -->
          <section class="ug-section">
            <div class="ug-section-header">
              <div class="ug-section-flag">${Icon('ticket')}</div>
              <div>
                <h2 class="ug-section-title">Arrangementer — England</h2>
                <p class="ug-section-sub">Finn billetter og events direkte fra klubbene og via Resident Advisor</p>
              </div>
            </div>
            <div class="ug-venue-grid">
              ${VENUES_UK.map(v => venueCard(v)).join('')}
            </div>
            <a class="ug-ra-banner" href="https://ra.co/events/uk" target="_blank" rel="noopener">
              ${Icon('search')} Se alle UK-arrangementer på <strong>Resident Advisor</strong> ${Icon('arrow-right')}
            </a>
          </section>

          <!-- IBIZA EVENTS -->
          <section class="ug-section">
            <div class="ug-section-header">
              <div class="ug-section-flag">${Icon('sun')}</div>
              <div>
                <h2 class="ug-section-title">Arrangementer — Ibiza</h2>
                <p class="ug-section-sub">Sesongens beste venues og parties på øya</p>
              </div>
            </div>
            <div class="ug-venue-grid">
              ${VENUES_IBIZA.map(v => venueCard(v)).join('')}
            </div>
            <a class="ug-ra-banner" href="https://ra.co/events/es/ibiza" target="_blank" rel="noopener">
              ${Icon('search')} Se alle Ibiza-arrangementer på <strong>Resident Advisor</strong> ${Icon('arrow-right')}
            </a>
          </section>

          <!-- MUSIC LINKS -->
          <section class="ug-section">
            <div class="ug-section-header">
              <div class="ug-section-flag">${Icon('headphones')}</div>
              <div>
                <h2 class="ug-section-title">Musikk — Lytt nå</h2>
                <p class="ug-section-sub">Strøm og last ned fra de beste kanalene på nettet</p>
              </div>
            </div>
            <div class="ug-music-grid">
              ${MUSIC_LINKS.map(m => musicCard(m)).join('')}
            </div>
          </section>

          <!-- DEMO CONTACT -->
          <section class="ug-section">
            <div class="ug-demo-card">
              <div class="ug-demo-icon">${Icon('mail')}</div>
              <div class="ug-demo-body">
                <h2 class="ug-demo-title">Send Demo</h2>
                <p class="ug-demo-desc">
                  Har du produsert techno eller elektronisk musikk og vil nå ut til klubber, plateselskaper og DJer?
                  Send din demo til redaksjonen på Sound Core — vi lytter til alt vi mottar.
                </p>
                <a href="mailto:demos@soundcore.no" class="ug-demo-email">
                  ${Icon('mail')} demos@soundcore.no
                </a>
                <div class="ug-demo-tips">
                  <p class="ug-demo-tips-title">Tips for innsending:</p>
                  <ul class="ug-demo-tips-list">
                    <li>Send lenke til SoundCloud (privat eller offentlig)</li>
                    <li>Beskriv lyden din kort — sjanger, inspirasjon, BPM</li>
                    <li>Legg ved sosiale medier og kontaktinfo</li>
                    <li>Vi svarer innen 2–4 uker</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

        </div>
      </div>
    `;
  }

  return { render };
})();
