// AIFresh — delt AI-rotasjonslag for «Fersk fra nettet»-seksjoner.
//
// Samme mønster som forsidens HomeRadio: serveren (/api/magazine) gir en shortliste
// på inntil 8 ekte, AI-funne saker per sjanger (cachet ~6 t på CDN, varmet av cron),
// og vi roterer i shortlisten hver halvtime. Ligger fanen åpen lenge, hentes ny
// shortliste automatisk, så rotasjonen aldri går tom.
//
// Brukes av:
//   js/magazine.js     — «Fresh from the web» per sjangerfane
//   js/world.js        — «Fresh from the world»: Psychill · Psytrance · Techno Underground
//   js/underground.js  — techno-undergrunn-nyheter
//
// Feiler kallet (manglende nøkkel, kvote, nett) skjules seksjonen helt, og siden
// står igjen med sitt kuraterte innhold — som før.
const AIFresh = (() => {

  const SLOT_MS = 30 * 60 * 1000;          // rotasjonstakt: nytt utvalg hver halvtime
  const MAX_AGE = 55 * 60 * 1000;          // hent ny shortliste når data er så gamle
  const EMPTY_TTL = 5 * 60 * 1000;         // tomt svar: prøv igjen snart (serveren cacher tomt kun 5 min)
  const KEEP_MS = 7 * 24 * 3600 * 1000;    // hvor lenge en lagret shortliste kan vises som reserve
  const LS_KEY = (g) => 'pv_aifresh_' + g;
  const _slot = () => Math.floor(Date.now() / SLOT_MS);

  // Delt hurtigbuffer per sjanger, slik at flere seksjoner på samme side (og
  // navigasjon mellom sider) deler ett nettverkskall.
  const _cache = {};                        // genre → { at, articles }
  const _inflight = {};                     // genre → Promise
  const _mounts = [];                       // aktive seksjoner som skal roteres
  let _timer = null;
  let _lastSlot = _slot();

  // Forrige shortliste lagres lokalt. Et CDN-bom (typisk rett etter en deploy) tar
  // 20–60 s fordi AI-en søker på nett — da viser vi forrige runde med en gang, og
  // bytter den ut når det ferske svaret kommer. Roteringen går videre som normalt.
  function _load(genre) {
    try {
      const raw = localStorage.getItem(LS_KEY(genre));
      if (!raw) return null;
      const o = JSON.parse(raw);
      if (!o || !Array.isArray(o.articles) || !o.articles.length) return null;
      if (Date.now() - (o.at || 0) > KEEP_MS) return null;
      return o;
    } catch (_) { return null; }
  }
  function _save(genre, articles) {
    try {
      if (!articles || !articles.length) return;
      localStorage.setItem(LS_KEY(genre), JSON.stringify({ at: Date.now(), articles }));
    } catch (_) { /* full/blokkert lagring: bare hopp over */ }
  }

  function esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ── Varsel om nye saker ───────────────────────────────────────────────────
  // Magasinet er det einaste innhaldet på sida som faktisk fornyar seg av seg
  // sjølv (cron varmar /api/magazine to gonger i døgnet), og det same feedet
  // driv både #/magazine, #/world og #/underground. Difor ligg hooken her, i
  // det eine punktet der ferske saker kjem inn — ikkje i tre sidemodular.
  //
  // Reglar som gjer at dette ikkje blir støy:
  //   • Berre for innlogga brukarar (Notify.pushLocal krev det uansett).
  //   • FØRSTE gongen vi ser ein sjanger blir alt berre registrert som sett —
  //     ein ny brukar skal ikkje få åtte varsel i det han opnar magasinet.
  //   • Maks to varsel per sjanger, og maks fem per økt.
  //   • Tittelen er identiteten. Rotasjonen i pick() viser same sak om att i det
  //     uendelege, så utan denne lista ville kvar rotasjon sett ut som noko nytt.
  const SEEN_KEY  = (u) => 'sc_seen_articles_' + u;
  const SEEN_MAX  = 120;                    // titlar vi hugsar per sjanger
  const NOTIF_MAX_SESSION = 5;
  let _notifiedThisSession = 0;

  const GENRE_LINK = (g) =>
    (!g || g === 'alle') ? '#/magazine' : `#/magazine/sjanger/${encodeURIComponent(g)}`;

  function _seenAll(user) {
    try { return JSON.parse(localStorage.getItem(SEEN_KEY(user)) || '{}'); }
    catch (_) { return {}; }
  }

  function _notifyNew(genre, articles) {
    if (typeof Auth === 'undefined' || typeof Notify === 'undefined' || !Notify.pushLocal) return;
    const me = Auth.current();
    if (!me || !articles || !articles.length) return;

    const store = _seenAll(me.username);
    const known = Array.isArray(store[genre]) ? store[genre] : null;
    const titles = articles.map(a => String((a && a.tittel) || '')).filter(Boolean);
    if (!titles.length) return;

    if (known) {
      const knownSet = new Set(known);
      const fresh = titles.filter(t => !knownSet.has(t));
      for (const t of fresh.slice(0, 2)) {
        if (_notifiedThisSession >= NOTIF_MAX_SESSION) break;
        _notifiedThisSession++;
        Notify.pushLocal({
          // Deterministisk id: same sak gir same varsel om lista blir lesen på nytt.
          id: 'mag_' + genre + '_' + t.slice(0, 60),
          type: 'magazine',
          from: '', fromDisplay: 'Magazine',
          text: `new story: “${t}”`,
          link: GENRE_LINK(genre),
        });
      }
    }

    // Registrer alt vi såg — også første gong, då utan varsel.
    store[genre] = titles.concat(known || []).slice(0, SEEN_MAX);
    try { localStorage.setItem(SEEN_KEY(me.username), JSON.stringify(store)); }
    catch (_) { /* full/blokkert lagring: varsel er ikkje verdt å krasje for */ }
  }

  async function _fetch(genre) {
    if (_inflight[genre]) return _inflight[genre];
    _inflight[genre] = (async () => {
      try {
        const r = await fetch('/api/magazine?genre=' + encodeURIComponent(genre));
        const data = await r.json().catch(() => ({}));
        const articles = (data && data.articles) || [];
        if (articles.length) {
          _cache[genre] = { at: Date.now(), articles };
          _save(genre, articles);
          try { _notifyNew(genre, articles); } catch (_) { /* varsel skal aldri velte henting */ }
          return articles;
        }
        // Tomt svar: behold forrige lagrede runde som reserve, og prøv igjen snart.
        const prev = _load(genre);
        _cache[genre] = { at: Date.now(), articles: prev ? prev.articles : [], stale: !!prev };
        return _cache[genre].articles;
      } catch (_) {
        const prev = _load(genre);
        _cache[genre] = { at: Date.now(), articles: prev ? prev.articles : [], stale: !!prev };
        return _cache[genre].articles;
      } finally {
        delete _inflight[genre];
      }
    })();
    return _inflight[genre];
  }

  // Er bufferen fersk nok? Tomme svar får kort levetid, så en dårlig runde på
  // serveren ikke lar seksjonen stå tom resten av økta.
  function _fresh(c) {
    if (!c) return false;
    const ttl = (c.articles.length && !c.stale) ? MAX_AGE : EMPTY_TTL;
    return Date.now() - c.at < ttl;
  }

  // Shortliste for en sjanger — fra buffer hvis den er fersk nok.
  async function list(genre) {
    const c = _cache[genre];
    if (_fresh(c)) return c.articles;
    return _fetch(genre);
  }

  // Roterende utvalg: start på tidsluke-posisjonen og ta `limit` saker rundt lista,
  // så utvalget skifter hver halvtime selv om shortlisten er den samme.
  function pick(articles, limit) {
    const n = articles.length;
    if (!n) return [];
    const take = Math.min(limit || 4, n);
    const start = _slot() % n;
    const out = [];
    for (let i = 0; i < take; i++) out.push(articles[(start + i) % n]);
    return out;
  }

  function card(a, emoji) {
    return `
      <a class="mag-card mag-card--live" href="${esc(a.kilde && a.kilde.url)}" target="_blank" rel="noopener">
        <div class="mag-card-art" style="background:linear-gradient(135deg,#0a2540,#11324f,#0d3a5e)">
          <span class="mag-card-emoji">${emoji || '🛰️'}</span>
          <span class="mag-card-cat">Fresh from the web</span>
        </div>
        <div class="mag-card-body">
          <div class="mag-card-title notranslate">${esc(a.tittel)}</div>
          <div class="mag-card-ingress">${esc(a.ingress)}</div>
          <div class="mag-card-meta">
            <span class="notranslate">${esc((a.kilde && a.kilde.navn) || 'Source')}</span>
            <span class="mag-card-cta">Open ↗</span>
          </div>
        </div>
      </a>`;
  }

  function _headHTML(m) {
    const ico = (typeof Icon === 'function') ? Icon('sparkles') : '✨';
    return `<div class="mag-section-head">${ico} <span>${esc(m.title)}</span>${
      m.sub ? `<span class="ai-fresh-sub">${esc(m.sub)}</span>` : ''}</div>`;
  }

  function _paint(m, articles) {
    const box = document.getElementById(m.id);
    if (!box) return false;
    const items = pick(articles, m.limit);
    if (!items.length) { box.style.display = 'none'; box.innerHTML = ''; return true; }
    box.style.display = '';
    box.innerHTML = `
      <div class="mag-section ai-fresh">
        ${_headHTML(m)}
        <div class="mag-grid">${items.map(a => card(a, m.emoji)).join('')}</div>
      </div>`;
    return true;
  }

  function _loading(m) {
    const box = document.getElementById(m.id);
    if (!box) return;
    box.style.display = '';
    box.innerHTML = `
      <div class="mag-section ai-fresh">
        ${_headHTML(m)}
        <div class="ai-fresh-loading">Fetching fresh stories from the web …</div>
      </div>`;
  }

  // Rotér åpne seksjoner ved hver halvtimes-grense, og hent ny shortliste når
  // dataene begynner å bli gamle. Seksjoner som er borte fra DOM ryddes bort.
  function _schedule() {
    if (_timer) return;
    _timer = setInterval(async () => {
      if (document.hidden) return;
      const slotNow = _slot();
      const slotChanged = slotNow !== _lastSlot;
      _lastSlot = slotNow;
      for (let i = _mounts.length - 1; i >= 0; i--) {
        const m = _mounts[i];
        if (!document.getElementById(m.id)) { _mounts.splice(i, 1); continue; }
        const stale = !_fresh(_cache[m.genre]);
        if (!slotChanged && !stale) continue;
        const articles = await list(m.genre);
        _paint(m, articles);
      }
      if (!_mounts.length) { clearInterval(_timer); _timer = null; }
    }, 60 * 1000);
  }

  // Monter en seksjon.
  //   id     – id på tom <div> som skal fylles
  //   genre  – sjangernøkkel i /api/magazine (psychill, psytrance, techno-underground, world …)
  //   title  – overskrift
  //   limit  – antall kort som vises av gangen (roterer i shortlisten)
  //   emoji  – kort-emoji
  //   sub    – valgfri undertekst i overskriften
  async function mount(opts) {
    const m = {
      id: opts.id, genre: opts.genre || 'alle',
      title: opts.title || 'Fresh from the web',
      limit: opts.limit || 4, emoji: opts.emoji || '🛰️', sub: opts.sub || '',
    };
    if (!document.getElementById(m.id)) return;
    const cached = _cache[m.genre];
    const stored = cached ? null : _load(m.genre);
    if (_fresh(cached)) _paint(m, cached.articles);
    else if (stored) _paint(m, stored.articles);   // forrige runde vises straks
    else _loading(m);
    _mounts.push(m);
    _schedule();
    const articles = await list(m.genre);
    if (articles.length || !stored) _paint(m, articles);
  }

  // Fjern alle registrerte seksjoner (ved sidebytte). Trygt å kalle når som helst.
  function reset() { _mounts.length = 0; }

  return { mount, reset, list, pick, card };
})();
