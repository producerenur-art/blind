// ShareMusic — «Del musikk»-fanen (#/share). Innloggede brukere laster opp en låt
// med cover-bilde, og en AI-assistent vurderer om det trolig er et eget, originalt
// verk eller noe som allerede er utgitt/opphavsrettsbeskyttet — FØR man deler.
//
// Lagring gjenbruker samme infrastruktur som profil-musikk: Supabase Storage når
// konfigurert (delt med alle), ellers lokal IndexedDB (DB.*). Låten havner i
// brukerens `musicIds`, så den dukker opp på profilen.
const ShareMusic = (() => {
  let _coverFile = null;   // valt cover-bilde (File)
  let _coverUrl  = null;   // object-URL for forhåndsvising
  let _verdict   = null;   // siste AI-vurdering

  function _I(name) { return (typeof Icon === 'function') ? Icon(name) : ''; }
  function _esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // Naviger til fana (gjenbrukt av «Del musikk»-kortet på forsida).
  function open() {
    const cur = (typeof Auth !== 'undefined' && Auth.current) ? Auth.current() : null;
    if (!cur) {
      if (typeof App !== 'undefined') App.toast('Log in or create a free profile to share music.', 'info', 4000);
      location.hash = '#/login';
      return;
    }
    location.hash = '#/share';
  }

  function render() {
    const cur = (typeof Auth !== 'undefined' && Auth.current) ? Auth.current() : null;
    const appEl = document.getElementById('app');
    if (!appEl) return;
    if (!cur) {
      appEl.innerHTML = `
        <div class="section" style="max-width:560px;margin:3rem auto;text-align:center">
          <div class="section-title" style="justify-content:center">${_I('music')} Share music</div>
          <p style="color:var(--text2);margin:1rem 0 1.5rem">You must be logged in to upload and share a track.</p>
          <a href="#/login" class="btn btn-primary" style="display:inline-flex">${_I('log-in')} Log in</a>
        </div>`;
      return;
    }

    _coverFile = null; _coverUrl = null; _verdict = null;

    appEl.innerHTML = `
      <div class="section" style="max-width:680px;margin:1.5rem auto">
        <div class="section-header">
          <div class="section-title">${_I('music')} Share a track</div>
          <div class="section-sub">Upload audio + cover image. Let AI assess whether it is your own work or already released before you share it with the community.</div>
        </div>

        <div style="display:grid;gap:1.1rem;margin-top:1rem">
          <div style="display:grid;grid-template-columns:140px 1fr;gap:1rem;align-items:start">
            <!-- Cover-bilde -->
            <label id="sm-cover-box" title="Upload cover image"
              style="aspect-ratio:1;border:1.5px dashed rgba(255,255,255,0.18);border-radius:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0.35rem;cursor:pointer;text-align:center;color:var(--text3);overflow:hidden;background:rgba(255,255,255,0.02)">
              ${_I('image')}
              <span style="font-size:0.72rem;line-height:1.3;padding:0 0.4rem">Cover image<br>(click to upload)</span>
              <input type="file" accept="image/*" style="display:none" onchange="ShareMusic.onCover(this)">
            </label>

            <div style="display:grid;gap:0.75rem">
              <div>
                <label for="sm-title" style="display:block;font-weight:700;font-size:0.82rem;margin:0 0 0.3rem">Title</label>
                <input id="sm-title" type="text" placeholder="Track name" ${_inputStyle()}>
              </div>
              <div>
                <label for="sm-artist" style="display:block;font-weight:700;font-size:0.82rem;margin:0 0 0.3rem">Artist</label>
                <input id="sm-artist" type="text" value="${_esc(cur.displayName || cur.username)}" ${_inputStyle()}>
              </div>
            </div>
          </div>

          <!-- Lyd-fil -->
          <div>
            <label for="sm-audio" style="display:block;font-weight:700;font-size:0.82rem;margin:0 0 0.3rem">Audio file</label>
            <input id="sm-audio" type="file" accept="audio/*" ${_inputStyle()}>
          </div>

          <!-- Egenerklæring -->
          <div>
            <label for="sm-origin" style="display:block;font-weight:700;font-size:0.82rem;margin:0 0 0.3rem">What is this?</label>
            <select id="sm-origin" ${_inputStyle()}>
              <option value="original">My own, original work</option>
              <option value="remix">Remix / adaptation of someone else's work</option>
              <option value="cover">Cover of an existing track</option>
              <option value="ukjent">Unsure</option>
            </select>
          </div>

          <!-- Kontekst til AI -->
          <div>
            <label for="sm-notes" style="display:block;font-weight:700;font-size:0.82rem;margin:0 0 0.3rem">Description / where has it been released, if anywhere? <span style="color:var(--text3);font-weight:400">(optional)</span></label>
            <textarea id="sm-notes" rows="2" placeholder="E.g. genre, samples used, link to Spotify/SoundCloud if it is already out…" ${_inputStyle()}></textarea>
          </div>

          <!-- AI-vurdering -->
          <div style="background:rgba(34,197,94,0.06);border:1px solid rgba(34,197,94,0.25);border-radius:14px;padding:1rem">
            <div style="display:flex;align-items:center;gap:0.5rem;font-weight:700;font-size:0.9rem;margin-bottom:0.5rem">${_I('sparkles')} AI rights check</div>
            <p style="color:var(--text2);font-size:0.82rem;line-height:1.5;margin:0 0 0.75rem">
              Based on your information, the AI assesses whether the track is likely your own, original work or something already released. <strong>The check is mandatory</strong> and runs automatically when you share — tracks that are likely already released get blocked. This is not legal proof; you are responsible for holding the rights.
            </p>
            <button id="sm-analyze-btn" class="btn btn-ghost" onclick="ShareMusic.analyze()">${_I('sparkles')} Let AI assess</button>
            <div id="sm-verdict" style="margin-top:0.75rem"></div>
          </div>

          <button id="sm-share-btn" class="btn btn-primary w-full" onclick="ShareMusic.share()">${_I('music')} Share the track</button>
          <div id="sm-status" style="font-size:0.82rem;color:var(--text2);text-align:center"></div>
        </div>
      </div>`;
  }

  function _inputStyle() {
    return `style="width:100%;box-sizing:border-box;padding:0.6rem 0.7rem;border-radius:10px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.04);color:var(--text);font-size:0.92rem;font-family:inherit"`;
  }

  // ── Cover-forhåndsvising ────────────────────────────────────────────
  function onCover(input) {
    const file = input.files && input.files[0];
    if (!file) return;
    _coverFile = file;
    if (_coverUrl) URL.revokeObjectURL(_coverUrl);
    _coverUrl = URL.createObjectURL(file);
    const box = document.getElementById('sm-cover-box');
    if (box) {
      box.style.border = '1px solid rgba(255,255,255,0.12)';
      box.innerHTML = `<img src="${_coverUrl}" alt="" style="width:100%;height:100%;object-fit:cover">
        <input type="file" accept="image/*" style="display:none" onchange="ShareMusic.onCover(this)">`;
    }
  }

  // ── AI-vurdering: original vs. allerede utgitt ──────────────────────
  async function analyze() {
    if (typeof AI === 'undefined') { App.toast('AI is not available right now.', 'error'); return; }
    const title  = (document.getElementById('sm-title')  || {}).value || '';
    const artist = (document.getElementById('sm-artist') || {}).value || '';
    const origin = (document.getElementById('sm-origin') || {}).value || '';
    const notes  = (document.getElementById('sm-notes')  || {}).value || '';
    if (!title.trim()) { App.toast('Enter a title first, so the AI has something to assess.', 'info'); return; }

    const btn = document.getElementById('sm-analyze-btn');
    const out = document.getElementById('sm-verdict');
    if (btn) { btn.disabled = true; btn.innerHTML = `<span class="spinner" style="width:14px;height:14px;border-width:2px"></span> Assessing…`; }

    const sys = 'You are a music-rights assistant for the SiriusFM platform. ' +
      'Based on the information, assess whether an audio track is likely the user\'s own, original work, ' +
      'or whether it may be already released / copyrighted material (e.g. a well-known track, a cover or a remix of someone else\'s work). ' +
      'Use general knowledge of well-known releases. Reply ONLY with valid JSON, no text outside: ' +
      '{"verdict":"original|utgitt|usikker","confidence":0-100,"reason":"short explanation in English","advice":"short advice in English"}';
    const userMsg =
      `Title: ${title}\nArtist: ${artist}\nUser's self-declaration: ${origin}\nDescription/links: ${notes || '(none)'}`;

    try {
      const raw = await AI.callClaude(sys, userMsg, 300);
      const v = _parseVerdict(raw);
      _verdict = v;
      if (out) out.innerHTML = _verdictHtml(v);
    } catch (e) {
      if (out) out.innerHTML = `<div style="color:var(--danger,#f87171);font-size:0.85rem">Could not run the AI assessment now: ${_esc(e.message || 'unknown error')}</div>`;
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = `${_I('sparkles')} Assess again`; }
    }
  }

  function _parseVerdict(raw) {
    let txt = String(raw || '').trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    const a = txt.indexOf('{'), b = txt.lastIndexOf('}');
    if (a !== -1 && b !== -1) txt = txt.slice(a, b + 1);
    try {
      const o = JSON.parse(txt);
      const verdict = ['original', 'utgitt', 'usikker'].includes(o.verdict) ? o.verdict : 'usikker';
      return {
        verdict,
        confidence: Math.max(0, Math.min(100, parseInt(o.confidence, 10) || 0)),
        reason: String(o.reason || '').slice(0, 400),
        advice: String(o.advice || '').slice(0, 300),
      };
    } catch {
      return { verdict: 'usikker', confidence: 0, reason: String(raw || '').slice(0, 300), advice: '' };
    }
  }

  function _verdictHtml(v) {
    const map = {
      original: { label: 'Looks like your own work', color: '#22c55e', bg: 'rgba(34,197,94,0.12)', icon: 'check-circle' },
      utgitt:   { label: 'May already be released',   color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: 'alert' },
      usikker:  { label: 'Unsure — check the rights', color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', icon: 'alert' },
    };
    const m = map[v.verdict] || map.usikker;
    return `
      <div style="background:${m.bg};border:1px solid ${m.color}55;border-radius:12px;padding:0.85rem 1rem">
        <div style="display:flex;align-items:center;gap:0.5rem;font-weight:800;color:${m.color};font-size:0.92rem">
          ${_I(m.icon)} ${m.label}
          <span style="margin-left:auto;font-size:0.75rem;color:var(--text3);font-weight:600">${v.confidence}% confident</span>
        </div>
        ${v.reason ? `<p style="color:var(--text2);font-size:0.83rem;line-height:1.5;margin:0.5rem 0 0">${_esc(v.reason)}</p>` : ''}
        ${v.advice ? `<p style="color:var(--text3);font-size:0.78rem;line-height:1.5;margin:0.4rem 0 0"><strong>Advice:</strong> ${_esc(v.advice)}</p>` : ''}
        <p style="color:var(--text3);font-size:0.7rem;margin:0.5rem 0 0">AI assessment — not legal proof. You are responsible for holding the rights.</p>
      </div>`;
  }

  // ── Opplasting (sky eller lokal) — speiler Profile.uploadMusic ──────
  async function _uploadFile(file, prefix) {
    const useCloud = (typeof SC_Storage !== 'undefined') && SC_Storage.isConfigured();
    if (useCloud) {
      try {
        const res = await SC_Storage.upload(file, { prefix });
        return { url: res.url, path: res.path, shared: true };
      } catch (e) {
        if (e && e.message !== 'not-configured') console.warn('Skylagring feilet, lagrer lokalt:', e.message);
      }
    }
    return { url: null, path: null, shared: false };
  }

  async function _audioDuration(file) {
    try {
      const url = URL.createObjectURL(file);
      const a = new Audio(url);
      const d = await new Promise(r => { a.onloadedmetadata = () => r(a.duration); a.onerror = () => r(0); });
      URL.revokeObjectURL(url);
      return d || 0;
    } catch { return 0; }
  }

  // ── Del låten ───────────────────────────────────────────────────────
  async function share() {
    const cur = Auth.current();
    if (!cur) { App.toast('Log in to share.', 'error'); return; }

    const titleEl  = document.getElementById('sm-title');
    const audioEl  = document.getElementById('sm-audio');
    const title    = (titleEl  && titleEl.value  || '').trim();
    const artist   = (document.getElementById('sm-artist') || {}).value || cur.displayName || cur.username;
    const origin   = (document.getElementById('sm-origin') || {}).value || 'ukjent';
    const notes    = (document.getElementById('sm-notes')  || {}).value || '';
    const audioFile = audioEl && audioEl.files && audioEl.files[0];

    if (!title)     { App.toast('Give the track a title.', 'info'); return; }
    if (!audioFile) { App.toast('Choose an audio file to upload.', 'info'); return; }

    // Obligatorisk rettighetssjekk: kjør AI-vurderingen automatisk om den ikke alt er gjort.
    // (analyze() viser spinner på sjekk-knappen og setter _verdict; feiler den, blir _verdict null.)
    if (!_verdict) await analyze();

    // Hard-blokker sannsynlige gjenutgivelser av andres/allerede utgitt verk — ingen omvei.
    if (_verdict && _verdict.verdict === 'utgitt' && _verdict.confidence >= 60) {
      App.toast('The rights check believes this is likely an already-released track, so sharing is blocked. If you hold the rights, contact us.', 'error', 6500);
      return;
    }
    // AI-sjekken kunne ikke kjøres (nettverk/tjeneste nede) — ikke lås brukeren ute, men krev bekreftelse.
    if (!_verdict) {
      if (!confirm('We could not run the rights check right now. Only share if you hold the rights to the track. Continue?')) return;
    } else if (_verdict.verdict !== 'original') {
      // «usikker», eller «utgitt» under terskel — krev at brukeren aktivt bekrefter rettighetene.
      if (!confirm('The rights check is not certain this is your own work. Confirm that you have the rights to share it.')) return;
    }

    const status = document.getElementById('sm-status');
    const btn    = document.getElementById('sm-share-btn');
    if (btn) { btn.disabled = true; btn.innerHTML = `<span class="spinner" style="width:14px;height:14px;border-width:2px"></span> Uploading…`; }
    if (status) status.textContent = 'Uploading audio…';

    try {
      const id = `mus_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const duration = await _audioDuration(audioFile);

      // 1) Lyd
      const audio = await _uploadFile(audioFile, 'shared-audio');

      // 2) Cover (valgfritt)
      let coverMediaId = null, coverUrl = null;
      if (_coverFile) {
        if (status) status.textContent = 'Uploading cover…';
        const cov = await _uploadFile(_coverFile, 'shared-cover');
        if (cov.shared) {
          coverUrl = cov.url;
        } else {
          coverMediaId = `mcover_${Date.now()}_${Math.random().toString(36).slice(2)}`;
          await DB.storeFile('media', coverMediaId, _coverFile);
        }
      }

      const meta = {
        name: title, artist, duration, coverMediaId, coverUrl,
        visibility: 'public', mime: audioFile.type, fileSize: audioFile.size, createdAt: Date.now(),
        audioUrl: audio.url, storagePath: audio.path,
        // delings-/rettighetsmetadata
        origin, notes,
        aiVerdict: _verdict || null,
        source: 'sharemusic',
      };

      // 3) Lagre lydposten — metadata i 'music'; selve fila i Supabase ELLER lokal blob.
      if (audio.shared) {
        await DB.put('music', { id, ...meta });
      } else {
        await DB.storeFile('music', id, audioFile, meta);
      }

      // 4) Knytt til profilen
      cur.musicIds = [...(cur.musicIds || []), id];
      Auth.updateUser(cur.username, { musicIds: cur.musicIds });

      // 5) Auto-del til Community-veggen når fila er delbar (offentlig URL)
      if (audio.shared && window.Community && Community.autoShareOn && Community.autoShareOn()) {
        Community.shareMedia({ kind: 'audio', name: title, url: audio.url, sourceId: id, audience: 'public' });
      }

      if (window.Notify && Notify.notifyFriends) {
        Notify.notifyFriends(cur, { type: 'upload', text: 'shared a new track', link: `#/u/${cur.username}` });
      }

      if (btn) { btn.disabled = false; btn.innerHTML = `${_I('music')} Share the track`; }
      _showSuccess(cur, { id, title, artist, coverUrl: coverUrl || _coverUrl, shared: audio.shared });
    } catch (e) {
      if (btn) { btn.disabled = false; btn.innerHTML = `${_I('music')} Share the track`; }
      if (status) status.textContent = '';
      App.toast('Upload failed: ' + (e.message || 'unknown error'), 'error');
    }
  }

  function _showSuccess(cur, t) {
    const appEl = document.getElementById('app');
    if (!appEl) return;
    appEl.innerHTML = `
      <div class="section" style="max-width:520px;margin:3rem auto;text-align:center">
        <div style="width:64px;height:64px;margin:0 auto 0.75rem;border-radius:50%;background:linear-gradient(135deg,#22c55e,#16a34a);display:flex;align-items:center;justify-content:center;font-size:1.9rem">🎵</div>
        <div class="section-title" style="justify-content:center">The track has been shared!</div>
        ${t.coverUrl ? `<img src="${t.coverUrl}" alt="" style="width:160px;height:160px;object-fit:cover;border-radius:14px;margin:1rem auto;display:block">` : ''}
        <p style="font-weight:700;font-size:1.05rem;margin:0.5rem 0 0">${_esc(t.title)}</p>
        <p style="color:var(--text2);margin:0.15rem 0 0.25rem">${_esc(t.artist)}</p>
        <p style="color:var(--text3);font-size:0.8rem;margin:0 0 1.5rem">${t.shared ? '🌐 Shared with everyone on SiriusFM' : 'Saved locally on this device'}</p>
        <div style="display:flex;gap:0.5rem;justify-content:center;flex-wrap:wrap">
          ${t.shared && t.id ? `<button class="btn btn-primary" onclick="Share.open('music','${_esc(t.id)}')" style="display:inline-flex">🔗 Share on social media</button>` : ''}
          <a href="#/u/${_esc(cur.username)}" class="btn btn-ghost" style="display:inline-flex">${_I('music')} View on profile</a>
          <button class="btn btn-ghost" onclick="location.hash='#/share';" style="display:inline-flex">${_I('sparkles')} Share another</button>
        </div>
        ${t.shared === false ? '<p style="color:var(--text3);font-size:0.75rem;margin-top:0.8rem">The file was saved locally on this device. To share it further on Facebook etc., cloud storage must be on when you upload.</p>' : ''}
      </div>`;
  }

  return { open, render, onCover, analyze, share, _parseVerdict };
})();

if (typeof window !== 'undefined') window.ShareMusic = ShareMusic;
if (typeof module !== 'undefined' && module.exports) module.exports = ShareMusic;
