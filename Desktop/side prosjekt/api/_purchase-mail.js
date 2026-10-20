// Delt kode (underscore = ikkje eit endepunkt): e-postar som blir sende ETTER eit kjøp, med den
// infoen kjøparen treng for å forstå kva dei skal gjere vidare på SiriusFM.
//   • hoursHtml      — kjøp av ekstra opplastingstimer (DJ-mix over 3 t): DJ-namn, kreditt, steg-for-steg
//   • songHtml       — kjøp av ein sang i marknadsplassen: kvar ein lastar han ned
//   • mixUploadedHtml — bekreftelse når eit sett over 3 t er lasta opp: DJ-namn + (valfri) sangliste
// Sendast frå serveren (api/stripe-webhook.js / api/mix-uploaded.js) slik at dei kjem fram sjølv om
// kjøparen lukkar nettlesaren, og slik at klienten ikkje kan velje mottakar.
const { Resend } = require('resend');

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function layout(kicker, inner) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0f0f1a;font-family:'Inter',Arial,sans-serif">
  <div style="max-width:560px;margin:2rem auto;background:#1a1a2e;border-radius:16px;overflow:hidden;border:1px solid rgba(124,58,237,0.3)">
    <div style="background:linear-gradient(135deg,#7c3aed,#2563eb);padding:2rem;text-align:center">
      <h1 style="color:#fff;margin:0;font-size:1.75rem;font-weight:800;letter-spacing:-0.5px">Sirius<span style="color:#f59e0b">FM</span></h1>
      <p style="color:rgba(255,255,255,0.85);margin:0.4rem 0 0;font-size:0.85rem;letter-spacing:0.04em">${esc(kicker)}</p>
    </div>
    <div style="padding:2rem;color:#e2e8f0">${inner}</div>
    <div style="padding:1rem 2rem;border-top:1px solid rgba(255,255,255,0.08);text-align:center">
      <p style="color:#475569;font-size:0.75rem;margin:0">© ${new Date().getFullYear()} SiriusFM · Questions? Just reply to this email.</p>
    </div>
  </div>
