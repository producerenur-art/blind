// Magasin — redaksjonelt magasin for den elektroniske musikkscenen.
// Intervjuer · nye utgivelser · plateselskaper · festivaler & fester, verden over.
// Fase 1: kuratert innhold (under). Fase 2 (senere): live AI-nettsøk via /api/magazine.
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
    { key: 'psybient',          label: 'Psybient' },
    { key: 'psytrance',         label: 'Psytrance' },
    { key: 'goa',               label: 'Goa' },
    { key: 'prog-psy',          label: 'Progressiv psytrance' },
    { key: 'trance',            label: 'Trance' },
    { key: 'house',             label: 'House' },
    { key: 'prog-house',        label: 'Progressive house' },
    { key: 'edm',               label: 'EDM' },
    { key: 'dub',               label: 'Dub' },
    { key: 'downtempo',         label: 'Downtempo' },
    { key: 'chillout',          label: 'Chill out' },
    { key: 'global-underground',label: 'Global underground' },
  ];
  const genreLabel = (k) => (GENRES.find(g => g.key === k) || {}).label || k;

  // Seksjoner, i visningsrekkefølge.
  const KATEGORIER = ['Forsidesak', 'Intervjuer', 'Nye utgivelser', 'Plateselskaper', 'Festivaler & fester'];
  const KAT_IKON = {
    'Forsidesak': 'star', 'Intervjuer': 'message', 'Nye utgivelser': 'disc',
    'Plateselskaper': 'music', 'Festivaler & fester': 'calendar',
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
      id: 'posford-psybient-arven', kategori: 'Forsidesak', emoji: '🍄', grad: G.lilla,
      tittel: 'Psybient-arven: fra Hallucinogen til Shpongle',
      ingress: 'Hvordan én produsent var med på å forme både psytrancen og den drømmende psybienten.',
      genres: ['psybient', 'psytrance', 'dub'], dato: 'Juni 2026', forfatter: 'SoundCore-redaksjonen',
      kilde: { navn: 'Wikipedia — Simon Posford', url: 'https://en.wikipedia.org/wiki/Simon_Posford' },
      brodtekst: [
        'Få navn er like sentrale i den psykedeliske elektroniske musikken som Simon Posford. Under aliaset Hallucinogen formet han på 1990-tallet en hel generasjon goa- og psytrance-produsenter, før han med Shpongle (sammen med Raja Ram) åpnet døra mot det vi i dag kaller psybient — sakte, filmatisk og full av detaljer.',
        'Skillet mellom dansegulv og chill-rom har aldri vært skarpt i denne scenen. Da Hallucinogen ga ut «In Dub» i 2002 — remikset av Ott — ble psytrance-strukturer smeltet sammen med dub, og psydub-begrepet fikk for alvor fotfeste.',
        'I dag dukker Shpongle Live fortsatt opp på de store transformasjonsfestivalene, og arven lever videre i alt fra dype downtempo-utgivelser til forest-psytrance. Denne saken er et utgangspunkt — bruk sjangerfiltrene over for å grave dypere.',
      ],
    },
    {
      id: 'goa-lever-videre', kategori: 'Forsidesak', emoji: '🕉️', grad: G.sol,
      tittel: 'Goa-trancen som aldri døde',
      ingress: 'Mens full-on overtok dansegulvene, holdt en liten gruppe ildsjeler den melodiske goa-lyden i live.',
      genres: ['goa', 'trance', 'psytrance'], dato: 'Juni 2026', forfatter: 'SoundCore-redaksjonen',
      kilde: { navn: 'Suntrip Records', url: 'https://www.suntriprecords.com/' },
      brodtekst: [
        'Goa trance ble født på strendene i India og spredte seg utover på 1990-tallet, før den moderne full-on-stilen tok over mye av oppmerksomheten. Men den melodiske, syrete goa-lyden forsvant aldri helt.',
        'Det belgiske selskapet Suntrip Records, grunnlagt i 2004, ble selve fanebæreren for goa-revival — med over 80 utgivelser og artister som Filteria, Mindsphere og Astral Projection i katalogen.',
        'Resultatet er en levende undergrunn der nye produsenter henter fram de lange, hypnotiske melodilinjene fra goaens gullalder, side om side med klassikerne.',
      ],
    },

    // ─── Intervjuer ────────────────────────────────────────────────────
    {
      id: 'intervju-ott', kategori: 'Intervjuer', emoji: '🎚️', grad: G.hav,
      tittel: 'Ott om psydub og studiohåndverket',
      ingress: 'Mannen bak «Blumenkraft» og «Hiraeth» har formet psydub-lyden i over to tiår.',
      genres: ['dub', 'downtempo', 'psybient'], dato: 'Mai 2026', forfatter: 'SoundCore-redaksjonen',
      kilde: { navn: 'psybient.org — intervju med Ott', url: 'https://www.psybient.org/love/interview-with-ott-2020/' },
      brodtekst: [
        'Ott (Otteran Langrell) har jobbet med alt fra Sinéad O’Connor og The Orb til Brian Eno og Simon Posford. Det var nettopp samarbeidet med Posford — Hallucinogens «In Dub» i 2002 — som ble en av de tydeligste tidlige eksemplene på psydub.',
        'Siden har han bygd et eget univers gjennom album som «Blumenkraft» og «Skylon» på Twisted Records, og senere «Mir», «Fairchildren», «Heads» og «Hiraeth» på sitt eget Ottsonic.',
        'I intervjuet hos psybient.org snakker han om studioarbeidet, miksing og hvorfor han bygger lyden lag på lag. Les hele samtalen via kildelenken nederst.',
      ],
    },
    {
      id: 'intervju-psychill-arkiv', kategori: 'Intervjuer', emoji: '🌀', grad: G.natt,
      tittel: 'Inn i psychill-scenen — intervjuarkivet',
      ingress: 'Et helt arkiv med samtaler med artister fra downtempo-, psybient- og psychill-miljøet.',
      genres: ['psybient', 'chillout', 'downtempo'], dato: 'Løpende', forfatter: 'SoundCore-redaksjonen',
      kilde: { navn: 'psybient.org — intervjuer', url: 'https://www.psybient.org/love/category/articles/interviews/' },
      brodtekst: [
        'For deg som vil høre artistene fortelle med egne ord, er psybient.org en gullgruve. Nettstedet har et eget intervjuarkiv med samtaler på tvers av psychill, psybient, downtempo og psydub.',
        'Her finner du både etablerte navn og nye produsenter — ofte med praktiske innblikk i studiooppsett, inspirasjon og hvordan en utgivelse blir til.',
        'Bruk kildelenken for å bla i hele arkivet.',
      ],
    },
    {
      id: 'anjunadeep-portrett', kategori: 'Intervjuer', emoji: '🌊', grad: G.hav,
      tittel: 'Anjunadeep: melodisk house med britisk presisjon',
      ingress: 'James Grant og Jody Wisternoff har gjort dyp, melodisk house til en global lyd.',
      genres: ['prog-house', 'house', 'chillout'], dato: 'Februar 2026', forfatter: 'SoundCore-redaksjonen',
      kilde: { navn: 'Anjunadeep — about', url: 'https://anjunadeep.com/about' },
      brodtekst: [
        'Anjunadeep vokste ut av London-selskapet Anjunabeats og er i dag et tyngdepunkt for dyp og melodisk house verden over. Kuratorduoen James Grant og Jody Wisternoff står bak den årlige «Anjunadeep»-samleserien.',
        'Lyden balanserer det varme og det dansbare — like hjemme i et chill-rom som på et nattklubbgulv ved soloppgang.',
        'Vil du dykke ned i historien og filosofien bak selskapet? Start hos kilden under.',
      ],
    },

    // ─── Nye utgivelser ────────────────────────────────────────────────
    {
      id: 'anjunadeep-16', kategori: 'Nye utgivelser', emoji: '💿', grad: G.hav,
      tittel: 'Anjunadeep 16 — James Grant & Jody Wisternoff',
      ingress: 'Den seksten utgaven av samleserien, sluppet februar 2026.',
      genres: ['prog-house', 'house', 'chillout'], dato: 'Februar 2026', forfatter: 'SoundCore-redaksjonen',
      kilde: { navn: 'Anjunadeep 16 (Bandcamp)', url: 'https://anjunadeep.bandcamp.com/album/anjunadeep-16' },
      brodtekst: [
        '«Anjunadeep 16» samler et bredt utvalg melodisk house og downtempo over to nøye satte mikser, med spor fra Anjunadeep-, Anjunachill- og Explorations-katalogene.',
        'Som tidligere i serien er det en god inngangsport for deg som vil bli kjent med selskapets lyd — fra det dvelende til det dansbare.',
      ],
    },
    {
      id: 'aes-dana-perimeters', kategori: 'Nye utgivelser', emoji: '🌫️', grad: G.natt,
      tittel: 'Aes Dana — Perimeters (Remaster 2025)',
      ingress: 'Ultimae børster støvet av en downtempo-klassiker.',
      genres: ['psybient', 'downtempo', 'chillout'], dato: 'Januar 2026', forfatter: 'SoundCore-redaksjonen',
      kilde: { navn: 'Ultimae Records', url: 'https://ultimae.com/' },
      brodtekst: [
        'Lyon-baserte Ultimae Records har de siste sesongene remastret flere av sine klassikere, blant dem «Perimeters» av Aes Dana — et av selskapets sentrale downtempo-/psybient-verk.',
        'Remastringen gir den drømmende, lagdelte lyden ny tydelighet uten å miste den varme, organiske karakteren Ultimae er kjent for.',
      ],
    },
    {
      id: 'ott-hiraeth', kategori: 'Nye utgivelser', emoji: '🎛️', grad: G.grønn,
      tittel: 'Ott — Hiraeth',
      ingress: 'Nytt album fra psydub-mesteren på eget Ottsonic.',
      genres: ['dub', 'downtempo'], dato: '2024', forfatter: 'SoundCore-redaksjonen',
      kilde: { navn: 'Ott (Bandcamp)', url: 'https://ott.bandcamp.com/' },
      brodtekst: [
        '«Hiraeth» er nok et finslepet kapittel i Otts katalog — tette, basstunge lag av dub og downtempo med den karakteristiske, håndlagde lydsignaturen hans.',
        'Som vanlig er det like mye et lyttealbum som dansemusikk: detaljer som først åpner seg etter flere gjennomlyttinger.',
      ],
    },
    {
      id: 'psybient-manedens', kategori: 'Nye utgivelser', emoji: '🗓️', grad: G.lilla,
      tittel: 'Månedens utgivelser hos psybient.org',
      ingress: 'En oppdatert oversikt over ferske utgivelser i psychill-universet.',
      genres: ['psybient', 'downtempo', 'chillout'], dato: 'Oppdateres månedlig', forfatter: 'SoundCore-redaksjonen',
      kilde: { navn: 'psybient.org — releases', url: 'https://www.psybient.org/love/march-2026-releases/' },
      brodtekst: [
        'Vil du holde deg oppdatert på det som faktisk slippes akkurat nå, samler psybient.org månedlige oversikter over nye utgivelser innen psychill, psybient, psydub og downtempo.',
        'Det er den raskeste måten å oppdage nye artister og labels på — bruk kildelenken for den nyeste måneden.',
      ],
    },
    {
      id: 'asot-trance', kategori: 'Nye utgivelser', emoji: '⚡', grad: G.rosa,
      tittel: 'Trance på de store scenene — A State of Trance',
      ingress: 'Der trance og EDM møtes for fullsatte arenaer.',
      genres: ['trance', 'edm'], dato: 'Løpende', forfatter: 'SoundCore-redaksjonen',
      kilde: { navn: 'A State of Trance', url: 'https://www.astateoftrance.com/' },
      brodtekst: [
        'På den lysere, mer arenarettede siden av spekteret står trancen sterkt — med radioshow, samleplater og enorme arrangementer som samler tusenvis.',
        'A State of Trance er et naturlig utgangspunkt for nye singler og sett fra denne delen av scenen, der trance og EDM ofte glir over i hverandre.',
      ],
    },

    // ─── Plateselskaper ────────────────────────────────────────────────
    {
      id: 'label-ultimae', kategori: 'Plateselskaper', emoji: '🌌', grad: G.natt,
      tittel: 'Ultimae Records',
      ingress: 'Lyon-selskapet som har definert europeisk ambient og downtempo.',
      genres: ['psybient', 'downtempo', 'chillout'], dato: 'Lyon, Frankrike', forfatter: 'SoundCore-redaksjonen',
      kilde: { navn: 'ultimae.com', url: 'https://ultimae.com/' },
      brodtekst: [
        'Ultimae Records er plateselskap, forlag, masteringstudio og platebutikk i ett — med base i Lyon. Katalogen er en bauta i ambient og downtempo, med artister som Solar Fields, Aes Dana, Carbon Based Lifeforms og Martin Nonstatic.',
        'Lyden er gjenkjennelig: varm, romlig og filmatisk, bygget for fordypning like mye som for dansegulvet.',
      ],
    },
    {
      id: 'label-cryo-chamber', kategori: 'Plateselskaper', emoji: '🪐', grad: G.skog,
      tittel: 'Cryo Chamber',
      ingress: 'Filmatisk dark ambient drevet av Simon Heath (Atrium Carceri).',
      genres: ['psybient', 'downtempo'], dato: 'Oregon, USA', forfatter: 'SoundCore-redaksjonen',
      kilde: { navn: 'Cryo Chamber (Bandcamp)', url: 'https://cryochamber.bandcamp.com/' },
      brodtekst: [
        'Cryo Chamber drives av Simon Heath, mannen bak Atrium Carceri, og har spesialisert seg på dark ambient med en filmatisk, kvalitetsbevisst kant.',
        'Selskapet er kjent for sine store kollaborasjonsalbum, der flere artister bygger ett sammenhengende, mørkt lydlandskap.',
      ],
    },
    {
      id: 'label-iboga', kategori: 'Plateselskaper', emoji: '🔊', grad: G.grønn,
      tittel: 'Iboga Records',
      ingress: 'Fra Københavns undergrunn til global progressiv kraftstasjon.',
      genres: ['prog-psy', 'prog-house', 'psytrance'], dato: 'København, Danmark', forfatter: 'SoundCore-redaksjonen',
      kilde: { navn: 'Iboga Records', url: 'https://www.iboga-records.com/' },
      brodtekst: [
        'Iboga Records startet i Københavns undergrunn og vokste til et av de mest kjente selskapene for progressiv psytrance og progressive house.',
        'Beatportal kåret selskapet til «Label of the Month» i august 2025 — en bekreftelse på den fortsatte innflytelsen i den progressive scenen.',
      ],
    },
    {
      id: 'label-suntrip', kategori: 'Plateselskaper', emoji: '☀️', grad: G.sol,
      tittel: 'Suntrip Records',
      ingress: 'Verdens ledende selskap for melodisk goa trance.',
      genres: ['goa', 'trance'], dato: 'Belgia', forfatter: 'SoundCore-redaksjonen',
      kilde: { navn: 'suntriprecords.com', url: 'https://www.suntriprecords.com/' },
      brodtekst: [
        'Suntrip Records ble grunnlagt i 2004 av Fabien «Mars» Marsaud og Joske «Anoebis» Vranken som et alternativ til moderne full-on — med fokus på den melodiske, syrete goa-lyden.',
        'Med over 80 utgivelser og navn som Filteria, Mindsphere og Astral Projection er selskapet blitt selve referansen for goa-revival.',
      ],
    },
    {
      id: 'label-anjunadeep', kategori: 'Plateselskaper', emoji: '🌊', grad: G.hav,
      tittel: 'Anjunadeep',
      ingress: 'London-selskapet bak en av verdens mest kjente deep/melodisk house-lyder.',
      genres: ['prog-house', 'house'], dato: 'London, Storbritannia', forfatter: 'SoundCore-redaksjonen',
      kilde: { navn: 'anjunadeep.com', url: 'https://anjunadeep.com/' },
      brodtekst: [
        'Anjunadeep er den dypere, mer atmosfæriske grenen av Anjuna-familien. Selskapet har bygd et globalt publikum rundt melodisk house, deep house og downtempo.',
        'I tillegg til platene driver selskapet egne arrangementer og samleserier som har blitt referansepunkter for sjangeren.',
      ],
    },

    // ─── Festivaler & fester ───────────────────────────────────────────
    {
      id: 'fest-ozora', kategori: 'Festivaler & fester', emoji: '🔥', grad: G.ild,
      tittel: 'OZORA Festival 2026',
      ingress: 'Dádpuszta i Ungarn fylles igjen — fra psytrance på hovedscenen til psybient i Dome.',
      genres: ['psytrance', 'psybient', 'house', 'downtempo'], dato: '24. juli – 4. august 2026', forfatter: 'SoundCore-redaksjonen',
      kilde: { navn: 'ozorafestival.eu', url: 'https://ozorafestival.eu/' },
      brodtekst: [
        'OZORA er en av Europas største psykedeliske festivaler, holdt i Dádpuszta sørvest for Budapest. Utgaven i 2026 går av stabelen 24. juli – 4. august, med åpningsseremoni 27. juli.',
        'Programmet spenner over flere scener: hovedscenen for psytrance og progressive, Dome for downtempo og psybient, Pumpui for techno og house, samt Dragon Nest og Ambyss for liveband og atmosfæriske lydlandskap.',
        'Blant de annonserte navnene finner du Shpongle Live, Hallucinogen, Astrix, Solar Fields og Younger Brother. Sjekk kildelenken for fullt program og billetter.',
      ],
    },
    {
      id: 'fest-boom', kategori: 'Festivaler & fester', emoji: '🌌', grad: G.natt,
      tittel: 'Boom Festival',
      ingress: 'Verdens mest kjente transformasjonsfestival — kunst, kultur og psykedelisk musikk i Portugal.',
      genres: ['psytrance', 'downtempo', 'psybient'], dato: 'Annethvert år · Portugal', forfatter: 'SoundCore-redaksjonen',
      kilde: { navn: 'boomfestival.org', url: 'https://www.boomfestival.org/' },
      brodtekst: [
        'Boom Festival i Idanha-a-Nova arrangeres annethvert år og er for mange selve definisjonen på en transformasjonsfestival — med Dance Temple, visjonær kunst og en dyp campingkultur.',
        'Musikalsk dekker Boom hele spekteret fra psytrance til downtempo og ambient, og festivalen er like kjent for sitt miljø- og kunstfokus som for line-upen.',
      ],
    },
    {
      id: 'fest-anjunadeep-explorations', kategori: 'Festivaler & fester', emoji: '🏝️', grad: G.hav,
      tittel: 'Anjunadeep Explorations 2026',
      ingress: 'Melodisk house ved kysten i Dhërmi, Albania.',
      genres: ['prog-house', 'house'], dato: '12. – 17. juni 2026', forfatter: 'SoundCore-redaksjonen',
      kilde: { navn: 'anjunadeep.com', url: 'https://anjunadeep.com/' },
      brodtekst: [
        'Anjunadeep Explorations er selskapets egen festival, lagt til den vakre kysten i Dhërmi i Albania. Utgaven i 2026 går 12.–17. juni.',
        'Line-upen ledes av navn som Nox Vahn og Eric Luttrell, hvis melodiske house og progressive lyd er blitt selve sjelen i arrangementet.',
      ],
    },
    {
      id: 'fest-global-underground', kategori: 'Festivaler & fester', emoji: '🌍', grad: G.rosa,
      tittel: 'Global underground: klubbnettet verden over',
      ingress: 'Fra Athen til Tbilisi — slik finner du fester og klubber i den globale undergrunnen.',
      genres: ['global-underground', 'house', 'trance', 'edm'], dato: 'Løpende', forfatter: 'SoundCore-redaksjonen',
      kilde: { navn: 'Resident Advisor', url: 'https://ra.co/' },
      brodtekst: [
        'Festivalene er toppene av isfjellet — det meste av kulturen lever i klubber og enkeltfester verden over. Resident Advisor (RA) er den mest brukte oversikten over arrangementer, klubber og artister i den globale undergrunnen.',
        'Her finner du alt fra house og techno til trance og bredere EDM, søkbart by for by. Et godt sted å starte hvis du vil oppdage scenen der du er — eller der du skal reise.',
      ],
    },
  ];

  const byId = (id) => MAGAZINE.find(a => a.id === id);

  let _genre = 'alle';
  let _liveSeq = 0;   // ignorerer utdaterte live-svar når brukeren bytter sjanger

  // ── Visning: listevisning ────────────────────────────────────────────
  function _chipsHTML() {
    const all = [{ key: 'alle', label: 'Alle' }].concat(GENRES);
    return all.map(g =>
      `<button class="mag-chip${g.key === _genre ? ' active' : ''}" data-g="${g.key}"
        onclick="Magazine.filterGenre('${g.key}')">${esc(g.label)}</button>`
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
            <span class="mag-card-cta">Les →</span>
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
    return html || `<div class="mag-empty">Ingen saker i denne sjangeren ennå.</div>`;
  }

  function _listHTML() {
    return `
      <div class="mag-page">
        <div class="mag-hero">
          <div class="mag-hero-badge">${Icon('sparkles')} SoundCore Magasin</div>
          <h1 class="mag-hero-title notranslate">Magasin</h1>
          <p class="mag-hero-sub">Intervjuer, nye utgivelser, plateselskaper og festivaler fra den
            elektroniske scenen verden over — psybient, psytrance, house, trance, dub, goa og downtempo.</p>
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
          <a class="mag-back" href="#/magazine">← Tilbake til magasinet</a>
          <div class="mag-empty">Fant ikke denne saken.</div>
        </div>`;
    }
    const tags = (a.genres || []).map(g => `<span class="mag-tag">${esc(genreLabel(g))}</span>`).join('');
    const body = (a.brodtekst || []).map(p => `<p>${esc(p)}</p>`).join('');
    return `
      <div class="mag-page">
        <a class="mag-back" href="#/magazine">← Tilbake til magasinet</a>
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
              ${Icon('sparkles')} Spør Core om denne saken
            </button>
            <div id="mag-ai-out" class="mag-ai-out"></div>
          </div>
          <div class="mag-article-source">
            Kilde: <a class="notranslate" href="${esc(a.kilde.url)}" target="_blank" rel="noopener">${esc(a.kilde.navn)} ↗</a>
          </div>
        </div>
      </div>`;
  }

  // ── Live AI-saker (Fase 2): hentes fra /api/magazine, flettes inn øverst ──
  function _liveCard(a) {
    return `
      <a class="mag-card mag-card--live" href="${esc(a.kilde.url)}" target="_blank" rel="noopener">
        <div class="mag-card-art" style="background:linear-gradient(135deg,#0a2540,#11324f,#0d3a5e)">
          <span class="mag-card-emoji">🛰️</span>
          <span class="mag-card-cat">Fersk fra nettet</span>
        </div>
        <div class="mag-card-body">
          <div class="mag-card-title notranslate">${esc(a.tittel)}</div>
          <div class="mag-card-ingress">${esc(a.ingress)}</div>
          <div class="mag-card-meta">
            <span class="notranslate">${esc(a.kilde.navn || 'Kilde')}</span>
            <span class="mag-card-cta">Åpne ↗</span>
          </div>
        </div>
      </a>`;
  }

  async function _loadLive(genre) {
    const box = document.getElementById('mag-live');
    if (!box) return;
    const seq = ++_liveSeq;
    box.style.display = '';
    box.innerHTML = `
      <div class="mag-section">
        <div class="mag-section-head">${Icon('sparkles')} <span>Fersk fra nettet</span></div>
        <div style="color:var(--text3);padding:0.5rem 0 1rem;font-size:0.85rem">Henter ferske saker fra nettet …</div>
      </div>`;
    try {
      const r = await fetch('/api/magazine?genre=' + encodeURIComponent(genre || 'alle'));
      const data = await r.json().catch(() => ({}));
      if (seq !== _liveSeq) return; // bruker byttet sjanger imens
      const arts = (data && data.articles) || [];
      if (!arts.length) { box.style.display = 'none'; box.innerHTML = ''; return; }
      box.innerHTML = `
        <div class="mag-section">
          <div class="mag-section-head">${Icon('sparkles')} <span>Fersk fra nettet</span></div>
          <div class="mag-grid">${arts.map(_liveCard).join('')}</div>
        </div>`;
    } catch (e) {
      if (seq !== _liveSeq) return;
      box.style.display = 'none'; box.innerHTML = '';
    }
  }

  // ── Interaksjon ──────────────────────────────────────────────────────
  function filterGenre(key) {
    _genre = key;
    const body = document.getElementById('mag-sections');
    if (body) body.innerHTML = _sectionsHTML();
    document.querySelectorAll('.mag-chip').forEach(el =>
      el.classList.toggle('active', el.dataset.g === key));
    _loadLive(key);
  }

  // Valgfritt AI-sammendrag via eksisterende /api/chat (gratis Haiku).
  async function askCore(id) {
    const a = byId(id);
    const out = document.getElementById('mag-ai-out');
    if (!a || !out) return;
    out.textContent = 'Core tenker …';
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system: 'Du er Core, en kunnskapsrik og vennlig musikkredaktør i SoundCore. ' +
                  'Svar kort og lett å forstå på norsk bokmål, maks 120 ord.',
          messages: [{
            role: 'user',
            content: 'Gi et kort, lettlest sammendrag av denne saken for en leser:\n\n' +
                     'Tittel: ' + a.tittel + '\nSjanger: ' + (a.genres || []).map(genreLabel).join(', ') +
                     '\n\n' + (a.brodtekst || []).join('\n\n'),
          }],
          max_tokens: 400,
          model: 'claude-haiku-4-5-20251001',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || ('HTTP ' + res.status));
      out.textContent = (data.text || '').trim() || 'Core hadde ikke noe å legge til akkurat nå.';
    } catch (e) {
      out.textContent = 'Kunne ikke hente AI-sammendrag akkurat nå. Prøv igjen senere.';
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

  return { render, filterGenre, askCore };
})();
