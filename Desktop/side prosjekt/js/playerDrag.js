const PlayerDrag = (() => {
  const STORAGE_KEY = 'playerDragState';

  let bar, handle, minimizeBtn, maximizeBtn, dockBtn;
  let dragging = false;
  let startX, startY, startLeft, startTop;
  let isFloating = false;
  let isMinimized = false;
  let isEnlarged = false;

  // Swap a header button's glyph using the SVG icon system (falls back to text).
  function _setIcon(btn, name) {
    if (!btn) return;
    if (window.Icon) btn.innerHTML = window.Icon(name);
  }

  function init() {
    bar         = document.getElementById('player-bar');
    handle      = document.getElementById('player-drag-handle');
    minimizeBtn = document.getElementById('player-minimize-btn');
    maximizeBtn = document.getElementById('player-maximize-btn');
    dockBtn     = document.getElementById('player-dock-btn');

    if (!bar || !handle) return;

    // Restore saved state
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (saved.floating && saved.left != null && saved.top != null) {
      _applyFloat(saved.left, saved.top);
    }
    if (saved.enlarged) {
      _applyEnlarge();
    }
    if (saved.minimized) {
      _applyMinimize();
    }

    // Pointer Events unify mouse, touch and pen — so the player can be dragged
    // on phones/tablets too (the handle strip has touch-action:none in CSS).
    handle.addEventListener('pointerdown', onDown);
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
  }

  // ── Drag ─────────────────────────────────────────────────────────────
  function onDown(e) {
    if (e.target.closest('button')) return;
    e.preventDefault();

    if (!isFloating) _convertToFloat();

    dragging = true;
    const pt = _point(e);
    startX    = pt.x;
    startY    = pt.y;
    startLeft = parseInt(bar.style.left) || 0;
    startTop  = parseInt(bar.style.top)  || 0;
  }

  function onMove(e) {
    if (!dragging) return;
    e.preventDefault();
    const pt = _point(e);
    const dx = pt.x - startX;
    const dy = pt.y - startY;
    const maxL = window.innerWidth  - bar.offsetWidth;
    const maxT = window.innerHeight - bar.offsetHeight;
    bar.style.left = Math.max(0, Math.min(maxL, startLeft + dx)) + 'px';
    bar.style.top  = Math.max(0, Math.min(maxT, startTop  + dy)) + 'px';
  }

  function onUp() {
    if (!dragging) return;
    dragging = false;
    _save();
  }

  function _point(e) {
    const t = e.touches ? e.touches[0] : e;
    return { x: t.clientX, y: t.clientY };
  }

  // ── Float / dock ──────────────────────────────────────────────────────
  function _convertToFloat() {
    const rect = bar.getBoundingClientRect();
    _applyFloat(rect.left, rect.top);
  }

  function _applyFloat(left, top) {
    bar.style.left   = left + 'px';
    bar.style.top    = top  + 'px';
    bar.style.bottom = 'auto';
    bar.style.right  = 'auto';
    bar.classList.add('floating');
    if (dockBtn) dockBtn.style.display = 'flex';
    isFloating = true;
  }

  function dock() {
    bar.classList.remove('floating');
    bar.style.cssText = '';
    if (dockBtn) dockBtn.style.display = 'none';
    isFloating = false;
    _save();
  }

  // ── Minimize / expand ─────────────────────────────────────────────────
  function _applyMinimize() {
    bar.classList.add('minimized');
    if (minimizeBtn) { _setIcon(minimizeBtn, 'plus'); minimizeBtn.title = 'Utvid'; }
    isMinimized = true;
  }

  function toggleMinimize() {
    if (isMinimized) {
      bar.classList.remove('minimized');
      if (minimizeBtn) { _setIcon(minimizeBtn, 'minus'); minimizeBtn.title = 'Minimer'; }
      isMinimized = false;
    } else {
      // Minimize and enlarge are mutually exclusive.
      if (isEnlarged) toggleMaximize();
      _applyMinimize();
    }
    _save();
  }

  // ── Forstørre (slightly larger) ───────────────────────────────────────
  function _applyEnlarge() {
    bar.classList.add('enlarged');
    if (maximizeBtn) { _setIcon(maximizeBtn, 'minimize-2'); maximizeBtn.title = 'Tilbakestill størrelse'; }
    isEnlarged = true;
  }

  function toggleMaximize() {
    if (isEnlarged) {
      bar.classList.remove('enlarged');
      if (maximizeBtn) { _setIcon(maximizeBtn, 'maximize'); maximizeBtn.title = 'Forstørre'; }
      isEnlarged = false;
    } else {
      // Expand out of minimized first so the bigger controls are visible.
      if (isMinimized) toggleMinimize();
      _applyEnlarge();
    }
    _save();
  }

  function _save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      floating:  isFloating,
      minimized: isMinimized,
      enlarged:  isEnlarged,
      left:      bar.style.left,
      top:       bar.style.top,
    }));
  }

  document.addEventListener('DOMContentLoaded', init);

  return { dock, toggleMinimize, toggleMaximize };
})();
