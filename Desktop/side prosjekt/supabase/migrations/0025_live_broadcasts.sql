-- 0025_live_broadcasts.sql — eksterne "søk om å gå live"-forespørsler + arkiv
--
-- Formål: eieren av SiriusFM får kontakter (DJ-er, radiostasjoner) verden over
-- som vil spille live på plattformen. Denne migrasjonen legger til ÉN delt
-- tabell der:
--   * ein innlogga brukar kan SENDE INN ei forespørsel om å gå live (fritt
--     tidspunkt/varighet/melding), og seinare oppdatere/kansellere si EIGA,
--   * eigaren (klientside-gata bak den EKSISTERANDE globale løyve-hemmeleg-
--     heita frå 0022_live_broadcast.sql — CONFIG.LIVE_BROADCAST_SECRET, same
--     secret-tabell, ingen ny hemmelegheit å halda styr på) godkjenner/avslår,
--   * ein godkjend, innlogga artist kan gå live i sitt EIGE rom (js/liveGuest.js
--     brukar js/livebroadcast.js sine primitivar DIREKTE — IKKJE den globale
--     tvangsovertakinga i js/liveGlobal.js/js/radio.js, som framleis er
--     eigar-eksklusiv), og lyttarar vel sjølv å høyra på via ei "Live no"-fane,
--   * fullførte sendingar blir ein offentleg, delbar arkivpost (namn/tidspunkt/
--     bilete/melding — ingen lydavspeling, reint metadata-arkiv).
--
-- Sikkerheitsmodell — same som resten av appen (klientside-innlogging, ingen
-- ekte Supabase Auth-sesjon, berre den offentlege anon-nøkkelen frå nettlesaren):
--   * Forespørselen sin EIGEN forfattar (requester_username-match, INGEN
--     hemmelegheit) kan endra/kansellera/setja miniatyrbilete/markera
--     start+slutt på SI EIGA rad — same tillitsnivå som delete_post_owned()
--     i 0009_delete_post_owned.sql.
--   * Offentleg lesing er avgrensa til dei kolonnane som faktisk skal visast
--     fram (INGEN e-post/melding) via get_live_broadcasts_now()/
--     list_broadcast_archive() — status='live' / status='completed'.
--   * Eigar-handlingar (sjå alle forespørslar + godkjenn/avslå) er RPC-gata bak
--     p_secret, sjekka mot DEN SAME live_broadcast_secret-tabellen som 0022
--     alt oppretta (id=1) — ingen ny hemmelegheit i js/config.js nødvendig.
--
-- Kjør heile fila i Supabase → SQL Editor (same prosjekt som 0022, qefdyxpyjwpohsmmmksf).
-- Føresetnad: 0022_live_broadcast.sql er alt køyrd (denne fila les frå
-- public.live_broadcast_secret, oppretta der).

