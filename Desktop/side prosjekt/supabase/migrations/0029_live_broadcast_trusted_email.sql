-- 0029_live_broadcast_trusted_email.sql — klarerte gjeste-DJ-e-postar hoppar
-- over eigarens godkjenning i public.live_broadcasts (0025_live_broadcasts.sql).
--
-- Kvifor server-sida, ikkje berre js/config.js CONFIG.TRUSTED_DJ_EMAILS: denne
-- appen har INGEN ekte Supabase Auth-sesjon (sjå 0025 sin kommentar øverst) —
-- klienten kan i praksis sende inn KVA SOM HELST p_email-verdi. Om «klarert →
-- automatisk godkjent» berre var ei klientside-sjekk, kunne kven som helst
-- forbigå godkjenninga ved å skrive inn ein klarert e-post i skjemaet. Ved å
-- gjere sjekken HER (inne i submit_broadcast_request, security definer) er det
-- i det minste den same tillitsgrensa som resten av tabellen alt kviler på
-- (klientpåstått identitet), ikkje ei ny, svakare grense enn det som fanst før.
--
-- MERK samme avgrensing gjeld likevel: p_email er framleis klient-oppgitt, ikkje
-- kryptografisk verifisert mot ein ekte innlogga e-post. Denne migrasjonen
-- HEVER ikkje tryggleiksnivået til appen — han berre unngår å INNFØRE eit nytt,
-- ENDÅ svakare hol enn det som alt eksisterer (t.d. cancel_my_broadcast_request
-- sin p_username-tillit). Bruk kun for e-postar du reelt stoler på uansett kven
-- som skriv dei inn.
--
-- Legg til/fjern e-postar i BÅDE trusted_emails-arrayet under OG
-- js/config.js CONFIG.TRUSTED_DJ_EMAILS (klient-lista er berre til UI-merke +
-- krav om tidspunkt før innsending — ekte handheving er HER).
--
-- Kjør i Supabase → SQL Editor (same prosjekt som 0022/0025, qefdyxpyjwpohsmmmksf).
-- Føresetnad: 0025_live_broadcasts.sql er alt køyrd.

create or replace function public.submit_broadcast_request(
  p_id              text,
  p_username        text,
  p_email           text,
  p_display_name    text,
  p_message         text,
  p_requested_start timestamptz,
  p_requested_hours int default 1
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  -- ── Legg klarerte e-postar til HER (små bokstavar) ─────────────────────────
  trusted_emails text[] := array[]::text[];
  is_trusted boolean;
  init_status text := 'pending';
begin
  is_trusted := lower(trim(coalesce(p_email, ''))) = any (trusted_emails);

  if is_trusted then
    if p_requested_start is null then
      raise exception 'schedule_required_for_trusted_dj';
    end if;
    init_status := 'approved';
  end if;

  insert into public.live_broadcasts (
    id, requester_username, requester_email, display_name, message,
    requested_start, requested_hours, room, status,
    reviewed_by, reviewed_at, created_at, updated_at
  ) values (
    p_id, p_username, p_email, coalesce(p_display_name, p_username), coalesce(p_message, ''),
    p_requested_start, greatest(1, coalesce(p_requested_hours, 1)), 'guest-' || p_id, init_status,
    case when is_trusted then 'auto (trusted email)' else null end,
    case when is_trusted then now() else null end,
    now(), now()
  );
end;
$$;

grant execute on function public.submit_broadcast_request(text, text, text, text, text, timestamptz, int) to anon, authenticated;
