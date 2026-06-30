-- 0002_profiles.sql — kryss-bruker profil-sync for SoundCore
--
-- Offentlige profildata bor her, slik at HVER besøkende kan laste en profil
-- (inkl. banner) — ikke bare nettleseren som lagde den. Appens innlogging er
-- klientside, så skriving er sikret med en PER-PROFIL hemmelighet via
-- SECURITY DEFINER-RPCer. Den offentlige anon-nøkkelen kan IKKE røre tabellen
-- direkte — kun gjennom funksjonene nederst.
--
-- Kjør hele fila i Supabase → SQL Editor (prosjektet qefdyxpyjwpohsmmmksf).

create table if not exists public.profiles (
  username    text primary key,
  data        jsonb       not null default '{}'::jsonb,
  sync_secret text        not null,
  updated_at  timestamptz not null default now()
);

-- Lås tabellen: RLS på, og ingen direkte rettigheter til anon/authenticated.
-- All tilgang går gjennom RPC-ene under (som kjører med eier-rettigheter).
alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;

-- ── Les én profil (kun offentlige data; sync_secret lekker aldri ut) ──────────
create or replace function public.get_profile(p_username text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select data from public.profiles where username = p_username;
$$;

-- ── List alle profiler (for Discover/utforsk) ────────────────────────────────
create or replace function public.list_profiles()
returns setof jsonb
language sql
stable
security definer
set search_path = public
as $$
  select data from public.profiles order by updated_at desc;
$$;

-- ── Opprett/oppdater en profil ───────────────────────────────────────────────
-- Første skriv setter hemmeligheten. Senere skriv MÅ oppgi samme hemmelighet,
-- ellers avvises de → ingen kan overskrive en annens profil.
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
