const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Kanseller (eller angre kansellering av) et løpende Pro-abonnement.
// Standard: cancel_at_period_end — brukeren beholder Pro ut den betalte perioden,
// og Stripe slutter å fakturere etterpå. reactivate:true angrer kanselleringen.
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { subscriptionId, reactivate } = req.body || {};
  if (!subscriptionId) return res.status(400).json({ error: 'Missing subscription ID' });

  try {
    const sub = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: !reactivate,
    });
    return res.status(200).json({
      success:           true,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      currentPeriodEnd:  sub.current_period_end, // unix-sekunder
    });
  } catch (err) {
    console.error('Stripe cancel error:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
