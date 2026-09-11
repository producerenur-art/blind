-- 0023_radio247_subscribers.sql — egen varslingsliste for "🌘 24-Hour Cycle".
--
-- HVORFOR: brukeren ba eksplisitt om en EGEN varsling for døgnradio-kanalen,
-- atskilt fra den ukentlige "What's coming up"-nyhetsbrevlisten
-- (public.newsletter_subscribers, migrasjon 0021) — samme mønster, egen tabell,
-- slik at noen kan melde seg på det ene uten det andre.
--
-- unsubscribed_at speiler samme mønster som newsletter_subscribers:
--   NULL        = påmeldt, skal ha den daglige døgnkurve-e-posten
--   satt (dato) = meldt av
--
-- Berørte filer:
--   api/auth.js            — action=radio247subscribe (skriver nye rader)
--   api/radio247-digest.js — daglig cron, leser tabellen ved utsending
--   api/send-email.js      — type:'radio247_digest'
--
-- IDEMPOTENT: trygt å kjøre flere ganger. Kjør i Supabase SQL-editoren
-- (org «Enur's Org», prosjekt qefdyxpyjwpohsmmmksf).

create table if not exists public.radio247_subscribers (
  email           text primary key,
  created_at      timestamptz not null default now(),
  unsubscribed_at timestamptz
);
