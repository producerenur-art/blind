#!/usr/bin/env node
// Minimal WebRTC-signaling-server — REN Node, null avhengigheter.
// HTTP + Server-Sent Events. Relayer SDP/ICE mellom DJ (broadcaster) og lyttere,
// og serverer broadcast.html / listen.html fra samme origin (unngår CORS).
//
//   node tools/signaling-server.js
//   DJ:     http://localhost:8770/dj
//   Lytter: http://<din-LAN-IP>:8770/listen   (samme WiFi)
//
// Skalering: DJ-nettleseren lager én peer-connection per lytter (mesh). Fint for
// test / liten lyttergruppe. For stor skala → SFU (LiveKit/Cloudflare Calls).

const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT = process.env.SIGNAL_PORT || 8770;
const DIR  = __dirname;

// room -> Map(peerId -> { res, role })
const rooms = new Map();
function room(id) { if (!rooms.has(id)) rooms.set(id, new Map()); return rooms.get(id); }
function send(res, obj) { res.write(`data: ${JSON.stringify(obj)}\n\n`); }
function djOf(r) { for (const [id, p] of r) if (p.role === 'dj') return { id, ...p }; return null; }

const server = http.createServer((req, res) => {
  const u = new URL(req.url, `http://${req.headers.host}`);
  const p = u.pathname;

  // ── SSE-strøm: klienter abonnerer her ──────────────────────────────
  if (p === '/events') {
    const roomId = u.searchParams.get('room') || 'live';
    const peerId = u.searchParams.get('peerId');
    const role   = u.searchParams.get('role') || 'listener';
    if (!peerId) { res.writeHead(400); return res.end('peerId kreves'); }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });
    res.write('retry: 2000\n\n');

    const r = room(roomId);
    r.set(peerId, { res, role });
    console.log(`[+] ${role} ${peerId} → rom "${roomId}" (${r.size} i rommet)`);

    // Si fra hvem som er DJ (så lytter vet hvem han skal signalere), og varsle DJ om ny lytter.
    const dj = djOf(r);
    if (role === 'listener') {
      if (dj && dj.id !== peerId) { send(dj.res, { type: 'listener-join', from: peerId }); send(res, { type: 'dj-here', from: dj.id }); }
      else send(res, { type: 'no-dj' });
    } else if (role === 'dj') {
      // Gi DJ-en eksisterende lyttere (hvis han koblet til etter dem).
      for (const [id, peer] of r) if (peer.role === 'listener') send(res, { type: 'listener-join', from: id });
    }

    const ping = setInterval(() => res.write(': ping\n\n'), 15000);
    req.on('close', () => {
      clearInterval(ping);
      r.delete(peerId);
      console.log(`[-] ${role} ${peerId} forlot "${roomId}" (${r.size} igjen)`);
      // Varsle motpart om frafall.
      for (const [, peer] of r) send(peer.res, { type: 'peer-left', from: peerId });
    });
    return;
  }

  // ── Relay: POST {room,to,from,data} → push til "to" sin SSE-strøm ──
  if (p === '/signal' && req.method === 'POST') {
    let body = '';
    req.on('data', c => { body += c; if (body.length > 1e6) req.destroy(); });
    req.on('end', () => {
      try {
        const { room: roomId = 'live', to, from, data } = JSON.parse(body);
        const target = room(roomId).get(to);
        if (target) send(target.res, { type: 'signal', from, data });
        res.writeHead(target ? 200 : 404, { 'Access-Control-Allow-Origin': '*' });
        res.end(target ? 'ok' : 'mottaker borte');
      } catch (e) { res.writeHead(400); res.end('bad json'); }
    });
    return;
  }
  if (req.method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type', 'Access-Control-Allow-Methods': 'POST,OPTIONS' });
    return res.end();
  }

  // ── Statiske filer ────────────────────────────────────────────────
  const map = { '/': 'broadcast.html', '/dj': 'broadcast.html', '/listen': 'listen.html' };
  let file = map[p] || p.replace(/^\//, '');
  const full = path.join(DIR, file);
  if (!full.startsWith(DIR) || !fs.existsSync(full) || fs.statSync(full).isDirectory()) {
    res.writeHead(404); return res.end('404');
  }
  const ext = path.extname(full).toLowerCase();
  const ct = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': ct + '; charset=utf-8' });
  fs.createReadStream(full).pipe(res);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🎚️  Signaling-server kjører på port ${PORT}`);
  console.log(`   DJ:     http://localhost:${PORT}/dj`);
  console.log(`   Lytter: http://<LAN-IP>:${PORT}/listen   (samme WiFi)\n`);
});
