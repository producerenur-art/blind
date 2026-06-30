// Social — delt kommentar-/reaksjons-/emoji-/vennelag over Gun (SC).
// Brukt av community-veggen (js/community.js) og profilane (js/profile.js).
// targetKey: 'post:<id>' (vegg-innlegg) · 'profile:<user>' (gjestebok) · 'c:<id>' (kommentar).
// Same Gun-instans som vennechat/varsel. Reaksjonar bruker rå .map().on (verdiar endrar seg),
// kommentarar bruker .map().on for å støtte sletting (put null).
const Social = (() => {

  const EMOJIS = ['😄','😂','🔥','❤️','👏','🎵','🎶','🌀','💫','⚡','🌊','🚀','✨','🎉','💜','👾'];

  // Reaksjoner — én per bruker. Tall-nøklene 1/-1 er de opprinnelige (👍/👎) og
  // holder data som allerede ligger i Gun bakoverkompatibel; resten er strengkoder.
  const REACTIONS = [
    { k: 1,       e: '👍', t: 'Tommel opp', cls: '' },
    { k: -1,      e: '👎', t: 'Tommel ned', cls: 'down' },
    { k: 'angry', e: '😠', t: 'Sur',        cls: 'angry' },
    { k: 'love',  e: '😍', t: 'Hjerte',     cls: 'love' },
    { k: 'oops',  e: '😮', t: 'Oops',       cls: 'oops' },
    { k: 'wow',   e: '🤩', t: 'Wow',        cls: 'wow' },
  ];

  const _comments     = {};   // targetKey → { id → {id,author,authorDisplay,text,ts,_k} }
  const _reactions    = {};   // targetKey → { username → {val,ts} }
  const _cSub         = new Set();
  const _rSub         = new Set();
  const _notifyTarget = {};    // targetKey → username å varsle ved ny kommentar

  const esc   = (s) => (window.SC ? SC.esc(s) : String(s == null ? '' : s));
  const jsq   = (s) => String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const domId = (t) => String(t).replace(/[^a-z0-9]/gi, '_');
  const icon  = (n) => (typeof Icon === 'function' ? Icon(n) : '');
  const me    = () => (typeof Auth !== 'undefined' ? Auth.current() : null);

  function timeAgo(ts) {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60)    return 'nå nettopp';
    if (s < 3600)  return Math.floor(s / 60) + ' min siden';
    if (s < 86400) return Math.floor(s / 3600) + ' t siden';
    return Math.floor(s / 86400) + ' d siden';
  }

  function setNotifyTarget(targetKey, username) { if (username) _notifyTarget[targetKey] = username; }

  // ── Kommentarar ─────────────────────────────────────────────────────────
  function subComments(targetKey) {
    if (_cSub.has(targetKey) || !window.SC) return;
    const g = SC.gun();
    if (!g) return;                 // Gun.js ikke lastet — ikke marker som abonnert, så vi kan prøve igjen
    _cSub.add(targetKey);
    _comments[targetKey] = _comments[targetKey] || {};
    const ref = g.get(SC.NS.comments).get(targetKey);
    if (!ref || typeof ref.map !== 'function') return;
    const isProfile = targetKey.indexOf('profile:') === 0;
    const bump = () => {
      renderComments(targetKey);
      if (isProfile && window.App && App.updateNavBadge) App.updateNavBadge();   // hald nav-merket i synk
    };
    ref.map().on((c, key) => {
      const store = _comments[targetKey];
      if (c === null || c === undefined) {                       // sletta
        for (const id in store) if (store[id]._k === key) { delete store[id]; break; }
        bump(); return;
      }
      if (!c.id || !c.text) return;
      store[c.id] = { id: c.id, author: c.author, authorDisplay: c.authorDisplay, text: c.text, ts: c.ts, _k: key };
      bump();
    });
  }

  // ── Profil-vegg ulesne (for nav-merket — erstattar gamle pv_wall-teljinga) ──
  const _wallSeenKey = (u) => 'sc_wall_seen_' + u;
  // Abonner på din eigen profil-vegg ved innlogging, så ulesne-talet er klart i nav.
  function init(username) { if (username) subComments('profile:' + username); }
  function wallUnread(username) {
    if (!username) return 0;
    const store = _comments['profile:' + username] || {};
    const seen = parseInt(localStorage.getItem(_wallSeenKey(username)) || '0', 10);
    return Object.values(store).filter(c => c.ts > seen && c.author !== username).length;
  }
  function markWallSeen(username) {
    if (username) localStorage.setItem(_wallSeenKey(username), Date.now().toString());
  }

  function commentsBlockHtml(targetKey) {
    subComments(targetKey);
    const d = domId(targetKey);
    setTimeout(() => renderComments(targetKey), 0);
    return `
      <div class="sc-cmt-block">
        <div class="sc-cmt-bar">${icon('message')} <span id="sc-cmt-count-${d}"></span> kommentarar</div>
        <div class="sc-cmt-list" id="sc-cmt-list-${d}"></div>
        ${composerHtml(targetKey)}
      </div>`;
  }

  function composerHtml(targetKey) {
    const d = domId(targetKey);
    if (!me()) return `<div class="sc-cmt-login"><a href="#/login">Logg inn</a> for å kommentere.</div>`;
    return `
      <div class="sc-cmt-composer">
        <input class="sc-cmt-input" id="sc-cmt-input-${d}" placeholder="Skriv ein kommentar…" maxlength="500"
          onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();Social.postComment('${jsq(targetKey)}')}">
        <button class="sc-cmt-emoji-btn" type="button" onclick="Social.toggleEmoji('${jsq(targetKey)}')" title="Emoji">😊</button>
        <button class="btn btn-primary btn-sm" onclick="Social.postComment('${jsq(targetKey)}')">Send</button>
        <div class="sc-emoji-bar" id="sc-emoji-${d}" style="display:none">
          ${EMOJIS.map(e => `<button type="button" class="sc-emoji-pill" onclick="Social.insertEmoji('${jsq(targetKey)}','${e}')">${e}</button>`).join('')}
        </div>
      </div>`;
  }

  function commentRowHtml(targetKey, c, viewer) {
    const initial = (c.authorDisplay || c.author || '?').charAt(0).toUpperCase();
    const pm = /^profile:(.+)$/.exec(targetKey);
    const isWallOwner = viewer && pm && pm[1] === viewer.username;
    const canDel = viewer && (c.author === viewer.username || isWallOwner);
    return `
      <div class="sc-cmt-row" id="sc-cmt-${esc(c.id)}">
        <a class="sc-cmt-av" href="#/u/${esc(c.author)}">${esc(initial)}</a>
        <div class="sc-cmt-main">
          <div class="sc-cmt-head">
            <a class="sc-cmt-name" href="#/u/${esc(c.author)}">${esc(c.authorDisplay || c.author)}</a>
            <span class="sc-cmt-time">${timeAgo(c.ts)}</span>
            ${friendBtn(c.author, { mini: true })}
            ${canDel ? `<button class="sc-cmt-del" onclick="Social.deleteComment('${jsq(targetKey)}','${esc(c.id)}')" title="Slett">${icon('x')}</button>` : ''}
          </div>
          <div class="sc-cmt-text">${esc(c.text)}</div>
          ${reactionBar('c:' + c.id)}
        </div>
      </div>`;
  }

  function renderComments(targetKey) {
    const list = document.getElementById('sc-cmt-list-' + domId(targetKey));
    if (!list) return;
    const viewer = me();
    const arr = Object.values(_comments[targetKey] || {}).sort((a, b) => a.ts - b.ts);
    list.innerHTML = arr.map(c => commentRowHtml(targetKey, c, viewer)).join('');
    const cnt = document.getElementById('sc-cmt-count-' + domId(targetKey));
    if (cnt) cnt.textContent = arr.length ? arr.length : '';
  }

  function postComment(targetKey) {
    const u = me();
    if (!u) { if (window.Router) Router.go('/login'); return; }
    const inp = document.getElementById('sc-cmt-input-' + domId(targetKey));
    const text = inp && inp.value.trim();
    if (!text || !window.SC) return;
    const c = {
      id: 'c_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      author: u.username, authorDisplay: u.displayName, text, ts: Date.now(),
    };
    try { SC.gun().get(SC.NS.comments).get(targetKey).set(c); }
    catch (e) { console.warn('[Social] kommentar feila', e); }
    if (inp) inp.value = '';
    hideEmoji(targetKey);
    const pm = /^profile:(.+)$/.exec(targetKey);
    const notifyUser = pm ? pm[1] : _notifyTarget[targetKey];
    if (notifyUser && window.Notify && notifyUser !== u.username) {
      Notify.emit(notifyUser, {
        type: 'comment',
        text: pm ? 'kommenterte på profilen din' : 'kommenterte på innlegget ditt',
        link: pm ? `#/u/${notifyUser}` : '#/community',
      });
    }
  }

  function deleteComment(targetKey, id) {
    const u = me();
    const store = _comments[targetKey] || {};
    const c = store[id];
    if (!u || !c) return;
    const pm = /^profile:(.+)$/.exec(targetKey);
    const isWallOwner = pm && pm[1] === u.username;
    if (c.author !== u.username && !isWallOwner) return;
    try { if (c._k) SC.gun().get(SC.NS.comments).get(targetKey).get(c._k).put(null); } catch {}
    delete store[id];
    renderComments(targetKey);
  }

  // ── Reaksjoner (👍 👎 😠 😍 😮 🤩) ───────────────────────────────────────────
  function subReactions(targetKey) {
    if (_rSub.has(targetKey) || !window.SC) return;
    const g = SC.gun();
    if (!g) return;                 // Gun.js ikke lastet — ikke marker som abonnert, så vi kan prøve igjen
    _rSub.add(targetKey);
    _reactions[targetKey] = _reactions[targetKey] || {};
    const ref = g.get(SC.NS.reactions).get(targetKey);
    if (!ref || typeof ref.map !== 'function') return;
    ref.map().on((d, user) => {
      if (!user) return;
      const v = d && d.val;
      _reactions[targetKey][user] = { val: (typeof v === 'number' || typeof v === 'string') ? v : 0, ts: (d && d.ts) || 0 };
      renderReactions(targetKey);
    });
  }

  function reactionBar(targetKey) {
    subReactions(targetKey);
    setTimeout(() => renderReactions(targetKey), 0);
    return `<div class="sc-react" id="sc-react-${domId(targetKey)}"></div>`;
  }

  function renderReactions(targetKey) {
    const box = document.getElementById('sc-react-' + domId(targetKey));
    if (!box) return;
    const r = _reactions[targetKey] || {};
    const viewer = me();
    const counts = {};
    let mine = 0;
    for (const u in r) {
      const v = r[u].val;
      if (v !== 0 && v != null) counts[v] = (counts[v] || 0) + 1;
      if (viewer && u === viewer.username) mine = v;
    }
    box.innerHTML = REACTIONS.map(rx => {
      const n   = counts[rx.k] || 0;
      const arg = typeof rx.k === 'number' ? rx.k : `'${rx.k}'`;
      return `<button class="sc-react-btn ${rx.cls} ${mine === rx.k ? 'active' : ''}" onclick="Social.react('${jsq(targetKey)}',${arg})" title="${rx.t}">${rx.e} <span>${n || ''}</span></button>`;
    }).join('');
  }

  function react(targetKey, val) {
    const u = me();
    if (!u) { if (window.Router) Router.go('/login'); return; }
    if (!window.SC) return;
    const store = _reactions[targetKey] = _reactions[targetKey] || {};
    const cur = (store[u.username] && store[u.username].val) || 0;
    const next = cur === val ? 0 : val;
    store[u.username] = { val: next, ts: Date.now() };
    try { SC.gun().get(SC.NS.reactions).get(targetKey).get(u.username).put({ val: next, ts: Date.now() }); } catch {}
    renderReactions(targetKey);
  }

  // ── Emoji ─────────────────────────────────────────────────────────────────
  function toggleEmoji(targetKey) {
    const b = document.getElementById('sc-emoji-' + domId(targetKey));
    if (b) b.style.display = b.style.display === 'none' ? 'flex' : 'none';
  }
  function hideEmoji(targetKey) {
    const b = document.getElementById('sc-emoji-' + domId(targetKey));
    if (b) b.style.display = 'none';
  }
  function insertEmoji(targetKey, e) {
    const inp = document.getElementById('sc-cmt-input-' + domId(targetKey));
    if (inp) { inp.value += e; inp.focus(); }
  }

  // ── Venn-knapp (overalt: vegg-kort, profil-kommentarar, discover-kort) ─────
  // Side-uavhengig: gjer Auth-handlinga sjølv og oppdaterer berre knappane på sida
  // (Profile sine eigne handlerar re-renderer heile profilen — dei rører me ikkje).
  function friendBtn(username, opts) {
    opts = opts || {};
    if (!username) return '';
    return `<span class="sc-friend" data-sc-friend="${esc(username)}" data-mini="${opts.mini ? 1 : ''}">${friendBtnInner(username, opts.mini)}</span>`;
  }

  function friendBtnInner(username, mini) {
    const u = me();
    if (!u || u.username === username || typeof Auth === 'undefined') return '';
    const status = Auth.getFriendStatus(u.username, username);
    const J  = (a) => `event.stopPropagation();event.preventDefault();Social.friendAction('${a}','${jsq(username)}')`;
    const sz = mini ? 'sc-friend-btn-mini' : 'btn btn-ghost btn-sm';
    if (status === 'friends')
      return `<button class="${sz}" onclick="${J('remove')}" title="Fjern venn">${icon('check')} Venner</button>`;
    if (status === 'pending_sent')
      return `<button class="${sz}" onclick="${J('cancel')}" title="Avbryt forespørsel">${icon('hourglass')} Sendt</button>`;
    if (status === 'pending_received')
      return `<button class="${sz}" onclick="${J('accept')}">${icon('check')} Godta</button><button class="${sz}" onclick="${J('reject')}" title="Avslå">${icon('x')}</button>`;
    return `<button class="${mini ? 'sc-friend-btn-mini sc-friend-add' : 'btn btn-primary btn-sm'}" onclick="${J('add')}">${icon('users')} Legg til venn</button>`;
  }

  async function friendAction(action, username) {
    const u = me();
    if (!u) { if (window.Router) Router.go('/login'); return; }
    if (action === 'add') {
      const res = Auth.sendFriendRequest(u.username, username);
      if (res && res.error) { App.toast(res.error, 'error'); return; }
      const tu = Auth.getUser(username);
      if (tu && tu.email && window.Email) Email.sendFriendRequest(tu.email, tu.displayName, u.displayName, u.username).catch(() => {});
      if (window.Notify) Notify.emit(username, { type: 'friend_request', text: 'sendte deg en venneforespørsel', link: `#/u/${u.username}` });
      App.toast(`Venneforespørsel sendt til @${username} ${icon('users')}`, 'success');
    } else if (action === 'cancel') {
      Auth.cancelFriendRequest(u.username, username); App.toast('Venneforespørsel trukket tilbake', 'info');
    } else if (action === 'accept') {
      const res = Auth.acceptFriendRequest(u.username, username);
      if (res && res.error) { App.toast(res.error, 'error'); return; }
      if (window.Notify) Notify.emit(username, { type: 'friend_accept', text: 'godtok venneforespørselen din', link: `#/u/${u.username}` });
      if (window.FriendChat) FriendChat.refresh();
      App.toast(`Du er nå venner med @${username}! ${icon('party')}`, 'success');
    } else if (action === 'reject') {
      Auth.rejectFriendRequest(u.username, username); App.toast(`Venneforespørsel fra @${username} avslått`, 'info');
    } else if (action === 'remove') {
      Auth.removeFriend(u.username, username); App.toast(`@${username} fjernet fra vennelisten`, 'info');
    }
    if (window.App && App.renderNav) App.renderNav();
    refreshFriendBtns();
  }

  function refreshFriendBtns() {
    document.querySelectorAll('[data-sc-friend]').forEach(el =>
      el.innerHTML = friendBtnInner(el.getAttribute('data-sc-friend'), el.getAttribute('data-mini') === '1'));
  }

  return {
    init, wallUnread, markWallSeen,
    commentsBlockHtml, postComment, deleteComment, setNotifyTarget,
    reactionBar, react,
    toggleEmoji, insertEmoji,
    friendBtn, friendAction, refreshFriendBtns,
  };
})();
window.Social = Social;
