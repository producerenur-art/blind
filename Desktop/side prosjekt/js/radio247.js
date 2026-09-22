// Radio247 — "🌘 24-Hour Cycle": ett kontinuerlig døgnstyrt kanal-kort på
// /radio-sida, atskilt fra dei vanlege sjanger-fanene og frå radiOzora sitt
// eige "SiriusFM Main station"-kort (den røres ikke). Sjangeren den spelar
// følger ei fast, symmetrisk døgnkurve i norsk tid (Europe/Oslo):
//   natt-topp (Techno) → Psytrance/Goa → Progressive → Dark Drone (botn,
//   tidleg) → Ambient Mann (fast 1t, 05-06) → Psybient/Ambient (dag) →
//   Downtempo/Psychill → Progressive → Psytrance/Goa → topp igjen.
// Alle blokkene bruker ekte lyd-strøymar frå STATIONS (js/radio.js) — ingen
// video, rein lytting akkurat som alle andre radiokanalar på sida.
// 05–06: fast 1-timarsplass for Ambient Mann (eiga 24/7 AzuraCast-sending,
// radio.ambientmann.com) — krysspromotering, ikkje ein del av sjølve
// Dark Drone-rotasjonen, sjå AMBIENT_MANN_IDS/NAME_BY_ID under (lagt til
// 21.09.2026, brukarønske).
const Radio247 = (() => {
  // [start, end) i norsk lokaltid, 24-timars klokke (desimaltimar). Må
  // dekke heile 0–24 utan hol.
  // NB: fleire station-id-ar vart plukka bort 11.09.2026 etter ein live CORS-feil
  // — technolovers.fm/epic-lounge/epic-piano/piratefm/mixlive/chilloutzone-lautfm
  // omdirigerer alle til eit anna opphav der FØRSTE hopp (omdirigeringssvaret,
  // ikkje sluttmålet) manglar Access-Control-Allow-Origin. Nettlesaren blokkerer
  // heile kjeda uansett kva sluttmålet sender — stadfesta med curl + reell
  // avspeling. Sjå api/radio-healthcheck.js for framtidige kandidatar; berre
  // legg til ein ny id her viss du har stadfesta at HEILE kjeda (ikkje berre
  // sluttmålet) har CORS, eller at URL-en ikkje omdirigerer i det heile.
  const GOA_IDS         = ['dmtfm', 'psyndora', 'babaganousha', 'jointil-beattrance', 'record-goa-psy', 'goanight'];
  const PROGRESSIVE_IDS = ['trancearound', 'atr', 'rr-progressive', 'record-trancemission', 'dfm-avb'];
  const DARK_DRONE_IDS  = ['ambient-abyss', 'dark-city-signal', 'systrum-ssr1', 'indiebeat-ambient', 'modular-station', 'alswin-ambient'];
  const PSYCHILL_IDS    = ['ambientpsy-1fm', 'multihuman', 'diceradio-psybient', 'paradisehunter-chillout'];
  // smoothchill (icy-genre: Soul) og anon-fm (icy-genre inkluderer rock) fjerna
  // 20.09.2026 — live ICY-metadata stadfesta ikkje-elektronisk innhald,
  // brukarønske: ALDRI rock/metal/hip-hop/R&B i 24/7-hjulet.
  // Brukarønske 22.09.2026: Ambient Mann er no ÒG med i sjølve rotasjons-
  // poolen til Chill Out (12-16) — då kan han rotere inn ein av dagane i
  // den blokka, i tillegg til den faste 05-06-plassen sin under (uendra).
  const CHILLOUT_IDS    = ['1fm-chillout', 'brokenbeats', 'cafedelmar', 'ambient-mann'];
  const TECHNO_IDS      = ['uzic-techno', 'remember-vip-techno'];
  // Eiga fast plass i SCHEDULE 05-06 (utanom denne er han berre éin id, så
  // ingen rotasjon der) — no ÒG med i CHILLOUT_IDS over, så han kan rotere
  // inn i sjølve Chill Out-blokka enkelte dagar (sjå _pickStationId).
  const AMBIENT_MANN_IDS = ['ambient-mann'];

  // Visningsnamn for stasjonane over — same namn som STATIONS i js/radio.js
  // (shortName der han finst, elles name, «.FM»-endinga kutta), men ein
  // bevisst snapshot HER: radio.js kan ikkje krevjast inn server-side (han
  // brukar localStorage/document ved modul-last), så digest-e-posten
  // (api/send-email.js) har ingen annan veg til desse namna. Oppdater begge
  // stader viss ein stasjon sitt namn endrar seg i js/radio.js.
  const NAME_BY_ID = {
    dmtfm: 'DMT FM — Psytrance 24/7', psyndora: 'Psyndora Psytrance',
    babaganousha: 'Babaganousha Radio', 'jointil-beattrance': '#joint radio Beat Trance',
    'record-goa-psy': 'Record Goa Psy', goanight: 'Goanight',
    trancearound: 'TranceAround', atr: 'Amsterdam Trance Radio',
    'rr-progressive': 'Radio Record — Progressive House',
    'record-trancemission': 'Record Trancemission', 'dfm-avb': 'Armin van Buuren',
    'ambient-abyss': 'Ambient Abyss Broadcasting', 'dark-city-signal': 'Dark City Signal',
    'systrum-ssr1': 'Systrum Sistum SSR1', 'indiebeat-ambient': 'The Indie Beat — Ambient',
    'modular-station': 'Modular-Station', 'alswin-ambient': 'Alswin Ambient Music',
    'ambientpsy-1fm': 'Ambient Psychill (1.FM)', multihuman: 'MultiHuman EntheoMusic',
    'diceradio-psybient': 'DiceRadio', 'paradisehunter-chillout': 'Paradisehunter Chillout',
    '1fm-chillout': '1.FM Chillout Lounge', brokenbeats: 'Brokenbeats', cafedelmar: 'Café del Mar',
    'uzic-techno': 'UZIC Techno Minimal', 'remember-vip-techno': 'Remember VIP Techno',
    'ambient-mann': 'Ambient Mann',
  };

  const SCHEDULE = [
    { start: 0,  end: 1,  genre: 'goa',         label: 'Psytrance / Goa',      stationIds: GOA_IDS },
    { start: 1,  end: 3,  genre: 'progressive', label: 'Progressive',          stationIds: PROGRESSIVE_IDS },
    { start: 3,  end: 5,  genre: 'dark-drone',  label: 'Dark Drone',           stationIds: DARK_DRONE_IDS },
    { start: 5,  end: 6,  genre: 'ambient-mann',label: 'Ambient Mann',         stationIds: AMBIENT_MANN_IDS },
    { start: 6,  end: 12, genre: 'psychill',    label: 'Psybient / Ambient',   stationIds: PSYCHILL_IDS },
    { start: 12, end: 16, genre: 'chillout',    label: 'Downtempo / Psychill', stationIds: CHILLOUT_IDS },
    { start: 16, end: 18, genre: 'progressive', label: 'Progressive',          stationIds: PROGRESSIVE_IDS },
    { start: 18, end: 20, genre: 'goa',         label: 'Psytrance / Goa',      stationIds: GOA_IDS },
    { start: 20, end: 23, genre: 'techno',      label: 'Techno Underground',   stationIds: TECHNO_IDS },
    { start: 23, end: 24, genre: 'goa',         label: 'Psytrance / Goa',      stationIds: GOA_IDS },
  ];

  let _active = false;
  let _lastBlockIndex = -1;
  let _lastStationId = null;
  let _selfCall = false;   // skil Radio247 sine eigne playStation-kall frå ekte brukarklikk
  let _tickTimer = null;

  function _osloHourDecimal() {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Oslo', hour: '2-digit', minute: '2-digit', hour12: false,
    }).formatToParts(new Date());
    const h = Number((parts.find(p => p.type === 'hour') || {}).value || 0);
    const m = Number((parts.find(p => p.type === 'minute') || {}).value || 0);
    return h + m / 60;
  }

  function _blockIndexAt(hourDecimal) {
    for (let i = 0; i < SCHEDULE.length; i++) {
      const b = SCHEDULE[i];
      if (hourDecimal >= b.start && hourDecimal < b.end) return i;
    }
    return SCHEDULE.length - 1; // skal aldri treffast — 0–24 er dekt over
  }

  function _fmtHour(h) {
    return String(Math.floor(h) % 24).padStart(2, '0') + ':00';
  }

  function currentBlock() {
    const now = _osloHourDecimal();
    const i = _blockIndexAt(now);
    return { ...SCHEDULE[i], index: i, untilLabel: _fmtHour(SCHEDULE[i].end) };
  }

  function nextBlock() {
    const i = currentBlock().index;
    return { ...SCHEDULE[(i + 1) % SCHEDULE.length] };
  }

  // Dagsnummer i norsk kalendertid — endrar seg ved midnatt Oslo-tid, same
  // grensa som resten av hjulet. Brukast til å ROTERE kva for ei av dei
  // ekte, kuraterte stasjonane i ein blokk som spelar — same sjanger-blokk
  // (t.d. Psytrance/Goa) spelar IKKJE nødvendigvis same stasjon to dagar på
  // rad; ho syklar gjennom heile lista (dmtfm → psyndora → babaganousha →
  // dmtfm → …) etter kor mange ekte alternativ blokka har.
  function _osloDayIndex() {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Oslo', year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(new Date());
    const y = Number((parts.find(p => p.type === 'year') || {}).value || 0);
    const m = Number((parts.find(p => p.type === 'month') || {}).value || 1);
    const d = Number((parts.find(p => p.type === 'day') || {}).value || 1);
    return Math.floor(Date.UTC(y, m - 1, d) / 86400000);
  }

  // `dayIndex` valfri — utan han, dagens rotasjon. Med han (også fortid/
  // framtid), same formel — rotasjonen er deterministisk, så "arkivet"
  // under kan REKNE UT kva som spelte ein gitt dag i staden for å logge det.
  // `block.start` er lagt til som ein FASE-forskyving, ikkje berre dagsteljaren
  // åleine — same sjanger (t.d. Goa) opptrer 3 gonger same dag (00, 18, 23) og
  // deler same stasjonspol; utan forskyvinga ville alle tre plukka NØYAKTIG
  // same stasjon same dag (dei deler dayIndex). Start-timen er unik per rad i
  // SCHEDULE, så kvar rad får si eiga fase — framleis heilt deterministisk.
  function _pickStationId(block, dayIndex) {
    if (!block.stationIds || !block.stationIds.length) return null;
    const n = block.stationIds.length;
    const di = dayIndex === undefined ? _osloDayIndex() : dayIndex;
    const phased = di + block.start;
    return block.stationIds[((phased % n) + n) % n]; // trygg modulo også for negative dagar
  }

  // `shortName` overstyrer visningsnavnet i "Now:"-linja for stasjonar der
  // det fulle namnet ber med seg eit nettverksprefiks (t.d. "DFM Armin van
  // Buuren") som ikkje seier noko om innhaldet — då er berre kunstnarnamnet
  // interessant. Dei fleste stasjonar treng ikkje dette; namnet ER identiteten.
  // Brukarønske 13.09.2026: heile ".FM"-endinga (t.d. "TranceAround.FM",
  // "Anon.FM") er visuell støy i denne raden — kutt han her, berre for
  // "Now:"-linja/arkivet. Rører IKKJE `.name` i js/radio.js, så stasjonslista
  // og alt anna som viser same stasjon held fram uendra. Treff berre ENDINGA
  // (`\.FM$`), ikkje midt i namnet — «1.FM Chillout Lounge» og
  // «Ambient Psychill (1.FM)» har ikkje ".FM" sist, så dei påverkast ikkje.
  function _stationName(sid) {
    if (!sid) return null;
    if (NAME_BY_ID[sid]) return NAME_BY_ID[sid];
    if (typeof Radio === 'undefined') return null;
    const s = (Radio.stations || []).find(x => x.id === sid);
    if (!s) return null;
    const name = s.shortName || s.name;
    return name ? name.replace(/\.FM$/i, '') : name;
  }

  // Kort lokal jingle-fil (same som stasjons-ID-jinglane A/C/D) — brukast som
  // ei bru mellom sjangrar ved AUTOMATISKE bytte, så overgangen aldri blir
  // stille dødtid mens den nye strøymen koblar til.
  const TRANSITION_JINGLE = 'assets/jingles/jingle-a.mp3';
  // Brukarønske 2026-09-19: gjer overgangen til/frå jingelen mjukare — mange
  // av sporene i rotasjonen ligg i 4/4-takt, men me har ingen tilgang til
  // taktrutenettet til dei eksterne strøymane (tredjeparts-radio, ikkje vårt
  // eige lydmateriale), så ekte beat-matching er ikkje mogleg. Det me KAN
  // gjere: ei lengre, mjukare inn/ut-toning i staden for standard 350ms
  // (laga for UI-ting som volumslideren) — kjennest meir som ein DJ-overgang
  // enn eit hardt kutt.
  const TRANSITION_FADE_MS = 1400;
  // Brukarønske 22.09.2026: skipDeadStation (under) brukte eit hardt kutt
  // utan jingle-bru — no bruker han same jingelen som vanlege blokkbytter,
  // men med ei kortare inn/ut-toning (320ms, same lengde begge sider). Dette
  // er ein FEIL-gjenoppretting (straumen er reelt nede), ikkje ein planlagt
  // sjangerovergang — skal kjennest raskt, ikkje som ein lang DJ-miks.
  const DEAD_STREAM_FADE_MS = 320;

  // Delt jingle-bru — spel TRANSITION_JINGLE over bytet, med sjølvvalt
  // fadeMs på begge sider. Ikkje start VÅR overgangsjingle midt i ein A/C/D-
  // stasjonsjingle eller live-annonse frå radio.js sin eigen jingle-
  // planleggjar — dei deler det same <audio>-elementet. Fell trygt tilbake
  // til rett kobling (kort avbrot, ikkje krasj) i det sjeldne tilfellet
  // begge skulle inntreffe samtidig, eller om ingenting spelar frå før.
  function _switchWithJingle(doSwitch, fadeMs) {
    if (Radio.isPlaying && Radio.playLocalClip && !Radio.jingleBusy) {
      if (Radio.beginJingle) Radio.beginJingle();
      Radio.playLocalClip(TRANSITION_JINGLE, () => {
        if (Radio.endJingle) Radio.endJingle();
        doSwitch();
      }, fadeMs);
    } else {
      doSwitch();
    }
  }

  // `opts.transition = true` = automatisk bytte (frå _tick(), midt i
  // avspeling) → bru med jingelen over. Utan flagget (frå play(), første
  // klikk) → koble rett til, ingenting å bru over enno.
  function _applyBlock(block, opts) {
    opts = opts || {};
    const sid = _pickStationId(block);
    _lastStationId = sid;
    if (!sid || typeof Radio === 'undefined') return;
    // Ikkje spel av same stasjon på nytt (ville berre togglet han av via
    // Radio.playStation sin "same id = toggle"-regel).
    if (Radio.currentStation && Radio.currentStation.id === sid && Radio.isPlaying) return;
    const doSwitch = () => {
      _selfCall = true;
      try { Radio.playStation(sid); } finally { _selfCall = false; }
    };
    if (opts.transition) _switchWithJingle(doSwitch, TRANSITION_FADE_MS);
    else doSwitch();
  }

  // Kalt frå Radio.playStation() (js/radio.js) kvar gong NOKON startar ein
  // stasjon — inkludert Radio247 sine eigne kall (då er _selfCall satt, og
  // me ignorerer). Eit ekte brukarklikk på ein annan stasjon slår av 24/7-modus.
  function notifyManualPlay() {
    if (_selfCall) return;
    _active = false;
  }

  function isActive() { return _active; }

  // Kalla av js/radio.js (_giveUpOnStation) når reconnect-budsjettet for
  // gjeldande stasjon er brukt opp — straumen er truleg reelt nede. I staden
  // for å la 24/7-kanalen bli ståande heilt stille: byt til EIN ANNAN ekte
  // stasjon i same sjangerblokk (om blokka har fleire alternativ), same
  // _selfCall-vern som _applyBlock så notifyManualPlay ikkje slår av 24/7-
  // modus. Returnerer false (ingenting gjort) om 24/7 ikkje er i gang, blokka
  // berre har éin ekte stasjon, eller det ikkje finst nokon annan å byte til
  // — då må radio.js sin eigen fallback (stopp + varsel) ta over.
  function skipDeadStation(deadId) {
    if (!_active || typeof Radio === 'undefined') return false;
    const block = currentBlock();
    if (!block.stationIds || block.stationIds.length < 2) return false;
    const alt = block.stationIds.find(id => id !== deadId);
    if (!alt) return false;
    _lastStationId = alt;
    const doSwitch = () => {
      _selfCall = true;
      try { Radio.playStation(alt); } finally { _selfCall = false; }
    };
    _switchWithJingle(doSwitch, DEAD_STREAM_FADE_MS);
    _rerenderHost();
    return true;
  }

  // Rerender kva side som helst som for tida viser eit 24/7-kort, etter play/
  // stop/blokkbytte — /radio og /shows har kvar sin eigen render(), og berre
  // éin av dei er montert om gongen.
  function _rerenderHost() {
    try {
      if (document.getElementById('radio-page') && typeof Radio !== 'undefined' && Radio.render) Radio.render();
      else if (document.getElementById('shows-page') && typeof Shows !== 'undefined' && Shows.render) Shows.render();
    } catch (_) {}
  }

  function play() {
    _active = true;
    const block = currentBlock();
    _lastBlockIndex = block.index;
    _applyBlock(block);
    _rerenderHost();
  }

  function stop() {
    _active = false;
    if (_lastStationId && typeof Radio !== 'undefined' &&
        Radio.currentStation && Radio.currentStation.id === _lastStationId && Radio.isPlaying) {
      Radio.togglePlay();
    }
    _lastStationId = null;
    _rerenderHost();
  }

  function toggle() {
    if (_active) stop(); else play();
  }

  function _escHtml(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c])); }

  // Kompakt tidsplan for HEILE hjulet (9 blokker, same kvar dag — dette ER
  // sjølve "veke"-planen for denne kanalen, ikkje del av per-dag-tabellen
  // lenger nede på /shows).
  function scheduleTableHtml() {
    const now = currentBlock().index;
    return `<table class="r247-schedule-table" onclick="event.stopPropagation()">
      ${SCHEDULE.map((b, i) => `
        <tr class="${i === now ? 'r247-schedule-now' : ''}">
          <td>${_fmtHour(b.start)}–${_fmtHour(b.end)}</td>
          <td>${_escHtml(b.label)}</td>
        </tr>`).join('')}
    </table>
    <div class="r247-schedule-note" onclick="event.stopPropagation()">↻ Repeats daily — 23:00–00:00 loops straight back into 00:00–01:00</div>`;
  }

  // "Arkiv" for den sjangeren som spelar NO: kva ekte stasjon som var på
  // same tidsblokk dei siste 5 dagane. Ikkje ein logg (ingen database) —
  // rotasjonen er ein rein funksjon av dato, så fortida kan alltid reknast
  // ut på nytt. Viser ingenting for blokker med berre éin ekte stasjon
  // (ingenting å rotere mellom enno).
  function archiveHtml() {
    const b = currentBlock();
    if (!b.stationIds || b.stationIds.length < 2) return '';
    const today = _osloDayIndex();
    const rows = [];
    for (let back = 0; back < 5; back++) {
      const sid = _pickStationId(b, today - back);
      const name = _stationName(sid) || sid;
      const label = back === 0 ? 'Today' : back === 1 ? 'Yesterday' : `${back} days ago`;
      rows.push(`<tr><td>${label}</td><td>${_escHtml(name)}</td></tr>`);
    }
    return `<div class="r247-archive" onclick="event.stopPropagation()">
      <div class="r247-archive-title">${Icon('clock')} ${_escHtml(b.label)} — recent rotation</div>
      <table class="r247-schedule-table">${rows.join('')}</table>
    </div>`;
  }

  // Delt kort-markup — brukt av både js/radio.js (full versjon, med
  // påmeldingsfelt) og js/shows.js (kompakt versjon som banner over
  // "Weekly schedule"). `opts.subscribe` slår på e-postfeltet, `opts.schedule`
  // viser kanalens eigen 9-blokks døgnplan under kortet.
  function cardHtml(id, opts) {
    opts = opts || {};
    const b = currentBlock();
    const active = _active;
    // Brukarønske 16.09.2026: «Now:»-linja skal IKKJE avsløre kva ekte
    // stasjon som roterer inn (t.d. «DMT FM») — berre sjangeren. Same
    // prinsipp som hero-boksen på /radio (js/radio.js updateNowPlaying):
    // brukaren skal berre sjå SiriusFM-brandinga her, ikkje den ekte
    // stasjonen. «Recent rotation»-arkivet under (archiveHtml) er eit
    // MEDVITE unntak og held fram med å vise ekte stasjonsnamn.
    // Brukarønske 18.09.2026: er nokon faktisk live akkurat no (eigaren sitt
    // "Gå live"-panel, js/liveGlobal.js), skal «Now:»-linja vise KVEM som
    // spelar live i staden for berre sjangeren — same unntak som
    // «Recent rotation»-arkivet under, som alt viser ekte namn.
    // To kjelder: vanleg lyttar (Radio sin live-overtaking) ELLER broadcasteren
    // sjølv (LiveMix — som med vilje ALDRI koblar til lyden på eigen fane, jf.
    // sjølv-ekko-vernet i js/liveGlobal.js, men skal likevel VISE at han er
    // live der òg).
    const livePresenter =
      (typeof Radio !== 'undefined' && Radio.isLiveTakeoverActive && Radio.isLiveTakeoverActive()
        && Radio.getLivePresenterName && Radio.getLivePresenterName()) ||
      (typeof LiveMix !== 'undefined' && LiveMix.isBroadcastingHere && LiveMix.isBroadcastingHere()
        && LiveMix.getBroadcastPresenterName && LiveMix.getBroadcastPresenterName()) ||
      '';
    const nowText = livePresenter ? `🔴 LIVE — ${_escHtml(livePresenter)}` : _escHtml(b.label);
    // Brukarønske 15.09.2026: «Next up» på EIGA linje rett under «Now:»,
    // ikkje slengt inn på same linje som før. Ingen "Next up" mens nokon er
    // live — det er ikkje relevant akkurat då.
    const desc = (opts.showUntilNext && !livePresenter)
      ? `Now: ${nowText}<br><span class="r247-next-up">Next up: ${_escHtml(nextBlock().label)} at ${b.untilLabel}</span>`
      : `Now: ${nowText}`;
    return `
      <div class="stellar-featured-card r247-card" id="${id}">
        <div class="stellar-featured-glow" style="background:#a855f7"></div>
        <div class="stellar-featured-inner">
          <div class="stellar-featured-emoji">${iconForEmoji('🌘')}</div>
          <div class="stellar-featured-info">
            <div class="stellar-featured-label">${Icon('star')} 24-Hour Cycle — non-stop web 𓂋𓄿𓂧𓇋𓅱 radio</div>
            <div class="stellar-featured-name">SiriusFM</div>
            <div class="stellar-featured-desc">${desc}</div>
          </div>
          <div class="r247-controls" onclick="event.stopPropagation()">
            <button class="r247-play-btn" title="${livePresenter ? 'A live broadcast is playing right now' : 'Play'}" ${(active || livePresenter) ? 'disabled' : ''} onclick="Radio247.play()">${Icon('play')} Play</button>
            <button class="r247-stop-btn" title="Stop" ${!active ? 'disabled' : ''} onclick="Radio247.stop()">${Icon('square')} Stop</button>
          </div>
        </div>
        ${active ? '<div class="stellar-live-bar"><span></span><span></span><span></span><span></span><span></span></div>' : ''}
        ${opts.subscribe && !_isSubscribed() ? `
        <div class="r247-subscribe" onclick="event.stopPropagation()">
          <input type="email" id="r247-sub-email" class="r247-sub-input" placeholder="Get today's schedule by email" autocomplete="email">
          <button class="r247-sub-btn" title="Subscribe" onclick="Radio247.subscribeFromInput()">${Icon('bell')}</button>
        </div>` : ''}
        ${opts.schedule ? scheduleTableHtml() : ''}
        ${opts.archive ? archiveHtml() : ''}
      </div>`;
  }

  // Sjekk kvart minutt om me har krysset ei blokkgrense.
  // Er 24/7 faktisk i gang: bytt kjelde stille (ingen avbrot om brukaren
  // framleis lyttar til nett den same stasjonen).
  // Er 24/7 IKKJE i gang: ikkje bytt nokon lyd (ingenting spelar), men
  // ompteikn likevel «Now:»/«Next up:»-teksten på kortet ved KVAR
  // blokkgrense, så ho ikkje står att og viser gårsdagens/førre timens
  // sjanger for besøkende som berre har sida ståande open utan å spele
  // (rapportert 2026-09-19: viste "Next up ... at 12:00" kl 12:01).
  function _tick() {
    const block = currentBlock();
    if (block.index === _lastBlockIndex) return;
    _lastBlockIndex = block.index;
    if (_active) {
      _applyBlock(block, { transition: true });
    }
    _rerenderHost();
  }

  function init() {
    if (_tickTimer) clearInterval(_tickTimer);
    _tickTimer = setInterval(_tick, 60 * 1000);
  }

  // Påmelding til den daglige e-posten med dagens skjema (api/radio247-digest.js)
  // — EGEN liste, atskilt fra det vanlige "Updates"-nyhetsbrevet (js/newsletter.js).
  // Hugsar påmelding lokalt (same mønster som Unsubscribe sin pv_marketing_optout)
  // slik at abonnements-raden forsvinn med det same og ikkje kjem tilbake på
  // seinare besøk — ingen grunn til å be same brukar om e-posten på nytt.
  const SUBSCRIBED_KEY = 'pv_r247_subscribed';
  function _isSubscribed() {
    try { return localStorage.getItem(SUBSCRIBED_KEY) === '1'; } catch (_) { return false; }
  }
  function _markSubscribed() {
    try { localStorage.setItem(SUBSCRIBED_KEY, '1'); } catch (_) {}
  }

  async function subscribeFromInput() {
    const inp = document.getElementById('r247-sub-email');
    const email = String((inp && inp.value) || '').trim();
    const toast = (m, t) => { try { if (typeof App !== 'undefined' && App.toast) App.toast(m, t); } catch (_) {} };
    if (!email || !email.includes('@')) { toast('Enter a valid email address.', 'error'); return; }
    try {
      const res = await fetch('/api/auth?action=radio247subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body.success) {
        if (inp) inp.value = '';
        toast('Subscribed to the daily schedule ✓', 'success');
        _markSubscribed();
        _rerenderHost();
      } else {
        toast(body.error || 'Could not subscribe right now.', 'error');
      }
    } catch (_) {
      toast('Could not subscribe — try again.', 'error');
    }
  }

  return {
    play, stop, toggle, isActive, currentBlock, nextBlock, cardHtml,
    notifyManualPlay, subscribeFromInput, init, skipDeadStation,
    // Kalla av js/liveGlobal.js idet nokon går live/slutter å vere live, så
    // "24-Hour Cycle"-kortet oppdaterer «Now:»-linja med det same i staden
    // for å vente til neste naturlege ompteikning (minutt-tick/sidebytte).
    refresh: _rerenderHost,
    get schedule() { return SCHEDULE; },
    // Eksponert for server-side gjenbruk (sjå module.exports under) — ikkje
    // meint for UI-kode, som allereie har currentBlock()/archiveHtml().
    pickStationId: _pickStationId,
    stationName: _stationName,
  };
})();
if (typeof document !== 'undefined') Radio247.init();
// Server-side gjenbruk (api/radio247-digest.js) — same mønster som js/shows.js
// og js/world.js: éin kjelde til sannhet for tidsplanen, ikkje ein handoppdatert kopi.
// pickStationId/stationName er med her slik at digest-e-posten (api/send-email.js)
// kan vise den ekte stasjonen bak kvar blokk — same reknestykke/namn som
// arkiv-visninga på /radio, ikkje ein separat kopi av utrekninga.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SCHEDULE: Radio247.schedule, pickStationId: Radio247.pickStationId, stationName: Radio247.stationName };
}
