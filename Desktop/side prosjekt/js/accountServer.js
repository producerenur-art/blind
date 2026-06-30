// AccountServer — nettleser-laget mot api/auth.js (server-side kontoer).
//
// Serveren (Supabase) er sannhetskilden for kontoer. Dette laget kaller API-et og
// speiler resultatet inn i den lokale Auth-cachen (Auth.adoptServerUser) slik at
// resten av appen — som bruker den synkrone Auth-API-en — virker uendret.
//
// Degraderer pent: hvis API-et ikke finnes (lokal fil-utvikling) eller serveren
// ikke er konfigurert (503), returneres { offline: true } så kalleren kan falle
// tilbake til den gamle, lokale localStorage-flyten.
const AccountServer = (() => {

  async function _call(action, payload) {
    try {
      const res = await fetch(`/api/auth?action=${encodeURIComponent(action)}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload || {}),
      });
      // 404 = endepunktet finnes ikke (lokal utvikling uten serverless).
      // 503 = serveren mangler Supabase-konfig. Begge → fall tilbake til lokal modus.
      if (res.status === 404 || res.status === 503) return { offline: true };
      let data = {};
      try { data = await res.json(); } catch (_) {}
      if (!res.ok) return { error: data.error || 'Serverfeil', notActivated: !!data.notActivated };
      return data;
    } catch (_) {
      // Nettverksfeil (offline / API utilgjengelig) → lokal fallback.
      return { offline: true };
    }
  }

  return {
    // Er server-kontoer i bruk i det hele tatt? (Kun en hjelpefunksjon; selve
    // avgjørelsen tas per kall via { offline }.)
    async register({ username, displayName, email, password, role }) {
      const r = await _call('register', { username, displayName, email, password, role });
      if (r.offline || r.error) return r;
      // Speil kontoen lokalt, men IKKE logg inn — bruker må aktivere via e-post.
      if (r.user) Auth.adoptServerUser(r.user, { login: false });
      return r;
    },

    async login({ usernameOrEmail, password }) {
      const r = await _call('login', { usernameOrEmail, password });
      if (r.offline || r.error) return r;
      if (r.user) Auth.adoptServerUser(r.user, { login: true });
      return r;
    },

    async activate(token) {
      const r = await _call('activate', { token });
      if (r.offline || r.error) return r;
      if (r.user) Auth.adoptServerUser(r.user, { login: true });
      return r;
    },

    async forgot(email) {
      return _call('forgot', { email });
    },

    async reset(token, password) {
      return _call('reset', { token, password });
    },

    async resend(usernameOrEmail) {
      return _call('resend', { usernameOrEmail });
    },
  };
})();

if (typeof window !== 'undefined') window.AccountServer = AccountServer;
