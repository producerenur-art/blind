// Radio247 — "🌘 24-Hour Cycle": ett kontinuerlig døgnstyrt kanal-kort på
// /radio-sida, atskilt fra dei vanlege sjanger-fanene og frå radiOzora sitt
// eige "SiriusFM Main station"-kort (den røres ikke). Sjangeren den spelar
// følger ei fast, symmetrisk døgnkurve i norsk tid (Europe/Oslo):
//   natt-topp (Techno) → Psytrance/Goa → Progressive → Dark Drone (botn,
//   tidleg) → Psybient/Ambient (dag) → Downtempo/Psychill → Progressive →
//   Psytrance/Goa → topp igjen.
// Dei fleste blokkene bruker ekte strøymar som alt finst i STATIONS
// (js/radio.js). Dark Drone og Techno Underground har ingen ekte strøym
// enno, så dei blokkene viser i staden det same AI-kuraterte
// YouTube-fallback-settet som HomeRadio-widgeten (js/app.js) bruker for
// desse sjangrane.
const Radio247 = (() => {
  // [start, end) i norsk lokaltid, 24-timars klokke (desimaltimar). Må
  // dekke heile 0–24 utan hol. `stationIds` tom = ingen ekte strøym →
  // `ytFallbackId` brukes i staden.
  const SCHEDULE = [
    { start: 0,  end: 1,  genre: 'goa',         label: 'Psytrance / Goa',      stationIds: ['dmtfm', 'psyndora', 'babaganousha'] },
    { start: 1,  end: 3,  genre: 'progressive', label: 'Progressive',          stationIds: ['trancearound', 'atr', 'rr-progressive'] },
    { start: 3,  end: 6,  genre: 'dark-drone',  label: 'Dark Drone',           stationIds: [], ytFallbackId: 'PCEseGXzjqo' },
    { start: 6,  end: 12, genre: 'psychill',    label: 'Psybient / Ambient',   stationIds: ['ambientpsy-1fm', 'multihuman'] },
    { start: 12, end: 16, genre: 'chillout',    label: 'Downtempo / Psychill', stationIds: ['1fm-chillout', 'smoothchill'] },
    { start: 16, end: 18, genre: 'progressive', label: 'Progressive',          stationIds: ['trancearound', 'atr', 'rr-progressive'] },
    { start: 18, end: 20, genre: 'goa',         label: 'Psytrance / Goa',      stationIds: ['dmtfm', 'psyndora', 'babaganousha'] },
    { start: 20, end: 23, genre: 'techno',      label: 'Techno Underground',   stationIds: [], ytFallbackId: 'uvAwk-ITdVw' },
    { start: 23, end: 24, genre: 'goa',         label: 'Psytrance / Goa',      stationIds: ['dmtfm', 'psyndora', 'babaganousha'] },
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

  function sourceName(block) {
    if (block.stationIds && block.stationIds.length) {
      const s = (typeof Radio !== 'undefined' && Radio.stations || []).find(x => x.id === block.stationIds[0]);
      return s ? s.name : block.label;
    }
    return block.label + ' · AI video';
  }

  function _applyBlock(block) {
    const sid = block.stationIds && block.stationIds.length ? block.stationIds[0] : null;
    _lastStationId = sid;
    if (!sid || typeof Radio === 'undefined') return;
    // Ikkje spel av same stasjon på nytt (ville berre togglet han av via
    // Radio.playStation sin "same id = toggle"-regel).
    if (Radio.currentStation && Radio.currentStation.id === sid && Radio.isPlaying) return;
    _selfCall = true;
    try { Radio.playStation(sid); } finally { _selfCall = false; }
  }

  // Kalt frå Radio.playStation() (js/radio.js) kvar gong NOKON startar ein
  // stasjon — inkludert Radio247 sine eigne kall (då er _selfCall satt, og
  // me ignorerer). Eit ekte brukarklikk på ein annan stasjon slår av 24/7-modus.
  function notifyManualPlay() {
    if (_selfCall) return;
    _active = false;
  }

  function isActive() { return _active; }

  function play() {
    _active = true;
    const block = currentBlock();
    _lastBlockIndex = block.index;
    _applyBlock(block);
  }

  function stop() {
    _active = false;
    if (_lastStationId && typeof Radio !== 'undefined' &&
        Radio.currentStation && Radio.currentStation.id === _lastStationId && Radio.isPlaying) {
      Radio.togglePlay();
    }
    _lastStationId = null;
  }

  function toggle() {
    if (_active) stop(); else play();
    if (typeof Radio !== 'undefined' && Radio.render && document.getElementById('radio-page')) Radio.render();
  }

  // Sjekk kvart minutt om me har krysset ei blokkgrense — bytt kjelde stille
  // (ingen avbrot dersom brukaren framleis lyttar til nett den same stasjonen).
  function _tick() {
    if (!_active) return;
    const block = currentBlock();
    if (block.index === _lastBlockIndex) return;
    _lastBlockIndex = block.index;
    _applyBlock(block);
    if (typeof Radio !== 'undefined' && Radio.render && document.getElementById('radio-page')) Radio.render();
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
    play, stop, toggle, isActive, currentBlock, nextBlock, sourceName,
    notifyManualPlay, subscribeFromInput, init,
    get schedule() { return SCHEDULE; },
  };
})();
if (typeof document !== 'undefined') Radio247.init();
// Server-side gjenbruk (api/radio247-digest.js) — same mønster som js/shows.js
// og js/world.js: éin kjelde til sannhet for tidsplanen, ikkje ein handoppdatert kopi.
if (typeof module !== 'undefined' && module.exports) module.exports = { SCHEDULE: Radio247.schedule };
