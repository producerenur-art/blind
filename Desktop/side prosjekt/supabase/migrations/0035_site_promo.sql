-- 0035_site_promo.sql — admin-redigerbar reklamebrikke (js/specialPromo.js).
-- Alle får LESE; berre admin kan SKRIVE, via RPC bak same hemmelegheit som
-- admin_update_broadcast_archive (0026) → live_broadcast_secret (id=1, 0022).
-- Ingen rad = brikka viser standardteksten frå js/specialShows.js.
-- Kjør i Supabase → SQL Editor (prosjekt qefdyxpyjwpohsmmmksf).

create table if not exists public.site_promo (
  id         text primary key,            -- t.d. 'lemonchill-001' (= SpecialShows-id)
  image_url  text not null default '',
  title      text not null default '',
  body       text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.site_promo enable row level security;
drop policy if exists site_promo_read on public.site_promo;
create policy site_promo_read on public.site_promo for select using (true);
grant select on public.site_promo to anon, authenticated;

-- Lagrar heile tilstanden (bilete + tittel + tekst). Tom streng = sletta.
create or replace function public.admin_save_site_promo(
  p_id        text,
  p_secret    text,
  p_image_url text,
  p_title     text,
  p_body      text
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
  if coalesce(p_id, '') = '' then raise exception 'site_promo_id_required'; end if;

  insert into public.site_promo (id, image_url, title, body, updated_at)
  values (p_id, left(coalesce(p_image_url, ''), 600), left(coalesce(p_title, ''), 120), left(coalesce(p_body, ''), 400), now())
  on conflict (id) do update
    set image_url = excluded.image_url, title = excluded.title, body = excluded.body, updated_at = now();
end;
$$;

grant execute on function public.admin_save_site_promo(text, text, text, text, text) to anon, authenticated;
