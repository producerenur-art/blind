// Community — global community-feed (/community) + profil-«Innlegg»-fane.
// Veggen er no eit Facebook-aktig media-rom: tekst-status + opplasta musikk/video/
// YouTube/Blend frå alle brukarar, med kommentarar + 👍/👎 (Social) under kvart kort.
// Innlegg ligg i SC.NS.posts (Gun). Publikum styrast av brukaren si globale vegg-
// innstilling (wallVisibility: 'public' | 'friends'); 'friends'-innlegg ber med seg ei
// snapshot-liste (allow) så andre nettlesarar kan filtrere riktig. Ny lyd → «pling».
const Community = (() => {

  const _posts = {};            // id → post (+ _k = Gun-nøkkel)
  let _subbed = false;
  let _profileUser = null;
  let _filter = 'alt';
  const _sessionStart = Date.now();

  const esc = (s) => (window.SC ? SC.esc(s) : String(s || ''));

  function timeAgo(ts) {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60)    return 'nå nettopp';
    if (s < 3600)  return Math.floor(s / 60) + ' min siden';
    if (s < 86400) return Math.floor(s / 3600) + ' t siden';
    return Math.floor(s / 86400) + ' d siden';
  }

  function kindLabel(kind) {
    return { audio: 'ny lyd', video: 'ein video', youtube: 'ein video',
             blend: 'ein blend', link: 'ei lenke' }[kind] || 'eit innlegg';
  }

  // ── Abonnement ────────────────────────────────────────────────────────
  function subscribe() {
    if (_subbed || !window.SC) return;
    _subbed = true;
    SC.sub(SC.gun().get(SC.NS.posts).get('posts'), (p, key) => {
      if (!p || !p.id || !p.author || (!p.text && !p.kind)) return;
      _posts[p.id] = { ...p, _k: key };
      // «Pling» når ny LYD landar på veggen (ikkje mi eiga, ikkje historikk).
      if (p.kind === 'audio' && p.ts > _sessionStart - 4000) {
        const me = Auth.current();
        if (!(me && p.author === me.username) && canSee(p, me)) {
          if (window.SC) SC.playDing('notif');
          if (typeof App !== 'undefined')
            App.toast(`${p.authorDisplay || p.author} la ut ny lyd${p.name ? ': ' + p.name : ''}`, 'info', 4000);
        }
      }
      if (document.getElementById('community-feed-list')) renderFeedList();
      if (document.getElementById('innlegg-list')) renderProfileList();
    });
  }

  // 'friends'-innlegg er berre synlege for forfattaren + dei i allow-lista.
  function canSee(p, viewer) {
    if (p.audience !== 'friends') return true;
    if (!viewer) return false;
    if (p.author === viewer.username) return true;
    try { return JSON.parse(p.allow || '[]').includes(viewer.username); } catch { return false; }
  }

  // ── Auto-deling (lar brukaren styre om nye opplastingar går til veggen) ──
  function autoShareOn() { return localStorage.getItem('sc_autoshare') !== '0'; }
  function setAutoShare(on) {
    localStorage.setItem('sc_autoshare', on ? '1' : '0');
    if (typeof App !== 'undefined') App.toast(on ? '🌐 Nye opplastingar deles til Community' : 'Auto-deling av', 'info', 2000);
  }

  // Er denne kjelda (media-id) allereie delt på veggen?
  function isShared(sourceId) {
    return !!sourceId && Object.values(_posts).some(p => p.sourceId === sourceId);
  }

  // Del eit media-element til veggen. Kalla automatisk frå opplasting + manuelt.
  // opts: { kind, name, url?, youtubeId?, sourceId?, caption?, audience? }
  function shareMedia(opts) {
    const me = Auth.current();
    if (!me || !window.SC || !opts || !opts.kind) return null;
    if (opts.sourceId && isShared(opts.sourceId)) return null;     // ikkje dobbel-del
    const vis = opts.audience || me.wallVisibility || 'public';
    const p = {
      id: 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      author: me.username, authorDisplay: me.displayName, ts: Date.now(),
      audience: vis, kind: opts.kind, name: opts.name || '',
      mediaUrl: opts.url || '', youtubeId: opts.youtubeId || '',
      sourceId: opts.sourceId || '', text: opts.caption || '',
    };
    if (vis === 'friends') {
      const fr = (Auth.getFriends(me.username) || []).map(f => f.username);
      p.allow = JSON.stringify([me.username, ...fr]);
    }
    try { SC.gun().get(SC.NS.posts).get('posts').set(p); }
    catch (e) { console.warn('[Community] shareMedia feila', e); }
    _posts[p.id] = { ...p };
    if (window.Notify) Notify.notifyFriends(me, { type: 'upload', text: `delte ${kindLabel(p.kind)} på veggen`, link: '#/community' });
    return p.id;
  }

  // Fjern eit delt media-element (alle innlegg med same sourceId, mine).
  function unshareMedia(sourceId) {
    const me = Auth.current();
    if (!me || !sourceId) return;
    Object.values(_posts).forEach(p => {
      if (p.sourceId === sourceId && p.author === me.username) {
        try { if (p._k) SC.gun().get(SC.NS.posts).get('posts').get(p._k).put(null); } catch {}
        delete _posts[p.id];
      }
    });
    renderFeedList(); renderProfileList();
  }

  // ── Komponering (tekst-status) ────────────────────────────────────────
  function composerHtml() {
    const me = Auth.current();
    const vis = me.wallVisibility || 'public';
    return `
      <div class="community-composer">
        <textarea id="sc-post-input" class="community-input" placeholder="Del noko med fellesskapet…" maxlength="1000"></textarea>
        <div class="community-composer-row">
          <label class="community-vis">${Icon('eye')} Synleg for:
            <select id="sc-post-vis" onchange="Community.setWallVisibility(this.value)">
              <option value="public"  ${vis === 'public'  ? 'selected' : ''}>🌐 Alle (offentleg)</option>
              <option value="friends" ${vis === 'friends' ? 'selected' : ''}>👥 Berre vener</option>
            </select>
          </label>
          <label class="community-autoshare" title="Del nye opplastingar (musikk/video/lenke) automatisk til veggen">
            <input type="checkbox" ${autoShareOn() ? 'checked' : ''} onchange="Community.setAutoShare(this.checked)"> Auto-del opplastingar
          </label>
          <button class="btn btn-primary btn-sm" onclick="Community.post()">${Icon('send')} Del</button>
        </div>
      </div>`;
  }

  function post() {
    const me = Auth.current();
    if (!me) { if (typeof Router !== 'undefined') Router.go('/login'); return; }
    const inp = document.getElementById('sc-post-input');
    const text = inp && inp.value.trim();
    if (!text || !window.SC) return;
    const vis = me.wallVisibility || 'public';
    const p = {
      id: 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      author: me.username, authorDisplay: me.displayName,
      text, ts: Date.now(), audience: vis, kind: 'text',
    };
    if (vis === 'friends') {
      const fr = (Auth.getFriends(me.username) || []).map(f => f.username);
      p.allow = JSON.stringify([me.username, ...fr]);
    }
    try { SC.gun().get(SC.NS.posts).get('posts').set(p); }
    catch (e) { console.warn('[Community] post feila', e); }
    if (inp) inp.value = '';
    if (window.Notify) Notify.notifyFriends(me, { type: 'post', text: 'la ut eit nytt innlegg', link: '#/community' });
    if (typeof App !== 'undefined') App.toast('Innlegg delt!', 'success');
  }

  function setWallVisibility(value) {
    const me = Auth.current(); if (!me) return;
    Auth.updateUser(me.username, { wallVisibility: value });
    if (typeof App !== 'undefined') App.toast(
      value === 'friends' ? '👥 Veggen din er no berre for vener' : '🌐 Veggen din er no offentleg', 'success', 2000);
  }

  function deletePost(id) {
    const me = Auth.current(); const p = _posts[id];
    if (!me || !p || p.author !== me.username) return;
    try { if (p._k) SC.gun().get(SC.NS.posts).get('posts').get(p._k).put(null); } catch {}
    delete _posts[id];
    renderFeedList(); renderProfileList();
  }

  // ── Media-render ──────────────────────────────────────────────────────
  function mediaBodyHtml(p) {
    const name = esc(p.name || '');
    switch (p.kind) {
      case 'audio':
        return `<div class="community-media community-audio">
          ${name ? `<div class="community-media-title">${Icon('music')} ${name}</div>` : ''}
          <audio controls preload="none" src="${esc(p.mediaUrl)}"></audio></div>`;
      case 'video':
        return `<div class="community-media">
          ${name ? `<div class="community-media-title">🎬 ${name}</div>` : ''}
          <video controls preload="none" src="${esc(p.mediaUrl)}"></video></div>`;
      case 'youtube':
        return `<div class="community-media community-yt"><iframe src="https://www.youtube.com/embed/${esc(p.youtubeId)}"
          frameborder="0" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowfullscreen></iframe></div>`;
      case 'blend':
        return `<div class="community-media community-blend"><img src="${esc(p.mediaUrl)}" alt="${name}" loading="lazy"></div>`;
      case 'link':
        return `<a class="community-media community-link" href="${esc(p.mediaUrl)}" target="_blank" rel="noopener">${Icon('link')} ${name || esc(p.mediaUrl)}</a>`;
      default: return '';
    }
  }

  // ── Kort + lister ─────────────────────────────────────────────────────
  function postCardHtml(p) {
    const me = Auth.current();
    const initial = (p.authorDisplay || p.author || '?').charAt(0).toUpperCase();
    const canDel = me && me.username === p.author;
    const aud = p.audience === 'friends' ? `<span class="community-aud">👥 vener</span>` : '';
    const media = (p.kind && p.kind !== 'text') ? mediaBodyHtml(p) : '';
    const textHtml = p.text ? `<div class="community-post-text">${esc(p.text)}</div>` : '';
    if (window.Social) Social.setNotifyTarget('post:' + p.id, p.author);
    return `
      <div class="community-post" id="cpost-${esc(p.id)}">
        <a class="community-post-av" href="#/u/${esc(p.author)}">${esc(initial)}</a>
        <div class="community-post-body">
          <div class="community-post-head">
            <a class="community-post-name" href="#/u/${esc(p.author)}">${esc(p.authorDisplay || p.author)}</a>
            <span class="community-post-time">${timeAgo(p.ts)}</span>
            ${aud}
            ${window.Social ? Social.friendBtn(p.author, { mini: true }) : ''}
            ${canDel ? `<button class="community-post-del" onclick="Community.deletePost('${esc(p.id)}')" title="Slett">${Icon('trash')}</button>` : ''}
          </div>
          ${textHtml}
          ${media}
          ${window.Social ? Social.reactionBar('post:' + p.id) : ''}
          ${window.Social ? Social.commentsBlockHtml('post:' + p.id) : ''}
        </div>
      </div>`;
  }

  function matchesFilter(p) {
    switch (_filter) {
      case 'musikk':  return p.kind === 'audio';
      case 'video':   return p.kind === 'video' || p.kind === 'youtube';
      case 'bilete':  return p.kind === 'blend';
      case 'innlegg': return !p.kind || p.kind === 'text';
      default:        return true;
    }
  }

  function filterTabsHtml() {
    const tabs = [['alt', 'Alt'], ['musikk', '🎵 Musikk'], ['video', '🎬 Video'], ['bilete', '🎨 Blend'], ['innlegg', '📝 Innlegg']];
    return `<div class="community-filter">${tabs.map(([k, l]) =>
      `<button class="community-filter-btn ${_filter === k ? 'active' : ''}" data-f="${k}" onclick="Community.setFilter('${k}')">${l}</button>`).join('')}</div>`;
  }

  function setFilter(f) {
    _filter = f;
    document.querySelectorAll('.community-filter-btn').forEach(b => b.classList.toggle('active', b.dataset.f === f));
    renderFeedList();
  }

  function renderFeedList() {
    const list = document.getElementById('community-feed-list'); if (!list) return;
    const me = Auth.current();
    const arr = Object.values(_posts).filter(p => canSee(p, me) && matchesFilter(p)).sort((a, b) => b.ts - a.ts);
    list.innerHTML = arr.length ? arr.map(postCardHtml).join('')
      : '<div class="community-empty">Ingen innlegg her enno. Bli den første som deler noko!</div>';
  }

  function renderProfileList() {
    const list = document.getElementById('innlegg-list'); if (!list) return;
    const me = Auth.current();
    const arr = Object.values(_posts)
      .filter(p => p.author === _profileUser && canSee(p, me))
      .sort((a, b) => b.ts - a.ts);
    list.innerHTML = arr.length ? arr.map(postCardHtml).join('')
      : '<div class="community-empty">Ingen innlegg enno.</div>';
  }

  // ── Visningar ─────────────────────────────────────────────────────────
  function render() {
    subscribe();
    const app = document.getElementById('app'); if (!app) return;
    const me = Auth.current();
    app.innerHTML = `
      <div class="community-wrap">
        <div class="community-head">
          <h1>${Icon('users')} Community</h1>
          <p>Det som skjer i SoundCore akkurat no — musikk, video og folk, vegg til vegg.</p>
        </div>
        ${me ? composerHtml() : `<div class="community-login"><a href="#/login">Logg inn</a> for å dele noko med fellesskapet.</div>`}
        ${filterTabsHtml()}
        <div id="community-feed-list" class="community-feed"></div>
      </div>`;
    renderFeedList();
  }

  function renderProfilePosts(username, isOwner) {
    subscribe();
    _profileUser = username;
    const el = document.getElementById('tab-innlegg'); if (!el) return;
    const me = Auth.current();
    const composer = (isOwner && me) ? composerHtml() : '';
    el.innerHTML = `${composer}<div id="innlegg-list" class="community-feed"></div>`;
    renderProfileList();
  }

  return {
    render, renderProfilePosts, post, setWallVisibility, deletePost, subscribe,
    shareMedia, unshareMedia, isShared, autoShareOn, setAutoShare, setFilter,
  };
})();
window.Community = Community;
