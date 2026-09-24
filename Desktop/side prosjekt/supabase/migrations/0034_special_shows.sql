-- 0034_special_shows.sql — (1) logg over sendte varsel for planlagte program, slik at
-- hver e-post-påminning berre går ut ÉN gong, og (2) tracklist + publiseringstid
-- på live_sets så Lemonchill-miksen kan ligge i Live Archive med tracklisten
-- UNDER seg, synleg for alle FØRST etter at han har gått på lufta. Brukarønske 2026-09-24.
-- Kjør i Supabase → SQL Editor (prosjektet qefdyxpyjwpohsmmmksf). Trygt å køyre fleire gonger.

create table if not exists public.special_reminder_log (
  show_id text        not null,
  kind    int         not null,
  sent_at timestamptz not null default now(),
  sent    int         not null default 0,
  primary key (show_id, kind)
);
alter table public.special_reminder_log enable row level security;
revoke all on public.special_reminder_log from anon, authenticated;

alter table public.live_sets add column if not exists tracklist    text        not null default '';
alter table public.live_sets add column if not exists published_at timestamptz;

-- Lat berre sett som er publiserte (ended_at satt) OG ikkje ligg fram i tid vere synlege.
drop policy if exists live_sets_select on public.live_sets;
create policy live_sets_select on public.live_sets for select
  using (coalesce(published_at, ended_at, created_at) <= now());

-- Opprett/oppdater eit spesialsett (miks) — kun med eigar-hemmelegheita.
create or replace function public.publish_special_set(
  p_secret text, p_id text, p_display_name text, p_track_title text,
  p_audio_url text, p_duration_sec int, p_tracklist text, p_published_at timestamptz,
  p_cover_url text default '', p_link_url text default ''
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare sec text;
begin
  select secret into sec from public.live_broadcast_secret where id = 1;
  if sec is null or p_secret is distinct from sec then raise exception 'live_broadcast_secret_mismatch'; end if;
  insert into public.live_sets (id, owner_username, is_owner_set, display_name, room, track_title, link_url,
                                cover_url, audio_url, started_at, ended_at, duration_sec, tracklist, published_at)
  values (p_id, '', true, p_display_name, 'special', p_track_title, coalesce(p_link_url,''),
          coalesce(p_cover_url,''), p_audio_url, p_published_at, p_published_at, greatest(coalesce(p_duration_sec,0),0),
          coalesce(p_tracklist,''), p_published_at)
  on conflict (id) do update set
    display_name = excluded.display_name, track_title = excluded.track_title, audio_url = excluded.audio_url,
    duration_sec = excluded.duration_sec, tracklist = excluded.tracklist, published_at = excluded.published_at,
    ended_at = excluded.ended_at, updated_at = now();
end;
$$;
grant execute on function public.publish_special_set(text, text, text, text, text, int, text, timestamptz, text, text) to anon, authenticated;
