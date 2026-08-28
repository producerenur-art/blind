-- ============================================================================
-- KJØR_I_SUPABASE.sql — fikser banner-bytte + profil-sync + innlogging på tvers
-- av enheter/innlogginger.
--
-- HVA DETTE LØSER:
--   Profilendringer (banner, bio, tema …) ble bare lagret i nettleseren fordi
--   Supabase-databasen manglet funksjonene som synkroniserer profilen til skyen.
--   Derfor virket «Bytt forsidebilde» lokalt, men vistes ikke på andre
--   innlogginger/enheter. Denne fila legger inn det som mangler.
--
--   Bekreftet mot databasen qefdyxpyjwpohsmmmksf:
--     • profiles-RPC-ene (upsert_profile/get_profile/list_profiles) = MANGLET
--     • accounts-tabellen (server-innlogging)                       = MANGLET
--
-- SLIK KJØRER DU:
--   1) Supabase → prosjektet qefdyxpyjwpohsmmmksf → «SQL Editor»
--   2) Lim inn HELE denne fila
--   3) Trykk «Run»
--
-- Trygt å kjøre flere ganger (alt er «if not exists» / «create or replace»).
-- ============================================================================


-- ── 0002: Profil-sync (DETTE fikser banner-bytte på tvers av innlogginger) ───
create table if not exists public.profiles (
  username    text primary key,
  data        jsonb       not null default '{}'::jsonb,
  sync_secret text        not null,
  updated_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;

create or replace function public.get_profile(p_username text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select data from public.profiles where username = p_username;
$$;

create or replace function public.list_profiles()
returns setof jsonb
language sql
stable
security definer
set search_path = public
as $$
  select data from public.profiles order by updated_at desc;
$$;

create or replace function public.upsert_profile(p_username text, p_secret text, p_data jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare existing text;
begin
  select sync_secret into existing from public.profiles where username = p_username;
  if existing is null then
    insert into public.profiles(username, data, sync_secret, updated_at)
    values (p_username, coalesce(p_data, '{}'::jsonb), p_secret, now());
  elsif existing = p_secret then
    update public.profiles
       set data = coalesce(p_data, '{}'::jsonb), updated_at = now()
     where username = p_username;
  else
    raise exception 'profile_secret_mismatch';
  end if;
end;
$$;

grant execute on function public.get_profile(text)                 to anon, authenticated;
grant execute on function public.list_profiles()                   to anon, authenticated;
grant execute on function public.upsert_profile(text, text, jsonb) to anon, authenticated;


-- ── 0003: Server-kontoer (innlogging på tvers av enheter) ────────────────────
create table if not exists public.accounts (
  username          text primary key,
  email             text not null,
  password_hash     text not null,
  display_name      text,
  role              text    default 'lytter',
  activated         boolean default false,
  activation_token  text,
  reset_token       text,
  reset_expiry      bigint,
  created_at        bigint  default (extract(epoch from now()) * 1000)::bigint
);

create unique index if not exists accounts_email_unique
  on public.accounts (lower(email));
create index if not exists accounts_activation_token_idx on public.accounts (activation_token);
create index if not exists accounts_reset_token_idx       on public.accounts (reset_token);

alter table public.accounts enable row level security;


-- ── 0004: Reklame-avmelding (kolonne på accounts) ────────────────────────────
alter table public.accounts
  add column if not exists marketing_opt_out boolean not null default false;
