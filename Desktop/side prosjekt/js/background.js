// Psychedelic background — image upload, CSS animations, particle canvas
const BgManager = (() => {

  const BG_ID        = 'site_bg_v1';
  const EFFECT_KEY   = 'pv_bg_effect';
  const PARTICLE_KEY = 'pv_bg_particles';
  const UFO_SIZE_KEY = 'pv_ufo_size';
  // Standard-bakgrunner som roterer som en pauseskjerm når ingen egen bakgrunn er
  // lagret. Legg bildene i assets/ (default-bg.jpg, bg1.jpg, bg2.jpg, …). De som
  // finnes brukes; manglende hoppes over. Kryssfader gjennom den mørke bakgrunnen.
  const DEFAULT_BGS = [
    'assets/default-bg.jpg',
    'assets/bg1.jpg', 'assets/bg2.jpg', 'assets/bg3.jpg',
    'assets/bg4.jpg', 'assets/bg5.jpg', 'assets/bg6.jpg',
  ];
  const SLIDE_MS = 14000;   // bytt bilde hvert 14. sekund

  const EFFECTS = {
    cosmos:      { label: '🛸 Verdensrom',   hue: '40s',  breathe: '40s', sat: 1.4, bright: 0.40 },
    psychedelic: { label: '🌀 Psykedelisk', hue: '10s',  breathe: '9s',  sat: 2.2, bright: 0.55 },
    acid:        { label: '⚡ Acid',         hue: '3s',   breathe: '2.5s',sat: 4.0, bright: 0.65 },
    space:       { label: '🚀 Space',        hue: '30s',  breathe: '20s', sat: 1.6, bright: 0.40 },
    chill:       { label: '🌿 Chill',        hue: '25s',  breathe: '16s', sat: 1.8, bright: 0.60 },
  };

  const PARTICLES = {
    stars:   '✨ Stjerner',
    bubbles: '🫧 Bobler',
    sparks:  '⚡ Gnister',
    aurora:  '🌌 Aurora',
    none:    '✕ Ingen',
  };

  // UFO-størrelse (kun synlig med cosmos-effekt). "full" parkerer tallerkenen
  // midt på siden og lar den dekke skjermen — se styles.css.
  const UFO_SIZES = {
    small:  '🛸 Liten',
    medium: '🛸 Middels',
    large:  '🛸 Stor',
    full:   '🛸 Fullskjerm',
  };

  let currentEffect   = localStorage.getItem(EFFECT_KEY)   || 'cosmos';
  let currentParticles= localStorage.getItem(PARTICLE_KEY) || 'stars';
  let currentUfoSize  = localStorage.getItem(UFO_SIZE_KEY) || 'medium';

  let canvas, ctx, frame, particles = [];

  // ── Init ──────────────────────────────────────────────────────────────
  async function init() {
    // Particle canvas
    canvas = document.getElementById('bg-particles-canvas');
    if (canvas) {
      resize();
      window.addEventListener('resize', resize);
      ctx = canvas.getContext('2d');
      startParticles();
    }

    // Apply saved effect + UFO size
    document.body.dataset.bgEffect = currentEffect;
    document.body.dataset.ufoSize  = currentUfoSize;

    // Make the UFO grabbable: drag to move, corner handles to resize
    initUfoControls();

    // Pause all CSS background animations while the tab is backgrounded — no point
    // burning GPU/CPU compositing nebula + prism layers nobody is looking at.
    const bgLayer = document.getElementById('bg-layer');
    if (bgLayer) {
      document.addEventListener('visibilitychange', () => {
        bgLayer.style.animationPlayState = document.hidden ? 'paused' : 'running';
      });
    }

    // Load saved image from IndexedDB, else fall back to the default site image
    try {
      const url = await DB.getBlobUrl('media', BG_ID);
      if (url) _showImage(url);
      else _startDefaultSlideshow();
    } catch { _startDefaultSlideshow(); }
  }

  // Roter standard-bakgrunnene som en pauseskjerm — men bare de filene som finnes.
  let _slideList = [], _slideIdx = 0, _slideTimer = null;

  async function _startDefaultSlideshow() {
    const found = await Promise.all(DEFAULT_BGS.map(src => new Promise(res => {
      const im = new Image();
      im.onload  = () => res(src);
      im.onerror = () => res(null);
      im.src = src;
    })));
    _slideList = found.filter(Boolean);
    if (!_slideList.length) return;        // ingen filer ennå → behold prosedyre-bg
    _slideIdx = 0;
    _showImage(_slideList[0]);
    const base = document.getElementById('bg-img');
    if (base) base.style.transition = 'opacity 1.6s ease-in-out';
    if (_slideList.length < 2) return;     // bare ett bilde → ingen rotasjon
    clearInterval(_slideTimer);
    _slideTimer = setInterval(_nextSlide, SLIDE_MS);
  }

  // Kryssfade: ton ut til den mørke bakgrunnen, bytt bilde, ton inn igjen.
  function _nextSlide() {
    const base = document.getElementById('bg-img');
    if (!base || _slideList.length < 2 || document.hidden) return;
    _slideIdx = (_slideIdx + 1) % _slideList.length;
    base.style.opacity = '0';
    setTimeout(() => { base.src = _slideList[_slideIdx]; base.style.opacity = ''; }, 1600);
  }

  function resize() {
    if (!canvas) return;
    // Cap device-pixel-ratio at 1.5 — rendering the fullscreen particle field at
    // retina 2x–3x quadruples fill cost for no visible gain on a soft glow layer.
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width  = Math.floor(window.innerWidth  * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width  = window.innerWidth  + 'px';
    canvas.style.height = window.innerHeight + 'px';
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  // CSS-pixel dimensions used by spawn/draw logic.
  function vw() { return canvas.width  / Math.min(window.devicePixelRatio || 1, 1.5); }
  function vh() { return canvas.height / Math.min(window.devicePixelRatio || 1, 1.5); }

  // ── Image upload ──────────────────────────────────────────────────────
  async function uploadImage(input) {
    const file = input.files?.[0];
    if (!file) return;
    input.value = ''; // reset so same file can be re-selected

    const btn = document.getElementById('bg-change-btn');
    if (btn) { btn.textContent = '⏳'; btn.style.pointerEvents = 'none'; }

    try {
      await DB.storeFile('media', BG_ID, file);
      const url = await DB.getBlobUrl('media', BG_ID);
      _showImage(url);
      if (typeof App !== 'undefined') App.toast('Bakgrunn oppdatert ✓', 'success');
    } catch (e) {
      if (typeof App !== 'undefined') App.toast('Feil ved opplasting', 'error');
    } finally {
      if (btn) { btn.textContent = '🖼️'; btn.style.pointerEvents = ''; }
    }
  }

  function _showImage(url) {
    const img = document.getElementById('bg-img');
    if (!img) return;
    img.src = url;
    img.style.display = '';
    // Reapply current effect so animation restarts cleanly
    _applyEffect(currentEffect);
  }

  // ── Effect controls ───────────────────────────────────────────────────
  function _applyEffect(id) {
    currentEffect = id;
    localStorage.setItem(EFFECT_KEY, id);
    document.body.dataset.bgEffect = id;
    // CSS @keyframes + body data attribute handle everything else
  }

  function setEffect(id) {
    _applyEffect(id);
    // Update picker buttons if panel is open
    document.querySelectorAll('.effect-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.effect === id);
    });
  }

  // ── UFO size ──────────────────────────────────────────────────────────
  function setUfoSize(size) {
    if (!UFO_SIZES[size]) return;
    // Et størrelsesvalg nullstiller en manuell plassering, slik at presetet
    // (bredde + evt. fullskjerm-parkering) faktisk vises i stedet for å bli
    // overstyrt av inline left/top/width fra dra-/skaleringslogikken.
    resetUfoFree();
    currentUfoSize = size;
    localStorage.setItem(UFO_SIZE_KEY, size);
    document.body.dataset.ufoSize = size;
    document.querySelectorAll('.ufo-size-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.ufoSize === size);
    });
  }

  // ── UFO drag + resize ─────────────────────────────────────────────────
  // Tallerkenen kan dras fritt (opp/ned/venstre/høyre) og skaleres via fire
  // hjørnehåndtak — større eller minimert ned i et hjørne. Plassering + bredde
  // lagres, så den ligger der du la den ved neste lasting. Dobbeltklikk =
  // nullstill og la den fly igjen.
  const UFO_FREE_KEY = 'pv_ufo_free';
  const UFO_MIN_W = 48;                 // minimert
  const UFO_ASPECT = 300 / 220;         // svg viewBox h/w → høyde = bredde * dette
  const ufoMaxW = () => Math.min(2000, window.innerWidth * 1.5);

  // Fjern manuell plassering → tilbake til CSS-styrt (flyr igjen / preset-bredde)
  function resetUfoFree() {
    const ufo = document.getElementById('bg-ufo');
    if (!ufo) return;
    ufo.classList.remove('ufo-free');
    ufo.style.left = ufo.style.top = ufo.style.width = '';
    localStorage.removeItem(UFO_FREE_KEY);
  }

  function initUfoControls() {
    const ufo = document.getElementById('bg-ufo');
    if (!ufo || ufo.dataset.ufoCtl) return;   // bare én gang
    ufo.dataset.ufoCtl = '1';
    ufo.classList.add('ufo-interactive');

    // Hjørnehåndtak for skalering
    ['nw', 'ne', 'sw', 'se'].forEach(c => {
      const h = document.createElement('div');
      h.className = 'ufo-handle ' + c;
      h.dataset.corner = c;
      ufo.appendChild(h);
    });

    // Gjenopprett en tidligere plassert/skalert tallerken (klemt innenfor skjermen)
    try {
      const s = JSON.parse(localStorage.getItem(UFO_FREE_KEY) || 'null');
      if (s && Number.isFinite(s.x)) {
        const w = Number.isFinite(s.w) ? s.w : 200;
        ufo.classList.add('ufo-free');
        if (Number.isFinite(s.w)) ufo.style.width = w + 'px';
        ufo.style.left = Math.min(Math.max(40 - w, s.x), window.innerWidth - 40) + 'px';
        ufo.style.top  = Math.min(Math.max(0, s.y), window.innerHeight - 40) + 'px';
      }
    } catch {}

    let mode = null;                    // 'drag' | 'resize'
    let startX = 0, startY = 0, originLeft = 0, originTop = 0;
    let cx = 0, cy = 0, startW = 0, dirX = 1;

    // Frikoble fra flyge-animasjonen og frys på nåværende skjermposisjon
    function freeNow() {
      const r = ufo.getBoundingClientRect();
      ufo.classList.add('ufo-free');
      ufo.style.left  = r.left + 'px';
      ufo.style.top   = r.top + 'px';
      ufo.style.width = r.width + 'px';
      return r;
    }

    function save() {
      localStorage.setItem(UFO_FREE_KEY, JSON.stringify({
        x: parseFloat(ufo.style.left) || 0,
        y: parseFloat(ufo.style.top) || 0,
        w: parseFloat(ufo.style.width) || ufo.getBoundingClientRect().width,
      }));
    }

    function onMove(e) {
      if (!mode) return;
      if (mode === 'drag') {
        const w = ufo.getBoundingClientRect().width;
        let nx = originLeft + (e.clientX - startX);
        let ny = originTop  + (e.clientY - startY);
        nx = Math.max(40 - w, Math.min(window.innerWidth - 40, nx));   // hold litt synlig
        ny = Math.max(0, Math.min(window.innerHeight - 40, ny));
        ufo.style.left = nx + 'px';
        ufo.style.top  = ny + 'px';
      } else {
        const delta = (e.clientX - startX) * dirX;            // utover = større
        const w = Math.max(UFO_MIN_W, Math.min(ufoMaxW(), startW + delta * 2));
        const h = w * UFO_ASPECT;
        ufo.style.width = w + 'px';
        ufo.style.left  = (cx - w / 2) + 'px';                // skaler om sentrum
        ufo.style.top   = (cy - h / 2) + 'px';
      }
    }

    function onUp(e) {
      mode = null;
      ufo.classList.remove('ufo-dragging', 'ufo-resizing');
      try { ufo.releasePointerCapture(e.pointerId); } catch {}
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      save();
    }

    ufo.addEventListener('pointerdown', (e) => {
      if (e.button) return;                                   // bare primærknapp
      const handle = e.target.closest('.ufo-handle');
      const r = freeNow();
      startX = e.clientX; startY = e.clientY;
      if (handle) {
        mode = 'resize';
        dirX = (handle.dataset.corner === 'ne' || handle.dataset.corner === 'se') ? 1 : -1;
        startW = r.width;
        cx = r.left + r.width / 2;
        cy = r.top + r.height / 2;
        ufo.classList.add('ufo-resizing');
      } else {
        mode = 'drag';
        originLeft = r.left; originTop = r.top;
        ufo.classList.add('ufo-dragging');
      }
      try { ufo.setPointerCapture(e.pointerId); } catch {}
      e.preventDefault();
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    });

    // Dobbeltklikk → nullstill: glem lagret plass og la den fly igjen
    ufo.addEventListener('dblclick', (e) => { e.preventDefault(); resetUfoFree(); });
  }

  // ── Particle system ───────────────────────────────────────────────────
  function setParticleStyle(style) {
    currentParticles = style;
    localStorage.setItem(PARTICLE_KEY, style);
    particles = [];
    document.querySelectorAll('.particle-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.pstyle === style);
    });
  }

  const FRAME_MS = 1000 / 30;   // throttle particle field to 30fps — plenty for ambient glow

  function startParticles() {
    if (frame) cancelAnimationFrame(frame);
    let lastTime = 0;
    let lastDraw = 0;
    function tick(now) {
      frame = requestAnimationFrame(tick);
      // Skip work while the tab is hidden, or to hold ~30fps.
      if (document.hidden) { lastDraw = now; return; }
      if (now - lastDraw < FRAME_MS) return;
      const dt = now - lastTime;
      lastTime = now;
      lastDraw = now;
      if (!ctx || !canvas.width) return;

      const W = vw(), H = vh();

      if (currentParticles === 'none') {
        ctx.clearRect(0, 0, W, H);
        return;
      }

      // Subtle fade trail
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.fillRect(0, 0, W, H);

      // Spawn (counts trimmed — shadowBlur removal lets these stay lively cheaply)
      const maxP = currentParticles === 'sparks' ? 120 : currentParticles === 'aurora' ? 18 : 70;
      const spawnRate = currentParticles === 'aurora' ? 0.12 : 0.4;
      if (particles.length < maxP && Math.random() < spawnRate) spawn(now);

      // Update + draw
      particles = particles.filter(p => p.life > 0.01);
      for (const p of particles) tick_p(p, now, dt);
    }
    tick(0);
    // Restart the loop cleanly when returning to the tab so dt doesn't spike.
    document.addEventListener('visibilitychange', () => { lastTime = performance.now(); });
  }

  function spawn(t) {
    const hue = (t * 0.04) % 360;
    const W = vw(), H = vh();
    if (currentParticles === 'stars') {
      particles.push({
        x: Math.random() * W, y: Math.random() * H,
        r: 0.8 + Math.random() * 2.5,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -0.15 - Math.random() * 0.4,
        hue, life: 1, decay: 0.003 + Math.random() * 0.004,
        type: 'star',
      });
    } else if (currentParticles === 'bubbles') {
      particles.push({
        x: Math.random() * W, y: H + 15,
        r: 4 + Math.random() * 10,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -0.4 - Math.random() * 0.9,
        hue, life: 1, decay: 0.0025 + Math.random() * 0.002,
        wobble: Math.random() * Math.PI * 2,
        type: 'bubble',
      });
    } else if (currentParticles === 'sparks') {
      const sx = Math.random() * W, sy = Math.random() * H;
      for (let i = 0; i < 4; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = 1 + Math.random() * 3.5;
        particles.push({
          x: sx, y: sy,
          vx: Math.cos(a) * s, vy: Math.sin(a) * s - 1.5,
          r: 1 + Math.random() * 1.5,
          hue: hue + i * 30, life: 1,
          decay: 0.018 + Math.random() * 0.02,
          type: 'spark',
        });
      }
    } else if (currentParticles === 'aurora') {
      particles.push({
        x: Math.random() * W,
        y: H * 0.1 + Math.random() * H * 0.6,
        vx: (Math.random() - 0.5) * 0.8,
        vy: (Math.random() - 0.5) * 0.3,
        r: 60 + Math.random() * 120,
        hue, life: 1,
        decay: 0.002 + Math.random() * 0.002,
        phase: Math.random() * Math.PI * 2,
        type: 'aurora',
      });
    }
  }

  function tick_p(p, now, dt) {
    p.life -= p.decay;
    p.x   += p.vx;
    p.y   += p.vy;

    if (p.type === 'bubble') {
      p.wobble = (p.wobble || 0) + 0.04;
      p.x += Math.sin(p.wobble) * 0.35;
    }
    if (p.type === 'spark') p.vy += 0.06; // gravity
    if (p.type === 'aurora') p.y += Math.sin((p.phase || 0) + now * 0.0005) * 0.4;

    const hue  = (p.hue + now * 0.05) % 360;
    const alpha = p.life;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    // NOTE: ctx.shadowBlur is intentionally avoided — it gaussian-blurs every
    // particle every frame and was the single biggest canvas cost. Glow is faked
    // with a cheap larger low-alpha disc instead.
    if (p.type === 'star') {
      // Cosmos scene wants real starlight (cool white), not the rotating-hue glow.
      const haloC = currentEffect === 'cosmos' ? `hsla(210,35%,90%,${alpha * 0.16})` : `hsla(${hue},90%,75%,${alpha * 0.18})`;
      const coreC = currentEffect === 'cosmos' ? `hsla(210,25%,98%,${alpha * 0.95})` : `hsla(${hue},90%,82%,${alpha * 0.9})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 2.4, 0, Math.PI * 2);
      ctx.fillStyle = haloC;  // soft halo
      ctx.fill();
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = coreC;   // bright core
      ctx.fill();
    } else if (p.type === 'bubble') {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.strokeStyle = `hsla(${hue},85%,75%,${alpha * 0.85})`;
      ctx.lineWidth   = 1.5;
      ctx.stroke();
      ctx.fillStyle   = `hsla(${hue},60%,80%,${alpha * 0.08})`;
      ctx.fill();
    } else if (p.type === 'spark') {
      const trail = 7;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * trail, p.y - p.vy * trail);
      ctx.strokeStyle = `hsla(${hue},95%,80%,${alpha})`;
      ctx.lineWidth   = p.r;
      ctx.lineCap     = 'round';
      ctx.stroke();
    } else if (p.type === 'aurora') {
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
      grad.addColorStop(0,   `hsla(${hue},85%,65%,${alpha * 0.18})`);
      grad.addColorStop(0.4, `hsla(${(hue+60)%360},80%,60%,${alpha * 0.10})`);
      grad.addColorStop(1,   `hsla(${(hue+120)%360},75%,55%,0)`);
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.r, p.r * 0.35, now * 0.0002, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    }

    ctx.restore();
  }

  // ── Picker UI ─────────────────────────────────────────────────────────
  function openPicker() {
    const existing = document.getElementById('bg-picker-panel');
    if (existing) { existing.remove(); return; }

    const panel = document.createElement('div');
    panel.id = 'bg-picker-panel';
    panel.innerHTML = `
      <div class="picker-section-label">Ditt bakgrunnsbilde</div>
      <button class="picker-upload-btn" onclick="document.getElementById('bg-file-input').click()">
        ${Icon('camera')} Last opp bilde
      </button>

      <div class="picker-section-label">Psykedelisk effekt</div>
      <div class="effect-grid">
        ${Object.entries(EFFECTS).map(([id, e]) => `
          <button class="effect-btn ${currentEffect === id ? 'active' : ''}"
                  data-effect="${id}"
                  onclick="BgManager.setEffect('${id}')">
            ${e.label}
          </button>`).join('')}
      </div>

      <div class="picker-section-label">Partikler</div>
      <div class="particle-grid">
        ${Object.entries(PARTICLES).map(([id, label]) => `
          <button class="particle-btn ${currentParticles === id ? 'active' : ''}"
                  data-pstyle="${id}"
                  onclick="BgManager.setParticleStyle('${id}')">
            ${label}
          </button>`).join('')}
      </div>

      <div class="picker-section-label">UFO-størrelse <span style="opacity:.6;font-weight:400">(forsiden · cosmos)</span></div>
      <div class="effect-grid">
        ${Object.entries(UFO_SIZES).map(([id, label]) => `
          <button class="effect-btn ufo-size-btn ${currentUfoSize === id ? 'active' : ''}"
                  data-ufo-size="${id}"
                  onclick="BgManager.setUfoSize('${id}')">
            ${label}
          </button>`).join('')}
      </div>`;

    document.body.appendChild(panel);

    // Close on outside click
    setTimeout(() => {
      document.addEventListener('click', function close(e) {
        const btn   = document.getElementById('bg-change-btn');
        const panel = document.getElementById('bg-picker-panel');
        if (!panel) { document.removeEventListener('click', close); return; }
        if (!panel.contains(e.target) && e.target !== btn) {
          panel.remove();
          document.removeEventListener('click', close);
        }
      });
    }, 50);
  }

  return { init, uploadImage, openPicker, setEffect, setParticleStyle, setUfoSize };
})();
