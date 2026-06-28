// Marketplace — Bandcamp-stil salg av egne sanger.
// Selger kobler Stripe Connect («Bli selger»), legger ut sanger (sett pris selv
// eller gratis nedlasting). Kjøp går via Stripe Checkout med destination charge.
// Lyd-filen lastes opp til den PRIVATE 'songs'-bøtta; nedlasting er tilgangsstyrt.
//
// Degraderer pent: uten Supabase-nøkler (CONFIG) viser den en vennlig melding i
// stedet for å feile, så resten av appen virker som før.
const Marketplace = (() => {

  function isConfigured() {
    return !!(window.CONFIG && CONFIG.SUPABASE_URL && CONFIG.SUPABASE_ANON_KEY
              && window.supabase && typeof window.supabase.createClient === 'function');
  }

  function client() {
    return window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  }

  function notReady() {
    App.toast('Butikken er ikke konfigurert ennå (mangler Supabase-nøkler). Se MARKETPLACE-SETUP.md.', 'error', 6000);
  }

  // ── Selger-onboarding (Stripe Connect) ─────────────────────────────────
  async function becomeSeller() {
    const u = Auth.current();
    if (!u) { Router.go('/login'); return; }
    try {
      const r = await fetch('/api/marketplace?action=connect-onboard', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u.username }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Feil ved onboarding');
      window.location.href = d.url;
    } catch (e) {
      App.toast('Kunne ikke starte selger-onboarding: ' + e.message, 'error');
    }
  }

  async function sellerStatus(username) {
    try {
      const r = await fetch('/api/marketplace?action=connect-status&username=' + encodeURIComponent(username));
      return await r.json();
    } catch { return { seller: false, onboarding_complete: false }; }
  }

  // ── Legg ut en eksisterende sang for salg / gratis nedlasting ───────────
  async function listSongFromModal(trackId) {
    const free  = !!document.getElementById('sc-sale-free')?.checked;
    const price = document.getElementById('sc-price')?.value;
    return listSongForSale(trackId, { priceNok: price, isFree: free });
  }

  async function listSongForSale(trackId, { priceNok, isFree }) {
    const u = Auth.current();
    if (!u) { Router.go('/login'); return; }
    if (!isConfigured()) return notReady();
    if (!isFree && (!priceNok || parseFloat(priceNok) <= 0)) {
      App.toast('Sett en pris, eller huk av for gratis nedlasting.', 'error'); return;
    }
    const rec = await DB.get('music', trackId);
    if (!rec) { App.toast('Fant ikke sporet', 'error'); return; }

    App.toast('Laster opp sang til butikken…', 'info', 8000);
    try {
      const file = new Blob([rec.data], { type: rec.type || 'audio/mpeg' });
      const ext  = (rec.name || '').match(/\.([a-z0-9]+)$/i)?.[1] || (rec.type || '').split('/')[1] || 'mp3';
      const path = `${u.username}/${trackId}.${ext}`;

      // 1a) Hent opplastings-token (HMAC, scoper til egen mappe server-side)
      const tk = await fetch('/api/marketplace?action=upload-token', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u.username }),
      });
      const tkd = await tk.json();
      if (!tk.ok) throw new Error(tkd.error || 'Kunne ikke hente opplastings-token');

      // 1b) Hent signert opplastings-URL for privat bøtte
      const up  = await fetch('/api/marketplace?action=song-upload-url', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, uploadToken: tkd.token }),
      });
      const upd = await up.json();
      if (!up.ok) throw new Error(upd.error || 'Opplasting feilet');

      // 2) Last opp filen direkte til Supabase Storage
      const sb = client();
      const { error: upErr } = await sb.storage.from(upd.bucket).uploadToSignedUrl(upd.path, upd.token, file);
      if (upErr) throw new Error(upErr.message);

      // 3) Registrer produktet
      const r = await fetch('/api/marketplace?action=list-product', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: u.username, productId: rec.productId || null,
          title: rec.name || rec.title || 'Untitled', artist: rec.artist || '',
          credits: rec.credits || {}, buyLinks: rec.buyLinks || {},
          price_ore: Math.round((parseFloat(priceNok) || 0) * 100), is_free: !!isFree,
          audio_path: upd.path, duration_sec: rec.duration || null,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Kunne ikke publisere');

      // Lagre produkt-id lokalt på sporet
      rec.productId    = d.product?.id || rec.productId;
      rec.forSale      = true;
      rec.saleFree     = !!isFree;
      rec.salePriceNok = isFree ? 0 : (parseFloat(priceNok) || 0);
      await DB.put('music', rec);

      App.closeModal();
      App.toast(isFree ? 'Sang lagt ut for gratis nedlasting! 🎁' : 'Sang lagt ut for salg! 🛒', 'success');
    } catch (e) {
      App.toast('Feil: ' + e.message, 'error', 6000);
    }
  }

  // ── Kjøp / gratis nedlasting ────────────────────────────────────────────
  async function buySong(productId) {
    const u = Auth.current();
    if (!u) { Router.go('/login'); return; }
    try {
      const r = await fetch('/api/marketplace?action=create-checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, buyerUsername: u.username }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Feil');
      if (d.free) {
        if (d.downloadToken) storeDlToken(d.productId || productId, d.downloadToken);
        App.toast('Gratis nedlasting klar! 🎁', 'success');
        return download(productId);
      }
      window.location.href = d.url;
    } catch (e) {
      App.toast('Kjøp feilet: ' + e.message, 'error');
    }
  }

  // Nedlastings-tokens lagres lokalt per produkt (utstedt ved kjøp/gratis).
  function storeDlToken(productId, token) {
    if (!productId || !token) return;
    try { const m = JSON.parse(localStorage.getItem('sc_dl_tokens') || '{}'); m[productId] = token; localStorage.setItem('sc_dl_tokens', JSON.stringify(m)); } catch (_) {}
  }
  function getDlToken(productId) {
    try { return JSON.parse(localStorage.getItem('sc_dl_tokens') || '{}')[productId] || null; } catch (_) { return null; }
  }

  async function download(productId) {
    const u = Auth.current();
    if (!u) { Router.go('/login'); return; }
    const token = getDlToken(productId);
    if (!token) { App.toast('Nedlastingslenken mangler eller er utløpt. For gratis sanger: trykk «Gratis nedlasting» på nytt.', 'error', 6000); return; }
    try {
      const r = await fetch(`/api/marketplace?action=download&productId=${encodeURIComponent(productId)}&token=${encodeURIComponent(token)}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Ingen tilgang');
      window.open(d.url, '_blank', 'noopener');
    } catch (e) {
      App.toast('Nedlasting feilet: ' + e.message, 'error');
    }
  }

  // Hent en selgers publiserte produkter (offentlig butikkvisning).
  // Går via server-endepunkt fordi products-tabellen har RLS lukket.
  async function listSellerProducts(username) {
    if (!isConfigured()) return [];
    try {
      const r = await fetch('/api/marketplace?action=store-products&username=' + encodeURIComponent(username));
      const d = await r.json();
      return r.ok ? (d.products || []) : [];
    } catch { return []; }
  }

  // «Mine kjøp» — for re-nedlasting.
  async function myPurchases(username) {
    if (!isConfigured()) return [];
    try {
      const r = await fetch('/api/marketplace?action=my-purchases&username=' + encodeURIComponent(username));
      const d = await r.json();
      return r.ok ? (d.purchases || []) : [];
    } catch { return []; }
  }

  // Etter retur fra Stripe Checkout (?song_purchase=...) — veksle sesjon mot
  // et nedlastings-token (server bekrefter at betalingen er fullført).
  async function handlePurchaseRedirect() {
    const p   = new URLSearchParams(window.location.search);
    const sid = p.get('song_purchase');
    if (!sid) return;
    const clean = window.location.pathname + window.location.hash;
    window.history.replaceState({}, '', clean);
    try {
      const r = await fetch('/api/marketplace?action=download-token&session_id=' + encodeURIComponent(sid));
      const d = await r.json();
      if (r.ok && d.token) {
        storeDlToken(d.productId, d.token);
        App.toast('Takk for kjøpet! 🎶 Last ned i «Mine kjøp».', 'success', 8000);
      } else {
        App.toast('Takk for kjøpet! Nedlastingen blir klar straks betalingen er bekreftet.', 'success', 8000);
      }
    } catch (_) {
      App.toast('Takk for kjøpet! 🎶', 'success', 6000);
    }
  }

  return {
    isConfigured, becomeSeller, sellerStatus,
    listSongFromModal, listSongForSale,
    buySong, download, listSellerProducts, myPurchases,
    handlePurchaseRedirect,
  };
})();
