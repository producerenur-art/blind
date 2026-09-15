/* ═══════════════════════════════════════════════
   A1 — eiga fane (#/a1): drabar AI-chat + gratis universalsøk til heile nettet
   + vekevis roterande galleri av eigarkuraterte lenker og videoar.
   Alt gratis: søk opnar eksterne søkemotorar i ny fane, A1 svarar via /api/chat,
   galleriet er statiske lenker (favicon-logoar) + YouTube/video-URL-ar.
   ═══════════════════════════════════════════════ */
const A1 = (() => {
  // ── Vekerotasjon (same mønster som discover.js) ──────────────────────
  const weeklyIndex = () => Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
  const rotate = (arr, offset = 0) => (arr && arr.length) ? arr[(weeklyIndex() + offset) % arr.length] : null;

  // ══ EIGARKURATERT GLOBAL LISTE — rediger fritt, same for alle brukarar ══
  // Lenker: vert viste som logo-kort. Klikk → opnar nettstaden i ny fane.
  const LINKS = [
    { name: 'Steps to Knowledge',        url: 'https://stepstoknowledge.com/' },
    { name: 'The Greater Community (IMDb)', url: 'https://www.imdb.com/title/tt37605896/' },
    { name: 'Marshall Vian Summers',     url: 'https://marshallsummers.com/' },
    { name: 'New Knowledge Library',     url: 'https://newknowledgelibrary.org/' },
    { name: 'Book Yoga Retreats',        url: 'https://www.bookyogaretreats.com/' },
    { name: 'The New Message',           url: 'https://www.newmessage.org/about/introduction-to-the-new-message/' }, // gamal URL var 404, retta 08.09.2026
    { name: 'The Great Waves of Change', url: 'https://www.greatwavesofchange.org/' },
    { name: 'Allies of Humanity',        url: 'https://www.alliesofhumanity.org/' },
  ];

  // Videoar: YouTube- eller direkte video-URL-ar. Legg til/byt ut fritt.
  // Eks: { title: 'Min film', url: 'https://www.youtube.com/watch?v=XXXXXXXXXXX' }
  // Alle ID-ar verifiserte embeddable via YouTube oEmbed 2026-06-28 (offisielle kanalar).
  const VIDEOS = [
    { title: 'The Story of the Messenger — Marshall Vian Summers',                 url: 'https://www.youtube.com/watch?v=GTlV3-UOe94' },
    { title: 'A Prayer for the World — Marshall Vian Summers',                     url: 'https://www.youtube.com/watch?v=mXPfCg1HKVU' },
    { title: 'The Allies of Humanity — presentert av Marshall Vian Summers',       url: 'https://www.youtube.com/watch?v=g4EjxvGcOUQ' },
    { title: 'The Extraterrestrial Presence in the World Today — Allies, Book One', url: 'https://www.youtube.com/watch?v=OWXp0INcv9Q' },
    { title: '12-Point Summary of the Allies of Humanity Briefings',               url: 'https://www.youtube.com/watch?v=YX7yxk85woM' },
    { title: 'Allies of Humanity — Book Four',                                      url: 'https://www.youtube.com/watch?v=UJ8iNy95U9k' },
  ];

  // ── Delte lenker/videoar (Gun + Supabase — synlege for ALLE innlogga) ──
  // Brukarønske 15.09.2026: "alle kan dele her" — dette skal vere eit delt
  // feed, ikkje berre synleg i nettlesaren som la det til. Gjenbrukar
  // Community sin eksisterande Gun+Supabase-infrastruktur (Community.
  // shareMedia/CommunitySync — same mønster som Community-veggen og radio-
  // chatten) i staden for å byggje ny lagring frå botnen. Kvar oppføring
  // merkast `label:'a1'` slik at community.js sitt "Alt"-filter kan skjule
  // desse frå den vanlege Community-veggen (matchesFilter).
  const VKEY_LEGACY = 'a1_user_videos';        // gamal lokal-only liste (før 15.09.2026)
  const SHARED_CACHE_KEY = 'a1_shared_cache';  // rask lokal cache av det delte feedet
  const MIGRATED_KEY = 'a1_shared_migrated_v1';
  let _sharedLinks = [];   // { id, title, url, thumb, addedAt, author } — nyaste først
  let _sharedSubbed = false;

  function _loadSharedCache() {
    try { _sharedLinks = JSON.parse(localStorage.getItem(SHARED_CACHE_KEY)) || []; } catch { _sharedLinks = []; }
  }
  function _saveSharedCache() {
    try { localStorage.setItem(SHARED_CACHE_KEY, JSON.stringify(_sharedLinks.slice(0, 60))); } catch {}
  }
  // Slår saman ein Community-post (frå Gun eller Supabase) inn i _sharedLinks.
  // Returnerer true om noko faktisk endra seg (så kallaren veit om ho skal re-rendere).
  function _mergeSharedPost(p) {
    if (!p || !p.id || p.label !== 'a1' || !p.mediaUrl) return false;
    const entry = {
      id: p.id, title: p.name || host(p.mediaUrl), url: p.mediaUrl,
      thumb: p.coverUrl || '', addedAt: Number(p.ts) || 0, author: p.author || '',
    };
    const i = _sharedLinks.findIndex(x => x.id === entry.id);
    if (i === -1) _sharedLinks.push(entry); else _sharedLinks[i] = entry;
    _sharedLinks.sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
    return true;
  }
  function _rerenderVideos() {
    const wrap = document.getElementById('a1-video-wrap');
    if (wrap) wrap.innerHTML = videoMarkup();
  }
  // Sanntid: nye delte lenker frå ANDRE brukarar dukkar opp med ein gong.
  function _subscribeShared() {
    if (_sharedSubbed || typeof SC === 'undefined' || !SC.gun || !SC.gun()) return;
    _sharedSubbed = true;
    SC.sub(SC.gun().get(SC.NS.posts).get('posts'), (p) => {
      if (_mergeSharedPost(p)) { _saveSharedCache(); _rerenderVideos(); }
    });
  }
  // Varig, på-tvers-av-einingar: hent siste frå Supabase (Gun-relayer er ikkje
  // pålitelege på tvers av nettlesarar/einingar — same grunn som Community).
  async function _hydrateShared() {
    if (typeof CommunitySync === 'undefined') return;
    const posts = await CommunitySync.list(300);
    let changed = false;
    posts.forEach(p => { if (_mergeSharedPost(p)) changed = true; });
    if (changed) { _saveSharedCache(); _rerenderVideos(); }
  }
  // Éin gong: flytt gamle localStorage-only-lenker (lagt til før denne fiksen)
  // inn i det delte feedet, så dei ikkje berre forsvinn for brukaren som hadde dei.
  function _migrateLegacyOnce() {
    try {
      if (localStorage.getItem(MIGRATED_KEY) === '1') return;
      const legacy = JSON.parse(localStorage.getItem(VKEY_LEGACY) || '[]');
      const me = (typeof Auth !== 'undefined' && Auth.current && Auth.current()) || null;
      if (me && typeof Community !== 'undefined' && Community.shareMedia && legacy.length) {
        legacy.forEach(v => {
          if (!v || !v.url) return;
          Community.shareMedia({ kind: 'link', name: v.title || host(v.url), url: v.url, coverUrl: v.thumb || '', label: 'a1', audience: 'public' });
        });
      }
      localStorage.setItem(MIGRATED_KEY, '1');
    } catch {}
  }
  function userVideos() { return _sharedLinks; }
  function allVideos() { return [..._sharedLinks, ...VIDEOS]; }

  // ── Hjelparar ────────────────────────────────────────────────────────
  function host(u) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return String(u); } }
  function favicon(u) { return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host(u))}&sz=128`; }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  // Trygg for bruk inni ein enkelt-sitert onclick-attributt (esc() åleine dekker ikkje ').
  function jsq(s) { return String(s == null ? '' : s).replace(/\\/g,'\\\\').replace(/'/g,"\\'"); }
  function ytId(u) { const m = String(u).match(/(?:youtu\.be\/|[?&]v=|embed\/|shorts\/)([\w-]{11})/); return m ? m[1] : null; }

  // ── Universal-søk: opnar eit eksternt søk i ny fane ──────────────────
  const ENGINES = [
    { key: 'google',     name: 'Google',     url: q => `https://www.google.com/search?q=${q}` },
    { key: 'duckduckgo', name: 'DuckDuckGo', url: q => `https://duckduckgo.com/?q=${q}` },
    { key: 'youtube',    name: 'YouTube',    url: q => `https://www.youtube.com/results?search_query=${q}` },
    { key: 'wikipedia',  name: 'Wikipedia',  url: q => `https://en.wikipedia.org/w/index.php?search=${q}` },
    { key: 'brave',      name: 'Brave',      url: q => `https://search.brave.com/search?q=${q}` },
  ];
  // Innhaldsfilter: porno/ulovleg blir stoppa før vi opnar noko eller spør A1.
  // Returnerer true når søket er greitt, false når det er blokkert (og viser da
  // varselet under søkefeltet).
  function passesFilter(q) {
    if (typeof SafeSearch === 'undefined') return true;
    const verdict = SafeSearch.check(q);
    if (verdict.ok) { showSearchWarn(null); return true; }
    showSearchWarn(verdict);
    if (typeof App !== 'undefined' && App.toast) App.toast(verdict.toast, 'error', 5000);
    return false;
  }

  function showSearchWarn(verdict) {
    const box = document.getElementById('a1-search-warn');
    if (!box) return;
    if (!verdict) { box.classList.remove('is-on'); box.textContent = ''; return; }
    box.textContent = verdict.message;
    box.classList.add('is-on');
  }

  function searchOn(engineKey) {
    const inp = document.getElementById('a1-search-input');
    const q = (inp && inp.value.trim()) || '';
    if (q && !passesFilter(q)) return;
    const eng = ENGINES.find(e => e.key === engineKey) || ENGINES[0];
    let url = q ? eng.url(encodeURIComponent(q)) : eng.url('').replace(/[?&].*$/, '');
    // Slå på søkemotoren sitt eige familiefilter på resultatsida òg
    if (typeof SafeSearch !== 'undefined') url = SafeSearch.withSafeParams(url, eng.key);
    window.open(url, '_blank', 'noopener,noreferrer');
  }
  function askA1FromSearch() {
    const inp = document.getElementById('a1-search-input');
    const q = (inp && inp.value.trim()) || '';
    if (!q) { inp && inp.focus(); return; }
    if (!passesFilter(q)) return;
    chatAsk(q);
  }

  // ════════════════════════════════════════════════════════════════════
  //  DRABAR A1-CHAT  (flyttbar høgre/venstre/opp/ned — posisjon lagra)
  // ════════════════════════════════════════════════════════════════════
  const POS_KEY = 'a1_chat_pos';
  const MIN_KEY = 'a1_chat_min';
  const HIDE_KEY = 'a1_chat_hidden';
  let chatHistory = [];
  let chatBusy = false;
  let voiceCtrl = null;   // delt stemme-lag (snakk inn / les opp / ta opp)

  function loadPos() { try { return JSON.parse(localStorage.getItem(POS_KEY)) || null; } catch { return null; } }
  function savePos(p) { try { localStorage.setItem(POS_KEY, JSON.stringify(p)); } catch {} }
  function loadCollapsed() { try { return localStorage.getItem(MIN_KEY) === '1'; } catch { return false; } }
  function saveCollapsed(v) { try { localStorage.setItem(MIN_KEY, v ? '1' : '0'); } catch {} }
  function loadHidden() { try { return localStorage.getItem(HIDE_KEY) === '1'; } catch { return false; } }
  function saveHidden(v) { try { localStorage.setItem(HIDE_KEY, v ? '1' : '0'); } catch {} }

  function applyCollapsed(collapsed) {
    const el = chatEl(); if (!el) return;
    el.classList.toggle('is-collapsed', collapsed);
    const btn = document.getElementById('a1-chat-min');
    if (btn) {
      btn.innerHTML = Icon(collapsed ? 'chevron-up' : 'chevron-down');
      btn.title = collapsed ? 'Open chat' : 'Close chat';
    }
  }
  function toggleChat() {
    const el = chatEl(); if (!el) return;
    const collapsed = !el.classList.contains('is-collapsed');
    saveCollapsed(collapsed);
    applyCollapsed(collapsed);
  }

  // Lukk heilt (skjul panelet) — flytande knapp nede til venstre opnar det att
  function applyHidden(hidden) {
    const el = chatEl(); if (el) el.classList.toggle('is-hidden', hidden);
    const fab = document.getElementById('a1-chat-fab');
    if (fab) fab.classList.toggle('is-on', hidden);
  }
  function closeChat() { saveHidden(true); applyHidden(true); }
  function openChat(focus = true) {
    saveHidden(false); applyHidden(false);
    const el = chatEl();
    if (el && el.classList.contains('is-collapsed')) { saveCollapsed(false); applyCollapsed(false); }
    if (focus) { const inp = document.getElementById('a1-chat-input'); if (inp) inp.focus(); }
  }

  function chatEl() { return document.getElementById('a1-chat'); }
  function msgsEl() { return document.getElementById('a1-chat-msgs'); }

  function chatAddMsg(role, text, push = true) {
    const m = msgsEl(); if (!m) return null;
    const div = document.createElement('div');
    div.className = 'a1-chat-msg a1-chat-msg-' + role;
    div.textContent = text;
    m.appendChild(div);
    m.scrollTop = m.scrollHeight;
    if (push) chatHistory.push({ role, content: text });
    return div;
  }
  function chatTyping() {
    const m = msgsEl(); if (!m) return null;
    const div = document.createElement('div');
    div.className = 'a1-chat-msg a1-chat-msg-assistant a1-chat-typing';
    div.innerHTML = '<span></span><span></span><span></span>';
    m.appendChild(div); m.scrollTop = m.scrollHeight;
    return div;
  }

  async function chatSend(text) {
    if (!text || chatBusy) return;
    // Same filter som søkefeltet — gjeld òg tekst frå mikrofonen.
    if (typeof SafeSearch !== 'undefined') {
      const verdict = SafeSearch.check(text);
      if (!verdict.ok) {
        // Ikkje push til chatHistory: blokkerte turar skal ikkje bli med vidare til AI-en.
        chatAddMsg('user', text, false);
        chatAddMsg('assistant', verdict.message, false);
        if (typeof App !== 'undefined' && App.toast) App.toast(verdict.toast, 'error', 5000);
        return;
      }
    }
    chatAddMsg('user', text);
    if (voiceCtrl) voiceCtrl.log('user', text);
    chatBusy = true;
    const typing = chatTyping();
    try {
      const user = (typeof Auth !== 'undefined' && Auth.current && Auth.current()) || null;
      const ctxNote = `bruker er på A1-fana (#/a1)${user ? `, innlogget som @${user.username}` : ', ikke innlogget'}`;
      const langName = voiceCtrl ? voiceCtrl.langName() : null;   // svar på valt språk
      const reply = await AI.assistantChat(chatHistory, { langName, contextNote: ctxNote });
      if (typing) typing.remove();
      const answer = reply || '…';
      chatAddMsg('assistant', answer);
      if (voiceCtrl) { voiceCtrl.log('assistant', answer); voiceCtrl.speak(answer); }
    } catch (e) {
      if (typing) typing.remove();
      const soon = /not configured|konfigurert|503|credit|balance|billing|kreditt/i.test(String(e && e.message));
      // Turen feila — fjern den ubesvarte bruker-meldingen frå historikken så rollane
      // held fram med å veksle. Elles blir neste tur user,user → Anthropic 400.
      if (chatHistory.length && chatHistory[chatHistory.length - 1].role === 'user') chatHistory.pop();
      chatAddMsg('assistant', soon
        ? '✨ A1 is almost ready — the chat comes online the moment the AI key is in place.'
        : 'Sorry, something went wrong. Try again in a moment.', false);
    } finally {
      chatBusy = false;
    }
  }

  // Offentleg: still A1 eit spørsmål (brukt av universal-søket)
  function chatAsk(text) {
    openChat(false);                       // hent panelet fram om det er lukka
    const inp = document.getElementById('a1-chat-input');
    if (inp) inp.value = '';
    chatSend(text);
  }

  function applyChatPos(x, y) {
    const el = chatEl(); if (!el) return;
    el.style.left = x + 'px'; el.style.top = y + 'px';
    el.style.right = 'auto'; el.style.bottom = 'auto';
  }
  function initChatDrag() {
    const el = chatEl(); if (!el) return;
    const handle = el.querySelector('.a1-chat-head');
    let dragging = false, sx, sy, sl, st;
    const point = e => { const t = e.touches ? e.touches[0] : e; return { x: t.clientX, y: t.clientY }; };
    function down(e) {
      if (e.target.closest('button, input, select')) return;
      dragging = true;
      const p = point(e);
      sx = p.x; sy = p.y; sl = parseInt(el.style.left) || el.offsetLeft; st = parseInt(el.style.top) || el.offsetTop;
      e.preventDefault();
    }
    function move(e) {
      if (!dragging) return;
      const p = point(e);
      const maxL = window.innerWidth - el.offsetWidth, maxT = window.innerHeight - el.offsetHeight;
      const x = Math.max(0, Math.min(maxL, sl + (p.x - sx)));
      const y = Math.max(0, Math.min(maxT, st + (p.y - sy)));
      applyChatPos(x, y);
    }
    function up() {
      if (!dragging) return; dragging = false;
      savePos({ x: parseInt(el.style.left) || 0, y: parseInt(el.style.top) || 0 });
    }
    handle.addEventListener('mousedown', down);
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
    handle.addEventListener('touchstart', down, { passive: false });
    document.addEventListener('touchmove', move, { passive: false });
    document.addEventListener('touchend', up);
  }

  function chatMarkup() {
    return `
      <div class="a1-chat" id="a1-chat">
        <div class="a1-chat-head" id="a1-chat-head" title="Drag to move">
          <span class="a1-chat-grip">${Icon('grip')}</span>
          <span class="a1-chat-title">${Icon('sparkles')} A1 chat</span>
          <span class="a1-chat-hint">drag me ↔ ↕</span>
          <button type="button" class="a1-chat-min" id="a1-chat-min" onclick="A1.toggleChat()" title="Minimise chat" aria-label="Minimise or expand chat">${Icon('chevron-down')}</button>
          <button type="button" class="a1-chat-min a1-chat-close" id="a1-chat-close" onclick="A1.closeChat()" title="Close chat" aria-label="Close chat">${Icon('x')}</button>
        </div>
        <div class="a1-chat-msgs" id="a1-chat-msgs"></div>
        <form class="a1-chat-form" id="a1-chat-form">
          <input id="a1-chat-input" class="a1-chat-input" type="text" autocomplete="off" placeholder="Ask A1 anything…">
          <button class="a1-chat-send" type="submit" title="Send">${Icon('send')}</button>
        </form>
      </div>
      <button type="button" class="a1-chat-fab" id="a1-chat-fab" onclick="A1.openChat()" title="Open A1 chat" aria-label="Open A1 chat">
        ${Icon('sparkles')}<span>A1 chat</span>
      </button>`;
  }

  // ── Galleri-markup ───────────────────────────────────────────────────
  function linkCard(l, featured = false) {
    return `
      <a class="a1-link-card${featured ? ' a1-link-card--feat' : ''}" href="${esc(l.url)}" target="_blank" rel="noopener noreferrer" title="${esc(l.name)} — opens in a new tab">
        ${featured ? `<span class="a1-feat-badge">${Icon('star')} Site of the week</span>` : ''}
        <img class="a1-link-logo" src="${favicon(l.url)}" alt="" loading="lazy"
             onerror="this.style.display='none'">
        <span class="a1-link-name">${esc(l.name)}</span>
        <span class="a1-link-host">${esc(host(l.url))} ${Icon('arrow-up-right')}</span>
      </a>`;
  }

  function videoMarkup() {
    const vids = allVideos();
    if (!vids.length) {
      return `<div class="a1-video-empty">${Icon('film')}<p>No videos yet. Paste a YouTube or video link below — it rotates automatically every week.</p></div>`;
    }
    // Brukarønske 15.09.2026: det nyaste brukar-lagt-til-lenka skal ALLTID
    // vere den store, framheva videoen — ikkje underlagt vekerotasjonen.
    // Vekerotasjonen gjeld berre dei kuraterte VIDEOS når ingen brukar-
    // videoar finst enno (elles ville rotasjonen aldri vist variasjon,
    // sidan vids[0] då alltid ville vore same globale video).
    const feat = userVideos().length ? vids[0] : (rotate(vids) || vids[0]);
    const yt = ytId(feat.url);
    const player = yt
      ? `<iframe class="a1-video-frame" src="https://www.youtube-nocookie.com/embed/${yt}" title="${esc(feat.title || 'Video')}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`
      : `<video class="a1-video-frame" src="${esc(feat.url)}" controls playsinline></video>`;
    const others = vids.map((v, i) => ({ v, i })).filter(o => o.v !== feat).slice(0, 6).map(({ v, i }) => {
      const id = ytId(v.url);
      const thumb = id ? `https://i.ytimg.com/vi/${id}/mqdefault.jpg` : (v.thumb || '');
      return `<button class="a1-video-thumb" onclick="A1.featureVideo(${i})" title="${esc(v.title || 'Video')}">
        ${thumb ? `<img src="${thumb}" alt="" loading="lazy">` : `<span class="a1-video-thumb-fallback">${Icon('play')}</span>`}
        <span class="a1-video-thumb-title">${esc(v.title || host(v.url))}</span>
        <span class="a1-video-thumb-share" title="Share" onclick="event.stopPropagation();A1.shareLink('${jsq(v.url)}','${jsq(v.title || host(v.url))}','${jsq(thumb)}')">${Icon('share')}</span>
      </button>`;
    }).join('');
    const featThumb = ytId(feat.url) ? '' : (feat.thumb || '');
    return `
      <div class="a1-video-player">
        <span class="a1-feat-badge">${Icon('star')} Video of the week</span>
        <button type="button" class="a1-video-share-btn" title="Share" onclick="A1.shareLink('${jsq(feat.url)}','${jsq(feat.title || host(feat.url))}','${jsq(featThumb)}')">${Icon('share')} Share</button>
        ${player}
        <div class="a1-video-cap">${esc(feat.title || host(feat.url))}</div>
      </div>
      ${others ? `<div class="a1-video-strip">${others}</div>` : ''}`;
  }

  // ── Hovudrender ──────────────────────────────────────────────────────
  function render() {
    const app = document.getElementById('app');
    if (!app) return;
    const user = (typeof Auth !== 'undefined' && Auth.current && Auth.current()) || null;

    const featLink = rotate(LINKS) || LINKS[0];
    const restLinks = LINKS.filter(l => l !== featLink);
    _loadSharedCache();
    _migrateLegacyOnce();
    _subscribeShared();
    _hydrateShared();

    app.innerHTML = `
      <div class="a1-page">
        <header class="a1-hero">
          <div class="a1-hero-badge">${Icon('sparkles')} A1</div>
          <h1>The Whole Web Search</h1>
          <p>Ask A1 anything, search the entire web, and explore this week's featured sites and videos. All free.</p>
        </header>

        <section class="a1-search-box">
          <div class="a1-search-row">
            <span class="a1-search-ico">${Icon('search')}</span>
            <input id="a1-search-input" class="a1-search-input" type="text" autocomplete="off"
                   placeholder="Search the whole web, or ask A1…"
                   onkeydown="if(event.key==='Enter'){event.preventDefault();A1.askA1FromSearch();}">
            <button class="btn btn-primary a1-search-ask" onclick="A1.askA1FromSearch()">${Icon('sparkles')} Ask A1</button>
          </div>
          <div class="a1-search-engines">
            <span class="a1-search-engines-lbl">Open in:</span>
            ${ENGINES.map(e => `<button class="a1-engine-btn" onclick="A1.searchOn('${e.key}')">${esc(e.name)} ${Icon('arrow-up-right')}</button>`).join('')}
          </div>
          <p class="a1-search-warn" id="a1-search-warn" role="alert"></p>
          <p class="a1-search-note">${Icon('lock')} Family-friendly search — adult and illegal searches are blocked, and safe search is always on.</p>
        </section>

        <section class="a1-section">
          <h2>${Icon('globe')} Sites of the week</h2>
          <p class="a1-section-sub">Rotates every week. Click a logo — the site opens in a new tab.</p>
          <div class="a1-link-grid">
            ${linkCard(featLink, true)}
            ${restLinks.map(l => linkCard(l)).join('')}
          </div>
        </section>

        <section class="a1-section">
          <h2>${Icon('film')} Videos of the week</h2>
          <p class="a1-section-sub">Videos rotate every week. ${user ? 'Paste a link to add your own.' : ''}</p>
          <div id="a1-video-wrap">${videoMarkup()}</div>
          ${user ? `
          <form class="a1-video-add" id="a1-video-add" onsubmit="return A1.addVideo(event)">
            <input id="a1-vid-url" type="url" class="a1-vid-input" placeholder="https://youtube.com/watch?v=… or .mp4 link" required>
            <input id="a1-vid-title" type="text" class="a1-vid-input a1-vid-title" placeholder="Title (optional)">
            <button type="submit" class="btn btn-gold">${Icon('plus')} Add</button>
          </form>` : `<p class="a1-video-login">${Icon('sparkles')} <a href="#/register">Create an account</a> to add your own videos.</p>`}
        </section>
      </div>

      ${chatMarkup()}`;

    // Plasser + aktiver drabar chat
    const pos = loadPos();
    if (pos && pos.x != null) applyChatPos(pos.x, pos.y);
    else {
      const w = 340, h = 440;
      applyChatPos(Math.max(12, window.innerWidth - w - 28), Math.max(80, window.innerHeight - h - 120));
    }
    initChatDrag();

    // Stemme-lag: mikrofon (snakk inn, alle språk) + AI les opp + opptak
    if (typeof Voice !== 'undefined') {
      voiceCtrl = Voice.create({
        ns: 'a1',
        withLang: true,                                            // eigen språkveljar i panelet
        defaultLang: () => localStorage.getItem('stellar-lang') || 'en',
        onText: (text) => chatAsk(text),
      });
      const chat = chatEl();
      const f = document.getElementById('a1-chat-form');
      if (chat && f) chat.insertBefore(voiceCtrl.el, f);
    }

    applyCollapsed(loadCollapsed());
    applyHidden(loadHidden());
    const form = document.getElementById('a1-chat-form');
    if (form) form.addEventListener('submit', e => { e.preventDefault();
      const inp = document.getElementById('a1-chat-input'); const v = inp.value.trim();
      if (v) { inp.value = ''; chatSend(v); } });

    // Førstegongs-helsing om chatten er tom
    if (!chatHistory.length) {
      chatAddMsg('assistant', 'Hi! I am A1 🌌 Ask me anything — or use the search field above to search the whole web. Drag me anywhere on the screen!', false);
    } else {
      // gjenoppbygg synleg historikk ved retur til fana
      chatHistory.forEach(m => chatAddMsg(m.role, m.content, false));
    }
  }

  // ── Del ei ny lenke/video med ALLE (krev innlogging) ─────────────────
  // Brukarønske 15.09.2026: "alle kan dele her" + "dei må ha brukarkonto".
  // Community.shareMedia() krev sjølv innlogging (returnerer null elles),
  // så login-kravet er handheva same stad som resten av sida.
  async function addVideo(e) {
    e.preventDefault();
    const url = (document.getElementById('a1-vid-url').value || '').trim();
    const title = (document.getElementById('a1-vid-title').value || '').trim();
    if (!url) return false;
    const me = (typeof Auth !== 'undefined' && Auth.current && Auth.current()) || null;
    if (!me || typeof Community === 'undefined' || !Community.shareMedia) {
      if (typeof App !== 'undefined' && App.toast) App.toast('Log in to share a link.', 'error');
      return false;
    }
    const btn = e.target.querySelector('button[type="submit"]');
    if (btn) btn.disabled = true;
    const name = title || host(url);
    const thumb = await _fetchOgImage(url);   // ekte forhandsbilete FØR posting, ikkje etterpå
    const id = Community.shareMedia({ kind: 'link', name, url, coverUrl: thumb, label: 'a1', audience: 'public' });
    if (btn) btn.disabled = false;
    if (id) {
      _mergeSharedPost({ id, name, mediaUrl: url, coverUrl: thumb, ts: Date.now(), author: me.username });
      _saveSharedCache();
      _rerenderVideos();
      document.getElementById('a1-vid-url').value = '';
      document.getElementById('a1-vid-title').value = '';
      if (typeof App !== 'undefined' && App.toast) App.toast('Shared with everyone ✓', 'success');
    } else if (typeof App !== 'undefined' && App.toast) {
      App.toast('Could not share — try again.', 'error');
    }
    return false;
  }

  // Hentar og:image server-side (det delte /api/unfurl-endepunktet, same som
  // lenke-førehandsvisingar elles på siten) FØR ei lenke vert delt, slik at
  // alle ser eit ekte bilete med ein gong — aldri berre eit generisk ikon.
  async function _fetchOgImage(url) {
    if (ytId(url)) return '';
    try {
      const r = await fetch('/api/unfurl?url=' + encodeURIComponent(url));
      const data = await r.json();
      return (data && data.image) || '';
    } catch { return ''; }
  }

  // Del vidare til sosiale medium (del-knapp på kvart kort) — trenger ikkje
  // innlogging, kven som helst som ser sida kan dele lenka vidare.
  function shareLink(url, title, thumb) {
    if (typeof Share !== 'undefined' && Share.shareUrl) {
      Share.shareUrl(url, title || host(url), null, { image: thumb || '', preferMenu: true });
    }
  }

  // Vel ein bestemt brukar-video som «ukas» (manuell overstyring i økta)
  function featureVideo(idx) {
    const vids = allVideos();
    const v = vids[idx]; if (!v) return;
    const wrap = document.getElementById('a1-video-wrap'); if (!wrap) return;
    const yt = ytId(v.url);
    const player = yt
      ? `<iframe class="a1-video-frame" src="https://www.youtube-nocookie.com/embed/${yt}?autoplay=1" title="${esc(v.title||'')}" frameborder="0" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`
      : `<video class="a1-video-frame" src="${esc(v.url)}" controls autoplay playsinline></video>`;
    wrap.querySelector('.a1-video-player').innerHTML =
      `<span class="a1-feat-badge">${Icon('star')} Now playing</span>${player}<div class="a1-video-cap">${esc(v.title||host(v.url))}</div>`;
  }

  return { render, searchOn, askA1FromSearch, addVideo, featureVideo, shareLink, chatAsk, toggleChat, closeChat, openChat };
})();
