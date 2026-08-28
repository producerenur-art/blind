-- 0007_open_text_edit.sql — åpne tekst-redigering for ALLE innloggede
--
-- Ønske frå eigaren: på Community-veggen skal KVAR innlogga brukar kunne redigere
-- TEKSTEN i innlegg og kommentarar (samarbeidsvegg) — men forfattar, media og
-- SLETTING skal vera uendra (kun forfattar/vegg-eigar slettar). Forhåndsvisninga
-- (previewUrl) blir ståande uansett kven som endrar teksten.
--
-- upsert_post/upsert_comment (0005/0006) krev forfattaren si hemmelegheit og kan
-- difor ikkje brukast av andre. Desse to RPC-ane endrar BERRE tekst-/forhånds-
-- visnings-felta og let resten av data-objektet (author, kind, media, sync_secret)
-- stå urørt. Ingen secret-sjekk → alle innlogga kan redigere tekst, men dei kan
-- ikkje byte forfattar, media eller slette (eigne RPC-ar med secret held fram).
--
-- Kjør HEILE fila i Supabase → SQL Editor (same prosjekt som 0005/0006).

-- ── Rediger tekst + forhåndsvisning på eit innlegg (open for alle) ────────────
create or replace function public.edit_post_text(
  p_id text, p_text text, p_preview_url text, p_preview_off boolean,
  p_editor text, p_edited_ts bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.community_posts
     set data = data
                || jsonb_build_object('text',       coalesce(p_text, ''))
                || jsonb_build_object('previewUrl', coalesce(p_preview_url, ''))
                || jsonb_build_object('previewOff', coalesce(p_preview_off, false))
                || jsonb_build_object('edited',     true)
                || jsonb_build_object('editedTs',   coalesce(p_edited_ts, 0))
                || jsonb_build_object('editedBy',   coalesce(p_editor, '')),
         ts   = greatest(ts, coalesce(p_edited_ts, 0))
   where id = p_id;
end;
$$;

-- ── Rediger tekst + forhåndsvisning på ein kommentar (open for alle) ──────────
create or replace function public.edit_comment_text(
  p_id text, p_text text, p_preview_url text, p_preview_off boolean,
  p_editor text, p_edited_ts bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.community_comments
     set data = data
                || jsonb_build_object('text',       coalesce(p_text, ''))
                || jsonb_build_object('previewUrl', coalesce(p_preview_url, ''))
                || jsonb_build_object('previewOff', coalesce(p_preview_off, false))
                || jsonb_build_object('edited',     true)
                || jsonb_build_object('editedBy',   coalesce(p_editor, '')),
         ts   = greatest(ts, coalesce(p_edited_ts, 0))
   where id = p_id;
end;
$$;

grant execute on function public.edit_post_text(text, text, text, boolean, text, bigint)    to anon, authenticated;
grant execute on function public.edit_comment_text(text, text, text, boolean, text, bigint) to anon, authenticated;
