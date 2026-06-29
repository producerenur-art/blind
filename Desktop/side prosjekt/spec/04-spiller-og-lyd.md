# 04 — Vedvarende musikkspiller og lydmotor

**Formål:** Avspilling som overlever rutebytter, med kø, shuffle/repeat, drag/dock og deling
av Web Audio-kontekst med radio-visualizeren. Moduler: `player.js` (`Player`),
`playerDrag.js` (`PlayerDrag`). HTML: `#player-bar`, skjult `#audio-engine`.

## Funksjoner (brukervendt)

- **Transport:** spill/pause, forrige/neste, **shuffle**, **repeat** (av → alle → én).
- **Progressbar:** søk til posisjon; tidsvisning nå/total.
- **Volum:** glidebryter.
- **Kø-panel** (`#queue-panel`): se/hopp til spor i køen.
- **Artwork + spor-info:** cover eller musikk-ikon; tittel + artist.
- **Animert equalizer** (4 stolper) når noe spilles.
- **Drag/dock/minimer/forstørr** (via `PlayerDrag`): flytt baren hvor som helst, dock til
  bunnen, minimer (kun tittellinje), forstørr. Tilstand i `playerDragState`. Se mønster i
  [[01-skall-nav-sok]].

## Nøkkelmetoder

- `Player.setQueue(ids, startIndex)` — last kø av spor-ider.
- `Player.loadTrack(id, autoPlay)` · `Player.jumpTo(index)`.
- `Player.playExternal(url, title, subtitle)` — spill ekstern lyd-URL (også brukt for
  YouTube/SoundCloud/Spotify/Mixcloud-embeds via embed-panel, se [[01-skall-nav-sok]]).
- `Player.togglePlay()` (delegerer til `Radio` i radiomodus), `Player.prev/next()`
  (respekterer repeat/shuffle), `Player.toggleShuffle/cycleRepeat`, `Player.toggleQueue`.

## Web Audio + radio-integrasjon

- Oppretter delt `AudioContext` for FFT-analyse; eksponerer `window._radioAnalyser`,
  `window._radioCtx`, `window._radioSource` og `window._radioMode` slik at **radio-
  visualizeren** (se [[05-radio]]) kan tegne fra samme kilde.
- Når musikk starter, stopper radioen (`Radio.stopForMusicPlayer()`); når radio starter,
  yter spilleren. Kun én lydkilde av gangen.

## Datamodell (i dag)

- Kø + avspillingstilstand (currentIndex, isPlaying, shuffle, repeat) er **in-memory**
  (kø går tapt ved reload).
- Blob-URL-cache hindrer dupliserte ObjectURL-er; spor hentes via `DB.get('music', id)` +
  `DB.getBlobUrl(...)` (se [[00-arkitektur]]).
- Drag-tilstand: `playerDragState` (localStorage).

## Integrasjonspunkter

`DB` (spor/blob), `Radio` (gjensidig yield + delt Web Audio), `Icon` (kontroll-ikoner),
`Discover`/`Profile` (kaller `Player` for å spille opplastede spor).
