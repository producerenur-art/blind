// picksDrag.js — gjør radio-«velg favoritt»-kortene (.disc-radio-pick-item)
// fritt flyttbare opp/ned/venstre/høyre via grip-håndtaket.
//
// Kortene re-rendres ofte (renderRadioFavTab), så vi binder ÉN gang på
// document-nivå (event-delegasjon) i stedet for per-kort. Posisjonen lagres
// per stasjons-id i localStorage og bakes inn som transform ved render
// (discover.js leser PicksDrag.positions()).
const PicksDrag = (() => {
  const STORAGE_KEY = 'discPickPos';

  let pos = _load();
  let drag = null; // { el, id, startX, startY, baseX, baseY, moved }

  function _load() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {}; }
    catch { return {}; }
  }
  function _save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(pos)); } catch {}
  }

  function positions() { return pos; }

  function _pt(e) {
    const t = e.touches ? e.touches[0] : e;
    return { x: t.clientX, y: t.clientY };
  }

  function onDown(e) {
    const grip = e.target.closest('.disc-radio-pick-grip');
    if (!grip) return;
    const el = grip.closest('.disc-radio-pick-item');
    if (!el) return;
    e.preventDefault();
    e.stopPropagation();
    const id = el.dataset.pickId;
    const cur = pos[id] || { x: 0, y: 0 };
    const pt = _pt(e);
    drag = { el, id, startX: pt.x, startY: pt.y, baseX: cur.x, baseY: cur.y, moved: false };
    el.classList.add('dragging');
  }

  function onMove(e) {
    if (!drag) return;
    e.preventDefault();
    const pt = _pt(e);
    const x = drag.baseX + (pt.x - drag.startX);
    const y = drag.baseY + (pt.y - drag.startY);
    drag.el.style.transform = `translate(${x}px,${y}px)`;
    drag.el.classList.add('moved');
    drag.moved = true;
    drag._x = x; drag._y = y;
  }

  function onUp() {
    if (!drag) return;
    drag.el.classList.remove('dragging');
    if (drag.moved) {
      pos[drag.id] = { x: Math.round(drag._x), y: Math.round(drag._y) };
      _save();
    }
    drag = null;
  }

  // Dobbeltklikk på grip = snap kortet tilbake i flyten.
  function onDblClick(e) {
    const grip = e.target.closest('.disc-radio-pick-grip');
    if (!grip) return;
    const el = grip.closest('.disc-radio-pick-item');
    if (!el) return;
    e.preventDefault();
    e.stopPropagation();
    delete pos[el.dataset.pickId];
    _save();
    el.style.transform = '';
    el.classList.remove('moved');
  }

  let bound = false;
  function init() {
    if (bound) return;
    bound = true;
    document.addEventListener('mousedown', onDown, true);
    document.addEventListener('touchstart', onDown, { capture: true, passive: false });
    document.addEventListener('mousemove', onMove);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchend', onUp);
    document.addEventListener('dblclick', onDblClick, true);
  }

  document.addEventListener('DOMContentLoaded', init);

  const api = { init, positions };
  window.PicksDrag = api;
  return api;
})();
