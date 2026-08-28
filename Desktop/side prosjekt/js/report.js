// Report — rettighets-/opphavsrettsrapport. En bruker kan flagge et spor som mulig
// stjålet eller allerede utgitt (av et plateselskap / en annen artist). Rapporten
// sendes til teamet via /api/send-email (type='copyright_report'); mottakeren settes
// på serveren, så klienten kan ikke velge adresse. Modalen gjenbruker #modal-box.
const Report = (() => {
  let _ctx = null; // { trackId, trackTitle, trackArtist, profileUsername }

  function _esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function _I(name) { return (typeof Icon === 'function') ? Icon(name) : ''; }
  function _inputStyle() {
    return `style="width:100%;box-sizing:border-box;padding:0.6rem 0.7rem;border-radius:10px;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.04);color:var(--text);font-size:0.92rem;font-family:inherit"`;
  }

  // Åpne rapport-dialogen for et spor.
  function openTrack(trackId, trackTitle, trackArtist, profileUsername) {
    _ctx = {
      trackId: trackId || '',
      trackTitle: trackTitle || '',
      trackArtist: trackArtist || '',
      profileUsername: profileUsername || '',
    };
    const box = document.getElementById('modal-box');
    if (!box || typeof App === 'undefined' || !App.openModal) {
      if (typeof App !== 'undefined' && App.toast) App.toast('Cannot open the report right now.', 'error');
      return;
    }
    box.innerHTML = `
      <div class="modal-header">
        <h2>${_I('ban')} Report track</h2>
        <button class="btn-icon" onclick="App.closeModal()" aria-label="Close">${_I('x')}</button>
      </div>
      <div style="padding:1.25rem 1.5rem;color:var(--text)">
        <p style="color:var(--text2);font-size:0.88rem;line-height:1.55;margin:0 0 1rem">
          Do you believe this track is stolen, already released by a record label, or uploaded without
          the rights? Send us the details and the team will review it and remove the track if it infringes rights.
        </p>
        <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:10px;padding:0.75rem 0.9rem;margin:0 0 1rem">
          <div style="font-weight:700;font-size:0.92rem">${_esc(_ctx.trackTitle) || 'Unknown track'}</div>
          <div style="color:var(--text2);font-size:0.82rem">${_esc(_ctx.trackArtist) || 'Unknown artist'}${_ctx.profileUsername ? ` · uploaded by @${_esc(_ctx.profileUsername)}` : ''}</div>
        </div>
        <div style="display:grid;gap:0.85rem">
          <div>
            <label for="rep-reason" style="display:block;font-weight:700;font-size:0.82rem;margin:0 0 0.3rem">Reason</label>
            <select id="rep-reason" ${_inputStyle()}>
              <option value="Already released by a record label">Already released by a record label</option>
              <option value="Someone else's work (stolen)">Someone else's work uploaded as their own (stolen)</option>
              <option value="Unauthorized cover or remix">Unauthorized cover or remix</option>
              <option value="Wrong artist or release name">Wrong artist or release name</option>
              <option value="Other copyright infringement">Other copyright infringement</option>
            </select>
          </div>
          <div>
            <label for="rep-url" style="display:block;font-weight:700;font-size:0.82rem;margin:0 0 0.3rem">Link to the original <span style="color:var(--text3);font-weight:400">(optional, but helps a lot)</span></label>
            <input id="rep-url" type="url" placeholder="Spotify / Apple Music / label URL…" ${_inputStyle()}>
          </div>
          <div>
            <label for="rep-details" style="display:block;font-weight:700;font-size:0.82rem;margin:0 0 0.3rem">Details <span style="color:var(--text3);font-weight:400">(optional)</span></label>
            <textarea id="rep-details" rows="3" placeholder="Original release name, record label, catalog/ISRC number, where you know the track from…" ${_inputStyle()}></textarea>
          </div>
        </div>
        <div style="display:flex;gap:0.5rem;justify-content:flex-end;margin-top:1.25rem">
          <button class="btn btn-ghost" onclick="App.closeModal()">Cancel</button>
          <button id="rep-send-btn" class="btn btn-primary" onclick="Report.submit()">${_I('ban')} Send report</button>
        </div>
        <p style="color:var(--text3);font-size:0.72rem;margin:0.9rem 0 0">
          Reports are sent to the SiriusFM team. Misuse of the report function may lead to action against your account.
        </p>
      </div>`;
    App.openModal();
  }

  async function submit() {
    if (!_ctx) return;
    const reason  = (document.getElementById('rep-reason')  || {}).value || 'Ikke oppgitt';
    const url     = ((document.getElementById('rep-url')     || {}).value || '').trim();
    const details = ((document.getElementById('rep-details') || {}).value || '').trim();
    const btn = document.getElementById('rep-send-btn');
    if (btn) { btn.disabled = true; btn.innerHTML = `<span class="spinner" style="width:14px;height:14px;border-width:2px"></span> Sending…`; }

    const cur = (typeof Auth !== 'undefined' && Auth.current) ? Auth.current() : null;
    const route = (typeof location !== 'undefined') ? location.hash : '';

    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'copyright_report',
          trackId: _ctx.trackId,
          trackTitle: _ctx.trackTitle,
          trackArtist: _ctx.trackArtist,
          profileUsername: _ctx.profileUsername,
          reason,
          originalUrl: url,
          details,
          reporter: cur ? cur.username : '',
          route,
          time: new Date().toISOString(),
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (typeof App !== 'undefined') App.closeModal();
      if (typeof App !== 'undefined' && App.toast) {
        App.toast('Thanks! The report has been sent to the team. We will review the track.', 'success', 4500);
      }
    } catch (e) {
      if (btn) { btn.disabled = false; btn.innerHTML = `${_I('ban')} Send report`; }
      if (typeof App !== 'undefined' && App.toast) {
        App.toast('Could not send the report. Try again later.', 'error');
      }
    }
  }

  return { openTrack, submit };
})();

if (typeof window !== 'undefined') window.Report = Report;
if (typeof module !== 'undefined' && module.exports) module.exports = Report;
