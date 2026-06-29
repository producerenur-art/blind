const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { session_id } = req.query;
  if (!session_id) return res.status(400).json({ error: 'Mangler session_id' });

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);

    const paid = session.payment_status === 'paid' || session.status === 'complete';
    if (!paid) {
      return res.status(402).json({ error: 'Betaling ikke fullført' });
    }

    res.status(200).json({
      success:        true,
      sessionId:      session.id,
      username:       session.metadata?.username || null,
      plan:           session.metadata?.plan     || null,
      product:        session.metadata?.product  || null,
      hours:          session.metadata?.hours ? parseInt(session.metadata.hours, 10) : null,
      slot:           session.metadata?.slot      || null,
      amountTotal:    session.amount_total        || null,
      subscriptionId: session.subscription      || null,
      customerEmail:  session.customer_details?.email || null,
    });
  } catch (err) {
    console.error('Stripe verify error:', err.message);
    res.status(500).json({ error: err.message });
  }
};
