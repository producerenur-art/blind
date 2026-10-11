// AudioCompress — pakker store lydfiler (typisk 800 MB WAV) til Opus i Ogg-container i nettleseren,
// så de kommer under lagringsgrensa (Supabase: 50 MB per fil). Bruker WebCodecs AudioEncoder.
// WAV blir lest i biter rett frå disken (lite minne). Andre format blir dekoda med decodeAudioData.
const AudioCompress = (() => {
  const OUT_RATE = 48000, PRESKIP = 312, FRAME_BLOCK = 48000;

  // ── Ogg (CRC32 poly 0x04c11db7, ikkje-reflektert) ──
  const CRC = (() => { const t = new Uint32Array(256); for (let i = 0; i < 256; i++) { let r = i << 24; for (let j = 0; j < 8; j++) r = (r & 0x80000000) ? ((r << 1) ^ 0x04c11db7) : (r << 1); t[i] = r >>> 0; } return t; })();
  function crc32(b) { let c = 0; for (let i = 0; i < b.length; i++) c = ((c << 8) ^ CRC[((c >>> 24) ^ b[i]) & 0xff]) >>> 0; return c; }
  function oggPage(packets, granule, seq, type, serial) {
    const segs = [];
    for (const p of packets) { let n = p.length; while (n >= 255) { segs.push(255); n -= 255; } segs.push(n); }
    let total = 27 + segs.length; for (const p of packets) total += p.length;
    const out = new Uint8Array(total), dv = new DataView(out.buffer);
    out.set([0x4f, 0x67, 0x67, 0x53, 0, type], 0);
    dv.setUint32(6, granule % 4294967296, true); dv.setUint32(10, Math.floor(granule / 4294967296), true);
    dv.setUint32(14, serial, true); dv.setUint32(18, seq, true);
    out[26] = segs.length; out.set(segs, 27);
    let o = 27 + segs.length; for (const p of packets) { out.set(p, o); o += p.length; }
    dv.setUint32(22, crc32(out), true);
    return out;
  }
  const ascii = s => Uint8Array.from(s, c => c.charCodeAt(0));

  // ── Kjelder: { sampleRate, channels, totalFrames, read(start, n) → [Float32Array…] } ──
  async function openWav(file) {
    const head = new DataView(await file.slice(0, Math.min(file.size, 1 << 20)).arrayBuffer());
    if (head.byteLength < 44 || head.getUint32(0) !== 0x52494646 || head.getUint32(8) !== 0x57415645) return null;
    let off = 12, fmt = null, dataOff = -1, dataLen = 0;
    while (off + 8 <= head.byteLength) {
      const id = head.getUint32(off), size = head.getUint32(off + 4, true), body = off + 8;
      if (id === 0x666d7420) { // 'fmt '
        let tag = head.getUint16(body, true);
        if (tag === 0xFFFE && size >= 26) tag = head.getUint16(body + 24, true);
        fmt = { tag, ch: head.getUint16(body + 2, true), sr: head.getUint32(body + 4, true), bits: head.getUint16(body + 14, true) };
      } else if (id === 0x64617461) { dataOff = body; dataLen = size; break; } // 'data'
      off = body + size + (size & 1);
    }
    if (!fmt || dataOff < 0) return null;
    if (!((fmt.tag === 1 && [16, 24, 32].includes(fmt.bits)) || (fmt.tag === 3 && fmt.bits === 32))) return null;
    const align = fmt.ch * fmt.bits / 8;
    dataLen = Math.min(dataLen || file.size, file.size - dataOff);
    const totalFrames = Math.floor(dataLen / align), outCh = Math.min(2, fmt.ch);
    return {
      sampleRate: fmt.sr, channels: outCh, totalFrames,
      async read(start, n) {
        n = Math.min(n, totalFrames - start); if (n <= 0) return null;
        const ab = await file.slice(dataOff + start * align, dataOff + (start + n) * align).arrayBuffer();
        const dv = new DataView(ab), chans = [];
        for (let c = 0; c < outCh; c++) chans.push(new Float32Array(n));
        const bps = fmt.bits / 8;
        if (fmt.bits === 16) { const a = new Int16Array(ab, 0, n * fmt.ch); for (let i = 0; i < n; i++) for (let c = 0; c < outCh; c++) chans[c][i] = a[i * fmt.ch + c] / 32768; }
        else if (fmt.tag === 3) { const a = new Float32Array(ab, 0, n * fmt.ch); for (let i = 0; i < n; i++) for (let c = 0; c < outCh; c++) chans[c][i] = a[i * fmt.ch + c]; }
        else if (fmt.bits === 24) { for (let i = 0; i < n; i++) for (let c = 0; c < outCh; c++) { const p = (i * fmt.ch + c) * 3; chans[c][i] = ((dv.getUint8(p) | (dv.getUint8(p + 1) << 8) | (dv.getInt8(p + 2) << 16))) / 8388608; } }
        else { for (let i = 0; i < n; i++) for (let c = 0; c < outCh; c++) chans[c][i] = dv.getInt32((i * fmt.ch + c) * bps, true) / 2147483648; }
        return chans;
      },
    };
  }
  async function openDecoded(file) {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    let buf; try { buf = await ctx.decodeAudioData(await file.arrayBuffer()); } finally { ctx.close && ctx.close(); }
    const outCh = Math.min(2, buf.numberOfChannels), data = []; for (let c = 0; c < outCh; c++) data.push(buf.getChannelData(c));
    return { sampleRate: buf.sampleRate, channels: outCh, totalFrames: buf.length, async read(start, n) { n = Math.min(n, buf.length - start); return n <= 0 ? null : data.map(d => d.subarray(start, start + n)); } };
  }

  // ── Resampler (Catmull-Rom, straumande) til 48 kHz ──
  function makeResampler(inRate, ch, outRate = OUT_RATE) {
    if (inRate === outRate) return { push: a => a, flush: () => null };
    const ratio = inRate / outRate; let pos = 0, base = 0, bufs = Array.from({ length: ch }, () => new Float32Array(0));
    function run(chunk) {
      const comb = bufs.map((b, c) => { const x = new Float32Array(b.length + chunk[c].length); x.set(b); x.set(chunk[c], b.length); return x; });
      const last = base + comb[0].length - 1, n = Math.max(0, Math.ceil((last - 2 - pos) / ratio) + 1);
      const outs = comb.map(() => new Float32Array(n)); let k = 0;
      while (Math.floor(pos) + 2 <= last && k < n) {
        const i0 = Math.floor(pos), f = pos - i0, i = i0 - base;
        for (let c = 0; c < ch; c++) {
          const x = comb[c], p1 = x[i], p0 = i > 0 ? x[i - 1] : p1, p2 = x[i + 1], p3 = x[i + 2];
          outs[c][k] = 0.5 * ((2 * p1) + (-p0 + p2) * f + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f * f + (-p0 + 3 * p1 - 3 * p2 + p3) * f * f * f);
        }
        k++; pos += ratio;
      }
      const keep = Math.max(0, Math.floor(pos) - 1 - base);
      bufs = comb.map(x => x.slice(keep)); base += keep;
      return outs.map(o => o.subarray(0, k));
    }
    return { push: run, flush: () => run(Array.from({ length: ch }, () => new Float32Array(4))) };
  }

  /** Pakk `file` til Ogg/Opus-File under maxBytes. onProgress(0..1). */
  async function toOpusOgg(file, { maxBytes = 45e6, onProgress } = {}) {
    if (typeof AudioEncoder === 'undefined' || typeof AudioData === 'undefined') throw new Error('This browser cannot compress audio (use desktop Chrome)');
    const src = (await openWav(file)) || (await openDecoded(file));
    const ch = src.channels, duration = src.totalFrames / src.sampleRate;
    const bitrate = Math.max(24000, Math.min(128000, Math.floor(maxBytes * 8 * 0.95 / Math.max(1, duration))));
    const cfg = { codec: 'opus', sampleRate: OUT_RATE, numberOfChannels: ch, bitrate };
    const sup = await AudioEncoder.isConfigSupported(cfg);
    if (!sup.supported) throw new Error('Opus encoding is not supported in this browser');

    const serial = (Math.random() * 4294967295) >>> 0, parts = [];
    let seq = 0, granule = PRESKIP, pending = [], pendSegs = 0, encErr = null, outFrames = 0;
    const head = new Uint8Array(19); head.set(ascii('OpusHead')); head[8] = 1; head[9] = ch;
    new DataView(head.buffer).setUint16(10, PRESKIP, true); new DataView(head.buffer).setUint32(12, src.sampleRate, true);
    const tags = new Uint8Array(24); tags.set(ascii('OpusTags')); new DataView(tags.buffer).setUint32(8, 8, true); tags.set(ascii('siriusfm'), 12);
    parts.push(oggPage([head], 0, seq++, 0x02, serial), oggPage([tags], 0, seq++, 0, serial));
    const flushPage = (eos, g) => { if (!pending.length && !eos) return; parts.push(oggPage(pending, g == null ? granule : g, seq++, eos ? 0x04 : 0, serial)); pending = []; pendSegs = 0; };

    const enc = new AudioEncoder({
      output: chunk => {
        const d = new Uint8Array(chunk.byteLength); chunk.copyTo(d);
        const segs = Math.floor(d.length / 255) + 1;
        if (pendSegs + segs > 250) flushPage(false);
        pending.push(d); pendSegs += segs; granule += Math.round((chunk.duration || 20000) * OUT_RATE / 1e6);
        if (pending.length >= 50) flushPage(false);
      },
      error: e => { encErr = e; },
    });
    enc.configure(cfg);

    const rs = makeResampler(src.sampleRate, ch);
    const feed = async planar => {
      const n = planar[0].length; if (!n) return;
      for (let s = 0; s < n; s += FRAME_BLOCK) {
        const m = Math.min(FRAME_BLOCK, n - s), data = new Float32Array(m * ch);
        for (let c = 0; c < ch; c++) data.set(planar[c].subarray(s, s + m), c * m);
        enc.encode(new AudioData({ format: 'f32-planar', sampleRate: OUT_RATE, numberOfFrames: m, numberOfChannels: ch, timestamp: Math.round(outFrames * 1e6 / OUT_RATE), data }));
        outFrames += m;
        while (enc.encodeQueueSize > 30 && !encErr) await new Promise(r => setTimeout(r, 4));
        if (encErr) throw encErr;
      }
    };
    const READ = 1 << 18;
    for (let start = 0; start < src.totalFrames; start += READ) {
      const chunk = await src.read(start, READ); if (!chunk) break;
      await feed(rs.push(chunk));
      if (onProgress) onProgress(Math.min(1, (start + READ) / src.totalFrames));
    }
    const tail = rs.flush(); if (tail) await feed(tail);
    await enc.flush(); enc.close();
    if (encErr) throw encErr;
    // Siste side: sann sluttposisjon (utan fylling frå siste ramme)
    const realEnd = PRESKIP + Math.round(src.totalFrames * OUT_RATE / src.sampleRate);
    flushPage(true, Math.min(granule, realEnd));
    const name = (file.name || 'audio').replace(/\.[^.]+$/, '') + '.ogg';
    return new File(parts, name, { type: 'audio/ogg' });
  }

  // ── Minimal WebM-demuxer (kun Opus-lyd, som MediaRecorder lagar). Treng ikkje heile fila dekoda i minnet. ──
  function parseWebmOpus(buf) {
    const u8 = new Uint8Array(buf), dv = new DataView(buf), len = u8.length;
    const MASTER = new Set([0x18538067, 0x1654AE6B, 0xAE, 0xE1, 0x1F43B675, 0xA0]);   // Segment, Tracks, TrackEntry, Audio, Cluster, BlockGroup
    let p = 0, channels = 2, rate = 48000, head = null; const packets = [];
    function vint(keepMarker) {
      if (p >= len) return -1;
      const b = u8[p]; let n = 1, mask = 0x80;
      while (n <= 8 && !(b & mask)) { n++; mask >>= 1; }
      if (n > 8 || p + n > len) return -1;
      let v = keepMarker ? b : (b & (mask - 1)), allOnes = (b & (mask - 1)) === mask - 1;
      for (let i = 1; i < n; i++) { const x = u8[p + i]; v = v * 256 + x; if (x !== 0xff) allOnes = false; }
      p += n;
      return (!keepMarker && allOnes) ? Infinity : v;   // ukjend storleik
    }
    while (p < len) {
      const id = vint(true); if (id < 0) break;
      const size = vint(false); if (size < 0) break;
      if (MASTER.has(id)) continue;                        // gå rett inn i barna
      const end = size === Infinity ? len : Math.min(len, p + size);
      if (id === 0x63A2 && !head) head = u8.slice(p, end);                         // CodecPrivate (OpusHead)
      else if (id === 0x9F && end - p === 1) channels = u8[p];                     // Channels
      else if (id === 0xB5) { if (end - p === 8) rate = dv.getFloat64(p); else if (end - p === 4) rate = dv.getFloat32(p); }   // SamplingFrequency
      else if (id === 0xA3 || id === 0xA1) {                                       // SimpleBlock / Block
        let q = p; const b = u8[q]; let n = 1, m = 0x80; while (n <= 8 && !(b & m)) { n++; m >>= 1; }
        q += n + 2;                                         // spor-nr (vint) + 16-bit tid
        const flags = u8[q++];
        if ((flags & 0x06) === 0 && q < end) packets.push(u8.subarray(q, end));    // ingen lacing
      }
      p = end;
    }
    return { channels, rate, head, packets };
  }

  // Gi nettleseren pust UTAN setTimeout: bakgrunnsfaner struper timere til 1/s (og 1/min etter 5 min), som gjer lang
  // koding uendeleg treg. MessageChannel blir ikkje struppa.
  const _mc = (typeof MessageChannel !== 'undefined') ? new MessageChannel() : null;
  let _mcRes = [];
  if (_mc) _mc.port1.onmessage = () => { const r = _mcRes; _mcRes = []; r.forEach(f => f()); };
  function yieldNow() { return _mc ? new Promise(r => { _mcRes.push(r); _mc.port2.postMessage(0); }) : new Promise(r => setTimeout(r, 0)); }

  // WebM/Opus → MP3 strøymande (WebCodecs AudioDecoder + lamejs): minnebruken er uavhengig av lengda, så ei
  // 74-min-sending (45 MB WebM) krasjar ikkje slik decodeAudioData ville (1,7 GB flyttal). Returnerer null om
  // fila ikkje er WebM/Opus eller nettlesaren manglar AudioDecoder — då tek vanleg toMp3 over.
  async function webmToMp3(file, lame, onProgress, maxBytes) {
    if (typeof AudioDecoder === 'undefined' || typeof EncodedAudioChunk === 'undefined') return null;
    const buf = await file.arrayBuffer();
    const h = new Uint8Array(buf, 0, 4);
    if (!(h[0] === 0x1a && h[1] === 0x45 && h[2] === 0xdf && h[3] === 0xa3)) return null;
    const w = parseWebmOpus(buf);
    if (!w.packets.length) return null;
    // Varigheit frå Opus TOC-byten (rammelengd × rammer per pakke) → bitrate som held seg under maxBytes (maks 320 kbps).
    const toc = w.packets[0][0], cfgN = toc >> 3, c = toc & 3;
    const frameMs = cfgN < 12 ? [10, 20, 40, 60][cfgN % 4] : cfgN < 16 ? [10, 20][cfgN % 2] : [2.5, 5, 10, 20][cfgN % 4];
    const nFr = c === 0 ? 1 : (c === 3 ? ((w.packets[0][1] || 1) & 0x3f) : 2);
    const durSec = w.packets.length * frameMs * nFr / 1000;
    const fit = Math.floor((maxBytes || 1e12) * 8 * 0.97 / Math.max(1, durSec) / 1000);
    const kbps = [320, 256, 224, 192, 160, 128, 112, 96, 80, 64, 48].find(b => b <= fit) || 48;
    const ch = (w.channels === 1 || kbps < 80) ? 1 : 2, rate = 48000, parts = [];
    const enc = new lame.Mp3Encoder(ch, rate, kbps);
    const cfg = { codec: 'opus', sampleRate: rate, numberOfChannels: w.channels || 2 };
    if (w.head) cfg.description = w.head;
    const sup = await AudioDecoder.isConfigSupported(cfg).catch(() => null);
    if (!sup || !sup.supported) return null;
    let decErr = null, done = 0;
    const toI16 = f => { const o = new Int16Array(f.length); for (let i = 0; i < f.length; i++) { const v = Math.max(-1, Math.min(1, f[i])); o[i] = v < 0 ? v * 32768 : v * 32767; } return o; };
    const dec = new AudioDecoder({
      output: ad => {
        try {
          const n = ad.numberOfFrames, chs = ad.numberOfChannels, pl = [];
          for (let c = 0; c < Math.min(2, chs); c++) { const a = new Float32Array(n); ad.copyTo(a, { planeIndex: c, format: 'f32-planar' }); pl.push(a); }
          const L = toI16(pl[0]), R = pl[1] ? toI16(pl[1]) : L;
          let M = L; if (ch === 1 && pl[1]) { M = new Int16Array(n); for (let i = 0; i < n; i++) M[i] = (L[i] + R[i]) >> 1; }
          for (let s0 = 0; s0 < n; s0 += 1152 * 20) {
            const e = Math.min(n, s0 + 1152 * 20);
            const out = ch === 1 ? enc.encodeBuffer(M.subarray(s0, e)) : enc.encodeBuffer(L.subarray(s0, e), R.subarray(s0, e));
            if (out.length) parts.push(new Uint8Array(out));
          }
        } catch (e) { decErr = decErr || e; }
        try { ad.close(); } catch (e) {}
      },
      error: e => { decErr = decErr || e; },
    });
    dec.configure(cfg);
    const total = w.packets.length;
    for (let i = 0; i < total; i++) {
      if (decErr) throw decErr;
      dec.decode(new EncodedAudioChunk({ type: 'key', timestamp: i * 20000, data: w.packets[i] }));
      if (i % 50 === 0) {
        // Kø-grense: vent på 'dequeue' (ikkje timer) til dekoderen har tatt unna; reserve-timer om hendinga uteblir.
        while (dec.decodeQueueSize > 100) {
          await new Promise(res => {
            let t = null; const h = () => { dec.removeEventListener('dequeue', h); if (t) clearTimeout(t); res(); };
            dec.addEventListener('dequeue', h); t = setTimeout(h, 1000);
          });
        }
        if (i % 200 === 0 && onProgress) onProgress(i / total);
        await yieldNow();
      }
    }
    await dec.flush();
    try { dec.close(); } catch (e) {}
    if (decErr) throw decErr;
    const end = enc.flush(); if (end.length) parts.push(new Uint8Array(end));
    if (onProgress) onProgress(1);
    return new File(parts, (file.name || 'audio').replace(/\.[^.]+$/, '') + '.mp3', { type: 'audio/mpeg' });
  }

  // MP3 (lamejs) — spelast overalt, òg på iPhone/iPad der Ogg/Opus og webm ikkje fungerer.
  const LAME_URL = 'https://cdnjs.cloudflare.com/ajax/libs/lamejs/1.2.1/lame.min.js';
  function loadLame() {
    if (window.lamejs) return Promise.resolve(window.lamejs);
    return new Promise((res, rej) => {
      const s = document.createElement('script'); s.src = LAME_URL;
      s.onload = () => window.lamejs ? res(window.lamejs) : rej(new Error('lamejs missing'));
      s.onerror = () => rej(new Error('Could not load the MP3 encoder'));
      document.head.appendChild(s);
    });
  }
  /** Pakk `file` til MP3-File under maxBytes (CBR 64–128 kbps). onProgress(0..1). */
  async function toMp3(file, { maxBytes = 45e6, onProgress } = {}) {
    const lame = await loadLame();
    // WebM/Opus (live-opptak): strøymande dekoding — lang lyd treng ikkje plass til heile PCM-en i minnet.
    if (!/wav/i.test(file.type || '')) {
      let viaWebm = null;
      try { viaWebm = await webmToMp3(file, lame, onProgress, maxBytes); } catch (e) { console.warn('[AudioCompress] strøymande WebM→MP3 feila, prøver vanleg dekoding:', e.message || e); }
      if (viaWebm) return viaWebm;
    }
    const src = (await openWav(file)) || (await openDecoded(file));
    const duration = src.totalFrames / src.sampleRate;
    const fit = Math.floor(maxBytes * 8 * 0.97 / Math.max(1, duration) / 1000);
    const kbps = [320, 256, 224, 192, 160, 128, 112, 96, 80, 64, 48].find(b => b <= fit) || 48;
    const ch = kbps < 80 ? 1 : src.channels, rate = [32000, 44100, 48000].includes(src.sampleRate) ? src.sampleRate : 44100;
    const enc = new lame.Mp3Encoder(ch, rate, kbps), rs = makeResampler(src.sampleRate, src.channels, rate), parts = [];
    const toI16 = f => { const o = new Int16Array(f.length); for (let i = 0; i < f.length; i++) { const v = Math.max(-1, Math.min(1, f[i])); o[i] = v < 0 ? v * 32768 : v * 32767; } return o; };
    const feed = planar => {
      const n = planar[0].length; if (!n) return;
      const L = toI16(planar[0]), R = planar[1] ? toI16(planar[1]) : L;
      let mono = L; if (ch === 1 && planar[1]) { mono = new Int16Array(n); for (let i = 0; i < n; i++) mono[i] = (L[i] + R[i]) >> 1; }
      for (let s = 0; s < n; s += 1152 * 40) {
        const e = Math.min(n, s + 1152 * 40);
        const out = ch === 1 ? enc.encodeBuffer(mono.subarray(s, e)) : enc.encodeBuffer(L.subarray(s, e), R.subarray(s, e));
        if (out.length) parts.push(new Uint8Array(out));
      }
    };
    const READ = 1 << 18;
    for (let start = 0, i = 0; start < src.totalFrames; start += READ, i++) {
      const chunk = await src.read(start, READ); if (!chunk) break;
      feed(rs.push(chunk));
      if (onProgress) onProgress(Math.min(1, (start + READ) / src.totalFrames));
      if (i % 4 === 0) await yieldNow();   // la nettlesaren puste
    }
    const tail = rs.flush(); if (tail) feed(tail);
    const end = enc.flush(); if (end.length) parts.push(new Uint8Array(end));
    return new File(parts, (file.name || 'audio').replace(/\.[^.]+$/, '') + '.mp3', { type: 'audio/mpeg' });
  }

  return { toOpusOgg, toMp3 };
})();
if (typeof window !== 'undefined') window.AudioCompress = AudioCompress;
