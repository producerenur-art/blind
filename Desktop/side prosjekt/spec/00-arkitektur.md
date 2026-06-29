# 00 — Arkitektur, ruter, globaler, lagring

Helheten i SoundCore. Detaljer per domene: se [[README]]-tabellen.

## Stack (i dag — referanse, ikke bindende)

- **Frontend:** Vanilla JS, HTML/CSS, **ingen build-step**. Moduler er IIFE-er som
  eksponerer ett globalt objekt hver (f.eks. `const App = (() => { … })()`).
- **Sanntid/data:** Gun.js (desentralisert), localStorage, IndexedDB.
- **Backend:** Vercel serverless functions i `api/`.
- **Lagring av media:** Supabase Storage (delt på tvers av brukere).
- **Betaling:** Stripe (abonnement + Connect-markedsplass). **E-post:** Resend (+ EmailJS-fallback).
- **AI:** Anthropic Claude via serverless proxy. **Oversettelse:** Google Translate-widget.
- **Deploy:** Vercel, auto-deploy fra `main`. PWA (manifest + service worker).

## SPA-router (hash-basert)

`Router.define(path, handler)` registrerer ruter; `Router.go(path)` navigerer;
`hashchange` driver dispatch. Dynamiske segmenter: `:param`. Ukjent rute → 404
(«Side ikke funnet»). Stale-dispatch-vakt hindrer at en eldre render overskriver en nyere.
Body får klasse `route-home` på `#/` (aktiverer hjemspesifikke visuelle effekter, f.eks. UFO).

### Komplett rutetabell

| Rute | Viser |
|------|-------|
| `#/` | Hjem: hero, radiokanaler, live-events, «nå spilles», DJ-miks-rutenett, brukere |
| `#/login` · `#/register` · `#/forgot` | Auth-skjemaer |
| `#/reset/:token` · `#/activate/:token` | Passord-reset / kontoaktivering via token |
| `#/u/:username` | Offentlig profil |
| `#/minside` | Egen dashboard (innlogget) |
| `#/edit` | Profilredigerer (innlogget) |
| `#/inbox` | Private meldinger + venneforespørsler |
| `#/settings` | Innstillinger (konto, bakgrunn, filtre, AI-/e-post-config, rolle, betaling, QR) |
| `#/shop` | Pro-abonnementsplaner |
| `#/radio` | Radio (stasjoner, visualizer, AI-assistent) |
| `#/chat` | Sanntids radio-chat (+ YouTube-fane) |
| `#/discover` | Oppdag/last opp musikk + kuraterte faner |
| `#/underground` | Techno-underground |
| `#/shows` | Ukentlig sendeskjema + arkiv |
| `#/world` | Global festival-/label-/artist-/radio-katalog |
| `#/a1` | A1: AI-chat + universalsøk + ukerotert galleri |
| `#/community` | Community-vegg (sanntid) |
| `#/friends` | Venner: online nå / mine venner |
| `#/studio` | Blend Studio (bilde/video-kompositor) |
| `#/messages/:username` | 1:1 privatmelding |
| `#/qr-login/:token` | Innlogging via QR-token |

## Navigasjonslenker (nav rendres dynamisk av `App.renderNav()`)

- **Utlogget:** Radio · Chat · Discover · Underground · Shows · World · A1 · Shop ·
  Login · Register (+ online/offline-indikator).
- **Innlogget (i tillegg):** Min side · Inbox (med badge) · @profil · Edit · Settings ·
  chat-knapp · Friends · varselbjelle · Logout (med grønn online-prikk).
- Inbox-badge = ventende venneforespørsler + uleste PM + uleste vegginnlegg + uleste varsler.

## Globale objekter → fil

`App, Router` (app.js, router.js) · `CONFIG` (config.js) · `DB` (db.js, IndexedDB) ·
`SC_Storage` (storage.js, Supabase) · `Auth` (auth.js) · `Profile` (profile.js) ·
`Player, PlayerDrag` (player.js, playerDrag.js) · `Radio, RadioDock, RadioSearch`
(radio.js, radioDock.js, radioSearch.js) · `Discover` (discover.js) ·
`World, Shows, Underground` · `DJ` (dj.js — **1:1 privatmelding**, ikke DJ-miks) ·
`Chat` (chat.js) · `Friends, FriendChat, Social, SC, Notify, Community`
(friends/friendchat/social/realtime/notify/community.js) · `AI` (ai.js) ·
`Assistant` (aiAssistant.js) · `A1` (a1.js) · `Voice` (voice.js) · `BugHelp` (bugHelp.js) ·
`Email` (email.js) · `Studio, VideoEditor, Marketplace, Payment` ·
`BgManager` (background.js) · `Icon/Icons` (icons.js) · `LangDrag, PlatformDrag, NavDrag,
FooterWidget` + `selectLang` (lang.js). Drag-hjelper for generisk knapp: script.js.

