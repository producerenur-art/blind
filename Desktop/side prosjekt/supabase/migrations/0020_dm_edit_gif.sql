-- 0020_dm_edit_gif.sql — legg til rediger/slett/gif-støtte på direct_messages
--
-- Brukaren testa venne-DM (allereie fikset i 0016) og bad om emoji, rediger
-- tekst, slett tekst og GIF — same som allereie finst på Community-veggen
-- (edit_post/delete_post_owned frå tidlegare) — no også i private meldingar.
-- `kind` skil ei vanleg tekstmelding frå ei GIF (då inneheld `text` GIF-URL-en).
--
-- Kjør HEILE fila i Supabase → SQL Editor (same prosjekt, etter 0016).

alter table public.direct_messages add column if not exists edited boolean not null default false;
alter table public.direct_messages add column if not exists kind   text    not null default 'text';
