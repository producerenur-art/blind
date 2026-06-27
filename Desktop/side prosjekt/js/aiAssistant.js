/* ═══════════════════════════════════════════════
   Core — floating, draggable AI assistant widget.
   Knows the whole site (via AI.assistantChat), answers in the chosen language,
   and can be moved anywhere. Launched from the dock (#dock-ai-btn).
   ═══════════════════════════════════════════════ */
const Assistant = (() => {
  const STATE_KEY = 'aiAssistantState';
  const LANG_KEY  = 'ai_assistant_lang';

  let win, msgsEl, inputEl, langSel;
  let built = false;
  let history = [];
  let busy = false;

  // ── Persistent position / state ──────────────────────────────────────
  function loadState() {
    try { return JSON.parse(localStorage.getItem(STATE_KEY)) || {}; } catch { return {}; }
  }
  function saveState(s) { localStorage.setItem(STATE_KEY, JSON.stringify(s)); }

  function defaultPos() {
    const w = 360, h = 480;
    return { x: Math.max(12, window.innerWidth - w - 24), y: Math.max(70, window.innerHeight - h - 110) };
  }

  // ── Language ─────────────────────────────────────────────────────────
  function currentLangCode() {
    return localStorage.getItem(LANG_KEY) || localStorage.getItem('stellar-lang') || 'no';
  }
  function langNameFor(code) {
    const list = (typeof LANGUAGES !== 'undefined') ? LANGUAGES : [];
    const l = list.find(x => x.code === code);
    if (!l) return 'Norwegian';
    return l.name.split(' — ')[0].trim(); // English label part
  }
  function langOptions() {
    const list = (typeof LANGUAGES !== 'undefined') ? LANGUAGES : [{ code: 'no', name: 'Norwegian — Norsk', flag: '🇳🇴' }];
    const sel = currentLangCode();
    return list.map(l =>
      `<option value="${l.code}" ${l.code === sel ? 'selected' : ''}>${l.flag} ${l.name}</option>`
    ).join('');
  }

  // ── Build DOM ────────────────────────────────────────────────────────
  function build() {
    if (built) return;
    win = document.createElement('div');
    win.id = 'ai-asst';
    win.className = 'ai-asst hidden';
    win.innerHTML = `
      <div class="ai-asst-header" id="ai-asst-header">
        <div class="ai-asst-title">
          <span class="ai-asst-avatar">${Icon('message')}</span>
          <span>Core</span>
        </div>
        <div class="ai-asst-hdr-right">
          <select class="ai-asst-lang" id="ai-asst-lang" title="Språk / Language">${langOptions()}</select>
          <button class="ai-asst-hbtn" id="ai-asst-min" title="Minimer">${Icon('chevron-down')}</button>
          <button class="ai-asst-hbtn" id="ai-asst-close" title="Lukk">${Icon('x')}</button>
        </div>
      </div>
      <div class="ai-asst-body">
        <div class="ai-asst-msgs" id="ai-asst-msgs"></div>
        <form class="ai-asst-input-row" id="ai-asst-form">
          <input type="text" id="ai-asst-input" class="ai-asst-input" placeholder="Spør Core om hva som helst…" autocomplete="off">
          <button type="submit" class="ai-asst-send" title="Send">${Icon('send')}</button>
        </form>
      </div>`;
    document.body.appendChild(win);

    msgsEl  = win.querySelector('#ai-asst-msgs');
    inputEl = win.querySelector('#ai-asst-input');
    langSel = win.querySelector('#ai-asst-lang');

    // Position
    const st = loadState();
    const pos = (st.x != null && st.y != null) ? st : defaultPos();
    applyPos(pos.x, pos.y);

    // Wire controls
    win.querySelector('#ai-asst-close').addEventListener('click', close);
    win.querySelector('#ai-asst-min').addEventListener('click', close);
    win.querySelector('#ai-asst-form').addEventListener('submit', e => { e.preventDefault(); send(); });
    langSel.addEventListener('change', () => {
      localStorage.setItem(LANG_KEY, langSel.value);
      addMsg('assistant', greeting(), false);
    });

    initDrag();
    built = true;

    // First greeting
    addMsg('assistant', greeting(), false);
  }

  function greeting() {
    const code = currentLangCode();
    if (code === 'no') return 'Hei! Jeg er Core 🌌 Spør meg om hvordan du laster opp musikk, legger til venner, finner radiokanaler — eller hva som helst på Sound Core.';
    if (code === 'en') return "Hi! I'm Core 🌌 Ask me how to upload music, add friends, find radio channels — or anything on Sound Core.";
    // Other languages: let the model handle it on first user turn; show a neutral greeting.
    return 'Core 🌌 — Sound Core';
  }

  function applyPos(x, y) {
    win.style.left = x + 'px';
    win.style.top  = y + 'px';
    win.style.right = 'auto';
    win.style.bottom = 'auto';
  }

  // ── Messages ─────────────────────────────────────────────────────────
  function addMsg(role, text, pushHistory = true) {
    const div = document.createElement('div');
    div.className = 'ai-asst-msg ai-asst-msg-' + role;
    div.textContent = text;
    msgsEl.appendChild(div);
    msgsEl.scrollTop = msgsEl.scrollHeight;
    if (pushHistory) history.push({ role, content: text });
    return div;
  }

  function showTyping() {
    const div = document.createElement('div');
    div.className = 'ai-asst-msg ai-asst-msg-assistant ai-asst-typing';
    div.innerHTML = '<span></span><span></span><span></span>';
    msgsEl.appendChild(div);
    msgsEl.scrollTop = msgsEl.scrollHeight;
    return div;
  }

  async function send() {
    const text = inputEl.value.trim();
    if (!text || busy) return;
    inputEl.value = '';
    addMsg('user', text);
    busy = true;
    const typing = showTyping();

    try {
      const user = (typeof Auth !== 'undefined' && Auth.current && Auth.current()) || null;
      const contextNote = `bruker er på ${location.hash || '#/'}${user ? `, innlogget som @${user.username}` : ', ikke innlogget'}`;
      const reply = await AI.assistantChat(history, {
        langName: langNameFor(currentLangCode()),
        contextNote,
      });
      typing.remove();
      addMsg('assistant', reply || '…');
    } catch (e) {
      typing.remove();
      const code = currentLangCode();
      const comingSoon = /not configured|konfigurert|503|credit|balance|billing|kreditt/i.test(String(e && e.message));
      let msg;
      if (comingSoon) {
        msg = code === 'en'
          ? "✨ Core is almost ready — the chat goes live the moment the AI key is connected. Everything else on the site works as normal in the meantime!"
          : '✨ Core er straks klar — chatten kobles på i det øyeblikket AI-nøkkelen er på plass. Alt annet på siden virker som normalt i mellomtiden!';
      } else {
        msg = code === 'en' ? 'Sorry, something went wrong. Try again shortly.' : 'Beklager, noe gikk galt. Prøv igjen om litt.';
      }
      addMsg('assistant', msg, false);
    } finally {
      busy = false;
    }
  }

  // ── Drag ─────────────────────────────────────────────────────────────
  function initDrag() {
    const handle = win.querySelector('#ai-asst-header');
    let dragging = false, sx, sy, sl, st;

    function down(e) {
      if (e.target.closest('button, select')) return;
      dragging = true;
      const p = point(e);
      sx = p.x; sy = p.y;
      sl = parseInt(win.style.left) || 0;
      st = parseInt(win.style.top) || 0;
      e.preventDefault();
    }
    function move(e) {
      if (!dragging) return;
      const p = point(e);
      const maxL = window.innerWidth  - win.offsetWidth;
      const maxT = window.innerHeight - win.offsetHeight;
      const x = Math.max(0, Math.min(maxL, sl + (p.x - sx)));
      const y = Math.max(0, Math.min(maxT, st + (p.y - sy)));
      applyPos(x, y);
    }
    function up() {
      if (!dragging) return;
      dragging = false;
      saveState({ x: parseInt(win.style.left) || 0, y: parseInt(win.style.top) || 0, open: !win.classList.contains('hidden') });
    }
    function point(e) { const t = e.touches ? e.touches[0] : e; return { x: t.clientX, y: t.clientY }; }

    handle.addEventListener('mousedown', down);
    document.addEventListener('mousemove', move);
    document.addEventListener('mouseup', up);
    handle.addEventListener('touchstart', down, { passive: false });
    document.addEventListener('touchmove', move, { passive: false });
    document.addEventListener('touchend', up);
  }

  // ── Open / close ─────────────────────────────────────────────────────
  function open() {
    build();
    win.classList.remove('hidden');
    const st = loadState(); saveState({ ...st, open: true });
    setTimeout(() => inputEl && inputEl.focus(), 60);
  }
  function close() {
    if (!built) return;
    win.classList.add('hidden');
    const st = loadState(); saveState({ ...st, open: false });
  }
  function toggle() {
    if (built && !win.classList.contains('hidden')) close();
    else open();
  }

  // Reopen if it was open last session
  document.addEventListener('DOMContentLoaded', () => {
    if (loadState().open) open();
  });

  return { toggle, open, close, send };
})();
