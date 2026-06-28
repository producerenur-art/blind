// Blend Studio — Canvas-based image+video layer compositor
const Studio = (() => {
  let canvas, ctx, layers = [], activeLayerIdx = -1;
  let animFrame = null, recording = false, mediaRec = null, recChunks = [];

  const BLEND_MODES = [
    'source-over','multiply','screen','overlay',
    'soft-light','hard-light','color-dodge','color-burn',
    'difference','exclusion','lighten','darken',
  ];

  const BLEND_LABELS = {
    'source-over':'Normal','multiply':'Multipliser','screen':'Skjerm','overlay':'Overlegg',
    'soft-light':'Myk lys','hard-light':'Hard lys','color-dodge':'Dodge','color-burn':'Burn',
    'difference':'Differanse','exclusion':'Eksklusjon','lighten':'Lysere','darken':'Mørkere',
  };

  async function render() {
    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="studio-page">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1rem">
          <div>
            <h1 style="font-size:1.5rem;font-weight:800">${Icon('palette')} Blend Studio</h1>
            <p class="text-muted text-sm">Kombiner bilder og videoer med blandemoduser</p>
          </div>
          <div style="display:flex;gap:0.5rem">
            <button class="btn btn-ghost btn-sm" onclick="Router.go('/edit')">${Icon('arrow-left')} Tilbake</button>
          </div>
        </div>

        <div class="studio-layout">
          <!-- Canvas area -->
          <div>
            <div class="studio-canvas-wrap">
              <div class="studio-canvas-header">
                <button class="btn btn-ghost btn-sm" onclick="Studio.addImageLayer()">${Icon('image')} Legg til bilde</button>
                <button class="btn btn-ghost btn-sm" onclick="Studio.addVideoLayer()">${Icon('film')} Legg til video</button>
                <button class="btn btn-ghost btn-sm" onclick="Studio.clearCanvas()">${Icon('trash')} Tøm</button>
                <input type="file" id="studio-img-input" accept="image/*" style="display:none" multiple onchange="Studio.handleImageFiles(this.files)">
                <input type="file" id="studio-vid-input" accept="video/*" style="display:none" onchange="Studio.handleVideoFile(this.files[0])">
              </div>
              <div class="studio-canvas-body">
                <canvas id="blend-canvas" width="800" height="500"></canvas>
                <div class="studio-layers" id="studio-layers">
                  <div class="text-muted text-sm" style="padding:0.5rem">Ingen lag ennå — legg til bilder eller video ovenfor.</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Right panel -->
          <div class="studio-panel">
            <!-- Layer controls -->
            <div class="editor-panel-header">${Icon('settings')} Aktive lag-innstillinger</div>
            <div class="editor-panel-body" id="layer-controls-panel">
              <p class="text-muted text-sm">Velg et lag for å redigere.</p>
            </div>

            <div class="divider" style="margin:0"></div>

            <!-- Blend modes -->
            <div class="editor-panel-header">${Icon('film')} Blandemodus</div>
            <div class="editor-panel-body">
              <div class="blend-modes-grid" id="blend-grid">
                ${BLEND_MODES.map(m => `<button class="blend-mode-btn ${m==='source-over'?'active':''}" onclick="Studio.setBlendMode('${m}',this)">${BLEND_LABELS[m]}</button>`).join('')}
              </div>
            </div>

            <div class="divider" style="margin:0"></div>

            <!-- Canvas size -->
            <div class="editor-panel-header">${Icon('edit')} Lerretstørrelse</div>
            <div class="editor-panel-body">
              <div style="display:flex;gap:0.5rem;margin-bottom:0.75rem">
                <div class="form-group" style="margin:0;flex:1">
                  <label class="form-label">Bredde</label>
                  <input class="form-input" type="number" id="canvas-w" value="800" min="100" max="4000">
                </div>
                <div class="form-group" style="margin:0;flex:1">
                  <label class="form-label">Høyde</label>
                  <input class="form-input" type="number" id="canvas-h" value="500" min="100" max="4000">
                </div>
              </div>
              <div style="display:flex;gap:0.4rem;flex-wrap:wrap;margin-bottom:0.75rem">
                ${[['16:9','1280','720'],['1:1','720','720'],['4:3','800','600'],['9:16','720','1280']].map(([r,w,h]) => `<button class="badge badge-purple" style="cursor:pointer" onclick="Studio.setSize(${w},${h})">${r}</button>`).join('')}
              </div>
              <button class="btn btn-ghost btn-sm w-full" onclick="Studio.applySize()">Bruk størrelse</button>
            </div>

            <div class="divider" style="margin:0"></div>

            <!-- Export -->
            <div class="editor-panel-header">${Icon('save')} Eksporter</div>
            <div class="editor-panel-body">
              <div class="export-options">
                <button class="export-btn btn btn-primary" onclick="Studio.exportImage()">${Icon('camera')} Eksporter som PNG</button>
                <button class="export-btn btn btn-ghost" onclick="Studio.exportJPEG()">${Icon('image')} Eksporter som JPEG</button>
                <button class="export-btn btn btn-ghost" id="record-btn" onclick="Studio.toggleRecording()">${Icon('circle')} Ta opp video</button>
              </div>
              <div id="rec-status" class="text-muted text-sm mt-1" style="display:none"></div>
              <div style="margin-top:0.75rem">
                <label class="form-label">Lagre til profil</label>
                <button class="btn btn-ghost btn-sm w-full mt-1" onclick="Studio.saveToProfile()">${Icon('save')} Lagre blend til profil</button>
                <button class="btn btn-primary btn-sm w-full mt-1" onclick="Studio.shareToCommunity()">${Icon('users')} Del blend til Community</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    canvas = document.getElementById('blend-canvas');
    ctx    = canvas.getContext('2d');
    startRenderLoop();
  }

  // ── Layer management ──────────────────────────────────────────────────
  function createBaseLayer() {
    return {
      id:        Math.random().toString(36).slice(2),
      label:     'Lag',
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
      list.innerHTML = '<div class="text-muted text-sm" style="padding:0.5rem">Ingen lag ennå.</div>';
      return;
    }
    list.innerHTML = [...layers].reverse().map((l, ri) => {
      const idx = layers.length - 1 - ri;
      const thumbHtml = l.element
        ? (l.type === 'video' ? `<video src="${l.element.src}" style="width:100%;height:100%;object-fit:cover"></video>` : `<img src="${l.element.src}" style="width:100%;height:100%;object-fit:cover">`)
        : '';
      return `
        <div class="layer-item ${idx === activeLayerIdx ? 'active' : ''}" onclick="Studio.setActiveLayer(${idx})">
          <div class="layer-thumb">${thumbHtml}</div>
          <div style="flex:1;min-width:0">
            <div class="layer-label">${l.label}</div>
            <div class="layer-type">${l.type === 'video' ? '🎬' : '🖼️'} ${BLEND_LABELS[l.blendMode]}</div>
          </div>
          <div class="layer-controls">
            <button class="btn-icon" title="${l.visible ? 'Skjul' : 'Vis'}" onclick="Studio.toggleLayerVisibility(${idx},event)">${l.visible ? '👁' : '🚫'}</button>
            <button class="btn-icon" title="Flytt opp" onclick="Studio.moveLayer(${idx},-1,event)">${Icon('arrow-up')}</button>
            <button class="btn-icon" title="Flytt ned" onclick="Studio.moveLayer(${idx},1,event)">${Icon('arrow-down')}</button>
            <button class="btn-icon" title="Slett" onclick="Studio.deleteLayer(${idx},event)">${Icon('trash')}</button>
          </div>
        </div>`;
    }).join('');
  }

  function renderLayerControls() {
    const panel = document.getElementById('layer-controls-panel');
    if (!panel) return;
    const layer = layers[activeLayerIdx];
    if (!layer) { panel.innerHTML = '<p class="text-muted text-sm">Velg et lag.</p>'; return; }

    panel.innerHTML = `
      <div class="form-group" style="margin-bottom:0.75rem">
        <label class="form-label">Navn</label>
        <input class="form-input" value="${layer.label}" oninput="Studio.updateLayerLabel(this.value)">
      </div>
      <div class="filter-item" style="margin-bottom:0.75rem">
        <div class="filter-label"><span>Gjennomsiktighet</span><span id="op-val">${Math.round(layer.opacity*100)}%</span></div>
        <input type="range" min="0" max="100" value="${Math.round(layer.opacity*100)}" oninput="Studio.setLayerOpacity(this.value/100);document.getElementById('op-val').textContent=this.value+'%'">
      </div>
      <div class="editor-section-title" style="margin-bottom:0.5rem">Posisjon & størrelse</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.4rem;margin-bottom:0.75rem">
        <div><label class="form-label">X</label><input class="form-input" type="number" value="${Math.round(layer.x)}" oninput="Studio.setLayerProp('x',+this.value)"></div>
        <div><label class="form-label">Y</label><input class="form-input" type="number" value="${Math.round(layer.y)}" oninput="Studio.setLayerProp('y',+this.value)"></div>
        <div><label class="form-label">Bredde</label><input class="form-input" type="number" value="${Math.round(layer.width)}" oninput="Studio.setLayerProp('width',+this.value)"></div>
        <div><label class="form-label">Høyde</label><input class="form-input" type="number" value="${Math.round(layer.height)}" oninput="Studio.setLayerProp('height',+this.value)"></div>
      </div>
      <div class="editor-section-title" style="margin-bottom:0.5rem">Bildejusteringer</div>
      ${filterSlider2('Lysstyrke','lf-brightness',layer.filters.brightness,0,200)}
      ${filterSlider2('Kontrast','lf-contrast',layer.filters.contrast,0,200)}
      ${filterSlider2('Metning','lf-saturation',layer.filters.saturation,0,200)}
      ${filterSlider2('Fargetone','lf-hue',layer.filters.hue,0,360)}
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
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // Dark background
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      layers.forEach(layer => {
        if (!layer.visible || !layer.element) return;
        ctx.save();
        ctx.globalAlpha            = layer.opacity;
        ctx.globalCompositeOperation = layer.blendMode;

        const f = layer.filters;
        ctx.filter = `brightness(${f.brightness}%) contrast(${f.contrast}%) saturate(${f.saturation}%) hue-rotate(${f.hue}deg)`;

        try {
          ctx.drawImage(layer.element, layer.x, layer.y, layer.width, layer.height);
        } catch {}

        ctx.restore();
      });

      animFrame = requestAnimationFrame(loop);
    }
    loop();
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
    if (!canvas.captureStream) { App.toast('Nettleseren støtter ikke videoopptak', 'error'); return; }
    recChunks = [];
    const stream = canvas.captureStream(30);
    mediaRec    = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
    mediaRec.ondataavailable = e => { if (e.data.size) recChunks.push(e.data); };
    mediaRec.onstop = () => {
      const blob = new Blob(recChunks, { type: 'video/webm' });
      const link = document.createElement('a');
      link.download = `profilverse-blend-${Date.now()}.webm`;
      link.href     = URL.createObjectURL(blob);
      link.click();
      const st = document.getElementById('rec-status');
      if (st) { st.textContent = '✅ Video lagret!'; }
      recording = false;
      document.getElementById('record-btn').textContent = '🔴 Ta opp video';
    };
    mediaRec.start(100);
    recording = true;
    document.getElementById('record-btn').textContent = '⏹ Stopp opptak';
    const st = document.getElementById('rec-status');
    if (st) { st.style.display = 'block'; st.textContent = '⏺ Tar opp…'; }
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
      App.toast('Blend lagret til profilen din! ✓', 'success');
    }, 'image/png');
  }

  // Del blend-komposisjonen til Community-veggen — synleg for alle profilar (vener eller ei).
  // Lastar PNG-en opp til Supabase (delbar URL) så andre faktisk ser bildet.
  async function shareToCommunity() {
    const current = Auth.current();
    if (!current) { Router.go('/login'); return; }
    if (typeof SC_Storage === 'undefined' || !SC_Storage.isConfigured()) {
      App.toast('Skylagring må vere på for å dele blend til Community', 'error'); return;
    }
    if (!window.Community) { App.toast('Community ikkje tilgjengeleg', 'error'); return; }
    App.toast('Deler blend…', 'info', 1500);
    canvas.toBlob(async (blob) => {
      if (!blob) { App.toast('Kunne ikkje lage bilde', 'error'); return; }
      try {
        const id   = `blend_${Date.now()}`;
        const file = new File([blob], `blend-${Date.now()}.png`, { type: 'image/png' });
        const res  = await SC_Storage.upload(file, { prefix: 'blend' });
        Community.shareMedia({ kind: 'blend', name: 'Blend', url: res.url, sourceId: id, audience: 'public' });
        App.toast('Blend delt til Community! 🎨', 'success');
      } catch (e) {
        console.warn('[Studio] blend-deling feila', e);
        App.toast('Deling feilet', 'error');
      }
    }, 'image/png');
  }

  return {
    render,
    addImageLayer, addVideoLayer,
    handleImageFiles, handleVideoFile,
    setActiveLayer, toggleLayerVisibility,
    moveLayer, deleteLayer, clearCanvas,
    updateLayerLabel, setLayerOpacity, setLayerProp, updateLayerFilter,
    setBlendMode, setSize, applySize,
    exportImage, exportJPEG, toggleRecording, saveToProfile, shareToCommunity,
  };
})();
