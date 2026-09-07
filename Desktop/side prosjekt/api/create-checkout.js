const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Autoritativ prisliste — klienten kan ALDRI sette beløp selv.
// Alle planer er SiriusFM Pro med påløpende (recurring) betaling.
// Lengre bindingstid = lavere månedspris. Beløp i øre (NOK).
const PLANS = {
  monthly: { amount:  14900, interval: 'month', interval_count: 1, label: '1 month'    }, // 149 kr/mnd
  quarter: { amount:  39900, interval: 'month', interval_count: 3, label: '3 months'   }, // 133 kr/mnd
  half:    { amount:  74900, interval: 'month', interval_count: 6, label: '6 months'   }, // 125 kr/mnd
  year:    { amount: 129000, interval: 'year',  interval_count: 1, label: '12 months'  }, // 108 kr/mnd
};

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { username, plan, product, hours } = req.body || {};
  if (!username) return res.status(400).json({ error: 'Missing username' });

  const siteUrl = process.env.SITE_URL || `https://${req.headers.host}`;

  // Engangskjøp: ekstra opplastingstimer for én DJ-mix over 3 timer (60 kr/time).
  // mode:'payment' (ikke abonnement). Beløpet settes autoritativt server-side.
  if (product === 'upload-hours') {
    const h = Math.max(1, Math.min(24, parseInt(hours, 10) || 1));
    try {
      const session = await stripe.checkout.sessions.create({
        // payment_method_types utelates med vilje: Stripe viser da metodene som er
        // aktivert i Dashboard (Kort + PayPal m.fl.) og som er gyldige for valuta/modus.
        // Engangskjøp i NOK støtter PayPal når det er skrudd på i Dashboard.
        line_items: [{
          price_data: {
            currency: 'nok',
            product_data: {
              name: `Extra upload time — ${h} hour${h > 1 ? 's' : ''}`,
              description: 'Lets you upload one DJ mix longer than 3 hours on SiriusFM.',
            },
            unit_amount: 6000, // 60 kr per time
          },
          quantity: h,
        }],
        mode: 'payment',
        success_url: `${siteUrl}?payment_success={CHECKOUT_SESSION_ID}`,
        cancel_url:  `${siteUrl}#/shop`,
        metadata: { username, product: 'upload-hours', hours: String(h) },
      });
      return res.status(200).json({ url: session.url });
    } catch (err) {
      console.error('Stripe hours checkout error:', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  const planKey = PLANS[plan] ? plan : 'monthly';
  const p = PLANS[planKey];

  try {
    const session = await stripe.checkout.sessions.create({
      // payment_method_types utelates med vilje — se kommentar i upload-hours over.
      // NB: PayPal for ABONNEMENT (mode:'subscription') i NOK er ofte ikke tilgjengelig;
      // da filtrerer Stripe det bort automatisk og viser kun kort. Ingen feil kastes.
      line_items: [{
        price_data: {
          currency: 'nok',
          product_data: {
            name: `SiriusFM Pro — ${p.label}`,
            description: 'Pro: DJ mixes over 3 hours, private/public visibility, Pro badge and unlimited storage',
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
      // subscription_data.metadata kopieres til selve Subscription-objektet (i motsetning
      // til metadata over, som kun ligger på Checkout Session). Uten dette har
      // customer.subscription.updated/deleted-webhooks ingen måte å vite hvem
      // abonnementet tilhører — se api/stripe-webhook.js.
      subscription_data: { metadata: { username, plan: planKey } },
      allow_promotion_codes: true,
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Stripe checkout error:', err.message);
    res.status(500).json({ error: err.message });
  }
};
