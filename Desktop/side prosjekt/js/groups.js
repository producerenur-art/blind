// Grupper — Facebook-lignende grupper over Gun.js (P2P, ingen serverless).
// Metadata i SC.NS.groups, innlegg i SC.NS.gposts (bærer groupId). Kommentarer,
// emoji og reaksjoner på gruppe-innlegg gjenbruker Social (target 'gpost:<id>').
// Synlighet ('open' | 'closed') håndheves klient-side, som venner-innlegg ellers.
const Groups = (() => {
  const esc = (s) => (window.SC ? SC.esc(s) : String(s == null ? '' : s));

  let _groups = {};   // id → group
  let _gposts = {};   // id → group-post
  let _subbed = false;
  let _view   = null; // null = liste, ellers gruppe-id (detaljvisning)
  let _invite = null; // gruppe-id som har åpen inviter-panel
  let _search = '';   // gjeldande søketekst i gruppelista
  let _repaintQueued = false;
  let _pendingBanner = '';   // banner valgt i opprett-skjemaet, før gruppa er lagra

  // ── Banner-bilde ───────────────────────────────────────────────────────
  // Skalerer ned eit bilde til eit data-URL (fallback når skylagring manglar,
  // så banneret framleis synkast til alle over Gun).
  function _downscaleImage(file, maxDim = 1280, quality = 0.82) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const scale = maxDim / Math.max(width, height);
          width = Math.round(width * scale); height = Math.round(height * scale);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        try { resolve(canvas.toDataURL('image/jpeg', quality)); }
        catch (e) { reject(e); }
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read the image')); };
      img.src = url;
    });
  }

  // Last opp eit banner-bilde og returner ein delbar URL (sky) eller eit
  // nedskalert data-URL (fallback). Banneret må vere ein URL alle kan sjå,
  // for grupper synkast P2P over Gun til alle einingar.
  async function _uploadBannerImage(file) {
    if (!file) return null;
    if (file.type && !/^image\//.test(file.type)) { App.toast('Choose an image file', 'error'); return null; }
    const useCloud = (typeof SC_Storage !== 'undefined') && SC_Storage.isConfigured();
    if (useCloud) {
      try {
        const res = await SC_Storage.upload(file, { prefix: 'groupbanner' });
        return res.url;
      } catch (e) { /* sky feila → fall gjennom til data-URL */ }
    }
    try { return await _downscaleImage(file); }
    catch (e) { App.toast('Could not read the image', 'error'); return null; }
  }

  // ── Gun-abonnement ─────────────────────────────────────────────────────
  function subscribe() {
    if (window.SC && SC.gun() && !_subbed) {
      _subbed = true;
      const g = SC.gun();
      SC.sub(g.get(SC.NS.groups).get('groups'), (grp, key) => {
        if (!grp || !grp.id) { return; }
        _groups[grp.id] = { ...grp, _k: key };
        queuePaint();
      });
      SC.sub(g.get(SC.NS.gposts).get('gposts'), (p, key) => {
        if (!p || !p.id) return;
        _gposts[p.id] = { ...p, _k: key };
        queuePaint();
      });
    }
    _startGroupSyncPoll();
  }

  // Gun sine offentlege relear leverer IKKJE pålitelig mellom to ULIKE
  // nettlesarar (sjå minne soundcore-gun-relay-browser-sync) — GroupSync
  // (server-autorisert, api/groups.js) er difor den faktisk pålitelige
  // transporten for gruppemetadata + -innlegg, polla ved sida av Gun.
  // Held Gun sin _k om han finst (så eksisterande .put()-kall framleis
  // fungerer for grupper som først vart oppretta via Gun).
  let _gsPolling = false;
  function _startGroupSyncPoll() {
    if (_gsPolling || typeof GroupSync === 'undefined' || !GroupSync._enabled()) return;
    _gsPolling = true;
    const pullGroups = async () => {
      const rows = await GroupSync.listGroups();
      let changed = false;
      for (const row of rows) {
        const existing = _groups[row.id];
        _groups[row.id] = {
          ...row, ownerDisplay: row.owner_display, createdAt: row.ts,
          members: typeof row.members === 'string' ? row.members : JSON.stringify(row.members || []),
          _k: existing ? existing._k : undefined,
        };
        changed = true;
      }
      if (changed) queuePaint();
    };
    pullGroups();
    setInterval(pullGroups, 8000);
  }

  // Poll innlegga for éi gruppe (kalla når nokon faktisk ser på gruppa —
  // ikkje alle grupper sine innlegg heile tida).
  const _gpPolled = new Set();
  function _pollGroupPosts(groupId) {
    if (_gpPolled.has(groupId) || typeof GroupSync === 'undefined' || !GroupSync._enabled()) return;
    _gpPolled.add(groupId);
    const pull = async () => {
      const rows = await GroupSync.listPosts(groupId);
      let changed = false;
      for (const row of rows) {
        const existing = _gposts[row.id];
        _gposts[row.id] = {
          ...row, groupId: row.group_id, author: row.author, authorDisplay: row.author_display,
          _k: existing ? existing._k : undefined,
        };
        changed = true;
      }
      if (changed) queuePaint();
    };
    pull();
    setInterval(pull, 8000);
  }
  // Gun kan sende oppdatering på slett (data=null) — fang det på nøkkel-nivå.
  let _deletesWatched = false;
  function watchDeletes() {
    if (_deletesWatched) return;   // idempotent — elles hopar map().on()-lyttarane seg opp for kvar render/composer
    if (!window.SC || !SC.gun()) return;
    _deletesWatched = true;
    SC.gun().get(SC.NS.groups).get('groups').map().on((d, k) => {
      if (d === null) { for (const id in _groups) if (_groups[id]._k === k) delete _groups[id]; queuePaint(); }
    });
    SC.gun().get(SC.NS.gposts).get('gposts').map().on((d, k) => {
      if (d === null) { for (const id in _gposts) if (_gposts[id]._k === k) delete _gposts[id]; queuePaint(); }
    });
  }

  function queuePaint() {
    if (_repaintQueued) return;
    _repaintQueued = true;
    setTimeout(() => { _repaintQueued = false; if (document.getElementById('groups-root')) paint(); }, 120);
  }

  // ── Medlemskap-hjelparar ───────────────────────────────────────────────
  function members(g) { try { return JSON.parse(g.members || '[]'); } catch { return []; } }
  function isMember(g, u) { return !!u && members(g).includes(u); }
  function isOwner(g, u)  { return !!u && g.owner === u; }
  function canSee(g, me)  { return g.privacy === 'open' || (me && isMember(g, me.username)); }
  function groupPosts(id) {
    return Object.values(_gposts).filter(p => p.groupId === id).sort((a, b) => (Number(b.ts) || 0) - (Number(a.ts) || 0));
  }
  function saveMembers(g, arr) {
    const uniq = [...new Set(arr)];
    try { SC.gun().get(SC.NS.groups).get('groups').get(g._k).put({ members: JSON.stringify(uniq) }); } catch {}
    _groups[g.id] = { ..._groups[g.id], members: JSON.stringify(uniq) };
  }

  // ── Opprett / rediger / slett ──────────────────────────────────────────
  function createGroup() {
    const me = Auth.current();
    if (!me) { if (window.Router) Router.go('/login'); return; }
    const name = (document.getElementById('grp-name')?.value || '').trim();
    if (!name) { App.toast('Give the group a name', 'error'); return; }
    const desc    = (document.getElementById('grp-desc')?.value || '').trim();
    const rules   = (document.getElementById('grp-rules')?.value || '').trim();
    const privacy = (document.getElementById('grp-privacy')?.value === 'closed') ? 'closed' : 'open';
    const g = {
      id: 'g_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      name, description: desc, rules, privacy,
      owner: me.username, ownerDisplay: me.displayName || me.username,
      members: JSON.stringify([me.username]),
      banner: _pendingBanner || '',
      createdAt: Date.now(), ts: Date.now(),
    };
    try { SC.gun().get(SC.NS.groups).get('groups').set(g); } catch (e) { console.warn('[Groups] create', e); }
    if (typeof GroupSync !== 'undefined') GroupSync.upsertGroup(g).catch(() => {});
    _groups[g.id] = { ...g };
    App.toast('🎉 Group created!', 'success');
    _showCreate = false; _pendingBanner = ''; _view = g.id; paint();
  }

  // Banner valgt i opprett-skjemaet (før gruppa finst) — hald det i minne og
  // vis ei forhåndsvisning; det lagrast på gruppa når «Opprett» trykkast.
  async function pickCreateBanner(input) {
    const file = input && input.files && input.files[0];
    if (!file) return;
    App.toast('Processing banner…', 'info');
    const url = await _uploadBannerImage(file);
    if (!url) return;
    _pendingBanner = url;
    const prev = document.getElementById('grp-banner-preview');
    if (prev) prev.style.backgroundImage = `url(${url})`;
    const hint = document.getElementById('grp-banner-hint');
    if (hint) hint.textContent = 'Banner selected ✓ — click to change';
  }

  // Sett/bytt banner på ei EKSISTERANDE gruppe (kun eigar).
  async function setGroupBanner(id, input) {
    const g = _groups[id]; const me = Auth.current();
    if (!g || !isOwner(g, me?.username)) return;
    const file = input && input.files && input.files[0];
    if (!file) return;
    App.toast('Uploading banner…', 'info');
    const url = await _uploadBannerImage(file);
    if (!url) return;
    if (g._k) try { SC.gun().get(SC.NS.groups).get('groups').get(g._k).put({ banner: url }); } catch {}
    if (typeof GroupSync !== 'undefined') GroupSync.upsertGroup({ ...g, banner: url }).catch(() => {});
    _groups[id] = { ...g, banner: url };
    App.toast('Banner updated ✓', 'success'); paint();
  }

  // Fjern banneret frå ei gruppe (kun eigar).
  function removeGroupBanner(id) {
    const g = _groups[id]; const me = Auth.current();
    if (!g || !isOwner(g, me?.username)) return;
    if (g._k) try { SC.gun().get(SC.NS.groups).get('groups').get(g._k).put({ banner: '' }); } catch {}
    if (typeof GroupSync !== 'undefined') GroupSync.upsertGroup({ ...g, banner: '' }).catch(() => {});
    _groups[id] = { ...g, banner: '' };
    App.toast('Banner removed', 'success'); paint();
  }

  function editGroup(id) {
    const g = _groups[id]; const me = Auth.current();
    if (!g || !isOwner(g, me?.username)) return;
    const name = prompt('New group name:', g.name);
    if (name === null) return;
    const trimmed = name.trim(); if (!trimmed) { App.toast('Name cannot be empty', 'error'); return; }
    const rules = prompt('Group rules (optional):', g.rules || '');
    if (rules === null) return;
    if (g._k) try { SC.gun().get(SC.NS.groups).get('groups').get(g._k).put({ name: trimmed, rules: rules.trim() }); } catch {}
    if (typeof GroupSync !== 'undefined') GroupSync.upsertGroup({ ...g, name: trimmed, rules: rules.trim() }).catch(() => {});
    _groups[id] = { ...g, name: trimmed, rules: rules.trim() };
    App.toast('Group updated ✓', 'success'); paint();
  }

  function deleteGroup(id) {
    const g = _groups[id]; const me = Auth.current();
    if (!g || !isOwner(g, me?.username)) return;
    if (!confirm(`Delete the group «${g.name}»? This cannot be undone.`)) return;
    if (g._k) try { SC.gun().get(SC.NS.groups).get('groups').get(g._k).put(null); } catch {}
    if (typeof GroupSync !== 'undefined') GroupSync.deleteGroup(id).catch(() => {});
    delete _groups[id];
    if (_view === id) _view = null;
    App.toast('Group deleted', 'success'); paint();
  }

  // ── Bli med / forlat / inviter ─────────────────────────────────────────
  function joinGroup(id) {
    const g = _groups[id]; const me = Auth.current();
    if (!g || !me) return;
    if (g.privacy === 'closed' && !isMember(g, me.username)) { App.toast('This group is closed — you must be invited', 'info'); return; }
    saveMembers(g, [...members(g), me.username]);
    if (typeof GroupSync !== 'undefined') GroupSync.updateMembers(id, 'join').catch(() => {});
    App.toast(`You are now in «${g.name}» 🎉`, 'success'); paint();
  }
  function leaveGroup(id) {
    const g = _groups[id]; const me = Auth.current();
    if (!g || !me) return;
    if (isOwner(g, me.username)) { App.toast('The owner cannot leave — delete the group instead', 'info'); return; }
    saveMembers(g, members(g).filter(u => u !== me.username));
    if (typeof GroupSync !== 'undefined') GroupSync.updateMembers(id, 'leave').catch(() => {});
    App.toast('You left the group', 'success'); paint();
  }
  function toggleInvite(id) { _invite = (_invite === id) ? null : id; paint(); }
  function doInvite(id, username) {
    const g = _groups[id]; const me = Auth.current();
    if (!g || !me || !isMember(g, me.username)) return;
    saveMembers(g, [...members(g), username]);
    if (typeof GroupSync !== 'undefined') GroupSync.updateMembers(id, 'invite', username).catch(() => {});
    if (window.Notify) Notify.emit(username, {
      type: 'group', text: `added you to the group «${g.name}»`, link: '#/grupper',
    });
    App.toast(`${username} has been invited ✓`, 'success'); paint();
  }

  // ── Innlegg i gruppe ───────────────────────────────────────────────────
  // Grupper den innloggede brukeren er medlem av (for deling + profil-fane).
  function myGroups() {
    const me = Auth.current(); if (!me) return [];
    return Object.values(_groups).filter(g => isMember(g, me.username))
      .sort((a, b) => (b.ts || 0) - (a.ts || 0));
  }

  // Synlige grupper en gitt bruker er medlem av (for visning på profilen deres).
  // Skjuler lukkede grupper for utenforstående.
  function groupsOfUser(username) {
    const me = Auth.current();
    return Object.values(_groups)
      .filter(g => isMember(g, username) && canSee(g, me))
      .sort((a, b) => (b.ts || 0) - (a.ts || 0));
  }

  // Grupper en bruker har OPPRETTET (eier), synlige for den som ser på.
  function ownedGroups(username) {
    const me = Auth.current();
    return Object.values(_groups)
      .filter(g => isOwner(g, username) && canSee(g, me))
      .sort((a, b) => (b.ts || 0) - (a.ts || 0));
  }

  // Varsle alle medlemmar i gruppa (utanom forfattaren) om eit nytt innlegg.
  function _notifyGroup(g, me) {
    if (!window.Notify || !g || !me) return;
    members(g).forEach(uname => {
      if (uname && uname !== me.username) {
        Notify.emit(uname, {
          type: 'group', from: me.username, fromDisplay: me.displayName || me.username,
          text: `shared a new post in «${g.name}»`, link: '#/grupper',
        });
      }
    });
  }

  // Programmatisk innlegg — brukt av Share for å dele et innlegg videre til ei gruppe.
  function shareToGroup(id, text) {
    const g = _groups[id]; const me = Auth.current();
    if (!g || !me) { if (window.Router) Router.go('/login'); return false; }
    if (!isMember(g, me.username)) { if (typeof App !== 'undefined') App.toast('You must be a member of the group to share there.', 'error'); return false; }
    const body = (text || '').trim(); if (!body) return false;
    const p = {
      id: 'gp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      groupId: id, author: me.username, authorDisplay: me.displayName || me.username,
      text: body, ts: Date.now(),
    };
    try { SC.gun().get(SC.NS.gposts).get('gposts').set(p); } catch (e) { console.warn('[Groups] share', e); }
    if (typeof GroupSync !== 'undefined') GroupSync.createPost(p).catch(() => {});
    _gposts[p.id] = { ...p };
    _notifyGroup(g, me);
    if (typeof App !== 'undefined') App.toast('Shared to the group! 🎉', 'success');
    return true;
  }

  // Kompakt gruppe-fane til bruk på ein profil: brukerens grupper + søk/oppdag.
  function renderProfileGroups(elId, username) {
    subscribe(); watchDeletes();
    const el = document.getElementById(elId); if (!el) return;
    const me = Auth.current();
    const own = groupsOfUser(username);
    const ownHtml = own.length
      ? `<div class="groups-grid">${own.map(cardHtml).join('')}</div>`
      : `<div class="community-empty">${esc(username)} isn't in any visible groups yet.</div>`;
    el.innerHTML = `
      <div class="groups-section">
        <h3 class="groups-section-title">${Icon('users')} ${esc(username)}'s groups</h3>
        ${ownHtml}
      </div>
      <div class="groups-search" style="margin-top:1rem">
        <input class="form-input" id="grp-search" type="search" placeholder="🔎 Search all groups on SiriusFM…"
          value="${esc(_search || '')}" oninput="Groups.setSearch(this.value)">
      </div>
      <div id="groups-results">${resultsHtml(me)}</div>
      <div style="margin-top:1rem">
        <button class="btn btn-ghost btn-sm" onclick="Router.go('/grupper')">${Icon('arrow-right')} Open full Groups page</button>
      </div>`;
    if (window.Profile && Profile.hydrateAvatars) Profile.hydrateAvatars(el);
  }

  // «Mine grupper»-fane på profilen: gruppene brukeren SELV har opprettet (eier).
  function renderMyGroups(elId, username) {
    subscribe(); watchDeletes();
    const el = document.getElementById(elId); if (!el) return;
    const me = Auth.current();
    const isOwn = !!(me && me.username === username);
    const owned = ownedGroups(username);
    const grid = owned.length
      ? `<div class="groups-grid">${owned.map(cardHtml).join('')}</div>`
      : `<div class="community-empty">${isOwn
          ? "You haven't created any groups yet."
          : `${esc(username)} hasn't created any visible groups yet.`}</div>`;
    const createBtn = isOwn
      ? `<button class="btn btn-primary btn-sm" onclick="Groups.openCreatePage()">${Icon('plus')} Create group</button>`
      : '';
    el.innerHTML = `
      <div class="groups-section">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:0.75rem;flex-wrap:wrap">
          <h3 class="groups-section-title" style="margin:0">${Icon('users')} ${isOwn ? 'My groups' : `Groups created by ${esc(username)}`}</h3>
          ${createBtn}
        </div>
        ${grid}
      </div>`;
    if (window.Profile && Profile.hydrateAvatars) Profile.hydrateAvatars(el);
  }

  // «Se eksisterende grupper»-fane på profilen: ALLE grupper som er opprettet
  // på SiriusFM (synlige for den som ser på — lukkede grupper skjules med mindre
  // du er medlem). Med søk. Gjelder alle profiler.
  function renderAllGroups(elId) {
    subscribe(); watchDeletes();
    const el = document.getElementById(elId); if (!el) return;
    const me = Auth.current();
    const q  = (_search || '').trim().toLowerCase();
    const match = g => !q || (g.name || '').toLowerCase().includes(q)
      || (g.description || '').toLowerCase().includes(q)
      || (g.ownerDisplay || g.owner || '').toLowerCase().includes(q);
    const all = Object.values(_groups)
      .filter(g => canSee(g, me) && match(g))
      .sort((a, b) => (b.ts || 0) - (a.ts || 0));
    const grid = all.length
      ? `<div class="groups-grid">${all.map(cardHtml).join('')}</div>`
      : `<div class="community-empty">${q ? 'No groups match your search.' : 'No groups created yet — make the first one!'}</div>`;
    el.innerHTML = `
      <div class="groups-section">
        <h3 class="groups-section-title">${Icon('globe')} All groups on SiriusFM ${all.length ? `<span style="color:var(--text3);font-weight:400">(${all.length})</span>` : ''}</h3>
        <div class="groups-search" style="margin:0.5rem 0 1rem">
          <input class="form-input" id="grp-search" type="search" placeholder="🔎 Search all groups — name, topic, owner…"
            value="${esc(_search || '')}" oninput="Groups.setSearchAll(this.value)">
        </div>
        ${grid}
      </div>`;
    if (window.Profile && Profile.hydrateAvatars) Profile.hydrateAvatars(el);
  }

  // Søk brukt av «Se eksisterende grupper»-fanen (rerender samme container).
  function setSearchAll(v) {
    _search = v || '';
    const el = document.getElementById('tab-alle-grupper');
    if (el) {
      renderAllGroups('tab-alle-grupper');
      const inp = document.getElementById('grp-search');
      if (inp) { inp.focus(); inp.setSelectionRange(inp.value.length, inp.value.length); }
    }
  }

  function postToGroup(id) {
    const g = _groups[id]; const me = Auth.current();
    if (!g || !me || !isMember(g, me.username)) return;
    const inp = document.getElementById('gpost-input');
    const text = (inp?.value || '').trim();
    if (!text) return;
    const p = {
      id: 'gp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      groupId: id, author: me.username, authorDisplay: me.displayName || me.username,
      text, ts: Date.now(),
    };
    try { SC.gun().get(SC.NS.gposts).get('gposts').set(p); } catch (e) { console.warn('[Groups] post', e); }
    if (typeof GroupSync !== 'undefined') GroupSync.createPost(p).catch(() => {});
    _gposts[p.id] = { ...p };
    _notifyGroup(g, me);
    if (inp) inp.value = '';
    App.toast('Post shared in the group!', 'success'); paint();
  }
  function deleteGPost(id) {
    const p = _gposts[id]; const me = Auth.current();
    const g = p && _groups[p.groupId];
    if (!p || !me) return;
    if (p.author !== me.username && !(g && isOwner(g, me.username))) return;  // forfatter eller gruppe-eier
    if (!confirm('Delete this post?')) return;
    if (p._k) try { SC.gun().get(SC.NS.gposts).get('gposts').get(p._k).put(null); } catch {}
    if (typeof GroupSync !== 'undefined') GroupSync.deletePost(id).catch(() => {});
    delete _gposts[id];
    App.toast('Post deleted', 'success'); paint();
  }

  // ── Rendering ──────────────────────────────────────────────────────────
  let _showCreate = false;
  function toggleCreate() { _showCreate = !_showCreate; if (!_showCreate) _pendingBanner = ''; paint(); }
  // Åpne opprett-gruppe-skjemaet fra hvor som helst (f.eks. «Opprett gruppe» på
  // profil-fanelinja). Gjelder ALLE innloggede brukere — ingen abonnements-krav.
  function openCreatePage() {
    const me = Auth.current();
    if (!me) { if (window.Router) Router.go('/login'); return; }
    _showCreate = true;
    if (window.Router) Router.go('/grupper');
    else paint();
  }
  function open(id) { _view = id; _invite = null; paint(); window.scrollTo(0, 0); }
  function back()   { _view = null; _invite = null; paint(); }

  function render() {
    subscribe(); watchDeletes();
    const app = document.getElementById('app'); if (!app) return;
    app.innerHTML = `
      <div class="community-wrap">
        <div class="community-head">
          <h1>${Icon('users')} Groups</h1>
          <p>Create your own group, invite people and share posts — open to everyone or invite-only.</p>
        </div>
        <div id="groups-root"></div>
      </div>`;
    paint();
  }

  function paint() {
    const root = document.getElementById('groups-root'); if (!root) return;
    const me = Auth.current();
    const g = _view ? _groups[_view] : null;
    if (g && canSee(g, me)) { root.innerHTML = detailHtml(g, me); }
    else { if (_view && !g) _view = null; root.innerHTML = listHtml(me); }
    if (window.Profile && Profile.hydrateAvatars) Profile.hydrateAvatars(root);
    if (window.LinkPreview) LinkPreview.hydrate(root);
  }

  function resultsHtml(me) {
    const q = (_search || '').trim().toLowerCase();
    const match = g => !q || (g.name || '').toLowerCase().includes(q)
      || (g.description || '').toLowerCase().includes(q)
      || (g.ownerDisplay || g.owner || '').toLowerCase().includes(q);
    const all  = Object.values(_groups).filter(match).sort((a, b) => (b.ts || 0) - (a.ts || 0));
    const mine = all.filter(x => me && isMember(x, me.username));
    const disc = all.filter(x => x.privacy === 'open' && !(me && isMember(x, me.username)));
    const section = (title, arr, empty) => `
      <div class="groups-section">
        <h3 class="groups-section-title">${title}</h3>
        ${arr.length ? `<div class="groups-grid">${arr.map(cardHtml).join('')}</div>`
          : `<div class="community-empty">${empty}</div>`}
      </div>`;
    return `
      ${me ? section(`${Icon('users')} My groups`, mine, q ? 'None of your groups match your search.' : "You aren't in any groups yet.") : ''}
      ${section(`${Icon('globe')} Discover groups`, disc, q ? 'No groups match your search.' : 'No open groups yet — make the first one!')}`;
  }

  function setSearch(v) {
    _search = v || '';
    const res = document.getElementById('groups-results');
    if (res) res.innerHTML = resultsHtml(Auth.current());
  }

  function listHtml(me) {
    const createForm = _showCreate ? `
      <div class="community-composer groups-create">
        <div class="form-group"><label class="form-label">Banner (optional)</label>
          <div class="groups-banner-pick" onclick="document.getElementById('grp-banner-input').click()"
               id="grp-banner-preview"${_pendingBanner ? ` style="background-image:url(${_pendingBanner})"` : ''}>
            <span class="groups-banner-hint" id="grp-banner-hint">${Icon('camera')} ${_pendingBanner ? 'Banner selected ✓ — click to change' : 'Click to upload a banner image'}</span>
          </div>
          <input type="file" id="grp-banner-input" accept="image/*" style="display:none" onchange="Groups.pickCreateBanner(this)"></div>
        <div class="form-group"><label class="form-label">Group name</label>
          <input class="form-input" id="grp-name" maxlength="60" placeholder="E.g. Psytrance Norway"></div>
        <div class="form-group"><label class="form-label">Description (optional)</label>
          <input class="form-input" id="grp-desc" maxlength="140" placeholder="A short bit about the group"></div>
        <div class="form-group"><label class="form-label">Group rules (optional)</label>
          <textarea class="form-input" id="grp-rules" rows="3" maxlength="1000" placeholder="E.g. 1. Be kind  2. No spam …"></textarea></div>
        <div class="form-group"><label class="form-label">Who can join?</label>
          <select class="form-input" id="grp-privacy">
            <option value="open">🌐 Open — anyone can join</option>
            <option value="closed">🔒 Closed — invite only</option>
          </select></div>
        <div style="display:flex;gap:0.5rem">
          <button class="btn btn-primary btn-sm" onclick="Groups.createGroup()">${Icon('check')} Create group</button>
          <button class="btn btn-ghost btn-sm" onclick="Groups.toggleCreate()">Cancel</button>
        </div>
      </div>` : `
      <button class="btn btn-primary" onclick="Groups.toggleCreate()">${Icon('users')} Create new group</button>`;
    const searchBox = `
      <div class="groups-search">
        <input class="form-input" id="grp-search" type="search" placeholder="🔎 Search groups — name, topic, owner…"
          value="${esc(_search || '')}" oninput="Groups.setSearch(this.value)">
      </div>`;
    return `
      <div style="margin-bottom:1.25rem">${createForm}</div>
      ${searchBox}
      <div id="groups-results">${resultsHtml(me)}</div>`;
  }

  function cardHtml(g) {
    const me = Auth.current();
    const cnt = members(g).length;
    const mem = isMember(g, me?.username);
    const badge = g.privacy === 'closed'
      ? `<span class="groups-badge groups-badge-closed">🔒 Closed</span>`
      : `<span class="groups-badge">🌐 Open</span>`;
    const action = mem
      ? `<button class="btn btn-ghost btn-sm" onclick="Groups.open('${g.id}')">${Icon('arrow-right')} Open</button>`
      : g.privacy === 'open'
        ? `<button class="btn btn-primary btn-sm" onclick="Groups.joinGroup('${g.id}')">Join</button>`
        : `<span style="font-size:0.78rem;color:var(--text3)">Invite only</span>`;
    const banner = g.banner
      ? `<div class="groups-card-banner" style="background-image:url(${esc(g.banner)})"></div>`
      : '';
    return `
      <div class="groups-card${g.banner ? ' groups-card--hasbanner' : ''}">
        ${banner}
        <div class="groups-card-top">
          <div class="groups-card-name">${esc(g.name)}</div>
          ${badge}
        </div>
        ${g.description ? `<div class="groups-card-desc">${esc(g.description)}</div>` : ''}
        <div class="groups-card-meta">${Icon('users')} ${cnt} member${cnt === 1 ? '' : 's'} · by ${esc(g.ownerDisplay || g.owner)}</div>
        <div class="groups-card-actions">${action}</div>
      </div>`;
  }

  function detailHtml(g, me) {
    const owner  = isOwner(g, me?.username);
    const mem    = isMember(g, me?.username);
    const mList  = members(g);
    const ownerCtl = owner ? `
      <button class="btn btn-ghost btn-sm" onclick="document.getElementById('grp-banner-edit').click()" title="${g.banner ? 'Change banner' : 'Upload banner'}">${Icon('camera')} ${g.banner ? 'Change banner' : 'Banner'}</button>
      ${g.banner ? `<button class="btn btn-ghost btn-sm" onclick="Groups.removeGroupBanner('${g.id}')" title="Remove banner">${Icon('trash')} Banner</button>` : ''}
      <input type="file" id="grp-banner-edit" accept="image/*" style="display:none" onchange="Groups.setGroupBanner('${g.id}', this)">
      <button class="btn btn-ghost btn-sm" onclick="Groups.editGroup('${g.id}')" title="Edit name/rules">${Icon('edit')} Edit</button>
      <button class="btn btn-ghost btn-sm" style="color:var(--red)" onclick="Groups.deleteGroup('${g.id}')" title="Delete group">${Icon('trash')} Delete</button>` : '';
    const inviteBtn = mem ? `<button class="btn btn-ghost btn-sm" onclick="Groups.toggleInvite('${g.id}')">${Icon('user')} Invite</button>` : '';
    const leaveBtn  = (mem && !owner) ? `<button class="btn btn-ghost btn-sm" onclick="Groups.leaveGroup('${g.id}')">${Icon('log-out')} Leave</button>` : '';
    const joinBtn   = (!mem && g.privacy === 'open') ? `<button class="btn btn-primary btn-sm" onclick="Groups.joinGroup('${g.id}')">Join</button>` : '';
    const invitePanel = (_invite === g.id) ? invitePanelHtml(g, mList) : '';
    const rules = g.rules ? `
      <details class="groups-rules"><summary>${Icon('clipboard')} Group rules</summary>
        <div class="groups-rules-body">${esc(g.rules).replace(/\n/g, '<br>')}</div></details>` : '';
    const composer = mem ? `
      <div class="community-composer">
        <textarea id="gpost-input" class="community-input" placeholder="Share something with the group…" maxlength="1000"></textarea>
        <div class="community-composer-row" style="justify-content:flex-end">
          <button class="btn btn-primary btn-sm" onclick="Groups.postToGroup('${g.id}')">${Icon('send')} Share</button>
        </div>
      </div>` : `<div class="community-empty">Join the group to write posts.</div>`;
    _pollGroupPosts(g.id);
    const posts = groupPosts(g.id);
    const feed = posts.length ? posts.map(p => gpostHtml(p, g, me)).join('')
      : '<div class="community-empty">No posts in the group yet.</div>';
    const bannerHero = g.banner
      ? `<div class="groups-detail-banner" style="background-image:url(${esc(g.banner)})"></div>`
      : '';
    return `
      <button class="btn btn-ghost btn-sm" onclick="Groups.back()" style="margin-bottom:0.75rem">${Icon('arrow-left')} All groups</button>
      ${bannerHero}
      <div class="groups-detail-head">
        <div>
          <h2 style="margin:0">${esc(g.name)} ${g.privacy === 'closed' ? '🔒' : '🌐'}</h2>
          ${g.description ? `<p style="margin:0.25rem 0 0;color:var(--text2)">${esc(g.description)}</p>` : ''}
          <div style="font-size:0.8rem;color:var(--text3);margin-top:0.25rem">${Icon('users')} ${mList.length} member${mList.length === 1 ? '' : 's'} · owner: ${esc(g.ownerDisplay || g.owner)}</div>
        </div>
        <div class="groups-detail-ctl">${joinBtn}${inviteBtn}${leaveBtn}${ownerCtl}</div>
      </div>
      ${invitePanel}
      ${rules}
      <div style="margin:1rem 0">${composer}</div>
      <div class="community-feed">${feed}</div>`;
  }

  function invitePanelHtml(g, mList) {
    const all = Object.values(Auth.getUsers ? Auth.getUsers() : {});
    const cand = all.filter(u => u && u.username && !mList.includes(u.username));
    const rows = cand.length ? cand.map(u => `
      <div class="groups-invite-row">
        <span>${esc(u.displayName || u.username)} <span style="color:var(--text3)">@${esc(u.username)}</span></span>
        <button class="btn btn-primary btn-sm" onclick="Groups.doInvite('${g.id}','${esc(u.username)}')">Invite</button>
      </div>`).join('') : '<div style="color:var(--text3);font-size:0.85rem">No one left to invite.</div>';
    return `<div class="groups-invite-panel">
      <div style="font-weight:700;margin-bottom:0.5rem">${Icon('user')} Invite to the group</div>${rows}</div>`;
  }

  // Bilde-URL-er vises som faktiske bilder; andre lenker (YouTube, Bandcamp, …)
  // får eit forhåndsvisnings-kort (cover + play), likt community-veggen.
  function _isImageUrl(u) {
    return /^https?:\/\/\S+\.(?:jpe?g|png|gif|webp|avif|bmp|svg)(?:[?#]\S*)?$/i.test(String(u || ''));
  }

  function gpostHtml(p, g, me) {
    const initial = (p.authorDisplay || p.author || '?').charAt(0).toUpperCase();
    const canDel  = me && (me.username === p.author || isOwner(g, me.username));
    const linked  = (p.text && window.LinkPreview) ? LinkPreview.linkify(p.text) : { html: esc(p.text || ''), urls: [] };
    const urls    = linked.urls || [];
    const inlineImgs = urls.filter(_isImageUrl).map(u =>
      `<div class="community-media community-blend"><img src="${esc(u)}" alt="" loading="lazy"></div>`).join('');
    const firstLink = urls.find(u => !_isImageUrl(u));
    const linkPrev = (window.LinkPreview && firstLink) ? LinkPreview.cardHtml(firstLink, p.id) : '';
    if (window.Social) Social.setNotifyTarget('gpost:' + p.id, p.author);
    return `
      <div class="community-post" id="gpost-${esc(p.id)}">
        <a class="community-post-av" href="#/u/${esc(p.author)}" data-av-user="${esc(p.author)}">${esc(initial)}</a>
        <div class="community-post-body">
          <div class="community-post-head">
            <a class="community-post-name" href="#/u/${esc(p.author)}">${esc(p.authorDisplay || p.author)}</a>
            <span class="community-post-time">${_timeAgo(p.ts)}</span>
            ${window.Social ? Social.friendBtn(p.author, { mini: true }) : ''}
            ${canDel ? `<span class="community-post-actions">
              <button class="community-post-del" onclick="Groups.deleteGPost('${esc(p.id)}')" title="Delete">${Icon('trash')}</button>
            </span>` : ''}
          </div>
          <div class="community-post-text">${linked.html}</div>
          ${inlineImgs}
          ${linkPrev}
          ${window.Social ? Social.reactionBar('gpost:' + p.id) : ''}
          ${window.Social ? Social.commentsBlockHtml('gpost:' + p.id) : ''}
        </div>
      </div>`;
  }

  function _timeAgo(ts) {
    const s = Math.floor((Date.now() - (ts || 0)) / 1000);
    if (s < 60) return 'Just now';
    const m = Math.floor(s / 60); if (m < 60) return `${m} min ago`;
    const h = Math.floor(m / 60); if (h < 24) return `${h} h ago`;
    const d = Math.floor(h / 24); return `${d} d ago`;
  }

  // Sørg for at Gun-abonnementet er i gang (kalles f.eks. fra forsiden slik at
  // «Del i gruppe» har brukerens grupper klare uten å måtte åpne Grupper-sida).
  function ensureSubscribed() { subscribe(); watchDeletes(); }

  return {
    render, createGroup, toggleCreate, openCreatePage, editGroup, deleteGroup,
    joinGroup, leaveGroup, toggleInvite, doInvite,
    postToGroup, deleteGPost, open, back,
    pickCreateBanner, setGroupBanner, removeGroupBanner,
    setSearch, setSearchAll, myGroups, groupsOfUser, ownedGroups, shareToGroup,
    renderProfileGroups, renderMyGroups, renderAllGroups,
    subscribe, ensureSubscribed,
  };
})();
window.Groups = Groups;
