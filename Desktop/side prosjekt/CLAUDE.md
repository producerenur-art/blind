# SoundCore — Agent Instructions

## Prosjektoversikt

SoundCore er en desentralisert musikk/audio sosial plattform bygget med:

- **Frontend**: Vanilla JavaScript, HTML/CSS (ingen build-step)
- **Data**: Gun.js (desentralisert real-time), localStorage, IndexedDB
- **Backend**: Vercel serverless functions (`api/`-katalogen)
- **Deployment**: Vercel (auto-deploy fra `main`-branch)
- **E-post**: EmailJS
- **Autentisering**: Egenutviklet med Gun.js

Moduler i `js/`: `app.js`, `auth.js`, `chat.js`, `radio.js`, `player.js`, `profile.js`,
`discover.js`, `dj.js`, `studio.js`, `underground.js`, `shows.js`, `db.js`, `ai.js`,
`background.js`, `lang.js`, `payment.js`, `platform.js`, `router.js`

---

## WAT-rammeverket (Workflows · Agents · Tools)

Arkitekturen separerer ansvar: probabilistisk AI håndterer resonnering, deterministisk kode
håndterer eksekvering.

**Layer 1 — Workflows** (`workflows/`): Markdown SOPs som definerer mål, nødvendige inputs,
hvilke tools som brukes, forventede outputs, og kanttilfeller.

**Layer 2 — Agent (deg)**: Du koordinerer intelligent. Les relevant workflow, kjør tools i
riktig rekkefølge, håndter feil, og still avklarende spørsmål ved behov. Du kobler intensjon
til eksekvering uten å prøve å gjøre alt selv.

**Layer 3 — Tools** (`tools/`): Node.js-skript for deterministisk eksekvering — API-kall,
datatransformasjoner, filoperasjoner. Secrets og API-nøkler lagres i `.env`.

**Hvorfor dette fungerer**: Når AI prøver å håndtere hvert steg direkte, synker nøyaktigheten
fort. Fem steg à 90% gir 59% suksess. Ved å avlaste eksekvering til deterministiske skript
forblir du fokusert på orkestrering og beslutningstaking.

---

## Hvordan operere

**1. Se etter eksisterende tools først**
Sjekk `tools/` før du bygger noe nytt. Opprett kun nye skript når ingenting dekker oppgaven.

**2. Lær og tilpass ved feil**
- Les hele feilmeldingen og stack trace
- Fiks skriptet og test på nytt (sjekk med meg før re-kjøring ved betalte API-kall)
- Dokumenter det du lærte i workflowen (rate limits, timing, uventet oppførsel)

**3. Hold workflows oppdatert**
Workflows skal utvikle seg etter hvert som du lærer. Opprett eller overskriv aldri workflows
uten å spørre, med mindre du eksplisitt får beskjed om det.

---

## Kritiske regler

```
ER DU USIKKER PÅ NOE → SPØR ALLTID FØRST. Aldri anta.
Alle .md-filer maks 200 linjer → del med [[peker]]-referanser ved overskridelse
Aldri deploy/push uten eksplisitt "push it" / "deploy" / "ship it" fra bruker
Alle secrets i .env — aldri hardkod, aldri logg verdier, aldri commit
.env skal alltid stå i .gitignore — verifiser før hver commit
```

---

## Filstruktur

```
workflows/          # Markdown SOPs (arbeidsinstruksjoner)
tools/              # Node.js utility-skript for deterministisk eksekvering
api/                # Vercel serverless functions
js/                 # Frontend vanilla JS moduler
.env                # API-nøkler og hemmeligheter (aldri commit)
CLAUDE.md           # Denne filen — hoveddirektiv
CLAUDE-automation.md  # Trigger.dev Workflow Builder referanse →
```

---

## Relaterte dokumenter

- [CLAUDE-automation.md](CLAUDE-automation.md) — Trigger.dev TypeScript automations
  (for fremtidig automatiseringsarbeid ved siden av dette prosjektet)

  ## gjentagende prompter

  - hvis jeg må be deg gjøre ting 2 ganger skal du alltid undersøke hvorfor det ble slik og oppdatere minnet ditt. alltid en .md fil med riktige pointere og riktig kontekst så du alltid finner frem.
