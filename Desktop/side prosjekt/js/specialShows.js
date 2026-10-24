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
      title: 'Broadcast for SiriusFM by Lemonchill',
      liveLabel: 'Lemonchill on air',
      // Reklame (25s) rett FØR sjølve overtakinga, på alle 4 sendingane —
      // brukarønske 29.09.2026: reklame → «SiriusFM live now»-jingelen → miksen
      // startar. Sjå js/radio.js enterLiveTakeover() sin _special-gren.
      preRollAd: 'assets/jingles/lemonchill-ad.mp3',
      // v2 = brukaren sin eigen "lemonchill set for noah radio.wav" (Downloads, 29.09.2026),
      // transkoda til AAC 96kbps (afconvert) for å halde seg under Supabase Storage-grensa ~50MB.
      audioUrl: 'https://qefdyxpyjwpohsmmmksf.supabase.co/storage/v1/object/public/soundcore-media/special-mixes/lemonchill-001-v2.m4a',
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
    {
      id: 'ambientmann-dark-drone-001',
      artist: 'Ambient Mann',
      title: 'Dark Drone — a long mix by Ambient Mann',
      liveLabel: 'Ambient Mann on air',
      // Brukarønske 24.10.2026: «live now Ambient Mann»-jingelen både INN og UT av sendinga
      // (i staden for LIVE_INTRO / jingle-a som Lemonchill bruker). Ingen reklame.
      introJingle: 'assets/jingles/live-ambientmann.mp3',
      outroJingle: 'assets/jingles/live-ambientmann.mp3',
      prerollMs: 9000,   // jingelen (4,4 s) startar ~9 s før sendestart i staden for 30 s (ingen reklame → ellers ~25 s stille)
      // Brukaren valde «ambient-mann-live-2026-10-24» (Skrivebord, AAC, 82 MB) — KUN denne fila skal spelast.
      audioUrl: 'https://qefdyxpyjwpohsmmmksf.supabase.co/storage/v1/object/public/soundcore-media/special-mixes/ambient-mann-live-2026-10-24.m4a',
      durationSec: 3442,   // ambient-mann-live-2026-10-24.m4a = 3441,66 s (57:21)
      linkUrl: 'https://www.ambientmann.com',
      // Fire fredagar kl 22:00 norsk tid (CET, UTC+1 etter 25.10) = 21:00Z. 56 min 45 s → ferdig ca. 22:57.
      slots: [
        '2026-10-30T21:00:00Z',
        '2026-11-06T21:00:00Z',
        '2026-11-13T21:00:00Z',
        '2026-11-20T21:00:00Z',
      ],
      reminderOffsetsHours: [],   // ingen e-postvarsel (ikkje bedt om)
      tracklist: [],
      about: 'A long, slow dark drone mix — one continuous hour of deep sub-bass, shifting overtones and ritual atmosphere from Ambient Mann. Best heard in the dark, on a proper sound system or good headphones.',
    },
    {
      id: 'dimday-001',
      artist: 'Dim Day',
      title: 'Dim Day — resident set for SiriusFM',
      liveLabel: 'Dim Day on air',
      // Brukarønske 24.10.2026: eigen «Dim Day»-jingel (70 s) både INN og UT av sendinga, ingen reklame.
      introJingle: 'assets/jingles/live-dimday.mp3',
      outroJingle: 'assets/jingles/live-dimday.mp3',
      prerollMs: 72000,   // jingelen er 70,5 s → startar ~72 s før sendestart så han er ferdig når settet går
      // AAC 96 kbps av «Dim Day 1 for siriusfm live.mp3» (53:44). MÅ lastast opp til Supabase før deploy.
      audioUrl: 'https://qefdyxpyjwpohsmmmksf.supabase.co/storage/v1/object/public/soundcore-media/special-mixes/dim-day-001.m4a',
      durationSec: 3224,
      linkUrl: '',
      // Fire laurdagar kl 21:00 CET (UTC+1, brukaren sitt ord 24.10.2026) = 20:00Z, 31.10–21.11.2026.
      slots: [
        '2026-10-31T20:00:00Z',
        '2026-11-07T20:00:00Z',
        '2026-11-14T20:00:00Z',
        '2026-11-21T20:00:00Z',
      ],
      reminderOffsetsHours: [],
      tracklist: [],
      about: 'Resident set by Dim Day — live from Greece on the SiriusFM 24/7 Cycle.',
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
