// Email — prøver /api/send-email (Resend) først, deretter EmailJS, så dev-modus
const Email = (() => {

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

  async function callApi(type, toEmail, toName, token) {
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, toEmail, toName, token }),
      });
      const data = await res.json();
      if (!res.ok) return { error: data.error || 'Serverfeil' };
      return { success: true };
    } catch {
      return { error: 'Nettverksfeil mot e-postserver' };
    }
  }

  async function sendActivation(toEmail, username, token) {
    // 1) Prøv server-API (Resend)
    const apiRes = await callApi('activation', toEmail, username, token);
    if (apiRes.success) return { success: true };

    // 2) Fallback: EmailJS hvis konfigurert
    if (isEmailJSConfigured() && initEmailJS()) {
      const link = `${window.location.origin}/#/activate/${token}`;
      try {
        await emailjs.send(CONFIG.EMAILJS_SERVICE_ID, CONFIG.EMAILJS_TEMPLATE_ACTIVATION, {
          to_email:     toEmail,
          to_name:      username,
          activate_url: link,
          site_name:    'Sound Core',
        });
        return { success: true };
      } catch (e) {
        console.error('EmailJS feil:', e);
      }
    }

    // 3) Dev-modus: vis lenke i konsollen og auto-aktiver
    const link = `${window.location.origin}/#/activate/${token}`;
    console.info(`[DEV] Aktiveringslenke for ${username}:\n${link}`);
    Auth.activate(token);
    return { success: true, devMode: true };
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
          site_name: 'Sound Core',
        });
        return { success: true };
      } catch (e) {
        console.error('EmailJS feil:', e);
      }
    }

    // 3) Dev-modus
    const link = `${window.location.origin}/#/reset/${token}`;
    console.info(`[DEV] Tilbakestillingslenke for ${username}:\n${link}`);
    return { success: true, devMode: true, link };
  }

  async function sendMessageNotification(toEmail, toName, fromName, fromUsername, previewText) {
    if (!isEmailJSConfigured() || !CONFIG.EMAILJS_TEMPLATE_MESSAGE) return { skip: true };
    if (!initEmailJS()) return { error: 'EmailJS ikke tilgjengelig' };
    try {
      await emailjs.send(CONFIG.EMAILJS_SERVICE_ID, CONFIG.EMAILJS_TEMPLATE_MESSAGE, {
        to_email:        toEmail,
        to_name:         toName,
        from_name:       fromName,
        from_username:   fromUsername,
        message_preview: previewText.length > 150 ? previewText.substring(0, 147) + '…' : previewText,
        inbox_url:       window.location.origin + '/#/inbox',
        site_name:       'Sound Core',
      });
      return { success: true };
    } catch (e) {
      console.error('EmailJS meldings-feil:', e);
      return { error: e?.text || 'Kunne ikke sende varsel' };
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
      return { error: data.error || 'Feil ved sending' };
    } catch {
      return { error: 'Nettverksfeil' };
    }
  }

  async function sendTestEmail(toEmail, username) {
    const apiRes = await callApi('activation', toEmail, username, 'test-token');
    if (apiRes.success) return { success: true };
    if (!isEmailJSConfigured()) return { error: 'Verken server-e-post eller EmailJS er konfigurert' };
    if (!initEmailJS()) return { error: 'EmailJS ikke tilgjengelig' };
    try {
      await emailjs.send(CONFIG.EMAILJS_SERVICE_ID, CONFIG.EMAILJS_TEMPLATE_ACTIVATION, {
        to_email:     toEmail,
        to_name:      username,
        activate_url: window.location.origin,
        site_name:    'Sound Core',
      });
      return { success: true };
    } catch (e) {
      console.error('EmailJS test-feil:', e);
      return { error: e?.text || 'Kunne ikke sende test-e-post' };
    }
  }

  return { sendActivation, sendPasswordReset, sendFriendRequest, sendTestEmail, sendMessageNotification, isConfigured: isEmailJSConfigured };
})();
