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
    if (!iso) return 'To be scheduled';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso);
    return d.toLocaleString('en-US', {
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
      if (typeof App !== 'undefined') App.toast('Log in or create a free profile to book a mix slot.', 'info', 4000);
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
        <h2>${_I('clock')} Book Live Mix Time</h2>
        <button class="btn-icon" onclick="App.closeModal()" aria-label="Close">${_I('x')}</button>
      </div>
      <div style="padding:0.5rem 0 0.25rem">
        <p style="color:var(--text2);font-size:0.9rem;line-height:1.5;margin:0 0 1rem">
          Reserve a live-streamed mix slot where you mix live for Sound Core's listeners.
          The recording is automatically saved to your profile afterward, so your set lives on.
          You only pay for the hours you book — no subscription, no commitment.
        </p>

        <label for="lm-slot" style="display:block;font-weight:700;font-size:0.85rem;margin:0 0 0.35rem">When do you want to broadcast?</label>
        <input id="lm-slot" type="datetime-local" value="${localISO}"
          style="width:100%;box-sizing:border-box;padding:0.65rem 0.75rem;border-radius:10px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.04);color:var(--text);font-size:0.95rem;margin:0 0 1rem">

        <label style="display:block;font-weight:700;font-size:0.85rem;margin:0 0 0.35rem">How many hours?</label>
        <div style="display:flex;align-items:center;gap:0.75rem;margin:0 0 0.6rem">
          <button class="btn btn-ghost" onclick="LiveMix.step(-1)" aria-label="Fewer hours" style="width:44px;height:44px;font-size:1.4rem;padding:0;line-height:1">−</button>
          <div id="lm-hours" style="font-size:1.4rem;font-weight:800;min-width:3.5rem;text-align:center">1 hr</div>
          <button class="btn btn-ghost" onclick="LiveMix.step(1)" aria-label="More hours" style="width:44px;height:44px;font-size:1.4rem;padding:0;line-height:1">+</button>
          <div style="margin-left:auto;text-align:right">
            <div style="font-size:0.72rem;color:var(--text3)">Total</div>
            <div id="lm-total" style="font-size:1.4rem;font-weight:800">${RATE_KR} kr</div>
          </div>
        </div>
        <div style="font-size:0.78rem;color:var(--text3);margin:0 0 1.25rem">
          ${RATE_KR} kr per hour · 1 hr ${RATE_KR} kr · 2 hr ${2 * RATE_KR} kr · +${RATE_KR} kr/hr after
        </div>

        <button class="btn btn-primary w-full" onclick="LiveMix.startCheckout()" style="margin-bottom:0.6rem">${_I('credit-card')} Pay by card</button>
        <button class="btn btn-ghost w-full" onclick="LiveMix.testPurchase()">${_I('sparkles')} Test purchase (no payment)</button>
        <p style="font-size:0.72rem;color:var(--text3);margin:0.75rem 0 0;text-align:center">
          Secure payment via Stripe. "Test purchase" creates a test booking with a test receipt — no real payment is charged.
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
    if (h) h.textContent = p.hours + ' hr';
    if (t) t.textContent = p.kr + ' kr';
  }

  function _slotValue() {
    const el = document.getElementById('lm-slot');
    return (el && el.value) ? el.value : null;
  }

  // ── Ekte betaling (Stripe engangsbetaling) ──────────────────────────
  async function startCheckout() {
    const cur = Auth.current();
    if (!cur) { App.toast('Log in to book.', 'error'); return; }
    const slot = _slotValue();
    const p = priceFor(_hours);
    try {
      App.toast('Sending you to checkout…', 'info', 4000);
      const res = await fetch('/api/create-checkout', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ username: cur.username, product: 'livemix', hours: p.hours, slot }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not create payment');
      window.location.href = data.url;
    } catch (err) {
      App.toast('Payment error: ' + err.message, 'error');
    }
  }

  // ── Test-kjøp (ingen ekte betaling) ─────────────────────────────────
  function testPurchase() {
    const cur = Auth.current();
    if (!cur) { App.toast('Log in to book.', 'error'); return; }
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

    const fmtDate = d => new Date(d).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
    const row = (l, v, strong) => `
      <div style="display:flex;justify-content:space-between;gap:1rem;padding:0.5rem 0;font-size:0.9rem">
        <span style="color:var(--text2)">${l}</span>
        <span style="font-weight:${strong ? '800' : '600'};text-align:right">${v}</span>
      </div>`;
    const testBadge = booking.test
      ? `<div style="display:inline-block;background:rgba(245,158,11,0.15);color:#f59e0b;font-weight:800;font-size:0.68rem;letter-spacing:0.05em;padding:0.25rem 0.7rem;border-radius:999px;margin-top:0.6rem">TEST PURCHASE · NO REAL PAYMENT</div>`
      : '';

    box.innerHTML = `
      <div class="modal-header">
        <h2>${_I('check-circle')} Receipt</h2>
        <button class="btn-icon" onclick="App.closeModal()">${_I('x')}</button>
      </div>
      <div style="padding:1.25rem 0">
        <div style="text-align:center;margin-bottom:1rem">
          <div style="width:60px;height:60px;margin:0 auto;border-radius:50%;background:linear-gradient(135deg,#f59e0b,#f472b6);display:flex;align-items:center;justify-content:center;font-size:1.8rem">🎚️</div>
          <div style="font-weight:800;font-size:1.1rem;margin-top:0.5rem">Live Mix time booked!</div>
          <div style="color:var(--text2);font-size:0.85rem">Thanks, ${name}. The recording will be saved to your profile after the broadcast.</div>
          ${testBadge}
        </div>
        <div style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:0.35rem 1.1rem">
          ${row('Product', 'Live Mix time')}
          ${row('Duration', booking.hours + (booking.hours > 1 ? ' hours' : ' hour'))}
          ${row('Broadcast time', _fmtDateTime(booking.slot))}
          ${row('Purchase date', fmtDate(booking.createdAt))}
          ${row('Order ref', booking.ref)}
          <div style="border-top:1px solid rgba(255,255,255,0.1);margin:0.4rem 0"></div>
          ${row('Paid', booking.kr + ' kr', true)}
        </div>
        <button class="btn btn-primary w-full" style="margin-top:1.25rem" onclick="App.closeModal()">${_I('check')} Done</button>
        ${booking.test
          ? `<p style="font-size:0.72rem;color:var(--text3);margin-top:0.75rem;text-align:center">This was a test purchase. The booking is now on your profile.</p>`
          : `<p style="font-size:0.72rem;color:var(--text3);margin-top:0.75rem;text-align:center">A copy of the receipt has been sent to your email.</p>`}
      </div>`;
    App.openModal();
  }

  // ── Live-kringkasting (DJ sender · lytter hører) ────────────────────
  // Bruker den delte modulen js/livebroadcast.js (WebRTC + Supabase Realtime
  // som signaling). State er modul-scopet så sendingen/lyden overlever at
  // modalen lukkes (App.closeModal() skjuler bare overlayet, tømmer ikke DOM).
  const _bc = { dj: null, ln: null, stream: null, ctx: null, analL: null, analR: null, raf: null, room: 'test', activeBooking: null, devBypass: false, ownerBypass: false,
    visual: 'image', coverUrl: '', coverImg: null, canvas: null, canvasRaf: null, camStream: null, outStream: null, presenterName: '', trackTitle: '', linkUrl: '', heartbeatTimer: null,
    listening: false, ended: false, permGranted: false };
  let _lnReconnecting = false;

  // ── Global "gå live"-status (auto-switchover for ALLE besøkende) ──────
  // Skriving er RPC-gata bak ein FAST eigar-hemmelegheit, sett i
  // supabase/migrations/0022_live_broadcast.sql sin egen INSERT (IKKJE
  // adoptert frå fyrste kall — det var eit reelt sikkerheitshól: sidan denne
  // eine globale raden styrer lyden til ALLE besøkande, kunne ein tilfeldig
  // besøkande ha kalla funksjonen FØR eigaren og låst eigaren ute permanent).
  // MÅ vere nøyaktig lik CONFIG.LIVE_BROADCAST_SECRET.
  function _liveSecret() {
    return (typeof CONFIG !== 'undefined' && CONFIG.LIVE_BROADCAST_SECRET) || '';
  }

  // Fire-and-forget: publiser/avpubliser den globale live-statusen som
  // js/liveGlobal.js les/abonnerer på for å bytte over ALLE besøkende
  // (innlogga eller ikkje), uansett kva 24/7-stasjon dei høyrer på.
  async function _publishLiveStatus(isLive) {
    try {
      if (typeof SC_Storage === 'undefined' || !SC_Storage.isConfigured || !SC_Storage.isConfigured()) return;
      const { error } = await SC_Storage.client().rpc('set_live_broadcast_status', {
        p_secret:         _liveSecret(),
        p_is_live:        !!isLive,
        p_presenter_name: isLive ? (_bc.presenterName || '') : '',
        p_room:           isLive ? (_bc.room || '') : '',
        p_track_title:    isLive ? (_bc.trackTitle || '') : '',
        p_link_url:       isLive ? (_bc.linkUrl || '') : '',
      });
      if (error) _bcLog('Global "go live" status not published: ' + error.message);
    } catch (e) { _bcLog('Global "go live" status failed: ' + (e.message || e)); }
  }

  // Fire-and-forget: øyeblikkelig e-postvarsel til abonnentar (api/live-start-notify.js,
  // migrasjon 0027) om at sendinga akkurat starta. Same eigar-hemmelegheit som
  // _publishLiveStatus() over — server-sida har ein cooldown (20 min) mot fleire
  // varsel på rad om DJ-en stoppar/startar igjen. Kalla KUN ved oppstart, aldri ved stopp.
  async function _notifyLiveStart() {
    // Test-sending (romnamn «test»): IKKJE send «vi er live no»-e-post til alle abonnentane (2026-09-25).
    if (String((_bc && _bc.room) || '').trim().toLowerCase() === 'test') { _bcLog('Test room — no live e-mail sent.'); return; }
    try {
      await fetch('/api/live-start-notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: _liveSecret(), presenterName: _bc.presenterName || '' }),
      });
    } catch (e) { _bcLog('Live-start notify failed: ' + (e.message || e)); }
  }

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

  // Stasjons-eier/admin kan alltid gå live — uavhengig av booking. Identifiseres
  // på e-post via den samlede CONFIG.ADMIN_EMAILS-lista (js/config.js), så det
  // følger kontoen uansett nettleser når man er logget inn.
  function _isOwner(cur) {
    return typeof CONFIG !== 'undefined' && CONFIG.isAdminEmail(cur);
  }

  function canGoLive() {
    const cur = (typeof Auth !== 'undefined' && Auth.current) ? Auth.current() : null;
    const active = cur ? _activeBooking(cur) : null;
    const devBypass = _isLocalDev();
    const owner = _isOwner(cur);
    return { user: cur, active, next: cur ? _nextBooking(cur) : null, devBypass, owner, ok: !!active || devBypass || owner };
  }

  function _esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  function _byId(id) { return document.getElementById(id); }
  function _bcLog(m) { const l = _byId('bc-log'); if (!l) return; l.textContent += '\n' + new Date().toLocaleTimeString('nb-NO') + '  ' + m; l.scrollTop = l.scrollHeight; }

  // ── DJ: gå live ─────────────────────────────────────────────────────
  // room (valgfri): forhåndsvelg rom-navn — brukes når DJ-konsollen åpnes fra
  // en planlagt sendetid (BroadcastSchedule) så DJ og lyttere havner i samme rom.
  function goLive(room) {
    if (typeof App === 'undefined') return;
    if (!window.LiveBroadcast) { App.toast('Broadcasting could not be loaded (livebroadcast.js missing).', 'error'); return; }
    if (room && !_bc.dj) _bc.room = String(room);
    // Gate: live-sending er låst til en aktiv Live Mix-tid (forbigått på localhost
    // for testing). Hvis allerede live, hopp over gaten ved re-åpning av konsollen.
    if (!_bc.dj) {
      const gate = canGoLive();
      if (!gate.ok) {
        if (!gate.user) {
          App.toast('Log in or create a free profile to broadcast live.', 'info', 4000);
          location.hash = '#/login';
        } else {
          _renderNoBooking(gate.user);
        }
        return;
      }
      _bc.activeBooking = gate.active;                 // null ved localhost-/eier-bypass
      _bc.devBypass = gate.devBypass && !gate.active;  // vis «lokal test»-merke da
      _bc.ownerBypass = gate.owner && !gate.active && !gate.devBypass; // «eier»-merke da
    }
    _renderDJ();
  }

  function _renderNoBooking(cur) {
    const box = _byId('modal-box'); if (!box) return;
    const next = _nextBooking(cur);
    const note = next
      ? `Your next booked time: <strong>${_fmtDateTime(next.slot)}</strong> (${next.hours} ${next.hours > 1 ? 'hours' : 'hour'}). You can go live from ~10 min before start.`
      : `You have no upcoming Live Mix time. Book a slot to broadcast live.`;
    box.innerHTML = `
      <div class="modal-header">
        <h2>${_I('radio')} Go live</h2>
        <button class="btn-icon" onclick="App.closeModal()" aria-label="Close">${_I('x')}</button>
      </div>
      <div style="padding:0.5rem 0">
        <p style="color:var(--text2);font-size:0.9rem;line-height:1.5;margin:0 0 0.75rem">
          Live broadcasting is locked to an <strong>active Live Mix time</strong> — you broadcast during the time slot you've booked.
        </p>
        <div style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.25);border-radius:12px;padding:0.8rem 1rem;font-size:0.88rem;color:var(--text);margin:0 0 1rem">${note}</div>
        <button class="btn btn-primary w-full" onclick="LiveMix.openBooking()">${_I('clock')} Book mix slot</button>
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
        <h2>${_I('radio')} Go live — broadcast your set</h2>
        <button class="btn-icon" onclick="App.closeModal()" aria-label="Close">${_I('x')}</button>
      </div>
      <div style="padding:0.25rem 0">
        <p style="color:var(--text2);font-size:0.85rem;line-height:1.5;margin:0 0 1rem">
          Route your DJ software's master output to a virtual audio cable (e.g. BlackHole) and select it below.
          Listeners open "Listen live" with the same room name. Signaling goes over Supabase — works over the internet.
        </p>
        ${_bc.activeBooking
          ? `<div style="display:inline-flex;align-items:center;gap:0.4rem;font-size:0.78rem;font-weight:700;padding:0.3rem 0.7rem;border-radius:999px;background:rgba(34,197,94,0.12);color:#22c55e;margin:0 0 1rem">${_I('clock')} Active time: ${_bc.activeBooking.slot ? _fmtDateTime(_bc.activeBooking.slot) : 'to be scheduled'}${_bc.activeBooking.test ? ' · TEST' : ''}</div>`
          : (_bc.devBypass ? `<div style="display:inline-flex;align-items:center;gap:0.4rem;font-size:0.78rem;font-weight:700;padding:0.3rem 0.7rem;border-radius:999px;background:rgba(245,158,11,0.14);color:var(--accent);margin:0 0 1rem">🧪 Local test — booking gate bypassed</div>`
              : (_bc.ownerBypass ? `<div style="display:inline-flex;align-items:center;gap:0.4rem;font-size:0.78rem;font-weight:700;padding:0.3rem 0.7rem;border-radius:999px;background:rgba(245,158,11,0.14);color:var(--accent);margin:0 0 1rem">${_I('radio')} Owner — broadcasting without booking</div>` : ''))}
        <label style="${lbl}">Your artist/presenter name</label>
        <input id="bc-presenter" value="${_esc(_bc.presenterName || '')}" placeholder="Your artist name" ${live ? 'disabled' : ''} style="${inp};margin:0 0 0.9rem">
        <p style="font-size:0.74rem;color:var(--text3);margin:-0.55rem 0 0.9rem">Shown to ALL visitors on the site as "with {your name}" while you're live — they get automatically switched over from their station to your broadcast.</p>
        <label style="${lbl}">Room name</label>
        <input id="bc-room" value="${_esc(_bc.room || 'live')}" ${live ? 'disabled' : ''} style="${inp};margin:0 0 0.9rem">
        <label style="${lbl}">Now playing (optional)</label>
        <div style="display:flex;gap:0.6rem;margin:0 0 0.4rem">
          <input id="bc-track" value="${_esc(_bc.trackTitle || '')}" placeholder="e.g. Ambient Mann — All The Way From Heaven" style="${inp};flex:1">
          ${live ? `<button class="btn btn-ghost" onclick="LiveMix.bcUpdateNowPlaying()">Update</button>` : ''}
        </div>
        <label style="${lbl}">Link (optional)</label>
        <input id="bc-link" value="${_esc(_bc.linkUrl || '')}" placeholder="https://facebook.com/… (Facebook, Bandcamp, Spotify…)" inputmode="url" style="${inp};margin:0 0 0.4rem">
        <p style="font-size:0.74rem;color:var(--text3);margin:0 0 0.9rem">Shown as a clickable link on the 24-Hour Cycle card while you're live. Must start with https://</p>
        <p style="font-size:0.74rem;color:var(--text3);margin:-0.15rem 0 0.9rem">Shown next to your name on the 24-Hour Cycle card while you're live. Can be changed mid-set — click Update (or it syncs automatically within 45s via the heartbeat).</p>
        <label style="${lbl}">Audio input (DJ routing)</label>
        <div style="display:flex;gap:0.6rem;margin:0 0 1rem">
          <select id="bc-dev" ${live ? 'disabled' : ''} style="${inp};flex:1">${live ? '' : '<option>Click "Grant access" first…</option>'}</select>
          <button class="btn btn-ghost" id="bc-perm" onclick="LiveMix.bcPerm()" ${live ? 'disabled' : ''}>Grant access</button>
        </div>
        <label style="${lbl}">Display while broadcasting</label>
        <div style="display:flex;gap:0.5rem;margin:0 0 0.6rem">
          <button type="button" class="btn ${_bc.visual === 'image' ? 'btn-primary' : 'btn-ghost'}" id="bc-vis-image" onclick="LiveMix.bcSetVisual('image')" ${live ? 'disabled' : ''} style="flex:1">🖼️ Image (audio only)</button>
          <button type="button" class="btn ${_bc.visual === 'camera' ? 'btn-primary' : 'btn-ghost'}" id="bc-vis-camera" onclick="LiveMix.bcSetVisual('camera')" ${live ? 'disabled' : ''} style="flex:1">🎥 Laptop camera</button>
        </div>
        <div id="bc-image-row" style="display:${_bc.visual === 'image' ? 'flex' : 'none'};gap:0.6rem;align-items:center;flex-wrap:wrap;margin:0 0 1rem">
          <button class="btn btn-ghost" id="bc-image-btn" onclick="document.getElementById('bc-image-input').click()" ${live ? 'disabled' : ''}>${_I('camera')} Upload image</button>
          <input type="file" id="bc-image-input" accept="image/*" style="display:none" onchange="LiveMix.bcSetImage(this)">
          <img id="bc-image-prev" src="${_esc(_bc.coverUrl || '')}" alt="" style="height:42px;border-radius:8px;${_bc.coverUrl ? '' : 'display:none'}">
          <span style="font-size:0.74rem;color:var(--text3)">Camera is off — the image is shown while the music plays.</span>
        </div>
        <label style="display:flex;align-items:center;gap:0.5rem;font-size:0.88rem;margin:0 0 0.3rem;cursor:pointer">
          <input type="checkbox" id="bc-record" ${_recordPref() ? 'checked' : ''} ${live ? 'disabled' : ''} onchange="LiveMix.bcSetRecord(this.checked)">
          Record this broadcast and add it to “What went live”
        </label>
        <p style="font-size:0.74rem;color:var(--text3);margin:0 0 0.9rem">Turn this off to play live without a recording. Your choice is remembered.</p>
        <div style="display:flex;gap:0.6rem;align-items:center;flex-wrap:wrap;margin:0 0 1.1rem">
          <button class="btn btn-primary" id="bc-go" onclick="LiveMix.bcGo()" ${(live || !_bc.permGranted) ? 'disabled' : ''}>📡 Go live</button>
          <button class="btn" id="bc-stop" onclick="LiveMix.bcStop()" ${live ? '' : 'disabled'} style="background:#ef4444;color:#fff">■ Stop</button>
          <span style="display:inline-flex;align-items:center;gap:0.4rem;font-size:0.8rem;font-weight:700;padding:0.25rem 0.7rem;border-radius:999px;background:rgba(255,255,255,0.06)">
            <span id="bc-dot" style="width:9px;height:9px;border-radius:50%;background:${live ? '#ef4444' : '#9aa3b2'}"></span>
            <span id="bc-status">${live ? 'LIVE — broadcasting' : 'Inactive'}</span>
          </span>
        </div>
        <div style="font-size:1.5rem;font-weight:800;margin:0 0 0.75rem"><span id="bc-count">${live ? _bc.dj.listeners : 0}</span> <span style="font-size:0.85rem;font-weight:400;color:var(--text2)">listeners connected</span></div>
        <div style="display:flex;justify-content:space-between;font-size:0.72rem;color:var(--text2);margin:0 0 0.2rem"><span>Sent (L)</span><span id="bc-ldb">−∞ dB</span></div>
        <div style="${meter}"><i id="bc-lmeter" style="${fill}"></i></div>
        <div style="display:flex;justify-content:space-between;font-size:0.72rem;color:var(--text2);margin:0.5rem 0 0.2rem"><span>Sent (R)</span><span id="bc-rdb">−∞ dB</span></div>
        <div style="${meter}"><i id="bc-rmeter" style="${fill}"></i></div>
        <div id="bc-log" style="font:12px/1.5 ui-monospace,monospace;background:rgba(0,0,0,0.3);border-radius:10px;padding:0.6rem 0.7rem;max-height:120px;overflow:auto;color:var(--text2);white-space:pre-wrap;margin-top:0.9rem">Ready.</div>
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
      devs.forEach(d => { const o = document.createElement('option'); o.value = d.deviceId; o.textContent = d.label || ('Input ' + (sel.length + 1)); sel.appendChild(o); });
      const pref = devs.find(d => /blackhole|loopback|soundflower|air 192|aggregate/i.test(d.label));
      if (pref) sel.value = pref.deviceId;
      _bc.permGranted = true;
      const go = _byId('bc-go'); if (go) go.disabled = false;
      _bcLog(devs.length + ' input(s).' + (pref ? '  Suggested: ' + pref.label : ''));
    } catch (e) { _bcLog('Access error: ' + e.message); }
  }

  // Velg visning: stillbilde (kun lyd, kamera av) eller laptop-kamera.
  function bcSetVisual(mode) {
    if (_bc.dj) return;                        // ikke bytt mens live
    _bc.visual = (mode === 'camera') ? 'camera' : 'image';
    const bi = _byId('bc-vis-image'), bc = _byId('bc-vis-camera'), row = _byId('bc-image-row');
    if (bi) bi.className = 'btn ' + (_bc.visual === 'image' ? 'btn-primary' : 'btn-ghost');
    if (bc) bc.className = 'btn ' + (_bc.visual === 'camera' ? 'btn-primary' : 'btn-ghost');
    if (row) row.style.display = _bc.visual === 'image' ? 'flex' : 'none';
  }

  function bcSetImage(input) {
    const f = input && input.files && input.files[0]; if (!f) return;
    if (_bc.coverUrl) { try { URL.revokeObjectURL(_bc.coverUrl); } catch (e) {} }
    _bc.coverUrl = URL.createObjectURL(f);
    const img = new Image(); img.onload = () => { _bc.coverImg = img; }; img.src = _bc.coverUrl;
    const prev = _byId('bc-image-prev'); if (prev) { prev.src = _bc.coverUrl; prev.style.display = ''; }
  }

  // Bygg et video-spor for sendingen: laptop-kamera, eller et stillbilde-/«LIVE»-
  // canvas (kamera av). Returnerer null hvis ingen video skal sendes.
  async function _bcVisualTrack(room) {
    if (_bc.visual === 'camera') {
      _bc.camStream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 }, audio: false });
      return _bc.camStream.getVideoTracks()[0] || null;
    }
    const cv = document.createElement('canvas'); cv.width = 1280; cv.height = 720;
    const ctx = cv.getContext('2d'); _bc.canvas = cv;
    const draw = () => {
      ctx.fillStyle = '#0f0f1a'; ctx.fillRect(0, 0, 1280, 720);
      const img = _bc.coverImg;
      if (img && img.width) {
        const r = Math.max(1280 / img.width, 720 / img.height);
        const w = img.width * r, h = img.height * r;
        ctx.drawImage(img, (1280 - w) / 2, (720 - h) / 2, w, h);
      } else {
        ctx.textAlign = 'center';
        ctx.fillStyle = '#7c3aed'; ctx.font = 'bold 72px Inter, sans-serif';
        ctx.fillText('🔴 LIVE', 640, 330);
        ctx.fillStyle = '#fff'; ctx.font = '600 36px Inter, sans-serif';
        ctx.fillText('room: ' + room, 640, 400);
      }
    };
    draw();
    // Hold sporet i live med jevne re-tegninger (noen nettlesere fryser et stille canvas-spor).
    _bc.canvasRaf = setInterval(draw, 1000);
    const cs = cv.captureStream(2);
    return cs.getVideoTracks()[0] || null;
  }

  // Kryssboks «Record this broadcast» (brukarønske 2026-09-25): på som standard, valet blir husk lokalt.
  function _recordPref() {
    try { return localStorage.getItem('sfm_bc_record') !== '0'; } catch (e) { return true; }
  }
  function bcSetRecord(v) {
    try { localStorage.setItem('sfm_bc_record', v ? '1' : '0'); } catch (e) {}
  }

  // Flagg i localStorage så ANDRE faner i same nettlesar veit at denne maskina sender live. Ei anna SiriusFM-fane
  // (som speler jingelar/radio) ville elles lekka lyd inn i BlackHole → inn i sendinga → ekko ved starten
  // (jingelen speler både lokalt og i straumen). js/liveGlobal.js les flagget. Utløper etter 2 min utan hjarteslag.
  function _djFlag(on) {
    try { if (on) localStorage.setItem('sfm_dj_live', String(Date.now())); else localStorage.removeItem('sfm_dj_live'); } catch (e) {}
  }
  if (typeof window !== 'undefined') window.addEventListener('pagehide', () => { if (_bc && _bc.dj) _djFlag(false); });

  async function bcGo() {
    try {
      const sel = _byId('bc-dev'), roomEl = _byId('bc-room'), presEl = _byId('bc-presenter'), trackEl = _byId('bc-track'), linkEl = _byId('bc-link');
      const room = (roomEl && roomEl.value.trim()) || 'live'; _bc.room = room;
      _bc.presenterName = (presEl && presEl.value.trim()) || '';
      _bc.trackTitle = (trackEl && trackEl.value.trim()) || '';
      _bc.linkUrl = _cleanLink(linkEl && linkEl.value);
      _bc.stream = await navigator.mediaDevices.getUserMedia({ audio: {
        deviceId: { exact: sel.value }, echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 2,
      } });
      _bc.ctx = new (window.AudioContext || window.webkitAudioContext)(); await _bc.ctx.resume();
      const src = _bc.ctx.createMediaStreamSource(_bc.stream), sp = _bc.ctx.createChannelSplitter(2);
      _bc.analL = _bc.ctx.createAnalyser(); _bc.analR = _bc.ctx.createAnalyser(); _bc.analL.fftSize = _bc.analR.fftSize = 1024;
      src.connect(sp); sp.connect(_bc.analL, 0); sp.connect(_bc.analR, 1);
      _bcStartMeter();
      // Peak-limiter FØR sendingen går ut — reint klippevern (høg terskel,
      // raskt slag), IKKJE musikk-komprimering; DSP-en over
      // (echoCancellation/noiseSuppression/autoGainControl:false) er
      // framleis av for sjølve opptaket. Gjer nivået meir likt resten av
      // 24/7-rotasjonen ved overgangen etter LIVE_OUTRO, og hindrar eit for
      // vermt Traktor-signal frå å klippe (brukarønske 2026-09-20).
      const limiter = _bc.ctx.createDynamicsCompressor();
      limiter.threshold.value = -1; limiter.knee.value = 0; limiter.ratio.value = 20;
      limiter.attack.value = 0.003; limiter.release.value = 0.1;
      const dest = _bc.ctx.createMediaStreamDestination();
      src.connect(limiter); limiter.connect(dest);
      // Utgående strøm: limitert lyd + valgt video (stillbilde eller laptop-kamera).
      const outTracks = [...dest.stream.getAudioTracks()];
      let vTrack = null;
      try { vTrack = await _bcVisualTrack(room); } catch (e) { _bcLog('Video off (' + e.message + ') — sending audio only.'); }
      if (vTrack) outTracks.push(vTrack);
      _bc.outStream = new MediaStream(outTracks);
      _bc.dj = LiveBroadcast.broadcaster(room, _bc.outStream, {
        onPeerCount: n => { const el = _byId('bc-count'); if (el) el.textContent = n; },
        onLog: _bcLog,
      });
      _bcSetLive(true);
      _djFlag(true);
      _bcLog('You are LIVE in room "' + room + '" (' + (vTrack ? (_bc.visual === 'camera' ? 'camera' : 'image') : 'audio only') + '). Play in your DJ software.');
      // Publiser til den globale statusen SIST, etter at sendingen faktisk er i gang
      // — så ingen besøkende byttes over til et rom som ennå ikke sender noe.
      _publishLiveStatus(true);
      _notifyLiveStart();
      // Opptak + arkivrad (js/liveSets.js) — stoppar aldri sendinga, feil her ignorerast.
      const recEl = _byId('bc-record'), wantRec = recEl ? !!recEl.checked : _recordPref();
      if (wantRec) { try { window.LiveSets?.begin({ stream: _bc.outStream, displayName: _bc.presenterName, room, isOwner: true, trackTitle: _bc.trackTitle, linkUrl: _bc.linkUrl }); } catch (e) {} }
      else _bcLog('Recording is OFF for this broadcast.');
      // Hjarteslag: re-publiser med jamne mellomrom mens sendinga pågår, så
      // updated_at-kolonna held seg fersk. Krasjar/lukkast fana (eller
      // internett fell heilt ut) UTAN at bcStop() rekk å køyre, sluttar
      // hjarteslaget stille — og js/liveGlobal.js sin ferskleik-sjekk
      // (RECONNECT_COOLDOWN_MS-området) reknar statusen som forelda etter
      // kort tid i staden for at is_live sit fast «true» for alltid
      // (rapportert 2026-09-19: ei sending frå kvelden før blokkerte normal
      // radio for ALLE i 13+ timar).
      if (_bc.heartbeatTimer) clearInterval(_bc.heartbeatTimer);
      _bc.heartbeatTimer = setInterval(() => { if (_bc.dj) { _publishLiveStatus(true); _djFlag(true); } }, 45000);
      // Oppdater "24-Hour Cycle"-kortet på DENNE fana med det same — den
      // globale liveGlobal.js-vegen hopper med vilje over broadcasterens
      // eigen fane (sjølv-ekko-vernet), så det må trigges herfrå i staden.
      try { window.Radio247?.refresh?.(); } catch (e) {}
    } catch (e) { _bcLog('ERROR going live: ' + e.message); if (typeof App !== 'undefined') App.toast('Could not go live: ' + e.message, 'error'); }
  }

  function bcStop() {
    _djFlag(false);
    // Stopp opptaket og last det opp FØR lydspora blir stoppa lenger ned (fire-and-forget).
    try { window.LiveSets?.end({ trackTitle: _bc.trackTitle, linkUrl: _bc.linkUrl }); } catch (e) {}
    // Fire-and-forget: fjern den globale live-statusen FØRST, slik at besøkende
    // byttes tilbake til stasjonen sin selv om resten av oppryddingen under feiler.
    _publishLiveStatus(false);
    if (_bc.heartbeatTimer) { clearInterval(_bc.heartbeatTimer); _bc.heartbeatTimer = null; }
    if (_bc.raf) cancelAnimationFrame(_bc.raf); _bc.raf = null;
    if (_bc.canvasRaf) { clearInterval(_bc.canvasRaf); _bc.canvasRaf = null; }
    if (_bc.dj) { _bc.dj.stop(); _bc.dj = null; }
    if (_bc.camStream) { _bc.camStream.getTracks().forEach(t => t.stop()); _bc.camStream = null; }
    // Video-sporet ER rå (canvas/kamera-capture), men audio-sporet i outStream
    // er no eit MediaStreamAudioDestinationNode-spor (frå limiteren over),
    // IKKJE same objekt som _bc.stream sine rå enhets-spor — begge må derfor
    // stoppast eksplisitt her, ikkje berre video.
    if (_bc.outStream) { _bc.outStream.getTracks().forEach(t => t.stop()); _bc.outStream = null; }
    if (_bc.stream) { _bc.stream.getTracks().forEach(t => t.stop()); _bc.stream = null; }
    if (_bc.ctx) { try { _bc.ctx.close(); } catch (e) {} _bc.ctx = null; }
    _bc.analL = _bc.analR = null; _bc.canvas = null;
    _bcSetLive(false);
    const c = _byId('bc-count'); if (c) c.textContent = '0';
    _bcLog('Stopped.');
    try { window.Radio247?.refresh?.(); } catch (e) {}
  }

  // Lar DJ-en oppdatere "Now playing"-teksten midt i settet uten å avbryte
  // sendingen — leser feltet på nytt og publiserer med det samme (i stedet
  // for å vente på neste 45s-hjarteslag).
  // Berre http(s)-URL-ar slepp gjennom (hindrar javascript:-lenker o.l.).
  function _cleanLink(v) {
    v = (v || '').trim();
    if (!v) return '';
    if (!/^https?:\/\//i.test(v)) v = 'https://' + v;
    try { const u = new URL(v); return /^https?:$/.test(u.protocol) ? u.href : ''; } catch (e) { return ''; }
  }

  function bcUpdateNowPlaying() {
    if (!_bc.dj) return;
    const trackEl = _byId('bc-track');
    _bc.trackTitle = (trackEl && trackEl.value.trim()) || '';
    const linkEl = _byId('bc-link');
    _bc.linkUrl = _cleanLink(linkEl && linkEl.value);
    _publishLiveStatus(true);
    try { window.Radio247?.refresh?.(); } catch (e) {}
  }

  function _bcSetLive(live) {
    const go = _byId('bc-go'), stop = _byId('bc-stop'), perm = _byId('bc-perm'), dev = _byId('bc-dev'), room = _byId('bc-room'), dot = _byId('bc-dot'), st = _byId('bc-status');
    if (go) go.disabled = live; if (stop) stop.disabled = !live; if (perm) perm.disabled = live;
    if (dev) dev.disabled = live; if (room) room.disabled = live;
    const recBox = _byId('bc-record'); if (recBox) recBox.disabled = live;
    if (dot) dot.style.background = live ? '#ef4444' : '#9aa3b2';
    if (st) st.textContent = live ? 'LIVE — broadcasting' : 'Inactive';
    _refreshOwnerButton();
  }

  // ── Eigar-inngang: liten "Gå live"-knapp i navigasjonen ──────────────
  // I dag finst det INGEN stad i sjølve appen som opnar denne DJ-konsollen —
  // ho blei berre nådd frå det frittståande verktøyet tools/broadcast-cloud.html.
  // Same sjølvmonterande mønster som js/livePresence.js sin admin-pille
  // (søsken av #nav-links, som overlever at renderNav bygger #nav-links på
  // nytt igjen; oppdatert ved innlogging/utlogging via hashchange). Kun synleg
  // for eigaren (_isOwner) — ingen ny booking-/planleggings-UI, berre ein
  // knapp som kallar den EKSISTERANDE goLive()/bcStop()-mekanismen.
  let _ownerBtn = null;
  function _mountOwnerButton() {
    const cur = (typeof Auth !== 'undefined' && Auth.current) ? Auth.current() : null;
    if (!_isOwner(cur)) { _removeOwnerButton(); return; }
    if (!_ownerBtn) {
      _ownerBtn = document.createElement('button');
      _ownerBtn.id = 'owner-golive-btn';
      _ownerBtn.type = 'button';
      _ownerBtn.setAttribute('aria-label', 'Go live');
      _ownerBtn.style.cssText = 'display:inline-flex;align-items:center;gap:0.35rem;font-size:0.75rem;font-weight:700;padding:0.3rem 0.7rem;border-radius:999px;border:1px solid rgba(239,68,68,0.35);background:rgba(239,68,68,0.12);color:#ef4444;cursor:pointer;margin-right:0.5rem;white-space:nowrap';
      const nav = document.getElementById('main-nav');
      const links = document.getElementById('nav-links');
      if (nav && links) nav.insertBefore(_ownerBtn, links);
      else if (nav) nav.appendChild(_ownerBtn);
      else document.body.appendChild(_ownerBtn);
    }
    _refreshOwnerButton();
  }
  function _refreshOwnerButton() {
    if (!_ownerBtn) return;
    const live = !!_bc.dj;
    _ownerBtn.title = live ? 'You are live — click to stop' : 'Go live — broadcast directly to everyone on the site';
    _ownerBtn.innerHTML = live ? '🔴 LIVE — Stop' : ('📡 ' + 'Go live');
    _ownerBtn.onclick = live ? bcStop : () => goLive();
  }
  function _removeOwnerButton() { if (_ownerBtn) { _ownerBtn.remove(); _ownerBtn = null; } }

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
  // room (valgfri): forhåndsvelg rom-navn — brukes når «Hør live» åpnes fra en
  // planlagt sendetid (BroadcastSchedule).
  function tuneIn(room) {
    if (typeof App === 'undefined') return;
    if (!window.LiveBroadcast) { App.toast('Broadcasting could not be loaded (livebroadcast.js missing).', 'error'); return; }
    if (room) _bc.room = String(room);
    _renderListener();
  }

  function _renderListener() {
    const box = _byId('modal-box'); if (!box) return;
    const joined = !!_bc.ln;
    const inp = 'width:100%;box-sizing:border-box;padding:0.7rem;border-radius:10px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.04);color:var(--text);font:inherit;text-align:center';
    // Alle besøkende blir automatisk kobla til når nokon går live (js/liveGlobal.js,
    // via DET DELTE #audio-engine-elementet). Denne manuelle knappen kobla FØR til
    // ein EIGEN separat WebRTC-lytter + eige <audio id="ln-audio">-element — spelte
    // altså av same lyd EIN GONG TIL oppå den automatiske overtakinga → hørbar
    // dobbel-lyd/ekko (kjend feil, sjå kommentar i liveGlobal.js). Er automatisk
    // overtaking alt aktiv her, kobler vi ALDRI til ein gong til — vis berre status.
    const autoActive = !!(window.Radio && typeof Radio.isLiveTakeoverActive === 'function' && Radio.isLiveTakeoverActive());
    if (autoActive) {
      box.innerHTML = `
        <div class="modal-header">
          <h2>${_I('headphones')} Listen live</h2>
          <button class="btn-icon" onclick="App.closeModal()" aria-label="Close">${_I('x')}</button>
        </div>
        <div style="padding:0.5rem 0;text-align:center">
          <span style="display:inline-flex;align-items:center;gap:0.45rem;font-size:0.82rem;font-weight:700;padding:0.3rem 0.8rem;border-radius:999px;background:rgba(34,197,94,0.14);color:#22c55e;margin-bottom:0.5rem">
            <span style="width:10px;height:10px;border-radius:50%;background:#22c55e"></span>
            <span>LIVE — already playing automatically</span>
          </span>
          <p style="color:var(--text2);font-size:0.9rem;margin:0.4rem 0 0">You're already hearing this broadcast — every visitor is switched over automatically, no extra step needed.</p>
        </div>`;
      App.openModal();
      return;
    }
    box.innerHTML = `
      <div class="modal-header">
        <h2>${_I('headphones')} Listen live</h2>
        <button class="btn-icon" onclick="App.closeModal()" aria-label="Close">${_I('x')}</button>
      </div>
      <div style="padding:0.5rem 0;text-align:center">
        <span style="display:inline-flex;align-items:center;gap:0.45rem;font-size:0.82rem;font-weight:700;padding:0.3rem 0.8rem;border-radius:999px;background:rgba(255,255,255,0.06);margin-bottom:0.5rem">
          <span id="ln-dot" style="width:10px;height:10px;border-radius:50%;background:#9aa3b2"></span>
          <span id="ln-status">${joined ? 'Connecting…' : 'Not connected'}</span>
        </span>
        <p style="color:var(--text2);font-size:0.9rem;margin:0.4rem 0 1rem">Enter the same room name as the DJ and click to listen to the set live.</p>
        <input id="ln-room" value="${_esc(_bc.room || 'live')}" ${joined ? 'disabled' : ''} aria-label="Room name" style="${inp};margin:0 0 0.8rem">
        <button class="btn btn-primary w-full" id="ln-join" onclick="LiveMix.tuneInJoin()" ${joined ? 'disabled' : ''}>▶︎ Listen live</button>
        <audio id="ln-audio" autoplay playsinline></audio>
        <video id="ln-video" autoplay playsinline muted style="display:none;width:100%;border-radius:12px;margin-top:0.7rem;background:#000"></video>
        <div id="ln-info" style="font-size:0.78rem;color:var(--text3);margin-top:0.9rem"></div>
        ${joined ? `<button class="btn btn-ghost w-full" onclick="LiveMix.tuneOut()" style="margin-top:0.8rem">Disconnect</button>` : ''}
      </div>`;
    App.openModal();
  }

  function _lnStatus(t, live) {
    const s = _byId('ln-status'), d = _byId('ln-dot');
    if (s) s.textContent = t; if (d) d.style.background = live ? '#22c55e' : '#9aa3b2';
  }

  function tuneInJoin() {
    // Dobbel-lyd-vern: aldri opprett ein ny lytter-tilkobling oppå den automatiske
    // globale overtakinga (js/liveGlobal.js) — sjå forklaring i _renderListener().
    if (window.Radio && typeof Radio.isLiveTakeoverActive === 'function' && Radio.isLiveTakeoverActive()) {
      _renderListener();
      return;
    }
    const roomEl = _byId('ln-room');
    const room = (roomEl && roomEl.value.trim()) || 'live'; _bc.room = room;
    const join = _byId('ln-join'); if (join) join.disabled = true;
    _lnStatus('Connecting…', false);
    _bc.listening = true;
    _bc.ended = false;
    _spawnListener(room);
  }

  function _spawnListener(room) {
    _bc.ln = LiveBroadcast.listener(room, {
      onState: s => {
        if (s === 'connected') _lnStatus('LIVE — listening to the set', true);
        else if (s === 'dj-offline') { _bc.ended = true; _lnStatus('DJ ended the broadcast', false); }
        else if (['failed', 'disconnected', 'closed'].includes(s)) {
          _lnStatus('Disconnected', false);
          // Kort nettverksglipp på DENNE eininga (ikkje at DJ-en faktisk
          // stoppa — det melder 'dj-offline' eksplisitt over) → DJ-sida
          // lukker peeren for godt, kjem aldri av seg sjølv attende. Byggjer
          // stille ein ny lytter-tilkobling så lenge modalen framleis er open
          // og sendinga ikkje er meldt avslutta (same feilmønster/fiks som
          // js/liveGlobal.js og js/liveGuest.js, rapportert 2026-09-20).
          if (_lnReconnecting || _bc.ended || !_bc.listening) return;
          _lnReconnecting = true;
          if (_bc.ln) { try { _bc.ln.leave(); } catch (e) {} _bc.ln = null; }
          setTimeout(() => {
            _lnReconnecting = false;
            if (_bc.listening && !_bc.ended) _spawnListener(room);
          }, 1500);
        }
      },
      onTrack: stream => {
        const a = _byId('ln-audio'); if (a) { a.srcObject = stream; a.play().catch(() => {}); }
        const hasVideo = stream.getVideoTracks().length > 0;
        const v = _byId('ln-video');
        if (v && hasVideo) { v.srcObject = stream; v.muted = true; v.style.display = ''; v.play().catch(() => {}); }
        const i = _byId('ln-info'); if (i) i.textContent = hasVideo ? 'Live 🎬🎶' : 'Audio received 🎶';
      },
      onLog: m => { const i = _byId('ln-info'); if (i) i.textContent = m; },
    });
  }

  function tuneOut() {
    _bc.listening = false;   // stopp ev. ventande gjenoppkoblingsforsøk (sjå _spawnListener)
    if (_bc.ln) { _bc.ln.leave(); _bc.ln = null; }
    const a = _byId('ln-audio'); if (a) { try { a.pause(); } catch (e) {} a.srcObject = null; }
    const v = _byId('ln-video'); if (v) { try { v.pause(); } catch (e) {} v.srcObject = null; v.style.display = 'none'; }
    _lnStatus('Disconnected', false);
    if (typeof App !== 'undefined') App.closeModal();
  }

  // Monter eigar-knappen med det same (om innlogga alt) og hald han oppdatert
  // ved innlogging/utlogging — same oppstartsmønster som js/livePresence.js.
  function _initOwnerEntry() {
    _mountOwnerButton();
    window.addEventListener('hashchange', _mountOwnerButton);
  }
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _initOwnerEntry);
    else _initOwnerEntry();
  }

  return {
    openBooking, step, startCheckout, testPurchase, completeFromSession, showReceipt,
    priceFor, _makeBooking, RATE_KR, RATE_ORE,
    goLive, bcPerm, bcGo, bcStop, bcSetVisual, bcSetImage, bcUpdateNowPlaying, bcSetRecord, tuneIn, tuneInJoin, tuneOut,
    canGoLive,
    isBroadcastingHere: () => !!_bc.dj,
    // Brukt av js/radio247.js sitt "24-Hour Cycle"-kort for å vise «LIVE —
    // {namn}» på BROADCASTERENS EIGEN fane også — reint visuelt, kobler
    // ALDRI til lyden der (det er nettopp isBroadcastingHere()-sjekken i
    // js/liveGlobal.js som hindrar sjølv-ekko).
    getBroadcastPresenterName: () => (_bc.dj ? (_bc.presenterName || '') : ''),
    getBroadcastTrackTitle: () => (_bc.dj ? (_bc.trackTitle || '') : ''),
    getBroadcastLinkUrl: () => (_bc.dj ? (_bc.linkUrl || '') : ''),
  };
})();

if (typeof window !== 'undefined') window.LiveMix = LiveMix;
if (typeof module !== 'undefined' && module.exports) module.exports = LiveMix;
