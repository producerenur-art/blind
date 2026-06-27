// Opprett/oppdater et produkt (sang til salgs eller gratis nedlasting).
// Lyd-filen må allerede være lastet opp til den private 'songs'-bøtta (audio_path).
const { createClient } = require('@supabase/supabase-js');

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
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY)
    return res.status(503).json({ error: 'Supabase er ikke konfigurert på serveren.' });

  const b = req.body || {};
  const { username, productId, title, artist, credits, buyLinks, price_ore, is_free, audio_path, cover_path, duration_sec } = b;
  if (!username || !title || !audio_path)
    return res.status(400).json({ error: 'Mangler påkrevde felt (username, title, audio_path).' });

  const db = supa();
  const free = !!is_free;

  try {
    // Betalt salg krever fullført Connect-onboarding.
    if (!free) {
      const { data: seller } = await db.from('sellers').select('onboarding_complete, stripe_account_id').eq('username', username).maybeSingle();
      if (!seller || !seller.stripe_account_id || !seller.onboarding_complete)
        return res.status(400).json({ error: 'Fullfør selger-onboarding (Bli selger) før du selger betalte sanger.' });
    }

    const c = credits || {};
    const row = {
      seller_username: username,
      title,
      artist:    artist || null,
      label:     c.label || null,
      producer:  c.producer || null,
      mixing:    c.mixing || null,
      mastering: c.mastering || null,
      buy_links: buyLinks || {},
      price_ore: free ? 0 : Math.max(0, parseInt(price_ore, 10) || 0),
      is_free:   free,
      duration_sec: duration_sec ? Math.round(duration_sec) : null,
      audio_path,
      cover_path: cover_path || null,
      is_published: true,
    };

    let result;
    if (productId) {
      result = await db.from('products').update(row).eq('id', productId).eq('seller_username', username).select().maybeSingle();
    } else {
      result = await db.from('products').insert(row).select().maybeSingle();
    }
    if (result.error) throw result.error;

    res.status(200).json({ product: result.data });
  } catch (err) {
    console.error('list-product error:', err.message);
    res.status(500).json({ error: err.message });
  }
};
