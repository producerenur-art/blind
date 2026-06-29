# Data — World / Shows / Underground (ordrett fra kildefilene)

Hører til [[07-world-shows-underground]]. Felt forenklet; lenker gjengitt.

## World (`js/world.js`)

### FESTIVALS (7) — `{emoji,name,loc,dates,theme,tags,links}`
- 🌌 **Boom Festival** — Idanha-a-Nova, Portugal · Biennial · Jul · boomfestival.org +
  soundcloud.com/boomfestival
- 🔥 **OZORA Festival** — Dádpuszta, Ungarn · 27 Jul–4 Aug 2026 · ozorafestival.eu +
  soundcloud.com/ozora-festival
- 🌲 **Mo:Dem Festival** — Primišlje, Kroatia · 3–9 Aug 2026 · modemfestival.com +
  modemfestival.bandcamp.com
- 🌞 **Universo Paralello** — Pratigi, Bahia, Brasil · Biennial · Nyttår · universoparalello.org
- 🏔️ **Burning Mountain** — Zernez, Sveits · 25–28 Jun 2026 · burning-mountain.ch
- 🌏 **Earth Frequency Festival** — Woodford, QLD, Australia · 23–26 Oct 2026 ·
  earthfrequency.com.au
- 🕉️ **ZNA Gathering** — Montargil, Portugal · 15–22 Jul 2026 · znagathering.com

### CLUBS (1) — `{…, events, links}`
- 🏛️ **IT Athens** — Exarcheia, Athen, Hellas · 2 rom (Solomou 30 & Mpotasi 9), 58 arr. i 2026.
  Residentar: Plagger, MOSHBEAT, TYPEO, Human Cruelty, Brazi. **Planar framover:** «Community
  Night III» (3. jul 2026, ra.co/events/2477945), «IT Athens Closing Season — TYPEO · MOSHBEAT
  · Plagger» (11. jul 2026, ra.co/events/2477950). Lenker: ra.co/clubs/212119, Instagram
  itathensexarcheia.

### LABELS (9) — `{emoji,name,loc,links}`
🛸 Nano Records (UK, Full-on/Progressive) · 🌿 Iboga (Danmark) · ☀️ Suntrip (Belgia, Goa-revival)
· 🌑 Zenon (Australia, Dark Progressive) · 🌲 Parvati (Danmark, Forest/Full-on) · 🍄 Sangoma
(Forest/Darkpsy) · 🌊 Ultimae (Frankrike, Psybient/Ambient) · 🍃 Cosmicleaf (Hellas, Psychill/
Downtempo) · ⚡ Dacru (Belgia, Full-on/Psytrance). Hver med web + Bandcamp/Spotify (se world.js).

### ARTISTS (8) — `{emoji,name,loc,links}`
🌠 Astral Projection (Israel, Goa/Psytrance 1991) · ✨ Shpongle (UK, Psybient) · 🍄 Infected
Mushroom (Israel) · 🌀 Astrix (Israel, Full-on) · 🚀 Vini Vici (Israel) · 🧬 Carbon Based
Lifeforms (Sverige, Psybient/Ambient) · 🌅 Solar Fields (Sverige, Ultimae) · 🔊 Ott (UK, Dub/
Psybient).

### RADIOS (6) — `{emoji,name,loc,links}` (links kan ha `{play: stationId}`)
🍄 DMT-FM (Tenerife · play: dmtfm) · 🧿 Psyndora (play: psyndora) · 📻 PsyRadio.fm (Tyskland, 4
kanaler siden 2004) · 🌈 Psychedelic.FM · 🕉️ Suburbs of Goa (play: suburbsofgoa) · 🌀 The Trip
(play: thetrip).

## Shows (`js/shows.js`) — SHOWS (8) `{id,name,host,day,startHour,endHour,genre,emoji,color,desc,stream}`
- Stellar PSY Night — Stellar Collective — søn 22→02 — Psytrance/Psychedelic — stream stellar-psy
- Drone Morning — Ambient Collective — man 07→10 — Ambient/Drone — dronezone
- Techno Underground — DJ Digitalis — tir 21→24 — Techno/Minimal — digitalis
- Chill Wednesday — Lush Sessions — ons 18→21 — Chill/Downtempo — lush
- Space Travel — Cosmic Station — tor 23→03 — Space Music/Ambient — spacestation
- Groove Friday — Nu-Jazz Collective — fre 20→23 — Nu-Jazz/Trip-Hop — sonicuniverse
- Deep Space Saturday — Deep Space One — lør 00→04 — Deep Ambient/Electronic — deepspaceone
- Mission Control Sunday — Space Command — søn 14→18 — Ambient Space Music — missioncontrol

`DAYS_NO = [Søndag…Lørdag]`, `DAYS_EN = [Sun…Sat]`. Arkiv (6) er hardkodet i shows.js.

## Underground (`js/underground.js`)

### ENGLAND_ARTISTS (6) `{name,city,desc,ra,sc,tag}`
Surgeon (Birmingham · Industrial Techno) · Blawan (Yorkshire · Industrial/Breaks) · Perc
(London · Hard Techno) · Andy Stott (Manchester · Dark Techno) · Truss (London · Minimal
Techno) · Dave Clarke (Brighton · Detroit Techno). Lenker: ra.co/dj/… + SoundCloud.

### IBIZA_ARTISTS (6)
Carl Cox (Ibiza/Brighton · Techno/Tech House) · Ricardo Villalobos (Ibiza/Berlin · Minimal,
sc null) · Loco Dice (Ibiza · Tech House/Techno) · DJ Harvey (Ibiza · Eclectic/House, sc null)
· Sven Väth (Ibiza/Frankfurt · Techno) · Joseph Capriati (Ibiza/Napoli · Techno/Tech House).

### VENUES_UK (4) `{name,city,desc,url,tag,events}`
fabric (London · Club · fabriclondon.com) · Printworks (London · Venue) · Warehouse Project
(Manchester · Festival/Club) · Sub Club (Glasgow · Club, siden 1987). Events: ra.co-lenker.

### VENUES_IBIZA (4)
DC-10 (Circoloco · circoloco.com) · Amnesia (amnesia.es) · Hï Ibiza (hiibiza.com) · Ushuaïa
(Open Air · ushuaiaibiza.com). Events: ra.co-lenker.

### MUSIC_LINKS (6) `{name,desc,url,color,icon}`
SoundCloud — Techno (#ff5500 ☁️) · Boiler Room (YouTube @BoilerRoomTV, #e00 ▶) · RA Podcasts
(ra.co/podcasts, #7c3aed 🎙) · Mixcloud — Techno (#5000ff 🌀) · Beatport Techno (#01ff95 🎵) ·
Bandcamp — Techno (#1da0c3 🎸). Demo-kontakt: demos@soundcore.no.
