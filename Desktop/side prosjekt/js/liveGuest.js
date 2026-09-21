// LiveGuest — eksterne DJ-er/radiostasjoner søker om å gå live på SiriusFM.
// Eieren godkjenner/avslår på forhånd (js/liveGuestAdmin.js); en godkjent,
// innlogget artist kan deretter gå live i SITT EGET rom innenfor det avtalte
// tidsvinduet — UTEN å røre js/livemix.js sin betalte, eier-eksklusive
// «Gå live»-flyt eller den globale tvangsovertakingen i js/liveGlobal.js/
// js/radio.js. Lyttere kobler seg til via en selvmonterende «Live nå»-fane
// og velger selv å høre på (LiveBroadcast.listener i eget rom, aldri det
// delte #audio-engine). Se supabase/migrations/0025_live_broadcasts.sql.
const LiveGuest = (() => {
  function _I(name) { return (typeof Icon === 'function') ? Icon(name) : ''; }
  function _esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  function _byId(id) { return document.getElementById(id); }

  function _fmtDateTime(iso) {
    if (!iso) return 'To be agreed';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso);
    return d.toLocaleString('en-US', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
  }

  const STATUS_LABEL = {
    pending:   { text: 'Pending approval', bg: 'rgba(245,158,11,0.14)', fg: '#f59e0b' },
    approved:  { text: 'Approved',         bg: 'rgba(34,197,94,0.14)',  fg: '#22c55e' },
    rejected:  { text: 'Rejected',         bg: 'rgba(239,68,68,0.14)', fg: '#ef4444' },
    live:      { text: '🔴 LIVE now',      bg: 'rgba(239,68,68,0.18)', fg: '#ef4444' },
    completed: { text: 'Completed',        bg: 'rgba(255,255,255,0.08)', fg: 'var(--text2)' },
    cancelled: { text: 'Cancelled',        bg: 'rgba(255,255,255,0.06)', fg: 'var(--text3)' },
  };
  // Fast lenke til oppsett-guiden (delbar Artifact-side, EN/NO) — vist til artisten
  // så snart forespørselen er godkjent, siden det er da de faktisk trenger den.
  const GUIDE_URL = 'https://claude.ai/artifact/Cbdrd8vBi2Rj3dubi3dQJF';

  // ── Live-jingle (lyttersida) ─────────────────────────────────────────────────
  // Gjenbruker NØYAKTIG samme lydfiler/mønster som eierens globale «Gå live»
  // (js/radio.js: LIVE_JINGLES/LIVE_INTRO/LIVE_STANDALONE/_normalizeName) —
  // spelt lokalt i lytterens egen nettleser FØR sendingen kobles inn, aldri
  // mikset inn i selve WebRTC-strømmen. Presentatørnavnet (display_name) styrer
  // BÅDE teksten som vises i modalen OG hvilket klipp som spilles.
  const JINGLE_BASE = 'assets/jingles/';
  const LIVE_JINGLES = {
    ambientmann:      JINGLE_BASE + 'live-ambientmann.mp3',
    noah:             JINGLE_BASE + 'live-noah.mp3',
    therollingstoned: JINGLE_BASE + 'live-therollingstoned.mp3',
  };
  const LIVE_JINGLE_GENERIC = JINGLE_BASE + 'live-generic.mp3';
  const LIVE_INTRO = JINGLE_BASE + 'live-intro.mp3';
  const LIVE_STANDALONE = { gagaringproject: JINGLE_BASE + 'live-gagaringproject.mp3' };
  function _normalizeName(name) { return String(name || '').toLowerCase().replace(/[^a-z]/g, ''); }

  // Spel intro (+ evt. navneklipp) lokalt, kall så `done()` — feiler ALDRI høyt:
  // manglar/spelar ikke jingelen (autoplay blokkert, 404 osv.) hoppes den bare
  // over og lytteren kobles rett til den ekte sendingen i stedet.
  function _playClip(src, done) {
    try {
      const a = new Audio(src);
      a.volume = 0.85;
      const finish = () => done && done();
      a.addEventListener('ended', finish, { once: true });
      a.addEventListener('error', finish, { once: true });
      a.play().catch(finish);
    } catch (e) { done && done(); }
  }
  function _playLiveJingle(presenterName, done) {
    const key = _normalizeName(presenterName);
    if (LIVE_STANDALONE[key]) { _playClip(LIVE_STANDALONE[key], done); return; }
    const nameClip = LIVE_JINGLES[key] || LIVE_JINGLE_GENERIC;
    _playClip(LIVE_INTRO, () => _playClip(nameClip, done));
  }

  function _badge(status) {
    const s = STATUS_LABEL[status] || STATUS_LABEL.pending;
    return `<span style="display:inline-flex;align-items:center;gap:0.35rem;font-size:0.72rem;font-weight:700;padding:0.25rem 0.65rem;border-radius:999px;background:${s.bg};color:${s.fg}">${s.text}</span>`;
  }

  // Er forespørselen si sendetid aktiv nå (10 min slingringsmonn før start,
  // slutt = start+timer)? Uten tidspunkt («avtales nærmere») = alltid aktiv,
  // same regel som js/livemix.js sin _activeBooking().
  function _isWindowActive(req) {
    if (!req || !req.requested_start) return true;
    const start = new Date(req.requested_start).getTime();
    if (isNaN(start)) return true;
    const now = Date.now(), GRACE = 10 * 60 * 1000;
    const end = start + Math.max(1, req.requested_hours || 1) * 3600 * 1000;
    return now >= start - GRACE && now < end;
  }

  // ── Søk om å gå live ─────────────────────────────────────────────────────────
  let _hours = 1;
  function openApply() {
    const cur = (typeof Auth !== 'undefined' && Auth.current) ? Auth.current() : null;
    if (!cur) {
      if (typeof App !== 'undefined') App.toast('Log in or create a free profile to apply to go live.', 'info', 4000);
      location.hash = '#/login';
      return;
    }
    _hours = 1;
    _renderApply(cur);
  }

  function _renderApply(cur) {
    const box = _byId('modal-box');
    if (!box || typeof App === 'undefined') return;
    const start = new Date(Date.now() + 24 * 3600 * 1000);
    start.setHours(20, 0, 0, 0);
    const localISO = new Date(start.getTime() - start.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    const inp = 'width:100%;box-sizing:border-box;padding:0.65rem 0.75rem;border-radius:10px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.04);color:var(--text);font-size:0.95rem;font:inherit';
    const trusted = typeof CONFIG !== 'undefined' && CONFIG.isTrustedDjEmail && CONFIG.isTrustedDjEmail(cur);
    box.innerHTML = `
      <div class="modal-header">
        <h2>${_I('radio')} Apply to go live</h2>
        <button class="btn-icon" onclick="App.closeModal()" aria-label="Close">${_I('x')}</button>
      </div>
      <div style="padding:0.5rem 0 0.25rem">
        <p style="color:var(--text2);font-size:0.9rem;line-height:1.5;margin:0 0 1rem">
          ${trusted
            ? 'You\'re on the trusted broadcaster list — no owner approval needed. You still have to pick a specific broadcast time below.'
            : 'Send a request to broadcast live on SiriusFM. The owner approves or rejects before you can go live — you won\'t get access until the request is approved.'}
        </p>
        <label for="lg-name" style="display:block;font-weight:700;font-size:0.85rem;margin:0 0 0.35rem">Artist/station name</label>
        <input id="lg-name" value="${_esc(cur.displayName || cur.username)}" placeholder="Shown to listeners" style="${inp};margin:0 0 1rem">
        <label for="lg-slot" style="display:block;font-weight:700;font-size:0.85rem;margin:0 0 0.35rem">Preferred broadcast time${trusted ? ' (required)' : ''}</label>
        <input id="lg-slot" type="datetime-local" value="${localISO}" ${trusted ? 'required' : ''} style="${inp};margin:0 0 1rem">
        <label style="display:block;font-weight:700;font-size:0.85rem;margin:0 0 0.35rem">How many hours?</label>
        <div style="display:flex;align-items:center;gap:0.75rem;margin:0 0 1rem">
          <button class="btn btn-ghost" onclick="LiveGuest.step(-1)" aria-label="Fewer hours" style="width:44px;height:44px;font-size:1.4rem;padding:0;line-height:1">−</button>
          <div id="lg-hours" style="font-size:1.4rem;font-weight:800;min-width:3.5rem;text-align:center">1 h</div>
          <button class="btn btn-ghost" onclick="LiveGuest.step(1)" aria-label="More hours" style="width:44px;height:44px;font-size:1.4rem;padding:0;line-height:1">+</button>
        </div>
        <label for="lg-msg" style="display:block;font-weight:700;font-size:0.85rem;margin:0 0 0.35rem">Message to the owner (optional)</label>
        <textarea id="lg-msg" rows="3" placeholder="E.g. genre, where you're broadcasting from …" style="${inp};resize:vertical;margin:0 0 1.1rem"></textarea>
        <button class="btn btn-primary w-full" onclick="LiveGuest.submitApply()">${_I('send')} Send request</button>
      </div>`;
    App.openModal();
  }

  function step(delta) {
    _hours = Math.max(1, Math.min(12, _hours + (parseInt(delta, 10) || 0)));
    const h = _byId('lg-hours'); if (h) h.textContent = _hours + ' h';
  }

  async function submitApply() {
    const cur = (typeof Auth !== 'undefined' && Auth.current) ? Auth.current() : null;
    if (!cur) return;
    const name = (_byId('lg-name')?.value || '').trim() || cur.displayName || cur.username;
    const slotEl = _byId('lg-slot');
    const slot = slotEl && slotEl.value ? new Date(slotEl.value).toISOString() : null;
    const msg = (_byId('lg-msg')?.value || '').trim();
    const trusted = typeof CONFIG !== 'undefined' && CONFIG.isTrustedDjEmail && CONFIG.isTrustedDjEmail(cur);
    if (trusted && !slot) {
      if (typeof App !== 'undefined') App.toast('Pick a specific broadcast time — trusted broadcasters must schedule one.', 'error', 4500);
      return;
    }
    if (!LiveBroadcastSync._enabled()) {
      if (typeof App !== 'undefined') App.toast('This feature requires cloud storage to be set up (Supabase).', 'error', 5000);
      return;
    }
    const id = await LiveBroadcastSync.submitRequest({
      username: cur.username, email: cur.email || '', displayName: name, message: msg,
      requestedStart: slot, requestedHours: _hours,
    });
    if (!id) { if (typeof App !== 'undefined') App.toast('Could not send the request. Please try again.', 'error'); return; }
    if (typeof App !== 'undefined') {
      App.closeModal();
      App.toast(trusted ? 'Scheduled! No approval needed — you can go live from ~10 min before your time.' : 'Request sent! You\'ll be notified once the owner responds.', 'success', 5000);
    }
    location.hash = '#/go-live/mine';
  }

  // ── Mine forespørsler / DJ-inngang ──────────────────────────────────────────
  async function renderMine() {
    const app = _byId('app');
    if (!app) return;
    const cur = (typeof Auth !== 'undefined' && Auth.current) ? Auth.current() : null;
    if (!cur) {
      if (typeof App !== 'undefined') App.toast('Log in to see your requests.', 'info', 4000);
      location.hash = '#/login';
      return;
    }
    app.innerHTML = `
      <div style="max-width:720px;margin:0 auto;padding:1.5rem 1rem 4rem">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:1rem;margin:0 0 1.25rem;flex-wrap:wrap">
          <h1 style="margin:0;font-size:1.6rem;font-weight:800">${_I('radio')} My live requests</h1>
          <button class="btn btn-primary" onclick="LiveGuest.openApply()">${_I('sparkles')} New request</button>
        </div>
        <div id="lg-mine-list" style="display:grid;gap:0.9rem">Loading…</div>
      </div>`;
    window.scrollTo(0, 0);
    await _loadMine(cur);
  }

  let _mineCache = [];
  async function _loadMine(cur) {
    const list = _byId('lg-mine-list');
    if (!list) return;
    if (!LiveBroadcastSync._enabled()) { list.innerHTML = `<div style="color:var(--text2);font-size:0.9rem">This feature requires cloud storage to be set up (Supabase).</div>`; return; }
    _mineCache = await LiveBroadcastSync.listMine(cur.username);
    if (!_mineCache.length) { list.innerHTML = `<div style="color:var(--text2);font-size:0.9rem">No requests yet. Click "New request" to apply to go live.</div>`; return; }
    list.innerHTML = _mineCache.map(_row).join('');
  }

  function _row(r) {
    const canGoLive = r.status === 'approved' && _isWindowActive(r);
    const isLive = r.status === 'live';
    const showThumb = ['approved', 'live', 'completed'].includes(r.status);
    return `
      <div style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:1rem 1.1rem">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:0.75rem;flex-wrap:wrap;margin:0 0 0.5rem">
          <div style="font-weight:800;font-size:1.02rem">${_esc(r.display_name)}</div>
          ${_badge(r.status)}
        </div>
        <div style="font-size:0.85rem;color:var(--text2);margin:0 0 0.3rem">${_fmtDateTime(r.requested_start)} · ${r.requested_hours} ${r.requested_hours > 1 ? 'hours' : 'hour'}</div>
        ${['approved', 'live', 'completed'].includes(r.status) ? `
        <a href="${GUIDE_URL}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:0.4rem;font-size:0.83rem;font-weight:700;color:#22c55e;text-decoration:none;margin:0.15rem 0 0.6rem">${_I('book')} See the setup guide — how to go live →</a>` : ''}
        ${r.message ? `<div style="font-size:0.85rem;color:var(--text3);margin:0 0 0.5rem">${_esc(r.message)}</div>` : ''}
        ${r.status === 'rejected' && r.reject_reason ? `<div style="font-size:0.82rem;color:#ef4444;margin:0 0 0.5rem">Reason: ${_esc(r.reject_reason)}</div>` : ''}
        ${showThumb ? `
        <div style="display:flex;align-items:center;gap:0.6rem;flex-wrap:wrap;margin:0.5rem 0">
          ${r.thumbnail_url ? `<img src="${_esc(r.thumbnail_url)}" alt="" style="width:56px;height:56px;object-fit:cover;border-radius:10px">` : ''}
          <button class="btn btn-ghost" onclick="document.getElementById('lg-thumb-${_esc(r.id)}').click()">${_I('camera')} ${r.thumbnail_url ? 'Change image' : 'Choose preview image'}</button>
          <input type="file" id="lg-thumb-${_esc(r.id)}" accept="image/*" style="display:none" onchange="LiveGuest.pickThumbnail('${_esc(r.id)}', this)">
        </div>` : ''}
        <div style="display:flex;gap:0.6rem;flex-wrap:wrap;margin-top:0.6rem">
          ${canGoLive && !isLive ? `<button class="btn btn-primary" onclick="LiveGuest.goLive('${_esc(r.id)}')">📡 Go live</button>` : ''}
          ${isLive ? `<button class="btn" style="background:#ef4444;color:#fff" onclick="LiveGuest.goLive('${_esc(r.id)}')">🔴 Open DJ console</button>` : ''}
          ${r.status === 'approved' && !_isWindowActive(r) && !isLive ? `<span style="font-size:0.8rem;color:var(--text3);align-self:center">Approved — you can go live from ~10 min before ${_fmtDateTime(r.requested_start)}</span>` : ''}
          ${['pending', 'approved'].includes(r.status) ? `<button class="btn btn-ghost" onclick="LiveGuest.cancelRequest('${_esc(r.id)}')">Cancel</button>` : ''}
        </div>
      </div>`;
  }

  async function pickThumbnail(id, input) {
    const f = input && input.files && input.files[0]; if (!f) return;
    const cur = Auth.current(); if (!cur) return;
    if (typeof SC_Storage === 'undefined' || !SC_Storage.isConfigured()) { if (typeof App !== 'undefined') App.toast('Cloud storage is not set up.', 'error'); return; }
    if (typeof App !== 'undefined') App.toast('Uploading image…', 'info', 2500);
    try {
      const res = await SC_Storage.upload(f, { prefix: 'live-broadcasts' });
      await LiveBroadcastSync.setThumbnailOwned(id, cur.username, res.url);
      if (typeof App !== 'undefined') App.toast('Preview image saved!', 'success');
      await _loadMine(cur);
    } catch (e) { if (typeof App !== 'undefined') App.toast('Upload failed: ' + e.message, 'error'); }
  }

  async function cancelRequest(id) {
    const cur = Auth.current(); if (!cur) return;
    await LiveBroadcastSync.cancelMyRequest(id, cur.username);
    await _loadMine(cur);
  }

  // ── DJ-konsoll (kun lyd — sender direkte til lyttere i sitt eget rom) ─────────
  const _g = { dj: null, ln: null, stream: null, outStream: null, ctx: null, analL: null, analR: null, raf: null, room: '', req: null,
    listening: false, ended: false, jingled: false, heartbeatTimer: null };
  let _lnReconnecting = false;

  // ── Global "gå live"-status (brukarønske 2026-09-21: gjeld no ALLE som går
  // live, ikkje berre eigaren) ────────────────────────────────────────────
  // Same delte `live_broadcast_status`-rad + RPC som js/livemix.js sin
  // eigar-flyt bruker — js/liveGlobal.js les/abonnerer på DENNE rada for å
  // bytte over ALLE besøkende (innlogga eller ikkje), uansett kva 24/7-
  // stasjon dei høyrer på. Ved å publisere hit i staden for å halde
  // gjeste-sendinga i sitt eige, usynkroniserte hjørne, gjenbruker godkjente
  // gjeste-DJ-ar HEILE den eksisterande takeover-flyten (intro-jingel +
  // demping/normalisering i js/radio.js sin attachLiveStream) heilt gratis.
  function _liveSecret() { return (typeof CONFIG !== 'undefined' && CONFIG.LIVE_BROADCAST_SECRET) || ''; }

  async function _publishGlobalLiveStatus(isLive) {
    try {
      if (typeof SC_Storage === 'undefined' || !SC_Storage.isConfigured || !SC_Storage.isConfigured()) return;
      const { error } = await SC_Storage.client().rpc('set_live_broadcast_status', {
        p_secret:         _liveSecret(),
        p_is_live:        !!isLive,
        p_presenter_name: isLive ? ((_g.req && _g.req.display_name) || '') : '',
        p_room:           isLive ? (_g.room || '') : '',
      });
      if (error) _log('Global "go live" status not published: ' + error.message);
    } catch (e) { _log('Global "go live" status failed: ' + (e.message || e)); }
  }

  // Hindrar to samtidige globale overtakingar (eigaren og ein gjest, eller to
  // gjester) frå å kjempe om SAME delte rad — den som kjem sist ville elles
  // stille overskrive/kasta ut den fyrste midt i sendinga (rapportert
  // 2026-09-21: «det må aldri hakke eller stoppe under live»). Same
  // ferskleik-regel (STALE_MS) som js/liveGlobal.js sin _isStale().
  const LIVE_STALE_MS = 150000;
  async function _someoneElseAlreadyLive() {
    try {
      if (typeof SC_Storage === 'undefined' || !SC_Storage.isConfigured || !SC_Storage.isConfigured()) return false;
      const { data, error } = await SC_Storage.client().rpc('get_live_broadcast_status');
      if (error || data == null) return false;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row || !row.is_live) return false;
      if (row.room === _g.room) return false; // vår eigen (t.d. re-opna konsollen)
      if (row.updated_at && Date.now() - new Date(row.updated_at).getTime() > LIVE_STALE_MS) return false; // forelda rad
      return true;
    } catch (e) { return false; }
  }

  function goLive(id) {
    if (typeof App === 'undefined') return;
    if (!window.LiveBroadcast) { App.toast('Broadcasting could not be loaded (livebroadcast.js missing).', 'error'); return; }
    const req = _mineCache.find(r => r.id === id);
    if (!req) return;
    if (!_g.dj) {
      if (req.status !== 'live' && (req.status !== 'approved' || !_isWindowActive(req))) {
        App.toast('This request is not approved/active right now.', 'error');
        return;
      }
      _g.req = req;
      _g.room = req.room;
    }
    _renderDJ();
  }

  function _renderDJ() {
    const box = _byId('modal-box'); if (!box) return;
    const live = !!_g.dj;
    const inp = 'width:100%;box-sizing:border-box;padding:0.6rem 0.7rem;border-radius:10px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.04);color:var(--text);font:inherit';
    const lbl = 'display:block;font-weight:700;font-size:0.78rem;margin:0 0 0.35rem;color:var(--text2);text-transform:uppercase;letter-spacing:0.04em';
    const meter = 'height:18px;border-radius:6px;background:rgba(0,0,0,0.35);overflow:hidden;position:relative';
    const fill = 'position:absolute;inset:0 auto 0 0;width:0%;background:linear-gradient(90deg,#22c55e,#22c55e 60%,#f59e0b 80%,#ef4444);transition:width .05s';
    box.innerHTML = `
      <div class="modal-header">
        <h2>${_I('radio')} Go live — ${_esc((_g.req && _g.req.display_name) || '')}</h2>
        <button class="btn-icon" onclick="App.closeModal()" aria-label="Close">${_I('x')}</button>
      </div>
      <div style="padding:0.25rem 0">
        <p style="color:var(--text2);font-size:0.85rem;line-height:1.5;margin:0 0 1rem">
          Route your DJ software's master output to a virtual audio cable (e.g. BlackHole) and select it below.
          Going live automatically switches over EVERYONE currently on SiriusFM — same as the owner's stream — and switches back the moment you stop.
        </p>
        <label style="${lbl}">Audio input</label>
        <div style="display:flex;gap:0.6rem;margin:0 0 1rem">
          <select id="lg-dev" ${live ? 'disabled' : ''} style="${inp};flex:1">${live ? '' : '<option>Click "Grant access" first…</option>'}</select>
          <button class="btn btn-ghost" id="lg-perm" onclick="LiveGuest.bcPerm()" ${live ? 'disabled' : ''}>Grant access</button>
        </div>
        <div style="display:flex;gap:0.6rem;align-items:center;flex-wrap:wrap;margin:0 0 1.1rem">
          <button class="btn btn-primary" id="lg-go" onclick="LiveGuest.bcGo()" ${live ? 'disabled' : ''}>📡 Go live</button>
          <button class="btn" id="lg-stop" onclick="LiveGuest.bcStop()" ${live ? '' : 'disabled'} style="background:#ef4444;color:#fff">■ Stop</button>
          <span style="display:inline-flex;align-items:center;gap:0.4rem;font-size:0.8rem;font-weight:700;padding:0.25rem 0.7rem;border-radius:999px;background:rgba(255,255,255,0.06)">
            <span id="lg-dot" style="width:9px;height:9px;border-radius:50%;background:${live ? '#ef4444' : '#9aa3b2'}"></span>
            <span id="lg-status">${live ? 'LIVE — broadcasting' : 'Inactive'}</span>
          </span>
        </div>
        <div style="font-size:1.5rem;font-weight:800;margin:0 0 0.75rem"><span id="lg-count">${live ? _g.dj.listeners : 0}</span> <span style="font-size:0.85rem;font-weight:400;color:var(--text2)">listeners connected</span></div>
        <div style="display:flex;justify-content:space-between;font-size:0.72rem;color:var(--text2);margin:0 0 0.2rem"><span>Sent (L)</span><span id="lg-ldb">−∞ dB</span></div>
        <div style="${meter}"><i id="lg-lmeter" style="${fill}"></i></div>
        <div style="display:flex;justify-content:space-between;font-size:0.72rem;color:var(--text2);margin:0.5rem 0 0.2rem"><span>Sent (R)</span><span id="lg-rdb">−∞ dB</span></div>
        <div style="${meter}"><i id="lg-rmeter" style="${fill}"></i></div>
        <div id="lg-log" style="font:12px/1.5 ui-monospace,monospace;background:rgba(0,0,0,0.3);border-radius:10px;padding:0.6rem 0.7rem;max-height:120px;overflow:auto;color:var(--text2);white-space:pre-wrap;margin-top:0.9rem">Ready.</div>
      </div>`;
    App.openModal();
    if (live && _g.analL) _bcStartMeter();
  }

  function _log(m) { const l = _byId('lg-log'); if (!l) return; l.textContent += '\n' + new Date().toLocaleTimeString('en-US') + '  ' + m; l.scrollTop = l.scrollHeight; }

  async function bcPerm() {
    try {
      const tmp = await navigator.mediaDevices.getUserMedia({ audio: true });
      tmp.getTracks().forEach(t => t.stop());
      const devs = (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'audioinput');
      const sel = _byId('lg-dev'); if (!sel) return;
      sel.innerHTML = '';
      devs.forEach(d => { const o = document.createElement('option'); o.value = d.deviceId; o.textContent = d.label || ('Input ' + (sel.length + 1)); sel.appendChild(o); });
      const pref = devs.find(d => /blackhole|loopback|soundflower|air 192|aggregate/i.test(d.label));
      if (pref) sel.value = pref.deviceId;
      const go = _byId('lg-go'); if (go) go.disabled = false;
      _log(devs.length + ' input(s).' + (pref ? '  Suggested: ' + pref.label : ''));
    } catch (e) { _log('ERROR access: ' + e.message); }
  }

  async function bcGo() {
    try {
      const cur = Auth.current(); if (!cur || !_g.req) return;
      // Berre ÉIN kan eige den delte overtakinga om gongen — utan denne sjekken
      // kunne ein andre sending (eigaren eller ein annan gjest) blitt stille
      // overskrive/kasta ut midt i eiga sending (rapportert 2026-09-21: må
      // aldri hakke eller stoppe under live).
      if (await _someoneElseAlreadyLive()) {
        _log('ERROR: someone else is already live right now.');
        if (typeof App !== 'undefined') App.toast('Someone else is already live on SiriusFM right now — try again once they finish.', 'error', 5000);
        return;
      }
      const sel = _byId('lg-dev');
      _g.stream = await navigator.mediaDevices.getUserMedia({ audio: {
        deviceId: { exact: sel.value }, echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 2,
      } });
      _g.ctx = new (window.AudioContext || window.webkitAudioContext)(); await _g.ctx.resume();
      const src = _g.ctx.createMediaStreamSource(_g.stream), sp = _g.ctx.createChannelSplitter(2);
      _g.analL = _g.ctx.createAnalyser(); _g.analR = _g.ctx.createAnalyser(); _g.analL.fftSize = _g.analR.fftSize = 1024;
      src.connect(sp); sp.connect(_g.analL, 0); sp.connect(_g.analR, 1);
      _bcStartMeter();
      // Same peak-limiter FØR sendingen går ut som js/livemix.js sin eigar-flyt
      // (reint klippevern, IKKJE musikk-komprimering — DSP over er framleis av
      // for sjølve opptaket). Gjeld no ALLE som går live, ikkje berre eigaren
      // (brukarønske 2026-09-21: «heller ikke peake»).
      const limiter = _g.ctx.createDynamicsCompressor();
      limiter.threshold.value = -1; limiter.knee.value = 0; limiter.ratio.value = 20;
      limiter.attack.value = 0.003; limiter.release.value = 0.1;
      const dest = _g.ctx.createMediaStreamDestination();
      src.connect(limiter); limiter.connect(dest);
      _g.outStream = dest.stream;
      _g.dj = LiveBroadcast.broadcaster(_g.room, _g.outStream, {
        onPeerCount: n => { const el = _byId('lg-count'); if (el) el.textContent = n; },
        onLog: _log,
      });
      _bcSetLive(true);
      _log('You are LIVE in room "' + _g.room + '". Play in your DJ software.');
      await LiveBroadcastSync.markStarted(_g.req.id, cur.username);
      const r = _mineCache.find(x => x.id === _g.req.id); if (r) r.status = 'live';
      _publishGlobalLiveStatus(true);
      // Held den delte rada FERSK medan sendinga pågår — utan denne ville
      // js/liveGlobal.js sin ferskleik-sjekk (STALE_MS) rekna sendinga som
      // forelda etter 2,5 min og bytt ALLE besøkende stille tilbake til
      // 24/7-hjulet midt i settet (same heartbeat-mønster som js/livemix.js).
      if (_g.heartbeatTimer) clearInterval(_g.heartbeatTimer);
      _g.heartbeatTimer = setInterval(() => { if (_g.dj) _publishGlobalLiveStatus(true); }, 45000);
    } catch (e) { _log('ERROR going live: ' + e.message); if (typeof App !== 'undefined') App.toast('Could not go live: ' + e.message, 'error'); }
  }

  async function bcStop() {
    const cur = Auth.current();
    if (_g.heartbeatTimer) { clearInterval(_g.heartbeatTimer); _g.heartbeatTimer = null; }
    _publishGlobalLiveStatus(false); // fire-and-forget: gjer alle besøkende tilbake til 24/7-hjulet
    if (_g.raf) cancelAnimationFrame(_g.raf); _g.raf = null;
    if (_g.dj) { _g.dj.stop(); _g.dj = null; }
    if (_g.stream) { _g.stream.getTracks().forEach(t => t.stop()); _g.stream = null; }
    if (_g.outStream) { _g.outStream.getTracks().forEach(t => t.stop()); _g.outStream = null; }
    if (_g.ctx) { try { _g.ctx.close(); } catch (e) {} _g.ctx = null; }
    _g.analL = _g.analR = null;
    _bcSetLive(false);
    const c = _byId('lg-count'); if (c) c.textContent = '0';
    _log('Stopped.');
    if (cur && _g.req) {
      await LiveBroadcastSync.markEnded(_g.req.id, cur.username);
      const r = _mineCache.find(x => x.id === _g.req.id); if (r) r.status = 'completed';
      if (!(_g.req.thumbnail_url) && typeof App !== 'undefined') App.toast('Broadcast ended! Remember to choose a preview image on your page so it shows up in the archive.', 'info', 6000);
    }
    _g.req = null;
  }

  function _bcSetLive(live) {
    const go = _byId('lg-go'), stop = _byId('lg-stop'), perm = _byId('lg-perm'), dev = _byId('lg-dev'), dot = _byId('lg-dot'), st = _byId('lg-status');
    if (go) go.disabled = live; if (stop) stop.disabled = !live; if (perm) perm.disabled = live; if (dev) dev.disabled = live;
    if (dot) dot.style.background = live ? '#ef4444' : '#9aa3b2';
    if (st) st.textContent = live ? 'LIVE — broadcasting' : 'Inactive';
  }

  function _bcStartMeter() {
    if (_g.raf) cancelAnimationFrame(_g.raf);
    const toDb = r => r > 0 ? 20 * Math.log10(r) : -Infinity;
    const fmt = d => d === -Infinity ? '−∞ dB' : d.toFixed(1) + ' dB';
    const pct = d => d === -Infinity ? 0 : Math.max(0, Math.min(100, (d + 60) / 60 * 100));
    const bL = new Float32Array(_g.analL.fftSize), bR = new Float32Array(_g.analR.fftSize);
    (function loop() {
      if (!_g.analL || !_g.analR) { _g.raf = null; return; }
      _g.analL.getFloatTimeDomainData(bL); _g.analR.getFloatTimeDomainData(bR);
      let sL = 0, sR = 0; for (let i = 0; i < bL.length; i++) { sL += bL[i] * bL[i]; sR += bR[i] * bR[i]; }
      const dL = toDb(Math.sqrt(sL / bL.length)), dR = toDb(Math.sqrt(sR / bR.length));
      const lm = _byId('lg-lmeter'), rm = _byId('lg-rmeter'), ld = _byId('lg-ldb'), rd = _byId('lg-rdb');
      if (lm) lm.style.width = pct(dL) + '%'; if (rm) rm.style.width = pct(dR) + '%';
      if (ld) ld.textContent = fmt(dL); if (rd) rd.textContent = fmt(dR);
      _g.raf = requestAnimationFrame(loop);
    })();
  }

  // ── Lytter: hør en spesifikk ekstern sending (eget rom, rører ALDRI #audio-engine) ──
  function tuneIn(room, name) {
    if (typeof App === 'undefined') return;
    if (!window.LiveBroadcast) { App.toast('Broadcasting could not be loaded.', 'error'); return; }
    // Sidan gjeste-sendingar no OGSÅ trigger den globale overtakinga
    // (_publishGlobalLiveStatus i bcGo), høyrer besøkende som alt er på sida
    // automatisk på denne sendinga gjennom hovudspelaren (js/liveGlobal.js).
    // Ei ny, parallell WebRTC-tilkobling HER attpå ville gitt dobbel
    // lyd/ekko — nøyaktig det brukarønsket 2026-09-21 sa aldri skal skje
    // under live. Alt aktivt der → berre informer, ikkje koble til på nytt.
    if (typeof Radio !== 'undefined' && Radio.isLiveTakeoverActive && Radio.isLiveTakeoverActive()) {
      App.toast('You\'re already listening — it\'s playing through the main SiriusFM player.', 'info', 4000);
      return;
    }
    _g.room = room;
    _renderListener(name || '');
  }

  function _renderListener(name) {
    const box = _byId('modal-box'); if (!box) return;
    box.innerHTML = `
      <div class="modal-header">
        <h2>${_I('headphones')} Listen live${name ? ' — ' + _esc(name) : ''}</h2>
        <button class="btn-icon" onclick="LiveGuest.tuneOut()" aria-label="Close">${_I('x')}</button>
      </div>
      <div style="padding:0.5rem 0;text-align:center">
        <span style="display:inline-flex;align-items:center;gap:0.45rem;font-size:0.82rem;font-weight:700;padding:0.3rem 0.8rem;border-radius:999px;background:rgba(255,255,255,0.06);margin-bottom:0.9rem">
          <span id="lg-ln-dot" style="width:10px;height:10px;border-radius:50%;background:#9aa3b2"></span>
          <span id="lg-ln-status">Connecting…</span>
        </span>
        <audio id="lg-ln-audio" autoplay playsinline></audio>
        <div id="lg-ln-info" style="font-size:0.78rem;color:var(--text3);margin-top:0.9rem"></div>
      </div>`;
    App.openModal();
    _lnStatus('Connecting…', false);
    _g.listening = true;
    _g.ended = false;
    _g.jingled = false;
    _spawnGuestListener(name);
  }

  function _spawnGuestListener(name) {
    _g.ln = LiveBroadcast.listener(_g.room, {
      onState: s => {
        if (s === 'connected') _lnStatus('LIVE — listening to the set', true);
        else if (s === 'dj-offline') { _g.ended = true; _lnStatus('Broadcast ended', false); }
        else if (['failed', 'disconnected', 'closed'].includes(s)) {
          _lnStatus('Disconnected', false);
          // Kort nettverksglipp på DENNE eininga (ikkje at artisten faktisk
          // slutta — det melder 'dj-offline' eksplisitt over) → DJ-sida
          // (js/livebroadcast.js) lukker peeren for godt, kjem aldri av seg
          // sjølv attende. Byggjer stille ein ny lytter-tilkobling så lenge
          // modalen framleis er open og sendinga ikkje er meldt avslutta (same
          // feilmønster/fiks som js/liveGlobal.js, rapportert 2026-09-20).
          if (_lnReconnecting || _g.ended || !_g.listening) return;
          _lnReconnecting = true;
          if (_g.ln) { try { _g.ln.leave(); } catch (e) {} _g.ln = null; }
          setTimeout(() => {
            _lnReconnecting = false;
            if (_g.listening && !_g.ended) _spawnGuestListener(name);
          }, 1500);
        }
      },
      onTrack: stream => {
        const attach = () => { const a = _byId('lg-ln-audio'); if (a) { a.srcObject = stream; a.play().catch(() => {}); } };
        if (_g.jingled) { attach(); return; }   // gjenoppkobling — ikkje spel intro-jingelen om att
        _g.jingled = true;
        _playLiveJingle(name, attach);
      },
      onLog: m => { const i = _byId('lg-ln-info'); if (i) i.textContent = m; },
    });
  }

  function _lnStatus(t, live) {
    const s = _byId('lg-ln-status'), d = _byId('lg-ln-dot');
    if (s) s.textContent = t; if (d) d.style.background = live ? '#22c55e' : '#9aa3b2';
  }

  function tuneOut() {
    _g.listening = false;   // stopp ev. ventande gjenoppkoblingsforsøk (sjå _spawnGuestListener)
    if (_g.ln) { _g.ln.leave(); _g.ln = null; }
    if (typeof App !== 'undefined') App.closeModal();
  }

  // ── Selvmonterende «🔴 Live nå»-fane (synlig for ALLE, ikke bare eier) ────────
  // Same DOM-innsettingsmønster som js/livemix.js sin _mountOwnerButton — plasserer
  // en pille rett før #nav-links, som overlever at renderNav bygger #nav-links på nytt.
  let _pill = null, _pollTimer = null, _liveNow = [];
  function _mountBanner() {
    if (!_pill) {
      _pill = document.createElement('button');
      _pill.id = 'liveguest-banner-btn';
      _pill.type = 'button';
      _pill.style.cssText = 'display:none;align-items:center;gap:0.35rem;font-size:0.75rem;font-weight:700;padding:0.3rem 0.7rem;border-radius:999px;border:1px solid rgba(239,68,68,0.35);background:rgba(239,68,68,0.12);color:#ef4444;cursor:pointer;margin-right:0.5rem;white-space:nowrap';
      _pill.onclick = _openLiveNowModal;
      const nav = document.getElementById('main-nav');
      const links = document.getElementById('nav-links');
      if (nav && links) nav.insertBefore(_pill, links);
      else if (nav) nav.appendChild(_pill);
    }
    _poll();
    if (!_pollTimer) _pollTimer = setInterval(_poll, 8000);
  }

  async function _poll() {
    if (!LiveBroadcastSync._enabled()) return;
    _liveNow = await LiveBroadcastSync.listLiveNow();
    if (!_pill) return;
    if (_liveNow.length) {
      _pill.style.display = 'inline-flex';
      _pill.innerHTML = '🔴 Live now' + (_liveNow.length > 1 ? ' (' + _liveNow.length + ')' : '');
    } else {
      _pill.style.display = 'none';
    }
  }

  function _openLiveNowModal() {
    if (typeof App === 'undefined' || !_liveNow.length) return;
    const box = _byId('modal-box'); if (!box) return;
    box.innerHTML = `
      <div class="modal-header">
        <h2>🔴 Live now</h2>
        <button class="btn-icon" onclick="App.closeModal()" aria-label="Close">${_I('x')}</button>
      </div>
      <div style="padding:0.5rem 0;display:grid;gap:0.7rem">
        ${_liveNow.map(b => `
          <div style="display:flex;align-items:center;gap:0.75rem;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:0.75rem 0.9rem">
            ${b.thumbnail_url ? `<img src="${_esc(b.thumbnail_url)}" alt="" style="width:48px;height:48px;object-fit:cover;border-radius:10px;flex-shrink:0">` : ''}
            <div style="flex:1;min-width:0">
              <div style="font-weight:800">${_esc(b.display_name)}</div>
              <div style="font-size:0.78rem;color:var(--text2)">Live now</div>
            </div>
            <button class="btn btn-primary" onclick="LiveGuest.tuneIn('${_esc(b.room)}','${_esc(b.display_name).replace(/'/g, "\\'")}')">▶︎ Listen</button>
          </div>`).join('')}
      </div>`;
    App.openModal();
  }

  function _initBanner() {
    _mountBanner();
    window.addEventListener('hashchange', _mountBanner);
  }
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', _initBanner);
    else _initBanner();
  }

  return {
    openApply, step, submitApply, renderMine, pickThumbnail, cancelRequest,
    goLive, bcPerm, bcGo, bcStop, tuneIn, tuneOut,
  };
})();

if (typeof window !== 'undefined') window.LiveGuest = LiveGuest;
