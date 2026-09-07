-- 0018_notifications.sql — kryss-nettlesar varslingssenter (js/notify.js)
--
-- Same rotårsak som chat/DM/online-lista: Notify.emit() gjekk BERRE via Gun
-- (SC.NS.notif), og dei offentlege releane leverer ikkje pålitelig mellom to
-- ULIKE nettlesarar (sjå minne soundcore-gun-relay-browser-sync).
--
-- ALVORLEG KONSEKVENS oppdaga 07.09.2026: venneforespurnadar (js/auth.js
-- sendFriendRequest) skriv KUN til avsendaren sin eigen lokale brukarcache —
-- mottakaren får forespurnaden REGISTRERT hos seg sjølv utelukkande gjennom
-- Notify sin innkomande 'friend_request'-handtering (onIncoming kallar
-- Auth.receiveFriendRequest). Utan pålitelig levering har venneforespurnadar
-- truleg aldri nådd mottakaren når avsendar/mottakar var på ulike nettlesarar
-- — heile vennesystemet var reelt sett avhengig av denne eine, upålitelige
-- transporten.
--
-- Autorisering (samme modell som direct_messages/0016, via api/notify.js):
-- SKRIVING krev berre eit gyldig sessionToken som prova at avsendaren er den
-- han seier (ikkje ein mottakar-spesifikk sjekk — kven som helst innlogga kan
-- varsle kven som helst, akkurat som den gamle Gun-åtferda). LESING er strengt
-- avgrensa til EIGEN innboks (to_user = tokenets brukarnamn) — det handhevast
-- i api/notify.js, ikkje her, difor ingen RPC-ar/policyer, tabellen er heilt
-- låst til service-role-nøkkelen.
--
-- Kjør HEILE fila i Supabase → SQL Editor (same prosjekt som 0002 m.fl.).

create table if not exists public.notifications (
  id           text primary key,
  to_user      text        not null,
  from_user    text,
  from_display text,
  type         text        not null default 'message',
  text         text        not null,
  link         text,
  ts           bigint      not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists notifications_to_user_idx on public.notifications (to_user, ts desc);

alter table public.notifications enable row level security;
revoke all on public.notifications from anon, authenticated;
-- Ingen policyer, ingen RPC-grants = ingen tilgang for anon/authenticated i det
-- heile. Kun service-role-nøkkelen (api/notify.js) kjem forbi RLS.
