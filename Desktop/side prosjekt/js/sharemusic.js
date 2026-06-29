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
      if (typeof App !== 'undefined') App.toast('Logg inn eller lag en gratis profil for å dele musikk.', 'info', 4000);
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
          <div class="section-title" style="justify-content:center">${_I('music')} Del musikk</div>
          <p style="color:var(--text2);margin:1rem 0 1.5rem">Du må være innlogget for å laste opp og dele en låt.</p>
          <a href="#/login" class="btn btn-primary" style="display:inline-flex">${_I('log-in')} Logg inn</a>
        </div>`;
      return;
    }

    _coverFile = null; _coverUrl = null; _verdict = null;

    appEl.innerHTML = `
      <div class="section" style="max-width:680px;margin:1.5rem auto">
        <div class="section-header">
          <div class="section-title">${_I('music')} Del en låt</div>
          <div class="section-sub">Last opp lyd + cover-bilde. La AI vurdere om det er ditt eget verk eller allerede utgitt før du deler den med fellesskapet.</div>
        </div>

        <div style="display:grid;gap:1.1rem;margin-top:1rem">
          <div style="display:grid;grid-template-columns:140px 1fr;gap:1rem;align-items:start">
            <!-- Cover-bilde -->
            <label id="sm-cover-box" title="Last opp cover-bilde"
              style="aspect-ratio:1;border:1.5px dashed rgba(255,255,255,0.18);border-radius:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0.35rem;cursor:pointer;text-align:center;color:var(--text3);overflow:hidden;background:rgba(255,255,255,0.02)">
              ${_I('image')}
              <span style="font-size:0.72rem;line-height:1.3;padding:0 0.4rem">Cover-bilde<br>(klikk for å laste opp)</span>
              <input type="file" accept="image/*" style="display:none" onchange="ShareMusic.onCover(this)">
            </label>

            <div style="display:grid;gap:0.75rem">
              <div>
                <label for="sm-title" style="display:block;font-weight:700;font-size:0.82rem;margin:0 0 0.3rem">Tittel</label>
                <input id="sm-title" type="text" placeholder="Navn på låten" ${_inputStyle()}>
              </div>
              <div>
                <label for="sm-artist" style="display:block;font-weight:700;font-size:0.82rem;margin:0 0 0.3rem">Artist</label>
                <input id="sm-artist" type="text" value="${_esc(cur.displayName || cur.username)}" ${_inputStyle()}>
              </div>
            </div>
          </div>

          <!-- Lyd-fil -->
          <div>
            <label for="sm-audio" style="display:block;font-weight:700;font-size:0.82rem;margin:0 0 0.3rem">Lyd-fil</label>
            <input id="sm-audio" type="file" accept="audio/*" ${_inputStyle()}>
          </div>

          <!-- Egenerklæring -->
          <div>
            <label for="sm-origin" style="display:block;font-weight:700;font-size:0.82rem;margin:0 0 0.3rem">Hva er dette?</label>
            <select id="sm-origin" ${_inputStyle()}>
              <option value="original">Mitt eget, originale verk</option>
              <option value="remix">Remix / bearbeiding av andres verk</option>
              <option value="cover">Cover av en eksisterende låt</option>
              <option value="ukjent">Usikker</option>
            </select>
          </div>

          <!-- Kontekst til AI -->
          <div>
            <label for="sm-notes" style="display:block;font-weight:700;font-size:0.82rem;margin:0 0 0.3rem">Beskrivelse / hvor er den eventuelt utgitt? <span style="color:var(--text3);font-weight:400">(valgfritt)</span></label>
            <textarea id="sm-notes" rows="2" placeholder="F.eks. sjanger, samples brukt, lenke til Spotify/SoundCloud hvis den allerede er ute…" ${_inputStyle()}></textarea>
          </div>

          <!-- AI-vurdering -->
          <div style="background:rgba(124,58,237,0.06);border:1px solid rgba(124,58,237,0.25);border-radius:14px;padding:1rem">
            <div style="display:flex;align-items:center;gap:0.5rem;font-weight:700;font-size:0.9rem;margin-bottom:0.5rem">${_I('sparkles')} AI-rettighetssjekk</div>
            <p style="color:var(--text2);font-size:0.82rem;line-height:1.5;margin:0 0 0.75rem">
              AI-en vurderer ut fra opplysningene dine om låten sannsynligvis er ditt eget, originale verk eller noe som allerede er utgitt. Dette er en veiledende vurdering — ikke et juridisk bevis. Du er selv ansvarlig for at du har rettighetene.
            </p>
            <button id="sm-analyze-btn" class="btn btn-ghost" onclick="ShareMusic.analyze()">${_I('sparkles')} La AI vurdere</button>
            <div id="sm-verdict" style="margin-top:0.75rem"></div>
          </div>

          <button id="sm-share-btn" class="btn btn-primary w-full" onclick="ShareMusic.share()">${_I('music')} Del låten</button>
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
    if (typeof AI === 'undefined') { App.toast('AI er ikke tilgjengelig akkurat nå.', 'error'); return; }
    const title  = (document.getElementById('sm-title')  || {}).value || '';
    const artist = (document.getElementById('sm-artist') || {}).value || '';
    const origin = (document.getElementById('sm-origin') || {}).value || '';
    const notes  = (document.getElementById('sm-notes')  || {}).value || '';
    if (!title.trim()) { App.toast('Skriv inn en tittel først, så AI har noe å vurdere.', 'info'); return; }

    const btn = document.getElementById('sm-analyze-btn');
    const out = document.getElementById('sm-verdict');
    if (btn) { btn.disabled = true; btn.innerHTML = `<span class="spinner" style="width:14px;height:14px;border-width:2px"></span> Vurderer…`; }

    const sys = 'Du er en musikkrettighets-assistent for plattformen Sound Core. ' +
      'Vurder ut fra opplysningene om et lydspor sannsynligvis er brukerens eget, originale verk, ' +
      'eller om det kan være allerede utgitt / opphavsrettsbeskyttet materiale (f.eks. en kjent låt, et cover eller en remix av andres verk). ' +
      'Bruk allmennkunnskap om kjente utgivelser. Svar KUN med gyldig JSON, ingen tekst utenfor: ' +
      '{"verdict":"original|utgitt|usikker","confidence":0-100,"reason":"kort forklaring på norsk (bokmål)","advice":"kort råd på norsk (bokmål)"}';
    const userMsg =
      `Tittel: ${title}\nArtist: ${artist}\nBrukerens egenerklæring: ${origin}\nBeskrivelse/lenker: ${notes || '(ingen)'}`;

    try {
      const raw = await AI.callClaude(sys, userMsg, 300);
      const v = _parseVerdict(raw);
      _verdict = v;
      if (out) out.innerHTML = _verdictHtml(v);
    } catch (e) {
      if (out) out.innerHTML = `<div style="color:var(--danger,#f87171);font-size:0.85rem">Kunne ikke gjøre AI-vurderingen nå: ${_esc(e.message || 'ukjent feil')}</div>`;
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = `${_I('sparkles')} Vurder på nytt`; }
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
      original: { label: 'Ser ut som ditt eget verk', color: '#22c55e', bg: 'rgba(34,197,94,0.12)', icon: 'check-circle' },
      utgitt:   { label: 'Kan allerede være utgitt',   color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: 'alert' },
      usikker:  { label: 'Usikker — sjekk rettighetene', color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', icon: 'alert' },
    };
    const m = map[v.verdict] || map.usikker;
    return `
      <div style="background:${m.bg};border:1px solid ${m.color}55;border-radius:12px;padding:0.85rem 1rem">
        <div style="display:flex;align-items:center;gap:0.5rem;font-weight:800;color:${m.color};font-size:0.92rem">
          ${_I(m.icon)} ${m.label}
          <span style="margin-left:auto;font-size:0.75rem;color:var(--text3);font-weight:600">${v.confidence}% sikker</span>
        </div>
        ${v.reason ? `<p style="color:var(--text2);font-size:0.83rem;line-height:1.5;margin:0.5rem 0 0">${_esc(v.reason)}</p>` : ''}
        ${v.advice ? `<p style="color:var(--text3);font-size:0.78rem;line-height:1.5;margin:0.4rem 0 0"><strong>Råd:</strong> ${_esc(v.advice)}</p>` : ''}
        <p style="color:var(--text3);font-size:0.7rem;margin:0.5rem 0 0">AI-vurdering — ikke et juridisk bevis. Du er selv ansvarlig for at du har rettighetene.</p>
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
    if (!cur) { App.toast('Logg inn for å dele.', 'error'); return; }

    const titleEl  = document.getElementById('sm-title');
    const audioEl  = document.getElementById('sm-audio');
    const title    = (titleEl  && titleEl.value  || '').trim();
    const artist   = (document.getElementById('sm-artist') || {}).value || cur.displayName || cur.username;
    const origin   = (document.getElementById('sm-origin') || {}).value || 'ukjent';
    const notes    = (document.getElementById('sm-notes')  || {}).value || '';
    const audioFile = audioEl && audioEl.files && audioEl.files[0];

    if (!title)     { App.toast('Gi låten en tittel.', 'info'); return; }
    if (!audioFile) { App.toast('Velg en lyd-fil å laste opp.', 'info'); return; }

    // Be brukeren kjøre AI-sjekken først hvis den ikke er gjort, og advar ved «utgitt».
    if (!_verdict) {
      if (!confirm('Du har ikke kjørt AI-rettighetssjekken ennå. Vil du dele likevel?')) return;
    } else if (_verdict.verdict === 'utgitt' && _verdict.confidence >= 60) {
      if (!confirm('AI-en mener dette kan være en allerede utgitt låt. Del kun hvis du har rettighetene. Fortsette?')) return;
    }

    const status = document.getElementById('sm-status');
    const btn    = document.getElementById('sm-share-btn');
    if (btn) { btn.disabled = true; btn.innerHTML = `<span class="spinner" style="width:14px;height:14px;border-width:2px"></span> Laster opp…`; }
    if (status) status.textContent = 'Laster opp lyd…';

    try {
      const id = `mus_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const duration = await _audioDuration(audioFile);

      // 1) Lyd
      const audio = await _uploadFile(audioFile, 'shared-audio');

      // 2) Cover (valgfritt)
      let coverMediaId = null, coverUrl = null;
      if (_coverFile) {
        if (status) status.textContent = 'Laster opp cover…';
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
        Notify.notifyFriends(cur, { type: 'upload', text: 'delte en ny låt', link: `#/u/${cur.username}` });
      }

      if (btn) { btn.disabled = false; btn.innerHTML = `${_I('music')} Del låten`; }
      _showSuccess(cur, { title, artist, coverUrl: coverUrl || _coverUrl, shared: audio.shared });
    } catch (e) {
      if (btn) { btn.disabled = false; btn.innerHTML = `${_I('music')} Del låten`; }
      if (status) status.textContent = '';
      App.toast('Opplasting feilet: ' + (e.message || 'ukjent feil'), 'error');
    }
  }

  function _showSuccess(cur, t) {
    const appEl = document.getElementById('app');
    if (!appEl) return;
    appEl.innerHTML = `
      <div class="section" style="max-width:520px;margin:3rem auto;text-align:center">
        <div style="width:64px;height:64px;margin:0 auto 0.75rem;border-radius:50%;background:linear-gradient(135deg,#22c55e,#16a34a);display:flex;align-items:center;justify-content:center;font-size:1.9rem">🎵</div>
        <div class="section-title" style="justify-content:center">Låten er delt!</div>
        ${t.coverUrl ? `<img src="${t.coverUrl}" alt="" style="width:160px;height:160px;object-fit:cover;border-radius:14px;margin:1rem auto;display:block">` : ''}
        <p style="font-weight:700;font-size:1.05rem;margin:0.5rem 0 0">${_esc(t.title)}</p>
        <p style="color:var(--text2);margin:0.15rem 0 0.25rem">${_esc(t.artist)}</p>
        <p style="color:var(--text3);font-size:0.8rem;margin:0 0 1.5rem">${t.shared ? '🌐 Delt med alle på Sound Core' : 'Lagret lokalt på denne enheten'}</p>
        <div style="display:flex;gap:0.5rem;justify-content:center;flex-wrap:wrap">
          <a href="#/u/${_esc(cur.username)}" class="btn btn-primary" style="display:inline-flex">${_I('music')} Se på profilen</a>
          <button class="btn btn-ghost" onclick="location.hash='#/share';" style="display:inline-flex">${_I('sparkles')} Del en til</button>
        </div>
      </div>`;
  }

  return { open, render, onCover, analyze, share, _parseVerdict };
})();

if (typeof window !== 'undefined') window.ShareMusic = ShareMusic;
if (typeof module !== 'undefined' && module.exports) module.exports = ShareMusic;
