# 05 — Radio (stasjoner, visualizer, verdens-radiosøk)

**Formål:** Flerkilde-radio med 30 kuraterte stasjoner, egne strømmer, eksterne embeds,
Web Audio-visualizer, Claude-assistent for kanaltips, favoritt, flytende dock og søk i hele
verdens web-radio. Moduler: `radio.js` (`Radio`), `radioDock.js` (`RadioDock`),
`radioSearch.js` (`RadioSearch`). Rute: `#/radio`.

## Funksjoner (brukervendt)

- **Stasjonsbibliotek (30 stasjoner)** gruppert i kategorier (Stellar, Radio Q37,
  Psytrance/Goa, Progressive, EDM/House/Techno, Lo-Fi/IDM, Dub/Reggae, Psybient/Psychill,
  Chill/Downtempo, Ambient/Space, Drone/Dark Drone). Hver: emoji, navn, beskrivelse,
  play/mute. **Live-indikator** på aktiv kanal. Featured: «Stellar PSY». Full liste ordrett:
  [[data/radiostasjoner]].
- **Egne strømmer:** legg til URL (mp3/aac/ogg) + navn → lagres i `pv_custom_streams`;
  play/mute/slett.
- **Eksterne spillere (embeds):** Radio Q37 (LIVE), U‑Recken (Bandcamp), Dice Radio (LIVE) i
  resizbart panel (kant-drag; dobbeltklikk = reset). Liste: [[data/radiostasjoner]].
- **Verdens-radiosøk (Radio Browser API):** sanntidssøk på navn + tag (parallelt, dedup på
  UUID), favicon/land/sjanger/bitrate, spill inline eller lagre til egne strømmer.
- **Visualizer (canvas, 4 modus):** bars (regnbue-frekvens), circle (radielle eiker), wave
  (3-lags bølgeform), particles (bass-utløste partikler). Størrelser: small/medium/large/
  **full** (Esc lukker full). Bruker Web Audio fra delt kontekst (se [[04-spiller-og-lyd]]).
- **Nå spilles-panel:** kunst/emoji/navn, LIVE/Stoppet-badge, play/pause/stopp, volum + mute,
  «sett som favoritt» (innlogget → lagres på `Auth`-bruker som `favoriteRadio`).
- **AI-assistent (Claude):** åpne/lukk chat, flerspråklig, forslagsknapper; stasjonsnavn i svar
  blir klikkbare (spiller kanalen). Krever AI-nøkkel. Bruker `AI.radioChat(history, STATIONS)`
  (se [[09-ai-voice-bughelp]]).

## Nøkkelmetoder

- `Radio.render()` · `playStation(id)` · `playCustom(idx)` ·
  `playUrl(url, navnEllerInfo, emoji, color, desc)` · `togglePlay()` · `stopRadio()` ·
  `setVolume/volumeUp/volumeDown/toggleMute` · `setVisMode/setVisSize` ·
  `addCustomStream/removeCustom` · `searchRadio/onSearchInput/playSearchResult/saveSearchResult`
  · `toggleAiChat/sendAiMessage` · `openEmbed/closeEmbed` · `setAsFavorite` ·
  `stopForMusicPlayer` · `fetchStations(query)` (data-only) · getters `isPlaying,
  currentStation, volume, muted, stations`.
- **RadioDock** (`#radio-dock`): `sync/syncVol/toggleOpen/volUp/volDown/togglePlay/stop` —
  flytende kontroll som auto-vises når en stasjon er valgt; drag + tilstand `radioDockState`.
- **RadioSearch** (gjenbrukbar widget, montert på World/Shows): `widget()` returnerer HTML;
  `search/onInput/genre/clear/play/save`. 12 sjanger-snarveier (chips). API:
  `de1.api.radio-browser.info`.

## Datamodell (i dag)

- **Hardkodet i `radio.js`:** `STATIONS` (30; felt `id,cat,name,url,emoji,color,desc,
  featured?,live?`), `EXTERNAL_PLAYERS` (3), `CATEGORIES` (avledet). Ordrett: [[data/radiostasjoner]].
- **localStorage:** `pv_custom_streams` (delt med RadioSearch), `pv_vis_size`,
  `pv_radio_embed_size`. AI-historikk in-memory.
- **Strømmer:** primært SomaFM + spesialiserte radioer; verdenssøk via Radio Browser.

## Integrasjonspunkter

`Player`/Web Audio (delt kontekst), `RadioDock`, `Auth` (favoritt), `AI` (kanaltips),
`Router`/`App`, `Icon`. Brukes av [[06-discover]] (sjangerradio), [[07-world-shows-underground]]
(`tuneIn`).
