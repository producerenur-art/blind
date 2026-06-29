# 11 — Bakgrunn, PWA, deploy og felles tjenestelag

Visuelt skall, installerbarhet, deploy og delte hjelpemoduler (ikoner, språk, lagring, e-post).

## Animert bakgrunn + UFO (`background.js`, `BgManager`)

**Formål:** Psykedelisk animert bakgrunn med effekter, partikler og et drabart UFO.
- **Funksjoner:** last opp egen bakgrunn (IndexedDB `site_bg_v1`) eller bruk innebygd
  slideshow (7 bilder); **5 effekt-presets** (cosmos/psychedelic/acid/space/chill — styrer
  hue/breathe/saturasjon/lysstyrke); **partikler** (stars/bubbles/sparks/aurora/none, canvas);
  **UFO** (kun synlig ved cosmos): drabart, 4 størrelser (small/medium/large/fullscreen),
  dobbeltklikk = reset; animasjoner pauses når fanen er skjult.
- **Metoder:** `init/uploadImage/setEffect/setUfoSize/resetUfoFree`. localStorage:
  `pv_bg_effect` (default cosmos), `pv_bg_particles` (default stars), `pv_ufo_size`, `pv_ufo_free`.
  Velges også i Settings (se [[01-skall-nav-sok]]).

## Ikoner (`icons.js`, `Icon`/`Icons`)

100+ tynne SVG-ikoner (Lucide/Feather-stil) + emoji→ikon-mapping (200+). `Icon(name, opts)`
gir SVG (ukjent → sparkles); `iconForEmoji(char, fallback, opts)`; `Icons.hydrate(root)`
konverterer `<span data-icon="navn">` → SVG. **`psychedelicCover(seed, opts)`** lager
deterministiske swirl-thumbnails (FNV-1a-hash → fargeskjema, conic+radial gradient, hover-spin)
— stabil per radiostasjon. Injiserer også «Butikk»-fane-placeholder på profil via MutationObserver.

## Språkvelger (`lang.js` + `langDrag.js`)

Flytende velger som driver **Google Translate** (ikke egen i18n). ~100 språk (`LANGUAGES`,
felt `code/name/flag`), aksent-ufølsomt søk, ekte flagg, «flagg + KODE»-etikett. **Må være
`notranslate`** ellers oversetter dropdownen seg selv og søket slutter å matche. Setter
`<select.goog-te-combo>` og fyrer change. localStorage: `stellar-lang`. `selectLang(lang)`.
Språkliste: [[data/lenker-spraak-lister]].

## Lagrings-wrappere

- **`db.js` (`DB`, IndexedDB):** stores `media/music/blends/mixes`. Metoder `open/put/get/
  getAll/delete/getAllByIds/storeFile/getBlobUrl/invalidateBlobCache`. Poster: `{id,data
  (ArrayBuffer),type,name,size, …}`.
- **`storage.js` (`SC_Storage`, Supabase):** `isConfigured/upload(file,{prefix,bucket,
  onProgress})/client()`. Flyt: hent signert URL fra `api/upload-url` → last direkte til
  Supabase (omgår 4.5MB) → returner delt URL. Faller til lokal `DB` hvis ukonfigurert
  (`Error('not-configured')`). Bøtter: `soundcore-media` (offentlig), `songs` (privat).
- **`config.js` (`CONFIG`):** `ANTHROPIC_API_KEY` (`pv_anthropic_key`), EmailJS-felt
  (`pv_ejs_*`), `SITE_URL`, plattform-URL-er, `SUPABASE_URL/ANON_KEY/BUCKET`. `CONFIG.save(...)`.

## E-post (`email.js`, `Email`)

Prøver `api/send-email` (Resend) først, faller til EmailJS, dev-konsoll på localhost.
- Metoder: `sendActivation`, `sendPasswordReset`, `sendPurchaseConfirmation`,
  `sendFriendRequest`, `sendMessageNotification`, `sendTestEmail`, `isConfigured`.
- Brukes av [[02-auth-kontoer]], [[08-sosialt-og-chat]], [[10-studio-video-marked-betaling]].

## PWA + service worker

- `manifest.json`: navn SoundCore, `start_url=/?source=pwa`, `display=standalone`, tema
  `#0a0a0f`, ikoner 192/512/maskable, kategorier music/social/entertainment.
- `sw.js` (`CACHE='soundcore-v1'`): **bevisst konservativ** — cacher kun same-origin GET
  statiske filer (stale-while-revalidate); navigasjon = nett-først med offline-skall-fallback;
  Gun/Supabase/`/api/`/cross-origin går rett til nett. `?v=`-cache-busters gir nye URL-er.
  Ikoner genereres via `tools/gen-pwa-icons.js`.

## Deploy + Gun-relay

- **Vercel**, auto-deploy fra `main`. **Hobby = maks 12 serverless-funksjoner** →
  markedsplass-backend holdes ute via `.vercelignore` til Supabase/Stripe er satt opp (koden
  blir i repoet). Se [[12-api-backend]].
- **Gun-relay** (`tools/gun-relay/`): egen alltid-på-relay (Node `relay.js` eller Deno
  `deno-relay.ts`) for verifisert browser↔browser-sync (offentlige relays er ustabile).

## Integrasjonspunkter

Brukes på tvers: `DB`/`SC_Storage` (media), `Icon` (UI), `CONFIG` (nøkler), `Email`
(transaksjons-e-post), `BgManager` (skall). Settings styrer bakgrunn/effekter ([[01-skall-nav-sok]]).
