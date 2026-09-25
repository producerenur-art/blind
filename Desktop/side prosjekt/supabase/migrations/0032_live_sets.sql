-- 0032_live_sets.sql — offentleg arkiv over ALLE live-sett (eigar + gjeste-DJ-ar)
-- med opptak (lydfil), omslagsbilete, tittel/tekst og URL-lenke. Brukarønske
-- 2026-09-24. Sjå js/liveSets.js (opptak + API), js/liveArchive.js (visning/redigering).
--
-- Tillitsmodell — same som resten av appen (ingen ekte Supabase Auth-sesjon):
--   * LESING er opent for alle (besøkande + innlogga) via RLS-policy.
--   * SKRIVING går berre via SECURITY DEFINER-funksjonane under. Redigering krev
--     at p_username = radas owner_username (klientpåstått identitet, same grense
--     som cancel_my_broadcast_request i 0025) ELLER gyldig eigar-hemmelegheit
--     (live_broadcast_secret, same som admin_update_broadcast_archive i 0026).
--   * Rediger-KNAPPEN vises i klienten berre for eigaren av settet og admin.
--
-- Kjør heile fila i Supabase → SQL Editor (prosjektet qefdyxpyjwpohsmmmksf).

create table if not exists public.live_sets (
  id             text primary key,
  owner_username text        not null default '',
  is_owner_set   boolean     not null default false,
  display_name   text        not null default '',
  room           text        not null default '',
  track_title    text        not null default '',
  link_url       text        not null default '',
  cover_url      text        not null default '',
  audio_url      text        not null default '',
  started_at     timestamptz not null default now(),
  ended_at       timestamptz,
  duration_sec   int         not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists live_sets_ended_idx on public.live_sets (ended_at desc);

alter table public.live_sets enable row level security;
drop policy if exists live_sets_select on public.live_sets;
create policy live_sets_select on public.live_sets for select using (true);
revoke all on public.live_sets from anon, authenticated;
grant select on public.live_sets to anon, authenticated;

-- Intern: har kallaren lov til å endre dette settet?
create or replace function public._live_set_can_edit(p_id text, p_username text, p_secret text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare owner text; sec text;
begin
  select owner_username into owner from public.live_sets where id = p_id;
  if not found then return false; end if;
  if coalesce(p_username, '') <> '' and owner <> '' and lower(owner) = lower(p_username) then return true; end if;
  select secret into sec from public.live_broadcast_secret where id = 1;
  return p_secret is not null and sec is not null and sec = p_secret;
end;
$$;
revoke all on function public._live_set_can_edit(text, text, text) from anon, authenticated;

-- Start ei ny rad når ei sending startar. Eigar-sett krev eigar-hemmelegheita.
create or replace function public.start_live_set(
  p_id text, p_username text, p_display_name text, p_room text,
  p_is_owner boolean default false, p_secret text default null,
  p_track_title text default '', p_link_url text default ''
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare sec text;
begin
  if p_id is null or length(p_id) < 6 or length(p_id) > 80 then raise exception 'live_set_bad_id'; end if;
  if p_is_owner then
    select secret into sec from public.live_broadcast_secret where id = 1;
    if sec is null or p_secret is distinct from sec then raise exception 'live_broadcast_secret_mismatch'; end if;
  end if;
  insert into public.live_sets (id, owner_username, is_owner_set, display_name, room, track_title, link_url)
  values (p_id, coalesce(p_username, ''), coalesce(p_is_owner, false), left(coalesce(p_display_name, ''), 120),
          left(coalesce(p_room, ''), 120), left(coalesce(p_track_title, ''), 300), left(coalesce(p_link_url, ''), 500))
  on conflict (id) do nothing;
end;
$$;

-- Avslutt: sett sluttid, varigheit og (om opptaket blei lasta opp) lyd-URL.
create or replace function public.finish_live_set(
  p_id text, p_username text, p_secret text default null,
  p_audio_url text default null, p_duration_sec int default 0
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public._live_set_can_edit(p_id, p_username, p_secret) then raise exception 'live_set_forbidden'; end if;
  update public.live_sets
     set ended_at     = coalesce(ended_at, now()),
         duration_sec = greatest(coalesce(p_duration_sec, 0), 0),
         audio_url    = coalesce(p_audio_url, audio_url),
         updated_at   = now()
   where id = p_id;
end;
$$;

-- Rediger (null = uendra): namn, tittel/tekst, URL-lenke, omslagsbilete, lyd.
create or replace function public.update_live_set(
  p_id text, p_username text, p_secret text default null,
  p_display_name text default null, p_track_title text default null,
  p_link_url text default null, p_cover_url text default null, p_audio_url text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public._live_set_can_edit(p_id, p_username, p_secret) then raise exception 'live_set_forbidden'; end if;
  if p_link_url is not null and p_link_url <> '' and p_link_url !~* '^https?://' then raise exception 'live_set_bad_link'; end if;
  update public.live_sets
     set display_name = coalesce(left(p_display_name, 120), display_name),
         track_title  = coalesce(left(p_track_title, 300), track_title),
         link_url     = coalesce(left(p_link_url, 500), link_url),
         cover_url    = coalesce(p_cover_url, cover_url),
         audio_url    = coalesce(p_audio_url, audio_url),
         updated_at   = now()
   where id = p_id;
end;
$$;

grant execute on function public.start_live_set(text, text, text, text, boolean, text, text, text) to anon, authenticated;
grant execute on function public.finish_live_set(text, text, text, text, int) to anon, authenticated;
grant execute on function public.update_live_set(text, text, text, text, text, text, text, text) to anon, authenticated;
