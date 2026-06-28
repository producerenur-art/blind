/* ═══════════════════════════════════════════════════════════════════════
   SoundCore Studio — DAW (Cubase-aktig musikkprogram)
   UI + orkestrering. All lyd ligger i js/audioEngine.js (AudioEngine).
   Pro-sperret. Rute: #/daw
   ═══════════════════════════════════════════════════════════════════════ */
const DAW = (() => {
  'use strict';

  const E = () => window.AudioEngine;
  const STEPS_PER_BAR = 16;
  const MIN_MIDI = 36, MAX_MIDI = 84; // C2..C6 in piano roll

  let project = null;
  let selectedTrack = null;
  let clipboard = null;          // copied notes
  let selection = new Set();     // selected note indices (piano roll)
  let playStep = -1;
  let rafId = null;
  let devices = [];              // open instrument boxes: { id, kind:'synth'|'drum', target, x, y }
  let pencilTool = true;         // piano-roll: pencil (paint) vs select
  let midiInfo = { supported: false, inputs: [] };
  let recording = false;
  let armedTrack = null;

  // ── Defaults / factory ────────────────────────────────────────────────
  function totalSteps() { return project.bars * STEPS_PER_BAR; }

  function newTrack(instrumentId, name, type) {
    const isFx = type === 'fx';
    return {
      id: 't_' + Math.random().toString(36).slice(2, 9),
      name: name || (isFx ? 'FX-buss' : 'Spor'),
      type: type || 'inst',
      instrumentId: instrumentId || 'synthLead',
      steps: new Array(totalSteps()).fill(0),
      notes: [],                 // { start, len, midi, vel }
      vol: 0.8, pan: 0, mute: false, solo: false, tune: 0,
      defaultPitch: 60,
      synth: E().defaultSynth(instrumentId || 'synthLead'),
      eq: { low: 0, loMid: 0, hiMid: 0, high: 0 },
      comp: { threshold: -22, ratio: 3, attack: 0.006, release: 0.18 },
      dist: { drive: 0 },
      delay: { time: 0.3, fb: 0.3, mix: 0 },
      sidechain: { source: 'none', amount: 0.7 },
      sends: {},                 // busId → amount
      busFx: { distDrive: 0, delayTime: 0.35, delayFb: 0.4, delayMix: 0.5, reverbMix: 0.35, reverbSize: 2.2 },
      automation: {},            // paramKey → [vals]
      autoLane: null,            // currently shown automation param or null
    };
  }

  function newProject() {
    project = {
      name: 'Nytt prosjekt', bpm: 120, bars: 2, timeSig: '4/4',
      multiband: true, masterVol: 0.85,
      tracks: [],
    };
    addTrack('kick', 'Kick');
    addTrack('snare', 'Snare');
    addTrack('hatClosed', 'Hi-hat');
    addTrack('synthBass', 'Bass');
    selectedTrack = project.tracks[3].id;
  }

  // ════════════════════════════════════════════════════════════════════
  //  Engine sync
  // ════════════════════════════════════════════════════════════════════
  function buildEngine() {
    const eng = E();
    eng.ensureContext();
    eng.setBpm(project.bpm);
    eng.setSteps(totalSteps());
    eng.setMasterVolume(project.masterVol);
    eng.setMultibandEnabled(project.multiband);
    // FX buses first (tracks send to them)
    project.tracks.filter(t => t.type === 'fx').forEach(t => {
      eng.createBus(t.id);
      eng.setBusFx(t.id, { distDrive: t.busFx.distDrive, delayTime: t.busFx.delayTime, delayFb: t.busFx.delayFb, delayMix: t.busFx.delayMix, volume: t.vol, pan: t.pan });
      eng.setBusMute(t.id, t.mute);
    });
    project.tracks.filter(t => t.type === 'inst').forEach(t => {
      eng.createTrack(t.id, t.instrumentId);
      applyTrackToEngine(t);
    });
    eng.setStepProvider(stepProvider);
    eng.setAutomationProvider(automationProvider);
    eng.setOnStep(onStep);
    eng.setMidiHandler(onMidiNote);
  }

  function applyTrackToEngine(t) {
    const eng = E();
    eng.setInstrument(t.id, t.instrumentId);
    eng.setVolume(t.id, t.vol);
    eng.setPan(t.id, t.pan);
    eng.setMute(t.id, t.mute);
    eng.setSolo(t.id, t.solo);
    eng.setTune(t.id, t.tune);
    eng.setEQ(t.id, 'low', t.eq.low); eng.setEQ(t.id, 'loMid', t.eq.loMid);
    eng.setEQ(t.id, 'hiMid', t.eq.hiMid); eng.setEQ(t.id, 'high', t.eq.high);
    eng.setComp(t.id, t.comp);
    eng.setDistortion(t.id, t.dist.drive);
    eng.setDelay(t.id, t.delay);
    eng.setSidechain(t.id, t.sidechain.source, t.sidechain.amount);
    Object.keys(t.sends).forEach(busId => eng.setSend(t.id, busId, t.sends[busId]));
    if (t.synth) Object.keys(t.synth).forEach(k => eng.setSynthParam(t.id, k, t.synth[k]));
  }

  function stepProvider() {
    const out = {};
    const spb = STEPS_PER_BAR, n = totalSteps();
    project.tracks.forEach(t => {
      if (t.type !== 'inst') return;
      const inst = E().instrumentType(t.instrumentId);
      if (inst === 'drum') {
        out[t.id] = t.steps.map(v => v ? { vel: 110 } : null);
      } else {
        const row = new Array(n).fill(null);
        t.notes.forEach(no => {
          if (no.start < n) {
            const cell = { midi: no.midi, vel: no.vel || 100, dur: (no.len || 1) * (60 / project.bpm) / 4 };
            if (row[no.start]) { if (Array.isArray(row[no.start])) row[no.start].push(cell); else row[no.start] = [row[no.start], cell]; }
            else row[no.start] = cell;
          }
        });
        out[t.id] = row;
      }
    });
    return out;
  }

  function automationProvider() {
    const out = {};
    project.tracks.forEach(t => {
      const keys = Object.keys(t.automation);
      if (keys.length) { out[t.id] = {}; keys.forEach(k => out[t.id][k] = t.automation[k]); }
    });
    return out;
  }

  function onStep(step) {
    playStep = step;
  }
  function onMidiNote(note, vel, isOn) {
    const tid = armedTrack || selectedTrack; if (!tid) return;
    if (isOn) { E().noteOn(tid, note, vel); flashKey(note, true); if (recording) recordNote(tid, note, vel); }
    else { E().noteOff(tid, note); flashKey(note, false); }
  }

  // ════════════════════════════════════════════════════════════════════
  //  Render — paywall gate + shell
  // ════════════════════════════════════════════════════════════════════
  function render() {
    const current = Auth.current();
    const app = document.getElementById('app');
    if (!current) {
      app.innerHTML = lockedHero('Logg inn for å bruke SoundCore Studio', true);
      return;
    }
    // Lansering: gratis for ALLE innloggede brukere i 14 dager (se App.studioFree),
    // deretter låst bak Pro. Pro-brukere har alltid tilgang.
    const trial   = (window.App && App.studioFree) ? App.studioFree() : { free: false, daysLeft: 0 };
    const onTrial = current.subscription !== 'pro' && trial.free;
    if (current.subscription !== 'pro' && !trial.free) {
      app.innerHTML = lockedHero('SoundCore Studio er en Pro-funksjon', false);
      return;
    }
    if (!project) newProject();
    app.innerHTML = shell();
    if (onTrial) {
      const dl = `${trial.daysLeft} ${trial.daysLeft === 1 ? 'dag' : 'dager'}`;
      app.insertAdjacentHTML('afterbegin',
        `<div class="daw-trial-banner">🎉 Gratis i lanseringen — ${dl} igjen. <a href="#/shop">Lås opp permanent →</a></div>`);
    }
    buildEngine();
    renderAll();
    initMidiUI();
    bindKeyboard();
  }

  function lockedHero(msg, needLogin) {
    const current = Auth.current();
    return `
      <div class="daw-locked">
        <div class="daw-locked-card">
          <div class="daw-locked-icon">${Icon('lock', { size: '2.4rem' })}</div>
          <h1>${Icon('sliders')} SoundCore Studio</h1>
          <p class="daw-locked-sub">Et komplett digitalt musikkstudio i nettleseren — analoge synther,
             trommer, congas, opptak, MIDI, effekter og WAV-eksport.</p>
          <p class="daw-locked-msg">${msg}</p>
          ${needLogin
            ? `<button class="btn btn-primary btn-lg" onclick="Router.go('/login')">${Icon('user')} Logg inn</button>`
            : `<button class="btn btn-primary btn-lg" onclick="Router.go('/shop')">${Icon('store')} Lås opp i Shop</button>`}
          <div class="daw-locked-feats">
            ${['Fler-spors mikser','Analoge synther','Trommer & congas','MIDI-piano','Eksternt lydkort','Echo · distortion · sidechain','Multibånd-kompressor','Render til WAV'].map(f => `<span class="badge badge-purple">${Icon('check')} ${f}</span>`).join('')}
          </div>
        </div>
      </div>`;
  }

  async function upgrade() {
    const current = Auth.current();
    if (!current) { Router.go('/login'); return; }
    try { await Payment.startCheckout(current.username); } catch {}
  }

  function shell() {
    return `
      <div class="daw">
        <div class="daw-topbar" id="daw-topbar"></div>
        <div class="daw-main">
          <div class="daw-arrange" id="daw-arrange"></div>
          <div class="daw-bottom" id="daw-bottom"></div>
        </div>
        <div class="daw-devices" id="daw-devices"></div>
      </div>`;
  }

  function renderAll() {
    renderTopbar();
    renderArrange();
    renderBottom();
    renderDevices();
    window.Icons && window.Icons.hydrate(document.getElementById('app'));
  }

  // ════════════════════════════════════════════════════════════════════
  //  Topbar (transport + toolbar)
  // ════════════════════════════════════════════════════════════════════
  function renderTopbar() {
    const el = document.getElementById('daw-topbar'); if (!el) return;
    const playing = E().isPlaying();
    el.innerHTML = `
      <div class="daw-transport">
        <button class="daw-tbtn ${playing ? 'on' : ''}" title="Spill av" onclick="DAW.play()">${Icon('play')}</button>
        <button class="daw-tbtn" title="Stopp" onclick="DAW.stop()">${Icon('square')}</button>
        <button class="daw-tbtn ${recording ? 'rec' : ''}" title="Ta opp" onclick="DAW.toggleRecord()">${Icon('circle-dot')}</button>
        <span class="daw-sep"></span>
        <button class="daw-tbtn ${E().transport.metronome ? 'on' : ''}" title="Metronom" onclick="DAW.toggleMetro()">${Icon('clock')}</button>
        <div class="daw-field"><label>BPM</label>
          <input type="number" min="40" max="240" value="${project.bpm}" onchange="DAW.setBpm(this.value)"></div>
        <div class="daw-field"><label>Takt</label><span class="daw-tag">${project.timeSig}</span></div>
        <div class="daw-field"><label>Takter</label>
          <input type="number" min="1" max="16" value="${project.bars}" onchange="DAW.setBars(this.value)"></div>
      </div>
      <div class="daw-toolbar">
        <button class="daw-toolbtn" title="Klipp (markerte noter)" onclick="DAW.cut()">${Icon('trash')} Klipp</button>
        <button class="daw-toolbtn" title="Kopier" onclick="DAW.copy()">${Icon('copy')} Kopier</button>
        <button class="daw-toolbtn" title="Lim inn" onclick="DAW.paste()">${Icon('clipboard')} Lim inn</button>
        <button class="daw-toolbtn" title="Slett" onclick="DAW.deleteSel()">${Icon('x')} Slett</button>
        <span class="daw-sep"></span>
        <button class="daw-toolbtn" onclick="DAW.addTrackUI()">${Icon('plus')} Spor</button>
        <button class="daw-toolbtn" onclick="DAW.addFxTrack()">${Icon('zap')} FX-spor</button>
        <button class="daw-toolbtn" onclick="DAW.openSynthBox()" title="Åpne synth-boks">${Icon('waveform')} Synth</button>
        <button class="daw-toolbtn" onclick="DAW.openDrumBox()" title="Åpne trommemaskin">${Icon('drum')} Trommemaskin</button>
        <span class="daw-sep"></span>
        <button class="daw-toolbtn" onclick="DAW.saveProject()">${Icon('save')} Lagre</button>
        <button class="daw-toolbtn" onclick="DAW.openProjects()">${Icon('folder')} Åpne</button>
        <button class="daw-toolbtn" onclick="DAW.renderWav()" title="Render til WAV">${Icon('download')} Render WAV</button>
        <button class="daw-toolbtn" onclick="DAW.openWindow()" title="Åpne i nytt vindu">${Icon('arrow-up-right')} Nytt vindu</button>
      </div>`;
  }

  // ════════════════════════════════════════════════════════════════════
  //  Transport actions
  // ════════════════════════════════════════════════════════════════════
  function play() { E().ensureContext(); E().play(); startPlayhead(); renderTopbar(); window.Icons.hydrate(document.getElementById('daw-topbar')); }
  function stop() { E().stop(); playStep = -1; stopPlayhead(); paintPlayhead(); renderTopbar(); window.Icons.hydrate(document.getElementById('daw-topbar')); }
  function toggleMetro() { E().setMetronome(!E().transport.metronome); renderTopbar(); window.Icons.hydrate(document.getElementById('daw-topbar')); }
  function setBpm(v) { project.bpm = Math.max(40, Math.min(240, +v || 120)); E().setBpm(project.bpm); }
  function setBars(v) {
    const n = Math.max(1, Math.min(16, +v || 2)); project.bars = n;
    const len = totalSteps();
    project.tracks.forEach(t => {
      if (t.steps.length < len) t.steps = t.steps.concat(new Array(len - t.steps.length).fill(0));
      else t.steps = t.steps.slice(0, len);
      Object.keys(t.automation).forEach(k => {
        const a = t.automation[k];
        if (a.length < len) t.automation[k] = a.concat(new Array(len - a.length).fill(a[a.length - 1] ?? 0));
        else t.automation[k] = a.slice(0, len);
      });
      t.notes = t.notes.filter(no => no.start < len);
    });
    E().setSteps(len);
    renderArrange();
  }

  async function toggleRecord() {
    if (!recording) {
      recording = true;
      E().startRecording();
      if (!E().isPlaying()) play();
      App.toast('Opptak startet — spilles inn til WAV', 'info');
    } else {
      recording = false;
      const blob = await E().stopRecording();
      if (blob) offerDownload(blob, `soundcore-${Date.now()}.wav`, true);
    }
    renderTopbar(); window.Icons.hydrate(document.getElementById('daw-topbar'));
  }

  // ════════════════════════════════════════════════════════════════════
  //  Playhead
  // ════════════════════════════════════════════════════════════════════
  function startPlayhead() { if (rafId) return; const loop = () => { paintPlayhead(); rafId = requestAnimationFrame(loop); }; rafId = requestAnimationFrame(loop); }
  function stopPlayhead() { if (rafId) cancelAnimationFrame(rafId); rafId = null; }
  function paintPlayhead() {
    document.querySelectorAll('.daw-step.playing').forEach(e => e.classList.remove('playing'));
    if (playStep < 0) return;
    document.querySelectorAll(`.daw-step[data-step="${playStep}"]`).forEach(e => e.classList.add('playing'));
    const ph = document.getElementById('daw-pr-playhead');
    if (ph) ph.style.left = (42 + playStep * 26) + 'px';
  }

  // ════════════════════════════════════════════════════════════════════
  //  Arrange view (track rows + step lanes + automation lanes)
  // ════════════════════════════════════════════════════════════════════
  function renderArrange() {
    const el = document.getElementById('daw-arrange'); if (!el) return;
    el.innerHTML = `
      <div class="daw-ruler">${rulerCells()}</div>
      <div class="daw-tracks">${project.tracks.map(trackRow).join('')}</div>`;
    window.Icons && window.Icons.hydrate(el);
    attachAutomationHandlers();
  }

  function rulerCells() {
    let s = '<div class="daw-track-head daw-ruler-head"></div><div class="daw-ruler-cells">';
    for (let b = 0; b < project.bars; b++) s += `<div class="daw-bar-mark" style="width:${STEPS_PER_BAR * 24}px">${b + 1}</div>`;
    return s + '</div>';
  }

  function trackRow(t) {
    const sel = t.id === selectedTrack ? 'sel' : '';
    const isFx = t.type === 'fx';
    const isDrum = !isFx && E().instrumentType(t.instrumentId) === 'drum';
    return `
      <div class="daw-track ${sel}" data-track="${t.id}">
        <div class="daw-track-head" onclick="DAW.selectTrack('${t.id}')">
          <div class="daw-track-top">
            <span class="daw-track-icon">${Icon(isFx ? 'zap' : (E().INSTRUMENTS[t.instrumentId]?.icon || 'music'))}</span>
            <input class="daw-track-name" value="${esc(t.name)}" onclick="event.stopPropagation()" onchange="DAW.renameTrack('${t.id}',this.value)">
            ${isFx ? '' : `<button class="daw-mini" title="Åpne instrument-boks" onclick="event.stopPropagation();DAW.openDevice('${t.id}')">${Icon('piano')}</button>`}
            <button class="daw-mini ${t.mute ? 'on-m' : ''}" title="Mute" onclick="event.stopPropagation();DAW.toggleMute('${t.id}')">M</button>
            <button class="daw-mini ${t.solo ? 'on-s' : ''}" title="Solo" onclick="event.stopPropagation();DAW.toggleSolo('${t.id}')">S</button>
            <button class="daw-mini" title="Slett spor" onclick="event.stopPropagation();DAW.deleteTrack('${t.id}')">${Icon('trash')}</button>
          </div>
          <div class="daw-track-ctrls">
            ${isFx ? `<span class="daw-fx-label">FX-buss</span>` : `
            <select class="daw-inst-sel" onclick="event.stopPropagation()" onchange="DAW.setInstrument('${t.id}',this.value)">
              ${instOptions(t.instrumentId)}
            </select>`}
          </div>
          <div class="daw-track-faders">
            <span title="Volum">${Icon('volume')}</span>
            <input type="range" min="0" max="1" step="0.01" value="${t.vol}" onclick="event.stopPropagation()" oninput="DAW.setVol('${t.id}',this.value)">
            <span title="Panorering" class="daw-pan-l">L</span>
            <input type="range" min="-1" max="1" step="0.02" value="${t.pan}" class="daw-pan" onclick="event.stopPropagation()" oninput="DAW.setPan('${t.id}',this.value)">
            <span class="daw-pan-r">R</span>
          </div>
          <div class="daw-track-auto">
            <button class="daw-mini2 ${t.autoLane === 'volume' ? 'on' : ''}" onclick="event.stopPropagation();DAW.toggleAuto('${t.id}','volume')" title="Automasjon: volum">${Icon('gauge')} Vol</button>
            <button class="daw-mini2 ${t.autoLane === 'pan' ? 'on' : ''}" onclick="event.stopPropagation();DAW.toggleAuto('${t.id}','pan')" title="Automasjon: pan">Pan</button>
            ${sendAutoButtons(t)}
          </div>
        </div>
        <div class="daw-lane-wrap">
          ${isFx ? `<div class="daw-fx-lane">Effekt-retur — ruter inn fra spor-sends. Rediger effekter i Mikser ▸</div>`
                 : `<div class="daw-lane">${laneCells(t, isDrum)}</div>`}
          ${t.autoLane ? automationLane(t) : ''}
        </div>
      </div>`;
  }

  function laneCells(t, isDrum) {
    const n = totalSteps(); let html = '';
    const noteStarts = new Set();
    if (!isDrum) t.notes.forEach(no => noteStarts.add(no.start));
    for (let i = 0; i < n; i++) {
      const on = isDrum ? !!t.steps[i] : noteStarts.has(i);
      const barEdge = i % STEPS_PER_BAR === 0 ? 'bar' : (i % 4 === 0 ? 'beat' : '');
      html += `<div class="daw-step ${on ? 'on' : ''} ${barEdge}" data-step="${i}" onclick="DAW.toggleStep('${t.id}',${i})"></div>`;
    }
    return html;
  }

  function automationLane(t) {
    const param = t.autoLane;
    ensureAuto(t, param);
    const n = totalSteps(), arr = t.automation[param];
    const rng = autoRange(param);
    let bars = '';
    for (let i = 0; i < n; i++) {
      const v = arr[i] != null ? arr[i] : rng.def;
      const h = Math.round(((v - rng.min) / (rng.max - rng.min)) * 100);
      bars += `<div class="daw-auto-cell" data-step="${i}"><div class="daw-auto-fill" style="height:${h}%"></div></div>`;
    }
    return `<div class="daw-autolane" data-track="${t.id}" data-param="${param}">
              <span class="daw-autolabel">${autoLabel(param)}</span>
              <div class="daw-auto-cells">${bars}</div>
            </div>`;
  }

  function autoRange(param) {
    if (param === 'pan') return { min: -1, max: 1, def: 0 };
    return { min: 0, max: 1, def: 0.8 }; // volume & sends
  }
  function autoLabel(param) {
    if (param === 'volume') return 'Volum';
    if (param === 'pan') return 'Pan';
    if (param.indexOf('send:') === 0) { const b = project.tracks.find(x => x.id === param.slice(5)); return 'Send→' + (b ? b.name : 'FX'); }
    return param;
  }
  function sendAutoButtons(t) {
    if (t.type === 'fx') return '';
    return project.tracks.filter(x => x.type === 'fx').map(b => {
      const key = 'send:' + b.id;
      return `<button class="daw-mini2 ${t.autoLane === key ? 'on' : ''}" onclick="event.stopPropagation();DAW.toggleAuto('${t.id}','${key}')" title="Automasjon: send til ${esc(b.name)}">${Icon('zap')}</button>`;
    }).join('');
  }

  function ensureAuto(t, param) {
    const n = totalSteps();
    if (!t.automation[param]) {
      const def = param === 'pan' ? t.pan : param.indexOf('send:') === 0 ? (t.sends[param.slice(5)] || 0) : t.vol;
      t.automation[param] = new Array(n).fill(def);
    } else if (t.automation[param].length !== n) {
      const a = t.automation[param];
      t.automation[param] = a.length < n ? a.concat(new Array(n - a.length).fill(a[a.length - 1] ?? 0)) : a.slice(0, n);
    }
  }

  function toggleAuto(trackId, param) {
    const t = track(trackId); if (!t) return;
    if (t.autoLane === param) { t.autoLane = null; delete t.automation[param]; applyStaticParam(t, param); }
    else { t.autoLane = param; ensureAuto(t, param); }
    renderArrange();
  }
  function applyStaticParam(t, param) {
    if (param === 'volume') E().setVolume(t.id, t.vol);
    else if (param === 'pan') E().setPan(t.id, t.pan);
    else if (param.indexOf('send:') === 0) E().setSend(t.id, param.slice(5), t.sends[param.slice(5)] || 0);
  }

  // draw automation by click/drag (window listeners bound once)
  let autoLaneEl = null, autoDrawing = false, autoBound = false;
  function attachAutomationHandlers() {
    document.querySelectorAll('.daw-autolane').forEach(lane => {
      const cells = lane.querySelector('.daw-auto-cells');
      cells.addEventListener('mousedown', e => { autoDrawing = true; autoLaneEl = lane; applyAuto(lane, e.clientX, e.clientY); e.preventDefault(); });
    });
    if (autoBound) return; autoBound = true;
    window.addEventListener('mousemove', e => { if (autoDrawing && autoLaneEl) applyAuto(autoLaneEl, e.clientX, e.clientY); });
    window.addEventListener('mouseup', () => { autoDrawing = false; });
  }
  function applyAuto(lane, clientX, clientY) {
    const cells = lane.querySelector('.daw-auto-cells'); if (!cells) return;
    const rect = cells.getBoundingClientRect();
    let step = Math.floor((clientX - rect.left) / (rect.width / totalSteps()));
    step = Math.max(0, Math.min(totalSteps() - 1, step));
    let frac = Math.max(0, Math.min(1, 1 - (clientY - rect.top) / rect.height));
    const rng = autoRange(lane.dataset.param);
    setAutoValue(lane.dataset.track, lane.dataset.param, step, rng.min + frac * (rng.max - rng.min));
    const cell = cells.children[step];
    if (cell) cell.querySelector('.daw-auto-fill').style.height = Math.round(frac * 100) + '%';
  }
  function setAutoValue(trackId, param, step, val) {
    const t = track(trackId); if (!t || !t.automation[param]) return;
    t.automation[param][step] = val;
  }

  // ════════════════════════════════════════════════════════════════════
  //  Track CRUD + per-track setters
  // ════════════════════════════════════════════════════════════════════
  function addTrack(instrumentId, name) {
    const t = newTrack(instrumentId, name, 'inst');
    project.tracks.push(t);
    if (E().ctx) { E().createTrack(t.id, t.instrumentId); applyTrackToEngine(t); }
    return t;
  }
  function addTrackUI() {
    const t = addTrack('synthLead', 'Synth ' + (project.tracks.filter(x => x.type === 'inst').length));
    selectedTrack = t.id;
    renderAll();
  }
  function addFxTrack() {
    const t = newTrack(null, 'FX ' + (project.tracks.filter(x => x.type === 'fx').length + 1), 'fx');
    project.tracks.push(t);
    if (E().ctx) { E().createBus(t.id); E().setBusFx(t.id, { distDrive: t.busFx.distDrive, delayTime: t.busFx.delayTime, delayFb: t.busFx.delayFb, delayMix: t.busFx.delayMix, volume: t.vol, pan: t.pan }); }
    selectedTrack = t.id;
    renderAll();
  }
  function deleteTrack(id) {
    const t = track(id); if (!t) return;
    if (t.type === 'fx') E().removeBus(id); else E().removeTrack(id);
    project.tracks = project.tracks.filter(x => x.id !== id);
    if (selectedTrack === id) selectedTrack = project.tracks[0] ? project.tracks[0].id : null;
    renderAll();
  }
  function selectTrack(id) { selectedTrack = id; armedTrack = id; renderArrange(); renderBottom(); window.Icons.hydrate(document.getElementById('daw-bottom')); }
  function renameTrack(id, v) { const t = track(id); if (t) t.name = v; }
  function setInstrument(id, instId) {
    const t = track(id); if (!t) return;
    t.instrumentId = instId; t.synth = E().defaultSynth(instId);
    E().setInstrument(id, instId);
    Object.keys(t.synth).forEach(k => E().setSynthParam(id, k, t.synth[k]));
    renderArrange(); renderBottom(); renderDevices(); window.Icons.hydrate(document.getElementById('daw-bottom'));
  }
  function setSynth(id, key, val) {
    const t = track(id); if (!t || !t.synth) return;
    t.synth[key] = key === 'wave' ? val : +val;
    E().setSynthParam(id, key, t.synth[key]);
  }
  function setVol(id, v) { const t = track(id); if (!t) return; t.vol = +v; if (t.type === 'fx') E().setBusFx(id, { volume: +v }); else E().setVolume(id, +v); }
  function setPan(id, v) { const t = track(id); if (!t) return; t.pan = +v; if (t.type === 'fx') E().setBusFx(id, { pan: +v }); else E().setPan(id, +v); }
  function toggleMute(id) { const t = track(id); if (!t) return; t.mute = !t.mute; if (t.type === 'fx') E().setBusMute(id, t.mute); else E().setMute(id, t.mute); renderArrange(); window.Icons.hydrate(document.getElementById('daw-arrange')); }
  function toggleSolo(id) { const t = track(id); if (!t) return; t.solo = !t.solo; E().setSolo(id, t.solo); renderArrange(); window.Icons.hydrate(document.getElementById('daw-arrange')); }
  function setTune(id, semis) { const t = track(id); if (!t) return; t.tune = +semis; E().setTune(id, +semis); }

  function toggleStep(trackId, step) {
    const t = track(trackId); if (!t || t.type === 'fx') return;
    if (E().instrumentType(t.instrumentId) === 'drum') {
      t.steps[step] = t.steps[step] ? 0 : 1;
      if (t.steps[step] && !E().isPlaying()) E().noteOn(trackId, 60, 110);
    } else {
      const existing = t.notes.findIndex(no => no.start === step && no.midi === t.defaultPitch);
      if (existing >= 0) t.notes.splice(existing, 1);
      else { t.notes.push({ start: step, len: 1, midi: t.defaultPitch, vel: 100 }); if (!E().isPlaying()) E().noteOn(trackId, t.defaultPitch, 100); }
    }
    renderArrange();
    if (bottomTab === 'roll') renderBottom();
  }

  // ════════════════════════════════════════════════════════════════════
  //  Bottom panel (tabs: piano-roll / mixer / master / input) + keyboard
  // ════════════════════════════════════════════════════════════════════
  let bottomTab = 'mixer';
  let bottomOpen = true;
  let bottomHeight = 320;
  function renderBottom() {
    const el = document.getElementById('daw-bottom'); if (!el) return;
    const tabs = [['roll', 'Piano-rull', 'piano'], ['mixer', 'Mikser', 'sliders'], ['master', 'Master', 'gauge'], ['input', 'MIDI & Lydkort', 'mic']];
    const armed = armedTrack ? track(armedTrack) : null;
    const armedInst = armed && armed.type === 'inst' ? (E().INSTRUMENTS[armed.instrumentId]?.name || '') : '';
    el.innerHTML = `
      <div class="daw-resize" id="daw-resize" title="Dra opp/ned for å endre størrelse"></div>
      <div class="daw-tabs">
        <button class="daw-fane" onclick="DAW.toggleBottom()" title="${bottomOpen ? 'Lukk mikserpult' : 'Åpne mikserpult'}">
          ${Icon(bottomOpen ? 'chevron-down' : 'chevron-up')} Mikserpult</button>
        ${bottomOpen ? tabs.map(([k, l, ic]) => `<button class="daw-tab ${bottomTab === k ? 'on' : ''}" onclick="DAW.tab('${k}')">${Icon(ic)} ${l}</button>`).join('') : ''}
        <span class="daw-armed">${armed ? Icon('piano') + ' Piano spiller: <b>' + esc(armedInst || armed.name) + '</b> · ' + esc(armed.name) : 'Velg et spor for å spille'}</span>
        <button class="daw-icon-btn" onclick="DAW.toggleBottom()" title="${bottomOpen ? 'Minimer' : 'Maksimer'}">${Icon(bottomOpen ? 'minus' : 'plus')}</button>
      </div>
      ${bottomOpen ? `
        <div class="daw-panel" id="daw-panel">${panelContent()}</div>
        <div class="daw-keyboard" id="daw-keyboard">${keyboardHtml()}</div>` : ''}`;
    applyBottomLayout();
    window.Icons && window.Icons.hydrate(el);
    if (bottomOpen && bottomTab === 'roll') attachPianoRoll();
    attachResize();
  }
  function applyBottomLayout() {
    const el = document.getElementById('daw-bottom'); if (!el) return;
    el.classList.toggle('min', !bottomOpen);
    el.style.height = bottomOpen ? bottomHeight + 'px' : '';
  }
  function toggleBottom() { bottomOpen = !bottomOpen; renderBottom(); }
  // ════════════════════════════════════════════════════════════════════
  //  Standalone instrument boxes (synth / drum machine) — open/close/drag
  // ════════════════════════════════════════════════════════════════════
  function openDevice(trackId) {
    const t = track(trackId); if (!t || t.type === 'fx') return;
    const kind = E().instrumentType(t.instrumentId) === 'drum' ? 'drum' : 'synth';
    let d = devices.find(x => x.kind === kind);
    if (d) { d.target = trackId; }
    else { d = { id: 'dev_' + Math.random().toString(36).slice(2, 7), kind, target: trackId, x: 120 + devices.length * 36, y: 120 + devices.length * 36 }; devices.push(d); }
    selectedTrack = trackId; armedTrack = trackId;
    renderDevices(); renderArrange();
  }
  function openSynthBox() { const t = project.tracks.find(x => x.type === 'inst' && E().instrumentType(x.instrumentId) !== 'drum'); if (t) openDevice(t.id); else App.toast('Legg til et melodisk spor først', 'info'); }
  function openDrumBox() { const t = project.tracks.find(x => x.type === 'inst' && E().instrumentType(x.instrumentId) === 'drum'); if (t) openDevice(t.id); else App.toast('Legg til et tromme-/perkusjonsspor først', 'info'); }
  function closeDevice(id) { devices = devices.filter(d => d.id !== id); renderDevices(); }
  function deviceTarget(id, trackId) { const d = devices.find(x => x.id === id); if (!d) return; d.target = trackId; selectedTrack = trackId; armedTrack = trackId; renderDevices(); renderArrange(); }

  function renderDevices() {
    const layer = document.getElementById('daw-devices'); if (!layer) return;
    layer.innerHTML = devices.map(deviceBoxHtml).join('');
    window.Icons && window.Icons.hydrate(layer);
    attachDeviceDrag();
  }

  function deviceBoxHtml(d) {
    const t = track(d.target); if (!t) return '';
    const melodicTracks = project.tracks.filter(x => x.type === 'inst');
    const chanSel = `<select class="daw-sel daw-dev-chan" onchange="DAW.deviceTarget('${d.id}',this.value)" title="Rut boksen til en mikserkanal">
        ${melodicTracks.map(x => `<option value="${x.id}" ${x.id === d.target ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select>`;
    const body = d.kind === 'drum' ? drumBoxBody(t) : synthBoxBody(t);
    const showPiano = d.kind === 'synth';
    return `
      <div class="daw-dev" id="${d.id}" style="left:${d.x}px;top:${d.y}px">
        <div class="daw-dev-head" data-dev="${d.id}">
          <span class="daw-dev-title">${Icon(d.kind === 'drum' ? 'drum' : 'waveform')} ${d.kind === 'drum' ? 'Trommemaskin' : 'Synth'} <small>· ${esc(E().INSTRUMENTS[t.instrumentId]?.name || '')}</small></span>
          <span class="daw-dev-chanwrap">Kanal: ${chanSel}</span>
          <button class="daw-icon-btn" onclick="DAW.closeDevice('${d.id}')" title="Lukk">${Icon('x')}</button>
        </div>
        <div class="daw-dev-body">
          <div class="daw-dev-ctrls">${body}</div>
          ${showPiano ? `<div class="daw-dev-piano">${devicePianoHtml(t.id)}</div>` : ''}
        </div>
      </div>`;
  }

  function synthBoxBody(t) {
    const s = t.synth || E().defaultSynth(t.instrumentId);
    const waves = ['sawtooth', 'square', 'triangle', 'sine'];
    return `
      <div class="daw-dev-row">
        <label>Bølgeform</label>
        <div class="daw-wave-btns">${waves.map(w => `<button class="daw-wave ${s.wave === w ? 'on' : ''}" onclick="DAW.setSynth('${t.id}','wave','${w}');DAW.refreshDevices()" title="${w}">${waveIcon(w)}</button>`).join('')}</div>
      </div>
      ${devSlider('Filter cutoff', s.cutoff, 100, 8000, 10, t.id, 'cutoff', ' Hz')}
      ${devSlider('Resonans', s.res, 0.1, 24, 0.1, t.id, 'res', '')}
      ${devSlider('Attack', s.attack, 0, 2, 0.005, t.id, 'attack', ' s')}
      ${devSlider('Release', s.release, 0.02, 3, 0.01, t.id, 'release', ' s')}
      <div class="daw-dev-sub">2. oscillator · LFO</div>
      ${devSlider('Detune (osc-spredning)', s.detune != null ? s.detune : 6, 0, 30, 0.5, t.id, 'detune', ' c')}
      ${devSlider('Sub-oscillator', s.subLevel != null ? s.subLevel : 0, 0, 1, 0.01, t.id, 'subLevel', '')}
      ${devSlider('LFO-rate', s.lfoRate != null ? s.lfoRate : 0, 0, 8, 0.05, t.id, 'lfoRate', ' Hz')}
      ${devSlider('LFO-dybde (filter)', s.lfoDepth != null ? s.lfoDepth : 0, 0, 1, 0.01, t.id, 'lfoDepth', '')}
      <div class="daw-dev-row"><label>Volum</label><input type="range" min="0" max="1" step="0.01" value="${t.vol}" oninput="DAW.setVol('${t.id}',this.value)"></div>`;
  }

  function drumBoxBody(t) {
    const drums = E().instrumentList().filter(i => i.type === 'drum');
    const current = t.instrumentId;
    return `
      <p class="daw-hint">Velg trommelyd for kanalen, finstem og spill pads for å lytte.</p>
      <div class="daw-pads">
        ${drums.map(i => `<button class="daw-pad ${i.id === current ? 'on' : ''}" onclick="DAW.padPick('${t.id}','${i.id}')">${Icon(i.icon || 'circle')}<span>${esc(i.name)}</span></button>`).join('')}
      </div>
      ${devSlider('Stemming', t.tune, -12, 12, 1, t.id, 'tune', ' st')}
      <div class="daw-dev-row"><label>Volum</label><input type="range" min="0" max="1" step="0.01" value="${t.vol}" oninput="DAW.setVol('${t.id}',this.value)"></div>
      <button class="daw-toolbtn" onclick="DAW.padHit('${t.id}')">${Icon('circle-dot')} Spill lyd</button>`;
  }

  function devSlider(label, val, min, max, step, tid, key, unit) {
    const id = 'dv_' + Math.random().toString(36).slice(2, 7);
    const handler = key === 'tune' ? `DAW.setTune('${tid}',this.value)` : `DAW.setSynth('${tid}','${key}',this.value)`;
    return `<div class="daw-dev-row"><label>${label}<span id="${id}">${fmt(val)}${unit}</span></label>
      <input type="range" min="${min}" max="${max}" step="${step}" value="${val}"
        oninput="document.getElementById('${id}').textContent=(+this.value).toFixed(2)+'${unit}';(${handler})"></div>`;
  }

  function waveIcon(w) {
    const map = { sawtooth: 'M2 18 L8 6 V18 L14 6 V18 L20 6', square: 'M2 18 V6 H8 V18 H14 V6 H20', triangle: 'M2 18 L7 6 L12 18 L17 6 L20 12', sine: 'M2 12 Q5 4 8 12 T14 12 T20 12' };
    return `<svg viewBox="0 0 22 24" width="22" height="18" fill="none" stroke="currentColor" stroke-width="1.6"><path d="${map[w]}"/></svg>`;
  }

  function devicePianoHtml(trackId) {
    let html = '<div class="daw-dev-keys">';
    for (let m = 48; m <= 72; m++) {
      const black = [1, 3, 6, 8, 10].includes(m % 12);
      html += `<div class="daw-dev-key ${black ? 'black' : 'white'}" data-midi="${m}"
                 onmousedown="DAW.boxKey('${trackId}',${m},true)" onmouseup="DAW.boxKey('${trackId}',${m},false)" onmouseleave="DAW.boxKey('${trackId}',${m},false)"></div>`;
    }
    return html + '</div>';
  }

  function boxKey(trackId, midi, down) {
    armedTrack = trackId;
    if (down) { E().ensureContext(); E().noteOn(trackId, midi, 110); if (recording) recordNote(trackId, midi, 110); }
    else E().noteOff(trackId, midi);
  }
  function padPick(trackId, instId) { setInstrument(trackId, instId); E().noteOn(trackId, 60, 110); renderDevices(); }
  function padHit(trackId) { E().ensureContext(); E().noteOn(trackId, 60, 110); }
  function refreshDevices() { renderDevices(); }

  let devDragBound = false, devDrag = null;
  function attachDeviceDrag() {
    document.querySelectorAll('.daw-dev-head').forEach(head => {
      head.addEventListener('mousedown', e => {
        if (e.target.closest('select,button,input')) return;
        const d = devices.find(x => x.id === head.dataset.dev); if (!d) return;
        const box = document.getElementById(d.id), r = box.getBoundingClientRect();
        devDrag = { d, dx: e.clientX - r.left, dy: e.clientY - r.top };
        e.preventDefault();
      });
    });
    if (devDragBound) return; devDragBound = true;
    window.addEventListener('mousemove', e => {
      if (!devDrag) return;
      devDrag.d.x = Math.max(0, e.clientX - devDrag.dx);
      devDrag.d.y = Math.max(60, e.clientY - devDrag.dy);
      const box = document.getElementById(devDrag.d.id);
      if (box) { box.style.left = devDrag.d.x + 'px'; box.style.top = devDrag.d.y + 'px'; }
    });
    window.addEventListener('mouseup', () => { devDrag = null; });
  }

  let resizing = false, resizeBound = false;
  function attachResize() {
    const grip = document.getElementById('daw-resize'); if (!grip) return;
    grip.addEventListener('mousedown', e => { if (!bottomOpen) return; resizing = true; e.preventDefault(); document.body.style.userSelect = 'none'; });
    if (resizeBound) return; resizeBound = true;
    window.addEventListener('mousemove', e => {
      if (!resizing) return;
      bottomHeight = Math.max(140, Math.min(window.innerHeight - 160, window.innerHeight - e.clientY));
      const el = document.getElementById('daw-bottom'); if (el) el.style.height = bottomHeight + 'px';
    });
    window.addEventListener('mouseup', () => { if (resizing) { resizing = false; document.body.style.userSelect = ''; } });
  }
  function tab(k) { bottomTab = k; if (!bottomOpen) bottomOpen = true; renderBottom(); }

  function panelContent() {
    if (bottomTab === 'roll') return pianoRollHtml();
    if (bottomTab === 'mixer') return mixerHtml();
    if (bottomTab === 'master') return masterHtml();
    if (bottomTab === 'input') return inputHtml();
    return '';
  }

  // ── Piano roll ────────────────────────────────────────────────────────
  function pianoRollHtml() {
    const t = track(selectedTrack);
    if (!t || t.type === 'fx') return `<p class="daw-hint">Velg et instrument-spor for å redigere noter.</p>`;
    if (E().instrumentType(t.instrumentId) === 'drum')
      return `<p class="daw-hint">${esc(t.name)} er et tromme-/perkusjonsspor — bruk step-cellene i arrangementet. Bytt til et melodisk instrument for piano-rull.</p>`;
    const n = totalSteps(), cw = 26, rows = [];
    for (let m = MAX_MIDI; m >= MIN_MIDI; m--) rows.push(m);
    let grid = `<div class="daw-pr-playhead" id="daw-pr-playhead"></div>`;
    grid += rows.map(m => {
      const black = [1, 3, 6, 8, 10].includes(m % 12);
      let cells = '';
      for (let i = 0; i < n; i++) {
        const barEdge = i % STEPS_PER_BAR === 0 ? 'bar' : (i % 4 === 0 ? 'beat' : '');
        cells += `<div class="daw-pr-cell ${barEdge}" data-midi="${m}" data-step="${i}"></div>`;
      }
      return `<div class="daw-pr-row ${black ? 'black' : ''}"><div class="daw-pr-key ${black ? 'black' : ''}">${m % 12 === 0 ? 'C' + (Math.floor(m / 12) - 1) : ''}</div><div class="daw-pr-cells" style="width:${n * cw}px">${cells}</div></div>`;
    }).join('');
    const notes = t.notes.map((no, idx) => {
      const top = (MAX_MIDI - no.midi) * 18;
      return `<div class="daw-pr-note ${selection.has(idx) ? 'sel' : ''}" style="left:${no.start * cw}px;top:${top}px;width:${no.len * cw - 2}px" data-idx="${idx}" title="MIDI ${no.midi}"></div>`;
    }).join('');
    return `
      <div class="daw-pr-toolbar">
        <button class="daw-toolbtn ${pencilTool ? 'on' : ''}" onclick="DAW.setTool(true)" title="Malepensel — tegn noter">${Icon('edit')} Pensel</button>
        <button class="daw-toolbtn ${!pencilTool ? 'on' : ''}" onclick="DAW.setTool(false)" title="Markør — velg/flytt noter">${Icon('menu')} Markør</button>
        <span class="daw-sep"></span>
        <button class="daw-toolbtn" onclick="DAW.noteLen(1)">${Icon('plus')} Lengde</button>
        <button class="daw-toolbtn" onclick="DAW.noteLen(-1)">${Icon('minus')} Lengde</button>
        <button class="daw-toolbtn" onclick="DAW.selectAllNotes()">Marker alt</button>
        <span class="daw-hint">${pencilTool ? 'Klikk/dra for å tegne' : 'Klikk for å markere · shift for flere'} · dra note = flytt · dra høyre kant = lengde · dobbeltklikk = slett</span>
      </div>
      <div class="daw-pr-scroll"><div class="daw-pr-grid" style="position:relative">${grid}<div class="daw-pr-notes">${notes}</div></div></div>`;
  }

  function setTool(pencil) { pencilTool = !!pencil; renderBottom(); }
  function attachPianoRoll() {
    const t = track(selectedTrack); if (!t || t.type === 'fx' || E().instrumentType(t.instrumentId) === 'drum') return;
    const grid = document.querySelector('.daw-pr-grid'); if (!grid) return;
    let painting = false;
    const addAt = (midi, step, audition) => {
      if (t.notes.some(no => no.start === step && no.midi === midi)) return;
      t.notes.push({ start: step, len: 1, midi, vel: 100 });
      if (audition) E().noteOn(selectedTrack, midi, 100);
      paintNotes();
      renderArrange();
    };
    grid.querySelectorAll('.daw-pr-cell').forEach(cell => {
      const midi = +cell.dataset.midi, step = +cell.dataset.step;
      cell.addEventListener('mousedown', e => {
        if (!pencilTool) return; e.preventDefault(); painting = true; addAt(midi, step, true);
      });
      cell.addEventListener('mouseenter', () => { if (pencilTool && painting) addAt(midi, step, false); });
    });
    window.addEventListener('mouseup', () => { painting = false; }, { once: true });
    attachNoteHandlers();
    bindNoteDrag();
  }
  // lightweight repaint of note overlay without full re-render (keeps paint drag smooth)
  function paintNotes() {
    const t = track(selectedTrack); if (!t) return;
    const host = document.querySelector('.daw-pr-notes'); if (!host) return;
    const cw = 26;
    host.innerHTML = t.notes.map((no, idx) => {
      const top = (MAX_MIDI - no.midi) * 18;
      return `<div class="daw-pr-note ${selection.has(idx) ? 'sel' : ''}" style="left:${no.start * cw}px;top:${top}px;width:${no.len * cw - 2}px" data-idx="${idx}"></div>`;
    }).join('');
    attachNoteHandlers();
  }
  function paintNoteSel() {
    document.querySelectorAll('.daw-pr-note').forEach(el => el.classList.toggle('sel', selection.has(+el.dataset.idx)));
  }
  function attachNoteHandlers() {
    const t = track(selectedTrack); if (!t) return;
    const CW = 26, RH = 18;
    document.querySelectorAll('.daw-pr-note').forEach(noteEl => {
      noteEl.addEventListener('mousedown', e => {
        e.stopPropagation(); e.preventDefault();
        const idx = +noteEl.dataset.idx, no = t.notes[idx]; if (!no) return;
        if (e.shiftKey) { selection.has(idx) ? selection.delete(idx) : selection.add(idx); }
        else if (!selection.has(idx)) selection = new Set([idx]);
        const rect = noteEl.getBoundingClientRect();
        const mode = (e.clientX > rect.right - 8) ? 'resize' : 'move';
        noteDrag = { idx, mode, startX: e.clientX, startY: e.clientY, cw: CW, rh: RH, orig: { start: no.start, midi: no.midi, len: no.len }, moved: false };
        E().noteOn(selectedTrack, no.midi, no.vel); paintNoteSel();
      });
      noteEl.addEventListener('dblclick', e => { e.stopPropagation(); t.notes.splice(+noteEl.dataset.idx, 1); selection = new Set(); renderBottom(); renderArrange(); });
    });
  }
  let noteDrag = null, noteDragBound = false;
  function bindNoteDrag() {
    if (noteDragBound) return; noteDragBound = true;
    window.addEventListener('mousemove', e => {
      if (!noteDrag) return;
      const t = track(selectedTrack); if (!t) return; const no = t.notes[noteDrag.idx]; if (!no) return;
      const dStep = Math.round((e.clientX - noteDrag.startX) / noteDrag.cw);
      if (Math.abs(e.clientX - noteDrag.startX) > 3 || Math.abs(e.clientY - noteDrag.startY) > 3) noteDrag.moved = true;
      if (noteDrag.mode === 'resize') {
        no.len = Math.max(1, Math.min(totalSteps() - no.start, noteDrag.orig.len + dStep));
      } else {
        const dPitch = Math.round((noteDrag.startY - e.clientY) / noteDrag.rh);
        no.start = Math.max(0, Math.min(totalSteps() - no.len, noteDrag.orig.start + dStep));
        no.midi = Math.max(MIN_MIDI, Math.min(MAX_MIDI, noteDrag.orig.midi + dPitch));
      }
      paintNotes();
    });
    window.addEventListener('mouseup', () => { if (noteDrag) { const moved = noteDrag.moved; noteDrag = null; if (moved) renderArrange(); } });
  }
  function noteLen(d) {
    const t = track(selectedTrack); if (!t) return;
    selection.forEach(i => { if (t.notes[i]) t.notes[i].len = Math.max(1, Math.min(totalSteps(), t.notes[i].len + d)); });
    renderBottom();
  }
  function selectAllNotes() { const t = track(selectedTrack); if (!t) return; selection = new Set(t.notes.map((_, i) => i)); renderBottom(); }

  // clipboard / edit toolbar
  function copy() {
    const t = track(selectedTrack); if (!t || !selection.size) { App.toast('Marker noter først', 'info'); return; }
    clipboard = [...selection].map(i => ({ ...t.notes[i] }));
    App.toast(clipboard.length + ' note(r) kopiert', 'success');
  }
  function cut() { copy(); deleteSel(); }
  function deleteSel() {
    const t = track(selectedTrack); if (!t || !selection.size) return;
    t.notes = t.notes.filter((_, i) => !selection.has(i));
    selection = new Set(); renderBottom(); renderArrange();
  }
  function paste() {
    const t = track(selectedTrack); if (!t || !clipboard) { App.toast('Ingenting å lime inn', 'info'); return; }
    const at = playStep >= 0 ? playStep : 0;
    const minStart = Math.min(...clipboard.map(c => c.start));
    const added = clipboard.map(c => ({ ...c, start: Math.min(totalSteps() - 1, at + (c.start - minStart)) }));
    const base = t.notes.length;
    t.notes.push(...added);
    selection = new Set(added.map((_, i) => base + i));
    renderBottom(); renderArrange();
  }

  // ── Mixer (channel strip for selected track) ──────────────────────────
  function mixerHtml() {
    const t = track(selectedTrack);
    if (!t) return `<p class="daw-hint">Velg et spor.</p>`;
    if (t.type === 'fx') return busMixerHtml(t);
    const isDrum = E().instrumentType(t.instrumentId) === 'drum';
    return `
      <div class="daw-strip">
        <div class="daw-strip-col">
          <h4>${Icon('sliders')} EQ — ${esc(t.name)}</h4>
          ${eqSlider(t, 'low', 'Bass')}
          ${eqSlider(t, 'loMid', 'Lav-mid')}
          ${eqSlider(t, 'hiMid', 'Høy-mid')}
          ${eqSlider(t, 'high', 'Diskant')}
          ${isDrum ? sliderRow('Stemming', t.tune, -12, 12, 1, `DAW.setTune('${t.id}',this.value)`, 'semitoner') : ''}
        </div>
        <div class="daw-strip-col">
          <h4>${Icon('gauge')} Kompressor</h4>
          ${sliderRow('Terskel', t.comp.threshold, -60, 0, 1, `DAW.setComp('${t.id}','threshold',this.value)`, 'dB')}
          ${sliderRow('Ratio', t.comp.ratio, 1, 20, 0.5, `DAW.setComp('${t.id}','ratio',this.value)`, ':1')}
          ${sliderRow('Attack', t.comp.attack, 0, 0.1, 0.001, `DAW.setComp('${t.id}','attack',this.value)`, 's')}
          ${sliderRow('Release', t.comp.release, 0.02, 1, 0.01, `DAW.setComp('${t.id}','release',this.value)`, 's')}
        </div>
        <div class="daw-strip-col">
          <h4>${Icon('flame')} Distortion</h4>
          ${sliderRow('Drive', t.dist.drive, 0, 100, 1, `DAW.setDist('${t.id}',this.value)`, '')}
          <h4 style="margin-top:.8rem">${Icon('waves')} Echo / Delay</h4>
          ${sliderRow('Tid', t.delay.time, 0.02, 1.2, 0.01, `DAW.setDelay('${t.id}','time',this.value)`, 's')}
          ${sliderRow('Feedback', t.delay.fb, 0, 0.9, 0.01, `DAW.setDelay('${t.id}','feedback',this.value)`, '')}
          ${sliderRow('Mix', t.delay.mix, 0, 1, 0.01, `DAW.setDelay('${t.id}','mix',this.value)`, '')}
        </div>
        <div class="daw-strip-col">
          <h4>${Icon('volume')} Kanal</h4>
          ${sliderRow('Volum', t.vol, 0, 1, 0.01, `DAW.setVol('${t.id}',this.value)`, '')}
          ${sliderRow('Pan', t.pan, -1, 1, 0.02, `DAW.setPan('${t.id}',this.value)`, '')}
          <h4 style="margin-top:.8rem">${Icon('zap')} Sidechain</h4>
          <select class="daw-sel" onchange="DAW.setSidechainSrc('${t.id}',this.value)">
            <option value="none">— ingen —</option>
            ${project.tracks.filter(x => x.id !== t.id && x.type === 'inst').map(x => `<option value="${x.id}" ${t.sidechain.source === x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}
          </select>
          ${sliderRow('Mengde', t.sidechain.amount, 0, 1, 0.01, `DAW.setSidechainAmt('${t.id}',this.value)`, '')}
          ${sendsHtml(t)}
        </div>
      </div>`;
  }

  function busMixerHtml(t) {
    return `
      <div class="daw-strip">
        <div class="daw-strip-col">
          <h4>${Icon('zap')} ${esc(t.name)} — FX-buss</h4>
          <p class="daw-hint">Spor sender hit via «Send» i mikseren deres.</p>
          ${sliderRow('Volum', t.vol, 0, 1.2, 0.01, `DAW.setVol('${t.id}',this.value)`, '')}
          ${sliderRow('Pan', t.pan, -1, 1, 0.02, `DAW.setPan('${t.id}',this.value)`, '')}
        </div>
        <div class="daw-strip-col">
          <h4>${Icon('flame')} Distortion</h4>
          ${sliderRow('Drive', t.busFx.distDrive, 0, 100, 1, `DAW.setBusFx('${t.id}','distDrive',this.value)`, '')}
        </div>
        <div class="daw-strip-col">
          <h4>${Icon('waves')} Echo / Delay</h4>
          ${sliderRow('Tid', t.busFx.delayTime, 0.02, 1.5, 0.01, `DAW.setBusFx('${t.id}','delayTime',this.value)`, 's')}
          ${sliderRow('Feedback', t.busFx.delayFb, 0, 0.9, 0.01, `DAW.setBusFx('${t.id}','delayFb',this.value)`, '')}
          ${sliderRow('Mix', t.busFx.delayMix, 0, 1, 0.01, `DAW.setBusFx('${t.id}','delayMix',this.value)`, '')}
        </div>
        <div class="daw-strip-col">
          <h4>${Icon('droplet')} Reverb</h4>
          <p class="daw-hint">Ekte foldnings-reverb (convolution).</p>
          ${sliderRow('Mix', t.busFx.reverbMix != null ? t.busFx.reverbMix : 0.35, 0, 1, 0.01, `DAW.setBusFx('${t.id}','reverbMix',this.value)`, '')}
          ${sliderRow('Romstørrelse', t.busFx.reverbSize != null ? t.busFx.reverbSize : 2.2, 0.2, 5, 0.1, `DAW.setBusFx('${t.id}','reverbSize',this.value)`, 's')}
        </div>
      </div>`;
  }

  function sendsHtml(t) {
    const buses = project.tracks.filter(x => x.type === 'fx');
    if (!buses.length) return `<p class="daw-hint" style="margin-top:.6rem">Legg til et FX-spor for å bruke sends.</p>`;
    return `<h4 style="margin-top:.8rem">${Icon('share')} Sends</h4>` + buses.map(b =>
      sliderRow(b.name, t.sends[b.id] || 0, 0, 1, 0.01, `DAW.setSend('${t.id}','${b.id}',this.value)`, '')).join('');
  }

  function eqSlider(t, band, label) { return sliderRow(label, t.eq[band], -18, 18, 0.5, `DAW.setEQ('${t.id}','${band}',this.value)`, 'dB'); }

  // ── Master ────────────────────────────────────────────────────────────
  function masterHtml() {
    return `
      <div class="daw-strip">
        <div class="daw-strip-col">
          <h4>${Icon('gauge')} Master</h4>
          ${sliderRow('Master-volum', project.masterVol, 0, 1, 0.01, `DAW.setMasterVol(this.value)`, '')}
          <label class="daw-check"><input type="checkbox" ${project.multiband ? 'checked' : ''} onchange="DAW.setMultiband(this.checked)"> Multibånd-kompressor på master</label>
        </div>
        <div class="daw-strip-col">
          <h4>${Icon('sliders')} Multibånd-kompressor</h4>
          <p class="daw-hint">3 bånd (lav / mid / høy). Terskel per bånd:</p>
          ${sliderRow('Lav terskel', -24, -60, 0, 1, `DAW.setBand('low',this.value)`, 'dB')}
          ${sliderRow('Mid terskel', -22, -60, 0, 1, `DAW.setBand('mid',this.value)`, 'dB')}
          ${sliderRow('Høy terskel', -20, -60, 0, 1, `DAW.setBand('high',this.value)`, 'dB')}
        </div>
      </div>`;
  }

  // ── Input (MIDI + sound card) ─────────────────────────────────────────
  function inputHtml() {
    return `
      <div class="daw-strip">
        <div class="daw-strip-col">
          <h4>${Icon('piano')} MIDI-piano</h4>
          <div id="daw-midi-status" class="daw-hint">Sjekker MIDI…</div>
          <select class="daw-sel" id="daw-midi-list"></select>
          <button class="daw-toolbtn" onclick="DAW.refreshMidi()">${Icon('rotate-cw')} Oppdater</button>
          <p class="daw-hint">Web MIDI virker i Chrome/Edge/Opera. I Safari/Firefox: bruk skjerm-tastaturet eller PC-tastene (A–K = hvite, W,E,T,Y,U = svarte).</p>
        </div>
        <div class="daw-strip-col">
          <h4>${Icon('mic')} Eksternt lydkort (inngang)</h4>
          <select class="daw-sel" id="daw-input-list"><option>Klikk «Gi tilgang»</option></select>
          <div style="display:flex;gap:.4rem;flex-wrap:wrap;margin-top:.4rem">
            <button class="daw-toolbtn" onclick="DAW.grantInput()">${Icon('check')} Gi tilgang</button>
            <button class="daw-toolbtn" onclick="DAW.connectInput()">${Icon('link')} Koble til valgt spor</button>
            <button class="daw-toolbtn" onclick="DAW.disconnectInput()">${Icon('x')} Koble fra</button>
          </div>
          <p class="daw-hint">Inngangen rutes inn i det valgte sporet (med EQ/komp/effekter) og tas med i WAV-opptak.
             Nettleseren gir standard stereo-inngang — ikke fler-kanals ASIO/lav-latens som i et desktop-DAW.</p>
        </div>
      </div>`;
  }

  // ════════════════════════════════════════════════════════════════════
  //  Channel-strip setters → engine + project
  // ════════════════════════════════════════════════════════════════════
  function setEQ(id, band, v) { const t = track(id); if (!t) return; t.eq[band] = +v; E().setEQ(id, band, +v); }
  function setComp(id, key, v) { const t = track(id); if (!t) return; t.comp[key] = +v; E().setComp(id, { [key]: +v }); }
  function setDist(id, v) { const t = track(id); if (!t) return; t.dist.drive = +v; E().setDistortion(id, +v); }
  function setDelay(id, key, v) { const t = track(id); if (!t) return; t.delay[key === 'feedback' ? 'fb' : key] = +v; E().setDelay(id, { [key]: +v }); }
  function setSidechainSrc(id, src) { const t = track(id); if (!t) return; t.sidechain.source = src; E().setSidechain(id, src, t.sidechain.amount); }
  function setSidechainAmt(id, v) { const t = track(id); if (!t) return; t.sidechain.amount = +v; E().setSidechain(id, t.sidechain.source, +v); }
  function setSend(id, busId, v) { const t = track(id); if (!t) return; t.sends[busId] = +v; E().setSend(id, busId, +v); }
  function setBusFx(id, key, v) { const t = track(id); if (!t) return; t.busFx[key] = +v; E().setBusFx(id, { [key]: +v }); }
  function setMasterVol(v) { project.masterVol = +v; E().setMasterVolume(+v); }
  function setMultiband(on) { project.multiband = !!on; E().setMultibandEnabled(!!on); }
  function setBand(band, v) { E().setBandComp(band, { threshold: +v }); }

  // ════════════════════════════════════════════════════════════════════
  //  On-screen keyboard + computer keys + record
  // ════════════════════════════════════════════════════════════════════
  const KEY_MAP = { a: 60, w: 61, s: 62, e: 63, d: 64, f: 65, t: 66, g: 67, y: 68, h: 69, u: 70, j: 71, k: 72, o: 73, l: 74 };
  function keyboardHtml() {
    let html = '<div class="daw-keys">';
    for (let m = 48; m <= 84; m++) {
      const black = [1, 3, 6, 8, 10].includes(m % 12);
      html += `<div class="daw-key ${black ? 'black' : 'white'}" data-midi="${m}"
                 onmousedown="DAW.keyDown(${m})" onmouseup="DAW.keyUp(${m})" onmouseleave="DAW.keyUp(${m})"></div>`;
    }
    return html + '</div>';
  }
  function keyDown(m) { const tid = armedTrack || selectedTrack; if (!tid) return; E().ensureContext(); E().noteOn(tid, m, 110); flashKey(m, true); if (recording) recordNote(tid, m, 110); }
  function keyUp(m) { const tid = armedTrack || selectedTrack; if (!tid) return; E().noteOff(tid, m); flashKey(m, false); }
  function flashKey(m, on) { document.querySelectorAll(`.daw-key[data-midi="${m}"]`).forEach(e => e.classList.toggle('down', on)); }

  function recordNote(tid, midi, vel) {
    const t = track(tid); if (!t || t.type === 'fx') return;
    const step = playStep >= 0 ? playStep : 0;
    if (E().instrumentType(t.instrumentId) === 'drum') { t.steps[step] = 1; }
    else { t.notes.push({ start: step, len: 1, midi, vel }); }
  }

  let kbBound = false;
  function bindKeyboard() {
    if (kbBound) return; kbBound = true;
    document.addEventListener('keydown', e => {
      if (!isDawActive()) return;
      const tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
      if (e.repeat) return;
      if (e.code === 'Space') { e.preventDefault(); E().isPlaying() ? stop() : play(); return; }
      const m = KEY_MAP[e.key.toLowerCase()];
      if (m != null) { e.preventDefault(); keyDown(m); }
    });
    document.addEventListener('keyup', e => {
      if (!isDawActive()) return;
      const m = KEY_MAP[e.key.toLowerCase()];
      if (m != null) keyUp(m);
    });
  }
  function isDawActive() { return (location.hash || '').replace(/^#/, '') === '/daw' && document.querySelector('.daw'); }

  // ════════════════════════════════════════════════════════════════════
  //  MIDI + sound-card UI
  // ════════════════════════════════════════════════════════════════════
  async function initMidiUI() {
    midiInfo = await E().initMIDI();
    if (bottomTab === 'input') refreshMidi(true);
  }
  async function refreshMidi(skipInit) {
    if (!skipInit) midiInfo = { supported: !!navigator.requestMIDIAccess, inputs: E().midiInputs() };
    const st = document.getElementById('daw-midi-status'), list = document.getElementById('daw-midi-list');
    if (!st || !list) return;
    if (!navigator.requestMIDIAccess) { st.textContent = '⚠ Nettleseren støtter ikke Web MIDI.'; list.innerHTML = '<option>Ingen</option>'; return; }
    const inputs = E().midiInputs();
    st.innerHTML = inputs.length ? Icon('check') + ' MIDI klar — spill på pianoet ditt' : 'Koble til et MIDI-piano…';
    list.innerHTML = inputs.length ? inputs.map(i => `<option value="${i.id}">${esc(i.name)}</option>`).join('') : '<option>Ingen enheter</option>';
    window.Icons.hydrate(st);
  }
  async function grantInput() {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const devs = await E().listInputDevices();
      const list = document.getElementById('daw-input-list');
      if (list) list.innerHTML = devs.length ? devs.map(d => `<option value="${d.id}">${esc(d.label)}</option>`).join('') : '<option>Ingen inngang funnet</option>';
      App.toast('Tilgang gitt — velg inngang og koble til', 'success');
    } catch (e) { App.toast('Tilgang avslått: ' + e.message, 'error'); }
  }
  async function connectInput() {
    const tid = selectedTrack; const list = document.getElementById('daw-input-list');
    if (!tid || !list || !list.value) { App.toast('Velg spor og inngang', 'info'); return; }
    try { await E().addInputToTrack(tid, list.value); App.toast('Lydkort koblet til ' + esc(track(tid).name), 'success'); }
    catch (e) { App.toast('Kunne ikke koble til: ' + e.message, 'error'); }
  }
  function disconnectInput() { if (selectedTrack) { E().removeInputFromTrack(selectedTrack); App.toast('Inngang koblet fra', 'info'); } }

  // ════════════════════════════════════════════════════════════════════
  //  Persistence + WAV render + new window
  // ════════════════════════════════════════════════════════════════════
  function serialize() { return JSON.parse(JSON.stringify(project)); }

  async function saveProject() {
    const current = Auth.current(); if (!current) return Router.go('/login');
    const name = prompt('Navn på prosjekt:', project.name) || project.name;
    project.name = name;
    const id = project.id || ('daw_' + Date.now());
    project.id = id;
    const rec = { id, owner: current.username, name, updated: Date.now(), data: serialize() };
    await DB.put('music', rec);
    const list = JSON.parse(localStorage.getItem('daw_projects_' + current.username) || '[]');
    if (!list.find(x => x.id === id)) list.push({ id, name });
    else list.find(x => x.id === id).name = name;
    localStorage.setItem('daw_projects_' + current.username, JSON.stringify(list));
    App.toast('Prosjekt lagret ✓', 'success');
  }

  async function openProjects() {
    const current = Auth.current(); if (!current) return Router.go('/login');
    const all = (await DB.getAll('music').catch(() => [])) || [];
    const mine = all.filter(r => r.owner === current.username && r.data);
    if (!mine.length) { App.toast('Ingen lagrede prosjekter ennå', 'info'); return; }
    const html = mine.sort((a, b) => b.updated - a.updated).map(r =>
      `<div class="daw-proj-item">
         <span>${Icon('music')} ${esc(r.name)}<small> · ${new Date(r.updated).toLocaleDateString('no')}</small></span>
         <span>
           <button class="btn btn-primary btn-sm" onclick="DAW.loadProject('${r.id}')">Åpne</button>
           <button class="btn btn-ghost btn-sm" onclick="DAW.deleteProject('${r.id}')">${Icon('trash')}</button>
         </span>
       </div>`).join('');
    const box = document.getElementById('modal-box');
    if (box) {
      box.innerHTML = `<div class="modal-header"><h2>${Icon('folder')} Mine prosjekter</h2>
        <button class="btn-icon" onclick="App.closeModal()">${Icon('x')}</button></div>
        <div class="daw-proj-list">${html}</div>`;
      App.openModal();
      window.Icons.hydrate(box);
    }
  }

  async function loadProject(id) {
    const rec = await DB.get('music', id); if (!rec || !rec.data) return;
    E().stop(); recording = false; playStep = -1;
    project = rec.data; project.id = id;
    selectedTrack = project.tracks[0] ? project.tracks[0].id : null;
    armedTrack = selectedTrack; selection = new Set();
    App.closeModal();
    render();
    App.toast('Prosjekt åpnet', 'success');
  }
  async function deleteProject(id) {
    await DB.delete('music', id).catch(() => {});
    const current = Auth.current();
    if (current) {
      const list = JSON.parse(localStorage.getItem('daw_projects_' + current.username) || '[]').filter(x => x.id !== id);
      localStorage.setItem('daw_projects_' + current.username, JSON.stringify(list));
    }
    openProjects();
  }

  async function renderWav() {
    if (E().isRecording()) return;
    App.toast('Rendrer… spiller gjennom én runde', 'info', 3000);
    E().stop(); playStep = -1;
    E().startRecording();
    E().play(); startPlayhead();
    const secPerStep = (60 / project.bpm) / 4;
    const ms = totalSteps() * secPerStep * 1000 + 600; // +tail for delay/reverb
    setTimeout(async () => {
      E().stop(); stopPlayhead(); playStep = -1; paintPlayhead();
      const blob = await E().stopRecording();
      renderTopbar(); window.Icons.hydrate(document.getElementById('daw-topbar'));
      if (blob) offerDownload(blob, (project.name || 'soundcore').replace(/\s+/g, '_') + '.wav', true);
    }, ms);
  }

  async function offerDownload(blob, filename, alsoSave) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    if (alsoSave) {
      const current = Auth.current();
      if (current) {
        try {
          const id = 'mix_' + Date.now();
          const file = new File([blob], filename, { type: blob.type });
          await DB.storeFile('mixes', id, file, { owner: current.username, title: project.name, visibility: 'private', created: Date.now() });
          current.mixIds = [...(current.mixIds || []), id];
          Auth.updateUser(current.username, { mixIds: current.mixIds });
          App.toast('WAV lastet ned + lagret til profil ✓', 'success');
        } catch { App.toast('WAV lastet ned ✓', 'success'); }
      } else App.toast('WAV lastet ned ✓', 'success');
    }
  }

  function openWindow() {
    const url = location.origin + location.pathname + '#/daw';
    window.open(url, 'soundcore-studio', 'width=1280,height=820');
  }

  // ── helpers ──
  function track(id) { return project.tracks.find(t => t.id === id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }
  function instOptions(sel) {
    const cats = {};
    E().instrumentList().forEach(i => { (cats[i.cat] = cats[i.cat] || []).push(i); });
    return Object.keys(cats).map(cat =>
      `<optgroup label="${cat}">${cats[cat].map(i => `<option value="${i.id}" ${i.id === sel ? 'selected' : ''}>${esc(i.name)}</option>`).join('')}</optgroup>`).join('');
  }
  function sliderRow(label, val, min, max, step, handler, unit) {
    const id = 'sl_' + Math.random().toString(36).slice(2, 7);
    return `<div class="daw-slider"><label>${esc(label)}<span id="${id}">${fmt(val)}${unit || ''}</span></label>
      <input type="range" min="${min}" max="${max}" step="${step}" value="${val}"
        oninput="document.getElementById('${id}').textContent=(+this.value).toFixed(2)+'${unit || ''}';(${handler})"></div>`;
  }
  function fmt(v) { return (Math.round(v * 100) / 100).toString(); }

  return {
    render, upgrade,
    play, stop, toggleMetro, setBpm, setBars, toggleRecord,
    selectTrack, renameTrack, setInstrument, setVol, setPan, toggleMute, toggleSolo, setTune, setSynth,
    toggleStep, toggleAuto, addTrackUI, addFxTrack, deleteTrack,
    openDevice, openSynthBox, openDrumBox, closeDevice, deviceTarget, boxKey, padPick, padHit, refreshDevices,
    tab, toggleBottom, setTool, noteLen, selectAllNotes, copy, cut, paste, deleteSel,
    setEQ, setComp, setDist, setDelay, setSidechainSrc, setSidechainAmt, setSend, setBusFx,
    setMasterVol, setMultiband, setBand,
    keyDown, keyUp,
    refreshMidi, grantInput, connectInput, disconnectInput,
    saveProject, openProjects, loadProject, deleteProject, renderWav, openWindow,
  };
})();
