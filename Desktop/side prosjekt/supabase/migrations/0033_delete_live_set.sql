-- 0033_delete_live_set.sql — la eigaren av eit live-sett (og admin) slette det.
-- Same tilgangssjekk som update_live_set (0032): p_username = radas owner_username
-- ELLER gyldig eigar-hemmelegheit. Kjør i Supabase → SQL Editor.

create or replace function public.delete_live_set(p_id text, p_username text, p_secret text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public._live_set_can_edit(p_id, p_username, p_secret) then raise exception 'live_set_forbidden'; end if;
  delete from public.live_sets where id = p_id;
end;
$$;

grant execute on function public.delete_live_set(text, text, text) to anon, authenticated;
