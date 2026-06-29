# 10 — Studio, videoredigerer, markedsplass og betaling

Skapende verktøy + handel. Moduler: `studio.js`, `videoEditor.js`, `marketplace.js`,
`payment.js`. Backend/skjema: [[12-api-backend]].

## Blend Studio (`studio.js`, `Studio`, `#/studio`)

**Formål:** Canvas-basert bilde-/video-lag-kompositor med blandemodus, filtre og eksport.
- **Funksjoner:** legg til bilde-lag (multi) / video-lag; lagliste (z-rekkefølge) med
  thumbnail, synlighet, flytt opp/ned, slett; canvas (800×500, resizbart) med sanntids
  render-loop; **12 blandemodus** (normal, multiply, screen, overlay, soft/hard-light, dodge,
  burn, difference, exclusion, lighten, darken); per-lag-kontroller (navn, opasitet, X/Y,
  bredde/høyde, filtre brightness/contrast/saturation/hue); størrelse-presets (16:9/1:1/4:3/
  9:16); **eksport** PNG/JPEG/**WebM-video** (MediaRecorder, VP9, 30fps); **lagre til profil**
  (PNG → `mediaIds`) og **del til Community** (Supabase + `Community.shareMedia`).
- **Metoder:** `render/addImageLayer/addVideoLayer/handleImageFiles/handleVideoFile/
  setActiveLayer/updateLayerLabel/setLayerOpacity/setLayerProp/updateLayerFilter/setBlendMode/
  toggleLayerVisibility/moveLayer/deleteLayer/clearCanvas/setSize/applySize/exportImage/
  exportJPEG/toggleRecording/saveToProfile/shareToCommunity`.
- **Data:** lag-array in-memory (`{id,label,type,element,x,y,width,height,opacity,blendMode,
  visible,filters}`); Canvas 2D + MediaRecorder; valgfri Supabase-deling.

## Videoredigerer (`videoEditor.js`, `VideoEditor`, modal)

**Formål:** Bytt lydspor på egen video (ffmpeg.wasm), eksport MP4.
- **Funksjoner:** modal med video-velger + lyd-velger (egne opplastinger), render med
  framdrift%, resultat-spiller + lagre/last ned. Lazy-laster ffmpeg (~30MB, caches). FFmpeg:
  `-map 0:v:0 -map 1:a:0 -c:v libx264 -preset ultrafast -c:a aac -shortest -movflags +faststart`.
  Graceful fail hvis < 1 video eller < 1 lyd.
- **Metoder:** `open/render/saveToProfile/download`. ffmpeg via esm.sh/unpkg (v0.12.x).

## Markedsplass (`marketplace.js`, `Marketplace`)

**Formål:** Selg enkeltsanger (Bandcamp-stil) via Stripe Connect + Supabase privat lagring +
HMAC-signerte nedlastingstokens.
- **Funksjoner:** **bli selger** (Stripe Connect Express-onboarding), **legg ut sang for salg**
  (pris i NOK eller gratis; fil til privat `songs`-bøtte; produkt i `products`), **kjøp**
  (gratis → øyeblikkelig token; betalt → Stripe Checkout; retur `?song_purchase=session_id`
  → token), **last ned** (token validert server-side → signert URL), **mine kjøp**, **butikk-
  visning** (selgerens publiserte sanger). Status: Fase 1 (kreditering + faste kjøpslenker)
  virker uten nøkler; full backend krever Supabase/Stripe (se MARKETPLACE-SETUP).
- **Metoder:** `isConfigured/becomeSeller/sellerStatus/listSongForSale/listSongFromModal/
  buySong/download/listSellerProducts/myPurchases/handlePurchaseRedirect/storeDlToken/
  getDlToken`. localStorage: `sc_dl_tokens`. Alle kall → `api/marketplace?action=…`
  (se [[12-api-backend]]).

## Pro-abonnement (`payment.js`, `Payment`)

**Formål:** Pro-abonnement via Stripe Checkout + kvittering.
- **Funksjoner:** planvelger **månedlig 149 kr / kvartal 399 kr / halvår 749 kr / år 1290 kr**
  → Stripe Checkout; retur `?payment_success=session_id` → verifiser → oppdater `Auth` → vis
  **kvitteringsmodal** (ordre, fornyelsesdato, fordeler) + auto-bekreftelses-e-post.
  Pro-fordeler: miks opptil 20t (vs 3t), synlighet-toggle, Pro-badge, ubegrenset lagring,
  prioritert støtte.
- **Metoder:** `startCheckout(username, plan)`, `verifySession(sessionId)`,
  `handleSuccessRedirect()`, `showReceipt(planKey, sessionId, name)`. Data: `RECEIPT_PLANS`,
  `RECEIPT_BENEFITS`; `Auth`-felt `subscription/proPlan/stripeSession/stripeSubId/proActivatedAt`.
  Endepunkter: `api/create-checkout`, `api/verify-session` (+ `api/stripe-webhook`).

## Integrasjonspunkter

`Auth` (bruker/abonnement), `DB`/`SC_Storage` (media/filer), `Community` (del blend),
`Profile` (lagre media + butikk), `Email` (kvittering), `App`/`Router`/`Icon`, Stripe/Supabase.