</body>
</html>`;
}

const h2 = t => `<h2 style="color:#fff;margin:0 0 0.5rem;font-size:1.25rem;text-align:center">${t}</h2>`;
const p = (t, extra = '') => `<p style="color:#94a3b8;line-height:1.6;margin:0 0 1.25rem;${extra}">${t}</p>`;
const box = rows => `<div style="background:#12121f;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:0.5rem 1.25rem;margin-bottom:1.5rem"><table style="width:100%;border-collapse:collapse">${rows}</table></div>`;
const row = (l, v, strong) => `<tr><td style="padding:0.55rem 0;color:#94a3b8;font-size:0.9rem">${l}</td><td style="padding:0.55rem 0;text-align:right;color:${strong ? '#fff' : '#e2e8f0'};font-size:0.9rem;font-weight:${strong ? '800' : '600'}">${v}</td></tr>`;
const steps = list => `<p style="color:#fff;font-weight:700;font-size:0.95rem;margin:0 0 0.5rem">What to do now:</p>
  <ol style="color:#cbd5e1;font-size:0.9rem;line-height:1.7;margin:0 0 1.5rem;padding-left:1.25rem">${list.map(s => `<li>${s}</li>`).join('')}</ol>`;
const button = (href, label) => `<div style="text-align:center;margin:0 0 1.5rem"><a href="${esc(href)}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#2563eb);color:#fff;text-decoration:none;padding:0.875rem 2rem;border-radius:8px;font-weight:700;font-size:0.95rem">${esc(label)}</a></div>`;
const kr = n => `${Math.round(Number(n) || 0).toLocaleString('en-US').replace(/,/g, ' ')} kr`;

// Kjøp av ekstra opplastingstimer (60 kr/time) — ein DJ som vil laste opp ein mix over 3 timar.
function hoursHtml({ name, djName, hours, amountKr, orderRef, siteUrl }) {
  const h = Math.max(1, parseInt(hours, 10) || 1);
  const dj = djName || name;
  return layout('RECEIPT · EXTRA UPLOAD TIME', `
    ${h2(`Thank you, ${esc(name)}!`)}
    ${p(`You now have <b style="color:#fff">${h} extra hour${h > 1 ? 's' : ''}</b> of upload time. Here is your receipt and what to do next.`, 'text-align:center')}
    ${box(
      row('DJ name', esc(dj), true) +
      row('Product', 'Extra upload time') +
      row('Extra time', `${h} hour${h > 1 ? 's' : ''} (a mix up to ${3 + h} hours)`) +
      (orderRef ? row('Order ref', esc(orderRef)) : '') +
      `<tr><td colspan="2" style="border-top:1px solid rgba(255,255,255,0.1);padding-top:0.25rem"></td></tr>` +
      row('Paid', kr(amountKr), true))}
    ${steps([
      `Log in to SiriusFM and open <b>My page</b>.`,
      `Choose <b>Upload DJ Mix</b> and pick your audio file. It can now be up to <b>${3 + h} hours</b> long.`,
      `Your mix is published under your DJ name <b style="color:#fff">${esc(dj)}</b>. You can change the name under <b>Edit profile</b>.`,
      `<b>Optional:</b> add the song names afterwards. Open the mix, choose <b>Edit</b> and write the tracklist, one song per line. Listeners can then see what you played.`,
      `The extra time covers <b>one</b> mix. It is used up when that mix is uploaded, so if you want to upload another long mix you can buy more time.`,
    ])}
    ${button(`${siteUrl}/#/minside`, 'Go to My page')}
    ${p('If the upload does not start, check that the file is shorter than your new limit and that the page stays open until it reaches 100 %.', 'font-size:0.82rem;color:#64748b;margin:0')}`);
}

// Kjøp av ein sang i marknadsplassen.
function songHtml({ name, title, artist, amountKr, orderRef, siteUrl }) {
  return layout('RECEIPT · SONG PURCHASE', `
    ${h2(`Thank you for your purchase, ${esc(name)}!`)}
    ${p('Your payment went through and the song is ready to download.', 'text-align:center')}
    ${box(
      row('Song', esc(title || 'Song'), true) +
      (artist ? row('Artist', esc(artist)) : '') +
      (orderRef ? row('Order ref', esc(orderRef)) : '') +
      `<tr><td colspan="2" style="border-top:1px solid rgba(255,255,255,0.1);padding-top:0.25rem"></td></tr>` +
      row('Paid', kr(amountKr), true))}
    ${steps([
      `Log in to SiriusFM and open <b>My page</b>.`,
      `Scroll to <b>My purchases</b> and press <b>Download</b> next to the song.`,
      `You can download it again at any time, as long as you are logged in to the account that bought it.`,
    ])}
    ${button(`${siteUrl}/#/minside`, 'Go to My purchases')}`);
}

// Bekreftelse når eit sett over 3 timar er lasta opp. DJ-namn alltid med; songliste berre om ho finst.
function mixUploadedHtml({ name, djName, title, durationText, tracklist, siteUrl }) {
  const dj = djName || name;
  const lines = (Array.isArray(tracklist) ? tracklist : String(tracklist || '').split(/\r?\n/)).map(x => String(x).trim()).filter(Boolean).slice(0, 80);
  const tl = lines.length
    ? `<p style="color:#fff;font-weight:700;font-size:0.95rem;margin:0 0 0.5rem">Tracklist</p><ol style="color:#cbd5e1;font-size:0.9rem;line-height:1.6;margin:0 0 1.5rem;padding-left:1.25rem">${lines.map(l => `<li>${esc(l)}</li>`).join('')}</ol>`
    : p('You have not added any song names yet. That is optional. Open the mix on your page, choose <b>Edit</b> and write the tracklist, one song per line.', 'font-size:0.88rem');
  return layout('YOUR SET IS UPLOADED', `
    ${h2('Your set is uploaded 🎛️')}
    ${p(`Thanks ${esc(name)}, your long mix is now on SiriusFM.`, 'text-align:center')}
    ${box(
      row('DJ name', esc(dj), true) +
      row('Set', esc(title || 'DJ mix')) +
      (durationText ? row('Length', esc(durationText)) : ''))}
    ${tl}
    ${button(`${siteUrl}/#/minside`, 'Open My page')}`);
}

// Send med Resend. Idempotency-nøkkel hindrar dobbel e-post når Stripe sender same hending på nytt.
async function send({ to, subject, html, idempotencyKey }) {
  if (!process.env.RESEND_API_KEY || !to) return { skipped: true };
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.RESEND_FROM_EMAIL || 'SiriusFM <onboarding@resend.dev>';
  const opts = idempotencyKey ? { idempotencyKey: String(idempotencyKey).slice(0, 250) } : undefined;
  const { data, error } = await resend.emails.send({ from, to, subject, html }, opts);
  if (error) throw new Error(error.message || 'Resend rejected the email');
  return { id: data && data.id };
}

module.exports = { hoursHtml, songHtml, mixUploadedHtml, send, esc };
