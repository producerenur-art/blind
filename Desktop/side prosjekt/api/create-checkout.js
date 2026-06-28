const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { PLANS } = require('./_plans');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { username, plan } = req.body || {};
  if (!username) return res.status(400).json({ error: 'Mangler brukernavn' });

  const planKey = PLANS[plan] ? plan : 'monthly';
  const p = PLANS[planKey];

  const siteUrl = process.env.SITE_URL || `https://${req.headers.host}`;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'nok',
          product_data: {
            name: `Sound Core Pro — ${p.label}`,
            description: 'Pro: DJ-mixes over 3 timer, privat/offentlig synlighet, Pro-badge og ubegrenset lagring',
            images: [],
          },
          unit_amount: p.amount,
          recurring: { interval: p.interval, interval_count: p.interval_count },
        },
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: `${siteUrl}?payment_success={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${siteUrl}#/shop`,
      metadata: { username, plan: planKey },
      allow_promotion_codes: true,
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Stripe checkout error:', err.message);
    res.status(500).json({ error: err.message });
  }
};
