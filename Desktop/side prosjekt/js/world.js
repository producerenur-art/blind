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
      dates: '18 – 25 Jul 2027 · 30 years', from: '2027-07-18', to: '2027-07-25',
      grad: 'linear-gradient(135deg,#0d0829,#1a0b3d,#2a0d5e)',
      theme: 'The world’s most famous transformational festival — Dance Temple, Chill Out Gardens, visionary art & deep camping culture. The 2027 edition celebrates 30 years of Boom, with ~70 % newly booked projects.',
      tags: ['Psytrance', 'Downtempo', 'Ambient', 'Visionary Art', 'Biennial'],
      links: [
        { label: 'boomfestival.org', kind: 'web', url: 'https://www.boomfestival.org/' },
        { label: 'SoundCloud', kind: 'soundcloud', url: 'https://soundcloud.com/boomfestival' },
      ],
    },
    {
      emoji: '🔥', name: 'OZORA Festival', loc: 'Dádpuszta, Hungary 🇭🇺',
      dates: '23 Jul – 3 Aug 2027', from: '2027-07-23', to: '2027-08-03', // oppdatert 07.09.2026 (ticket.ozorafestival.eu) — 2026-datoen var passert
      grad: 'linear-gradient(135deg,#1a0a05,#3a1a0a,#5e2a0d)',
      theme: 'One of Europe’s largest — a culturally diverse art and trance gathering.',
      tags: ['Psytrance', 'Progressive', 'Chill Dome', 'Art'],
      links: [
        { label: 'ozorafestival.eu', kind: 'web', url: 'https://ozorafestival.eu/' },
        { label: 'SoundCloud', kind: 'soundcloud', url: 'https://soundcloud.com/ozora-festival' },
      ],
    },
    {
      emoji: '🌲', name: 'Mo:Dem Festival', loc: 'Primišlje, Croatia 🇭🇷',
      dates: 'Expected early Aug 2027 (not yet official)', // oppdatert 07.09.2026 — 2026-datoen var passert
      grad: 'linear-gradient(135deg,#04130a,#0a2e16,#11402a)',
      theme: 'Momento Demento — known for high-quality underground forest, hi-tech and darkpsy.',
      tags: ['Forest', 'Darkpsy', 'Hi-Tech', 'Experimental'],
      links: [
        { label: 'modemfestival.com', kind: 'web', url: 'https://modemfestival.com/' },
        { label: 'Bandcamp', kind: 'bandcamp', url: 'https://modemfestival.bandcamp.com/' },
      ],
    },
    {
      emoji: '🌞', name: 'Universo Paralello', loc: 'Pratigi, Bahia, Brazil 🇧🇷',
      dates: 'Biennial · New Year',
      grad: 'linear-gradient(135deg,#05131f,#0a2a44,#0f3a5c)',
      theme: 'One of the world’s largest New Year festivals — 9 days of psychedelic trance on the beach.',
      tags: ['Psytrance', 'New Year', 'Beach', 'Biennial'],
      links: [
        { label: 'universoparalello.org', kind: 'web', url: 'https://universoparalello.org/' },
      ],
    },
    {
      emoji: '🏔️', name: 'Burning Mountain', loc: 'Zernez, Switzerland 🇨🇭',
      dates: '24 – 27 Jun 2027', from: '2027-06-24', to: '2027-06-27', // oppdatert 07.09.2026 (burning-mountain.ch) — 2026-datoen var passert
      grad: 'linear-gradient(135deg,#0a1020,#13243f,#1c3a5c)',
      theme: 'Immersive alpine progressive psytrance at 1500 m in the Engadin valley.',
      tags: ['Progressive', 'Psytrance', 'Alpine', 'Open Air'],
      links: [
        { label: 'burning-mountain.ch', kind: 'web', url: 'https://www.burning-mountain.ch/' },
      ],
    },
    {
      emoji: '🌏', name: 'Earth Frequency Festival', loc: 'Woodford, QLD, Australia 🇦🇺',
      dates: '23 – 26 Oct 2026', from: '2026-10-23', to: '2026-10-26',
      grad: 'linear-gradient(135deg,#0a1a0d,#143018,#1c4a26)',
      theme: 'A large Australian gathering — psytrance, world music, art and the environment.',
      tags: ['Psytrance', 'World Music', 'Arts', 'Community'],
      links: [
        { label: 'earthfrequency.com.au', kind: 'web', url: 'https://www.earthfrequency.com.au/' },
      ],
    },
    {
      emoji: '🕉️', name: 'ZNA Gathering', loc: 'Montargil, Portugal 🇵🇹',
      dates: 'Expected Jul 2027 (biennial, not yet official)', // oppdatert 07.09.2026 — 2026-datoen var passert
      grad: 'linear-gradient(135deg,#1a1405,#3a2e0a,#5e4a0d)',
      theme: 'Dedicated to «retro» and classic Goa Trance — a retro-futuristic meeting point.',
      tags: ['Goa Trance', 'Retro', 'Old-School', 'Biennial'],
      links: [
        { label: 'znagathering.com', kind: 'web', url: 'https://znagathering.com/' },
      ],
    },
    {
      emoji: '🏖️', name: 'Free Earth Festival', loc: 'Asprovalta Beach, Greece 🇬🇷',
      dates: 'Expected Aug 2027 (not yet official)', // oppdatert 07.09.2026 — 2026-datoen var passert; kjelder spriker (aug vs. jun), held det generelt til datoen er stadfesta
      grad: 'linear-gradient(135deg,#03151f,#07304a,#0b4a68)',
      theme: 'Europe’s only psytrance beach festival — three stages: Enlightenment (prog → full-on), the Parvati forest stage and Oxygen for psychedelic downtempo, dark prog & psytechno.',
      tags: ['Beach', 'Psytrance', 'Downtempo', 'Psytechno', 'Parvati Stage'],
      links: [
        { label: 'freeearth-festival.com', kind: 'web', url: 'https://freeearth-festival.com/' },
      ],
    },
    {
      emoji: '🪶', name: 'Indian Spirit', loc: 'Eldena, Germany 🇩🇪',
      dates: '25 – 30 Aug 2027', from: '2027-08-25', to: '2027-08-30', // oppdatert 07.09.2026 (Music Festival Wizard) — 2026-datoen var passert
      grad: 'linear-gradient(135deg,#1a0f05,#3d240b,#5c3a10)',
      theme: 'Germany’s biggest psytrance festival — Sun, Moon and Mushroom stages plus a Fire Tent and its own Chill Out stage.',
      tags: ['Psytrance', 'Chill Out Stage', 'Open Air', 'Germany'],
      links: [
        { label: 'indian-spirit.de', kind: 'web', url: 'https://www.indian-spirit.de/' },
      ],
    },
    {
      emoji: '🌻', name: 'Hadra Trance Festival', loc: 'Vieure, Allier, France 🇫🇷',
      dates: 'Expected late Aug 2027 (not yet official)', // oppdatert 07.09.2026 — 2026-datoen var passert
      grad: 'linear-gradient(135deg,#0d1405,#1f300a,#334d10)',
      theme: 'France’s flagship gathering — 4 stages, 170 artists and 72 hours of psytrance, chill, techno and drum & bass. 2026 theme: «Solar Punk Chronicles: The Seed».',
      tags: ['Psytrance', 'Chill', 'Techno', 'D&B', 'France'],
      links: [
        { label: 'hadratrancefestival.net', kind: 'web', url: 'https://hadratrancefestival.net/' },
        { label: 'Hadra Records', kind: 'bandcamp', url: 'https://hadrarecords.bandcamp.com/' },
      ],
    },
    {
      emoji: '🛩️', name: 'VooV Experience', loc: 'Putlitz, Germany 🇩🇪',
      dates: '16 – 19 Jul 2027', from: '2027-07-16', to: '2027-07-19',
      grad: 'linear-gradient(135deg,#050d1f,#0b2044,#123566)',
      theme: 'A German institution since 1992, held on an old airfield between Hamburg and Berlin — main floor, chill floor and a strong old-school Goa heritage.',
      tags: ['Goa Trance', 'Psytrance', 'Chill Floor', 'Since 1992'],
      links: [
        { label: 'voov-festival.de', kind: 'web', url: 'https://www.voov-festival.de/' }, // voov.de høyrer no til eit ubeslekta prosjekt, retta 07.09.2026
      ],
    },
    {
      emoji: '☀️', name: 'S.U.N. Festival', loc: 'Csobánkapuszta, Hungary 🇭🇺',
      dates: 'Annually · Jul',
      grad: 'linear-gradient(135deg,#1f1405,#402a0a,#634010)',
      theme: 'Solar United Natives — a non-profit tribal gathering in the Cserhát valley run by the Mély Mosoly foundation: psytrance, chill temple, permaculture and hundreds of workshops.',
      tags: ['Psytrance', 'Chill Temple', 'Community', 'Workshops', 'Non-profit'],
      links: [
        { label: 'solarunitednatives.org', kind: 'web', url: 'https://solarunitednatives.org/' },
      ],
    },
    {
      emoji: '🧘', name: 'Samsara Festival', loc: 'Hungary 🇭🇺',
      dates: 'Winter editions · Jan & Feb 2027',
      grad: 'linear-gradient(135deg,#0a1424,#152a44,#1f3f63)',
      theme: 'A psybient festival, land-art space and yoga village — around 150 yoga workshops and 140+ artists across chill, downtempo, slow trance and world music. One of the scene’s few truly chill-first gatherings.',
      tags: ['Psybient', 'Psychill', 'Downtempo', 'Yoga', 'World Music'],
      links: [
        { label: 'samsarafestival.eu', kind: 'web', url: 'https://samsarafestival.eu/' },
      ],
    },
    {
      emoji: '⛰️', name: 'Shankra Festival', loc: 'Lostallo, Switzerland 🇨🇭',
      dates: 'Jun 2027',
      grad: 'linear-gradient(135deg,#04140f,#0a2e24,#10453a)',
      theme: 'A mystical alpine gathering in a Swiss river valley — «Your Life Is Your Message». Main floor psytrance with a deep chill area under the mountains.',
      tags: ['Psytrance', 'Alpine', 'Transformational', 'Chill Area'],
      links: [
        { label: 'shankrafestival.org', kind: 'web', url: 'https://shankrafestival.org/' },
        { label: 'SoundCloud', kind: 'soundcloud', url: 'https://soundcloud.com/shankra-festival' },
      ],
    },
    {
      emoji: '🏝️', name: 'Tribal Gathering', loc: 'Caribbean coast, Panama 🇵🇦',
      dates: '5 – 22 Mar 2027', from: '2027-03-05', to: '2027-03-22',
      grad: 'linear-gradient(135deg,#03161a,#073038,#0c4c52)',
      theme: '18 days on a Caribbean beach with indigenous tribes from around the world — week one house, techno, D&B and world beats, week two full psytrance.',
      tags: ['Psytrance', 'World Beats', 'Beach', '18 Days', 'Indigenous Cultures'],
      links: [
        { label: 'tribalgathering.com', kind: 'web', url: 'https://www.tribalgathering.com/' },
      ],
    },
    {
      emoji: '🦅', name: 'Origin Festival', loc: 'Helderstroom, South Africa 🇿🇦',
      dates: '29 – 31 Jan 2027', from: '2027-01-29', to: '2027-01-31',
      grad: 'linear-gradient(135deg,#1a0714,#330d28,#4d1440)',
      theme: 'A deliberately small Cape gathering 125 km from Cape Town — the Origin floor curated by Nano Records and Riverside Beats by TenFold.',
      tags: ['Psytrance', 'Nano Records', 'Riverside', 'Small Capacity'],
      links: [
        { label: 'originfestival.com', kind: 'web', url: 'https://originfestival.com/' },
      ],
    },
    {
      emoji: '👽', name: 'Alien Safari', loc: 'Cape Town, South Africa 🇿🇦',
      dates: 'Season parties · Nov – Apr',
      grad: 'linear-gradient(135deg,#04140a,#0a2e1a,#104a2c)',
      theme: 'South Africa’s longest-running psytrance brand — open-air parties in mountain and coastal locations around the Cape through the southern summer.',
      tags: ['Psytrance', 'Open Air', 'South Africa', 'Long-running'],
      links: [
        { label: 'Facebook', kind: 'web', url: 'https://www.facebook.com/aliensafari/' },
      ],
    },
    {
      emoji: '🌈', name: 'Rainbow Spirit Festival', loc: 'Victoria, Australia 🇦🇺',
      dates: 'Annually · Australian summer',
      grad: 'linear-gradient(135deg,#140a24,#2a1245,#3f1c66)',
      theme: 'The continuation of the legendary Rainbow Serpent — «smaller and more connected», with music, art and village culture on Taungurung country.',
      tags: ['Psytrance', 'Art', 'Village', 'Australia'],
      links: [
        { label: 'rainbowspirit.net', kind: 'web', url: 'https://rainbowspirit.net/' },
      ],
    },
    {
      emoji: '🐍', name: 'Ometeotl Festival', loc: 'Mexico 🇲🇽',
      dates: 'Annually · Mexico',
      grad: 'linear-gradient(135deg,#1f0805,#40140a,#63220f)',
      theme: 'A transformational festival binding spirit, earth, art and music — 60+ live acts alongside workshops, ceremony and bio-built, ecological infrastructure.',
      tags: ['Psytrance', 'Transformational', 'Ceremony', 'Live Acts'],
      links: [
        { label: 'ometeotl.mx', kind: 'web', url: 'https://ometeotl.mx/' },
      ],
    },
    {
      // Ingen dark ambient / drone-festival stod i lista fra før — denne dekker
      // nettopp det hullet. Ekte, verifisert 07.09.2026 (darkmofo.net.au).
      emoji: '💀', name: 'Dark Mofo', loc: 'Hobart, Tasmania 🇦🇺',
      dates: 'Expected Jun 2027 (winter solstice, not yet official)', // oppdatert 07.09.2026 — 2026-datoen var passert
      grad: 'linear-gradient(135deg,#0a0a0a,#1a0505,#2e0808)',
      theme: 'Southern-winter-solstice festival of dark ambient, drone, extreme metal and large-scale light installations — Night Mass, Winter Feast, Ogoh-Ogoh burning and the Nude Solstice Swim at dawn.',
      tags: ['Dark Ambient', 'Drone', 'Experimental', 'Solstice'],
      links: [
        { label: 'darkmofo.net.au', kind: 'web', url: 'https://darkmofo.net.au/' },
      ],
    },
  ];

  // Gjer FESTIVALS lesbar frå Node (api/send-email.js sin ukentlige e-post) uten
  // å duplisere festivaldatoane. `module` finst ikke i nettleseren, så denne
  // linja er et no-op der — kun require('../js/world.js') fra serveren treffer.
  if (typeof module !== 'undefined' && module.exports) module.exports = { FESTIVALS };

  // ── Klubbar & scener ──────────────────────────────────────────────────
  // `events` = kommande planar (vert vist som «Planar framover» med RA-lenkjer).
  const CLUBS = [
    {
      // events-lista under var to konkrete datoar i juli 2026 — begge passert
      // (i dag er 07.09.2026). Fjerna i staden for å vise gamle "kommande"-
      // arrangement som feilinfo; ingen bekrefta nye datoar funne å erstatte med.
      emoji: '🏛️', name: 'IT Athens', loc: 'Exarcheia, Athens, Greece 🇬🇷',
      grad: 'linear-gradient(135deg,#0a0a14,#1a1030,#2a0d3e)',
      theme: '2 rooms at Solomou 30 & Mpotasi 9, in the heart of Exarcheia — one of Athens’ most active underground clubs, with 58 events in 2026. Residents: Plagger, MOSHBEAT, TYPEO, Human Cruelty & Brazi.',
      tags: ['Underground', '2 Rooms', 'Athens', 'Live'],
      links: [
        { label: 'RA profile', kind: 'web', url: 'https://ra.co/clubs/212119' },
        { label: 'Instagram', kind: 'web', url: 'https://www.instagram.com/itathensexarcheia/' },
      ],
    },
    {
      // Techno underground hadde berre éin klubb i heile lista (IT Athens) —
      // begge desse er verifiserte 07.09.2026 (offisielle nettstader svarer 200).
      emoji: '🏭', name: 'Berghain', loc: 'Friedrichshain, Berlin, Germany 🇩🇪',
      grad: 'linear-gradient(135deg,#0d0d0d,#1f1f1f)',
      theme: 'A former power plant turned into the world’s most famous techno club — raw industrial architecture, an 18-metre-high main floor and the Panorama Bar upstairs for house. Residents include Ben Klock and Marcel Dettmann.',
      tags: ['Techno Underground', 'Industrial', 'Berlin', 'Legendary'],
      links: [
        { label: 'berghain.berlin', kind: 'web', url: 'https://berghain.berlin/' },
      ],
    },
    {
      emoji: '🔒', name: 'Tresor', loc: 'Mitte, Berlin, Germany 🇩🇪',
      grad: 'linear-gradient(135deg,#0a0a0a,#1a0505)',
      theme: 'Founded 1991 in the vault of a former department store — the club that defined post-reunification Berlin techno, championing Jeff Mills and Underground Resistance. Moved to a former heating plant in 2007; still raw, dark and uncompromising.',
      tags: ['Techno Underground', 'Est. 1991', 'Berlin', 'Historic'],
      links: [
        { label: 'tresorberlin.com', kind: 'web', url: 'https://tresorberlin.com/' },
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
    {
      emoji: '🛋️', name: 'Sofa Beats', loc: 'Denmark 🇩🇰 · Chillgressive / Downtempo',
      grad: 'linear-gradient(135deg,#0a1a14,#12362a)',
      links: [
        { label: 'Bandcamp', kind: 'bandcamp', url: 'https://sofabeatsmusic.bandcamp.com/' }, // gamal handle var ein ubeslekta solokunstnar, retta 07.09.2026
      ],
    },
    {
      emoji: '🛰️', name: 'Astropilot Music', loc: 'Ukraine 🇺🇦 · Chillgressive / Psybient',
      grad: 'linear-gradient(135deg,#05101f,#0b2444)',
      links: [
        { label: 'Bandcamp', kind: 'bandcamp', url: 'https://astropilotmusic.bandcamp.com/' },
      ],
    },
    {
      emoji: '🔮', name: 'Visionary Shamanics', loc: 'Psychill / Psydub',
      grad: 'linear-gradient(135deg,#140a24,#2a1245)',
      links: [
        { label: 'Bandcamp', kind: 'bandcamp', url: 'https://visionaryshamanics.bandcamp.com/' },
      ],
    },
    {
      emoji: '🕯️', name: 'Altar Records', loc: 'DJ Zen’s label · Psychill / Downtempo',
      grad: 'linear-gradient(135deg,#1a0f05,#3a2410)',
      links: [
        { label: 'altar-records.com', kind: 'web', url: 'https://www.altar-records.com/' },
        { label: 'Bandcamp', kind: 'bandcamp', url: 'https://altar.bandcamp.com/' }, // gamal handle synte berre eit underprosjekt, retta 07.09.2026
      ],
    },
    {
      emoji: '🌌', name: 'Microcosmos Chill-out', loc: 'Psychill / Ambient',
      grad: 'linear-gradient(135deg,#050a1f,#101a44)',
      links: [
        { label: 'microcosmosrecords.com', kind: 'web', url: 'https://microcosmosrecords.com/' },
        { label: 'Bandcamp', kind: 'bandcamp', url: 'https://microcosmos.bandcamp.com/' },
      ],
    },
    {
      emoji: '🌬️', name: 'Blue Hour Sounds', loc: 'Psychill / Downtempo',
      grad: 'linear-gradient(135deg,#04121f,#0a2c44)',
      links: [
        { label: 'Bandcamp', kind: 'bandcamp', url: 'https://blueHoursounds.bandcamp.com/' },
      ],
    },
    {
      emoji: '🧿', name: 'Merkaba Music', loc: 'Australia 🇦🇺 · Psybass / Downtempo',
      grad: 'linear-gradient(135deg,#12051f,#280a40)',
      links: [
        { label: 'merkabamusic.com', kind: 'web', url: 'https://merkabamusic.com/' },
        // Verifisert 08.09.2026: merkabamusic.bandcamp.com (utan "1") er faktisk
        // soloartisten "Merkaba" i Sydney (entalsspråk, 17 utgjevingar) — IKKJE
        // labelen. merkabamusic1.bandcamp.com er "Merkaba Music Australia", den
        // ekte labelen med fleire signerte artistar (Kalya Scintilla, TRIBONE
        // m.fl.). Retta til den rette lenka.
        { label: 'Bandcamp', kind: 'bandcamp', url: 'https://merkabamusic1.bandcamp.com/' },
      ],
    },
    {
      emoji: '🌵', name: 'Desert Trax', loc: 'USA 🇺🇸 · Desert Dwellers · Tribal Downtempo',
      grad: 'linear-gradient(135deg,#1f1205,#40270a)',
      links: [
        { label: 'Bandcamp', kind: 'bandcamp', url: 'https://deserttrax.bandcamp.com/' }, // "desertrax" (éin t) 303-omdirigerte til bandcamp.com si framside, retta 07.09.2026
      ],
    },
    {
      emoji: '🍁', name: 'Interchill Records', loc: 'Canada 🇨🇦 · Psydub / Downtempo',
      grad: 'linear-gradient(135deg,#0a1405,#1c3010)',
      links: [
        { label: 'Bandcamp', kind: 'bandcamp', url: 'https://interchill.bandcamp.com/' },
      ],
    },
    {
      emoji: '🌀', name: 'TWISTED Records', loc: 'UK 🇬🇧 · Simon Posford · Psytrance / Psybient',
      grad: 'linear-gradient(135deg,#0d0829,#221050)',
      links: [
        { label: 'twistedmusic.com', kind: 'web', url: 'https://twistedmusic.com/' },
        { label: 'Bandcamp', kind: 'bandcamp', url: 'https://twistedmusicuk.bandcamp.com/' }, // gamal handle var ein tom, ubeslekta NY-konto, retta 07.09.2026
      ],
    },
    {
      emoji: '💫', name: 'TIP Records', loc: 'UK 🇬🇧 · Raja Ram · Goa classics',
      grad: 'linear-gradient(135deg,#1a1405,#3d3110)',
      links: [
        { label: 'Bandcamp', kind: 'bandcamp', url: 'https://tiprecords.bandcamp.com/' },
      ],
    },
    {
      emoji: '🎛️', name: 'Iono Music', loc: 'Germany 🇩🇪 · Progressive Psytrance',
      grad: 'linear-gradient(135deg,#05141a,#0b3040)',
      links: [
        { label: 'Bandcamp', kind: 'bandcamp', url: 'https://ionomusic.bandcamp.com/' },
      ],
    },
    {
      emoji: '🧊', name: 'TesseracTstudio', loc: 'Progressive / Psy-Techno',
      grad: 'linear-gradient(135deg,#0a0f1f,#161f44)',
      links: [
        { label: 'Bandcamp', kind: 'bandcamp', url: 'https://tesseractstudio.bandcamp.com/' },
      ],
    },
    {
      emoji: '🌻', name: 'Hadra Records', loc: 'France 🇫🇷 · Psytrance / Chill',
      grad: 'linear-gradient(135deg,#0d1405,#243d0a)',
      links: [
        { label: 'Bandcamp', kind: 'bandcamp', url: 'https://hadrarecords.bandcamp.com/' },
      ],
    },
    {
      emoji: '🌙', name: 'Dreaming Awake Records', loc: 'Psychill / Psybient',
      grad: 'linear-gradient(135deg,#0a0a1f,#1a1440)',
      // Bandcamp-lenka fjerna 07.09.2026: dreamingawake.bandcamp.com er ein
      // ubeslekta artist i Miami. Ingen av dei to reelle Bandcamp-kandidatane
      // (eit techno/house-merke i LA med same namn, eller det ukrainske
      // "Dreaming Awakening Records" som sjølv er nedlagt/303-omdirigerer)
      // matchar denne psychill/psybient-profilen — heller ingen lenke enn feil.
      links: [],
    },
    {
      // Ingen dark ambient-label fantes i denne lista frå før (same hol som i
      // Magazine/AI-rotasjonen — Cryo Chamber dekkjer det der, men World hadde
      // ingenting). Cyclic Law er den andre store, verifisert 07.09.2026.
      emoji: '🕯️', name: 'Cyclic Law', loc: 'France 🇫🇷 · Dark Ambient / Ritual / Industrial (est. 2002)',
      grad: 'linear-gradient(135deg,#0a0a0a,#1a0505)',
      links: [
        { label: 'cycliclaw.com', kind: 'web', url: 'https://www.cycliclaw.com/' },
        { label: 'Bandcamp', kind: 'bandcamp', url: 'https://cycliclaw.bandcamp.com/' },
      ],
    },
    {
      emoji: '🪐', name: 'Cryo Chamber', loc: 'USA 🇺🇸 · Dark Ambient / Cinematic (Simon Heath)',
      grad: 'linear-gradient(135deg,#04130a,#0a2e16)',
      links: [
        { label: 'Bandcamp', kind: 'bandcamp', url: 'https://cryochamber.bandcamp.com/' },
      ],
    },
    {
      // Techno underground hadde heller ingen label her — verifisert 07.09.2026.
      emoji: '🏭', name: 'CLR', loc: 'Germany 🇩🇪 · Raw / Hypnotic Techno (Chris Liebing, est. 1999)',
      grad: 'linear-gradient(135deg,#0d0d0d,#1f1f1f)',
      links: [
        { label: 'Resident Advisor', kind: 'web', url: 'https://ra.co/labels/1182' },
      ],
    },
    {
      // Verifisert 07.09.2026. Goa-dekninga hadde Suntrip/TIP/TWISTED frå før,
      // men ikkje Spirit Zone — eit av dei mest sentrale klassiske Goa-labela
      // (heim for Electric Universe, Space Tribe, Etnica på 90-talet).
      emoji: '🌀', name: 'Spirit Zone Recordings', loc: 'Germany 🇩🇪 · Goa Trance (est. 1994)',
      grad: 'linear-gradient(135deg,#1a0b3d,#3a106e)',
      theme: 'Founded by Wolfgang Ahrens (DJ Antaro) in 1994 — one of the defining labels of classic Goa trance, home to Electric Universe, Space Tribe, Etnica and S.U.N. Project.',
      tags: ['Goa Trance', 'Classic', 'Est. 1994'],
      links: [
        { label: 'Wikipedia', kind: 'web', url: 'https://en.wikipedia.org/wiki/Spirit_Zone_Records' }, // spiritzone.de er no ei domeneparkeringsside (til salgs) — labelen vart nedlagt 2005, ingen levande offisiell nettstad finst, retta 07.09.2026
      ],
    },
    {
      // EDM hadde ingen eigen label-representasjon her frå før (berre media/
      // artist-lister nemnde det). Anjunabeats er sjangerens definitive label.
      emoji: '⚡', name: 'Anjunabeats', loc: 'UK 🇬🇧 · EDM / Trance (Above & Beyond)',
      grad: 'linear-gradient(135deg,#1a0520,#3a0f4a)',
      theme: 'Run by Above & Beyond since 2000 — one of the defining melodic trance/EDM labels, still driving the genre’s biggest festival-stage sound today.',
      tags: ['EDM', 'Trance', 'Above & Beyond'],
      links: [
        { label: 'anjunabeats.com', kind: 'web', url: 'https://anjunabeats.com/' },
      ],
    },
    {
      // Fleire dark-drone-label enn berre Cyclic Law/Cryo Chamber — same to
      // som Discover sin Drone Zone allereie brukar (DRONE_LABELS), no òg her.
      emoji: '🩸', name: 'Malignant Records', loc: 'USA 🇺🇸 · Dark Ambient / Industrial (est. 1994)',
      grad: 'linear-gradient(135deg,#0a0505,#1a0505)',
      theme: 'Running since 1994 — one of the longest-standing labels dedicated to dark ambient, power electronics and true industrial.',
      tags: ['Dark Ambient', 'Industrial', 'Est. 1994'],
      links: [
        { label: 'malignantrecords.com', kind: 'web', url: 'https://www.malignantrecords.com/' },
      ],
    },
    // ── Lagt til 08.09.2026 (brukar-forespurt batch, verifisert via research-agent) ──
    {
      emoji: '🪶', name: 'Shamanic Tales', loc: 'Israel 🇮🇱 · Psytrance (Astrix’s label)',
      grad: 'linear-gradient(135deg,#140a1f,#301344)',
      links: [
        { label: 'Bandcamp', kind: 'bandcamp', url: 'https://shamanictales.bandcamp.com/' },
      ],
    },
    {
      emoji: '🐘', name: 'Bom Shanka Music', loc: 'UK 🇬🇧 · Psytrance',
      grad: 'linear-gradient(135deg,#1f0a14,#44102c)',
      links: [
        { label: 'Bandcamp', kind: 'bandcamp', url: 'https://bomshankamusic.bandcamp.com/' },
      ],
    },
    {
      emoji: '🐲', name: 'Dragonfly Records', loc: 'UK 🇬🇧 · Goa Trance (est. 1993)',
      grad: 'linear-gradient(135deg,#04191a,#0a3a3d)',
      links: [
        { label: 'Bandcamp', kind: 'bandcamp', url: 'https://dragonflyrecordsuk.bandcamp.com/' },
      ],
    },
    {
      // Techno, ikkje psy/downtempo — same sjanger-utviding som CLR-oppføringa over.
      emoji: '🎚️', name: 'KNTXT', loc: 'Belgium 🇧🇪 · Techno (Charlotte de Witte)',
      grad: 'linear-gradient(135deg,#0a0a0a,#1f1f1f)',
      links: [
        { label: 'Bandcamp', kind: 'bandcamp', url: 'https://kntxt.bandcamp.com/' },
      ],
    },
    {
      // Bandcamp-handle "beatspace-timelapse" — sjølve labelen er Timelapse Records (Israel).
      emoji: '⏳', name: 'Timelapse Records', loc: 'Israel 🇮🇱 · Goa Trance / Psybient',
      grad: 'linear-gradient(135deg,#0a0a2e,#181a54)',
      links: [
        { label: 'Bandcamp', kind: 'bandcamp', url: 'https://beatspace-timelapse.bandcamp.com/' },
      ],
    },
    {
      emoji: '🌍', name: 'Globalsect Music', loc: 'Serbia 🇷🇸 · Psy / Space Ambient',
      grad: 'linear-gradient(135deg,#05081f,#141048)',
      links: [
        { label: 'Bandcamp', kind: 'bandcamp', url: 'https://globalsect.bandcamp.com/' },
      ],
    },
    {
      // Sjanger ikkje eksplisitt oppgitt på sida — utleidd frå katalogen, usikkert.
      emoji: '⏰', name: 'Cronomi Records', loc: 'Belgium 🇧🇪 · Electronic / Psy',
      grad: 'linear-gradient(135deg,#0f0a1f,#241344)',
      links: [
        { label: 'Bandcamp', kind: 'bandcamp', url: 'https://cronomi.bandcamp.com/' },
      ],
    },
    {
      // Sjanger ikkje eksplisitt oppgitt på sida — utleidd frå katalogen, usikkert.
      emoji: '🌆', name: 'MikelaBella Records', loc: 'Spain 🇪🇸 · Electronic / Dub / Ambient',
      grad: 'linear-gradient(135deg,#1f0d05,#3d2410)',
      links: [
        { label: 'Bandcamp', kind: 'bandcamp', url: 'https://mikelabellarecords.bandcamp.com/' },
      ],
    },
    {
      emoji: '🌐', name: 'Synchronos Recordings', loc: 'USA 🇺🇸 · Psybass / Glitch / Ambient',
      grad: 'linear-gradient(135deg,#04191f,#0a3a44)',
      links: [
        { label: 'Bandcamp', kind: 'bandcamp', url: 'https://synchronos-recordings.bandcamp.com/' },
      ],
    },
    {
      // Sjanger-strekk mot sidas psy/downtempo/dark-ambient-fokus (Rotterdam
      // chillhop/jazzhop/triphop-label) — lagt til likevel per brukarønske.
      emoji: '☕', name: 'Chillhop Music', loc: 'Netherlands 🇳🇱 · Chillhop / Jazzhop / Triphop',
      grad: 'linear-gradient(135deg,#1a1005,#3a2410)',
      links: [
        { label: 'Bandcamp', kind: 'bandcamp', url: 'https://chillhop.bandcamp.com/' },
      ],
    },
    {
      emoji: '💙', name: 'Blue Tunes Chillout', loc: 'Germany 🇩🇪 · Lounge / Chillout / Ambient',
      grad: 'linear-gradient(135deg,#04121f,#0a2c4a)',
      links: [
        { label: 'Bandcamp', kind: 'bandcamp', url: 'https://bluetuneschillout.bandcamp.com/' },
      ],
    },
    {
      emoji: '🧘', name: 'Mystic Sound Records', loc: 'Greece 🇬🇷 · Psychedelic Downtempo',
      grad: 'linear-gradient(135deg,#051a1a,#0a3838)',
      links: [
        { label: 'Bandcamp', kind: 'bandcamp', url: 'https://mysticsound.bandcamp.com/' },
      ],
    },
    {
      // Berre Discogs-lenke funnen — ingen eiga nettside/Bandcamp identifisert enno.
      emoji: '🌫️', name: 'Leftfield Records', loc: 'Sweden 🇸🇪 · Ambient / Psybient (Carbon Based Lifeforms)',
      grad: 'linear-gradient(135deg,#0a0f14,#182a3a)',
      links: [
        { label: 'Discogs', kind: 'web', url: 'https://www.discogs.com/label/467138-Leftfield-Records' },
      ],
    },
    {
      // Stad ikkje oppgitt nokon stad på sida — ukjend, difor utelate frå loc.
      emoji: '🐉', name: 'Celestial Dragon Records', loc: 'Electronic / Experimental',
      grad: 'linear-gradient(135deg,#1a0505,#3d1010)',
      links: [
        { label: 'Bandcamp', kind: 'bandcamp', url: 'https://beatspace-celestialdragon.bandcamp.com/' },
      ],
    },
    {
      emoji: '🌅', name: 'Café del Mar Music', loc: 'Spain 🇪🇸 · Ibiza · Chillout / Lounge (est. 1994)',
      grad: 'linear-gradient(135deg,#1a1005,#3d2810)',
      links: [
        { label: 'cafedelmar.com', kind: 'web', url: 'https://cafedelmar.com/music/albums' },
      ],
    },
  ];

  // ── Magazines, media & scene archives ─────────────────────────────────
  const MEDIA = [
    {
      // Verifisert 07.09.2026: mushroom-magazine.com viser «Website offline» —
      // magasinet la ned nettsida etter 25 år. Behalde som scene-historie, men
      // peikar no til Facebook-sida deira (framleis aktiv) i staden for den
      // daude lenkja.
      emoji: '🍄', name: 'mushroom magazine', loc: 'Germany 🇩🇪 · 1993–2026 (nettside nedlagt)',
      grad: 'linear-gradient(135deg,#1a0a05,#3d1a0a)',
      theme: 'For 25 år verdas leiande psytrance-magasin — party- og festivalguide, nye utgjevingar, artist- og labelportrett, DJ-lister. Nettsida er lagt ned; arkivet lever vidare på Facebook.',
      tags: ['Magazine', 'Scene History', 'Festival Guide', 'DJ Charts'],
      links: [
        { label: 'Facebook', kind: 'web', url: 'https://www.facebook.com/mushroommagazine/' },
      ],
    },
    {
      emoji: '🌿', name: 'psybient.org', loc: 'Psychill · Psybient · Psydub',
      grad: 'linear-gradient(135deg,#04130d,#0a2e22)',
      theme: 'The reference site for the chill side of the scene — releases, mixes, interviews, label-of-the-year polls and an event calendar for downtempo and ambient gatherings.',
      tags: ['Psychill', 'Downtempo', 'Reviews', 'Charts', 'Calendar'],
      links: [
        { label: 'psybient.org', kind: 'web', url: 'https://www.psybient.org/' },
      ],
    },
    {
      emoji: '📰', name: 'Trancentral', loc: 'Psytrance news & culture',
      grad: 'linear-gradient(135deg,#0d0829,#2a0d5e)',
      theme: 'Weekly release round-ups, mixes, features and scene news across the full spectrum of psychedelic sub-genres.',
      tags: ['News', 'Weekly Releases', 'Mixes', 'Interviews'],
      links: [
        { label: 'trancentral.tv', kind: 'web', url: 'https://trancentral.tv/' },
      ],
    },
    {
      emoji: '💾', name: 'Ektoplazm', loc: 'Free & legal psytrance archive',
      grad: 'linear-gradient(135deg,#04131f,#0a2a44)',
      theme: 'The scene’s largest free-music portal — thousands of Creative Commons releases in lossless quality, from Goa and full-on to psychill and downtempo.',
      tags: ['Free Music', 'Netlabels', 'Creative Commons', 'Archive'],
      links: [
        { label: 'ektoplazm.com', kind: 'web', url: 'https://ektoplazm.com/free-music/' },
      ],
    },
    {
      emoji: '🗓️', name: 'PsyCalendar', loc: 'Worldwide festival calendar',
      grad: 'linear-gradient(135deg,#1a1405,#3a2e0a)',
      theme: 'A global calendar of psytrance festivals and parties — dates, countries and line-ups collected in one place.',
      tags: ['Calendar', 'Festivals', 'Worldwide'],
      links: [
        { label: 'psycalendar.com', kind: 'web', url: 'https://www.psycalendar.com/' },
      ],
    },
    {
      emoji: '🌍', name: 'Psytrance Net', loc: 'Global events & guides',
      grad: 'linear-gradient(135deg,#0a140d,#163024)',
      theme: 'Event listings, festival guides and news for the international psytrance community.',
      tags: ['Events', 'Guides', 'News'],
      links: [
        { label: 'psytrancenet.com', kind: 'web', url: 'https://psytrancenet.com/en' },
      ],
    },
    {
      emoji: '🦁', name: 'Psymedia', loc: 'South Africa 🇿🇦 · Scene media',
      grad: 'linear-gradient(135deg,#1f1205,#40270a)',
      theme: 'Festival databases, line-up news and features with a strong focus on the African and Southern-Hemisphere scene.',
      tags: ['Festival Database', 'Africa', 'News'],
      links: [
        { label: 'psymedia.co.za', kind: 'web', url: 'https://psymedia.co.za/' },
      ],
    },
    {
      emoji: '💬', name: 'Psynews.org', loc: 'Community forum · Since 1997',
      grad: 'linear-gradient(135deg,#0a0a14,#1a1030)',
      theme: 'One of the oldest surviving psytrance communities — album reviews, deep genre discussion and decades of scene memory.',
      tags: ['Forum', 'Reviews', 'Community', 'Since 1997'],
      links: [
        { label: 'psynews.org', kind: 'web', url: 'https://www.psynews.org/' },
      ],
    },
    {
      // Techno underground hadde ingen eiga scene-media her frå før — verifisert
      // 07.09.2026 (WebFetch, curl 403 er berre RA sin bot-beskyttelse).
      emoji: '🎫', name: 'Resident Advisor', loc: 'Global · Techno Underground / Club culture',
      grad: 'linear-gradient(135deg,#0d0d0d,#1f1f1f)',
      theme: 'The definitive outlet for underground club culture — event listings, reviews, artist features and news across techno, house and the wider underground.',
      tags: ['Techno Underground', 'Club Listings', 'News', 'Reviews'],
      links: [
        { label: 'ra.co', kind: 'web', url: 'https://ra.co/' },
      ],
    },
    {
      // EDM hadde ingen eiga scene-media her frå før heller.
      emoji: '⚡', name: 'EDM.com', loc: 'USA 🇺🇸 · EDM (est. 2013)',
      grad: 'linear-gradient(135deg,#1a0520,#3a0f4a)',
      theme: 'One of the largest EDM-focused outlets — breaking news, artist interviews and release coverage across the wider electronic dance music industry.',
      tags: ['EDM', 'News', 'Interviews'],
      links: [
        { label: 'edm.com', kind: 'web', url: 'https://edm.com/' },
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
      emoji: '🎛️', name: 'Tristan', loc: 'UK 🇬🇧 · Goa / Psytrance (since 1995)',
      theme: 'Tristan Cooke — one of the UK scene\u2019s founding names. Played the Goa full-moon parties before returning to London in 1993, debuted on Matsuri Records in 1995 and released the classics Audiodrome (1999) and Substance (2002) on Twisted Records. Now a cornerstone of Nano Records, still headlining Boom, Ozora and Glastonbury.',
      tags: ['Goa trance', 'Full-on', 'Twisted Records', 'Nano Records'],
      grad: 'linear-gradient(135deg,#120520,#4a0f3a)',
      links: [
        { label: 'djtristan.com', kind: 'web', url: 'https://djtristan.com/' },
        { label: 'Bandcamp', kind: 'bandcamp', url: 'https://djtristan.bandcamp.com/' },
        { label: 'SoundCloud', kind: 'soundcloud', url: 'https://soundcloud.com/djtristan' },
        { label: 'Spotify', kind: 'spotify', url: 'https://open.spotify.com/artist/4dksllH87LsrZgin0ee2uc' },
      ],
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
    {
      // Ingen dark ambient-artist fantes her frå før — same hol som labels-lista.
      emoji: '🪐', name: 'Atrium Carceri', loc: 'Sweden 🇸🇪 · Dark Ambient / Cinematic (Simon Heath)',
      theme: 'Simon Heath’s flagship dark ambient project — cinematic, cold-industrial soundscapes. Left Cold Meat Industry in 2011 to found his own label, Cryo Chamber, which now anchors the whole genre.',
      tags: ['Dark Ambient', 'Cinematic', 'Cryo Chamber'],
      grad: 'linear-gradient(135deg,#04130a,#0a2e16)',
      links: [
        { label: 'Cryo Chamber (Bandcamp)', kind: 'bandcamp', url: 'https://cryochamber.bandcamp.com/' },
        { label: 'Wikipedia', kind: 'web', url: 'https://en.wikipedia.org/wiki/Atrium_Carceri' },
      ],
    },
    {
      // Ingen techno underground-artist fantes her frå før heller.
      emoji: '🏭', name: 'Surgeon', loc: 'UK 🇬🇧 · Raw / Hypnotic Techno (Anthony Child, since 1994)',
      theme: 'Anthony Child, aka Surgeon — a founding name in British underground techno, running his own labels Dynamic Tension and Counterbalance since the mid-90s alongside releases on Tresor and Downwards.',
      tags: ['Techno Underground', 'Dynamic Tension', 'Hypnotic'],
      grad: 'linear-gradient(135deg,#0d0d0d,#1f1f1f)',
      links: [
        { label: 'Bandcamp', kind: 'bandcamp', url: 'https://anthony-child.bandcamp.com/' },
        { label: 'dj-surgeon.com', kind: 'web', url: 'https://dj-surgeon.com/' },
      ],
    },
    {
      // Lagt til 08.09.2026 (brukar-forespurt), verifisert: begge lenkjene lastar.
      emoji: '🕯️', name: 'Kammarheit', loc: 'Sweden 🇸🇪 · Dark Ambient / Dungeon Synth (Pär Boström, since 2000)',
      theme: 'Pär Boström’s dark ambient project, based in Umeå — a post-apocalyptic stillness among subterranean halls, deep chasms and abandoned places. A recurring collaborator with Atrium Carceri (Simon Heath) on Cryo Chamber, and a veteran voice on its dungeon-synth offshoot Cryo Crypt.',
      tags: ['Dark Ambient', 'Dungeon Synth', 'Cryo Chamber'],
      grad: 'linear-gradient(135deg,#0a0a0a,#1a1005)',
      links: [
        { label: 'kammarheit.com', kind: 'web', url: 'https://kammarheit.com/' },
        { label: 'Bandcamp', kind: 'bandcamp', url: 'https://kammarheit.bandcamp.com/' },
      ],
    },
    {
      // Lagt til 08.09.2026 (brukar-forespurt, Ultimae-artistar), verifisert:
      // alle lenkjer lastar (ultimae.com sine offisielle artistsider).
      emoji: '🌲', name: 'Martin Nonstatic', loc: 'Austria 🇦🇹 · Psybient / Ambient (Ultimae)',
      theme: 'Martin Van Rossum — born in the Netherlands (1976), now based in Linz. Smooth, hypnotic ambient electronica with lush soundscapes; a prolific Ultimae Records artist with albums like Granite, Ligand and Pulsatille.',
      tags: ['Psybient', 'Ambient', 'Ultimae Records'],
      grad: 'linear-gradient(135deg,#04130d,#0a2e22)',
      links: [
        { label: 'ultimae.com', kind: 'web', url: 'https://ultimae.com/artists/martin-nonstatic/' },
        { label: 'Bandcamp', kind: 'bandcamp', url: 'https://martinnonstatic1.bandcamp.com/' },
      ],
    },
    {
      emoji: '🌀', name: 'Aes Dana', loc: 'France 🇫🇷 · Downtempo / IDM (Ultimae founder)',
      theme: 'Vincent Villuis — composer, sound designer and founder of Ultimae Records, with 25+ years in electronic music. Blends deep ambient, downtempo and IDM with neo-classical and industrial touches; also known for H.U.V.A. Network with Solar Fields.',
      tags: ['Downtempo', 'IDM', 'Ultimae Records'],
      grad: 'linear-gradient(135deg,#05131f,#0a2a44)',
      links: [
        { label: 'ultimae.com', kind: 'web', url: 'https://ultimae.com/artists/aes-dana/' },
        { label: 'Bandcamp (Ultimae)', kind: 'bandcamp', url: 'https://ultimae.bandcamp.com/' },
      ],
    },
    {
      emoji: '🌊', name: 'Miktek', loc: 'Greece 🇬🇷 · Ambient / IDM / Downtempo (Ultimae)',
      theme: 'Mihalis Aikaterinis, from Mytilene (Lesvos) — meticulously crafted ambient/IDM with unique percussion and subtle melodies. Debuted in 2011 on Abstrakt Reflections, joined Ultimae Records in 2013 for Elsewhere and several label compilations, plus collaborations with Aes Dana.',
      tags: ['Ambient', 'IDM', 'Ultimae Records'],
      grad: 'linear-gradient(135deg,#04191f,#0a3a44)',
      links: [
        { label: 'ultimae.com', kind: 'web', url: 'https://ultimae.com/artists/miktek/' },
        { label: 'Bandcamp (Ultimae)', kind: 'bandcamp', url: 'https://ultimae.bandcamp.com/' },
      ],
    },
  ];

  // ── Web radios from around the world ──────────────────────────────────
  // `play` = id of a station in Radio.js → plays directly in the SiriusFM player.
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
      emoji: '📻', name: 'PsyRadio.fm', loc: 'Germany 🇩🇪 · 4 channels since 2004',
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
    {
      // Denne lista hadde ingen dark ambient/drone- eller techno-radio frå før —
      // same hol som Labels/Artists/Media. Alle tre `play`-id-ane finst allereie
      // i STATIONS (radio.js), så dette er berre nye vindauge inn til dei.
      emoji: '💀', name: 'Doomed — Dark Drone', loc: 'Dark ambient & dark drone electronics',
      grad: 'linear-gradient(135deg,#0a0a0a,#1a0505)',
      links: [{ play: 'doomed' }],
    },
    {
      emoji: '💊', name: 'Digitalis', loc: 'Hypnotic techno & minimal grooves',
      grad: 'linear-gradient(135deg,#1a0505,#2e0808)',
      links: [{ play: 'digitalis' }],
    },
    {
      emoji: '🌿', name: 'radiOzora Chill', loc: 'OZORA Festival radio — chill & downtempo · Budapest 🇭🇺',
      grad: 'linear-gradient(135deg,#04130a,#0a2e16)',
      links: [{ play: 'radiozora-chill' }],
    },
  ];

  function linkRow(links) {
    return `<div class="world-links">${links.map(l => {
      if (l.play) {
        return `<button class="world-link world-link--play" onclick="World.tuneIn('${l.play}')">${Icon('play')} Play here</button>`;
      }
      const ico = l.kind === 'soundcloud' ? Icon('disc')
                : l.kind === 'bandcamp'   ? Icon('music')
                : l.kind === 'spotify'    ? Icon('music')
                : Icon('globe');
      return `<a class="world-link" href="${l.url}" target="_blank" rel="noopener noreferrer">${ico} ${esc(l.label)} ${Icon('arrow-up-right')}</a>`;
    }).join('')}</div>`;
  }

  function eventsRow(events) {
    if (!events || !events.length) return '';
    return `<div class="world-events">
      <div class="world-events-title">${Icon('calendar')} Upcoming events</div>
      ${events.map(e => `
        <a class="world-event" href="${e.url}" target="_blank" rel="noopener noreferrer">
          <span class="world-event-date">${esc(e.date)}</span>
          <span class="world-event-name">${esc(e.name)}</span>
          ${Icon('arrow-up-right')}
        </a>`).join('')}
    </div>`;
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
          ${eventsRow(c.events)}
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
            <p class="shows-hero-sub">The global psytrance and psybient scene stretches across the entire planet — with major transformational festivals, influential record labels and pioneering artists. A scene deeply rooted in visual art, spirituality and multi-day open-air gatherings.</p>
          </div>
          <div class="shows-hero-live">
            <div class="world-hero-stats">
              <div class="world-stat"><span>${FESTIVALS.length}</span> festivals</div>
              <div class="world-stat"><span>${CLUBS.length}</span> clubs</div>
              <div class="world-stat"><span>${LABELS.length}</span> labels</div>
              <div class="world-stat"><span>${ARTISTS.length}</span> artists</div>
              <div class="world-stat"><span>${MEDIA.length}</span> magazines</div>
              <div class="world-stat"><span>${RADIOS.length}</span> radios</div>
            </div>
            <a class="shows-live-btn" href="#/radio">${Icon('radio')} Open the radio player</a>
          </div>
        </div>

        <!-- FRESH FROM THE WORLD (AI-rotasjon, se js/aifresh.js) -->
        <div class="section" style="max-width:1100px">
          <div class="section-header">
            <div class="section-title"><img src="assets/logo-mark.svg?v=20260816-sfm" alt="" class="section-title-logo"> Fresh from the world</div>
          </div>
          <div id="world-fresh-festivals"></div>
          <div id="world-fresh-psychill"></div>
          <div id="world-fresh-chillgressive"></div>
          <div id="world-fresh-psytrance"></div>
          <div id="world-fresh-labels"></div>
          <div id="world-fresh-techno"></div>
          <div id="world-fresh-darkdrone"></div>
        </div>

        <!-- FESTIVALS -->
        <div class="section" style="max-width:1100px">
          <div class="section-header">
            <div class="section-title">${Icon('star')} Major global festivals</div>
            <span class="text-muted text-sm">Immersive stages · visionary art · camping culture</span>
          </div>
          ${grid(FESTIVALS)}
        </div>

        <!-- CLUBS -->
        <div class="section" style="max-width:1100px">
          <div class="section-header">
            <div class="section-title">${Icon('map-pin')} Clubs & venues</div>
            <span class="text-muted text-sm">Underground clubs around the world — with upcoming events from Resident Advisor</span>
          </div>
          ${grid(CLUBS)}
        </div>

        <!-- LABELS -->
        <div class="section" style="max-width:1100px">
          <div class="section-header">
            <div class="section-title">${Icon('disc')} Influential record labels</div>
            <span class="text-muted text-sm">From Goa revival to forest, psybient & full-on</span>
          </div>
          ${grid(LABELS)}
        </div>

        <!-- MAGAZINES & MEDIA -->
        <div class="section" style="max-width:1100px">
          <div class="section-header">
            <div class="section-title">${Icon('book')} Magazines & scene media</div>
            <span class="text-muted text-sm">Where the scene reads its own news — releases, charts, calendars and archives</span>
          </div>
          ${grid(MEDIA)}
        </div>

        <!-- ARTISTS -->
        <div class="section" style="max-width:1100px">
          <div class="section-header">
            <div class="section-title">${Icon('user')} Pioneering artists</div>
            <span class="text-muted text-sm">The pioneers behind the sound</span>
          </div>
          ${grid(ARTISTS)}
        </div>

        <!-- RADIO SEARCH — every web radio on the planet -->
        <div class="section" style="max-width:1100px">
          <div class="section-header">
            <div class="section-title">${Icon('search')} Search every web radio in the world</div>
            <span class="text-muted text-sm">Psytrance · EDM · House · Chillout · Psychill · Progressive · Downtempo · Ambient · Dark Drone — and everything else</span>
          </div>
          ${RadioSearch.widget()}
        </div>

        <!-- RADIOS -->
        <div class="section" style="max-width:1100px">
          <div class="section-header">
            <div class="section-title">${Icon('radio')} Featured web radios</div>
            <span class="text-muted text-sm">Click ${Icon('play')} «Play here» to listen directly in SiriusFM</span>
          </div>
          ${grid(RADIOS)}
        </div>

        <!-- OUTRO -->
        <div class="section" style="max-width:900px">
          <div class="world-outro">
            <div class="world-outro-icon">${Icon('sparkles')}</div>
            <p>Missing a festival, a label or a radio? Send a tip to
              <a href="mailto:post@siriusfm.no">post@siriusfm.no</a> — and we’ll add it.</p>
          </div>
        </div>

      </div>`;

    _mountFresh();
  }

  // «Fersk fra verden» — live AI-nettsøk per spor, rotert hver halvtime.
  // Samme kilde og takt som magasinets sjangerfaner (/api/magazine → js/aifresh.js),
  // så alt henger sammen og holdes oppdatert av samme cron.
  function _mountFresh() {
    if (typeof AIFresh === 'undefined') return;
    AIFresh.reset();
    AIFresh.mount({ id: 'world-fresh-festivals', genre: 'festivals',
      title: 'Festivals & events worldwide', emoji: '🎪', limit: 4 });
    AIFresh.mount({ id: 'world-fresh-psychill', genre: 'psychill',
      title: 'Psychill', emoji: '🌿', limit: 3 });
    AIFresh.mount({ id: 'world-fresh-chillgressive', genre: 'chillgressive',
      title: 'Chillgressive & Downtempo', emoji: '🛋️', limit: 3 });
    AIFresh.mount({ id: 'world-fresh-psytrance', genre: 'psytrance',
      title: 'Psytrance', emoji: '🍄', limit: 3 });
    AIFresh.mount({ id: 'world-fresh-labels', genre: 'labels',
      title: 'Labels & new releases', emoji: '🏷️', limit: 3 });
    AIFresh.mount({ id: 'world-fresh-techno', genre: 'techno-underground',
      title: 'Techno Underground', emoji: '🏭', limit: 3 });
    // Manglet frå før — World fikk nettopp eigne dark-drone-oppføringar
    // (Dark Mofo, Cyclic Law, Cryo Chamber, Atrium Carceri) men ingen AI-live
    // seksjon for sjangeren, same hol som var i Discover før den fiksen.
    AIFresh.mount({ id: 'world-fresh-darkdrone', genre: 'dark-drone',
      title: 'Dark Drone & Dark Ambient', emoji: '🌑', limit: 3 });
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
