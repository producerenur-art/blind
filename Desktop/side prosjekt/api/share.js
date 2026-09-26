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
  if (req.query && req.query.cover) return require('./_cover')(req, res);   // /api/share?cover=<url> → 1200x630 JPEG
  const hosts = allowedHosts();

  // The rewrite passes the payload as ?d=…; also accept it straight off the path
  // (/s/<payload>) as a fallback so the route works even without the rewrite.
  let d = (req.query && req.query.d) || '';
  if (!d) {
    const m = String(req.url || '').match(/\/s\/([^/?#]+)/);
    if (m) d = decodeURIComponent(m[1]);
  }

  // Kort delingslenke for live-opptak: /s/set_<id>  (i staden for ei lang base64-lenke). Oppslag mot
  // live_sets med den OFFENTLEGE publishable-nøkkelen — RLS gir berre ut publiserte/ferdige sett.
  let p;
  let isSet = false;
  let shareKey = String(d || '').slice(0, 180);   // nøkkel for kommentarar på delesida
  const slugM = /^[a-z0-9][a-z0-9-]{0,40}-([a-z0-9]{6})$/i.exec(d);
  if (/^set_[a-z0-9]{6,40}$/i.test(d) || slugM) {
    isSet = true;
    p = {};
    try {
      const base = process.env.SUPABASE_URL || 'https://qefdyxpyjwpohsmmmksf.supabase.co';
      const anon = 'sb_publishable_JEV-NS9FGZ_KpSvQTPwlZg_LlyVy_eS';
      const r = await fetch(`${base}/rest/v1/live_sets?${slugM && !/^set_/i.test(d) ? 'id=like.set_*' + slugM[1].toLowerCase() + '&order=created_at.desc' : 'id=eq.' + encodeURIComponent(d)}&select=id,display_name,track_title,cover_url,audio_url&limit=1`,
        { headers: { apikey: anon, Authorization: `Bearer ${anon}` } });
      const rows = r.ok ? await r.json() : [];
      const row = rows && rows[0];
      if (!row && slugM) { isSet = false; p = decodePayload(d) || {}; }   // slug-liknande men ikkje eit sett → gammal nyttelast-lenke
      if (row && row.id) shareKey = row.id;
      if (row) p = { k: 'audio', t: row.display_name, a: row.track_title, i: row.cover_url, m: row.audio_url, mt: 'audio/webm' };
    } catch (_) { /* fall tilbake til generisk side */ }
  } else {
    p = decodePayload(d) || {};
  }
  const kind = p.k === 'video' ? 'video' : (p.k === 'image' ? 'image' : (p.k === 'link' ? 'link' : 'audio'));
  const title = (p.t && String(p.t).trim()) || 'Shared on SiriusFM';
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
    ? (artist ? `Made by ${artist} · SiriusFM` : 'Made in Blend Studio on SiriusFM.')
    : (kind === 'link'
        ? (artist ? `${artist} · Shared via SiriusFM` : 'Shared via SiriusFM — social platform for electronic music.')
        : (artist ? `${artist} · Listen on SiriusFM` : 'Listen on SiriusFM — social platform for electronic music.'));
  const fullTitle = artist ? `${title} — ${artist}` : title;
  const profileUrl = isSet ? `${SITE}/#/discover` : (username ? `${SITE}/#/u/${encodeURIComponent(username)}` : SITE + '/');
  // ?v=<versjon> (frå st.updated_at) gjer at Facebook/X hentar NYTT bilde/tekst etter ei redigering
  // (dei mellomlagrar forhandsvisninga per URL i ~30 dagar, og bruker og:url som nøkkel).
  const ver = /^[a-z0-9]{1,12}$/i.test(String((req.query && req.query.v) || '')) ? String(req.query.v) : '';
  const canonical = `${SITE}/s/${encodeURIComponent(d || '')}${ver ? '?v=' + ver : ''}`;

  // Build the head OG/Twitter tags. Video pages advertise og:video (inline
  // playback in the feed) + og:image poster; audio pages use a large image card.
  const tags = [];
  tags.push(`<meta property="og:site_name" content="SiriusFM">`);
  tags.push(`<meta property="og:title" content="${esc(fullTitle)}">`);
  tags.push(`<meta property="og:description" content="${esc(desc)}">`);
  tags.push(`<meta property="og:url" content="${esc(canonical)}">`);
  // Facebook o.l. dropper og:image over ~8 MB (skjermbilde-PNG er ofte 10+ MB): Supabase-bilde går via
  // Vercel-bildeoptimalisering (vercel.json → images) som gir maks 1200 px bredde og få hundre KB.
  const ogImg = (() => {
    try {
      const u = new URL(image);
      if (/\.supabase\.co$/i.test(u.hostname) && u.pathname.startsWith('/storage/v1/object/public/') && /\.(png|jpe?g|webp|gif)$/i.test(u.pathname)) {
        return `${SITE}/api/share?cover=${encodeURIComponent(image)}`;
      }
    } catch (_) { /* behald original */ }
    return image;
  })();
  tags.push(`<meta property="og:image" content="${esc(ogImg)}">`);
  tags.push(`<meta property="og:image:secure_url" content="${esc(ogImg)}">`);
  if (ogImg !== image) { tags.push(`<meta property="og:image:width" content="1200">`); tags.push(`<meta property="og:image:height" content="630">`); tags.push(`<meta property="og:image:type" content="image/jpeg">`); }
  tags.push(`<meta property="og:image:alt" content="${esc(fullTitle)}">`);
  tags.push(`<meta name="twitter:title" content="${esc(fullTitle)}">`);
  tags.push(`<meta name="twitter:description" content="${esc(desc)}">`);
  tags.push(`<meta name="twitter:image" content="${esc(ogImg)}">`);

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
  } else if (isSet) {
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
        : `<img class="media${image === FALLBACK_IMG ? ' media-free' : ''}" src="${esc(image)}" alt="${esc(fullTitle)}">${media ? `<audio class="audio" controls preload="metadata"><source src="${esc(media)}" type="${esc(mime)}"></audio>` : ''}`);

  // JSON til inline-script: escape < så «</script>» aldri kan bryte ut av taggen.
  const jsonForScript = v => JSON.stringify(v).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  const bgImage = image === FALLBACK_IMG ? '' : ogImg;

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(fullTitle)} · SiriusFM</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(canonical)}">
${tags.join('\n')}
<style>
  :root { color-scheme: dark; --blue:#7dd3fc; --blue2:#8fc9fd; --blueD:#2563eb; --text:#cfe8ff; --text2:#9fd8fd; --text3:#78a8cc; }
  * { box-sizing: border-box; }
  html, body { margin:0; }
  body { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; background:#070a12; color:#f2f2f7;
         min-height:100vh; padding:1.2rem 1rem 3rem; position:relative; overflow-x:hidden; }
  /* Levande bakgrunn (same stil som resten av sida): sakte drivande, uskarp cover + svevande partiklar */
  .bg { position:fixed; inset:-8%; z-index:0; background:#070a12 center/cover no-repeat; filter:blur(38px) saturate(1.25) brightness(.55);
        animation: drift 38s ease-in-out infinite alternate; }
  .bg.plain { background-image: radial-gradient(60% 50% at 30% 20%, rgba(56,189,248,.28), transparent 70%), radial-gradient(50% 45% at 75% 70%, rgba(37,99,235,.30), transparent 70%); }
  @keyframes drift { 0%{ transform:scale(1.05) translate3d(-2%,-1%,0);} 50%{ transform:scale(1.18) translate3d(2%,1.5%,0);} 100%{ transform:scale(1.08) translate3d(-1%,2%,0);} }
  .veil { position:fixed; inset:0; z-index:0; background: linear-gradient(180deg, rgba(7,10,18,.35), rgba(7,10,18,.78)); }
  .glow { position:fixed; inset:0; z-index:0; pointer-events:none; background: radial-gradient(45% 40% at 20% 25%, rgba(56,189,248,.20), transparent 70%), radial-gradient(45% 45% at 80% 75%, rgba(99,102,241,.22), transparent 70%); animation: glowmove 24s ease-in-out infinite alternate; }
  @keyframes glowmove { 0%{ transform:translate3d(-3%,-2%,0) scale(1);} 100%{ transform:translate3d(3%,2%,0) scale(1.15);} }
  #fx { position:fixed; inset:0; z-index:1; pointer-events:none; }
  .wrap { position:relative; z-index:2; max-width:560px; margin:0 auto; }
  .top { display:flex; align-items:center; justify-content:center; position:relative; z-index:30; min-height:44px; margin-bottom:1.1rem; }
  .brand { display:inline-block; font-weight:800; font-size:1.05rem; letter-spacing:.2px; padding:.32rem 1.1rem; border-radius:999px;
           border:1.5px solid var(--blue); background:rgba(125,211,252,.08); box-shadow:0 0 18px rgba(125,211,252,.28), inset 0 0 12px rgba(125,211,252,.10);
           color:transparent; background-image:linear-gradient(90deg,#ffffff,#cfeaff,var(--blue)); -webkit-background-clip:text; background-clip:text;
           text-decoration:none; }
  .brand-wrap { display:inline-block; border-radius:999px; border:1.5px solid var(--blue); padding:.3rem 1.15rem; background:rgba(125,211,252,.08);
           box-shadow:0 0 18px rgba(125,211,252,.28), inset 0 0 12px rgba(125,211,252,.10); text-decoration:none; }
  .brand-wrap span { font-weight:800; font-size:1.05rem; background:linear-gradient(90deg,#ffffff,#cfeaff,var(--blue)); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }
  .more { position:absolute; right:0; top:50%; transform:translateY(-50%); }
  .more-btn { cursor:pointer; color:var(--text); font:inherit; font-size:.85rem; font-weight:600; padding:.42rem .8rem; border-radius:999px;
              background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.16); }
  .more-btn:hover { background:rgba(255,255,255,.11); }
  .more-panel { position:absolute; right:0; top:calc(100% + 8px); min-width:220px; max-height:70vh; overflow:auto; padding:.4rem; z-index:20;
              background:#14141c; border:1px solid rgba(255,255,255,.09); border-radius:14px; box-shadow:0 18px 50px rgba(0,0,0,.55); display:none; }
  .more-panel.open { display:block; }
  .more-panel a, .more-panel button { display:block; width:100%; text-align:left; padding:.55rem .7rem; border-radius:9px; border:0; background:transparent;
              color:var(--text); font:inherit; font-size:.9rem; font-weight:500; text-decoration:none; cursor:pointer; }
  .more-panel a:hover, .more-panel button:hover { background:rgba(255,255,255,.08); }
  .more-panel .gold { color:#f59e0b; font-weight:700; background:linear-gradient(135deg,rgba(245,158,11,.16),rgba(245,158,11,.06)); border:1px solid rgba(245,158,11,.42); margin-bottom:.3rem; }
  .more-panel hr { border:0; height:1px; background:rgba(255,255,255,.09); margin:.35rem .4rem; }
  .card { text-align:center; }
  .media { width:100%; max-width:400px; border-radius:18px; display:block; margin:0 auto;
           box-shadow:0 18px 60px rgba(0,0,0,.55); background:#15151f; aspect-ratio: 1 / 1; object-fit:cover; }
  video.media { aspect-ratio:16 / 9; object-fit:cover; }
  .media-free { aspect-ratio:auto; object-fit:contain; height:auto; }
  .audio { width:100%; max-width:400px; margin:1rem auto 0; display:block; }
  h1 { font-size:1.35rem; margin:1.1rem 0 .2rem; }
  .artist { color:#b6c6d6; margin:0 0 1.4rem; }
  .cta { display:inline-flex; align-items:center; gap:.5rem; text-decoration:none; color:#fff; font-weight:700; padding:.8rem 1.5rem; border-radius:999px;
         background:linear-gradient(135deg,#0ea5e9,var(--blueD)); border:1.5px solid var(--blue); box-shadow:0 0 22px rgba(125,211,252,.38), 0 8px 24px rgba(37,99,235,.35); }
  .cta:hover { filter:brightness(1.1); }
  .foot { margin-top:1.2rem; font-size:.78rem; color:#6f8aa0; }
  a.plain { color:var(--blue); text-decoration:none; }
  /* Kommentarar */
  .cm { margin-top:2.2rem; padding:1.1rem 1.1rem 1.2rem; border-radius:18px; text-align:left; background:rgba(10,14,24,.72);
        backdrop-filter:blur(14px); -webkit-backdrop-filter:blur(14px); border:1px solid rgba(125,211,252,.22); }
  .cm h2 { margin:0 0 .8rem; font-size:1.05rem; color:var(--text2); }
  .cm-list { display:flex; flex-direction:column; gap:.75rem; max-height:60vh; overflow:auto; }
  .cm-empty { color:var(--text3); font-size:.9rem; padding:.3rem 0 .6rem; }
  .cm-item { display:flex; gap:.6rem; }
  .cm-av { flex:0 0 32px; height:32px; border-radius:50%; display:grid; place-items:center; font-weight:800; font-size:.85rem; color:#06121f;
           background:linear-gradient(135deg,var(--blue),#a78bfa); }
  .cm-body { min-width:0; flex:1; }
  .cm-meta { font-size:.78rem; color:var(--text3); }
  .cm-meta a { color:var(--text2); font-weight:700; text-decoration:none; }
  .cm-text { margin:.15rem 0 0; white-space:pre-wrap; word-break:break-word; font-size:.95rem; line-height:1.4; }
  .cm-img { display:block; max-width:100%; max-height:280px; border-radius:12px; margin-top:.4rem; }
  .cm-act { margin-top:.2rem; display:flex; gap:.7rem; }
  .cm-act button { background:none; border:0; padding:0; cursor:pointer; color:var(--text3); font:inherit; font-size:.78rem; }
  .cm-act button:hover { color:var(--blue); }
  .cm-form { margin-top:1rem; border-top:1px solid rgba(255,255,255,.08); padding-top:.9rem; }
  .cm-form textarea { width:100%; min-height:74px; resize:vertical; padding:.65rem .75rem; border-radius:12px; border:1px solid rgba(255,255,255,.16);
        background:rgba(255,255,255,.05); color:#f2f2f7; font:inherit; font-size:.95rem; }
  .cm-form textarea:focus { outline:none; border-color:var(--blue); }
  .cm-tools { display:flex; flex-wrap:wrap; align-items:center; gap:.45rem; margin:.55rem 0; }
  .cm-tool { cursor:pointer; color:var(--text); font:inherit; font-size:.82rem; font-weight:600; padding:.38rem .7rem; border-radius:999px;
             background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.16); }
  .cm-tool:hover { border-color:var(--blue); }
  .cm-sw { width:22px; height:22px; border-radius:50%; border:2px solid rgba(255,255,255,.25); cursor:pointer; padding:0; }
  .cm-sw.on { border-color:#fff; box-shadow:0 0 0 2px var(--blue); }
  .cm-gifrow { display:none; gap:.4rem; margin:.4rem 0; }
  .cm-gifrow.open { display:flex; }
  .cm-gifrow input { flex:1; min-width:0; padding:.5rem .7rem; border-radius:10px; border:1px solid rgba(255,255,255,.16); background:rgba(255,255,255,.05); color:#f2f2f7; font:inherit; font-size:.85rem; }
  .cm-prev { display:flex; gap:.5rem; flex-wrap:wrap; margin:.3rem 0; }
  .cm-prev .pv { position:relative; }
  .cm-prev img { max-height:90px; border-radius:10px; display:block; }
  .cm-prev .x { position:absolute; top:-6px; right:-6px; width:20px; height:20px; border-radius:50%; border:0; cursor:pointer; background:#ef4444; color:#fff; font-size:.75rem; line-height:1; }
  .cm-send { display:flex; justify-content:flex-end; gap:.5rem; }
  .cm-post { cursor:pointer; color:#fff; font:inherit; font-weight:700; padding:.55rem 1.3rem; border-radius:999px; background:linear-gradient(135deg,#0ea5e9,var(--blueD)); border:1.5px solid var(--blue); }
  .cm-post[disabled] { opacity:.5; cursor:default; }
  .cm-ghost { cursor:pointer; color:var(--text2); font:inherit; padding:.55rem 1rem; border-radius:999px; background:transparent; border:1px solid rgba(255,255,255,.2); }
  .cm-login { color:var(--text3); font-size:.9rem; margin-top:.8rem; border-top:1px solid rgba(255,255,255,.08); padding-top:.8rem; }
  .cm-login a { color:var(--blue); font-weight:700; text-decoration:none; }
  .cm-err { color:#fca5a5; font-size:.82rem; margin-top:.4rem; min-height:1em; }
</style>
</head>
<body>
  <div class="bg${bgImage ? '' : ' plain'}"${bgImage ? ` style="background-image:url('${esc(bgImage)}')"` : ''}></div>
  <div class="veil"></div>
  <div class="glow"></div>
  <canvas id="fx"></canvas>
  <div class="wrap">
    <div class="top">
      <a class="brand-wrap" href="${SITE}/"><span>SiriusFM.no</span></a>
      <div class="more"><button class="more-btn" id="more-btn" type="button" aria-haspopup="true" aria-expanded="false">☰ More ▾</button><div class="more-panel" id="more-panel" role="menu"></div></div>
    </div>
    <div class="card">
      ${player}
      <h1>${esc(title)}</h1>
      ${artist ? `<p class="artist">${esc(artist)}</p>` : '<div style="height:.6rem"></div>'}
      ${(kind === 'link' && extLink)
        ? `<a class="cta" href="${esc(extLink)}" target="_blank" rel="noopener">▶ Open link</a>
      <div class="foot"><a class="plain" href="${esc(profileUrl)}">See profile on SiriusFM</a></div>`
        : `<a class="cta" href="${esc(profileUrl)}">▶ Open in SiriusFM</a>
      <div class="foot">Shared via <a class="plain" href="${SITE}/">siriusfm.no</a></div>`}
    </div>
    <section class="cm" id="cm" aria-label="Comments">
      <h2>Comments <span id="cm-count" style="color:var(--text3);font-weight:500"></span></h2>
      <div class="cm-list" id="cm-list"><div class="cm-empty">Loading…</div></div>
      <div id="cm-compose"></div>
    </section>
  </div>
<script>
(function () {
  var SITE = ${jsonForScript(SITE)}, SB = 'https://qefdyxpyjwpohsmmmksf.supabase.co', KEY = 'sb_publishable_JEV-NS9FGZ_KpSvQTPwlZg_LlyVy_eS';
  var TARGET = 'share:' + ${jsonForScript(shareKey)};
  var COLORS = ['#f2f2f7', '#7dd3fc', '#a78bfa', '#f472b6', '#fbbf24', '#4ade80', '#fb7185', '#38bdf8'];
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }

  // ── Innlogging (same lokale sesjon som resten av siriusfm.no) ─────────────────
  function me() {
    try {
      var s = JSON.parse(localStorage.getItem('pv_session') || 'null'); if (!s || !s.username) return null;
      var u = (JSON.parse(localStorage.getItem('pv_users') || '{}'))[s.username]; if (!u) return null;
      return { username: s.username, name: u.displayName || s.username };
    } catch (e) { return null; }
  }
  var user = me();

  // ── «More»-meny: gjester ser det same som elles på sida, innlogga får heile menyen ─────
  var L = function (href, label, cls) { return { href: href, label: label, cls: cls }; };
  var items = user ? [
    L('/#/shop', 'Subscription', 'gold'), null,
    L('/#/minside', 'My page'), L('/#/edit', 'Edit profile'), L('/#/settings', 'Settings'), L('/#/inbox', 'Inbox'),
    L('/#/chat', 'Chat'), L('/#/friends', 'Friends'), L('/#/community', 'Community'), L('/#/grupper', 'Groups'),
    L('/#/discover', 'Discover'), L('/#/underground', 'Underground'), L('/#/shows', 'Shows'), L('/#/world', 'World'),
    L('/#/magazine', 'Magazine'), L('/#/live-archive', 'Live Archive'), L('/#/go-live/mine', 'My live requests'),
    L('/#/a1', 'A1'), L('/#/studio', 'Studio'), null, { act: 'logout', label: 'Log out' }
  ] : [
    L('/#/chat', 'Chat'), L('/#/underground', 'Underground'), L('/#/shows', 'Shows'), L('/#/world', 'World'),
    L('/#/magazine', 'Magazine'), L('/#/live-archive', 'Live Archive'), L('/#/a1', 'A1')
  ];
  var mp = $('more-panel');
  items.forEach(function (it) {
    if (!it) { mp.appendChild(document.createElement('hr')); return; }
    if (it.act === 'logout') {
      var b = el('button', '', it.label); b.type = 'button';
      b.onclick = function () { try { localStorage.removeItem('pv_session'); } catch (e) {} location.reload(); };
      mp.appendChild(b); return;
    }
    var a = el('a', it.cls || '', it.label); a.href = it.href; mp.appendChild(a);
  });
  $('more-btn').onclick = function (e) { e.stopPropagation(); var o = mp.classList.toggle('open'); this.setAttribute('aria-expanded', o); };
  document.addEventListener('click', function (e) { if (!mp.contains(e.target)) mp.classList.remove('open'); });

  // ── Levande bakgrunn: svevande partiklar ────────────────────────────────────
  (function () {
    var cv = $('fx'), cx = cv.getContext('2d'), W, H, P = [], N = 46;
    function size() { W = cv.width = innerWidth; H = cv.height = innerHeight; }
    size(); addEventListener('resize', size);
    for (var i = 0; i < N; i++) P.push({ x: Math.random(), y: Math.random(), r: .6 + Math.random() * 2.2, vx: (Math.random() - .5) * .00012, vy: -.00006 - Math.random() * .00016, ph: Math.random() * 6.28 });
    var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    function tick(t) {
      cx.clearRect(0, 0, W, H);
      P.forEach(function (p) {
        p.x += p.vx * 16; p.y += p.vy * 16; if (p.y < -.02) { p.y = 1.02; p.x = Math.random(); } if (p.x < -.02) p.x = 1.02; if (p.x > 1.02) p.x = -.02;
        var a = .25 + .35 * (.5 + .5 * Math.sin(t / 1400 + p.ph));
        var g = cx.createRadialGradient(p.x * W, p.y * H, 0, p.x * W, p.y * H, p.r * 7);
        g.addColorStop(0, 'rgba(160,225,255,' + a + ')'); g.addColorStop(1, 'rgba(125,211,252,0)');
        cx.fillStyle = g; cx.beginPath(); cx.arc(p.x * W, p.y * H, p.r * 7, 0, 6.283); cx.fill();
      });
      if (!reduce) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  })();

  // ── Kommentarar (Supabase, same RPC-ar/tabell som resten av sida) ─────────────────
  function rpc(fn, args) {
    return fetch(SB + '/rest/v1/rpc/' + fn, { method: 'POST', headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(args || {}) })
      .then(function (r) { return r.text().then(function (t) { var j = null; try { j = t ? JSON.parse(t) : null; } catch (e) {} if (!r.ok) throw new Error((j && (j.message || j.hint)) || ('HTTP ' + r.status)); return j; }); });
  }
  function secret(username) {
    var s = {}; try { s = JSON.parse(localStorage.getItem('sc_profile_secrets') || '{}'); } catch (e) {}
    if (!s[username]) { s[username] = (crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '') : String(Date.now()) + Math.random().toString(36).slice(2)); try { localStorage.setItem('sc_profile_secrets', JSON.stringify(s)); } catch (e) {} }
    return s[username];
  }
  var comments = [], editing = null, draft = { color: COLORS[0], gif: '', img: '' };
  function safeUrl(u) { return /^https:\\/\\//i.test(u || '') ? u : ''; }
  function safeColor(c) { return /^#[0-9a-f]{6}$/i.test(c || '') ? c : ''; }
  function ago(ts) { var s = Math.max(1, (Date.now() - ts) / 1000 | 0); if (s < 60) return 'just now'; if (s < 3600) return (s / 60 | 0) + ' min ago'; if (s < 86400) return (s / 3600 | 0) + ' h ago'; return (s / 86400 | 0) + ' d ago'; }

  function renderList() {
    var box = $('cm-list'); box.innerHTML = '';
    $('cm-count').textContent = comments.length ? '(' + comments.length + ')' : '';
    if (!comments.length) { box.appendChild(el('div', 'cm-empty', user ? 'No comments yet — be the first.' : 'No comments yet.')); return; }
    comments.forEach(function (c) {
      var row = el('div', 'cm-item'); row.appendChild(el('div', 'cm-av', (c.name || c.author || '?').charAt(0).toUpperCase()));
      var body = el('div', 'cm-body'), meta = el('div', 'cm-meta');
      var a = el('a', '', c.name || c.author); a.href = SITE + '/#/u/' + encodeURIComponent(c.author); meta.appendChild(a);
      meta.appendChild(document.createTextNode(' · ' + ago(c.ts) + (c.editedTs ? ' · edited' : '')));
      body.appendChild(meta);
      if (c.text) { var t = el('div', 'cm-text', c.text); var col = safeColor(c.color); if (col) t.style.color = col; body.appendChild(t); }
      [c.gif, c.img].forEach(function (u) { u = safeUrl(u); if (u) { var im = el('img', 'cm-img'); im.src = u; im.alt = ''; im.loading = 'lazy'; body.appendChild(im); } });
      if (user && user.username === c.author) {
        var act = el('div', 'cm-act'), eb = el('button', '', 'Edit'), db = el('button', '', 'Delete'); eb.type = db.type = 'button';
        eb.onclick = function () { startEdit(c); };
        db.onclick = function () { if (!confirm('Delete this comment?')) return; rpc('delete_comment_owned', { p_id: c.id, p_author: c.author }).then(load).catch(function (e) { setErr(e.message); }); };
        act.appendChild(eb); act.appendChild(db); body.appendChild(act);
      }
      row.appendChild(body); box.appendChild(row);
    });
  }
  function load() {
    return rpc('list_comments', { p_limit: 1000 }).then(function (rows) {
      comments = (rows || []).filter(function (c) { return c && c._target === TARGET; }).sort(function (a, b) { return (a.ts || 0) - (b.ts || 0); });
      renderList();
    }).catch(function () { $('cm-list').innerHTML = ''; $('cm-list').appendChild(el('div', 'cm-empty', 'Comments could not be loaded.')); });
  }
  function setErr(m) { var e = $('cm-err'); if (e) e.textContent = m || ''; }

  function upload(file) {
    if (!/^image\\//.test(file.type)) return Promise.reject(new Error('Choose an image file.'));
    if (file.size > 8e6) return Promise.reject(new Error('Image is too large (max 8 MB).'));
    var ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) || 'png';
    var path = 'share-comments/' + Date.now() + Math.random().toString(36).slice(2, 8) + '.' + ext;
    return fetch('/api/upload-url', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path: path }) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.error || 'Upload failed'); return j; }); })
      .then(function (info) {
        var fd = new FormData(); fd.append('cacheControl', '3600'); fd.append('', file);
        return fetch(SB + '/storage/v1/object/upload/sign/' + info.bucket + '/' + info.path + '?token=' + encodeURIComponent(info.token), { method: 'PUT', headers: { 'x-upsert': 'true' }, body: fd })
          .then(function (u) { if (!u.ok) throw new Error('Upload failed'); return info.publicUrl; });
      });
  }

  function renderCompose() {
    var box = $('cm-compose'); box.innerHTML = '';
    if (!user) {
      var l = el('div', 'cm-login'); l.appendChild(document.createTextNode('Only logged-in members can write comments. ')); var a = el('a', '', 'Log in'); a.href = SITE + '/#/login'; l.appendChild(a);
      l.appendChild(document.createTextNode(' or ')); var r = el('a', '', 'create a free profile'); r.href = SITE + '/#/register'; l.appendChild(r); l.appendChild(document.createTextNode('.')); box.appendChild(l); return;
    }
    var f = el('div', 'cm-form');
    var ta = el('textarea'); ta.placeholder = editing ? 'Edit your comment…' : 'Write a comment as ' + user.name + '…'; ta.maxLength = 1500; ta.value = draft.text || ''; ta.style.color = draft.color;
    ta.oninput = function () { draft.text = ta.value; sync(); };
    f.appendChild(ta);
    var tools = el('div', 'cm-tools');
    COLORS.forEach(function (c) { var s = el('button', 'cm-sw' + (c === draft.color ? ' on' : '')); s.type = 'button'; s.style.background = c; s.title = 'Text color'; s.onclick = function () { draft.color = c; renderCompose(); }; tools.appendChild(s); });
    var pick = document.createElement('input'); pick.type = 'color'; pick.value = draft.color; pick.title = 'Pick any color'; pick.style.cssText = 'width:30px;height:26px;border:0;background:none;padding:0;cursor:pointer';
    pick.oninput = function () { draft.color = pick.value; ta.style.color = pick.value; };
    tools.appendChild(pick);
    var gb = el('button', 'cm-tool', 'GIF'); gb.type = 'button';
    var ib = el('button', 'cm-tool', 'Add image'); ib.type = 'button';
    var file = document.createElement('input'); file.type = 'file'; file.accept = 'image/*'; file.style.display = 'none';
    ib.onclick = function () { file.click(); };
    file.onchange = function () {
      var fl = file.files && file.files[0]; if (!fl) return; ib.textContent = 'Uploading…'; ib.disabled = true; setErr('');
      upload(fl).then(function (u) { draft.img = u; renderCompose(); }).catch(function (e) { setErr(e.message); ib.textContent = 'Add image'; ib.disabled = false; });
    };
    tools.appendChild(gb); tools.appendChild(ib); tools.appendChild(file); f.appendChild(tools);
    var gr = el('div', 'cm-gifrow' + (draft.gifOpen ? ' open' : '')), gi = document.createElement('input'); gi.placeholder = 'Paste a GIF link (https://….gif)'; gi.value = draft.gif || '';
    var gok = el('button', 'cm-tool', 'Add'); gok.type = 'button';
    gb.onclick = function () { draft.gifOpen = !draft.gifOpen; renderCompose(); };
    gok.onclick = function () { var u = gi.value.trim(); if (!safeUrl(u)) { setErr('GIF link must start with https://'); return; } draft.gif = u; draft.gifOpen = false; renderCompose(); };
    gr.appendChild(gi); gr.appendChild(gok); f.appendChild(gr);
    var pv = el('div', 'cm-prev');
    [['gif', draft.gif], ['img', draft.img]].forEach(function (p) { if (!p[1]) return; var w = el('div', 'pv'), im = el('img'); im.src = p[1]; im.alt = ''; var x = el('button', 'x', '×'); x.type = 'button'; x.onclick = function () { draft[p[0]] = ''; renderCompose(); }; w.appendChild(im); w.appendChild(x); pv.appendChild(w); });
    f.appendChild(pv);
    f.appendChild(el('div', 'cm-err')); f.lastChild.id = 'cm-err';
    var send = el('div', 'cm-send');
    if (editing) { var cn = el('button', 'cm-ghost', 'Cancel'); cn.type = 'button'; cn.onclick = function () { editing = null; draft = { color: COLORS[0], gif: '', img: '' }; renderCompose(); }; send.appendChild(cn); }
    var post = el('button', 'cm-post', editing ? 'Save' : 'Post'); post.type = 'button'; post.id = 'cm-post'; send.appendChild(post); f.appendChild(send);
    box.appendChild(f); sync();
    post.onclick = function () {
      var text = (draft.text || '').trim(); if (!text && !draft.gif && !draft.img) return;
      post.disabled = true; setErr('');
      var now = Date.now(), id = editing ? editing.id : 'sh_' + now.toString(36) + Math.random().toString(36).slice(2, 7);
      var data = { id: id, author: user.username, name: user.name, text: text, ts: editing ? editing.ts : now, color: draft.color, gif: draft.gif || '', img: draft.img || '' };
      if (editing) data.editedTs = now;
      rpc('upsert_comment', { p_id: id, p_target: TARGET, p_author: user.username, p_secret: secret(user.username), p_data: data, p_ts: data.ts })
        .then(function () { editing = null; draft = { color: draft.color, gif: '', img: '' }; renderCompose(); return load(); })
        .catch(function (e) { post.disabled = false; setErr(/secret_mismatch/.test(e.message) ? 'You can only edit this comment from the device it was written on.' : ('Could not post: ' + e.message)); });
    };
  }
  function sync() { var b = $('cm-post'); if (b) b.disabled = !((draft.text || '').trim() || draft.gif || draft.img); }
  function startEdit(c) { editing = c; draft = { text: c.text || '', color: safeColor(c.color) || COLORS[0], gif: safeUrl(c.gif), img: safeUrl(c.img) }; renderCompose(); $('cm').scrollIntoView({ behavior: 'smooth', block: 'end' }); }

  renderCompose(); load();
  setInterval(function () { if (!document.hidden && !editing && !(draft.text || '').trim()) load(); }, 20000);
})();
</script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  // Crawlere (OG-tagger) kan cache i 5 min / CDN 1 t; kommentarane hentast klientside, så dei er alltid ferske.
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=3600');
  res.status(200).send(html);
};
