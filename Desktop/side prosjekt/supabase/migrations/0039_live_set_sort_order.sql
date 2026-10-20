-- 0039_live_set_sort_order.sql — admin kan bestemme rekkefølgja i «What went live».
-- Legg berre til ei NULL-bar kolonne + ein RPC; rører ikkje eksisterande rader, bilete eller lydfiler.
-- Rader utan sort_order sorterast som før (nyaste først), så ingenting endrar seg før admin flyttar noko.
-- Kjør i Supabase → SQL Editor (prosjekt qefdyxpyjwpohsmmmksf). Trygt å køyre fleire gonger.
alter table public.live_sets add column if not exists sort_order int;

create or replace function public.reorder_live_sets(p_ids text[], p_secret text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare sec text;
begin
  select secret into sec from public.live_broadcast_secret where id = 1;
  if p_secret is null or sec is null or sec <> p_secret then raise exception 'live_set_forbidden'; end if;
  if p_ids is null or array_length(p_ids, 1) is null or array_length(p_ids, 1) > 500 then raise exception 'live_set_bad_order'; end if;
  update public.live_sets s
     set sort_order = o.ord
    from unnest(p_ids) with ordinality as o(id, ord)
   where s.id = o.id;
end;
$$;
grant execute on function public.reorder_live_sets(text[], text) to anon, authenticated;
