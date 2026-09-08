/* ═══════════════════════════════════════════
   Control Dock — wires the consolidated bottom-right dock.
   Håndterer popover-widgetene (lenker, e-postoppdateringer).
   ═══════════════════════════════════════════ */
(function () {
  function wireWidget(btnId, panelId, widgetId) {
    const btn    = document.getElementById(btnId);
    const panel  = document.getElementById(panelId);
    const widget = document.getElementById(widgetId);
    if (!btn || !panel || !widget) return;

    let open = false;
    function close() { open = false; panel.classList.remove('open'); }
    function toggle() { open ? close() : (open = true, panel.classList.add('open')); }

    btn.addEventListener('click', e => { e.stopPropagation(); toggle(); });

    // Close on outside click
    document.addEventListener('click', e => {
      if (open && !widget.contains(e.target)) close();
    });
  }

  wireWidget('dock-links-btn', 'dock-links-panel', 'dock-links-widget');
  wireWidget('dock-updates-btn', 'dock-updates-panel', 'dock-updates-widget');
})();
