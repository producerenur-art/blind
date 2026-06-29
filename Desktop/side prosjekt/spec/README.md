# SoundCore — komplett funksjonsspesifikasjon (gjenoppbyggings-spec)

Dette er en **fullstendig spesifikasjon av alt SoundCore gjør i dag**, laget for at en ny
nettside kan bygges fra bunnen **uten å miste en eneste funksjon**. Hver fil beskriver et
domene: hva brukeren ser og gjør, hvordan det oppfører seg (inkl. kanttilfeller), og den
konkrete datamodellen i dagens kode (globale objekter, lagringsnøkler, Gun.js-noder,
Supabase, API). Kuraterte datalister ligger ordrett i [data/](data/).

## Hvordan bruke denne speccen til å bygge ny side

1. Les [[00-arkitektur]] først — den gir helheten: stack, rutetabell, navigasjon, alle
   globale objekter, samlet lagringsinventar og miljøvariabel-navn.
2. Bygg domene for domene (01–12). Hver fil er selvstendig og peker til relaterte filer.
3. Kopier kuraterte data ordrett fra [data/](data/) (eller fra kildefilene de peker til).
4. **Hybrid-spec:** atferd er bindende; dagens implementasjon (vanilla JS / Gun.js / Supabase
   / Vercel) er referanse — du står fritt til å modernisere stacken så lenge oppførselen og
   alle funksjoner bevares.

## Domeneoversikt (innholdsfortegnelse)

| Fil | Dekker |
|-----|--------|
| [[00-arkitektur]] | Stack, rutetabell, globale objekter→fil, lagringsinventar, deps, env-navn, lasterekkefølge |
| [[01-skall-nav-sok]] | index.html-skall, persistent nav, sidedekkende søk, toasts, modaler, control-dock, About-tab, drabare widgets |
| [[02-auth-kontoer]] | Registrer/login/aktiver/reset, økt, presence, følg, venner, roller, abonnement, QR, sletting |
| [[03-profil]] | Profil vis/rediger, faner (Om/Innhold/Innlegg/Gjestebok), tema, media, festivaler/DAW/plattformer, custom blocks, butikk |
| [[04-spiller-og-lyd]] | Vedvarende musikkspiller, kø, shuffle/repeat, drag/dock, eksterne embeds, embed-panel |
| [[05-radio]] | 30 stasjoner, egne strømmer, eksterne embeds, visualizer, AI-assistent, favoritt, radio-dock, verdens-radiosøk |
| [[06-discover]] | Musikk/opplasting/radio-underfaner, sjangerfilter, finn-folk, kuraterte faner, Ambient Mann, Drone Zone, prismodell |
| [[07-world-shows-underground]] | World-katalog, ukentlig sendeskjema, techno-underground |
| [[08-sosialt-og-chat]] | Radio-chat, venner, vennechat, kommentarer/reaksjoner, community-vegg, varsler, 1:1 privatmelding |
| [[09-ai-voice-bughelp]] | AI-proxy, Core-assistent, A1-fane, stemmelag, feilfanger |
| [[10-studio-video-marked-betaling]] | Blend Studio, videoredigerer (ffmpeg), markedsplass (Stripe), Pro-abonnement |
| [[11-bakgrunn-pwa-deploy]] | Animert bakgrunn/UFO, PWA, Vercel-deploy, gun-relay, ikoner, språkvelger, lagrings-wrappere, e-post |
| [[12-api-backend]] | Alle api/-funksjoner, Supabase-skjema, miljøvariabler |

### Datavedlegg ([data/](data/))

| Fil | Innhold |
|-----|---------|
| [[data/radiostasjoner]] | Alle 30 STATIONS + 3 eksterne spillere, ordrett |
| [[data/discover-faner]] | GENRES, MAIN_CATEGORIES, ROLES, CATEGORY_MIXES, GENRE_RADIO_CATS, kuraterte fanenavn |
| [[data/drone-artister]] | DRONE_ARTISTS (10 m/biografi) + DRONE_LABELS (7), ordrett |
| [[data/world-katalog]] | World festivaler/klubb/labels/artister/radioer + shows + underground, ordrett |
| [[data/a1-galleri]] | A1 LINKS + VIDEOS + søkemotorer, ordrett |
| [[data/lenker-spraak-lister]] | Sosiale/label-lenker, plattformer, profil-festivaler/DAW/streaming, språkliste |

## Produktoppsummering

SoundCore er en desentralisert sosial plattform for elektronisk musikk, radio og DJ-miks.
Kjernebiter: **profil/identitet**, **radio** (kuraterte strømmer + hele verdens web-radio +
visualizer), **discover** (last opp/oppdag musikk + kuraterte sjanger-/label-faner),
**sosialt lag** (venner, chat, kommentarer, varsler, community-vegg — alt sanntid via Gun.js),
**AI** (Core- og A1-assistent + stemme), **skapende verktøy** (Blend Studio, videoredigerer),
**handel** (Pro-abonnement + sang-markedsplass), og et gjennomgående psykedelisk grensesnitt
(animert bakgrunn, UFO, ~100 språk via Google Translate, PWA-installerbar).

## Prosjektregler som gjelder denne speccen

- Alle `.md` ≤ 200 linjer → del med `[[peker]]` ved overskridelse.
- All beskrivende tekst i **norsk bokmål** (kildekoden er ofte nynorsk; ordrett data i
  `data/` beholder kildens skrivemåte).
- Hemmeligheter nevnes kun ved **navn** (aldri verdier).

## Dekningssjekkliste (alle moduler/ruter dekket)

- **Moduler (js/):** app, router, config, db, storage → [[00-arkitektur]] + [[01-skall-nav-sok]];
  auth → [[02-auth-kontoer]]; profile, videoEditor → [[03-profil]]/[[10-studio-video-marked-betaling]];
  player, playerDrag → [[04-spiller-og-lyd]]; radio, radioDock, radioSearch → [[05-radio]];
  discover → [[06-discover]]; world, shows, underground → [[07-world-shows-underground]];
  chat, friends, friendchat, social, realtime, notify, community, dj → [[08-sosialt-og-chat]];
  ai, aiAssistant, a1, voice, bugHelp → [[09-ai-voice-bughelp]];
  studio, marketplace, payment → [[10-studio-video-marked-betaling]];
  background, icons, lang, langDrag, platform, platformDrag, navDrag, footerDrag, dock,
  aboutTab, email, script → [[01-skall-nav-sok]]/[[11-bakgrunn-pwa-deploy]].
- **API (api/):** chat, send-email, create-checkout, verify-session, stripe-webhook,
  marketplace, upload-url, youtube, _hmac, _plans → [[12-api-backend]].
- **Ruter:** komplett tabell i [[00-arkitektur]].
