// Radio — ferske spor/sett på timeplan (samme idé som /api/magazine, for radioen).
// For hver sjanger på forsidens HomeRadio-widget søker vi opp EKTE, SPILLBARE
// YouTube-sett (videoEmbeddable=true → kan aldri gi en død embed), og lar Claude
// (Haiku 4.5) rangere de beste ferske settene per sjanger. Vi returnerer en hel
// SHORTLISTE per sjanger (ikke bare ett sett), slik at forsiden kan rotere til et
// nytt sett hver halvtime uten nye API-kall. Resultatet caches ~6 timer på CDN og
// «vekkes» daglig av en Vercel Cron (se vercel.json).
//
// Frontend (js/app.js → HomeRadio) henter dette og roterer i shortlisten, med de
// innebygde hardkodede videoene som fallback. Feiler noe (manglende nøkkel, kvote,
// nettverk) svarer vi pent, og forsiden beholder fallback.

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const YT_SEARCH = 'https://www.googleapis.com/youtube/v3/search';
const MODEL = 'claude-haiku-4-5-20251001';

// Sjanger → engelske søkevarianter (best YouTube-treff). Vi roterer variant per
// oppfriskning slik at shortlisten faktisk endrer seg gjennom døgnet, ikke bare
// rekkefølgen. Året settes inn dynamisk.
const GENRE_QUERIES = {
  psytrance: [
    'psychedelic psytrance dj set',
    'full on psytrance live set',
    'psytrance festival set',
    'night psytrance mix',
  ],
  downtempo: [
    'downtempo mix',
    'organic downtempo dj set',
    'downtempo electronica live set',
    'psychedelic downtempo mix',
  ],
  techno: [
    'underground techno dj set',
    'raw hypnotic techno mix',
    'warehouse techno live set',
    'melodic underground techno set',
  ],
  psychill: [
    'psychill mix',
    'psybient psychill dj set',
    'psychedelic chillout mix',
    'psydub psychill journey',
  ],
  progressive: [
    'progressive psytrance dj set',
    'progressive psytrance live set',
  ],
  ambient:     ['psybient ambient mix', 'deep ambient space mix'],
  goa:         ['goa trance dj set', 'classic goa trance mix'],
  dub:         ['psydub dub reggae mix', 'dub techno mix'],
  chillout: [
    'chillout lounge mix',
    'chillout downtempo dj set',
    'sunset chillout session',
  ],
  'dark-drone': [
    'dark ambient drone mix',
    'ritual dark ambient set',
    'dark drone atmospheric mix',
  ],
};
const GENRES = Object.keys(GENRE_QUERIES);

// Hvor mange sett frontenden får å rotere i per sjanger.
const SHORTLIST = 6;

function clampStr(s, n) { return String(s == null ? '' : s).slice(0, n); }

// Ett YouTube-søk → liste med spillbare kandidater {id,title,channel}.
// publishedAfter (ISO) begrenser til ferskt materiale; kallet prøver på nytt uten
// den grensen hvis en nisjesjanger ikke gir treff.
async function searchYouTube(query, apiKey, publishedAfter) {
  const run = async (after) => {
    const params = new URLSearchParams({
      part: 'snippet',
      type: 'video',
      maxResults: '15',
      videoEmbeddable: 'true',       // ← garanterer at embeden faktisk spiller
      videoDuration: 'long',         // lange sett = radio-følelse
      order: 'relevance',
      safeSearch: 'moderate',
      q: query,
      key: apiKey,
    });
    if (after) params.set('publishedAfter', after);
    const r = await fetch(`${YT_SEARCH}?${params}`);
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      const reason = data && data.error && data.error.errors && data.error.errors[0] && data.error.errors[0].reason;
      throw new Error('youtube:' + (reason || r.status));
    }
    return (data.items || [])
      .filter(it => it.id && it.id.videoId)
      .map(it => ({
        id: it.id.videoId,
        title: clampStr(it.snippet && it.snippet.title, 160),
        channel: clampStr(it.snippet && it.snippet.channelTitle, 80),
      }));
  };

  const fresh = await run(publishedAfter);
  if (fresh.length >= 4 || !publishedAfter) return fresh;
  // For få ferske treff (nisjesjanger) → utvid til hele katalogen.
  try {
    const wide = await run(null);
    const seen = new Set(fresh.map(c => c.id));
    return fresh.concat(wide.filter(c => !seen.has(c.id)));
  } catch (_) { return fresh; }
}

