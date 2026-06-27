// Stripe payment integration
const Payment = (() => {

  async function startCheckout(username) {
    try {
      const res = await fetch('/api/create-checkout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ username }),
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
        Auth.updateUser(current.username, {
          subscription:   'pro',
          stripeSession:  sessionId,
          stripeSubId:    result.subscriptionId || null,
          proActivatedAt: Date.now(),
        });
        Object.assign(current, { subscription: 'pro' });
        App.toast('⭐ Velkommen til Pro! Privat mixes er nå aktivert.', 'success', 6000);

        // Send kjøpsbekreftelse på e-post (best effort — blokkerer ikke UI)
        if (current.email && window.Email) {
          Email.sendPurchaseConfirmation(current.email, current.displayName || current.username)
            .catch(err => console.error('Kjøpsbekreftelse-e-post feilet:', err));
        }
      }
    } catch (err) {
      App.toast('Kunne ikke bekrefte betaling: ' + err.message, 'error');
    }
  }

  return { startCheckout, verifySession, handleSuccessRedirect };
})();
