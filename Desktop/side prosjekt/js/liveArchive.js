// LiveArchive — offentlig, delbar oversikt over tidligere eksterne live-
// sendinger (js/liveGuest.js). Rent metadata-arkiv (hvem/når/bilde/melding) —
// INGEN lydavspilling (js/livebroadcast.js er ren live-WebRTC-relay, ingen
// opptaksmekanisme finnes i prosjektet ennå). Malt på js/magazine.js sitt
// liste+detalj-mønster (samme .mag-* CSS-klasser), ingen innlogging krevd.
const LiveArchive = (() => {
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function _I(name) { return (typeof Icon === 'function') ? Icon(name) : ''; }

  function _fmtDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  // ── Listevisning: #/live-archive ──────────────────────────────────────────────
  function _listShell() {
    return `
      <div class="mag-page">
        <a class="mag-back" href="#/">← Back to SiriusFM</a>
        <div class="mag-hero">
          <div class="mag-hero-badge">${_I('radio')} Live Archive</div>
          <h1 class="mag-hero-title">Live Archive</h1>
          <p class="mag-hero-sub">A look back at DJs and radio stations from around the world who have played live on SiriusFM.</p>
        </div>
        <div id="la-now"></div>
        <div id="la-grid">Loading…</div>
      </div>`;
  }

  function _card(b) {
    const art = b.thumbnail_url
      ? `<img src="${esc(b.thumbnail_url)}" alt="" style="width:100%;height:100%;object-fit:cover">`
      : `<span class="mag-card-emoji">📡</span>`;
    return `
      <a class="mag-card" href="#/live-archive/${esc(b.id)}">
        <div class="mag-card-art" style="background:linear-gradient(135deg,#1a0b3d,#3a106e);overflow:hidden">${art}</div>
        <div class="mag-card-body">
          <div class="mag-card-title">${esc(b.display_name)}</div>
          <div class="mag-card-ingress">${_fmtDate(b.ended_at)}</div>
          <div class="mag-card-meta"><span></span><span class="mag-card-cta">View →</span></div>
        </div>
      </a>`;
  }

  async function _loadList() {
    const nowBox = document.getElementById('la-now');
    const grid = document.getElementById('la-grid');
    if (!grid) return;
    if (typeof LiveBroadcastSync === 'undefined' || !LiveBroadcastSync._enabled()) {
      grid.innerHTML = `<div class="mag-empty">The archive requires cloud storage to be set up.</div>`;
      return;
    }
    const [live, archive, sets] = await Promise.all([
      LiveBroadcastSync.listLiveNow(), LiveBroadcastSync.listArchive(60),
      (typeof LiveSets !== 'undefined') ? LiveSets.list(60) : Promise.resolve([]),
    ]);
    if (nowBox && live.length) {
      nowBox.innerHTML = `
        <div class="mag-section">
          <div class="mag-section-head">🔴 <span>Live now</span></div>
          <div class="mag-grid">${live.map(b => `
            <div class="mag-card" style="cursor:pointer" onclick="LiveGuest.tuneIn('${esc(b.room)}','${esc(b.display_name).replace(/'/g, "\\'")}')">
              <div class="mag-card-art" style="background:linear-gradient(135deg,#3a0d0d,#5e1a1a);overflow:hidden">${b.thumbnail_url ? `<img src="${esc(b.thumbnail_url)}" alt="" style="width:100%;height:100%;object-fit:cover">` : `<span class="mag-card-emoji">🔴</span>`}</div>
              <div class="mag-card-body">
                <div class="mag-card-title">${esc(b.display_name)}</div>
                <div class="mag-card-ingress">Broadcasting now</div>
                <div class="mag-card-meta"><span></span><span class="mag-card-cta">Listen live ▶︎</span></div>
              </div>
            </div>`).join('')}</div>
        </div>`;
    }
    const setsHtml = sets.length
      ? `<div class="mag-section"><div class="mag-section-head">${_I('disc')} <span>Live sets</span></div><div class="mag-grid">${sets.map(_setCard).join('')}</div></div>` : '';
    const archHtml = archive.length
      ? `<div class="mag-section"><div class="mag-section-head">${_I('disc')} <span>Past broadcasts</span></div><div class="mag-grid">${archive.map(_card).join('')}</div></div>` : '';
    grid.innerHTML = (setsHtml + archHtml) || `<div class="mag-empty">No completed broadcasts in the archive yet.</div>`;
  }

  // ── Detaljvisning: #/live-archive/:id ─────────────────────────────────────────
  let _current = null;
  async function _renderDetail(id) {
    const app = document.getElementById('app');
    if (!app) return;
    if (String(id).startsWith('set_')) return _renderSetDetail(id);
    app.innerHTML = `<div class="mag-page"><a class="mag-back" href="#/live-archive">← Back to the archive</a><div class="mag-empty">Loading…</div></div>`;
    if (typeof LiveBroadcastSync === 'undefined' || !LiveBroadcastSync._enabled()) {
      app.innerHTML = `<div class="mag-page"><a class="mag-back" href="#/live-archive">← Back to the archive</a><div class="mag-empty">The archive requires cloud storage to be set up.</div></div>`;
      return;
    }
    const b = await LiveBroadcastSync.getArchiveItem(id);
    if (!b) {
      app.innerHTML = `<div class="mag-page"><a class="mag-back" href="#/live-archive">← Back to the archive</a><div class="mag-empty">Could not find this broadcast.</div></div>`;
      return;
    }
    _current = b;
    const me = (typeof Auth !== 'undefined' && Auth.current) ? Auth.current() : null;
    const canEdit = typeof CONFIG !== 'undefined' && CONFIG.isAdminEmail(me);
    app.innerHTML = `
      <div class="mag-page">
        <a class="mag-back" href="#/live-archive">← Back to the archive</a>
        <div class="mag-article">
          <div class="mag-article-hero" style="background:linear-gradient(135deg,#1a0b3d,#3a106e);overflow:hidden;display:flex;align-items:center;justify-content:center">
            ${b.thumbnail_url ? `<img src="${esc(b.thumbnail_url)}" alt="" style="width:100%;height:100%;object-fit:cover">` : `<span class="mag-article-emoji">📡</span>`}
          </div>
          <div class="mag-article-cat">Live Archive · ${esc(_fmtDate(b.ended_at))}</div>
          <h1 class="mag-article-title">${esc(b.display_name)}</h1>
          ${b.message ? `<p class="mag-article-ingress">${esc(b.message)}</p>` : ''}
          <div style="margin:1rem 0;display:flex;gap:0.6rem;flex-wrap:wrap">
            <button class="btn btn-primary" onclick="LiveArchive.share()">${_I('share')} Share</button>
            ${canEdit ? `<button class="btn btn-ghost" onclick="LiveArchive.openEdit()">${_I('edit')} Edit</button>` : ''}
          </div>
          <div id="la-edit-box"></div>
        </div>
      </div>`;
    window.scrollTo(0, 0);
  }

  // ── Admin: rediger namn/bilete/melding (synleg for CONFIG.ADMIN_EMAILS) ────────
  function openEdit() {
    const b = _current;
    const box = document.getElementById('la-edit-box');
    if (!b || !box) return;
    const inp = 'width:100%;box-sizing:border-box;padding:0.65rem 0.75rem;border-radius:10px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.04);color:var(--text);font-size:0.95rem;font:inherit';
    box.innerHTML = `
      <div style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:1rem 1.1rem;margin-top:0.5rem">
        <label style="display:block;font-size:0.82rem;color:var(--text2);margin:0 0 0.3rem">Artist / display name</label>
        <input id="la-edit-name" style="${inp};margin-bottom:0.7rem" value="${esc(b.display_name)}">
        <label style="display:block;font-size:0.82rem;color:var(--text2);margin:0 0 0.3rem">Description</label>
        <textarea id="la-edit-message" rows="3" style="${inp};resize:vertical;margin-bottom:0.7rem">${esc(b.message || '')}</textarea>
        <div style="display:flex;align-items:center;gap:0.6rem;flex-wrap:wrap;margin-bottom:0.8rem">
          ${b.thumbnail_url ? `<img id="la-edit-thumb-preview" src="${esc(b.thumbnail_url)}" alt="" style="width:56px;height:56px;object-fit:cover;border-radius:10px">` : `<span id="la-edit-thumb-preview"></span>`}
          <button class="btn btn-ghost" type="button" onclick="document.getElementById('la-edit-thumb').click()">${_I('camera')} Change preview image</button>
          <input type="file" id="la-edit-thumb" accept="image/*" style="display:none" onchange="LiveArchive._pickEditThumb(this)">
        </div>
        <div style="display:flex;gap:0.6rem;flex-wrap:wrap">
          <button class="btn btn-primary" onclick="LiveArchive.saveEdit()">Save</button>
          <button class="btn btn-ghost" onclick="document.getElementById('la-edit-box').innerHTML=''">Cancel</button>
        </div>
      </div>`;
  }

  let _pendingThumbUrl = null;
  async function _pickEditThumb(input) {
    const f = input && input.files && input.files[0]; if (!f) return;
    if (typeof SC_Storage === 'undefined' || !SC_Storage.isConfigured()) { if (typeof App !== 'undefined') App.toast('Cloud storage is not set up.', 'error'); return; }
    if (typeof App !== 'undefined') App.toast('Uploading image…', 'info', 2500);
    try {
      const res = await SC_Storage.upload(f, { prefix: 'live-broadcasts' });
      _pendingThumbUrl = res.url;
      const prev = document.getElementById('la-edit-thumb-preview');
      if (prev) prev.outerHTML = `<img id="la-edit-thumb-preview" src="${esc(res.url)}" alt="" style="width:56px;height:56px;object-fit:cover;border-radius:10px">`;
    } catch (e) { if (typeof App !== 'undefined') App.toast('Upload failed: ' + e.message, 'error'); }
  }

  async function saveEdit() {
    if (!_current || typeof LiveBroadcastSync === 'undefined') return;
    const name = (document.getElementById('la-edit-name') || {}).value || '';
    const message = (document.getElementById('la-edit-message') || {}).value || '';
    const ok = await LiveBroadcastSync.adminUpdateArchiveItem(_current.id, {
      displayName: name, message, thumbnailUrl: _pendingThumbUrl,
    });
    _pendingThumbUrl = null;
    if (ok) { if (typeof App !== 'undefined') App.toast('Saved!', 'success'); await _renderDetail(_current.id); }
    else if (typeof App !== 'undefined') App.toast('Could not save changes.', 'error');
  }

  function share() {
    if (!_current || typeof Share === 'undefined') return;
    const url = Share.buildUrl({
      kind: 'image',
      title: _current.display_name,
      artist: 'SiriusFM',
      image: _current.thumbnail_url || '',
      username: _current.requester_username || '',
    });
    Share.shareUrl(url, _current.display_name, 'SiriusFM', { image: _current.thumbnail_url || '' });
  }

  // ── Live-sett (opptak): kort, detalj, redigering ──────────────────────────────
  function _fmtDur(sec) {
    sec = Math.max(0, parseInt(sec, 10) || 0);
    const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
    return h ? `${h}h ${m}m` : (sec < 60 ? `${sec} sec` : `${m} min`);
  }
  function _safeUrl(u) { return /^https?:\/\//i.test(u || '') ? u : ''; }

  const _setsById = {};
  function _setCard(b) {
    _setsById[b.id] = b;
    const art = b.cover_url
      ? `<img src="${esc(b.cover_url)}" alt="" style="width:100%;height:100%;object-fit:cover">`
      : `<span class="mag-card-emoji">🎧</span>`;
    return `
      <a class="mag-card" href="#/live-archive/${esc(b.id)}">
        <div class="mag-card-art" style="background:linear-gradient(135deg,#1a0b3d,#3a106e);overflow:hidden">${art}</div>
        <div class="mag-card-body">
          <div class="mag-card-title">${esc(b.display_name || 'Live set')}</div>
          <div class="mag-card-ingress">${b.track_title ? esc(b.track_title) : _fmtDate(b.ended_at)}</div>
          <div class="mag-card-meta"><span>${b.audio_url ? '▶ Recording' : _fmtDate(b.ended_at)}</span>
            <span style="display:flex;gap:0.5rem;align-items:center">
              <button type="button" class="btn btn-ghost btn-sm" title="Share" onclick="event.preventDefault();event.stopPropagation();LiveArchive.shareSetId('${esc(b.id)}')">${_I('share')} Share</button>
              <span class="mag-card-cta">Open →</span>
            </span></div>
        </div>
      </a>`;
  }

  // Tracklist under lydspilleren (ei linje per spor). Vist for alle.
  function _tracklistHtml(txt) {
    const lines = String(txt || '').split(/\r?\n/).map(x => x.trim()).filter(Boolean);
    if (!lines.length) return '';
    return `<div style="margin:0.4rem 0 1rem;padding:0.9rem 1.1rem;border-radius:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08)">
      <div style="font-weight:800;font-size:0.9rem;margin:0 0 0.5rem">${_I('list')} Track list</div>
      <ol style="margin:0;padding-left:1.4rem;line-height:1.75;font-size:0.92rem;color:var(--text2)">${lines.map(l => `<li>${esc(l)}</li>`).join('')}</ol>
    </div>`;
  }

  let _curSet = null;
  async function _renderSetDetail(id) {
    const app = document.getElementById('app');
    const back = `<a class="mag-back" href="#/live-archive">← Back to the archive</a>`;
    const s = (typeof LiveSets !== 'undefined') ? await LiveSets.get(id) : null;
    if (!s) { app.innerHTML = `<div class="mag-page">${back}<div class="mag-empty">Could not find this live set.</div></div>`; return; }
    _curSet = s;
    // Rediger-knappen: berre for innlogga eigar av settet (og admin) — aldri for besøkande.
    const canEdit = LiveSets.canEdit(s);
    const link = _safeUrl(s.link_url);
    app.innerHTML = `
      <div class="mag-page">
        ${back}
        <div class="mag-article">
          <div class="mag-article-hero" style="background:linear-gradient(135deg,#1a0b3d,#3a106e);overflow:hidden;display:flex;align-items:center;justify-content:center">
            ${s.cover_url ? `<img src="${esc(s.cover_url)}" alt="" style="width:100%;height:100%;object-fit:cover">` : `<span class="mag-article-emoji">🎧</span>`}
          </div>
          <div class="mag-article-cat">Live set · ${esc(_fmtDate(s.ended_at))}${s.duration_sec ? ' · ' + esc(_fmtDur(s.duration_sec)) : ''}</div>
          <h1 class="mag-article-title">${esc(s.display_name || 'Live set')}</h1>
          ${s.track_title ? `<p class="mag-article-ingress">${esc(s.track_title)}</p>` : ''}
          ${s.audio_url ? `<audio controls preload="metadata" src="${esc(s.audio_url)}" onloadedmetadata="window.Player&&Player.fixInfiniteDuration&&Player.fixInfiniteDuration(this)" style="width:100%;margin:0.8rem 0"></audio>` : `<p style="color:var(--text3);font-size:0.85rem">No recording available for this set.</p>`}
          ${_tracklistHtml(s.tracklist)}
          <div style="margin:1rem 0;display:flex;gap:0.6rem;flex-wrap:wrap">
            ${link ? `<a class="btn btn-ghost" href="${esc(link)}" target="_blank" rel="noopener noreferrer">🔗 Visit link</a>` : ''}
            <button class="btn btn-primary" onclick="LiveArchive.shareSet()">${_I('share')} Share</button>
            ${canEdit ? `<button class="btn btn-ghost" onclick="LiveArchive.openSetEdit()">${_I('edit')} Edit</button>` : ''}
          </div>
          ${_socialRow(s)}
          <div id="la-edit-box"></div>
        </div>
      </div>`;
    window.scrollTo(0, 0);
  }

  let _pendingCover = null, _pendingAudio = null;
  function openSetEdit() {
    const s = _curSet, box = document.getElementById('la-edit-box');
    if (!s || !box || !LiveSets.canEdit(s)) return;
    _pendingCover = null; _pendingAudio = null;
    const inp = 'width:100%;box-sizing:border-box;padding:0.65rem 0.75rem;border-radius:10px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.04);color:var(--text);font-size:0.95rem;font:inherit';
    const lbl = 'display:block;font-size:0.82rem;color:var(--text2);margin:0 0 0.3rem';
    box.innerHTML = `
      <div style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:1rem 1.1rem;margin-top:0.5rem">
        <label style="${lbl}">Artist / set name</label>
        <input id="las-name" style="${inp};margin-bottom:0.7rem" value="${esc(s.display_name)}">
        <label style="${lbl}">Text (e.g. song / set name)</label>
        <textarea id="las-title" rows="2" style="${inp};resize:vertical;margin-bottom:0.7rem">${esc(s.track_title || '')}</textarea>
        <label style="${lbl}">URL link (Facebook, Bandcamp, Spotify…)</label>
        <input id="las-link" style="${inp};margin-bottom:0.7rem" placeholder="https://…" value="${esc(s.link_url || '')}">
        <div style="display:flex;align-items:center;gap:0.6rem;flex-wrap:wrap;margin-bottom:0.7rem">
          <span id="las-cover-prev">${s.cover_url ? `<img src="${esc(s.cover_url)}" alt="" style="width:56px;height:56px;object-fit:cover;border-radius:10px">` : ''}</span>
          <button class="btn btn-ghost" type="button" onclick="document.getElementById('las-cover').click()">${_I('camera')} Change preview image / logo</button>
          <input type="file" id="las-cover" accept="image/*" style="display:none" onchange="LiveArchive._pickSetFile(this,'cover')">
        </div>
        <div style="display:flex;align-items:center;gap:0.6rem;flex-wrap:wrap;margin-bottom:0.8rem">
          <button class="btn btn-ghost" type="button" onclick="document.getElementById('las-audio').click()">🎵 Replace audio</button>
          <span id="las-audio-name" style="font-size:0.8rem;color:var(--text3)"></span>
          <input type="file" id="las-audio" accept="audio/*" style="display:none" onchange="LiveArchive._pickSetFile(this,'audio')">
        </div>
        <div style="display:flex;gap:0.6rem;flex-wrap:wrap">
          <button class="btn btn-primary" onclick="LiveArchive.saveSetEdit()">Save</button>
          <button class="btn btn-ghost" onclick="document.getElementById('la-edit-box').innerHTML=''">Cancel</button>
          <button class="btn btn-ghost" onclick="LiveArchive.shareSet()">${_I('share')} Share</button>
          <button class="btn" style="background:#ef4444;color:#fff;margin-left:auto" onclick="LiveArchive.deleteSet()">${_I('trash')} Delete</button>
        </div>
      </div>`;
  }

  async function deleteSet() {
    const s = _curSet;
    if (!s || !LiveSets.canEdit(s)) return;
    if (!confirm('Delete this live set permanently? This cannot be undone.')) return;
    const ok = await LiveSets.remove(s.id);
    if (ok) { if (typeof App !== 'undefined') App.toast('Live set deleted.', 'success'); location.hash = '#/live-archive'; }
    else if (typeof App !== 'undefined') App.toast('Could not delete the set.', 'error');
  }

  async function _pickSetFile(input, kind) {
    const f = input && input.files && input.files[0]; if (!f) return;
    if (typeof SC_Storage === 'undefined' || !SC_Storage.isConfigured()) { if (typeof App !== 'undefined') App.toast('Cloud storage is not set up.', 'error'); return; }
    if (typeof App !== 'undefined') App.toast('Uploading ' + (kind === 'cover' ? 'image' : 'audio') + '…', 'info', 3000);
    try {
      const res = await SC_Storage.upload(f, { prefix: kind === 'cover' ? 'live-sets-covers' : 'live-sets' });
      if (kind === 'cover') {
        _pendingCover = res.url;
        const prev = document.getElementById('las-cover-prev');
        if (prev) prev.innerHTML = `<img src="${esc(res.url)}" alt="" style="width:56px;height:56px;object-fit:cover;border-radius:10px">`;
      } else {
        _pendingAudio = res.url;
        const nm = document.getElementById('las-audio-name'); if (nm) nm.textContent = f.name;
      }
    } catch (e) { if (typeof App !== 'undefined') App.toast('Upload failed: ' + e.message, 'error'); }
  }

  async function saveSetEdit() {
    const s = _curSet; if (!s) return;
    let link = ((document.getElementById('las-link') || {}).value || '').trim();
    if (link && !/^https?:\/\//i.test(link)) link = 'https://' + link;
    const ok = await LiveSets.update(s.id, {
      displayName: (document.getElementById('las-name') || {}).value || '',
      trackTitle: (document.getElementById('las-title') || {}).value || '',
      linkUrl: link, coverUrl: _pendingCover, audioUrl: _pendingAudio,
    });
    _pendingCover = null; _pendingAudio = null;
    if (ok) { if (typeof App !== 'undefined') App.toast('Saved!', 'success'); await _renderSetDetail(s.id); }
    else if (typeof App !== 'undefined') App.toast('Could not save changes.', 'error');
  }

  function shareSetId(id) {
    const s = _setsById[id]; if (!s || typeof Share === 'undefined') return;
    Share.shareUrl(_setShareUrl(s), s.display_name || 'Live set', 'SiriusFM', { image: s.cover_url || '' });
  }

  // Delbar lenke med rik forhåndsvisning (og:image/tittel/lyd) via /s/…-sida i
  // js/share.js + api/share.js; faller tilbake til vanleg arkiv-lenke.
  function _setShareUrl(s) {
    // Kort lenke: serveren (api/share.js) slår opp settet og lagar forhandsvisning med bilde/tittel/lyd.
    const v = s.updated_at ? Date.parse(s.updated_at) : 0;
    return 'https://www.siriusfm.no/s/' + encodeURIComponent(s.id) + (v ? '?v=' + v.toString(36) : '');
  }

  function _socialRow(s) {
    const url = _setShareUrl(s), enc = encodeURIComponent(url);
    const title = (s.display_name || 'Live set') + (s.track_title ? ' — ' + s.track_title : '');
    const t = encodeURIComponent(title + ' · SiriusFM'), tt = encodeURIComponent(title);
    const nets = [
      ['Facebook', `https://www.facebook.com/sharer/sharer.php?u=${enc}`, '#1877f2'],
      ['X',        `https://twitter.com/intent/tweet?url=${enc}&text=${t}`, '#111'],
      ['WhatsApp', `https://wa.me/?text=${t}%20${enc}`, '#25d366'],
      ['Telegram', `https://t.me/share/url?url=${enc}&text=${t}`, '#229ed9'],
      ['Reddit',   `https://www.reddit.com/submit?url=${enc}&title=${tt}`, '#ff4500'],
      ['Threads',  `https://www.threads.net/intent/post?text=${t}%20${enc}`, '#000'],
      ['LinkedIn', `https://www.linkedin.com/sharing/share-offsite/?url=${enc}`, '#0a66c2'],
      ['Email',    `mailto:?subject=${tt}&body=${t}%0A%0A${enc}`, '#555'],
    ];
    return `<div style="display:flex;gap:0.45rem;flex-wrap:wrap;align-items:center;margin:0.2rem 0 1rem">
      <span style="font-size:0.8rem;color:var(--text2);margin-right:0.2rem">Share on:</span>
      ${nets.map(([n, h, bg]) => `<a href="${esc(h)}" target="_blank" rel="noopener noreferrer" style="background:${bg};color:#fff;text-decoration:none;font-size:0.8rem;font-weight:700;padding:0.4rem 0.75rem;border-radius:999px">${n}</a>`).join('')}
      <button type="button" class="btn btn-ghost btn-sm" onclick="LiveArchive.copySetLink()">📋 Copy link</button>
      <button type="button" class="btn btn-ghost btn-sm" onclick="LiveArchive.shareSet()">More…</button>
    </div>`;
  }

  async function copySetLink() {
    const s = _curSet; if (!s) return;
    const url = _setShareUrl(s);
    try { await navigator.clipboard.writeText(url); if (typeof App !== 'undefined') App.toast('Link copied 📋', 'success'); }
    catch (e) { window.prompt('Copy this link:', url); }
  }

  function shareSet() {
    const s = _curSet; if (!s || typeof Share === 'undefined') return;
    Share.shareUrl(_setShareUrl(s), s.display_name || 'Live set', 'SiriusFM', { image: s.cover_url || '' });
  }

  // ── Inngang ──────────────────────────────────────────────────────────────────
  function render(id) {
    const app = document.getElementById('app');
    if (!app) return;
    if (id) { _renderDetail(id); return; }
    app.innerHTML = _listShell();
    window.scrollTo(0, 0);
    _loadList();
  }

  return { render, share, openEdit, saveEdit, _pickEditThumb, shareSet, shareSetId, copySetLink, openSetEdit, saveSetEdit, deleteSet, _pickSetFile };
})();

if (typeof window !== 'undefined') window.LiveArchive = LiveArchive;