create table if not exists public.live_broadcasts (
  id                 text primary key,
  requester_username text        not null,
  requester_email    text        not null,
  display_name       text        not null,
  message            text        not null default '',
  requested_start    timestamptz,
  requested_hours    int         not null default 1,
  room               text        not null,
  status             text        not null default 'pending'
                        check (status in ('pending','approved','rejected','live','completed','cancelled')),
  reviewed_by        text,
  reviewed_at        timestamptz,
  reject_reason      text        not null default '',
  started_at         timestamptz,
  ended_at           timestamptz,
  thumbnail_url      text        not null default '',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists live_broadcasts_status_idx  on public.live_broadcasts (status);
create index if not exists live_broadcasts_owner_idx   on public.live_broadcasts (requester_username);
create index if not exists live_broadcasts_ended_idx   on public.live_broadcasts (ended_at desc);

alter table public.live_broadcasts enable row level security;
revoke all on public.live_broadcasts from anon, authenticated;

-- ── Send inn forespørsel (innlogga brukar, ingen godkjenning trengst for å SPØRRE) ──
create or replace function public.submit_broadcast_request(
  p_id              text,
  p_username        text,
  p_email           text,
  p_display_name    text,
  p_message         text,
  p_requested_start timestamptz,
  p_requested_hours int default 1
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.live_broadcasts (
    id, requester_username, requester_email, display_name, message,
    requested_start, requested_hours, room, status, created_at, updated_at
  ) values (
    p_id, p_username, p_email, coalesce(p_display_name, p_username), coalesce(p_message, ''),
    p_requested_start, greatest(1, coalesce(p_requested_hours, 1)), 'guest-' || p_id, 'pending', now(), now()
  );
end;
$$;

-- ── Oppdater EIGA forespørsel (kun mens den framleis er 'pending') ───────────────
create or replace function public.update_my_broadcast_request(
  p_id              text,
  p_username        text,
  p_display_name    text,
  p_message         text,
  p_requested_start timestamptz,
  p_requested_hours int default 1
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.live_broadcasts
     set display_name    = coalesce(p_display_name, display_name),
         message          = coalesce(p_message, message),
         requested_start  = p_requested_start,
         requested_hours  = greatest(1, coalesce(p_requested_hours, requested_hours)),
         updated_at       = now()
   where id = p_id and requester_username = p_username and status = 'pending';
end;
$$;

-- ── Kanseller EIGA forespørsel (pending eller alt godkjend, men ikkje starta) ────
create or replace function public.cancel_my_broadcast_request(p_id text, p_username text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.live_broadcasts
     set status = 'cancelled', updated_at = now()
   where id = p_id and requester_username = p_username and status in ('pending', 'approved');
end;
$$;

-- ── Sett miniatyrbilete på EIGA sending (artisten vel sjølv, brukt i arkivet) ────
create or replace function public.set_broadcast_thumbnail_owned(p_id text, p_username text, p_thumbnail_url text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.live_broadcasts
     set thumbnail_url = coalesce(p_thumbnail_url, ''), updated_at = now()
   where id = p_id and requester_username = p_username;
end;
$$;

-- ── Marker EIGA sending som starta/avslutta (kun i sitt eige rom, aldri global) ──
create or replace function public.mark_broadcast_started(p_id text, p_username text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.live_broadcasts
     set status = 'live', started_at = now(), updated_at = now()
   where id = p_id and requester_username = p_username and status = 'approved';
end;
$$;

create or replace function public.mark_broadcast_ended(p_id text, p_username text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.live_broadcasts
     set status = 'completed', ended_at = now(), updated_at = now()
   where id = p_id and requester_username = p_username and status = 'live';
end;
$$;

-- ── Mine forespørsler (alle status, eigen brukar) ────────────────────────────────
create or replace function public.list_my_broadcast_requests(p_username text)
returns table(
  id text, display_name text, message text, requested_start timestamptz, requested_hours int,
  room text, status text, reject_reason text, started_at timestamptz, ended_at timestamptz,
  thumbnail_url text, created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select id, display_name, message, requested_start, requested_hours,
         room, status, reject_reason, started_at, ended_at, thumbnail_url, created_at
    from public.live_broadcasts
   where requester_username = p_username
   order by created_at desc;
$$;

-- ── Offentleg: kven er live NO (ingen e-post/melding) ────────────────────────────
create or replace function public.get_live_broadcasts_now()
returns table(id text, display_name text, room text, thumbnail_url text, started_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select id, display_name, room, thumbnail_url, started_at
    from public.live_broadcasts
   where status = 'live'
   order by started_at desc;
$$;

-- ── Offentleg: arkiv over fullførte sendingar (ingen e-post/melding) ─────────────
create or replace function public.list_broadcast_archive(p_limit int default 60)
returns table(id text, display_name text, thumbnail_url text, started_at timestamptz, ended_at timestamptz, requester_username text)
language sql
stable
security definer
set search_path = public
as $$
  select id, display_name, thumbnail_url, started_at, ended_at, requester_username
    from public.live_broadcasts
   where status = 'completed'
   order by ended_at desc
   limit greatest(1, least(coalesce(p_limit, 60), 200));
$$;

-- ── Eitt arkivert opplegg (for delesida sin detaljvisning) ───────────────────────
create or replace function public.get_broadcast_archive_item(p_id text)
returns table(id text, display_name text, message text, thumbnail_url text, started_at timestamptz, ended_at timestamptz, requester_username text)
language sql
stable
security definer
set search_path = public
as $$
  select id, display_name, message, thumbnail_url, started_at, ended_at, requester_username
    from public.live_broadcasts
   where id = p_id and status = 'completed';
$$;

-- ── Eigar: alle forespørslar (kvar status), gata bak den EKSISTERANDE 0022-
--    hemmelegheita — same trygde-grense eigaren alt stoler på for "Gå live". ────
create or replace function public.list_broadcast_requests_admin(p_secret text)
returns table(
  id text, requester_username text, requester_email text, display_name text, message text,
  requested_start timestamptz, requested_hours int, room text, status text,
  reviewed_by text, reviewed_at timestamptz, reject_reason text,
  started_at timestamptz, ended_at timestamptz, thumbnail_url text, created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare existing text;
begin
  select secret into existing from public.live_broadcast_secret where id = 1;
  if existing is null then raise exception 'live_broadcast_secret_not_configured'; end if;
  if p_secret is null or existing <> p_secret then raise exception 'live_broadcast_secret_mismatch'; end if;

  return query
    select b.id, b.requester_username, b.requester_email, b.display_name, b.message,
           b.requested_start, b.requested_hours, b.room, b.status,
           b.reviewed_by, b.reviewed_at, b.reject_reason,
           b.started_at, b.ended_at, b.thumbnail_url, b.created_at
      from public.live_broadcasts b
     order by b.created_at desc
     limit 300;
end;
$$;

-- ── Eigar: godkjenn/avslå ein forespørsel ────────────────────────────────────────
create or replace function public.review_broadcast_request(
  p_id            text,
  p_secret        text,
  p_status        text,
  p_reviewer      text default 'eier',
  p_reject_reason text default ''
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
  if p_status not in ('approved', 'rejected') then raise exception 'invalid_status'; end if;

  update public.live_broadcasts
     set status        = p_status,
         reviewed_by    = p_reviewer,
         reviewed_at    = now(),
         reject_reason  = case when p_status = 'rejected' then coalesce(p_reject_reason, '') else '' end,
         updated_at     = now()
   where id = p_id and status = 'pending';
end;
$$;

grant execute on function public.submit_broadcast_request(text, text, text, text, text, timestamptz, int) to anon, authenticated;
grant execute on function public.update_my_broadcast_request(text, text, text, text, timestamptz, int)     to anon, authenticated;
grant execute on function public.cancel_my_broadcast_request(text, text)                                   to anon, authenticated;
grant execute on function public.set_broadcast_thumbnail_owned(text, text, text)                            to anon, authenticated;
grant execute on function public.mark_broadcast_started(text, text)                                         to anon, authenticated;
grant execute on function public.mark_broadcast_ended(text, text)                                           to anon, authenticated;
grant execute on function public.list_my_broadcast_requests(text)                                           to anon, authenticated;
grant execute on function public.get_live_broadcasts_now()                                                  to anon, authenticated;
grant execute on function public.list_broadcast_archive(int)                                                to anon, authenticated;
grant execute on function public.get_broadcast_archive_item(text)                                           to anon, authenticated;
grant execute on function public.list_broadcast_requests_admin(text)                                        to anon, authenticated;
grant execute on function public.review_broadcast_request(text, text, text, text, text)                     to anon, authenticated;

-- ── Sanntid-push (valfritt, degraderer stille om publikasjonen manglar) ──────────
do $$
begin
  alter publication supabase_realtime add table public.live_broadcasts;
exception when others then
  null;
end $$;
