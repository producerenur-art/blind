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
    const [live, archive] = await Promise.all([LiveBroadcastSync.listLiveNow(), LiveBroadcastSync.listArchive(60)]);
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
    grid.innerHTML = archive.length
      ? `<div class="mag-section"><div class="mag-section-head">${_I('disc')} <span>Past broadcasts</span></div><div class="mag-grid">${archive.map(_card).join('')}</div></div>`
      : `<div class="mag-empty">No completed broadcasts in the archive yet.</div>`;
  }

  // ── Detaljvisning: #/live-archive/:id ─────────────────────────────────────────
  let _current = null;
  async function _renderDetail(id) {
    const app = document.getElementById('app');
    if (!app) return;
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

  // ── Inngang ──────────────────────────────────────────────────────────────────
  function render(id) {
    const app = document.getElementById('app');
    if (!app) return;
    if (id) { _renderDetail(id); return; }
    app.innerHTML = _listShell();
    window.scrollTo(0, 0);
    _loadList();
  }

  return { render, share, openEdit, saveEdit, _pickEditThumb };
})();

if (typeof window !== 'undefined') window.LiveArchive = LiveArchive;
