-- 0013_subscriptions.sql — server-side sannhetskilde for Pro-abonnement.
--
-- Bakgrunn: Pro-status (`subscription:'pro'`, `stripeSubId`, ...) lagres i dag KUN i
-- Gun.js-brukerobjektet client-side. /api/stripe-webhook.js fikk aldri
-- customer.subscription.updated/deleted eller invoice.payment_failed-håndtering fordi det
-- ikke fantes noe sted server-side å slå opp «hvilken bruker eier dette abonnementet» —
-- Gun-grafen er ikke spørrbar fra en stateless serverless-funksjon uten brukerens nøkler.
--
-- Denne tabellen er IKKE den nye sannheten for om noen HAR Pro (det er fortsatt Gun.js —
-- klienten låser opp Pro rett etter vellykket checkout, som før). Den er sannheten for
-- «har Stripe bekreftet at abonnementet fortsatt er aktivt», slik at klienten kan
-- avstemme og nedgradere lokalt hvis et abonnement har gått ut/blitt kansellert/feilet
-- utenfor appen (Stripe dashboard, utløpt kort, osv.) — se /api/subscription-status.js.
--
-- Sikkerhetsmodell: samme mønster som magazine_cache — RLS på, ingen policyer, kun
-- SUPABASE_SERVICE_ROLE_KEY (server) leser/skriver. username+plan er ikke sensitivt,
-- men vi holder skrivetilgang låst uansett.

create table if not exists public.subscriptions (
  stripe_subscription_id text primary key,
  username                text        not null,
  stripe_customer_id      text,
  plan                    text,
  status                  text        not null default 'active', -- active | past_due | canceled
  current_period_end      timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create index if not exists subscriptions_username_idx on public.subscriptions (username);
create index if not exists subscriptions_customer_idx on public.subscriptions (stripe_customer_id);

alter table public.subscriptions enable row level security;

-- Ingen policyer = ingen tilgang for anon/authenticated. Service role går forbi RLS.
