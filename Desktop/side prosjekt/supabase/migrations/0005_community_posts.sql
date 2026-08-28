-- 0005_community_posts.sql — kryss-bruker Community-vegg for SiriusFM
--
-- Problem: Community-innlegg låg berre i Gun (P2P-relay, localStorage:false), så
-- eit innlegg ein brukar delte var ikkje synleg for andre som kom inn på ei anna
-- eining. Denne tabellen gjer innlegga varige og synlege for ALLE — same mønster
-- som profiles (0002): appens innlogging er klientside, så skriving er sikra med
-- ein PER-FORFATTAR hemmelegheit via SECURITY DEFINER-RPCar. Anon-nøkkelen kan
-- IKKJE røra tabellen direkte — kun gjennom funksjonane nedst.
--
-- Kjør HEILE fila i Supabase → SQL Editor (same prosjekt som 0002).

create table if not exists public.community_posts (
  id          text primary key,
  author      text        not null,
  data        jsonb       not null default '{}'::jsonb,
  ts          bigint      not null default 0,
  sync_secret text        not null,
  created_at  timestamptz not null default now()
);

create index if not exists community_posts_ts_idx on public.community_posts (ts desc);

-- Lås tabellen: RLS på, ingen direkte rettar til anon/authenticated.
alter table public.community_posts enable row level security;
revoke all on public.community_posts from anon, authenticated;

-- ── List siste innlegg (klienten filtrerer sjølv med canSee) ─────────────────
create or replace function public.list_posts(p_limit int default 200)
returns setof jsonb
language sql
stable
security definer
set search_path = public
as $$
  select data from public.community_posts
  order by ts desc
  limit greatest(1, least(coalesce(p_limit, 200), 500));
$$;

-- ── Opprett/oppdater eit innlegg (upsert på id) ──────────────────────────────
-- Første skriv set hemmelegheita. Seinare skriv/redigering MÅ oppgje same
-- hemmelegheit, elles avvist → ingen kan overskriva ein annan sitt innlegg.
create or replace function public.upsert_post(p_id text, p_author text, p_secret text, p_data jsonb, p_ts bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare existing text;
begin
  select sync_secret into existing from public.community_posts where id = p_id;
  if existing is null then
    insert into public.community_posts(id, author, data, ts, sync_secret, created_at)
    values (p_id, p_author, coalesce(p_data, '{}'::jsonb), coalesce(p_ts, 0), p_secret, now());
  elsif existing = p_secret then
    update public.community_posts
       set data = coalesce(p_data, '{}'::jsonb), ts = coalesce(p_ts, ts)
     where id = p_id;
  else
    raise exception 'post_secret_mismatch';
  end if;
end;
$$;

-- ── Slett eit innlegg (kun forfattaren med rett hemmelegheit) ─────────────────
create or replace function public.delete_post(p_id text, p_secret text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare existing text;
begin
  select sync_secret into existing from public.community_posts where id = p_id;
  if existing is null then return; end if;
  if existing = p_secret then
    delete from public.community_posts where id = p_id;
  else
    raise exception 'post_secret_mismatch';
  end if;
end;
$$;

grant execute on function public.list_posts(int)                         to anon, authenticated;
grant execute on function public.upsert_post(text, text, text, jsonb, bigint) to anon, authenticated;
grant execute on function public.delete_post(text, text)                 to anon, authenticated;
