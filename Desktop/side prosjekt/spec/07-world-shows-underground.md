# 07 — World, Shows og Underground

Tre kuraterte katalogsider. Felles: in-app-avspilling via `tuneIn(stationId)` (navigerer til
`#/radio` + spiller, ~300ms forsinkelse). Alle data ordrett: [[data/world-katalog]].

## World (`world.js`, `World`, `#/world`)

**Formål:** Encyklopedi over den globale psytrance/psybient-scenen.
- **Funksjoner:** kort for **festivaler** (7), **klubb/scene** (1: IT Athens, med «Planar
  framover»/kommende RA.co-events per kort), **plateselskap** (9), **pionér-artister** (8),
  **web-radioer** (6, noen med play → `tuneIn`). Hero med tellinger. Innebygd **RadioSearch**-
  widget («Søk alle verdens web-radioer», se [[05-radio]]). Footer-oppfordring (tips-e-post).
- **Data (hardkodet):** `FESTIVALS, CLUBS, LABELS, ARTISTS, RADIOS` (felt: emoji, name, loc,
  grad, theme/tags/events?, links[]; radio-links kan ha `{play: stationId}`).
- **Metoder:** `World.render()`, `World.tuneIn(stationId)`.

## Shows (`shows.js`, `Shows`, `#/shows`)

**Formål:** Ukentlig sendeskjema (radioprogram) + arkiv + festivaler.
- **Funksjoner:** hero «ON AIR nå»/«neste show»; **ukeskjema** (7 dager, i dag først) med
  tidsluker → klikk = `tuneIn`; **alle show** (8) med vert/sjanger/tid/play/del
  (`shareShow` via Web Share API eller utklippstavle); **arkiv** (6 eksempler, avspilling
  ikke implementert); festival-seksjon; Goa Gil-hyllest; innebygd RadioSearch-widget;
  abonner-banner (registrer for varsler / «allerede abonnert»).
- **Data (hardkodet):** `SHOWS` (8; felt `id,name,host,day(0–6),startHour,endHour,genre,
  emoji,color,desc,stream`; noen går over midnatt), `DAYS_NO`, `DAYS_EN`.
- **Metoder:** `Shows.render()`, `Shows.tuneIn(stationId)`, `Shows.shareShow(showId)`.

## Underground (`underground.js`, `Underground`, `#/underground`)

**Formål:** Guide til techno-undergrunnen (UK + Ibiza).
- **Funksjoner:** **England-artister** (6) og **Ibiza-artister** (6) med by/tag/bio + RA.co-
  og SoundCloud-lenker (SoundCloud åpnes i embed-panel via `openMedia`); **UK-venues** (4) og
  **Ibiza-venues** (4) med nettside + RA-events; **musikk-lenker** (6 strømmeplattformer);
  **demo-innsending**-kort (tips + e-post `demos@soundcore.no`); tilbake-knapp → `#/discover`.
- **Data (hardkodet):** `ENGLAND_ARTISTS, IBIZA_ARTISTS, VENUES_UK, VENUES_IBIZA, MUSIC_LINKS`.
- **Metode:** `Underground.render()`.

## Integrasjonspunkter

`Radio`/`RadioSearch` (avspilling + søk), `Router`/`App`/`Icon`, `Auth` (Shows abonner-banner).
Lenker peker til Resident Advisor / Bandcamp / SoundCloud / offisielle nettsider.
