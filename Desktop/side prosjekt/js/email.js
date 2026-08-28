// Email — prøver /api/send-email (Resend) først, deretter EmailJS, så dev-modus
const Email = (() => {

  // Berre lokal utvikling — i produksjon skal vi ALDRI vise tilbakestillings-/aktiveringslenker
  // direkte i nettlesaren (det ville la kven som helst nullstille kven som helst sitt passord).
  function isLocalhost() {
    const h = location.hostname;
    return h === 'localhost' || h === '127.0.0.1' || h === '0.0.0.0' || h === '';
  }

  function isEmailJSConfigured() {
    return !!(
      CONFIG.EMAILJS_SERVICE_ID &&
      CONFIG.EMAILJS_PUBLIC_KEY &&
      CONFIG.EMAILJS_TEMPLATE_ACTIVATION &&
      CONFIG.EMAILJS_TEMPLATE_RESET
    );
  }

  function initEmailJS() {
    if (typeof emailjs === 'undefined') return false;
    emailjs.init({ publicKey: CONFIG.EMAILJS_PUBLIC_KEY });
    return true;
  }

  async function callApi(type, toEmail, toName, token, extra = {}) {
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, toEmail, toName, token, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) return { error: data.error || 'Server error' };
      return { success: true };
    } catch {
      return { error: 'Network error contacting email server' };
    }
  }

  async function sendActivation(toEmail, username, token) {
    // 1) Prøv server-API (Resend)
    const apiRes = await callApi('activation', toEmail, username, token);
    if (apiRes.success) return { success: true };

    // 2) Fallback: EmailJS hvis konfigurert
    if (isEmailJSConfigured() && initEmailJS()) {
      // Bruk det kanoniske domenet i e-postlenka — aldri den lokale/preview-hosten.
      const base = (CONFIG.CANONICAL_URL || window.location.origin).replace(/\/$/, '');
      const link = `${base}/#/activate/${token}`;
      try {
        await emailjs.send(CONFIG.EMAILJS_SERVICE_ID, CONFIG.EMAILJS_TEMPLATE_ACTIVATION, {
          to_email:     toEmail,
          to_name:      username,
          activate_url: link,
          site_name:    'SiriusFM',
        });
        return { success: true };
      } catch (e) {
        console.error('EmailJS feil:', e);
      }
    }

    // 3) Dev-modus — KUN lokalt. I produksjon auto-aktiverer vi ALDRI stille:
    // en mislykket e-post (f.eks. Resend gratis-tier som bare når kontoeieren)
    // ville da skjult logge brukeren inn og skjule feilen. Vær ærlig.
    if (isLocalhost()) {
      const link = `${window.location.origin}/#/activate/${token}`;
      console.info(`[DEV] Aktiveringslenke for ${username}:\n${link}`);
      Auth.activate(token);
      return { success: true, devMode: true };
    }
    return { error: apiRes.error || 'Could not send activation email right now. Try again later.' };
  }

  async function sendPasswordReset(toEmail, username, token) {
    // 1) Prøv server-API (Resend)
    const apiRes = await callApi('reset', toEmail, username, token);
    if (apiRes.success) return { success: true };

    // 2) Fallback: EmailJS hvis konfigurert
    if (isEmailJSConfigured() && initEmailJS()) {
      const link = `${window.location.origin}/#/reset/${token}`;
      try {
        await emailjs.send(CONFIG.EMAILJS_SERVICE_ID, CONFIG.EMAILJS_TEMPLATE_RESET, {
          to_email:  toEmail,
          to_name:   username,
          reset_url: link,
          site_name: 'SiriusFM',
        });
        return { success: true };
      } catch (e) {
        console.error('EmailJS feil:', e);
      }
    }

    // 3) Dev-modus — KUN lokalt. I produksjon returnerer vi feil i staden for å lekke lenka.
    const link = `${window.location.origin}/#/reset/${token}`;
    if (isLocalhost()) {
      console.info(`[DEV] Tilbakestillingslenke for ${username}:\n${link}`);
      return { success: true, devMode: true, link };
    }
    return { error: apiRes.error || 'Could not send email right now. Try again later.' };
  }

  async function sendPurchaseConfirmation(toEmail, username, plan, orderRef) {
    // Kun server-API (Resend) — ingen EmailJS-mal for kjøp. Stille fallback i dev.
    const apiRes = await callApi('purchase', toEmail, username, null, { plan, orderRef });
    if (apiRes.success) return { success: true };
    console.info(`[DEV] Kjøpsbekreftelse ville blitt sendt til ${username} <${toEmail}>`);
    return { success: true, devMode: true };
  }

  async function sendPromo(toEmail, username, unsubscribeUrl) {
    // Markedsførings-/«bli medlem»-e-post (reklame). Kun server-API (Resend).
    const base = (CONFIG.CANONICAL_URL || window.location.origin).replace(/\/$/, '');
    const unsub = unsubscribeUrl || `${base}/#/unsubscribe`;
    const apiRes = await callApi('promo', toEmail, username, null, { unsubscribeUrl: unsub });
    if (apiRes.success) return { success: true };
    return { error: apiRes.error || 'Could not send promotional email right now.' };
  }

  // Påminning til ein innlogga brukar: kva som spelar akkurat no, radioprogramma
  // som kjem, nye magasinsaker og intervju, og festivalar/fester som står for tur.
  // Serveren hentar innhaldet sjølv frå magasin-cachen, så vi treng berre
  // mottakaren — alt i `extra` er valfri overstyring. Respekterer avmelding.
  async function sendLiveNow(toEmail, username, extra = {}) {
    const base = (CONFIG.CANONICAL_URL || window.location.origin).replace(/\/$/, '');
    const unsub = extra.unsubscribeUrl || `${base}/#/unsubscribe/${encodeURIComponent(toEmail)}`;
    const apiRes = await callApi('live_now', toEmail, username, null, {
      unsubscribeUrl: unsub,
      stations:   extra.stations,
      shows:      extra.shows,
      magazine:   extra.magazine,
      festivals:  extra.festivals,
      interviews: extra.interviews,
      events:     extra.events,
    });
    if (apiRes.success) return { success: true };
    return { error: apiRes.error || 'Could not send the reminder email right now.' };
  }

  async function sendMessageNotification(toEmail, toName, fromName, fromUsername, previewText) {
    if (!isEmailJSConfigured() || !CONFIG.EMAILJS_TEMPLATE_MESSAGE) return { skip: true };
    if (!initEmailJS()) return { error: 'EmailJS not available' };
    try {
      const preview = String(previewText || '');   // null-sikker — kall utan forhåndstekst skal ikkje kaste
      await emailjs.send(CONFIG.EMAILJS_SERVICE_ID, CONFIG.EMAILJS_TEMPLATE_MESSAGE, {
        to_email:        toEmail,
        to_name:         toName,
        from_name:       fromName,
        from_username:   fromUsername,
        message_preview: preview.length > 150 ? preview.substring(0, 147) + '…' : preview,
        inbox_url:       window.location.origin + '/#/inbox',
        site_name:       'SiriusFM',
      });
      return { success: true };
    } catch (e) {
      console.error('EmailJS meldings-feil:', e);
      return { error: e?.text || 'Could not send notification' };
    }
  }

  async function sendFriendRequest(toEmail, toName, fromName, fromUsername) {
    const inboxUrl = window.location.origin + '/#/inbox';
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'friend_request', toEmail, toName, fromName, fromUsername, inboxUrl }),
      });
      const data = await res.json();
      if (res.ok) return { success: true };
      return { error: data.error || 'Error sending' };
    } catch {
      return { error: 'Network error' };
    }
  }

  async function sendTestEmail(toEmail, username) {
    const apiRes = await callApi('activation', toEmail, username, 'test-token');
    if (apiRes.success) return { success: true };
    if (!isEmailJSConfigured()) return { error: 'Neither server email nor EmailJS is configured' };
    if (!initEmailJS()) return { error: 'EmailJS not available' };
    try {
      await emailjs.send(CONFIG.EMAILJS_SERVICE_ID, CONFIG.EMAILJS_TEMPLATE_ACTIVATION, {
        to_email:     toEmail,
        to_name:      username,
        activate_url: window.location.origin,
        site_name:    'SiriusFM',
      });
      return { success: true };
    } catch (e) {
      console.error('EmailJS test-feil:', e);
      return { error: e?.text || 'Could not send test email' };
    }
  }

  return { sendActivation, sendPasswordReset, sendPurchaseConfirmation, sendFriendRequest, sendTestEmail, sendMessageNotification, sendPromo, sendLiveNow, isConfigured: isEmailJSConfigured };
})();
