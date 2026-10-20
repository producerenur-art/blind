-- 0040_live_paid_access.sql — hvem som har KJØPT noe som gir rett til å spille live utan manuell godkjenning.
-- Fylles av api/stripe-webhook.js når eit kjøp av ekstra opplastingstimer er betalt (Pro-abonnement ligg alt i `subscriptions`).
-- api/live-apply.js sjekker begge tabellane og godkjenner forespørselen automatisk. Berre service-role les/skriv (RLS på, ingen policyar).
-- Kjør i Supabase → SQL Editor (prosjekt qefdyxpyjwpohsmmmksf). Trygt å køyre fleire gonger.
create table if not exists public.live_access (
  id                 bigint generated always as identity primary key,
  username           text        not null,
  source             text        not null default 'upload-hours',
  stripe_session_id  text        unique,
  created_at         timestamptz not null default now()
);
create index if not exists live_access_username_idx on public.live_access (username);
alter table public.live_access enable row level security;
revoke all on public.live_access from anon, authenticated;
