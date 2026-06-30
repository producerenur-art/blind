// test-broadcast.js — verifiserer LIVE-sending: betalings-gate, YouTube-embed
// og live-flatene (profil-banner + Community-seksjon) i js/broadcastschedule.js.
// Rein logikk-test (ingen DOM) — kjøres av `npm test`.
global.window = global;
global.Icon = () => '';
global.setInterval = () => 0;            // _ensureTick → no-op

const now = Date.now();
const liveSlot = new Date(now - 30 * 60000).toISOString();   // startet for 30 min siden, 2 t → live nå
const YT = 'dQw4w9WgXcQ';
const mkBroadcast = () => [{ id: 'b1', slot: liveSlot, hours: 2, room: 'rom', title: 'Fredagsmiks', youtubeId: YT }];

const USERS = {
  djpaid: { username: 'djpaid', displayName: 'DJ Paid', role: 'dj', email: 'paid@x.no',
            broadcasts: mkBroadcast(), liveMixBookings: [{ product: 'livemix', slot: liveSlot, hours: 2 }] },
  djfree: { username: 'djfree', displayName: 'DJ Free', role: 'dj', email: 'free@x.no',
            broadcasts: mkBroadcast(), liveMixBookings: [] },
  owner:  { username: 'owner',  displayName: 'Eier',    role: 'dj', email: 'producerenur@gmail.com',
            broadcasts: mkBroadcast(), liveMixBookings: [] },
};

global.Auth = { current: () => null, getUsers: () => USERS };
global.LiveMix = { canGoLive: () => ({ ok: false, devBypass: false, owner: false, active: null, next: null }), openBooking: () => {} };

const BS = require('../js/broadcastschedule.js');

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; console.log('  [32m✓[0m', msg); } else { fail++; console.log('  [31m✗ FEIL:[0m', msg); } };

console.log('\nYouTube-lenkeparsing');
ok(BS.parseYouTubeId('https://www.youtube.com/watch?v=' + YT) === YT, 'watch?v=');
ok(BS.parseYouTubeId('https://youtu.be/' + YT) === YT, 'youtu.be/');
ok(BS.parseYouTubeId('https://youtube.com/live/' + YT) === YT, 'live/');
ok(BS.parseYouTubeId(YT) === YT, 'bar id');
ok(BS.parseYouTubeId('https://example.com/x') === '', 'ugyldig → tom');

console.log('\nBetalings-gate (Community «Live nå»)');
const cl = BS.communityLiveSection();
ok(cl.includes('DJ Paid'), 'betalt DJ vises som live');
ok(cl.includes('Eier'), 'stasjons-eier vises som live (uten booking)');
ok(!cl.includes('DJ Free'), 'UBETALT DJ vises IKKE som live — gaten virker');
ok(cl.includes('youtube.com/embed/' + YT), 'YouTube-embed dukker opp i Community');

console.log('\nProminent profil-banner');
const bPaid = BS.liveBanner(USERS.djpaid, false);
ok(bPaid.includes('LIVE NÅ'), 'betalt: LIVE NÅ-merke');
ok(bPaid.includes('youtube.com/embed/' + YT) && bPaid.includes('autoplay=1') && bPaid.includes('mute=1'), 'betalt: YouTube-embed (autoplay+mute)');
ok(BS.liveBanner(USERS.djfree, true).includes('Book mikse-slot'), 'ubetalt eier: «Book mikse-slot»-oppfordring');
ok(!BS.liveBanner(USERS.djfree, true).includes('youtube.com/embed'), 'ubetalt eier: ingen embed (gate)');
const visitorInner = BS.liveBanner(USERS.djfree, false).replace(/<div id="bc-live-banner"[^>]*>/, '').replace(/<\/div>$/, '');
ok(visitorInner.trim() === '', 'ubetalt + besøkende: banner tom');

console.log('\nProfil-seksjon (sendetid-liste)');
ok(BS.profileSection(USERS.djpaid, false, {}).includes('youtube.com/embed/' + YT), 'embedder YouTube for betalt live');
ok(BS.profileSection(USERS.djfree, true, {}).includes('Book for å gå live'), 'ubetalt eier får book-knapp');
ok(BS.statusOf(USERS.djpaid.broadcasts[0]) === 'live', 'statusOf = live');

console.log(`\n${fail ? '[31m' : '[32m'}Alle ${pass + fail} sjekkene: ${pass} bestått, ${fail} feilet[0m  — LIVE-sending med YouTube + betalings-gate.\n`);
process.exit(fail ? 1 : 0);
