// Serverless: server-rendered SHARE / UNFURL page for a single uploaded track
// or video. This is what makes Facebook / X / iMessage / WhatsApp show the
// user's OWN cover image (and inline video) when they paste a SiriusFM link.
//
// WHY server-rendered: the app is a hash-routed SPA with static <meta> tags, and
// social crawlers do NOT run JavaScript and never see the `#/…` fragment — so a
// shared link would otherwise always show the generic SiriusFM cover. This route
// runs on the server (where the crawler lands) and emits per-upload Open Graph
// tags.
//
// STATELESS by design: uploaded track/media records live only in the uploader's
// IndexedDB (musicIds/mediaIds are deliberately NOT synced to Supabase), but the
// cover/audio/video URLs are already PUBLIC Supabase Storage URLs. So the client
// encodes the minimal preview payload into the share URL itself:
//
//   https://www.siriusfm.no/s/<base64url(JSON)>
//   payload = { v:1, k:'audio'|'video', t:title, a:artist, i:imageUrl,
//               m:mediaUrl, mt:mimeType, u:username }
//
// vercel.json rewrites /s/:data -> /api/share?d=:data.

const SITE = 'https://www.siriusfm.no';
const FALLBACK_IMG = SITE + '/assets/og-cover.png?v=4';

// Only allow media/image URLs hosted on our own Supabase project (or on the
// site itself). Prevents the page from being abused to slap SiriusFM branding
// on an arbitrary attacker-controlled image/video.
function allowedHosts() {
  const hosts = new Set(['www.siriusfm.no', 'siriusfm.no']);
  try {
    if (process.env.SUPABASE_URL) hosts.add(new URL(process.env.SUPABASE_URL).host);
  } catch (_) { /* ignore */ }
  return hosts;
}

