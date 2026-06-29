// RadioSearch — search ALL web radios in the world (Radio Browser API)
// Reusable widget mounted on the World and Shows pages. Free-text search across
// station names + tags, plus one-tap genre chips for the scene's core sounds.
// Results play straight in the SoundCore player via Radio.playUrl().
const RadioSearch = (() => {

  // Genre chips — label shown to the user → query sent to the API (tag/name).
  // Niche blends map to the closest tag that actually returns stations.
  const GENRES = [
    { label: 'Psytrance',    q: 'psytrance',           emoji: '🕉️' },
    { label: 'Goa',          q: 'goa',                 emoji: '🌀' },
    { label: 'EDM',          q: 'edm',                 emoji: '🎛️' },
    { label: 'House',        q: 'house',               emoji: '🏠' },
    { label: 'Progressive',  q: 'progressive',         emoji: '🎚️' },
    { label: 'Chillgressive',q: 'progressive trance',  emoji: '🌊' },
    { label: 'Chill Out',    q: 'chillout',            emoji: '🛋️' },
    { label: 'Psychill',     q: 'psychill',            emoji: '💧' },
    { label: 'Downtempo',    q: 'downtempo',           emoji: '🌿' },
    { label: 'Ambient',      q: 'ambient',             emoji: '🌫️' },
    { label: 'Drone',        q: 'drone',               emoji: '🌌' },
    { label: 'Dark Drone',   q: 'dark ambient',        emoji: '💀' },
  ];

  const API  = 'https://de1.api.radio-browser.info/json/stations';
  const QOPTS = 'limit=40&order=clickcount&reverse=true&hidebroken=true';

  let results = [];
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
            placeholder="Søk blant alle verdas web-radioar… (namn, sjanger eller land)"
            oninput="RadioSearch.onInput(this.value)"
            onkeydown="if(event.key==='Enter')RadioSearch.search(this.value)"
          >
          <button class="rsx-clear" id="rsx-clear" onclick="RadioSearch.clear()" style="display:none" title="Tøm">${Icon('x')}</button>
        </div>
        <div class="rsx-genres">
          ${GENRES.map(g => `<button class="rsx-genre" data-q="${esc(g.q)}" onclick="RadioSearch.genre('${esc(g.q)}','${esc(g.label)}',this)">${g.emoji} ${esc(g.label)}</button>`).join('')}
        </div>
        <div class="rsx-results hidden" id="rsx-results"></div>
      </div>`;
  }

  // ── Search ──────────────────────────────────────────────────────────────
  // Query name + tag in parallel and merge, so "psytrance" finds both stations
  // named like it and stations tagged with it. Dedupe by uuid, popularity sort.
  async function fetchMerged(query) {
    const q = encodeURIComponent(query);
    const [byTag, byName] = await Promise.all([
      fetch(`${API}/search?tag=${q}&${QOPTS}`).then(r => r.ok ? r.json() : []).catch(() => []),
      fetch(`${API}/search?name=${q}&${QOPTS}`).then(r => r.ok ? r.json() : []).catch(() => []),
    ]);
    const seen = new Set();
    const merged = [];
    for (const s of [...byTag, ...byName]) {
      if (!s.url_resolved || seen.has(s.stationuuid)) continue;
      seen.add(s.stationuuid);
      merged.push(s);
    }
    merged.sort((a, b) => (b.clickcount || 0) - (a.clickcount || 0));
    return merged.slice(0, 36);
  }

  async function search(query) {
    query = (query || '').trim();
    const el = document.getElementById('rsx-results');
    const clearBtn = document.getElementById('rsx-clear');
    if (clearBtn) clearBtn.style.display = query ? '' : 'none';
    if (!el) return;
    if (query.length < 2) { el.classList.add('hidden'); el.innerHTML = ''; results = []; return; }

    const mySeq = ++reqSeq;
    el.classList.remove('hidden');
    el.innerHTML = '<div class="rsx-loading">Søker i tusenvis av radiokanalar…</div>';
    try {
      const list = await fetchMerged(query);
      if (mySeq !== reqSeq) return;   // a newer search already started
      results = list;
      renderResults(list);
    } catch (e) {
      if (mySeq !== reqSeq) return;
      el.innerHTML = '<div class="rsx-empty">Kunne ikkje hente resultat. Prøv igjen.</div>';
    }
  }

  function onInput(val) {
    clearTimeout(timer);
    timer = setTimeout(() => search(val), 350);
  }

  function genre(q, label, btn) {
    const input = document.getElementById('rsx-input');
    if (input) input.value = label;
    document.querySelectorAll('.rsx-genre').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    clearTimeout(timer);
    search(q);
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

  function renderResults(list) {
    const el = document.getElementById('rsx-results');
    if (!el) return;
    if (!list.length) {
      el.innerHTML = '<div class="rsx-empty">Ingen radioar funne. Prøv eit anna ord eller ein sjanger-knapp.</div>';
      return;
    }
    el.innerHTML = `
      <div class="rsx-count">${list.length} kanalar funne</div>
      ${list.map((s, i) => `
        <div class="rsx-item" onclick="RadioSearch.play(${i})">
          <span class="rsx-item-fav">${s.favicon
            ? `<img src="${esc(s.favicon)}" loading="lazy" alt="" onerror="this.replaceWith(document.createTextNode('📻'))">`
            : '📻'}</span>
          <span class="rsx-item-info">
            <span class="rsx-item-name">${esc(s.name)}</span>
            <span class="rsx-item-meta">${flag(s.countrycode)} ${esc(s.country || 'Ukjent')}${s.tags ? ' · ' + esc(s.tags.split(',').slice(0,3).join(', ')) : ''}${s.bitrate ? ' · ' + s.bitrate + 'kbps' : ''}</span>
          </span>
          <span class="rsx-item-actions">
            <button class="rsx-play" title="Spill av" onclick="event.stopPropagation();RadioSearch.play(${i})">${Icon('play')}</button>
            <button class="rsx-save" title="Lagre i Radio → Eigne strøymar" onclick="event.stopPropagation();RadioSearch.save(${i})">＋</button>
          </span>
        </div>`).join('')}`;
  }

  // ── Actions ─────────────────────────────────────────────────────────────
  function play(i) {
    const s = results[i];
    if (!s || !s.url_resolved) { App.toast('Ingen gyldig stream-URL', 'error'); return; }
    const desc = [s.country, (s.tags || '').split(',')[0]].filter(Boolean).join(' · ') || 'Nettradio';
    if (typeof Radio !== 'undefined') Radio.playUrl(s.url_resolved, { name: s.name, emoji: '📡', color: '#7c3aed', desc });
    App.toast(`Spiller «${s.name}»`, 'success');
  }

  function save(i) {
    const s = results[i];
    if (!s || !s.url_resolved) { App.toast('Ingen gyldig stream-URL', 'error'); return; }
    const cur = JSON.parse(localStorage.getItem('pv_custom_streams') || '[]');
    if (cur.some(c => c.url === s.url_resolved)) { App.toast('Allereie lagra', 'info'); return; }
    cur.push({ name: s.name, url: s.url_resolved });
    localStorage.setItem('pv_custom_streams', JSON.stringify(cur));
    App.toast(`«${s.name}» lagra i Radio → Eigne strøymar`, 'success');
  }

  return { widget, onInput, search, genre, clear, play, save };
})();
