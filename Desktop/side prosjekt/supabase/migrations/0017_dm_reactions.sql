-- 0017_dm_reactions.sql — emoji-reaksjonar (👍 ❤️ 😂 😮 😢 🔥) på DM-/lounge-
-- meldingar (js/friendchat.js, js/messenger.js), same Facebook-liknande mønster
-- som brukaren ba om. Autorisert via api/dm.js (action 'react'), same
-- sessionToken-sjekk som edit/delete — sjå 0016_direct_messages.sql for kvifor
-- dette IKKJE går direkte mot Supabase.
--
-- Kjør HEILE fila i Supabase → SQL Editor (same prosjekt som 0002/0005/0006/0008/0015/0016).

alter table public.direct_messages
  add column if not exists reactions jsonb not null default '{}'::jsonb;

comment on column public.direct_messages.reactions is
  'Map emoji -> array av brukarnamn som har reagert, t.d. {"👍":["alice","bob"],"❤️":["carl"]}. Skriven/lest kun via api/dm.js action=react/list.';
