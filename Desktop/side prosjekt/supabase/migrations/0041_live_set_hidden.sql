-- 0041_live_set_hidden.sql — admin kan skjule/vise eit sett i «What went live» for publikum.
-- Skjulte sett forsvinn for gjester/brukarar (òg på delingslenka /what-went-live-… og i «Live activity»), men admin ser dei
-- (merka «Hidden») via list_live_sets_admin. Rører ikkje lyd, bilete eller tekst. Lydfil-URL-en er framleis offentleg for den som har lenka.
-- Kjør i Supabase → SQL Editor (prosjekt qefdyxpyjwpohsmmmksf). Trygt å køyre fleire gonger.
alter table public.live_sets add column if not exists hidden boolean not null default false;

drop policy if exists live_sets_select on public.live_sets;
create policy live_sets_select on public.live_sets for select
  using (not hidden and coalesce(published_at, ended_at, created_at) <= now());

-- Admin: alle ferdige sett, òg skjulte og framtidige.
create or replace function public.list_live_sets_admin(p_secret text default null, p_limit int default 300)
returns setof public.live_sets
language plpgsql
security definer
set search_path = public
as $$
declare sec text;
begin
  select secret into sec from public.live_broadcast_secret where id = 1;
  if p_secret is null or sec is null or sec <> p_secret then raise exception 'live_set_forbidden'; end if;
  return query select * from public.live_sets where ended_at is not null
    order by ended_at desc limit least(coalesce(p_limit, 300), 500);
end;
$$;
grant execute on function public.list_live_sets_admin(text, int) to anon, authenticated;

-- Admin: skjul (true) / vis (false).
create or replace function public.set_live_set_hidden(p_id text, p_hidden boolean, p_secret text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare sec text;
begin
  select secret into sec from public.live_broadcast_secret where id = 1;
  if p_secret is null or sec is null or sec <> p_secret then raise exception 'live_set_forbidden'; end if;
  update public.live_sets set hidden = coalesce(p_hidden, false) where id = p_id;
end;
$$;
grant execute on function public.set_live_set_hidden(text, boolean, text) to anon, authenticated;
