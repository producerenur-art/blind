// ChlorophilLive — Chlorophil sine faste direktesendingar. Éin kjelde til sannhet for både
// nettlesaren (js/discover.js, Discover-kortet) og serveren (api/send-email.js, abonnent-e-posten).
// Brukarønske 11.10.2026: første sending mandag 12.10, deretter KVAR søndag. 24.10.2026: frå 8.11 søndagar 19–23 norsk tid.
// Alle tider er UTC-ISO; norsk tid blir rekna ut med Intl (Europe/Oslo).
const ChlorophilLive = (() => {
  // Faste sendingar (UTC): 12.10 og 18.10 (19:00 CEST), 25.10 og 1.11 (18:00 CET) — alt som før.
  const FIXED = ['2026-10-12T17:00:00Z', '2026-10-18T17:00:00Z', '2026-10-25T17:00:00Z', '2026-11-01T17:00:00Z'];
  // Brukarønske 24.10.2026 (shinichizen): frå 8.11 KVAR søndag 19:00–23:00 norsk tid (CET om vinteren),
  // same klokkeslett resten av 2026 og heile 2027 — følger norsk sommartid (CEST) slik at klokka forblir 19:00.
  const WEEKLY_FIRST = { y: 2026, m: 11, d: 8 };
  const WEEKLY_HOUR_OSLO = 19;
  const WEEKLY_UNTIL_MS = Date.parse('2027-12-31T23:59:59Z');
  const WINDOW_MS = 4 * 3600 * 1000;            // «Live now»-vindauge etter start (19–23)
  const LINK_URL = 'https://synchronos-recordings.bandcamp.com/album/subspace-garden-ep-24-bit';
  const LINK_LABEL = 'Subspace Garden EP · Synchronos Recordings';

  // Kl `hour`:00 norsk tid på ein dato → UTC-ms (offset via Intl; fungerer i nettlesar og Node).
  const _off = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Oslo', timeZoneName: 'longOffset' });
  function osloToUtc(y, m, d, hour) {
    for (const off of [1, 2]) {
      const ms = Date.UTC(y, m - 1, d, hour - off);
      const part = (_off.formatToParts(ms).find(p => p.type === 'timeZoneName') || {}).value || '';
      if (part === 'GMT+0' + off + ':00') return ms;
    }
    return Date.UTC(y, m - 1, d, hour - 1);
  }
  const ALL = (() => {
    const out = FIXED.map(iso => Date.parse(iso));
    const dt = new Date(Date.UTC(WEEKLY_FIRST.y, WEEKLY_FIRST.m - 1, WEEKLY_FIRST.d));
    while (true) {
      const ms = osloToUtc(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate(), WEEKLY_HOUR_OSLO);
      if (ms > WEEKLY_UNTIL_MS) break;
      out.push(ms);
      dt.setUTCDate(dt.getUTCDate() + 7);
    }
    return out;
  })();

  // Dei `count` neste sendingane (UTC-ms) — passerte (utanfor «live now»-vindauget) blir fjerna.
  function slots(nowMs, count) {
    return ALL.filter(t => t + WINDOW_MS > nowMs).slice(0, count);
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
