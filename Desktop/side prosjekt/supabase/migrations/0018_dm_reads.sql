-- 0018_dm_reads.sql — «Read»/«Sent»-status i venne-DM (js/friendchat.js,
-- js/messenger.js), Facebook-liknande, TILGJENGELEG FOR ALLE brukarar (ikkje
-- admin-gata, i motsetning til «What went live»-redigering). Same
-- server-autoriserte mønster som 0016/0017 — sjå der for kvifor.
--
-- Kjør HEILE fila i Supabase → SQL Editor (same prosjekt som 0002/…/0016/0017).

create table if not exists public.dm_reads (
  channel      text   not null,
  username     text   not null,
  last_read_ts bigint not null default 0,
  updated_at   timestamptz not null default now(),
  primary key (channel, username)
);

alter table public.dm_reads enable row level security;
revoke all on public.dm_reads from anon, authenticated;
-- Ingen policyer/grants — kun api/dm.js (service-role-nøkkelen) kjem forbi RLS,
-- same som direct_messages.
