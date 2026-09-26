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
  CANONICAL_URL: 'https://www.siriusfm.no',

  // Moderator-kontoer: brukernavn som kan slette HVILKET SOM HELST innlegg
  // (ikke bare sine egne). Samme klientside-tryggleiksmodell som resten av appen.
  // Legg til flere brukernavn ved behov — sammenligning er ikke-følsom for store/små.
  ADMIN_USERS: ['ADMIN'],

  // Samlet admin-e-postliste (2026-09-17): éi liste som gir ALT på éin gong —
  // eigar-broadcast utan booking (js/livemix.js/liveGuestAdmin.js/broadcastschedule.js),
  // gratis Pro-tilgang (js/auth.js Auth.current()), moderering (js/community.js/
  // livePresence.js _isAdmin) OG rediger-rett i Live-arkivet (js/liveArchive.js).
  // Legg til ein e-post → personen får alt samtidig. Samanlikning er små bokstavar/trimma.
  ADMIN_EMAILS: ['producerenur@gmail.com', 'constant8@gmail.com', 'krianter@proton.me'],
  isAdminEmail(user) {
    try { return !!user && this.ADMIN_EMAILS.includes(String(user.email || '').toLowerCase().trim()); }
    catch (_) { return false; }
  },

  // Gratis Pro-tilgang UTAN admin-rettar (2026-09-24): kontoar her får alt gratis (Pro) — men IKKJE
  // moderering, gå-live-utan-booking eller rediger-rett (det er ADMIN_EMAILS). Brukast av js/auth.js
  // Auth.current(). Samanlikning er små bokstavar/trimma, same som ADMIN_EMAILS.
  FREE_PRO_EMAILS: ['kalifer@hotmail.fr'],
  isFreeProEmail(user) {
    try { return !!user && this.FREE_PRO_EMAILS.includes(String(user.email || '').toLowerCase().trim()); }
    catch (_) { return false; }
  },

  // Klarerte gjeste-DJ-e-postar (js/liveGuest.js «Søk om å gå live»): desse hoppar
  // over eigarens godkjenning HELT AUTOMATISK, men må likevel oppgi eit konkret
  // tidspunkt (kan ikke la det stå tomt/«avtales nærmere» slik andre kan).
  // VIKTIG: dette er berre til UI (vise merke + krevje tidspunkt før innsending).
  // DEN EKTE handhevinga skjer server-sida i submit_broadcast_request() (sjå
  // supabase/migrations/0029_live_broadcast_trusted_email.sql) — legg til/fjern
  // ein e-post BÅDE her OG i den SQL-lista, ellers kjem dei aldri i utakt trygt.
  // Samanlikning er små bokstavar/trimma, same som ADMIN_EMAILS.
  TRUSTED_DJ_EMAILS: [],
  isTrustedDjEmail(user) {
    try { return !!user && this.TRUSTED_DJ_EMAILS.includes(String(user.email || '').toLowerCase().trim()); }
    catch (_) { return false; }
  },

  // Supabase Storage — deler store filer (60-min lyd, video) på tvers av ALLE brukere.
  // URL + anon-nøkkel er offentlige og trygge i frontend (beskyttes av bucket-regler).
  // service_role-nøkkelen ligger KUN i .env (brukes av api/upload-url.js), aldri her.
  // Lim inn dine verdier fra Supabase → Settings → API:
  SUPABASE_URL:      localStorage.getItem('sc_supabase_url')    || 'https://qefdyxpyjwpohsmmmksf.supabase.co',
  SUPABASE_ANON_KEY: localStorage.getItem('sc_supabase_anon')   || 'sb_publishable_JEV-NS9FGZ_KpSvQTPwlZg_LlyVy_eS',  // offentlig publishable key (trygg i frontend)
  SUPABASE_BUCKET:   localStorage.getItem('sc_supabase_bucket') || 'soundcore-media',

  // Eier-nøkkel for global "gå live"-status (js/livemix.js + supabase/migrations/0022_live_broadcast.sql).
  // MÅ være nøyaktig samme streng som `insert into live_broadcast_secret` i den migrasjonen —
  // en FAST verdi satt av deg, IKKE noe som genereres/vinnes automatisk (det var det som var
  // sikkerhetshullet før: "første som kaller funksjonen, vinner" kunne låse deg ute av din egen bryter).
  LIVE_BROADCAST_SECRET: '4e41fb896708c20de1bd6be1cef21b52ca0f43ea534d0d5e',

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
