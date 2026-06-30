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

  function isOptedOut(email) { const e = _norm(email); return !!e && !!_load()[e]; }
  function optOut(email) { const e = _norm(email); if (!e) return false; const m = _load(); m[e] = Date.now(); _save(m); _flagUser(e, true);  return true; }
  function optIn(email)  { const e = _norm(email); if (!e) return false; const m = _load(); delete m[e];  _save(m); _flagUser(e, false); return true; }

  // ── Visning ──────────────────────────────────────────────────────────
  function render(email) {
    const app = document.getElementById('app');
    if (!app) return;

    // E-post fra lenka, ellers den innloggede brukerens e-post.
    let target = _norm(email);
    if (!target && typeof Auth !== 'undefined' && Auth.current) {
      const u = Auth.current();
      if (u && u.email) target = _norm(u.email);
    }

    // Uten e-post: be om den (f.eks. åpnet lenka uten parameter og ikke innlogget).
    if (!target) { app.innerHTML = _formView(); _wireForm(); return; }

    optOut(target);
    app.innerHTML = _doneView(target, false);
    _wireDone(target);
  }

  function _formView() {
    return `<div class="auth-page"><div class="auth-card">
      <div style="text-align:center;font-size:3rem;margin-bottom:0.5rem">${_i('mail')}</div>
      <h2 style="font-weight:800;text-align:center;margin-bottom:0.5rem">Avmeld reklame</h2>
      <p style="color:var(--text2);line-height:1.6;text-align:center;margin-bottom:1.25rem">
        Skriv inn e-postadressen din for å melde deg av reklame- og markedsførings-e-poster.
      </p>
      <div class="form-group">
        <label class="form-label">E-postadresse</label>
        <input class="form-input" id="unsub-email" type="email" placeholder="din@epost.no" autocomplete="email">
      </div>
      <div id="unsub-error" class="form-error" style="margin-bottom:0.75rem;display:none"></div>
      <button class="btn btn-primary w-full" id="unsub-go">${_i('x')} Avmeld meg</button>
      <p style="text-align:center;margin-top:1rem"><a href="#/" style="color:var(--text3);font-size:0.85rem">Tilbake til Sound Core</a></p>
    </div></div>`;
  }

  function _wireForm() {
    const inp = document.getElementById('unsub-email');
    const err = document.getElementById('unsub-error');
    const go  = document.getElementById('unsub-go');
    const submit = () => {
      const e = _norm(inp && inp.value);
      if (!e || !e.includes('@')) {
        if (err) { err.textContent = 'Skriv inn en gyldig e-postadresse.'; err.style.display = 'block'; }
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
        <h2 style="font-weight:800;margin-bottom:0.5rem">Du er påmeldt igjen ✓</h2>
        <p style="color:var(--text2);line-height:1.6;margin-bottom:1.5rem">
          <strong>${_esc(email)}</strong> vil igjen motta nyheter, fester og tilbud fra Sound Core.
        </p>
        <button class="btn" id="unsub-redo" style="display:inline-flex">${_i('x')} Avmeld likevel</button>
        <div style="margin-top:1rem"><a href="#/" class="btn btn-primary" style="display:inline-flex">${_i('arrow-right')} Til Sound Core</a></div>
      </div></div>`;
    }
    return `<div class="auth-page"><div class="auth-card" style="text-align:center">
      <div style="font-size:3.5rem;margin-bottom:0.75rem">${_i('check-circle')}</div>
      <h2 style="font-weight:800;margin-bottom:0.5rem">Du er avmeldt 👋</h2>
      <p style="color:var(--text2);line-height:1.6;margin-bottom:0.35rem">
        <strong>${_esc(email)}</strong> vil ikke lenger motta reklame- og markedsførings-e-poster fra Sound Core.
      </p>
      <p style="color:var(--text3);font-size:0.85rem;margin-bottom:1.5rem">
        Du får fortsatt viktige konto-e-poster (aktivering, kvitteringer og passord).
      </p>
      <button class="btn btn-primary" id="unsub-undo" style="display:inline-flex">${_i('bell')} Meld på igjen</button>
      <div style="margin-top:1rem"><a href="#/" class="btn" style="display:inline-flex">${_i('arrow-left')} Til Sound Core</a></div>
    </div></div>`;
  }

  function _wireDone(email) {
    const undo = document.getElementById('unsub-undo');
    if (undo) undo.onclick = () => {
      optIn(email);
      _toast('Du er meldt på reklame igjen ✓', 'success');
      const app = document.getElementById('app');
      if (app) { app.innerHTML = _doneView(email, true); _wireResub(email); }
    };
  }

  function _wireResub(email) {
    const redo = document.getElementById('unsub-redo');
    if (redo) redo.onclick = () => {
      optOut(email);
      _toast('Du er avmeldt reklame ✓', 'success');
      const app = document.getElementById('app');
      if (app) { app.innerHTML = _doneView(email, false); _wireDone(email); }
    };
  }

  return { render, isOptedOut, optOut, optIn };
})();
window.Unsubscribe = Unsubscribe;