function safeUrl(u, hosts) {
  if (!u || typeof u !== 'string') return null;
  try {
    const parsed = new URL(u);
    if (parsed.protocol !== 'https:') return null;
    if (!hosts.has(parsed.host)) return null;
    return parsed.href;
  } catch (_) { return null; }
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function decodePayload(d) {
  if (!d || typeof d !== 'string') return null;
  try {
    const json = Buffer.from(d, 'base64url').toString('utf8');
    const obj = JSON.parse(json);
    return (obj && typeof obj === 'object') ? obj : null;
  } catch (_) { return null; }
}

module.exports = async (req, res) => {
  const hosts = allowedHosts();

  // The rewrite passes the payload as ?d=…; also accept it straight off the path
  // (/s/<payload>) as a fallback so the route works even without the rewrite.
  let d = (req.query && req.query.d) || '';
  if (!d) {
    const m = String(req.url || '').match(/\/s\/([^/?#]+)/);
    if (m) d = decodeURIComponent(m[1]);
  }

  const p = decodePayload(d) || {};
  const kind = p.k === 'video' ? 'video' : (p.k === 'image' ? 'image' : (p.k === 'link' ? 'link' : 'audio'));
  const title = (p.t && String(p.t).trim()) || 'Delt på SiriusFM';
  const artist = (p.a && String(p.a).trim()) || '';
  const username = (p.u && String(p.u).replace(/[^a-zA-Z0-9_\-.]/g, '')) || '';
  const image = safeUrl(p.i, hosts) || FALLBACK_IMG;
  const media = safeUrl(p.m, hosts);
  const mime = (p.mt && /^[\w.+-]+\/[\w.+-]+$/.test(p.mt)) ? p.mt : (kind === 'video' ? 'video/mp4' : 'audio/mpeg');
  // Ekstern destinasjon for lenke-deling. Ikkje verts-avgrensa (det er ei lenke
  // brukaren klikkar, ikkje eit innebygd media) — men må vera http(s).
  let extLink = null;
  if (p.l && typeof p.l === 'string') {
    try { const pl = new URL(p.l); if (pl.protocol === 'http:' || pl.protocol === 'https:') extLink = pl.href; } catch (_) { /* ignore */ }
  }

  const desc = kind === 'image'
    ? (artist ? `Laget av ${artist} · SiriusFM` : 'Laget i Blend Studio på SiriusFM.')
    : (kind === 'link'
        ? (artist ? `${artist} · Delt via SiriusFM` : 'Delt via SiriusFM — sosial plattform for elektronisk musikk.')
        : (artist ? `${artist} · Hør på SiriusFM` : 'Hør på SiriusFM — sosial plattform for elektronisk musikk.'));
  const fullTitle = artist ? `${title} — ${artist}` : title;
  const profileUrl = username ? `${SITE}/#/u/${encodeURIComponent(username)}` : SITE + '/';
  const canonical = `${SITE}/s/${encodeURIComponent(d || '')}`;

  // Build the head OG/Twitter tags. Video pages advertise og:video (inline
  // playback in the feed) + og:image poster; audio pages use a large image card.
  const tags = [];
  tags.push(`<meta property="og:site_name" content="SiriusFM">`);
  tags.push(`<meta property="og:title" content="${esc(fullTitle)}">`);
  tags.push(`<meta property="og:description" content="${esc(desc)}">`);
  tags.push(`<meta property="og:url" content="${esc(canonical)}">`);
  tags.push(`<meta property="og:image" content="${esc(image)}">`);
  tags.push(`<meta property="og:image:secure_url" content="${esc(image)}">`);
  tags.push(`<meta property="og:image:alt" content="${esc(fullTitle)}">`);
  tags.push(`<meta name="twitter:title" content="${esc(fullTitle)}">`);
  tags.push(`<meta name="twitter:description" content="${esc(desc)}">`);
  tags.push(`<meta name="twitter:image" content="${esc(image)}">`);

  if (kind === 'video' && media) {
    tags.push(`<meta property="og:type" content="video.other">`);
    tags.push(`<meta property="og:video" content="${esc(media)}">`);
    tags.push(`<meta property="og:video:secure_url" content="${esc(media)}">`);
    tags.push(`<meta property="og:video:type" content="${esc(mime)}">`);
    tags.push(`<meta property="og:video:width" content="1280">`);
    tags.push(`<meta property="og:video:height" content="720">`);
    tags.push(`<meta name="twitter:card" content="player">`);
    tags.push(`<meta name="twitter:player" content="${esc(canonical)}">`);
    tags.push(`<meta name="twitter:player:width" content="1280">`);
    tags.push(`<meta name="twitter:player:height" content="720">`);
    tags.push(`<meta name="twitter:player:stream" content="${esc(media)}">`);
    tags.push(`<meta name="twitter:player:stream:content_type" content="${esc(mime)}">`);
  } else if (kind === 'image' || kind === 'link') {
    tags.push(`<meta property="og:type" content="website">`);
    tags.push(`<meta name="twitter:card" content="summary_large_image">`);
  } else {
    tags.push(`<meta property="og:type" content="music.song">`);
    if (media) tags.push(`<meta property="og:audio" content="${esc(media)}">`);
    if (media) tags.push(`<meta property="og:audio:secure_url" content="${esc(media)}">`);
    if (media) tags.push(`<meta property="og:audio:type" content="${esc(mime)}">`);
    tags.push(`<meta name="twitter:card" content="summary_large_image">`);
  }

  // Human-facing landing page: real cover + inline player + a CTA into the app.
  const player = (kind === 'video' && media)
    ? `<video class="media" controls playsinline poster="${esc(image)}" preload="metadata"><source src="${esc(media)}" type="${esc(mime)}"></video>`
    : (kind === 'image'
        ? `<img class="media media-free" src="${esc(image)}" alt="${esc(fullTitle)}">`
        : `<img class="media" src="${esc(image)}" alt="${esc(fullTitle)}">${media ? `<audio class="audio" controls preload="metadata"><source src="${esc(media)}" type="${esc(mime)}"></audio>` : ''}`);

  const html = `<!doctype html>
<html lang="no">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(fullTitle)} · SiriusFM</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(canonical)}">
${tags.join('\n')}
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin:0; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
         background:#0b0b14; color:#f2f2f7; min-height:100vh; display:flex;
         align-items:center; justify-content:center; padding:1.5rem; }
  .card { width:100%; max-width:460px; text-align:center; }
  .brand { font-weight:800; letter-spacing:.3px; font-size:.9rem; color:#a78bfa;
           text-transform:uppercase; margin-bottom:1rem; }
  .media { width:100%; max-width:400px; border-radius:18px; display:block; margin:0 auto;
           box-shadow:0 18px 60px rgba(0,0,0,.55); background:#15151f; aspect-ratio: 1 / 1; object-fit:cover; }
  video.media { aspect-ratio:16 / 9; object-fit:cover; }
  .media-free { aspect-ratio:auto; object-fit:contain; height:auto; }
  .audio { width:100%; max-width:400px; margin:1rem auto 0; display:block; }
  h1 { font-size:1.35rem; margin:1.1rem 0 .2rem; }
  .artist { color:#b6b6c6; margin:0 0 1.4rem; }
  .cta { display:inline-flex; align-items:center; gap:.5rem; text-decoration:none;
         background:linear-gradient(135deg,#8b5cf6,#6d28d9); color:#fff; font-weight:700;
         padding:.8rem 1.4rem; border-radius:999px; box-shadow:0 8px 24px rgba(124,58,237,.4); }
  .foot { margin-top:1.4rem; font-size:.78rem; color:#6f6f80; }
  a.plain { color:#a78bfa; text-decoration:none; }
</style>
</head>
<body>
  <div class="card">
    <div class="brand">SiriusFM</div>
    ${player}
    <h1>${esc(title)}</h1>
    ${artist ? `<p class="artist">${esc(artist)}</p>` : '<div style="height:.6rem"></div>'}
    ${(kind === 'link' && extLink)
      ? `<a class="cta" href="${esc(extLink)}" target="_blank" rel="noopener">▶ Åpne lenke</a>
    <div class="foot"><a class="plain" href="${esc(profileUrl)}">Se profilen på SiriusFM</a></div>`
      : `<a class="cta" href="${esc(profileUrl)}">▶ Åpne i SiriusFM</a>
    <div class="foot">Delt via <a class="plain" href="${SITE}/">siriusfm.no</a></div>`}
  </div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  // Let crawlers cache and re-scrape; short CDN cache is fine since the payload
  // is immutable per-URL.
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600');
  res.status(200).send(html);
};
