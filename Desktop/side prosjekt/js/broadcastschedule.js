// BroadcastSchedule — sendetider brukerne setter selv + LIVE direktesending.
// Hver bruker velger sine egne sendetider (uavhengig av betalt Live Mix-booking).
// Tidene lagres på brukerprofilen (user.broadcasts) og vises tre steder:
//   • #/sendinger      — samlet fane (live nå + kommende) for ALLE brukere
//   • profil-siden      — prominent LIVE-banner øverst + egen sendetid-liste
//   • #/community       — «Live nå»-seksjon øverst på veggen
// En sendetid kan bære en YouTube live-lenke (youtubeId). Når sendingen er live
// embeddes YouTube-videoen automatisk på profilen og i Community. Uten YouTube-
// lenke faller man tilbake til WebRTC «Hør live» (LiveMix.tuneIn/goLive).
//
// BETALING: Å bli vist som LIVE (embed/«Hør live») krever en aktiv Live Mix-
// booking som dekker sendetiden (_hasPaidSlot). Stasjons-eier sender alltid,
// og på localhost forbigås gaten for testing. Uten booking ser eieren en
// «Book mikse-slot»-oppfordring; for andre vises sendingen ikke som live.
const BroadcastSchedule = (() => {
  const KEY   = 'broadcasts';        // user.broadcasts = [{ id, slot, hours, room, title, youtubeId, coverUrl, createdAt }]
  let _pendingCover = '';            // cover-bilde (data-URL) valgt i editoren, lagres på neste sendetid
  const GRACE = 10 * 60 * 1000;      // 10 min slingringsmonn før start (samme som booking-gaten)
  const MAX_HOURS = 12;

  const _I  = (n) => (typeof Icon === 'function' ? Icon(n) : '');
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
  const me  = () => (typeof Auth !== 'undefined' && Auth.current ? Auth.current() : null);
  const val = (id) => { const el = document.getElementById(id); return el ? el.value : ''; };
  const users = () => (typeof Auth !== 'undefined' && Auth.getUsers) ? Auth.getUsers() : {};

  function _uid() { return 'bc_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  function _roomFor(name) {
    return String(name || '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 40) || 'test';
  }

  // Trekk ut 11-tegns video-id fra de vanlige YouTube-URL-formene (også live/?v=).
  function parseYouTubeId(url) {
    const m = String(url || '').match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    if (m) return m[1];
    const bare = String(url || '').trim();
    return /^[A-Za-z0-9_-]{11}$/.test(bare) ? bare : '';
  }

  // YouTube-embed (16:9). autoplay/mute styres per flate (banner = autoplay+mute).
  function _ytEmbed(id, opts) {
    const o = opts || {};
    const q = 'playsinline=1' + (o.autoplay ? '&autoplay=1' : '') + (o.mute ? '&mute=1' : '');
    return `<div style="position:relative;width:100%;padding-top:56.25%;border-radius:12px;overflow:hidden;background:#000;margin:${o.margin || '0.7rem 0 0'}">
      <iframe src="https://www.youtube.com/embed/${esc(id)}?${q}" title="Live broadcast" frameborder="0"
        allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowfullscreen
        style="position:absolute;inset:0;width:100%;height:100%;border:0"></iframe>
    </div>`;
  }

  // ── Tidsformat (norsk bokmål) ───────────────────────────────────────────
  function _fmtDateTime(iso) {
    if (!iso) return 'To be arranged';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso);
    return d.toLocaleString('en-US', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
  }
  function _fmtTimeRange(b) {
    const w = _window(b);
    if (!w) return '';
    const t = ms => new Date(ms).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    return t(w.start) + '–' + t(w.end);
  }
  function _fmtDay(iso) {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const that = new Date(d); that.setHours(0, 0, 0, 0);
    const dayDiff = Math.round((that - today) / 86400000);
    if (dayDiff === 0) return 'Today';
    if (dayDiff === 1) return 'Tomorrow';
    return d.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' });
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

  // ── Betalings-gate ────────────────────────────────────────────────────────
  // Samlet admin-e-postliste, CONFIG.ADMIN_EMAILS (js/config.js) — stasjons-eier/admin sender alltid.
  function _isOwnerUser(u) {
    return typeof CONFIG !== 'undefined' && CONFIG.isAdminEmail(u);
  }
  // Har brukeren en Live Mix-booking som dekker denne sendetiden? Eier alltid ja.
  // Booking uten slot («avtales senere») dekker alt. Test-bookinger teller (som i LiveMix).
  function _hasPaidSlot(user, b) {
    if (_isOwnerUser(user)) return true;
    const list = (user && Array.isArray(user.liveMixBookings)) ? user.liveMixBookings : [];
    const w = _window(b);
    if (!w) return false;
    for (const bk of list) {
      if (!bk || bk.product !== 'livemix') continue;
      if (!bk.slot) return true;                              // «avtales senere» dekker alt
      const s = new Date(bk.slot).getTime();
      if (isNaN(s)) continue;
      const e = s + Math.max(1, bk.hours || 1) * 3600 * 1000;
      if (w.start < e && w.end > s) return true;              // tidsvinduene overlapper
    }
    return false;
  }
  // Er sendingen kvalifisert til å vises som LIVE? Betalt slot, eller — for den
  // innloggede brukerens egne sendinger — eier/localhost-bypass (test).
  function _eligible(user, b) {
    if (statusOf(b) !== 'live') return false;
    if (_hasPaidSlot(user, b)) return true;
    const cur = me();
    if (cur && user && cur.username === user.username && window.LiveMix && LiveMix.canGoLive) {
      const g = LiveMix.canGoLive();
      if (g.devBypass || g.owner) return true;
    }
    return false;
  }

  // Alle sendetider på tvers av brukere — kvalifisert live + kommende, tagget med eier.
  function _allActive() {
    const all = users();
    const out = [];
    for (const uname in all) {
      const u = all[uname];
      for (const b of entriesOf(u)) {
        const st = statusOf(b);
        if (st === 'past') continue;
        if (st === 'live' && !_eligible(u, b)) continue;       // ubetalt live → ikke vist som live
        out.push({ ...b, status: st, username: u.username, displayName: u.displayName || u.username, role: u.role || 'lytter' });
      }
    }
    // Live øverst, deretter kronologisk.
    out.sort((a, b) => (a.status === 'live' ? 0 : 1) - (b.status === 'live' ? 0 : 1) || new Date(a.slot) - new Date(b.slot));
    return out;
  }

  // ── Felles ────────────────────────────────────────────────────────────────
  const ROLE = { lytter: '🎧 Listener', dj: '🎛️ DJ', produsent: '🎹 Producer', plateselskap: '🏷️ Record label' };

  function _liveBadge(status) {
    return status === 'live'
      ? `<span style="display:inline-flex;align-items:center;gap:0.35rem;font-size:0.72rem;font-weight:800;padding:0.2rem 0.6rem;border-radius:999px;background:rgba(239,68,68,0.15);color:#ef4444"><span style="width:8px;height:8px;border-radius:50%;background:#ef4444;animation:pulse 1s infinite"></span> LIVE NOW</span>`
      : `<span style="display:inline-flex;align-items:center;gap:0.35rem;font-size:0.72rem;font-weight:700;padding:0.2rem 0.6rem;border-radius:999px;background:rgba(245,158,11,0.14);color:#f59e0b">${_I('clock')} Upcoming</span>`;
  }
  function _ytTag() {
    return `<span style="display:inline-flex;align-items:center;gap:0.3rem;font-size:0.7rem;font-weight:700;padding:0.15rem 0.5rem;border-radius:999px;background:rgba(255,0,0,0.12);color:#ff4d4d">${_I('play')} YouTube</span>`;
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
        action = mine && !e.youtubeId
          ? `<button class="btn btn-primary btn-sm" onclick="BroadcastSchedule.goLive('${esc(e.room)}')" style="flex:0 0 auto">${_I('radio')} Go live</button>`
          : (e.youtubeId ? '' : `<button class="btn btn-primary btn-sm" onclick="BroadcastSchedule.listen('${esc(e.room)}')" style="flex:0 0 auto">${_I('headphones')} Listen live</button>`);
      } else {
        action = `<a href="${a}" class="btn btn-ghost btn-sm" style="flex:0 0 auto">${_I('user')} Profile</a>`;
      }
      const embed = (e.status === 'live' && e.youtubeId) ? _ytEmbed(e.youtubeId, { margin: '0.7rem 0 0' }) : '';
      return `
        <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:0.85rem 1rem;margin:0 0 0.7rem">
          <div style="display:flex;align-items:center;gap:0.9rem">
            <a href="${a}" style="width:46px;height:46px;border-radius:50%;background:linear-gradient(135deg,#f59e0b,#f472b6);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:1.1rem;color:#1a1205;text-decoration:none;flex:0 0 auto">${esc((e.displayName || '?').charAt(0).toUpperCase())}</a>
            <div style="flex:1;min-width:0">
              <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap">
                <a href="${a}" style="font-weight:800;color:var(--text);text-decoration:none">${esc(e.displayName)}</a>
                ${_liveBadge(e.status)}${e.youtubeId ? ' ' + _ytTag() : ''}
              </div>
              <div style="color:var(--text2);font-size:0.85rem;margin-top:0.15rem">
                ${e.title ? `<strong style="color:var(--text)">${esc(e.title)}</strong> · ` : ''}${esc(ROLE[e.role] || '')}
              </div>
              <div style="color:var(--text3);font-size:0.8rem;margin-top:0.1rem">${_I('clock')} ${esc(_fmtDay(e.slot))} · ${esc(_fmtTimeRange(e))}</div>
            </div>
            ${action}
          </div>
          ${embed}
        </div>`;
    };

    const section = (title, items, emptyMsg) => `
      <div style="margin:0 0 1.6rem">
        <h2 style="font-size:1.05rem;font-weight:800;margin:0 0 0.8rem;display:flex;align-items:center;gap:0.5rem">${title}</h2>
        ${items.length ? items.map(cardFor).join('') : `<p style="color:var(--text3);font-size:0.9rem;margin:0">${emptyMsg}</p>`}
      </div>`;

    app.innerHTML = `
      <div id="bc-sendinger-page" style="max-width:720px;margin:0 auto;padding:1.5rem 1rem 4rem">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;flex-wrap:wrap;margin:0 0 0.4rem">
          <div>
            <h1 style="font-size:1.6rem;font-weight:900;margin:0;display:flex;align-items:center;gap:0.6rem">${_I('radio')} Broadcasts</h1>
            <p style="color:var(--text2);font-size:0.92rem;margin:0.35rem 0 0;max-width:48ch">See who's broadcasting live right now and when the next set is coming up. Set your own broadcast time — add a YouTube live link, and the video will show up here, on your profile and in Community while you're live.</p>
          </div>
          <button class="btn btn-primary" onclick="BroadcastSchedule.openEditor()">${_I('plus')} ${cur ? 'Set broadcast time' : 'Log in to broadcast'}</button>
        </div>
        <div style="height:1px;background:rgba(255,255,255,0.08);margin:1.2rem 0 1.6rem"></div>
        ${section(`<span style="width:10px;height:10px;border-radius:50%;background:#ef4444;display:inline-block;animation:pulse 1s infinite"></span> Live now`, live, 'No one is broadcasting live right now.')}
        ${section(`${_I('calendar')} Upcoming broadcasts`, soon, 'No broadcasts scheduled yet. Be the first — set your broadcast time!')}
      </div>`;
    _ensureTick();
  }

  // ── Prominent LIVE-banner (øverst på profilen) ────────────────────────────
  function liveBanner(user, isOwner) {
    const uname = user ? user.username : '';
    return `<div id="bc-live-banner" data-username="${esc(uname)}" data-owner="${isOwner ? '1' : '0'}">${_liveBannerInner(user, isOwner)}</div>`;
  }

  function _liveBannerInner(user, isOwner) {
    if (!user) return '';
    const liveAll = entriesOf(user).filter(b => statusOf(b) === 'live');
    if (!liveAll.length) return '';
    const eligible = liveAll.filter(b => _eligible(user, b));

    // Live, men uten betalt slot → kun eieren ser en «book for å gå live»-oppfordring.
    if (!eligible.length) {
      if (!isOwner) return '';
      const next = liveAll[0];
      return `
        <div style="margin:0 0 1.1rem;padding:1rem 1.1rem;border-radius:16px;background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.3)">
          <div style="font-weight:800;display:flex;align-items:center;gap:0.5rem;margin:0 0 0.35rem">${_I('credit-card')} You have a broadcast time now</div>
          <div style="color:var(--text2);font-size:0.9rem;line-height:1.5;margin:0 0 0.8rem">Live broadcasting requires an active Live&nbsp;Mix time. Book a slot, and "${esc(next.title || 'your broadcast')}" goes live on your profile and in Community.</div>
          <button class="btn btn-primary btn-sm" onclick="LiveMix.openBooking()">${_I('clock')} Book a mix slot (150 kr/hr)</button>
        </div>`;
    }

    const b = eligible[0];
    const title = b.title ? esc(b.title) : 'Live set';
    // Cover-bilde (still) når sendingen er kun lyd — kamera av. YouTube-embeden
    // bærer allerede sitt eget bilde fra OBS, så da viser vi embeden i stedet.
    const cover = (!b.youtubeId && b.coverUrl)
      ? `<img src="${esc(b.coverUrl)}" alt="" style="width:100%;border-radius:12px;margin:0.9rem 0 0;display:block">` : '';
    let body;
    if (b.youtubeId) {
      body = _ytEmbed(b.youtubeId, { autoplay: true, mute: true, margin: '0.9rem 0 0' });
    } else if (isOwner) {
      body = cover + `<button class="btn btn-primary" onclick="BroadcastSchedule.goLive('${esc(b.room)}')" style="margin-top:0.9rem">${_I('radio')} Open DJ console</button>`;
    } else {
      body = cover + `<button class="btn btn-primary" onclick="BroadcastSchedule.listen('${esc(b.room)}')" style="margin-top:0.9rem">${_I('headphones')} Listen live now</button>`;
    }
    return `
      <div style="margin:0 0 1.2rem;padding:1.1rem 1.2rem;border-radius:18px;background:linear-gradient(135deg,rgba(239,68,68,0.16),rgba(244,114,182,0.1));border:1px solid rgba(239,68,68,0.4);box-shadow:0 8px 30px rgba(239,68,68,0.12)">
        <div style="display:flex;align-items:center;gap:0.6rem;flex-wrap:wrap">
          <span style="display:inline-flex;align-items:center;gap:0.4rem;font-size:0.82rem;font-weight:900;letter-spacing:0.04em;padding:0.3rem 0.75rem;border-radius:999px;background:#ef4444;color:#fff"><span style="width:9px;height:9px;border-radius:50%;background:#fff;animation:pulse 1s infinite"></span> LIVE NOW</span>
          <strong style="font-size:1.05rem">${title}</strong>
          ${b.youtubeId ? _ytTag() : ''}
        </div>
        <div style="color:var(--text2);font-size:0.85rem;margin-top:0.3rem">${_I('clock')} ${esc(_fmtTimeRange(b))} · ${esc(_fmtDay(b.slot))}</div>
        ${body}
      </div>`;
  }

  // ── Community «Live nå»-seksjon (øverst på veggen) ────────────────────────
  function communityLiveSection() {
    _ensureTick();
    return `<div id="bc-community-live">${_communityLiveInner()}</div>`;
  }

  function _communityLiveInner() {
    const live = _allActive().filter(e => e.status === 'live');
    if (!live.length) return '';
    const card = (e) => {
      const a = '#/u/' + encodeURIComponent(e.username);
      const listen = e.youtubeId ? '' :
        `<button class="btn btn-primary btn-sm" onclick="BroadcastSchedule.listen('${esc(e.room)}')">${_I('headphones')} Listen live</button>`;
      return `
        <div style="background:rgba(0,0,0,0.25);border:1px solid rgba(239,68,68,0.25);border-radius:14px;padding:0.85rem 1rem;margin:0 0 0.7rem">
          <div style="display:flex;align-items:center;gap:0.8rem">
            <a href="${a}" style="width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,#ef4444,#f472b6);display:flex;align-items:center;justify-content:center;font-weight:800;color:#fff;text-decoration:none;flex:0 0 auto">${esc((e.displayName || '?').charAt(0).toUpperCase())}</a>
            <div style="flex:1;min-width:0">
              <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap">
                <a href="${a}" style="font-weight:800;color:var(--text);text-decoration:none">${esc(e.displayName)}</a>
                ${_liveBadge('live')}
              </div>
              <div style="color:var(--text2);font-size:0.84rem;margin-top:0.1rem">${e.title ? `<strong style="color:var(--text)">${esc(e.title)}</strong> · ` : ''}${esc(ROLE[e.role] || '')}</div>
            </div>
            ${listen}
          </div>
          ${e.youtubeId ? _ytEmbed(e.youtubeId, { margin: '0.7rem 0 0' }) : ''}
        </div>`;
    };
    return `
      <div style="margin:0 0 1.4rem;padding:1rem 1.1rem;border-radius:16px;background:rgba(239,68,68,0.07);border:1px solid rgba(239,68,68,0.22)">
        <h2 style="font-size:1.05rem;font-weight:900;margin:0 0 0.85rem;display:flex;align-items:center;gap:0.5rem"><span style="width:11px;height:11px;border-radius:50%;background:#ef4444;display:inline-block;animation:pulse 1s infinite"></span> Live now on SoundCore</h2>
        ${live.map(card).join('')}
      </div>`;
  }

  // ── Profil-seksjon (detaljert sendetid-liste i OM-fanen) ──────────────────
  function profileSection(user, isOwner, theme) {
    const list = entriesOf(user).filter(b => statusOf(b) !== 'past');
    if (!list.length && !isOwner) return '';
    const t = theme || {};
    const primary = t.primaryColor || 'var(--accent)';
    const text    = t.textColor || '#fff';
    const card = (b) => {
      const st = statusOf(b);
      const liveOk = st === 'live' && _eligible(user, b);
      let action = '';
      if (liveOk && !b.youtubeId) {
        action = isOwner
          ? `<button class="btn btn-primary btn-sm" onclick="BroadcastSchedule.goLive('${esc(b.room)}')">${_I('radio')} Go live</button>`
          : `<button class="btn btn-primary btn-sm" onclick="BroadcastSchedule.listen('${esc(b.room)}')">${_I('headphones')} Listen live</button>`;
      } else if (st === 'live' && !liveOk && isOwner) {
        action = `<button class="btn btn-primary btn-sm" onclick="LiveMix.openBooking()">${_I('credit-card')} Book to go live</button>`;
      }
      return `
        <div style="padding:0.6rem 0;border-top:1px solid ${text}1a">
          <div style="display:flex;align-items:center;gap:0.75rem">
            <div style="flex:1;min-width:0">
              <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap">
                ${b.title ? `<strong>${esc(b.title)}</strong>` : '<span style="opacity:0.8">Live set</span>'}
                ${_liveBadge(liveOk ? 'live' : 'upcoming')}${b.youtubeId ? ' ' + _ytTag() : ''}
              </div>
              <div style="opacity:0.7;font-size:0.82rem;margin-top:0.1rem">${esc(_fmtDay(b.slot))} · ${esc(_fmtTimeRange(b))}</div>
            </div>
            ${action}
            ${isOwner ? `<button class="btn btn-ghost btn-sm" title="Remove" onclick="BroadcastSchedule.removeEntry('${b.id}','${esc(user.username)}')">${_I('trash')}</button>` : ''}
          </div>
          ${liveOk && b.youtubeId ? _ytEmbed(b.youtubeId, { margin: '0.6rem 0 0' }) : ''}
        </div>`;
    };
    return `
      <div style="margin:1rem 0;padding:0.9rem 1.1rem;border-radius:14px;background:${primary}14;border:1px solid ${primary}33">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:0.75rem">
          <div style="font-weight:800;display:flex;align-items:center;gap:0.5rem">${_I('radio')} Broadcast times</div>
          ${isOwner ? `<button class="btn btn-ghost btn-sm" onclick="BroadcastSchedule.openEditor()">${_I('edit')} Edit</button>` : ''}
        </div>
        ${list.length
          ? list.map(card).join('')
          : `<div style="opacity:0.7;font-size:0.88rem;margin-top:0.5rem">You have no broadcasts scheduled. <a href="#" onclick="BroadcastSchedule.openEditor();return false" style="color:${primary};font-weight:700">Set your broadcast time →</a></div>`}
      </div>`;
  }

  // ── Editor (egen sendeplan) ───────────────────────────────────────────────
  function openEditor() {
    const cur = me();
    if (!cur) {
      if (typeof App !== 'undefined') App.toast('Log in or create a free profile to set a broadcast time.', 'info', 4000);
      location.hash = '#/login';
      return;
    }
    _renderEditor();
  }

  // Synlig betalingsstatus i editoren — gjør «sjekk betaling» tydelig for brukeren.
  function _bookingNote(cur) {
    if (!window.LiveMix || !LiveMix.canGoLive) return '';
    const g = LiveMix.canGoLive();
    const wrap = (bg, col, html) => `<div style="background:${bg};border:1px solid ${col}55;border-radius:12px;padding:0.7rem 0.9rem;font-size:0.85rem;color:var(--text);margin:0 0 1rem">${html}</div>`;
    if (g.owner)     return wrap('rgba(34,197,94,0.1)', '#22c55e', `${_I('check')} You're the station owner — you can go live without booking.`);
    if (g.active)    return wrap('rgba(34,197,94,0.1)', '#22c55e', `${_I('check')} Active Live Mix time found — your broadcast goes live now.`);
    if (g.devBypass) return wrap('rgba(245,158,11,0.12)', '#f59e0b', `🧪 Local test — the payment gate is bypassed here.`);
    const next = g.next;
    const msg  = next ? `Next booked time: <strong>${esc(_fmtDateTime(next.slot))}</strong>.` : "You don't have a Live Mix booking yet.";
    return wrap('rgba(245,158,11,0.12)', '#f59e0b',
      `${_I('credit-card')} Live broadcasting requires paid Live Mix time. ${msg}
       <div style="margin-top:0.6rem"><button class="btn btn-primary btn-sm" onclick="LiveMix.openBooking()">${_I('clock')} Book a mix slot (150 kr/hr)</button></div>`);
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
          <div style="font-weight:700;font-size:0.9rem">${b.title ? esc(b.title) : 'Live set'} ${_liveBadge(statusOf(b))}${b.youtubeId ? ' ' + _ytTag() : ''}</div>
          <div style="color:var(--text3);font-size:0.8rem">${esc(_fmtDay(b.slot))} · ${esc(_fmtTimeRange(b))} · room "${esc(b.room)}"</div>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="BroadcastSchedule.removeEntry('${b.id}')" title="Remove">${_I('trash')}</button>
      </div>`;

    box.innerHTML = `
      <div class="modal-header">
        <h2>${_I('radio')} Your broadcast times</h2>
        <button class="btn-icon" onclick="App.closeModal()" aria-label="Close">${_I('x')}</button>
      </div>
      <div style="padding:0.25rem 0 0.5rem">
        <p style="color:var(--text2);font-size:0.88rem;line-height:1.5;margin:0 0 1rem">
          Choose when you want to broadcast live. Your times show up in the <strong>Broadcasts</strong> tab, at the top of your profile and in <strong>Community</strong>, so listeners know when to tune in.
        </p>

        ${_bookingNote(cur)}

        ${list.length ? `<div style="margin:0 0 1rem">${list.map(rowOf).join('')}</div>` : ''}

        <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:0.9rem 1rem">
          <div style="font-weight:800;font-size:0.85rem;margin:0 0 0.7rem">${_I('plus')} New broadcast time</div>
          <label style="${lbl}" for="bs-slot">When do you broadcast?</label>
          <input id="bs-slot" type="datetime-local" value="${localISO}" style="${inp};margin:0 0 0.8rem">
          <div style="display:flex;gap:0.7rem;margin:0 0 0.8rem">
            <div style="flex:1">
              <label style="${lbl}" for="bs-hours">Duration (hours)</label>
              <input id="bs-hours" type="number" min="1" max="${MAX_HOURS}" value="2" style="${inp}">
            </div>
            <div style="flex:1.4">
              <label style="${lbl}" for="bs-room">Room name</label>
              <input id="bs-room" value="${esc(_roomFor(cur.username))}" style="${inp}">
            </div>
          </div>
          <label style="${lbl}" for="bs-title">Title (optional)</label>
          <input id="bs-title" placeholder="E.g. &quot;Friday mix&quot; or &quot;Ambient evening&quot;" style="${inp};margin:0 0 0.8rem" maxlength="60">
          <label style="${lbl}" for="bs-youtube">${_I('play')} YouTube live link (optional)</label>
          <input id="bs-youtube" placeholder="https://youtube.com/watch?v=… (your live broadcast)" style="${inp};margin:0 0 0.4rem">
          <p style="font-size:0.74rem;color:var(--text3);margin:0 0 0.8rem">Paste in your YouTube live link, and the video will show up on your profile and in Community while you're live. Leave the field empty to broadcast audio via the DJ console instead.</p>

          <label style="${lbl}">${_I('image')} Cover image (still — shown when the camera is off)</label>
          <div style="display:flex;gap:0.6rem;align-items:center;flex-wrap:wrap;margin:0 0 0.4rem">
            <button type="button" class="btn btn-ghost btn-sm" onclick="document.getElementById('bs-cover').click()">${_I('camera')} Choose image</button>
            <input type="file" id="bs-cover" accept="image/*" style="display:none" onchange="BroadcastSchedule.setCover(this)">
            <img id="bs-cover-prev" alt="" style="height:42px;border-radius:8px;display:none">
          </div>
          <details style="margin:0 0 1rem">
            <summary style="cursor:pointer;font-size:0.74rem;color:var(--text3)">How to stream your DJ set (Traktor) to YouTube — audio only</summary>
            <ol style="font-size:0.74rem;color:var(--text3);line-height:1.55;margin:0.5rem 0 0;padding-left:1.1rem">
              <li>Route the Traktor master to a virtual audio cable (BlackHole / Loopback).</li>
              <li>In OBS: add an <strong>Audio Input Capture</strong> = the virtual cable.</li>
              <li>Add an <strong>Image</strong> source (your cover image) — <em>no camera source</em>.</li>
              <li>Settings → Stream → YouTube, paste in the stream key. Start broadcasting.</li>
              <li>Copy the YouTube link here. The image above is used as a preview.</li>
            </ol>
          </details>
          <button class="btn btn-primary w-full" onclick="BroadcastSchedule.addEntry()">${_I('check')} Add broadcast time</button>
        </div>

        <p style="font-size:0.72rem;color:var(--text3);margin:0.9rem 0 0;text-align:center">
          The room name connects listeners to your audio broadcast. Live broadcasting requires an active Live Mix time (payment).
        </p>
      </div>`;
    App.openModal();
  }

  // Cover-bilde valgt i editoren → les til data-URL og forhåndsvis.
  function setCover(input) {
    const f = input && input.files && input.files[0]; if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      _pendingCover = String(rd.result || '');
      const prev = document.getElementById('bs-cover-prev');
      if (prev) { prev.src = _pendingCover; prev.style.display = ''; }
    };
    rd.readAsDataURL(f);
  }

  function addEntry() {
    const cur = me();
    if (!cur) return;
    const slot = val('bs-slot');
    if (!slot) { App.toast('Choose a date and time.', 'error'); return; }
    const hours = Math.max(1, Math.min(MAX_HOURS, parseInt(val('bs-hours'), 10) || 1));
    const room  = _roomFor(val('bs-room') || cur.username);
    const title = String(val('bs-title') || '').trim().slice(0, 60);
    const ytRaw = val('bs-youtube');
    const youtubeId = parseYouTubeId(ytRaw);
    if (ytRaw && ytRaw.trim() && !youtubeId) { App.toast('No valid YouTube link found — check the link.', 'error'); return; }
    const coverUrl = _pendingCover || '';
    const list  = entriesOf(cur);
    list.push({ id: _uid(), slot, hours, room, title, youtubeId, coverUrl, createdAt: Date.now() });
    Auth.updateUser(cur.username, { [KEY]: list });
    _pendingCover = '';
    if (typeof App !== 'undefined') App.toast(youtubeId ? 'Broadcast time added — YouTube live ready.' : 'Broadcast time added.', 'success');
    _renderEditor();
  }

  // username valgfri (profil-seksjonen sender den med, editoren bruker innlogget bruker).
  function removeEntry(id, username) {
    const cur = me();
    const uname = username || (cur && cur.username);
    if (!cur || !uname || cur.username !== uname) return;     // kun egen plan
    const list = entriesOf(cur).filter(b => b.id !== id);
    Auth.updateUser(uname, { [KEY]: list });
    if (typeof App !== 'undefined') App.toast('Broadcast time removed.', 'info');
    // Oppdater synlig kontekst: editor-modal hvis åpen, ellers profil/fane.
    if (document.getElementById('bs-slot')) _renderEditor();
    else if (location.hash.startsWith('#/sendinger')) render();
    else if (window.Profile && location.hash.startsWith('#/u/')) Profile.renderView(uname);
  }

  // ── Live-tick — oppdater live-flatene når tiden går (uten å klippe inputs) ─
  let _tick = null;
  function _ensureTick() {
    if (_tick) return;
    _tick = setInterval(refreshLiveSurfaces, 30000);
  }
  function refreshLiveSurfaces() {
    const banner = document.getElementById('bc-live-banner');
    if (banner) {
      const u = users()[banner.dataset.username];
      if (u) banner.innerHTML = _liveBannerInner(u, banner.dataset.owner === '1');
    }
    const cl = document.getElementById('bc-community-live');
    if (cl) cl.innerHTML = _communityLiveInner();
    if (document.getElementById('bc-sendinger-page') && location.hash.indexOf('#/sendinger') === 0) render();
  }

  // ── Koblinger til live-laget ──────────────────────────────────────────────
  function listen(room) {
    if (window.LiveMix && LiveMix.tuneIn) LiveMix.tuneIn(room);
    else if (typeof App !== 'undefined') App.toast('Live listening could not be loaded.', 'error');
  }
  function goLive(room) {
    if (window.LiveMix && LiveMix.goLive) LiveMix.goLive(room);
    else if (typeof App !== 'undefined') App.toast('The DJ console could not be loaded.', 'error');
  }

  return {
    render, profileSection, liveBanner, communityLiveSection, refreshLiveSurfaces,
    openEditor, addEntry, setCover, removeEntry, listen, goLive,
    entriesOf, nextOf, statusOf, parseYouTubeId,
  };
})();

if (typeof window !== 'undefined') window.BroadcastSchedule = BroadcastSchedule;
if (typeof module !== 'undefined' && module.exports) module.exports = BroadcastSchedule;
