// LiveBroadcast — sanntids DJ-kringkasting over WebRTC, med Supabase Realtime som
// signaling-kanal (ingen egen server). DJ-nettleseren lager én peer-tilkobling per
// lytter (mesh) — fint for små/mellomstore lyttergrupper. For stor skala → SFU.
//
// Avhenger av: window.supabase (CDN, allerede i index.html) + window.CONFIG
// (SUPABASE_URL + SUPABASE_ANON_KEY). Begge finnes alt i prosjektet.
//
//   const dj = LiveBroadcast.broadcaster('rom-id', mediaStream, { onPeerCount, onLog });
//   const ln = LiveBroadcast.listener('rom-id', { onTrack, onState, onLog });
const LiveBroadcast = (() => {
  // ICE: gratis STUN alltid. TURN (for å passere brannmur/NAT over internett)
  // hentes fra CONFIG hvis satt, ellers et offentlig test-TURN (Open Relay).
  // ICE-oppsett. STUN alltid; TURN-relay frå /api/turn (Cloudflare, kortlevde nøklar) eller
  // CONFIG.TURN_*. Den gamle gratis openrelay.metered.ca-TURN-en er DAUD (verifisert 2026-10-07:
  // ingen relay-kandidatar) og er fjerna — han bremsa berre tilkoplinga.
  const STUN = { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302', 'stun:stun.cloudflare.com:3478'] };
  let _turnList = null, _turnAt = 0, _turnPromise = null;
  function iceServers() {
    const c = window.CONFIG || {};
    const list = [STUN];
    if (c.TURN_URL && c.TURN_USERNAME && c.TURN_CREDENTIAL) {
      list.push({ urls: c.TURN_URL, username: c.TURN_USERNAME, credential: c.TURN_CREDENTIAL });
    }
    if (_turnList) list.push(..._turnList);
    return { iceServers: list };
  }
  // Hentar relay-nøklar éin gong (cache 50 min). Feil/timeout → berre STUN, aldri blokkering.
  function loadIce() {
    if (_turnList && Date.now() - _turnAt < 50 * 60 * 1000) return Promise.resolve();
    if (_turnPromise) return _turnPromise;
    _turnPromise = (async () => {
      try {
        const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 4000);
        const r = await fetch('/api/turn', { cache: 'no-store', signal: ctl.signal }); clearTimeout(t);
        if (!r.ok) { console.warn('[LiveBroadcast] /api/turn svarte ' + r.status + ' — kjører utan TURN-relay'); return; }
        const j = await r.json();
        const relay = (j.iceServers || []).filter(x => x && x.username && x.credential);
        if (relay.length) { _turnList = relay; _turnAt = Date.now(); }
      } catch (e) { console.warn('[LiveBroadcast] kunne ikkje hente TURN (' + (e && e.message || e) + ') — kjører utan relay'); }
      finally { _turnPromise = null; }
    })();
    return _turnPromise;
  }
  loadIce();

  // Opus for MUSIKK: stereo + høg bitrate + FEC, utan DTX. WebRTC-standarden er tale (mono, ~32 kbps) → tynn/hakkete lyd.
  function tuneOpus(sdp) {
    if (!sdp) return sdp;
    const m = /a=rtpmap:(\d+) opus\/48000\/2/i.exec(sdp);
    if (!m) return sdp;
    const pt = m[1];
    const want = 'stereo=1;sprop-stereo=1;maxaveragebitrate=128000;maxplaybackrate=48000;useinbandfec=1;usedtx=0;cbr=0';
    const re = new RegExp('(a=fmtp:' + pt + ' )([^\\r\\n]*)');
    if (re.test(sdp)) {
      return sdp.replace(re, (_, a, b) => {
        const keep = b.split(';').filter(x => x && !/^(stereo|sprop-stereo|maxaveragebitrate|maxplaybackrate|useinbandfec|usedtx|cbr)=/.test(x));
        return a + keep.concat(want.split(';')).join(';');
      });
    }
    return sdp.replace(m[0], m[0] + '\r\na=fmtp:' + pt + ' ' + want);
  }
  // Lyd har førsteprioritet; video (stillbilde/kamera) strupast hardt så han aldri tek båndbredde
  // eller koding-CPU frå lyden — éin koder per lytter i mesh, så video er den dyre delen.
  async function setAudioBitrate(pc, bps) {
    for (const sd of pc.getSenders()) {
      try {
        if (!sd.track) continue;
        const pr = sd.getParameters(); pr.encodings = pr.encodings && pr.encodings.length ? pr.encodings : [{}];
        const e0 = pr.encodings[0];
        if (sd.track.kind === 'audio') { e0.maxBitrate = bps; e0.priority = 'high'; e0.networkPriority = 'high'; }
        else { e0.maxBitrate = 600000; e0.maxFramerate = 15; e0.priority = 'very-low'; e0.networkPriority = 'very-low'; }
        await sd.setParameters(pr);
      } catch (e) {}
    }
  }

  // Adaptiv jitter-buffer på lytter: måler kor mykje lyd nettlesaren må dikte opp (concealedSamples) og
  // aukar bufferet stegvis (maks 3 s) når det hakkar — sunt nett beheld låg forsinking.
  function _adaptJitter(pc, receiver) {
    let prevTotal = 0, prevConc = 0, target = 800;
    const timer = setInterval(async () => {
      if (pc.connectionState === 'closed' || pc.connectionState === 'failed') { clearInterval(timer); return; }
      try {
        const stats = await pc.getStats(); let tot = 0, conc = 0;
        stats.forEach(r => { if (r.type === 'inbound-rtp' && r.kind === 'audio') { tot = r.totalSamplesReceived || 0; conc = r.concealedSamples || 0; } });
        const dT = tot - prevTotal, dC = conc - prevConc; prevTotal = tot; prevConc = conc;
        if (dT > 0 && dC / dT > 0.03 && target < 3000) {
          target = Math.min(3000, target + 400);
          receiver.jitterBufferTarget = target; receiver.playoutDelayHint = target / 1000;
        }
      } catch (e) {}
    }, 4000);
  }

  // Anonym lyttar-måling: kvar 10. s sender lyttaren eit lite stats-sammendrag til DJ-en over same
  // signalkanal (ingen database). DJ-en ser kven som hakkar (concealed = lyd nettlesaren måtte dikte opp).
  function _reportStats(pc, getDj, sig, room, id) {
    const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '') || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    let pT = 0, pC = 0, pL = 0, pR = 0;
    const timer = setInterval(async () => {
      if (pc.connectionState === 'closed' || pc.connectionState === 'failed') { clearInterval(timer); return; }
      try {
        const st = await pc.getStats(); let tot = 0, conc = 0, lost = 0, recv = 0, jit = 0, rtt = 0, route = '?';
        const byId = {}; st.forEach(r => { byId[r.id] = r; });
        st.forEach(r => {
          if (r.type === 'inbound-rtp' && r.kind === 'audio') { tot = r.totalSamplesReceived || 0; conc = r.concealedSamples || 0; lost = r.packetsLost || 0; recv = r.packetsReceived || 0; jit = r.jitter || 0; }
          if (r.type === 'candidate-pair' && (r.nominated || r.state === 'succeeded') && r.currentRoundTripTime) {
            rtt = r.currentRoundTripTime;
            const lc = byId[r.localCandidateId], rc = byId[r.remoteCandidateId];
            route = (lc && lc.candidateType === 'relay') || (rc && rc.candidateType === 'relay') ? 'relay' : 'direkte';
          }
        });
        const dT = tot - pT, dC = conc - pC, dL = lost - pL, dR = recv - pR; pT = tot; pC = conc; pL = lost; pR = recv;
        if (dT <= 0) return;
        const r1 = x => Math.round(x * 10) / 10;
        sig('stats', { room, from: id, to: getDj(), mobile, concealedPct: r1(100 * dC / dT), lossPct: r1(100 * dL / Math.max(1, dL + dR)), jitterMs: Math.round(jit * 1000), rttMs: Math.round(rtt * 1000), route });
      } catch (e) {}
    }, 10000);
  }

  function supaClient() {
    const c = window.CONFIG || {};
    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
      throw new Error('supabase-js is not loaded (check the CDN script in index.html)');
    }
    if (!c.SUPABASE_URL || !c.SUPABASE_ANON_KEY) throw new Error('SUPABASE_URL/ANON_KEY missing in CONFIG');
    return window.supabase.createClient(c.SUPABASE_URL, c.SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  }

  const channelName = room => 'livemix:' + room;
  const rid = pfx => pfx + '_' + Math.random().toString(36).slice(2, 8);

  // ── DJ (kringkaster) ────────────────────────────────────────────────
  function broadcaster(room, stream, { onPeerCount, onLog, onStats } = {}) {
    const id = rid('dj');
    const peers = new Map();           // listenerId -> RTCPeerConnection
    const lstats = new Map();          // listenerId -> siste stats-rapport frå lyttaren
    const client = supaClient();
    const ch = client.channel(channelName(room), { config: { broadcast: { self: false } } });
    const log = m => onLog && onLog(m);
    const count = () => onPeerCount && onPeerCount([...peers.values()].filter(p => p.connectionState === 'connected').length);
    const sig = (event, payload) => ch.send({ type: 'broadcast', event, payload });
    const sigTo = (to, data) => sig('signal', { to, from: id, data });

    async function addListener(listenerId, audioOnly) {
      if (peers.has(listenerId)) return;
      await loadIce();
      if (peers.has(listenerId)) return;
      const pc = new RTCPeerConnection(iceServers());
      peers.set(listenerId, pc);
      // Send lyd + ev. video (stillbilde-canvas eller laptop-kamera). Lyttarar som ikkje viser bilete
      // (hovudradioen, særleg mobil) ber om audioOnly: då hoppar vi over videosporet — sparer éin
      // programvare-VP8-koder på DJ-maskina og ~300 kbps per lyttar.
      stream.getTracks().filter(t => !(audioOnly && t.kind === 'video')).forEach(t => pc.addTrack(t, stream));
      pc.onicecandidate = e => { if (e.candidate) sigTo(listenerId, { type: 'ice', candidate: e.candidate }); };
      pc.onconnectionstatechange = () => {
        log('Listener ' + listenerId + ': ' + pc.connectionState);
        // 'disconnected' er ofte forbigåande (nettverksglipp som løyser seg på sekund). Å lukke med ein
        // gong gav høyrbart brot + full ny oppkopling — gje 8 s ro, lukk berre om det ikkje kjem tilbake.
        clearTimeout(pc._dcTimer);
        if (['failed', 'closed'].includes(pc.connectionState)) { pc.close(); peers.delete(listenerId); }
        else if (pc.connectionState === 'disconnected') {
          pc._dcTimer = setTimeout(() => { if (pc.connectionState !== 'connected') { try { pc.close(); } catch (e) {} if (peers.get(listenerId) === pc) peers.delete(listenerId); count(); } }, 8000);
        }
        count();
      };
      const offer = await pc.createOffer();
      offer.sdp = tuneOpus(offer.sdp);
      await pc.setLocalDescription(offer);
      setAudioBitrate(pc, 128000);
      sigTo(listenerId, { type: 'offer', sdp: pc.localDescription });
      log('Sent offer to ' + listenerId);
    }

    ch.on('broadcast', { event: 'hello' }, ({ payload }) => { if (payload.room === room) addListener(payload.from, !!payload.audioOnly); })
      .on('broadcast', { event: 'bye' }, ({ payload }) => { const pc = peers.get(payload.from); if (pc) { pc.close(); peers.delete(payload.from); count(); } })
      .on('broadcast', { event: 'stats' }, ({ payload }) => {
        if (!payload || payload.room !== room || !peers.has(payload.from)) return;
        lstats.set(payload.from, Object.assign({ at: Date.now() }, payload));
        if (onStats) { try { onStats([...lstats.values()]); } catch (e) {} }
        const bad = payload.concealedPct > 3 || payload.lossPct > 2;
        if (bad) log('⚠ ' + (payload.mobile ? 'Mobil' : 'PC') + ' ' + payload.from + ': hakk ' + payload.concealedPct + '%, tap ' + payload.lossPct + '%, jitter ' + payload.jitterMs + ' ms, RTT ' + payload.rttMs + ' ms, rute ' + payload.route);
      })
      .on('broadcast', { event: 'signal' }, async ({ payload }) => {
        if (payload.to !== id) return;
        const pc = peers.get(payload.from); if (!pc) return;
        const d = payload.data;
        if (d.type === 'answer') { try { await pc.setRemoteDescription(d.sdp); } catch (e) { log('answer error: ' + e.message); } }
        else if (d.type === 'ice') { try { await pc.addIceCandidate(d.candidate); } catch (e) {} }
      })
      .subscribe(status => {
        log('Signaling: ' + status);
        if (status === 'SUBSCRIBED') sig('dj-online', { room, from: id });  // be eksisterende lyttere melde seg
      });

    return {
      id,
      get listeners() { return [...peers.values()].filter(p => p.connectionState === 'connected').length; },
      get listenerStats() { return [...lstats.values()].filter(x => peers.has(x.from)); },
      stop() {
        peers.forEach(p => p.close()); peers.clear();
        try { sig('dj-offline', { room, from: id }); } catch (e) {}
        client.removeChannel(ch);
      },
    };
  }

  // ── Lytter ──────────────────────────────────────────────────────────
  function listener(room, { onTrack, onState, onLog, audioOnly } = {}) {
    const id = rid('ln');
    let pc = null, djId = null;
    const client = supaClient();
    const ch = client.channel(channelName(room), { config: { broadcast: { self: false } } });
    const log = m => onLog && onLog(m);
    const sig = (event, payload) => ch.send({ type: 'broadcast', event, payload });
    const sigTo = (to, data) => sig('signal', { to, from: id, data });

    ch.on('broadcast', { event: 'dj-online' }, ({ payload }) => {
        if (payload.room !== room) return;
        djId = payload.from; sig('hello', { room, from: id, audioOnly: !!audioOnly }); log('DJ online — requesting stream');
      })
      .on('broadcast', { event: 'dj-offline' }, () => { onState && onState('dj-offline'); })
      .on('broadcast', { event: 'signal' }, async ({ payload }) => {
        if (payload.to !== id) return;
        const d = payload.data;
        if (d.type === 'offer') {
          djId = payload.from;
          await loadIce();   // sikrar relay-nøklar (maks 4 s) FØR tilkoplinga byggjast
          pc = new RTCPeerConnection(iceServers());
          pc.onicecandidate = e => { if (e.candidate) sigTo(djId, { type: 'ice', candidate: e.candidate }); };
          // 'disconnected' kan hela av seg sjølv — gje 8 s før vi melder det vidare (og dermed byggjer ny lytter).
          pc.onconnectionstatechange = () => {
            clearTimeout(pc._dcTimer);
            const s = pc.connectionState;
            if (s === 'disconnected') { const me = pc; pc._dcTimer = setTimeout(() => { if (me === pc && me.connectionState !== 'connected') onState && onState('disconnected'); }, 8000); }
            else onState && onState(s);
          };
          pc.ontrack = e => {
            // Mer jitter-buffer på lytter-sida: mobilnett svingar, litt ekstra forsinking gir jamn lyd.
            try { if (e.receiver) { e.receiver.jitterBufferTarget = 800; e.receiver.playoutDelayHint = 0.8; } } catch (err) {}
            if (e.track && e.track.kind === 'audio') { _adaptJitter(pc, e.receiver); _reportStats(pc, () => djId, sig, room, id); }
            onTrack && onTrack(e.streams[0]);
          };
          try {
            await pc.setRemoteDescription(d.sdp);
            const ans = await pc.createAnswer();
            ans.sdp = tuneOpus(ans.sdp);
            await pc.setLocalDescription(ans);
            sigTo(djId, { type: 'answer', sdp: pc.localDescription });
          } catch (e) { log('answer error: ' + e.message); }
        } else if (d.type === 'ice' && pc) { try { await pc.addIceCandidate(d.candidate); } catch (e) {} }
      })
      .subscribe(status => {
        log('Signaling: ' + status);
        if (status === 'SUBSCRIBED') sig('hello', { room, from: id, audioOnly: !!audioOnly });  // DJ kan alt være online
      });

    return {
      id,
      leave() { try { sig('bye', { room, from: id }); } catch (e) {} if (pc) pc.close(); client.removeChannel(ch); },
    };
  }

  return { broadcaster, listener, channelName, iceServers };
})();

if (typeof window !== 'undefined') window.LiveBroadcast = LiveBroadcast;
if (typeof module !== 'undefined' && module.exports) module.exports = LiveBroadcast;
