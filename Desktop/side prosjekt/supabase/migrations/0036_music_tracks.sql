-- 0036_music_tracks.sql — kryss-bruker synk for opplastet musikk (Discover-griden)
--
-- Bakgrunn: "music"-postene (tittel, artist, cover, sjanger, lyd-URL) lever i dag
-- KUN i IndexedDB på nettleseren som lastet opp, og user.musicIds (som Discover
-- bruker til å slå opp sporene) er en localStorage-liste som js/profilesync.js
-- eksplisitt IKKE synker («lokale IndexedDB-blob-id-er som er ubrukelige hos
-- andre»). Resultat: ingen andre besøkende har noensinne sett et opplastet spor
-- i Discover-griden, uansett cover/sjanger. Denne migrasjonen retter det —
-- samme mønster som 0002_profiles.sql (per-post hemmelighet, SECURITY DEFINER-RPC,
-- anon-nøkkelen kan ikke røre tabellen direkte).
--
-- Kjør hele fila i Supabase → SQL Editor (prosjektet qefdyxpyjwpohsmmmksf).

create table if not exists public.music_tracks (
  id           text primary key,
  username     text        not null,
  data         jsonb       not null default '{}'::jsonb,
  owner_secret text        not null,
  updated_at   timestamptz not null default now()
);
create index if not exists music_tracks_updated_at_idx on public.music_tracks (updated_at desc);
create index if not exists music_tracks_username_idx   on public.music_tracks (username);

alter table public.music_tracks enable row level security;
revoke all on public.music_tracks from anon, authenticated;

-- ── List alle offentlige spor (for Discover) ──────────────────────────────────
create or replace function public.list_music_tracks()
returns setof jsonb
language sql
stable
security definer
set search_path = public
as $$
  select data from public.music_tracks order by updated_at desc;
$$;

-- ── Opprett/oppdater ett spor ──────────────────────────────────────────────────
-- Første skriv setter hemmeligheten (samme lokale sekret som js/profilesync.js
-- allerede lager per brukernavn, sc_profile_secrets i localStorage — gjenbrukt
-- her, ingen ny hemmelighet trengs). Senere skriv MÅ oppgi samme hemmelighet.
create or replace function public.upsert_music_track(p_id text, p_username text, p_secret text, p_data jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare existing text;
begin
  select owner_secret into existing from public.music_tracks where id = p_id;
  if existing is null then
    insert into public.music_tracks(id, username, data, owner_secret, updated_at)
    values (p_id, p_username, coalesce(p_data, '{}'::jsonb), p_secret, now());
  elsif existing = p_secret then
    update public.music_tracks
       set data = coalesce(p_data, '{}'::jsonb), updated_at = now()
     where id = p_id;
  else
    raise exception 'music_track_secret_mismatch';
  end if;
end;
$$;

-- ── Slett ett spor ─────────────────────────────────────────────────────────────
create or replace function public.delete_music_track(p_id text, p_secret text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare existing text;
begin
  select owner_secret into existing from public.music_tracks where id = p_id;
  if existing is null then return; end if;
  if existing <> p_secret then
    raise exception 'music_track_secret_mismatch';
  end if;
  delete from public.music_tracks where id = p_id;
end;
$$;

grant execute on function public.list_music_tracks()                         to anon, authenticated;
grant execute on function public.upsert_music_track(text, text, text, jsonb) to anon, authenticated;
grant execute on function public.delete_music_track(text, text)              to anon, authenticated;
