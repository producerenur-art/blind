// Email — uses EmailJS for activation + password reset
// Requires EmailJS configured in js/config.js
const Email = (() => {

  function isConfigured() {
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

  async function sendActivation(toEmail, username, token) {
    const link = `${CONFIG.SITE_URL}index.html#/activate/${token}`;
    if (!isConfigured()) {
      // Dev fallback: show link in console and return simulated success
      console.info(`[DEV] Aktiveringslenke for ${username}:\n${link}`);
      // Automatically activate in dev mode (no email configured)
      Auth.activate(token);
      return { success: true, devMode: true };
    }
    if (!initEmailJS()) return { error: 'EmailJS ikke tilgjengelig' };
    try {
      await emailjs.send(CONFIG.EMAILJS_SERVICE_ID, CONFIG.EMAILJS_TEMPLATE_ACTIVATION, {
        to_email:    toEmail,
        to_name:     username,
        activate_url: link,
        site_name:   'ProfilVerse',
      });
      return { success: true };
    } catch (e) {
      console.error('EmailJS send error:', e);
      return { error: 'Kunne ikke sende e-post. Sjekk EmailJS-innstillingene.' };
    }
  }

  async function sendPasswordReset(toEmail, username, token) {
    const link = `${CONFIG.SITE_URL}index.html#/reset/${token}`;
    if (!isConfigured()) {
      console.info(`[DEV] Tilbakestillingslenke for ${username}:\n${link}`);
      return { success: true, devMode: true, link };
    }
    if (!initEmailJS()) return { error: 'EmailJS ikke tilgjengelig' };
    try {
      await emailjs.send(CONFIG.EMAILJS_SERVICE_ID, CONFIG.EMAILJS_TEMPLATE_RESET, {
        to_email:   toEmail,
        to_name:    username,
        reset_url:  link,
        site_name:  'ProfilVerse',
      });
      return { success: true };
    } catch (e) {
      console.error('EmailJS send error:', e);
      return { error: 'Kunne ikke sende e-post. Sjekk EmailJS-innstillingene.' };
    }
  }

  async function sendMessageNotification(toEmail, toName, fromName, fromUsername, previewText) {
    if (!isConfigured() || !CONFIG.EMAILJS_TEMPLATE_MESSAGE) return { skip: true };
    if (!initEmailJS()) return { error: 'EmailJS ikke tilgjengelig' };
    try {
      await emailjs.send(CONFIG.EMAILJS_SERVICE_ID, CONFIG.EMAILJS_TEMPLATE_MESSAGE, {
        to_email:        toEmail,
        to_name:         toName,
        from_name:       fromName,
        from_username:   fromUsername,
        message_preview: previewText.length > 150 ? previewText.substring(0, 147) + '…' : previewText,
        inbox_url:       CONFIG.SITE_URL + 'index.html#/inbox',
        site_name:       'Stellar Radio',
      });
      return { success: true };
    } catch (e) {
      console.error('EmailJS message notification error:', e);
      return { error: e?.text || 'Kunne ikke sende varsel' };
    }
  }

  async function sendTestEmail(toEmail, username) {
    if (!isConfigured()) return { error: 'EmailJS ikke konfigurert' };
    if (!initEmailJS()) return { error: 'EmailJS ikke tilgjengelig' };
    try {
      await emailjs.send(CONFIG.EMAILJS_SERVICE_ID, CONFIG.EMAILJS_TEMPLATE_ACTIVATION, {
        to_email:     toEmail,
        to_name:      username,
        activate_url: CONFIG.SITE_URL,
        site_name:    'ProfilVerse',
      });
      return { success: true };
    } catch (e) {
      console.error('EmailJS test error:', e);
      return { error: e?.text || 'Kunne ikke sende test-e-post' };
    }
  }

  return { sendActivation, sendPasswordReset, sendTestEmail, sendMessageNotification, isConfigured };
})();
