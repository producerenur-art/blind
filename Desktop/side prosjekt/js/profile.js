// Profile — view + edit
const Profile = (() => {

  // ── Nærvær-status (online / borte / sover / frakobla) ─────────────────
  // Brukaren vel sjølv kva profilen viser. Valet blir kringkasta via SC-presence
  // (js/realtime.js) slik at ALLE — i alle nettlesarar og på mobil/nettbrett —
  // ser same status. Standard er «online». «Frakobla» = usynleg i online-lista.
  const STATUS_META = {
    online:   { label: 'Online',   dot: '#22c55e', pulse: true  },
    away:     { label: 'Away',    dot: '#f59e0b', pulse: false },
    sleeping: { label: 'Asleep',    dot: '#8b5cf6', pulse: false },
    offline:  { label: 'Offline',dot: '#6b7280', pulse: false },
  };

  // Kva status ein brukar viser no. Fell tilbake på 'offline' om SC manglar.
  function _statusOf(username) {
    if (window.SC && SC.statusOf) return SC.statusOf(username);
    return (window.Auth && Auth.isOnline && Auth.isOnline(username)) ? 'online' : 'offline';
  }

  // Badge ved siden av @brukarnamn. For eigaren er den ein klikkbar velgar med
  // nedtrekk (Online / Borte / Sover / Frakoblet). For andre berre ei etikett.
  function statusBadgeHtml(username, isOwner) {
    const cur  = _statusOf(username);
    const meta = STATUS_META[cur] || STATUS_META.offline;
    const dot  = `<span class="status-badge-dot${meta.pulse ? ' status-badge-dot--pulse' : ''}" style="background:${meta.dot};box-shadow:0 0 8px ${meta.dot}88"></span>`;
    if (!isOwner) {
      return `<span class="status-badge" title="Status: ${meta.label}">${dot}<span class="status-badge-label">${meta.label}</span></span>`;
    }
    const items = SC && SC.STATUS_VALID ? SC.STATUS_VALID : ['online','away','sleeping','offline'];
    const menu = items.map(k => {
      const m = STATUS_META[k];
      return `<button type="button" class="status-menu-item${k === cur ? ' active' : ''}" onclick="Profile.setStatus('${k}')">
                <span class="status-badge-dot" style="background:${m.dot};box-shadow:0 0 6px ${m.dot}88"></span>
                <span>${m.label}</span>${k === cur ? ' <span class="status-menu-check">✓</span>' : ''}
              </button>`;
    }).join('');
    return `<span class="status-badge status-badge--owner" id="status-badge-${esc(username)}">
      <button type="button" class="status-badge-btn" onclick="Profile.toggleStatusMenu(event)" title="Change your status — shown to everyone">
        ${dot}<span class="status-badge-label">${meta.label}</span><span class="status-badge-caret">▾</span>
      </button>
      <div class="status-menu hidden">${menu}</div>
    </span>`;
  }

  // Vis/skjul nedtrekket. Lukkast ved klikk utanfor.
  function toggleStatusMenu(ev) {
    if (ev) ev.stopPropagation();
    const badge = ev && ev.currentTarget ? ev.currentTarget.closest('.status-badge--owner') : null;
    if (!badge) return;
    const menu = badge.querySelector('.status-menu');
    if (!menu) return;
    const willOpen = menu.classList.contains('hidden');
    document.querySelectorAll('.status-menu').forEach(m => m.classList.add('hidden'));
    if (willOpen) {
      menu.classList.remove('hidden');
      setTimeout(() => {
        const off = (e) => {
          if (badge.contains(e.target)) return;
          menu.classList.add('hidden');
          document.removeEventListener('click', off, true);
        };
        document.addEventListener('click', off, true);
      }, 0);
    }
  }

  // Eigaren vel ny status → kringkast + oppdater badge live utan full re-render.
  // Berre eigaren har ein `.status-badge--owner` på sida (si eiga profilhode),
  // så vi oppdaterer den direkte utan å slå opp brukarnamn.
  function setStatus(status) {
    if (window.SC && SC.setStatus) SC.setStatus(status);
    const meta = STATUS_META[status] || STATUS_META.online;
    document.querySelectorAll('.status-badge--owner').forEach(badge => {
      const btnDot = badge.querySelector('.status-badge-btn .status-badge-dot');
      const btnLbl = badge.querySelector('.status-badge-btn .status-badge-label');
      if (btnDot) { btnDot.style.background = meta.dot; btnDot.style.boxShadow = `0 0 8px ${meta.dot}88`; btnDot.classList.toggle('status-badge-dot--pulse', !!meta.pulse); }
      if (btnLbl) btnLbl.textContent = meta.label;
      badge.querySelectorAll('.status-menu-item').forEach(it => {
        const on = it.getAttribute('onclick') || '';
        const active = on.includes(`'${status}'`);
        it.classList.toggle('active', active);
        let chk = it.querySelector('.status-menu-check');
        if (active && !chk) { chk = document.createElement('span'); chk.className = 'status-menu-check'; chk.textContent = '✓'; it.appendChild(chk); }
        else if (!active && chk) chk.remove();
      });
    });
    document.querySelectorAll('.status-menu').forEach(m => m.classList.add('hidden'));
  }

  // ── Festival data ─────────────────────────────────────────────────────
  const FESTIVALS = [
    { id: 'ozora',        emoji: '🌀', name: 'Ozora Festival',         country: 'Hungary 🇭🇺',   url: 'https://ozorafestival.eu',              ticket: 'Tickets' },
    { id: 'boom',         emoji: '🌙', name: 'Boom Festival',           country: 'Portugal 🇵🇹', url: 'https://boomfestival.org',              ticket: 'Info' },
    { id: 'sensation_w',  emoji: '🤍', name: 'Sensation White',         country: 'Global 🌍',   url: 'https://www.sensation.com',             ticket: 'Register' },
    { id: 'sensation_b',  emoji: '🖤', name: 'Sensation Black',         country: 'Global 🌍',   url: 'https://www.sensation.com',             ticket: 'Register' },
    { id: 'fullmoon',     emoji: '🌕', name: 'Full Moon Party',         country: 'Thailand 🇹🇭', url: 'https://fullmoonparty-thailand.com',    ticket: 'Info' },
    { id: 'universo',     emoji: '🌌', name: 'Universo Paralello',      country: 'Brazil 🇧🇷',   url: 'https://universoparalello.org',         ticket: 'Tickets' },
    { id: 'psy_fi',       emoji: '🔮', name: 'Psy-Fi Festival',         country: 'Netherlands 🇳🇱',url: 'https://www.psy-fi.nl',                 ticket: 'Tickets' },
    { id: 'modem',        emoji: '🎛️', name: 'Modem Festival',          country: 'Croatia 🇭🇷',  url: 'https://modemfestival.com',             ticket: 'Tickets' },
    { id: 'shankra',      emoji: '🕉️', name: 'Shankra Festival',        country: 'Switzerland 🇨🇭',   url: 'https://shankrafestival.org',           ticket: 'Tickets' },
    { id: 'rainbow',      emoji: '🌈', name: 'Rainbow Serpent',         country: 'Australia 🇦🇺',url: 'https://rainbowserpent.net',            ticket: 'Tickets' },
    { id: 'antaris',      emoji: '🛸', name: 'Antaris Project',         country: 'Germany 🇩🇪', url: 'https://www.antaris-project.de',        ticket: 'Info' },
    { id: 'sun',          emoji: '☀️', name: 'SUN Festival',            country: 'Hungary 🇭🇺',   url: 'https://solarunitednatives.org',        ticket: 'Tickets' },
    { id: 'cosmic',       emoji: '🌠', name: 'Cosmic Convergence',      country: 'Guatemala 🇬🇹',url: 'https://cosmicconvergencefestival.org', ticket: 'Info' },
    { id: 'burning',      emoji: '🔥', name: 'Burning Man',             country: 'USA 🇺🇸',      url: 'https://burningman.org',                ticket: 'Tickets' },
    { id: 'earthcore',    emoji: '🌏', name: 'Earthcore',               country: 'Australia 🇦🇺',url: 'https://earthcore.com.au',              ticket: 'Tickets' },
    { id: 'tomorrowland', emoji: '🎡', name: 'Tomorrowland',            country: 'Belgium 🇧🇪',   url: 'https://www.tomorrowland.com',          ticket: 'Tickets' },
    { id: 'vuuv',         emoji: '🎶', name: 'VuuV Festival',           country: 'Germany 🇩🇪', url: 'https://www.voov.de',                   ticket: 'Tickets' },
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

  // Rolle-preg: fanenamnet på «Content»-fana speiler kva slags brukar det er
  // (DJ set/mix, produsent slepp utgjevingar, plateselskap har ein roster).
  const CONTENT_TAB_LABEL = { dj: 'Sets & Mixes', produsent: 'Releases', plateselskap: 'Releases & Roster', lytter: 'Content' };

  // ── Event types ───────────────────────────────────────────────────────
  const EVENT_TYPES = [
    { id: 'dj-set',   emoji: '🎛️', label: 'DJ Set' },
    { id: 'concert',  emoji: '🎸', label: 'Concert' },
    { id: 'show',     emoji: '🎙️', label: 'Show' },
    { id: 'workshop', emoji: '🎓', label: 'Workshop' },
    { id: 'festival', emoji: '🎪', label: 'Festival' },
    { id: 'other',    emoji: '📅', label: 'Other' },
  ];

  // ── Helpers ──────────────────────────────────────────────────────────
  function initials(name) {
    return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }

  function cssFilters(f) {
    if (!f) return '';
    return `brightness(${f.brightness ?? 100}%) contrast(${f.contrast ?? 100}%) saturate(${f.saturation ?? 100}%) hue-rotate(${f.hue ?? 0}deg) grayscale(${f.grayscale ?? 0}%)`;
  }

  // Sant når brukaren aldri har justert eit einaste fargefelt (framleis
  // nøyaktig defaultTheme()) — sjå kommentaren ved renderProfile sin
  // theme-variabel for kvifor berre fargane (ikkje font/kortstil/layout)
  // avgjer om rolle-preget skal slå inn.
  function _isDefaultThemeColors(t) {
    if (!t) return true;
    const d = Auth.defaultTheme();
    return t.primaryColor === d.primaryColor && t.secondaryColor === d.secondaryColor &&
           t.bgColor === d.bgColor && t.accentColor === d.accentColor &&
           t.bgGradient === d.bgGradient;
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
  // Finn den beste avatar-URL-en for en bruker: sky-URL (synlig for alle) først,
  // så lokal IndexedDB-blob. Returnerer null når brukeren ikke har noe bilde.
  async function avatarUrlFor(user) {
    if (!user) return null;
    if (user.avatarUrl) return user.avatarUrl;
    if (user.avatarMediaId) return DB.getBlobUrl('media', user.avatarMediaId).catch(() => null);
    return null;
  }

  // Som avatarUrlFor, men slår opp på BRUKERNAVN og faller tilbake til den
  // publiserte profilen i skyen (ProfileSync) når den lokale pv_users mangler
  // bildet. Nøkkelen til at ANDRE brukeres profilbilder vises på tvers av
  // enheter: localStorage er per nettleser, så en avatar lastet opp på én enhet
  // finnes ikke i lokal pv_users på en annen — men avatarUrl er et offentlig
  // felt i skyen. Speiler _bannerUrlFor (uten dette viste kortene bare
  // initial-plassholderen for alle unntatt deg selv på nettopp den enheten).
  async function _avatarUrlForName(uname) {
    const u = Auth.getUser(uname);
    if (u) {
      if (u.avatarUrl) return u.avatarUrl;
      if (u.avatarMediaId) {
        const blob = await DB.getBlobUrl('media', u.avatarMediaId).catch(() => null);
        if (blob) return blob;
      }
    }
    // Fallback: hent eierens publiserte profil fra skyen og flett den inn lokalt.
    if (typeof ProfileSync !== 'undefined' && ProfileSync.fetch) {
      const remote = await ProfileSync.fetch(uname).catch(() => null);
      if (remote) {
        if (typeof Auth.cacheRemoteProfile === 'function') Auth.cacheRemoteProfile(uname, remote);
        if (remote.avatarUrl) return remote.avatarUrl;
      }
    }
    return null;
  }

  async function avatarEl(user, size = 60) {
    const url = user.username ? await _avatarUrlForName(user.username) : await avatarUrlFor(user);
    if (url) return `<img src="${url}" alt="${user.displayName}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
    return `<span style="font-size:${size * 0.35}px">${initials(user.displayName)}</span>`;
  }

  // Bytt initial-plassholdere ut med det ekte profilbildet, hvor som helst i
  // appen. Marker et avatar-element med data-av-user="<brukernavn>" så fyller
  // dette bildet inn asynkront (feed-innlegg, komponer-boks, kommentarer …).
  // Brukes av app.js/community.js/social.js etter at HTML er satt inn.
  async function hydrateAvatars(root) {
    const scope = root || document;
    const els = Array.from(scope.querySelectorAll('[data-av-user]:not([data-av-done])'));
    // Slå opp hver brukers avatar-URL kun én gang (delt promise-cache), og fyll
    // ALLE elementene parallelt. Viktig: en treg/feilende blob-oppslag for én
    // bruker skal aldri blokkere at de andre avatarene fylles inn (tidligere
    // sekvensiell løkke lot ett tregt oppslag «henge» resten på siden).
    const cache = {};
    await Promise.all(els.map(async (el) => {
      el.setAttribute('data-av-done', '1');
      const uname = el.getAttribute('data-av-user');
      if (!uname) return;
      if (!(uname in cache)) cache[uname] = _avatarUrlForName(uname);
      let url = null;
      try { url = await cache[uname]; } catch (e) { url = null; }
      if (url) {
        const u = Auth.getUser(uname);
        el.innerHTML = `<img src="${url}" alt="${esc((u && u.displayName) || uname)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
      }
    }));
  }

  // Legg det ekte forside-/bannerbildet inn asynkront der en bruker vises som
  // kort (hjem-siden «Brukere på SiriusFM», Discover → Folk osv.). Marker
  // banner-elementet med data-banner-user="<brukernavn>" så henter dette
  // eierens opplastede banner (remote bannerUrl, eller lokal bannerMediaId-blob)
  // og legger det som bakgrunnsbilde oppå tema-gradienten.
  async function hydrateBanners(root) {
    const scope = root || document;
    const els = scope.querySelectorAll('[data-banner-user]:not([data-banner-done])');
    const cache = {};
    for (const el of els) {
      el.setAttribute('data-banner-done', '1');
      const uname = el.getAttribute('data-banner-user');
      if (!uname) continue;
      let url = cache[uname];
      if (url === undefined) {
        url = await _bannerUrlFor(uname);
        cache[uname] = url || null;
      }
      if (url) {
        const bu = Auth.getUser(uname);
        el.style.backgroundImage = `url("${url}")`;
        el.style.backgroundSize = 'cover';
        el.style.backgroundPosition = (bu && bu.bannerPos) ? bu.bannerPos : 'center';
      }
    }
  }

  // Finn banner-URL for en bruker. Prøver den LOKALE brukeren først (rask,
  // fungerer offline / for egne blober), og faller så tilbake til den PUBLISERTE
  // profilen i skyen (ProfileSync). Fallbacket er nøkkelen: localStorage er per
  // nettleser/enhet, så en banner lastet opp på én enhet finnes ikke i lokal
  // pv_users på en annen — men den ligger i Supabase (bannerUrl er offentlig felt).
  // Uten dette viste kortene bare tema-gradienten for alle unntatt deg selv på
  // nettopp den enheten der du lastet opp.
  async function _bannerUrlFor(uname) {
    const u = Auth.getUser(uname);
    if (u) {
      if (u.bannerUrl) return u.bannerUrl;
      if (u.bannerMediaId) {
        const blob = await DB.getBlobUrl('media', u.bannerMediaId).catch(() => null);
        if (blob) return blob;
      }
    }
    // Fallback: hent eierens publiserte profil fra skyen og flett den inn lokalt.
    if (typeof ProfileSync !== 'undefined' && ProfileSync.fetch) {
      const remote = await ProfileSync.fetch(uname).catch(() => null);
      if (remote) {
        if (typeof Auth.cacheRemoteProfile === 'function') {
          Auth.cacheRemoteProfile(uname, remote);   // så neste oppslag er lokalt
        }
        if (remote.bannerUrl) return remote.bannerUrl;
      }
    }
    return null;
  }

  // ── Festival helpers ──────────────────────────────────────────────────
  function festivalBadgesHtml(user) {
    const ids = user.festivalIds || [];
    if (!ids.length) return '';
    const picks = FESTIVALS.filter(f => ids.includes(f.id));
    if (!picks.length) return '';
    return `
      <div class="profile-festivals">
        <div class="profile-festivals-title">${Icon('star')} Festivals</div>
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
        <div class="editor-section-title" style="margin-bottom:0.5rem">${Icon('star')} Festivals on your profile</div>
        <p style="font-size:0.82rem;color:var(--text2);margin-bottom:1.25rem;line-height:1.6">
          Choose festivals you attend or follow — they appear with a ticket/registration link on your profile.
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
        <button class="btn btn-primary" style="margin-top:1.25rem" onclick="Profile.saveFestivals()">${Icon('save')} Save festivals</button>
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
            <div class="profile-platforms-title">${Icon('laptop')} Music software</div>
            <div class="platforms-badges">
              ${dawPicks.map(d => `<span class="platform-badge platform-badge--daw">${iconForEmoji(d.emoji)} ${d.name}</span>`).join('')}
            </div>
          </div>` : ''}
        ${platPicks.length ? `
          <div class="profile-platforms-group">
            <div class="profile-platforms-title">${Icon('music')} Digital platforms</div>
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
        <div class="editor-section-title" style="margin-bottom:0.25rem">${Icon('laptop')} Music software / DAW</div>
        <p style="font-size:0.82rem;color:var(--text2);margin-bottom:1rem;line-height:1.6">
          Choose which music software you use for production or mixing.
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
        <div class="editor-section-title" style="margin-top:1.5rem;margin-bottom:0.25rem">${Icon('music')} Digital platforms</div>
        <p style="font-size:0.82rem;color:var(--text2);margin-bottom:1rem;line-height:1.6">
          Which streaming platforms or music stores do you use?
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
        <button class="btn btn-primary" style="margin-top:1.25rem" onclick="Profile.savePlatforms()">${Icon('save')} Save platforms</button>
      </div>`;
  }

  // ── My Sites helpers ──────────────────────────────────────────────────
  function mySitesViewHtml(user) {
    const sites = user.mySites || [];
    if (!sites.length) return '';
    return `
      <div class="profile-my-sites">
        <div class="profile-my-sites-title">${Icon('globe')} My Sites</div>
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
        <div class="editor-section-title" style="margin-bottom:0.25rem">${Icon('globe')} My own sites</div>
        <p style="font-size:0.82rem;color:var(--text2);margin-bottom:1.25rem;line-height:1.6">
          Add links to your own homemade sites, portfolios, blogs or other places where people can find you.
        </p>
        <div style="background:var(--surface2);border-radius:14px;padding:1.25rem;margin-bottom:1.25rem">
          <div style="display:grid;grid-template-columns:auto 1fr;gap:0.75rem;align-items:start;margin-bottom:0.75rem">
            <div class="form-group" style="margin:0">
              <label class="form-label">Emoji</label>
              <input class="form-input" id="ms-emoji" value="🌐" style="width:70px;text-align:center;font-size:1.3rem" maxlength="2">
            </div>
            <div class="form-group" style="margin:0">
              <label class="form-label">Title *</label>
              <input class="form-input" id="ms-title" placeholder="e.g. My blog">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">URL *</label>
            <input class="form-input" id="ms-url" placeholder="https://…">
          </div>
          <div class="form-group">
            <label class="form-label">Description (optional)</label>
            <input class="form-input" id="ms-desc" placeholder="Short description of the site">
          </div>
          <button class="btn btn-primary" onclick="Profile.addMySite()">${Icon('plus')} Add site</button>
        </div>
        <div id="my-sites-list">
          ${sites.length ? sites.map(mySiteEditorItem).join('') : '<p style="font-size:0.82rem;color:var(--text2)">No sites yet.</p>'}
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
        <button class="btn-icon btn-danger btn-sm" onclick="Profile.deleteMySite('${s.id}')" title="Delete">${Icon('trash')}</button>
      </div>`;
  }

  // ── View profile ──────────────────────────────────────────────────────
  let _viewUser = null;   // brukarnamnet til profilen som vert vist no (for Innlegg-fana)
  async function renderView(username) {
    _viewUser = username;
    const app = document.getElementById('app');
    app.innerHTML = '<div class="page-loading"><div class="spinner"></div></div>';

    // Sky-sync: en besøkende henter profilen ned fra Supabase FØR vi leser lokalt
    // (ellers finnes ikke andres profil i denne nettleseren). Eieren publiserer
    // sin egen i bakgrunnen. No-op når Supabase ikke er konfigurert.
    if (window.ProfileSync && ProfileSync._enabled()) {
      const sess = Auth.current();
      if (sess && sess.username === username) {
        // Løft ev. lokal-kun avatar/banner opp til sky, så publiser. Selve
        // migreringen kaller Auth.updateUser (→ push) når den finner noe.
        migrateLocalMediaToCloud(username).catch(() => {});
        ProfileSync.push(Auth.getUser(username));   // eier → publiser (fire-and-forget)
      } else {
        await ProfileSync.pull(username).catch(() => {});  // besøkende → hent ned
      }
    }

    let user = Auth.getUser(username);
    // Fallback: fant vi ikkje profilen med eit direkte oppslag, hent HEILE
    // profil-lista frå sky (list_profiles) og prøv igjen. Fangar tilfellet der
    // get_profile bomma (transient) men profilen finst i lista.
    if (!user && window.ProfileSync && ProfileSync._enabled()) {
      await ProfileSync.pullAll().catch(() => {});
      user = Auth.getUser(username);
    }
    if (!user) {
      const current0 = Auth.current();
      app.innerHTML = `
        <div class="empty-state" style="padding:6rem;text-align:center">
          <div class="empty-icon">${Icon('user')}</div>
          <p style="font-size:1.05rem;font-weight:700;margin-bottom:0.4rem">User not found</p>
          <p style="color:var(--text2);margin-bottom:1.25rem">The profile for <b>@${username}</b> isn't synced yet. Ask the user to log in once, and the profile will become visible to everyone.</p>
          <div style="display:flex;gap:0.5rem;justify-content:center;flex-wrap:wrap">
            <button class="btn btn-ghost" onclick="Profile.renderView('${username}')">${Icon('refresh') || '↻'} Try again</button>
            <a href="#/" class="btn btn-primary" style="display:inline-flex">${Icon('arrow-left')} To home page</a>
          </div>
        </div>`;
      return;
    }

    const current = Auth.current();
    const isOwner = current?.username === username;
    const profileVisibility = user.profileVisibility || 'public';

    if (!isOwner && profileVisibility === 'private') {
      app.innerHTML = `
        <div class="empty-state" style="padding:8rem;text-align:center">
          <div class="empty-icon">${Icon('lock')}</div>
          <p style="font-size:1.1rem;font-weight:700;margin-bottom:0.5rem">This profile is private</p>
          <p style="color:var(--text2);margin-bottom:1.5rem">@${username} has chosen to keep their profile hidden.</p>
          <a href="#/" class="btn btn-primary" style="display:inline-flex">${Icon('arrow-left')} Back to home page</a>
        </div>`;
      return;
    }

    // Rolle-preg: berre for brukarar som ALDRI har justert fargane sine
    // (framleis nøyaktig på defaultTheme() sine 5 fargefelt) — då gjev vi dei
    // det rolle-flavourte utgangspunktet (Auth.roleTheme) i staden for det
    // nøytrale. Har brukaren endra ÉIN einaste farge sjølv, respekterer vi det
    // valet fullt ut og rører ingenting.
    const theme = _isDefaultThemeColors(user.theme) && Auth.roleTheme
      ? Auth.roleTheme(user.role)
      : (user.theme || Auth.defaultTheme());

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
      heroBgStyle = `background:${theme.bgGradient || 'linear-gradient(135deg,#22c55e,#16a34a)'};`;
    } else {
      heroBgStyle = `background:${theme.bgColor || '#0f0f1a'};`;
    }

    // Avatar
    const avHtml = await avatarEl(user);

    // Banner — foretrekk delbar URL (sky/Supabase) som ALLE som har profilen ser;
    // fall tilbake til lokal IndexedDB-blob for eldre opplastinger.
    let bannerUrl = user.bannerUrl || null;
    if (!bannerUrl && user.bannerMediaId) bannerUrl = await DB.getBlobUrl('media', user.bannerMediaId).catch(() => null);
    // Lagret fokuspunkt (opp/ned/venstre/høyre) som eieren har plassert bildet på.
    const bannerPos = (bannerUrl && user.bannerPos) ? user.bannerPos : 'center';

    // ── Friend request / status button ───────────────────────────────────
    let friendBtn = '';
    if (!isOwner && current) {
      const status = Auth.getFriendStatus(current.username, username);
      if (status === 'friends') {
        friendBtn = `<button class="btn btn-ghost btn-sm" id="friend-btn" onclick="Profile.removeFriend('${username}')">${Icon('check')} Friends</button>`;
      } else if (status === 'pending_sent') {
        friendBtn = `<button class="btn btn-ghost btn-sm" id="friend-btn" onclick="Profile.cancelFriendRequest('${username}')">${Icon('hourglass')} Cancel</button>`;
      } else if (status === 'pending_received') {
        friendBtn = `
          <button class="btn btn-primary btn-sm" id="friend-btn-accept" onclick="Profile.acceptFriend('${username}')">${Icon('check')} Accept</button>
          <button class="btn btn-ghost btn-sm" id="friend-btn-reject" onclick="Profile.rejectFriend('${username}')">${Icon('x')} Decline</button>`;
      } else {
        friendBtn = `<button class="btn btn-primary btn-sm" id="friend-btn" onclick="Profile.sendFriendRequest('${username}')">${Icon('users')} Add friend</button>`;
      }
    }

    // ── Send privat melding (alle innloggede besøkende, ikke bare venner) ──
    // Åpner den private 1:1-chatten (/messages/:username) som synkes på tvers av
    // ALLE brukere via Gun (SC.NS.dm) — se DJ.renderPrivateChat.
    let msgBtn = '';
    if (!isOwner && current) {
      msgBtn = `<button class="btn btn-ghost btn-sm" id="pm-btn" onclick="Router.go('/messages/${username}')">${Icon('message')} Send private message</button>`;
    }

    // ── Pending friend requests (owner only) ──────────────────────────────
    const pendingRequests = isOwner ? (user.friendRequests || []) : [];
    const pendingHtml = (isOwner && pendingRequests.length) ? `
      <div class="friend-requests-section">
        <div class="friend-requests-title">${Icon('users')} Friend requests (${pendingRequests.length})</div>
        ${pendingRequests.map(r => {
          const requester = Auth.getUser(r.from);
          if (!requester) return '';
          return `
            <div class="friend-request-row">
              <a href="#/u/${r.from}" class="friend-request-name">${requester.displayName} <span>@${r.from}</span></a>
              <div style="display:flex;gap:0.5rem">
                <button class="btn btn-primary btn-sm" onclick="Profile.acceptFriend('${r.from}');Profile.renderView('${username}')">${Icon('check')} Accept</button>
                <button class="btn btn-ghost btn-sm" onclick="Profile.rejectFriend('${r.from}');Profile.renderView('${username}')">${Icon('x')} Decline</button>
              </div>
            </div>`;
        }).join('')}
      </div>` : '';

    // ── Friends list ──────────────────────────────────────────────────────
    const friendsList = Auth.getFriends(username);
    const friendsHtml = friendsList.length ? `
      <div class="friends-section">
        <div class="friends-title">${Icon('users')} Friends (${friendsList.length})</div>
        <div class="friends-list">
          ${friendsList.map(f => `
            <div class="friend-chip-wrap">
              <a class="friend-chip" href="#/u/${f.username}">
                <div class="friend-chip-avatar" data-av-user="${esc(f.username)}">${f.displayName.charAt(0).toUpperCase()}</div>
                <span>${f.displayName}</span>
              </a>
              ${current ? `<button class="friend-chip-chat-btn" onclick="event.preventDefault();Router.go('/messages/${f.username}')" title="Send private message">${Icon('message')}</button>` : ''}
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
          <div class="fav-radio-label">${Icon('radio')} Favorite station</div>
          <div class="fav-radio-name">${esc(fr.name || 'Radio')}</div>
        </div>
        <button class="btn btn-ghost btn-sm fav-radio-play" onclick="Radio.playUrl('${(fr.url||'').replace(/'/g,"\\'")}','${(fr.name||'Radio').replace(/'/g,"\\'")}','${fr.emoji||'📻'}')">${Icon('play')} Listen</button>
      </div>`;
    })() : '';

    const wallCount = (JSON.parse(localStorage.getItem(`pv_wall_${username}`) || '[]')).length;

    app.innerHTML = `
      <div class="profile-page" id="profile-root" style="background:${theme.bgColor || '#0f0f1a'}; color:${theme.textColor || '#fff'}">
        <!-- Hero -->
        <!-- Forsidebildet (banner) MÅ ligge på .profile-hero-bg (det synlige,
             absolutt-posisjonerte laget), IKKE på .profile-hero-forelderen —
             ellers dekker det opake tema-laget banneret helt (usynlig banner). -->
        <div class="profile-hero">
          <div class="profile-hero-bg" style="${bannerUrl ? `background-image:url(${bannerUrl});background-size:cover;background-position:${bannerPos};` : heroBgStyle}">${bannerUrl ? '' : heroBgExtra}</div>
          <div class="profile-hero-overlay${isOwner ? ' profile-hero-overlay--editable' : ''}"${isOwner ? ` onclick="document.getElementById('profile-banner-input').click()" title="${bannerUrl ? 'Change cover photo' : 'Upload cover photo'}"` : ''}>
            ${isOwner ? `<span class="profile-hero-overlay-hint"${!bannerUrl ? ' style="opacity:1"' : ''}>${Icon('camera')} ${bannerUrl ? 'Change cover photo' : 'Upload cover photo'}</span>` : ''}
          </div>
          ${isOwner ? `<div class="profile-hero-banner-actions">
            <input type="file" id="profile-banner-input" accept="image/*" style="display:none" onchange="Profile.openBannerReposForFile(this,'${username}')">
            ${bannerUrl
              ? `<button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();document.getElementById('profile-banner-input').click()" title="Change cover photo">${Icon('camera')} Change background</button>
            <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();Profile.repositionBanner('${username}')" title="Move the image up/down/left/right">${Icon('maximize')} Adjust position</button>
            <button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();Profile.deleteBanner('${username}')" title="Delete cover photo">${Icon('trash')} Delete background</button>`
              : `<button class="btn btn-ghost btn-sm" onclick="event.stopPropagation();document.getElementById('profile-banner-input').click()" title="Upload cover photo">${Icon('camera')} Upload banner</button>`}
          </div>` : ''}
          ${current ? `<div class="profile-hero-actions">
            ${isOwner ? `<button class="btn btn-ghost btn-sm" onclick="Router.go('/edit')">${Icon('edit')} Edit profile</button>
            <span style="font-size:0.72rem;padding:0.2rem 0.6rem;border-radius:999px;background:rgba(0,0,0,0.4);color:#fff;backdrop-filter:blur(4px);border:1px solid rgba(255,255,255,0.15)">${profileVisibility === 'private' ? '🔒 Private' : '🌐 Public'}</span>` : ''}
            <button class="btn btn-ghost btn-sm" onclick="App.logout()" title="Log out">${Icon('log-out')} Log out</button>
          </div>` : ''}
        </div>

        <div class="profile-body">
          <!-- Header row -->
          <div class="profile-header">
            <div class="profile-avatar" style="position:relative">
              ${avHtml}
              ${(() => { const st = _statusOf(username); if (st === 'offline') return ''; const m = STATUS_META[st] || STATUS_META.online; return `<div class="profile-online-dot${m.pulse ? '' : ' profile-online-dot--static'}" title="${m.label}" style="background:${m.dot};box-shadow:0 0 8px ${m.dot}88"></div>`; })()}
              ${isOwner ? `<label class="avatar-edit-overlay" title="${user.avatarMediaId ? 'Change profile photo' : 'Add profile photo'}" style="cursor:pointer">${Icon('camera')}<input type="file" id="profile-avatar-input" accept="image/*" style="display:none" onchange="Profile.setAvatarFromProfile(this,'${username}')"></label>` : ''}
            </div>
            <div class="profile-info">
              <div class="profile-display-name" style="font-family:${theme.fontFamily || 'Inter'},sans-serif">${user.displayName}</div>
              <div class="profile-username" style="color:${theme.textColor}99">@${user.username} ${statusBadgeHtml(username, isOwner)}</div>
            </div>
            <div class="profile-actions">
              ${friendBtn}
              ${msgBtn}
              ${notifySoundBtnHtml()}
              ${isOwner ? `
                <button class="btn btn-sm ${profileVisibility === 'private' ? 'btn-primary' : 'btn-ghost'}" onclick="Profile.toggleProfileVisibility('${username}')" title="${profileVisibility === 'private' ? 'Make profile public' : 'Make profile private'}">${profileVisibility === 'private' ? '🔒 Only me' : '🌐 Public'}</button>
                <button class="btn btn-ghost btn-sm" onclick="Router.go('/edit')">${Icon('settings')} Edit</button>` : ''}
            </div>
          </div>

          ${isOwner ? `
          <!-- Profilbilde-handlinger (kun eier) — alltid alle tre synlige -->
          <div class="profile-avatar-actions" style="display:flex;flex-wrap:wrap;gap:0.5rem;margin-bottom:1rem">
            <button class="btn btn-ghost btn-sm" onclick="document.getElementById('profile-avatar-input').click()">${Icon('plus')} Add photo</button>
            <button class="btn btn-ghost btn-sm" onclick="document.getElementById('profile-avatar-input').click()">${Icon('camera')} Change photo</button>
            <button class="btn btn-ghost btn-sm" onclick="Profile.deleteAvatar('${username}')">${Icon('trash')} Delete photo</button>
          </div>` : ''}

          <!-- Stats -->
          <div class="profile-stats" style="border-color:${theme.textColor}22">
            <div class="stat"><div class="stat-value">${(user.musicIds?.length || 0) + (user.mixIds?.length || 0) + (user.mediaIds?.length || 0)}</div><div class="stat-label" style="color:${theme.textColor}88">Uploads</div></div>
            <div class="stat"><div class="stat-value">${(user.friends || []).length}</div><div class="stat-label" style="color:${theme.textColor}88">Friends</div></div>
            <div class="stat"><div class="stat-value">${wallCount}</div><div class="stat-label" style="color:${theme.textColor}88">Guestbook</div></div>
          </div>

          <!-- Tab bar -->
          <div class="profile-tabs" id="profile-tabs">
            <button class="tab-btn active" data-tab="om" onclick="Profile.switchTab('om')">About</button>
            <button class="tab-btn" data-tab="innhold" onclick="Profile.switchTab('innhold')">${Icon('music')} ${CONTENT_TAB_LABEL[user.role] || 'Content'}</button>
            <button class="tab-btn" data-tab="innlegg" onclick="Profile.switchTab('innlegg')">${Icon('edit')} Posts</button>
            <button class="tab-btn" data-tab="vegg" onclick="Profile.switchTab('vegg')">${Icon('message')} Guestbook${wallCount ? ` (${wallCount})` : ''}</button>
            ${window.Community ? `<button class="tab-btn" data-tab="community" onclick="Profile.switchTab('community')" title="The community wall — music, video and people, wall to wall">${Icon('users')} Community</button>` : ''}
            ${window.Groups ? `<button class="tab-btn" data-tab="mine-grupper" onclick="Profile.switchTab('mine-grupper')" title="Groups ${isOwner ? 'you' : esc(username)} created">${Icon('users')} ${isOwner ? 'My groups' : 'Created groups'}</button>` : ''}
            ${window.Groups ? `<button class="tab-btn" data-tab="grupper" onclick="Profile.switchTab('grupper')">${Icon('users')} Groups</button>` : ''}
            ${window.Groups ? `<button class="tab-btn" data-tab="alle-grupper" onclick="Profile.switchTab('alle-grupper')" title="See all groups created on SiriusFM">${Icon('globe')} See existing groups</button>` : ''}
            ${(isOwner && window.Groups) ? `<button class="tab-btn tab-btn-create" onclick="Groups.openCreatePage()" title="Create a new group">${Icon('plus')} Create group</button>` : ''}
          </div>

          <!-- OM-fanen -->
          <div class="profile-tab-content" data-tab="om" id="tab-om">
            ${(()=>{const m={lytter:'🎧 Listener',dj:'🎛️ DJ',produsent:'🎹 Producer',plateselskap:'🏷️ Record label'};const l=m[user.role||'lytter'];return l?`<div style="margin-bottom:0.75rem"><span class="profile-role-badge" style="background:${theme.primaryColor}33;border:1px solid ${theme.primaryColor}66;color:${theme.textColor}">${l}</span></div>`:'';})()}
            ${user.bio ? `<div class="profile-bio" style="color:${theme.textColor}cc">${user.bio}</div>` : isOwner ? `<div class="profile-bio-empty"><span style="color:${theme.textColor}55">No bio yet.</span> <a href="#/edit" style="color:${theme.primaryColor || 'var(--accent)'}">+ Add bio</a></div>` : ''}
            ${user.links?.length ? `<div class="profile-links">${user.links.map(l => `<a class="profile-link" href="${l.url}" target="_blank" rel="noopener">${Icon('link')} ${l.label}</a>`).join('')}</div>` : ''}
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

          <!-- COMMUNITY-fanen (heile SiriusFM-veggen — for alle innlogga, alle plattformer) -->
          ${window.Community ? `<div class="profile-tab-content hidden" data-tab="community" id="tab-community"></div>` : ''}

          <!-- MINE GRUPPER-fanen (gruppene brukeren selv har opprettet) -->
          ${window.Groups ? `<div class="profile-tab-content hidden" data-tab="mine-grupper" id="tab-mine-grupper"></div>` : ''}

          <!-- GRUPPER-fanen (brukerens grupper + søk/oppdag) -->
          ${window.Groups ? `<div class="profile-tab-content hidden" data-tab="grupper" id="tab-grupper"></div>` : ''}

          <!-- SE EKSISTERENDE GRUPPER-fanen (alle grupper opprettet på SiriusFM) -->
          ${window.Groups ? `<div class="profile-tab-content hidden" data-tab="alle-grupper" id="tab-alle-grupper"></div>` : ''}
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

    // Bytt initial-plassholdere (venne-chips m.m.) ut med ekte profilbilder.
    hydrateAvatars(app);

    if (theme.bgType === 'music') _startProfileVisualizer(theme);
  }

  function _startProfileVisualizer(theme) {
    const canvas = document.getElementById('profile-vis-canvas');
    if (!canvas) return;
    canvas.width  = canvas.offsetWidth  || 800;
    canvas.height = canvas.offsetHeight || 260;
    const ctx = canvas.getContext('2d');
    const primary = theme.primaryColor || '#22c55e';
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
      el.innerHTML = `<div class="empty-state"><div class="empty-icon">${Icon('image')}</div><p>${isOwner ? 'Upload your first photo or video!' : 'No media yet.'}</p>${isOwner ? `<button class="btn btn-primary mt-2" onclick="Profile.openEditorAt('innhold','media')">${Icon('arrow-up')} Upload</button>` : ''}</div>`;
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
      container.innerHTML = `<img src="https://i.ytimg.com/vi/${r.youtubeId}/hqdefault.jpg" alt="${esc(r.name || 'YouTube')}" loading="lazy" onerror="this.onerror=null;this.src='https://i.ytimg.com/vi/${r.youtubeId}/mqdefault.jpg'" style="width:100%;height:100%;object-fit:cover">`;
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
          <button class="btn-icon" onclick="openMediaModal('${r.id}')" title="View">${Icon('eye')}</button>
          ${isOwner ? `<button class="btn-icon" onclick="Profile.toggleMediaVisibility('${r.id}')" title="${isPriv ? 'Private — only you. Click to share with everyone' : 'Public — everyone sees it. Click to make private'}">${isPriv ? '🔒' : '🌐'}</button>` : ''}
          ${isOwner ? `<button class="btn-icon" onclick="Profile.shareMediaToCommunity('${r.id}')" title="Share to the community wall">📣</button>` : ''}
          ${isOwner ? `<button class="btn-icon" onclick="event.stopPropagation();Share.open('media','${r.id}')" title="Share further on Facebook etc.">🔗</button>` : ''}
          ${isOwner ? `<button class="btn-icon btn-danger" onclick="deleteMedia('${r.id}')" title="Delete">${Icon('trash')}</button>` : ''}
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
    ambient: { label: 'Experimental / Ambient', emoji: '🌌', labels: [
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
    // Plateselskap vises som eget «🏷️»-merke over kredittlinja (se musicItem),
    // så vi tar det ikke med her for å unngå dobbel visning.
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
        <div class="music-thumb" id="mthumb-${esc(r.id)}" onclick="Profile.playTrack('${esc(username)}', ${index})" style="cursor:pointer" title="Play">
          <span class="music-thumb-fallback">${Icon('music')}</span>
          <span class="music-thumb-play">${Icon('play')}</span>
        </div>
        <div class="music-meta" onclick="Profile.playTrack('${esc(username)}', ${index})" style="cursor:pointer;flex:1;min-width:0">
          <div class="music-name">${esc(title)}</div>
          <div class="music-artist">${esc(r.artist || 'Unknown artist')}</div>
          ${r.credits?.label ? `<div class="music-label">🏷️ ${esc(r.credits.label)}</div>` : ''}
          ${r.description ? `<div class="music-desc">${esc(r.description)}</div>` : ''}
          ${cat ? `<span class="music-cat-badge">${iconForEmoji(cat.emoji)} ${esc(cat.label)}</span>` : ''}
          ${songCreditsLineHtml(r.credits)}
          ${songBuyLinksHtml(r.buyLinks)}
        </div>
        <div class="music-item-right">
          <span class="music-dur">${dur}</span>
          ${!isOwner ? `<button class="btn-icon" title="Report track (stolen / already released)" onclick="event.stopPropagation();Profile.reportTrack('${esc(r.id)}','${esc(username)}')">${Icon('ban')}</button>` : ''}
          ${isOwner ? `<button class="btn-icon" title="${r.visibility === 'private' ? 'Private — only you see it. Click to make public (shown in Discover for everyone)' : 'Public — shown in Discover for everyone. Click to make private'}" onclick="event.stopPropagation();Profile.toggleTrackVisibility('${esc(r.id)}','${esc(username)}')">${r.visibility === 'private' ? '🔒' : '🌐'}</button>` : ''}
          ${isOwner ? `<button class="btn-icon" title="Share to the community wall" onclick="event.stopPropagation();Profile.shareTrackToCommunity('${esc(r.id)}','${esc(username)}')">📣</button>` : ''}
          ${isOwner ? `<button class="btn-icon" title="Share further on Facebook etc." onclick="event.stopPropagation();Share.open('music','${esc(r.id)}')">🔗</button>` : ''}
          ${isOwner ? `<button class="btn-icon music-credits-btn" title="Credits & buy links" onclick="event.stopPropagation();Profile.openSongCreditsModal('${esc(r.id)}')">${Icon('edit')}</button>` : ''}
          ${isOwner ? `<label class="music-cover-upload" title="Change cover" onclick="event.stopPropagation()">${Icon('camera')}<input type="file" accept="image/*" style="display:none" onchange="Profile.uploadMusicCover('${esc(r.id)}',this.files[0])"></label>` : ''}
          ${isOwner ? `<button class="btn-icon btn-danger music-delete-btn" title="Delete this song" onclick="event.stopPropagation();Profile.deleteTrack('${esc(r.id)}','${esc(username)}')">${Icon('trash')}</button>` : ''}
          ${isOwner && cat ? `
          <div class="music-demo-wrap">
            <button class="music-demo-btn" title="Send demo to record label"
              onclick="event.stopPropagation();Profile.toggleDemoMenu('${esc(r.id)}')">${Icon('mail')} Demo</button>
            <div class="music-demo-menu" id="demo-menu-${esc(r.id)}" style="display:none">
              ${cat.labels.map(l => `
                <a class="music-demo-link"
                   href="mailto:${esc(l.email)}?subject=${encodeURIComponent('Demo: ' + title)}&body=${encodeURIComponent('Hi,\n\nI would like to send you a demo of the track "' + title + '".\n\nBest regards')}">
                  ${esc(l.name)}
                </a>`).join('')}
            </div>
          </div>` : ''}
          ${isOwner && !cat ? `
          <a href="#/discover" class="music-setcat-btn" title="Choose main category">+ Category</a>` : ''}
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
      if (isOwner) el.innerHTML = `<div class="empty-state" style="padding:2rem 0"><div class="empty-icon">${Icon('music')}</div><p>Upload music in the profile editor</p><button class="btn btn-primary btn-sm mt-2" onclick="Profile.openEditorAt('innhold','music')">${Icon('arrow-up')} Upload</button></div>`;
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
        <div class="profile-music-title">${Icon('music')} Music</div>
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

  // Rapporter et spor for mulig opphavsrettsbrudd (stjålet / allerede utgitt).
  async function reportTrack(trackId, username) {
    if (typeof Report === 'undefined' || !Report.openTrack) return;
    let r = null;
    try { r = await DB.get('music', trackId); } catch {}
    const title  = (r && (r.name || r.title)) || '';
    const artist = (r && r.artist) || '';
    Report.openTrack(trackId, title, artist, username);
  }

  // ── Butikk (sanger til salgs / gratis nedlasting) ──────────────────────
  async function renderStoreSection(user, isOwner) {
    const el = document.getElementById('tab-store');
    if (!el || typeof Marketplace === 'undefined' || !Marketplace.isConfigured()) return;
    const products = await Marketplace.listSellerProducts(user.username).catch(() => []);
    if (!products.length) {
      el.innerHTML = isOwner
        ? `<div class="profile-store-section"><div class="profile-store-title">🛒 Store</div>
             <p style="font-size:0.82rem;color:var(--text2)">You have no songs for sale yet. Open a song in the editor (✎) → "Sell this song".</p></div>`
        : '';
      return;
    }
    el.innerHTML = `
      <div class="profile-store-section">
        <div class="profile-store-title">🛒 Store · ${products.length} ${products.length === 1 ? 'song' : 'songs'}</div>
        <div class="store-list">${products.map(p => storeCard(p, isOwner)).join('')}</div>
      </div>`;
  }

  function storeCard(p, isOwner) {
    const dur   = p.duration_sec ? `${Math.floor(p.duration_sec / 60)}:${String(Math.floor(p.duration_sec % 60)).padStart(2,'0')}` : '';
    const price = p.is_free ? 'Free' : `${(p.price_ore / 100).toFixed(0)} kr`;
    const btn   = p.is_free
      ? `<button class="btn btn-primary btn-sm" onclick="Marketplace.buySong('${esc(p.id)}')">⬇ Free download</button>`
      : `<button class="btn btn-gold btn-sm" onclick="Marketplace.buySong('${esc(p.id)}')">🛒 Buy · ${price}</button>`;
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
          ${isOwner ? `<span class="store-card-owner">Yours</span>` : btn}
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

    if (window.Notify) Notify.emit(targetUsername, { type: 'friend_request', from: current.username, fromDisplay: current.displayName, text: 'sent you a friend request', link: `#/u/${current.username}` });
    App.toast(`Friend request sent to @${targetUsername} ${Icon('users')}`, 'success');
    App.renderNav();
    renderView(targetUsername);
  }

  function acceptFriend(fromUsername) {
    const current = Auth.current();
    if (!current) return;
    const result = Auth.acceptFriendRequest(current.username, fromUsername);
    if (result.error) { App.toast(result.error, 'error'); return; }
    if (window.Notify) Notify.emit(fromUsername, { type: 'friend_accept', from: current.username, fromDisplay: current.displayName, text: 'accepted your friend request', link: `#/u/${current.username}` });
    if (window.FriendChat) FriendChat.refresh();   // dukar opp no som dei har ein venn
    App.toast(`You are now friends with @${fromUsername}! ${Icon('party')}`, 'success');
    App.renderNav();
    renderView(current.username);
  }

  function rejectFriend(fromUsername) {
    const current = Auth.current();
    if (!current) return;
    Auth.rejectFriendRequest(current.username, fromUsername);
    App.toast(`Friend request from @${fromUsername} declined`, 'info');
    App.renderNav();
    renderView(current.username);
  }

  function cancelFriendRequest(targetUsername) {
    const current = Auth.current();
    if (!current) return;
    Auth.cancelFriendRequest(current.username, targetUsername);
    App.toast('Friend request withdrawn', 'info');
    renderView(targetUsername);
  }

  function removeFriend(targetUsername) {
    const current = Auth.current();
    if (!current) return;
    Auth.removeFriend(current.username, targetUsername);
    App.toast(`@${targetUsername} removed from your friends list`, 'info');
    renderView(targetUsername);
  }

  // ── Editor ────────────────────────────────────────────────────────────
  async function renderEditor() {
    const current = Auth.current();
    if (!current) { Router.go('/login'); return; }
    _aiChatHistory = [];

    const app = document.getElementById('app');
    // Same rolle-preg-fallback som i renderProfile — elles ville editoren vist
    // dei nøytrale standardfargane sjølv om det faktisk rendra profilsida
    // allereie brukar t.d. DJ-paletten, og eit «Lagre» utan endringar ville
    // uventa NULLSTILT rolle-preget til nøytralt.
    const t = _isDefaultThemeColors(current.theme) && Auth.roleTheme
      ? Auth.roleTheme(current.role)
      : (current.theme || Auth.defaultTheme());

    _cpBlocks = JSON.parse(JSON.stringify(current.customPage?.blocks || []));

    app.innerHTML = `
    <div class="editor-layout">
      <!-- SIDEBAR -->
      <div class="editor-sidebar">
        <div class="editor-panel" style="margin-bottom:1rem">
          <div class="editor-panel-header">${Icon('user')} Profile</div>
          <div class="editor-panel-body">
            <div class="form-group">
              <label class="form-label">Display name</label>
              <input class="form-input" id="ed-displayName" value="${current.displayName}">
            </div>
            <div class="form-group">
              <label class="form-label">Bio</label>
              <textarea class="form-input" id="ed-bio" rows="4">${current.bio || ''}</textarea>
            </div>
            <div class="form-group">
              <label class="form-label">Links (press Enter to add)</label>
              <div class="chip-input-wrap" id="links-wrap">
                ${(current.links || []).map(l => chipHtml(l)).join('')}
                <input class="chip-input" id="link-input" placeholder="https://…" title="Type a URL and press Enter">
              </div>
            </div>
            <button class="btn btn-primary w-full" onclick="Profile.saveProfile()">${Icon('save')} Save profile</button>
          </div>
        </div>

        <!-- VISIBILITY PANEL -->
        <div class="editor-panel" style="margin-bottom:1rem">
          <div class="editor-panel-header">${Icon('lock')} Visibility</div>
          <div class="editor-panel-body">
            <p style="font-size:0.82rem;color:var(--text2);margin-bottom:0.75rem;line-height:1.5">
              Choose who can see your profile — whether you're a DJ, artist, record label or just here to socialize.
            </p>
            <div style="display:flex;gap:0.5rem;margin-bottom:0.75rem">
              <button id="vis-public-btn" class="btn btn-sm ${(current.profileVisibility || 'public') === 'public' ? 'btn-primary' : 'btn-ghost'}" style="flex:1" onclick="Profile.setProfileVisibility('public')">${Icon('globe')} Public</button>
              <button id="vis-private-btn" class="btn btn-sm ${(current.profileVisibility || 'public') === 'private' ? 'btn-primary' : 'btn-ghost'}" style="flex:1" onclick="Profile.setProfileVisibility('private')">${Icon('lock')} Only me</button>
            </div>
            <p id="vis-desc" style="font-size:0.75rem;color:var(--text3);line-height:1.5;margin:0">
              ${(current.profileVisibility || 'public') === 'private'
                ? 'Only you can see your profile. Others see a locked page.'
                : 'Anyone can find and view your profile.'}
            </p>
          </div>
        </div>

        <!-- ROLES PANEL -->
        <div class="editor-panel" style="margin-bottom:1rem">
          <div class="editor-panel-header">${Icon('film')} Your role</div>
          <div class="editor-panel-body">
            <div class="role-selector" id="ed-role-selector">
              ${[['lytter','🎧','Listener'],['dj','🎛️','DJ'],['produsent','🎹','Producer'],['plateselskap','🏷️','Record label']].map(([val,emoji,label]) => `<label class="role-option" onclick="Profile.selectEditorRole('${val}',this)"><input type="radio" name="ed-role" value="${val}" ${(current.role||'lytter')===val?'checked':''} style="display:none"><div class="role-option-inner ${(current.role||'lytter')===val?'active':''}"><span class="role-option-emoji">${iconForEmoji(emoji)}</span><span class="role-option-label">${label}</span></div></label>`).join('')}
            </div>
            <button class="btn btn-ghost btn-sm w-full" style="margin-top:0.75rem" onclick="Profile.saveProfile()">${Icon('save')} Save role</button>
          </div>
        </div>

        <!-- AI CHAT PANEL -->
        <div class="editor-panel">
          <div class="editor-panel-header">${Icon('bot')} AI Design Assistant</div>
          <div class="ai-chat-panel-body">
            ${!AI.hasKey() ? `<div class="ai-no-key-banner">${Icon('alert')} <a href="#/settings" style="color:#38bdf8">Add a Claude API key</a> to use the AI chat.</div>` : ''}
            <div class="ai-chat-window" id="ai-chat-window">
              <div class="ai-chat-bubble ai-chat-bubble--bot">${Icon('smile')} Hi! I'm your AI design assistant. Describe the style you want — e.g. <em>"cosmic and dark"</em>, <em>"neon DJ vibes"</em> — or ask me about colors, layout and bio!</div>
            </div>
            <div class="ai-chat-quick">
              <button class="ai-tip-btn" onclick="Profile.sendAiChatMsg('Create a color palette for a psychedelic DJ profile')">${Icon('palette')} DJ colors</button>
              <button class="ai-tip-btn" onclick="Profile.sendAiChatMsg('Write a bio based on my profile')">${Icon('edit')} Bio</button>
              <button class="ai-tip-btn" onclick="Profile.sendAiChatMsg('Suggest the best layout and font for me')">${Icon('edit')} Layout</button>
              <button class="ai-tip-btn" onclick="Profile.sendAiChatMsg('Which sections should I have on my profile?')">${Icon('lightbulb')} Tips</button>
            </div>
            <div class="ai-chat-input-row">
              <input class="form-input" id="ai-chat-input" placeholder="Ask the AI about design…"
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
            ${editorTabNavHtml()}
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
          <div class="editor-panel-header">${Icon('eye')} Live preview</div>
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
          <button class="btn btn-primary" onclick="Profile.saveProfile()">${Icon('save')} Save all changes</button>
          <a href="#/u/${current.username}" class="btn btn-ghost">${Icon('eye')} View profile</a>
        </div>
      </div>
    </div>`;

    bindEditorEvents(t);
    loadEditorMedia(current);
    loadEditorMusic(current);
    loadMyPurchases(current);
    loadEditorMixes(current);
    _loadBgMusicSelector(current, t);

    // Åpne på en spesifikk under-fane hvis noen ba om det (f.eks. «Last opp musikk»).
    if (_pendingEditorTab) {
      const { group, tab } = _pendingEditorTab;
      _pendingEditorTab = null;
      document.querySelector(`.group-tab-btn[data-group="${group}"]`)?.click();
      document.querySelector(`.editor-subtabs[data-group-tabs="${group}"] .tab-btn[data-tab="${tab}"]`)?.click();
    }
  }

  // Åpne editoren rett på en gitt gruppe/under-fane i stedet for standard Tema.
  let _pendingEditorTab = null;
  function openEditorAt(group, tab) {
    _pendingEditorTab = { group, tab };
    Router.go('/edit');
  }

  async function _loadBgMusicSelector(user, t) {
    const sel = document.getElementById('ed-bg-music-track');
    if (!sel || !user.musicIds?.length) return;
    const recs = await DB.getAllByIds('music', user.musicIds);
    sel.innerHTML = `<option value="">— Automatic (first song) —</option>` +
      recs.map(r => `<option value="${r.id}" ${t.bgMusicTrackId === r.id ? 'selected' : ''}>${r.name || r.id}</option>`).join('');
  }

  // Editor-fanene gruppert i 4 kategorier (top-nivå) med under-faner.
  // Hver under-fane: [tab-id (= etab-<id>), ikon, etikett]
  const EDITOR_GROUPS = [
    ['utseende',  'palette',  'Appearance',  [['theme','palette','Theme'],      ['avatar','user','Avatar/Banner'], ['mypage','wind','My Page']]],
    ['innhold',   'music',    'Content',   [['media','camera','Media'],     ['music','music','Music'],        ['mixes','sliders','DJ Mixes']]],
    ['aktivitet', 'calendar', 'Activity', [['events','calendar','Events'],  ['festivals','star','Festivals']]],
    ['nettverk',  'globe',    'Network',  [['labels','tag','Record labels'],['platforms','laptop','Platforms'],['mysites','globe','My Sites']]],
  ];

  function editorTabNavHtml() {
    const groupRow = EDITOR_GROUPS.map(([g, ic, label], i) =>
      `<button class="group-tab-btn ${i === 0 ? 'active' : ''}" data-group="${g}" onclick="switchEditorGroup('${g}',this)">${Icon(ic)} ${label}</button>`
    ).join('');
    const subRows = EDITOR_GROUPS.map(([g, , , tabs], i) =>
      `<div class="editor-subtabs ${i === 0 ? '' : 'hidden'}" data-group-tabs="${g}">
        ${tabs.map(([tab, tic, tlabel], j) =>
          `<button class="tab-btn ${i === 0 && j === 0 ? 'active' : ''}" data-tab="${tab}" onclick="switchEditorTab('${tab}',this)">${Icon(tic)} ${tlabel}</button>`
        ).join('')}
      </div>`
    ).join('');
    return `<div class="editor-tabnav">
      <div class="editor-group-tabs">${groupRow}</div>
      ${subRows}
    </div>`;
  }

  function themeEditorHtml(t) {
    const fonts  = ['Inter','Space Grotesk'];
    const bgTypes = ['color','gradient','image','video','music'];
    const userTracks = (Auth.current()?.musicIds || []);
    return `
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:1.5rem">
        <!-- Colors -->
        <div class="editor-section">
          <div class="editor-section-title">Colors</div>
          <div class="color-row">
            ${colorInput('Primary color',    'ed-primary',   t.primaryColor)}
            ${colorInput('Secondary color',  'ed-secondary', t.secondaryColor)}
            ${colorInput('Background color', 'ed-bg',        t.bgColor)}
            ${colorInput('Text color',     'ed-text',      t.textColor)}
            ${colorInput('Accent color',    'ed-accent',    t.accentColor)}
          </div>
        </div>

        <!-- Background -->
        <div class="editor-section">
          <div class="editor-section-title">Background</div>
          <div class="bg-type-row">
            ${bgTypes.map(t2 => `<button class="bg-type-btn ${t.bgType === t2 ? 'active' : ''}" onclick="setBgType('${t2}',this)">${{color:'Color',gradient:'Gradient',image:'Image',video:'Video',music:'🎵 Music'}[t2]}</button>`).join('')}
          </div>
          <div id="bg-color-opt" class="${t.bgType !== 'color' ? 'hidden' : ''}">
            ${colorInput('Background color','ed-bg2', t.bgColor)}
          </div>
          <div id="bg-gradient-opt" class="${t.bgType !== 'gradient' ? 'hidden' : ''}">
            <div class="form-group">
              <label class="form-label">CSS Gradient</label>
              <input class="form-input" id="ed-gradient" value="${t.bgGradient || 'linear-gradient(135deg,#22c55e,#16a34a)'}">
            </div>
          </div>
          <div id="bg-image-opt" class="${t.bgType !== 'image' ? 'hidden' : ''}">
            <div class="upload-zone" onclick="document.getElementById('bg-image-file').click()">
              <div class="upload-icon">${Icon('image')}</div>
              <div>Click to upload a background image</div>
            </div>
            <input type="file" id="bg-image-file" accept="image/*" style="display:none" onchange="Profile.uploadBgImage(this)">
            ${t.bgImage ? `<img src="${t.bgImage}" style="width:100%;height:80px;object-fit:cover;border-radius:8px;margin-top:0.5rem" id="bg-preview">` : '<div id="bg-preview"></div>'}
            <button class="paint-open-btn" id="open-paint-btn" onclick="Profile.openImagePaintEditor()" ${!t.bgImage ? 'style="display:none"' : ''}>${Icon('palette')} Open in image editor</button>
          </div>
          <div id="bg-video-opt" class="${t.bgType !== 'video' ? 'hidden' : ''}">
            <div class="upload-zone" onclick="document.getElementById('bg-video-file').click()">
              <div class="upload-icon">${Icon('film')}</div>
              <div>Click to upload a background video</div>
            </div>
            <input type="file" id="bg-video-file" accept="video/*" style="display:none" onchange="Profile.uploadBgVideo(this)">
          </div>
          <div id="bg-music-opt" class="${t.bgType !== 'music' ? 'hidden' : ''}">
            <div style="font-size:0.8rem;color:var(--text2);margin-bottom:0.5rem">Choose one of your uploaded songs as an animated background</div>
            ${userTracks.length
              ? `<select class="form-input" id="ed-bg-music-track">
                   <option value="">— Automatic (first song) —</option>
                   ${userTracks.map(id => `<option value="${id}" ${t.bgMusicTrackId === id ? 'selected' : ''}>${id}</option>`).join('')}
                 </select>`
              : `<div style="color:var(--text3);font-size:0.82rem;padding:0.5rem 0">Upload music in the Music tab to use this.</div>`}
            <div style="font-size:0.75rem;color:var(--text3);margin-top:0.5rem">Visitors see a psychedelic sound-wave animation in your hero image</div>
          </div>
        </div>

        <!-- Image filters -->
        <div class="editor-section" id="img-filter-section">
          <div class="editor-section-title">Image adjustments</div>
          <div class="image-filter-row">
            ${filterSlider('Brightness', 'f-brightness', t.bgImageFilters?.brightness ?? 100, 0, 200)}
            ${filterSlider('Contrast',  'f-contrast',   t.bgImageFilters?.contrast  ?? 100, 0, 200)}
            ${filterSlider('Saturation',   'f-saturation', t.bgImageFilters?.saturation ?? 100, 0, 200)}
            ${filterSlider('Hue', 'f-hue',        t.bgImageFilters?.hue        ?? 0, 0, 360)}
            ${filterSlider('Grayscale','f-grayscale', t.bgImageFilters?.grayscale  ?? 0, 0, 100)}
          </div>
          <div style="display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:0.5rem">
            <button class="paint-open-btn" style="width:auto;padding:4px 10px;font-size:0.75rem" onclick="document.getElementById('f-grayscale').value=100;document.getElementById('f-grayscale-val').textContent=100;document.getElementById('f-saturation').value=0;document.getElementById('f-saturation-val').textContent=0;Profile.livePreview()">${Icon('square')} Black & White</button>
            <button class="paint-open-btn" style="width:auto;padding:4px 10px;font-size:0.75rem;background:#16a34a" onclick="document.getElementById('f-brightness').value=100;document.getElementById('f-brightness-val').textContent=100;document.getElementById('f-contrast').value=100;document.getElementById('f-contrast-val').textContent=100;document.getElementById('f-saturation').value=100;document.getElementById('f-saturation-val').textContent=100;document.getElementById('f-hue').value=0;document.getElementById('f-hue-val').textContent=0;document.getElementById('f-grayscale').value=0;document.getElementById('f-grayscale-val').textContent=0;Profile.livePreview()">${Icon('rotate-ccw')} Reset</button>
          </div>
        </div>

        <!-- Font & Layout -->
        <div class="editor-section">
          <div class="editor-section-title">Typography & Layout</div>
          <div class="form-group">
            <label class="form-label">Font</label>
            <select class="form-input font-select" id="ed-font">
              ${fonts.map(f => `<option ${t.fontFamily === f ? 'selected' : ''}>${f}</option>`).join('')}
            </select>
          </div>
          <div class="editor-section-title">Layout</div>
          <div class="layout-grid">
            ${layoutOption('default', 'Standard', '▤', t.layout)}
            ${layoutOption('centered', 'Centered', '▥', t.layout)}
            ${layoutOption('sidebar', 'Sidebar', '▧', t.layout)}
          </div>
          <div class="editor-section-title" style="margin-top:1rem">Card style</div>
          <div class="bg-type-row">
            ${['glass','solid','outline'].map(s => `<button class="bg-type-btn ${t.cardStyle===s?'active':''}" onclick="setCardStyle('${s}',this)">${{glass:'Glass',solid:'Solid',outline:'Outline'}[s]}</button>`).join('')}
          </div>
        </div>
      </div>
    `;
  }

  function mediaUploadHtml() {
    return `
      <div class="upload-zone" id="media-dropzone" onclick="document.getElementById('media-file-input').click()">
        <div class="upload-icon">${Icon('camera')}</div>
        <div style="font-weight:600;margin-bottom:0.25rem">Click or drag to upload</div>
        <div style="font-size:0.8rem;color:var(--text3)">Photos and videos from parties &amp; events</div>
      </div>
      <input type="file" id="media-file-input" accept="image/*,video/*" multiple style="display:none" onchange="Profile.uploadMedia(this.files)">
      <div style="display:flex;gap:0.5rem;margin-top:0.75rem">
        <input class="form-input" id="media-url-input" placeholder="… or paste a YouTube link" style="flex:1" onkeydown="if(event.key==='Enter'){event.preventDefault();Profile.addMediaLink();}">
        <button class="btn btn-secondary btn-sm" onclick="Profile.addMediaLink()">${Icon('plus')} Add</button>
      </div>
      <button class="btn btn-ghost btn-sm" style="margin-top:0.75rem;width:100%" onclick="VideoEditor.open()">${Icon('film')} 🎬 Swap the audio on a video (set your own song/mix)</button>
      <div id="media-upload-list" style="margin-top:1rem"></div>
      <div id="editor-media-grid" style="margin-top:1rem"></div>
    `;
  }

  function musicUploadHtml() {
    return `
      <div class="upload-zone" onclick="document.getElementById('music-file-input').click()">
        <div class="upload-icon">${Icon('music')}</div>
        <div style="font-weight:600;margin-bottom:0.25rem">Upload music</div>
        <div style="font-size:0.8rem;color:var(--text3)">MP3, WAV, AAC, FLAC supported</div>
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
      <div class="profile-store-title">⬇ My purchases</div>
      <div class="store-list">${purchases.map(p => `
        <div class="store-card">
          <div class="store-card-meta">
            <div class="store-card-title">${esc(p.title)}</div>
            <div class="store-card-sub">${esc(p.artist || '')}${p.seller ? ' · @' + esc(p.seller) : ''}</div>
          </div>
          <div class="store-card-right">
            <button class="btn btn-ghost btn-sm" onclick="Marketplace.download('${esc(p.productId)}')">⬇ Download</button>
          </div>
        </div>`).join('')}</div>`;
  }

  function avatarBannerHtml() {
    return `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem">
        <div>
          <div class="editor-section-title">Profile photo (Avatar)</div>
          <div class="upload-zone" onclick="document.getElementById('avatar-input').click()">
            <div class="upload-icon">${Icon('user')}</div>
            <div>Upload profile photo</div>
          </div>
          <input type="file" id="avatar-input" accept="image/*" style="display:none" onchange="Profile.uploadAvatar(this)">
          <div id="avatar-preview" style="margin-top:0.75rem"></div>
        </div>
        <div>
          <div class="editor-section-title">Banner</div>
          <div class="upload-zone" onclick="document.getElementById('banner-input').click()">
            <div class="upload-icon">${Icon('image')}</div>
            <div>Upload banner</div>
          </div>
          <input type="file" id="banner-input" accept="image/*" style="display:none" onchange="Profile.uploadBanner(this)">
          <div id="banner-preview" style="margin-top:0.75rem"></div>
        </div>
      </div>
    `;
  }

  // ── Small helpers ─────────────────────────────────────────────────────
  function colorInput(label, id, val) {
    return `<div class="color-item"><input type="color" id="${id}" value="${val || '#22c55e'}" oninput="Profile.livePreview()"><span>${label}</span></div>`;
  }
  function filterSlider(label, id, val, min, max) {
    return `<div class="filter-item"><div class="filter-label"><span>${label}</span><span id="${id}-val">${val}</span></div><input type="range" id="${id}" min="${min}" max="${max}" value="${val}" oninput="document.getElementById('${id}-val').textContent=this.value;Profile.livePreview()"></div>`;
  }
  function layoutOption(val, label, icon, current) {
    return `<div class="layout-option ${current===val?'active':''}" onclick="setLayout('${val}',this)"><span>${icon}</span>${label}</div>`;
  }
  function chipHtml(l) {
    return `<span class="chip">${l.label || l.url}<button onclick="Profile.removeLink(this,'${l.url}')" title="Remove">${Icon('x')}</button></span>`;
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
        chip.innerHTML = `${label}<button onclick="Profile.removeLink(this,'${url}')" title="Remove">${Icon('x')}</button>`;
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

    // Bytt top-nivå-gruppe: vis gruppens under-fane-rad og åpne dens første fane
    window.switchEditorGroup = (group, btn) => {
      document.querySelectorAll('.group-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('[data-group-tabs]').forEach(row =>
        row.classList.toggle('hidden', row.dataset.groupTabs !== group)
      );
      document.querySelector(`[data-group-tabs="${group}"] .tab-btn`)?.click();
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
    if (!ids.length) { grid.innerHTML = '<p class="text-muted text-sm">No media yet.</p>'; return; }
    const recs = await DB.getAllByIds('media', ids);
    grid.innerHTML = `<div class="media-grid">${recs.map(r => mediaCard(r, true)).join('')}</div>`;
    await Promise.all(recs.map(r => fillMediaContainer(r, document.getElementById(`media-${r.id}`))));
  }

  async function loadEditorMusic(user) {
    if (window.Community) Community.subscribe();
    const list = document.getElementById('editor-music-list');
    if (!list) return;
    const ids = user.musicIds || [];
    if (!ids.length) { list.innerHTML = '<p class="text-muted text-sm">No music yet.</p>'; return; }
    const recs = await DB.getAllByIds('music', ids);
    list.innerHTML = `<div class="music-list">${recs.map((r, i) => musicItem(r, i, user.username, true)).join('')}</div>`;
    loadMusicCoverArts(recs);
  }

  // ── Sang-kreditering & kjøpslenker ────────────────────────────────────
  async function openSongCreditsModal(trackId) {
    const current = Auth.current();
    if (!current) return;
    const rec = await DB.get('music', trackId);
    if (!rec) { App.toast('Track not found', 'error'); return; }
    const c = rec.credits  || {};
    const b = rec.buyLinks || {};
    const box = document.getElementById('modal-box');
    if (!box) return;
    box.innerHTML = `
      <div class="modal-header">
        <h2>${Icon('edit')} Credits & buy links</h2>
        <button class="btn-icon" onclick="App.closeModal()">${Icon('x')}</button>
      </div>
      <div class="mix-edit-modal">
        <input type="hidden" id="sc-track-id" value="${esc(trackId)}">

        <div class="mix-edit-section-title">Track</div>
        <div class="form-group">
          <label class="form-label">Title</label>
          <input class="form-input" id="sc-title" value="${esc(rec.name || rec.title || '')}" placeholder="Song title">
        </div>

        <div class="mix-edit-section-title">Credits</div>
        <div class="form-group">
          <label class="form-label">Artist name</label>
          <input class="form-input" id="sc-artist" value="${esc(rec.artist || '')}" placeholder="Artist name">
        </div>
        <div class="form-group">
          <label class="form-label">Label (record label)</label>
          <input class="form-input" id="sc-label" value="${esc(c.label || '')}" placeholder="Record label">
        </div>
        <div class="form-group">
          <label class="form-label">Producer</label>
          <input class="form-input" id="sc-producer" value="${esc(c.producer || '')}" placeholder="Producer">
        </div>
        <div class="form-group">
          <label class="form-label">Mixing</label>
          <input class="form-input" id="sc-mixing" value="${esc(c.mixing || '')}" placeholder="Mixing engineer">
        </div>
        <div class="form-group">
          <label class="form-label">Mastering</label>
          <input class="form-input" id="sc-mastering" value="${esc(c.mastering || '')}" placeholder="Mastering engineer">
        </div>

        <div class="mix-edit-section-title">Buy links</div>
        <p style="font-size:0.75rem;color:var(--text3);margin:-0.25rem 0 0.5rem">Paste a link to the main page where the song can be bought/streamed (optional).</p>
        ${BUY_SERVICES.map(s => `
          <div class="form-group">
            <label class="form-label">${s.name}</label>
            <input class="form-input" id="sc-buy-${s.key}" value="${esc(b[s.key] || '')}" placeholder="https://… (optional)">
          </div>`).join('')}

        <div class="mix-edit-section-title">Sell this song</div>
        <div class="form-group">
          <label class="form-label">Cover image <span style="color:var(--text3);font-weight:400;font-size:0.8rem">(optional)</span></label>
          <div class="upload-zone" style="padding:1rem" onclick="document.getElementById('sc-cover-input').click()">
            <div class="upload-icon">${Icon('image')}</div>
            <div style="font-size:0.82rem">Click to upload a cover</div>
          </div>
          <input type="file" id="sc-cover-input" accept="image/*" style="display:none" onchange="Profile.uploadSaleCover('${esc(trackId)}', this.files)">
          <div id="sc-cover-preview" style="margin-top:0.5rem">${rec.coverUrl ? `<img src="${esc(rec.coverUrl)}" alt="" style="max-width:120px;max-height:120px;border-radius:8px;display:block">` : ''}</div>
        </div>
        <label style="display:flex;align-items:center;gap:0.5rem;font-size:0.85rem;margin-bottom:0.5rem">
          <input type="checkbox" id="sc-sale-free" ${rec.saleFree ? 'checked' : ''}
            onchange="document.getElementById('sc-price-wrap').style.display=this.checked?'none':'block'">
          Free download
        </label>
        <div class="form-group" id="sc-price-wrap" style="display:${rec.saleFree ? 'none' : 'block'}">
          <label class="form-label">Price (NOK)</label>
          <input class="form-input" id="sc-price" type="number" min="0" step="1" value="${rec.salePriceNok || ''}" placeholder="e.g. 49">
        </div>
        <div style="display:flex;gap:0.5rem;flex-wrap:wrap">
          <button class="btn btn-gold btn-sm" onclick="Marketplace.listSongFromModal('${esc(trackId)}')">🛒 ${rec.forSale ? 'Update in store' : 'List for sale'}</button>
          <button class="btn btn-ghost btn-sm" onclick="Marketplace.becomeSeller()">🏦 Become a seller (Stripe)</button>
        </div>
        <p style="font-size:0.72rem;color:var(--text3);margin-top:0.4rem">Paid sales require completed Stripe onboarding ("Become a seller"). Free downloads don't. Save credits first.</p>

        <div style="display:flex;gap:0.75rem;margin-top:1.25rem">
          <button class="btn btn-primary" onclick="Profile.saveSongCredits()">${Icon('save')} Save</button>
          <button class="btn btn-ghost" onclick="App.closeModal()">Cancel</button>
        </div>
      </div>`;
    App.openModal();
  }

  async function saveSongCredits() {
    const trackId = document.getElementById('sc-track-id')?.value;
    if (!trackId) return;
    const rec = await DB.get('music', trackId);
    if (!rec) { App.toast('Track not found', 'error'); return; }
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
    App.toast('Credits saved! 🎶', 'success');
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
              <div class="mix-sub-title">${Icon('sliders')} DJ Mix Upload</div>
              <div class="mix-sub-desc">Free: up to 3 hours, public visibility · <strong>Pro:</strong> no time limit + private/public</div>
            </div>
            <button class="btn btn-gold btn-sm" onclick="Profile.upgradeToPro()">${Icon('star')} Upgrade to Pro</button>
          </div>
        </div>` : `
        <div class="mix-sub-banner mix-sub-banner--pro">
          <div class="mix-sub-banner-inner">
            <span class="mix-pro-badge">${Icon('star')} Pro</span>
            <span style="font-size:0.85rem;color:var(--text2)">Mixes with no time limit · private/public · unlimited storage</span>
          </div>
        </div>`}
        <div class="upload-zone" id="mix-dropzone" onclick="document.getElementById('mix-file-input').click()">
          <div class="upload-icon">${Icon('sliders')}</div>
          <div style="font-weight:600;margin-bottom:0.25rem">Upload DJ Mix</div>
          <div style="font-size:0.8rem;color:var(--text3)">MP3, WAV, AAC, FLAC · 1 minute – ${isPro ? '20' : '3'} hours per mix</div>
        </div>
        <input type="file" id="mix-file-input" accept="audio/*" style="display:none" onchange="Profile.uploadMix(this.files)">
        <button class="btn btn-ghost btn-sm" style="margin-top:0.6rem;width:100%" onclick="Profile.openUploadModal('url')">${Icon('link')} … or paste a link (SoundCloud, Mixcloud, YouTube …)</button>
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
        el.innerHTML = `<div class="empty-state" style="padding:2rem 0"><div class="empty-icon">${Icon('sliders')}</div><p>Upload your first DJ mix — audio file (1 min – 3 h) or link</p><button class="btn btn-primary btn-sm mt-2" onclick="Profile.openUploadModal()">${Icon('arrow-up')} Upload</button></div>`;
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
          <div class="mix-card-cover" id="mixcover-${r.id}">${r.coverUrl ? `<img src="${esc(r.coverUrl)}" class="mix-cover-img" alt="Cover">` : Icon('sliders')}</div>
          <div class="mix-card-meta">
            <div class="mix-card-title">${r.title || r.name}</div>
            ${r.description ? `<div class="mix-card-desc">${r.description}</div>` : ''}
            <div class="mix-card-stats">
              <span>${dur}</span>
              ${isPrivate ? '<span class="mix-badge mix-badge--private">🔒 Private</span>' : '<span class="mix-badge mix-badge--public">🌐 Public</span>'}
            </div>
          </div>
          <div class="mix-card-actions">
            <button class="mix-play-btn" onclick="Profile.playMix('${r.id}','${(r.title||r.name).replace(/'/g,"\\'")}')">${Icon('play')} Play</button>
            ${isOwner ? `
              <button class="btn btn-ghost btn-sm" onclick="Profile.openMixEditModal('${r.id}','${username}')">${Icon('edit')} Edit</button>
              <button class="btn-icon" onclick="Share.open('mixes','${r.id}')" title="Share further on Facebook etc.">🔗</button>
              <button class="btn-icon" onclick="Profile.toggleMixVisibility('${r.id}','${username}')" title="${isPrivate ? 'Make public' : 'Make private'}">${isPrivate ? '🌐' : '🔒'}</button>
              <button class="btn-icon btn-danger" onclick="Profile.deleteMix('${r.id}','${username}')" title="Delete">${Icon('trash')}</button>` : ''}
          </div>
        </div>
        ${(r.tracklist && r.tracklist.length) ? mixTracklistHtml(r.tracklist, labels) : ''}
        <div class="mix-comments-section">
          <div class="mix-comments-title">${Icon('message')} Comments (${comments.length})</div>
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
            <input class="mix-comment-input form-input" id="mix-ci-${r.id}" placeholder="Write a comment…" onkeydown="if(event.key==='Enter')Profile.addMixComment('${r.id}')">
            <button class="btn btn-primary btn-sm" onclick="Profile.addMixComment('${r.id}')">Send</button>
          </div>` : `<div style="font-size:0.78rem;color:var(--text3);margin-top:0.5rem"><a href="#/login" style="color:#38bdf8">Log in</a> to comment</div>`}
        </div>
      </div>`;
  }

  function formatDuration(secs) {
    if (secs >= 3600) {
      const h = Math.floor(secs / 3600);
      const m = Math.floor((secs % 3600) / 60);
      return `${h}h ${String(m).padStart(2,'0')}m`;
    }
    return `${Math.floor(secs/60)}:${String(Math.floor(secs%60)).padStart(2,'0')}`;
  }

  function timeAgo(ts) {
    const diff = Date.now() - ts;
    if (diff < 60000)   return 'just now';
    if (diff < 3600000) return `${Math.floor(diff/60000)} min ago`;
    if (diff < 86400000) return `${Math.floor(diff/3600000)} h ago`;
    return new Date(ts).toLocaleDateString('no-NO');
  }

  function mixTracklistHtml(tracks, labels) {
    const rows = tracks.map((t, i) => {
      const label = labels.find(l => l.id === t.labelId);
      return `
        <div class="tl-row">
          <span class="tl-num">${i + 1}</span>
          ${t.artist ? `<span class="tl-artist">${t.artist}</span><span class="tl-sep">–</span>` : ''}
          <span class="tl-title">${t.title || 'Unknown track'}</span>
          ${label ? `<span class="tl-label-badge">${label.name}</span>` : ''}
          ${t.purchaseUrl ? `<a class="tl-buy-link" href="${t.purchaseUrl}" target="_blank" rel="noopener noreferrer">${Icon('cart')} Buy</a>` : ''}
        </div>`;
    }).join('');
    return `
      <div class="mix-tracklist-section">
        <details>
          <summary>▾ Tracklist (${tracks.length} tracks)</summary>
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
      ? `<option value="">— Choose record label —</option>` + labels.map(l => `<option value="${l.id}">${l.name}</option>`).join('')
      : `<option value="">No record labels added</option>`;

    const trackRows = tracklist.map((t, i) => {
      const label = labels.find(l => l.id === t.labelId);
      return `
        <div class="tl-editor-track-row" data-track-id="${t.id}">
          <span class="tl-editor-track-num">${i + 1}</span>
          <div class="tl-editor-track-info">
            <div class="name">${t.artist ? `${t.artist} – ` : ''}${t.title || 'Unknown'}</div>
            <div class="sub">${label ? label.name : ''}${t.purchaseUrl ? ' · 🛒' : ''}</div>
          </div>
          <button class="btn-icon btn-danger btn-sm" onclick="Profile.removeTrackFromModal('${t.id}')">${Icon('trash')}</button>
        </div>`;
    }).join('');

    const box = document.getElementById('modal-box');
    box.innerHTML = `
      <div class="modal-header">
        <h2>${Icon('edit')} Edit mix</h2>
        <button class="btn-icon" onclick="App.closeModal()">${Icon('x')}</button>
      </div>
      <div class="mix-edit-modal" id="mix-edit-modal-body">
        <input type="hidden" id="mxed-mix-id" value="${mixId}">
        <input type="hidden" id="mxed-username" value="${username}">

        <div class="mix-edit-section-title">Cover image</div>
        <div style="display:flex;align-items:center;gap:1rem;margin-bottom:0.5rem">
          <div class="mix-cover-preview" id="mix-cover-preview" onclick="document.getElementById('mxed-cover-input').click()">
            ${rec.coverMediaId ? '<span style="font-size:0.7rem;opacity:0.5">Loading…</span>' : '📷'}
          </div>
          <div style="flex:1">
            <input type="file" id="mxed-cover-input" accept="image/*" style="display:none" onchange="Profile.uploadMixCover('${mixId}', this.files[0])">
            <button class="btn btn-ghost btn-sm" onclick="document.getElementById('mxed-cover-input').click()">Choose image</button>
            <div style="font-size:0.72rem;opacity:0.45;margin-top:0.3rem">Click the image or the button to upload</div>
          </div>
        </div>

        <div class="mix-edit-section-title">Description</div>
        <textarea class="form-input" id="mxed-desc" rows="2" placeholder="Describe the mix…" style="width:100%;resize:vertical">${rec.description || ''}</textarea>

        <div class="mix-edit-section-title">Tracklist</div>
        <div class="tl-editor-add-row">
          <input class="form-input" id="tled-title" placeholder="Song title *" style="min-width:120px;flex:2">
          <input class="form-input" id="tled-artist" placeholder="Artist" style="min-width:100px;flex:2">
          <select class="form-input" id="tled-label" style="min-width:120px;flex:2">${labelOptions}</select>
          <input class="form-input" id="tled-url" placeholder="Buy link (URL)" style="min-width:130px;flex:3">
          <button class="btn btn-ghost btn-sm" title="Search on Google" onclick="Profile.searchTrackOnGoogle()" style="flex-shrink:0">${Icon('search')}</button>
          <button class="btn btn-primary btn-sm" onclick="Profile.addTrackToModal()">+ Add</button>
        </div>
        <div id="tled-track-list">${trackRows || '<p style="font-size:0.8rem;opacity:0.45;margin:0">No tracks added yet.</p>'}</div>

        <div style="display:flex;gap:0.75rem;margin-top:1.25rem">
          <button class="btn btn-primary" onclick="Profile.saveMixEdits()">${Icon('save')} Save</button>
          <button class="btn btn-ghost" onclick="App.closeModal()">Cancel</button>
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
    if (rec.coverMediaId) await DB.delete('media', rec.coverMediaId).catch(() => {});

    // Skyen (offentlig coverUrl → deles på sosiale medier) når konfigurert,
    // ellers lokal blob-fallback.
    let coverUrl = null, coverMediaId = null, previewUrl = null;
    if ((typeof SC_Storage !== 'undefined') && SC_Storage.isConfigured()) {
      try { const cov = await SC_Storage.upload(file, { prefix: 'mixcover' }); coverUrl = cov.url; previewUrl = cov.url; }
      catch (e) { if (e && e.message !== 'not-configured') console.warn('Cover-sky feilet:', e.message); }
    }
    if (!coverUrl) {
      coverMediaId = `mxcv_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      await DB.storeFile('media', coverMediaId, file);
      previewUrl = await DB.getBlobUrl('media', coverMediaId).catch(() => null);
    }
    rec.coverUrl = coverUrl; rec.coverMediaId = coverMediaId;
    await DB.put('mixes', rec);
    if (previewUrl) {
      const prev = document.getElementById('mix-cover-preview');
      if (prev) prev.innerHTML = `<img src="${previewUrl}" class="mix-cover-img" alt="Cover">`;
    }
    App.toast('Cover uploaded! 🖼️', 'success');
  }

  function searchTrackOnGoogle() {
    const title  = document.getElementById('tled-title')?.value?.trim();
    const artist = document.getElementById('tled-artist')?.value?.trim();
    if (!title && !artist) { App.toast('Enter a song title or artist first', 'info'); return; }
    const q = encodeURIComponent([artist, title].filter(Boolean).join(' ') + ' buy');
    window.open('https://www.google.com/search?q=' + q, '_blank', 'noopener');
  }

  function addTrackToModal() {
    const titleEl  = document.getElementById('tled-title');
    const artistEl = document.getElementById('tled-artist');
    const labelEl  = document.getElementById('tled-label');
    const urlEl    = document.getElementById('tled-url');
    const title = titleEl?.value?.trim();
    if (!title) { App.toast('Song title is required', 'error'); return; }
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
      listEl.innerHTML = '<p style="font-size:0.8rem;opacity:0.45;margin:0">No tracks added yet.</p>';
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
    App.toast('Mix updated! ✓', 'success');
    renderMixesSection(current, true);
    loadEditorMixes(current);
  }

  async function playMix(id, title) {
    const rec = await DB.get('mixes', id);
    if (rec && rec.kind === 'url') { _playMixEmbed(rec); return; }
    const url = (rec && rec.audioUrl) || await DB.getBlobUrl('mixes', id);
    if (!url) { App.toast('Could not load mix', 'error'); return; }
    Player.playExternal(url, title, 'DJ Mix');
  }

  async function toggleMixVisibility(id, username) {
    const current = Auth.current();
    if (!current || current.username !== username) return;
    if (current.subscription !== 'pro') {
      App.toast('Private visibility requires a Pro subscription ⭐', 'error');
      return;
    }
    const rec = await DB.get('mixes', id);
    if (!rec) return;
    const newVis = rec.visibility === 'private' ? 'public' : 'private';
    rec.visibility = newVis;
    await DB.put('mixes', rec);
    App.toast(newVis === 'private' ? '🔒 Mix set to private' : '🌐 Mix set to public', 'success');
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
    App.toast(rec.visibility === 'private' ? '🔒 Song set to private (only you)' : '🌐 Song made public (everyone)', 'success');
    renderMusicPlayer(current, true);
    loadEditorMusic(current);
  }

  // Slett en opplastet sang permanent (eier-gated). Speiler deleteMix:
  // fjerner cover-blob + selve sang-posten, oppdaterer user.musicIds,
  // og rydder elementet ut av både editoren og profilens spilleliste.
  async function deleteTrack(id, username) {
    const current = Auth.current();
    if (!current || current.username !== username) return;
    if (!confirm('Delete this song permanently? This cannot be undone.')) return;
    const rec = await DB.get('music', id);
    if (rec?.coverMediaId) await DB.delete('media', rec.coverMediaId).catch(() => {});
    await DB.delete('music', id).catch(() => {});
    current.musicIds = (current.musicIds || []).filter(x => x !== id);
    Auth.updateUser(current.username, { musicIds: current.musicIds });
    document.getElementById(`mitem-${id}`)?.remove();
    App.toast('Song deleted', 'info');
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
    App.toast('Mix deleted', 'info');
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
        Notify.emit(owner.username, { type: 'comment', text: 'commented on your mix', link: `#/u/${owner.username}` });
      }
    }
    const listEl = document.getElementById(`mix-comments-${mixId}`);
    if (listEl) {
      const div = document.createElement('div');
      div.className = 'mix-comment';
      div.innerHTML = `<a class="mix-comment-author" href="#/u/${encodeURIComponent(comment.username || '')}">@${esc(comment.username)}</a><span class="mix-comment-text">${esc(comment.text)}</span><span class="mix-comment-time">just now</span>`;
      listEl.appendChild(div);
    }
    const titleEl = listEl?.closest('.mix-comments-section')?.querySelector('.mix-comments-title');
    if (titleEl) titleEl.textContent = `${Icon('message')} Comments (${comments.length})`;
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
    if (tab === 'community' && window.Community && Community.renderInto) {
      Community.renderInto(document.getElementById('tab-community'));
    }
    if (tab === 'mine-grupper' && window.Groups && Groups.renderMyGroups) {
      Groups.renderMyGroups('tab-mine-grupper', _viewUser);
    }
    if (tab === 'grupper' && window.Groups && Groups.renderProfileGroups) {
      Groups.renderProfileGroups('tab-grupper', _viewUser);
    }
    if (tab === 'alle-grupper' && window.Groups && Groups.renderAllGroups) {
      Groups.renderAllGroups('tab-alle-grupper');
    }
  }

  // ── Profile wall (gjestebok) — no Gun-basert via Social ────────────────
  // Kryss-brukar kommentarar + 👍/👎 + emoji (same kode som vegg-innlegga).
  // targetKey = 'profile:<username>'. Andre kan skrive på profilen din og du ser det.
  function renderWallTab(username, isOwner) {
    const el = document.getElementById('tab-wall');
    if (!el) return;
    if (!window.Social) { el.innerHTML = '<p class="text-muted text-sm">Loading guestbook…</p>'; return; }
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
    if (!ids.length) { list.innerHTML = '<p class="text-muted text-sm">No mixes yet.</p>'; return; }
    const recs = await DB.getAllByIds('mixes', ids);
    const isPro = user.subscription === 'pro';
    list.innerHTML = recs.map(r => `
      <div class="mix-editor-item" id="mixedit-${r.id}">
        <div class="mix-card-cover" id="mixcover-edit-${r.id}" style="width:36px;height:36px;font-size:1.1rem;border-radius:7px;flex-shrink:0">${r.coverUrl ? `<img src="${esc(r.coverUrl)}" class="mix-cover-img" alt="">` : Icon('sliders')}</div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:0.88rem">${r.title || r.name}</div>
          <div style="font-size:0.75rem;color:var(--text2)">${formatDuration(r.duration || 0)} · ${r.visibility === 'private' ? '🔒 Private' : '🌐 Public'}${(r.tracklist && r.tracklist.length) ? ` · ${r.tracklist.length} tracks` : ''}</div>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="Profile.openMixEditModal('${r.id}','${user.username}')">${Icon('edit')}</button>
        <button class="btn-icon" onclick="Share.open('mixes','${r.id}')" title="Share further on Facebook etc.">🔗</button>
        ${isPro ? `<button class="btn btn-ghost btn-sm" onclick="Profile.toggleMixVisibility('${r.id}','${user.username}')">${r.visibility === 'private' ? '🌐' : '🔒'}</button>` : ''}
        <button class="btn-icon btn-danger" onclick="Profile.deleteMix('${r.id}','${user.username}')" title="Delete">${Icon('trash')}</button>
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
  const MIX_PRICE_PER_HOUR_KR = 60;          // over 3 t: 60 kr per påbegynt time (engangs)

  // Effektiv per-miks-grense for en (ikke-Pro) bruker: 3 t + evt. kjøpte timer.
  // uploadCreditSec er engangs-kreditt (kjøpt for én over-grensen-miks) og brukes
  // opp så snart en miks over 3 t faktisk er lastet opp.
  function mixLimitFor(current) {
    return FREE_MIX_MAX_SECONDS + Math.max(0, (current && current.uploadCreditSec) || 0);
  }
  function consumeMixCredit(current, duration) {
    if (!current || duration <= FREE_MIX_MAX_SECONDS) return;
    if (current.uploadCreditSec) {
      Auth.updateUser(current.username, { uploadCreditSec: 0 });
      current.uploadCreditSec = 0;
    }
  }

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
        if (duration > 0 && duration < 60) { App.toast(`${file.name}: the mix is shorter than 1 minute`, 'error'); row.remove(); continue; }
        if (!isPro && duration > mixLimitFor(current)) {
          row.remove();
          openMixPaywall(duration);
          continue;
        }
      } catch {}

      const titleRaw = file.name.replace(/\.[^.]+$/, '');
      const meta = {
        title:       titleRaw,
        description: '',
        visibility:  'public',
        uploaderUsername: current.username,
        uploadedAt:  Date.now(),
        duration,
        coverMediaId: null,
        coverUrl:    null,
        tracklist:    [],
        audioUrl:    null, storagePath: null, mime: file.type,
      };
      // Skylagring (offentlig URL) når konfigurert → mixen kan deles på sosiale
      // medier. Ellers lokal blob-fallback (kan ikke forhåndsvises).
      let shared = false;
      if ((typeof SC_Storage !== 'undefined') && SC_Storage.isConfigured()) {
        try {
          const res = await SC_Storage.upload(file, { prefix: 'mix' });
          meta.audioUrl = res.url; meta.storagePath = res.path;
          await DB.put('mixes', { id, ...meta });
          shared = true;
        } catch (e) { if (e && e.message !== 'not-configured') console.warn('Sky-opplasting av mix feilet, lagrer lokalt:', e.message); }
      }
      if (!shared) await DB.storeFile('mixes', id, file, meta);
      current.mixIds = [...(current.mixIds || []), id];
      Auth.updateUser(current.username, { mixIds: current.mixIds });
      consumeMixCredit(current, duration);
      if (progressEl) {
        row.innerHTML = `${Icon('check-circle')} ${file.name}`;
        if (shared) {
          const b = document.createElement('button');
          b.className = 'btn btn-ghost btn-sm'; b.style.cssText = 'margin-left:0.5rem';
          b.innerHTML = '🔗 Share further';
          b.onclick = () => Share.open('mixes', id);
          row.appendChild(b);
        } else { setTimeout(() => row.remove(), 2000); }
      }
    }
    loadEditorMixes(Auth.current());
    App.toast('Mix uploaded! 🎛️', 'success');
  }

  // ── Samlet opplastingsmodal (lydfil 1min–3t ELLER lenke/URL) ───────────
  // Åpnes rett fra profilen/editoren — ingen omvei via tema-editoren.
  // Fil-modus: lyd + valgfritt cover-bilde (egen «fane» for ren lydfil).
  // URL-modus: henter forhåndsvisningsbilde via /api/unfurl og lagrer en
  // spillbar mix med innebygd spiller (SoundCloud/YouTube/Spotify/…).
  let _umFile = null, _umDuration = 0, _umCoverFile = null, _umPreview = null;

  function openUploadModal(mode) {
    const current = Auth.current();
    if (!current) { Router.go('/login'); return; }
    _umFile = null; _umDuration = 0; _umCoverFile = null; _umPreview = null;
    const isPro = current.subscription === 'pro';
    const maxLabel = isPro ? '20 hours' : '3 hours';
    const box = document.getElementById('modal-box');
    box.innerHTML = `
      <div class="modal-header">
        <h2>${Icon('sliders')} Upload DJ Mix</h2>
        <button class="btn-icon" onclick="App.closeModal()">${Icon('x')}</button>
      </div>
      <div class="upload-modal" style="padding:0.25rem 0 1rem;max-width:560px">
        <div class="bg-type-row" style="margin-bottom:1rem">
          <button class="bg-type-btn active" id="um-tab-file" onclick="Profile.umMode('file',this)">${Icon('music')} Audio file</button>
          <button class="bg-type-btn" id="um-tab-url" onclick="Profile.umMode('url',this)">${Icon('link')} Link (URL)</button>
        </div>

        <!-- FIL-MODUS -->
        <div id="um-pane-file">
          <div class="upload-zone" onclick="document.getElementById('um-file-input').click()">
            <div class="upload-icon">${Icon('sliders')}</div>
            <div style="font-weight:600;margin-bottom:0.25rem">Choose audio file</div>
            <div style="font-size:0.8rem;color:var(--text3)">MP3, WAV, AAC, FLAC · 1 minute – ${maxLabel}</div>
          </div>
          <input type="file" id="um-file-input" accept="audio/*" style="display:none" onchange="Profile.umFilePicked(this)">
          <div id="um-file-info" style="margin-top:0.75rem"></div>

          <!-- Cover-fane: vises når en ren lydfil er valgt -->
          <div id="um-file-cover" class="hidden" style="margin-top:1rem">
            <div class="editor-section-title">Cover image (optional)</div>
            <div style="display:flex;align-items:center;gap:1rem">
              <div class="mix-cover-preview" id="um-cover-preview" onclick="document.getElementById('um-cover-input').click()">📷</div>
              <div style="flex:1">
                <input type="file" id="um-cover-input" accept="image/*" style="display:none" onchange="Profile.umCoverPicked(this)">
                <button class="btn btn-ghost btn-sm" onclick="document.getElementById('um-cover-input').click()">Choose image</button>
                <div style="font-size:0.72rem;opacity:0.5;margin-top:0.3rem">Add a cover for a plain audio file</div>
              </div>
            </div>
            <div class="form-group" style="margin-top:0.75rem">
              <label class="form-label">Title</label>
              <input class="form-input" id="um-file-title" placeholder="Name of the mix">
            </div>
            <button class="btn btn-primary w-full" style="margin-top:0.75rem" onclick="Profile.submitMixFile()">${Icon('arrow-up')} Upload mix</button>
          </div>
        </div>

        <!-- URL-MODUS -->
        <div id="um-pane-url" class="hidden">
          <div class="form-group">
            <label class="form-label">Link to mix (SoundCloud, Mixcloud, YouTube, Spotify …)</label>
            <div style="display:flex;gap:0.5rem">
              <input class="form-input" id="um-url-input" placeholder="https://…" style="flex:1" onkeydown="if(event.key==='Enter'){event.preventDefault();Profile.umFetchPreview();}">
              <button class="btn btn-secondary btn-sm" onclick="Profile.umFetchPreview()">Fetch</button>
            </div>
          </div>
          <div id="um-url-preview" style="margin-top:0.75rem"></div>
          <div id="um-url-actions" class="hidden">
            <div class="form-group" style="margin-top:0.75rem">
              <label class="form-label">Title</label>
              <input class="form-input" id="um-url-title" placeholder="Name of the mix">
            </div>
            <button class="btn btn-primary w-full" style="margin-top:0.5rem" onclick="Profile.submitMixUrl()">${Icon('plus')} Add mix</button>
          </div>
        </div>
      </div>`;
    App.openModal();
    if (mode === 'url') { const b = document.getElementById('um-tab-url'); if (b) umMode('url', b); }
  }

  function umMode(mode) {
    document.getElementById('um-tab-file')?.classList.toggle('active', mode === 'file');
    document.getElementById('um-tab-url')?.classList.toggle('active', mode === 'url');
    document.getElementById('um-pane-file')?.classList.toggle('hidden', mode !== 'file');
    document.getElementById('um-pane-url')?.classList.toggle('hidden', mode !== 'url');
  }

  async function umFilePicked(input) {
    const file = input.files && input.files[0];
    if (!file) return;
    const current = Auth.current();
    const isPro = current?.subscription === 'pro';
    const info = document.getElementById('um-file-info');
    if (info) info.innerHTML = `<span class="spinner" style="width:16px;height:16px;border-width:2px"></span> Reading ${esc(file.name)}…`;
    let duration = 0;
    try {
      const tempUrl = URL.createObjectURL(file);
      const a = new Audio(tempUrl);
      duration = await new Promise(res => { a.onloadedmetadata = () => res(a.duration); a.onerror = () => res(0); setTimeout(() => res(0), 8000); });
      URL.revokeObjectURL(tempUrl);
    } catch {}
    if (duration > 0 && duration < 60) {
      if (info) info.innerHTML = `<div style="color:var(--red);font-size:0.85rem">${esc(file.name)}: the mix is shorter than 1 minute</div>`;
      _umFile = null; document.getElementById('um-file-cover')?.classList.add('hidden'); return;
    }
    if (!isPro && duration > mixLimitFor(current)) {
      _umFile = null; document.getElementById('um-file-cover')?.classList.add('hidden');
      if (info) info.innerHTML = '';
      openMixPaywall(duration);
      return;
    }
    _umFile = file; _umDuration = duration;
    if (info) info.innerHTML = `<div style="display:flex;align-items:center;gap:0.5rem;font-size:0.85rem">${Icon('check-circle')} <span class="notranslate">${esc(file.name)}</span> · ${duration ? formatDuration(duration) : '—'}</div>`;
    document.getElementById('um-file-cover')?.classList.remove('hidden');
    const titleEl = document.getElementById('um-file-title');
    if (titleEl && !titleEl.value) titleEl.value = file.name.replace(/\.[^.]+$/, '');
  }

  function umCoverPicked(input) {
    const file = input.files && input.files[0];
    if (!file) return;
    _umCoverFile = file;
    const prev = document.getElementById('um-cover-preview');
    if (prev) prev.innerHTML = `<img src="${URL.createObjectURL(file)}" class="mix-cover-img" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:inherit">`;
  }

  async function submitMixFile() {
    const current = Auth.current();
    if (!current || !_umFile) { App.toast('Choose an audio file first', 'error'); return; }
    const title = (document.getElementById('um-file-title')?.value || '').trim() || _umFile.name.replace(/\.[^.]+$/, '');
    const id = `mix_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const useCloud = (typeof SC_Storage !== 'undefined') && SC_Storage.isConfigured();

    // Cover: skyen (offentlig coverUrl → deles) når mulig, ellers lokal blob.
    let coverMediaId = null, coverUrl = null;
    if (_umCoverFile) {
      if (useCloud) {
        try { const cov = await SC_Storage.upload(_umCoverFile, { prefix: 'mixcover' }); coverUrl = cov.url; }
        catch (e) { if (e && e.message !== 'not-configured') console.warn('Cover-sky feilet:', e.message); }
      }
      if (!coverUrl) { coverMediaId = `mc_${Date.now()}_${Math.random().toString(36).slice(2)}`; await DB.storeFile('media', coverMediaId, _umCoverFile); }
    }

    const meta = {
      title, description: '', visibility: 'public',
      uploaderUsername: current.username, uploadedAt: Date.now(),
      duration: _umDuration, coverMediaId, coverUrl, tracklist: [],
      audioUrl: null, storagePath: null, mime: _umFile.type,
    };
    let shared = false;
    if (useCloud) {
      try { const res = await SC_Storage.upload(_umFile, { prefix: 'mix' }); meta.audioUrl = res.url; meta.storagePath = res.path; await DB.put('mixes', { id, ...meta }); shared = true; }
      catch (e) { if (e && e.message !== 'not-configured') console.warn('Mix-sky feilet:', e.message); }
    }
    if (!shared) await DB.storeFile('mixes', id, _umFile, meta);

    current.mixIds = [...(current.mixIds || []), id];
    Auth.updateUser(current.username, { mixIds: current.mixIds });
    consumeMixCredit(current, _umDuration);
    App.closeModal();
    App.toast(shared ? 'Mix uploaded! 🎛️🌐 Tap 🔗 on the mix to share it further.' : 'Mix uploaded! 🎛️', 'success');
    _refreshMixViews(current);
  }

  async function umFetchPreview() {
    const url = (document.getElementById('um-url-input')?.value || '').trim();
    if (!/^https?:\/\//i.test(url)) { App.toast('Paste a valid link (https://…)', 'error'); return; }
    const box = document.getElementById('um-url-preview');
    if (box) box.innerHTML = `<span class="spinner" style="width:16px;height:16px;border-width:2px"></span> Fetching preview…`;
    let data = {};
    try { data = await (await fetch('/api/unfurl?url=' + encodeURIComponent(url))).json(); } catch { data = {}; }
    _umPreview = { url, title: data.title || '', image: /^https?:\/\//i.test(data.image || '') ? data.image : '', site: data.site || '', embed: /^https?:\/\//i.test(data.embed || '') ? data.embed : '' };
    const img = _umPreview.image;
    if (box) box.innerHTML = `
      <div style="display:flex;gap:0.75rem;align-items:center;background:rgba(127,127,127,0.1);border-radius:10px;padding:0.6rem">
        ${img
          ? `<img src="${esc(img)}" alt="" style="width:64px;height:64px;object-fit:cover;border-radius:8px;flex-shrink:0">`
          : `<div style="width:64px;height:64px;border-radius:8px;display:flex;align-items:center;justify-content:center;background:rgba(127,127,127,0.15);flex-shrink:0">${Icon('sliders')}</div>`}
        <div style="min-width:0">
          ${_umPreview.site ? `<div class="notranslate" style="font-size:0.72rem;opacity:0.6">${esc(_umPreview.site)}</div>` : ''}
          <div class="notranslate" style="font-weight:600;font-size:0.9rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(_umPreview.title || url)}</div>
          ${_umPreview.embed ? `<div style="font-size:0.72rem;color:#38bdf8">▶ Playable in embedded player</div>` : `<div style="font-size:0.72rem;opacity:0.5">Opens the source on playback</div>`}
        </div>
      </div>`;
    document.getElementById('um-url-actions')?.classList.remove('hidden');
    const titleEl = document.getElementById('um-url-title');
    if (titleEl && !titleEl.value) titleEl.value = _umPreview.title || '';
  }

  async function submitMixUrl() {
    const current = Auth.current();
    if (!current || !_umPreview) { App.toast('Fetch a preview first', 'error'); return; }
    const title = (document.getElementById('um-url-title')?.value || '').trim() || _umPreview.title || _umPreview.url;
    const id = `mix_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    await DB.put('mixes', {
      id, kind: 'url',
      title, description: '', visibility: 'public',
      uploaderUsername: current.username, uploadedAt: Date.now(),
      duration: 0, coverMediaId: null, coverUrl: _umPreview.image || null,
      url: _umPreview.url, embed: _umPreview.embed || '', site: _umPreview.site || '',
      tracklist: [],
    });
    current.mixIds = [...(current.mixIds || []), id];
    Auth.updateUser(current.username, { mixIds: current.mixIds });
    App.closeModal();
    App.toast('Mix added! 🎛️', 'success');
    _refreshMixViews(current);
  }

  function _refreshMixViews(user) {
    if (document.getElementById('tab-mixes')) renderMixesSection(user, true);
    if (document.getElementById('editor-mixes-list')) loadEditorMixes(user);
  }

  // Innebygd spiller for URL-mixes (embed-iframe, ellers åpne kilden).
  function _playMixEmbed(rec) {
    const embed = /^https?:\/\//i.test(rec.embed || '') ? rec.embed : '';
    const box = document.getElementById('modal-box');
    box.innerHTML = `
      <div class="modal-header">
        <h2>${Icon('play')} <span class="notranslate">${esc(rec.title || 'Mix')}</span></h2>
        <button class="btn-icon" onclick="App.closeModal()">${Icon('x')}</button>
      </div>
      <div style="padding:0 0 1rem;max-width:640px">
        ${embed
          ? `<div style="position:relative;width:100%;aspect-ratio:16/9;border-radius:12px;overflow:hidden;background:#000"><iframe src="${esc(embed)}" style="position:absolute;inset:0;width:100%;height:100%;border:0" allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>`
          : `<p style="font-size:0.9rem;color:var(--text2);margin-bottom:0.75rem">This mix has no embedded player.</p><a href="${esc(rec.url)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary w-full">${Icon('link')} Open in new tab</a>`}
      </div>`;
    App.openModal();
  }

  // ── Betalingsvegg: miks over 3 timer (per miks) ───────────────────────
  // To valg: engangs 60 kr/time for DENNE mixen, eller bli Pro (ubegrenset).
  let _mixPaywallHours = 1;
  function openMixPaywall(duration) {
    const current = Auth.current();
    if (!current) { Router.go('/login'); return; }
    const limit  = mixLimitFor(current);
    const overSec = Math.max(0, duration - limit);
    const hours  = Math.max(1, Math.ceil(overSec / 3600));
    _mixPaywallHours = hours;
    const kr = hours * MIX_PRICE_PER_HOUR_KR;
    const box = document.getElementById('modal-box');
    box.innerHTML = `
      <div class="modal-header">
        <h2>${Icon('sliders')} Mix over 3 hours</h2>
        <button class="btn-icon" onclick="App.closeModal()">${Icon('x')}</button>
      </div>
      <div style="padding:1.25rem 0">
        <p style="font-size:0.9rem;color:var(--text2);margin-bottom:1rem">
          This mix is ${formatDuration(duration)} — ${formatDuration(overSec)} over the free limit of 3 hours. Choose how you'd like to continue:
        </p>
        <button class="btn btn-primary w-full" onclick="Profile.payMixHours()">
          ${Icon('credit-card')} Pay for ${hours} hour${hours > 1 ? 's' : ''} · ${kr} kr
        </button>
        <div style="text-align:center;font-size:0.75rem;color:var(--text3);margin:0.85rem 0">— or —</div>
        <div class="mix-pro-feature-list">
          <div class="mix-pro-feature">${Icon('sliders')} Upload mixes over 3 hours (no limit)</div>
          <div class="mix-pro-feature">${Icon('lock')} Private/public visibility on mixes</div>
          <div class="mix-pro-feature">${Icon('star')} Pro badge on profile</div>
        </div>
        <button class="btn btn-gold w-full" id="stripe-pay-btn" style="margin-top:0.75rem" onclick="Profile.startStripeCheckout()">
          ${Icon('star')} Become Pro — 149 kr/mo (unlimited)
        </button>
        <div id="stripe-pay-error" style="display:none;margin-top:0.75rem;font-size:0.82rem;color:var(--red)"></div>
        <p style="font-size:0.72rem;color:var(--text3);margin-top:0.85rem;text-align:center">
          Secure payment via Stripe. After payment: upload the mix again.
        </p>
      </div>`;
    App.openModal();
  }

  async function payMixHours() {
    const current = Auth.current();
    if (!current) return;
    try {
      await Payment.startHoursCheckout(current.username, _mixPaywallHours);
    } catch (err) {
      App.toast('Payment error: ' + err.message, 'error');
    }
  }

  function upgradeToPro() {
    const current = Auth.current();
    if (!current) { Router.go('/login'); return; }
    const box = document.getElementById('modal-box');
    box.innerHTML = `
      <div class="modal-header">
        <h2>${Icon('star')} Upgrade to Pro</h2>
        <button class="btn-icon" onclick="App.closeModal()">${Icon('x')}</button>
      </div>
      <div style="padding:1.5rem 0">
        <div class="mix-pro-feature-list">
          <div class="mix-pro-feature">${Icon('sliders')} Upload mixes over 3 hours (no limit)</div>
          <div class="mix-pro-feature">${Icon('lock')} Private/public visibility on mixes</div>
          <div class="mix-pro-feature">${Icon('star')} Pro badge on profile</div>
        </div>
        <div class="mix-pro-price">149 kr / mo</div>
        <p style="font-size:0.78rem;color:var(--text3);margin-bottom:1.25rem">
          Secure payment via Stripe. Cancel anytime.
        </p>
        <button class="btn btn-gold w-full" id="stripe-pay-btn" onclick="Profile.startStripeCheckout()">
          ${Icon('credit-card')} Pay with Stripe
        </button>
        <div id="stripe-pay-error" style="display:none;margin-top:0.75rem;font-size:0.82rem;color:var(--red)"></div>
        <a href="#/shop" class="shop-link-sm" style="text-align:center;width:100%;margin-top:0.85rem" onclick="App.closeModal()">
          Save with 3, 6 or 12 months in Shop →
        </a>
        <p style="font-size:0.72rem;color:var(--text3);margin-top:0.75rem;text-align:center">
          You'll be sent to Stripe's secure payment page
        </p>
      </div>`;
    App.openModal();
  }

  async function startStripeCheckout() {
    const current = Auth.current();
    if (!current) return;
    const btn   = document.getElementById('stripe-pay-btn');
    const errEl = document.getElementById('stripe-pay-error');
    if (btn)   { btn.disabled = true; btn.textContent = '⏳ Preparing payment…'; }
    if (errEl) errEl.style.display = 'none';
    try {
      await Payment.startCheckout(current.username);
    } catch (err) {
      if (btn)   { btn.disabled = false; btn.innerHTML = '💳 Pay with Stripe'; }
      if (errEl) { errEl.textContent = err.message; errEl.style.display = 'block'; }
    }
  }

  function confirmUpgrade() {
    const current = Auth.current();
    if (!current) return;
    Auth.updateUser(current.username, { subscription: 'pro' });
    current.subscription = 'pro';
    App.closeModal();
    App.toast('⭐ Welcome to Pro! Private mixes are now enabled.', 'success');
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
      if (listEl) {
        const canShare = shared && /^(video|audio)\//.test(file.type || '');
        row.innerHTML = `${Icon('check-circle')} ${file.name}${shared ? ' · 🌐 shared' : ''}`;
        if (canShare) {
          const b = document.createElement('button');
          b.className = 'btn btn-ghost btn-sm'; b.style.cssText = 'margin-left:0.5rem';
          b.innerHTML = '🔗 Share further';
          b.onclick = () => Share.open('media', id);
          row.appendChild(b);
        } else { setTimeout(() => row.remove(), 2500); }
      }
    }
    loadEditorMedia(Auth.current());
    App.toast(useCloud ? 'Media uploaded and shared! 🌐' : 'Media uploaded (locally)!', 'success');
    if (window.Notify) Notify.notifyFriends(current, { type: 'upload', text: 'uploaded new content', link: `#/u/${current.username}` });
  }

  // Add a YouTube (or other) video link as a visual — embedded, no file upload.
  async function addMediaLink() {
    const current = Auth.current();
    if (!current) return;
    const input = document.getElementById('media-url-input');
    const url = (input?.value || '').trim();
    if (!url) { App.toast('Paste a YouTube link first', 'error'); return; }
    const ytId = parseYouTubeId(url);
    const id = `m_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const rec = ytId
      ? { id, kind: 'youtube', youtubeId: ytId, url, name: 'YouTube video', type: 'youtube', visibility: 'public', createdAt: Date.now() }
      : { id, kind: 'link', url, name: url.replace(/^https?:\/\//, '').slice(0, 60), type: 'link', visibility: 'public', createdAt: Date.now() };
    await DB.put('media', rec);
    current.mediaIds = [...(current.mediaIds || []), id];
    Auth.updateUser(current.username, { mediaIds: current.mediaIds });
    // Auto-del URL-video/lenke til Community-veggen (alltid delbar — ingen filopplasting).
    if (window.Community && Community.autoShareOn()) {
      if (rec.kind === 'youtube') Community.shareMedia({ kind: 'youtube', name: 'YouTube video', youtubeId: rec.youtubeId, sourceId: id, audience: 'public' });
      else Community.shareMedia({ kind: 'link', name: rec.name, url: rec.url, sourceId: id, audience: 'public' });
    }
    if (input) input.value = '';
    loadEditorMedia(Auth.current());
    App.toast(ytId ? '▶ YouTube video added!' : 'Link added!', 'success');
  }

  // Per-media visibility (free for everyone). 🌐 public · 🔒 private.
  async function toggleMediaVisibility(id) {
    const current = Auth.current();
    if (!current) return;
    const rec = await DB.get('media', id);
    if (!rec) return;
    rec.visibility = rec.visibility === 'private' ? 'public' : 'private';
    await DB.put('media', rec);
    App.toast(rec.visibility === 'private' ? '🔒 Set to private (only you)' : '🌐 Made public (everyone)', 'success');
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
      if (listEl) {
        row.innerHTML = `${Icon('check-circle')} ${file.name}${shared ? ' · 🌐 shared' : ''}`;
        if (shared) {
          const b = document.createElement('button');
          b.className = 'btn btn-ghost btn-sm'; b.style.cssText = 'margin-left:0.5rem';
          b.innerHTML = '🔗 Share further';
          b.onclick = () => Share.open('music', id);
          row.appendChild(b);
        } else { setTimeout(() => row.remove(), 2500); }
      }
    }
    loadEditorMusic(Auth.current());
    App.toast(useCloud ? 'Music uploaded and shared! 🌐' : 'Music uploaded (locally)!', 'success');
    if (window.Notify) Notify.notifyFriends(current, { type: 'upload', text: 'uploaded new music', link: `#/u/${current.username}` });
  }

  // Manuell deling til Community-veggen (toggle: del / fjern). Berre delbare URL-ar.
  async function shareTrackToCommunity(trackId, username) {
    const current = Auth.current();
    if (!current || !window.Community) return;
    if (Community.isShared(trackId)) { Community.unshareMedia(trackId); App.toast('Removed from Community', 'info'); return; }
    const rec = await DB.get('music', trackId);
    if (!rec) return;
    if (!rec.audioUrl) { App.toast('Can only be shared when the file is in the cloud (public). Upload again with cloud storage on.', 'error'); return; }
    Community.shareMedia({ kind: 'audio', name: rec.name || rec.title || 'Track', url: rec.audioUrl, sourceId: trackId, audience: 'public' });
    App.toast('Shared to Community! 📣', 'success');
  }

  async function shareMediaToCommunity(mediaId) {
    const current = Auth.current();
    if (!current || !window.Community) return;
    if (Community.isShared(mediaId)) { Community.unshareMedia(mediaId); App.toast('Removed from Community', 'info'); return; }
    const rec = await DB.get('media', mediaId);
    if (!rec) return;
    let opts = null;
    if (rec.kind === 'youtube')                              opts = { kind: 'youtube', name: 'YouTube video', youtubeId: rec.youtubeId, sourceId: mediaId };
    else if (rec.kind === 'link')                            opts = { kind: 'link', name: rec.name, url: rec.url, sourceId: mediaId };
    else if ((rec.type || '').startsWith('video/') && rec.mediaUrl) opts = { kind: 'video', name: rec.name, url: rec.mediaUrl, sourceId: mediaId };
    else if (rec.mediaUrl)                                   opts = { kind: 'blend', name: rec.name, url: rec.mediaUrl, sourceId: mediaId };
    if (!opts) { App.toast('Can\'t be shared — the file is only stored locally', 'error'); return; }
    opts.audience = 'public';
    Community.shareMedia(opts);
    App.toast('Shared to Community! 📣', 'success');
  }

  // ── Auto-migrering: lokal-kun bilde → sky ─────────────────────────────────
  // Eldre profiler kan ha et avatar-/bannerbilde som KUN finnes som lokal
  // IndexedDB-blob (avatarMediaId/bannerMediaId, uten avatarUrl/bannerUrl) —
  // typisk lastet opp før Supabase var satt opp. Da ser EIEREN bildet, men
  // ingen andre besøkende gjør det (blob-en bor i én nettleser og synces aldri).
  //
  // Når eieren er innlogget på enheten som HAR blob-en og sky nå er konfigurert,
  // løfter vi blob-en opp til Supabase → setter den offentlige URL-en → nuller
  // det lokale feltet. Auth.updateUser publiserer så profilen (ProfileSync), og
  // fra da av ser ALLE bildet. Fire-and-forget: feiler stille, kaster aldri,
  // og gjør ingenting hvis det allerede finnes en sky-URL.
  let _migratedMedia = false;
  async function migrateLocalMediaToCloud(username) {
    if (_migratedMedia) return;                       // kun ett forsøk per sidelast
    const current = Auth.current();
    if (!current || current.username !== username) return;   // kun eieren, egen enhet
    if (typeof SC_Storage === 'undefined' || !SC_Storage.isConfigured()) return;
    const user = Auth.getUser(username);
    if (!user) return;
    _migratedMedia = true;

    const jobs = [
      { mediaId: 'avatarMediaId', url: 'avatarUrl', path: 'avatarPath', prefix: 'avatar' },
      { mediaId: 'bannerMediaId', url: 'bannerUrl', path: 'bannerPath', prefix: 'banner' },
    ];
    const patch = {};
    for (const j of jobs) {
      if (user[j.url] || !user[j.mediaId]) continue;  // har sky-URL, eller ingen blob → hopp
      try {
        const rec = await DB.get('media', user[j.mediaId]);
        if (!rec || !rec.data) continue;
        const file = new File([rec.data], rec.name || `${j.prefix}.jpg`,
          { type: rec.type || 'image/jpeg' });
        const res = await SC_Storage.upload(file, { prefix: j.prefix });
        patch[j.url]     = res.url;
        patch[j.path]    = res.path || null;
        patch[j.mediaId] = null;
        DB.invalidateBlobCache('media', user[j.mediaId]);
        await DB.delete('media', user[j.mediaId]).catch(() => {});
      } catch (_) { /* la den ligge lokalt; nytt forsøk neste sidelast */ }
    }
    if (Object.keys(patch).length) {
      Auth.updateUser(username, patch);               // publiserer via ProfileSync
    }
  }

  // ── Profilbilde (avatar) ──────────────────────────────────────────────────
  // ÉN felles kjerne — akkurat som banneret: sky-først (Supabase → offentlig URL
  // som ALLE ser, på tvers av enheter), med pen tilbakefall til lokal
  // IndexedDB-blob når sky ikke er satt opp. Rydder alltid gammelt bilde og
  // nuller motsatt felt så profilbildet ALLTID byttes ut.
  // Returnerer { url } ved suksess, ellers null.
  async function applyAvatarFile(file, username) {
    if (!file) return null;
    const current = Auth.current();
    if (!current || current.username !== username) return null;
    if (file.type && !/^image\//.test(file.type)) { App.toast('Choose an image file', 'error'); return null; }
    const user = Auth.getUser(username);
    // Rydd opp gammel LOKAL blob så vi ikke samler foreldreløse blober.
    if (user && user.avatarMediaId) {
      DB.invalidateBlobCache('media', user.avatarMediaId);
      await DB.delete('media', user.avatarMediaId).catch(() => {});
    }
    // Sky-først → offentlig delbar URL alle profiler/sider kan vise.
    const useCloud = (typeof SC_Storage !== 'undefined') && SC_Storage.isConfigured();
    if (useCloud) {
      App.toast('Uploading profile photo…', 'info');
      try {
        const res = await SC_Storage.upload(file, { prefix: 'avatar' });
        Auth.updateUser(username, { avatarUrl: res.url, avatarPath: res.path || null, avatarMediaId: null });
        App.toast('Profile photo updated!', 'success');
        return { url: res.url };
      } catch (e) {
        App.toast('Cloud unavailable — saving locally', 'info');
      }
    }
    const id = `av_${Date.now()}`;
    await DB.storeFile('media', id, file);
    Auth.updateUser(username, { avatarMediaId: id, avatarUrl: null, avatarPath: null });
    App.toast('Profile photo updated!', 'success');
    const url = await DB.getBlobUrl('media', id).catch(() => null);
    return { url };
  }

  async function uploadAvatar(input) {
    const current = Auth.current();
    if (!current) return;
    const r = await applyAvatarFile(input.files[0], current.username);
    if (!r) return;
    const prev = document.getElementById('avatar-preview');
    if (prev && r.url) prev.innerHTML = `<img src="${r.url}" style="width:80px;height:80px;border-radius:50%;object-fit:cover">`;
  }

  // Legg til / endre profilbilde direkte fra profilsiden (ikke editoren).
  async function setAvatarFromProfile(input, username) {
    const r = await applyAvatarFile(input.files[0], username);
    if (r) renderView(username);
  }

  // Slett profilbildet — faller tilbake til initialer.
  async function deleteAvatar(username) {
    const current = Auth.current();
    if (!current || current.username !== username) return;
    const user = Auth.getUser(username);
    if (!user || !(user.avatarMediaId || user.avatarUrl)) { App.toast('You have no profile photo to delete', 'info'); return; }
    if (!confirm('Delete your profile photo?')) return;
    if (user.avatarMediaId) {
      DB.invalidateBlobCache('media', user.avatarMediaId);
      await DB.delete('media', user.avatarMediaId).catch(() => {});
    }
    Auth.updateUser(username, { avatarMediaId: null, avatarUrl: null, avatarPath: null });
    App.toast('Profile photo deleted', 'success');
    renderView(username);
  }

  // ── Banner / forsidebilde ─────────────────────────────────────────────────
  // ÉN felles kjerne brukes av BÅDE forsidebildet (hero) og opplastingssonen i
  // «Rediger profil», slik at de to stedene alltid oppfører seg helt likt:
  //   • sky-først (Supabase) → offentlig URL alle ser, på tvers av enheter
  //   • faller pent tilbake til lokal IndexedDB-blob når sky ikke er satt opp
  //   • rydder gammel blob og NULLER motsatt felt så bildet ALLTID byttes ut.
  //     (Uten nullingen vant en gammel bannerUrl over en ny lokal opplasting →
  //      «jeg laster opp men ingenting skjer»-feilen.)
  // Returnerer { url } ved suksess, ellers null (ingen fil / ikke eier / feil filtype).
  async function applyBannerFile(file, username) {
    if (!file) return null;
    const current = Auth.current();
    if (!current || current.username !== username) return null;
    if (file.type && !/^image\//.test(file.type)) { App.toast('Choose an image file', 'error'); return null; }
    const user = Auth.getUser(username);
    // Rydd opp gammel LOKAL blob så vi ikke samler foreldreløse blober.
    if (user && user.bannerMediaId) {
      DB.invalidateBlobCache('media', user.bannerMediaId);
      await DB.delete('media', user.bannerMediaId).catch(() => {});
    }
    // Foretrekk skylagring (Supabase) → offentlig delbar URL som ALLE som har
    // profilen kan se, også på tvers av enheter.
    const useCloud = (typeof SC_Storage !== 'undefined') && SC_Storage.isConfigured();
    if (useCloud) {
      App.toast('Uploading banner…', 'info');
      try {
        const res = await SC_Storage.upload(file, { prefix: 'banner' });
        Auth.updateUser(username, { bannerUrl: res.url, bannerPath: res.path || null, bannerMediaId: null });
        App.toast('Background image updated!', 'success');
        return { url: res.url };
      } catch (e) {
        // Sky feilet → fall gjennom til lokal lagring under.
        App.toast('Cloud unavailable — saving locally', 'info');
      }
    }
    const id = `bn_${Date.now()}`;
    await DB.storeFile('media', id, file);
    Auth.updateUser(username, { bannerMediaId: id, bannerUrl: null, bannerPath: null });
    App.toast('Background image updated!', 'success');
    const url = await DB.getBlobUrl('media', id).catch(() => null);
    return { url };
  }

  // Sett/endre forsidebildet direkte fra profilen (klikk på banneret eller knappene).
  async function setBannerFromProfile(input, username) {
    const r = await applyBannerFile(input.files[0], username);
    if (r) renderView(username);
  }

  // Samme opplasting fra «Rediger profil»-sonen — deler kjerne med profilen over,
  // så banneret havner i skyen og blir synlig for alle (ikke bare en lokal blob).
  async function uploadBanner(input) {
    const current = Auth.current();
    if (!current) return;
    const r = await applyBannerFile(input.files[0], current.username);
    if (!r) return;
    const prev = document.getElementById('banner-preview');
    if (prev && r.url) prev.innerHTML = `<img src="${r.url}" style="width:100%;height:60px;object-fit:cover;border-radius:8px">`;
  }

  // Slett bakgrunnsbildet — faller tilbake til standard-bakgrunn.
  async function deleteBanner(username) {
    const current = Auth.current();
    if (!current || current.username !== username) return;
    const user = Auth.getUser(username);
    if (!user || !(user.bannerMediaId || user.bannerUrl)) return;
    if (!confirm('Delete the background image?')) return;
    if (user.bannerMediaId) {
      DB.invalidateBlobCache('media', user.bannerMediaId);
      await DB.delete('media', user.bannerMediaId).catch(() => {});
    }
    Auth.updateUser(username, { bannerMediaId: null, bannerUrl: null, bannerPath: null });
    App.toast('Background image deleted', 'success');
    renderView(username);
  }

  // ── Reposisjoner forsidebildet (opp/ned/venstre/høyre) ─────────────────────
  // Lar eieren dra bildet — eller bruke pil-knappene — for å velge HVILKEN del
  // av bildet som vises i banneret, FØR det lagres. Fungerer både for et NYTT
  // valgt bilde (ennå ikke lastet opp) og for å justere et EKSISTERENDE banner.
  // Fokuspunktet lagres som `bannerPos` (en CSS background-position, f.eks.
  // "50% 30%") og brukes ved rendering av både hero-banneret og bruker-kortene.
  let _reposState = null;

  function _clampPct(v) { return Math.max(0, Math.min(100, v)); }

  function _parseBannerPos(str) {
    if (typeof str === 'string') {
      const m = str.match(/(-?\d+(?:\.\d+)?)%\s+(-?\d+(?:\.\d+)?)%/);
      if (m) return { x: _clampPct(parseFloat(m[1])), y: _clampPct(parseFloat(m[2])) };
    }
    return { x: 50, y: 50 };
  }

  function _applyReposPos() {
    const vp = document.getElementById('banner-repos-viewport');
    if (vp && _reposState) vp.style.backgroundPosition = `${_reposState.pos.x}% ${_reposState.pos.y}%`;
  }

  function _renderReposModal() {
    const box = document.getElementById('modal-box');
    if (!box || !_reposState) return;
    const p = _reposState.pos;
    box.innerHTML = `
      <div class="modal-header">
        <h2>${Icon('camera')} Position the cover photo</h2>
        <button class="btn-icon" onclick="Profile.cancelBannerRepos()" title="Close">${Icon('x')}</button>
      </div>
      <div class="banner-repos">
        <p class="banner-repos-hint">Drag the image — or use the arrows — to choose which part is shown.</p>
        <div class="banner-repos-viewport" id="banner-repos-viewport"
             style="background-image:url('${_reposState.previewUrl}');background-size:cover;background-position:${p.x}% ${p.y}%"></div>
        <div class="banner-repos-pad">
          <button class="btn-icon banner-repos-nudge" onclick="Profile.nudgeBannerRepos(0,-1)" title="Up">${Icon('chevron-up')}</button>
          <div class="banner-repos-pad-row">
            <button class="btn-icon banner-repos-nudge" onclick="Profile.nudgeBannerRepos(-1,0)" title="Left">${Icon('chevron-left')}</button>
            <button class="btn-icon banner-repos-nudge banner-repos-center" onclick="Profile.resetBannerRepos()" title="Center">${Icon('maximize')}</button>
            <button class="btn-icon banner-repos-nudge" onclick="Profile.nudgeBannerRepos(1,0)" title="Right">${Icon('chevron-right')}</button>
          </div>
          <button class="btn-icon banner-repos-nudge" onclick="Profile.nudgeBannerRepos(0,1)" title="Down">${Icon('chevron-down')}</button>
        </div>
        <div class="banner-repos-actions">
          <button class="btn btn-ghost" onclick="Profile.cancelBannerRepos()">Cancel</button>
          <button class="btn btn-primary" onclick="Profile.saveBannerRepos()">${Icon('check')} Save</button>
        </div>
      </div>`;
    App.openModal();
    _bindReposDrag();
  }

  // Dra i bildet for å flytte fokuspunktet. Bruker pointer-capture, så
  // bevegelsen følges selv utenfor viewporten — ingen globale lyttere å rydde.
  function _bindReposDrag() {
    const vp = document.getElementById('banner-repos-viewport');
    if (!vp || !_reposState) return;
    let dragging = false, lastX = 0, lastY = 0, pid = null;
    vp.addEventListener('pointerdown', (e) => {
      dragging = true; pid = e.pointerId; lastX = e.clientX; lastY = e.clientY;
      vp.classList.add('dragging');
      try { vp.setPointerCapture(e.pointerId); } catch (_) {}
      e.stopPropagation(); e.preventDefault();
    });
    vp.addEventListener('pointermove', (e) => {
      if (!dragging || (pid !== null && e.pointerId !== pid) || !_reposState) return;
      const rect = vp.getBoundingClientRect();
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      // Å dra bildet mot høyre viser mer av venstre kant → posisjon MINKER.
      _reposState.pos.x = _clampPct(_reposState.pos.x - (dx / rect.width) * 100);
      _reposState.pos.y = _clampPct(_reposState.pos.y - (dy / rect.height) * 100);
      _applyReposPos();
      e.stopPropagation();
    });
    const end = () => { dragging = false; vp.classList.remove('dragging'); };
    vp.addEventListener('pointerup', end);
    vp.addEventListener('pointercancel', end);
  }

  function nudgeBannerRepos(dx, dy) {
    if (!_reposState) return;
    _reposState.pos.x = _clampPct(_reposState.pos.x + dx * 5);
    _reposState.pos.y = _clampPct(_reposState.pos.y + dy * 5);
    _applyReposPos();
  }

  function resetBannerRepos() {
    if (!_reposState) return;
    _reposState.pos = { x: 50, y: 50 };
    _applyReposPos();
  }

  // Åpne reposisjonering for et NYTT valgt bilde (ennå ikke lastet opp).
  function openBannerReposForFile(input, username) {
    const current = Auth.current();
    if (!current || current.username !== username) return;
    const file = input.files && input.files[0];
    if (!file) return;
    if (file.type && !/^image\//.test(file.type)) { App.toast('Choose an image file', 'error'); input.value = ''; return; }
    const url = URL.createObjectURL(file);
    input.value = '';   // så samme fil kan velges på nytt senere
    _reposState = { username, file, previewUrl: url, revokeUrl: true, isNew: true, pos: { x: 50, y: 50 } };
    _renderReposModal();
  }

  // Åpne reposisjonering for et EKSISTERENDE banner (ingen ny opplasting).
  async function repositionBanner(username) {
    const current = Auth.current();
    if (!current || current.username !== username) return;
    const user = Auth.getUser(username);
    let url = user.bannerUrl || null;
    if (!url && user.bannerMediaId) url = await DB.getBlobUrl('media', user.bannerMediaId).catch(() => null);
    if (!url) { App.toast('Upload a cover photo first', 'info'); return; }
    _reposState = { username, file: null, previewUrl: url, revokeUrl: false, isNew: false, pos: _parseBannerPos(user.bannerPos) };
    _renderReposModal();
  }

  async function saveBannerRepos() {
    const st = _reposState;
    if (!st) return;
    const posStr = `${Math.round(st.pos.x)}% ${Math.round(st.pos.y)}%`;
    // Nytt bilde: last opp FØRST (deler kjerne med vanlig banner-opplasting).
    if (st.isNew && st.file) {
      const r = await applyBannerFile(st.file, st.username);
      if (!r) { _teardownRepos(); App.closeModal(); return; }
    }
    Auth.updateUser(st.username, { bannerPos: posStr });
    const uname = st.username;
    _teardownRepos();
    App.closeModal();
    App.toast('Cover photo positioned', 'success');
    renderView(uname);
  }

  function cancelBannerRepos() {
    _teardownRepos();
    App.closeModal();
  }

  function _teardownRepos() {
    if (_reposState && _reposState.revokeUrl && _reposState.previewUrl) {
      try { URL.revokeObjectURL(_reposState.previewUrl); } catch (_) {}
    }
    _reposState = null;
  }

  async function uploadMusicCover(trackId, file) {
    if (!file) return;
    const current = Auth.current();
    if (!current) return;
    const rec = await DB.get('music', trackId);
    if (!rec) return;

    // Rydd bort et eventuelt gammelt lokalt cover-blob.
    if (rec.coverMediaId) {
      DB.invalidateBlobCache('media', rec.coverMediaId);
      await DB.delete('media', rec.coverMediaId).catch(() => {});
      rec.coverMediaId = null;
    }

    // Lagre coveret som en DELBAR URL slik at det også vises i Discover på tvers
    // av enheter/besøkende — ikke bare i nettleseren som lastet det opp.
    // Skylagring når konfigurert; ellers en nedskalert data-URL; lokal blob som
    // aller siste utvei.
    let url = null;
    try {
      const useCloud = (typeof SC_Storage !== 'undefined') && SC_Storage.isConfigured();
      if (useCloud) {
        try { url = (await SC_Storage.upload(file, { prefix: 'covers' })).url; }
        catch { url = await _imageToDataUrl(file); }
      } else {
        url = await _imageToDataUrl(file);
      }
    } catch { /* fall tilbake til lokal blob under */ }

    if (url) {
      rec.coverUrl = url;
    } else {
      const id = `mcover_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      await DB.storeFile('media', id, file);
      rec.coverMediaId = id;
      url = await DB.getBlobUrl('media', id).catch(() => null);
    }
    await DB.put('music', rec);

    const el = document.getElementById(`mthumb-${trackId}`);
    if (el && url) {
      // Sett som bakgrunn så play-knapp-overlegget blir liggende oppå coveret.
      el.style.backgroundImage = `url("${String(url).replace(/"/g, '%22')}")`;
      el.style.backgroundSize = 'cover';
      el.style.backgroundPosition = 'center';
      el.classList.add('has-cover');
    }
    App.toast('Cover updated! 🖼️', 'success');
  }

  // Omslagsbilde for en sang lagt ut i butikken. Lagres som delbar URL (skylagring
  // når konfigurert, ellers nedskalert data-URL) slik at KJØPERE også ser omslaget.
  async function uploadSaleCover(trackId, files) {
    const file = files && files[0];
    if (!file || !/^image\//.test(file.type)) { App.toast('Choose an image file', 'error'); return; }
    const rec = await DB.get('music', trackId);
    if (!rec) { App.toast('Track not found', 'error'); return; }
    const preview = document.getElementById('sc-cover-preview');
    if (preview) preview.innerHTML = `<span class="spinner" style="width:16px;height:16px;border-width:2px"></span> Processing cover…`;
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
      App.toast('Cover saved! 🖼️', 'success');
    } catch (e) {
      if (preview) preview.innerHTML = '';
      App.toast('Cover failed: ' + e.message, 'error');
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
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read the image')); };
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
    App.toast('Uploading background video…', 'info');
    await DB.storeFile('media', id, file);
    window._pendingBgVideoId = id;
    Auth.updateUser(current.username, { theme: { ...current.theme, bgVideoId: id } });
    App.toast('Background video uploaded!', 'success');
  }

  // ── Collect & Save ────────────────────────────────────────────────────
  function collectLinks() {
    const chips = document.querySelectorAll('#links-wrap .chip');
    return Array.from(chips).map(c => ({ url: c.dataset.url || c.textContent.replace('✕','').trim(), label: c.firstChild?.textContent?.trim() || '' }));
  }

  function collectTheme() {
    const activeBgType = document.querySelector('.bg-type-btn.active')?.textContent?.toLowerCase().replace('🎵 ','');
    const bgTypeMap    = { color:'color', gradient:'gradient', image:'image', video:'video', music:'music' };
    const bgType       = bgTypeMap[activeBgType] || Auth.current()?.theme?.bgType || 'gradient';

    const activeLayout   = document.querySelector('.layout-option.active')?.dataset?.layout || document.querySelector('.layout-option.active')?.onclick?.toString()?.match(/'(\w+)'/)?.[1] || 'default';
    const cardStyleBtn = document.querySelector('.editor-panel .bg-type-row:last-of-type .bg-type-btn.active');
    const activeCardStyle = { glass: 'glass', solid: 'solid', outline: 'outline' }[cardStyleBtn?.textContent?.trim().toLowerCase()] || 'glass';

    return {
      primaryColor:   document.getElementById('ed-primary')?.value   || '#22c55e',
      secondaryColor: document.getElementById('ed-secondary')?.value || '#2563eb',
      bgColor:        document.getElementById('ed-bg')?.value        || '#0f0f1a',
      textColor:      document.getElementById('ed-text')?.value      || '#ffffff',
      accentColor:    document.getElementById('ed-accent')?.value    || '#f59e0b',
      bgType,
      bgGradient:     document.getElementById('ed-gradient')?.value  || 'linear-gradient(135deg,#22c55e,#16a34a)',
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
    App.toast('Profile saved! ✓', 'success');
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
    if (!keywords) { App.toast('Enter some keywords', 'error'); return; }
    const style   = document.getElementById('ai-bio-style')?.value || 'kreativ';
    const resultEl = document.getElementById('ai-result');
    if (!resultEl) return;
    resultEl.style.display = 'block';
    resultEl.innerHTML = '<div class="ai-loading"><div class="ai-dots"><span>•</span><span>•</span><span>•</span></div> AI is thinking…</div>';
    try {
      const bio = await AI.generateBio(keywords, style);
      resultEl.innerHTML = `<strong>Suggested bio:</strong><br>${bio}<br><button class="btn btn-primary btn-sm" style="margin-top:0.5rem" onclick="document.getElementById('ed-bio').value=\`${bio.replace(/`/g, "'")}\`;Profile.livePreview()">Use this</button>`;
    } catch (e) {
      const msg = e.message === 'no_key' ? 'Add a Claude API key in Settings' : e.message;
      resultEl.innerHTML = `<span style="color:var(--red)">${Icon('alert')} ${msg}</span>`;
    }
  }

  async function aiColors() {
    const mood    = document.getElementById('ai-color-mood')?.value?.trim();
    if (!mood) { App.toast('Describe a mood', 'error'); return; }
    const resultEl = document.getElementById('ai-result');
    if (!resultEl) return;
    resultEl.style.display = 'block';
    resultEl.innerHTML = '<div class="ai-loading"><div class="ai-dots"><span>•</span><span>•</span><span>•</span></div> Generating color palette…</div>';
    try {
      const colors = await AI.suggestColors(mood);
      if (!colors) throw new Error('Could not parse the AI response');
      resultEl.innerHTML = `
        <strong>Suggested colors:</strong>
        <div style="display:flex;gap:0.4rem;margin:0.5rem 0">
          ${Object.entries(colors).map(([k,v]) => `<div title="${k}: ${v}" style="width:32px;height:32px;border-radius:6px;background:${v};border:1px solid #fff3"></div>`).join('')}
        </div>
        <button class="btn btn-primary btn-sm" onclick="Profile.applyAiColors(${JSON.stringify(colors).replace(/"/g,'&quot;')})">Use these colors</button>`;
    } catch (e) {
      const msg = e.message === 'no_key' ? 'Add a Claude API key in Settings' : e.message;
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
    App.toast('Colors applied!', 'success');
  }

  async function aiLayout() {
    const bio     = document.getElementById('ed-bio')?.value || Auth.current()?.bio || 'kreativ profil';
    const resultEl = document.getElementById('ai-result');
    if (!resultEl) return;
    resultEl.style.display = 'block';
    resultEl.innerHTML = '<div class="ai-loading"><div class="ai-dots"><span>•</span><span>•</span><span>•</span></div> Analyzing…</div>';
    try {
      const layout = await AI.suggestLayout(bio);
      if (!layout) throw new Error('No suggestions');
      resultEl.innerHTML = `<strong>AI suggests:</strong><br>Layout: ${layout.layout}, Style: ${layout.cardStyle}, Font: ${layout.fontFamily}
        <br><button class="btn btn-primary btn-sm" style="margin-top:0.5rem" onclick="Profile.applyAiLayout(${JSON.stringify(layout).replace(/"/g,'&quot;')})">Use this</button>`;
    } catch (e) {
      const msg = e.message === 'no_key' ? 'Add a Claude API key in Settings' : e.message;
      resultEl.innerHTML = `<span style="color:var(--red)">${Icon('alert')} ${msg}</span>`;
    }
  }

  function applyAiLayout(layout) {
    const fontEl = document.getElementById('ed-font');
    if (fontEl && layout.fontFamily) fontEl.value = layout.fontFamily;
    livePreview();
    App.toast('Layout applied!', 'success');
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
      App.toast('Add a Claude API key in Settings to use AI', 'error');
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
        actionHtml += `<div class="ai-action-row"><div style="display:flex;gap:4px;align-items:center;flex-wrap:wrap">${swatches}</div><button class="btn btn-primary btn-sm" onclick="Profile.applyAiColors(JSON.parse(this.dataset.c))" data-c="${colorsJson}">Use colors</button></div>`;
      }
      if (actions.bio) {
        const safeBio = actions.bio.replace(/`/g, "'").replace(/"/g, '&quot;');
        actionHtml += `<div class="ai-action-row"><em class="ai-bio-preview">"${actions.bio.slice(0, 80)}${actions.bio.length > 80 ? '…' : ''}"</em><button class="btn btn-primary btn-sm" onclick="const b=document.getElementById('ed-bio');if(b){b.value=this.dataset.bio;Profile.livePreview()}" data-bio="${safeBio}">Use bio</button></div>`;
      }
      if (actions.layout) {
        const layoutJson = JSON.stringify(actions.layout).replace(/"/g, '&quot;');
        actionHtml += `<div class="ai-action-row"><span class="ai-layout-preview">${actions.layout.layout} · ${actions.layout.cardStyle} · ${actions.layout.fontFamily}</span><button class="btn btn-primary btn-sm" onclick="Profile.applyAiLayout(JSON.parse(this.dataset.l))" data-l="${layoutJson}">Use layout</button></div>`;
      }

      const safe = displayText.replace(/</g, '&lt;').replace(/\n/g, '<br>');
      chatWindow.insertAdjacentHTML('beforeend',
        `<div class="ai-chat-bubble ai-chat-bubble--bot">${safe}${actionHtml}</div>`);
    } catch (e) {
      document.getElementById(typingId)?.remove();
      const errMsg = e.message === 'no_key' ? 'Add a Claude API key in Settings' : e.message;
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
    App.toast(`${festivalIds.length} festival${festivalIds.length !== 1 ? 's' : ''} saved! ${Icon('star')}`, 'success');
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
    App.toast(`Platforms saved! ${Icon('laptop')}`, 'success');
  }

  // ── My Sites actions ──────────────────────────────────────────────────
  function addMySite() {
    const current = Auth.current();
    if (!current) return;
    const emoji = document.getElementById('ms-emoji')?.value?.trim() || '🔗';
    const title = document.getElementById('ms-title')?.value?.trim();
    const url   = document.getElementById('ms-url')?.value?.trim();
    const desc  = document.getElementById('ms-desc')?.value?.trim();
    if (!title) { App.toast('Title is required', 'error'); return; }
    if (!url || !url.startsWith('http')) { App.toast('URL must start with http:// or https://', 'error'); return; }
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
    App.toast(`"${title}" added! ${Icon('globe')}`, 'success');
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
      list.innerHTML = '<p style="font-size:0.82rem;color:var(--text2)">No sites yet.</p>';
    }
    App.toast('Site removed', 'info');
  }

  // ══════════════════════════════════════════════════════════════════════
  //  MIN SIDE — CUSTOM PAGE BUILDER
  // ══════════════════════════════════════════════════════════════════════

  const CP_BLOCKS = {
    hero:      { icon: '✦',  label: 'Hero Title',     defaultData: { title: 'My Page', subtitle: '', animation: 'rainbow' } },
    text:      { icon: '📝', label: 'Text',            defaultData: { content: 'Write something here...', align: 'left' } },
    quote:     { icon: '💬', label: 'Quote',             defaultData: { text: 'An inspiring word...', author: '', style: 'neon-purple' } },
    image:     { icon: '🖼️', label: 'Image (URL)',       defaultData: { url: '', caption: '', filter: 'psychedelic' } },
    links:     { icon: '🔗', label: 'Link buttons',      defaultData: { buttons: [{ label: 'Visit me', url: 'https://', color: '#22c55e' }] } },
    divider:   { icon: '〰️', label: 'Divider',       defaultData: { style: 'plasma' } },
    countdown: { icon: '⏳', label: 'Countdown',        defaultData: { date: '', label: 'Until something exciting' } },
    vibes:     { icon: '🌊', label: 'Vibes section',     defaultData: { style: 'aurora', text: '✦ good vibes only ✦' } },
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
          <div class="cp-palette-title">Block library</div>
          <div class="cp-palette-grid">
            ${Object.entries(CP_BLOCKS).map(([type, def]) => `
              <div class="cp-palette-item" onclick="Profile.addBlock('${type}')">
                <span class="cp-palette-icon">${iconForEmoji(def.icon)}</span>
                <span>${def.label}</span>
              </div>`).join('')}
          </div>
          <div class="cp-palette-tip">${Icon('lightbulb')} Click to add · Drag blocks to move</div>
        </div>
        <div class="cp-canvas" id="cp-canvas"
             ondragover="event.preventDefault()" ondrop="Profile.cpDropCanvas(event)">
          ${_cpBlocks.length
            ? _cpBlocks.map((b, i) => cpBlockEditorHtml(b, i, _cpBlocks.length)).join('')
            : `<div class="cp-empty"><div class="cp-empty-icon">${Icon('wind')}</div><p>Click a block on the left to begin</p></div>`}
        </div>
      </div>
      <div style="display:flex;gap:0.75rem;margin-top:1rem">
        <button class="btn btn-primary" onclick="Profile.saveCustomPage()">${Icon('save')} Save My Page</button>
        <a href="#/u/${user.username}" class="btn btn-ghost">${Icon('eye')} View profile</a>
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
            ${index > 0 ? `<button class="cp-block-btn" onclick="Profile.moveBlock('${block.id}',-1)" title="Up">${Icon('arrow-up')}</button>` : ''}
            ${index < total - 1 ? `<button class="cp-block-btn" onclick="Profile.moveBlock('${block.id}',1)" title="Down">${Icon('arrow-down')}</button>` : ''}
            <button class="cp-block-btn del" onclick="Profile.deleteBlock('${block.id}')" title="Delete">${Icon('trash')}</button>
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
          <div class="form-group"><label class="form-label">Title</label>
            <input class="form-input" value="${esc(d.title)}" oninput="Profile.updateBlock('${bid}','title',this.value)"></div>
          <div class="form-group"><label class="form-label">Subtitle</label>
            <input class="form-input" value="${esc(d.subtitle)}" oninput="Profile.updateBlock('${bid}','subtitle',this.value)"></div>
          <div class="form-group"><label class="form-label">Animation</label>
            <select class="form-input" onchange="Profile.updateBlock('${bid}','animation',this.value)">
              <option value="rainbow" ${d.animation==='rainbow'?'selected':''}>${Icon('rainbow')} Rainbow</option>
              <option value="glitch"  ${d.animation==='glitch' ?'selected':''}>${Icon('zap')} Glitch</option>
              <option value="pulse"   ${d.animation==='pulse'  ?'selected':''}>${Icon('heart')} Neon Pulse</option>
              <option value="none"    ${d.animation==='none'   ?'selected':''}>None</option>
            </select></div>`;
      case 'text':
        return `
          <div class="form-group"><label class="form-label">Content</label>
            <textarea class="form-input" rows="4" oninput="Profile.updateBlock('${bid}','content',this.value)">${esc(d.content)}</textarea></div>
          <div class="form-group"><label class="form-label">Alignment</label>
            <select class="form-input" onchange="Profile.updateBlock('${bid}','align',this.value)">
              <option value="left"   ${d.align==='left'  ?'selected':''}>Left</option>
              <option value="center" ${d.align==='center'?'selected':''}>Center</option>
              <option value="right"  ${d.align==='right' ?'selected':''}>Right</option>
            </select></div>`;
      case 'quote':
        return `
          <div class="form-group"><label class="form-label">Quote</label>
            <textarea class="form-input" rows="3" oninput="Profile.updateBlock('${bid}','text',this.value)">${esc(d.text)}</textarea></div>
          <div class="form-group"><label class="form-label">Author (optional)</label>
            <input class="form-input" value="${esc(d.author)}" oninput="Profile.updateBlock('${bid}','author',this.value)"></div>
          <div class="form-group"><label class="form-label">Style</label>
            <select class="form-input" onchange="Profile.updateBlock('${bid}','style',this.value)">
              <option value="neon-purple" ${d.style==='neon-purple'?'selected':''}>${Icon('heart')} Neon Purple</option>
              <option value="neon-cyan"   ${d.style==='neon-cyan'  ?'selected':''}>${Icon('heart')} Neon Cyan</option>
              <option value="neon-gold"   ${d.style==='neon-gold'  ?'selected':''}>${Icon('heart')} Neon Gold</option>
            </select></div>`;
      case 'image':
        return `
          <div class="form-group"><label class="form-label">Image URL</label>
            <input class="form-input" placeholder="https://..." value="${esc(d.url)}"
              oninput="Profile.updateBlock('${bid}','url',this.value)"></div>
          <div class="form-group"><label class="form-label">Caption (optional)</label>
            <input class="form-input" value="${esc(d.caption)}"
              oninput="Profile.updateBlock('${bid}','caption',this.value)"></div>
          <div class="form-group"><label class="form-label">Filter</label>
            <select class="form-input" onchange="Profile.updateBlock('${bid}','filter',this.value)">
              <option value="psychedelic" ${d.filter==='psychedelic'?'selected':''}>${Icon('wind')} Psychedelic</option>
              <option value="vhs"  ${d.filter==='vhs' ?'selected':''}>${Icon('tv')} VHS Glitch</option>
              <option value="none" ${d.filter==='none'?'selected':''}>None</option>
            </select></div>`;
      case 'links': {
        const btns = d.buttons || [];
        return `
          <div id="cp-${bid}-buttons">
            ${btns.map((btn, i) => `
              <div style="display:flex;gap:0.4rem;margin-bottom:0.4rem;align-items:center">
                <input class="form-input" placeholder="Text" value="${esc(btn.label)}" style="flex:1"
                  oninput="Profile.updateLinkBtn('${bid}',${i},'label',this.value)">
                <input class="form-input" placeholder="https://..." value="${esc(btn.url)}" style="flex:2"
                  oninput="Profile.updateLinkBtn('${bid}',${i},'url',this.value)">
                <input type="color" value="${btn.color||'#22c55e'}"
                  style="width:36px;height:36px;border:none;background:none;cursor:pointer;flex-shrink:0"
                  oninput="Profile.updateLinkBtn('${bid}',${i},'color',this.value)">
                <button class="cp-block-btn del" onclick="Profile.removeLinkBtn('${bid}',${i})">${Icon('x')}</button>
              </div>`).join('')}
          </div>
          <button class="btn btn-ghost btn-sm" style="margin-top:0.25rem"
            onclick="Profile.addLinkBtn('${bid}')">+ Add button</button>`;
      }
      case 'divider':
        return `
          <div class="form-group"><label class="form-label">Stil</label>
            <select class="form-input" onchange="Profile.updateBlock('${bid}','style',this.value)">
              <option value="plasma" ${d.style==='plasma'?'selected':''}>${Icon('zap')} Plasma</option>
              <option value="wave"   ${d.style==='wave'  ?'selected':''}>${Icon('waves')} Wave</option>
              <option value="stars"  ${d.style==='stars' ?'selected':''}>${Icon('sparkles')} Stars</option>
            </select></div>`;
      case 'countdown':
        return `
          <div class="form-group"><label class="form-label">Date</label>
            <input class="form-input" type="date" value="${esc(d.date)}"
              onchange="Profile.updateBlock('${bid}','date',this.value)"></div>
          <div class="form-group"><label class="form-label">Label</label>
            <input class="form-input" value="${esc(d.label)}"
              oninput="Profile.updateBlock('${bid}','label',this.value)"></div>`;
      case 'vibes':
        return `
          <div class="form-group"><label class="form-label">Text (optional)</label>
            <input class="form-input" value="${esc(d.text)}" placeholder="good vibes only"
              oninput="Profile.updateBlock('${bid}','text',this.value)"></div>
          <div class="form-group"><label class="form-label">Style</label>
            <select class="form-input" onchange="Profile.updateBlock('${bid}','style',this.value)">
              <option value="aurora"  ${d.style==='aurora' ?'selected':''}>${Icon('sparkles')} Aurora</option>
              <option value="lava"    ${d.style==='lava'   ?'selected':''}>${Icon('mountain')} Lava</option>
              <option value="galaxy"  ${d.style==='galaxy' ?'selected':''}>${Icon('sparkles')} Galaxy</option>
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
              Paste a link from ${d.type==='spotify'?'Spotify':'YouTube'}
            </div></div>`;
      default:
        return '<p style="color:var(--text3);font-size:0.82rem">Unknown block type</p>';
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
        <div class="cp-page-divider"><span>${Icon('sparkles')} My Page ${Icon('sparkles')}</span></div>
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
            style="background:${btn.color||'#22c55e'}">${esc(btn.label)}</a>`).join('')}
        </div>`;
      case 'divider':
        return d.style === 'stars'
          ? `<div class="cp-divider" data-style="stars">${Icon('sparkles')} &nbsp; ${Icon('sparkles')} &nbsp; ${Icon('sparkles')} &nbsp; ${Icon('sparkles')} &nbsp; ${Icon('sparkles')}</div>`
          : `<div class="cp-divider" data-style="${d.style||'plasma'}"></div>`;
      case 'countdown': {
        if (!d.date) return '';
        const cdId = `cd-${block.id}`;
        return `<div class="cp-countdown">
          <div class="cp-countdown-label">${esc(d.label||'Countdown')}</div>
          <div class="cp-countdown-units" id="${cdId}">
            <div class="cp-countdown-unit"><div class="cp-countdown-val" id="${cdId}-d">--</div><div class="cp-countdown-unit-label">Days</div></div>
            <div class="cp-countdown-unit"><div class="cp-countdown-val" id="${cdId}-h">--</div><div class="cp-countdown-unit-label">Hours</div></div>
            <div class="cp-countdown-unit"><div class="cp-countdown-val" id="${cdId}-m">--</div><div class="cp-countdown-unit-label">Min</div></div>
            <div class="cp-countdown-unit"><div class="cp-countdown-val" id="${cdId}-s">--</div><div class="cp-countdown-unit-label">Sec</div></div>
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
        el.innerHTML = `<div style="color:#f59e0b;font-weight:700;font-size:1.1rem">${Icon('party')} It happened!</div>`;
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
    b.data.buttons = [...(b.data.buttons||[]), { label: 'Lenke', url: 'https://', color: '#22c55e' }];
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
      canvas.innerHTML = `<div class="cp-empty"><div class="cp-empty-icon">${Icon('wind')}</div><p>Click a block on the left to begin</p></div>`;
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
    App.toast('My Page saved! ✓', 'success');
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
          const timeStr = e.time ? ` · at ${e.time}` : '';
          const safeTitle = (e.title || '').replace(/'/g, "\\'");
          const safeUrl   = (e.liveUrl || '').replace(/'/g, "\\'");
          return `
            <div class="event-card${e.isLive ? ' event-card--live' : ''}">
              ${e.isLive ? '<div class="event-live-badge"><span class="event-live-dot"></span> LIVE NOW</div>' : ''}
              <div class="event-card-header">
                <span class="event-type-emoji">${typeEmoji}</span>
                <div class="event-card-info">
                  <div class="event-title">${e.title}</div>
                  ${!e.isLive ? `<div class="event-meta">${dateStr}${timeStr}${e.location ? ' · 📍 ' + e.location : ''}</div>` : (e.location ? `<div class="event-meta">${Icon('map-pin')} ${e.location}</div>` : '')}
                </div>
                ${e.isLive && e.liveUrl ? `<button class="event-listen-btn" onclick="Radio.playUrl('${safeUrl}','${safeTitle}','🔴')">${Icon('play')} Listen live</button>` : ''}
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
        <div class="editor-section-title" style="margin-bottom:0.5rem">${Icon('calendar')} Add event</div>
        <p style="font-size:0.82rem;color:var(--text2);margin-bottom:1rem;line-height:1.6">
          Publish concerts, DJ sets and shows on your profile. Mark as live to let others listen directly from here.
        </p>
        <div style="background:var(--surface2);border-radius:14px;padding:1.25rem;margin-bottom:1.5rem">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem">
            <div class="form-group">
              <label class="form-label">Title *</label>
              <input class="form-input" id="ev-title" placeholder="e.g. DJ Set at Blå">
            </div>
            <div class="form-group">
              <label class="form-label">Type</label>
              <select class="form-input" id="ev-type">
                ${EVENT_TYPES.map(t => `<option value="${t.id}">${iconForEmoji(t.emoji)} ${t.label}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Date *</label>
              <input class="form-input" id="ev-date" type="date">
            </div>
            <div class="form-group">
              <label class="form-label">Time</label>
              <input class="form-input" id="ev-time" type="time">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Location / Venue</label>
            <input class="form-input" id="ev-location" placeholder="e.g. Blå, Oslo">
          </div>
          <div class="form-group">
            <label class="form-label">Description</label>
            <textarea class="form-input" id="ev-desc" rows="2" placeholder="Short info about the event…"></textarea>
          </div>
          <div class="event-live-toggle-wrap">
            <label class="event-live-label">
              <input type="checkbox" id="ev-live" onchange="document.getElementById('ev-live-url-wrap').style.display=this.checked?'block':'none'">
              <span class="event-live-dot" style="flex-shrink:0"></span>
              Mark as LIVE now
            </label>
            <div id="ev-live-url-wrap" style="display:none;margin-top:0.75rem">
              <label class="form-label">Stream URL (optional)</label>
              <input class="form-input" id="ev-live-url" placeholder="https://…/stream.mp3">
              <span class="form-hint">Visitors can listen directly from your profile</span>
            </div>
          </div>
          <button class="btn btn-primary" style="margin-top:1rem" onclick="Profile.addEvent()">${Icon('plus')} Add event</button>
        </div>
        <div class="editor-section-title" style="margin-bottom:0.75rem">My events (${events.length})</div>
        <div id="events-list">
          ${events.length ? events.map(eventsEditorItem).join('') : '<p style="font-size:0.82rem;color:var(--text2)">No events yet.</p>'}
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
        <button class="btn-icon btn-danger" onclick="Profile.deleteEvent('${e.id}')" title="Delete">${Icon('trash')}</button>
      </div>`;
  }

  function addEvent() {
    const current = Auth.current();
    if (!current) return;
    const title = document.getElementById('ev-title')?.value?.trim();
    const date  = document.getElementById('ev-date')?.value;
    if (!title) { App.toast('Title is required', 'error'); return; }
    if (!date)  { App.toast('Date is required', 'error'); return; }
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
    App.toast('Event added! 📅', 'success');
  }

  function deleteEvent(id) {
    const current = Auth.current();
    if (!current) return;
    const events = (current.events || []).filter(e => e.id !== id);
    Auth.updateUser(current.username, { events });
    current.events = events;
    document.getElementById(`evitem-${id}`)?.remove();
    App.toast('Event deleted', 'info');
  }

  function labelsTabHtml(user) {
    const labels = user.labels || [];
    return `
      <div style="max-width:520px">
        <div class="editor-section-title">${Icon('tag')} My record labels</div>
        <p style="font-size:0.82rem;color:var(--text2);margin-bottom:1rem;line-height:1.6">
          Add record labels you use. You can assign them to individual tracks in the tracklist on your mixes.
        </p>
        <div style="display:flex;gap:0.5rem;margin-bottom:1rem">
          <input class="form-input" id="lbl-input" placeholder="e.g. Acieeed Records" style="flex:1">
          <button class="btn btn-primary" onclick="Profile.addLabel()">${Icon('plus')} Add</button>
        </div>
        <div id="labels-list">
          ${labels.length ? labels.map(labelEditorItem).join('') : '<p style="font-size:0.82rem;color:var(--text2)">No record labels yet.</p>'}
        </div>
      </div>`;
  }

  function labelEditorItem(label) {
    return `
      <div class="label-editor-item" id="lblitem-${label.id}">
        <span style="font-size:1.1rem">${Icon('tag')}</span>
        <span class="label-editor-name">${label.name}</span>
        <button class="btn-icon btn-danger btn-sm" onclick="Profile.deleteLabel('${label.id}')" title="Delete">${Icon('trash')}</button>
      </div>`;
  }

  function addLabel() {
    const current = Auth.current();
    if (!current) return;
    const input = document.getElementById('lbl-input');
    const name = input?.value?.trim();
    if (!name) { App.toast('Enter the name of the record label', 'error'); return; }
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
    App.toast(`"${name}" added ${Icon('tag')}`, 'success');
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
      list.innerHTML = '<p style="font-size:0.82rem;color:var(--text2)">No record labels yet.</p>';
    }
    App.toast('Record label removed', 'info');
  }

  // Delete media
  window.deleteMedia = async (id) => {
    const current = Auth.current();
    if (!current) return;
    await DB.delete('media', id);
    current.mediaIds = (current.mediaIds || []).filter(x => x !== id);
    Auth.updateUser(current.username, { mediaIds: current.mediaIds });
    document.getElementById(`media-wrap-${id}`)?.remove();
    App.toast('Deleted', 'info');
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
      body = `<a href="${esc(rec.url)}" target="_blank" rel="noopener" class="btn btn-primary">${Icon('external-link')} Open link</a>`;
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
    App.toast(newVis === 'private' ? '🔒 Profile set to private – only you can see it' : '🌐 Profile set to public', 'success');
    renderView(username);
  }

  // Kort HTML for varsellyd-knappen — gjenspeiler av/på-tilstand (SC.soundOn).
  // Ligg i alle profiler; innstillinga er per eining (localStorage: pv_sound_on)
  // og deles med FriendChat/Messenger sin lyd-toggle.
  function notifySoundBtnHtml() {
    const on = window.SC ? SC.soundOn() : true;
    return `<button class="btn btn-ghost btn-sm" id="profile-sound-toggle" onclick="Profile.toggleNotifySound(this)" title="${on ? 'Turn off notification sound' : 'Turn on notification sound'}">${on ? Icon('bell') : (Icon('volume-x') || '🔕')} ${on ? 'Notification sound on' : 'Notification sound off'}</button>`;
  }

  // Slå varsellyden av/på. Ved påslag spelast eit kort «bling» som forhåndsvisning.
  function toggleNotifySound(btn) {
    if (!window.SC) return;
    const on = SC.toggleSound();
    if (btn) {
      btn.innerHTML = `${on ? Icon('bell') : (Icon('volume-x') || '🔕')} ${on ? 'Notification sound on' : 'Notification sound off'}`;
      btn.title = on ? 'Turn off notification sound' : 'Turn on notification sound';
    }
    if (on && window.SC.playDing) SC.playDing('notif');   // kort bling ved påslag
    if (window.App) App.toast(on ? '🔔 Notification sound on' : '🔕 Notification sound off', 'info', 2000);
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
      ? 'Only you can see your profile. Others see a locked page.'
      : 'Anyone can find and view your profile.';

    App.toast(value === 'private' ? '🔒 Profile set to private' : '🌐 Profile set to public', 'success');
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
            <button class="paint-tool active" id="ptool-pencil" onclick="window._setPaintTool('pencil',this)" title="Pencil">${Icon('edit')}</button>
            <button class="paint-tool" id="ptool-line"   onclick="window._setPaintTool('line',this)"   title="Line"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="19" x2="19" y2="5"/></svg></button>
            <button class="paint-tool" id="ptool-rect"   onclick="window._setPaintTool('rect',this)"   title="Rectangle"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="6" width="16" height="12" rx="1.5"/></svg></button>
            <button class="paint-tool" id="ptool-eraser" onclick="window._setPaintTool('eraser',this)" title="Eraser"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m7 21-4.3-4.3a1 1 0 0 1 0-1.4L13.6 4.4a2 2 0 0 1 2.8 0l3.2 3.2a2 2 0 0 1 0 2.8L11 21"/><path d="m5.5 12.5 6 6"/><path d="M22 21H7"/></svg></button>
            <button class="paint-tool" id="ptool-text"   onclick="window._setPaintTool('text',this)"   title="Text">${Icon('type')}</button>
          </div>
          <div class="paint-divider"></div>
          <div class="paint-color-group">
            <span class="paint-label">Color</span>
            <input type="color" id="paint-color" value="#ff0000" class="paint-color-input" title="Color picker">
            <span class="paint-label">Size</span>
            <input type="range" id="paint-size" min="1" max="50" value="4" class="paint-size-range">
            <span id="paint-size-val" class="paint-size-val">4</span>
          </div>
          <div class="paint-divider"></div>
          <div class="paint-text-group" id="paint-text-group" style="display:none">
            <input type="text" id="paint-text-input" placeholder="Write text here..." class="paint-text-field">
            <select id="paint-font-size" class="paint-font-sel">
              ${[12,16,20,24,32,48,64,80].map(s => `<option value="${s}" ${s===24?'selected':''}>${s}px</option>`).join('')}
            </select>
            <label class="paint-bold-check"><input type="checkbox" id="paint-text-bold" checked> <b>B</b></label>
          </div>
          <div class="paint-actions">
            <button class="paint-action-btn" onclick="window._paintUndo()">${Icon('corner-down-left')} Undo</button>
            <button class="paint-action-btn p-danger" onclick="window._closePaintEditor(false)">${Icon('x')} Cancel</button>
            <button class="paint-action-btn p-primary" onclick="window._closePaintEditor(true)">${Icon('check')} Apply</button>
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
          <span id="paint-info">Pencil — click and drag to draw</span>
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

    const toolNames = {pencil:'Pencil',line:'Line',rect:'Rectangle',eraser:'Eraser',text:'Text'};
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
      infoEl.textContent = toolNames[tool] + (tool === 'text' ? ' — click the image to place text' : ' — click and drag to draw');
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
        if (!txt) { infoEl.textContent = 'Enter text in the field above first!'; return; }
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
    renderView, renderEditor, openEditorAt,
    switchTab,
    // Nærvær-status
    setStatus, toggleStatusMenu,
    renderWallTab,
    playTrack,
    reportTrack,
    toggleProfileVisibility, setProfileVisibility,
    toggleNotifySound,
    saveProfile, livePreview, collectTheme,
    uploadMedia, uploadMusic, uploadMusicCover, uploadSaleCover, uploadAvatar, uploadBanner,
    setAvatarFromProfile, deleteAvatar, migrateLocalMediaToCloud,
    setBannerFromProfile, deleteBanner,
    openBannerReposForFile, repositionBanner, nudgeBannerRepos, resetBannerRepos,
    saveBannerRepos, cancelBannerRepos,
    addMediaLink, toggleMediaVisibility,
    shareTrackToCommunity, shareMediaToCommunity,
    toggleTrackVisibility,
    openSongCreditsModal, saveSongCredits,
    deleteTrack,
    uploadBgImage, uploadBgVideo, openImagePaintEditor,
    aiBio, aiColors, aiLayout, applyAiColors, applyAiLayout,
    updateRoleLabel, selectEditorRole,
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
    // Samlet opplastingsmodal (fil / URL)
    openUploadModal, umMode, umFilePicked, umCoverPicked,
    submitMixFile, umFetchPreview, submitMixUrl,
    openMixEditModal, saveMixEdits, uploadMixCover,
    addTrackToModal, removeTrackFromModal, searchTrackOnGoogle,
    upgradeToPro, startStripeCheckout, confirmUpgrade,
    openMixPaywall, payMixHours,
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
    // Delt hjelper — fyller inn ekte profilbilder i initial-plassholdere
    hydrateAvatars,
    // Delt hjelper — fyller inn ekte banner-/forsidebilder på bruker-kort
    hydrateBanners,
  };
})();

// VIKTIG: eksponer på window. `const Profile` er kun en leksikalsk global og blir
// IKKE en window-egenskap, så alle `if (window.Profile && …)`-vaktene rundt om i
// koden (18 steder: feed, kommentarer, innlegg, venner, avatar-hydrering) var
// alltid usanne → profilbilder ble aldri hydrert noe sted. Samme mønster som
// window.Community/window.Social allerede bruker.
window.Profile = Profile;
