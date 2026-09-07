// Community — global community-feed (/community) + profil-«Innlegg»-fane.
// Veggen er nå et Facebook-aktig media-rom: tekst-status + bilde + opplastet musikk/
// video/YouTube/Blend fra alle brukere, med kommentarer + 👍/👎 (Social) under hvert
// kort. Innlegg ligger i SC.NS.posts (Gun). Publikum styres av brukerens globale vegg-
// innstilling (wallVisibility: 'public' | 'friends'); 'friends'-innlegg bærer med seg en
// snapshot-liste (allow) så andre nettlesere kan filtrere riktig. Ny lyd → «pling».
const Community = (() => {

  const _posts = {};            // id → post (+ _k = Gun-nøkkel)
  let _subbed = false;
  let _profileUser = null;
  let _filter = 'alt';
  let _section = 'vegg';        // topp-fane: 'vegg' | 'musikk' | 'video'
  let _pendingImage = null;     // { url, name } — bilde vedlagt composeren
  let _publicOnly = false;      // true på /community-veggen: alle innlegg blir offentlige
  let _zoom = 1;                // visnings-zoom for Community-veggen (0.6–2.0)
  const _sessionStart = Date.now();

  const esc = (s) => (window.SC ? SC.esc(s) : String(s || ''));

  // ── Slette-gravsteinar (tombstones) ───────────────────────────────────
  // Når ein brukar slettar sitt eige innlegg, MÅ det bli borte for godt. Både
  // Gun-abonnementet (subscribe) og sky-pollinga (hydrateRemote, kvar 12s)
  // hentar den delte feeden på nytt, så utan eit lokalt minne om kva som er
  // sletta ville eit ekko frå Gun-relayet — eller ei Supabase-rad som enno ikkje
  // er borte (t.d. hemmelegheit-mismatch på tvers av einingar) — teikna innlegget
  // opp att. Gravsteinane held difor innlegget vekke på DENNE eininga uansett kva
  // kjelde prøver å gjenopplive det, medan Supabase-slettinga fjernar det for alle.
  const DELETED_KEY = 'sc_deleted_posts';
  const DELETED_MAX = 1000;
  function _deletedSet() {
    try { return new Set(JSON.parse(localStorage.getItem(DELETED_KEY) || '[]')); }
    catch { return new Set(); }
  }
  function _isDeleted(id) { return !!id && _deletedSet().has(id); }

  // Moderator? Brukernavn i CONFIG.ADMIN_USERS kan slette hvilket som helst innlegg.
  function _isAdmin(me) {
    if (!me || !me.username) return false;
    const admins = (window.CONFIG && Array.isArray(CONFIG.ADMIN_USERS)) ? CONFIG.ADMIN_USERS : [];
    return admins.some(u => String(u).toLowerCase() === String(me.username).toLowerCase());
  }
  function _markDeleted(id) {
    if (!id) return;
    const set = _deletedSet();
    if (set.has(id)) return;
    let arr = [...set, id];
    if (arr.length > DELETED_MAX) arr = arr.slice(arr.length - DELETED_MAX);   // hald settet avgrensa
    try { localStorage.setItem(DELETED_KEY, JSON.stringify(arr)); } catch {}
  }

  const PLAY_SVG =
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"></path></svg>';

  // Bytt YouTube-forsidebildet med den ekte spilleren når publikum trykker play.
  function playYt(btn) {
    const wrap = btn && btn.closest ? btn.closest('.community-yt') : null;
    if (!wrap) return;
    const id = String(wrap.getAttribute('data-yt') || '').replace(/[^\w-]/g, '');
    if (!id) return;
    wrap.innerHTML = '<iframe src="https://www.youtube.com/embed/' + id + '?autoplay=1&rel=0" ' +
      'frameborder="0" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowfullscreen></iframe>';
  }

  // En http(s)-URL som peker rett på en bildefil → vises inline i innlegget.
  function isImageUrl(u) {
    return /^https?:\/\/\S+\.(?:jpe?g|png|gif|webp|avif|bmp|svg)(?:[?#]\S*)?$/i.test(String(u || ''));
  }

  // Første ikke-bilde-lenke i en tekst — brukes til å forankre forhåndsvisnings-
  // kortet til innlegget, så det blir stående selv om teksten redigeres.
  function firstPreviewLink(text) {
    if (!text || !window.LinkPreview) return '';
    const urls = (LinkPreview.linkify(text).urls) || [];
    return urls.find(u => !isImageUrl(u)) || '';
  }

  function timeAgo(ts) {
    const n = Number(ts);
    if (!Number.isFinite(n) || n <= 0) return 'recently';   // manglande/ugyldig dato → ikkje «NaN d siden»
    const s = Math.floor((Date.now() - n) / 1000);
    if (s < 60)    return 'just now';
    if (s < 3600)  return Math.floor(s / 60) + ' min ago';
    if (s < 86400) return Math.floor(s / 3600) + ' h ago';
    return Math.floor(s / 86400) + ' d ago';
  }

  function kindLabel(kind) {
    return { audio: 'new audio', video: 'a video', youtube: 'a video',
             image: 'an image', blend: 'a blend', link: 'a link' }[kind] || 'a post';
  }

  // ── Varsel-logg (catch-up for community-innlegg) ──────────────────────
  // Den delte innleggsfeeden ER ein delt, tidsstempla logg. Kvar innlogga klient
  // les han og lagar varsel for innlegg hen ikkje alt er varsla om — så innlegg
  // laga MEDAN brukaren var offline dukkar opp i varsel-lista når hen er tilbake.
  // «sidan»-grensa (feedSince) hindrar at heile historikken bakoverfyllest første
  // gong, og «sett»-settet (feedSeen) hindrar dobbeltvarsel på tvers av økter.
  function feedSince(username) {
    const k = 'sc_feed_since_' + username;
    let v = parseInt(localStorage.getItem(k) || '0', 10);
    if (!v) { v = Date.now(); localStorage.setItem(k, String(v)); }   // baseline = no → inga bakoverfylling
    return v;
  }
  const FEED_SEEN_MAX = 400;
  function feedSeen(username) {
    try { return JSON.parse(localStorage.getItem('sc_feed_seen_' + username) || '[]'); }
    catch { return []; }
  }
  function feedSeenAdd(username, id) {
    const arr = feedSeen(username);
    if (arr.includes(id)) return;
    arr.push(id);
    if (arr.length > FEED_SEEN_MAX) arr.splice(0, arr.length - FEED_SEEN_MAX);   // hald settet avgrensa
    try { localStorage.setItem('sc_feed_seen_' + username, JSON.stringify(arr)); } catch {}
  }

  // Lag eit lokalt varsel for eit nytt innlegg på den delte veggen — brukt BÅDE
  // frå Gun-abonnementet (subscribe) OG frå sky-pollinga (hydrateRemote), så
  // brukaren får varsel same kva veg innlegget kjem inn. Gun-relayet er upåliteleg
  // på tvers av einingar; sky-pollinga er den som faktisk leverer innlegg frå andre
  // — difor MÅ varselet kunna utløysast derifrå òg, ikkje berre frå Gun. Idempotent:
  // feedSeen + pushLocal(id='post_'+id) hindrar dobbeltvarsel på tvers av båe vegane.
  function notifyNewPost(p) {
    if (!p || !p.id || !window.Notify || !Notify.pushLocal) return;
    const me = (typeof Auth !== 'undefined') ? Auth.current() : null;
    if (!me || p.author === me.username || !canSee(p, me)) return;   // ikkje varsle meg sjølv / skjulte
    if (!(p.ts > feedSince(me.username)) || feedSeen(me.username).includes(p.id)) return;
    feedSeenAdd(me.username, p.id);
    const what = (p.kind && p.kind !== 'text')
      ? `shared ${kindLabel(p.kind)} in Community${p.name ? ': ' + p.name : ''}`
      : 'posted a new post in Community';
    Notify.pushLocal({
      id: 'post_' + p.id,
      type: p.kind === 'audio' ? 'upload' : 'post',
      from: p.author, fromDisplay: p.authorDisplay || p.author,
      text: what, link: '#/community', ts: p.ts,
    });
  }

  // Abonner på kommentar-tråden til eit innlegg eg sjølv har lagt ut — sjølv om
  // innlegget ikkje er teikna på skjermen no — så eg får varsel når nokon
  // kommenterer det, uansett kva side eg er på. Social.watchOwnThread er idempotent.
  function watchOwnPostComments(p) {
    if (!p || !p.id || !p.author || !window.Social || !Social.watchOwnThread) return;
    const me = (typeof Auth !== 'undefined') ? Auth.current() : null;
    if (!me || p.author !== me.username) return;
    Social.watchOwnThread('post:' + p.id, p.author);
  }

  // ── Abonnement ────────────────────────────────────────────────────────
  function subscribe() {
    if (_subbed || !window.SC) return;
    const g = SC.gun();
    if (!g) return;                 // Gun.js ikke lastet ennå — la _subbed stå så vi kan prøve igjen senere
    _subbed = true;
    SC.sub(g.get(SC.NS.posts).get('posts'), (p, key) => {
      if (!p || !p.id || !p.author || (!p.text && !p.kind)) return;
      if (_isDeleted(p.id)) {   // sletta innlegg som ekkar tilbake frå Gun-relayet → ignorer + rydd
        if (_posts[p.id]) { delete _posts[p.id]; const c = document.getElementById('cpost-' + p.id); if (c) c.remove(); }
        return;
      }
      const isNew = !_posts[p.id];
      _posts[p.id] = { ...p, _k: key };
      // Nytt innlegg på den DELTE veggen → varsle DENNE innlogga brukaren lokalt.
      // Alle innlogga (uavhengig av abonnement/venn/eining) abonnerer på same
      // delte feed, så kvar klient lagar sitt eige varsel når noko nytt landar —
      // difor treng me ikkje lista opp mottakarar. Same catch-up-logikk køyrer òg
      // frå sky-pollinga (hydrateRemote), så varselet er uavhengig av det
      // upålitelege Gun-relayet. Sjå notifyNewPost.
      if (isNew) notifyNewPost(p);
      watchOwnPostComments(p);   // få varsel når nokon kommenterer på MITT innlegg — uansett kva side eg er på
      if (document.getElementById('community-feed-list')) renderFeedList();
      if (document.getElementById('innlegg-list')) renderProfileList();
      // Forsidens samlede feed re-rendres når nye innlegg kommer inn.
      if (document.getElementById('sc-home-feed') && typeof App !== 'undefined' && App.refreshHomeFeed) App.refreshHomeFeed();
    });
  }

  // Alle innlegg den nåværende brukeren har lov til å se (brukt av forsidens feed).
  // Nyeste dato først. Robust mot manglande/ugyldig ts (NaN → 0) så eit innlegg
  // utan gyldig dato aldri kan «klistre» seg øvst og bryte heile sorteringa.
  function byNewest(a, b) { return (Number(b.ts) || 0) - (Number(a.ts) || 0); }

  function visiblePosts() {
    const me = Auth.current();
    return Object.values(_posts).filter(p => canSee(p, me)).sort(byNewest);
  }

  // Slå opp et enkelt innlegg (brukt av Share for å dele videre).
  function getPost(id) { return _posts[id] || null; }

  // ── Sky-backfill (Supabase) ───────────────────────────────────────────
  // Gun (P2P-relay) leverer ikke innlegg pålitelig til andre enheter. Vi henter
  // derfor den varige, delte lista fra Supabase (CommunitySync) og fletter den
  // inn i _posts, så ALLE som kommer inn ser det som er delt — uansett enhet.
  // Kalles fra render()/renderProfilePosts() og fra forsidens refreshHomeFeed.
  let _remoteHydrating = false;
  async function hydrateRemote() {
    if (!window.CommunitySync || !CommunitySync._enabled() || _remoteHydrating) return;
    _remoteHydrating = true;
    try {
      const rows = await CommunitySync.list(300);
      let changed = false;
      const me = (typeof Auth !== 'undefined') ? Auth.current() : null;
      for (const p of rows) {
        if (!p || !p.id) continue;
        if (_isDeleted(p.id)) {
          // Sky-rada lever enno (t.d. slettinga feila pga. hemmelegheit-mismatch på
          // ei anna eining). Rydd lokalt UANSETT, og prøv server-slettinga på nytt
          // om eg er forfattaren, så innlegget til slutt forsvinn for alle.
          if (_posts[p.id]) { delete _posts[p.id]; changed = true; }
          if (me && p.author === me.username && window.CommunitySync) CommunitySync.remove(p.id, me.username);
          continue;
        }
        const cur = _posts[p.id];
        if (!cur) {
          _posts[p.id] = { ...p }; changed = true;
          notifyNewPost(p);   // varsle òg for innlegg som kjem inn via sky-pollinga (ikkje berre Gun)
        }
        else if ((Number(p.editedTs) || 0) > (Number(cur.editedTs) || 0)) {
          _posts[p.id] = { ...cur, ...p }; changed = true;   // nyere redigering vinner
        }
        watchOwnPostComments(p);   // abonner på kommentarane til mine eigne innlegg (òg dei som kom via sky)
      }
      if (changed) {
        if (document.getElementById('community-feed-list')) renderFeedList();
        if (document.getElementById('innlegg-list')) renderProfileList();
        // Forsidens samlede feed: hald han fersk òg (nyaste innlegg øvst) utan reload.
        // refreshHomeFeed kallar hydrateRemote, men _remoteHydrating-vakta gjer det
        // indre kallet til ein no-op — og _feedBusy-vakta hindrar dobbel opptegning
        // når hydrateRemote sjølv vart kalla FRÅ refreshHomeFeed. Ingen rekursjon.
        if (document.getElementById('sc-home-feed') && typeof App !== 'undefined' && App.refreshHomeFeed) App.refreshHomeFeed();
      }
    } finally { _remoteHydrating = false; }
  }

  // ── Live-oppdatering av den delte feeden (poll) ───────────────────────
  // hydrateRemote() henter berre éin gong. For at NYE innlegg frå andre brukarar
  // — på andre einingar og plattformer (mobil/Apple/Android) — skal dukke opp
  // ØVERST utan at ein lastar sida på nytt, poller vi den varige sky-feeden med
  // jamne mellomrom så lenge Community- eller profil-innleggsvisninga er open.
  // Gun-relayet er upåliteleg på tvers av einingar, så dette (ikkje Gun) er det
  // som faktisk held veggen synkron for alle. Sjølv-stoppande ved rute-bytte.
  let _pollTimer = null;
  let _visBound = false;
  const POLL_MS = 12000;
  function _feedInDom() {
    return !!(document.getElementById('community-feed-list')
           || document.getElementById('innlegg-list')
           || document.getElementById('sc-home-feed'));   // forsidens samlede feed òg
  }
  function startPolling() {
    // Hent nyaste med ein gong fana kjem i forgrunnen igjen (t.d. app-bytte på mobil).
    if (!_visBound && typeof document !== 'undefined') {
      _visBound = true;
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && _feedInDom()) hydrateRemote();
      });
    }
    if (_pollTimer) return;
    _pollTimer = setInterval(() => {
      if (!_feedInDom()) { stopPolling(); return; }        // rute-bytte → stopp timeren
      if (document.visibilityState === 'hidden') return;   // spar batteri/data når fana er skjult
      hydrateRemote();
    }, POLL_MS);
  }
  function stopPolling() {
    if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; }
  }

  // 'private'-innlegg er KUN synlige for forfatteren selv (låst til bare meg).
  // 'friends'-innlegg er synlige for forfatteren + de i allow-lista.
  function canSee(p, viewer) {
    if (p.audience === 'private') return !!viewer && viewer.username === p.author;
    if (p.audience !== 'friends') return true;
    if (!viewer) return false;
    if (p.author === viewer.username) return true;
    try { return JSON.parse(p.allow || '[]').includes(viewer.username); } catch { return false; }
  }

  // ── Auto-deling (lar brukeren styre om nye opplastinger går til veggen) ──
  function autoShareOn() { return localStorage.getItem('sc_autoshare') !== '0'; }
  function setAutoShare(on) {
    localStorage.setItem('sc_autoshare', on ? '1' : '0');
    if (typeof App !== 'undefined') App.toast(on ? '🌐 New uploads are shared to Community' : 'Auto-sharing off', 'info', 2000);
  }

  // Er denne kilden (media-id) allerede delt på veggen?
  function isShared(sourceId) {
    return !!sourceId && Object.values(_posts).some(p => p.sourceId === sourceId);
  }

  // Del et media-element til veggen. Kalles automatisk fra opplasting + manuelt.
  // opts: { kind, name, url?, youtubeId?, sourceId?, caption?, audience? }
  function shareMedia(opts) {
    const me = Auth.current();
    if (!me || !window.SC || !opts || !opts.kind) return null;
    if (opts.sourceId && isShared(opts.sourceId)) return null;     // ikke dobbel-del
    const vis = opts.audience || me.wallVisibility || 'public';
    const p = {
      id: 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      author: me.username, authorDisplay: me.displayName, ts: Date.now(),
      audience: vis, kind: opts.kind, name: opts.name || '',
      mediaUrl: opts.url || '', youtubeId: opts.youtubeId || '',
      sourceId: opts.sourceId || '', text: opts.caption || '',
      label: opts.label || '', coverUrl: opts.coverUrl || '', buyUrl: opts.buyUrl || '',
    };
    if (vis === 'friends') {
      const fr = (Auth.getFriends(me.username) || []).map(f => f.username);
      p.allow = JSON.stringify([me.username, ...fr]);
    }
    try { SC.gun().get(SC.NS.posts).get('posts').set(p); }
    catch (e) { console.warn('[Community] shareMedia feilet', e); }
    if (window.CommunitySync) CommunitySync.push(p);   // varig + synlig for ALLE enheter
    _posts[p.id] = { ...p };
    // Varsling skjer klient-side frå den delte feeden (sjå subscribe()), så alle
    // innlogga — uavhengig av abonnement/eining — får det. Ingen per-mottakar-emit her.
    return p.id;
  }

  // Fjern et delt media-element (alle innlegg med samme sourceId, mine).
  function unshareMedia(sourceId) {
    const me = Auth.current();
    if (!me || !sourceId) return;
    Object.values(_posts).forEach(p => {
      if (p.sourceId === sourceId && p.author === me.username) {
        _markDeleted(p.id);   // gravstein: hindra at sky-polling/Gun-ekko gjenoppliver
        try { if (p._k) SC.gun().get(SC.NS.posts).get('posts').get(p._k).put(null); } catch {}
        if (window.CommunitySync) CommunitySync.remove(p.id, me.username);   // slett òg i sky
        delete _posts[p.id];
        const card = document.getElementById('cpost-' + p.id); if (card) card.remove();
      }
    });
    renderFeedList(); renderProfileList();
  }

  // ── Bildevedlegg (composer) ───────────────────────────────────────────
  // Skalerer ned store bilder til en kompakt JPEG slik at de kan deles via Gun
  // selv uten skylagring (data-URL funker for alle som ser innlegget).
  function downscaleImage(file, maxDim = 1920, quality = 0.88) {
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

  async function addImage(src) {
    const me = Auth.current();
    if (!me) { if (typeof Router !== 'undefined') Router.go('/login'); return; }
    // src kan vera <input>-elementet (nytt) eller ei FileList (bakoverkompat).
    const files = (src && src.files) ? src.files : src;
    const root = _composerRoot(src && src.closest ? src : null);
    const file = files && files[0];
    if (!file || !/^image\//.test(file.type)) { if (typeof App !== 'undefined') App.toast('Choose an image file', 'error'); return; }
    const preview = _cField(root, 'sc-post-img-preview');
    if (preview) preview.innerHTML = `<span class="spinner" style="width:16px;height:16px;border-width:2px"></span> Processing image…`;
    try {
      const useCloud = (typeof SC_Storage !== 'undefined') && SC_Storage.isConfigured();
      let url;
      if (useCloud) {
        try { url = (await SC_Storage.upload(file, { prefix: 'image' })).url; }
        catch (e) { url = await downscaleImage(file); }   // fall tilbake til data-URL
      } else {
        url = await downscaleImage(file);
      }
      _pendingImage = { url, name: file.name };
      if (preview) preview.innerHTML = `
        <div style="position:relative;display:inline-block;margin-top:0.25rem">
          <img src="${url}" alt="" style="max-width:170px;max-height:130px;border-radius:8px;display:block">
          <button type="button" onclick="Community.clearImage(this)" title="Remove image" style="position:absolute;top:4px;right:4px;background:rgba(0,0,0,0.65);border:none;color:#fff;border-radius:50%;width:24px;height:24px;cursor:pointer;display:flex;align-items:center;justify-content:center">${Icon('x')}</button>
        </div>`;
    } catch (e) {
      _pendingImage = null;
      if (preview) preview.innerHTML = '';
      if (typeof App !== 'undefined') App.toast('Image failed: ' + e.message, 'error');
    }
  }

  function clearImage(fromEl) {
    _pendingImage = null;
    const root = _composerRoot(fromEl && fromEl.closest ? fromEl : null);
    const preview = _cField(root, 'sc-post-img-preview');
    if (preview) preview.innerHTML = '';
    const input = _cField(root, 'sc-post-img-input');
    if (input) input.value = '';
  }

  // ── Komponering (tekst-status + bilde) ────────────────────────────────
  // <option>-liste for komponer-målet: veggen + gruppene brukaren er med i.
  function composerTargetOptions(selected) {
    const wallLabel = _publicOnly ? '📣 Community wall' : '📣 My wall';
    const sel = (v) => (selected === v ? ' selected' : '');
    let opts = `<option value="wall"${!selected || selected === 'wall' ? ' selected' : ''}>${wallLabel}</option>`;
    // Hjem-veggen = same delte feed, men eksplisitt val for å dele på forsida.
    opts += `<option value="home"${sel('home')}>🏠 Home wall (front page)</option>`;
    // Send til gruppe — gruppene brukaren er med i.
    try {
      if (window.Groups && Groups.myGroups) {
        const gs = Groups.myGroups() || [];
        if (gs.length) {
          opts += `<optgroup label="Send to group">`;
          for (const g of gs)
            opts += `<option value="g:${esc(g.id)}"${sel('g:' + g.id)}>👥 ${esc(g.name)}</option>`;
          opts += `</optgroup>`;
        }
      }
    } catch (e) {}
    // Send til venn — som privat melding via Messenger.
    try {
      const me = Auth.current();
      const friends = me ? (Auth.getFriends(me.username) || []) : [];
      if (friends.length) {
        opts += `<optgroup label="Send to friend">`;
        for (const f of friends)
          opts += `<option value="f:${esc(f.username)}"${sel('f:' + f.username)}>💬 ${esc(f.displayName || f.username)}</option>`;
        opts += `</optgroup>`;
      }
    } catch (e) {}
    return opts;
  }

  // Fyll mål-velgjaren på nytt når gruppene har lasta (Gun er asynkron), behald val.
  function refreshComposerTarget() {
    const sel = document.getElementById('sc-post-target');
    if (!sel) return;
    const cur = sel.value;
    sel.innerHTML = composerTargetOptions(cur);
    if ([...sel.options].some(o => o.value === cur)) sel.value = cur;
    onTargetChange(sel.value);
  }

  // Skjul «Synlig for» når målet er ei gruppe eller ein venn (privat melding).
  function onTargetChange(val) {
    const v = String(val || '');
    const isDM = v.startsWith('g:') || v.startsWith('f:');
    const visWrap = document.getElementById('sc-post-vis-wrap');
    if (visWrap) visWrap.style.display = isDM ? 'none' : '';
  }

  // Sørg for at gruppene abonnerer og fyll mål-velgjaren når dei har lasta (Gun
  // er asynkron, så me prøver på nytt kort etter). Kalla når ein composer visest.
  function ensureComposerTargets() {
    if (window.Groups && Groups.ensureSubscribed) Groups.ensureSubscribed();
    refreshComposerTarget();
    setTimeout(refreshComposerTarget, 700);
  }

  function composerHtml() {
    const me = Auth.current();
    const vis = me.wallVisibility || 'public';
    // På Community-veggen er alt offentlig for alle innloggede — da skjuler vi
    // synlighetsvelgeren og viser bare en rolig påminnelse i stedet.
    const visControl = _publicOnly
      ? `<span class="community-composer-note">${Icon('globe')} Visible to everyone logged in</span>`
      : `<label class="community-vis">${Icon('eye')} Visible to:
            <select id="sc-post-vis" onchange="Community.setWallVisibility(this.value)">
              <option value="public"  ${vis === 'public'  ? 'selected' : ''}>🌐 Everyone (public)</option>
              <option value="friends" ${vis === 'friends' ? 'selected' : ''}>👥 Friends only</option>
              <option value="private" ${vis === 'private' ? 'selected' : ''}>🔒 Only me (private)</option>
            </select>
          </label>`;
    // Mål-velgjar: veggen + gruppene brukaren er med i. Same «del til gruppe»-
    // moglegheit som forsida sin composer — no òg på /community og profil-«Innlegg».
    const targetControl = `<label class="community-vis" title="Where do you want to share?">${Icon('share')}
        <select id="sc-post-target" onchange="Community.onTargetChange(this.value)">${composerTargetOptions()}</select>
      </label>`;
    return `
      <div class="community-composer" style="position:relative">
        <textarea id="sc-post-input" class="community-input" placeholder="Share something with the community…" maxlength="1000"></textarea>
        <div id="sc-post-img-preview"></div>
        ${_postEmojiPickerHtml()}
        <div class="community-composer-row">
          ${targetControl}
          <span id="sc-post-vis-wrap">${visControl}</span>
          <button type="button" class="btn btn-ghost btn-sm" style="margin:0" title="Emoji" onclick="Community.toggleEmojiPicker(this)">😊</button>
          <button type="button" class="btn btn-ghost btn-sm" style="margin:0" title="Add a GIF (paste a .gif URL)" onclick="Community.pickGif(this)">${Icon('image')} GIF</button>
          <label class="btn btn-ghost btn-sm" style="cursor:pointer;margin:0" title="Attach an image">
            <input type="file" id="sc-post-img-input" accept="image/*" style="display:none" onchange="Community.addImage(this)">
            ${Icon('image')} Image
          </label>
          <label class="community-autoshare" title="Share new uploads (music/video/link) automatically to the wall">
            <input type="checkbox" ${autoShareOn() ? 'checked' : ''} onchange="Community.setAutoShare(this.checked)"> Auto-share uploads
          </label>
          <button class="btn btn-primary btn-sm" onclick="Community.post(this)">${Icon('send')} Share</button>
        </div>
      </div>`;
  }

  // ── Emoji-plukkar (composer) ───────────────────────────────────────────
  // Same mønster som DJ.toggleEmojiPicker/insertPMEmoji for private meldingar:
  // scopa til DEN composeren knappen faktisk sit i, sidan fleire kan liggja
  // monterte samtidig (profilfaner).
  const POST_EMOJIS = ['😀','😂','😍','🥳','😎','🤔','👍','👎','❤️','🔥','🎉','🙏','😢','😮','💯','✨'];
  function _postEmojiPickerHtml() {
    return `<div class="community-emoji-pop hidden" id="sc-post-emoji-pop">
      ${POST_EMOJIS.map(e => `<button type="button" onclick="Community.insertEmoji('${e}',this)">${e}</button>`).join('')}
    </div>`;
  }
  function toggleEmojiPicker(fromEl) {
    const root = _composerRoot(fromEl && fromEl.closest ? fromEl : null);
    const pop = root && root.querySelector('.community-emoji-pop');
    if (pop) pop.classList.toggle('hidden');
  }
  function insertEmoji(e, fromEl) {
    const root = _composerRoot(fromEl && fromEl.closest ? fromEl : null);
    const inp = _cField(root, 'sc-post-input');
    if (inp) { inp.value += e; inp.focus(); }
    const pop = root && root.querySelector('.community-emoji-pop');
    if (pop) pop.classList.add('hidden');
  }

  // ── GIF via URL (composer) ─────────────────────────────────────────────
  // Same løysing som DJ.pickGif for private meldingar: ingen ny API-nøkkel å
  // skaffa (Giphy/Tenor), berre lim inn ei .gif-lenke — gjenbruker den alt
  // testa _pendingImage-vegen (kind:'image' i post()), så heile render-/synk-
  // stien for bilete fungerer uendra for GIF-ar.
  function pickGif(fromEl) {
    const me = Auth.current();
    if (!me) { if (typeof Router !== 'undefined') Router.go('/login'); return; }
    const url = (prompt('Paste a direct .gif URL:', '') || '').trim();
    if (!url) return;
    if (!/^https?:\/\/\S+\.gif(?:[?#]\S*)?$/i.test(url)) {
      if (typeof App !== 'undefined') App.toast('Must be a direct link to a .gif file', 'error');
      return;
    }
    const root = _composerRoot(fromEl && fromEl.closest ? fromEl : null);
    _pendingImage = { url, name: 'gif' };
    const preview = _cField(root, 'sc-post-img-preview');
    if (preview) preview.innerHTML = `
      <div style="position:relative;display:inline-block;margin-top:0.25rem">
        <img src="${esc(url)}" alt="GIF" style="max-width:170px;max-height:130px;border-radius:8px;display:block">
        <button type="button" onclick="Community.clearImage(this)" title="Remove GIF" style="position:absolute;top:4px;right:4px;background:rgba(0,0,0,0.65);border:none;color:#fff;border-radius:50%;width:24px;height:24px;cursor:pointer;display:flex;align-items:center;justify-content:center">${Icon('x')}</button>
      </div>`;
  }

  // Fleire composer-instansar kan liggja i DOM-en samtidig (t.d. profilfanene
  // «Innlegg» OG «Community» begge rendra, den eine skjult). Då ville
  // getElementById('sc-post-input') returnert den FYRSTE — ofte den skjulte,
  // tomme — så «Del» las tom tekst og gjorde ingenting. Difor scopar me alltid
  // felt-oppslaget til den composeren handlinga faktisk kom frå (eller, om me
  // ikkje veit, den synlege med tekst).
  function _composerRoot(fromEl) {
    if (fromEl && fromEl.closest) {
      const r = fromEl.closest('.community-composer');
      if (r) return r;
    }
    const all = Array.from(document.querySelectorAll('.community-composer'));
    if (all.length <= 1) return all[0] || null;
    const visible = all.filter(el => el.offsetParent !== null);
    const withText = visible.find(el => {
      const t = el.querySelector('.community-input');
      return t && t.value && t.value.trim();
    });
    return withText || visible[0] || all[0];
  }
  // Hent eit composer-felt: helst innanfor den aktive composeren, elles fall
  // tilbake til det fyrste i dokumentet (bakoverkompatibelt).
  function _cField(root, id) {
    return (root && root.querySelector('#' + id)) || document.getElementById(id);
  }

  function post(btn) {
    const me = Auth.current();
    if (!me) { if (typeof Router !== 'undefined') Router.go('/login'); return; }
    const root = _composerRoot(btn);
    const inp = _cField(root, 'sc-post-input');
    const text = (inp && inp.value.trim()) || '';
    if (!text && !_pendingImage) return;     // ingenting å dele
    if (!window.SC) return;
    // Mål: veggen (community/hjem), ei gruppe, eller ein venn (privat melding).
    const target = (_cField(root, 'sc-post-target')?.value) || 'wall';
    // Send til venn → privat melding via Messenger (berre tekst).
    if (target.startsWith('f:')) {
      if (!text) { if (typeof App !== 'undefined') App.toast('The message must have text.', 'info'); return; }
      if (_pendingImage && typeof App !== 'undefined') App.toast('Messages only support text — the image was not included.', 'info', 4000);
      const uname = target.slice(2);
      const ok = window.Messenger && Messenger.sendTo && Messenger.sendTo(uname, text);
      if (ok) {
        if (inp) inp.value = ''; clearImage(inp);
        if (typeof App !== 'undefined') App.toast('Sent as message ✓', 'success');
      } else if (typeof App !== 'undefined') { App.toast('Could not send the message.', 'error'); }
      return;
    }
    if (target.startsWith('g:')) {
      if (!text) { if (typeof App !== 'undefined') App.toast('Group posts must have text.', 'info'); return; }
      if (_pendingImage && typeof App !== 'undefined') App.toast('Group posts only support text — the image was not included.', 'info', 4000);
      if (window.Groups && Groups.shareToGroup) {
        const ok = Groups.shareToGroup(target.slice(2), text);
        if (ok) { if (inp) inp.value = ''; clearImage(inp); }
      } else if (typeof App !== 'undefined') { App.toast('Groups are not available right now.', 'error'); }
      return;
    }
    // På Community-veggen og Hjem-veggen er alt offentlig for alle innloggede.
    const vis = (_publicOnly || target === 'home') ? 'public' : (me.wallVisibility || 'public');
    const p = {
      id: 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      author: me.username, authorDisplay: me.displayName,
      text, ts: Date.now(), audience: vis,
      kind: _pendingImage ? 'image' : 'text',
    };
    if (_pendingImage) { p.mediaUrl = _pendingImage.url; p.name = _pendingImage.name || ''; }
    else p.previewUrl = firstPreviewLink(text);   // forankre forhåndsvisning til innlegget
    if (vis === 'friends') {
      const fr = (Auth.getFriends(me.username) || []).map(f => f.username);
      p.allow = JSON.stringify([me.username, ...fr]);
    }
    try { SC.gun().get(SC.NS.posts).get('posts').set(p); }
    catch (e) { console.warn('[Community] post feilet', e); }
    if (window.CommunitySync) CommunitySync.push(p);   // varig + synlig for ALLE enheter
    _posts[p.id] = { ...p };                 // vis umiddelbart lokalt
    if (inp) inp.value = '';
    clearImage(inp);
    renderFeedList(); renderProfileList();
    if (document.getElementById('sc-home-feed') && typeof App !== 'undefined' && App.refreshHomeFeed) App.refreshHomeFeed();
    // Varsling går ikkje lenger via per-mottakar-innboks her: kvar innlogga klient
    // lagar sitt eige varsel når innlegget landar på den delte feeden (sjå
    // subscribe()). Det når ALLE innlogga — med eller utan abonnement — og er ikkje
    // avhengig av at avsendaren kjenner til alle brukarane. canSee held venner-
    // innlegg private.
    if (typeof App !== 'undefined') App.toast(
      target === 'home' ? '🏠 Shared on the front page!' : (p.kind === 'image' ? '📷 Image shared!' : 'Post shared!'), 'success');
  }

  function setWallVisibility(value) {
    const me = Auth.current(); if (!me) return;
    Auth.updateUser(me.username, { wallVisibility: value });
    if (typeof App !== 'undefined') App.toast(
      value === 'friends' ? '👥 New posts are now friends only'
      : value === 'private' ? '🔒 New posts are now private (only you)'
      : '🌐 New posts are now public', 'success', 2000);
  }

  function deletePost(id) {
    const me = Auth.current(); const p = _posts[id];
    // Forfattaren kan slette sitt eige; ein moderator kan slette kven som helst sitt.
    if (!me || !p || (p.author !== me.username && !_isAdmin(me))) return;
    _markDeleted(id);   // gravstein FØRST: hindrar at Gun-ekko/sky-polling gjenoppliver innlegget
    try { if (p._k) SC.gun().get(SC.NS.posts).get('posts').get(p._k).put(null); } catch {}
    // Slett òg i sky — på DEN EIGENTLEGE forfattaren (delete_post_owned matchar id+author),
    // slik at moderator-sletting fjernar rada for alle, ikkje berre lokalt.
    if (window.CommunitySync) CommunitySync.remove(id, p.author);
    delete _posts[id];
    // Fjern kortet direkte frå DOM slik at sletting verkar i ALLE visningar —
    // også forsidens samlede feed (#sc-home-feed), der renderFeedList/
    // renderProfileList er no-ops fordi lista-elementa deira ikkje finst der.
    const card = document.getElementById('cpost-' + id); if (card) card.remove();
    renderFeedList(); renderProfileList();
    if (typeof App !== 'undefined') App.toast('Post deleted', 'success', 2000);
  }

  // ── Redigering (KUN forfatteren av innlegget) ─────────────────────────
  // Bytter teksten i kortet med et redigeringsfelt + Lagre/Avbryt — uten å
  // re-rendre hele lista, så de andre feltene (kommentarer m.m.) står i ro.
  // Låst til forfatteren: alle kan redigere sitt EGET innlegg, uansett hvor
  // i SiriusFM det vises, men ingen kan redigere andres innlegg.
  function editPost(id) {
    const me = Auth.current(); const p = _posts[id];
    if (!me || !p || p.author !== me.username) return;   // kun forfatteren
    const card = document.getElementById('cpost-' + id); if (!card) return;
    if (card.querySelector('.community-edit-box')) return;     // redigerer alt
    const body = card.querySelector('.community-post-body'); if (!body) return;
    const textEl = body.querySelector('.community-post-text');
    const box = document.createElement('div');
    box.className = 'community-edit-box';
    box.innerHTML =
      `<textarea class="community-input community-edit-input" maxlength="1000">${esc(p.text || '')}</textarea>
       <div class="community-edit-row">
         <button class="btn btn-primary btn-sm" onclick="Community.saveEdit('${esc(id)}')">${Icon('check')} Save</button>
         <button class="btn btn-ghost btn-sm" onclick="Community.cancelEdit('${esc(id)}')">${Icon('x')} Cancel</button>
       </div>`;
    if (textEl) { textEl.style.display = 'none'; textEl.insertAdjacentElement('afterend', box); }
    else { card.querySelector('.community-post-head').insertAdjacentElement('afterend', box); }
    const ta = box.querySelector('textarea');
    ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length);
  }

  function saveEdit(id) {
    const me = Auth.current(); const p = _posts[id];
    if (!me || !p || p.author !== me.username) return;   // kun forfatteren
    const card = document.getElementById('cpost-' + id);
    const ta = card && card.querySelector('.community-edit-input'); if (!ta) return;
    const text = ta.value.trim();
    // Eldre innlegg (uten lagret previewUrl): forankre forhåndsvisningen NÅ, fra den
    // GAMLE teksten, før den overskrives — så kortet ikke forsvinner selv om lenka
    // fjernes fra teksten. Rørt den ikke hvis eieren alt har fjernet den (previewOff).
    if (!p.previewOff && !p.previewUrl) p.previewUrl = firstPreviewLink(p.text) || firstPreviewLink(text);
    p.text = text; p.edited = true; p.editedTs = Date.now();
    try { if (p._k) SC.gun().get(SC.NS.posts).get('posts').get(p._k).put({ text, edited: true, editedTs: p.editedTs, previewUrl: p.previewUrl || '' }); } catch {}
    // Kun forfatteren når hit → synk med eigar-push (har hemmelegheita).
    if (window.CommunitySync) CommunitySync.push(p);
    _posts[id] = p;
    // Oppdater kortet direkte i DOM så redigering verkar i ALLE visningar (også
    // forsidens samlede feed, der renderFeedList/renderProfileList er no-ops).
    const box = card.querySelector('.community-edit-box'); if (box) box.remove();
    const linked = (text && window.LinkPreview) ? LinkPreview.linkify(text) : { html: esc(text) };
    let textEl = card.querySelector('.community-post-text');
    if (textEl) {
      textEl.innerHTML = linked.html; textEl.style.display = text ? '' : 'none';
    } else if (text) {
      const head = card.querySelector('.community-post-head');
      textEl = document.createElement('div');
      textEl.className = 'community-post-text'; textEl.innerHTML = linked.html;
      if (head) head.insertAdjacentElement('afterend', textEl);
    }
    const head = card.querySelector('.community-post-head');
    if (head && !head.querySelector('.community-edited')) {
      const mark = document.createElement('span');
      mark.className = 'community-edited'; mark.title = 'Edited'; mark.textContent = '· edited';
      const timeEl = head.querySelector('.community-post-time');
      (timeEl || head).insertAdjacentElement(timeEl ? 'afterend' : 'beforeend', mark);
    }
    if (textEl && window.LinkPreview) { try { LinkPreview.hydrate(card); } catch {} }
    renderFeedList(); renderProfileList();
    if (typeof App !== 'undefined') App.toast('Post updated', 'success', 2000);
  }

  function cancelEdit(id) {
    const card = document.getElementById('cpost-' + id); if (!card) return;
    const box = card.querySelector('.community-edit-box'); if (box) box.remove();
    const textEl = card.querySelector('.community-post-text'); if (textEl) textEl.style.display = '';
  }

  // Eieren fjerner forhåndsvisnings-kortet selv. Da settes previewOff, som varig
  // (synket til alle enheter) hindrer at kortet dukker opp igjen ved re-render.
  function removePreview(id) {
    const me = Auth.current(); const p = _posts[id];
    if (!me || !p || p.author !== me.username) return;   // kun forfatteren (samme rett som redigering)
    p.previewOff = true; p.previewUrl = '';
    try { if (p._k) SC.gun().get(SC.NS.posts).get('posts').get(p._k).put({ previewOff: true, previewUrl: '' }); } catch {}
    if (window.CommunitySync) CommunitySync.push(p);   // varig + synlig for alle
    _posts[id] = p;
    const card = document.getElementById('cpost-' + id);
    const prev = card && card.querySelector('.community-linkprev'); if (prev) prev.remove();
    renderFeedList(); renderProfileList();
    if (typeof App !== 'undefined') App.toast('Preview removed', 'success', 2000);
  }

  // ── Media-render ──────────────────────────────────────────────────────
  function mediaBodyHtml(p) {
    const name = esc(p.name || '');
    switch (p.kind) {
      case 'audio':
        return `<div class="community-media community-audio">
          ${name ? `<div class="community-media-title">${Icon('music')} ${name}</div>` : ''}
          ${p.label ? `<div class="community-media-label">${Icon('tag')} ${esc(p.label)}</div>` : ''}
          <audio controls preload="none" src="${esc(p.mediaUrl)}"></audio>
          ${p.buyUrl ? `<a class="community-buy-btn" href="${esc(p.buyUrl)}" target="_blank" rel="noopener">${Icon('cart')} Buy / support the track</a>` : ''}</div>`;
      case 'video':
        return `<div class="community-media">
          ${name ? `<div class="community-media-title">🎬 ${name}</div>` : ''}
          <video controls preload="none"${p.coverUrl ? ` poster="${esc(p.coverUrl)}"` : ''} src="${esc(p.mediaUrl)}"></video></div>`;
      case 'youtube': {
        // Forsidebilde (YouTube-thumbnail) + play-knapp. Bytter til den ekte
        // spilleren først når publikum trykker play — lettere side, garantert cover.
        const yid = esc(p.youtubeId);
        return `<div class="community-media community-yt" data-yt="${yid}">
          <button type="button" class="community-yt-poster" onclick="Community.playYt(this)" aria-label="Play video">
            <img src="https://i.ytimg.com/vi/${yid}/hqdefault.jpg" loading="lazy" alt="${name}"
              onerror="this.onerror=null;this.src='https://i.ytimg.com/vi/${yid}/mqdefault.jpg'">
            <span class="community-yt-play">${PLAY_SVG}</span>
          </button></div>`;
      }
      case 'image':
        return `<div class="community-media community-blend"><img src="${esc(p.mediaUrl)}" alt="${name}" loading="lazy"></div>`;
      case 'blend':
        return `<div class="community-media community-blend"><img src="${esc(p.mediaUrl)}" alt="${name}" loading="lazy"></div>`;
      case 'link':
        return `<a class="community-media community-link" href="${esc(p.mediaUrl)}" target="_blank" rel="noopener">${Icon('link')} ${name || esc(p.mediaUrl)}</a>`;
      default: return '';
    }
  }

  // ── Kort + lister ─────────────────────────────────────────────────────
  function postCardHtml(p) {
    const me = Auth.current();
    const initial = (p.authorDisplay || p.author || '?').charAt(0).toUpperCase();
    const canDel = me && me.username === p.author;
    // Moderatorar kan slette andres innlegg (men ikkje redigere/fjerne forhåndsvisning).
    const canModDel = canDel || _isAdmin(me);
    const aud = p.audience === 'friends' ? `<span class="community-aud">👥 friends</span>`
              : p.audience === 'private' ? `<span class="community-aud">🔒 only me</span>` : '';
    const media = (p.kind && p.kind !== 'text') ? mediaBodyHtml(p) : '';
    // Gjør delte lenker i teksten klikkbare, og sett opp et forhåndsvisnings-kort
    // (cover-bilde + play-knapp) under teksten for den første lenka — men bare når
    // innlegget ikke alt har eget media.
    const linked = (p.text && window.LinkPreview) ? LinkPreview.linkify(p.text) : { html: esc(p.text || ''), urls: [] };
    const textHtml = p.text ? `<div class="community-post-text">${linked.html}</div>` : '';
    // Bilde-URL-er i teksten vises som faktiske bilder; den første ikke-bilde-lenka
    // får forhåndsvisnings-kortet (som før).
    const inlineImgs = linked.urls.filter(isImageUrl).map(u =>
      `<div class="community-media community-blend"><img src="${esc(u)}" alt="" loading="lazy"></div>`).join('');
    // Forhåndsvisningen er forankret til innlegget (p.previewUrl), ikke til teksten,
    // så den blir stående uansett hvordan teksten redigeres — helt til eieren selv
    // fjerner den (p.previewOff). Eldre innlegg uten lagret felt: utled fra teksten.
    const previewUrl = p.previewOff ? '' : (p.previewUrl || (linked.urls.find(u => !isImageUrl(u)) || ''));
    const linkPrev = (!media && window.LinkPreview && previewUrl)
      ? `<div class="community-linkprev">${LinkPreview.cardHtml(previewUrl, p.id)}${
          canDel ? `<button class="community-prev-remove" onclick="Community.removePreview('${esc(p.id)}')" title="Remove preview" aria-label="Remove preview">${Icon('x')}</button>` : ''
        }</div>`
      : '';
    const editedMark = p.edited ? `<span class="community-edited" title="Edited">· edited</span>` : '';
    if (window.Social) Social.setNotifyTarget('post:' + p.id, p.author);
    return `
      <div class="community-post" id="cpost-${esc(p.id)}">
        <a class="community-post-av" href="#/u/${esc(p.author)}" data-av-user="${esc(p.author)}">${esc(initial)}</a>
        <div class="community-post-body">
          <div class="community-post-head">
            <a class="community-post-name" href="#/u/${esc(p.author)}">${esc(p.authorDisplay || p.author)}</a>
            <span class="community-post-time">${timeAgo(p.ts)}</span>
            ${editedMark}
            ${aud}
            ${window.Social ? Social.friendBtn(p.author, { mini: true }) : ''}
            <span class="community-post-actions">
              ${window.Share ? Share.postButton(p.id) : ''}
              ${canDel ? `<button class="community-post-edit" onclick="Community.editPost('${esc(p.id)}')" title="Edit">${Icon('edit')}</button>` : ''}
              ${canModDel ? `<button class="community-post-del" onclick="Community.deletePost('${esc(p.id)}')" title="Delete">${Icon('trash')}</button>` : ''}
            </span>
          </div>
          ${textHtml}
          ${inlineImgs}
          ${linkPrev}
          ${media}
          ${window.Social ? Social.reactionBar('post:' + p.id) : ''}
          ${window.Social ? Social.commentsBlockHtml('post:' + p.id) : ''}
        </div>
      </div>`;
  }

  function matchesFilter(p) {
    switch (_filter) {
      case 'musikk':  return p.kind === 'audio';
      case 'video':   return p.kind === 'video' || p.kind === 'youtube';
      case 'bilete':  return p.kind === 'blend' || p.kind === 'image';
      case 'innlegg': return !p.kind || p.kind === 'text';
      default:        return true;
    }
  }

  function filterTabsHtml() {
    const tabs = [['alt', 'All'], ['musikk', '🎵 Music'], ['video', '🎬 Video'], ['bilete', '🖼️ Images'], ['innlegg', '📝 Posts']];
    return `<div class="community-filter">${tabs.map(([k, l]) =>
      `<button class="community-filter-btn ${_filter === k ? 'active' : ''}" data-f="${k}" onclick="Community.setFilter('${k}')">${l}</button>`).join('')}</div>`;
  }

  function setFilter(f) {
    _filter = f;
    document.querySelectorAll('.community-filter-btn').forEach(b => b.classList.toggle('active', b.dataset.f === f));
    renderFeedList();
  }

  function renderFeedList() {
    const list = document.getElementById('community-feed-list'); if (!list) return;
    const me = Auth.current();
    const arr = Object.values(_posts).filter(p => canSee(p, me) && matchesFilter(p)).sort(byNewest);
    list.innerHTML = arr.length ? arr.map(postCardHtml).join('')
      : '<div class="community-empty">No posts here yet. Be the first to share something!</div>';
    if (window.LinkPreview) LinkPreview.hydrate(list);
    if (window.Profile && Profile.hydrateAvatars) Profile.hydrateAvatars(list);
  }

  function renderProfileList() {
    const list = document.getElementById('innlegg-list'); if (!list) return;
    const me = Auth.current();
    const arr = Object.values(_posts)
      .filter(p => p.author === _profileUser && canSee(p, me))
      .sort(byNewest);
    list.innerHTML = arr.length ? arr.map(postCardHtml).join('')
      : '<div class="community-empty">No posts yet.</div>';
    if (window.LinkPreview) LinkPreview.hydrate(list);
    if (window.Profile && Profile.hydrateAvatars) Profile.hydrateAvatars(list);
  }

  // ── Topp-faner: Vegg · Last opp musikk · Last opp video ───────────────
  function sectionTabsHtml() {
    const tabs = [['vegg', 'users', 'Wall'], ['musikk', 'music', 'Upload music'], ['video', 'film', 'Upload video']];
    return `<div class="community-sections">${tabs.map(([k, ic, l]) =>
      `<button class="community-section-btn ${_section === k ? 'active' : ''}" data-s="${k}" onclick="Community.setSection('${k}')">${Icon(ic)} ${l}</button>`).join('')}</div>`;
  }

  function setSection(s) {
    _section = s;
    document.querySelectorAll('.community-section-btn').forEach(b => b.classList.toggle('active', b.dataset.s === s));
    renderSection();
  }

  function loginPromptHtml(what) {
    return `<div class="community-uploader" style="text-align:center">
      <p style="color:var(--text2);margin:0 0 1rem">You must be logged in to ${what}.</p>
      <a href="#/login" class="btn btn-primary" style="display:inline-flex">${Icon('users')} Log in</a>
    </div>`;
  }

  function uploaderHtml(kind) {
    const me      = Auth.current();
    const isAudio = kind === 'audio';
    const isLabel = !!(me && me.role === 'plateselskap');
    // Lyd: alle innloggede kan laste opp alle lydformater som finnes (WAV, FLAC,
    // MP3, M4A, AAC, OGG, Opus, AIFF, WMA …). Video: MP4.
    const accept  = isAudio
      ? 'audio/*,.wav,.flac,.mp3,.m4a,.aac,.ogg,.oga,.opus,.aiff,.aif,.wma,.amr,.alac'
      : '.mp4,video/*';
    const icon    = isAudio ? 'music' : 'film';
    const head    = isAudio ? 'Upload music' : 'Upload video';
    const isPro     = _effectiveProUpload(me);
    const trialDays = _artistTrialDaysLeft(me);
    const timeSub   = isPro
      ? (trialDays > 0 && me.subscription !== 'pro'
          ? `up to 20 hours — free trial for ${trialDays} more day${trialDays === 1 ? '' : 's'} 🎁`
          : 'up to 20 hours (Pro)')
      : (_isArtistOrLabel(me)
          ? 'up to 2 hours free · your Artist/Label trial has ended · <a href="#/shop" style="color:inherit;text-decoration:underline">upgrade to Pro ⭐</a> for 20 hours'
          : 'up to 2 hours free · longer with Pro ⭐');
    const sub     = isAudio
      ? (isLabel
          ? `Choose an audio file — all audio formats are supported (WAV, FLAC, MP3, M4A …), ${timeSub}. It's shared to the wall and added to your profile.`
          : `Choose an audio file — all audio formats are supported (WAV, MP3, M4A, FLAC …), ${timeSub}. It's shared to the wall and added to your profile.`)
      : 'Choose an MP4 video — feel free to attach a cover image. It is shared to the wall and added to your profile.';
    const hint    = isAudio
      ? 'Click to choose an audio file — all audio formats'
      : 'Click to choose a video file (mp4)';
    const fn      = isAudio ? 'Community.uploadMusic()' : 'Community.uploadVideo()';
    // Forsidebilde til videoen («bilde til mp4»).
    const coverField = isAudio ? '' : `
        <label class="community-uploader-drop community-uploader-cover" for="cu-video-cover">
          ${Icon('image')}
          <span id="cu-video-cover-name">Add cover image (optional)</span>
          <input type="file" id="cu-video-cover" accept="image/*" style="display:none" onchange="Community.pickedCover(this)">
        </label>`;
    // Plateselskap-felt (kun lyd, kun label-kontoer): utgivernavn + egen kjøpslenke
    // til låta eller nettstedet, med AI-agent som skriver kjøpsteksten.
    const labelField = (isAudio && isLabel) ? `
        <input type="text" id="cu-audio-label" class="community-uploader-input" placeholder="Record label / publisher" maxlength="80" value="${esc(me.labelName || '')}">
        <input type="url" id="cu-audio-buy" class="community-uploader-input" placeholder="Purchase link to the song or your website (https://…)" maxlength="400" value="${esc(me.buyUrl || '')}">
        <div class="community-uploader-airow">
          <button type="button" class="btn btn-ghost btn-sm" onclick="Community.aiBuyHelp()">${Icon('sparkles')} AI help with purchase text</button>
          <span class="community-uploader-aihint">Let AI write a short call to purchase for you.</span>
        </div>` : '';
    return `
      <div class="community-uploader">
        <div class="community-uploader-head">${Icon(icon)} ${head}</div>
        <p class="community-uploader-sub">${sub}</p>
        <label class="community-uploader-drop" for="cu-${kind}-file">
          ${Icon(icon)}
          <span id="cu-${kind}-name">${hint}</span>
          <input type="file" id="cu-${kind}-file" accept="${accept}" style="display:none" onchange="Community.pickedFile('${kind}', this)">
        </label>
        ${coverField}
        <input type="text" id="cu-${kind}-title" class="community-uploader-input" placeholder="Title (optional)" maxlength="120">
        ${labelField}
        <textarea id="cu-${kind}-desc" class="community-uploader-input community-uploader-desc" placeholder="Write a text / description (optional)" maxlength="1000"></textarea>
        <button class="btn btn-primary w-full" onclick="${fn}">${Icon('send')} Upload and share</button>
        <div id="cu-${kind}-status" class="community-uploader-status"></div>
      </div>`;
  }

  function pickedFile(kind, input) {
    const f = input.files && input.files[0];
    const el = document.getElementById('cu-' + kind + '-name');
    if (el && f) el.textContent = f.name;
  }

  function pickedCover(input) {
    const f = input.files && input.files[0];
    const el = document.getElementById('cu-video-cover-name');
    if (el && f) el.textContent = f.name;
  }

  // AI-agent for plateselskap: skriver en kort kjøpsoppfordring og legger den i
  // beskrivelsesfeltet, ut fra tittel, plateselskap og kjøpslenke.
  async function aiBuyHelp() {
    const me = Auth.current();
    if (!me) { if (typeof Router !== 'undefined') Router.go('/login'); return; }
    if (typeof AI === 'undefined' || !AI.suggestBuyCta) {
      if (typeof App !== 'undefined') App.toast('AI is not available right now.', 'error'); return;
    }
    const titleEl = document.getElementById('cu-audio-title');
    const buyEl   = document.getElementById('cu-audio-buy');
    const labelEl = document.getElementById('cu-audio-label');
    const descEl  = document.getElementById('cu-audio-desc');
    const btn     = document.querySelector('.community-uploader-airow .btn');
    const title = (titleEl && titleEl.value.trim()) || '';
    const labelName = (labelEl && labelEl.value.trim()) || me.labelName || me.displayName || 'the record label';
    const url = (buyEl && buyEl.value.trim()) || '';
    if (btn) { btn.disabled = true; btn.innerHTML = `<span class="spinner" style="width:13px;height:13px;border-width:2px"></span> Writing…`; }
    try {
      const cta = (await AI.suggestBuyCta({ title, labelName, url })).trim();
      if (descEl && cta) {
        const cur = descEl.value.trim();
        descEl.value = cur ? (cur + '\n\n' + cta) : cta;
      }
      if (typeof App !== 'undefined') App.toast('✨ Purchase text added — feel free to edit before sharing.', 'success');
    } catch (e) {
      if (typeof App !== 'undefined') App.toast('AI couldn\'t write the text: ' + (e.message || 'unknown error'), 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = `${Icon('sparkles')} AI help with purchase text`; }
    }
  }

  // Leser lengden på en lydfil (sekunder) via et skjult <audio>-element.
  function getAudioDuration(file) {
    return new Promise((resolve) => {
      try {
        const url = URL.createObjectURL(file);
        const a = document.createElement('audio');
        a.preload = 'metadata';
        a.onloadedmetadata = () => { const d = a.duration; URL.revokeObjectURL(url); resolve(isFinite(d) ? d : 0); };
        a.onerror = () => { URL.revokeObjectURL(url); resolve(0); };
        a.src = url;
      } catch { resolve(0); }
    });
  }

  // Last opp til delt skylagring (Supabase) når den er satt opp, ellers signaliser
  // lokal lagring så kalleren kan legge fila i IndexedDB (DB.*) i stedet.
  async function _uploadToStorage(file, prefix) {
    const useCloud = (typeof SC_Storage !== 'undefined') && SC_Storage.isConfigured();
    if (useCloud) {
      try { const res = await SC_Storage.upload(file, { prefix }); return { url: res.url, path: res.path, shared: true }; }
      catch (e) { if (e && e.message !== 'not-configured') console.warn('[Community] skylagring feilet:', e.message); }
    }
    return { url: null, path: null, shared: false };
  }

  // Kjenner igjen en lydfil på MIME-type ELLER filendelse — mange systemer setter
  // ikke MIME på WAV/FLAC/AIFF, så vi godtar alle kjente lydendelser i tillegg.
  const AUDIO_EXT = ['wav','wave','flac','mp3','m4a','aac','ogg','oga','opus','aiff','aif','aifc','wma','amr','alac','mp4a','weba','caf'];
  const FREE_AUDIO_MAX_SECONDS = 2 * 60 * 60;   // gratis-kontoer: opptil 2 timer
  const PRO_AUDIO_MAX_SECONDS  = 20 * 60 * 60;  // Pro: opptil 20 timer (samme tak som DJ-mixes)

  // ── Bandcamp-stil prøveperiode for Artist/Plateselskap ─────────────────
  // Bruker bad eksplisitt om «gratis tid, så koster det penger» à la Bandcamp
  // for produsent/plateselskap-kontoer: dei fyrste 30 dagane etter registrering
  // får dei Pro-nivå opplastingslengde (20t) heilt gratis, utan abonnement —
  // deretter fell dei attende til gratis-grensa (2t) om dei ikkje har kjøpt Pro.
  // Reint klient-side (createdAt kjem alt frå api/auth.js publicUser()/Gun-
  // skjelettet) — ingen ny DB-kolonne trengst, tidsvindauget er ikkje
  // tryggingskritisk (berre ei opplastings-bekvemmelegheit, ikkje betaling).
  const ARTIST_TRIAL_MS = 30 * 24 * 3600 * 1000;
  function _isArtistOrLabel(me) { return !!(me && (me.role === 'produsent' || me.role === 'plateselskap')); }
  function _artistTrialDaysLeft(me) {
    if (!_isArtistOrLabel(me)) return 0;
    const created = Number(me.createdAt) || 0;
    if (!created) return 0;
    const left = ARTIST_TRIAL_MS - (Date.now() - created);
    return left > 0 ? Math.ceil(left / (24 * 3600 * 1000)) : 0;
  }
  function _effectiveProUpload(me) { return !!(me && (me.subscription === 'pro' || _artistTrialDaysLeft(me) > 0)); }

  function isAudioFile(file) {
    if (/^audio\//.test(file.type || '')) return true;
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    return AUDIO_EXT.includes(ext);
  }

  async function uploadMusic() {
    const me = Auth.current();
    if (!me) { if (typeof Router !== 'undefined') Router.go('/login'); return; }
    const input  = document.getElementById('cu-audio-file');
    const status = document.getElementById('cu-audio-status');
    const titleEl = document.getElementById('cu-audio-title');
    const descEl  = document.getElementById('cu-audio-desc');
    const labelEl = document.getElementById('cu-audio-label');
    const file = input && input.files && input.files[0];
    if (!file) { if (typeof App !== 'undefined') App.toast('Choose an audio file first.', 'info'); return; }
    if (!isAudioFile(file)) { if (typeof App !== 'undefined') App.toast('That doesn\'t look like an audio file.', 'error'); return; }
    // Lengde-grense knyttet til de SAMME kjøpsplanene som DJ-mixes:
    // gratis-kontoer opptil 2 timer, Pro opptil 20 timer. (0 = ukjent lengde → slipper igjennom.)
    if (status) status.innerHTML = `<span class="spinner" style="width:14px;height:14px;border-width:2px"></span> Checking audio file…`;
    const dur = await getAudioDuration(file);
    const isPro = _effectiveProUpload(me);
    if (dur && !isPro && dur > FREE_AUDIO_MAX_SECONDS + 5) {
      if (status) status.innerHTML =
        `<span style="color:var(--danger,#f87171)">Audio files over 2 hours require Pro ⭐ — <a href="#/shop" style="color:inherit;text-decoration:underline">upgrade in Shop</a></span>`;
      if (typeof App !== 'undefined') App.toast('Audio files over 2 hours require Pro ⭐ — upgrade in Shop', 'error', 6000);
      return;
    }
    if (dur && dur > PRO_AUDIO_MAX_SECONDS + 5) {
      const mins = Math.round(dur / 60);
      if (status) status.innerHTML = `<span style="color:var(--danger,#f87171)">The audio file is ${mins} min — max length is 20 hours.</span>`;
      if (typeof App !== 'undefined') App.toast('The max length for an audio file is 20 hours.', 'error');
      return;
    }
    const title = (titleEl && titleEl.value.trim()) || file.name.replace(/\.[^.]+$/, '');
    const desc  = (descEl && descEl.value.trim()) || '';
    const labelName = (labelEl && labelEl.value.trim()) || '';
    const buyEl = document.getElementById('cu-audio-buy');
    let buyUrl  = (buyEl && buyEl.value.trim()) || '';
    if (buyUrl && !/^https?:\/\//i.test(buyUrl)) buyUrl = 'https://' + buyUrl;   // tåler at de utelater https://
    // Oppdater lagret plateselskap-navn / fast kjøpslenke hvis label-eier endret det.
    const labelPatch = {};
    if (labelName && labelName !== me.labelName) labelPatch.labelName = labelName;
    if (buyUrl && buyUrl !== me.buyUrl)          labelPatch.buyUrl = buyUrl;
    if (Object.keys(labelPatch).length) Auth.updateUser(me.username, labelPatch);
    if (status) status.innerHTML = `<span class="spinner" style="width:14px;height:14px;border-width:2px"></span> Uploading…`;
    try {
      const id = `mus_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const up = await _uploadToStorage(file, 'shared-audio');
      const meta = {
        name: title, artist: me.displayName || me.username, visibility: 'public',
        mime: file.type, fileSize: file.size, createdAt: Date.now(),
        audioUrl: up.url, storagePath: up.path, source: 'community',
        description: desc, label: labelName, buyUrl, durationSec: Math.round(dur) || 0,
      };
      if (up.shared) await DB.put('music', { id, ...meta });
      else           await DB.storeFile('music', id, file, meta);
      me.musicIds = [...(me.musicIds || []), id];
      Auth.updateUser(me.username, { musicIds: me.musicIds });
      if (up.shared) shareMedia({ kind: 'audio', name: title, url: up.url, sourceId: id, audience: 'public', caption: desc, label: labelName, buyUrl });
      // Varsling til alle innlogga skjer via den delte feeden (subscribe()).
      if (typeof App !== 'undefined') App.toast(up.shared ? '🎵 Music uploaded and shared!' : '🎵 Saved locally on this device.', 'success');
      setSection('vegg');
    } catch (e) {
      if (status) status.innerHTML = `<span style="color:var(--danger,#f87171)">Upload failed: ${esc(e.message || 'unknown error')}</span>`;
    }
  }

  async function uploadVideo() {
    const me = Auth.current();
    if (!me) { if (typeof Router !== 'undefined') Router.go('/login'); return; }
    const input  = document.getElementById('cu-video-file');
    const status = document.getElementById('cu-video-status');
    const titleEl = document.getElementById('cu-video-title');
    const descEl  = document.getElementById('cu-video-desc');
    const coverInput = document.getElementById('cu-video-cover');
    const file = input && input.files && input.files[0];
    if (!file) { if (typeof App !== 'undefined') App.toast('Choose a video file first.', 'info'); return; }
    const vext = (file.name.split('.').pop() || '').toLowerCase();
    if (!/^video\//.test(file.type) && vext !== 'mp4') { if (typeof App !== 'undefined') App.toast('That doesn\'t look like a video file.', 'error'); return; }
    const title = (titleEl && titleEl.value.trim()) || file.name.replace(/\.[^.]+$/, '');
    const desc  = (descEl && descEl.value.trim()) || '';
    if (status) status.innerHTML = `<span class="spinner" style="width:14px;height:14px;border-width:2px"></span> Uploading…`;
    try {
      // Forsidebilde («bilde til mp4») — sky-lagret hvis mulig, ellers nedskalert data-URL.
      let coverUrl = '';
      const coverFile = coverInput && coverInput.files && coverInput.files[0];
      if (coverFile && /^image\//.test(coverFile.type)) {
        const cUp = await _uploadToStorage(coverFile, 'video-cover');
        coverUrl = cUp.shared ? cUp.url : await downscaleImage(coverFile);
      }
      const id = `m_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const up = await _uploadToStorage(file, 'video');
      const meta = {
        kind: 'file', type: file.type, name: title, visibility: 'public',
        mediaUrl: up.url, storagePath: up.path, fileSize: file.size, createdAt: Date.now(),
        description: desc, coverUrl,
      };
      if (up.shared) await DB.put('media', { id, ...meta });
      else           await DB.storeFile('media', id, file, meta);
      me.mediaIds = [...(me.mediaIds || []), id];
      Auth.updateUser(me.username, { mediaIds: me.mediaIds });
      if (up.shared) shareMedia({ kind: 'video', name: title, url: up.url, sourceId: id, audience: 'public', caption: desc, coverUrl });
      // Varsling til alle innlogga skjer via den delte feeden (subscribe()).
      if (typeof App !== 'undefined') App.toast(up.shared ? '🎬 Video uploaded and shared!' : '🎬 Saved locally on this device.', 'success');
      setSection('vegg');
    } catch (e) {
      if (status) status.innerHTML = `<span style="color:var(--danger,#f87171)">Upload failed: ${esc(e.message || 'unknown error')}</span>`;
    }
  }

  // ── Visninger ─────────────────────────────────────────────────────────
  // Fyller seksjons-kroppen ut fra valgt topp-fane (uten å bygge om hele siden).
  function renderSection() {
    const body = document.getElementById('community-section-body'); if (!body) return;
    const me = Auth.current();
    if (_section === 'musikk') { body.innerHTML = me ? uploaderHtml('audio') : loginPromptHtml('upload and share music'); return; }
    if (_section === 'video')  { body.innerHTML = me ? uploaderHtml('video') : loginPromptHtml('upload and share video'); return; }
    // 'vegg' — live nå + komponer + filter + feed (som før)
    body.innerHTML = `
      ${me ? composerHtml() : `<div class="community-login"><a href="#/login">Log in</a> to share something with the community.</div>`}
      ${filterTabsHtml()}
      <div id="community-feed-list" class="community-feed"></div>`;
    renderFeedList();
    if (me) ensureComposerTargets();
  }

  // ── Zoom ──────────────────────────────────────────────────────────────
  // Skalerer hele Community-veggen. Knappene ligger fast i hjørnene (utenfor
  // .community-wrap, så de zoomer ikke med innholdet).
  function applyZoom() {
    const wrap = document.querySelector('.community-wrap');
    if (!wrap) return;
    wrap.style.transformOrigin = 'top center';
    wrap.style.transform = `scale(${_zoom})`;
    const lbl = document.getElementById('community-zoom-lvl');
    if (lbl) lbl.textContent = Math.round(_zoom * 100) + '%';
  }

  function zoom(delta) {
    _zoom = Math.min(2, Math.max(0.6, +(_zoom + delta).toFixed(2)));
    applyZoom();
  }

  function zoomReset() { _zoom = 1; applyZoom(); }

  function zoomControlsHtml() {
    return '';   // Zoom-kontrollene (− / +) fjernet på ønske
  }

  function render() {
    subscribe();
    _publicOnly = true;          // Community-veggen: alt synlig for alle innloggede
    const app = document.getElementById('app'); if (!app) return;
    app.innerHTML = `
      <div class="community-wrap">
        <div class="community-head">
          <h1>${Icon('users')} Community</h1>
          <p>What's happening on SiriusFM right now — music, video and people, wall to wall.</p>
        </div>
        ${sectionTabsHtml()}
        <div id="community-section-body"></div>
      </div>
      ${zoomControlsHtml()}`;
    renderSection();
    applyZoom();                 // gjenopprett gjeldende zoom-nivå
    hydrateRemote();             // hent varige innlegg fra sky (synlig for alle)
    startPolling();              // hold feeden fersk → nyaste innlegg øvst for alle, på alle plattformer
  }

  // Bygger hele Community-veggen (Vegg/Musikk/Video) inn i eit vilkårleg
  // element — brukt av Community-fana på profilar. Synleg for alle innlogga
  // brukarar på alle plattformer (iPhone, Android, nettbrett, desktop).
  function renderInto(el) {
    if (!el) return;
    subscribe();
    _publicOnly = true;          // Community-veggen: alt synleg for alle innlogga
    el.innerHTML = `
      <div class="community-wrap community-wrap--embed">
        ${sectionTabsHtml()}
        <div id="community-section-body"></div>
      </div>`;
    renderSection();
    hydrateRemote();             // hent varige innlegg frå sky (synleg for alle)
    startPolling();              // hald feeden fersk (nyaste øvst, alle plattformer)
  }

  function renderProfilePosts(username, isOwner) {
    subscribe();
    _publicOnly = false;         // profilveggen beholder venner/offentlig-valget
    _profileUser = username;
    const el = document.getElementById('tab-innlegg'); if (!el) return;
    const me = Auth.current();
    const composer = (isOwner && me) ? composerHtml() : '';
    el.innerHTML = `${composer}<div id="innlegg-list" class="community-feed"></div>`;
    renderProfileList();
    if (isOwner && me) ensureComposerTargets();
    hydrateRemote();             // hent varige innlegg fra sky (synlig for alle)
    startPolling();              // hold profil-innlegga ferske (nyaste øvst, alle plattformer)
  }

  return {
    render, renderInto, renderProfilePosts, post, setWallVisibility, deletePost, subscribe,
    editPost, saveEdit, cancelEdit, removePreview,
    shareMedia, unshareMedia, isShared, autoShareOn, setAutoShare, setFilter,
    addImage, clearImage, visiblePosts, postCardHtml, getPost, hydrateRemote,
    setSection, pickedFile, pickedCover, aiBuyHelp, uploadMusic, uploadVideo, playYt,
    zoom, zoomReset, onTargetChange, refreshComposerTarget, startPolling, stopPolling,
    toggleEmojiPicker, insertEmoji, pickGif,
  };
})();
window.Community = Community;
