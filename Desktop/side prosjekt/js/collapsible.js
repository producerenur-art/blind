// Sammenleggbare seksjoner + tydeligere «åpen/lukket»-tilstand på faner.
//
// Selvstendig med vilje: modulen injiserer sin egen CSS og bruker event-delegering,
// så den trenger IKKE å redigere de store, samtidig-redigerte filene
// (discover.js / profile.js / styles.css). Den er additiv og endrer ikke
// standardoppførsel — alt starter åpent, brukeren kan nå klikke for å lukke.
(function () {
  'use strict';

  // ── 1) Egen CSS ────────────────────────────────────────────────────────
  const css = `
    /* Discover-kategoriseksjoner: klikkbar header som åpner/lukker hele seksjonen */
    .disc-psy-section-hdr { cursor: pointer; user-select: none; }
    .disc-psy-section-hdr::after {
      content: '▾'; margin-left: auto; padding-left: 0.5rem;
      transition: transform 0.2s ease; opacity: 0.6; font-size: 0.85rem;
    }
    .disc-psy-section-hdr:hover::after { opacity: 1; }
    .disc-psy-section.sc-collapsed .disc-psy-section-hdr::after { transform: rotate(-90deg); }
    .disc-psy-section.sc-collapsed > *:not(.disc-psy-section-hdr) { display: none !important; }

    /* Profileditor-faner: tydeligere «åpen» fane (fylt pill, ikke bare en strek under) */
    .editor-panel-header .tab-btn.active {
      background: var(--accent, #7c3aed);
      color: #fff !important;
      border-radius: 8px 8px 0 0;
    }

    /* Generisk sammenleggbar blokk: <div class="sc-collapsible">
         <div class="sc-collapsible-hdr">Tittel</div>
         <div class="sc-collapsible-body">…</div></div> */
    .sc-collapsible-hdr { cursor: pointer; user-select: none; display: flex; align-items: center; gap: 0.5rem; }
    .sc-collapsible-hdr::after { content: '▾'; margin-left: auto; transition: transform 0.2s ease; opacity: 0.6; }
    .sc-collapsible.sc-collapsed .sc-collapsible-hdr::after { transform: rotate(-90deg); }
    .sc-collapsible.sc-collapsed > .sc-collapsible-body { display: none !important; }
  `;
  const style = document.createElement('style');
  style.id = 'sc-collapsible-style';
  style.textContent = css;
  (document.head || document.documentElement).appendChild(style);

  // ── 2) Delegert klikk: åpne/lukke ──────────────────────────────────────
  document.addEventListener('click', (e) => {
    // Ikke kapre klikk på lenker/knapper/inputs inne i en header.
    if (e.target.closest('a, button, input, select, textarea')) return;

    const discHdr = e.target.closest('.disc-psy-section-hdr');
    if (discHdr) {
      discHdr.closest('.disc-psy-section')?.classList.toggle('sc-collapsed');
      return;
    }
    const genHdr = e.target.closest('.sc-collapsible-hdr');
    if (genHdr) {
      genHdr.closest('.sc-collapsible')?.classList.toggle('sc-collapsed');
    }
  });
})();
