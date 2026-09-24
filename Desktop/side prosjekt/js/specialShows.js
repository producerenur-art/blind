// SpecialShows — planlagte forhåndsinnspelte program (mixar) som spelast i
// "24-Hour Cycle" på faste tidspunkt, for ALLE lyttarar samtidig. Éin kjelde til
// sannhet for både nettlesaren (js/radio247.js / js/radio.js) og serveren
// (api/special-reminder.js, api/send-email.js) — same mønster som js/radio247.js.
// Brukarønske 2026-09-24: Lemonchill-miksen, 4 sendingar i oktober.
//
// Tidspunkt er UTC-ISO. 20:00 norsk sommartid (CEST, UTC+2) = 18:00Z. Klokka
// stillast tilbake natt til 25.10.2026, alle fire sendingane ligg føre det.
const SpecialShows = (() => {
  const SHOWS = [
    {
      id: 'lemonchill-001',
      artist: 'Lemonchill',
      title: 'Mixes for SiriusFM 001 by Lemonchill',
      liveLabel: 'Lemonchill mix on air',
      audioUrl: 'https://qefdyxpyjwpohsmmmksf.supabase.co/storage/v1/object/public/soundcore-media/special-mixes/lemonchill-001.m4a',
      durationSec: 3712,
      // Vist som lenke på arkivposten (Live Archive) FØRST etter at miksen har gått på lufta.
      linkUrl: 'https://lemonchill.bandcamp.com/album/minifuse',
      slots: [
        '2026-10-03T18:00:00Z',
        '2026-10-10T18:00:00Z',
        '2026-10-17T18:00:00Z',
        '2026-10-24T18:00:00Z',
      ],
      // E-postvarsel: 3 stk FØR fyrste sending, ingen etter (brukarønske).
      // Ein cron køyrer 09:00Z dagleg; kvar påminning har eit fast tidspunkt.
      reminderOffsetsHours: [3 * 24 + 9, 1 * 24 + 9, 9],
      tracklist: [
        'Orvhentur',
        'My Personal Butterfly (Javier Remix)',
        'Mantra',
        'Open Rene',
        'Ruhe',
        'Palila',
        'Hoatzin',
        'Alien Hymn',
        'Andean',
        'Sublime',
        'Last Chance to Paradise (Reborn Soul Remix)',
        'Journey Through an Electric Garden (Outro)',
      ],
    },
  ];

  const ms = iso => new Date(iso).getTime();
  const endOf = (show, slotIso) => ms(slotIso) + show.durationSec * 1000;

  // Sendinga som pågår no (eller null): { show, slotStart, startMs, endMs, offsetSec }
  function activeAt(nowMs) {
    for (const show of SHOWS) {
      for (const slot of show.slots) {
        const s = ms(slot), e = endOf(show, slot);
        if (nowMs >= s && nowMs < e) return { show, slotStart: slot, startMs: s, endMs: e, offsetSec: (nowMs - s) / 1000 };
      }
    }
    return null;
  }

  // Neste sending som ikkje har starta enno (eller null).
  function nextAfter(nowMs) {
    let best = null;
    for (const show of SHOWS) for (const slot of show.slots) {
      const s = ms(slot);
      if (s > nowMs && (!best || s < best.startMs)) best = { show, slotStart: slot, startMs: s };
    }
    return best;
  }

  function byId(id) { return SHOWS.find(s => s.id === id) || null; }

  return { SHOWS, activeAt, nextAfter, byId };
})();

if (typeof window !== 'undefined') window.SpecialShows = SpecialShows;
if (typeof module !== 'undefined' && module.exports) module.exports = SpecialShows;
