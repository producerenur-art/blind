// Radio-visualiseringer — ferske, lydløse YouTube-visuals på timeplan.
// Samme idé som /api/radio-fresh, men for visualiser-raden under radioen
// (js/radio.js). Vi søker opp EKTE, INNBYGGBARE (videoEmbeddable=true → aldri død
// embed) visual-looper på YouTube i HD/4K, og lar Claude (Haiku 4.5) velge de beste
// OG lage et kort engelsk fane-navn + emoji til hver.
//
// ALLE visual-knappene er nå AI-roterte (tidligere var bare «AI-fersk»-raden det).
// Miksen er garantert i kode via GROUPS: samme psykedeliske sjangre som før
// (psytrance-visuals, kalejdoskop/mandala, fraktal, AI/deforum, surrealistisk,
// flyt/væske, neon-tunnel) PLUSS ekte romfilm i toppkvalitet (NASA/ISS/teleskop).
// Resultatet caches 24 timer på CDN og «vekkes» daglig av en Vercel Cron
// (se vercel.json). Frontenden roterer i tillegg et vindu av poolen per time,
// så knappene skifter oftere enn selve hentingen.
//
// Feiler noe (nøkkel/kvote/nett) svarer vi pent med { items: [] } og frontenden
// faller tilbake på sin egen faste pool av verifiserte visuals.
//
// Lyd: iframen spiller ALLTID med mute=1 (se visVideoSrc i js/radio.js), så disse
// er lydløse uansett hva kilden inneholder — kun visuelt.

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const YT_SEARCH = 'https://www.googleapis.com/youtube/v3/search';
const MODEL = 'claude-haiku-4-5-20251001';

// Sjanger-grupper. `want` = hvor mange plasser gruppa GARANTERT får i resultatet,
// så miksen aldri kollapser til bare romfilm eller bare fraktaler.
// Søkeord på engelsk gir best YouTube-treff. Året settes inn dynamisk.
//
// ANTALL SØK ER BEVISST LAVT (12 til sammen): YouTube-prosjektet har ~100 søk
// per DAG (dagskvoten «Search Queries per day»), delt med /api/radio-fresh og
// søket i appen. Hvert søk henter 15 treff, så én spørring per gruppe gir nok
// å velge blant.
const GROUPS = [
  {
    key: 'psy', want: 4, hint: 'psychedelic / psytrance visuals',
    queries: ['psychedelic visuals 4k loop no text', 'psytrance visuals 4k full screen'],
  },
  {
    key: 'kaleido', want: 3, hint: 'kaleidoscope & mandala',
    queries: ['kaleidoscope mandala background 4k'],
  },
  {
    key: 'fractal', want: 3, hint: 'fractal zooms & geometry',
    queries: ['fractal zoom 4k loop'],
  },
  {
    key: 'ai', want: 4, hint: 'AI-generated / deforum art',
    queries: ['ai deforum animation psychedelic 4k', 'ai generated surreal art visuals 4k'],
  },
  {
    key: 'surreal', want: 3, hint: 'surreal dreamscapes',
    queries: ['surreal psychedelic landscapes 4k'],
  },
  {
    key: 'flow', want: 3, hint: 'liquid / flow / neon tunnel',
    queries: ['abstract liquid background 4k loop'],
  },
  {
    // Ekte opptak fra verdensrommet — ikke AI-render, ikke animasjon.
    key: 'space', want: 6, hint: 'REAL space footage (NASA/ESA/ISS/telescope)',
    queries: [
      'nasa real space footage 4k',
      'earth from space 4k iss live footage',
      'hubble webb telescope nebula footage 4k',
    ],
  },
  {
    key: 'darkdrone', want: 2, hint: 'dark ambient / ritual drone visuals',
    queries: ['dark ambient background 4k loop no text'],
  },
];

const WANT = GROUPS.reduce((n, g) => n + g.want, 0); // 26 plasser i poolen

// Titler som nesten alltid betyr «ikke en rein visual-loop» (prat, tutorials,
// lyric-videoer, musikk-mikser med statisk cover, tekst-tunge videoer).
const BAD_TITLE = /(tutorial|how to|reaction|podcast|interview|lyric|lyrics|top \d|review|unboxing|episode|explained|documentary|full album|meditation guide|guided|asmr voice|premiere pro|after effects|davinci|blender tutorial|free download|copyright|no copyright music|subscribe)/i;
// Bonusord som signaliserer kvalitet (brukes til sortering, ikke filtrering).
// «no sound / no music» = rein bakgrunnsvisual uten pålagt tekst/plate-cover.
const GOOD_TITLE = /(4k|8k|uhd|hdr|60fps|loop|screensaver|no text|no sound|no music|seamless)/i;

function clampStr(s, n) { return String(s == null ? '' : s).slice(0, n); }

