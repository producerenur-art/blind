-- 0024_visit_log.sql — historisk besøkstelling (i motsetning til 0011 live_presence,
-- som KUN holder de siste 45 sekundene og ikke husker noe fra før). Brukarønske
-- 13.09.2026: "har det vært noe trafikk på siriusfm i det hele tatt" — svaret var
-- nei, ingenting ble lagret. Denne tabellen retter det.
--
-- Én rad per unik økt/fane (samme sc_visitor_id-id som js/livePresence.js allerede
-- lager til presence_ping) — satt inn KUN FØRSTE gang den økta logger eit besøk
-- (`on conflict do nothing`), så refresh av same fane ikke blåser opp tallet.
--
-- Samme sikkerhetsmodell som 0011: anon/publishable key, ingen Supabase-auth-sesjon,
-- RPC-ene er SECURITY DEFINER og tabellen er låst med RLS — ingen direkte tilgang,
-- og radene inneholder ingen PII (kun ein tilfeldig sesjons-id + tidspunkt).

create table if not exists public.visit_log (
  id         text primary key,
  created_at timestamptz not null default now()
);
create index if not exists visit_log_created_at_idx on public.visit_log (created_at);

alter table public.visit_log enable row level security;

-- Logg eit besøk: kalles ÉN gong per økt (js/livePresence.js sitt init), ikke på
-- kvart heartbeat-ping. on conflict do nothing → idempotent, trygg å kalle fleire
-- gonger med same id.
create or replace function public.log_visit(p_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_id is null or length(p_id) < 8 or length(p_id) > 80 then
    return;
  end if;
  insert into public.visit_log (id) values (p_id)
    on conflict (id) do nothing;
end;
$$;

-- Totalt antall unike besøk sidan lansering (ingen PII i svaret, berre eit tal —
-- same tryggleiksnivå som presence_count i 0011).
create or replace function public.visit_count()
returns bigint
language sql
security definer
set search_path = public
as $$
  select count(*)::bigint from public.visit_log;
$$;

-- Antall unike besøk siste N dagar — til enkel trend om ønskelig seinare.
create or replace function public.visit_count_since(p_days int)
returns bigint
language sql
security definer
set search_path = public
as $$
  select count(*)::bigint from public.visit_log
   where created_at > now() - (greatest(p_days, 0) || ' days')::interval;
$$;

grant execute on function public.log_visit(text)        to anon, authenticated;
grant execute on function public.visit_count()          to anon, authenticated;
grant execute on function public.visit_count_since(int) to anon, authenticated;
