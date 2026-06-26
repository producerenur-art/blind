// AI — Claude API integration for profile AI features
const AI = (() => {
  const API_URL = 'https://api.anthropic.com/v1/messages';
  const MODEL   = 'claude-haiku-4-5-20251001'; // fast + cheap for UI features

  async function callClaude(systemPrompt, userPrompt, maxTokens = 300) {
    const key = CONFIG.ANTHROPIC_API_KEY;
    if (!key) throw new Error('no_key');

    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key':    key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-calls': 'true',
      },
      body: JSON.stringify({
        model:      MODEL,
        max_tokens: maxTokens,
        system:     systemPrompt,
        messages:   [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${res.status}`);
    }
    const data = await res.json();
    return data.content[0].text.trim();
  }

  return {
    hasKey() { return !!CONFIG.ANTHROPIC_API_KEY; },

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
      const key = CONFIG.ANTHROPIC_API_KEY;
      if (!key) throw new Error('no_key');

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

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-calls': 'true',
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 600,
          system,
          messages: history,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || `HTTP ${res.status}`);
      }
      const data = await res.json();
      return data.content[0].text.trim();
    },

    // General site assistant for the Settings AI tab
    async siteAssistantChat(history) {
      const key = CONFIG.ANTHROPIC_API_KEY;
      if (!key) throw new Error('no_key');

      const system = `Du heter Core og er en vennlig og hjelpsom AI-assistent for Sound Core — en norsk musikk- og radioplatform. Du hjelper brukere med å:
- Navigere og bruke siden (radio, chat, profil, DJ-mixes, events, discover)
- Finne riktig radiokanal eller musikk basert på humør eller sjanger
- Tilpasse sin profilside (bio, farger, bakgrunn, layout)
- Forstå abonnement og funksjoner (Gratis vs Pro)
- Svare på generelle musikkrelaterte spørsmål

Svar alltid på norsk med mindre brukeren skriver på et annet språk. Vær kort, vennlig og konkret (maks 3 setninger). Hvis du ikke vet noe, si det ærlig.`;

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-calls': 'true',
        },
        body: JSON.stringify({ model: MODEL, max_tokens: 400, system, messages: history }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || `HTTP ${res.status}`);
      }
      const data = await res.json();
      return data.content[0].text.trim();
    },

    // Multi-turn radio assistant — answers in any language, knows available stations
    async radioChat(history, stationList) {
      const key = CONFIG.ANTHROPIC_API_KEY;
      if (!key) throw new Error('no_key');

      const stationsCtx = stationList.map(s => `"${s.name}" (${s.cat}): ${s.desc}`).join('\n');
      const system = `You are a friendly radio assistant helping users find the perfect radio channel on this site. Always respond in the exact same language the user writes in. Be concise (2-3 sentences max). Available channels on this site:\n${stationsCtx}\nWhen you recommend a channel, mention its exact name. If no channel on the list fits, suggest using the search box to find more stations.`;

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-calls': 'true',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 300,
          system,
          messages: history,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || `HTTP ${res.status}`);
      }
      const data = await res.json();
      return data.content[0].text.trim();
    },
  };
})();