// Emoji må klippes på KODEPUNKT, ikke på UTF-16-enheter: en .slice(0,4) deler
// sammensatte emoji som 👨‍🚀 (astronaut = 3 kodepunkter) midt i sekvensen og
// gir søppeltegn i knappen. Vi tar maks 3 kodepunkter og fjerner en etterlatt
// ZWJ/variasjonsvelger på slutten.
function clampEmoji(s) {
  const cps = [...String(s == null ? '' : s)];
  return cps.slice(0, 3).join('').replace(/[\u200d\ufe0f]+$/, '');
}

// Ett YouTube-søk → liste med spillbare kandidater {id,title,channel}.
async function searchYouTube(query, apiKey) {
  const params = new URLSearchParams({
    part: 'snippet',
    type: 'video',
    maxResults: '15',          // gratis (search koster 100 enheter uansett) → mer kanal-variasjon
    videoEmbeddable: 'true',   // ← garanterer at embeden faktisk spiller
    videoDefinition: 'high',   // ← kun HD/4K-kilder (toppkvalitet)
    videoDuration: 'long',     // lange looper = bakgrunns-følelse
    order: 'relevance',
    safeSearch: 'moderate',
    q: query,
    key: apiKey,
  });
  const r = await fetch(`${YT_SEARCH}?${params}`);
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const err = (data && data.error) || {};
    const reason = err.errors && err.errors[0] && err.errors[0].reason;
    // Dagskvoten («Search Queries per day») rapporteres som rateLimitExceeded/429,
    // akkurat som et forbigående burst-avslag. Skill dem: er dagskvoten brukt opp
    // hjelper det ikke å prøve igjen — da avbryter vi resten av søkene med en gang.
    if (/per day|quotaExceeded/i.test(String(err.message || '') + reason)) {
      throw new Error('youtube:quotaDaily');
    }
    throw new Error('youtube:' + (reason || r.status));
  }
  return (data.items || [])
    .filter(it => it.id && it.id.videoId)
    .map(it => ({
      id: it.id.videoId,
      title: clampStr(it.snippet && it.snippet.title, 160),
      channel: clampStr(it.snippet && it.snippet.channelTitle, 80),
    }));
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// YouTube svarer 429 rateLimitExceeded når man fyrer av alle søkene på én gang.
// Da kom tilfeldige sjangre tomme tilbake og miksen ble skjev (målt live).
// Derfor: prøv på nytt et par ganger på forbigående feil.
async function searchWithRetry(query, apiKey, tries = 3) {
  for (let attempt = 0; ; attempt++) {
    try { return await searchYouTube(query, apiKey); }
    catch (e) {
      const msg = String((e && e.message) || '');
      if (msg === 'youtube:quotaDaily') throw e;      // nytteløst å prøve igjen i dag
      const transient = /rateLimitExceeded|userRateLimitExceeded|429|backendError|internalError|503/.test(msg);
      if (!transient || attempt >= tries - 1) throw e;
      await sleep(1500 * (attempt + 1));   // 1,5 s → 3 s
    }
  }
}

// Alle søk i alle grupper → kandidater per gruppe, uten duplikater på tvers av
// grupper (én video hører til én gruppe). Søkene kjøres i puljer i stedet for
// alle samtidig, nettopp for å holde oss under YouTubes rate-grense.
const SEARCH_CONCURRENCY = 4;
const SEARCH_STAGGER_MS = 120;   // liten forskyvning inne i pulja → ingen skarp burst
async function collectCandidates(year, apiKey) {
  const jobs = [];
  GROUPS.forEach(g => g.queries.forEach(q => jobs.push({ key: g.key, q })));
  const results = [];
  let quotaOut = false;
  for (let i = 0; i < jobs.length; i += SEARCH_CONCURRENCY) {
    if (quotaOut) break;              // dagskvoten er tom — ikke brenn tid på resten
    const chunk = jobs.slice(i, i + SEARCH_CONCURRENCY);
    results.push(...await Promise.all(chunk.map(async (j, n) => {
      await sleep(n * SEARCH_STAGGER_MS);
      try { return { key: j.key, list: await searchWithRetry(`${j.q} ${year}`, apiKey) }; }
      catch (e) {
        const msg = (e && e.message) || String(e);
        if (msg === 'youtube:quotaDaily') quotaOut = true;
        console.error('visuals-fresh søk:', j.key, msg);
        return { key: j.key, list: [] };
      }
    })));
  }

  const seen = new Set();
  const byGroup = {};
  GROUPS.forEach(g => { byGroup[g.key] = []; });
  for (const { key, list } of results) {
    for (const c of list) {
      if (seen.has(c.id)) continue;
      if (BAD_TITLE.test(c.title)) continue;      // prat/tutorial/lyric → ut
      seen.add(c.id);
      byGroup[key].push({ ...c, group: key });
    }
  }
  // Løft de som ser ut som 4K/loop/uten tekst øverst i hver gruppe (stabil sort).
  for (const key of Object.keys(byGroup)) {
    byGroup[key] = byGroup[key]
      .map((c, i) => ({ c, i, score: GOOD_TITLE.test(c.title) ? 1 : 0 }))
      .sort((a, b) => (b.score - a.score) || (a.i - b.i))
      .map(x => x.c);
  }
  return byGroup;
}

