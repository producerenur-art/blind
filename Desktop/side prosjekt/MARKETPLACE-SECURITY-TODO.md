# Marketplace — MÅ gjøres før live (sikkerhet + profil-fane)

> Notat skrevet av Opus-økten ved siden av marketplace-arbeidet. Røres ikke av meg —
> her ligger to sikkerhetsfikser og en ferdig profil-fane klar til å droppe inn.
> Bygg-klossen `api/_hmac.js` er allerede på `main`.

---

## 🔴 1. To åpne sikkerhetshull (kritisk FØR marketplace kobles inn i live `index.html`)

Betaling er trygt (Stripe-webhook med signatur ✓, pris settes server-side ✓). Men to
endepunkter mangler tilgangskontroll fordi auth er Gun.js/klient-side. Lukk med HMAC-tokens
via `api/_hmac.js` (`sign(payload, ttl)` / `verify(token)`).

### a) `api/song-upload-url.js` — ingen autentisering
Hvem som helst kan mint-e en signert opplastings-URL til den private `songs`-bøtta.
```js
const { verify } = require('./_hmac');
// etter metode-sjekk:
const claim = verify(req.body?.token);
if (!claim || claim.purpose !== 'upload') return res.status(401).json({ error: 'Ugyldig opplastings-token' });
// scope sti til selgerens egen mappe (hindrer overskriving på tvers):
path = String(claim.username).replace(/[^\w.-]/g, '_') + '/' + path;
```
Token utstedes ved et selger-autentisert øyeblikk (f.eks. etter `connect-onboard`/`connect-status`):
`sign({ purpose:'upload', username }, 3600)`.

### b) `api/download-song.js` — autoriserer på et offentlig, klient-oppgitt brukernavn
Brukernavn er offentlige (`/u/<navn>`) → kjenner du en kjøpers navn, får du nedlastingen.
Bruk det allerede server-verifiserte øyeblikket i `verify-session.js` til å utstede en token:
```js
// verify-session.js — når Stripe-sesjonen er bekreftet betalt:
const { sign } = require('./_hmac');
const token = sign({ purpose:'download', productId, username }, 3600);   // returner til klienten

// download-song.js — bytt ut den uautentiserte username-sjekken:
const { verify } = require('./_hmac');
const c = verify(req.query.token);
if (!c || c.purpose !== 'download' || c.productId !== productId) return res.status(403).json({ error: 'Ugyldig nedlastings-token' });
```

### c) Sett serverhemmeligheten (én gang, i Vercel)
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"   # generer verdi
# Vercel → profilverse → Settings → Environment Variables → MARKETPLACE_TOKEN_SECRET (Production)
```

---

## 🛒 2. Profil «Butikk»-fane (trygg placeholder — klar til innliming)

`switchTab` er generisk (toggler på `data-tab`), så fanen virker uten JS-endring.
Legg knappen i fane-baren (etter Vegg-knappen) og panelet etter Vegg-panelet i `profile.js`:

```html
<!-- fane-bar, etter Vegg: -->
<button class="tab-btn" data-tab="butikk" onclick="Profile.switchTab('butikk')">${Icon('store')} Butikk</button>

<!-- nytt fane-panel: -->
<div class="profile-tab-content hidden" data-tab="butikk" id="tab-butikk">
  <div style="text-align:center;padding:2.75rem 1.25rem;color:var(--text2)">
    <div style="font-size:2.6rem;color:var(--accent,#7c3aed);margin-bottom:.6rem">${Icon('store')}</div>
    <h3 style="margin:0 0 .5rem;color:var(--text)">Butikk</h3>
    <p style="max-width:380px;margin:0 auto 1rem;font-size:.9rem;line-height:1.5">Snart kan du kjøpe og selge låter direkte fra profilen.</p>
    <span style="font-size:.72rem;font-weight:600;text-transform:uppercase;padding:.35rem .8rem;border-radius:999px;background:var(--surface);border:1px solid var(--border)">Kommer snart</span>
  </div>
</div>
```
Bytt ut placeholderen med ekte butikk-innhold (`renderStoreSection`) FØRST når 1a/1b/1c er på plass.

---

## ✅ Sjekkliste før marketplace kobles inn i live `index.html`
- [ ] `MARKETPLACE_TOKEN_SECRET` satt i Vercel (prod)
- [ ] `song-upload-url.js` krever + scoper på `verify()`-token
- [ ] `download-song.js` krever + verifiserer nedlastings-token
- [ ] `verify-session.js` utsteder nedlastings-token ved bekreftet betaling
- [ ] Testet: kjøp → token → nedlasting virker; uten gyldig token → 403
