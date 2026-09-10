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
      <button type="button" class="mzb-btn" data-act="out" aria-label="Zoom out" title="Zoom out">&minus;</button>
      <button type="button" class="mzb-btn mzb-reset" data-act="reset" title="Reset position and zoom">100%</button>
      <button type="button" class="mzb-btn" data-act="in" aria-label="Zoom in" title="Zoom in">+</button>`;
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
      h.title = 'Drag the corner to zoom';
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

  // ── Info / «Hva er SiriusFM?» ───────────────────────────────────────
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
        <h2>${Icon('info')} What Is SiriusFM</h2>
        <button class="btn-icon" onclick="App.closeModal()" aria-label="Close">${Icon('x')}</button>
      </div>
      <div class="info-body">
        <p class="info-intro">
          <strong>SiriusFM</strong> is a decentralized social platform for music and audio —
          a gathering place for electronic music, radio, DJ mixes and community. Everything runs right in
          the browser, and your data isn't owned by any central server. Here's everything you can do:
        </p>
        ${feat('radio',    'Radio',       'Stream curated radio channels and live broadcasts around the clock — from ambient and psytrance to downtempo and dub. The music player stays at the bottom of the page and keeps playing while you explore the rest.')}
        ${feat('music',    'Discover',    'Discover new music and new people. Browse releases and artists, follow the ones you like, and build your own network of listeners and creators.')}
        ${feat('moon',     'Underground', 'The raw, experimental underground scene — for those who want to dig deeper than the charts and find the hidden gems.')}
        ${feat('calendar', 'Shows',       'Keep track of upcoming events, concerts and live sets — and see who is playing live right now.')}
        ${feat('message',  'Chat',        'Real-time chat with other users, built decentralized with Gun.js. Messages flow directly between you, without a central middleman.')}
        ${feat('user',     'My page',     'Your own profile — your music, your mixes, events and friends, all in one place.')}
        ${feat('mail',     'Inbox',       'Private messages and friend requests, so you stay in touch with the people you meet along the way.')}
        ${feat('message',  'AI assistant','A built-in helper you can ask about anything — from how things work to tips on where to start.')}
        ${feat('image',    'Customization','Change the background, choose from 100+ languages, and open SiriusFM on mobile, Mac or Pc. Make the experience entirely your own.')}
        <p class="info-welcome">
          We're happy to have you here. Welcome, everyone!<br>
          <span class="info-sign">Kind regards<br>SiriusFM Team</span>
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
        <a href="#/discover"    class="btn btn-ghost btn-sm">${Icon('music')} Discover</a>
        <a href="#/u/${user.username}" class="btn btn-ghost btn-sm">${Icon('user')} Profile</a>
        <button id="nav-bell" class="btn btn-ghost btn-sm" onclick="if(window.Notify)Notify.togglePanel()" title="Notifications" aria-label="Notifications" style="position:relative">${Icon('bell')}</button>
        <button id="nav-more-btn" class="btn btn-ghost btn-sm nav-more-btn" onclick="App.toggleMoreMenu(this)" title="More — all features" style="position:relative">${Icon('menu')} More ${Icon('chevron-down')}${moreBadge}</button>
        <button class="btn btn-ghost btn-sm" onclick="App.logout()" title="You're online — click to log out"><span class="nav-status-dot nav-status-dot--online" title="Online"></span>${Icon('log-out')} Log out</button>
      `;
    } else {
      nav.innerHTML = `
        <a href="#/"            class="btn btn-ghost btn-sm">${Icon('home')} Feed</a>
        <a href="#/radio"       class="btn btn-ghost btn-sm">${Icon('radio')} Radio</a>
        <a href="#/discover"    class="btn btn-ghost btn-sm">${Icon('music')} Discover</a>
        <button id="nav-more-btn" class="btn btn-ghost btn-sm nav-more-btn" onclick="App.toggleMoreMenu(this)" title="More — all features">${Icon('menu')} More ${Icon('chevron-down')}</button>
        <a href="#/login"       class="btn btn-ghost btn-sm">${Icon('log-in')} Log in</a>
        <a href="#/register"    class="btn btn-primary btn-sm">Sign up</a>
      `;
    }
    // Nav-DOM (inkl. badge-elementet) er bygd på nytt — nullstill cachen så
    // updateNavBadge teiknar det fulle merket (inkl. vegg + varsel) på nytt.
    // Utan dette låser den tidlege-retur-vakta i updateNavBadge merket i skjult tilstand.
    _lastBadgeTotal = -1;
    if (user) updateNavBadge();
    // Sky-profil: PUBLISER egen profil ved kvar innlogging/boot slik at ALLE
    // andre brukere finn han (fiksar «Bruker ikke funnet»). Hent samtidig ned
    // alle andre profiler lokalt så dei er kjende før ein besøkjer dei.
    if (user && window.ProfileSync && ProfileSync._enabled()) {
      // Løft ev. lokal-kun avatar/banner (IndexedDB-blob utan sky-URL) opp til
      // Supabase FØR/ved innlogging — ikkje berre når eigaren opnar profilsida si.
      // Utan dette blir profilbildet verande usynleg for alle andre til eigaren
      // tilfeldigvis besøkjer sin eigen profil. Sjølv-lækjande, idempotent.
      if (window.Profile && Profile.migrateLocalMediaToCloud)
        Profile.migrateLocalMediaToCloud(user.username).catch(() => {});
      ProfileSync.push(user);
      ProfileSync.pullAll().catch(() => {});
    }
    // Sosialt sanntidslag: start nærvær + varsel-innboks + vennechat (idempotent).
    if (user && window.SC) SC.startPresence(user.username);
    if (user && window.Social) Social.init(user.username);   // abonner på eigen gjestebok → nav-merke
    if (window.Notify)     Notify.init();
    if (window.FriendChat) FriendChat.refresh();
    if (window.Messenger)  Messenger.init();     // abonner på DM-kanalar for ulesne-badge på Min side
    if (window.Friends)    Friends.init();      // held test-admin online medan appen er open
    if (typeof NavDrag !== 'undefined') NavDrag.refresh();   // oppdater grab-markør for nytt fane-antal
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
    // Egen «Abonnement»-oppføring — peker til Shop-siden der man faktisk betaler (Stripe).
    // Gull-uthevet så alle innloggede brukere lett finner og kan kjøpe Pro.
    const isPro = user?.subscription === 'pro';
    const subItem = () => item('#/shop','star', 'Subscription',
      isPro ? '<span class="nav-more-item__badge">Pro ✓</span>'
            : '<span class="nav-more-item__badge">Upgrade</span>')
      .replace('nav-more-item', 'nav-more-item nav-more-item--gold');
    if (user) {
      const pending   = Auth.getPendingRequestsCount(user.username);
      const unreadPMs = getUnreadPMTotal(user.username);
      const tot       = pending + unreadPMs;
      const inboxBadge = tot > 0 ? `<span class="nav-more-badge">${tot}</span>` : '';
      return `
        ${subItem()}
        <div class="nav-more-sep"></div>
        ${item('#/minside','home','My page')}
        ${item('#/edit','edit','Edit profile')}
        ${item('#/settings','settings','Settings')}
        ${item('#/inbox','mail','Inbox',inboxBadge)}
        ${item('#/chat','message','Chat')}
        ${item('#/friends','users','Friends')}
        ${item('#/community','users','Community')}
        ${item('#/grupper','users','Groups')}
        ${item('#/discover','music','Discover')}
        ${item('#/underground','moon','Underground')}
        ${item('#/shows','calendar','Shows')}
        ${item('#/world','globe','World')}
        ${item('#/magazine','book','Magazine')}
        ${item('#/a1','sparkles','A1')}
        ${item('#/studio','image','Studio')}
        <div class="nav-more-sep"></div>
        ${btn("if(window.Notify)Notify.togglePanel()",'bell','Notifications')}
        <div class="nav-more-sep"></div>
        ${btn("App.logout()",'log-out','Log out')}
      `;
    }
    // Ikke innlogget: ingen «Abonnement»-oppføring — den vises kun for brukere
    // som har profil og er logget inn på siriusfm.no.
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
    toast(wasLoggedIn ? 'You are now logged out.' : 'You are already logged out.', 'info');
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
      { label: 'Home',        sub: 'Home page',                  icon: 'home',     route: '/',            kw: 'home forside front start hovedside' },
      { label: 'Radio',       sub: 'Live psy/ambient stations',  icon: 'radio',    route: '/radio',       kw: 'stream stasjon stasjoner station live lyd musikk lytt' },
      { label: 'Chat',        sub: 'Community chat',             icon: 'message',  route: '/chat',        kw: 'prat melding samtale community' },
      { label: 'Discover',    sub: 'Find people & music',        icon: 'music',    route: '/discover',    kw: 'oppdage utforsk finn folk artister discover' },
      { label: 'Underground', sub: 'Underground scene',          icon: 'moon',     route: '/underground', kw: 'undergrunn scene' },
      { label: 'Shows',       sub: 'Concerts & events',          icon: 'calendar', route: '/shows',       kw: 'konsert konserter event arrangement festival gig show' },
      { label: 'World',       sub: 'All Over The World',         icon: 'globe',    route: '/world',       kw: 'verden global psytrance psybient world' },
      { label: 'Magazine',    sub: 'Interviews, releases & festivals', icon: 'book', route: '/magazine', kw: 'magasin magazine blad intervju utgivelser plateselskap label festival fester news nyheter' },
      { label: 'A1',          sub: 'AI + search the whole web',  icon: 'sparkles', route: '/a1',          kw: 'ai assistent søk web a1 chat' },
      { label: 'Shop',        sub: 'Subscription & credit',      icon: 'store',    route: '/shop',        kw: 'butikk kjøp pro abonnement credits kreditt shop' },
    ];
    // Bare tilby disse når modulen faktisk er lastet (ellers blir ruta blank).
    if (typeof window.Friends !== 'undefined')
      pages.push({ label: 'Friends',   sub: 'Online & your friends', icon: 'users', route: '/friends',   kw: 'venner online friends' });
    if (typeof window.Community !== 'undefined')
      pages.push({ label: 'Community', sub: 'Community wall',         icon: 'users', route: '/community', kw: 'fellesskap vegg wall community' });
    if (typeof window.Groups !== 'undefined')
      pages.push({ label: 'Groups',    sub: 'Create & join groups', icon: 'users', route: '/grupper',  kw: 'grupper gruppe group community inviter' });
    if (me) {
      pages.push(
        { label: 'My page',        sub: 'Your overview',        icon: 'home',     route: '/minside',          kw: 'minside dashboard oversikt' },
        { label: 'My profile',     sub: '@' + me.username,      icon: 'user',     route: '/u/' + me.username, kw: 'profil meg min profile' },
        { label: 'Edit profile',   sub: 'Change your profile',  icon: 'edit',     route: '/edit',             kw: 'rediger endre profil edit' },
        { label: 'Studio',         sub: 'Blend Studio',         icon: 'image',    route: '/studio',           kw: 'studio blend bilde' },
        { label: 'Inbox',          sub: 'Your messages',        icon: 'mail',     route: '/inbox',            kw: 'innboks inbox meldinger' },
        { label: 'Settings',       sub: 'Account & preferences', icon: 'settings', route: '/settings',        kw: 'innstillinger settings konto preferanser' },
      );
    } else {
      pages.push(
        { label: 'Log in',    sub: 'Get access',    icon: 'log-in', route: '/login',    kw: 'logg inn login' },
        { label: 'Sign up',   sub: 'Create account', icon: 'user',   route: '/register', kw: 'registrer signup konto ny' },
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
    if (pages.length) groups.push({ title: 'Pages', items: pages.map(p => ({
      icon: p.icon, title: p.label, sub: p.sub, go: () => Router.go(p.route)
    })) });

    // Brukere
    let users = [];
    try { users = Auth.getAllPublicUsers() || []; } catch (e) {}
    users = users.filter(u =>
      _searchNorm(u.username).includes(q) || _searchNorm(u.displayName).includes(q)
    ).slice(0, 6);
    if (users.length) groups.push({ title: 'Users', items: users.map(u => ({
      avatar: (u.displayName || u.username || '?').charAt(0).toUpperCase(),
      title: u.displayName || u.username, sub: '@' + u.username, go: () => Router.go('/u/' + u.username)
    })) });

    // Radiostasjoner — gå til Radio og spill av valgt stasjon
    if (typeof Radio !== 'undefined' && Array.isArray(Radio.STATIONS)) {
      const st = Radio.STATIONS.filter(s =>
        _searchNorm(s.name).includes(q) || _searchNorm(s.cat).includes(q)
      ).slice(0, 5);
      if (st.length) groups.push({ title: 'Radio stations', items: st.map(s => ({
        icon: 'radio', title: s.name, sub: s.cat || 'Radio',
        go: () => { Router.go('/radio'); setTimeout(() => { try { Radio.playStation(s.id); } catch (e) {} }, 80); }
      })) });
    }

    drop.innerHTML = '';
    if (!groups.length) {
      const empty = document.createElement('div');
      empty.className = 'search-empty';
      empty.textContent = 'No matches for «' + raw + '»';
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

  // Bygg <option>-lista for komponer-målet: «Min vegg» + gruppene brukeren er med i.
  function _composerTargetOptions(selected) {
    let opts = `<option value="wall"${selected === 'wall' || !selected ? ' selected' : ''}>📣 Community wall (everyone)</option>`;
    try {
      if (window.Groups && Groups.myGroups) {
        for (const g of Groups.myGroups()) {
          const val = 'g:' + g.id;
          opts += `<option value="${_esc(val)}"${selected === val ? ' selected' : ''}>👥 ${_esc(g.name)}</option>`;
        }
      }
    } catch (e) {}
    return opts;
  }

  // Fyll mål-velgeren på nytt når gruppene har lastet (Gun er asynkron), behold valg.
  function refreshComposerTargets() {
    const sel = document.getElementById('sc-home-target');
    if (!sel) return;
    const cur = sel.value;
    sel.innerHTML = _composerTargetOptions(cur);
    if ([...sel.options].some(o => o.value === cur)) sel.value = cur;
  }

  function composerPost() {
    const ta = document.getElementById('sc-home-post');
    const text = ta && ta.value.trim();
    if (!text) return;
    if (!Auth.current()) { Router.go('/login'); return; }
    // Del i en gruppe — velgeren bærer «g:<groupId>».
    const target = (document.getElementById('sc-home-target')?.value) || 'wall';
    if (target.startsWith('g:')) {
      const gid = target.slice(2);
      if (window.Groups && Groups.shareToGroup) {
        const ok = Groups.shareToGroup(gid, text);
        if (ok) { ta.value = ''; setTimeout(refreshHomeFeed, 300); }
      }
      return;
    }
    // Del på veggen → den DELTE Community-veggen, alltid offentlig så ALLE
    // innloggede ser innlegget på alle enheter/nettlesere (mobil/nettbrett/PC) —
    // ikke gated av personlig wallVisibility. Vi kjører gjennom Community.post()
    // sin eksisterende «home»-sti (audience: 'public'), som er samme flyt som
    // Community-komposerens «🏠 Hjem-veggen»-valg.
    if (window.Community && Community.post) {
      // Community.post(root) leser #sc-post-input (tekst) og #sc-post-target (mål)
      // scopet INNANFOR composeren me sender med. Byggjer difor ein eigen skjult
      // .community-composer så oppslaget ikkje kolliderer med ein evt. ekte
      // composer som ligg i DOM-en samtidig. Mål «home» tvinger public.
      const holder = document.createElement('div');
      holder.className = 'community-composer';
      holder.style.display = 'none';
      holder.innerHTML = '<textarea id="sc-post-input"></textarea><input id="sc-post-target" type="hidden">';
      document.body.appendChild(holder);
      holder.querySelector('#sc-post-input').value = text;
      holder.querySelector('#sc-post-target').value = 'home';   // → audience: 'public'
      Community.post(holder);
      holder.remove();
      ta.value = '';
      setTimeout(refreshHomeFeed, 300);
    }
  }

  function _feedTrackHtml(t) {
    const art = t.coverUrl
      ? `background-image:url(${t.coverUrl});background-size:cover;background-position:center`
      : 'background:linear-gradient(135deg,#22c55e,#16a34a)';
    return `
      <div class="feed-card feed-track">
        <div class="feed-track-art" style="${art}">
          <button class="feed-track-play" onclick="Discover.playTrack('${t.id}')" title="Play">${Icon('play')}</button>
        </div>
        <div class="feed-track-body">
          <div class="feed-card-kind">${Icon('music')} ${t.isMix ? 'New mix' : 'New track'}</div>
          <div class="feed-track-title">${_esc(t.title)}</div>
          <a class="feed-track-artist" href="#/u/${_esc(t.username)}">${_esc(t.artist || t.username)}</a>
        </div>
        <button class="feed-track-go" onclick="Discover.playTrack('${t.id}')">${Icon('play')} Play</button>
      </div>`;
  }

  function _feedMemberHtml(u) {
    const t = u.theme || {};
    const bg = t.bgType === 'gradient' ? (t.bgGradient || 'linear-gradient(135deg,#22c55e,#16a34a)')
      : `linear-gradient(135deg,${t.primaryColor || '#22c55e'},${t.secondaryColor || '#2563eb'})`;
    return `
      <div class="feed-card feed-member">
        <a class="feed-member-av" href="#/u/${_esc(u.username)}" data-av-user="${_esc(u.username)}" style="background:${bg}">${_esc((u.displayName || '?').charAt(0).toUpperCase())}</a>
        <div class="feed-member-body">
          <div class="feed-card-kind">${Icon('user')} New on SiriusFM</div>
          <a class="feed-member-name" href="#/u/${_esc(u.username)}">${_esc(u.displayName)}</a>
          <div class="feed-member-sub">@${_esc(u.username)}</div>
        </div>
        <a class="feed-member-go" href="#/u/${_esc(u.username)}">View profile</a>
      </div>`;
  }

  // Bygger den samla feeden: innlegg + nye spor/mikser + nye medlemmer, nyeste først.
  let _feedBusy = false;
  async function refreshHomeFeed() {
    if (!document.getElementById('sc-home-feed') || _feedBusy) return;
    _feedBusy = true;
    try {
      // Hent varige Community-innlegg fra sky først, så forsidens feed viser det
      // ALLE har delt (ikke bare det denne enheten fikk via Gun-relay).
      if (window.Community && Community.hydrateRemote) { try { await Community.hydrateRemote(); } catch (e) {} }
      const items = [];
      if (window.Community && Community.visiblePosts) {
        try { for (const p of Community.visiblePosts()) items.push({ ts: p.ts || 0, html: Community.postCardHtml(p) }); } catch (e) {}
      }
      let tracks = [];
      try { if (typeof Discover !== 'undefined' && Discover.loadAllTracks) tracks = await Discover.loadAllTracks(); } catch (e) {}
      for (const t of tracks) items.push({ ts: t.uploadedAt || 0, html: _feedTrackHtml(t) });
      const THIRTY = 30 * 864e5;   // nye medlemmer siste 30 dagar (eldre finst i bruker-grid lenger ned)
      try {
        for (const u of Auth.getAllPublicUsers()) {
          if (Date.now() - (u.createdAt || 0) < THIRTY) items.push({ ts: u.createdAt || 0, html: _feedMemberHtml(u) });
        }
      } catch (e) {}
      items.sort((a, b) => (Number(b.ts) || 0) - (Number(a.ts) || 0));
      const top = items.slice(0, 40);
      const el = document.getElementById('sc-home-feed');
      if (el) {
        el.innerHTML = top.length ? top.map(i => i.html).join('')
          : `<div class="sc-feed-empty">No activity yet. Be the first to <a href="#/discover">share music</a> or write a post above!</div>`;
        // Avatarer først — og aldri la lenke-forhåndsvisning kunne blokkere dem.
        if (window.Profile && Profile.hydrateAvatars) Profile.hydrateAvatars(el);
        try { if (window.LinkPreview) LinkPreview.hydrate(el); } catch (e) {}
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
        <span>You have <strong>${pendingCount}</strong> friend request${pendingCount !== 1 ? 's' : ''} — click to see them</span>
        <span>${Icon('arrow-right')}</span>
      </div>` : '';

    const heroHtml = !user ? `
      <div class="stellar-hero">
        <div class="stellar-hero-glow"></div>
        <div class="stellar-hero-content">
          <div class="stellar-hero-badge"><img src="assets/logo-mark.svg?v=20260816-sfm" alt="" class="hero-badge-logo"> Psychedelic · Ambient · Dub · Art</div>
          <h1 class="stellar-hero-title">SiriusFM</h1>
          <p class="stellar-hero-sub">Welcome To The Community</p>
          <div class="stellar-hero-actions">
            <a href="#/radio" class="btn btn-primary landing-btn-big stellar-cta">${Icon('radio')} Listen now</a>
            <a href="#/register" class="btn btn-ghost landing-btn-big">Create free profile</a>
            <a href="#/chat" class="btn btn-ghost landing-btn-big">${Icon('message')} Chat</a>
            <a href="#/login" class="btn btn-ghost landing-btn-big">${Icon('log-in')} Log in</a>
          </div>
        </div>
      </div>` : `
      <div class="stellar-hero stellar-hero-compact">
        <div class="stellar-hero-glow"></div>
        <div class="stellar-hero-content">
          <h2 class="stellar-hero-greeting">Hi, ${user.displayName} ${Icon('smile')}</h2>
          <div class="stellar-hero-actions">
            <a href="#/radio" class="btn btn-primary">${Icon('radio')} Radio</a>
            <a href="#/u/${user.username}" class="btn btn-ghost">${Icon('user')} My profile</a>
            <a href="#/discover" class="btn btn-ghost">${Icon('music')} Discover</a>
          </div>
        </div>
      </div>`;

    const radioUsers    = users.filter(u => u.favoriteRadio?.url);
    const liveEventUsers = users.filter(u => u.liveEvent);

    // ── Onboarding-velkomst fjernet ────────────────────────────────────────
    const onboardHtml = '';

    // ── Komponer-boks — del et innlegg rett fra forsiden ───────────────────
    const composerHtml = user ? `
      <div class="sc-composer">
        <div class="sc-composer-av" data-av-user="${_esc(user.username)}">${_esc((user.displayName || '?').charAt(0).toUpperCase())}</div>
        <div class="sc-composer-main">
          <textarea id="sc-home-post" class="sc-composer-input" maxlength="1000"
            placeholder="What's on your mind, ${_esc(user.displayName)}? Share something with the community…"></textarea>
          <div class="sc-composer-row">
            <a class="sc-composer-media" href="#/discover" title="Upload music with cover image">${Icon('music')} Share music / image</a>
            <div class="sc-composer-actions">
              <select id="sc-home-target" class="sc-composer-target" title="Where do you want to share?">${_composerTargetOptions()}</select>
              <button class="btn btn-primary btn-sm sc-composer-send" onclick="App.composerPost()">${Icon('send')} Share</button>
            </div>
          </div>
        </div>
      </div>` : `
      <div class="sc-composer sc-composer-guest">
        <span class="sc-composer-guest-ic">${Icon('edit')}</span>
        <span>Want to share and posts? <a href="#/register">Create a free profile</a> or <a href="#/login">log in</a>.</span>
      </div>`;

    // ── «Live & spiller nå» — samlet stripe (live events + now playing) ─────
    const _liveCardBg = u => {
      const t = u.theme || {};
      return t.bgType === 'gradient' ? (t.bgGradient || 'linear-gradient(135deg,#22c55e,#16a34a)')
        : `linear-gradient(135deg,${t.primaryColor || '#22c55e'},${t.secondaryColor || '#2563eb'})`;
    };
    const _liveCards = []
      .concat(liveEventUsers.map(u => {
        const ev = u.liveEvent;
        const url = (ev.liveUrl || '').replace(/'/g, "\\'");
        const ti  = (ev.title || 'Live').replace(/'/g, "\\'");
        const play = ev.liveUrl
          ? `<button class="sc-live-play" onclick="Radio.playUrl('${url}','${ti}','🔴')" title="Listen live">${Icon('play')}</button>`
          : `<a class="sc-live-play" href="#/u/${u.username}" title="View profile">${Icon('arrow-right')}</a>`;
        return `<div class="sc-live-card sc-live-card--live">
          <a class="sc-live-av" href="#/u/${u.username}" style="background:${_liveCardBg(u)}" id="live-av-${u.username}" data-av-user="${_esc(u.username)}">${_esc(u.displayName.charAt(0).toUpperCase())}</a>
          <div class="sc-live-meta"><div class="sc-live-name">${_esc(u.displayName)}</div><div class="sc-live-sub"><span class="event-live-dot"></span> ${_esc(ev.title || 'Live')}</div></div>
          ${play}</div>`;
      }))
      .concat(radioUsers.map(u => {
        const r = u.favoriteRadio;
        const url = (r.url || '').replace(/'/g, "\\'");
        const nm  = (r.name || 'Radio').replace(/'/g, "\\'");
        return `<div class="sc-live-card">
          <a class="sc-live-av" href="#/u/${u.username}" style="background:${_liveCardBg(u)}" id="np-av-${u.username}" data-av-user="${_esc(u.username)}">${_esc(u.displayName.charAt(0).toUpperCase())}</a>
          <div class="sc-live-meta"><div class="sc-live-name">${_esc(u.displayName)}</div><div class="sc-live-sub">${Icon('radio')} ${_esc(r.name || 'Radio')}</div></div>
          <button class="sc-live-play" onclick="Radio.playUrl('${url}','${nm}','${r.emoji || '📻'}')" title="Listen">${Icon('play')}</button></div>`;
      }));
    const liveStripHtml = _liveCards.length ? `
      <div class="sc-livestrip-wrap">
        <div class="sc-livestrip-head"><span class="event-live-dot"></span> Live & now playing <span class="sc-livestrip-count">${_liveCards.length}</span></div>
        <div class="sc-livestrip">${_liveCards.join('')}</div>
      </div>` : '';

    // ── Samlet feed (fylles asynkront av App.refreshHomeFeed) ──────────────
    // Kun synlig for innloggede brukere — gjester må lage konto / logge inn.
    const feedHtml = user ? `
      <div class="section sc-feed-section">
        <div class="section-header">
          <div class="section-title">${Icon('home')} Feed</div>
          <div class="section-sub">The latest from the community — posts, tracks and new people</div>
        </div>
        <div id="sc-home-feed" class="sc-feed"><div class="page-loading"><div class="spinner"></div></div></div>
      </div>` : '';

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
          <div class="section-sub">Upload your own mix from the profile editor · private/public with Pro</div>
        </div>
        <div class="pub-mixes-grid" id="pub-mixes-grid">
          ${allMixEntries.map(e => `
            <div class="pub-mix-row" id="pubmix-${e.mixId}">
              <div class="pub-mix-icon" id="pubmix-icon-${e.mixId}">${Icon('sliders')}</div>
              <div class="pub-mix-meta">
                <div class="pub-mix-title" id="pubmix-title-${e.mixId}">Loading…</div>
                <div class="pub-mix-sub" id="pubmix-sub-${e.mixId}"><a href="#/u/${e.username}" style="color:#38bdf8;text-decoration:none">@${e.username}</a></div>
              </div>
              <button class="pub-mix-play" onclick="Profile.playMix('${e.mixId}','')">${Icon('play')} Play</button>
            </div>`).join('')}
        </div>
      </div>` : '';

    const homeRadioHtml = `
      <div class="home-radio-section" id="home-radio-section">
<div class="hr-tab-strip" id="hr-tab-strip">
          <button class="hr-tab hr-tab-active" onclick="HomeRadio.setGenre('psytrance',this)">${Icon('wind')} Psytrance</button>
          <button class="hr-tab" onclick="HomeRadio.setGenre('downtempo',this)">${Icon('waves')} Downtempo</button>
          <button class="hr-tab" onclick="HomeRadio.setGenre('techno',this)">${Icon('disc')} Techno Underground</button>
          <button class="hr-tab" onclick="HomeRadio.setGenre('psychill',this)">${Icon('sparkles')} Psychill</button>
          <button class="hr-tab" onclick="HomeRadio.setGenre('progressive',this)">${Icon('globe')} Progressive</button>
          <button class="hr-tab" onclick="HomeRadio.setGenre('ambient',this)">${Icon('sparkles')} Ambient</button>
          <button class="hr-tab" onclick="HomeRadio.setGenre('goa',this)">${Icon('sparkles')} Goa</button>
          <button class="hr-tab" onclick="HomeRadio.setGenre('dub',this)">${Icon('disc')} Dub</button>
          <button class="hr-tab" onclick="HomeRadio.setGenre('chillout',this)">${Icon('waves')} Chill Out</button>
          <button class="hr-tab" onclick="HomeRadio.setGenre('dark-drone',this)">${Icon('sparkles')} Dark Drone</button>
        </div>
        <div class="hr-channel-grid" id="hr-channel-grid"></div>
      </div>`;

    const app = document.getElementById('app');
    app.innerHTML = pendingBanner + onboardHtml + heroHtml + composerHtml + liveStripHtml + feedHtml + homeRadioHtml + publicMixesSection + `
      ${user ? `
      <div class="section">
        <div class="section-header">
          <div class="section-title">Users on SiriusFM <span>${users.length} profiles</span></div>
        </div>
        <div class="users-grid" id="users-grid">
          <div class="page-loading"><div class="spinner"></div></div>
        </div>
      </div>` : ''}
      <footer class="site-footer" id="site-footer">
        <div class="footer-drag-handle" id="footer-drag-handle" title="Drag to move the footer">${Icon('grip')}</div>
        <button class="footer-min-btn" id="footer-toggle-btn" onclick="FooterWidget.hide()" title="Hide footer">${Icon('minus')}</button>
        <div class="site-footer-inner">
          <div class="site-footer-logo">${Icon('sparkles')} SiriusFM</div>
          <div class="site-footer-contact">
            <div class="site-footer-label">Contact</div>
            <a class="site-footer-email" href="mailto:post@siriusfm.no">post@siriusfm.no</a>
          </div>
          <div class="site-footer-copy">© ${new Date().getFullYear()} SiriusFM</div>
        </div>
      </footer>
      <button class="footer-restore-btn" id="footer-restore-btn" onclick="FooterWidget.show()" title="Show footer again">${Icon('chevron-up')} Footer</button>`;

    if (window.FooterWidget) FooterWidget.init();

    // Vis ekte profilbilde i komponer-boksen (og andre initial-plassholdere).
    if (user && window.Profile && Profile.hydrateAvatars) Profile.hydrateAvatars(document.getElementById('app'));

    // Samla feed: start Gun-abonnement på innlegg + fyll feeden (asynkront).
    // Kun for innloggede — gjester ser ikke fellesskaps-feeden.
    if (user) {
      if (window.Community && Community.subscribe) Community.subscribe();
      // Start gruppe-abonnement slik at «Del i gruppe» har brukerens grupper klare.
      if (window.Groups && Groups.ensureSubscribed) { Groups.ensureSubscribed(); setTimeout(refreshComposerTargets, 600); }
      refreshHomeFeed();
      // Poll sky-feeden så nye innlegg frå andre (andre einingar/plattformer) legg
      // seg øverst på forsidens feed live — og utløyser varsel — utan reload.
      if (window.Community && Community.startPolling) Community.startPolling();
    }

    // Home radio widget controller
    window.HomeRadio = (() => {
      const GENRE_IDS = {
        // SomaFM (ice2.somafm.com) rekvirerte fjerning av alle strøymar frå tenesta
        // deira 09.09.2026 — psytrance/downtempo/ambient/dub/dark-drone mista difor
        // stasjonskorta sine (dei var utelukkande SomaFM-kanalar). Same fallback
        // som techno/psychill alt brukte: berre YouTube-fanen (AI-rotasjon), ingen
        // radiokanal-kort her.
        psytrance:   [],
        downtempo:   [],
        techno:      [],
        psychill:    [],
        progressive: ['trancearound', 'atr', 'rr-progressive'],
        ambient:     [],
        goa:         ['dmtfm', 'psyndora', 'babaganousha', 'babaganousha-labs'],
        dub:         [],
        chillout:    ['1fm-chillout', 'smoothchill'],
        'dark-drone':[],
      };
      let _currentId = null;
      let _playing = false;
      let _currentGenre = 'psytrance';
      let _freshSets = null;    // { genre: [{id,title,channel}, …] } fra /api/radio-fresh
      let _lastFreshAt = 0;     // når settene sist ble hentet (ms)
      let _refreshTimer = null;

      // Rotasjonstakt: nytt sett per halvtime. Serveren gir en shortlist per sjanger
      // (AI-rangert), og vi plukker etter tidsluke — så videoruta bytter ofte uten
      // at vi må ringe API-et på nytt.
      const SLOT_MS = 30 * 60 * 1000;
      const _slot = () => Math.floor(Date.now() / SLOT_MS);

      // Fallback-embeds — brukes hvis ferske AI-forslag ikke er lastet ennå/feiler,
      // så videoruta aldri blir tom. Byttes ut med ferske sett når de kommer.
      const FALLBACK_SRC = {
        psytrance:   'https://www.youtube.com/embed/Y7p8r1avQLQ?list=RDY7p8r1avQLQ',
        downtempo:   'https://www.youtube.com/embed/YgiFnQZvGTU?list=RDYgiFnQZvGTU',
        techno:      'https://www.youtube.com/embed/uvAwk-ITdVw?list=RDuvAwk-ITdVw',
        psychill:    'https://www.youtube.com/embed/zqxpQM7nGF8?list=RDzqxpQM7nGF8',
        progressive: 'https://www.youtube.com/embed/SdsKKXy57hw?list=RDSdsKKXy57hw',
        ambient:     'https://www.youtube.com/embed/wXk0hq7RB1A?list=RDwXk0hq7RB1A',
        goa:         'https://www.youtube.com/embed/dtk5CdOvVuc?list=RDdtk5CdOvVuc',
        dub:         'https://www.youtube.com/embed/videoseries?list=PLv1XAUg92fX9rVnD0r0ek-7monLM4JINL',
      };

      // Dagens sett for en sjanger: plukk i den AI-rangerte shortlisten etter
      // tidsluke, så settet bytter hver halvtime. Uten ferske data → fallback.
      function _pickFor(genre) {
        const list = (_freshSets && _freshSets[genre]) || [];
        if (!list.length) return null;
        return list[_slot() % list.length] || null;
      }

      function _ytEmbedSrc(genre) {
        const pick = _pickFor(genre);
        if (pick && pick.id) return `https://www.youtube.com/embed/${pick.id}?list=RD${pick.id}`;
        return FALLBACK_SRC[genre] || '';
      }

      // Hent ferske sett fra /api/radio-fresh; når de kommer, bytt dem inn i den
      // sjangeren brukeren ser på nå. Feiler kallet, beholdes fallback.
      async function _loadFresh(rerender = true) {
        try {
          const r = await fetch('/api/radio-fresh');
          const data = await r.json().catch(() => ({}));
          // Ny form: sets = shortlist per sjanger. Gammel form: picks = ett sett.
          let sets = (data && data.sets) || null;
          if (!sets || !Object.keys(sets).length) {
            const picks = (data && data.picks) || {};
            sets = {};
            for (const g of Object.keys(picks)) if (picks[g]) sets[g] = [picks[g]];
          }
          if (sets && Object.keys(sets).length) {
            _freshSets = sets;
            _lastFreshAt = Date.now();
            if (rerender && document.getElementById('hr-channel-grid')) _renderGrid(_currentGenre);
          }
        } catch (_) { /* behold fallback */ }
      }

      // Ligger fanen åpen lenge, hentes nye sett hver time slik at rotasjonen ikke
      // går tom for materiale. Selve videoruta byttes aldri midt i avspilling —
      // nytt sett vises ved neste render (sjangerbytte eller ny sidevisning).
      function _scheduleRefresh() {
        if (_refreshTimer) clearInterval(_refreshTimer);
        _refreshTimer = setInterval(() => {
          if (document.hidden) return;
          if (Date.now() - _lastFreshAt < 55 * 60 * 1000) return;
          _loadFresh(false);
        }, 5 * 60 * 1000);
      }

      function _updateDisplay(stationId) {
        const s = (Radio.stations || []).find(x => x.id === stationId);
        if (!s) return;
        const el = id => document.getElementById(id);
        if (el('hr-np-name'))   el('hr-np-name').textContent = s.name;
        if (el('hr-np-desc'))   el('hr-np-desc').textContent = s.desc;
        if (el('hr-np-emoji'))  el('hr-np-emoji').innerHTML = iconForEmoji(s.emoji, 'radio');
        if (el('hr-live-dot'))  el('hr-live-dot').classList.add('hr-dot-live');
        if (el('hr-np-status')) el('hr-np-status').textContent = 'LIVE';
        if (el('hr-np-play'))   { el('hr-np-play').textContent = '⏹ Stop'; el('hr-np-play').classList.add('hr-stop-active'); }
        _playing = true;
        _currentId = stationId;
        document.querySelectorAll('.hr-channel-card').forEach(c => {
          c.classList.toggle('hr-card-active', c.dataset.id === stationId);
        });
      }

      function _renderGrid(genre) {
        const grid = document.getElementById('hr-channel-grid');
        if (!grid) return;
        _currentGenre = genre;
        const ids = GENRE_IDS[genre] || [];
        const stations = ids.map(id => (Radio.stations || []).find(s => s.id === id)).filter(Boolean);
        const _src = _ytEmbedSrc(genre);
        const extraHtml = _src
          ? `<iframe class="hr-yt-embed" src="${_src}" allow="autoplay; encrypted-media" allowfullscreen></iframe>`
          : '';
        grid.innerHTML = stations.map(s => `
          <div class="hr-channel-card" data-id="${s.id}" style="--hc:${s.color}" onclick="HomeRadio.play('${s.id}')">
            <span class="hr-channel-emoji"><img src="assets/logo-mark.svg?v=20260816-sfm" alt="" class="hr-channel-logo"></span>

            <button class="hr-channel-play" onclick="event.stopPropagation();HomeRadio.play('${s.id}')">${Icon('play')}</button>
            <input type="range" class="hr-channel-vol" min="0" max="100" value="${Math.round((Radio.volume ?? 0.8) * 100)}" title="Volume" aria-label="Volume"
              onclick="event.stopPropagation()"
              oninput="event.stopPropagation();Radio.setVolume(this.value/100)">
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
          if (btn) { btn.textContent = '▶ Play'; btn.classList.remove('hr-stop-active'); }
          const dot = document.getElementById('hr-live-dot');
          if (dot) dot.classList.remove('hr-dot-live');
          const status = document.getElementById('hr-np-status');
          if (status) status.textContent = 'Stopped';
        } else {
          if (_currentId) play(_currentId);
          else autoStart();
        }
      }

      function autoStart() {
        const defaultId = 'radiozora-trance';
        Radio.playStation(defaultId);
        _updateDisplay(defaultId);
      }

      function init() {
        _renderGrid('psytrance');
        _loadFresh();
        _scheduleRefresh();
        const status = document.getElementById('hr-np-status');
        if (status) status.textContent = 'Click ▶ to listen';
        const btn = document.getElementById('hr-np-play');
        if (btn) btn.textContent = '▶';
      }

      return { play, setGenre, togglePlay, autoStart, init };
    })();

    HomeRadio.init();

    // Render user cards
    const grid = document.getElementById('users-grid');
    if (!grid) return;   // gjester ser ikke brukerlisten
    if (!users.length) {
      grid.innerHTML = `<div class="empty-state"><div class="empty-icon">${Icon('users')}</div><p>No users yet. Be the first!</p></div>`;
      return;
    }
    const currentUser = Auth.current();
    grid.innerHTML = users.map(u => {
      const t = u.theme || {};
      const bg = t.bgType === 'gradient' ? (t.bgGradient || 'linear-gradient(135deg,#22c55e,#16a34a)')
               : `linear-gradient(135deg,${t.primaryColor || '#22c55e'},${t.secondaryColor || '#2563eb'})`;
      const online = Auth.isOnline(u.username);
      let friendBtn = '';
      if (currentUser && currentUser.username !== u.username) {
        const fs = Auth.getFriendStatus(currentUser.username, u.username);
        if (fs === 'friends') {
          friendBtn = `<div class="user-card-friend-status">${Icon('check')} Friends</div>`;
        } else if (fs === 'pending_sent') {
          friendBtn = `<div class="user-card-friend-status user-card-friend-status--pending">${Icon('hourglass')} Request sent</div>`;
        } else if (fs === 'pending_received') {
          friendBtn = `<button class="user-card-friend-btn user-card-friend-btn--accept" onclick="event.stopPropagation();event.preventDefault();App.quickAcceptFriend('${u.username}',this)">${Icon('check')} Accept</button>`;
        } else {
          friendBtn = `<button class="user-card-friend-btn" onclick="event.stopPropagation();event.preventDefault();App.quickAddFriend('${u.username}',this)">+ Add friend</button>`;
        }
      }
      return `
        <div class="user-card hover-lift" data-username="${u.username}" onclick="Router.go('/u/${u.username}')">
          <div class="user-card-banner" style="background:${bg}" data-banner-user="${u.username}">
            <div class="user-card-avatar" style="background:${bg}" data-av-user="${u.username}">
              ${u.displayName.charAt(0).toUpperCase()}
            </div>
            ${online ? '<div class="user-online-dot" title="Online now"></div>' : ''}
          </div>
          <div class="user-card-body">
            <div class="user-card-name">${u.displayName}</div>
            <div class="user-card-username">@${u.username}</div>
            ${u.bio ? `<div class="user-card-bio">${u.bio}</div>` : ''}
            ${friendBtn}
          </div>
        </div>`;
    }).join('');

    // Fyll inn hver brukers profilbilde på kortene (bruker-kort + live/spiller-nå).
    // Via hydrateAvatars (data-av-user) så vi får SKY-tilbakefallet (ProfileSync):
    // en avatar lastet opp på én enhet ligger som offentlig avatarUrl i skyen, men
    // ikke i denne nettleserens lokale pv_users. Den gamle direkte-lesningen
    // (u.avatarUrl || u.avatarMediaId) traff derfor bare DIN egen enhet, så andres
    // profilbilder manglet på f.eks. mobil. Speiler banner-hydreringen under.
    if (window.Profile && Profile.hydrateAvatars) {
      Profile.hydrateAvatars(document.getElementById('app'));
    }

    // Vis innlogget brukers profilbilde i komponer-avataren (forsiden).
    if (user && (user.avatarUrl || user.avatarMediaId)) {
      const pAv = user.avatarUrl ? Promise.resolve(user.avatarUrl) : DB.getBlobUrl('media', user.avatarMediaId);
      pAv.then(url => {
        if (!url) return;
        document.querySelectorAll('.sc-composer-av').forEach(el => {
          el.innerHTML = `<img src="${url}" alt="${_esc(user.displayName)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
        });
      }).catch(() => {});
    }

    // Fyll inn hver brukers opplastede banner-/forsidebilde på kortene.
    if (window.Profile && Profile.hydrateBanners) Profile.hydrateBanners(grid);

    // Load public mix titles + filter private ones async
    for (const e of allMixEntries) {
      DB.get('mixes', e.mixId).then(async rec => {
        if (!rec) { document.getElementById(`pubmix-${e.mixId}`)?.remove(); return; }
        if (rec.visibility === 'private') { document.getElementById(`pubmix-${e.mixId}`)?.remove(); return; }
        const titleEl = document.getElementById(`pubmix-title-${e.mixId}`);
        if (titleEl) titleEl.textContent = rec.title || rec.name || 'Unknown mix';
        const btn = document.querySelector(`#pubmix-${e.mixId} .pub-mix-play`);
        if (btn) btn.onclick = () => Profile.playMix(e.mixId, rec.title || rec.name || 'DJ Mix');
        if (rec.coverMediaId) {
          const url = await DB.getBlobUrl('media', rec.coverMediaId).catch(() => null);
          const iconEl = document.getElementById(`pubmix-icon-${e.mixId}`);
          if (iconEl && url) iconEl.innerHTML = `<img src="${url}" class="pub-mix-cover-thumb">`;
        }
        if (rec.tracklist?.length) {
          const subEl = document.getElementById(`pubmix-sub-${e.mixId}`);
          if (subEl) subEl.innerHTML += ` <span style="color:var(--text3);font-size:0.7rem">· ${rec.tracklist.length} tracks</span>`;
        }
      }).catch(() => { document.getElementById(`pubmix-${e.mixId}`)?.remove(); });
    }
  }

  // ── Min side — personlig dashboard ──────────────────────────────────────
  async function renderMinSide() {
    const user = Auth.current();
    if (!user) { toast('Log in to see your page', 'error'); Router.go('/login'); return; }

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
            <span class="ms-item-label" id="ms-mix-label-${id}">Loading…</span>
            <button class="btn btn-ghost btn-sm" onclick="Profile.playMix('${id}','')">${Icon('play')} Play</button>
          </div>`).join('')
      : '<p class="ms-empty">No mixes uploaded yet. <a href="#/edit">Upload</a></p>';

    // Musikk — både opplastede lydfiler og URL-lenker vises her. Undertittelen
    // viser «Artist · Plateselskap» når det er fylt inn ved opplasting.
    const musicRows = tracks.length
      ? tracks.map((t, i) => {
          const label = t.credits && t.credits.label ? t.credits.label : '';
          const sub   = [t.artist, label].filter(Boolean).join(' · ');
          const isLink = t.kind === 'link' && t.linkUrl;
          const action = isLink
            ? `<a href="${_esc(t.linkUrl)}" target="_blank" rel="noopener" class="btn btn-ghost btn-sm">${Icon('link')} Open</a>`
            : `<button class="btn btn-ghost btn-sm" onclick="Player.loadTrack('${t.id}', true)">${Icon('play')} Play</button>`;
          const coverThumb = t.coverUrl
            ? `<img class="ms-item-cover" src="${_esc(t.coverUrl)}" alt="">`
            : (t.coverMediaId
                ? `<img class="ms-item-cover" id="ms-cover-${t.id}" alt="">`
                : `<span class="ms-item-icon">${Icon(isLink ? 'link' : 'music')}</span>`);
          return `
          <div class="ms-item">
            ${coverThumb}
            <span class="ms-item-label">${_esc(t.name || 'Song ' + (i + 1))}${sub ? ` <span style="color:var(--text3);font-size:0.82rem">— ${_esc(sub)}</span>` : ''}</span>
            ${action}
            <button class="btn btn-ghost btn-sm" title="Share on social media and the web" onclick="Share.open('music','${t.id}')">${Icon('share')} Share</button>
            <button class="btn btn-ghost btn-sm" title="Edit" onclick="App.msEditTrack('${t.id}')">${Icon('edit')} Edit</button>
            <button class="btn btn-ghost btn-sm" title="Delete" onclick="App.msDeleteTrack('${t.id}')">${Icon('trash')}</button>
          </div>`;
        }).join('')
      : '<p class="ms-empty">No music uploaded yet. Use the fields below to add your first song.</p>';

    // Events
    const eventRows = (user.events || []).length
      ? user.events.map(ev => `
          <div class="ms-item">
            <span class="ms-item-icon">${Icon('calendar')}</span>
            <span class="ms-item-label">${ev.title || 'Event'} — ${ev.date ? new Date(ev.date).toLocaleDateString('no-NO') : ''}</span>
            ${ev.isLive ? '<span class="event-live-dot" style="width:8px;height:8px;margin-left:0.5rem"></span>' : ''}
          </div>`).join('')
      : '<p class="ms-empty">No events yet. <a href="#/edit">Add to profile</a></p>';

    // Venner
    const friends = (user.friends || []).map(u => allUsers[u]).filter(Boolean);
    const friendRows = friends.length
      ? friends.map(f => `
          <div class="ms-item" onclick="Router.go('/u/${f.username}')" style="cursor:pointer">
            <span class="ms-item-icon">${Icon('user')}</span>
            <span class="ms-item-label">${f.displayName} <span style="color:var(--text3)">@${f.username}</span></span>
          </div>`).join('')
      : '<p class="ms-empty">No friends yet. <a href="#/discover">Find people</a></p>';

    document.getElementById('app').innerHTML = `
      <div class="settings-page-v2">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem">
          <h1>${Icon('home')} My page</h1>
          <div style="display:flex;gap:0.5rem;flex-wrap:wrap">
            <a href="#/login" class="btn btn-ghost btn-sm" title="Log in / switch account">${Icon('log-in')} Log in</a>
            <button class="btn btn-danger btn-sm" onclick="App.logout()">${Icon('log-out')} Log out</button>
          </div>
        </div>
        <div style="display:flex;gap:1rem;flex-wrap:wrap;margin-bottom:1.5rem">
          <div class="ms-stat-card">
            <div class="ms-stat-num">${(user.musicIds || []).length}</div>
            <div class="ms-stat-label">Songs</div>
          </div>
          <div class="ms-stat-card">
            <div class="ms-stat-num">${(user.mixIds || []).length}</div>
            <div class="ms-stat-label">Mixes</div>
          </div>
          <div class="ms-stat-card">
            <div class="ms-stat-num">${(user.followers || []).length}</div>
            <div class="ms-stat-label">Followers</div>
          </div>
          <div class="ms-stat-card">
            <div class="ms-stat-num">${(user.following || []).length}</div>
            <div class="ms-stat-label">Following</div>
          </div>
          <div class="ms-stat-card">
            <div class="ms-stat-num">${(user.friends || []).length}</div>
            <div class="ms-stat-label">Friends</div>
          </div>
        </div>

        <div class="settings-tabs">
          <button class="settings-tab-btn active" onclick="App.settingsTab('ms-musikk',this)">${Icon('music')} Music</button>
          <button class="settings-tab-btn" onclick="App.settingsTab('ms-mixes',this)">${Icon('sliders')} Mixes</button>
          <button class="settings-tab-btn" onclick="App.settingsTab('ms-events',this)">${Icon('calendar')} Events</button>
          <button class="settings-tab-btn" onclick="App.settingsTab('ms-venner',this)">${Icon('users')} Friends</button>
          <button class="settings-tab-btn" onclick="App.settingsTab('ms-messenger',this);if(window.Messenger)Messenger.mount('ms-messenger-root')">${Icon('mail')} Messenger<span id="ms-messenger-tabbadge" style="display:none;background:#ef4444;color:#fff;border-radius:999px;font-size:0.62rem;font-weight:700;min-width:16px;height:16px;align-items:center;justify-content:center;padding:0 4px;margin-left:0.35rem">0</span></button>
          <button class="settings-tab-btn" onclick="App.settingsTab('ms-hurtig',this)">${Icon('zap')} Quick links</button>
        </div>

        <div id="set-tab-ms-musikk" class="settings-tab-panel active">
          <div class="settings-section">
            <div class="settings-section-header">${Icon('music')} Upload audio file</div>
            <div class="settings-section-body">
              <div style="display:grid;gap:0.6rem;max-width:540px">
                <input class="form-input" id="ms-up-artist" placeholder="Artist (artist name)">
                <input class="form-input" id="ms-up-song"   placeholder="Song (song name)">
                <input class="form-input" id="ms-up-label"  placeholder="Label (optional)">
                <div style="display:flex;align-items:center;gap:0.75rem;flex-wrap:wrap">
                  <label class="btn btn-ghost" style="cursor:pointer;display:inline-flex;align-items:center;gap:0.4rem">
                    ${Icon('image')} Add image (cover)…
                    <input type="file" accept="image/*" style="display:none" onchange="App.msPickCover(this.files)">
                  </label>
                  <div id="ms-up-cover-preview" style="display:none;align-items:center;gap:0.5rem">
                    <img id="ms-up-cover-thumb" alt="Cover" style="width:44px;height:44px;border-radius:8px;object-fit:cover;border:1px solid var(--border)">
                    <button class="btn btn-ghost btn-sm" title="Remove image" onclick="App.msClearCover()">${Icon('x')}</button>
                  </div>
                </div>
                <label class="btn btn-primary" style="cursor:pointer;justify-self:start;display:inline-flex;align-items:center;gap:0.4rem">
                  ${Icon('music')} Choose audio file…
                  <input type="file" accept="audio/*" style="display:none" onchange="App.msUploadAudio(this.files)">
                </label>
                <div id="ms-up-status" style="font-size:0.82rem;color:var(--text2)"></div>
              </div>
            </div>
          </div>

          <div class="settings-section">
            <div class="settings-section-header">${Icon('link')} Add from link (URL)</div>
            <div class="settings-section-body">
              <div style="display:grid;gap:0.6rem;max-width:540px">
                <input class="form-input" id="ms-url-input" placeholder="Paste URL (YouTube, Spotify, SoundCloud, Bandcamp, direct audio file…)" oninput="App.msPreviewUrl()">
                <div id="ms-url-preview"></div>
                <input class="form-input" id="ms-url-artist" placeholder="Artist (optional)">
                <input class="form-input" id="ms-url-song"   placeholder="Song (optional)">
                <input class="form-input" id="ms-url-label"  placeholder="Label (optional)">
                <div style="display:flex;align-items:center;gap:0.75rem;flex-wrap:wrap">
                  <label class="btn btn-ghost" style="cursor:pointer;display:inline-flex;align-items:center;gap:0.4rem">
                    ${Icon('image')} Preview image…
                    <input type="file" accept="image/*" style="display:none" onchange="App.msPickUrlCover(this.files)">
                  </label>
                  <div id="ms-url-cover-preview" style="display:none;align-items:center;gap:0.5rem">
                    <img id="ms-url-cover-thumb" alt="Preview" style="width:44px;height:44px;border-radius:8px;object-fit:cover;border:1px solid var(--border)">
                    <button class="btn btn-ghost btn-sm" title="Remove image" onclick="App.msClearUrlCover()">${Icon('x')}</button>
                  </div>
                </div>
                <input class="form-input" id="ms-url-cover-url" placeholder="…or paste a direct image URL (jpg/png/webp)" oninput="App.msPickUrlCoverFromUrl()">
                <button class="btn btn-primary" style="justify-self:start" onclick="App.msAddUrl()">${Icon('plus')} Add link</button>
              </div>
            </div>
          </div>

          <div class="settings-section">
            <div class="settings-section-header">${Icon('music')} Your music</div>
            <div class="settings-section-body ms-list">${musicRows}</div>
          </div>
        </div>

        <div id="set-tab-ms-mixes" class="settings-tab-panel">
          <div class="settings-section">
            <div class="settings-section-header">${Icon('sliders')} Your DJ mixes</div>
            <div class="settings-section-body ms-list">${mixRows}</div>
          </div>
        </div>

        <div id="set-tab-ms-events" class="settings-tab-panel">
          <div class="settings-section">
            <div class="settings-section-header">${Icon('calendar')} Your events</div>
            <div class="settings-section-body ms-list">${eventRows}</div>
          </div>
        </div>

        <div id="set-tab-ms-venner" class="settings-tab-panel">
          <div class="settings-section">
            <div class="settings-section-header">${Icon('users')} Friends</div>
            <div class="settings-section-body ms-list">${friendRows}</div>
          </div>
        </div>

        <div id="set-tab-ms-messenger" class="settings-tab-panel">
          <div id="ms-messenger-root"><p class="ms-empty" style="padding:1rem 0;color:var(--text3)">Loading messages…</p></div>
        </div>

        <div id="set-tab-ms-hurtig" class="settings-tab-panel">
          <div class="settings-section">
            <div class="settings-section-header">${Icon('zap')} Quick links</div>
            <div class="settings-section-body">
              <div style="display:flex;flex-wrap:wrap;gap:0.75rem;margin-top:0.25rem">
                <a href="#/u/${user.username}" class="btn btn-ghost">${Icon('user')} My profile</a>
                <a href="#/edit" class="btn btn-ghost">${Icon('edit')} Edit profile</a>
                <a href="#/radio" class="btn btn-ghost">${Icon('radio')} Radio</a>
                <a href="#/inbox" class="btn btn-ghost">${Icon('mail')} Inbox</a>
                <a href="#/settings" class="btn btn-ghost">${Icon('settings')} Settings</a>
                <a href="#/discover" class="btn btn-ghost">${Icon('music')} Discover</a>
                <a href="#/forgot" class="btn btn-ghost">${Icon('key')} Reset password</a>
                <button class="btn btn-danger" onclick="App.logout()">${Icon('log-out')} Log out</button>
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

    // Hydrer lokalt lagrede cover-bilder (coverMediaId → blob-URL) i musikklista.
    for (const t of tracks) {
      if (!t.coverMediaId || t.coverUrl) continue;
      DB.getBlobUrl('media', t.coverMediaId).then(url => {
        const img = document.getElementById(`ms-cover-${t.id}`);
        if (img && url) img.src = url;
      }).catch(() => {});
    }

    // Messenger-fane: monter meldingsvisninga og oppdater ulesne-badgen. Kalla
    // også når fana klikkast (onclick over), men vi initierer badgen her.
    if (window.Messenger) { Messenger.init(); Messenger.updateBadges(); }
  }

  // ── Min side: opplasting av musikk (lydfil + URL) ───────────────────────────
  // Egne, lette opplastere som lever på «Min side» slik at man slipper å gå via
  // profileditoren. Lagrer i samme 'music'-store som resten av appen, med
  // artist/sang/plateselskap fylt inn av brukeren. Plateselskap havner i
  // credits.label — samme felt profilen allerede viser som «Label: …».

  // Valgfritt cover-bilde for neste opplasting. Holdes i minne til lydfila velges,
  // da lastes det opp sammen med sporet (sky → coverUrl, lokalt → coverMediaId).
  let _msCoverFile = null;

  function msPickCover(files) {
    const file = files && files[0];
    if (!file) return;
    if (file.type && !/^image\//.test(file.type)) { toast('Choose an image file', 'error'); return; }
    _msCoverFile = file;
    const box = document.getElementById('ms-up-cover-preview');
    const img = document.getElementById('ms-up-cover-thumb');
    if (img) img.src = URL.createObjectURL(file);
    if (box) box.style.display = 'flex';
  }

  function msClearCover() {
    _msCoverFile = null;
    const box = document.getElementById('ms-up-cover-preview');
    const img = document.getElementById('ms-up-cover-thumb');
    if (img && img.src && img.src.startsWith('blob:')) { try { URL.revokeObjectURL(img.src); } catch {} img.src = ''; }
    if (box) box.style.display = 'none';
  }

  // ── Forhåndsvisningsbilde for lenke-oppføringer ─────────────────────────────
  // En lenke (URL) kan få et eget cover på to måter: last opp et bilde fra enheten,
  // ELLER lim inn en direkte bilde-URL. Begge ender som samme felt appen allerede
  // viser: opplasting → coverUrl (sky, delt på tvers av alle brukere/enheter) eller
  // coverMediaId (lokal fallback); direkte-URL → coverUrl (allerede en delbar URL).
  let _msUrlCoverFile = null;   // opplastet fil (har forrang)
  let _msUrlCoverUrl  = '';     // direkte bilde-URL

  function _msSetUrlCoverThumb(src) {
    const box = document.getElementById('ms-url-cover-preview');
    const img = document.getElementById('ms-url-cover-thumb');
    if (img) {
      if (img.src && img.src.startsWith('blob:')) { try { URL.revokeObjectURL(img.src); } catch {} }
      img.src = src || '';
    }
    if (box) box.style.display = src ? 'flex' : 'none';
  }

  function msPickUrlCover(files) {
    const file = files && files[0];
    if (!file) return;
    if (file.type && !/^image\//.test(file.type)) { toast('Choose an image file', 'error'); return; }
    _msUrlCoverFile = file;
    _msUrlCoverUrl = '';
    const urlEl = document.getElementById('ms-url-cover-url');
    if (urlEl) urlEl.value = '';
    _msSetUrlCoverThumb(URL.createObjectURL(file));
  }

  function msPickUrlCoverFromUrl() {
    const url = (document.getElementById('ms-url-cover-url')?.value || '').trim();
    if (!url) { if (!_msUrlCoverFile) msClearUrlCover(); return; }
    if (!/^https?:\/\//i.test(url)) { _msUrlCoverUrl = ''; _msSetUrlCoverThumb(''); return; }
    // Direkte-URL vinner over en tidligere opplastet fil så snart brukeren skriver.
    _msUrlCoverFile = null;
    _msUrlCoverUrl = url;
    _msSetUrlCoverThumb(url);
  }

  function msClearUrlCover() {
    _msUrlCoverFile = null;
    _msUrlCoverUrl = '';
    const urlEl = document.getElementById('ms-url-cover-url');
    if (urlEl) urlEl.value = '';
    _msSetUrlCoverThumb('');
  }

  // Løs det valgte forhåndsvisningsbildet til {coverUrl, coverMediaId} for lagring.
  // Sky-først (delt på tvers av alle brukere/enheter), lokal blob som tilbakefall.
  async function _msResolveCover(file, directUrl) {
    let coverUrl = null, coverMediaId = null;
    if (file) {
      const useCloud = (typeof SC_Storage !== 'undefined') && SC_Storage.isConfigured();
      if (useCloud) {
        try { const c = await SC_Storage.upload(file, { prefix: 'covers' }); coverUrl = c.url; }
        catch (e) { if (e && e.message !== 'not-configured') console.warn('Cover-skylagring feilet:', e.message); }
      }
      if (!coverUrl) {
        try {
          const cid = `cov_${Date.now()}_${Math.random().toString(36).slice(2)}`;
          await DB.storeFile('media', cid, file);
          coverMediaId = cid;
        } catch (e) { console.warn('Cover-lokallagring feilet:', e.message || e); }
      }
    } else if (directUrl) {
      coverUrl = directUrl;
    }
    return { coverUrl, coverMediaId };
  }

  async function msUploadAudio(files) {
    const current = Auth.current();
    if (!current) { toast('Log in to upload', 'error'); Router.go('/login'); return; }
    const file = files && files[0];
    if (!file) return;
    if (file.type && !/^audio\//.test(file.type)) { toast('Choose an audio file', 'error'); return; }

    const artist = (document.getElementById('ms-up-artist')?.value || '').trim();
    const song   = (document.getElementById('ms-up-song')?.value   || '').trim();
    const label  = (document.getElementById('ms-up-label')?.value  || '').trim();
    const name   = song || file.name.replace(/\.[^.]+$/, '');
    const statusEl = document.getElementById('ms-up-status');
    if (statusEl) statusEl.innerHTML = `<span class="spinner" style="width:14px;height:14px;border-width:2px"></span> Uploading «${_esc(name)}»…`;

    // Prøv å lese varigheten før opplasting.
    let duration = 0;
    try {
      const u = URL.createObjectURL(file);
      const a = new Audio(u);
      duration = await new Promise(r => { a.onloadedmetadata = () => r(a.duration); a.onerror = () => r(0); });
      URL.revokeObjectURL(u);
    } catch {}

    const id = `mus_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const meta = {
      name, artist, duration, coverMediaId: null, coverUrl: null,
      credits: label ? { label } : null,
      visibility: 'public',
      mime: file.type, fileSize: file.size, createdAt: Date.now(),
      audioUrl: null, storagePath: null,
    };

    // Sky-først (Supabase → delbar URL alle hører), lokal IndexedDB som tilbakefall.
    const useCloud = (typeof SC_Storage !== 'undefined') && SC_Storage.isConfigured();

    // Valgfritt cover-bilde: last opp til sky når mulig (coverUrl deles på tvers av
    // brukere), ellers lagre blob lokalt i 'media'-store og referer via coverMediaId.
    const coverFile = _msCoverFile;
    if (coverFile) {
      if (useCloud) {
        try { const cres = await SC_Storage.upload(coverFile, { prefix: 'covers' }); meta.coverUrl = cres.url; }
        catch (e) { if (e && e.message !== 'not-configured') console.warn('Cover-skylagring feilet:', e.message); }
      }
      if (!meta.coverUrl) {
        try {
          const coverId = `cov_${Date.now()}_${Math.random().toString(36).slice(2)}`;
          await DB.storeFile('media', coverId, coverFile);
          meta.coverMediaId = coverId;
        } catch (e) { console.warn('Cover-lokallagring feilet:', e.message || e); }
      }
    }

    let shared = false;
    if (useCloud) {
      try {
        const res = await SC_Storage.upload(file, { prefix: 'audio' });
        meta.audioUrl = res.url; meta.storagePath = res.path;
        await DB.put('music', { id, ...meta });
        shared = true;
      } catch (e) {
        if (e && e.message !== 'not-configured') console.warn('Skylagring feilet, lagrer lokalt:', e.message);
      }
    }
    if (!shared) {
      try { await DB.storeFile('music', id, file, meta); }
      catch (e) { if (statusEl) statusEl.textContent = ''; toast('Upload failed: ' + (e.message || e), 'error'); return; }
    }
    msClearCover();

    current.musicIds = [...(current.musicIds || []), id];
    Auth.updateUser(current.username, { musicIds: current.musicIds });
    toast(shared ? 'Music uploaded and shared! 🌐' : 'Music uploaded (locally)!', 'success');
    if (window.Notify) Notify.notifyFriends(current, { type: 'upload', text: 'uploaded new music', link: `#/u/${current.username}` });
    renderMinSide();
  }

  // Live forhåndsvisning av en innlimt URL — gjenbruker LinkPreview-kortet (cover
  // + play) som feed/innlegg bruker, så YouTube/Spotify/SoundCloud m.fl. vises pent.
  function msPreviewUrl() {
    const url = (document.getElementById('ms-url-input')?.value || '').trim();
    const box = document.getElementById('ms-url-preview');
    if (!box) return;
    if (!url) { box.innerHTML = ''; return; }
    if (!window.LinkPreview || !LinkPreview.safeUrl(url)) {
      box.innerHTML = url ? `<div style="font-size:0.8rem;color:var(--text3)">Enter a valid http(s) link for preview.</div>` : '';
      return;
    }
    box.innerHTML = LinkPreview.cardHtml(url, `msurl-${url.length}`);
    try { LinkPreview.hydrate(box); } catch {}
  }

  async function msAddUrl() {
    const current = Auth.current();
    if (!current) { toast('Log in to add', 'error'); Router.go('/login'); return; }
    const url = (document.getElementById('ms-url-input')?.value || '').trim();
    if (!url || !(window.LinkPreview ? LinkPreview.safeUrl(url) : /^https?:\/\//i.test(url))) {
      toast('Paste a valid http(s) link', 'error'); return;
    }
    const artist = (document.getElementById('ms-url-artist')?.value || '').trim();
    const song   = (document.getElementById('ms-url-song')?.value   || '').trim();
    const label  = (document.getElementById('ms-url-label')?.value  || '').trim();
    let host = '';
    try { host = new URL(url).hostname.replace(/^www\./, ''); } catch {}
    const name = song || host || url.replace(/^https?:\/\//, '').slice(0, 60);
    // Direkte lydfil-URL kan spilles i spilleren; andre lenker åpnes i ny fane.
    const isDirectAudio = /\.(mp3|m4a|aac|wav|ogg|flac)(\?|$)/i.test(url);

    // Valgfritt forhåndsvisningsbilde (opplastet fil eller direkte bilde-URL).
    const { coverUrl, coverMediaId } = await _msResolveCover(_msUrlCoverFile, _msUrlCoverUrl);

    const id = `mus_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const rec = {
      id, name, artist,
      credits: label ? { label } : null,
      kind: 'link', linkUrl: url,
      audioUrl: isDirectAudio ? url : null,
      duration: 0, coverUrl, coverMediaId,
      visibility: 'public', createdAt: Date.now(),
    };
    await DB.put('music', rec);
    current.musicIds = [...(current.musicIds || []), id];
    Auth.updateUser(current.username, { musicIds: current.musicIds });
    msClearUrlCover();
    toast('Link added! 🔗', 'success');
    renderMinSide();
  }

  async function msDeleteTrack(id) {
    const current = Auth.current();
    if (!current) return;
    if (!confirm('Do you want to delete this entry?')) return;
    const rec = await DB.get('music', id).catch(() => null);
    if (rec && rec.coverMediaId) { DB.invalidateBlobCache('media', rec.coverMediaId); await DB.delete('media', rec.coverMediaId).catch(() => {}); }
    await DB.delete('music', id).catch(() => {});
    current.musicIds = (current.musicIds || []).filter(x => x !== id);
    Auth.updateUser(current.username, { musicIds: current.musicIds });
    if (window.Community && Community.isShared && Community.isShared(id)) Community.unshareMedia(id);
    toast('Deleted', 'info');
    renderMinSide();
  }

  // Rediger en oppføring i «Din musikk» — endre tittel, artist, plateselskap, og
  // (for lenker) selve URL-en. Åpner samme delte modal som resten av appen bruker.
  async function msEditTrack(id) {
    const current = Auth.current();
    if (!current) { toast('Log in to edit', 'error'); Router.go('/login'); return; }
    const rec = await DB.get('music', id).catch(() => null);
    if (!rec) { toast('Entry not found', 'error'); return; }
    const box = document.getElementById('modal-box');
    if (!box) return;
    const isLink = rec.kind === 'link' && rec.linkUrl;
    const label = (rec.credits && rec.credits.label) ? rec.credits.label : '';
    // Nullstill cover-redigeringstilstand og forhåndsvis eksisterende cover.
    _msEditCoverFile = null; _msEditCoverUrl = ''; _msEditCoverCleared = false;
    let curCover = rec.coverUrl || '';
    if (!curCover && rec.coverMediaId) { try { curCover = await DB.getBlobUrl('media', rec.coverMediaId).catch(() => '') || ''; } catch {} }
    box.innerHTML = `
      <div class="modal-header"><h2>${Icon('edit')} Edit entry</h2></div>
      <div style="padding:1.25rem;display:grid;gap:0.6rem;max-width:520px">
        <label class="form-label" style="margin:0">Title</label>
        <input class="form-input" id="ms-edit-name" value="${_esc(rec.name || '')}" placeholder="Title">
        <label class="form-label" style="margin:0">Artist</label>
        <input class="form-input" id="ms-edit-artist" value="${_esc(rec.artist || '')}" placeholder="Artist (optional)">
        <label class="form-label" style="margin:0">Label</label>
        <input class="form-input" id="ms-edit-label" value="${_esc(label)}" placeholder="Label (optional)">
        ${isLink ? `
        <label class="form-label" style="margin:0">Link (URL)</label>
        <input class="form-input" id="ms-edit-url" value="${_esc(rec.linkUrl || '')}" placeholder="https://…">` : ''}
        <label class="form-label" style="margin:0">Preview image</label>
        <div style="display:flex;align-items:center;gap:0.75rem;flex-wrap:wrap">
          <img id="ms-edit-cover-thumb" alt="Preview" src="${_esc(curCover)}" style="width:52px;height:52px;border-radius:8px;object-fit:cover;border:1px solid var(--border);${curCover ? '' : 'display:none'}">
          <label class="btn btn-ghost btn-sm" style="cursor:pointer;display:inline-flex;align-items:center;gap:0.4rem">
            ${Icon('image')} Upload image…
            <input type="file" accept="image/*" style="display:none" onchange="App.msPickEditCover(this.files)">
          </label>
          <button class="btn btn-ghost btn-sm" title="Remove image" onclick="App.msClearEditCover()">${Icon('x')}</button>
        </div>
        <input class="form-input" id="ms-edit-cover-url" placeholder="…or paste a direct image URL (jpg/png/webp)" oninput="App.msPickEditCoverFromUrl()">
        <div style="display:flex;gap:0.75rem;margin-top:0.4rem">
          <button class="btn btn-primary" onclick="App.msSaveTrackEdit('${id}')">${Icon('check')} Save</button>
          <button class="btn btn-ghost" onclick="App.closeModal()">Cancel</button>
        </div>
      </div>`;
    openModal();
  }

  // Cover-redigeringstilstand for «Rediger oppføring»-modalen.
  let _msEditCoverFile = null;    // ny opplastet fil
  let _msEditCoverUrl  = '';      // ny direkte bilde-URL
  let _msEditCoverCleared = false; // brukeren fjernet eksisterende cover

  function _msSetEditCoverThumb(src) {
    const img = document.getElementById('ms-edit-cover-thumb');
    if (!img) return;
    if (img.src && img.src.startsWith('blob:')) { try { URL.revokeObjectURL(img.src); } catch {} }
    if (src) { img.src = src; img.style.display = ''; }
    else { img.src = ''; img.style.display = 'none'; }
  }

  function msPickEditCover(files) {
    const file = files && files[0];
    if (!file) return;
    if (file.type && !/^image\//.test(file.type)) { toast('Choose an image file', 'error'); return; }
    _msEditCoverFile = file; _msEditCoverUrl = ''; _msEditCoverCleared = false;
    const urlEl = document.getElementById('ms-edit-cover-url');
    if (urlEl) urlEl.value = '';
    _msSetEditCoverThumb(URL.createObjectURL(file));
  }

  function msPickEditCoverFromUrl() {
    const url = (document.getElementById('ms-edit-cover-url')?.value || '').trim();
    if (!url) { _msEditCoverUrl = ''; return; }
    if (!/^https?:\/\//i.test(url)) { _msEditCoverUrl = ''; return; }
    _msEditCoverFile = null; _msEditCoverUrl = url; _msEditCoverCleared = false;
    _msSetEditCoverThumb(url);
  }

  function msClearEditCover() {
    _msEditCoverFile = null; _msEditCoverUrl = ''; _msEditCoverCleared = true;
    const urlEl = document.getElementById('ms-edit-cover-url');
    if (urlEl) urlEl.value = '';
    _msSetEditCoverThumb('');
  }

  async function msSaveTrackEdit(id) {
    const current = Auth.current();
    if (!current) return;
    const rec = await DB.get('music', id).catch(() => null);
    if (!rec) { toast('Entry not found', 'error'); return; }
    const name   = (document.getElementById('ms-edit-name')?.value   || '').trim();
    const artist = (document.getElementById('ms-edit-artist')?.value || '').trim();
    const label  = (document.getElementById('ms-edit-label')?.value  || '').trim();
    const urlEl  = document.getElementById('ms-edit-url');
    if (urlEl) {
      const url = (urlEl.value || '').trim();
      if (!url || !(window.LinkPreview ? LinkPreview.safeUrl(url) : /^https?:\/\//i.test(url))) {
        toast('Paste a valid http(s) link', 'error'); return;
      }
      rec.linkUrl = url;
      // Oppdater direkte-lyd-flagget så en endret URL fortsatt kan spilles.
      rec.audioUrl = /\.(mp3|m4a|aac|wav|ogg|flac)(\?|$)/i.test(url) ? url : null;
    }
    rec.name = name || rec.name;
    rec.artist = artist;
    rec.credits = label ? { ...(rec.credits || {}), label } : (rec.credits && rec.credits.label ? { ...rec.credits, label: undefined } : rec.credits);
    if (rec.credits && rec.credits.label === undefined) delete rec.credits.label;

    // Forhåndsvisningsbilde: nytt bilde (fil/URL) erstatter, «fjern» nullstiller.
    // Rydd gammel lokal blob når coveret byttes eller fjernes.
    if (_msEditCoverFile || _msEditCoverUrl || _msEditCoverCleared) {
      const oldMediaId = rec.coverMediaId;
      const { coverUrl, coverMediaId } = await _msResolveCover(_msEditCoverFile, _msEditCoverUrl);
      rec.coverUrl = coverUrl;
      rec.coverMediaId = coverMediaId;
      if (oldMediaId && oldMediaId !== coverMediaId) {
        DB.invalidateBlobCache('media', oldMediaId);
        await DB.delete('media', oldMediaId).catch(() => {});
      }
    }
    _msEditCoverFile = null; _msEditCoverUrl = ''; _msEditCoverCleared = false;

    await DB.put('music', rec);
    closeModal();
    toast('Saved', 'success');
    renderMinSide();
  }

  function renderLogin() {
    document.getElementById('app').innerHTML = `
      <div class="auth-page">
        <div class="auth-card">
          <div class="auth-logo">
            <h1>Sirius<span>FM</span></h1>
            <p>Log in to SiriusFM</p>
          </div>
          <div class="form-group">
            <label class="form-label">Username or email</label>
            <input class="form-input" id="login-user" placeholder="your_username" autocomplete="username">
          </div>
          <div class="form-group">
            <label class="form-label">Password</label>
            <div class="input-group">
              <input class="form-input" id="login-pass" type="password" placeholder="••••••••" autocomplete="current-password">
              <button class="input-group-icon" onclick="togglePassword('login-pass',this)">${Icon('eye')}</button>
            </div>
          </div>
          <div id="login-error" class="form-error" style="margin-bottom:0.75rem;display:none"></div>
          <button class="btn btn-primary w-full" onclick="App.doLogin()">Log in</button>
          <div class="auth-divider">or</div>
          <div class="auth-footer">
            <a href="#/forgot">Forgot password?</a>
          </div>
          <div class="auth-footer">
            <a href="#" onclick="event.preventDefault();App.resendFromLogin()">Send a new activation link</a>
          </div>
          <div class="auth-footer">
            New user? <a href="#/register">Sign up</a>
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
          errEl.innerHTML = `${result.error} <button onclick="App.resendActivationByEmail('${user.replace(/'/g, "\\'")}')" style="background:none;border:none;color:#38bdf8;text-decoration:underline;cursor:pointer;padding:0;font-size:inherit">Send activation link again</button>`;
        } else {
          errEl.textContent = result.error;
        }
        errEl.style.display = 'block';
      }
      return;
    }
    renderNav();
    toast(`Welcome back to SiriusFM, ${result.user.displayName}! ${Icon('smile')}`, 'success');
    Router.go('/');
  }

  function resendFromLogin() {
    const user = document.getElementById('login-user')?.value?.trim();
    if (!user) {
      const errEl = document.getElementById('login-error');
      if (errEl) {
        errEl.textContent = 'Enter your username or email first, and we\'ll send a new activation link.';
        errEl.style.display = 'block';
      }
      document.getElementById('login-user')?.focus();
      return;
    }
    resendActivationByEmail(user);
  }

  async function resendActivationByEmail(usernameOrEmail) {
    toast('Sending activation link…', 'info');

    // Server først: regenererer token og sender e-posten server-side.
    const serverRes = await AccountServer.resend(usernameOrEmail);
    if (!serverRes.offline) {
      if (serverRes.emailError) { toast('Error: ' + serverRes.emailError, 'error'); return; }
      toast('Activation link sent! Check your email 📧', 'success');
      return;
    }

    // Lokal fallback (utvikling / API utilgjengelig).
    const users = Auth.getUsers();
    let u = users[usernameOrEmail];
    if (!u) u = Object.values(users).find(x => x.email === usernameOrEmail.toLowerCase().trim());
    if (!u) { toast('Account not found', 'error'); return; }
    if (u.activated) { toast('The account is already activated', 'info'); return; }

    if (!u.activationToken) {
      const token = Array.from(crypto.getRandomValues(new Uint8Array(40))).map(b => b.toString(16).padStart(2,'0')).join('');
      Auth.updateUser(u.username, { activationToken: token });
      u.activationToken = token;
    }

    const res = await Email.sendActivation(u.email, u.username, u.activationToken);
    toast(res.error ? 'Error: ' + res.error : 'Activation link sent! Check your email 📧', res.error ? 'error' : 'success');
  }

  function renderRegister() {
    document.getElementById('app').innerHTML = `
      <div class="auth-page">
        <div class="auth-card">
          <div class="auth-logo">
            <h1>Sirius<span>FM</span></h1>
            <p>Create your free SiriusFM profile</p>
          </div>
          <div class="form-group">
            <label class="form-label">Username</label>
            <input class="form-input" id="reg-username" placeholder="letters_numbers_only" autocomplete="username">
            <span class="form-hint">Letters, numbers and underscore only. At least 3 characters.</span>
          </div>
          <div class="form-group">
            <label class="form-label">Display name</label>
            <input class="form-input" id="reg-displayname" placeholder="Your full name">
          </div>
          <div class="form-group">
            <label class="form-label">Email address</label>
            <input class="form-input" id="reg-email" type="email" placeholder="you@example.com" autocomplete="email">
          </div>
          <div class="form-group">
            <label class="form-label">Password</label>
            <div class="input-group">
              <input class="form-input" id="reg-pass" type="password" placeholder="At least 6 characters" autocomplete="new-password">
              <button class="input-group-icon" onclick="togglePassword('reg-pass',this)">${Icon('eye')}</button>
            </div>
            <span class="form-hint">At least 6 characters and one special character (e.g. !@#$%)</span>
          </div>
          <div class="form-group">
            <label class="form-label">Confirm password</label>
            <input class="form-input" id="reg-pass2" type="password" placeholder="Repeat password" autocomplete="new-password">
          </div>
          <div class="form-group">
            <label class="form-label">What are you?</label>
            <div class="role-selector" id="reg-role-selector">
              <label class="role-option" onclick="App.selectRole('lytter',this)">
                <input type="radio" name="reg-role" value="lytter" checked style="display:none">
                <div class="role-option-inner active"><span class="role-option-emoji">${Icon('headphones')}</span><span class="role-option-label">Listener</span></div>
              </label>
              <label class="role-option" onclick="App.selectRole('dj',this)">
                <input type="radio" name="reg-role" value="dj" style="display:none">
                <div class="role-option-inner"><span class="role-option-emoji">${Icon('sliders')}</span><span class="role-option-label">DJ</span></div>
              </label>
              <label class="role-option" onclick="App.selectRole('produsent',this)">
                <input type="radio" name="reg-role" value="produsent" style="display:none">
                <div class="role-option-inner"><span class="role-option-emoji">${Icon('music')}</span><span class="role-option-label">Producer</span></div>
              </label>
              <label class="role-option" onclick="App.selectRole('plateselskap',this)">
                <input type="radio" name="reg-role" value="plateselskap" style="display:none">
                <div class="role-option-inner"><span class="role-option-emoji">${Icon('tag')}</span><span class="role-option-label">Label</span></div>
              </label>
            </div>
          </div>
          <div class="form-group" id="reg-label-group" style="display:none">
            <label class="form-label">Label name</label>
            <input class="form-input" id="reg-label-name" placeholder="E.g. Kompakt Records" maxlength="80">
            <span class="form-hint">Shown as the publisher on the music you upload.</span>
          </div>
          <div id="reg-error" class="form-error" style="margin-bottom:0.75rem;display:none"></div>
          <button class="btn btn-primary w-full" id="reg-btn" onclick="App.doRegister()">Sign up</button>
          <div class="auth-footer" style="margin-top:1rem">
            Already have an account? <a href="#/login">Log in</a>
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
      if (errEl) { errEl.textContent = 'The passwords do not match'; errEl.style.display = 'block'; }
      return;
    }

    const roleInput = document.querySelector('input[name="reg-role"]:checked');
    const role = roleInput?.value || 'lytter';
    const labelName = (role === 'plateselskap')
      ? (document.getElementById('reg-label-name')?.value?.trim() || '')
      : '';

    // Vis «kontoen ble opprettet, men e-posten gikk ikke ut» — ærlig melding.
    const showEmailFailedPage = (msg) => {
      document.getElementById('app').innerHTML = `
        <div class="auth-page">
          <div class="auth-card" style="text-align:center">
            <div style="font-size:4rem;margin-bottom:1rem">${Icon('alert')}</div>
            <h2 style="font-weight:800;margin-bottom:0.5rem">The account was created</h2>
            <p style="color:var(--text2);margin-bottom:1rem">
              But unfortunately we couldn't send the activation link to <strong>${email}</strong> right now.
            </p>
            <div class="badge badge-red" style="margin-bottom:1.25rem">${msg}</div>
            <div style="margin-bottom:0.75rem">
              <button class="btn btn-primary" id="resend-confirm-btn" onclick="App.resendActivationByEmail('${username}')">${Icon('mail')} Try sending the activation link again</button>
            </div>
            <a href="#/login" class="btn btn-ghost btn-sm" style="display:inline-flex">Go to login</a>
          </div>
        </div>`;
    };
    // Vis «sjekk e-posten din» — aktiveringslenke sendt OK.
    const showCheckEmailPage = () => {
      document.getElementById('app').innerHTML = `
        <div class="auth-page">
          <div class="auth-card" style="text-align:center">
            <div style="font-size:4rem;margin-bottom:1rem">${Icon('mail')}</div>
            <h2 style="font-weight:800;margin-bottom:0.5rem">Check your email!</h2>
            <p style="color:var(--text2);margin-bottom:1.5rem">
              We've sent an activation link to <strong>${email}</strong>.<br>
              Click the link in the email to activate your account.
            </p>
            <a href="#/login" class="btn btn-primary" style="margin-bottom:0.75rem;display:inline-flex">Go to login</a>
            <div style="margin-top:0.75rem">
              <button class="btn btn-ghost btn-sm" id="resend-confirm-btn" onclick="App.resendActivationByEmail('${username}')">${Icon('mail')} Send activation link again</button>
            </div>
            <p style="color:var(--text2);font-size:0.8rem;margin-top:1rem">Didn't find the email? Check your spam folder.</p>
          </div>
        </div>`;
    };

    if (btn) { btn.textContent = 'Signing up…'; btn.disabled = true; }

    // ── Server-kontoer først (sannhetskilden) ──────────────────────────────
    // Global unik e-post, lagring på tvers av enheter, ekte glemt-passord.
    const serverRes = await AccountServer.register({ username, displayName, email, password: pass, role });
    if (!serverRes.offline) {
      if (btn) { btn.textContent = 'Sign up'; btn.disabled = false; }
      if (serverRes.error) {
        if (errEl) { errEl.textContent = serverRes.error; errEl.style.display = 'block'; }
        return;
      }
      // Konto opprettet på serveren. Serveren har allerede prøvd å sende e-posten.
      Auth.updateUser(username, { role, labelName });
      if (serverRes.emailError) showEmailFailedPage(serverRes.emailError);
      else                      showCheckEmailPage();
      return;
    }

    // ── Lokal fallback (utvikling / API utilgjengelig) ─────────────────────
    const result = Auth.register(username, pass, displayName, email);
    if (btn) { btn.textContent = 'Sign up'; btn.disabled = false; }

    if (result.error) {
      if (errEl) { errEl.textContent = result.error; errEl.style.display = 'block'; }
      return;
    }

    Auth.updateUser(username, { role, labelName });

    const emailRes = await Email.sendActivation(email, username, result.activationToken);

    if (emailRes.devMode) {
      // Auto-activated in dev mode — log the user in immediately
      localStorage.setItem('pv_session', JSON.stringify({ username, ts: Date.now() }));
      renderNav();
      toast(`Account created! Welcome, ${displayName || username}! ${Icon('party')}`, 'success');
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
            <h1>SiriusFM</h1>
            <p>Reset password</p>
          </div>
          <div class="form-group">
            <label class="form-label">Email address</label>
            <input class="form-input" id="forgot-email" type="email" placeholder="you@example.com" autocomplete="email">
          </div>
          <div id="forgot-error" class="form-error" style="margin-bottom:0.75rem;display:none"></div>
          <div id="forgot-success" style="display:none;margin-bottom:0.75rem;color:#38bdf8;font-size:0.875rem"></div>
          <button class="btn btn-primary w-full" id="forgot-btn" onclick="App.doForgotPassword()">Send reset link</button>
          <div class="auth-footer"><a href="#/login">${Icon('arrow-left')} Back to login</a></div>
        </div>
      </div>`;
    document.getElementById('forgot-email').addEventListener('keydown', e => { if (e.key === 'Enter') App.doForgotPassword(); });
  }

  async function doForgotPassword() {
    const email  = document.getElementById('forgot-email')?.value?.trim();
    const errEl  = document.getElementById('forgot-error');
    const sucEl  = document.getElementById('forgot-success');
    const btn    = document.getElementById('forgot-btn');

    if (!email) { if (errEl) { errEl.textContent = 'Enter your email address'; errEl.style.display = 'block'; } return; }

    if (btn) { btn.textContent = 'Sending…'; btn.disabled = true; }

    // Server først: slår opp kontoen globalt og sender e-posten selv. Svarer
    // generisk (avslører ikke om adressen finnes) for å hindre kontooppramsing.
    const serverRes = await AccountServer.forgot(email);
    if (!serverRes.offline) {
      if (btn) { btn.textContent = 'Send reset link'; btn.disabled = false; }
      if (serverRes.error) {
        if (errEl) { errEl.textContent = serverRes.error; errEl.style.display = 'block'; }
        return;
      }
      if (errEl) errEl.style.display = 'none';
      if (sucEl) {
        sucEl.style.display = 'block';
        sucEl.innerHTML = `${Icon('check-circle')} If an account exists with <strong>${email}</strong>, we've sent a reset link there. Check your email (and spam folder).`;
      }
      return;
    }

    // Lokal fallback (utvikling / API utilgjengelig).
    const result = Auth.forgotPassword(email);
    if (btn) { btn.textContent = 'Send reset link'; btn.disabled = false; }

    if (result.error) {
      if (errEl) { errEl.textContent = result.error; errEl.style.display = 'block'; }
      return;
    }

    const emailRes = await Email.sendPasswordReset(email, result.username, result.token);

    if (errEl) errEl.style.display = 'none';
    if (sucEl) {
      sucEl.style.display = 'block';
      sucEl.innerHTML = emailRes.devMode
        ? `${Icon('check-circle')} (Dev mode) Link: <a href="${emailRes.link}" style="color:#38bdf8">${emailRes.link}</a>`
        : `${Icon('check-circle')} Reset link sent to ${email}`;
    }
  }

  function renderResetPassword(token) {
    document.getElementById('app').innerHTML = `
      <div class="auth-page">
        <div class="auth-card">
          <div class="auth-logo">
            <h1>SiriusFM</h1>
            <p>New password</p>
          </div>
          <div class="form-group">
            <label class="form-label">New password</label>
            <div class="input-group">
              <input class="form-input" id="reset-pass" type="password" placeholder="At least 6 characters">
              <button class="input-group-icon" onclick="togglePassword('reset-pass',this)">${Icon('eye')}</button>
            </div>
            <span class="form-hint">At least 6 characters and one special character (e.g. !@#$%)</span>
          </div>
          <div class="form-group">
            <label class="form-label">Confirm password</label>
            <input class="form-input" id="reset-pass2" type="password" placeholder="Repeat password">
          </div>
          <div id="reset-error" class="form-error" style="margin-bottom:0.75rem;display:none"></div>
          <button class="btn btn-primary w-full" onclick="App.doResetPassword('${token}')">Set new password</button>
        </div>
      </div>`;
  }

  async function doResetPassword(token) {
    const pass  = document.getElementById('reset-pass')?.value;
    const pass2 = document.getElementById('reset-pass2')?.value;
    const errEl = document.getElementById('reset-error');
    if (pass !== pass2) {
      if (errEl) { errEl.textContent = 'The passwords do not match'; errEl.style.display = 'block'; }
      return;
    }
    // Server først (sannhetskilden), lokal fallback om API-et ikke er tilgjengelig.
    let result = await AccountServer.reset(token, pass);
    if (result.offline) result = Auth.resetPassword(token, pass);

    if (result.error) {
      if (errEl) { errEl.textContent = result.error; errEl.style.display = 'block'; }
      return;
    }
    toast('Password updated! Log in.', 'success');
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
          <h2>Invalid link</h2>
          <p style="color:var(--text2);margin-top:0.5rem">${result.error}</p>
          <a href="#/register" class="btn btn-primary" style="margin-top:1.5rem;display:inline-flex">Try again</a>
        </div></div>`;
      return;
    }
    // Kvittering + auto-login: vis «You are now activated» et øyeblikk, logg så
    // automatisk inn og send brukeren til forsiden på www.siriusfm.no.
    localStorage.setItem('pv_session', JSON.stringify({ username: result.user.username, ts: Date.now() }));
    renderNav();
    toast(`Account activated! Logging you in … ${Icon('party')}`, 'success');
    document.getElementById('app').innerHTML = `
      <div class="auth-page"><div class="auth-card" style="text-align:center">
        <div style="font-size:4rem;margin-bottom:1rem">${Icon('check-circle')}</div>
        <h2 style="font-weight:800;margin-bottom:0.5rem">You are now activated 🎉</h2>
        <p style="color:var(--text2);margin-bottom:1.5rem">
          Welcome, <strong>${result.user.displayName}</strong>! You'll be logged in and taken to SiriusFM …
        </p>
        <a href="#/" class="btn btn-primary" style="display:inline-flex">${Icon('arrow-right')} Go to SiriusFM now</a>
      </div></div>`;
    // Etter et par sekund: gå til forsiden på det kanoniske domenet. Økten ligger
    // på samme origin (aktiveringslenka er kanonisk), så auto-innloggingen følger med.
    setTimeout(() => {
      const canonical = (CONFIG.CANONICAL_URL || window.location.origin).replace(/\/$/, '');
      const isLocal   = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|)$/.test(location.hostname);
      if (isLocal || window.location.origin === new URL(canonical).origin) {
        Router.go('/');                       // samme origin → SPA-nav, bevarer økten
      } else {
        window.location.href = canonical + '/'; // ellers full-nav til www.siriusfm.no
      }
    }, 2500);
  }

  function renderInbox(activeTab = 'samtaler') {
    const user = Auth.current();
    if (!user) { toast('Log in to see your inbox', 'error'); Router.go('/login'); return; }

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
        if (d < 60000)    return 'Just now';
        if (d < 3600000)  return `${Math.floor(d/60000)} min ago`;
        if (d < 86400000) return `${Math.floor(d/3600000)} h ago`;
        return new Date(c.last.ts).toLocaleDateString('no-NO');
      })();
      const label = c.chatName || c.displayName;
      return `
        <div class="settings-row" onclick="Router.go('/messages/${c.username}')" style="cursor:pointer${c.unread > 0 ? ';background:rgba(34,197,94,0.06)' : ''}">
          <div style="display:flex;align-items:center;gap:0.75rem;flex:1;min-width:0">
            <div style="position:relative;flex-shrink:0">
              <div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,var(--accent),#2563eb);display:flex;align-items:center;justify-content:center;font-weight:700">${c.displayName.charAt(0).toUpperCase()}</div>
              ${c.unread > 0 ? `<span style="position:absolute;top:-3px;right:-3px;background:#ef4444;color:#fff;border-radius:999px;font-size:0.65rem;font-weight:700;min-width:16px;height:16px;display:flex;align-items:center;justify-content:center;padding:0 3px">${c.unread}</span>` : ''}
            </div>
            <div style="min-width:0;flex:1">
              <div style="font-weight:${c.unread > 0 ? '700' : '600'}">${label} <span style="font-size:0.75rem;color:var(--text3)">@${c.username}</span></div>
              <div style="font-size:0.82rem;color:${c.unread > 0 ? 'var(--text)' : 'var(--text2)'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:${c.unread > 0 ? '600' : '400'}">${isMine ? 'You: ' : ''}${c.last.text}</div>
            </div>
          </div>
          <div style="font-size:0.75rem;color:var(--text3);white-space:nowrap;margin-left:0.75rem">${timeStr}</div>
        </div>`;
    }).join('') : '<p style="color:var(--text3);font-size:0.85rem;padding:1rem 0">No conversations yet. Go to <strong>Users</strong> and invite someone to chat!</p>';

    // ── Tab: Ny chat ─────────────────────────────────────────────────────
    const nychatContent = `
      <p style="color:var(--text2);font-size:0.88rem;margin:0 0 1.25rem">Choose who you want to chat with, and give the conversation an optional name.</p>
      <div style="display:flex;flex-direction:column;gap:1rem;max-width:420px">
        <div>
          <label style="display:block;font-size:0.82rem;color:var(--text2);margin-bottom:0.35rem;font-weight:600">User *</label>
          <select id="inbox-new-chat-user" style="width:100%;background:var(--surface,#1a1a2e);border:1px solid var(--border,rgba(255,255,255,0.12));border-radius:8px;padding:0.6rem 0.75rem;color:var(--text,#fff);font-size:0.9rem">
            <option value="">— Choose user —</option>
            ${allOtherUsers.map(u => `<option value="${u.username}">${u.displayName} (@${u.username})</option>`).join('')}
          </select>
        </div>
        <div>
          <label style="display:block;font-size:0.82rem;color:var(--text2);margin-bottom:0.35rem;font-weight:600">Conversation name <span style="font-weight:400;color:var(--text3)">(optional)</span></label>
          <input type="text" id="inbox-new-chat-name"
            placeholder="e.g. Project, Music talk, Collaboration…"
            maxlength="60"
            style="width:100%;background:var(--surface,#1a1a2e);border:1px solid var(--border,rgba(255,255,255,0.12));border-radius:8px;padding:0.6rem 0.75rem;color:var(--text,#fff);font-size:0.9rem;box-sizing:border-box">
        </div>
        <button class="btn btn-primary" style="align-self:flex-start" onclick="App.startNewChat()">${Icon('message')} Start chat</button>
      </div>`;

    // ── Tab: Brukere ─────────────────────────────────────────────────────
    const brukereRows = !allOtherUsers.length
      ? '<p style="color:var(--text3);font-size:0.85rem">No other users yet.</p>'
      : allOtherUsers.map(u => {
          const isFriend   = friends.has(u.username);
          const isPending  = sent.has(u.username);
          const isIncoming = (user.friendRequests||[]).some(r => r.from === u.username);
          let friendBtn = '';
          if (isFriend) {
            friendBtn = `<span style="font-size:0.78rem;color:#7dd3fc">${Icon('check')} Friends</span>`;
          } else if (isPending) {
            friendBtn = `<span style="font-size:0.78rem;color:var(--text3)">${Icon('hourglass')} Sent</span>`;
          } else if (isIncoming) {
            friendBtn = `<button class="btn btn-primary btn-sm" onclick="App.inboxAccept('${u.username}')">${Icon('check')} Accept</button>`;
          } else {
            friendBtn = `<button class="btn btn-ghost btn-sm" onclick="Profile.sendFriendRequest('${u.username}');App.renderInbox('brukere')">${Icon('users')} Add</button>`;
          }
          return `
            <div class="settings-row">
              <a href="#/u/${u.username}" style="display:flex;align-items:center;gap:0.75rem;text-decoration:none;color:inherit;flex:1;min-width:0">
                <div data-av-user="${u.username}" style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#22c55e,#16a34a);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.85rem;flex-shrink:0;overflow:hidden">${u.displayName.charAt(0).toUpperCase()}</div>
                <div>
                  <div style="font-weight:600;font-size:0.88rem">${u.displayName}</div>
                  <div style="font-size:0.75rem;color:var(--text2)">@${u.username}</div>
                </div>
              </a>
              <div style="display:flex;align-items:center;gap:0.5rem">
                <button class="btn btn-primary btn-sm" onclick="App.inviteToChat('${u.username}')">${Icon('mail')} Invite to chat</button>
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
                <div data-av-user="${r.from}" style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,var(--accent),#2563eb);display:flex;align-items:center;justify-content:center;font-weight:700;overflow:hidden">${requester.displayName.charAt(0).toUpperCase()}</div>
                <div>
                  <div style="font-weight:600">${requester.displayName}</div>
                  <div style="font-size:0.78rem;color:var(--text2)">@${r.from}</div>
                </div>
              </a>
              <div style="display:flex;gap:0.5rem">
                <button class="btn btn-primary btn-sm" onclick="App.inboxAccept('${r.from}')">${Icon('check')} Accept</button>
                <button class="btn btn-ghost btn-sm" onclick="App.inboxReject('${r.from}')">${Icon('x')} Decline</button>
              </div>
            </div>`;
        }).join('')
      : '<p style="color:var(--text3);font-size:0.85rem;padding:1rem 0">No friend requests.</p>';

    const tabs = [
      { id: 'samtaler',    label: `${Icon('message')} Conversations${convs.length ? ` (${convs.length})` : ''}` },
      { id: 'nychat',      label: '➕ New chat' },
      { id: 'brukere',     label: `${Icon('globe')} Users${allOtherUsers.length ? ` (${allOtherUsers.length})` : ''}` },
      { id: 'forsporsler', label: `${Icon('users')} Requests${pendingRequests.length ? ` (${pendingRequests.length})` : ''}` },
    ];

    const tabContentMap = {
      samtaler:    `<div class="settings-section"><div class="settings-section-header">${Icon('message')} Conversations</div><div class="settings-section-body">${samtaleRows}</div></div>`,
      nychat:      `<div class="settings-section"><div class="settings-section-header">${Icon('plus')} New chat</div><div class="settings-section-body">${nychatContent}</div></div>`,
      brukere:     `<div class="settings-section"><div class="settings-section-header">${Icon('globe')} All users</div><div class="settings-section-body">${brukereRows}</div></div>`,
      forsporsler: `<div class="settings-section"><div class="settings-section-header">${Icon('users')} Friend requests</div><div class="settings-section-body">${forsporslerRows}</div></div>`,
    };

    document.getElementById('app').innerHTML = `
      <div class="settings-page">
        <h1>${Icon('mail')} Inbox</h1>
        <div class="inbox-tabs">
          ${tabs.map(t => `<button class="inbox-tab-btn${activeTab === t.id ? ' active' : ''}" onclick="App.renderInbox('${t.id}')">${t.label}</button>`).join('')}
        </div>
        ${tabContentMap[activeTab] || tabContentMap.samtaler}
      </div>`;
    // Bytt initial-plassholderne i innboksradene ut med ekte profilbilder.
    if (window.Profile && Profile.hydrateAvatars) Profile.hydrateAvatars(document.getElementById('app'));
  }

  function startNewChat() {
    const userEl = document.getElementById('inbox-new-chat-user');
    const nameEl = document.getElementById('inbox-new-chat-name');
    if (!userEl || !userEl.value) { toast('Choose a user to start a chat with', 'error'); return; }
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
    btn.textContent = '⏳ Sent';
    btn.className = 'user-card-friend-btn user-card-friend-btn--pending';
    btn.onclick = null;
    toast(`Friend request sent to @${targetUsername}`, 'success');
    if (window.Notify) Notify.emit(targetUsername, { type: 'friend_request', from: current.username, fromDisplay: current.displayName, text: 'sent you a friend request', link: `#/u/${current.username}` });
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
    statusDiv.textContent = '✓ Friends';
    btn.replaceWith(statusDiv);
    if (window.Notify) Notify.emit(fromUsername, { type: 'friend_accept', from: current.username, fromDisplay: current.displayName, text: 'accepted your friend request', link: `#/u/${current.username}` });
    toast(`You're now friends with @${fromUsername}! ${Icon('party')}`, 'success');
    renderNav();
  }

  function inboxAccept(fromUsername) {
    const u = Auth.current();
    if (!u) return;
    Auth.acceptFriendRequest(u.username, fromUsername);
    renderNav();
    toast(`You're now friends with @${fromUsername}! ${Icon('party')}`, 'success');
    renderInbox('forsporsler');
  }

  function inboxReject(fromUsername) {
    const u = Auth.current();
    if (!u) return;
    Auth.rejectFriendRequest(u.username, fromUsername);
    toast('Declined', 'info');
    renderInbox('forsporsler');
  }

  function renderSettings() {
    const user = Auth.current();
    if (!user) { toast('Log in to see settings', 'error'); Router.go('/login'); return; }

    // Planlagt kansellering som har passert periodeslutt → nedgrader til Gratis
    // (webhooken gjør ikke dette automatisk, så vi sjekker klient-side).
    if (user.proCancelPending && user.proPeriodEnd && Date.now() > user.proPeriodEnd) {
      Auth.updateUser(user.username, { subscription: 'free', proCancelPending: false, proPeriodEnd: null });
      user.subscription = 'free'; user.proCancelPending = false; user.proPeriodEnd = null;
    }

    const isPro = user.subscription === 'pro';
    const filters = user.theme?.bgImageFilters || { brightness: 100, contrast: 100, saturation: 100, hue: 0 };

    document.getElementById('app').innerHTML = `
      <div class="settings-page-v2">
        <h1>${Icon('settings')} Settings</h1>

        <div class="settings-tabs">
          <button class="settings-tab-btn active" onclick="App.settingsTab('abonnement',this)">${Icon('star')} Subscription</button>
          <button class="settings-tab-btn" onclick="App.settingsTab('konto',this)">${Icon('user')} Account</button>
          <button class="settings-tab-btn" onclick="App.settingsTab('betaling',this)">${Icon('credit-card')} Payment</button>
          <button class="settings-tab-btn" onclick="App.settingsTab('minside',this)">${Icon('palette')} My Page</button>
          <button class="settings-tab-btn" onclick="App.settingsTab('ai',this)">${Icon('bot')} AI assistant</button>
          <button class="settings-tab-btn" onclick="App.settingsTab('konfig',this)">${Icon('wrench')} Configuration</button>
        </div>

        <!-- ══ ABONNEMENT ══ -->
        <div id="set-tab-abonnement" class="settings-tab-panel active">
          <div class="plan-cards">
            <div class="plan-card ${!isPro ? 'current-plan' : ''}">
              <div class="plan-card-name">${Icon('headphones')} Free</div>
              <div class="plan-card-price">0 kr / month</div>
              <ul class="plan-card-features">
                <li>Profile and avatar</li>
                <li>Radio and chat</li>
                <li>Music upload</li>
                <li>Public DJ mixes</li>
              </ul>
            </div>
            <div class="plan-card ${isPro ? 'current-plan' : ''}">
              <div class="plan-card-name">${Icon('star')} Pro</div>
              <div class="plan-card-price">from 108 kr / month</div>
              <ul class="plan-card-features">
                <li>Everything in Free</li>
                <li>DJ mixes over 3 hours (no limit)</li>
                <li>Private DJ mixes</li>
                <li>Pro badge + priority support</li>
              </ul>
              ${!isPro
                ? `<button class="btn btn-primary w-full" onclick="Payment.startCheckout('${user.username}')">Upgrade to Pro</button>
                   <a href="#/shop" class="shop-link-sm" style="text-align:center;width:100%;margin-top:0.6rem">See 1, 3, 6 and 12 months in Shop →</a>`
                : user.proCancelPending
                  ? `<div style="text-align:center;color:var(--text2);font-weight:600;margin-top:0.5rem">${Icon('clock')} Ends ${user.proPeriodEnd ? new Date(user.proPeriodEnd).toLocaleDateString('nb-NO') : 'at period end'}</div>
                     <button class="btn btn-ghost btn-sm w-full" style="margin-top:0.6rem" onclick="Payment.reactivateSubscription()">${Icon('repeat')} Undo – keep Pro</button>`
                  : `<div style="text-align:center;color:#7dd3fc;font-weight:700;margin-top:0.5rem">${Icon('check')} Active subscription</div>
                     <button class="btn btn-ghost btn-sm w-full" style="margin-top:0.75rem;color:var(--red)" onclick="Payment.cancelSubscription()">${Icon('x')} Cancel subscription</button>`}
            </div>
          </div>

          <div class="admin-contact-box">
            <div class="admin-icon">${Icon('message')}</div>
            <div>
              <div style="font-weight:700;margin-bottom:0.2rem">Contact admin</div>
              <div style="font-size:0.85rem;color:var(--text2)">Questions about subscription or payment? Get in touch: <a href="mailto:post@siriusfm.no">post@siriusfm.no</a></div>
            </div>
          </div>
        </div>

        <!-- ══ KONTO ══ -->
        <div id="set-tab-konto" class="settings-tab-panel">
          <div class="settings-section">
            <div class="settings-section-header">${Icon('user')} Account information</div>
            <div class="settings-section-body">
              <div class="settings-row">
                <div>
                  <div class="settings-row-label">Logged in as</div>
                  <div class="settings-row-hint">@${user.username} · ${user.email}</div>
                </div>
                <button class="btn btn-ghost btn-sm" onclick="App.logout()">Log out</button>
              </div>
              <div class="settings-row">
                <div>
                  <div class="settings-row-label">Email activation</div>
                  <div class="settings-row-hint">${user.activated ? '✅ Account is activated' : '⚠️ Not activated'}</div>
                </div>
                ${!user.activated
                  ? `<button class="btn btn-ghost btn-sm" id="resend-act-btn" onclick="App.resendActivation()">${Icon('mail')} Resend</button>`
                  : ''}
              </div>
            </div>
          </div>

          <div class="settings-section">
            <div class="settings-section-header">${Icon('wrench')} Admin — activation</div>
            <div class="settings-section-body">
              <p style="font-size:0.875rem;color:var(--text2);margin-bottom:1rem">
                Send an activation link to all users who aren't activated yet.<br>
                <span style="font-size:0.8rem;color:var(--text3)">Unactivated users: ${Object.values(Auth.getUsers()).filter(u => !u.activated).length}</span>
              </p>
              <button class="btn btn-ghost btn-sm" id="activate-all-btn" onclick="App.sendActivationToAll()">${Icon('mail')} Send to all unactivated</button>
              <span id="activate-all-result" style="font-size:0.8rem;margin-left:0.75rem;color:var(--text2)"></span>
            </div>
          </div>

          <div class="settings-section">
            <div class="settings-section-header">${Icon('lock')} Password</div>
            <div class="settings-section-body">
              <p style="font-size:0.875rem;color:var(--text2);margin-bottom:1rem">Send a reset link to <strong>${user.email}</strong></p>
              <button class="btn btn-ghost btn-sm" id="send-reset-btn" onclick="App.sendPasswordResetFromSettings()">${Icon('key')} Send reset link</button>
              <span id="reset-result" style="font-size:0.8rem;margin-left:0.75rem"></span>
            </div>
          </div>

          <div class="settings-section">
            <div class="settings-section-header">${Icon('smartphone')} QR code login</div>
            <div class="settings-section-body">
              <p style="font-size:0.875rem;color:var(--text2);margin-bottom:1rem">
                Scan the QR code with your phone or tablet to log in automatically as <strong>@${user.username}</strong>.
                <br><span style="font-size:0.8rem;color:var(--text3)">The code is valid for 15 minutes.</span>
              </p>
              <button class="btn btn-primary btn-sm" onclick="App.generateQRLogin()">${Icon('share')} Generate QR code</button>
              <div id="qr-login-box" style="display:none;margin-top:1.25rem">
                <div style="background:#fff;display:inline-block;padding:1rem;border-radius:12px">
                  <canvas id="qr-login-canvas"></canvas>
                </div>
                <div style="font-size:0.8rem;color:var(--text3);margin-top:0.5rem" id="qr-login-expiry"></div>
              </div>
            </div>
          </div>

          <div class="settings-section">
            <div class="settings-section-header" style="color:var(--red)">${Icon('alert')} Danger zone</div>
            <div class="settings-section-body">
              <div class="danger-zone">
                <div class="danger-zone-title">Delete profile</div>
                <p style="font-size:0.82rem;color:var(--text2);margin-bottom:0.75rem">This permanently deletes your account. The action cannot be undone.</p>
                <button class="btn btn-danger btn-sm" onclick="App.confirmDeleteAccount()">${Icon('trash')} Delete my profile</button>
              </div>
            </div>
          </div>
        </div>

        <!-- ══ BETALING ══ -->
        <div id="set-tab-betaling" class="settings-tab-panel">
          <div class="settings-section">
            <div class="settings-section-header">${Icon('credit-card')} Payment method</div>
            <div class="settings-section-body">
              <p style="font-size:0.875rem;color:var(--text2);margin-bottom:1rem">Choose your preferred payment method for subscriptions. Actual payment is processed securely via Stripe.</p>
              <div class="payment-methods">
                <div class="payment-method-btn ${(user.paymentMethod || 'card') === 'card' ? 'selected' : ''}" onclick="App.selectPaymentMethod('card',this)">
                  <div class="pm-icon">${Icon('credit-card')}</div>
                  <div class="pm-label">Bank card</div>
                </div>
                <div class="payment-method-btn ${user.paymentMethod === 'paypal' ? 'selected' : ''}" onclick="App.selectPaymentMethod('paypal',this)">
                  <div class="pm-icon">${Icon('credit-card')}</div>
                  <div class="pm-label">PayPal</div>
                </div>
              </div>
              <div id="set-card-fields" style="${(user.paymentMethod || 'card') !== 'card' ? 'display:none' : ''}">
                <div class="form-group">
                  <label class="form-label">Cardholder</label>
                  <input class="form-input" id="set-card-name" placeholder="Full name" value="${user.cardName || ''}">
                </div>
                <div class="form-row" style="display:flex;gap:0.75rem;flex-wrap:wrap">
                  <div class="form-group" style="flex:1;min-width:140px">
                    <label class="form-label">Card number (not stored, reference only)</label>
                    <input class="form-input" id="set-card-number" placeholder="1234 5678 9012 3456" maxlength="19" inputmode="numeric" autocomplete="off" oninput="App.formatCardNumber(this)" value="${user.cardLast4 ? '•••• •••• •••• ' + user.cardLast4 : ''}">
                  </div>
                  <div class="form-group" style="flex:0 0 130px">
                    <label class="form-label">Expiry date</label>
                    <input class="form-input" id="set-card-expiry" placeholder="MM/YY" maxlength="5" inputmode="numeric" oninput="App.formatCardExpiry(this)" value="${user.cardExpiry || ''}">
                  </div>
                </div>
                <div class="form-group" style="max-width:130px">
                  <label class="form-label">CVC</label>
                  <input class="form-input" id="set-card-cvc" placeholder="3 digits" maxlength="4" inputmode="numeric" autocomplete="off" value="">
                  <div style="font-size:0.7rem;color:var(--text2);margin-top:0.25rem">Never stored – only for payment via Stripe.</div>
                </div>
                ${(user.cardLast4 || user.cardName) ? `
                <div id="set-saved-card" style="display:flex;align-items:center;gap:0.5rem;margin-top:0.25rem;padding-top:0.5rem;border-top:1px solid var(--border)">
                  <span style="font-size:0.8rem;color:var(--text2)">${Icon('credit-card')} Saved card${user.cardLast4 ? ` •••• ${user.cardLast4}` : ''}</span>
                  <button class="btn btn-ghost btn-sm" style="color:var(--red)" onclick="App.removeCard()">${Icon('trash')} Remove card</button>
                </div>` : ''}
              </div>
              <div id="set-paypal-fields" style="${user.paymentMethod !== 'paypal' ? 'display:none' : ''}">
                <div class="form-group">
                  <label class="form-label">PayPal email</label>
                  <input class="form-input" id="set-paypal-email" type="email" placeholder="you@paypal.com" value="${user.paypalEmail || ''}">
                </div>
              </div>
              <div style="display:flex;gap:0.5rem;flex-wrap:wrap;align-items:center;margin-top:0.5rem">
                <button class="btn btn-primary btn-sm" onclick="App.savePaymentMethod()">${Icon('save')} Save payment info</button>
                ${!isPro ? `<button class="btn btn-gold btn-sm" onclick="Payment.startCheckout('${user.username}')">${Icon('credit-card')} Pay now with Stripe</button>` : ''}
              </div>
            </div>
          </div>

          ${isPro ? `
          <div class="settings-section">
            <div class="settings-section-header">${Icon('clipboard')} Subscription status</div>
            <div class="settings-section-body">
              <div class="settings-row">
                <div><div class="settings-row-label">Plan</div><div class="settings-row-hint">Pro</div></div>
                <span style="color:#7dd3fc;font-weight:700">${Icon('check')} Active</span>
              </div>
              <div class="settings-row">
                <div><div class="settings-row-label">Questions about your invoice?</div></div>
                <a href="mailto:post@siriusfm.no" class="btn btn-ghost btn-sm">Contact admin</a>
              </div>
            </div>
          </div>` : ''}
        </div>

        <!-- ══ MIN SIDE ══ -->
        <div id="set-tab-minside" class="settings-tab-panel">
          <div class="settings-section">
            <div class="settings-section-header">${Icon('image')} Background image</div>
            <div class="settings-section-body">
              <p style="font-size:0.85rem;color:var(--text2);margin-bottom:1rem">Upload an image shown in the background across the whole site.</p>
              <button class="btn btn-ghost btn-sm" onclick="document.getElementById('bg-file-input').click()">${Icon('camera')} Upload background image</button>
              <div style="margin-top:1.25rem">
                <div style="font-size:0.82rem;font-weight:700;color:var(--text2);margin-bottom:0.5rem">Psychedelic effect</div>
                <div class="effect-grid">
                  <button class="effect-btn" data-effect="psychedelic" onclick="BgManager.setEffect('psychedelic')">${Icon('wind')} Psychedelic</button>
                  <button class="effect-btn" data-effect="acid" onclick="BgManager.setEffect('acid')">${Icon('zap')} Acid</button>
                  <button class="effect-btn" data-effect="space" onclick="BgManager.setEffect('space')">${Icon('rocket')} Space</button>
                  <button class="effect-btn" data-effect="chill" onclick="BgManager.setEffect('chill')">${Icon('leaf')} Chill</button>
                </div>
              </div>
              <div style="margin-top:1.25rem">
                <div style="font-size:0.82rem;font-weight:700;color:var(--text2);margin-bottom:0.5rem">Particles</div>
                <div class="particle-grid">
                  <button class="particle-btn" data-pstyle="stars" onclick="BgManager.setParticleStyle('stars')">${Icon('sparkles')} Stars</button>
                  <button class="particle-btn" data-pstyle="bubbles" onclick="BgManager.setParticleStyle('bubbles')">${Icon('droplet')} Bubbles</button>
                  <button class="particle-btn" data-pstyle="sparks" onclick="BgManager.setParticleStyle('sparks')">${Icon('zap')} Sparks</button>
                  <button class="particle-btn" data-pstyle="aurora" onclick="BgManager.setParticleStyle('aurora')">${Icon('sparkles')} Aurora</button>
                  <button class="particle-btn" data-pstyle="none" onclick="BgManager.setParticleStyle('none')">${Icon('x')} None</button>
                </div>
              </div>
            </div>
          </div>

          <div class="settings-section">
            <div class="settings-section-header">${Icon('sliders')} Image adjustments</div>
            <div class="settings-section-body">
              <div class="filter-sliders">
                <div class="filter-row">
                  <label>Brightness</label>
                  <input type="range" min="20" max="200" value="${filters.brightness}" oninput="App.liveFilter('brightness',this.value)">
                  <span class="filter-val" id="fv-brightness">${filters.brightness}%</span>
                </div>
                <div class="filter-row">
                  <label>Contrast</label>
                  <input type="range" min="20" max="200" value="${filters.contrast}" oninput="App.liveFilter('contrast',this.value)">
                  <span class="filter-val" id="fv-contrast">${filters.contrast}%</span>
                </div>
                <div class="filter-row">
                  <label>Saturation</label>
                  <input type="range" min="0" max="300" value="${filters.saturation}" oninput="App.liveFilter('saturation',this.value)">
                  <span class="filter-val" id="fv-saturation">${filters.saturation}%</span>
                </div>
                <div class="filter-row">
                  <label>Hue</label>
                  <input type="range" min="0" max="360" value="${filters.hue}" oninput="App.liveFilter('hue',this.value)">
                  <span class="filter-val" id="fv-hue">${filters.hue}°</span>
                </div>
              </div>
              <div style="margin-top:1.25rem">
                <div style="font-size:0.82rem;font-weight:700;color:var(--text2);margin-bottom:0.5rem">Quick presets</div>
                <div class="preset-grid">
                  <button class="preset-btn" onclick="App.applyFilterPreset('normal')">${Icon('palette')} Normal</button>
                  <button class="preset-btn" onclick="App.applyFilterPreset('bw')">${Icon('square')} Black/white</button>
                  <button class="preset-btn" onclick="App.applyFilterPreset('lys')">${Icon('sun')} Light</button>
                  <button class="preset-btn" onclick="App.applyFilterPreset('mork')">${Icon('moon')} Dark</button>
                  <button class="preset-btn" onclick="App.applyFilterPreset('vibrant')">${Icon('rainbow')} Vibrant</button>
                  <button class="preset-btn" onclick="App.applyFilterPreset('cool')">${Icon('snowflake')} Cool</button>
                  <button class="preset-btn" onclick="App.applyFilterPreset('warm')">${Icon('flame')} Warm</button>
                </div>
              </div>
              <button class="btn btn-primary btn-sm" style="margin-top:1rem" onclick="App.saveFilterSettings()">${Icon('save')} Save adjustments</button>
            </div>
          </div>

          <div class="settings-section">
            <div class="settings-section-header">${Icon('edit')} Page texts</div>
            <div class="settings-section-body">
              <div class="form-group">
                <label class="form-label">Bio / Description</label>
                <textarea class="form-input" id="set-bio" rows="3" placeholder="Tell us something about yourself…">${user.bio || ''}</textarea>
              </div>
              <div class="form-group">
                <label class="form-label">Profile links (one per line, format: Text|URL)</label>
                <textarea class="form-input" id="set-links" rows="3" placeholder="SoundCloud|https://soundcloud.com/you">${(user.links || []).map(l => l.label + '|' + l.url).join('\n')}</textarea>
              </div>
              <button class="btn btn-primary btn-sm" onclick="App.savePageTexts()">${Icon('save')} Save texts</button>
            </div>
          </div>
        </div>

        <!-- ══ AI ASSISTENT ══ -->
        <div id="set-tab-ai" class="settings-tab-panel">
          <div class="settings-section">
            <div class="settings-section-header">${Icon('bot')} Core — AI assistant</div>
            <div class="set-ai-chat">
              <div class="set-ai-messages" id="set-ai-msgs">
                <div class="set-ai-msg bot">Hi! My name is Core and I'm your AI assistant on SiriusFM. I can help you find radio channels, customize your profile, answer questions about the site — or just chat about music. What are you wondering about? ${Icon('music')}</div>
              </div>
              <div class="set-ai-input-row">
                <input class="form-input" id="set-ai-input" placeholder="Write a message…" onkeydown="if(event.key==='Enter')App.sendAiMessage()">
                <button class="btn btn-primary btn-sm" onclick="App.sendAiMessage()">Send</button>
              </div>
            </div>
            ${!AI.hasKey() ? `<p style="font-size:0.8rem;color:var(--text3);padding:0.75rem 1rem">${Icon('info')} Enter a Claude API key in the Configuration tab to enable the AI assistant.</p>` : ''}
          </div>
        </div>

        <!-- ══ KONFIGURASJON ══ -->
        <div id="set-tab-konfig" class="settings-tab-panel">
          <div class="settings-section">
            <div class="settings-section-header">${Icon('bot')} AI integration (Claude API)</div>
            <div class="settings-section-body">
              <p class="text-muted text-sm" style="margin-bottom:1rem">
                ${Icon('check-circle')} The AI features (the Core assistant, bio generator, color suggestions) now run via the server — you don't need to enter your own key. The field below is optional and is only used if you want to override with your own Claude key.
              </p>
              <div class="form-group">
                <label class="form-label">Claude (Anthropic) API key</label>
                <div class="api-key-field input-group">
                  <input class="form-input" id="set-anthropic-key" type="password" placeholder="sk-ant-…" value="${CONFIG.ANTHROPIC_API_KEY}">
                  <button class="api-key-toggle" onclick="togglePassword('set-anthropic-key',this)">${Icon('eye')}</button>
                </div>
              </div>
            </div>
          </div>

          <div class="settings-section">
            <div class="settings-section-header">${Icon('mail')} Email (EmailJS)</div>
            <div class="settings-section-body">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem;flex-wrap:wrap;gap:0.5rem">
                <p class="text-muted text-sm" style="margin:0">
                  Configure EmailJS for activation and reset links.
                  <a href="https://www.emailjs.com" target="_blank" style="color:#38bdf8">Create account ${Icon('arrow-right')}</a>
                </p>
                <span id="ejs-status-badge" style="font-size:0.78rem;font-weight:600;padding:0.25rem 0.65rem;border-radius:999px;background:${Email.isConfigured() ? 'rgba(34,197,94,0.15)' : 'rgba(251,191,36,0.15)'};color:${Email.isConfigured() ? '#4ade80' : '#fbbf24'}">
                  ${Email.isConfigured() ? '✅ Configured' : '⚠️ Not configured'}
                </span>
              </div>
              <div class="form-group">
                <label class="form-label">Service ID</label>
                <input class="form-input" id="set-ejs-service" placeholder="service_xxxxxxx" value="${CONFIG.EMAILJS_SERVICE_ID}">
              </div>
              <div class="form-group">
                <label class="form-label">Activation template ID</label>
                <input class="form-input" id="set-ejs-tmpl-act" placeholder="template_xxxxxxx" value="${CONFIG.EMAILJS_TEMPLATE_ACTIVATION}">
                <span class="form-hint">Variables: <code>{{to_email}}</code> <code>{{to_name}}</code> <code>{{activate_url}}</code></span>
              </div>
              <div class="form-group">
                <label class="form-label">Reset template ID</label>
                <input class="form-input" id="set-ejs-tmpl-rst" placeholder="template_xxxxxxx" value="${CONFIG.EMAILJS_TEMPLATE_RESET}">
                <span class="form-hint">Variables: <code>{{to_email}}</code> <code>{{to_name}}</code> <code>{{reset_url}}</code></span>
              </div>
              <div class="form-group">
                <label class="form-label">Message notification template ID <span style="font-size:0.75rem;color:var(--text3)">(optional)</span></label>
                <input class="form-input" id="set-ejs-tmpl-msg" placeholder="template_xxxxxxx" value="${CONFIG.EMAILJS_TEMPLATE_MESSAGE}">
                <span class="form-hint">Variables: <code>{{to_email}}</code> <code>{{to_name}}</code> <code>{{from_name}}</code> <code>{{message_preview}}</code> <code>{{inbox_url}}</code></span>
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
                  ${Icon('mail')} Send test email to ${Auth.current().email}
                </button>
                <span id="ejs-test-result" style="font-size:0.8rem;margin-left:0.75rem"></span>
              </div>` : ''}
            </div>
          </div>

          <div style="display:flex;gap:0.75rem;margin-top:1.5rem">
            <button class="btn btn-primary" onclick="App.saveSettings()">${Icon('save')} Save configuration</button>
            <a href="#/" class="btn btn-ghost">${Icon('arrow-left')} Home</a>
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
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Sending…'; }

    const users = Auth.getUsers();
    const u = users[user.username];
    if (!u) return;

    if (!u.activationToken) {
      const token = Array.from(crypto.getRandomValues(new Uint8Array(40))).map(b => b.toString(16).padStart(2,'0')).join('');
      u.activationToken = token;
      Auth.updateUser(user.username, { activationToken: token });
    }

    const res = await Email.sendActivation(user.email, user.username, u.activationToken);
    if (btn) { btn.disabled = false; btn.textContent = '📧 Resend'; }
    toast(res.error ? 'Error: ' + res.error : 'Activation link sent! 📧', res.error ? 'error' : 'success');
  }

  async function sendActivationToAll() {
    const btn = document.getElementById('activate-all-btn');
    const result = document.getElementById('activate-all-result');
    const allUsers = Object.values(Auth.getUsers()).filter(u => !u.activated);

    if (!allUsers.length) {
      if (result) result.textContent = 'All users are already activated.';
      return;
    }

    if (btn) { btn.disabled = true; btn.textContent = '⏳ Sending…'; }
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

    if (btn) { btn.disabled = false; btn.textContent = '📧 Send to all unactivated'; }
    if (result) result.textContent = `Sent: ${sent}, Failed: ${failed}`;
    toast(`Activation links sent to ${sent} user${sent !== 1 ? 's' : ''}.`, sent ? 'success' : 'error');
  }

  async function sendPasswordResetFromSettings() {
    const user = Auth.current();
    if (!user) return;
    const btn    = document.getElementById('send-reset-btn');
    const result = document.getElementById('reset-result');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Sending…'; }

    const res = Auth.forgotPassword(user.email);
    if (res.error) {
      if (btn) { btn.disabled = false; btn.textContent = '🔑 Send reset link'; }
      toast(res.error, 'error'); return;
    }

    const emailRes = await Email.sendPasswordReset(user.email, res.username, res.token);
    if (btn) { btn.disabled = false; btn.textContent = '🔑 Send reset link'; }
    if (result) {
      result.textContent = emailRes.error ? '❌ ' + emailRes.error : '✅ Sent!';
      result.style.color = emailRes.error ? '#f87171' : '#4ade80';
    }
  }

  function confirmDeleteAccount() {
    const user = Auth.current();
    if (!user) return;
    const box = document.getElementById('modal-box');
    if (!box) return;
    box.innerHTML = `
      <div class="modal-header"><h2>${Icon('trash')} Delete profile</h2></div>
      <div style="padding:1.25rem">
        <p style="margin-bottom:1rem;color:var(--text2)">Are you sure you want to delete the account <strong>@${user.username}</strong>? This cannot be undone.</p>
        <div style="display:flex;gap:0.75rem">
          <button class="btn btn-danger" onclick="App.deleteAccount()">Yes, delete the account</button>
          <button class="btn btn-ghost" onclick="App.closeModal()">Cancel</button>
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
    toast('The account has been deleted.', 'info');
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
      data.cardName   = document.getElementById('set-card-name')?.value?.trim() || '';
      // Kun de 4 siste sifrene beholdes som referanse — hele kortnummeret lagres ALDRI (PCI/Stripe).
      data.cardLast4  = document.getElementById('set-card-number')?.value?.replace(/\D/g,'').slice(-4) || '';
      data.cardExpiry = document.getElementById('set-card-expiry')?.value?.trim() || '';
      // CVC lagres BEVISST aldri (PCI/Stripe-regler). Ikke legg til data.cardCvc her.
    } else if (method === 'paypal') {
      data.paypalEmail = document.getElementById('set-paypal-email')?.value?.trim() || '';
    }
    Auth.updateUser(user.username, data);
    toast('Payment info saved ✓', 'success');
  }

  // Fjern lagret kort (tømmer kun referanse-data; CVC er aldri lagret)
  function removeCard() {
    const user = Auth.current();
    if (!user) return;
    if (!confirm('Remove saved card?')) return;
    Auth.updateUser(user.username, { cardName: '', cardLast4: '', cardExpiry: '' });
    // Oppdater DOM direkte så brukeren blir stående på Betaling-fanen
    document.getElementById('set-saved-card')?.remove();
    ['set-card-name', 'set-card-number', 'set-card-expiry', 'set-card-cvc'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    toast('Card removed ✓', 'success');
  }

  // Grupper kortnummer i blokker på 4 (maks 16 sifre) mens man skriver
  function formatCardNumber(el) {
    const v = el.value.replace(/\D/g, '').slice(0, 16);
    el.value = v.replace(/(.{4})/g, '$1 ').trim();
  }

  // Auto-format utløpsdato som MM/ÅÅ mens man skriver
  function formatCardExpiry(el) {
    let v = el.value.replace(/\D/g, '').slice(0, 4);
    if (v.length >= 3) v = v.slice(0, 2) + '/' + v.slice(2);
    el.value = v;
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
    toast('Adjustments saved ✓', 'success');
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
    toast('Texts saved ✓', 'success');
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
    typingEl.textContent = 'Typing…';
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
        ? 'Enter an API key in the Configuration tab to use the AI assistant.'
        : 'Sorry, something went wrong. Try again.';
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
    toast('Configuration saved! ✓', 'success');

    const badge = document.getElementById('ejs-status-badge');
    if (badge) {
      const ok = Email.isConfigured();
      badge.textContent = ok ? '✅ Configured' : '⚠️ Not configured';
      badge.style.background = ok ? 'rgba(34,197,94,0.15)' : 'rgba(251,191,36,0.15)';
      badge.style.color = ok ? '#4ade80' : '#fbbf24';
    }
  }

  async function testEmailJS() {
    const user = Auth.current();
    if (!user) return;
    const btn    = document.getElementById('ejs-test-btn');
    const result = document.getElementById('ejs-test-result');
    if (btn) { btn.disabled = true; btn.textContent = '⏳ Sending…'; }
    if (result) result.textContent = '';

    const res = await Email.sendTestEmail(user.email, user.username);

    if (btn) { btn.disabled = false; btn.textContent = `${Icon('mail')} Send test email to ${user.email}`; }
    if (result) {
      result.textContent = res.success ? '✅ Sent!' : `${Icon('x')} ${res.error}`;
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

    // Avstem Pro-status mot Stripe (fanger opp abonnement kansellert/utløpt utenfor appen)
    Payment.reconcileSubscription().catch(() => {});

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
      if (!Auth.current()) { toast('Log in to edit', 'error'); Router.go('/login'); return; }
      Profile.renderEditor();
    });
    Router.define('/inbox',              () => renderInbox());
    Router.define('/settings',           () => renderSettings());
    Router.define('/shop',                () => renderShop());
    Router.define('/share',              () => { if (window.ShareMusic) ShareMusic.render(); });
    Router.define('/radio',              () => Radio.render());
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
    Router.define('/grupper',            () => { if (window.Groups) Groups.render(); });
    Router.define('/friends',            () => { if (window.Friends) Friends.render(); });
    Router.define('/unsubscribe',        () => { if (window.Unsubscribe) Unsubscribe.render(); });
    Router.define('/unsubscribe/:email', ({ email }) => { if (window.Unsubscribe) Unsubscribe.render(email); });
    Router.define('/studio',             () => {
      if (!Auth.current()) { toast('Log in to use Studio', 'error'); Router.go('/login'); return; }
      Studio.render();
    });
    Router.define('/messages/:username', ({ username }) => {
      if (!Auth.current()) { toast('Log in to send messages', 'error'); Router.go('/login'); return; }
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
        <h2 class="bg-notice-title">Did you know you can customize your profile?</h2>
        <p class="bg-notice-body">
          This is what visitors see on <strong>your front page view</strong>.<br>
          You can choose between <em>image, video, music visualizer</em> and psychedelic effects as background.<br>
          Make your profile unique — exactly the way you want!
        </p>
        <div class="bg-notice-preview">
          <canvas id="bg-notice-canvas" width="320" height="80"></canvas>
        </div>
        <div class="bg-notice-actions">
          <button class="btn btn-primary" onclick="Router.go('/edit');document.getElementById('bg-profile-notice-overlay')?.remove()">${Icon('edit')} Customize background now</button>
          <button class="btn btn-ghost" onclick="document.getElementById('bg-profile-notice-overlay')?.remove()">Maybe later</button>
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
    // Plateselskap-kontoer får et eget felt for utgivernavnet.
    const lg = document.getElementById('reg-label-group');
    if (lg) lg.style.display = value === 'plateselskap' ? '' : 'none';
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
    // UTF-8-trygg base64 — rå btoa() kastar på teikn > U+00FF (emoji/CJK i visningsnamn).
    const token = btoa(unescape(encodeURIComponent(payload))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    const base  = window.location.href.split('#')[0];
    const url   = `${base}#/qr-login/${token}`;

    const canvas = document.getElementById('qr-login-canvas');
    if (!canvas || typeof QRCode === 'undefined') {
      toast('The QR library isn\'t loaded. Try again.', 'error');
      return;
    }

    QRCode.toCanvas(canvas, url, { width: 220, margin: 1, color: { dark: '#000000', light: '#ffffff' } }, err => {
      if (err) { toast('Could not generate QR code', 'error'); return; }
    });

    document.getElementById('qr-login-box').style.display = 'block';

    clearInterval(_qrCountdown);
    let remaining = 15 * 60;
    const expiryEl = document.getElementById('qr-login-expiry');
    _qrCountdown = setInterval(() => {
      remaining--;
      const m = Math.floor(remaining / 60);
      const s = remaining % 60;
      if (expiryEl) expiryEl.textContent = `Expires in ${m}:${s.toString().padStart(2, '0')}`;
      if (remaining <= 0) {
        clearInterval(_qrCountdown);
        const box = document.getElementById('qr-login-box');
        if (box) box.style.display = 'none';
        toast('The QR code has expired. Generate a new one.', 'info');
      }
    }, 1000);
  }

  function renderQRLogin(token) {
    let payload;
    try {
      const padded = token.replace(/-/g, '+').replace(/_/g, '/');
      const pad4   = padded + '==='.slice((padded.length + 3) % 4);
      payload = JSON.parse(decodeURIComponent(escape(atob(pad4))));   // invers av UTF-8-trygg base64
    } catch {
      document.getElementById('app').innerHTML = `
        <div class="empty-state" style="padding:8rem">
          <div class="empty-icon">${Icon('x')}</div>
          <p style="font-size:1.1rem;font-weight:600">Invalid QR code</p>
          <a href="#/" class="btn btn-primary" style="margin-top:1.5rem;display:inline-flex">${Icon('arrow-left')} Home</a>
        </div>`;
      return;
    }

    if (Date.now() > payload.exp) {
      document.getElementById('app').innerHTML = `
        <div class="empty-state" style="padding:8rem">
          <div class="empty-icon">${Icon('hourglass')}</div>
          <p style="font-size:1.1rem;font-weight:600">The QR code has expired</p>
          <p style="color:var(--text2)">Log in on another device and generate a new code.</p>
          <a href="#/login" class="btn btn-primary" style="margin-top:1.5rem;display:inline-flex">Log in manually</a>
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
          <a href="#/login" class="btn btn-primary" style="margin-top:1.5rem;display:inline-flex">Log in manually</a>
        </div>`;
      return;
    }

    renderNav();
    toast(`Welcome back, ${result.user.displayName}! ${Icon('party')}`, 'success', 4000);
    Router.go('/');
  }

  // ════════════════════════════════════════════════════════════════════
  //  Shop — produktbutikk. Flere produkter kommer hit etter hvert.
  // ════════════════════════════════════════════════════════════════════
  // Abonnementsplaner — display-side. Autoritative beløp ligger i api/create-checkout.js (PLANS).
  const SHOP_PLANS = [
    { key: 'monthly', name: '1 month',    months:  1, total: '149 kr',   per: '149 kr / mo', save: null,        best: false },
    { key: 'quarter', name: '3 months',   months:  3, total: '399 kr',   per: '133 kr / mo', save: 'Save 11%',  best: false },
    { key: 'half',    name: '6 months',   months:  6, total: '749 kr',   per: '125 kr / mo', save: 'Save 16%',  best: false },
    { key: 'year',    name: '12 months',  months: 12, total: '1 290 kr', per: '108 kr / mo', save: 'Save 28%',  best: true  },
  ];

  // Pro-fordeler — vist i skjerm-kvittering (Payment.showReceipt) og Shop. Speilar api/_plans.js PRO_BENEFITS.
  const PRO_BENEFITS = [
    'DJ mixes over 3 hours (up to 20 h)',
    'Private / public visibility on mixes',
    'Pro badge on your profile',
    'Unlimited storage',
    'Priority support',
  ];

  // Månedens tilbud — roterer automatisk per kalendermåned. Rent display/markedsføring:
  // framhever én plan med et tema, men endrer ALDRI pris (autoritativ pris i api/create-checkout.js).
  // Indeks = måned (0 = januar … 11 = desember). Desember = eget juletilbud (holiday: true).
  const SHOP_OFFERS = [
    { icon: 'sparkles',   emoji: '✨', title: 'New year, new sound',  tag: 'Start the year with Pro — 12 months full access.',       feature: 'year'    },
    { icon: 'headphones', emoji: '🎧', title: 'Winter listening',     tag: 'Long mixes for cold evenings — 6 months extra value.',   feature: 'half'    },
    { icon: 'leaf',       emoji: '🌱', title: 'Spring release',       tag: 'A fresh start to the season — try 3 months of Pro.',     feature: 'quarter' },
    { icon: 'sliders',    emoji: '🎛️', title: 'Studio month',         tag: 'Produce more — 6 months of unlimited storage.',          feature: 'half'    },
    { icon: 'ticket',     emoji: '🎟️', title: 'Festival warm-up',      tag: 'Ready for summer — 12 months at the best price.',        feature: 'year'    },
    { icon: 'sun',        emoji: '☀️', title: 'Summer start',         tag: 'Long sets all summer — 6 months of Pro.',                feature: 'half'    },
    { icon: 'music',      emoji: '🌞', title: 'Summer mix',           tag: 'Mixes with no length limit — a full year of Pro.',       feature: 'year'    },
    { icon: 'flame',      emoji: '🔥', title: 'Festival peak',        tag: 'Ozora season — try 3 months and share your set.',        feature: 'quarter' },
    { icon: 'feather',    emoji: '🍂', title: 'Autumn comeback',      tag: 'Back in the studio — 6 months full access.',             feature: 'half'    },
    { icon: 'moon',       emoji: '🌙', title: 'Polar night listening', tag: 'Deep ambient mixes — 6 months extra value.',            feature: 'half'    },
    { icon: 'tag',        emoji: '🏷️', title: 'Autumn offer',         tag: 'Best value before the holidays — 12 months of Pro.',     feature: 'year'    },
    { icon: 'snowflake',  emoji: '🎄', title: 'Holiday offer',        tag: 'Give yourself a whole year of Pro — just 108 kr/mo.',     feature: 'year', holiday: true },
  ];

  // Tilbudet for inneværende kalendermåned (lokal tid).
  function currentShopOffer() {
    return SHOP_OFFERS[new Date().getMonth()] || SHOP_OFFERS[0];
  }

  // Eksterne lenker — kjøp & oppdag musikk og festivalar utanfor SiriusFM.
  const SHOP_LINKS = [
    { icon: 'cart',       name: 'Bandcamp',        desc: 'Buy music directly from artists',      url: 'https://bandcamp.com/' },
    { icon: 'music',      name: 'iTunes',          desc: 'Apple\'s music store',                 url: 'https://www.apple.com/itunes/' },
    { icon: 'leaf',       name: 'Ektoplazm',       desc: 'Free psytrance & netlabel music',      url: 'https://ektoplazm.com/' },
    { icon: 'headphones', name: 'Spotify',         desc: 'Listen to a featured track',           url: 'https://open.spotify.com/track/2o6rVUDhwHEUDUTsB9Rmo0' },
    { icon: 'tv',         name: 'Trancentral',     desc: 'Psytrance culture, news & video',      url: 'https://trancentral.tv/' },
    { icon: 'globe',      name: 'Goabase',         desc: 'Worldwide party database',             url: 'https://www.goabase.net/' },
    { icon: 'ticket',     name: 'Ozora Festival',  desc: 'Register for a 2026 ticket',           url: 'https://ticket.ozorafestival.eu/register?flag=HU&event_code=OZ&year=26' },
  ];

  function renderShop() {
    const user  = Auth.current();
    const isPro = user?.subscription === 'pro';
    const uname = user?.username || '';
    const offer = currentShopOffer();

    const planCard = (p) => {
      let action;
      if (isPro)       action = `<button class="btn btn-ghost w-full" disabled style="margin-top:auto">${Icon('check')} You have Pro</button>`;
      else if (uname)  action = `<button class="btn btn-gold w-full" style="margin-top:auto" onclick="Payment.startCheckout('${uname}','${p.key}')">${Icon('credit-card')} Buy</button>`;
      else             action = `<button class="btn btn-gold w-full" style="margin-top:auto" onclick="Router.go('/login')">${Icon('log-in')} Log in to buy</button>`;
      const featured = p.key === offer.feature;
      const ribbon   = featured
        ? `<span class="shop-offer-ribbon${offer.holiday ? ' shop-offer-ribbon--holiday' : ''}">${offer.emoji} ${offer.holiday ? 'Holiday offer' : 'Offer of the month'}</span>`
        : '';
      return `
        <div class="shop-card shop-plan${p.best ? ' shop-plan--best' : ''}${featured ? ' shop-plan--offer' : ''}${featured && offer.holiday ? ' shop-plan--holiday' : ''}">
          ${ribbon}
          ${p.best ? `<span class="shop-badge shop-badge-free">${Icon('star')} Best value</span>` : ''}
          <div class="shop-plan-period">Pro · recurring</div>
          <h2>${p.name}</h2>
          <div class="shop-card-price">${p.total}</div>
          <div class="shop-plan-per">${p.per}${p.save ? ` · <strong class="shop-save">${p.save}</strong>` : ''}</div>
          ${action}
        </div>`;
    };

    document.getElementById('app').innerHTML = `
      <div class="shop-page">
        <h1>${Icon('store')} Shop</h1>
        <p class="shop-sub">SiriusFM Pro — unlock everything. Choose the period that suits you. All subscriptions are recurring and can be cancelled anytime.</p>

        <div class="shop-offer-banner${offer.holiday ? ' shop-offer-banner--holiday' : ''}">
          <span class="shop-offer-banner-icon">${Icon(offer.icon)}</span>
          <div class="shop-offer-banner-text">
            <strong>${offer.emoji} ${offer.holiday ? 'Holiday offer' : 'Offer of the month'} · ${offer.title}</strong>
            <span>${offer.tag}</span>
          </div>
        </div>

        ${isPro ? `<div class="shop-launch-banner">${Icon('check')} <strong>You have Pro active.</strong> Thanks for the support! ${Icon('sliders')}</div>` : ''}

        <div class="shop-pro-feats">
          <div class="shop-pro-feat">${Icon('sliders')} DJ mixes over 3 hours (no limit)</div>
          <div class="shop-pro-feat">${Icon('lock')} Private / public visibility</div>
          <div class="shop-pro-feat">${Icon('star')} Pro badge on your profile</div>
          <div class="shop-pro-feat">${Icon('cloud')} Unlimited storage + priority support</div>
        </div>

        <div class="shop-grid">
          ${SHOP_PLANS.map(planCard).join('')}
        </div>

        <h2 class="shop-links-title">${Icon('link')} Buy & discover music</h2>
        <p class="shop-sub">External platforms to buy, listen and find festivals.</p>
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
          Secure payment via Stripe. Free accounts can upload DJ mixes up to 3 hours.
          Questions about subscription? <a href="mailto:post@siriusfm.no">post@siriusfm.no</a>
        </p>
      </div>`;
  }

  return {
    init, toast, openModal, closeModal, showInfo,
    renderShop, shopPlans: SHOP_PLANS, proBenefits: PRO_BENEFITS,
    logout, renderNav, updateNavBadge, markWallSeen,
    toggleMoreMenu, closeMoreMenu,
    dismissOnboard, refreshHomeFeed, composerPost, refreshComposerTargets,
    doLogin, doRegister, doForgotPassword, doResetPassword,
    resendActivationByEmail, resendFromLogin,
    saveSettings, testEmailJS,
    renderInbox, inboxAccept, inboxReject, startNewChat, inviteToChat,
    quickAddFriend, quickAcceptFriend,
    selectRole,
    settingsTab, resendActivation, sendPasswordResetFromSettings, sendActivationToAll,
    confirmDeleteAccount, deleteAccount,
    selectPaymentMethod, savePaymentMethod, formatCardNumber, formatCardExpiry, removeCard,
    liveFilter, applyFilterPreset, saveFilterSettings,
    savePageTexts, sendAiMessage,
    renderSettings,
    generateQRLogin,
    renderMinSide,
    msUploadAudio, msPreviewUrl, msAddUrl, msDeleteTrack, msEditTrack, msSaveTrackEdit, msPickCover, msClearCover,
    msPickUrlCover, msPickUrlCoverFromUrl, msClearUrlCover,
    msPickEditCover, msPickEditCoverFromUrl, msClearEditCover,
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
    if (status) status.textContent = playing ? 'Live now' : 'Ready';
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
  initEmbedPanelDrag();

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

// Gjør media-spilleren flyttbar: dra i topplinja for å plassere den hvor som
// helst (opp/ned/venstre/høyre). Holdes innenfor skjermkanten. Kjøres én gang.
function initEmbedPanelDrag() {
  const panel = document.getElementById('embed-panel');
  const hdr = panel && panel.querySelector('.embed-panel-hdr');
  if (!panel || !hdr || panel._dragInit) return;
  panel._dragInit = true;

  let dragging = false, startX = 0, startY = 0, startLeft = 0, startTop = 0;

  const clamp = (v, min, max) => Math.max(min, Math.min(v, max));

  hdr.addEventListener('pointerdown', (e) => {
    // Ikke start dra på lukk-knappen.
    if (e.target.closest('.embed-panel-close')) return;
    const rect = panel.getBoundingClientRect();
    // Bytt fra bottom/right til left/top slik at den kan flyttes fritt.
    panel.style.left = rect.left + 'px';
    panel.style.top = rect.top + 'px';
    panel.style.right = 'auto';
    panel.style.bottom = 'auto';
    dragging = true;
    startX = e.clientX; startY = e.clientY;
    startLeft = rect.left; startTop = rect.top;
    panel.classList.add('dragging');
    try { hdr.setPointerCapture(e.pointerId); } catch (_) {}
    e.preventDefault();
  });

  hdr.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const maxL = window.innerWidth - panel.offsetWidth;
    const maxT = window.innerHeight - panel.offsetHeight;
    panel.style.left = clamp(startLeft + (e.clientX - startX), 0, Math.max(0, maxL)) + 'px';
    panel.style.top  = clamp(startTop  + (e.clientY - startY), 0, Math.max(0, maxT)) + 'px';
  });

  const end = (e) => {
    if (!dragging) return;
    dragging = false;
    panel.classList.remove('dragging');
    try { hdr.releasePointerCapture(e.pointerId); } catch (_) {}
  };
  hdr.addEventListener('pointerup', end);
  hdr.addEventListener('pointercancel', end);
}
