// Felles GIF-velgar (erstattar prompt()-boksen «Paste a GIF URL»).
// GifPicker.open(cb) → cb(url) med ein bruksklar https-URL. To vegar:
//   1) Last opp ei GIF frå eiga maskin (via SC_Storage → Supabase, offentleg URL)
//   2) Lim inn ei lenke: direkte .gif/.webp, media.giphy.com/media.tenor.com,
//      eller ei giphy.com/gifs/...-<id>-side (blir omgjort til direkte GIF-lenke)
// Ingen ekstern API-nøkkel trengst.
const GifPicker = (() => {
  const MAX_GIF = 20 * 1024 * 1024;
  // Giphy-søk (rutenett med GIF-ar). Gratis offentleg nøkkel frå developers.giphy.com
  // (Create an App → API). Utan nøkkel blir gamle lim-inn-dialogen vist.
  const GIPHY_KEY = window.GIPHY_API_KEY || '';
  let _el = null;

  function _toast(msg, type) { if (window.App && App.toast) App.toast(msg, type || 'info'); }
  function _esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  // Normaliser innlimt lenke → direkte bilde-URL, eller null om ho ikkje går an.
  function isImageLike(u) {
    try { const x = new URL(u); return /\.(gif|webp|png|jpe?g|avif)$/i.test(x.pathname) || /^(media\d*|i)\.giphy\.com$/.test(x.hostname) || /^(media\d*|c)\.tenor\.com$/.test(x.hostname); } catch (_) { return false; }
  }
  function normalizeUrl(raw, anyLink) {
    let s = String(raw || '').trim();
    if (!s) return null;
    if (!/^https?:\/\//i.test(s)) s = 'https://' + s;
    let u; try { u = new URL(s); } catch (_) { return null; }
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    const host = u.hostname.toLowerCase();
    // giphy.com/gifs/some-title-<id>  eller  giphy.com/embed/<id>
    if (/(^|\.)giphy\.com$/.test(host) && !/^media\d*\.giphy\.com$/.test(host) && host !== 'i.giphy.com') {
      const m = u.pathname.match(/\/(?:gifs|embed|stickers)\/(?:[^/]*-)?([A-Za-z0-9]+)\/?$/);
      if (m) return `https://media.giphy.com/media/${m[1]}/giphy.gif`;
      return null;
    }
    if (/\.(gif|webp|png|jpe?g)$/i.test(u.pathname)) return u.href;
    if (/^(media\d*|i)\.giphy\.com$/.test(host) || /^(media\d*|c)\.tenor\.com$/.test(host)) return u.href;
    return anyLink ? u.href : null;
  }


  function _loadImg(file) {
    return new Promise((res, rej) => {
      const u = URL.createObjectURL(file), i = new Image();
      i.onload = () => { URL.revokeObjectURL(u); res(i); };
      i.onerror = () => { URL.revokeObjectURL(u); rej(new Error('Could not read the image')); };
      i.src = u;
    });
  }
  async function _toBlob(file, maxDim, q) {
    const img = await _loadImg(file);
    let w = img.naturalWidth, h = img.naturalHeight;
    if (Math.max(w, h) > maxDim) { const k = maxDim / Math.max(w, h); w = Math.round(w * k); h = Math.round(h * k); }
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
    const ctx = cv.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); ctx.drawImage(img, 0, 0, w, h);
    return new Promise((res, rej) => cv.toBlob(b => b ? res(b) : rej(new Error('Could not process the image')), 'image/jpeg', q));
  }
  async function _shrink(file) {
    const b = await _toBlob(file, 2000, 0.88);
    return new File([b], (file.name || 'image').replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
  }
  async function _dataUrl(file) {
    const b = await _toBlob(file, 1280, 0.85);
    return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(b); });
  }

  function close() { if (_el) { _el.remove(); _el = null; } document.removeEventListener('keydown', _onKey); }
  function _onKey(e) { if (e.key === 'Escape') close(); }

  function open(cb, opts) {
    opts = opts || {};
    close();
    let chosen = null;
    const el = document.createElement('div');
    el.className = 'gifpick-overlay';
    el.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:1rem';
    el.innerHTML = `
      <div class="gifpick-box" role="dialog" aria-label="${_esc(opts.title || 'Add a GIF')}" style="width:min(${GIPHY_KEY ? 560 : 440}px,100%);max-height:92vh;overflow:auto;background:var(--bg-card,#14171f);color:var(--text,#eee);border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:1.1rem;box-shadow:0 20px 60px rgba(0,0,0,.6)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.8rem">
          <b style="font-size:1.05rem">${_esc(opts.title || 'Add a GIF')}</b>
          <button type="button" data-gp="close" title="Close" style="background:none;border:none;color:inherit;font-size:1.3rem;cursor:pointer">×</button>
        </div>
        ${GIPHY_KEY ? `
        <input type="search" data-gp="q" placeholder="Search GIFs…" autocomplete="off" style="width:100%;box-sizing:border-box;padding:.6rem .7rem;border-radius:8px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.06);color:inherit;margin-bottom:.6rem">
        <div data-gp="grid" style="columns:3;column-gap:6px;height:min(46vh,340px);overflow:auto"></div>
        <div style="text-align:right;opacity:.5;font-size:.7rem;margin:.3rem 0 .6rem">Powered by GIPHY</div>` : ''}
        <label class="btn ${GIPHY_KEY ? 'btn-ghost' : 'btn-primary'}" style="display:flex;justify-content:center;cursor:pointer;margin:0 0 .6rem">
          Upload from your device
          <input type="file" accept="image/gif,image/webp,image/*" data-gp="file" style="display:none">
        </label>
        <div style="text-align:center;opacity:.6;font-size:.8rem;margin:.4rem 0">or paste a link (${opts.anyLink ? 'image, GIF, SoundCloud, YouTube…' : 'image, .gif, Giphy'})</div>
        <input type="text" data-gp="url" placeholder="https://media.giphy.com/…/giphy.gif" style="width:100%;box-sizing:border-box;padding:.6rem .7rem;border-radius:8px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.06);color:inherit">
        <div data-gp="preview" style="margin-top:.7rem;min-height:1rem;text-align:center"></div>
        <div style="display:flex;gap:.5rem;justify-content:flex-end;margin-top:.8rem">
          <button type="button" class="btn btn-ghost" data-gp="close">Cancel</button>
          <button type="button" class="btn btn-primary" data-gp="send" disabled>Send</button>
        </div>
      </div>`;
    document.body.appendChild(el); _el = el;
    document.addEventListener('keydown', _onKey);

    const $ = s => el.querySelector(`[data-gp="${s}"]`);
    const prev = $('preview'), send = $('send'), urlIn = $('url'), fileIn = $('file');

    function setChosen(url) {
      chosen = url; send.disabled = !url;
      if (url && opts.anyLink && !isImageLike(url)) {
        prev.innerHTML = `<div style="font-size:.85rem;opacity:.85;word-break:break-all">🔗 ${_esc(url)}<br><span style="opacity:.6">Will be added as a link (with preview)</span></div>`;
        return;
      }
      prev.innerHTML = url
        ? `<img src="${_esc(url)}" alt="GIF preview" style="max-width:100%;max-height:220px;border-radius:8px">`
        : '';
      const img = prev.querySelector('img');
      if (img) img.onerror = () => { prev.innerHTML = '<span style="color:#ff8a8a;font-size:.85rem">Could not load this image</span>'; chosen = null; send.disabled = true; };
    }

    el.addEventListener('click', e => {
      if (e.target === el || e.target.closest('[data-gp="close"]')) close();
    });
    urlIn.addEventListener('input', () => {
      const n = normalizeUrl(urlIn.value, opts.anyLink);
      if (urlIn.value.trim() && !n) { chosen = null; send.disabled = true; prev.innerHTML = '<span style="opacity:.6;font-size:.85rem">' + (opts.anyLink ? 'Paste a valid link' : 'Use a direct image/.gif link or a Giphy link') + '</span>'; }
      else setChosen(n);
    });
    urlIn.addEventListener('keydown', e => { if (e.key === 'Enter' && chosen) send.click(); });
    function showErr(msg) {
      chosen = null; send.disabled = true;
      prev.innerHTML = `<span style="color:#ff8a8a;font-size:.85rem">${_esc(msg)}</span>`;
    }
    fileIn.addEventListener('change', async () => {
      let f = fileIn.files && fileIn.files[0];
      fileIn.value = '';                       // lar deg velje same fil igjen
      if (!f) return;
      if (!/^image\//.test(f.type) && !/\.(gif|png|jpe?g|webp|avif)$/i.test(f.name)) { showErr('Choose an image or GIF file'); return; }
      const isGif = /gif$/i.test(f.type) || /\.gif$/i.test(f.name);
      prev.innerHTML = '<span class="spinner" style="width:16px;height:16px;border-width:2px"></span> Uploading…';
      send.disabled = true;
      try {
        if (isGif && f.size > MAX_GIF) throw new Error('GIF is too large (max 20 MB)');
        if (!isGif && f.size > 2 * 1024 * 1024) f = await _shrink(f);        // store bilete → JPEG, maks 2000px
        if (!(window.SC_Storage && SC_Storage.isConfigured())) throw new Error('cloud');
        let url;
        try { url = (await SC_Storage.upload(f, { prefix: 'gif' })).url; }
        catch (e) { console.warn('[GifPicker] upload feila', e); throw new Error('cloud'); }
        if (!url) throw new Error('cloud');
        setChosen(url);
      } catch (e) {
        if (e.message === 'cloud' && opts.dataFallback && !isGif) {
          try { setChosen(await _dataUrl(f)); return; } catch (e2) { console.warn(e2); }
        }
        showErr(e.message === 'cloud' ? 'Upload failed — try again, or paste a link instead' : (e.message || 'Upload failed'));
      }
    });
    send.addEventListener('click', () => {
      if (!chosen) return;
      const url = chosen; close();
      try { cb && cb(url); } catch (e) { console.warn('[GifPicker]', e); }
    });
    if (GIPHY_KEY) {
      const qIn = $('q'), grid = $('grid');
      let timer = null, seq = 0, offset = 0, term = '', busy = false, done = false;
      async function load(reset) {
        if (busy || (done && !reset)) return;
        if (reset) { offset = 0; done = false; grid.innerHTML = ''; grid.scrollTop = 0; }
        busy = true; const my = ++seq;
        const ep = term ? 'search' : 'trending';
        const u = `https://api.giphy.com/v1/gifs/${ep}?api_key=${encodeURIComponent(GIPHY_KEY)}&limit=24&offset=${offset}&rating=pg-13&bundle=messaging_non_clips` + (term ? `&q=${encodeURIComponent(term)}` : '');
        try {
          const r = await fetch(u); const j = await r.json();
          if (my !== seq) return;
          const list = (j && j.data) || [];
          if (!list.length) { done = true; if (!grid.children.length) grid.innerHTML = '<div style="opacity:.6;font-size:.85rem;padding:.5rem">No GIFs found</div>'; }
          list.forEach(g => {
            const im = g.images || {};
            const th = im.fixed_width_small || im.fixed_width || im.downsized;
            const full = (im.downsized_medium || im.original || {}).url;
            if (!th || !full) return;
            const b = document.createElement('button');
            b.type = 'button'; b.title = g.title || 'GIF';
            b.style.cssText = 'display:block;width:100%;margin:0 0 6px;padding:0;border:0;border-radius:6px;overflow:hidden;cursor:pointer;background:rgba(255,255,255,.06);break-inside:avoid';
            b.innerHTML = `<img src="${_esc(th.url)}" alt="${_esc(g.title || 'GIF')}" loading="lazy" style="display:block;width:100%;height:auto">`;
            b.addEventListener('click', () => { const url = full.split('?')[0]; close(); try { cb && cb(url); } catch (e) { console.warn('[GifPicker]', e); } });
            grid.appendChild(b);
          });
          offset += list.length;
        } catch (e) {
          if (my === seq && !grid.children.length) grid.innerHTML = '<div style="color:#ff8a8a;font-size:.85rem;padding:.5rem">Could not load GIFs — upload or paste a link below</div>';
        } finally { if (my === seq) busy = false; }
      }
      qIn.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(() => { term = qIn.value.trim(); busy = false; load(true); }, 350); });
      grid.addEventListener('scroll', () => { if (grid.scrollTop + grid.clientHeight > grid.scrollHeight - 120) load(false); });
      load(true);
      setTimeout(() => qIn.focus(), 30);
      return;
    }
    setTimeout(() => urlIn.focus(), 30);
  }

  return { open, close, normalizeUrl, isImageLike };
})();
window.GifPicker = GifPicker;
