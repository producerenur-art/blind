// Community — global community-feed (/community) + profil-«Innlegg»-fane.
// Veggen er nå et Facebook-aktig media-rom: tekst-status + bilde + opplastet musikk/
// video/YouTube/Blend fra alle brukere, med kommentarer + 👍/👎 (Social) under hvert
// kort. Innlegg ligger i SC.NS.posts (Gun). Publikum styres av brukerens globale vegg-
// innstilling (wallVisibility: 'public' | 'friends'); 'friends'-innlegg bærer med seg en
// snapshot-liste (allow) så andre nettlesere kan filtrere riktig. Ny lyd → «pling».
const Community = (() => {

  const _posts = {};            // id → post (+ _k = Gun-nøkkel)
  let _subbed = false;
  let _profileUser = null;
  let _filter = 'alt';
  let _pendingImage = null;     // { url, name } — bilde vedlagt composeren
  let _publicOnly = false;      // true på /community-veggen: alle innlegg blir offentlige
  const _sessionStart = Date.now();

  const esc = (s) => (window.SC ? SC.esc(s) : String(s || ''));

  // En http(s)-URL som peker rett på en bildefil → vises inline i innlegget.
  function isImageUrl(u) {
    return /^https?:\/\/\S+\.(?:jpe?g|png|gif|webp|avif|bmp|svg)(?:[?#]\S*)?$/i.test(String(u || ''));
  }

  function timeAgo(ts) {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60)    return 'nå nettopp';
    if (s < 3600)  return Math.floor(s / 60) + ' min siden';
    if (s < 86400) return Math.floor(s / 3600) + ' t siden';
    return Math.floor(s / 86400) + ' d siden';
  }

  function kindLabel(kind) {
    return { audio: 'ny lyd', video: 'en video', youtube: 'en video',
             image: 'et bilde', blend: 'en blend', link: 'en lenke' }[kind] || 'et innlegg';
  }

  // ── Abonnement ────────────────────────────────────────────────────────
  function subscribe() {
    if (_subbed || !window.SC) return;
    _subbed = true;
    SC.sub(SC.gun().get(SC.NS.posts).get('posts'), (p, key) => {
      if (!p || !p.id || !p.author || (!p.text && !p.kind)) return;
      _posts[p.id] = { ...p, _k: key };
      // «Pling» når ny LYD lander på veggen (ikke min egen, ikke historikk).
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
      // Forsidens samlede feed re-rendres når nye innlegg kommer inn.
      if (document.getElementById('sc-home-feed') && window.App && App.refreshHomeFeed) App.refreshHomeFeed();
    });
  }

  // Alle innlegg den nåværende brukeren har lov til å se (brukt av forsidens feed).
  function visiblePosts() {
    const me = Auth.current();
    return Object.values(_posts).filter(p => canSee(p, me));
  }

  // 'friends'-innlegg er bare synlige for forfatteren + de i allow-lista.
  function canSee(p, viewer) {
    if (p.audience !== 'friends') return true;
    if (!viewer) return false;
    if (p.author === viewer.username) return true;
    try { return JSON.parse(p.allow || '[]').includes(viewer.username); } catch { return false; }
  }

  // ── Auto-deling (lar brukeren styre om nye opplastinger går til veggen) ──
  function autoShareOn() { return localStorage.getItem('sc_autoshare') !== '0'; }
  function setAutoShare(on) {
    localStorage.setItem('sc_autoshare', on ? '1' : '0');
    if (typeof App !== 'undefined') App.toast(on ? '🌐 Nye opplastinger deles til Community' : 'Auto-deling av', 'info', 2000);
  }

  // Er denne kilden (media-id) allerede delt på veggen?
  function isShared(sourceId) {
    return !!sourceId && Object.values(_posts).some(p => p.sourceId === sourceId);
  }

  // Del et media-element til veggen. Kalles automatisk fra opplasting + manuelt.
  // opts: { kind, name, url?, youtubeId?, sourceId?, caption?, audience? }
  function shareMedia(opts) {
    const me = Auth.current();
    if (!me || !window.SC || !opts || !opts.kind) return null;
    if (opts.sourceId && isShared(opts.sourceId)) return null;     // ikke dobbel-del
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
    catch (e) { console.warn('[Community] shareMedia feilet', e); }
    _posts[p.id] = { ...p };
    if (window.Notify) Notify.notifyFriends(me, { type: 'upload', text: `delte ${kindLabel(p.kind)} på veggen`, link: '#/community' });
    return p.id;
  }

  // Fjern et delt media-element (alle innlegg med samme sourceId, mine).
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

  // ── Bildevedlegg (composer) ───────────────────────────────────────────
  // Skalerer ned store bilder til en kompakt JPEG slik at de kan deles via Gun
  // selv uten skylagring (data-URL funker for alle som ser innlegget).
  function downscaleImage(file, maxDim = 1280, quality = 0.72) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const scale = maxDim / Math.max(width, height);
          width = Math.round(width * scale); height = Math.round(height * scale);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        try { resolve(canvas.toDataURL('image/jpeg', quality)); }
        catch (e) { reject(e); }
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Kunne ikke lese bildet')); };
      img.src = url;
    });
  }

  async function addImage(files) {
    const me = Auth.current();
    if (!me) { if (typeof Router !== 'undefined') Router.go('/login'); return; }
    const file = files && files[0];
    if (!file || !/^image\//.test(file.type)) { if (typeof App !== 'undefined') App.toast('Velg en bildefil', 'error'); return; }
    const preview = document.getElementById('sc-post-img-preview');
    if (preview) preview.innerHTML = `<span class="spinner" style="width:16px;height:16px;border-width:2px"></span> Behandler bilde…`;
    try {
      const useCloud = (typeof SC_Storage !== 'undefined') && SC_Storage.isConfigured();
      let url;
      if (useCloud) {
        try { url = (await SC_Storage.upload(file, { prefix: 'image' })).url; }
        catch (e) { url = await downscaleImage(file); }   // fall tilbake til data-URL
      } else {
        url = await downscaleImage(file);
      }
      _pendingImage = { url, name: file.name };
      if (preview) preview.innerHTML = `
        <div style="position:relative;display:inline-block;margin-top:0.25rem">
          <img src="${url}" alt="" style="max-width:170px;max-height:130px;border-radius:8px;display:block">
          <button type="button" onclick="Community.clearImage()" title="Fjern bilde" style="position:absolute;top:4px;right:4px;background:rgba(0,0,0,0.65);border:none;color:#fff;border-radius:50%;width:24px;height:24px;cursor:pointer;display:flex;align-items:center;justify-content:center">${Icon('x')}</button>
        </div>`;
    } catch (e) {
      _pendingImage = null;
      if (preview) preview.innerHTML = '';
      if (typeof App !== 'undefined') App.toast('Bilde feilet: ' + e.message, 'error');
    }
  }

  function clearImage() {
    _pendingImage = null;
    const preview = document.getElementById('sc-post-img-preview');
    if (preview) preview.innerHTML = '';
    const input = document.getElementById('sc-post-img-input');
    if (input) input.value = '';
  }

  // ── Komponering (tekst-status + bilde) ────────────────────────────────
  function composerHtml() {
    const me = Auth.current();
    const vis = me.wallVisibility || 'public';
    // På Community-veggen er alt offentlig for alle innloggede — da skjuler vi
    // synlighetsvelgeren og viser bare en rolig påminnelse i stedet.
    const visControl = _publicOnly
      ? `<span class="community-composer-note">${Icon('globe')} Synlig for alle innloggede</span>`
      : `<label class="community-vis">${Icon('eye')} Synlig for:
            <select id="sc-post-vis" onchange="Community.setWallVisibility(this.value)">
              <option value="public"  ${vis === 'public'  ? 'selected' : ''}>🌐 Alle (offentlig)</option>
              <option value="friends" ${vis === 'friends' ? 'selected' : ''}>👥 Bare venner</option>
            </select>
          </label>`;
    return `
      <div class="community-composer">
        <textarea id="sc-post-input" class="community-input" placeholder="Del noe med fellesskapet…" maxlength="1000"></textarea>
        <div id="sc-post-img-preview"></div>
        <div class="community-composer-row">
          ${visControl}
          <label class="btn btn-ghost btn-sm" style="cursor:pointer;margin:0" title="Legg ved et bilde">
            <input type="file" id="sc-post-img-input" accept="image/*" style="display:none" onchange="Community.addImage(this.files)">
            ${Icon('image')} Bilde
          </label>
          <label class="community-autoshare" title="Del nye opplastinger (musikk/video/lenke) automatisk til veggen">
            <input type="checkbox" ${autoShareOn() ? 'checked' : ''} onchange="Community.setAutoShare(this.checked)"> Auto-del opplastinger
          </label>
          <button class="btn btn-primary btn-sm" onclick="Community.post()">${Icon('send')} Del</button>
        </div>
      </div>`;
  }

  function post() {
    const me = Auth.current();
    if (!me) { if (typeof Router !== 'undefined') Router.go('/login'); return; }
    const inp = document.getElementById('sc-post-input');
    const text = (inp && inp.value.trim()) || '';
    if (!text && !_pendingImage) return;     // ingenting å dele
    if (!window.SC) return;
    // På Community-veggen er alt offentlig for alle innloggede.
    const vis = _publicOnly ? 'public' : (me.wallVisibility || 'public');
    const p = {
      id: 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      author: me.username, authorDisplay: me.displayName,
      text, ts: Date.now(), audience: vis,
      kind: _pendingImage ? 'image' : 'text',
    };
    if (_pendingImage) { p.mediaUrl = _pendingImage.url; p.name = _pendingImage.name || ''; }
    if (vis === 'friends') {
      const fr = (Auth.getFriends(me.username) || []).map(f => f.username);
      p.allow = JSON.stringify([me.username, ...fr]);
    }
    try { SC.gun().get(SC.NS.posts).get('posts').set(p); }
    catch (e) { console.warn('[Community] post feilet', e); }
    _posts[p.id] = { ...p };                 // vis umiddelbart lokalt
    if (inp) inp.value = '';
    clearImage();
    renderFeedList(); renderProfileList();
    if (document.getElementById('sc-home-feed') && window.App && App.refreshHomeFeed) App.refreshHomeFeed();
    if (window.Notify) Notify.notifyFriends(me, { type: 'post', text: 'la ut et nytt innlegg', link: '#/community' });
    if (typeof App !== 'undefined') App.toast(p.kind === 'image' ? '📷 Bilde delt!' : 'Innlegg delt!', 'success');
  }

  function setWallVisibility(value) {
    const me = Auth.current(); if (!me) return;
    Auth.updateUser(me.username, { wallVisibility: value });
    if (typeof App !== 'undefined') App.toast(
      value === 'friends' ? '👥 Veggen din er nå bare for venner' : '🌐 Veggen din er nå offentlig', 'success', 2000);
  }

  function deletePost(id) {
    const me = Auth.current(); const p = _posts[id];
    if (!me || !p || p.author !== me.username) return;
    try { if (p._k) SC.gun().get(SC.NS.posts).get('posts').get(p._k).put(null); } catch {}
    delete _posts[id];
    renderFeedList(); renderProfileList();
  }

  // ── Redigering (kun forfatteren, hvis man har skrevet noe feil) ────────
  // Bytter teksten i kortet med et redigeringsfelt + Lagre/Avbryt — uten å
  // re-rendre hele lista, så de andre feltene (kommentarer m.m.) står i ro.
  function editPost(id) {
    const me = Auth.current(); const p = _posts[id];
    if (!me || !p || p.author !== me.username) return;
    const card = document.getElementById('cpost-' + id); if (!card) return;
    if (card.querySelector('.community-edit-box')) return;     // redigerer alt
    const body = card.querySelector('.community-post-body'); if (!body) return;
    const textEl = body.querySelector('.community-post-text');
    const box = document.createElement('div');
    box.className = 'community-edit-box';
    box.innerHTML =
      `<textarea class="community-input community-edit-input" maxlength="1000">${esc(p.text || '')}</textarea>
       <div class="community-edit-row">
         <button class="btn btn-primary btn-sm" onclick="Community.saveEdit('${esc(id)}')">${Icon('check')} Lagre</button>
         <button class="btn btn-ghost btn-sm" onclick="Community.cancelEdit('${esc(id)}')">${Icon('x')} Avbryt</button>
       </div>`;
    if (textEl) { textEl.style.display = 'none'; textEl.insertAdjacentElement('afterend', box); }
    else { card.querySelector('.community-post-head').insertAdjacentElement('afterend', box); }
    const ta = box.querySelector('textarea');
    ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length);
  }

  function saveEdit(id) {
    const me = Auth.current(); const p = _posts[id];
    if (!me || !p || p.author !== me.username) return;
    const card = document.getElementById('cpost-' + id);
    const ta = card && card.querySelector('.community-edit-input'); if (!ta) return;
    const text = ta.value.trim();
    p.text = text; p.edited = true; p.editedTs = Date.now();
    try { if (p._k) SC.gun().get(SC.NS.posts).get('posts').get(p._k).put({ text, edited: true, editedTs: p.editedTs }); } catch {}
    _posts[id] = p;
    renderFeedList(); renderProfileList();
    if (typeof App !== 'undefined') App.toast('Innlegg oppdatert', 'success', 2000);
  }

  function cancelEdit(id) {
    const card = document.getElementById('cpost-' + id); if (!card) return;
    const box = card.querySelector('.community-edit-box'); if (box) box.remove();
    const textEl = card.querySelector('.community-post-text'); if (textEl) textEl.style.display = '';
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
      case 'image':
        return `<div class="community-media community-blend"><img src="${esc(p.mediaUrl)}" alt="${name}" loading="lazy"></div>`;
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
    const aud = p.audience === 'friends' ? `<span class="community-aud">👥 venner</span>` : '';
    const media = (p.kind && p.kind !== 'text') ? mediaBodyHtml(p) : '';
    // Gjør delte lenker i teksten klikkbare, og sett opp et forhåndsvisnings-kort
    // (cover-bilde + play-knapp) under teksten for den første lenka — men bare når
    // innlegget ikke alt har eget media.
    const linked = (p.text && window.LinkPreview) ? LinkPreview.linkify(p.text) : { html: esc(p.text || ''), urls: [] };
    const textHtml = p.text ? `<div class="community-post-text">${linked.html}</div>` : '';
    // Bilde-URL-er i teksten vises som faktiske bilder; den første ikke-bilde-lenka
    // får forhåndsvisnings-kortet (som før).
    const inlineImgs = linked.urls.filter(isImageUrl).map(u =>
      `<div class="community-media community-blend"><img src="${esc(u)}" alt="" loading="lazy"></div>`).join('');
    const firstLink = linked.urls.find(u => !isImageUrl(u));
    const linkPrev = (!media && window.LinkPreview && firstLink)
      ? LinkPreview.cardHtml(firstLink, p.id) : '';
    const editedMark = p.edited ? `<span class="community-edited" title="Redigert">· redigert</span>` : '';
    if (window.Social) Social.setNotifyTarget('post:' + p.id, p.author);
    return `
      <div class="community-post" id="cpost-${esc(p.id)}">
        <a class="community-post-av" href="#/u/${esc(p.author)}">${esc(initial)}</a>
        <div class="community-post-body">
          <div class="community-post-head">
            <a class="community-post-name" href="#/u/${esc(p.author)}">${esc(p.authorDisplay || p.author)}</a>
            <span class="community-post-time">${timeAgo(p.ts)}</span>
            ${editedMark}
            ${aud}
            ${window.Social ? Social.friendBtn(p.author, { mini: true }) : ''}
            ${canDel ? `<span class="community-post-actions">
              <button class="community-post-edit" onclick="Community.editPost('${esc(p.id)}')" title="Rediger">${Icon('edit')}</button>
              <button class="community-post-del" onclick="Community.deletePost('${esc(p.id)}')" title="Slett">${Icon('trash')}</button>
            </span>` : ''}
          </div>
          ${textHtml}
          ${inlineImgs}
          ${linkPrev}
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
      case 'bilete':  return p.kind === 'blend' || p.kind === 'image';
      case 'innlegg': return !p.kind || p.kind === 'text';
      default:        return true;
    }
  }

  function filterTabsHtml() {
    const tabs = [['alt', 'Alt'], ['musikk', '🎵 Musikk'], ['video', '🎬 Video'], ['bilete', '🖼️ Bilder'], ['innlegg', '📝 Innlegg']];
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
      : '<div class="community-empty">Ingen innlegg her ennå. Bli den første som deler noe!</div>';
    if (window.LinkPreview) LinkPreview.hydrate(list);
  }

  function renderProfileList() {
    const list = document.getElementById('innlegg-list'); if (!list) return;
    const me = Auth.current();
    const arr = Object.values(_posts)
      .filter(p => p.author === _profileUser && canSee(p, me))
      .sort((a, b) => b.ts - a.ts);
    list.innerHTML = arr.length ? arr.map(postCardHtml).join('')
      : '<div class="community-empty">Ingen innlegg ennå.</div>';
    if (window.LinkPreview) LinkPreview.hydrate(list);
  }

  // ── Visninger ─────────────────────────────────────────────────────────
  function render() {
    subscribe();
    _publicOnly = true;          // Community-veggen: alt synlig for alle innloggede
    const app = document.getElementById('app'); if (!app) return;
    const me = Auth.current();
    app.innerHTML = `
      <div class="community-wrap">
        <div class="community-head">
          <h1>${Icon('users')} Community</h1>
          <p>Det som skjer i SoundCore akkurat nå — musikk, video og folk, vegg til vegg.</p>
        </div>
        ${me ? composerHtml() : `<div class="community-login"><a href="#/login">Logg inn</a> for å dele noe med fellesskapet.</div>`}
        ${filterTabsHtml()}
        <div id="community-feed-list" class="community-feed"></div>
      </div>`;
    renderFeedList();
  }

  function renderProfilePosts(username, isOwner) {
    subscribe();
    _publicOnly = false;         // profilveggen beholder venner/offentlig-valget
    _profileUser = username;
    const el = document.getElementById('tab-innlegg'); if (!el) return;
    const me = Auth.current();
    const composer = (isOwner && me) ? composerHtml() : '';
    el.innerHTML = `${composer}<div id="innlegg-list" class="community-feed"></div>`;
    renderProfileList();
  }

  return {
    render, renderProfilePosts, post, setWallVisibility, deletePost, subscribe,
    editPost, saveEdit, cancelEdit,
    shareMedia, unshareMedia, isShared, autoShareOn, setAutoShare, setFilter,
    addImage, clearImage, visiblePosts, postCardHtml,
  };
})();
window.Community = Community;
