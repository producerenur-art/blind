// LiveGuestAdmin — eierens godkjenningskø for eksterne live-forespørsler
// (js/liveGuest.js). Klientside-visningsgate er kosmetisk — den EKTE grensen
// er p_secret-sjekken inne i RPC-ene (list_broadcast_requests_admin/
// review_broadcast_request i supabase/migrations/0025_live_broadcasts.sql),
// same tillitsmodell som js/livemix.js sin globale «gå live»-bryter.
const LiveGuestAdmin = (() => {
  function _I(name) { return (typeof Icon === 'function') ? Icon(name) : ''; }
  function _esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  function _byId(id) { return document.getElementById(id); }

  // Samlet admin-e-postliste, CONFIG.ADMIN_EMAILS (js/config.js) — samme kilde
  // som js/livemix.js sin _isOwner(), js/community.js/livePresence.js sin
  // _isAdmin() og Auth.current() sin gratis-Pro-bypass.
  function _isOwner(cur) {
    return typeof CONFIG !== 'undefined' && CONFIG.isAdminEmail(cur);
  }

  function _fmtDateTime(iso) {
    if (!iso) return 'To be agreed';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso);
    return d.toLocaleString('en-US', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
  }

  const GROUPS = [
    { key: 'pending',   title: 'Pending approval' },
    { key: 'approved',  title: 'Approved — upcoming' },
    { key: 'live',      title: '🔴 Live now' },
    { key: 'past',      title: 'Past (rejected / completed / cancelled)' },
  ];

  let _cache = [];
  async function render() {
    const app = _byId('app');
    if (!app) return;
    const cur = (typeof Auth !== 'undefined' && Auth.current) ? Auth.current() : null;
    if (!_isOwner(cur)) {
      app.innerHTML = `<div style="max-width:600px;margin:3rem auto;text-align:center;color:var(--text2)">This page is for the owner only.</div>`;
      return;
    }
    app.innerHTML = `
      <div style="max-width:820px;margin:0 auto;padding:1.5rem 1rem 4rem">
        <h1 style="margin:0 0 1.25rem;font-size:1.6rem;font-weight:800">${_I('radio')} Broadcast requests</h1>
        <div id="lga-list">Loading…</div>
      </div>`;
    window.scrollTo(0, 0);
    await _load();
  }

  async function _load() {
    const list = _byId('lga-list');
    if (!list) return;
    if (!LiveBroadcastSync._enabled()) { list.innerHTML = `<div style="color:var(--text2);font-size:0.9rem">Requires cloud storage to be set up (Supabase).</div>`; return; }
    _cache = await LiveBroadcastSync.listPending();
    if (!_cache.length) { list.innerHTML = `<div style="color:var(--text2);font-size:0.9rem">No requests yet.</div>`; return; }
    const byStatus = { pending: [], approved: [], live: [], past: [] };
    for (const r of _cache) {
      if (r.status === 'pending') byStatus.pending.push(r);
      else if (r.status === 'approved') byStatus.approved.push(r);
      else if (r.status === 'live') byStatus.live.push(r);
      else byStatus.past.push(r);
    }
    list.innerHTML = GROUPS.map(g => {
      const items = byStatus[g.key];
      if (!items.length) return '';
      return `
        <div style="margin:0 0 1.5rem">
          <div style="font-weight:800;font-size:0.85rem;text-transform:uppercase;letter-spacing:0.04em;color:var(--text2);margin:0 0 0.6rem">${_esc(g.title)} (${items.length})</div>
          <div style="display:grid;gap:0.75rem">${items.map(_row).join('')}</div>
        </div>`;
    }).join('') || `<div style="color:var(--text2);font-size:0.9rem">No requests yet.</div>`;
  }

  function _row(r) {
    return `
      <div style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:1rem 1.1rem">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:0.75rem;flex-wrap:wrap;margin:0 0 0.4rem">
          <div style="font-weight:800;font-size:1.02rem">${_esc(r.display_name)}</div>
          <div style="font-size:0.78rem;color:var(--text3)">@${_esc(r.requester_username)}</div>
        </div>
        <div style="font-size:0.85rem;color:var(--text2);margin:0 0 0.3rem">${_fmtDateTime(r.requested_start)} · ${r.requested_hours} ${r.requested_hours > 1 ? 'hours' : 'hour'}</div>
        <div style="font-size:0.8rem;color:var(--text3);margin:0 0 0.3rem">${_esc(r.requester_email)}</div>
        ${r.message ? `<div style="font-size:0.85rem;color:var(--text2);margin:0.4rem 0;padding:0.5rem 0.7rem;background:rgba(255,255,255,.03);border-radius:8px">${_esc(r.message)}</div>` : ''}
        ${r.status === 'pending' ? `
        <div style="display:flex;gap:0.6rem;margin-top:0.6rem">
          <button class="btn btn-primary" onclick="LiveGuestAdmin.approve('${_esc(r.id)}')">${_I('check')} Approve</button>
          <button class="btn btn-ghost" onclick="LiveGuestAdmin.reject('${_esc(r.id)}')">${_I('x')} Reject</button>
        </div>` : ''}
      </div>`;
  }

  async function approve(id) {
    const cur = Auth.current();
    const ok = await LiveBroadcastSync.review(id, 'approved', cur ? cur.username : 'owner');
    if (typeof App !== 'undefined') App.toast(ok ? 'Approved!' : 'Could not approve.', ok ? 'success' : 'error');
    await _load();
  }

  async function reject(id) {
    const reason = (typeof prompt === 'function') ? (prompt('Reason (optional):') || '') : '';
    const cur = Auth.current();
    const ok = await LiveBroadcastSync.review(id, 'rejected', cur ? cur.username : 'owner', reason);
    if (typeof App !== 'undefined') App.toast(ok ? 'Rejected.' : 'Could not reject.', ok ? 'info' : 'error');
    await _load();
  }

  return { render, approve, reject, _isOwner };
})();

if (typeof window !== 'undefined') window.LiveGuestAdmin = LiveGuestAdmin;
