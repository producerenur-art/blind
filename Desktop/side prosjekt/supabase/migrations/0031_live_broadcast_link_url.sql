-- 0031_live_broadcast_link_url.sql — valfri lenke (Facebook/Bandcamp/Spotify osv.)
-- på den globale live-statusen, vist attmed «LIVE — {namn} — {tittel}» på
-- 24-Hour Cycle-kortet. Brukarønske 23.09.2026. Skrivast frå både eigar-
-- panelet (js/livemix.js) og gjeste-DJ-panelet (js/liveGuest.js).
--
-- Kjør heile fila i Supabase → SQL Editor (prosjektet qefdyxpyjwpohsmmmksf).

alter table public.live_broadcast_status
  add column if not exists link_url text not null default '';

drop function if exists public.get_live_broadcast_status();
drop function if exists public.set_live_broadcast_status(text, boolean, text, text, text);

create or replace function public.get_live_broadcast_status()
returns table(is_live boolean, presenter_name text, room text, track_title text, link_url text, started_at timestamptz, updated_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select is_live, presenter_name, room, track_title, link_url, started_at, updated_at
    from public.live_broadcast_status
   where id = 1;
$$;

create or replace function public.set_live_broadcast_status(
  p_secret         text,
  p_is_live        boolean,
  p_presenter_name text default '',
  p_room           text default '',
  p_track_title    text default '',
  p_link_url       text default ''
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare existing text;
begin
  if p_secret is null or length(p_secret) < 8 then
    raise exception 'live_broadcast_secret_invalid';
  end if;

  select secret into existing from public.live_broadcast_secret where id = 1;
  if existing is null then
    raise exception 'live_broadcast_secret_not_configured';
  elsif existing <> p_secret then
    raise exception 'live_broadcast_secret_mismatch';
  end if;

  update public.live_broadcast_status
     set is_live        = p_is_live,
         presenter_name = coalesce(p_presenter_name, ''),
         room           = coalesce(p_room, ''),
         track_title    = coalesce(p_track_title, ''),
         link_url       = coalesce(p_link_url, ''),
         started_at     = case when p_is_live then now() else started_at end,
         updated_at     = now()
   where id = 1;
end;
$$;

grant execute on function public.get_live_broadcast_status() to anon, authenticated;
grant execute on function public.set_live_broadcast_status(text, boolean, text, text, text, text) to anon, authenticated;
