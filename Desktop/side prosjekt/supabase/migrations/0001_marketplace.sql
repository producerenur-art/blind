-- SoundCore — Markedsplass (Bandcamp-stil) · Supabase Postgres-skjema
-- Fase 2/3-fundament. Kjør i Supabase SQL Editor (eller `supabase db push`).
--
-- Tilgang skjer KUN fra Vercel serverless-funksjoner med SUPABASE_SERVICE_ROLE_KEY
-- (service-role omgår RLS). RLS er derfor på med ingen offentlige policies = lukket
-- som standard. Aldri eksponer service-role-nøkkelen i frontend.

-- ── Selgere ───────────────────────────────────────────────────────────────
-- Én rad per bruker som har koblet en Stripe Connect-konto.
create table if not exists public.sellers (
  username             text primary key,
  stripe_account_id    text unique not null,
  onboarding_complete  boolean not null default false,
  charges_enabled      boolean not null default false,
  payouts_enabled      boolean not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- ── Produkter (sanger til salgs / gratis nedlasting) ───────────────────────
-- Lyd-filen ligger i Storage-bucket 'songs' (privat); audio_path er stien dit.
-- Merk: seller_username er IKKE en hard FK til sellers — gratis-sanger kan legges
-- ut uten Stripe-konto (ingen sellers-rad). Betalte salg krever sellers-rad m/Connect.
create table if not exists public.products (
  id               uuid primary key default gen_random_uuid(),
  seller_username  text not null,
  title            text not null,
  artist           text,
  -- Kreditering
  label            text,
  producer         text,
  mixing           text,
  mastering        text,
  -- Faste kjøps-/strømmelenker (Bandcamp, Beatport, Spotify, Apple Music, SoundCloud)
  buy_links        jsonb not null default '{}'::jsonb,
  -- Pris: name-your-price i øre (NOK*100). is_free = gratis nedlasting.
  price_ore        integer not null default 0 check (price_ore >= 0),
  is_free          boolean not null default false,
  duration_sec     integer,
  audio_path       text not null,
  cover_path       text,
  is_published     boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists idx_products_seller on public.products(seller_username);
create index if not exists idx_products_published on public.products(is_published) where is_published;

-- ── Kjøp / rettigheter ─────────────────────────────────────────────────────
-- Én rad per kjøp. status='paid' gir nedlastingsrettighet til buyer_username.
-- Gratis nedlasting kan også registreres her med amount_ore=0, status='paid'.
create table if not exists public.purchases (
  id                     uuid primary key default gen_random_uuid(),
  product_id             uuid not null references public.products(id) on delete cascade,
  buyer_username         text not null,
  stripe_session_id      text unique,
  stripe_payment_intent  text,
  amount_ore             integer not null default 0,
  platform_fee_ore       integer not null default 0,
  status                 text not null default 'pending'
                           check (status in ('pending','paid','refunded','failed')),
  created_at             timestamptz not null default now()
);
create index if not exists idx_purchases_buyer   on public.purchases(buyer_username);
create index if not exists idx_purchases_product on public.purchases(product_id);

-- ── RLS: lukket som standard (service-role omgår dette) ────────────────────
alter table public.sellers   enable row level security;
alter table public.products  enable row level security;
alter table public.purchases enable row level security;

-- ── updated_at-trigger ─────────────────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists trg_sellers_touch  on public.sellers;
drop trigger if exists trg_products_touch on public.products;
create trigger trg_sellers_touch  before update on public.sellers
  for each row execute function public.touch_updated_at();
create trigger trg_products_touch before update on public.products
  for each row execute function public.touch_updated_at();

-- ── Storage-bucket for lyd-filene (privat) ─────────────────────────────────
-- Nedlasting skjer via tidsbegrensede signerte URL-er fra api/download-song.js,
-- gated på en betalt rad i purchases (eller is_free=true).
insert into storage.buckets (id, name, public)
values ('songs', 'songs', false)
on conflict (id) do nothing;
