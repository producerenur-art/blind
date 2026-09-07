// Notify — Facebook-aktig varslingssenter (bjelle + dropdown + toast + lyd)
// Per-mottakar Gun-innboks (SC.NS.notif). Andre modular kallar Notify.emit(...)
// når noko skjer (opplasting, kommentar, gjestebok, venneforespurnad, innlegg).
const Notify = (() => {

  const MAX_ITEMS = 60;
  const localKey = (u) => `sc_notif_local_${u}`;
  const seenKey  = (u) => `sc_notif_seen_${u}`;

  let _user        = null;     // username vi er initialisert for
  let _items       = [];       // [{id,type,from,fromDisplay,text,link,ts}]
  let _subbed      = false;
  let _panelOpen   = false;
  const _sessionStart = Date.now();

  const esc = (s) => (window.SC ? SC.esc(s) : String(s || ''));

  const ICON = {
    upload: 'music', comment: 'message', wall: 'message',
    friend_request: 'users', friend_accept: 'party', post: 'edit', message: 'mail',
    reaction: 'heart', magazine: 'book',
  };

  function timeAgo(ts) {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60)    return 'Just now';
    if (s < 3600)  return Math.floor(s / 60) + ' min ago';
    if (s < 86400) return Math.floor(s / 3600) + ' h ago';
    return Math.floor(s / 86400) + ' d ago';
  }

  // ── Persistens ────────────────────────────────────────────────────────
  function loadLocal(u) {
    try { return JSON.parse(localStorage.getItem(localKey(u)) || '[]'); } catch { return []; }
  }
  function saveLocal() {
    if (_user) localStorage.setItem(localKey(_user), JSON.stringify(_items.slice(0, MAX_ITEMS)));
  }
  function seen()      { return parseInt(localStorage.getItem(seenKey(_user)) || '0', 10); }
  function markSeen()  { if (_user) localStorage.setItem(seenKey(_user), Date.now().toString()); updateBell(); }
  function unreadCount() { const s = seen(); return _items.filter(n => n.ts > s).length; }

  // ── Init / abonnement ─────────────────────────────────────────────────
  function init() {
    const me = (typeof Auth !== 'undefined') ? Auth.current() : null;
    if (!me) { _user = null; updateBell(); return; }
    if (_user !== me.username) {
      _user = me.username;
      _items = loadLocal(_user);
      _items.sort((a, b) => b.ts - a.ts);
      _subbed = false;
      _nsPolling = false; // ny brukar → poll for RETT innboks (henta av api/notify.js via sessionToken)
    }
    if (!_subbed && window.SC && SC.gun()) {
      _subbed = true;
      SC.sub(SC.gun().get(SC.NS.notif).get(_user), (n, key) => onIncoming(n, key));
    }
    _startNotifySyncPoll();
    updateBell();
  }

  // Gun leverer IKKJE pålitelig mellom to ULIKE nettlesarar — NotifySync
  // (server-autorisert, api/notify.js) er difor den faktisk pålitelige
  // transporten, polla ved sida av Gun-abonnementet. Same onIncoming som
  // handterer Gun-meldingar, så venneforespurnad-biverknadene (Auth.
  // receiveFriendRequest osv.) skjer likt uansett kjelde.
  let _nsPolling = false;
  function _startNotifySyncPoll() {
    if (_nsPolling || typeof NotifySync === 'undefined' || !NotifySync._enabled()) return;
    _nsPolling = true;
    const pull = async () => {
      const rows = await NotifySync.list(MAX_ITEMS);
      for (const n of rows) onIncoming(n, n.id);
    };
    pull();
    setInterval(pull, 8000);
  }

  function onIncoming(n, key) {
    if (!n || !n.text || typeof n.ts !== 'number') return;
    const id = n.id || key;
    if (_items.some(x => x.id === id)) return;
    const me = Auth.current();
    if (me && n.from === me.username) return;          // ikkje vis eigne handlingar

    // Persister venneforespørsel-hendingar lokalt slik at profil-knappane
    // (Aksepter / Avslå på mottakaren, Venner på avsendaren) faktisk dukkar opp.
    // Utan dette lever venneforespørsler berre som varsel og getFriendStatus()
    // ser dei aldri.
    if (me && n.from) {
      let friendChanged = false;
      if (n.type === 'friend_request' && Auth.receiveFriendRequest) {
        friendChanged = !!Auth.receiveFriendRequest(me.username, n.from, n.ts)?.success;
      } else if (n.type === 'friend_accept' && Auth.confirmFriendAccept) {
        friendChanged = !!Auth.confirmFriendAccept(me.username, n.from)?.success;
      }
      if (friendChanged) {
        if (typeof App !== 'undefined' && App.renderNav) App.renderNav();
        // Oppdater profilen dersom vi står på avsendaren sin profil akkurat no.
        if (typeof Profile !== 'undefined' && Profile.renderView &&
            location.hash === `#/u/${n.from}`) Profile.renderView(n.from);
      }
    }

    _items.unshift({ id, type: n.type || 'message', from: n.from, fromDisplay: n.fromDisplay, text: n.text, link: n.link || '', ts: n.ts });
    _items.sort((a, b) => b.ts - a.ts);
    _items = _items.slice(0, MAX_ITEMS);
    saveLocal();
    if (n.ts > _sessionStart - 4000) {
      if (window.SC) SC.playDing('notif');
      if (typeof App !== 'undefined') App.toast(`${n.fromDisplay || n.from} ${n.text}`, 'info', 4000);
    }
    if (_panelOpen) renderPanel();
    updateBell();
  }

  // ── Emit ──────────────────────────────────────────────────────────────
  function emit(toUsername, payload) {
    if (!toUsername || !window.SC) return;
    const from = (typeof Auth !== 'undefined' && Auth.current()) ? Auth.current().username : (payload.from || '');
    if (toUsername === from) return;                   // ikkje varsle deg sjølv
    const notif = {
      // Deterministisk id (payload.id) når avsendaren har ein — då dedupar
      // emit-vegen mot mottakaren sin eigen lokale pushLocal (same id → berre eitt varsel).
      id: payload.id || ('n_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7)),
      type: payload.type || 'message',
      from: payload.from || from,
      fromDisplay: payload.fromDisplay || from,
      text: payload.text || '',
      link: payload.link || '',
      ts: Date.now(),
    };
    try { SC.gun().get(SC.NS.notif).get(toUsername).set(notif); }
    catch (e) { console.warn('[Notify] emit feila', e); }
    if (typeof NotifySync !== 'undefined') NotifySync.push(toUsername, notif).catch(() => {});
  }

  // Legg til eit LOKALT varsel i DENNE innlogga brukaren si liste — utan å gå
  // om Gun-innboksen. Brukt av Community: alle innlogga abonnerer på den SAME
  // delte innleggs-feeden, så kvar klient kan laga sitt eige varsel når eit nytt
  // innlegg landar — då slepp avsendaren å lista opp mottakarar (som berre ville
  // kjent brukarar registrert på denne eininga). Idempotent på id, så same
  // innlegg (t.d. ved Gun-replay/reload) aldri gir dobbelt varsel.
  function pushLocal(payload) {
    if (!payload || !payload.text) return;
    const me = (typeof Auth !== 'undefined') ? Auth.current() : null;
    if (!me) return;                                   // må vera innlogga
    if (_user !== me.username) init();                 // sørg for rett innboks er lasta
    if (payload.from && payload.from === me.username) return;   // ikkje varsle meg sjølv
    const id = payload.id || ('n_' + (payload.ts || 0) + '_' + (payload.from || ''));
    if (_items.some(x => x.id === id)) return;
    const ts = payload.ts || Date.now();
    _items.unshift({
      id, type: payload.type || 'post', from: payload.from || '',
      fromDisplay: payload.fromDisplay || payload.from || '',
      text: payload.text, link: payload.link || '', ts,
    });
    _items.sort((a, b) => b.ts - a.ts);
    _items = _items.slice(0, MAX_ITEMS);
    saveLocal();
    if (ts > _sessionStart - 15000) {                  // berre pling/toast for ferske
      if (window.SC) SC.playDing('notif');
      if (typeof App !== 'undefined') App.toast(`${payload.fromDisplay || payload.from} ${payload.text}`, 'info', 4000);
    }
    if (_panelOpen) renderPanel();
    updateBell();
  }

  // Varsle alle vener til ein brukar (brukar-objekt) — opplasting / nytt innlegg.
  function notifyFriends(meUser, payload) {
    if (!meUser) return;
    (Auth.getFriends(meUser.username) || []).forEach(f => emit(f.username, { ...payload, from: meUser.username, fromDisplay: meUser.displayName }));
  }

  // Varsle ALLE brukarar (uavhengig av venn/abonnement) — t.d. nytt offentleg
  // community-innlegg. Hopper over avsendaren sjølv (emit gjer det òg).
  function notifyAll(meUser, payload) {
    if (!meUser) return;
    let list = [];
    try { list = Auth.getAllPublicUsers() || []; } catch (e) {}
    list.forEach(u => {
      if (u && u.username && u.username !== meUser.username)
        emit(u.username, { ...payload, from: meUser.username, fromDisplay: meUser.displayName });
    });
  }

  // ── Bjelle + panel ────────────────────────────────────────────────────
  function updateBell() {
    const bell = document.getElementById('nav-bell');
    if (!bell) return;
    const n = unreadCount();
    let b = bell.querySelector('.nav-bell-badge');
    if (n > 0) {
      if (!b) { b = document.createElement('span'); b.className = 'nav-bell-badge'; bell.appendChild(b); }
      b.textContent = n > 99 ? '99+' : n;
    } else if (b) { b.remove(); }
  }

  // Aksepter / Avslå-knappar rett inne i varselet for ein venneforespurnad.
  // Vises for ALLE brukarar som har ein ubehandla innkommande førespurnad; når
  // han er handtert (venner / avslått) byter knappane til ein statuslinje.
  function friendActionsHtml(n) {
    if (n.type !== 'friend_request' || !n.from) return '';
    if (typeof Auth === 'undefined' || !Auth.getFriendStatus || !_user) return '';
    const status = Auth.getFriendStatus(_user, n.from);
    if (status === 'friends')
      return `<span class="sc-notif-fr-done">${Icon('check')} You are now friends</span>`;
    if (status !== 'pending_received') return '';   // avslått / ugyldig — ingen knappar
    const from = esc(n.from);
    return `<span class="sc-notif-fr">
      <button class="sc-notif-fr-btn accept" onclick="Notify.friendAct(event,'accept','${from}')">${Icon('check')} Accept</button>
      <button class="sc-notif-fr-btn deny" onclick="Notify.friendAct(event,'reject','${from}')" title="Decline">${Icon('x')} Deny</button>
    </span>`;
  }

  function rowHtml(n) {
    const ic   = `<span class="sc-notif-ic">${Icon(ICON[n.type] || 'bell')}</span>`;
    const body = `<span class="sc-notif-body">
        <span class="sc-notif-text"><b>${esc(n.fromDisplay || n.from)}</b> ${esc(n.text)}</span>
        <span class="sc-notif-time">${timeAgo(n.ts)}</span>
      </span>`;
    // Venneforespurnad: ikkje pakk heile rada i ei lenke — då ville Aksepter/Avslå
    // òg navigere + lukke panelet. Lenke berre på tekst/ikon, knappane står ved sida.
    if (n.type === 'friend_request') {
      return `<div class="sc-notif-item sc-notif-item-fr">
        <a class="sc-notif-main" href="${esc(n.link || '#')}" onclick="Notify.closePanel()">${ic}${body}</a>
        ${friendActionsHtml(n)}
      </div>`;
    }
    return `<a class="sc-notif-item" href="${esc(n.link || '#')}" onclick="Notify.closePanel()">${ic}${body}</a>`;
  }

  function renderPanel() {
    const panel = document.getElementById('sc-notif-panel'); if (!panel) return;
    const rows = _items.length ? _items.map(rowHtml).join('') : '<div class="sc-notif-empty">No notifications yet.</div>';
    panel.innerHTML = `
      <div class="sc-notif-head">
        <span>${Icon('bell')} Notifications</span>
        <button class="sc-notif-close" onclick="Notify.closePanel()" title="Close">${Icon('x')}</button>
      </div>
      <div class="sc-notif-list">${rows}</div>`;
  }

  function openPanel() {
    let panel = document.getElementById('sc-notif-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'sc-notif-panel';
      panel.className = 'sc-notif-panel';
      document.body.appendChild(panel);
      setTimeout(() => document.addEventListener('pointerdown', _outside), 0);
    }
    _panelOpen = true;
    renderPanel();
    markSeen();
  }
  function closePanel() {
    _panelOpen = false;
    document.getElementById('sc-notif-panel')?.remove();
    document.removeEventListener('pointerdown', _outside);
  }
  function togglePanel() { _panelOpen ? closePanel() : openPanel(); }

  // Handter Aksepter / Avslå rett frå varselpanelet. Går gjennom Social slik at
  // vennskapet blir lagra, avsendaren varsla (friend_accept) og knappane oppdatert
  // over heile appen. Fell tilbake til Auth om Social ikkje er lasta.
  async function friendAct(ev, action, from) {
    if (ev && ev.preventDefault) { ev.preventDefault(); ev.stopPropagation(); }
    if (!from) return;
    try {
      if (window.Social && Social.friendAction) {
        await Social.friendAction(action, from);
      } else if (typeof Auth !== 'undefined' && _user) {
        if (action === 'accept') Auth.acceptFriendRequest(_user, from);
        else                     Auth.rejectFriendRequest(_user, from);
        if (typeof App !== 'undefined' && App.renderNav) App.renderNav();
      }
    } catch (e) { console.warn('[Notify] friendAct feila', e); }
    if (_panelOpen) renderPanel();
    updateBell();
  }
  function _outside(e) {
    if (e.target.closest && (e.target.closest('#sc-notif-panel') || e.target.closest('#nav-bell'))) return;
    closePanel();
  }

  return { init, emit, pushLocal, notifyFriends, notifyAll, unreadCount, updateBell, togglePanel, openPanel, closePanel, friendAct };
})();
window.Notify = Notify;
