// Main app — init, nav, routes, pages
const App = (() => {

  // ── Toast ─────────────────────────────────────────────────────────────
  function toast(msg, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.textContent = msg;
    container.appendChild(t);
    setTimeout(() => t.remove(), duration);
  }

  // ── Modal ─────────────────────────────────────────────────────────────
  function openModal() {
    const ov = document.getElementById('modal-overlay');
    if (!ov) return;
    ov.classList.remove('hidden');
    // Lock background scroll so the page behind doesn't scroll under the modal.
    // overflow:hidden keeps the current scroll position (no jump) and avoids the
    // `body { top:0 !important }` Google-Translate hack a position:fixed lock hits.
    document.documentElement.classList.add('modal-open');
    // Gjør modal-boksen flyttbar (dra i tittellinja, opp/ned/venstre/høyre) + zoombar.
    // Hjørne-håndtakene må legges til på nytt hver gang, fordi innholdet (box.innerHTML)
    // settes av den som åpner modalen rett før openModal() og dermed fjerner dem.
    _ensureModalTools();
    _ensureCornerHandles();
    _bindModalDrag();
    _resetModalView();
  }
  function closeModal() {
    const ov = document.getElementById('modal-overlay');
    if (!ov) return;
    ov.classList.add('hidden');
    document.documentElement.classList.remove('modal-open');
  }

  // ── Modal: flytt (dra i tittel) + zoom ────────────────────────────────
  // Alle modaler gjenbruker samme #modal-box, så vi binder dra/zoom én gang
  // på selve boksen og legger en zoom-stolpe i overlegget. Tilstanden
  // (forskyvning + skala) nullstilles hver gang en ny modal åpnes.
  let _mz = { tx: 0, ty: 0, scale: 1 };

  function _applyModalTransform() {
    const box = document.getElementById('modal-box');
    if (box) box.style.transform = `translate(${_mz.tx}px, ${_mz.ty}px) scale(${_mz.scale})`;
  }
  function _updateZoomLabel() {
    const el = document.querySelector('.modal-zoom-bar .mzb-reset');
    if (el) el.textContent = Math.round(_mz.scale * 100) + '%';
  }
  function _setModalZoom(s) {
    _mz.scale = Math.max(0.4, Math.min(3, Math.round(s * 100) / 100));
    _applyModalTransform();
    _updateZoomLabel();
  }
  function _resetModalView() {
    _mz = { tx: 0, ty: 0, scale: 1 };
    _applyModalTransform();
    _updateZoomLabel();
  }

  function _ensureModalTools() {
    const ov = document.getElementById('modal-overlay');
    if (!ov || ov.querySelector('.modal-zoom-bar')) return;
    const bar = document.createElement('div');
    bar.className = 'modal-zoom-bar';
    bar.innerHTML = `
      <button type="button" class="mzb-btn" data-act="out" aria-label="Zoom ut" title="Zoom ut">&minus;</button>
      <button type="button" class="mzb-btn mzb-reset" data-act="reset" title="Tilbakestill plassering og zoom">100%</button>
      <button type="button" class="mzb-btn" data-act="in" aria-label="Zoom inn" title="Zoom inn">+</button>`;
    // Hindre at klikk på stolpen lukker modalen via bakgrunns-lytteren.
    bar.addEventListener('pointerdown', e => e.stopPropagation());
    bar.addEventListener('click', e => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (act === 'in')        _setModalZoom(_mz.scale + 0.15);
      else if (act === 'out')  _setModalZoom(_mz.scale - 0.15);
      else if (act === 'reset') _resetModalView();
    });
    ov.appendChild(bar);
  }

  // Fire hjørne-håndtak: dra et hjørne for å zoome modalen (zoom fra hjørnene).
  function _ensureCornerHandles() {
    const box = document.getElementById('modal-box');
    if (!box) return;
    box.querySelectorAll('.modal-resize-handle').forEach(h => h.remove());
    ['nw', 'ne', 'sw', 'se'].forEach(pos => {
      const h = document.createElement('div');
      h.className = 'modal-resize-handle mrh-' + pos;
      h.dataset.pos = pos;
      h.title = 'Dra hjørnet for å zoome';
      box.appendChild(h);
    });
  }

  function _bindModalDrag() {
    const box = document.getElementById('modal-box');
    if (!box || box.dataset.dzBound) return;
    box.dataset.dzBound = '1';

    const pts = new Map();              // aktive pekere (mus/finger)
    let mode = null;                    // 'drag' | 'pinch' | 'zoom'
    let sx = 0, sy = 0, ox = 0, oy = 0; // dra-start
    let pinchDist = 0, pinchScale = 1;  // klyp-start
    let cx = 0, cy = 0, zDist = 0, zScale = 1; // hjørne-zoom-start (avstand fra senter)

    box.addEventListener('pointerdown', e => {
      const handle  = e.target.closest('.modal-resize-handle');
      const onHeader = e.target.closest('.modal-header') && !e.target.closest('button');
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        mode = 'pinch';
        pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
        pinchScale = _mz.scale;
        box.style.transition = 'none';
      } else if (handle) {
        // Zoom fra hjørnet: skaler ut fra modalens senter etter hvor langt
        // pekeren dras fra senter — utover = inn, innover = ut.
        mode = 'zoom';
        const r = box.getBoundingClientRect();
        cx = r.left + r.width / 2; cy = r.top + r.height / 2;
        zDist = Math.hypot(e.clientX - cx, e.clientY - cy) || 1;
        zScale = _mz.scale;
        box.style.transition = 'none';
        try { box.setPointerCapture(e.pointerId); } catch (_) {}
        e.preventDefault();
      } else if (onHeader) {
        mode = 'drag';
        sx = e.clientX; sy = e.clientY; ox = _mz.tx; oy = _mz.ty;
        box.style.transition = 'none';
        try { box.setPointerCapture(e.pointerId); } catch (_) {}
        e.preventDefault();
      }
    });

    box.addEventListener('pointermove', e => {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (mode === 'pinch' && pts.size >= 2) {
        const [a, b] = [...pts.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinchDist > 0) _setModalZoom(pinchScale * (d / pinchDist));
        e.preventDefault();
      } else if (mode === 'zoom') {
        const d = Math.hypot(e.clientX - cx, e.clientY - cy);
        _setModalZoom(zScale * (d / zDist));
        e.preventDefault();
      } else if (mode === 'drag') {
        _mz.tx = ox + (e.clientX - sx);
        _mz.ty = oy + (e.clientY - sy);
        _applyModalTransform();
      }
    });

    const end = e => {
      pts.delete(e.pointerId);
      try { box.releasePointerCapture(e.pointerId); } catch (_) {}
      if (pts.size < 2 && mode === 'pinch') mode = null;
      if (pts.size === 0) { mode = null; box.style.transition = ''; }
    };
    box.addEventListener('pointerup', end);
    box.addEventListener('pointercancel', end);

    // Ctrl/⌘ + rullehjul zoomer; vanlig rulling scroller innholdet som før.
    box.addEventListener('wheel', e => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      _setModalZoom(_mz.scale + (e.deltaY < 0 ? 0.12 : -0.12));
    }, { passive: false });
  }

  // ── Info / «Hva er Sound Core?» ───────────────────────────────────────
  function showInfo() {
    const box = document.getElementById('modal-box');
    if (!box) return;
    const feat = (icon, name, desc) => `
      <div class="info-feat">
        <span class="info-feat-icon">${Icon(icon)}</span>
        <div>
          <div class="info-feat-name">${name}</div>
          <p class="info-feat-desc">${desc}</p>
        </div>
      </div>`;
    box.innerHTML = `
      <div class="modal-header">
        <h2>${Icon('info')} Hva er Sound&nbsp;Core?</h2>
        <button class="btn-icon" onclick="App.closeModal()" aria-label="Lukk">${Icon('x')}</button>
      </div>
      <div class="info-body">
        <p class="info-intro">
          <strong>Sound&nbsp;Core</strong> er en desentralisert sosial plattform for musikk og lyd —
          en samlingsplass for elektronisk musikk, radio, DJ-miks og fellesskap. Alt kjører rett i
          nettleseren, og dataene dine eies ikke av noen sentral server. Her er alt du kan gjøre:
        </p>
        ${feat('radio',    'Radio',       'Strøm kuraterte radiokanaler og live-sendinger døgnet rundt — fra ambient og psytrance til downtempo og dub. Musikkspilleren blir liggende nederst på siden og spiller videre mens du utforsker resten.')}
        ${feat('music',    'Discover',    'Oppdag ny musikk og nye mennesker. Bla gjennom utgivelser og artister, følg dem du liker, og bygg ditt eget nettverk av lyttere og skapere.')}
        ${feat('moon',     'Underground', 'Den rå, eksperimentelle undergrunnsscenen — for deg som vil grave dypere enn topplistene og finne de skjulte perlene.')}
        ${feat('calendar', 'Shows',       'Hold styr på kommende arrangementer, konserter og live-sett — og se hvem som spiller live akkurat nå.')}
        ${feat('message',  'Chat',        'Sanntidsprat med andre brukere, bygget desentralisert med Gun.js. Meldingene flyter direkte mellom dere, uten en sentral mellommann.')}
        ${feat('user',     'Min side',    'Din egen profil — musikken din, miksene dine, arrangementer og venner, samlet på ett sted.')}
        ${feat('mail',     'Innboks',     'Private meldinger og venneforespørsler, så du holder kontakten med folkene du møter underveis.')}
        ${feat('message',  'AI-assistent','En innebygd hjelper du kan spørre om hva som helst — fra hvordan ting fungerer til tips om hvor du bør begynne.')}
        ${feat('image',    'Tilpasning',  'Bytt bakgrunn, velg blant 100+ språk, og åpne Sound Core på mobil, Mac eller i App Store. Gjør opplevelsen helt til din egen.')}
        <p class="info-welcome">
          Vi er glade for å ha deg her. Velkommen til alle!<br>
          <span class="info-sign">Vennlig hilsen<br>Sound&nbsp;Core Team</span>
        </p>
      </div>`;
    openModal();
  }

  // ── Uleste PM-er ──────────────────────────────────────────────────────
  function getUnreadPMTotal(username) {
    const allUsers = Auth.getAllPublicUsers();
    const readKey  = 'sr_pm_read_' + username;
    const reads    = JSON.parse(localStorage.getItem(readKey) || '{}');
    let total = 0;
    for (const u of allUsers) {
      if (u.username === username) continue;
      const convKey  = 'sr_pm_' + [username, u.username].sort().join('_');
      const msgs     = JSON.parse(localStorage.getItem(convKey) || '[]');
      const lastRead = reads[u.username] || 0;
      total += msgs.filter(m => m.from !== username && m.ts > lastRead).length;
    }
    return total;
  }

  function _getUnreadWallCount(username) {
    // Gjesteboka er no Gun-basert (Social) — tel ulesne derifrå. Fall tilbake til
    // gamle lokale pv_wall berre om Social ikkje er lasta enno.
    if (window.Social && Social.wallUnread) return Social.wallUnread(username);
    const wall = JSON.parse(localStorage.getItem(`pv_wall_${username}`) || '[]');
    const seen = parseInt(localStorage.getItem(`pv_wall_seen_${username}`) || '0', 10);
    return wall.filter(p => p.ts > seen && p.fromUsername !== username).length;
  }

  function markWallSeen(username) {
    localStorage.setItem(`pv_wall_seen_${username}`, Date.now().toString());
    if (window.Social && Social.markWallSeen) Social.markWallSeen(username);
    updateNavBadge();
  }

  let _lastBadgeTotal = -1;
  function updateNavBadge() {
    const user = Auth.current();
    if (!user) return;
    // Innboks bor no i «Mer»-menyen, så vis det samla merket på Mer-knappen.
    const link = document.getElementById('nav-more-btn');
    if (!link) return;
    const pendingFriend = Auth.getPendingRequestsCount(user.username);
    const unreadPMs     = getUnreadPMTotal(user.username);
    const unreadWall    = _getUnreadWallCount(user.username);
    const unreadNotif   = (window.Notify ? Notify.unreadCount() : 0);
    if (window.Notify) Notify.updateBell();
    const total         = pendingFriend + unreadPMs + unreadWall + unreadNotif;
    if (total === _lastBadgeTotal) return;
    _lastBadgeTotal = total;
    let badge = link.querySelector('.nav-badge');
    if (total > 0) {
      if (!badge) { badge = document.createElement('span'); badge.className = 'nav-badge'; link.appendChild(badge); }
      badge.textContent = total;
    } else if (badge) {
      badge.remove();
    }
  }

  // ── Nav ───────────────────────────────────────────────────────────────
  function renderNav() {
    const nav  = document.getElementById('nav-links');
    const user = Auth.current();
    if (!nav) return;
    // Update logo link: logged-in users go to own profile
    const logoLink = document.getElementById('nav-logo-link');
    if (logoLink) logoLink.href = user ? `#/u/${user.username}` : '#/';

    if (user) {
      const pending    = Auth.getPendingRequestsCount(user.username);
      const unreadPMs  = getUnreadPMTotal(user.username);
      const totalBadge = pending + unreadPMs;
      const moreBadge  = totalBadge > 0 ? `<span class="nav-badge">${totalBadge}</span>` : '';
      // Forenkla meny: berre kjernen er synleg. Resten ligg i «Mer ▾».
      nav.innerHTML = `
        <a href="#/"            class="btn btn-ghost btn-sm">${Icon('home')} Feed</a>
        <a href="#/radio"       class="btn btn-ghost btn-sm">${Icon('radio')} Radio</a>
        <a href="#/sendinger"   class="btn btn-ghost btn-sm">${Icon('mic')} Sendinger</a>
        <a href="#/discover"    class="btn btn-ghost btn-sm">${Icon('music')} Discover</a>
        <a href="#/u/${user.username}" class="btn btn-ghost btn-sm">${Icon('user')} Profil</a>
        <button id="nav-more-btn" class="btn btn-ghost btn-sm nav-more-btn" onclick="App.toggleMoreMenu(this)" title="Mer — alle funksjoner" style="position:relative">${Icon('menu')} Mer ${Icon('chevron-down')}${moreBadge}</button>
        <button class="btn btn-ghost btn-sm" onclick="App.logout()" title="Du er online — klikk for å logge ut"><span class="nav-status-dot nav-status-dot--online" title="Online"></span>${Icon('log-out')} Logg ut</button>
      `;
    } else {
      nav.innerHTML = `
        <a href="#/"            class="btn btn-ghost btn-sm">${Icon('home')} Feed</a>
        <a href="#/radio"       class="btn btn-ghost btn-sm">${Icon('radio')} Radio</a>
        <a href="#/sendinger"   class="btn btn-ghost btn-sm">${Icon('mic')} Sendinger</a>
        <a href="#/discover"    class="btn btn-ghost btn-sm">${Icon('music')} Discover</a>
        <button id="nav-more-btn" class="btn btn-ghost btn-sm nav-more-btn" onclick="App.toggleMoreMenu(this)" title="Mer — alle funksjoner">${Icon('menu')} Mer ${Icon('chevron-down')}</button>
        <a href="#/login"       class="btn btn-ghost btn-sm">${Icon('log-in')} Logg inn</a>
        <a href="#/register"    class="btn btn-primary btn-sm">Registrer</a>
      `;
    }
    // Sosialt sanntidslag: start nærvær + varsel-innboks + vennechat (idempotent).
    if (user && window.SC) SC.startPresence(user.username);
    if (user && window.Social) Social.init(user.username);   // abonner på eigen gjestebok → nav-merke
    if (window.Notify)     Notify.init();
    if (window.FriendChat) FriendChat.refresh();
    if (window.Friends)    Friends.init();      // held test-admin online medan appen er open
    if (window.NavDrag)    NavDrag.refresh();   // oppdater grab-markør for nytt fane-antal
  }

  // ── «Mer»-meny (samler alt som ikkje er kjernefaner) ─────────────────────
  // Panelet festast til <body> med position:fixed så nav-ens horisontale scroll
  // (NavDrag) ikkje klipper det.
  let _moreEl = null;
  function _moreMenuHTML() {
    const user = Auth.current();
    const item = (href, icon, label, extra = '') =>
      `<a class="nav-more-item" href="${href}" onclick="App.closeMoreMenu()">${Icon(icon)}<span>${label}</span>${extra}</a>`;
    const btn = (onclick, icon, label) =>
      `<button class="nav-more-item" onclick="App.closeMoreMenu();${onclick}">${Icon(icon)}<span>${label}</span></button>`;
    if (user) {
      const pending   = Auth.getPendingRequestsCount(user.username);
      const unreadPMs = getUnreadPMTotal(user.username);
      const tot       = pending + unreadPMs;
      const inboxBadge = tot > 0 ? `<span class="nav-more-badge">${tot}</span>` : '';
      return `
        ${item('#/minside','home','Min side')}
        ${item('#/inbox','mail','Innboks',inboxBadge)}
        ${item('#/chat','message','Chat')}
        ${item('#/friends','users','Friends')}
        ${item('#/community','users','Community')}
        ${item('#/discover','music','Discover')}
        ${item('#/underground','moon','Underground')}
        ${item('#/shows','calendar','Shows')}
        ${item('#/world','globe','World')}
        ${item('#/magazine','book','Magasin')}
        ${item('#/a1','sparkles','A1')}
        ${item('#/studio','image','Studio')}
        <div class="nav-more-sep"></div>
        ${btn("if(window.Notify)Notify.togglePanel()",'bell','Varsler')}
        ${item('#/edit','edit','Rediger profil')}
        ${item('#/settings','settings','Innstillinger')}
        <div class="nav-more-sep"></div>
        ${btn("App.logout()",'log-out','Logg ut')}
      `;
    }
    return `
      ${item('#/chat','message','Chat')}
      ${item('#/underground','moon','Underground')}
      ${item('#/shows','calendar','Shows')}
      ${item('#/world','globe','World')}
      ${item('#/magazine','book','Magasin')}
      ${item('#/a1','sparkles','A1')}
    `;
  }
  function closeMoreMenu() {
    if (_moreEl) { _moreEl.remove(); _moreEl = null; }
    document.removeEventListener('click', _moreOutside, true);
    window.removeEventListener('hashchange', closeMoreMenu);
    const b = document.getElementById('nav-more-btn');
    if (b) b.classList.remove('active');
  }
  function _moreOutside(e) {
    if (!_moreEl) return;
    if (_moreEl.contains(e.target)) return;
    const b = document.getElementById('nav-more-btn');
    if (b && b.contains(e.target)) return;
    closeMoreMenu();
  }
  function toggleMoreMenu(btn) {
    if (_moreEl) { closeMoreMenu(); return; }
    const panel = document.createElement('div');
    panel.className = 'nav-more-panel';
    panel.id = 'nav-more-panel';
    panel.innerHTML = _moreMenuHTML();
    document.body.appendChild(panel);
    _moreEl = panel;
    const r  = btn.getBoundingClientRect();
    const pw = panel.offsetWidth || 240;
    let left = r.right - pw;
    if (left < 8) left = 8;
    if (left + pw > window.innerWidth - 8) left = window.innerWidth - 8 - pw;
    panel.style.top  = (r.bottom + 6) + 'px';
    panel.style.left = left + 'px';
    btn.classList.add('active');
    setTimeout(() => document.addEventListener('click', _moreOutside, true), 0);
    window.addEventListener('hashchange', closeMoreMenu);
  }

  function logout() {
    const wasLoggedIn = !!Auth.current();
    Auth.logout();
    renderNav();
    Router.go('/');
    toast(wasLoggedIn ? 'Du er nå logget ut.' : 'Du er allerede logget ut.', 'info');
  }

  // ── Search (site-wide: pages, users, radio stations) ─────────────────────
  // Accent-insensitive so «søk» matches «sok» and «U-Recken» matches «recken».
  function _searchNorm(s) {
    return (s || '').toString().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  // The navigable pages/tabs. `kw` = extra keywords (synonyms, EN/NO) to match on.
  function _searchPages() {
    const me = (Auth.current && Auth.current()) || null;
    const pages = [
      { label: 'Hjem',        sub: 'Forsiden',                   icon: 'home',     route: '/',            kw: 'home forside front start hovedside' },
      { label: 'Radio',       sub: 'Live psy/ambient-stasjoner', icon: 'radio',    route: '/radio',       kw: 'stream stasjon stasjoner station live lyd musikk lytt' },
      { label: 'Sendinger',   sub: 'Live-sendinger & sendetider', icon: 'mic',     route: '/sendinger',   kw: 'sendinger sending sendetid broadcast live dj mikse stream gå live hør live tidsplan schedule' },
      { label: 'Chat',        sub: 'Fellesskap-chat',            icon: 'message',  route: '/chat',        kw: 'prat melding samtale community' },
      { label: 'Discover',    sub: 'Finn folk & musikk',         icon: 'music',    route: '/discover',    kw: 'oppdage utforsk finn folk artister discover' },
      { label: 'Underground', sub: 'Underground-scene',          icon: 'moon',     route: '/underground', kw: 'undergrunn scene' },
      { label: 'Shows',       sub: 'Konserter & arrangement',    icon: 'calendar', route: '/shows',       kw: 'konsert konserter event arrangement festival gig show' },
      { label: 'World',       sub: 'All Over The World',         icon: 'globe',    route: '/world',       kw: 'verden global psytrance psybient world' },
      { label: 'Magasin',     sub: 'Intervjuer, utgivelser & festivaler', icon: 'book', route: '/magazine', kw: 'magasin magazine blad intervju utgivelser plateselskap label festival fester news nyheter' },
      { label: 'A1',          sub: 'AI + søk hele nettet',       icon: 'sparkles', route: '/a1',          kw: 'ai assistent søk web a1 chat' },
      { label: 'Shop',        sub: 'Abonnement & kreditt',       icon: 'store',    route: '/shop',        kw: 'butikk kjøp pro abonnement credits kreditt shop' },
    ];
    // Bare tilby disse når modulen faktisk er lastet (ellers blir ruta blank).
    if (typeof window.Friends !== 'undefined')
      pages.push({ label: 'Friends',   sub: 'Online & vennene dine', icon: 'users', route: '/friends',   kw: 'venner online friends' });
    if (typeof window.Community !== 'undefined')
      pages.push({ label: 'Community', sub: 'Community-vegg',         icon: 'users', route: '/community', kw: 'fellesskap vegg wall community' });
    if (me) {
      pages.push(
        { label: 'Min side',       sub: 'Oversikten din',       icon: 'home',     route: '/minside',          kw: 'minside dashboard oversikt' },
        { label: 'Min profil',     sub: '@' + me.username,      icon: 'user',     route: '/u/' + me.username, kw: 'profil meg min profile' },
        { label: 'Rediger profil', sub: 'Endre profilen din',   icon: 'edit',     route: '/edit',             kw: 'rediger endre profil edit' },
        { label: 'Studio',         sub: 'Blend Studio',         icon: 'image',    route: '/studio',           kw: 'studio blend bilde' },
        { label: 'Innboks',        sub: 'Meldingene dine',      icon: 'mail',     route: '/inbox',            kw: 'innboks inbox meldinger' },
        { label: 'Innstillinger',  sub: 'Konto & preferanser',  icon: 'settings', route: '/settings',         kw: 'innstillinger settings konto preferanser' },
      );
    } else {
      pages.push(
        { label: 'Logg inn',  sub: 'Få tilgang', icon: 'log-in', route: '/login',    kw: 'logg inn login' },
        { label: 'Registrer', sub: 'Lag konto',  icon: 'user',   route: '/register', kw: 'registrer signup konto ny' },
      );
    }
    return pages;
  }

  function _searchRun(input, drop) {
    const raw = input.value.trim();
    const q = _searchNorm(raw);
    if (!q) { drop.classList.add('hidden'); drop.innerHTML = ''; return; }

    const groups = [];

    // Sider / faner
    const pages = _searchPages().filter(p =>
      _searchNorm(p.label).includes(q) || _searchNorm(p.sub).includes(q) || _searchNorm(p.kw).includes(q)
    ).slice(0, 6);
    if (pages.length) groups.push({ title: 'Sider', items: pages.map(p => ({
      icon: p.icon, title: p.label, sub: p.sub, go: () => Router.go(p.route)
    })) });

    // Brukere
    let users = [];
    try { users = Auth.getAllPublicUsers() || []; } catch (e) {}
    users = users.filter(u =>
      _searchNorm(u.username).includes(q) || _searchNorm(u.displayName).includes(q)
    ).slice(0, 6);
    if (users.length) groups.push({ title: 'Brukere', items: users.map(u => ({
      avatar: (u.displayName || u.username || '?').charAt(0).toUpperCase(),
      title: u.displayName || u.username, sub: '@' + u.username, go: () => Router.go('/u/' + u.username)
    })) });

    // Radiostasjoner — gå til Radio og spill av valgt stasjon
    if (typeof Radio !== 'undefined' && Array.isArray(Radio.STATIONS)) {
      const st = Radio.STATIONS.filter(s =>
        _searchNorm(s.name).includes(q) || _searchNorm(s.cat).includes(q)
      ).slice(0, 5);
      if (st.length) groups.push({ title: 'Radiostasjoner', items: st.map(s => ({
        icon: 'radio', title: s.name, sub: s.cat || 'Radio',
        go: () => { Router.go('/radio'); setTimeout(() => { try { Radio.playStation(s.id); } catch (e) {} }, 80); }
      })) });
    }

    drop.innerHTML = '';
    if (!groups.length) {
      const empty = document.createElement('div');
      empty.className = 'search-empty';
      empty.textContent = 'Ingen treff på «' + raw + '»';
      drop.appendChild(empty);
      drop.classList.remove('hidden');
      return;
    }

    const close = () => { input.value = ''; drop.classList.add('hidden'); drop.innerHTML = ''; };
    groups.forEach(g => {
      const head = document.createElement('div');
      head.className = 'search-group-title';
      head.textContent = g.title;
      drop.appendChild(head);
      g.items.forEach(it => {
        const row = document.createElement('div');
        row.className = 'search-item';
        const left = document.createElement('div');
        if (it.avatar) { left.className = 'search-item-avatar'; left.textContent = it.avatar; }
        else { left.className = 'search-item-icon'; left.innerHTML = Icon(it.icon); }
        const body = document.createElement('div');
        body.style.minWidth = '0';
        const t = document.createElement('div'); t.className = 'search-item-title'; t.textContent = it.title;
        const sub = document.createElement('div'); sub.className = 'search-item-sub'; sub.textContent = it.sub;
        body.appendChild(t); body.appendChild(sub);
        row.appendChild(left); row.appendChild(body);
        row.addEventListener('click', () => { it.go(); close(); });
        drop.appendChild(row);
      });
    });
    drop.classList.remove('hidden');
  }

  function initSearch() {
    const input = document.getElementById('nav-search');
    const drop  = document.getElementById('search-results');
    if (!input || !drop) return;

    let debounce;
    input.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => _searchRun(input, drop), 160);
    });
    input.addEventListener('focus', () => { if (input.value.trim()) _searchRun(input, drop); });
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const first = drop.querySelector('.search-item');
        if (first) { e.preventDefault(); first.click(); }
      } else if (e.key === 'Escape') {
        drop.classList.add('hidden');
      }
    });

    document.addEventListener('click', e => {
      if (!input.contains(e.target) && !drop.contains(e.target)) drop.classList.add('hidden');
    });
  }

  // ── Pages ─────────────────────────────────────────────────────────────
  // ── Forside-feed: hjelparar ───────────────────────────────────────────────
  function _esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  function dismissOnboard() {
    localStorage.setItem('sc_onboard_dismissed', '1');
    const el = document.getElementById('sc-onboard');
    if (el) el.remove();
  }

  function composerPost() {
    const ta = document.getElementById('sc-home-post');
    const text = ta && ta.value.trim();
    if (!text) return;
    if (!Auth.current()) { Router.go('/login'); return; }
    if (window.Community && Community.post) {
      // Community.post() leser #sc-post-input — speil verdien inn i et midlertidig felt.
      let proxy = document.getElementById('sc-post-input');
      let temp = false;
      if (!proxy) { proxy = document.createElement('textarea'); proxy.id = 'sc-post-input'; proxy.style.display = 'none'; document.body.appendChild(proxy); temp = true; }
      proxy.value = text;
      Community.post();
      if (temp) proxy.remove();
      ta.value = '';
      setTimeout(refreshHomeFeed, 300);
    }
  }

  function _feedTrackHtml(t) {
    const art = t.coverUrl
      ? `background-image:url(${t.coverUrl});background-size:cover;background-position:center`
      : 'background:linear-gradient(135deg,#7c3aed,#2563eb)';
    return `
      <div class="feed-card feed-track">
        <div class="feed-track-art" style="${art}">
          <button class="feed-track-play" onclick="Discover.playTrack('${t.id}')" title="Spill av">${Icon('play')}</button>
        </div>
        <div class="feed-track-body">
          <div class="feed-card-kind">${Icon('music')} ${t.isMix ? 'Ny miks' : 'Nytt spor'}</div>
          <div class="feed-track-title">${_esc(t.title)}</div>
          <a class="feed-track-artist" href="#/u/${_esc(t.username)}">${_esc(t.artist || t.username)}</a>
        </div>
        <button class="feed-track-go" onclick="Discover.playTrack('${t.id}')">${Icon('play')} Spill</button>
      </div>`;
  }

  function _feedMemberHtml(u) {
    const t = u.theme || {};
    const bg = t.bgType === 'gradient' ? (t.bgGradient || 'linear-gradient(135deg,#7c3aed,#2563eb)')
      : `linear-gradient(135deg,${t.primaryColor || '#7c3aed'},${t.secondaryColor || '#2563eb'})`;
    return `
      <div class="feed-card feed-member">
        <a class="feed-member-av" href="#/u/${_esc(u.username)}" style="background:${bg}">${_esc((u.displayName || '?').charAt(0).toUpperCase())}</a>
        <div class="feed-member-body">
          <div class="feed-card-kind">${Icon('user')} Ny på SoundCore</div>
          <a class="feed-member-name" href="#/u/${_esc(u.username)}">${_esc(u.displayName)}</a>
          <div class="feed-member-sub">@${_esc(u.username)}</div>
        </div>
        <a class="feed-member-go" href="#/u/${_esc(u.username)}">Se profil</a>
      </div>`;
  }

  // Bygger den samla feeden: innlegg + nye spor/mikser + nye medlemmer, nyeste først.
  let _feedBusy = false;
  async function refreshHomeFeed() {
    if (!document.getElementById('sc-home-feed') || _feedBusy) return;
    _feedBusy = true;
    try {
      const items = [];
      if (window.Community && Community.visiblePosts) {
        try { for (const p of Community.visiblePosts()) items.push({ ts: p.ts || 0, html: Community.postCardHtml(p) }); } catch (e) {}
      }
      let tracks = [];
      try { if (window.Discover && Discover.loadAllTracks) tracks = await Discover.loadAllTracks(); } catch (e) {}
      for (const t of tracks) items.push({ ts: t.uploadedAt || 0, html: _feedTrackHtml(t) });
      const THIRTY = 30 * 864e5;   // nye medlemmer siste 30 dagar (eldre finst i bruker-grid lenger ned)
      try {
        for (const u of Auth.getAllPublicUsers()) {
          if (Date.now() - (u.createdAt || 0) < THIRTY) items.push({ ts: u.createdAt || 0, html: _feedMemberHtml(u) });
        }
      } catch (e) {}
      items.sort((a, b) => b.ts - a.ts);
      const top = items.slice(0, 40);
      const el = document.getElementById('sc-home-feed');
      if (el) {
        el.innerHTML = top.length ? top.map(i => i.html).join('')
          : `<div class="sc-feed-empty">Ingen aktivitet ennå. Bli den første til å <a href="#/discover">dele musikk</a> eller skrive et innlegg ovenfor!</div>`;
        if (window.LinkPreview) LinkPreview.hydrate(el);
      }
    } finally { _feedBusy = false; }
  }

  async function renderHome() {
    const user  = Auth.current();
    const users = Auth.getAllPublicUsers()
      .sort((a, b) => b.createdAt - a.createdAt);

    const pendingCount = user ? Auth.getPendingRequestsCount(user.username) : 0;
    const pendingBanner = (user && pendingCount > 0) ? `
      <div class="friend-req-banner" onclick="Router.go('/u/${user.username}')">
        <span>${Icon('users')}</span>
        <span>Du har <strong>${pendingCount}</strong> venneforespørsel${pendingCount !== 1 ? 'er' : ''} — klikk for å se dem</span>
        <span>${Icon('arrow-right')}</span>
      </div>` : '';

    const heroHtml = !user ? `
      <div class="stellar-hero">
        <div class="stellar-hero-glow"></div>
        <div class="stellar-hero-content">
          <div class="stellar-hero-badge">${Icon('sparkles')} Psychedelic · Ambient · Dub</div>
          <h1 class="stellar-hero-title">Sound Core</h1>
          <div class="stellar-hero-for">
            <span>Friends</span>
            <span class="stellar-hero-for-dot">·</span>
            <span>Developers</span>
            <span class="stellar-hero-for-dot">·</span>
            <span>Producers</span>
            <span class="stellar-hero-for-dot">·</span>
            <span>DJs</span>
          </div>
          <p class="stellar-hero-sub">Musikk Er Sosialt — Musikk Connects With People. From Friends To Developers and Producers To DJs, eller Bare Vær her Og Lytt.</p>
          <p class="stellar-hero-welcome">Lag en bruker · Velkommen å dele din kunst og opplevelser</p>
          <div class="stellar-hero-actions">
            <a href="#/radio" class="btn btn-primary landing-btn-big stellar-cta">${Icon('radio')} Lytt nå</a>
            <a href="#/register" class="btn btn-ghost landing-btn-big">Lag profil gratis</a>
            <a href="#/chat" class="btn btn-ghost landing-btn-big">${Icon('message')} Chat</a>
            <a href="#/login" class="btn btn-ghost landing-btn-big">${Icon('log-in')} Logg inn</a>
          </div>
        </div>
      </div>` : `
      <div class="stellar-hero stellar-hero-compact">
        <div class="stellar-hero-glow"></div>
        <div class="stellar-hero-content">
          <h2 class="stellar-hero-greeting">Hei, ${user.displayName} ${Icon('smile')}</h2>
          <div class="stellar-hero-actions">
            <a href="#/radio" class="btn btn-primary">${Icon('radio')} Radio</a>
            <a href="#/u/${user.username}" class="btn btn-ghost">${Icon('user')} Min profil</a>
            <a href="#/discover" class="btn btn-ghost">${Icon('music')} Discover</a>
          </div>
        </div>
      </div>`;

    const radioUsers    = users.filter(u => u.favoriteRadio?.url);
    const liveEventUsers = users.filter(u => u.liveEvent);

    // ── Onboarding — kort, avvisbar velkomst for nye brukere ────────────────
    const onboardDismissed = localStorage.getItem('sc_onboard_dismissed') === '1';
    const onboardHtml = onboardDismissed ? '' : `
      <div class="sc-onboard" id="sc-onboard">
        <button class="sc-onboard-close" onclick="App.dismissOnboard()" title="Skjul" aria-label="Skjul velkomst">${Icon('x')}</button>
        <div class="sc-onboard-title">${Icon('sparkles')} Velkommen til SoundCore</div>
        <p class="sc-onboard-lead">Et sosialt sted for musikk — som Facebook møter SoundCloud, oppå live web-radio. Slik kommer du i gang:</p>
        <div class="sc-onboard-steps">
          <a class="sc-onboard-step" href="#/radio"><span class="sc-onboard-ic">${Icon('radio')}</span><span class="sc-onboard-tx"><strong>Hør på radio</strong>Live psy- & ambient-kanaler — trykk og lytt.</span></a>
          <a class="sc-onboard-step" href="${user ? '#/discover' : '#/register'}"><span class="sc-onboard-ic">${Icon('user')}</span><span class="sc-onboard-tx"><strong>${user ? 'Del musikken din' : 'Lag profil & del musikk'}</strong>${user ? 'Last opp spor og mikser med cover.' : 'Gratis profil — last opp spor og mikser.'}</span></a>
          <a class="sc-onboard-step" href="#/discover"><span class="sc-onboard-ic">${Icon('users')}</span><span class="sc-onboard-tx"><strong>Følg folk</strong>Finn artister og venner i Discover.</span></a>
          <a class="sc-onboard-step" href="#/community"><span class="sc-onboard-ic">${Icon('message')}</span><span class="sc-onboard-tx"><strong>Skriv et innlegg</strong>Del tanker, musikk og bilder i feeden.</span></a>
        </div>
      </div>`;

    // ── Komponer-boks — del et innlegg rett fra forsiden ───────────────────
    const composerHtml = user ? `
      <div class="sc-composer">
        <div class="sc-composer-av">${_esc((user.displayName || '?').charAt(0).toUpperCase())}</div>
        <div class="sc-composer-main">
          <textarea id="sc-home-post" class="sc-composer-input" maxlength="1000"
            placeholder="Hva tenker du på, ${_esc(user.displayName)}? Del noe med fellesskapet…"></textarea>
          <div class="sc-composer-row">
            <a class="sc-composer-media" href="#/discover" title="Last opp musikk med cover-bilde">${Icon('music')} Del musikk / bilde</a>
            <button class="btn btn-primary btn-sm sc-composer-send" onclick="App.composerPost()">${Icon('send')} Del</button>
          </div>
        </div>
      </div>` : `
      <div class="sc-composer sc-composer-guest">
        <span class="sc-composer-guest-ic">${Icon('edit')}</span>
        <span>Vil du dele musikk og innlegg? <a href="#/register">Lag en gratis profil</a> eller <a href="#/login">logg inn</a>.</span>
      </div>`;

    // ── «Live & spiller nå» — samlet stripe (live events + now playing) ─────
    const _liveCardBg = u => {
      const t = u.theme || {};
      return t.bgType === 'gradient' ? (t.bgGradient || 'linear-gradient(135deg,#7c3aed,#2563eb)')
        : `linear-gradient(135deg,${t.primaryColor || '#7c3aed'},${t.secondaryColor || '#2563eb'})`;
    };
    const _liveCards = []
      .concat(liveEventUsers.map(u => {
        const ev = u.liveEvent;
        const url = (ev.liveUrl || '').replace(/'/g, "\\'");
        const ti  = (ev.title || 'Live').replace(/'/g, "\\'");
        const play = ev.liveUrl
          ? `<button class="sc-live-play" onclick="Radio.playUrl('${url}','${ti}','🔴')" title="Lytt live">${Icon('play')}</button>`
          : `<a class="sc-live-play" href="#/u/${u.username}" title="Se profil">${Icon('arrow-right')}</a>`;
        return `<div class="sc-live-card sc-live-card--live">
          <a class="sc-live-av" href="#/u/${u.username}" style="background:${_liveCardBg(u)}" id="live-av-${u.username}">${_esc(u.displayName.charAt(0).toUpperCase())}</a>
          <div class="sc-live-meta"><div class="sc-live-name">${_esc(u.displayName)}</div><div class="sc-live-sub"><span class="event-live-dot"></span> ${_esc(ev.title || 'Live')}</div></div>
          ${play}</div>`;
      }))
      .concat(radioUsers.map(u => {
        const r = u.favoriteRadio;
        const url = (r.url || '').replace(/'/g, "\\'");
        const nm  = (r.name || 'Radio').replace(/'/g, "\\'");
        return `<div class="sc-live-card">
          <a class="sc-live-av" href="#/u/${u.username}" style="background:${_liveCardBg(u)}" id="np-av-${u.username}">${_esc(u.displayName.charAt(0).toUpperCase())}</a>
          <div class="sc-live-meta"><div class="sc-live-name">${_esc(u.displayName)}</div><div class="sc-live-sub">${Icon('radio')} ${_esc(r.name || 'Radio')}</div></div>
          <button class="sc-live-play" onclick="Radio.playUrl('${url}','${nm}','${r.emoji || '📻'}')" title="Lytt">${Icon('play')}</button></div>`;
      }));
    const liveStripHtml = _liveCards.length ? `
      <div class="sc-livestrip-wrap">
        <div class="sc-livestrip-head"><span class="event-live-dot"></span> Live & spiller nå <span class="sc-livestrip-count">${_liveCards.length}</span></div>
        <div class="sc-livestrip">${_liveCards.join('')}</div>
      </div>` : '';

    // ── Samlet feed (fylles asynkront av App.refreshHomeFeed) ──────────────
    const feedHtml = `
      <div class="section sc-feed-section">
        <div class="section-header">
          <div class="section-title">${Icon('home')} Feed</div>
          <div class="section-sub">Det nyeste fra fellesskapet — innlegg, spor og nye folk</div>
        </div>
        <div id="sc-home-feed" class="sc-feed"><div class="page-loading"><div class="spinner"></div></div></div>
      </div>`;

    // ── Public DJ mixes from all users ─────────────────────────────────
    const allUsers = Auth.getUsers();
    const allMixEntries = [];
    for (const u of Object.values(allUsers)) {
      for (const id of (u.mixIds || [])) {
        allMixEntries.push({ mixId: id, username: u.username, displayName: u.displayName });
      }
    }
    const publicMixesSection = allMixEntries.length ? `
      <div class="section">
        <div class="section-header">
          <div class="section-title">${Icon('sliders')} DJ Mixes <span>${allMixEntries.length} mixes</span></div>
          <div class="section-sub">Last opp din egen mix fra profileditoren · privat/offentlig med Pro</div>
        </div>
        <div class="pub-mixes-grid" id="pub-mixes-grid">
          ${allMixEntries.map(e => `
            <div class="pub-mix-row" id="pubmix-${e.mixId}">
              <div class="pub-mix-icon" id="pubmix-icon-${e.mixId}">${Icon('sliders')}</div>
              <div class="pub-mix-meta">
                <div class="pub-mix-title" id="pubmix-title-${e.mixId}">Laster…</div>
                <div class="pub-mix-sub" id="pubmix-sub-${e.mixId}"><a href="#/u/${e.username}" style="color:var(--accent);text-decoration:none">@${e.username}</a></div>
              </div>
              <button class="pub-mix-play" onclick="Profile.playMix('${e.mixId}','')">${Icon('play')} Spill</button>
            </div>`).join('')}
        </div>
      </div>` : '';

    const comingSoonHtml = `
      <div class="section coming-soon-section">
        <div class="section-header">
          <div class="section-title">${Icon('rocket')} Kommer snart</div>
          <div class="section-sub">Funksjoner under utvikling</div>
        </div>
        <div class="coming-soon-grid">
          <div class="cs-card">
            <div class="cs-icon">${Icon('message')}</div>
            <div class="cs-label">Kommentarer</div>
            <div class="cs-badge">Snart</div>
          </div>
          <div class="cs-card">
            <div class="cs-icon">${Icon('music')}</div>
            <div class="cs-label">Del musikk</div>
            <div class="cs-desc">Last opp en låt med cover-bilde. AI vurderer om det er ditt eget verk eller allerede utgitt før du deler.</div>
            <button class="btn btn-primary cs-cta" onclick="ShareMusic.open()">${Icon('music')} Del en låt</button>
            <div class="cs-badge cs-badge-live">Klar</div>
          </div>
          <div class="cs-card cs-card-premium">
            <div class="cs-icon">${Icon('clock')}</div>
            <div class="cs-label">Live Mix Tid</div>
            <div class="cs-desc">Book ditt eget direktesendte mikse-slot: et reservert tidsrom der du mikser live for lytterne på Sound Core. Opptaket lagres automatisk på profilen din etterpå, så settet ditt lever videre. Du betaler kun for timene du booker — ingen abonnement, ingen binding.</div>
            <div class="cs-desc cs-price">
              <div>1 time &nbsp;<strong>150 NOK</strong></div>
              <div>2 timer &nbsp;<strong>300 NOK</strong></div>
              <div>Ytterligere timer <strong>+150 NOK/t</strong></div>
            </div>
            <button class="btn btn-primary cs-cta" onclick="LiveMix.openBooking()">${Icon('clock')} Book mikse-slot</button>
            <div class="cs-live-actions" style="display:flex;gap:0.5rem;margin-top:0.5rem">
              <button class="btn btn-ghost" onclick="LiveMix.goLive()" style="flex:1">${Icon('radio')} Gå live nå</button>
              <button class="btn btn-ghost" onclick="LiveMix.tuneIn()" style="flex:1">${Icon('headphones')} Hør live</button>
            </div>
            <div class="cs-badge cs-badge-gold">Premium</div>
          </div>
        </div>
      </div>`;

    const homeRadioHtml = `
      <div class="home-radio-section" id="home-radio-section">
<div class="hr-tab-strip" id="hr-tab-strip">
          <button class="hr-tab hr-tab-active" onclick="HomeRadio.setGenre('psytrance',this)">${Icon('wind')} Psytrance</button>
          <button class="hr-tab" onclick="HomeRadio.setGenre('downtempo',this)">${Icon('waves')} Downtempo</button>
          <button class="hr-tab" onclick="HomeRadio.setGenre('progressive',this)">${Icon('globe')} Progressive</button>
          <button class="hr-tab" onclick="HomeRadio.setGenre('ambient',this)">${Icon('sparkles')} Ambient</button>
          <button class="hr-tab" onclick="HomeRadio.setGenre('goa',this)">${Icon('sparkles')} Goa</button>
          <button class="hr-tab" onclick="HomeRadio.setGenre('dub',this)">${Icon('disc')} Dub</button>
        </div>
        <div class="hr-channel-grid" id="hr-channel-grid"></div>
      </div>`;

    const app = document.getElementById('app');
    app.innerHTML = pendingBanner + onboardHtml + heroHtml + composerHtml + liveStripHtml + feedHtml + homeRadioHtml + publicMixesSection + comingSoonHtml + `
      <div class="section">
        <div class="section-header">
          <div class="section-title">Brukere på Sound Core <span>${users.length} profiler</span></div>
        </div>
        <div class="users-grid" id="users-grid">
          <div class="page-loading"><div class="spinner"></div></div>
        </div>
      </div>
      <footer class="site-footer" id="site-footer">
        <div class="footer-drag-handle" id="footer-drag-handle" title="Dra for å flytte footeren">${Icon('grip')}</div>
        <button class="footer-min-btn" id="footer-toggle-btn" onclick="FooterWidget.hide()" title="Skjul footer">${Icon('minus')}</button>
        <div class="site-footer-inner">
          <div class="site-footer-logo">${Icon('sparkles')} Sound Core</div>
          <div class="site-footer-contact">
            <div class="site-footer-label">Kontakt</div>
            <a class="site-footer-email" href="mailto:producerenur@gmail.com">producerenur@gmail.com</a>
          </div>
          <div class="site-footer-copy">© ${new Date().getFullYear()} Sound Core</div>
        </div>
      </footer>
      <button class="footer-restore-btn" id="footer-restore-btn" onclick="FooterWidget.show()" title="Vis footer igjen">${Icon('chevron-up')} Footer</button>`;

    if (window.FooterWidget) FooterWidget.init();

    // Samla feed: start Gun-abonnement på innlegg + fyll feeden (asynkront).
    if (window.Community && Community.subscribe) Community.subscribe();
    refreshHomeFeed();

    // Home radio widget controller
    window.HomeRadio = (() => {
      const GENRE_IDS = {
        psytrance:   ['suburbsofgoa'],
        downtempo:   ['groovesalad', 'beatblender', 'fluid', 'n5md'],
        progressive: ['trancearound', 'atr', 'rr-progressive'],
        ambient:     ['spacestation', 'deepspaceone', 'missioncontrol', 'dronezone'],
        goa:         ['suburbsofgoa', 'dmtfm', 'psyndora', 'babaganousha', 'babaganousha-labs'],
        dub:         ['stellar-psy', 'heavyweightreggae'],
      };
      let _currentId = null;
      let _playing = false;

      function _updateDisplay(stationId) {
        const s = (Radio.stations || []).find(x => x.id === stationId);
        if (!s) return;
        const el = id => document.getElementById(id);
        if (el('hr-np-name'))   el('hr-np-name').textContent = s.name;
        if (el('hr-np-desc'))   el('hr-np-desc').textContent = s.desc;
        if (el('hr-np-emoji'))  el('hr-np-emoji').innerHTML = iconForEmoji(s.emoji, 'radio');
        if (el('hr-live-dot'))  el('hr-live-dot').classList.add('hr-dot-live');
        if (el('hr-np-status')) el('hr-np-status').textContent = 'LIVE';
        if (el('hr-np-play'))   { el('hr-np-play').textContent = '⏹ Stopp'; el('hr-np-play').classList.add('hr-stop-active'); }
        _playing = true;
        _currentId = stationId;
        document.querySelectorAll('.hr-channel-card').forEach(c => {
          c.classList.toggle('hr-card-active', c.dataset.id === stationId);
        });
      }

      function _renderGrid(genre) {
        const grid = document.getElementById('hr-channel-grid');
        if (!grid) return;
        const ids = GENRE_IDS[genre] || [];
        const stations = ids.map(id => (Radio.stations || []).find(s => s.id === id)).filter(Boolean);
        const extraHtml = genre === 'psytrance'
          ? `<iframe class="hr-yt-embed" src="https://www.youtube.com/embed/Y7p8r1avQLQ?list=RDY7p8r1avQLQ" allow="autoplay; encrypted-media" allowfullscreen></iframe>`
          : genre === 'downtempo'
          ? `<iframe class="hr-yt-embed" src="https://www.youtube.com/embed/YgiFnQZvGTU?list=RDYgiFnQZvGTU" allow="autoplay; encrypted-media" allowfullscreen></iframe>`
          : genre === 'progressive'
          ? `<iframe class="hr-yt-embed" src="https://www.youtube.com/embed/SdsKKXy57hw?list=RDSdsKKXy57hw" allow="autoplay; encrypted-media" allowfullscreen></iframe>`
          : genre === 'ambient'
          ? `<iframe class="hr-yt-embed" src="https://www.youtube.com/embed/wXk0hq7RB1A?list=RDwXk0hq7RB1A" allow="autoplay; encrypted-media" allowfullscreen></iframe>`
          : genre === 'goa'
          ? `<iframe class="hr-yt-embed" src="https://www.youtube.com/embed/dtk5CdOvVuc?list=RDdtk5CdOvVuc" allow="autoplay; encrypted-media" allowfullscreen></iframe>`
          : genre === 'dub'
          ? `<iframe class="hr-yt-embed" src="https://www.youtube.com/embed/videoseries?list=PLv1XAUg92fX9rVnD0r0ek-7monLM4JINL" allow="autoplay; encrypted-media" allowfullscreen></iframe>`
          : '';
        grid.innerHTML = stations.map(s => `
          <div class="hr-channel-card" data-id="${s.id}" style="--hc:${s.color}" onclick="HomeRadio.play('${s.id}')">
            <span class="hr-channel-emoji">${iconForEmoji(s.emoji, 'radio')}</span>

            <button class="hr-channel-play" onclick="event.stopPropagation();HomeRadio.play('${s.id}')">${Icon('play')}</button>
          </div>`).join('') + extraHtml;
      }

      function play(id) {
        Radio.playStation(id);
        _updateDisplay(id);
      }

      function setGenre(genre, btn) {
        document.querySelectorAll('.hr-tab').forEach(b => b.classList.remove('hr-tab-active'));
        if (btn) btn.classList.add('hr-tab-active');
        _renderGrid(genre);
      }

      function togglePlay() {
        if (_playing) {
          const audio = document.getElementById('audio-engine');
          if (audio) { audio.pause(); }
          _playing = false;
          const btn = document.getElementById('hr-np-play');
          if (btn) { btn.textContent = '▶ Spill'; btn.classList.remove('hr-stop-active'); }
          const dot = document.getElementById('hr-live-dot');
          if (dot) dot.classList.remove('hr-dot-live');
          const status = document.getElementById('hr-np-status');
          if (status) status.textContent = 'Stoppet';
        } else {
          if (_currentId) play(_currentId);
          else autoStart();
        }
      }

      function autoStart() {
        const defaultId = 'radioq37';
        Radio.playStation(defaultId);
        _updateDisplay(defaultId);
      }

      function init() {
        _renderGrid('psytrance');
        const status = document.getElementById('hr-np-status');
        if (status) status.textContent = 'Klikk ▶ for å lytte';
        const btn = document.getElementById('hr-np-play');
        if (btn) btn.textContent = '▶';
      }

      return { play, setGenre, togglePlay, autoStart, init };
    })();

    HomeRadio.init();

    // Render user cards
    const grid = document.getElementById('users-grid');
    if (!users.length) {
      grid.innerHTML = `<div class="empty-state"><div class="empty-icon">${Icon('users')}</div><p>Ingen brukere ennå. Vær den første!</p></div>`;
      return;
    }
    const currentUser = Auth.current();
    grid.innerHTML = users.map(u => {
      const t = u.theme || {};
      const bg = t.bgType === 'gradient' ? (t.bgGradient || 'linear-gradient(135deg,#7c3aed,#2563eb)')
               : `linear-gradient(135deg,${t.primaryColor || '#7c3aed'},${t.secondaryColor || '#2563eb'})`;
      const online = Auth.isOnline(u.username);
      let friendBtn = '';
      if (currentUser && currentUser.username !== u.username) {
        const fs = Auth.getFriendStatus(currentUser.username, u.username);
        if (fs === 'friends') {
          friendBtn = `<div class="user-card-friend-status">${Icon('check')} Venner</div>`;
        } else if (fs === 'pending_sent') {
          friendBtn = `<div class="user-card-friend-status user-card-friend-status--pending">${Icon('hourglass')} Forespørsel sendt</div>`;
        } else if (fs === 'pending_received') {
          friendBtn = `<button class="user-card-friend-btn user-card-friend-btn--accept" onclick="event.stopPropagation();event.preventDefault();App.quickAcceptFriend('${u.username}',this)">${Icon('check')} Aksepter</button>`;
        } else {
          friendBtn = `<button class="user-card-friend-btn" onclick="event.stopPropagation();event.preventDefault();App.quickAddFriend('${u.username}',this)">+ Legg til venn</button>`;
        }
      }
      return `
        <div class="user-card hover-lift" data-username="${u.username}" onclick="Router.go('/u/${u.username}')">
          <div class="user-card-banner" style="background:${bg}">
            <div class="user-card-avatar" style="background:${bg}">
              ${u.displayName.charAt(0).toUpperCase()}
            </div>
            ${online ? '<div class="user-online-dot" title="Online nå"></div>' : ''}
          </div>
          <div class="user-card-body">
            <div class="user-card-name">${u.displayName}</div>
            <div class="user-card-username">@${u.username}</div>
            ${u.bio ? `<div class="user-card-bio">${u.bio}</div>` : ''}
            ${friendBtn}
          </div>
        </div>`;
    }).join('');

    // Load avatars async (user cards + now-playing cards)
    for (const u of users) {
      if (u.avatarMediaId) {
        DB.getBlobUrl('media', u.avatarMediaId).then(url => {
          if (!url) return;
          document.querySelectorAll(`[data-username="${u.username}"] .user-card-avatar`).forEach(el => {
            el.innerHTML = `<img src="${url}" alt="${u.displayName}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
          });
          const npAv = document.getElementById(`np-av-${u.username}`);
          if (npAv) npAv.innerHTML = `<img src="${url}" alt="${u.displayName}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
          const liveAv = document.getElementById(`live-av-${u.username}`);
          if (liveAv) liveAv.innerHTML = `<img src="${url}" alt="${u.displayName}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
        }).catch(() => {});
      }
    }

    // Load public mix titles + filter private ones async
    for (const e of allMixEntries) {
      DB.get('mixes', e.mixId).then(async rec => {
        if (!rec) { document.getElementById(`pubmix-${e.mixId}`)?.remove(); return; }
        if (rec.visibility === 'private') { document.getElementById(`pubmix-${e.mixId}`)?.remove(); return; }
        const titleEl = document.getElementById(`pubmix-title-${e.mixId}`);
        if (titleEl) titleEl.textContent = rec.title || rec.name || 'Ukjent mix';
        const btn = document.querySelector(`#pubmix-${e.mixId} .pub-mix-play`);
        if (btn) btn.onclick = () => Profile.playMix(e.mixId, rec.title || rec.name || 'DJ Mix');
        if (rec.coverMediaId) {
          const url = await DB.getBlobUrl('media', rec.coverMediaId).catch(() => null);
          const iconEl = document.getElementById(`pubmix-icon-${e.mixId}`);
          if (iconEl && url) iconEl.innerHTML = `<img src="${url}" class="pub-mix-cover-thumb">`;
        }
        if (rec.tracklist?.length) {
          const subEl = document.getElementById(`pubmix-sub-${e.mixId}`);
          if (subEl) subEl.innerHTML += ` <span style="color:var(--text3);font-size:0.7rem">· ${rec.tracklist.length} spor</span>`;
        }
      }).catch(() => { document.getElementById(`pubmix-${e.mixId}`)?.remove(); });
    }
  }

  // ── Min side — personlig dashboard ──────────────────────────────────────
  async function renderMinSide() {
    const user = Auth.current();
    if (!user) { toast('Logg inn for å se din side', 'error'); Router.go('/login'); return; }

    const allUsers = Auth.getUsers();

    // Hent musikk fra IndexedDB (riktig database/store via DB-wrapperen).
    // Var tidligere ProfilverseDB v1 + 'media'-store — feil navn/versjon/store, så
    // lista ble alltid tom. Musikk lever i 'music'-store i ProfilVerse v4.
    let tracks = [];
    try {
      tracks = await DB.getAllByIds('music', user.musicIds || []);
    } catch {}

    // Mixes
    const mixRows = (user.mixIds || []).length
      ? (user.mixIds).map(id => `
          <div class="ms-item" id="ms-mix-${id}">
            <span class="ms-item-icon">${Icon('sliders')}</span>
            <span class="ms-item-label" id="ms-mix-label-${id}">Laster…</span>
            <button class="btn btn-ghost btn-sm" onclick="Profile.playMix('${id}','')">${Icon('play')} Spill</button>
          </div>`).join('')
      : '<p class="ms-empty">Ingen mixes lastet opp ennå. <a href="#/edit">Last opp</a></p>';

    // Musikk
    const musicRows = tracks.length
      ? tracks.map((t, i) => `
          <div class="ms-item">
            <span class="ms-item-icon">${Icon('music')}</span>
            <span class="ms-item-label">${t.name || 'Sang ' + (i + 1)}</span>
            <button class="btn btn-ghost btn-sm" onclick="Player.loadTrack('${t.id}', true)">${Icon('play')} Spill</button>
          </div>`).join('')
      : '<p class="ms-empty">Ingen musikk lastet opp ennå. <a href="#/edit">Rediger profil</a></p>';

    // Events
    const eventRows = (user.events || []).length
      ? user.events.map(ev => `
          <div class="ms-item">
            <span class="ms-item-icon">${Icon('calendar')}</span>
            <span class="ms-item-label">${ev.title || 'Arrangement'} — ${ev.date ? new Date(ev.date).toLocaleDateString('no-NO') : ''}</span>
            ${ev.isLive ? '<span class="event-live-dot" style="width:8px;height:8px;margin-left:0.5rem"></span>' : ''}
          </div>`).join('')
      : '<p class="ms-empty">Ingen arrangementer ennå. <a href="#/edit">Legg til i profilen</a></p>';

    // Venner
    const friends = (user.friends || []).map(u => allUsers[u]).filter(Boolean);
    const friendRows = friends.length
      ? friends.map(f => `
          <div class="ms-item" onclick="Router.go('/u/${f.username}')" style="cursor:pointer">
            <span class="ms-item-icon">${Icon('user')}</span>
            <span class="ms-item-label">${f.displayName} <span style="color:var(--text3)">@${f.username}</span></span>
          </div>`).join('')
      : '<p class="ms-empty">Ingen venner ennå. <a href="#/discover">Finn folk</a></p>';

    document.getElementById('app').innerHTML = `
      <div class="settings-page-v2">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem">
          <h1>${Icon('home')} Min side</h1>
          <div style="display:flex;gap:0.5rem;flex-wrap:wrap">
            <a href="#/login" class="btn btn-ghost btn-sm" title="Logg inn / bytt konto">${Icon('log-in')} Logg inn</a>
            <button class="btn btn-danger btn-sm" onclick="App.logout()">${Icon('log-out')} Logg ut</button>
          </div>
        </div>
        <div style="display:flex;gap:1rem;flex-wrap:wrap;margin-bottom:1.5rem">
          <div class="ms-stat-card">
            <div class="ms-stat-num">${(user.musicIds || []).length}</div>
            <div class="ms-stat-label">Sanger</div>
          </div>
          <div class="ms-stat-card">
            <div class="ms-stat-num">${(user.mixIds || []).length}</div>
            <div class="ms-stat-label">Mixes</div>
          </div>
          <div class="ms-stat-card">
            <div class="ms-stat-num">${(user.followers || []).length}</div>
            <div class="ms-stat-label">Følgere</div>
          </div>
          <div class="ms-stat-card">
            <div class="ms-stat-num">${(user.following || []).length}</div>
            <div class="ms-stat-label">Følger</div>
          </div>
          <div class="ms-stat-card">
            <div class="ms-stat-num">${(user.friends || []).length}</div>
            <div class="ms-stat-label">Venner</div>
          </div>
        </div>

        <div class="settings-tabs">
          <button class="settings-tab-btn active" onclick="App.settingsTab('ms-musikk',this)">${Icon('music')} Musikk</button>
          <button class="settings-tab-btn" onclick="App.settingsTab('ms-mixes',this)">${Icon('sliders')} Mixes</button>
          <button class="settings-tab-btn" onclick="App.settingsTab('ms-events',this)">${Icon('calendar')} Events</button>
          <button class="settings-tab-btn" onclick="App.settingsTab('ms-venner',this)">${Icon('users')} Venner</button>
          <button class="settings-tab-btn" onclick="App.settingsTab('ms-hurtig',this)">${Icon('zap')} Hurtiglenker</button>
        </div>

        <div id="set-tab-ms-musikk" class="settings-tab-panel active">
          <div class="settings-section">
            <div class="settings-section-header">${Icon('music')} Din musikk</div>
            <div class="settings-section-body ms-list">${musicRows}</div>
          </div>
        </div>

        <div id="set-tab-ms-mixes" class="settings-tab-panel">
          <div class="settings-section">
            <div class="settings-section-header">${Icon('sliders')} Dine DJ-mixes</div>
            <div class="settings-section-body ms-list">${mixRows}</div>
          </div>
        </div>

        <div id="set-tab-ms-events" class="settings-tab-panel">
          <div class="settings-section">
            <div class="settings-section-header">${Icon('calendar')} Dine arrangementer</div>
            <div class="settings-section-body ms-list">${eventRows}</div>
          </div>
        </div>

        <div id="set-tab-ms-venner" class="settings-tab-panel">
          <div class="settings-section">
            <div class="settings-section-header">${Icon('users')} Venner</div>
            <div class="settings-section-body ms-list">${friendRows}</div>
          </div>
        </div>

        <div id="set-tab-ms-hurtig" class="settings-tab-panel">
          <div class="settings-section">
            <div class="settings-section-header">${Icon('zap')} Hurtiglenker</div>
            <div class="settings-section-body">
              <div style="display:flex;flex-wrap:wrap;gap:0.75rem;margin-top:0.25rem">
                <a href="#/u/${user.username}" class="btn btn-ghost">${Icon('user')} Min profil</a>
                <a href="#/edit" class="btn btn-ghost">${Icon('edit')} Rediger profil</a>
                <a href="#/radio" class="btn btn-ghost">${Icon('radio')} Radio</a>
                <a href="#/inbox" class="btn btn-ghost">${Icon('mail')} Innboks</a>
                <a href="#/settings" class="btn btn-ghost">${Icon('settings')} Innstillinger</a>
                <a href="#/discover" class="btn btn-ghost">${Icon('music')} Discover</a>
                <a href="#/forgot" class="btn btn-ghost">${Icon('key')} Tilbakestill passord</a>
                <button class="btn btn-danger" onclick="App.logout()">${Icon('log-out')} Logg ut</button>
              </div>
            </div>
          </div>
        </div>
      </div>`;

    // Last inn mix-titler fra IndexedDB (riktig store: 'mixes' via DB-wrapperen).
    for (const id of (user.mixIds || [])) {
      try {
        const item = await DB.get('mixes', id);
        const el = document.getElementById(`ms-mix-label-${id}`);
        if (el) el.textContent = (item && item.name) || 'DJ Mix';
      } catch {}
    }
  }

  function renderLogin() {
    document.getElementById('app').innerHTML = `
      <div class="auth-page">
        <div class="auth-card">
          <div class="auth-logo">
            <h1>Sound<span>Core</span></h1>
            <p>Logg inn på Sound Core</p>
          </div>
          <div class="form-group">
            <label class="form-label">Brukernavn eller e-post</label>
            <input class="form-input" id="login-user" placeholder="ditt_brukernavn" autocomplete="username">
          </div>
          <div class="form-group">
            <label class="form-label">Passord</label>
            <div class="input-group">
              <input class="form-input" id="login-pass" type="password" placeholder="••••••••" autocomplete="current-password">
              <button class="input-group-icon" onclick="togglePassword('login-pass',this)">${Icon('eye')}</button>
            </div>
          </div>
          <div id="login-error" class="form-error" style="margin-bottom:0.75rem;display:none"></div>
          <button class="btn btn-primary w-full" onclick="App.doLogin()">Logg inn</button>
          <div class="auth-divider">eller</div>
          <div class="auth-footer">
            <a href="#/forgot">Glemt passord?</a>
          </div>
          <div class="auth-footer">
            Ny bruker? <a href="#/register">Registrer deg</a>
          </div>
        </div>
      </div>`;

    document.getElementById('login-pass').addEventListener('keydown', e => { if (e.key === 'Enter') App.doLogin(); });
    document.getElementById('login-user').addEventListener('keydown', e => { if (e.key === 'Enter') App.doLogin(); });
  }

  async function doLogin() {
    const user = document.getElementById('login-user')?.value?.trim();
    const pass = document.getElementById('login-pass')?.value;
    const errEl = document.getElementById('login-error');

    // Server-kontoer først (sannhetskilden). Faller tilbake til lokal modus om
    // API-et ikke er tilgjengelig (utvikling) eller ikke konfigurert.
    let result = await AccountServer.login({ usernameOrEmail: user, password: pass });
    if (result.offline) result = Auth.login(user, pass);

    if (result.error) {
      if (errEl) {
        if (result.notActivated) {
          errEl.innerHTML = `${result.error} <button onclick="App.resendActivationByEmail('${user.replace(/'/g, "\\'")}')" style="background:none;border:none;color:var(--accent);text-decoration:underline;cursor:pointer;padding:0;font-size:inherit">Send aktiveringslenke på nytt</button>`;
        } else {
          errEl.textContent = result.error;
        }
        errEl.style.display = 'block';
      }
      return;
    }
    renderNav();
    toast(`Velkommen tilbake til Sound Core, ${result.user.displayName}! ${Icon('smile')}`, 'success');
    Router.go('/');
  }

  async function resendActivationByEmail(usernameOrEmail) {
    toast('Sender aktiveringslenke…', 'info');

    // Server først: regenererer token og sender e-posten server-side.
    const serverRes = await AccountServer.resend(usernameOrEmail);
    if (!serverRes.offline) {
      if (serverRes.emailError) { toast('Feil: ' + serverRes.emailError, 'error'); return; }
      toast('Aktiveringslenke sendt! Sjekk e-posten din 📧', 'success');
      return;
    }

    // Lokal fallback (utvikling / API utilgjengelig).
    const users = Auth.getUsers();
    let u = users[usernameOrEmail];
    if (!u) u = Object.values(users).find(x => x.email === usernameOrEmail.toLowerCase().trim());
    if (!u) { toast('Fant ikke kontoen', 'error'); return; }
    if (u.activated) { toast('Kontoen er allerede aktivert', 'info'); return; }

    if (!u.activationToken) {
      const token = Array.from(crypto.getRandomValues(new Uint8Array(40))).map(b => b.toString(16).padStart(2,'0')).join('');
      Auth.updateUser(u.username, { activationToken: token });
      u.activationToken = token;
    }

    const res = await Email.sendActivation(u.email, u.username, u.activationToken);
    toast(res.error ? 'Feil: ' + res.error : 'Aktiveringslenke sendt! Sjekk e-posten din 📧', res.error ? 'error' : 'success');
  }

  function renderRegister() {
    document.getElementById('app').innerHTML = `
      <div class="auth-page">
        <div class="auth-card">
          <div class="auth-logo">
            <h1>Sound<span>Core</span></h1>
            <p>Lag din gratis Sound Core-profil</p>
          </div>
          <div class="form-group">
            <label class="form-label">Brukernavn</label>
            <input class="form-input" id="reg-username" placeholder="kun_bokstaver_tall_" autocomplete="username">
            <span class="form-hint">Kun bokstaver, tall og underscore. Minst 3 tegn.</span>
          </div>
          <div class="form-group">
            <label class="form-label">Visningsnavn</label>
            <input class="form-input" id="reg-displayname" placeholder="Ditt fulle navn">
          </div>
          <div class="form-group">
            <label class="form-label">E-postadresse</label>
            <input class="form-input" id="reg-email" type="email" placeholder="deg@eksempel.no" autocomplete="email">
          </div>
          <div class="form-group">
            <label class="form-label">Passord</label>
            <div class="input-group">
              <input class="form-input" id="reg-pass" type="password" placeholder="Minst 6 tegn" autocomplete="new-password">
              <button class="input-group-icon" onclick="togglePassword('reg-pass',this)">${Icon('eye')}</button>
            </div>
            <span class="form-hint">Minst 6 tegn og ett spesialtegn (f.eks. !@#$%)</span>
          </div>
          <div class="form-group">
            <label class="form-label">Bekreft passord</label>
            <input class="form-input" id="reg-pass2" type="password" placeholder="Gjenta passord" autocomplete="new-password">
          </div>
          <div class="form-group">
            <label class="form-label">Hva er du?</label>
            <div class="role-selector" id="reg-role-selector">
              <label class="role-option" onclick="App.selectRole('lytter',this)">
                <input type="radio" name="reg-role" value="lytter" checked style="display:none">
                <div class="role-option-inner active"><span class="role-option-emoji">${Icon('headphones')}</span><span class="role-option-label">Lytter</span></div>
              </label>
              <label class="role-option" onclick="App.selectRole('dj',this)">
                <input type="radio" name="reg-role" value="dj" style="display:none">
                <div class="role-option-inner"><span class="role-option-emoji">${Icon('sliders')}</span><span class="role-option-label">DJ</span></div>
              </label>
              <label class="role-option" onclick="App.selectRole('produsent',this)">
                <input type="radio" name="reg-role" value="produsent" style="display:none">
                <div class="role-option-inner"><span class="role-option-emoji">${Icon('music')}</span><span class="role-option-label">Produsent</span></div>
              </label>
              <label class="role-option" onclick="App.selectRole('plateselskap',this)">
                <input type="radio" name="reg-role" value="plateselskap" style="display:none">
                <div class="role-option-inner"><span class="role-option-emoji">${Icon('tag')}</span><span class="role-option-label">Plateselskap</span></div>
              </label>
            </div>
          </div>
          <div id="reg-error" class="form-error" style="margin-bottom:0.75rem;display:none"></div>
          <button class="btn btn-primary w-full" id="reg-btn" onclick="App.doRegister()">Registrer</button>
          <div class="auth-footer" style="margin-top:1rem">
            Har du allerede en konto? <a href="#/login">Logg inn</a>
          </div>
        </div>
      </div>`;

    document.getElementById('reg-pass2').addEventListener('keydown', e => { if (e.key === 'Enter') App.doRegister(); });
  }

  async function doRegister() {
    const username    = document.getElementById('reg-username')?.value?.trim();
    const displayName = document.getElementById('reg-displayname')?.value?.trim();
    const email       = document.getElementById('reg-email')?.value?.trim();
    const pass        = document.getElementById('reg-pass')?.value;
    const pass2       = document.getElementById('reg-pass2')?.value;
    const errEl       = document.getElementById('reg-error');
    const btn         = document.getElementById('reg-btn');

    if (pass !== pass2) {
      if (errEl) { errEl.textContent = 'Passordene stemmer ikke overens'; errEl.style.display = 'block'; }
      return;
    }

    const roleInput = document.querySelector('input[name="reg-role"]:checked');
    const role = roleInput?.value || 'lytter';

    // Vis «kontoen ble opprettet, men e-posten gikk ikke ut» — ærlig melding.
    const showEmailFailedPage = (msg) => {
      document.getElementById('app').innerHTML = `
        <div class="auth-page">
          <div class="auth-card" style="text-align:center">
            <div style="font-size:4rem;margin-bottom:1rem">${Icon('alert')}</div>
            <h2 style="font-weight:800;margin-bottom:0.5rem">Kontoen ble opprettet</h2>
            <p style="color:var(--text2);margin-bottom:1rem">
              Men vi klarte dessverre ikke å sende aktiveringslenken til <strong>${email}</strong> akkurat nå.
            </p>
            <div class="badge badge-red" style="margin-bottom:1.25rem">${msg}</div>
            <div style="margin-bottom:0.75rem">
              <button class="btn btn-primary" id="resend-confirm-btn" onclick="App.resendActivationByEmail('${username}')">${Icon('mail')} Prøv å sende aktiveringslenken igjen</button>
            </div>
            <a href="#/login" class="btn btn-ghost btn-sm" style="display:inline-flex">Gå til innlogging</a>
          </div>
        </div>`;
    };
    // Vis «sjekk e-posten din» — aktiveringslenke sendt OK.
    const showCheckEmailPage = () => {
      document.getElementById('app').innerHTML = `
        <div class="auth-page">
          <div class="auth-card" style="text-align:center">
            <div style="font-size:4rem;margin-bottom:1rem">${Icon('mail')}</div>
            <h2 style="font-weight:800;margin-bottom:0.5rem">Sjekk e-posten din!</h2>
            <p style="color:var(--text2);margin-bottom:1.5rem">
              Vi har sendt en aktiveringslenke til <strong>${email}</strong>.<br>
              Klikk på lenken i e-posten for å aktivere kontoen din.
            </p>
            <a href="#/login" class="btn btn-primary" style="margin-bottom:0.75rem;display:inline-flex">Gå til innlogging</a>
            <div style="margin-top:0.75rem">
              <button class="btn btn-ghost btn-sm" id="resend-confirm-btn" onclick="App.resendActivationByEmail('${username}')">${Icon('mail')} Send aktiveringslenke på nytt</button>
            </div>
            <p style="color:var(--text2);font-size:0.8rem;margin-top:1rem">Fant du ikke e-posten? Sjekk søppelpost-mappen.</p>
          </div>
        </div>`;
    };

    if (btn) { btn.textContent = 'Registrerer…'; btn.disabled = true; }

    // ── Server-kontoer først (sannhetskilden) ──────────────────────────────
    // Global unik e-post, lagring på tvers av enheter, ekte glemt-passord.
    const serverRes = await AccountServer.register({ username, displayName, email, password: pass, role });
    if (!serverRes.offline) {
      if (btn) { btn.textContent = 'Registrer'; btn.disabled = false; }
      if (serverRes.error) {
        if (errEl) { errEl.textContent = serverRes.error; errEl.style.display = 'block'; }
        return;
      }
      // Konto opprettet på serveren. Serveren har allerede prøvd å sende e-posten.
      Auth.updateUser(username, { role });
      if (serverRes.emailError) showEmailFailedPage(serverRes.emailError);
      else                      showCheckEmailPage();
      return;
    }

    // ── Lokal fallback (utvikling / API utilgjengelig) ─────────────────────
    const result = Auth.register(username, pass, displayName, email);
    if (btn) { btn.textContent = 'Registrer'; btn.disabled = false; }

    if (result.error) {
      if (errEl) { errEl.textContent = result.error; errEl.style.display = 'block'; }
      return;
    }

    Auth.updateUser(username, { role });

    const emailRes = await Email.sendActivation(email, username, result.activationToken);

    if (emailRes.devMode) {
      // Auto-activated in dev mode — log the user in immediately
      localStorage.setItem('pv_session', JSON.stringify({ username, ts: Date.now() }));
      renderNav();
      toast(`Konto opprettet! Velkommen, ${displayName || username}! ${Icon('party')}`, 'success');
      Router.go(`/u/${username}`);
    } else if (emailRes.error) {
      showEmailFailedPage(emailRes.error);
    } else {
      showCheckEmailPage();
    }
  }

  function renderForgotPassword() {
    document.getElementById('app').innerHTML = `
      <div class="auth-page">
        <div class="auth-card">
          <div class="auth-logo">
            <h1>Sound Core</h1>
            <p>Tilbakestill passord</p>
          </div>
          <div class="form-group">
            <label class="form-label">E-postadresse</label>
            <input class="form-input" id="forgot-email" type="email" placeholder="deg@eksempel.no" autocomplete="email">
          </div>
          <div id="forgot-error" class="form-error" style="margin-bottom:0.75rem;display:none"></div>
          <div id="forgot-success" style="display:none;margin-bottom:0.75rem;color:var(--green);font-size:0.875rem"></div>
          <button class="btn btn-primary w-full" id="forgot-btn" onclick="App.doForgotPassword()">Send tilbakestillingslenke</button>
          <div class="auth-footer"><a href="#/login">${Icon('arrow-left')} Tilbake til innlogging</a></div>
        </div>
      </div>`;
    document.getElementById('forgot-email').addEventListener('keydown', e => { if (e.key === 'Enter') App.doForgotPassword(); });
  }

  async function doForgotPassword() {
    const email  = document.getElementById('forgot-email')?.value?.trim();
    const errEl  = document.getElementById('forgot-error');
    const sucEl  = document.getElementById('forgot-success');
    const btn    = document.getElementById('forgot-btn');

    if (!email) { if (errEl) { errEl.textContent = 'Skriv inn e-postadressen din'; errEl.style.display = 'block'; } return; }

    if (btn) { btn.textContent = 'Sender…'; btn.disabled = true; }

    // Server først: slår opp kontoen globalt og sender e-posten selv. Svarer
    // generisk (avslører ikke om adressen finnes) for å hindre kontooppramsing.
    const serverRes = await AccountServer.forgot(email);
    if (!serverRes.offline) {
      if (btn) { btn.textContent = 'Send tilbakestillingslenke'; btn.disabled = false; }
      if (serverRes.error) {
        if (errEl) { errEl.textContent = serverRes.error; errEl.style.display = 'block'; }
        return;
      }
      if (errEl) errEl.style.display = 'none';
      if (sucEl) {
        sucEl.style.display = 'block';
        sucEl.innerHTML = `${Icon('check-circle')} Finnes det en konto med <strong>${email}</strong>, har vi sendt en tilbakestillingslenke dit. Sjekk e-posten (og søppelpost-mappen).`;
      }
      return;
    }

    // Lokal fallback (utvikling / API utilgjengelig).
    const result = Auth.forgotPassword(email);
    if (btn) { btn.textContent = 'Send tilbakestillingslenke'; btn.disabled = false; }

    if (result.error) {
      if (errEl) { errEl.textContent = result.error; errEl.style.display = 'block'; }
      return;
    }

    const emailRes = await Email.sendPasswordReset(email, result.username, result.token);

    if (errEl) errEl.style.display = 'none';
    if (sucEl) {
      sucEl.style.display = 'block';
      sucEl.innerHTML = emailRes.devMode
        ? `${Icon('check-circle')} (Dev-modus) Lenke: <a href="${emailRes.link}" style="color:var(--accent)">${emailRes.link}</a>`
        : `${Icon('check-circle')} Tilbakestillingslenke sendt til ${email}`;
    }
  }

  function renderResetPassword(token) {
    document.getElementById('app').innerHTML = `
      <div class="auth-page">
        <div class="auth-card">
          <div class="auth-logo">
            <h1>Sound Core</h1>
            <p>Nytt passord</p>
          </div>
          <div class="form-group">
            <label class="form-label">Nytt passord</label>
            <div class="input-group">
              <input class="form-input" id="reset-pass" type="password" placeholder="Minst 6 tegn">
              <button class="input-group-icon" onclick="togglePassword('reset-pass',this)">${Icon('eye')}</button>
            </div>
            <span class="form-hint">Minst 6 tegn og ett spesialtegn (f.eks. !@#$%)</span>
          </div>
          <div class="form-group">
            <label class="form-label">Bekreft passord</label>
            <input class="form-input" id="reset-pass2" type="password" placeholder="Gjenta passord">
          </div>
          <div id="reset-error" class="form-error" style="margin-bottom:0.75rem;display:none"></div>
          <button class="btn btn-primary w-full" onclick="App.doResetPassword('${token}')">Sett nytt passord</button>
        </div>
      </div>`;
  }

  async function doResetPassword(token) {
    const pass  = document.getElementById('reset-pass')?.value;
    const pass2 = document.getElementById('reset-pass2')?.value;
    const errEl = document.getElementById('reset-error');
    if (pass !== pass2) {
      if (errEl) { errEl.textContent = 'Passordene stemmer ikke'; errEl.style.display = 'block'; }
      return;
    }
    // Server først (sannhetskilden), lokal fallback om API-et ikke er tilgjengelig.
    let result = await AccountServer.reset(token, pass);
    if (result.offline) result = Auth.resetPassword(token, pass);

    if (result.error) {
      if (errEl) { errEl.textContent = result.error; errEl.style.display = 'block'; }
      return;
    }
    toast('Passord oppdatert! Logg inn.', 'success');
    Router.go('/login');
  }

  async function renderActivate(token) {
    // Server først (sannhetskilden). AccountServer.activate logger også inn ved
    // suksess. Lokal fallback om API-et ikke er tilgjengelig.
    let result = await AccountServer.activate(token);
    if (result.offline) result = Auth.activate(token);
    if (result.error) {
      document.getElementById('app').innerHTML = `
        <div class="auth-page"><div class="auth-card" style="text-align:center">
          <div style="font-size:3rem">${Icon('alert')}</div>
          <h2>Ugyldig lenke</h2>
          <p style="color:var(--text2);margin-top:0.5rem">${result.error}</p>
          <a href="#/register" class="btn btn-primary" style="margin-top:1.5rem;display:inline-flex">Prøv igjen</a>
        </div></div>`;
      return;
    }
    // Kvittering + auto-login: vis «You are now activated» et øyeblikk, logg så
    // automatisk inn og send brukeren til forsiden på www.soundcoredevelopment.com.
    localStorage.setItem('pv_session', JSON.stringify({ username: result.user.username, ts: Date.now() }));
    renderNav();
    toast(`Konto aktivert! Logger deg inn … ${Icon('party')}`, 'success');
    document.getElementById('app').innerHTML = `
      <div class="auth-page"><div class="auth-card" style="text-align:center">
        <div style="font-size:4rem;margin-bottom:1rem">${Icon('check-circle')}</div>
        <h2 style="font-weight:800;margin-bottom:0.5rem">You are now activated 🎉</h2>
        <p style="color:var(--text2);margin-bottom:1.5rem">
          Velkommen, <strong>${result.user.displayName}</strong>! Du blir logget inn og sendt til Sound Core …
        </p>
        <a href="#/" class="btn btn-primary" style="display:inline-flex">${Icon('arrow-right')} Gå til Sound Core nå</a>
      </div></div>`;
    // Etter et par sekund: gå til forsiden på det kanoniske domenet. Økten ligger
    // på samme origin (aktiveringslenka er kanonisk), så auto-innloggingen følger med.
    setTimeout(() => {
      const canonical = (CONFIG.CANONICAL_URL || window.location.origin).replace(/\/$/, '');
      const isLocal   = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|)$/.test(location.hostname);
      if (isLocal || window.location.origin === new URL(canonical).origin) {
        Router.go('/');                       // samme origin → SPA-nav, bevarer økten
      } else {
        window.location.href = canonical + '/'; // ellers full-nav til www.soundcoredevelopment.com
      }
    }, 2500);
  }

  function renderInbox(activeTab = 'samtaler') {
    const user = Auth.current();
    if (!user) { toast('Logg inn for å se innboksen', 'error'); Router.go('/login'); return; }

    const pendingRequests = user.friendRequests || [];
    const allUsers        = Auth.getAllPublicUsers();

    // Find all PM conversations involving this user
    const convs = [];
    for (const u of allUsers) {
      if (u.username === user.username) continue;
      const key  = 'sr_pm_' + [user.username, u.username].sort().join('_');
      const msgs = JSON.parse(localStorage.getItem(key) || '[]');
      if (!msgs.length) continue;
      const last     = msgs[msgs.length - 1];
      const readKey  = 'sr_pm_read_' + user.username;
      const reads    = JSON.parse(localStorage.getItem(readKey) || '{}');
      const lastRead = reads[u.username] || 0;
      const unread   = msgs.filter(m => m.from !== user.username && m.ts > lastRead).length;
      const nameKey  = 'sr_pm_name_' + [user.username, u.username].sort().join('_');
      const chatName = localStorage.getItem(nameKey) || '';
      convs.push({ username: u.username, displayName: u.displayName, last, msgCount: msgs.length, unread, chatName });
    }
    convs.sort((a, b) => b.last.ts - a.last.ts);

    const allOtherUsers = allUsers.filter(u => u.username !== user.username);
    const friends = new Set(Auth.getFriends(user.username).map(f => f.username));
    const sent    = new Set(user.sentRequests || []);

    // ── Tab: Samtaler ────────────────────────────────────────────────────
    const samtaleRows = convs.length ? convs.map(c => {
      const isMine = c.last.from === user.username;
      const timeStr = (() => {
        const d = Date.now() - c.last.ts;
        if (d < 60000)    return 'Nå nettopp';
        if (d < 3600000)  return `${Math.floor(d/60000)} min siden`;
        if (d < 86400000) return `${Math.floor(d/3600000)} t siden`;
        return new Date(c.last.ts).toLocaleDateString('no-NO');
      })();
      const label = c.chatName || c.displayName;
      return `
        <div class="settings-row" onclick="Router.go('/messages/${c.username}')" style="cursor:pointer${c.unread > 0 ? ';background:rgba(124,58,237,0.06)' : ''}">
          <div style="display:flex;align-items:center;gap:0.75rem;flex:1;min-width:0">
            <div style="position:relative;flex-shrink:0">
              <div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,var(--accent),#2563eb);display:flex;align-items:center;justify-content:center;font-weight:700">${c.displayName.charAt(0).toUpperCase()}</div>
              ${c.unread > 0 ? `<span style="position:absolute;top:-3px;right:-3px;background:#ef4444;color:#fff;border-radius:999px;font-size:0.65rem;font-weight:700;min-width:16px;height:16px;display:flex;align-items:center;justify-content:center;padding:0 3px">${c.unread}</span>` : ''}
            </div>
            <div style="min-width:0;flex:1">
              <div style="font-weight:${c.unread > 0 ? '700' : '600'}">${label} <span style="font-size:0.75rem;color:var(--text3)">@${c.username}</span></div>
              <div style="font-size:0.82rem;color:${c.unread > 0 ? 'var(--text)' : 'var(--text2)'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:${c.unread > 0 ? '600' : '400'}">${isMine ? 'Du: ' : ''}${c.last.text}</div>
            </div>
          </div>
          <div style="font-size:0.75rem;color:var(--text3);white-space:nowrap;margin-left:0.75rem">${timeStr}</div>
        </div>`;
    }).join('') : '<p style="color:var(--text3);font-size:0.85rem;padding:1rem 0">Ingen samtaler ennå. Gå til <strong>Brukere</strong> og inviter noen til å chatte!</p>';

    // ── Tab: Ny chat ─────────────────────────────────────────────────────
    const nychatContent = `
      <p style="color:var(--text2);font-size:0.88rem;margin:0 0 1.25rem">Velg hvem du vil chatte med, og gi samtalen et valgfritt navn.</p>
      <div style="display:flex;flex-direction:column;gap:1rem;max-width:420px">
        <div>
          <label style="display:block;font-size:0.82rem;color:var(--text2);margin-bottom:0.35rem;font-weight:600">Bruker *</label>
          <select id="inbox-new-chat-user" style="width:100%;background:var(--surface,#1a1a2e);border:1px solid var(--border,rgba(255,255,255,0.12));border-radius:8px;padding:0.6rem 0.75rem;color:var(--text,#fff);font-size:0.9rem">
            <option value="">— Velg bruker —</option>
            ${allOtherUsers.map(u => `<option value="${u.username}">${u.displayName} (@${u.username})</option>`).join('')}
          </select>
        </div>
        <div>
          <label style="display:block;font-size:0.82rem;color:var(--text2);margin-bottom:0.35rem;font-weight:600">Navn på samtalen <span style="font-weight:400;color:var(--text3)">(valgfritt)</span></label>
          <input type="text" id="inbox-new-chat-name"
            placeholder="f.eks. Prosjekt, Musikk-snakk, Samarbeid…"
            maxlength="60"
            style="width:100%;background:var(--surface,#1a1a2e);border:1px solid var(--border,rgba(255,255,255,0.12));border-radius:8px;padding:0.6rem 0.75rem;color:var(--text,#fff);font-size:0.9rem;box-sizing:border-box">
        </div>
        <button class="btn btn-primary" style="align-self:flex-start" onclick="App.startNewChat()">${Icon('message')} Start chat</button>
      </div>`;

    // ── Tab: Brukere ─────────────────────────────────────────────────────
    const brukereRows = !allOtherUsers.length
      ? '<p style="color:var(--text3);font-size:0.85rem">Ingen andre brukere ennå.</p>'
      : allOtherUsers.map(u => {
          const isFriend   = friends.has(u.username);
          const isPending  = sent.has(u.username);
          const isIncoming = (user.friendRequests||[]).some(r => r.from === u.username);
          let friendBtn = '';
          if (isFriend) {
            friendBtn = `<span style="font-size:0.78rem;color:#4ade80">${Icon('check')} Venner</span>`;
          } else if (isPending) {
            friendBtn = `<span style="font-size:0.78rem;color:var(--text3)">${Icon('hourglass')} Sendt</span>`;
          } else if (isIncoming) {
            friendBtn = `<button class="btn btn-primary btn-sm" onclick="App.inboxAccept('${u.username}')">${Icon('check')} Aksepter</button>`;
          } else {
            friendBtn = `<button class="btn btn-ghost btn-sm" onclick="Profile.sendFriendRequest('${u.username}');App.renderInbox('brukere')">${Icon('users')} Legg til</button>`;
          }
          return `
            <div class="settings-row">
              <a href="#/u/${u.username}" style="display:flex;align-items:center;gap:0.75rem;text-decoration:none;color:inherit;flex:1;min-width:0">
                <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#7c3aed,#2563eb);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.85rem;flex-shrink:0">${u.displayName.charAt(0).toUpperCase()}</div>
                <div>
                  <div style="font-weight:600;font-size:0.88rem">${u.displayName}</div>
                  <div style="font-size:0.75rem;color:var(--text2)">@${u.username}</div>
                </div>
              </a>
              <div style="display:flex;align-items:center;gap:0.5rem">
                <button class="btn btn-primary btn-sm" onclick="App.inviteToChat('${u.username}')">${Icon('mail')} Inviter til chat</button>
                ${friendBtn}
              </div>
            </div>`;
        }).join('');

    // ── Tab: Forespørsler ─────────────────────────────────────────────────
    const forsporslerRows = pendingRequests.length
      ? pendingRequests.map(r => {
          const requester = Auth.getUser(r.from);
          if (!requester) return '';
          return `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:0.75rem 0;border-bottom:1px solid var(--border,rgba(255,255,255,0.08))">
              <a href="#/u/${r.from}" style="display:flex;align-items:center;gap:0.75rem;text-decoration:none;color:inherit">
                <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,var(--accent),#2563eb);display:flex;align-items:center;justify-content:center;font-weight:700">${requester.displayName.charAt(0).toUpperCase()}</div>
                <div>
                  <div style="font-weight:600">${requester.displayName}</div>
                  <div style="font-size:0.78rem;color:var(--text2)">@${r.from}</div>
                </div>
              </a>
              <div style="display:flex;gap:0.5rem">
                <button class="btn btn-primary btn-sm" onclick="App.inboxAccept('${r.from}')">${Icon('check')} Aksepter</button>
                <button class="btn btn-ghost btn-sm" onclick="App.inboxReject('${r.from}')">${Icon('x')} Avslå</button>
              </div>
            </div>`;
        }).join('')
      : '<p style="color:var(--text3);font-size:0.85rem;padding:1rem 0">Ingen venneforespørsler.</p>';

    const tabs = [
      { id: 'samtaler',    label: `${Icon('message')} Samtaler${convs.length ? ` (${convs.length})` : ''}` },
      { id: 'nychat',      label: '➕ Ny chat' },
      { id: 'brukere',     label: `${Icon('globe')} Brukere${allOtherUsers.length ? ` (${allOtherUsers.length})` : ''}` },
      { id: 'forsporsler', label: `${Icon('users')} Forespørsler${pendingRequests.length ? ` (${pendingRequests.length})` : ''}` },
    ];

    const tabContentMap = {
      samtaler:    `<div class="settings-section"><div class="settings-section-header">${Icon('message')} Samtaler</div><div class="settings-section-body">${samtaleRows}</div></div>`,
      nychat:      `<div class="settings-section"><div class="settings-section-header">${Icon('plus')} Ny chat</div><div class="settings-section-body">${nychatContent}</div></div>`,
      brukere:     `<div class="settings-section"><div class="settings-section-header">${Icon('globe')} Alle brukere</div><div class="settings-section-body">${brukereRows}</div></div>`,
      forsporsler: `<div class="settings-section"><div class="settings-section-header">${Icon('users')} Venneforespørsler</div><div class="settings-section-body">${forsporslerRows}</div></div>`,
    };

    document.getElementById('app').innerHTML = `
      <div class="settings-page">
        <h1>${Icon('mail')} Innboks</h1>
        <div class="inbox-tabs">
          ${tabs.map(t => `<button class="inbox-tab-btn${activeTab === t.id ? ' active' : ''}" onclick="App.renderInbox('${t.id}')">${t.label}</button>`).join('')}
        </div>
        ${tabContentMap[activeTab] || tabContentMap.samtaler}
      </div>`;
  }

  function startNewChat() {
    const userEl = document.getElementById('inbox-new-chat-user');
    const nameEl = document.getElementById('inbox-new-chat-name');
    if (!userEl || !userEl.value) { toast('Velg en bruker å starte chat med', 'error'); return; }
    const targetUsername = userEl.value;
    const chatName = nameEl?.value?.trim() || '';
    if (chatName) {
      const u = Auth.current();
      const nameKey = 'sr_pm_name_' + [u.username, targetUsername].sort().join('_');
      localStorage.setItem(nameKey, chatName);
    }
    Router.go('/messages/' + targetUsername);
  }

  function inviteToChat(targetUsername) {
    Router.go('/messages/' + targetUsername);
  }

  async function quickAddFriend(targetUsername, btn) {
    const current = Auth.current();
    if (!current) { Router.go('/login'); return; }
    const result = Auth.sendFriendRequest(current.username, targetUsername);
    if (result.error) { toast(result.error, 'error'); return; }
    btn.textContent = '⏳ Sendt';
    btn.className = 'user-card-friend-btn user-card-friend-btn--pending';
    btn.onclick = null;
    toast(`Venneforespørsel sendt til @${targetUsername}`, 'success');
    if (window.Notify) Notify.emit(targetUsername, { type: 'friend_request', text: 'sendte deg en venneforespørsel', link: `#/u/${current.username}` });
    renderNav();
    const targetUser = Auth.getUser(targetUsername);
    if (targetUser?.email) {
      Email.sendFriendRequest(targetUser.email, targetUser.displayName, current.displayName, current.username)
        .catch(() => {});
    }
  }

  function quickAcceptFriend(fromUsername, btn) {
    const current = Auth.current();
    if (!current) { Router.go('/login'); return; }
    const result = Auth.acceptFriendRequest(current.username, fromUsername);
    if (result.error) { toast(result.error, 'error'); return; }
    const statusDiv = document.createElement('div');
    statusDiv.className = 'user-card-friend-status';
    statusDiv.textContent = '✓ Venner';
    btn.replaceWith(statusDiv);
    if (window.Notify) Notify.emit(fromUsername, { type: 'friend_accept', text: 'godtok venneforespørselen din', link: `#/u/${current.username}` });
    toast(`Du er nå venner med @${fromUsername}! ${Icon('party')}`, 'success');
    renderNav();
  }

  function inboxAccept(fromUsername) {
    const u = Auth.current();
    if (!u) return;
    Auth.acceptFriendRequest(u.username, fromUsername);
    renderNav();
    toast(`Du er nå venner med @${fromUsername}! ${Icon('party')}`, 'success');
    renderInbox('forsporsler');
  }

  function inboxReject(fromUsername) {
    const u = Auth.current();
    if (!u) return;
    Auth.rejectFriendRequest(u.username, fromUsername);
    toast('Avslått', 'info');
    renderInbox('forsporsler');
  }

  function renderSettings() {
    const user = Auth.current();
    if (!user) { toast('Logg inn for å se innstillinger', 'error'); Router.go('/login'); return; }

    const isPro = user.subscription === 'pro';
    const filters = user.theme?.bgImageFilters || { brightness: 100, contrast: 100, saturation: 100, hue: 0 };

    document.getElementById('app').innerHTML = `
      <div class="settings-page-v2">
        <h1>${Icon('settings')} Innstillinger</h1>

        <div class="settings-tabs">
          <button class="settings-tab-btn active" onclick="App.settingsTab('abonnement',this)">${Icon('star')} Abonnement</button>
          <button class="settings-tab-btn" onclick="App.settingsTab('konto',this)">${Icon('user')} Konto</button>
          <button class="settings-tab-btn" onclick="App.settingsTab('betaling',this)">${Icon('credit-card')} Betaling</button>
          <button class="settings-tab-btn" onclick="App.settingsTab('minside',this)">${Icon('palette')} Min Side</button>
          <button class="settings-tab-btn" onclick="App.settingsTab('ai',this)">${Icon('bot')} AI-assistent</button>
          <button class="settings-tab-btn" onclick="App.settingsTab('konfig',this)">${Icon('wrench')} Konfigurasjon</button>
        </div>

        <!-- ══ ABONNEMENT ══ -->
        <div id="set-tab-abonnement" class="settings-tab-panel active">
          <div class="plan-cards">
            <div class="plan-card ${!isPro ? 'current-plan' : ''}">
              <div class="plan-card-name">${Icon('headphones')} Gratis</div>
              <div class="plan-card-price">0 kr / måned</div>
              <ul class="plan-card-features">
                <li>Profil og avatar</li>
                <li>Radio og chat</li>
                <li>Opplasting av musikk</li>
                <li>Offentlige DJ-mixes</li>
              </ul>
            </div>
            <div class="plan-card ${isPro ? 'current-plan' : ''}">
              <div class="plan-card-name">${Icon('star')} Pro</div>
              <div class="plan-card-price">fra 108 kr / måned</div>
              <ul class="plan-card-features">
                <li>Alt i Gratis</li>
                <li>DJ-mixes over 3 timer (ingen grense)</li>
                <li>Private DJ-mixes</li>
                <li>Pro-badge + prioritert støtte</li>
              </ul>
              ${!isPro
                ? `<button class="btn btn-primary w-full" onclick="Payment.startCheckout('${user.username}')">Oppgrader til Pro</button>
                   <a href="#/shop" class="shop-link-sm" style="text-align:center;width:100%;margin-top:0.6rem">Se 1, 3, 6 og 12 mnd i Shop →</a>`
                : `<div style="text-align:center;color:#4ade80;font-weight:700;margin-top:0.5rem">${Icon('check')} Aktivt abonnement</div>`}
            </div>
          </div>

          <div class="admin-contact-box">
            <div class="admin-icon">${Icon('message')}</div>
            <div>
              <div style="font-weight:700;margin-bottom:0.2rem">Kontakt admin</div>
              <div style="font-size:0.85rem;color:var(--text2)">Spørsmål om abonnement eller betaling? Ta kontakt: <a href="mailto:producerenur@gmail.com">producerenur@gmail.com</a></div>
            </div>
          </div>
        </div>

        <!-- ══ KONTO ══ -->
        <div id="set-tab-konto" class="settings-tab-panel">
          <div class="settings-section">
            <div class="settings-section-header">${Icon('user')} Kontoinformasjon</div>
            <div class="settings-section-body">
              <div class="settings-row">
                <div>
                  <div class="settings-row-label">Innlogget som</div>
                  <div class="settings-row-hint">@${user.username} · ${user.email}</div>
                </div>
                <button class="btn btn-ghost btn-sm" onclick="App.logout()">Logg ut</button>
              </div>
              <div class="settings-row">
                <div>
                  <div class="settings-row-label">E-postaktivering</div>
                  <div class="settings-row-hint">${user.activated ? '✅ Kontoen er aktivert' : '⚠️ Ikke aktivert'}</div>
                </div>
                ${!user.activated
                  ? `<button class="btn btn-ghost btn-sm" id="resend-act-btn" onclick="App.resendActivation()">${Icon('mail')} Send på nytt</button>`
                  : ''}
              </div>
            </div>
          </div>

          <div class="settings-section">
            <div class="settings-section-header">${Icon('wrench')} Admin — aktivering</div>
            <div class="settings-section-body">
              <p style="font-size:0.875rem;color:var(--text2);margin-bottom:1rem">
                Send aktiveringslenke til alle brukere som ikke er aktivert ennå.<br>
                <span style="font-size:0.8rem;color:var(--text3)">Uaktiverte brukere: ${Object.values(Auth.getUsers()).filter(u => !u.activated).length}</span>
              </p>
              <button class="btn btn-ghost btn-sm" id="activate-all-btn" onclick="App.sendActivationToAll()">${Icon('mail')} Send til alle uaktiverte</button>
              <span id="activate-all-result" style="font-size:0.8rem;margin-left:0.75rem;color:var(--text2)"></span>
            </div>
          </div>

          <div class="settings-section">
            <div class="settings-section-header">${Icon('lock')} Passord</div>
            <div class="settings-section-body">
              <p style="font-size:0.875rem;color:var(--text2);margin-bottom:1rem">Send en tilbakestillingslenke til <strong>${user.email}</strong></p>
              <button class="btn btn-ghost btn-sm" id="send-reset-btn" onclick="App.sendPasswordResetFromSettings()">${Icon('key')} Send tilbakestillingslenke</button>
              <span id="reset-result" style="font-size:0.8rem;margin-left:0.75rem"></span>
            </div>
          </div>

          <div class="settings-section">
            <div class="settings-section-header">${Icon('smartphone')} QR-kode innlogging</div>
            <div class="settings-section-body">
              <p style="font-size:0.875rem;color:var(--text2);margin-bottom:1rem">
                Scan QR-koden med mobil eller nettbrett for å logge inn automatisk som <strong>@${user.username}</strong>.
                <br><span style="font-size:0.8rem;color:var(--text3)">Koden er gyldig i 15 minutter.</span>
              </p>
              <button class="btn btn-primary btn-sm" onclick="App.generateQRLogin()">${Icon('share')} Generer QR-kode</button>
              <div id="qr-login-box" style="display:none;margin-top:1.25rem">
                <div style="background:#fff;display:inline-block;padding:1rem;border-radius:12px">
                  <canvas id="qr-login-canvas"></canvas>
                </div>
                <div style="font-size:0.8rem;color:var(--text3);margin-top:0.5rem" id="qr-login-expiry"></div>
              </div>
            </div>
          </div>

          <div class="settings-section">
            <div class="settings-section-header" style="color:var(--red)">${Icon('alert')} Faresone</div>
            <div class="settings-section-body">
              <div class="danger-zone">
                <div class="danger-zone-title">Slett profil</div>
                <p style="font-size:0.82rem;color:var(--text2);margin-bottom:0.75rem">Dette sletter kontoen din permanent. Handlingen kan ikke angres.</p>
                <button class="btn btn-danger btn-sm" onclick="App.confirmDeleteAccount()">${Icon('trash')} Slett min profil</button>
              </div>
            </div>
          </div>
        </div>

        <!-- ══ BETALING ══ -->
        <div id="set-tab-betaling" class="settings-tab-panel">
          <div class="settings-section">
            <div class="settings-section-header">${Icon('credit-card')} Betalingsmetode</div>
            <div class="settings-section-body">
              <p style="font-size:0.875rem;color:var(--text2);margin-bottom:1rem">Velg foretrukket betalingsmetode for abonnement. Faktisk betaling behandles sikkert via Stripe.</p>
              <div class="payment-methods">
                <div class="payment-method-btn ${(user.paymentMethod || 'card') === 'card' ? 'selected' : ''}" onclick="App.selectPaymentMethod('card',this)">
                  <div class="pm-icon">${Icon('credit-card')}</div>
                  <div class="pm-label">Bankkort</div>
                </div>
                <div class="payment-method-btn ${user.paymentMethod === 'paypal' ? 'selected' : ''}" onclick="App.selectPaymentMethod('paypal',this)">
                  <div class="pm-icon">${Icon('map-pin')}</div>
                  <div class="pm-label">PayPal</div>
                </div>
              </div>
              <div id="set-card-fields" style="${(user.paymentMethod || 'card') !== 'card' ? 'display:none' : ''}">
                <div class="form-group">
                  <label class="form-label">Kortinnehaver</label>
                  <input class="form-input" id="set-card-name" placeholder="Fullt navn" value="${user.cardName || ''}">
                </div>
                <div class="form-group">
                  <label class="form-label">Kortnummer (lagres ikke, kun referanse)</label>
                  <input class="form-input" id="set-card-last4" placeholder="Siste 4 sifre" maxlength="4" value="${user.cardLast4 || ''}">
                </div>
              </div>
              <div id="set-paypal-fields" style="${user.paymentMethod !== 'paypal' ? 'display:none' : ''}">
                <div class="form-group">
                  <label class="form-label">PayPal e-post</label>
                  <input class="form-input" id="set-paypal-email" type="email" placeholder="din@paypal.no" value="${user.paypalEmail || ''}">
                </div>
              </div>
              <button class="btn btn-primary btn-sm" style="margin-top:0.5rem" onclick="App.savePaymentMethod()">${Icon('save')} Lagre betalingsinfo</button>
            </div>
          </div>

          ${isPro ? `
          <div class="settings-section">
            <div class="settings-section-header">${Icon('clipboard')} Abonnementsstatus</div>
            <div class="settings-section-body">
              <div class="settings-row">
                <div><div class="settings-row-label">Plan</div><div class="settings-row-hint">Pro</div></div>
                <span style="color:#4ade80;font-weight:700">${Icon('check')} Aktiv</span>
              </div>
              <div class="settings-row">
                <div><div class="settings-row-label">Spørsmål om faktura?</div></div>
                <a href="mailto:producerenur@gmail.com" class="btn btn-ghost btn-sm">Kontakt admin</a>
              </div>
            </div>
          </div>` : ''}
        </div>

        <!-- ══ MIN SIDE ══ -->
        <div id="set-tab-minside" class="settings-tab-panel">
          <div class="settings-section">
            <div class="settings-section-header">${Icon('image')} Bakgrunnsbilde</div>
            <div class="settings-section-body">
              <p style="font-size:0.85rem;color:var(--text2);margin-bottom:1rem">Last opp et bilde som vises i bakgrunnen på hele siden.</p>
              <button class="btn btn-ghost btn-sm" onclick="document.getElementById('bg-file-input').click()">${Icon('camera')} Last opp bakgrunnsbilde</button>
              <div style="margin-top:1.25rem">
                <div style="font-size:0.82rem;font-weight:700;color:var(--text2);margin-bottom:0.5rem">Psykedelisk effekt</div>
                <div class="effect-grid">
                  <button class="effect-btn" data-effect="psychedelic" onclick="BgManager.setEffect('psychedelic')">${Icon('wind')} Psykedelisk</button>
                  <button class="effect-btn" data-effect="acid" onclick="BgManager.setEffect('acid')">${Icon('zap')} Acid</button>
                  <button class="effect-btn" data-effect="space" onclick="BgManager.setEffect('space')">${Icon('rocket')} Space</button>
                  <button class="effect-btn" data-effect="chill" onclick="BgManager.setEffect('chill')">${Icon('leaf')} Chill</button>
                </div>
              </div>
              <div style="margin-top:1.25rem">
                <div style="font-size:0.82rem;font-weight:700;color:var(--text2);margin-bottom:0.5rem">Partikler</div>
                <div class="particle-grid">
                  <button class="particle-btn" data-pstyle="stars" onclick="BgManager.setParticleStyle('stars')">${Icon('sparkles')} Stjerner</button>
                  <button class="particle-btn" data-pstyle="bubbles" onclick="BgManager.setParticleStyle('bubbles')">${Icon('droplet')} Bobler</button>
                  <button class="particle-btn" data-pstyle="sparks" onclick="BgManager.setParticleStyle('sparks')">${Icon('zap')} Gnister</button>
                  <button class="particle-btn" data-pstyle="aurora" onclick="BgManager.setParticleStyle('aurora')">${Icon('sparkles')} Aurora</button>
                  <button class="particle-btn" data-pstyle="none" onclick="BgManager.setParticleStyle('none')">${Icon('x')} Ingen</button>
                </div>
              </div>
            </div>
          </div>

          <div class="settings-section">
            <div class="settings-section-header">${Icon('sliders')} Bildejusteringer</div>
            <div class="settings-section-body">
              <div class="filter-sliders">
                <div class="filter-row">
                  <label>Lysstyrke</label>
                  <input type="range" min="20" max="200" value="${filters.brightness}" oninput="App.liveFilter('brightness',this.value)">
                  <span class="filter-val" id="fv-brightness">${filters.brightness}%</span>
                </div>
                <div class="filter-row">
                  <label>Kontrast</label>
                  <input type="range" min="20" max="200" value="${filters.contrast}" oninput="App.liveFilter('contrast',this.value)">
                  <span class="filter-val" id="fv-contrast">${filters.contrast}%</span>
                </div>
                <div class="filter-row">
                  <label>Metning</label>
                  <input type="range" min="0" max="300" value="${filters.saturation}" oninput="App.liveFilter('saturation',this.value)">
                  <span class="filter-val" id="fv-saturation">${filters.saturation}%</span>
                </div>
                <div class="filter-row">
                  <label>Fargetone</label>
                  <input type="range" min="0" max="360" value="${filters.hue}" oninput="App.liveFilter('hue',this.value)">
                  <span class="filter-val" id="fv-hue">${filters.hue}°</span>
                </div>
              </div>
              <div style="margin-top:1.25rem">
                <div style="font-size:0.82rem;font-weight:700;color:var(--text2);margin-bottom:0.5rem">Hurtigforvalg</div>
                <div class="preset-grid">
                  <button class="preset-btn" onclick="App.applyFilterPreset('normal')">${Icon('palette')} Normal</button>
                  <button class="preset-btn" onclick="App.applyFilterPreset('bw')">${Icon('square')} Svart/hvitt</button>
                  <button class="preset-btn" onclick="App.applyFilterPreset('lys')">${Icon('sun')} Lys</button>
                  <button class="preset-btn" onclick="App.applyFilterPreset('mork')">${Icon('moon')} Mørk</button>
                  <button class="preset-btn" onclick="App.applyFilterPreset('vibrant')">${Icon('rainbow')} Vibrant</button>
                  <button class="preset-btn" onclick="App.applyFilterPreset('cool')">${Icon('snowflake')} Kald</button>
                  <button class="preset-btn" onclick="App.applyFilterPreset('warm')">${Icon('flame')} Varm</button>
                </div>
              </div>
              <button class="btn btn-primary btn-sm" style="margin-top:1rem" onclick="App.saveFilterSettings()">${Icon('save')} Lagre justeringer</button>
            </div>
          </div>

          <div class="settings-section">
            <div class="settings-section-header">${Icon('edit')} Tekster på siden</div>
            <div class="settings-section-body">
              <div class="form-group">
                <label class="form-label">Bio / Beskrivelse</label>
                <textarea class="form-input" id="set-bio" rows="3" placeholder="Fortell noe om deg selv…">${user.bio || ''}</textarea>
              </div>
              <div class="form-group">
                <label class="form-label">Profillenker (én per linje, format: Tekst|URL)</label>
                <textarea class="form-input" id="set-links" rows="3" placeholder="SoundCloud|https://soundcloud.com/deg">${(user.links || []).map(l => l.label + '|' + l.url).join('\n')}</textarea>
              </div>
              <button class="btn btn-primary btn-sm" onclick="App.savePageTexts()">${Icon('save')} Lagre tekster</button>
            </div>
          </div>
        </div>

        <!-- ══ AI ASSISTENT ══ -->
        <div id="set-tab-ai" class="settings-tab-panel">
          <div class="settings-section">
            <div class="settings-section-header">${Icon('bot')} Core — AI-assistent</div>
            <div class="set-ai-chat">
              <div class="set-ai-messages" id="set-ai-msgs">
                <div class="set-ai-msg bot">Hei! Jeg heter Core og er din AI-assistent på Sound Core. Jeg kan hjelpe deg med å finne radiokanaler, tilpasse profilen din, svare på spørsmål om siden — eller bare slå av en prat om musikk. Hva lurer du på? ${Icon('music')}</div>
              </div>
              <div class="set-ai-input-row">
                <input class="form-input" id="set-ai-input" placeholder="Skriv en melding…" onkeydown="if(event.key==='Enter')App.sendAiMessage()">
                <button class="btn btn-primary btn-sm" onclick="App.sendAiMessage()">Send</button>
              </div>
            </div>
            ${!AI.hasKey() ? `<p style="font-size:0.8rem;color:var(--text3);padding:0.75rem 1rem">${Icon('info')} Legg inn Claude API-nøkkel i Konfigurasjon-fanen for å aktivere AI-assistenten.</p>` : ''}
          </div>
        </div>

        <!-- ══ KONFIGURASJON ══ -->
        <div id="set-tab-konfig" class="settings-tab-panel">
          <div class="settings-section">
            <div class="settings-section-header">${Icon('bot')} AI-integrasjon (Claude API)</div>
            <div class="settings-section-body">
              <p class="text-muted text-sm" style="margin-bottom:1rem">
                ${Icon('check-circle')} AI-funksjonene (assistenten Core, bio-generator, fargeforslag) kjører nå via serveren — du trenger ikke legge inn en egen nøkkel. Feltet under er valgfritt og brukes kun hvis du vil overstyre med din egen Claude-nøkkel.
              </p>
              <div class="form-group">
                <label class="form-label">Claude (Anthropic) API-nøkkel</label>
                <div class="api-key-field input-group">
                  <input class="form-input" id="set-anthropic-key" type="password" placeholder="sk-ant-…" value="${CONFIG.ANTHROPIC_API_KEY}">
                  <button class="api-key-toggle" onclick="togglePassword('set-anthropic-key',this)">${Icon('eye')}</button>
                </div>
              </div>
            </div>
          </div>

          <div class="settings-section">
            <div class="settings-section-header">${Icon('mail')} E-post (EmailJS)</div>
            <div class="settings-section-body">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;flex-wrap:wrap;gap:0.5rem">
                <p class="text-muted text-sm" style="margin:0">
                  Konfigurer EmailJS for aktiverings- og tilbakestillingslenker.
                  <a href="https://www.emailjs.com" target="_blank" style="color:var(--accent)">Opprett konto ${Icon('arrow-right')}</a>
                </p>
                <span id="ejs-status-badge" style="font-size:0.78rem;font-weight:600;padding:0.25rem 0.65rem;border-radius:999px;background:${Email.isConfigured() ? 'rgba(34,197,94,0.15)' : 'rgba(251,191,36,0.15)'};color:${Email.isConfigured() ? '#4ade80' : '#fbbf24'}">
                  ${Email.isConfigured() ? '✅ Konfigurert' : '⚠️ Ikke konfigurert'}
                </span>
              </div>
              <div class="form-group">
                <label class="form-label">Service ID</label>
                <input class="form-input" id="set-ejs-service" placeholder="service_xxxxxxx" value="${CONFIG.EMAILJS_SERVICE_ID}">
              </div>
              <div class="form-group">
                <label class="form-label">Aktiveringsmal ID</label>
                <input class="form-input" id="set-ejs-tmpl-act" placeholder="template_xxxxxxx" value="${CONFIG.EMAILJS_TEMPLATE_ACTIVATION}">
                <span class="form-hint">Variabler: <code>{{to_email}}</code> <code>{{to_name}}</code> <code>{{activate_url}}</code></span>
              </div>
              <div class="form-group">
                <label class="form-label">Tilbakestillingsmal ID</label>
                <input class="form-input" id="set-ejs-tmpl-rst" placeholder="template_xxxxxxx" value="${CONFIG.EMAILJS_TEMPLATE_RESET}">
                <span class="form-hint">Variabler: <code>{{to_email}}</code> <code>{{to_name}}</code> <code>{{reset_url}}</code></span>
              </div>
              <div class="form-group">
                <label class="form-label">Meldingsvarsel-mal ID <span style="font-size:0.75rem;color:var(--text3)">(valgfri)</span></label>
                <input class="form-input" id="set-ejs-tmpl-msg" placeholder="template_xxxxxxx" value="${CONFIG.EMAILJS_TEMPLATE_MESSAGE}">
                <span class="form-hint">Variabler: <code>{{to_email}}</code> <code>{{to_name}}</code> <code>{{from_name}}</code> <code>{{message_preview}}</code> <code>{{inbox_url}}</code></span>
              </div>
              <div class="form-group">
                <label class="form-label">Public Key</label>
                <div class="api-key-field input-group">
                  <input class="form-input" id="set-ejs-pubkey" type="password" placeholder="xxxxxxxxxxxxxxx" value="${CONFIG.EMAILJS_PUBLIC_KEY}">
                  <button class="api-key-toggle" onclick="togglePassword('set-ejs-pubkey',this)">${Icon('eye')}</button>
                </div>
              </div>
              ${Auth.current() ? `
              <div style="margin-top:0.75rem">
                <button class="btn btn-ghost btn-sm" id="ejs-test-btn" onclick="App.testEmailJS()">
                  ${Icon('mail')} Send test-e-post til ${Auth.current().email}
                </button>
                <span id="ejs-test-result" style="font-size:0.8rem;margin-left:0.75rem"></span>
              </div>` : ''}
            </div>
          </div>

          <div style="display:flex;gap:0.75rem;margin-top:1.5rem">
            <button class="btn btn-primary" onclick="App.saveSettings()">${Icon('save')} Lagre konfigurasjon</button>
            <a href="#/" class="btn btn-ghost">${Icon('arrow-left')} Hjem</a>
          </div>
        </div>
      </div>`;

    // Reset AI chat history when settings page is re-entered
    _aiHistory.length = 0;
    window._pendingFilters = null;
  }

  function settingsTab(name, btn) {
    document.querySelectorAll('.settings-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.settings-tab-panel').forEach(p => p.classList.remove('active'));
    if (btn) btn.classList.add('active');
    const panel = document.getElementById('set-tab-' + name);
    if (panel) panel.classList.add('active');
  }

  async function resendActivation() {
    const user = Auth.current();
    if (!user) return;
    const btn = document.getElementById('resend-act-btn');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Sender…'; }

    const users = Auth.getUsers();
    const u = users[user.username];
    if (!u) return;

    if (!u.activationToken) {
      const token = Array.from(crypto.getRandomValues(new Uint8Array(40))).map(b => b.toString(16).padStart(2,'0')).join('');
      u.activationToken = token;
      Auth.updateUser(user.username, { activationToken: token });
    }

    const res = await Email.sendActivation(user.email, user.username, u.activationToken);
    if (btn) { btn.disabled = false; btn.textContent = '📧 Send på nytt'; }
    toast(res.error ? 'Feil: ' + res.error : 'Aktiveringslenke sendt! 📧', res.error ? 'error' : 'success');
  }

  async function sendActivationToAll() {
    const btn = document.getElementById('activate-all-btn');
    const result = document.getElementById('activate-all-result');
    const allUsers = Object.values(Auth.getUsers()).filter(u => !u.activated);

    if (!allUsers.length) {
      if (result) result.textContent = 'Alle brukere er allerede aktivert.';
      return;
    }

    if (btn) { btn.disabled = true; btn.textContent = '⏳ Sender…'; }
    if (result) result.textContent = '';

    let sent = 0, failed = 0;
    for (const u of allUsers) {
      if (!u.activationToken) {
        const token = Array.from(crypto.getRandomValues(new Uint8Array(40))).map(b => b.toString(16).padStart(2,'0')).join('');
        Auth.updateUser(u.username, { activationToken: token });
        u.activationToken = token;
      }
      const r = await Email.sendActivation(u.email, u.username, u.activationToken);
      r.error ? failed++ : sent++;
    }

    if (btn) { btn.disabled = false; btn.textContent = '📧 Send til alle uaktiverte'; }
    if (result) result.textContent = `Sendt: ${sent}, Feilet: ${failed}`;
    toast(`Aktiveringslenker sendt til ${sent} bruker${sent !== 1 ? 'e' : ''}.`, sent ? 'success' : 'error');
  }

  async function sendPasswordResetFromSettings() {
    const user = Auth.current();
    if (!user) return;
    const btn    = document.getElementById('send-reset-btn');
    const result = document.getElementById('reset-result');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Sender…'; }

    const res = Auth.forgotPassword(user.email);
    if (res.error) {
      if (btn) { btn.disabled = false; btn.textContent = '🔑 Send tilbakestillingslenke'; }
      toast(res.error, 'error'); return;
    }

    const emailRes = await Email.sendPasswordReset(user.email, res.username, res.token);
    if (btn) { btn.disabled = false; btn.textContent = '🔑 Send tilbakestillingslenke'; }
    if (result) {
      result.textContent = emailRes.error ? '❌ ' + emailRes.error : '✅ Sendt!';
      result.style.color = emailRes.error ? '#f87171' : '#4ade80';
    }
  }

  function confirmDeleteAccount() {
    const user = Auth.current();
    if (!user) return;
    const box = document.getElementById('modal-box');
    if (!box) return;
    box.innerHTML = `
      <div class="modal-header"><h2>${Icon('trash')} Slett profil</h2></div>
      <div style="padding:1.25rem">
        <p style="margin-bottom:1rem;color:var(--text2)">Er du sikker på at du vil slette kontoen <strong>@${user.username}</strong>? Dette kan ikke angres.</p>
        <div style="display:flex;gap:0.75rem">
          <button class="btn btn-danger" onclick="App.deleteAccount()">Ja, slett kontoen</button>
          <button class="btn btn-ghost" onclick="App.closeModal()">Avbryt</button>
        </div>
      </div>`;
    openModal();
  }

  function deleteAccount() {
    const user = Auth.current();
    if (!user) return;
    const users = Auth.getUsers();
    delete users[user.username];
    localStorage.setItem('pv_users', JSON.stringify(users));
    Auth.logout();
    closeModal();
    renderNav();
    toast('Kontoen er slettet.', 'info');
    Router.go('/');
  }

  function selectPaymentMethod(method, el) {
    document.querySelectorAll('.payment-method-btn').forEach(b => b.classList.remove('selected'));
    el.classList.add('selected');
    document.getElementById('set-card-fields').style.display   = method === 'card'   ? '' : 'none';
    document.getElementById('set-paypal-fields').style.display = method === 'paypal' ? '' : 'none';
    window._selectedPaymentMethod = method;
  }

  function savePaymentMethod() {
    const user = Auth.current();
    if (!user) return;
    const method = window._selectedPaymentMethod || user.paymentMethod || 'card';
    const data = { paymentMethod: method };
    if (method === 'card') {
      data.cardName  = document.getElementById('set-card-name')?.value?.trim() || '';
      data.cardLast4 = document.getElementById('set-card-last4')?.value?.replace(/\D/g,'').slice(-4) || '';
    } else if (method === 'paypal') {
      data.paypalEmail = document.getElementById('set-paypal-email')?.value?.trim() || '';
    }
    Auth.updateUser(user.username, data);
    toast('Betalingsinfo lagret ✓', 'success');
  }

  // Live-update background image CSS filter as sliders move
  function liveFilter(prop, val) {
    const valEl = document.getElementById('fv-' + prop);
    if (valEl) valEl.textContent = prop === 'hue' ? val + '°' : val + '%';

    const f = _currentFilters();
    f[prop] = Number(val);
    _applyFilters(f);
    window._pendingFilters = f;
  }

  function _currentFilters() {
    if (window._pendingFilters) return { ...window._pendingFilters };
    const user = Auth.current();
    return { ...(user?.theme?.bgImageFilters || { brightness: 100, contrast: 100, saturation: 100, hue: 0 }) };
  }

  function _applyFilters(f) {
    const img = document.getElementById('bg-img');
    if (!img) return;
    img.style.filter = `brightness(${f.brightness/100}) contrast(${f.contrast/100}) saturate(${f.saturation/100}) hue-rotate(${f.hue}deg)`;
    img.style.animation = 'none'; // pause animated effects while manually adjusting
  }

  const FILTER_PRESETS = {
    normal:  { brightness: 100, contrast: 100, saturation: 100, hue: 0 },
    bw:      { brightness: 100, contrast: 110, saturation: 0,   hue: 0 },
    lys:     { brightness: 160, contrast: 95,  saturation: 90,  hue: 0 },
    mork:    { brightness: 45,  contrast: 110, saturation: 120, hue: 0 },
    vibrant: { brightness: 105, contrast: 115, saturation: 220, hue: 0 },
    cool:    { brightness: 95,  contrast: 105, saturation: 130, hue: 200 },
    warm:    { brightness: 105, contrast: 105, saturation: 130, hue: 30 },
  };

  function applyFilterPreset(preset) {
    const f = FILTER_PRESETS[preset];
    if (!f) return;
    window._pendingFilters = { ...f };
    _applyFilters(f);
    // Update sliders
    const map = { brightness: [20,200,'%'], contrast: [20,200,'%'], saturation: [0,300,'%'], hue: [0,360,'°'] };
    for (const [prop, [,, unit]] of Object.entries(map)) {
      const slider = document.querySelector(`.filter-row input[oninput*="'${prop}'"]`);
      if (slider) slider.value = f[prop];
      const valEl = document.getElementById('fv-' + prop);
      if (valEl) valEl.textContent = f[prop] + unit;
    }
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    event?.target?.classList.add('active');
  }

  function saveFilterSettings() {
    const user = Auth.current();
    if (!user) return;
    const f = window._pendingFilters || _currentFilters();
    const theme = { ...(user.theme || {}), bgImageFilters: f };
    Auth.updateUser(user.username, { theme });
    window._pendingFilters = null;
    toast('Justeringer lagret ✓', 'success');
  }

  function savePageTexts() {
    const user = Auth.current();
    if (!user) return;
    const bio = document.getElementById('set-bio')?.value?.trim() || '';
    const linksRaw = document.getElementById('set-links')?.value?.trim() || '';
    const links = linksRaw.split('\n').filter(Boolean).map(line => {
      const [label, ...rest] = line.split('|');
      return { label: label.trim(), url: rest.join('|').trim() };
    }).filter(l => l.label && l.url);
    Auth.updateUser(user.username, { bio, links });
    toast('Tekster lagret ✓', 'success');
  }

  // AI chat in settings tab
  const _aiHistory = [];
  async function sendAiMessage() {
    const input = document.getElementById('set-ai-input');
    const msgs  = document.getElementById('set-ai-msgs');
    if (!input || !msgs) return;
    const text = input.value.trim();
    if (!text) return;
    input.value = '';

    const userEl = document.createElement('div');
    userEl.className = 'set-ai-msg user';
    userEl.textContent = text;
    msgs.appendChild(userEl);

    const typingEl = document.createElement('div');
    typingEl.className = 'set-ai-msg bot typing';
    typingEl.textContent = 'Skriver…';
    msgs.appendChild(typingEl);
    msgs.scrollTop = msgs.scrollHeight;

    _aiHistory.push({ role: 'user', content: text });

    try {
      const reply = await AI.siteAssistantChat(_aiHistory);
      _aiHistory.push({ role: 'assistant', content: reply });
      typingEl.className = 'set-ai-msg bot';
      typingEl.textContent = reply;
    } catch (e) {
      typingEl.className = 'set-ai-msg bot';
      typingEl.textContent = e.message === 'no_key'
        ? 'Legg inn API-nøkkel i Konfigurasjon-fanen for å bruke AI-assistenten.'
        : 'Beklager, noe gikk galt. Prøv igjen.';
    }
    msgs.scrollTop = msgs.scrollHeight;
  }

  function saveSettings() {
    const anthropicKey = document.getElementById('set-anthropic-key')?.value?.trim() || '';
    const ejsService   = document.getElementById('set-ejs-service')?.value?.trim()   || '';
    const ejsTmplAct   = document.getElementById('set-ejs-tmpl-act')?.value?.trim()  || '';
    const ejsTmplRst   = document.getElementById('set-ejs-tmpl-rst')?.value?.trim()  || '';
    const ejsTmplMsg   = document.getElementById('set-ejs-tmpl-msg')?.value?.trim()  || '';
    const ejsPubKey    = document.getElementById('set-ejs-pubkey')?.value?.trim()    || '';
    CONFIG.save(anthropicKey, ejsService, ejsTmplAct, ejsTmplRst, ejsTmplMsg, ejsPubKey);
    toast('Konfigurasjon lagret! ✓', 'success');

    const badge = document.getElementById('ejs-status-badge');
    if (badge) {
      const ok = Email.isConfigured();
      badge.textContent = ok ? '✅ Konfigurert' : '⚠️ Ikke konfigurert';
      badge.style.background = ok ? 'rgba(34,197,94,0.15)' : 'rgba(251,191,36,0.15)';
      badge.style.color = ok ? '#4ade80' : '#fbbf24';
    }
  }

  async function testEmailJS() {
    const user = Auth.current();
    if (!user) return;
    const btn    = document.getElementById('ejs-test-btn');
    const result = document.getElementById('ejs-test-result');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Sender…'; }
    if (result) result.textContent = '';

    const res = await Email.sendTestEmail(user.email, user.username);

    if (btn) { btn.disabled = false; btn.textContent = `${Icon('mail')} Send test-e-post til ${user.email}`; }
    if (result) {
      result.textContent = res.success ? '✅ Sendt!' : `${Icon('x')} ${res.error}`;
      result.style.color = res.success ? '#4ade80' : '#f87171';
    }
  }

  // ── Utility ───────────────────────────────────────────────────────────
  window.togglePassword = (inputId, btn) => {
    const inp = document.getElementById(inputId);
    if (!inp) return;
    inp.type = inp.type === 'password' ? 'text' : 'password';
    btn.textContent = inp.type === 'password' ? '👁' : '🙈';
  };

  // ── Init ──────────────────────────────────────────────────────────────
  async function init() {
    // Open IndexedDB first
    await DB.getBlobUrl('media', '__warmup__').catch(() => {});

    // Handle Stripe payment success redirect
    await Payment.handleSuccessRedirect();
    if (window.Marketplace) Marketplace.handlePurchaseRedirect();

    // Init psychedelic background
    await BgManager.init();

    // Init player
    Player.init();

    // Bare én spiller av gangen: når et media-element starter, pause alle andre
    // hørbare audio/video (hovedspiller, radio, profil-temamusikk, media-modal-video).
    // Lydløse forhåndsvisninger (media-grid-videoer, hero-bakgrunn) er unntatt så de
    // kan loope stille videre. Media-events bobler ikke → fang i capture-fasen.
    document.addEventListener('play', e => {
      const started = e.target;
      if (!(started instanceof HTMLMediaElement) || started.muted) return;
      document.querySelectorAll('audio, video').forEach(m => {
        if (m !== started && !m.paused && !m.muted) m.pause();
      });
    }, true);

    // Render nav
    renderNav();

    // Notifikasjonstillatelse for PM-varsler
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Oppdater innboks-badge hvert 5. sekund
    setInterval(() => { if (Auth.current()) updateNavBadge(); }, 5000);

    // Online heartbeat
    (function startHeartbeat() {
      const tick = () => { const u = Auth.current(); if (u) Auth.setOnline(u.username); };
      tick();
      setInterval(tick, 30000);
      document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
    })();

    // Init search
    initSearch();

    // Modal close on backdrop
    document.getElementById('modal-overlay')?.addEventListener('click', e => {
      if (e.target === document.getElementById('modal-overlay')) closeModal();
    });

    // Define routes
    Router.define('/',                   () => renderHome());
    Router.define('/login',              () => renderLogin());
    Router.define('/register',           () => renderRegister());
    Router.define('/forgot',             () => renderForgotPassword());
    Router.define('/reset/:token',       ({ token }) => renderResetPassword(token));
    Router.define('/activate/:token',    ({ token }) => renderActivate(token));
    Router.define('/u/:username',        ({ username }) => Profile.renderView(username));
    Router.define('/edit',               () => {
      if (!Auth.current()) { toast('Logg inn for å redigere', 'error'); Router.go('/login'); return; }
      Profile.renderEditor();
    });
    Router.define('/inbox',              () => renderInbox());
    Router.define('/settings',           () => renderSettings());
    Router.define('/shop',                () => renderShop());
    Router.define('/share',              () => { if (window.ShareMusic) ShareMusic.render(); });
    Router.define('/radio',              () => Radio.render());
    Router.define('/sendinger',          () => { if (window.BroadcastSchedule) BroadcastSchedule.render(); });
    Router.define('/chat',               () => Chat.render());
    Router.define('/discover',           () => Discover.render());
    Router.define('/underground',        () => Underground.render());
    Router.define('/shows',              () => Shows.render());
    Router.define('/world',              () => World.render());
    Router.define('/magazine',                 () => Magazine.renderGenre('alle'));
    Router.define('/magazine/sjanger/:genre',  ({ genre }) => Magazine.renderGenre(genre));
    Router.define('/magazine/:id',             ({ id }) => Magazine.render(id));
    Router.define('/a1',                 () => A1.render());
    Router.define('/community',          () => { if (window.Community) Community.render(); });
    Router.define('/friends',            () => { if (window.Friends) Friends.render(); });
    Router.define('/unsubscribe',        () => { if (window.Unsubscribe) Unsubscribe.render(); });
    Router.define('/unsubscribe/:email', ({ email }) => { if (window.Unsubscribe) Unsubscribe.render(email); });
    Router.define('/studio',             () => {
      if (!Auth.current()) { toast('Logg inn for å bruke Studio', 'error'); Router.go('/login'); return; }
      Studio.render();
    });
    Router.define('/messages/:username', ({ username }) => {
      if (!Auth.current()) { toast('Logg inn for å sende meldinger', 'error'); Router.go('/login'); return; }
      DJ.renderPrivateChat(username);
    });
    Router.define('/qr-login/:token', ({ token }) => renderQRLogin(token));
    Router.define('/minside',         () => renderMinSide());

    // Start router
    Router.init();

    // 5-day profile background notice
    setTimeout(_checkBgProfileNotice, 2000);
  }

  function _checkBgProfileNotice() {
    const user = Auth.current();
    if (!user) return;
    const key = `pv_bg_notice_${user.username}`;
    if (localStorage.getItem(key)) return;
    const fiveDays = 5 * 24 * 60 * 60 * 1000;
    if (!user.createdAt || Date.now() - user.createdAt < fiveDays) return;

    const overlay = document.createElement('div');
    overlay.id = 'bg-profile-notice-overlay';
    overlay.innerHTML = `
      <div class="bg-notice-box">
        <div class="bg-notice-icon">${Icon('rainbow')}</div>
        <h2 class="bg-notice-title">Visste du at du kan tilpasse profilen din?</h2>
        <p class="bg-notice-body">
          Dette er hva besøkende ser på <strong>din fremsidevisning</strong>.<br>
          Du kan velge mellom <em>bilde, video, musikk-visualizer</em> og psykedeliske effekter som bakgrunn.<br>
          Gjør profilen din unik — akkurat slik du vil!
        </p>
        <div class="bg-notice-preview">
          <canvas id="bg-notice-canvas" width="320" height="80"></canvas>
        </div>
        <div class="bg-notice-actions">
          <button class="btn btn-primary" onclick="Router.go('/edit');document.getElementById('bg-profile-notice-overlay')?.remove()">${Icon('edit')} Tilpass bakgrunn nå</button>
          <button class="btn btn-ghost" onclick="document.getElementById('bg-profile-notice-overlay')?.remove()">Kanskje senere</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    localStorage.setItem(key, '1');

    // Mini visualizer in the notice
    const c = document.getElementById('bg-notice-canvas');
    if (c) {
      const ctx = c.getContext('2d');
      let t = 0;
      (function anim() {
        if (!document.getElementById('bg-notice-canvas')) return;
        requestAnimationFrame(anim);
        t += 0.025;
        ctx.clearRect(0, 0, 320, 80);
        const bars = 40;
        for (let i = 0; i < bars; i++) {
          const amp = 0.3 + 0.4 * Math.sin(t * 2 + i * 0.4) + 0.2 * Math.sin(t * 5 + i * 0.9);
          const h = Math.max(4, amp * 70);
          const hue = (i / bars * 260 + t * 50) % 360;
          const g = ctx.createLinearGradient(0, 80, 0, 80 - h);
          g.addColorStop(0, `hsla(${hue},90%,55%,0.9)`);
          g.addColorStop(1, `hsla(${(hue+70)%360},95%,75%,0.5)`);
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.roundRect(i * (320 / bars) + 1, 80 - h, 320 / bars - 2, h, [2, 2, 0, 0]);
          ctx.fill();
        }
      })();
    }
  }

  function selectRole(value, labelEl) {
    document.querySelectorAll('#reg-role-selector .role-option-inner').forEach(el => el.classList.remove('active'));
    labelEl.querySelector('.role-option-inner').classList.add('active');
    labelEl.querySelector('input[type=radio]').checked = true;
  }

  // ── QR-kode innlogging ────────────────────────────────────────────────
  let _qrCountdown = null;

  function generateQRLogin() {
    const user = Auth.current();
    if (!user) return;

    const expiry = Date.now() + 15 * 60 * 1000;
    const payload = JSON.stringify({
      u: user.username,
      p: user.password,
      d: user.displayName,
      e: user.email,
      s: user.subscription || 'free',
      r: user.role || 'lytter',
      exp: expiry,
    });
    const token = btoa(payload).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    const base  = window.location.href.split('#')[0];
    const url   = `${base}#/qr-login/${token}`;

    const canvas = document.getElementById('qr-login-canvas');
    if (!canvas || typeof QRCode === 'undefined') {
      toast('QR-biblioteket er ikke lastet. Prøv igjen.', 'error');
      return;
    }

    QRCode.toCanvas(canvas, url, { width: 220, margin: 1, color: { dark: '#000000', light: '#ffffff' } }, err => {
      if (err) { toast('Kunne ikke generere QR-kode', 'error'); return; }
    });

    document.getElementById('qr-login-box').style.display = 'block';

    clearInterval(_qrCountdown);
    let remaining = 15 * 60;
    const expiryEl = document.getElementById('qr-login-expiry');
    _qrCountdown = setInterval(() => {
      remaining--;
      const m = Math.floor(remaining / 60);
      const s = remaining % 60;
      if (expiryEl) expiryEl.textContent = `Utløper om ${m}:${s.toString().padStart(2, '0')}`;
      if (remaining <= 0) {
        clearInterval(_qrCountdown);
        const box = document.getElementById('qr-login-box');
        if (box) box.style.display = 'none';
        toast('QR-koden har utløpt. Generer en ny.', 'info');
      }
    }, 1000);
  }

  function renderQRLogin(token) {
    let payload;
    try {
      const padded = token.replace(/-/g, '+').replace(/_/g, '/');
      const pad4   = padded + '==='.slice((padded.length + 3) % 4);
      payload = JSON.parse(atob(pad4));
    } catch {
      document.getElementById('app').innerHTML = `
        <div class="empty-state" style="padding:8rem">
          <div class="empty-icon">${Icon('x')}</div>
          <p style="font-size:1.1rem;font-weight:600">Ugyldig QR-kode</p>
          <a href="#/" class="btn btn-primary" style="margin-top:1.5rem;display:inline-flex">${Icon('arrow-left')} Hjem</a>
        </div>`;
      return;
    }

    if (Date.now() > payload.exp) {
      document.getElementById('app').innerHTML = `
        <div class="empty-state" style="padding:8rem">
          <div class="empty-icon">${Icon('hourglass')}</div>
          <p style="font-size:1.1rem;font-weight:600">QR-koden har utløpt</p>
          <p style="color:var(--text2)">Logg inn på en annen enhet og generer en ny kode.</p>
          <a href="#/login" class="btn btn-primary" style="margin-top:1.5rem;display:inline-flex">Logg inn manuelt</a>
        </div>`;
      return;
    }

    const result = Auth.importQRUser({
      username:     payload.u,
      password:     payload.p,
      displayName:  payload.d,
      email:        payload.e,
      subscription: payload.s,
      role:         payload.r,
    });

    if (result.error) {
      document.getElementById('app').innerHTML = `
        <div class="empty-state" style="padding:8rem">
          <div class="empty-icon">${Icon('alert')}</div>
          <p style="font-size:1.1rem;font-weight:600">${result.error}</p>
          <a href="#/login" class="btn btn-primary" style="margin-top:1.5rem;display:inline-flex">Logg inn manuelt</a>
        </div>`;
      return;
    }

    renderNav();
    toast(`Velkommen tilbake, ${result.user.displayName}! ${Icon('party')}`, 'success', 4000);
    Router.go('/');
  }

  // ════════════════════════════════════════════════════════════════════
  //  Shop — produktbutikk. Flere produkter kommer hit etter hvert.
  // ════════════════════════════════════════════════════════════════════
  // Abonnementsplaner — display-side. Autoritative beløp ligger i api/create-checkout.js (PLANS).
  const SHOP_PLANS = [
    { key: 'monthly', name: '1 måned',    months:  1, total: '149 kr',   per: '149 kr / mnd', save: null,         best: false },
    { key: 'quarter', name: '3 måneder',  months:  3, total: '399 kr',   per: '133 kr / mnd', save: 'Spar 11 %',  best: false },
    { key: 'half',    name: '6 måneder',  months:  6, total: '749 kr',   per: '125 kr / mnd', save: 'Spar 16 %',  best: false },
    { key: 'year',    name: '12 måneder', months: 12, total: '1 290 kr', per: '108 kr / mnd', save: 'Spar 28 %',  best: true  },
  ];

  // Pro-fordeler — vist i skjerm-kvittering (Payment.showReceipt) og Shop. Speilar api/_plans.js PRO_BENEFITS.
  const PRO_BENEFITS = [
    'DJ-mixes over 3 timer (opptil 20 t)',
    'Privat / offentlig synlighet på mixes',
    'Pro-badge på profilen',
    'Ubegrenset lagring',
    'Prioritert støtte',
  ];

  // Månedens tilbud — roterer automatisk per kalendermåned. Rent display/markedsføring:
  // framhever én plan med et tema, men endrer ALDRI pris (autoritativ pris i api/create-checkout.js).
  // Indeks = måned (0 = januar … 11 = desember). Desember = eget juletilbud (holiday: true).
  const SHOP_OFFERS = [
    { icon: 'sparkles',   emoji: '✨', title: 'Nytt år, ny lyd',     tag: 'Start året med Pro — 12 måneder full tilgang.',          feature: 'year'    },
    { icon: 'headphones', emoji: '🎧', title: 'Vinterlytting',       tag: 'Lange mixer for kalde kvelder — 6 mnd ekstra verdi.',    feature: 'half'    },
    { icon: 'leaf',       emoji: '🌱', title: 'Vårslipp',            tag: 'Frisk start på sesongen — prøv 3 måneder Pro.',          feature: 'quarter' },
    { icon: 'sliders',    emoji: '🎛️', title: 'Studio-måned',        tag: 'Produser mer — 6 mnd med ubegrenset lagring.',           feature: 'half'    },
    { icon: 'ticket',     emoji: '🎟️', title: 'Festival-oppvarming',  tag: 'Klar for sommeren — 12 mnd til beste pris.',             feature: 'year'    },
    { icon: 'sun',        emoji: '☀️', title: 'Sommerstart',         tag: 'Lange sett hele sommeren — 6 mnd Pro.',                  feature: 'half'    },
    { icon: 'music',      emoji: '🌞', title: 'Sommermix',           tag: 'Mixer uten lengdegrense — hele året med Pro.',           feature: 'year'    },
    { icon: 'flame',      emoji: '🔥', title: 'Festival-topp',       tag: 'Ozora-sesong — prøv 3 mnd og del settet ditt.',          feature: 'quarter' },
    { icon: 'feather',    emoji: '🍂', title: 'Høst-comeback',       tag: 'Tilbake i studio — 6 mnd full tilgang.',                 feature: 'half'    },
    { icon: 'moon',       emoji: '🌙', title: 'Mørketid-lytting',     tag: 'Dype ambient-mixer — 6 mnd ekstra verdi.',               feature: 'half'    },
    { icon: 'tag',        emoji: '🏷️', title: 'Høst-tilbud',         tag: 'Beste verdi før jul — 12 måneder Pro.',                  feature: 'year'    },
    { icon: 'snowflake',  emoji: '🎄', title: 'Juletilbud',          tag: 'Gi deg selv et helt år med Pro — bare 108 kr/mnd.',      feature: 'year', holiday: true },
  ];

  // Tilbudet for inneværende kalendermåned (lokal tid).
  function currentShopOffer() {
    return SHOP_OFFERS[new Date().getMonth()] || SHOP_OFFERS[0];
  }

  // Eksterne lenker — kjøp & oppdag musikk og festivalar utanfor Sound Core.
  const SHOP_LINKS = [
    { icon: 'cart',       name: 'Bandcamp',        desc: 'Kjøp musikk direkte frå artistar',     url: 'https://bandcamp.com/' },
    { icon: 'music',      name: 'iTunes',          desc: 'Apple sin musikkbutikk',               url: 'https://www.apple.com/itunes/' },
    { icon: 'leaf',       name: 'Ektoplazm',       desc: 'Gratis psytrance & netlabel-musikk',   url: 'https://ektoplazm.com/' },
    { icon: 'headphones', name: 'Spotify',         desc: 'Høyr eit utvalt spor',                 url: 'https://open.spotify.com/track/2o6rVUDhwHEUDUTsB9Rmo0' },
    { icon: 'tv',         name: 'Trancentral',     desc: 'Psytrance-kultur, nyheiter & video',   url: 'https://trancentral.tv/' },
    { icon: 'globe',      name: 'Goabase',         desc: 'Verdsomspennande party-database',      url: 'https://www.goabase.net/' },
    { icon: 'ticket',     name: 'Ozora Festival',  desc: 'Registrer deg for billett 2026',       url: 'https://ticket.ozorafestival.eu/register?flag=HU&event_code=OZ&year=26' },
  ];

  function renderShop() {
    const user  = Auth.current();
    const isPro = user?.subscription === 'pro';
    const uname = user?.username || '';
    const offer = currentShopOffer();

    const planCard = (p) => {
      let action;
      if (isPro)       action = `<button class="btn btn-ghost w-full" disabled style="margin-top:auto">${Icon('check')} Du har Pro</button>`;
      else if (uname)  action = `<button class="btn btn-gold w-full" style="margin-top:auto" onclick="Payment.startCheckout('${uname}','${p.key}')">${Icon('credit-card')} Kjøp</button>`;
      else             action = `<button class="btn btn-gold w-full" style="margin-top:auto" onclick="Router.go('/login')">${Icon('log-in')} Logg inn for å kjøpe</button>`;
      const featured = p.key === offer.feature;
      const ribbon   = featured
        ? `<span class="shop-offer-ribbon${offer.holiday ? ' shop-offer-ribbon--holiday' : ''}">${offer.emoji} ${offer.holiday ? 'Juletilbod' : 'Månadens tilbod'}</span>`
        : '';
      return `
        <div class="shop-card shop-plan${p.best ? ' shop-plan--best' : ''}${featured ? ' shop-plan--offer' : ''}${featured && offer.holiday ? ' shop-plan--holiday' : ''}">
          ${ribbon}
          ${p.best ? `<span class="shop-badge shop-badge-free">${Icon('star')} Beste verdi</span>` : ''}
          <div class="shop-plan-period">Pro · påløpende</div>
          <h2>${p.name}</h2>
          <div class="shop-card-price">${p.total}</div>
          <div class="shop-plan-per">${p.per}${p.save ? ` · <strong class="shop-save">${p.save}</strong>` : ''}</div>
          ${action}
        </div>`;
    };

    document.getElementById('app').innerHTML = `
      <div class="shop-page">
        <h1>${Icon('store')} Shop</h1>
        <p class="shop-sub">Sound Core Pro — lås opp alt. Velg perioden som passer deg. Alle abonnement er påløpende og kan avbrytes når som helst.</p>

        <div class="shop-offer-banner${offer.holiday ? ' shop-offer-banner--holiday' : ''}">
          <span class="shop-offer-banner-icon">${Icon(offer.icon)}</span>
          <div class="shop-offer-banner-text">
            <strong>${offer.emoji} ${offer.holiday ? 'Juletilbod' : 'Månadens tilbod'} · ${offer.title}</strong>
            <span>${offer.tag}</span>
          </div>
        </div>

        ${isPro ? `<div class="shop-launch-banner">${Icon('check')} <strong>Du har Pro aktivt.</strong> Takk for støtten! ${Icon('sliders')}</div>` : ''}

        <div class="shop-pro-feats">
          <div class="shop-pro-feat">${Icon('sliders')} DJ-mixes over 3 timer (ingen grense)</div>
          <div class="shop-pro-feat">${Icon('lock')} Privat / offentlig synlighet</div>
          <div class="shop-pro-feat">${Icon('star')} Pro-badge på profilen</div>
          <div class="shop-pro-feat">${Icon('cloud')} Ubegrenset lagring + prioritert støtte</div>
        </div>

        <div class="shop-grid">
          ${SHOP_PLANS.map(planCard).join('')}
        </div>

        <h2 class="shop-links-title">${Icon('link')} Kjøp & oppdag musikk</h2>
        <p class="shop-sub">Eksterne plattformar for å kjøpe, lytte og finne festivalar.</p>
        <div class="shop-links-grid">
          ${SHOP_LINKS.map(l => `
            <a class="shop-link-card" href="${l.url}" target="_blank" rel="noopener noreferrer">
              <span class="shop-link-icon">${Icon(l.icon)}</span>
              <span class="shop-link-text">
                <span class="shop-link-name">${l.name}</span>
                <span class="shop-link-desc">${l.desc}</span>
              </span>
              <span class="shop-link-arrow">${Icon('arrow-up-right')}</span>
            </a>`).join('')}
        </div>

        <p class="shop-sub" style="margin-top:1.5rem;font-size:.8rem">
          Sikker betaling via Stripe. Gratis-kontoer kan laste opp DJ-mixes på opptil 3 timer.
          Spørsmål om abonnement? <a href="mailto:producerenur@gmail.com">producerenur@gmail.com</a>
        </p>
      </div>`;
  }

  return {
    init, toast, openModal, closeModal, showInfo,
    renderShop, shopPlans: SHOP_PLANS, proBenefits: PRO_BENEFITS,
    logout, renderNav, updateNavBadge, markWallSeen,
    toggleMoreMenu, closeMoreMenu,
    dismissOnboard, refreshHomeFeed, composerPost,
    doLogin, doRegister, doForgotPassword, doResetPassword,
    resendActivationByEmail,
    saveSettings, testEmailJS,
    renderInbox, inboxAccept, inboxReject, startNewChat, inviteToChat,
    quickAddFriend, quickAcceptFriend,
    selectRole,
    settingsTab, resendActivation, sendPasswordResetFromSettings, sendActivationToAll,
    confirmDeleteAccount, deleteAccount,
    selectPaymentMethod, savePaymentMethod,
    liveFilter, applyFilterPreset, saveFilterSettings,
    savePageTexts, sendAiMessage,
    renderSettings,
    generateQRLogin,
    renderMinSide,
  };
})();

// ── Now Playing mini player widget ────────────────────────────────────────────
window.NpMiniPlayer = (() => {
  function update() {
    const btn    = document.getElementById('np-mini-btn');
    const name   = document.getElementById('np-mini-name');
    const dot    = document.getElementById('np-mini-dot');
    const status = document.getElementById('np-mini-status');
    const eq     = document.getElementById('np-mini-eq');
    if (!btn) return;
    const playing = !!window._radioMode && typeof Radio !== 'undefined' && Radio.isPlaying;
    const station = typeof Radio !== 'undefined' ? Radio.currentStation : null;
    btn.textContent = playing ? '⏸' : '▶';
    if (station && name) name.innerHTML = iconForEmoji(station.emoji, 'radio') + ' ' + (station.name || 'Radio');
    if (dot)    dot.classList.toggle('active', playing);
    if (eq)     eq.classList.toggle('active', playing);
    if (status) status.textContent = playing ? 'Live nå' : 'Klar';
  }

  function toggle() {
    if (typeof Radio === 'undefined') return;
    if (Radio.currentStation) {
      Radio.togglePlay();
    } else {
      const allUsers = Object.values(Auth.getUsers()).filter(u => u.favoriteRadio?.url);
      if (allUsers.length) {
        const r = allUsers[0].favoriteRadio;
        Radio.playUrl(r.url, r.name || 'Radio', r.emoji || '📻');
      }
    }
    setTimeout(update, 200);
  }

  document.addEventListener('DOMContentLoaded', () => {
    const audio = document.getElementById('audio-engine');
    if (audio) {
      audio.addEventListener('play',  update);
      audio.addEventListener('pause', update);
    }
  });

  return { toggle, update };
})();

// Bootstrap
document.addEventListener('DOMContentLoaded', () => App.init());

// Pause background animations when tab is not visible
document.addEventListener('visibilitychange', () => {
  const bg = document.getElementById('bg-layer');
  if (bg) bg.style.animationPlayState = document.hidden ? 'paused' : 'running';
});

// ── Media embed panel ─────────────────────────────────────────────────────────
// Builds an embeddable iframe src from a public music URL, or returns null.
function _embedSrc(url) {
  const ytM = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytM) return `https://www.youtube.com/embed/${ytM[1]}?autoplay=1`;

  if (url.includes('soundcloud.com'))
    return `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&auto_play=true&color=%23ff5500&show_artwork=true&visual=true`;

  const spM = url.match(/open\.spotify\.com\/(track|album|playlist|artist)\/([a-zA-Z0-9]+)/);
  if (spM) return `https://open.spotify.com/embed/${spM[1]}/${spM[2]}`;

  if (url.includes('mixcloud.com'))
    return `https://www.mixcloud.com/widget/iframe/?hide_cover=1&autoplay=1&feed=${encodeURIComponent(url)}`;

  return null;
}

function openMedia(url, title) {
  if (!url) return;
  // Direct audio file → use the persistent player bar
  if (/\.(mp3|ogg|aac|flac|wav|m4a)(\?|$)/i.test(url)) {
    if (typeof Player !== 'undefined') Player.playExternal(url, title || 'Mix', '');
    return;
  }
  const src = _embedSrc(url);
  if (!src) { window.open(url, '_blank', 'noopener,noreferrer'); return; }

  document.getElementById('embed-panel-title').textContent = title || '';
  document.getElementById('embed-panel-frame').src = src;
  document.getElementById('embed-panel').classList.remove('hidden');

  // Show the music search field when this is a SoundCloud embed.
  const searchEl = document.getElementById('embed-panel-search');
  if (searchEl) searchEl.classList.toggle('hidden', !url.includes('soundcloud.com'));
}

// Search field inside the SoundCloud embed window.
// A pasted track/set link plays in-panel; a free-text query opens SoundCloud
// search in a new tab (SoundCloud blocks embedding its search-results page).
function embedPanelSearch(ev) {
  if (ev) ev.preventDefault();
  const input = document.getElementById('embed-panel-search-input');
  const q = (input?.value || '').trim();
  if (!q) return false;

  if (/^https?:\/\//i.test(q)) {
    const src = _embedSrc(q);
    if (src) {
      document.getElementById('embed-panel-title').textContent = q;
      document.getElementById('embed-panel-frame').src = src;
    } else {
      window.open(q, '_blank', 'noopener,noreferrer');
    }
  } else {
    window.open('https://soundcloud.com/search?q=' + encodeURIComponent(q),
      '_blank', 'noopener,noreferrer');
  }
  return false;
}

function closeEmbedPanel() {
  document.getElementById('embed-panel-frame').src = '';
  document.getElementById('embed-panel').classList.add('hidden');
  const searchInput = document.getElementById('embed-panel-search-input');
  if (searchInput) searchInput.value = '';
}
