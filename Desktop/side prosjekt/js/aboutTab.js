/* ═══════════════════════════════════════════
   About SoundCore — pull-out tab on the right edge.
   Toggles the slide-out panel; closes on outside click,
   Escape, the close button, or following an in-app link.
   ═══════════════════════════════════════════ */
(function () {
  const tab    = document.getElementById('about-tab');
  const handle = document.getElementById('about-tab-handle');
  const panel  = document.getElementById('about-panel');
  const closeBtn = document.getElementById('about-panel-close');
  if (!tab || !handle || !panel) return;

  let open = false;
  function setOpen(v) {
    open = v;
    panel.classList.toggle('open', v);
    panel.setAttribute('aria-hidden', String(!v));
    handle.setAttribute('aria-expanded', String(v));
  }

  handle.addEventListener('click', (e) => { e.stopPropagation(); setOpen(!open); });
  if (closeBtn) closeBtn.addEventListener('click', (e) => { e.stopPropagation(); setOpen(false); });

  document.addEventListener('click', (e) => {
    if (open && !tab.contains(e.target)) setOpen(false);
  });
  document.addEventListener('keydown', (e) => {
    if (open && (e.key === 'Escape' || e.key === 'Esc')) setOpen(false);
  });

  // Following an in-app route from the panel should close it.
  panel.querySelectorAll('a[href^="#/"]').forEach((a) => {
    a.addEventListener('click', () => setOpen(false));
  });
})();
