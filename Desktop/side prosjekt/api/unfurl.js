// api/unfurl.js — link-forhåndsvisning for delte lenker i feed/innlegg.
//
// GET /api/unfurl?url=<lenke>  →  { url, title, image, site, desc, embed }
//
// Henter målsidas HTML server-side (nettleseren får ikke pga. CORS), plukker ut
// Open Graph-metadata (og:image, og:title, …) og bygger en trygg embed-URL for
// kjente musikkplattformer (SoundCloud / YouTube / Spotify / Bandcamp) slik at
// klienten kan vise cover-bilde + en play-knapp under lenka.

'use strict';

const EMBED_HOSTS = [
  'w.soundcloud.com', 'www.youtube.com', 'open.spotify.com', 'bandcamp.com',
];

// Nokre vertar blokkerer server-side henting med ei Cloudflare-utfordring
// ("Just a moment…") slik at og:image aldri kjem gjennom — manuelt
// verifiserte bilete som backup for desse. Nøkkel = url utan sluttskråstrek.
const MANUAL_IMAGE_OVERRIDES = {
  'https://pluginerds.com/12-best-websites-buy-vst-plugins':
    'https://pluginerds.com/wp-content/uploads/2026/03/Native-Instruments-plugins.png',
  // app.bigfreq.com (Circle.so/revex) svarar med og:image berre for enkelte
  // IP-regionar/fingerprint — Vercel-funksjonen (anna region enn brukaren)
  // får sida utan biletet sjølv om det finst når ein hentar frå Noreg.
  'https://app.bigfreq.com/communities/groups/bigfreq-public/home':
    'https://storage.googleapis.com/revex-communities-production/uZS08OKmdLEAK9rfCDfX/groups/c28d0022-557b-4054-bae7-e5f3128021a5',
};
function manualImageFor(url) {
  return MANUAL_IMAGE_OVERRIDES[String(url || '').replace(/\/+$/, '')] || '';
}

function decodeEntities(s) {
  return String(s || '')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")
    .replace(/&#x27;/gi, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

// Finn <meta property|name="<prop>" content="…"> uavhengig av attributt-rekkefølge.
function ogFrom(html) {
  return function (prop) {
    const tag = html.match(new RegExp(
      '<meta[^>]+(?:property|name)=["\']' + prop.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '["\'][^>]*>', 'i'));
    if (!tag) return '';
    const c = tag[0].match(/content=["']([^"']*)["']/i);
    return c ? decodeEntities(c[1]) : '';
  };
}

function safeHttps(u) {
  const s = decodeEntities(u || '');
  return /^https?:\/\//i.test(s) ? s : '';
}

// Bygg en trygg embed-URL — kun for hvitelistede verter.
function buildEmbed(url, og) {
  let host = '';
  try { host = new URL(url).hostname.replace(/^www\./, ''); } catch (e) { return ''; }
  const get = typeof og === 'function' ? og : function () { return ''; };

  // SoundCloud — spilleren tar rå spor-/sett-URL direkte.
  if (/(^|\.)soundcloud\.com$/.test(host)) {
    return 'https://w.soundcloud.com/player/?url=' + encodeURIComponent(url) +
      '&auto_play=true&hide_related=true&show_comments=false&visual=true&color=%237c3aed';
  }
  // YouTube
  if (/(^|\.)youtube\.com$/.test(host) || host === 'youtu.be') {
    let id = '';
    const m1 = url.match(/[?&]v=([\w-]{6,})/);
    const m2 = url.match(/youtu\.be\/([\w-]{6,})/);
    const m3 = url.match(/\/(?:embed|shorts)\/([\w-]{6,})/);
    id = (m1 && m1[1]) || (m2 && m2[1]) || (m3 && m3[1]) || '';
    return id ? 'https://www.youtube.com/embed/' + id + '?autoplay=1&rel=0' : '';
  }
  // Spotify
  if (/(^|\.)spotify\.com$/.test(host)) {
    const m = url.match(/spotify\.com\/(track|album|playlist|episode|show|artist)\/([A-Za-z0-9]+)/);
    return m ? 'https://open.spotify.com/embed/' + m[1] + '/' + m[2] : '';
  }
  // Bandcamp — embed-URL-en (EmbeddedPlayer) ligger i og:video.
  if (/(^|\.)bandcamp\.com$/.test(host)) {
    const v = safeHttps(get('og:video') || get('og:video:secure_url') || get('og:video:url'));
    try { if (v && new URL(v).hostname.replace(/^www\./, '') === 'bandcamp.com') return v; } catch (e) {}
    return '';
  }
  // Generelt: godta og:video bare hvis verten er hvitelistet.
  const v = safeHttps(get('og:video') || get('og:video:secure_url'));
  try {
    if (v && EMBED_HOSTS.indexOf(new URL(v).hostname) !== -1) return v;
  } catch (e) {}
  return '';
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const url = String((req.query && req.query.url) || '').trim();
  if (!/^https?:\/\//i.test(url) || url.length > 2048) {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 6000);
    // Utgir seg for Facebook sin førehandsvisings-bot (ikkje vår eigen
    // "SoundCoreBot"-signatur) — mange bot-sperrer (Cloudflare o.l.) slepp
    // kjende social-preview-botar gjennom fordi nettstadene sjølv treng dei
    // for å få fungerande delingskort. Verifisert 2026-09-15 at dette
    // kjem gjennom sperrene som blokkerte pluginerds.com/app.bigfreq.com.
    const r = await fetch(url, {
      redirect: 'follow',
      signal: ctrl.signal,
      headers: { 'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)' },
    });
    clearTimeout(t);
    // Tak: les ikkje uendeleg store sider. 600000 var for lite — enkelte
    // moderne SPA-sider (t.d. Circle.so-community-sider) inliner store
    // JSON-datablobbar FØR og:image-taggen i <head>, så eit lågt tak kutta
    // av HTML-en midt i, før meta-taggene vart nådd (feedfreq-public-siden
    // hadde og:image på teikn ~743 000, oppdaga 2026-09-15).
    const html = (await r.text()).slice(0, 3000000);

    const og = ogFrom(html);
    let site = og('og:site_name');
    if (!site) { try { site = new URL(url).hostname.replace(/^www\./, ''); } catch (e) { site = ''; } }
    const title = og('og:title') || (html.match(/<title[^>]*>([^<]*)<\/title>/i) || [, ''])[1].trim();
    const image = safeHttps(og('og:image') || og('og:image:secure_url') || og('twitter:image')) || manualImageFor(url);

    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800');
    return res.status(200).json({
      url,
      title: title || '',
      image,
      site: site || '',
      desc: og('og:description') || '',
      embed: buildEmbed(url, og),
    });
  } catch (e) {
    const image = manualImageFor(url);
    return res.status(200).json(image ? { url, image, error: 'unfurl_failed' } : { url, error: 'unfurl_failed' });
  }
};

// Eksponer de rene funksjonene for enhetstesting.
module.exports.buildEmbed = buildEmbed;
module.exports.ogFrom = ogFrom;
