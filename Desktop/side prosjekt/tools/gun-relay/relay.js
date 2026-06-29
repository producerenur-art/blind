// SoundCore Gun-relay for Node-hostar (Render / Railway / Fly / lokalt).
// Dette er nøyaktig relayen vi verifiserte lokalt: browser↔browser-synk PASS begge vegar.
//
// Render (gratis, garantert å verke):
//   1) npm i gun   (package.json: "start": "node relay.js")
//   2) Render → New → Web Service → kople repo/mappe → Start command: node relay.js
//   3) Relay-URL: https://<service>.onrender.com/gun
//
// Lokalt: `node relay.js` → http://localhost:8765/gun
const Gun  = require('gun');
const http = require('http');

const PORT = process.env.PORT || 8765;
const server = http.createServer((_req, res) => { res.writeHead(200); res.end('SoundCore Gun relay up'); });

// radisk:false → ingen disk-lagring; sett til true (default) på ein host med varig disk
// om du vil at innlegg skal overleve omstart.
Gun({ web: server, radisk: false, localStorage: false });

server.listen(PORT, () => console.log('SoundCore Gun relay på :' + PORT + ' (/gun)'));
