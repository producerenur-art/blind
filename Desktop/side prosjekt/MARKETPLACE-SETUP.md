# Markedsplass — Setup-sjekkliste (Supabase + Stripe Connect)

Dette må **du** sette opp før Fase 2/3 (backend + ekte betaling) kan testes.
Fase 1 (kreditering + kjøpslenker på egne sanger) virker allerede uten dette.

---

## 1. Supabase

1. Opprett prosjekt på <https://supabase.com> → velg region nær brukerne (eu).
2. **Project Settings → API** → kopier:
   - `Project URL`            → env `SUPABASE_URL`  **+** `js/config.js` (`SUPABASE_URL`)
   - `service_role` secret    → env `SUPABASE_SERVICE_ROLE_KEY`  ⚠️ kun server-side, aldri i frontend
   - `anon` public key        → `js/config.js` (`SUPABASE_ANON_KEY`) — trygg i frontend (brukes av `js/storage.js`)
3. **SQL Editor** → kjør hele `supabase/migrations/0001_marketplace.sql`.
   - Bekreft at tabellene `sellers`, `products`, `purchases` finnes (Table Editor).
   - **To bøtter** (Storage):
     - `soundcore-media` (**offentlig**) — delt media/forhåndsvisning på tvers av brukere (`js/storage.js`).
       Lag denne manuelt i Storage, eller la `SUPABASE_BUCKET` peke et annet sted.
     - `songs` (**privat**) — betalte nedlastinger; lages av migrasjonen. Nedlasting kun via
       signert URL gated på et betalt kjøp. Hold denne privat så ikke-betalte ikke får tak i filen.

---

## 2. Stripe Connect

1. <https://dashboard.stripe.com> → **Connect → Get started** → velg **Express**-kontoer.
2. **Branding** (Connect → Settings): logo + farger (vises i selger-onboarding).
3. Bekreft at `STRIPE_SECRET_KEY` allerede er satt i Vercel (brukes av dagens Pro-checkout).
   - For lokal testing: legg `STRIPE_SECRET_KEY` (test-modus `sk_test_…`) i lokal `.env`.
4. **Webhook** (Developers → Webhooks → Add endpoint):
   - URL: `https://<ditt-domene>/api/stripe-webhook`
   - Events: `checkout.session.completed`, `account.updated`,
     `charge.refunded`, `payment_intent.payment_failed`
   - Kopier **Signing secret** → env `STRIPE_WEBHOOK_SECRET`

---

## 3. Miljøvariabler (env)

Sett i **Vercel → Project → Settings → Environment Variables** (Production + Preview),
og i lokal `.env` for testing. `.env` skal alltid stå i `.gitignore`.

| Variabel                      | Hvor fra                       | Brukes til                          |
|-------------------------------|--------------------------------|-------------------------------------|
| `SUPABASE_URL`                | Supabase API-innstillinger     | DB- og Storage-kall (server)        |
| `SUPABASE_SERVICE_ROLE_KEY`   | Supabase API (service_role)    | Server-side DB/Storage (omgår RLS)  |
| `SUPABASE_BUCKET`             | Du velger (`soundcore-media`)  | Offentlig delt-media-bøtte (api/upload-url.js) |
| `STRIPE_SECRET_KEY`           | Stripe (allerede satt i Vercel)| Checkout, Connect, transfers        |
| `STRIPE_WEBHOOK_SECRET`       | Stripe Webhook signing secret  | Verifisere webhook-signatur         |
| `SITE_URL`                    | Ditt domene (allerede i bruk)  | success/return-URL-er               |
| `PLATFORM_FEE_PERCENT`        | Du bestemmer (f.eks. `10`)     | Plattformavgift på hvert salg       |

---

## 4. Hvordan jeg verifiserer (når nøklene er på plass)

- **Onboarding**: `POST /api/connect-onboard` → returnerer en Stripe onboarding-URL.
- **Status**: `GET /api/connect-status?username=…` → `charges_enabled: true` etter fullført onboarding.
- **Kjøp**: gratis sang → registreres direkte i `purchases`; betalt sang → Stripe Checkout
  i testmodus med kort `4242 4242 4242 4242`.
- **Webhook**: `stripe listen --forward-to localhost:3000/api/stripe-webhook` lokalt, eller
  sjekk Webhook-loggen i Stripe-dashbordet for `200 OK`.
- **Nedlasting**: `GET /api/download-song?productId=…` → signert URL kun for kjøper / gratis-sang.

---

## Status

**Kode ferdig (venter på nøkler):**
- [x] Fase 1 — kreditering + faste kjøpslenker på egne sanger (frontend)
- [x] Fase 2/3 (kode) — API: `connect-onboard`, `connect-status`, `song-upload-url`,
      `list-product`, `create-song-checkout`, `download-song`, `stripe-webhook`
- [x] Frontend `js/marketplace.js` + «Bli selger»/«Legg ut for salg» i sang-editoren
- [x] Fase 4 (kode) — offentlig butikkvisning på profil (`store-products`) + «Mine kjøp» (`my-purchases`)
- [x] `.env`-plassholdere lagt til (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SITE_URL, PLATFORM_FEE_PERCENT, SUPABASE_ANON_KEY)

**Du må gjøre (kun du har tilgang):**
- [ ] Supabase-prosjekt opprettet + `0001_marketplace.sql` kjørt + bøtter (`soundcore-media` offentlig, `songs` privat)
- [ ] Stripe Connect aktivert + webhook satt opp → `STRIPE_WEBHOOK_SECRET`
- [ ] Env-variabler fylt inn (Vercel + lokal `.env`) + `SUPABASE_URL/ANON_KEY` i `js/config.js`

**Gjenstår etter at nøklene er på plass:**
- [ ] Verifisere flyt ende-til-ende (onboarding → selg → kjøp → nedlasting)
- [ ] (valgfritt) «Mine salg»-dashbord med salgsstatistikk/utbetalingsoversikt
