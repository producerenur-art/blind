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
- Private meldinger: 1-til-1 chat via innboksen (#/inbox)
- Studio (#/studio): blend-studio for å lage visuelle komposisjoner og eksportere
- Shows (#/shows): festivaler og arrangementer
- Min side (#/minside): din egen profil
- Innstillinger (#/settings): konto, abonnement, AI
- Innboks (#/inbox): venneforespørsler og meldinger
- A1 (#/a1): eiga AI-fane — drabar A1-chat (flyttbar fritt på skjermen), gratis universalsøk til heile nettet (opnar Google/DuckDuckGo/YouTube/Wikipedia i ny fane), og eit vekevis roterande galleri av utvalde nettstader og videoar. Gratis og open for alle.

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

Dokken nede til høyre samler: AI-assistent (deg), språk, plattform, lenker og bakgrunn.

FEILSØKING (når noko ikkje funkar / brukaren har fått ein feil):
- Be brukaren laste sida på nytt, eller hard-refresh (Cmd/Ctrl + Shift + R) for å hente nyaste versjon.
- Tøm hurtigbuffer eller prøv eit privat/inkognito-vindauge om noko heng igjen.
- Sjekk at nettlesaren er oppdatert (siste Chrome, Safari, Firefox eller Edge).
- Logg ut og inn att om det gjeld innlogging, profil eller lagring.
- Sjekk nettforbindelsen om noko ikkje lastar.
- Forklar feilen roleg og enkelt; ikkje bruk skummel teknisk sjargong, og lov aldri ein fiks du ikkje veit verkar.
- Står feilen att? Be brukaren bruke «Rapporter feil»-knappen i feilvarselet — då får teamet detaljane og kan rette det i koden.`;

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

    // AI radio SEARCH — turns a free-text request (any language) into electronic
    // genre search terms. The whole site is LOCKED to electronic music, so terms
    // must be electronic. Returns { terms:[...], note:"..." }.
    async radioSearch(query) {
      const system = `You convert a user's free-text request into an ELECTRONIC-music radio search. This site only has electronic music: psytrance, goa, trance, progressive, house, deep house, tech house, techno, minimal, acid, ambient, psybient, psychill, chillout, downtempo, dub, dubstep, drum and bass, breakbeat, idm, drone, dark ambient, synthwave, electro, trip-hop, nu disco, rave, hardstyle and related styles.
Reply with ONLY compact JSON, no markdown: {"terms":["genre1","genre2"],"note":"one short friendly sentence"}.
- "terms": 1-3 lowercase ENGLISH electronic genre/tag words that best match the request. They MUST be electronic genres. If the request is non-electronic, pick the closest electronic vibe instead.
- "note": one short helpful sentence (max ~16 words) in the SAME language the user wrote in.`;
      const txt = await proxyCall(system, [{ role: 'user', content: query }], 200);
      try {
        const m   = txt.match(/\{[\s\S]*\}/);
        const obj = JSON.parse(m ? m[0] : txt);
        const terms = Array.isArray(obj.terms)
          ? obj.terms.filter(t => typeof t === 'string' && t.trim()).map(t => t.trim()).slice(0, 3)
          : [];
        return { terms, note: (obj.note || '').trim() };
      } catch (e) {
        return { terms: [], note: txt.slice(0, 160) };
      }
    },

    // Foreslå en tekststil for Blend Studio sitt tekstverktøy ut fra en fri
    // beskrivelse/stemning. Returnerer {fontFamily,color,weight,anim} eller null.
    async suggestTextStyle(description, fonts = []) {
      const fontList = (fonts.length ? fonts : ['Inter','Anton','Bebas Neue','Pacifico','Lobster']).join(', ');
      const result = await callClaude(
        `Du er en typografi-designer for et verktøy som setter tekst på bilder. Returner KUN ett JSON-objekt, ingen forklaring.
Format: {"fontFamily":"<ett navn fra lista>","color":"#hex","weight":400|700|900,"anim":"none|left|right|up|down|zoom-in|zoom-out|pulse"}
- fontFamily MÅ være nøyaktig ett av disse navnene: ${fontList}
- color er én hex-farge som passer stemningen
- anim er bevegelsen teksten zoomer inn med`,
        `Foreslå en tekststil som passer denne stemningen/beskrivelsen: "${description}".`,
        160
      );
      try {
        const m = result.match(/\{[\s\S]*\}/);
        return m ? JSON.parse(m[0]) : null;
      } catch {
        return null;
      }
    },
  };
})();
