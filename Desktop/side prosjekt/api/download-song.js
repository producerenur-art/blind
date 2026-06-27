// Tilgangsstyrt nedlasting. Returnerer en kortlevd signert URL fra den private
// 'songs'-bøtta KUN hvis kjøperen har et betalt kjøp (eller sangen er gratis).
const { createClient } = require('@supabase/supabase-js');

const BUCKET = 'songs';

function supa() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
}
function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  // SIKKERHETSPORT: av til en auth-layer er på plass (se MARKETPLACE-SECURITY-TODO.md).
  // Uten dette kan betalingsmuren omgås via et offentlig brukernavn. Sett MARKETPLACE_ENABLED=true når auth er klar.
  if (process.env.MARKETPLACE_ENABLED !== 'true')
    return res.status(503).json({ error: 'Markedsplassen er ikke aktivert ennå.' });
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY)
    return res.status(503).json({ error: 'Supabase er ikke konfigurert på serveren.' });

  const productId = req.query?.productId;
  const username  = req.query?.username;
  if (!productId || !username) return res.status(400).json({ error: 'Mangler productId eller username.' });

  const db = supa();
  try {
    const { data: product } = await db.from('products').select('*').eq('id', productId).maybeSingle();
    if (!product) return res.status(404).json({ error: 'Fant ikke sangen.' });

    let allowed = product.is_free;
    if (!allowed) {
      const { data: pur } = await db.from('purchases')
        .select('id').eq('product_id', productId).eq('buyer_username', username).eq('status', 'paid').limit(1);
      allowed = !!(pur && pur.length);
    }
    if (!allowed) return res.status(403).json({ error: 'Ingen gyldig kjøp funnet for denne sangen.' });

    const { data, error } = await db.storage.from(BUCKET).createSignedUrl(product.audio_path, 60 * 60);
    if (error) throw error;
    res.status(200).json({ url: data.signedUrl, title: product.title });
  } catch (err) {
    console.error('download-song error:', err.message);
    res.status(500).json({ error: err.message });
  }
};
