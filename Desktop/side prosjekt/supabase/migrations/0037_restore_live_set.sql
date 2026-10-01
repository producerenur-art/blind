-- 0037_restore_live_set.sql — «Undo delete» for live-sett: legg tilbake ei sletta rad (berre admin/eigar-hemmelegheit).
-- Kjør i Supabase → SQL Editor (prosjekt qefdyxpyjwpohsmmmksf).
create or replace function public.restore_live_set(p_row jsonb, p_secret text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare sec text;
begin
  select secret into sec from public.live_broadcast_secret where id = 1;
  if p_secret is null or sec is null or sec <> p_secret then raise exception 'live_set_forbidden'; end if;
  if coalesce(p_row->>'id', '') = '' or coalesce(p_row->>'audio_url', '') = '' then raise exception 'live_set_bad_row'; end if;
  insert into public.live_sets
  select * from jsonb_populate_record(null::public.live_sets, p_row)
  on conflict (id) do nothing;
end;
$$;
grant execute on function public.restore_live_set(jsonb, text) to anon, authenticated;
