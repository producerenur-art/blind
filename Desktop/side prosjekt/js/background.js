// Psychedelic background — image upload, CSS animations, particle canvas
const BgManager = (() => {

  const BG_ID        = 'site_bg_v1';
  const EFFECT_KEY   = 'pv_bg_effect';
  const PARTICLE_KEY = 'pv_bg_particles';
  const SPEED_KEY    = 'pv_bg_speed';
  // Standard-bakgrunner som roterer som en pauseskjerm når ingen egen bakgrunn er
  // lagret. Legg bildene i assets/ (default-bg.jpg, bg1.jpg, bg2.jpg, …). De som
  // finnes brukes; manglende hoppes over. Kryssfader gjennom den mørke bakgrunnen.
  // Legg til flere her når bildene finnes i assets/ (bg3.jpg, bg4.jpg, …) —
  // de som finnes brukes, manglende hoppes over (se _startDefaultSlideshow).
  const DEFAULT_BGS = [
    'assets/default-bg.jpg',
    'assets/bg1.jpg', 'assets/bg2.jpg',
  ];
  // Hastighet på pauseskjermen — styrt av knappen (Sakte / Normal / Rask).
  // slideMs = hvor ofte bildet byttes, floatS = varighet på den flytende
  // zoom/pan-bevegelsen (Google-sovemodus-følelse).
  const SPEEDS = {
    slow:   { label: '🐢 Slow',   emoji: '🐢', slideMs: 24000, floatS: 60 },
    normal: { label: '⏩ Normal', emoji: '⏩', slideMs: 14000, floatS: 30 },
    fast:   { label: '⚡ Fast',   emoji: '⚡', slideMs: 7000,  floatS: 14 },
  };

  const EFFECTS = {
    cosmos:      { label: '🛸 Cosmos',      hue: '40s',  breathe: '40s', sat: 1.4, bright: 0.40 },
    psychedelic: { label: '🌀 Psychedelic', hue: '10s',  breathe: '9s',  sat: 2.2, bright: 0.55 },
    acid:        { label: '⚡ Acid',         hue: '3s',   breathe: '2.5s',sat: 4.0, bright: 0.65 },
    space:       { label: '🚀 Space',        hue: '30s',  breathe: '20s', sat: 1.6, bright: 0.40 },
    chill:       { label: '🌿 Chill',        hue: '25s',  breathe: '16s', sat: 1.8, bright: 0.60 },
  };

  const PARTICLES = {
    stars:   '✨ Stars',
    bubbles: '🫧 Bubbles',
    sparks:  '⚡ Sparks',
    aurora:  '🌌 Aurora',
    none:    '✕ None',
  };

  let currentEffect   = localStorage.getItem(EFFECT_KEY)   || 'cosmos';
  let currentParticles= localStorage.getItem(PARTICLE_KEY) || 'stars';
  let currentSpeed    = SPEEDS[localStorage.getItem(SPEED_KEY)] ? localStorage.getItem(SPEED_KEY) : 'normal';

  let canvas, ctx, frame, particles = [];

  // Stjerneskudd: ett lysende streif på tvers av stjernefeltet hvert 25. sekund.
  const SHOOT_MS = 25000;
  let _shootAt = 0;
  // Klarere, rein-hvite stjerner (forsiden + Verdensrom) vs. fargede ellers.
  let _coolStars = false;

  // ── Init ──────────────────────────────────────────────────────────────
  async function init() {
    // Particle canvas
    canvas = document.getElementById('bg-particles-canvas');
    if (canvas) {
      ctx = canvas.getContext('2d');   // MÅ settast før resize() — resize() legg DPR-transformen berre `if (ctx)`
      resize();
      window.addEventListener('resize', resize);
      startParticles();
    }

    // Apply saved effect
    document.body.dataset.bgEffect = currentEffect;

    // Vis valgt bakgrunnsfart på dock-knappen
    _updateSpeedUI();

    // Pause all CSS background animations while the tab is backgrounded — no point
    // burning GPU/CPU compositing nebula + prism layers nobody is looking at.
    const bgLayer = document.getElementById('bg-layer');
    if (bgLayer) {
      document.addEventListener('visibilitychange', () => {
        bgLayer.style.animationPlayState = document.hidden ? 'paused' : 'running';
      });
    }

    // Forsiden: bilde-lysbildeframvisningen kjører som base, og stjernefeltet +
    // stjerneskudd legges oppå (se startParticles/CSS). Har brukeren lastet
    // opp eget bilde, brukes det i stedet.
    try {
      const url = await DB.getBlobUrl('media', BG_ID);
      if (url) _showImage(url);
      else _startDefaultSlideshow();
    } catch { _startDefaultSlideshow(); }
  }

  // Pauseskjerm: et flytende bilde som ruller gjennom ferske nett-bilder (som
  // Google i sovemodus). AI velger søkeord, og vi veksler psykedelisk ↔ natur.
  let _slideList = [], _slideIdx = 0, _slideTimer = null;

  // ── Daglig bilde-rotasjon ─────────────────────────────────────────────
  // Ønsket: nye bilder fra dag til dag, ikke de samme igjen og igjen. Derfor:
  //  1) DAG-FRØ (_dayIndex) styrer både søkeord og hvilken Openverse-side vi
  //     henter — samme dag = samme sett (stabilt, ingen AI-kall per lasting),
  //     ny dag = garantert nye søkeord og ny side.
  //  2) HISTORIKK (SEEN_KEY) husker URL-ene fra de siste dagene og filtrerer
  //     dem bort, så et bilde ikke dukker opp igjen med en gang.
  //  3) STORE SØKEORD-POOLER som roterer, så variasjonen ikke avhenger av at
  //     AI-kallet lykkes (fallback ga tidligere identiske søkeord hver gang).
  const DAY_MS      = 24 * 60 * 60 * 1000;
  const SLIDE_KEY   = 'pv_bg_slides_v2';   // { day, list } — dagens bildesett
  const SEEN_KEY    = 'pv_bg_seen_v2';     // [url, …] — nylig viste bilder
  const SEEN_MAX    = 300;                 // ~ siste 10 dager à 30 bilder
  const PER_CAT     = 9;                   // bilder per kategori (psy + natur)
  const _dayIndex   = () => Math.floor(Date.now() / DAY_MS);

  // Reserve-søkeord: store pooler som roterer på dag-frøet, så bildene byttes
  // hver dag også når AI-forslagene ikke er tilgjengelige (offline / feil).
  const TERM_POOL = {
    psychedelic: [
      'psychedelic art', 'visionary art painting', 'fractal art deep zoom',
      'sacred geometry mandala', 'trippy mushroom art', 'blacklight fluorescent art',
      'kaleidoscope pattern', 'cosmic nebula painting', 'surreal dreamscape art',
      'liquid light show', 'digital fractal flame', 'psychedelic mandala tapestry',
      'third eye visionary painting', 'iridescent abstract swirl', 'aura light painting',
      'psytrance festival decor', 'holographic prism abstract', 'ayahuasca vision art',
      'op art optical illusion', 'galaxy watercolor abstract',
    ],
    nature: [
      'mountain lake reflection', 'misty forest sunrise', 'northern lights landscape',
      'alpine valley autumn', 'tropical waterfall', 'desert dunes at dusk',
      'starry night milky way landscape', 'glacier ice cave', 'volcano lava night',
      'rice terraces morning fog', 'fjord cliffs norway', 'bioluminescent ocean waves',
      'redwood forest light rays', 'lavender field sunset', 'iceland black sand beach',
      'canyon river aerial', 'cherry blossom mountain', 'thunderstorm over prairie',
      'coral reef underwater', 'rainforest waterfall moss',
    ],
  };

  // Deterministisk 32-bit hash — gir hvert søkeord sin egen side-forskyvning,
  // så to søkeord samme dag ikke henter samme del av Openverse-resultatene.
  function _hash(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 16777619) >>> 0; }
    return h >>> 0;
  }

  // Roter et vindu på n søkeord ut av poolen basert på dagen — dag N og dag N+1
  // får aldri samme sett så lenge poolen er større enn n.
  function _dailyTerms(pool, n = 5) {
    const start = (_dayIndex() * n) % pool.length;
    return Array.from({ length: n }, (_, i) => pool[(start + i) % pool.length]);
  }

  function _seen() {
    try { return JSON.parse(localStorage.getItem(SEEN_KEY)) || []; } catch { return []; }
  }
  function _remember(urls) {
    try {
      const merged = [...urls, ..._seen().filter(u => !urls.includes(u))].slice(0, SEEN_MAX);
      localStorage.setItem(SEEN_KEY, JSON.stringify(merged));
    } catch {}
  }

  // Hent ferske bilder fra nettet via Openverse (gratis, keyless, CORS *).
  // Store bilder (object-fit:cover fyller skjermen — også portrett-kunst).
  // Siden velges av dag + søkeord, så utvalget flyttes seg hver dag. Smale søk
  // har få sider — er den seedede siden tom, faller vi tilbake til side 1 (ellers
  // ville kategorien blitt tom nettopp de dagene frøet peker langt bak).
  // Openverse svarer av og til 15–25 s; uten tidsavbrudd holder ett tregt søk
  // hele settet tilbake (Promise.all venter på det sakteste), og bakgrunnen står
  // svart i mellomtiden. 8 s er nok for et normalt svar.
  const FETCH_MS = 8000;

  async function _openverse(query, page, n, large = true) {
    const ctl = new AbortController();
    const t   = setTimeout(() => ctl.abort(), FETCH_MS);
    try {
      const url = 'https://api.openverse.org/v1/images/?q=' + encodeURIComponent(query)
                + (large ? '&size=large' : '') + '&page_size=20&page=' + page + '&mature=false';
      const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: ctl.signal });
      if (!res.ok) return [];
      const data = await res.json();
      return (data.results || [])
        .map(r => r.url)
        .filter(u => typeof u === 'string' && /^https:\/\//.test(u))
        .slice(0, n);
    } finally { clearTimeout(t); }
  }

  // Fallback-kjede, fordi smale søkefraser (særlig AI-oppfunne som «bioluminescent
  // pattern flow») har få eller ingen treff: dagens seedede side → side 1 → side 1
  // uten size=large-filteret. Uten siste steg ga et smalt søk 0 bilder.
  async function _fetchWebImages(query, n = 6) {
    const page = 1 + ((_dayIndex() + _hash(query)) % 6);
    const tries = page === 1 ? [[1, true], [1, false]]
                             : [[page, true], [1, true], [1, false]];
    for (const [pg, large] of tries) {
      try {
        const got = await _openverse(query, pg, n, large);
        if (got.length) return got;
      } catch { /* tidsavbrudd/nettfeil → prøv neste steg i kjeden */ }
    }
    return [];
  }

  // Alle søkeordene hentes parallelt (én runde nett-kall, ikke én per ord etter
  // hverandre) og flettes i dag-rotert rekkefølge — deterministisk, så dagens
  // sett kan caches. Bilder vi viste de siste dagene hoppes over; blir det for
  // tynt, slippes de inn igjen så bakgrunnen aldri står tom.
  async function _collectImages(terms, n = PER_CAT) {
    const shift  = _dayIndex() % Math.max(terms.length, 1);
    const order  = terms.slice(0, 8).map((_, i, a) => a[(i + shift) % a.length]);
    const hits   = await Promise.all(order.map(t => _fetchWebImages(t, n)));
    const seen   = new Set(_seen());
    const out = [], spare = [];
    // Flett på tvers av søkeordene (første treff fra hvert ord, så andre, …) så
    // ett dominerende søk ikke fyller hele kategorien alene.
    const depth = Math.max(...hits.map(h => h.length), 0);
    for (let i = 0; i < depth; i++) {
      for (const h of hits) {
        const u = h[i];
        if (!u || out.includes(u) || spare.includes(u)) continue;
        if (seen.has(u)) spare.push(u);
        else if (out.length < n) out.push(u);
      }
    }
    for (const u of spare) { if (out.length >= n) break; out.push(u); }
    return out;
  }

  async function _startDefaultSlideshow() {
    // Cosmos-effekten skjuler bakgrunnsbildet (#bg-img-wrap) for å vise romscenen
    // — bytt til en rolig, bilde-vennlig effekt så de flytende bildene faktisk
    // synes (beholder naturlige farger, ingen hue-skift).
    // Vis-overstyring for slideshowet: byt til den bilde-vennlege «chill»-effekten,
    // men IKKJE persister. setEffect() ville skrive 'chill' til localStorage og varig
    // øydelagt default cosmos-scena for brukarar som aldri valde noko sjølv.
    if (currentEffect === 'cosmos') { currentEffect = 'chill'; document.body.dataset.bgEffect = 'chill'; }

    let list = [];

    // Dagens sett er allerede hentet? Gjenbruk det — samme bilder hele dagen
    // (på alle sider/ruter), nytt sett i morgen. Sparer AI- og API-kall.
    try {
      const cached = JSON.parse(localStorage.getItem(SLIDE_KEY));
      if (cached && cached.day === _dayIndex() && Array.isArray(cached.list) && cached.list.length >= 2)
        list = cached.list;
    } catch {}

    if (!list.length) try {
      // AI foreslår dagens søkeord; dag-roterte pooler er reserven (og «avoid»
      // sendes med så AI ikke gjentar gårsdagens forslag).
      const psyPool = _dailyTerms(TERM_POOL.psychedelic, 5);
      const natPool = _dailyTerms(TERM_POOL.nature, 5);
      let q = null;
      try {
        if (typeof AI !== 'undefined' && AI.ambientImageQueries)
          q = await AI.ambientImageQueries({ day: _dayIndex(), avoid: [...psyPool, ...natPool] });
      } catch {}
      // Flett AI-forslag og pool-ord annenhver (ikke AI først) — _collectImages
      // bruker de 8 første, og AI-fraser er ofte så smale at de gir 0 treff. Da
      // ville rene AI-ord spist opp hele kvoten og settet blitt tynt.
      const mix = (a, b) => {
        const out = [];
        for (let i = 0; i < Math.max(a.length, b.length); i++) {
          if (a[i]) out.push(a[i]);
          if (b[i]) out.push(b[i]);
        }
        return out;
      };
      const psyTerms = mix((q && q.psychedelic) || [], psyPool);
      const natTerms = mix((q && q.nature)      || [], natPool);
      const [psy, nat] = await Promise.all([
        _collectImages(psyTerms, PER_CAT),
        _collectImages(natTerms, PER_CAT),
      ]);
      // Flett annenhver — «AI veksler psykedeliske bilder og fine naturbilder».
      const max = Math.max(psy.length, nat.length);
      for (let i = 0; i < max; i++) {
        if (psy[i]) list.push(psy[i]);
        if (nat[i]) list.push(nat[i]);
      }
      if (list.length >= 2) {
        try { localStorage.setItem(SLIDE_KEY, JSON.stringify({ day: _dayIndex(), list })); } catch {}
        _remember(list);
      }
    } catch {}

    // Nett feilet / offline → fall tilbake til de lokale standardbildene.
    if (!list.length) {
      const found = await Promise.all(DEFAULT_BGS.map(src => new Promise(res => {
        const im = new Image();
        im.onload  = () => res(src);
        im.onerror = () => res(null);
        im.src = src;
      })));
      list = found.filter(Boolean);
    }
    if (!list.length) return;        // ingenting å vise → behold prosedyre-bg

    _slideList = list;
    // Start på et tilfeldig sted i dagens sett — ellers ville hver ny lasting/rute
    // åpnet med akkurat samme bilde selv om resten av settet roterer.
    _slideIdx  = Math.floor(Math.random() * _slideList.length);
    _showImage(_slideList[_slideIdx]);
    const base = document.getElementById('bg-img');
    if (base) base.style.transition = 'opacity 1.6s ease-in-out';
    clearInterval(_slideTimer);
    if (_slideList.length < 2) return;     // bare ett bilde → ingen rotasjon
    _slideTimer = setInterval(_nextSlide, SPEEDS[currentSpeed].slideMs);
  }

  // Kryssfade: forhåndslast neste bilde, ton ut til den mørke bakgrunnen, bytt,
  // ton inn igjen. Døde lenker hoppes over (vanlig med ferske nett-bilder).
  function _nextSlide(tries) {
    const base = document.getElementById('bg-img');
    if (!base || _slideList.length < 2 || document.hidden) return;
    tries = tries || 0;
    _slideIdx = (_slideIdx + 1) % _slideList.length;
    const next = _slideList[_slideIdx];
    const pre  = new Image();
    pre.onload = () => {
      base.style.opacity = '0';
      setTimeout(() => { base.src = next; base.style.opacity = ''; }, 1600);
    };
    pre.onerror = () => { if (tries < _slideList.length) _nextSlide(tries + 1); };
    pre.src = next;
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
      if (typeof App !== 'undefined') App.toast('Background updated ✓', 'success');
    } catch (e) {
      if (typeof App !== 'undefined') App.toast('Upload error', 'error');
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
    // Behold valgt flyt-fart (overstyrer effektens CSS-varighet)
    img.style.animationDuration = SPEEDS[currentSpeed].floatS + 's';
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

  // ── Pauseskjerm-fart (Sakte / Normal / Rask) ──────────────────────────
  function _applySpeed() {
    // Flyt-farten på selve bildet (overstyrer effektens CSS-varighet)
    const im = document.getElementById('bg-img');
    if (im) im.style.animationDuration = SPEEDS[currentSpeed].floatS + 's';
    // Rotasjonstakten — start timeren på nytt med ny intervall
    if (_slideTimer) {
      clearInterval(_slideTimer);
      _slideTimer = _slideList.length >= 2
        ? setInterval(_nextSlide, SPEEDS[currentSpeed].slideMs) : null;
    }
    _updateSpeedUI();
  }

  function setSpeed(id) {
    if (!SPEEDS[id]) return;
    currentSpeed = id;
    localStorage.setItem(SPEED_KEY, id);
    _applySpeed();
  }

  // Knappen i dokken: bla gjennom Sakte → Normal → Rask → Sakte …
  function cycleSpeed() {
    const order = ['slow', 'normal', 'fast'];
    setSpeed(order[(order.indexOf(currentSpeed) + 1) % order.length]);
    if (typeof App !== 'undefined')
      App.toast('Background speed: ' + SPEEDS[currentSpeed].label, 'success', 1600);
  }

  function _updateSpeedUI() {
    const btn = document.getElementById('bg-speed-btn');
    if (btn) {
      btn.textContent = SPEEDS[currentSpeed].emoji;
      btn.title = 'Background speed: ' + SPEEDS[currentSpeed].label + ' — tap to change';
    }
    document.querySelectorAll('#bg-picker-panel [data-speed]').forEach(b => {
      b.classList.toggle('active', b.dataset.speed === currentSpeed);
    });
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

      // Klarere stjerner (rein hvit) på forsiden og i Verdensrom-effekten.
      _coolStars = currentEffect === 'cosmos' || document.body.classList.contains('route-home');

      // Bakgrunnstegning: i Verdensrom (mørkt dyp-rom) beholder vi det myke
      // svarte sløret for stjernehaler. Ellers TØMMER vi lerretet hver frame slik
      // at lysbildeframvisningen bak synes tydelig — stjernene ligger da skarpt oppå.
      if (currentEffect === 'cosmos') {
        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        ctx.fillRect(0, 0, W, H);
      } else {
        ctx.clearRect(0, 0, W, H);
      }

      // Spawn (counts trimmed — shadowBlur removal lets these stay lively cheaply)
      const maxP = currentParticles === 'sparks' ? 120 : currentParticles === 'aurora' ? 18 : currentParticles === 'stars' ? 95 : 70;
      const spawnRate = currentParticles === 'aurora' ? 0.12 : 0.4;
      if (particles.length < maxP && Math.random() < spawnRate) spawn(now);

      // Stjerneskudd hvert 25. sekund på forsiden / i Verdensrom-scenen.
      if (currentParticles !== 'none' && _coolStars) {
        if (!_shootAt) _shootAt = now + SHOOT_MS;          // første streif etter 25 s
        else if (now >= _shootAt) { spawnShooting(now); _shootAt = now + SHOOT_MS; }
      }

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
        r: 1.1 + Math.random() * 2.7,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -0.15 - Math.random() * 0.4,
        hue, life: 1, decay: 0.003 + Math.random() * 0.004,
        tw: Math.random() * Math.PI * 2,   // twinkle phase (cosmos)
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

  // Ett stjerneskudd: starter oppe (venstre eller høyre) og streifer raskt
  // diagonalt nedover med en lysende hale før det tones ut.
  function spawnShooting(t) {
    const W = vw(), H = vh();
    const fromLeft = Math.random() < 0.5;
    const speed = 7 + Math.random() * 4;
    const ang   = (0.18 + Math.random() * 0.34) * Math.PI;   // ~32–94° nedover
    const dirX  = fromLeft ? 1 : -1;
    particles.push({
      x:  fromLeft ? W * (0.02 + Math.random() * 0.2) : W * (0.78 + Math.random() * 0.2),
      y:  H * (0.04 + Math.random() * 0.28),
      vx: Math.cos(ang) * speed * dirX,
      vy: Math.sin(ang) * speed,
      r:  2, life: 1, decay: 0.015 + Math.random() * 0.006,
      type: 'shooting',
    });
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
    // Cool-white stars twinkle — gently modulate brightness per-star; other modes steady.
    // Høyere grunnlysstyrke (klarere stjerner) med et mildere blink over.
    const alpha = (p.type === 'star' && _coolStars)
      ? p.life * (0.74 + 0.30 * Math.sin((p.tw || 0) + now * 0.004))
      : p.life;

    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    // NOTE: ctx.shadowBlur is intentionally avoided — it gaussian-blurs every
    // particle every frame and was the single biggest canvas cost. Glow is faked
    // with a cheap larger low-alpha disc instead.
    if (p.type === 'star') {
      // Front page + cosmos want real starlight (cool white), not the rotating-hue glow.
      // Sterkere halo + rein hvit kjerne → klarere, tydeligere stjerner.
      const haloC = _coolStars ? `hsla(210,45%,92%,${alpha * 0.30})` : `hsla(${hue},90%,75%,${alpha * 0.18})`;
      const coreC = _coolStars ? `hsla(205,30%,99%,${alpha})` : `hsla(${hue},90%,82%,${alpha * 0.9})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 2.7, 0, Math.PI * 2);
      ctx.fillStyle = haloC;  // soft halo
      ctx.fill();
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = coreC;   // bright core
      ctx.fill();
    } else if (p.type === 'shooting') {
      // Lysende streif med hale bakover langs bevegelsesretningen.
      const tx = p.x - p.vx * 5, ty = p.y - p.vy * 5;
      const grad = ctx.createLinearGradient(p.x, p.y, tx, ty);
      grad.addColorStop(0,    `hsla(205,55%,99%,${p.life})`);
      grad.addColorStop(0.35, `hsla(205,80%,86%,${p.life * 0.45})`);
      grad.addColorStop(1,    `hsla(205,80%,86%,0)`);
      ctx.strokeStyle = grad;
      ctx.lineWidth   = 2.4;
      ctx.lineCap     = 'round';
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(tx, ty);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.3, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(205,40%,99%,${p.life})`;
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
      <div class="picker-section-label">Your background image</div>
      <button class="picker-upload-btn" onclick="document.getElementById('bg-file-input').click()">
        ${Icon('camera')} Upload / change image
      </button>
      <div class="picker-bg-actions">
        <button id="bg-post-btn" class="picker-action-btn picker-action-post" onclick="BgManager.postBackground()">
          ${Icon('send')} Post the background
        </button>
        <button class="picker-action-btn" onclick="BgManager.openCommunity()">
          ${Icon('users')} Community
        </button>
        <button class="picker-action-btn picker-action-reset" onclick="BgManager.resetBackground()">
          ${Icon('rotate-cw')} Reset image
        </button>
      </div>

      <div class="picker-section-label">Background speed <span style="opacity:.6;font-weight:400">(screensaver)</span></div>
      <div class="effect-grid">
        ${Object.entries(SPEEDS).map(([id, s]) => `
          <button class="effect-btn ${currentSpeed === id ? 'active' : ''}"
                  data-speed="${id}"
                  onclick="BgManager.setSpeed('${id}')">
            ${s.label}
          </button>`).join('')}
      </div>

      <div class="picker-section-label">Psychedelic effect</div>
      <div class="effect-grid">
        ${Object.entries(EFFECTS).map(([id, e]) => `
          <button class="effect-btn ${currentEffect === id ? 'active' : ''}"
                  data-effect="${id}"
                  onclick="BgManager.setEffect('${id}')">
            ${e.label}
          </button>`).join('')}
      </div>

      <div class="picker-section-label">Particles</div>
      <div class="particle-grid">
        ${Object.entries(PARTICLES).map(([id, label]) => `
          <button class="particle-btn ${currentParticles === id ? 'active' : ''}"
                  data-pstyle="${id}"
                  onclick="BgManager.setParticleStyle('${id}')">
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

  // ── Del bakgrunnen i fellesskapet ─────────────────────────────────────
  // Tegn det gjeldende bakgrunnsbildet ned til en delbar data-URL (blob- og
  // standard-bilder er same-origin, så canvas blir ikke «tainted»).
  function _bgDataUrl(maxDim = 1920, quality = 0.88) {
    return new Promise((resolve, reject) => {
      const base = document.getElementById('bg-img');
      const src  = base && base.getAttribute('src');
      if (!src) { resolve(null); return; }
      const im = new Image();
      im.crossOrigin = 'anonymous';
      im.onload = () => {
        let w = im.naturalWidth, h = im.naturalHeight;
        if (!w || !h) { resolve(null); return; }
        if (w > maxDim || h > maxDim) {
          const s = maxDim / Math.max(w, h);
          w = Math.round(w * s); h = Math.round(h * s);
        }
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(im, 0, 0, w, h);
        try { resolve(c.toDataURL('image/jpeg', quality)); }
        catch (e) { reject(e); }
      };
      im.onerror = () => reject(new Error('Could not read the background image'));
      im.src = src;
    });
  }

  // Post bakgrunnen din som et bilde-innlegg i fellesskaps-veggen (offentlig —
  // alle innloggede kan se og kommentere), og ta brukeren med dit etterpå.
  async function postBackground() {
    const me = (typeof Auth !== 'undefined') && Auth.current();
    if (!me) { if (typeof Router !== 'undefined') Router.go('/login'); return; }
    if (typeof Community === 'undefined' || !Community.shareMedia) {
      if (typeof App !== 'undefined') App.toast('The community is not ready yet', 'error');
      return;
    }
    const btn = document.getElementById('bg-post-btn');
    if (btn) { btn.dataset.html = btn.innerHTML; btn.textContent = '⏳ Sharing…'; btn.style.pointerEvents = 'none'; }
    try {
      const url = await _bgDataUrl();
      if (!url) throw new Error('No background found to share');
      Community.shareMedia({ kind: 'image', url, name: 'My background',
                             caption: '🌌 My background', audience: 'public' });
      if (typeof App !== 'undefined') App.toast('📷 Your background has been shared to the community!', 'success');
      const panel = document.getElementById('bg-picker-panel'); if (panel) panel.remove();
      if (typeof Router !== 'undefined') Router.go('/community');
    } catch (e) {
      if (typeof App !== 'undefined') App.toast('Could not share: ' + e.message, 'error');
    } finally {
      if (btn) { if (btn.dataset.html) btn.innerHTML = btn.dataset.html; btn.style.pointerEvents = ''; }
    }
  }

  // Lukk velgeren og gå til fellesskaps-veggen.
  function openCommunity() {
    const panel = document.getElementById('bg-picker-panel'); if (panel) panel.remove();
    if (typeof Router !== 'undefined') Router.go('/community');
  }

  // Fjern det opplastede bildet og gå tilbake til standard-bakgrunnen.
  async function resetBackground() {
    try { await DB.delete('media', BG_ID); } catch {}
    // Tøm dagens cache så brukeren får et helt nytt bildesett med en gang
    // (i stedet for det settet som alt er vist i dag).
    try { localStorage.removeItem(SLIDE_KEY); } catch {}
    clearInterval(_slideTimer);
    _startDefaultSlideshow();
    if (typeof App !== 'undefined') App.toast('Background reset', 'success', 2000);
  }

  return { init, uploadImage, openPicker, setEffect, setParticleStyle,
           setSpeed, cycleSpeed, postBackground, openCommunity, resetBackground };
})();
