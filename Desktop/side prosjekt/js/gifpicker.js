// Felles GIF-velgar (erstattar prompt()-boksen «Paste a GIF URL»).
// GifPicker.open(cb) → cb(url) med ein bruksklar https-URL. To vegar:
//   1) Last opp ei GIF frå eiga maskin (via SC_Storage → Supabase, offentleg URL)
//   2) Lim inn ei lenke: direkte .gif/.webp, media.giphy.com/media.tenor.com,
//      eller ei giphy.com/gifs/...-<id>-side (blir omgjort til direkte GIF-lenke)
// Ingen ekstern API-nøkkel trengst.
const GifPicker = (() => {
  const MAX_BYTES = 8 * 1024 * 1024;
  let _el = null;

  function _toast(msg, type) { if (window.App && App.toast) App.toast(msg, type || 'info'); }
  function _esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

  // Normaliser innlimt lenke → direkte bilde-URL, eller null om ho ikkje går an.
  function normalizeUrl(raw) {
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
    return null;
  }

  function close() { if (_el) { _el.remove(); _el = null; } document.removeEventListener('keydown', _onKey); }
  function _onKey(e) { if (e.key === 'Escape') close(); }

  function open(cb) {
    close();
    let chosen = null;
    const el = document.createElement('div');
    el.className = 'gifpick-overlay';
    el.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:1rem';
    el.innerHTML = `
      <div class="gifpick-box" role="dialog" aria-label="Add a GIF" style="width:min(440px,100%);background:var(--bg-card,#14171f);color:var(--text,#eee);border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:1.1rem;box-shadow:0 20px 60px rgba(0,0,0,.6)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.8rem">
          <b style="font-size:1.05rem">Add a GIF</b>
          <button type="button" data-gp="close" title="Close" style="background:none;border:none;color:inherit;font-size:1.3rem;cursor:pointer">×</button>
        </div>
        <label class="btn btn-primary" style="display:flex;justify-content:center;cursor:pointer;margin:0 0 .6rem">
          Upload a GIF from your device
          <input type="file" accept="image/gif,image/webp,image/*" data-gp="file" style="display:none">
        </label>
        <div style="text-align:center;opacity:.6;font-size:.8rem;margin:.4rem 0">or paste a link (.gif, Giphy, Tenor)</div>
        <input type="text" data-gp="url" placeholder="https://media.giphy.com/…/giphy.gif" style="width:100%;box-sizing:border-box;padding:.6rem .7rem;border-radius:8px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.06);color:inherit">
        <div data-gp="preview" style="margin-top:.7rem;min-height:1rem;text-align:center"></div>
        <div style="display:flex;gap:.5rem;justify-content:flex-end;margin-top:.8rem">
          <button type="button" class="btn btn-ghost" data-gp="close">Cancel</button>
          <button type="button" class="btn btn-primary" data-gp="send" disabled>Send GIF</button>
        </div>
      </div>`;
    document.body.appendChild(el); _el = el;
    document.addEventListener('keydown', _onKey);

    const $ = s => el.querySelector(`[data-gp="${s}"]`);
    const prev = $('preview'), send = $('send'), urlIn = $('url'), fileIn = $('file');

    function setChosen(url) {
      chosen = url; send.disabled = !url;
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
      const n = normalizeUrl(urlIn.value);
      if (urlIn.value.trim() && !n) { chosen = null; send.disabled = true; prev.innerHTML = '<span style="opacity:.6;font-size:.85rem">Use a direct .gif link or a Giphy link</span>'; }
      else setChosen(n);
    });
    urlIn.addEventListener('keydown', e => { if (e.key === 'Enter' && chosen) send.click(); });
    fileIn.addEventListener('change', async () => {
      const f = fileIn.files && fileIn.files[0];
      if (!f) return;
      if (!/^image\//.test(f.type)) { _toast('Choose a GIF/image file', 'error'); return; }
      if (f.size > MAX_BYTES) { _toast('GIF is too large (max 8 MB)', 'error'); return; }
      prev.innerHTML = '<span class="spinner" style="width:16px;height:16px;border-width:2px"></span> Uploading…';
      send.disabled = true;
      try {
        if (!(window.SC_Storage && SC_Storage.isConfigured())) throw new Error('Upload is not available right now — paste a link instead');
        const up = await SC_Storage.upload(f, { prefix: 'gif' });
        setChosen(up.url);
      } catch (e) {
        prev.innerHTML = `<span style="color:#ff8a8a;font-size:.85rem">${_esc(e.message || 'Upload failed')}</span>`;
      }
    });
    send.addEventListener('click', () => {
      if (!chosen) return;
      const url = chosen; close();
      try { cb && cb(url); } catch (e) { console.warn('[GifPicker]', e); }
    });
    setTimeout(() => urlIn.focus(), 30);
  }

  return { open, close, normalizeUrl };
})();
window.GifPicker = GifPicker;
