const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { verify } = require('./_hmac');

// Kanseller (eller angre kansellering av) et løpende Pro-abonnement.
// Standard: cancel_at_period_end — brukeren beholder Pro ut den betalte perioden,
// og Stripe slutter å fakturere etterpå. reactivate:true angrer kanselleringen.
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { subscriptionId, reactivate, sessionToken } = req.body || {};
  if (!subscriptionId) return res.status(400).json({ error: 'Missing subscription ID' });

  // Autorisering: den innlogga brukaren (sesjonstoken frå api/auth.js) må EIGE abonnementet.
  // Utan dette kunne kven som helst som kjende ein abonnements-ID kansellert andre sitt Pro.
  const claim = verify(sessionToken);
  if (!claim || claim.purpose !== 'session' || !claim.username)
    return res.status(401).json({ error: 'Please log in again to manage your subscription.' });

  try {
    const existing = await stripe.subscriptions.retrieve(subscriptionId);
    const owner = String((existing.metadata && existing.metadata.username) || '').toLowerCase();
    if (!owner || owner !== String(claim.username).toLowerCase())
      return res.status(403).json({ error: 'This subscription does not belong to your account.' });

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
