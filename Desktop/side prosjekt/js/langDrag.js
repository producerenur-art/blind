/* ═══════════════════════════════════════════
   Language Picker — drag-to-move
   Lets the user pull the language widget anywhere on screen
   (up/down/left/right). A short tap still opens the menu; only a
   real drag (> threshold) moves it. Works whether or not a profile
   has been created — the widget always lives in the dock.
   ═══════════════════════════════════════════ */
const LangDrag = (() => {
  const STORAGE_KEY    = 'langWidgetState';
  const DRAG_THRESHOLD = 5;   // px before a press counts as a drag, not a click

  let widget, toggle;
  let pending = false, dragging = false, justDragged = false, isFloating = false;
  let startX, startY, startLeft, startTop;

  function init() {
    widget = document.getElementById('lang-widget');
    toggle = document.getElementById('lang-toggle');
    if (!widget || !toggle) return;

    // Restore a previously chosen position
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (saved.floating && saved.left != null && saved.top != null) {
      _applyFloat(saved.left, saved.top);
      _clampIntoView();
    }

    // Pointer Events unify mouse, touch and pen (toggle has touch-action:none)
    toggle.addEventListener('pointerdown', onDown);
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);

    // Swallow the click that follows a drag so the panel doesn't toggle.
    // Capture phase runs before lang.js's own click handler.
    toggle.addEventListener('click', e => {
      if (justDragged) { e.stopPropagation(); e.preventDefault(); justDragged = false; }
    }, true);

    window.addEventListener('resize', _clampIntoView);
  }

  // ── Drag ─────────────────────────────────────────────────────────────
  function onDown(e) {
    if (e.button != null && e.button !== 0) return;   // primary button / touch only
    pending     = true;
    dragging    = false;
    justDragged = false;
    const pt = _point(e);
    startX = pt.x;
    startY = pt.y;
    // Don't preventDefault yet — a small move must still register as a click.
  }

  function onMove(e) {
    if (!pending && !dragging) return;
    const pt = _point(e);
    const dx = pt.x - startX;
    const dy = pt.y - startY;

    if (!dragging) {
      if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;
      // Cross the threshold → begin a real drag
      dragging = true;
      if (!isFloating) _convertToFloat();
      startLeft = parseInt(widget.style.left) || widget.getBoundingClientRect().left;
      startTop  = parseInt(widget.style.top)  || widget.getBoundingClientRect().top;
      document.body.classList.add('lang-dragging');
    }

    e.preventDefault();
    const maxL = window.innerWidth  - widget.offsetWidth;
    const maxT = window.innerHeight - widget.offsetHeight;
    widget.style.left = Math.max(0, Math.min(maxL, startLeft + dx)) + 'px';
    widget.style.top  = Math.max(0, Math.min(maxT, startTop  + dy)) + 'px';
  }

  function onUp() {
    if (dragging) {
      justDragged = true;           // suppress the trailing click
      document.body.classList.remove('lang-dragging');
      _save();
    }
    pending  = false;
    dragging = false;
  }

  function _point(e) {
    const t = e.touches ? e.touches[0] : e;
    return { x: t.clientX, y: t.clientY };
  }

  // ── Float ──────────────────────────────────────────────────────────────
  function _convertToFloat() {
    const rect = widget.getBoundingClientRect();
    _applyFloat(rect.left, rect.top);
  }

  function _applyFloat(left, top) {
    widget.style.position = 'fixed';
    widget.style.left     = left + 'px';
    widget.style.top      = top  + 'px';
    widget.style.right    = 'auto';
    widget.style.bottom   = 'auto';
    widget.classList.add('lang-floating');
    isFloating = true;
  }

  function _clampIntoView() {
    if (!isFloating) return;
    const maxL = window.innerWidth  - widget.offsetWidth;
    const maxT = window.innerHeight - widget.offsetHeight;
    const left = Math.max(0, Math.min(maxL, parseInt(widget.style.left) || 0));
    const top  = Math.max(0, Math.min(maxT, parseInt(widget.style.top)  || 0));
    widget.style.left = left + 'px';
    widget.style.top  = top  + 'px';
  }

  // Reset back to the docked corner (handy escape hatch)
  function reset() {
    widget.style.cssText = '';
    widget.classList.remove('lang-floating');
    isFloating = false;
    localStorage.removeItem(STORAGE_KEY);
  }

  function _save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      floating: isFloating,
      left:     parseInt(widget.style.left) || 0,
      top:      parseInt(widget.style.top)  || 0,
    }));
  }

  document.addEventListener('DOMContentLoaded', init);

  return { reset };
})();
