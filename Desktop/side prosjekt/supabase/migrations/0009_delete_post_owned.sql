-- 0009_delete_post_owned.sql — påliteleg sletting av eigne Community-innlegg
--
-- Problem: delete_post (0005) krev PER-EINING-hemmelegheita som vart sett då
-- innlegget vart laga. Den hemmelegheita ligg berre i localStorage på DEN eininga.
-- Slettar forfattaren frå ei ANNA nettlesar/eining — eller har localStorage vorte
-- tømt — så matchar ikkje hemmelegheita, delete_post kastar `post_secret_mismatch`,
-- og RADA BLIR VERANDE i sky. Difor såg alle ANDRE brukarar innlegget framleis, sjølv
-- etter at forfattaren «sletta» det. (Bekrefta: 8 «sletta» rader låg att i tabellen.)
--
-- Fix: forfattaren skal alltid kunna slette sitt EIGE innlegg — frå kva eining som
-- helst. Klienten gatar alt sletting til forfattaren (p.author === me.username), og
-- appens innlogging er uansett klientside (same tryggleiksnivå som resten av 0002/0005).
-- delete_post_owned slettar på id + forfattarnamn, utan hemmelegheit.
--
-- Kjør HEILE fila i Supabase → SQL Editor (same prosjekt som 0005).

create or replace function public.delete_post_owned(p_id text, p_author text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.community_posts where id = p_id and author = p_author;
end;
$$;

grant execute on function public.delete_post_owned(text, text) to anon, authenticated;
