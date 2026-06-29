# Data — Discover-faner og lister (ordrett fra `js/discover.js`)

Hører til [[06-discover]]. Drone-artister/labels ligger separat i [[data/drone-artister]].

## GENRES (10) — `{tag, label, emoji}`
all/Alt 🎵 · ambient/Ambient 🌌 · electronic/Electronic ⚡ · psytrance/Psytrance 🌀 ·
techno/Techno 🔊 · house/House 🏠 · chill/Chill 🌿 · jazz/Jazz 🎷 ·
experimental/Experimental 🧪 · drone/Drone 🔁

## ROLES (5) — `{tag, label, emoji}`
all/Alle 👥 · lytter/Lyttere 🎧 · dj/DJer 🎛️ · produsent/Produsenter 🎹 ·
plateselskap/Plateselskap 🏷️ · `ROLE_LABEL = {lytter:'🎧 Lytter', dj:'🎛️ DJ',
produsent:'🎹 Produsent', plateselskap:'🏷️ Plateselskap'}`

## MAIN_CATEGORIES (7) — `{tag, label, emoji, labels:[{name,email}]}`
Brukes til label-utsending fra opplasting. Demo-e-poster:
- **(tom)** «Velg seinere via profil» ⏭️ — ingen labels
- **electronic** «Electronic / Dance» ⚡ — Kompakt Records (demo@kompakt.fm), Ghostly
  International (info@ghostly.com), Warp Records (demo@warp.net), Ninja Tune (demos@ninjatune.net)
- **hiphop** «Hip-Hop / R&B» 🎤 — Stones Throw (demos@stonesthrow.com), Rhymesayers
  (demos@rhymesayers.com), Def Jam (demo) (unsigned@defjam.com)
- **pop** «Pop / Indie» 🎶 — Warner Music Norway (demos@warnermusic.no), Sony Music Norway
  (demos@sonymusic.no), Universal Music (demos@umusic.no)
- **rock** «Rock / Metal» 🎸 — Nuclear Blast (bands@nuclearblast.de), Relapse
  (demos@relapse.com), Sub Pop (demos@subpop.com)
- **jazz** «Jazz / Blues» 🎷 — ECM (info@ecmrecords.com), Blue Note (info@bluenote.com),
  ACT Music (demos@actmusic.com)
- **ambient** «Eksperimentell / Ambient» 🌌 — Kranky (info@kranky.net), Touch Music
  (demos@touchmusic.org.uk), 12k (demos@12k.com)

## GENRE_RADIO_CATS (sjanger → Radio-kategorier)
all→null · ambient→[Ambient / Space] · electronic→[Lo-Fi / IDM, Stellar, EDM / House] ·
psytrance→[Psytrance / Progressive, Ambient / Space] · techno→[Techno / Minimal] ·
house→[EDM / House] · chill→[Chill Out / Downtempo] · jazz→[Jazz / Lounge] ·
experimental→[Lo-Fi / IDM, Ambient / Space] · drone→[Ambient / Space]

## CATEGORY_MIXES (14 pooler × 3 YouTube-ID, ukerotasjon)
psy-tour: 2fXd4htj7Vo, caX18upOO7c, 3g2vBKiWXjY · psybient: IAZIzaqxaZk, 3LQYUBw_Icc,
V6zgkhAYhEQ · altar-records: X2WV1RnCPlw, Y91C2yTq8BQ, pu-IVYOLsDc · hadra: 2crX23JpCrI,
ifwKC8r0C5w, KavG_9PgRHs · dacru: ie82s2wXlY4, fiFiArs1kDw, Q25Uwy2UBTg · tip-raja:
pqLKL9nIHC0, t4KAxWh9fGs, fl40hDwEnOs · astral: jDpvkePMsw0, R_4RaHzQo0U, yMwdMMMggpc ·
shpongle: ZYowY7tvBbY, u5Y1SzkoPOI, XwtT4ZBa3CE · younger-brother: rkMt4GudJzg, sEdUddGvoac,
MBtgRZMaAYg · goa-gil: xPOAsccVSvw, 0HZgSztO_24, gcsr00s4JoQ · shunyata: wiow3vELLYw,
MhaE4T6yO1g, MR5Sva5ljbI · kukan-dub: Knq6rBP8Afk, iRgtYUfUjiE, oU3Be14rrwU · cosmic-leaf:
nUW7oEiwVqY, hKMzD6sclAY, grWRSyptTnk · gagarin-project: fhcc1E9RoPE, h6BKzBLOgIU, deT8-XC7Rqw

- **AMBIENT_MANN_MIX = `iLjKF9-iC1k`** (permanent, roterer IKKE).

## Kuraterte fanenavn (i fanerad)
psy-tour, ambient-mann, psybient, altar-records, hadra, dacru, tip-raja, astral, shpongle,
younger-brother, goa-gil, shunyata, kukan-dub, cosmic-leaf, cryo-chamber, mikelabella,
gagarin-project, leftfield (+ ultimae). Det enkelte fane-innholdet (festival-/label-/event-
lister, f.eks. Hadra-artister per scene, Psybient-events) er render-funksjoner i `discover.js`
— kopier verbatim derfra.

## FAKE_ACTIVITY (8) — live-feed-eksempler `{user, action, track, ago}`
luna_drift/downloaded/Hyperspace Suite/2 min · ozoresident/wishlisted/Neon Garden EP/5 min ·
stellarfan99/downloaded/Deep Fold/8 min · psy_pilgrim/downloaded/Aurora Borealis/12 min ·
xeno_flux/wishlisted/Static Dreams/15 min · nebula_echo/downloaded/Voidspace/22 min ·
freq_hunter/downloaded/Modular Hearts/31 min · drifter_k/wishlisted/Infinite Loop/44 min

## Prismodell
`FREE_MAX_SECONDS = 3600` (60 min), `MIX_PRICE_NOK = 150`. < 60 min gratis for alle innloggede;
≥ 60 min = 150 kr, men alltid gratis hvis `track.artistSubscription === 'pro'`.
