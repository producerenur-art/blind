// Magasin — live AI-nettsøk (Fase 2).
// Claude (Haiku 4.5) bruker web-søk til å finne ferske, ekte saker innen valgt
// sjanger, og returnerer dem som strukturert JSON. Vi henter en SHORTLISTE (8 saker)
// og cacher den ~6 timer på CDN, slik at frontenden kan rotere til nye saker hver
// halvtime uten nye API-kall — samme mønster som /api/radio-fresh.
//
// Brukes av: js/magazine.js (fanene), js/world.js («Fersk fra verden»: psychill,
// psytrance, techno underground) og js/underground.js — alle via js/aifresh.js.
// Feiler dette (nøkkel/kvote/nett) vises bare det kuraterte innholdet.
//
// Krev ANTHROPIC_API_KEY i miljøet (samme nøkkel som /api/chat). Haiku 4.5 støtter
// KUN den enkle web-søk-varianten web_search_20250305 (ikke _20260209).
//
// Lagring: siste gode shortliste per sjanger ligger i Supabase-tabellen magazine_cache
// (migrasjon 0012). Vanlige GET-kall svarer FRA tabellen på millisekunder; kun cron
// (?warm=1 → ?fresh=1 per sjanger) betaler for nye AI-søk. Uten tabell/nøkkel virker
// alt som før, bare med edge-cachen alene.

const { cleanArticles } = require('./_strip');

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-haiku-4-5-20251001';

// Sjanger-nøkkel → engelske søkeord (bedre web-treff).
// Nøklene «psychill» og «techno-underground» er hovedsporene bruker vil ha
// oppdatert hele tiden (magasin + verden-siden + undergrunn-siden).
// (Merk: hver nøkkel her varmes automatisk av cron — se WARM under. En nøkkel som
// ingen side faktisk mounter via AIFresh er bortkastet AI-søk to ganger daglig;
// «world» ble fjernet herfra 2026-09-07 av nettopp den grunn — innholdet dekkes
// allerede av festivals/psychill/chillgressive/psytrance/labels/techno-underground.)
const GENRES = {
  'alle':               'electronic music: psychill, psytrance, underground techno, psybient, house, trance, downtempo, dub',
  'psychill':           'psychill / psybient / psydub downtempo scene',
  'psybient':           'psybient / psychill ambient music',
  'psytrance':          'psytrance',
  'techno-underground': 'underground techno scene: raw, hypnotic and industrial techno, underground clubs and labels (not mainstream EDM)',
  'goa':                'goa trance',
  'prog-psy':           'progressive psytrance',
  'trance':             'trance music',
  'house':              'house music',
  'prog-house':         'progressive house / melodic house',
  'edm':                'EDM electronic dance music',
  'dub':                'psydub / dub electronic music',
  'downtempo':          'downtempo electronic music',
  'chillout':           'chillout / psychill music',
  'chillgressive':      'chillgressive and slow/deep trance downtempo: chillgressive, psychill, psybient and downtempo releases, compilations and mixes',
  'labels':             'record labels in psytrance, psychill, psybient, chillgressive and downtempo: new releases, compilations, label news and signings',
  'global-underground': 'global underground electronic / club scene',
  'dark-drone':         'dark ambient, dark drone and ritual/ambient industrial music: dark ambient labels, drone artists, ritual ambient and horror-ambient releases',
  // Festivaler & arrangementer i hele verden (verden-siden, Radio Shows, magasinet).
  'festivals':          'psychedelic and electronic music festivals, parties and club events worldwide: dates, line-ups, programme and ticket news (psytrance, psychill, downtempo, underground techno)',
};

// Hvor mange saker vi ber om / returnerer. Frontenden (js/aifresh.js) roterer i
// denne shortlisten hver halvtime, på samme måte som radioens AI-sett.
const WANT = 8;

// Vinkler vi roterer mellom per oppfriskning, så et nytt kall faktisk gir nytt
// stoff og ikke bare de samme sakene om igjen.
const ANGLES = [
  'new releases and albums',
  'interviews and artist portraits',
  'festival, party and club news',
  'label news, scene reports and mixes',
];

// Egne vinkler for festival/arrangement-sporet — der er datoer og line-ups saken.
const ANGLES_EVENTS = [
  'festival dates and line-up announcements',
  'club events and parties in the coming weeks',
  'ticket, programme and stage news',
  'festival reports, after-movies and recorded sets',
];

// Sjangre som «varmes» av cron-kallet (?warm=1) slik at hver fane er fersk før
// noen besøker den. ALLE nøklene i GENRES står her: magasinet har én fane per
// sjanger, og en fane som ikke varmes lot den første besøkende i verden betale
// 20–30 s AI-søk. Kallene går parallelt, så runden tar like lang tid som det
// tregeste enkeltsøket — ikke summen. Feiler en sjanger, beholder den sin
// forrige lagrede runde (dbRead), så en dårlig runde er ufarlig.
const WARM = Object.keys(GENRES);

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
  // Reins FØR klipping: modellen legg av og til inn <cite index="…">-markup, og
  // ein clampStr(320) på ustrippa tekst ville brukt opp teiknbudsjettet på taggar.
  return cleanArticles(arr)
    .map(o => ({
      tittel: clampStr(o && (o.tittel || o.title), 160).trim(),
      ingress: clampStr(o && (o.ingress || o.summary), 320).trim(),
      kilde: {
        navn: clampStr(o && (o.kilde_navn || o.source || o.kilde), 80).trim(),
        url: clampStr(o && (o.kilde_url || o.url), 400).trim(),
      },
    }))
    .filter(a2 => a2.tittel && /^https?:\/\//i.test(a2.kilde.url))
    .slice(0, WANT);
}

