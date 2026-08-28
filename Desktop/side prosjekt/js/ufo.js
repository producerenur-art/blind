/* ═══════════════════════════════════════════════════════════════════════
   UFO-SCENE — 4 realistiske farkoster som roterer på klokka.
   Erstatter den gamle sett med 5 selvlysende farkoster. Vises bare på
   forsiden (/), radiosiden (/radio) og innlogget «Min side» (/minside).

   Rotasjon («AI rullerer»): ren klokke-styrt tidslinje — alle besøkende ser
   samme farkost til samme tid, ingen backend/AI-kall trengs. Hver farkost
   står i 30 TIMER (1800 min); deretter byttes den til neste. Til sammen 4
   ulike, realistiske farkoster som sykler gjennom. Full syklus = 4×30 t =
   120 timer (5 døgn), så gjentar den seg.

   Silhuettene er ekte «sighting»-arketyper: sølv Adamski-tallerken, mørk
   matt skive, Tic-Tac (Nimitz) og svart trekant (TR-3B). Mindre neon, mer
   metall — kun en myk glød så de leses mot den lyse bakgrunnen. Hver driver
   rolig opp/ned OG venstre/høyre over skjermen.
   ═══════════════════════════════════════════════════════════════════════ */
const UfoScene = (() => {
  const HOST_ID = 'bg-ufo';
  const SHOW_ON = ['/', '/radio', '/minside'];

  // ── De 4 farkostene ───────────────────────────────────────────────────
  // glow = myk ambient-glød (RGB), flight = rørslebane, w = bredde i px.
  const CRAFT = [

    // 0 — Sølv Adamski-tallerken: ren, lys metallisk kuppel + blank kant
    { glow: '200,214,238', flight: 'A', w: 130, svg: `
      <svg viewBox="0 0 240 132" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="s0hull" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#ffffff"/><stop offset=".4" stop-color="#dbe2ef"/>
            <stop offset=".75" stop-color="#b3bccd"/><stop offset="1" stop-color="#8f99ab"/></linearGradient>
          <linearGradient id="s0under" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#c2cad9"/><stop offset=".5" stop-color="#98a1b3"/>
            <stop offset="1" stop-color="#707a8c"/></linearGradient>
          <radialGradient id="s0dome" cx="42%" cy="30%" r="78%">
            <stop offset="0" stop-color="#ffffff"/><stop offset=".45" stop-color="#e2e9f4"/>
            <stop offset=".82" stop-color="#adb7c9"/><stop offset="1" stop-color="#8b96a9"/></radialGradient>
          <linearGradient id="s0rim" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stop-color="#6b7284"/><stop offset=".3" stop-color="#eef3fb"/>
            <stop offset=".5" stop-color="#ffffff"/><stop offset=".7" stop-color="#eef3fb"/>
            <stop offset="1" stop-color="#6b7284"/></linearGradient>
        </defs>
        <ellipse cx="120" cy="80" rx="104" ry="23" fill="url(#s0under)"/>
        <circle cx="80" cy="95" r="5.5" fill="#aab3c4"/>
        <circle cx="120" cy="99" r="5.5" fill="#aab3c4"/>
        <circle cx="160" cy="95" r="5.5" fill="#aab3c4"/>
        <ellipse cx="120" cy="73" rx="104" ry="14" fill="url(#s0rim)"/>
        <path d="M30,72 Q120,44 210,72 Q120,88 30,72Z" fill="url(#s0hull)"/>
        <path d="M84,67 Q120,27 156,67 Q120,57 84,67Z" fill="url(#s0dome)"/>
        <ellipse cx="105" cy="47" rx="11" ry="6" fill="#ffffff" opacity=".5"/>
      </svg>` },

    // 1 — Ren lys matt skive med lav kuppel + svake ravgule kantlys
    { glow: '255,180,110', flight: 'B', w: 140, svg: `
      <svg viewBox="0 0 240 120" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="s1top" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#cfd5e1"/><stop offset=".5" stop-color="#a3abbb"/>
            <stop offset="1" stop-color="#7c8496"/></linearGradient>
          <linearGradient id="s1dome" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#e6eaf1"/><stop offset="1" stop-color="#9aa1b2"/></linearGradient>
          <radialGradient id="s1glow" cx="50%" cy="30%" r="72%">
            <stop offset="0" stop-color="#ffd9a0"/><stop offset=".5" stop-color="#ff9f45" stop-opacity=".5"/>
            <stop offset="1" stop-color="#ff9f45" stop-opacity="0"/></radialGradient>
        </defs>
        <path d="M18,62 Q120,98 222,62 Q120,40 18,62Z" fill="url(#s1top)"/>
        <path d="M56,56 Q120,34 184,56 Q120,66 56,56Z" fill="url(#s1dome)" opacity=".9"/>
        <ellipse cx="120" cy="70" rx="82" ry="12" fill="url(#s1glow)" class="ufo-underglow"/>
        <g class="ufo-lights">
          <circle cx="66" cy="64" r="3.2" fill="#ffd27a"/><circle cx="93" cy="72" r="3.2" fill="#fff0c0"/>
          <circle cx="120" cy="74" r="3.2" fill="#ffd27a"/><circle cx="147" cy="72" r="3.2" fill="#fff0c0"/>
          <circle cx="174" cy="64" r="3.2" fill="#ffd27a"/>
        </g>
      </svg>` },

    // 2 — Tic-Tac (Nimitz): glatt, hvit, matt kapsel uten lys
    { glow: '223,230,242', flight: 'C', w: 150, svg: `
      <svg viewBox="0 0 260 96" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="s2body" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#ffffff"/><stop offset=".4" stop-color="#e7ecf3"/>
            <stop offset=".72" stop-color="#b7bfcd"/><stop offset="1" stop-color="#828b9c"/></linearGradient>
          <linearGradient id="s2cap" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stop-color="#9aa2b2"/><stop offset=".5" stop-color="#eef2f8"/>
            <stop offset="1" stop-color="#9aa2b2"/></linearGradient>
        </defs>
        <ellipse cx="130" cy="70" rx="98" ry="9" fill="rgba(110,120,140,.22)"/>
        <rect x="32" y="30" width="196" height="40" rx="20" fill="url(#s2body)"/>
        <rect x="34" y="32" width="192" height="36" rx="18" fill="none" stroke="url(#s2cap)" stroke-width="1.4" opacity=".5"/>
        <rect x="66" y="37" width="120" height="9" rx="4.5" fill="#ffffff" opacity=".55"/>
      </svg>` },

    // 3 — Ren grå trekant (TR-3B): tre hvite hjørnelys + varmt senterlys
    { glow: '210,222,255', flight: 'D', w: 122, svg: `
      <svg viewBox="0 0 220 152" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="s3body" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#9098ac"/><stop offset=".55" stop-color="#6a7285"/>
            <stop offset="1" stop-color="#4d5568"/></linearGradient>
          <radialGradient id="s3corner" cx="50%" cy="50%" r="50%">
            <stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#dfe8ff"/>
            <stop offset="1" stop-color="#dfe8ff" stop-opacity="0"/></radialGradient>
          <radialGradient id="s3red" cx="50%" cy="50%" r="50%">
            <stop offset="0" stop-color="#ffd0b0"/><stop offset=".5" stop-color="#ff5a3c"/>
            <stop offset="1" stop-color="#ff5a3c" stop-opacity="0"/></radialGradient>
        </defs>
        <path d="M18,36 L202,36 L110,142 Z" fill="url(#s3body)"/>
        <path d="M18,36 L202,36 L110,48 Z" fill="#c3cad8" opacity=".6"/>
        <circle cx="110" cy="66" r="8" fill="url(#s3red)" class="ufo-underglow"/>
        <g class="ufo-lights">
          <circle cx="30" cy="40" r="7" fill="url(#s3corner)"/>
          <circle cx="190" cy="40" r="7" fill="url(#s3corner)"/>
          <circle cx="110" cy="132" r="7" fill="url(#s3corner)"/>
        </g>
        <circle cx="30" cy="40" r="2.6" fill="#ffffff"/>
        <circle cx="190" cy="40" r="2.6" fill="#ffffff"/>
        <circle cx="110" cy="132" r="2.6" fill="#ffffff"/>
      </svg>` },
  ];

  // ── Rotasjons-tidslinje ────────────────────────────────────────────────
  // Hver farkost står i 30 TIMER (1800 min). Alle 4 sykler i rekkefølge.
  // Full syklus = 4×1800 = 7200 min = 120 timer (5 døgn).
  const SLOT_MIN = 1800;   // 30 timer per farkost
  const SCHEDULE = [
    { u: 0, d: SLOT_MIN }, { u: 1, d: SLOT_MIN },
    { u: 2, d: SLOT_MIN }, { u: 3, d: SLOT_MIN },
  ];
  const CYCLE_MIN = SCHEDULE.reduce((s, x) => s + x.d, 0);

  function activeIndex() {
    let m = Math.floor(Date.now() / 60000) % CYCLE_MIN;
    for (const slot of SCHEDULE) {
      if (m < slot.d) return slot.u;
      m -= slot.d;
    }
    return SCHEDULE[0].u;   // uråd, men trygt
  }

  // ── DOM + visning ──────────────────────────────────────────────────────
  let el = null, shownIdx = -1;

  function injectStyle() {
    if (document.getElementById('ufo-style')) return;
    const s = document.createElement('style');
    s.id = 'ufo-style';
    s.textContent = `
      #${HOST_ID}{
        position:absolute; top:16vh; left:0; z-index:0;
        pointer-events:none; will-change:transform; --ufo-glow:200,214,238;
        transition:opacity .8s ease;
      }
      #${HOST_ID}::before{
        content:""; position:absolute; left:50%; top:46%;
        width:160%; height:140%; transform:translate(-50%,-50%);
        border-radius:50%; z-index:-1; pointer-events:none;
        background:radial-gradient(ellipse at center,
          rgba(var(--ufo-glow),0.24) 0%, rgba(var(--ufo-glow),0.10) 38%, transparent 70%);
        filter:blur(12px); animation:ufoAura 4.2s ease-in-out infinite;
      }
      #${HOST_ID} svg{
        display:block; width:100%; height:auto; overflow:visible;
        /* Kun en myk, farget glød — ingen svart slagskygge (den lagde mørke
           striper mot den lyse bakgrunnen). */
        filter:drop-shadow(0 0 10px rgba(var(--ufo-glow),.4));
      }
      #${HOST_ID} .ufo-lights circle,
      #${HOST_ID} .ufo-underglow{
        filter:drop-shadow(0 0 5px rgba(var(--ufo-glow),.9));
        animation:ufoBlink 2.1s ease-in-out infinite;
        transform-box:fill-box; transform-origin:center;
      }
      #${HOST_ID} .ufo-lights circle:nth-child(2){animation-delay:.25s}
      #${HOST_ID} .ufo-lights circle:nth-child(3){animation-delay:.5s}
      #${HOST_ID} .ufo-lights circle:nth-child(4){animation-delay:.75s}
      #${HOST_ID} .ufo-lights circle:nth-child(5){animation-delay:1s}
      @keyframes ufoAura{0%,100%{opacity:.65;transform:translate(-50%,-50%) scale(.97)}
        50%{opacity:.95;transform:translate(-50%,-50%) scale(1.05)}}
      @keyframes ufoBlink{0%,100%{opacity:.6}50%{opacity:1}}
      /* Rørslebaner — drift både opp/ned OG venstre/høyre tvers over skjermen.
         Varierende fart: noen raske, noen roligere (men aldri for trege).
         A = rask, D = rask-medium, C = medium, B = rolig. */
      .ufo-fly-A{animation:ufoFlyA 26s ease-in-out infinite}
      .ufo-fly-B{animation:ufoFlyB 50s ease-in-out infinite}
      .ufo-fly-C{animation:ufoFlyC 38s ease-in-out infinite}
      .ufo-fly-D{animation:ufoFlyD 30s ease-in-out infinite}
      /* A — venstre→høyre, bølger opp/ned med myk banking */
      @keyframes ufoFlyA{0%{transform:translate(-24vw,0) rotate(-2deg)}
        20%{transform:translate(12vw,-5vh) rotate(2deg)}
        40%{transform:translate(42vw,4vh) rotate(-2deg)}
        60%{transform:translate(72vw,-4vh) rotate(2deg)}
        80%{transform:translate(98vw,3vh) rotate(-1deg)}
        100%{transform:translate(122vw,0) rotate(-2deg)}}
      /* B — høyre→venstre, større boge og motbanking */
      @keyframes ufoFlyB{0%{transform:translate(122vw,1vh) rotate(2deg)}
        25%{transform:translate(86vw,-6vh) rotate(-2deg)}
        50%{transform:translate(46vw,5vh) rotate(2deg)}
        75%{transform:translate(12vw,-4vh) rotate(-2deg)}
        100%{transform:translate(-24vw,1vh) rotate(2deg)}}
      /* C — slyngende serpentin med flere vendepunkter */
      @keyframes ufoFlyC{0%{transform:translate(-22vw,2vh) rotate(-1deg)}
        15%{transform:translate(8vw,-6vh) rotate(2deg)}
        30%{transform:translate(32vw,5vh) rotate(-2deg)}
        45%{transform:translate(56vw,-5vh) rotate(1deg)}
        60%{transform:translate(80vw,6vh) rotate(-2deg)}
        80%{transform:translate(104vw,-4vh) rotate(2deg)}
        100%{transform:translate(124vw,2vh) rotate(-1deg)}}
      /* D — diagonal drift som klatrer og dukker */
      @keyframes ufoFlyD{0%{transform:translate(-22vw,7vh) rotate(1deg)}
        25%{transform:translate(18vw,-4vh) rotate(-2deg)}
        50%{transform:translate(52vw,7vh) rotate(1deg)}
        75%{transform:translate(88vw,-5vh) rotate(-1deg)}
        100%{transform:translate(124vw,6vh) rotate(1deg)}}
      @media (prefers-reduced-motion:reduce){
        #${HOST_ID}{animation:none!important;transform:translate(50vw,0)!important}
        #${HOST_ID} *{animation:none!important}
      }`;
    document.head.appendChild(s);
  }

  function ensureEl() {
    if (el && document.body.contains(el)) return el;
    injectStyle();
    el = document.getElementById(HOST_ID);
    if (!el) {
      el = document.createElement('div');
      el.id = HOST_ID;
      el.setAttribute('aria-hidden', 'true');
      const layer = document.getElementById('bg-layer') || document.body;
      layer.appendChild(el);
    }
    return el;
  }

  function currentPath() {
    return (location.hash || '').replace(/^#/, '') || '/';
  }
  function shouldShow() {
    return SHOW_ON.includes(currentPath());
  }

  function swapTo(idx) {
    const c = CRAFT[idx];
    el.style.setProperty('--ufo-glow', c.glow);
    el.style.width = c.w + 'px';
    el.className = 'ufo-fly-' + c.flight;
    el.innerHTML = c.svg;
  }

  function render() {
    ensureEl();
    if (!shouldShow()) { el.style.opacity = '0'; el.style.display = 'none'; return; }
    el.style.display = 'block';
    requestAnimationFrame(() => { el.style.opacity = '1'; });
    const idx = activeIndex();
    if (idx !== shownIdx) { swapTo(idx); shownIdx = idx; }
  }

  function init() {
    render();
    window.addEventListener('hashchange', render);
    // Sjekk tidslinja jevnlig (hvert minutt) så bytet skjer nær bolke-grensa.
    setInterval(render, 60000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return { render, activeIndex, _craft: CRAFT };
})();
