// Gjeldande ICY-tittel (StreamTitle) for ein radiostrøym — brukt av 24/7 Cycle til å oppdage
// at ein tredjeparts-stasjon spelar reklame/stasjons-ID (js/radio.js, _adGuard). Nettlesaren
// kan ikkje lese ICY frå eit anna opphav, og ei ekstra avspelingsstraum ville doblet datamengda,
// så tenaren opnar strøymen, les fram til FØRSTE metadata-blokk og lukkar att (~metaint bytes).
//
// SSRF-vern: berre URL-ar som står ordrett i js/radio.js (STATIONS) blir henta.
//   GET /api/radio-nowplaying?url=<strøym-url>   →   { title: "Artist - Tittel" | "" , ok: true }
const fs = require('fs');
const path = require('path');

let _allowed = null;
function allowed(url) {
  if (!_allowed) _allowed = fs.readFileSync(path.join(__dirname, '..', 'js', 'radio.js'), 'utf8');
  return _allowed.includes("'" + url + "'");
}

module.exports = async (req, res) => {
  // CORS (rett 2026-11-01): sida kallar dette frå ein annan vert enn API-et (siriusfm.no ↔ www.siriusfm.no) — utan desse
  // headerane blokkerte nettlesaren svaret, og reklamevakten (_adGuardTick) fekk aldri ein tittel.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }
  res.setHeader('Cache-Control', 's-maxage=5, stale-while-revalidate=10');
  const url = String((req.query && req.query.url) || '');
  if (!/^https:\/\//.test(url) || !allowed(url)) { res.status(400).json({ ok: false, error: 'ukjend strøym' }); return; }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(url, { headers: { 'Icy-MetaData': '1', 'User-Agent': 'SiriusFM-nowplaying' }, signal: ctrl.signal });
    const metaint = parseInt(r.headers.get('icy-metaint') || '0', 10);
    if (!r.ok || !metaint || !r.body) { res.status(200).json({ ok: false, title: '' }); ctrl.abort(); return; }
    const reader = r.body.getReader();
    let buf = Buffer.alloc(0), need = metaint + 1, title = null;
    while (title === null) {
      const { value, done } = await reader.read();
      if (done) break;
      buf = Buffer.concat([buf, Buffer.from(value)]);
      if (buf.length >= need) {
        const len = buf[metaint] * 16;
        need = metaint + 1 + len;
        if (buf.length >= need) {
          const m = buf.slice(metaint + 1, need).toString('utf8');
          const mm = /StreamTitle='(.*?)';/s.exec(m);
          title = mm ? mm[1] : '';
        }
      }
    }
    ctrl.abort();
    res.status(200).json({ ok: title !== null, title: title || '' });
  } catch (e) {
    res.status(200).json({ ok: false, title: '' });
  } finally { clearTimeout(timer); }
};
