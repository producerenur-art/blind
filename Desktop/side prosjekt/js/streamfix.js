// StreamFix — gjer at tredjeparts radiostrøymar faktisk spelar i nettlesaren.
//
// Bakgrunnen: siriusfm.no går på HTTPS, men Radio Browser-katalogen er full av
// `http://`-strøymar. Ein HTTPS-side får ALDRI lasta http-lyd (mixed content) —
// nettlesaren blokkerer det stille, så eit klikk gjev berre tomhet. På toppen av
// det ligg det daude strøymar, spelelistefiler (.pls/.m3u) og HLS (.m3u8) i lista,
// som <audio src> heller ikkje kan spele.
//
// Denne modulen samlar dei tre tinga som må gjerast overalt der vi spelar ein
// framand strøym:
//   normalize(url) — oppgrader http → https (fiksar ~4 av 10 http-strøymar)
//   playable(url)  — kast ut format nettlesaren umogleg kan spele
//   watch(audio)   — oppdag at strøymen ikkje kom i gang, og sei det ærleg
//
// Sjå også API-fallback: `de1` var hardkoda, og nl1/at1/fi1 finst ikkje lenger.
const StreamFix = (() => {

  const secure = location.protocol === 'https:';

  // ── URL-normalisering ───────────────────────────────────────────────────
  // Dei fleste Icecast/Shoutcast-vertane svarar på https òg, sjølv om katalogen
  // berre kjenner http-adressa. Oppgrader, og lat watch() fange dei som ikkje gjer det.
  function normalize(url) {
    if (!url) return url;
    const u = String(url).trim();
    if (secure && u.startsWith('http://')) return 'https://' + u.slice(7);
    return u;
  }

  // ── Format nettlesaren ikkje kan spele ──────────────────────────────────
  const PLAYLIST = /\.(?:pls|m3u|asx|xspf)$/i;
  const HLS      = /\.m3u8$/i;

  let hlsOk = null;
  function canPlayHls() {
    if (hlsOk === null) {
      const a = document.createElement('audio');
      hlsOk = !!(a.canPlayType('application/vnd.apple.mpegurl') ||
                 a.canPlayType('application/x-mpegURL'));
    }
    return hlsOk;
  }

  // .pls/.m3u er tekstfiler, ikkje lyd. .m3u8 (HLS) spelar berre i Safari utan hls.js.
  function playable(url) {
    if (!url) return false;
    const path = String(url).split('?')[0];
    if (PLAYLIST.test(path)) return false;
    if (HLS.test(path) && !canPlayHls()) return false;
    return true;
  }

  // ── Ærleg feildeteksjon ─────────────────────────────────────────────────
  function errorText(audio) {
    switch (audio.error?.code) {
      case 1:  return 'Playback was aborted';
      case 2:  return 'Network error — station offline or blocked';
      case 3:  return 'Could not decode this stream';
      case 4:  return 'Stream unavailable (offline, or blocked because it is not https)';
      default: return 'Stream error';
    }
  }

  // Sjå om strøymen verkeleg kom i gang. play()-lovnaden held ikkje åleine: ein
  // blokkert eller daud strøym kan ende opp med å berre bli stille utan å avvise.
  // Difor: 'playing'-hending = suksess, 'error' = feil, og ei vaktbikkje for resten.
  //
  // Kvar ny watch() bumpar ein generasjonsteljar på audio-elementet, så ein eldre
  // vakt for ein stasjon brukaren har forlatt aldri melder feil på den nye.
  function watch(audio, { timeout = 9000, onPlay, onFail } = {}) {
    if (!audio) return { cancel() {} };
    const gen = audio._sfxGen = (audio._sfxGen || 0) + 1;
    let done = false, timer = null;

    function cleanup() {
      clearTimeout(timer);
      audio.removeEventListener('playing', ok);
      audio.removeEventListener('error', bad);
    }
    function finish(good, why) {
      if (done) return;
      done = true;
      cleanup();
      if (audio._sfxGen !== gen) return;   // ein annan stasjon tok over — resultatet er ugyldig
      if (good) onPlay?.(); else onFail?.(why || 'Stream did not respond');
    }
    const ok  = () => finish(true);
    const bad = () => finish(false, errorText(audio));

    audio.addEventListener('playing', ok);
    audio.addEventListener('error', bad);
    timer = setTimeout(() => {
      // Verkeleg avspeling har lyd som renn: readyState ≥ 3 og currentTime > 0.
      const running = !audio.paused && audio.readyState >= 3 && audio.currentTime > 0;
      finish(running, 'No sound from this stream — it timed out');
    }, timeout);

    return { cancel: () => { done = true; cleanup(); } };
  }

  // ── Radio Browser API med mirror-fallback ───────────────────────────────
  // `de1` åleine var eit einskildpunkt-havari: er den nede, døyr alt radiosøk.
  // (nl1/at1/fi1 frå den gamle lista svarar ikkje i det heile lenger.)
  const HOSTS = [
    'https://de1.api.radio-browser.info',
    'https://de2.api.radio-browser.info',
    'https://all.api.radio-browser.info',
  ];
  let hostIdx = 0;

  // Returnerer parsa JSON, eller null om ingen mirror svarte (så kallaren kan
  // skilje «ingen treff» frå «API-et er nede»).
  async function api(path) {
    for (let i = 0; i < HOSTS.length; i++) {
      const idx = (hostIdx + i) % HOSTS.length;
      try {
        const res = await fetch(HOSTS[idx] + path, { headers: { 'Accept': 'application/json' } });
        if (!res.ok) continue;
        const json = await res.json();
        hostIdx = idx;               // hald oss på mirroren som svarte
        return json;
      } catch { /* prøv neste mirror */ }
    }
    return null;
  }

  // ── Strøymar vi har prova er daude i denne sesjonen ─────────────────────
  // Slepp brukaren å klikke seg gjennom same daude stasjon om og om igjen.
  const dead = new Set();
  function markDead(url) { if (url) dead.add(normalize(url)); }
  function isDead(url)   { return !!url && dead.has(normalize(url)); }

  return { normalize, playable, canPlayHls, watch, api, markDead, isDead, errorText };
})();

window.StreamFix = StreamFix;
