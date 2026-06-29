# 03 — Profil (visning, redigering, media)

**Formål:** Brukerprofiler med visning, full redigerer, temaer, media-opplasting, festival-/
DAW-/plattform-valg, egne lenker, custom page-blokker, butikk og gjestebok. Modul:
`profile.js` (global `Profile`). Ruter: `#/u/:username`, `#/edit`, `#/minside`.

## Funksjoner (brukervendt)

- **Vis profil** (`#/u/:username`): hero-banner, avatar, bio, rolle-badge, statistikk
  (opplastinger, venner, gjestebok), online-prikk (grønn hvis ping < ~2 min).
- **Profilfaner** (`Profile.switchTab`):
  - **Om:** bio, lenker, rolle-badge, venneliste + ventende forespørsler, favorittradio,
    festivaler, DAW-er, streamingplattformer, egne lenker (My Sites), custom page-blokker
    (tekst/bilde/CTA/**nedtelling**/YouTube).
  - **Innhold:** musikkspiller (egne spor), butikk-seksjon, miks, mediegalleri.
  - **Innlegg:** brukerens community-poster (tekst/lyd/video/YouTube/blend) — se
    [[08-sosialt-og-chat]].
  - **Gjestebok (vegg):** kommentarer fra andre + komponist for nye — drevet av `Social`/Gun.
- **Rediger profil** (`#/edit`, kun eier): bio + lenker; avatar + banner-opplasting; **tema**
  (primær/sekundær-farge, bakgrunn = solid/gradient/bilde/video/musikk-visualizer, tekstfarge,
  aksent, font, kortstil, layout); synlighet privat/offentlig.
- **Media-opplasting:** musikkfiler (audio), DJ-miks (drag-and-drop; opptil 20t for Pro,
  3t gratis), bilder/video, YouTube-innbygging (URL-uttrekk). Eksport fra Blend Studio og
  videoredigerer kan lagres hit (se [[10-studio-video-marked-betaling]]).
- **Festivaler / DAW / streaming:** velg fra forhåndsdefinerte lister (toggle + lagre).
  Listene ordrett: [[data/lenker-spraak-lister]].
- **Egne lenker (My Sites):** emoji + tittel + beskrivelse + URL (`addMySite`/`deleteMySite`).
- **Venne-knapper:** legg til / godta / avslå / fjern (via `Auth`, [[02-auth-kontoer]]).
- **Butikk-seksjon:** selg egne sanger (Stripe Connect) — se [[10-studio-video-marked-betaling]].

## Nøkkelmetoder (`Profile`)

`renderView(username)` · `switchTab(tab)` (`om|innhold|innlegg|vegg`) ·
`sendFriendRequest/acceptFriend/rejectFriend/removeFriend(username)` ·
`toggleProfileVisibility(username)` · `toggleFestivalItem/saveFestivals` ·
`togglePlatformItem/savePlatforms` · `addMySite/deleteMySite` · `uploadMedia(...)`. Hjelpere:
`avatarEl`, `festivalBadgesHtml`, `platformsBadgesHtml`, `mySitesViewHtml`, `cssFilters`,
`applyTheme`.

## Datamodell (i dag)

- Profildata lagres i `Auth`-brukerobjektet (tema, bio, festival-ider, DAW-er,
  streamingplattformer, mySites, customPage.blocks, mediaIds/musicIds/mixIds, avatar/banner).
- **localStorage:** `pv_wall_<username>` (eldre gjestebok; nyere via `Social`-Gun-noder).
- **Media:** Supabase Storage (`soundcore-media`) for delt media; IndexedDB (`DB`) lokalt;
  signert opplasting via `api/upload-url` (Vercel 4.5MB-grense omgås).
- **Forhåndsdefinerte lister (i `profile.js`):** `FESTIVALS` (18), `DAWS` (15),
  `STREAMING_PLATFORMS` (10), `EVENT_TYPES` — ordrett i [[data/lenker-spraak-lister]].

## Integrasjonspunkter

`Auth` (hent/oppdater bruker, venner), `Social`/`Community` (vegg + innlegg),
`FriendChat` (DM-knapp), `Notify`/`Email` (forespørsel-varsler), `DB`/`SC_Storage` (media),
`VideoEditor`/`Studio`/`Marketplace`. AI-forslag (bio/farge/layout): se [[09-ai-voice-bughelp]].
