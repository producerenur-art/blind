// Periodisk helse-sjekk av ALLE radiostrøymar (js/radio.js STATIONS) — varslar
// eigaren på e-post når éin eller fleire sluttar å svare, så ein daud strøym
// ikkje blir oppdaga tilfeldig av ein lyttar veker seinare.
//
// STATIONS blir lest ut av js/radio.js SOM TEKST (ikkje require()'a) — den
// fila har mykje browser-only kode på toppnivå (window, localStorage) som
// kastar med ein gong i Node. Å plukke ut berre STATIONS-array-literalen og
// evaluere DEN er trygt (statisk data me sjølv skreiv) og unngår duplisering
// (éin kjelde til sannhet, same idé som js/shows.js/js/world.js/js/radio247.js
// sine module.exports).
//
// Køyring:
//   • Cron (sjå crons i vercel.json) — Vercel sender då x-vercel-cron-headeren.
//   • Manuelt: POST /api/radio-healthcheck med header  x-cron-secret: <CRON_SECRET>
//   • Tørrkøyring (sender ingen e-post, berre rapporterer):  ?dry=1
const fs = require('fs');
const path = require('path');

function loadStations() {
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'radio.js'), 'utf8');
  const marker = 'const STATIONS = [';
  const start = src.indexOf(marker);
  if (start === -1) throw new Error('Fann ikkje STATIONS i js/radio.js');
  const arrStart = src.indexOf('[', start);
  let depth = 0, end = -1;
  for (let i = arrStart; i < src.length; i++) {
    if (src[i] === '[') depth++;
    else if (src[i] === ']') { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end === -1) throw new Error('Fann ikkje slutten på STATIONS-arrayen');
  const arrText = src.slice(arrStart, end + 1);
  // eslint-disable-next-line no-new-func — statisk data me sjølv skreiv, ikkje brukarinput.
  return new Function(`return ${arrText};`)();
}

function authorised(req) {
  if (req.headers['x-vercel-cron']) return true;
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = req.headers['x-cron-secret'] || (req.query && req.query.secret);
  return given === secret;
}

async function checkOne(station) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const r = await fetch(station.url, {
      method: 'GET',
      headers: { Range: 'bytes=0-2000', 'User-Agent': 'SiriusFM-Healthcheck/1.0' },
      signal: controller.signal,
      redirect: 'follow',
    });
    clearTimeout(timer);
    const ok = r.ok || r.status === 206;
    return { id: station.id, name: station.name, cat: station.cat, url: station.url, ok, status: r.status };
  } catch (e) {
    clearTimeout(timer);
    return { id: station.id, name: station.name, cat: station.cat, url: station.url, ok: false, error: e.message };
  }
}

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!authorised(req)) return res.status(401).json({ error: 'Unauthorized' });

  const dry = !!(req.query && req.query.dry);

  try {
    const stations = loadStations();
    // I små puljer — ikkje 40+ samtidige utgåande sambindingar frå éin funksjon.
    const BATCH = 8;
    const results = [];
    for (let i = 0; i < stations.length; i += BATCH) {
      const batch = stations.slice(i, i + BATCH);
      results.push(...await Promise.all(batch.map(checkOne)));
    }
    const failed = results.filter(r => !r.ok);

    if (!dry && failed.length && process.env.RESEND_API_KEY) {
      const siteUrl = (process.env.SITE_URL || 'https://www.siriusfm.no').replace(/\/$/, '');
      try {
        await fetch(`${siteUrl}/api/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'radio_healthcheck', failed }),
        });
      } catch (e) {
        console.error('radio-healthcheck: kunne ikkje sende varsel-e-post:', e && e.message ? e.message : e);
      }
    }

    return res.status(200).json({ ok: true, total: results.length, failed: failed.length, results: dry ? results : failed });
  } catch (e) {
    console.error('radio-healthcheck error:', e && e.message ? e.message : e);
    return res.status(500).json({ error: 'Could not run the health check' });
  }
};
