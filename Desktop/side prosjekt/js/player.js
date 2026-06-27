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

    audio.addEventListener('timeupdate',     updateProgress);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended',          onEnded);
    audio.addEventListener('play',  () => { isPlaying = true;  $('ctrl-play').innerHTML = Icon('pause'); $('player-bar').classList.add('playing'); });
    audio.addEventListener('pause', () => { isPlaying = false; $('ctrl-play').innerHTML = Icon('play');  $('player-bar').classList.remove('playing'); });

    audio.volume = 0.8;

    // Set up shared Web Audio API chain (used by Radio visualizer too)
    audio.addEventListener('play', () => {
      try {
        if (!_audioCtx) {
          const Ctx = window.AudioContext || window.webkitAudioContext;
          if (!Ctx) return;
          _audioCtx  = new Ctx();
          _analyser  = _audioCtx.createAnalyser();
          _analyser.fftSize = 512;
          _analyser.smoothingTimeConstant = 0.8;
          _sourceNode = _audioCtx.createMediaElementSource(audio);
          _sourceNode.connect(_analyser);
          _analyser.connect(_audioCtx.destination);
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

  async function loadTrack(id, autoPlay = true) {
    if (typeof Radio !== 'undefined') Radio.stopForMusicPlayer?.();
    const rec = await DB.get('music', id);
    if (!rec) return;

    const url = await getBlobUrl(id);
    audio.src = url;

    $('player-title').textContent  = rec.name  || 'Ukjent sang';
    $('player-artist').textContent = rec.artist || 'Ukjent artist';

    const artEl = $('player-artwork');
    if (rec.artworkUrl) {
      artEl.style.backgroundImage = `url(${rec.artworkUrl})`;
      artEl.querySelector('.artwork-note').style.display = 'none';
    } else {
      artEl.style.backgroundImage = '';
      const note = artEl.querySelector('.artwork-note');
      note.style.display = ''; note.innerHTML = Icon('music');
    }

    $('player-bar').classList.remove('hidden');
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
    if (!queue.length) { list.innerHTML = '<div class="empty-state" style="padding:1rem"><p>Ingen sanger i køen</p></div>'; return; }
    list.innerHTML = queue.map((id, i) => `
      <div class="queue-item ${i === currentIndex ? 'active' : ''}" onclick="Player.jumpTo(${i})">
        <span class="queue-num">${i === currentIndex ? Icon('play', { cls: 'icon-xs' }) : i + 1}</span>
        <span class="queue-label" id="ql-${id}">Laster…</span>
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

  function playExternal(url, title, subtitle) {
    if (typeof Radio !== 'undefined') Radio.stopForMusicPlayer?.();
    audio.src = url;
    $('player-title').textContent  = title    || 'DJ Mix';
    $('player-artist').textContent = subtitle || 'Mix';
    const artEl = $('player-artwork');
    if (artEl) {
      artEl.style.backgroundImage = '';
      const note = artEl.querySelector('.artwork-note');
      if (note) { note.style.display = ''; note.innerHTML = Icon('sliders'); }
    }
    $('player-bar').classList.remove('hidden');
    audio.play().catch(() => {});
    queue = [];
    currentIndex = -1;
  }

  // Expose minimal public API
  return { init, setQueue, jumpTo, loadTrack, togglePlay, next, prev, playExternal };
})();
