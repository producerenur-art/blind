/* ═══════════════════════════════════════════════
   BugHelp — global feilfangar for Sound Core.
   Fangar uventa JS-feil (window error + unhandledrejection), viser eit vennleg
   varsel nede til venstre, og lèt brukaren anten spørje Core (AI) om hjelp eller
   rapportere feilen til teamet (e-post via /api/send-email type=bug_report).
   Sjølvstendig modul — kastar aldri sjølv, og spammar aldri brukaren.
   ═══════════════════════════════════════════════ */
const BugHelp = (() => {
  const MAX_NOTICES = 4;          // ikkje mas — maks så mange varsel per økt
  const seen  = new Set();        // dedupe på signatur
  let   count = 0;
  let   currentToast = null;

  // ── Språk (same kjelder som AI-assistenten) ──────────────────────────
  function langCode() {
    try {
      return localStorage.getItem('ai_assistant_lang')
          || localStorage.getItem('stellar-lang')
          || 'no';
    } catch { return 'no'; }
  }
  // Enkel to-språks-tekst: engelsk for 'en', elles norsk (assistenten tek resten på chat).
  function t(no, en) { return langCode() === 'en' ? en : no; }

  // ── Støy vi med vilje ignorerer ──────────────────────────────────────
  const NOISE = [
    /^Script error\.?$/i,                 // kryss-origin (ingen detaljar uansett)
    /ResizeObserver loop/i,               // ufarleg nettlesar-støy
    /Non-Error promise rejection captured/i,
    /Load failed$/i,                       // avbrotne fetch (ofte navigasjon)
  ];
  function isNoise(msg) { return !msg || NOISE.some(re => re.test(msg)); }

  function signature(c) { return `${c.message}|${c.source}|${c.line}`; }

  // ── Bygg full kontekst rundt ein feil ────────────────────────────────
  function buildContext(info) {
    let username = null;
    try {
      const u = (typeof Auth !== 'undefined' && Auth.current && Auth.current()) || null;
      username = u ? u.username : null;
    } catch {}
    return {
      message:   (info.message || 'Ukjent feil').slice(0, 500),
      stack:     (info.stack || '').slice(0, 4000),
      source:    info.source || '',
      line:      info.line || '',
      col:       info.col || '',
      route:     location.hash || '#/',
      userAgent: navigator.userAgent,
      username,
      time:      new Date().toISOString(),
    };
  }

  // ── Hovudinngang: ein feil kom inn ───────────────────────────────────
  function capture(info) {
    try {
      if (isNoise(info && info.message)) return;
      const ctx = buildContext(info);
      const sig = signature(ctx);
      if (seen.has(sig)) return;       // alt handtert denne økta
      seen.add(sig);
      if (count >= MAX_NOTICES) return;
      count++;
      showToast(ctx);
    } catch { /* feilfangaren skal aldri sjølv kræsje sida */ }
  }

  // ── Varsel-UI ────────────────────────────────────────────────────────
  function showToast(ctx) {
    if (currentToast) { try { currentToast.remove(); } catch {} }

    const el = document.createElement('div');
    el.className = 'bug-toast';
    el.setAttribute('role', 'alert');
    el.innerHTML = `
      <button class="bug-toast-x" title="${t('Lukk', 'Dismiss')}" aria-label="${t('Lukk', 'Dismiss')}">×</button>
      <div class="bug-toast-head">
        <span class="bug-toast-ico">⚠️</span>
        <strong>${t('Noko gjekk gale', 'Something went wrong')}</strong>
      </div>
      <p class="bug-toast-msg">${t('Core kan hjelpe deg vidare — eller du kan sende feilen til teamet.',
                                   'Core can help you out — or you can send the error to the team.')}</p>
      <div class="bug-toast-actions">
        <button class="bug-toast-btn bug-toast-btn--ai">${t('Spør Core', 'Ask Core')}</button>
        <button class="bug-toast-btn bug-toast-btn--report">${t('Rapporter feil', 'Report bug')}</button>
      </div>`;

    const close = () => { try { el.classList.add('bug-toast--out'); } catch {}
                          setTimeout(() => { try { el.remove(); } catch {} }, 220);
                          if (currentToast === el) currentToast = null; };

    el.querySelector('.bug-toast-x').addEventListener('click', close);

    // «Spør Core» — opnar AI-assistenten med feilen som kontekst
    el.querySelector('.bug-toast-btn--ai').addEventListener('click', () => {
      try {
        if (typeof Assistant !== 'undefined' && Assistant.openWithBug) Assistant.openWithBug(ctx);
        else if (typeof Assistant !== 'undefined' && Assistant.open)   Assistant.open();
      } catch {}
      close();
    });

    // «Rapporter feil» — send detaljane til teamet
    el.querySelector('.bug-toast-btn--report').addEventListener('click', (e) => {
      report(ctx, e.currentTarget, el);
    });

    document.body.appendChild(el);
    currentToast = el;
    requestAnimationFrame(() => el.classList.add('bug-toast--in'));

    // Auto-forsvinn etter ei stund om brukaren ikkje gjer noko
    setTimeout(() => { if (currentToast === el) close(); }, 14000);
  }

  // ── Rapporter til teamet via Resend-proxyen ──────────────────────────
  async function report(ctx, btn, toastEl) {
    if (btn) {
      btn.disabled = true;
      btn.textContent = t('Sender…', 'Sending…');
    }
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type:         'bug_report',
          errorMessage: ctx.message,
          errorStack:   ctx.stack,
          source:       ctx.source,
          line:         ctx.line,
          col:          ctx.col,
          route:        ctx.route,
          userAgent:    ctx.userAgent,
          username:     ctx.username,
          time:         ctx.time,
        }),
      });
      const ok = res.ok;
      if (btn) {
        btn.textContent = ok ? t('Takk! Sendt ✓', 'Thanks! Sent ✓')
                             : t('Kunne ikkje sende', "Couldn't send");
        btn.classList.toggle('bug-toast-btn--done', ok);
      }
      // Bekreftelse via den vanlege toast-en om appen er klar
      try {
        if (typeof App !== 'undefined' && App.toast) {
          App.toast(ok ? t('Takk! Feilen er sendt til teamet.', 'Thanks! The error was sent to the team.')
                       : t('Klarte ikkje sende rapporten. Prøv igjen seinare.', "Couldn't send the report. Try again later."),
                    ok ? 'success' : 'error');
        }
      } catch {}
      if (ok && toastEl) setTimeout(() => { try { toastEl.remove(); } catch {} ; if (currentToast === toastEl) currentToast = null; }, 1800);
    } catch {
      if (btn) { btn.disabled = false; btn.textContent = t('Prøv igjen', 'Try again'); }
    }
  }

  // ── Installer globale lyttarar ───────────────────────────────────────
  function install() {
    // Køyretidsfeil i scriptkode (utan capture → unngår støyande ressurs-feil)
    window.addEventListener('error', (e) => {
      capture({
        message: e.message,
        source:  e.filename,
        line:    e.lineno,
        col:     e.colno,
        stack:   e.error && e.error.stack,
      });
    });
    // Uhandterte promise-avvisingar
    window.addEventListener('unhandledrejection', (e) => {
      const r = e.reason;
      capture({
        message: (r && (r.message || (typeof r === 'string' ? r : ''))) || 'Unhandled promise rejection',
        stack:   r && r.stack,
      });
    });
  }

  install();

  // Offentleg API — `capture`/`report` kan òg kallast manuelt ved behov
  return { capture, report, _context: buildContext };
})();
