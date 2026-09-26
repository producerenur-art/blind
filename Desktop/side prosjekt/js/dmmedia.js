// Delte medier i private meldingar: lydspor (kind 'text' med prefiks, så serveren
// ikkje treng endring) + rendering. Bilete/GIF går som kind 'gif' (img-URL).
// Lydspor blir lagra som  sc:audio|<https-url>|<tittel>
const DmMedia = (() => {
  const AUD = 'sc:audio|';
  const MAX_AUDIO = 50 * 1024 * 1024;
  let _el = null;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function toast(m, t) { if (window.App && App.toast) App.toast(m, t || 'info'); }

  function isAudio(m) { return !!m && m.kind !== 'gif' && typeof m.text === 'string' && m.text.startsWith(AUD); }
  function encodeAudio(url, title) { return AUD + url + '|' + String(title || 'Track').replace(/\|/g, '/').slice(0, 120); }
  function parseAudio(text) {
    const rest = String(text).slice(AUD.length); const i = rest.indexOf('|');
    return { url: i < 0 ? rest : rest.slice(0, i), title: (i < 0 ? '' : rest.slice(i + 1)) || 'Track' };
  }
  // Kort tekst for varsel/e-post.
  function label(m) { return m.kind === 'gif' ? 'a GIF/image' : isAudio(m) ? 'a track' : m.text; }

  // HTML for lydspor-melding (elles null).
  function audioHtml(m) {
    if (!isAudio(m)) return null;
    const a = parseAudio(m.text);
    if (!/^https:\/\//i.test(a.url)) return esc('[track]');
    return `<div class="dm-audio"><div class="dm-audio-title">🎵 ${esc(a.title)}</div><audio controls preload="none" src="${esc(a.url)}" style="width:100%;max-width:260px"></audio></div>`;
  }

  function close() { if (_el) { _el.remove(); _el = null; } document.removeEventListener('keydown', _k); }
  function _k(e) { if (e.key === 'Escape') close(); }

  // Velg lydfil → førehandsvising → «Send» lastar opp og kallar cb(encodedText).
  function pickAudio(cb, opts) {
    opts = opts || {};
    close();
    let file = null, objUrl = null;
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:1rem';
    el.innerHTML = `
      <div role="dialog" aria-label="Share music" style="width:min(440px,100%);background:var(--bg-card,#14171f);color:var(--text,#eee);border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:1.1rem;box-shadow:0 20px 60px rgba(0,0,0,.6)">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.8rem">
          <b>${esc(opts.title || 'Share music')}</b>
          <button type="button" data-a="close" style="background:none;border:none;color:inherit;font-size:1.3rem;cursor:pointer">×</button>
        </div>
        <label class="btn btn-primary" style="display:flex;justify-content:center;cursor:pointer;margin:0 0 .6rem">
          Choose an audio file
          <input type="file" accept="audio/*" data-a="file" style="display:none">
        </label>
        <input type="text" data-a="name" placeholder="Title" maxlength="100" style="width:100%;box-sizing:border-box;padding:.6rem .7rem;border-radius:8px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.06);color:inherit;display:none">
        <div data-a="prev" style="margin-top:.7rem"></div>
        <div style="display:flex;gap:.5rem;justify-content:flex-end;margin-top:.8rem">
          <button type="button" class="btn btn-ghost" data-a="close">Cancel</button>
          <button type="button" class="btn btn-primary" data-a="send" disabled>Send</button>
        </div>
      </div>`;
    document.body.appendChild(el); _el = el;
    document.addEventListener('keydown', _k);
    const $ = s => el.querySelector(`[data-a="${s}"]`);
    const fileIn = $('file'), name = $('name'), prev = $('prev'), send = $('send');
    el.addEventListener('click', e => { if (e.target === el || e.target.closest('[data-a="close"]')) { if (objUrl) URL.revokeObjectURL(objUrl); close(); } });
    fileIn.addEventListener('change', () => {
      const f = fileIn.files && fileIn.files[0]; if (!f) return;
      if (!/^audio\//.test(f.type) && !/\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(f.name)) { toast('Choose an audio file', 'error'); return; }
      if (f.size > MAX_AUDIO) { toast('File is too large (max 50 MB)', 'error'); return; }
      file = f; if (objUrl) URL.revokeObjectURL(objUrl); objUrl = URL.createObjectURL(f);
      name.style.display = 'block'; name.value = f.name.replace(/\.[^.]+$/, '');
      prev.innerHTML = `<audio controls src="${objUrl}" style="width:100%"></audio>`;
      send.disabled = false;
    });
    send.addEventListener('click', async () => {
      if (!file) return;
      send.disabled = true; prev.insertAdjacentHTML('beforeend', '<div data-a="st" style="font-size:.8rem;opacity:.7;margin-top:.4rem">Uploading…</div>');
      try {
        if (!(window.SC_Storage && SC_Storage.isConfigured())) throw new Error('Upload is not available right now');
        const up = await SC_Storage.upload(file, { prefix: 'audio' });
        if (!up.url) throw new Error('Upload failed');
        const text = encodeAudio(up.url, name.value.trim() || file.name);
        if (objUrl) URL.revokeObjectURL(objUrl);
        close();
        cb && cb(text);
      } catch (e) {
        const st = el.querySelector('[data-a="st"]'); if (st) { st.style.color = '#ff8a8a'; st.textContent = e.message || 'Upload failed'; }
        send.disabled = false;
      }
    });
  }

  return { isAudio, encodeAudio, parseAudio, audioHtml, label, pickAudio };
})();
window.DmMedia = DmMedia;
