// VideoEditor — "videoen får bare den lyden du selv bestemmer".
// Pick one of your uploaded videos + one of your songs/mixes, then render a NEW
// video file whose audio is replaced by the chosen track (ffmpeg.wasm).
//
// ffmpeg is heavy (~30MB) so it is lazy-loaded only when the editor runs, via
// dynamic import(). We use the 0.12 SINGLE-THREAD core, which does NOT need
// SharedArrayBuffer / cross-origin isolation — so no site-wide COOP/COEP headers
// (which would otherwise break YouTube embeds, Gun, Supabase, etc.).
const VideoEditor = (() => {
  const FFMPEG_LIB  = 'https://esm.sh/@ffmpeg/ffmpeg@0.12.10';
  const FFMPEG_UTIL = 'https://esm.sh/@ffmpeg/util@0.12.1';
  const CORE_JS   = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.js';
  const CORE_WASM = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.wasm';

  let _ffmpeg = null, _loading = null, _progressCb = null;
  let _lastBlob = null, _lastUrl = null;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  function _ext(mime, fallback) {
    const m = (mime || '').split('/')[1] || fallback;
    return (m || fallback).replace(/[^a-z0-9]/gi, '') || fallback;
  }

  async function ensureFFmpeg() {
    if (_ffmpeg) return _ffmpeg;
    if (_loading) return _loading;
    _loading = (async () => {
      const { FFmpeg } = await import(/* @vite-ignore */ FFMPEG_LIB);
      const util = await import(/* @vite-ignore */ FFMPEG_UTIL);
      const ff = new FFmpeg();
      // single persistent listener → forwards to whatever _progressCb is set per-render
      ff.on('progress', ({ progress }) => { if (_progressCb) _progressCb(progress); });
      await ff.load({ coreURL: CORE_JS, wasmURL: CORE_WASM });
      ff._fetchFile = util.fetchFile;
      _ffmpeg = ff;
      return ff;
    })();
    return _loading;
  }

  async function _srcForMedia(rec) {
    if (!rec) return null;
    if (rec.mediaUrl) return rec.mediaUrl;
    return await DB.getBlobUrl('media', rec.id).catch(() => null);
  }
  async function _srcForMusic(rec) {
    if (!rec) return null;
    if (rec.audioUrl) return rec.audioUrl;
    return await DB.getBlobUrl('music', rec.id).catch(() => null);
  }

  function _status(msg, kind) {
    const el = document.getElementById('ve-status');
    if (!el) return;
    if (!msg) { el.innerHTML = ''; return; }
    const color = { info: 'var(--text2)', error: '#f87171', success: '#4ade80' }[kind] || 'var(--text2)';
    el.innerHTML = `<div style="font-size:0.85rem;font-weight:600;color:${color}">${msg}</div>`;
  }

  async function open() {
    const user = (typeof Auth !== 'undefined') && Auth.current();
    if (!user) { App.toast('Logg inn først', 'error'); return; }

    const mediaRecs = await DB.getAllByIds('media', user.mediaIds || []);
    const videos = mediaRecs.filter(r => (r.type || '').startsWith('video/'));  // not YouTube/images
    const musicRecs = await DB.getAllByIds('music', user.musicIds || []);

    const box = document.getElementById('modal-box');
    if (!box) return;

    if (!videos.length || !musicRecs.length) {
      box.innerHTML = `
        <div class="modal-header"><h2>🎬 Video + lyd</h2><button class="btn-icon" onclick="App.closeModal()">${Icon('x')}</button></div>
        <p style="color:var(--text2);line-height:1.6">
          Du trenger minst <strong>én opplastet video</strong> og <strong>én sang/mix</strong> for å bruke dette.
          ${!videos.length ? '<br>• Last opp en video i Media-fanen.' : ''}
          ${!musicRecs.length ? '<br>• Last opp musikk i Musikk-fanen.' : ''}
        </p>`;
      App.openModal();
      return;
    }

    box.innerHTML = `
      <div class="modal-header"><h2>🎬 Video + lyd</h2><button class="btn-icon" onclick="App.closeModal()">${Icon('x')}</button></div>
      <p style="color:var(--text2);margin-bottom:1rem">Velg en video og en sang — vi lager en <strong>ny video</strong> med kun den lyden du bestemmer.</p>
      <div class="form-group">
        <label class="form-label">Video</label>
        <select class="form-input" id="ve-video">
          ${videos.map(r => `<option value="${esc(r.id)}">${esc(r.name || r.id)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label class="form-label">Lyd (sang / mix)</label>
        <select class="form-input" id="ve-audio">
          ${musicRecs.map(r => `<option value="${esc(r.id)}">${esc(r.name || r.id)}</option>`).join('')}
        </select>
      </div>
      <div id="ve-status" style="margin:0.75rem 0"></div>
      <button class="btn btn-primary" id="ve-render-btn" onclick="VideoEditor.render()">${Icon('film')} Lag video</button>
      <div id="ve-result" style="margin-top:1rem"></div>
    `;
    App.openModal();
  }

  async function render() {
    const btn = document.getElementById('ve-render-btn');
    const user = Auth.current();
    if (!user) return;
    const vId = document.getElementById('ve-video')?.value;
    const aId = document.getElementById('ve-audio')?.value;
    if (!vId || !aId) { _status('Velg både video og lyd.', 'error'); return; }

    if (btn) btn.disabled = true;
    document.getElementById('ve-result').innerHTML = '';
    try {
      const vRec = await DB.get('media', vId);
      const aRec = await DB.get('music', aId);
      const vSrc = await _srcForMedia(vRec);
      const aSrc = await _srcForMusic(aRec);
      if (!vSrc || !aSrc) { _status('Fant ikke video- eller lydkilden.', 'error'); if (btn) btn.disabled = false; return; }

      _status('Laster videomotor (~30MB, kun første gang)…', 'info');
      const ff = await ensureFFmpeg();

      const vName = `in.${_ext(vRec.type, 'mp4')}`;
      const aName = `in.${_ext(aRec.mime || aRec.type, 'mp3')}`;
      _status('Klargjør filer…', 'info');
      await ff.writeFile(vName, await ff._fetchFile(vSrc));
      await ff.writeFile(aName, await ff._fetchFile(aSrc));

      _progressCb = p => {
        const pct = Math.max(0, Math.min(100, Math.round((p || 0) * 100)));
        _status(`Rendrer… ${pct}%`, 'info');
      };
      _status('Rendrer… 0%', 'info');
      // Re-encode video (libx264 ultrafast) so it works for any input/container,
      // drop the original audio, use ONLY the chosen track, stop at the shorter one.
      await ff.exec([
        '-i', vName, '-i', aName,
        '-map', '0:v:0', '-map', '1:a:0',
        '-c:v', 'libx264', '-preset', 'ultrafast',
        '-c:a', 'aac', '-b:a', '192k',
        '-shortest', '-movflags', '+faststart',
        'out.mp4',
      ]);
      _progressCb = null;

      const data = await ff.readFile('out.mp4');
      if (_lastUrl) URL.revokeObjectURL(_lastUrl);
      _lastBlob = new Blob([data], { type: 'video/mp4' });
      _lastUrl = URL.createObjectURL(_lastBlob);

      _status('Ferdig! 🎬', 'success');
      document.getElementById('ve-result').innerHTML = `
        <video src="${_lastUrl}" controls style="width:100%;border-radius:8px;max-height:50vh"></video>
        <div style="display:flex;gap:0.5rem;margin-top:0.75rem;flex-wrap:wrap">
          <button class="btn btn-primary btn-sm" onclick="VideoEditor.saveToProfile()">${Icon('upload')} Lagre på profil</button>
          <button class="btn btn-secondary btn-sm" onclick="VideoEditor.download()">${Icon('download')} Last ned</button>
        </div>`;
    } catch (e) {
      _progressCb = null;
      console.error('VideoEditor render error:', e);
      _status(`Noe gikk galt under rendringen: ${e && e.message ? e.message : e}`, 'error');
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  async function saveToProfile() {
    if (!_lastBlob) return;
    const file = new File([_lastBlob], `video-lyd-${Date.now()}.mp4`, { type: 'video/mp4' });
    await Profile.uploadMedia([file]);   // handles shared (Supabase) / local + visibility
    App.toast('Lagret på profilen din! 🎬', 'success');
    App.closeModal();
  }

  function download() {
    if (!_lastUrl) return;
    const a = document.createElement('a');
    a.href = _lastUrl; a.download = `video-lyd-${Date.now()}.mp4`;
    document.body.appendChild(a); a.click(); a.remove();
  }

  return { open, render, saveToProfile, download };
})();

if (typeof window !== 'undefined') window.VideoEditor = VideoEditor;
