// Avstemming av Pro-status. Pro låses opp client-side (Gun.js) rett etter checkout —
// dette endepunktet lar klienten sjekke om Stripe fortsatt sier abonnementet er aktivt,
// slik at et kansellert/utløpt/feilet abonnement (endra utanfor appen) kan oppdagast og
// nedgraderast lokalt. Sjå supabase/migrations/0013_subscriptions.sql og
// api/stripe-webhook.js for korleis tabellen fylles.
//
// Fail-open med vilje: mangler tabellrad, DB-feil eller manglande env → 'unknown', ikke
// 'canceled'. Klienten skal ALDRI nedgradere ein betalande brukar pga. ein serverfeil.
const { createClient } = require('@supabase/supabase-js');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { username } = req.query;
  if (!username) return res.status(400).json({ error: 'Missing username' });

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(200).json({ status: 'unknown' });
  }

  try {
    const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const { data, error } = await db
      .from('subscriptions')
      .select('status, plan, current_period_end, stripe_subscription_id')
      .eq('username', username)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(200).json({ status: 'unknown' }); // ingen rad enda (webhook kan henge etter) — ikke tolk som kansellert

    return res.status(200).json({
      status: data.status, // active | past_due | canceled
      plan: data.plan,
      currentPeriodEnd: data.current_period_end,
      subscriptionId: data.stripe_subscription_id,
    });
  } catch (err) {
    console.error('subscription-status error:', err.message);
    return res.status(200).json({ status: 'unknown' });
  }
};
