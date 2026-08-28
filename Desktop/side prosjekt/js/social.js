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
    { k: 1,       e: '👍', t: 'Thumbs up', cls: '' },
    { k: -1,      e: '👎', t: 'Thumbs down', cls: 'down' },
    { k: 'angry', e: '😠', t: 'Angry',      cls: 'angry' },
    { k: 'love',  e: '😍', t: 'Love',       cls: 'love' },
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
  // Same targetKey (t.d. eit innlegg) kan vera montert FLEIRE stader samtidig —
  // mest typisk eige innlegg som ligg i BÅDE profil-fana «Innlegg» og «Community»
  // (begge panel blir verande i DOM-en, berre skjult via .hidden). Då finst same
  // id to gonger, og document.getElementById returnerer berre den FYRSTE (ofte den
  // skjulte). Det gjorde at «Send» las ein tom, skjult komposer → «kan ikkje
  // kommentere på eige innlegg». Difor: hent ALLE kopiane (querySelectorAll finn
  // duplikat der getElementById gir opp) og les input frå komposeren brukaren
  // faktisk klikka i (composerOf).
  const allById    = (id) => Array.from(document.querySelectorAll('[id="' + id + '"]'));
  const composerOf = (el) => (el && el.closest ? el.closest('.sc-cmt-composer') : null);
  const icon  = (n) => (typeof Icon === 'function' ? Icon(n) : '');
  const me    = () => (typeof Auth !== 'undefined' ? Auth.current() : null);

  function timeAgo(ts) {
    const s = Math.floor((Date.now() - ts) / 1000);
    if (s < 60)    return 'just now';
    if (s < 3600)  return Math.floor(s / 60) + ' min ago';
    if (s < 86400) return Math.floor(s / 3600) + ' h ago';
    return Math.floor(s / 86400) + ' d ago';
  }

  function setNotifyTarget(targetKey, username) { if (username) _notifyTarget[targetKey] = username; }

  // ── Varsel om kommentarar på MINE eigne innlegg/profil (robust, lokalt) ────
  // Gun-relayet leverer emit-varsel upåliteleg på tvers av einingar (avsendaren
  // sender fire-and-forget). Difor lagar eigaren si eiga eining sitt eige varsel
  // når ein kommentar landar via abonnementet — same mønster som Community sitt
  // notifyNewPost. «sidan»-grensa (cmtSince) hindrar bakoverfylling av heile
  // kommentar-historikken første gong, og «sett»-settet (cmtSeen) + deterministisk
  // id ('cmt_'+id) hindrar dobbeltvarsel på tvers av økter OG mot emit-vegen.
  const CMT_SEEN_MAX = 300;
  function cmtSince(u) {
    const k = 'sc_cmt_since_' + u;
    let v = parseInt(localStorage.getItem(k) || '0', 10);
    if (!v) { v = Date.now(); try { localStorage.setItem(k, String(v)); } catch {} }
    return v;
  }
  function cmtSeen(u) {
    try { return JSON.parse(localStorage.getItem('sc_cmt_seen_' + u) || '[]'); } catch { return []; }
  }
  function cmtSeenAdd(u, id) {
    const arr = cmtSeen(u);
    if (arr.includes(id)) return;
    arr.push(id);
    if (arr.length > CMT_SEEN_MAX) arr.splice(0, arr.length - CMT_SEEN_MAX);
    try { localStorage.setItem('sc_cmt_seen_' + u, JSON.stringify(arr)); } catch {}
  }

  // Kven skal varslast for ein tråd? profil → eigaren i nøkkelen; post/gpost →
  // forfattaren registrert via setNotifyTarget / watchOwnThread.
  function threadOwner(targetKey) {
    const pm = /^profile:(.+)$/.exec(targetKey);
    if (pm) return pm[1];
    return _notifyTarget[targetKey] || null;
  }

  // Lag eit lokalt varsel dersom kommentaren er på MITT eige innlegg/profil.
  function maybeNotifyOwn(targetKey, c) {
    if (!c || !c.id || !window.Notify || !Notify.pushLocal) return;
    const u = me(); if (!u) return;
    const owner = threadOwner(targetKey);
    if (!owner || owner !== u.username) return;                 // berre på mine eigne
    if (c.author === u.username) return;                        // ikkje mine eigne kommentarar
    if (!(c.ts > cmtSince(u.username)) || cmtSeen(u.username).includes(c.id)) return;
    cmtSeenAdd(u.username, c.id);
    const isProfile = targetKey.indexOf('profile:') === 0;
    Notify.pushLocal({
      id: 'cmt_' + c.id,
      type: 'comment',
      from: c.author, fromDisplay: c.authorDisplay || c.author,
      text: isProfile ? 'commented on your profile' : 'commented on your post',
      link: isProfile ? `#/u/${owner}` : '#/community',
      ts: c.ts,
    });
  }

  // Abonner på kommentar-tråden til eit av MINE eigne innlegg sjølv om han ikkje
  // er teikna på skjermen no — så eg får varsel uansett kva side eg er på.
  // Kalla av Community/Groups for kvart eige innlegg dei kjenner til.
  function watchOwnThread(targetKey, owner) {
    if (!owner || !targetKey) return;
    _notifyTarget[targetKey] = owner;
    subComments(targetKey);      // idempotent (_cSub) — utløyser maybeNotifyOwn når kommentarar landar
  }

  // ── Media i kommentarar (bilde/GIF/lyd/video) ─────────────────────────────
  const _pendingMedia = {};    // targetKey → { url, kind }

  function mediaKindOf(url) {
    const u = String(url || '').split(/[?#]/)[0].toLowerCase();
    if (/\.(png|jpe?g|gif|webp|avif|bmp|svg)$/.test(u)) return 'image';
    if (/\.(mp3|wav|ogg|oga|m4a|aac|flac)$/.test(u))    return 'audio';
    if (/\.(mp4|webm|mov|m4v|ogv)$/.test(u))             return 'video';
    return null;
  }
  // Første ikke-media-lenke i teksten — forankrer forhåndsvisnings-kortet til
  // kommentaren, så det blir stående selv om teksten redigeres (som for innlegg).
  function firstCommentLink(text, media) {
    if (!text || !window.LinkPreview) return '';
    const urls = (LinkPreview.linkify(text).urls) || [];
    return urls.find(u => u !== media && !mediaKindOf(u)) || '';
  }
  function mediaHtml(url, kind) {
    kind = kind || mediaKindOf(url);
    const u = esc(url);
    if (kind === 'image') return `<img class="sc-cmt-media-img" src="${u}" alt="" loading="lazy">`;
    if (kind === 'audio') return `<audio class="sc-cmt-media-audio" src="${u}" controls preload="none"></audio>`;
    if (kind === 'video') return `<video class="sc-cmt-media-vid" src="${u}" controls preload="none" playsinline></video>`;
    return '';
  }
  // Tekst med klikkbare lenker + auto-forhåndsvisning av media-URL-ar i teksten,
  // pluss eit eventuelt eksplisitt vedlagt media (opplasta bilde / delt URL).
  function commentBodyHtml(c, canRemove, targetKey) {
    const raw = c.text || '';
    const linked = (raw && window.LinkPreview) ? LinkPreview.linkify(raw) : { html: esc(raw), urls: [] };
    const urls = linked.urls || (raw.match(/https?:\/\/[^\s]+/gi) || []);
    const previews = [];
    if (c.media) previews.push(mediaHtml(c.media, c.mediaKind));
    urls.forEach(u => { if (u !== c.media && mediaKindOf(u)) previews.push(mediaHtml(u)); });
    // Side-lenker (YouTube, Bandcamp, nettsider …) får eit forhåndsvisnings-kort
    // med cover + play — likt innlegg. Forhåndsvisninga er forankra til kommentaren
    // (c.previewUrl), ikkje til teksten, så ho blir ståande uansett tekstredigering
    // — heilt til eigaren sjølv fjernar ho (c.previewOff). Eldre kommentarar utan
    // lagra felt: utled frå teksten som før.
    const previewUrl = c.previewOff ? '' : (c.previewUrl || (urls.find(u => u !== c.media && !mediaKindOf(u)) || ''));
    const linkPrev = (window.LinkPreview && previewUrl)
      ? `<div class="community-linkprev">${LinkPreview.cardHtml(previewUrl, 'c_' + c.id)}${
          canRemove ? `<button class="community-prev-remove" onclick="Social.removeCommentPreview('${jsq(targetKey)}','${jsq(c.id)}')" title="Remove preview" aria-label="Remove preview">${icon('x')}</button>` : ''
        }</div>`
      : '';
    const textHtml = raw ? `<div class="sc-cmt-text">${linked.html}</div>` : '';
    const mediaBlock = previews.length ? `<div class="sc-cmt-media">${previews.join('')}</div>` : '';
    return textHtml + mediaBlock + linkPrev;
  }

  // ── Kommentarar ─────────────────────────────────────────────────────────
  // Speil MI EIGA Gun-kommentar opp til Supabase éin gong (self-healing for
  // kommentarar frå før CommentSync). Berre forfattaren har rett secret, og vi
  // hoppar over om vi alt har prøvd id-en denne økta.
  const _backfilled = new Set();
  function _backfillOwn(targetKey, c) {
    if (!window.CommentSync || !CommentSync._enabled()) return;
    const u = me();
    if (!u || !c || c.author !== u.username || _backfilled.has(c.id)) return;
    _backfilled.add(c.id);
    CommentSync.push(targetKey, c);
  }

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
      if (isProfile && typeof App !== 'undefined' && App.updateNavBadge) App.updateNavBadge();   // hald nav-merket i synk
    };
    ref.map().on((c, key) => {
      const store = _comments[targetKey];
      if (c === null || c === undefined) {                       // sletta
        for (const id in store) if (store[id]._k === key) { delete store[id]; break; }
        bump(); return;
      }
      if (!c.id || (!c.text && !c.media)) return;
      const isNew = !store[c.id];
      store[c.id] = { id: c.id, author: c.author, authorDisplay: c.authorDisplay, text: c.text || '', ts: c.ts,
        media: c.media || '', mediaKind: c.mediaKind || '', edited: !!c.edited,
        previewUrl: c.previewUrl || '', previewOff: !!c.previewOff, _k: key };
      if (isNew) maybeNotifyOwn(targetKey, store[c.id]);
      // Sjølv-lækjande backfill: kommentarar som blei skrivne FØR CommentSync
      // (eller på ei eldre bygg) ligg berre i Gun. Når Gun leverer MIN EIGEN
      // kommentar, speil han opp til Supabase — berre forfattaren har secreten
      // som RPC-en godtek, så dette er einaste eininga som kan migrera han.
      // Idempotent (upsert på id); gjer den gamle admin-kommentaren synleg på
      // alle einingar utan at forfattaren må skrive han på nytt.
      _backfillOwn(targetKey, store[c.id]);
      bump();
    });
  }

  // ── Sky-backfill av kommentarar (Supabase, via CommentSync) ───────────────
  // Gun-relayet leverer ikkje kommentarar pålitelig på tvers av einingar/
  // nettlesarar (ADMIN sitt svar var ikkje synleg for Aon). Vi hentar difor den
  // varige, delte kommentar-lista frå Supabase og fletter den inn i _comments,
  // så ALLE som kjem inn ser dei — same additive mønster som CommunitySync gjer
  // for innlegg. Slettingar gjort lokalt hugsast i _deleted så polling ikkje
  // legg dei inn att.
  const _deleted = new Set();        // kommentar-id-ar sletta lokalt → aldri re-hydrer
  let _remoteHydrating = false;
  let _pollTimer = null;
  const POLL_MS = 12000;

  function _anyCmtListInDom() {
    return !!document.querySelector('.sc-cmt-list');
  }

  async function hydrateRemote() {
    if (!window.CommentSync || !CommentSync._enabled() || _remoteHydrating) return;
    _remoteHydrating = true;
    try {
      const rows = await CommentSync.list(400);
      const touched = new Set();
      for (const c of rows) {
        if (!c || !c.id || !c._target || _deleted.has(c.id)) continue;
        const targetKey = c._target;
        const store = _comments[targetKey] = _comments[targetKey] || {};
        const cur = store[c.id];
        const incoming = {
          id: c.id, author: c.author, authorDisplay: c.authorDisplay,
          text: c.text || '', ts: c.ts,
          media: c.media || '', mediaKind: c.mediaKind || '', edited: !!c.edited,
          previewUrl: c.previewUrl || '', previewOff: !!c.previewOff,
          _k: cur ? cur._k : undefined,        // behald Gun-nøkkel om vi alt har han
        };
        if (!cur) {
          store[c.id] = incoming; touched.add(targetKey);
          maybeNotifyOwn(targetKey, store[c.id]);   // varsle òg for dei som kjem via sky
        } else if ((c.edited && cur.text !== incoming.text) || (!cur.author && incoming.author)
                   || (!!cur.previewOff !== incoming.previewOff) || ((cur.previewUrl || '') !== incoming.previewUrl)) {
          store[c.id] = { ...cur, ...incoming, _k: cur._k }; touched.add(targetKey);
        }
      }
      touched.forEach(tk => {
        if (document.getElementById('sc-cmt-list-' + domId(tk))) renderComments(tk);
      });
      if (touched.size && typeof App !== 'undefined' && App.updateNavBadge) App.updateNavBadge();
    } finally { _remoteHydrating = false; }
  }

  function startPolling() {
    if (_pollTimer || typeof document === 'undefined') return;
    _pollTimer = setInterval(() => {
      if (!_anyCmtListInDom()) { stopPolling(); return; }   // ingen tråd open → stopp
      if (document.visibilityState === 'hidden') return;    // spar data/batteri
      hydrateRemote();
      hydrateReactionsRemote();       // hald smiley-reaksjonane ferske for alle

    }, POLL_MS);
    if (!startPolling._visBound) {
      startPolling._visBound = true;
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && _anyCmtListInDom()) { hydrateRemote(); hydrateReactionsRemote(); }
      });
    }
  }
  function stopPolling() { if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; } }

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
    setTimeout(() => { renderComments(targetKey); hydrateRemote(); startPolling(); }, 0);
    return `
      <div class="sc-cmt-block">
        <div class="sc-cmt-bar">${icon('message')} <span id="sc-cmt-count-${d}"></span> comments</div>
        <div class="sc-cmt-list" id="sc-cmt-list-${d}"></div>
        ${composerHtml(targetKey)}
      </div>`;
  }

  function composerHtml(targetKey) {
    const d = domId(targetKey);
    if (!me()) return `<div class="sc-cmt-login"><a href="#/login">Log in</a> to comment.</div>`;
    return `
      <div class="sc-cmt-composer">
        <input class="sc-cmt-input" id="sc-cmt-input-${d}" placeholder="Write a comment…" maxlength="500"
          onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();Social.postComment('${jsq(targetKey)}',this)}">
        <button class="sc-cmt-emoji-btn" type="button" onclick="Social.toggleEmoji('${jsq(targetKey)}',this)" title="Emoji">😊</button>
        <label class="sc-cmt-emoji-btn" title="Upload image" style="cursor:pointer">📎
          <input type="file" accept="image/*" style="display:none" onchange="Social.addCommentImage('${jsq(targetKey)}',this.files,this)"></label>
        <button class="sc-cmt-emoji-btn" type="button" onclick="Social.shareCommentMedia('${jsq(targetKey)}',this)" title="Share image/GIF/audio/video via URL">🖼️</button>
        <button class="btn btn-primary btn-sm" onclick="Social.postComment('${jsq(targetKey)}',this)">Send</button>
        <div class="sc-emoji-bar" id="sc-emoji-${d}" style="display:none">
          ${EMOJIS.map(e => `<button type="button" class="sc-emoji-pill" onclick="Social.insertEmoji('${jsq(targetKey)}','${e}',this)">${e}</button>`).join('')}
        </div>
        <div class="sc-cmt-media-preview" id="sc-cmt-media-${d}" style="display:none"></div>
      </div>`;
  }

  // Forhåndsvis vedlagt media i komposeren + «fjern»-knapp.
  function renderPendingMedia(targetKey) {
    const boxes = allById('sc-cmt-media-' + domId(targetKey));
    if (!boxes.length) return;
    const pm = _pendingMedia[targetKey];
    const html = pm ? `
      <div class="sc-cmt-media-pending">
        ${mediaHtml(pm.url, pm.kind)}
        <button type="button" class="sc-cmt-media-del" title="Remove" onclick="Social.clearCommentMedia('${jsq(targetKey)}')">${icon('x')}</button>
      </div>` : '';
    boxes.forEach(box => {
      if (!pm) { box.style.display = 'none'; box.innerHTML = ''; return; }
      box.style.display = ''; box.innerHTML = html;
    });
  }

  async function addCommentImage(targetKey, files, el) {
    const u = me(); if (!u) { if (window.Router) Router.go('/login'); return; }
    const file = files && files[0];
    if (!file || !/^image\//.test(file.type)) { if (typeof App !== 'undefined') App.toast('Choose an image file', 'error'); return; }
    allById('sc-cmt-media-' + domId(targetKey)).forEach(box => { box.style.display = ''; box.innerHTML = 'Processing image…'; });
    try {
      let url;
      if (typeof SC_Storage !== 'undefined' && SC_Storage.isConfigured()) {
        try { url = (await SC_Storage.upload(file, { prefix: 'cmt' })).url; }
        catch (e) { url = await downscaleCommentImage(file); }
      } else { url = await downscaleCommentImage(file); }
      _pendingMedia[targetKey] = { url, kind: 'image' };
      renderPendingMedia(targetKey);
    } catch (e) {
      _pendingMedia[targetKey] = null; renderPendingMedia(targetKey);
      if (typeof App !== 'undefined') App.toast('Image failed: ' + e.message, 'error');
    }
  }

  function shareCommentMedia(targetKey) {
    const u = me(); if (!u) { if (window.Router) Router.go('/login'); return; }
    const url = (prompt('Paste a URL to an image, GIF, audio (mp3) or video (mp4):', '') || '').trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) { if (typeof App !== 'undefined') App.toast('Invalid URL', 'error'); return; }
    const kind = mediaKindOf(url);
    if (!kind) { if (typeof App !== 'undefined') App.toast('The URL must point to an image/GIF/audio/video', 'error'); return; }
    _pendingMedia[targetKey] = { url, kind };
    renderPendingMedia(targetKey);
  }

  function clearCommentMedia(targetKey) {
    _pendingMedia[targetKey] = null;
    renderPendingMedia(targetKey);
  }

  // Nedskaler bilde til data-URL (fallback når sky-lagring ikkje er konfigurert).
  function downscaleCommentImage(file, maxDim = 1280, quality = 0.85) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const s = maxDim / Math.max(width, height);
          width = Math.round(width * s); height = Math.round(height * s);
        }
        const cv = document.createElement('canvas');
        cv.width = width; cv.height = height;
        cv.getContext('2d').drawImage(img, 0, 0, width, height);
        try { resolve(cv.toDataURL('image/jpeg', quality)); } catch (e) { reject(e); }
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read the image')); };
      img.src = url;
    });
  }

  function commentRowHtml(targetKey, c, viewer) {
    const initial = (c.authorDisplay || c.author || '?').charAt(0).toUpperCase();
    const pm = /^profile:(.+)$/.exec(targetKey);
    const isWallOwner = viewer && pm && pm[1] === viewer.username;
    const isAuthor = viewer && c.author === viewer.username;
    const canDel = viewer && (isAuthor || isWallOwner);
    const editedMark = c.edited ? `<span class="sc-cmt-edited" title="Edited">· edited</span>` : '';
    return `
      <div class="sc-cmt-row" id="sc-cmt-${esc(c.id)}">
        <a class="sc-cmt-av" href="#/u/${esc(c.author)}" data-av-user="${esc(c.author)}">${esc(initial)}</a>
        <div class="sc-cmt-main">
          <div class="sc-cmt-head">
            <a class="sc-cmt-name" href="#/u/${esc(c.author)}">${esc(c.authorDisplay || c.author)}</a>
            <span class="sc-cmt-time">${timeAgo(c.ts)}</span>
            ${editedMark}
            ${friendBtn(c.author, { mini: true })}
            ${isAuthor ? `<button class="sc-cmt-edit" onclick="Social.editComment('${jsq(targetKey)}','${esc(c.id)}',this)" title="Edit">${icon('edit')}</button>` : ''}
            ${canDel ? `<button class="sc-cmt-del" onclick="Social.deleteComment('${jsq(targetKey)}','${esc(c.id)}')" title="Delete">${icon('x')}</button>` : ''}
          </div>
          <div class="sc-cmt-body" id="sc-cmt-body-${esc(c.id)}">${commentBodyHtml(c, isAuthor, targetKey)}</div>
          ${(setNotifyTarget('c:' + c.id, c.author), reactionBar('c:' + c.id))}
        </div>
      </div>`;
  }

  function renderComments(targetKey) {
    const lists = allById('sc-cmt-list-' + domId(targetKey));   // alle monteringar, ikkje berre den fyrste
    if (!lists.length) return;
    const viewer = me();
    const arr = Object.values(_comments[targetKey] || {}).sort((a, b) => a.ts - b.ts);
    const html = arr.map(c => commentRowHtml(targetKey, c, viewer)).join('');
    lists.forEach(list => {
      list.innerHTML = html;
      if (window.Profile && Profile.hydrateAvatars) Profile.hydrateAvatars(list);
      if (window.LinkPreview) LinkPreview.hydrate(list);
    });
    allById('sc-cmt-count-' + domId(targetKey)).forEach(cnt => { cnt.textContent = arr.length ? arr.length : ''; });
  }

  function postComment(targetKey, el) {
    const u = me();
    if (!u) { if (window.Router) Router.go('/login'); return; }
    // Les frå komposeren brukaren faktisk klikka/skreiv i — ikkje via getElementById,
    // som ved duplikat-montering (eige innlegg i to faner) plukkar den skjulte kopien.
    const scope = composerOf(el);
    const inp = (scope && scope.querySelector('.sc-cmt-input'))
             || document.getElementById('sc-cmt-input-' + domId(targetKey));
    const text = (inp && inp.value.trim()) || '';
    const pend = _pendingMedia[targetKey];
    if ((!text && !pend) || !window.SC) return;      // tomt → ingenting å sende
    const c = {
      id: 'c_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      author: u.username, authorDisplay: u.displayName, text, ts: Date.now(),
    };
    if (pend) { c.media = pend.url; c.mediaKind = pend.kind; }
    c.previewUrl = firstCommentLink(text, c.media);   // forankre forhåndsvisning til kommentaren
    try { SC.gun().get(SC.NS.comments).get(targetKey).set(c); }
    catch (e) { console.warn('[Social] kommentar feila', e); }
    // Vis kommentaren med ein gang lokalt (Gun-ekko kan drya) …
    const store = _comments[targetKey] = _comments[targetKey] || {};
    if (!store[c.id]) { store[c.id] = { ...c }; renderComments(targetKey); }
    // … og speil til den varige, delte sky-lista så andre einingar ser han.
    if (window.CommentSync) CommentSync.push(targetKey, c);
    if (inp) inp.value = '';
    clearCommentMedia(targetKey);
    hideEmoji(targetKey);
    const pm = /^profile:(.+)$/.exec(targetKey);
    const notifyUser = pm ? pm[1] : _notifyTarget[targetKey];
    if (notifyUser && window.Notify && notifyUser !== u.username) {
      Notify.emit(notifyUser, {
        id: 'cmt_' + c.id,      // deterministisk → dedupar mot mottakaren sin lokale pushLocal
        type: 'comment',
        text: pm ? 'commented on your profile' : 'commented on your post',
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
    _deleted.add(id);                                  // hindra at sky-polling legg han inn att
    if (window.CommentSync) CommentSync.remove(id, c.author);   // fjern frå varig sky-liste
    delete store[id];
    renderComments(targetKey);
  }

  // Inline-redigering av eigen kommentar — byter body med tekstfelt + Lagre/Avbryt.
  // Låst til forfatteren: kvar kan berre redigere SIN EIGEN kommentar, uansett kvar.
  function editComment(targetKey, id, el) {
    const u = me();
    const c = (_comments[targetKey] || {})[id];
    if (!u || !c || c.author !== u.username) return;   // kun forfatteren
    // Scope til rada brukaren klikka i — same kommentar kan vera montert fleire
    // stader (eige innlegg i to faner), då er getElementById den skjulte kopien.
    const row = el && el.closest ? el.closest('.sc-cmt-row') : null;
    const body = (row && row.querySelector('.sc-cmt-body')) || document.getElementById('sc-cmt-body-' + id);
    if (!body || body.querySelector('.sc-cmt-edit-box')) return;
    body.innerHTML = `
      <div class="sc-cmt-edit-box">
        <textarea class="sc-cmt-edit-input" maxlength="500">${esc(c.text)}</textarea>
        <div class="sc-cmt-edit-row">
          <button class="btn btn-primary btn-sm" onclick="Social.saveCommentEdit('${jsq(targetKey)}','${esc(id)}',this)">Save</button>
          <button class="btn btn-ghost btn-sm" onclick="Social.cancelCommentEdit('${jsq(targetKey)}','${esc(id)}',this)">Cancel</button>
        </div>
      </div>`;
    const ta = body.querySelector('.sc-cmt-edit-input');
    if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }
  }
  function saveCommentEdit(targetKey, id, el) {
    const u = me();
    const store = _comments[targetKey] || {};
    const c = store[id];
    if (!u || !c || c.author !== u.username) return;   // kun forfatteren
    const box = el && el.closest ? el.closest('.sc-cmt-edit-box') : null;
    const ta = (box && box.querySelector('.sc-cmt-edit-input')) || document.querySelector('.sc-cmt-edit-input');
    const text = ta ? ta.value.trim() : '';
    if (!text && !c.media) { App && App.toast && App.toast('The comment can\'t be empty', 'error'); return; }
    // Eldre kommentar utan lagra previewUrl: forankre forhåndsvisninga NÅ frå den
    // GAMLE teksten, før ho overskrivast — så kortet ikkje forsvinn når lenka
    // fjernast frå teksten. Rørt ikkje om eigaren alt har fjerna ho (previewOff).
    const previewUrl = (c.previewOff || c.previewUrl) ? (c.previewUrl || '') : (firstCommentLink(c.text, c.media) || firstCommentLink(text, c.media));
    try { if (c._k) SC.gun().get(SC.NS.comments).get(targetKey).get(c._k).put({ text, edited: true, previewUrl }); } catch {}
    store[id] = { ...c, text, edited: true, previewUrl, editedTs: Date.now() };
    // Kun forfatteren når hit → synk med eigar-push (har hemmelegheita).
    if (window.CommentSync) CommentSync.push(targetKey, store[id]);
    renderComments(targetKey);
  }
  function cancelCommentEdit(targetKey, id, el) {
    const row = el && el.closest ? el.closest('.sc-cmt-row') : null;
    const body = (row && row.querySelector('.sc-cmt-body')) || document.getElementById('sc-cmt-body-' + id);
    const c = (_comments[targetKey] || {})[id];
    const u = me();
    if (body && c) { body.innerHTML = commentBodyHtml(c, !!(u && c.author === u.username), targetKey); if (window.LinkPreview) LinkPreview.hydrate(body); }
  }

  // Eigaren fjernar forhåndsvisnings-kortet på sin eigen kommentar. previewOff
  // synkast til alle einingar (Gun + CommentSync), så kortet ikkje kjem att.
  function removeCommentPreview(targetKey, id) {
    const u = me();
    const store = _comments[targetKey] || {};
    const c = store[id];
    if (!u || !c || c.author !== u.username) return;   // kun forfatteren (samme rett som redigering)
    c.previewOff = true; c.previewUrl = '';
    try { if (c._k) SC.gun().get(SC.NS.comments).get(targetKey).get(c._k).put({ previewOff: true, previewUrl: '' }); } catch {}
    if (window.CommentSync) CommentSync.push(targetKey, c);   // varig + synleg for alle
    renderComments(targetKey);
    if (typeof App !== 'undefined' && App.toast) App.toast('Preview removed', 'success', 2000);
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
      // Sjølv-lækjande: løft mine eigne gamle Gun-reaksjonar opp til Supabase, så
      // dei blir synlege for alle einingar (skrivne før ReactionSync fanst).
      const meNow = me();
      if (meNow && user === meNow.username && window.ReactionSync && ReactionSync._enabled()) {
        const rv = _reactions[targetKey][user];
        if (rv && rv.val !== 0 && rv.val != null) ReactionSync.push(targetKey, user, rv.val, rv.ts || Date.now());
      }
      renderReactions(targetKey);
    });
  }

  function reactionBar(targetKey) {
    subReactions(targetKey);
    setTimeout(() => renderReactions(targetKey), 0);
    scheduleReactionHydrate();       // hent kryss-bruker-reaksjonane frå sky
    return `<div class="sc-react" id="sc-react-${domId(targetKey)}"></div>`;
  }

  function renderReactions(targetKey) {
    const boxes = allById('sc-react-' + domId(targetKey));
    if (!boxes.length) return;
    const r = _reactions[targetKey] || {};
    const viewer = me();
    const counts = {};
    let mine = 0;
    for (const u in r) {
      const v = r[u].val;
      if (v !== 0 && v != null) counts[v] = (counts[v] || 0) + 1;
      if (viewer && u === viewer.username) mine = v;
    }
    const html = REACTIONS.map(rx => {
      const n   = counts[rx.k] || 0;
      const arg = typeof rx.k === 'number' ? rx.k : `'${rx.k}'`;
      return `<button class="sc-react-btn ${rx.cls} ${mine === rx.k ? 'active' : ''}" onclick="Social.react('${jsq(targetKey)}',${arg})" title="${rx.t}">${rx.e} <span>${n || ''}</span></button>`;
    }).join('');
    boxes.forEach(box => { box.innerHTML = html; });
  }

  // ── Sky-backfill av reaksjonar (Supabase, via ReactionSync) ───────────────
  // Same problem/mønster som kommentarane: Gun-relayet leverer ikkje reaksjonar
  // pålitelig på tvers av einingar. Vi hentar den varige, delte reaksjons-lista
  // og fletter den inn i _reactions med «siste skriv vinn» per (mål,brukar) via
  // ts, så vi aldri overskriv ein ferskare lokal reaksjon med ein eldre sky-verdi.
  let _rxHydrating = false;
  function _coerceVal(v) {
    if (v === '1' || v === 1)   return 1;
    if (v === '-1' || v === -1) return -1;
    return v;                    // strengkodar (angry/love/oops/wow) står som dei er
  }
  async function hydrateReactionsRemote() {
    if (!window.ReactionSync || !ReactionSync._enabled() || _rxHydrating) return;
    _rxHydrating = true;
    try {
      const rows = await ReactionSync.list(2000);
      const touched = new Set();
      for (const r of rows) {
        if (!r || !r._target || !r.username) continue;
        const targetKey = r._target;
        const store = _reactions[targetKey] = _reactions[targetKey] || {};
        const cur = store[r.username];
        const ts  = Number(r.ts) || 0;
        if (cur && (Number(cur.ts) || 0) >= ts) continue;   // lokal er like fersk/ferskare
        store[r.username] = { val: _coerceVal(r.val), ts };
        touched.add(targetKey);
      }
      touched.forEach(tk => {
        if (document.getElementById('sc-react-' + domId(tk))) renderReactions(tk);
      });
    } finally { _rxHydrating = false; }
  }
  // Mange reaksjons-barar rendrast samstundes (heile feeden) → hent frå sky éin
  // gong, kort etter, i staden for per bar.
  let _rxHydrateScheduled = false;
  function scheduleReactionHydrate() {
    if (_rxHydrateScheduled || !window.ReactionSync || !ReactionSync._enabled()) return;
    _rxHydrateScheduled = true;
    setTimeout(() => { _rxHydrateScheduled = false; hydrateReactionsRemote(); }, 400);
  }

  function react(targetKey, val) {
    const u = me();
    if (!u) { if (window.Router) Router.go('/login'); return; }
    if (!window.SC) return;
    const store = _reactions[targetKey] = _reactions[targetKey] || {};
    const cur = (store[u.username] && store[u.username].val) || 0;
    const next = cur === val ? 0 : val;
    const ts = Date.now();
    store[u.username] = { val: next, ts };
    try { SC.gun().get(SC.NS.reactions).get(targetKey).get(u.username).put({ val: next, ts }); } catch {}
    // Varig, kryss-bruker: speil til Supabase så ALLE einingar ser smilyen (ikkje
    // berre denne nettlesaren via det upålitelige Gun-relayet). No-op om usett opp.
    if (window.ReactionSync) ReactionSync.push(targetKey, u.username, next, ts);
    renderReactions(targetKey);

    // ── Varsel til eigaren når nokon GIR ein reaksjon ─────────────────────────
    // Berre når ein reaksjon leggast til/byttast (next !== 0), aldri når han
    // fjernast, og aldri til deg sjølv. Same forfattar-oppslag som postComment:
    // profile:<u> → veggeigaren, elles _notifyTarget[targetKey] (post/gpost/c).
    if (next !== 0 && window.Notify) {
      const pm = /^profile:(.+)$/.exec(targetKey);
      const notifyUser = pm ? pm[1] : _notifyTarget[targetKey];
      if (notifyUser && notifyUser !== u.username) {
        const rx  = REACTIONS.find(r => r.k === next);
        const emo = rx ? rx.e : '👍';
        const where = pm ? 'your wall' : (/^c:/.test(targetKey) ? 'your comment' : 'your post');
        Notify.emit(notifyUser, {
          type: 'reaction',
          text: `reacted ${emo} to ${where}`,
          link: pm ? `#/u/${notifyUser}` : '#/community',
        });
      }
    }
  }

  // ── Emoji ─────────────────────────────────────────────────────────────────
  function toggleEmoji(targetKey, el) {
    const scope = composerOf(el);
    const bars = scope ? [scope.querySelector('.sc-emoji-bar')].filter(Boolean)
                       : allById('sc-emoji-' + domId(targetKey));
    bars.forEach(b => { b.style.display = b.style.display === 'none' ? 'flex' : 'none'; });
  }
  function hideEmoji(targetKey) {
    allById('sc-emoji-' + domId(targetKey)).forEach(b => { b.style.display = 'none'; });
  }
  function insertEmoji(targetKey, e, el) {
    const scope = composerOf(el);
    const inp = (scope && scope.querySelector('.sc-cmt-input'))
             || document.getElementById('sc-cmt-input-' + domId(targetKey));
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
      return `<button class="${sz}" onclick="${J('remove')}" title="Remove friend">${icon('check')} Friends</button>`;
    if (status === 'pending_sent')
      return `<button class="${sz}" onclick="${J('cancel')}" title="Cancel request">${icon('hourglass')} Sent</button>`;
    if (status === 'pending_received')
      return `<button class="${sz}" onclick="${J('accept')}">${icon('check')} Accept</button><button class="${sz}" onclick="${J('reject')}" title="Decline">${icon('x')}</button>`;
    return `<button class="${mini ? 'sc-friend-btn-mini sc-friend-add' : 'btn btn-primary btn-sm'}" onclick="${J('add')}">${icon('users')} Add friend</button>`;
  }

  async function friendAction(action, username) {
    const u = me();
    if (!u) { if (window.Router) Router.go('/login'); return; }
    if (action === 'add') {
      const res = Auth.sendFriendRequest(u.username, username);
      if (res && res.error) { App.toast(res.error, 'error'); return; }
      const tu = Auth.getUser(username);
      if (tu && tu.email && window.Email) Email.sendFriendRequest(tu.email, tu.displayName, u.displayName, u.username).catch(() => {});
      if (window.Notify) Notify.emit(username, { type: 'friend_request', from: u.username, fromDisplay: u.displayName, text: 'sent you a friend request', link: `#/u/${u.username}` });
      App.toast(`Friend request sent to @${username} ${icon('users')}`, 'success');
    } else if (action === 'cancel') {
      Auth.cancelFriendRequest(u.username, username); App.toast('Friend request withdrawn', 'info');
    } else if (action === 'accept') {
      const res = Auth.acceptFriendRequest(u.username, username);
      if (res && res.error) { App.toast(res.error, 'error'); return; }
      if (window.Notify) Notify.emit(username, { type: 'friend_accept', from: u.username, fromDisplay: u.displayName, text: 'accepted your friend request', link: `#/u/${u.username}` });
      if (window.FriendChat) FriendChat.refresh();
      App.toast(`You're now friends with @${username}! ${icon('party')}`, 'success');
    } else if (action === 'reject') {
      Auth.rejectFriendRequest(u.username, username); App.toast(`Friend request from @${username} declined`, 'info');
    } else if (action === 'remove') {
      Auth.removeFriend(u.username, username); App.toast(`@${username} removed from your friends list`, 'info');
    }
    if (typeof App !== 'undefined' && App.renderNav) App.renderNav();
    refreshFriendBtns();
  }

  function refreshFriendBtns() {
    document.querySelectorAll('[data-sc-friend]').forEach(el =>
      el.innerHTML = friendBtnInner(el.getAttribute('data-sc-friend'), el.getAttribute('data-mini') === '1'));
  }

  return {
    init, wallUnread, markWallSeen,
    commentsBlockHtml, postComment, deleteComment, setNotifyTarget, watchOwnThread,
    editComment, saveCommentEdit, cancelCommentEdit, removeCommentPreview,
    addCommentImage, shareCommentMedia, clearCommentMedia,
    reactionBar, react,
    toggleEmoji, insertEmoji,
    friendBtn, friendAction, refreshFriendBtns,
  };
})();
window.Social = Social;