// La Haiku velge de beste per gruppe og lage kort engelsk fane-navn + emoji.
// Returnerer en liste [{id, emoji, label}] — kun med id-er fra kandidatlista.
async function pickWithAI(byGroup, apiKey) {
  const blocks = GROUPS.map(g => {
    const lines = (byGroup[g.key] || []).slice(0, 14)
      .map(c => `${c.id} | ${c.title} | ${c.channel}`);
    if (!lines.length) return '';
    return `## ${g.key} — ${g.hint} (pick ${g.want})\n${lines.join('\n')}`;
  }).filter(Boolean).join('\n\n');

  const system =
    'You curate the visualizer tabs for an electronic/psychedelic web radio (SiriusFM). ' +
    'Candidates are YouTube videos (videoId | title | channel) grouped by genre. They play ' +
    'MUTED, full-screen, as looping background behind the radio. For EACH group pick exactly ' +
    'the requested number of the most visually striking, distinct videos (no duplicates, no ' +
    'two from the same series/channel if avoidable, no interviews, no music mixes with a ' +
    'static cover image). PRIORITISE the best 4K/8K/HDR quality. AVOID anything with text, ' +
    'titles, subtitles, logos or watermarks burned into the picture — pure visuals only. ' +
    'For the "space" group prefer REAL telescope/NASA/ISS footage over CGI or animation. ' +
    'For each pick write ONE short English tab name (max 14 chars) and ONE fitting emoji. ' +
    'Answer with ONLY a JSON array like [{"id":"...","emoji":"🌀","label":"Portal"}] and ' +
    'nothing else. Use only videoIds from the lists.';
  const userMsg = blocks + '\n\nReturn only the JSON array.';

  const upstream = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ model: MODEL, max_tokens: 2000, system, messages: [{ role: 'user', content: userMsg }] }),
  });
  const data = await upstream.json().catch(() => ({}));
  if (!upstream.ok) throw new Error('anthropic:' + (data && data.error && data.error.message || upstream.status));

  const text = ((data && data.content) || [])
    .filter(b => b && b.type === 'text').map(b => b.text || '').join('\n');
  const a = text.indexOf('['), b = text.lastIndexOf(']');
  let arr = [];
  try { arr = JSON.parse(text.slice(a, b + 1)); } catch (_) { return []; }
  return Array.isArray(arr) ? arr : [];
}

// Sett sammen sluttlista: hver gruppe får sine `want` plasser — først AI-valgene
// som hører til gruppa, deretter toppkandidatene om AI valgte for få.
// `aiById` = id → {emoji,label} fra AI. Fyller vi fra kandidatlista lager vi et
// enkelt navn fra gruppa i stedet.
const GROUP_EMOJI = { psy: '🌈', kaleido: '🔷', fractal: '🌀', ai: '🎨', surreal: '🌄', flow: '🌊', space: '🛰️' };
const GROUP_LABEL = { psy: 'Psychedelia', kaleido: 'Mandala', fractal: 'Fractal', ai: 'AI art', surreal: 'Surreal', flow: 'Flow', space: 'Space' };

