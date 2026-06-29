# 06 — Discover (oppdag/last opp musikk + kuraterte faner)

**Formål:** Oppdagelsesnav: bla i/last opp spor, finn folk, og utforsk en lang rekke
kuraterte sjanger-/label-/artist-faner med ukeroterte YouTube-miks. Modul: `discover.js`
(`Discover`). Rute: `#/discover`. Kuraterte data ordrett: [[data/discover-faner]],
[[data/drone-artister]].

## Funksjoner (brukervendt)

### Hovedfane «Musikk» (underfaner: tracks / upload / radio)
- **Tracks:** alle spor fra offentlige brukere, nyeste først; filtrer på 10 sjangre
  (`GENRES`). Hvert kort: cover, tittel, artist (lenke til profil), sjanger-tag, varighet,
  pris/gratis-badge, play, **last ned**, ønskeliste (hjerte). Live-aktivitetsfeed
  (`FAKE_ACTIVITY`, roterer ~30s).
- **Prismodell (kanttilfelle):** innhold **< 60 min er gratis** for alle innloggede; innhold
  **≥ 60 min (lange miks/DJ-sett) koster 150 kr** — men er **alltid gratis hvis artisten er
  Pro** (`FREE_MAX_SECONDS=3600`, `MIX_PRICE_NOK=150`). Betalt nedlasting markeres i
  `sr_dl_paid_<user>`. `trackNeedsPayment(track)` styrer betalingsmodal.
- **Upload (innlogget):** drag-and-drop/filvelger for audio (alle audioformater); metadata
  (tittel, artist auto, sjanger, beskrivelse, hovedkategori for label-utsending), avkrysning
  «dette er en miks/DJ-sett» (utløser varighetspris), auto-varighet. Spor blir synlig straks.
- **Radio (sjangerfavoritt):** velg favorittstasjon per aktiv sjanger; mapping
  `GENRE_RADIO_CATS` → `Radio`-kategorier. Lagres i `pv_disc_radios_<user>` (eller `_guest`).

### «Finn folk»
Filtrer på rolle (`ROLES`: alle/lyttere/DJ-er/produsenter/plateselskap); rutenett med
avatar/navn/@/rolle-badge/bio; venne-knapp (hvis `Social` finnes); kort → profil.

### Kuraterte faner (horisontalt scrollbar fanerad; `switchTab`)
Faner: `psy-tour, ambient-mann, psybient, altar-records, hadra, dacru, tip-raja, astral,
shpongle, younger-brother, goa-gil, shunyata, kukan-dub, cosmic-leaf, cryo-chamber,
mikelabella, gagarin-project, leftfield`, pluss `ultimae`. Innhold per fane: festival-/
label-/artist-info, lenker, og en **«Radio-miks»** som **roterer hver uke** (`CATEGORY_MIXES`
+ `weeklyPick` på ukenummer). Fanenavn + mikser ordrett: [[data/discover-faner]]. De store
embedde listene (f.eks. Hadra-festivalens artister per scene, Psybient-event-lista, label-
rosters) ligger i render-funksjoner i `discover.js` — kopier verbatim derfra ved gjenoppbygging.
- **Ambient Mann (unntak):** permanent YouTube-miks (`AMBIENT_MANN_MIX='iLjKF9-iC1k'`, roterer
  **ikke**) + **in-page YouTube-søk** via `api/youtube` (treff vises som kort, spilles i embed
  uten ny fane) + sjanger-kort (Psychill/Downtempo/Experimental → Bandcamp). Navnet er
  `notranslate` (ellers gjør Google Translate «Mann»→«Man»).
- **Drone Zone (modal):** 10 dark-ambient-artister m/biografi + 7 dark-labels — ordrett i
  [[data/drone-artister]]. Åpnes via `openDroneZone()`.
- **Goa Gil Memorial:** R.I.P.-hyllestkort.

### Sidepanel-widgets
Live-aktivitetsfeed, sjangerbasert stasjonsvelger (3 anbefalte per sjanger), sjanger-tag-sky,
nyttige eksterne lenker (feedfreq, bigfreq, psybient.org, cosmicleaf m.fl.).

## Nøkkelmetoder

`render` · `setGenre/setRole` · `switchTab/switchSubTab` · `playTrack` · `wishlist` ·
`downloadTrack/closeDownloadModal/confirmDownloadPayment` · `uploadDiscTrack/
onUploadFileChange/onCategoryChange` · `setDiscGenreRadio/clearGenreRadio` ·
`openDroneZone/closeDroneZone` · `ytSearch/openYt` · `ambientYtSearch/ambientYtPlay` ·
`scrollTabs/updateTabArrows`.

## Datamodell (i dag)

- **Hardkodet i `discover.js`:** `GENRES` (10), `MAIN_CATEGORIES` (7 m/demo-label-e-poster),
  `ROLES` (5), `ROLE_LABEL`, `GENRE_RADIO_CATS`, `CATEGORY_MIXES` (14 pooler × 3 YouTube-ID),
  `AMBIENT_MANN_MIX`, `FAKE_ACTIVITY` (8), `DRONE_ARTISTS` (10), `DRONE_LABELS` (7),
  `FREE_MAX_SECONDS`, `MIX_PRICE_NOK`. Ordrett: [[data/discover-faner]] + [[data/drone-artister]].
- **localStorage:** `pv_disc_radios_<user>`/`_guest`, `sr_dl_paid_<user>`.
- **IndexedDB:** `music`-spor (felt `name,title,artist,genre,duration,coverId,uploadedAt,
  isMix,artistSubscription`).

## Integrasjonspunkter

`Player` (spill spor), `Radio` (sjangerradio + `Radio.stations`), `Auth` (brukere/Pro),
`DB` (spor/cover), `api/youtube` (Ambient Mann-søk), `Marketplace` (betalt nedlasting),
`Social` (venne-knapp), `Router`/`App`/`Icon`.
