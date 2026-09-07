// Techno Underground — artists, events, music links, demo contact
const Underground = (() => {

  const ENGLAND_ARTISTS = [
    {
      name: 'Surgeon',
      city: 'Birmingham',
      desc: 'Birmingham-based techno pioneer. Known for raw, industrial sound and a massive presence behind the decks.',
      ra: 'https://ra.co/dj/surgeon',
      sc: 'https://soundcloud.com/dynamic-tension', // Surgeons ekte SoundCloud-handle (verifisert via sidetittel), retta 07.09.2026
      tag: 'Industrial Techno',
    },
    {
      name: 'Blawan',
      city: 'Yorkshire',
      desc: 'Avant-garde techno and breakbeats. One of Britain’s most innovative electronic artists.',
      ra: 'https://ra.co/dj/blawan',
      sc: 'https://soundcloud.com/blawan',
      tag: 'Industrial / Breaks',
    },
    {
      name: 'Perc',
      city: 'London',
      desc: 'Founder of Perc Trax. Raw, precision techno with industrial elements and intense energy.',
      ra: 'https://ra.co/dj/perc',
      sc: 'https://soundcloud.com/perc', // Perc sin ekte SoundCloud-handle (verifisert via sidetittel), retta 07.09.2026
      tag: 'Hard Techno',
    },
    {
      name: 'Andy Stott',
      city: 'Manchester',
      desc: 'Modern Love artist from Manchester. Atmospheric, heavy and deep techno that burrows into the soul.',
      ra: 'https://ra.co/dj/andystott',
      sc: 'https://soundcloud.com/andystott-music', // var soundcloud.com/andy-stott, feil brukar (878andy12), retta 07.09.2026
      tag: 'Dark Techno',
    },
    {
      name: 'Truss',
      city: 'London',
      desc: 'London-based producer known for clean, cold and mechanical techno. Founder of the Modus record label.',
      ra: 'https://ra.co/dj/truss',
      sc: 'https://soundcloud.com/truss',
      tag: 'Minimal Techno',
    },
    {
      name: 'Dave Clarke',
      city: 'Brighton',
      desc: 'The Baron of Techno — iconic British DJ with roots planted deep in the Detroit sound.',
      ra: 'https://ra.co/dj/daveclarke',
      sc: 'https://soundcloud.com/dave-clarke',
      tag: 'Detroit Techno',
    },
  ];

  const IBIZA_ARTISTS = [
    {
      name: 'Carl Cox',
      city: 'Ibiza / Brighton',
      desc: 'Legendary resident at Space and Music Is Revolution. The king of Ibiza techno for three decades.',
      ra: 'https://ra.co/dj/carlcox',
      sc: 'https://soundcloud.com/carl-cox', // var carlcox-official (404), retta 07.09.2026
      tag: 'Techno / Tech House',
    },
    {
      name: 'Ricardo Villalobos',
      city: 'Ibiza / Berlin',
      desc: 'Minimal techno maestro. Long, hypnotic sets that have become legendary on the island.',
      ra: 'https://ra.co/dj/ricardovillalobos',
      sc: null,
      tag: 'Minimal Techno',
    },
    {
      name: 'Loco Dice',
      city: 'Ibiza',
      desc: 'Founder of Desolat. A regular resident at Ibiza’s best clubs with captivating, groovy sets.',
      ra: 'https://ra.co/dj/locodice',
      sc: 'https://soundcloud.com/locodiceofc', // var soundcloud.com/loco-dice, feil brukar (Fernando k-po), retta 07.09.2026
      tag: 'Tech House / Techno',
    },
    {
      name: 'DJ Harvey',
      city: 'Ibiza',
      desc: 'Ibiza icon. Eclectic, musical sets that move through disco, house and techno.',
      ra: 'https://ra.co/dj/djharvey',
      sc: null,
      tag: 'Eclectic / House',
    },
    {
      name: 'Sven Väth',
      city: 'Ibiza / Frankfurt',
      desc: 'Founder of Cocoon and veteran resident at Amnesia. One of techno’s most iconic figures.',
      ra: 'https://ra.co/dj/svenvath',
      sc: 'https://soundcloud.com/svenvath',
      tag: 'Techno',
    },
    {
      name: 'Joseph Capriati',
      city: 'Ibiza / Napoli',
      desc: 'Explosive techno and tech house. A regular resident at DC-10 and Amnesia season after season.',
      ra: 'https://ra.co/dj/josephcapriati',
      sc: 'https://soundcloud.com/josephcapriati',
      tag: 'Techno / Tech House',
    },
  ];

  const VENUES_UK = [
    {
      name: 'fabric',
      city: 'London',
      desc: 'London’s premier techno institution since 1999. Friday = FabricLive, Saturday = fabric.',
      url: 'https://www.fabriclondon.com',
      tag: 'Club',
      events: 'https://ra.co/clubs/uk/london/fabric',
    },
    {
      name: 'Printworks',
      city: 'London',
      desc: 'Iconic industrial venue in the London Bridge area with an outstanding sound system.',
      url: 'https://printworkslondon.co.uk',
      tag: 'Venue',
      events: 'https://ra.co/clubs/uk/london/printworks-london',
    },
    {
      name: 'Warehouse Project',
      city: 'Manchester',
      desc: 'Manchester’s biggest techno event. Housed in the historic Aviva Studios from September to December.',
      url: 'https://www.thewarehouseproject.com',
      tag: 'Festival / Club',
      events: 'https://ra.co/promoters/uk/warehouseproject',
    },
    {
      name: 'Sub Club',
      city: 'Glasgow',
      desc: 'One of Europe’s oldest and most respected underground clubs — active since 1987.',
      url: 'https://subclub.co.uk',
      tag: 'Club',
      events: 'https://ra.co/clubs/uk/glasgow/sub-club',
    },
  ];

  const VENUES_IBIZA = [
    {
      name: 'DC-10',
      city: 'Ibiza',
      desc: 'Home of Circoloco. Ibiza’s rawest and most authentic underground club with an open terrace.',
      url: 'https://dc10ibiza.com/en/', // circoloco.com (utan www) løyser DNS men er ein UBESLEKTA sirkusduo, ikkje klubben — retta 07.09.2026
      tag: 'Club',
      events: 'https://ra.co/clubs/es/ibiza/dc10',
    },
    {
      name: 'Amnesia',
      city: 'Ibiza',
      desc: 'One of the world’s most famous clubs. Home to Sven Väth’s Cocoon and many iconic residencies.',
      url: 'https://www.amnesia.es',
      tag: 'Club',
      events: 'https://ra.co/clubs/es/ibiza/amnesia',
    },
    {
      name: 'Hï Ibiza',
      city: 'Ibiza',
      desc: 'A modern mega-club known for its groundbreaking sound system and spectacular light show.',
      url: 'https://www.hiibiza.com',
      tag: 'Club',
      events: 'https://ra.co/clubs/es/ibiza/hi-ibiza',
    },
    {
      name: 'Ushuaïa',
      city: 'Ibiza',
      desc: 'Open-air stage with sea views. The summer’s best daytime and sunset events on the island.',
      url: 'https://www.ushuaiaibiza.com',
      tag: 'Open Air',
      events: 'https://ra.co/clubs/es/ibiza/ushuaia-ibiza-beach-hotel',
    },
  ];

  const MUSIC_LINKS = [
    { name: 'Mixcloud — Techno', desc: 'Long DJ mixes and radio shows', url: 'https://www.mixcloud.com/tag/techno/', color: '#5000ff', icon: '🌀' },
    { name: 'Beatport Techno', desc: 'Buy and download professional techno', url: 'https://www.beatport.com/genre/techno/6', color: '#01ff95', icon: '🎵' },
    { name: 'Bandcamp — Techno', desc: 'Support independent artists directly', url: 'https://bandcamp.com/tag/techno', color: '#1da0c3', icon: '🎸' },
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
            ${a.sc ? `<button onclick="openMedia('${escHtml(a.sc)}','${escHtml(a.name)} on SoundCloud')" class="ug-link-btn ug-link-sc">SoundCloud</button>` : ''}
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
          <a href="${escHtml(v.url)}" target="_blank" rel="noopener" class="ug-link-btn ug-link-web">Website ${Icon('arrow-right')}</a>
          <a href="${escHtml(v.events)}" target="_blank" rel="noopener" class="ug-link-btn ug-link-ra">Events</a>
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
          <button class="ug-back-btn" onclick="Router.go('/discover')">${Icon('arrow-left')} Back to Discover</button>
          <div class="ug-hero-badge">${Icon('zap')} Underground</div>
          <h1 class="ug-hero-title">Techno Underground</h1>
          <p class="ug-hero-sub">The hypnotic grooves, the darkest beats — from England’s factory lofts to Ibiza’s night sky.</p>
        </div>

        <div class="ug-content">

          <!-- FRESH FROM THE WEB (AI-rotasjon, se js/aifresh.js) -->
          <section class="ug-section">
            <div id="ug-fresh"></div>
            <div id="ug-fresh-events"></div>
          </section>

          <!-- ENGLAND ARTISTS -->
          <section class="ug-section">
            <div class="ug-section-header">
              <div class="ug-section-flag">🇬🇧</div>
              <div>
                <h2 class="ug-section-title">England — Artists</h2>
                <p class="ug-section-sub">From Birmingham’s factory sound to London’s underground clubs</p>
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
                <h2 class="ug-section-title">Ibiza — Artists</h2>
                <p class="ug-section-sub">The island’s legendary DJs and residents</p>
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
                <h2 class="ug-section-title">Events — England</h2>
                <p class="ug-section-sub">Find tickets and events directly from the clubs and via Resident Advisor</p>
              </div>
            </div>
            <div class="ug-venue-grid">
              ${VENUES_UK.map(v => venueCard(v)).join('')}
            </div>
            <a class="ug-ra-banner" href="https://ra.co/events/uk" target="_blank" rel="noopener">
              ${Icon('search')} See all UK events on <strong>Resident Advisor</strong> ${Icon('arrow-right')}
            </a>
          </section>

          <!-- IBIZA EVENTS -->
          <section class="ug-section">
            <div class="ug-section-header">
              <div class="ug-section-flag">${Icon('sun')}</div>
              <div>
                <h2 class="ug-section-title">Events — Ibiza</h2>
                <p class="ug-section-sub">The season’s best venues and parties on the island</p>
              </div>
            </div>
            <div class="ug-venue-grid">
              ${VENUES_IBIZA.map(v => venueCard(v)).join('')}
            </div>
            <a class="ug-ra-banner" href="https://ra.co/events/es/ibiza" target="_blank" rel="noopener">
              ${Icon('search')} See all Ibiza events on <strong>Resident Advisor</strong> ${Icon('arrow-right')}
            </a>
          </section>

          <!-- MUSIC LINKS -->
          <section class="ug-section">
            <div class="ug-section-header">
              <div class="ug-section-flag">${Icon('headphones')}</div>
              <div>
                <h2 class="ug-section-title">Music — Listen now</h2>
                <p class="ug-section-sub">Stream and download from the best channels on the web</p>
              </div>
            </div>
            <div class="ug-music-grid">
              ${MUSIC_LINKS.map(m => musicCard(m)).join('')}
            </div>
          </section>

        </div>
      </div>
    `;

    // Ferske techno-undergrunn-nyheter + arrangementer i hele verden, rotert hver
    // halvtime (samme AI-kilde som magasinet og verden-siden — se js/aifresh.js).
    if (typeof AIFresh !== 'undefined') {
      AIFresh.reset();
      AIFresh.mount({ id: 'ug-fresh', genre: 'techno-underground',
        title: 'Fresh from the underground', emoji: '🏭', limit: 4 });
      AIFresh.mount({ id: 'ug-fresh-events', genre: 'festivals',
        title: 'Events & festivals worldwide', emoji: '🎪', limit: 3 });
    }
  }

  return { render };
})();
