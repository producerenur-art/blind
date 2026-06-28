/* ═══════════════════════════════════════════
   Nav bar — scroll / drag-to-pan
   The top nav (#nav-links) holds more tabs than fit on screen, so it
   scrolls horizontally. This adds two extra ways to move it:

     • Mouse wheel  → vertical wheel pans the bar left/right
     • Hold + drag  → grab the bar with the mouse and pull it sideways

   Touchpad two-finger swipe and touch-screen drag already work natively
   (the bar has overflow-x:auto), so those are left untouched.

   A short press still clicks the link underneath; only a real drag
   (> threshold) pans, and the trailing click is then swallowed.
   ═══════════════════════════════════════════ */
const NavDrag = (() => {
  const DRAG_THRESHOLD = 5;   // px before a press counts as a drag, not a click

  let nav;
  let isDown = false, dragging = false, justDragged = false;
  let startX = 0, startScroll = 0;

  const scrollable = () => nav && nav.scrollWidth > nav.clientWidth + 1;

  function init() {
    nav = document.getElementById('nav-links');
    if (!nav) return;

    // Vertical wheel → horizontal pan (leave native horizontal wheel alone)
    nav.addEventListener('wheel', onWheel, { passive: false });

    // Drag-to-pan with the mouse (touch/pen keep native scrolling)
    nav.addEventListener('pointerdown', onDown);
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);

    // Swallow the click that ends a drag so the tab underneath isn't opened.
    // Capture phase runs before the link's own navigation.
    nav.addEventListener('click', e => {
      if (justDragged) { e.stopPropagation(); e.preventDefault(); justDragged = false; }
    }, true);

    window.addEventListener('resize', _refreshCursor);
    _refreshCursor();
  }

  function onWheel(e) {
    if (!scrollable()) return;
    // Only translate a (mostly) vertical wheel; let real horizontal scroll pass.
    if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
    nav.scrollLeft += e.deltaY;
    e.preventDefault();
  }

  function onDown(e) {
    if (e.pointerType === 'touch') return;        // native touch scroll handles it
    if (e.button != null && e.button !== 0) return; // primary button only
    if (!scrollable()) return;                     // nothing to pan
    isDown      = true;
    dragging    = false;
    justDragged = false;
    startX      = e.clientX;
    startScroll = nav.scrollLeft;
  }

  function onMove(e) {
    if (!isDown) return;
    const dx = e.clientX - startX;
    if (!dragging) {
      if (Math.abs(dx) < DRAG_THRESHOLD) return;   // still might be a click
      dragging = true;
      nav.classList.add('nav-grabbing');
    }
    nav.scrollLeft = startScroll - dx;
    e.preventDefault();
  }

  function onUp() {
    if (dragging) {
      justDragged = true;                          // suppress the trailing click
      nav.classList.remove('nav-grabbing');
    }
    isDown   = false;
    dragging = false;
    _refreshCursor();
  }

  // Show a grab cursor only while there's actually something to scroll.
  function _refreshCursor() {
    if (!nav) return;
    nav.classList.toggle('nav-scrollable', scrollable());
  }

  document.addEventListener('DOMContentLoaded', init);

  // Let app.js call this after it re-renders the nav (tab count can change)
  return { refresh: _refreshCursor };
})();
