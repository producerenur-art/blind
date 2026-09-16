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
    return d.toLocaleDateString('nb-NO', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  // ── Listevisning: #/live-archive ──────────────────────────────────────────────
  function _listShell() {
    return `
      <div class="mag-page">
        <a class="mag-back" href="#/">← Tilbake til SiriusFM</a>
        <div class="mag-hero">
          <div class="mag-hero-badge">${_I('radio')} Live-arkiv</div>
          <h1 class="mag-hero-title">Live-arkiv</h1>
          <p class="mag-hero-sub">En oversikt over DJ-er og radiostasjoner verden over som har spilt live på SiriusFM.</p>
        </div>
        <div id="la-now"></div>
        <div id="la-grid">Laster…</div>
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
          <div class="mag-card-meta"><span></span><span class="mag-card-cta">Se →</span></div>
        </div>
      </a>`;
  }

  async function _loadList() {
    const nowBox = document.getElementById('la-now');
    const grid = document.getElementById('la-grid');
    if (!grid) return;
    if (typeof LiveBroadcastSync === 'undefined' || !LiveBroadcastSync._enabled()) {
      grid.innerHTML = `<div class="mag-empty">Arkivet krever at skylagring er satt opp.</div>`;
      return;
    }
    const [live, archive] = await Promise.all([LiveBroadcastSync.listLiveNow(), LiveBroadcastSync.listArchive(60)]);
    if (nowBox && live.length) {
      nowBox.innerHTML = `
        <div class="mag-section">
          <div class="mag-section-head">🔴 <span>Live nå</span></div>
          <div class="mag-grid">${live.map(b => `
            <div class="mag-card" style="cursor:pointer" onclick="LiveGuest.tuneIn('${esc(b.room)}','${esc(b.display_name).replace(/'/g, "\\'")}')">
              <div class="mag-card-art" style="background:linear-gradient(135deg,#3a0d0d,#5e1a1a);overflow:hidden">${b.thumbnail_url ? `<img src="${esc(b.thumbnail_url)}" alt="" style="width:100%;height:100%;object-fit:cover">` : `<span class="mag-card-emoji">🔴</span>`}</div>
              <div class="mag-card-body">
                <div class="mag-card-title">${esc(b.display_name)}</div>
                <div class="mag-card-ingress">Sender nå</div>
                <div class="mag-card-meta"><span></span><span class="mag-card-cta">Hør live ▶︎</span></div>
              </div>
            </div>`).join('')}</div>
        </div>`;
    }
    grid.innerHTML = archive.length
      ? `<div class="mag-section"><div class="mag-section-head">${_I('disc')} <span>Tidligere sendinger</span></div><div class="mag-grid">${archive.map(_card).join('')}</div></div>`
      : `<div class="mag-empty">Ingen fullførte sendinger i arkivet ennå.</div>`;
  }

  // ── Detaljvisning: #/live-archive/:id ─────────────────────────────────────────
  let _current = null;
  async function _renderDetail(id) {
    const app = document.getElementById('app');
    if (!app) return;
    app.innerHTML = `<div class="mag-page"><a class="mag-back" href="#/live-archive">← Tilbake til arkivet</a><div class="mag-empty">Laster…</div></div>`;
    if (typeof LiveBroadcastSync === 'undefined' || !LiveBroadcastSync._enabled()) {
      app.innerHTML = `<div class="mag-page"><a class="mag-back" href="#/live-archive">← Tilbake til arkivet</a><div class="mag-empty">Arkivet krever at skylagring er satt opp.</div></div>`;
      return;
    }
    const b = await LiveBroadcastSync.getArchiveItem(id);
    if (!b) {
      app.innerHTML = `<div class="mag-page"><a class="mag-back" href="#/live-archive">← Tilbake til arkivet</a><div class="mag-empty">Fant ikke denne sendingen.</div></div>`;
      return;
    }
    _current = b;
    app.innerHTML = `
      <div class="mag-page">
        <a class="mag-back" href="#/live-archive">← Tilbake til arkivet</a>
        <div class="mag-article">
          <div class="mag-article-hero" style="background:linear-gradient(135deg,#1a0b3d,#3a106e);overflow:hidden;display:flex;align-items:center;justify-content:center">
            ${b.thumbnail_url ? `<img src="${esc(b.thumbnail_url)}" alt="" style="width:100%;height:100%;object-fit:cover">` : `<span class="mag-article-emoji">📡</span>`}
          </div>
          <div class="mag-article-cat">Live-arkiv · ${esc(_fmtDate(b.ended_at))}</div>
          <h1 class="mag-article-title">${esc(b.display_name)}</h1>
          ${b.message ? `<p class="mag-article-ingress">${esc(b.message)}</p>` : ''}
          <div style="margin:1rem 0">
            <button class="btn btn-primary" onclick="LiveArchive.share()">${_I('share')} Del</button>
          </div>
        </div>
      </div>`;
    window.scrollTo(0, 0);
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

  return { render, share };
})();

if (typeof window !== 'undefined') window.LiveArchive = LiveArchive;
