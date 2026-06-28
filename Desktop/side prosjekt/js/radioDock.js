// Flytende radio-fane — vises når en radiokanal er valgt.
// Kan dras rundt, åpnes/lukkes, og styrer lyd opp/ned + start/stopp.
const RadioDock = (() => {
  const STORAGE_KEY = 'radioDockState';

  let dock, handle, nameEl, toggleBtn, playBtn, volFill;
  let dragging = false, moved = false;
  let startX, startY, startLeft, startTop;
  let isOpen = true;

  function $(id) { return document.getElementById(id); }
  function _icon(name, fallback) {
    return window.Icon ? window.Icon(name) : (fallback || '');
  }

  function init() {
    dock      = $('radio-dock');
    handle    = $('radio-dock-handle');
    nameEl    = $('radio-dock-name');
    toggleBtn = $('radio-dock-toggle');
    playBtn   = $('radio-dock-play');
    volFill   = $('radio-dock-vol-fill');
    if (!dock || !handle) return;

    // Gjenopprett lagra posisjon + åpen/lukket-tilstand
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (saved.left != null && saved.top != null) _place(saved.left, saved.top);
    isOpen = saved.open !== false;
    _applyOpen();

    handle.addEventListener('pointerdown', onDown);
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);

    sync();
  }

  // ── Drag ───────────────────────────────────────────────────────────────
  function onDown(e) {
    if (e.target.closest('button')) return;
    e.preventDefault();
    dragging = true; moved = false;
    const pt = _point(e);
    startX = pt.x; startY = pt.y;
    const rect = dock.getBoundingClientRect();
    startLeft = rect.left; startTop = rect.top;
    dock.style.transition = 'none';
  }

  function onMove(e) {
    if (!dragging) return;
    const pt = _point(e);
    const dx = pt.x - startX, dy = pt.y - startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved = true;
    const maxL = window.innerWidth  - dock.offsetWidth;
    const maxT = window.innerHeight - dock.offsetHeight;
    _place(
      Math.max(0, Math.min(maxL, startLeft + dx)),
      Math.max(0, Math.min(maxT, startTop  + dy))
    );
  }

  function onUp() {
    if (!dragging) return;
    dragging = false;
    dock.style.transition = '';
    // Et klikk (ingen drag) på fanen åpner/lukker den
    if (!moved) toggleOpen();
    else _save();
  }

  function _point(e) {
    const t = e.touches ? e.touches[0] : e;
    return { x: t.clientX, y: t.clientY };
  }

  function _place(left, top) {
    dock.style.left = left + 'px';
    dock.style.top  = top + 'px';
    dock.style.right = 'auto';
    dock.style.bottom = 'auto';
  }

  // ── Åpne / lukke ────────────────────────────────────────────────────────
  function _applyOpen() {
    dock.classList.toggle('collapsed', !isOpen);
    if (toggleBtn) {
      toggleBtn.innerHTML = _icon(isOpen ? 'chevron-down' : 'chevron-up', isOpen ? '▾' : '▴');
      toggleBtn.title = isOpen ? 'Lukk' : 'Åpne';
    }
  }

  function toggleOpen() {
    isOpen = !isOpen;
    _applyOpen();
    _save();
  }

  function _save() {
    const rect = dock.getBoundingClientRect();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      open: isOpen,
      left: dock.style.left ? rect.left : null,
      top:  dock.style.top  ? rect.top  : null,
    }));
  }

  // ── Kontrollar (delegerer til Radio) ────────────────────────────────────
  function volUp()      { window.Radio?.volumeUp(); }
  function volDown()    { window.Radio?.volumeDown(); }
  function togglePlay() { window.Radio?.togglePlay(); }
  function stop()       { window.Radio?.stopRadio(); }

  // ── Synk med Radio-tilstanden ───────────────────────────────────────────
  function sync() {
    if (!dock) return;
    const station = window.Radio?.currentStation;
    if (!station) { dock.classList.add('hidden'); return; }
    dock.classList.remove('hidden');
    if (nameEl) nameEl.textContent = station.name || 'Radio';
    if (playBtn) {
      const playing = !!window.Radio?.isPlaying;
      playBtn.innerHTML = _icon(playing ? 'pause' : 'play', playing ? '⏸' : '▶');
      playBtn.title = playing ? 'Pause' : 'Start';
      dock.classList.toggle('is-playing', playing);
    }
    syncVol();
  }

  function syncVol() {
    if (!volFill) return;
    const muted = !!window.Radio?.muted;
    const v = muted ? 0 : (window.Radio?.volume ?? 0.8);
    volFill.style.width = Math.round(v * 100) + '%';
  }

  document.addEventListener('DOMContentLoaded', init);

  return { toggleOpen, volUp, volDown, togglePlay, stop, sync, syncVol };
})();
