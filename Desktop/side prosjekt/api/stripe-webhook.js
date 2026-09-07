// Stripe webhook — bekrefter betalinger og synker selger-status til Supabase.
// Trenger RÅ request-body for signaturverifisering, derfor bodyParser:false nederst.
const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

function supa() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
}
function rawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  if (!process.env.STRIPE_WEBHOOK_SECRET || !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY)
    return res.status(503).end();

  let event;
  try {
    const buf = await rawBody(req);
    const sig = req.headers['stripe-signature'];
    event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const db = supa();
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const s = event.data.object;
        // Ein sesjon kan vere «completed» medan betalinga framleis er unpaid (async/
        // bank-metodar). Marker berre som betalt når pengane faktisk er sikra.
        const isPaid = s.payment_status === 'paid' || s.payment_status === 'no_payment_required';
        if (!isPaid) break;
        const patch = { status: 'paid', stripe_payment_intent: s.payment_intent || null };
        if (s.metadata?.purchaseId) await db.from('purchases').update(patch).eq('id', s.metadata.purchaseId);
        else if (s.id)             await db.from('purchases').update(patch).eq('stripe_session_id', s.id);
        break;
      }
      case 'account.updated': {
        const a = event.data.object;
        await db.from('sellers').update({
          charges_enabled: !!a.charges_enabled,
          payouts_enabled: !!a.payouts_enabled,
          onboarding_complete: !!a.charges_enabled && !!a.details_submitted,
        }).eq('stripe_account_id', a.id);
        break;
      }
      case 'charge.refunded': {
        const c = event.data.object;
        if (c.payment_intent) await db.from('purchases').update({ status: 'refunded' }).eq('stripe_payment_intent', c.payment_intent);
        break;
      }
      case 'payment_intent.payment_failed': {
        const pi = event.data.object;
        await db.from('purchases').update({ status: 'failed' }).eq('stripe_payment_intent', pi.id);
        break;
      }

      // ── Abonnement-livssyklus (SiriusFM Pro) ────────────────────────────────
      // Registrerer/oppdaterer den server-side sannhetskilden i `subscriptions`-
      // tabellen. Selve Pro-opplåsinga skjer framleis client-side rett etter
      // checkout (js/payment.js) — dette gjer berre at eit abonnement som går ut,
      // blir kansellert eller feilar utanfor appen kan oppdagast og nedgraderast
      // via /api/subscription-status.js (kalla ved app-init, sjå js/app.js).
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const username = sub.metadata?.username;
        if (!username) break; // abonnement oppretta utanfor Checkout — ingen brukar å knyte til
        await db.from('subscriptions').upsert({
          stripe_subscription_id: sub.id,
          username,
          stripe_customer_id: sub.customer || null,
          plan: sub.metadata?.plan || null,
          status: sub.cancel_at_period_end ? 'active' : (sub.status === 'active' || sub.status === 'trialing' ? 'active' : sub.status),
          current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'stripe_subscription_id' });
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        await db.from('subscriptions').update({
          status: 'canceled',
          updated_at: new Date().toISOString(),
        }).eq('stripe_subscription_id', sub.id);
        break;
      }
      case 'invoice.payment_failed': {
        const inv = event.data.object;
        if (inv.subscription) {
          await db.from('subscriptions').update({
            status: 'past_due',
            updated_at: new Date().toISOString(),
          }).eq('stripe_subscription_id', inv.subscription);
        }
        break;
      }
    }
    res.status(200).json({ received: true });
  } catch (err) {
    console.error('Webhook handler error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// Vercel: ikke parse body — Stripe-signaturen verifiseres mot rå bytes.
module.exports.config = { api: { bodyParser: false } };
