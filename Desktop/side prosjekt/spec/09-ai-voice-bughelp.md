# 09 — AI, stemme og feilhjelp

**Formål:** All AI-funksjonalitet (Claude via serverless proxy), de to chat-assistentene
(Core + A1), det delte stemmelaget, og den globale feilfangeren. Server-proxy: `api/chat`
(se [[12-api-backend]]).

## AI-proxy (`ai.js`, `AI`)

Wrapper rundt `/api/chat` (holder nøkkel server-side). Multi-turn, site-bevisst.
- **Funksjoner:** `generateBio(keywords, style)`, `suggestColors(mood)` (5-fargers palett),
  `generateCaption`, `generatePlaylistDesc`, `suggestLayout(bio)`, `profileDesignChat`
  (svar kan ha `[COLORS:…]`/`[BIO:…]`/`[LAYOUT:…]`-tagger som UI tolker), `siteAssistantChat`,
  `assistantChat(history, {langName, contextNote})`, `radioChat(history, stationList)`.
- `AI.hasKey()` sjekker om nøkkel er konfigurert. Modell i dag: `claude-haiku-4-5-20251001`
  (server-cap 1024 tokens). Ingen klient-lagring (alt proxyes).

## Core-assistent (`aiAssistant.js`, `Assistant`)

Flytende, drabar «Core»-widget (dock-knapp `Assistant.toggle()`).
- **Funksjoner:** multi-turn-chat, språkvelger, skrive-indikator, **stemme** (mikrofon inn,
  AI leser opp, opptak — via `Voice`), feilkontekst-modus (`openWithBug(ctx)` fra `BugHelp`),
  vennlig «kommer snart»-melding hvis AI ikke er konfigurert. Kontekst-bevisst (gjeldende
  rute + innlogget bruker i system-prompt).
- localStorage: `aiAssistantState` `{x,y,open}`, `ai_assistant_lang`. Historikk in-memory.
- Metoder: `toggle/open/close/send/openWithBug`.

## A1-fane (`a1.js`, `A1`, `#/a1`)

Egen side: drabar A1-chat + gratis universalsøk + ukerotert galleri. Alt gratis.
- **Funksjoner:** søkefelt som enten **spør A1** (`askA1FromSearch` → `AI.assistantChat`)
  eller åpner eksternt søk i ny fane (Google/DuckDuckGo/YouTube/Wikipedia/Brave via `ENGINES`);
  **«Ukas nettsteder»** (eierkuraterte `LINKS`, roterer ukentlig, logo-kort); **«Ukas videoer»**
  (`VIDEOS` + brukerlagrede via `a1_user_videos`, YouTube-embeds, roterer ukentlig, klikkbar
  thumbnail-stripe); innlogget bruker kan legge til egne videoer; drabar chat (`a1_chat_pos`,
  `a1_chat_min`) med eget stemmelag (`Voice`, egen språkvelger, default fra `stellar-lang`).
- Data ordrett (`LINKS` 8, `VIDEOS` 6, `ENGINES` 5): [[data/a1-galleri]].
- Metoder: `render/searchOn/askA1FromSearch/addVideo/featureVideo/chatAsk/toggleChat`.

## Stemmelag (`voice.js`, `Voice`)

Delt lag for AI-paneler: mikrofon-inn (Web Speech Recognition), AI-opplesing
(`speechSynthesis`), og opptak (MediaRecorder → tekstlogg `.txt` + lyd `.webm`).
- `Voice.create({ns, withLang, getLangCode, onText, defaultLang})` → kontroll-objekt
  (`el, speak, log, langCode, langName, stopListening, isRecording`). `Voice.supported`
  (`{stt,tts,record}`), `Voice.langNameFor`, `Voice.bcp47`. 30+ språk (BCP-47).
- localStorage per namespace: `voice_log_<ns>` (maks 400), `voice_spk_<ns>`, `voice_rec_<ns>`,
  `voice_lang_<ns>`. Brukes av Core (`aiAssistant.js`) og A1 (`a1.js`).

## Feilhjelp (`bugHelp.js`, `BugHelp`)

Global JS-feilfanger → vennlig toast «Noe gikk galt» med **«Spør Core»** (åpner Core med
feilkontekst) og **«Rapporter feil»** (sender til eier via `api/send-email` type `bug_report`).
Auto-lukk ~14s, maks 4 toasts/økt, dedup på `message|source|line`, filtrerer støy (cross-origin,
ResizeObserver). Metoder: `capture/report/_context`.

## Integrasjonspunkter

`api/chat` (all AI), `Voice` (stemme), `Auth` (kontekst), `App` (toast), `api/send-email`
(feilrapport), `Profile` (bio/farge/layout-forslag), `Radio` (kanaltips).
