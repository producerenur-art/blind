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
    { name: 'The New Message',           url: 'https://www.newmessage.org/book-intro/the-worldwide-community-of-the-new-message-from-god-introduction/' },
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

  // ── Brukar-lagra videoar (gratis, live — lagra lokalt i nettlesaren) ──
  const VKEY = 'a1_user_videos';
  function userVideos() { try { return JSON.parse(localStorage.getItem(VKEY)) || []; } catch { return []; } }
  function saveUserVideos(v) { try { localStorage.setItem(VKEY, JSON.stringify(v)); } catch {} }
  function allVideos() { return [...VIDEOS, ...userVideos()]; }

  // ── Hjelparar ────────────────────────────────────────────────────────
  function host(u) { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return String(u); } }
  function favicon(u) { return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host(u))}&sz=128`; }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function ytId(u) { const m = String(u).match(/(?:youtu\.be\/|[?&]v=|embed\/|shorts\/)([\w-]{11})/); return m ? m[1] : null; }

  // ── Universal-søk: opnar eit eksternt søk i ny fane ──────────────────
  const ENGINES = [
    { key: 'google',     name: 'Google',     url: q => `https://www.google.com/search?q=${q}` },
    { key: 'duckduckgo', name: 'DuckDuckGo', url: q => `https://duckduckgo.com/?q=${q}` },
    { key: 'youtube',    name: 'YouTube',    url: q => `https://www.youtube.com/results?search_query=${q}` },
    { key: 'wikipedia',  name: 'Wikipedia',  url: q => `https://en.wikipedia.org/w/index.php?search=${q}` },
    { key: 'brave',      name: 'Brave',      url: q => `https://search.brave.com/search?q=${q}` },
  ];
  function searchOn(engineKey) {
    const inp = document.getElementById('a1-search-input');
    const q = (inp && inp.value.trim()) || '';
    const eng = ENGINES.find(e => e.key === engineKey) || ENGINES[0];
    const url = q ? eng.url(encodeURIComponent(q)) : eng.url('').replace(/[?&].*$/, '');
    window.open(url, '_blank', 'noopener,noreferrer');
  }
  function askA1FromSearch() {
    const inp = document.getElementById('a1-search-input');
    const q = (inp && inp.value.trim()) || '';
    if (!q) { inp && inp.focus(); return; }
    chatAsk(q);
  }

  // ════════════════════════════════════════════════════════════════════
  //  DRABAR A1-CHAT  (flyttbar høgre/venstre/opp/ned — posisjon lagra)
  // ════════════════════════════════════════════════════════════════════
  const POS_KEY = 'a1_chat_pos';
  const MIN_KEY = 'a1_chat_min';
  let chatHistory = [];
  let chatBusy = false;

  function loadPos() { try { return JSON.parse(localStorage.getItem(POS_KEY)) || null; } catch { return null; } }
  function savePos(p) { try { localStorage.setItem(POS_KEY, JSON.stringify(p)); } catch {} }
  function loadCollapsed() { try { return localStorage.getItem(MIN_KEY) === '1'; } catch { return false; } }
  function saveCollapsed(v) { try { localStorage.setItem(MIN_KEY, v ? '1' : '0'); } catch {} }

  function applyCollapsed(collapsed) {
    const el = chatEl(); if (!el) return;
    el.classList.toggle('is-collapsed', collapsed);
    const btn = document.getElementById('a1-chat-min');
    if (btn) {
      btn.innerHTML = Icon(collapsed ? 'chevron-up' : 'chevron-down');
      btn.title = collapsed ? 'Opne chat' : 'Lukk chat';
    }
  }
  function toggleChat() {
    const el = chatEl(); if (!el) return;
    const collapsed = !el.classList.contains('is-collapsed');
    saveCollapsed(collapsed);
    applyCollapsed(collapsed);
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
    chatAddMsg('user', text);
    chatBusy = true;
    const typing = chatTyping();
    try {
      const user = (typeof Auth !== 'undefined' && Auth.current && Auth.current()) || null;
      const ctxNote = `bruker er på A1-fana (#/a1)${user ? `, innlogget som @${user.username}` : ', ikke innlogget'}`;
      const langName = (typeof Assistant !== 'undefined' && Assistant.langName) ? Assistant.langName() : null;
      const reply = await AI.assistantChat(chatHistory, { langName, contextNote: ctxNote });
      if (typing) typing.remove();
      chatAddMsg('assistant', reply || '…');
    } catch (e) {
      if (typing) typing.remove();
      const soon = /not configured|konfigurert|503|credit|balance|billing|kreditt/i.test(String(e && e.message));
      chatAddMsg('assistant', soon
        ? '✨ A1 er straks klar — chatten kobles på i det øyeblikket AI-nøkkelen er på plass.'
        : 'Beklager, noe gikk galt. Prøv igjen om litt.', false);
    } finally {
      chatBusy = false;
    }
  }

  // Offentleg: still A1 eit spørsmål (brukt av universal-søket)
  function chatAsk(text) {
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
        <div class="a1-chat-head" id="a1-chat-head" title="Dra for å flytte">
          <span class="a1-chat-grip">${Icon('grip')}</span>
          <span class="a1-chat-title">${Icon('sparkles')} A1-chat</span>
          <span class="a1-chat-hint">dra meg ↔ ↕</span>
          <button type="button" class="a1-chat-min" id="a1-chat-min" onclick="A1.toggleChat()" title="Lukk chat" aria-label="Lukk eller opne chat">${Icon('chevron-down')}</button>
        </div>
        <div class="a1-chat-msgs" id="a1-chat-msgs"></div>
        <form class="a1-chat-form" id="a1-chat-form">
          <input id="a1-chat-input" class="a1-chat-input" type="text" autocomplete="off" placeholder="Spør A1 om kva som helst…">
          <button class="a1-chat-send" type="submit" title="Send">${Icon('send')}</button>
        </form>
      </div>`;
  }

  // ── Galleri-markup ───────────────────────────────────────────────────
  function linkCard(l, featured = false) {
    return `
      <a class="a1-link-card${featured ? ' a1-link-card--feat' : ''}" href="${esc(l.url)}" target="_blank" rel="noopener noreferrer" title="${esc(l.name)} — opnar i ny fane">
        ${featured ? `<span class="a1-feat-badge">${Icon('star')} Ukas nettstad</span>` : ''}
        <img class="a1-link-logo" src="${favicon(l.url)}" alt="" loading="lazy"
             onerror="this.style.display='none'">
        <span class="a1-link-name">${esc(l.name)}</span>
        <span class="a1-link-host">${esc(host(l.url))} ${Icon('arrow-up-right')}</span>
      </a>`;
  }

  function videoMarkup() {
    const vids = allVideos();
    if (!vids.length) {
      return `<div class="a1-video-empty">${Icon('film')}<p>Ingen videoar enno. Lim inn ein YouTube- eller video-lenke nedanfor — den roterer automatisk kvar veke.</p></div>`;
    }
    const feat = rotate(vids) || vids[0];
    const yt = ytId(feat.url);
    const player = yt
      ? `<iframe class="a1-video-frame" src="https://www.youtube-nocookie.com/embed/${yt}" title="${esc(feat.title || 'Video')}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`
      : `<video class="a1-video-frame" src="${esc(feat.url)}" controls playsinline></video>`;
    const others = vids.map((v, i) => ({ v, i })).filter(o => o.v !== feat).slice(0, 6).map(({ v, i }) => {
      const id = ytId(v.url);
      const thumb = id ? `https://i.ytimg.com/vi/${id}/mqdefault.jpg` : '';
      return `<button class="a1-video-thumb" onclick="A1.featureVideo(${i})" title="${esc(v.title || 'Video')}">
        ${thumb ? `<img src="${thumb}" alt="" loading="lazy">` : `<span class="a1-video-thumb-fallback">${Icon('play')}</span>`}
        <span class="a1-video-thumb-title">${esc(v.title || host(v.url))}</span>
      </button>`;
    }).join('');
    return `
      <div class="a1-video-player">
        <span class="a1-feat-badge">${Icon('star')} Ukas video</span>
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

    app.innerHTML = `
      <div class="a1-page">
        <header class="a1-hero">
          <div class="a1-hero-badge">${Icon('sparkles')} A1</div>
          <h1>A1 — din AI + heile nettet</h1>
          <p>Spør A1 om kva som helst, søk på heile verdsveven, og utforsk ukas utvalde nettstader og videoar. Alt gratis.</p>
        </header>

        <section class="a1-search-box">
          <div class="a1-search-row">
            <span class="a1-search-ico">${Icon('search')}</span>
            <input id="a1-search-input" class="a1-search-input" type="text" autocomplete="off"
                   placeholder="Søk heile nettet, eller spør A1…"
                   onkeydown="if(event.key==='Enter'){event.preventDefault();A1.askA1FromSearch();}">
            <button class="btn btn-primary a1-search-ask" onclick="A1.askA1FromSearch()">${Icon('sparkles')} Spør A1</button>
          </div>
          <div class="a1-search-engines">
            <span class="a1-search-engines-lbl">Opne i:</span>
            ${ENGINES.map(e => `<button class="a1-engine-btn" onclick="A1.searchOn('${e.key}')">${esc(e.name)} ${Icon('arrow-up-right')}</button>`).join('')}
          </div>
        </section>

        <section class="a1-section">
          <h2>${Icon('globe')} Ukas nettstader</h2>
          <p class="a1-section-sub">Roterer kvar veke. Klikk ein logo — nettstaden opnar i ny fane.</p>
          <div class="a1-link-grid">
            ${linkCard(featLink, true)}
            ${restLinks.map(l => linkCard(l)).join('')}
          </div>
        </section>

        <section class="a1-section">
          <h2>${Icon('film')} Ukas videoar</h2>
          <p class="a1-section-sub">Videoar roterer kvar veke. ${user ? 'Lim inn ein lenke for å leggje til din eigen.' : ''}</p>
          <div id="a1-video-wrap">${videoMarkup()}</div>
          ${user ? `
          <form class="a1-video-add" id="a1-video-add" onsubmit="return A1.addVideo(event)">
            <input id="a1-vid-url" type="url" class="a1-vid-input" placeholder="https://youtube.com/watch?v=… eller .mp4-lenke" required>
            <input id="a1-vid-title" type="text" class="a1-vid-input a1-vid-title" placeholder="Tittel (valfritt)">
            <button type="submit" class="btn btn-gold">${Icon('plus')} Legg til</button>
          </form>` : `<p class="a1-video-login">${Icon('sparkles')} <a href="#/register">Lag ein bruker</a> for å leggje til dine eigne videoar.</p>`}
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
    applyCollapsed(loadCollapsed());
    const form = document.getElementById('a1-chat-form');
    if (form) form.addEventListener('submit', e => { e.preventDefault();
      const inp = document.getElementById('a1-chat-input'); const v = inp.value.trim();
      if (v) { inp.value = ''; chatSend(v); } });

    // Førstegongs-helsing om chatten er tom
    if (!chatHistory.length) {
      chatAddMsg('assistant', 'Hei! Eg er A1 🌌 Spør meg om kva som helst — eller bruk søkefeltet over for å søke heile nettet. Dra meg dit du vil på skjermen!', false);
    } else {
      // gjenoppbygg synleg historikk ved retur til fana
      chatHistory.forEach(m => chatAddMsg(m.role, m.content, false));
    }
  }

  // ── Legg til brukar-video (gratis, lokalt) ───────────────────────────
  function addVideo(e) {
    e.preventDefault();
    const url = (document.getElementById('a1-vid-url').value || '').trim();
    const title = (document.getElementById('a1-vid-title').value || '').trim();
    if (!url) return false;
    const v = userVideos();
    v.push({ title: title || host(url), url });
    saveUserVideos(v);
    const wrap = document.getElementById('a1-video-wrap');
    if (wrap) wrap.innerHTML = videoMarkup();
    document.getElementById('a1-vid-url').value = '';
    document.getElementById('a1-vid-title').value = '';
    if (typeof App !== 'undefined' && App.toast) App.toast('Video lagt til ✓', 'success');
    return false;
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
      `<span class="a1-feat-badge">${Icon('star')} Spelar no</span>${player}<div class="a1-video-cap">${esc(v.title||host(v.url))}</div>`;
  }

  return { render, searchOn, askA1FromSearch, addVideo, featureVideo, chatAsk, toggleChat };
})();
