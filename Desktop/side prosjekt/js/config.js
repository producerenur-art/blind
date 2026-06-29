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

  // Kanonisk, offentlig domene — brukes i e-postlenker (aktivering/tilbakestilling)
  // slik at de alltid peker hit, uansett hvilken host brukeren registrerte seg fra.
  CANONICAL_URL: 'https://www.soundcoredevelopment.com',

  // Platform URLs — update these when you have real links
  PLATFORM_MOBILE_URL:   '',   // e.g. 'https://m.soundcore.app'
  PLATFORM_DESKTOP_URL:  '',   // e.g. 'https://soundcore.app'
  PLATFORM_APPSTORE_URL: '',   // e.g. 'https://apps.apple.com/app/soundcore/id...'

  // Supabase Storage — deler store filer (60-min lyd, video) på tvers av ALLE brukere.
  // URL + anon-nøkkel er offentlige og trygge i frontend (beskyttes av bucket-regler).
  // service_role-nøkkelen ligger KUN i .env (brukes av api/upload-url.js), aldri her.
  // Lim inn dine verdier fra Supabase → Settings → API:
  SUPABASE_URL:      localStorage.getItem('sc_supabase_url')    || 'https://qefdyxpyjwpohsmmmksf.supabase.co',
  SUPABASE_ANON_KEY: localStorage.getItem('sc_supabase_anon')   || 'sb_publishable_JEV-NS9FGZ_KpSvQTPwlZg_LlyVy_eS',  // offentlig publishable key (trygg i frontend)
  SUPABASE_BUCKET:   localStorage.getItem('sc_supabase_bucket') || 'soundcore-media',

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

// Top-level `const` does NOT attach to window in classic scripts — expose it
// explicitly so modules like js/storage.js can read CONFIG via window.CONFIG.
window.CONFIG = CONFIG;
