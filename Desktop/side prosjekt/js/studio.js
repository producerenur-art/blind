// Blend Studio — Canvas-based image+video layer compositor
const Studio = (() => {
  let canvas, ctx, layers = [], activeLayerIdx = -1;
  let animFrame = null, recording = false, mediaRec = null, recChunks = [];
  let drag = null; // { idx, startX, startY, layerX, layerY } mens man drar et lag på lerretet
  let replaceTarget = -1; // laget som skal få mediet sitt erstattet av neste filvalg

  const BLEND_MODES = [
    'source-over','multiply','screen','overlay',
    'soft-light','hard-light','color-dodge','color-burn',
    'difference','exclusion','lighten','darken',
  ];

  const BLEND_LABELS = {
    'source-over':'Normal','multiply':'Multiply','screen':'Screen','overlay':'Overlay',
    'soft-light':'Soft light','hard-light':'Hard light','color-dodge':'Dodge','color-burn':'Burn',
    'difference':'Difference','exclusion':'Exclusion','lighten':'Lighten','darken':'Darken',
  };

  // ── Tekst-lag: skrifttyper («alle typer bokstaver») ─────────────────────
  // System-fonter + et utvalg display-fonter fra Google Fonts (lastes på etterspørsel).
  const FONTS = [
    'Inter','Space Grotesk','Playfair Display','Rajdhani','Nunito',
    'Arial','Helvetica','Georgia','Times New Roman','Courier New','Verdana',
    'Trebuchet MS','Impact','Comic Sans MS','Palatino',
    'Anton','Bebas Neue','Oswald','Montserrat','Archivo Black','Righteous',
    'Poppins','Raleway','Roboto Condensed','Teko','Barlow Condensed','Kanit',
    'Josefin Sans','Cinzel','Playfair Display SC','Bodoni Moda','DM Serif Display',
    'Pacifico','Lobster','Caveat','Dancing Script','Shadows Into Light',
    'Great Vibes','Satisfy','Sacramento','Kaushan Script','Yellowtail',
    'Permanent Marker','Bangers','Press Start 2P','Orbitron','Monoton',
    'Audiowide','Russo One','Abril Fatface','Fredoka','Lilita One',
    'Bungee','Black Ops One','Faster One','Rubik Mono One','Staatliches',
    'Alfa Slab One','Titan One','Fjalla One','Passion One','Special Elite',
    'serif','sans-serif','monospace','cursive','fantasy',
  ];
  // Display-fonter som må hentes fra Google Fonts (system-fonter står ikke her).
  const GOOGLE_FONTS = [
    'Inter','Space Grotesk','Playfair Display','Rajdhani','Nunito',
    'Anton','Bebas Neue','Oswald','Montserrat','Archivo Black','Righteous',
    'Poppins','Raleway','Roboto Condensed','Teko','Barlow Condensed','Kanit',
    'Josefin Sans','Cinzel','Playfair Display SC','Bodoni Moda','DM Serif Display',
    'Pacifico','Lobster','Caveat','Dancing Script','Shadows Into Light',
    'Great Vibes','Satisfy','Sacramento','Kaushan Script','Yellowtail',
    'Permanent Marker','Bangers','Press Start 2P','Orbitron','Monoton',
    'Audiowide','Russo One','Abril Fatface','Fredoka','Lilita One',
    'Bungee','Black Ops One','Faster One','Rubik Mono One','Staatliches',
    'Alfa Slab One','Titan One','Fjalla One','Passion One','Special Elite',
  ];
  const GENERIC_FONTS = ['serif','sans-serif','monospace','cursive','fantasy'];

  // Fulle skrift-vekter (der fonten støtter det) — variabel- og statiske akser.
  const WEIGHTS = [
    ['100','Extra thin'],['200','Thin'],['300','Light'],['400','Normal'],
    ['500','Medium'],['600','Semibold'],['700','Bold'],['800','Extra bold'],['900','Black'],
  ];
  const ALIGNS  = [['left','⤶ Left'],['center','☰ Center'],['right','Right ⤷']];
  const CASES   = [['none','Aa Normal'],['upper','AA UPPER'],['lower','aa lower']];

  // Bevegelser teksten kan animeres inn med — kant/skala + moderne presets.
  const ANIMS = [
    { id:'none',      label:'None' },
    { id:'fade',      label:'✦ Fade in' },
    { id:'left',      label:'← Left' },
    { id:'right',     label:'→ Right' },
    { id:'up',        label:'↑ Up' },
    { id:'down',      label:'↓ Down' },
    { id:'zoom-in',   label:'⊕ Small→large' },
    { id:'zoom-out',  label:'⊖ Large→small' },
    { id:'pulse',     label:'❤ Pulse' },
    { id:'bounce',    label:'⤒ Bounce' },
    { id:'shake',     label:'≈ Shake' },
    { id:'typewriter',label:'⌨ Typewriter' },
    { id:'wave',      label:'∿ Wave' },
    { id:'glow',      label:'☀ Glow' },
    { id:'spin',      label:'⟳ Spin' },
    { id:'flip',      label:'⇋ Flip' },
  ];

  function esc(s) { return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function cssFont(f) { return GENERIC_FONTS.includes(f) ? f : `"${f}"`; }
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
  function easeOutBounce(t) {
    const n1 = 7.5625, d1 = 2.75;
    if (t < 1 / d1)      return n1 * t * t;
    if (t < 2 / d1)      return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1)    return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  }
  // STORE / små / normal — brukes både i tegning og i AI-stil.
  function applyCase(s, tc) { return tc === 'upper' ? s.toUpperCase() : tc === 'lower' ? s.toLowerCase() : s; }

  // Last Google Fonts-stilarket én gang så display-fontene faktisk tegnes på lerretet.
  function ensureFonts() {
    if (document.getElementById('studio-gfonts')) return;
    const fam = GOOGLE_FONTS.map(f => 'family=' + encodeURIComponent(f).replace(/%20/g, '+') + ':wght@100;200;300;400;500;600;700;800;900').join('&');
    const link = document.createElement('link');
    link.id   = 'studio-gfonts';
    link.rel  = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?${fam}&display=swap`;
    document.head.appendChild(link);
  }

  async function render() {
    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="studio-page">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem">
          <div>
            <h1 style="font-size:1.5rem;font-weight:800">${Icon('palette')} Blend Studio</h1>
            <p class="text-muted text-sm">Combine images and videos with blend modes</p>
          </div>
          <div style="display:flex;gap:0.5rem">
            <button class="btn btn-ghost btn-sm" onclick="Router.go('/edit')">${Icon('arrow-left')} Back</button>
          </div>
        </div>

        <div class="studio-layout">
          <!-- Canvas area -->
          <div>
            <div class="studio-canvas-wrap">
              <div class="studio-canvas-header">
                <button class="btn btn-ghost btn-sm" onclick="Studio.addImageLayer()">${Icon('image')} Add image</button>
                <button class="btn btn-ghost btn-sm" onclick="Studio.addVideoLayer()">${Icon('film')} Add video</button>
                <button class="btn btn-ghost btn-sm" onclick="Studio.addTextLayer()">${Icon('type')} Add text</button>
                <button class="btn btn-primary btn-sm" onclick="Studio.shareBlend()">${Icon('share')} Share</button>
                <button class="btn btn-ghost btn-sm" onclick="Studio.clearCanvas()">${Icon('trash')} Clear</button>
                <input type="file" id="studio-img-input" accept="image/*" style="display:none" multiple onchange="Studio.handleImageFiles(this.files)">
                <input type="file" id="studio-vid-input" accept="video/*" style="display:none" onchange="Studio.handleVideoFile(this.files[0])">
                <input type="file" id="studio-img-replace" accept="image/*" style="display:none" onchange="Studio.handleReplaceImage(this.files[0])">
                <input type="file" id="studio-vid-replace" accept="video/*" style="display:none" onchange="Studio.handleReplaceVideo(this.files[0])">
              </div>
              <div class="studio-canvas-body">
                <canvas id="blend-canvas" width="800" height="500"></canvas>
                <div class="studio-layers" id="studio-layers">
                  <div class="text-muted text-sm" style="padding:0.5rem">No layers yet — add images or video above.</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Right panel -->
          <div class="studio-panel">
            <!-- Layer controls -->
            <div class="editor-panel-header">${Icon('settings')} Active layer settings</div>
            <div class="editor-panel-body" id="layer-controls-panel">
              <p class="text-muted text-sm">Choose a layer to edit.</p>
            </div>

            <div class="divider" style="margin:0"></div>

            <!-- Blend modes -->
            <div class="editor-panel-header">${Icon('film')} Blend mode</div>
            <div class="editor-panel-body">
              <div class="blend-modes-grid" id="blend-grid">
                ${BLEND_MODES.map(m => `<button class="blend-mode-btn ${m==='source-over'?'active':''}" onclick="Studio.setBlendMode('${m}',this)">${BLEND_LABELS[m]}</button>`).join('')}
              </div>
            </div>

            <div class="divider" style="margin:0"></div>

            <!-- Canvas size -->
            <div class="editor-panel-header">${Icon('edit')} Canvas size</div>
            <div class="editor-panel-body">
              <div style="display:flex;gap:0.5rem;margin-bottom:0.75rem">
                <div class="form-group" style="margin:0;flex:1">
                  <label class="form-label">Width</label>
                  <input class="form-input" type="number" id="canvas-w" value="800" min="100" max="4000">
                </div>
                <div class="form-group" style="margin:0;flex:1">
                  <label class="form-label">Height</label>
                  <input class="form-input" type="number" id="canvas-h" value="500" min="100" max="4000">
                </div>
              </div>
              <div style="display:flex;gap:0.4rem;flex-wrap:wrap;margin-bottom:0.75rem">
                ${[['16:9','1280','720'],['1:1','720','720'],['4:3','800','600'],['9:16','720','1280']].map(([r,w,h]) => `<button class="badge badge-purple" style="cursor:pointer" onclick="Studio.setSize(${w},${h})">${r}</button>`).join('')}
              </div>
              <button class="btn btn-ghost btn-sm w-full" onclick="Studio.applySize()">Apply size</button>
            </div>

            <div class="divider" style="margin:0"></div>

            <!-- Export -->
            <div class="editor-panel-header">${Icon('save')} Export</div>
            <div class="editor-panel-body">
              <div class="export-options">
                <button class="export-btn btn btn-primary" onclick="Studio.exportImage()">${Icon('camera')} Export as PNG</button>
                <button class="export-btn btn btn-ghost" onclick="Studio.exportJPEG()">${Icon('image')} Export as JPEG</button>
                <button class="export-btn btn btn-ghost" id="record-btn" onclick="Studio.toggleRecording()">${Icon('circle')} Record video</button>
              </div>
              <div id="rec-status" class="text-muted text-sm mt-1" style="display:none"></div>
              <div style="margin-top:0.75rem">
                <label class="form-label">Save to profile</label>
                <button class="btn btn-ghost btn-sm w-full mt-1" onclick="Studio.saveToProfile()">${Icon('save')} Save blend to profile</button>
                <button class="btn btn-primary btn-sm w-full mt-1" onclick="Studio.shareToCommunity()">${Icon('users')} Share blend to Community</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    canvas = document.getElementById('blend-canvas');
    ctx    = canvas.getContext('2d');
    ensureFonts();
    attachCanvasDrag();
    startRenderLoop();
  }

  // ── Layer management ──────────────────────────────────────────────────
  function createBaseLayer() {
    return {
      id:        Math.random().toString(36).slice(2),
      label:     'Layer',
      type:      'image', // 'image' | 'video'
      element:   null,
      x: 0, y: 0,
      width: canvas.width, height: canvas.height,
      opacity:   1.0,
      blendMode: 'source-over',
      visible:   true,
      filters:   { brightness:100, contrast:100, saturation:100, hue:0 },
    };
  }

  function addImageLayer() {
    document.getElementById('studio-img-input').click();
  }

  function addVideoLayer() {
    document.getElementById('studio-vid-input').click();
  }

  function handleImageFiles(files) {
    Array.from(files).forEach(file => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const layer = createBaseLayer();
        layer.label   = file.name.replace(/\.[^.]+$/, '');
        layer.type    = 'image';
        layer.element = img;
        layer.width   = img.naturalWidth  || canvas.width;
        layer.height  = img.naturalHeight || canvas.height;
        layers.push(layer);
        setActiveLayer(layers.length - 1);
        renderLayerList();
      };
      img.src = url;
    });
  }

  function handleVideoFile(file) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const vid = document.createElement('video');
    vid.src    = url;
    vid.loop   = true;
    vid.muted  = true;
    vid.preload= 'auto';
    vid.play().catch(() => {});
    vid.onloadedmetadata = () => {
      const layer = createBaseLayer();
      layer.label   = file.name.replace(/\.[^.]+$/, '');
      layer.type    = 'video';
      layer.element = vid;
      layer.width   = vid.videoWidth  || canvas.width;
      layer.height  = vid.videoHeight || canvas.height;
      layers.push(layer);
      setActiveLayer(layers.length - 1);
      renderLayerList();
    };
  }

  // ── Tekst-lag ───────────────────────────────────────────────────────────
  function addTextLayer() {
    if (!canvas) return;
    const layer = createBaseLayer();
    layer.type       = 'text';
    layer.label      = 'Text';
    layer.text       = 'Your text';
    layer.color      = '#ffffff';
    layer.fontFamily = 'Anton';
    layer.fontSize   = Math.round(canvas.height / 6);
    layer.fontWeight = 700;
    layer.strokeColor= '#000000';
    layer.strokeWidth= 0;
    layer.align      = 'center';          // venstre / senter / høyre for fler-linjers tekst
    layer.lineHeight = 1.15;              // linjeavstand (multiplum av skriftstørrelsen)
    layer.letterSpacing = 0;              // sperring i px
    layer.rotation   = 0;                 // rotasjon i grader
    layer.textCase   = 'none';            // none | upper | lower
    layer.shadowColor= '#000000';         // glød / skygge
    layer.shadowBlur = 0;
    layer.shadowOffX = 0;
    layer.shadowOffY = 0;
    layer.bgOn       = false;             // fargeboks bak teksten (lesbarhet)
    layer.bgColor    = '#000000';
    layer.bgOpacity  = 0.55;
    layer.bgRadius   = 14;
    layer.bgPadX     = 26;
    layer.bgPadY     = 14;
    layer.anim       = 'zoom-in';
    layer.animSpeed  = 3;
    layer.x          = canvas.width  / 2; // for tekst er x,y senter-ankeret
    layer.y          = canvas.height / 2;
    layers.push(layer);
    setActiveLayer(layers.length - 1);
    renderLayerList();
    if (layer.fontFamily) try { document.fonts.load(`${layer.fontWeight}px ${cssFont(layer.fontFamily)}`); } catch {}
  }

  function setTextProp(prop, val) {
    const l = layers[activeLayerIdx];
    if (!l) return;
    l[prop] = val;
    if (prop === 'fontFamily' || prop === 'fontWeight' || prop === 'text' || prop === 'color') {
      try { document.fonts.load(`${l.fontWeight}px ${cssFont(l.fontFamily)}`); } catch {}
      const pv = document.getElementById('tx-font-preview');
      if (pv) {
        pv.style.fontFamily = cssFont(l.fontFamily);
        pv.style.fontWeight = l.fontWeight;
        pv.style.color = l.color || '';
        const line = (l.text || '').split('\n')[0].slice(0, 22);
        pv.textContent = line || 'AaBbCc 123';
      }
    }
    renderLayerList();
  }

  function setTextAnim(anim, btn) {
    const l = layers[activeLayerIdx];
    if (!l) return;
    l.anim = anim;
    if (btn) { btn.parentNode.querySelectorAll('.blend-mode-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); }
    renderLayerList();
  }

  // Venstre / senter / høyre for fler-linjers tekst (endrer ikke ankeret).
  function setTextAlign(a, btn) {
    const l = layers[activeLayerIdx];
    if (!l) return;
    l.align = a;
    if (btn) { btn.parentNode.querySelectorAll('.blend-mode-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); }
  }

  // STORE / små / normal bokstaver.
  function setTextCase(c, btn) {
    const l = layers[activeLayerIdx];
    if (!l) return;
    l.textCase = c;
    if (btn) { btn.parentNode.querySelectorAll('.blend-mode-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); }
  }

  // Slå fargeboksen bak teksten av/på og vis/skjul under-kontrollene.
  function toggleTextBg(btn) {
    const l = layers[activeLayerIdx];
    if (!l) return;
    l.bgOn = !l.bgOn;
    if (btn) { btn.classList.toggle('active', l.bgOn); btn.textContent = l.bgOn ? '● Background on' : '○ Background off'; }
    const box = document.getElementById('tx-bg-controls');
    if (box) box.style.display = l.bgOn ? '' : 'none';
  }

  // Snap teksten til ett av 9 ankerpunkt på lerretet (hjørner/kanter/senter).
  function snapTextPos(fx, fy, btn) {
    const l = layers[activeLayerIdx];
    if (!l || !canvas) return;
    l.x = Math.round(canvas.width  * fx);
    l.y = Math.round(canvas.height * fy);
    const xi = document.getElementById('tx-x'), yi = document.getElementById('tx-y');
    if (xi) xi.value = Math.round(l.x);
    if (yi) yi.value = Math.round(l.y);
    if (btn) { btn.parentNode.querySelectorAll('.blend-mode-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); }
  }

  // AI: foreslå en farge ut fra en stemning (gjenbruker AI.suggestColors).
  async function aiTextColor() {
    const l = layers[activeLayerIdx];
    if (!l || typeof AI === 'undefined') return;
    const mood = prompt('Describe the mood for the color (e.g. "neon night", "warm sunset"):', l.text || '');
    if (!mood) return;
    App.toast('AI is choosing a color…', 'info', 1500);
    try {
      const pal = await AI.suggestColors(mood);
      if (pal && pal.accent) { l.color = pal.accent; renderLayerControls(); App.toast('Color set ✓', 'success'); }
      else App.toast('No color found', 'error');
    } catch { App.toast('AI color failed', 'error'); }
  }

  // AI: velg skrift + farge + bevegelse ut fra en fri beskrivelse.
  async function aiTextStyle() {
    const l = layers[activeLayerIdx];
    if (!l || typeof AI === 'undefined' || !AI.suggestTextStyle) { App.toast('AI not available', 'error'); return; }
    const promptEl = document.getElementById('tx-ai-prompt');
    const desc = (promptEl && promptEl.value.trim()) || l.text || '';
    if (!desc) { App.toast('Write a description first', 'error'); return; }
    App.toast('AI is creating a style…', 'info', 1800);
    try {
      const s = await AI.suggestTextStyle(desc, FONTS);
      if (!s) { App.toast('No style found', 'error'); return; }
      if (s.fontFamily && FONTS.includes(s.fontFamily)) { l.fontFamily = s.fontFamily; try { document.fonts.load(`${l.fontWeight}px ${cssFont(s.fontFamily)}`); } catch {} }
      if (s.color && /^#[0-9a-f]{3,8}$/i.test(s.color)) l.color = s.color;
      if (s.weight && [400,700,900].includes(+s.weight)) l.fontWeight = +s.weight;
      if (s.anim && ANIMS.some(a => a.id === s.anim)) l.anim = s.anim;
      renderLayerControls();
      renderLayerList();
      App.toast('AI style applied ✓', 'success');
    } catch (e) { console.warn('[Studio] aiTextStyle', e); App.toast('AI style failed', 'error'); }
  }

  function setActiveLayer(idx) {
    activeLayerIdx = idx;
    renderLayerList();
    renderLayerControls();
    // Sync blend mode buttons
    const layer = layers[idx];
    if (layer) {
      document.querySelectorAll('.blend-mode-btn').forEach(b => b.classList.toggle('active', b.textContent === BLEND_LABELS[layer.blendMode]));
    }
  }

  function renderLayerList() {
    const list = document.getElementById('studio-layers');
    if (!list) return;
    if (!layers.length) {
      list.innerHTML = '<div class="text-muted text-sm" style="padding:0.5rem">No layers yet.</div>';
      return;
    }
    list.innerHTML = [...layers].reverse().map((l, ri) => {
      const idx = layers.length - 1 - ri;
      const thumbHtml = l.type === 'text'
        ? `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:1.1rem;color:${l.color};font-family:${cssFont(l.fontFamily)};background:#111;overflow:hidden">${esc((l.text || 'T').slice(0, 3))}</div>`
        : (l.element
            ? (l.type === 'video' ? `<video src="${l.element.src}" style="width:100%;height:100%;object-fit:cover"></video>` : `<img src="${l.element.src}" style="width:100%;height:100%;object-fit:cover">`)
            : '');
      return `
        <div class="layer-item ${idx === activeLayerIdx ? 'active' : ''}" onclick="Studio.setActiveLayer(${idx})">
          <div class="layer-thumb">${thumbHtml}</div>
          <div style="flex:1;min-width:0">
            <div class="layer-label">${l.label}</div>
            <div class="layer-type">${l.type === 'text' ? '🔤' : (l.type === 'video' ? '🎬' : '🖼️')} ${BLEND_LABELS[l.blendMode]}</div>
          </div>
          <div class="layer-controls">
            <button class="btn-icon" title="Edit / replace" onclick="Studio.editLayer(${idx},event)">${Icon('edit')}</button>
            <button class="btn-icon" title="${l.visible ? 'Hide' : 'Show'}" onclick="Studio.toggleLayerVisibility(${idx},event)">${l.visible ? '👁' : '🚫'}</button>
            <button class="btn-icon" title="Move up" onclick="Studio.moveLayer(${idx},-1,event)">${Icon('arrow-up')}</button>
            <button class="btn-icon" title="Move down" onclick="Studio.moveLayer(${idx},1,event)">${Icon('arrow-down')}</button>
            <button class="btn-icon" title="Delete" onclick="Studio.deleteLayer(${idx},event)">${Icon('trash')}</button>
          </div>
        </div>`;
    }).join('');
  }

  function renderLayerControls() {
    const panel = document.getElementById('layer-controls-panel');
    if (!panel) return;
    const layer = layers[activeLayerIdx];
    if (!layer) { panel.innerHTML = '<p class="text-muted text-sm">Choose a layer.</p>'; return; }

    if (layer.type === 'text') { panel.innerHTML = renderTextControls(layer); return; }

    panel.innerHTML = `
      <button class="btn btn-ghost btn-sm w-full" style="margin-bottom:0.75rem" onclick="Studio.replaceActiveLayer()">${Icon('repeat')} Replace ${layer.type === 'video' ? 'video' : 'image'}</button>
      <div class="form-group" style="margin-bottom:0.75rem">
        <label class="form-label">Name</label>
        <input class="form-input" value="${layer.label}" oninput="Studio.updateLayerLabel(this.value)">
      </div>
      <div class="filter-item" style="margin-bottom:0.75rem">
        <div class="filter-label"><span>Opacity</span><span id="op-val">${Math.round(layer.opacity*100)}%</span></div>
        <input type="range" min="0" max="100" value="${Math.round(layer.opacity*100)}" oninput="Studio.setLayerOpacity(this.value/100);document.getElementById('op-val').textContent=this.value+'%'">
      </div>
      <div class="editor-section-title" style="margin-bottom:0.5rem">Position & size</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.4rem;margin-bottom:0.75rem">
        <div><label class="form-label">X</label><input class="form-input" type="number" value="${Math.round(layer.x)}" oninput="Studio.setLayerProp('x',+this.value)"></div>
        <div><label class="form-label">Y</label><input class="form-input" type="number" value="${Math.round(layer.y)}" oninput="Studio.setLayerProp('y',+this.value)"></div>
        <div><label class="form-label">Width</label><input class="form-input" type="number" value="${Math.round(layer.width)}" oninput="Studio.setLayerProp('width',+this.value)"></div>
        <div><label class="form-label">Height</label><input class="form-input" type="number" value="${Math.round(layer.height)}" oninput="Studio.setLayerProp('height',+this.value)"></div>
      </div>
      <div class="editor-section-title" style="margin-bottom:0.5rem">Image adjustments</div>
      ${filterSlider2('Brightness','lf-brightness',layer.filters.brightness,0,200)}
      ${filterSlider2('Contrast','lf-contrast',layer.filters.contrast,0,200)}
      ${filterSlider2('Saturation','lf-saturation',layer.filters.saturation,0,200)}
      ${filterSlider2('Hue','lf-hue',layer.filters.hue,0,360)}
    `;
  }

  // Kompakt slider med live tallvisning (for tekst-panelet).
  function txSlider(label, id, val, min, max, step, unit, prop, extra) {
    const u = unit || '';
    const setter = extra || `Studio.setTextProp('${prop}',+this.value)`;
    return `
      <div class="filter-item" style="margin-bottom:0.55rem">
        <div class="filter-label"><span>${label}</span><span id="${id}-v">${val}${u}</span></div>
        <input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${val}"
          oninput="document.getElementById('${id}-v').textContent=this.value+'${u}';${setter}">
      </div>`;
  }

  function renderTextControls(layer) {
    const spd = layer.animSpeed;
    const op  = Math.round(layer.opacity * 100);
    return `
      <div class="form-group" style="margin-bottom:0.6rem">
        <label class="form-label">Text</label>
        <textarea class="form-input" rows="2" oninput="Studio.setTextProp('text',this.value)">${esc(layer.text)}</textarea>
      </div>

      <div class="form-group" style="margin-bottom:0.5rem">
        <label class="form-label">Font (all kinds of letters)</label>
        <select class="form-input" onchange="Studio.setTextProp('fontFamily',this.value)">
          ${FONTS.map(f => `<option value="${f}" ${f === layer.fontFamily ? 'selected' : ''} style="font-family:${cssFont(f)}">${f}</option>`).join('')}
        </select>
      </div>
      <div id="tx-font-preview" style="font-family:${cssFont(layer.fontFamily)};font-weight:${layer.fontWeight};font-size:1.6rem;line-height:1.1;text-align:center;padding:0.5rem;margin-bottom:0.6rem;border-radius:10px;background:#0d0d14;border:1px solid rgba(255,255,255,.08);overflow:hidden;white-space:nowrap;text-overflow:ellipsis">${esc((layer.text || 'AaBbCc 123').split('\n')[0].slice(0,22)) || 'AaBbCc 123'}</div>

      <div style="display:flex;gap:0.5rem;margin-bottom:0.6rem">
        <div class="form-group" style="margin:0;flex:1">
          <label class="form-label">Color</label>
          <input class="form-input" type="color" value="${layer.color}" oninput="Studio.setTextProp('color',this.value)" style="height:38px;padding:2px">
        </div>
        <div class="form-group" style="margin:0;flex:1">
          <label class="form-label">Weight</label>
          <select class="form-input" onchange="Studio.setTextProp('fontWeight',+this.value)">
            ${WEIGHTS.map(([v,lbl]) => `<option value="${v}" ${+v === layer.fontWeight ? 'selected' : ''}>${lbl} (${v})</option>`).join('')}
          </select>
        </div>
      </div>

      <label class="form-label">Alignment</label>
      <div class="blend-modes-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:0.6rem">
        ${ALIGNS.map(([v,lbl]) => `<button class="blend-mode-btn ${((layer.align||'center')===v)?'active':''}" onclick="Studio.setTextAlign('${v}',this)">${lbl}</button>`).join('')}
      </div>

      <label class="form-label">Case</label>
      <div class="blend-modes-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:0.6rem">
        ${CASES.map(([v,lbl]) => `<button class="blend-mode-btn ${((layer.textCase||'none')===v)?'active':''}" onclick="Studio.setTextCase('${v}',this)">${lbl}</button>`).join('')}
      </div>

      ${txSlider('Size','tx-size',Math.round(layer.fontSize),8,500,1,'px','fontSize')}
      ${txSlider('Letter spacing','tx-ls',layer.letterSpacing||0,-10,60,1,'px','letterSpacing')}
      ${txSlider('Line spacing','tx-lh',layer.lineHeight||1.15,0.8,2.6,0.05,'','lineHeight')}
      ${txSlider('Rotation','tx-rot',layer.rotation||0,-180,180,1,'°','rotation')}

      <div class="editor-section-title" style="margin-bottom:0.5rem">Outline</div>
      <div style="display:flex;gap:0.5rem;margin-bottom:0.55rem;align-items:center">
        <input class="form-input" type="color" value="${layer.strokeColor || '#000000'}" oninput="Studio.setTextProp('strokeColor',this.value)" style="width:46px;height:38px;padding:2px;flex:none">
        <div style="flex:1">${txSlider('Outline width','tx-sw',layer.strokeWidth||0,0,40,1,'px','strokeWidth')}</div>
      </div>

      <div class="editor-section-title" style="margin-bottom:0.5rem">Glow &amp; shadow</div>
      <div style="display:flex;gap:0.5rem;margin-bottom:0.55rem;align-items:center">
        <input class="form-input" type="color" value="${layer.shadowColor || '#000000'}" oninput="Studio.setTextProp('shadowColor',this.value)" style="width:46px;height:38px;padding:2px;flex:none" title="Glow/shadow color">
        <div style="flex:1">${txSlider('Blur','tx-shb',layer.shadowBlur||0,0,80,1,'px','shadowBlur')}</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.4rem;margin-bottom:0.6rem">
        <div><label class="form-label">Shadow X</label><input class="form-input" type="number" value="${layer.shadowOffX||0}" oninput="Studio.setTextProp('shadowOffX',+this.value)"></div>
        <div><label class="form-label">Shadow Y</label><input class="form-input" type="number" value="${layer.shadowOffY||0}" oninput="Studio.setTextProp('shadowOffY',+this.value)"></div>
      </div>

      <div class="editor-section-title" style="margin-bottom:0.5rem">Background behind the text</div>
      <button class="blend-mode-btn ${layer.bgOn?'active':''}" style="width:100%;margin-bottom:0.55rem" onclick="Studio.toggleTextBg(this)">${layer.bgOn ? '● Background on' : '○ Background off'}</button>
      <div id="tx-bg-controls" style="${layer.bgOn ? '' : 'display:none'}">
        <div style="display:flex;gap:0.5rem;margin-bottom:0.55rem;align-items:center">
          <input class="form-input" type="color" value="${layer.bgColor || '#000000'}" oninput="Studio.setTextProp('bgColor',this.value)" style="width:46px;height:38px;padding:2px;flex:none">
          <div style="flex:1">${txSlider('Box opacity','tx-bgo',Math.round((layer.bgOpacity??0.55)*100),0,100,1,'%',null,"Studio.setTextProp('bgOpacity',this.value/100)")}</div>
        </div>
        ${txSlider('Corner radius','tx-bgr',layer.bgRadius??14,0,80,1,'px','bgRadius')}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.4rem;margin-bottom:0.6rem">
          <div><label class="form-label">Padding X</label><input class="form-input" type="number" min="0" max="200" value="${layer.bgPadX??26}" oninput="Studio.setTextProp('bgPadX',+this.value)"></div>
          <div><label class="form-label">Padding Y</label><input class="form-input" type="number" min="0" max="200" value="${layer.bgPadY??14}" oninput="Studio.setTextProp('bgPadY',+this.value)"></div>
        </div>
      </div>

      <div class="editor-section-title" style="margin-bottom:0.5rem">Motion &amp; animation</div>
      <div class="blend-modes-grid" style="margin-bottom:0.6rem">
        ${ANIMS.map(a => `<button class="blend-mode-btn ${a.id === layer.anim ? 'active' : ''}" onclick="Studio.setTextAnim('${a.id}',this)">${a.label}</button>`).join('')}
      </div>
      ${txSlider('Speed','tx-spd',spd,0.5,8,0.5,'s','animSpeed')}
      ${txSlider('Opacity','tx-op',op,0,100,1,'%',null,"Studio.setLayerOpacity(this.value/100)")}

      <div class="editor-section-title" style="margin-bottom:0.5rem">Position — drag the text on the canvas</div>
      <div class="blend-modes-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:0.55rem">
        ${[[0.12,0.14],[0.5,0.14],[0.88,0.14],[0.12,0.5],[0.5,0.5],[0.88,0.5],[0.12,0.86],[0.5,0.86],[0.88,0.86]]
          .map(([fx,fy]) => `<button class="blend-mode-btn" style="padding:0.55rem 0" title="Snap here" onclick="Studio.snapTextPos(${fx},${fy},this)">•</button>`).join('')}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.4rem;margin-bottom:0.6rem">
        <div><label class="form-label">X</label><input class="form-input" type="number" id="tx-x" value="${Math.round(layer.x)}" oninput="Studio.setLayerProp('x',+this.value)"></div>
        <div><label class="form-label">Y</label><input class="form-input" type="number" id="tx-y" value="${Math.round(layer.y)}" oninput="Studio.setLayerProp('y',+this.value)"></div>
      </div>

      <div class="editor-section-title" style="margin-bottom:0.5rem">AI style</div>
      <div class="form-group" style="margin-bottom:0.6rem">
        <input class="form-input" id="tx-ai-prompt" placeholder="describe the style, e.g. &quot;neon retro 80s&quot;" style="margin-bottom:0.4rem">
        <button class="btn btn-primary btn-sm w-full" onclick="Studio.aiTextStyle()">${Icon('sparkles')} Let AI choose font + color + motion</button>
        <button class="btn btn-ghost btn-sm w-full mt-1" onclick="Studio.aiTextColor()">${Icon('palette')} AI color from mood</button>
      </div>
      <div class="form-group" style="margin-bottom:0">
        <label class="form-label">Layer name</label>
        <input class="form-input" value="${esc(layer.label)}" oninput="Studio.updateLayerLabel(this.value)">
      </div>
    `;
  }

  function filterSlider2(label, id, val, min, max) {
    return `<div class="filter-item" style="margin-bottom:0.6rem"><div class="filter-label"><span>${label}</span><span id="${id}-v">${val}</span></div><input type="range" id="${id}" min="${min}" max="${max}" value="${val}" oninput="document.getElementById('${id}-v').textContent=this.value;Studio.updateLayerFilter('${id.replace('lf-','')}',+this.value)"></div>`;
  }

  // ── Layer ops ─────────────────────────────────────────────────────────
  function updateLayerLabel(val) { if (layers[activeLayerIdx]) { layers[activeLayerIdx].label = val; } }

  function setLayerOpacity(val) { if (layers[activeLayerIdx]) layers[activeLayerIdx].opacity = Math.max(0, Math.min(1, val)); }

  function setLayerProp(prop, val) { if (layers[activeLayerIdx]) layers[activeLayerIdx][prop] = val; }

  function updateLayerFilter(key, val) { if (layers[activeLayerIdx]) layers[activeLayerIdx].filters[key] = val; }

  function setBlendMode(mode, btn) {
    if (layers[activeLayerIdx]) {
      layers[activeLayerIdx].blendMode = mode;
      document.querySelectorAll('.blend-mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    }
  }

  function toggleLayerVisibility(idx, e) {
    e.stopPropagation();
    layers[idx].visible = !layers[idx].visible;
    renderLayerList();
  }

  function moveLayer(idx, dir, e) {
    e.stopPropagation();
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= layers.length) return;
    [layers[idx], layers[newIdx]] = [layers[newIdx], layers[idx]];
    activeLayerIdx = newIdx;
    renderLayerList();
  }

  function deleteLayer(idx, e) {
    e.stopPropagation();
    layers.splice(idx, 1);
    activeLayerIdx = Math.min(activeLayerIdx, layers.length - 1);
    renderLayerList();
    renderLayerControls();
  }

  function clearCanvas() {
    layers = [];
    activeLayerIdx = -1;
    renderLayerList();
    renderLayerControls();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  // ── Render loop ───────────────────────────────────────────────────────
  function startRenderLoop() {
    if (animFrame) cancelAnimationFrame(animFrame);
    function loop() {
      // Sjølv-terminer når lerretet er kopla frå DOM (brukaren har forlate Studio) —
      // elles køyrer RAF-loopen for alltid og videolaga held fram med å dekode i bakgrunnen.
      if (!canvas || !ctx || !canvas.isConnected) {
        animFrame = null;
        try { layers.forEach(l => { if (l.element && l.element.tagName === 'VIDEO') l.element.pause(); }); } catch (_) {}
        return;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // Dark background
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const now = performance.now();
      layers.forEach(layer => {
        if (!layer.visible) return;
        if (layer.type === 'text') { drawTextLayer(layer, now); return; }
        if (!layer.element) return;
        ctx.save();
        ctx.globalAlpha            = layer.opacity;
        ctx.globalCompositeOperation = layer.blendMode;

        const f = layer.filters;
        ctx.filter = `brightness(${f.brightness}%) contrast(${f.contrast}%) saturate(${f.saturation}%) hue-rotate(${f.hue}deg)`;

        try {
          ctx.drawImage(layer.element, layer.x, layer.y, layer.width, layer.height);
        } catch {}
        layer._bbox = { x: layer.x, y: layer.y, w: layer.width, h: layer.height };

        ctx.restore();
      });

      animFrame = requestAnimationFrame(loop);
    }
    loop();
  }

  // Tegn et tekst-lag: skrift/farge/kant/glød/bakgrunn + «zoom inn»-bevegelse.
  // Alt tegnes rundt origo (0,0) = tekstens senter, slik at rotasjon og skalering
  // skjer om senteret. Ankeret (layer.x, layer.y) er dette senteret på lerretet.
  function drawTextLayer(layer, now) {
    const raw = layer.text || '';
    const lines = raw.split('\n').map(l => applyCase(l, layer.textCase || 'none'));
    const size  = Math.max(4, layer.fontSize || 64);
    const align = layer.align || 'center';

    ctx.save();
    ctx.globalCompositeOperation = layer.blendMode || 'source-over';
    ctx.textAlign    = align;
    ctx.textBaseline = 'middle';
    ctx.font = `${layer.fontWeight || 700} ${size}px ${cssFont(layer.fontFamily || 'sans-serif')}`;
    try { ctx.letterSpacing = `${layer.letterSpacing || 0}px`; } catch {}

    const lineH  = size * (layer.lineHeight || 1.15);
    const textW  = Math.max(1, ...lines.map(l => ctx.measureText(l).width));
    const blockH = lineH * lines.length;
    const cx = layer.x, cy = layer.y;

    // Statisk treffboks (uten bevegelse/rotasjon) for å kunne gripe teksten med musa.
    layer._bbox = { x: cx - textW / 2, y: cy - blockH / 2, w: textW, h: blockH };

    // Bevegelse: slide/skaler inn, eller kontinuerlige effekter (puls, glød, rotasjon…). Looper.
    let dx = 0, dy = 0, scale = 1, scaleX = 1, alpha = 1, spin = 0, glow = 0, reveal = 1;
    const dur = Math.max(0.3, layer.animSpeed || 3) * 1000;
    const p   = (now % dur) / dur;            // 0..1, repeterende
    const tau = Math.PI * 2;
    const inP = easeOutCubic(Math.min(p / 0.45, 1)); // glir inn over første 45 %, holder
    const fade = Math.min(p / 0.18, 1);
    switch (layer.anim) {
      case 'fade':      alpha = fade; break;
      case 'left':      dx = -(cx + textW / 2 + 60) * (1 - inP); alpha = fade; break;
      case 'right':     dx =  (canvas.width - cx + textW / 2 + 60) * (1 - inP); alpha = fade; break;
      case 'up':        dy = -(cy + blockH / 2 + 60) * (1 - inP); alpha = fade; break;
      case 'down':      dy =  (canvas.height - cy + blockH / 2 + 60) * (1 - inP); alpha = fade; break;
      case 'zoom-in':   scale = 0.05 + 0.95 * easeOutCubic(Math.min(p / 0.5, 1)); alpha = fade; break;
      case 'zoom-out':  scale = 1 + (1 - easeOutCubic(Math.min(p / 0.5, 1))) * 2.4; alpha = fade; break;
      case 'pulse':     scale = 1 + 0.12 * Math.sin(p * tau); break;
      case 'bounce':    dy = -(cy + blockH / 2 + 90) * (1 - easeOutBounce(Math.min(p / 0.7, 1))); alpha = fade; break;
      case 'shake':     dx = Math.sin(now / 45) * size * 0.05; dy = Math.cos(now / 38) * size * 0.03; break;
      case 'typewriter':reveal = Math.min(p / 0.75, 1); break;
      case 'wave':      dy = Math.sin(now / 300) * size * 0.14; break;
      case 'glow':      glow = 0.5 + 0.5 * Math.sin(p * tau); break;
      case 'spin':      spin = p * tau; alpha = fade; break;
      case 'flip':      scaleX = Math.cos(p * tau); break;
      default: break;
    }

    const baseAlpha = Math.max(0, Math.min(1, layer.opacity * alpha));
    ctx.globalAlpha = baseAlpha;
    ctx.translate(cx + dx, cy + dy);
    const rot = (layer.rotation ? layer.rotation * Math.PI / 180 : 0) + spin;
    if (rot) ctx.rotate(rot);
    if (scale !== 1 || scaleX !== 1) ctx.scale(scale * scaleX, scale);
    // Fra nå tegnes alt relativt til senteret (0,0).

    // x-posisjon per linje avhenger av justeringen (senteret ligger på 0).
    const alignX = align === 'left' ? -textW / 2 : align === 'right' ? textW / 2 : 0;

    // Fargeboks bak teksten (lesbarhet) — tegnes først, uten glød.
    if (layer.bgOn) {
      const padX = layer.bgPadX ?? 26, padY = layer.bgPadY ?? 14;
      const bx = -textW / 2 - padX, by = -blockH / 2 - padY;
      const bw = textW + padX * 2,  bh = blockH + padY * 2;
      ctx.save();
      ctx.globalAlpha = baseAlpha * (layer.bgOpacity ?? 0.55);
      ctx.fillStyle = layer.bgColor || '#000000';
      const r = Math.max(0, Math.min(layer.bgRadius ?? 14, bw / 2, bh / 2));
      if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, r); ctx.fill(); }
      else ctx.fillRect(bx, by, bw, bh);
      ctx.restore();
    }

    // Skrivemaskin: avslør tegn gradvis over hele tekstblokken.
    let shownLeft = reveal >= 1 ? Infinity : Math.floor(reveal * lines.reduce((a, l) => a + l.length, 0));

    lines.forEach((full, i) => {
      let ln = full;
      if (shownLeft !== Infinity) { ln = full.slice(0, Math.max(0, shownLeft)); shownLeft -= full.length; }
      if (!ln) return;
      const ly = -blockH / 2 + lineH * (i + 0.5);
      if (layer.strokeWidth > 0) {
        ctx.lineWidth   = layer.strokeWidth;
        ctx.strokeStyle = layer.strokeColor || '#000';
        ctx.lineJoin    = 'round';
        ctx.strokeText(ln, alignX, ly);
      }
      // Glød / skygge legges kun på fyll-teksten (statisk skygge + evt. animert glød).
      if (glow > 0) {
        ctx.shadowColor = layer.color || '#fff';
        ctx.shadowBlur  = size * 0.55 * glow;
        ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
      } else if ((layer.shadowBlur || 0) > 0 || layer.shadowOffX || layer.shadowOffY) {
        ctx.shadowColor   = layer.shadowColor || 'rgba(0,0,0,0.6)';
        ctx.shadowBlur    = layer.shadowBlur || 0;
        ctx.shadowOffsetX = layer.shadowOffX || 0;
        ctx.shadowOffsetY = layer.shadowOffY || 0;
      }
      ctx.fillStyle = layer.color || '#fff';
      ctx.fillText(ln, alignX, ly);
      ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
    });
    ctx.restore();
  }

  // ── Dra et lag på lerretet for å plassere det der man vil ───────────────
  function attachCanvasDrag() {
    if (!canvas || canvas._dragBound) return;
    canvas._dragBound = true;

    const toCanvasCoords = (e) => {
      const r = canvas.getBoundingClientRect();
      return {
        x: (e.clientX - r.left) * (canvas.width  / r.width),
        y: (e.clientY - r.top)  * (canvas.height / r.height),
      };
    };
    const hitTest = (x, y) => {
      for (let i = layers.length - 1; i >= 0; i--) {
        const b = layers[i]._bbox;
        if (b && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return i;
      }
      return -1;
    };

    canvas.addEventListener('pointerdown', (e) => {
      const { x, y } = toCanvasCoords(e);
      let idx = hitTest(x, y);
      if (idx < 0) idx = activeLayerIdx; // ingen treff → flytt det aktive laget
      if (idx < 0 || !layers[idx]) return;
      if (idx !== activeLayerIdx) setActiveLayer(idx);
      const l = layers[idx];
      drag = { idx, startX: x, startY: y, layerX: l.x, layerY: l.y };
      canvas.setPointerCapture(e.pointerId);
      canvas.style.cursor = 'grabbing';
    });
    canvas.addEventListener('pointermove', (e) => {
      const { x, y } = toCanvasCoords(e);
      if (!drag) { canvas.style.cursor = hitTest(x, y) >= 0 ? 'grab' : 'default'; return; }
      const l = layers[drag.idx];
      if (!l) return;
      l.x = drag.layerX + (x - drag.startX);
      l.y = drag.layerY + (y - drag.startY);
      const xi = document.getElementById('tx-x'), yi = document.getElementById('tx-y');
      if (xi) xi.value = Math.round(l.x);
      if (yi) yi.value = Math.round(l.y);
    });
    const endDrag = (e) => {
      if (!drag) return;
      drag = null;
      canvas.style.cursor = 'default';
      try { canvas.releasePointerCapture(e.pointerId); } catch {}
      renderLayerControls(); // synk X/Y-feltene med ny posisjon
    };
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);
  }

  function applySize() {
    const w = parseInt(document.getElementById('canvas-w').value) || 800;
    const h = parseInt(document.getElementById('canvas-h').value) || 500;
    setSize(w, h);
  }

  function setSize(w, h) {
    if (!canvas) return;
    canvas.width  = w;
    canvas.height = h;
    const inp_w = document.getElementById('canvas-w');
    const inp_h = document.getElementById('canvas-h');
    if (inp_w) inp_w.value = w;
    if (inp_h) inp_h.value = h;
  }

  // ── Export ────────────────────────────────────────────────────────────
  function exportImage() {
    const link    = document.createElement('a');
    link.download = `profilverse-blend-${Date.now()}.png`;
    link.href     = canvas.toDataURL('image/png');
    link.click();
  }

  function exportJPEG() {
    const link    = document.createElement('a');
    link.download = `profilverse-blend-${Date.now()}.jpg`;
    link.href     = canvas.toDataURL('image/jpeg', 0.92);
    link.click();
  }

  function toggleRecording() {
    if (!recording) startRecording();
    else stopRecording();
  }

  function startRecording() {
    if (!canvas.captureStream) { App.toast('The browser does not support video recording', 'error'); return; }
    recChunks = [];
    const stream = canvas.captureStream(30);
    mediaRec    = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
    mediaRec.ondataavailable = e => { if (e.data.size) recChunks.push(e.data); };
    mediaRec.onstop = () => {
      const blob = new Blob(recChunks, { type: 'video/webm' });
      const link = document.createElement('a');
      link.download = `profilverse-blend-${Date.now()}.webm`;
      const dlUrl   = URL.createObjectURL(blob);
      link.href     = dlUrl;
      link.click();
      setTimeout(() => URL.revokeObjectURL(dlUrl), 5000);
      // Frigi capture-tracks så canvasen ikkje blir verande «live captured» og
      // MediaStream-ar ikkje hopar seg opp ved gjentekne opptak.
      try { stream.getTracks().forEach(t => t.stop()); } catch (_) {}
      const st = document.getElementById('rec-status');
      if (st) { st.textContent = '✅ Video saved!'; }
      recording = false;
      // Null-vakt: brukaren kan ha navigert vekk før onstop (async) rekk å fyre.
      const btn = document.getElementById('record-btn');
      if (btn) btn.textContent = '🔴 Record video';
    };
    mediaRec.start(100);
    recording = true;
    document.getElementById('record-btn').textContent = '⏹ Stop recording';
    const st = document.getElementById('rec-status');
    if (st) { st.style.display = 'block'; st.textContent = '⏺ Recording…'; }
  }

  function stopRecording() {
    if (mediaRec && mediaRec.state !== 'inactive') mediaRec.stop();
  }

  async function saveToProfile() {
    const current = Auth.current();
    if (!current) { Router.go('/login'); return; }
    canvas.toBlob(async blob => {
      if (!blob) return;
      const id   = `blend_${Date.now()}`;
      const file = new File([blob], `blend-${Date.now()}.png`, { type: 'image/png' });
      await DB.storeFile('media', id, file);
      current.mediaIds = [...(current.mediaIds || []), id];
      Auth.updateUser(current.username, { mediaIds: current.mediaIds });
      App.toast('Blend saved to your profile! ✓', 'success');
    }, 'image/png');
  }

  // Del blend-komposisjonen til Community-veggen — synleg for alle profilar (vener eller ei).
  // Lastar PNG-en opp til Supabase (delbar URL) så andre faktisk ser bildet.
  async function shareToCommunity() {
    const current = Auth.current();
    if (!current) { Router.go('/login'); return; }
    if (typeof SC_Storage === 'undefined' || !SC_Storage.isConfigured()) {
      App.toast('Cloud storage must be on to share a blend to Community', 'error'); return;
    }
    if (!window.Community) { App.toast('Community not available', 'error'); return; }
    App.toast('Sharing blend…', 'info', 1500);
    canvas.toBlob(async (blob) => {
      if (!blob) { App.toast('Could not create image', 'error'); return; }
      try {
        const id   = `blend_${Date.now()}`;
        const file = new File([blob], `blend-${Date.now()}.png`, { type: 'image/png' });
        const res  = await SC_Storage.upload(file, { prefix: 'blend' });
        Community.shareMedia({ kind: 'blend', name: 'Blend', url: res.url, sourceId: id, audience: 'public' });
        App.toast('Blend shared to Community! 🎨', 'success');
      } catch (e) {
        console.warn('[Studio] blend-deling feila', e);
        App.toast('Sharing failed', 'error');
      }
    }, 'image/png');
  }

  // ── Erstatt / bytt ut mediet i et lag (uten å slette og legge til på nytt) ──
  // Åpner rett filvelger for lagets type; det aktive laget beholder posisjon,
  // blandemodus og gjennomsiktighet, men får nytt bilde/video.
  function editLayer(idx, e) {
    if (e) e.stopPropagation();
    setActiveLayer(idx);
    const panel = document.querySelector('.studio-panel');
    if (panel && panel.scrollIntoView) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function replaceActiveLayer() {
    const l = layers[activeLayerIdx];
    if (!l) { App.toast('Choose a layer first', 'error'); return; }
    replaceTarget = activeLayerIdx;
    if (l.type === 'image')      document.getElementById('studio-img-replace').click();
    else if (l.type === 'video') document.getElementById('studio-vid-replace').click();
    else { replaceTarget = -1; App.toast('Text is edited in the text field above', 'info'); }
  }

  function handleReplaceImage(file) {
    const idx = replaceTarget; replaceTarget = -1;
    const l = layers[idx];
    if (!file || !l) return;
    const img = new Image();
    img.onload = () => {
      l.type    = 'image';
      l.element = img;
      l.width   = img.naturalWidth  || l.width;
      l.height  = img.naturalHeight || l.height;
      l.label   = file.name.replace(/\.[^.]+$/, '');
      renderLayerList();
      renderLayerControls();
      App.toast('Image replaced ✓', 'success');
    };
    img.src = URL.createObjectURL(file);
    document.getElementById('studio-img-replace').value = '';
  }

  function handleReplaceVideo(file) {
    const idx = replaceTarget; replaceTarget = -1;
    const l = layers[idx];
    if (!file || !l) return;
    const vid = document.createElement('video');
    vid.src = URL.createObjectURL(file);
    vid.loop = true; vid.muted = true; vid.preload = 'auto';
    vid.play().catch(() => {});
    vid.onloadedmetadata = () => {
      l.type    = 'video';
      l.element = vid;
      l.width   = vid.videoWidth  || l.width;
      l.height  = vid.videoHeight || l.height;
      l.label   = file.name.replace(/\.[^.]+$/, '');
      renderLayerList();
      renderLayerControls();
      App.toast('Video replaced ✓', 'success');
    };
    document.getElementById('studio-vid-replace').value = '';
  }

  // ── Del blend som delbar lenke med Open Graph-forhåndsvisning ──────────────
  // Tar et øyeblikksbilde (PNG) av lerretet slik det ser ut nå, viser det i en
  // forhåndsvisning brukeren bekrefter, laster det opp til skylagring og bygger
  // en /s/<payload>-lenke som Facebook/X/WhatsApp viser med ekte bilde-kort.
  function shareBlend() {
    const current = (typeof Auth !== 'undefined' && Auth.current) ? Auth.current() : null;
    if (!current) { Router.go('/login'); return; }
    if (!layers.length) { App.toast('Add at least one layer before sharing', 'error'); return; }
    if (!canvas) return;
    canvas.toBlob(blob => {
      if (!blob) { App.toast('Could not create preview', 'error'); return; }
      openSharePreview(blob, current);
    }, 'image/png');
  }

  function openSharePreview(blob, current) {
    const objUrl = URL.createObjectURL(blob);
    const configured = (typeof SC_Storage !== 'undefined' && SC_Storage.isConfigured());
    const ov = document.createElement('div');
    ov.className = 'studio-share-modal';
    ov.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.66);display:flex;align-items:center;justify-content:center;padding:1.5rem;backdrop-filter:blur(4px)';
    ov.innerHTML = `
      <div style="width:100%;max-width:440px;background:#15151f;border:1px solid rgba(255,255,255,.1);border-radius:18px;padding:1.3rem;box-shadow:0 20px 60px rgba(0,0,0,.6)">
        <div style="font-weight:800;font-size:1.05rem;margin-bottom:.2rem;text-align:center">Preview before sharing</div>
        <div style="color:#9a9aad;font-size:.82rem;margin-bottom:.9rem;text-align:center">This is how the link looks when you share it on social media.</div>
        <img src="${objUrl}" alt="Preview" style="width:100%;border-radius:12px;display:block;margin-bottom:.9rem;background:#000">
        <label class="form-label">Title</label>
        <input id="studio-share-title" class="form-input" value="My blend" maxlength="120" style="margin-bottom:.9rem">
        <div style="display:grid;gap:.55rem">
          <button id="studio-share-community" class="btn" style="color:#fff;font-weight:800;background:linear-gradient(135deg,#22c55e,#15803d);border:none">${Icon('users')} Share to Community</button>
          <button id="studio-share-wall" class="btn" style="color:#fff;font-weight:800;background:linear-gradient(135deg,#2563eb,#1e40af);border:none">${Icon('user')} Share to my wall</button>
          <button id="studio-share-group" class="btn" style="color:#fff;font-weight:800;background:linear-gradient(135deg,#8b5cf6,#6d28d9);border:none">${Icon('users')} Share to group</button>
          <div style="color:#6a6a7d;font-size:.72rem;text-transform:uppercase;letter-spacing:.05em;margin:.35rem 0 .1rem;text-align:center">Or create a shareable link</div>
          <button id="studio-share-go" class="btn btn-primary">${Icon('share')} Create shareable link</button>
          <button id="studio-share-cancel" class="btn btn-ghost">Cancel</button>
        </div>
        <div id="studio-share-status" class="text-sm" style="margin-top:.7rem;text-align:center;color:#9a9aad;${configured ? 'display:none' : ''}">${configured ? '' : 'Cloud storage must be on to share the blend so others can see it.'}</div>
      </div>`;
    document.body.appendChild(ov);

    const close = () => { try { URL.revokeObjectURL(objUrl); } catch {} ov.remove(); };
    ov.addEventListener('click', e => { if (e.target === ov) close(); });
    ov.querySelector('#studio-share-cancel').onclick = close;

    const status  = ov.querySelector('#studio-share-status');
    const getTitle = () => (ov.querySelector('#studio-share-title').value || 'My blend').trim();
    const allBtns  = () => ov.querySelectorAll('button');
    const setBusy  = (on) => allBtns().forEach(b => b.disabled = on);

    // Last opp blenden til sky-lagring én gang og gjenbruk den offentlege URL-en
    // for alle delings-måtar (Community/vegg/gruppe/lenke). Krev sky-lagring så
    // andre faktisk kan sjå bildet — P2P-innlegg ber berre URL-strengen.
    let _publicUrl = null;
    async function ensureUpload() {
      if (_publicUrl) return _publicUrl;
      if (typeof SC_Storage === 'undefined' || !SC_Storage.isConfigured()) {
        status.style.display = 'block';
        status.textContent = 'Cloud storage must be on to share the blend so others can see it.';
        return null;
      }
      status.style.display = 'block'; status.textContent = 'Uploading preview…';
      const file = new File([blob], `blend-${Date.now()}.png`, { type: 'image/png' });
      const res  = await SC_Storage.upload(file, { prefix: 'blend' });
      _publicUrl = res && res.url;
      if (!_publicUrl) throw new Error('upload gav ingen URL');
      return _publicUrl;
    }

    // Del til «veggen» (Community-feeden). audience: 'public' = alle ser den,
    // ellers brukerens eigen vegg-lås (venner/privat). Innlegget dukkar opp både
    // i Community og på profilen din.
    async function shareToWall(audience, goTo) {
      if (!window.Community || !Community.shareMedia) { App.toast('Community is not available right now.', 'error'); return; }
      const title = getTitle();
      setBusy(true);
      try {
        const pub = await ensureUpload();
        if (!pub) { setBusy(false); return; }
        const id = Community.shareMedia({ kind: 'blend', name: title, url: pub, coverUrl: pub, audience });
        close();
        App.toast(id ? 'Shared! 🎉' : 'This blend has already been shared.', id ? 'success' : 'info');
        if (id && window.Router) Router.go(goTo);
      } catch (e) {
        console.warn('[Studio] shareToWall', e);
        setBusy(false);
        status.textContent = 'Sharing failed. Try again.';
      }
    }

    ov.querySelector('#studio-share-community').onclick = () => shareToWall('public', '/community');
    ov.querySelector('#studio-share-wall').onclick = () =>
      shareToWall((current && current.wallVisibility) || 'public', '/u/' + encodeURIComponent((current && current.username) || ''));

    // Del i gruppe — last opp, bygg ei delbar /s/-lenke og la brukeren velje kva
    // gruppe innlegget skal i (inline-velgjar i same modal).
    ov.querySelector('#studio-share-group').onclick = async () => {
      const list = (window.Groups && Groups.myGroups) ? Groups.myGroups() : [];
      if (!list.length) { App.toast('You are not a member of any groups yet. Create or join one first.', 'info', 5000); return; }
      if (typeof Share === 'undefined' || !Share.buildUrl) { App.toast('Sharing is not available right now.', 'error'); return; }
      const title = getTitle();
      setBusy(true);
      try {
        const pub = await ensureUpload();
        if (!pub) { setBusy(false); return; }
        const link = Share.buildUrl({ kind: 'image', title, image: pub, username: (current && current.username) || '' });
        const card = ov.firstElementChild;
        card.innerHTML = `
          <div style="font-weight:800;font-size:1.05rem;margin-bottom:.8rem;text-align:center">${Icon('users')} Share to group</div>
          <div style="display:grid;gap:.5rem;max-height:50vh;overflow:auto">
            ${list.map(g => `<button data-gid="${String(g.id).replace(/"/g, '&quot;')}" style="cursor:pointer;color:#fff;font-weight:700;padding:.75rem;border-radius:12px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);font-size:.92rem;text-align:left">${(g.name || '').replace(/</g, '&lt;')}</button>`).join('')}
          </div>
          <button id="studio-group-cancel" class="btn btn-ghost" style="margin-top:.7rem;width:100%">Cancel</button>`;
        card.querySelector('#studio-group-cancel').onclick = close;
        card.querySelectorAll('button[data-gid]').forEach(b => b.onclick = () => {
          const text = (title ? title + '\n\n' : '') + link;
          if (window.Groups && Groups.shareToGroup && Groups.shareToGroup(b.dataset.gid, text)) close();
        });
      } catch (e) {
        console.warn('[Studio] shareToGroup', e);
        setBusy(false);
        status.textContent = 'Sharing failed. Try again.';
      }
    };

    ov.querySelector('#studio-share-go').onclick = async () => {
      const goBtn  = ov.querySelector('#studio-share-go');
      const title  = getTitle();
      if (typeof Share === 'undefined' || !Share.buildUrl) {
        status.style.display = 'block'; status.textContent = 'Sharing is not available right now.'; return;
      }
      setBusy(true);
      try {
        const pub = await ensureUpload();
        if (!pub) { setBusy(false); return; }
        const url = Share.buildUrl({ kind: 'image', title, image: pub, username: (current && current.username) || '' });
        close();
        Share.shareUrl(url, title, '', {
          community: { kind: 'blend', name: title, url: pub, coverUrl: pub },
          groups: { text: '', title },
        });
      } catch (e) {
        console.warn('[Studio] shareBlend', e);
        setBusy(false);
        status.textContent = 'Sharing failed. Try again.';
      }
    };
  }

  return {
    render,
    addImageLayer, addVideoLayer, addTextLayer,
    handleImageFiles, handleVideoFile,
    handleReplaceImage, handleReplaceVideo, replaceActiveLayer, editLayer,
    setTextProp, setTextAnim, setTextAlign, setTextCase, toggleTextBg, snapTextPos, aiTextColor, aiTextStyle,
    setActiveLayer, toggleLayerVisibility,
    moveLayer, deleteLayer, clearCanvas,
    updateLayerLabel, setLayerOpacity, setLayerProp, updateLayerFilter,
    setBlendMode, setSize, applySize,
    exportImage, exportJPEG, toggleRecording, saveToProfile, shareToCommunity,
    shareBlend,
  };
})();
