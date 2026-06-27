// Sjekk Stripe Connect-status for en selger og synk flaggene til Supabase.
const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

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

  const db = supa();
  try {
    const { data: seller } = await db.from('sellers').select('*').eq('username', username).maybeSingle();
    if (!seller) return res.status(200).json({ seller: false, onboarding_complete: false, charges_enabled: false });

    const acct = await stripe.accounts.retrieve(seller.stripe_account_id);
    const charges_enabled = !!acct.charges_enabled;
    const payouts_enabled = !!acct.payouts_enabled;
    const onboarding_complete = charges_enabled && !!acct.details_submitted;

    await db.from('sellers')
      .update({ charges_enabled, payouts_enabled, onboarding_complete })
      .eq('username', username);

    res.status(200).json({ seller: true, onboarding_complete, charges_enabled, payouts_enabled });
  } catch (err) {
    console.error('connect-status error:', err.message);
    res.status(500).json({ error: err.message });
  }
};
