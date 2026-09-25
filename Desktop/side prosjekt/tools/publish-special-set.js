// Publiserer arkivposten for eit spesialprogram (js/specialShows.js) i Live Archive.
// Posten er SKJULT (RLS: published_at i framtida) til fyrste sending er over, og
// får då lyd, tracklist og lenke. Idempotent (upsert på id) — trygt å køyre fleire
// gonger, lagar aldri ein andre post. Krev migrasjon 0034.
//   node tools/publish-special-set.js            (publiserer alle SHOWS)
//   node tools/publish-special-set.js --dry
const SpecialShows = require('../js/specialShows.js');
const cfg = require('fs').readFileSync(__dirname + '/../js/config.js', 'utf8');
const pick = re => (cfg.match(re) || [])[1];
const url = (cfg.match(/SUPABASE_URL:[^\n]*\|\|\s*'([^']+)'/) || [])[1];
const anon = (cfg.match(/SUPABASE_ANON_KEY:[^\n]*\|\|\s*'([^']+)'/) || [])[1];
const secret = process.env.LIVE_BROADCAST_SECRET || (cfg.match(/LIVE_BROADCAST_SECRET:\s*'([^']+)'/) || [])[1];
const dry = process.argv.includes('--dry');

(async () => {
  for (const show of SpecialShows.SHOWS) {
    const first = new Date(show.slots[0]);
    const publishedAt = new Date(first.getTime() + show.durationSec * 1000).toISOString();
    const body = {
      p_secret: secret, p_id: 'set_special_' + show.id, p_display_name: show.title,
      p_track_title: 'Aired live on the SiriusFM 24-Hour Cycle · ' + new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Oslo', day: 'numeric', month: 'long', year: 'numeric' }).format(first),
      p_audio_url: show.audioUrl, p_duration_sec: show.durationSec,
      p_tracklist: show.tracklist.map((t, i) => (i + 1) + '. ' + t).join('\n'),
      p_published_at: publishedAt, p_link_url: show.linkUrl || '',
    };
    if (dry) { console.log('DRY', show.id, 'publishes at', publishedAt, '→', body.p_display_name); continue; }
    const r = await fetch(url + '/rest/v1/rpc/publish_special_set', {
      method: 'POST', headers: { apikey: anon, Authorization: 'Bearer ' + anon, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    console.log(show.id, r.status, r.ok ? 'ok' : await r.text());
  }
})();
