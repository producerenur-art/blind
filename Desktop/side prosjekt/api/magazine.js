// Magasin — live AI-nettsøk (Fase 2).
// Claude (Haiku 4.5) bruker web-søk til å finne 4 ferske, ekte saker innen valgt
// sjanger, og returnerer dem som strukturert JSON. Resultatet caches på CDN i ~1 uke
// for å holde kostnad/kvote nede. Frontend (js/magazine.js) fletter dette inn over
// det kuraterte innholdet — og viser bare kuratert hvis dette feiler/mangler nøkkel.
//
// Krev ANTHROPIC_API_KEY i miljøet (samme nøkkel som /api/chat). Haiku 4.5 støtter
// KUN den enkle web-søk-varianten web_search_20250305 (ikke _20260209).

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-haiku-4-5-20251001';

// Sjanger-nøkkel → engelske søkeord (bedre web-treff) + norsk visningsnavn.
const GENRES = {
  'alle':               'electronic music: psytrance, psybient, house, trance, downtempo, dub',
  'psybient':           'psybient / psychill ambient music',
  'psytrance':          'psytrance',
  'goa':                'goa trance',
  'prog-psy':           'progressive psytrance',
  'trance':             'trance music',
  'house':              'house music',
  'prog-house':         'progressive house / melodic house',
  'edm':                'EDM electronic dance music',
  'dub':                'psydub / dub electronic music',
  'downtempo':          'downtempo electronic music',
  'chillout':           'chillout / psychill music',
  'global-underground': 'global underground electronic / club scene',
};

function clampStr(s, n) { return String(s == null ? '' : s).slice(0, n); }

// Trekk ut den første JSON-arrayen fra modellens tekst (tolerant for ekstra prosa).
function parseArticles(text) {
  if (!text) return [];
  let raw = text;
  const a = raw.indexOf('[');
  const b = raw.lastIndexOf(']');
  if (a !== -1 && b !== -1 && b > a) raw = raw.slice(a, b + 1);
  let arr;
  try { arr = JSON.parse(raw); } catch (_) { return []; }
  if (!Array.isArray(arr)) return [];
  return arr
    .map(o => ({
      tittel: clampStr(o && (o.tittel || o.title), 160).trim(),
      ingress: clampStr(o && (o.ingress || o.summary), 320).trim(),
      kilde: {
        navn: clampStr(o && (o.kilde_navn || o.source || o.kilde), 80).trim(),
        url: clampStr(o && (o.kilde_url || o.url), 400).trim(),
      },
    }))
    .filter(a2 => a2.tittel && /^https?:\/\//i.test(a2.kilde.url))
    .slice(0, 6);
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const genreKey = String((req.query && req.query.genre) || 'alle').slice(0, 40);
  const search = GENRES[genreKey] || GENRES['alle'];

  // Mangler nøkkel → svar pent med tom liste, så frontend faller tilbake til kuratert.
  if (!process.env.ANTHROPIC_API_KEY) {
    res.setHeader('Cache-Control', 'public, s-maxage=300');
    return res.status(200).json({ articles: [], note: 'unconfigured' });
  }

  const system =
    'Du er redaktør for et elektronisk musikkmagasin. Bruk web-søk-verktøyet til å finne ' +
    'FERSKE, EKTE saker (siste ukene/månedene): nye utgivelser, intervjuer, plateselskaps- ' +
    'eller festivalnyheter. Skriv korte, lettleste ingresser på norsk bokmål. Bruk kun ekte ' +
    'kilder du faktisk fant via søk — aldri oppdiktede lenker. ' +
    'Svar TIL SLUTT med KUN en gyldig JSON-array (ingen annen tekst, ingen kodeblokk) med opptil ' +
    '4 objekter på formen: ' +
    '{"tittel": "...", "ingress": "1-2 setninger på bokmål", "kilde_navn": "nettsted", "kilde_url": "https://..."}';

  const userMsg =
    'Finn opptil 4 ferske saker om: ' + search + '. ' +
    'Prioriter nyheter fra de siste ukene. Returner kun JSON-arrayen til slutt.';

  let messages = [{ role: 'user', content: userMsg }];

  try {
    let data = null;
    for (let i = 0; i < 4; i++) {
      const upstream = await fetch(ANTHROPIC_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 2000,
          system,
          tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 5 }],
          messages,
        }),
      });
      data = await upstream.json().catch(() => ({}));
      if (!upstream.ok) {
        const msg = data && data.error && data.error.message ? data.error.message : ('Anthropic HTTP ' + upstream.status);
        console.error('magazine ai error:', msg);
        // Pen fallback — frontend viser kuratert innhold.
        res.setHeader('Cache-Control', 'public, s-maxage=300');
        return res.status(200).json({ articles: [], note: 'upstream_error' });
      }
      // Server-verktøy-loop: ved pause_turn, send assistant-svaret tilbake og fortsett.
      if (data.stop_reason === 'pause_turn' && Array.isArray(data.content)) {
        messages = messages.concat([{ role: 'assistant', content: data.content }]);
        continue;
      }
      break;
    }

    const text = ((data && data.content) || [])
      .filter(b => b && b.type === 'text')
      .map(b => b.text || '')
      .join('\n')
      .trim();

    const articles = parseArticles(text);

    // Cache ~1 uke (ferskt nok for et magasin, billig på kvote/kostnad).
    res.setHeader('Cache-Control', 'public, s-maxage=604800, stale-while-revalidate=86400');
    return res.status(200).json({ articles, genre: genreKey });
  } catch (e) {
    console.error('magazine ai feil:', e && e.message ? e.message : e);
    res.setHeader('Cache-Control', 'public, s-maxage=300');
    return res.status(200).json({ articles: [], note: 'error' });
  }
};
