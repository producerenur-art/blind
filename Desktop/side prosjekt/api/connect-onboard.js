// Stripe Connect (Express) — opprett/gjenbruk en selger-konto og returner en
// onboarding-lenke. Selgeren fullfører KYC hos Stripe og kan så motta utbetalinger.
const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

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
  if (!process.env.STRIPE_SECRET_KEY)
    return res.status(503).json({ error: 'Stripe er ikke konfigurert på serveren.' });

  const { username } = req.body || {};
  if (!username) return res.status(400).json({ error: 'Mangler brukernavn' });

  const siteUrl = process.env.SITE_URL || `https://${req.headers.host}`;
  const db = supa();
  try {
    const { data: seller } = await db.from('sellers').select('*').eq('username', username).maybeSingle();
    let accountId = seller?.stripe_account_id;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'NO',
        capabilities: { transfers: { requested: true } },
        metadata: { username },
      });
      accountId = account.id;
      await db.from('sellers').upsert(
        { username, stripe_account_id: accountId, onboarding_complete: false },
        { onConflict: 'username' }
      );
    }

    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${siteUrl}/#/edit`,
      return_url:  `${siteUrl}/#/edit`,
      type: 'account_onboarding',
    });

    res.status(200).json({ url: link.url });
  } catch (err) {
    console.error('connect-onboard error:', err.message);
    res.status(500).json({ error: err.message });
  }
};
