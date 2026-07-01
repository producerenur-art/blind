-- 0004_marketing_opt_out.sql — reklame-avmelding (marketing opt-out) server-side.
--
-- HVORFOR: «Avmeld reklame»-knappen i promo-e-posten (api/send-email.js → promoHtml)
-- lenker til #/unsubscribe/<email>. Avmeldingen lagres lokalt i nettleseren
-- (localStorage pv_marketing_optout), men selve UTSENDINGEN skjer server-side, så
-- serveren må også vite hvem som har meldt seg av. Denne kolonnen er sannhetskilden:
--   • api/auth.js  (action=unsubscribe / resubscribe) setter den (via service-role)
--   • api/send-email.js  hopper over å sende reklame når den er true
--
-- IDEMPOTENT: «add column if not exists» → trygt å kjøre uansett om 0003 alt er kjørt.
-- Kjør i Supabase SQL-editoren (samme måte som 0003_accounts.sql).
--
-- FALLBACK: før denne kjøres, degraderer alt pent — api/auth.js svarer «notProvisioned»
-- og api/send-email.js fail-open (sender som før). Avmelding virker da lokalt per enhet.

alter table public.accounts
  add column if not exists marketing_opt_out boolean not null default false;
