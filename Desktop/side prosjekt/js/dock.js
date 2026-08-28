/* ═══════════════════════════════════════════
   Control Dock — wires the consolidated bottom-right dock.
   Her håndterer vi kun lenke-popoveren (sosiale lenker).
   ═══════════════════════════════════════════ */
(function () {
  const btn   = document.getElementById('dock-links-btn');
  const panel = document.getElementById('dock-links-panel');
  if (!btn || !panel) return;

  let open = false;
  function close() { open = false; panel.classList.remove('open'); }
  function toggle() { open ? close() : (open = true, panel.classList.add('open')); }

  btn.addEventListener('click', e => { e.stopPropagation(); toggle(); });

  // Close on outside click
  document.addEventListener('click', e => {
    if (open && !document.getElementById('dock-links-widget').contains(e.target)) close();
  });
})();
