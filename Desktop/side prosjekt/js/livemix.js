// LiveMix — book et direktesendt mikse-slot (engangsbetaling, per time).
// Selvstendig: eier sin egen booking-UI + kvittering (inline-stil) så den ikke
// er avhengig av styles.css. Kun innloggede profiler kan booke.
const LiveMix = (() => {
  const RATE_KR   = 150;            // pris per time (NOK)
  const RATE_ORE  = RATE_KR * 100;  // i øre — autoritativt på serveren (api/create-checkout)
  const MAX_HOURS = 8;
  const BOOKINGS_KEY = 'liveMixBookings'; // lagres på brukerprofilen (nyeste først)

  let _hours = 1;

  function _I(name) { return (typeof Icon === 'function') ? Icon(name) : ''; }

  // Rein pris-kalkyle — testbar. Flat 150 kr/time.
  function priceFor(hours) {
    const h = Math.max(1, Math.min(MAX_HOURS, parseInt(hours, 10) || 1));
    return { hours: h, kr: h * RATE_KR, ore: h * RATE_ORE };
  }

  function _fmtDateTime(iso) {
    if (!iso) return 'Avtales senere';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso);
    return d.toLocaleString('nb-NO', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }

  function _ref(test) {
    const r = Math.random().toString(36).slice(2, 8).toUpperCase();
    return (test ? 'TEST-' : 'LM-') + r;
  }

  // Bygg eit booking-objekt (rein funksjon, ingen DOM) — testbar.
  function _makeBooking(user, { hours, slotISO, test, orderRef } = {}) {
    const p = priceFor(hours);
    return {
      id:        'bk_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      product:   'livemix',
      username:  (user && user.username) || null,
      hours:     p.hours,
      kr:        p.kr,
      slot:      slotISO || null,
      ref:       orderRef || _ref(test),
      test:      !!test,
      status:    'reservert',
      createdAt: Date.now(),
    };
  }

  // Lagre booking på brukerprofilen (nyeste først).
  function _persist(booking) {
    if (typeof Auth === 'undefined' || !Auth.current) return;
    const cur = Auth.current();
    if (!cur) return;
    const list = Array.isArray(cur[BOOKINGS_KEY]) ? cur[BOOKINGS_KEY].slice() : [];
    list.unshift(booking);
    Auth.updateUser(cur.username, { [BOOKINGS_KEY]: list });
  }

  // ── Booking-skjema ──────────────────────────────────────────────────
  function openBooking() {
    const cur = (typeof Auth !== 'undefined' && Auth.current) ? Auth.current() : null;
    if (!cur) {
      if (typeof App !== 'undefined') App.toast('Logg inn eller lag en gratis profil for å booke et mikse-slot.', 'info', 4000);
      location.hash = '#/login';
      return;
    }
    _hours = 1;
    _render(cur);
  }

  function _render(cur) {
    const box = document.getElementById('modal-box');
    if (!box || typeof App === 'undefined') return;

    // Standard start = i morgon kl. 20:00 (lokal tid) som <input type="datetime-local">-verdi.
    const start = new Date(Date.now() + 24 * 3600 * 1000);
    start.setHours(20, 0, 0, 0);
    const localISO = new Date(start.getTime() - start.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

    box.innerHTML = `
      <div class="modal-header">
        <h2>${_I('clock')} Book Live Mix-tid</h2>
        <button class="btn-icon" onclick="App.closeModal()" aria-label="Lukk">${_I('x')}</button>
      </div>
      <div style="padding:0.5rem 0 0.25rem">
        <p style="color:var(--text2);font-size:0.9rem;line-height:1.5;margin:0 0 1rem">
          Reserver et direktesendt mikse-slot der du mikser live for lytterne på Sound Core.
          Opptaket lagres automatisk på profilen din etterpå, så settet ditt lever videre.
          Du betaler kun for timene du booker — ingen abonnement, ingen binding.
        </p>

        <label for="lm-slot" style="display:block;font-weight:700;font-size:0.85rem;margin:0 0 0.35rem">Når vil du sende?</label>
        <input id="lm-slot" type="datetime-local" value="${localISO}"
          style="width:100%;box-sizing:border-box;padding:0.65rem 0.75rem;border-radius:10px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.04);color:var(--text);font-size:0.95rem;margin:0 0 1rem">

        <label style="display:block;font-weight:700;font-size:0.85rem;margin:0 0 0.35rem">Hvor mange timer?</label>
        <div style="display:flex;align-items:center;gap:0.75rem;margin:0 0 0.6rem">
          <button class="btn btn-ghost" onclick="LiveMix.step(-1)" aria-label="Færre timer" style="width:44px;height:44px;font-size:1.4rem;padding:0;line-height:1">−</button>
          <div id="lm-hours" style="font-size:1.4rem;font-weight:800;min-width:3.5rem;text-align:center">1 t</div>
          <button class="btn btn-ghost" onclick="LiveMix.step(1)" aria-label="Flere timer" style="width:44px;height:44px;font-size:1.4rem;padding:0;line-height:1">+</button>
          <div style="margin-left:auto;text-align:right">
            <div style="font-size:0.72rem;color:var(--text3)">Totalt</div>
            <div id="lm-total" style="font-size:1.4rem;font-weight:800">${RATE_KR} kr</div>
          </div>
        </div>
        <div style="font-size:0.78rem;color:var(--text3);margin:0 0 1.25rem">
          ${RATE_KR} kr per time · 1 t ${RATE_KR} kr · 2 t ${2 * RATE_KR} kr · +${RATE_KR} kr/t videre
        </div>

        <button class="btn btn-primary w-full" onclick="LiveMix.startCheckout()" style="margin-bottom:0.6rem">${_I('credit-card')} Betal med kort</button>
        <button class="btn btn-ghost w-full" onclick="LiveMix.testPurchase()">${_I('sparkles')} Test-kjøp (uten betaling)</button>
        <p style="font-size:0.72rem;color:var(--text3);margin:0.75rem 0 0;text-align:center">
          Sikker betaling via Stripe. «Test-kjøp» lager en testbooking med testkvittering — ingen ekte betaling trekkes.
        </p>
      </div>`;
    App.openModal();
    _recalc();
  }

  function step(delta) {
    _hours = Math.max(1, Math.min(MAX_HOURS, _hours + (parseInt(delta, 10) || 0)));
    _recalc();
  }

  function _recalc() {
    const p = priceFor(_hours);
    const h = document.getElementById('lm-hours');
    const t = document.getElementById('lm-total');
    if (h) h.textContent = p.hours + ' t';
    if (t) t.textContent = p.kr + ' kr';
  }

  function _slotValue() {
    const el = document.getElementById('lm-slot');
    return (el && el.value) ? el.value : null;
  }

  // ── Ekte betaling (Stripe engangsbetaling) ──────────────────────────
  async function startCheckout() {
    const cur = Auth.current();
    if (!cur) { App.toast('Logg inn for å booke.', 'error'); return; }
    const slot = _slotValue();
    const p = priceFor(_hours);
    try {
      App.toast('Sender deg til betaling…', 'info', 4000);
      const res = await fetch('/api/create-checkout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ username: cur.username, product: 'livemix', hours: p.hours, slot }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Kunne ikke opprette betaling');
      window.location.href = data.url;
    } catch (err) {
      App.toast('Betalingsfeil: ' + err.message, 'error');
    }
  }

  // ── Test-kjøp (ingen ekte betaling) ─────────────────────────────────
  function testPurchase() {
    const cur = Auth.current();
    if (!cur) { App.toast('Logg inn for å booke.', 'error'); return; }
    const booking = _makeBooking(cur, { hours: _hours, slotISO: _slotValue(), test: true });
    _persist(booking);
    showReceipt(booking, cur.displayName || cur.username);
  }

  // Fullfør etter Stripe-redirect (kalt fra payment.js handleSuccessRedirect).
  function completeFromSession(result, name) {
    const cur = (typeof Auth !== 'undefined' && Auth.current) ? Auth.current() : null;
    const booking = _makeBooking(cur || { username: result.username }, {
      hours:    result.hours,
      slotISO:  result.slot,
      test:     false,
      orderRef: result.sessionId ? String(result.sessionId).slice(-10).toUpperCase() : null,
    });
    _persist(booking);
    showReceipt(booking, name);
  }

  // ── Kvittering ──────────────────────────────────────────────────────
  function showReceipt(booking, name) {
    const box = document.getElementById('modal-box');
    if (!box || typeof App === 'undefined') return;

    const fmtDate = d => new Date(d).toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' });
    const row = (l, v, strong) => `
      <div style="display:flex;justify-content:space-between;gap:1rem;padding:0.5rem 0;font-size:0.9rem">
        <span style="color:var(--text2)">${l}</span>
        <span style="font-weight:${strong ? '800' : '600'};text-align:right">${v}</span>
      </div>`;
    const testBadge = booking.test
      ? `<div style="display:inline-block;background:rgba(245,158,11,0.15);color:#f59e0b;font-weight:800;font-size:0.68rem;letter-spacing:0.05em;padding:0.25rem 0.7rem;border-radius:999px;margin-top:0.6rem">TESTKJØP · INGEN EKTE BETALING</div>`
      : '';

    box.innerHTML = `
      <div class="modal-header">
        <h2>${_I('check-circle')} Kvittering</h2>
        <button class="btn-icon" onclick="App.closeModal()">${_I('x')}</button>
      </div>
      <div style="padding:1.25rem 0">
        <div style="text-align:center;margin-bottom:1rem">
          <div style="width:60px;height:60px;margin:0 auto;border-radius:50%;background:linear-gradient(135deg,#f59e0b,#f472b6);display:flex;align-items:center;justify-content:center;font-size:1.8rem">🎚️</div>
          <div style="font-weight:800;font-size:1.1rem;margin-top:0.5rem">Live Mix-tid booket!</div>
          <div style="color:var(--text2);font-size:0.85rem">Takk, ${name}. Opptaket lagres på profilen din etter sending.</div>
          ${testBadge}
        </div>
        <div style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:0.35rem 1.1rem">
          ${row('Produkt', 'Live Mix-tid')}
          ${row('Varighet', booking.hours + (booking.hours > 1 ? ' timer' : ' time'))}
          ${row('Sendetidspunkt', _fmtDateTime(booking.slot))}
          ${row('Kjøpsdato', fmtDate(booking.createdAt))}
          ${row('Ordre-ref', booking.ref)}
          <div style="border-top:1px solid rgba(255,255,255,0.1);margin:0.4rem 0"></div>
          ${row('Betalt', booking.kr + ' kr', true)}
        </div>
        <button class="btn btn-primary w-full" style="margin-top:1.25rem" onclick="App.closeModal()">${_I('check')} Ferdig</button>
        ${booking.test
          ? `<p style="font-size:0.72rem;color:var(--text3);margin-top:0.75rem;text-align:center">Dette var et testkjøp. Bookingen ligger nå på profilen din.</p>`
          : `<p style="font-size:0.72rem;color:var(--text3);margin-top:0.75rem;text-align:center">En kopi av kvitteringen er sendt til e-posten din.</p>`}
      </div>`;
    App.openModal();
  }

  // ── Live-kringkasting (DJ sender · lytter hører) ────────────────────
  // Bruker den delte modulen js/livebroadcast.js (WebRTC + Supabase Realtime
  // som signaling). State er modul-scopet så sendingen/lyden overlever at
  // modalen lukkes (App.closeModal() skjuler bare overlayet, tømmer ikke DOM).
  const _bc = { dj: null, ln: null, stream: null, ctx: null, analL: null, analR: null, raf: null, room: 'test', activeBooking: null, devBypass: false };

  // Finn en booking hvis tidsvindu dekker nå (10 min slingringsmonn før start).
  // Booking uten slot («avtales senere») regnes som alltid aktiv. Både betalte
  // og test-bookinger teller, så gaten kan demonstreres via Test-kjøp.
  function _activeBooking(cur) {
    const list = (cur && Array.isArray(cur[BOOKINGS_KEY])) ? cur[BOOKINGS_KEY] : [];
    const now = Date.now(), GRACE = 10 * 60 * 1000;
    for (const b of list) {
      if (!b || b.product !== 'livemix') continue;
      if (!b.slot) return b;
      const start = new Date(b.slot).getTime();
      if (isNaN(start)) continue;
      const end = start + Math.max(1, b.hours || 1) * 3600 * 1000;
      if (now >= start - GRACE && now < end) return b;
    }
    return null;
  }

  // Nærmeste kommende booking (for å fortelle brukeren når de kan sende).
  function _nextBooking(cur) {
    const list = (cur && Array.isArray(cur[BOOKINGS_KEY])) ? cur[BOOKINGS_KEY] : [];
    const now = Date.now();
    let best = null;
    for (const b of list) {
      if (!b || b.product !== 'livemix' || !b.slot) continue;
      const t = new Date(b.slot).getTime();
      if (isNaN(t) || t <= now) continue;
      if (!best || t < new Date(best.slot).getTime()) best = b;
    }
    return best;
  }

  // Offentlig gate-sjekk — gjenbrukes av den frittstående DJ-verktøy-siden
  // (tools/broadcast-cloud.html) så NØYAKTIG samme regel gjelder begge steder.
  // Returnerer { user, active, next, ok }.
  // localhost / 127.0.0.1 / file:// = utviklings-/testkontekst → forbigå gaten så
  // DJ-en kan teste lokalt uten å sette opp en booking. På ekte domener
  // (soundcoredevelopment.com) er hostname noe annet, så gaten gjelder fullt ut.
  function _isLocalDev() {
    try {
      const h = location.hostname;
      return h === 'localhost' || h === '127.0.0.1' || h === '0.0.0.0' || h === '' || /\.local$/.test(h);
    } catch (e) { return false; }
  }

  function canGoLive() {
    const cur = (typeof Auth !== 'undefined' && Auth.current) ? Auth.current() : null;
    const active = cur ? _activeBooking(cur) : null;
    const devBypass = _isLocalDev();
    return { user: cur, active, next: cur ? _nextBooking(cur) : null, devBypass, ok: !!active || devBypass };
  }

  function _esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  function _byId(id) { return document.getElementById(id); }
  function _bcLog(m) { const l = _byId('bc-log'); if (!l) return; l.textContent += '\n' + new Date().toLocaleTimeString('nb-NO') + '  ' + m; l.scrollTop = l.scrollHeight; }

  // ── DJ: gå live ─────────────────────────────────────────────────────
  function goLive() {
    if (typeof App === 'undefined') return;
    if (!window.LiveBroadcast) { App.toast('Kringkasting kunne ikke lastes (livebroadcast.js mangler).', 'error'); return; }
    // Gate: live-sending er låst til en aktiv Live Mix-tid (forbigått på localhost
    // for testing). Hvis allerede live, hopp over gaten ved re-åpning av konsollen.
    if (!_bc.dj) {
      const gate = canGoLive();
      if (!gate.ok) {
        if (!gate.user) {
          App.toast('Logg inn eller lag en gratis profil for å sende live.', 'info', 4000);
          location.hash = '#/login';
        } else {
          _renderNoBooking(gate.user);
        }
        return;
      }
      _bc.activeBooking = gate.active;                 // null ved localhost-bypass
      _bc.devBypass = gate.devBypass && !gate.active;  // vis «lokal test»-merke da
    }
    _renderDJ();
  }

  function _renderNoBooking(cur) {
    const box = _byId('modal-box'); if (!box) return;
    const next = _nextBooking(cur);
    const note = next
      ? `Din neste bookede tid: <strong>${_fmtDateTime(next.slot)}</strong> (${next.hours} ${next.hours > 1 ? 'timer' : 'time'}). Du kan gå live fra ~10 min før start.`
      : `Du har ingen kommende Live Mix-tid. Book et slot for å sende live.`;
    box.innerHTML = `
      <div class="modal-header">
        <h2>${_I('radio')} Gå live</h2>
        <button class="btn-icon" onclick="App.closeModal()" aria-label="Lukk">${_I('x')}</button>
      </div>
      <div style="padding:0.5rem 0">
        <p style="color:var(--text2);font-size:0.9rem;line-height:1.5;margin:0 0 0.75rem">
          Live-sending er låst til en <strong>aktiv Live Mix-tid</strong> — du sender i tidsrommet du har booket.
        </p>
        <div style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.25);border-radius:12px;padding:0.8rem 1rem;font-size:0.88rem;color:var(--text);margin:0 0 1rem">${note}</div>
        <button class="btn btn-primary w-full" onclick="LiveMix.openBooking()">${_I('clock')} Book mikse-slot</button>
      </div>`;
    App.openModal();
  }

  function _renderDJ() {
    const box = _byId('modal-box'); if (!box) return;
    const live = !!_bc.dj;
    const inp = 'width:100%;box-sizing:border-box;padding:0.6rem 0.7rem;border-radius:10px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.04);color:var(--text);font:inherit';
    const lbl = 'display:block;font-weight:700;font-size:0.78rem;margin:0 0 0.35rem;color:var(--text2);text-transform:uppercase;letter-spacing:0.04em';
    const meter = 'height:18px;border-radius:6px;background:rgba(0,0,0,0.35);overflow:hidden;position:relative';
    const fill = 'position:absolute;inset:0 auto 0 0;width:0%;background:linear-gradient(90deg,#22c55e,#22c55e 60%,#f59e0b 80%,#ef4444);transition:width .05s';
    box.innerHTML = `
      <div class="modal-header">
        <h2>${_I('radio')} Gå live — send settet ditt</h2>
        <button class="btn-icon" onclick="App.closeModal()" aria-label="Lukk">${_I('x')}</button>
      </div>
      <div style="padding:0.25rem 0">
        <p style="color:var(--text2);font-size:0.85rem;line-height:1.5;margin:0 0 1rem">
          Rut DJ-programmets master til en virtuell lydkabel (f.eks. BlackHole) og velg den under.
          Lytterne åpner «Hør live» med samme rom-navn. Signaling går over Supabase — funker over internett.
        </p>
        ${_bc.activeBooking
          ? `<div style="display:inline-flex;align-items:center;gap:0.4rem;font-size:0.78rem;font-weight:700;padding:0.3rem 0.7rem;border-radius:999px;background:rgba(34,197,94,0.12);color:#22c55e;margin:0 0 1rem">${_I('clock')} Aktiv tid: ${_bc.activeBooking.slot ? _fmtDateTime(_bc.activeBooking.slot) : 'avtales senere'}${_bc.activeBooking.test ? ' · TEST' : ''}</div>`
          : (_bc.devBypass ? `<div style="display:inline-flex;align-items:center;gap:0.4rem;font-size:0.78rem;font-weight:700;padding:0.3rem 0.7rem;border-radius:999px;background:rgba(245,158,11,0.14);color:var(--accent);margin:0 0 1rem">🧪 Lokal test — booking-gate forbigått</div>` : '')}
        <label style="${lbl}">Rom-navn</label>
        <input id="bc-room" value="${_esc(_bc.room || 'test')}" ${live ? 'disabled' : ''} style="${inp};margin:0 0 0.9rem">
        <label style="${lbl}">Lyd-inngang (DJ-ruting)</label>
        <div style="display:flex;gap:0.6rem;margin:0 0 1rem">
          <select id="bc-dev" ${live ? 'disabled' : ''} style="${inp};flex:1">${live ? '' : '<option>Trykk «Gi tilgang» først…</option>'}</select>
          <button class="btn btn-ghost" id="bc-perm" onclick="LiveMix.bcPerm()" ${live ? 'disabled' : ''}>Gi tilgang</button>
        </div>
        <div style="display:flex;gap:0.6rem;align-items:center;flex-wrap:wrap;margin:0 0 1.1rem">
          <button class="btn btn-primary" id="bc-go" onclick="LiveMix.bcGo()" ${live ? 'disabled' : ''}>📡 Gå live</button>
          <button class="btn" id="bc-stop" onclick="LiveMix.bcStop()" ${live ? '' : 'disabled'} style="background:#ef4444;color:#fff">■ Stopp</button>
          <span style="display:inline-flex;align-items:center;gap:0.4rem;font-size:0.8rem;font-weight:700;padding:0.25rem 0.7rem;border-radius:999px;background:rgba(255,255,255,0.06)">
            <span id="bc-dot" style="width:9px;height:9px;border-radius:50%;background:${live ? '#ef4444' : '#9aa3b2'}"></span>
            <span id="bc-status">${live ? 'LIVE — sender' : 'Inaktiv'}</span>
          </span>
        </div>
        <div style="font-size:1.5rem;font-weight:800;margin:0 0 0.75rem"><span id="bc-count">${live ? _bc.dj.listeners : 0}</span> <span style="font-size:0.85rem;font-weight:400;color:var(--text2)">lyttere koblet til</span></div>
        <div style="display:flex;justify-content:space-between;font-size:0.72rem;color:var(--text2);margin:0 0 0.2rem"><span>Sendt (L)</span><span id="bc-ldb">−∞ dB</span></div>
        <div style="${meter}"><i id="bc-lmeter" style="${fill}"></i></div>
        <div style="display:flex;justify-content:space-between;font-size:0.72rem;color:var(--text2);margin:0.5rem 0 0.2rem"><span>Sendt (R)</span><span id="bc-rdb">−∞ dB</span></div>
        <div style="${meter}"><i id="bc-rmeter" style="${fill}"></i></div>
        <div id="bc-log" style="font:12px/1.5 ui-monospace,monospace;background:rgba(0,0,0,0.3);border-radius:10px;padding:0.6rem 0.7rem;max-height:120px;overflow:auto;color:var(--text2);white-space:pre-wrap;margin-top:0.9rem">Klar.</div>
      </div>`;
    App.openModal();
    if (live && _bc.analL) _bcStartMeter();   // gjenoppta målere når konsollen åpnes på nytt
  }

  async function bcPerm() {
    try {
      const tmp = await navigator.mediaDevices.getUserMedia({ audio: true });
      tmp.getTracks().forEach(t => t.stop());
      const devs = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'audioinput');
      const sel = _byId('bc-dev'); if (!sel) return;
      sel.innerHTML = '';
      devs.forEach(d => { const o = document.createElement('option'); o.value = d.deviceId; o.textContent = d.label || ('Inngang ' + (sel.length + 1)); sel.appendChild(o); });
      const pref = devs.find(d => /blackhole|loopback|soundflower|air 192|aggregate/i.test(d.label));
      if (pref) sel.value = pref.deviceId;
      const go = _byId('bc-go'); if (go) go.disabled = false;
      _bcLog(devs.length + ' inngang(er).' + (pref ? '  Foreslår: ' + pref.label : ''));
    } catch (e) { _bcLog('FEIL tilgang: ' + e.message); }
  }

  async function bcGo() {
    try {
      const sel = _byId('bc-dev'), roomEl = _byId('bc-room');
      const room = (roomEl && roomEl.value.trim()) || 'test'; _bc.room = room;
      _bc.stream = await navigator.mediaDevices.getUserMedia({ audio: {
        deviceId: { exact: sel.value }, echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 2,
      } });
      _bc.ctx = new (window.AudioContext || window.webkitAudioContext)(); await _bc.ctx.resume();
      const src = _bc.ctx.createMediaStreamSource(_bc.stream), sp = _bc.ctx.createChannelSplitter(2);
      _bc.analL = _bc.ctx.createAnalyser(); _bc.analR = _bc.ctx.createAnalyser(); _bc.analL.fftSize = _bc.analR.fftSize = 1024;
      src.connect(sp); sp.connect(_bc.analL, 0); sp.connect(_bc.analR, 1);
      _bcStartMeter();
      _bc.dj = LiveBroadcast.broadcaster(room, _bc.stream, {
        onPeerCount: n => { const el = _byId('bc-count'); if (el) el.textContent = n; },
        onLog: _bcLog,
      });
      _bcSetLive(true);
      _bcLog('Du er LIVE i rom «' + room + '». Spill i DJ-programmet.');
    } catch (e) { _bcLog('FEIL gå live: ' + e.message); if (typeof App !== 'undefined') App.toast('Kunne ikke gå live: ' + e.message, 'error'); }
  }

  function bcStop() {
    if (_bc.raf) cancelAnimationFrame(_bc.raf); _bc.raf = null;
    if (_bc.dj) { _bc.dj.stop(); _bc.dj = null; }
    if (_bc.stream) { _bc.stream.getTracks().forEach(t => t.stop()); _bc.stream = null; }
    if (_bc.ctx) { try { _bc.ctx.close(); } catch (e) {} _bc.ctx = null; }
    _bc.analL = _bc.analR = null;
    _bcSetLive(false);
    const c = _byId('bc-count'); if (c) c.textContent = '0';
    _bcLog('Stoppet.');
  }

  function _bcSetLive(live) {
    const go = _byId('bc-go'), stop = _byId('bc-stop'), perm = _byId('bc-perm'), dev = _byId('bc-dev'), room = _byId('bc-room'), dot = _byId('bc-dot'), st = _byId('bc-status');
    if (go) go.disabled = live; if (stop) stop.disabled = !live; if (perm) perm.disabled = live;
    if (dev) dev.disabled = live; if (room) room.disabled = live;
    if (dot) dot.style.background = live ? '#ef4444' : '#9aa3b2';
    if (st) st.textContent = live ? 'LIVE — sender' : 'Inaktiv';
  }

  function _bcStartMeter() {
    if (_bc.raf) cancelAnimationFrame(_bc.raf);
    const toDb = r => r > 0 ? 20 * Math.log10(r) : -Infinity;
    const fmt = d => d === -Infinity ? '−∞ dB' : d.toFixed(1) + ' dB';
    const pct = d => d === -Infinity ? 0 : Math.max(0, Math.min(100, (d + 60) / 60 * 100));
    const bL = new Float32Array(_bc.analL.fftSize), bR = new Float32Array(_bc.analR.fftSize);
    (function loop() {
      if (!_bc.analL || !_bc.analR) { _bc.raf = null; return; }
      _bc.analL.getFloatTimeDomainData(bL); _bc.analR.getFloatTimeDomainData(bR);
      let sL = 0, sR = 0; for (let i = 0; i < bL.length; i++) { sL += bL[i] * bL[i]; sR += bR[i] * bR[i]; }
      const dL = toDb(Math.sqrt(sL / bL.length)), dR = toDb(Math.sqrt(sR / bR.length));
      const lm = _byId('bc-lmeter'), rm = _byId('bc-rmeter'), ld = _byId('bc-ldb'), rd = _byId('bc-rdb');
      if (lm) lm.style.width = pct(dL) + '%'; if (rm) rm.style.width = pct(dR) + '%';
      if (ld) ld.textContent = fmt(dL); if (rd) rd.textContent = fmt(dR);
      _bc.raf = requestAnimationFrame(loop);
    })();
  }

  // ── Lytter: hør live ────────────────────────────────────────────────
  function tuneIn() {
    if (typeof App === 'undefined') return;
    if (!window.LiveBroadcast) { App.toast('Kringkasting kunne ikke lastes (livebroadcast.js mangler).', 'error'); return; }
    _renderListener();
  }

  function _renderListener() {
    const box = _byId('modal-box'); if (!box) return;
    const joined = !!_bc.ln;
    const inp = 'width:100%;box-sizing:border-box;padding:0.7rem;border-radius:10px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.04);color:var(--text);font:inherit;text-align:center';
    box.innerHTML = `
      <div class="modal-header">
        <h2>${_I('headphones')} Hør live</h2>
        <button class="btn-icon" onclick="App.closeModal()" aria-label="Lukk">${_I('x')}</button>
      </div>
      <div style="padding:0.5rem 0;text-align:center">
        <span style="display:inline-flex;align-items:center;gap:0.45rem;font-size:0.82rem;font-weight:700;padding:0.3rem 0.8rem;border-radius:999px;background:rgba(255,255,255,0.06);margin-bottom:0.5rem">
          <span id="ln-dot" style="width:10px;height:10px;border-radius:50%;background:#9aa3b2"></span>
          <span id="ln-status">${joined ? 'Kobler til…' : 'Ikke tilkoblet'}</span>
        </span>
        <p style="color:var(--text2);font-size:0.9rem;margin:0.4rem 0 1rem">Skriv samme rom-navn som DJ-en og trykk for å høre settet live.</p>
        <input id="ln-room" value="${_esc(_bc.room || 'test')}" ${joined ? 'disabled' : ''} aria-label="Rom-navn" style="${inp};margin:0 0 0.8rem">
        <button class="btn btn-primary w-full" id="ln-join" onclick="LiveMix.tuneInJoin()" ${joined ? 'disabled' : ''}>▶︎ Hør live</button>
        <audio id="ln-audio" autoplay playsinline></audio>
        <div id="ln-info" style="font-size:0.78rem;color:var(--text3);margin-top:0.9rem"></div>
        ${joined ? `<button class="btn btn-ghost w-full" onclick="LiveMix.tuneOut()" style="margin-top:0.8rem">Koble fra</button>` : ''}
      </div>`;
    App.openModal();
  }

  function _lnStatus(t, live) {
    const s = _byId('ln-status'), d = _byId('ln-dot');
    if (s) s.textContent = t; if (d) d.style.background = live ? '#22c55e' : '#9aa3b2';
  }

  function tuneInJoin() {
    const roomEl = _byId('ln-room');
    const room = (roomEl && roomEl.value.trim()) || 'test'; _bc.room = room;
    const join = _byId('ln-join'); if (join) join.disabled = true;
    _lnStatus('Kobler til…', false);
    _bc.ln = LiveBroadcast.listener(room, {
      onState: s => {
        if (s === 'connected') _lnStatus('LIVE — hører settet', true);
        else if (s === 'dj-offline') _lnStatus('DJ-en avsluttet', false);
        else if (['failed', 'disconnected', 'closed'].includes(s)) _lnStatus('Frakoblet', false);
      },
      onTrack: stream => {
        const a = _byId('ln-audio'); if (a) { a.srcObject = stream; a.play().catch(() => {}); }
        const i = _byId('ln-info'); if (i) i.textContent = 'Lyd mottatt 🎶';
      },
      onLog: m => { const i = _byId('ln-info'); if (i) i.textContent = m; },
    });
  }

  function tuneOut() {
    if (_bc.ln) { _bc.ln.leave(); _bc.ln = null; }
    const a = _byId('ln-audio'); if (a) { try { a.pause(); } catch (e) {} a.srcObject = null; }
    _lnStatus('Frakoblet', false);
    if (typeof App !== 'undefined') App.closeModal();
  }

  return {
    openBooking, step, startCheckout, testPurchase, completeFromSession, showReceipt,
    priceFor, _makeBooking, RATE_KR, RATE_ORE,
    goLive, bcPerm, bcGo, bcStop, tuneIn, tuneInJoin, tuneOut,
    canGoLive,
  };
})();

if (typeof window !== 'undefined') window.LiveMix = LiveMix;
if (typeof module !== 'undefined' && module.exports) module.exports = LiveMix;
