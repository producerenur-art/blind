-- 0012_magazine_cache.sql — durabel lagring av de AI-funne «Fersk fra nettet»-sakene
--
-- Bakgrunn: /api/magazine bruker Claude + web-søk, som tar 20–60 sekunder. Vi cachet
-- svaret på Vercels edge-cache, men den er ikke garantert persistent — når en oppføring
-- forsvinner (typisk rett etter en deploy) må neste besøkende vente på hele AI-søket.
-- Denne tabellen er den varige kopien: /api/magazine svarer FRA tabellen (millisekunder),
-- og Vercel Cron (?warm=1, se vercel.json) er den eneste som betaler for AI-søket.
--
-- Sikkerhetsmodell: tabellen er ren serverside-cache. Ingen PII, ingen brukerdata.
-- RLS er slått på UTEN policyer, så verken anon- eller publishable-nøkkelen kommer til;
-- kun service-role-nøkkelen i /api/magazine (SUPABASE_SERVICE_ROLE_KEY) leser og skriver.
-- Innholdet er offentlig uansett (det vises på siden), men vi holder skrivetilgang låst.

create table if not exists public.magazine_cache (
  genre       text primary key,
  articles    jsonb       not null default '[]'::jsonb,
  updated_at  timestamptz not null default now()
);

alter table public.magazine_cache enable row level security;

-- Ingen policyer = ingen tilgang for anon/authenticated. Service role går forbi RLS.
