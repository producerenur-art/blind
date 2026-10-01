-- 0038_wwl_number.sql — fast, aldri-gjenbrukt nummer per ferdig live-opptak → delingslenke /what-went-live-<nr>.
-- Eldste opptak = 1. Slettar du eit opptak blir nummeret ståande tomt (lenkene til dei andre endrar seg ikkje).
-- Kjør i Supabase → SQL Editor (prosjekt qefdyxpyjwpohsmmmksf). Kan køyrast fleire gonger.
alter table public.live_sets add column if not exists wwl_no int;
create unique index if not exists live_sets_wwl_no_key on public.live_sets (wwl_no) where wwl_no is not null;
create sequence if not exists public.live_sets_wwl_seq;

-- Tildel nummer til eksisterande ferdige opptak, eldste først (berre rader utan nummer).
with todo as (
  select id, row_number() over (order by ended_at asc, created_at asc) as rn
  from public.live_sets
  where wwl_no is null and ended_at is not null and coalesce(audio_url, '') <> ''
), base as (select coalesce(max(wwl_no), 0) as m from public.live_sets)
update public.live_sets s set wwl_no = todo.rn + base.m
from todo, base where s.id = todo.id;
select setval('public.live_sets_wwl_seq', greatest((select coalesce(max(wwl_no), 0) from public.live_sets), 1), (select coalesce(max(wwl_no), 0) from public.live_sets) > 0);

-- Nye opptak får neste nummer når dei blir ferdige (ended_at + lydfil).
create or replace function public.live_sets_assign_wwl_no() returns trigger
language plpgsql as $$
begin
  if new.wwl_no is null and new.ended_at is not null and coalesce(new.audio_url, '') <> '' then
    new.wwl_no := nextval('public.live_sets_wwl_seq');
  end if;
  return new;
end;
$$;
drop trigger if exists live_sets_wwl_no on public.live_sets;
create trigger live_sets_wwl_no before insert or update on public.live_sets
for each row execute function public.live_sets_assign_wwl_no();
