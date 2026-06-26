const { Resend } = require('resend');

function activationHtml(name, url) {
  return `<!DOCTYPE html>
<html lang="no">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f1a;font-family:'Inter',Arial,sans-serif">
  <div style="max-width:560px;margin:2rem auto;background:#1a1a2e;border-radius:16px;overflow:hidden;border:1px solid rgba(124,58,237,0.3)">
    <div style="background:linear-gradient(135deg,#7c3aed,#2563eb);padding:2rem;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:1.75rem;font-weight:800;letter-spacing:-0.5px">Sound<span style="color:#f59e0b">Core</span></h1>
    </div>
    <div style="padding:2rem;color:#e2e8f0">
      <h2 style="color:#fff;margin:0 0 1rem;font-size:1.25rem">Hei, ${escHtml(name)}! 👋</h2>
      <p style="color:#94a3b8;line-height:1.6;margin:0 0 1.5rem">Takk for at du registrerte deg på Sound Core! Klikk på knappen nedenfor for å aktivere kontoen din og komme i gang:</p>
      <div style="text-align:center;margin:2rem 0">
        <a href="${url}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#2563eb);color:#fff;text-decoration:none;padding:0.875rem 2rem;border-radius:8px;font-weight:700;font-size:1rem">Aktiver kontoen min</a>
      </div>
      <p style="color:#64748b;font-size:0.85rem;line-height:1.5;margin:0 0 0.75rem">Knappen virker ikke? Kopier denne lenken inn i nettleseren:<br><a href="${url}" style="color:#7c3aed;word-break:break-all">${url}</a></p>
      <p style="color:#64748b;font-size:0.85rem;margin:0">Lenken er gyldig i 24 timer. Hvis du ikke opprettet en konto, kan du ignorere denne e-posten.</p>
    </div>
    <div style="padding:1rem 2rem;border-top:1px solid rgba(255,255,255,0.08);text-align:center">
      <p style="color:#475569;font-size:0.75rem;margin:0">© ${new Date().getFullYear()} Sound Core</p>
    </div>
  </div>
</body>
</html>`;
}

function resetHtml(name, url) {
  return `<!DOCTYPE html>
<html lang="no">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f1a;font-family:'Inter',Arial,sans-serif">
  <div style="max-width:560px;margin:2rem auto;background:#1a1a2e;border-radius:16px;overflow:hidden;border:1px solid rgba(124,58,237,0.3)">
    <div style="background:linear-gradient(135deg,#7c3aed,#2563eb);padding:2rem;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:1.75rem;font-weight:800;letter-spacing:-0.5px">Sound<span style="color:#f59e0b">Core</span></h1>
    </div>
    <div style="padding:2rem;color:#e2e8f0">
      <h2 style="color:#fff;margin:0 0 1rem;font-size:1.25rem">Tilbakestill passord 🔑</h2>
      <p style="color:#94a3b8;line-height:1.6;margin:0 0 1.5rem">Hei ${escHtml(name)}! Vi mottok en forespørsel om å tilbakestille passordet ditt på Sound Core. Klikk på knappen nedenfor:</p>
      <div style="text-align:center;margin:2rem 0">
        <a href="${url}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#2563eb);color:#fff;text-decoration:none;padding:0.875rem 2rem;border-radius:8px;font-weight:700;font-size:1rem">Sett nytt passord</a>
      </div>
      <p style="color:#64748b;font-size:0.85rem;line-height:1.5;margin:0 0 0.75rem">Knappen virker ikke? Kopier denne lenken:<br><a href="${url}" style="color:#7c3aed;word-break:break-all">${url}</a></p>
      <p style="color:#64748b;font-size:0.85rem;margin:0">Lenken er gyldig i 1 time. Hvis du ikke ba om tilbakestilling, kan du ignorere denne e-posten.</p>
    </div>
    <div style="padding:1rem 2rem;border-top:1px solid rgba(255,255,255,0.08);text-align:center">
      <p style="color:#475569;font-size:0.75rem;margin:0">© ${new Date().getFullYear()} Sound Core</p>
    </div>
  </div>
</body>
</html>`;
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!process.env.RESEND_API_KEY) {
    return res.status(503).json({ error: 'E-post ikke konfigurert på serveren' });
  }

  const { type, toEmail, toName, token } = req.body || {};
  if (!type || !toEmail || !toName || !token) {
    return res.status(400).json({ error: 'Mangler påkrevde felt' });
  }

  const siteUrl = (process.env.SITE_URL || `https://${req.headers.host}`).replace(/\/$/, '');
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'Sound Core <onboarding@resend.dev>';
  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    if (type === 'activation') {
      const url = `${siteUrl}/#/activate/${token}`;
      await resend.emails.send({
        from: fromEmail,
        to: toEmail,
        subject: `Aktiver Sound Core-kontoen din, ${toName}!`,
        html: activationHtml(toName, url),
      });
    } else if (type === 'reset') {
      const url = `${siteUrl}/#/reset/${token}`;
      await resend.emails.send({
        from: fromEmail,
        to: toEmail,
        subject: 'Tilbakestill passordet ditt på Sound Core',
        html: resetHtml(toName, url),
      });
    } else {
      return res.status(400).json({ error: 'Ukjent e-posttype' });
    }

    return res.status(200).json({ success: true });
  } catch (e) {
    console.error('Resend feil:', e);
    return res.status(500).json({ error: e?.message || 'Kunne ikke sende e-post' });
  }
};
