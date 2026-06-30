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
  const OWNER_EMAILS = ['producerenur@gmail.com'];   // stasjons-eier — sender alltid

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
      <iframe src="https://www.youtube.com/embed/${esc(id)}?${q}" title="Live-sending" frameborder="0"
        allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowfullscreen
        style="position:absolute;inset:0;width:100%;height:100%;border:0"></iframe>
    </div>`;
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

  // ── Betalings-gate ────────────────────────────────────────────────────────
  function _isOwnerUser(u) {
    try { return !!u && OWNER_EMAILS.includes(String(u.email || '').toLowerCase().trim()); }
    catch (e) { return false; }
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
  const ROLE = { lytter: '🎧 Lytter', dj: '🎛️ DJ', produsent: '🎹 Produsent', plateselskap: '🏷️ Plateselskap' };

  function _liveBadge(status) {
    return status === 'live'
      ? `<span style="display:inline-flex;align-items:center;gap:0.35rem;font-size:0.72rem;font-weight:800;padding:0.2rem 0.6rem;border-radius:999px;background:rgba(239,68,68,0.15);color:#ef4444"><span style="width:8px;height:8px;border-radius:50%;background:#ef4444;animation:pulse 1s infinite"></span> LIVE NÅ</span>`
      : `<span style="display:inline-flex;align-items:center;gap:0.35rem;font-size:0.72rem;font-weight:700;padding:0.2rem 0.6rem;border-radius:999px;background:rgba(245,158,11,0.14);color:#f59e0b">${_I('clock')} Kommende</span>`;
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
          ? `<button class="btn btn-primary btn-sm" onclick="BroadcastSchedule.goLive('${esc(e.room)}')" style="flex:0 0 auto">${_I('radio')} Gå live</button>`
          : (e.youtubeId ? '' : `<button class="btn btn-primary btn-sm" onclick="BroadcastSchedule.listen('${esc(e.room)}')" style="flex:0 0 auto">${_I('headphones')} Hør live</button>`);
      } else {
        action = `<a href="${a}" class="btn btn-ghost btn-sm" style="flex:0 0 auto">${_I('user')} Profil</a>`;
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
            <h1 style="font-size:1.6rem;font-weight:900;margin:0;display:flex;align-items:center;gap:0.6rem">${_I('radio')} Sendinger</h1>
            <p style="color:var(--text2);font-size:0.92rem;margin:0.35rem 0 0;max-width:48ch">Se hvem som sender live nå og når neste sett kommer. Sett din egen sendetid — legg ved en YouTube live-lenke, så dukker videoen opp her, på profilen din og i Community når du er live.</p>
          </div>
          <button class="btn btn-primary" onclick="BroadcastSchedule.openEditor()">${_I('plus')} ${cur ? 'Sett sendetid' : 'Logg inn for å sende'}</button>
        </div>
        <div style="height:1px;background:rgba(255,255,255,0.08);margin:1.2rem 0 1.6rem"></div>
        ${section(`<span style="width:10px;height:10px;border-radius:50%;background:#ef4444;display:inline-block;animation:pulse 1s infinite"></span> Live nå`, live, 'Ingen sender live akkurat nå.')}
        ${section(`${_I('calendar')} Kommende sendinger`, soon, 'Ingen planlagte sendinger ennå. Bli den første — sett din sendetid!')}
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
          <div style="font-weight:800;display:flex;align-items:center;gap:0.5rem;margin:0 0 0.35rem">${_I('credit-card')} Du har en sendetid nå</div>
          <div style="color:var(--text2);font-size:0.9rem;line-height:1.5;margin:0 0 0.8rem">Live-sending krever en aktiv Live&nbsp;Mix-tid. Book et slot, så går «${esc(next.title || 'sendingen din')}» live på profilen og i Community.</div>
          <button class="btn btn-primary btn-sm" onclick="LiveMix.openBooking()">${_I('clock')} Book mikse-slot (150 kr/t)</button>
        </div>`;
    }

    const b = eligible[0];
    const title = b.title ? esc(b.title) : 'Live-sett';
    // Cover-bilde (still) når sendingen er kun lyd — kamera av. YouTube-embeden
    // bærer allerede sitt eget bilde fra OBS, så da viser vi embeden i stedet.
    const cover = (!b.youtubeId && b.coverUrl)
      ? `<img src="${esc(b.coverUrl)}" alt="" style="width:100%;border-radius:12px;margin:0.9rem 0 0;display:block">` : '';
    let body;
    if (b.youtubeId) {
      body = _ytEmbed(b.youtubeId, { autoplay: true, mute: true, margin: '0.9rem 0 0' });
    } else if (isOwner) {
      body = cover + `<button class="btn btn-primary" onclick="BroadcastSchedule.goLive('${esc(b.room)}')" style="margin-top:0.9rem">${_I('radio')} Åpne DJ-konsoll</button>`;
    } else {
      body = cover + `<button class="btn btn-primary" onclick="BroadcastSchedule.listen('${esc(b.room)}')" style="margin-top:0.9rem">${_I('headphones')} Hør live nå</button>`;
    }
    return `
      <div style="margin:0 0 1.2rem;padding:1.1rem 1.2rem;border-radius:18px;background:linear-gradient(135deg,rgba(239,68,68,0.16),rgba(244,114,182,0.1));border:1px solid rgba(239,68,68,0.4);box-shadow:0 8px 30px rgba(239,68,68,0.12)">
        <div style="display:flex;align-items:center;gap:0.6rem;flex-wrap:wrap">
          <span style="display:inline-flex;align-items:center;gap:0.4rem;font-size:0.82rem;font-weight:900;letter-spacing:0.04em;padding:0.3rem 0.75rem;border-radius:999px;background:#ef4444;color:#fff"><span style="width:9px;height:9px;border-radius:50%;background:#fff;animation:pulse 1s infinite"></span> LIVE NÅ</span>
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
        `<button class="btn btn-primary btn-sm" onclick="BroadcastSchedule.listen('${esc(e.room)}')">${_I('headphones')} Hør live</button>`;
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
        <h2 style="font-size:1.05rem;font-weight:900;margin:0 0 0.85rem;display:flex;align-items:center;gap:0.5rem"><span style="width:11px;height:11px;border-radius:50%;background:#ef4444;display:inline-block;animation:pulse 1s infinite"></span> Live nå på SoundCore</h2>
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
          ? `<button class="btn btn-primary btn-sm" onclick="BroadcastSchedule.goLive('${esc(b.room)}')">${_I('radio')} Gå live</button>`
          : `<button class="btn btn-primary btn-sm" onclick="BroadcastSchedule.listen('${esc(b.room)}')">${_I('headphones')} Hør live</button>`;
      } else if (st === 'live' && !liveOk && isOwner) {
        action = `<button class="btn btn-primary btn-sm" onclick="LiveMix.openBooking()">${_I('credit-card')} Book for å gå live</button>`;
      }
      return `
        <div style="padding:0.6rem 0;border-top:1px solid ${text}1a">
          <div style="display:flex;align-items:center;gap:0.75rem">
            <div style="flex:1;min-width:0">
              <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap">
                ${b.title ? `<strong>${esc(b.title)}</strong>` : '<span style="opacity:0.8">Live-sett</span>'}
                ${_liveBadge(liveOk ? 'live' : 'upcoming')}${b.youtubeId ? ' ' + _ytTag() : ''}
              </div>
              <div style="opacity:0.7;font-size:0.82rem;margin-top:0.1rem">${esc(_fmtDay(b.slot))} · ${esc(_fmtTimeRange(b))}</div>
            </div>
            ${action}
            ${isOwner ? `<button class="btn btn-ghost btn-sm" title="Fjern" onclick="BroadcastSchedule.removeEntry('${b.id}','${esc(user.username)}')">${_I('trash')}</button>` : ''}
          </div>
          ${liveOk && b.youtubeId ? _ytEmbed(b.youtubeId, { margin: '0.6rem 0 0' }) : ''}
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

  // Synlig betalingsstatus i editoren — gjør «sjekk betaling» tydelig for brukeren.
  function _bookingNote(cur) {
    if (!window.LiveMix || !LiveMix.canGoLive) return '';
    const g = LiveMix.canGoLive();
    const wrap = (bg, col, html) => `<div style="background:${bg};border:1px solid ${col}55;border-radius:12px;padding:0.7rem 0.9rem;font-size:0.85rem;color:var(--text);margin:0 0 1rem">${html}</div>`;
    if (g.owner)     return wrap('rgba(34,197,94,0.1)', '#22c55e', `${_I('check')} Du er stasjons-eier — du kan gå live uten booking.`);
    if (g.active)    return wrap('rgba(34,197,94,0.1)', '#22c55e', `${_I('check')} Aktiv Live Mix-tid funnet — sendingen din går live nå.`);
    if (g.devBypass) return wrap('rgba(245,158,11,0.12)', '#f59e0b', `🧪 Lokal test — betalings-gaten forbigås her.`);
    const next = g.next;
    const msg  = next ? `Neste bookede tid: <strong>${esc(_fmtDateTime(next.slot))}</strong>.` : 'Du har ingen Live Mix-booking ennå.';
    return wrap('rgba(245,158,11,0.12)', '#f59e0b',
      `${_I('credit-card')} Live-sending krever betalt Live Mix-tid. ${msg}
       <div style="margin-top:0.6rem"><button class="btn btn-primary btn-sm" onclick="LiveMix.openBooking()">${_I('clock')} Book mikse-slot (150 kr/t)</button></div>`);
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
          <div style="font-weight:700;font-size:0.9rem">${b.title ? esc(b.title) : 'Live-sett'} ${_liveBadge(statusOf(b))}${b.youtubeId ? ' ' + _ytTag() : ''}</div>
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
          Velg når du vil sende live. Tidene dine vises i <strong>Sendinger</strong>-fanen, øverst på profilen din og i <strong>Community</strong>, så lytterne vet når de skal stille inn.
        </p>

        ${_bookingNote(cur)}

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
          <input id="bs-title" placeholder="F.eks. «Fredagsmiks» eller «Ambient kveld»" style="${inp};margin:0 0 0.8rem" maxlength="60">
          <label style="${lbl}" for="bs-youtube">${_I('play')} YouTube live-lenke (valgfritt)</label>
          <input id="bs-youtube" placeholder="https://youtube.com/watch?v=… (din live-sending)" style="${inp};margin:0 0 0.4rem">
          <p style="font-size:0.74rem;color:var(--text3);margin:0 0 0.8rem">Lim inn YouTube live-lenken din, så dukker videoen opp på profilen din og i Community når du er live. La feltet stå tomt for å sende lyd via DJ-konsollen i stedet.</p>

          <label style="${lbl}">${_I('image')} Cover-bilde (still — vises når kamera er av)</label>
          <div style="display:flex;gap:0.6rem;align-items:center;flex-wrap:wrap;margin:0 0 0.4rem">
            <button type="button" class="btn btn-ghost btn-sm" onclick="document.getElementById('bs-cover').click()">${_I('camera')} Velg bilde</button>
            <input type="file" id="bs-cover" accept="image/*" style="display:none" onchange="BroadcastSchedule.setCover(this)">
            <img id="bs-cover-prev" alt="" style="height:42px;border-radius:8px;display:none">
          </div>
          <details style="margin:0 0 1rem">
            <summary style="cursor:pointer;font-size:0.74rem;color:var(--text3)">Slik streamer du DJ-settet (Traktor) til YouTube — kun lyd</summary>
            <ol style="font-size:0.74rem;color:var(--text3);line-height:1.55;margin:0.5rem 0 0;padding-left:1.1rem">
              <li>Rut Traktor-masteren til en virtuell lydkabel (BlackHole / Loopback).</li>
              <li>I OBS: legg til <strong>Lydinngangsopptak</strong> = den virtuelle kabelen.</li>
              <li>Legg til <strong>Bilde</strong>-kilde (cover-bildet ditt) — <em>ingen kamera-kilde</em>.</li>
              <li>Innstillinger → Stream → YouTube, lim inn streamnøkkelen. Start sending.</li>
              <li>Kopier YouTube-lenken hit. Bildet over brukes som forhåndsvisning.</li>
            </ol>
          </details>
          <button class="btn btn-primary w-full" onclick="BroadcastSchedule.addEntry()">${_I('check')} Legg til sendetid</button>
        </div>

        <p style="font-size:0.72rem;color:var(--text3);margin:0.9rem 0 0;text-align:center">
          Rom-navnet kobler lytterne til lyd-sendingen din. Live-sending krever en aktiv Live Mix-tid (betaling).
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
    if (!slot) { App.toast('Velg dato og klokkeslett.', 'error'); return; }
    const hours = Math.max(1, Math.min(MAX_HOURS, parseInt(val('bs-hours'), 10) || 1));
    const room  = _roomFor(val('bs-room') || cur.username);
    const title = String(val('bs-title') || '').trim().slice(0, 60);
    const ytRaw = val('bs-youtube');
    const youtubeId = parseYouTubeId(ytRaw);
    if (ytRaw && ytRaw.trim() && !youtubeId) { App.toast('Fant ingen gyldig YouTube-lenke — sjekk lenken.', 'error'); return; }
    const coverUrl = _pendingCover || '';
    const list  = entriesOf(cur);
    list.push({ id: _uid(), slot, hours, room, title, youtubeId, coverUrl, createdAt: Date.now() });
    Auth.updateUser(cur.username, { [KEY]: list });
    _pendingCover = '';
    if (typeof App !== 'undefined') App.toast(youtubeId ? 'Sendetid lagt til — YouTube live klar.' : 'Sendetid lagt til.', 'success');
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
    else if (typeof App !== 'undefined') App.toast('Live-lytting kunne ikke lastes.', 'error');
  }
  function goLive(room) {
    if (window.LiveMix && LiveMix.goLive) LiveMix.goLive(room);
    else if (typeof App !== 'undefined') App.toast('DJ-konsollen kunne ikke lastes.', 'error');
  }

  return {
    render, profileSection, liveBanner, communityLiveSection, refreshLiveSurfaces,
    openEditor, addEntry, setCover, removeEntry, listen, goLive,
    entriesOf, nextOf, statusOf, parseYouTubeId,
  };
})();

if (typeof window !== 'undefined') window.BroadcastSchedule = BroadcastSchedule;
if (typeof module !== 'undefined' && module.exports) module.exports = BroadcastSchedule;
