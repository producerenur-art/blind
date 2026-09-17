-- 0026_admin_edit_broadcast_archive.sql — admin kan redigere ein fullført
-- Live-arkiv-post (namn/miniatyrbilete/melding) etter at DJ-en sjølv har lukka
-- sendinga, t.d. for å rette skrivefeil i namnet eller bytte forhandsbilete.
--
-- Same tillitsmodell/hemmelegheit som list_broadcast_requests_admin/
-- review_broadcast_request i 0025_live_broadcasts.sql: gata bak p_secret,
-- sjekka mot public.live_broadcast_secret (id=1), oppretta i 0022_live_broadcast.sql.
-- Klientsida (js/liveArchive.js) viser "Rediger"-knappen berre til kontoar i
-- CONFIG.ADMIN_EMAILS (js/config.js) — DENNE funksjonen er den ekte grensa.
--
-- Kjør i Supabase → SQL Editor (same prosjekt som 0022/0025, qefdyxpyjwpohsmmmksf).

create or replace function public.admin_update_broadcast_archive(
  p_id            text,
  p_secret        text,
  p_display_name  text default null,
  p_thumbnail_url text default null,
  p_message       text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare existing text;
begin
  select secret into existing from public.live_broadcast_secret where id = 1;
  if existing is null then raise exception 'live_broadcast_secret_not_configured'; end if;
  if p_secret is null or existing <> p_secret then raise exception 'live_broadcast_secret_mismatch'; end if;

  update public.live_broadcasts
     set display_name  = coalesce(nullif(p_display_name, ''), display_name),
         thumbnail_url  = coalesce(p_thumbnail_url, thumbnail_url),
         message        = coalesce(p_message, message),
         updated_at     = now()
   where id = p_id and status = 'completed';
end;
$$;
