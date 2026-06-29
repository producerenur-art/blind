const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Autoritativ prisliste — klienten kan ALDRI sette beløp selv.
// Alle planer er Sound Core Pro med påløpende (recurring) betaling.
// Lengre bindingstid = lavere månedspris. Beløp i øre (NOK).
const PLANS = {
  monthly: { amount:  14900, interval: 'month', interval_count: 1, label: '1 måned'    }, // 149 kr/mnd
  quarter: { amount:  39900, interval: 'month', interval_count: 3, label: '3 måneder'  }, // 133 kr/mnd
  half:    { amount:  74900, interval: 'month', interval_count: 6, label: '6 måneder'  }, // 125 kr/mnd
  year:    { amount: 129000, interval: 'year',  interval_count: 1, label: '12 måneder' }, // 108 kr/mnd
};

// Live Mix-tid: engangsbetaling, per booka time. 150 kr/time (15000 øre).
// Speiler js/livemix.js (RATE_ORE) — autoritativt her, klienten kan ALDRI sette beløp.
const LIVEMIX_RATE_ORE = 15000;
const LIVEMIX_MAX_HOURS = 8;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { username, plan, product } = req.body || {};
  if (!username) return res.status(400).json({ error: 'Mangler brukernavn' });

  const siteUrl = process.env.SITE_URL || `https://${req.headers.host}`;

  // ── Live Mix-tid: engangsbetaling (mode:'payment'), per booka time ──
  if (product === 'livemix') {
    const hours = Math.max(1, Math.min(LIVEMIX_MAX_HOURS, parseInt(req.body.hours, 10) || 1));
    const slot  = typeof req.body.slot === 'string' ? req.body.slot.slice(0, 40) : '';
    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'nok',
            product_data: {
              name: `Sound Core — Live Mix-tid (${hours} ${hours > 1 ? 'timer' : 'time'})`,
              description: 'Reservert direktesendt mikse-slot. Opptaket lagres på profilen din etterpå.',
            },
            unit_amount: LIVEMIX_RATE_ORE,
          },
          quantity: hours,
        }],
        mode: 'payment',
        success_url: `${siteUrl}?payment_success={CHECKOUT_SESSION_ID}`,
        cancel_url:  `${siteUrl}/`,
        metadata: { username, product: 'livemix', hours: String(hours), slot },
      });
      return res.status(200).json({ url: session.url });
    } catch (err) {
      console.error('Stripe livemix checkout error:', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  const planKey = PLANS[plan] ? plan : 'monthly';
  const p = PLANS[planKey];

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
