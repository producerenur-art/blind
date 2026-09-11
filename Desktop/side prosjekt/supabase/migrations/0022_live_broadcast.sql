-- 0022_live_broadcast.sql — global "eier går live"-status (auto-switchover)
--
-- Formål: én global rad som seier om eigaren av SiriusFM/SoundCore er
-- personleg live akkurat no (mikrofon/musikk over WebRTC, js/livebroadcast.js),
-- kva rom-namn (signaling-kanal) og kva presentatørnamn dei skreiv inn. Kvar
-- besøkande (innlogga ELLER anonym gjest), uansett kva 24/7-radiostasjon dei
-- høyrer på, skal automatisk koblast til denne sendinga når is_live blir true,
-- og automatisk tilbake til stasjonen sin når is_live blir false igjen. Sjå
-- js/liveGlobal.js (les/abonnerer) og js/livemix.js (eigaren sitt "Gå live"-
-- panel, som skriv hit).
--
-- Sikkerheitsmodell — same som resten av appen (klientside-innlogging, ingen
-- ekte Supabase Auth-sesjon, kun den offentlege anon-nøkkelen brukt frå
-- nettlesaren):
--   * Lesing (is_live/presenter_name/room/started_at) er OFFENTLEG — dette er
--     ikkje sensitiv informasjon, og alle besøkande (også anonyme) MÅ kunne
--     lese det for at auto-switchover skal fungere for alle. Ei RLS-policy
--     tillèt SELECT for anon+authenticated direkte på tabellen — dette er òg
--     det som gjer at Supabase Realtime (postgres_changes) kan pushe endringar
--     med det same, same idé som andre delte-tilstand-tabellar i prosjektet,
--     men her ope for lesing sidan innhaldet er ufarleg (jf. presence_count()/
--     get_profile() som også er opne for anon).
--   * Skriving er LÅST bak ein delt eigar-hemmelegheit. Hemmeleg-heita ligg i
--     EI EIGEN tabell (live_broadcast_secret) UTAN nokon RLS-policy og UTAN
--     grants til anon/authenticated i det heile — ho er difor berre nåbar frå
--     INNI dei SECURITY DEFINER-funksjonane under, aldri via ein direkte SELECT
--     frå klienten. Dette hindrar at hemmelegheita kan lekke ut via den opne
--     SELECT-policyen på status-tabellen (som ikkje har nokon hemmelegheits-
--     kolonne i det heile).
--
--     VIKTIG — IKKJE «trust-on-first-use»: hemmelegheita blir sett FAST av
--     denne migrasjonen sjølv (INSERT under), ikkje adoptert frå det FØRSTE
--     kallet til set_live_broadcast_status() slik ein tidlegare versjon gjorde.
--     Ein tidlegare TOFU-variant (kopiert frå upsert_profile() sitt mønster i
--     0002_profiles.sql, som er trygt DER fordi kvar brukar berre kan kapre
--     SIN EIGEN rad) hadde eit reelt hól HER: sidan denne tabellen berre har
--     ÉI global rad som styrer lyden til ALLE besøkande, kunne kven som helst
--     (anon-nøkkelen er offentleg) ha kalla funksjonen FØR eigaren nokon gong
--     gjekk live sjølv, og dermed låst eigaren ute permanent — og eigaren sjølv
--     kunne låse seg ute ved å byte nettlesar/eining (hemmelegheita låg berre i
--     localStorage). No er hemmelegheita ein FAST verdi definert her OG i
--     js/config.js sin CONFIG.LIVE_BROADCAST_SECRET (må vere nøyaktig lik).
--
-- Kjør heile fila i Supabase → SQL Editor (prosjektet qefdyxpyjwpohsmmmksf).

-- ── Offentleg status (éin rad, id fast = 1) ──────────────────────────────────
create table if not exists public.live_broadcast_status (
  id             int primary key default 1,
  is_live        boolean     not null default false,
  presenter_name text        not null default '',
  room           text        not null default '',
  started_at     timestamptz,
  updated_at     timestamptz not null default now(),
  constraint live_broadcast_status_singleton check (id = 1)
);
insert into public.live_broadcast_status (id) values (1) on conflict (id) do nothing;

