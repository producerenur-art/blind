-- 0011_live_presence.sql — sanntid besøkstelling (ALLE besøkende, også anonyme)
--
-- Skiller seg fra Gun-presence (js/realtime.js), som kun teller innloggede og er
-- upålitelig cross-browser via offentlige relays. Her pinger HVER besøkende (også
-- utloggede gjester) en server-side heartbeat, og admin leser antallet aktive nå.
--
-- Sikkerhetsmodell: samme som resten av appen — klientside-innlogging, ingen
-- Supabase-auth-sesjon (anon/publishable key, persistSession:false). Tilgang går
-- via SECURITY DEFINER-RPC; tabellen er låst med RLS. presence_count() gir kun et
-- tall (ingen PII), så admin-gating skjer klientside (CONFIG.ADMIN_USERS), i tråd
-- med appens øvrige tryggleiksmodell.

create table if not exists public.live_presence (
  id         text primary key,
  last_seen  timestamptz not null default now()
);
create index if not exists live_presence_last_seen_idx on public.live_presence (last_seen);

-- Ingen direkte tabelltilgang: alt går via RPC-ene under.
alter table public.live_presence enable row level security;

-- Heartbeat: oppdater egen rad til now(), og rydd bort døde rader (billig GC).
create or replace function public.presence_ping(p_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_id is null or length(p_id) < 8 or length(p_id) > 80 then
    return;
  end if;
  insert into public.live_presence (id, last_seen)
    values (p_id, now())
    on conflict (id) do update set last_seen = now();
  delete from public.live_presence where last_seen < now() - interval '5 minutes';
end;
$$;

-- Antall aktive besøkende siste 45 sekund (heartbeat-intervall er ~25s).
create or replace function public.presence_count()
returns integer
language sql
security definer
set search_path = public
as $$
  select count(*)::int
    from public.live_presence
   where last_seen > now() - interval '45 seconds';
$$;

grant execute on function public.presence_ping(text) to anon, authenticated;
grant execute on function public.presence_count()    to anon, authenticated;
