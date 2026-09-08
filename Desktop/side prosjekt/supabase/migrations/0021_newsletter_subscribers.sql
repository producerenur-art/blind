-- 0021_newsletter_subscribers.sql — nyhetsbrev for gjester (uten konto).
--
-- HVORFOR: den ukentlige "What's coming up on SiriusFM"-påminnelsen
-- (api/live-reminder.js, fredager 16:00) sendes i dag KUN til aktiverte kontoer
-- (public.accounts). Gjester uten konto har ingen måte å melde seg på
-- sendeplan-/festival-/utgivelses-oppdateringer. Denne tabellen er listen over
-- gjester (og innloggede som ikke vil bruke kontoens egen e-post) som har meldt
-- seg på via "Updates"-widgeten i #dock.
--
-- unsubscribed_at speiler mønsteret fra accounts.marketing_opt_out (migrasjon 0004):
--   NULL        = påmeldt, skal ha den ukentlige e-posten
--   satt (dato) = meldt av via #/unsubscribe/<email> (samme side som konto-avmelding)
--
-- Berørte filer:
--   api/auth.js          — action=subscribe (skriver nye rader), unsubscribe/
--                           resubscribe (setter/nullstiller unsubscribed_at)
--   api/live-reminder.js — leser tabellen i tillegg til accounts ved utsending
--   api/send-email.js    — isUnsubscribed() sjekker unsubscribed_at før hver sending
--
-- IDEMPOTENT: trygt å kjøre flere ganger. Kjør i Supabase SQL-editoren (samme
-- måte som de forrige migrasjonene — org «Enur's Org», prosjekt qefdyxpyjwpohsmmmksf).

create table if not exists public.newsletter_subscribers (
  email           text primary key,
  created_at      timestamptz not null default now(),
  unsubscribed_at timestamptz
);
