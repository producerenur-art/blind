-- 0006_community_comments.sql — kryss-bruker kommentarar for SiriusFM
--
-- Problem: kommentarar (og svar) på Community-/Feed-innlegg låg BERRE i Gun
-- (P2P-relay, localStorage:false). Gun-relayet leverer ikkje pålitelig på tvers
-- av einingar/nettlesarar, så ein kommentar ADMIN skreiv var ikkje synleg for
-- Aon i ein annan nettlesar. Denne tabellen gjer kommentarane varige og synlege
-- for ALLE — nøyaktig same mønster som community_posts (0005) og profiles (0002):
-- appens innlogging er klientside, så skriving er sikra med ein PER-FORFATTAR
-- hemmelegheit via SECURITY DEFINER-RPCar. Anon-nøkkelen kan IKKJE røra tabellen
-- direkte — kun gjennom funksjonane nedst.
--
-- target_key identifiserer tråden: 'post:<id>' (vegg-innlegg) · 'profile:<user>'
-- (gjestebok) · 'c:<id>' (svar på ein kommentar) — same nøklar som js/social.js.
--
-- Kjør HEILE fila i Supabase → SQL Editor (same prosjekt som 0002/0005).

create table if not exists public.community_comments (
  id          text primary key,
  target_key  text        not null,
  author      text        not null,
  data        jsonb       not null default '{}'::jsonb,
  ts          bigint      not null default 0,
  sync_secret text        not null,
  created_at  timestamptz not null default now()
);

create index if not exists community_comments_ts_idx     on public.community_comments (ts desc);
create index if not exists community_comments_target_idx on public.community_comments (target_key);

-- Lås tabellen: RLS på, ingen direkte rettar til anon/authenticated.
alter table public.community_comments enable row level security;
revoke all on public.community_comments from anon, authenticated;

-- ── List siste kommentarar (klienten bøttar sjølv på _target) ────────────────
-- Returnerer data-objektet påført _target (tråd) og id, så klienten kan sortera
-- inn i rett kommentar-liste utan ekstra oppslag.
create or replace function public.list_comments(p_limit int default 400)
returns setof jsonb
language sql
stable
security definer
set search_path = public
as $$
  select data || jsonb_build_object('_target', target_key, 'id', id)
  from public.community_comments
  order by ts desc
  limit greatest(1, least(coalesce(p_limit, 400), 1000));
$$;

-- ── Opprett/oppdater ein kommentar (upsert på id) ────────────────────────────
-- Første skriv set hemmelegheita. Seinare skriv/redigering MÅ oppgje same
-- hemmelegheit, elles avvist → ingen kan overskriva ein annan sin kommentar.
create or replace function public.upsert_comment(p_id text, p_target text, p_author text, p_secret text, p_data jsonb, p_ts bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare existing text;
begin
  select sync_secret into existing from public.community_comments where id = p_id;
  if existing is null then
    insert into public.community_comments(id, target_key, author, data, ts, sync_secret, created_at)
    values (p_id, p_target, p_author, coalesce(p_data, '{}'::jsonb), coalesce(p_ts, 0), p_secret, now());
  elsif existing = p_secret then
    update public.community_comments
       set data = coalesce(p_data, '{}'::jsonb), ts = coalesce(p_ts, ts)
     where id = p_id;
  else
    raise exception 'comment_secret_mismatch';
  end if;
end;
$$;

-- ── Slett ein kommentar ──────────────────────────────────────────────────────
-- Forfattaren kan alltid slette sin eigen (rett hemmelegheit). Vegg-/innlegg-
-- eigaren kan moderere: oppgjev eigar-hemmelegheita + forventa target_key, så
-- ein eigar kan fjerne kommentarar i EIGA tråd utan å kjenne forfattaren sin.
create or replace function public.delete_comment(p_id text, p_secret text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare existing text;
begin
  select sync_secret into existing from public.community_comments where id = p_id;
  if existing is null then return; end if;
  if existing = p_secret then
    delete from public.community_comments where id = p_id;
  else
    raise exception 'comment_secret_mismatch';
  end if;
end;
$$;

grant execute on function public.list_comments(int)                                    to anon, authenticated;
grant execute on function public.upsert_comment(text, text, text, text, jsonb, bigint) to anon, authenticated;
grant execute on function public.delete_comment(text, text)                            to anon, authenticated;
