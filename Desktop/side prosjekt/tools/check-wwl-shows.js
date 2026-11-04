// Sjekkliste for «What went live»-spesialprogram (js/specialShows.js). Køyr før deploy:
//   node tools/check-wwl-shows.js
// Feilar (exit 1) viss eit program manglar bilete/lenke/lyd, eller lydfila ikkje svarar.
const S = require('../js/specialShows.js');
(async () => {
  let bad = 0;
  for (const s of S.SHOWS) {
    const miss = ['title', 'about', 'coverUrl', 'linkUrl', 'audioUrl', 'durationSec'].filter(k => !s[k]);
    if (!(s.slots || []).length) miss.push('slots');
    let audio = '?';
    try { audio = (await fetch(s.audioUrl, { method: 'HEAD' })).status; } catch (_) { audio = 'feil'; }
    if (audio !== 200) miss.push('audioUrl svarar ' + audio);
    if (s.coverUrl) { try { const r = await fetch(s.coverUrl, { method: 'HEAD' }); if (r.status !== 200) miss.push('coverUrl svarar ' + r.status); } catch (_) { miss.push('coverUrl feil'); } }
    console.log((miss.length ? 'MANGLAR ' : 'OK      ') + s.id + (miss.length ? ' → ' + miss.join(', ') : ''));
    if (miss.length) bad++;
  }
  process.exit(bad ? 1 : 0);
})();
