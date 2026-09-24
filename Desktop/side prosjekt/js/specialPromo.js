// SpecialPromo — liten reklamebrikke for planlagte spesialprogram (js/specialShows.js,
// t.d. Lemonchill-miksen). Flyt nede til venstre på alle sider. Ingen manuell opprydding:
// brikka vert vist frå no og til siste sending er ferdig, og fjerna av seg sjølv etterpå.
// Lukk-knappen hugsar valet per sending (kjem att før neste sending).
//
// ADMIN (CONFIG.ADMIN_EMAILS): bilete med «Slett bilete» (eller «Legg til bilete»), og tekst
// med «Rediger» + «Slett tekst». Endringane lagrast i Supabase (site_promo, migrasjon 0035)
// og gjeld alle besøkande. Den ekte grensa er RPC-en admin_save_site_promo (hemmelegheit);
// knappane her er berre UI. Ingen rad i tabellen = standardtekst frå SpecialShows.
const SpecialPromo = (() => {
  const LEAD_DAYS = 14;              // vis brikka maks 14 dagar før første sending
  const OVERRIDE_TTL = 5 * 60 * 1000;
  let _el = null, _timer = null, _editing = false;
  let _ov = null, _ovAt = 0, _ovShow = '';   // override-rad frå site_promo (null = ingen)

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const _client = () => (typeof SC_Storage !== 'undefined' && SC_Storage.isConfigured && SC_Storage.isConfigured()) ? SC_Storage.client() : null;
  const _isAdmin = () => { try { return !!(typeof CONFIG !== 'undefined' && CONFIG.isAdminEmail && CONFIG.isAdminEmail(Auth.current())); } catch (_) { return false; } };
  const _toast = (m, t) => { try { App.toast(m, t || 'info', 4000); } catch (_) {} };

  function _css() {
    if (document.getElementById('special-promo-css')) return;
    const st = document.createElement('style');
    st.id = 'special-promo-css';
    st.textContent = `
#special-promo{position:fixed;left:16px;bottom:96px;z-index:var(--z-dock,700);width:min(320px,calc(100vw - 32px));
  padding:14px 38px 14px 14px;border-radius:14px;color:#e8ecf4;cursor:pointer;
  background:linear-gradient(135deg,rgba(28,34,52,.96),rgba(46,38,70,.96));border:1px solid rgba(160,190,255,.28);
  box-shadow:0 10px 30px rgba(0,0,0,.45);font:500 13px/1.4 system-ui,sans-serif;transition:transform .15s}
#special-promo:hover{transform:translateY(-2px)}
#special-promo .sp-tag{display:inline-flex;align-items:center;gap:6px;font-size:10.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#9fc0ff}
#special-promo .sp-tag.live{color:#ff8a8a}
#special-promo .sp-dot{width:7px;height:7px;border-radius:50%;background:#ff5a5a;animation:sp-pulse 1.2s infinite}
#special-promo .sp-img{display:block;width:100%;max-height:150px;object-fit:cover;border-radius:10px;margin:0 0 10px}
#special-promo .sp-title{margin:4px 0 2px;font-size:15px;font-weight:700;color:#fff}
#special-promo .sp-sub{color:#b8c2d6;font-size:12.5px}
#special-promo .sp-cta{display:inline-block;margin-top:8px;color:#9fc0ff;font-weight:600;font-size:12.5px}
#special-promo .sp-x{position:absolute;top:6px;right:8px;background:none;border:0;color:#8894ab;font-size:18px;cursor:pointer;line-height:1}
#special-promo .sp-adm{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;padding-top:8px;border-top:1px dashed rgba(160,190,255,.25)}
#special-promo .sp-adm button{font:600 11px system-ui,sans-serif;padding:4px 9px;border-radius:7px;cursor:pointer;color:#dfe6f5;background:rgba(255,255,255,.08);border:1px solid rgba(160,190,255,.3)}
#special-promo .sp-adm button.del{color:#ff9a9a;border-color:rgba(255,120,120,.4)}
#special-promo input[type=text],#special-promo textarea{width:100%;box-sizing:border-box;margin:4px 0;padding:6px 8px;border-radius:7px;border:1px solid rgba(160,190,255,.3);background:rgba(0,0,0,.35);color:#fff;font:13px system-ui,sans-serif}
#special-promo textarea{min-height:56px;resize:vertical}
@keyframes sp-pulse{50%{opacity:.25}}
@media (max-width:640px){#special-promo{bottom:84px}}`;
    document.head.appendChild(st);
  }

  function _dismissKey(startMs) { return 'sp_dismiss_' + startMs; }
  function _dismissed(startMs) { try { return localStorage.getItem(_dismissKey(startMs)) === '1'; } catch (_) { return false; } }

  function _fmt(ms) {
    const d = new Date(ms);
    const day = d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
    const t = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    return `${day} · ${t}`;
  }

  function _remove() { if (_el) { _el.remove(); _el = null; } }

  // Hent override-rada (maks kvart 5. min, og med ein gong etter lagring).
  async function _loadOverride(showId, force) {
    if (!force && _ovShow === showId && Date.now() - _ovAt < OVERRIDE_TTL) return;
    const c = _client(); if (!c) return;
    try {
      const { data, error } = await c.from('site_promo').select('*').eq('id', showId).maybeSingle();
      if (!error) { _ov = data || null; _ovShow = showId; _ovAt = Date.now(); }
    } catch (_) { /* tabellen finst kanskje ikkje enno (0035 ikkje køyrt) → standardtekst */ }
  }

  // Gjeldande innhald = override-rad, elles standardtekst frå SpecialShows.
  function _content(cur, act, slots) {
    const s = cur.show;
    const defTitle = act ? `${s.artist} — ${s.title.replace(/^Mixes for SiriusFM /, 'SiriusFM mix ')}` : `${s.artist} — SiriusFM mix`;
    const defBody = act ? 'Playing in the 24-Hour Cycle right now.'
      : `${_fmt(cur.startMs)} · 24-Hour Cycle${slots > 1 ? ` · ${slots} Saturday broadcasts` : ''}`;
    if (_ov) return { image: _ov.image_url || '', title: _ov.title || '', body: _ov.body || '' };
    return { image: '', title: defTitle, body: defBody };
  }

  async function _save(showId, next) {
    const c = _client(); if (!c) { _toast('Cloud storage is not configured.', 'error'); return false; }
    const { error } = await c.rpc('admin_save_site_promo', {
      p_id: showId, p_secret: (typeof CONFIG !== 'undefined' && CONFIG.LIVE_BROADCAST_SECRET) || '',
      p_image_url: next.image || '', p_title: next.title || '', p_body: next.body || '',
    });
    if (error) { _toast('Could not save: ' + (error.message || 'error'), 'error'); return false; }
    await _loadOverride(showId, true);
    return true;
  }

  function _render(cur, act) {
    const s = cur.show;
    const slots = s.slots.filter(x => new Date(x).getTime() + s.durationSec * 1000 > Date.now()).length;
    const c = _content(cur, act, slots);
    const admin = _isAdmin();
    const empty = !c.image && !c.title && !c.body;
    if (empty && !admin) { _remove(); return; }       // alt sletta → brikka er borte for besøkande

    _css();
    if (!_el) {
      _el = document.createElement('div');
      _el.id = 'special-promo';
      _el.setAttribute('role', 'complementary');
      _el.onclick = e => {
        if (e.target.closest('.sp-x, .sp-adm, input, textarea')) return;
        try { Router.go('/radio'); } catch (_) { location.hash = '#/radio'; }
      };
      document.body.appendChild(_el);
    }

    const tag = act ? `<div class="sp-tag live"><span class="sp-dot"></span> On air now</div>`
                    : `<div class="sp-tag">Coming up · pre-recorded mix</div>`;
    const cta = act ? 'Listen on Radio →' : 'Tune in on Radio →';

    if (_editing && admin) {
      _el.innerHTML = `
        <button class="sp-x" aria-label="Close" disabled style="opacity:.3">×</button>
        ${tag}
        <input type="text" id="sp-in-title" maxlength="120" placeholder="Title" value="${esc(c.title)}">
        <textarea id="sp-in-body" maxlength="400" placeholder="Text">${esc(c.body)}</textarea>
        <div class="sp-adm"><button id="sp-save">Save</button><button id="sp-cancel">Cancel</button></div>`;
      _el.querySelector('#sp-cancel').onclick = () => { _editing = false; _render(cur, act); };
      _el.querySelector('#sp-save').onclick = async () => {
        const ok = await _save(s.id, { image: c.image, title: _el.querySelector('#sp-in-title').value.trim(), body: _el.querySelector('#sp-in-body').value.trim() });
        if (ok) { _editing = false; _render(cur, act); _toast('Promo saved.', 'success'); }
      };
      return;
    }

    _el.innerHTML = `
      <button class="sp-x" aria-label="Close">×</button>
      ${c.image ? `<img class="sp-img" src="${esc(c.image)}" alt="">` : ''}
      ${tag}
      ${c.title ? `<div class="sp-title">${esc(c.title)}</div>` : ''}
      ${c.body ? `<div class="sp-sub">${esc(c.body)}</div>` : ''}
      <span class="sp-cta">${cta}</span>
      ${admin ? `<div class="sp-adm">
        ${c.image ? `<button class="del" id="sp-img-del">Delete image</button>` : `<button id="sp-img-add">Add image</button>`}
        <button id="sp-txt-edit">Edit text</button>
        ${(c.title || c.body) ? `<button class="del" id="sp-txt-del">Delete text</button>` : ''}
        <input type="file" id="sp-file" accept="image/*" hidden>
      </div>` : ''}`;

    _el.querySelector('.sp-x').onclick = () => {
      try { localStorage.setItem(_dismissKey(cur.startMs), '1'); } catch (_) {}
      _remove();
    };
    if (!admin) return;

    const q = id => _el.querySelector(id);
    if (q('#sp-img-del')) q('#sp-img-del').onclick = async () => {
      if (!confirm('Delete the image from the promo?')) return;
      if (await _save(s.id, { image: '', title: c.title, body: c.body })) { _render(cur, act); _toast('Image deleted.', 'success'); }
    };
    if (q('#sp-img-add')) q('#sp-img-add').onclick = () => q('#sp-file').click();
    if (q('#sp-file')) q('#sp-file').onchange = async e => {
      const f = e.target.files && e.target.files[0]; if (!f) return;
      try {
        _toast('Uploading image…');
        const up = await SC_Storage.upload(f, { prefix: 'promo' });
        if (await _save(s.id, { image: up.url, title: c.title, body: c.body })) { _render(cur, act); _toast('Image added.', 'success'); }
      } catch (err) { _toast('Upload failed: ' + (err && err.message || err), 'error'); }
    };
    q('#sp-txt-edit').onclick = () => { _editing = true; _render(cur, act); };
    if (q('#sp-txt-del')) q('#sp-txt-del').onclick = async () => {
      if (!confirm('Delete the promo text?')) return;
      if (await _save(s.id, { image: c.image, title: '', body: '' })) { _render(cur, act); _toast('Text deleted.', 'success'); }
    };
  }

  async function _tick() {
    if (typeof SpecialShows === 'undefined') return;
    if (_editing) return;                              // ikkje overskriv medan admin skriv
    const now = Date.now();
    const act = SpecialShows.activeAt(now);
    const nxt = act ? null : SpecialShows.nextAfter(now);
    const cur = act ? { show: act.show, startMs: act.startMs } : nxt;
    // Ingen sendingar att → brikka er borte for godt (ingenting å rydde manuelt).
    if (!cur) { _remove(); if (_timer) { clearInterval(_timer); _timer = null; } return; }
    if (!act && cur.startMs - now > LEAD_DAYS * 864e5) { _remove(); return; }
    if (_dismissed(cur.startMs) && !_isAdmin()) { _remove(); return; }
    await _loadOverride(cur.show.id);
    if (_editing) return;
    _render(cur, act);
  }

  function init() {
    _tick();
    _timer = setInterval(_tick, 30000);
  }

  return { init, _tick };
})();

if (typeof window !== 'undefined') {
  window.SpecialPromo = SpecialPromo;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', SpecialPromo.init);
  else SpecialPromo.init();
}
