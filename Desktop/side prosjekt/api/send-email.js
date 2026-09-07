const { Resend } = require('resend');
const { getPlan, fmtKr, fmtDate, nextRenewal, PRO_BENEFITS } = require('./_plans');
const { cleanArticles } = require('./_strip');

// Kanonisk nettadresse for ALLE e-postlenker (aktivering, tilbakestilling, kjøp).
// Brukes som standard slik at lenkene alltid peker til det offisielle domenet —
// aldri til ein tilfeldig Vercel-preview-host (req.headers.host). Kan overstyrast
// med SITE_URL i miljøvariablane om domenet skulle endre seg.
const CANONICAL_URL = 'https://www.siriusfm.no';

function activationHtml(name, url, siteUrl) {
  const base       = (siteUrl || '').replace(/\/$/, '');
  const shopUrl    = `${base}/#/shop`;
  const displayUrl = base.replace(/^https?:\/\//, '') || 'SiriusFM';

  // Pristabell speilar SHOP_PLANS i js/app.js + PLANS i api/create-checkout.js.
  // Bevisst hardkoda her (sjølvstendig) så e-posten ikkje er avhengig av ein delt modul.
  const PLAN_ROWS = [
    { label: '1 month',    total: '149 kr',   per: '149 kr/mo',  save: null,        best: false },
    { label: '3 months',   total: '399 kr',   per: '133 kr/mo',  save: 'Save 11 %', best: false },
    { label: '6 months',   total: '749 kr',   per: '125 kr/mo',  save: 'Save 16 %', best: false },
    { label: '12 months',  total: '1 290 kr', per: '108 kr/mo',  save: 'Save 28 %', best: true  },
  ];
  const PRO_BENEFITS = [
    'DJ mixes over 3 hours (up to 20 h)',
    'Private / public visibility',
    'Pro badge on your profile',
    'Unlimited storage + priority support',
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
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f1a;font-family:'Inter',Arial,sans-serif">
  <div style="max-width:560px;margin:2rem auto;background:#1a1a2e;border-radius:16px;overflow:hidden;border:1px solid rgba(124,58,237,0.3)">
    <div style="background:linear-gradient(135deg,#7c3aed,#2563eb);padding:2rem;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:1.75rem;font-weight:800;letter-spacing:-0.5px">Sirius<span style="color:#f59e0b">FM</span></h1>
    </div>
    <div style="padding:2rem;color:#e2e8f0">
      <h2 style="color:#fff;margin:0 0 1rem;font-size:1.25rem">Hi, ${escHtml(name)}! 👋</h2>
      <p style="color:#94a3b8;line-height:1.6;margin:0 0 1rem">Thanks for signing up to SiriusFM! Tap the button below to activate your account and get started:</p>
      <p style="color:#7c8aa5;line-height:1.6;margin:0 0 1.5rem;font-size:0.9rem">SiriusFM is a music &amp; audio social platform where you can upload DJ mixes, stream genre-based radio, message friends, and buy &amp; sell tracks.</p>
      <div style="text-align:center;margin:2rem 0">
        <a href="${url}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#2563eb);color:#fff;text-decoration:none;padding:0.875rem 2rem;border-radius:8px;font-weight:700;font-size:1rem">Activate my account</a>
      </div>
      <p style="color:#64748b;font-size:0.85rem;line-height:1.5;margin:0 0 0.75rem">Button not working? Copy this link into your browser:<br><a href="${url}" style="color:#7c3aed;word-break:break-all">${url}</a></p>
      <p style="color:#64748b;font-size:0.85rem;margin:0">The link is valid for 24 hours. If you didn't create an account, you can ignore this email.</p>

      <div style="border-top:1px solid rgba(255,255,255,0.08);margin:2rem 0 1.5rem"></div>

      <h3 style="color:#fff;margin:0 0 0.75rem;font-size:1.05rem">🎧 What you get on SiriusFM</h3>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;line-height:1.45;font-size:0.92rem">
        ${featRow('🎚️', 'DJ mixes', 'upload your own mix (free up to 3 hours)')}
        ${featRow('📻', 'Radio &amp; Discover', 'genre-based radio with weekly rotation')}
        ${featRow('💬', 'Inbox', 'private messages and friend requests')}
        ${featRow('🎵', 'Marketplace', 'buy and sell tracks')}
      </table>

      <div style="border-top:1px solid rgba(255,255,255,0.08);margin:1.75rem 0 1.5rem"></div>

      <h3 style="color:#fff;margin:0 0 0.5rem;font-size:1.05rem">⭐ SiriusFM Pro — unlock everything</h3>
      <p style="color:#94a3b8;line-height:1.6;margin:0 0 1rem;font-size:0.92rem">${PRO_BENEFITS.join(' · ')}.</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:0.9rem;border:1px solid rgba(255,255,255,0.08);border-radius:10px;overflow:hidden">
        ${planRows}
      </table>
      <p style="color:#64748b;font-size:0.8rem;line-height:1.5;margin:0.85rem 0 0">All subscriptions are recurring and can be cancelled at any time. Secure payment via Stripe.</p>
      <div style="text-align:center;margin:1.5rem 0 0">
        <a href="${shopUrl}" style="display:inline-block;background:linear-gradient(135deg,#f59e0b,#f472b6);color:#fff;text-decoration:none;padding:0.75rem 1.75rem;border-radius:8px;font-weight:700;font-size:0.95rem">See plans in Shop</a>
      </div>

      <div style="border-top:1px solid rgba(255,255,255,0.08);margin:1.75rem 0 1.5rem"></div>

      <h3 style="color:#fff;margin:0 0 0.5rem;font-size:1.05rem">❓ Need help?</h3>
      <p style="color:#94a3b8;line-height:1.6;margin:0">Contact us at <a href="mailto:post@siriusfm.no" style="color:#c4b5fd;font-weight:600">post@siriusfm.no</a> — we'll reply as soon as we can.</p>
    </div>
    <div style="padding:1.5rem 2rem;border-top:1px solid rgba(255,255,255,0.08);text-align:center">
      <p style="color:#94a3b8;font-size:0.9rem;margin:0 0 0.35rem">Best,<br><strong style="color:#fff">SiriusFM</strong></p>
      <p style="margin:0 0 0.75rem"><a href="${base}" style="color:#7c3aed;font-size:0.85rem;text-decoration:none">${displayUrl}</a></p>
      <p style="color:#475569;font-size:0.75rem;margin:0">© ${new Date().getFullYear()} SiriusFM</p>
    </div>
  </div>
</body>
</html>`;
}

function resetHtml(name, url) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f1a;font-family:'Inter',Arial,sans-serif">
  <div style="max-width:560px;margin:2rem auto;background:#1a1a2e;border-radius:16px;overflow:hidden;border:1px solid rgba(124,58,237,0.3)">
    <div style="background:linear-gradient(135deg,#7c3aed,#2563eb);padding:2rem;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:1.75rem;font-weight:800;letter-spacing:-0.5px">Sirius<span style="color:#f59e0b">FM</span></h1>
    </div>
    <div style="padding:2rem;color:#e2e8f0">
      <h2 style="color:#fff;margin:0 0 1rem;font-size:1.25rem">Reset your password 🔑</h2>
      <p style="color:#94a3b8;line-height:1.6;margin:0 0 1rem">Hi ${escHtml(name)}! We received a request to reset your SiriusFM password. Tap the button below:</p>
      
      <div style="text-align:center;margin:2rem 0">
        <a href="${url}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#2563eb);color:#fff;text-decoration:none;padding:0.875rem 2rem;border-radius:8px;font-weight:700;font-size:1rem">Set a new password</a>
      </div>
      <p style="color:#64748b;font-size:0.85rem;line-height:1.5;margin:0 0 0.75rem">Button not working? Copy this link:<br><a href="${url}" style="color:#7c3aed;word-break:break-all">${url}</a></p>
      <p style="color:#64748b;font-size:0.85rem;margin:0">The link is valid for 1 hour. If you didn't request a reset, you can ignore this email.</p>

      <div style="border-top:1px solid rgba(255,255,255,0.08);margin:1.75rem 0 1.25rem"></div>

      <h3 style="color:#fff;margin:0 0 0.5rem;font-size:1.05rem">❓ Need help?</h3>
      <p style="color:#94a3b8;line-height:1.6;margin:0">Contact us at <a href="mailto:post@siriusfm.no" style="color:#c4b5fd;font-weight:600">post@siriusfm.no</a> — we'll reply as soon as we can.</p>
    </div>
    <div style="padding:1rem 2rem;border-top:1px solid rgba(255,255,255,0.08);text-align:center">
      <p style="color:#475569;font-size:0.75rem;margin:0">© ${new Date().getFullYear()} SiriusFM</p>
    </div>
  </div>
</body>
</html>`;
}

function friendRequestHtml(toName, fromName, fromUsername, inboxUrl) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f1a;font-family:'Inter',Arial,sans-serif">
  <div style="max-width:560px;margin:2rem auto;background:#1a1a2e;border-radius:16px;overflow:hidden;border:1px solid rgba(124,58,237,0.3)">
    <div style="background:linear-gradient(135deg,#7c3aed,#2563eb);padding:2rem;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:1.75rem;font-weight:800;letter-spacing:-0.5px">Sirius<span style="color:#f59e0b">FM</span></h1>
    </div>
    <div style="padding:2rem;color:#e2e8f0">
      <div style="text-align:center;margin-bottom:1.5rem">
        <div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#7c3aed,#2563eb);display:inline-flex;align-items:center;justify-content:center;font-size:2rem">👥</div>
      </div>
      <h2 style="color:#fff;margin:0 0 1rem;font-size:1.25rem;text-align:center">New friend request!</h2>
      <p style="color:#94a3b8;line-height:1.6;margin:0 0 0.5rem">Hi, ${escHtml(toName)}!</p>
      <p style="color:#94a3b8;line-height:1.6;margin:0 0 1.5rem"><strong style="color:#c4b5fd">${escHtml(fromName)}</strong> (@${escHtml(fromUsername)}) wants to be friends with you on SiriusFM.</p>
      <div style="text-align:center;margin:2rem 0">
        <a href="${inboxUrl}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#2563eb);color:#fff;text-decoration:none;padding:0.875rem 2rem;border-radius:8px;font-weight:700;font-size:1rem">Go to your inbox and accept</a>
      </div>
      <p style="color:#64748b;font-size:0.85rem;margin:0">Don't want to connect? You can decline the request from your inbox.</p>
    </div>
    <div style="padding:1rem 2rem;border-top:1px solid rgba(255,255,255,0.08);text-align:center">
      <p style="color:#475569;font-size:0.75rem;margin:0">© ${new Date().getFullYear()} SiriusFM</p>
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
  const renewWord = p.interval === 'year' ? 'every year' : (p.months > 1 ? `every ${p.months} months` : 'every month');

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
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f1a;font-family:'Inter',Arial,sans-serif">
  <div style="max-width:560px;margin:2rem auto;background:#1a1a2e;border-radius:16px;overflow:hidden;border:1px solid rgba(124,58,237,0.3)">
    <div style="background:linear-gradient(135deg,#7c3aed,#2563eb);padding:2rem;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:1.75rem;font-weight:800;letter-spacing:-0.5px">Sirius<span style="color:#f59e0b">FM</span></h1>
      <p style="color:rgba(255,255,255,0.85);margin:0.4rem 0 0;font-size:0.85rem;letter-spacing:0.04em">RECEIPT · PRO SUBSCRIPTION</p>
    </div>
    <div style="padding:2rem;color:#e2e8f0">
      <div style="text-align:center;margin-bottom:1.25rem">
        <div style="width:64px;height:64px;border-radius:50%;background:linear-gradient(135deg,#f59e0b,#f472b6);display:inline-flex;align-items:center;justify-content:center;font-size:2rem">⭐</div>
      </div>
      <h2 style="color:#fff;margin:0 0 0.5rem;font-size:1.25rem;text-align:center">Thank you for your purchase, ${escHtml(name)}!</h2>
      <p style="color:#94a3b8;line-height:1.6;margin:0 0 1.5rem;text-align:center">Your Pro subscription is now active. Here is your receipt.</p>

      <div style="background:#12121f;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:0.5rem 1.25rem;margin-bottom:1.5rem">
        <table style="width:100%;border-collapse:collapse">
          ${row('Product', 'SiriusFM Pro')}
          ${row('Period', p.label)}
          ${row('Purchase date', dateStr)}
          ${row('Renews', `${renewWord} (next: ${nextStr})`)}
          ${orderRef ? row('Order ref', escHtml(orderRef)) : ''}
          <tr><td colspan="2" style="border-top:1px solid rgba(255,255,255,0.1);padding-top:0.25rem"></td></tr>
          ${row('Paid', fmtKr(p.amount), true)}
        </table>
      </div>

      <p style="color:#fff;font-weight:700;font-size:0.95rem;margin:0 0 0.5rem">This is what you have unlocked:</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:1.5rem">${benefits}</table>

      <div style="text-align:center;margin:0 0 1.5rem">
        <a href="${siteUrl}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#2563eb);color:#fff;text-decoration:none;padding:0.875rem 2rem;border-radius:8px;font-weight:700;font-size:1rem">Go to SiriusFM</a>
      </div>
      <p style="color:#64748b;font-size:0.82rem;line-height:1.5;margin:0">The subscription renews automatically ${renewWord}. You can manage or cancel it in settings at any time. Questions? Just reply to this email.</p>
    </div>
    <div style="padding:1rem 2rem;border-top:1px solid rgba(255,255,255,0.08);text-align:center">
      <p style="color:#475569;font-size:0.75rem;margin:0">© ${new Date().getFullYear()} SiriusFM</p>
    </div>
  </div>
</body>
</html>`;
}

// Markedsførings-/«bli medlem»-e-post (reklame). Inneheld: kva SiriusFM er,
// kvifor melde seg inn, nye fester i timeplanen, artistar du møter, AI-tilbod på
// live stream — og ein tydeleg «Avmeld reklame»-knapp (GDPR/marknadsføringslov).
// Sjølvstendig (hardkoda innhald) så e-posten ikkje er avhengig av frontend-modular.
function promoHtml(name, siteUrl, unsubscribeUrl) {
  const base       = (siteUrl || '').replace(/\/$/, '');
  const displayUrl = base.replace(/^https?:\/\//, '') || 'SiriusFM';
  const joinUrl    = `${base}/#/signup`;
  const unsubUrl   = unsubscribeUrl || `${base}/#/unsubscribe`;

  // Det du får — kjernen i plattforma.
  const FEATURES = [
    ['🎚️', 'Upload your DJ mixes', 'free up to 3 hours — Pro unlocks up to 20 h'],
    ['📻', 'Genre radio & Discover', 'psytrance, ambient, techno & more, with weekly rotation'],
    ['🛰️', 'Live DJ broadcasting', 'send your Traktor audio straight to listeners in real time'],
    ['💬', 'Friends & inbox', 'chat, friend requests and real-time notifications'],
    ['🛒', 'Marketplace', 'buy and sell tracks with secure payouts'],
  ];

  // Nytt i festtimeplanen — ekte festivalar & klubbkvelder (frå World-fanen).
  // NB: denne lista er IKKJE dato-filtrert som EVENT_CALENDAR under — ho vart
  // send ufiltrert til nye/potensielle brukarar med fire festivalar og to
  // klubbkvelder som allereie hadde passert (oppdaga + retta 07.09.2026,
  // same runde som fiksa dei tilsvarande stale datoane i js/world.js).
  const PARTIES = [
    ['🏔️', 'Burning Mountain', 'Zernez, Switzerland', '24–27 Jun 2027'],
    ['🕉️', 'ZNA Gathering', 'Montargil, Portugal', 'Expected Jul 2027'],
    ['🔥', 'OZORA Festival', 'Dádpuszta, Hungary', '23 Jul–3 Aug 2027'],
    ['🌲', 'Mo:Dem Festival', 'Primišlje, Croatia', 'Expected Aug 2027'],
    ['🌏', 'Earth Frequency Festival', 'Woodford, Australia', '23–26 Oct 2026'],
  ];

  // Artistar du møter på plattforma.
  const ARTISTS = [
    ['🌠', 'Astral Projection', 'Goa / Psytrance · Israel'],
    ['✨', 'Shpongle', 'Psybient · UK'],
    ['🍄', 'Infected Mushroom', 'Psytrance · Israel'],
    ['🌀', 'Astrix', 'Full-on Psytrance · Israel'],
    ['🚀', 'Vini Vici', 'Psytrance · Israel'],
    ['🧬', 'Carbon Based Lifeforms', 'Psybient · Sweden'],
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
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f1a;font-family:'Inter',Arial,sans-serif">
  <div style="max-width:560px;margin:2rem auto;background:#1a1a2e;border-radius:16px;overflow:hidden;border:1px solid rgba(124,58,237,0.3)">
    <div style="background:linear-gradient(135deg,#7c3aed,#2563eb);padding:2rem;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:1.75rem;font-weight:800;letter-spacing:-0.5px">Sirius<span style="color:#f59e0b">FM</span></h1>
      <p style="color:rgba(255,255,255,0.85);margin:0.4rem 0 0;font-size:0.85rem;letter-spacing:0.04em">THE DECENTRALISED SOUND UNIVERSE</p>
    </div>
    <div style="padding:2rem;color:#e2e8f0">
      <h2 style="color:#fff;margin:0 0 0.75rem;font-size:1.3rem">Join SiriusFM, ${escHtml(name)} 🎧</h2>
      <p style="color:#94a3b8;line-height:1.6;margin:0 0 1.25rem">SiriusFM is the decentralised platform for DJs, producers and the psytrance/ambient community. Upload your mixes, stream genre radio around the clock, broadcast live, find friends and buy &amp; sell tracks — all in one place. <strong style="color:#c4b5fd">Join for free</strong> and become part of the scene.</p>

      <h3 style="color:#fff;margin:0 0 0.5rem;font-size:1.05rem">🚀 Why join?</h3>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;line-height:1.45;font-size:0.92rem">
        ${featureRows}
      </table>

      <div style="border-top:1px solid rgba(255,255,255,0.08);margin:1.75rem 0 1.25rem"></div>

      <h3 style="color:#fff;margin:0 0 0.25rem;font-size:1.05rem">🗓️ New in the party schedule</h3>
      <p style="color:#94a3b8;line-height:1.5;margin:0 0 0.75rem;font-size:0.88rem">Fresh dates from the scene — follow them in the World tab:</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid rgba(255,255,255,0.08);border-radius:10px;overflow:hidden">
        ${partyRows}
      </table>

      <div style="border-top:1px solid rgba(255,255,255,0.08);margin:1.75rem 0 1.25rem"></div>

      <h3 style="color:#fff;margin:0 0 0.5rem;font-size:1.05rem">🎤 Artists you'll meet</h3>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse">
        ${artistRows}
      </table>

      <div style="text-align:center;margin:2rem 0 0.5rem">
        <a href="${joinUrl}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#2563eb);color:#fff;text-decoration:none;padding:0.95rem 2.25rem;border-radius:8px;font-weight:800;font-size:1.05rem">Join now — free</a>
      </div>
      <p style="color:#64748b;font-size:0.85rem;text-align:center;margin:0.5rem 0 0">Or open <a href="${base}" style="color:#7c3aed">${displayUrl}</a> in your browser.</p>
    </div>
    <div style="padding:1.5rem 2rem;border-top:1px solid rgba(255,255,255,0.08);text-align:center">
      <p style="color:#94a3b8;font-size:0.9rem;margin:0 0 0.35rem">Best,<br><strong style="color:#fff">SiriusFM</strong></p>
      <p style="margin:0 0 1rem"><a href="${base}" style="color:#7c3aed;font-size:0.85rem;text-decoration:none">${displayUrl}</a></p>
      <p style="color:#64748b;font-size:0.78rem;line-height:1.5;margin:0 0 0.75rem">You're receiving this promotional email because you're a SiriusFM member. Don't want more marketing emails?</p>
      <div style="margin:0 0 1rem">
        <a href="${unsubUrl}" style="display:inline-block;background:transparent;color:#94a3b8;text-decoration:none;padding:0.5rem 1.4rem;border-radius:8px;font-weight:600;font-size:0.85rem;border:1px solid rgba(255,255,255,0.18)">Unsubscribe from marketing</a>
      </div>
      <p style="color:#475569;font-size:0.75rem;margin:0">© ${new Date().getFullYear()} SiriusFM</p>
    </div>
  </div>
</body>
</html>`;
}

// ── Påminning til innlogga brukarar: «kva som kjem» ───────────────────────
// Eit samla digest: kva som spelar på radioen akkurat no, radioprogramma som
// kjem denne veka, ferske magasinsaker, nye intervju, festival-/festnyhende og
// datoane som står for tur. Innhaldet blir lese frå same magazine_cache-tabellen
// som #/magazine og #/world bruker, så e-posten viser det same som sida.
// Har eit tydeleg avmeldingsval, som promo-e-posten (marknadsføringslov/GDPR).

// Utvalde kanalar — speglar dei featured stasjonane i js/radio.js. Bevisst
// hardkoda (sjølvstendig) så e-posten ikkje treng frontend-modulane.
const FEATURED_STATIONS = [
  ['🌠', 'Stellar PSY',    'Psychedelic Dub · SiriusFM\'s main station'],
  ['🔮', 'Radio Q37',      'Psytrance · around the clock'],
  ['🌌', 'Deep Space',     'Ambient · deep listening'],
  ['🎛️', 'Underground',    'Raw & hypnotic techno'],
];

// Veke-programmet — speglar SHOWS i js/shows.js (#/shows). Bevisst hardkoda av
// same grunn som stasjonane. `day`: 0 = søndag. Timane er i norsk tid.
const RADIO_SHOWS = [
  { day: 0, start: 14, end: 18, emoji: '🚀', name: 'Mission Control Sunday', host: 'Space Command',        genre: 'Ambient Space Music' },
  { day: 0, start: 22, end: 2,  emoji: '🌠', name: 'Stellar PSY Night',      host: 'Stellar Collective',    genre: 'Psytrance · Psychedelic' },
  { day: 0, start: 4,  end: 7,  emoji: '🌑', name: 'Dark Zone Transmission', host: 'Dark Zone',             genre: 'Dark Ambient · Drone' },
  { day: 1, start: 7,  end: 10, emoji: '🌌', name: 'Drone Morning',          host: 'Ambient Collective',    genre: 'Ambient · Drone' },
  { day: 1, start: 12, end: 15, emoji: '🌿', name: 'Psychill Afternoon',     host: 'MultiHuman EntheoMusic',genre: 'Psychill · Psybient' },
  { day: 2, start: 7,  end: 10, emoji: '🌅', name: 'Goa Sunrise',            host: 'Suburbs of Goa',        genre: 'Psytrance · Goa' },
  { day: 2, start: 21, end: 24, emoji: '💊', name: 'Techno Underground',     host: 'DJ Digitalis',          genre: 'Techno · Minimal' },
  { day: 3, start: 18, end: 21, emoji: '🌿', name: 'Chill Wednesday',        host: 'Lush Sessions',         genre: 'Chill · Downtempo' },
  { day: 3, start: 21, end: 24, emoji: '💧', name: 'Fluid Chillroom',        host: 'Fluid Collective',      genre: 'Psychill · Experimental' },
  { day: 4, start: 18, end: 21, emoji: '🛋️', name: 'Chillout Lounge',        host: 'Lounge Sessions',       genre: 'Chill Out · Lounge' },
  { day: 4, start: 23, end: 3,  emoji: '🛸', name: 'Space Travel',           host: 'Cosmic Station',        genre: 'Space Music · Ambient' },
  { day: 5, start: 3,  end: 6,  emoji: '💀', name: 'Dark Drone Ritual',      host: 'The Void Wanderer',     genre: 'Dark Ambient · Drone' },
  { day: 5, start: 15, end: 18, emoji: '🌀', name: 'The Trip Sessions',      host: 'The Trip',              genre: 'Psychill · Trip-Hop' },
  { day: 5, start: 20, end: 23, emoji: '🎷', name: 'Groove Friday',          host: 'Nu-Jazz Collective',    genre: 'Nu-Jazz · Trip-Hop' },
  { day: 6, start: 0,  end: 4,  emoji: '🌑', name: 'Deep Space Saturday',    host: 'Deep Space One',        genre: 'Deep Ambient · Electronic' },
  { day: 6, start: 12, end: 15, emoji: '🥗', name: 'Groove Salad Sessions',  host: 'Groove Salad',          genre: 'Downtempo · IDM' },
  { day: 6, start: 18, end: 21, emoji: '🌀', name: 'Progressive Psy Session',host: 'Trance Around',         genre: 'Progressive Psy · Trance' },
  { day: 6, start: 21, end: 24, emoji: '🎲', name: 'Dice Radio Athens',      host: 'Dice Radio',            genre: 'Underground · Greek Electronic' },
  { day: 3, start: 0,  end: 3,  emoji: '🍄', name: 'DMT FM Sessions',        host: 'DMT FM',                genre: 'Psytrance · Goa' },
  { day: 0, start: 7,  end: 10, emoji: '🌙', name: 'Babaganousha Radio',     host: 'Babaganousha',          genre: 'Psytrance · Goa' },
  { day: 4, start: 21, end: 23, emoji: '🌌', name: 'Astral Trance Radio',    host: 'ATR',                   genre: 'Progressive Psy · Trance' },
  { day: 1, start: 15, end: 18, emoji: '🎧', name: 'n5MD Nightscapes',       host: 'n5MD Radio',            genre: 'Downtempo · Ambient' },
  { day: 2, start: 10, end: 13, emoji: '🧿', name: 'Psyndora Radio',         host: 'Psyndora',              genre: 'Psytrance · Goa' },
  { day: 3, start: 3,  end: 6,  emoji: '🍄', name: 'Babaganousha Labs',      host: 'Babaganousha Labs',     genre: 'Psytrance · Goa' },
  { day: 4, start: 0,  end: 3,  emoji: '🌀', name: 'RR Progressive',         host: 'RR Progressive',        genre: 'Progressive Psy · Trance' },
  { day: 6, start: 8,  end: 11, emoji: '🌫️', name: 'Ambient Psychill',       host: '1.FM',                  genre: 'Psychill · Ambient' },
  { day: 1, start: 18, end: 21, emoji: '🎐', name: 'Groove Salad Classic',   host: 'Groove Salad Classic',  genre: 'Downtempo · Chillout' },
  { day: 1, start: 21, end: 24, emoji: '🫧', name: 'Smooth Chill',           host: 'Smooth Chill',          genre: 'Downtempo · Chillout' },
  { day: 2, start: 0,  end: 3,  emoji: '💊', name: 'Defcon Techno',          host: 'Defcon',                genre: 'Techno Underground · EDM' },
  { day: 4, start: 15, end: 18, emoji: '🔥', name: 'radiOzora Trance Hour',  host: 'radiOzora',             genre: 'Psytrance · Psychedelic' },
  { day: 0, start: 10, end: 14, emoji: '🌿', name: 'radiOzora Chill Hour',   host: 'radiOzora',             genre: 'Psychill · Downtempo' },
  { day: 5, start: 6,  end: 9,  emoji: '🔮', name: 'Radio Q37 Sessions',     host: 'Radio Q37',             genre: 'Psytrance · Ambient Dub' },
];

// Faste datoar frå #/world (festivalar + klubbkveldar). `to` er ISO-datoen
// arrangementet er over — alt som har vore blir filtrert bort, og lista er
// sortert på `to`, så e-posten alltid viser det som står nærmast for tur og
// aldri lovar ein fest som gjekk i fjor.
//
// Speglar FESTIVALS/CLUBS i js/world.js. Berre oppføringar med FAST dato er med:
// dei som står som «Annually · Jul», «Biennial · New Year» e.l. har inga dato å
// telje ned til, og høyrer difor heime på sida — ikkje i ein kalender.
// Oppdater denne når World-sida får nye datoar.
const EVENT_CALENDAR = [
  // Oppdatert/rydda 07.09.2026: IT Athens sine to juli-2026-datoar er borte
  // (same fiks som js/world.js Clubs), og ZNA/Mo:Dem/Free Earth/Hadra er
  // fjerna herifrå (ikkje frå World-sida) fordi 2027-datoane deira enno
  // ikkje er offisielt stadfesta — denne lista krev FAST dato per kommentaren
  // over, så eit gjettedato høyrer ikkje heime her. Sjå js/world.js for den
  // mjukare "Expected …"-forma dei står med der.
  { emoji: '🏔️', name: 'Burning Mountain',                loc: 'Zernez, Switzerland',      when: '24 – 27 Jun 2027',    from: '2027-06-24', to: '2027-06-27', url: 'https://www.burning-mountain.ch/' },
  { emoji: '🔥', name: 'OZORA Festival',                   loc: 'Dádpuszta, Hungary',       when: '23 Jul – 3 Aug 2027', from: '2027-07-23', to: '2027-08-03', url: 'https://ozorafestival.eu/' },
  { emoji: '🪶', name: 'Indian Spirit',                    loc: 'Eldena, Germany',          when: '25 – 30 Aug 2027',    from: '2027-08-25', to: '2027-08-30', url: 'https://www.indian-spirit.de/' },
  { emoji: '🌏', name: 'Earth Frequency Festival',         loc: 'Woodford, QLD, Australia', when: '23–26 Oct 2026',      from: '2026-10-23', to: '2026-10-26', url: 'https://www.earthfrequency.com.au/' },
  { emoji: '🦅', name: 'Origin Festival',                  loc: 'Helderstroom, South Africa', when: '29–31 Jan 2027',    from: '2027-01-29', to: '2027-01-31', url: 'https://originfestival.com/' },
  { emoji: '🏝️', name: 'Tribal Gathering',                loc: 'Caribbean coast, Panama',  when: '5–22 Mar 2027',       from: '2027-03-05', to: '2027-03-22', url: 'https://www.tribalgathering.com/' },
  { emoji: '🛩️', name: 'VooV Experience',                 loc: 'Putlitz, Germany',         when: '16–19 Jul 2027',      from: '2027-07-16', to: '2027-07-19', url: 'https://www.voov.de/' },
  { emoji: '🌌', name: 'Boom Festival — 30 years',         loc: 'Idanha-a-Nova, Portugal',  when: '18–25 Jul 2027',      from: '2027-07-18', to: '2027-07-25', url: 'https://www.boomfestival.org/' },
];

// Kuraterte "New releases"-saker frå js/magazine.js sin MAGAZINE-array.
// Same duplisering-problem som RADIO_SHOWS/EVENT_CALENDAR: serveren kan ikkje
// importere ein frontend-modul, og readMagazine() under les KUN AI-cache-
// tabellen magazine_cache — aldri denne kuraterte lista. Utan denne dupliserte
// kopien ville handplukka utgjevingar (Cryo Chamber, Drumcomplex osv.) aldri
// nådd nokon på e-post, same om kor mange dei blir. Berre dei med ei ekte,
// spesifikk dato er med — «Ongoing»/«Updated monthly»-sakene høyrer heime på
// sida, ikkje i eit "nytt no"-utval. Oppdater denne når nye "New releases"-
// saker med ekte dato blir lagt til i js/magazine.js.
const NEW_RELEASES = [
  { tittel: 'Anjunadeep 16', ingress: 'The sixteenth edition of the compilation series, released February 2026.', kilde: { navn: 'Anjunadeep 16 (Bandcamp)' }, kilde_url: 'https://anjunadeep.bandcamp.com/album/anjunadeep-16' },
  { tittel: 'Aes Dana — Perimeters (Remaster 2025)', ingress: 'Ultimae dusts off a downtempo classic.', kilde: { navn: 'Ultimae Records' }, kilde_url: 'https://ultimae.com/' },
  { tittel: 'Drumcomplex returns to his own DCMX with «Supernova»', ingress: 'Tough, no-nonsense German techno — 139 BPM, raw and uncompromising.', kilde: { navn: 'DCMX (Beatport)' }, kilde_url: 'https://www.beatport.com/release/supernova/5823425' },
  { tittel: 'Void Stasis returns with «Specimen 7»', ingress: 'A sci-fi dark ambient voyage on Cryo Chamber, mastered by label head Simon Heath.', kilde: { navn: 'Cryo Chamber (Bandcamp)' }, kilde_url: 'https://cryochamber.bandcamp.com/album/specimen-7' },
];

const DAY_NAMES  = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const DAY_SHORT  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const MAG_TABLE = 'magazine_cache';

// Kva klokka og kva vekedag det er i Noreg. Serveren køyrer i UTC, men
// programmet i js/shows.js er sett opp i norsk tid — utan denne omrekninga
// ville e-posten peika på feil sending om sommaren (UTC+2).
function osloClock(now) {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Oslo', weekday: 'short', hour: '2-digit', hour12: false,
    }).formatToParts(now || new Date());
    const wd  = (parts.find(p => p.type === 'weekday') || {}).value;
    const hr  = parseInt((parts.find(p => p.type === 'hour') || {}).value, 10);
    const idx = DAY_SHORT.indexOf(wd);
    return { day: idx < 0 ? 0 : idx, hour: Number.isFinite(hr) ? hr % 24 : 0 };
  } catch {
    const d = now || new Date();
    return { day: d.getUTCDay(), hour: d.getUTCHours() };
  }
}

// Er sendinga på lufta akkurat no? Same regel som Shows.getCurrentShow():
// eit program som kryssar midnatt (end <= start) går frå start til end dagen etter.
function showIsLive(s, day, hour) {
  if (s.day !== day) return false;
  return s.end > s.start ? (hour >= s.start && hour < s.end)
                         : (hour >= s.start || hour < s.end);
}

// Programma i den rekkjefølgja dei faktisk kjem, frå og med i dag. Ei sending
// som er ferdig i dag blir skyvd ei veke fram, så «neste ut» står øvst.
function upcomingShows(clock, limit) {
  const { day, hour } = clock;
  return RADIO_SHOWS
    .map(s => {
      const live     = showIsLive(s, day, hour);
      const finished = s.day === day && s.end > s.start && hour >= s.end;
      let offset = (s.day - day + 7) % 7;
      if (finished && !live) offset += 7;
      return { ...s, live, offset, when: offset === 0 ? 'Today' : (offset === 1 ? 'Tomorrow' : DAY_NAMES[s.day]) };
    })
    .sort((a, b) => (a.live !== b.live ? (a.live ? -1 : 1) : (a.offset - b.offset || a.start - b.start)))
    .slice(0, limit || 4);
}

// Berre arrangement som ikkje har vore enno, det som startar først øvst. Vi
// filtrerer på sluttdato (ein festival som er i gang er framleis aktuell), men
// sorterer på startdato — det er den lesaren ser i «når»-kolonna. Tom liste er
// heilt greitt: då fell seksjonen bort og dei ferske festivalsakene frå
// magasinet står att.
function upcomingEvents(now, limit) {
  const today = (now || new Date()).toISOString().slice(0, 10);
  return EVENT_CALENDAR
    .filter(e => e.to >= today)
    .sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : 0))
    .slice(0, limit || 4);
}

// Les lagra magasinsaker for éin sjanger. Same tabell som api/magazine.js skriv til.
async function readMagazine(genre, limit) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return [];
  try {
    const u = `${url}/rest/v1/${MAG_TABLE}?genre=eq.${encodeURIComponent(genre)}&select=articles`;
    const r = await fetch(u, {
      headers: { apikey: key, Authorization: 'Bearer ' + key, Accept: 'application/json' },
    });
    if (!r.ok) return [];
    const rows = await r.json().catch(() => []);
    const arts = Array.isArray(rows) && rows[0] && Array.isArray(rows[0].articles) ? rows[0].articles : [];
    // Same reinsing som api/magazine.js gjer: denne vegen les cachen direkte, så
    // utan strippinga her ville <cite …>-markup gått rett ut i påminnings-e-posten.
    return cleanArticles(arts).slice(0, limit || 4);
  } catch (e) {
    console.error('live_now magazine read:', e && e.message ? e.message : e);
    return [];
  }
}

// Plukk ut intervju-saker. AI-genererte saker har ikkje alltid kategori, så vi
// fell tilbake på tittel/ingress-treff for «interview».
function pickInterviews(articles, limit) {
  const isInterview = a =>
    /interview/i.test(String(a.kategori || '')) ||
    /\binterview(s|ed)?\b|\bin conversation\b|\btalks about\b/i.test(`${a.tittel || ''} ${a.ingress || ''}`);
  const hits = articles.filter(isInterview);
  return hits.slice(0, limit || 3);
}

function liveNowHtml(name, siteUrl, unsubscribeUrl, data) {
  const base       = (siteUrl || '').replace(/\/$/, '');
  const displayUrl = base.replace(/^https?:\/\//, '') || 'SiriusFM';
  const radioUrl   = `${base}/#/radio`;
  const worldUrl   = `${base}/#/world`;
  const magUrl     = `${base}/#/magazine`;
  const showsUrl   = `${base}/#/shows`;
  const logoUrl    = `${base}/assets/icon-192.png`;
  const unsubUrl   = unsubscribeUrl || `${base}/#/unsubscribe`;

  const stations   = Array.isArray(data.stations) && data.stations.length ? data.stations : FEATURED_STATIONS;
  const shows      = Array.isArray(data.shows)      ? data.shows      : [];
  const magazine   = Array.isArray(data.magazine)   ? data.magazine   : [];
  const festivals  = Array.isArray(data.festivals)  ? data.festivals  : [];
  const interviews = Array.isArray(data.interviews) ? data.interviews : [];
  const releases   = Array.isArray(data.releases)   ? data.releases   : [];
  const events     = Array.isArray(data.events)     ? data.events     : [];

  const stationRow = (emoji, title, desc) =>
    `<tr>
      <td style="padding:0.5rem 0.75rem;vertical-align:top;width:34px;font-size:1.15rem;border-top:1px solid rgba(255,255,255,0.06)">${emoji}</td>
      <td style="padding:0.5rem 0.75rem;vertical-align:top;border-top:1px solid rgba(255,255,255,0.06)">
        <span style="color:#fff;font-weight:700;font-size:0.92rem">${escHtml(title)}</span><br>
        <span style="color:#94a3b8;font-size:0.82rem">${escHtml(desc)}</span>
      </td>
      <td style="padding:0.5rem 0.75rem;vertical-align:middle;text-align:right;white-space:nowrap;border-top:1px solid rgba(255,255,255,0.06)">
        <span style="color:#4ade80;font-weight:800;font-size:0.72rem;letter-spacing:0.06em">● LIVE</span>
      </td>
    </tr>`;

  // Ei magasinsak: tittel lenkjer til SiriusFM, kjelda til originalen.
  const articleRow = (a, linkUrl) => {
    const title = escHtml(a.tittel || a.title || '');
    if (!title) return '';
    const lead  = escHtml(a.ingress || a.summary || '');
    const src   = a.kilde && a.kilde.navn ? escHtml(a.kilde.navn) : '';
    return `<tr>
      <td style="padding:0.65rem 0.75rem;border-top:1px solid rgba(255,255,255,0.06)">
        <a href="${linkUrl}" style="color:#fff;font-weight:700;font-size:0.92rem;text-decoration:none">${title}</a>
        ${lead ? `<div style="color:#94a3b8;font-size:0.83rem;line-height:1.5;margin-top:0.2rem">${lead}</div>` : ''}
        ${src  ? `<div style="color:#64748b;font-size:0.75rem;margin-top:0.25rem">Source: ${src}</div>` : ''}
      </td>
    </tr>`;
  };

  const section = (title, sub, rows, ctaLabel, ctaUrl, accent) => rows
    ? `<div style="border-top:1px solid rgba(255,255,255,0.08);margin:1.75rem 0 1.25rem"></div>
       <h3 style="color:#fff;margin:0 0 0.25rem;font-size:1.05rem">${title}</h3>
       ${sub ? `<p style="color:#94a3b8;line-height:1.5;margin:0 0 0.75rem;font-size:0.88rem">${sub}</p>` : ''}
       <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid rgba(255,255,255,0.08);border-radius:10px;overflow:hidden">
         ${rows}
       </table>
       <div style="text-align:center;margin:1rem 0 0">
         <a href="${ctaUrl}" style="display:inline-block;background:transparent;color:${accent};text-decoration:none;padding:0.55rem 1.5rem;border-radius:8px;font-weight:700;font-size:0.88rem;border:1px solid ${accent}66">${ctaLabel}</a>
       </div>`
    : '';

  // Eit radioprogram: kva, kven og når — med ON AIR-merke om det går no.
  const showRow = s => `
    <tr>
      <td style="padding:0.5rem 0.75rem;vertical-align:top;width:34px;font-size:1.15rem;border-top:1px solid rgba(255,255,255,0.06)">${s.emoji || '🎙️'}</td>
      <td style="padding:0.5rem 0.75rem;vertical-align:top;border-top:1px solid rgba(255,255,255,0.06)">
        <span style="color:#fff;font-weight:700;font-size:0.92rem">${escHtml(s.name || '')}</span>
        ${s.live ? '<span style="color:#4ade80;font-weight:800;font-size:0.68rem;letter-spacing:0.06em">&nbsp; ● ON AIR</span>' : ''}
        <br><span style="color:#94a3b8;font-size:0.82rem">${escHtml(s.host ? `with ${s.host}` : '')}${s.host && s.genre ? ' · ' : ''}${escHtml(s.genre || '')}</span>
      </td>
      <td style="padding:0.5rem 0.75rem;vertical-align:top;text-align:right;white-space:nowrap;border-top:1px solid rgba(255,255,255,0.06)">
        <span style="color:#7dd3fc;font-weight:700;font-size:0.8rem">${escHtml(s.when || '')}</span><br>
        <span style="color:#64748b;font-size:0.76rem">${String(s.start).padStart(2,'0')}:00–${String((s.end || 0) % 24).padStart(2,'0')}:00</span>
      </td>
    </tr>`;

  // Ein dato frå kalenderen på #/world — namn, stad og når.
  const eventRow = e => `
    <tr>
      <td style="padding:0.55rem 0.75rem;vertical-align:top;width:30px;font-size:1.15rem;border-top:1px solid rgba(255,255,255,0.06)">${e.emoji || '🎪'}</td>
      <td style="padding:0.55rem 0.75rem;vertical-align:top;border-top:1px solid rgba(255,255,255,0.06)">
        <a href="${escHtml(e.url || worldUrl)}" style="color:#fff;font-weight:700;font-size:0.92rem;text-decoration:none">${escHtml(e.name || '')}</a><br>
        <span style="color:#94a3b8;font-size:0.82rem">${escHtml(e.loc || '')}</span>
      </td>
      <td style="padding:0.55rem 0.75rem;vertical-align:top;text-align:right;white-space:nowrap;border-top:1px solid rgba(255,255,255,0.06)">
        <span style="color:#f59e0b;font-weight:700;font-size:0.82rem">${escHtml(e.when || '')}</span>
      </td>
    </tr>`;

  const stationRows   = stations.map(x => Array.isArray(x) ? stationRow(x[0], x[1], x[2])
                                                           : stationRow(x.emoji || '📻', x.name || '', x.desc || '')).join('');
  const showRows      = shows.map(showRow).join('');
  const magazineRows  = magazine.map(a => articleRow(a, magUrl)).join('');
  const festivalRows  = festivals.map(a => articleRow(a, worldUrl)).join('');
  const interviewRows = interviews.map(a => articleRow(a, magUrl)).join('');
  const releaseRows   = releases.map(a => articleRow(a, magUrl)).join('');
  const eventRows     = events.map(eventRow).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f1a;font-family:'Inter',Arial,sans-serif">
  <div style="max-width:560px;margin:2rem auto;background:#1a1a2e;border-radius:16px;overflow:hidden;border:1px solid rgba(124,58,237,0.3)">
    <div style="background:linear-gradient(135deg,#7c3aed,#2563eb);padding:2rem;text-align:center">
      <img src="${logoUrl}" width="76" height="76" alt="SiriusFM"
           style="display:block;margin:0 auto 0.85rem;border-radius:20px;border:0;outline:none;text-decoration:none">
      <h1 style="color:#fff;margin:0;font-size:1.75rem;font-weight:800;letter-spacing:-0.5px">Sirius<span style="color:#f59e0b">FM</span></h1>
      <p style="color:rgba(255,255,255,0.85);margin:0.4rem 0 0;font-size:0.85rem;letter-spacing:0.04em">WHAT'S COMING UP · YOUR REMINDER</p>
    </div>
    <div style="padding:2rem;color:#e2e8f0">
      <h2 style="color:#fff;margin:0 0 0.75rem;font-size:1.3rem">Hi ${escHtml(name)} — here's what's coming up 🎧</h2>
      <p style="color:#94a3b8;line-height:1.6;margin:0 0 0.85rem">This is your regular round-up from SiriusFM: the channels playing <strong style="color:#e2e8f0">right now</strong>, the <strong style="color:#e2e8f0">radio shows</strong> lined up this week, <strong style="color:#e2e8f0">new releases</strong>, <strong style="color:#e2e8f0">fresh stories and interviews</strong> in the magazine, and the <strong style="color:#e2e8f0">festivals, events and parties</strong> coming next.</p>
      <p style="color:#94a3b8;line-height:1.6;margin:0 0 1.25rem">Everything below is one tap away at <a href="${base}" style="color:#c4b5fd;font-weight:700;text-decoration:none">${displayUrl}</a> — the radio starts instantly, no account needed.</p>

      <div style="text-align:center;margin:0 0 0.65rem">
        <a href="${base}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#2563eb);color:#fff;text-decoration:none;padding:0.95rem 2.25rem;border-radius:8px;font-weight:800;font-size:1.05rem">▶ Open SiriusFM</a>
      </div>
      <p style="color:#64748b;font-size:0.82rem;text-align:center;margin:0 0 0.5rem">or paste this into your browser: <a href="${base}" style="color:#7c3aed;text-decoration:none">${base}</a></p>

      ${section('🔴 Playing right now', 'Pick a channel and it starts instantly — no account needed.', stationRows, 'Open the radio →', radioUrl, '#4ade80')}
      ${section('📅 Radio shows coming up', 'Your weekly programme — hosted shows on the SiriusFM schedule.', showRows, 'See the full schedule →', showsUrl, '#7dd3fc')}
      ${section('💿 New releases', 'Albums, EPs and tracks we\'re featuring right now.', releaseRows, 'Read the magazine →', magUrl, '#4ade80')}
      ${section('📰 New in the magazine', 'Fresh releases, scene reports and label news, updated twice a day.', magazineRows, 'Read the magazine →', magUrl, '#60a5fa')}
      ${section('🎤 New interviews', 'Artists in their own words, straight from the magazine.', interviewRows, 'Read the magazine →', magUrl, '#c4b5fd')}
      ${section('🎪 Festival &amp; party news', 'The latest line-ups, tickets and programme news from the scene.', festivalRows, 'See all festivals →', worldUrl, '#f59e0b')}
      ${section('🎟️ Events &amp; parties on the calendar', 'Dates coming up — festivals and club nights we\'re following.', eventRows, 'Open All Over The World →', worldUrl, '#f472b6')}
    </div>
    <div style="padding:1.5rem 2rem;border-top:1px solid rgba(255,255,255,0.08);text-align:center">
      <p style="color:#94a3b8;font-size:0.9rem;margin:0 0 0.35rem">Best,<br><strong style="color:#fff">SiriusFM</strong></p>
      <p style="margin:0 0 1rem"><a href="${base}" style="color:#7c3aed;font-size:0.85rem;text-decoration:none">${displayUrl}</a></p>
      <p style="color:#64748b;font-size:0.78rem;line-height:1.5;margin:0 0 0.75rem">You're getting this reminder because you have a SiriusFM account. Don't want these anymore?</p>
      <div style="margin:0 0 1rem">
        <a href="${unsubUrl}" style="display:inline-block;background:transparent;color:#94a3b8;text-decoration:none;padding:0.5rem 1.4rem;border-radius:8px;font-weight:600;font-size:0.85rem;border:1px solid rgba(255,255,255,0.18)">Unsubscribe from reminders</a>
      </div>
      <p style="color:#475569;font-size:0.75rem;margin:0">© ${new Date().getFullYear()} SiriusFM</p>
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
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f1a;font-family:'Inter',Arial,sans-serif">
  <div style="max-width:620px;margin:2rem auto;background:#1a1a2e;border-radius:16px;overflow:hidden;border:1px solid rgba(239,68,68,0.35)">
    <div style="background:linear-gradient(135deg,#ef4444,#7c3aed);padding:1.5rem 2rem;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:1.4rem;font-weight:800;letter-spacing:-0.5px">🐛 Bug report — Sirius<span style="color:#fde68a">FM</span></h1>
    </div>
    <div style="padding:1.75rem 2rem;color:#e2e8f0">
      <p style="color:#94a3b8;line-height:1.6;margin:0 0 1rem">A user hit an error on the site. The details were captured automatically:</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid rgba(255,255,255,0.08);border-radius:10px;overflow:hidden">
        ${row('Error message', info.errorMessage)}
        ${row('Route', info.route)}
        ${row('Source', [info.source, info.line && `:${info.line}`, info.col && `:${info.col}`].filter(Boolean).join(''))}
        ${row('User', info.username ? '@' + info.username : 'not logged in')}
        ${row('Time', info.time)}
        ${row('Browser', info.userAgent)}
      </table>
      ${stack}
    </div>
    <div style="padding:1rem 2rem;border-top:1px solid rgba(255,255,255,0.08);text-align:center">
      <p style="color:#475569;font-size:0.75rem;margin:0">Automatic alert from SiriusFM · © ${new Date().getFullYear()}</p>
    </div>
  </div>
</body>
</html>`;
}

function copyrightReportHtml(info) {
  const row = (label, value) =>
    `<tr>
      <td style="padding:0.45rem 0.75rem;color:#94a3b8;font-size:0.85rem;vertical-align:top;white-space:nowrap;border-top:1px solid rgba(255,255,255,0.06)">${label}</td>
      <td style="padding:0.45rem 0.75rem;color:#e2e8f0;font-size:0.85rem;vertical-align:top;border-top:1px solid rgba(255,255,255,0.06);word-break:break-word">${escHtml(value || '—')}</td>
    </tr>`;
  const urlCell = info.originalUrl
    ? `<a href="${escHtml(info.originalUrl)}" style="color:#c4b5fd;word-break:break-all">${escHtml(info.originalUrl)}</a>`
    : '—';
  const details = info.details
    ? `<pre style="margin:0.75rem 0 0;padding:0.9rem;background:#0f0f1a;border:1px solid rgba(255,255,255,0.08);border-radius:8px;color:#cbd5e1;font-size:0.82rem;line-height:1.5;white-space:pre-wrap;word-break:break-word;overflow:auto">${escHtml(String(info.details).slice(0, 4000))}</pre>`
    : '';
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f1a;font-family:'Inter',Arial,sans-serif">
  <div style="max-width:620px;margin:2rem auto;background:#1a1a2e;border-radius:16px;overflow:hidden;border:1px solid rgba(245,158,11,0.4)">
    <div style="background:linear-gradient(135deg,#f59e0b,#7c3aed);padding:1.5rem 2rem;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:1.4rem;font-weight:800;letter-spacing:-0.5px">⚠️ Copyright report — Sirius<span style="color:#fde68a">FM</span></h1>
    </div>
    <div style="padding:1.75rem 2rem;color:#e2e8f0">
      <p style="color:#94a3b8;line-height:1.6;margin:0 0 1rem">A user reported a track for possible copyright infringement (stolen / already-released material):</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid rgba(255,255,255,0.08);border-radius:10px;overflow:hidden">
        ${row('Track', info.trackTitle)}
        ${row('Stated artist', info.trackArtist)}
        ${row('Track ID', info.trackId)}
        ${row('Uploaded by', info.profileUsername ? '@' + info.profileUsername : '—')}
        ${row('Reason', info.reason)}
        <tr>
          <td style="padding:0.45rem 0.75rem;color:#94a3b8;font-size:0.85rem;vertical-align:top;white-space:nowrap;border-top:1px solid rgba(255,255,255,0.06)">Original / lenke</td>
          <td style="padding:0.45rem 0.75rem;font-size:0.85rem;vertical-align:top;border-top:1px solid rgba(255,255,255,0.06);word-break:break-word">${urlCell}</td>
        </tr>
        ${row('Reported by', info.reporter ? '@' + info.reporter : 'anonymous / not logged in')}
        ${row('Route', info.route)}
        ${row('Time', info.time)}
      </table>
      ${details}
    </div>
    <div style="padding:1rem 2rem;border-top:1px solid rgba(255,255,255,0.08);text-align:center">
      <p style="color:#475569;font-size:0.75rem;margin:0">Copyright report from SiriusFM · © ${new Date().getFullYear()}</p>
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
    return res.status(503).json({ error: 'Email is not configured on the server' });
  }

  const { type, toEmail, toName, token, fromName, fromUsername, inboxUrl, plan, orderRef } = req.body || {};
  if (!type) {
    return res.status(400).json({ error: 'Missing type' });
  }

  const siteUrl = (process.env.SITE_URL || CANONICAL_URL).replace(/\/$/, '');
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'SiriusFM <onboarding@resend.dev>';
  const resend = new Resend(process.env.RESEND_API_KEY);

  // Bygg emne + HTML basert på type. `to` kan overstyrast per type (t.d. bug-rapport
  // går alltid til teamet, aldri til ei klient-oppgitt adresse).
  let subject, html, to = toEmail;

  // Bug-rapport: mottakar vert sett på serveren — klienten kan IKKJE velje adresse.
  if (type === 'bug_report') {
    const b = req.body || {};
    to = process.env.BUG_REPORT_EMAIL || 'post@siriusfm.no';
    subject = `🐛 Bug report — SiriusFM${b.route ? ` · ${String(b.route).slice(0, 60)}` : ''}`;
    html = bugReportHtml({
      errorMessage: b.errorMessage, errorStack: b.errorStack, source: b.source,
      line: b.line, col: b.col, route: b.route, username: b.username,
      time: b.time, userAgent: b.userAgent,
    });
  } else if (type === 'copyright_report') {
    // Rettighets-/opphavsrettsrapport fra en bruker. Mottaker settes på serveren —
    // klienten kan IKKE velge adresse (samme regel som bug-rapport).
    const b = req.body || {};
    to = process.env.COPYRIGHT_REPORT_EMAIL || process.env.BUG_REPORT_EMAIL || 'post@siriusfm.no';
    subject = `⚠️ Copyright report — SiriusFM${b.trackTitle ? ` · ${String(b.trackTitle).slice(0, 60)}` : ''}`;
    html = copyrightReportHtml({
      trackId: b.trackId, trackTitle: b.trackTitle, trackArtist: b.trackArtist,
      profileUsername: b.profileUsername, reason: b.reason, originalUrl: b.originalUrl,
      details: b.details, reporter: b.reporter, route: b.route, time: b.time,
    });
  } else if (!toEmail || !toName) {
    return res.status(400).json({ error: 'Missing required fields' });
  } else if (type === 'activation') {
    if (!token) return res.status(400).json({ error: 'Missing token' });
    subject = `Activate your SiriusFM account, ${toName}!`;
    html = activationHtml(toName, `${siteUrl}/#/activate/${token}`, siteUrl);
  } else if (type === 'reset') {
    if (!token) return res.status(400).json({ error: 'Missing token' });
    subject = 'Reset your SiriusFM password';
    html = resetHtml(toName, `${siteUrl}/#/reset/${token}`);
  } else if (type === 'friend_request') {
    if (!fromName || !fromUsername) return res.status(400).json({ error: 'Missing sender info' });
    subject = `${fromName} wants to be friends with you on SiriusFM`;
    html = friendRequestHtml(toName, fromName, fromUsername, inboxUrl || `${siteUrl}/#/inbox`);
  } else if (type === 'purchase') {
    subject = 'Receipt — SiriusFM Pro is active ⭐';
    html = purchaseHtml(toName, `${siteUrl}/`, plan, orderRef);
  } else if (type === 'promo') {
    // Respekter avmelding: send ALDRI reklame til noen som har meldt seg av.
    if (await isUnsubscribed(toEmail)) {
      return res.status(200).json({ success: true, skipped: 'unsubscribed' });
    }
    // Markedsførings-/«bli medlem»-e-post. Unsubscribe-lenka bærer mottakerens e-post
    // (#/unsubscribe/<email>) så ett klikk identifiserer hvem som melder seg av; kan
    // overstyrast av klienten via unsubscribeUrl.
    subject = 'Join SiriusFM — new parties, artists & AI live ⚡';
    const unsubUrl = req.body?.unsubscribeUrl || `${siteUrl}/#/unsubscribe/${encodeURIComponent(toEmail)}`;
    html = promoHtml(toName, siteUrl, unsubUrl);
  } else if (type === 'live_now') {
    // Påminning til innlogga brukarar: kva som er live no + nye festivalar og
    // intervju. Same avmeldingsregel som reklame — send ALDRI til nokon som har
    // meldt seg av.
    if (await isUnsubscribed(toEmail)) {
      return res.status(200).json({ success: true, skipped: 'unsubscribed' });
    }
    const b = req.body || {};
    const now = new Date();
    // Innhaldet blir henta server-side frå magazine_cache, så ein cron kan sende
    // dette utan at ein nettlesar er involvert. Klienten kan overstyre om han vil.
    // Magasinet blir lese ÉIN gong og brukt både til intervju-seksjonen og til
    // «nytt i magasinet» — dei to skal ikkje vise same saka to gonger.
    // Lister klienten sender inn blir reinsa på same måte som dei serveren les
    // sjølv — elles kunne <cite …>-markup sleppe inn den vegen.
    const needsMag   = !Array.isArray(b.interviews) || !Array.isArray(b.magazine);
    const allArts    = needsMag ? await readMagazine('alle', 12) : [];
    const interviews = Array.isArray(b.interviews) ? cleanArticles(b.interviews) : pickInterviews(allArts, 3);
    const shownTitles = new Set(interviews.map(a => String(a && (a.tittel || a.title) || '')));
    const magazine   = Array.isArray(b.magazine)
      ? cleanArticles(b.magazine)
      : allArts.filter(a => !shownTitles.has(String(a.tittel || a.title || ''))).slice(0, 3);
    const festivals  = Array.isArray(b.festivals) ? cleanArticles(b.festivals) : await readMagazine('festivals', 3);
    const releases   = Array.isArray(b.releases) ? cleanArticles(b.releases) : NEW_RELEASES;
    const shows      = Array.isArray(b.shows)  ? b.shows  : upcomingShows(osloClock(now), 4);
    const events     = Array.isArray(b.events) ? b.events : upcomingEvents(now, 4);
    subject = "What's coming up on SiriusFM — new releases, shows & parties 🎧";
    const unsubUrl = b.unsubscribeUrl || `${siteUrl}/#/unsubscribe/${encodeURIComponent(toEmail)}`;
    html = liveNowHtml(toName, siteUrl, unsubUrl, {
      stations: b.stations, shows, magazine, interviews, festivals, releases, events,
    });
  } else {
    return res.status(400).json({ error: 'Unknown email type' });
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
module.exports.pickInterviews = pickInterviews;
module.exports.upcomingShows = upcomingShows;
module.exports.upcomingEvents = upcomingEvents;
module.exports.osloClock = osloClock;
