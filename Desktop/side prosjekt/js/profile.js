// Profile — view + edit
const Profile = (() => {

  // ── Festival data ─────────────────────────────────────────────────────
  const FESTIVALS = [
    { id: 'ozora',        emoji: '🌀', name: 'Ozora Festival',         country: 'Ungarn 🇭🇺',   url: 'https://ozorafestival.eu',              ticket: 'Billetter' },
    { id: 'boom',         emoji: '🌙', name: 'Boom Festival',           country: 'Portugal 🇵🇹', url: 'https://boomfestival.org',              ticket: 'Info' },
    { id: 'sensation_w',  emoji: '🤍', name: 'Sensation White',         country: 'Global 🌍',   url: 'https://www.sensation.com',             ticket: 'Påmelding' },
    { id: 'sensation_b',  emoji: '🖤', name: 'Sensation Black',         country: 'Global 🌍',   url: 'https://www.sensation.com',             ticket: 'Påmelding' },
    { id: 'fullmoon',     emoji: '🌕', name: 'Full Moon Party',         country: 'Thailand 🇹🇭', url: 'https://fullmoonparty-thailand.com',    ticket: 'Info' },
    { id: 'universo',     emoji: '🌌', name: 'Universo Paralello',      country: 'Brasil 🇧🇷',   url: 'https://www.universopararello.com.br',  ticket: 'Billetter' },
    { id: 'psy_fi',       emoji: '🔮', name: 'Psy-Fi Festival',         country: 'Nederland 🇳🇱',url: 'https://www.psy-fi.nl',                 ticket: 'Billetter' },
    { id: 'modem',        emoji: '🎛️', name: 'Modem Festival',          country: 'Kroatia 🇭🇷',  url: 'https://modemfestival.com',             ticket: 'Billetter' },
    { id: 'shankra',      emoji: '🕉️', name: 'Shankra Festival',        country: 'Sveits 🇨🇭',   url: 'https://www.shankra-festival.ch',       ticket: 'Billetter' },
    { id: 'rainbow',      emoji: '🌈', name: 'Rainbow Serpent',         country: 'Australia 🇦🇺',url: 'https://rainbowserpent.net',            ticket: 'Billetter' },
    { id: 'antaris',      emoji: '🛸', name: 'Antaris Project',         country: 'Tyskland 🇩🇪', url: 'https://www.antaris-project.de',        ticket: 'Info' },
    { id: 'sun',          emoji: '☀️', name: 'SUN Festival',            country: 'Ungarn 🇭🇺',   url: 'https://sunfestival.hu',                ticket: 'Billetter' },
    { id: 'cosmic',       emoji: '🌠', name: 'Cosmic Convergence',      country: 'Guatemala 🇬🇹',url: 'https://cosmicconvergencefestival.org', ticket: 'Info' },
    { id: 'burning',      emoji: '🔥', name: 'Burning Man',             country: 'USA 🇺🇸',      url: 'https://burningman.org',                ticket: 'Billetter' },
    { id: 'earthcore',    emoji: '🌏', name: 'Earthcore',               country: 'Australia 🇦🇺',url: 'https://earthcore.com.au',              ticket: 'Billetter' },
    { id: 'tomorrowland', emoji: '🎡', name: 'Tomorrowland',            country: 'Belgia 🇧🇪',   url: 'https://www.tomorrowland.com',          ticket: 'Billetter' },
    { id: 'solipse',      emoji: '🌑', name: 'Solipse',                 country: 'Global 🌍',   url: 'https://solipse.info',                  ticket: 'Info' },
    { id: 'vuuv',         emoji: '🎶', name: 'VuuV Festival',           country: 'Tyskland 🇩🇪', url: 'https://www.vuuv.de',                   ticket: 'Billetter' },
  ];

  // ── DAWs / music production software ─────────────────────────────────
  const DAWS = [
    { id: 'ableton',    emoji: '🎹', name: 'Ableton Live' },
    { id: 'fl-studio',  emoji: '🎵', name: 'FL Studio' },
    { id: 'logic',      emoji: '🍎', name: 'Logic Pro X' },
    { id: 'protools',   emoji: '🎛️', name: 'Pro Tools' },
    { id: 'garageband', emoji: '🎸', name: 'GarageBand' },
    { id: 'reason',     emoji: '🔧', name: 'Reason' },
    { id: 'cubase',     emoji: '🎼', name: 'Cubase' },
    { id: 'bitwig',     emoji: '⚡', name: 'Bitwig Studio' },
    { id: 'reaper',     emoji: '🎙️', name: 'Reaper' },
    { id: 'studio-one', emoji: '🎶', name: 'Studio One' },
    { id: 'traktor',    emoji: '🎛️', name: 'Traktor' },
    { id: 'rekordbox',  emoji: '💿', name: 'Rekordbox' },
    { id: 'serato',     emoji: '🎚️', name: 'Serato DJ' },
    { id: 'virtual-dj', emoji: '💻', name: 'Virtual DJ' },
    { id: 'djay-pro',   emoji: '📱', name: 'djay Pro' },
  ];

  // ── Digital / streaming platforms ─────────────────────────────────────
  const STREAMING_PLATFORMS = [
    { id: 'spotify',       emoji: '🟢', name: 'Spotify' },
    { id: 'apple-music',   emoji: '🍎', name: 'Apple Music' },
    { id: 'soundcloud',    emoji: '🌊', name: 'SoundCloud' },
    { id: 'bandcamp',      emoji: '🎸', name: 'Bandcamp' },
    { id: 'tidal',         emoji: '🌊', name: 'Tidal' },
    { id: 'youtube-music', emoji: '▶️', name: 'YouTube Music' },
    { id: 'beatport',      emoji: '🎵', name: 'Beatport' },
    { id: 'juno',          emoji: '📦', name: 'Juno Download' },
    { id: 'traxsource',    emoji: '🎵', name: 'Traxsource' },
    { id: 'amazon-music',  emoji: '📦', name: 'Amazon Music' },
  ];

  // ── Event types ───────────────────────────────────────────────────────
  const EVENT_TYPES = [
    { id: 'dj-set',   emoji: '🎛️', label: 'DJ Set' },
    { id: 'concert',  emoji: '🎸', label: 'Konsert' },
    { id: 'show',     emoji: '🎙️', label: 'Show' },
    { id: 'workshop', emoji: '🎓', label: 'Workshop' },
    { id: 'festival', emoji: '🎪', label: 'Festival' },
    { id: 'other',    emoji: '📅', label: 'Annet' },
  ];

  // ── Helpers ──────────────────────────────────────────────────────────
  function initials(name) {
    return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }

  function cssFilters(f) {
    if (!f) return '';
    return `brightness(${f.brightness ?? 100}%) contrast(${f.contrast ?? 100}%) saturate(${f.saturation ?? 100}%) hue-rotate(${f.hue ?? 0}deg) grayscale(${f.grayscale ?? 0}%)`;
  }

  function applyTheme(theme, container) {
    const t = theme || Auth.defaultTheme();
    container.style.setProperty('--p-primary',   t.primaryColor);
    container.style.setProperty('--p-secondary', t.secondaryColor);
    container.style.setProperty('--p-bg',        t.bgColor);
    container.style.setProperty('--p-text',      t.textColor);
    container.style.setProperty('--p-accent',    t.accentColor);
    if (t.fontFamily) container.dataset.profileFont = t.fontFamily;
  }

  // ── Avatar ────────────────────────────────────────────────────────────
  async function avatarEl(user, size = 60) {
    if (user.avatarMediaId) {
      const url = await DB.getBlobUrl('media', user.avatarMediaId).catch(() => null);
      if (url) return `<img src="${url}" alt="${user.displayName}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
    }
    return `<span style="font-size:${size * 0.35}px">${initials(user.displayName)}</span>`;
  }

  // ── Festival helpers ──────────────────────────────────────────────────
  function festivalBadgesHtml(user) {
    const ids = user.festivalIds || [];
    if (!ids.length) return '';
    const picks = FESTIVALS.filter(f => ids.includes(f.id));
    if (!picks.length) return '';
    return `
      <div class="profile-festivals">
        <div class="profile-festivals-title">${Icon('star')} Festivaler</div>
        <div class="festival-cards">
          ${picks.map(f => `
            <a class="festival-card" href="${f.url}" target="_blank" rel="noopener noreferrer">
              <span class="festival-card-emoji">${iconForEmoji(f.emoji)}</span>
              <div class="festival-card-info">
                <div class="festival-card-name">${f.name}</div>
                <div class="festival-card-country">${f.country}</div>
              </div>
              <span class="festival-card-ticket">${Icon('ticket')} ${f.ticket}</span>
            </a>`).join('')}
        </div>
      </div>`;
  }

  function festivalsTabHtml(user) {
    const ids = user.festivalIds || [];
    return `
      <div style="max-width:680px">
        <div class="editor-section-title" style="margin-bottom:0.5rem">${Icon('star')} Festivaler på profilen din</div>
        <p style="font-size:0.82rem;color:var(--text2);margin-bottom:1.25rem;line-height:1.6">
          Velg festivaler du drar på eller følger — de vises med billett-/påmeldingslenke på profilen din.
        </p>
        <div class="festival-selector-grid" id="festival-grid">
          ${FESTIVALS.map(f => {
            const checked = ids.includes(f.id);
            return `
              <label class="festival-selector-item${checked ? ' selected' : ''}" onclick="Profile.toggleFestivalItem(this)">
                <input type="checkbox" value="${f.id}" ${checked ? 'checked' : ''} onchange="">
                <span class="festival-sel-emoji">${iconForEmoji(f.emoji)}</span>
                <div class="festival-sel-info">
                  <div class="festival-sel-name">${f.name}</div>
                  <div class="festival-sel-meta">${f.country}</div>
                </div>
              </label>`;
          }).join('')}
        </div>
        <button class="btn btn-primary" style="margin-top:1.25rem" onclick="Profile.saveFestivals()">${Icon('save')} Lagre festivaler</button>
      </div>`;
  }

  // ── Platforms helpers ─────────────────────────────────────────────────
  function platformsBadgesHtml(user) {
    const daws = user.daws || [];
    const platforms = user.streamingPlatforms || [];
    if (!daws.length && !platforms.length) return '';
    const dawPicks = DAWS.filter(d => daws.includes(d.id));
    const platPicks = STREAMING_PLATFORMS.filter(p => platforms.includes(p.id));
    return `
      <div class="profile-platforms">
        ${dawPicks.length ? `
          <div class="profile-platforms-group">
            <div class="profile-platforms-title">${Icon('laptop')} Musikk-program</div>
            <div class="platforms-badges">
              ${dawPicks.map(d => `<span class="platform-badge platform-badge--daw">${iconForEmoji(d.emoji)} ${d.name}</span>`).join('')}
            </div>
          </div>` : ''}
        ${platPicks.length ? `
          <div class="profile-platforms-group">
            <div class="profile-platforms-title">${Icon('music')} Digitale plattformer</div>
            <div class="platforms-badges">
              ${platPicks.map(p => `<span class="platform-badge platform-badge--streaming">${iconForEmoji(p.emoji)} ${p.name}</span>`).join('')}
            </div>
          </div>` : ''}
      </div>`;
  }

  function platformsTabHtml(user) {
    const daws = user.daws || [];
    const platforms = user.streamingPlatforms || [];
    return `
      <div style="max-width:680px">
        <div class="editor-section-title" style="margin-bottom:0.25rem">${Icon('laptop')} Musikk-program / DAW</div>
        <p style="font-size:0.82rem;color:var(--text2);margin-bottom:1rem;line-height:1.6">
          Velg hvilke musikk-program du bruker til produksjon eller miksing.
        </p>
        <div class="platform-selector-grid" id="daw-grid">
          ${DAWS.map(d => {
            const checked = daws.includes(d.id);
            return `
              <label class="platform-selector-item${checked ? ' selected' : ''}" onclick="Profile.togglePlatformItem(this)">
                <input type="checkbox" value="${d.id}" data-group="daw" ${checked ? 'checked' : ''}>
                <span class="platform-sel-emoji">${iconForEmoji(d.emoji)}</span>
                <span class="platform-sel-name">${d.name}</span>
              </label>`;
          }).join('')}
        </div>
        <div class="editor-section-title" style="margin-top:1.5rem;margin-bottom:0.25rem">${Icon('music')} Digitale plattformer</div>
        <p style="font-size:0.82rem;color:var(--text2);margin-bottom:1rem;line-height:1.6">
          Hvilke strømmeplattformer eller musikk-butikker bruker du?
        </p>
        <div class="platform-selector-grid" id="streaming-grid">
          ${STREAMING_PLATFORMS.map(p => {
            const checked = platforms.includes(p.id);
            return `
              <label class="platform-selector-item${checked ? ' selected' : ''}" onclick="Profile.togglePlatformItem(this)">
                <input type="checkbox" value="${p.id}" data-group="streaming" ${checked ? 'checked' : ''}>
                <span class="platform-sel-emoji">${iconForEmoji(p.emoji)}</span>
                <span class="platform-sel-name">${p.name}</span>
              </label>`;
          }).join('')}
        </div>
        <button class="btn btn-primary" style="margin-top:1.25rem" onclick="Profile.savePlatforms()">${Icon('save')} Lagre plattformer</button>
      </div>`;
  }

  // ── My Sites helpers ──────────────────────────────────────────────────
  function mySitesViewHtml(user) {
    const sites = user.mySites || [];
    if (!sites.length) return '';
    return `
      <div class="profile-my-sites">
        <div class="profile-my-sites-title">${Icon('globe')} Mine Sider</div>
        <div class="my-sites-grid">
          ${sites.map(s => `
            <a class="my-site-card" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">
              <span class="my-site-emoji">${iconForEmoji(s.emoji, 'link')}</span>
              <div class="my-site-info">
                <div class="my-site-name">${esc(s.title)}</div>
                ${s.description ? `<div class="my-site-desc">${esc(s.description)}</div>` : ''}
              </div>
              <span class="my-site-arrow">${Icon('arrow-right')}</span>
            </a>`).join('')}
        </div>
      </div>`;
  }

  function mySitesTabHtml(user) {
    const sites = user.mySites || [];
    return `
      <div style="max-width:600px">
        <div class="editor-section-title" style="margin-bottom:0.25rem">${Icon('globe')} Mine egne sider</div>
        <p style="font-size:0.82rem;color:var(--text2);margin-bottom:1.25rem;line-height:1.6">
          Legg til lenker til dine egne hjemmelagde sider, portfolioer, blogger eller andre steder folk kan finne deg.
        </p>
        <div style="background:var(--surface2);border-radius:14px;padding:1.25rem;margin-bottom:1.25rem">
          <div style="display:grid;grid-template-columns:auto 1fr;gap:0.75rem;align-items:start;margin-bottom:0.75rem">
            <div class="form-group" style="margin:0">
              <label class="form-label">Emoji</label>
              <input class="form-input" id="ms-emoji" value="🌐" style="width:70px;text-align:center;font-size:1.3rem" maxlength="2">
            </div>
            <div class="form-group" style="margin:0">
              <label class="form-label">Tittel *</label>
              <input class="form-input" id="ms-title" placeholder="f.eks. Min blogg">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">URL *</label>
            <input class="form-input" id="ms-url" placeholder="https://…">
          </div>
          <div class="form-group">
            <label class="form-label">Beskrivelse (valgfri)</label>
            <input class="form-input" id="ms-desc" placeholder="Kort beskrivelse av siden">
          </div>
          <button class="btn btn-primary" onclick="Profile.addMySite()">${Icon('plus')} Legg til side</button>
        </div>
        <div id="my-sites-list">
          ${sites.length ? sites.map(mySiteEditorItem).join('') : '<p style="font-size:0.82rem;color:var(--text2)">Ingen sider ennå.</p>'}
        </div>
      </div>`;
  }

  function mySiteEditorItem(s) {
    return `
      <div class="my-site-editor-item" id="msitem-${s.id}">
        <span style="font-size:1.4rem;flex-shrink:0">${iconForEmoji(s.emoji, 'link')}</span>
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:0.88rem">${esc(s.title)}</div>
          <div style="font-size:0.75rem;color:var(--text2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(s.url)}</div>
        </div>
        <a class="btn btn-ghost btn-sm" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${Icon('arrow-up-right')}</a>
        <button class="btn-icon btn-danger btn-sm" onclick="Profile.deleteMySite('${s.id}')" title="Slett">${Icon('trash')}</button>
      </div>`;
  }

  // ── View profile ──────────────────────────────────────────────────────
  let _viewUser = null;   // brukarnamnet til profilen som vert vist no (for Innlegg-fana)
  async function renderView(username) {
    _viewUser = username;
    const app = document.getElementById('app');
    app.innerHTML = '<div class="page-loading"><div class="spinner"></div></div>';

    const user = Auth.getUser(username);
    if (!user) { app.innerHTML = `<div class="empty-state" style="padding:6rem"><div class="empty-icon">${Icon('user')}</div><p>Bruker ikke funnet</p></div>`; return; }

    const current = Auth.current();
    const isOwner = current?.username === username;
    const profileVisibility = user.profileVisibility || 'public';

    if (!isOwner && profileVisibility === 'private') {
      app.innerHTML = `
        <div class="empty-state" style="padding:8rem;text-align:center">
          <div class="empty-icon">${Icon('lock')}</div>
          <p style="font-size:1.1rem;font-weight:700;margin-bottom:0.5rem">Denne profilen er privat</p>
          <p style="color:var(--text2);margin-bottom:1.5rem">@${username} har valgt å holde profilen sin skjult.</p>
          <a href="#/" class="btn btn-primary" style="display:inline-flex">${Icon('arrow-left')} Tilbake til forsiden</a>
        </div>`;
      return;
    }

    const theme   = user.theme || Auth.defaultTheme();

    // Build hero background
    let heroBgStyle = '';
    let heroBgExtra = '';
    if (theme.bgType === 'image' && theme.bgImage) {
      const filters = cssFilters(theme.bgImageFilters);
      heroBgStyle = `background-image:url(${theme.bgImage}); background-size:cover; background-position:center; filter:${filters};`;
    } else if (theme.bgType === 'video' && theme.bgVideoId) {
      const vUrl = await DB.getBlobUrl('media', theme.bgVideoId).catch(() => null);
      if (vUrl) heroBgExtra = `<video autoplay muted loop playsinline src="${vUrl}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:${cssFilters(theme.bgImageFilters)}"></video>`;
      heroBgStyle = `background:${theme.bgColor};`;
    } else if (theme.bgType === 'music') {
      heroBgStyle = `background:${theme.bgColor || '#0a0010'};`;
      const trackId = theme.bgMusicTrackId || (user.musicIds || [])[0] || null;
      const trackRec = trackId ? await DB.get('music', trackId).catch(() => null) : null;
      const trackUrl = trackRec ? (trackRec.audioUrl || await DB.getBlobUrl('music', trackId).catch(() => null)) : null;
      heroBgExtra = `<canvas id="profile-vis-canvas" style="position:absolute;inset:0;width:100%;height:100%"></canvas>${trackUrl ? `<audio id="profile-vis-audio" src="${trackUrl}" autoplay loop preload="auto" style="display:none"></audio>` : ''}`;
    } else if (theme.bgType === 'gradient') {
      heroBgStyle = `background:${theme.bgGradient || 'linear-gradient(135deg,#7c3aed,#2563eb)'};`;
    } else {
      heroBgStyle = `background:${theme.bgColor || '#0f0f1a'};`;
    }

    // Avatar
    const avHtml = await avatarEl(user);

    // Banner
    let bannerUrl = null;
    if (user.bannerMediaId) bannerUrl = await DB.getBlobUrl('media', user.bannerMediaId).catch(() => null);

    // ── Friend request / status button ───────────────────────────────────
    let friendBtn = '';
    if (!isOwner && current) {
      const status = Auth.getFriendStatus(current.username, username);
      if (status === 'friends') {
        friendBtn = `<button class="btn btn-ghost btn-sm" id="friend-btn" onclick="Profile.removeFriend('${username}')">${Icon('check')} Venner</button>`;
      } else if (status === 'pending_sent') {
        friendBtn = `<button class="btn btn-ghost btn-sm" id="friend-btn" onclick="Profile.cancelFriendRequest('${username}')">${Icon('hourglass')} Avbryt</button>`;
      } else if (status === 'pending_received') {
        friendBtn = `
          <button class="btn btn-primary btn-sm" id="friend-btn-accept" onclick="Profile.acceptFriend('${username}')">${Icon('check')} Aksepter</button>
          <button class="btn btn-ghost btn-sm" id="friend-btn-reject" onclick="Profile.rejectFriend('${username}')">${Icon('x')} Avslå</button>`;
      } else {
        friendBtn = `<button class="btn btn-primary btn-sm" id="friend-btn" onclick="Profile.sendFriendRequest('${username}')">${Icon('users')} Legg til venn</button>`;
      }
    }

    // ── Pending friend requests (owner only) ──────────────────────────────
    const pendingRequests = isOwner ? (user.friendRequests || []) : [];
    const pendingHtml = (isOwner && pendingRequests.length) ? `
      <div class="friend-requests-section">
        <div class="friend-requests-title">${Icon('users')} Venneforespørsler (${pendingRequests.length})</div>
        ${pendingRequests.map(r => {
          const requester = Auth.getUser(r.from);
          if (!requester) return '';
          return `
            <div class="friend-request-row">
              <a href="#/u/${r.from}" class="friend-request-name">${requester.displayName} <span>@${r.from}</span></a>
              <div style="display:flex;gap:0.5rem">
                <button class="btn btn-primary btn-sm" onclick="Profile.acceptFriend('${r.from}');Profile.renderView('${username}')">${Icon('check')} Aksepter</button>
                <button class="btn btn-ghost btn-sm" onclick="Profile.rejectFriend('${r.from}');Profile.renderView('${username}')">${Icon('x')} Avslå</button>
              </div>
            </div>`;
        }).join('')}
      </div>` : '';

    // ── Friends list ──────────────────────────────────────────────────────
    const friendsList = Auth.getFriends(username);
    const friendsHtml = friendsList.length ? `
      <div class="friends-section">
        <div class="friends-title">${Icon('users')} Venner (${friendsList.length})</div>
        <div class="friends-list">
          ${friendsList.map(f => `
            <div class="friend-chip-wrap">
              <a class="friend-chip" href="#/u/${f.username}">
                <div class="friend-chip-avatar">${f.displayName.charAt(0).toUpperCase()}</div>
                <span>${f.displayName}</span>
              </a>
              ${current ? `<button class="friend-chip-chat-btn" onclick="event.preventDefault();Router.go('/messages/${f.username}')" title="Send privat melding">${Icon('message')}</button>` : ''}
            </div>`).join('')}
        </div>
      </div>` : '';

    // ── Favorite radio ─────────────────────────────────────────────────────
    const favRadioHtml = user.favoriteRadio ? (() => {
      const fr = user.favoriteRadio;
      return `
      <div class="profile-fav-radio">
        ${psychedelicCover(fr.name || fr.url, { size: 46 })}
        <div class="fav-radio-meta">
          <div class="fav-radio-label">${Icon('radio')} Favorittkanal</div>
          <div class="fav-radio-name">${esc(fr.name || 'Radio')}</div>
        </div>
        <button class="btn btn-ghost btn-sm fav-radio-play" onclick="Radio.playUrl('${(fr.url||'').replace(/'/g,"\\'")}','${(fr.name||'Radio').replace(/'/g,"\\'")}','${fr.emoji||'📻'}')">${Icon('play')} Lytt</button>
      </div>`;
    })() : '';

    const wallCount = (JSON.parse(localStorage.getItem(`pv_wall_${username}`) || '[]')).length;

    app.innerHTML = `
      <div class="profile-page" id="profile-root" style="background:${theme.bgColor || '#0f0f1a'}; color:${theme.textColor || '#fff'}">
        <!-- Hero -->
        <div class="profile-hero" style="${bannerUrl ? `background-image:url(${bannerUrl});background-size:cover;background-position:center;` : ''}">
          <div class="profile-hero-bg" style="${heroBgStyle}">${heroBgExtra}</div>
          <div class="profile-hero-overlay"></div>
          ${current ? `<div class="profile-hero-actions">
            ${isOwner ? `<button class="btn btn-ghost btn-sm" onclick="Router.go('/edit')">${Icon('edit')} Rediger profil</button>
            <span style="font-size:0.72rem;padding:0.2rem 0.6rem;border-radius:999px;background:rgba(0,0,0,0.4);color:#fff;backdrop-filter:blur(4px);border:1px solid rgba(255,255,255,0.15)">${profileVisibility === 'private' ? '🔒 Privat' : '🌐 Offentlig'}</span>` : ''}
            <button class="btn btn-ghost btn-sm" onclick="App.logout()" title="Logg ut">${Icon('log-out')} Logg ut</button>
          </div>` : ''}
        </div>

        <div class="profile-body">
          <!-- Header row -->
          <div class="profile-header">
            <div class="profile-avatar" style="position:relative">
              ${avHtml}
              ${Auth.isOnline(username) && !isOwner ? '<div class="profile-online-dot" title="Online nå"></div>' : ''}
              ${isOwner ? `<label class="profile-avatar-cam" title="${user.avatarMediaId ? 'Endre profilbilde' : 'Legg til profilbilde'}" style="position:absolute;right:-2px;bottom:-2px;width:28px;height:28px;border-radius:50%;background:var(--accent,#7c3aed);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 2px 6px rgba(0,0,0,0.4);border:2px solid #0f0f1a">${Icon('camera')}<input type="file" id="profile-avatar-input" accept="image/*" style="display:none" onchange="Profile.setAvatarFromProfile(this,'${username}')"></label>` : ''}
            </div>
            <div class="profile-info">
              <div class="profile-display-name" style="font-family:${theme.fontFamily || 'Inter'},sans-serif">${user.displayName}</div>
              <div class="profile-username" style="color:${theme.textColor}99">@${user.username} ${Auth.isOnline(username) ? '<span class="profile-online-badge">● Online</span>' : ''}</div>
            </div>
            <div class="profile-actions">
              ${friendBtn}
              ${isOwner ? `
                <button class="btn btn-sm ${profileVisibility === 'private' ? 'btn-primary' : 'btn-ghost'}" onclick="Profile.toggleProfileVisibility('${username}')" title="${profileVisibility === 'private' ? 'Gjør profilen offentlig' : 'Gjør profilen privat'}">${profileVisibility === 'private' ? '🔒 Kun meg' : '🌐 Offentlig'}</button>
                <button class="btn btn-ghost btn-sm" onclick="Router.go('/edit')">${Icon('settings')} Rediger</button>` : ''}
            </div>
          </div>

          ${isOwner ? `
          <!-- Profilbilde-handlinger (kun eier) -->
          <div class="profile-avatar-actions" style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-bottom:1rem">
            ${user.avatarMediaId
              ? `<button class="btn btn-ghost btn-sm" onclick="document.getElementById('profile-avatar-input').click()">${Icon('camera')} Endre bilde</button>
                 <button class="btn btn-ghost btn-sm" onclick="Profile.deleteAvatar('${username}')">${Icon('trash')} Slett bilde</button>`
              : `<button class="btn btn-ghost btn-sm" onclick="document.getElementById('profile-avatar-input').click()">${Icon('plus')} Legg til bilde</button>`}
          </div>` : ''}

          <!-- Stats -->
          <div class="profile-stats" style="border-color:${theme.textColor}22">
            <div class="stat"><div class="stat-value">${(user.musicIds?.length || 0) + (user.mixIds?.length || 0) + (user.mediaIds?.length || 0)}</div><div class="stat-label" style="color:${theme.textColor}88">Opplastinger</div></div>
            <div class="stat"><div class="stat-value">${(user.friends || []).length}</div><div class="stat-label" style="color:${theme.textColor}88">Venner</div></div>
            <div class="stat"><div class="stat-value">${wallCount}</div><div class="stat-label" style="color:${theme.textColor}88">Gjestebok</div></div>
          </div>

          <!-- Tab bar -->
          <div class="profile-tabs" id="profile-tabs">
            <button class="tab-btn active" data-tab="om" onclick="Profile.switchTab('om')">Om</button>
            <button class="tab-btn" data-tab="innhold" onclick="Profile.switchTab('innhold')">${Icon('music')} Innhold</button>
            <button class="tab-btn" data-tab="innlegg" onclick="Profile.switchTab('innlegg')">${Icon('edit')} Innlegg</button>
            <button class="tab-btn" data-tab="vegg" onclick="Profile.switchTab('vegg')">${Icon('message')} Gjestebok${wallCount ? ` (${wallCount})` : ''}</button>
          </div>

          <!-- OM-fanen -->
          <div class="profile-tab-content" data-tab="om" id="tab-om">
            ${(()=>{const m={lytter:'🎧 Lytter',dj:'🎛️ DJ',produsent:'🎹 Produsent',plateselskap:'🏷️ Plateselskap'};const l=m[user.role||'lytter'];return l?`<div style="margin-bottom:0.75rem"><span class="profile-role-badge" style="background:${theme.primaryColor}33;border:1px solid ${theme.primaryColor}66;color:${theme.textColor}">${l}</span></div>`:'';})()}
            ${user.bio ? `<div class="profile-bio" style="color:${theme.textColor}cc">${user.bio}</div>` : isOwner ? `<div class="profile-bio-empty"><span style="color:${theme.textColor}55">Ingen bio ennå.</span> <a href="#/edit" style="color:${theme.primaryColor || 'var(--accent)'}">+ Legg til bio</a></div>` : ''}
            ${user.links?.length ? `<div class="profile-links">${user.links.map(l => `<a class="profile-link" href="${l.url}" target="_blank" rel="noopener">${Icon('link')} ${l.label}</a>`).join('')}</div>` : ''}
            ${window.BroadcastSchedule ? BroadcastSchedule.profileSection(user, isOwner, theme) : ''}
            ${favRadioHtml}
            ${pendingHtml}
            ${friendsHtml}
            ${platformsBadgesHtml(user)}
            ${mySitesViewHtml(user)}
            ${festivalBadgesHtml(user)}
            ${eventsViewHtml(user)}
            <div id="cp-section"></div>
          </div>

          <!-- INNHOLD-fanen -->
          <div class="profile-tab-content hidden" data-tab="innhold" id="tab-innhold">
            <div id="tab-music-player"></div>
            <div id="tab-store"></div>
            <div id="tab-mixes"><div class="page-loading"><div class="spinner"></div></div></div>
            <div id="tab-media"><div class="page-loading"><div class="spinner"></div></div></div>
          </div>

          <!-- INNLEGG-fanen (eigne status-innlegg → community) -->
          <div class="profile-tab-content hidden" data-tab="innlegg" id="tab-innlegg"></div>

          <!-- GJESTEBOK-fanen (andre skriv til deg) -->
          <div class="profile-tab-content hidden" data-tab="vegg" id="tab-vegg">
            <div id="tab-wall"></div>
          </div>
        </div>
      </div>
    `;

    applyTheme(theme, document.getElementById('profile-root'));

    // Render custom page blocks
    const cpResult = buildCustomPageHtml(user.customPage?.blocks || []);
    const cpEl = document.getElementById('cp-section');
    if (cpEl) cpEl.innerHTML = cpResult.html;
    cpResult.countdowns.forEach(cd => startCountdown(cd.id, cd.date));

    renderMusicPlayer(user, isOwner);
    renderStoreSection(user, isOwner);
    renderMixesSection(user, isOwner);
    renderMediaTab(user, isOwner);
    renderWallTab(username, isOwner);
    if (window.Community) Community.renderProfilePosts(username, isOwner);

    if (theme.bgType === 'music') _startProfileVisualizer(theme);
  }

  function _startProfileVisualizer(theme) {
    const canvas = document.getElementById('profile-vis-canvas');
    if (!canvas) return;
    canvas.width  = canvas.offsetWidth  || 800;
    canvas.height = canvas.offsetHeight || 260;
    const ctx = canvas.getContext('2d');
    const primary = theme.primaryColor || '#7c3aed';
    const accent  = theme.accentColor  || '#f59e0b';
    let raf;
    let analyser = null;
    let dataArr  = null;

    const audio = document.getElementById('profile-vis-audio');
    if (audio) {
      try {
        const actx = new (window.AudioContext || window.webkitAudioContext)();
        const src  = actx.createMediaElementSource(audio);
        analyser   = actx.createAnalyser();
        analyser.fftSize = 256;
        src.connect(analyser);
        analyser.connect(actx.destination);
        dataArr = new Uint8Array(analyser.frequencyBinCount);
        audio.play().catch(() => {});
      } catch (_) {}
    }

    let t = 0;
    function draw() {
      raf = requestAnimationFrame(draw);
      t += 0.018;
      const W = canvas.offsetWidth;
      const H = canvas.offsetHeight;
      if (canvas.width !== W) canvas.width = W;
      if (canvas.height !== H) canvas.height = H;

      ctx.clearRect(0, 0, W, H);

      const bars = 64;
      const barW = W / bars;

      if (analyser && dataArr) {
        analyser.getByteFrequencyData(dataArr);
      }

      for (let i = 0; i < bars; i++) {
        let amp;
        if (analyser && dataArr) {
          const idx = Math.floor(i * dataArr.length / bars);
          amp = dataArr[idx] / 255;
        } else {
          amp = 0.3 + 0.35 * Math.sin(t * 1.6 + i * 0.35) + 0.2 * Math.sin(t * 3.1 + i * 0.8);
          amp = Math.max(0, Math.min(1, amp));
        }

        const hue  = (i / bars * 280 + t * 40) % 360;
        const barH = amp * H * 0.82 + 4;
        const x    = i * barW;
        const y    = H - barH;

        const grad = ctx.createLinearGradient(x, H, x, y);
        grad.addColorStop(0, `hsla(${hue},90%,55%,0.9)`);
        grad.addColorStop(1, `hsla(${(hue+60)%360},95%,75%,0.4)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x + 1, y, barW - 2, barH, [3, 3, 0, 0]);
        ctx.fill();

        // mirror top glow
        ctx.fillStyle = `hsla(${hue},85%,65%,0.12)`;
        ctx.fillRect(x + 1, 0, barW - 2, amp * H * 0.15);
      }
    }
    draw();

    // Stop when navigating away
    const observer = new MutationObserver(() => {
      if (!document.getElementById('profile-vis-canvas')) {
        cancelAnimationFrame(raf);
        observer.disconnect();
      }
    });
    observer.observe(document.getElementById('app') || document.body, { childList: true, subtree: false });
  }

  async function renderMediaTab(user, isOwner) {
    const el = document.getElementById('tab-media');
    if (!el) return;

    const ids = user.mediaIds || [];
    if (!ids.length) {
      el.innerHTML = `<div class="empty-state"><div class="empty-icon">${Icon('image')}</div><p>${isOwner ? 'Last opp ditt første bilde eller video!' : 'Ingen medier ennå.'}</p>${isOwner ? `<button class="btn btn-primary mt-2" onclick="Router.go('/edit')">Last opp</button>` : ''}</div>`;
      return;
    }

    const recs = await DB.getAllByIds('media', ids);
    // Hide private items from everyone but the owner.
    const visibleRecs = isOwner ? recs : recs.filter(r => r.visibility !== 'private');
    el.innerHTML = `<div class="media-grid">${visibleRecs.map(r => mediaCard(r, isOwner)).join('')}</div>`;
    await Promise.all(visibleRecs.map(r => fillMediaContainer(r, document.getElementById(`media-${r.id}`))));
  }

  // ── Media helpers (shared by profile + editor grids) ──────────────────
  // Pull the 11-char video id out of any common YouTube URL form.
  function parseYouTubeId(url) {
    const m = String(url || '').match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    return m ? m[1] : null;
  }
  // Prefer the shared Supabase URL; fall back to a local IndexedDB blob.
  async function mediaSrc(r) {
    if (r.mediaUrl) return r.mediaUrl;
    return await DB.getBlobUrl('media', r.id).catch(() => null);
  }
  // Fill a grid placeholder with the right element (image / video / YouTube thumb).
  async function fillMediaContainer(r, container) {
    if (!container) return;
    if (r.kind === 'youtube' && r.youtubeId) {
      container.innerHTML = `<img src="https://i.ytimg.com/vi/${r.youtubeId}/hqdefault.jpg" alt="${esc(r.name || 'YouTube')}" loading="lazy" style="width:100%;height:100%;object-fit:cover">`;
      return;
    }
    const url = await mediaSrc(r);
    if (!url) return;
    if ((r.type || '').startsWith('video/')) {
      container.innerHTML = `<video src="${url}" muted loop preload="metadata" onclick="this.paused?this.play():this.pause()" style="width:100%;height:100%;object-fit:cover"></video>`;
    } else {
      container.innerHTML = `<img src="${url}" alt="${esc(r.name || '')}" loading="lazy" style="width:100%;height:100%;object-fit:cover">`;
    }
  }

  function mediaCard(r, isOwner) {
    const isVideo = (r.type || '').startsWith('video/');
    const isYt    = r.kind === 'youtube';
    const isPriv  = r.visibility === 'private';
    const badge   = isYt ? '<span class="media-badge">▶ YOUTUBE</span>' : (isVideo ? '<span class="media-badge">VIDEO</span>' : '');
    const placeholderIcon = isYt ? '▶️' : (isVideo ? '🎬' : '🖼️');
    return `
      <div class="media-item" id="media-wrap-${r.id}">
        <div id="media-${r.id}" style="width:100%;height:100%;background:var(--surface)">
          <div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text3)">${placeholderIcon}</div>
        </div>
        ${badge}
        <div class="media-item-overlay">
          <button class="btn-icon" onclick="openMediaModal('${r.id}')" title="Vis">${Icon('eye')}</button>
          ${isOwner ? `<button class="btn-icon" onclick="Profile.toggleMediaVisibility('${r.id}')" title="${isPriv ? 'Privat — kun du. Klikk for å dele med alle' : 'Offentlig — alle ser den. Klikk for å gjøre privat'}">${isPriv ? '🔒' : '🌐'}</button>` : ''}
          ${isOwner ? `<button class="btn-icon" onclick="Profile.shareMediaToCommunity('${r.id}')" title="Del til Community-veggen">📣</button>` : ''}
          ${isOwner ? `<button class="btn-icon btn-danger" onclick="deleteMedia('${r.id}')" title="Slett">${Icon('trash')}</button>` : ''}
        </div>
      </div>`;
  }

  const PROFILE_MAIN_CATS = {
    electronic: { label: 'Electronic / Dance', emoji: '⚡', labels: [
      { name: 'Kompakt Records',       email: 'demo@kompakt.fm' },
      { name: 'Ghostly International', email: 'info@ghostly.com' },
      { name: 'Warp Records',          email: 'demo@warp.net' },
      { name: 'Ninja Tune',            email: 'demos@ninjatune.net' },
    ]},
    hiphop: { label: 'Hip-Hop / R&B', emoji: '🎤', labels: [
      { name: 'Stones Throw Records', email: 'demos@stonesthrow.com' },
      { name: 'Rhymesayers',          email: 'demos@rhymesayers.com' },
      { name: 'Def Jam (demo)',        email: 'unsigned@defjam.com' },
    ]},
    pop: { label: 'Pop / Indie', emoji: '🎶', labels: [
      { name: 'Warner Music Norway', email: 'demos@warnermusic.no' },
      { name: 'Sony Music Norway',   email: 'demos@sonymusic.no' },
      { name: 'Universal Music',     email: 'demos@umusic.no' },
    ]},
    rock: { label: 'Rock / Metal', emoji: '🎸', labels: [
      { name: 'Nuclear Blast',   email: 'bands@nuclearblast.de' },
      { name: 'Relapse Records', email: 'demos@relapse.com' },
      { name: 'Sub Pop Records', email: 'demos@subpop.com' },
    ]},
    jazz: { label: 'Jazz / Blues', emoji: '🎷', labels: [
      { name: 'ECM Records', email: 'info@ecmrecords.com' },
      { name: 'Blue Note',   email: 'info@bluenote.com' },
      { name: 'ACT Music',   email: 'demos@actmusic.com' },
    ]},
    ambient: { label: 'Eksperimentell / Ambient', emoji: '🌌', labels: [
      { name: 'Kranky Records', email: 'info@kranky.net' },
      { name: 'Touch Music',    email: 'demos@touchmusic.org.uk' },
      { name: '12k',            email: 'demos@12k.com' },
    ]},
  };

  function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  // Faste salgs-/strømmetjenester for kjøpslenker på egne sanger
  const BUY_SERVICES = [
    { key: 'bandcamp',   name: 'Bandcamp'    },
    { key: 'beatport',   name: 'Beatport'    },
    { key: 'spotify',    name: 'Spotify'     },
    { key: 'apple',      name: 'Apple Music' },
    { key: 'soundcloud', name: 'SoundCloud'  },
  ];

  function songCreditsLineHtml(c) {
    if (!c) return '';
    const parts = [];
    if (c.label)     parts.push(`Label: ${esc(c.label)}`);
    if (c.producer)  parts.push(`Prod: ${esc(c.producer)}`);
    if (c.mixing)    parts.push(`Mix: ${esc(c.mixing)}`);
    if (c.mastering) parts.push(`Master: ${esc(c.mastering)}`);
    return parts.length ? `<div class="music-credits">${parts.join(' · ')}</div>` : '';
  }

  function songBuyLinksHtml(links) {
    if (!links) return '';
    const chips = BUY_SERVICES.filter(s => links[s.key]).map(s =>
      `<a class="song-buy-chip" href="${esc(links[s.key])}" target="_blank" rel="noopener" onclick="event.stopPropagation()">🛒 ${s.name}</a>`
    ).join('');
    return chips ? `<div class="song-buy-links">${chips}</div>` : '';
  }

  function musicItem(r, index, username, isOwner) {
    const dur    = r.duration ? `${Math.floor(r.duration / 60)}:${String(Math.floor(r.duration % 60)).padStart(2,'0')}` : '--:--';
    const cat    = r.mainCategory ? PROFILE_MAIN_CATS[r.mainCategory] : null;
    const title  = r.name || r.title || 'Untitled';
    return `
      <div class="music-item" id="mitem-${esc(r.id)}">
        <div class="music-thumb" id="mthumb-${esc(r.id)}" onclick="Profile.playTrack('${esc(username)}', ${index})" style="cursor:pointer" title="Spill av">
          <span class="music-thumb-fallback">${Icon('music')}</span>
          <span class="music-thumb-play">${Icon('play')}</span>
        </div>
        <div class="music-meta" onclick="Profile.playTrack('${esc(username)}', ${index})" style="cursor:pointer;flex:1;min-width:0">
          <div class="music-name">${esc(title)}</div>
          <div class="music-artist">${esc(r.artist || 'Ukjent artist')}</div>
          ${r.description ? `<div class="music-desc">${esc(r.description)}</div>` : ''}
          ${cat ? `<span class="music-cat-badge">${iconForEmoji(cat.emoji)} ${esc(cat.label)}</span>` : ''}
          ${songCreditsLineHtml(r.credits)}
          ${songBuyLinksHtml(r.buyLinks)}
        </div>
        <div class="music-item-right">
          <span class="music-dur">${dur}</span>
          ${isOwner ? `<button class="btn-icon" title="${r.visibility === 'private' ? 'Privat — kun du ser den. Klikk for å gjøre offentlig (vises i Discover for alle)' : 'Offentlig — vises i Discover for alle. Klikk for å gjøre privat'}" onclick="event.stopPropagation();Profile.toggleTrackVisibility('${esc(r.id)}','${esc(username)}')">${r.visibility === 'private' ? '🔒' : '🌐'}</button>` : ''}
          ${isOwner ? `<button class="btn-icon" title="Del til Community-veggen" onclick="event.stopPropagation();Profile.shareTrackToCommunity('${esc(r.id)}','${esc(username)}')">📣</button>` : ''}
          ${isOwner ? `<button class="btn-icon music-credits-btn" title="Kreditering & kjøpslenker" onclick="event.stopPropagation();Profile.openSongCreditsModal('${esc(r.id)}')">${Icon('edit')}</button>` : ''}
          ${isOwner ? `<label class="music-cover-upload" title="Endre cover" onclick="event.stopPropagation()">${Icon('camera')}<input type="file" accept="image/*" style="display:none" onchange="Profile.uploadMusicCover('${esc(r.id)}',this.files[0])"></label>` : ''}
          ${isOwner && cat ? `
          <div class="music-demo-wrap">
            <button class="music-demo-btn" title="Send demo til plateselskap"
              onclick="event.stopPropagation();Profile.toggleDemoMenu('${esc(r.id)}')">${Icon('mail')} Demo</button>
            <div class="music-demo-menu" id="demo-menu-${esc(r.id)}" style="display:none">
              ${cat.labels.map(l => `
                <a class="music-demo-link"
                   href="mailto:${esc(l.email)}?subject=${encodeURIComponent('Demo: ' + title)}&body=${encodeURIComponent('Hei,\n\nJeg ønsker å sende deg en demo av sporet «' + title + '».\n\nMed vennlig hilsen')}">
                  ${esc(l.name)}
                </a>`).join('')}
            </div>
          </div>` : ''}
          ${isOwner && !cat ? `
          <a href="#/discover" class="music-setcat-btn" title="Velg hoved kategori">+ Kategori</a>` : ''}
        </div>
      </div>`;
  }

  function toggleDemoMenu(trackId) {
    const menu = document.getElementById(`demo-menu-${trackId}`);
    if (!menu) return;
    const isOpen = menu.style.display !== 'none';
    document.querySelectorAll('.music-demo-menu').forEach(m => { m.style.display = 'none'; });
    menu.style.display = isOpen ? 'none' : 'block';
  }

  function loadMusicCoverArts(recs) {
    recs.forEach(async r => {
      // Skydelt musikk (sharemusic.js / cloud) lagrer cover som direkte URL;
      // lokal opplasting lagrer en blob under coverMediaId. Støtt begge.
      let url = r.coverUrl || null;
      if (!url && r.coverMediaId) url = await DB.getBlobUrl('media', r.coverMediaId).catch(() => null);
      if (!url) return;
      const el = document.getElementById(`mthumb-${r.id}`);
      if (!el) return;
      // Sett som bakgrunn så play-knapp-overlegget blir liggende oppå coveret.
      el.style.backgroundImage = `url("${String(url).replace(/"/g, '%22')}")`;
      el.style.backgroundSize = 'cover';
      el.style.backgroundPosition = 'center';
      el.classList.add('has-cover');
    });
  }

  async function renderMusicPlayer(user, isOwner) {
    const el = document.getElementById('tab-music-player');
    if (!el) return;
    const ids = user.musicIds || [];
    if (!ids.length) {
      if (isOwner) el.innerHTML = `<div class="empty-state" style="padding:2rem 0"><div class="empty-icon">${Icon('music')}</div><p>Last opp musikk i profileditoren</p><button class="btn btn-primary btn-sm mt-2" onclick="Router.go('/edit')">Last opp</button></div>`;
      return;
    }
    const recs = await DB.getAllByIds('music', ids);
    // index stays aligned with user.musicIds (playTrack uses that array + index);
    // private tracks are simply not rendered for non-owners.
    const itemsHtml = recs.map((r, i) =>
      (!isOwner && r.visibility === 'private') ? '' : musicItem(r, i, user.username, isOwner)
    ).join('');
    el.innerHTML = `
      <div class="profile-music-section">
        <div class="profile-music-title">${Icon('music')} Musikk</div>
        <div class="music-list">${itemsHtml}</div>
      </div>`;
    loadMusicCoverArts(recs);
  }

  async function playTrack(username, index) {
    const user = Auth.getUser(username);
    if (!user?.musicIds?.length) return;
    await Player.setQueue(user.musicIds, index);
    document.querySelectorAll('.music-item').forEach((el, i) => el.classList.toggle('playing', i === index));
  }

  // ── Butikk (sanger til salgs / gratis nedlasting) ──────────────────────
  async function renderStoreSection(user, isOwner) {
    const el = document.getElementById('tab-store');
    if (!el || typeof Marketplace === 'undefined' || !Marketplace.isConfigured()) return;
    const products = await Marketplace.listSellerProducts(user.username).catch(() => []);
    if (!products.length) {
      el.innerHTML = isOwner
        ? `<div class="profile-store-section"><div class="profile-store-title">🛒 Butikk</div>
             <p style="font-size:0.82rem;color:var(--text2)">Du har ingen sanger til salgs ennå. Åpne en sang i editoren (✎) → «Selg denne sangen».</p></div>`
        : '';
      return;
    }
    el.innerHTML = `
      <div class="profile-store-section">
        <div class="profile-store-title">🛒 Butikk · ${products.length} ${products.length === 1 ? 'sang' : 'sanger'}</div>
        <div class="store-list">${products.map(p => storeCard(p, isOwner)).join('')}</div>
      </div>`;
  }

  function storeCard(p, isOwner) {
    const dur   = p.duration_sec ? `${Math.floor(p.duration_sec / 60)}:${String(Math.floor(p.duration_sec % 60)).padStart(2,'0')}` : '';
    const price = p.is_free ? 'Gratis' : `${(p.price_ore / 100).toFixed(0)} kr`;
    const btn   = p.is_free
      ? `<button class="btn btn-primary btn-sm" onclick="Marketplace.buySong('${esc(p.id)}')">⬇ Gratis nedlasting</button>`
      : `<button class="btn btn-gold btn-sm" onclick="Marketplace.buySong('${esc(p.id)}')">🛒 Kjøp · ${price}</button>`;
    const cover = p.cover_path
      ? `<img src="${esc(p.cover_path)}" alt="" loading="lazy" style="width:48px;height:48px;object-fit:cover;border-radius:8px;flex-shrink:0">`
      : '';
    return `
      <div class="store-card">
        ${cover}
        <div class="store-card-meta">
          <div class="store-card-title">${esc(p.title)}</div>
          <div class="store-card-sub">${esc(p.artist || '')}${dur ? ' · ' + dur : ''}</div>
        </div>
        <div class="store-card-right">
          <span class="store-card-price">${price}</span>
          ${isOwner ? `<span class="store-card-owner">Din</span>` : btn}
        </div>
      </div>`;
  }

  // ── Friend request actions ────────────────────────────────────────────
  async function sendFriendRequest(targetUsername) {
    const current = Auth.current();
    if (!current) { Router.go('/login'); return; }
    const result = Auth.sendFriendRequest(current.username, targetUsername);
    if (result.error) { App.toast(result.error, 'error'); return; }

    const targetUser = Auth.getUser(targetUsername);
    if (targetUser?.email) {
      Email.sendFriendRequest(targetUser.email, targetUser.displayName, current.displayName, current.username)
        .catch(() => {});
    }

    if (window.Notify) Notify.emit(targetUsername, { type: 'friend_request', text: 'sendte deg en venneforespørsel', link: `#/u/${current.username}` });
    App.toast(`Venneforespørsel sendt til @${targetUsername} ${Icon('users')}`, 'success');
    App.renderNav();
    renderView(targetUsername);
  }

  function acceptFriend(fromUsername) {
    const current = Auth.current();
    if (!current) return;
    const result = Auth.acceptFriendRequest(current.username, fromUsername);
    if (result.error) { App.toast(result.error, 'error'); return; }
    if (window.Notify) Notify.emit(fromUsername, { type: 'friend_accept', text: 'godtok venneforespørselen din', link: `#/u/${current.username}` });
    if (window.FriendChat) FriendChat.refresh();   // dukar opp no som dei har ein venn
    App.toast(`Du er nå venner med @${fromUsername}! ${Icon('party')}`, 'success');
    App.renderNav();
    renderView(current.username);
  }

  function rejectFriend(fromUsername) {
    const current = Auth.current();
    if (!current) return;
    Auth.rejectFriendRequest(current.username, fromUsername);
    App.toast(`Venneforespørsel fra @${fromUsername} avslått`, 'info');
    App.renderNav();
    renderView(current.username);
  }

  function cancelFriendRequest(targetUsername) {
    const current = Auth.current();
    if (!current) return;
    Auth.cancelFriendRequest(current.username, targetUsername);
    App.toast('Venneforespørsel trukket tilbake', 'info');
    renderView(targetUsername);
  }

  function removeFriend(targetUsername) {
    const current = Auth.current();
    if (!current) return;
    Auth.removeFriend(current.username, targetUsername);
    App.toast(`@${targetUsername} fjernet fra vennelisten`, 'info');
    renderView(targetUsername);
  }

  // ── Editor ────────────────────────────────────────────────────────────
  async function renderEditor() {
    const current = Auth.current();
    if (!current) { Router.go('/login'); return; }
    _aiChatHistory = [];

    const app = document.getElementById('app');
    const t   = current.theme || Auth.defaultTheme();

    _cpBlocks = JSON.parse(JSON.stringify(current.customPage?.blocks || []));

    app.innerHTML = `
    <div class="editor-layout">
      <!-- SIDEBAR -->
      <div class="editor-sidebar">
        <div class="editor-panel" style="margin-bottom:1rem">
          <div class="editor-panel-header">${Icon('user')} Profil</div>
          <div class="editor-panel-body">
            <div class="form-group">
              <label class="form-label">Visningsnavn</label>
              <input class="form-input" id="ed-displayName" value="${current.displayName}">
            </div>
            <div class="form-group">
              <label class="form-label">Bio</label>
              <textarea class="form-input" id="ed-bio" rows="4">${current.bio || ''}</textarea>
            </div>
            <div class="form-group">
              <label class="form-label">Lenker (trykk Enter for å legge til)</label>
              <div class="chip-input-wrap" id="links-wrap">
                ${(current.links || []).map(l => chipHtml(l)).join('')}
                <input class="chip-input" id="link-input" placeholder="https://…" title="Skriv URL og trykk Enter">
              </div>
            </div>
            <button class="btn btn-primary w-full" onclick="Profile.saveProfile()">${Icon('save')} Lagre profil</button>
          </div>
        </div>

        <!-- VISIBILITY PANEL -->
        <div class="editor-panel" style="margin-bottom:1rem">
          <div class="editor-panel-header">${Icon('lock')} Synlighet</div>
          <div class="editor-panel-body">
            <p style="font-size:0.82rem;color:var(--text2);margin-bottom:0.75rem;line-height:1.5">
              Velg hvem som kan se profilen din — uansett om du er DJ, artist, plateselskap eller bare her for å sosialisere.
            </p>
            <div style="display:flex;gap:0.5rem;margin-bottom:0.75rem">
              <button id="vis-public-btn" class="btn btn-sm ${(current.profileVisibility || 'public') === 'public' ? 'btn-primary' : 'btn-ghost'}" style="flex:1" onclick="Profile.setProfileVisibility('public')">${Icon('globe')} Offentlig</button>
              <button id="vis-private-btn" class="btn btn-sm ${(current.profileVisibility || 'public') === 'private' ? 'btn-primary' : 'btn-ghost'}" style="flex:1" onclick="Profile.setProfileVisibility('private')">${Icon('lock')} Kun meg</button>
            </div>
            <p id="vis-desc" style="font-size:0.75rem;color:var(--text3);line-height:1.5;margin:0">
              ${(current.profileVisibility || 'public') === 'private'
                ? 'Bare du kan se profilen din. Andre ser en låst side.'
                : 'Alle kan finne og se profilen din.'}
            </p>
          </div>
        </div>

        <!-- ROLES PANEL -->
        <div class="editor-panel" style="margin-bottom:1rem">
          <div class="editor-panel-header">${Icon('film')} Din rolle</div>
          <div class="editor-panel-body">
            <div class="role-selector" id="ed-role-selector">
              ${[['lytter','🎧','Lytter'],['dj','🎛️','DJ'],['produsent','🎹','Produsent'],['plateselskap','🏷️','Plateselskap']].map(([val,emoji,label]) => `<label class="role-option" onclick="Profile.selectEditorRole('${val}',this)"><input type="radio" name="ed-role" value="${val}" ${(current.role||'lytter')===val?'checked':''} style="display:none"><div class="role-option-inner ${(current.role||'lytter')===val?'active':''}"><span class="role-option-emoji">${iconForEmoji(emoji)}</span><span class="role-option-label">${label}</span></div></label>`).join('')}
            </div>
            <button class="btn btn-ghost btn-sm w-full" style="margin-top:0.75rem" onclick="Profile.saveProfile()">${Icon('save')} Lagre rolle</button>
          </div>
        </div>

        <!-- AI CHAT PANEL -->
        <div class="editor-panel">
          <div class="editor-panel-header">${Icon('bot')} AI Design-assistent</div>
          <div class="ai-chat-panel-body">
            ${!AI.hasKey() ? `<div class="ai-no-key-banner">${Icon('alert')} <a href="#/settings" style="color:var(--accent)">Legg til Claude API-nøkkel</a> for å bruke AI-chatten.</div>` : ''}
            <div class="ai-chat-window" id="ai-chat-window">
              <div class="ai-chat-bubble ai-chat-bubble--bot">${Icon('smile')} Hei! Jeg er din AI design-assistent. Beskriv stilen du vil ha — f.eks. <em>"kosmisk og mørk"</em>, <em>"neon DJ-vibes"</em> — eller spør meg om farger, layout og bio!</div>
            </div>
            <div class="ai-chat-quick">
              <button class="ai-tip-btn" onclick="Profile.sendAiChatMsg('Lag en fargepalett for en psykedelisk DJ-profil')">${Icon('palette')} DJ farger</button>
              <button class="ai-tip-btn" onclick="Profile.sendAiChatMsg('Skriv en bio basert på profilen min')">${Icon('edit')} Bio</button>
              <button class="ai-tip-btn" onclick="Profile.sendAiChatMsg('Foreslå beste layout og font for meg')">${Icon('edit')} Layout</button>
              <button class="ai-tip-btn" onclick="Profile.sendAiChatMsg('Hvilke seksjoner bør jeg ha på profilen min?')">${Icon('lightbulb')} Tips</button>
            </div>
            <div class="ai-chat-input-row">
              <input class="form-input" id="ai-chat-input" placeholder="Spør AI-en om design…"
                onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();Profile.sendAiChat()}">
              <button class="btn btn-primary ai-chat-send-btn" id="ai-chat-send" onclick="Profile.sendAiChat()">${Icon('arrow-up')}</button>
            </div>
          </div>
        </div>

      </div>

      <!-- MAIN EDIT AREA (tabs) -->
      <div>
        <div class="editor-panel">
          <div class="editor-panel-header">
            <div class="profile-tabs" style="border:none;margin:0">
              <button class="tab-btn active" onclick="switchEditorTab('theme',this)" data-tab="theme">${Icon('palette')} Utseende</button>
              <button class="tab-btn" onclick="switchEditorTab('media',this)" data-tab="media">${Icon('camera')} Medier</button>
              <button class="tab-btn" onclick="switchEditorTab('music',this)" data-tab="music">${Icon('music')} Musikk</button>
              <button class="tab-btn" onclick="switchEditorTab('avatar',this)" data-tab="avatar">${Icon('user')} Avatar/Banner</button>
              <button class="tab-btn" onclick="switchEditorTab('events',this)" data-tab="events">${Icon('calendar')} Events</button>
              <button class="tab-btn" onclick="switchEditorTab('festivals',this)" data-tab="festivals">${Icon('star')} Festivaler</button>
              <button class="tab-btn" onclick="switchEditorTab('mixes',this)" data-tab="mixes">${Icon('sliders')} DJ Mixes</button>
              <button class="tab-btn" onclick="switchEditorTab('labels',this)" data-tab="labels">${Icon('tag')} Plateselskaper</button>
              <button class="tab-btn" onclick="switchEditorTab('platforms',this)" data-tab="platforms">${Icon('laptop')} Plattformer</button>
              <button class="tab-btn" onclick="switchEditorTab('mysites',this)" data-tab="mysites">${Icon('globe')} Mine Sider</button>
              <button class="tab-btn" onclick="switchEditorTab('mypage',this)" data-tab="mypage">${Icon('wind')} Min Side</button>
            </div>
          </div>
          <div class="editor-panel-body">
            <!-- THEME TAB -->
            <div id="etab-theme">
              ${themeEditorHtml(t)}
            </div>
            <!-- MEDIA TAB -->
            <div id="etab-media" class="hidden">
              ${mediaUploadHtml()}
            </div>
            <!-- MUSIC TAB -->
            <div id="etab-music" class="hidden">
              ${musicUploadHtml()}
            </div>
            <!-- AVATAR TAB -->
            <div id="etab-avatar" class="hidden">
              ${avatarBannerHtml()}
            </div>
            <!-- EVENTS TAB -->
            <div id="etab-events" class="hidden">
              ${eventsTabHtml(current)}
            </div>
            <!-- FESTIVALS TAB -->
            <div id="etab-festivals" class="hidden">
              ${festivalsTabHtml(current)}
            </div>
            <!-- MIXES TAB -->
            <div id="etab-mixes" class="hidden">
              ${mixesEditorHtml(current)}
            </div>
            <!-- LABELS TAB -->
            <div id="etab-labels" class="hidden">
              ${labelsTabHtml(current)}
            </div>
            <!-- PLATFORMS TAB -->
            <div id="etab-platforms" class="hidden">
              ${platformsTabHtml(current)}
            </div>
            <!-- MY SITES TAB -->
            <div id="etab-mysites" class="hidden">
              ${mySitesTabHtml(current)}
            </div>
            <!-- MIN SIDE — custom page builder -->
            <div id="etab-mypage" class="hidden">
              ${customPageTabHtml(current)}
            </div>
          </div>
        </div>

        <!-- Live preview -->
        <div class="editor-panel" style="margin-top:1rem">
          <div class="editor-panel-header">${Icon('eye')} Live forhåndsvisning</div>
          <div class="editor-panel-body" id="theme-preview-wrap" style="padding:0;overflow:hidden;border-radius:0 0 20px 20px">
            <div id="theme-preview" style="padding:1.5rem;min-height:120px;transition:all 0.3s">
              <div style="display:flex;align-items:center;gap:1rem">
                <div id="prev-avatar" style="width:56px;height:56px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:1.2rem;flex-shrink:0">${initials(current.displayName)}</div>
                <div>
                  <div id="prev-name" style="font-size:1.4rem;font-weight:800;line-height:1.1">${current.displayName}</div>
                  <div id="prev-username" style="font-size:0.85rem;opacity:0.6">@${current.username}</div>
                </div>
              </div>
              <div id="prev-bio" style="margin-top:0.75rem;font-size:0.9rem;opacity:0.8;line-height:1.6">${current.bio || ''}</div>
            </div>
          </div>
        </div>

        <div style="display:flex;gap:0.75rem;margin-top:1rem">
          <button class="btn btn-primary" onclick="Profile.saveProfile()">${Icon('save')} Lagre alle endringer</button>
          <a href="#/u/${current.username}" class="btn btn-ghost">${Icon('eye')} Se profil</a>
        </div>
      </div>
    </div>`;

    bindEditorEvents(t);
    loadEditorMedia(current);
    loadEditorMusic(current);
    loadMyPurchases(current);
    loadEditorMixes(current);
    _loadBgMusicSelector(current, t);
  }

  async function _loadBgMusicSelector(user, t) {
    const sel = document.getElementById('ed-bg-music-track');
    if (!sel || !user.musicIds?.length) return;
    const recs = await DB.getAllByIds('music', user.musicIds);
    sel.innerHTML = `<option value="">— Automatisk (første sang) —</option>` +
      recs.map(r => `<option value="${r.id}" ${t.bgMusicTrackId === r.id ? 'selected' : ''}>${r.name || r.id}</option>`).join('');
  }

  function themeEditorHtml(t) {
    const fonts  = ['Inter','Space Grotesk'];
    const bgTypes = ['color','gradient','image','video','music'];
    const userTracks = (Auth.current()?.musicIds || []);
    return `
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1.5rem">
        <!-- Colors -->
        <div class="editor-section">
          <div class="editor-section-title">Farger</div>
          <div class="color-row">
            ${colorInput('Primærfarge',    'ed-primary',   t.primaryColor)}
            ${colorInput('Sekundærfarge',  'ed-secondary', t.secondaryColor)}
            ${colorInput('Bakgrunnsfarge', 'ed-bg',        t.bgColor)}
            ${colorInput('Tekstfarge',     'ed-text',      t.textColor)}
            ${colorInput('Aksentfarge',    'ed-accent',    t.accentColor)}
          </div>
        </div>

        <!-- Background -->
        <div class="editor-section">
          <div class="editor-section-title">Bakgrunn</div>
          <div class="bg-type-row">
            ${bgTypes.map(t2 => `<button class="bg-type-btn ${t.bgType === t2 ? 'active' : ''}" onclick="setBgType('${t2}',this)">${{color:'Farge',gradient:'Gradient',image:'Bilde',video:'Video',music:'🎵 Musikk'}[t2]}</button>`).join('')}
          </div>
          <div id="bg-color-opt" class="${t.bgType !== 'color' ? 'hidden' : ''}">
            ${colorInput('Bakgrunnsfarge','ed-bg2', t.bgColor)}
          </div>
          <div id="bg-gradient-opt" class="${t.bgType !== 'gradient' ? 'hidden' : ''}">
            <div class="form-group">
              <label class="form-label">CSS Gradient</label>
              <input class="form-input" id="ed-gradient" value="${t.bgGradient || 'linear-gradient(135deg,#7c3aed,#2563eb)'}">
            </div>
          </div>
          <div id="bg-image-opt" class="${t.bgType !== 'image' ? 'hidden' : ''}">
            <div class="upload-zone" onclick="document.getElementById('bg-image-file').click()">
              <div class="upload-icon">${Icon('image')}</div>
              <div>Klikk for å laste opp bakgrunnsbilde</div>
            </div>
            <input type="file" id="bg-image-file" accept="image/*" style="display:none" onchange="Profile.uploadBgImage(this)">
            ${t.bgImage ? `<img src="${t.bgImage}" style="width:100%;height:80px;object-fit:cover;border-radius:8px;margin-top:0.5rem" id="bg-preview">` : '<div id="bg-preview"></div>'}
            <button class="paint-open-btn" id="open-paint-btn" onclick="Profile.openImagePaintEditor()" ${!t.bgImage ? 'style="display:none"' : ''}>${Icon('palette')} Åpne i bilderedigerer</button>
          </div>
          <div id="bg-video-opt" class="${t.bgType !== 'video' ? 'hidden' : ''}">
            <div class="upload-zone" onclick="document.getElementById('bg-video-file').click()">
              <div class="upload-icon">${Icon('film')}</div>
              <div>Klikk for å laste opp bakgrunnsvideo</div>
            </div>
            <input type="file" id="bg-video-file" accept="video/*" style="display:none" onchange="Profile.uploadBgVideo(this)">
          </div>
          <div id="bg-music-opt" class="${t.bgType !== 'music' ? 'hidden' : ''}">
            <div style="font-size:0.8rem;color:var(--text2);margin-bottom:0.5rem">Velg en av dine opplastede sanger som animert bakgrunn</div>
            ${userTracks.length
              ? `<select class="form-input" id="ed-bg-music-track">
                   <option value="">— Automatisk (første sang) —</option>
                   ${userTracks.map(id => `<option value="${id}" ${t.bgMusicTrackId === id ? 'selected' : ''}>${id}</option>`).join('')}
                 </select>`
              : `<div style="color:var(--text3);font-size:0.82rem;padding:0.5rem 0">Last opp musikk i Musikk-fanen for å bruke dette.</div>`}
            <div style="font-size:0.75rem;color:var(--text3);margin-top:0.5rem">Besøkende ser en psykedelisk lydbølge-animasjon i heltbildet ditt</div>
          </div>
        </div>

        <!-- Image filters -->
        <div class="editor-section" id="img-filter-section">
          <div class="editor-section-title">Bildejusteringer</div>
          <div class="image-filter-row">
            ${filterSlider('Lysstyrke', 'f-brightness', t.bgImageFilters?.brightness ?? 100, 0, 200)}
            ${filterSlider('Kontrast',  'f-contrast',   t.bgImageFilters?.contrast  ?? 100, 0, 200)}
            ${filterSlider('Metning',   'f-saturation', t.bgImageFilters?.saturation ?? 100, 0, 200)}
            ${filterSlider('Fargetone', 'f-hue',        t.bgImageFilters?.hue        ?? 0, 0, 360)}
            ${filterSlider('Svart/Hvitt','f-grayscale', t.bgImageFilters?.grayscale  ?? 0, 0, 100)}
          </div>
          <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:0.5rem">
            <button class="paint-open-btn" style="width:auto;padding:4px 10px;font-size:0.75rem" onclick="document.getElementById('f-grayscale').value=100;document.getElementById('f-grayscale-val').textContent=100;document.getElementById('f-saturation').value=0;document.getElementById('f-saturation-val').textContent=0;Profile.livePreview()">${Icon('square')} Svart/Hvitt</button>
            <button class="paint-open-btn" style="width:auto;padding:4px 10px;font-size:0.75rem;background:#6d28d9" onclick="document.getElementById('f-brightness').value=100;document.getElementById('f-brightness-val').textContent=100;document.getElementById('f-contrast').value=100;document.getElementById('f-contrast-val').textContent=100;document.getElementById('f-saturation').value=100;document.getElementById('f-saturation-val').textContent=100;document.getElementById('f-hue').value=0;document.getElementById('f-hue-val').textContent=0;document.getElementById('f-grayscale').value=0;document.getElementById('f-grayscale-val').textContent=0;Profile.livePreview()">${Icon('rotate-ccw')} Tilbakestill</button>
          </div>
        </div>

        <!-- Font & Layout -->
        <div class="editor-section">
          <div class="editor-section-title">Typografi & Layout</div>
          <div class="form-group">
            <label class="form-label">Font</label>
            <select class="form-input font-select" id="ed-font">
              ${fonts.map(f => `<option ${t.fontFamily === f ? 'selected' : ''}>${f}</option>`).join('')}
            </select>
          </div>
          <div class="editor-section-title">Layout</div>
          <div class="layout-grid">
            ${layoutOption('default', 'Standard', '▤', t.layout)}
            ${layoutOption('centered', 'Sentrert', '▥', t.layout)}
            ${layoutOption('sidebar', 'Sidepanel', '▧', t.layout)}
          </div>
          <div class="editor-section-title" style="margin-top:1rem">Kortstil</div>
          <div class="bg-type-row">
            ${['glass','solid','outline'].map(s => `<button class="bg-type-btn ${t.cardStyle===s?'active':''}" onclick="setCardStyle('${s}',this)">${{glass:'Glass',solid:'Solid',outline:'Kontur'}[s]}</button>`).join('')}
          </div>
        </div>
      </div>
    `;
  }

  function mediaUploadHtml() {
    return `
      <div class="upload-zone" id="media-dropzone" onclick="document.getElementById('media-file-input').click()">
        <div class="upload-icon">${Icon('camera')}</div>
        <div style="font-weight:600;margin-bottom:0.25rem">Klikk eller dra for å laste opp</div>
        <div style="font-size:0.8rem;color:var(--text3)">Bilder og videoer fra fester &amp; events</div>
      </div>
      <input type="file" id="media-file-input" accept="image/*,video/*" multiple style="display:none" onchange="Profile.uploadMedia(this.files)">
      <div style="display:flex;gap:0.5rem;margin-top:0.75rem">
        <input class="form-input" id="media-url-input" placeholder="… eller lim inn en YouTube-lenke" style="flex:1" onkeydown="if(event.key==='Enter'){event.preventDefault();Profile.addMediaLink();}">
        <button class="btn btn-secondary btn-sm" onclick="Profile.addMediaLink()">${Icon('plus')} Legg til</button>
      </div>
      <button class="btn btn-ghost btn-sm" style="margin-top:0.75rem;width:100%" onclick="VideoEditor.open()">${Icon('film')} 🎬 Bytt lyd på en video (sett din egen sang/mix)</button>
      <div id="media-upload-list" style="margin-top:1rem"></div>
      <div id="editor-media-grid" style="margin-top:1rem"></div>
    `;
  }

  function musicUploadHtml() {
    return `
      <div class="upload-zone" onclick="document.getElementById('music-file-input').click()">
        <div class="upload-icon">${Icon('music')}</div>
        <div style="font-weight:600;margin-bottom:0.25rem">Last opp musikk</div>
        <div style="font-size:0.8rem;color:var(--text3)">MP3, WAV, AAC, FLAC støttes</div>
      </div>
      <input type="file" id="music-file-input" accept="audio/*" multiple style="display:none" onchange="Profile.uploadMusic(this.files)">
      <div id="music-upload-list" style="margin-top:1rem"></div>
      <div id="editor-music-list" style="margin-top:1rem"></div>
      <div id="editor-purchases" style="margin-top:1.5rem"></div>
    `;
  }

  async function loadMyPurchases(user) {
    const el = document.getElementById('editor-purchases');
    if (!el || typeof Marketplace === 'undefined' || !Marketplace.isConfigured()) return;
    const purchases = await Marketplace.myPurchases(user.username).catch(() => []);
    if (!purchases.length) { el.innerHTML = ''; return; }
    el.innerHTML = `
      <div class="profile-store-title">⬇ Mine kjøp</div>
      <div class="store-list">${purchases.map(p => `
        <div class="store-card">
          <div class="store-card-meta">
            <div class="store-card-title">${esc(p.title)}</div>
            <div class="store-card-sub">${esc(p.artist || '')}${p.seller ? ' · @' + esc(p.seller) : ''}</div>
          </div>
          <div class="store-card-right">
            <button class="btn btn-ghost btn-sm" onclick="Marketplace.download('${esc(p.productId)}')">⬇ Last ned</button>
          </div>
        </div>`).join('')}</div>`;
  }

  function avatarBannerHtml() {
    return `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem">
        <div>
          <div class="editor-section-title">Profilbilde (Avatar)</div>
          <div class="upload-zone" onclick="document.getElementById('avatar-input').click()">
            <div class="upload-icon">${Icon('user')}</div>
            <div>Last opp profilbilde</div>
          </div>
          <input type="file" id="avatar-input" accept="image/*" style="display:none" onchange="Profile.uploadAvatar(this)">
          <div id="avatar-preview" style="margin-top:0.75rem"></div>
        </div>
        <div>
          <div class="editor-section-title">Banner</div>
          <div class="upload-zone" onclick="document.getElementById('banner-input').click()">
            <div class="upload-icon">${Icon('image')}</div>
            <div>Last opp banner</div>
          </div>
          <input type="file" id="banner-input" accept="image/*" style="display:none" onchange="Profile.uploadBanner(this)">
          <div id="banner-preview" style="margin-top:0.75rem"></div>
        </div>
      </div>
    `;
  }

  // ── Small helpers ─────────────────────────────────────────────────────
  function colorInput(label, id, val) {
    return `<div class="color-item"><input type="color" id="${id}" value="${val || '#7c3aed'}" oninput="Profile.livePreview()"><span>${label}</span></div>`;
  }
  function filterSlider(label, id, val, min, max) {
    return `<div class="filter-item"><div class="filter-label"><span>${label}</span><span id="${id}-val">${val}</span></div><input type="range" id="${id}" min="${min}" max="${max}" value="${val}" oninput="document.getElementById('${id}-val').textContent=this.value;Profile.livePreview()"></div>`;
  }
  function layoutOption(val, label, icon, current) {
    return `<div class="layout-option ${current===val?'active':''}" onclick="setLayout('${val}',this)"><span>${icon}</span>${label}</div>`;
  }
  function chipHtml(l) {
    return `<span class="chip">${l.label || l.url}<button onclick="Profile.removeLink(this,'${l.url}')" title="Fjern">${Icon('x')}</button></span>`;
  }

  function bindEditorEvents(t) {
    // Link input
    const li = document.getElementById('link-input');
    if (li) li.addEventListener('keydown', e => {
      if (e.key === 'Enter' && li.value.trim()) {
        e.preventDefault();
        const url = li.value.trim();
        const label = url.replace(/^https?:\/\//, '').split('/')[0];
        const chip = document.createElement('span');
        chip.className = 'chip';
        chip.innerHTML = `${label}<button onclick="Profile.removeLink(this,'${url}')" title="Fjern">${Icon('x')}</button>`;
        chip.dataset.url = url;
        li.parentNode.insertBefore(chip, li);
        li.value = '';
        Profile.livePreview();
      }
    });

    // Background type switcher (called from inline onclick above via window fns)
    window.setBgType = (type, btn) => {
      document.querySelectorAll('.bg-type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      ['color','gradient','image','video','music'].forEach(t2 => {
        document.getElementById(`bg-${t2}-opt`)?.classList.toggle('hidden', t2 !== type);
      });
      Profile.livePreview();
    };

    window.setLayout = (layout, el) => {
      document.querySelectorAll('.layout-option').forEach(o => o.classList.remove('active'));
      el.classList.add('active');
      Profile.livePreview();
    };

    window.setCardStyle = (style, btn) => {
      document.querySelectorAll('.editor-panel .bg-type-row:last-of-type .bg-type-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    };

    window.switchEditorTab = (tab, btn) => {
      document.querySelectorAll('[id^="etab-"]').forEach(el => el.classList.add('hidden'));
      document.getElementById(`etab-${tab}`)?.classList.remove('hidden');
      document.querySelectorAll('.editor-panel-header .tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    };

    // Drag-drop on media zone
    const zone = document.getElementById('media-dropzone');
    if (zone) {
      zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
      zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
      zone.addEventListener('drop', e => {
        e.preventDefault();
        zone.classList.remove('dragover');
        Profile.uploadMedia(e.dataTransfer.files);
      });
    }

    // Drag-drop on mix zone
    const mixZone = document.getElementById('mix-dropzone');
    if (mixZone) {
      mixZone.addEventListener('dragover', e => { e.preventDefault(); mixZone.classList.add('dragover'); });
      mixZone.addEventListener('dragleave', () => mixZone.classList.remove('dragover'));
      mixZone.addEventListener('drop', e => {
        e.preventDefault();
        mixZone.classList.remove('dragover');
        Profile.uploadMix(e.dataTransfer.files);
      });
    }
  }

  async function loadEditorMedia(user) {
    if (window.Community) Community.subscribe();
    const grid = document.getElementById('editor-media-grid');
    if (!grid) return;
    const ids = user.mediaIds || [];
    if (!ids.length) { grid.innerHTML = '<p class="text-muted text-sm">Ingen medier ennå.</p>'; return; }
    const recs = await DB.getAllByIds('media', ids);
    grid.innerHTML = `<div class="media-grid">${recs.map(r => mediaCard(r, true)).join('')}</div>`;
    await Promise.all(recs.map(r => fillMediaContainer(r, document.getElementById(`media-${r.id}`))));
  }

  async function loadEditorMusic(user) {
    if (window.Community) Community.subscribe();
    const list = document.getElementById('editor-music-list');
    if (!list) return;
    const ids = user.musicIds || [];
    if (!ids.length) { list.innerHTML = '<p class="text-muted text-sm">Ingen musikk ennå.</p>'; return; }
    const recs = await DB.getAllByIds('music', ids);
    list.innerHTML = `<div class="music-list">${recs.map((r, i) => musicItem(r, i, user.username, true)).join('')}</div>`;
    loadMusicCoverArts(recs);
  }

  // ── Sang-kreditering & kjøpslenker ────────────────────────────────────
  async function openSongCreditsModal(trackId) {
    const current = Auth.current();
    if (!current) return;
    const rec = await DB.get('music', trackId);
    if (!rec) { App.toast('Fant ikke sporet', 'error'); return; }
    const c = rec.credits  || {};
    const b = rec.buyLinks || {};
    const box = document.getElementById('modal-box');
    if (!box) return;
    box.innerHTML = `
      <div class="modal-header">
        <h2>${Icon('edit')} Kreditering & kjøpslenker</h2>
        <button class="btn-icon" onclick="App.closeModal()">${Icon('x')}</button>
      </div>
      <div class="mix-edit-modal">
        <input type="hidden" id="sc-track-id" value="${esc(trackId)}">

        <div class="mix-edit-section-title">Spor</div>
        <div class="form-group">
          <label class="form-label">Tittel</label>
          <input class="form-input" id="sc-title" value="${esc(rec.name || rec.title || '')}" placeholder="Sangtittel">
        </div>

        <div class="mix-edit-section-title">Kreditering</div>
        <div class="form-group">
          <label class="form-label">Artistnavn</label>
          <input class="form-input" id="sc-artist" value="${esc(rec.artist || '')}" placeholder="Artistnavn">
        </div>
        <div class="form-group">
          <label class="form-label">Label (plateselskap)</label>
          <input class="form-input" id="sc-label" value="${esc(c.label || '')}" placeholder="Plateselskap">
        </div>
        <div class="form-group">
          <label class="form-label">Produsent</label>
          <input class="form-input" id="sc-producer" value="${esc(c.producer || '')}" placeholder="Produsent">
        </div>
        <div class="form-group">
          <label class="form-label">Mixing</label>
          <input class="form-input" id="sc-mixing" value="${esc(c.mixing || '')}" placeholder="Mixing-ingeniør">
        </div>
        <div class="form-group">
          <label class="form-label">Mastering</label>
          <input class="form-input" id="sc-mastering" value="${esc(c.mastering || '')}" placeholder="Mastering-ingeniør">
        </div>

        <div class="mix-edit-section-title">Kjøpslenker</div>
        <p style="font-size:0.75rem;color:var(--text3);margin:-0.25rem 0 0.5rem">Lim inn lenke til hovedsiden der sangen kan kjøpes/strømmes (valgfritt).</p>
        ${BUY_SERVICES.map(s => `
          <div class="form-group">
            <label class="form-label">${s.name}</label>
            <input class="form-input" id="sc-buy-${s.key}" value="${esc(b[s.key] || '')}" placeholder="https://… (valgfritt)">
          </div>`).join('')}

        <div class="mix-edit-section-title">Selg denne sangen</div>
        <div class="form-group">
          <label class="form-label">Omslagsbilde <span style="color:var(--text3);font-weight:400;font-size:0.8rem">(valgfritt)</span></label>
          <div class="upload-zone" style="padding:1rem" onclick="document.getElementById('sc-cover-input').click()">
            <div class="upload-icon">${Icon('image')}</div>
            <div style="font-size:0.82rem">Klikk for å laste opp omslag</div>
          </div>
          <input type="file" id="sc-cover-input" accept="image/*" style="display:none" onchange="Profile.uploadSaleCover('${esc(trackId)}', this.files)">
          <div id="sc-cover-preview" style="margin-top:0.5rem">${rec.coverUrl ? `<img src="${esc(rec.coverUrl)}" alt="" style="max-width:120px;max-height:120px;border-radius:8px;display:block">` : ''}</div>
        </div>
        <label style="display:flex;align-items:center;gap:0.5rem;font-size:0.85rem;margin-bottom:0.5rem">
          <input type="checkbox" id="sc-sale-free" ${rec.saleFree ? 'checked' : ''}
            onchange="document.getElementById('sc-price-wrap').style.display=this.checked?'none':'block'">
          Gratis nedlasting
        </label>
        <div class="form-group" id="sc-price-wrap" style="display:${rec.saleFree ? 'none' : 'block'}">
          <label class="form-label">Pris (NOK)</label>
          <input class="form-input" id="sc-price" type="number" min="0" step="1" value="${rec.salePriceNok || ''}" placeholder="f.eks. 49">
        </div>
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap">
          <button class="btn btn-gold btn-sm" onclick="Marketplace.listSongFromModal('${esc(trackId)}')">🛒 ${rec.forSale ? 'Oppdater i butikk' : 'Legg ut for salg'}</button>
          <button class="btn btn-ghost btn-sm" onclick="Marketplace.becomeSeller()">🏦 Bli selger (Stripe)</button>
        </div>
        <p style="font-size:0.72rem;color:var(--text3);margin-top:0.4rem">Betalt salg krever fullført Stripe-onboarding («Bli selger»). Gratis nedlasting krever det ikke. Lagre kreditering først.</p>

        <div style="display:flex;gap:0.75rem;margin-top:1.25rem">
          <button class="btn btn-primary" onclick="Profile.saveSongCredits()">${Icon('save')} Lagre</button>
          <button class="btn btn-ghost" onclick="App.closeModal()">Avbryt</button>
        </div>
      </div>`;
    App.openModal();
  }

  async function saveSongCredits() {
    const trackId = document.getElementById('sc-track-id')?.value;
    if (!trackId) return;
    const rec = await DB.get('music', trackId);
    if (!rec) { App.toast('Fant ikke sporet', 'error'); return; }
    const val = id => document.getElementById(id)?.value?.trim() || '';
    rec.name    = val('sc-title') || rec.name;
    rec.artist  = val('sc-artist');
    rec.credits = {
      label:     val('sc-label'),
      producer:  val('sc-producer'),
      mixing:    val('sc-mixing'),
      mastering: val('sc-mastering'),
    };
    const buyLinks = {};
    BUY_SERVICES.forEach(s => {
      const v = val(`sc-buy-${s.key}`);
      if (v) buyLinks[s.key] = v;
    });
    rec.buyLinks = buyLinks;
    await DB.put('music', rec);
    App.closeModal();
    App.toast('Kreditering lagret! 🎶', 'success');
    loadEditorMusic(Auth.current());
  }

  // ── DJ Mixes ──────────────────────────────────────────────────────────

  function mixesEditorHtml(user) {
    const isPro = user.subscription === 'pro';
    return `
      <div style="max-width:620px">
        ${!isPro ? `
        <div class="mix-sub-banner">
          <div class="mix-sub-banner-inner">
            <div>
              <div class="mix-sub-title">${Icon('sliders')} DJ Mix Opplasting</div>
              <div class="mix-sub-desc">Gratis: opptil 3 timer, offentlig synlighet · <strong>Pro:</strong> ingen tidsgrense + privat/offentlig</div>
            </div>
            <button class="btn btn-gold btn-sm" onclick="Profile.upgradeToPro()">${Icon('star')} Oppgrader til Pro</button>
          </div>
        </div>` : `
        <div class="mix-sub-banner mix-sub-banner--pro">
          <div class="mix-sub-banner-inner">
            <span class="mix-pro-badge">${Icon('star')} Pro</span>
            <span style="font-size:0.85rem;color:var(--text2)">Mixes uten tidsgrense · privat/offentlig · ubegrenset lagring</span>
          </div>
        </div>`}
        <div class="upload-zone" id="mix-dropzone" onclick="document.getElementById('mix-file-input').click()">
          <div class="upload-icon">${Icon('sliders')}</div>
          <div style="font-weight:600;margin-bottom:0.25rem">Last opp DJ Mix</div>
          <div style="font-size:0.8rem;color:var(--text3)">MP3, WAV, AAC, FLAC · 1 minutt – ${isPro ? '20' : '3'} timer per mix</div>
        </div>
        <input type="file" id="mix-file-input" accept="audio/*" style="display:none" onchange="Profile.uploadMix(this.files)">
        <div id="mix-upload-progress" style="margin-top:0.75rem"></div>
        <div id="editor-mixes-list" style="margin-top:1rem"></div>
      </div>`;
  }

  async function renderMixesSection(user, isOwner) {
    const el = document.getElementById('tab-mixes');
    if (!el) return;

    const allIds = user.mixIds || [];
    if (!allIds.length) {
      if (isOwner) {
        el.innerHTML = `<div class="empty-state" style="padding:2rem 0"><div class="empty-icon">${Icon('sliders')}</div><p>Last opp din første DJ mix i profileditoren</p><button class="btn btn-primary btn-sm mt-2" onclick="Router.go('/edit')">Last opp</button></div>`;
      } else {
        el.innerHTML = '';
      }
      return;
    }

    const current = Auth.current();
    const recs = await DB.getAllByIds('mixes', allIds);
    const visible = recs.filter(r => r.visibility === 'public' || isOwner);

    if (!visible.length) { el.innerHTML = ''; return; }

    const labels = user.labels || [];
    el.innerHTML = `
      <div class="profile-mixes-section">
        <div class="profile-mixes-title">${Icon('sliders')} DJ Mixes</div>
        <div class="mixes-list" id="mixes-view-list">
          ${visible.map(r => mixViewCard(r, isOwner, user.username, labels)).join('')}
        </div>
      </div>`;
    visible.forEach(r => { if (r.coverMediaId) loadMixCoverArt(r.id, r.coverMediaId); });
  }

  function mixViewCard(r, isOwner, username, labels = []) {
    const dur = r.duration ? formatDuration(r.duration) : '--:--';
    const isPrivate = r.visibility === 'private';
    const commentsKey = `pv_mix_comments_${r.id}`;
    const comments = JSON.parse(localStorage.getItem(commentsKey) || '[]');
    return `
      <div class="mix-card" id="mixcard-${r.id}">
        <div class="mix-card-body">
          <div class="mix-card-cover" id="mixcover-${r.id}">${Icon('sliders')}</div>
          <div class="mix-card-meta">
            <div class="mix-card-title">${r.title || r.name}</div>
            ${r.description ? `<div class="mix-card-desc">${r.description}</div>` : ''}
            <div class="mix-card-stats">
              <span>${dur}</span>
              ${isPrivate ? '<span class="mix-badge mix-badge--private">🔒 Privat</span>' : '<span class="mix-badge mix-badge--public">🌐 Offentlig</span>'}
            </div>
          </div>
          <div class="mix-card-actions">
            <button class="mix-play-btn" onclick="Profile.playMix('${r.id}','${(r.title||r.name).replace(/'/g,"\\'")}')">${Icon('play')} Spill</button>
            ${isOwner ? `
              <button class="btn btn-ghost btn-sm" onclick="Profile.openMixEditModal('${r.id}','${username}')">${Icon('edit')} Rediger</button>
              <button class="btn-icon" onclick="Profile.toggleMixVisibility('${r.id}','${username}')" title="${isPrivate ? 'Gjør offentlig' : 'Gjør privat'}">${isPrivate ? '🌐' : '🔒'}</button>
              <button class="btn-icon btn-danger" onclick="Profile.deleteMix('${r.id}','${username}')" title="Slett">${Icon('trash')}</button>` : ''}
          </div>
        </div>
        ${(r.tracklist && r.tracklist.length) ? mixTracklistHtml(r.tracklist, labels) : ''}
        <div class="mix-comments-section">
          <div class="mix-comments-title">${Icon('message')} Kommentarer (${comments.length})</div>
          <div class="mix-comments-list" id="mix-comments-${r.id}">
            ${comments.slice(-5).map(c => `
              <div class="mix-comment">
                <a class="mix-comment-author" href="#/u/${c.username}">@${c.username}</a>
                <span class="mix-comment-text">${c.text}</span>
                <span class="mix-comment-time">${timeAgo(c.ts)}</span>
              </div>`).join('')}
          </div>
          ${Auth.current() ? `
          <div class="mix-comment-form">
            <input class="mix-comment-input form-input" id="mix-ci-${r.id}" placeholder="Skriv en kommentar…" onkeydown="if(event.key==='Enter')Profile.addMixComment('${r.id}')">
            <button class="btn btn-primary btn-sm" onclick="Profile.addMixComment('${r.id}')">Send</button>
          </div>` : `<div style="font-size:0.78rem;color:var(--text3);margin-top:0.5rem"><a href="#/login" style="color:var(--accent)">Logg inn</a> for å kommentere</div>`}
        </div>
      </div>`;
  }

  function formatDuration(secs) {
    if (secs >= 3600) {
      const h = Math.floor(secs / 3600);
      const m = Math.floor((secs % 3600) / 60);
      return `${h}t ${String(m).padStart(2,'0')}m`;
    }
    return `${Math.floor(secs/60)}:${String(Math.floor(secs%60)).padStart(2,'0')}`;
  }

  function timeAgo(ts) {
    const diff = Date.now() - ts;
    if (diff < 60000)   return 'nå nettopp';
    if (diff < 3600000) return `${Math.floor(diff/60000)} min siden`;
    if (diff < 86400000) return `${Math.floor(diff/3600000)} t siden`;
    return new Date(ts).toLocaleDateString('no-NO');
  }

  function mixTracklistHtml(tracks, labels) {
    const rows = tracks.map((t, i) => {
      const label = labels.find(l => l.id === t.labelId);
      return `
        <div class="tl-row">
          <span class="tl-num">${i + 1}</span>
          ${t.artist ? `<span class="tl-artist">${t.artist}</span><span class="tl-sep">–</span>` : ''}
          <span class="tl-title">${t.title || 'Ukjent spor'}</span>
          ${label ? `<span class="tl-label-badge">${label.name}</span>` : ''}
          ${t.purchaseUrl ? `<a class="tl-buy-link" href="${t.purchaseUrl}" target="_blank" rel="noopener noreferrer">${Icon('cart')} Kjøp</a>` : ''}
        </div>`;
    }).join('');
    return `
      <div class="mix-tracklist-section">
        <details>
          <summary>▾ Sporing (${tracks.length} spor)</summary>
          <div class="mix-tracklist-list">${rows}</div>
        </details>
      </div>`;
  }

  async function loadMixCoverArt(mixId, coverMediaId) {
    if (!coverMediaId) return;
    const url = await DB.getBlobUrl('media', coverMediaId).catch(() => null);
    if (!url) return;
    const el = document.getElementById(`mixcover-${mixId}`);
    if (el) el.innerHTML = `<img src="${url}" class="mix-cover-img" alt="Cover">`;
  }

  async function openMixEditModal(mixId, username) {
    const current = Auth.current();
    if (!current || current.username !== username) return;
    const rec = await DB.get('mixes', mixId);
    if (!rec) return;
    const labels = current.labels || [];
    const tracklist = rec.tracklist || [];

    const labelOptions = labels.length
      ? `<option value="">— Velg plateselskap —</option>` + labels.map(l => `<option value="${l.id}">${l.name}</option>`).join('')
      : `<option value="">Ingen plateselskaper lagt til</option>`;

    const trackRows = tracklist.map((t, i) => {
      const label = labels.find(l => l.id === t.labelId);
      return `
        <div class="tl-editor-track-row" data-track-id="${t.id}">
          <span class="tl-editor-track-num">${i + 1}</span>
          <div class="tl-editor-track-info">
            <div class="name">${t.artist ? `${t.artist} – ` : ''}${t.title || 'Ukjent'}</div>
            <div class="sub">${label ? label.name : ''}${t.purchaseUrl ? ' · 🛒' : ''}</div>
          </div>
          <button class="btn-icon btn-danger btn-sm" onclick="Profile.removeTrackFromModal('${t.id}')">${Icon('trash')}</button>
        </div>`;
    }).join('');

    const box = document.getElementById('modal-box');
    box.innerHTML = `
      <div class="modal-header">
        <h2>${Icon('edit')} Rediger mix</h2>
        <button class="btn-icon" onclick="App.closeModal()">${Icon('x')}</button>
      </div>
      <div class="mix-edit-modal" id="mix-edit-modal-body">
        <input type="hidden" id="mxed-mix-id" value="${mixId}">
        <input type="hidden" id="mxed-username" value="${username}">

        <div class="mix-edit-section-title">Cover-bilde</div>
        <div style="display:flex;align-items:center;gap:1rem;margin-bottom:0.5rem">
          <div class="mix-cover-preview" id="mix-cover-preview" onclick="document.getElementById('mxed-cover-input').click()">
            ${rec.coverMediaId ? '<span style="font-size:0.7rem;opacity:0.5">Laster…</span>' : '📷'}
          </div>
          <div style="flex:1">
            <input type="file" id="mxed-cover-input" accept="image/*" style="display:none" onchange="Profile.uploadMixCover('${mixId}', this.files[0])">
            <button class="btn btn-ghost btn-sm" onclick="document.getElementById('mxed-cover-input').click()">Velg bilde</button>
            <div style="font-size:0.72rem;opacity:0.45;margin-top:0.3rem">Klikk på bildet eller knappen for å laste opp</div>
          </div>
        </div>

        <div class="mix-edit-section-title">Beskrivelse</div>
        <textarea class="form-input" id="mxed-desc" rows="2" placeholder="Beskriv mixen…" style="width:100%;resize:vertical">${rec.description || ''}</textarea>

        <div class="mix-edit-section-title">Tracklist</div>
        <div class="tl-editor-add-row">
          <input class="form-input" id="tled-title" placeholder="Sangtittel *" style="min-width:120px;flex:2">
          <input class="form-input" id="tled-artist" placeholder="Artist" style="min-width:100px;flex:2">
          <select class="form-input" id="tled-label" style="min-width:120px;flex:2">${labelOptions}</select>
          <input class="form-input" id="tled-url" placeholder="Kjøpslenke (URL)" style="min-width:130px;flex:3">
          <button class="btn btn-ghost btn-sm" title="Søk på Google" onclick="Profile.searchTrackOnGoogle()" style="flex-shrink:0">${Icon('search')}</button>
          <button class="btn btn-primary btn-sm" onclick="Profile.addTrackToModal()">+ Legg til</button>
        </div>
        <div id="tled-track-list">${trackRows || '<p style="font-size:0.8rem;opacity:0.45;margin:0">Ingen spor lagt til ennå.</p>'}</div>

        <div style="display:flex;gap:0.75rem;margin-top:1.25rem">
          <button class="btn btn-primary" onclick="Profile.saveMixEdits()">${Icon('save')} Lagre</button>
          <button class="btn btn-ghost" onclick="App.closeModal()">Avbryt</button>
        </div>
      </div>`;

    App.openModal();
    if (rec.coverMediaId) {
      DB.getBlobUrl('media', rec.coverMediaId).then(url => {
        if (!url) return;
        const prev = document.getElementById('mix-cover-preview');
        if (prev) prev.innerHTML = `<img src="${url}" class="mix-cover-img" alt="Cover">`;
      }).catch(() => {});
    }
  }

  async function uploadMixCover(mixId, file) {
    if (!file) return;
    const current = Auth.current();
    if (!current) return;
    const rec = await DB.get('mixes', mixId);
    if (!rec) return;
    const id = `mxcv_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    if (rec.coverMediaId) await DB.delete('media', rec.coverMediaId).catch(() => {});
    await DB.storeFile('media', id, file);
    rec.coverMediaId = id;
    await DB.put('mixes', rec);
    const url = await DB.getBlobUrl('media', id).catch(() => null);
    if (url) {
      const prev = document.getElementById('mix-cover-preview');
      if (prev) prev.innerHTML = `<img src="${url}" class="mix-cover-img" alt="Cover">`;
    }
    App.toast('Cover lastet opp! 🖼️', 'success');
  }

  function searchTrackOnGoogle() {
    const title  = document.getElementById('tled-title')?.value?.trim();
    const artist = document.getElementById('tled-artist')?.value?.trim();
    if (!title && !artist) { App.toast('Skriv inn sangtittel eller artist først', 'info'); return; }
    const q = encodeURIComponent([artist, title].filter(Boolean).join(' ') + ' buy');
    window.open('https://www.google.com/search?q=' + q, '_blank', 'noopener');
  }

  function addTrackToModal() {
    const titleEl  = document.getElementById('tled-title');
    const artistEl = document.getElementById('tled-artist');
    const labelEl  = document.getElementById('tled-label');
    const urlEl    = document.getElementById('tled-url');
    const title = titleEl?.value?.trim();
    if (!title) { App.toast('Sangtittel er påkrevd', 'error'); return; }
    const track = {
      id:          `tl_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      title,
      artist:      artistEl?.value?.trim() || '',
      labelId:     labelEl?.value || null,
      purchaseUrl: urlEl?.value?.trim() || '',
    };
    const listEl = document.getElementById('tled-track-list');
    if (listEl) {
      const current = Auth.current();
      const labels = current?.labels || [];
      const label = labels.find(l => l.id === track.labelId);
      const existingCount = listEl.querySelectorAll('.tl-editor-track-row').length;
      const emptyMsg = listEl.querySelector('p');
      if (emptyMsg) emptyMsg.remove();
      const row = document.createElement('div');
      row.className = 'tl-editor-track-row';
      row.dataset.trackId = track.id;
      row.dataset.track = JSON.stringify(track);
      row.innerHTML = `
        <span class="tl-editor-track-num">${existingCount + 1}</span>
        <div class="tl-editor-track-info">
          <div class="name">${track.artist ? `${track.artist} – ` : ''}${track.title}</div>
          <div class="sub">${label ? label.name : ''}${track.purchaseUrl ? ' · 🛒' : ''}</div>
        </div>
        <button class="btn-icon btn-danger btn-sm" onclick="Profile.removeTrackFromModal('${track.id}')">${Icon('trash')}</button>`;
      listEl.appendChild(row);
    }
    if (titleEl)  titleEl.value  = '';
    if (artistEl) artistEl.value = '';
    if (labelEl)  labelEl.value  = '';
    if (urlEl)    urlEl.value    = '';
  }

  function removeTrackFromModal(trackId) {
    const row = document.querySelector(`.tl-editor-track-row[data-track-id="${trackId}"]`);
    if (row) row.remove();
    const listEl = document.getElementById('tled-track-list');
    if (listEl && !listEl.querySelector('.tl-editor-track-row')) {
      listEl.innerHTML = '<p style="font-size:0.8rem;opacity:0.45;margin:0">Ingen spor lagt til ennå.</p>';
    }
    renumberTrackModal();
  }

  function renumberTrackModal() {
    const rows = document.querySelectorAll('#tled-track-list .tl-editor-track-row');
    rows.forEach((row, i) => {
      const num = row.querySelector('.tl-editor-track-num');
      if (num) num.textContent = i + 1;
    });
  }

  function collectMixTracklist() {
    const rows = document.querySelectorAll('#tled-track-list .tl-editor-track-row');
    const tracks = [];
    rows.forEach(row => {
      if (row.dataset.track) {
        tracks.push(JSON.parse(row.dataset.track));
      } else {
        tracks.push({
          id:          row.dataset.trackId,
          title:       row.querySelector('.name')?.textContent?.split(' – ').pop()?.trim() || '',
          artist:      '',
          labelId:     null,
          purchaseUrl: '',
        });
      }
    });
    return tracks;
  }

  async function saveMixEdits() {
    const mixId    = document.getElementById('mxed-mix-id')?.value;
    const username = document.getElementById('mxed-username')?.value;
    if (!mixId || !username) return;
    const current = Auth.current();
    if (!current || current.username !== username) return;
    const rec = await DB.get('mixes', mixId);
    if (!rec) return;
    rec.description = document.getElementById('mxed-desc')?.value?.trim() ?? rec.description;
    rec.tracklist   = collectMixTracklist();
    await DB.put('mixes', rec);
    App.closeModal();
    App.toast('Mix oppdatert! ✓', 'success');
    renderMixesSection(current, true);
    loadEditorMixes(current);
  }

  async function playMix(id, title) {
    const url = await DB.getBlobUrl('mixes', id);
    if (!url) { App.toast('Kunne ikke laste mix', 'error'); return; }
    Player.playExternal(url, title, 'DJ Mix');
  }

  async function toggleMixVisibility(id, username) {
    const current = Auth.current();
    if (!current || current.username !== username) return;
    if (current.subscription !== 'pro') {
      App.toast('Privat synlighet krever Pro-abonnement ⭐', 'error');
      return;
    }
    const rec = await DB.get('mixes', id);
    if (!rec) return;
    const newVis = rec.visibility === 'private' ? 'public' : 'private';
    rec.visibility = newVis;
    await DB.put('mixes', rec);
    App.toast(newVis === 'private' ? '🔒 Mix satt til privat' : '🌐 Mix satt til offentlig', 'success');
    renderMixesSection(current, true);
    loadEditorMixes(current);
  }

  // Per-track visibility (free for everyone — unlike mixes, which Pro-gate private).
  // 🌐 public = alle ser/hører den · 🔒 private = kun eier.
  async function toggleTrackVisibility(id, username) {
    const current = Auth.current();
    if (!current || current.username !== username) return;
    const rec = await DB.get('music', id);
    if (!rec) return;
    rec.visibility = rec.visibility === 'private' ? 'public' : 'private';
    await DB.put('music', rec);
    App.toast(rec.visibility === 'private' ? '🔒 Sang satt til privat (kun deg)' : '🌐 Sang gjort offentlig (alle)', 'success');
    renderMusicPlayer(current, true);
    loadEditorMusic(current);
  }

  async function deleteMix(id, username) {
    const current = Auth.current();
    if (!current || current.username !== username) return;
    const rec = await DB.get('mixes', id);
    if (rec?.coverMediaId) await DB.delete('media', rec.coverMediaId).catch(() => {});
    await DB.delete('mixes', id);
    current.mixIds = (current.mixIds || []).filter(x => x !== id);
    Auth.updateUser(current.username, { mixIds: current.mixIds });
    document.getElementById(`mixcard-${id}`)?.remove();
    App.toast('Mix slettet', 'info');
    loadEditorMixes(Auth.current());
  }

  function addMixComment(mixId) {
    const current = Auth.current();
    if (!current) { Router.go('/login'); return; }
    const input = document.getElementById(`mix-ci-${mixId}`);
    const text = input?.value?.trim();
    if (!text) return;
    const key = `pv_mix_comments_${mixId}`;
    const comments = JSON.parse(localStorage.getItem(key) || '[]');
    const comment = { username: current.username, displayName: current.displayName, text, ts: Date.now() };
    comments.push(comment);
    localStorage.setItem(key, JSON.stringify(comments));
    input.value = '';
    // Varsle eigaren av mixen (finn brukar som har mixId i mixIds).
    if (window.Notify && Auth.getUsers) {
      const owner = Object.values(Auth.getUsers()).find(u => (u.mixIds || []).includes(mixId));
      if (owner && owner.username !== current.username) {
        Notify.emit(owner.username, { type: 'comment', text: 'kommenterte på mixen din', link: `#/u/${owner.username}` });
      }
    }
    const listEl = document.getElementById(`mix-comments-${mixId}`);
    if (listEl) {
      const div = document.createElement('div');
      div.className = 'mix-comment';
      div.innerHTML = `<a class="mix-comment-author" href="#/u/${comment.username}">@${comment.username}</a><span class="mix-comment-text">${comment.text}</span><span class="mix-comment-time">nå nettopp</span>`;
      listEl.appendChild(div);
    }
    const titleEl = listEl?.closest('.mix-comments-section')?.querySelector('.mix-comments-title');
    if (titleEl) titleEl.textContent = `${Icon('message')} Kommentarer (${comments.length})`;
  }

  // ── Profile tab switching ─────────────────────────────────────────────
  function switchTab(tab) {
    document.querySelectorAll('.profile-tab-content').forEach(el =>
      el.classList.toggle('hidden', el.dataset.tab !== tab));
    document.querySelectorAll('#profile-tabs .tab-btn').forEach(btn =>
      btn.classList.toggle('active', btn.dataset.tab === tab));
    if (tab === 'vegg') {
      const u = typeof Auth !== 'undefined' ? Auth.current() : null;
      if (u && typeof App !== 'undefined') App.markWallSeen(u.username);
    }
    if (tab === 'innlegg' && window.Community) {
      const me = typeof Auth !== 'undefined' ? Auth.current() : null;
      Community.renderProfilePosts(_viewUser, !!(me && me.username === _viewUser));
    }
  }

  // ── Profile wall (gjestebok) — no Gun-basert via Social ────────────────
  // Kryss-brukar kommentarar + 👍/👎 + emoji (same kode som vegg-innlegga).
  // targetKey = 'profile:<username>'. Andre kan skrive på profilen din og du ser det.
  function renderWallTab(username, isOwner) {
    const el = document.getElementById('tab-wall');
    if (!el) return;
    if (!window.Social) { el.innerHTML = '<p class="text-muted text-sm">Lastar gjestebok…</p>'; return; }
    Social.setNotifyTarget('profile:' + username, username);
    el.innerHTML = `
      <div class="wall-wrap">
        ${Social.reactionBar('profile:' + username)}
        ${Social.commentsBlockHtml('profile:' + username)}
      </div>`;
  }

  async function loadEditorMixes(user) {
    const list = document.getElementById('editor-mixes-list');
    if (!list) return;
    const ids = user.mixIds || [];
    if (!ids.length) { list.innerHTML = '<p class="text-muted text-sm">Ingen mixes ennå.</p>'; return; }
    const recs = await DB.getAllByIds('mixes', ids);
    const isPro = user.subscription === 'pro';
    list.innerHTML = recs.map(r => `
      <div class="mix-editor-item" id="mixedit-${r.id}">
        <div class="mix-card-cover" id="mixcover-edit-${r.id}" style="width:36px;height:36px;font-size:1.1rem;border-radius:7px;flex-shrink:0">${Icon('sliders')}</div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:0.88rem">${r.title || r.name}</div>
          <div style="font-size:0.75rem;color:var(--text2)">${formatDuration(r.duration || 0)} · ${r.visibility === 'private' ? '🔒 Privat' : '🌐 Offentlig'}${(r.tracklist && r.tracklist.length) ? ` · ${r.tracklist.length} spor` : ''}</div>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="Profile.openMixEditModal('${r.id}','${user.username}')">${Icon('edit')}</button>
        ${isPro ? `<button class="btn btn-ghost btn-sm" onclick="Profile.toggleMixVisibility('${r.id}','${user.username}')">${r.visibility === 'private' ? '🌐' : '🔒'}</button>` : ''}
        <button class="btn-icon btn-danger" onclick="Profile.deleteMix('${r.id}','${user.username}')" title="Slett">${Icon('trash')}</button>
      </div>`).join('');
    recs.forEach(r => {
      if (r.coverMediaId) {
        DB.getBlobUrl('media', r.coverMediaId).then(url => {
          if (!url) return;
          const el = document.getElementById(`mixcover-edit-${r.id}`);
          if (el) el.innerHTML = `<img src="${url}" class="mix-cover-img" alt="">`;
        }).catch(() => {});
      }
    });
  }

  const FREE_MIX_MAX_SECONDS = 3 * 60 * 60; // gratis-kontoer: opptil 3 timer per mix

  async function uploadMix(files) {
    const current = Auth.current();
    if (!current) return;
    const isPro = current.subscription === 'pro';
    const progressEl = document.getElementById('mix-upload-progress');
    for (const file of files) {
      const id = `mix_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem;font-size:0.82rem';
      row.innerHTML = `<span class="spinner" style="width:16px;height:16px;border-width:2px"></span> ${file.name}`;
      if (progressEl) progressEl.appendChild(row);

      let duration = 0;
      try {
        const tempUrl = URL.createObjectURL(file);
        const a = new Audio(tempUrl);
        duration = await new Promise(res => { a.onloadedmetadata = () => res(a.duration); a.onerror = () => res(0); setTimeout(() => res(0), 8000); });
        URL.revokeObjectURL(tempUrl);
        if (duration > 0 && duration < 60) { App.toast(`${file.name}: mixen er kortere enn 1 minutt`, 'error'); row.remove(); continue; }
        if (!isPro && duration > FREE_MIX_MAX_SECONDS) {
          App.toast(`${file.name}: mixes over 3 timer krever Pro ⭐ — oppgrader i Shop`, 'error', 6000);
          row.remove(); continue;
        }
      } catch {}

      const titleRaw = file.name.replace(/\.[^.]+$/, '');
      await DB.storeFile('mixes', id, file, {
        title:       titleRaw,
        description: '',
        visibility:  'public',
        uploaderUsername: current.username,
        uploadedAt:  Date.now(),
        duration,
        coverMediaId: null,
        tracklist:    [],
      });
      current.mixIds = [...(current.mixIds || []), id];
      Auth.updateUser(current.username, { mixIds: current.mixIds });
      if (progressEl) { row.innerHTML = `${Icon('check-circle')} ${file.name}`; setTimeout(() => row.remove(), 2000); }
    }
    loadEditorMixes(Auth.current());
    App.toast('Mix lastet opp! 🎛️', 'success');
  }

  function upgradeToPro() {
    const current = Auth.current();
    if (!current) { Router.go('/login'); return; }
    const box = document.getElementById('modal-box');
    box.innerHTML = `
      <div class="modal-header">
        <h2>${Icon('star')} Oppgrader til Pro</h2>
        <button class="btn-icon" onclick="App.closeModal()">${Icon('x')}</button>
      </div>
      <div style="padding:1.5rem 0">
        <div class="mix-pro-feature-list">
          <div class="mix-pro-feature">${Icon('sliders')} Last opp mixes over 3 timer (ingen grense)</div>
          <div class="mix-pro-feature">${Icon('lock')} Privat/offentlig synlighet på mixes</div>
          <div class="mix-pro-feature">${Icon('star')} Pro-badge på profil</div>
        </div>
        <div class="mix-pro-price">149 kr / mnd</div>
        <p style="font-size:0.78rem;color:var(--text3);margin-bottom:1.25rem">
          Sikker betaling via Stripe. Avbryt når som helst.
        </p>
        <button class="btn btn-gold w-full" id="stripe-pay-btn" onclick="Profile.startStripeCheckout()">
          ${Icon('credit-card')} Betal med Stripe
        </button>
        <div id="stripe-pay-error" style="display:none;margin-top:0.75rem;font-size:0.82rem;color:var(--red)"></div>
        <a href="#/shop" class="shop-link-sm" style="text-align:center;width:100%;margin-top:0.85rem" onclick="App.closeModal()">
          Spar med 3, 6 eller 12 måneder i Shop →
        </a>
        <p style="font-size:0.72rem;color:var(--text3);margin-top:0.75rem;text-align:center">
          Du blir sendt til Stripe sin sikre betalingsside
        </p>
      </div>`;
    App.openModal();
  }

  async function startStripeCheckout() {
    const current = Auth.current();
    if (!current) return;
    const btn   = document.getElementById('stripe-pay-btn');
    const errEl = document.getElementById('stripe-pay-error');
    if (btn)   { btn.disabled = true; btn.textContent = '⏳ Forbereder betaling…'; }
    if (errEl) errEl.style.display = 'none';
    try {
      await Payment.startCheckout(current.username);
    } catch (err) {
      if (btn)   { btn.disabled = false; btn.innerHTML = '💳 Betal med Stripe'; }
      if (errEl) { errEl.textContent = err.message; errEl.style.display = 'block'; }
    }
  }

  function confirmUpgrade() {
    const current = Auth.current();
    if (!current) return;
    Auth.updateUser(current.username, { subscription: 'pro' });
    current.subscription = 'pro';
    App.closeModal();
    App.toast('⭐ Velkommen til Pro! Privat mixes er nå aktivert.', 'success');
    Profile.renderEditor();
  }

  // ── Upload handlers ───────────────────────────────────────────────────
  async function uploadMedia(files) {
    const current = Auth.current();
    if (!current) return;
    const listEl = document.getElementById('media-upload-list');
    // Big videos (party/event footage) go to shared Supabase storage when configured.
    const useCloud = (typeof SC_Storage !== 'undefined') && SC_Storage.isConfigured();
    for (const file of files) {
      const id = `m_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem;font-size:0.82rem';
      row.innerHTML = `<span class="spinner" style="width:16px;height:16px;border-width:2px"></span> ${file.name}`;
      if (listEl) listEl.appendChild(row);
      const meta = {
        kind: 'file', type: file.type, name: file.name,
        visibility: 'public', mediaUrl: null, storagePath: null,
        fileSize: file.size, createdAt: Date.now(),
      };
      let shared = false;
      if (useCloud) {
        try {
          const res = await SC_Storage.upload(file, { prefix: (file.type || '').startsWith('video/') ? 'video' : 'image' });
          meta.mediaUrl = res.url; meta.storagePath = res.path;
          await DB.put('media', { id, ...meta });   // metadata only — file lives in Supabase
          shared = true;
        } catch (e) {
          if (e && e.message !== 'not-configured') console.warn('Skylagring feilet, lagrer lokalt:', e.message);
        }
      }
      if (!shared) await DB.storeFile('media', id, file, meta);
      // Auto-del videoar til Community-veggen når dei er offentlege + delte (har URL).
      if (shared && (file.type || '').startsWith('video/') && meta.visibility === 'public'
          && window.Community && Community.autoShareOn()) {
        Community.shareMedia({ kind: 'video', name: file.name, url: meta.mediaUrl, sourceId: id, audience: 'public' });
      }
      current.mediaIds = [...(current.mediaIds || []), id];
      Auth.updateUser(current.username, { mediaIds: current.mediaIds });
      if (listEl) { row.innerHTML = `${Icon('check-circle')} ${file.name}${shared ? ' · 🌐 delt' : ''}`; setTimeout(() => row.remove(), 2500); }
    }
    loadEditorMedia(Auth.current());
    App.toast(useCloud ? 'Medier lastet opp og delt! 🌐' : 'Medier lastet opp (lokalt)!', 'success');
    if (window.Notify) Notify.notifyFriends(current, { type: 'upload', text: 'lastet opp nytt innhold', link: `#/u/${current.username}` });
  }

  // Add a YouTube (or other) video link as a visual — embedded, no file upload.
  async function addMediaLink() {
    const current = Auth.current();
    if (!current) return;
    const input = document.getElementById('media-url-input');
    const url = (input?.value || '').trim();
    if (!url) { App.toast('Lim inn en YouTube-lenke først', 'error'); return; }
    const ytId = parseYouTubeId(url);
    const id = `m_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const rec = ytId
      ? { id, kind: 'youtube', youtubeId: ytId, url, name: 'YouTube-video', type: 'youtube', visibility: 'public', createdAt: Date.now() }
      : { id, kind: 'link', url, name: url.replace(/^https?:\/\//, '').slice(0, 60), type: 'link', visibility: 'public', createdAt: Date.now() };
    await DB.put('media', rec);
    current.mediaIds = [...(current.mediaIds || []), id];
    Auth.updateUser(current.username, { mediaIds: current.mediaIds });
    // Auto-del URL-video/lenke til Community-veggen (alltid delbar — ingen filopplasting).
    if (window.Community && Community.autoShareOn()) {
      if (rec.kind === 'youtube') Community.shareMedia({ kind: 'youtube', name: 'YouTube-video', youtubeId: rec.youtubeId, sourceId: id, audience: 'public' });
      else Community.shareMedia({ kind: 'link', name: rec.name, url: rec.url, sourceId: id, audience: 'public' });
    }
    if (input) input.value = '';
    loadEditorMedia(Auth.current());
    App.toast(ytId ? '▶ YouTube-video lagt til!' : 'Lenke lagt til!', 'success');
  }

  // Per-media visibility (free for everyone). 🌐 public · 🔒 private.
  async function toggleMediaVisibility(id) {
    const current = Auth.current();
    if (!current) return;
    const rec = await DB.get('media', id);
    if (!rec) return;
    rec.visibility = rec.visibility === 'private' ? 'public' : 'private';
    await DB.put('media', rec);
    App.toast(rec.visibility === 'private' ? '🔒 Satt til privat (kun deg)' : '🌐 Gjort offentlig (alle)', 'success');
    loadEditorMedia(current);
  }

  async function uploadMusic(files) {
    const current = Auth.current();
    if (!current) return;
    const listEl = document.getElementById('music-upload-list');
    // When Supabase is configured, big files (up to ~60 min) go to shared cloud
    // storage so all users can hear them. Otherwise we fall back to local IndexedDB.
    const useCloud = (typeof SC_Storage !== 'undefined') && SC_Storage.isConfigured();
    for (const file of files) {
      const id = `mus_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem;font-size:0.82rem';
      row.innerHTML = `<span class="spinner" style="width:16px;height:16px;border-width:2px"></span> ${file.name}`;
      if (listEl) listEl.appendChild(row);
      // Try to get duration
      let duration = 0;
      try {
        const url = URL.createObjectURL(file);
        const a   = new Audio(url);
        duration  = await new Promise(r => { a.onloadedmetadata = () => r(a.duration); a.onerror = () => r(0); });
        URL.revokeObjectURL(url);
      } catch {}
      // Clean name
      const name = file.name.replace(/\.[^.]+$/, '');
      const meta = {
        name, artist: '', duration, coverMediaId: null,
        visibility: 'public',           // 🌐 alle ser den · 🔒 kun meg
        mime: file.type, fileSize: file.size, createdAt: Date.now(),
        audioUrl: null, storagePath: null,
      };
      // Upload to shared Supabase storage when configured; fall back to local IndexedDB.
      let shared = false;
      if (useCloud) {
        try {
          const res = await SC_Storage.upload(file, { prefix: 'audio' });
          meta.audioUrl = res.url; meta.storagePath = res.path;
          await DB.put('music', { id, ...meta });   // metadata only — the file lives in Supabase
          shared = true;
        } catch (e) {
          if (e && e.message !== 'not-configured') console.warn('Skylagring feilet, lagrer lokalt:', e.message);
        }
      }
      if (!shared) {
        await DB.storeFile('music', id, file, meta);   // local fallback (blob in IndexedDB)
      }
      // Auto-del til Community-veggen når fila er offentleg + delt (har URL alle kan høyre).
      if (shared && meta.visibility === 'public' && window.Community && Community.autoShareOn()) {
        Community.shareMedia({ kind: 'audio', name: meta.name, url: meta.audioUrl, sourceId: id, audience: 'public' });
      }
      current.musicIds = [...(current.musicIds || []), id];
      Auth.updateUser(current.username, { musicIds: current.musicIds });
      if (listEl) { row.innerHTML = `${Icon('check-circle')} ${file.name}${shared ? ' · 🌐 delt' : ''}`; setTimeout(() => row.remove(), 2500); }
    }
    loadEditorMusic(Auth.current());
    App.toast(useCloud ? 'Musikk lastet opp og delt! 🌐' : 'Musikk lastet opp (lokalt)!', 'success');
    if (window.Notify) Notify.notifyFriends(current, { type: 'upload', text: 'lastet opp ny musikk', link: `#/u/${current.username}` });
  }

  // Manuell deling til Community-veggen (toggle: del / fjern). Berre delbare URL-ar.
  async function shareTrackToCommunity(trackId, username) {
    const current = Auth.current();
    if (!current || !window.Community) return;
    if (Community.isShared(trackId)) { Community.unshareMedia(trackId); App.toast('Fjernet fra Community', 'info'); return; }
    const rec = await DB.get('music', trackId);
    if (!rec) return;
    if (!rec.audioUrl) { App.toast('Kan kun deles når fila ligg i skyen (offentleg). Last opp på nytt med skylagring på.', 'error'); return; }
    Community.shareMedia({ kind: 'audio', name: rec.name || rec.title || 'Spor', url: rec.audioUrl, sourceId: trackId, audience: 'public' });
    App.toast('Delt til Community! 📣', 'success');
  }

  async function shareMediaToCommunity(mediaId) {
    const current = Auth.current();
    if (!current || !window.Community) return;
    if (Community.isShared(mediaId)) { Community.unshareMedia(mediaId); App.toast('Fjernet fra Community', 'info'); return; }
    const rec = await DB.get('media', mediaId);
    if (!rec) return;
    let opts = null;
    if (rec.kind === 'youtube')                              opts = { kind: 'youtube', name: 'YouTube-video', youtubeId: rec.youtubeId, sourceId: mediaId };
    else if (rec.kind === 'link')                            opts = { kind: 'link', name: rec.name, url: rec.url, sourceId: mediaId };
    else if ((rec.type || '').startsWith('video/') && rec.mediaUrl) opts = { kind: 'video', name: rec.name, url: rec.mediaUrl, sourceId: mediaId };
    else if (rec.mediaUrl)                                   opts = { kind: 'blend', name: rec.name, url: rec.mediaUrl, sourceId: mediaId };
    if (!opts) { App.toast('Kan ikkje delast — fila er kun lagra lokalt', 'error'); return; }
    opts.audience = 'public';
    Community.shareMedia(opts);
    App.toast('Delt til Community! 📣', 'success');
  }

  async function uploadAvatar(input) {
    const file = input.files[0];
    if (!file) return;
    const current = Auth.current();
    const id = `av_${Date.now()}`;
    await DB.storeFile('media', id, file);
    Auth.updateUser(current.username, { avatarMediaId: id });
    const url = await DB.getBlobUrl('media', id);
    const prev = document.getElementById('avatar-preview');
    if (prev) prev.innerHTML = `<img src="${url}" style="width:80px;height:80px;border-radius:50%;object-fit:cover">`;
    App.toast('Profilbilde oppdatert!', 'success');
  }

  // Legg til / endre profilbilde direkte fra profilsiden (ikke editoren).
  async function setAvatarFromProfile(input, username) {
    const file = input.files[0];
    if (!file) return;
    const current = Auth.current();
    if (!current || current.username !== username) return;
    const user = Auth.getUser(username);
    // Rydd opp gammelt bilde så vi ikke samler foreldreløse blober.
    if (user && user.avatarMediaId) {
      DB.invalidateBlobCache('media', user.avatarMediaId);
      await DB.delete('media', user.avatarMediaId).catch(() => {});
    }
    const id = `av_${Date.now()}`;
    await DB.storeFile('media', id, file);
    Auth.updateUser(username, { avatarMediaId: id });
    App.toast('Profilbilde oppdatert!', 'success');
    renderView(username);
  }

  // Slett profilbildet — faller tilbake til initialer.
  async function deleteAvatar(username) {
    const current = Auth.current();
    if (!current || current.username !== username) return;
    const user = Auth.getUser(username);
    if (!user || !user.avatarMediaId) return;
    if (!confirm('Vil du slette profilbildet?')) return;
    DB.invalidateBlobCache('media', user.avatarMediaId);
    await DB.delete('media', user.avatarMediaId).catch(() => {});
    Auth.updateUser(username, { avatarMediaId: null });
    App.toast('Profilbilde slettet', 'success');
    renderView(username);
  }

  async function uploadBanner(input) {
    const file = input.files[0];
    if (!file) return;
    const current = Auth.current();
    const id = `bn_${Date.now()}`;
    await DB.storeFile('media', id, file);
    Auth.updateUser(current.username, { bannerMediaId: id });
    const url = await DB.getBlobUrl('media', id);
    const prev = document.getElementById('banner-preview');
    if (prev) prev.innerHTML = `<img src="${url}" style="width:100%;height:60px;object-fit:cover;border-radius:8px">`;
    App.toast('Banner oppdatert!', 'success');
  }

  async function uploadMusicCover(trackId, file) {
    if (!file) return;
    const current = Auth.current();
    if (!current) return;
    const rec = await DB.get('music', trackId);
    if (!rec) return;
    const id = `mcover_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    if (rec.coverMediaId) {
      DB.invalidateBlobCache('media', rec.coverMediaId);
      await DB.delete('media', rec.coverMediaId).catch(() => {});
    }
    await DB.storeFile('media', id, file);
    rec.coverMediaId = id;
    await DB.put('music', rec);
    const url = await DB.getBlobUrl('media', id).catch(() => null);
    if (url) {
      const el = document.getElementById(`mthumb-${trackId}`);
      if (el) {
        // Sett som bakgrunn så play-knapp-overlegget blir liggende oppå coveret.
        el.style.backgroundImage = `url("${String(url).replace(/"/g, '%22')}")`;
        el.style.backgroundSize = 'cover';
        el.style.backgroundPosition = 'center';
        el.classList.add('has-cover');
      }
    }
    App.toast('Cover oppdatert! 🖼️', 'success');
  }

  // Omslagsbilde for en sang lagt ut i butikken. Lagres som delbar URL (skylagring
  // når konfigurert, ellers nedskalert data-URL) slik at KJØPERE også ser omslaget.
  async function uploadSaleCover(trackId, files) {
    const file = files && files[0];
    if (!file || !/^image\//.test(file.type)) { App.toast('Velg en bildefil', 'error'); return; }
    const rec = await DB.get('music', trackId);
    if (!rec) { App.toast('Fant ikke sporet', 'error'); return; }
    const preview = document.getElementById('sc-cover-preview');
    if (preview) preview.innerHTML = `<span class="spinner" style="width:16px;height:16px;border-width:2px"></span> Behandler omslag…`;
    try {
      const useCloud = (typeof SC_Storage !== 'undefined') && SC_Storage.isConfigured();
      let url;
      if (useCloud) {
        try { url = (await SC_Storage.upload(file, { prefix: 'cover' })).url; }
        catch (e) { url = await _imageToDataUrl(file); }
      } else {
        url = await _imageToDataUrl(file);
      }
      rec.coverUrl = url;
      await DB.put('music', rec);
      if (preview) preview.innerHTML = `<img src="${url}" alt="" style="max-width:120px;max-height:120px;border-radius:8px;display:block">`;
      App.toast('Omslag lagret! 🖼️', 'success');
    } catch (e) {
      if (preview) preview.innerHTML = '';
      App.toast('Omslag feilet: ' + e.message, 'error');
    }
  }

  // Les en bildefil, skaler ned og returner en kompakt JPEG data-URL.
  function _imageToDataUrl(file, maxDim = 800, quality = 0.8) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const s = maxDim / Math.max(width, height);
          width = Math.round(width * s); height = Math.round(height * s);
        }
        const c = document.createElement('canvas');
        c.width = width; c.height = height;
        c.getContext('2d').drawImage(img, 0, 0, width, height);
        try { resolve(c.toDataURL('image/jpeg', quality)); } catch (e) { reject(e); }
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Kunne ikke lese bildet')); };
      img.src = url;
    });
  }

  async function uploadBgImage(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      const b64 = e.target.result;
      const prev = document.getElementById('bg-preview');
      if (prev) prev.innerHTML = `<img src="${b64}" style="width:100%;height:80px;object-fit:cover;border-radius:8px;margin-top:0.5rem">`;
      window._pendingBgImage = b64;
      const btn = document.getElementById('open-paint-btn');
      if (btn) btn.style.display = '';
      Profile.livePreview();
    };
    reader.readAsDataURL(file);
  }

  async function uploadBgVideo(input) {
    const file = input.files[0];
    if (!file) return;
    const current = Auth.current();
    const id = `bgv_${Date.now()}`;
    App.toast('Laster opp bakgrunnsvideo…', 'info');
    await DB.storeFile('media', id, file);
    window._pendingBgVideoId = id;
    Auth.updateUser(current.username, { theme: { ...current.theme, bgVideoId: id } });
    App.toast('Bakgrunnsvideo lastet opp!', 'success');
  }

  // ── Collect & Save ────────────────────────────────────────────────────
  function collectLinks() {
    const chips = document.querySelectorAll('#links-wrap .chip');
    return Array.from(chips).map(c => ({ url: c.dataset.url || c.textContent.replace('✕','').trim(), label: c.firstChild?.textContent?.trim() || '' }));
  }

  function collectTheme() {
    const activeBgType = document.querySelector('.bg-type-btn.active')?.textContent?.toLowerCase().replace('🎵 ','');
    const bgTypeMap    = { farge:'color', gradient:'gradient', bilde:'image', video:'video', musikk:'music' };
    const bgType       = bgTypeMap[activeBgType] || Auth.current()?.theme?.bgType || 'gradient';

    const activeLayout   = document.querySelector('.layout-option.active')?.dataset?.layout || document.querySelector('.layout-option.active')?.onclick?.toString()?.match(/'(\w+)'/)?.[1] || 'default';
    const cardStyleBtn = document.querySelector('.editor-panel .bg-type-row:last-of-type .bg-type-btn.active');
    const activeCardStyle = { glass: 'glass', solid: 'solid', kontur: 'outline' }[cardStyleBtn?.textContent?.trim().toLowerCase()] || 'glass';

    return {
      primaryColor:   document.getElementById('ed-primary')?.value   || '#7c3aed',
      secondaryColor: document.getElementById('ed-secondary')?.value || '#2563eb',
      bgColor:        document.getElementById('ed-bg')?.value        || '#0f0f1a',
      textColor:      document.getElementById('ed-text')?.value      || '#ffffff',
      accentColor:    document.getElementById('ed-accent')?.value    || '#f59e0b',
      bgType,
      bgGradient:     document.getElementById('ed-gradient')?.value  || 'linear-gradient(135deg,#7c3aed,#2563eb)',
      bgImage:        window._pendingBgImage || Auth.current()?.theme?.bgImage || null,
      bgVideoId:      window._pendingBgVideoId || Auth.current()?.theme?.bgVideoId || null,
      bgMusicTrackId: document.getElementById('ed-bg-music-track')?.value || Auth.current()?.theme?.bgMusicTrackId || null,
      fontFamily:     document.getElementById('ed-font')?.value      || 'Inter',
      cardStyle:      activeCardStyle,
      layout:         activeLayout,
      bgImageFilters: {
        brightness: parseInt(document.getElementById('f-brightness')?.value || 100),
        contrast:   parseInt(document.getElementById('f-contrast')?.value   || 100),
        saturation: parseInt(document.getElementById('f-saturation')?.value || 100),
        hue:        parseInt(document.getElementById('f-hue')?.value        || 0),
        grayscale:  parseInt(document.getElementById('f-grayscale')?.value  || 0),
      },
    };
  }

  function selectEditorRole(value, labelEl) {
    document.querySelectorAll('#ed-role-selector .role-option-inner').forEach(el => el.classList.remove('active'));
    labelEl.querySelector('.role-option-inner').classList.add('active');
    labelEl.querySelector('input[type=radio]').checked = true;
  }

  function saveProfile() {
    const current = Auth.current();
    if (!current) return;
    const roleInput = document.querySelector('input[name="ed-role"]:checked');
    const data = {
      displayName: document.getElementById('ed-displayName')?.value?.trim() || current.displayName,
      bio:         document.getElementById('ed-bio')?.value?.trim()         || '',
      links:       collectLinks(),
      theme:       collectTheme(),
      role:        roleInput?.value || current.role || 'lytter',
    };
    Auth.updateUser(current.username, data);
    App.toast('Profil lagret! ✓', 'success');
    Object.assign(current, data);
  }

  // ── Live preview ──────────────────────────────────────────────────────
  function livePreview() {
    const wrap = document.getElementById('theme-preview');
    if (!wrap) return;
    const t = collectTheme();

    let bg = t.bgColor;
    if (t.bgType === 'gradient') bg = t.bgGradient;
    if (t.bgType === 'image' && t.bgImage) bg = `url(${t.bgImage}) center/cover`;

    wrap.style.background   = bg;
    wrap.style.color        = t.textColor;
    wrap.style.fontFamily   = `'${t.fontFamily}', sans-serif`;

    const av = document.getElementById('prev-avatar');
    if (av) { av.style.background = `linear-gradient(135deg,${t.primaryColor},${t.secondaryColor})`; av.style.color = '#fff'; }
    const nm = document.getElementById('prev-name');
    if (nm) { nm.style.fontFamily = `'${t.fontFamily}', sans-serif`; nm.style.color = t.textColor; nm.textContent = document.getElementById('ed-displayName')?.value || Auth.current()?.displayName || ''; }
    const bio = document.getElementById('prev-bio');
    if (bio) { bio.style.color = t.textColor + 'cc'; bio.textContent = document.getElementById('ed-bio')?.value || ''; }
  }

  // ── AI actions ────────────────────────────────────────────────────────
  async function aiBio() {
    const keywords = document.getElementById('ai-bio-keywords')?.value?.trim();
    if (!keywords) { App.toast('Skriv inn noen stikkord', 'error'); return; }
    const style   = document.getElementById('ai-bio-style')?.value || 'kreativ';
    const resultEl = document.getElementById('ai-result');
    if (!resultEl) return;
    resultEl.style.display = 'block';
    resultEl.innerHTML = '<div class="ai-loading"><div class="ai-dots"><span>•</span><span>•</span><span>•</span></div> AI tenker…</div>';
    try {
      const bio = await AI.generateBio(keywords, style);
      resultEl.innerHTML = `<strong>Foreslått bio:</strong><br>${bio}<br><button class="btn btn-primary btn-sm" style="margin-top:0.5rem" onclick="document.getElementById('ed-bio').value=\`${bio.replace(/`/g, "'")}\`;Profile.livePreview()">Bruk denne</button>`;
    } catch (e) {
      const msg = e.message === 'no_key' ? 'Legg til Claude API-nøkkel i Innstillinger' : e.message;
      resultEl.innerHTML = `<span style="color:var(--red)">${Icon('alert')} ${msg}</span>`;
    }
  }

  async function aiColors() {
    const mood    = document.getElementById('ai-color-mood')?.value?.trim();
    if (!mood) { App.toast('Beskriv en stemning', 'error'); return; }
    const resultEl = document.getElementById('ai-result');
    if (!resultEl) return;
    resultEl.style.display = 'block';
    resultEl.innerHTML = '<div class="ai-loading"><div class="ai-dots"><span>•</span><span>•</span><span>•</span></div> Genererer fargepalett…</div>';
    try {
      const colors = await AI.suggestColors(mood);
      if (!colors) throw new Error('Kunne ikke tolke AI-svaret');
      resultEl.innerHTML = `
        <strong>Foreslåtte farger:</strong>
        <div style="display:flex;gap:0.4rem;margin:0.5rem 0">
          ${Object.entries(colors).map(([k,v]) => `<div title="${k}: ${v}" style="width:32px;height:32px;border-radius:6px;background:${v};border:1px solid #fff3"></div>`).join('')}
        </div>
        <button class="btn btn-primary btn-sm" onclick="Profile.applyAiColors(${JSON.stringify(colors).replace(/"/g,'&quot;')})">Bruk disse fargene</button>`;
    } catch (e) {
      const msg = e.message === 'no_key' ? 'Legg til Claude API-nøkkel i Innstillinger' : e.message;
      resultEl.innerHTML = `<span style="color:var(--red)">${Icon('alert')} ${msg}</span>`;
    }
  }

  function applyAiColors(colors) {
    if (colors.primary)   { const el = document.getElementById('ed-primary');   if (el) el.value = colors.primary; }
    if (colors.secondary) { const el = document.getElementById('ed-secondary'); if (el) el.value = colors.secondary; }
    if (colors.bg)        { const el = document.getElementById('ed-bg');        if (el) el.value = colors.bg; }
    if (colors.text)      { const el = document.getElementById('ed-text');      if (el) el.value = colors.text; }
    if (colors.accent)    { const el = document.getElementById('ed-accent');    if (el) el.value = colors.accent; }
    livePreview();
    App.toast('Farger brukt!', 'success');
  }

  async function aiLayout() {
    const bio     = document.getElementById('ed-bio')?.value || Auth.current()?.bio || 'kreativ profil';
    const resultEl = document.getElementById('ai-result');
    if (!resultEl) return;
    resultEl.style.display = 'block';
    resultEl.innerHTML = '<div class="ai-loading"><div class="ai-dots"><span>•</span><span>•</span><span>•</span></div> Analyserer…</div>';
    try {
      const layout = await AI.suggestLayout(bio);
      if (!layout) throw new Error('Ingen forslag');
      resultEl.innerHTML = `<strong>AI foreslår:</strong><br>Layout: ${layout.layout}, Stil: ${layout.cardStyle}, Font: ${layout.fontFamily}
        <br><button class="btn btn-primary btn-sm" style="margin-top:0.5rem" onclick="Profile.applyAiLayout(${JSON.stringify(layout).replace(/"/g,'&quot;')})">Bruk dette</button>`;
    } catch (e) {
      const msg = e.message === 'no_key' ? 'Legg til Claude API-nøkkel i Innstillinger' : e.message;
      resultEl.innerHTML = `<span style="color:var(--red)">${Icon('alert')} ${msg}</span>`;
    }
  }

  function applyAiLayout(layout) {
    const fontEl = document.getElementById('ed-font');
    if (fontEl && layout.fontFamily) fontEl.value = layout.fontFamily;
    livePreview();
    App.toast('Layout brukt!', 'success');
  }

  // ── AI Chat ───────────────────────────────────────────────────────────
  function parseAiActions(text) {
    let displayText = text;
    const actions = {};

    const colorsMatch = text.match(/\[COLORS:(\{[^}]+\})\]/);
    if (colorsMatch) {
      try { actions.colors = JSON.parse(colorsMatch[1]); } catch {}
      displayText = displayText.replace(colorsMatch[0], '').trim();
    }

    const bioMatch = text.match(/\[BIO:([^\]]+)\]/);
    if (bioMatch) {
      actions.bio = bioMatch[1].trim();
      displayText = displayText.replace(bioMatch[0], '').trim();
    }

    const layoutMatch = text.match(/\[LAYOUT:(\{[^}]+\})\]/);
    if (layoutMatch) {
      try { actions.layout = JSON.parse(layoutMatch[1]); } catch {}
      displayText = displayText.replace(layoutMatch[0], '').trim();
    }

    return { displayText, actions };
  }

  async function sendAiChat() {
    const input = document.getElementById('ai-chat-input');
    const msg = input?.value?.trim();
    if (!msg) return;
    input.value = '';
    await sendAiChatMsg(msg);
  }

  async function sendAiChatMsg(msg) {
    if (!AI.hasKey()) {
      App.toast('Legg til Claude API-nøkkel i Innstillinger for å bruke AI', 'error');
      return;
    }

    const chatWindow = document.getElementById('ai-chat-window');
    const sendBtn    = document.getElementById('ai-chat-send');
    if (!chatWindow) return;

    _aiChatHistory.push({ role: 'user', content: msg });

    chatWindow.insertAdjacentHTML('beforeend',
      `<div class="ai-chat-bubble ai-chat-bubble--user">${msg.replace(/</g,'&lt;')}</div>`);

    const typingId = `ai-typing-${Date.now()}`;
    chatWindow.insertAdjacentHTML('beforeend',
      `<div class="ai-chat-bubble ai-chat-bubble--bot ai-typing" id="${typingId}"><span></span><span></span><span></span></div>`);
    chatWindow.scrollTop = chatWindow.scrollHeight;

    if (sendBtn) sendBtn.disabled = true;

    try {
      const current = Auth.current();
      const profileContext = {
        displayName: current?.displayName,
        bio:         current?.bio || '',
        roles:       current?.roles || [],
        links:       (current?.links || []).map(l => l.label || l.url),
        theme: {
          primaryColor:   document.getElementById('ed-primary')?.value   || current?.theme?.primaryColor,
          secondaryColor: document.getElementById('ed-secondary')?.value || current?.theme?.secondaryColor,
          bgColor:        document.getElementById('ed-bg')?.value        || current?.theme?.bgColor,
          fontFamily:     document.getElementById('ed-font')?.value      || current?.theme?.fontFamily,
        },
      };

      const reply = await AI.profileDesignChat(_aiChatHistory, profileContext);
      _aiChatHistory.push({ role: 'assistant', content: reply });

      document.getElementById(typingId)?.remove();
      const { displayText, actions } = parseAiActions(reply);

      let actionHtml = '';
      if (actions.colors) {
        const swatches = Object.values(actions.colors)
          .map(c => `<span style="display:inline-block;width:18px;height:18px;border-radius:4px;background:${c};border:1px solid rgba(255,255,255,0.25);flex-shrink:0"></span>`)
          .join('');
        const colorsJson = JSON.stringify(actions.colors).replace(/"/g, '&quot;');
        actionHtml += `<div class="ai-action-row"><div style="display:flex;gap:4px;align-items:center;flex-wrap:wrap">${swatches}</div><button class="btn btn-primary btn-sm" onclick="Profile.applyAiColors(JSON.parse(this.dataset.c))" data-c="${colorsJson}">Bruk farger</button></div>`;
      }
      if (actions.bio) {
        const safeBio = actions.bio.replace(/`/g, "'").replace(/"/g, '&quot;');
        actionHtml += `<div class="ai-action-row"><em class="ai-bio-preview">"${actions.bio.slice(0, 80)}${actions.bio.length > 80 ? '…' : ''}"</em><button class="btn btn-primary btn-sm" onclick="const b=document.getElementById('ed-bio');if(b){b.value=this.dataset.bio;Profile.livePreview()}" data-bio="${safeBio}">Bruk bio</button></div>`;
      }
      if (actions.layout) {
        const layoutJson = JSON.stringify(actions.layout).replace(/"/g, '&quot;');
        actionHtml += `<div class="ai-action-row"><span class="ai-layout-preview">${actions.layout.layout} · ${actions.layout.cardStyle} · ${actions.layout.fontFamily}</span><button class="btn btn-primary btn-sm" onclick="Profile.applyAiLayout(JSON.parse(this.dataset.l))" data-l="${layoutJson}">Bruk layout</button></div>`;
      }

      const safe = displayText.replace(/</g, '&lt;').replace(/\n/g, '<br>');
      chatWindow.insertAdjacentHTML('beforeend',
        `<div class="ai-chat-bubble ai-chat-bubble--bot">${safe}${actionHtml}</div>`);
    } catch (e) {
      document.getElementById(typingId)?.remove();
      const errMsg = e.message === 'no_key' ? 'Legg til Claude API-nøkkel i Innstillinger' : e.message;
      chatWindow.insertAdjacentHTML('beforeend',
        `<div class="ai-chat-bubble ai-chat-bubble--bot" style="color:var(--red,#f87171)">${Icon('alert')} ${errMsg.replace(/</g,'&lt;')}</div>`);
    }

    chatWindow.scrollTop = chatWindow.scrollHeight;
    if (sendBtn) sendBtn.disabled = false;
  }

  function removeLink(btn, url) {
    btn.parentElement.remove();
    livePreview();
  }

  function updateRoleLabel(role, checked) {
    const lbl = document.getElementById(`role-lbl-${role}`);
    if (lbl) lbl.style.borderColor = checked ? 'var(--accent)' : 'transparent';
  }

  function saveRoles() {
    // Legacy stub — role is now saved via saveProfile()
  }

  // ── Festival actions ──────────────────────────────────────────────────
  function toggleFestivalItem(label) {
    label.classList.toggle('selected', label.querySelector('input').checked);
  }

  function saveFestivals() {
    const current = Auth.current();
    if (!current) return;
    const checked = document.querySelectorAll('#festival-grid input[type=checkbox]:checked');
    const festivalIds = Array.from(checked).map(cb => cb.value);
    Auth.updateUser(current.username, { festivalIds });
    current.festivalIds = festivalIds;
    App.toast(`${festivalIds.length} festival${festivalIds.length !== 1 ? 'er' : ''} lagret! ${Icon('star')}`, 'success');
  }

  // ── Platform actions ──────────────────────────────────────────────────
  function togglePlatformItem(label) {
    label.classList.toggle('selected', label.querySelector('input').checked);
  }

  function savePlatforms() {
    const current = Auth.current();
    if (!current) return;
    const dawChecked = document.querySelectorAll('#daw-grid input[type=checkbox]:checked');
    const streamChecked = document.querySelectorAll('#streaming-grid input[type=checkbox]:checked');
    const daws = Array.from(dawChecked).map(cb => cb.value);
    const streamingPlatforms = Array.from(streamChecked).map(cb => cb.value);
    Auth.updateUser(current.username, { daws, streamingPlatforms });
    current.daws = daws;
    current.streamingPlatforms = streamingPlatforms;
    App.toast(`Plattformer lagret! ${Icon('laptop')}`, 'success');
  }

  // ── My Sites actions ──────────────────────────────────────────────────
  function addMySite() {
    const current = Auth.current();
    if (!current) return;
    const emoji = document.getElementById('ms-emoji')?.value?.trim() || '🔗';
    const title = document.getElementById('ms-title')?.value?.trim();
    const url   = document.getElementById('ms-url')?.value?.trim();
    const desc  = document.getElementById('ms-desc')?.value?.trim();
    if (!title) { App.toast('Tittel er påkrevd', 'error'); return; }
    if (!url || !url.startsWith('http')) { App.toast('URL må starte med http:// eller https://', 'error'); return; }
    const site = { id: `ms_${Date.now()}_${Math.random().toString(36).slice(2)}`, emoji, title, url, description: desc || '' };
    const mySites = [...(current.mySites || []), site];
    Auth.updateUser(current.username, { mySites });
    current.mySites = mySites;
    ['ms-title','ms-url','ms-desc'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    const emojiEl = document.getElementById('ms-emoji');
    if (emojiEl) emojiEl.value = '🔗';
    const list = document.getElementById('my-sites-list');
    if (list) {
      const empty = list.querySelector('p');
      if (empty) empty.remove();
      list.insertAdjacentHTML('beforeend', mySiteEditorItem(site));
    }
    App.toast(`"${title}" lagt til! ${Icon('globe')}`, 'success');
  }

  function deleteMySite(id) {
    const current = Auth.current();
    if (!current) return;
    const mySites = (current.mySites || []).filter(s => s.id !== id);
    Auth.updateUser(current.username, { mySites });
    current.mySites = mySites;
    document.getElementById(`msitem-${id}`)?.remove();
    const list = document.getElementById('my-sites-list');
    if (list && !list.querySelector('.my-site-editor-item')) {
      list.innerHTML = '<p style="font-size:0.82rem;color:var(--text2)">Ingen sider ennå.</p>';
    }
    App.toast('Side fjernet', 'info');
  }

  // ══════════════════════════════════════════════════════════════════════
  //  MIN SIDE — CUSTOM PAGE BUILDER
  // ══════════════════════════════════════════════════════════════════════

  const CP_BLOCKS = {
    hero:      { icon: '✦',  label: 'Hero Tittel',     defaultData: { title: 'Min Side', subtitle: '', animation: 'rainbow' } },
    text:      { icon: '📝', label: 'Tekst',            defaultData: { content: 'Skriv noe her...', align: 'left' } },
    quote:     { icon: '💬', label: 'Sitat',             defaultData: { text: 'Et inspirerende ord...', author: '', style: 'neon-purple' } },
    image:     { icon: '🖼️', label: 'Bilde (URL)',       defaultData: { url: '', caption: '', filter: 'psychedelic' } },
    links:     { icon: '🔗', label: 'Lenkeknapper',      defaultData: { buttons: [{ label: 'Besøk meg', url: 'https://', color: '#7c3aed' }] } },
    divider:   { icon: '〰️', label: 'Skillelinje',       defaultData: { style: 'plasma' } },
    countdown: { icon: '⏳', label: 'Nedtelling',        defaultData: { date: '', label: 'Til noe spennende' } },
    vibes:     { icon: '🌊', label: 'Vibes-seksjon',     defaultData: { style: 'aurora', text: '✦ good vibes only ✦' } },
    embed:     { icon: '▶️', label: 'YouTube / Spotify', defaultData: { url: '', type: 'youtube' } },
  };

  let _cpBlocks = [];
  let _cpDragId = null;
  let _aiChatHistory = [];

  function esc(s) {
    return (s || '').toString()
      .replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function customPageTabHtml(user) {
    return `
      <div class="cp-editor">
        <div class="cp-palette">
          <div class="cp-palette-title">Blokkbibliotek</div>
          <div class="cp-palette-grid">
            ${Object.entries(CP_BLOCKS).map(([type, def]) => `
              <div class="cp-palette-item" onclick="Profile.addBlock('${type}')">
                <span class="cp-palette-icon">${iconForEmoji(def.icon)}</span>
                <span>${def.label}</span>
              </div>`).join('')}
          </div>
          <div class="cp-palette-tip">${Icon('lightbulb')} Klikk for å legge til · Dra blokker for å flytte</div>
        </div>
        <div class="cp-canvas" id="cp-canvas"
             ondragover="event.preventDefault()" ondrop="Profile.cpDropCanvas(event)">
          ${_cpBlocks.length
            ? _cpBlocks.map((b, i) => cpBlockEditorHtml(b, i, _cpBlocks.length)).join('')
            : `<div class="cp-empty"><div class="cp-empty-icon">${Icon('wind')}</div><p>Klikk på en blokk til venstre for å begynne</p></div>`}
        </div>
      </div>
      <div style="display:flex;gap:0.75rem;margin-top:1rem">
        <button class="btn btn-primary" onclick="Profile.saveCustomPage()">${Icon('save')} Lagre Min Side</button>
        <a href="#/u/${user.username}" class="btn btn-ghost">${Icon('eye')} Se profil</a>
      </div>`;
  }

  function cpBlockEditorHtml(block, index, total) {
    const def = CP_BLOCKS[block.type] || { icon: '?', label: block.type };
    return `
      <div class="cp-block" id="cpb-${block.id}" draggable="true"
           ondragstart="Profile.cpDragStart(event,'${block.id}')"
           ondragover="Profile.cpDragOver(event,'${block.id}')"
           ondrop="Profile.cpDrop(event,'${block.id}')">
        <div class="cp-block-header" onclick="Profile.toggleBlock('${block.id}')">
          <span class="cp-block-drag">${Icon('grip')}</span>
          <span class="cp-block-icon">${iconForEmoji(def.icon)}</span>
          <span class="cp-block-title">${def.label}</span>
          <div class="cp-block-actions" onclick="event.stopPropagation()">
            ${index > 0 ? `<button class="cp-block-btn" onclick="Profile.moveBlock('${block.id}',-1)" title="Opp">${Icon('arrow-up')}</button>` : ''}
            ${index < total - 1 ? `<button class="cp-block-btn" onclick="Profile.moveBlock('${block.id}',1)" title="Ned">${Icon('arrow-down')}</button>` : ''}
            <button class="cp-block-btn del" onclick="Profile.deleteBlock('${block.id}')" title="Slett">${Icon('trash')}</button>
          </div>
        </div>
        <div class="cp-block-settings" id="cpbs-${block.id}">
          ${cpBlockSettingsHtml(block)}
        </div>
      </div>`;
  }

  function cpBlockSettingsHtml(block) {
    const d = block.data, bid = block.id;
    switch (block.type) {
      case 'hero':
        return `
          <div class="form-group"><label class="form-label">Tittel</label>
            <input class="form-input" value="${esc(d.title)}" oninput="Profile.updateBlock('${bid}','title',this.value)"></div>
          <div class="form-group"><label class="form-label">Undertittel</label>
            <input class="form-input" value="${esc(d.subtitle)}" oninput="Profile.updateBlock('${bid}','subtitle',this.value)"></div>
          <div class="form-group"><label class="form-label">Animasjon</label>
            <select class="form-input" onchange="Profile.updateBlock('${bid}','animation',this.value)">
              <option value="rainbow" ${d.animation==='rainbow'?'selected':''}>${Icon('rainbow')} Regnbue</option>
              <option value="glitch"  ${d.animation==='glitch' ?'selected':''}>${Icon('zap')} Glitch</option>
              <option value="pulse"   ${d.animation==='pulse'  ?'selected':''}>${Icon('heart')} Neon Puls</option>
              <option value="none"    ${d.animation==='none'   ?'selected':''}>Ingen</option>
            </select></div>`;
      case 'text':
        return `
          <div class="form-group"><label class="form-label">Innhold</label>
            <textarea class="form-input" rows="4" oninput="Profile.updateBlock('${bid}','content',this.value)">${esc(d.content)}</textarea></div>
          <div class="form-group"><label class="form-label">Justering</label>
            <select class="form-input" onchange="Profile.updateBlock('${bid}','align',this.value)">
              <option value="left"   ${d.align==='left'  ?'selected':''}>Venstre</option>
              <option value="center" ${d.align==='center'?'selected':''}>Senter</option>
              <option value="right"  ${d.align==='right' ?'selected':''}>Høyre</option>
            </select></div>`;
      case 'quote':
        return `
          <div class="form-group"><label class="form-label">Sitat</label>
            <textarea class="form-input" rows="3" oninput="Profile.updateBlock('${bid}','text',this.value)">${esc(d.text)}</textarea></div>
          <div class="form-group"><label class="form-label">Forfatter (valgfri)</label>
            <input class="form-input" value="${esc(d.author)}" oninput="Profile.updateBlock('${bid}','author',this.value)"></div>
          <div class="form-group"><label class="form-label">Stil</label>
            <select class="form-input" onchange="Profile.updateBlock('${bid}','style',this.value)">
              <option value="neon-purple" ${d.style==='neon-purple'?'selected':''}>${Icon('heart')} Neon Lilla</option>
              <option value="neon-cyan"   ${d.style==='neon-cyan'  ?'selected':''}>${Icon('heart')} Neon Cyan</option>
              <option value="neon-gold"   ${d.style==='neon-gold'  ?'selected':''}>${Icon('heart')} Neon Gull</option>
            </select></div>`;
      case 'image':
        return `
          <div class="form-group"><label class="form-label">Bilde-URL</label>
            <input class="form-input" placeholder="https://..." value="${esc(d.url)}"
              oninput="Profile.updateBlock('${bid}','url',this.value)"></div>
          <div class="form-group"><label class="form-label">Bildetekst (valgfri)</label>
            <input class="form-input" value="${esc(d.caption)}"
              oninput="Profile.updateBlock('${bid}','caption',this.value)"></div>
          <div class="form-group"><label class="form-label">Filter</label>
            <select class="form-input" onchange="Profile.updateBlock('${bid}','filter',this.value)">
              <option value="psychedelic" ${d.filter==='psychedelic'?'selected':''}>${Icon('wind')} Psykedelisk</option>
              <option value="vhs"  ${d.filter==='vhs' ?'selected':''}>${Icon('tv')} VHS Glitch</option>
              <option value="none" ${d.filter==='none'?'selected':''}>Ingen</option>
            </select></div>`;
      case 'links': {
        const btns = d.buttons || [];
        return `
          <div id="cp-${bid}-buttons">
            ${btns.map((btn, i) => `
              <div style="display:flex;gap:0.4rem;margin-bottom:0.4rem;align-items:center">
                <input class="form-input" placeholder="Tekst" value="${esc(btn.label)}" style="flex:1"
                  oninput="Profile.updateLinkBtn('${bid}',${i},'label',this.value)">
                <input class="form-input" placeholder="https://..." value="${esc(btn.url)}" style="flex:2"
                  oninput="Profile.updateLinkBtn('${bid}',${i},'url',this.value)">
                <input type="color" value="${btn.color||'#7c3aed'}"
                  style="width:36px;height:36px;border:none;background:none;cursor:pointer;flex-shrink:0"
                  oninput="Profile.updateLinkBtn('${bid}',${i},'color',this.value)">
                <button class="cp-block-btn del" onclick="Profile.removeLinkBtn('${bid}',${i})">${Icon('x')}</button>
              </div>`).join('')}
          </div>
          <button class="btn btn-ghost btn-sm" style="margin-top:0.25rem"
            onclick="Profile.addLinkBtn('${bid}')">+ Legg til knapp</button>`;
      }
      case 'divider':
        return `
          <div class="form-group"><label class="form-label">Stil</label>
            <select class="form-input" onchange="Profile.updateBlock('${bid}','style',this.value)">
              <option value="plasma" ${d.style==='plasma'?'selected':''}>${Icon('zap')} Plasma</option>
              <option value="wave"   ${d.style==='wave'  ?'selected':''}>${Icon('waves')} Bølge</option>
              <option value="stars"  ${d.style==='stars' ?'selected':''}>${Icon('sparkles')} Stjerner</option>
            </select></div>`;
      case 'countdown':
        return `
          <div class="form-group"><label class="form-label">Dato</label>
            <input class="form-input" type="date" value="${esc(d.date)}"
              onchange="Profile.updateBlock('${bid}','date',this.value)"></div>
          <div class="form-group"><label class="form-label">Ledetekst</label>
            <input class="form-input" value="${esc(d.label)}"
              oninput="Profile.updateBlock('${bid}','label',this.value)"></div>`;
      case 'vibes':
        return `
          <div class="form-group"><label class="form-label">Tekst (valgfri)</label>
            <input class="form-input" value="${esc(d.text)}" placeholder="good vibes only"
              oninput="Profile.updateBlock('${bid}','text',this.value)"></div>
          <div class="form-group"><label class="form-label">Stil</label>
            <select class="form-input" onchange="Profile.updateBlock('${bid}','style',this.value)">
              <option value="aurora"  ${d.style==='aurora' ?'selected':''}>${Icon('sparkles')} Aurora</option>
              <option value="lava"    ${d.style==='lava'   ?'selected':''}>${Icon('mountain')} Lava</option>
              <option value="galaxy"  ${d.style==='galaxy' ?'selected':''}>${Icon('sparkles')} Galakse</option>
            </select></div>`;
      case 'embed':
        return `
          <div class="form-group"><label class="form-label">Type</label>
            <select class="form-input" onchange="Profile.updateBlock('${bid}','type',this.value)">
              <option value="youtube" ${d.type==='youtube'?'selected':''}>${Icon('play')} YouTube</option>
              <option value="spotify" ${d.type==='spotify'?'selected':''}>${Icon('music')} Spotify</option>
            </select></div>
          <div class="form-group"><label class="form-label">URL</label>
            <input class="form-input" value="${esc(d.url)}"
              placeholder="${d.type==='spotify'?'https://open.spotify.com/...':'https://youtube.com/watch?v=...'}"
              oninput="Profile.updateBlock('${bid}','url',this.value)">
            <div style="font-size:0.72rem;color:var(--text3);margin-top:0.2rem">
              Lim inn lenke fra ${d.type==='spotify'?'Spotify':'YouTube'}
            </div></div>`;
      default:
        return '<p style="color:var(--text3);font-size:0.82rem">Ukjent blokktype</p>';
    }
  }

  // ── Rendered profile view ────────────────────────────────────────────
  function buildCustomPageHtml(blocks) {
    if (!blocks?.length) return { html: '', countdowns: [] };
    const countdowns = [];
    const parts = blocks.map(b => {
      if (b.type === 'countdown' && b.data.date) countdowns.push({ id: `cd-${b.id}`, date: b.data.date });
      const inner = renderCpBlock(b);
      return inner ? `<div class="cp-rendered-block">${inner}</div>` : '';
    });
    return {
      html: `<div class="custom-page-section">
        <div class="cp-page-divider"><span>${Icon('sparkles')} Min Side ${Icon('sparkles')}</span></div>
        ${parts.join('')}
      </div>`,
      countdowns,
    };
  }

  function renderCpBlock(block) {
    const d = block.data;
    switch (block.type) {
      case 'hero':
        return `<div class="cp-hero">
          <div class="cp-hero-title" data-anim="${d.animation||'rainbow'}">${esc(d.title)}</div>
          ${d.subtitle ? `<div class="cp-hero-subtitle">${esc(d.subtitle)}</div>` : ''}
        </div>`;
      case 'text':
        return `<div class="cp-text" style="text-align:${d.align||'left'}">${esc(d.content||'').replace(/\n/g,'<br>')}</div>`;
      case 'quote':
        return `<div class="cp-quote" data-style="${d.style||'neon-purple'}">
          <div class="cp-quote-text">"${esc(d.text)}"</div>
          ${d.author ? `<div class="cp-quote-author">— ${esc(d.author)}</div>` : ''}
        </div>`;
      case 'image':
        if (!d.url) return '';
        return `<div class="cp-image-wrap" data-filter="${d.filter||'none'}">
          <img src="${esc(d.url)}" alt="${esc(d.caption)}">
          ${d.caption ? `<div class="cp-image-caption">${esc(d.caption)}</div>` : ''}
        </div>`;
      case 'links':
        if (!d.buttons?.length) return '';
        return `<div class="cp-links">
          ${d.buttons.map(btn => `<a class="cp-link-btn" href="${esc(btn.url)}"
            target="_blank" rel="noopener noreferrer"
            style="background:${btn.color||'#7c3aed'}">${esc(btn.label)}</a>`).join('')}
        </div>`;
      case 'divider':
        return d.style === 'stars'
          ? `<div class="cp-divider" data-style="stars">${Icon('sparkles')} &nbsp; ${Icon('sparkles')} &nbsp; ${Icon('sparkles')} &nbsp; ${Icon('sparkles')} &nbsp; ${Icon('sparkles')}</div>`
          : `<div class="cp-divider" data-style="${d.style||'plasma'}"></div>`;
      case 'countdown': {
        if (!d.date) return '';
        const cdId = `cd-${block.id}`;
        return `<div class="cp-countdown">
          <div class="cp-countdown-label">${esc(d.label||'Nedtelling')}</div>
          <div class="cp-countdown-units" id="${cdId}">
            <div class="cp-countdown-unit"><div class="cp-countdown-val" id="${cdId}-d">--</div><div class="cp-countdown-unit-label">Dager</div></div>
            <div class="cp-countdown-unit"><div class="cp-countdown-val" id="${cdId}-h">--</div><div class="cp-countdown-unit-label">Timer</div></div>
            <div class="cp-countdown-unit"><div class="cp-countdown-val" id="${cdId}-m">--</div><div class="cp-countdown-unit-label">Min</div></div>
            <div class="cp-countdown-unit"><div class="cp-countdown-val" id="${cdId}-s">--</div><div class="cp-countdown-unit-label">Sek</div></div>
          </div>
        </div>`;
      }
      case 'vibes':
        return `<div class="cp-vibes" data-style="${d.style||'aurora'}">
          ${d.text ? `<div class="cp-vibes-text">${esc(d.text)}</div>` : ''}
        </div>`;
      case 'embed': {
        if (!d.url) return '';
        const src = cpEmbedUrl(d.url, d.type);
        if (!src) return '';
        return `<div class="cp-embed">
          <iframe src="${src}" height="${d.type==='spotify'?152:315}"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy" allowfullscreen></iframe>
        </div>`;
      }
      default: return '';
    }
  }

  function cpEmbedUrl(url, type) {
    try {
      const u = new URL(url);
      if (type === 'youtube') {
        const v = u.searchParams.get('v') || url.match(/youtu\.be\/([^?&]+)/)?.[1];
        if (v && /^[\w-]+$/.test(v)) return `https://www.youtube.com/embed/${v}`;
      }
      if (type === 'spotify') {
        const m = url.match(/open\.spotify\.com\/(track|album|playlist|episode)\/([A-Za-z0-9]+)/);
        if (m) return `https://open.spotify.com/embed/${m[1]}/${m[2]}`;
      }
    } catch {}
    return null;
  }

  function startCountdown(id, dateStr) {
    const tick = () => {
      const el = document.getElementById(id);
      if (!el) return;
      const diff = new Date(dateStr).getTime() - Date.now();
      if (diff <= 0) {
        el.innerHTML = `<div style="color:#f59e0b;font-weight:700;font-size:1.1rem">${Icon('party')} Det skjedde!</div>`;
        return;
      }
      const set = (sfx, val) => { const e = document.getElementById(`${id}-${sfx}`); if (e) e.textContent = String(val).padStart(2,'0'); };
      set('d', Math.floor(diff / 86400000));
      set('h', Math.floor((diff % 86400000) / 3600000));
      set('m', Math.floor((diff % 3600000) / 60000));
      set('s', Math.floor((diff % 60000) / 1000));
    };
    tick();
    const iv = setInterval(tick, 1000);
    const guard = setInterval(() => { if (!document.getElementById(id)) { clearInterval(iv); clearInterval(guard); } }, 5000);
  }

  // ── Block management ──────────────────────────────────────────────────
  function addBlock(type) {
    const def = CP_BLOCKS[type];
    if (!def) return;
    const block = { id: `cpb_${Date.now()}_${Math.random().toString(36).slice(2)}`, type, data: JSON.parse(JSON.stringify(def.defaultData)) };
    _cpBlocks.push(block);
    refreshCpCanvas();
    setTimeout(() => {
      const s = document.getElementById(`cpbs-${block.id}`);
      if (s) s.classList.add('open');
      document.getElementById(`cpb-${block.id}`)?.scrollIntoView({ behavior:'smooth', block:'nearest' });
    }, 30);
  }

  function deleteBlock(id) {
    _cpBlocks = _cpBlocks.filter(b => b.id !== id);
    refreshCpCanvas();
  }

  function moveBlock(id, dir) {
    const idx = _cpBlocks.findIndex(b => b.id === id);
    if (idx < 0) return;
    const nIdx = idx + dir;
    if (nIdx < 0 || nIdx >= _cpBlocks.length) return;
    [_cpBlocks[idx], _cpBlocks[nIdx]] = [_cpBlocks[nIdx], _cpBlocks[idx]];
    refreshCpCanvas();
    setTimeout(() => { const s = document.getElementById(`cpbs-${id}`); if (s) s.classList.add('open'); }, 10);
  }

  function updateBlock(id, key, value) {
    const b = _cpBlocks.find(b => b.id === id);
    if (b) b.data[key] = value;
  }

  function addLinkBtn(blockId) {
    const b = _cpBlocks.find(b => b.id === blockId);
    if (!b) return;
    b.data.buttons = [...(b.data.buttons||[]), { label: 'Lenke', url: 'https://', color: '#7c3aed' }];
    refreshCpCanvas();
    setTimeout(() => { const s = document.getElementById(`cpbs-${blockId}`); if (s) s.classList.add('open'); }, 10);
  }

  function removeLinkBtn(blockId, index) {
    const b = _cpBlocks.find(b => b.id === blockId);
    if (!b) return;
    b.data.buttons = b.data.buttons.filter((_, i) => i !== index);
    refreshCpCanvas();
    setTimeout(() => { const s = document.getElementById(`cpbs-${blockId}`); if (s) s.classList.add('open'); }, 10);
  }

  function updateLinkBtn(blockId, index, key, value) {
    const b = _cpBlocks.find(b => b.id === blockId);
    if (b?.data?.buttons?.[index]) b.data.buttons[index][key] = value;
  }

  function toggleBlock(id) {
    const s = document.getElementById(`cpbs-${id}`);
    if (s) s.classList.toggle('open');
  }

  function refreshCpCanvas() {
    const canvas = document.getElementById('cp-canvas');
    if (!canvas) return;
    const openIds = new Set([...document.querySelectorAll('.cp-block-settings.open')].map(el => el.id.replace('cpbs-','')));
    if (!_cpBlocks.length) {
      canvas.innerHTML = `<div class="cp-empty"><div class="cp-empty-icon">${Icon('wind')}</div><p>Klikk på en blokk til venstre for å begynne</p></div>`;
      return;
    }
    canvas.innerHTML = _cpBlocks.map((b, i) => cpBlockEditorHtml(b, i, _cpBlocks.length)).join('');
    openIds.forEach(id => { const s = document.getElementById(`cpbs-${id}`); if (s) s.classList.add('open'); });
  }

  function saveCustomPage() {
    const current = Auth.current();
    if (!current) return;
    const customPage = { blocks: JSON.parse(JSON.stringify(_cpBlocks)) };
    Auth.updateUser(current.username, { customPage });
    current.customPage = customPage;
    App.toast('Min Side lagret! ✓', 'success');
  }

  function cpDragStart(e, id) {
    _cpDragId = id;
    e.dataTransfer.effectAllowed = 'move';
    document.getElementById(`cpb-${id}`)?.classList.add('dragging');
  }

  function cpDragOver(e, id) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (_cpDragId && _cpDragId !== id) {
      document.querySelectorAll('.cp-block').forEach(el => el.classList.remove('drag-over'));
      document.getElementById(`cpb-${id}`)?.classList.add('drag-over');
    }
  }

  function cpDropCanvas(e) {
    e.preventDefault();
    document.querySelectorAll('.cp-block').forEach(el => el.classList.remove('drag-over','dragging'));
    _cpDragId = null;
  }

  function cpDrop(e, targetId) {
    e.preventDefault();
    document.querySelectorAll('.cp-block').forEach(el => el.classList.remove('drag-over','dragging'));
    if (!_cpDragId || _cpDragId === targetId) { _cpDragId = null; return; }
    const from = _cpBlocks.findIndex(b => b.id === _cpDragId);
    const to   = _cpBlocks.findIndex(b => b.id === targetId);
    if (from >= 0 && to >= 0) {
      const [moved] = _cpBlocks.splice(from, 1);
      _cpBlocks.splice(to, 0, moved);
      refreshCpCanvas();
    }
    _cpDragId = null;
  }

  // ── Events ────────────────────────────────────────────────────────────
  function eventsViewHtml(user) {
    const events = (user.events || [])
      .filter(e => e.isLive || new Date(`${e.date}T${e.time || '00:00'}`) >= new Date(Date.now() - 86400000))
      .sort((a, b) => {
        if (a.isLive !== b.isLive) return a.isLive ? -1 : 1;
        return new Date(`${a.date}T${a.time||'00:00'}`) - new Date(`${b.date}T${b.time||'00:00'}`);
      });
    if (!events.length) return '';
    return `
      <div class="profile-events">
        <div class="profile-events-title">${Icon('calendar')} Events</div>
        ${events.map(e => {
          const typeEmoji = EVENT_TYPES.find(t => t.id === e.type)?.emoji || '📅';
          const dt = new Date(`${e.date}T${e.time || '00:00'}`);
          const dateStr = dt.toLocaleDateString('no-NO', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
          const timeStr = e.time ? ` · kl. ${e.time}` : '';
          const safeTitle = (e.title || '').replace(/'/g, "\\'");
          const safeUrl   = (e.liveUrl || '').replace(/'/g, "\\'");
          return `
            <div class="event-card${e.isLive ? ' event-card--live' : ''}">
              ${e.isLive ? '<div class="event-live-badge"><span class="event-live-dot"></span> LIVE NÅ</div>' : ''}
              <div class="event-card-header">
                <span class="event-type-emoji">${typeEmoji}</span>
                <div class="event-card-info">
                  <div class="event-title">${e.title}</div>
                  ${!e.isLive ? `<div class="event-meta">${dateStr}${timeStr}${e.location ? ' · 📍 ' + e.location : ''}</div>` : (e.location ? `<div class="event-meta">${Icon('map-pin')} ${e.location}</div>` : '')}
                </div>
                ${e.isLive && e.liveUrl ? `<button class="event-listen-btn" onclick="Radio.playUrl('${safeUrl}','${safeTitle}','🔴')">${Icon('play')} Lytt live</button>` : ''}
              </div>
              ${e.description ? `<div class="event-desc">${e.description}</div>` : ''}
            </div>`;
        }).join('')}
      </div>`;
  }

  function eventsTabHtml(user) {
    const events = [...(user.events || [])].sort((a, b) =>
      new Date(`${b.date}T${b.time||'00:00'}`) - new Date(`${a.date}T${a.time||'00:00'}`));
    return `
      <div style="max-width:580px">
        <div class="editor-section-title" style="margin-bottom:0.5rem">${Icon('calendar')} Legg til event</div>
        <p style="font-size:0.82rem;color:var(--text2);margin-bottom:1rem;line-height:1.6">
          Publiser konserter, DJ-sett og shows på profilen din. Merk som live for å la andre lytte direkte herfra.
        </p>
        <div style="background:var(--surface2);border-radius:14px;padding:1.25rem;margin-bottom:1.5rem">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem">
            <div class="form-group">
              <label class="form-label">Tittel *</label>
              <input class="form-input" id="ev-title" placeholder="f.eks. DJ Set på Blå">
            </div>
            <div class="form-group">
              <label class="form-label">Type</label>
              <select class="form-input" id="ev-type">
                ${EVENT_TYPES.map(t => `<option value="${t.id}">${iconForEmoji(t.emoji)} ${t.label}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Dato *</label>
              <input class="form-input" id="ev-date" type="date">
            </div>
            <div class="form-group">
              <label class="form-label">Tid</label>
              <input class="form-input" id="ev-time" type="time">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Sted / Venue</label>
            <input class="form-input" id="ev-location" placeholder="f.eks. Blå, Oslo">
          </div>
          <div class="form-group">
            <label class="form-label">Beskrivelse</label>
            <textarea class="form-input" id="ev-desc" rows="2" placeholder="Kort info om eventet…"></textarea>
          </div>
          <div class="event-live-toggle-wrap">
            <label class="event-live-label">
              <input type="checkbox" id="ev-live" onchange="document.getElementById('ev-live-url-wrap').style.display=this.checked?'block':'none'">
              <span class="event-live-dot" style="flex-shrink:0"></span>
              Marker som LIVE nå
            </label>
            <div id="ev-live-url-wrap" style="display:none;margin-top:0.75rem">
              <label class="form-label">Stream-URL (valgfritt)</label>
              <input class="form-input" id="ev-live-url" placeholder="https://…/stream.mp3">
              <span class="form-hint">Besøkende kan lytte direkte fra profilen din</span>
            </div>
          </div>
          <button class="btn btn-primary" style="margin-top:1rem" onclick="Profile.addEvent()">${Icon('plus')} Legg til event</button>
        </div>
        <div class="editor-section-title" style="margin-bottom:0.75rem">Mine events (${events.length})</div>
        <div id="events-list">
          ${events.length ? events.map(eventsEditorItem).join('') : '<p style="font-size:0.82rem;color:var(--text2)">Ingen events ennå.</p>'}
        </div>
      </div>`;
  }

  function eventsEditorItem(e) {
    const typeEmoji = EVENT_TYPES.find(t => t.id === e.type)?.emoji || '📅';
    return `
      <div class="event-editor-item" id="evitem-${e.id}">
        <span style="font-size:1.3rem;flex-shrink:0">${typeEmoji}</span>
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:0.88rem;display:flex;align-items:center;gap:0.4rem">
            ${e.title}
            ${e.isLive ? '<span class="event-live-mini">🔴 LIVE</span>' : ''}
          </div>
          <div style="font-size:0.75rem;color:var(--text2)">${e.date}${e.time ? ' ' + e.time : ''}${e.location ? ' · ' + e.location : ''}</div>
        </div>
        <button class="btn-icon btn-danger" onclick="Profile.deleteEvent('${e.id}')" title="Slett">${Icon('trash')}</button>
      </div>`;
  }

  function addEvent() {
    const current = Auth.current();
    if (!current) return;
    const title = document.getElementById('ev-title')?.value?.trim();
    const date  = document.getElementById('ev-date')?.value;
    if (!title) { App.toast('Tittel er påkrevd', 'error'); return; }
    if (!date)  { App.toast('Dato er påkrevd', 'error'); return; }
    const isLive = document.getElementById('ev-live')?.checked || false;
    const ev = {
      id:          `ev_${Date.now()}`,
      title,
      type:        document.getElementById('ev-type')?.value  || 'other',
      date,
      time:        document.getElementById('ev-time')?.value  || '',
      location:    document.getElementById('ev-location')?.value?.trim() || '',
      description: document.getElementById('ev-desc')?.value?.trim()     || '',
      isLive,
      liveUrl:     isLive ? (document.getElementById('ev-live-url')?.value?.trim() || '') : '',
      createdAt:   Date.now(),
    };
    const events = [...(current.events || []), ev];
    Auth.updateUser(current.username, { events });
    current.events = events;
    ['ev-title','ev-date','ev-time','ev-location','ev-desc','ev-live-url'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    const cb = document.getElementById('ev-live');
    if (cb) cb.checked = false;
    const urlWrap = document.getElementById('ev-live-url-wrap');
    if (urlWrap) urlWrap.style.display = 'none';
    const list = document.getElementById('events-list');
    if (list) {
      const sorted = [...events].sort((a, b) => new Date(`${b.date}T${b.time||'00:00'}`) - new Date(`${a.date}T${a.time||'00:00'}`));
      list.innerHTML = sorted.map(eventsEditorItem).join('');
    }
    App.toast('Event lagt til! 📅', 'success');
  }

  function deleteEvent(id) {
    const current = Auth.current();
    if (!current) return;
    const events = (current.events || []).filter(e => e.id !== id);
    Auth.updateUser(current.username, { events });
    current.events = events;
    document.getElementById(`evitem-${id}`)?.remove();
    App.toast('Event slettet', 'info');
  }

  function labelsTabHtml(user) {
    const labels = user.labels || [];
    return `
      <div style="max-width:520px">
        <div class="editor-section-title">${Icon('tag')} Mine plateselskaper</div>
        <p style="font-size:0.82rem;color:var(--text2);margin-bottom:1rem;line-height:1.6">
          Legg til plateselskaper du bruker. Du kan tilordne dem til enkeltspor i tracklisten på dine mixes.
        </p>
        <div style="display:flex;gap:0.5rem;margin-bottom:1rem">
          <input class="form-input" id="lbl-input" placeholder="f.eks. Acieeed Records" style="flex:1">
          <button class="btn btn-primary" onclick="Profile.addLabel()">${Icon('plus')} Legg til</button>
        </div>
        <div id="labels-list">
          ${labels.length ? labels.map(labelEditorItem).join('') : '<p style="font-size:0.82rem;color:var(--text2)">Ingen plateselskaper ennå.</p>'}
        </div>
      </div>`;
  }

  function labelEditorItem(label) {
    return `
      <div class="label-editor-item" id="lblitem-${label.id}">
        <span style="font-size:1.1rem">${Icon('tag')}</span>
        <span class="label-editor-name">${label.name}</span>
        <button class="btn-icon btn-danger btn-sm" onclick="Profile.deleteLabel('${label.id}')" title="Slett">${Icon('trash')}</button>
      </div>`;
  }

  function addLabel() {
    const current = Auth.current();
    if (!current) return;
    const input = document.getElementById('lbl-input');
    const name = input?.value?.trim();
    if (!name) { App.toast('Skriv inn navn på plateselskapet', 'error'); return; }
    const label = { id: `lbl_${Date.now()}_${Math.random().toString(36).slice(2)}`, name };
    const labels = [...(current.labels || []), label];
    Auth.updateUser(current.username, { labels });
    current.labels = labels;
    if (input) input.value = '';
    const list = document.getElementById('labels-list');
    if (list) {
      const emptyMsg = list.querySelector('p');
      if (emptyMsg) emptyMsg.remove();
      list.insertAdjacentHTML('beforeend', labelEditorItem(label));
    }
    App.toast(`"${name}" lagt til ${Icon('tag')}`, 'success');
  }

  function deleteLabel(id) {
    const current = Auth.current();
    if (!current) return;
    const labels = (current.labels || []).filter(l => l.id !== id);
    Auth.updateUser(current.username, { labels });
    current.labels = labels;
    document.getElementById(`lblitem-${id}`)?.remove();
    const list = document.getElementById('labels-list');
    if (list && !list.querySelector('.label-editor-item')) {
      list.innerHTML = '<p style="font-size:0.82rem;color:var(--text2)">Ingen plateselskaper ennå.</p>';
    }
    App.toast('Plateselskap fjernet', 'info');
  }

  // Delete media
  window.deleteMedia = async (id) => {
    const current = Auth.current();
    if (!current) return;
    await DB.delete('media', id);
    current.mediaIds = (current.mediaIds || []).filter(x => x !== id);
    Auth.updateUser(current.username, { mediaIds: current.mediaIds });
    document.getElementById(`media-wrap-${id}`)?.remove();
    App.toast('Slettet', 'info');
  };

  // Open media in modal
  window.openMediaModal = async (id) => {
    const rec = await DB.get('media', id);
    if (!rec) return;
    const box = document.getElementById('modal-box');
    let body;
    if (rec.kind === 'youtube' && rec.youtubeId) {
      body = `<div style="position:relative;width:100%;padding-top:56.25%;border-radius:8px;overflow:hidden"><iframe src="https://www.youtube.com/embed/${rec.youtubeId}?autoplay=1" title="YouTube" allow="autoplay; encrypted-media; fullscreen" allowfullscreen style="position:absolute;inset:0;width:100%;height:100%;border:0"></iframe></div>`;
    } else if (rec.kind === 'link') {
      body = `<a href="${esc(rec.url)}" target="_blank" rel="noopener" class="btn btn-primary">${Icon('external-link')} Åpne lenke</a>`;
    } else {
      const url = await mediaSrc(rec);
      if (!url) return;
      body = (rec.type || '').startsWith('video/')
        ? `<video src="${url}" controls autoplay style="width:100%;border-radius:8px;max-height:60vh"></video>`
        : `<img src="${url}" style="width:100%;border-radius:8px;max-height:70vh;object-fit:contain">`;
    }
    box.innerHTML = `
      <div class="modal-header">
        <h2>${esc(rec.name || 'Media')}</h2>
        <button class="btn-icon" onclick="App.closeModal()">${Icon('x')}</button>
      </div>
      ${body}
    `;
    App.openModal();
  };

  // ── Profile visibility ────────────────────────────────────────────────
  function toggleProfileVisibility(username) {
    const current = Auth.current();
    if (!current || current.username !== username) return;
    const newVis = (current.profileVisibility || 'public') === 'public' ? 'private' : 'public';
    Auth.updateUser(username, { profileVisibility: newVis });
    current.profileVisibility = newVis;
    App.toast(newVis === 'private' ? '🔒 Profil satt til privat – bare du kan se den' : '🌐 Profil satt til offentlig', 'success');
    renderView(username);
  }

  function setProfileVisibility(value) {
    const current = Auth.current();
    if (!current) return;
    Auth.updateUser(current.username, { profileVisibility: value });
    current.profileVisibility = value;

    const pubBtn = document.getElementById('vis-public-btn');
    const privBtn = document.getElementById('vis-private-btn');
    const desc = document.getElementById('vis-desc');
    if (pubBtn)  { pubBtn.className  = `btn btn-sm ${value === 'public'  ? 'btn-primary' : 'btn-ghost'}`; pubBtn.style.flex  = '1'; }
    if (privBtn) { privBtn.className = `btn btn-sm ${value === 'private' ? 'btn-primary' : 'btn-ghost'}`; privBtn.style.flex = '1'; }
    if (desc) desc.textContent = value === 'private'
      ? 'Bare du kan se profilen din. Andre ser en låst side.'
      : 'Alle kan finne og se profilen din.';

    App.toast(value === 'private' ? '🔒 Profil satt til privat' : '🌐 Profil satt til offentlig', 'success');
  }

  // ── Paint / Image Editor ────────────────────────────────────────────
  function openImagePaintEditor() {
    const src = window._pendingBgImage || Auth.current()?.theme?.bgImage;

    const modal = document.createElement('div');
    modal.id = 'paint-modal';
    modal.className = 'paint-modal';
    modal.innerHTML = `
      <div class="paint-editor">
        <div class="paint-toolbar">
          <div class="paint-tools-group">
            <button class="paint-tool active" id="ptool-pencil" onclick="window._setPaintTool('pencil',this)" title="Blyant">${Icon('edit')}</button>
            <button class="paint-tool" id="ptool-line"   onclick="window._setPaintTool('line',this)"   title="Linje">╱</button>
            <button class="paint-tool" id="ptool-rect"   onclick="window._setPaintTool('rect',this)"   title="Rektangel">▭</button>
            <button class="paint-tool" id="ptool-eraser" onclick="window._setPaintTool('eraser',this)" title="Viskelær">${Icon('square')}</button>
            <button class="paint-tool" id="ptool-text"   onclick="window._setPaintTool('text',this)"   title="Tekst">T</button>
          </div>
          <div class="paint-divider"></div>
          <div class="paint-color-group">
            <span class="paint-label">Farge</span>
            <input type="color" id="paint-color" value="#ff0000" class="paint-color-input" title="Fargevelger">
            <span class="paint-label">Str.</span>
            <input type="range" id="paint-size" min="1" max="50" value="4" class="paint-size-range">
            <span id="paint-size-val" class="paint-size-val">4</span>
          </div>
          <div class="paint-divider"></div>
          <div class="paint-text-group" id="paint-text-group" style="display:none">
            <input type="text" id="paint-text-input" placeholder="Skriv tekst her..." class="paint-text-field">
            <select id="paint-font-size" class="paint-font-sel">
              ${[12,16,20,24,32,48,64,80].map(s => `<option value="${s}" ${s===24?'selected':''}>${s}px</option>`).join('')}
            </select>
            <label class="paint-bold-check"><input type="checkbox" id="paint-text-bold" checked> <b>B</b></label>
          </div>
          <div class="paint-actions">
            <button class="paint-action-btn" onclick="window._paintUndo()">${Icon('corner-down-left')} Angre</button>
            <button class="paint-action-btn p-danger" onclick="window._closePaintEditor(false)">${Icon('x')} Avbryt</button>
            <button class="paint-action-btn p-primary" onclick="window._closePaintEditor(true)">${Icon('check')} Bruk</button>
          </div>
        </div>
        <div class="paint-canvas-area">
          <div class="paint-canvas-wrap" id="paint-canvas-wrap">
            <canvas id="paint-canvas"></canvas>
            <div class="rh" id="rh-nw" data-dir="nw"></div>
            <div class="rh" id="rh-ne" data-dir="ne"></div>
            <div class="rh" id="rh-sw" data-dir="sw"></div>
            <div class="rh" id="rh-se" data-dir="se"></div>
          </div>
        </div>
        <div class="paint-statusbar">
          <span id="paint-info">Blyant — klikk og dra for å tegne</span>
          <span id="paint-coords"></span>
          <span id="paint-dims" class="paint-canvas-dims"></span>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    const canvas  = document.getElementById('paint-canvas');
    const wrap    = document.getElementById('paint-canvas-wrap');
    const ctx     = canvas.getContext('2d');
    const infoEl  = document.getElementById('paint-info');
    const coordEl = document.getElementById('paint-coords');
    const dimsEl  = document.getElementById('paint-dims');

    let currentTool = 'pencil';
    let drawing     = false;
    let startX = 0, startY = 0;
    let history = [];
    let snapData = null;

    const toolNames = {pencil:'Blyant',line:'Linje',rect:'Rektangel',eraser:'Viskelær',text:'Tekst'};
    const toolCursors = {pencil:'crosshair',line:'crosshair',rect:'crosshair',eraser:'cell',text:'text'};

    function saveHistory() {
      history.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
      if (history.length > 50) history.shift();
    }

    function updateDims() {
      dimsEl.textContent = `${canvas.width} × ${canvas.height} px`;
    }

    function updateWrapSize() {
      wrap.style.width  = canvas.width  + 'px';
      wrap.style.height = canvas.height + 'px';
      canvas.style.width  = canvas.width  + 'px';
      canvas.style.height = canvas.height + 'px';
      updateDims();
    }

    window._paintUndo = () => {
      if (history.length < 2) return;
      history.pop();
      ctx.putImageData(history[history.length - 1], 0, 0);
    };

    window._setPaintTool = (tool, btn) => {
      currentTool = tool;
      document.querySelectorAll('.paint-tool').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('paint-text-group').style.display = tool === 'text' ? 'flex' : 'none';
      infoEl.textContent = toolNames[tool] + (tool === 'text' ? ' — klikk på bildet for å plassere tekst' : ' — klikk og dra for å tegne');
      canvas.style.cursor = toolCursors[tool];
    };

    document.getElementById('paint-size').addEventListener('input', e => {
      document.getElementById('paint-size-val').textContent = e.target.value;
    });

    function getPos(e) {
      const r = canvas.getBoundingClientRect();
      const scaleX = canvas.width  / r.width;
      const scaleY = canvas.height / r.height;
      const cx = ((e.touches ? e.touches[0].clientX : e.clientX) - r.left) * scaleX;
      const cy = ((e.touches ? e.touches[0].clientY : e.clientY) - r.top)  * scaleY;
      return [cx, cy];
    }

    function getColor() { return document.getElementById('paint-color').value; }
    function getSize()  { return parseInt(document.getElementById('paint-size').value); }

    canvas.addEventListener('mousemove', e => {
      const [x, y] = getPos(e);
      coordEl.textContent = `${Math.round(x)}, ${Math.round(y)}`;
      if (!drawing) return;

      const color = getColor();
      const size  = getSize();

      if (currentTool === 'pencil') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = color;
        ctx.lineWidth   = size;
        ctx.lineCap     = 'round';
        ctx.lineJoin    = 'round';
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(x, y);
        ctx.stroke();
        startX = x; startY = y;
      } else if (currentTool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0,0,0,1)';
        ctx.lineWidth   = size * 3;
        ctx.lineCap     = 'round';
        ctx.lineJoin    = 'round';
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(x, y);
        ctx.stroke();
        startX = x; startY = y;
      } else if ((currentTool === 'line' || currentTool === 'rect') && snapData) {
        ctx.putImageData(snapData, 0, 0);
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = color;
        ctx.lineWidth   = size;
        ctx.lineCap     = 'round';
        if (currentTool === 'line') {
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(x, y);
          ctx.stroke();
        } else {
          ctx.strokeRect(startX, startY, x - startX, y - startY);
        }
      }
    });

    canvas.addEventListener('mousedown', e => {
      e.preventDefault();
      const [x, y] = getPos(e);

      if (currentTool === 'text') {
        const txt = document.getElementById('paint-text-input').value.trim();
        if (!txt) { infoEl.textContent = 'Skriv inn tekst i feltet over først!'; return; }
        saveHistory();
        const fontSize = parseInt(document.getElementById('paint-font-size').value);
        const bold     = document.getElementById('paint-text-bold').checked;
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle  = getColor();
        ctx.font       = `${bold ? 'bold ' : ''}${fontSize}px sans-serif`;
        ctx.fillText(txt, x, y);
        return;
      }

      drawing = true;
      startX = x; startY = y;

      if (currentTool === 'line' || currentTool === 'rect') {
        snapData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      } else {
        saveHistory();
      }
    });

    canvas.addEventListener('mouseup', () => {
      if (!drawing) return;
      drawing = false;
      if (currentTool === 'line' || currentTool === 'rect') {
        saveHistory();
        snapData = null;
      }
      ctx.globalCompositeOperation = 'source-over';
    });

    canvas.addEventListener('mouseleave', () => { drawing = false; });

    // Load image onto canvas
    function initCanvas(imageSrc) {
      if (imageSrc) {
        const img = new Image();
        img.onload = () => {
          const maxW  = Math.min(img.width, 1400);
          const scale = maxW / img.width;
          canvas.width  = Math.round(maxW);
          canvas.height = Math.round(img.height * scale);
          updateWrapSize();
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          saveHistory();
        };
        img.src = imageSrc;
      } else {
        canvas.width  = 800;
        canvas.height = 500;
        updateWrapSize();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        saveHistory();
      }
    }

    initCanvas(src);

    // Corner resize handles
    document.querySelectorAll('#paint-modal .rh').forEach(h => {
      h.addEventListener('mousedown', e => {
        e.preventDefault();
        e.stopPropagation();
        const dir = h.dataset.dir;
        const ox = e.clientX, oy = e.clientY;
        const ow = canvas.width, oh = canvas.height;
        const snapshot = ctx.getImageData(0, 0, ow, oh);

        const onMove = ev => {
          const dx = ev.clientX - ox;
          const dy = ev.clientY - oy;
          let nw = ow, nh = oh;
          if (dir.includes('e')) nw = Math.max(80, ow + dx);
          if (dir.includes('s')) nh = Math.max(80, oh + dy);
          if (dir.includes('w')) nw = Math.max(80, ow - dx);
          if (dir.includes('n')) nh = Math.max(80, oh - dy);
          nw = Math.round(nw); nh = Math.round(nh);
          canvas.width  = nw;
          canvas.height = nh;
          updateWrapSize();
          const tmp = document.createElement('canvas');
          tmp.width = ow; tmp.height = oh;
          tmp.getContext('2d').putImageData(snapshot, 0, 0);
          ctx.drawImage(tmp, 0, 0, nw, nh);
        };

        const onUp = () => {
          saveHistory();
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      });
    });

    window._closePaintEditor = (apply) => {
      if (apply) {
        // Flatten canvas (preserve dark bg where eraser was used)
        const flat = document.createElement('canvas');
        flat.width  = canvas.width;
        flat.height = canvas.height;
        const fctx = flat.getContext('2d');
        fctx.fillStyle = '#000000';
        fctx.fillRect(0, 0, flat.width, flat.height);
        fctx.drawImage(canvas, 0, 0);
        const dataUrl = flat.toDataURL('image/jpeg', 0.92);
        window._pendingBgImage = dataUrl;
        const prev = document.getElementById('bg-preview');
        if (prev) {
          const existImg = prev.tagName === 'IMG' ? prev : prev.querySelector('img');
          if (existImg) existImg.src = dataUrl;
          else prev.innerHTML = `<img src="${dataUrl}" style="width:100%;height:80px;object-fit:cover;border-radius:8px;margin-top:0.5rem">`;
        }
        Profile.livePreview();
      }
      modal.remove();
      delete window._paintUndo;
      delete window._setPaintTool;
      delete window._closePaintEditor;
    };
  }

  return {
    renderView, renderEditor,
    switchTab,
    renderWallTab,
    playTrack,
    toggleProfileVisibility, setProfileVisibility,
    saveProfile, livePreview, collectTheme,
    uploadMedia, uploadMusic, uploadMusicCover, uploadSaleCover, uploadAvatar, uploadBanner,
    setAvatarFromProfile, deleteAvatar,
    addMediaLink, toggleMediaVisibility,
    shareTrackToCommunity, shareMediaToCommunity,
    toggleTrackVisibility,
    openSongCreditsModal, saveSongCredits,
    uploadBgImage, uploadBgVideo, openImagePaintEditor,
    aiBio, aiColors, aiLayout, applyAiColors, applyAiLayout,
    updateRoleLabel, saveRoles, selectEditorRole,
    removeLink,
    toggleFestivalItem, saveFestivals,
    addEvent, deleteEvent,
    // Min Side builder
    addBlock, deleteBlock, moveBlock, updateBlock,
    addLinkBtn, removeLinkBtn, updateLinkBtn,
    toggleBlock, refreshCpCanvas, saveCustomPage,
    cpDragStart, cpDragOver, cpDrop, cpDropCanvas,
    // Friend requests
    sendFriendRequest, acceptFriend, rejectFriend,
    cancelFriendRequest, removeFriend,
    // DJ Mixes
    uploadMix, deleteMix, toggleMixVisibility,
    playMix, addMixComment,
    openMixEditModal, saveMixEdits, uploadMixCover,
    addTrackToModal, removeTrackFromModal, searchTrackOnGoogle,
    upgradeToPro, startStripeCheckout, confirmUpgrade,
    // Plateselskaper
    addLabel, deleteLabel,
    // Plattformer
    togglePlatformItem, savePlatforms,
    // Mine Sider
    addMySite, deleteMySite,
    // AI chat
    sendAiChat, sendAiChatMsg,
    // Music demo
    toggleDemoMenu,
  };
})();
