# 01 — Skall, navigasjon, søk og UI-infrastruktur

**Formål:** Det vedvarende app-skallet som alltid er montert rundt rutene: nav, søk, dock,
modaler, toasts, About-tab og alle flyttbare widgets. Relatert: [[00-arkitektur]],
[[11-bakgrunn-pwa-deploy]] (bakgrunn/PWA/ikoner/språk/e-post).

## App-skall (index.html + `App`)

- `#bg-layer` (bakgrunn/UFO — se [[11-bakgrunn-pwa-deploy]]), `#main-nav`, `#app` (ruter
  rendres hit), `#toast-container`, `#modal-overlay`/`#modal-box`, `#player-bar`,
  `#radio-dock`, skjult `#audio-engine`, `#embed-panel`, `#dock`, `#about-tab`.
- `App.init()` bootstrapper ruter, nav, søk og en heartbeat (~5 min) som holder bruker online.
- **Toasts:** `App.toast(melding, type, varighet)` — type `info|success|error`, auto-lukk.
- **Modal:** `App.openModal(html)` / `App.closeModal()` — fullskjerm overlay + backdrop.
- **Info-modal:** `App.showInfo()` — «Hva er Sound Core?» med ikon-punkter (dock-knapp).

## Persistent nav + sidedekkende søk

- `App.renderNav()` bygger nav etter innloggingsstatus (se lenkeliste i [[00-arkitektur]]),
  oppdaterer inbox-badge (`App.updateNavBadge()`), og kaller `NavDrag.refresh()`.
- **Søk (`#nav-search`)** er **sidedekkende**, aksent-ufølsomt (æøå/diakritikk normaliseres),
  grupperer treff i **Sider · Brukere · Radiostasjoner**:
  - Sider: matcher rutenavn/nøkkelord (intern `_searchPages()` — legg til faner her).
  - Brukere: `Auth.getAllPublicUsers()` på brukernavn/visningsnavn.
  - Radiostasjoner: `Radio.stations` på navn/kategori.
  - Tastatur: Enter = første treff, Escape = lukk. Resultater i `#search-results`-dropdown.

## Control-dock (`#dock`, `dock.js`)

Fast knapperad nede: **AI-assistent** (`Assistant.toggle()`), **Info** (`App.showInfo()`),
**språkvelger** (`#lang-widget`, se [[11-bakgrunn-pwa-deploy]]), **plattformbytter**
(`#platform-widget`), **Lenker** (`#dock-links` — sosiale/label-lenker, se
[[data/lenker-spraak-lister]]), **Bytt bakgrunn** (`BgManager.openPicker()`). `dock.js`
wirer åpne/lukk + lukk-på-utenfor-klikk for lenke-panelet.

## About-tab (`#about-tab`, `aboutTab.js`)

Uttrekkbar panel i høyre kant. Åpne/lukk på håndtak, lukkeknapp, klikk-utenfor, Escape, og
auto-lukk ved intern lenkenavigasjon. Innhold: community-invitasjon + kontakt-e-post,
«World Tour» (→ `#/shows`), «Latest Videos».

## Embed-panel (`#embed-panel`)

Flytende iframe-panel for ekstern media (SoundCloud/YouTube/Bandcamp m.m.). Valgfritt
søkefelt (`embedPanelSearch`) for SoundCloud-søk. `closeEmbedPanel()` lukker.

## Flyttbare widgets (felles mønster)

Alle bruker pointer-/touch-drag med 5px-terskel (kort drag ≠ klikk), viewport-klamring og
posisjon lagret i localStorage. Reset-funksjoner returnerer til dock.

| Widget | Modul | Tilstand (localStorage) | Spesielt |
|--------|-------|--------------------------|----------|
| Musikkspiller | `playerDrag.js` | `playerDragState` `{floating,minimized,enlarged,left,top}` | minimer/forstørr/dock — se [[04-spiller-og-lyd]] |
| Radio-dock | `radioDock.js` | `radioDockState` `{open,left,top}` | se [[05-radio]] |
| Språkvelger | `langDrag.js` | `langWidgetState` `{floating,left,top}` | — |
| Plattformbytter | `platformDrag.js` | `platformDragState` `{left,top}` | `PlatformDrag.reset()` |
| Footer | `footerDrag.js` | `footerWidgetState` `{floating,collapsed,left,top}` | minimer/gjenopprett; kjent død/orphan-kode finnes |
| Nav-bar | `navDrag.js` | (ingen) | hjul-vertikal → horisontal panorering; grab-cursor |
| Generisk knapp | `script.js` | (ingen) | gjør `#dragButton` drabar m/ viewport-klamring |

## Plattformbytter (`platform.js`)

Panel med lenker til mobil/desktop/App Store fra `CONFIG.PLATFORM_*` (fallback: gjeldende
URL / «kommer snart»). Lukk på utenfor-klikk.

## Min side / Inbox / Settings / Shop (rendret i app.js)

- **Min side (`#/minside`):** personlig dashboard.
- **Inbox (`#/inbox`):** samtale-fane (sortert nyeste) + venneforespørsel-fane; uleste-tellere;
  hurtig godta/avslå; «start ny chat»; inviter til chat. Metoder: `App.renderInbox`,
  `App.inboxAccept/inboxReject`, `App.startNewChat`, `App.inviteToChat`,
  `App.quickAddFriend/quickAcceptFriend`.
- **Settings (`#/settings`):** faner via `App.settingsTab()` — konto (e-post/passord/slett/
  reaktiver), bakgrunnseffekt + partikler + UFO-størrelse (se [[11-bakgrunn-pwa-deploy]]),
  filter-presets (`App.liveFilter/applyFilterPreset/saveFilterSettings`), site-tekster
  (`App.savePageTexts`), AI-nøkkel + EmailJS-config, betalingsmetode, rolle (`App.selectRole`),
  QR-innlogging (`App.generateQRLogin`), test-e-post. Lagre: `App.saveSettings`.
- **Shop (`#/shop`):** planer Free/Pro/Studio. `App.shopPlans` / `App.proBenefits`. Kjøp →
  [[10-studio-video-marked-betaling]].

## Integrasjonspunkter

`Auth` (innlogging/brukere/presence), `Router` (navigasjon), `Radio`/`Player` (avspilling),
`Notify` (varsler), `Social` (vegg), `Icon`/`Icons.hydrate` (SVG-ikoner via `data-icon`).
