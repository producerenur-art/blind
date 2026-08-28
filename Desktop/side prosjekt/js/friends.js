// Friends — eigen «Friends»-side med to faner:
//   • «Online no»  — brukarar som er online (presence)
//   • «Mine vener» — vener du har lagt til
// Raud prikk = ikkje venn enno · grøn prikk = venn (gjeld ALLE brukarar her).
// Inkluderer ein test-admin (seed) så venne-flyten kan testast med ELLER utan vener.
// Gjenbruker Auth (vennelogikk), SC (presence) og FriendChat (chat). Real-tids via Gun.
const Friends = (() => {

  const TEST_ADMIN = 'soundcore_admin';
  let _tab       = 'online';   // 'online' | 'mine'
  let _keepTimer = null;        // held test-admin «online» for demo
  let _liveTimer = null;        // re-render online-fana medan sida er open

  const esc  = (s) => (window.SC ? SC.esc(s) : String(s == null ? '' : s));
  const me   = () => (typeof Auth !== 'undefined' ? Auth.current() : null);
  const icon = (n) => (typeof Icon === 'function' ? Icon(n) : '');

  const ROLE_LABEL = { lytter:'🎧 Listener', dj:'🎛️ DJ', produsent:'🎹 Producer', plateselskap:'🏷️ Record label' };

  // ── Online + venn-status ────────────────────────────────────────────────
  function isOnline(username) {
    if (window.SC && SC.isOnline(username)) return true;
    return (typeof Auth !== 'undefined' && Auth.isOnline(username));
  }
  function isFriend(myUser, username) {
    return !!(myUser && (myUser.friends || []).includes(username));
  }
  function onlineUsers(myUser) {
    return Auth.getAllPublicUsers()
      .filter(u => u.username !== myUser.username && isOnline(u.username))
      .sort((a, b) => (isFriend(myUser, b.username) - isFriend(myUser, a.username))
                   || String(a.displayName || a.username || '').localeCompare(String(b.displayName || b.username || '')));
  }
  function myFriends(myUser) {
    return (Auth.getFriends(myUser.username) || [])
      .sort((a, b) => (isOnline(b.username) - isOnline(a.username))
                   || String(a.displayName || a.username || '').localeCompare(String(b.displayName || b.username || '')));
  }

  // ── Test-admin (seed for testing) ───────────────────────────────────────
  function testAdminExists() {
    return !!(typeof Auth !== 'undefined' && Auth.getUser(TEST_ADMIN));
  }
  function keepTestAdminAlive() {
    if (!testAdminExists()) return;
    Auth.setOnline(TEST_ADMIN);
    try { if (window.SC && SC.gun()) SC.gun().get(SC.NS.presence).get(TEST_ADMIN).put({ ts: Date.now() }); } catch {}
  }
  function seedTestAdmin() {
    if (typeof Auth === 'undefined') return null;
    if (!testAdminExists()) {
      const res = Auth.register(TEST_ADMIN, 'Admin!23', 'SiriusFM Admin', 'admin@soundcore.test');
      if (res && res.success) {
        Auth.activate(res.activationToken);
        Auth.updateUser(TEST_ADMIN, {
          role:  'plateselskap',
          bio:   'Test admin — created to test the friend feature in Friends. Safe to remove.',
          _test: true,
        });
      }
    }
    keepTestAdminAlive();
    return Auth.getUser(TEST_ADMIN);
  }
  function removeTestAdmin() {
    if (typeof Auth === 'undefined' || typeof Auth.deleteUser !== 'function') return;
    Auth.clearOnline(TEST_ADMIN);
    Auth.deleteUser(TEST_ADMIN);
  }

  // ── Handlingar ──────────────────────────────────────────────────────────
  // Test-admin: direkte gjensidig venn/fjern (svarar «automatisk») så raud↔grøn
  // kan testast med ein gong. Ekte brukarar går via Social (e-post + varsel).
  async function friendAction(action, username) {
    const myUser = me();
    if (!myUser) { if (window.Router) Router.go('/login'); return; }
    if (username === TEST_ADMIN) {
      if (action === 'add' || action === 'accept') {
        Auth.sendFriendRequest(myUser.username, TEST_ADMIN);
        Auth.acceptFriendRequest(TEST_ADMIN, myUser.username);
        if (window.App) App.toast(`You are now friends with @${TEST_ADMIN} ✓`, 'success');
      } else {
        Auth.removeFriend(myUser.username, TEST_ADMIN);
        Auth.cancelFriendRequest(myUser.username, TEST_ADMIN);
        if (window.App) App.toast(`@${TEST_ADMIN} removed from your friends list`, 'info');
      }
      if (window.App && App.renderNav) App.renderNav();
      if (window.FriendChat) FriendChat.refresh();
      renderTab();
      return;
    }
    if (window.Social) await Social.friendAction(action, username);
    renderTab();
  }
  function seed()   { seedTestAdmin();  if (window.App) App.toast('Test admin created ✓ — see «Online now»', 'success'); _tab = 'online'; rerenderAll(); }
  function unseed() { removeTestAdmin(); if (window.App) App.toast('Test admin removed', 'info'); rerenderAll(); }
  function openChat(username, displayName) {
    if (!window.FriendChat) { if (window.App) App.toast('Friend chat is not available', 'error'); return; }
    FriendChat.refresh();
    FriendChat.openConv(username, displayName || username);
  }
  function setTab(t) { _tab = t; rerenderAll(); }

  // ── Render ──────────────────────────────────────────────────────────────
  function avatarBg(u) {
    const t = u.theme || {};
    return t.bgType === 'gradient'
      ? (t.bgGradient || 'linear-gradient(135deg,#22c55e,#16a34a)')
      : `linear-gradient(135deg,${t.primaryColor || '#22c55e'},${t.secondaryColor || '#2563eb'})`;
  }

  function userCard(u, myUser) {
    const friend = isFriend(myUser, u.username);
    const online = isOnline(u.username);
    const isTest = u.username === TEST_ADMIN;
    const status = Auth.getFriendStatus(myUser.username, u.username);
    const J = (a) => `Friends.friendAction('${a}','${esc(u.username)}')`;
    let btn;
    if (status === 'friends')
      btn = `<button class="fr-btn fr-btn-ghost" onclick="${J('remove')}" title="Remove friend">${icon('check')} Friends</button>`;
    else if (status === 'pending_sent')
      btn = `<button class="fr-btn fr-btn-ghost" onclick="${J('cancel')}" title="Cancel">${icon('hourglass')} Sent</button>`;
    else if (status === 'pending_received')
      btn = `<button class="fr-btn fr-btn-primary" onclick="${J('accept')}">${icon('check')} Accept</button>`;
    else
      btn = `<button class="fr-btn fr-btn-primary" onclick="${J('add')}">${icon('users')} Add</button>`;
    const chat = friend
      ? `<button class="fr-btn fr-btn-ghost" onclick="Friends.openChat('${esc(u.username)}','${esc(u.displayName || u.username)}')">${icon('message')} Chat</button>`
      : '';
    const initial = esc((u.displayName || u.username).charAt(0).toUpperCase());
    return `
      <div class="fr-card ${friend ? 'is-friend' : 'not-friend'}">
        <div class="fr-banner" data-banner-user="${esc(u.username)}" style="background:${avatarBg(u)}"></div>
        <span class="fr-status-dot ${friend ? 'on-friend' : 'on-stranger'}" title="${friend ? 'Friend' : 'Not friends yet'}"></span>
        <a class="fr-av" href="#/u/${esc(u.username)}" style="background:${avatarBg(u)}">
          <span class="fr-av-fill" data-av-user="${esc(u.username)}">${initial}</span>
          ${online ? '<span class="fr-online-dot" title="Online now"></span>' : ''}
        </a>
        <div class="fr-info">
          <a class="fr-name" href="#/u/${esc(u.username)}">${esc(u.displayName || u.username)}${isTest ? ' <span class="fr-test-tag">TEST</span>' : ''}</a>
          <div class="fr-sub">@${esc(u.username)} · ${ROLE_LABEL[u.role || 'lytter'] || '🎧 Listener'}${online ? ' · <span class="fr-online-text">online</span>' : ''}</div>
        </div>
        <div class="fr-actions">${chat}${btn}</div>
      </div>`;
  }

  function renderTestPanel() {
    const panel = document.getElementById('fr-test-panel');
    if (!panel) return;
    const exists = testAdminExists();
    panel.innerHTML = `
      <div class="fr-test-inner">
        <span class="fr-test-ico">${icon('wrench') || '🧪'}</span>
        <div class="fr-test-text">
          <strong>Test admin</strong>
          <span>${exists
            ? 'Test admin «@soundcore_admin» is active and shown as online. Add / remove as a friend to test red↔green.'
            : 'Create a test admin to test the friend flow against — it appears online, red in the list, and green when you add it.'}</span>
        </div>
        ${exists
          ? `<button class="fr-btn fr-btn-ghost" onclick="Friends.unseed()">${icon('trash')} Remove test admin</button>`
          : `<button class="fr-btn fr-btn-primary" onclick="Friends.seed()">${icon('plus')} Create test admin</button>`}
      </div>`;
  }

  function renderTabBar() {
    const bar = document.getElementById('fr-tabbar');
    const myUser = me();
    if (!bar || !myUser) return;
    const onCount = onlineUsers(myUser).length;
    const frCount = myFriends(myUser).length;
    bar.innerHTML = `
      <button class="fr-tab ${_tab === 'online' ? 'active' : ''}" onclick="Friends.setTab('online')">
        ${icon('circle-dot')} Online now <span class="fr-tab-count">${onCount}</span></button>
      <button class="fr-tab ${_tab === 'mine' ? 'active' : ''}" onclick="Friends.setTab('mine')">
        ${icon('users')} My friends <span class="fr-tab-count">${frCount}</span></button>`;
  }

  function renderTab() {
    const list = document.getElementById('fr-list');
    const myUser = me();
    if (!list || !myUser) return;
    let arr, empty;
    if (_tab === 'online') {
      arr = onlineUsers(myUser);
      empty = `No other users are online right now.${!testAdminExists() ? ' Create a test admin above to see how the tab looks.' : ''}`;
    } else {
      arr = myFriends(myUser);
      empty = 'You have no friends yet. Go to «Online now» or Discover and add someone.';
    }
    list.innerHTML = arr.length
      ? arr.map(u => userCard(u, myUser)).join('')
      : `<div class="fr-empty">${icon('users')}<p>${empty}</p></div>`;
    // Fyll inn ekte profilbilde + banner-stripe på kvart venne-/brukarkort.
    if (window.Profile && Profile.hydrateAvatars) Profile.hydrateAvatars(list);
    if (window.Profile && Profile.hydrateBanners) Profile.hydrateBanners(list);
    renderTabBar();
  }

  function rerenderAll() { renderTestPanel(); renderTabBar(); renderTab(); }

  function startLive() {
    if (_liveTimer) clearInterval(_liveTimer);
    _liveTimer = setInterval(() => {
      if (!document.getElementById('fr-page')) { clearInterval(_liveTimer); _liveTimer = null; return; }
      keepTestAdminAlive();
      if (_tab === 'online') renderTab();
    }, 15000);
  }

  function render() {
    const app = document.getElementById('app');
    const myUser = me();
    if (!myUser) {
      app.innerHTML = `<div class="fr-page"><div class="fr-empty">${icon('lock')}
        <p>You must <a href="#/login">log in</a> to see Friends.</p></div></div>`;
      return;
    }
    keepTestAdminAlive();
    app.innerHTML = `
      <div class="fr-page" id="fr-page">
        <div class="fr-header">
          <div class="fr-header-left">
            <h1 class="fr-title">${icon('users')} Friends</h1>
            <p class="fr-subtitle">See who's online and your friends.
              <span class="fr-legend"><span class="fr-status-dot on-friend"></span> friend
              <span class="fr-status-dot on-stranger"></span> not friends yet</span></p>
          </div>
          <button class="fr-btn fr-btn-ghost" onclick="if(window.FriendChat)FriendChat.toggle()" title="Open floating friend chat">${icon('message')} Friend chat</button>
        </div>
        <div class="fr-test-panel" id="fr-test-panel"></div>
        <div class="fr-tabbar" id="fr-tabbar"></div>
        <div class="fr-list" id="fr-list"></div>
      </div>`;
    rerenderAll();
    startLive();
  }

  // Køyrer ved oppstart: held test-admin online medan appen er open.
  function init() {
    keepTestAdminAlive();
    if (!_keepTimer) _keepTimer = setInterval(keepTestAdminAlive, 30000);
  }

  return { init, render, setTab, friendAction, openChat, seed, unseed };
})();
window.Friends = Friends;
