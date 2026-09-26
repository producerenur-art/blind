// «Latest from SiriusFM» — oppdateringar frå sida sjølv (IKKJE private meldingar).
// Vises kun for innlogga på forsida. Legg nye oppføringar ØVST i UPDATES.
const SiriusUpdates = (() => {
  const UPDATES = [
    { id: '20260926-dm', date: '2026-09-26', icon: '💬', title: 'Private chat upgrades',
      text: 'Edit your messages (with emojis), share images and music with preview, and replace or delete what you sent. You also get an email when someone writes to you.' },
    { id: '20260926-gif', date: '2026-09-26', icon: '🖼️', title: 'New GIF picker',
      text: 'Upload a GIF from your device or paste a Giphy/.gif link — with preview before you send.' },
    { id: '20260926-notif', date: '2026-09-26', icon: '🔔', title: 'Tap a name in notifications',
      text: 'Click the name in a notification (like a reaction) to open that person’s profile.' },
  ];
  const KEY = 'sc_updates_seen';
  function _seen() { try { return localStorage.getItem(KEY) || ''; } catch (_) { return ''; } }
  function _esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function hasNew() { return UPDATES.length && _seen() !== UPDATES[0].id; }

  function html() {
    if (!UPDATES.length) return '';
    const isNew = hasNew();
    return `<div class="sc-updates" id="sc-updates">
      <div class="sc-updates-head"><span>📣 Latest from SiriusFM ${isNew ? '<span class="sc-updates-new">NEW</span>' : ''}</span>
        ${isNew ? '<button type="button" class="sc-updates-read" onclick="SiriusUpdates.markRead()">Mark as read</button>' : ''}</div>
      ${UPDATES.slice(0, 3).map(u => `<div class="sc-updates-item"><span class="sc-updates-ic">${u.icon}</span>
        <div><b>${_esc(u.title)}</b> <span class="sc-updates-date">${_esc(u.date)}</span><div class="sc-updates-text">${_esc(u.text)}</div></div></div>`).join('')}
    </div>`;
  }
  function markRead() {
    try { localStorage.setItem(KEY, UPDATES[0].id); } catch (_) {}
    const el = document.getElementById('sc-updates'); if (el) el.outerHTML = html();
  }
  return { html, markRead, hasNew, UPDATES };
})();
window.SiriusUpdates = SiriusUpdates;
