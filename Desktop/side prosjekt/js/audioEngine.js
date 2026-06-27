/* ═══════════════════════════════════════════════════════════════════════
   SoundCore Studio — Audio Engine (Web Audio)
   Ren lyd-logikk, ingen DOM. Orkestreres av js/daw.js.

   Signalkjede per spor ("én lyd per spor"):
     instrument → trackIn → EQ(4) → distortion → echo/delay → compressor
                → volume → duck(sidechain) → pan → master

   Master:
     sum → multibånd-kompressor (3 bånd) → masterGain → destination + opptaks-tap
   ═══════════════════════════════════════════════════════════════════════ */
const AudioEngine = (() => {
  'use strict';

  let ctx = null;
  let master = null;           // { in, low/mid/high comps, sum, gain, analyser, recDest, mb:{...} }
  const tracks = {};           // id → channel-strip nodes + state
  const buses = {};            // id → FX-bus strip (effect return channel)
  const liveVoices = {};       // `${trackId}:${midi}` → voice (for noteOn/noteOff sustain)
  let noiseBuffer = null;

  let midiAccess = null;
  let onMidiNote = null;       // callback(note, velocity, isOn) set by DAW

  // ── Transport / scheduler ──────────────────────────────────────────────
  const transport = {
    playing: false, bpm: 120, steps: 16, swing: 0,
    current: 0, nextTime: 0, timer: null,
    lookahead: 25, scheduleAhead: 0.12,
    metronome: false,
    onStep: null,              // callback(step, time) for UI playhead
    stepProvider: null,        // () → { trackId: [stepCell, …] }  supplied by DAW
    automationProvider: null,  // () → { trackId: { param: [val per step] } }
  };

  // ════════════════════════════════════════════════════════════════════
  //  Lifecycle
  // ════════════════════════════════════════════════════════════════════
  function ensureContext() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      buildNoise();
      buildMaster();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function buildNoise() {
    const len = ctx.sampleRate * 2;
    noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }

  function noiseSource() {
    const s = ctx.createBufferSource();
    s.buffer = noiseBuffer;
    s.loop = true;
    return s;
  }

  // ── Master bus w/ multiband compressor ────────────────────────────────
  function buildMaster() {
    const inNode  = ctx.createGain();
    const sum     = ctx.createGain();
    const gain    = ctx.createGain();
    gain.gain.value = 0.85;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    const recDest = ctx.createMediaStreamDestination();

    // 3-band split: low (LP@f1), mid (HP@f1→LP@f2), high (HP@f2)
    const f1 = 250, f2 = 2500;
    const lowLP  = filt('lowpass', f1);
    const midHP  = filt('highpass', f1);
    const midLP  = filt('lowpass', f2);
    const highHP = filt('highpass', f2);
    const cLow  = comp(), cMid = comp(), cHigh = comp();

    inNode.connect(lowLP);  lowLP.connect(cLow);   cLow.connect(sum);
    inNode.connect(midHP);  midHP.connect(midLP);  midLP.connect(cMid); cMid.connect(sum);
    inNode.connect(highHP); highHP.connect(cHigh); cHigh.connect(sum);

    sum.connect(gain);
    gain.connect(ctx.destination);
    gain.connect(recDest);
    gain.connect(analyser);

    master = {
      in: inNode, sum, gain, analyser, recDest, enabled: true,
      mb: { lowLP, midHP, midLP, highHP, cLow, cMid, cHigh, f1, f2 },
    };
  }

  function filt(type, freq, q) {
    const f = ctx.createBiquadFilter();
    f.type = type; f.frequency.value = freq;
    if (q != null) f.Q.value = q;
    return f;
  }

  function comp() {
    const c = ctx.createDynamicsCompressor();
    c.threshold.value = -22; c.knee.value = 24; c.ratio.value = 3;
    c.attack.value = 0.006; c.release.value = 0.18;
    return c;
  }

  // ════════════════════════════════════════════════════════════════════
  //  Channel strip (per track)
  // ════════════════════════════════════════════════════════════════════
  function createTrack(id, instrumentId) {
    ensureContext();
    if (tracks[id]) removeTrack(id);

    const input = ctx.createGain();

    // 4-band EQ
    const eqLow   = filt('lowshelf', 90);
    const eqLoMid = filt('peaking', 350, 1);
    const eqHiMid = filt('peaking', 2000, 1);
    const eqHigh  = filt('highshelf', 6000);

    // Distortion (WaveShaper) + makeup trim
    const shaper = ctx.createWaveShaper();
    shaper.oversample = '2x';
    const shaperTrim = ctx.createGain();

    // Echo/delay (dry + feedback wet)
    const fxSplit = ctx.createGain();
    const dry     = ctx.createGain();
    const delay   = ctx.createDelay(2.0);
    const fb      = ctx.createGain();
    const wet     = ctx.createGain();
    const fxBus   = ctx.createGain();
    delay.delayTime.value = 0.30; fb.gain.value = 0.30; wet.gain.value = 0;

    const compressor = comp();
    const volume = ctx.createGain();
    const duck   = ctx.createGain();           // sidechain target (automated)
    const pan    = ctx.createStereoPanner();

    // wire
    input.connect(eqLow); eqLow.connect(eqLoMid); eqLoMid.connect(eqHiMid); eqHiMid.connect(eqHigh);
    eqHigh.connect(shaper); shaper.connect(shaperTrim);
    shaperTrim.connect(fxSplit);
    fxSplit.connect(dry); dry.connect(fxBus);
    fxSplit.connect(delay); delay.connect(fb); fb.connect(delay); delay.connect(wet); wet.connect(fxBus);
    fxBus.connect(compressor); compressor.connect(volume);
    volume.connect(duck); duck.connect(pan); pan.connect(master.in);

    tracks[id] = {
      id, instrumentId, input,
      eq: { low: eqLow, loMid: eqLoMid, hiMid: eqHiMid, high: eqHigh },
      shaper, shaperTrim, delay, fb, wet, dry, compressor, volume, duck, pan,
      muted: false, soloed: false, vol: 0.8,
      sidechain: null,           // { source, amount, duckMs }
      inputStream: null,         // external sound-card source
      tune: 0,                   // semitone offset for drum/perc
      synth: defaultSynth(instrumentId),
    };
    setDistortion(id, 0);
    return tracks[id];
  }

  function removeTrack(id) {
    const t = tracks[id]; if (!t) return;
    try { t.pan.disconnect(); } catch {}
    try { if (t.inputStream) t.inputStream.disconnect(); } catch {}
    delete tracks[id];
  }

  function setInstrument(id, instrumentId) { if (tracks[id]) tracks[id].instrumentId = instrumentId; }

  // ── Channel-strip setters ─────────────────────────────────────────────
  function setVolume(id, v)  { const t = tracks[id]; if (!t) return; t.vol = v; if (!t.muted) t.volume.gain.value = v; }
  function setPan(id, p)     { const t = tracks[id]; if (t) t.pan.pan.value = Math.max(-1, Math.min(1, p)); }
  function setMute(id, on)   { const t = tracks[id]; if (!t) return; t.muted = on; t.volume.gain.value = on ? 0 : t.vol; }
  function setEQ(id, band, db) { const t = tracks[id]; if (t && t.eq[band]) t.eq[band].gain.value = db; }
  function setEQFreq(id, band, hz) { const t = tracks[id]; if (t && t.eq[band]) t.eq[band].frequency.value = hz; }
  function setComp(id, p) {
    const t = tracks[id]; if (!t) return; const c = t.compressor;
    if (p.threshold != null) c.threshold.value = p.threshold;
    if (p.ratio != null)     c.ratio.value     = p.ratio;
    if (p.attack != null)    c.attack.value     = p.attack;
    if (p.release != null)   c.release.value    = p.release;
    if (p.knee != null)      c.knee.value        = p.knee;
  }
  function setDistortion(id, drive, mix) {
    const t = tracks[id]; if (!t) return;
    t.shaper.curve = drive > 0 ? distCurve(drive) : null;
    // light makeup so heavier drive doesn't blow up level
    t.shaperTrim.gain.value = drive > 0 ? 1 / (1 + drive / 120) : 1;
  }
  function setDelay(id, { time, feedback, mix } = {}) {
    const t = tracks[id]; if (!t) return;
    if (time != null)     t.delay.delayTime.value = Math.max(0.001, time);
    if (feedback != null) t.fb.gain.value = Math.max(0, Math.min(0.95, feedback));
    if (mix != null)      t.wet.gain.value = Math.max(0, Math.min(1, mix));
  }

  function distCurve(amount) {
    const k = amount * 3, n = 8192, curve = new Float32Array(n), deg = Math.PI / 180;
    for (let i = 0; i < n; i++) {
      const x = (i * 2) / n - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  // ── Sidechain (scheduled ducking / pumping) ───────────────────────────
  function setSidechain(id, sourceId, amount, ms) {
    const t = tracks[id]; if (!t) return;
    if (!sourceId || sourceId === 'none') { t.sidechain = null; return; }
    t.sidechain = { source: sourceId, amount: amount != null ? amount : 0.7, ms: ms || 180 };
  }

  function duck(targetId, when) {
    const t = tracks[targetId]; if (!t || !t.sidechain) return;
    const g = t.duck.gain, depth = 1 - t.sidechain.amount, rel = t.sidechain.ms / 1000;
    g.cancelScheduledValues(when);
    g.setValueAtTime(depth, when);
    g.linearRampToValueAtTime(1, when + rel);
  }

  function applySidechains(sourceId, when) {
    for (const id in tracks) {
      const t = tracks[id];
      if (t.sidechain && t.sidechain.source === sourceId) duck(id, when);
    }
  }

  // ════════════════════════════════════════════════════════════════════
  //  Master setters
  // ════════════════════════════════════════════════════════════════════
  function setMasterVolume(v) { if (master) master.gain.gain.value = v; }
  function setMultibandEnabled(on) {
    if (!master) return; master.enabled = on;
    const m = master.mb;
    try { master.in.disconnect(); } catch {}
    if (on) {
      master.in.connect(m.lowLP); master.in.connect(m.midHP); master.in.connect(m.highHP);
    } else {
      master.in.connect(master.sum);
    }
  }
  function setBandComp(band, p) {
    if (!master) return;
    const c = { low: master.mb.cLow, mid: master.mb.cMid, high: master.mb.cHigh }[band];
    if (!c) return;
    if (p.threshold != null) c.threshold.value = p.threshold;
    if (p.ratio != null)     c.ratio.value     = p.ratio;
  }
  function setCrossover(f1, f2) {
    if (!master) return; const m = master.mb;
    if (f1 != null) { m.lowLP.frequency.value = f1; m.midHP.frequency.value = f1; m.f1 = f1; }
    if (f2 != null) { m.midLP.frequency.value = f2; m.highHP.frequency.value = f2; m.f2 = f2; }
  }
  function getMasterAnalyser() { return master ? master.analyser : null; }

  // ════════════════════════════════════════════════════════════════════
  //  FX buses (effect return channels) + sends
  // ════════════════════════════════════════════════════════════════════
  function createBus(id) {
    ensureContext();
    if (buses[id]) return buses[id];
    const input = ctx.createGain();
    const shaper = ctx.createWaveShaper(); shaper.oversample = '2x';
    const shaperTrim = ctx.createGain();
    const dry = ctx.createGain(), delay = ctx.createDelay(2.0), fb = ctx.createGain(), wet = ctx.createGain(), fxBus = ctx.createGain();
    delay.delayTime.value = 0.35; fb.gain.value = 0.4; wet.gain.value = 0.5;
    // reverb (real convolution)
    const conv = ctx.createConvolver(); conv.buffer = buildImpulse(2.2, 2.6);
    const revDry = ctx.createGain(), revWet = ctx.createGain(), revBus = ctx.createGain();
    revWet.gain.value = 0.35;
    const compressor = comp();
    const volume = ctx.createGain(); volume.gain.value = 0.9;
    const pan = ctx.createStereoPanner();
    input.connect(shaper); shaper.connect(shaperTrim);
    shaperTrim.connect(dry); dry.connect(fxBus);
    shaperTrim.connect(delay); delay.connect(fb); fb.connect(delay); delay.connect(wet); wet.connect(fxBus);
    fxBus.connect(revDry); revDry.connect(revBus);
    fxBus.connect(conv); conv.connect(revWet); revWet.connect(revBus);
    revBus.connect(compressor); compressor.connect(volume); volume.connect(pan); pan.connect(master.in);
    buses[id] = { id, input, shaper, shaperTrim, delay, fb, wet, dry, conv, revWet, revDry, compressor, volume, pan, vol: 0.9, muted: false, isBus: true, revSize: 2.2 };
    return buses[id];
  }

  function buildImpulse(seconds, decay) {
    const rate = ctx.sampleRate, len = Math.max(1, Math.floor(rate * seconds));
    const buf = ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }
  function removeBus(id) {
    const b = buses[id]; if (!b) return;
    try { b.pan.disconnect(); } catch {}
    delete buses[id];
    for (const tid in tracks) { const t = tracks[tid]; if (t.sends && t.sends[id]) { try { t.sends[id].disconnect(); } catch {} delete t.sends[id]; } }
  }
  function setSend(trackId, busId, amount) {
    const t = tracks[trackId], b = buses[busId]; if (!t || !b) return;
    t.sends = t.sends || {};
    if (!t.sends[busId]) { const g = ctx.createGain(); g.gain.value = 0; t.volume.connect(g); g.connect(b.input); t.sends[busId] = g; }
    t.sends[busId].gain.value = Math.max(0, Math.min(1.5, amount));
  }
  function setBusFx(busId, p) {
    const b = buses[busId]; if (!b) return;
    if (p.distDrive != null) { b.shaper.curve = p.distDrive > 0 ? distCurve(p.distDrive) : null; b.shaperTrim.gain.value = p.distDrive > 0 ? 1 / (1 + p.distDrive / 120) : 1; }
    if (p.delayTime != null) b.delay.delayTime.value = Math.max(0.001, p.delayTime);
    if (p.delayFb != null)   b.fb.gain.value = Math.max(0, Math.min(0.95, p.delayFb));
    if (p.delayMix != null)  b.wet.gain.value = Math.max(0, Math.min(1, p.delayMix));
    if (p.reverbMix != null) b.revWet.gain.value = Math.max(0, Math.min(1, p.reverbMix));
    if (p.reverbSize != null) { b.revSize = p.reverbSize; b.conv.buffer = buildImpulse(Math.max(0.2, p.reverbSize), 2.6); }
    if (p.volume != null)    { b.vol = p.volume; if (!b.muted) b.volume.gain.value = p.volume; }
    if (p.pan != null)       b.pan.pan.value = Math.max(-1, Math.min(1, p.pan));
  }
  function setBusMute(busId, on) { const b = buses[busId]; if (!b) return; b.muted = on; b.volume.gain.value = on ? 0 : b.vol; }
  function busList() { return Object.keys(buses); }

  // ════════════════════════════════════════════════════════════════════
  //  Automation — generic param targets (volume / pan / send / delay)
  // ════════════════════════════════════════════════════════════════════
  function paramTarget(id, param) {
    const t = tracks[id], b = buses[id];
    if (param === 'volume') return t ? t.volume.gain : (b ? b.volume.gain : null);
    if (param === 'pan')    return t ? t.pan.pan   : (b ? b.pan.pan : null);
    if (param === 'delayMix') return t ? t.wet.gain : (b ? b.wet.gain : null);
    if (param && param.indexOf('send:') === 0 && t) {
      const busId = param.slice(5);
      if (!t.sends || !t.sends[busId]) setSend(id, busId, 0);
      return t.sends && t.sends[busId] ? t.sends[busId].gain : null;
    }
    return null;
  }
  function setParamNow(id, param, value) {
    const tgt = paramTarget(id, param); if (!tgt) return;
    tgt.value = value;
    if (param === 'volume' && tracks[id]) tracks[id].vol = value;
  }
  function automateAt(id, param, value, when) {
    const tgt = paramTarget(id, param); if (!tgt) return;
    tgt.setValueAtTime(value, when);
  }

  // ════════════════════════════════════════════════════════════════════
  //  Instruments (synthesis) — registry
  //  melodic.trigger(dest, when, freq, dur, vel)   drum.trigger(dest, when, vel, tune)
  // ════════════════════════════════════════════════════════════════════
  function adsr(param, when, peak, a, d, s, dur, rel) {
    param.cancelScheduledValues(when);
    param.setValueAtTime(0.0001, when);
    param.exponentialRampToValueAtTime(Math.max(0.0001, peak), when + a);
    param.exponentialRampToValueAtTime(Math.max(0.0001, peak * s), when + a + d);
    const end = when + dur;
    param.setValueAtTime(Math.max(0.0001, peak * s), Math.max(when + a + d, end - rel));
    param.exponentialRampToValueAtTime(0.0001, end + rel);
  }

  function mkOsc(type, freq, detune) {
    const o = ctx.createOscillator();
    o.type = type; o.frequency.value = freq;
    if (detune) o.detune.value = detune;
    return o;
  }

  const INSTRUMENTS = {
    // ── Melodic ──
    synthLead: {
      name: 'Analog Lead', cat: 'Synth', type: 'melodic', icon: 'waveform',
      trigger(dest, when, freq, dur, vel, p) {
        p = p || {}; const wave = p.wave || 'sawtooth', base = p.cutoff || 1200, res = p.res != null ? p.res : 8;
        const a = p.attack != null ? p.attack : 0.012, rel = p.release != null ? p.release : 0.18;
        const det = p.detune != null ? p.detune : 6;
        const g = ctx.createGain(), lp = filt('lowpass', base, res);
        const o1 = mkOsc(wave, freq, -det), o2 = mkOsc(wave, freq, +det);
        const v = (vel || 100) / 127, stopAt = when + dur + rel + 0.2;
        o1.connect(g); o2.connect(g); g.connect(lp); lp.connect(dest);
        addSubAndLfo(p, dest, g, lp, freq, when, base, stopAt);
        lp.frequency.setValueAtTime(base * 0.4, when);
        lp.frequency.exponentialRampToValueAtTime(base * 3.6, when + 0.05);
        lp.frequency.exponentialRampToValueAtTime(base * 0.75, when + dur);
        adsr(g.gain, when, 0.32 * v, a, 0.12, 0.7, dur, rel);
        o1.start(when); o2.start(when); o1.stop(stopAt); o2.stop(stopAt);
      },
    },
    synthBass: {
      name: 'Synth Bass', cat: 'Bass', type: 'melodic', icon: 'waveform',
      trigger(dest, when, freq, dur, vel, p) {
        p = p || {}; const wave = p.wave || 'sawtooth', base = p.cutoff || 600, res = p.res != null ? p.res : 6;
        const a = p.attack != null ? p.attack : 0.006, rel = p.release != null ? p.release : 0.1;
        const det = p.detune != null ? p.detune : 0;
        const g = ctx.createGain(), lp = filt('lowpass', base, res);
        const o1 = mkOsc(wave, freq, det), o2 = mkOsc('square', freq / 2);
        const v = (vel || 100) / 127, stopAt = when + dur + rel + 0.2;
        o1.connect(g); o2.connect(g); g.connect(lp); lp.connect(dest);
        addSubAndLfo(p, dest, g, lp, freq, when, base, stopAt);
        lp.frequency.setValueAtTime(base * 2, when);
        lp.frequency.exponentialRampToValueAtTime(base * 0.5, when + 0.12);
        adsr(g.gain, when, 0.5 * v, a, 0.08, 0.8, dur, rel);
        o1.start(when); o2.start(when); o1.stop(stopAt); o2.stop(stopAt);
      },
    },
    pad: {
      name: 'Atmosfære-pad', cat: 'Atmosphere', type: 'melodic', icon: 'cloud',
      trigger(dest, when, freq, dur, vel, p) {
        p = p || {}; const wave = p.wave || 'sawtooth', base = p.cutoff || 900, res = p.res != null ? p.res : 2;
        const a = p.attack != null ? p.attack : 0.6, rel = p.release != null ? p.release : 1.2;
        const det = p.detune != null ? p.detune : 6;
        const lr = p.lfoRate != null ? p.lfoRate : 0.15, ld = p.lfoDepth != null ? p.lfoDepth : 0.4;
        const g = ctx.createGain(), lp = filt('lowpass', base, res);
        const lfo = mkOsc('sine', lr), lfoG = ctx.createGain(); lfoG.gain.value = ld * base;
        lfo.connect(lfoG); lfoG.connect(lp.frequency);
        const v = (vel || 90) / 127, d = Math.max(dur, 0.8), stopAt = when + d + rel + 0.3;
        [-9, -4, 0, 4, 7].forEach(c => { const o = mkOsc(wave, freq, c * det * 0.25); o.connect(g); o.start(when); o.stop(stopAt); });
        g.connect(lp); lp.connect(dest);
        adsr(g.gain, when, 0.14 * v, a, 0.4, 0.85, d, rel);
        lfo.start(when); lfo.stop(stopAt);
      },
    },
    // ── Drums ──
    kick: {
      name: 'Kick', cat: 'Trommer', type: 'drum', icon: 'circle-dot', base: 50,
      trigger(dest, when, vel, tune) {
        const o = ctx.createOscillator(), g = ctx.createGain(), v = (vel || 110) / 127;
        const f0 = 130 * Math.pow(2, (tune || 0) / 12);
        o.frequency.setValueAtTime(f0, when);
        o.frequency.exponentialRampToValueAtTime(40, when + 0.12);
        g.gain.setValueAtTime(v, when);
        g.gain.exponentialRampToValueAtTime(0.0001, when + 0.42);
        o.connect(g); g.connect(dest); o.start(when); o.stop(when + 0.45);
      },
    },
    snare: {
      name: 'Snare', cat: 'Trommer', type: 'drum', icon: 'disc',
      trigger(dest, when, vel, tune) {
        const v = (vel || 110) / 127;
        const n = noiseSource(), nf = filt('highpass', 1400), ng = ctx.createGain();
        n.connect(nf); nf.connect(ng); ng.connect(dest);
        ng.gain.setValueAtTime(v * 0.8, when); ng.gain.exponentialRampToValueAtTime(0.0001, when + 0.18);
        const o = mkOsc('triangle', 180 * Math.pow(2, (tune || 0) / 12)), og = ctx.createGain();
        o.connect(og); og.connect(dest);
        og.gain.setValueAtTime(v * 0.4, when); og.gain.exponentialRampToValueAtTime(0.0001, when + 0.1);
        n.start(when); n.stop(when + 0.2); o.start(when); o.stop(when + 0.12);
      },
    },
    hatClosed: {
      name: 'Hi-hat (lukket)', cat: 'Trommer', type: 'drum', icon: 'circle',
      trigger(dest, when, vel) {
        const v = (vel || 90) / 127, n = noiseSource(), hp = filt('highpass', 7000), g = ctx.createGain();
        n.connect(hp); hp.connect(g); g.connect(dest);
        g.gain.setValueAtTime(v * 0.5, when); g.gain.exponentialRampToValueAtTime(0.0001, when + 0.05);
        n.start(when); n.stop(when + 0.06);
      },
    },
    hatOpen: {
      name: 'Hi-hat (åpen)', cat: 'Trommer', type: 'drum', icon: 'circle',
      trigger(dest, when, vel) {
        const v = (vel || 90) / 127, n = noiseSource(), hp = filt('highpass', 7000), g = ctx.createGain();
        n.connect(hp); hp.connect(g); g.connect(dest);
        g.gain.setValueAtTime(v * 0.45, when); g.gain.exponentialRampToValueAtTime(0.0001, when + 0.32);
        n.start(when); n.stop(when + 0.34);
      },
    },
    clap: {
      name: 'Clap', cat: 'Trommer', type: 'drum', icon: 'sparkles',
      trigger(dest, when, vel) {
        const v = (vel || 100) / 127;
        for (let i = 0; i < 3; i++) {
          const n = noiseSource(), bp = filt('bandpass', 1200, 2), g = ctx.createGain();
          n.connect(bp); bp.connect(g); g.connect(dest);
          const t0 = when + i * 0.012;
          g.gain.setValueAtTime(v * 0.5, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.1);
          n.start(t0); n.stop(t0 + 0.12);
        }
      },
    },
    tom: {
      name: 'Tom', cat: 'Trommer', type: 'drum', icon: 'circle', base: 120,
      trigger(dest, when, vel, tune) {
        const o = mkOsc('sine', 160 * Math.pow(2, (tune || 0) / 12)), g = ctx.createGain(), v = (vel || 100) / 127;
        o.frequency.exponentialRampToValueAtTime(70, when + 0.3);
        g.gain.setValueAtTime(v * 0.7, when); g.gain.exponentialRampToValueAtTime(0.0001, when + 0.35);
        o.connect(g); g.connect(dest); o.start(when); o.stop(when + 0.38);
      },
    },
    // ── Percussion / congas ──
    congaHi: {
      name: 'Conga (høy)', cat: 'Perkusjon', type: 'drum', icon: 'circle', base: 360,
      trigger(dest, when, vel, tune) { membrane(dest, when, 360 * Math.pow(2, (tune || 0) / 12), vel, 0.18); },
    },
    congaLo: {
      name: 'Conga (lav)', cat: 'Perkusjon', type: 'drum', icon: 'circle', base: 220,
      trigger(dest, when, vel, tune) { membrane(dest, when, 220 * Math.pow(2, (tune || 0) / 12), vel, 0.24); },
    },
    bongo: {
      name: 'Bongo', cat: 'Perkusjon', type: 'drum', icon: 'circle', base: 480,
      trigger(dest, when, vel, tune) { membrane(dest, when, 480 * Math.pow(2, (tune || 0) / 12), vel, 0.12); },
    },
    shaker: {
      name: 'Shaker', cat: 'Perkusjon', type: 'drum', icon: 'circle',
      trigger(dest, when, vel) {
        const v = (vel || 80) / 127, n = noiseSource(), hp = filt('highpass', 5000), g = ctx.createGain();
        n.connect(hp); hp.connect(g); g.connect(dest);
        g.gain.setValueAtTime(0.0001, when); g.gain.exponentialRampToValueAtTime(v * 0.4, when + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, when + 0.1);
        n.start(when); n.stop(when + 0.12);
      },
    },
    clave: {
      name: 'Clave', cat: 'Perkusjon', type: 'drum', icon: 'circle',
      trigger(dest, when, vel) {
        const o = mkOsc('sine', 1200), g = ctx.createGain(), v = (vel || 100) / 127;
        g.gain.setValueAtTime(v * 0.6, when); g.gain.exponentialRampToValueAtTime(0.0001, when + 0.06);
        o.connect(g); g.connect(dest); o.start(when); o.stop(when + 0.08);
      },
    },
    cowbell: {
      name: 'Cowbell', cat: 'Perkusjon', type: 'drum', icon: 'bell',
      trigger(dest, when, vel) {
        const v = (vel || 100) / 127, g = ctx.createGain(), bp = filt('bandpass', 800, 4);
        const o1 = mkOsc('square', 560), o2 = mkOsc('square', 845);
        o1.connect(g); o2.connect(g); g.connect(bp); bp.connect(dest);
        g.gain.setValueAtTime(v * 0.3, when); g.gain.exponentialRampToValueAtTime(0.0001, when + 0.3);
        o1.start(when); o2.start(when); o1.stop(when + 0.32); o2.stop(when + 0.32);
      },
    },
    rim: {
      name: 'Rimshot', cat: 'Perkusjon', type: 'drum', icon: 'circle',
      trigger(dest, when, vel) {
        const o = mkOsc('triangle', 440), g = ctx.createGain(), v = (vel || 100) / 127;
        g.gain.setValueAtTime(v * 0.5, when); g.gain.exponentialRampToValueAtTime(0.0001, when + 0.04);
        o.connect(g); g.connect(dest); o.start(when); o.stop(when + 0.05);
      },
    },
  };

  function membrane(dest, when, freq, vel, decay) {
    const o = mkOsc('sine', freq), g = ctx.createGain(), bp = filt('bandpass', freq, 6), v = (vel || 100) / 127;
    o.frequency.setValueAtTime(freq * 1.8, when);
    o.frequency.exponentialRampToValueAtTime(freq, when + 0.04);
    g.gain.setValueAtTime(v * 0.7, when); g.gain.exponentialRampToValueAtTime(0.0001, when + decay);
    o.connect(g); g.connect(bp); bp.connect(dest); o.start(when); o.stop(when + decay + 0.05);
  }

  const SYNTH_DEFAULTS = {
    synthLead: { wave: 'sawtooth', cutoff: 1200, res: 8, attack: 0.012, release: 0.18, detune: 6, subLevel: 0, lfoRate: 0, lfoDepth: 0 },
    synthBass: { wave: 'sawtooth', cutoff: 600, res: 6, attack: 0.006, release: 0.1, detune: 0, subLevel: 0.3, lfoRate: 0, lfoDepth: 0 },
    pad:       { wave: 'sawtooth', cutoff: 900, res: 2, attack: 0.6, release: 1.2, detune: 6, subLevel: 0, lfoRate: 0.15, lfoDepth: 0.4 },
  };
  // shared: sub-osc + filter LFO for melodic voices
  function addSubAndLfo(p, dest, g, lp, freq, when, base, stopAt) {
    const subLevel = p.subLevel != null ? p.subLevel : 0;
    if (subLevel > 0) { const sub = mkOsc('sine', freq / 2), sg = ctx.createGain(); sg.gain.value = subLevel * 0.5; sub.connect(sg); sg.connect(g); sub.start(when); sub.stop(stopAt); }
    const lr = p.lfoRate != null ? p.lfoRate : 0, ld = p.lfoDepth != null ? p.lfoDepth : 0;
    if (lr > 0 && ld > 0) { const lfo = mkOsc('sine', lr), lg = ctx.createGain(); lg.gain.value = ld * base; lfo.connect(lg); lg.connect(lp.frequency); lfo.start(when); lfo.stop(stopAt); }
  }
  function defaultSynth(instId) { const d = SYNTH_DEFAULTS[instId] || SYNTH_DEFAULTS.synthLead; return { ...d }; }
  function setSynthParam(trackId, key, val) { const t = tracks[trackId]; if (t) { t.synth = t.synth || {}; t.synth[key] = val; } }

  function instrumentList() {
    return Object.keys(INSTRUMENTS).map(id => ({ id, ...INSTRUMENTS[id] }));
  }
  function instrumentType(id) { return INSTRUMENTS[id] ? INSTRUMENTS[id].type : 'melodic'; }

  // ── Trigger helpers ───────────────────────────────────────────────────
  const A4 = 440, A4_MIDI = 69;
  function midiToFreq(m) { return A4 * Math.pow(2, (m - A4_MIDI) / 12); }

  function triggerAt(trackId, when, opts) {
    const t = tracks[trackId]; if (!t) return;
    const inst = INSTRUMENTS[t.instrumentId]; if (!inst) return;
    if (inst.type === 'drum') inst.trigger(t.input, when, opts.vel, t.tune);
    else inst.trigger(t.input, when, midiToFreq(opts.midi != null ? opts.midi : 60), opts.dur || 0.4, opts.vel, t.synth);
    applySidechains(trackId, when);
  }

  // Live play (keyboard / MIDI) — sustained until noteOff for melodic
  function noteOn(trackId, midi, vel) {
    ensureContext();
    const t = tracks[trackId]; if (!t) return;
    const inst = INSTRUMENTS[t.instrumentId]; if (!inst) return;
    const when = ctx.currentTime;
    if (inst.type === 'drum') { inst.trigger(t.input, when, vel, t.tune); applySidechains(trackId, when); return; }
    // melodic: long dur, released on noteOff
    const key = `${trackId}:${midi}`;
    inst.trigger(t.input, when, midiToFreq(midi), 8, vel, t.synth);
    liveVoices[key] = when;
    applySidechains(trackId, when);
  }
  function noteOff(trackId, midi) {
    // Envelopes are time-based; long-held notes simply decay. (Voices auto-stop.)
    delete liveVoices[`${trackId}:${midi}`];
  }

  // ════════════════════════════════════════════════════════════════════
  //  Transport / scheduler (lookahead)
  // ════════════════════════════════════════════════════════════════════
  function secPerStep() { return (60 / transport.bpm) / 4; } // 16th notes

  function scheduleStep(step, time) {
    const pattern = transport.stepProvider ? transport.stepProvider() : {};
    // automation: set each automated param at this step's time
    if (transport.automationProvider) {
      const auto = transport.automationProvider();
      for (const id in auto) {
        for (const param in auto[id]) {
          if (param === 'volume' && tracks[id] && tracks[id].muted) continue;
          const arr = auto[id][param];
          if (arr && arr[step] != null) automateAt(id, param, arr[step], time);
        }
      }
    }
    // solo handling
    const soloed = Object.values(tracks).some(t => t.soloed);
    for (const id in tracks) {
      const t = tracks[id];
      if (soloed && !t.soloed) continue;
      const row = pattern[id]; if (!row) continue;
      const cell = row[step];
      if (!cell) continue;
      if (Array.isArray(cell)) {
        cell.forEach(c => triggerAt(id, time, { midi: c.midi, vel: c.vel, dur: c.dur || secPerStep() * 0.9 }));
      } else if (typeof cell === 'object') {
        triggerAt(id, time, { midi: cell.midi, vel: cell.vel, dur: cell.dur || secPerStep() * 0.9 });
      } else {
        triggerAt(id, time, { vel: 110, midi: 60, dur: secPerStep() * 0.9 });
      }
    }
    if (transport.metronome) {
      const o = mkOsc('square', step % transport.steps === 0 ? 1600 : 900), g = ctx.createGain();
      g.gain.setValueAtTime(0.08, time); g.gain.exponentialRampToValueAtTime(0.0001, time + 0.04);
      o.connect(g); g.connect(master.gain); o.start(time); o.stop(time + 0.05);
    }
  }

  function scheduler() {
    while (transport.nextTime < ctx.currentTime + transport.scheduleAhead) {
      const step = transport.current, time = transport.nextTime;
      scheduleStep(step, time);
      if (transport.onStep) transport.onStep(step, time);
      const swingOffset = (step % 2 === 1) ? secPerStep() * transport.swing : 0;
      transport.nextTime += secPerStep();
      transport.current = (transport.current + 1) % transport.steps;
      transport.nextTime += swingOffset - ((step % 2 === 0) ? 0 : 0);
    }
  }

  function play() {
    ensureContext();
    if (transport.playing) return;
    transport.playing = true; transport.current = 0;
    transport.nextTime = ctx.currentTime + 0.06;
    transport.timer = setInterval(scheduler, transport.lookahead);
  }
  function stop() {
    transport.playing = false;
    if (transport.timer) clearInterval(transport.timer);
    transport.timer = null; transport.current = 0;
  }
  function setBpm(v)   { transport.bpm = Math.max(40, Math.min(240, v)); }
  function setSteps(n) { transport.steps = n; }
  function setSwing(s) { transport.swing = Math.max(0, Math.min(0.6, s)); }
  function setMetronome(on) { transport.metronome = on; }
  function setStepProvider(fn) { transport.stepProvider = fn; }
  function setAutomationProvider(fn) { transport.automationProvider = fn; }
  function setOnStep(fn) { transport.onStep = fn; }
  function isPlaying() { return transport.playing; }
  function setSolo(id, on) { if (tracks[id]) tracks[id].soloed = on; }
  function setTune(id, semis) { if (tracks[id]) tracks[id].tune = semis; }

  // ════════════════════════════════════════════════════════════════════
  //  Recording / render → WAV (taps master via ScriptProcessor)
  // ════════════════════════════════════════════════════════════════════
  let wav = { node: null, left: [], right: [], recording: false, len: 0 };
  function startRecording() {
    ensureContext();
    if (!master || wav.recording) return false;
    const node = ctx.createScriptProcessor(4096, 2, 2);
    wav = { node, left: [], right: [], recording: true, len: 0, rate: ctx.sampleRate };
    node.onaudioprocess = e => {
      if (!wav.recording) return;
      wav.left.push(new Float32Array(e.inputBuffer.getChannelData(0)));
      wav.right.push(new Float32Array(e.inputBuffer.getChannelData(e.inputBuffer.numberOfChannels > 1 ? 1 : 0)));
      wav.len += e.inputBuffer.length;
      // leave outputBuffer silent → tap adds no audible signal
    };
    master.gain.connect(node);
    node.connect(ctx.destination);
    return true;
  }
  function stopRecording() {
    return new Promise(resolve => {
      if (!wav.recording) return resolve(null);
      wav.recording = false;
      try { master.gain.disconnect(wav.node); } catch {}
      try { wav.node.disconnect(); } catch {}
      const blob = encodeWav(flatten(wav.left, wav.len), flatten(wav.right, wav.len), wav.rate);
      resolve(blob);
    });
  }
  function isRecording() { return wav.recording; }

  function flatten(chunks, len) {
    const out = new Float32Array(len); let o = 0;
    for (const c of chunks) { out.set(c, o); o += c.length; }
    return out;
  }
  function encodeWav(left, right, rate) {
    const n = left.length, buffer = new ArrayBuffer(44 + n * 4), view = new DataView(buffer);
    const wr = (off, s) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };
    wr(0, 'RIFF'); view.setUint32(4, 36 + n * 4, true); wr(8, 'WAVE'); wr(12, 'fmt ');
    view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 2, true);
    view.setUint32(24, rate, true); view.setUint32(28, rate * 4, true);
    view.setUint16(32, 4, true); view.setUint16(34, 16, true);
    wr(36, 'data'); view.setUint32(40, n * 4, true);
    let off = 44;
    for (let i = 0; i < n; i++) {
      const l = Math.max(-1, Math.min(1, left[i])), r = Math.max(-1, Math.min(1, right[i]));
      view.setInt16(off, l < 0 ? l * 0x8000 : l * 0x7fff, true); off += 2;
      view.setInt16(off, r < 0 ? r * 0x8000 : r * 0x7fff, true); off += 2;
    }
    return new Blob([view], { type: 'audio/wav' });
  }

  // ════════════════════════════════════════════════════════════════════
  //  MIDI (Web MIDI API)
  // ════════════════════════════════════════════════════════════════════
  async function initMIDI() {
    if (!navigator.requestMIDIAccess) return { supported: false, inputs: [] };
    try {
      midiAccess = await navigator.requestMIDIAccess({ sysex: false });
      attachMIDI();
      midiAccess.onstatechange = attachMIDI;
      return { supported: true, inputs: midiInputs() };
    } catch (e) {
      return { supported: false, inputs: [], error: e.message };
    }
  }
  function midiInputs() {
    if (!midiAccess) return [];
    return Array.from(midiAccess.inputs.values()).map(i => ({ id: i.id, name: i.name }));
  }
  function attachMIDI() {
    if (!midiAccess) return;
    midiAccess.inputs.forEach(input => { input.onmidimessage = handleMIDI; });
  }
  function handleMIDI(e) {
    const [status, note, vel] = e.data;
    const cmd = status & 0xf0;
    if (cmd === 0x90 && vel > 0) { if (onMidiNote) onMidiNote(note, vel, true); }
    else if (cmd === 0x80 || (cmd === 0x90 && vel === 0)) { if (onMidiNote) onMidiNote(note, 0, false); }
  }
  function setMidiHandler(fn) { onMidiNote = fn; }

  // ════════════════════════════════════════════════════════════════════
  //  External sound-card input
  // ════════════════════════════════════════════════════════════════════
  async function listInputDevices() {
    if (!navigator.mediaDevices?.enumerateDevices) return [];
    try {
      // need permission first for labels
      const devs = await navigator.mediaDevices.enumerateDevices();
      return devs.filter(d => d.kind === 'audioinput').map(d => ({ id: d.deviceId, label: d.label || 'Lydinngang' }));
    } catch { return []; }
  }
  async function addInputToTrack(trackId, deviceId, monitor) {
    ensureContext();
    const t = tracks[trackId]; if (!t) throw new Error('Ukjent spor');
    if (t.inputStream) { try { t.inputStream.disconnect(); } catch {} }
    const constraints = {
      audio: {
        deviceId: deviceId ? { exact: deviceId } : undefined,
        echoCancellation: false, noiseSuppression: false, autoGainControl: false,
      },
    };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    const src = ctx.createMediaStreamSource(stream);
    src.connect(t.input);
    t.inputStream = src; t.mediaStream = stream;
    return true;
  }
  function removeInputFromTrack(trackId) {
    const t = tracks[trackId]; if (!t) return;
    try { t.inputStream && t.inputStream.disconnect(); } catch {}
    try { t.mediaStream && t.mediaStream.getTracks().forEach(tr => tr.stop()); } catch {}
    t.inputStream = null; t.mediaStream = null;
  }

  // ════════════════════════════════════════════════════════════════════
  return {
    ensureContext,
    // tracks
    createTrack, removeTrack, setInstrument,
    setVolume, setPan, setMute, setSolo, setEQ, setEQFreq, setComp,
    setDistortion, setDelay, setSidechain, setTune,
    // master
    setMasterVolume, setMultibandEnabled, setBandComp, setCrossover, getMasterAnalyser,
    // fx buses + sends + automation
    createBus, removeBus, setSend, setBusFx, setBusMute, busList,
    setParamNow, automateAt,
    // instruments
    instrumentList, instrumentType, INSTRUMENTS, defaultSynth, setSynthParam,
    // play
    noteOn, noteOff, triggerAt, midiToFreq,
    // transport
    play, stop, setBpm, setSteps, setSwing, setMetronome, setStepProvider, setAutomationProvider, setOnStep, isPlaying,
    get transport() { return transport; },
    // recording
    startRecording, stopRecording, isRecording,
    // midi
    initMIDI, midiInputs, setMidiHandler,
    // input
    listInputDevices, addInputToTrack, removeInputFromTrack,
    get ctx() { return ctx; },
  };
})();
