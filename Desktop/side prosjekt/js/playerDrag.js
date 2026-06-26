const PlayerDrag = (() => {
  const STORAGE_KEY = 'playerDragState';

  let bar, handle, minimizeBtn, dockBtn;
  let dragging = false;
  let startX, startY, startLeft, startTop;
  let isFloating = false;
  let isMinimized = false;

  function init() {
    bar         = document.getElementById('player-bar');
    handle      = document.getElementById('player-drag-handle');
    minimizeBtn = document.getElementById('player-minimize-btn');
    dockBtn     = document.getElementById('player-dock-btn');

    if (!bar || !handle) return;

    // Restore saved state
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (saved.floating && saved.left != null && saved.top != null) {
      _applyFloat(saved.left, saved.top);
    }
    if (saved.minimized) {
      _applyMinimize();
    }

    // Drag only on pointer devices (PC/laptop), not touch-only screens
    const hasMouse = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (hasMouse) {
      handle.addEventListener('mousedown', onDown);
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    }
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
    if (minimizeBtn) { minimizeBtn.textContent = '+'; minimizeBtn.title = 'Utvid'; }
    isMinimized = true;
  }

  function toggleMinimize() {
    if (isMinimized) {
      bar.classList.remove('minimized');
      if (minimizeBtn) { minimizeBtn.textContent = '—'; minimizeBtn.title = 'Minimer'; }
      isMinimized = false;
    } else {
      _applyMinimize();
    }
    _save();
  }

  function _save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      floating:  isFloating,
      minimized: isMinimized,
      left:      bar.style.left,
      top:       bar.style.top,
    }));
  }

  document.addEventListener('DOMContentLoaded', init);

  return { dock, toggleMinimize };
})();