// La Haiku rangere de beste ekte DJ-settene/miksene per sjanger blant kandidatene.
// Returnerer { genre: [videoId, ...] }. Ved feil → tom map (kaller bruker fallback).
async function rankWithAI(candidatesByGenre, apiKey) {
  const lines = [];
  for (const g of GENRES) {
    const cands = candidatesByGenre[g] || [];
    if (!cands.length) continue;
    lines.push(`SJANGER ${g}:`);
    cands.forEach(c => lines.push(`  ${c.id} | ${c.title} | ${c.channel}`));
  }
  if (!lines.length) return {};

  const system =
    'Du kuraterer en nettradio for psykedelisk/elektronisk musikk. For hver sjanger ' +
    'får du en liste med YouTube-kandidater (videoId | tittel | kanal). Ranger de ' +
    `inntil ${SHORTLIST} beste ferske, EKTE DJ-settene / miksene / live-opptakene per ` +
    'sjanger, best først. Unngå intervjuer, reaksjoner, AI-generert støy, ' +
    '«10 hours»-looper, enkeltspor og spillelister. Hold deg strengt på sjanger — ' +
    'techno skal være undergrunns-techno, ikke EDM/mainstream. Svar med KUN et ' +
    'JSON-objekt som mapper sjangernavn → array av valgte videoId-er, ingen annen ' +
    'tekst. Bruk kun videoId-er fra listen.';
  const userMsg = 'Kandidater:\n' + lines.join('\n') + '\n\nReturner kun JSON-objektet.';

  const upstream = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ model: MODEL, max_tokens: 1200, system, messages: [{ role: 'user', content: userMsg }] }),
  });
  const data = await upstream.json().catch(() => ({}));
  if (!upstream.ok) throw new Error('anthropic:' + (data && data.error && data.error.message || upstream.status));

  const text = ((data && data.content) || [])
    .filter(b => b && b.type === 'text').map(b => b.text || '').join('\n');
  const a = text.indexOf('{'), b = text.lastIndexOf('}');
  let obj = {};
  try { obj = JSON.parse(text.slice(a, b + 1)); } catch (_) { return {}; }
  return obj && typeof obj === 'object' ? obj : {};
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
    return res.status(200).json({ picks: {}, sets: {}, note: 'unconfigured' });
  }

  const now = new Date();
  const year = now.getFullYear();
  // Rotér søkevariant per 6-timers vindu, så nye oppfriskninger gir nytt materiale.
  const slot = Math.floor(now.getTime() / (6 * 3600 * 1000));
  // Ferskt = publisert siste 12 måneder (med automatisk utvidelse ved for få treff).
  const publishedAfter = new Date(now.getTime() - 365 * 24 * 3600 * 1000).toISOString();

  try {
    // 1) Søk alle sjangre parallelt (spillbare kandidater).
    const results = await Promise.all(GENRES.map(async g => {
      const variants = GENRE_QUERIES[g];
      const q = variants[slot % variants.length];
      try { return [g, await searchYouTube(`${q} ${year}`, ytKey, publishedAfter)]; }
      catch (_) { return [g, []]; }
    }));
    const candidatesByGenre = Object.fromEntries(results);

    // 2) Fallback-rangering = YouTubes egen relevansrekkefølge.
    const sets = {};
    for (const g of GENRES) {
      sets[g] = (candidatesByGenre[g] || []).slice(0, SHORTLIST);
    }

    // 3) La AI overstyre med en bedre rangering der den er trygg (kun kjente id-er).
    if (process.env.ANTHROPIC_API_KEY) {
      try {
        const ranked = await rankWithAI(candidatesByGenre, process.env.ANTHROPIC_API_KEY);
        for (const g of GENRES) {
          const ids = Array.isArray(ranked[g]) ? ranked[g] : (ranked[g] ? [ranked[g]] : []);
          const picked = [];
          for (const id of ids) {
            const match = (candidatesByGenre[g] || []).find(c => c.id === id);
            if (match && !picked.some(p => p.id === match.id)) picked.push(match);
            if (picked.length >= SHORTLIST) break;
          }
          if (picked.length) sets[g] = picked;
        }
      } catch (e) {
        console.error('radio-fresh ai:', e && e.message ? e.message : e);
        // Behold YouTube-fallback-rangeringen.
      }
    }

    // Bakoverkompatibelt felt: ett valgt sett per sjanger (toppen av shortlisten).
    const picks = {};
    for (const g of GENRES) if (sets[g] && sets[g].length) picks[g] = sets[g][0];

    // Cache ~6 timer; Vercel Cron vekker endepunktet daglig, og frontenden roterer
    // i shortlisten hver halvtime mellom oppfriskningene.
    res.setHeader('Cache-Control', 'public, s-maxage=21600, stale-while-revalidate=21600');
    return res.status(200).json({ picks, sets, year });
  } catch (e) {
    console.error('radio-fresh feil:', e && e.message ? e.message : e);
    res.setHeader('Cache-Control', 'public, s-maxage=300');
    return res.status(200).json({ picks: {}, sets: {}, note: 'error' });
  }
};
