// Magasin — redaksjonelt magasin for den elektroniske musikkscenen.
// Intervjuer · nye utgivelser · plateselskaper · festivaler & fester, verden over.
// Kuratert innhold (under) + live AI-nettsøk via /api/magazine, som roterer hver
// halvtime (js/aifresh.js). Sjangerfanene Psychill, Psytrance og Techno Underground
// er de samme sporene som forsidens AI-radio og verden-siden holder ferske.
// Egennavn (artister, labels, festivaler) er pakket i .notranslate så Google Translate
// ikke ødelegger dem.
const Magazine = (() => {

  function esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ── Sjangre (filterchips) ────────────────────────────────────────────
  const GENRES = [
    { key: 'psychill',          label: 'Psychill' },
    { key: 'psytrance',         label: 'Psytrance' },
    { key: 'techno-underground',label: 'Techno Underground' },
    { key: 'psybient',          label: 'Psybient' },
    { key: 'goa',               label: 'Goa' },
    { key: 'prog-psy',          label: 'Progressive psytrance' },
    { key: 'trance',            label: 'Trance' },
    { key: 'house',             label: 'House' },
    { key: 'prog-house',        label: 'Progressive house' },
    { key: 'edm',               label: 'EDM' },
    { key: 'dub',               label: 'Dub' },
    { key: 'downtempo',         label: 'Downtempo' },
    { key: 'chillout',          label: 'Chill out' },
    { key: 'dark-drone',        label: 'Dark Drone' },
    { key: 'global-underground',label: 'Global underground' },
    { key: 'festivals',         label: 'Festivals & events' },
  ];
  const genreLabel = (k) => (GENRES.find(g => g.key === k) || {}).label || k;

  // Seksjoner, i visningsrekkefølge.
  const KATEGORIER = ['Cover story', 'Interviews', 'New releases', 'Labels', 'Festivals & parties', 'Visual art'];
  const KAT_IKON = {
    'Cover story': 'star', 'Interviews': 'message', 'New releases': 'disc',
    'Labels': 'music', 'Festivals & parties': 'calendar', 'Visual art': 'palette',
  };

  const G = {
    natt:   'linear-gradient(135deg,#0d0829,#1a0b3d,#2a0d5e)',
    skog:   'linear-gradient(135deg,#04130a,#0a2e16,#11402a)',
    ild:    'linear-gradient(135deg,#1a0a05,#3a1a0a,#5e2a0d)',
    hav:    'linear-gradient(135deg,#04121f,#0a2540,#0d3a5e)',
    sol:    'linear-gradient(135deg,#2a1a05,#5e3a0d,#8a5a12)',
    lilla:  'linear-gradient(135deg,#1a0b3d,#3a106e,#5e1d9e)',
    grønn:  'linear-gradient(135deg,#06210f,#0d3a1f,#125e30)',
    rosa:   'linear-gradient(135deg,#2a0820,#5e0d45,#9e1d6e)',
  };

  // ── Kuratert innhold (redigér fritt) ─────────────────────────────────
  const MAGAZINE = [
    // ─── Forsidesaker ──────────────────────────────────────────────────
    {
      id: 'posford-psybient-arven', kategori: 'Cover story', emoji: '🍄', grad: G.lilla,
      tittel: 'The psybient legacy: from Hallucinogen to Shpongle',
      ingress: 'How one producer helped shape both psytrance and the dreamy psybient sound.',
      genres: ['psybient', 'psychill', 'psytrance', 'dub'], dato: 'June 2026', forfatter: 'SiriusFM editorial team',
      kilde: { navn: 'Wikipedia — Simon Posford', url: 'https://en.wikipedia.org/wiki/Simon_Posford' },
      brodtekst: [
        'Few names are as central to psychedelic electronic music as Simon Posford. Under the alias Hallucinogen he shaped an entire generation of goa and psytrance producers in the 1990s, before opening the door to what we now call psybient with Shpongle (together with Raja Ram) — slow, cinematic and full of detail.',
        'The line between the dance floor and the chill room has never been sharp in this scene. When Hallucinogen released «In Dub» in 2002 — remixed by Ott — psytrance structures were fused with dub, and the term psydub truly took hold.',
        'Today Shpongle Live still appears at the big transformational festivals, and the legacy lives on in everything from deep downtempo releases to forest psytrance. This story is a starting point — use the genre filters above to dig deeper.',
      ],
    },
    {
      id: 'goa-lever-videre', kategori: 'Cover story', emoji: '🕉️', grad: G.sol,
      tittel: 'The goa trance that never died',
      ingress: 'While full-on took over the dance floors, a small group of devotees kept the melodic goa sound alive.',
      genres: ['goa', 'trance', 'psytrance'], dato: 'June 2026', forfatter: 'SiriusFM editorial team',
      kilde: { navn: 'Suntrip Records', url: 'https://www.suntriprecords.com/' },
      brodtekst: [
        'Goa trance was born on the beaches of India and spread outward through the 1990s, before the modern full-on style took over much of the attention. But the melodic, acid-laced goa sound never disappeared entirely.',
        'The Belgian label Suntrip Records, founded in 2004, became the standard-bearer for the goa revival — with more than 80 releases and artists such as Filteria, Mindsphere and Astral Projection in its catalogue.',
        'The result is a living underground where new producers bring back the long, hypnotic melody lines from goa’s golden age, side by side with the classics.',
      ],
    },

    {
      id: 'psychill-chillrommet', kategori: 'Cover story', emoji: '🌿', grad: G.grønn,
      tittel: 'Psychill: the sound of the chill room',
      ingress: 'Slow, deep and detailed — the music that carries the hours between the dance floor sets.',
      genres: ['psychill', 'psybient', 'chillout', 'downtempo', 'dub'], dato: 'Ongoing', forfatter: 'SiriusFM editorial team',
      kilde: { navn: 'psybient.org', url: 'https://www.psybient.org/' },
      brodtekst: [
        'Psychill is the umbrella people in the scene reach for when the tempo drops: psybient, psydub, downtempo and ambient, played in chill rooms, domes and forest clearings rather than on the main stage.',
        'The sound lives on labels such as Ultimae, Cosmicleaf and Ottsonic, and in the chill stages of the big gatherings — OZORA’s Dome and Boom’s ambient areas among them. Releases arrive in a steady stream, most of them on Bandcamp rather than the charts.',
        'On SiriusFM the Psychill tab in the front-page radio rotates fresh, AI-picked sets around the clock, and the «Fresh from the web» cards here are refreshed continuously — so this page keeps up with the scene on its own.',
      ],
    },
    {
      id: 'techno-undergrunn-scenen', kategori: 'Cover story', emoji: '🏭', grad: G.natt,
      tittel: 'The techno underground: raw, hypnotic, uncompromising',
      ingress: 'From British factory lofts to island basements — the techno that never asked to be mainstream.',
      genres: ['techno-underground', 'global-underground'], dato: 'Ongoing', forfatter: 'SiriusFM editorial team',
      kilde: { navn: 'Resident Advisor', url: 'https://ra.co/' },
      brodtekst: [
        'Underground techno is defined as much by where it is played as by how it sounds: club nights, warehouses and small labels, with long, hypnotic sets instead of festival drops. Britain has its own lineage here — Surgeon, Blawan, Perc, Andy Stott and Dave Clarke among the names that shaped it.',
        'Resident Advisor remains the map for anyone who wants to find the parties: events, clubs and artists city by city, from London and Berlin to Athens, Tbilisi and Ibiza.',
        'SiriusFM follows this corner of the scene in two places — the Techno Underground tab in the front-page radio, and our own Underground page with artists, venues and event links. Both stay in rotation, so the material keeps changing.',
      ],
    },

    // ─── Intervjuer ────────────────────────────────────────────────────
    {
      id: 'intervju-ott', kategori: 'Interviews', emoji: '🎚️', grad: G.hav,
      tittel: 'Ott on psydub and the craft of the studio',
      ingress: 'The man behind «Blumenkraft» and «Hiraeth» has shaped the psydub sound for over two decades.',
      genres: ['dub', 'downtempo', 'psybient', 'psychill'], dato: 'May 2026', forfatter: 'SiriusFM editorial team',
      kilde: { navn: 'psybient.org — interview with Ott', url: 'https://www.psybient.org/love/interview-with-ott-2020/' },
      brodtekst: [
        'Ott (Otteran Langrell) has worked with everyone from Sinéad O’Connor and The Orb to Brian Eno and Simon Posford. It was precisely the collaboration with Posford — Hallucinogen’s «In Dub» in 2002 — that became one of the clearest early examples of psydub.',
        'Since then he has built a universe of his own through albums like «Blumenkraft» and «Skylon» on Twisted Records, and later «Mir», «Fairchildren», «Heads» and «Hiraeth» on his own Ottsonic.',
        'In the interview at psybient.org he talks about studio work, mixing, and why he builds the sound layer upon layer. Read the whole conversation via the source link at the bottom.',
      ],
    },
    {
      id: 'intervju-psychill-arkiv', kategori: 'Interviews', emoji: '🌀', grad: G.natt,
      tittel: 'Into the psychill scene — the interview archive',
      ingress: 'A whole archive of conversations with artists from the downtempo, psybient and psychill scene.',
      genres: ['psybient', 'psychill', 'chillout', 'downtempo'], dato: 'Ongoing', forfatter: 'SiriusFM editorial team',
      kilde: { navn: 'psybient.org — interviews', url: 'https://www.psybient.org/love/category/articles/interviews/' },
      brodtekst: [
        'For anyone who wants to hear the artists tell it in their own words, psybient.org is a gold mine. The site has its own interview archive with conversations spanning psychill, psybient, downtempo and psydub.',
        'Here you will find both established names and new producers — often with practical insights into studio setups, inspiration and how a release comes together.',
        'Use the source link to browse the entire archive.',
      ],
    },
    {
      id: 'anjunadeep-portrett', kategori: 'Interviews', emoji: '🌊', grad: G.hav,
      tittel: 'Anjunadeep: melodic house with British precision',
      ingress: 'James Grant and Jody Wisternoff have made deep, melodic house into a global sound.',
      genres: ['prog-house', 'house', 'chillout'], dato: 'February 2026', forfatter: 'SiriusFM editorial team',
      kilde: { navn: 'Anjunadeep — about', url: 'https://anjunadeep.com/about' },
      brodtekst: [
        'Anjunadeep grew out of the London label Anjunabeats and is today a centre of gravity for deep, melodic house worldwide. The curatorial duo James Grant and Jody Wisternoff are behind the annual «Anjunadeep» compilation series.',
        'The sound balances the warm and the danceable — equally at home in a chill room and on a nightclub floor at sunrise.',
        'Want to dive into the label’s history and philosophy? Start with the source below.',
      ],
    },

    // ─── Nye utgivelser ────────────────────────────────────────────────
    {
      id: 'anjunadeep-16', kategori: 'New releases', emoji: '💿', grad: G.hav,
      tittel: 'Anjunadeep 16 — James Grant & Jody Wisternoff',
      ingress: 'The sixteenth edition of the compilation series, released February 2026.',
      genres: ['prog-house', 'house', 'chillout'], dato: 'February 2026', forfatter: 'SiriusFM editorial team',
      kilde: { navn: 'Anjunadeep 16 (Bandcamp)', url: 'https://anjunadeep.bandcamp.com/album/anjunadeep-16' },
      brodtekst: [
        '«Anjunadeep 16» gathers a wide selection of melodic house and downtempo across two carefully sequenced mixes, with tracks from the Anjunadeep, Anjunachill and Explorations catalogues.',
        'As with earlier entries in the series, it is a great way in for anyone who wants to get to know the label’s sound — from the lingering to the danceable.',
      ],
    },
    {
      id: 'aes-dana-perimeters', kategori: 'New releases', emoji: '🌫️', grad: G.natt,
      tittel: 'Aes Dana — Perimeters (Remaster 2025)',
      ingress: 'Ultimae dusts off a downtempo classic.',
      genres: ['psybient', 'psychill', 'downtempo', 'chillout'], dato: 'January 2026', forfatter: 'SiriusFM editorial team',
      kilde: { navn: 'Ultimae Records', url: 'https://ultimae.com/' },
      brodtekst: [
        'Lyon-based Ultimae Records has spent recent seasons remastering several of its classics, among them «Perimeters» by Aes Dana — one of the label’s central downtempo/psybient works.',
        'The remaster gives the dreamy, layered sound new clarity without losing the warm, organic character Ultimae is known for.',
      ],
    },
    {
      id: 'ott-hiraeth', kategori: 'New releases', emoji: '🎛️', grad: G.grønn,
      tittel: 'Ott — Hiraeth',
      ingress: 'A new album from the psydub master on his own Ottsonic.',
      genres: ['dub', 'downtempo', 'psychill'], dato: '2024', forfatter: 'SiriusFM editorial team',
      kilde: { navn: 'Ott (Bandcamp)', url: 'https://ott.bandcamp.com/' },
      brodtekst: [
        '«Hiraeth» is yet another finely polished chapter in Ott’s catalogue — dense, bass-heavy layers of dub and downtempo with his characteristic, handcrafted sound signature.',
        'As always it is as much a listening album as dance music: details that only open up after several listens.',
      ],
    },
    {
      id: 'psybient-manedens', kategori: 'New releases', emoji: '🗓️', grad: G.lilla,
      tittel: 'This month’s releases on psybient.org',
      ingress: 'An up-to-date overview of fresh releases in the psychill universe.',
      genres: ['psybient', 'psychill', 'downtempo', 'chillout'], dato: 'Updated monthly', forfatter: 'SiriusFM editorial team',
      kilde: { navn: 'psybient.org — releases', url: 'https://www.psybient.org/love/march-2026-releases/' },
      brodtekst: [
        'If you want to stay on top of what is actually being released right now, psybient.org gathers monthly overviews of new releases in psychill, psybient, psydub and downtempo.',
        'It is the fastest way to discover new artists and labels — use the source link for the latest month.',
      ],
    },
    {
      id: 'asot-trance', kategori: 'New releases', emoji: '⚡', grad: G.rosa,
      tittel: 'Trance on the big stages — A State of Trance',
      ingress: 'Where trance and EDM meet for packed arenas.',
      genres: ['trance', 'edm'], dato: 'Ongoing', forfatter: 'SiriusFM editorial team',
      kilde: { navn: 'A State of Trance', url: 'https://www.astateoftrance.com/' },
      brodtekst: [
        'On the brighter, more arena-oriented side of the spectrum, trance stands strong — with radio shows, compilations and huge events that draw thousands.',
        'A State of Trance is a natural starting point for new singles and sets from this part of the scene, where trance and EDM often blur into one another.',
      ],
    },
    {
      id: 'cryo-chamber-specimen-7', kategori: 'New releases', emoji: '🌑', grad: G.natt,
      tittel: 'Void Stasis returns with «Specimen 7»',
      ingress: 'A sci-fi dark ambient voyage on Cryo Chamber, mastered by label head Simon Heath.',
      genres: ['dark-drone', 'psybient', 'downtempo'], dato: 'August 2026', forfatter: 'SiriusFM editorial team',
      kilde: { navn: 'Cryo Chamber (Bandcamp) — Specimen 7', url: 'https://cryochamber.bandcamp.com/album/specimen-7' },
      brodtekst: [
        'Void Stasis released «Specimen 7» on Cryo Chamber on 25 August 2026 — alien ambient and sci-fi soundscapes, mastered by Simon Heath (Atrium Carceri, the label’s founder).',
        'It sits squarely in the label’s signature territory: cinematic, slow-built dark ambient made for headphones and dark rooms rather than dance floors.',
        'For more of the same world, Cryo Chamber’s annual free «Dark Ambient of the Year» compilation is a good way to sample the wider roster in one sitting.',
      ],
    },
    {
      id: 'drumcomplex-supernova', kategori: 'New releases', emoji: '💊', grad: G.natt,
      tittel: 'Drumcomplex returns to his own DCMX with «Supernova»',
      ingress: 'Tough, no-nonsense German techno — 139 BPM, raw and uncompromising.',
      genres: ['techno-underground', 'global-underground'], dato: 'March 2026', forfatter: 'SiriusFM editorial team',
      kilde: { navn: 'DCMX (Beatport) — Supernova', url: 'https://www.beatport.com/release/supernova/5823425' },
      brodtekst: [
        'Drumcomplex released «Supernova» on his own label DCMX on 6 March 2026 — a comeback marked by tough, raw/deep/hypnotic techno at 139 BPM, in the label’s signature no-nonsense German style.',
        'The track quickly found its way onto bigger stages too: Carl Cox played it at Resistance Megastructure during Ultra Music Festival Miami later that same month.',
        'A good entry point if you want the harder, more industrial end of the techno underground rather than the melodic side.',
      ],
    },

    // ─── Plateselskaper ────────────────────────────────────────────────
    {
      id: 'label-ultimae', kategori: 'Labels', emoji: '🌌', grad: G.natt,
      tittel: 'Ultimae Records',
      ingress: 'The Lyon label that defined European ambient and downtempo.',
      genres: ['psybient', 'psychill', 'downtempo', 'chillout'], dato: 'Lyon, France', forfatter: 'SiriusFM editorial team',
      kilde: { navn: 'ultimae.com', url: 'https://ultimae.com/' },
      brodtekst: [
        'Ultimae Records is label, publisher, mastering studio and record store in one — based in Lyon. The catalogue is a landmark in ambient and downtempo, with artists such as Solar Fields, Aes Dana, Carbon Based Lifeforms and Martin Nonstatic.',
        'The sound is recognisable: warm, spacious and cinematic, built for immersion as much as for the dance floor.',
      ],
    },
    {
      id: 'label-cryo-chamber', kategori: 'Labels', emoji: '🪐', grad: G.skog,
      tittel: 'Cryo Chamber',
      ingress: 'Cinematic dark ambient driven by Simon Heath (Atrium Carceri).',
      genres: ['psybient', 'psychill', 'downtempo', 'dark-drone'], dato: 'Oregon, USA', forfatter: 'SiriusFM editorial team',
      kilde: { navn: 'Cryo Chamber (Bandcamp)', url: 'https://cryochamber.bandcamp.com/' },
      brodtekst: [
        'Cryo Chamber is run by Simon Heath, the man behind Atrium Carceri, and specialises in dark ambient with a cinematic, quality-conscious edge.',
        'The label is known for its large collaboration albums, where several artists build one cohesive, dark soundscape.',
      ],
    },
    {
      id: 'label-iboga', kategori: 'Labels', emoji: '🔊', grad: G.grønn,
      tittel: 'Iboga Records',
      ingress: 'From the Copenhagen underground to a global progressive powerhouse.',
      genres: ['prog-psy', 'prog-house', 'psytrance'], dato: 'Copenhagen, Denmark', forfatter: 'SiriusFM editorial team',
      kilde: { navn: 'Iboga Records', url: 'https://www.ibogarecords.com/' },
      brodtekst: [
        'Iboga Records started in the Copenhagen underground and grew into one of the best-known labels for progressive psytrance and progressive house.',
        'Beatportal named the label «Label of the Month» in August 2025 — a confirmation of its continued influence in the progressive scene.',
      ],
    },
    {
      id: 'label-suntrip', kategori: 'Labels', emoji: '☀️', grad: G.sol,
      tittel: 'Suntrip Records',
      ingress: 'The world’s leading label for melodic goa trance.',
      genres: ['goa', 'trance'], dato: 'Belgium', forfatter: 'SiriusFM editorial team',
      kilde: { navn: 'suntriprecords.com', url: 'https://www.suntriprecords.com/' },
      brodtekst: [
        'Suntrip Records was founded in 2004 by Fabien «Mars» Marsaud and Joske «Anoebis» Vranken as an alternative to modern full-on — with a focus on the melodic, acid-laced goa sound.',
        'With more than 80 releases and names such as Filteria, Mindsphere and Astral Projection, the label has become the very reference for the goa revival.',
      ],
    },
    {
      id: 'label-anjunadeep', kategori: 'Labels', emoji: '🌊', grad: G.hav,
      tittel: 'Anjunadeep',
      ingress: 'The London label behind one of the world’s best-known deep/melodic house sounds.',
      genres: ['prog-house', 'house'], dato: 'London, United Kingdom', forfatter: 'SiriusFM editorial team',
      kilde: { navn: 'anjunadeep.com', url: 'https://anjunadeep.com/' },
      brodtekst: [
        'Anjunadeep is the deeper, more atmospheric branch of the Anjuna family. The label has built a global audience around melodic house, deep house and downtempo.',
        'Beyond the records, the label runs its own events and compilation series that have become reference points for the genre.',
      ],
    },

    {
      id: 'label-cosmicleaf', kategori: 'Labels', emoji: '🍃', grad: G.grønn,
      tittel: 'Cosmicleaf Records',
      ingress: 'The Greek label that has released psychill and downtempo for two decades.',
      genres: ['psychill', 'psybient', 'downtempo', 'chillout'], dato: 'Athens, Greece', forfatter: 'SiriusFM editorial team',
      kilde: { navn: 'cosmicleaf.com', url: 'https://www.cosmicleaf.com/' },
      brodtekst: [
        'Cosmicleaf Records is one of the most productive labels in the psychill and downtempo world, run out of Athens with a catalogue spanning psybient, chillout and ambient.',
        'The label has long released a large share of its music as free or name-your-price downloads, which has made it a natural first stop for anyone getting into the genre.',
      ],
    },
    {
      id: 'label-perc-trax', kategori: 'Labels', emoji: '🏭', grad: G.natt,
      tittel: 'Perc Trax',
      ingress: 'The London label at the hard, industrial end of the techno underground.',
      genres: ['techno-underground', 'global-underground'], dato: 'London, United Kingdom', forfatter: 'SiriusFM editorial team',
      kilde: { navn: 'Perc Trax (Bandcamp)', url: 'https://perctrax.bandcamp.com/' },
      brodtekst: [
        'Perc Trax is run by the British producer Perc and has become a reference point for raw, industrial-leaning techno — precision-built, loud and made for dark rooms rather than festival stages.',
        'The label’s roster and back catalogue are a good map of where British techno has moved over the past two decades. Follow along via the source link.',
      ],
    },
    {
      id: 'label-cyclic-law', kategori: 'Labels', emoji: '🕯️', grad: G.natt,
      tittel: 'Cyclic Law',
      ingress: 'French ritual and dark ambient since 2002 — the other essential label alongside Cryo Chamber.',
      genres: ['dark-drone', 'psybient'], dato: 'France', forfatter: 'SiriusFM editorial team',
      kilde: { navn: 'Cyclic Law', url: 'https://www.cycliclaw.com/' },
      brodtekst: [
        'Cyclic Law has run since 2002, specialising in dark ambient, ritual and industrial soundscapes — alongside music, the label also publishes occult and esoteric books and tarot decks, which gives a sense of how deliberately atmospheric the whole project is.',
        'Where Cryo Chamber leans cinematic, Cyclic Law leans ritual — ceremonial, slow-built pieces meant for deep, undistracted listening rather than background noise.',
      ],
    },

    // ─── Festivaler & fester ───────────────────────────────────────────
    {
      id: 'fest-ozora', kategori: 'Festivals & parties', emoji: '🔥', grad: G.ild,
      tittel: 'OZORA Festival 2026',
      ingress: 'Dádpuszta in Hungary fills up again — from psytrance on the main stage to psybient in the Dome.',
      genres: ['festivals', 'psytrance', 'psybient', 'psychill', 'house', 'downtempo', 'techno-underground'], dato: 'July 24 – August 4, 2026', forfatter: 'SiriusFM editorial team',
      kilde: { navn: 'ozorafestival.eu', url: 'https://ozorafestival.eu/' },
      brodtekst: [
        'OZORA is one of Europe’s largest psychedelic festivals, held in Dádpuszta southwest of Budapest. The 2026 edition takes place July 24 – August 4, with an opening ceremony on July 27.',
        'The programme spans several stages: the main stage for psytrance and progressive, the Dome for downtempo and psybient, Pumpui for techno and house, plus Dragon Nest and Ambyss for live bands and atmospheric soundscapes.',
        'Among the announced names are Shpongle Live, Hallucinogen, Astrix, Solar Fields and Younger Brother. Check the source link for the full programme and tickets.',
      ],
    },
    {
      id: 'fest-boom', kategori: 'Festivals & parties', emoji: '🌌', grad: G.natt,
      tittel: 'Boom Festival',
      ingress: 'The world’s most famous transformational festival — art, culture and psychedelic music in Portugal.',
      genres: ['festivals', 'psytrance', 'downtempo', 'psybient', 'psychill'], dato: 'Every other year · Portugal', forfatter: 'SiriusFM editorial team',
      kilde: { navn: 'boomfestival.org', url: 'https://www.boomfestival.org/' },
      brodtekst: [
        'Boom Festival in Idanha-a-Nova is held every other year and is, for many, the very definition of a transformational festival — with the Dance Temple, visionary art and a deep camping culture.',
        'Musically Boom covers the whole spectrum from psytrance to downtempo and ambient, and the festival is as known for its environmental and art focus as for its line-up.',
      ],
    },
    {
      id: 'fest-anjunadeep-explorations', kategori: 'Festivals & parties', emoji: '🏝️', grad: G.hav,
      tittel: 'Anjunadeep Explorations 2026',
      ingress: 'Melodic house on the coast in Dhërmi, Albania.',
      genres: ['festivals', 'prog-house', 'house'], dato: 'June 12–17, 2026', forfatter: 'SiriusFM editorial team',
      kilde: { navn: 'anjunadeep.com', url: 'https://anjunadeep.com/' },
      brodtekst: [
        'Anjunadeep Explorations is the label’s own festival, set on the beautiful coast in Dhërmi, Albania. The 2026 edition runs June 12–17.',
        'The line-up is led by names such as Nox Vahn and Eric Luttrell, whose melodic house and progressive sound have become the very soul of the event.',
      ],
    },
    {
      id: 'fest-global-underground', kategori: 'Festivals & parties', emoji: '🌍', grad: G.rosa,
      tittel: 'Global underground: the club network worldwide',
      ingress: 'From Athens to Tbilisi — how to find parties and clubs in the global underground.',
      genres: ['festivals', 'global-underground', 'techno-underground', 'house', 'trance', 'edm'], dato: 'Ongoing', forfatter: 'SiriusFM editorial team',
      kilde: { navn: 'Resident Advisor', url: 'https://ra.co/' },
      brodtekst: [
        'The festivals are the tips of the iceberg — most of the culture lives in clubs and individual parties worldwide. Resident Advisor (RA) is the most widely used overview of events, clubs and artists in the global underground.',
        'Here you will find everything from house and techno to trance and broader EDM, searchable city by city. A great place to start if you want to discover the scene where you are — or where you are heading.',
      ],
    },

    // ─── Visuell kunst ─────────────────────────────────────────────────
    // Psykedelisk/visjonær kunst heng tett saman med scenen (album-cover,
    // festival-kunst, chapel/domekunst) — same krets som Goa/psytrance/
    // transformasjonsfestivalane over. Alle lenker verifisert opne 07.09.2026.
    {
      id: 'kunst-alex-grey-cosm', kategori: 'Visual art', emoji: '👁️', grad: G.lilla,
      tittel: 'Alex Grey and the Chapel of Sacred Mirrors',
      ingress: 'The visionary artist behind the Sacred Mirrors — and the sanctuary he and Allyson Grey built around them.',
      genres: ['psychill', 'psybient', 'goa', 'psytrance'], dato: 'Ongoing', forfatter: 'SiriusFM editorial team',
      kilde: { navn: 'alexgrey.com', url: 'https://www.alexgrey.com/' },
      brodtekst: [
        'Alex Grey is one of the most recognizable names in visionary art: anatomically precise figures overlaid with radiating energy systems, painted with the same reverence a medical illustrator brings to the body and a mystic brings to the spirit. His best-known work, the Sacred Mirrors — 21 paintings made between 1979 and 1988 — remains the centerpiece of his practice.',
        'Together with his wife, artist Allyson Grey, he built the Chapel of Sacred Mirrors (CoSM) to house them: a nonprofit sanctuary in Wappingers Falls, New York, now centered on the Entheon building, open to visitors Friday through Sunday with free admission on First Fridays.',
        'CoSM also runs Full Moon Ceremonies, seasonal Celestial Celebrations and artist residencies — and the Greys regularly bring the work to Burning Man. This visionary-art lineage is the same one that shaped the visual language of Goa and psytrance festival culture worldwide.',
      ],
    },
    {
      id: 'kunst-allyson-grey', kategori: 'Visual art', emoji: '🔺', grad: G.rosa,
      tittel: 'Allyson Grey: Secret Writing, Chaos and Order',
      ingress: 'Co-founder of CoSM — forty years of a visual language built from three root symbols.',
      genres: ['psychill', 'psybient', 'goa'], dato: 'Ongoing', forfatter: 'SiriusFM editorial team',
      kilde: { navn: 'allysongrey.com', url: 'https://www.allysongrey.com/' },
      brodtekst: [
        'Allyson Grey co-founded the Chapel of Sacred Mirrors alongside Alex Grey, but her own painting practice stands on its own: a personal symbolic language built from three recurring elements — Chaos, Order, and Secret Writing.',
        '"Secret Writing" is a set of twenty unpronounceable letters she describes as a language of pure spirit, a window through which invisible thought becomes physically manifest. "Chaos" and "Order" are her visual counterweights — entropic, spontaneous fields set against precise, mandala-like grids.',
        'She has worked the same three-part vocabulary for four decades, making her one of the clearest examples of a visionary artist building an entire cosmology from a small, disciplined set of symbols.',
      ],
    },
    {
      id: 'kunst-amanda-sage', kategori: 'Visual art', emoji: '🌌', grad: G.hav,
      tittel: 'Amanda Sage: glazing light into the canvas',
      ingress: 'A Vienna-school-influenced visionary painter — and one of the scene\'s most active teachers.',
      genres: ['psychill', 'psybient', 'downtempo', 'goa'], dato: 'Ongoing', forfatter: 'SiriusFM editorial team',
      kilde: { navn: 'amandasage.com', url: 'https://www.amandasage.com/' },
      brodtekst: [
        'Amanda Sage paints at the intersection of humanity, nature and the cosmos, using a glazing technique — thin, translucent layers of paint built up one on top of another — to give her figures the glowing, otherworldly quality the visionary-art scene is known for.',
        'Her body of work spans close to three decades, alongside live-painting performances and collaborations at festivals and galleries connected to CoSM, Burning Man and the Vienna School of Fantastic Realism.',
        'She is also one of the scene\'s most active teachers, running regular painting workshops that pass the visionary technique on to a new generation of artists.',
      ],
    },
    {
      id: 'kunst-android-jones', kategori: 'Visual art', emoji: '🖥️', grad: G.natt,
      tittel: 'Android Jones: visionary art goes digital',
      ingress: 'From album covers to full VR domes — psychedelic visionary art built with a tablet instead of a brush.',
      genres: ['psytrance', 'psybient', 'goa', 'edm'], dato: 'Ongoing', forfatter: 'SiriusFM editorial team',
      kilde: { navn: 'androidjones.com', url: 'https://androidjones.com/' },
      brodtekst: [
        'Android Jones took the visionary-art tradition of Alex Grey and Amanda Sage and moved it onto a screen: densely detailed digital paintings, built in series like Dreamscapes, Hyperdigital and Electromineral, that push the same themes of consciousness and cosmic unity into a fully digital medium.',
        'His work regularly ends up on festival stages and album covers across the psytrance and psybient world, and he has taken the format further with immersive VR and dome-projection pieces designed to be experienced from the inside.',
        'His prints, tapestries and hologram art are sold directly through his own site — one of the clearer examples of a visionary artist building an independent, festival-scene business around the work.',
      ],
    },
    {
      id: 'kunst-chris-dyer', kategori: 'Visual art', emoji: '🛹', grad: G.grønn,
      tittel: 'Chris Dyer: bridging skate art and visionary art',
      ingress: 'Positive Creations — murals, skateboards and psychedelic fine art from the same hand.',
      genres: ['psytrance', 'goa', 'techno-underground'], dato: 'Ongoing', forfatter: 'SiriusFM editorial team',
      kilde: { navn: 'positivecreations.ca', url: 'https://positivecreations.ca/' },
      brodtekst: [
        'Chris Dyer is a Peruvian-Canadian artist who works across three scenes usually kept apart: street art, skateboard graphics and visionary psychedelic painting — murals, decks, album covers and gallery canvases built from the same colorful, symbol-dense visual language.',
        'His recurring themes are consciousness, unity and kindness, delivered with a playful, cartoon-adjacent edge that sets him apart from the more solemn end of visionary art.',
        'His 2024 art book "Shamanic Journey" collects work from 2011 to 2023, and his own site, Positive Creations, sells prints and clothing alongside a podcast and a travel-vlog series documenting murals painted around the world.',
      ],
    },
  ];

  const byId = (id) => MAGAZINE.find(a => a.id === id);

  let _genre = 'alle';

  // ── Visning: listevisning ────────────────────────────────────────────
  // Hver sjanger-fane har sin egen delbare URL:
  //   Alle      → #/magazine
  //   <sjanger> → #/magazine/sjanger/<key>
  function genreHref(key) {
    return (!key || key === 'alle') ? '#/magazine' : '#/magazine/sjanger/' + key;
  }
  function _chipsHTML() {
    const all = [{ key: 'alle', label: 'All' }].concat(GENRES);
    return all.map(g =>
      `<a class="mag-chip${g.key === _genre ? ' active' : ''}" data-g="${g.key}"
        href="${genreHref(g.key)}">${esc(g.label)}</a>`
    ).join('');
  }

  function _card(a) {
    return `
      <a class="mag-card" href="#/magazine/${esc(a.id)}">
        <div class="mag-card-art" style="background:${a.grad}">
          <span class="mag-card-emoji">${a.emoji}</span>
          <span class="mag-card-cat">${esc(a.kategori)}</span>
        </div>
        <div class="mag-card-body">
          <div class="mag-card-title notranslate">${esc(a.tittel)}</div>
          <div class="mag-card-ingress">${esc(a.ingress)}</div>
          <div class="mag-card-meta">
            <span>${esc(a.dato)}</span>
            <span class="mag-card-cta">Read →</span>
          </div>
        </div>
      </a>`;
  }

  function _sectionsHTML() {
    let html = '';
    for (const kat of KATEGORIER) {
      const items = MAGAZINE.filter(a =>
        a.kategori === kat && (_genre === 'alle' || (a.genres || []).includes(_genre))
      );
      if (!items.length) continue;
      html += `
        <div class="mag-section">
          <div class="mag-section-head">${Icon(KAT_IKON[kat] || 'disc')} <span>${esc(kat)}</span></div>
          <div class="mag-grid">${items.map(_card).join('')}</div>
        </div>`;
    }
    return html || `<div class="mag-empty">No stories in this genre yet.</div>`;
  }

  function _listHTML() {
    return `
      <div class="mag-page">
        <div class="mag-hero">
          <div class="mag-hero-badge">${Icon('sparkles')} SiriusFM Magazine</div>
          <h1 class="mag-hero-title notranslate">Magazine</h1>
          <p class="mag-hero-sub">Interviews, new releases, labels and festivals from the
            electronic scene around the world — psychill, psytrance, techno underground, psybient,
            house, trance, dub, goa and downtempo.</p>
        </div>
        <div class="mag-chips">${_chipsHTML()}</div>
        <div id="mag-live"></div>
        <div id="mag-sections">${_sectionsHTML()}</div>
      </div>`;
  }

  // ── Visning: lese-side ───────────────────────────────────────────────
  function _articleHTML(id) {
    const a = byId(id);
    if (!a) {
      return `
        <div class="mag-page">
          <a class="mag-back" href="#/magazine">← Back to the magazine</a>
          <div class="mag-empty">Could not find this story.</div>
        </div>`;
    }
    const tags = (a.genres || []).map(g => `<span class="mag-tag">${esc(genreLabel(g))}</span>`).join('');
    const body = (a.brodtekst || []).map(p => `<p>${esc(p)}</p>`).join('');
    return `
      <div class="mag-page">
        <a class="mag-back" href="#/magazine">← Back to the magazine</a>
        <div class="mag-article">
          <div class="mag-article-hero" style="background:${a.grad}">
            <span class="mag-article-emoji">${a.emoji}</span>
          </div>
          <div class="mag-article-cat">${esc(a.kategori)} · ${esc(a.dato)} · ${esc(a.forfatter)}</div>
          <h1 class="mag-article-title notranslate">${esc(a.tittel)}</h1>
          <p class="mag-article-ingress">${esc(a.ingress)}</p>
          <div class="mag-article-tags">${tags}</div>
          <div class="mag-article-body">${body}</div>
          <div class="mag-article-ai">
            <button class="mag-ai-btn" onclick="Magazine.askCore('${esc(a.id)}')">
              ${Icon('sparkles')} Ask Core about this story
            </button>
            <div id="mag-ai-out" class="mag-ai-out"></div>
          </div>
          <div class="mag-article-source">
            Source: <a class="notranslate" href="${esc(a.kilde.url)}" target="_blank" rel="noopener">${esc(a.kilde.navn)} ↗</a>
          </div>
        </div>
      </div>`;
  }

  // ── Live AI-saker (Fase 2): hentes fra /api/magazine via AIFresh ──────
  // AIFresh henter en shortliste på inntil 8 ferske saker per sjanger og roterer
  // utvalget hver halvtime, samme takt som forsidens AI-radio. Se js/aifresh.js.
  function _loadLive(genre) {
    if (typeof AIFresh === 'undefined') return;
    AIFresh.reset();  // gammel fane skal ikke rotere videre i bakgrunnen
    AIFresh.mount({
      id: 'mag-live',
      genre: genre || 'alle',
      title: 'Fresh from the web',
      limit: 4,
    });
  }

  // ── Interaksjon ──────────────────────────────────────────────────────
  // Beholdes for bakoverkompatibilitet / programmatiske kall: navigerer til
  // sjangerens egen URL, så ruteren gjør selve filtreringen og rendringen.
  function filterGenre(key) {
    window.location.hash = genreHref(key);
  }

  // Valgfritt AI-sammendrag via eksisterende /api/chat (gratis Haiku).
  async function askCore(id) {
    const a = byId(id);
    const out = document.getElementById('mag-ai-out');
    if (!a || !out) return;
    out.textContent = 'Core is thinking …';
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: 'You are Core, a knowledgeable and friendly music editor at SiriusFM. ' +
                  'Answer briefly and in plain, easy-to-understand English, max 120 words.',
          messages: [{
            role: 'user',
            content: 'Give a short, easy-to-read summary of this story for a reader:\n\n' +
                     'Title: ' + a.tittel + '\nGenre: ' + (a.genres || []).map(genreLabel).join(', ') +
                     '\n\n' + (a.brodtekst || []).join('\n\n'),
          }],
          max_tokens: 400,
          model: 'claude-haiku-4-5-20251001',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || ('HTTP ' + res.status));
      out.textContent = (data.text || '').trim() || 'Core had nothing to add right now.';
    } catch (e) {
      out.textContent = 'Could not fetch an AI summary right now. Please try again later.';
    }
  }

  // ── Inngang ──────────────────────────────────────────────────────────
  function render(id) {
    const app = document.getElementById('app');
    if (!app) return;
    if (id) {
      app.innerHTML = _articleHTML(id);
      window.scrollTo(0, 0);
    } else {
      app.innerHTML = _listHTML();
      _loadLive(_genre);
    }
  }

  // Listevisning for én sjanger-fane (egen URL: #/magazine/sjanger/<genre>).
  // Ukjent/utelatt sjanger faller tilbake til «Alle».
  function renderGenre(genre) {
    _genre = (genre && GENRES.some(g => g.key === genre)) ? genre : 'alle';
    const app = document.getElementById('app');
    if (!app) return;
    app.innerHTML = _listHTML();
    window.scrollTo(0, 0);
    _loadLive(_genre);
  }

  return { render, renderGenre, filterGenre, genreHref, askCore };
})();
