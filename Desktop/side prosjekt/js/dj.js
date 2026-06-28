// Private messaging module — DJ-fanen (gig-board, live-DJ, stream) er fjernet.
// Kun 1-til-1 private meldinger gjenstår. Den globale heter fortsatt `DJ` fordi
// /messages-ruten kaller DJ.renderPrivateChat.
const DJ = (() => {

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
      new Notification(`${Icon('mail')} Ny melding fra ${fromName}`, {
        body: text.length > 100 ? text.substring(0, 97) + '…' : text,
        tag:  'stellar-pm',
      });
    } catch (_) {}
  }

  // ── Private chat ───────────────────────────────────────────────────────
  function renderPrivateChat(targetUsername) {
    const current = Auth.current();
    if (!current) { App.toast('Logg inn for å sende meldinger', 'error'); Router.go('/login'); return; }
    const target = Auth.getUser(targetUsername);
    if (!target) { Router.go('/inbox'); return; }

    const app = document.getElementById('app');
    app.innerHTML = `
      <div class="dj-chat-page">
        <div class="dj-chat-header">
          <a href="#/inbox" class="btn btn-ghost btn-sm">${Icon('arrow-left')} Tilbake</a>
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
    renderPrivateChat, sendPM,
    getTotalUnreadPMs, requestNotificationPermission,
  };
})();
