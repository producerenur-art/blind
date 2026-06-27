// DicePlayerDrag — gjør #diceplayer_container flyttbar (venstre/høyre/opp/ned)
// og skalerbar (ut/inn) via et hjørnehåndtak. Posisjon + størrelse lagres.
// Bygget over samme Pointer-Events-mønster som PlayerDrag (mus, touch og pen).
const DicePlayerDrag = (() => {
  const STORAGE_KEY = 'diceplayerDragState';
  const MIN_SCALE = 0.6;
  const MAX_SCALE = 2.6;

  let panel;
  let mode = null;              // 'drag' | 'resize' | null
  let startX, startY, startLeft, startTop, startScale;
  let left = null, top = null, scale = 1;

  function init() {
    panel = document.getElementById('diceplayer_container');
    if (!panel) return;

    // Gjenopprett lagret tilstand
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (saved.scale) scale = clampScale(saved.scale);
    if (saved.left != null && saved.top != null) { left = saved.left; top = saved.top; }
    apply();

    // Play/pause styrer den faktiske lyden (#audio-engine via Player) og holder
    // ikonet i synk med ekte avspillingstilstand — ikke bare et visuelt bytte.
    const audio = document.getElementById('audio-engine');
    panel.querySelector('.cp-play') ?.addEventListener('click', requestToggle);
    panel.querySelector('.cp-pause')?.addEventListener('click', requestToggle);
    if (audio) {
      audio.addEventListener('play',  () => setPlayingUI(true));
      audio.addEventListener('pause', () => setPlayingUI(false));
      audio.addEventListener('ended', () => setPlayingUI(false));
      setPlayingUI(!audio.paused && !!audio.currentSrc);   // riktig tilstand ved last
    }

    panel.addEventListener('pointerdown', onDown);
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
    window.addEventListener('resize', () => { clampIntoView(); apply(); });
  }

  function clampScale(s) { return Math.max(MIN_SCALE, Math.min(MAX_SCALE, s)); }
  function point(e) { const t = e.touches ? e.touches[0] : e; return { x: t.clientX, y: t.clientY }; }

  // ── Start: avgjør om vi drar eller skalerer ───────────────────────────
  function onDown(e) {
    const p = point(e);

    // Hjørnehåndtaket → skaler ut/inn
    if (e.target.closest('.dp-resize')) {
      mode = 'resize';
      startX = p.x; startY = p.y; startScale = scale;
      e.preventDefault();
      panel.setPointerCapture?.(e.pointerId);
      return;
    }

    // Ikke start drag fra interaktive kontroller (play/pause osv.)
    if (e.target.closest('a, button, input')) return;

    mode = 'drag';
    ensurePosition();
    startX = p.x; startY = p.y; startLeft = left; startTop = top;
    e.preventDefault();
    panel.setPointerCapture?.(e.pointerId);
  }

  function onMove(e) {
    if (!mode) return;
    e.preventDefault();
    const p = point(e);

    if (mode === 'drag') {
      left = startLeft + (p.x - startX);
      top  = startTop  + (p.y - startY);
      clampIntoView();
    } else { // resize — diagonal bevegelse styrer skala
      const delta = ((p.x - startX) + (p.y - startY)) / 220;
      scale = clampScale(startScale + delta);
      clampIntoView();
    }
    apply();
  }

  function onUp() {
    if (!mode) return;
    mode = null;
    save();
  }

  // ── Posisjon / grenser ────────────────────────────────────────────────
  // Første gang vi drar: les nåværende plassering og bytt til fri (top/left)-modus.
  function ensurePosition() {
    if (left == null || top == null) {
      const r = panel.getBoundingClientRect();
      left = r.left; top = r.top;
    }
  }

  // Hold widgeten innenfor vinduet (transform-origin er top-left, så den
  // skalerte boksen vokser fra (left,top) og utover).
  function clampIntoView() {
    if (left == null) return;
    const w = panel.offsetWidth  * scale;
    const h = panel.offsetHeight * scale;
    left = Math.max(0, Math.min(window.innerWidth  - w, left));
    top  = Math.max(0, Math.min(window.innerHeight - h, top));
  }

  function apply() {
    panel.style.setProperty('--dp-scale', scale);
    if (left != null && top != null) {
      panel.classList.add('dp-floating');
      panel.style.left = left + 'px';
      panel.style.top  = top  + 'px';
    }
  }

  // Klikk → toggle ekte avspilling, uansett tilstand:
  //  • Radio er aktiv kilde  → Radio.togglePlay() (kobler live-strømmen til igjen).
  //  • En musikksang er lastet → Player.togglePlay().
  //  • Ingenting valgt ennå (første trykk) → start standard web-radio-kanal,
  //    slik at samme knapp deretter kan spille/pause hva som helst.
  // Faller tilbake til å styre <audio> direkte dersom modulene ikke er lastet.
  function requestToggle() {
    const audio = document.getElementById('audio-engine');
    if (window._radioMode && window.Radio?.togglePlay) { Radio.togglePlay(); return; }
    if (audio?.currentSrc && window.Player?.togglePlay) { Player.togglePlay(); return; }
    if (window.Radio?.playDefault) { Radio.playDefault(); return; }
    if (!audio) return;
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  }

  // Speiler play/pause-ikonet etter faktisk avspillingstilstand.
  function setPlayingUI(playing) {
    const play  = panel.querySelector('.cp-play');
    const pause = panel.querySelector('.cp-pause');
    if (!play || !pause) return;
    play.style.display  = playing ? 'none' : '';
    pause.style.display = playing ? ''     : 'none';
    panel.classList.toggle('dp-playing', playing);
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ left, top, scale }));
  }

  // Tilbakestill posisjon + størrelse (kan kalles fra konsoll/UI ved behov).
  function reset() {
    left = top = null; scale = 1;
    panel.classList.remove('dp-floating');
    panel.style.left = panel.style.top = '';
    apply();
    localStorage.removeItem(STORAGE_KEY);
  }

  document.addEventListener('DOMContentLoaded', init);
  return { reset };
})();
