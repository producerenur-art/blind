// ProfilVerse - Konfigurasjon
// Fyll inn dine API-nøkler her (lagres sikkert i nettleseren)
const CONFIG = {
  // Anthropic Claude API for AI-funksjoner
  // Hent nøkkel fra: https://console.anthropic.com
  ANTHROPIC_API_KEY: localStorage.getItem('pv_anthropic_key') || '',

  // EmailJS for e-postsending (aktivering + glemt passord)
  // Opprett gratis konto på: https://www.emailjs.com
  EMAILJS_SERVICE_ID:  localStorage.getItem('pv_ejs_service')  || '',
  EMAILJS_TEMPLATE_ACTIVATION: localStorage.getItem('pv_ejs_tmpl_act') || '',
  EMAILJS_TEMPLATE_RESET:      localStorage.getItem('pv_ejs_tmpl_rst') || '',
  EMAILJS_TEMPLATE_MESSAGE:    localStorage.getItem('pv_ejs_tmpl_msg') || '',
  EMAILJS_PUBLIC_KEY:  localStorage.getItem('pv_ejs_pubkey')   || '',

  // Nettstedets URL (for e-postlenker)
  SITE_URL: window.location.origin + window.location.pathname.replace(/index\.html$/, ''),

  save(anthropicKey, ejsService, ejsTmplAct, ejsTmplRst, ejsTmplMsg, ejsPubKey) {
    localStorage.setItem('pv_anthropic_key',   anthropicKey);
    localStorage.setItem('pv_ejs_service',     ejsService);
    localStorage.setItem('pv_ejs_tmpl_act',    ejsTmplAct);
    localStorage.setItem('pv_ejs_tmpl_rst',    ejsTmplRst);
    localStorage.setItem('pv_ejs_tmpl_msg',    ejsTmplMsg);
    localStorage.setItem('pv_ejs_pubkey',      ejsPubKey);
    this.ANTHROPIC_API_KEY = anthropicKey;
    this.EMAILJS_SERVICE_ID = ejsService;
    this.EMAILJS_TEMPLATE_ACTIVATION = ejsTmplAct;
    this.EMAILJS_TEMPLATE_RESET = ejsTmplRst;
    this.EMAILJS_TEMPLATE_MESSAGE = ejsTmplMsg;
    this.EMAILJS_PUBLIC_KEY = ejsPubKey;
  }
};
