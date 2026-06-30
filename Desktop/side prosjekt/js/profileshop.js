// ProfileShop — den ekte «Butikk»-fanen på profilen, for ALLE brukere.
// Her kan man kjøpe og selge låter direkte fra profilen. Selvstendig modul som
// gjenbruker den eksisterende motoren (window.Marketplace + api/marketplace.js) og
// AI-laget (window.AI). Holdt utenfor profile.js med vilje fordi den fila skrives
// om samtidig — alt her er additivt og kolliderer ikke.
//
// Degraderer pent: uten Supabase-nøkler eller server-secrets viser den en vennlig
// melding i stedet for å feile. icons.js kaller ProfileShop.render() når
// «Butikk»-fanen vises (lazy + på nytt ved klikk).
const ProfileShop = (() => {

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function icon(name) { return (typeof Icon === 'function') ? Icon(name) : ''; }
  function toast(msg, kind, ms) { if (typeof App !== 'undefined' && App.toast) App.toast(msg, kind, ms); }

  // Hvilken profil vises nå? Profil-ruten er alltid #/u/<brukernavn>.
  function viewedUsername() {
    const m = (location.hash || '').match(/#\/u\/([^/?#]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  }
  function isOwnerOf(username) {
    const me = (typeof Auth !== 'undefined' && Auth.current) ? Auth.current() : null;
    return !!(me && username && me.username === username);
  }
  function configured() {
    // NB: Marketplace/AI/DB/Auth er top-level const-er — de henger IKKE på window i
    // klassiske skript. Referer dem som bare identifikatorer med typeof-vakt.
    return !!(typeof Marketplace !== 'undefined' && Marketplace.isConfigured && Marketplace.isConfigured());
  }

  function price(p) {
    if (p.is_free || (p.price_ore || 0) <= 0) return 'Gratis';
    return `${Math.round(p.price_ore / 100)} kr`;
  }
  function dur(sec) {
    if (!sec) return '';
    return `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
  }

  // ── Hovedrender ────────────────────────────────────────────────────────
  // Idempotent — trygg å kalle flere ganger (ved fane-klikk og re-injisering).
  let _renderSeq = 0;
  async function render() {
    const panel = document.getElementById('tab-butikk');
    if (!panel) return;
    const username = viewedUsername();
    const owner = isOwnerOf(username);
    const seq = ++_renderSeq;

    if (!configured()) {
      panel.innerHTML = wrap(`
        <div class="ps-empty">
          ${storeHero()}
          <p>Butikken er ikke koblet til ennå. Prøv igjen senere.</p>
        </div>`);
      return;
    }

    panel.innerHTML = wrap(`${storeHero()}<div class="ps-loading">Laster butikk…</div>`);

    // Hent selgerens publiserte produkter (offentlig butikk).
    const products = await Marketplace.listSellerProducts(username).catch(() => []);
    if (seq !== _renderSeq) return; // en nyere render har tatt over

    let html = storeHero();

    if (owner) {
      html += await ownerSections(username, products, seq);
      if (seq !== _renderSeq) return;
    } else {
      html += visitorStore(products);
    }

    panel.innerHTML = wrap(html);
  }

  function wrap(inner) { return `<div class="ps-wrap">${inner}</div>`; }

  function storeHero() {
    return `
      <div class="ps-hero">
        <div class="ps-hero-icon">${icon('store')}</div>
        <div>
          <h3 class="ps-hero-title">Butikk</h3>
          <p class="ps-hero-sub">Kjøp og selg låter direkte fra profilen.</p>
        </div>
      </div>`;
  }

  // ── Besøkende: selgerens butikk ─────────────────────────────────────────
  function visitorStore(products) {
    if (!products.length) {
      return `<div class="ps-empty"><p>Ingen sanger til salgs her ennå.</p></div>`;
    }
    return `<div class="ps-grid">${products.map(p => productCard(p, false)).join('')}</div>`;
  }

  function productCard(p, owner) {
    const cover = p.cover_path
      ? `<img class="ps-cover" src="${esc(p.cover_path)}" alt="" loading="lazy">`
      : `<div class="ps-cover ps-cover-ph">${icon('music')}</div>`;
    const free = p.is_free || (p.price_ore || 0) <= 0;
    const action = owner
      ? `<span class="ps-tag">Din</span>`
      : (free
          ? `<button class="btn btn-primary btn-sm" onclick="ProfileShop.buy('${esc(p.id)}')">${icon('download')} Gratis</button>`
          : `<button class="btn btn-gold btn-sm" onclick="ProfileShop.buy('${esc(p.id)}')">${icon('cart')} Kjøp · ${price(p)}</button>`);
    return `
      <div class="ps-card">
        ${cover}
        <div class="ps-card-meta">
          <div class="ps-card-title">${esc(p.title)}</div>
          <div class="ps-card-sub">${esc(p.artist || '')}${p.duration_sec ? ' · ' + dur(p.duration_sec) : ''}</div>
        </div>
        <div class="ps-card-right">
          <span class="ps-price">${price(p)}</span>
          ${action}
        </div>
      </div>`;
  }

  // ── Eier: selg + dine produkter + dine kjøp ─────────────────────────────
  async function ownerSections(username, products, seq) {
    const status = await Marketplace.sellerStatus(username).catch(() => ({ onboarding_complete: false }));
    if (seq !== _renderSeq) return '';
    const purchases = await Marketplace.myPurchases(username).catch(() => []);
    if (seq !== _renderSeq) return '';

    const sellerBanner = status.onboarding_complete
      ? `<div class="ps-banner ps-banner-ok">${icon('check')} Du er klar til å selge betalte sanger. Utbetalinger går via Stripe.</div>`
      : `<div class="ps-banner">
           <div>${icon('info')} Gratis nedlasting funker for alle med en gang. For <strong>betalt salg</strong> må du fullføre Stripe-oppsett (engangs).</div>
           <button class="btn btn-ghost btn-sm" onclick="ProfileShop.becomeSeller()">${icon('box')} Bli selger (Stripe)</button>
         </div>`;

    // Egne sanger fra musikkbiblioteket — kan legges ut.
    const songs = await ownerSongs(username);
    if (seq !== _renderSeq) return '';
    const listing = songs.length
      ? `<div class="ps-list">${songs.map(s => sellRow(s)).join('')}</div>`
      : `<p class="ps-muted">Du har ingen opplastede sanger ennå. Last opp musikk i <a href="#/edit">profileditoren</a> først, så dukker de opp her.</p>`;

    const myStore = products.length
      ? `<div class="ps-grid">${products.map(p => productCard(p, true)).join('')}</div>`
      : `<p class="ps-muted">Ingen sanger lagt ut for salg ennå. Trykk «Legg ut» på en sang over.</p>`;

    const myBuys = purchases.length
      ? `<div class="ps-list">${purchases.map(buyRow).join('')}</div>`
      : `<p class="ps-muted">Du har ingen kjøp ennå.</p>`;

    return `
      ${sellerBanner}
      <div class="ps-section">
        <div class="ps-section-title">${icon('plus')} Legg ut en sang</div>
        ${listing}
      </div>
      <div class="ps-section">
        <div class="ps-section-title">${icon('store')} I butikken din · ${products.length}</div>
        ${myStore}
      </div>
      <div class="ps-section">
        <div class="ps-section-title">${icon('cart')} Mine kjøp</div>
        ${myBuys}
      </div>`;
  }

  // Last selgerens egne sanger fra IndexedDB ('music'-store, via musicIds).
  async function ownerSongs(username) {
    const user = (typeof Auth !== 'undefined' && Auth.getUser) ? Auth.getUser(username) : null;
    const ids = (user && user.musicIds) || [];
    if (!ids.length || typeof DB === 'undefined') return [];
    const out = [];
    for (const id of ids) {
      try {
        const rec = await DB.get('music', id);
        if (rec) { rec._id = id; out.push(rec); }  // behold DB-nøkkelen
      } catch (_) {}
    }
    return out;
  }

  function sellRow(rec) {
    const id = rec._id || rec.id || rec.trackId;
    const status = rec.forSale
      ? `<span class="ps-tag ps-tag-live">${rec.saleFree ? 'Gratis' : (rec.salePriceNok || 0) + ' kr'}</span>`
      : '';
    return `
      <div class="ps-row">
        <div class="ps-row-cover">${rec.coverUrl ? `<img src="${esc(rec.coverUrl)}" alt="" loading="lazy">` : icon('music')}</div>
        <div class="ps-row-meta">
          <div class="ps-row-title">${esc(rec.name || rec.title || 'Uten tittel')}</div>
          <div class="ps-row-sub">${esc(rec.artist || '')}${rec.duration ? ' · ' + dur(rec.duration) : ''}</div>
        </div>
        ${status}
        <button class="btn btn-gold btn-sm" onclick="ProfileShop.openSellModal('${esc(id)}')">
          ${icon('tag')} ${rec.forSale ? 'Endre' : 'Legg ut'}
        </button>
      </div>`;
  }

  function buyRow(p) {
    return `
      <div class="ps-row">
        <div class="ps-row-cover">${icon('music')}</div>
        <div class="ps-row-meta">
          <div class="ps-row-title">${esc(p.title)}</div>
          <div class="ps-row-sub">${esc(p.artist || '')}${p.seller ? ' · @' + esc(p.seller) : ''}</div>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="ProfileShop.download('${esc(p.productId)}')">${icon('download')} Last ned</button>
      </div>`;
  }

  // ── Selg-modal (selvstendig, med AI-prisforslag) ────────────────────────
  async function openSellModal(trackId) {
    if (typeof DB === 'undefined') return;
    const rec = await DB.get('music', trackId).catch(() => null);
    if (!rec) { toast('Fant ikke sporet', 'error'); return; }
    const box = document.getElementById('modal-box');
    if (!box) return;

    const free = !!rec.saleFree;
    box.innerHTML = `
      <div class="modal-header">
        <h2>${icon('tag')} ${rec.forSale ? 'Endre i butikken' : 'Legg ut for salg'}</h2>
        <button class="btn-icon" onclick="App.closeModal()" aria-label="Lukk">${icon('x')}</button>
      </div>
      <div class="ps-modal-body">
        <div class="ps-modal-track">
          <div class="ps-row-cover">${rec.coverUrl ? `<img src="${esc(rec.coverUrl)}" alt="">` : icon('music')}</div>
          <div>
            <div class="ps-row-title">${esc(rec.name || rec.title || 'Uten tittel')}</div>
            <div class="ps-row-sub">${esc(rec.artist || '')}${rec.duration ? ' · ' + dur(rec.duration) : ''}</div>
          </div>
        </div>

        <label class="ps-check">
          <input type="checkbox" id="ps-free" ${free ? 'checked' : ''}
            onchange="document.getElementById('ps-price-wrap').style.display=this.checked?'none':'block'">
          Gratis nedlasting (krever ikke Stripe)
        </label>

        <div class="form-group" id="ps-price-wrap" style="display:${free ? 'none' : 'block'}">
          <label class="form-label">Pris (NOK)</label>
          <div class="ps-price-row">
            <input class="form-input" id="ps-price" type="number" min="0" step="1" value="${rec.salePriceNok || ''}" placeholder="f.eks. 49">
            <button class="btn btn-ghost btn-sm" id="ps-ai-price" onclick="ProfileShop.aiSuggestPrice('${esc(trackId)}')">${icon('sparkles')} Foreslå pris med AI</button>
          </div>
          <div id="ps-ai-out" class="ps-ai-out"></div>
        </div>

        <div class="ps-modal-actions">
          <button class="btn btn-gold" onclick="ProfileShop.submitListing('${esc(trackId)}')">${icon('store')} ${rec.forSale ? 'Oppdater i butikk' : 'Legg ut'}</button>
          <button class="btn btn-ghost" onclick="App.closeModal()">Avbryt</button>
        </div>
        <p class="ps-fine">Betalt salg krever fullført Stripe-oppsett («Bli selger»). Gratis nedlasting krever det ikke.</p>
      </div>`;
    App.openModal();
  }

  async function submitListing(trackId) {
    const free = !!document.getElementById('ps-free')?.checked;
    const priceNok = document.getElementById('ps-price')?.value;
    await Marketplace.listSongForSale(trackId, { priceNok, isFree: free });
    // listSongForSale lukker modalen + viser toast ved suksess. Oppdater fanen.
    setTimeout(render, 400);
  }

  // ── AI: prisforslag ─────────────────────────────────────────────────────
  async function aiSuggestPrice(trackId) {
    const out = document.getElementById('ps-ai-out');
    const btn = document.getElementById('ps-ai-price');
    if (typeof AI === 'undefined' || !AI.callClaude) { if (out) out.textContent = 'AI er ikke tilgjengelig.'; return; }
    const rec = await DB.get('music', trackId).catch(() => null);
    if (out) out.innerHTML = `${icon('sparkles')} AI tenker…`;
    if (btn) btn.disabled = true;
    try {
      const ctx = `Tittel: ${rec?.name || rec?.title || 'ukjent'}. Artist: ${rec?.artist || 'ukjent'}. Lengde: ${dur(rec?.duration) || 'ukjent'}. Sjanger/stil: ${rec?.genre || 'elektronisk musikk'}.`;
      const txt = await AI.callClaude(
        'Du er en prisrådgiver for en uavhengig musikk-markedsplass (Bandcamp-stil) i Norge. Foreslå en rimelig salgspris i NOK for en enkelt nedlastbar låt fra en uavhengig artist. Typisk spenn er 15–79 kr. Svar med JSON: {"pris": <heltall NOK>, "begrunnelse": "<én kort setning på norsk bokmål>"}. Kun JSON.',
        ctx, 120);
      let pris = null, why = '';
      try { const o = JSON.parse(txt.match(/\{[\s\S]*\}/)?.[0] || txt); pris = parseInt(o.pris, 10); why = o.begrunnelse || ''; } catch (_) {}
      if (pris && pris > 0) {
        const inp = document.getElementById('ps-price');
        if (inp) inp.value = pris;
        if (out) out.innerHTML = `${icon('sparkles')} AI foreslår <strong>${pris} kr</strong>${why ? ' — ' + esc(why) : ''}`;
      } else if (out) {
        out.textContent = txt.slice(0, 160);
      }
    } catch (e) {
      if (out) out.textContent = 'Kunne ikke hente forslag: ' + e.message;
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  // ── Stiler (selvstendige, injisert herfra for å unngå kollisjon i styles.css) ──
  function ensureStyles() {
    if (typeof document === 'undefined' || document.getElementById('ps-styles')) return;
    var s = document.createElement('style');
    s.id = 'ps-styles';
    s.textContent = `
      .ps-wrap{padding:.5rem 0 1.5rem}
      .ps-hero{display:flex;align-items:center;gap:.85rem;margin-bottom:1.1rem}
      .ps-hero-icon{font-size:1.8rem;color:var(--accent,#7c3aed);display:flex}
      .ps-hero-icon svg{width:1.8rem;height:1.8rem}
      .ps-hero-title{margin:0;color:var(--text,#fff);font-size:1.15rem}
      .ps-hero-sub{margin:.1rem 0 0;color:var(--text2,#aaa);font-size:.85rem}
      .ps-banner{display:flex;align-items:center;justify-content:space-between;gap:.75rem;flex-wrap:wrap;
        background:var(--surface,#1b1b22);border:1px solid var(--border,#333);border-radius:12px;padding:.7rem .9rem;margin-bottom:1.1rem;font-size:.84rem;color:var(--text2,#bbb)}
      .ps-banner-ok{border-color:rgba(80,200,120,.4)}
      .ps-section{margin-bottom:1.4rem}
      .ps-section-title{display:flex;align-items:center;gap:.45rem;font-weight:600;color:var(--text,#fff);font-size:.95rem;margin-bottom:.6rem}
      .ps-section-title svg{width:1.05rem;height:1.05rem;color:var(--accent,#7c3aed)}
      .ps-muted{color:var(--text3,#888);font-size:.83rem;margin:.25rem 0}
      .ps-muted a{color:var(--accent,#7c3aed)}
      .ps-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:.7rem}
      .ps-card{display:flex;align-items:center;gap:.65rem;background:var(--surface,#1b1b22);border:1px solid var(--border,#333);border-radius:12px;padding:.6rem}
      .ps-cover,.ps-row-cover{width:48px;height:48px;border-radius:8px;flex-shrink:0;object-fit:cover}
      .ps-cover-ph,.ps-row-cover{display:flex;align-items:center;justify-content:center;background:rgba(124,58,237,.12);color:var(--accent,#7c3aed)}
      .ps-row-cover img{width:100%;height:100%;object-fit:cover;border-radius:8px}
      .ps-card-meta,.ps-row-meta{flex:1;min-width:0}
      .ps-card-title,.ps-row-title{font-weight:600;color:var(--text,#fff);font-size:.88rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .ps-card-sub,.ps-row-sub{color:var(--text3,#999);font-size:.76rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .ps-card-right{display:flex;flex-direction:column;align-items:flex-end;gap:.3rem;flex-shrink:0}
      .ps-price{font-size:.78rem;color:var(--text2,#bbb);font-weight:600}
      .ps-list{display:flex;flex-direction:column;gap:.5rem}
      .ps-row{display:flex;align-items:center;gap:.65rem;background:var(--surface,#1b1b22);border:1px solid var(--border,#333);border-radius:12px;padding:.55rem .7rem}
      .ps-tag{font-size:.68rem;text-transform:uppercase;letter-spacing:.04em;padding:.2rem .55rem;border-radius:999px;background:rgba(255,255,255,.07);color:var(--text2,#bbb)}
      .ps-tag-live{background:rgba(80,200,120,.16);color:#5fd28a}
      .ps-empty{text-align:center;padding:1rem;color:var(--text2,#aaa)}
      .ps-loading{padding:1.5rem;text-align:center;color:var(--text3,#888)}
      .ps-modal-body{padding:.5rem 0}
      .ps-modal-track{display:flex;align-items:center;gap:.7rem;margin-bottom:1rem}
      .ps-modal-track img{width:54px;height:54px;border-radius:8px;object-fit:cover}
      .ps-check{display:flex;align-items:center;gap:.5rem;font-size:.86rem;margin-bottom:.7rem;color:var(--text2,#ccc)}
      .ps-price-row{display:flex;gap:.5rem;align-items:center;flex-wrap:wrap}
      .ps-price-row .form-input{flex:1;min-width:120px}
      .ps-ai-out{font-size:.8rem;color:var(--text2,#bbb);margin-top:.5rem;min-height:1em}
      .ps-ai-out svg{width:.95rem;height:.95rem;vertical-align:-2px}
      .ps-modal-actions{display:flex;gap:.6rem;margin-top:1.1rem;flex-wrap:wrap}
      .ps-fine{font-size:.72rem;color:var(--text3,#888);margin-top:.5rem}`;
    (document.head || document.documentElement).appendChild(s);
  }
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ensureStyles);
    else ensureStyles();
  }

  // ── Tynne videresendinger til motoren ───────────────────────────────────
  function buy(productId)        { return Marketplace.buySong(productId); }
  function download(productId)   { return Marketplace.download(productId); }
  function becomeSeller()        { return Marketplace.becomeSeller(); }

  return {
    render, viewedUsername,
    buy, download, becomeSeller,
    openSellModal, submitListing, aiSuggestPrice,
  };
})();

window.ProfileShop = ProfileShop;
