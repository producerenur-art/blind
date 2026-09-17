-- 0027_notify_preferences.sql — grunnlag for tre nye varslingsting brukeren ba om:
--   1) newsletter_subscribers får velge HVILKEN ukedag de vil ha det ukentlige
--      nyhetsbrevet på (i stedet for at alle får det samme fredag) — digest_day,
--      0=søndag..6=lørdag, samme indeksering som osloClock()/DAY_NAMES i
--      api/send-email.js. Default 5 (fredag) = uendret oppførsel for alle som
--      allerede har meldt seg på før denne migrasjonen.
--   2) live_broadcast_status (0022_live_broadcast.sql) får last_notified_at, en
--      cooldown-vakt slik at api/live-start-notify.js ikke sender "vi er live nå"
--      på nytt hvis eieren stopper/restarter sendingen flere ganger på kort tid.
--   3) festival_notify_state — én rad som husker hvilke festivalnavn (fra
--      FESTIVALS i js/world.js) abonnentene allerede har fått vite om, slik at
--      kun NYE festivaloppføringer trigger en egen e-post, ikke hele lista på
--      hver kjøring.
--
-- Berørte filer:
--   api/auth.js            — subscribe() leser/lagrer digest_day
--   js/newsletter.js + index.html — dagvelger i "Updates"-widgeten
--   api/live-reminder.js   — daglig cron nå, filtrerer newsletter_subscribers på
--                             digest_day == dagens ukedag (Oslo-tid); sjekker også
--                             festival_notify_state for nye festivaler
--   api/live-start-notify.js — ny endpoint, kalt fra js/livemix.js sin bcGo(),
--                             cooldown via last_notified_at
--
-- IDEMPOTENT: trygt å kjøre flere ganger. Kjør i Supabase → SQL Editor
-- (samme prosjekt som de forrige migrasjonene, qefdyxpyjwpohsmmmksf).

alter table public.newsletter_subscribers
  add column if not exists digest_day smallint not null default 5;

alter table public.newsletter_subscribers
  drop constraint if exists newsletter_subscribers_digest_day_check;
alter table public.newsletter_subscribers
  add constraint newsletter_subscribers_digest_day_check check (digest_day between 0 and 6);

alter table public.live_broadcast_status
  add column if not exists last_notified_at timestamptz;

create table if not exists public.festival_notify_state (
  id             int primary key default 1,
  notified_names text[] not null default '{}',
  updated_at     timestamptz not null default now(),
  constraint festival_notify_state_singleton check (id = 1)
);
insert into public.festival_notify_state (id) values (1) on conflict (id) do nothing;

alter table public.festival_notify_state enable row level security;
-- Med vilje INGEN policy/grants — samme mønster som newsletter_subscribers: kun
-- service-role-nøkkelen (brukt server-side i api/*.js) når denne tabellen.
revoke all on public.festival_notify_state from anon, authenticated;
