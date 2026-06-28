// All Over The World — global psytrance & psybient directory
// Festivals · record labels · pioneering artists · web radios from around the planet.
// Each entry links to homepage / SoundCloud / Bandcamp, and radios can play in-app.
const World = (() => {

  function esc(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ── Major global festivals ────────────────────────────────────────────
  const FESTIVALS = [
    {
      emoji: '🌌', name: 'Boom Festival', loc: 'Idanha-a-Nova, Portugal 🇵🇹',
      dates: 'Biennial · Jul',
      grad: 'linear-gradient(135deg,#0d0829,#1a0b3d,#2a0d5e)',
      theme: 'Verdas mest kjende transformasjonsfestival — Dance Temple, visionær kunst & djup campingkultur.',
      tags: ['Psytrance', 'Downtempo', 'Ambient', 'Visionary Art', 'Biennial'],
      links: [
        { label: 'boomfestival.org', kind: 'web', url: 'https://www.boomfestival.org/' },
        { label: 'SoundCloud', kind: 'soundcloud', url: 'https://soundcloud.com/boomfestival' },
      ],
    },
    {
      emoji: '🔥', name: 'OZORA Festival', loc: 'Dádpuszta, Hungary 🇭🇺',
      dates: '27 Jul – 4 Aug 2026',
      grad: 'linear-gradient(135deg,#1a0a05,#3a1a0a,#5e2a0d)',
      theme: 'Ein av Europas største — kulturelt mangfaldig kunst- og trance-samling.',
      tags: ['Psytrance', 'Progressive', 'Chill Dome', 'Art'],
      links: [
        { label: 'ozorafestival.eu', kind: 'web', url: 'https://ozorafestival.eu/' },
        { label: 'SoundCloud', kind: 'soundcloud', url: 'https://soundcloud.com/ozora-festival' },
      ],
    },
    {
      emoji: '🌲', name: 'Mo:Dem Festival', loc: 'Primišlje, Croatia 🇭🇷',
      dates: '3 – 9 Aug 2026',
      grad: 'linear-gradient(135deg,#04130a,#0a2e16,#11402a)',
      theme: 'Momento Demento — kjend for underground forest, hitech og darkpsy av høg kvalitet.',
      tags: ['Forest', 'Darkpsy', 'Hi-Tech', 'Experimental'],
      links: [
        { label: 'modemfestival.com', kind: 'web', url: 'https://modemfestival.com/' },
        { label: 'Bandcamp', kind: 'bandcamp', url: 'https://modemfestival.bandcamp.com/' },
      ],
    },
    {
      emoji: '🌞', name: 'Universo Paralello', loc: 'Pratigi, Bahia, Brazil 🇧🇷',
      dates: 'Biennial · Nyttår',
      grad: 'linear-gradient(135deg,#05131f,#0a2a44,#0f3a5c)',
      theme: 'Ein av verdas største nyttårsfestivalar — 9 dagar psykedelisk trance på stranda.',
      tags: ['Psytrance', 'New Year', 'Beach', 'Biennial'],
      links: [
        { label: 'universoparalello.org', kind: 'web', url: 'https://universoparalello.org/' },
      ],
    },
    {
      emoji: '🏔️', name: 'Burning Mountain', loc: 'Zernez, Switzerland 🇨🇭',
      dates: '25 – 28 Jun 2026',
      grad: 'linear-gradient(135deg,#0a1020,#13243f,#1c3a5c)',
      theme: 'Immersiv alpin progressive psytrance på 1500 moh i Engadin-dalen.',
      tags: ['Progressive', 'Psytrance', 'Alpine', 'Open Air'],
      links: [
        { label: 'burning-mountain.ch', kind: 'web', url: 'https://www.burning-mountain.ch/' },
      ],
    },
    {
      emoji: '🌏', name: 'Earth Frequency Festival', loc: 'Woodford, QLD, Australia 🇦🇺',
      dates: '23 – 26 Oct 2026',
      grad: 'linear-gradient(135deg,#0a1a0d,#143018,#1c4a26)',
      theme: 'Stor australsk samling — psytrance, world music, kunst og miljø.',
      tags: ['Psytrance', 'World Music', 'Arts', 'Community'],
      links: [
        { label: 'earthfrequency.com.au', kind: 'web', url: 'https://www.earthfrequency.com.au/' },
      ],
    },
    {
      emoji: '🕉️', name: 'ZNA Gathering', loc: 'Montargil, Portugal 🇵🇹',
      dates: '15 – 22 Jul 2026',
      grad: 'linear-gradient(135deg,#1a1405,#3a2e0a,#5e4a0d)',
      theme: 'Vigd til «retro» og klassisk Goa Trance — eit retro-futuristisk møtepunkt.',
      tags: ['Goa Trance', 'Retro', 'Old-School', 'Biennial'],
      links: [
        { label: 'znagathering.com', kind: 'web', url: 'https://znagathering.com/' },
      ],
    },
  ];

  // ── Record labels ─────────────────────────────────────────────────────
  const LABELS = [
    {
      emoji: '🛸', name: 'Nano Records', loc: 'UK 🇬🇧 · Full-on / Progressive',
      grad: 'linear-gradient(135deg,#0d0829,#1f0b4d)',
      links: [
        { label: 'nanomusic.net', kind: 'web', url: 'https://nanomusic.net/' },
        { label: 'Bandcamp', kind: 'bandcamp', url: 'https://nanorecords.bandcamp.com/' },
      ],
    },
    {
      emoji: '🌿', name: 'Iboga Records', loc: 'Denmark 🇩🇰 · Progressive / Psy',
      grad: 'linear-gradient(135deg,#04130a,#0a2e16)',
      links: [
        { label: 'ibogarecords.com', kind: 'web', url: 'https://www.ibogarecords.com/' },
        { label: 'Bandcamp', kind: 'bandcamp', url: 'https://iboga-beatspace.bandcamp.com/' },
      ],
    },
    {
      emoji: '☀️', name: 'Suntrip Records', loc: 'Belgium 🇧🇪 · Goa-revival',
      grad: 'linear-gradient(135deg,#1a1405,#3a2e0a)',
      links: [
        { label: 'Bandcamp', kind: 'bandcamp', url: 'https://suntriprecords.bandcamp.com/' },
      ],
    },
    {
      emoji: '🌑', name: 'Zenon Records', loc: 'Australia 🇦🇺 · Dark Progressive',
      grad: 'linear-gradient(135deg,#0a0a14,#1a1030)',
      links: [
        { label: 'zenonrecords.com', kind: 'web', url: 'https://www.zenonrecords.com/' },
        { label: 'Bandcamp', kind: 'bandcamp', url: 'https://zenonrecords.bandcamp.com/' },
      ],
    },
    {
      emoji: '🌲', name: 'Parvati Records', loc: 'Denmark 🇩🇰 · Forest / Full-on',
      grad: 'linear-gradient(135deg,#04130d,#0a2e22)',
      links: [
        { label: 'parvati-records.com', kind: 'web', url: 'https://parvati-records.com/' },
        { label: 'Bandcamp', kind: 'bandcamp', url: 'https://beatspace-parvati.bandcamp.com/' },
      ],
    },
    {
      emoji: '🍄', name: 'Sangoma Records', loc: 'Forest / Darkpsy',
      grad: 'linear-gradient(135deg,#130a04,#2e160a)',
      links: [
        { label: 'sangomarecords.com', kind: 'web', url: 'https://www.sangomarecords.com/' },
        { label: 'Bandcamp', kind: 'bandcamp', url: 'https://sangomarecs.bandcamp.com/' },
      ],
    },
    {
      emoji: '🌊', name: 'Ultimae Records', loc: 'France 🇫🇷 · Psybient / Ambient',
      grad: 'linear-gradient(135deg,#05131f,#0a2a44)',
      links: [
        { label: 'ultimae.com', kind: 'web', url: 'https://ultimae.com/' },
        { label: 'Bandcamp', kind: 'bandcamp', url: 'https://ultimae.bandcamp.com/' },
      ],
    },
    {
      emoji: '🍃', name: 'Cosmicleaf Records', loc: 'Greece 🇬🇷 · Psychill / Downtempo',
      grad: 'linear-gradient(135deg,#0a140d,#163024)',
      links: [
        { label: 'cosmicleaf.com', kind: 'web', url: 'https://www.cosmicleaf.com/' },
        { label: 'Bandcamp', kind: 'bandcamp', url: 'https://cosmicleaf.bandcamp.com/' },
      ],
    },
    {
      emoji: '⚡', name: 'Dacru Records', loc: 'Belgium 🇧🇪 · Full-on / Psytrance',
      grad: 'linear-gradient(135deg,#0e0d1f,#1b1040)',
      links: [
        { label: 'dacru.be', kind: 'web', url: 'https://www.dacru.be/' },
        { label: 'Bandcamp', kind: 'bandcamp', url: 'https://dacrurecords.bandcamp.com/' },
      ],
    },
  ];

  // ── Pioneering artists ────────────────────────────────────────────────
  const ARTISTS = [
    {
      emoji: '🌠', name: 'Astral Projection', loc: 'Israel 🇮🇱 · Goa / Psytrance (1991)',
      grad: 'linear-gradient(135deg,#0a1628,#0e2244)',
      links: [{ label: 'astral-projection.com', kind: 'web', url: 'https://www.astral-projection.com/' }],
    },
    {
      emoji: '✨', name: 'Shpongle', loc: 'UK 🇬🇧 · Psybient (Posford + Raja Ram)',
      grad: 'linear-gradient(135deg,#0d0829,#2a0d5e)',
      links: [{ label: 'shponglemusic.com', kind: 'web', url: 'https://www.shponglemusic.com/' }],
    },
    {
      emoji: '🍄', name: 'Infected Mushroom', loc: 'Israel 🇮🇱 · Psytrance / Electronica',
      grad: 'linear-gradient(135deg,#130a29,#2e0b4d)',
      links: [
        { label: 'infected-mushroom.com', kind: 'web', url: 'https://www.infected-mushroom.com/' },
        { label: 'SoundCloud', kind: 'soundcloud', url: 'https://soundcloud.com/infectedmushroom' },
      ],
    },
    {
      emoji: '🌀', name: 'Astrix', loc: 'Israel 🇮🇱 · Full-on Psytrance',
      grad: 'linear-gradient(135deg,#05131f,#0f3a5c)',
      links: [{ label: 'Spotify', kind: 'spotify', url: 'https://open.spotify.com/artist/3dUltShd2gJQc98Kc7Syit' }],
    },
    {
      emoji: '🚀', name: 'Vini Vici', loc: 'Israel 🇮🇱 · Psytrance',
      grad: 'linear-gradient(135deg,#1a0a05,#5e2a0d)',
      links: [{ label: 'Spotify', kind: 'spotify', url: 'https://open.spotify.com/artist/29zsVzEH33dD5QqxeL8dvy' }],
    },
    {
      emoji: '🧬', name: 'Carbon Based Lifeforms', loc: 'Sweden 🇸🇪 · Psybient / Ambient',
      grad: 'linear-gradient(135deg,#04130d,#0a2e22)',
      links: [
        { label: 'carbonbasedlifeforms.net', kind: 'web', url: 'https://www.carbonbasedlifeforms.net/' },
        { label: 'Bandcamp', kind: 'bandcamp', url: 'https://carbonbasedlifeforms.bandcamp.com/' },
      ],
    },
    {
      emoji: '🌅', name: 'Solar Fields', loc: 'Sweden 🇸🇪 · Psybient (Ultimae)',
      grad: 'linear-gradient(135deg,#1a1405,#3a2e0a)',
      links: [{ label: 'Bandcamp', kind: 'bandcamp', url: 'https://solarfields.bandcamp.com/' }],
    },
    {
      emoji: '🔊', name: 'Ott', loc: 'UK 🇬🇧 · Dub / Psybient',
      grad: 'linear-gradient(135deg,#0a140d,#163024)',
      links: [{ label: 'Bandcamp', kind: 'bandcamp', url: 'https://ottsonic.bandcamp.com/' }],
    },
  ];

  // ── Web radios from around the world ──────────────────────────────────
  // `play` = id of a station in Radio.js → plays directly in the SoundCore player.
  const RADIOS = [
    {
      emoji: '🍄', name: 'DMT-FM', loc: 'Tenerife 🇪🇸 · Psytrance 24/7',
      grad: 'linear-gradient(135deg,#04130a,#0a2e16)',
      links: [
        { label: 'dmt-fm.com', kind: 'web', url: 'https://dmt-fm.com/' },
        { play: 'dmtfm' },
      ],
    },
    {
      emoji: '🧿', name: 'Psyndora', loc: 'Psytrance & Ambient',
      grad: 'linear-gradient(135deg,#05131f,#0a2a44)',
      links: [
        { label: 'psyndora.com', kind: 'web', url: 'https://www.psyndora.com/' },
        { play: 'psyndora' },
      ],
    },
    {
      emoji: '📻', name: 'PsyRadio.fm', loc: 'Germany 🇩🇪 · 4 kanalar sidan 2004',
      grad: 'linear-gradient(135deg,#0d0829,#1f0b4d)',
      links: [{ label: 'psyradio.fm', kind: 'web', url: 'http://psyradio.fm/' }],
    },
    {
      emoji: '🌈', name: 'Psychedelic.FM', loc: 'Psytrance streaming 24/7',
      grad: 'linear-gradient(135deg,#1a0a2e,#16213e)',
      links: [{ label: 'psychedelic.fm', kind: 'web', url: 'https://www.psychedelic.fm/' }],
    },
    {
      emoji: '🕉️', name: 'Suburbs of Goa', loc: 'Indian electronica & psytrance',
      grad: 'linear-gradient(135deg,#1a1405,#3a2e0a)',
      links: [{ play: 'suburbsofgoa' }],
    },
    {
      emoji: '🌀', name: 'The Trip', loc: 'Psychedelic electronica & trip-hop',
      grad: 'linear-gradient(135deg,#0d0829,#2a0d5e)',
      links: [{ play: 'thetrip' }],
    },
  ];

  function linkRow(links) {
    return `<div class="world-links">${links.map(l => {
      if (l.play) {
        return `<button class="world-link world-link--play" onclick="World.tuneIn('${l.play}')">${Icon('play')} Spill her</button>`;
      }
      const ico = l.kind === 'soundcloud' ? Icon('disc')
                : l.kind === 'bandcamp'   ? Icon('music')
                : l.kind === 'spotify'    ? Icon('music')
                : Icon('globe');
      return `<a class="world-link" href="${l.url}" target="_blank" rel="noopener noreferrer">${ico} ${esc(l.label)} ${Icon('arrow-up-right')}</a>`;
    }).join('')}</div>`;
  }

  function card(c) {
    return `
      <div class="shows-festival-card world-card">
        <div class="shows-festival-banner" style="background:${c.grad}">
          <div class="shows-festival-emoji">${iconForEmoji(c.emoji)}</div>
          ${c.dates ? `<div class="shows-festival-dates">${esc(c.dates)}</div>` : ''}
        </div>
        <div class="shows-festival-body">
          <div class="shows-festival-name">${esc(c.name)}</div>
          <div class="shows-festival-loc">${Icon('map-pin')} ${esc(c.loc)}</div>
          ${c.theme ? `<div class="shows-festival-theme">${esc(c.theme)}</div>` : ''}
          ${c.tags ? `<div class="shows-festival-tags">${c.tags.map(t => `<span class="shows-festival-tag">${esc(t)}</span>`).join('')}</div>` : ''}
          ${linkRow(c.links)}
        </div>
      </div>`;
  }

  function grid(items) {
    return `<div class="world-grid">${items.map(card).join('')}</div>`;
  }

  function render() {
    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="shows-page world-page">

        <!-- HERO -->
        <div class="shows-hero">
          <div class="shows-hero-glow"></div>
          <div class="shows-hero-inner">
            <div class="shows-hero-badge">${Icon('globe')} The Global Scene</div>
            <h1 class="shows-hero-title">All Over The World</h1>
            <p class="shows-hero-sub">Det globale psytrance- og psybient-miljøet strekkjer seg over heile kloden — med store transformasjonsfestivalar, innflytelsesrike plateselskap og banebrytande artistar. Ein scene djupt rotfest i visuell kunst, spiritualitet og fleirdagars samlingar under open himmel.</p>
          </div>
          <div class="shows-hero-live">
            <div class="world-hero-stats">
              <div class="world-stat"><span>${FESTIVALS.length}</span> festivalar</div>
              <div class="world-stat"><span>${LABELS.length}</span> plateselskap</div>
              <div class="world-stat"><span>${ARTISTS.length}</span> artistar</div>
              <div class="world-stat"><span>${RADIOS.length}</span> radioar</div>
            </div>
            <a class="shows-live-btn" href="#/radio">${Icon('radio')} Opne radiospelaren</a>
          </div>
        </div>

        <!-- FESTIVALS -->
        <div class="section" style="max-width:1100px">
          <div class="section-header">
            <div class="section-title">${Icon('star')} Store globale festivalar</div>
            <span class="text-muted text-sm">Immersive scener · visionær kunst · campingkultur</span>
          </div>
          ${grid(FESTIVALS)}
        </div>

        <!-- LABELS -->
        <div class="section" style="max-width:1100px">
          <div class="section-header">
            <div class="section-title">${Icon('disc')} Innflytelsesrike plateselskap</div>
            <span class="text-muted text-sm">Frå Goa-revival til forest, psybient & full-on</span>
          </div>
          ${grid(LABELS)}
        </div>

        <!-- ARTISTS -->
        <div class="section" style="max-width:1100px">
          <div class="section-header">
            <div class="section-title">${Icon('user')} Banebrytande artistar</div>
            <span class="text-muted text-sm">Pionerane bak lyden</span>
          </div>
          ${grid(ARTISTS)}
        </div>

        <!-- RADIOS -->
        <div class="section" style="max-width:1100px">
          <div class="section-header">
            <div class="section-title">${Icon('radio')} Web-radioar verda rundt</div>
            <span class="text-muted text-sm">Klikk ${Icon('play')} «Spill her» for å lytte direkte i SoundCore</span>
          </div>
          ${grid(RADIOS)}
        </div>

        <!-- OUTRO -->
        <div class="section" style="max-width:900px">
          <div class="world-outro">
            <div class="world-outro-icon">${Icon('sparkles')}</div>
            <p>Sakna du ein festival, eit selskap eller ein radio? Send tips til
              <a href="mailto:producerenur@gmail.com">producerenur@gmail.com</a> — så legg vi det inn.</p>
          </div>
        </div>

      </div>`;
  }

  // Navigate to the radio page, then start the chosen station.
  function tuneIn(stationId) {
    Router.go('/radio');
    setTimeout(() => {
      if (typeof Radio !== 'undefined') Radio.playStation(stationId);
    }, 300);
  }

  return { render, tuneIn };
})();
