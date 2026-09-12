/* ═══════════════════════════════════════════
   Edge auto-hide — de 4 flytende kontrollene på høyre kant
   (Core AI-assistent, «Hva er SiriusFM?»-info, Lenker og
   About SiriusFM-fanen) glir bort når musa står stille, og
   kommer fram igjen så snart pekeren beveger seg eller
   skjermen berøres. Gjelder alle — utlogget og innlogget.

   Bakgrunnsfart-knappen berøres IKKE.
   ═══════════════════════════════════════════ */
(function () {
  const IDLE_MS = 2600;          // stillhet før de skjuler seg
  const body = document.body;
  let timer = null;

  // Ikke skjul mens en av panelene deres står åpne.
  function panelsOpen() {
    return !!document.querySelector(
      '.ai-asst:not(.hidden), #dock-links-panel.open, #dock-updates-panel.open, #about-panel.open'
    );
  }

  function show() {
    body.classList.remove('edge-idle');
    clearTimeout(timer);
    timer = setTimeout(hide, IDLE_MS);
  }

  function hide() {
    if (panelsOpen()) { show(); return; }  // hold synlig, prøv igjen senere
    body.classList.add('edge-idle');
  }

  ['mousemove', 'pointermove', 'pointerdown', 'touchstart',
   'keydown', 'wheel', 'scroll'].forEach((ev) =>
    window.addEventListener(ev, show, { passive: true }));

  // Start nedtellingen med det samme (synlige nå, skjuler seg ved stillhet).
  show();
})();
