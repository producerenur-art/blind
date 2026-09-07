-- 0016_direct_messages.sql — kryss-nettlesar synk for venne-DM og felles-lounge
-- (js/friendchat.js), autorisert av api/dm.js
--
-- Same rotårsak som radio-chatten (0015) og Community (0005/0006/0008): Gun.js
-- sine offentlege relear leverer ikkje pålitelig meldingar mellom to ULIKE
-- nettlesarar (sjå minne soundcore-gun-relay-browser-sync). Venne-DM er derimot
-- PRIVAT — i motsetning til radio-chat (open/anonym) og kommentarar (offentlege
-- på ein offentleg vegg) kan vi IKKJE bruke det same "kven som helst med
-- anon-nøkkelen kan lese"-mønsteret. Difor ingen RPC-ar her i det heile:
-- tabellen er heilt låst (RLS på, ingen grants), og einaste tilgang går via
-- api/dm.js, som køyrer server-side med SUPABASE_SERVICE_ROLE_KEY og handhevar
-- tilgang i JS-kode (sjekkar eit HMAC-sesjonstoken utstedt ved innlogging i
-- api/auth.js, OG at brukaren faktisk er ein av dei to partane i kanalen)
-- FØR nokon database-spørring køyrer.
--
-- Kjør HEILE fila i Supabase → SQL Editor (same prosjekt som 0002/0005/0006/0008/0015).

create table if not exists public.direct_messages (
  id           text primary key,
  channel      text        not null,  -- 'group' (felles lounge) eller sortert('userA','userB').join('__')
  from_user    text        not null,
  from_display text,
  to_user      text,                  -- berre sett for DM, ikkje for 'group'
  text         text        not null,
  ts           bigint      not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists direct_messages_channel_idx on public.direct_messages (channel, ts desc);

alter table public.direct_messages enable row level security;
revoke all on public.direct_messages from anon, authenticated;
-- Ingen policyer, ingen RPC-grants = ingen tilgang for anon/authenticated i det
-- heile. Kun service-role-nøkkelen (api/dm.js) kjem forbi RLS.
