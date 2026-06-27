// PlatformDrag — gjør #platform-widget («Platform»-fanen) fri å flytte:
// venstre/høyre og opp/ned, hvor som helst på skjermen. Posisjon lagres og
// gjenopprettes — og siden dock-elementet finnes i begge tilstander virker
// dette både innlogget og utlogget.
//
// Samme Pointer-Events-mønster som PlayerDrag/DicePlayerDrag (mus, touch, pen).
// Et lite dra-vs-klikk-skille bevarer åpne/lukke-panelet fra platform.js:
// en liten bevegelse = klikk (åpner panelet), en større = drag (flytter fanen).
const PlatformDrag = (() => {
  const STORAGE_KEY = 'platformDragState';
  const THRESHOLD   = 4;   // px før en bevegelse regnes som drag, ikke klikk
  const MARGIN      = 6;   // min. avstand til vinduskanten

  let widget, handle;
  let down = false, dragging = false, moved = false, suppressClick = false;
  let startX = 0, startY = 0;   // peker ved pointerdown
  let grabX = 0, grabY = 0;     // peker-offset inn i widgeten
  let left = null, top = null;

  function init() {
    widget = document.getElementById('platform-widget');
    handle = document.getElementById('platform-toggle');
    if (!widget || !handle) return;

    // Gjenopprett lagret posisjon
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (saved.left != null && saved.top != null) {
      left = saved.left; top = saved.top;
      widget.classList.add('platform-floating');
      clampIntoView();
      apply();
    }

    handle.addEventListener('pointerdown', onDown);
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
    // Capture-fasen kjører før platform.js sin click-listener, så et drag
    // ikke utilsiktet åpner/lukker panelet.
    handle.addEventListener('click', onClick, true);
    window.addEventListener('resize', () => { if (left != null) { clampIntoView(); apply(); } });
  }

  // ── Drag ────────────────────────────────────────────────────────────────
  function onDown(e) {
    if (e.button != null && e.button !== 0) return;  // kun primær-/venstreknapp
    down = true; moved = false; suppressClick = false;
    const r = widget.getBoundingClientRect();
    startX = e.clientX; startY = e.clientY;
    grabX  = e.clientX - r.left;
    grabY  = e.clientY - r.top;
    handle.setPointerCapture?.(e.pointerId);
  }

  function onMove(e) {
    if (!down) return;
    if (!dragging) {
      // Vent til bevegelsen passerer terskelen — under den er det et klikk.
      if (Math.hypot(e.clientX - startX, e.clientY - startY) < THRESHOLD) return;
      dragging = true;
      ensureFloating();   // bytt til fri posisjonering, behold visuell plass
    }
    moved = true;
    e.preventDefault();
    left = e.clientX - grabX;
    top  = e.clientY - grabY;
    clampIntoView();
    apply();
  }

  function onUp(e) {
    if (!down) return;
    down = false;
    handle.releasePointerCapture?.(e.pointerId);
    if (dragging) {
      dragging = false;
      suppressClick = moved;   // svelg den påfølgende click-en hvis vi dro
      save();
    }
  }

  // Hindre at et drag teller som klikk på selve fanen (åpner/lukker panel).
  function onClick(e) {
    if (suppressClick) {
      suppressClick = false;
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  }

  // ── Posisjon / grenser ────────────────────────────────────────────────
  // Første gang vi drar: les nåværende plassering og bytt til fri (top/left).
  function ensureFloating() {
    if (left == null || top == null) {
      const r = widget.getBoundingClientRect();
      left = r.left; top = r.top;
    }
    widget.classList.add('platform-floating');
  }

  function clampIntoView() {
    if (left == null) return;
    const w = widget.offsetWidth;
    const h = widget.offsetHeight;
    left = Math.max(MARGIN, Math.min(window.innerWidth  - w - MARGIN, left));
    top  = Math.max(MARGIN, Math.min(window.innerHeight - h - MARGIN, top));
  }

  function apply() {
    if (left == null || top == null) return;
    widget.style.left   = left + 'px';
    widget.style.top    = top  + 'px';
    widget.style.right  = 'auto';
    widget.style.bottom = 'auto';
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ left, top }));
  }

  // Tilbakestill til dokken (kan kalles fra konsoll/UI ved behov).
  function reset() {
    left = top = null;
    widget.classList.remove('platform-floating');
    widget.style.left = widget.style.top = widget.style.right = widget.style.bottom = '';
    localStorage.removeItem(STORAGE_KEY);
  }

  document.addEventListener('DOMContentLoaded', init);
  return { reset };
})();
