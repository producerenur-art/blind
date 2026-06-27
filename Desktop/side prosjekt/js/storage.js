// SC_Storage — uploads large media (60-min audio, video) straight to Supabase
// Storage so files are shared across ALL users (not stuck in one browser's
// IndexedDB). The browser never sees the service_role key: it asks
// /api/upload-url for a short-lived signed URL, then uploads directly.
//
// Graceful by design: if Supabase isn't configured yet (no keys in js/config.js),
// isConfigured() returns false and callers fall back to local IndexedDB (DB.*),
// so the app keeps working exactly as before until the keys are pasted in.
const SC_Storage = (() => {
  let _client = null;

  function _cfg() {
    return {
      url:    (window.CONFIG && CONFIG.SUPABASE_URL) || '',
      anon:   (window.CONFIG && CONFIG.SUPABASE_ANON_KEY) || '',
      bucket: (window.CONFIG && CONFIG.SUPABASE_BUCKET) || 'soundcore-media',
    };
  }

  // True only when URL + anon key are present AND the supabase-js CDN lib loaded.
  function isConfigured() {
    const c = _cfg();
    return !!(c.url && c.anon && window.supabase && typeof window.supabase.createClient === 'function');
  }

  function client() {
    if (_client) return _client;
    const c = _cfg();
    _client = window.supabase.createClient(c.url, c.anon, { auth: { persistSession: false } });
    return _client;
  }

  function _ext(file) {
    const m = (file.name || '').match(/\.([a-z0-9]+)$/i);
    if (m) return m[1].toLowerCase();
    const t = (file.type || '').split('/')[1] || 'bin';
    return t.replace(/[^a-z0-9]/gi, '') || 'bin';
  }

  function _uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  // Upload a File. prefix groups files in the bucket (e.g. 'audio', 'video').
  // Returns { url, path, type, size, bucket } where url is a public, shareable URL.
  // Throws Error('not-configured') if Supabase keys are missing — caller should
  // catch this and fall back to local storage.
  async function upload(file, { prefix = 'media', bucket, onProgress } = {}) {
    if (!isConfigured()) throw new Error('not-configured');
    if (onProgress) onProgress(0);

    const path = `${prefix}/${_uuid()}.${_ext(file)}`;

    // 1) Ask the server (service_role) for a signed upload URL. Optional `bucket`
    //    routes to the private 'songs' bucket for the marketplace; default is public.
    const resp = await fetch('/api/upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bucket ? { path, bucket } : { path }),
    });
    const info = await resp.json().catch(() => ({}));
    if (!resp.ok) throw new Error(info.error || `upload-url HTTP ${resp.status}`);

    // 2) Upload the bytes directly to Supabase (bypasses Vercel's 4.5MB limit).
    const { error } = await client()
      .storage.from(info.bucket)
      .uploadToSignedUrl(info.path, info.token, file, {
        contentType: file.type || 'application/octet-stream',
        upsert: true,
      });
    if (error) throw new Error(error.message || 'Opplasting til lagring feilet');

    if (onProgress) onProgress(1);
    return { url: info.publicUrl, path: info.path, type: file.type, size: file.size, bucket: info.bucket };
  }

  return { isConfigured, upload, client };
})();

if (typeof window !== 'undefined') window.SC_Storage = SC_Storage;
