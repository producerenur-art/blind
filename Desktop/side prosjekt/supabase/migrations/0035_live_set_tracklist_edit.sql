-- 0035_live_set_tracklist_edit.sql — lar admin redigere tracklist-feltet på ei
-- live_sets-rad (t.d. Lemonchill-arkivposten) gjennom same update_live_set-RPC
-- som Name/Text alt bruker. update_live_set hadde ingen p_tracklist-param før
-- dette (tracklist blei berre sett éin gong, ved publish_special_set). Brukarønske
-- 29.09.2026: Admin001 skal ha eit tekstfelt under "What went live"-kortet der
-- sangnavn kan settast inn/rettast i etterkant.
-- Kjør i Supabase → SQL Editor (prosjektet qefdyxpyjwpohsmmmksf). Trygt å køyre fleire gonger.

-- Fjern den gamle 8-parameter-signaturen fyrst — elles overloadar dei to
-- funksjonane kvarandre (Postgres skil på argumenttypar, ikkje berre namn), og
-- PostgREST kan bli usikker på kva for éin RPC-kall skal treffe.
drop function if exists public.update_live_set(text, text, text, text, text, text, text, text);

create or replace function public.update_live_set(
  p_id text, p_username text, p_secret text default null,
  p_display_name text default null, p_track_title text default null,
  p_link_url text default null, p_cover_url text default null, p_audio_url text default null,
  p_tracklist text default null
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
         tracklist    = coalesce(left(p_tracklist, 4000), tracklist),
         updated_at   = now()
   where id = p_id;
end;
$$;
grant execute on function public.update_live_set(text, text, text, text, text, text, text, text, text) to anon, authenticated;
