-- 0008_community_reactions.sql — kryss-bruker smiley-reaksjonar for SiriusFM
--
-- Problem: reaksjonane (👍 👎 😠 😍 😮 🤩) på innlegg OG kommentarar låg BERRE i
-- Gun (P2P-relay, localStorage:false). Gun-relayet leverer ikkje pålitelig på
-- tvers av einingar/nettlesarar, så ein smiley Aon trykte på iPhone var ikkje
-- synleg for ein annan brukar på Android. Denne tabellen gjer reaksjonane varige
-- og synlege for ALLE — nøyaktig same mønster som community_comments (0006):
-- appens innlogging er klientside, så skriving er sikra med ein PER-BRUKAR
-- hemmelegheit via SECURITY DEFINER-RPCar. Anon-nøkkelen kan IKKJE røra tabellen
-- direkte — kun gjennom funksjonane nedst.
--
-- Éin reaksjon per (target_key, username). target_key identifiserer målet:
-- 'post:<id>' (innlegg) · 'profile:<user>' (gjestebok) · 'c:<id>' (kommentar) —
-- same nøklar som js/social.js. val er reaksjonskoden lagra som tekst
-- ('1' | '-1' | 'angry' | 'love' | 'oops' | 'wow'); klienten castar '1'/'-1'
-- attende til tal ved innlesing.
--
-- Kjør HEILE fila i Supabase → SQL Editor (same prosjekt som 0002/0005/0006).

create table if not exists public.community_reactions (
  target_key  text        not null,
  username    text        not null,
  val         text        not null,
  ts          bigint      not null default 0,
  sync_secret text        not null,
  created_at  timestamptz not null default now(),
  primary key (target_key, username)
);

create index if not exists community_reactions_ts_idx     on public.community_reactions (ts desc);
create index if not exists community_reactions_target_idx on public.community_reactions (target_key);

-- Lås tabellen: RLS på, ingen direkte rettar til anon/authenticated.
alter table public.community_reactions enable row level security;
revoke all on public.community_reactions from anon, authenticated;

-- ── List siste reaksjonar (klienten bøttar sjølv på _target) ─────────────────
-- Returnerer eit objekt per reaksjon med _target (mål), username, val og ts.
create or replace function public.list_reactions(p_limit int default 2000)
returns setof jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
           '_target',  target_key,
           'username', username,
           'val',      val,
           'ts',       ts)
  from public.community_reactions
  order by ts desc
  limit greatest(1, least(coalesce(p_limit, 2000), 5000));
$$;

-- ── Sett/oppdater/fjern reaksjonen din (upsert på (target_key, username)) ─────
-- Første skriv set hemmelegheita. Seinare skriv MÅ oppgje same hemmelegheit,
-- elles avvist → ingen kan overskriva ein annan sin reaksjon. p_val = '' (tom)
-- tyder «fjerna reaksjon» → rada slettast (etter hemmeleg-sjekk).
create or replace function public.upsert_reaction(p_target text, p_username text, p_secret text, p_val text, p_ts bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare existing text;
begin
  select sync_secret into existing
    from public.community_reactions
   where target_key = p_target and username = p_username;

  -- Fjern reaksjon (val tom): berre eigaren med rett hemmelegheit.
  if coalesce(p_val, '') = '' then
    if existing is null then return; end if;
    if existing = p_secret then
      delete from public.community_reactions
       where target_key = p_target and username = p_username;
    else
      raise exception 'reaction_secret_mismatch';
    end if;
    return;
  end if;

  if existing is null then
    insert into public.community_reactions(target_key, username, val, ts, sync_secret, created_at)
    values (p_target, p_username, p_val, coalesce(p_ts, 0), p_secret, now());
  elsif existing = p_secret then
    update public.community_reactions
       set val = p_val, ts = coalesce(p_ts, ts)
     where target_key = p_target and username = p_username;
  else
    raise exception 'reaction_secret_mismatch';
  end if;
end;
$$;

grant execute on function public.list_reactions(int)                                  to anon, authenticated;
grant execute on function public.upsert_reaction(text, text, text, text, bigint)      to anon, authenticated;
