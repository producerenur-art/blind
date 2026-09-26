// Utgang med forsterking (boost >100 %) + mjuk limiter mot klipping. Delt av Player og Radio.
window._sfmBuildOut = function (ctx, analyser) {
  const gain = ctx.createGain();
  gain.gain.value = window._sfmBoost || 1;
  const lim = ctx.createDynamicsCompressor();
  lim.threshold.value = -3; lim.knee.value = 0; lim.ratio.value = 20;
  lim.attack.value = 0.003; lim.release.value = 0.15;
  analyser.connect(gain); gain.connect(lim); lim.connect(ctx.destination);
  window._sfmGain = gain;
};
window._sfmSetBoost = function (g) {
  window._sfmBoost = g;
  if (window._sfmGain) window._sfmGain.gain.value = g;
};
// Persistent music player — lives in the outer shell, survives route changes
const Player = (() => {
  let audio, queue = [], currentIndex = -1, isPlaying = false, shuffle = false, repeat = 'none';
  let blobUrls = {}; // cache blob URLs to avoid re-creating them
  // Shared Web Audio API context (also used by Radio visualizer)
  let _audioCtx = null, _analyser = null, _sourceNode = null;

  function $(id) { return document.getElementById(id); }

  function init() {
    audio = $('audio-engine');

    // "Spiller nå"-equalizer i albumkunsten (vist via .player-bar.playing i CSS)
    const art = $('player-artwork');
    if (art && !art.querySelector('.np-eq')) {
      const eq = document.createElement('div');
      eq.className = 'np-eq';
      eq.setAttribute('aria-hidden', 'true');
      eq.innerHTML = '<span></span><span></span><span></span><span></span>';
      art.appendChild(eq);
    }

    $('ctrl-play').addEventListener('click', togglePlay);
    $('ctrl-prev').addEventListener('click', prev);
    $('ctrl-next').addEventListener('click', next);
    $('ctrl-shuffle').addEventListener('click', toggleShuffle);
    $('ctrl-repeat').addEventListener('click', cycleRepeat);
    $('ctrl-queue').addEventListener('click', toggleQueue);

    $('progress-bar').addEventListener('input', e => {
      if (audio.duration) audio.currentTime = (e.target.value / 100) * audio.duration;
    });
    $('volume-bar').addEventListener('input', e => {
      audio.volume = e.target.value / 100;
      $('vol-fill').style.width = e.target.value + '%';
    });

    // Boost (>100 %) gjeld berre for opptaket det vart sett på; anna kjelde eller manuell volum-endring nullstiller.
    const _resetBoost = () => {
      if ((window._sfmBoost || 1) === 1) return;
      window._sfmSetBoost(1);
      document.querySelectorAll('.wwl-vol-in').forEach(i => { i.value = Math.round(audio.volume * 100); });
    };
    audio.addEventListener('loadstart', () => {
      const keep = window._sfmBoostSrc, src = audio.currentSrc || audio.src || '';
      if (!keep || src.indexOf(keep) === -1) _resetBoost();
    });
    audio.addEventListener('volumechange', () => { if (Date.now() - (window._sfmVolSelf || 0) > 100) _resetBoost(); });

    audio.addEventListener('timeupdate',     updateProgress);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended',          onEnded);
    audio.addEventListener('play',  () => { isPlaying = true;  $('ctrl-play').innerHTML = Icon('pause'); $('player-bar').classList.add('playing'); });
    audio.addEventListener('pause', () => { isPlaying = false; $('ctrl-play').innerHTML = Icon('play');  $('player-bar').classList.remove('playing'); });

    audio.volume = 0.8;

    // Set up shared Web Audio API chain (used by Radio visualizer too)
    audio.addEventListener('play', () => {
      try {
        if (window._sfmNoWebAudio) return;   // mobil/nettbrett: direkte <audio>, ikkje Web Audio (sjå radio.js IS_TOUCH_MOBILE)
        if (!_audioCtx) {
          const Ctx = window.AudioContext || window.webkitAudioContext;
          if (!Ctx) return;
          _audioCtx  = new Ctx();
          _analyser  = _audioCtx.createAnalyser();
          _analyser.fftSize = 512;
          _analyser.smoothingTimeConstant = 0.8;
          _sourceNode = _audioCtx.createMediaElementSource(audio);
          _sourceNode.connect(_analyser);
          window._sfmBuildOut(_audioCtx, _analyser);
          // Expose globally for Radio visualizer
          window._radioSource  = _sourceNode;
          window._radioCtx     = _audioCtx;
          window._radioAnalyser= _analyser;
        }
        if (_audioCtx.state === 'suspended') _audioCtx.resume();
      } catch(e) { /* Web Audio unavailable */ }
    }, { once: false });
  }

  async function getBlobUrl(id) {
    if (blobUrls[id]) return blobUrls[id];
    // Prefer the shared Supabase URL (file uploaded to cloud); fall back to the
    // local IndexedDB blob for tracks stored only on this device.
    const rec = await DB.get('music', id).catch(() => null);
    if (rec && rec.audioUrl) { blobUrls[id] = rec.audioUrl; return rec.audioUrl; }
    const url = await DB.getBlobUrl('music', id);
    if (url) blobUrls[id] = url;
    return url;
  }

  // Resolve the cover/artwork for a music record. Uploads across the site store
  // the cover as coverUrl (Supabase cloud) or coverMediaId/coverId (local blob in
  // the "media" store). Fall back to the legacy artworkUrl field for old records.
  async function resolveCoverUrl(rec) {
    if (!rec) return null;
    if (rec.coverUrl)   return rec.coverUrl;
    if (rec.artworkUrl) return rec.artworkUrl;
    const blobId = rec.coverMediaId || rec.coverId;
    if (blobId) return await DB.getBlobUrl('media', blobId).catch(() => null);
    return null;
  }

  async function loadTrack(id, autoPlay = true) {
    if (typeof Radio !== 'undefined') Radio.stopForMusicPlayer?.();
    const rec = await DB.get('music', id);
    if (!rec) return;

    const url = await getBlobUrl(id);
    audio.src = url;

    $('player-title').textContent  = rec.name  || 'Unknown song';
    $('player-artist').textContent = rec.artist || 'Unknown artist';

    const artEl = $('player-artwork');
    const coverUrl = await resolveCoverUrl(rec);
    if (coverUrl) {
      artEl.style.backgroundImage = `url("${coverUrl}")`;
      artEl.style.backgroundSize = 'cover';
      artEl.style.backgroundPosition = 'center';
      const note = artEl.querySelector('.artwork-note');
      if (note) note.style.display = 'none';
    } else {
      artEl.style.backgroundImage = '';
      const note = artEl.querySelector('.artwork-note');
      if (note) { note.style.display = ''; note.innerHTML = Icon('music'); }
    }

    $('player-bar').classList.remove('hidden', 'idle');
    renderQueue();

    if (autoPlay) audio.play().catch(() => {});
    currentIndex = queue.indexOf(id);
  }

  async function setQueue(ids, startIndex = 0) {
    queue = [...ids];
    await loadTrack(queue[startIndex]);
  }

  function togglePlay() {
    if (window._radioMode) { Radio.togglePlay(); return; }
    // Spelaren står no på alle ruter, så play kan bli trykt før noko er lasta.
    if (!audio.src) {
      App.toast('Choose a station or a track first', 'info');
      Router.go('/radio');
      return;
    }
    if (isPlaying) audio.pause();
    else audio.play().catch(() => {});
  }

  function prev() {
    if (currentIndex > 0) loadTrack(queue[currentIndex - 1]);
    else if (repeat === 'all') loadTrack(queue[queue.length - 1]);
  }

  function next() {
    if (shuffle) {
      const idx = Math.floor(Math.random() * queue.length);
      loadTrack(queue[idx]);
      return;
    }
    if (currentIndex < queue.length - 1) {
      loadTrack(queue[currentIndex + 1]);
    } else if (repeat === 'all') {
      loadTrack(queue[0]);
    }
  }

  function onEnded() {
    if (repeat === 'one') { audio.currentTime = 0; audio.play(); return; }
    next();
  }

  function toggleShuffle() {
    shuffle = !shuffle;
    $('ctrl-shuffle').classList.toggle('active', shuffle);
  }

  function cycleRepeat() {
    const modes = ['none', 'all', 'one'];
    repeat = modes[(modes.indexOf(repeat) + 1) % 3];
    $('ctrl-repeat').innerHTML = Icon(repeat === 'one' ? 'rotate-cw' : 'repeat');
    $('ctrl-repeat').classList.toggle('active', repeat !== 'none');
  }

  function toggleQueue() {
    $('queue-panel').classList.toggle('hidden');
  }

  function renderQueue() {
    const list = $('queue-list');
    if (!list) return;
    if (!queue.length) { list.innerHTML = '<div class="empty-state" style="padding:1rem"><p>No songs in the queue</p></div>'; return; }
    list.innerHTML = queue.map((id, i) => `
      <div class="queue-item ${i === currentIndex ? 'active' : ''}" onclick="Player.jumpTo(${i})">
        <span class="queue-num">${i === currentIndex ? Icon('play', { cls: 'icon-xs' }) : i + 1}</span>
        <span class="queue-label" id="ql-${id}">Loading…</span>
      </div>
    `).join('');
    // fill names async
    queue.forEach(id => {
      DB.get('music', id).then(rec => {
        const el = document.getElementById(`ql-${id}`);
        if (el && rec) el.textContent = rec.name || id;
      });
    });
  }

  function jumpTo(index) {
    if (index >= 0 && index < queue.length) loadTrack(queue[index]);
  }

  function updateProgress() {
    if (!audio.duration) return;
    const pct = (audio.currentTime / audio.duration) * 100;
    $('progress-bar').value = pct;
    $('progress-fill').style.width = pct + '%';
    $('time-current').textContent = fmt(audio.currentTime);
  }

  function updateDuration() {
    $('time-total').textContent = fmt(audio.duration);
  }

  function fmt(s) {
    if (!s || isNaN(s)) return '0:00';
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  }

  // Opptak frå nettlesaren (MediaRecorder-webm) manglar lengde i fila → audio.duration = Infinity, og
  // spolelinja verkar ikkje. Trikset: hopp til «uendeleg» ein gong, så reknar nettlesaren ut lengda;
  // hopp så tilbake til start. Verkar òg for eksisterande opptak (ingen omkoding).
  function fixInfiniteDuration(a) {
    if (!a || isFinite(a.duration)) return;
    const back = () => { a.removeEventListener('timeupdate', back); try { a.currentTime = 0; } catch (e) {} };
    a.addEventListener('timeupdate', back);
    try { a.currentTime = 1e101; } catch (e) { a.removeEventListener('timeupdate', back); }
  }
  function playExternal(url, title, subtitle) {
    if (typeof Radio !== 'undefined') Radio.stopForMusicPlayer?.();
    audio.addEventListener('loadedmetadata', () => fixInfiniteDuration(audio), { once: true });
    audio.src = url;
    $('player-title').textContent  = title    || 'DJ Mix';
    $('player-artist').textContent = subtitle || 'Mix';
    const artEl = $('player-artwork');
    if (artEl) {
      artEl.style.backgroundImage = '';
      const note = artEl.querySelector('.artwork-note');
      if (note) { note.style.display = ''; note.innerHTML = Icon('sliders'); }
    }
    $('player-bar').classList.remove('hidden', 'idle');
    audio.play().catch(() => {});
    queue = [];
    currentIndex = -1;
  }

  // Delingssida (/s/…) lagrar det som spelte i sessionStorage når ein forlèt henne; her held vi fram
  // frå same posisjon, slik at musikken går vidare mellom URL-ar på siriusfm.no.
  function resumeHandoff() {
    let h = null;
    try { h = JSON.parse(sessionStorage.getItem('sfm_handoff') || 'null'); sessionStorage.removeItem('sfm_handoff'); } catch (e) {}
    if (!h || !/^https:\/\//i.test(h.url || '') || Date.now() - (h.ts || 0) > 120000) return;
    playExternal(h.url, h.title, h.sub);
    const t = Math.max(0, +h.t || 0);
    if (t > 1) audio.addEventListener('loadedmetadata', () => { try { audio.currentTime = t; } catch (e) {} }, { once: true });
    const pb = audio.play(); if (pb && pb.catch) pb.catch(() => {});
  }

  // Innebygde <audio controls> inne i sider (Live Archive, opplastingar m.m.) døyr når ruta byter og
  // DOM-en blir bytt ut. Rett før det: flytt det som spelar over til den faste spelarlinja og hald fram.
  function adoptInlineMedia() {
    if (!audio) return false;
    const cand = [...document.querySelectorAll('#app audio')].find(a =>
      a !== audio && !a.paused && !a.ended && !a.muted && !a.srcObject && /^(https?|blob):/i.test(a.currentSrc || ''));
    if (!cand) return false;
    const url = cand.currentSrc, t = cand.currentTime || 0;
    const card = cand.closest('.card, .glass, article, li, section') || cand.parentElement;
    const h = card && card.querySelector('h1, h2, h3, h4, .title, b, strong');
    const title = (h && h.textContent.trim()) || cand.getAttribute('title') || 'Now playing';
    try { cand.pause(); } catch (e) {}
    playExternal(url, title, '');
    if (t > 1) audio.addEventListener('loadedmetadata', () => { try { audio.currentTime = t; } catch (e) {} }, { once: true });
    return true;
  }

  // Expose minimal public API
  return { init, resumeHandoff, adoptInlineMedia, setQueue, jumpTo, loadTrack, togglePlay, next, prev, playExternal, fixInfiniteDuration };
})();