// ── Durabel cache i Supabase (tabell magazine_cache, migrasjon 0012) ──────────
// Vercels edge-cache er ikke garantert persistent, og et bom koster 20–60 s fordi
// AI-en søker på nett. Derfor lagres siste gode shortliste per sjanger i databasen:
// vanlige GET-kall svarer FRA tabellen på millisekunder, og bare cron (?warm=1)
// betaler for nye AI-søk. Mangler tabellen eller nøkkelen, oppfører alt seg som før.
const DB_URL = () => process.env.SUPABASE_URL;
const DB_KEY = () => process.env.SUPABASE_SERVICE_ROLE_KEY;
const dbReady = () => !!(DB_URL() && DB_KEY());
const DB_TABLE = 'magazine_cache';

async function dbRead(genre) {
  if (!dbReady()) return null;
  try {
    const u = `${DB_URL()}/rest/v1/${DB_TABLE}?genre=eq.${encodeURIComponent(genre)}&select=articles,updated_at`;
    const r = await fetch(u, {
      headers: { apikey: DB_KEY(), Authorization: 'Bearer ' + DB_KEY(), Accept: 'application/json' },
    });
    if (!r.ok) { console.error('magazine db read:', r.status); return null; }
    const rows = await r.json().catch(() => []);
    const row = Array.isArray(rows) ? rows[0] : null;
    if (!row || !Array.isArray(row.articles) || !row.articles.length) return null;
    // Reins på LES òg: rader som vart lagra før strippinga fanst inneheld framleis
    // <cite …>-markup. Utan dette ville dei stått uendra til cron genererte sjangeren
    // på nytt — i verste fall eit halvt døgn med synleg markup for besøkande.
    return { articles: cleanArticles(row.articles), updatedAt: row.updated_at };
  } catch (e) {
    console.error('magazine db read feil:', e && e.message ? e.message : e);
    return null;
  }
}

