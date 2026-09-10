// RadioSearch — search ALL web radios in the world (Radio Browser API)
// Reusable widget mounted on the World and Shows pages. Free-text search across
// station names + tags, plus one-tap genre chips for the scene's core sounds.
// Results play straight in the SiriusFM player via Radio.playUrl().
//
// Robustheit (sjå js/streamfix.js for kvifor): katalogen er full av http-strøymar
// som ei HTTPS-side aldri får lasta, av daude vertar og av format <audio> ikkje kan
// spele. Difor gjer denne widgeten fire ting: seedar kvar sjanger med SiriusFM sine
// eigne verifiserte stasjonar, filtrerer bort det som umogleg kan spele, legg
// strøymar som sjølve tilbyr https øvst, og hoppar vidare til neste stasjon når ein
// strøym ikkje gjev lyd.
const RadioSearch = (() => {

  // Genre chips. `terms` er søkjeorda mot katalogen (fleire per sjanger, elles blir
  // dei smale sjangrane nesten tomme etter filtrering), `cats` peikar på kategoriar
  // i SiriusFM si eiga stasjonsliste som passar sjangeren.
  const GENRES = [
    { label: 'Psytrance',     emoji: '🕉️', terms: ['psytrance', 'psy trance', 'goa trance', 'fullon'],
      cats: ['Psytrance / Goa', 'Stellar', 'radiOzora'] },
    { label: 'Goa',           emoji: '🌀', terms: ['goa', 'goa trance', 'psytrance'],
      cats: ['Psytrance / Goa'] },
    { label: 'EDM',           emoji: '🎛️', terms: ['edm', 'electronic dance music', 'dance'],
      cats: ['EDM / House / Techno'] },
    { label: 'House',         emoji: '🏠', terms: ['house', 'deep house', 'tech house'],
      cats: ['EDM / House / Techno'] },
    { label: 'Progressive',   emoji: '🎚️', terms: ['progressive', 'progressive house', 'progressive trance'],
      cats: ['Progressive Psy / Trance'] },
    { label: 'Chillgressive', emoji: '🌊', terms: ['progressive trance', 'chillgressive', 'progressive psytrance', 'psy chill'],
      cats: ['Progressive Psy / Trance', 'Psybient / Psychill'] },
    { label: 'Chill Out',     emoji: '🛋️', terms: ['chillout', 'chill out', 'lounge'],
      cats: ['Chill Out / Downtempo'] },
    { label: 'Psychill',      emoji: '💧', terms: ['psychill', 'psybient', 'psychedelic chillout', 'chillout psy'],
      cats: ['Psybient / Psychill'] },
    { label: 'Downtempo',     emoji: '🌿', terms: ['downtempo', 'trip hop', 'dub'],
      cats: ['Chill Out / Downtempo', 'Dub / Reggae', 'Lo-Fi / IDM'] },
    { label: 'Ambient',       emoji: '🌫️', terms: ['ambient', 'ambient electronic', 'space ambient'],
      cats: ['Ambient / Space'] },
    { label: 'Drone',         emoji: '🌌', terms: ['drone', 'drone ambient', 'dark ambient'],
      cats: ['Drone / Dark Drone'] },
    { label: 'Dark Drone',    emoji: '💀', terms: ['dark ambient', 'dark drone', 'darkambient', 'ritual ambient'],
      cats: ['Drone / Dark Drone'] },
  ];

  // Verten blir vald av StreamFix.api (mirror-fallback), så her berre spørjinga.
  const QOPTS = 'limit=100&order=clickcount&reverse=true&hidebroken=true';

  let results = [];
  let playingIndex = -1;   // rada som spelar no, så stopp-knappen kan namngje han
  let timer   = null;
  let reqSeq  = 0;   // guards against a slow earlier request overwriting a newer one

  function esc(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ISO-3166 alpha-2 → 🇽🇾 flag emoji (falls back to a radio glyph).
  function flag(cc) {
    if (!cc || cc.length !== 2) return '📻';
    return [...cc.toUpperCase()].map(c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)).join('');
  }

  // ── Widget markup (inline into a page's render string) ──────────────────
  function widget() {
    return `
      <div class="rsx">
        <div class="rsx-box">
          <span class="rsx-icon">${Icon('search')}</span>
          <input
            type="text" id="rsx-input" class="rsx-input" autocomplete="off"
            placeholder="Search every web radio in the world… (name, genre or country)"
            oninput="RadioSearch.onInput(this.value)"
            onkeydown="if(event.key==='Enter')RadioSearch.search(this.value)"
          >
          <button class="rsx-clear" id="rsx-clear" onclick="RadioSearch.clear()" style="display:none" title="Clear">${Icon('x')}</button>
        </div>
        <div class="rsx-genres">
          ${GENRES.map(g => `<button class="rsx-genre" data-q="${esc(g.label)}" onclick="RadioSearch.genre('${esc(g.label)}',this)">${g.emoji} ${esc(g.label)}</button>`).join('')}
        </div>
        <div class="rsx-results hidden" id="rsx-results"></div>
      </div>`;
  }

  // ── SiriusFM sine eigne stasjonar ───────────────────────────────────────
  // Desse er handplukka og sjekka, så dei ligg øvst: kvart sjanger-klikk har då
  // alltid noko som faktisk spelar, uansett kva katalogen svarar med.
  function onSiteFor(genre, query) {
    const all = (typeof Radio !== 'undefined' && Radio.stations) || [];
    const q   = (query || '').trim().toLowerCase();
    return all.filter(s => {
      if (genre) return genre.cats.includes(s.cat);
      return q.length >= 2 && `${s.name} ${s.desc || ''} ${s.cat || ''}`.toLowerCase().includes(q);
    }).map(s => ({
      name: s.name, url: s.url, emoji: s.emoji,
      country: 'SiriusFM', tags: s.cat, onSite: true,
    }));
  }

  // ── Søk i verdskatalogen ────────────────────────────────────────────────
  // Spør på både namn og tag for kvart søkjeord og flettar, så «psytrance» finn
  // både stasjonar som heiter noko slikt og stasjonar som er tagga slik.
  async function fetchWeb(terms) {
    const lists = await Promise.all(terms.flatMap(t => {
      const q = encodeURIComponent(t);
      return [
        StreamFix.api(`/json/stations/search?tag=${q}&${QOPTS}`),
        StreamFix.api(`/json/stations/search?name=${q}&${QOPTS}`),
      ];
    }));
    if (lists.every(l => l === null)) throw new Error('Radio Browser unreachable');

    const seen = new Set(), seenUrl = new Set(), out = [];
    for (const s of lists.flatMap(l => l || [])) {
      if (!s.url_resolved || seen.has(s.stationuuid)) continue;
      // Katalogen kjenner ofte berre http-adressa. Vi oppgraderer til https, men
      // merker at vertan ikkje sjølv tilbaud det — dei er langt oftare daude.
      const nativeHttps = s.url_resolved.startsWith('https://');
      const url = StreamFix.normalize(s.url_resolved);
      if (!StreamFix.playable(url) || seenUrl.has(url)) continue;
      seen.add(s.stationuuid); seenUrl.add(url);
      out.push({
        // Namn i katalogen har ofte innleiande tabb/mellomrom («\tpsyradio * fm»).
        // Stasjonsikona er ofte http òg — oppgrader dei, elles blokkerer nettlesaren
        // dei som mixed content og lista blir full av tomme ikonruter.
        name: String(s.name || '').trim(), url, favicon: StreamFix.normalize(s.favicon), cc: s.countrycode,
        country: s.country, tags: s.tags, bitrate: s.bitrate,
        clicks: s.clickcount || 0, nativeHttps,
      });
    }
    // Rekkjefølgje: eigen-https først, kjende daude sist, elles popularitet.
    out.sort((a, b) =>
      (StreamFix.isDead(a.url) ? 1 : 0) - (StreamFix.isDead(b.url) ? 1 : 0) ||
      (b.nativeHttps ? 1 : 0) - (a.nativeHttps ? 1 : 0) ||
      b.clicks - a.clicks);
    return out.slice(0, 36);
  }

  async function search(query, genre = null) {
    query = (query || '').trim();
    const el = document.getElementById('rsx-results');
    const clearBtn = document.getElementById('rsx-clear');
    if (clearBtn) clearBtn.style.display = query ? '' : 'none';
    if (!el) return;
    if (!genre && query.length < 2) { el.classList.add('hidden'); el.innerHTML = ''; results = []; return; }

    const mySeq = ++reqSeq;
    el.classList.remove('hidden');
    el.innerHTML = '<div class="rsx-loading">Searching thousands of radio stations…</div>';

    const onSite = onSiteFor(genre, query);
    try {
      const web = await fetchWeb(genre ? genre.terms : [query]);
      if (mySeq !== reqSeq) return;   // a newer search already started
      // Ikkje vis ein stasjon både som «on site» og som katalogtreff.
      const mine = new Set(onSite.map(s => s.url));
      results = [...onSite, ...web.filter(s => !mine.has(s.url))];
      renderResults(results);
    } catch (e) {
      if (mySeq !== reqSeq) return;
      // Katalogen nede er ingen grunn til tom side når vi har eigne stasjonar.
      results = onSite;
      if (onSite.length) renderResults(results, 'The world catalogue is unreachable — showing SiriusFM stations.');
      else el.innerHTML = '<div class="rsx-empty">Could not fetch results. Try again.</div>';
    }
  }

  function onInput(val) {
    clearTimeout(timer);
    timer = setTimeout(() => search(val), 350);
  }

  function genre(label, btn) {
    const g = GENRES.find(x => x.label === label);
    const input = document.getElementById('rsx-input');
    if (input) input.value = label;
    document.querySelectorAll('.rsx-genre').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    clearTimeout(timer);
    search(label, g || null);
  }

  function clear() {
    const input = document.getElementById('rsx-input');
    if (input) { input.value = ''; input.focus(); }
    document.querySelectorAll('.rsx-genre').forEach(b => b.classList.remove('active'));
    const el = document.getElementById('rsx-results');
    if (el) { el.classList.add('hidden'); el.innerHTML = ''; }
    const clearBtn = document.getElementById('rsx-clear');
    if (clearBtn) clearBtn.style.display = 'none';
    results = [];
  }

  function renderResults(list, note) {
    const el = document.getElementById('rsx-results');
    if (!el) return;
    playingIndex = -1;   // ny liste ⇒ gamle radindeksar gjeld ikkje lenger
    if (!list.length) {
      el.innerHTML = '<div class="rsx-empty">No radio stations found. Try a different word or a genre button.</div>';
      return;
    }
    el.innerHTML = `
      <div class="rsx-count">${list.length} stations found</div>
      ${note ? `<div class="rsx-note">${esc(note)}</div>` : ''}
      ${list.map((s, i) => {
        const off  = StreamFix.isDead(s.url);
        const meta = s.onSite
          ? `✦ SiriusFM${s.tags ? ' · ' + esc(s.tags) : ''}`
          : `${flag(s.cc)} ${esc(s.country || 'Unknown')}${s.tags ? ' · ' + esc(s.tags.split(',').slice(0,3).join(', ')) : ''}${s.bitrate ? ' · ' + s.bitrate + 'kbps' : ''}`;
        return `
        <div class="rsx-item${off ? ' rsx-item--offline' : ''}${s.onSite ? ' rsx-item--onsite' : ''}" id="rsx-row-${i}" onclick="RadioSearch.play(${i})">
          <span class="rsx-item-fav">${s.favicon
            ? `<img src="${esc(s.favicon)}" loading="lazy" alt="" onerror="this.replaceWith(document.createTextNode('📻'))">`
            : (s.emoji || '📻')}</span>
          <span class="rsx-item-info">
            <span class="rsx-item-name">${esc(s.name)}${s.onSite ? ' <span class="rsx-onsite-tag">on site</span>' : ''}${off ? ' <span class="rsx-offline-tag">offline</span>' : ''}</span>
            <span class="rsx-item-meta">${meta}</span>
          </span>
          <span class="rsx-item-actions">
            <button class="rsx-play" title="Play" onclick="event.stopPropagation();RadioSearch.play(${i})">${Icon('play')}</button>
            <button class="rsx-stop" title="Stop" onclick="event.stopPropagation();RadioSearch.stop(${i})">${Icon('square')}</button>
            <button class="rsx-save" title="Save to Radio → Your own streams" onclick="event.stopPropagation();RadioSearch.save(${i})">＋</button>
          </span>
        </div>`;
      }).join('')}`;
  }

  // Merk ei rad medan/etter tilkopling, utan å teikne heile lista på nytt (det
  // ville rykke lista under fingeren til brukaren).
  function markRow(i, state) {
    // Berre éi rad om gongen kan spele — nullstill dei andre først.
    if (state === 'playing' || state === 'connecting') {
      document.querySelectorAll('.rsx-item--playing').forEach(r => r.classList.remove('rsx-item--playing'));
      playingIndex = state === 'playing' ? i : -1;
    } else if (playingIndex === i) {
      playingIndex = -1;
    }
    const row = document.getElementById(`rsx-row-${i}`);
    if (!row) return;
    row.classList.toggle('rsx-item--connecting', state === 'connecting');
    row.classList.toggle('rsx-item--offline',     state === 'offline');
    row.classList.toggle('rsx-item--playing',     state === 'playing');
    const nameEl = row.querySelector('.rsx-item-name');
    if (!nameEl) return;
    nameEl.querySelector('.rsx-offline-tag')?.remove();
    if (state === 'offline') {
      const tag = document.createElement('span');
      tag.className = 'rsx-offline-tag';
      tag.textContent = 'offline';
      nameEl.appendChild(tag);
    }
  }

  // ── Actions ─────────────────────────────────────────────────────────────
  // Framande webradioar døyr heile tida, så i staden for å la brukaren sitje att
  // i stilla hoppar vi vidare til neste stasjon i lista — og seier tydeleg kva som
  // skjedde. «Playing»-meldinga kjem no først når lyden faktisk er i gang.
  function play(i, hop = 0) {
    const s = results[i];
    if (!s || !s.url) { App.toast('No valid stream URL', 'error'); return; }
    if (typeof Radio === 'undefined') { App.toast('Player is not ready yet', 'error'); return; }

    markRow(i, 'connecting');
    const desc = s.onSite
      ? (s.tags || 'SiriusFM')
      : ([s.country, (s.tags || '').split(',')[0]].filter(Boolean).join(' · ') || 'Web radio');
    Radio.playUrl(s.url, {
      name: s.name, emoji: s.emoji || '📡', color: '#38bdf8', desc,
      onPlay: () => {
        markRow(i, 'playing');
        App.toast(`Playing «${s.name}»`, 'success');
      },
      onFail: (why) => {
        markRow(i, 'offline');
        const next = nextPlayable(i);
        if (hop >= 3 || next === -1) {
          App.toast(`«${s.name}» is offline (${why}). Try another station.`, 'error');
          return;
        }
        App.toast(`«${s.name}» is offline — trying «${results[next].name}»…`, 'info');
        play(next, hop + 1);
      },
    });
  }

  // Stopp-knappen på kvar rad: stoppar strøymen som går, uansett kva rad han
  // vart starta frå. Radio.stopRadio() nullstiller også spelarlinja nede.
  function stop(i) {
    document.querySelectorAll('.rsx-item--playing, .rsx-item--connecting')
      .forEach(r => r.classList.remove('rsx-item--playing', 'rsx-item--connecting'));
    const wasPlaying = playingIndex !== -1;
    playingIndex = -1;
    if (typeof Radio === 'undefined' || !Radio.stopRadio) return;
    Radio.stopRadio();
    const s = results[i];
    App.toast(wasPlaying && s ? `Stopped «${s.name}»` : 'Playback stopped', 'info');
  }

  // Neste treff nedover i lista som vi ikkje alt veit er daudt.
  function nextPlayable(from) {
    for (let i = from + 1; i < results.length; i++) {
      if (!StreamFix.isDead(results[i].url)) return i;
    }
    return -1;
  }

  function save(i) {
    const s = results[i];
    if (!s || !s.url) { App.toast('No valid stream URL', 'error'); return; }
    const cur = JSON.parse(localStorage.getItem('pv_custom_streams') || '[]');
    if (cur.some(c => c.url === s.url)) { App.toast('Already saved', 'info'); return; }
    cur.push({ name: s.name, url: s.url });
    localStorage.setItem('pv_custom_streams', JSON.stringify(cur));
    App.toast(`«${s.name}» saved to Radio → Your own streams`, 'success');
  }

  return { widget, onInput, search, genre, clear, play, stop, save };
})();

window.RadioSearch = RadioSearch;
