// «Mine kjøp» — betalte (eller gratis) kjøp for en bruker, med produkt-info
// så de kan lastes ned igjen. Går via service-role (RLS lukket).
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
    const { data, error } = await supa().from('purchases')
      .select('id,product_id,amount_ore,status,created_at,products(title,artist,seller_username)')
      .eq('buyer_username', username).eq('status', 'paid')
      .order('created_at', { ascending: false });
    if (error) throw error;
    const purchases = (data || []).map(p => ({
      productId:  p.product_id,
      title:      p.products?.title || 'Ukjent',
      artist:     p.products?.artist || '',
      seller:     p.products?.seller_username || '',
      amount_nok: (p.amount_ore || 0) / 100,
      created_at: p.created_at,
    }));
    res.status(200).json({ purchases });
  } catch (err) {
    console.error('my-purchases error:', err.message);
    res.status(500).json({ error: err.message });
  }
};
