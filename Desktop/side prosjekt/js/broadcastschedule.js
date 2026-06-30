// BroadcastSchedule — sendetider brukerne setter selv.
// Hver bruker velger sine egne sendetider (uavhengig av betalt Live Mix-booking).
// Tidene lagres på brukerprofilen (user.broadcasts) og vises to steder:
//   • #/sendinger      — samlet fane (live nå + kommende) for ALLE brukere
//   • profil-siden      — den enkelte brukerens egne sendetider
// «Hør live» kobler lytteren til DJ-ens rom. «Gå live» går via den vanlige
// DJ-konsollen (LiveMix.goLive), som beholder sin egen booking-/eier-gate.
const BroadcastSchedule = (() => {
  const KEY   = 'broadcasts';        // user.broadcasts = [{ id, slot, hours, room, title, createdAt }]
  const GRACE = 10 * 60 * 1000;      // 10 min slingringsmonn før start (samme som booking-gaten)
  const MAX_HOURS = 12;

  const _I  = (n) => (typeof Icon === 'function' ? Icon(n) : '');
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
  const me  = () => (typeof Auth !== 'undefined' && Auth.current ? Auth.current() : null);
  const val = (id) => { const el = document.getElementById(id); return el ? el.value : ''; };

  function _uid() { return 'bc_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  function _roomFor(name) {
    return String(name || '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 40) || 'test';
  }

  // ── Tidsformat (norsk bokmål) ───────────────────────────────────────────
  function _fmtDateTime(iso) {
    if (!iso) return 'Avtales senere';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso);
    return d.toLocaleString('nb-NO', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
  }
  function _fmtTimeRange(b) {
    const w = _window(b);
    if (!w) return '';
    const t = ms => new Date(ms).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' });
    return t(w.start) + '–' + t(w.end);
  }
  function _fmtDay(iso) {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const that = new Date(d); that.setHours(0, 0, 0, 0);
    const dayDiff = Math.round((that - today) / 86400000);
    if (dayDiff === 0) return 'I dag';
    if (dayDiff === 1) return 'I morgen';
    return d.toLocaleDateString('nb-NO', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  // ── Data ────────────────────────────────────────────────────────────────
  function entriesOf(user) {
    const list = (user && Array.isArray(user[KEY])) ? user[KEY].slice() : [];
    return list.filter(b => b && b.slot).sort((a, b) => new Date(a.slot) - new Date(b.slot));
  }
  function _window(b) {
    if (!b || !b.slot) return null;
    const start = new Date(b.slot).getTime();
    if (isNaN(start)) return null;
    return { start, end: start + Math.max(1, b.hours || 1) * 3600 * 1000 };
  }
  // 'live' = innenfor sendevinduet nå (med slingringsmonn) · 'upcoming' · 'past'
  function statusOf(b) {
    const w = _window(b);
    if (!w) return 'past';
    const now = Date.now();
    if (now >= w.start - GRACE && now < w.end) return 'live';
    return now < w.start ? 'upcoming' : 'past';
  }
  // Brukerens neste relevante sendetid (live nå, ellers nærmeste kommende).
  function nextOf(user) {
    const list = entriesOf(user);
    return list.find(b => statusOf(b) === 'live') || list.find(b => statusOf(b) === 'upcoming') || null;
  }

  // Alle sendetider på tvers av brukere — live + kommende, tagget med eier.
  function _allActive() {
    const users = (typeof Auth !== 'undefined' && Auth.getUsers) ? Auth.getUsers() : {};
    const out = [];
    for (const uname in users) {
      const u = users[uname];
      for (const b of entriesOf(u)) {
        const st = statusOf(b);
        if (st === 'past') continue;
        out.push({ ...b, status: st, username: u.username, displayName: u.displayName || u.username, role: u.role || 'lytter' });
      }
    }
    // Live øverst, deretter kronologisk.
    out.sort((a, b) => (a.status === 'live' ? 0 : 1) - (b.status === 'live' ? 0 : 1) || new Date(a.slot) - new Date(b.slot));
    return out;
  }

  // ── Felles kort-bygging ──────────────────────────────────────────────────
  const ROLE = { lytter: '🎧 Lytter', dj: '🎛️ DJ', produsent: '🎹 Produsent', plateselskap: '🏷️ Plateselskap' };

  function _liveBadge(status) {
    return status === 'live'
      ? `<span style="display:inline-flex;align-items:center;gap:0.35rem;font-size:0.72rem;font-weight:800;padding:0.2rem 0.6rem;border-radius:999px;background:rgba(239,68,68,0.15);color:#ef4444"><span style="width:8px;height:8px;border-radius:50%;background:#ef4444;animation:pulse 1s infinite"></span> LIVE NÅ</span>`
      : `<span style="display:inline-flex;align-items:center;gap:0.35rem;font-size:0.72rem;font-weight:700;padding:0.2rem 0.6rem;border-radius:999px;background:rgba(245,158,11,0.14);color:#f59e0b">${_I('clock')} Kommende</span>`;
  }

  // ── #/sendinger — samlet fane ────────────────────────────────────────────
  function render() {
    const app = document.getElementById('app');
    if (!app) return;
    const cur  = me();
    const list = _allActive();
    const live = list.filter(e => e.status === 'live');
    const soon = list.filter(e => e.status === 'upcoming');

    const cardFor = (e) => {
      const a = '#/u/' + encodeURIComponent(e.username);
      const mine = cur && cur.username === e.username;
      let action;
      if (e.status === 'live') {
        action = mine
          ? `<button class="btn btn-primary btn-sm" onclick="BroadcastSchedule.goLive('${esc(e.room)}')" style="flex:0 0 auto">${_I('radio')} Gå live</button>`
          : `<button class="btn btn-primary btn-sm" onclick="BroadcastSchedule.listen('${esc(e.room)}')" style="flex:0 0 auto">${_I('headphones')} Hør live</button>`;
      } else {
        action = `<a href="${a}" class="btn btn-ghost btn-sm" style="flex:0 0 auto">${_I('user')} Profil</a>`;
      }
      return `
        <div style="display:flex;align-items:center;gap:0.9rem;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:0.85rem 1rem;margin:0 0 0.7rem">
          <a href="${a}" style="width:46px;height:46px;border-radius:50%;background:linear-gradient(135deg,#f59e0b,#f472b6);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1.1rem;color:#1a1205;text-decoration:none;flex:0 0 auto">${esc((e.displayName || '?').charAt(0).toUpperCase())}</a>
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap">
              <a href="${a}" style="font-weight:800;color:var(--text);text-decoration:none">${esc(e.displayName)}</a>
              ${_liveBadge(e.status)}
            </div>
            <div style="color:var(--text2);font-size:0.85rem;margin-top:0.15rem">
              ${e.title ? `<strong style="color:var(--text)">${esc(e.title)}</strong> · ` : ''}${esc(ROLE[e.role] || '')}
            </div>
            <div style="color:var(--text3);font-size:0.8rem;margin-top:0.1rem">${_I('clock')} ${esc(_fmtDay(e.slot))} · ${esc(_fmtTimeRange(e))}</div>
          </div>
          ${action}
        </div>`;
    };

    const section = (title, items, emptyMsg) => `
      <div style="margin:0 0 1.6rem">
        <h2 style="font-size:1.05rem;font-weight:800;margin:0 0 0.8rem;display:flex;align-items:center;gap:0.5rem">${title}</h2>
        ${items.length ? items.map(cardFor).join('') : `<p style="color:var(--text3);font-size:0.9rem;margin:0">${emptyMsg}</p>`}
      </div>`;

    app.innerHTML = `
      <div style="max-width:720px;margin:0 auto;padding:1.5rem 1rem 4rem">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;flex-wrap:wrap;margin:0 0 0.4rem">
          <div>
            <h1 style="font-size:1.6rem;font-weight:900;margin:0;display:flex;align-items:center;gap:0.6rem">${_I('radio')} Sendinger</h1>
            <p style="color:var(--text2);font-size:0.92rem;margin:0.35rem 0 0;max-width:46ch">Se hvem som sender live nå og når neste sett kommer. Sett din egen sendetid så lytterne vet når de skal stille inn.</p>
          </div>
          <button class="btn btn-primary" onclick="BroadcastSchedule.openEditor()">${_I('plus')} ${cur ? 'Sett sendetid' : 'Logg inn for å sende'}</button>
        </div>
        <div style="height:1px;background:rgba(255,255,255,0.08);margin:1.2rem 0 1.6rem"></div>
        ${section(`<span style="width:10px;height:10px;border-radius:50%;background:#ef4444;display:inline-block;animation:pulse 1s infinite"></span> Live nå`, live, 'Ingen sender live akkurat nå.')}
        ${section(`${_I('calendar')} Kommende sendinger`, soon, 'Ingen planlagte sendinger ennå. Bli den første — sett din sendetid!')}
      </div>`;
  }

  // ── Profil-seksjon (vises i OM-fanen på hver profil) ──────────────────────
  function profileSection(user, isOwner, theme) {
    const list = entriesOf(user).filter(b => statusOf(b) !== 'past');
    if (!list.length && !isOwner) return '';
    const t = theme || {};
    const primary = t.primaryColor || 'var(--accent)';
    const text    = t.textColor || '#fff';
    const card = (b) => {
      const st = statusOf(b);
      // Live: eieren ser «Gå live», andre ser «Hør live». Kommende: ingen knapp (bare tid).
      let action = '';
      if (st === 'live') {
        action = isOwner
          ? `<button class="btn btn-primary btn-sm" onclick="BroadcastSchedule.goLive('${esc(b.room)}')">${_I('radio')} Gå live</button>`
          : `<button class="btn btn-primary btn-sm" onclick="BroadcastSchedule.listen('${esc(b.room)}')">${_I('headphones')} Hør live</button>`;
      }
      return `
        <div style="display:flex;align-items:center;gap:0.75rem;padding:0.6rem 0;border-top:1px solid ${text}1a">
          <div style="flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap">
              ${b.title ? `<strong>${esc(b.title)}</strong>` : '<span style="opacity:0.8">Live-sett</span>'}
              ${_liveBadge(st)}
            </div>
            <div style="opacity:0.7;font-size:0.82rem;margin-top:0.1rem">${esc(_fmtDay(b.slot))} · ${esc(_fmtTimeRange(b))}</div>
          </div>
          ${action}
          ${isOwner ? `<button class="btn btn-ghost btn-sm" title="Fjern" onclick="BroadcastSchedule.removeEntry('${b.id}','${esc(user.username)}')">${_I('trash')}</button>` : ''}
        </div>`;
    };
    return `
      <div style="margin:1rem 0;padding:0.9rem 1.1rem;border-radius:14px;background:${primary}14;border:1px solid ${primary}33">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:0.75rem">
          <div style="font-weight:800;display:flex;align-items:center;gap:0.5rem">${_I('radio')} Sendetider</div>
          ${isOwner ? `<button class="btn btn-ghost btn-sm" onclick="BroadcastSchedule.openEditor()">${_I('edit')} Endre</button>` : ''}
        </div>
        ${list.length
          ? list.map(card).join('')
          : `<div style="opacity:0.7;font-size:0.88rem;margin-top:0.5rem">Du har ingen planlagte sendinger. <a href="#" onclick="BroadcastSchedule.openEditor();return false" style="color:${primary};font-weight:700">Sett din sendetid →</a></div>`}
      </div>`;
  }

  // ── Editor (egen sendeplan) ───────────────────────────────────────────────
  function openEditor() {
    const cur = me();
    if (!cur) {
      if (typeof App !== 'undefined') App.toast('Logg inn eller lag en gratis profil for å sette sendetid.', 'info', 4000);
      location.hash = '#/login';
      return;
    }
    _renderEditor();
  }

  function _renderEditor() {
    const box = document.getElementById('modal-box');
    const cur = me();
    if (!box || !cur || typeof App === 'undefined') return;
    const list = entriesOf(cur).filter(b => statusOf(b) !== 'past');

    // Standard = i morgen kl. 20:00 (lokal tid) som datetime-local-verdi.
    const start = new Date(Date.now() + 24 * 3600 * 1000); start.setHours(20, 0, 0, 0);
    const localISO = new Date(start.getTime() - start.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    const inp = 'width:100%;box-sizing:border-box;padding:0.6rem 0.7rem;border-radius:10px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.04);color:var(--text);font:inherit';
    const lbl = 'display:block;font-weight:700;font-size:0.78rem;margin:0 0 0.35rem;color:var(--text2)';

    const rowOf = (b) => `
      <div style="display:flex;align-items:center;gap:0.6rem;padding:0.5rem 0;border-top:1px solid rgba(255,255,255,0.08)">
        <div style="flex:1;min-width:0">
          <div style="font-weight:700;font-size:0.9rem">${b.title ? esc(b.title) : 'Live-sett'} ${_liveBadge(statusOf(b))}</div>
          <div style="color:var(--text3);font-size:0.8rem">${esc(_fmtDay(b.slot))} · ${esc(_fmtTimeRange(b))} · rom «${esc(b.room)}»</div>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="BroadcastSchedule.removeEntry('${b.id}')" title="Fjern">${_I('trash')}</button>
      </div>`;

    box.innerHTML = `
      <div class="modal-header">
        <h2>${_I('radio')} Dine sendetider</h2>
        <button class="btn-icon" onclick="App.closeModal()" aria-label="Lukk">${_I('x')}</button>
      </div>
      <div style="padding:0.25rem 0 0.5rem">
        <p style="color:var(--text2);font-size:0.88rem;line-height:1.5;margin:0 0 1rem">
          Velg når du vil sende live. Tidene dine vises i <strong>Sendinger</strong>-fanen og på profilen din, så lytterne vet når de skal stille inn.
        </p>

        ${list.length ? `<div style="margin:0 0 1rem">${list.map(rowOf).join('')}</div>` : ''}

        <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:0.9rem 1rem">
          <div style="font-weight:800;font-size:0.85rem;margin:0 0 0.7rem">${_I('plus')} Ny sendetid</div>
          <label style="${lbl}" for="bs-slot">Når sender du?</label>
          <input id="bs-slot" type="datetime-local" value="${localISO}" style="${inp};margin:0 0 0.8rem">
          <div style="display:flex;gap:0.7rem;margin:0 0 0.8rem">
            <div style="flex:1">
              <label style="${lbl}" for="bs-hours">Varighet (timer)</label>
              <input id="bs-hours" type="number" min="1" max="${MAX_HOURS}" value="2" style="${inp}">
            </div>
            <div style="flex:1.4">
              <label style="${lbl}" for="bs-room">Rom-navn</label>
              <input id="bs-room" value="${esc(_roomFor(cur.username))}" style="${inp}">
            </div>
          </div>
          <label style="${lbl}" for="bs-title">Tittel (valgfritt)</label>
          <input id="bs-title" placeholder="F.eks. «Fredagsmiks» eller «Ambient kveld»" style="${inp};margin:0 0 1rem" maxlength="60">
          <button class="btn btn-primary w-full" onclick="BroadcastSchedule.addEntry()">${_I('check')} Legg til sendetid</button>
        </div>

        <p style="font-size:0.72rem;color:var(--text3);margin:0.9rem 0 0;text-align:center">
          Rom-navnet kobler lytterne til sendingen din. Selve live-sendingen starter du fra DJ-konsollen.
        </p>
      </div>`;
    App.openModal();
  }

  function addEntry() {
    const cur = me();
    if (!cur) return;
    const slot = val('bs-slot');
    if (!slot) { App.toast('Velg dato og klokkeslett.', 'error'); return; }
    const hours = Math.max(1, Math.min(MAX_HOURS, parseInt(val('bs-hours'), 10) || 1));
    const room  = _roomFor(val('bs-room') || cur.username);
    const title = String(val('bs-title') || '').trim().slice(0, 60);
    const list  = entriesOf(cur);
    list.push({ id: _uid(), slot, hours, room, title, createdAt: Date.now() });
    Auth.updateUser(cur.username, { [KEY]: list });
    if (typeof App !== 'undefined') App.toast('Sendetid lagt til.', 'success');
    _renderEditor();
  }

  // username valgfri (profil-seksjonen sender den med, editoren bruker innlogget bruker).
  function removeEntry(id, username) {
    const cur = me();
    const uname = username || (cur && cur.username);
    if (!cur || !uname || cur.username !== uname) return;     // kun egen plan
    const list = entriesOf(cur).filter(b => b.id !== id);
    Auth.updateUser(uname, { [KEY]: list });
    if (typeof App !== 'undefined') App.toast('Sendetid fjernet.', 'info');
    // Oppdater synlig kontekst: editor-modal hvis åpen, ellers profil/fane.
    if (document.getElementById('bs-slot')) _renderEditor();
    else if (location.hash.startsWith('#/sendinger')) render();
    else if (window.Profile && location.hash.startsWith('#/u/')) Profile.renderView(uname);
  }

  // ── Koblinger til live-laget ──────────────────────────────────────────────
  function listen(room) {
    if (window.LiveMix && LiveMix.tuneIn) LiveMix.tuneIn(room);
    else if (typeof App !== 'undefined') App.toast('Live-lytting kunne ikke lastes.', 'error');
  }
  function goLive(room) {
    if (window.LiveMix && LiveMix.goLive) LiveMix.goLive(room);
    else if (typeof App !== 'undefined') App.toast('DJ-konsollen kunne ikke lastes.', 'error');
  }

  return {
    render, profileSection, openEditor, addEntry, removeEntry, listen, goLive,
    entriesOf, nextOf, statusOf,
  };
})();

if (typeof window !== 'undefined') window.BroadcastSchedule = BroadcastSchedule;
if (typeof module !== 'undefined' && module.exports) module.exports = BroadcastSchedule;
