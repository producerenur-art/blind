# 12 — API (Vercel serverless) og backend-skjema

Alle endepunkter i `api/`. Hemmeligheter nevnes **kun ved navn** (aldri verdier).
**Vercel Hobby = maks 12 funksjoner** → markedsplass-spesifikke funksjoner er konsolidert i
`api/marketplace.js` (`?action=`) og/eller holdt ute via `.vercelignore`.

## Aktive endepunkter

### `POST /api/chat` — Claude-proxy
Holder Anthropic-nøkkel server-side. Body: `system`, `messages` `[{role,content}]`,
`max_tokens?` (cap 1024), `model?` (kun `claude-haiku-4-5-20251001` tillatt). Retur:
`{text}` eller `{error}`. Env: `ANTHROPIC_API_KEY`. Brukt av [[09-ai-voice-bughelp]] + [[05-radio]].

### `POST /api/send-email` — Resend
`type`: `activation | reset | friend_request | purchase | bug_report`. Felt varierer per type
(`toEmail/toName/token/fromName/fromUsername/inboxUrl/plan/orderRef/errorMessage/errorStack/
source/line/route/username/userAgent…`). Retur `{success,id}` eller `{error}`. Env:
`RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `BUG_REPORT_EMAIL`, `SITE_URL`. Bruker `api/_plans.js`
for kvittering. Free-tier sender kun til kontoeier til domene er verifisert.

### `POST /api/create-checkout` — Stripe abonnement
Body: `username`, `plan` (`monthly|quarter|half|year`, default monthly). Retur `{url}`.
Planpriser (NOK): 149 / 133 / 125 / 108 per mnd (faktureres 1/3/6/12 mnd). Env:
`STRIPE_SECRET_KEY`, `SITE_URL`. Brukt av [[10-studio-video-marked-betaling]].

### `GET /api/verify-session?session_id=…` — Stripe-verifisering
Retur `{success, username, plan, subscriptionId, customerEmail}` eller `{error}`. Env:
`STRIPE_SECRET_KEY`.

### `POST /api/stripe-webhook` — Stripe-hendelser
Håndterer `checkout.session.completed`, `account.updated`, `charge.refunded`,
`payment_intent.payment_failed` → oppdaterer abonnement/kjøp i Supabase. Env:
`STRIPE_WEBHOOK_SECRET`, `STRIPE_SECRET_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

### `POST|GET /api/marketplace?action=…` — samlet markedsplass
Actions: `connect-onboard` (POST → `{url}`), `connect-status` (GET `?username` →
`{seller,onboarding_complete,charges_enabled,payouts_enabled}`), `upload-token` (POST →
`{token}`), `song-upload-url` (POST → signert Supabase-URL), `list-product` (POST → `{product}`),
`create-checkout` (POST → `{free,downloadToken?}` eller `{url}`), `download-token` (GET
`?session_id` → `{token,productId}`), `download` (POST → signert nedlastings-URL),
`store-products` (GET → `{products}`), `my-purchases` (GET `?username` → `{purchases}`).
Env: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`,
`MARKETPLACE_TOKEN_SECRET`, `MARKETPLACE_ENABLED`, `PLATFORM_FEE_PERCENT`.

### `POST /api/upload-url` — Supabase signert opplasting
Body: `path` (saneres mot traversal), `bucket?` (`soundcore-media` offentlig | `songs` privat).
Retur `{token,path,signedUrl,publicUrl?,bucket}`. Env: `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_BUCKET`. Brukt av media-opplasting ([[03-profil]],
[[10-studio-video-marked-betaling]]).

### `GET /api/youtube?q=…` — YouTube-søk-proxy
Søk uten å eksponere nøkkel. Retur `{items:[{id,title,channel,thumb}]}` (maks 12, 1t CDN-cache).
Env: `YOUTUBE_API_KEY`. Brukt av Ambient Mann-søk ([[06-discover]]).

## Hjelpere (ikke endepunkter)

- **`api/_hmac.js`:** `sign(payload, ttl)` / `verify(token)` — HMAC-SHA256-tokens
  (`base64url(JSON).base64url(HMAC)`) for markedsplass opp-/nedlasting. Env:
  `MARKETPLACE_TOKEN_SECRET`.
- **`api/_plans.js`:** `PLANS` (monthly/quarter/half/year m/beløp+intervall+etikett),
  `PRO_BENEFITS`, `getPlan/fmtKr/fmtDate/nextRenewal`. Brukt av send-email + create-checkout.

## Supabase-skjema (markedsplass)

- **Tabeller:** `sellers` (`username, stripe_account_id, onboarding_complete, charges_enabled`),
  `products` (`id, seller_username, title, artist, price_ore, is_free, audio_path, cover_path,
  …`), `purchases` (`id, product_id, buyer_username, amount_ore, status`
  `pending|paid|refunded|failed`). Migrasjon: `supabase/migrations/0001_marketplace.sql`.
- **Bøtter:** `soundcore-media` (offentlig), `songs` (privat — nedlasting kun via signert URL
  gated på betalt kjøp).

## Sikkerhetsprinsipper

API-nøkler (Anthropic/Stripe/YouTube/Resend/Supabase service_role) **kun server-side**;
HMAC-tokens er tidsbegrensede; venne-only-poster bærer allow-liste-snapshot; profilsynlighet
sjekkes per visning. Detaljer: [[00-arkitektur]].