## Lagringsinventar

### localStorage (utvalg — fullt sett per modul i domenefilene)
- **Auth/økt:** `pv_users`, `pv_session`, `pv_online_<user>`.
- **Innstillinger/visuelt:** `pv_bg_effect`, `pv_bg_particles`, `pv_ufo_size`, `pv_ufo_free`,
  `pv_vis_size`, `stellar-lang`.
- **Drag-tilstander:** `playerDragState`, `radioDockState`, `langWidgetState`,
  `platformDragState`, `footerWidgetState`, `a1_chat_pos`, `a1_chat_min`, `aiAssistantState`.
- **Meldinger/sosialt:** `sr_pm_<a>_<b>`, `sr_pm_read_<user>`, `pv_chat_*`, `sc_fc_read`,
  `sc_fc_min`, `sc_autoshare`, `sc_wall_seen_<user>`, `sc_notif_local_<user>`, `sc_notif_seen_<user>`.
- **Innhold:** `pv_custom_streams`, `pv_disc_radios_<user>`, `sr_dl_paid_<user>`,
  `sc_dl_tokens`, `a1_user_videos`, `voice_*_<ns>`.
- **API-nøkler (klient):** `pv_anthropic_key`, `pv_ejs_*` (via `CONFIG`).

### IndexedDB (`DB`, binær media)
Stores: `media` (bakgrunn/avatar/cover), `music` (opplastede spor), `blends`, `mixes`.

### Gun.js-noder (sanntid, delt)
`profilverse_radio_chat_v1` (radio-chat) · `sc_dm_v1` (1:1 vennechat) · `sc_group_v1`
(gruppe-lounge) · `sc_posts_v1` (community) · `sc_comments_v1` · `sc_reactions_v1` ·
`sc_notif_v1` (per-bruker varsler). Relays: `relay.peer.ooo/gun`, `gun.defucc.me/gun`
(+ eldre fallbacks). Egen alltid-på-relay finnes i `tools/gun-relay/` (Node/Deno).

### Supabase
- Bøtter: `soundcore-media` (offentlig — delt media/forhåndsvisning), `songs` (privat —
  betalte nedlastinger, kun via signert URL).
- Tabeller (markedsplass): `sellers`, `products`, `purchases`. Se [[12-api-backend]].

## Eksterne avhengigheter / CDN-er

Gun.js, Supabase-JS, EmailJS, QRCode (qrcode@1.5.3), Google Translate element, Google Fonts
(Inter + Space Grotesk), ffmpeg.wasm (lazy, kun videoredigerer). API-er: Anthropic (proxy),
Resend (proxy), Stripe, YouTube Data API (proxy), Radio Browser API (de1.api.radio-browser.info),
SomaFM (strømmer), Resident Advisor / Bandcamp / SoundCloud (lenker + embeds).

## Script-lasterekkefølge (index.html, forenklet)

icons → config → storage → payment → background → db → auth → email → ai → player →
profile → videoEditor → marketplace → radio → radioSearch → chat → realtime → social →
friendchat → notify → community → friends → discover → underground → shows → world →
voice → a1 → dj → studio → router → app → platform(+drag) → lang(+drag) → playerDrag →
radioDock → footerDrag → navDrag → aiAssistant → bugHelp → dock → aboutTab →
Google Translate init → service worker-registrering. Statiske JS/CSS lastes med
`?v=`-cache-buster.

## Miljøvariabler (KUN navn — aldri verdier)

`ANTHROPIC_API_KEY` · `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `BUG_REPORT_EMAIL`, `SITE_URL` ·
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` · `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`SUPABASE_BUCKET` · `MARKETPLACE_TOKEN_SECRET`, `MARKETPLACE_ENABLED`, `PLATFORM_FEE_PERCENT` ·
`YOUTUBE_API_KEY`. Klient-config (`js/config.js`): `SUPABASE_URL`, `SUPABASE_ANON_KEY`,
`SUPABASE_BUCKET`, plattform-URL-er. **Vercel Hobby = maks 12 funksjoner** → se [[12-api-backend]].
