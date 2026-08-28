// Unsubscribe — avmeldingsside for reklame-/markedsførings-e-post (#/unsubscribe).
// «Avmeld reklame»-knappen i promo-e-posten (api/send-email.js → promoHtml) peker hit,
// helst med mottakerens e-post i lenka: #/unsubscribe/<email>. Siden registrerer en
// opt-out lokalt (localStorage) + setter et flagg på brukeren om hen er innlogget, og
// tilbyr «Meld på igjen». Konto-e-post (aktivering/kvittering/passord) påvirkes ALDRI.
const Unsubscribe = (() => {
  const KEY = 'pv_marketing_optout';   // { "<email>": <timestamp> }

  const _norm = e => String(e || '').toLowerCase().trim();
  const _esc  = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const _i    = n => (typeof Icon === 'function' ? Icon(n) : '');
  const _toast = (m, t) => { if (typeof toast === 'function') toast(m, t); };

  function _load() { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } }
  function _save(m) { try { localStorage.setItem(KEY, JSON.stringify(m)); } catch {} }

  // Speil opt-out på brukerobjektet når e-posten tilhører den innloggede brukeren,
  // slik at en framtidig server-side utsending kan respektere `marketingOptOut`.
  function _flagUser(email, val) {
    try {
      if (typeof Auth === 'undefined' || !Auth.current) return;
      const u = Auth.current();
      if (u && _norm(u.email) === _norm(email) && Auth.updateUser) {
        Auth.updateUser(u.username, { marketingOptOut: val });
      }
    } catch {}
  }

  // Speil opt-out til serveren (Supabase) så selve utsendingen respekterer den på
  // tvers av enheter. Best-effort: feiler stille (localStorage er alltid fasit lokalt,
  // og api/auth.js degraderer pent når server/kolonne mangler).
  function _serverSync(action, email) {
    try {
      if (typeof AccountServer !== 'undefined' && typeof AccountServer[action] === 'function') {
        Promise.resolve(AccountServer[action](email)).catch(() => {});
      }
    } catch {}
  }

  function isOptedOut(email) { const e = _norm(email); return !!e && !!_load()[e]; }
  function optOut(email) { const e = _norm(email); if (!e) return false; const m = _load(); m[e] = Date.now(); _save(m); _flagUser(e, true);  _serverSync('unsubscribe', e); return true; }
  function optIn(email)  { const e = _norm(email); if (!e) return false; const m = _load(); delete m[e];  _save(m); _flagUser(e, false); _serverSync('resubscribe', e); return true; }

  // ── Visning ──────────────────────────────────────────────────────────
  function render(email) {
    const app = document.getElementById('app');
    if (!app) return;

    const fromLink = !!_norm(email);   // e-posten kom frå sjølve avmeldingslenka
    // E-post fra lenka, ellers den innloggede brukerens e-post.
    let target = _norm(email);
    if (!target && typeof Auth !== 'undefined' && Auth.current) {
      const u = Auth.current();
      if (u && u.email) target = _norm(u.email);
    }

    // Uten e-post: be om den (f.eks. åpnet lenka uten parameter og ikke innlogget).
    if (!target) { app.innerHTML = _formView(); _wireForm(); return; }

    // Meld berre av automatisk når e-posten kom frå lenka. Ein innlogga brukar som
    // berre opnar sida skal IKKJE avmeldast som bivirkning av navigasjon — vis skjemaet
    // så avmeldinga blir ei eksplisitt handling.
    if (!fromLink) { app.innerHTML = _formView(); _wireForm(); return; }

    optOut(target);
    app.innerHTML = _doneView(target, false);
    _wireDone(target);
  }

  function _formView() {
    return `<div class="auth-page"><div class="auth-card">
      <div style="text-align:center;font-size:3rem;margin-bottom:0.5rem">${_i('mail')}</div>
      <h2 style="font-weight:800;text-align:center;margin-bottom:0.5rem">Unsubscribe from promotions</h2>
      <p style="color:var(--text2);line-height:1.6;text-align:center;margin-bottom:1.25rem">
        Enter your email address to unsubscribe from promotional and marketing emails.
      </p>
      <div class="form-group">
        <label class="form-label">Email address</label>
        <input class="form-input" id="unsub-email" type="email" placeholder="you@email.com" autocomplete="email">
      </div>
      <div id="unsub-error" class="form-error" style="margin-bottom:0.75rem;display:none"></div>
      <button class="btn btn-primary w-full" id="unsub-go">${_i('x')} Unsubscribe me</button>
      <p style="text-align:center;margin-top:1rem"><a href="#/" style="color:var(--text3);font-size:0.85rem">Back to SiriusFM</a></p>
    </div></div>`;
  }

  function _wireForm() {
    const inp = document.getElementById('unsub-email');
    const err = document.getElementById('unsub-error');
    const go  = document.getElementById('unsub-go');
    const submit = () => {
      const e = _norm(inp && inp.value);
      if (!e || !e.includes('@')) {
        if (err) { err.textContent = 'Enter a valid email address.'; err.style.display = 'block'; }
        return;
      }
      render(e);
    };
    if (go)  go.onclick = submit;
    if (inp) inp.addEventListener('keydown', ev => { if (ev.key === 'Enter') submit(); });
  }

  // resubscribed=false → «Du er avmeldt»; true → «Du er meldt på igjen».
  function _doneView(email, resubscribed) {
    if (resubscribed) {
      return `<div class="auth-page"><div class="auth-card" style="text-align:center">
        <div style="font-size:3.5rem;margin-bottom:0.75rem">${_i('bell')}</div>
        <h2 style="font-weight:800;margin-bottom:0.5rem">You are subscribed again ✓</h2>
        <p style="color:var(--text2);line-height:1.6;margin-bottom:1.5rem">
          <strong>${_esc(email)}</strong> will again receive news, parties and offers from SiriusFM.
        </p>
        <button class="btn" id="unsub-redo" style="display:inline-flex">${_i('x')} Unsubscribe anyway</button>
        <div style="margin-top:1rem"><a href="#/" class="btn btn-primary" style="display:inline-flex">${_i('arrow-right')} To SiriusFM</a></div>
      </div></div>`;
    }
    return `<div class="auth-page"><div class="auth-card" style="text-align:center">
      <div style="font-size:3.5rem;margin-bottom:0.75rem">${_i('check-circle')}</div>
      <h2 style="font-weight:800;margin-bottom:0.5rem">You are unsubscribed 👋</h2>
      <p style="color:var(--text2);line-height:1.6;margin-bottom:0.35rem">
        <strong>${_esc(email)}</strong> will no longer receive promotional and marketing emails from SiriusFM.
      </p>
      <p style="color:var(--text3);font-size:0.85rem;margin-bottom:1.5rem">
        You will still receive important account emails (activation, receipts and passwords).
      </p>
      <button class="btn btn-primary" id="unsub-undo" style="display:inline-flex">${_i('bell')} Subscribe again</button>
      <div style="margin-top:1rem"><a href="#/" class="btn" style="display:inline-flex">${_i('arrow-left')} To SiriusFM</a></div>
    </div></div>`;
  }

  function _wireDone(email) {
    const undo = document.getElementById('unsub-undo');
    if (undo) undo.onclick = () => {
      optIn(email);
      _toast('You are subscribed to promotions again ✓', 'success');
      const app = document.getElementById('app');
      if (app) { app.innerHTML = _doneView(email, true); _wireResub(email); }
    };
  }

  function _wireResub(email) {
    const redo = document.getElementById('unsub-redo');
    if (redo) redo.onclick = () => {
      optOut(email);
      _toast('You are unsubscribed from promotions ✓', 'success');
      const app = document.getElementById('app');
      if (app) { app.innerHTML = _doneView(email, false); _wireDone(email); }
    };
  }

  return { render, isOptedOut, optOut, optIn };
})();
window.Unsubscribe = Unsubscribe;
