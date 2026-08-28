// SiriusFM — global «hvem er online»-knapp
// Ein pille i den øverste nav-baren som viser talet på pålogga brukarar akkurat
// no, på ALLE ruter. Les nærveret frå SC (js/realtime.js, Gun-heartbeat).
// Klikk → nedtrekkspanel med lista over kven som er online. Verkar óg utlogga.
const OnlineWidget = (() => {
  let _btn = null, _panel = null, _open = false, _tick = null;

  function _fmt(n) { return n === 1 ? '1 online' : `${n} online`; }
  function _href(u) { return `#/u/${encodeURIComponent(u)}`; }
  function _esc(s)  { return (window.SC && SC.esc) ? SC.esc(s) : String(s == null ? '' : s); }
  function _me()    { return (window.Auth && Auth.current && Auth.current()) ? Auth.current().username : null; }

  function _renderPanel() {
    if (!_panel) return;
    const me   = _me();
    const list = (window.SC && SC.onlineList) ? SC.onlineList() : [];
    const rows = list.length
      ? list.map(u => `
          <a class="online-pop-row" href="${_href(u)}" onclick="OnlineWidget.close()">
            <span class="online-pop-dot"></span>
            <span class="online-pop-name">@${_esc(u)}${u === me ? ' <span class="online-pop-you">(you)</span>' : ''}</span>
          </a>`).join('')
      : `<div class="online-pop-empty">Nobody online right now.</div>`;
    _panel.innerHTML = `
      <div class="online-pop-hdr">
        <span class="online-pop-title"><span class="online-pop-dot"></span> ${_fmt(list.length)} now</span>
        <button class="online-pop-x" type="button" onclick="OnlineWidget.close()" aria-label="Close">✕</button>
      </div>
      <div class="online-pop-list">${rows}</div>`;
  }

  function _renderBtn() {
    if (!_btn) return;
    const n = (window.SC && SC.onlineCount) ? SC.onlineCount() : 0;
    _btn.innerHTML = `<span class="online-pill-dot"></span><span class="online-pill-num">${n}</span><span class="online-pill-label">online</span>`;
    const label = `${_fmt(n)} right now — click to see who`;
    _btn.title = label;
    _btn.setAttribute('aria-label', label);
    if (_open) { _renderPanel(); _positionPanel(); }
  }

  // Plasser nedtrekkspanelet rett under knappen, høgrejustert (som «Mer»-menyen).
  function _positionPanel() {
    if (!_panel || !_btn) return;
    const r  = _btn.getBoundingClientRect();
    const pw = _panel.offsetWidth || 240;
    let left = r.right - pw;
    if (left < 8) left = 8;
    if (left + pw > window.innerWidth - 8) left = window.innerWidth - 8 - pw;
    _panel.style.top  = (r.bottom + 8) + 'px';
    _panel.style.left = left + 'px';
  }

  function toggle() { _open ? close() : open(); }
  function open() {
    if (!_panel || !_btn) return;
    _open = true;
    _renderPanel();
    _panel.classList.remove('hidden');
    _positionPanel();
    _btn.classList.add('active');
    setTimeout(() => document.addEventListener('click', _outside, true), 0);
    window.addEventListener('resize', _positionPanel);
  }
  function close() {
    _open = false;
    if (_panel) _panel.classList.add('hidden');
    if (_btn)   _btn.classList.remove('active');
    document.removeEventListener('click', _outside, true);
    window.removeEventListener('resize', _positionPanel);
  }
  function _outside(e) {
    if (_panel && _panel.contains(e.target)) return;
    if (_btn && _btn.contains(e.target)) return;
    close();
  }

  function init() {
    if (_btn) return;                               // idempotent
    _btn = document.createElement('button');
    _btn.id = 'online-pill';
    _btn.className = 'online-pill';
    _btn.type = 'button';
    _btn.addEventListener('click', toggle);

    _panel = document.createElement('div');
    _panel.id = 'online-pop';
    _panel.className = 'online-pop hidden';

    // Monter knappen i nav-baren (rett før lenkene). #nav-links blir bygd på
    // nytt ved kvar renderNav, men knappen er ein SYSKEN av den → overlever.
    const nav   = document.getElementById('main-nav');
    const links = document.getElementById('nav-links');
    if (nav && links) nav.insertBefore(_btn, links);
    else if (nav)     nav.appendChild(_btn);
    else              document.body.appendChild(_btn);   // fallback
    document.body.appendChild(_panel);                    // panel: fixed dropdown

    if (window.SC) {
      SC.subscribePresence();                       // lytt sjølv om du er utlogga
      if (SC.onPresenceChange) SC.onPresenceChange(() => _renderBtn());
    }
    _renderBtn();
    // Periodisk re-render så stale brukarar (som slutta å sende heartbeat)
    // fell ut av talet sjølv om ingen nye beats kjem inn.
    _tick = setInterval(_renderBtn, 12000);
    window.addEventListener('hashchange', close);
  }

  return { init, toggle, open, close };
})();
window.OnlineWidget = OnlineWidget;

if (document.readyState === 'loading')
  document.addEventListener('DOMContentLoaded', () => OnlineWidget.init());
else
  OnlineWidget.init();
