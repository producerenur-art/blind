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
  const SITE_KNOWLEDGE = `SiriusFM is a decentralised social platform for electronic music, radio and DJ mixes. The whole site is in English.

NAVIGATION (hash routes):
- Home (#/): discover users and featured music
- Radio (#/radio): live streaming, 40+ channels (psytrance, ambient, techno, deep dub and more) — pick a channel to play
- Discover (#/discover): algorithmic music discovery, genres, trends
- Chat (#/chat): decentralised real-time chat (Gun.js, no server)
- Private messages: 1-to-1 chat via the inbox (#/inbox)
- Studio (#/studio): blend studio for building visual compositions and exporting them
- Shows (#/shows): festivals and events
- My page (#/minside): your own profile
- Settings (#/settings): account, subscription, AI
- Inbox (#/inbox): friend requests and messages
- A1 (#/a1): a dedicated AI tab — a draggable A1 chat (move it anywhere on screen), free universal search across the whole web (opens Google/DuckDuckGo/YouTube/Wikipedia in a new tab), and a weekly rotating gallery of featured sites and videos. Free and open to everyone.

HOW TO DO THINGS:
- Upload a song/music: go to the profile editor (#/edit) -> "Music" tab -> "Upload music" (audio files). Your music appears on your profile and can be played in the player.
- Upload a DJ mix: profile editor (#/edit) -> drag and drop into "Upload DJ Mix". Free accounts can upload mixes up to 3 hours; Pro unlocks up to 20 hours.
- Upload images/video: profile editor (#/edit) -> "Media" tab.
- Add friends: find a user (search at the top, or a card on Home/Discover) -> click "+ Add friend". You can also open a profile directly (#/u/username). Accept requests in the Inbox (#/inbox).
- Customise your profile: profile editor (#/edit) -> change bio, avatar, banner, colours, background, layout and streaming links (Spotify, Apple Music, SoundCloud, YouTube).
- Play the radio: #/radio -> click a channel. The player at the bottom controls play/pause, next and volume.
- Change the site background: click the image button in the control dock at the bottom right.
- Pro subscription: #/shop or #/settings -> upgrade to SiriusFM Pro for extra features.

The dock at the bottom right holds: the AI assistant (you), the info button, social links and the background switcher.

TROUBLESHOOTING (when something does not work / the user hit an error):
- Ask the user to reload the page, or hard-refresh (Cmd/Ctrl + Shift + R) to fetch the latest version.
- Clear the cache or try a private/incognito window if something is stuck.
- Check that the browser is up to date (latest Chrome, Safari, Firefox or Edge).
- Log out and back in if the problem involves login, profile or saving.
- Check the network connection if something will not load.
- Explain the problem calmly and simply; avoid scary technical jargon, and never promise a fix you are not sure about.
- Still broken? Ask the user to press the "Report bug" button in the error notice — that sends the team the details so they can fix it in the code.`;

  return {
    // Serverless proxy means the key is always available server-side.
    hasKey() { return true; },

    // Generate a polished bio from keywords
    async generateBio(keywords, style = 'creative') {
      const styles = {
        creative:     'write creatively and personally',
        professional: 'write professionally and concisely',
        funny:        'write in a fun, easy-to-read way',
        poetic:       'write poetically and atmospherically',
      };
      return callClaude(
        'You are an expert at writing social-media profile bios. Reply with the bio text ONLY, no explanation. Max 3 sentences. Always write in English.',
        `Write a bio based on these keywords: ${keywords}. Style: ${styles[style] || styles.creative}.`,
        200
      );
    },

    // Suggest a color palette from a mood/description
    async suggestColors(mood) {
      const result = await callClaude(
        'You are a colour designer. Return ONLY a JSON object with 5 hex colours, no explanation. Format: {"primary":"#...","secondary":"#...","bg":"#...","text":"#...","accent":"#..."}',
        `Create a colour palette for this mood: "${mood}". Dark, modern aesthetic.`,
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

    // AI-agent for plateselskap: skriv en kort kjøpsoppfordring til en låt +
    // (om lenke mangler) enkelt hint om hvor de kan sette opp salg.
    async suggestBuyCta({ title, labelName, url } = {}) {
      const sys = 'You are a helpful music-marketing assistant for a record label on SiriusFM. ' +
        'Write a short, enticing call to action in English (max 2 sentences) inviting the listener to buy or support the track. ' +
        'Max one emoji. Never use the word "DJ". Reply with the text ONLY.';
      const u = `Track: "${title || 'new track'}"\n` +
        `Label: ${labelName || 'the label'}\n` +
        (url ? `Buy link: ${url}\nEnd with a clear prompt to press the buy button.`
             : 'No buy link provided yet. Write a general call to support the release.');
      return callClaude(sys, u, 160);
    },

    // Generate a caption for a media item
    async generateCaption(description) {
      return callClaude(
        'You are a creative social-media copywriter. Reply ONLY with a short, engaging caption in English. Max 2 sentences.',
        `Write a caption for: ${description}`,
        120
      );
    },

    // AI playlist description
    async generatePlaylistDesc(trackNames) {
      return callClaude(
        'You are a music critic. Write a short, atmospheric playlist description. Reply with the description ONLY, max 2 sentences, in English.',
        `Playlist with these tracks: ${trackNames.join(', ')}`,
        150
      );
    },

    // Suggest profile layout/style based on bio
    async suggestLayout(bio) {
      const result = await callClaude(
        'You are a UX designer. Return ONLY a JSON object: {"layout":"default|centered|sidebar","cardStyle":"glass|solid|outline","fontFamily":"Inter|Space Grotesk|Playfair Display|Rajdhani|Nunito"}',
        `Suggest a layout for this profile: "${bio}"`,
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
      const system = `You are a creative AI design assistant for the SiriusFM profile editor. Help the user build a unique, beautiful profile page.

Available actions — include these tags in your reply whenever you suggest something concrete:
- Colours: [COLORS:{"primary":"#hex","secondary":"#hex","bg":"#hex","text":"#hex","accent":"#hex"}]
- Bio: [BIO:the text here]
- Layout: [LAYOUT:{"layout":"default|centered|sidebar","cardStyle":"glass|solid|outline","fontFamily":"Inter|Space Grotesk|Playfair Display|Rajdhani|Nunito"}]

The user's profile right now: ${ctx}

Instructions:
- Always reply in English (unless the user writes in another language — then match it)
- Be enthusiastic, creative and concrete
- Keep replies short (2-3 sentences plus any action tag)
- When you suggest colours/bio/layout, ALWAYS include the matching action tag so the user can apply it in one click
- Base your advice on the user's existing info (roles, bio, etc.)`;

      return proxyCall(system, history, 600);
    },

    // General site assistant (Settings AI tab — kept for backwards compat)
    async siteAssistantChat(history) {
      const system = `Your name is Core, a friendly and helpful AI assistant for SiriusFM. Reply briefly, warmly and concretely (max 3 sentences). If you don't know something, say so honestly. Always reply in English unless the user writes in another language, then reply in that language.\n\n${SITE_KNOWLEDGE}`;
      return proxyCall(system, history, 400);
    },

    // Floating widget assistant — site-aware, multilingual, fuller answers.
    // opts: { langName: 'Norwegian', contextNote: 'innlogget som @x, på #/radio' }
    async assistantChat(history, opts = {}) {
      const langLine = opts.langName
        ? `Reply in ${opts.langName}. If the user clearly writes in another language, reply in that language instead.`
        : 'Reply in English unless the user clearly writes in another language, then reply in that language.';
      const ctxLine = opts.contextNote ? `\nContext right now: ${opts.contextNote}` : '';
      const system = `Your name is Core — a friendly, knowledgeable AI assistant who lives inside SiriusFM and helps users find their way around and use everything on the site. You know the whole platform.

${langLine}

Style: warm, clear and concrete. Explain step by step when someone asks how to do something (name the right menu/route, e.g. "#/edit -> the Music tab"). Stick to what you actually know about SiriusFM; do not invent features. If something does not exist, say so honestly. Keep replies to 1-5 sentences, using a bullet list for step-by-step instructions.${ctxLine}

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

    // Ferske søkeord for bakgrunns-pauseskjermen: psykedelisk kunst + vakker
    // natur. AI varierer ordene hver gang så bildene holder seg ferske.
    // Returnerer { psychedelic:[...], nature:[...] } — faller tilbake til
    // innebygde lister hvis AI ikke er tilgjengelig.
    // opts.day   — dagnummer fra BgManager (nye ord hver dag, ikke per lasting)
    // opts.avoid — søkeord som alt er i bruk; be AI om noe annet så bildene byttes
    async ambientImageQueries(opts = {}) {
      const fallback = {
        psychedelic: ['psychedelic art', 'visionary fractal art', 'trippy mushroom art',
                      'sacred geometry mandala', 'blacklight psychedelic'],
        nature: ['mountain lake reflection', 'misty forest sunrise', 'northern lights landscape',
                 'alpine valley autumn', 'tropical waterfall'],
      };
      try {
        const txt = await callClaude(
          `You suggest search terms for a background image gallery (screensaver) on a music website. Return ONLY one JSON object, no markdown.
Format: {"psychedelic":["...","..."],"nature":["...","..."]}
- "psychedelic": 4 short ENGLISH search phrases for psychedelic/visionary art (trippy, fractal, mandala, mushroom, sacred geometry, visionary, blacklight, cosmic and similar).
- "nature": 4 short ENGLISH search phrases for beautiful nature (mountains, lakes, forests, northern lights, waterfalls, sunrise, ocean and similar).
- Vary the wording — be creative so the images feel fresh every time.
- Avoid these phrases (already in use today): ${(opts.avoid || []).join(', ') || '(none)'}
- Choose completely different subjects/moods from the ones above.`,
          `Give me fresh search terms for day ${opts.day ?? 0}. The images should differ from yesterday's.`,
          220
        );
        const m   = txt.match(/\{[\s\S]*\}/);
        const obj = JSON.parse(m ? m[0] : txt);
        const clean = a => Array.isArray(a)
          ? a.filter(s => typeof s === 'string' && s.trim()).map(s => s.trim()).slice(0, 6) : [];
        const psy = clean(obj.psychedelic), nat = clean(obj.nature);
        return { psychedelic: psy.length ? psy : fallback.psychedelic,
                 nature:      nat.length ? nat : fallback.nature };
      } catch {
        return fallback;
      }
    },

    // Suggest a text style for Blend Studio's text tool from a free-form
    // description/mood. Returns {fontFamily,color,weight,anim} or null.
    async suggestTextStyle(description, fonts = []) {
      const fontList = (fonts.length ? fonts : ['Inter','Anton','Bebas Neue','Pacifico','Lobster']).join(', ');
      const result = await callClaude(
        `You are a typography designer for a tool that places text on images. Return ONLY one JSON object, no explanation.
Format: {"fontFamily":"<one name from the list>","color":"#hex","weight":400|700|900,"anim":"none|left|right|up|down|zoom-in|zoom-out|pulse"}
- fontFamily MUST be exactly one of these names: ${fontList}
- color is a single hex colour that suits the mood
- anim is the movement the text animates in with`,
        `Suggest a text style that suits this mood/description: "${description}".`,
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
