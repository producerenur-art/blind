// Offentlig butikkvisning: publiserte produkter for en selger.
// Går via service-role fordi products-tabellen har RLS lukket.
const { createClient } = require('@supabase/supabase-js');

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
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY)
    return res.status(503).json({ error: 'Supabase er ikke konfigurert på serveren.' });

  const username = req.query?.username;
  if (!username) return res.status(400).json({ error: 'Mangler brukernavn' });

  try {
    // Eksponer aldri audio_path her — kun salgs-metadata.
    const { data, error } = await supa().from('products')
      .select('id,title,artist,label,producer,mixing,mastering,buy_links,price_ore,is_free,duration_sec,created_at')
      .eq('seller_username', username).eq('is_published', true)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.status(200).json({ products: data || [] });
  } catch (err) {
    console.error('store-products error:', err.message);
    res.status(500).json({ error: err.message });
  }
};
