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
      if (!res.ok) throw new Error(data.error || 'Feil ved opprettelse av betaling');
      window.location.href = data.url;
    } catch (err) {
      App.toast('Betalingsfeil: ' + err.message, 'error');
      throw err;
    }
  }

  async function verifySession(sessionId) {
    const res  = await fetch(`/api/verify-session?session_id=${encodeURIComponent(sessionId)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Verifisering feilet');
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
      App.toast('Verifiserer betaling…', 'info', 5000);
      const result = await verifySession(sessionId);

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
      App.toast('Kunne ikke bekrefte betaling: ' + err.message, 'error');
    }
  }

  // Kvittering på skjerm — vises rett etter fullført betaling.
  function showReceipt(planKey, sessionId, name) {
    const box = document.getElementById('modal-box');
    if (!box || typeof App === 'undefined') return;
    const plans = App.shopPlans || [];
    const p = plans.find(x => x.key === planKey) || plans[0] || { name: 'Pro', total: '', months: 1 };
    const benefits = App.proBenefits || [];

    const fmt = d => d.toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' });
    const today = new Date();
    const next  = new Date(); next.setMonth(next.getMonth() + (p.months || 1));
    const renewWord = (p.months || 1) >= 12 ? 'hvert år' : ((p.months || 1) > 1 ? `hver ${p.months}. måned` : 'hver måned');
    const ref = sessionId ? sessionId.slice(-10).toUpperCase() : '';

    const row = (l, v, strong) => `
      <div style="display:flex;justify-content:space-between;gap:1rem;padding:0.5rem 0;font-size:0.9rem">
        <span style="color:var(--text2)">${l}</span>
        <span style="font-weight:${strong ? '800' : '600'};text-align:right">${v}</span>
      </div>`;

    box.innerHTML = `
      <div class="modal-header">
        <h2>${Icon('check-circle')} Kvittering</h2>
        <button class="btn-icon" onclick="App.closeModal()">${Icon('x')}</button>
      </div>
      <div style="padding:1.25rem 0">
        <div style="text-align:center;margin-bottom:1rem">
          <div class="receipt-star">⭐</div>
          <div style="font-weight:800;font-size:1.1rem;margin-top:0.5rem">Velkommen til Sound Core Pro!</div>
          <div style="color:var(--text2);font-size:0.85rem">Takk for kjøpet, ${name}.</div>
        </div>
        <div class="receipt-box">
          ${row('Produkt', 'Sound Core Pro')}
          ${row('Periode', p.name)}
          ${row('Kjøpsdato', fmt(today))}
          ${row('Fornyes', renewWord)}
          ${row('Neste betaling', fmt(next))}
          ${ref ? row('Ordre-ref', ref) : ''}
          <div style="border-top:1px solid rgba(255,255,255,0.1);margin:0.4rem 0"></div>
          ${row('Betalt', p.total, true)}
        </div>
        <div style="font-weight:700;margin:1.1rem 0 0.5rem">Dette har du låst opp:</div>
        <div class="receipt-benefits">
          ${benefits.map(b => `<div class="receipt-benefit">${Icon('check')} ${b}</div>`).join('')}
        </div>
        <button class="btn btn-primary w-full" style="margin-top:1.25rem" onclick="App.closeModal()">${Icon('check')} Ferdig</button>
        <p style="font-size:0.72rem;color:var(--text3);margin-top:0.75rem;text-align:center">En kopi av kvitteringen er sendt til e-posten din.</p>
      </div>`;
    App.openModal();
  }

  return { startCheckout, verifySession, handleSuccessRedirect, showReceipt };
})();
