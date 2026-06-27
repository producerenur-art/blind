/* ═══════════════════════════════════════════
   Platform Switcher — bottom-right floating widget
   ═══════════════════════════════════════════ */

(function () {
  const toggle  = document.getElementById('platform-toggle');
  const panel   = document.getElementById('platform-panel');
  const chevron = document.getElementById('platform-chevron');

  const mobileLink  = document.getElementById('platform-mobile');
  const desktopLink = document.getElementById('platform-desktop');
  const storeLink   = document.getElementById('platform-appstore');

  let open = false;

  function applyUrls() {
    const cfg = (typeof CONFIG !== 'undefined') ? CONFIG : {};
    const current = window.location.href;

    mobileLink.href  = cfg.PLATFORM_MOBILE_URL  || current;
    desktopLink.href = cfg.PLATFORM_DESKTOP_URL  || current;
    storeLink.href   = cfg.PLATFORM_APPSTORE_URL || current;

    // Show "coming soon" hint if URL not set
    if (!cfg.PLATFORM_MOBILE_URL)  mobileLink.querySelector('.platform-desc').textContent  = 'Coming soon';
    if (!cfg.PLATFORM_DESKTOP_URL) desktopLink.querySelector('.platform-desc').textContent = 'Coming soon';
    if (!cfg.PLATFORM_APPSTORE_URL) storeLink.querySelector('.platform-desc').textContent  = 'Coming soon';
  }

  function openPanel() {
    open = true;
    panel.classList.add('open');
    chevron.innerHTML = Icon('chevron-down');
    applyUrls();
  }

  function closePanel() {
    open = false;
    panel.classList.remove('open');
    chevron.innerHTML = Icon('chevron-up');
  }

  toggle.addEventListener('click', () => open ? closePanel() : openPanel());

  document.addEventListener('click', e => {
    if (open && !document.getElementById('platform-widget').contains(e.target)) {
      closePanel();
    }
  });
})();
