// Konsolidert markedsplass-API — ALLE actions i én serverless-funksjon for å
// holde oss under Vercel sin grense (Hobby = 12 funksjoner). Webhooken er egen
// fil (api/stripe-webhook.js) fordi den trenger rå request-body.
// Action velges via ?action=… (query), POST-data i body.
const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');
const stripe = process.env.STRIPE_SECRET_KEY ? Stripe(process.env.STRIPE_SECRET_KEY) : null;

const BUCKET = 'songs';

function supa() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
}
function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}
function siteUrl(req) { return process.env.SITE_URL || `https://${req.headers.host}`; }

module.exports = async (req, res) => {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const action = (req.query && req.query.action) || (req.body && req.body.action);
  if (!action) return res.status(400).json({ error: 'Mangler action' });
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY)
    return res.status(503).json({ error: 'Supabase er ikke konfigurert på serveren.' });

  try {
    const db = supa();
    switch (action) {
      case 'connect-onboard': return await connectOnboard(req, res, db);
      case 'connect-status':  return await connectStatus(req, res, db);
      case 'song-upload-url': return await songUploadUrl(req, res, db);
      case 'list-product':    return await listProduct(req, res, db);
      case 'create-checkout': return await createCheckout(req, res, db);
      case 'download':        return await download(req, res, db);
      case 'store-products':  return await storeProducts(req, res, db);
      case 'my-purchases':    return await myPurchases(req, res, db);
      default: return res.status(400).json({ error: 'Ukjent action: ' + action });
    }
  } catch (err) {
    console.error('marketplace[' + action + ']:', err.message);
    return res.status(500).json({ error: err.message });
  }
};

// ── Stripe Connect-onboarding ─────────────────────────────────────────────
async function connectOnboard(req, res, db) {
  if (!stripe) return res.status(503).json({ error: 'Stripe er ikke konfigurert.' });
  const { username } = req.body || {};
  if (!username) return res.status(400).json({ error: 'Mangler brukernavn' });

  const { data: seller } = await db.from('sellers').select('*').eq('username', username).maybeSingle();
  let accountId = seller?.stripe_account_id;
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: 'express', country: 'NO',
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
    refresh_url: `${siteUrl(req)}/#/edit`,
    return_url:  `${siteUrl(req)}/#/edit`,
    type: 'account_onboarding',
  });
  return res.status(200).json({ url: link.url });
}

async function connectStatus(req, res, db) {
  if (!stripe) return res.status(503).json({ error: 'Stripe er ikke konfigurert.' });
  const username = req.query.username;
  if (!username) return res.status(400).json({ error: 'Mangler brukernavn' });
  const { data: seller } = await db.from('sellers').select('*').eq('username', username).maybeSingle();
  if (!seller) return res.status(200).json({ seller: false, onboarding_complete: false, charges_enabled: false });

  const acct = await stripe.accounts.retrieve(seller.stripe_account_id);
  const charges_enabled = !!acct.charges_enabled;
  const payouts_enabled = !!acct.payouts_enabled;
  const onboarding_complete = charges_enabled && !!acct.details_submitted;
  await db.from('sellers').update({ charges_enabled, payouts_enabled, onboarding_complete }).eq('username', username);
  return res.status(200).json({ seller: true, onboarding_complete, charges_enabled, payouts_enabled });
}

// ── Opplasting + produkter ────────────────────────────────────────────────
async function songUploadUrl(req, res, db) {
  let path = typeof req.body?.path === 'string' ? req.body.path.trim() : '';
  path = path.replace(/^\/+/, '').replace(/\.{2,}/g, '').replace(/[^\w./-]/g, '_');
  if (!path) return res.status(400).json({ error: 'Mangler gyldig sti' });
  const { data, error } = await db.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error) throw error;
  return res.status(200).json({ token: data.token, path: data.path, bucket: BUCKET });
}

