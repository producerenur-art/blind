// AI — Claude integration. All calls go through the serverless proxy
// (/api/chat) so the API key stays server-side (process.env.ANTHROPIC_API_KEY).
const AI = (() => {
  const PROXY_URL = '/api/chat';
  const MODEL     = 'claude-haiku-4-5-20251001'; // fast + cheap for UI features

  // Core transport: send {system, messages} to the proxy, get text back.
  async function proxyCall(system, messages, maxTokens = 400, model = MODEL) {
    const res = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ system, messages, max_tokens: maxTokens, model }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return (data.text || '').trim();
  }

  // Single-turn helper
  function callClaude(systemPrompt, userPrompt, maxTokens = 300) {
    return proxyCall(systemPrompt, [{ role: 'user', content: userPrompt }], maxTokens);
  }

  // ── Site knowledge base — what the assistant knows about the platform ──
  const SITE_KNOWLEDGE = `Sound Core er en desentralisert sosial plattform for elektronisk musikk, radio og DJ-miks.

NAVIGASJON (hash-ruter):
- Hjem (#/): oppdag brukere og utvalgt musikk
- Radio (#/radio): live-strømming, 40+ kanaler (psytrance, ambient, techno, deep dub m.m.) — velg kanal for å spille
- Discover (#/discover): algoritmisk musikkoppdaging, sjangre, trender
- Chat (#/chat): desentralisert sanntidschat (Gun.js, ingen server)
- DJ (#/dj): DJ-miks og private meldinger
- Studio (#/studio): blend-studio for å lage visuelle komposisjoner og eksportere
- Shows (#/shows): festivaler og arrangementer
- Min side (#/minside): din egen profil
- Innstillinger (#/settings): konto, abonnement, AI
- Innboks (#/inbox): venneforespørsler og meldinger

SLIK GJØR MAN TING:
- Laste opp sang/musikk: Gå til profileditoren (#/edit) → fanen «Musikk» → «Last opp musikk» (lyd-filer). Musikken vises på profilen din og kan spilles i spilleren.
- Laste opp DJ-miks: Profileditor (#/edit) → dra/slipp i «Last opp DJ Mix».
- Laste opp bilder/video: Profileditor (#/edit) → «Media»-fanen.
- Legge til venner: Finn en bruker (søk øverst, eller kort på Hjem/Discover) → klikk «+ Legg til venn». Du kan også gå til en profil (#/u/brukernavn). Aksepter forespørsler i Innboksen (#/inbox).
- Tilpasse profil: Profileditor (#/edit) → endre bio, avatar, banner, farger, bakgrunn, layout, strømmelenker (Spotify, Apple Music, SoundCloud, YouTube).
- Spille radio: #/radio → klikk en kanal. Spilleren nederst styrer av/på, neste, volum.
- Bytte bakgrunn på siden: Klikk bilde-knappen i kontroll-dokken nede til høyre.
- Bytte språk: Språk-knappen (globus) i dokken.
- Pro-abonnement: #/settings → oppgrader (Sound Core Pro, månedlig) for ekstra funksjoner.

Dokken nede til høyre samler: AI-assistent (deg), språk, plattform, lenker og bakgrunn.`;

  return {
    // Serverless proxy means the key is always available server-side.
    hasKey() { return true; },

    // Generate a polished bio from keywords
    async generateBio(keywords, style = 'kreativ') {
      const styles = {
        kreativ:      'skriv kreativt og personlig',
        profesjonell: 'skriv profesjonelt og konsist',
        morsomt:      'skriv morsomt og lettlest',
        poetisk:      'skriv poetisk og stemningsfullt',
      };
      return callClaude(
        'Du er en ekspert på å skrive profiltekster for sosiale medier. Svar KUN med bio-teksten, ingen forklaring. Maks 3 setninger.',
        `Lag en ${styles[style] || 'kreativ'} bio basert på disse nøkkelordene: ${keywords}. Skriv på norsk.`,
        200
      );
    },

    // Suggest a color palette from a mood/description
    async suggestColors(mood) {
      const result = await callClaude(
        'Du er en fargedesigner. Returner KUN et JSON-objekt med 5 hex-farger, ingen forklaring. Format: {"primary":"#...","secondary":"#...","bg":"#...","text":"#...","accent":"#..."}',
        `Lag en fargepalett for denne stemningen: "${mood}". Mørk, moderne estetikk.`,
        150
      );
      try {
        const match = result.match(/\{[\s\S]*\}/);
        if (!match) throw new Error();
        return JSON.parse(match[0]);
      } catch {
        return null;
      }
    },

    // Generate a caption for a media item
    async generateCaption(description) {
      return callClaude(
        'Du er en kreativ tekstforfatter for sosiale medier. Svar KUN med en kort, engasjerende bildetekst på norsk. Maks 2 setninger.',
        `Lag en bildetekst for: ${description}`,
        120
      );
    },

    // AI playlist description
    async generatePlaylistDesc(trackNames) {
      return callClaude(
        'Du er en musikkkritiker. Lag en kort, stemningsfull spillelistebeskrivelse. Svar KUN med beskrivelsen, maks 2 setninger, på norsk.',
        `Spilleliste med disse sangene: ${trackNames.join(', ')}`,
        150
      );
    },

    // Suggest profile layout/style based on bio
    async suggestLayout(bio) {
      const result = await callClaude(
        'Du er en UX-designer. Returner KUN et JSON-objekt: {"layout":"default|centered|sidebar","cardStyle":"glass|solid|outline","fontFamily":"Inter|Space Grotesk|Playfair Display|Rajdhani|Nunito"}',
        `Foreslå layout for denne profilen: "${bio}"`,
        100
      );
      try {
        const match = result.match(/\{[\s\S]*\}/);
        return match ? JSON.parse(match[0]) : null;
      } catch {
        return null;
      }
    },

    // Multi-turn profile design assistant
    async profileDesignChat(history, profileContext) {
      const ctx = JSON.stringify(profileContext);
      const system = `Du er en kreativ AI design-assistent for Sound Core profilredigering. Hjelp brukeren med å lage en unik og vakker profilside.

Tilgjengelige handlinger — inkluder disse taggene i svaret ditt når du foreslår noe konkret:
- Farger: [COLORS:{"primary":"#hex","secondary":"#hex","bg":"#hex","text":"#hex","accent":"#hex"}]
- Bio: [BIO:teksten her]
- Layout: [LAYOUT:{"layout":"default|centered|sidebar","cardStyle":"glass|solid|outline","fontFamily":"Inter|Space Grotesk|Playfair Display|Rajdhani|Nunito"}]

Brukerprofil akkurat nå: ${ctx}

Instruksjoner:
- Svar alltid på norsk
- Vær entusiastisk, kreativ og konkret
- Hold svarene korte (2-3 setninger + eventuell handlingstag)
- Når du foreslår farger/bio/layout, legg ALLTID inn riktig handlingstag slik brukeren kan bruke det med ett klikk
- Ta utgangspunkt i brukerens eksisterende info (roller, bio, etc.) når du gir råd`;

      return proxyCall(system, history, 600);
    },

    // General site assistant (Settings AI tab — kept for backwards compat)
    async siteAssistantChat(history) {
      const system = `Du heter Core og er en vennlig og hjelpsom AI-assistent for Sound Core. Svar kort, vennlig og konkret (maks 3 setninger). Hvis du ikke vet noe, si det ærlig. Svar alltid på norsk med mindre brukeren skriver på et annet språk.\n\n${SITE_KNOWLEDGE}`;
      return proxyCall(system, history, 400);
    },

    // Floating widget assistant — site-aware, multilingual, fuller answers.
    // opts: { langName: 'Norwegian', contextNote: 'innlogget som @x, på #/radio' }
    async assistantChat(history, opts = {}) {
      const langLine = opts.langName
        ? `Svar på ${opts.langName}. Hvis brukeren tydelig skriver på et annet språk, svar på det språket i stedet.`
        : 'Svar på samme språk som brukeren skriver på (standard norsk).';
      const ctxLine = opts.contextNote ? `\nKontekst akkurat nå: ${opts.contextNote}` : '';
      const system = `Du heter Core — en vennlig, kunnskapsrik AI-assistent som bor i Sound Core og hjelper brukere med å finne fram og bruke alt på siden. Du kjenner hele plattformen.

${langLine}

Stil: varm, tydelig og konkret. Forklar steg for steg når noen spør hvordan de gjør noe (nevn riktig meny/rute, f.eks. «#/edit → Musikk-fanen»). Hold deg til det du faktisk vet om Sound Core; ikke finn på funksjoner. Hvis noe ikke finnes, si det ærlig. Hold svar til 1–5 setninger, gjerne med punktliste ved framgangsmåter.${ctxLine}

${SITE_KNOWLEDGE}`;
      return proxyCall(system, history, 700);
    },

    // Multi-turn radio assistant — answers in any language, knows available stations
    async radioChat(history, stationList) {
      const stationsCtx = stationList.map(s => `"${s.name}" (${s.cat}): ${s.desc}`).join('\n');
      const system = `You are a friendly radio assistant helping users find the perfect radio channel on this site. Always respond in the exact same language the user writes in. Be concise (2-3 sentences max). Available channels on this site:\n${stationsCtx}\nWhen you recommend a channel, mention its exact name. If no channel on the list fits, suggest using the search box to find more stations.`;
      return proxyCall(system, history, 300);
    },
  };
})();
