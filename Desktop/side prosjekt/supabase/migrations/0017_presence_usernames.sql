-- 0017_presence_usernames.sql — kryss-nettlesar "hvem er online"-liste
--
-- Problem: js/onlineWidget.js (den offentlige "X online"-pillen i nav-baren,
-- synlig for ALLE besøkende — ikke bare admin) viser Gun-presence
-- (js/realtime.js SC.NS.presence), som deler NØYAKTIG samme svakhet som chat/
-- DM hadde: dei offentlege Gun-releane leverer ikkje pålitelig mellom to
-- ULIKE nettlesarar (sjå minne soundcore-gun-relay-browser-sync). To brukarar
-- som begge er innlogga kan altså ha vist feil/ufullstendig online-liste for
-- kvarandre heile tida.
--
-- Løysinga gjenbruker den allereie eksisterande, pålitelige heartbeaten frå
-- 0011_live_presence.sql (LivePresence, admin-only tal) i staden for å byggje
-- ein heilt ny ping-mekanisme: same tabell/rad per besøkande, men no med eit
-- valfritt brukarnamn festa når besøkande er innlogga. presence_count() (kun
-- tal, ingen PII) er UENDRA og framleis brukt av admin-pillen; denne nye
-- RPC-en (presence_online_usernames) eksponerer berre brukarnamn — som alt er
-- offentlege via /u/<username> — ikkje noko meir sensitivt.
--
-- Kjør HEILE fila i Supabase → SQL Editor (same prosjekt som 0011 m.fl.).

alter table public.live_presence add column if not exists username text;

create index if not exists live_presence_username_idx on public.live_presence (username) where username is not null;

-- Erstattar den gamle 1-parameters presence_ping(text): utan denne droppen
-- ville PostgreSQL sett den gamle (frå 0011) og denne nye 2-parameters
-- default-varianten som TVETYDIGE overlast for eit 1-argument-kall, og
-- avvist alle presence_ping-kall med ein "function is not unique"-feil.
drop function if exists public.presence_ping(text);

-- Heartbeat, no med valfritt brukarnamn. Bakoverkompatibel: p_username kan
-- utelatast (gjester), same GC-oppførsel som før.
create or replace function public.presence_ping(p_id text, p_username text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_id is null or length(p_id) < 8 or length(p_id) > 80 then
    return;
  end if;
  insert into public.live_presence (id, last_seen, username)
    values (p_id, now(), nullif(left(coalesce(p_username, ''), 40), ''))
    on conflict (id) do update set last_seen = now(), username = excluded.username;
  delete from public.live_presence where last_seen < now() - interval '5 minutes';
end;
$$;

-- Distinkte innlogga brukarnamn aktive siste 45 sekund. Same tidsvindauge som
-- presence_count(). Cap på 200 for å unngå eit uendeleg svar på ein stor site.
create or replace function public.presence_online_usernames()
returns setof text
language sql
stable
security definer
set search_path = public
as $$
  select distinct username
  from public.live_presence
  where username is not null
    and last_seen > now() - interval '45 seconds'
  limit 200;
$$;

grant execute on function public.presence_ping(text, text)     to anon, authenticated;
grant execute on function public.presence_online_usernames()   to anon, authenticated;
