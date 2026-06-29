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

  return {
    openBooking, step, startCheckout, testPurchase, completeFromSession, showReceipt,
    priceFor, _makeBooking, RATE_KR, RATE_ORE,
  };
})();

if (typeof window !== 'undefined') window.LiveMix = LiveMix;
if (typeof module !== 'undefined' && module.exports) module.exports = LiveMix;
