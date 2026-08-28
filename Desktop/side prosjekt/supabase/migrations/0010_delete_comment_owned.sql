-- 0010_delete_comment_owned.sql — påliteleg sletting av eigne kommentarar
--
-- Problem: delete_comment (0006) krev PER-KOMMENTAR-hemmelegheita som vart sett då
-- kommentaren vart skriven. Den hemmelegheita ligg berre i localStorage på DEN eininga.
-- Slettar forfattaren frå ei ANNA nettlesar/eining — eller har localStorage vorte tømt —
-- så matchar ikkje hemmelegheita, delete_comment kastar `comment_secret_mismatch`, og
-- RADA BLIR VERANDE i sky → sky-polling legg kommentaren inn att, og alle andre ser han
-- framleis. Same feilen som 0009 fiksa for innlegg (delete_post_owned).
--
-- Fix: forfattaren skal alltid kunna slette sin EIGE kommentar — frå kva eining som helst.
-- Vegg-/innlegg-eigaren kan òg moderere ved å oppgje forfattaren sitt namn (klienten gatar
-- alt sletting til forfattaren ELLER vegg-eigaren). Appens innlogging er uansett klientside
-- (same tryggleiksnivå som resten av 0002/0005/0006/0009). delete_comment_owned slettar på
-- id + forfattarnamn, utan hemmelegheit.
--
-- Kjør HEILE fila i Supabase → SQL Editor (same prosjekt som 0006).

create or replace function public.delete_comment_owned(p_id text, p_author text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.community_comments where id = p_id and author = p_author;
end;
$$;

grant execute on function public.delete_comment_owned(text, text) to anon, authenticated;
