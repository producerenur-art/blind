-- 0014_activation_expiry.sql — aktiveringslenker utløper faktisk, slik e-posten påstår.
--
-- Bakgrunn: api/send-email.js sier aktiveringslenken er "valid for 24 hours", men
-- api/auth.js sjekket aldri noen utløpstid — aktiveringstokens var evigvarende. Samme
-- kolonnetype/mønster som reset_expiry (0003_accounts.sql): millisekunder siden epoch,
-- sammenlignet med Date.now() i api/auth.js — ikke timestamptz.
--
-- Bakoverkompatibelt med vilje: eksisterende uaktiverte kontoer (registrert før denne
-- migrasjonen) får NULL her, og api/auth.js sin activate()-sjekk behandler NULL som
-- "ingen utløpstid" (ikke "utløpt") — så ingen mister en allerede utsendt aktiveringslenke
-- pga. en skjemaendring. Nye registreringer og alle resend()-kall setter en fersk frist.

alter table public.accounts add column if not exists activation_expiry bigint;
