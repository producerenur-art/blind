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
  function iceServers() {
    const c = window.CONFIG || {};
    const list = [{ urls: [
      'stun:stun.l.google.com:19302',
      'stun:stun1.l.google.com:19302',
      'stun:stun.cloudflare.com:3478',
    ] }];
    if (c.TURN_URL && c.TURN_USERNAME && c.TURN_CREDENTIAL) {
      // Egen TURN (coturn/Twilio/metered) — anbefalt i produksjon.
      list.push({ urls: c.TURN_URL, username: c.TURN_USERNAME, credential: c.TURN_CREDENTIAL });
    } else {
      // Gratis offentlig fallback-TURN. Flere transporter for å passere streng NAT/brannmur:
      // UDP/80, ren TCP/443 og TLS (turns)/443 — sistnevnte punkterer brannmurer som blokkerer UDP.
      list.push({
        urls: [
          'turn:openrelay.metered.ca:80',
          'turn:openrelay.metered.ca:443',
          'turn:openrelay.metered.ca:443?transport=tcp',
          'turns:openrelay.metered.ca:443?transport=tcp',
        ],
        username: 'openrelayproject',
        credential: 'openrelayproject',
      });
    }
    return { iceServers: list };
  }

  function supaClient() {
    const c = window.CONFIG || {};
    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
      throw new Error('supabase-js er ikke lastet (sjekk CDN-script i index.html)');
    }
    if (!c.SUPABASE_URL || !c.SUPABASE_ANON_KEY) throw new Error('SUPABASE_URL/ANON_KEY mangler i CONFIG');
    return window.supabase.createClient(c.SUPABASE_URL, c.SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  }

  const channelName = room => 'livemix:' + room;
  const rid = pfx => pfx + '_' + Math.random().toString(36).slice(2, 8);

  // ── DJ (kringkaster) ────────────────────────────────────────────────
  function broadcaster(room, stream, { onPeerCount, onLog } = {}) {
    const id = rid('dj');
    const peers = new Map();           // listenerId -> RTCPeerConnection
    const client = supaClient();
    const ch = client.channel(channelName(room), { config: { broadcast: { self: false } } });
    const log = m => onLog && onLog(m);
    const count = () => onPeerCount && onPeerCount([...peers.values()].filter(p => p.connectionState === 'connected').length);
    const sig = (event, payload) => ch.send({ type: 'broadcast', event, payload });
    const sigTo = (to, data) => sig('signal', { to, from: id, data });

    async function addListener(listenerId) {
      if (peers.has(listenerId)) return;
      const pc = new RTCPeerConnection(iceServers());
      peers.set(listenerId, pc);
      stream.getAudioTracks().forEach(t => pc.addTrack(t, stream));
      pc.onicecandidate = e => { if (e.candidate) sigTo(listenerId, { type: 'ice', candidate: e.candidate }); };
      pc.onconnectionstatechange = () => {
        log('Lytter ' + listenerId + ': ' + pc.connectionState);
        if (['failed', 'closed', 'disconnected'].includes(pc.connectionState)) { pc.close(); peers.delete(listenerId); }
        count();
      };
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sigTo(listenerId, { type: 'offer', sdp: pc.localDescription });
      log('Sendte tilbud til ' + listenerId);
    }

    ch.on('broadcast', { event: 'hello' }, ({ payload }) => { if (payload.room === room) addListener(payload.from); })
      .on('broadcast', { event: 'bye' }, ({ payload }) => { const pc = peers.get(payload.from); if (pc) { pc.close(); peers.delete(payload.from); count(); } })
      .on('broadcast', { event: 'signal' }, async ({ payload }) => {
        if (payload.to !== id) return;
        const pc = peers.get(payload.from); if (!pc) return;
        const d = payload.data;
        if (d.type === 'answer') { try { await pc.setRemoteDescription(d.sdp); } catch (e) { log('answer-feil: ' + e.message); } }
        else if (d.type === 'ice') { try { await pc.addIceCandidate(d.candidate); } catch (e) {} }
      })
      .subscribe(status => {
        log('Signaling: ' + status);
        if (status === 'SUBSCRIBED') sig('dj-online', { room, from: id });  // be eksisterende lyttere melde seg
      });

    return {
      id,
      get listeners() { return [...peers.values()].filter(p => p.connectionState === 'connected').length; },
      stop() {
        peers.forEach(p => p.close()); peers.clear();
        try { sig('dj-offline', { room, from: id }); } catch (e) {}
        client.removeChannel(ch);
      },
    };
  }

  // ── Lytter ──────────────────────────────────────────────────────────
  function listener(room, { onTrack, onState, onLog } = {}) {
    const id = rid('ln');
    let pc = null, djId = null;
    const client = supaClient();
    const ch = client.channel(channelName(room), { config: { broadcast: { self: false } } });
    const log = m => onLog && onLog(m);
    const sig = (event, payload) => ch.send({ type: 'broadcast', event, payload });
    const sigTo = (to, data) => sig('signal', { to, from: id, data });

    ch.on('broadcast', { event: 'dj-online' }, ({ payload }) => {
        if (payload.room !== room) return;
        djId = payload.from; sig('hello', { room, from: id }); log('DJ online — ber om strøm');
      })
      .on('broadcast', { event: 'dj-offline' }, () => { onState && onState('dj-offline'); })
      .on('broadcast', { event: 'signal' }, async ({ payload }) => {
        if (payload.to !== id) return;
        const d = payload.data;
        if (d.type === 'offer') {
          djId = payload.from;
          pc = new RTCPeerConnection(iceServers());
          pc.onicecandidate = e => { if (e.candidate) sigTo(djId, { type: 'ice', candidate: e.candidate }); };
          pc.onconnectionstatechange = () => onState && onState(pc.connectionState);
          pc.ontrack = e => onTrack && onTrack(e.streams[0]);
          try {
            await pc.setRemoteDescription(d.sdp);
            const ans = await pc.createAnswer();
            await pc.setLocalDescription(ans);
            sigTo(djId, { type: 'answer', sdp: pc.localDescription });
          } catch (e) { log('svar-feil: ' + e.message); }
        } else if (d.type === 'ice' && pc) { try { await pc.addIceCandidate(d.candidate); } catch (e) {} }
      })
      .subscribe(status => {
        log('Signaling: ' + status);
        if (status === 'SUBSCRIBED') sig('hello', { room, from: id });  // DJ kan alt være online
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
