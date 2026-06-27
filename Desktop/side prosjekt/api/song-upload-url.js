// Mint en kortlevd signert opplastings-URL for den PRIVATE 'songs'-bøtta
// (betalte/salgbare sanger). Skilt fra api/upload-url.js, som bruker den
// offentlige delt-media-bøtta. service_role-nøkkelen forblir server-side.
const { createClient } = require('@supabase/supabase-js');

const BUCKET = 'songs';

function supa() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
}
function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  // SIKKERHETSPORT: av til en auth-layer er på plass (se MARKETPLACE-SECURITY-TODO.md).
  // Uten dette er dette et åpent opplastingsendepunkt. Sett MARKETPLACE_ENABLED=true når auth er klar.
  if (process.env.MARKETPLACE_ENABLED !== 'true')
    return res.status(503).json({ error: 'Markedsplassen er ikke aktivert ennå.' });
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY)
    return res.status(503).json({ error: 'Lagring er ikke konfigurert (mangler SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).' });

  let path = typeof req.body?.path === 'string' ? req.body.path.trim() : '';
  // Sikre stien: ingen leading slash, ingen ".." traversering
  path = path.replace(/^\/+/, '').replace(/\.{2,}/g, '').replace(/[^\w./-]/g, '_');
  if (!path) return res.status(400).json({ error: 'Mangler gyldig sti' });

  try {
    const { data, error } = await supa().storage.from(BUCKET).createSignedUploadUrl(path);
    if (error) throw error;
    res.status(200).json({ token: data.token, path: data.path, bucket: BUCKET });
  } catch (err) {
    console.error('song-upload-url error:', err.message);
    res.status(500).json({ error: err.message });
  }
};
