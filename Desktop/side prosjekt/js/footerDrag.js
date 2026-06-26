const FooterWidget = (() => {
  const STORAGE_KEY = 'footerWidgetState';

  let footer, handle, toggleBtn, restoreBtn;
  let dragging = false;
  let startX, startY, startLeft, startTop;
  let isFloating  = false;
  let isCollapsed = false;

  function init() {
    footer     = document.getElementById('site-footer');
    handle     = document.getElementById('footer-drag-handle');
    toggleBtn  = document.getElementById('footer-toggle-btn');
    restoreBtn = document.getElementById('footer-restore-btn');

    if (!footer || !handle) return;

    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (saved.floating && saved.left != null && saved.top != null) {
      _applyFloat(saved.left, saved.top);
    }
    if (saved.collapsed) {
      _applyCollapse();
    }

    handle.addEventListener('mousedown', onDown);
    handle.addEventListener('touchstart', onDown, { passive: false });
    document.addEventListener('mousemove', onMove);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchend', onUp);
  }

  // ── Drag ─────────────────────────────────────────────────────────────
  function onDown(e) {
    e.preventDefault();
    if (!isFloating) _convertToFloat();
    dragging  = true;
    const pt  = _pt(e);
    startX    = pt.x;
    startY    = pt.y;
    startLeft = parseInt(footer.style.left) || footer.getBoundingClientRect().left;
    startTop  = parseInt(footer.style.top)  || footer.getBoundingClientRect().top;
  }

  function onMove(e) {
    if (!dragging) return;
    e.preventDefault();
    const pt  = _pt(e);
    const dx  = pt.x - startX;
    const dy  = pt.y - startY;
    const maxL = window.innerWidth  - footer.offsetWidth;
    const maxT = window.innerHeight - footer.offsetHeight;
    footer.style.left = Math.max(0, Math.min(maxL, startLeft + dx)) + 'px';
    footer.style.top  = Math.max(0, Math.min(maxT, startTop  + dy)) + 'px';
  }

  function onUp() {
    if (!dragging) return;
    dragging = false;
    _save();
  }

  function _pt(e) {
    const t = e.touches ? e.touches[0] : e;
    return { x: t.clientX, y: t.clientY };
  }

  function _convertToFloat() {
    const rect = footer.getBoundingClientRect();
    _applyFloat(rect.left, rect.top);
  }

  function _applyFloat(left, top) {
    footer.style.left      = left + 'px';
    footer.style.top       = top  + 'px';
    footer.style.bottom    = 'auto';
    footer.style.transform = 'none';
    footer.classList.add('footer-floating');
    isFloating = true;
  }

  // ── Minimize / expand ─────────────────────────────────────────────────
  function _applyCollapse() {
    footer.classList.add('footer-collapsed');
    footer.style.display = 'none';
    if (restoreBtn) restoreBtn.style.display = 'flex';
    isCollapsed = true;
  }

  function toggle() {
    if (isCollapsed) show(); else hide();
  }

  function hide() {
    footer.style.display = 'none';
    if (restoreBtn) restoreBtn.style.display = 'flex';
    isCollapsed = true;
    _save();
  }

  function show() {
    footer.style.display = '';
    if (restoreBtn) restoreBtn.style.display = 'none';
    isCollapsed = false;
    _save();
  }

  function _save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      floating:  isFloating,
      collapsed: isCollapsed,
      left:      footer.style.left,
      top:       footer.style.top,
    }));
  }

  document.addEventListener('DOMContentLoaded', init);

  return { toggle, show, hide };
})();
