// DJ Hub — gig board, live session, private messaging
const DJ = (() => {

  const GIG_KEY = 'sr_dj_gigs';

  // ── Lyder (Web Audio API) ─────────────────────────────────────────────
  function playMessageSound(type = 'send') {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      if (type === 'send') {
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1100, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.22, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
        osc.start();
        osc.stop(ctx.currentTime + 0.18);
      } else {
        // receive — to-tone pling
        osc.frequency.setValueAtTime(523, ctx.currentTime);
        osc.frequency.setValueAtTime(659, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
        osc.start();
        osc.stop(ctx.currentTime + 0.28);
      }
      setTimeout(() => ctx.close().catch(() => {}), 600);
    } catch (_) {}
  }

  // ── Ulest PM-sporing ──────────────────────────────────────────────────
  function markConvRead(me, other) {
    const key = 'sr_pm_read_' + me;
    const reads = JSON.parse(localStorage.getItem(key) || '{}');
    reads[other] = Date.now();
    localStorage.setItem(key, JSON.stringify(reads));
    if (typeof App !== 'undefined') App.updateNavBadge();
  }

  function getTotalUnreadPMs(username) {
    const allUsers = Auth.getAllPublicUsers();
    const readKey  = 'sr_pm_read_' + username;
    const reads    = JSON.parse(localStorage.getItem(readKey) || '{}');
    let total = 0;
    for (const u of allUsers) {
      if (u.username === username) continue;
      const convKey  = pmChannelKey(username, u.username);
      const msgs     = JSON.parse(localStorage.getItem(convKey) || '[]');
      const lastRead = reads[u.username] || 0;
      total += msgs.filter(m => m.from !== username && m.ts > lastRead).length;
    }
    return total;
  }

  // ── Browser-notifikasjoner ────────────────────────────────────────────
  function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  function showPMNotification(fromName, text) {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    try {
      new Notification(`📬 Ny melding fra ${fromName}`, {
        body: text.length > 100 ? text.substring(0, 97) + '…' : text,
        tag:  'stellar-pm',
      });
    } catch (_) {}
  }

  function getGigs() {
    try { return JSON.parse(localStorage.getItem(GIG_KEY) || '[]'); }
    catch { return []; }
  }
  function saveGigs(g) { localStorage.setItem(GIG_KEY, JSON.stringify(g)); }

  function timeAgo(ts) {
    const d = Date.now() - ts;
    if (d < 60000)   return 'Akkurat nå';
    if (d < 3600000) return `${Math.floor(d/60000)} min siden`;
    if (d < 86400000) return `${Math.floor(d/3600000)} t siden`;
    return `${Math.floor(d/86400000)} d siden`;
  }

  // ── Main DJ page ───────────────────────────────────────────────────────
  function render() {
    const app     = document.getElementById('app');
    const current = Auth.current();
    const gigs    = getGigs().sort((a, b) => b.createdAt - a.createdAt);
    const djUsers = Auth.getAllPublicUsers().filter(u => Auth.getUser(u.username)?.isDJ);

    app.innerHTML = `
      <div class="dj-page">
        <!-- Hero -->
        <div class="dj-hero">
          <div class="dj-hero-glow"></div>
          <div class="dj-hero-content">
            <div class="dj-hero-badge">🎛️ DJ Hub</div>
            <h1 class="dj-hero-title">DJ<span>Network</span></h1>
            <p class="dj-hero-sub">Finn en jobb, finn en DJ, eller stream ditt eget sett live via YouTube.</p>
            ${current ? `
              <div class="dj-hero-actions">
                <button class="btn btn-primary" onclick="DJ.openPostGig()">📢 Legg ut annonse</button>
                <button class="btn ${Auth.getUser(current.username)?.isDJ ? 'btn-ghost' : 'btn-ghost'}" onclick="DJ.toggleDJStatus()">
                  ${Auth.getUser(current.username)?.isDJ ? '✅ Du er registrert som DJ' : '🎛️ Registrer deg som DJ'}
                </button>
              </div>` : `
              <div class="dj-hero-actions">
                <a href="#/login" class="btn btn-primary">Logg inn for å annonsere</a>
              </div>`}
          </div>
        </div>

        <!-- Layout -->
        <div class="dj-layout">
          <!-- Left: Gig board + Live -->
          <div class="dj-main">
            <!-- Live Stream Section -->
            <div class="dj-section">
              <div class="dj-section-header">
                <div class="dj-section-title">🔴 Live DJ Session</div>
                <div class="dj-section-sub">Lim inn YouTube-lenke for å strømme ditt sett live</div>
              </div>
              <div class="dj-live-wrap">
                <div class="dj-live-input-row">
                  <input class="form-input" id="dj-yt-url" placeholder="https://youtube.com/watch?v=... eller https://youtu.be/...">
                  <button class="btn btn-primary" onclick="DJ.loadLiveStream()">▶ Start stream</button>
                  <button class="btn btn-ghost" onclick="DJ.stopLiveStream()" id="dj-stop-btn" style="display:none">⏹ Stopp</button>
                </div>
                <div id="dj-live-player" class="dj-live-player hidden">
                  <div class="dj-live-badge-wrap">
                    <span class="dj-live-pill"><span class="dj-live-dot"></span> LIVE</span>
                  </div>
                  <div id="dj-yt-frame-wrap"></div>
                </div>
                <div class="dj-live-hint">
                  💡 Du kan også hoste via webcam — start en YouTube Live stream og lim inn lenken her.
                </div>
              </div>
            </div>

            <!-- Gig board -->
            <div class="dj-section">
              <div class="dj-section-header">
                <div class="dj-section-title">📋 Oppdrag & Tilbud</div>
                <div class="dj-section-sub">Arrangører søker DJ · DJer søker jobb</div>
              </div>
              <div id="dj-gig-list">
                ${gigs.length ? gigs.map(gigCard).join('') : `
                  <div class="dj-empty">
                    <div style="font-size:3rem">🎛️</div>
                    <p>Ingen annonser ennå. Vær den første!</p>
                    ${current ? `<button class="btn btn-primary" style="margin-top:1rem" onclick="DJ.openPostGig()">Legg ut annonse</button>` : ''}
                  </div>`}
              </div>
            </div>
          </div>

          <!-- Right sidebar: DJ profiles -->
          <div class="dj-sidebar">
            <div class="dj-sidebar-card">
              <div class="dj-sidebar-title">🎛️ DJer på Stellar</div>
              ${djUsers.length ? djUsers.map(u => `
                <div class="dj-profile-item">
                  <a class="dj-profile-link" href="#/u/${u.username}">
                    <div class="dj-profile-av">${u.displayName.charAt(0).toUpperCase()}</div>
                    <div>
                      <div class="dj-profile-name">${u.displayName}</div>
                      <div class="dj-profile-user">@${u.username}</div>
                    </div>
                  </a>
                  ${current && current.username !== u.username ? `
                    <button class="btn btn-ghost btn-sm" onclick="Router.go('/messages/${u.username}')">💬</button>
                  ` : ''}
                </div>`).join('') : `<p style="font-size:0.82rem;color:var(--text2)">Ingen registrerte DJer ennå.</p>`}
            </div>

            ${current ? `
            <div class="dj-sidebar-card">
              <div class="dj-sidebar-title">💬 Meldinger</div>
              <p style="font-size:0.82rem;color:var(--text2);margin-bottom:0.75rem">Send privat melding til andre brukere</p>
              <div class="dj-msg-search">
                <input class="form-input" id="dj-msg-user" placeholder="Søk brukernavn…" oninput="DJ.searchMsgUsers(this.value)">
              </div>
              <div id="dj-msg-results"></div>
            </div>` : ''}
          </div>
        </div>
      </div>

      <!-- Post gig modal content (hidden) -->
      <div id="dj-post-gig-content" style="display:none">
        <div class="modal-header">
          <h2>📢 Legg ut annonse</h2>
          <button class="btn-icon" onclick="App.closeModal()">✕</button>
        </div>
        <div style="padding:0 0 1rem">
          <div class="form-group">
            <label class="form-label">Type annonse</label>
            <select class="form-input" id="gig-type">
              <option value="dj-available">🎛️ DJ tilgjengelig for jobb</option>
              <option value="dj-wanted">📢 Søker DJ til arrangement</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Tittel</label>
            <input class="form-input" id="gig-title" placeholder="f.eks. «DJ søker fredagsjobb i Oslo»">
          </div>
          <div class="form-group">
            <label class="form-label">Beskrivelse</label>
            <textarea class="form-input" id="gig-desc" rows="3" placeholder="Sjanger, erfaring, dato, sted, pris…"></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Kontakt (e-post, Insta, tlf…)</label>
            <input class="form-input" id="gig-contact" placeholder="deg@eksempel.no">
          </div>
          <button class="btn btn-primary w-full" onclick="DJ.postGig()">Publiser annonse</button>
        </div>
      </div>
    `;
  }

  function gigCard(g) {
    const isAvail = g.type === 'dj-available';
    return `
      <div class="dj-gig-card">
        <div class="dj-gig-type-badge dj-gig-type-${g.type}">
          ${isAvail ? '🎛️ DJ tilgjengelig' : '📢 Søker DJ'}
        </div>
        <div class="dj-gig-title">${g.title}</div>
        ${g.desc ? `<div class="dj-gig-desc">${g.desc}</div>` : ''}
        <div class="dj-gig-footer">
          <span class="dj-gig-author">
            <a href="#/u/${g.username}" style="color:var(--accent)">${g.displayName}</a>
            · ${timeAgo(g.createdAt)}
          </span>
          <div style="display:flex;gap:0.4rem;align-items:center">
            ${g.contact ? `<a class="btn btn-ghost btn-sm" href="mailto:${g.contact}" style="font-size:0.72rem">📧 Kontakt</a>` : ''}
            ${Auth.current()?.username === g.username ? `<button class="btn-icon btn-danger" onclick="DJ.deleteGig('${g.id}')" title="Slett">🗑</button>` : ''}
          </div>
        </div>
      </div>`;
  }

  function openPostGig() {
    const content = document.getElementById('dj-post-gig-content');
    const box = document.getElementById('modal-box');
    if (!content || !box) return;
    box.innerHTML = content.innerHTML;
    App.openModal();
  }

  function postGig() {
    const current = Auth.current();
    if (!current) return;
    const type    = document.getElementById('gig-type')?.value;
    const title   = document.getElementById('gig-title')?.value?.trim();
    const desc    = document.getElementById('gig-desc')?.value?.trim();
    const contact = document.getElementById('gig-contact')?.value?.trim();
    if (!title) { App.toast('Tittel er påkrevd', 'error'); return; }
    const gig = {
      id:          `gig_${Date.now()}`,
      type,
      title,
      desc,
      contact,
      username:    current.username,
      displayName: current.displayName,
      createdAt:   Date.now(),
    };
    const gigs = [gig, ...getGigs()];
    saveGigs(gigs);
    App.closeModal();
    App.toast('Annonse publisert! 🎛️', 'success');
    render();
  }

  function deleteGig(id) {
    saveGigs(getGigs().filter(g => g.id !== id));
    document.querySelector(`[data-gig-id="${id}"]`)?.remove();
    render();
    App.toast('Annonse slettet', 'info');
  }

  function toggleDJStatus() {
    const current = Auth.current();
    if (!current) return;
    const isDJ = !Auth.getUser(current.username)?.isDJ;
    Auth.updateUser(current.username, { isDJ });
    App.toast(isDJ ? 'Du er nå registrert som DJ! 🎛️' : 'DJ-status fjernet', 'info');
    render();
  }

  function loadLiveStream() {
    const input = document.getElementById('dj-yt-url');
    const url = input?.value?.trim();
    if (!url) { App.toast('Lim inn en YouTube-lenke', 'error'); return; }
    const videoId = extractYtId(url);
    if (!videoId) { App.toast('Ugyldig YouTube-lenke', 'error'); return; }
    const player = document.getElementById('dj-live-player');
    const frame  = document.getElementById('dj-yt-frame-wrap');
    const stop   = document.getElementById('dj-stop-btn');
    if (!player || !frame) return;
    frame.innerHTML = `<iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1" width="100%" height="360" frameborder="0" allow="autoplay;fullscreen" allowfullscreen></iframe>`;
    player.classList.remove('hidden');
    if (stop) stop.style.display = '';
  }

  function stopLiveStream() {
    const player = document.getElementById('dj-live-player');
    const frame  = document.getElementById('dj-yt-frame-wrap');
    const stop   = document.getElementById('dj-stop-btn');
    if (frame) frame.innerHTML = '';
    if (player) player.classList.add('hidden');
    if (stop) stop.style.display = 'none';
    const input = document.getElementById('dj-yt-url');
    if (input) input.value = '';
  }

  function extractYtId(url) {
    try {
      const u = new URL(url);
      const v = u.searchParams.get('v') || url.match(/youtu\.be\/([^?&]+)/)?.[1];
      if (v && /^[\w-]{11}$/.test(v)) return v;
    } catch {}
    return null;
  }

  function searchMsgUsers(q) {
    const res = document.getElementById('dj-msg-results');
    if (!res) return;
    if (!q.trim()) { res.innerHTML = ''; return; }
    const users = Auth.getAllPublicUsers().filter(u =>
      u.username.toLowerCase().includes(q.toLowerCase()) ||
      u.displayName.toLowerCase().includes(q.toLowerCase())
    ).slice(0, 5);
    res.innerHTML = users.map(u => `
      <div class="dj-msg-user-item" onclick="Router.go('/messages/${u.username}')">
        <div class="dj-profile-av" style="width:28px;height:28px;font-size:0.75rem">${u.displayName.charAt(0).toUpperCase()}</div>
        <div>
          <div style="font-size:0.82rem;font-weight:600">${u.displayName}</div>
          <div style="font-size:0.72rem;color:var(--text2)">@${u.username}</div>
        </div>
      </div>`).join('');
  }

  // ── Private chat ───────────────────────────────────────────────────────
  function renderPrivateChat(targetUsername) {
    const current = Auth.current();
    if (!current) { App.toast('Logg inn for å sende meldinger', 'error'); Router.go('/login'); return; }
    const target = Auth.getUser(targetUsername);
    if (!target) { Router.go('/dj'); return; }

    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="dj-chat-page">
        <div class="dj-chat-header">
          <a href="#/dj" class="btn btn-ghost btn-sm">← Tilbake</a>
          <a href="#/u/${target.username}" style="display:flex;align-items:center;gap:0.6rem;text-decoration:none;color:inherit">
            <div class="dj-profile-av">${target.displayName.charAt(0).toUpperCase()}</div>
            <div>
              <div style="font-weight:700">${target.displayName}</div>
              <div style="font-size:0.75rem;color:var(--text2)">@${target.username}</div>
            </div>
          </a>
        </div>
        <div id="pm-messages" class="dj-pm-messages"></div>
        <div class="dj-pm-input-row">
          <input class="form-input" id="pm-input" placeholder="Skriv melding…" onkeydown="if(event.key==='Enter')DJ.sendPM('${target.username}')">
          <button class="btn btn-primary" onclick="DJ.sendPM('${target.username}')">Send</button>
        </div>
      </div>`;

    loadPMHistory(current.username, target.username);
    markConvRead(current.username, target.username);
    startPMListen(current.username, target.username);
    requestNotificationPermission();
    document.getElementById('pm-input')?.focus();
  }

  function pmChannelKey(a, b) {
    return 'sr_pm_' + [a, b].sort().join('_');
  }

  function loadPMHistory(me, other) {
    const key  = pmChannelKey(me, other);
    const msgs = JSON.parse(localStorage.getItem(key) || '[]');
    const el   = document.getElementById('pm-messages');
    if (!el) return;
    el.innerHTML = msgs.map(m => pmMsgHtml(m, me)).join('');
    el.scrollTop = el.scrollHeight;
  }

  function startPMListen(me, other) {
    const key = pmChannelKey(me, other);
    let lastCount = JSON.parse(localStorage.getItem(key) || '[]').length;
    const iv = setInterval(() => {
      if (!document.getElementById('pm-messages')) { clearInterval(iv); return; }
      const msgs = JSON.parse(localStorage.getItem(key) || '[]');
      if (msgs.length > lastCount) {
        const newMsgs = msgs.slice(lastCount);
        const newFromOther = newMsgs.filter(m => m.from !== me);
        if (newFromOther.length > 0) {
          playMessageSound('receive');
          const last = newFromOther[newFromOther.length - 1];
          showPMNotification(last.displayName, last.text);
        }
        lastCount = msgs.length;
        loadPMHistory(me, other);
        markConvRead(me, other);
      }
    }, 1000);
  }

  async function sendPM(targetUsername) {
    const current = Auth.current();
    if (!current) return;
    const input = document.getElementById('pm-input');
    const text  = input?.value?.trim();
    if (!text) return;
    const key  = pmChannelKey(current.username, targetUsername);
    const msgs = JSON.parse(localStorage.getItem(key) || '[]');
    msgs.push({ from: current.username, displayName: current.displayName, text, ts: Date.now() });
    localStorage.setItem(key, JSON.stringify(msgs));
    if (input) input.value = '';
    loadPMHistory(current.username, targetUsername);
    playMessageSound('send');

    // E-postvarsel til mottaker
    const target = Auth.getUser(targetUsername);
    if (target?.email && typeof Email !== 'undefined') {
      Email.sendMessageNotification(target.email, target.displayName, current.displayName, current.username, text);
    }
  }

  function pmMsgHtml(m, me) {
    const isMine = m.from === me;
    return `
      <div class="dj-pm-msg ${isMine ? 'dj-pm-msg--mine' : ''}">
        ${!isMine ? `<div class="dj-pm-nick">${m.displayName}</div>` : ''}
        <div class="dj-pm-bubble">${m.text}</div>
        <div class="dj-pm-time">${new Date(m.ts).toLocaleTimeString('no-NO',{hour:'2-digit',minute:'2-digit'})}</div>
      </div>`;
  }

  return {
    render, renderPrivateChat,
    openPostGig, postGig, deleteGig,
    toggleDJStatus,
    loadLiveStream, stopLiveStream,
    searchMsgUsers, sendPM,
    getTotalUnreadPMs, requestNotificationPermission,
  };
})();
