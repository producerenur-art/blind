// Serverless: mint a signed upload URL so the browser can upload large media
// (60-min audio, video) DIRECTLY to Supabase Storage — bypassing Vercel's
// ~4.5MB serverless body limit. The service_role key stays server-side only.
//
// Client flow (js/storage.js):
//   1. POST /api/upload-url { path }       -> { token, path, publicUrl }
//   2. supabase.uploadToSignedUrl(path, token, file)   (browser -> Supabase)
//   3. store publicUrl + metadata in Gun
const { createClient } = require('@supabase/supabase-js');

// Two-bucket split (coordinated with the marketplace model):
//   soundcore-media = PUBLIC shared media/previews (returns a public URL)
//   songs           = PRIVATE paid downloads (no public URL — gated signed URLs)
const PUBLIC_BUCKET = process.env.SUPABASE_BUCKET || 'soundcore-media';
const ALLOWED_BUCKETS = new Set([PUBLIC_BUCKET, 'songs']);

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return res.status(503).json({
      error: 'Lagring er ikke konfigurert på serveren (mangler SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).'
    });
  }

  const body = req.body || {};
  const path = typeof body.path === 'string' ? body.path.trim() : '';
  const bucket = (typeof body.bucket === 'string' && body.bucket.trim()) ? body.bucket.trim() : PUBLIC_BUCKET;

  if (!ALLOWED_BUCKETS.has(bucket)) {
    return res.status(400).json({ error: 'Ukjent lagringsbøtte' });
  }
  // Reject path traversal / leading slashes / empties — keep uploads inside the bucket.
  if (!path || path.includes('..') || path.startsWith('/') || path.length > 256) {
    return res.status(400).json({ error: 'Ugyldig filsti' });
  }

  try {
    const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
    const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(path);
    if (error) {
      return res.status(500).json({ error: error.message || 'Kunne ikke lage opplastings-URL' });
    }
    // Only public buckets get a shareable public URL; private (paid) stay gated.
    const publicUrl = (bucket === PUBLIC_BUCKET)
      ? supabase.storage.from(bucket).getPublicUrl(data.path).data.publicUrl
      : null;
    return res.status(200).json({
      token: data.token,
      path: data.path,
      signedUrl: data.signedUrl,
      publicUrl,
      bucket,
    });
  } catch (e) {
    console.error('upload-url error:', e?.message || e);
    return res.status(500).json({ error: 'Kunne ikke kontakte lagringstjenesten' });
  }
};
