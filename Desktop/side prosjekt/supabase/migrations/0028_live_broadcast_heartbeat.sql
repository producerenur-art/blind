-- 0028_live_broadcast_heartbeat.sql — stopp is_live frå å sitte fast «live»
-- for alltid viss avsendaren sin fane krasjar/lukkast/mistar nett utan å
-- rekke å trykke «Stop» (og dermed aldri kallar set_live_broadcast_status
-- med p_is_live=false). Rapportert 2026-09-19: ei sending frå kvelden før
-- (started_at 2026-09-18 17:26 UTC) stod framleis is_live=true 13+ timar
-- seinare — normal radio var blokkert for ALLE besøkende heile den tida
-- (js/radio.js sitt live-vern i _playUrl hindra stasjonsbytte).
--
-- Løysing: eksponer den alt eksisterande updated_at-kolonna via
-- get_live_broadcast_status(), og la js/livemix.js sende eit «hjarteslag»
-- (re-kalle set_live_broadcast_status med same is_live/presenter/room) med
-- jamne mellomrom mens sendinga pågår. js/liveGlobal.js reknar status som
-- FORELDA (og behandlar det som ikkje-live, uansett kva is_live-kolonna
-- seier) viss updated_at er eldre enn eit par minutt.
--
-- Kjør heile fila i Supabase → SQL Editor (prosjektet qefdyxpyjwpohsmmmksf).

create or replace function public.get_live_broadcast_status()
returns table(is_live boolean, presenter_name text, room text, started_at timestamptz, updated_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select is_live, presenter_name, room, started_at, updated_at
    from public.live_broadcast_status
   where id = 1;
$$;

grant execute on function public.get_live_broadcast_status() to anon, authenticated;
