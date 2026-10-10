// Serverless: deler ut kortlevde TURN-opplysningar (Cloudflare Realtime TURN) til
// js/livebroadcast.js, så live-lyd kan gå via relay når direkte kopling ikkje går
// (mobilnett/streng NAT — ellers hakking/fråfall). Secrets ligg berre i Vercel-env:
//   CF_TURN_KEY_ID, CF_TURN_API_TOKEN  (Cloudflare → Realtime → TURN → Create key)
// Utan dei svarar vi 503 og klienten fell tilbake til berre STUN.
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  // Bar-vert (siriusfm.no) sender /api/* direkte til www (index.html), så anropet er cross-origin → trengs CORS.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  const id = process.env.CF_TURN_KEY_ID, token = process.env.CF_TURN_API_TOKEN;
  if (!id || !token) { res.status(503).json({ error: 'turn_not_configured' }); return; }
  try {
    const r = await fetch(`https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(id)}/credentials/generate-ice-servers`, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ttl: 86400 }),
    });
    if (!r.ok) { res.status(502).json({ error: 'cloudflare_' + r.status }); return; }
    const j = await r.json();
    if (!j || !Array.isArray(j.iceServers)) { res.status(502).json({ error: 'bad_response' }); return; }
    res.status(200).json({ iceServers: j.iceServers });
  } catch (e) {
    res.status(502).json({ error: 'fetch_failed' });
  }
};
