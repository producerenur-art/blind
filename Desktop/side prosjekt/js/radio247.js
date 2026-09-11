// Radio247 — "🌘 24-Hour Cycle": ett kontinuerlig døgnstyrt kanal-kort på
// /radio-sida, atskilt fra dei vanlege sjanger-fanene og frå radiOzora sitt
// eige "SiriusFM Main station"-kort (den røres ikke). Sjangeren den spelar
// følger ei fast, symmetrisk døgnkurve i norsk tid (Europe/Oslo):
//   natt-topp (Techno) → Psytrance/Goa → Progressive → Dark Drone (botn,
//   tidleg) → Psybient/Ambient (dag) → Downtempo/Psychill → Progressive →
//   Psytrance/Goa → topp igjen.
// Alle blokkene bruker ekte lyd-strøymar frå STATIONS (js/radio.js) — ingen
// video, rein lytting akkurat som alle andre radiokanalar på sida.
const Radio247 = (() => {
  // [start, end) i norsk lokaltid, 24-timars klokke (desimaltimar). Må
  // dekke heile 0–24 utan hol.
  const GOA_IDS         = ['dmtfm', 'psyndora', 'babaganousha', 'jointil-beattrance', 'record-goa-psy', 'technolovers-psytrance', 'goanight'];
  const PROGRESSIVE_IDS = ['trancearound', 'atr', 'rr-progressive', 'record-trancemission', 'technolovers-trance', 'dfm-avb'];
  const DARK_DRONE_IDS  = ['ambient-abyss', 'dark-city-signal', 'systrum-ssr1', 'indiebeat-ambient', 'modular-station', 'alswin-ambient'];
  const PSYCHILL_IDS    = ['ambientpsy-1fm', 'multihuman', 'diceradio-psybient', 'mixlive-psybient-sunset', 'paradisehunter-chillout'];
  const CHILLOUT_IDS    = ['1fm-chillout', 'smoothchill', 'chilloutzone-lautfm', 'brokenbeats', 'anon-fm', 'cafedelmar', 'epic-lounge-sleep', 'epic-piano-chillout'];
  const TECHNO_IDS      = ['uzic-techno', 'technolovers-techno', 'remember-vip-techno', 'melodic-technolovers', 'piratefm-electronica'];

  const SCHEDULE = [
    { start: 0,  end: 1,  genre: 'goa',         label: 'Psytrance / Goa',      stationIds: GOA_IDS },
    { start: 1,  end: 3,  genre: 'progressive', label: 'Progressive',          stationIds: PROGRESSIVE_IDS },
    { start: 3,  end: 6,  genre: 'dark-drone',  label: 'Dark Drone',           stationIds: DARK_DRONE_IDS },
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

  function _stationName(sid) {
    if (!sid || typeof Radio === 'undefined') return null;
    const s = (Radio.stations || []).find(x => x.id === sid);
    return s ? s.name : null;
  }

  // Kort lokal jingle-fil (same som stasjons-ID-jinglane A/C/D) — brukast som
  // ei bru mellom sjangrar ved AUTOMATISKE bytte, så overgangen aldri blir
  // stille dødtid mens den nye strøymen koblar til.
  const TRANSITION_JINGLE = 'assets/jingles/jingle-a.mp3';

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
    if (opts.transition && Radio.isPlaying && Radio.playLocalClip) {
      Radio.playLocalClip(TRANSITION_JINGLE, doSwitch);
    } else {
      doSwitch();
    }
  }

  // Kalt frå Radio.playStation() (js/radio.js) kvar gong NOKON startar ein
  // stasjon — inkludert Radio247 sine eigne kall (då er _selfCall satt, og
  // me ignorerer). Eit ekte brukarklikk på ein annan stasjon slår av 24/7-modus.
  function notifyManualPlay() {
    if (_selfCall) return;
    _active = false;
  }

  function isActive() { return _active; }

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
    const stationName = _stationName(_pickStationId(b));
    const nowText = stationName ? `${_escHtml(b.label)} — ${_escHtml(stationName)}` : _escHtml(b.label);
    const desc = opts.showUntilNext
      ? `Now: ${nowText} · until ${b.untilLabel} · Next: ${_escHtml(nextBlock().label)}`
      : `Now: ${nowText}`;
    return `
      <div class="stellar-featured-card r247-card" id="${id}">
        <div class="stellar-featured-glow" style="background:#a855f7"></div>
        <div class="stellar-featured-inner">
          <div class="stellar-featured-emoji">${iconForEmoji('🌘')}</div>
          <div class="stellar-featured-info">
            <div class="stellar-featured-label">${Icon('star')} 24-Hour Cycle — non-stop web radio</div>
            <div class="stellar-featured-name">SiriusFM</div>
            <div class="stellar-featured-desc">${desc}</div>
          </div>
          <div class="r247-controls" onclick="event.stopPropagation()">
            <button class="r247-play-btn" title="Play" ${active ? 'disabled' : ''} onclick="Radio247.play()">${Icon('play')} Play</button>
            <button class="r247-stop-btn" title="Stop" ${!active ? 'disabled' : ''} onclick="Radio247.stop()">${Icon('square')} Stop</button>
          </div>
        </div>
        ${active ? '<div class="stellar-live-bar"><span></span><span></span><span></span><span></span><span></span></div>' : ''}
        ${opts.subscribe ? `
        <div class="r247-subscribe" onclick="event.stopPropagation()">
          <input type="email" id="r247-sub-email" class="r247-sub-input" placeholder="Get today's schedule by email" autocomplete="email">
          <button class="r247-sub-btn" title="Subscribe" onclick="Radio247.subscribeFromInput()">${Icon('bell')}</button>
        </div>` : ''}
        ${opts.schedule ? scheduleTableHtml() : ''}
        ${opts.archive ? archiveHtml() : ''}
      </div>`;
  }

  // Sjekk kvart minutt om me har krysset ei blokkgrense — bytt kjelde stille
  // (ingen avbrot dersom brukaren framleis lyttar til nett den same stasjonen).
  function _tick() {
    if (!_active) return;
    const block = currentBlock();
    if (block.index === _lastBlockIndex) return;
    _lastBlockIndex = block.index;
    _applyBlock(block, { transition: true });
    _rerenderHost();
  }

  function init() {
    if (_tickTimer) clearInterval(_tickTimer);
    _tickTimer = setInterval(_tick, 60 * 1000);
  }

  // Påmelding til den daglige e-posten med dagens skjema (api/radio247-digest.js)
  // — EGEN liste, atskilt fra det vanlige "Updates"-nyhetsbrevet (js/newsletter.js).
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
      } else {
        toast(body.error || 'Could not subscribe right now.', 'error');
      }
    } catch (_) {
      toast('Could not subscribe — try again.', 'error');
    }
  }

  return {
    play, stop, toggle, isActive, currentBlock, nextBlock, cardHtml,
    notifyManualPlay, subscribeFromInput, init,
    get schedule() { return SCHEDULE; },
  };
})();
if (typeof document !== 'undefined') Radio247.init();
// Server-side gjenbruk (api/radio247-digest.js) — same mønster som js/shows.js
// og js/world.js: éin kjelde til sannhet for tidsplanen, ikkje ein handoppdatert kopi.
if (typeof module !== 'undefined' && module.exports) module.exports = { SCHEDULE: Radio247.schedule };
