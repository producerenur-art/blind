// Serverless Claude proxy — keeps ANTHROPIC_API_KEY server-side so it is never
// exposed in the browser. Used by all AI features (js/ai.js) + the assistant.
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

// Only allow models we actually use, so a tampered client can't pick an expensive one.
const ALLOWED_MODELS = new Set([
  'claude-haiku-4-5-20251001',
]);
const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS_CAP = 1024;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'AI er ikke konfigurert på serveren (mangler ANTHROPIC_API_KEY).' });
  }

  const body = req.body || {};
  const { system, messages } = body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Mangler meldinger' });
  }
  // Basic shape + size guard
  if (messages.length > 40) {
    return res.status(400).json({ error: 'For mange meldinger' });
  }

  const model = ALLOWED_MODELS.has(body.model) ? body.model : DEFAULT_MODEL;
  const maxTokens = Math.min(Math.max(parseInt(body.max_tokens, 10) || 400, 1), MAX_TOKENS_CAP);

  try {
    const upstream = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        ...(system ? { system } : {}),
        messages,
      }),
    });

    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      // Surface a clean message; never echo the key or full upstream internals.
      const msg = data?.error?.message || `Anthropic HTTP ${upstream.status}`;
      return res.status(upstream.status).json({ error: msg });
    }

    const text = (data.content && data.content[0] && data.content[0].text || '').trim();
    return res.status(200).json({ text });
  } catch (e) {
    console.error('chat proxy error:', e?.message || e);
    return res.status(500).json({ error: 'Kunne ikke kontakte AI-tjenesten' });
  }
};
