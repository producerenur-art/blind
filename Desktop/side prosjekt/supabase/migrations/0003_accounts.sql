-- 0003_accounts.sql — Server-side kontolagring (kjernen i innlogging).
--
-- HVORFOR: tidligere lå alle brukere KUN i nettleserens localStorage (pv_users).
-- Det gjorde at samme e-post kunne brukes om og om igjen, kontoer «forsvant» mellom
-- enheter/nettlesere, og «glemt passord» fant aldri kontoen. Denne tabellen er nå
-- den ENESTE sannhetskilden for kontoer: global unik e-post, virker på tvers av
-- enheter, og lar tilbakestilling/aktivering slå opp kontoen ekte.
--
-- SIKKERHET: Row Level Security er PÅ uten noen policy → verken anon- eller
-- authenticated-rollen (dvs. den offentlige nøkkelen i nettleseren) kan lese eller
-- skrive noe her. KUN service-role-nøkkelen (brukt server-side i api/auth.js)
-- omgår RLS. Passord-hasher og tokens forlater derfor aldri serveren.
--
-- Kjør denne i Supabase SQL-editoren (samme måte som 0002_profiles.sql).

create table if not exists public.accounts (
  username          text primary key,
  email             text not null,
  password_hash     text not null,           -- scrypt: "salt:hash" (hex), aldri klartekst
  display_name      text,
  role              text    default 'lytter',
  activated         boolean default false,
  activation_token  text,
  reset_token       text,
  reset_expiry      bigint,                   -- epoch ms
  created_at        bigint  default (extract(epoch from now()) * 1000)::bigint
);

-- Global, case-insensitiv unikhet på e-post → samme adresse kan ikke registreres to ganger.
create unique index if not exists accounts_email_unique
  on public.accounts (lower(email));

-- Raske oppslag på tokens (aktivering / tilbakestilling).
create index if not exists accounts_activation_token_idx on public.accounts (activation_token);
create index if not exists accounts_reset_token_idx       on public.accounts (reset_token);

-- Lås tabellen: RLS på, ingen policy. Service-role (api/auth.js) omgår dette;
-- alle andre (inkl. den offentlige anon-nøkkelen i frontend) får null tilgang.
alter table public.accounts enable row level security;
