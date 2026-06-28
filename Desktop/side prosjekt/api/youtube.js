// YouTube Data API v3 søke-proxy.
// Lèt brukarane søkje opp låtar på YouTube *inni* SoundCore — utan å forlate
// sida. Frontend kallar GET /api/youtube?q=... og får attende ei liste med
// videotreff (id, tittel, kanal, thumbnail) som kan spelast i ein embed.
//
// Krev YOUTUBE_API_KEY i miljøet (Vercel env / .env). Aldri eksponer nøkkelen
// til klienten — han blir berre brukt her på serveren.

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  if (!process.env.YOUTUBE_API_KEY) {
    return res.status(503).json({ error: 'YouTube-søk er ikkje konfigurert på serveren' });
  }

  const q = String((req.query && req.query.q) || '').trim();
  if (!q) return res.status(400).json({ error: 'Mangler søkeord' });
  if (q.length > 120) return res.status(400).json({ error: 'Søkeordet er for langt' });

  const params = new URLSearchParams({
    part: 'snippet',
    type: 'video',
    maxResults: '12',
    videoEmbeddable: 'true',
    safeSearch: 'moderate',
    q,
    key: process.env.YOUTUBE_API_KEY,
  });

  try {
    const r = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);
    const data = await r.json();

    if (!r.ok) {
      const reason = data?.error?.errors?.[0]?.reason || '';
      if (reason === 'quotaExceeded')
        return res.status(429).json({ error: 'YouTube-søkekvoten er brukt opp for i dag' });
      console.error('YouTube API feil:', r.status, data?.error?.message);
      return res.status(502).json({ error: data?.error?.message || 'YouTube-søk feilet' });
    }

    const items = (data.items || [])
      .filter(it => it.id && it.id.videoId)
      .map(it => ({
        id: it.id.videoId,
        title: it.snippet?.title || '',
        channel: it.snippet?.channelTitle || '',
        thumb: it.snippet?.thumbnails?.medium?.url
            || it.snippet?.thumbnails?.default?.url || '',
      }));

    // Cache på CDN i 1 time — same søk treng ikkje treffe kvoten på nytt.
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json({ items });
  } catch (e) {
    console.error('YouTube-søk feil:', e);
    return res.status(500).json({ error: e?.message || 'Kunne ikkje søkje på YouTube' });
  }
};
