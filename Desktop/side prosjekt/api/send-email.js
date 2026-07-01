const { Resend } = require('resend');
const { getPlan, fmtKr, fmtDate, nextRenewal, PRO_BENEFITS } = require('./_plans');

// Kanonisk nettadresse for ALLE e-postlenker (aktivering, tilbakestilling, kjøp).
// Brukes som standard slik at lenkene alltid peker til det offisielle domenet —
// aldri til ein tilfeldig Vercel-preview-host (req.headers.host). Kan overstyrast
// med SITE_URL i miljøvariablane om domenet skulle endre seg.
const CANONICAL_URL = 'https://www.soundcoredevelopment.com';

function activationHtml(name, url, siteUrl) {
  const base       = (siteUrl || '').replace(/\/$/, '');
  const shopUrl    = `${base}/#/shop`;
  const displayUrl = base.replace(/^https?:\/\//, '') || 'Sound Core';

  // Pristabell speilar SHOP_PLANS i js/app.js + PLANS i api/create-checkout.js.
  // Bevisst hardkoda her (sjølvstendig) så e-posten ikkje er avhengig av ein delt modul.
  const PLAN_ROWS = [
    { label: '1 måned',    total: '149 kr',   per: '149 kr/mnd', save: null,        best: false },
    { label: '3 måneder',  total: '399 kr',   per: '133 kr/mnd', save: 'Spar 11 %', best: false },
    { label: '6 måneder',  total: '749 kr',   per: '125 kr/mnd', save: 'Spar 16 %', best: false },
    { label: '12 måneder', total: '1 290 kr', per: '108 kr/mnd', save: 'Spar 28 %', best: true  },
  ];
  const PRO_BENEFITS = [
    'DJ-mixes over 3 timer (opptil 20 t)',
    'Privat / offentlig synlighet',
    'Pro-badge på profilen',
    'Ubegrenset lagring + prioritert støtte',
  ];

  const featRow = (emoji, title, desc) =>
    `<tr>
      <td style="padding:0.45rem 0;vertical-align:top;width:34px;font-size:1.2rem">${emoji}</td>
      <td style="padding:0.45rem 0;vertical-align:top">
        <span style="color:#e2e8f0;font-weight:600">${title}</span><span style="color:#94a3b8"> — ${desc}</span>
      </td>
    </tr>`;

  const planRows = PLAN_ROWS.map(p =>
    `<tr style="${p.best ? 'background:rgba(124,58,237,0.18)' : ''}">
      <td style="padding:0.6rem 0.75rem;color:${p.best ? '#fff' : '#e2e8f0'};font-weight:${p.best ? '800' : '600'};border-top:1px solid rgba(255,255,255,0.06)">${p.label}</td>
      <td style="padding:0.6rem 0.75rem;color:${p.best ? '#fff' : '#e2e8f0'};font-weight:${p.best ? '800' : '600'};text-align:right;border-top:1px solid rgba(255,255,255,0.06)">${p.total}</td>
      <td style="padding:0.6rem 0.75rem;color:#94a3b8;text-align:right;border-top:1px solid rgba(255,255,255,0.06);white-space:nowrap">${p.per}</td>
      <td style="padding:0.6rem 0.75rem;text-align:right;border-top:1px solid rgba(255,255,255,0.06);white-space:nowrap">${p.save ? `<span style="color:#f59e0b;font-weight:700;font-size:0.8rem">${p.save}</span>` : ''}</td>
    </tr>`).join('');

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
      <p style="color:#94a3b8;line-height:1.6;margin:0 0 1rem">Takk for at du registrerte deg på Sound Core! Klikk på knappen nedenfor for å aktivere kontoen din og komme i gang:</p>
      <p style="color:#7c8aa5;line-height:1.6;margin:0 0 1.5rem;font-size:0.9rem"><em>In English:</em> Welcome to Sound Core — a music &amp; audio social platform where you can upload DJ mixes, stream genre-based radio, message friends, and buy &amp; sell tracks. Just tap the button above to activate your account and start exploring.</p>
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

      <h3 style="color:#fff;margin:0 0 0.5rem;font-size:1.05rem">❓ Trenger du hjelp? / Need help?</h3>
      <p style="color:#94a3b8;line-height:1.6;margin:0">Kontakt oss på / Contact us at <a href="mailto:producerenur@gmail.com" style="color:#c4b5fd;font-weight:600">producerenur@gmail.com</a> — vi svarer så fort vi kan / we'll reply as soon as we can.</p>
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
      <p style="color:#94a3b8;line-height:1.6;margin:0 0 1rem">Hei ${escHtml(name)}! Vi mottok en forespørsel om å tilbakestille passordet ditt på Sound Core. Klikk på knappen nedenfor:</p>
      <p style="color:#7c8aa5;line-height:1.6;margin:0 0 1.5rem;font-size:0.9rem"><em>In English:</em> We received a request to reset your Sound Core password. Tap the button below to choose a new one. The link is valid for 1 hour — if you didn't request this, you can safely ignore this email.</p>
      <div style="text-align:center;margin:2rem 0">
        <a href="${url}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#2563eb);color:#fff;text-decoration:none;padding:0.875rem 2rem;border-radius:8px;font-weight:700;font-size:1rem">Sett nytt passord</a>
      </div>
      <p style="color:#64748b;font-size:0.85rem;line-height:1.5;margin:0 0 0.75rem">Knappen virker ikke? Kopier denne lenken:<br><a href="${url}" style="color:#7c3aed;word-break:break-all">${url}</a></p>
      <p style="color:#64748b;font-size:0.85rem;margin:0">Lenken er gyldig i 1 time. Hvis du ikke ba om tilbakestilling, kan du ignorere denne e-posten.</p>

      <div style="border-top:1px solid rgba(255,255,255,0.08);margin:1.75rem 0 1.25rem"></div>

      <h3 style="color:#fff;margin:0 0 0.5rem;font-size:1.05rem">❓ Trenger du hjelp? / Need help?</h3>
      <p style="color:#94a3b8;line-height:1.6;margin:0">Kontakt oss på / Contact us at <a href="mailto:producerenur@gmail.com" style="color:#c4b5fd;font-weight:600">producerenur@gmail.com</a> — vi svarer så fort vi kan / we'll reply as soon as we can.</p>
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

function purchaseHtml(name, siteUrl, planKey, orderRef) {
  const p         = getPlan(planKey);
  const now       = Date.now();
  const dateStr   = fmtDate(now);
  const nextStr   = fmtDate(nextRenewal(planKey, now));
  const renewWord = p.interval === 'year' ? 'hvert år' : (p.months > 1 ? `hver ${p.months}. måned` : 'hver måned');

  const row = (label, value, strong) => `
        <tr>
          <td style="padding:0.55rem 0;color:#94a3b8;font-size:0.9rem">${label}</td>
          <td style="padding:0.55rem 0;text-align:right;color:${strong ? '#fff' : '#e2e8f0'};font-size:0.9rem;font-weight:${strong ? '800' : '600'}">${value}</td>
        </tr>`;

  const benefits = PRO_BENEFITS.map(b => `
        <tr><td style="padding:0.3rem 0;color:#cbd5e1;font-size:0.9rem">
          <span style="color:#4ade80;font-weight:800">✓</span>&nbsp; ${escHtml(b)}
        </td></tr>`).join('');

  return `<!DOCTYPE html>
<html lang="no">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f1a;font-family:'Inter',Arial,sans-serif">
  <div style="max-width:560px;margin:2rem auto;background:#1a1a2e;border-radius:16px;overflow:hidden;border:1px solid rgba(124,58,237,0.3)">
    <div style="background:linear-gradient(135deg,#7c3aed,#2563eb);padding:2rem;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:1.75rem;font-weight:800;letter-spacing:-0.5px">Sound<span style="color:#f59e0b">Core</span></h1>
      <p style="color:rgba(255,255,255,0.85);margin:0.4rem 0 0;font-size:0.85rem;letter-spacing:0.04em">KVITTERING · PRO-ABONNEMENT</p>
    </div>
    <div style="padding:2rem;color:#e2e8f0">
      <div style="text-align:center;margin-bottom:1.25rem">
        <div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#f59e0b,#f472b6);display:inline-flex;align-items:center;justify-content:center;font-size:2rem">⭐</div>
      </div>
      <h2 style="color:#fff;margin:0 0 0.5rem;font-size:1.25rem;text-align:center">Takk for kjøpet, ${escHtml(name)}!</h2>
      <p style="color:#94a3b8;line-height:1.6;margin:0 0 1.5rem;text-align:center">Pro-abonnementet ditt er nå aktivt. Her er kvitteringen din.</p>

      <div style="background:#12121f;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:0.5rem 1.25rem;margin-bottom:1.5rem">
        <table style="width:100%;border-collapse:collapse">
          ${row('Produkt', 'Sound Core Pro')}
          ${row('Periode', p.label)}
          ${row('Kjøpsdato', dateStr)}
          ${row('Fornyes', `${renewWord} (neste: ${nextStr})`)}
          ${orderRef ? row('Ordre-ref', escHtml(orderRef)) : ''}
          <tr><td colspan="2" style="border-top:1px solid rgba(255,255,255,0.1);padding-top:0.25rem"></td></tr>
          ${row('Betalt', fmtKr(p.amount), true)}
        </table>
      </div>

      <p style="color:#fff;font-weight:700;font-size:0.95rem;margin:0 0 0.5rem">Dette har du låst opp:</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:1.5rem">${benefits}</table>

      <div style="text-align:center;margin:0 0 1.5rem">
        <a href="${siteUrl}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#2563eb);color:#fff;text-decoration:none;padding:0.875rem 2rem;border-radius:8px;font-weight:700;font-size:1rem">Gå til Sound Core</a>
      </div>
      <p style="color:#64748b;font-size:0.82rem;line-height:1.5;margin:0">Abonnementet fornyes automatisk ${renewWord}. Du kan administrere eller avslutte det i innstillingene når som helst. Spørsmål? Bare svar på denne e-posten.</p>
    </div>
    <div style="padding:1rem 2rem;border-top:1px solid rgba(255,255,255,0.08);text-align:center">
      <p style="color:#475569;font-size:0.75rem;margin:0">© ${new Date().getFullYear()} Sound Core</p>
    </div>
  </div>
</body>
</html>`;
}

// Markedsførings-/«bli medlem»-e-post (reklame). Inneheld: kva Sound Core er,
// kvifor melde seg inn, nye fester i timeplanen, artistar du møter, AI-tilbod på
// live stream — og ein tydeleg «Avmeld reklame»-knapp (GDPR/marknadsføringslov).
// Sjølvstendig (hardkoda innhald) så e-posten ikkje er avhengig av frontend-modular.
function promoHtml(name, siteUrl, unsubscribeUrl) {
  const base       = (siteUrl || '').replace(/\/$/, '');
  const displayUrl = base.replace(/^https?:\/\//, '') || 'Sound Core';
  const joinUrl    = `${base}/#/signup`;
  const liveUrl    = `${base}/#/sendinger`;
  const unsubUrl   = unsubscribeUrl || `${base}/#/unsubscribe`;

  // Det du får — kjernen i plattforma.
  const FEATURES = [
    ['🎚️', 'Last opp DJ-mixene dine', 'gratis opptil 3 timer — Pro låser opp opptil 20 t'],
    ['📻', 'Sjangerradio & Discover', 'psytrance, ambient, techno & meir, med ukentlig rotasjon'],
    ['🛰️', 'Live DJ-kringkasting', 'send Traktor-lyden din direkte til lytterne i sanntid'],
    ['💬', 'Venner & innboks', 'chat, venneforespørsler og varsler i sanntid'],
    ['🛒', 'Marketplace', 'kjøp og selg låter med trygg utbetaling'],
  ];

  // Nytt i festtimeplanen — ekte festivalar & klubbkvelder (frå World-fanen).
  const PARTIES = [
    ['🏔️', 'Burning Mountain', 'Zernez, Sveits', '25.–28. jun 2026'],
    ['🏛️', 'IT Athens — Community Night III', 'Exarcheia, Athen', '3. jul 2026'],
    ['🏛️', 'IT Athens — Closing Season · TYPEO · MOSHBEAT · Plagger', 'Athen', '11. jul 2026'],
    ['🕉️', 'ZNA Gathering', 'Montargil, Portugal', '15.–22. jul 2026'],
    ['🔥', 'OZORA Festival', 'Dádpuszta, Ungarn', '27. jul–4. aug 2026'],
    ['🌲', 'Mo:Dem Festival', 'Primišlje, Kroatia', '3.–9. aug 2026'],
    ['🌏', 'Earth Frequency Festival', 'Woodford, Australia', '23.–26. okt 2026'],
  ];

  // Artistar du møter på plattforma.
  const ARTISTS = [
    ['🌠', 'Astral Projection', 'Goa / Psytrance · Israel'],
    ['✨', 'Shpongle', 'Psybient · UK'],
    ['🍄', 'Infected Mushroom', 'Psytrance · Israel'],
    ['🌀', 'Astrix', 'Full-on Psytrance · Israel'],
    ['🚀', 'Vini Vici', 'Psytrance · Israel'],
    ['🧬', 'Carbon Based Lifeforms', 'Psybient · Sverige'],
  ];

  const featRow = (emoji, title, desc) =>
    `<tr>
      <td style="padding:0.45rem 0;vertical-align:top;width:34px;font-size:1.2rem">${emoji}</td>
      <td style="padding:0.45rem 0;vertical-align:top">
        <span style="color:#e2e8f0;font-weight:600">${title}</span><span style="color:#94a3b8"> — ${desc}</span>
      </td>
    </tr>`;

  const partyRow = (emoji, name, loc, date) =>
    `<tr>
      <td style="padding:0.55rem 0.75rem;vertical-align:top;width:30px;font-size:1.15rem;border-top:1px solid rgba(255,255,255,0.06)">${emoji}</td>
      <td style="padding:0.55rem 0.75rem;vertical-align:top;border-top:1px solid rgba(255,255,255,0.06)">
        <span style="color:#fff;font-weight:700;font-size:0.92rem">${name}</span><br>
        <span style="color:#94a3b8;font-size:0.82rem">${loc}</span>
      </td>
      <td style="padding:0.55rem 0.75rem;vertical-align:top;text-align:right;white-space:nowrap;border-top:1px solid rgba(255,255,255,0.06)">
        <span style="color:#f59e0b;font-weight:700;font-size:0.82rem">${date}</span>
      </td>
    </tr>`;

  const artistChip = (emoji, name, meta) =>
    `<td style="width:50%;padding:0.4rem">
      <div style="background:#12121f;border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:0.65rem 0.8rem">
        <div style="font-size:1.1rem;line-height:1">${emoji}</div>
        <div style="color:#fff;font-weight:700;font-size:0.88rem;margin-top:0.25rem">${name}</div>
        <div style="color:#94a3b8;font-size:0.76rem;margin-top:0.1rem">${meta}</div>
      </div>
    </td>`;

  const featureRows = FEATURES.map(f => featRow(f[0], f[1], f[2])).join('');
  const partyRows   = PARTIES.map(p => partyRow(p[0], p[1], p[2], p[3])).join('');
  // Artistar i eit 2-kolonners rutenett.
  let artistRows = '';
  for (let i = 0; i < ARTISTS.length; i += 2) {
    const a = ARTISTS[i], b = ARTISTS[i + 1];
    artistRows += `<tr>${artistChip(a[0], a[1], a[2])}${b ? artistChip(b[0], b[1], b[2]) : '<td style="width:50%"></td>'}</tr>`;
  }

  return `<!DOCTYPE html>
<html lang="no">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f1a;font-family:'Inter',Arial,sans-serif">
  <div style="max-width:560px;margin:2rem auto;background:#1a1a2e;border-radius:16px;overflow:hidden;border:1px solid rgba(124,58,237,0.3)">
    <div style="background:linear-gradient(135deg,#7c3aed,#2563eb);padding:2rem;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:1.75rem;font-weight:800;letter-spacing:-0.5px">Sound<span style="color:#f59e0b">Core</span></h1>
      <p style="color:rgba(255,255,255,0.85);margin:0.4rem 0 0;font-size:0.85rem;letter-spacing:0.04em">DET DESENTRALISERTE LYD-UNIVERSET</p>
    </div>
    <div style="padding:2rem;color:#e2e8f0">
      <h2 style="color:#fff;margin:0 0 0.75rem;font-size:1.3rem">Bli med i Sound Core, ${escHtml(name)} 🎧</h2>
      <p style="color:#94a3b8;line-height:1.6;margin:0 0 1.25rem">Sound Core er den desentraliserte plattformen for DJ-er, produsenter og psytrance-/ambient-folk. Last opp mixene dine, stream sjangerradio døgnet rundt, kringkast direkte, finn venner og kjøp &amp; selg låter — alt på ett sted. <strong style="color:#c4b5fd">Meld deg inn gratis</strong> og bli en del av miljøet.</p>

      <h3 style="color:#fff;margin:0 0 0.5rem;font-size:1.05rem">🚀 Hvorfor melde deg inn?</h3>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;line-height:1.45;font-size:0.92rem">
        ${featureRows}
      </table>

      <div style="border-top:1px solid rgba(255,255,255,0.08);margin:1.75rem 0 1.25rem"></div>

      <h3 style="color:#fff;margin:0 0 0.25rem;font-size:1.05rem">🗓️ Nytt i festtimeplanen</h3>
      <p style="color:#94a3b8;line-height:1.5;margin:0 0 0.75rem;font-size:0.88rem">Ferske datoer fra scenen — følg dem direkte i World-fanen:</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid rgba(255,255,255,0.08);border-radius:10px;overflow:hidden">
        ${partyRows}
      </table>

      <div style="border-top:1px solid rgba(255,255,255,0.08);margin:1.75rem 0 1.25rem"></div>

      <h3 style="color:#fff;margin:0 0 0.5rem;font-size:1.05rem">🎤 Artister du møter</h3>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
        ${artistRows}
      </table>

      <div style="border-top:1px solid rgba(255,255,255,0.08);margin:1.75rem 0 1.25rem"></div>

      <div style="background:linear-gradient(135deg,rgba(124,58,237,0.22),rgba(37,99,235,0.18));border:1px solid rgba(124,58,237,0.35);border-radius:12px;padding:1.25rem">
        <h3 style="color:#fff;margin:0 0 0.4rem;font-size:1.05rem">🤖 Nytt: AI live på direkten</h3>
        <p style="color:#cbd5e1;line-height:1.6;margin:0 0 0.5rem;font-size:0.92rem">Når du kringkaster live på Sound Core, får du <strong style="color:#fff">AI med på laget</strong>: sanntids stemme inn/ut, automatisk transkripsjon av settet, og AI-rettighetssjekk på låtene du deler. La AI-en være co-piloten din mens du spiller.</p>
        <div style="text-align:center;margin:0.85rem 0 0">
          <a href="${liveUrl}" style="display:inline-block;background:rgba(255,255,255,0.1);color:#fff;text-decoration:none;padding:0.6rem 1.4rem;border-radius:8px;font-weight:700;font-size:0.9rem;border:1px solid rgba(255,255,255,0.25)">Se live-sendinger ▸</a>
        </div>
      </div>

      <div style="text-align:center;margin:2rem 0 0.5rem">
        <a href="${joinUrl}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#2563eb);color:#fff;text-decoration:none;padding:0.95rem 2.25rem;border-radius:8px;font-weight:800;font-size:1.05rem">Meld meg inn — gratis</a>
      </div>
      <p style="color:#64748b;font-size:0.85rem;text-align:center;margin:0.5rem 0 0">Eller åpne <a href="${base}" style="color:#7c3aed">${displayUrl}</a> i nettleseren.</p>
    </div>
    <div style="padding:1.5rem 2rem;border-top:1px solid rgba(255,255,255,0.08);text-align:center">
      <p style="color:#94a3b8;font-size:0.9rem;margin:0 0 0.35rem">Hilsen,<br><strong style="color:#fff">Sound Core</strong></p>
      <p style="margin:0 0 1rem"><a href="${base}" style="color:#7c3aed;font-size:0.85rem;text-decoration:none">${displayUrl}</a></p>
      <p style="color:#64748b;font-size:0.78rem;line-height:1.5;margin:0 0 0.75rem">Du får denne reklame-e-posten fordi du er medlem av Sound Core. Vil du ikke ha flere markedsførings-e-poster?</p>
      <div style="margin:0 0 1rem">
        <a href="${unsubUrl}" style="display:inline-block;background:transparent;color:#94a3b8;text-decoration:none;padding:0.5rem 1.4rem;border-radius:8px;font-weight:600;font-size:0.85rem;border:1px solid rgba(255,255,255,0.18)">Avmeld reklame</a>
      </div>
      <p style="color:#475569;font-size:0.75rem;margin:0">© ${new Date().getFullYear()} Sound Core</p>
    </div>
  </div>
</body>
</html>`;
}

function bugReportHtml(info) {
  const row = (label, value) =>
    `<tr>
      <td style="padding:0.45rem 0.75rem;color:#94a3b8;font-size:0.85rem;vertical-align:top;white-space:nowrap;border-top:1px solid rgba(255,255,255,0.06)">${label}</td>
      <td style="padding:0.45rem 0.75rem;color:#e2e8f0;font-size:0.85rem;vertical-align:top;border-top:1px solid rgba(255,255,255,0.06);word-break:break-word">${escHtml(value || '—')}</td>
    </tr>`;
  const stack = info.errorStack
    ? `<pre style="margin:0.75rem 0 0;padding:0.9rem;background:#0f0f1a;border:1px solid rgba(255,255,255,0.08);border-radius:8px;color:#cbd5e1;font-size:0.78rem;line-height:1.5;white-space:pre-wrap;word-break:break-word;overflow:auto">${escHtml(String(info.errorStack).slice(0, 4000))}</pre>`
    : '';
  return `<!DOCTYPE html>
<html lang="no">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f1a;font-family:'Inter',Arial,sans-serif">
  <div style="max-width:620px;margin:2rem auto;background:#1a1a2e;border-radius:16px;overflow:hidden;border:1px solid rgba(239,68,68,0.35)">
    <div style="background:linear-gradient(135deg,#ef4444,#7c3aed);padding:1.5rem 2rem;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:1.4rem;font-weight:800;letter-spacing:-0.5px">🐛 Bug-rapport — Sound<span style="color:#fde68a">Core</span></h1>
    </div>
    <div style="padding:1.75rem 2rem;color:#e2e8f0">
      <p style="color:#94a3b8;line-height:1.6;margin:0 0 1rem">Ein brukar fekk ein feil på sida. Detaljane er fanga automatisk:</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid rgba(255,255,255,0.08);border-radius:10px;overflow:hidden">
        ${row('Feilmelding', info.errorMessage)}
        ${row('Rute', info.route)}
        ${row('Kjelde', [info.source, info.line && `:${info.line}`, info.col && `:${info.col}`].filter(Boolean).join(''))}
        ${row('Brukar', info.username ? '@' + info.username : 'ikkje innlogga')}
        ${row('Tidspunkt', info.time)}
        ${row('Nettlesar', info.userAgent)}
      </table>
      ${stack}
    </div>
    <div style="padding:1rem 2rem;border-top:1px solid rgba(255,255,255,0.08);text-align:center">
      <p style="color:#475569;font-size:0.75rem;margin:0">Automatisk varsel frå Sound Core · © ${new Date().getFullYear()}</p>
    </div>
  </div>
</body>
</html>`;
}

function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Sjekker server-side (Supabase accounts.marketing_opt_out) om mottakeren har meldt
// seg av reklame. Fail-open: kan vi IKKE sjekke (mangler konfig/tabell/kolonne, eller
// annen feil) → returner false, så promo-utsending oppfører seg som før provisjonering
// i stedet for å stoppe helt. Gjelder KUN reklame (type:'promo') — aldri konto-e-post.
async function isUnsubscribed(email) {
  const url  = process.env.SUPABASE_URL;
  const key  = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const addr = String(email || '').toLowerCase().trim();
  if (!url || !key || !addr) return false;
  try {
    const { createClient } = require('@supabase/supabase-js');
    const db = createClient(url, key, { auth: { persistSession: false } });
    const { data, error } = await db.from('accounts')
      .select('marketing_opt_out').ilike('email', addr).maybeSingle();
    if (error) return false;   // tabell/kolonne mangler e.l. → fail-open
    return !!(data && data.marketing_opt_out);
  } catch {
    return false;
  }
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

  const { type, toEmail, toName, token, fromName, fromUsername, inboxUrl, plan, orderRef } = req.body || {};
  if (!type) {
    return res.status(400).json({ error: 'Mangler type' });
  }

  const siteUrl = (process.env.SITE_URL || CANONICAL_URL).replace(/\/$/, '');
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'Sound Core <onboarding@resend.dev>';
  const resend = new Resend(process.env.RESEND_API_KEY);

  // Bygg emne + HTML basert på type. `to` kan overstyrast per type (t.d. bug-rapport
  // går alltid til teamet, aldri til ei klient-oppgitt adresse).
  let subject, html, to = toEmail;

  // Bug-rapport: mottakar vert sett på serveren — klienten kan IKKJE velje adresse.
  if (type === 'bug_report') {
    const b = req.body || {};
    to = process.env.BUG_REPORT_EMAIL || 'producerenur@gmail.com';
    subject = `🐛 Bug-rapport — Sound Core${b.route ? ` · ${String(b.route).slice(0, 60)}` : ''}`;
    html = bugReportHtml({
      errorMessage: b.errorMessage, errorStack: b.errorStack, source: b.source,
      line: b.line, col: b.col, route: b.route, username: b.username,
      time: b.time, userAgent: b.userAgent,
    });
  } else if (!toEmail || !toName) {
    return res.status(400).json({ error: 'Mangler påkrevde felt' });
  } else if (type === 'activation') {
    if (!token) return res.status(400).json({ error: 'Mangler token' });
    subject = `Aktiver Sound Core-kontoen din, ${toName}!`;
    html = activationHtml(toName, `${siteUrl}/#/activate/${token}`, siteUrl);
  } else if (type === 'reset') {
    if (!token) return res.status(400).json({ error: 'Mangler token' });
    subject = 'Tilbakestill passordet ditt på Sound Core';
    html = resetHtml(toName, `${siteUrl}/#/reset/${token}`);
  } else if (type === 'friend_request') {
    if (!fromName || !fromUsername) return res.status(400).json({ error: 'Mangler avsenderinfo' });
    subject = `${fromName} ønsker å bli venn med deg på Sound Core`;
    html = friendRequestHtml(toName, fromName, fromUsername, inboxUrl || `${siteUrl}/#/inbox`);
  } else if (type === 'purchase') {
    subject = 'Kvittering — Sound Core Pro er aktivert ⭐';
    html = purchaseHtml(toName, `${siteUrl}/`, plan, orderRef);
  } else if (type === 'promo') {
    // Respekter avmelding: send ALDRI reklame til noen som har meldt seg av.
    if (await isUnsubscribed(toEmail)) {
      return res.status(200).json({ success: true, skipped: 'unsubscribed' });
    }
    // Markedsførings-/«bli medlem»-e-post. Unsubscribe-lenka bærer mottakerens e-post
    // (#/unsubscribe/<email>) så ett klikk identifiserer hvem som melder seg av; kan
    // overstyrast av klienten via unsubscribeUrl.
    subject = 'Bli med på Sound Core — nye fester, artister & AI live ⚡';
    const unsubUrl = req.body?.unsubscribeUrl || `${siteUrl}/#/unsubscribe/${encodeURIComponent(toEmail)}`;
    html = promoHtml(toName, siteUrl, unsubUrl);
  } else {
    return res.status(400).json({ error: 'Ukjent e-posttype' });
  }

  try {
    // VIKTIG: Resend-SDK-en (v6) kastar IKKJE ved API-feil — han returnerer { data, error }.
    // Sjekk error eksplisitt, elles vert avvising (t.d. gratis-tier som berre tillèt sending
    // til kontoeigaren, eller manglande verifisert domene) rapportert som «sendt» til brukaren
    // sjølv om e-posten aldri gjekk ut.
    const { data, error } = await resend.emails.send({ from: fromEmail, to, subject, html });
    if (error) {
      console.error('Resend avviste e-post:', error);
      return res.status(502).json({ error: error.message || 'Resend kunne ikke sende e-posten' });
    }
    return res.status(200).json({ success: true, id: data?.id });
  } catch (e) {
    console.error('Resend feil:', e);
    return res.status(500).json({ error: e?.message || 'Kunne ikke sende e-post' });
  }
};

// Eksponert for testing (tools/test-activation.js) + gjenbruk i api/auth.js
// (server-side e-postutsending for kontoer). Påverkar ikkje produksjon.
module.exports.CANONICAL_URL = CANONICAL_URL;
module.exports.activationHtml = activationHtml;
module.exports.resetHtml = resetHtml;
module.exports.promoHtml = promoHtml;
module.exports.isUnsubscribed = isUnsubscribed;
