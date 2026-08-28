// Stripe payment integration
const Payment = (() => {

  async function startCheckout(username, plan = 'monthly') {
    try {
      const res = await fetch('/api/create-checkout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ username, plan }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error creating payment');
      window.location.href = data.url;
    } catch (err) {
      App.toast('Payment error: ' + err.message, 'error');
      throw err;
    }
  }

  // Engangskjøp: ekstra opplastingstimer for én mix over 3 t (60 kr/time).
  async function startHoursCheckout(username, hours = 1) {
    const res = await fetch('/api/create-checkout', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ username, product: 'upload-hours', hours }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error creating payment');
    window.location.href = data.url;
  }

  async function verifySession(sessionId) {
    const res  = await fetch(`/api/verify-session?session_id=${encodeURIComponent(sessionId)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Verification failed');
    return data;
  }

  async function handleSuccessRedirect() {
    const params    = new URLSearchParams(window.location.search);
    const sessionId = params.get('payment_success');
    if (!sessionId) return;

    // Clean URL
    const clean = window.location.pathname + window.location.hash;
    window.history.replaceState({}, '', clean);

    const current = Auth.current();
    if (!current) return;

    try {
      App.toast('Verifying payment…', 'info', 5000);
      const result = await verifySession(sessionId);

      // Bind betalinga til kontoen som kjøpte. Sesjons-ID-en ligg i URL-en og kan
      // gjenbrukast; utan denne sjekken kunne éin betaling oppgradert vilkårlege
      // andre kontoar berre ved å opne ?payment_success=<same id> innlogga der.
      if (result.success && result.username && result.username !== current.username) {
        App.toast('This payment belongs to another account.', 'error');
        return;
      }

      if (result.success && result.product === 'upload-hours') {
        // Engangskjøp av opplastingstimer — krediter (klient-side), ikke Pro.
        const hours  = result.hours || 1;
        const prev   = Math.max(0, current.uploadCreditSec || 0);
        const credit = prev + hours * 3600;
        Auth.updateUser(current.username, { uploadCreditSec: credit });
        current.uploadCreditSec = credit;
        App.toast(`Paid! You have received ${hours} hour${hours > 1 ? 's' : ''} of extra upload. Upload the mix again.`, 'success', 6000);
        return;
      }

      if (result.success) {
        const plan = result.plan || 'monthly';
        Auth.updateUser(current.username, {
          subscription:   'pro',
          proPlan:        plan,
          stripeSession:  sessionId,
          stripeSubId:    result.subscriptionId || null,
          proActivatedAt: Date.now(),
        });
        Object.assign(current, { subscription: 'pro', proPlan: plan });

        // Kvittering på skjerm
        showReceipt(plan, sessionId, current.displayName || current.username);

        // Send kvittering på e-post (best effort — blokkerer ikke UI)
        if (current.email && window.Email) {
          Email.sendPurchaseConfirmation(current.email, current.displayName || current.username, plan, sessionId)
            .catch(err => console.error('Kjøpsbekreftelse-e-post feilet:', err));
        }
      }
    } catch (err) {
      App.toast('Could not confirm payment: ' + err.message, 'error');
    }
  }

  // Kvittering på skjerm — vises rett etter fullført betaling.
  // Sjølvstendig (eigne data + inline-stil) så han ikkje er avhengig av app.js/styles.css.
  const RECEIPT_PLANS = {
    monthly: { name: '1 month',    total: '149 kr',   months:  1 },
    quarter: { name: '3 months',   total: '399 kr',   months:  3 },
    half:    { name: '6 months',   total: '749 kr',   months:  6 },
    year:    { name: '12 months',  total: '1 290 kr', months: 12 },
  };
  const RECEIPT_BENEFITS = [
    'DJ mixes over 3 hours (up to 20 h)',
    'Private / public visibility on mixes',
    'Pro badge on your profile',
    'Unlimited storage',
    'Priority support',
  ];

  function showReceipt(planKey, sessionId, name) {
    const box = document.getElementById('modal-box');
    if (!box || typeof App === 'undefined') return;
    const p = RECEIPT_PLANS[planKey] || RECEIPT_PLANS.monthly;

    const fmt = d => d.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
    const today = new Date();
    const next  = new Date(); next.setMonth(next.getMonth() + p.months);
    const renewWord = p.months >= 12 ? 'every year' : (p.months > 1 ? `every ${p.months} months` : 'every month');
    const ref = sessionId ? sessionId.slice(-10).toUpperCase() : '';

    const row = (l, v, strong) => `
      <div style="display:flex;justify-content:space-between;gap:1rem;padding:0.5rem 0;font-size:0.9rem">
        <span style="color:var(--text2)">${l}</span>
        <span style="font-weight:${strong ? '800' : '600'};text-align:right">${v}</span>
      </div>`;

    box.innerHTML = `
      <div class="modal-header">
        <h2>${Icon('check-circle')} Receipt</h2>
        <button class="btn-icon" onclick="App.closeModal()">${Icon('x')}</button>
      </div>
      <div style="padding:1.25rem 0">
        <div style="text-align:center;margin-bottom:1rem">
          <div style="width:60px;height:60px;margin:0 auto;border-radius:50%;background:linear-gradient(135deg,#f59e0b,#f472b6);display:flex;align-items:center;justify-content:center;font-size:1.8rem">⭐</div>
          <div style="font-weight:800;font-size:1.1rem;margin-top:0.5rem">Welcome to SiriusFM Pro!</div>
          <div style="color:var(--text2);font-size:0.85rem">Thank you for your purchase, ${name}.</div>
        </div>
        <div style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:0.35rem 1.1rem">
          ${row('Product', 'SiriusFM Pro')}
          ${row('Period', p.name)}
          ${row('Purchase date', fmt(today))}
          ${row('Renews', renewWord)}
          ${row('Next payment', fmt(next))}
          ${ref ? row('Order ref', ref) : ''}
          <div style="border-top:1px solid rgba(255,255,255,0.1);margin:0.4rem 0"></div>
          ${row('Paid', p.total, true)}
        </div>
        <div style="font-weight:700;margin:1.1rem 0 0.5rem">This is what you have unlocked:</div>
        <div style="display:flex;flex-direction:column;gap:0.35rem">
          ${RECEIPT_BENEFITS.map(b => `<div style="display:flex;align-items:center;gap:0.5rem;font-size:0.88rem;color:var(--text2)"><span style="color:#7dd3fc;font-weight:800">✓</span> ${b}</div>`).join('')}
        </div>
        <button class="btn btn-primary w-full" style="margin-top:1.25rem" onclick="App.closeModal()">${Icon('check')} Done</button>
        <p style="font-size:0.72rem;color:var(--text3);margin-top:0.75rem;text-align:center">A copy of the receipt has been sent to your email.</p>
      </div>`;
    App.openModal();
  }

  // Kanseller Pro-abonnementet. Ekte Stripe-abonnenter (har stripeSubId) stoppes
  // hos Stripe (cancel_at_period_end) så de beholder Pro ut perioden. Admin-tildelt
  // Pro uten Stripe-abonnement nedgraderes bare lokalt.
  async function cancelSubscription() {
    const current = Auth.current();
    if (!current) return;
    if (!confirm('Are you sure you want to cancel your Pro subscription?')) return;
    const subId = current.stripeSubId;
    try {
      if (subId) {
        const res = await fetch('/api/cancel-subscription', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ subscriptionId: subId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Cancellation failed');
        const endMs = data.currentPeriodEnd ? data.currentPeriodEnd * 1000 : null;
        Auth.updateUser(current.username, { proCancelPending: true, proPeriodEnd: endMs });
        Object.assign(current, { proCancelPending: true, proPeriodEnd: endMs });
        App.toast('The subscription will end at the end of the period. You keep Pro until then.', 'success', 6000);
      } else {
        // Ingen Stripe-abonnement registrert (f.eks. admin-tildelt Pro) — nedgrader lokalt.
        Auth.updateUser(current.username, { subscription: 'free', proCancelPending: false, proPeriodEnd: null });
        Object.assign(current, { subscription: 'free' });
        App.toast('Subscription ended.', 'success');
      }
      if (window.Router) Router.dispatch();
    } catch (err) {
      App.toast('Could not cancel: ' + err.message, 'error');
    }
  }

  // Angre en planlagt kansellering — behold Pro løpende.
  async function reactivateSubscription() {
    const current = Auth.current();
    if (!current) return;
    const subId = current.stripeSubId;
    if (!subId) return;
    try {
      const res = await fetch('/api/cancel-subscription', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ subscriptionId: subId, reactivate: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not resume');
      Auth.updateUser(current.username, { proCancelPending: false, proPeriodEnd: null });
      Object.assign(current, { proCancelPending: false, proPeriodEnd: null });
      App.toast('The subscription continues as normal ✓', 'success');
      if (window.Router) Router.dispatch();
    } catch (err) {
      App.toast('Could not resume: ' + err.message, 'error');
    }
  }

  return { startCheckout, startHoursCheckout, verifySession, handleSuccessRedirect, showReceipt, cancelSubscription, reactivateSubscription };
})();
