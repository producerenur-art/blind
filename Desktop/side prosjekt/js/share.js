// Share — bygger delbare lenker til én opplastet låt/video slik at Facebook, X,
// iMessage, WhatsApp osv. viser brukerens EGET cover-bilde (og inline video) når
// lenka limes inn. Lenka peker på /s/<payload> som serveren (api/share.js)
// rendrer med ekte Open Graph-tagger — crawlere kjører ikke JS, så dette MÅ skje
// server-side.
//
// Tilstandsløst: payloaden (tittel, artist, bilde-URL, media-URL) kodes rett inn
// i lenka. Krever at fila ligger offentlig i Supabase Storage (public URL) —
// rene lokale opplastinger kan ikke forhåndsvises av andre og blokkeres med et
// tydelig varsel.
const Share = (() => {
  const SITE = 'https://www.siriusfm.no';

  function _b64url(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = '';
    bytes.forEach(b => { bin += String.fromCharCode(b); });
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function _isPublic(url) {
    return typeof url === 'string' && /^https:\/\//i.test(url);
  }

  // Offentleg profilbilde for ein brukar (sky-URL). Brukast som fallback-
  // forhåndsvisning på Facebook o.l. når sjølve innlegget ikkje har eit
  // offentleg bilde. Lokale IndexedDB-avatarar (blob) kan crawlere ikkje sjå,
  // så dei filtrerast bort av _isPublic.
  function _avatarUrl(username) {
    try {
      const u = (typeof Auth !== 'undefined' && Auth.getUser) ? Auth.getUser(username) : null;
      return u && _isPublic(u.avatarUrl) ? u.avatarUrl : null;
    } catch (_) { return null; }
  }

  // { kind:'audio'|'video'|'image'|'link', title, artist, image, media, link, mime, username } -> URL
  function buildUrl(t) {
    const K = ['video', 'image', 'link'].includes(t.kind) ? t.kind : 'audio';
    const payload = {
      v: 1,
      k: K,
      t: (t.title || '').slice(0, 200),
      a: (t.artist || '').slice(0, 120),
      i: _isPublic(t.image) ? t.image : undefined,
      m: _isPublic(t.media) ? t.media : undefined,
      // l = ekstern destinasjon for lenke-oppføringer (åpnes fra delesida).
      l: (t.link && /^https?:\/\//i.test(t.link)) ? t.link : undefined,
      mt: t.mime || undefined,
      u: t.username || undefined,
    };
    Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);
    return `${SITE}/s/${_b64url(JSON.stringify(payload))}`;
  }

  // Grab a poster frame from a public video URL and upload it as the og:image.
  // Best-effort: returns a public image URL, or null if anything fails.
  async function _capturePoster(videoUrl) {
    if (!_isPublic(videoUrl) || typeof SC_Storage === 'undefined' || !SC_Storage.isConfigured()) return null;
    try {
      const blob = await new Promise((resolve, reject) => {
        const v = document.createElement('video');
        v.crossOrigin = 'anonymous'; v.muted = true; v.preload = 'metadata';
        v.src = videoUrl;
        const fail = () => reject(new Error('poster'));
        v.onloadeddata = () => { try { v.currentTime = Math.min(1, (v.duration || 2) / 3); } catch (_) { fail(); } };
        v.onseeked = () => {
          try {
            const c = document.createElement('canvas');
            c.width = v.videoWidth || 1280; c.height = v.videoHeight || 720;
            c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
            c.toBlob(b => b ? resolve(b) : fail(), 'image/jpeg', 0.85);
          } catch (_) { fail(); }
        };
        v.onerror = fail;
        setTimeout(fail, 8000);
      });
      const file = new File([blob], 'poster.jpg', { type: 'image/jpeg' });
      const res = await SC_Storage.upload(file, { prefix: 'poster' });
      return res && res.url || null;
    } catch (_) { return null; }
  }

  // Look up a stored record by id and share it. store: 'music' | 'media' | 'mixes'.
  async function open(store, id) {
    const cur = (typeof Auth !== 'undefined' && Auth.current) ? Auth.current() : null;
    let rec = null;
    try { rec = await DB.get(store, id); } catch (_) { /* ignore */ }
    if (!rec) { if (window.App) App.toast('Could not find the upload.', 'error'); return; }

    // Lenke-oppføringer (kind:'link'): del sjølve destinasjonen (YouTube, Bandcamp,
    // nettside …) via ei /s/-lenke med SiriusFM-forhåndsvisning. Fungerer overalt
    // sidan destinasjonen alt er offentleg — ingen krav om sky-lagra fil.
    if (rec.kind === 'link' && rec.linkUrl) {
      const title = rec.name || 'Shared on SiriusFM';
      const image = _isPublic(rec.coverUrl) ? rec.coverUrl : (_avatarUrl((cur && cur.username) || rec.username) || '');
      const url = buildUrl({
        kind: 'link',
        title,
        artist: rec.artist || (cur && (cur.displayName || cur.username)) || '',
        image,
        link: rec.linkUrl,
        username: (cur && cur.username) || rec.username || '',
      });
      return shareUrl(url, title, rec.artist || '', {
        image: _isPublic(image) ? image : '',
        preferMenu: true,
      });
    }

    const isVideo = String(rec.type || rec.mime || '').startsWith('video/');
    // audioUrl (music/mix-fil) · mediaUrl (video/bilde) · url (URL-mix, ekstern)
    const media = rec.audioUrl || rec.mediaUrl || rec.url || null;
    const title = rec.name || rec.title || 'Untitled';

    if (!_isPublic(media)) {
      if (window.App) App.toast('This file is only saved locally, so it cannot be previewed on social media. Upload it while cloud storage is on to share it further.', 'info', 6000);
      return;
    }

    let image = rec.coverUrl || null;
    if (isVideo && !_isPublic(image)) {
      if (window.App) App.toast('Creating preview image…', 'info', 2500);
      const poster = rec.posterUrl || await _capturePoster(media);
      if (poster) {
        image = poster;
        try { await DB.put(store, { ...rec, posterUrl: poster }); } catch (_) { /* ignore */ }
      }
    }

    const url = buildUrl({
      kind: isVideo ? 'video' : 'audio',
      title,
      artist: rec.artist || (cur && (cur.displayName || cur.username)) || '',
      image,
      media,
      mime: rec.mime || rec.type || '',
      username: (cur && cur.username) || rec.username || rec.uploaderUsername || '',
    });

    return shareUrl(url, title, rec.artist || '', {
      community: {
        kind: isVideo ? 'video' : 'audio',
        name: title,
        url: media,
        coverUrl: _isPublic(image) ? image : '',
      },
      image: _isPublic(image) ? image : '',
      preferMenu: true,
    });
  }

  // Native share sheet on mobile; a rich link menu everywhere else.
  // opts.community — { kind, name, url, coverUrl, youtubeId } lar brukeren dele
  // rett til SiriusFM Community-veggen fra samme meny.
  async function shareUrl(url, title, artist, opts = {}) {
    const text = artist ? `${title} — ${artist}` : title;
    // opts.preferMenu: vis alltid SiriusFM-menyen med tydelege Facebook/X/…-
    // knappar. Utan dette kaprar den innebygde del-arket til nettlesaren/OS-et
    // (som på desktop ikkje har Facebook) heile delinga.
    if (!opts.preferMenu && navigator.share) {
      try { await navigator.share({ title, text: `${text} · SiriusFM`, url }); return; }
      catch (e) { if (e && e.name === 'AbortError') return; /* fall through to menu */ }
    }
    _menu(url, text, opts);
  }

  // Post rett til SiriusFM Community-veggen (krever innlogging + Community-modul).
  function _shareToCommunity(community) {
    const me = (typeof Auth !== 'undefined' && Auth.current) ? Auth.current() : null;
    if (!me) { if (window.Router) Router.go('/login'); return false; }
    if (!window.Community || !Community.shareMedia) {
      if (window.App) App.toast('Community is not available right now.', 'error'); return false;
    }
    const id = Community.shareMedia({
      kind: community.kind || 'image',
      name: community.name || 'Untitled',
      url: community.url || '',
      coverUrl: community.coverUrl || '',
      youtubeId: community.youtubeId || '',
      audience: 'public',
    });
    if (id) {
      if (window.App) App.toast('Shared to Community! 🎉', 'success');
      if (window.Router) Router.go('/community');
      return true;
    }
    if (window.App) App.toast('This has already been shared to Community.', 'info');
    return false;
  }

  function _menu(url, text, opts = {}) {
    const enc = encodeURIComponent(url);
    const encT = encodeURIComponent(text + ' · SiriusFM');
    const encTitle = encodeURIComponent(text);
    const img = opts.image && /^https:\/\//i.test(opts.image) ? encodeURIComponent(opts.image) : '';
    // Plattformer med ekte web-delingslenke — åpner delingsdialogen direkte.
    const links = [
      { label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${enc}`, bg: '#1877f2', ico: 'f' },
      { label: 'X', href: `https://twitter.com/intent/tweet?url=${enc}&text=${encT}`, bg: '#111', ico: '𝕏' },
      { label: 'WhatsApp', href: `https://wa.me/?text=${encT}%20${enc}`, bg: '#25d366', ico: '🟢' },
      { label: 'Threads', href: `https://www.threads.net/intent/post?text=${encT}%20${enc}`, bg: '#000', ico: '@' },
      { label: 'Telegram', href: `https://t.me/share/url?url=${enc}&text=${encT}`, bg: '#229ed9', ico: '✈️' },
      { label: 'Reddit', href: `https://www.reddit.com/submit?url=${enc}&title=${encTitle}`, bg: '#ff4500', ico: '👽' },
      { label: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc}`, bg: '#0a66c2', ico: 'in' },
      { label: 'Pinterest', href: `https://pinterest.com/pin/create/button/?url=${enc}&description=${encT}${img ? `&media=${img}` : ''}`, bg: '#e60023', ico: '📌' },
      { label: 'Tumblr', href: `https://www.tumblr.com/widgets/share/tool?canonicalUrl=${enc}&caption=${encT}`, bg: '#35465c', ico: 't' },
      { label: 'LINE', href: `https://social-plugins.line.me/lineit/share?url=${enc}`, bg: '#06c755', ico: 'L' },
      { label: 'VK', href: `https://vk.com/share.php?url=${enc}&title=${encTitle}`, bg: '#0077ff', ico: 'Vk' },
      { label: 'Email', href: `mailto:?subject=${encTitle}&body=${encT}%0A%0A${enc}`, bg: '#555', ico: '✉️' },
    ];
    // Plattformer UTEN web-delingslenke (Instagram/Snapchat/Messenger/YouTube):
    // kopier lenka og åpne appen slik at brukeren kan lime den rett inn.
    const copyLinks = [
      { label: 'Instagram', open: 'https://www.instagram.com/', bg: 'linear-gradient(135deg,#feda75,#fa7e1e,#d62976,#962fbf,#4f5bd5)', ico: '📷', msg: 'Link copied 📋 — paste it into your Instagram story, DM or bio.' },
      { label: 'Snapchat', open: 'https://www.snapchat.com/', bg: '#fffc00', fg: '#000', ico: '👻', msg: 'Link copied 📋 — paste it into Snapchat.' },
      { label: 'Messenger', open: 'https://www.messenger.com/', bg: '#0084ff', ico: '💬', msg: 'Link copied 📋 — paste it into a Messenger message.' },
      { label: 'YouTube', open: 'https://www.youtube.com/upload', bg: '#ff0000', ico: '▶', msg: 'Link copied 📋 — paste it into the YouTube description.' },
    ];
    const community = opts.community;
    const groups = opts.groups;
    const ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:1.5rem;backdrop-filter:blur(4px)';
    ov.innerHTML = `
      <div style="width:100%;max-width:380px;max-height:90vh;overflow-y:auto;background:#15151f;border:1px solid rgba(255,255,255,.1);border-radius:18px;padding:1.3rem;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.6)">
        <div style="font-weight:800;font-size:1.05rem;margin-bottom:.2rem">Share 🔗</div>
        <div style="color:#9a9aad;font-size:.82rem;margin-bottom:1rem;word-break:break-all">${url.replace(/</g,'&lt;')}</div>
        ${community ? `
        <button id="sh-community" style="cursor:pointer;width:100%;color:#fff;font-weight:800;padding:.8rem;border-radius:12px;background:linear-gradient(135deg,#22c55e,#15803d);border:none;font-size:.98rem;margin-bottom:.6rem;display:flex;align-items:center;justify-content:center;gap:.5rem">👥 Share to Community</button>` : ''}
        ${groups ? `
        <button id="sh-groups" style="cursor:pointer;width:100%;color:#fff;font-weight:800;padding:.8rem;border-radius:12px;background:linear-gradient(135deg,#8b5cf6,#6d28d9);border:none;font-size:.98rem;margin-bottom:.6rem;display:flex;align-items:center;justify-content:center;gap:.5rem">👥 Share to group</button>` : ''}
        ${community || groups ? `<div style="color:#6a6a7d;font-size:.72rem;text-transform:uppercase;letter-spacing:.05em;margin:.4rem 0 .6rem">Or share on social media</div>` : ''}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem">
          ${links.map(l => `<a href="${l.href}" target="_blank" rel="noopener" style="display:flex;align-items:center;justify-content:center;gap:.4rem;text-decoration:none;color:#fff;font-weight:700;padding:.65rem;border-radius:12px;background:${l.bg};font-size:.85rem"><span aria-hidden="true">${l.ico}</span>${l.label}</a>`).join('')}
          ${copyLinks.map((l, i) => `<button data-copy="${i}" style="cursor:pointer;display:flex;align-items:center;justify-content:center;gap:.4rem;color:${l.fg || '#fff'};font-weight:700;padding:.65rem;border-radius:12px;border:none;background:${l.bg};font-size:.85rem"><span aria-hidden="true">${l.ico}</span>${l.label}</button>`).join('')}
        </div>
        <div style="display:grid;gap:.55rem;margin-top:.7rem">
          ${navigator.share ? `<button id="sh-native" style="cursor:pointer;color:#fff;font-weight:700;padding:.7rem;border-radius:12px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);font-size:.95rem">📲 Share via device</button>` : ''}
          <button id="sh-copy" style="cursor:pointer;color:#fff;font-weight:700;padding:.7rem;border-radius:12px;background:linear-gradient(135deg,#8b5cf6,#6d28d9);border:none;font-size:.95rem">📋 Copy link</button>
          <button id="sh-close" style="cursor:pointer;color:#9a9aad;background:none;border:none;padding:.5rem;font-size:.9rem">Close</button>
        </div>
      </div>`;
    document.body.appendChild(ov);
    const close = () => ov.remove();
    ov.addEventListener('click', e => { if (e.target === ov) close(); });
    ov.querySelector('#sh-close').onclick = close;
    if (community) {
      ov.querySelector('#sh-community').onclick = () => { if (_shareToCommunity(community)) close(); };
    }
    if (groups) {
      const gb = ov.querySelector('#sh-groups');
      if (gb) gb.onclick = () => _pickGroup(ov, url, groups, close);
    }
    // Instagram/Snapchat/Messenger/YouTube har ingen web-delingslenke: kopier
    // lenka til utklippstavla og åpne appen så brukeren kan lime den rett inn.
    ov.querySelectorAll('button[data-copy]').forEach(b => b.addEventListener('click', async () => {
      const l = copyLinks[+b.dataset.copy];
      if (!l) return;
      try { await navigator.clipboard.writeText(url); } catch (_) {}
      if (window.App) App.toast(l.msg, 'info', 5000);
      window.open(l.open, '_blank', 'noopener');
    }));
    const nativeBtn = ov.querySelector('#sh-native');
    if (nativeBtn) nativeBtn.onclick = async () => {
      try { await navigator.share({ title: text, text: `${text} · SiriusFM`, url }); close(); }
      catch (e) { if (e && e.name === 'AbortError') return; /* behald menyen */ }
    };
    ov.querySelector('#sh-copy').onclick = async () => {
      try { await navigator.clipboard.writeText(url); if (window.App) App.toast('Link copied! 📋', 'success'); }
      catch (_) { if (window.App) App.toast('Could not copy.', 'error'); }
      close();
    };
  }

  // Del eit Community-innlegg videre — til sosiale medier, ei SiriusFM-gruppe
  // eller Community-veggen. `p` kan vera ein post-id (slås opp i Community) eller
  // sjølve post-objektet.
  function post(p) {
    let rec = p;
    if (typeof p === 'string') {
      try { rec = (window.Community && Community.getPost) ? Community.getPost(p) : null; } catch (_) { rec = null; }
    }
    if (!rec) { if (window.App) App.toast('Could not find the post.', 'error'); return; }

    const author  = rec.authorDisplay || rec.author || '';
    const snippet = (rec.text || '').trim();
    const title   = snippet ? snippet.slice(0, 140)
                  : (rec.name || (author ? `Post from ${author}` : 'Post on SiriusFM'));
    const media = rec.mediaUrl || rec.audioUrl || rec.url || '';
    let image = _isPublic(rec.coverUrl) ? rec.coverUrl
              : ((rec.kind === 'image' || rec.kind === 'blend') && _isPublic(rec.mediaUrl) ? rec.mediaUrl : '');
    // Har ikkje innlegget eit offentleg bilde (t.d. reine tekst-innlegg, eller
    // bilde lagra lokalt som data-URL) → bruk opplastarens profilbilde som
    // forhåndsvisning ut mot Facebook o.l.
    if (!_isPublic(image)) {
      const av = _avatarUrl(rec.author);
      if (av) image = av;
    }

    let url;
    if (rec.kind === 'youtube' && rec.youtubeId) {
      url = `https://www.youtube.com/watch?v=${rec.youtubeId}`;
    } else if (_isPublic(media) || _isPublic(image)) {
      url = buildUrl({
        kind: rec.kind === 'video' ? 'video' : (rec.kind === 'audio' ? 'audio' : 'image'),
        title, artist: author, image, media, username: rec.author,
      });
    } else {
      url = `${SITE}/#/u/${encodeURIComponent(rec.author || '')}`;
    }

    // Del til Community er kun meiningsfullt for media som ikkje alt ligg i feeden;
    // for reine tekst-innlegg tilbyr vi gruppe + sosiale medier.
    const community = _isPublic(media) ? {
      kind: rec.kind === 'video' ? 'video' : (rec.kind === 'audio' ? 'audio' : 'image'),
      name: title, url: media, coverUrl: _isPublic(image) ? image : '',
      youtubeId: rec.kind === 'youtube' ? (rec.youtubeId || '') : '',
    } : null;

    return shareUrl(url, title, author, {
      community,
      groups: { text: snippet, title },
      image: _isPublic(image) ? image : '',
      preferMenu: true,
    });
  }

  // Gruppe-velgjar inne i del-menyen. Byter ut innhaldet i overlayet med ei liste
  // over brukarens grupper; val postar innlegget/lenka til den gruppa.
  function _pickGroup(ov, url, groups, close) {
    const list = (window.Groups && Groups.myGroups) ? Groups.myGroups() : [];
    if (!list.length) {
      if (window.App) App.toast('You are not a member of any groups yet. Create or join one first.', 'info', 5000);
      return;
    }
    const inner = ov.firstElementChild;
    inner.innerHTML = `
      <div style="font-weight:800;font-size:1.05rem;margin-bottom:.8rem">Share to group 👥</div>
      <div style="display:grid;gap:.5rem;max-height:50vh;overflow:auto">
        ${list.map(g => `<button data-gid="${String(g.id).replace(/"/g,'&quot;')}" style="cursor:pointer;color:#fff;font-weight:700;padding:.75rem;border-radius:12px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.14);font-size:.92rem;text-align:left">${(g.name||'').replace(/</g,'&lt;')}</button>`).join('')}
      </div>
      <button id="sh-close2" style="cursor:pointer;color:#9a9aad;background:none;border:none;padding:.6rem;font-size:.9rem;margin-top:.7rem">Close</button>`;
    inner.querySelector('#sh-close2').onclick = close;
    inner.querySelectorAll('button[data-gid]').forEach(b => b.onclick = () => {
      const text = (groups.text ? groups.text + '\n\n' : '') + url;
      if (window.Groups && Groups.shareToGroup && Groups.shareToGroup(b.dataset.gid, text)) close();
    });
  }

  // Inline share button (↗) for owner-visible rows.
  function button(store, id, opts = {}) {
    const cls = opts.className || 'btn-icon';
    return `<button class="${cls}" title="Share on social media" onclick="event.stopPropagation();Share.open('${store}','${String(id).replace(/'/g, "\\'")}')">🔗</button>`;
  }

  // Del-knapp for eit Community-innlegg (synleg for alle).
  function postButton(id, opts = {}) {
    const cls = opts.className || 'community-post-share';
    return `<button class="${cls}" title="Share the post" onclick="event.stopPropagation();Share.post('${String(id).replace(/'/g, "\\'")}')">🔗</button>`;
  }

  return { buildUrl, open, shareUrl, button, post, postButton };
})();

if (typeof window !== 'undefined') window.Share = Share;