alter table public.live_broadcast_status enable row level security;

drop policy if exists live_broadcast_status_select on public.live_broadcast_status;
create policy live_broadcast_status_select on public.live_broadcast_status
  for select using (true);

-- Berre SELECT — ingen insert/update/delete-grants. All skriving går via
-- set_live_broadcast_status() under (SECURITY DEFINER, kjører som eigar).
grant select on public.live_broadcast_status to anon, authenticated;

-- ── Hemmeleg eigar-nøkkel (aldri lesbar frå klienten) ────────────────────────
create table if not exists public.live_broadcast_secret (
  id     int primary key default 1,
  secret text not null
);
alter table public.live_broadcast_secret enable row level security;
-- Med vilje INGEN policy og INGEN grants her → totalt uleseleg/uskriveleg for
-- anon/authenticated, også med RLS aktivert. Kun SECURITY DEFINER-funksjonar
-- (som køyrer med tabelleigaren sine rettar) kan nå denne tabellen.
revoke all on public.live_broadcast_secret from anon, authenticated;

-- FAST verdi — må vere NØYAKTIG lik CONFIG.LIVE_BROADCAST_SECRET i js/config.js.
-- «on conflict do nothing» gjer det trygt å køyre fila fleire gongar UTAN å
-- overskrive ein verdi du evt. har endra manuelt i databasen seinare.
insert into public.live_broadcast_secret (id, secret) values
  (1, '4e41fb896708c20de1bd6be1cef21b52ca0f43ea534d0d5e')
on conflict (id) do nothing;

-- ── Les status (RPC-form for symmetri med resten av appen / enkel polling) ──
create or replace function public.get_live_broadcast_status()
returns table(is_live boolean, presenter_name text, room text, started_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select is_live, presenter_name, room, started_at
    from public.live_broadcast_status
   where id = 1;
$$;

-- ── Sett status (eigar-gata) ─────────────────────────────────────────────────
create or replace function public.set_live_broadcast_status(
  p_secret         text,
  p_is_live        boolean,
  p_presenter_name text default '',
  p_room           text default ''
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare existing text;
begin
  if p_secret is null or length(p_secret) < 8 then
    raise exception 'live_broadcast_secret_invalid';
  end if;

  -- Nøkkelen MÅ alt finnes (sett av INSERT-en over, ved migrasjon) — vi
  -- adopterer ALDRI ein hemmelegheit frå eit innkommande kall lenger (det var
  -- TOFU-hòlet). Manglar raden i det heile, er migrasjonen ikkje køyrd riktig.
  select secret into existing from public.live_broadcast_secret where id = 1;
  if existing is null then
    raise exception 'live_broadcast_secret_not_configured';
  elsif existing <> p_secret then
    raise exception 'live_broadcast_secret_mismatch';
  end if;

  update public.live_broadcast_status
     set is_live        = p_is_live,
         presenter_name = coalesce(p_presenter_name, ''),
         room           = coalesce(p_room, ''),
         started_at     = case when p_is_live then now() else started_at end,
         updated_at     = now()
   where id = 1;
end;
$$;

grant execute on function public.get_live_broadcast_status() to anon, authenticated;
grant execute on function public.set_live_broadcast_status(text, boolean, text, text) to anon, authenticated;

-- ── Sanntid-push (valfritt, degraderer stille) ───────────────────────────────
-- Legg status-tabellen til i Supabase sin standard realtime-publikasjon, slik
-- at js/liveGlobal.js kan abonnere med postgres_changes for umiddelbar
-- oppdatering (i tillegg til den polling-baserte failsafen den uansett har,
-- same mønster som js/livePresence.js/js/realtime.js elles i prosjektet).
-- Om publikasjonen ikkje finst, eller tabellen alt er lagt til, gjer denne
-- blokka ingenting i staden for å feile heile skriptet.
do $$
begin
  alter publication supabase_realtime add table public.live_broadcast_status;
exception when others then
  null;
end $$;
