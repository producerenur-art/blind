-- 0019_groups.sql — kryss-nettlesar synk for Facebook-lignende grupper
-- (js/groups.js), autorisert av api/groups.js
--
-- Same rotårsak som chat/DM/varsler/online-lista: gruppemetadata (namn,
-- medlemmer, banner) og gruppeinnlegg ligg BERRE i Gun (SC.NS.groups/
-- SC.NS.gposts) og synkar difor ikkje pålitelig mellom to ULIKE nettlesarar
-- (sjå minne soundcore-gun-relay-browser-sync). Kommentarar/reaksjonar PÅ
-- gruppeinnlegg er allereie OK — dei gjenbruker Social (target 'gpost:<id>')
-- og går difor gjennom det allereie fikse CommentSync/ReactionSync.
--
-- Grupper kan vere 'closed' (private) — i motsetning til radio-chat/
-- kommentarar kan vi difor IKKJE bruke "kven som helst med anon-nøkkelen kan
-- lese"-mønsteret ubetinga. Same løysing som direct_messages (0016): tabellane
-- er heilt låst (RLS på, ingen grants), all tilgang går via api/groups.js med
-- service-role-nøkkelen, som handhevar synlegheit/medlemskap i JS-kode FØR
-- nokon spørring returnerer noko.
--
-- Kjør HEILE fila i Supabase → SQL Editor (same prosjekt som 0002 m.fl.).

create table if not exists public.groups (
  id            text primary key,
  name          text        not null,
  description   text,
  rules         text,
  privacy       text        not null default 'open',  -- 'open' | 'closed'
  owner         text        not null,
  owner_display text,
  members       jsonb       not null default '[]'::jsonb,
  banner        text,
  ts            bigint      not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists groups_ts_idx on public.groups (ts desc);

create table if not exists public.group_posts (
  id             text primary key,
  group_id       text        not null,
  author         text        not null,
  author_display text,
  text           text        not null,
  ts             bigint      not null default 0,
  created_at     timestamptz not null default now()
);
create index if not exists group_posts_group_idx on public.group_posts (group_id, ts desc);

alter table public.groups enable row level security;
alter table public.group_posts enable row level security;
revoke all on public.groups from anon, authenticated;
revoke all on public.group_posts from anon, authenticated;
-- Ingen policyer, ingen RPC-grants = ingen tilgang for anon/authenticated i det
-- heile. Kun service-role-nøkkelen (api/groups.js) kjem forbi RLS.
