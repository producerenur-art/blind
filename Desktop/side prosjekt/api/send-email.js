const { Resend } = require('resend');
const { PLANS, fmtKr, PRO_BENEFITS } = require('./_plans');

function activationHtml(name, url, siteUrl) {
  const base       = (siteUrl || '').replace(/\/$/, '');
  const shopUrl    = `${base}/#/shop`;
  const displayUrl = base.replace(/^https?:\/\//, '') || 'Sound Core';

  const featRow = (emoji, title, desc) =>
    `<tr>
      <td style="padding:0.45rem 0;vertical-align:top;width:34px;font-size:1.2rem">${emoji}</td>
      <td style="padding:0.45rem 0;vertical-align:top">
        <span style="color:#e2e8f0;font-weight:600">${title}</span><span style="color:#94a3b8"> — ${desc}</span>
      </td>
    </tr>`;

  const planRows = Object.values(PLANS).map(p => {
    const best = p.key === 'year';
    return `<tr style="${best ? 'background:rgba(124,58,237,0.18)' : ''}">
      <td style="padding:0.6rem 0.75rem;color:${best ? '#fff' : '#e2e8f0'};font-weight:${best ? '800' : '600'};border-top:1px solid rgba(255,255,255,0.06)">${p.label}</td>
      <td style="padding:0.6rem 0.75rem;color:${best ? '#fff' : '#e2e8f0'};font-weight:${best ? '800' : '600'};text-align:right;border-top:1px solid rgba(255,255,255,0.06)">${fmtKr(p.amount)}</td>
      <td style="padding:0.6rem 0.75rem;color:#94a3b8;text-align:right;border-top:1px solid rgba(255,255,255,0.06);white-space:nowrap">${p.perMonthKr}/mnd</td>
      <td style="padding:0.6rem 0.75rem;text-align:right;border-top:1px solid rgba(255,255,255,0.06);white-space:nowrap">${p.save ? `<span style="color:#f59e0b;font-weight:700;font-size:0.8rem">Spar ${p.save}</span>` : ''}</td>
    </tr>`;
  }).join('');

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

      <div style="border-top:1px solid rgba(255,255,255,0.08);margin:2rem 0 1.5rem"></div>

      <h3 style="color:#fff;margin:0 0 0.75rem;font-size:1.05rem">🎧 Dette får du på Sound Core</h3>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;line-height:1.45;font-size:0.92rem">
        ${featRow('🎚️', 'DJ-mix', 'last opp din egen mix (gratis opptil 3 timer)')}
        ${featRow('📻', 'Radio &amp; Discover', 'sjangerbasert radio med ukentlig rotasjon')}
        ${featRow('💬', 'Innboks', 'private meldinger og venneforespørsler')}
        ${featRow('🎵', 'Marketplace', 'kjøp og selg låter')}
      </table>

      <div style="border-top:1px solid rgba(255,255,255,0.08);margin:1.75rem 0 1.5rem"></div>

      <h3 style="color:#fff;margin:0 0 0.5rem;font-size:1.05rem">⭐ Sound Core Pro — lås opp alt</h3>
      <p style="color:#94a3b8;line-height:1.6;margin:0 0 1rem;font-size:0.92rem">${PRO_BENEFITS.join(' · ')}.</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:0.9rem;border:1px solid rgba(255,255,255,0.08);border-radius:10px;overflow:hidden">
        ${planRows}
      </table>
      <p style="color:#64748b;font-size:0.8rem;line-height:1.5;margin:0.85rem 0 0">Alle abonnement er påløpende og kan avbrytes når som helst. Sikker betaling via Stripe.</p>
      <div style="text-align:center;margin:1.5rem 0 0">
        <a href="${shopUrl}" style="display:inline-block;background:linear-gradient(135deg,#f59e0b,#f472b6);color:#fff;text-decoration:none;padding:0.75rem 1.75rem;border-radius:8px;font-weight:700;font-size:0.95rem">Se planer i Shop</a>
      </div>

      <div style="border-top:1px solid rgba(255,255,255,0.08);margin:1.75rem 0 1.5rem"></div>

      <h3 style="color:#fff;margin:0 0 0.5rem;font-size:1.05rem">❓ Trenger du hjelp?</h3>
      <p style="color:#94a3b8;line-height:1.6;margin:0">Kontakt oss på <a href="mailto:producerenur@gmail.com" style="color:#c4b5fd;font-weight:600">producerenur@gmail.com</a> — vi svarer så fort vi kan.</p>
    </div>
    <div style="padding:1.5rem 2rem;border-top:1px solid rgba(255,255,255,0.08);text-align:center">
      <p style="color:#94a3b8;font-size:0.9rem;margin:0 0 0.35rem">Hilsen,<br><strong style="color:#fff">Sound Core</strong></p>
      <p style="margin:0 0 0.75rem"><a href="${base}" style="color:#7c3aed;font-size:0.85rem;text-decoration:none">${displayUrl}</a></p>
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

function friendRequestHtml(toName, fromName, fromUsername, inboxUrl) {
  return `<!DOCTYPE html>
<html lang="no">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f1a;font-family:'Inter',Arial,sans-serif">
  <div style="max-width:560px;margin:2rem auto;background:#1a1a2e;border-radius:16px;overflow:hidden;border:1px solid rgba(124,58,237,0.3)">
    <div style="background:linear-gradient(135deg,#7c3aed,#2563eb);padding:2rem;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:1.75rem;font-weight:800;letter-spacing:-0.5px">Sound<span style="color:#f59e0b">Core</span></h1>
    </div>
    <div style="padding:2rem;color:#e2e8f0">
      <div style="text-align:center;margin-bottom:1.5rem">
        <div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#7c3aed,#2563eb);display:inline-flex;align-items:center;justify-content:center;font-size:2rem">👥</div>
      </div>
      <h2 style="color:#fff;margin:0 0 1rem;font-size:1.25rem;text-align:center">Ny venneforespørsel!</h2>
      <p style="color:#94a3b8;line-height:1.6;margin:0 0 0.5rem">Hei, ${escHtml(toName)}!</p>
      <p style="color:#94a3b8;line-height:1.6;margin:0 0 1.5rem"><strong style="color:#c4b5fd">${escHtml(fromName)}</strong> (@${escHtml(fromUsername)}) ønsker å bli venn med deg på Sound Core.</p>
      <div style="text-align:center;margin:2rem 0">
        <a href="${inboxUrl}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#2563eb);color:#fff;text-decoration:none;padding:0.875rem 2rem;border-radius:8px;font-weight:700;font-size:1rem">Gå til innboksen og aksepter</a>
      </div>
      <p style="color:#64748b;font-size:0.85rem;margin:0">Vil du ikke være venn? Du kan avslå forespørselen i innboksen din.</p>
    </div>
    <div style="padding:1rem 2rem;border-top:1px solid rgba(255,255,255,0.08);text-align:center">
      <p style="color:#475569;font-size:0.75rem;margin:0">© ${new Date().getFullYear()} Sound Core</p>
    </div>
  </div>
</body>
</html>`;
}

function purchaseHtml(name, siteUrl) {
  return `<!DOCTYPE html>
<html lang="no">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f1a;font-family:'Inter',Arial,sans-serif">
  <div style="max-width:560px;margin:2rem auto;background:#1a1a2e;border-radius:16px;overflow:hidden;border:1px solid rgba(124,58,237,0.3)">
    <div style="background:linear-gradient(135deg,#7c3aed,#2563eb);padding:2rem;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:1.75rem;font-weight:800;letter-spacing:-0.5px">Sound<span style="color:#f59e0b">Core</span></h1>
    </div>
    <div style="padding:2rem;color:#e2e8f0">
      <div style="text-align:center;margin-bottom:1.5rem">
        <div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#f59e0b,#f472b6);display:inline-flex;align-items:center;justify-content:center;font-size:2rem">⭐</div>
      </div>
      <h2 style="color:#fff;margin:0 0 1rem;font-size:1.25rem;text-align:center">Velkommen til Sound Core Pro!</h2>
      <p style="color:#94a3b8;line-height:1.6;margin:0 0 1.5rem">Hei ${escHtml(name)}! Takk for kjøpet. Pro-abonnementet ditt er nå aktivt, og du har låst opp blant annet private mixes og alle Pro-funksjoner.</p>
      <div style="text-align:center;margin:2rem 0">
        <a href="${siteUrl}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#2563eb);color:#fff;text-decoration:none;padding:0.875rem 2rem;border-radius:8px;font-weight:700;font-size:1rem">Gå til Sound Core</a>
      </div>
      <p style="color:#64748b;font-size:0.85rem;line-height:1.5;margin:0">Dette er en bekreftelse på kjøpet ditt. Du kan administrere abonnementet i innstillingene. Spørsmål? Bare svar på denne e-posten.</p>
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

  const { type, toEmail, toName, token, fromName, fromUsername, inboxUrl } = req.body || {};
  if (!type || !toEmail || !toName) {
    return res.status(400).json({ error: 'Mangler påkrevde felt' });
  }

  const siteUrl = (process.env.SITE_URL || `https://${req.headers.host}`).replace(/\/$/, '');
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'Sound Core <onboarding@resend.dev>';
  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    if (type === 'activation') {
      if (!token) return res.status(400).json({ error: 'Mangler token' });
      const url = `${siteUrl}/#/activate/${token}`;
      await resend.emails.send({
        from: fromEmail,
        to: toEmail,
        subject: `Aktiver Sound Core-kontoen din, ${toName}!`,
        html: activationHtml(toName, url, siteUrl),
      });
    } else if (type === 'reset') {
      if (!token) return res.status(400).json({ error: 'Mangler token' });
      const url = `${siteUrl}/#/reset/${token}`;
      await resend.emails.send({
        from: fromEmail,
        to: toEmail,
        subject: 'Tilbakestill passordet ditt på Sound Core',
        html: resetHtml(toName, url),
      });
    } else if (type === 'friend_request') {
      if (!fromName || !fromUsername) return res.status(400).json({ error: 'Mangler avsenderinfo' });
      const inbox = inboxUrl || `${siteUrl}/#/inbox`;
      await resend.emails.send({
        from: fromEmail,
        to: toEmail,
        subject: `${fromName} ønsker å bli venn med deg på Sound Core`,
        html: friendRequestHtml(toName, fromName, fromUsername, inbox),
      });
    } else if (type === 'purchase') {
      await resend.emails.send({
        from: fromEmail,
        to: toEmail,
        subject: 'Kvittering — Sound Core Pro er aktivert ⭐',
        html: purchaseHtml(toName, `${siteUrl}/`),
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
