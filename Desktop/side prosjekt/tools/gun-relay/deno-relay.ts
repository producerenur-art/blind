// SoundCore Gun-relay for Deno Deploy.
// Køyrer den same prøvde Gun-relayen (Gun({ web: server })) som vi verifiserte gjev
// browser↔browser-synk, via Deno sin node-kompat (npm:gun + node:http).
//
// Deploy: lim heile fila inn i ein ny Deno Deploy-playground (https://dash.deno.com → New Playground),
// trykk Deploy/Save. Du får ein URL som <namn>.deno.dev. Relay-endepunktet er <namn>.deno.dev/gun.
//
// Gje meg URL-en, så verifiserer eg browser↔browser mot den og wirer han inn i
// GUN_PEERS (js/chat.js + js/realtime.js). Sjå README.md i same mappe.
import Gun from "npm:gun";
import { createServer } from "node:http";

const server = createServer((req, res) => {
  // Enkel helse-/landingsrespons; Gun handterer WebSocket-oppgraderinga sjølv.
  res.writeHead(200, { "content-type": "text/plain" });
  res.end("SoundCore Gun relay up");
});

// radisk:false → inga fil-lagring (Deno Deploy er flyktig). Gun held grafen i minne
// medan isolatet er varmt; live-synk mellom tilkopla brukarar er hovudbruken.
Gun({ web: server, radisk: false, localStorage: false });

server.listen(8000);
console.log("SoundCore Gun relay lyttar på :8000 (/gun)");
