-- 0015_radio_chat.sql — kryss-nettlesar synk for radio-livechatten (js/chat.js)
--
-- Problem: js/chat.js sin livechat går BERRE via Gun.js (public relays,
-- localStorage:false). Grundig testa 2026-06-28 (sjå minne
-- soundcore-gun-relay-browser-sync): sanntids-synk mellom to ULIKE
-- nettlesarar over dei offentlege releane feiler — WS-handtrykket opnar,
-- men releen lèt att sockeen før noko synkar. Same rotårsak som gjorde at
-- Community-innlegg/kommentarar/reaksjonar fekk ein Supabase-spegling
-- (0005/0006/0008) — chatten fekk aldri den same fiksen. Denne migrasjonen
-- gjer nettopp det, for radio-chatten spesifikt.
--
-- Chatten er open/anonym (gjester kan og skrive med sjølvvalt kallenamn,
-- ingen ekte innlogging krevst) — difor treng ho INGEN eigarskaps-hemmelegheit
-- slik post/kommentar/reaksjon-tabellane har. Kven som helst med anon-nøkkelen
-- kan liste og skrive, akkurat som i Gun i dag. Innhaldet er heller ikkje
-- sensitivt (offentleg livechat), så det er ikkje eit personvernproblem.
--
-- Kjør HEILE fila i Supabase → SQL Editor (same prosjekt som 0002/0005/0006/0008).

create table if not exists public.radio_chat_messages (
  id         text primary key,
  nick       text        not null,
  color      text,
  text       text        not null,
  ts         bigint      not null default 0,
  type       text        not null default 'msg',
  created_at timestamptz not null default now()
);

create index if not exists radio_chat_ts_idx on public.radio_chat_messages (ts desc);

alter table public.radio_chat_messages enable row level security;
revoke all on public.radio_chat_messages from anon, authenticated;

-- ── List siste meldingar ─────────────────────────────────────────────────
create or replace function public.list_radio_chat(p_limit int default 120)
returns setof jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object('id', id, 'nick', nick, 'color', color, 'text', text, 'ts', ts, 'type', type)
  from public.radio_chat_messages
  order by ts desc
  limit greatest(1, least(coalesce(p_limit, 120), 300));
$$;

-- ── Skriv ein ny melding ─────────────────────────────────────────────────
-- Server-autoritative lengdegrenser (matchar klientens maxlength) sjølv om
-- ein forbikoblar UI-et. Trimmar tabellen til siste 500 rader ved kvart
-- skriv, så ho aldri veks ubegrensa (chatten er ephemeral, ikkje eit arkiv).
create or replace function public.insert_radio_chat(p_id text, p_nick text, p_color text, p_text text, p_ts bigint, p_type text default 'msg')
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_id is null or p_text is null or length(p_text) = 0 then return; end if;
  insert into public.radio_chat_messages(id, nick, color, text, ts, type, created_at)
  values (p_id, coalesce(left(p_nick, 24), 'Anon'), left(p_color, 16), left(p_text, 400), coalesce(p_ts, 0), coalesce(left(p_type, 16), 'msg'), now())
  on conflict (id) do nothing;

  delete from public.radio_chat_messages
  where id in (
    select id from public.radio_chat_messages
    order by ts desc
    offset 500
  );
end;
$$;

grant execute on function public.list_radio_chat(int)                                     to anon, authenticated;
grant execute on function public.insert_radio_chat(text, text, text, text, bigint, text)   to anon, authenticated;