async function dbWrite(genre, articles) {
  if (!dbReady() || !articles || !articles.length) return;
  try {
    const r = await fetch(`${DB_URL()}/rest/v1/${DB_TABLE}?on_conflict=genre`, {
      method: 'POST',
      headers: {
        apikey: DB_KEY(), Authorization: 'Bearer ' + DB_KEY(),
        'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify([{ genre, articles, updated_at: new Date().toISOString() }]),
    });
    if (!r.ok) console.error('magazine db write:', r.status, await r.text().catch(() => ''));
  } catch (e) {
    console.error('magazine db write feil:', e && e.message ? e.message : e);
  }
}

// Cron-oppvarming: hent hver hovedsjanger via den offentlige URL-en, så CDN-cachen
// er fylt før noen besøker fanen. Kallene går gjennom CDN (ikke funksjonen direkte),
// og har ikke ?warm=1 — så ingen løkke. `fresh=1` tvinger nytt AI-søk selv om det
// ligger noe i databasen, ellers ville oppvarmingen bare lest sin egen gamle kopi.
async function warmAll(req) {
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  if (!host) return { warmed: 0 };
  const proto = /^localhost|127\.0\.0\.1/.test(host) ? 'http' : 'https';
  const base = `${proto}://${host}/api/magazine?fresh=1&genre=`;
  const results = await Promise.allSettled(
    WARM.map(g => fetch(base + encodeURIComponent(g)).then(r => r.json().catch(() => ({}))))
  );
  const ok = (r) => r.status === 'fulfilled' && r.value && Array.isArray(r.value.articles) && r.value.articles.length;
  const empty = WARM.filter((g, i) => !ok(results[i]));
  if (empty.length) console.error('magazine warm: tomt for', empty.join(', '));
  return { warmed: WARM.length - empty.length, genres: WARM, empty };
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const genreKey = String((req.query && req.query.genre) || 'alle').slice(0, 40);
  const search = GENRES[genreKey] || GENRES['alle'];

  // Cron-modus: varm alle hovedsjangre og svar kort. Se crons i vercel.json.
  if (req.query && req.query.warm) {
    try {
      const out = await warmAll(req);
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ ok: true, ...out });
    } catch (e) {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ ok: false, error: e && e.message ? e.message : 'warm failed' });
    }
  }

  // Normalt besøk: har vi en lagret shortliste, svar med den umiddelbart (ingen AI,
  // ingen venting). Cron holder den fersk; frontenden roterer i den hver halvtime.
  // ?fresh=1 (bare cron) hopper over dette og henter nytt stoff.
  const forceFresh = !!(req.query && req.query.fresh);
  if (!forceFresh) {
    const stored = await dbRead(genreKey);
    if (stored) {
      res.setHeader('Cache-Control', 'public, s-maxage=1800, stale-while-revalidate=43200');
      return res.status(200).json({
        articles: stored.articles, genre: genreKey, source: 'db', updated: stored.updatedAt,
      });
    }
  }

  // Mangler nøkkel → svar pent med tom liste, så frontend faller tilbake til kuratert.
  if (!process.env.ANTHROPIC_API_KEY) {
    res.setHeader('Cache-Control', 'public, s-maxage=300');
    return res.status(200).json({ articles: [], note: 'unconfigured' });
  }

  // Rotér vinkelen per 6-timers vindu, så oppfriskninger gir nytt stoff (ikke bare
  // de samme sakene om igjen). Samme takt som cachen under.
  const slot = Math.floor(Date.now() / (6 * 3600 * 1000));
  const angles = genreKey === 'festivals' ? ANGLES_EVENTS : ANGLES;
  const angle = angles[slot % angles.length];

  // NB: siden er engelskspråklig kilde (språkvelgeren oversetter videre), så
  // ingressene skrives på engelsk — som det kuraterte innholdet.
  const system =
    'You are the editor of an electronic music magazine. Use the web search tool to find ' +
    'FRESH, REAL stories (the last few weeks/months): new releases, interviews, label news, ' +
    'club, party or festival news. Write short, easy-to-read summaries in English. Use only ' +
    'real sources you actually found via search — never invented links. Never repeat the same ' +
    'story twice in one answer. ' +
    'Answer AT THE END with ONLY a valid JSON array (no other text, no code block) with up to ' +
    WANT + ' objects of the form: ' +
    '{"tittel": "...", "ingress": "1-2 sentences in English", "kilde_navn": "site", "kilde_url": "https://..."}';

  const userMsg =
    'Find up to ' + WANT + ' fresh stories about: ' + search + '. ' +
    'Lean towards ' + angle + ' this time, but include anything genuinely newsworthy. ' +
    'Prioritise news from the last few weeks. Return only the JSON array at the end.';

  // Ett fullt AI-kall (med server-verktøy-loop for pause_turn) → saker.
  // Kaster ved upstream-feil, så handleren kan svare pent.
  async function askModel(msg) {
    let messages = [{ role: 'user', content: msg }];
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
          max_tokens: 3000,
          system,
          tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 5 }],
          messages,
        }),
      });
      data = await upstream.json().catch(() => ({}));
      if (!upstream.ok) {
        const m = data && data.error && data.error.message ? data.error.message : ('Anthropic HTTP ' + upstream.status);
        const err = new Error(m); err.upstream = true; throw err;
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
    return parseArticles(text);
  }

  try {
    let articles = [];
    try {
      articles = await askModel(userMsg);
    } catch (e) {
      if (e && e.upstream) {
        console.error('magazine ai error:', e.message);
        // Pen fallback — frontend viser kuratert innhold.
        res.setHeader('Cache-Control', 'public, s-maxage=300');
        return res.status(200).json({ articles: [], note: 'upstream_error' });
      }
      throw e;
    }

    // Tomt svar = modellen fant/formaterte ingenting. Prøv én gang til med en
    // tydeligere instruks før vi gir opp — ellers ville en tom liste blitt liggende
    // i CDN-cachen og fanen stått tom (skjedde live for techno-underground).
    if (!articles.length) {
      console.error('magazine: tomt svar for', genreKey, '— prøver på nytt');
      try {
        articles = await askModel(
          userMsg + ' IMPORTANT: you MUST end your answer with the JSON array itself, ' +
          'nothing else. If you cannot find very recent news, include the most relevant ' +
          'recent stories you did find — never return an empty array.'
        );
      } catch (_) { /* behold tom liste */ }
    }
    // Fremdeles tomt? Bruk forrige lagrede runde heller enn å vise ingenting.
    if (!articles.length) {
      const stored = await dbRead(genreKey);
      if (stored) articles = stored.articles;
    }

    // Cache ~6 timer (samme takt som radioens AI-sett): Vercel Cron (se vercel.json)
    // varmer alle hovedsjangre, og stale-while-revalidate lar et litt gammelt svar
    // vises umiddelbart mens et nytt hentes i bakgrunnen. Frontenden roterer i
    // shortlisten hver halvtime mellom oppfriskningene.
    // Tomt resultat caches BARE 5 min, så en dårlig runde ikke låser fanen i 6 timer.
    // Ta vare på resultatet varig, så neste besøkende slipper å vente på AI-søket.
    if (articles.length) await dbWrite(genreKey, articles);

    res.setHeader('Cache-Control', articles.length
      ? 'public, s-maxage=21600, stale-while-revalidate=43200'
      : 'public, s-maxage=300');
    return res.status(200).json({ articles, genre: genreKey, slot, note: articles.length ? undefined : 'empty' });
  } catch (e) {
    console.error('magazine ai feil:', e && e.message ? e.message : e);
    res.setHeader('Cache-Control', 'public, s-maxage=300');
    return res.status(200).json({ articles: [], note: 'error' });
  }
};
