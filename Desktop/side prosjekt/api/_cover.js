// api/_cover.js — statisk 1200x630 JPEG-versjon av eit cover-bilde til og:image (brukt av api/share.js
// via /api/share?cover=<url>). Facebook avviser og:image over ~8 MB og viser ikkje animerte GIF-ar, og
// kuttar kvadratiske bilete til bredformat. Her: første ramme, heile coveret midt i, uskarp/mørkna
// utviding på sidene. Berre bilete frå vårt eige Supabase-lager (ikkje ein open bilde-proxy).
const sharp = require('sharp');

function allowedHost(h) {
  try { if (process.env.SUPABASE_URL && new URL(process.env.SUPABASE_URL).host === h) return true; } catch (_) {}
  return /^qefdyxpyjwpohsmmmksf\.supabase\.co$/i.test(h);
}

module.exports = async function coverHandler(req, res) {
  try {
    const u = new URL(String((req.query && req.query.cover) || ''));
    if (u.protocol !== 'https:' || !allowedHost(u.host) || !u.pathname.startsWith('/storage/v1/object/public/')) {
      res.statusCode = 400; return res.end('bad url');
    }
    const r = await fetch(u.href);
    if (!r.ok) { res.statusCode = 404; return res.end('not found'); }
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length > 40 * 1024 * 1024) { res.statusCode = 413; return res.end('too large'); }
    const W = 1200, H = 630;
    const bg = await sharp(buf, { pages: 1 }).resize(W, H, { fit: 'cover' }).blur(40).modulate({ brightness: 0.55 }).jpeg({ quality: 80 }).toBuffer();
    const fg = await sharp(buf, { pages: 1 }).resize(H, H, { fit: 'inside' }).flatten({ background: '#0a0f2a' }).png().toBuffer();
    const out = await sharp(bg).composite([{ input: fg, gravity: 'center' }]).jpeg({ quality: 84 }).toBuffer();
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400');
    res.statusCode = 200;
    return res.end(out);
  } catch (e) {
    res.statusCode = 500; return res.end('error');
  }
};
