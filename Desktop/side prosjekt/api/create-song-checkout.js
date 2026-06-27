// Kjøp av en sang. Gratis → registrer kjøp direkte. Betalt → Stripe Checkout
// med destination charge (transfer_data.destination = selgers Connect-konto) +
// plattformavgift (application_fee_amount).
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

  const { productId, buyerUsername } = req.body || {};
  if (!productId || !buyerUsername) return res.status(400).json({ error: 'Mangler productId eller buyerUsername.' });

  const siteUrl = process.env.SITE_URL || `https://${req.headers.host}`;
  const db = supa();

  try {
    const { data: product } = await db.from('products').select('*').eq('id', productId).maybeSingle();
    if (!product) return res.status(404).json({ error: 'Fant ikke sangen.' });

    // Gratis nedlasting — registrer kjøp og gi tilgang direkte.
    if (product.is_free || product.price_ore <= 0) {
      await db.from('purchases').insert({
        product_id: productId, buyer_username: buyerUsername, amount_ore: 0, status: 'paid',
      });
      return res.status(200).json({ free: true });
    }

    const { data: seller } = await db.from('sellers').select('*').eq('username', product.seller_username).maybeSingle();
    if (!seller || !seller.stripe_account_id || !seller.charges_enabled)
      return res.status(400).json({ error: 'Selger kan ikke ta imot betaling ennå.' });

    const feePct = parseFloat(process.env.PLATFORM_FEE_PERCENT || '10');
    const fee = Math.round(product.price_ore * feePct / 100);

    const { data: purchase, error: purErr } = await db.from('purchases').insert({
      product_id: productId, buyer_username: buyerUsername,
      amount_ore: product.price_ore, platform_fee_ore: fee, status: 'pending',
    }).select().maybeSingle();
    if (purErr) throw purErr;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'nok',
          product_data: { name: product.title + (product.artist ? ' — ' + product.artist : '') },
          unit_amount: product.price_ore,
        },
        quantity: 1,
      }],
      payment_intent_data: {
        application_fee_amount: fee,
        transfer_data: { destination: seller.stripe_account_id },
      },
      success_url: `${siteUrl}/?song_purchase={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${siteUrl}/#/u/${product.seller_username}`,
      metadata: { productId, buyerUsername, purchaseId: purchase?.id || '' },
    });

    await db.from('purchases').update({ stripe_session_id: session.id }).eq('id', purchase.id);
    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('create-song-checkout error:', err.message);
    res.status(500).json({ error: err.message });
  }
};
