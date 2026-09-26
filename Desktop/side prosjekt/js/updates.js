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

  // Oppskrift / brukarvilkår — kollapsbare seksjonar under oppdateringane (kun innlogga, same kort).
  const GUIDE = [
    { title: '🧭 How SiriusFM works', items: [
      '<b>Feed</b> (front page): your community wall, who is online now, the latest tracks, posts and new people.',
      '<b>Radio</b>: 40+ live channels of electronic music. Pick a channel, or start the <b>24/7 Cycle</b> — a schedule that changes genre through the day and never stops (if a station goes down, our ad plays and the next station takes over).',
      '<b>Discover</b>: tracks, mixes, genres and people. <b>Shows</b>: festivals and events. <b>Live</b>: DJs broadcasting from their own setup.',
      '<b>Profile</b>: your page with About, Content, Posts, Guestbook, Community and Groups. Friends, messages and requests live in the <b>Inbox</b>.',
    ]},
    { title: '🛠️ How to do things', items: [
      '<b>Post</b>: write on the Feed and press Share. Choose Community wall or one of your groups. Tick <i>Also share on Facebook</i> to open Facebook’s share window with your public post.',
      '<b>Add media</b>: 📎 uploads an image, 🖼️ adds a GIF/image/link (upload or paste, with preview). SoundCloud and YouTube links become a player card.',
      '<b>Upload music or a DJ mix</b>: Profile → Edit → Music / Upload DJ Mix. Free accounts can upload mixes up to 3 hours; Pro up to 20 hours.',
      '<b>Private chat</b>: open a profile → <i>Send private message</i>. You can edit text (with emojis), send images, GIFs and music, and replace or delete what you sent.',
      '<b>Friends</b>: press <i>+ Add friend</i> on a profile. Requests appear in the Inbox and the bell. Click a name in a notification to open that profile.',
    ]},
    { title: '🔔 Notifications & email', items: [
      'The bell shows reactions, comments, friend requests and messages. Sound can be turned off per person on their profile.',
      'When someone writes you a private message you also get an email (at most one per 15 minutes per conversation). Marketing emails have an unsubscribe link; opting out also stops message emails.',
    ]},
    { title: '🏠 SiriusFM Residents', items: [
      '<b>Everything is free for SiriusFM Residents</b> — full Pro access with no payment.',
      '<b>Residents must give the owner their email.</b> Send the email address you registered your account with to the owner (private message to <a href="#/u/Admin001">@Admin001</a>). Free access is linked to that exact email, so it must match your account.',
      'Once your email has been added, log out and back in (or hard-refresh) and Pro unlocks automatically.',
    ]},
    { title: '📜 House rules (terms of use)', items: [
      '<b>Only upload what you have the rights to.</b> Your own music, mixes and images, or material you are allowed to share. Copyright complaints are handled quickly — content can be removed.',
      '<b>Electronic music and its community.</b> Be respectful: no harassment, hate, threats, spam or scams. No illegal content.',
      '<b>Your content stays yours.</b> By posting you allow SiriusFM to display it on the site and in link previews you share. You can edit or delete your own posts and uploads at any time.',
      '<b>Moderation.</b> Admins may remove content or suspend accounts that break these rules.',
      '<b>Privacy.</b> Friends-only and private posts are never sent to Facebook or shown publicly. Read the full <a href="personvern.html" target="_blank" rel="noopener">Privacy Policy</a>.',
      '<b>Service.</b> SiriusFM is provided as is; third-party radio streams can go offline, and features may change.',
    ]},
    { title: '🆘 Need help?', items: [
      'Something stuck? Hard-refresh (Cmd/Ctrl + Shift + R), or log out and back in. Still broken: use the <i>Report bug</i> button, or ask the A1 assistant in the bottom-right dock.',
    ]},
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
      <div class="sc-guide">${GUIDE.map(g => `<details class="sc-guide-sec"><summary>${g.title}</summary>
        <ul>${g.items.map(i => `<li>${i}</li>`).join('')}</ul></details>`).join('')}</div>
    </div>`;
  }
  function markRead() {
    try { localStorage.setItem(KEY, UPDATES[0].id); } catch (_) {}
    const el = document.getElementById('sc-updates'); if (el) el.outerHTML = html();
  }
  return { html, markRead, hasNew, UPDATES };
})();
window.SiriusUpdates = SiriusUpdates;