function buildItems(byGroup, picks) {
  const aiById = {};
  for (const p of picks) {
    if (!p || typeof p.id !== 'string') continue;
    aiById[p.id] = { emoji: clampEmoji(p.emoji) || null, label: clampStr(p.label, 16) || null };
  }
  const used = new Set();
  const usedChannel = new Set();   // én video per kanal → ingen nesten-identiske kloner
  const items = [];
  for (const g of GROUPS) {
    const pool = byGroup[g.key] || [];
    const chosen = [];
    const take = cand => {
      used.add(cand.id);
      usedChannel.add(cand.channel);
      chosen.push(cand);
    };
    // 1) AI-valgene i gruppa, i AI-ens rekkefølge.
    for (const p of picks) {
      if (chosen.length >= g.want) break;
      if (!p || used.has(p.id)) continue;
      const cand = pool.find(c => c.id === p.id);
      if (!cand) continue;
      take(cand);
    }
    // 2) Fyll opp fra toppen av gruppas kandidatliste — først med nye kanaler
    //    (ellers får vi f.eks. fire kopier av samme ISS-strøm), så uten
    //    kanal-kravet om gruppa fortsatt ikke er full.
    for (const cand of pool) {
      if (chosen.length >= g.want) break;
      if (used.has(cand.id) || usedChannel.has(cand.channel)) continue;
      take(cand);
    }
    for (const cand of pool) {
      if (chosen.length >= g.want) break;
      if (used.has(cand.id)) continue;
      take(cand);
    }
    chosen.forEach((cand, i) => items.push(toItem(cand, g.key, aiById, i)));
  }

  // Feilet noen gruppers søk (kvote/nett) blir poolen for liten og miksen skjev.
  // Fyll de ledige plassene med de beste ubrukte kandidatene fra gruppene som
  // faktisk svarte, så raden alltid blir full.
  if (items.length < WANT) {
    const rest = GROUPS.flatMap(g => (byGroup[g.key] || []).map(c => ({ c, key: g.key })));
    for (const pass of [1, 2]) {
      for (const { c, key } of rest) {
        if (items.length >= WANT) break;
        if (used.has(c.id) || (pass === 1 && usedChannel.has(c.channel))) continue;
        used.add(c.id); usedChannel.add(c.channel);
        // Nummerér videre innenfor SIN gruppe («Psychedelia 5»), ikke etter global
        // posisjon — ellers ble reservenavnene «Psychedelia 24/25/26».
        items.push(toItem(c, key, aiById, items.filter(x => x.group === key).length));
      }
    }
  }
  return items;
}

function toItem(cand, key, aiById, i) {
  const meta = aiById[cand.id] || {};
  return {
    id: cand.id,
    group: key,
    emoji: meta.emoji || GROUP_EMOJI[key] || '🌀',
    label: meta.label || (GROUP_LABEL[key] + (i ? ' ' + (i + 1) : '')),
  };
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const ytKey = process.env.YOUTUBE_API_KEY;
  if (!ytKey) {
    res.setHeader('Cache-Control', 'public, s-maxage=300');
    return res.status(200).json({ items: [], note: 'unconfigured' });
  }

  const year = new Date().getFullYear();

  try {
    // 1) Søk alle grupper parallelt → kandidater per sjanger.
    const byGroup = await collectCandidates(year, ytKey);
    const total = Object.values(byGroup).reduce((n, l) => n + l.length, 0);
    if (!total) {
      res.setHeader('Cache-Control', 'public, s-maxage=1800');
      return res.status(200).json({ items: [], note: 'no-candidates' });
    }

    // 2) La AI velge de fineste + gi ekte fane-navn. Feiler den, faller vi
    //    tilbake på toppkandidatene per gruppe (buildItems fyller opp selv).
    let picks = [];
    if (process.env.ANTHROPIC_API_KEY) {
      try { picks = await pickWithAI(byGroup, process.env.ANTHROPIC_API_KEY); }
      catch (e) { console.error('visuals-fresh ai:', e && e.message ? e.message : e); }
    }
    const items = buildItems(byGroup, picks);

    // Cache 24 timer: AI bytter hele settet én gang i døgnet (11 søk/dag, så vi
    // holder oss trygt under dagskvoten sammen med /api/radio-fresh og appsøket). Frontenden roterer i tillegg hvilket
    // vindu av poolen som vises hver time, så knappene skifter oftere enn
    // hentingen. stale-while-revalidate serverer forrige sett umiddelbart mens
    // et ferskt hentes i bakgrunnen ved første treff etter utløp.
    //
    // Ble settet tynt (kvote/nett-feil midt i søkerunden) cacher vi bare 30 min,
    // så et halvtomt sett ikke fryses fast et helt døgn.
    // Rund henting tar ~11 s kald (16 YouTube-søk + AI-valg), så vi lar
    // stale-while-revalidate gjelde et helt døgn: første besøkende etter utløp
    // får forrige sett UMIDDELBART mens et ferskt hentes i bakgrunnen. Ingen
    // bruker venter, og cron-jobben varmer endepunktet daglig uansett.
    // Tynt sett (for få treff) ELLER en sjanger som ikke svarte i det hele tatt
    // (kvote/nett-hikke → miksen blir skjev fordi en annen gruppe fyller opp):
    // cache bare 30 min, så vi prøver igjen snart i stedet for å frysa det et døgn.
    const thin = items.length < Math.ceil(WANT * 0.6);
    const degraded = GROUPS.some(g => !(byGroup[g.key] || []).length);
    res.setHeader('Cache-Control', (thin || degraded)
      ? 'public, s-maxage=1800'
      : 'public, s-maxage=86400, stale-while-revalidate=86400');
    return res.status(200).json({ items, want: WANT, year });
  } catch (e) {
    console.error('visuals-fresh feil:', e && e.message ? e.message : e);
    res.setHeader('Cache-Control', 'public, s-maxage=300');
    return res.status(200).json({ items: [], note: 'error' });
  }
};
