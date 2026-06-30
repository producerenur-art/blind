// test-livestream-visual.js — verifiserer «kun lyd / velg bilde eller kamera»:
//   • Sendetid-editor får cover-bilde-felt + OBS audio-only-guide (broadcastschedule)
//   • Live-banner viser cover-bildet når sendingen er kun lyd (kamera av)
//   • DJ-konsollen får bilde/kamera-bryter + bilde-opplasting (livemix)
//   • Broadcaster sender video-spor; lytteren viser video (livebroadcast/livemix)
// Banner-delen kjøres ekte i VM; WebRTC-media kan ikke kjøres headless → kildesjekk.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; console.log('  \x1b[32m✓\x1b[0m', msg); } else { fail++; console.log('  \x1b[31m✗ FEIL:\x1b[0m', msg); } };

// ── 1) Live-banner viser cover-bildet for kun-lyd-sending (kjøres ekte) ──────
global.window = global;
global.Icon = () => '';
global.setInterval = () => 0;
const now = Date.now();
const liveSlot = new Date(now - 30 * 60000).toISOString();
const COVER = 'data:image/png;base64,iVBORw0KGgoAAAANS';     // dummy data-URL
const audioOnlyLive = [{ id: 'b1', slot: liveSlot, hours: 2, room: 'rom', title: 'Ambient', youtubeId: '', coverUrl: COVER }];
const USERS = {
  paid:  { username: 'paid', displayName: 'DJ Paid', role: 'dj', email: 'paid@x.no',
           broadcasts: audioOnlyLive, liveMixBookings: [{ product: 'livemix', slot: liveSlot, hours: 2 }] },
};
global.Auth = { current: () => null, getUsers: () => USERS };
global.LiveMix = { canGoLive: () => ({ ok: false, devBypass: false, owner: false, active: null, next: null }), openBooking: () => {} };
const BS = require('../js/broadcastschedule.js');

console.log('\nLive-banner — cover-bilde ved kun lyd (kamera av)');
const visitor = BS.liveBanner(USERS.paid, false);
ok(visitor.includes('LIVE NÅ'), 'betalt kun-lyd-sending vises som live');
ok(visitor.includes(`src="${COVER}"`), 'cover-bildet vises i banneret');
ok(visitor.includes('Hør live'), 'besøkende får «Hør live»-knapp (lyd)');
ok(!visitor.includes('youtube.com/embed'), 'ingen YouTube-embed når det er kun lyd');
ok(typeof BS.setCover === 'function', 'BroadcastSchedule.setCover er eksponert');

// ── 2) Sendetid-editor: cover-felt + OBS-guide (kildesjekk) ──────────────────
console.log('\nSendetid-editor (broadcastschedule.js)');
const bsSrc = read('js/broadcastschedule.js');
ok(bsSrc.includes('id="bs-cover"'), 'cover-bilde fil-input finnes');
ok(bsSrc.includes('BroadcastSchedule.setCover(this)'), 'cover-velger kaller setCover');
ok(/Traktor[\s\S]*OBS[\s\S]*streamn/i.test(bsSrc), 'OBS audio-only-guide (Traktor→OBS→streamnøkkel)');
ok(bsSrc.includes('youtubeId, coverUrl, createdAt'), 'addEntry lagrer coverUrl på sendetiden');

// ── 3) DJ-konsoll: bilde/kamera-bryter (kildesjekk) ──────────────────────────
console.log('\nDJ-konsoll (livemix.js)');
const lmSrc = read('js/livemix.js');
ok(lmSrc.includes("id=\"bc-vis-image\"") && lmSrc.includes("id=\"bc-vis-camera\""), 'bilde/kamera-bryter i konsollen');
ok(lmSrc.includes('bcSetVisual') && lmSrc.includes('bcSetImage'), 'bcSetVisual + bcSetImage finnes');
ok(/goLive, bcPerm, bcGo, bcStop, bcSetVisual, bcSetImage/.test(lmSrc), 'de nye funksjonene er eksponert');
ok(lmSrc.includes('captureStream') && lmSrc.includes("getUserMedia({ video"), 'bilde→canvas captureStream + kamera→getUserMedia(video)');
ok(lmSrc.includes("visual: 'image'"), 'standard er bilde (kamera av)');

// ── 4) Lytter viser video + broadcaster sender video-spor ────────────────────
console.log('\nLytter + broadcaster (video)');
ok(lmSrc.includes('id="ln-video"'), 'lytteren har et video-element');
ok(lmSrc.includes('getVideoTracks().length'), 'lytteren viser video bare når et videospor finnes');
const lbSrc = read('js/livebroadcast.js');
ok(lbSrc.includes('stream.getTracks().forEach') && !/stream\.getAudioTracks\(\)\.forEach/.test(lbSrc), 'broadcaster sender ALLE spor (lyd + video)');

console.log(`\n${fail ? '\x1b[31m' : '\x1b[32m'}Alle ${pass + fail} sjekkene: ${pass} bestått, ${fail} feilet\x1b[0m  — kun lyd / velg bilde eller kamera.\n`);
process.exit(fail ? 1 : 0);
