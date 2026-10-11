// ChlorophilLive — Chlorophil sine faste direktesendingar. Éin kjelde til sannhet for både
// nettlesaren (js/discover.js, Discover-kortet) og serveren (api/send-email.js, abonnent-e-posten).
// Brukarønske 11.10.2026: første sending mandag 12.10, deretter KVAR søndag (frå 18.10).
// Tid = 17:00Z = 22:00 hos Chlorophil (UTC+5, ingen sommartid) → 19:00 norsk tid til 24.10, 18:00 frå 25.10.
// Alle tider er UTC-ISO; norsk tid blir rekna ut med Intl (Europe/Oslo).
const ChlorophilLive = (() => {
  const FIXED = ['2026-10-12T17:00:00Z'];
  const WEEKLY_FROM = '2026-10-18T17:00:00Z';   // søndag; deretter +7 dagar
  const WINDOW_MS = 4 * 3600 * 1000;            // «Live now»-vindauge etter start
  const LINK_URL = 'https://synchronos-recordings.bandcamp.com/album/subspace-garden-ep-24-bit';
  const LINK_LABEL = 'Subspace Garden EP · Synchronos Recordings';

  // Dei `count` neste sendingane (UTC-ms) — passerte (utanfor «live now»-vindauget) blir fjerna.
  function slots(nowMs, count) {
    const out = [];
    FIXED.forEach(iso => { if (Date.parse(iso) + WINDOW_MS > nowMs) out.push(Date.parse(iso)); });
    let t = Date.parse(WEEKLY_FROM);
    while (out.length < count && out.length < 500) {
      if (t + WINDOW_MS > nowMs) out.push(t);
      t += 7 * 24 * 3600 * 1000;
    }
    return out.slice(0, count);
  }

  // Engelsk visning i norsk tid: { weekday, date, clock, tz, ms }
  const _wd = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Oslo', weekday: 'long' });
  const _dt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Oslo', day: 'numeric', month: 'long' });
  const _ck = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Oslo', hour: '2-digit', minute: '2-digit', hour12: false });
  const _tz = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Oslo', timeZoneName: 'short' });
  function describe(ms) {
    const tz = (_tz.formatToParts(ms).find(p => p.type === 'timeZoneName') || {}).value || '';
    return { ms, weekday: _wd.format(ms), date: _dt.format(ms), clock: _ck.format(ms), tz };
  }

  return { slots, describe, WINDOW_MS, LINK_URL, LINK_LABEL };
})();

if (typeof window !== 'undefined') window.ChlorophilLive = ChlorophilLive;
if (typeof module !== 'undefined' && module.exports) module.exports = ChlorophilLive;