async function listProduct(req, res, db) {
  const b = req.body || {};
  const { username, productId, title, artist, credits, buyLinks, price_ore, is_free, audio_path, cover_path, duration_sec } = b;
  if (!username || !title || !audio_path) return res.status(400).json({ error: 'Mangler påkrevde felt (username, title, audio_path).' });
  const free = !!is_free;
  if (!free) {
    const { data: seller } = await db.from('sellers').select('onboarding_complete, stripe_account_id').eq('username', username).maybeSingle();
    if (!seller || !seller.stripe_account_id || !seller.onboarding_complete)
      return res.status(400).json({ error: 'Fullfør selger-onboarding (Bli selger) før du selger betalte sanger.' });
  }
  const c = credits || {};
  const row = {
    seller_username: username, title,
    artist: artist || null, label: c.label || null, producer: c.producer || null,
    mixing: c.mixing || null, mastering: c.mastering || null,
    buy_links: buyLinks || {},
    price_ore: free ? 0 : Math.max(0, parseInt(price_ore, 10) || 0),
    is_free: free, duration_sec: duration_sec ? Math.round(duration_sec) : null,
    audio_path, cover_path: cover_path || null, is_published: true,
  };
  const result = productId
    ? await db.from('products').update(row).eq('id', productId).eq('seller_username', username).select().maybeSingle()
    : await db.from('products').insert(row).select().maybeSingle();
  if (result.error) throw result.error;
  return res.status(200).json({ product: result.data });
}

// ── Kjøp / nedlasting ─────────────────────────────────────────────────────
async function createCheckout(req, res, db) {
  const { productId, buyerUsername } = req.body || {};
  if (!productId || !buyerUsername) return res.status(400).json({ error: 'Mangler productId eller buyerUsername.' });
  const { data: product } = await db.from('products').select('*').eq('id', productId).maybeSingle();
  if (!product) return res.status(404).json({ error: 'Fant ikke sangen.' });

  if (product.is_free || product.price_ore <= 0) {
    await db.from('purchases').insert({ product_id: productId, buyer_username: buyerUsername, amount_ore: 0, status: 'paid' });
    return res.status(200).json({ free: true });
  }
  if (!stripe) return res.status(503).json({ error: 'Stripe er ikke konfigurert.' });

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
    mode: 'payment', payment_method_types: ['card'],
    line_items: [{ price_data: { currency: 'nok', product_data: { name: product.title + (product.artist ? ' — ' + product.artist : '') }, unit_amount: product.price_ore }, quantity: 1 }],
    payment_intent_data: { application_fee_amount: fee, transfer_data: { destination: seller.stripe_account_id } },
    success_url: `${siteUrl(req)}/?song_purchase={CHECKOUT_SESSION_ID}`,
    cancel_url:  `${siteUrl(req)}/#/u/${product.seller_username}`,
    metadata: { productId, buyerUsername, purchaseId: purchase?.id || '' },
  });
  await db.from('purchases').update({ stripe_session_id: session.id }).eq('id', purchase.id);
  return res.status(200).json({ url: session.url });
}

async function download(req, res, db) {
  const productId = req.query.productId, username = req.query.username;
  if (!productId || !username) return res.status(400).json({ error: 'Mangler productId eller username.' });
  const { data: product } = await db.from('products').select('*').eq('id', productId).maybeSingle();
  if (!product) return res.status(404).json({ error: 'Fant ikke sangen.' });

  let allowed = product.is_free;
  if (!allowed) {
    const { data: pur } = await db.from('purchases').select('id')
      .eq('product_id', productId).eq('buyer_username', username).eq('status', 'paid').limit(1);
    allowed = !!(pur && pur.length);
  }
  if (!allowed) return res.status(403).json({ error: 'Ingen gyldig kjøp funnet for denne sangen.' });

  const { data, error } = await db.storage.from(BUCKET).createSignedUrl(product.audio_path, 60 * 60);
  if (error) throw error;
  return res.status(200).json({ url: data.signedUrl, title: product.title });
}

// ── Lister ────────────────────────────────────────────────────────────────
async function storeProducts(req, res, db) {
  const username = req.query.username;
  if (!username) return res.status(400).json({ error: 'Mangler brukernavn' });
  const { data, error } = await db.from('products')
    .select('id,title,artist,label,producer,mixing,mastering,buy_links,price_ore,is_free,duration_sec,created_at')
    .eq('seller_username', username).eq('is_published', true)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return res.status(200).json({ products: data || [] });
}

async function myPurchases(req, res, db) {
  const username = req.query.username;
  if (!username) return res.status(400).json({ error: 'Mangler brukernavn' });
  const { data, error } = await db.from('purchases')
    .select('id,product_id,amount_ore,status,created_at,products(title,artist,seller_username)')
    .eq('buyer_username', username).eq('status', 'paid')
    .order('created_at', { ascending: false });
  if (error) throw error;
  const purchases = (data || []).map(p => ({
    productId: p.product_id, title: p.products?.title || 'Ukjent',
    artist: p.products?.artist || '', seller: p.products?.seller_username || '',
    amount_nok: (p.amount_ore || 0) / 100, created_at: p.created_at,
  }));
  return res.status(200).json({ purchases });
}
